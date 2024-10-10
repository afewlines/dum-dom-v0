// Copyright 2024 Brad Soellner
// SPDX-License-Identifier: Apache-2.0

/* eslint-disable @typescript-eslint/no-namespace */
/** Get pixel size for rem on current device */
export const rem = (() => {
	const el = document.createElement('div');
	el.style.height = '1rem';
	document.body.appendChild(el);
	const h = el.getBoundingClientRect().height;
	el.remove();
	return h;
})();

/** Get Element from {@link ElementOpts.target}, asserting that it exists.
 * @param target - From {@link ElementOpts.target | target} property
 * @param parent - Optional Element to query from
 * @returns Element or first Element that matches {@link target} selector
 * @throws Throws Error when {@link target} selector doesn't match an element
 */
export function get_element(selector: string, parent?: Element): Element;
export function get_element(passthrough: Element, parent?: Element): Element;
export function get_element(option: Element | string, parent?: Element): Element;
export function get_element(target: Element | string, parent?: Element): Element {
	if (typeof target === 'string')
		return (() => {
			const el = (parent ?? document).querySelector(target);
			if (!el) throw new Error(`Could not find element for selector '${target}'`);
			return el;
		})();
	else return target;
}

interface CreateElementOpts<T extends keyof HTMLElementTagNameMap> {
	tag?: T;
	custom?: string;

	id?: string;

	// classes
	class_list?: string | string[];

	// contents
	children?: Element[];
	inner_html?: string;
	text_content?: string;
}
export function create_element<T extends keyof HTMLElementTagNameMap = 'div'>(
	opts?: CreateElementOpts<T>
): HTMLElementTagNameMap[T] {
	const el = document.createElement(opts?.tag || 'div', {
		is: opts?.custom,
	}) as HTMLElementTagNameMap[T];

	// TODO expand?
	if (opts) {
		if (opts.id) el.id = opts.id;

		if (opts.class_list)
			if (typeof opts.class_list === 'string') el.classList.add(opts.class_list);
			else el.classList.add(...opts.class_list);

		if (opts.children) el.replaceChildren(...opts.children);
		if (opts.inner_html) el.innerHTML = opts.inner_html;
		if (opts.text_content) el.textContent = opts.text_content;
	}

	return el;
}

/** shuffle elements inplace */
export function shuffle<T>(arr: Array<T>, remaining?: number): Array<T> {
	if (remaining === undefined) remaining = arr.length;

	let target: number;
	let last: T;
	while (remaining) {
		target = Math.floor(Math.random() * remaining--);
		last = arr[remaining];
		arr[remaining] = arr[target];
		arr[target] = last;
	}

	return arr;
}
export class DualMap<K, V> {
	public map: Map<K, V>;
	public unmap: Map<V, K>;

	constructor(initial?: [K, V][]) {
		this.map = new Map();
		this.unmap = new Map();
		if (initial) {
			initial.forEach((item) => {
				this.map.set(item[0], item[1]);
				this.unmap.set(item[1], item[0]);
			});
		}
	}

	public keys(): IterableIterator<K> {
		return this.map.keys();
	}
	public values(): IterableIterator<V> {
		return this.map.values();
	}

	public set(key: K, value: V) {
		this.map.set(key, value);
		this.unmap.set(value, key);
	}

	public delete_key(key: K) {
		const old = this.map.get(key);
		this.map.delete(key);
		if (old) this.unmap.delete(old);
	}
	public delete_value(value: V) {
		const old = this.unmap.get(value);
		this.unmap.delete(value);
		if (old) this.map.delete(old);
	}
}

export namespace iterable {
	export function map<V, R>(target: Iterable<V>, fn: (value: V, index: number) => R): R[] {
		const res: R[] = [];
		let i: number = 0;
		for (const v of target) res.push(fn(v, i++));

		return res;
	}
	export function flatmap<V, R>(
		target: Iterable<V>,
		fn: (value: V, index: number) => Iterable<R>
	): R[] {
		const res: R[] = [];
		let i: number = 0;
		for (const v of target) res.push(...fn(v, i++));

		return res;
	}
	export function filter<V>(target: Iterable<V>, fn: (value: V, index: number) => boolean): V[] {
		const res: V[] = [];
		let i: number = 0;
		for (const v of target) {
			if (fn(v, i++)) res.push(v);
		}

		return res;
	}
}
export namespace map {
	export function map<K, V, R>(target: Map<K, V>, fn: (value: V, key: K, index: number) => R): R[] {
		const res: R[] = [];
		let i: number = 0;
		target.forEach((v, k) => res.push(fn(v, k, i++)));
		return res;
	}
	export function flatmap<K, V, R>(
		target: Map<K, V>,
		fn: (value: V, key: K, index: number) => Iterable<R>
	): R[] {
		const res: R[] = [];
		let i: number = 0;
		target.forEach((v, k) => res.push(...fn(v, k, i++)));
		return res;
	}
	export function filter<K, V>(
		target: Map<K, V>,
		fn: (key: K, value: V) => boolean,
		inplace?: boolean
	): Map<K, V> {
		const res: Map<K, V> = inplace ? target : new Map(target);

		const doomed: K[] = [];
		for (const [key, value] of res) if (!fn(key, value)) doomed.push(key);
		doomed.forEach((k) => res.delete(k));

		return res;
	}
}
