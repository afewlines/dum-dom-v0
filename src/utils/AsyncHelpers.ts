// frame
export async function wait_frame(): Promise<unknown> {
	return await new Promise((res) => requestAnimationFrame(res));
}
export async function on_next_frame<R>(fn: () => R | Promise<R>): Promise<R> {
	await new Promise((res) => requestAnimationFrame(res));
	return await fn();
}
// timeout
export async function wait_timeout(duration: number): Promise<unknown> {
	return await new Promise((res) => setTimeout(res, duration));
}
export async function on_timeout<R>(fn: () => R | Promise<R>, duration: number): Promise<R> {
	await new Promise((res) => setTimeout(res, duration));
	return await fn();
}
