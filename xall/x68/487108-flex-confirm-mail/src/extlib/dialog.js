/*
# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/
'use strict';

export const TYPE_FETCH_PARAMS = 'dialog::fetch-params';
export const TYPE_RESPOND_PARAMS = 'dialog::respond-params';
export const TYPE_FETCH_WINDOW_ID = 'dialog::fetch-window-id';
export const TYPE_RESPOND_WINDOW_ID = 'dialog::respond-window-id';
export const TYPE_FETCH_TAB_ID = 'dialog::fetch-tab-id';
export const TYPE_RESPOND_TAB_ID = 'dialog::respond-tab-id';
export const TYPE_READY = 'dialog::ready';
export const TYPE_FOCUS = 'dialog::focus';
export const TYPE_MOVED = 'dialog::moved';
export const TYPE_ACCEPT = 'dialog::accept';
export const TYPE_CANCEL = 'dialog::cancel';

function generateId() {
  return `${Date.now()}-${Math.round(Math.random() * 65000)}`;
}

const DEFAULT_LOGGER = () => {};
let mLogger = DEFAULT_LOGGER;

export function setLogger(logger) {
  if (typeof logger == 'function')
    mLogger = (message, ...args) => logger(`[dialog] ${message}`, ...args);
  else
    mLogger = DEFAULT_LOGGER;
}


const DEFAULT_WIDTH_OFFSET  = 30; /* left window frame + right window frame + scrollbar (for failsafe) */
const DEFAULT_HEIGHT_OFFSET = 40; /* top title bar + bottom window frame */
let lastWidthOffset  = null;
let lastHeightOffset = null;

export async function open({ url, left, top, width, height, modal, opener } = {}, dialogContentsParams = {}) {
  const id = generateId();
  mLogger('open ', { id, url, left, top, width, height, modal, opener, dialogContentsParams });

  const extraParams = `dialog-id=${id}&dialog-offscreen=true`;
  if (url.includes('?'))
    url = url.replace(/\?/, `?${extraParams}&`);
  if (url.includes('#'))
    url = url.replace(/#/, `?${extraParams}#`);
  else
    url = `${url}?${extraParams}`;

  const widthGiven  = typeof width == 'number';
  const heightGiven = typeof height == 'number';
  const widthOffset  = lastWidthOffset === null ? DEFAULT_WIDTH_OFFSET : lastWidthOffset;
  const heightOffset = lastHeightOffset === null ? DEFAULT_HEIGHT_OFFSET : lastHeightOffset;

  if (!widthGiven || !heightGiven) {
    // step 1: render dialog in a hidden iframe to determine its content size
    const dialogContentSize = await new Promise((resolve, _reject) => {
      const loader = document.body.appendChild(document.createElement('iframe'));
      loader.addEventListener(
        'load',
        async () => {
          loader.contentDocument.documentElement.classList.add('offscreen');
          const onFetchParams = () => {
            mLogger(`onFetchParams at ${id}`);
            loader.contentDocument.dispatchEvent(new loader.contentWindow.CustomEvent(TYPE_RESPOND_PARAMS, {
              detail:     dialogContentsParams,
              bubbles:    true,
              cancelable: false,
              composed:   true
            }));
          };
          loader.contentDocument.addEventListener(TYPE_FETCH_PARAMS, onFetchParams);
          const [readyEvent, ] = await Promise.all([
            new Promise(resolveReady => loader.contentDocument.addEventListener(TYPE_READY, event => {
              loader.contentDocument.removeEventListener(TYPE_FETCH_PARAMS, onFetchParams);
              resolveReady(event);
            }, { once: true })),
            new Promise(resolveNextTick => setTimeout(resolveNextTick, 0))
          ]);
          const dialogContent = loader.contentDocument.querySelector('.dialog-content') || loader.contentDocument.body;
          const rect = dialogContent.getBoundingClientRect();
          resolve({
            ...readyEvent.detail,
            width:  rect.width,
            height: rect.height
          });
          loader.parentNode.removeChild(loader);
        },
        {
          once:    true,
          capture: true
        }
      );
      loader.src = url;
    });
    mLogger('dialogContentSize ', dialogContentSize);

    if (!widthGiven)
      width = dialogContentSize.width - widthOffset;

    if (!heightGiven)
      height = dialogContentSize.height - heightOffset;
  }

  if (opener) {
    if (typeof left != 'number' ||
        opener.left > left + width ||
        opener.left + opener.width < left) {
      left = Math.round(opener.left + ((opener.width - width) / 2));
      mLogger('left is updated to center of the opener window => ', left);
    }
    if (typeof top != 'number' ||
        opener.top > top + height ||
        opener.top + opener.height < top) {
      top = Math.round(opener.top + ((opener.height - height) / 2));
      mLogger('top is updated to center of the opener window => ', top);
    }
  }

  return new Promise(async (resolve, reject) => {
    let win; // eslint-disable-line prefer-const

    const onMessage = (message, _sender) => {
      if (!message || message.id != id)
        return;

      mLogger(`onMessage at ${id}`, message);
      switch (message.type) {
        case TYPE_FETCH_PARAMS:
          return Promise.resolve(dialogContentsParams);

        case TYPE_FETCH_WINDOW_ID:
          return Promise.resolve(win && win.id || browser.windows.WINDOW_ID_NONE);

        case TYPE_READY: {
          // step 3: shrink or expand the dialog window if the offset is changed
          lastWidthOffset  = message.windowWidthOffset;
          lastHeightOffset = message.windowHeightOffset;
          if ((!widthGiven && lastWidthOffset != widthOffset) ||
              (!heightGiven && lastHeightOffset != heightOffset)) {
            browser.windows.update(win.id, {
              width:  widthGiven ? width : Math.ceil(width + lastWidthOffset),
              height: heightGiven ? height : Math.ceil(height + lastHeightOffset)
            });
          }
          return Promise.resolve(win.id);
        }; break;

        case TYPE_ACCEPT:
          browser.runtime.onMessage.removeListener(onMessage);
          browser.windows.onRemoved.removeListener(onRemoved); // eslint-disable-line no-use-before-define
          browser.windows.remove(win.id);
          resolve(message);
          break;

        case TYPE_CANCEL:
          browser.runtime.onMessage.removeListener(onMessage);
          browser.windows.onRemoved.removeListener(onRemoved); // eslint-disable-line no-use-before-define
          browser.windows.remove(win.id);
          reject(message);
          break;
      }
    };
    browser.runtime.onMessage.addListener(onMessage);

    const onFocusChanged = windowId => {
      if (!win || windowId == win.id)
        return;

      mLogger(`onFocusChanged at ${id}: raise the window`);
      // setting "focused=true" fails on Thunderbird...
      //browser.windows.update(win.id, { focused: true });
      browser.runtime.sendMessage({
        type: TYPE_FOCUS,
        id
      });
    };
    if (modal)
      browser.windows.onFocusChanged.addListener(onFocusChanged);

    const onUpdated = (windowId, updateInfo) => {
      if (!win ||
          windowId != win.id)
        return;

      mLogger(`onUpdated at ${id} `, windowId, updateInfo);
      const left = updateInfo.left;
      const top = updateInfo.top;
      if (typeof left == 'number' ||
          typeof top == 'number') {
        if (typeof left == 'number')
          win.left = left;
        if (typeof top == 'number')
          win.top = top;
        mLogger(`window is moved: `, { left: win.left, top: win.top });
        browser.runtime.sendMessage({
          type: TYPE_MOVED,
          id,
          left: win.left,
          top:  win.top
        });
      }
    };

    const onRemoved = windowId => {
      if (!win || windowId != win.id)
        return;
      mLogger(`onRemoved on ${id}`);
      unregisterListeners(); // eslint-disable-line no-use-before-define
      browser.windows.remove(win.id);
      reject();
    };
    browser.windows.onRemoved.addListener(onRemoved);

    const unregisterListeners = () => {
      if (browser.runtime.onMessage.hasListener(onMessage))
        browser.runtime.onMessage.removeListener(onMessage);
      if (browser.windows.onRemoved.hasListener(onRemoved))
        browser.windows.onRemoved.removeListener(onRemoved);
      if (modal && browser.windows.onFocusChanged.hasListener(onFocusChanged))
        browser.windows.onFocusChanged.removeListener(onFocusChanged);
      if (browser.windows.onUpdated && browser.windows.onUpdated.hasListener(onUpdated))
        browser.windows.onUpdated.removeListener(onUpdated);
      if (onUpdated.timer) {
        window.clearInterval(onUpdated.timer);
        delete onUpdated.timer;
      }
    };

    if (browser.windows.onUpdated)
      browser.windows.onUpdated.addListener(onUpdated);
    else
      onUpdated.timer = setInterval(async () => {
        if (!win) { // the window is not opened yet
          mLogger(`Window is not opened yet`);
          return;
        }
        try {
          const updatedWin = await browser.windows.get(win.id);
          if (!updatedWin) {
            mLogger(`Window ${win.id} has already been closed`);
            unregisterListeners();
            return;
          }
          const updateInfo = {};
          if (updatedWin.left != win.left)
            updateInfo.left = updatedWin.left;
          if (updatedWin.top != win.top)
            updateInfo.top = updatedWin.top;
          mLogger(`Periodical check for onUpdated ${win.id}: ${JSON.stringify(updateInfo)}`); // output as a string to reduce needless log lines
          if (Object.keys(updateInfo) == 0)
            return;
          onUpdated(win.id, updateInfo);
        }
        catch(error) {
          mLogger('Failed to do periodical check for onUpdated: ', error);
          unregisterListeners();
        }
      }, 500);

    // step 2: open real dialog window
    const positionParams = {};
    if (typeof left == 'number')
      positionParams.left = left;
    if (typeof top == 'number')
      positionParams.top = top;
    win = await browser.windows.create({
      type:   'popup',
      url:    url.replace(/(dialog-offscreen)=true/, '$1=false'),
      width:  widthGiven ? width : Math.ceil(width + widthOffset),
      height: heightGiven ? height : Math.ceil(height + heightOffset),
      ...positionParams,
      allowScriptsToClose: true
    });
    // workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1271047
    browser.windows.get(win.id).then(openedWin => {
      if ((typeof left == 'number' && openedWin.left != left) ||
          (typeof top == 'number' && openedWin.top != top))
        browser.windows.update(win.id, { left, top });
    });
    // see also https://github.com/piroor/treestyletab/issues/2897
    browser.tabs.query({ active: true, windowId: win.id }).then(tabs => {
      browser.tabs.setZoom(tabs[0].id, 1);
    });

    if (!('windowId' in dialogContentsParams))
      dialogContentsParams.windowId = win.id;
  });
}

export async function openInTab({ url, windowId } = {}, dialogContentsParams = {}) {
  const id = generateId();
  mLogger('openInTab ', { id, url, windowId, dialogContentsParams });

  const extraParams = `dialog-id=${id}&dialog-type=tab`;
  if (url.includes('?'))
    url = url.replace(/\?/, `?${extraParams}&`);
  if (url.includes('#'))
    url = url.replace(/#/, `?${extraParams}#`);
  else
    url = `${url}?${extraParams}`;

  return new Promise(async (resolve, reject) => {
    let tab; // eslint-disable-line prefer-const

    const onMessage = (message, _sender) => {
      if (!message || message.id != id)
        return;

      mLogger(`onMessage at ${id}`, message);
      switch (message.type) {
        case TYPE_FETCH_PARAMS:
          return Promise.resolve(dialogContentsParams);

        case TYPE_FETCH_TAB_ID:
          return Promise.resolve(tab && tab.id || browser.tabs.TAB_ID_NONE);

        case TYPE_READY:
          return Promise.resolve(tab.id);

        case TYPE_ACCEPT:
          browser.runtime.onMessage.removeListener(onMessage);
          browser.tabs.onRemoved.removeListener(onRemoved); // eslint-disable-line no-use-before-define
          browser.tabs.remove(tab.id);
          resolve(message);
          break;

        case TYPE_CANCEL:
          browser.runtime.onMessage.removeListener(onMessage);
          browser.tabs.onRemoved.removeListener(onRemoved); // eslint-disable-line no-use-before-define
          browser.tabs.remove(tab.id);
          reject(message);
          break;
      }
    };
    browser.runtime.onMessage.addListener(onMessage);

    const onRemoved = tabId => {
      if (!tab || tabId != tab.id)
        return;
      mLogger(`onRemoved on ${id}`);
      unregisterListeners(); // eslint-disable-line no-use-before-define
      browser.tabs.remove(tab.id);
      reject();
    };
    browser.tabs.onRemoved.addListener(onRemoved);

    const unregisterListeners = () => {
      if (browser.runtime.onMessage.hasListener(onMessage))
        browser.runtime.onMessage.removeListener(onMessage);
      if (browser.tabs.onRemoved.hasListener(onRemoved))
        browser.tabs.onRemoved.removeListener(onRemoved);
    };

    const extraParams = {};
    if (windowId)
      extraParams.windowId = windowId;
    tab = await browser.tabs.create({
      url,
      ...extraParams,
    });
  });
}



// utilities for dialog itself

function getCurrentId() {
  const params = new URLSearchParams(location.search);
  return params.get('dialog-id');
}

export async function getParams() {
  const params = new URLSearchParams(location.search);
  const id = params.get('dialog-id');

  if (params.get('dialog-offscreen') != 'true')
    return browser.runtime.sendMessage({
      type: TYPE_FETCH_PARAMS,
      id
    });
  else
    return new Promise((resolve, _reject) => {
      document.addEventListener(TYPE_RESPOND_PARAMS, event => resolve(event.detail), { once: true });
      document.dispatchEvent(new CustomEvent(TYPE_FETCH_PARAMS, {
        detail:     null,
        bubbles:    true,
        cancelable: false,
        composed:   true
      }));
    });
}

export async function getWindowId() {
  const params = new URLSearchParams(location.search);
  const id = params.get('dialog-id');
  const type = params.get('dialog-type');
  if (params.get('dialog-offscreen') != 'true')
    return browser.runtime.sendMessage({
      type: type == 'tab' ? TYPE_FETCH_TAB_ID : TYPE_FETCH_WINDOW_ID,
      id
    });
  else
    return browser.windows.WINDOW_ID_NONE;
}

let mCurrentWindowId;

export async function notifyReady() {
  const params = new URLSearchParams(location.search);
  const id = params.get('dialog-id');
  const type = params.get('dialog-type');

  initDialogListener(id);

  if (type == 'tab') {
    document.documentElement.classList.add('ready');
    return;
  }

  const detail = {
    id,
    windowWidthOffset:  Math.max(0, window.outerWidth - window.innerWidth),
    windowHeightOffset: Math.max(0, window.outerHeight - window.innerHeight)
  };

  if (params.get('dialog-offscreen') != 'true')
    browser.runtime.sendMessage({
      type: TYPE_READY,
      ...detail
    }).then(windowId => mCurrentWindowId = windowId);
  else
    document.dispatchEvent(new CustomEvent(TYPE_READY, {
      detail,
      bubbles:    true,
      cancelable: false,
      composed:   true
    }));

  return new Promise(async (resolve, _rejet) => {
    const windowId = await getWindowId();
    if (windowId != browser.windows.WINDOW_ID_NONE) {
      // The window can be opened at outside of the visible area of the screen,
      // so we need to move the window inside the visible area.
      // This is a workaround for https://bugzilla.mozilla.org/show_bug.cgi?id=1271047
      const win = await browser.windows.get(windowId);
      const screen = window.screen;
      const safeLeft = Math.min(screen.availLeft + screen.availWidth - win.width, Math.max(screen.availLeft, win.left));
      const safeTop = Math.min(screen.availTop + screen.availHeight - win.height, Math.max(screen.availTop, win.top));
      if (safeLeft != win.left || safeTop != win.top)
        browser.windows.update(windowId, { left: safeLeft, top: safeTop });
    }

    setTimeout(() => {
      document.documentElement.classList.add('ready');
      resolve();
    }, 0);
  });
}

function initDialogListener(id) {
  const onMessage = (message, _sender) => {
    if (!message || message.id != id)
      return;

    switch (message.type) {
      case TYPE_FOCUS:
        window.focus();
        break;

      case TYPE_MOVED:
        document.dispatchEvent(new CustomEvent(TYPE_MOVED, {
          detail: {
            left: message.left,
            top:  message.top
          },
          bubbles:    true,
          cancelable: false,
          composed:   true
        }));
        break;
    }
  };
  browser.runtime.onMessage.addListener(onMessage);

  const onRemoved = windowId => {
    if (!mCurrentWindowId ||
        windowId != mCurrentWindowId)
      return;
    browser.runtime.onMessage.removeListener(onMessage);
    browser.windows.onRemoved.removeListener(onRemoved);
  };
  browser.windows.onRemoved.addListener(onRemoved);

  // cancel page transition
  window.addEventListener('submit', event => {
    event.preventDefault();
  });
}

let mSizeToContentTimer;
export function sizeToContent() {
  if (!mCurrentWindowId)
    return;

  if (mSizeToContentTimer)
    clearTimeout(mSizeToContentTimer);
  mSizeToContentTimer = setTimeout(async () => {
    const box = document.querySelector('#form > *:first-child');
    const range = document.createRange();
    range.selectNodeContents(box);
    const delta = range.getBoundingClientRect().height - box.getBoundingClientRect().height;
    range.detach();

    const win = await browser.windows.get(mCurrentWindowId);
    browser.windows.update(mCurrentWindowId, { height: Math.round(win.height + delta) });

    mSizeToContentTimer = null;
  }, 100);
}

export function accept(detail = null) {
  browser.runtime.sendMessage({
    type: TYPE_ACCEPT,
    id:   getCurrentId(),
    detail
  });
}

export function cancel() {
  browser.runtime.sendMessage({
    type: TYPE_CANCEL,
    id:   getCurrentId()
  });
}

export function initButton(button, onCommand) {
  button.addEventListener('click', event => {
    if (event.button == 0 &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey)
      onCommand(event);
  });
  button.addEventListener('keyup', event => {
    if (event.key == 'Enter' &&
        !event.altKey &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey)
      onCommand(event);
  });
}

export function initAcceptButton(button, onCommand) {
  initButton(button, async event => {
    accept(typeof onCommand == 'function' ? (await onCommand(event)) : null);
  });
}

export function initCancelButton(button) {
  initButton(button, _event => {
    cancel();
  });
}


const FOCUSIBLE_ITEMS_SELECTOR = 'input:not([type="hidden"]), button, textarea, select, :link';

export class InPageDialog {
  constructor() {
    const range = document.createRange();
    range.selectNodeContents(document.body || document.documentElement);
    range.collapse(false);

    const fragment = range.createContextualFragment(`
      <div class="in-page-dialog dialog-container">
        <div class="in-page-dialog dialog">
          <div class="in-page-dialog dialog-contents"></div>
          <div class="in-page-dialog dialog-buttons"></div>
        </div>
      </div>
    `.trim());
    this.container = fragment.firstChild;
    this.contents = this.container.querySelector('.dialog-contents');
    this.buttons = this.container.querySelector('.dialog-buttons');

    range.insertNode(fragment);
    range.detach();
  }

  show() {
    this.$lastFocusedField = document.querySelector(':focus');

    for (const field of document.querySelectorAll(FOCUSIBLE_ITEMS_SELECTOR)) {
      if (this.container.contains(field))
        field.tabIndex = 0;
      else
        field.tabIndex = -1;
    }
    this.container.classList.add('shown');

    // move focus to the first input field
    this.container.querySelector(FOCUSIBLE_ITEMS_SELECTOR).focus();
  }

  hide() {
    for (const field of document.querySelectorAll(FOCUSIBLE_ITEMS_SELECTOR)) {
      if (this.container.contains(field))
        field.tabIndex = -1;
      else
        field.tabIndex = 0;
    }
    this.container.classList.remove('shown');

    if (this.$lastFocusedField &&
        this.$lastFocusedField.parentNode &&
        !this.container.contains(this.$lastFocusedField))
      this.$lastFocusedField.focus();
    this.$lastFocusedField = null;
  }
}
