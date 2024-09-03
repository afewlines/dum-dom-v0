import { type ArrangerTransitions, ElementArranger } from '../arrangers/ElementArranger';
import { type ElementOpts } from '../common';
import { get_element } from '../utils/Core';

// ELEMENT SWITCH

export interface SceneManagerOpts extends ElementOpts {
	initial?: number;

	transitions?: ArrangerTransitions;

	// callbacks
	on_update?: () => void;
}
export class SceneManager {
	public container: Element;
	public scenes: Element[];

	public arranger: ElementArranger;

	private _index: number;
	private _last: number;
	private _placeholder: Element;

	protected on_update?: () => void;
	constructor(opts: SceneManagerOpts) {
		this.container = get_element(opts.target);

		this.on_update = opts.on_update;

		this._index = opts.initial ?? 0;
		this._last = this._index;
		this._placeholder = (() => {
			const el = document.createElement('placeholder_switch');
			el.style.display = 'none';
			return el;
		})();

		// collect scenes
		this.scenes = (() => {
			const res = [];
			while (this.container.childElementCount) {
				const el = this.container.children[0];
				res.push(el);
				this.container.removeChild(el);
			}
			return res;
		})();
		this.arranger = new ElementArranger({
			target: this.container,
			transitions: opts.transitions,
			initial: [this.scenes[this._index]],
		});
	}

	public get count(): number {
		return this.scenes.length;
	}
	public get last(): number {
		return this._last;
	}
	public get index(): number {
		return this._index;
	}
	public set index(value: number) {
		this.set_scene(value);
	}
	public get active(): Element {
		return this.scenes[this._index];
	}
	public set active(value: Element) {
		this.set_scene(value);
	}

	/** set currently displayed scene
	 * @param index - number: scene index to switch to
	 * @param scene - HTMLElement: scene element to switch to
	 * @returns boolean, true if change occured
	 */
	public set_scene(index: number): boolean;
	public set_scene(scene: Element): boolean;
	public set_scene(auto: number | Element): boolean;
	public set_scene(target: number | Element): boolean {
		if (typeof target !== 'number') {
			target = this.scenes.indexOf(target);
			if (target < 0) return false;
		}
		if (this._index === target) return false;

		this._last = this._index;
		this._index = target;
		this.arranger.update([this._index === -1 ? this._placeholder : this.scenes[this._index]]);

		this.on_update?.();
		return true;
	}
}

// TODO empty state
