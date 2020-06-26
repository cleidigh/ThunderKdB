// MODULE START
/*
 * description: Main file of ThunderHTMLedit.
 */
'use strict';

var {Services} = ChromeUtils.import('resource://gre/modules/Services.jsm');
var {XPCOMUtils} = ChromeUtils.import('resource://gre/modules/XPCOMUtils.jsm');

var ThunderHTMLedit = {};

//general exception handler.
ThunderHTMLedit.handleException = function(e) {
  Cu.reportError(e);
}

// services not imported from TB modules
XPCOMUtils.defineLazyServiceGetter(ThunderHTMLedit,
  "fontEnumerator", "@mozilla.org/gfx/fontenumerator;1", "nsIFontEnumerator");
XPCOMUtils.defineLazyServiceGetter(ThunderHTMLedit,
  "accounts", "@mozilla.org/messenger/account-manager;1", "nsIMsgAccountManager");

/////////////////////////////////////////////////////////////////////////////////////
// timer
ThunderHTMLedit.makeTimer = function() {
  return {
    nsITimer: Cc["@mozilla.org/timer;1"].createInstance(Ci.nsITimer),
    code: null,

    notify: function(aTimer) {
      if (typeof this.code == 'function')
        try {
          let code = this.code;
          if (this.nsITimer.type == this.nsITimer.TYPE_ONE_SHOT) this.code = null;
          code();
        } catch (e) {ThunderHTMLedit.handleException(e); }
    },

    QueryInterface: function(aIID) {
      if (aIID.equals(Ci.nsITimerCallback) || aIID.equals(Ci.nsISupports)) return this;
      throw Cr.NS_ERROR_NO_INTERFACE;
    },

    startInterval: function(code, millisec) {
      this.nsITimer.cancel();
      this.code = code;
      this.nsITimer.initWithCallback(this, millisec, this.nsITimer.TYPE_REPEATING_SLACK);
    },

    startTimeout: function(code, millisec) {
      this.nsITimer.cancel();
      this.code = code;
      this.nsITimer.initWithCallback(this, millisec, this.nsITimer.TYPE_ONE_SHOT);
    },

    cancel: function(code, millisec) {
      this.nsITimer.cancel();
      this.code = null;
    },
  };
}

/////////////////////////////////////////////////////////////////////////////////////
// window  helpers

ThunderHTMLedit.isWindow = function(win) {
  return (typeof win == 'object') && ('document' in win);
}

ThunderHTMLedit.getWindowType = function(win) {
  if (!ThunderHTMLedit.isWindow(win) || !win.document.documentElement.hasAttribute('windowtype')) return false;
  return win.document.documentElement.getAttribute('windowtype');
}

ThunderHTMLedit.isComposerWindow = function(win) {
  return ThunderHTMLedit.getWindowType(win) == 'msgcompose'
}
ThunderHTMLedit.isSourceEditorWindow = function(win) {
  return ThunderHTMLedit.getWindowType(win) == 'editor:source'
}

// MODULE END
// MODULE START
/*
 * description: preference handling
 */
'use strict';

// DONE var {Services} = ChromeUtils.import('resource://gre/modules/Services.jsm');

var ThunderHTMLeditPrefs = {};

ThunderHTMLeditPrefs.getPref = function(name) { return getPref(name, valuesBranch); }
ThunderHTMLeditPrefs.setPref = function(name, value) { setPref(name, value, valuesBranch); }
ThunderHTMLeditPrefs.definePreference = function(prefName, v) { dp(prefName, v); }

var valuesBranch = Services.prefs.getBranch('extensions.thunderHTMLedit.');
var defaultsBranch = Services.prefs.getDefaultBranch('extensions.thunderHTMLedit.');

// main structure to hold preference descriptors
var prefs = {};

const PT_STRING = 1;
const PT_INT = 2;
const PT_BOOL = 3;
const PT_UNICODE = 4;
const PT_JSON = 5;

function isValidPrefType(name, preference, branch) {
  let existingPrefType = branch.getPrefType(name);
  if (existingPrefType == branch.PREF_INVALID) return true;
  if (preference.type == PT_BOOL) return existingPrefType = branch.PREF_BOOL;
  if (preference.type == PT_INT) return existingPrefType = branch.PREF_INT;
  return existingPrefType == branch.PREF_STRING;
}

function getPref(name, branch) {
  try {
    let preference = { type: PT_JSON, defaultValue: null };
    if (name in prefs) preference = prefs[name];

    if (!isValidPrefType(name, preference, branch)) branch.clearUserPref(name);

    if (branch.getPrefType(name) != branch.PREF_INVALID)
      switch (preference.type) {
        case PT_STRING: return branch.getCharPref(name);
        case PT_INT: return branch.getIntPref(name);
        case PT_BOOL: return branch.getBoolPref(name);
        case PT_UNICODE: return branch.getComplexValue(name, Ci.nsISupportsString).data;
        case PT_JSON: return JSON.parse(branch.getCharPref(name));
      }
    //else return default value
    switch (preference.type) {
      case PT_JSON:
        return JSON.parse(JSON.stringify(preference.defaultValue));
      default:
        return preference.defaultValue;
    }
  } catch (e) { ThunderHTMLedit.handleException(e); }
  return null;
}

let encode_regex = /[^\u0000-\u007F]/g;
let encode_replacement = function(c) { return '\\u' + ('0000' + c.charCodeAt(0).toString(16)).slice(-4); };
function setPref(name, value, branch) {
  try {
    let preference = { type: PT_JSON, defaultValue: null };
    if (name in prefs) preference = prefs[name];
    if (!isValidPrefType(name, preference, branch)) branch.clearUserPref(name);

    switch (preference.type) {
      case PT_STRING: branch.setCharPref(name, value); break;
      case PT_INT: branch.setIntPref(name, value); break;
      case PT_BOOL: branch.setBoolPref(name, value); break;
      case PT_JSON:
        branch.setCharPref(name, JSON.stringify(value).replace(encode_regex, encode_replacement));
        break;
      case PT_UNICODE:
        let s = Cc["@mozilla.org/supports-string;1"].createInstance(Ci.nsISupportsString);
        s.data = value;
        branch.setComplexValue(name, Ci.nsISupportsString, s);
        break;
    }
  } catch (e) { ThunderHTMLedit.handleException(e); }
}

function dp(prefName, v) {
  let preference = { type: PT_JSON, defaultValue: null };
  if ('type' in v) {
    if (v['type'].toLowerCase() == 'string') preference.type = PT_STRING;
    if (v['type'].toLowerCase() == 'int') preference.type = PT_INT;
    if (v['type'].toLowerCase() == 'bool') preference.type = PT_BOOL;
    if (v['type'].toLowerCase() == 'unicode') preference.type = PT_UNICODE;
    if (v['type'].toLowerCase() == 'json') preference.type = PT_JSON;
  }

  if ('default' in v) {
    if (preference.type == PT_JSON)
      preference.defaultValue = JSON.parse(JSON.stringify(v['default']));
    else
      preference.defaultValue = v['default'];
  }
  prefs[prefName] = preference;

  if ('default' in v)
    setPref(prefName, preference.defaultValue, defaultsBranch);
}
// MODULE END

// Since this is no longer a module, make the former ThunderHTMLeditPrefs variable available in our global object.
ThunderHTMLedit_.ThunderHTMLeditPrefs = ThunderHTMLeditPrefs;

// MODULE START
// var {Services} = ChromeUtils.import('resource://gre/modules/Services.jsm');

var SourceEditor = {};

var editorCommandTable = null;
var Range = null;
var TokenIterator = null;

SourceEditor.initWindow = function(win) {

  win.ace.require("ace/ext/language_tools");
  win.ace.require("ace/ext/searchbox");
  Range = win.ace.require("ace/range").Range;
  TokenIterator = win.ace.require("ace/token_iterator").TokenIterator;

  const editor = win.ace.edit("editor");

  editor.getSession().setMode("ace/mode/html");
  editor.setValue("");

  //windows version
  //todo: handle linux / Mac !
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
    name: 'findnext',
    bindKey: {win: 'Ctrl-G',  mac: 'Command-G'},
    exec: function(editor) { editor.findNext(); },
    multiSelectAction: "forEach",
    scrollIntoView: "center",
    readOnly: true
  });
  editor.commands.addCommand({
    name: 'findprevious',
    bindKey: {win: 'Ctrl-Shift-G',  mac: 'Command-Shift-G'},
    exec: function(editor) { editor.findPrevious(); },
    multiSelectAction: "forEach",
    scrollIntoView: "center",
    readOnly: true
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

  //read preferences and set theme and options accordingly
  let fontsize = ThunderHTMLeditPrefs.getPref('FontSize');
  let fontfamily = ThunderHTMLeditPrefs.getPref('FontFamily');
  let darktheme = ThunderHTMLeditPrefs.getPref('DarkTheme');
  let prefs = {
    wordWrap: true,
    base: { f: fontfamily, fs: fontsize},
    theme: darktheme ? 'twilight' : 'sqlserver',
  }
  if (typeof prefs === 'object') {
    editor.setShowPrintMargin(false);
    editor.$blockScrolling = Infinity;
    editor.getSession().setTabSize(4);
    editor.getSession().setUseSoftTabs(true);
    editor.getSession().setUseWrapMode(prefs.wordWrap);

    //set font face and size
    let editorOptions = {};
    if (typeof prefs.base === 'object') {
      if ('f' in prefs.base) editorOptions.fontFamily = prefs.base.f;
      if ('fs' in prefs.base) editorOptions.fontSize = prefs.base.fs;
    }
    editor.setOptions(editorOptions);

    editor.setTheme("ace/theme/" + prefs.theme);
  }

  // enable autocompletion and snippets
  editor.setOptions({
    enableBasicAutocompletion: true,
    enableSnippets: true,
    enableLiveAutocompletion: false
  });
}

SourceEditor.initFind = function(win) {

  win.ThunderHTMLedit_.findInSourceCommand = {
    isCommandEnabled: function(aCommand, editorElement) { return true; },

    getCommandStateParams: function(aCommand, aParams, editorElement) {},
    doCommandParams: function(aCommand, aParams, editorElement) {},

    doCommand: function(aCommand, editorElement) {
      const editor = getEditor(win);
      editor.commands.exec('find', editor);
    }
  };

  win.ThunderHTMLedit_.findAgainInSourceCommand = {
    isCommandEnabled: function(aCommand, editorElement) {
      const editor = getEditor(win);
      return !!(editor) && !!(editor.getLastSearchOptions().needle);
    },

    getCommandStateParams: function(aCommand, aParams, editorElement) {},
    doCommandParams: function(aCommand, aParams, editorElement) {},

    doCommand: function(aCommand, editorElement) {
      const editor = getEditor(win);
      editor.commands.exec(aCommand == 'cmd_findNext' ? 'findprevious' : 'findnext', editor);
    }
  };

  win.ThunderHTMLedit_.findReplaceSourceCommand = {
    isCommandEnabled: function(aCommand, editorElement) { return true; },

    getCommandStateParams: function(aCommand, aParams, editorElement) {},
    doCommandParams: function(aCommand, aParams, editorElement) {},

    doCommand: function(aCommand, editorElement) {
      const editor = getEditor(win);
      editor.commands.exec('replace', editor);
    }
  };

  const controller = Cc['@mozilla.org/embedcomp/base-command-controller;1'].createInstance();
  const editorController = controller.QueryInterface(Ci.nsIControllerContext);
  // editorController.init(null);
  editorController.setCommandContext(win);
  win.controllers.insertControllerAt(0, controller);

  editorCommandTable = controller.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIControllerCommandTable);

  editorCommandTable.registerCommand('cmd_find',          win.ThunderHTMLedit_.findInSourceCommand);
  editorCommandTable.registerCommand('cmd_findNext',      win.ThunderHTMLedit_.findAgainInSourceCommand);
  editorCommandTable.registerCommand('cmd_findPrev',      win.ThunderHTMLedit_.findAgainInSourceCommand);
  editorCommandTable.registerCommand('cmd_findReplace',   win.ThunderHTMLedit_.findReplaceSourceCommand);

  // Note that the M-C editor sets up controllers very late, so we can't register the
  // undo/redo controller here :-(
}

function getEditor(win) {
  if (ThunderHTMLedit.isComposerWindow(win)) {
    const iframe = win.document.getElementById('thunderHTMLedit-content-source-ace');
    return iframe.contentWindow.ace.edit("editor");
  }
  if (ThunderHTMLedit.isSourceEditorWindow(win)) {
    return win.ace.edit("editor");
  }
  return false
}

SourceEditor.getEditor = function (win) {
  return getEditor(win);
}

SourceEditor.sourceEditor = {
  setHTML: function(win, html, resetUndo) {
    try {
      const editor = getEditor(win);

      let onAfterRender = editor.renderer.on("afterRender", function() {
        editor.renderer.off("afterRender", onAfterRender);
        let undoManager = editor.getSession().getUndoManager();
        if (resetUndo) {
            undoManager.reset();
        }
        editor.getSession()._ThunderHTMLedit_NotModified_Count = undoManager.getRevision();
      });

      editor.setValue(html, -1);
      foldAllDataUrls(editor);

    } catch (e) { ThunderHTMLedit.handleException(e); }
  },

  getHTML: function(win) {
    try{
      const editor = getEditor(win);
      return editor.getValue();
    } catch (e) { ThunderHTMLedit.handleException(e); return ''; }
  },

  setNotModified: function(win) {
    try{
      const editor = getEditor(win);
      editor.getSession()._ThunderHTMLedit_NotModified_Count = editor.getSession().getUndoManager().getRevision();
    } catch (e) { ThunderHTMLedit.handleException(e); }
  },

  isModified: function(win) {
    try {
      const editor = getEditor(win);
      return editor.getSession()._ThunderHTMLedit_NotModified_Count != editor.getSession().getUndoManager().getRevision();
    } catch (e) { ThunderHTMLedit.handleException(e); return false; }
  },
  focus: function(win) {
    try {
      getEditor(win).focus();
    } catch (e) { ThunderHTMLedit.handleException(e); }
  },
  foldDataUrls: function(win) {
    try {
      foldAllDataUrls(getEditor(win));
    } catch (e) { ThunderHTMLedit.handleException(e); }
  },
};

function foldAllDataUrls(editor, startRow, endRow) {

  //todo use "tokenizerUpdate" event to  update after chanegs (paste, edits, etc)
  //todo instead calling "foldAllDataUrls", the "tokenizerUpdate" may be enough :-)

  editor.getSession().on("changeFold", function(param) {
    if (param.action == "remove" && param.data.range.dataUri) {
      ThunderHTMLedit.makeTimer().startTimeout(function() {
        const range = param.data.range.clone();
        range.dataUri = JSON.parse(JSON.stringify(param.data.range.dataUri));

        //fold could be removed due to parent fold hid lines - in this case screen coord reange will be empty.
        if (range.toScreenRange(editor.getSession()).isEmpty()) return;

        //fold could be removed due to user edit - in this case token in the range start no longer contain "data:" string
        const iterator = new TokenIterator(editor.getSession(), range.start.row, range.start.column);
        let token = iterator.getCurrentToken();
        if (!token.value.match(/"\s*data:/i)) return;

        const wasCompacted = param.data.range.placeholder == range.dataUri.placeholder_compact;

        if (wasCompacted) {
          range.placeholder = "data:";
          range.end.row = range.start.row;
          range.end.column = range.start.column + range.placeholder.length;
        } else {
          range.placeholder = range.dataUri.placeholder_compact;
          //move forward to find end of range
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
  endRow = endRow || session.getLength();
  startRow = startRow || 0;

  const iterator = new TokenIterator(session, startRow, 0);

  let token;
  let range = new Range(null, null, null, null);
  range.dataUri = {
      placeholder_compact: "",
  };
  while (token = iterator.getCurrentToken()) {
    if (token.type.lastIndexOf("attribute-value.xml") > -1) {
      if (range.start.row == null && token.value.match(/"\s*data:/i)) {
        range.start.row = iterator.getCurrentTokenRow();
        range.start.column = iterator.getCurrentTokenColumn() + 1;

        //skip first characters, to show protocol and filename, and few characters
        const matches = (/"(\s*data:.*?;(?:.*filename=.*?;)?).*/i).exec(token.value);
        range.placeholder = matches[1] + "\u2026";

        range.dataUri.placeholder_compact = range.placeholder;
      }
      if (range.start.row != null && range.end.row == null && token.value.match(/\s*"$/)) {
        range.end.row = iterator.getCurrentTokenRow();
        range.end.column = iterator.getCurrentTokenColumn() + token.value.length - 1;

        if (range.end.row <= endRow && range.start.row >= startRow) {
          try {
            session.addFold("", range);
          } catch(e) {}
        }
      }
    } else {
      if (range.start.row != null) {
        range = new Range(null, null, null, null);
        range.dataUri = { placeholder_compact: "", };
      }
    }
    if (iterator.getCurrentTokenRow() > endRow) {
      break;
    }
    token = iterator.stepForward();
  }
};
// MODULE END

// Since this is no longer a module, make the former SourceEditor variable available in our global object.
ThunderHTMLedit_.SourceEditor = SourceEditor;

/*
 * description: This is JS file for composer window.
 */

var {fixIterator} = ChromeUtils.import('resource:///modules/iteratorUtils.jsm');

window.document.getElementById("msgcomposeWindow").addEventListener("compose-send-message", function (e) {
  // Services.console.logStringMessage("ThunderHTMLedit - compose-send-message");
  if (window.ThunderHTMLedit_.onComposeBodyReadyCalled) {
    try {
      // Synchronize WYSIWYG editor to Source editor, if currently user edit source.
      let isHTML = document.getElementById('content-frame').getAttribute("collapsed");
      if (isHTML) ThunderHTMLedit_.SelectEditMode(0, true);
    } catch (ex) {}
  }
  // See comment below (***) to see why we're doing this.
  ThunderHTMLedit_.WYSIWYG_ChangeCount = -1000;
  ThunderHTMLedit_.Source_ResetUndo = true;
});

ThunderHTMLedit_.CheckLicense = function() {
  const numNoNags = 25;
  const numNags = 5;

  let darktheme = ThunderHTMLeditPrefs.getPref('DarkTheme');
  let licensedTheme = darktheme ? "ace/theme/twilight" : "ace/theme/sqlserver";
  let unLicensedTheme = darktheme ? "ace/theme/sqlserver" : "ace/theme/twilight";
  let useCount = ThunderHTMLeditPrefs.getPref('UseCount');
  useCount++;
  // Don't overflow. Could also test Number.MAX_SAFE_INTEGER.
  if (useCount == 16000000)
    useCount = 0;
  ThunderHTMLeditPrefs.setPref('UseCount', useCount);
  // Services.console.logStringMessage("ThunderHTMLedit - use count " + useCount);

  ThunderHTMLedit_.ClearStatusText = false;

  useCount = useCount % (numNoNags+numNags);
  if (useCount < numNoNags) {
    if (ThunderHTMLedit_.ResetTheme) {
      SourceEditor.getEditor(window).setTheme(licensedTheme);
      ThunderHTMLedit_.ResetTheme = false;
    }
    return;
  }

  // Now really check the license.
  let license = ThunderHTMLeditPrefs.getPref('License');
  if (license != "unlicensed") {
    for (let identity of fixIterator(ThunderHTMLedit.accounts.allIdentities,
                                     Ci.nsIMsgIdentity)) {
      if (!identity.email)
        continue;
      if (license == btoa(identity.email.toLowerCase())) {
        // Services.console.logStringMessage("ThunderHTMLedit - "+identity.email+" - license: "+license);
        if (ThunderHTMLedit_.ResetTheme) {
          SourceEditor.getEditor(window).setTheme(licensedTheme);
          ThunderHTMLedit_.ResetTheme = false;
        }
        return;
      }
    }
  }

  ThunderHTMLedit_.ClearStatusText = true;
  let pleaseDonate = ThunderHTMLedit_.pleaseDonate;
  let statusText = document.getElementById("statusText");
  statusText.setAttribute("label", pleaseDonate);  // TB 68
  statusText.setAttribute("value", pleaseDonate);  // TB 70 and later, bug 1577659.
  statusText.setAttribute("style", "font-weight: bold; color:red");

  // Change the theme.
  if (!ThunderHTMLedit_.ResetTheme)
    SourceEditor.getEditor(window).setTheme(unLicensedTheme);
  ThunderHTMLedit_.ResetTheme = true;
}

ThunderHTMLedit_.PrepareHTMLtab = function() {
  try {
    // (***) This counting bussiness doesn't really work well. If you do:
    // Type in souce, save, switch to HTML, you get count 0.
    // Switch to edit, type, save, switch to HTML, count still 0 after save, so you missed the last bit.
    // That's why ThunderHTMLedit Mark 1 had (expensive) action/transaction listeners.
    // To avoid that, I'll just reset the count in the send/save listener and force a
    // rebuild after each save/send.
    ThunderHTMLedit_.WYSIWYG_ChangeCount = -1000;
    ThunderHTMLedit_.Source_ResetUndo = true;
    ThunderHTMLedit_.ResetTheme = false;

    ThunderHTMLedit_.Undo = window.document.getElementById('menu_undo');
    ThunderHTMLedit_.Redo = window.document.getElementById('menu_redo');

    // Always show the HTML tab, even in a plain text editor.
    // Like this, users will understand that there is really no plain text editor.
    // It's all HTML ;-)
    document.getElementById('thunderHTMLedit-content-tab').removeAttribute('collapsed');

  } catch (e) { ThunderHTMLedit.handleException(e); }
}

ThunderHTMLedit_.SelectEditMode = function(mode, syncOnly) {
//modes: 0 - WYSIWYG, 1- HTML source
  try {
    // Function called when composer window is not constructed completly yet, just after overlay loads.
    if (window.gMsgCompose == null) return;

    // Copy content from WYSIWYG to HTML tab, only when WYSIWYG is changed.
    if (mode == 1) {
      // When using the HTLM tab, check the license.
      ThunderHTMLedit_.CheckLicense();

      if (ThunderHTMLedit_.WYSIWYG_ChangeCount != window.GetCurrentEditor().getModificationCount()) {
        ThunderHTMLedit_.MoveContentFromWYSIWYGtoSource(ThunderHTMLedit_.Source_ResetUndo);
        ThunderHTMLedit_.WYSIWYG_ChangeCount = window.GetCurrentEditor().getModificationCount();
        ThunderHTMLedit_.Source_ResetUndo = false;
      }
      // Switch tabs.
      if(!syncOnly) {
        window.document.getElementById('thunderHTMLedit-content-source-box').removeAttribute('collapsed');
        window.document.getElementById('content-frame').setAttribute('collapsed', true);
        window.document.getElementById('thunderHTMLedit-content-source-ace').focus();

        // Now hack the undo/redo commands.
        ThunderHTMLedit_.Undo.removeAttribute("command");
        ThunderHTMLedit_.Undo.setAttribute("oncommand", "ThunderHTMLedit_.AceUndo();");
        ThunderHTMLedit_.Undo.setAttribute("disabled", false);
        ThunderHTMLedit_.Redo.removeAttribute("command");
        ThunderHTMLedit_.Redo.setAttribute("oncommand", "ThunderHTMLedit_.AceRedo();");
        ThunderHTMLedit_.Redo.setAttribute("disabled", false);
      }
    }

    // User switches back to WYSIWYG, if HTML changed copy it back.
    if (mode == 0) {
      // Clear donation reminder.
      if (ThunderHTMLedit_.ClearStatusText) {
        document.getElementById("statusText").setAttribute("label", "");  // TB 68
        document.getElementById("statusText").setAttribute("value", "");  // TB 70 and later, bug 1577659.
        document.getElementById("statusText").setAttribute("style", "");
      }
      // Services.console.logStringMessage(`ThunderHTMLedit - modified ${SourceEditor.sourceEditor.isModified(window)}`);

      if (SourceEditor.sourceEditor.isModified(window)) {
        ThunderHTMLedit_.MoveContentFromSourceToWYSIWYG();
        SourceEditor.sourceEditor.setNotModified(window);
        ThunderHTMLedit_.WYSIWYG_ChangeCount = window.GetCurrentEditor().getModificationCount();
      }
      // Switch tabs.
      if(!syncOnly) {
        window.document.getElementById('thunderHTMLedit-content-source-box').setAttribute('collapsed', true);
        window.document.getElementById('content-frame').removeAttribute('collapsed');
        window.document.getElementById('content-frame').focus();

        // Restore undo/redo commands.
        ThunderHTMLedit_.Undo.removeAttribute("oncommand");
        ThunderHTMLedit_.Undo.setAttribute("command", "cmd_undo");
        ThunderHTMLedit_.Redo.removeAttribute("oncommand");
        ThunderHTMLedit_.Redo.setAttribute("command", "cmd_redo");
      }
    }

  } catch (e) { ThunderHTMLedit.handleException(e); }
}

ThunderHTMLedit_.AceUndo = function() {
  // Services.console.logStringMessage("ThunderHTMLedit - Undo");
  const editor = SourceEditor.getEditor(window);
  editor.commands.exec('undo', editor);
}

ThunderHTMLedit_.AceRedo = function() {
  // Services.console.logStringMessage("ThunderHTMLedit - Redo");
  const editor = SourceEditor.getEditor(window);
  editor.commands.exec('redo', editor);
}

ThunderHTMLedit_.MoveContentFromSourceToWYSIWYG = function() {
  try{
    // Services.console.logStringMessage("ThunderHTMLedit - setting Source");
    let source = SourceEditor.sourceEditor.getHTML(window);
    // Services.console.logStringMessage("ThunderHTMLedit: "+ source);
    window.gMsgCompose.editor.QueryInterface(Ci.nsIHTMLEditor).rebuildDocumentFromSource(source);
  } catch (e) { ThunderHTMLedit.handleException(e); }
}


ThunderHTMLedit_.MoveContentFromWYSIWYGtoSource = function(resetUndo) {
  try{
    // Services.console.logStringMessage("ThunderHTMLedit - setting HTML");
    let html = window.GetCurrentEditor().outputToString('text/html', 2+134217728 /* OutputFormatted + OutputDisallowLineBreaking */);
    html = html.replace(/\t/g, "&#x09;"); // Make tabs visible, Ace already shows NBSP.
    SourceEditor.sourceEditor.setHTML(window, "<!DOCTYPE html>" + html, resetUndo);
  } catch (e) { ThunderHTMLedit.handleException(e); }
}

// Replace mailbox:///C|/ with  mailbox:///C:/ - note: %7C is | and %3A is :
// JKJK Not sure why this is necessary, but it won't hurt.
ThunderHTMLedit_.fixImagesPaths = function(htmlDocument) {
  let images = htmlDocument.getElementsByTagName('IMG');
  for (let i = 0 ; i < images.length; i++) {
    let node = images[i];
    if (node.hasAttribute('src')) {
      if (node.src.match(/mailbox:\/\/\/(.)(?:%7C|\|)\//i))
        node.src = node.src.replace(/mailbox:\/\/\/(.)(?:%7C|\|)\//i, 'mailbox:///$1%3A/');

      if (node.src.match(/file:\/\/\/(.)(?:%7C|\|)\//i))
        node.src = node.src.replace(/file:\/\/\/(.)(?:%7C|\|)\//i, 'file:///$1%3A/');
    }
  }
}

function useFontPreview() {
  if (typeof useFontPreview.useFontPreview === "undefined")
    useFontPreview.useFontPreview = ThunderHTMLedit.fontEnumerator.EnumerateAllFonts({ value: 0 }).length < 300;
  return useFontPreview.useFontPreview;
}

ThunderHTMLedit_.onComposeBodyReady = function(wnd) {
  try{
    // Note that this is NOT called with using:
    // Thunderbird.exe -compose "to='xx@yy.com',subject='My Subject',format='1',body='This is the HTML body'"
    wnd.ThunderHTMLedit_.onComposeBodyReadyCalled = true;
    wnd.ThunderHTMLedit_.PrepareHTMLtab();

    wnd.setTimeout(function() {
      wnd.document.getElementById('FontFaceSelect').setAttribute('maxwidth', 250);
      let FontFacePopup = wnd.document.getElementById('FontFacePopup')
      let nodes = FontFacePopup.childNodes;

      nodes[1].setAttribute('style', 'font-family: monospace !important;');
      nodes[3].setAttribute('style', 'font-family: Helvetica, Arial, sans-serif !important;');
      nodes[4].setAttribute('style', 'font-family: Times, serif !important;');
      nodes[5].setAttribute('style', 'font-family: Courier, monospace !important;');

      //todo customize fonts AFTER composer is shown, as background task
      if (useFontPreview())
        for (let i = 7; i < nodes.length; ++i) {
          let n = nodes[i];
          n.setAttribute('style', 'font-family: "' + n.value + '" !important;');
          n.tooltipText = n.value;
        }
    }, 0);
  } catch (e) { ThunderHTMLedit.handleException(e); }
}

ThunderHTMLedit_.stateListener = {
  NotifyComposeBodyReady: function() {
    // Services.console.logStringMessage("ThunderHTMLedit - stateListener: NotifyComposeBodyReady");

    ThunderHTMLedit_.onComposeBodyReady(window);

    // Observer to fix some images in WYSIWYG mode.
    let WYSIWYGEditor = document.getElementById('content-frame');

    // This was added to fix the missing cursor for a reply :-(
    // Global from MsgComposeCommands.js.
    switch (gComposeType) {
    case Ci.nsIMsgCompType.Reply:
    case Ci.nsIMsgCompType.ReplyAll:
    case Ci.nsIMsgCompType.ReplyToSender:
    case Ci.nsIMsgCompType.ReplyToGroup:
    case Ci.nsIMsgCompType.ReplyToSenderAndGroup:
    case Ci.nsIMsgCompType.ReplyWithTemplate:
    case Ci.nsIMsgCompType.ReplyToList:
      // No idea why a timeout is required here :-(
      setTimeout(() => window.document.getElementById('content-frame').focus());
    default:
      break;
    }
    WYSIWYGEditor = WYSIWYGEditor.getEditor(WYSIWYGEditor.contentWindow);
    try {
      ThunderHTMLedit_.fixImagesPaths(WYSIWYGEditor.rootElement.ownerDocument);
    } catch (e) { ThunderHTMLedit.handleException(e); }
  }
}

window.document.getElementById("msgcomposeWindow").addEventListener("compose-window-init", function (e) {
  gMsgCompose.RegisterStateListener(ThunderHTMLedit_.stateListener);
  // Services.console.logStringMessage("ThunderHTMLedit - compose-window-init: RegisterStateListener");
});

window.addEventListener('unload', function(event) {
  // Debugging showed that gMsgCompose is null by the time we get here.
  // From TB 48 we can listen to "compose-window-unload" ... if we care.
  if (gMsgCompose) {
    gMsgCompose.UnregisterStateListener(ThunderHTMLedit_.stateListener);
  }
  // Services.console.logStringMessage("ThunderHTMLedit - unload");
});
