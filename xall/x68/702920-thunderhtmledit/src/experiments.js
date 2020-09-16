/* globals MozXULElement, ExtensionCommon */

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");

const EXTENSION_NAME = "jorgk@thunderHTMLedit";
var extension = ExtensionParent.GlobalManager.getExtension(EXTENSION_NAME);

function loadCSS(url) {
  const styleSheetService = Cc["@mozilla.org/content/style-sheet-service;1"]
    .getService(Ci.nsIStyleSheetService);
  const styleSheetURI = Services.io.newURI(url, null, null);
  styleSheetService.loadAndRegisterSheet(styleSheetURI, styleSheetService.AUTHOR_SHEET);
}

function setupUI(win) {
  let l10nObj = JSON.parse(ThunderHTMLedit.l10n);

  // All our stuff lives inside this object, so create it now.
  win.ThunderHTMLedit_ = { pleaseDonate: l10nObj.pleaseDonate };
  win.ThunderHTMLedit_.extension = extension;

  Services.scriptloader.loadSubScript(extension.getURL("content/thunderHTMLedit-composer.js"), win.ThunderHTMLedit_);
  win.ThunderHTMLedit_.init(win);

  // Note that collapsed will be set to "false" by code.
  let xul = win.MozXULElement.parseXULToFragment(`
    <hbox id="thunderHTMLedit-tabbox-box">
      <hbox id="thunderHTMLedit-content-tab" collapsed="true">
        <radiogroup onselect="if (typeof ThunderHTMLedit_ != 'undefined') ThunderHTMLedit_.SelectEditMode(this.selectedIndex, false);" flex="1" tabindex="1">
          <radio label="${l10nObj["thunderHTMLedit.Composer.Tab.Edit"]}"/>
          <radio label="${l10nObj["thunderHTMLedit.Composer.Tab.Source"]}"/>
        </radiogroup>
      </hbox>
    </hbox>
    <vbox id="thunderHTMLedit-content-source-box" flex="1" collapsed="true">
      <iframe id="thunderHTMLedit-content-source-ace" data-preview="true" flex="1"/>
    </vbox>
  `);
  let appContent = win.document.getElementById("appcontent");
  let contentFrame = win.document.getElementById("content-frame");
  appContent.insertBefore(xul, contentFrame);

  if (ThunderHTMLedit.existingWindows.includes(win)) {
    // Looks like the window was existing when the add-on got activated. So let's
    // do some more initialisation. Basically we need to trigger the state listener.
    win.ThunderHTMLedit_.stateListener.NotifyComposeBodyReady();
  }

  // The former SourceEditor module can now be accessed via ThunderHTMLedit_.
  win.ThunderHTMLedit_.SourceEditor.initFind(win);

  // Monkey patch SetMsgBodyFrameFocus();
  win.ThunderHTMLedit_.SetMsgBodyFrameFocus = win.SetMsgBodyFrameFocus;
  win.SetMsgBodyFrameFocus = () => win.document.getElementById("content-frame").focus();
}

function tearDownUI(win) {
  let isHTML = win.document.getElementById("content-frame").getAttribute("collapsed");
  if (isHTML) win.ThunderHTMLedit_.SelectEditMode(0, false);
  win.ThunderHTMLedit_.destroy(win);

  let tabbox = win.document.getElementById("thunderHTMLedit-tabbox-box");
  if (tabbox) tabbox.remove();
  let sourcebox = win.document.getElementById("thunderHTMLedit-content-source-box");
  if (sourcebox) sourcebox.remove();

  win.SetMsgBodyFrameFocus = win.ThunderHTMLedit_.SetMsgBodyFrameFocus;

  delete win.ThunderHTMLedit_;

  let ind = ThunderHTMLedit.existingWindows.indexOf(win);
  if (ind >= 0) ThunderHTMLedit.existingWindows.splice(ind, 1);
}

// Implements the functions defined in the experiments section of schema.json.
var ThunderHTMLedit = class extends ExtensionCommon.ExtensionAPI {
  onStartup() {}

  onShutdown(isAppShutdown) {
    if (isAppShutdown) return;
    // Looks like we got uninstalled. Maybe a new version will be installed now.
    // Due to new versions not taking effect (https://bugzilla.mozilla.org/show_bug.cgi?id=1634348)
    // we invalidate the startup cache. That's the same effect as starting with -purgecaches
    // (or deleting the startupCache directory from the profile).
    Services.obs.notifyObservers(null, "startupcache-invalidate");
  }

  getAPI(context) {
    context.callOnClose(this);
    return {
      ThunderHTMLedit: {
        addComposeWindowListener(l10n) {
          ThunderHTMLedit.l10n = l10n;
          let defaultsBranch = Services.prefs.getDefaultBranch("extensions.thunderHTMLedit.");
          defaultsBranch.setStringPref("License", "unlicensed");
          defaultsBranch.setIntPref("UseCount", 0);
          defaultsBranch.setIntPref("FontSize", 13);
          defaultsBranch.setIntPref("WrapWidth", 120);
          defaultsBranch.setStringPref("FontFamily", "monospace");
          defaultsBranch.setBoolPref("DarkTheme", false);
          // eslint-disable-next-line quotes
          defaultsBranch.setStringPref("OptionsJSON", '{"behavioursEnabled":true}');

          let os = Services.appinfo.OS;
          let dir = (os == "WINNT" ? "win" : (os == "Darwin" ? "mac" : "linux"));
          loadCSS(extension.getURL(`content/skin/${dir}/composer.css`));

          // Before we register our listener, we get the existing windows.
          let windows = ExtensionSupport.openWindows;  // Returns iterator.
          ThunderHTMLedit.existingWindows = [];
          for (let w of windows) ThunderHTMLedit.existingWindows.push(w);

          ExtensionSupport.registerWindowListener(EXTENSION_NAME, {
            chromeURLs: ["chrome://messenger/content/messengercompose/messengercompose.xul",
              "chrome://messenger/content/messengercompose/messengercompose.xhtml"],
            onLoadWindow: setupUI,
            onUnloadWindow: tearDownUI,
          });
        },
      },
    };
  }

  close() {
    ExtensionSupport.unregisterWindowListener(EXTENSION_NAME);
    for (let win of Services.wm.getEnumerator("msgcompose")) {
      tearDownUI(win);
    }
  }
};
