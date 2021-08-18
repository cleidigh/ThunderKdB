// Copyright (c) 2016, Jörg Knobloch. All rights reserved.

/* global ExtensionCommon */

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");

const EXTENSION_NAME = "jorgk@sender-frequency";
var extension = ExtensionParent.GlobalManager.getExtension(EXTENSION_NAME);

// Implements the functions defined in the experiments section of schema.json.
var SFreq = class extends ExtensionCommon.ExtensionAPI {
  onShutdown(isAppShutdown) {
    ExtensionSupport.unregisterWindowListener(EXTENSION_NAME);
    for (let win of Services.wm.getEnumerator("mail:3pane")) {
      unpaint(win);
    }
    if (isAppShutdown) return;
    // Looks like we got uninstalled. Maybe a new version will be installed now.
    // Due to new versions not taking effect (https://bugzilla.mozilla.org/show_bug.cgi?id=1634348)
    // we invalidate the startup cache. That's the same effect as starting with -purgecaches
    // (or deleting the startupCache directory from the profile).
    Services.obs.notifyObservers(null, "startupcache-invalidate");
  }

  getAPI(context) {
    return {
      SFreq: {
        addWindowListener(dummy) {
          // Adds a listener to detect new windows.
          ExtensionSupport.registerWindowListener(EXTENSION_NAME, {
            chromeURLs: ["chrome://messenger/content/messenger.xul",
              "chrome://messenger/content/messenger.xhtml"],
            onLoadWindow: paint,
            onUnloadWindow: unpaint,
          });
        },
      },
    };
  }
};

function paint(win) {
  win.SFreq = {};
  Services.scriptloader.loadSubScript(extension.getURL("customcol.js"), win.SFreq);
  win.SFreq.SFreqHdrView.init(win);
}

function unpaint(win) {
  win.SFreq.SFreqHdrView.destroy();
  delete win.SFreq;
}
