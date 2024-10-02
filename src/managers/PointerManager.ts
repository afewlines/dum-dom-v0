// Copyright 2024 Brad Soellner
// SPDX-License-Identifier: Apache-2.0

type PointerEventMap =
	| 'pointercancel'
	| 'pointerdown'
	| 'pointerenter'
	| 'pointerleave'
	| 'pointermove'
	| 'pointerout'
	| 'pointerover'
	| 'pointerup';

export type PointerEventCallbacks = {
	[mode in keyof PointerEventMap]?: number;
};
export class PointerEventManager {}

export class TouchEventManager {}
