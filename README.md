# dum-dom v0

> "_dum-dom... is giving me his cache_." - K. Krule, 2017

A dum way to interact with the HTML DOM.

This framework is designed to offer control over the DOM on both micro and macro scales, accomplished by eschewing reactivity and other takes-control-away-from design patterns.

**Looking for a dum web project packer?** Let me introduce you to my associate, [dum-packer](http://github.com/afewlines/dum-packer-v0).

**This repository is still way deep in development. Anything and everything is liable to change depending on my wants and whims.**

## Features

- **No Reactivity:** All these frameworks trying to worm their grubby little bloated fingers into my sweet, sweet code... Back off.
- **Element Managers:** Want to display an array of data? Done. Want to change scenes in a customizable and transparent way? Sorted. Want to move a bunch of elements with various transforms between parents? Bish, bash, bosh.
- **Bespoke Elements:** Troublesome variables triggering reactivity too often? Setups required for tightly-interactive `input` elements getting you down? Overbearing frameworks forcing you to make **bad code** because they want to hold your hand like a clingy middle-school boyfriend? Fear not, because now that responsiblity is on _your_ shoulders!
- **Adaptive Single Page Routing:** Whether you're working on a offline `file://` served app or a sprawling Taj Mahal-esq website, relax and unwind with our snappy routing provider and complete control over your content.
- **Stateful Transitions:** To be entirely transparent, the inception of this project was when I wanted more control over move transitions in Vue + to move elements between parents. I realized it was a juicy little problem and... here we are.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
  - [Elements](#elements)
  - [Managers](#managers)
  - [Utilities](#utilities)
- [Roadmap](#roadmap)
- [License](#license)

# Installation

While the project is still in v0, your best call is to clone this repo, build it with `npm install && npm run build`, then install it in the consuming project with `npm install [path to cloned repo directory]`.

# Usage

I'll be adding a proper example that shows a project using dum-dom, dum-packer, and esbuild. Just... not yet.

**Note:** Code is split, so import from closer-to-the-source to reduce irrelevant code.
For example, `import * as MasterManager from 'dum-dom/managers/MasterManager'` is better than `import { MasterManager } from 'dum-dom'` as the `dum-dom` endpoint references _everything_.

## Elements

**FunctionElement:** Element with an `.update()`.

**InputElement:** Input element with easy-access event hooks.

**ModalElement:** Customizable pop-up element.

**TextElement:** Element with a `value` property that controls the element's text content.

**ToggleElement:** Element which can be toggled in/out of the DOM.

## Managers

**ArrayManager:** Manage multiple elements in one container for each element in a given array.

**MasterManager:** Manage multiple elements across an entire page.

**SceneManager:** Display one of the provided 'scene' elements.

## Utilities

**AsyncHelpers:** Mostly pointless except to avoid some of the scoping issues with asyncs.

**CustomElement:** Custom HTML element creation, registration, and managment system.

**DumRouter:** Web/local single-page application router.

# Roadmap

Make more and better. Then improve the more until it's better, too.

> _Translation: I have no plan._

# License

Apache 2.0
