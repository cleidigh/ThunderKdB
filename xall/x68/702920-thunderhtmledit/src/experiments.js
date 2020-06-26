"use strict";

/* globals MozXULElement */

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { ExtensionSupport } = ChromeUtils.import('resource:///modules/ExtensionSupport.jsm');
var { ExtensionParent } = ChromeUtils.import('resource://gre/modules/ExtensionParent.jsm');

const EXTENSION_NAME = "jorgk@thunderHTMLedit";
var extension = ExtensionParent.GlobalManager.getExtension(EXTENSION_NAME);

function loadCSS(url) {
  const styleSheetService = Cc['@mozilla.org/content/style-sheet-service;1']
                              .getService(Ci.nsIStyleSheetService);
  const styleSheetURI = Services.io.newURI(url, null, null);
  styleSheetService.loadAndRegisterSheet(styleSheetURI, styleSheetService.AUTHOR_SHEET);
}

function iframeLoaded(win) {
  // Populate iframe content and run setup scripts.
  let iframe = win.document.getElementById("thunderHTMLedit-content-source-ace");
  let cw = iframe.contentWindow;
  
  let style = cw.document.createElement('style');
  style.type = 'text/css';
  style.textContent = `
    #editor {position: absolute; top: 0; right: 0; bottom: 0; left: 0; }

    .ace_line .ace_ex_fold {
      -moz-box-sizing: border-box;
      -webkit-box-sizing: border-box;
      box-sizing: border-box;
      display: inline-block;
      outline: 1px solid rgba(128,128,128,0.6);
      border-radius: 4px;
      background-color: rgba(128,128,128,0.2);
      cursor: pointer;
      pointer-events: auto;
    }

    .ace_line .ace_ex_fold:hover{
      outline: 1px solid rgba(128,128,128,0.8);
      background-color: rgba(128,128,128,0.4);
    }

    .ace_line .ace_fold {
        box-sizing: border-box!important;
        height: initial!important;
        margin: 0px!important;
        background-image: none!important;
        background-color: lightgray;
        color: red;
        border: 1px solid gray;
        border-radius: 0px;
    }
  `;
  cw.document.getElementsByTagName('head')[0].appendChild(style);

  let editor =  cw.document.createElement("div");
  editor.id = "editor";
  cw.document.body.appendChild(editor);

  Services.scriptloader.loadSubScript(extension.getURL("chrome/content/ace/ace.js"), cw);
  Services.scriptloader.loadSubScript(extension.getURL("chrome/content/ace/ext-language_tools.js"), cw);
  cw.document.documentElement.setAttribute('windowtype', 'editor:source');
  cw.ace.config.set('basePath', extension.getURL("chrome/content/ace"));
  win.ThunderHTMLedit_.SourceEditor.initWindow(cw);
}

function setupUI(domWindow, l10n) {
  let l10nObj = JSON.parse(l10n);

  // All our stuff lives inside this object, so create it now.
  domWindow.ThunderHTMLedit_ = { pleaseDonate: l10nObj["pleaseDonate"] };

  Services.scriptloader.loadSubScript(extension.getURL("chrome/content/thunderHTMLedit-composer.js"), domWindow);

  // We already set the defaults, so just register the preferences here.
  domWindow.ThunderHTMLedit_.ThunderHTMLeditPrefs.definePreference('License',  { type: 'string' });
  domWindow.ThunderHTMLedit_.ThunderHTMLeditPrefs.definePreference('UseCount', { type: 'int' });
  domWindow.ThunderHTMLedit_.ThunderHTMLeditPrefs.definePreference('FontSize', { type: 'int' });
  domWindow.ThunderHTMLedit_.ThunderHTMLeditPrefs.definePreference('FontFamily', { type: 'string' });
  domWindow.ThunderHTMLedit_.ThunderHTMLeditPrefs.definePreference('DarkTheme', { type: 'bool' });

  // Note that collapsed will be set to "false" by code.
  let xul = domWindow.MozXULElement.parseXULToFragment(`
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
  let appContent = domWindow.document.getElementById("appcontent");
  let contentFrame = domWindow.document.getElementById("content-frame");
  appContent.insertBefore(xul, contentFrame);

  // The former SourceEditor module can now be accessed via ThunderHTMLedit_.
  domWindow.ThunderHTMLedit_.SourceEditor.initFind(domWindow);

  domWindow.setTimeout(() => iframeLoaded(domWindow, extension));
}

function tearDownUI(domWindow) {
  delete domWindow.ThunderHTMLedit_;
}  

// Implements the functions defined in the experiments section of schema.json.
var ThunderHTMLedit = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    context.callOnClose(this);
    return {
      ThunderHTMLedit: {
        addComposeWindowListener(l10n) {
          let defaultsBranch = Services.prefs.getDefaultBranch('extensions.thunderHTMLedit.');
          defaultsBranch.setStringPref('License', 'unlicensed');
          defaultsBranch.setIntPref('UseCount', 0);
          defaultsBranch.setIntPref('FontSize', 13);
          defaultsBranch.setStringPref('FontFamily', 'monospace');
          defaultsBranch.setBoolPref('DarkTheme', false);

          let os = Services.appinfo.OS;
          let dir = (os == "WINNT" ? "win" : (os == "Darwin" ? "mac" : "linux"));
          loadCSS(extension.getURL(`chrome/skin/${dir}/composer.css`));

          ExtensionSupport.registerWindowListener(EXTENSION_NAME, {
            chromeURLs: ["chrome://messenger/content/messengercompose/messengercompose.xul",
                         "chrome://messenger/content/messengercompose/messengercompose.xhtml"],
            onLoadWindow: ((w) => setupUI(w, l10n)),
            onUnloadWindow: tearDownUI,
          });
        }
      }
    }
  }

  close() {
    ExtensionSupport.unregisterWindowListener(EXTENSION_NAME);
  }
};
