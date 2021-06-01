// Copyright (c) 2016, Jörg Knobloch. All rights reserved.
// Ace Editor: Copyright (c) 2010, Ajax.org B.V. All rights reserved.

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");

var ThunderHTMLedit = {
  // general exception handler.
  handleException(e) {
    Cu.reportError(e);
  },

  // timer
  makeTimer() {
    return {
      nsITimer: Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer),
      code: null,

      notify(aTimer) {
        if (typeof this.code == "function") {
          try {
            let code = this.code;
            if (this.nsITimer.type == this.nsITimer.TYPE_ONE_SHOT) this.code = null;
            code();
          } catch (e) { ThunderHTMLedit.handleException(e); }
        }
      },

      QueryInterface(aIID) {
        if (aIID.equals(Ci.nsITimerCallback) || aIID.equals(Ci.nsISupports)) return this;
        throw Cr.NS_ERROR_NO_INTERFACE;
      },

      startInterval(code, millisec) {
        this.nsITimer.cancel();
        this.code = code;
        this.nsITimer.initWithCallback(this, millisec, this.nsITimer.TYPE_REPEATING_SLACK);
      },

      startTimeout(code, millisec) {
        this.nsITimer.cancel();
        this.code = code;
        this.nsITimer.initWithCallback(this, millisec, this.nsITimer.TYPE_ONE_SHOT);
      },

      cancel(code, millisec) {
        this.nsITimer.cancel();
        this.code = null;
      },
    };
  },

  // window  helpers
  isWindow(win) {
    return (typeof win == "object") && ("document" in win);
  },

  getWindowType(win) {
    if (!this.isWindow(win) || !win.document.documentElement.hasAttribute("windowtype")) return false;
    return win.document.documentElement.getAttribute("windowtype");
  },

  isComposerWindow(win) {
    return this.getWindowType(win) == "msgcompose";
  },

  isSourceEditorWindow(win) {
    return this.getWindowType(win) == "editor:source";
  },
};

// services not imported from TB modules
XPCOMUtils.defineLazyServiceGetter(ThunderHTMLedit,
  "fontEnumerator", "@mozilla.org/gfx/fontenumerator;1", "nsIFontEnumerator");
XPCOMUtils.defineLazyServiceGetter(ThunderHTMLedit,
  "accounts", "@mozilla.org/messenger/account-manager;1", "nsIMsgAccountManager");

/*
 * description: preference handling
 */
var ThunderHTMLeditPrefs = {
  branch: Services.prefs.getBranch("extensions.thunderHTMLedit."),
  getPref(name, type) {
    return this.branch[`get${type}Pref`](name);
  },
  setPref(name, type, value) {
    this.branch[`set${type}Pref`](name, value);
  },
};

var SourceEditor = {
  editorCommandTable: null,
  Range: null,
  TokenIterator: null,

  initWindow(win) {
    win.ace.require("ace/ext/language_tools");
    win.ace.require("ace/ext/searchbox");
    this.Range = win.ace.require("ace/range").Range;
    this.TokenIterator = win.ace.require("ace/token_iterator").TokenIterator;

    const editor = win.ace.edit("editor");

    editor.getSession().setMode("ace/mode/html");
    editor.setValue("");

    // windows version
    // todo: handle linux / Mac !
    /*
    editor.commands.addCommand({
      name: 'find',
      bindKey: {win: 'Ctrl-F',  mac: 'Command-F'},
      exec: function(editor) { editor.find(); },
      multiSelectAction: "forEach",
      scrollIntoView: "center",
      readOnly: true
    });
    */
    editor.commands.addCommand({
      name: "findnext",
      bindKey: { win: "Ctrl-G",  mac: "Command-G" },
      exec(editor) { editor.findNext(); },
      multiSelectAction: "forEach",
      scrollIntoView: "center",
      readOnly: true,
    });
    editor.commands.addCommand({
      name: "findprevious",
      bindKey: { win: "Ctrl-Shift-G",  mac: "Command-Shift-G" },
      exec(editor) { editor.findPrevious(); },
      multiSelectAction: "forEach",
      scrollIntoView: "center",
      readOnly: true,
    });

    /*
    editor.commands.addCommand({
      name: 'find_F3_combo',
      bindKey: {win: 'F3',  mac: 'F3'},
      exec: function(editor) { editor.commands.exec(!editor.getLastSearchOptions().needle ? 'find': 'findnext', editor); },
      readOnly: true
    });
    */

    editor.setValue("", -1);

    // read preferences and set theme and options accordingly
    let fontsize = ThunderHTMLeditPrefs.getPref("FontSize", "Int");
    let fontfamily = ThunderHTMLeditPrefs.getPref("FontFamily", "String");
    let darktheme = ThunderHTMLeditPrefs.getPref("DarkTheme", "Bool");
    let prefs = {
      wordWrap: true,
      base: { f: fontfamily, fs: fontsize },
      theme: darktheme ? "twilight" : "sqlserver",
    };
    if (typeof prefs === "object") {
      editor.setShowPrintMargin(false);
      editor.$blockScrolling = Infinity;
      editor.getSession().setTabSize(4);
      editor.getSession().setUseSoftTabs(true);
      editor.getSession().setUseWrapMode(prefs.wordWrap);

      // set font face and size
      let editorOptions = {};
      if (typeof prefs.base === "object") {
        if ("f" in prefs.base) editorOptions.fontFamily = prefs.base.f;
        if ("fs" in prefs.base) editorOptions.fontSize = prefs.base.fs;
      }
      editor.setOptions(editorOptions);

      // eslint-disable-next-line prefer-template
      editor.setTheme("ace/theme/" + prefs.theme);
    }

    // enable autocompletion and snippets
    editor.setOptions({
      enableBasicAutocompletion: true,
      enableSnippets: true,
      enableLiveAutocompletion: false,
    });
    // Set additional options.
    let optionsJSON;
    try {
      optionsJSON = ThunderHTMLeditPrefs.getPref("OptionsJSON", "String");
      let options = JSON.parse(optionsJSON);
      editor.setOptions(options);
    } catch (ex) {
      Services.prompt.alert(
        null,
        "extensions.thunderHTMLedit.OptionsJSON invalid",
        optionsJSON,
      );
    }
  },

  initFind(win) {
    let self = this;
    win.ThunderHTMLedit_.findInSourceCommand = {
      isCommandEnabled(aCommand, editorElement) { return true; },

      getCommandStateParams(aCommand, aParams, editorElement) {},
      doCommandParams(aCommand, aParams, editorElement) {},

      doCommand(aCommand, editorElement) {
        const editor = self.getEditor(win);
        editor.commands.exec("find", editor);
      },
    };

    win.ThunderHTMLedit_.findAgainInSourceCommand = {
      isCommandEnabled(aCommand, editorElement) {
        const editor = self.getEditor(win);
        return !!(editor) && !!(editor.getLastSearchOptions().needle);
      },

      getCommandStateParams(aCommand, aParams, editorElement) {},
      doCommandParams(aCommand, aParams, editorElement) {},

      doCommand(aCommand, editorElement) {
        const editor = self.getEditor(win);
        editor.commands.exec(aCommand == "cmd_findNext" ? "findprevious" : "findnext", editor);
      },
    };

    win.ThunderHTMLedit_.findReplaceSourceCommand = {
      isCommandEnabled(aCommand, editorElement) { return true; },

      getCommandStateParams(aCommand, aParams, editorElement) {},
      doCommandParams(aCommand, aParams, editorElement) {},

      doCommand(aCommand, editorElement) {
        const editor = self.getEditor(win);
        editor.commands.exec("replace", editor);
      },
    };

    const controller = Cc["@mozilla.org/embedcomp/base-command-controller;1"].createInstance();
    const editorController = controller.QueryInterface(Ci.nsIControllerContext);
    // editorController.init(null);
    editorController.setCommandContext(win);
    win.controllers.insertControllerAt(0, controller);

    this.editorCommandTable = controller.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIControllerCommandTable);

    this.editorCommandTable.registerCommand("cmd_find",          win.ThunderHTMLedit_.findInSourceCommand);
    this.editorCommandTable.registerCommand("cmd_findNext",      win.ThunderHTMLedit_.findAgainInSourceCommand);
    this.editorCommandTable.registerCommand("cmd_findPrev",      win.ThunderHTMLedit_.findAgainInSourceCommand);
    this.editorCommandTable.registerCommand("cmd_findReplace",   win.ThunderHTMLedit_.findReplaceSourceCommand);

    // Note that the M-C editor sets up controllers very late, so we can't register the
    // undo/redo controller here :-(
  },

  getEditor(win) {
    if (ThunderHTMLedit.isComposerWindow(win)) {
      const iframe = win.document.getElementById("thunderHTMLedit-content-source-ace");
      return iframe.contentWindow.ace.edit("editor");
    }
    if (ThunderHTMLedit.isSourceEditorWindow(win)) {
      return win.ace.edit("editor");
    }
    return false;
  },

  setHTML(win, html, resetUndo) {
    try {
      const editor = this.getEditor(win);

      let onAfterRender = editor.renderer.on("afterRender", () => {
        editor.renderer.off("afterRender", onAfterRender);
        let undoManager = editor.getSession().getUndoManager();
        if (resetUndo) {
          undoManager.reset();
        }
        editor.getSession()._ThunderHTMLedit_NotModified_Count = undoManager.getRevision();
      });

      editor.setValue(html, -1);
      this.foldAllDataUrls(editor);
    } catch (e) { ThunderHTMLedit.handleException(e); }
  },

  getHTML(win) {
    try {
      const editor = this.getEditor(win);
      return editor.getValue();
    } catch (e) { ThunderHTMLedit.handleException(e); return ""; }
  },

  setNotModified(win) {
    try {
      const editor = this.getEditor(win);
      editor.getSession()._ThunderHTMLedit_NotModified_Count = editor.getSession().getUndoManager().getRevision();
    } catch (e) { ThunderHTMLedit.handleException(e); }
  },

  isModified(win) {
    try {
      const editor = this.getEditor(win);
      return editor.getSession()._ThunderHTMLedit_NotModified_Count != editor.getSession().getUndoManager().getRevision();
    } catch (e) { ThunderHTMLedit.handleException(e); return false; }
  },
  focus(win) {
    try {
      this.getEditor(win).focus();
    } catch (e) { ThunderHTMLedit.handleException(e); }
  },

  foldAllDataUrls(editor) {
    // todo use "tokenizerUpdate" event to  update after chanegs (paste, edits, etc)
    // todo instead calling "foldAllDataUrls", the "tokenizerUpdate" may be enough :-)

    editor.getSession().on("changeFold", (param) => {
      if (param.action == "remove" && param.data.range.dataUri) {
        ThunderHTMLedit.makeTimer().startTimeout(() => {
          const range = param.data.range.clone();
          range.dataUri = JSON.parse(JSON.stringify(param.data.range.dataUri));

          // fold could be removed due to parent fold hid lines - in this case screen coord reange will be empty.
          if (range.toScreenRange(editor.getSession()).isEmpty()) return;

          // fold could be removed due to user edit - in this case token in the range start no longer contain "data:" string
          const iterator = new this.TokenIterator(editor.getSession(), range.start.row, range.start.column);
          let token = iterator.getCurrentToken();
          if (!token.value.match(/"\s*data:/i)) return;

          const wasCompacted = param.data.range.placeholder == range.dataUri.placeholder_compact;

          if (wasCompacted) {
            range.placeholder = "data:";
            range.end.row = range.start.row;
            range.end.column = range.start.column + range.placeholder.length;
          } else {
            range.placeholder = range.dataUri.placeholder_compact;
            // move forward to find end of range
            while (token = iterator.getCurrentToken()) {
              if (token.value.match(/\s*"$/)) {
                range.end.row = iterator.getCurrentTokenRow();
                range.end.column = iterator.getCurrentTokenColumn() + token.value.length - 1;
                break;
              }
              token = iterator.stepForward();
            }
          }
          editor.getSession().addFold("", range);
        }, 1);
      }
    });

    const session = editor.getSession();
    if (!session.foldWidgets) return; // mode doesn't support folding

    let startRow = 0;  // used to be function parameters.
    let endRow = session.getLength();

    const iterator = new this.TokenIterator(session, startRow, 0);

    let token;
    let range = new this.Range(null, null, null, null);
    range.dataUri = {
      placeholder_compact: "",
    };
    while (token = iterator.getCurrentToken()) {
      if (token.type.lastIndexOf("attribute-value.xml") > -1) {
        if (range.start.row == null && token.value.match(/"\s*data:/i)) {
          range.start.row = iterator.getCurrentTokenRow();
          range.start.column = iterator.getCurrentTokenColumn() + 1;

          // skip first characters, to show protocol and filename, and few characters
          const matches = (/"(\s*data:.*?;(?:.*filename=.*?;)?).*/i).exec(token.value);
          // eslint-disable-next-line prefer-template
          range.placeholder = matches[1] + "\u2026";

          range.dataUri.placeholder_compact = range.placeholder;
        }
        if (range.start.row != null && range.end.row == null && token.value.match(/\s*"$/)) {
          range.end.row = iterator.getCurrentTokenRow();
          range.end.column = iterator.getCurrentTokenColumn() + token.value.length - 1;

          if (range.end.row <= endRow && range.start.row >= startRow) {
            try {
              session.addFold("", range);
            } catch (e) {}
          }
        }
      } else if (range.start.row != null) {
        range = new this.Range(null, null, null, null);
        range.dataUri = { placeholder_compact: "" };
      }
      if (iterator.getCurrentTokenRow() > endRow) {
        break;
      }
      token = iterator.stepForward();
    }
  },
};

var WYSIWYG_ChangeCount;
var Source_ResetUndo;
var onComposeBodyReadyCalled;
var ClearStatusText;
var ResetTheme;
var Undo;
var Redo;
var thisWin;
// eslint-disable-next-line max-len, comma-spacing
var lc = ["A2FYC3R5","A2XHDXMU","A3NIZWF0","AG12ZXJV","AGFYCMTL","AGVYDMVI","AI5KZWPV","AKBQB3JN","AM9HY2HP","AM9LCMCU","AM9UYXMT","AM9ZQGRL","AMF5QHNH","AMLTQGPH","AMPZZG5A","AMVABW12","AMVADMVY","AMVMZNJ5","ANAUBGV2","ANV0DGFA","AW5MB0BK","AW5MB0BN","AW5MB0BR","AW5MB0BZ","AWFUBWVK","AWXWAXBW","AZDQZWJA","B2ZMAWNL","B3JKZXJZ","B3ZHAGLT","BGVUYS0Y","BMF0AGFU","BMF1BMF1","BMLJAGLN","BMVKZGVU","BWDYZWLZ","BWF0DGNS","BWFPBEBH","BWFPBEBT","BWFUDUBZ","BWFYDGLU","BWFYYY5N","BWLJAGFL","BWLRZUBQ","BWLRZUBW","BWNMCM9Z","BWVAZG9U","BWVNLMHH","BWZIQGXL","BXR5DHNL","C2FKANVR","C2FMZXJZ","C2FRZXMT","C2FSZXNA","C2HLZW4U","C2LSDMFP","C2NVDHQU","C2TABGFI","C2VYDMLJ","C2XHD2VR","C3NHNTU1","C3RLDMVA","C3RVEWFU","CGF0CMLJ","CGF0YM9Y","CGF5CGFS","CGHPBF9J","CGHVZMZT","CGJIMDMX","CGLLCNJL","CGLUQGDL","CGOUAGFH","CGPACGPH","CGV0ZXJO","CGV0ZXJZ","CGVWZXRY","CHBLCM5H","CM1VCMFS","CM9ZC2VI","CMLJAGFY","CMOUA2VJ","CMRLDMVU","D2H5DHDV","D2HHDHPN","D2LTQHZH","D2ROZ25K","D2VIDHVU","D3JPZ2H0","DG9TYXJK","DG9TYXMU","DGH1BMRL","DGHVCNN0","DGRHBWF0","DGV0C3V5","DHDHZ0BZ","DHDPBGVZ","DNRYDNRY","DXCUYWX0","Y29YYMFS","Y29YZWRL","Y29YZXLA","Y2HHAXJW","Y2HYAXNA","Y2HYAXNN","Y2XHDWRP","Y3VUB0BP","Y3ZPDGFS","YMD1AWXS","YMF1ZXJJ","YMVUAMFT","YNJ1BM8U","YNJ1Y2VA","YNNJYXJS","YS5WLMPH","YW5KCMV3","YW5KEUBU","YW5QYS5K","YWFMLXJH","YWNOAW0U","YWRSAW5K","YWRTAW5A","YWX0QHRT","YWXHAW4Z","YWXIZXJ0","YWXLEGFU","YXHLBC5N","YXJ2AWRA","YXRYB2NP","YY5JB3JI","Z29SBHDP","Z2FYDGHA","Z2FYYWDL","Z2JJCMVU","Z2LSBGVZ","Z2VVZMZA","Z3JHBNRA","ZG9TAW5P","ZG9UX3JL","ZGF2ZUBK","ZGF2ZUBT","ZGFUQGRP","ZGPAYXZV","ZGPJYXR0","ZGVZC2FP","ZHDPBGRL","ZHLZQG91","ZMFYBWVY","ZNJHBMNP","ZW1HBNVL","ZWFJQGFY","ZWJHEUBL","ZWLTYW50","ZWQUYWDV","ZWXICMFJ","ZWXJB29R","ZXJPY3D5","ZXJPYY5H"];

function isLL(l) {
  let s = 0;
  let e = lc.length - 1;
  while (s <= e) {
    let m = Math.floor((s + e) / 2);
    if (lc[m] === l) return true;
    if (lc[m] < l) s = m + 1;
    else e = m - 1;
  }
  return false;
}

function hasLicense() {
  let licensePref = ThunderHTMLeditPrefs.getPref("License", "String");
  if (licensePref == "unlicensed") return false;

  let license = licensePref.toUpperCase().replace(/[-=]/g, "").substring(0, 20);
  let licenseOrg = license;
  if (license.length <= 4) return false;
  let legacyLicence = isLL(license.substring(0, 8));
  for (let identity of ThunderHTMLedit.accounts.allIdentities) {
    if (!identity.email) continue;
    let email = identity.email.toLowerCase();
    let check = thisWin.btoa(email).toUpperCase().replace(/=/g, "").substring(0, 20);
    let s = 0;
    let c = email.substring(0, 1);
    if (c <= "i") s = 1;
    else if (c <= "r") s = 2;
    else s = 3;
    if (!legacyLicence) {
      license = licenseOrg.substring(licenseOrg.length - s) + licenseOrg.substring(0, licenseOrg.length - s);
    }
    if (license == check) {
      // Services.console.logStringMessage("ThunderHTMLedit - "+identity.email+" - license: "+license);

      // Let's switch to the new license but make sure the new license doesn't end up being
      // a legacy license accidentally. If so, revert.
      let licenseNew = license.substring(s) + license.substring(0, s);
      if (isLL(licenseNew.substring(0, 8))) licenseNew = license;
      licenseNew = licenseNew.replace(/(.....)/g, "$1-").replace(/-$/, "");
      if (licenseNew != licensePref) ThunderHTMLeditPrefs.setPref("License", "String", licenseNew);
      return true;
    }
  }
  return false;
}

function CheckLicense() {
  const numNoNags = 25;
  const numNags = 5;

  let darktheme = ThunderHTMLeditPrefs.getPref("DarkTheme", "Bool");
  let licensedTheme = darktheme ? "ace/theme/twilight" : "ace/theme/sqlserver";
  let unLicensedTheme = darktheme ? "ace/theme/sqlserver" : "ace/theme/twilight";
  let useCount = ThunderHTMLeditPrefs.getPref("UseCount", "Int");
  useCount++;
  // Don't overflow. Could also test Number.MAX_SAFE_INTEGER.
  if (useCount == 16000000) useCount = 0;
  ThunderHTMLeditPrefs.setPref("UseCount", "Int", useCount);
  // Services.console.logStringMessage("ThunderHTMLedit - use count " + useCount);

  ClearStatusText = false;

  useCount %= (numNoNags + numNags);
  if (useCount < numNoNags) {
    if (ResetTheme) {
      SourceEditor.getEditor(thisWin).setTheme(licensedTheme);
      ResetTheme = false;
    }
    return;
  }

  // Now really check the license.
  if (hasLicense()) {
    if (ResetTheme) {
      SourceEditor.getEditor(thisWin).setTheme(licensedTheme);
      ResetTheme = false;
    }
    return;
  }

  ClearStatusText = true;
  let pleaseDonate = this.pleaseDonate;
  let statusText = thisWin.document.getElementById("statusText");
  statusText.setAttribute("label", pleaseDonate);  // TB 68
  statusText.setAttribute("value", pleaseDonate);  // TB 70 and later, bug 1577659.
  statusText.setAttribute("style", "font-weight: bold; color:red");

  // Change the theme.
  if (!ResetTheme) SourceEditor.getEditor(thisWin).setTheme(unLicensedTheme);
  ResetTheme = true;
}

function PrepareHTMLtab() {
  try {
    // (***) This counting bussiness doesn't really work well. If you do:
    // Type in souce, save, switch to HTML, you get count 0.
    // Switch to edit, type, save, switch to HTML, count still 0 after save, so you missed the last bit.
    // That's why ThunderHTMLedit Mark 1 had (expensive) action/transaction listeners.
    // To avoid that, I'll just reset the count in the send/save listener and force a
    // rebuild after each save/send.
    WYSIWYG_ChangeCount = -1000;
    Source_ResetUndo = true;
    ResetTheme = false;

    Undo = thisWin.document.getElementById("menu_undo");
    Redo = thisWin.document.getElementById("menu_redo");

    // Always show the HTML tab, even in a plain text editor.
    // Like this, users will understand that there is really no plain text editor.
    // It's all HTML ;-)
    thisWin.document.getElementById("thunderHTMLedit-content-tab").removeAttribute("collapsed");

    initIframe(thisWin);
  } catch (e) { ThunderHTMLedit.handleException(e); }
}

function initIframe(win) {
  // Populate iframe content and run setup scripts.
  let iframe = win.document.getElementById("thunderHTMLedit-content-source-ace");
  let cw = iframe.contentWindow;

  let style = cw.document.createElement("style");
  style.type = "text/css";
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
  cw.document.getElementsByTagName("head")[0].appendChild(style);

  let editor =  cw.document.createElement("div");
  editor.id = "editor";
  cw.document.body.appendChild(editor);

  Services.scriptloader.loadSubScript(this.extension.getURL("content/ace/ace.js"), cw);
  Services.scriptloader.loadSubScript(this.extension.getURL("content/ace/ext-language_tools.js"), cw);
  cw.document.documentElement.setAttribute("windowtype", "editor:source");
  cw.ace.config.set("basePath", this.extension.getURL("content/ace"));
  SourceEditor.initWindow(cw);
}

// modes: 0 - WYSIWYG, 1- HTML source
function SelectEditMode(mode, syncOnly) {
  // If we get enabled on an open compose window, we're not fully initialised
  // since compose-window-init isn't fired again. So just give up.
  if (!onComposeBodyReadyCalled) return;

  try {
    // Function called when composer window is not constructed completly yet, just after overlay loads.
    if (thisWin.gMsgCompose == null) return;

    // Copy content from WYSIWYG to HTML tab, only when WYSIWYG is changed.
    if (mode == 1) {
      // When using the HTML tab, check the license.
      CheckLicense();

      if (WYSIWYG_ChangeCount != thisWin.GetCurrentEditor().getModificationCount()) {
        MoveContentFromWYSIWYGtoSource(Source_ResetUndo);
        WYSIWYG_ChangeCount = thisWin.GetCurrentEditor().getModificationCount();
        Source_ResetUndo = false;
      }
      // Switch tabs.
      if (!syncOnly) {
        thisWin.document.getElementById("thunderHTMLedit-content-source-box").removeAttribute("collapsed");
        thisWin.document.getElementById("content-frame").setAttribute("collapsed", true);
        thisWin.document.getElementById("thunderHTMLedit-content-source-ace").focus();

        // Now hack the undo/redo commands.
        Undo.removeAttribute("command");
        Undo.setAttribute("oncommand", "window.ThunderHTMLedit_.AceUndo();");
        Undo.setAttribute("disabled", false);
        Redo.removeAttribute("command");
        Redo.setAttribute("oncommand", "window.ThunderHTMLedit_.AceRedo();");
        Redo.setAttribute("disabled", false);
      }
    }

    // User switches back to WYSIWYG, if HTML changed copy it back.
    if (mode == 0) {
      // Clear donation reminder.
      if (ClearStatusText) {
        thisWin.document.getElementById("statusText").setAttribute("label", "");  // TB 68
        thisWin.document.getElementById("statusText").setAttribute("value", "");  // TB 70 and later, bug 1577659.
        thisWin.document.getElementById("statusText").setAttribute("style", "");
      }
      // Services.console.logStringMessage(`ThunderHTMLedit - modified ${SourceEditor.isModified(thisWin)}`);

      if (SourceEditor.isModified(thisWin)) {
        MoveContentFromSourceToWYSIWYG();
        SourceEditor.setNotModified(thisWin);
        WYSIWYG_ChangeCount = thisWin.GetCurrentEditor().getModificationCount();
      }
      // Switch tabs.
      if (!syncOnly) {
        thisWin.document.getElementById("thunderHTMLedit-content-source-box").setAttribute("collapsed", true);
        thisWin.document.getElementById("content-frame").removeAttribute("collapsed");
        thisWin.document.getElementById("content-frame").focus();

        // Restore undo/redo commands.
        Undo.removeAttribute("oncommand");
        Undo.setAttribute("command", "cmd_undo");
        Redo.removeAttribute("oncommand");
        Redo.setAttribute("command", "cmd_redo");
      }
    }
  } catch (e) { ThunderHTMLedit.handleException(e); }
}

function AceUndo() {
  // Services.console.logStringMessage("ThunderHTMLedit - Undo");
  const editor = SourceEditor.getEditor(thisWin);
  editor.commands.exec("undo", editor);
}

function AceRedo() {
  // Services.console.logStringMessage("ThunderHTMLedit - Redo");
  const editor = SourceEditor.getEditor(thisWin);
  editor.commands.exec("redo", editor);
}

function MoveContentFromSourceToWYSIWYG() {
  try {
    // Services.console.logStringMessage("ThunderHTMLedit - setting Source");
    let source = SourceEditor.getHTML(thisWin);
    // Services.console.logStringMessage("ThunderHTMLedit: "+ source);
    thisWin.gMsgCompose.editor.QueryInterface(Ci.nsIHTMLEditor).rebuildDocumentFromSource(source);
  } catch (e) { ThunderHTMLedit.handleException(e); }
}

function MoveContentFromWYSIWYGtoSource(resetUndo) {
  try {
    // Services.console.logStringMessage("ThunderHTMLedit - setting HTML");
    // Was this:
    // let html = thisWin.GetCurrentEditor().outputToString("text/html", 2 + 134217728 /* OutputFormatted + OutputDisallowLineBreaking */);

    let encoder = Cu.createDocumentEncoder("text/html");
    encoder.init(thisWin.GetCurrentEditor().document, "text/html", 2 + 134217728 /* OutputFormatted + OutputDisallowLineBreaking */);
    let width = ThunderHTMLeditPrefs.getPref("WrapWidth", "Int");
    encoder.setWrapColumn(width > 72 ? width : 72);
    let html = encoder.encodeToString();

    if (ThunderHTMLeditPrefs.getPref("ReplaceTabs", "Bool")) {
      html = html.replace(/\t/g, "&#x09;"); // Make tabs visible, Ace already shows NBSP.
    }
    // eslint-disable-next-line prefer-template
    SourceEditor.setHTML(thisWin, "<!DOCTYPE html>" + html, resetUndo);
  } catch (e) { ThunderHTMLedit.handleException(e); }
}

// Replace mailbox:///C|/ with  mailbox:///C:/ - note: %7C is | and %3A is :
// JKJK Not sure why this is necessary, but it won't hurt.
function fixImagesPaths(htmlDocument) {
  let images = htmlDocument.getElementsByTagName("IMG");
  for (let i = 0; i < images.length; i++) {
    let node = images[i];
    if (node.hasAttribute("src")) {
      if (node.src.match(/mailbox:\/\/\/(.)(?:%7C|\|)\//i)) node.src = node.src.replace(/mailbox:\/\/\/(.)(?:%7C|\|)\//i, "mailbox:///$1%3A/");

      if (node.src.match(/file:\/\/\/(.)(?:%7C|\|)\//i)) node.src = node.src.replace(/file:\/\/\/(.)(?:%7C|\|)\//i, "file:///$1%3A/");
    }
  }
}

// TODO: This is ugly, but works.
function useFontPreview() {
  if (typeof useFontPreview.useFontPreview === "undefined") {
    useFontPreview.useFontPreview = ThunderHTMLedit.fontEnumerator.EnumerateAllFonts({ value: 0 }).length < 300;
  }
  return useFontPreview.useFontPreview;
}

function onComposeBodyReady(win) {
  try {
    onComposeBodyReadyCalled = true;

    win.setTimeout(() => {
      PrepareHTMLtab();

      win.document.getElementById("FontFaceSelect").setAttribute("maxwidth", 250);
      let FontFacePopup = win.document.getElementById("FontFacePopup");
      let nodes = FontFacePopup.childNodes;

      nodes[1].setAttribute("style", "font-family: monospace !important;");
      nodes[3].setAttribute("style", "font-family: Helvetica, Arial, sans-serif !important;");
      nodes[4].setAttribute("style", "font-family: Times, serif !important;");
      nodes[5].setAttribute("style", "font-family: Courier, monospace !important;");

      // todo customize fonts AFTER composer is shown, as background task
      if (useFontPreview()) {
        for (let i = 7; i < nodes.length; ++i) {
          let n = nodes[i];
          n.setAttribute("style", `font-family: "${n.value}" !important;`);
          n.tooltipText = n.value;
        }
      }
    }, 0);
  } catch (e) { ThunderHTMLedit.handleException(e); }
}

var stateListener = {
  NotifyComposeBodyReady() {
    // Services.console.logStringMessage("ThunderHTMLedit - stateListener: NotifyComposeBodyReady");

    onComposeBodyReady(thisWin);

    // Observer to fix some images in WYSIWYG mode.
    let WYSIWYGEditor = thisWin.document.getElementById("content-frame");

    // This was added to fix the missing cursor for a reply :-(
    // Global from MsgComposeCommands.js.
    switch (thisWin.gComposeType) {
      case Ci.nsIMsgCompType.Reply:
      case Ci.nsIMsgCompType.ReplyAll:
      case Ci.nsIMsgCompType.ReplyToSender:
      case Ci.nsIMsgCompType.ReplyToGroup:
      case Ci.nsIMsgCompType.ReplyToSenderAndGroup:
      case Ci.nsIMsgCompType.ReplyWithTemplate:
      case Ci.nsIMsgCompType.ReplyToList:
        // No idea why a timeout is required here :-(
        thisWin.setTimeout(() => thisWin.document.getElementById("content-frame").focus());
        break;
      default:
    }
    WYSIWYGEditor = WYSIWYGEditor.getEditor(WYSIWYGEditor.contentWindow);
    try {
      fixImagesPaths(WYSIWYGEditor.rootElement.ownerDocument);
    } catch (e) { ThunderHTMLedit.handleException(e); }
  },
};

function composeWindowInit(e) {
  thisWin.gMsgCompose.RegisterStateListener(stateListener);
  // Services.console.logStringMessage("ThunderHTMLedit - compose-window-init: RegisterStateListener");
}

function composeSendMessage(e) {
  // Services.console.logStringMessage("ThunderHTMLedit - compose-send-message");
  if (onComposeBodyReadyCalled) {
    try {
      // Synchronize WYSIWYG editor to Source editor, if currently user edit source.
      let isHTML = thisWin.document.getElementById("content-frame").getAttribute("collapsed");
      if (isHTML) SelectEditMode(0, true);
    } catch (ex) {}
  }
  // See comment above (***) to see why we're doing this.
  WYSIWYG_ChangeCount = -1000;
  Source_ResetUndo = true;
}

function init(win) {
  thisWin = win;
  // We need true here, or will need to add to win.document.getElementById("msgcomposeWindow").
  win.addEventListener("compose-window-init", composeWindowInit, true);
  win.addEventListener("compose-send-message", composeSendMessage, true);
}

function destroy(win) {
  win.removeEventListener("compose-window-init", composeWindowInit, true);
  win.removeEventListener("compose-send-message", composeSendMessage, true);
  if (win.gMsgCompose) {
    win.gMsgCompose.UnregisterStateListener(stateListener);
  }
}

function launchOptions() {
  thisWin.openDialog("chrome://ThunderHTMLedit/content/options.xhtml",
    "_blank", "chrome,centerscreen,titlebar,modal,resizable", null);
}
