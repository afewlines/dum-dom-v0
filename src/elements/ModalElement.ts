// Copyright 2024 Brad Soellner
// SPDX-License-Identifier: Apache-2.0

import { gsap } from 'gsap'; // __dum_omit
import { get_element } from '../utils/Core';
import styles from '../styling/modal.module.scss';

// reexport css module classes
// TODO do i really want to use css modules?
export const modal_classes = styles;

// ELEMENT FUNCTION
//
type ModalElementInitFn = (elements: ModalElements) => void;
export interface ModalElementOpts {
	parent?: Element | string;
	message?: string;
	init_fn?: ModalElementInitFn;
	transitions?: ModalElementTransitions;
}
export interface ModalElementTransitions {
	enter?: (els: ModalElements, tl: gsap.core.Timeline) => void;
	leave?: (els: ModalElements, tl: gsap.core.Timeline) => void;
}
export interface ModalElements {
	bucket: HTMLElement;
	box: HTMLElement;
	message: HTMLElement;
	button: HTMLElement;
}
export class ModalElement {
	public parent?: Element;

	public message: string;

	protected init_fn?: ModalElementInitFn;
	protected transitions?: ModalElementTransitions;

	protected _elements: ModalElements;
	protected _timeline?: gsap.core.Timeline;

	constructor(opts: ModalElementOpts) {
		this.parent = opts.parent ? get_element(opts.parent) : undefined;
		this.message = opts.message ?? '';
		this.init_fn = opts.init_fn;
		this.transitions = opts.transitions;

		// set up element
		const bucket = document.createElement('div');
		bucket.classList.add(styles.modal, styles.bkg);

		const box = document.createElement('div');
		box.classList.add(styles.box);
		bucket.appendChild(box);

		const message = document.createElement('div');
		message.classList.add('message');
		box.appendChild(message);

		const button = document.createElement('div');
		button.classList.add('button');
		button.innerHTML = 'OK';
		button.addEventListener('click', () => this.hide());
		box.appendChild(button);

		this._elements = {
			bucket: bucket,
			box: box,
			message: message,
			button: button,
		};

		this.init_fn?.(this._elements);
	}

	public show(new_message?: string): void {
		if (new_message) this.message = new_message;
		this._elements.message.innerHTML = this.message;

		const tl = (this._timeline = gsap.timeline({ autoRemoveChildren: true }));
		tl.call(() => {
			// attach to body if no parent
			if (this.parent) this.parent.appendChild(this._elements.bucket);
			else document.body.appendChild(this._elements.bucket);
		});
		this.transitions?.enter?.(this._elements, tl);
		tl.call(() => {
			this._timeline = undefined;
		});
		tl.play();
	}
	public hide(): void {
		const tl = this._timeline?.isActive()
			? this._timeline
			: (this._timeline = gsap.timeline({ autoRemoveChildren: true }));

		// add leave transition
		this.transitions?.leave?.(this._elements, tl);

		// actually remove element
		tl.call(() => {
			this._elements.bucket.remove();
		});
	}
}
