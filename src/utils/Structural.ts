export function iter_map<V, R>(target: Iterable<V>, fn: (value: V, index: number) => R): R[] {
	const res: R[] = [];
	let i: number = 0;
	for (const v of target) res.push(fn(v, i++));

	return res;
}
export function iter_flatmap<V, R>(
	target: Iterable<V>,
	fn: (value: V, index: number) => Iterable<R>
): R[] {
	const res: R[] = [];
	let i: number = 0;
	for (const v of target) res.push(...fn(v, i++));

	return res;
}
export function iter_filter<V>(target: Iterable<V>, fn: (value: V, index: number) => boolean): V[] {
	const res: V[] = [];
	let i: number = 0;
	for (const v of target) {
		if (fn(v, i++)) res.push(v);
	}

	return res;
}
export function map_map<K, V, R>(
	target: Map<K, V>,
	fn: (value: V, key: K, index: number) => R
): R[] {
	const res: R[] = [];
	let i: number = 0;
	target.forEach((v, k) => res.push(fn(v, k, i++)));
	return res;
}
export function map_flatmap<K, V, R>(
	target: Map<K, V>,
	fn: (value: V, key: K, index: number) => Iterable<R>
): R[] {
	const res: R[] = [];
	let i: number = 0;
	target.forEach((v, k) => res.push(...fn(v, k, i++)));
	return res;
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
