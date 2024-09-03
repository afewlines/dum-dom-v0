import { type ElementOpts } from '../common';
import { get_element } from '../utils/Core';

// ELEMENT TEXT
//

export interface TextElementOpts extends ElementOpts {
	/** Initial element text, defaults to empty string. */
	initial?: string;

	on_update?: () => void;
}
/** Set an element's text by variable. */
export class TextElement {
	/** Target element */
	public element: Element;

	/** Internal value */
	private _value: string;

	/** callbacks */
	protected on_update?: () => void;

	constructor(opts: TextElementOpts) {
		this.element = get_element(opts.target);
		this.on_update = opts.on_update;

		this._value = '';
		this.update(opts.initial);
	}

	/** Element's current value */
	public get value(): string {
		return this._value;
	}
	public set value(value: string) {
		this.update(value);
	}

	/** Set value and update element's text.
	 *
	 * If value is not provided, just updates element.
	 *
	 * @param value - string: value to update to.
	 */
	public update(value?: string): void {
		if (!(value && value === this._value)) {
			if (value) this._value = value;
			this.element.innerHTML = this._value;
			this.on_update?.();
		}
	}
}
