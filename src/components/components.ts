const TOKEN_INVALID = 'INVALID';
type ctor<ET extends HTMLElement> = { new (...args: any[]): ET };

export class CustomElement extends HTMLElement {
	static observedAttributes?: string[];
	constructor() {
		super();
	}
	on_connect?(): void;
	on_disconnect?(): void;
	on_adopt?(): void;
	on_attribute_change?(name: string, prev: string, value: string): void;
}
export class DumComponent<T extends CustomElement = CustomElement> {
	// private _base
	public tag_name: string;
	public extended?: keyof HTMLElementTagNameMap;
	private _class: ctor<T>;

	constructor(tag_name: string, base_class: ctor<T>);
	constructor(tag_name: string, base_class: ctor<T>, extended: keyof HTMLElementTagNameMap);
	constructor(tag_name: string, base_class: ctor<T>, extended?: keyof HTMLElementTagNameMap) {
		this.tag_name = tag_name;
		if (extended) this.extended = extended;

		this._class = class extends (base_class as ctor<CustomElement>) {
			private _ref: string | undefined;
			constructor() {
				super();
			}
			connectedCallback() {
				if (this._ref === undefined) {
					this._ref = this.getAttribute('ref') ?? undefined;
					this.removeAttribute('ref');
				}
				if (this._ref) ComponentLibrary.register_component_instance(this._ref, this);
				this.on_connect?.();
			}
			disconnectedCallback() {
				if (this._ref) ComponentLibrary.remove_component_instance(this._ref);
				this.on_disconnect?.();
			}
			adoptedCallback() {
				this.on_adopt?.();
			}
			attributeChangedCallback(name: string, prev: string, value: string) {
				this.on_attribute_change?.(name, prev, value);
			}
		} as unknown as ctor<T>;
	}

	public get base_class(): ctor<T> {
		return this._class;
	}
}

class Library {
	// registered components
	public components: Map<string, DumComponent> = new Map();
	public observer: MutationObserver | undefined = undefined;
	private watcher_targets: Map<string, keyof HTMLElementTagNameMap> = new Map();

	private instantiated: Map<string, CustomElement> = new Map();

	public register_custom_element<T extends HTMLElement>(component: DumComponent<T>) {
		const tag_name = component.tag_name;
		const base_class = component.base_class;

		if (this.components.has(tag_name))
			throw new Error(`Component already registered: '${tag_name}'`);
		for (const [name, registered] of this.components.entries())
			if (registered.base_class === base_class)
				throw new Error(`Component '${tag_name}' already registered as '${name}'`);

		this.components.set(tag_name, component);
		if (component.extended !== undefined) {
			customElements.define(tag_name, base_class, { extends: component.extended });
			this.watcher_targets.set(tag_name, component.extended);
			this.check_watch_targets(document.querySelectorAll(tag_name));
		} else customElements.define(tag_name, base_class);

		console.log(`Registered Component: ${tag_name}`);
	}

	public check_watch_targets(targets: NodeList) {
		targets.forEach((node) => {
			if (!(node instanceof HTMLElement)) return;
			const component_tag = node.tagName.toLowerCase();
			const real_tag = this.watcher_targets.get(component_tag);
			if (real_tag !== undefined) {
				const element: HTMLElement = document.createElement(real_tag, { is: component_tag });
				element.innerHTML = node.innerHTML;
				[...node.attributes].forEach((attr) => element.setAttribute(attr.name, attr.value));

				node.replaceWith(element);
			}
		});
	}

	public start_watcher(target?: Element) {
		this.observer = new MutationObserver((mutationsList) => {
			for (const mutation of mutationsList) {
				if (mutation.type === 'childList') {
					this.check_watch_targets(mutation.addedNodes);
				}
			}
		});

		// Start observing the document for new elements
		this.observer.observe(target ?? document.body, { childList: true, subtree: true });
	}

	public register_component_instance<T extends CustomElement>(ref: string, target: T) {
		if (this.instantiated.has(ref))
			throw new Error(`Instantiated component already exists: '${ref}'`);
		this.instantiated.set(ref, target);
	}
	public remove_component_instance(ref: string) {
		if (!this.instantiated.has(ref)) throw new Error(`Instantiated not registered: '${ref}'`);
		this.instantiated.delete(ref);
	}
	public get_component_instance<T extends CustomElement>(ref: string): T {
		const res = this.instantiated.get(ref);
		if (res === undefined) throw new Error(`Could not find referenced component: '${ref}'`);
		return res as T;
	}
}

export const ComponentLibrary = new Library();
export const get_component = ComponentLibrary.get_component_instance;
