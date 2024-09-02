/** Generic lifecycle callbacks.
 * @
 */
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

/** Get Element from {@link ElementOpts.target}, asserting that it exists.
 * @param target - From {@link ElementOpts.target | target} property
 * @param parent - Optional Element to query from
 * @returns Element or first Element that matches {@link target} selector
 * @throws Throws Error when {@link target} selector doesn't match an element
 */
export function get_element(target: Element | string, parent?: Element): Element {
	if (typeof target === 'string')
		return (() => {
			const el = (parent ?? document).querySelector(target);
			if (!el) throw new Error(`Could not find element for selector '${target}'`);
			return el;
		})();
	else return target;
}

/** Get pixel size for rem on current device */
export const rem = (() => {
	const el = document.createElement('div');
	el.style.height = '1rem';
	document.body.appendChild(el);
	const h = el.getBoundingClientRect().height;
	el.remove();
	return h;
})();
