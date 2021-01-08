/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

/**
 * Load overlays in a similar way as XUL did for non-bootstrapped addons
 * Unlike "real" XUL, overlays are only loaded over window URLs, and no longer
 * over any xul file that is loaded somewhere.
 *
 *
 * Prepare the XUL files:
 *
 * 1. Elements can be referenced by ID, or by CSS selector (document.querySelector()).
 *    To use the a CSS Selector query, define the attribute "overlay_target"
 *    e.g. <vbox overlay_target=".test>...</vbox>
 *
 * 2. define CSS the same way as you would in HTML, i.e.:
 *      <link rel="stylesheet" type="text/css" href="chrome://some/cssFile.css"/>
 *
 * 3. inline scripts are not supported
 *
 * 4. if you add buttons to a toolbar using <toolbarpalette/> in your XUL, add the
 *    following attributes to the toolbarpalette:
 *      targetToolbox="some_id"   --> the ID of the *toolbox* where the buttons are added
 *      targetToolbar="some_id"   --> the ID of the *toolbar* where the buttons are added
 *
 * Prepare the JavaScript:
 * 1. Event listeners registering for "load" now need to listen to "load-"+MY_ADDON_ID
 */

"use strict";

var EXPORTED_SYMBOLS = ["EnigmailOverlays"];

const APP_STARTUP = 1;
const APP_SHUTDOWN = 2;

const {
  Services
} = ChromeUtils.import("resource://gre/modules/Services.jsm", {});

Components.utils.importGlobalProperties(["XMLHttpRequest"]);

// the following constants need to be customized for each addon
const BASE_PATH = "chrome://enigmail/content/ui/";
const MY_ADDON_ID = "enigmail";

var gMailStartupDone = false;
var gCoreStartup = false;

const overlays = {
  // main mail reading window
  "chrome://messenger/content/messenger.xul": [
    "enigmailMessengerOverlay.xhtml"
  ],
  "chrome://messenger/content/messenger.xhtml": [
    "enigmailMessengerOverlay.xhtml"
  ]
};

const EnigmailLog = ChromeUtils.import("chrome://enigmail/content/modules/log.jsm").EnigmailLog;
const Overlays = ChromeUtils.import("chrome://enigmail/content/modules/overlays.jsm").Overlays;

function DEBUG_LOG(str) {
  EnigmailLog.DEBUG(str);
}

function ERROR_LOG(str) {
  EnigmailLog.ERROR(str);
}

var WindowListener = {
  setupUI: function(window, overlayDefs) {
    DEBUG_LOG("enigmailOverlays.jsm: setupUI(" + window.document.location.href + ")\n");
    let ovl = [];

    for (let index = 0; index < overlayDefs.length; index++) {
      let overlayDef = overlayDefs[index];
      let url = overlayDef;

      if (typeof(overlayDef) !== "string") {
        url = overlayDef.url;
        if ("application" in overlayDef) {
          if (overlayDef.application.substr(0, 1) === "!") {
            if (overlayDef.application.indexOf(getAppId()) > 0) {
              continue;
            }
          }
          else if (overlayDef.application.indexOf(getAppId()) < 0) {
            continue;
          }
        }

        if ("minGeckoVersion" in overlayDef) {
          if (!isPlatformMinVersion(overlayDef.minGeckoVersion)) {
            continue;
          }
        }

        if ("maxGeckoVersion" in overlayDef) {
          if (!isPlatformMaxVersion(overlayDef.maxGeckoVersion)) {
            continue;
          }
        }
      }

      ovl.push(BASE_PATH + url);
    }

    Overlays.loadOverlays(MY_ADDON_ID, window, ovl);
  },

  tearDownUI: function(window) {
    DEBUG_LOG("enigmailOverlays.jsm: tearDownUI(" + window.document.location.href + ")\n");
    Overlays.unloadOverlays(MY_ADDON_ID, window);
  },

  // nsIWindowMediatorListener functions
  onOpenWindow: function(xulWindow) {
    // A new window has opened
    let domWindow = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);

    // Wait for it to finish loading
    domWindow.addEventListener("load", function listener() {
      domWindow.removeEventListener("load", listener, false);

      for (let w in overlays) {
        // If this is a relevant window then setup its UI
        if (domWindow.document.location.href.startsWith(w))
          WindowListener.setupUI(domWindow, overlays[w]);
      }
    }, false);
  },

  onCloseWindow: function(xulWindow) {},

  onWindowTitleChange: function(xulWindow, newTitle) {}
};

/**
 * Determine if an overlay exists for a window, and if so
 * load it
 */

function loadUiForWindow(domWindow) {
  for (let w in overlays) {
    // If this is a relevant window then setup its UI
    if (domWindow.document.location.href.startsWith(w))
      WindowListener.setupUI(domWindow, overlays[w]);
  }
}


var EnigmailOverlays = {
  /**
   * Called by bootstrap.js upon startup of the addon
   * (e.g. enabling, instalation, update, application startup)
   *
   */
  startup: function() {
    DEBUG_LOG("enigmailOverlays.jsm: startup()\n");

    let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

    // Wait for any new windows to open
    wm.addListener(WindowListener);

    let windows = wm.getEnumerator(null);
    while (windows.hasMoreElements()) {
      try {
        let domWindow = windows.getNext();
        try {
          domWindow = domWindow.QueryInterface(Ci.nsIDOMWindow);
        }
        catch (x) {}

        DEBUG_LOG("enigmailOverlays.jsm: startup: found window: " + domWindow.document.location.href + "\n");

        if (domWindow.document.location.href === "about:blank" ||
          domWindow.document.readyState !== "complete") {
          // a window is available, but it's not yet fully loaded
          // ==> add an event listener to fire when the window is completely loaded

          domWindow.addEventListener("load", function loadUi() {
            domWindow.removeEventListener("load", loadUi, false);
            loadUiForWindow(domWindow);
          }, false);
        }
        else {
          loadUiForWindow(domWindow);
        }
      }
      catch (ex) {
        DEBUG_LOG("enigmailOverlays.jsm: startup: error " + ex.message + "\n");
      }
    }
  },


  /**
   * Called by bootstrap.js upon shutdown of the addon
   * (e.g. disabling, uninstalling, update, application shutdown)
   *
   * @param reason: Number - bootstrap "reason" constant
   */
  shutdown: function(reason) {
    DEBUG_LOG("overlay.jsm: initiating shutdown\n");
    // When the application is shutting down we normally don't have to clean
    // up any UI changes made
    if (reason == APP_SHUTDOWN)
      return;

    let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

    // Stop listening for any new windows to open
    wm.removeListener(WindowListener);

    // Get the list of windows already open
    let windows = wm.getEnumerator(null);
    while (windows.hasMoreElements()) {
      let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);

      WindowListener.tearDownUI(domWindow);

      // If this is a window opened by the addon, then close it
      if (domWindow.document.location.href.startsWith(BASE_PATH))
        domWindow.close();
    }

    DEBUG_LOG("overlay.jsm: shutdown complete\n");
  }

};

function getAppId() {
  return Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo).ID;
}

function isPlatformMinVersion(requestedVersion) {
  let vc = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);
  let appVer = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo).platformVersion;

  return vc.compare(appVer, requestedVersion) >= 0;
}

function isPlatformMaxVersion(requestedVersion) {
  let vc = Cc["@mozilla.org/xpcom/version-comparator;1"].getService(Ci.nsIVersionComparator);
  let appVer = Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo).platformVersion;

  return vc.compare(appVer, requestedVersion) <= 0;
}
