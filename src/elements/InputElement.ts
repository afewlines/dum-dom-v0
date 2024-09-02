import { type ElementCallbacks, type ElementOpts, get_element } from '../base';

// type InputElementValueProp = 'value' | 'valueAsDate' | 'valueAsNumber' | 'checked';
type InputElementValueProp = 'value' | 'valueAsDate' | 'valueAsNumber' | 'checked' | 'files';
export interface InputElementOpts<ET extends HTMLInputElement, P extends InputElementValueProp>
	extends ElementOpts {
	initial: ET[P];
	type?: string;

	cb_input?: (value: ET[P], last: ET[P]) => void;
	cb_submit?: (value: ET[P]) => void;

	callbacks?: ElementCallbacks<ET[P]>;
}
export class InputElement<
	P extends InputElementValueProp,
	ET extends HTMLInputElement = HTMLInputElement,
> {
	public element: ET;
	public cb_input?: (value: ET[P], last: ET[P]) => void;
	public cb_submit?: (value: ET[P]) => void;

	public _prop: InputElementValueProp;
	private _last: ET[P];
	private _value: ET[P];

	protected callbacks?: ElementCallbacks<ET[P]>;
	// TODO disable,
	constructor(prop: P, opts: InputElementOpts<ET, P>) {
		this.element = get_element(opts.target) as ET;
		if (opts.type) this.element.type = opts.type;
		this._prop = prop;
		this.cb_input = opts.cb_input;
		this.cb_submit = opts.cb_submit;
		this.callbacks = opts.callbacks;

		this._value = opts.initial;
		(this.element as any)[this._prop] = opts.initial;
		this._last = opts.initial;
		this.element.value = opts.initial as string;

		this.element.addEventListener('keyup', (ev) => {
			if (ev.key == 'Enter') this.submit();
		});
		this.element.addEventListener('input', () => {
			this.update();
			this.cb_input?.(this._value, this._last);
		});
	}

	public get value(): ET[P] {
		return this._value;
	}
	public set value(value: ET[P]) {
		// this.element.value = value as string;
		(this.element as any)[this._prop] = value;
		this._value = value;
		this.update();
	}

	public submit(): void {
		this.cb_submit?.(this._value);
	}

	public update(): ET[P] {
		this._last = this._value;
		this._value = this.element[this._prop] as ET[P];
		return this._value;
	}
}
