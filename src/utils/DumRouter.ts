import { get_element } from './Core';
import { on_next_frame } from './AsyncHelpers';
import { CustomElementManager } from './CustomElement';
import type { HookResult, HookResultAsync } from '../common';

type RootElement = Element | Array<Element> | string | undefined;

type RootFn = (container: Element) => RootElement;
type RootFnAsync = (container: Element) => Promise<RootElement>;

type DeactivateFn = (container: Element) => void;
type ActivateFn = (container: Element) => void | DeactivateFn;

// routes
export interface RouteBase {
	name: string;
	head_items?: Array<Element | (() => Element | undefined)>;
	root: RootElement | RootFn | RootFnAsync;

	// callbacks
	activate?: ActivateFn;
	deactivate?: DeactivateFn;
}
export interface Route extends RouteBase {
	path: string;
}

// Router
interface DumRouterHooks {
	// return false to prevent
	add_route?: (route: Route) => HookResult<boolean>;
	// return route or string to change route. return false to prevent.
	navigate_to?: (route: Route) => HookResultAsync<boolean | string | Route>;
	// return route or string to change route. return false to prevent.
	handle_location?: (route: Route) => HookResultAsync<boolean | string | Route>;

	// return route or string to change route. return false to prevent.
	before_render?: (route: Route) => HookResultAsync<boolean | string | Route>;
	after_render?: (route: Route) => HookResultAsync;
}

interface DumRouterOpts {
	target: Element | string;
	routes?: Array<Route> | { [path: string]: RouteBase };
	hooks?: DumRouterHooks;
}
export class DumRouter {
	public container: Element;
	public routes: Map<string, Route>;
	public active_route: Route | undefined = undefined;

	protected hooks: DumRouterHooks;
	constructor(opts: DumRouterOpts) {
		this.container = get_element(opts.target);

		this.routes = new Map<string, Route>();
		if (opts.routes !== undefined) {
			if (opts.routes instanceof Array) {
				for (const route of opts.routes) this.routes.set(route.path, route);
			} else {
				for (const key in opts.routes) this.routes.set(key, { path: key, ...opts.routes[key] });
			}
		}

		this.hooks = opts.hooks ?? {};

		window.addEventListener('popstate', () => {
			this.handle_location();
		});

		document.addEventListener('DOMContentLoaded', () => {
			if (!this.routes.has(this.location)) this.set_location('/', true);

			this.handle_location();
		});
	}

	// OVERRIDERS
	protected get location(): string {
		return window.location.pathname;
	}
	protected set_location(path: string, replace: boolean = false): void {
		if (replace) window.history.replaceState(null, '', path);
		else window.history.pushState(null, '', path);
	}

	// methods
	// protected
	protected async handle_location(): Promise<void>;
	protected async handle_location(route: Route): Promise<void>;
	protected async handle_location(route?: Route): Promise<void> {
		if (route === undefined) route = this.routes.get(this.location) as Route;
		else this.set_location(route.path);

		if (this.hooks.handle_location) {
			const result = await this.hooks.handle_location(route);
			if (result === false) return;
			switch (typeof result) {
				case 'string':
					route = this.routes.get(result) as Route;
					break;
				case 'object':
					route = result;
					break;
			}
		}

		if (route !== undefined) this.render_route(route);
	}
	protected apply_header(route: Route) {
		// clean out other head additions
		// only nukes things with 'dum_source' attrib
		document.head.querySelectorAll('[dum_source]').forEach((el) => {
			if (el.getAttribute('dum_source') !== route.path) el.remove();
		});

		if (route.head_items === undefined) return;
		for (const item of route.head_items) {
			const el = typeof item === 'function' ? item() : item;
			if (el === undefined) continue;
			el.setAttribute('dum_source', route.path);
			document.head.appendChild(el);
		}
	}
	protected async render_route(route: Route) {
		// before render hook
		if (this.hooks.before_render) {
			const result = await this.hooks.before_render(route);
			if (result === false) return;
			switch (typeof result) {
				case 'string':
					route = this.routes.get(result) as Route;
					break;
				case 'object':
					route = result;
					break;
			}
		}

		// if there was a previous route, get rid of it (but don't clear the children, for fun's sake)
		if (this.active_route) {
			if (this.active_route === route) return;
			this.active_route.deactivate?.(this.container);
		}
		this.active_route = route;

		// sort out root element stuff
		let res: RootElement;
		if (typeof route.root === 'function') res = await route.root(this.container);
		else res = route.root;

		// okay, start applying
		this.apply_header(route);

		// apply root
		if (res !== undefined) {
			if (res instanceof Element) this.container.replaceChildren(res);
			else if (res instanceof Array) this.container.replaceChildren(...res);
			else this.container.innerHTML = res;
		}

		// might remove, checks for custom compoents that aren't using 'is'
		CustomElementManager.check_watch_targets(this.container.querySelectorAll('*'));

		// activate when rendering, save callback if given
		on_next_frame(() => {
			route.deactivate = route.activate?.(this.container) ?? route.deactivate;
		});

		await this.hooks.after_render?.(route);
	}

	// public
	public add_route(path: string, { name, root }: RouteBase): void;
	public add_route(path: string, name: string, root: RootElement | RootFn): void;
	public add_route(path: string, target: string | RouteBase, root?: RootElement | RootFn): void {
		if (typeof target === 'string') target = { name: target, root: root ?? 'NO ROOT' };

		const route: Route = { path, ...target };
		if (this.hooks.add_route?.(route) === false) return;

		this.routes.set(route.path, route);
	}
	public async navigate_to(url: string): Promise<void>;
	public async navigate_to(route: Route): Promise<void>;
	public async navigate_to(route: string | Route): Promise<void> {
		if (typeof route === 'string') {
			route = this.routes.get(route) as Route;
		}

		if (this.hooks.navigate_to) {
			const result = await this.hooks.navigate_to(route);
			if (result === false) return;
			switch (typeof result) {
				case 'string':
					route = this.routes.get(result) as Route;
					break;
				case 'object':
					route = result;
					break;
			}
		}

		// TODO test reloading a page like this
		if (this.active_route === route) return;

		await this.handle_location(route);
	}
}
export class DumRouterNoOrigin extends DumRouter {
	protected get location(): string {
		return window.location.hash.replace(/^#/, '');
	}
	protected set_location(path: string, _replace?: boolean): void {
		window.location.hash = path;
	}
}
export const DumRouterAdaptive = window.origin === 'null' ? DumRouterNoOrigin : DumRouter;
