import { get_element } from '../base';
import {
	ScatteredArranger,
	ScatteredArrangerTransitions,
	type Transform2D,
} from '../arrangers/ScatteredArranger';
import { type ArrayKeyFn } from './ArrayManager';
import { DualMap } from '../utils/Structural';

export type MulticontainerMapFn<T> = (key: string, value: T, container: Element) => Element;
// export type MulticontainerKeyFn<T> = (value: T, container: Element) => string;
export type MulticontainerLayout<T> = Array<{ container: Element | string; children: T[] }>;
export interface MulticontainerTransitions<T> {
	/** Triggers when element is to enter the DOM. */
	enter?: (el: Element, item: T, tl: gsap.core.Timeline, now: number) => void;
	/** Triggers when element's position in the arrangement changes. */
	move?: (el: Element, item: T, tl: gsap.core.Timeline, delta: Transform2D, now: number) => void;
	/** Triggers when element leaves the arrangement. */
	leave?: (el: Element, item: T, tl: gsap.core.Timeline, now: number) => void;
}
// scattered manager
export interface MulticontainerCallbacks<T> {
	/** Triggers after update is requested but before it's processed. */
	before_update?: () => void;
	/** Triggers when an individual item is updated. */
	update_item?: (key: string, value: T, el: Element, container: Element) => void;
	/** Triggers immeditealy after update has been completed, before repaint. */
	after_update?: () => void;
}
export interface MulticontainerManagerOpts<T> {
	layout: MulticontainerLayout<T>;

	// key function for items
	key_fn: ArrayKeyFn<T>;
	// function to call when initializing a child
	init_fn: MulticontainerMapFn<T>;

	transitions?: MulticontainerTransitions<T>;
	callbacks?: MulticontainerCallbacks<T>;
}
export class MulticontainerManager<T> {
	// public array: Array<T>;
	// public containers: Element[];

	protected key_fn: ArrayKeyFn<T>;
	protected init_fn: MulticontainerMapFn<T>;

	public element_map: Map<string, Element>;
	public item_map: DualMap<Element, T>;
	public value_map: Map<string, T>;

	public arranger: ScatteredArranger;

	// callbacks
	protected callbacks?: MulticontainerCallbacks<T>;
	constructor(opts: MulticontainerManagerOpts<T>) {
		this.key_fn = opts.key_fn;
		this.init_fn = opts.init_fn;

		this.element_map = new Map();
		this.item_map = new DualMap();
		this.value_map = new Map();

		let transitions: ScatteredArrangerTransitions | undefined = undefined;
		if (opts.transitions) {
			transitions = {};
			if (opts.transitions.enter)
				transitions.enter = (el, tl, now) =>
					opts.transitions?.enter?.(el, this.item_map.map.get(el) as T, tl, now);
			if (opts.transitions.move)
				transitions.move = (el, tl, delta, now) =>
					opts.transitions?.move?.(el, this.item_map.map.get(el) as T, tl, delta, now);
			if (opts.transitions.leave)
				transitions.leave = (el, tl, now) =>
					opts.transitions?.leave?.(el, this.item_map.map.get(el) as T, tl, now);
		}
		this.arranger = new ScatteredArranger({
			initial: opts.layout.map((group) => {
				const container = get_element(group.container);
				return {
					container: container,
					children: group.children.map((child) => this.init_item(child, container)),
				};
			}),
			transitions: transitions,
		});
	}

	public get containers(): Element[] {
		return this.arranger.containers.map((c) => c.el);
	}
	public get children(): T[] {
		return [...this.value_map.values()];
	}
	public get elements(): Element[] {
		return [...this.element_map.values()];
	}

	protected init_item(item: T, container: Element, key?: string): Element {
		key = key || this.key_fn(item);

		// init element
		const element = this.init_fn(key, item, container);
		// element.setAttribute(KeyAttribute, key);

		// finalize
		this.item_map_set(key, item, element);
		return element;
	}

	private item_map_set(key: string, value: T, el: Element) {
		this.element_map.set(key, el);
		this.item_map.set(el, value);
		this.value_map.set(key, value);
	}
	private item_map_delete(key: string) {
		let el: Element | undefined;
		if ((el = this.element_map.get(key))) {
			this.element_map.delete(key);
			this.item_map.delete_key(el);
		}
		this.value_map.delete(key);
	}

	public update(target_layout?: MulticontainerLayout<T>) {
		if (target_layout == undefined) return this.arranger.update();
		this.callbacks?.before_update?.();

		const doomed_keys = new Set(this.element_map.keys());

		// generate new layout & process what needs to be processed
		const new_layout = target_layout.map((group) => {
			const container = get_element(group.container);
			return {
				container: container,
				children: group.children.map((child) => {
					const key = this.key_fn(child);
					const el = this.element_map.get(key) || this.init_item(child, container, key);

					doomed_keys.delete(key);
					this.callbacks?.update_item?.(key, child, el, container);

					return el;
				}),
			};
		});
		doomed_keys.forEach((k) => this.item_map_delete(k));
		this.arranger.update(new_layout);

		this.callbacks?.after_update?.();
	}
	public reparent(target: T, new_parent?: Element) {
		const key = this.key_fn(target);
		if (new_parent) {
			const el = this.element_map.get(key) || this.init_item(target, new_parent, key);
			this.arranger.reparent(el, new_parent);
		} else {
			// delete
			const el = this.element_map.get(key);
			if (el) {
				this.arranger.reparent(el);
				this.item_map_delete(key);
			}
		}
	}
}
// TODO implement move transitions!
// TODO tidy up
// TODO additonal mappings?
