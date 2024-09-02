type ctor<ET extends HTMLElement> = { new (...args: unknown[]): ET };

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
class _CustomElement<T extends CustomElement = CustomElement> {
	// private _base
	tag_name: string;
	extended?: keyof HTMLElementTagNameMap;
	_class: ctor<T>;

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
				if (this._ref) CustomElementManager.register_instance(this._ref, this);
				this.on_connect?.();
			}
			disconnectedCallback() {
				if (this._ref) CustomElementManager.remove_instance(this._ref);
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
}

class _CustomElementManager {
	// registered elements
	public elements: Map<string, _CustomElement> = new Map();
	public observer: MutationObserver | undefined = undefined;
	private watcher_targets: Map<string, keyof HTMLElementTagNameMap> = new Map();

	private instantiated: Map<string, CustomElement> = new Map();

	public define_custom_element(
		tag_name: string,
		base_class: ctor<HTMLElement>,
		extended?: keyof HTMLElementTagNameMap
	) {
		if (this.elements.has(tag_name))
			throw new Error(`custom element already registered: '${tag_name}'`);
		for (const [name, registered] of this.elements.entries())
			if (base_class === registered._class)
				throw new Error(`custom element '${tag_name}' already registered as '${name}'`);

		this.elements.set(tag_name, new _CustomElement(tag_name, base_class, extended));
		if (extended !== undefined) {
			customElements.define(tag_name, base_class, { extends: extended });
			this.watcher_targets.set(tag_name, extended);
			this.check_watch_targets(document.querySelectorAll(tag_name));
		} else customElements.define(tag_name, base_class);

		console.log(`Registered custom element: ${tag_name}`);
	}

	public check_watch_targets(targets: NodeList) {
		targets.forEach((node) => {
			if (!(node instanceof HTMLElement)) return;
			const is_tag = node.tagName.toLowerCase();
			const real_tag = this.watcher_targets.get(is_tag);
			if (real_tag !== undefined) {
				const element: HTMLElement = document.createElement(real_tag, { is: is_tag });
				element.innerHTML = node.innerHTML;
				[...node.attributes].forEach((attr) => element.setAttribute(attr.name, attr.value));

				node.replaceWith(element);
			}
		});
	}
	public start_watcher(target?: Element) {
		this.observer = new MutationObserver((mutationsList) => {
			for (const mutation of mutationsList) {
				if (mutation.type === 'childList') this.check_watch_targets(mutation.addedNodes);
			}
		});

		this.observer.observe(target ?? document.body, { childList: true, subtree: true });
	}

	public register_instance<T extends CustomElement>(ref: string, target: T) {
		if (this.instantiated.has(ref))
			throw new Error(`Instantiated component already exists: '${ref}'`);
		this.instantiated.set(ref, target);
	}
	public get_instance<T extends CustomElement>(ref: string): T {
		const res = this.instantiated.get(ref);
		if (res === undefined) throw new Error(`Could not find referenced component: '${ref}'`);
		return res as T;
	}
	public remove_instance(ref: string) {
		if (!this.instantiated.has(ref)) throw new Error(`Instantiated not registered: '${ref}'`);
		this.instantiated.delete(ref);
	}
}
export const CustomElementManager = new _CustomElementManager();
export const get_instance = CustomElementManager.get_instance;
