import { get_element } from '../base';

// base
type EventType = keyof HTMLElementEventMap;
type EventTarget = HTMLElement | Window;
type EventTypeMap<T> = { [key in EventType]?: T };

// specific
type EventListenerCallback<M extends EventType> = (
	ev: HTMLElementEventMap[M],
	target: EventTarget
) => void;
type EventManagerMap = {
	[key in EventType]?: EventListenerCallback<key>[];
};
type EventManagerMapPartial = {
	[key in EventType]?: EventListenerCallback<key> | EventListenerCallback<key>[] | EventType;
};

export interface EventManagerOpts {
	target?: string | Element | EventTarget;
	map: EventManagerMapPartial;
}
export class EventManager {
	protected map: EventManagerMap;

	/** node that is being listened to for events */
	private _target: EventTarget;
	/** is manager currently listening */
	private _active: boolean;

	private _listeners: EventTypeMap<(ev: Event) => unknown> = {};

	constructor(opts: EventManagerOpts) {
		this._target = get_element((opts.target || window) as Element | string) as EventTarget;
		this.map = (() => {
			const res: EventManagerMap = {};
			// const m = opts.map;
			const later: EventTypeMap<EventType> = {};
			for (const key of <EventType[]>Object.keys(opts.map)) {
				const value = opts.map[key];

				res[key] = [];
				if (typeof value == 'string') later[key] = value;
				else if (Array.isArray(value))
					res[key].push(...(value as Array<EventListenerCallback<typeof key>>));
				else res[key].push(value as EventListenerCallback<typeof key>);
			}

			for (const key of <EventType[]>Object.keys(later)) {
				const source_key = later[key] as EventType;
				if (res[source_key])
					res[key]?.push(...(res[source_key] as EventListenerCallback<typeof key>[]));
			}

			return res;
		})();
		this._active = false;
	}

	/** node that is being listened to for events */
	public get target(): EventTarget {
		return this._target;
	}
	public set target(value: EventTarget) {
		this.set_target(value);
	}
	/** is manager currently listening */
	public get active(): boolean {
		return this._active;
	}
	public set active(mode: boolean) {
		if (mode) this.listen();
		else this.remove();
	}

	// internal functions
	/** actual callback; called when event triggered, calls all associated {@link callbacks} */
	protected do_callbacks<ET extends EventType>(ev_type: ET, ev: HTMLElementEventMap[ET]) {
		if (this.map[ev_type]) for (const cb of this.map[ev_type]) cb(ev, this._target);
	}

	/** change listener's target, reapplies listeners if active
	 * @param target - new target node
	 * @returns true if target changed, false otherwise
	 */
	public set_target(target: EventTarget): boolean {
		if (target == this._target) return false;
		else {
			if (this._active) {
				this.remove();
				this._target = target;
				this.listen();
			} else this._target = target;
			return true;
		}
	}
	/** enable listening on target element
	 * @param target - optional, new node to listen to
	 * @returns true if listening started w/ this call, false otherwise
	 */
	public listen(target?: EventTarget) {
		if (target) this.set_target(target);
		if (this._active) return false; // if active, no change; target swap handeled in set_target

		// else, apply
		this._active = true;
		for (const ev_type of <EventType[]>Object.keys(this.map)) {
			this._target.addEventListener(
				ev_type,
				(this._listeners[ev_type] = (ev) => this.do_callbacks(ev_type as EventType, ev))
			);
		}
		return true;
	}
	/** stop listening on target element
	 * @returns true if listening stopped w/ this call, false otherwise
	 */
	public remove() {
		if (!this._active) return false; // if not active, not listening

		this._active = false;
		for (const ev_type of <EventType[]>Object.keys(this.map)) {
			if (this._listeners[ev_type])
				this._target.removeEventListener(ev_type, this._listeners[ev_type]);
		}
		return true;
	}
}
