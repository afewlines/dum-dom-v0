import { gsap } from 'gsap'; // __dum_omit
import { get_element } from '../base';
import { AsyncHelpers } from '../utils';
import { iter_filter } from '../utils/Structural';

export enum STATE {
	INITIAL,
	ENTERING,
	ACTIVE,
	MOVING,
	LEAVING,
}

export interface ManagedContainer {
	el: Element;
	transform: DOMMatrix;
	last_transform?: DOMMatrix;
}

export interface ManagedMaster extends ManagedContainer {
	// el: Element;
}

export interface ManagedItem<T> {
	value: T;
	el: Element;
	state: STATE;

	container: ManagedContainer;
	last_container?: ManagedContainer;
	last_position?: DOMPoint;

	_tl?: gsap.core.Timeline;
}

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace spatial {
	export interface Transform2D {
		x: number;
		y: number;
		sx: number;
		sy: number;
		r: number;
	}
	// Helper Functions
	export function decompose_matrix(matrix: DOMMatrix): Transform2D {
		return {
			x: matrix.m41,
			y: matrix.m42,
			sx: Math.sqrt(matrix.m11 * matrix.m11 + matrix.m12 * matrix.m12),
			sy: Math.sqrt(matrix.m21 * matrix.m21 + matrix.m22 * matrix.m22),
			r: (Math.atan2(matrix.m12, matrix.m11) * 180) / Math.PI,
		};
	}

	export function get_el_position(el: Element): DOMPoint {
		const rect = el.getBoundingClientRect();
		return new DOMPoint(
			rect.x + window.scrollX + rect.width / 2,
			rect.y + window.scrollY + rect.height / 2
		);
	}
	export function get_element_transform(el: Element): DOMMatrix {
		// create item matrix
		const rect = el.getBoundingClientRect();
		const container_matrix = new DOMMatrix(window.getComputedStyle(el).transform);
		container_matrix.m41 += rect.x;
		container_matrix.m42 += rect.y;

		return container_matrix;
	}
	export function get_element_rotation(el: Element): number {
		const mat = spatial.get_element_transform(el);
		return (Math.atan2(mat.m12, mat.m11) * 180) / Math.PI;
	}
	export function get_master_transform(root: Element, el: Element): DOMMatrix {
		if (!root.contains(el)) throw new Error('Element not child of Master');

		// if same thing, return identity
		const mat = new DOMMatrix();
		if (root == el) return mat;

		// otherwise compute master
		let pel: Element | null = el;
		while (pel && pel != root) {
			const pmat = get_element_transform(pel);
			mat.multiplySelf(pmat);

			pel = pel.parentElement;
		}

		return mat;
	}
	export function compute_delta_transform<T>(item: ManagedItem<T>): Transform2D {
		const new_point = get_el_position(item.el);
		const new_pos = item.container.transform.inverse().transformPoint(new_point);
		if (item.last_position) {
			const last_pos = item.container.transform.inverse().transformPoint(item.last_position);
			const xform = decompose_matrix(item.container.transform);
			xform.x = new_pos.x - last_pos.x;
			xform.y = new_pos.y - last_pos.y;

			if (item.last_container?.last_transform) {
				const last_xform = decompose_matrix(item.last_container.last_transform);
				const rd1 = xform.r - last_xform.r;
				const rd2 = xform.r - last_xform.r - 360;

				xform.r = Math.abs(rd1) < Math.abs(rd2) ? rd1 : rd2;
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
}

function get_timeline<T>(item: ManagedItem<T>) {
	return (
		item._tl ||
		(item._tl = gsap.timeline({
			autoRemoveChildren: true,
			smoothChildTiming: true,
			onComplete: () => (item._tl = undefined),
		}))
	);
}

type FnInit<T> = (value: T) => Element;

export interface MasterArrangerCallbacks {
	pre_clean?: () => void;
	post_clean?: () => void;
}
export interface MasterArrangerTransitions<T> {
	/** Triggers when element is to enter the DOM. */
	enter?: (item: ManagedItem<T>, tl: gsap.core.Timeline) => gsap.core.Timeline;
	/** Triggers when element's position in the arrangement changes. */
	move?: (
		item: ManagedItem<T>,
		tl: gsap.core.Timeline,
		delta: spatial.Transform2D
	) => gsap.core.Timeline;
	/** Triggers when element leaves the arrangement. */
	leave?: (item: ManagedItem<T>, tl: gsap.core.Timeline) => gsap.core.Timeline;
}
export interface MasterArrangerOpts<T> {
	// mandatories
	target: string | Element;
	fn_init: FnInit<T>;

	// hooks
	transitions?: MasterArrangerTransitions<T>;
	callbacks?: MasterArrangerCallbacks;

	// inits
	items?: Array<T>;
}
export class MasterArranger<T> {
	public master: ManagedMaster;

	public item_map: Map<T, ManagedItem<T>>;
	public container_map: Map<Element, ManagedContainer>;

	protected fn_init: FnInit<T>;

	private transitions?: MasterArrangerTransitions<T>;
	private callbacks?: MasterArrangerCallbacks;

	private _dirty: boolean = false;
	private _movers: Set<ManagedItem<T>>;

	constructor(opts: MasterArrangerOpts<T>) {
		// easy assigns
		// this.fn_key = opts.fn_key;
		this.fn_init = opts.fn_init;
		this.transitions = opts.transitions;
		this.callbacks = opts.callbacks;

		this.master = {
			el: get_element(opts.target),
			transform: new DOMMatrix(),
		};

		// init maps
		this.item_map = new Map();
		this.container_map = new Map();
		this._movers = new Set();

		// do init
		if (opts.items) {
			for (const value of opts.items) {
				const item = this.get_item(value);
				item.state = STATE.ACTIVE;
			}
		}
	}
	// getters
	// factories
	protected get_item(value: T, parent?: Element): ManagedItem<T> {
		let item = this.item_map.get(value);
		if (item) return item;

		const el = this.fn_init(value);

		// either use the target container or try to get element's container

		item = {
			value: value,
			el: el,
			state: STATE.INITIAL,
			container: this.get_container(parent || el.parentElement || this.master.el),
		};

		this.item_map.set(value, item);

		return item;
	}
	protected get_container(el: Element): ManagedContainer {
		let container = this.container_map.get(el);
		if (container) return container;

		container = {
			el: el,
			transform: spatial.get_master_transform(this.master.el, el),
		};
		this.container_map.set(el, container);

		return container;
	}
	// item actions
	protected item_enter(item: ManagedItem<T>) {
		item.container.el.appendChild(item.el);
		if (this.transitions?.enter) {
			// calling .enter gets timeline and applies state change
			// execute enter -> apply active state
			item._tl = this.transitions
				.enter(
					item,
					get_timeline(item).call(() => {
						item.state = STATE.ENTERING;
					})
				)
				.call(() => {
					item.state = STATE.ACTIVE;
				});
		}
	}
	protected item_leave(item: ManagedItem<T>) {
		if (this.transitions?.leave) {
			// calling .leave gets timeline and applies state change
			// do leave logic, returns a tl (might be new)
			// execute leave -> unmanage
			// assign returned timeline to item
			item._tl = this.transitions
				.leave(
					item,
					get_timeline(item).call(() => {
						item.state = STATE.LEAVING;
					})
				)
				.call(() => {
					item.el.remove();
					this.item_map.delete(item.value);
				});
		} else {
			item.el.remove();
			this.item_map.delete(item.value);
		}
	}
	protected item_move(item: ManagedItem<T>) {
		if (this.transitions?.move) {
			if (!this._movers.has(item)) {
				item.last_position = spatial.get_el_position(item.el);
				this._movers.add(item);
				this.dirty(item);
			}
		}
		item.container.el.appendChild(item.el);
	}
	// backend
	protected dirty(_reason?: ManagedItem<T>) {
		if (this._dirty) return;
		this._dirty = true;
		this.callbacks?.pre_clean?.();
		for (const [el, container] of this.container_map) {
			container.last_transform = container.transform;
			container.transform = spatial.get_master_transform(this.master.el, el);
		}
		AsyncHelpers.on_next_frame(() => this.clean());
	}
	protected clean() {
		if (this.transitions?.move) {
			for (const item of this._movers) {
				const delta = spatial.compute_delta_transform(item);
				item._tl = this.transitions
					.move(
						item,
						get_timeline(item).call(() => {
							item.state = STATE.MOVING;
						}),
						delta
					)
					.call(() => {
						item.state = STATE.ACTIVE;
						item.last_position = spatial.get_el_position(item.el);
					});
			}
		}

		this._dirty = false;

		// should movers be cleared?
		this._movers.clear();
		this.callbacks?.post_clean?.();
	}
	// interface
	public reparent(value: T, parent?: Element) {
		let item = this.item_map.get(value);

		// item exists
		if (item) {
			// move to new parent
			// else remove
			if (parent) {
				// ignore no move
				// update last_parent
				item.last_container = item.container;
				item.container = this.get_container(parent);
				this.item_move(item);
			} else {
				// no parent given, item exits
				this.item_leave(item);
			}
		} else if (parent !== undefined) {
			// item didn't exist, just make new and enter
			item = this.get_item(value, parent);
			this.item_enter(item);
		}

		// update position/transform
	}
	public reposition(value: T) {
		const item = this.get_item(value);
		// TODO repostions don't move quite right w/ padding/gap/margin/etc? something's off
		if (this.transitions?.move) {
			if (!this._movers.has(item)) {
				item.last_container = item.container;
				this._movers.add(item);
				this.dirty(item);
			}
		}
	}
	public update_all(layout: Array<[T, Element | undefined]> = []) {
		// TODO add logic to check if just repositioning
		const doomed = new Set<T>(this.item_map.keys());
		for (const row of layout) {
			// remove any updated items from doomed
			doomed.delete(row[0]);
			// if item exists, move
			// but if row[1] undef, remove.
			// otherwise, enters.
			this.reparent(row[0], row[1]);
		}
		// nuke doomed
		for (const value of doomed.keys()) this.reparent(value);
	}
	public update_single(parent: Element | undefined, children: T[]) {
		if (parent === undefined) {
			for (const child of children) this.reparent(child);
		} else {
			const container = this.get_container(parent);
			const doomed = new Set<T>(
				iter_filter(this.item_map.keys(), (v) => this.get_item(v).container == container)
			);

			for (const child of children) {
				const item = this.get_item(child);
				doomed.delete(child);
				this.item_move(item);
			}
			for (const child of doomed) this.reparent(child, undefined);
		}
	}
}
