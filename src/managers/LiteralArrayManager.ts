import { type ElementCallbacks, type ElementOpts, get_element } from '../base';
import { type ArrangerTransitions, ElementArranger } from '../arrangers/ElementArranger';
import { type ArrayKeyFn } from './ArrayManager';
export type LiteralArrayMapFn<T> = (key: string, value: T) => Element;

// INTERFACES
export interface LiteralArrayManagerOpts<T> extends ElementOpts {
	/** Array where each element represents another element in the container */
	array: Array<T>;
	/** Element key function */
	key_fn: ArrayKeyFn<T>;
	/** Element initializer function, should return Element to manage */
	init_fn: LiteralArrayMapFn<T>;

	transitions?: ArrangerTransitions;

	// callbacks
	callbacks?: ElementCallbacks<T>;
}
export class LiteralArrayManager<T> {
	public array: Array<T>;

	protected key_fn: ArrayKeyFn<T>;
	protected init_fn: LiteralArrayMapFn<T>;
	protected transitions?: ArrangerTransitions;

	/** Container element which is the parent of array elements */
	public container: Element;

	public element_map: Map<string, Element>;
	public value_map: Map<string, T>;
	public arranger: ElementArranger;

	// callbacks
	protected callbacks?: ElementCallbacks<T>;
	constructor(opts: LiteralArrayManagerOpts<T>) {
		this.array = opts.array;
		this.key_fn = opts.key_fn;

		this.init_fn = opts.init_fn;
		this.transitions = opts.transitions;

		this.callbacks = opts.callbacks;

		this.container = get_element(opts.target);

		this.element_map = new Map();
		this.value_map = new Map();
		this.arranger = new ElementArranger({
			target: this.container,
			initial: opts.array.map((v) => this.new_element(v)),
			transitions: this.transitions,
		});
	}

	private map_set(key: string, value: T, el: Element) {
		this.element_map.set(key, el);
		this.value_map.set(key, value);
	}
	private map_delete(key: string) {
		this.element_map.delete(key);
		this.value_map.delete(key);
	}

	protected new_element(item: T, key?: string): Element {
		key = key || this.key_fn(item);

		// init element
		const element = this.init_fn(key, item);
		// element.setAttribute(KeyAttribute, key);

		// finalize
		this.map_set(key, item, element);
		return element;
	}

	public update() {
		this.callbacks?.before_update?.();

		const target_elements = [];
		const doomed_keys = new Set(this.element_map.keys());
		for (const entry of this.array) {
			const key = this.key_fn(entry);
			const el = this.element_map.get(key) || this.new_element(entry, key);
			doomed_keys.delete(key);

			this.callbacks?.update_item?.(key, entry, el);
			target_elements.push(el);
		}
		doomed_keys.forEach((k) => this.map_delete(k));
		this.arranger.update(target_elements);

		this.callbacks?.after_update?.();
	}
}
