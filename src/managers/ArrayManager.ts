import { type ElementCallbacks, type ElementOpts, get_element } from '../base';
import { type ArrangerTransitions, ElementArranger } from '../arrangers/ElementArranger';

// CONSTANTS
export const KeyAttribute = 'skr_key';

// TYPES
export type ArrayKeyFn<T> = (value: T) => string;
export type ArrayMapFn<T> = (key: string, value: T, element: Element) => void;

// INTERFACES
export interface ArrayManagerOpts<T> extends ElementOpts {
	/** Array where each element represents another element in the container */
	array: Array<T>;
	/** Element key function */
	key_fn: ArrayKeyFn<T>;
	/** Optional template, otherwise uses target's :first-child */
	template?: Element;
	/** Element initializer function */
	init_fn?: ArrayMapFn<T>;

	transitions?: ArrangerTransitions;

	// callbacks
	callbacks?: ElementCallbacks<T>;
}
export class ArrayManager<T> {
	public array: Array<T>;

	protected key_fn: ArrayKeyFn<T>;
	protected init_fn?: ArrayMapFn<T>;
	protected transitions?: ArrangerTransitions;

	/** Container element which is the parent of array elements */
	public container: Element;
	/** Template to use as base for each array element */
	public template: Element;

	public elements: Map<string, Element>;
	public arranger: ElementArranger;

	// callbacks
	protected callbacks?: ElementCallbacks<T>;
	constructor(opts: ArrayManagerOpts<T>) {
		this.array = opts.array;
		this.key_fn = opts.key_fn;

		this.init_fn = opts.init_fn;
		this.transitions = opts.transitions;

		this.callbacks = opts.callbacks;

		this.container = get_element(opts.target);
		this.template =
			opts.template ||
			(() => {
				const el = this.container.querySelector(`:first-child`);
				if (!el) throw new RangeError(`ArrayManager container had no children`);
				this.container.replaceChildren();
				return el;
			})();

		this.elements = new Map();
		this.arranger = new ElementArranger({
			target: this.container,
			initial: opts.array.map((v) => this.new_element(v)),
			transitions: this.transitions,
		});
	}

	protected new_element(item: T, key?: string): Element {
		key = key || this.key_fn(item);

		// copy template
		const element = this.template.cloneNode(true) as Element;
		// element.setAttribute(KeyAttribute, key);
		// init element
		this.init_fn?.(key, item, element);

		// finalize
		this.elements.set(key, element);
		return element;
	}

	public update() {
		this.callbacks?.before_update?.();

		const target_elements = [];
		const doomed_keys = new Set(this.elements.keys());
		for (const entry of this.array) {
			const key = this.key_fn(entry);
			const el = this.elements.get(key) || this.new_element(entry, key);
			doomed_keys.delete(key);

			this.callbacks?.update_item?.(key, entry, el);
			target_elements.push(el);
		}
		doomed_keys.forEach((k) => this.elements.delete(k));
		this.arranger.update(target_elements);

		this.callbacks?.after_update?.();
	}
}
