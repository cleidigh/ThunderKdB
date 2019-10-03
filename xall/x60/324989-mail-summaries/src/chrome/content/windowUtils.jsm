/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["WindowInjector"];

const Cc = Components.classes;
const Ci = Components.interfaces;

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
    let wm = Cc["@mozilla.org/appshell/window-mediator;1"]
               .getService(Ci.nsIWindowMediator);

    let enumerator = wm.getEnumerator(null);
    while (enumerator.hasMoreElements()) {
      let window = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow);
      this._setupWindow(window);
    }

    let self = this;
    this._listener = {
      onOpenWindow: function(xulWindow) {
        let window = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                              .getInterface(Ci.nsIDOMWindow);
        self._setupWindow(window);
      },
      onCloseWindow: function(xulWindow) {
        let window = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor)
                              .getInterface(Ci.nsIDOMWindow);
        self._forgetWindow(window);
      },
      onWindowTitleChange: function(xulWindow, title) {},
    };
    wm.addListener(this._listener);
  },

  stop: function() {
    let wm = Cc["@mozilla.org/appshell/window-mediator;1"]
               .getService(Ci.nsIWindowMediator);

    let enumerator = wm.getEnumerator(null);
    while (enumerator.hasMoreElements()) {
      let window = enumerator.getNext().QueryInterface(Ci.nsIDOMWindow);
      this._cleanupWindow(window);
    }

    wm.removeListener(this._listener);
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
