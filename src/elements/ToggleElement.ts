import { gsap } from 'gsap'; // __dum_omit
import { type ElementOpts, get_element } from '../base';

// ELEMENT TOGGLE
export interface ToggleElementTransitions {
	enter?: (el: Element, tl: gsap.core.Timeline) => void;
	leave?: (el: Element, tl: gsap.core.Timeline) => void;
}
export interface ToggleElementOpts extends ElementOpts {
	initial?: boolean;
	transitions?: ToggleElementTransitions;

	// callback
	on_update?: () => void;
}
export class ToggleElement {
	public element: Element;
	private _active: boolean;

	protected transitions?: ToggleElementTransitions;

	private _parent: Element;
	private _placeholder: Element;
	private _timeline?: gsap.core.Timeline;
	private _applying: boolean = false;

	protected on_update?: () => void;
	constructor(opts: ToggleElementOpts) {
		this.element = get_element(opts.target);
		this._active = opts.initial || true;

		this.transitions = opts.transitions;
		this.on_update = opts.on_update;

		this._parent = (() => {
			const el = this.element.parentElement;
			if (!el) throw new Error(`Element did not have parent: ${this.element}`);
			return el;
		})();
		this._placeholder = (() => {
			const el = document.createElement('placeholder_toggle');
			el.style.display = 'none';
			return el;
		})();
	}

	public get active(): boolean {
		return this._active;
	}
	public set active(state: boolean) {
		this.set(state);
	}

	/** set active state
	 * @param state - boolean: target state for element
	 * @returns - boolean: operation changed element's state
	 */
	public set(state: boolean): boolean {
		if (this._applying) return false;
		this._applying = true;
		const changed = this._active != state;
		this._active = state;

		if (changed) {
			// update
			if (this._active) {
				// is entering
				const tl = (this._timeline = gsap.timeline({ autoRemoveChildren: true }));
				tl.call(() => {
					this._parent.insertBefore(this.element, this._placeholder);
					this._parent.removeChild(this._placeholder);
				});
				// add enter transition
				this.transitions?.enter?.(this.element, tl);
				// add active state
				// this.transitions?.active?.(this.element, tl);
				// remove timeline when done
				tl.call(() => {
					this._timeline = undefined;
					this._applying = false;
				});
				tl.play();
			} else {
				// is leaving
				const tl = this._timeline?.isActive()
					? this._timeline
					: (this._timeline = gsap.timeline({ autoRemoveChildren: true }));

				// add leave transition
				this.transitions?.leave?.(this.element, tl);
				// actually remove element
				tl.call(() => {
					this._parent.insertBefore(this._placeholder, this.element);
					this._parent.removeChild(this.element);
					this._applying = false;
				});
			}

			this.on_update?.();
		}

		return changed;
	}
	/** toggles active state */
	public toggle() {
		this.set(!this._active);
	}
}
