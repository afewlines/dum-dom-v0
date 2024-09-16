/** Generic lifecycle callbacks. */
export interface ElementCallbacks<T> {
	/** Triggers after update is requested but before it's processed. */
	before_update?: () => void;
	/** Triggers when an individual item is updated. */
	update_item?: (key: string, value: T, el: Element) => void;
	/** Triggers immeditealy after update has been completed, before repaint. */
	after_update?: () => void;
}

/** Base options interface. */
export interface ElementOpts {
	/** Base element reference or selector. Used with {@link get_element}.*/
	target: Element | string;
}

export type HookResult<T = never> = undefined | void | T;
export type HookResultAsync<T = never> = Promise<HookResult<T>>;
