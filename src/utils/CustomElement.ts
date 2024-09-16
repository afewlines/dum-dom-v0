type ctor<ET extends HTMLElement> = { new (...args: unknown[]): ET };
interface AtributeMap {
	[key: string]: string;
}

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

	public instantiate(): T;
	public instantiate(ref: string): T;
	public instantiate(attributes: AtributeMap): T;
	public instantiate(data?: string | AtributeMap): T;
	public instantiate(target?: string | AtributeMap): T {
		let el: T;

		if (this.extended === undefined) el = document.createElement(this.tag_name) as T;
		else el = document.createElement(this.extended, { is: this.tag_name }) as T;

		if (target !== undefined)
			if (typeof target === 'string') el.setAttribute('ref', target);
			else for (const key in target) el.setAttribute(key, target[key]);

		return el;
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
			throw new Error(`Custom element already registered: '${tag_name}'`);
		for (const [name, registered] of this.elements.entries())
			if (base_class === registered._class)
				throw new Error(`Custom element '${tag_name}' already registered as '${name}'`);

		const _element = new _CustomElement(tag_name, base_class, extended);
		this.elements.set(tag_name, _element);
		if (extended !== undefined) {
			customElements.define(tag_name, _element._class, { extends: extended });
			this.watcher_targets.set(tag_name, extended);
			this.check_watch_targets(document.querySelectorAll(tag_name));
		} else customElements.define(tag_name, _element._class);

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
	public remove_instance(ref: string) {
		if (!this.instantiated.has(ref)) throw new Error(`Instantiated not registered: '${ref}'`);
		this.instantiated.delete(ref);
	}
	public create_instance<T extends CustomElement>(tag_name: string): T;
	public create_instance<T extends CustomElement>(tag_name: string, ref: string): T;
	public create_instance<T extends CustomElement>(tag_name: string, attributes: AtributeMap): T;
	public create_instance<T extends CustomElement>(
		tag_name: string,
		data?: string | AtributeMap
	): T {
		const _element = this.elements.get(tag_name) as _CustomElement<T> | undefined;
		if (_element === undefined)
			throw new Error(`Could not find custom element with tag name '${tag_name}'`);

		return _element.instantiate(data);
	}
	public get_instance<T extends CustomElement>(ref: string): T {
		const res = this.instantiated.get(ref);
		if (res === undefined) throw new Error(`Could not find referenced component: '${ref}'`);
		return res as T;
	}
}
export const CustomElementManager = new _CustomElementManager();
export const create_instance = CustomElementManager.create_instance;
export const get_instance = CustomElementManager.get_instance;
