import { type ElementCallbacks, type ElementOpts, get_element } from '../base';

type InputElementValueProp = 'value' | 'valueAsDate' | 'valueAsNumber';
export interface InputElementOpts<P extends InputElementValueProp> extends ElementOpts {
	initial: HTMLInputElement[P];

	cb_input?: (value: HTMLInputElement[P], last: HTMLInputElement[P]) => void;
	cb_submit?: (value: HTMLInputElement[P]) => void;

	callbacks?: ElementCallbacks<HTMLInputElement[P]>;
}
export class InputElement<P extends InputElementValueProp> {
	public element: HTMLInputElement;
	public cb_input?: (value: HTMLInputElement[P], last: HTMLInputElement[P]) => void;
	public cb_submit?: (value: HTMLInputElement[P]) => void;

	public _prop: InputElementValueProp;
	private _last: HTMLInputElement[P];
	private _value: HTMLInputElement[P];

	protected callbacks?: ElementCallbacks<HTMLInputElement[P]>;
	constructor(prop: P, opts: InputElementOpts<P>) {
		this.element = get_element(opts.target) as HTMLInputElement;

		this._prop = prop;
		this.cb_input = opts.cb_input;
		this.cb_submit = opts.cb_submit;
		this.callbacks = opts.callbacks;

		this._value = opts.initial;
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

	public get value(): HTMLInputElement[P] {
		return this._value;
	}
	public set value(value: HTMLInputElement[P]) {
		this.element.value = value as string;
		this.update();
	}

	public submit(): void {
		this.cb_submit?.(this._value);
	}

	public update(): HTMLInputElement[P] {
		this._last = this._value;
		this._value = this.element[this._prop] as HTMLInputElement[P];
		return this._value;
	}
}
