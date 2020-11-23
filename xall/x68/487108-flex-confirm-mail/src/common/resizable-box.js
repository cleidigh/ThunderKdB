/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

export const TYPE_RESIZED = 'resizable-box-resized';
const MIN_HEIGHT = '1em';

let mSizes;

let mResizableBoxCount = 0;

const mResizableBoxes = new Map();

export function init(sizes) {
  mSizes = (sizes && typeof sizes == 'object') ? sizes : {};

  for (const splitter of document.querySelectorAll('hr.splitter')) {
    const previousBox = findPreviousResizableBox(splitter);
    const nextBox = findNextResizableBox(splitter);

    if (!previousBox ||
        !nextBox)
      continue;

    splitter.previousBox = previousBox;
    splitter.nextBox = nextBox;

    if (!previousBox.id)
      previousBox.id = `resizable-box-${mResizableBoxCount++}`;
    if (!nextBox.id)
      nextBox.id = `resizable-box-${mResizableBoxCount++}`;

    mResizableBoxes.set(previousBox.id, previousBox);
    mResizableBoxes.set(nextBox.id, nextBox);
    splitter.addEventListener('mousedown', onMouseDown);
    splitter.addEventListener('mouseup', onMouseUp);
  }

  for (const id of Object.keys(mSizes)) {
    const size = mSizes[id];
    const box = mResizableBoxes.get(id);
    if (!box || typeof size != 'number')
      continue;
    setBoxHeight(box, size);
  }
}

function findPreviousResizableBox(splitter) {
  let box = splitter.previousElementSibling;
  do {
    const style = window.getComputedStyle(box, null);
    if (style.display != 'none' &&
        style.visibility != 'collapse')
      break;;
    box = box.previousElementSibling;
  } while (box);
  return box;
}

function findNextResizableBox(splitter) {
  let box = splitter.nextElementSibling;
  do {
    const style = window.getComputedStyle(box, null);
    if (style.display != 'none' &&
        style.visibility != 'collapse')
      break;;
    box = box.nextElementSibling;
  } while (box);
  return box;
}

function setBoxHeight(box, height) {
  box.style.height = height >= 0 ? `${height}px` : MIN_HEIGHT;
}

let mStartY;
let mStartPreviousHeight;
let mStartNextHeight;
let mResizingSplitter;

function onMouseDown(event) {
  mResizingSplitter = event.currentTarget;
  mStartY = event.screenY;
  mStartPreviousHeight = mResizingSplitter.previousBox.offsetHeight;
  mStartNextHeight = mResizingSplitter.nextBox.offsetHeight;
  mResizingSplitter.setCapture(false);
  window.addEventListener('mousemove', onResizing);
}

function resizeBoxesFor(splitter, event) {
  const delta = event.screenY - mStartY;
  setBoxHeight(splitter.previousBox, mStartPreviousHeight + delta);
  setBoxHeight(splitter.nextBox, mStartNextHeight - delta);
  for (const box of mResizableBoxes.values()) {
    if (box != splitter.previousBox &&
        box != splitter.nextBox) {
      setBoxHeight(box, box.offsetHeight);
    }
    mSizes[box.id] = box.offsetHeight;
  }
  return { ...mSizes };
}

let mThrottledResize;

function onMouseUp(event) {
  if (mThrottledResize) {
    clearTimeout(mThrottledResize);
    mThrottledResize = null;
  }
  const resizeResult = resizeBoxesFor(mResizingSplitter, event);
  document.releaseCapture();
  window.removeEventListener('mousemove', onResizing);
  mStartY = null;
  mStartPreviousHeight = null;
  mStartNextHeight = null;
  mResizingSplitter = null;
  event.currentTarget.dispatchEvent(new CustomEvent(TYPE_RESIZED, {
    detail:     resizeResult,
    bubbles:    true,
    cancelable: false,
    composed:   true
  }));
}

function onResizing(event) {
  if (mThrottledResize)
    clearTimeout(mThrottledResize);
  mThrottledResize = setTimeout(() => {
    mThrottledResize = null;
    resizeBoxesFor(mResizingSplitter, event);
  }, 25);
}
