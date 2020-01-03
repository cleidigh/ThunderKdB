/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["WindowInjector"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

function WindowInjector(windowType, installCallback, uninstallCallback) {
  this.windowType = windowType;
  this.installCallback = installCallback;
  this.uninstallCallback = uninstallCallback;
  this._windowMap = new WeakMap();
}

WindowInjector.prototype = {
  _listener: null,

  isWindowRelevant: function(window) {
    let windowType = window.document.documentElement.getAttribute("windowtype");
    return windowType === this.windowType;
  },

  start: function() {
    let enumerator = Services.wm.getEnumerator(null);
    while (enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      this._setupWindow(window);
    }

    let self = this;
    this._listener = {
      onOpenWindow: function(xulWindow) {
        self._setupWindow(xulWindow.docShell.domWindow);
      },
      onCloseWindow: function(xulWindow) {
        self._forgetWindow(xulWindow.docShell.domWindow);
      },
      onWindowTitleChange: function(xulWindow, title) {},
    };
    Services.wm.addListener(this._listener);
  },

  stop: function() {
    let enumerator = Services.wm.getEnumerator(null);
    while (enumerator.hasMoreElements()) {
      let window = enumerator.getNext();
      this._cleanupWindow(window);
    }

    Services.wm.removeListener(this._listener);
  },

  _setupWindow: function(window) {
    let doSetup = (window) => {
      if (this.isWindowRelevant(window))
        this._windowMap.set(window, this.installCallback(window));
    };

    if (window.document.readyState == "complete") {
      doSetup(window);
    }
    else {
      window.addEventListener("load", function onload() {
        window.removeEventListener("load", onload);
        doSetup(window);
      });
    }
  },

  _cleanupWindow: function(window) {
    if (this.isWindowRelevant(window))
      this.uninstallCallback(window, this._windowMap.get(window));
  },

  _forgetWindow: function(window) {
    this._windowMap.delete(window);
  },
};
