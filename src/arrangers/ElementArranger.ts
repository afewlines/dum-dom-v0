import { gsap } from 'gsap'; // __dum_omit
import { type ElementOpts, get_element } from '../utils/Core';

/** Represents state of item controlled by {@link ArrangerItem}.
 * @enum
 */
export enum ARRANGER_ITEM_STATE {
	/** Item has just been created, has not entered. */
	INITIAL,
	/** Item is entering the DOM. */
	ENTERING,
	/** Item is in the DOM and not transitioning */
	ACTIVE,
	/** Item is repositioning. */
	MOVING,
	/** Item is leaving the DOM. */
	LEAVING,
}

/** Contains information about an item in an {@link ElementArranger}. */
export interface ArrangerItem {
	/** Element controlled by arranger. */
	el: Element;
	/** Current state of item (entering, leaving, etc). */
	state: ARRANGER_ITEM_STATE;
	/** Reference to DOMRect representing last (known) painted position. */
	last_pos?: DOMRect;
}
/** Base interface for user-defined {@link ElementArranger} transitions. */
export interface ArrangerTransitions {
	/** Triggers when element is to enter the DOM. */
	enter?: (el: Element, tl: gsap.core.Timeline, now: number) => void;
	/** Triggers when element's position in the arrangement changes. */
	move?: (
		el: Element,
		tl: gsap.core.Timeline,
		now: number,
		position: DOMRect,
		target_position: DOMRect
	) => void;
	/** Triggers when element leaves the arrangement. */
	leave?: (el: Element, tl: gsap.core.Timeline, now: number) => void;
}

/** Options for {@link ElementArranger} constructor. */
export interface ElementArrangerOpts extends ElementOpts {
	/** Initial elements in DOM.
	 * @remarks Elements will not trigger enter transition; for that, call {@link ElementArranger.update} after instantiation.
	 */
	initial?: Element[];
	/** Transitions for ElementArranger. */
	transitions?: ArrangerTransitions;
}
export class ElementArranger {
	/** Parent element of arranged elements. */
	public container: Element;
	/** {@link ArrangerItem} storage map. */
	private item_map: Map<Element, ArrangerItem>;

	/** Transition functions */
	private transitions?: ArrangerTransitions;

	// internal
	/** GSAP Timeline. Destroyed on complete, recreated when needed. */
	private _timeline: gsap.core.Timeline | undefined;
	/** Order of arranged elements.
	 * @remarks Order is updated in {@link update} and applied in {@link update_positions}.
	 */
	private _order: Element[];

	/** When true, arranger will be applying new element positioning before next paint. */
	private _moving: boolean = false;
	constructor(opts: ElementArrangerOpts) {
		this.container = get_element(opts.target);

		this.transitions = opts.transitions;
		this._timeline = undefined;

		this.item_map = new Map();
		this._order = [];

		// do initialize
		if (opts.initial) {
			for (const el of opts.initial) {
				const item = this.create_item(el);
				item.state = ARRANGER_ITEM_STATE.ACTIVE;
				this._order.push(el);
			}
			this.update_positions();
		}
	}

	/** Current (active or new) GSAP timeline.
	 * @see _timeline
	 */
	get timeline(): gsap.core.Timeline {
		return (
			this._timeline ??
			(this._timeline = gsap.timeline({
				autoRemoveChildren: true,
				smoothChildTiming: true,
				onComplete: () => (this._timeline = undefined),
			}))
		);
	}
	/** If a transition applied by the arranger is still running.
	 * @see _timeline
	 */
	get transitioning(): boolean {
		return this._timeline !== undefined;
	}

	/** Create item for given element.
	 * @param element - Element to create an {@link ArrangerItem} for
	 * @returns Created item
	 * @remarks If the element is already in {@link item_map}, it will be overwritten.
	 */
	private create_item(element: Element): ArrangerItem {
		const item: ArrangerItem = {
			el: element,
			state: ARRANGER_ITEM_STATE.INITIAL,
		};
		this.item_map.set(element, item);
		return item;
	}

	/** Apply entering state/transitions to target element.
	 * @param element - Target element
	 * @remarks If no enter transition given, simply sets {@link ArrangerItem.state | state} to {@link ARRANGER_ITEM_STATE.ACTIVE | ACTIVE}.
	 */
	protected element_enter(element: Element): void {
		const item = this.item_map.get(element) ?? this.create_item(element);
		if (item.state === ARRANGER_ITEM_STATE.ENTERING) {
			console.warn('Element was already entering', element.innerHTML, item);
			return;
		} else if (item.state === ARRANGER_ITEM_STATE.LEAVING) {
			// TODO: do we need to process this? probably
		}

		// do transition or just set to active
		if (this.transitions?.enter) {
			item.state = ARRANGER_ITEM_STATE.ENTERING;
			this.transitions.enter(element, this.timeline, this.timeline.time());
			this.timeline.call(() => {
				item.state = ARRANGER_ITEM_STATE.ACTIVE;
			});
		} else {
			item.state = ARRANGER_ITEM_STATE.ACTIVE;
		}
	}
	/** Apply moving state/transitions to target element.
	 * @param element - Target element
	 * @param time - Optional timing argument (defaults to {@link timeline}.time())
	 * @remarks If no move transition given, does nothing.
	 */
	protected element_move(element: Element, time?: number) {
		if (this.transitions?.move) {
			const item = this.item_map.get(element) as ArrangerItem;
			const new_pos = element.getBoundingClientRect();
			if (item.last_pos && (item.last_pos.x !== new_pos.x || item.last_pos.y !== new_pos.y)) {
				const now = time === undefined ? this.timeline.time() : time;
				this.timeline.call(() => {
					item.state = ARRANGER_ITEM_STATE.MOVING;
				});
				this.transitions.move(element, this.timeline, now, item.last_pos, new_pos);
				this.timeline.call(() => {
					item.state = ARRANGER_ITEM_STATE.ACTIVE;
				});
			}
		}
	}
	/** Apply leaving state/transitions to target element.
	 * @param element - Target element
	 * @returns Element if element should still exist in arrangment (is transitioning out), undefined if not
	 * @remarks If no leave transition given, simply sets {@link ArrangerItem.state | state} to {@link ARRANGER_ITEM_STATE.LEAVING | LEAVING}
	 */
	protected element_leave(element: Element): Element | undefined {
		// returns element if it should be kept in order
		const item = this.item_map.get(element);
		if (item === undefined) return undefined;
		if (item.state === ARRANGER_ITEM_STATE.LEAVING) return element;

		// do transition or just remove
		if (this.transitions?.leave) {
			this.timeline.call(() => {
				item.state = ARRANGER_ITEM_STATE.LEAVING;
			});
			this.transitions.leave(element, this.timeline, this.timeline.time());
			this.timeline.call(() => {
				this._order.splice(this._order.indexOf(element), 1);
				this.item_map.delete(element);

				this.update_positions();
			});
			return element;
		} else {
			item.state = ARRANGER_ITEM_STATE.LEAVING;
		}
	}

	/** Update element positions in DOM, apply transitions if needed.
	 *
	 * On next animation frame,
	 * update {@link ArrangerItem.last_pos | last_pos} for all {@link item_map | items},
	 * place elements in DOM according to {@link _order},
	 * fires move transitions if present.
	 */
	private update_positions() {
		if (this._moving) return;
		this._moving = true;

		// defer because lag
		requestAnimationFrame(() => {
			// update last_pos before logic
			for (const [el, item] of this.item_map) {
				if (document.body.contains(el)) item.last_pos = el.getBoundingClientRect();
			}

			// move to new spot w/o leavers
			this.container.replaceChildren(...this._order);

			// if transition, mark now time and move if updated
			if (this.transitions?.move) {
				const now = this.timeline.time();
				for (const el of this._order) {
					this.element_move(el, now);
				}
			}

			this._moving = false;
		});
	}
	/** Apply new children.
	 * @param target_order - Elements (ordered) that should be displayed
	 * @remarks If assigned a leave transition with duration > 0, items that are leaving will remain in the DOM.
	 * Inherently calls {@link update_positions}.
	 */
	public update(target_order: Element[]) {
		// update
		target_order = Array.from(new Set(target_order)); // remove dupes
		const old_order = this._order;
		this._order = [];

		const old_length = old_order.length,
			target_length = target_order.length;

		let leaving = 0;
		for (let i = 0; i < Math.max(old_length, target_length); ++i) {
			const old_el = i < old_length ? old_order[i] : undefined;
			if (old_el && target_order.indexOf(old_el) < 0) {
				// old leaving
				if (this.element_leave(old_el)) {
					this._order.splice(i, 0, old_el);
					leaving += 1;
				}
			}

			const target_el = i < target_length ? target_order[i] : undefined;
			if (target_el) {
				let old_index: number;
				if (
					(old_index = old_order.indexOf(target_el)) < 0 ||
					this.item_map.get(old_order[old_index])?.state === ARRANGER_ITEM_STATE.LEAVING
				) {
					this.element_enter(target_el);
					this._order.splice(i + leaving, 0, target_el);
					continue;
				}

				this._order.splice(i + leaving, 0, target_el);
			}
		}

		// finalize position in dom
		this.update_positions();
	}
}
