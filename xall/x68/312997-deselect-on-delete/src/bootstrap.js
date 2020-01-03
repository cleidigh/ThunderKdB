/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");

function DeletionListener(targetWindow) {
  this.targetWindow = targetWindow;
}

DeletionListener.prototype = {
  onMessagesRemoved: function(display) {
    // Override the next view index, but only if 1) the view gave us an index,
    // and 2) if we didn't right-click another message to delete it; otherwise,
    // we need to let the view handle this itself. If we try to override the
    // view index all the time, deleting a message will cause all tabs to close,
    // since we're telling the display to select an invalid row for all tabs.
    // Likewise, if we were right-clicking another message to delete it, we want
    // Thunderbird to do its usual thing (reselect the old message).
    if (display._nextViewIndexAfterDelete !== null &&
        this.targetWindow.gRightMouseButtonSavedSelection === null) {
      // -1 here will trick the folder display into thinking we're prepared to
      // select another message, but will bail out when we actually try to
      // select it.
      display._nextViewIndexAfterDelete = -1;
    }
  },
};

var deletionListeners = new WeakMap();

function isWindowRelevant(win) {
  let windowtype = win.document.documentElement.getAttribute("windowtype");
  return windowtype === "mail:3pane";
}

function setupWindow(win) {
  let doSetup = (win) => {
    if (isWindowRelevant(win)) {
      let listener = new DeletionListener(win);
      deletionListeners.set(win, listener);
      win.FolderDisplayListenerManager.registerListener(listener);
    }
  };

  if (win.document.readyState == "complete") {
    doSetup(win);
  } else {
    win.addEventListener("load", function onload() {
      win.removeEventListener("load", onload);
      doSetup(win);
    });
  }
}

function cleanupWindow(win) {
  if (!isWindowRelevant(win))
    return;

  let listener = deletionListeners.get(win);
  win.FolderDisplayListenerManager.unregisterListener(listener);
}

// Boilerplate to listen for when to set up and tear down our add-on in the
// application's windows.

var windowListener = {
  onOpenWindow: function(xulWindow) {
    let win = xulWindow.docShell.domWindow;
    setupWindow(win);
  },
  onCloseWindow: function(win) {},
  onWindowTitleChange: function(win, title) {},
};

function startup(data, reason) {
  let enumerator = Services.wm.getEnumerator(null);
  while (enumerator.hasMoreElements()) {
    let win = enumerator.getNext();
    setupWindow(win);
  }

  Services.wm.addListener(windowListener);
}

function shutdown(data, reason) {
  // Don't bother doing anything when the application is exiting.
  if (reason === APP_SHUTDOWN)
    return;

  let enumerator = Services.wm.getEnumerator(null);
  while (enumerator.hasMoreElements()) {
    let win = enumerator.getNext();
    cleanupWindow(win);
  }

  Services.wm.removeListener(windowListener);
}

function install(data, reason) {}
function uninstall(data, reason) {}
