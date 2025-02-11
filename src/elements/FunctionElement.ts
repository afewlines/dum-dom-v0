// Copyright 2024 Brad Soellner
// SPDX-License-Identifier: Apache-2.0

import { type ElementOpts } from '../common';
import { get_element } from '../utils/Core';

// ELEMENT FUNCTION
//
type FunctionElementFn = (el: Element) => string | void;
export interface FunctionElementOpts extends ElementOpts {
	/** Function to run when updating element.
	 * @param el - Element: base element
	 * @returns string - if nothing returned, does not modify text
	 */
	fn: FunctionElementFn;
}
export class FunctionElement {
	/** Target element */
	public element: Element;
	/** Element update function */
	public fn: FunctionElementFn;

	constructor(opts: FunctionElementOpts) {
		this.element = get_element(opts.target);
		this.fn = opts.fn;
		this.update();
	}

	/** Fire update function, set string if returned. */
	public update(): void {
		const res = this.fn(this.element);
		if (res) this.element.innerHTML = res;
	}
}
