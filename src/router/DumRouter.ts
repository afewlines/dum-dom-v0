import { get_element } from '../base';
import { on_next_frame } from '../utils/AsyncHelpers';
import { ComponentLibrary } from '../components/components';

type RootElement = Element | Array<Element> | string | undefined;

type RootFn = (container: Element) => RootElement;

type DeactivateFn = () => void;
type ActivateFn = () => void | DeactivateFn;

export interface RouteBase {
	name: string;
	head_items?: Array<Element | (() => Element | undefined)>;
	root: RootElement | RootFn;

	// callbacks
	activate?: ActivateFn;
	deactivate?: DeactivateFn;
}
interface Route extends RouteBase {
	path: string;
}

interface DumRouterOpts {
	target: Element | string;
	routes?: Array<Route> | { [path: string]: RouteBase };
}
export class DumRouter {
	public container: Element;
	public routes: Map<string, Route>;

	protected active_route: Route | undefined;

	constructor(opts: DumRouterOpts) {
		this.container = get_element(opts.target);
		this.routes = new Map<string, Route>();
		this.active_route = undefined;

		if (opts.routes !== undefined) {
			if (opts.routes instanceof Array) {
				for (const route of opts.routes) this.routes.set(route.path, route);
			} else {
				for (const key in opts.routes) this.routes.set(key, { path: key, ...opts.routes[key] });
			}
		}

		window.addEventListener('popstate', (ev) => {
			this.handle_location();
		});

		document.addEventListener('DOMContentLoaded', () => {
			if (!this.routes.has(this.location)) this.set_location('/', true);

			this.handle_location();
		});
	}

	protected get location(): string {
		return window.location.pathname;
	}

	protected set_location(path: string, replace: boolean = false): void {
		if (replace) window.history.replaceState(null, '', path);
		else window.history.pushState(null, '', path);
	}

	public add_route(path: string, { name, root }: RouteBase): void;
	public add_route(path: string, name: string, root: RootElement | RootFn): void;
	public add_route(path: string, target: string | RouteBase, root?: RootElement | RootFn): void {
		if (typeof target === 'string') target = { name: target, root: root ?? 'NO ROOT' };
		this.routes.set(path, { path: path, ...target });
	}

	public navigate_to(url: string): void;
	public navigate_to(route: Route): void;
	public navigate_to(target: string | Route): void {
		if (typeof target === 'object') target = target.path;
		if (this.active_route && target === this.active_route.path) return;
		this.set_location(target);
		this.handle_location();
	}

	// meat and potatoes
	protected handle_location() {
		const route = this.routes.get(this.location);

		if (route !== undefined) this.render_route(route);
	}

	protected apply_header(route: Route) {
		// clean out other head additions
		// only nukes things with 'dum_source' attrib
		document.head.querySelectorAll('[dum_source]').forEach((el) => {
			if (el.getAttribute('dum_source') != route.path) el.remove();
		});

		if (route.head_items === undefined) return;
		for (const item of route.head_items) {
			const el = typeof item == 'function' ? item() : item;
			if (el === undefined) continue;
			el.setAttribute('dum_source', route.path);
			document.head.appendChild(el);
		}
	}

	protected render_route(route: Route) {
		if (this.active_route) {
			if (this.active_route === route) return;
			this.active_route.deactivate?.();
		}

		this.apply_header(route);

		const res = typeof route.root === 'function' ? route.root(this.container) : route.root;

		this.active_route = route;

		if (res !== undefined) {
			if (res instanceof Element) this.container.replaceChildren(res);
			else if (res instanceof Array) this.container.replaceChildren(...res);
			else this.container.innerHTML = res;
		}

		ComponentLibrary.check_watch_targets(this.container.querySelectorAll('*'));

		on_next_frame(() => {
			route.deactivate = route.activate?.() ?? route.deactivate;
		});
	}
}
export class DumRouterNoOrigin extends DumRouter {
	protected get location(): string {
		return window.location.hash.replace(/^#/, '');
	}
	protected set_location(path: string, replace?: boolean): void {
		window.location.hash = path;
	}
}
export const DumRouterAdaptive = window.origin === 'null' ? DumRouterNoOrigin : DumRouter;
