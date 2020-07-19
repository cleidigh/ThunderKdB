// This Source Code Form is subject to the terms of the
// GNU General Public License, version 3.0.

"use strict";
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { ExtensionSupport } = ChromeUtils.import('resource:///modules/ExtensionSupport.jsm');
var { ExtensionParent } = ChromeUtils.import('resource://gre/modules/ExtensionParent.jsm');

const EXTENSION_NAME = "lightningcalendartabs@jlx.84";
var extension = ExtensionParent.GlobalManager.getExtension(EXTENSION_NAME);

function loadStylesheets(styleSheets) {
  // Load stylesheets
  const styleSheetService = Cc["@mozilla.org/content/style-sheet-service;1"]
    .getService(Ci.nsIStyleSheetService);
  for (let i = 0, len = styleSheets.length; i < len; i++) {
    const styleSheetURI = Services.io.newURI(styleSheets[i]);
    styleSheetService.loadAndRegisterSheet(styleSheetURI, styleSheetService.AUTHOR_SHEET);
  }
}

// Implements the functions defined in the experiments section of schema.json.
var lightningcalendartabs = class extends ExtensionCommon.ExtensionAPI {
  onStartup() {
    const aomStartup = Cc["@mozilla.org/addons/addon-manager-startup;1"]
      .getService(Ci.amIAddonManagerStartup);
    const manifestURI = Services.io.newURI("manifest.json", null, this.extension.rootURI);
    this.chromeHandle = aomStartup.registerChrome(manifestURI, [["content", "lightningcalendartabs", "chrome/content/"]]);
  }

  onShutdown(isAppShutdown) {
    if (isAppShutdown) return;
    this.chromeHandle.destruct();
    this.chromeHandle = null;
    // Looks like we got uninstalled. Maybe a new version will be installed now.
    // Due to new versions not taking effect (https://bugzilla.mozilla.org/show_bug.cgi?id=1634348)
    // we invalidate the startup cache. That's the same effect as starting with -purgecaches
    // (or deleting the startupCache directory from the profile).
    Services.obs.notifyObservers(null, "startupcache-invalidate");
  }

  getAPI(context) {
    context.callOnClose(this);
    return {
      lightningcalendartabs: {
        addWindowListener(dummy) {
          const styleSheets = [extension.getURL("chrome/skin/tabs.css")];
          loadStylesheets(styleSheets);

          let defaultsBranch = Services.prefs.getDefaultBranch("extensions.lightningcalendartabs.tabs.");
          defaultsBranch.setBoolPref("months.enabled", true);
          defaultsBranch.setIntPref ("months.future", 6);
          defaultsBranch.setIntPref ("months.past", 3);

          defaultsBranch.setBoolPref("multiweeks.enabled", true);
          defaultsBranch.setIntPref ("multiweeks.future", 2);
          defaultsBranch.setIntPref ("multiweeks.past", 1);

          defaultsBranch.setBoolPref("weeks.enabled", true);
          defaultsBranch.setIntPref ("weeks.future", 2);
          defaultsBranch.setIntPref ("weeks.past", 1);

          defaultsBranch.setBoolPref("days.enabled", true);
          defaultsBranch.setIntPref ("days.future", 7);
          defaultsBranch.setIntPref ("days.past", 2);

          defaultsBranch.setStringPref("text_color_current", "#000000");
          defaultsBranch.setStringPref("text_color_past", "#666666");
          defaultsBranch.setStringPref("text_color_future", "#000000");

          defaultsBranch.setStringPref("text_color_new_period", "#000000");
          defaultsBranch.setBoolPref("show_other_tab", true);

          // Adds a listener to detect new windows.
          ExtensionSupport.registerWindowListener(EXTENSION_NAME, {
            chromeURLs: ["chrome://messenger/content/messenger.xul",
                         "chrome://messenger/content/messenger.xhtml"],
            onLoadWindow: paint,
            onUnloadWindow: unpaint,
          });
        }
      }
    }
  }

  close() {
    ExtensionSupport.unregisterWindowListener(EXTENSION_NAME);
    for (let win of Services.wm.getEnumerator("mail:3pane")) {
      unpaint(win);
    }
  }
};

function paint(win) {
  let xul = win.MozXULElement.parseXULToFragment(`
    <menuitem id="menu_LCT_options"
              oncommand="openDialog('chrome://lightningcalendartabs/content/options.xhtml', '_blank', 'chrome,centerscreen,titlebar,resizable', null);"
              label="LCT Options"
              class="menuitem-iconic"/>
  `);
  let ltnShowUnifinder = win.document.getElementById("ltnShowUnifinder");
  ltnShowUnifinder.parentNode.append(xul);

  win.lightningcalendartabs = {};
  Services.scriptloader.loadSubScript(extension.getURL("chrome/content/tabs.js"), win.lightningcalendartabs);
  Services.scriptloader.loadSubScript(extension.getURL("chrome/content/tabs_utils.js"), win.lightningcalendartabs);
  Services.scriptloader.loadSubScript(extension.getURL("chrome/content/month_tabs.js"), win.lightningcalendartabs);
  Services.scriptloader.loadSubScript(extension.getURL("chrome/content/week_tabs.js"), win.lightningcalendartabs);
  Services.scriptloader.loadSubScript(extension.getURL("chrome/content/multiweek_tabs.js"), win.lightningcalendartabs);
  Services.scriptloader.loadSubScript(extension.getURL("chrome/content/day_tabs.js"), win.lightningcalendartabs);
  Services.scriptloader.loadSubScript(extension.getURL("chrome/content/pref_observer.js"), win.lightningcalendartabs);
  Services.scriptloader.loadSubScript(extension.getURL("chrome/content/main.js"), win.lightningcalendartabs);
  win.lightningcalendartabs.LightningCalendarTabs.init(win);
}

function unpaint(win) {
  let LCTOptions = win.document.getElementById("menu_LCT_options");
  if (LCTOptions) LCTOptions.remove();
  win.lightningcalendartabs.LightningCalendarTabs.cleanup();
  delete win.lightningcalendartabs;
}
