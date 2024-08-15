import { get_element } from '../base';
import { map_map, iter_map } from '../utils/Structural';
import { ARRANGER_ITEM_STATE } from './ElementArranger';

// element-focused
export interface Transform2D {
	x: number;
	y: number;
	sx: number;
	sy: number;
	r: number;
}
// Helper Functions
function decompose_matrix(matrix: DOMMatrix): Transform2D {
	return {
		x: matrix.m41,
		y: matrix.m42,
		sx: Math.sqrt(matrix.m11 * matrix.m11 + matrix.m12 * matrix.m12),
		sy: Math.sqrt(matrix.m21 * matrix.m21 + matrix.m22 * matrix.m22),
		r: (Math.atan2(matrix.m12, matrix.m11) * 180) / Math.PI,
	};
}

function get_item_position(item: ScatteredArrangerItem): DOMPoint {
	const item_rect = item.el.getBoundingClientRect();
	return new DOMPoint(
		item_rect.x + window.scrollX + item_rect.width / 2,
		item_rect.y + window.scrollY + item_rect.height / 2
	);
}
function get_container_transform(container: ScatteredArrangerContainer): DOMMatrix {
	// create item matrix
	const container_rect = container.el.getBoundingClientRect();
	const container_matrix = new DOMMatrix(
		(container.style || (container.style = window.getComputedStyle(container.el))).transform
	);
	container_matrix.m41 += container_rect.x;
	container_matrix.m42 += container_rect.y;

	return container_matrix;
}
function compute_delta_transform(item: ScatteredArrangerItem): Transform2D {
	const new_pos = item.container.transform.inverse().transformPoint(get_item_position(item));
	if (item.last_pos) {
		const last_pos = item.container.transform.inverse().transformPoint(item.last_pos);
		const xform = decompose_matrix(item.container.transform);
		xform.x = new_pos.x - last_pos.x;
		xform.y = new_pos.y - last_pos.y;

		if (item.last_container) {
			const last_xform = decompose_matrix(item.last_container.transform);
			// xform.p = [new_pos.x - last_pos.x, new_pos.y - last_pos.y, new_pos.z - last_pos.z]
			xform.r -= last_xform.r;
			xform.sx /= last_xform.sx;
			xform.sy /= last_xform.sy;
		}

		return xform;
	} else {
		return {
			x: new_pos.x,
			y: new_pos.y,
			r: 0,
			sx: 1,
			sy: 1,
		};
	}
}

// class datas
export interface ScatteredArrangerContainer {
	el: Element;
	order: Set<ScatteredArrangerItem>;
	style?: CSSStyleDeclaration;
	transform: DOMMatrix;
}
export interface ScatteredArrangerItem {
	el: Element;
	state: ARRANGER_ITEM_STATE;

	container: ScatteredArrangerContainer;
	last_container?: ScatteredArrangerContainer;

	// extra
	// style?: CSSStyleDeclaration;
	last_pos?: DOMPoint;
}

// class interfaces
export interface ScatteredArrangerTransitions {
	/** Triggers when element is to enter the DOM. */
	enter?: (el: Element, tl: gsap.core.Timeline, now: number) => void;
	/** Triggers when element's position in the arrangement changes. */
	move?: (el: Element, tl: gsap.core.Timeline, delta: Transform2D, now: number) => void;
	/** Triggers when element leaves the arrangement. */
	leave?: (el: Element, tl: gsap.core.Timeline, now: number) => void;
}
export interface ScatteredArrangerOpts {
	// initial layout
	initial?: ScatteredArrangerLayout;
	// transitions
	transitions?: ScatteredArrangerTransitions;
}
export type ScatteredArrangerLayout = Array<{
	container: Element;
	children: Element[];
}>;
export class ScatteredArranger {
	private transitions?: ScatteredArrangerTransitions;

	// maps
	public item_map: Map<Element, ScatteredArrangerItem>;
	public container_map: Map<Element, ScatteredArrangerContainer>;

	// private
	private _moving: boolean = false;
	// public _layout: Map<Element, Set<Element>>;
	// public _layout: Map<Element, Set<Element>>;

	// getter'd
	private _timeline: gsap.core.Timeline | undefined;
	constructor(opts: ScatteredArrangerOpts) {
		// important
		// this._layout = new Map();
		this.item_map = new Map();
		this.container_map = new Map();

		// opts easy
		this.transitions = opts.transitions;

		// initialize
		if (opts.initial) {
			for (const group of opts.initial) {
				const cel = get_element(group.container);
				const container = this.container_map.get(cel) || this.create_container(cel);
				const children = group.children.map((el) => {
					const item = this.create_item(get_element(el), container);
					item.state = ARRANGER_ITEM_STATE.ACTIVE;
					return item;
				});
				children.forEach((el) => container.order.add(el));
			}

			this.update_positions();
		}
	}

	get containers(): ScatteredArrangerContainer[] {
		return map_map(this.container_map, (c) => c);
	}
	get items(): ScatteredArrangerItem[] {
		return map_map(this.item_map, (c) => c);
	}
	get timeline(): gsap.core.Timeline {
		return (
			this._timeline ||
			(this._timeline = gsap.timeline({
				autoRemoveChildren: true,
				smoothChildTiming: true,
				onComplete: () => (this._timeline = undefined),
			}))
		);
	}
	get transitioning(): boolean {
		return this._timeline != undefined;
	}

	// factories
	private create_container(element: Element): ScatteredArrangerContainer {
		// register parent
		const container: ScatteredArrangerContainer = {
			el: element,
			// style: window.getComputedStyle(element),
			order: new Set<ScatteredArrangerItem>(),
			transform: new DOMMatrix(),
		};
		this.container_map.set(element, container);
		return container;
	}
	private create_item(
		element: Element,
		container: ScatteredArrangerContainer
	): ScatteredArrangerItem {
		const item: ScatteredArrangerItem = {
			el: element,
			container: container,
			// style: window.getComputedStyle(element),
			state: ARRANGER_ITEM_STATE.INITIAL,
		};
		this.item_map.set(element, item);
		container.order.add(item);
		return item;
	}

	// element targets
	protected element_enter(item: ScatteredArrangerItem): void {
		if (item.state == ARRANGER_ITEM_STATE.ENTERING) {
			console.warn('item was already entering', item);
			return;
		}

		// do transition or just set to active
		if (this.transitions?.enter) {
			item.state = ARRANGER_ITEM_STATE.ENTERING;
			this.transitions.enter(item.el, this.timeline, this.timeline.time());
			this.timeline.call(() => {
				item.state = ARRANGER_ITEM_STATE.ACTIVE;
			});
		} else {
			item.state = ARRANGER_ITEM_STATE.ACTIVE;
		}
	}
	protected element_leave(item: ScatteredArrangerItem): Element | undefined {
		// returns element if it should be kept in order
		if (item.state == ARRANGER_ITEM_STATE.LEAVING) return item.el;

		// do transition or just remove
		if (this.transitions?.leave) {
			this.timeline.call(() => {
				item.state = ARRANGER_ITEM_STATE.LEAVING;
			});
			this.transitions.leave(item.el, this.timeline, this.timeline.time());
			this.timeline.call(() => {
				this.item_map.delete(item.el);
				item.container.order.delete(item);

				this.update_positions();
			});
			return item.el;
		} else {
			item.state = ARRANGER_ITEM_STATE.LEAVING;
			this.item_map.delete(item.el);
			item.container.order.delete(item);
		}
	}
	protected element_move(item: ScatteredArrangerItem, time?: number): void {
		if (this.transitions?.move == undefined) return;
		if (item.last_pos == undefined || item.state == ARRANGER_ITEM_STATE.MOVING) return;

		const delta = compute_delta_transform(item);

		// const v2 = delta.p.some((p) => p != 0) || delta.r.some((r) => r != 0) || delta.sc.some((sc) => sc != 1);

		if (
			delta.x ||
			delta.y ||
			delta.r ||
			delta.sx != 1 ||
			delta.sy != 1 // || delta.sc[2] != 1
		) {
			// console.log(item.el.innerHTML, 'moving', delta);

			const now = time == undefined ? this.timeline.time() : time;
			this.timeline.call(() => {
				item.state = ARRANGER_ITEM_STATE.MOVING;
			});
			this.transitions.move(item.el, this.timeline, delta, now);
			this.timeline.call(() => {
				item.state = ARRANGER_ITEM_STATE.ACTIVE;
			});
		}
	}
	private apply_order(
		container: ScatteredArrangerContainer,
		target_order: ScatteredArrangerItem[],
		all_old_items: Set<ScatteredArrangerItem>,
		all_target_items: Set<ScatteredArrangerItem>
	) {
		const old_order = Array.from(container.order);
		const new_order = new Array<ScatteredArrangerItem>();

		const old_length = old_order.length;
		const target_length = target_order.length;

		let leaving = 0;
		for (let i = 0; i < Math.max(old_length, target_length); ++i) {
			const old_item = i < old_length ? old_order[i] : undefined;
			// old element exists but not in target order
			if (old_item && !all_target_items.has(old_item)) {
				// old leaving
				if (this.element_leave(old_item)) {
					new_order.splice(i, 0, old_item);
					leaving += 1;
				}
			}

			const target_item = i < target_length ? target_order[i] : undefined;
			if (target_item) {
				// target not in old or was leaving
				if (!all_old_items.has(target_item) || target_item.state == ARRANGER_ITEM_STATE.LEAVING) {
					this.element_enter(target_item);
					new_order.splice(i + leaving, 0, target_item);
					continue;
				}

				new_order.splice(i + leaving, 0, target_item);
			}
		}

		return (container.order = new Set(new_order));
	}

	// backend
	private update_positions(): void {
		// update last positions
		for (const [_, container] of this.container_map) {
			container.transform = get_container_transform(container);
		}
		for (const [el, item] of this.item_map) {
			if (document.body.contains(el)) item.last_pos = get_item_position(item);
			item.last_container = item.container;
		}

		// block until resolved
		if (this._moving) return;
		this._moving = true;

		// defer
		requestAnimationFrame(() => {
			// replace children
			for (const [el, container] of this.container_map) {
				el.replaceChildren(
					...iter_map(container.order, (i) => {
						i.container = container;
						return i.el;
					})
				);
			}

			// if there are moving transitions, apply
			if (this.transitions?.move) {
				const now = this.timeline.time();
				for (const [_el, container] of this.container_map) {
					for (const item of container.order) this.element_move(item, now);
				}
			}

			// unblock update_positions lock
			this._moving = false;
		});
	}

	// interface
	public update(): void;
	public update(target_layout: ScatteredArrangerLayout): void;
	public update(target_layout: Map<Element, Set<Element>>): void;
	public update(target_layout?: Map<Element, Set<Element>> | ScatteredArrangerLayout): void {
		if (target_layout == undefined) return this.update_positions();

		// all elements in arranger
		const all_target_items = new Set<ScatteredArrangerItem>();
		const all_old_items = new Set(
			map_map(this.container_map, (v) => v.order).flatMap((v) => [...v])
		);

		const target_map = new Map<ScatteredArrangerContainer, Set<ScatteredArrangerItem>>();
		if (target_layout instanceof Map) {
			target_layout.forEach((children, c) => {
				const container = this.container_map.get(c) || this.create_container(c);
				const order = new Set<ScatteredArrangerItem>();
				children.forEach((c) => {
					const item = this.item_map.get(c) || this.create_item(c, container);
					order.add(item);
					all_target_items.add(item);
				});
				target_map.set(container, order);
			});
		} else {
			for (const group of target_layout) {
				const container =
					this.container_map.get(group.container) || this.create_container(group.container);
				const order = new Set<ScatteredArrangerItem>();
				for (const child of group.children) {
					const item = this.item_map.get(child) || this.create_item(child, container);
					order.add(item);
					all_target_items.add(item);
				}
				target_map.set(container, order);
			}
		}

		// do the application
		for (const [container, children] of target_map) {
			this.apply_order(container, [...children], all_old_items, all_target_items);
		}

		this.update_positions();
	}
	public reparent(target: Element): void;
	public reparent(target: Element, container_el: Element, index?: number): void;
	public reparent(target: Element, container_el?: Element, index?: number): void {
		if (container_el) {
			const container = this.container_map.get(container_el) || this.create_container(container_el);
			const item = (() => {
				let item = this.item_map.get(target);
				if (item) {
					// item.last_container = item.container;
					return item;
				} else {
					item = this.create_item(target, container);
					this.element_enter(item);
					return item;
				}
			})();

			item.container.order.delete(item);

			if (index == undefined) container.order.add(item);
			else {
				const old = [...container.order.values()];
				old.splice(index, 0, item);
				container.order = new Set(old);
			}
		} else {
			const item = this.item_map.get(target);
			if (item && this.element_leave(item) == undefined) {
				item.container.order.delete(item);
				this.item_map.delete(target);
			}
		}
	}
}
