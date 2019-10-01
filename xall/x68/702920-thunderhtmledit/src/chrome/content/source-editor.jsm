'use strict';

var {ThunderHTMLedit} = ChromeUtils.import('resource://thunderHTMLedit/content/thunderHTMLedit.jsm');
// var {Services} = ChromeUtils.import('resource://gre/modules/Services.jsm');

const EXPORTED_SYMBOLS = [];

let editorCommandTable = false;
let Range = false;
let TokenIterator = false;

ThunderHTMLedit.modules['source-editor'] = {

  initWindow: function(win) {

    if (ThunderHTMLedit.isSourceEditorWindow(win)) {
      win.ace.require("ace/ext/language_tools");
      win.document.allowUnsafeHTML = true;  // Searchbox uses innerHTML :-(
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
    }
  },

  windowLoaded: function(win) {

    if (ThunderHTMLedit.isSourceEditorWindow(win)) {

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

      const controller = Components.classes['@mozilla.org/embedcomp/base-command-controller;1'].createInstance();
      const editorController = controller.QueryInterface(Components.interfaces.nsIControllerContext);
      // editorController.init(null);
      editorController.setCommandContext(win);
      win.controllers.insertControllerAt(0, controller);

      editorCommandTable = controller.QueryInterface(Components.interfaces.nsIInterfaceRequestor).getInterface(Components.interfaces.nsIControllerCommandTable)

      editorCommandTable.registerCommand('cmd_find',          win.ThunderHTMLedit_.findInSourceCommand);
      editorCommandTable.registerCommand('cmd_findNext',      win.ThunderHTMLedit_.findAgainInSourceCommand);
      editorCommandTable.registerCommand('cmd_findPrev',      win.ThunderHTMLedit_.findAgainInSourceCommand);
      editorCommandTable.registerCommand('cmd_findReplace',   win.ThunderHTMLedit_.findReplaceSourceCommand);

      // Note that the M-C editor sets up controllers very late, so we can't register the
      // undo/redo controller here :-(
    }
  },
};

function getEditor(win) {
  if (ThunderHTMLedit.isComposerWindow(win)) {
    const iframe = win.document.getElementById('thunderHTMLedit-content-source-ace');
    return iframe.contentDocument.defaultView.ace.edit("editor");
  }
  if (ThunderHTMLedit.isSourceEditorWindow(win)) {
    return win.ace.edit("editor");
  }
  return false
}

ThunderHTMLedit.getEditor = function (win) {
  return getEditor(win);
}

ThunderHTMLedit.sourceEditor = {
  initialize: function(win) {
    try {
      const editor = getEditor(win);
      editor.setValue("", -1);

      //read preferences and set theme and options accordingly
      let prefs = {
        wordWrap: true,
        base: { f: 'monospace', fs: 10},
        theme: 'sqlserver'
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
          if ('fs' in prefs.base) editorOptions.fontSize = prefs.base.fs + 'pt';
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

    } catch (e) { ThunderHTMLedit.handleException(e); }
  },

  finalize: function(win) {
    try {
      const editor = getEditor(win);
      editor.setValue("", -1);
    } catch (e) { ThunderHTMLedit.handleException(e); }
  },

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
