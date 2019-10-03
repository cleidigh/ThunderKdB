/* ***** BEGIN LICENSE BLOCK *****
 *
 * Version: GPL 3.0
 *
 * ZNotes
 * Copyright (C) 2012 Alexander Kapitman
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 *
 * The Original Code is ZNotes.
 *
 * Initial Developer(s):
 *   Alexander Kapitman <akman.ru@gmail.com>
 *
 * Portions created by the Initial Developer are Copyright (C) 2012
 * the Initial Developer. All Rights Reserved.
 *
 * Contributor(s):
 *
 * ***** END LICENSE BLOCK ***** */

const EXPORTED_SYMBOLS = ["Editor"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};
if ( !ru.akman.znotes.core ) ru.akman.znotes.core = {};
if ( !ru.akman.znotes.spellchecker ) ru.akman.znotes.spellchecker = {};

Cu.import( "resource://znotes/utils.js", ru.akman.znotes );
Cu.import( "resource://znotes/images.js", ru.akman.znotes );
Cu.import( "resource://znotes/domutils.js", ru.akman.znotes );
Cu.import( "resource://znotes/event.js", ru.akman.znotes.core );
Cu.import( "resource://znotes/prefsmanager.js", ru.akman.znotes );
Cu.import( "resource://gre/modules/InlineSpellChecker.jsm",
  ru.akman.znotes.spellchecker );
Cu.import( "resource://znotes/keyset.js", ru.akman.znotes );

var Editor = function() {

  return function() {

    var Utils = ru.akman.znotes.Utils;
    var Images = ru.akman.znotes.Images;
    var DOMUtils = ru.akman.znotes.DOMUtils;

    var log = Utils.getLogger( "documents.xhtml.editor" );

    // get module `Sample`
    var SampleModule = this.getDocument().getNamespace().Sample;

    // can't be initialized at once
    var Common = null;
    var prefsBundle = null;
    var stringsBundle = null;

    var atomService =
      Cc["@mozilla.org/atom-service;1"]
      .getService( Ci.nsIAtomService );
    var observerService =
      Cc["@mozilla.org/observer-service;1"]
      .getService( Ci.nsIObserverService );
    var ioService =
      Cc["@mozilla.org/network/io-service;1"]
      .getService( Ci.nsIIOService );
    var xmlSerializer =
      Cc["@mozilla.org/xmlextras/xmlserializer;1"]
      .createInstance( Ci.nsIDOMSerializer );
      
    var self = this;

    var EditorException = function( message ) {
      this.name = "EditorException";
      this.message = message;
      this.toString = function() {
        return this.name + ": " + this.message;
      }
    };

    var listeners = [];

    var currentWindow = null;
    var currentDocument = null;
    var currentNote = null;
    var currentMode = null;
    var currentStyle = null;
    var currentPreferences = null;

    var currentBookTagList = null;

    var noteStateListener = null;
    var tagListStateListener = null;
    var documentStateListener = null;

    var isDesignEditingActive = false;
    var isSourceEditingActive = false;
    var isEditorDirty = false;
    var isParseError = false;
    var isParseModified = false;
    var isEditorReady = false;

    var isTagsModeActive = false;
    var tagsSheetURL = "chrome://znotes/skin/documents/xhtml/tags.css";

    var successImage = "chrome://znotes_images/skin/message-32x32.png";
    var successAudio = "chrome://znotes_sounds/skin/success.wav";
    var failImage = "chrome://znotes_images/skin/warning-32x32.png";
    var failAudio = "chrome://znotes_sounds/skin/fail.wav";

    var selectionChunks = null;
    var initialCaretPosition = null;

    var undoState = {
      modifications: null,
      index: -1,
      clear: function() {
        this.modifications = [{
          design: 0,
          source: 0,
          error: isParseError
        }];
        this.index = 0;
      },
      push: function() {
        this.modifications[++this.index] = this.getCurrent();
      },
      getCurrent: function() {
        return {
          design: designEditor.numberOfUndoItems,
          source: sourceEditor.getDoc().historySize().undo,
          error: isParseError
        };
      },
      getLast: function() {
        if ( this.index < 0 ) {
          return this.modifications[0];
        }
        if ( this.index > this.modifications.length - 1 ) {
          return this.modifications[this.modifications.length-1];
        }
        return this.modifications[this.index];
      },
      isDesignModified: function() {
        return this.getLast().design != this.getCurrent().design;
      },
      isSourceModified: function() {
        return this.getLast().source != this.getCurrent().source;
      }
    };

    var nodeIndexiesCache = [];

    var editorTabs = null;
    var editorTabSource = null;

    var designFrame = null;
    var designEditor = null;
    var designEditorTM = null;
    var designToolBox = null;
    var designToolBar1 = null;
    var designToolBar2 = null;

    var sourceFrame = null;
    var sourceWindow = null;
    var sourceEditor = null;
    var sourceEditorLibrary = null;
    var sourceEditorHeight = null;
    var sourceEditorHScrollbarHeight = null;
    var sourcePrintFrame = null;
    var sourceToolBox = null;
    var sourceToolBar1 = null;
    var sourceToolBar2 = null;

    var editMenuPopup = null;
    var editSpellMenuPopup = null;
    var spellCheckerUI = null;
    var editorKeyset = null;

    var fontNameMenuPopup = null;
    var fontNameMenuList = null;
    var fontSizeTextBox = null;
    var formatBlockObject = null;
    var formatBlockMenuPopup = null;
    var formatBlockMenuList = null;

    var foreColorButton = null;
    var backColorButton = null;

    // PREFERENCES

    var prefsMozillaObserver = {
      observe: function( subject, topic, data ) {
        switch ( data ) {
          case "debug":
            Utils.IS_DEBUG_ENABLED = this.branch.getBoolPref( "debug" );
            Common.goSetCommandHidden( "znotes_editordebug_command",
              !Utils.IS_DEBUG_ENABLED, currentWindow );
            Common.goUpdateCommand( "znotes_editordebug_command", editorController.getId(), currentWindow );
            break;
        }
      },
      register: function() {
        var prefService =
          Cc["@mozilla.org/preferences-service;1"]
          .getService( Ci.nsIPrefService );
        this.branch = prefService.getBranch( "extensions.znotes." );
        if ( this.branch ) {
          this.branch.addObserver( "", this, false );
        }
      },
      unregister: function() {
        if ( this.branch ) {
          this.branch.removeObserver( "", this );
        }
      }
    };

    var prefObserver = {
      onPrefChanged: function( event ) {
        var docName = self.getDocument().getName();
        switch( event.data.name ) {
          case "designToolbar1CurrentSet." + docName:
          case "designToolbar2CurrentSet." + docName:
          case "sourceToolbar1CurrentSet." + docName:
          case "sourceToolbar2CurrentSet." + docName:
            restoreToolbarCurrentSet();
            break;
          case "isReplaceBackground":
            Utils.IS_REPLACE_BACKGROUND =
              prefsBundle.getBoolPref( "isReplaceBackground" );
            if ( !isDesignEditingActive && !isSourceEditingActive ) {
              setBackgroundColor();
            }
            break;
        }
      }
    };

    var docPrefObserver = {
      onEditorPreferencesChanged: onEditorPreferencesChanged,
      onDocumentPreferencesChanged: onDocumentPreferencesChanged
    };

    // SPELL CONTROLLER

    var spellEditCommands = {
      "znotes_addtodictionary_command": null,
      "znotes_undoaddtodictionary_command": null,
      "znotes_spellcheckenabled_command": null
    };

    var spellEditController = {
      supportsCommand: function( cmd ) {
        return ( cmd in spellEditCommands ) && isInEditorWindow() &&
               spellCheckerUI;
      },
      isCommandEnabled: function( cmd ) {
        return spellCheckerUI;
      },
      doCommand: function( cmd ) {
        if ( !spellCheckerUI ) {
          return;
        }
        switch ( cmd ) {
          case "znotes_addtodictionary_command":
            spellCheckerUI.addToDictionary();
            break;
          case "znotes_undoaddtodictionary_command":
            spellCheckerUI.undoAddToDictionary();
            break;
          case "znotes_spellcheckenabled_command":
            setCommandState( "znotes_spellcheckenabled_command",
              spellCheckerUI && !spellCheckerUI.enabled );
            designEditor.setSpellcheckUserOverride(
              spellCheckerUI && !spellCheckerUI.enabled );
            break;
        }
      },
      onEvent: function( event ) {
      },
      getName: function() {
        return "EDITOR:XHTML:spellEditController";
      },
      getCommand: function( cmd ) {
        return ( cmd in spellEditCommands ) ?
          currentDocument.getElementById( cmd ) : null;
      },
      updateCommands: function() {
        if ( !currentWindow ) {
          return;
        }
        for ( var cmd in spellEditCommands ) {
          Common.goUpdateCommand( cmd, this.getId(), currentWindow );
        }
      },
      register: function() {
        try {
          currentWindow.controllers.insertControllerAt( 0, this );
          this.getId = function() {
            return currentWindow.controllers.getControllerId( this );
          };
        } catch ( e ) {
          log.warn(
            "An error occurred registering '" + this.getName() +
            "' controller\n" + e
          );
        }
      },
      unregister: function() {
        try {
          currentWindow.controllers.removeController( this );
        } catch ( e ) {
        }
      }
    };

    function updateSpellCommands() {
      spellEditController.updateCommands();
    };

    function onEditSpellMenuPopupShowing() {
      updateEditCommands();
      updateSpellCommands();
      var addtodictionary =
        currentDocument.getElementById( "znotes_addtodictionary_menuitem" );
      var undoaddtodictionary =
        currentDocument.getElementById( "znotes_undoaddtodictionary_menuitem" );
      var spellcheckenabled =
        currentDocument.getElementById( "znotes_spellcheckenabled_menuitem" );
      var spellnosuggestions =
        currentDocument.getElementById( "znotes_spellnosuggestions_menuitem" );
      var spellsuggestionssep =
        currentDocument.getElementById( "znotes_edit_menupopup_spellsuggestions_separator" );
      var spellchecksep =
        currentDocument.getElementById( "znotes_edit_menupopup_spellcheck_separator" );
      var spelldictionariesmenu =
        currentDocument.getElementById( "znotes_spelldictionaries_menu" );
      var spelldictionariespopup =
        currentDocument.getElementById( "znotes_spelldictionaries_menupopup" );
      if ( !spellCheckerUI || !spellCheckerUI.canSpellCheck ) {
        addtodictionary.setAttribute( "hidden", "true" );
        undoaddtodictionary.setAttribute( "hidden", "true" );
        spellcheckenabled.setAttribute( "hidden", "true" );
        spellnosuggestions.setAttribute( "hidden", "true" );
        spellsuggestionssep.setAttribute( "hidden", "true" );
        spellchecksep.setAttribute( "hidden", "true" );
        spelldictionariesmenu.setAttribute( "hidden", "true" );
        return;
      }
      spellCheckerUI.initFromEvent(
        currentDocument.popupRangeParent,
        currentDocument.popupRangeOffset
      );
      var enabled = spellCheckerUI.enabled;
      var showUndo = spellCheckerUI.canSpellCheck && spellCheckerUI.canUndo();
      var overMisspelling = spellCheckerUI.overMisspelling;
      spellcheckenabled.setAttribute( "checked", enabled );
      if ( showUndo ) {
        undoaddtodictionary.removeAttribute( "hidden" );
      } else {
        undoaddtodictionary.setAttribute( "hidden", "true" );
      }
      if ( overMisspelling || showUndo ) {
        spellsuggestionssep.removeAttribute( "hidden" );
      } else {
        spellsuggestionssep.setAttribute( "hidden", "true" );
      }
      var numsug = spellCheckerUI.addSuggestionsToMenu(
        editSpellMenuPopup,
        spellsuggestionssep,
        5 /* max number of suggestions */
      );
      if ( overMisspelling && numsug == 0 ) {
        spellnosuggestions.removeAttribute( "hidden" );
      } else {
        spellnosuggestions.setAttribute( "hidden", "true" );
      }
      if ( overMisspelling ) {
        addtodictionary.removeAttribute( "hidden" );
      } else {
        addtodictionary.setAttribute( "hidden", "true" );
      }
      var numdicts = spellCheckerUI.addDictionaryListToMenu(
        spelldictionariespopup,
        null
      );
      if ( enabled && numdicts > 1 ) {
        spelldictionariesmenu.removeAttribute( "hidden" );
      } else {
        spelldictionariesmenu.setAttribute( "hidden", "true" );
      }
    };

    function onEditSpellMenuPopupHiding() {
      if ( !spellCheckerUI ) {
        return;
      }
      spellCheckerUI.clearSuggestionsFromMenu();
      spellCheckerUI.clearDictionaryListFromMenu();
    };

    // EDIT CONTROLLER

    var editCommands = {
      "znotes_undo_command": null,
      "znotes_redo_command": null,
      "znotes_cut_command": null,
      "znotes_copy_command": null,
      "znotes_paste_command": null,
      "znotes_delete_command": null,
      "znotes_selectall_command": null
    };

    var editController = {
      supportsCommand: function( cmd ) {
        return ( cmd in editCommands ) && isInEditorWindow();
      },
      isCommandEnabled: function( cmd ) {
        if ( !currentNote || currentNote.isLoading() ) {
          return false;
        }
        var isEnabled, canUndo, canRedo, selection, clipboard;
        switch ( cmd ) {
          case "znotes_undo_command":
            if ( isDesignEditingActive ) {
              isEnabled = {};
              canUndo = {};
              designEditor.canUndo( isEnabled, canUndo );
              return canUndo.value;
            } else if ( isSourceEditingActive ) {
              return sourceEditor.getDoc().historySize().undo;
            }
            return false;
          case "znotes_redo_command":
            if ( isDesignEditingActive ) {
              isEnabled = {};
              canRedo = {};
              designEditor.canRedo( isEnabled, canRedo );
              return canRedo.value;
            } else if ( isSourceEditingActive ) {
              return sourceEditor.getDoc().historySize().redo;
            }
            return false;
          case "znotes_paste_command":
            if ( isDesignEditingActive ) {
              return !isParseError && designEditor.canPaste( 1 );
            } else if ( isSourceEditingActive ) {
              clipboard =
                Cc['@mozilla.org/widget/clipboard;1']
                .createInstance( Ci.nsIClipboard );
              return clipboard.hasDataMatchingFlavors(
                [ "text/unicode" ], 1, clipboard.kGlobalClipboard );
            }
            return false;
          case "znotes_copy_command":
            if ( isSourceEditingActive ) {
              return sourceEditor.getDoc().somethingSelected();
            }
            selection = designFrame.contentWindow.getSelection();
            return selection && !selection.isCollapsed;
          case "znotes_cut_command":
          case "znotes_delete_command":
            if ( isSourceEditingActive ) {
              return sourceEditor.getDoc().somethingSelected();
            } else if ( isDesignEditingActive ) {
              selection = designFrame.contentWindow.getSelection();
              return !isParseError && selection && !selection.isCollapsed;
            }
            return false;
          case "znotes_selectall_command":
            return true;
        }
        return false;
      },
      doCommand: function( cmd ) {
        switch ( cmd ) {
          case "znotes_undo_command":
            doUndo();
            break;
          case "znotes_redo_command":
            doRedo();
            break;
          case "znotes_selectall_command":
            doSelectAll();
            break;
          case "znotes_paste_command":
            doPaste();
            break;
          case "znotes_copy_command":
            doCopy();
            break;
          case "znotes_cut_command":
            doCut();
            break;
          case "znotes_delete_command":
            doDelete();
            break;
        }
        onSelectionChanged();
      },
      onEvent: function( event ) {
      },
      getName: function() {
        return "EDITOR:XHTML:editController";
      },
      getCommand: function( cmd ) {
        return ( cmd in editCommands ) ?
          currentDocument.getElementById( cmd ) : null;
      },
      updateCommands: function() {
        if ( !currentWindow ) {
          return;
        }
        for ( var cmd in editCommands ) {
          Common.goUpdateCommand( cmd, this.getId(), currentWindow );
        }
      },
      register: function() {
        try {
          currentWindow.controllers.insertControllerAt( 0, this );
          this.getId = function() {
            return currentWindow.controllers.getControllerId( this );
          };
        } catch ( e ) {
          log.warn(
            "An error occurred registering '" + this.getName() +
            "' controller\n" + e
          );
        }
      },
      unregister: function() {
        try {
          currentWindow.controllers.removeController( this );
        } catch ( e ) {
        }
      }
    };

    function updateEditCommands() {
      editController.updateCommands();
    };

    function onEditMenuPopupShowing() {
      updateEditCommands();
    };

    function doSelectAll() {
      if ( isDesignEditingActive ) {
        designEditor.selectAll();
      } else if ( isSourceEditingActive ) {
        var doc = sourceEditor.getDoc();
        var lastLineIndex = doc.lastLine();
        doc.setSelection(
          { line: 0, ch: 0 },
          { line: lastLineIndex , ch: doc.getLine( lastLineIndex ).length }
        );
      } else {
        designFrame.contentWindow.getSelection().selectAllChildren(
          designFrame.contentDocument.body
        );
      }
      return true;
    };

    function doCopy() {
      var info, data = [];
      try {
        var clipboard =
          Cc['@mozilla.org/widget/clipboard;1']
          .createInstance( Ci.nsIClipboard );
        var transferable = Components.Constructor(
          "@mozilla.org/widget/transferable;1",
          "nsITransferable"
        )();
        transferable.init( currentWindow.QueryInterface(
          Ci.nsIInterfaceRequestor ).getInterface( Ci.nsIWebNavigation ) );
        if ( isSourceEditingActive ) {
          info = {
            flavor: "text/unicode",
            srcstr: sourceEditor.getDoc().getSelection(),
            supstr: Components.Constructor(
              "@mozilla.org/supports-string;1",
              "nsISupportsString"
            )()
          };
          info.supstr.data = info.srcstr;
          data.push( info );
        } else {
          var fragment = DOMUtils.cloneSelection( designFrame.contentWindow );
          info = {
            flavor: "text/unicode",
            srcstr: fragment.textContent,
            supstr: Components.Constructor(
              "@mozilla.org/supports-string;1",
              "nsISupportsString"
            )()
          };
          info.supstr.data = info.srcstr;
          data.push( info );
          info = {
            flavor: "text/html",
            srcstr: xmlSerializer.serializeToString( fragment ),
            supstr: Components.Constructor(
              "@mozilla.org/supports-string;1",
              "nsISupportsString"
            )()
          };
          info.supstr.data = info.srcstr;
          data.push( info );
        }
        for ( var i = 0; i < data.length; i++ ) {
          transferable.addDataFlavor( data[i].flavor );
          transferable.setTransferData(
            data[i].flavor, data[i].supstr, data[i].srcstr.length * 2 );
        }
        if ( data.length ) {
          clipboard.setData( transferable, null, clipboard.kGlobalClipboard );
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      }
      return true;
    };

    function doCut() {
      if ( isDesignEditingActive ) {
        designEditor.cut();
      } else if ( isSourceEditingActive ) {
        doCopy();
        doDelete();
      }
      return true;
    };

    function doPaste() {
      if ( isDesignEditingActive ) {
        designEditor.paste( 1 );
      } else if ( isSourceEditingActive ) {
        try {
          var clipboard =
            Cc['@mozilla.org/widget/clipboard;1']
            .createInstance( Ci.nsIClipboard );
          var transferable = Components.Constructor(
            "@mozilla.org/widget/transferable;1",
            "nsITransferable"
          )();
          transferable.init( currentWindow.QueryInterface(
            Ci.nsIInterfaceRequestor ).getInterface( Ci.nsIWebNavigation ) );
          transferable.addDataFlavor( "text/unicode" );
          clipboard.getData( transferable, clipboard.kGlobalClipboard );
          var strData = {}, strLength = {};
          transferable.getTransferData( "text/unicode", strData, strLength );
          if ( strData ) {
            var textData =
              strData.value.QueryInterface( Ci.nsISupportsString ).data;
            sourceEditor.getDoc().replaceSelection( textData, "around" );
          }
        } catch ( e ) {
          log.warn( e + "\n" + Utils.dumpStack() );
        }
      }
      return true;
    };

    function doUndo() {
      var lastUndoState = undoState.getLast();
      var currentUndoState = undoState.getCurrent();
      var count;
      setDocumentEditable( true );
      if ( isDesignEditingActive ) {
        designEditor.undo( 1 );
        if ( currentUndoState.design == lastUndoState.design ) {
          undoState.index--;
          count = lastUndoState.source - undoState.getLast().source;
          for ( var i = 0; i < count; i++ ) {
            sourceEditor.getDoc().undo();
          }
        }
      } else if ( isSourceEditingActive ) {
        sourceEditor.getDoc().undo();
        if ( currentUndoState.source == lastUndoState.source ) {
          undoState.index--;
          count = lastUndoState.design - undoState.getLast().design;
          designEditor.undo( count );
        }
      }
      isParseError = undoState.getLast().error;
      setDocumentEditable( !isParseError );
      return true;
    };

    function doRedo() {
      var lastUndoState = undoState.getLast();
      var currentUndoState, count;
      setDocumentEditable( true );
      if ( isDesignEditingActive ) {
        designEditor.redo( 1 );
        currentUndoState = undoState.getCurrent();
        if ( ( ( undoState.index + 1 ) < undoState.modifications.length ) &&
             undoState.modifications[undoState.index + 1].design == currentUndoState.design ) {
          undoState.index++;
          count = undoState.getLast().source - lastUndoState.source;
          for ( var i = 0; i < count; i++ ) {
            sourceEditor.getDoc().redo();
          }
        }
      } else if ( isSourceEditingActive ) {
        sourceEditor.getDoc().redo();
        currentUndoState = undoState.getCurrent();
        if ( ( ( undoState.index + 1 ) < undoState.modifications.length ) &&
             undoState.modifications[undoState.index + 1].source == currentUndoState.source ) {
          undoState.index++;
          count = undoState.getLast().design - lastUndoState.design;
          designEditor.redo( count );
        }
      }
      isParseError = undoState.getLast().error;
      setDocumentEditable( !isParseError );
      return true;
    };

    function doDelete() {
      if ( isDesignEditingActive ) {
        designEditor.deleteSelection( null, null );
      } else if ( isSourceEditingActive ) {
        sourceEditor.getDoc().replaceSelection( "", "start" );
      }
      return true;
    };

    // EDITOR CONTROLLER

    var editorCommands = {
      "znotes_close_command": null,
      "znotes_editorcustomizetoolbar_command": null,
      "znotes_bold_command": null,
      "znotes_italic_command": null,
      "znotes_underline_command": null,
      "znotes_strikethrough_command": null,
      "znotes_forecolor_command": null,
      "znotes_forecolordelete_command": null,
      "znotes_backcolor_command": null,
      "znotes_backcolordelete_command": null,
      "znotes_justifycenter_command": null,
      "znotes_justifyleft_command": null,
      "znotes_justifyright_command": null,
      "znotes_justifyfull_command": null,
      "znotes_subscript_command": null,
      "znotes_superscript_command": null,
      "znotes_indent_command": null,
      "znotes_outdent_command": null,
      "znotes_link_command": null,
      "znotes_unlink_command": null,
      "znotes_removeformat_command": null,
      "znotes_insertorderedlist_command": null,
      "znotes_insertunorderedlist_command": null,
      "znotes_inserthorizontalrule_command": null,
      "znotes_inserttable_command": null,
      "znotes_insertimage_command": null,
      "znotes_insertparagraph_command": null,
      "znotes_toggletagsmode_command": null,
      "znotes_importresources_command": null,
      "znotes_sourcebeautify_command": null,
      "znotes_editordebug_command": null,
    };

    var editorController = {
      supportsCommand: function( cmd ) {
        return ( cmd in editorCommands );
      },
      isCommandEnabled: function( cmd ) {
        if ( !currentNote || currentNote.isLoading() ) {
          return false;
        }
        switch ( cmd ) {
          case "znotes_close_command":
          case "znotes_editorcustomizetoolbar_command":
            return isDesignEditingActive || isSourceEditingActive;
          case "znotes_bold_command":
          case "znotes_italic_command":
          case "znotes_underline_command":
          case "znotes_strikethrough_command":
          case "znotes_forecolor_command":
          case "znotes_forecolordelete_command":
          case "znotes_backcolor_command":
          case "znotes_backcolordelete_command":
          case "znotes_justifycenter_command":
          case "znotes_justifyleft_command":
          case "znotes_justifyright_command":
          case "znotes_justifyfull_command":
          case "znotes_subscript_command":
          case "znotes_superscript_command":
          case "znotes_indent_command":
          case "znotes_outdent_command":
          case "znotes_link_command":
          case "znotes_unlink_command":
          case "znotes_removeformat_command":
          case "znotes_insertorderedlist_command":
          case "znotes_insertunorderedlist_command":
          case "znotes_inserthorizontalrule_command":
          case "znotes_inserttable_command":
          case "znotes_insertimage_command":
          case "znotes_insertparagraph_command":
          case "znotes_toggletagsmode_command":
          case "znotes_editordebug_command":
            return isDesignEditingActive;
          case "znotes_sourcebeautify_command":
            return isSourceEditingActive && sourceEditor &&
              sourceEditor.getDoc().somethingSelected();
          case "znotes_importresources_command":
            return !!currentNote && !isSourceEditingActive && !isParseError;
        }
        return false;
      },
      doCommand: function( cmd ) {
        switch ( cmd ) {
          case "znotes_editordebug_command":
            doDebug();
            break;
          case "znotes_close_command":
            doClose();
            break;
          case "znotes_bold_command":
            doBold();
            break;
          case "znotes_italic_command":
            doItalic();
            break;
          case "znotes_underline_command":
            doUnderline();
            break;
          case "znotes_strikethrough_command":
            doStrike();
            break;
          case "znotes_forecolor_command":
            doForeColor();
            break;
          case "znotes_forecolordelete_command":
            doForeColorDelete();
            break;
          case "znotes_backcolor_command":
            doBackColor();
            break;
          case "znotes_backcolordelete_command":
            doBackColorDelete();
            break;
          case "znotes_justifycenter_command":
            doJustifyCenter();
            break;
          case "znotes_justifyleft_command":
            doJustifyLeft();
            break;
          case "znotes_justifyright_command":
            doJustifyRight();
            break;
          case "znotes_justifyfull_command":
            doJustifyFull();
            break;
          case "znotes_subscript_command":
            doSubScript();
            break;
          case "znotes_superscript_command":
            doSuperScript();
            break;
          case "znotes_indent_command":
            doIndent();
            break;
          case "znotes_outdent_command":
            doOutdent();
            break;
          case "znotes_link_command":
            doLink();
            break;
          case "znotes_unlink_command":
            doUnlink();
            break;
          case "znotes_removeformat_command":
            doRemoveFormat();
            break;
          case "znotes_insertorderedlist_command":
            doInsertOL();
            break;
          case "znotes_insertunorderedlist_command":
            doInsertUL();
            break;
          case "znotes_inserthorizontalrule_command":
            doInsertHR();
            break;
          case "znotes_inserttable_command":
            doInsertTable();
            break;
          case "znotes_insertimage_command":
            doInsertImage();
            break;
          case "znotes_insertparagraph_command":
            doInsertParagraph();
            break;
          case "znotes_toggletagsmode_command":
            doToggleTagsMode();
            break;
          case "znotes_importresources_command":
            doImportResources();
            break;
          case "znotes_sourcebeautify_command":
            doSourceBeautify();
            break;
          case "znotes_editorcustomizetoolbar_command":
            currentWindow.openDialog(
              "chrome://global/content/customizeToolbar.xul",
              "",
              "chrome,all,dependent,centerscreen",
              isSourceEditingActive ? sourceToolBox : designToolBox
            ).focus();
            break;
        }
        onSelectionChanged();
      },
      onEvent: function( event ) {
      },
      getName: function() {
        return "EDITOR:XHTML";
      },
      getCommand: function( cmd ) {
        return ( cmd in editorCommands ) ?
          currentDocument.getElementById( cmd ) : null;
      },
      updateCommands: function() {
        if ( !currentWindow ) {
          return;
        }
        for ( var cmd in editorCommands ) {
          Common.goUpdateCommand( cmd, this.getId(), currentWindow );
        }
      },
      register: function() {
        try {
          currentWindow.controllers.insertControllerAt( 0, this );
          this.getId = function() {
            return currentWindow.controllers.getControllerId( this );
          };
        } catch ( e ) {
          log.warn(
            "An error occurred registering '" + this.getName() +
            "' controller\n" + e
          );
        }
      },
      unregister: function() {
        try {
          currentWindow.controllers.removeController( this );
        } catch ( e ) {
          log.warn(
            "An error occurred unregistering '" + this.getName() +
            "' controller\n" + e
          );
        }
      }
    };

    function updateEditorCommands() {
      editorController.updateCommands();
    };

    // COMMON COMMANDS

    function doClose() {
      if ( stop() ) {
        switchMode( "viewer" );
      }
    };

    function doImportResources() {
      saveResources( currentMode === "editor" ?  designEditor.document :
        designFrame.contentDocument, currentNote );
    };
    
    function saveResources( doc, note ) {
      var contentEntries, contentFile, contentDirectory;
      var res = {
        value: null,
        status: 0
      };
      try {
        contentEntries = Utils.getEntriesToSaveContent(
          "." + note.getExtension(), "_files" );
        contentFile = contentEntries.fileEntry;
        contentDirectory = contentEntries.directoryEntry;
        currentWindow.openDialog(
          "chrome://znotes/content/clipperdialog.xul",
          "",
          "chrome,dialog=yes,modal=yes,centerscreen,resizable=yes",
          {
            document: doc,
            result: res,
            file: contentFile,
            directory: contentDirectory,
            /*
            0x00000001 +SAVE_SCRIPTS
            0x00000010 +SAVE_FRAMES
            0x00000100 -SAVE_FRAMES_IN_SEPARATE_DIRECTORY
            0x00001000 +PRESERVE_HTML5_TAGS
            0x00010000 +SAVE_STYLES
            0x00100000 -SAVE_INLINE_RESOURCES_IN_SEPARATE_FILES
            0x01000000 -INLINE_STYLESHEETS_IN_DOCUMENT
            0x10000000 -SAVE_ACTIVE_RULES_ONLY
            */
            flags: 0x00011011,
            baseURI: note.getBaseURI(),
            onstart: function( result ) {
              note.setLoading( true );
            },
            onstop: function( result ) {
              var data, node, position;
              if ( result.count ) {
                try {
                  note.loadContentDirectory( contentDirectory );
                } catch ( e ) {
                  log.warn( e + "\n" + Utils.dumpStack() );
                }
                if ( currentMode === "editor" ) {
                  data = self.getDocument().serializeToString(
                    result.value, note.getURI(), note.getBaseURI() );
                  if ( sourceEditor.getValue() !== data ) {
                    patchDesign( result.value );
                  }
                } else {
                  try {
                    note.importDocument( result.value );
                  } catch ( e ) {
                    log.warn( e + "\n" + Utils.dumpStack() );
                  }
                }
              }
              note.setLoading( false );
              try {
                if ( contentFile.exists() ) {
                  contentFile.remove( false );
                }
                if ( contentDirectory.exists() ) {
                  contentDirectory.remove( true );
                }
              } catch ( e ) {
                log.warn( e + "\n" + Utils.dumpStack() );
              }
              if ( result.status ) {
                notifyFail( note.getName(), result.count, result.errors );
              } else {
                notifySuccess( note.getName(), result.count );
              }
            }
          }
        ).focus();
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      }
    };
    
    function notifyFail( title, count, errors ) {
      if ( Utils.IS_CLIPPER_PLAY_SOUND ) {
        Utils.play( failAudio );
      }
      Utils.showPopup( failImage,
        getEditorFormattedString( "clipper.fail", [ errors, count ] ),
        title, true );
    };
    
    function notifySuccess( title, count ) {
      if ( Utils.IS_CLIPPER_PLAY_SOUND ) {
        Utils.play( successAudio );
      }
      Utils.showPopup( successImage,
        getEditorFormattedString( "clipper.success", [ count ] ),
        title, true );
    };
    
    // DESIGN COMMANDS

    function doToggleTagsMode() {
      isTagsModeActive ? switchTagsOff() : switchTagsOn();
    };
    
    // name: font-family
    // inherited: yes
    // computed value: as specified
    //                 [ family-name | generic-family ][, ...]
    // initial: depends on user agent
    // comment:
    function doFontFamily() {
      var fontMapping = Utils.getDefaultFontMapping();
      var fontFamily, value = fontNameMenuList.selectedItem.value;
      try {
        designEditor.beginTransaction();
        var node, nodes = splitSelectionNodes( "span" );
        for ( var i = 0; i < nodes.length; i++ ) {
          node = nodes[i].node;
          switch ( nodes[i].kind ) {
            case 0:
              // node is an element node and does not contain any child nodes
              break;
            case 2:
              // node is an element node and contains exactly one child text node
              removeCSSInlineProperty( node, "font-family" );
              fontFamily = getComputedStyle( node ).fontFamily;
              if ( fontFamily.charAt( 0 ) == "'" ||
                   fontFamily.charAt( 0 ) == '"' ) {
                fontFamily = fontFamily.substring( 1, fontFamily.length - 1 );
              }
              if ( fontFamily in fontMapping.generics ) {
                fontFamily = fontMapping.generics[ fontFamily ];
              }
              if ( fontFamily !== value ) {
                setCSSInlineProperty( node, "font-family", value );
              }
              if ( node.nodeName === "span" &&
                   !node.hasAttribute( "style" ) &&
                   !node.hasAttribute( "id" ) ) {
                stripNode( node );
              }
              break;
            case 4:
              // node is a text node, but this shouldn't have happened here
              log.debug(
                "*** Processing node is text node!\n" +
                "*** surround: 'span'\n" +
                "*** node: '" +
                  node.textContent.replace( /\n/img, "\\n" ) + "'\n" +
                "*** callee: " + Components.stack.name + "()"
              );
              break;
          }
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
    };

    // name: font-size
    // inherited: yes
    // computed value: absolute length in px
    // initial: medium
    // comment:
    function doFontSize() {
      var fontSize, value = parseInt( fontSizeTextBox.value );
      try {
        designEditor.beginTransaction();
        var node, nodes = splitSelectionNodes( "span" );
        for ( var i = 0; i < nodes.length; i++ ) {
          node = nodes[i].node;
          switch ( nodes[i].kind ) {
            case 0:
              // node is an element node and does not contain any child nodes
              break;
            case 2:
              // node is an element node and contains exactly one child text node
              removeCSSInlineProperty( node, "font-size" );
              fontSize = getComputedStyle( node ).fontSize;
              fontSize = parseInt(
                fontSize.substring( 0, fontSize.indexOf( "px" ) ) );
              if ( fontSize !== value ) {
                setCSSInlineProperty( node, "font-size", value + "px" );
              }
              if ( node.nodeName === "span" &&
                   !node.hasAttribute( "style" ) &&
                   !node.hasAttribute( "id" ) ) {
                stripNode( node );
              }
              break;
            case 4:
              // node is a text node, but this shouldn't have happened here
              log.debug(
                "*** Processing node is text node!\n" +
                "*** surround: 'span'\n" +
                "*** node: '" +
                  node.textContent.replace( /\n/img, "\\n" ) + "'\n" +
                "*** callee: " + Components.stack.name + "()"
              );
              break;
          }
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
    };

    // name: color
    // inherited: yes
    // computed value: as specified
    // initial: depends on user agent
    // comment:
    function doForeColor() {
      var params = {
        input: {
          title: getString( "body.colorselectdialog.title" ),
          message: getString( "body.forecolorselectdialog.message" ),
          color: "#000000"
        },
        output: null
      };
      currentWindow.openDialog(
        "chrome://znotes/content/colorselectdialog.xul",
        "",
        "chrome,dialog=yes,modal=yes,centerscreen,resizable=yes",
        params
      ).focus();
      if ( !params.output ) {
        return;
      }
      var color, rgb, value = params.output.color;
      try {
        designEditor.beginTransaction();
        var node, nodes = splitSelectionNodes( "span" );
        for ( var i = 0; i < nodes.length; i++ ) {
          node = nodes[i].node;
          switch ( nodes[i].kind ) {
            case 0:
              // node is an element node and does not contain any child nodes
              break;
            case 2:
              // node is an element node and contains exactly one child text node
              removeCSSInlineProperty( node, "color" );
              color = getComputedStyle( node ).color;
              rgb = /\s*rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*/i.exec(
                color );
              if ( rgb ) {
                color = Utils.RGB2HEX(
                  parseInt( rgb[1] ),
                  parseInt( rgb[2] ),
                  parseInt( rgb[3] )
                );
              }
              if ( color !== value ) {
                setCSSInlineProperty( node, "color", value );
              }
              if ( node.nodeName === "span" &&
                   !node.hasAttribute( "style" ) &&
                   !node.hasAttribute( "id" ) ) {
                stripNode( node );
              }
              break;
            case 4:
              // node is a text node, but this shouldn't have happened here
              log.debug(
                "*** Processing node is a text node!\n" +
                "*** surround: 'span'\n" +
                "*** node: '" +
                  node.textContent.replace( /\n/img, "\\n" ) + "'\n" +
                "*** callee: " + Components.stack.name + "()"
              );
              break;
          }
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
    };

    // name: color
    // inherited: yes
    // computed value: as specified
    // initial: depends on user agent
    // comment:
    function doForeColorDelete() {
      try {
        designEditor.beginTransaction();
        var node, nodes = splitSelectionNodes( /* no surround */ );
        for ( var i = 0; i < nodes.length; i++ ) {
          node = nodes[i].node;
          switch ( nodes[i].kind ) {
            case 0:
              // node is an element node and does not contain any child nodes
              break;
            case 2:
              // node is an element node and contains exactly one child text node
              removeCSSInlineProperty( node, "color" );
              if ( node.nodeName === "span" &&
                   !node.hasAttribute( "style" ) &&
                   !node.hasAttribute( "id" ) ) {
                stripNode( node );
              }
              break;
            case 4:
              // node is a text node and exactly has one or more siblings
              break;
          }
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
    };

    // name: background-color
    // inherited: no
    // computed value: as specified
    // initial: transparent
    // comment:
    function doBackColor() {
      var params = {
        input: {
          title: getString( "body.colorselectdialog.title" ),
          message: getString( "body.backcolorselectdialog.message" ),
          color: "#000000"
        },
        output: null
      };
      currentWindow.openDialog(
        "chrome://znotes/content/colorselectdialog.xul",
        "",
        "chrome,dialog=yes,modal=yes,centerscreen,resizable=yes",
        params
      ).focus();
      if ( !params.output ) {
        return;
      }
      var color, rgb, value = params.output.color;
      try {
        designEditor.beginTransaction();
        var node, nodes = splitSelectionNodes( "span" );
        var element;
        for ( var i = 0; i < nodes.length; i++ ) {
          node = nodes[i].node;
          switch ( nodes[i].kind ) {
            case 0:
              // node is an element node and does not contain any child nodes
              break;
            case 2:
              // node is an element node and contains exactly one child text node
              removeCSSInlineProperty( node, "background-color" );
              element = node;
              while ( element &&
                      element.nodeType === Ci.nsIDOMNode.ELEMENT_NODE ) {
                color = getComputedStyle( element ).backgroundColor;
                if ( color !== "transparent" ) {
                  break;
                }
                element = element.parentNode;
              }
              if ( color === "transparent" ) {
                color = "rgb( 255, 255, 255 )";
              }
              rgb = /\s*rgb\s*\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)\s*/i.exec(
                color );
              if ( rgb ) {
                color = Utils.RGB2HEX(
                  parseInt( rgb[1] ),
                  parseInt( rgb[2] ),
                  parseInt( rgb[3] )
                );
              }
              if ( color !== value ) {
                setCSSInlineProperty( node, "background-color", value );
              }
              if ( node.nodeName === "span" &&
                   !node.hasAttribute( "style" ) &&
                   !node.hasAttribute( "id" ) ) {
                stripNode( node );
              }
              break;
            case 4:
              // node is a text node, but this shouldn't have happened here
              log.debug(
                "*** Processing node is a text node!\n" +
                "*** surround: 'span'\n" +
                "*** node: '" +
                  node.textContent.replace( /\n/img, "\\n" ) + "'\n" +
                "*** callee: " + Components.stack.name + "()"
              );
              break;
          }
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
    };

    // name: background-color
    // inherited: no
    // computed value: as specified
    // initial: transparent
    // comment:
    function doBackColorDelete() {
      try {
        designEditor.beginTransaction();
        var node, nodes = splitSelectionNodes( /* no surround */ );
        for ( var i = 0; i < nodes.length; i++ ) {
          node = nodes[i].node;
          switch ( nodes[i].kind ) {
            case 0:
              // node is an element node and does not contain any child nodes
              break;
            case 2:
              // node is an element node and contains exactly one child text node
              removeCSSInlineProperty( node, "background-color" );
              if ( node.nodeName === "span" &&
                   !node.hasAttribute( "style" ) &&
                   !node.hasAttribute( "id" ) ) {
                stripNode( node );
              }
              break;
            case 4:
              // node is a text node and exactly has one or more siblings
              break;
          }
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
    };

    // name: font-weight
    // inherited: yes
    // computed value: '100' - '900'
    // initial: normal === '400'
    // comment: bold === '700'
    function doBold() {
      var fontWeight, flag = !getCommandState( "znotes_bold_command" );
      try {
        designEditor.beginTransaction();
        var node, nodes = splitSelectionNodes( "span" );
        for ( var i = 0; i < nodes.length; i++ ) {
          node = nodes[i].node;
          switch ( nodes[i].kind ) {
            case 0:
              // node is an element node and does not contain any child nodes
              break;
            case 2:
              // node is an element node and contains exactly one child text node
              removeCSSInlineProperty( node, "font-weight" );
              fontWeight = getComputedStyle( node ).fontWeight;
              if ( flag ) {
                if ( fontWeight !== "700" ) {
                  setCSSInlineProperty( node, "font-weight", "bold" );
                }
              } else {
                if ( fontWeight !== "400" ) {
                  setCSSInlineProperty( node, "font-weight", "normal" );
                }
              }
              if ( node.nodeName === "span" &&
                   !node.hasAttribute( "style" ) &&
                   !node.hasAttribute( "id" ) ) {
                stripNode( node );
              }
              break;
            case 4:
              // node is a text node, but this shouldn't have happened here
              log.debug(
                "*** Processing node is a text node!\n" +
                "*** surround: 'span'\n" +
                "*** node: '" +
                  node.textContent.replace( /\n/img, "\\n" ) + "'\n" +
                "*** callee: " + Components.stack.name + "()"
              );
              break;
          }
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
    };

    // name: font-style
    // inherited: yes
    // computed value: as specified
    //                 normal | italic | oblique
    // initial: normal
    // comment:
    function doItalic() {
      var fontStyle, flag = !getCommandState( "znotes_italic_command" );
      try {
        designEditor.beginTransaction();
        var node, nodes = splitSelectionNodes( "span" );
        for ( var i = 0; i < nodes.length; i++ ) {
          node = nodes[i].node;
          switch ( nodes[i].kind ) {
            case 0:
              // node is an element node and does not contain any child nodes
              break;
            case 2:
              // node is an element node and contains exactly one child text node
              removeCSSInlineProperty( node, "font-style" );
              fontStyle = getComputedStyle( node ).fontStyle;
              if ( flag ) {
                if ( fontStyle !== "italic" ) {
                  setCSSInlineProperty( node, "font-style", "italic" );
                }
              } else {
                if ( fontStyle !== "normal" ) {
                  setCSSInlineProperty( node, "font-style", "normal" );
                }
              }
              if ( node.nodeName === "span" &&
                   !node.hasAttribute( "style" ) &&
                   !node.hasAttribute( "id" ) ) {
                stripNode( node );
              }
              break;
            case 4:
              // node is a text node, but this shouldn't have happened here
              log.debug(
                "*** Processing node is a text node!\n" +
                "*** surround: 'span'\n" +
                "*** node: '" +
                  node.textContent.replace( /\n/img, "\\n" ) + "'\n" +
                "*** callee: " + Components.stack.name + "()"
              );
              break;
          }
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
    };

    // name: text-decoration
    // inherited: no
    // computed value: as specified
    //                 none | [ underline || overline || line-through || blink ]
    // initial: none
    // comment: strange behavior ( inherited )
    function doUnderline() {
      var textDecoration, flag = !getCommandState( "znotes_underline_command" );
      try {
        designEditor.beginTransaction();
        var node, nodes = splitSelectionNodes( "span" );
        for ( var i = 0; i < nodes.length; i++ ) {
          node = nodes[i].node;
          switch ( nodes[i].kind ) {
            case 0:
              // node is an element node and does not contain any child nodes
              break;
            case 2:
              // node is an element node and contains exactly one child text node
              removeCSSInlinePropertyValue( node,
                "text-decoration", "underline" );
              textDecoration =
                getComputedStyle( node ).textDecoration.split( /\s+/ );
              if ( flag ) {
                if ( textDecoration.indexOf( "underline" ) == -1 ) {
                  setCSSInlinePropertyValue( node,
                    "text-decoration", "underline" );
                }
              } else {
                if ( textDecoration.indexOf( "underline" ) != -1 ) {
                  setCSSInlinePropertyValue( node,
                    "text-decoration", "none" );
                }
              }
              if ( node.nodeName === "span" &&
                   !node.hasAttribute( "style" ) &&
                   !node.hasAttribute( "id" ) ) {
                stripNode( node );
              }
              break;
            case 4:
              log.debug(
                "*** Processing node is a text node!\n" +
                "*** surround: 'span'\n" +
                "*** node: '" +
                  node.textContent.replace( /\n/img, "\\n" ) + "'\n" +
                "*** callee: " + Components.stack.name + "()"
              );
              // node is a text node, but this shouldn't have happened here
              break;
          }
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
    };

    // name: text-decoration
    // inherited: no
    // computed value: as specified
    //                 none | [ underline || overline || line-through || blink ]
    // initial: none
    // comment: strange behavior ( inherited )
    function doStrike() {
      var textDecoration;
      var flag = !getCommandState( "znotes_strikethrough_command" );
      try {
        designEditor.beginTransaction();
        var node, nodes = splitSelectionNodes( "span" );
        for ( var i = 0; i < nodes.length; i++ ) {
          node = nodes[i].node;
          switch ( nodes[i].kind ) {
            case 0:
              // node is an element node and does not contain any child nodes
              break;
            case 2:
              // node is an element node and contains exactly one child text node
              removeCSSInlinePropertyValue( node,
                "text-decoration", "line-through" );
              textDecoration =
                getComputedStyle( node ).textDecoration.split( /\s+/ );
              if ( flag ) {
                if ( textDecoration.indexOf( "line-through" ) == -1 ) {
                  setCSSInlinePropertyValue( node,
                    "text-decoration", "line-through" );
                }
              } else {
                if ( textDecoration.indexOf( "line-through" ) != -1 ) {
                  setCSSInlinePropertyValue( node,
                    "text-decoration", "none" );
                }
              }
              if ( node.nodeName === "span" &&
                   !node.hasAttribute( "style" ) &&
                   !node.hasAttribute( "id" ) ) {
                stripNode( node );
              }
              break;
            case 4:
              // node is a text node, but this shouldn't have happened here
              log.debug(
                "*** Processing node is a text node!\n" +
                "*** surround: 'span'\n" +
                "*** node: '" +
                  node.textContent.replace( /\n/img, "\\n" ) + "'\n" +
                "*** callee: " + Components.stack.name + "()"
              );
              break;
          }
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
    };

    // remove style attribute
    function doRemoveFormat() {
      try {
        designEditor.beginTransaction();
        var node, nodes = splitSelectionNodes( /* no surround */ );
        for ( var i = 0; i < nodes.length; i++ ) {
          node = nodes[i].node;
          switch ( nodes[i].kind ) {
            case 0:
              // node is an element node and does not contain any child nodes
              designEditor.removeAttribute( node, "style", false );
              break;
            case 2:
              // node is an element node and contains exactly one child text node
              designEditor.removeAttribute( node, "style", false );
              if ( node.nodeName === "span" && !node.hasAttribute( "id" ) ) {
                stripNode( node );
              }
              break;
            case 4:
              // node is a text node and exactly has one or more siblings
              designEditor.removeAttribute( node.parentNode, "style", false );
              if ( node.parentNode.nodeName === "span" &&
                   !node.parentNode.hasAttribute( "id" ) ) {
                stripNode( node.parentNode );
              }
              break;
          }
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
    };

    function doLink() {
      var params = {
        input: {
          title: getString( "editor.addLink.title" ),
          caption: " " + getString( "editor.addLink.caption" ) + " ",
          value: "http://"
        },
        output: null
      };
      currentWindow.openDialog(
        "chrome://znotes/content/inputdialog.xul",
        "",
        "chrome,dialog=yes,modal=yes,centerscreen,resizable=yes",
        params
      ).focus();
      if ( !params.output ) {
        return;
      }
      var url = params.output.result;
      url = url.replace(/(^\s+)|(\s+$)/g, "");
      if ( url.length == 0 ) {
        return;
      }
      url = encodeURI( url );
      try {
        designEditor.beginTransaction();
        var node, nodes = splitSelectionNodes( /* no surround */ );
        for ( var i = 0; i < nodes.length; i++ ) {
          node = nodes[i].node;
          switch ( nodes[i].kind ) {
            case 0:
              // node is an element node and does not contain any child nodes
              designEditor.setAttribute( surroundNode( node, "a" ), "href",
                url );
              break;
            case 2:
              // node is an element node and contains exactly one text node
              if ( node.nodeName === "a" ) {
                designEditor.setAttribute( node, "href", url );
              } else {
                designEditor.setAttribute( surroundNode( node, "a" ), "href",
                  url );
              }
              break;
            case 4:
              // node is a text node and has one or more siblings
              designEditor.setAttribute( surroundNode( node, "a" ), "href",
                url );
              break;
          }
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
    };

    function doUnlink() {
      try {
        designEditor.beginTransaction();
        var node, nodes = splitSelectionNodes( /* no surround */ );
        for ( var i = 0; i < nodes.length; i++ ) {
          node = nodes[i].node;
          switch ( nodes[i].kind ) {
            case 0:
              // node is an element node and does not contain any child nodes
              while ( node ) {
                if ( node.nodeName === "a" ) {
                  stripNode( node );
                  break;
                }
                node = node.parentNode;
              }
              break;
            case 2:
              // node is an element node and contains exactly one child text node
              while ( node ) {
                if ( node.nodeName === "a" ) {
                  stripNode( node );
                  break;
                }
                node = node.parentNode;
              }
              break;
            case 4:
              // node is a text node and exactly has one or more siblings
              node = node.parentNode;
              while ( node ) {
                if ( node.nodeName === "a" ) {
                  stripNode( node );
                  break;
                }
                node = node.parentNode;
              }
              break;
          }
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
    };

    function doSubScript() {
      var flag = !getCommandState( "znotes_subscript_command" );
      try {
        designEditor.beginTransaction();
        var node, kind;
        var nodes = splitSelectionNodes();
        for ( var i = 0; i < nodes.length; i++ ) {
          node = nodes[i].node;
          kind = nodes[i].kind;
          switch ( kind ) {
            case 0:
              // node is an element node and does not contain any child nodes
              break;
            case 2:
              // node is an element node and contains exactly one child text node
              node = node.firstChild;
              // no break
            case 4:
              // node is a text node
              if ( flag ) {
                surroundNode( node, "sub" );
              } else {
                node = extractNode(
                  node.parentNode,
                  DOMUtils.getNodeIndexInParent( node )
                ).parentNode;
              }
              break;
          }
          // node is an element node that not contains any nodes or
          // contains exactly one text node now
          while ( !flag && node && node !== designEditor.document.body ) {
            if ( node.nodeName === "sub" ) {
              stripNode( node );
              break;
            }
            node = extractNode(
              node.parentNode,
              DOMUtils.getNodeIndexInParent( node )
            ).parentNode;
          }
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
    };

    function doSuperScript() {
      var flag = !getCommandState( "znotes_superscript_command" );
      try {
        designEditor.beginTransaction();
        var node, kind;
        var nodes = splitSelectionNodes();
        for ( var i = 0; i < nodes.length; i++ ) {
          node = nodes[i].node;
          kind = nodes[i].kind;
          switch ( kind ) {
            case 0:
              // node is an element node and does not contain any child nodes
              break;
            case 2:
              // node is an element node and contains exactly one child text node
              node = node.firstChild;
              // no break
            case 4:
              // node is a text node
              if ( flag ) {
                surroundNode( node, "sup" );
              } else {
                node = extractNode(
                  node.parentNode,
                  DOMUtils.getNodeIndexInParent( node )
                ).parentNode;
              }
              break;
          }
          // node is an element node that not contains any nodes or
          // contains exactly one text node now
          while ( !flag && node && node !== designEditor.document.body ) {
            if ( node.nodeName === "sup" ) {
              stripNode( node );
              break;
            }
            node = extractNode(
              node.parentNode,
              DOMUtils.getNodeIndexInParent( node )
            ).parentNode;
          }
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
    };

    // name: text-align
    // inherited: yes
    // computed value: the initial value or as specified
    //                 left | right | center | justify
    // initial: a nameless value that acts as
    //          left if direction is ltr,
    //          right if direction is rtl
    // comment: applies to block containers
    function doJustifyCenter() {
      // applied to block elements only
      designFrame.contentDocument.execCommand( 'justifyCenter', false, null );
      /*
      var flag = !getCommandState( "znotes_justifycenter_command" );
      if ( !flag ) {
        return;
      }
      designEditor.beginTransaction();
      designEditor.align( "center" );
      designEditor.endTransaction();
      */
    };

    // name: text-align
    // inherited: yes
    // computed value: the initial value or as specified
    //                 left | right | center | justify
    // initial: a nameless value that acts as
    //          left if direction is ltr,
    //          right if direction is rtl
    // comment: applies to block containers
    function doJustifyLeft() {
      designFrame.contentDocument.execCommand( 'justifyLeft', false, null );
      /*
      var flag = !getCommandState( "znotes_justifyleft_command" );
      if ( !flag ) {
        return;
      }
      designEditor.beginTransaction();
      designEditor.align( "left" );
      designEditor.endTransaction();
      */
    };

    // name: text-align
    // inherited: yes
    // computed value: the initial value or as specified
    //                 left | right | center | justify
    // initial: a nameless value that acts as
    //          left if direction is ltr,
    //          right if direction is rtl
    // comment: applies to block containers
    function doJustifyRight() {
      designFrame.contentDocument.execCommand( 'justifyRight', false, null );
      /*
      var flag = !getCommandState( "znotes_justifyright_command" );
      if ( !flag ) {
        return;
      }
      designEditor.beginTransaction();
      designEditor.align( "right" );
      designEditor.endTransaction();
      */
    };

    // name: text-align
    // inherited: yes
    // computed value: the initial value or as specified
    //                 left | right | center | justify
    // initial: a nameless value that acts as
    //          left if direction is ltr,
    //          right if direction is rtl
    // comment: applies to block containers
    function doJustifyFull() {
      designFrame.contentDocument.execCommand( 'justifyFull', false, null );
      /*
      var flag = !getCommandState( "znotes_justifyfull_command" );
      if ( !flag ) {
        return;
      }
      designEditor.beginTransaction();
      designEditor.align( "justify" );
      designEditor.endTransaction();
      */
    };

    // name: margin-left
    // inherited: no
    // computed value: the percentage as specified or the absolute length
    // initial: 0
    // comment: applies to all elements except elements with
    //          table display types other than table-caption,
    //          table and inline-table
    function doIndent() {
      designFrame.contentDocument.execCommand( 'indent', false, null );
      /*
      designEditor.beginTransaction();
      designEditor.indent( "indent" );
      designEditor.endTransaction();
      */
    };

    // name: margin-left
    // inherited: no
    // computed value: the percentage as specified or the absolute length
    // initial: 0
    // comment: applies to all elements except elements with
    //          table display types other than table-caption,
    //          table and inline-table
    function doOutdent() {
      designFrame.contentDocument.execCommand( 'outdent', false, null );
      /*
      designEditor.beginTransaction();
      designEditor.indent( "outdent" );
      designEditor.endTransaction();
      */
    };

    // name: display
    // inherited: no
    // computed value: inline | block | list-item | inline-block | table |
    //                 inline-table | table-row-group | table-header-group |
    //                 table-footer-group | table-row | table-column-group |
    //                 table-column | table-cell | table-caption | none
    // initial: inline
    // comment:
    function doBlockFormat() {
      var aBlockFormat = formatBlockMenuList.selectedItem.value;
      designEditor.beginTransaction();
      designEditor.setParagraphFormat( aBlockFormat );
      designEditor.endTransaction();
    };

    function doInsertParagraph() {
      designFrame.contentDocument.execCommand( 'insertParagraph', false, null );
      /*
      designEditor.beginTransaction();
      designEditor.setParagraphFormat( "p" );
      designEditor.endTransaction();
      */
    };

    function doInsertOL() {
      designFrame.contentDocument.execCommand( 'insertOrderedList', false, null );
      /*
      var flag = !getCommandState( "znotes_insertorderedlist_command" );
      try {
        designEditor.beginTransaction();
        if ( flag ) {
          // A | a | I | i | 1
          designEditor.makeOrChangeList( "ol", false, "1" );
        } else {
          designEditor.removeList( "ol" );
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
      */
    };

    function doInsertUL() {
      designFrame.contentDocument.execCommand( 'insertUnorderedList', false, null );
      /*
      var flag = !getCommandState( "znotes_insertunorderedlist_command" );
      try {
        designEditor.beginTransaction();
        if ( flag ) {
          // disc | circle | square
          designEditor.makeOrChangeList( "ul", false, "disc" );
        } else {
          designEditor.removeList( "ul" );
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
      */
    };

    function doInsertHR() {
      designFrame.contentDocument.execCommand( 'insertHorizontalRule', false, null );
      /*
      designEditor.beginTransaction();
      var aHR = designEditor.createElementWithDefaults( "hr" );
      designEditor.insertElementAtSelection( aHR, true );
      designEditor.endTransaction();
      */
    };

    function doInsertTable() {
      designEditor.beginTransaction();
      var aTable = designEditor.createElementWithDefaults( "table" );
      designEditor.setAttributeOrEquivalent( aTable, "border", "1", true );
      for ( var row = 0; row < 2; row++ ) {
        var aRow = designEditor.createElementWithDefaults( "tr" );
        for ( var col = 0; col < 3; col++ ) {
          var aColumn = designEditor.createElementWithDefaults( "td" );
          designEditor.setAttributeOrEquivalent( aColumn, "width", "100", true );
          aRow.appendChild( aColumn );
        }
        aTable.appendChild( aRow );
      }
      designEditor.insertElementAtSelection( aTable, true );
      designEditor.endTransaction();
      designEditor.selectElement( aTable );
    };

    function doInsertImage() {
      var params = {
        input: {
          title: getString( "editor.addImage.title" ),
          note: currentNote
        },
        output: null
      };
      currentWindow.openDialog(
        "chrome://znotes/content/imageselectdialog.xul",
        "",
        "chrome,dialog=yes,modal=yes,centerscreen,resizable=yes",
        params
      ).focus();
      if ( !params.output ) {
        return true;
      }
      var url = params.output.result;
      url = url.replace(/(^\s+)|(\s+$)/g, "");
      if ( url.length == 0 ) {
        return true;
      }
      designEditor.beginTransaction();
      var anImage = designEditor.createElementWithDefaults( "img" );
      designEditor.setAttributeOrEquivalent( anImage, "src", encodeURI( url ), true );
      designEditor.insertElementAtSelection( anImage, true );
      var width = parseInt( anImage.width );
      var height = parseInt( anImage.height );
      if ( ( height > width ) && ( height > 100 ) ) {
        designEditor.setAttributeOrEquivalent( anImage, "height", 100, true );
      } else if ( ( height <= width ) && ( width > 100 ) ) {
        designEditor.setAttributeOrEquivalent( anImage, "width", 100, true );
      }
      designEditor.endTransaction();
      designEditor.selectElement( anImage );
      return true;
    };

    // SOURCE COMMANDS

    function doSourceBeautify() {
      var ranges = sourceEditor.listSelections();
      var delta = 0, indexies = [];
      var len = sourceEditor.getValue().length;
      var lIndex, rIndex;
      for ( var i = 0; i < ranges.length; i++ ) {
        lIndex = sourceEditor.indexFromPos( ranges[i].anchor );
        rIndex = sourceEditor.indexFromPos( ranges[i].head );
        if ( lIndex > rIndex ) {
          indexies.push( rIndex );
          indexies.push( lIndex );
        } else {
          indexies.push( lIndex );
          indexies.push( rIndex );
        }
      }
      ranges = [];
      for ( var i = 0; i < indexies.length; i += 2 ) {
        sourceEditor.autoFormatRange(
          sourceEditor.posFromIndex( indexies[i] ),
          sourceEditor.posFromIndex( indexies[i + 1] )
        );
        delta = sourceEditor.getValue().length - len;
        len += delta;
        for ( var j = i + 1; j < indexies.length; j++ ) {
          indexies[j] += delta;
        }
        ranges.push( {
          anchor: sourceEditor.posFromIndex( indexies[i] ),
          head: sourceEditor.posFromIndex( indexies[i + 1] )
        } );
      }
      sourceEditor.setSelections( ranges );
    };

    // COMMON HELPERS

    function isInEditorWindow() {
      var focusedWindow =
        currentWindow.top.document.commandDispatcher.focusedWindow;
      return ( focusedWindow == designFrame.contentWindow ||
               focusedWindow == sourceFrame.contentWindow );
    };

    function notifyStateListener( event ) {
      for ( var i = 0; i < listeners.length; i++ ) {
        if ( listeners[i][ "on" + event.type ] ) {
          listeners[i][ "on" + event.type ]( event );
        }
      }
    };

    function getCommandState( cmd ) {
      return Common.goGetCommandAttribute( cmd, "checked", currentWindow );
    };

    function setCommandState( cmd, flag ) {
      Common.goSetCommandAttribute( cmd, "checked", flag, currentWindow );
      Common.goSetCommandAttribute( cmd, "checkState", flag, currentWindow );
    };

    function getEditorString( name ) {
      return stringsBundle.getString( name );
    };

    function getEditorFormattedString( name, values ) {
      return stringsBundle.getFormattedString( name, values );
    };

    function getString( name ) {
      return Utils.STRINGS_BUNDLE.getString( name );
    };

    function getFormattedString( name, values ) {
      return Utils.STRINGS_BUNDLE.getFormattedString( name, values );
    };

    function setBackgroundColor() {
      if ( !currentNote ) {
        return;
      }
      var tagColor = currentBookTagList.getNoTag().getColor();
      var tagID = currentNote.getMainTag();
      if ( tagID ) {
        var tag = currentBookTagList.getTagById( tagID );
        if ( tag ) {
          tagColor = tag.getColor();
        }
      }
      var body = designFrame.contentDocument.body;
      var color = body && body.style ?
        body.style.getPropertyValue( 'background-color' ) :
        "";
      if ( !designFrame.hasAttribute( "body.backgroundColor" ) ) {
        designFrame.setAttribute( "body.backgroundColor", color );
      }
      if ( Utils.IS_REPLACE_BACKGROUND ) {
        if ( body && body.style ) {
          body.style.setProperty( 'background-color', tagColor );
        }
      } else {
        tagColor = designFrame.getAttribute( "body.backgroundColor" );
        if ( tagColor ) {
          if ( body && body.style ) {
            body.style.setProperty( 'background-color', tagColor );
          }
        } else {
          if ( body && body.style ) {
            body.style.removeProperty( 'background-color' );
            if ( body.style.length == 0 ) {
              body.removeAttribute( "style" );
            }
          }
        }
      }
    };

    function setDisplayStyle() {
    };

    function getCountOfLines( text ) {
      var result = text.length > 0 ? 1 : 0;
      var pos = text.indexOf( "\n" );
      while ( pos !== -1 ) {
        result++;
        pos = text.indexOf( "\n", pos + 1 );
      }
      return result;
    };

    function getCountOfDigits( number ) {
      return ( "" + number ).length;
    };

    function formatNumber( number, width ) {
      var result = "" + number;
      while ( result.length < width ) {
        result = " " + result;
      }
      return result;
    };

    function replaceTabsWithSpaces( text ) {
      var col = 0, pos = 0, result = "";
      var idx, size, tabSize = 8;
      for ( ; ; ) {
        idx = text.indexOf( "\t", pos );
        if ( idx == -1 ) {
          result += text.slice( pos );
          col += text.length - pos;
          break;
        } else {
          col += idx - pos;
          result += text.slice( pos, idx );
          size = tabSize - col % tabSize;
          col += size;
          for ( var i = 0; i < size; ++i ) {
            result += " ";
          }
          pos = idx + 1;
        }
      }
      return result;
    };

    // EDITOR HELPERS

    function createFontNameMenuList() {
      var fontNameArray = Utils.getFontNameArray();
      while ( fontNameMenuPopup.firstChild ) {
        fontNameMenuPopup.removeChild( fontNameMenuPopup.firstChild );
      }
      var fontFamily, menuItem;
      for ( var i = 0; i < fontNameArray.length; i++ ) {
        fontFamily = fontNameArray[i];
        menuItem = currentDocument.createElement( "menuitem" );
        menuItem.setAttribute( "label", fontFamily );
        menuItem.setAttribute( "value", fontFamily );
        menuItem.style.setProperty( 'font-family', "'" + fontFamily + "'" );
        menuItem.addEventListener( "command", onFontNameChange, false );
        fontNameMenuPopup.appendChild( menuItem );
      }
    };

    function createFormatBlockObject() {
      formatBlockObject = {};
      formatBlockObject[ getEditorString( "formatblock.text" ) ] = "";
      formatBlockObject[ getEditorString( "formatblock.paragraph" ) ] = "p";
      formatBlockObject[ getEditorString( "formatblock.heading1" ) ] = "h1";
      formatBlockObject[ getEditorString( "formatblock.heading2" ) ] = "h2";
      formatBlockObject[ getEditorString( "formatblock.heading3" ) ] = "h3";
      formatBlockObject[ getEditorString( "formatblock.heading4" ) ] = "h4";
      formatBlockObject[ getEditorString( "formatblock.heading5" ) ] = "h5";
      formatBlockObject[ getEditorString( "formatblock.heading6" ) ] = "h6";
      formatBlockObject[ getEditorString( "formatblock.address" ) ] = "address";
      formatBlockObject[ getEditorString( "formatblock.formatted" ) ] = "pre";
      formatBlockObject[ getEditorString( "formatblock.blockquote" ) ] =
        "blockquote";
    };

    function createFormatBlockMenuList() {
      while ( formatBlockMenuPopup.firstChild ) {
        formatBlockMenuPopup.removeChild( formatBlockMenuPopup.firstChild );
      }
      var blockFormat, menuItem;
      for ( var name in formatBlockObject ) {
        blockFormat = formatBlockObject[name];
        menuItem = currentDocument.createElement( "menuitem" );
        menuItem.setAttribute( "label", name );
        menuItem.setAttribute( "value", blockFormat );
        menuItem.setAttribute( "description", blockFormat );
        menuItem.addEventListener( "command", onFormatBlockChange, false );
        formatBlockMenuPopup.appendChild( menuItem );
      }
    };

    function isDesignModified() {
      return undoState.isDesignModified();
    };

    function isSourceModified() {
      return undoState.isSourceModified();
    };

    function setDocumentEditable( isDocumentEditable ) {
      var readOnlyMask = Ci.nsIPlaintextEditor.eEditorReadonlyMask;
      var flags = designEditor.flags;
      designEditor.flags =
        isDocumentEditable ? flags &= ~readOnlyMask : flags | readOnlyMask;
    };

    function switchTagsOn() {
      isTagsModeActive = true;
      var currentScrollTop = designEditor.document.documentElement.scrollTop;
      designEditor.enableStyleSheet( tagsSheetURL, true );
      setCommandState( "znotes_toggletagsmode_command", true );
      designEditor.document.documentElement.scrollTop = currentScrollTop;
    };

    function switchTagsOff() {
      isTagsModeActive = false;
      var currentScrollTop = designEditor.document.documentElement.scrollTop;
      designEditor.enableStyleSheet( tagsSheetURL, false );
      setCommandState( "znotes_toggletagsmode_command", false );
      designEditor.document.documentElement.scrollTop = currentScrollTop;
    };

    function removeCSSInlineProperty( element, name ) {
      var style = DOMUtils.getElementStyle( element );
      if ( !style || !( name in style ) ) {
        return false;
      }
      designEditor.removeAttribute( element, "style" );
      delete style[name];
      var cssText = style.toString();
      if ( cssText.length ) {
        designEditor.setAttribute( element, "style", cssText );
      }
      return true;
    };

    function setCSSInlineProperty( element, name, value, priority ) {
      var style = DOMUtils.getElementStyle( element );
      if ( style ) {
        designEditor.removeAttribute( element, "style" );
      } else {
        style = new DOMUtils.ElementStyle();
      }
      if ( !( name in style ) ) {
        style[name] = {};
      }
      style[name].value = value;
      if ( priority !== undefined ) {
        style[name].priority = priority;
      }
      designEditor.setAttribute( element, "style", style.toString() );
    };

    function removeCSSInlinePropertyValue( element, name, value ) {
      var style = DOMUtils.getElementStyle( element );
      if ( !style || !( name in style ) ) {
        return false;
      }
      var propertyValue = style[name].value.split( /\s+/ );
      var index = propertyValue.indexOf( value );
      if ( index == -1 ) {
        return false;
      }
      designEditor.removeAttribute( element, "style" );
      propertyValue.splice( index, 1 );
      if ( propertyValue.length ) {
        style[name].value = propertyValue.join( " " );
      } else {
        delete style[name];
      }
      var cssText = style.toString();
      if ( cssText.length ) {
        designEditor.setAttribute( element, "style", cssText );
      }
      return true;
    };

    function setCSSInlinePropertyValue( element, name, value, priority ) {
      var style = DOMUtils.getElementStyle( element );
      if ( style ) {
        designEditor.removeAttribute( element, "style" );
      } else {
        style = new DOMUtils.ElementStyle();
      }
      if ( !( name in style ) ) {
        style[name] = {
          value: value,
          priority: ""
        };
      } else {
        var propertyValue = style[name].value.split( /\s+/ );
        var index = propertyValue.indexOf( value );
        if ( index == -1 ) {
          propertyValue.push( value );
          style[name].value = propertyValue.join( " " );
        }
      }
      if ( priority !== undefined ) {
        style[name].priority = priority;
      }
      designEditor.setAttribute( element, "style", style.toString() );
    };

    function getComputedStyle( element ) {
      return element.ownerDocument.defaultView
                                  .getComputedStyle( element, null );
    };

    function getTextProperty( property, attribute, value, firstHas, anyHas, allHas ) {
      try {
        var atom = gAtomService.getAtom( property );
        designEditor.getInlineProperty( atom, attribute, value, firstHas, anyHas, allHas );
      } catch ( e ) {
      }
    };

    function setTextProperty( property, attribute, value ) {
      try {
        var atom = gAtomService.getAtom( property );
        designEditor.setInlineProperty( atom, attribute, value );
      } catch( e ) {
      }
    };

    function removeTextProperty( property, attribute ) {
      try {
        var atom = gAtomService.getAtom( property );
        designEditor.removeInlineProperty( atom, attribute );
      } catch( e ) {
      }
    };

    function getSelectionRanges() {
      var ranges = [];
      var range, count = designEditor.selection ?
        designEditor.selection.rangeCount : 0;
      for ( var i = 0; i < count; i++ ) {
        range = designEditor.selection.getRangeAt( i );
        ranges.push( {
          commonAncestorContainer: range.commonAncestorContainer,
          startContainer: range.startContainer,
          startOffset: range.startOffset,
          endContainer: range.endContainer,
          endOffset: range.endOffset
        } );
      }
      return ranges;
    };

    function setSelectionRanges( ranges ) {
      designEditor.selection.removeAllRanges();
      var range, count = ranges.length;
      for ( var i = 0; i < count; i++ ) {
        range = designEditor.document.createRange();
        range.setStart( ranges[i].startContainer, ranges[i].startOffset );
        range.setEnd( ranges[i].endContainer, ranges[i].endOffset );
        designEditor.selection.addRange( range );
      }
    };

    function scrollSelectionIntoView() {
      if ( !designEditor.selection || !designEditor.selection.rangeCount ) {
        return;
      }
      var range = designEditor.selection.getRangeAt( 0 );
      var node = range.startContainer;
      while ( node && node.nodeType !== Ci.nsIDOMNode.ELEMENT_NODE ) {
        node = node.parentNode;
      }
      if ( node ) {
        node.scrollIntoView();
      }
    };

    function getSelectionChunks() {
      if ( !designEditor.selection || !designEditor.selection.rangeCount ) {
        return [];
      }
      // begin
      var processSelectionNode = function( range, root, chunks ) {
        if ( root.nodeType === Ci.nsIDOMNode.ELEMENT_NODE &&
             root == range.startContainer &&
             range.startContainer == range.endContainer &&
             range.startOffset == range.endOffset ) {
          chunks.push( {
            element: root,
            info: []
          } );
          return;
        }
        var startOffset, endOffset;
        var elementIndex, nodeIndex;
        var node, info, offsets;
        if ( root.hasChildNodes() ) {
          node = root.firstChild;
          while ( node ) {
            processSelectionNode( range, node, chunks );
            node = node.nextSibling;
          }
          return;
        }
        if ( !range.intersectsNode( root ) ) {
          return;
        }
        switch ( root.nodeType ) {
          case Ci.nsIDOMNode.ELEMENT_NODE:
            chunks.push( {
              element: root,
              info: []
            } );
            break;
          case Ci.nsIDOMNode.TEXT_NODE:
            startOffset = ( root == range.startContainer ) ?
              range.startOffset : 0;
            endOffset = ( root == range.endContainer ) ?
              range.endOffset : root.length;
            node = root;
            while ( node && node.nodeType !== Ci.nsIDOMNode.ELEMENT_NODE ) {
              node = node.parentNode;
            }
            while ( node &&
                    ( node.hasAttribute( "_moz_editor_bogus_node" ) ||
                      designEditor.isAnonymousElement( node ) ) ) {
              node = node.parentNode;
            }
            elementIndex = -1;
            for ( var i = 0; i < chunks.length; i++ ) {
              if ( chunks[i].element == node ) {
                elementIndex = i;
                break;
              }
            }
            if ( elementIndex == -1 ) {
              chunks.push( {
                element: node,
                info: []
              } );
              elementIndex = chunks.length - 1;
            }
            info = chunks[elementIndex].info;
            nodeIndex = -1;
            for ( var i = 0; i < info.length; i++ ) {
              if ( info[i].node == root ) {
                nodeIndex = i;
                break;
              }
            }
            if ( nodeIndex == -1 ) {
              info.push( {
                node: root,
                offsets: []
              } );
              nodeIndex = info.length - 1;
            }
            offsets = info[nodeIndex].offsets;
            offsets.push( {
              startOffset: startOffset,
              endOffset: endOffset
            } );
            break;
        }
      };
      // end
      DOMUtils.convolveSelection( designEditor.selection );
      var range, chunks = [];
      for ( var i = 0; i < designEditor.selection.rangeCount; i++ ) {
        range = designEditor.selection.getRangeAt( i );
        processSelectionNode( range, range.commonAncestorContainer, chunks );
      }
      return chunks;
    };

    function splitSelectionNodes( surround ) {
      var node, info, result = [];
      for ( var i = 0; i < selectionChunks.length; i++ ) {
        node = selectionChunks[i].element;
        info = selectionChunks[i].info;
        if ( !info.length ) {
          result.push( {
            node: node,
            kind: 0
          } );
        } else {
          if ( node.childNodes.length == 1 &&
               info.length == 1 &&
               info[0].offsets.length == 1 &&
               info[0].offsets[0].startOffset == 0 &&
               info[0].offsets[0].endOffset == info[0].node.length ) {
            result.push( {
              node: node,
              kind: 2
            } );
          } else {
            for ( var j = 0; j < info.length; j++ ) {
              result = result.concat(
                splitTextNodeByOffsets(
                  info[j].node,
                  info[j].offsets,
                  surround
                )
              );
            }
          }
        }
      }
      return result;
    };

    function splitTextNodeByOffsets( node, offsets, surround ) {
      var result = [];
      var text, offset, delta = 0;
      for ( var k = 0; k < offsets.length; k++ ) {
        offset = offsets[k].startOffset - delta;
        delta += offset;
        if ( offset > 0 ) {
          splitNode( node, offset );
        }
        offset = offsets[k].endOffset - delta;
        delta += offset;
        text = offset < node.length ? splitNode( node, offset ) : node;
        result.push( {
          node: ( surround ? surroundNode( text, surround ) : text ),
          kind: ( surround ? 2 : 4 )
        } );
      }
      return result;
    };

    function surroundNode( node, tag ) {
      var txn = new SurroundNodeTransaction( node, tag );
      designEditorTM.doTransaction( txn );
      return txn.getSurround();
    };

    function stripNode( node ) {
      var txn = new StripNodeTransaction( node );
      designEditorTM.doTransaction( txn );
      return {
        firstChild: txn.getFirstChild(),
        length: txn.getLength()
      }
    };

    function joinNodes( leftNode, rightNode, suppressTxn ) {
      if ( suppressTxn ) {
        return joinNodesSuppressTransaction( leftNode, rightNode );
      }
      var txn = new JoinNodesTransaction( leftNode, rightNode );
      designEditorTM.doTransaction( txn );
      return rightNode;
    };

    function splitNode( rightNode, offset, suppressTxn ) {
      if ( suppressTxn ) {
        return splitNodeSuppressTransaction( rightNode, offset );
      }
      var txn = new SplitNodeTransaction( rightNode, offset );
      designEditorTM.doTransaction( txn );
      return txn.getLeftNode();
    };

    function extractNode( element, index ) {
      if ( element === element.ownerDocument.body ) {
        return ( index < 0 || index >= element.childNodes.length ) ?
          null : element.childNodes[index];
      }
      if ( index ) {
        splitNode( element, index );
      }
      var result = element.firstChild;
      if ( result.nextSibling ) {
        result = splitNode( element, 1 ).firstChild;
      }
      return result;
    };

    function joinNodesSuppressTransaction( leftNode, rightNode ) {
      if ( leftNode.nodeType === Ci.nsIDOMNode.TEXT_NODE &&
           rightNode.nodeType === Ci.nsIDOMNode.TEXT_NODE ) {
        rightNode.textContent = leftNode.textContent + rightNode.textContent;
      } else if ( leftNode.nodeType === Ci.nsIDOMNode.ELEMENT_NODE &&
           rightNode.nodeType === Ci.nsIDOMNode.ELEMENT_NODE ) {
        var next, node = leftNode.firstChild, child = rightNode.firstChild;
        while ( node ) {
          next = node.nextSibling;
          rightNode.insertBefore( node, child );
          node = next;
        }
      }
      leftNode.parentNode.removeChild( leftNode );
    };

    function splitNodeSuppressTransaction( rightNode, offset ) {
      var leftNode;
      if ( rightNode.nodeType === Ci.nsIDOMNode.ELEMENT_NODE ) {
        leftNode = rightNode.cloneNode( false );
        leftNode.removeAttribute( "id" );
      } else {
        leftNode = rightNode.parentNode.ownerDocument.createTextNode(
          rightNode.textContent.substring( 0, offset )
        );
      }
      rightNode.parentNode.insertBefore( leftNode, rightNode );
      if ( rightNode.nodeType === Ci.nsIDOMNode.ELEMENT_NODE ) {
        var i = 0, next, child = rightNode.firstChild;
        while ( child && i < offset ) {
          next = child.nextSibling;
          leftNode.insertBefore( rightNode.removeChild( child ), null );
          child = next;
          i++;
        }
      } else {
        rightNode.textContent = rightNode.textContent.substring( offset );
      }
      return leftNode;
    };

    // HELPER TRANSACTIONS

    function JoinNodesTransaction( leftNode, rightNode ) {
      this.wrappedJSObject = this;
      this.mLeftNode = leftNode;
      this.mRightNode = rightNode;
    };
    JoinNodesTransaction.prototype = {
      isTransient: false,
      doTransaction: function() {
        this.redoTransaction();
      },
      redoTransaction: function() {
      },
      undoTransaction: function() {
      },
      merge: function( aTxn ) {
        return false;
      },
      QueryInterface: function( aIID, theResult ) {
        if ( aIID.equals( Ci.nsITransaction ) ||
             aIID.equals( Ci.nsISupports ) ) {
          return this;
        }
        Components.returnCode = Cr.NS_ERROR_NO_INTERFACE;
        return null;
      },
    };

    function SplitNodeTransaction( rightNode, offset ) {
      this.wrappedJSObject = this;
      this.mRightNode = rightNode;
      this.mOffset = offset;
      this.mLeftNode = null;
    };
    SplitNodeTransaction.prototype = {
      isTransient: false,
      doTransaction: function() {
        if ( !this.mLeftNode ) {
          if ( this.mRightNode.nodeType === Ci.nsIDOMNode.ELEMENT_NODE ) {
            this.mLeftNode = this.mRightNode.cloneNode( false );
            this.mLeftNode.removeAttribute( "id" );
          } else {
            this.mLeftNode =
              this.mRightNode.parentNode.ownerDocument.createTextNode(
                this.mRightNode.textContent.substring( 0, this.mOffset )
              );
          }
        }
        this.redoTransaction();
      },
      redoTransaction: function() {
        var selectionRanges = getSelectionRanges();
        this.mRightNode.parentNode.insertBefore(
          this.mLeftNode, this.mRightNode );
        if ( this.mRightNode.nodeType === Ci.nsIDOMNode.ELEMENT_NODE ) {
          var i = 0, next, child = this.mRightNode.firstChild;
          while ( child && i < this.mOffset ) {
            next = child.nextSibling;
            this.mLeftNode.insertBefore(
              this.mRightNode.removeChild( child ), null );
            child = next;
            i++;
          }
        } else {
          this.mRightNode.textContent =
            this.mRightNode.textContent.substring( this.mOffset );
        }
        var node, range, count = selectionRanges.length;
        var startContainer, startOffset;
        var endContainer, endOffset;
        for ( var i = 0; i < count; i++ ) {
          range = selectionRanges[i];
          startContainer = range.startContainer;
          startOffset = range.startOffset;
          endContainer = range.endContainer;
          endOffset = range.endOffset;
          if ( startContainer.nodeType === Ci.nsIDOMNode.ELEMENT_NODE &&
               this.mRightNode.parentNode === startContainer ) {
            // !!! not [startOffset] but [startOffset + 1] !!!
            node = startContainer.childNodes[startOffset + 1];
            if ( DOMUtils.isRightSibling( this.mRightNode, node ) ) {
              range.startOffset++;
            }
          }
          if ( endContainer.nodeType === Ci.nsIDOMNode.ELEMENT_NODE &&
               this.mRightNode.parentNode === endContainer ) {
            // !!! not [endOffset - 1] but [endOffset] !!!
            node = endContainer.childNodes[endOffset];
            if ( DOMUtils.isRightSibling( this.mRightNode, node ) ) {
              range.endOffset++;
            }
          }
          if ( startContainer == endContainer && startOffset == endOffset ) {
            if ( this.mOffset == 0 ) {
              range.startContainer = this.mLeftNode;
              range.startOffset = 0;
              range.endContainer = this.mLeftNode;
              range.endOffset = 0;
            } else {
              range.startContainer = this.mRightNode;
              range.startOffset = 0;
              range.endContainer = this.mRightNode;
              range.endOffset = 0;
            }
          } else {
            if ( startContainer == this.mRightNode ) {
              if ( startOffset < this.mOffset ) {
                range.startContainer = this.mLeftNode;
              } else {
                range.startOffset -= this.mOffset;
              }
            }
            if ( endContainer == this.mRightNode ) {
              if ( this.mOffset < endOffset ) {
                range.endOffset -= this.mOffset;
              } else {
                range.endContainer = this.mLeftNode;
              }
            }
          }
        }
        setSelectionRanges( selectionRanges );
      },
      undoTransaction: function() {
        var selectionRanges = getSelectionRanges();
        var node, range, count = selectionRanges.length;
        var startContainer, startOffset;
        var endContainer, endOffset;
        for ( var i = 0; i < count; i++ ) {
          range = selectionRanges[i];
          startContainer = range.startContainer;
          startOffset = range.startOffset;
          endContainer = range.endContainer;
          endOffset = range.endOffset;
          if ( startContainer.nodeType === Ci.nsIDOMNode.ELEMENT_NODE &&
               this.mRightNode.parentNode === startContainer ) {
            node = startContainer.childNodes[startOffset];
            if ( DOMUtils.isRightSibling( this.mRightNode, node ) ) {
              range.startOffset--;
            }
          }
          if ( endContainer.nodeType === Ci.nsIDOMNode.ELEMENT_NODE &&
               this.mRightNode.parentNode === endContainer ) {
            node = endContainer.childNodes[endOffset - 1];
            if ( DOMUtils.isRightSibling( this.mRightNode, node ) ) {
              range.endOffset--;
            }
          }
          if ( startContainer == endContainer && startOffset == endOffset ) {
            if ( this.mOffset == 0 ) {
              range.startContainer = this.mRightNode;
              range.startOffset = 0;
              range.endContainer = this.mRightNode;
              range.endOffset = 0;
            } else {
              range.startContainer = this.mRightNode;
              range.startOffset = this.mOffset;
              range.endContainer = this.mRightNode;
              range.endOffset = this.mOffset;
            }
          } else {
            if ( startContainer == this.mRightNode ) {
              range.startOffset += this.mOffset;
            }
            if ( startContainer == this.mLeftNode ) {
              range.startContainer = this.mRightNode;
            }
            if ( endContainer == this.mRightNode ) {
              range.endOffset += this.mOffset;
            }
            if ( endContainer == this.mLeftNode ) {
              range.endContainer = this.mRightNode;
            }
          }
        }
        if ( this.mRightNode.nodeType === Ci.nsIDOMNode.ELEMENT_NODE ) {
          var prev, child = this.mLeftNode.lastChild;
          while ( child ) {
            prev = child.previousSibling;
            this.mRightNode.insertBefore(
              this.mLeftNode.removeChild( child ), this.mRightNode.firstChild );
            child = prev;
          }
        } else {
          this.mRightNode.textContent =
            this.mLeftNode.textContent + this.mRightNode.textContent;
        }
        this.mLeftNode.parentNode.removeChild( this.mLeftNode );
        setSelectionRanges( selectionRanges );
      },
      merge: function( aTxn ) {
        return false;
      },
      QueryInterface: function( aIID, theResult ) {
        if ( aIID.equals( Ci.nsITransaction ) ||
             aIID.equals( Ci.nsISupports ) ) {
          return this;
        }
        Components.returnCode = Cr.NS_ERROR_NO_INTERFACE;
        return null;
      },
      getLeftNode: function() {
        return this.mLeftNode;
      }
    };

    function SurroundNodeTransaction( node, tag ) {
      this.wrappedJSObject = this;
      this.mNode = node;
      this.mTag = tag;
      this.mSurround = null;
    };
    SurroundNodeTransaction.prototype = {
      isTransient: false,
      doTransaction: function() {
        if ( !this.mSurround ) {
          if ( !this.mTag ) {
            return;
          }
          this.mSurround =
            this.mNode.ownerDocument.createElement( this.mTag );
        }
        this.redoTransaction();
      },
      redoTransaction: function() {
        if ( !this.mTag ) {
          return;
        }
        var selectionRanges = getSelectionRanges();
        this.mNode.parentNode.insertBefore(
          this.mSurround, this.mNode );
        this.mSurround.appendChild( this.mNode );
        var range, count = selectionRanges.length;
        var startContainer, startOffset;
        var endContainer, endOffset;
        for ( var i = 0; i < count; i++ ) {
          range = selectionRanges[i];
          startContainer = range.startContainer;
          startOffset = range.startOffset;
          endContainer = range.endContainer;
          endOffset = range.endOffset;
          if ( startContainer.nodeType === Ci.nsIDOMNode.ELEMENT_NODE &&
               startContainer.childNodes[startOffset] === this.mSurround ) {
            range.startContainer = this.mSurround;
            range.startOffset = 0;
          }
          if ( endContainer.nodeType === Ci.nsIDOMNode.ELEMENT_NODE &&
               endContainer.childNodes[endOffset - 1] === this.mSurround ) {
            range.endContainer = this.mSurround;
            range.endOffset = 1;
          }
        }
        setSelectionRanges( selectionRanges );
      },
      undoTransaction: function() {
        if ( !this.mTag ) {
          return;
        }
        var selectionRanges = getSelectionRanges();
        var range, count = selectionRanges.length;
        var index = DOMUtils.getNodeIndexInParent( this.mSurround );
        var startContainer, startOffset;
        var endContainer, endOffset;
        for ( var i = 0; i < count; i++ ) {
          range = selectionRanges[i];
          startContainer = range.startContainer;
          startOffset = range.startOffset;
          endContainer = range.endContainer;
          endOffset = range.endOffset;
          if ( startContainer == this.mSurround ) {
            range.startContainer = this.mSurround.parentNode;
            range.startOffset = index;
          }
          if ( endContainer == this.mSurround ) {
            range.endContainer = this.mSurround.parentNode;
            range.endOffset = index + 1;
          }
        }
        this.mNode = this.mSurround.removeChild( this.mNode );
        this.mSurround.parentNode.insertBefore(
          this.mNode, this.mSurround );
        this.mSurround.parentNode.removeChild( this.mSurround );
        setSelectionRanges( selectionRanges );
      },
      merge: function( aTxn ) {
        return false;
      },
      QueryInterface: function( aIID, theResult ) {
        if ( aIID.equals( Ci.nsITransaction ) ||
             aIID.equals( Ci.nsISupports ) ) {
          return this;
        }
        Components.returnCode = Cr.NS_ERROR_NO_INTERFACE;
        return null;
      },
      getSurround: function() {
        return this.mSurround;
      }
    };

    function StripNodeTransaction( node ) {
      this.wrappedJSObject = this;
      this.mNode = null;
      this.mFirstChild = null;
      this.mLength = null;
      if ( node && node.firstChild ) {
        this.mNode = node;
      }
    };
    StripNodeTransaction.prototype = {
      isTransient: false,
      doTransaction: function() {
        if ( !this.mNode ) {
          return;
        }
        if ( !this.mFirstChild ) {
          this.mFirstChild = this.mNode.firstChild;
          this.mLength = this.mNode.childNodes.length;
        }
        this.redoTransaction();
      },
      redoTransaction: function() {
        if ( !this.mNode ) {
          return;
        }
        var selectionRanges = getSelectionRanges();
        var index = DOMUtils.getNodeIndexInParent( this.mNode );
        var nextNode, currentNode = this.mFirstChild, i = 0;
        while ( currentNode && ( i < this.mLength ) ) {
          nextNode = currentNode.nextSibling;
          this.mNode.parentNode.insertBefore( currentNode, this.mNode );
          currentNode = nextNode;
          i++;
        }
        this.mNode.parentNode.removeChild( this.mNode );
        var range, count = selectionRanges.length;
        var startContainer, startOffset;
        var endContainer, endOffset;
        for ( var i = 0; i < count; i++ ) {
          range = selectionRanges[i];
          startContainer = range.startContainer;
          startOffset = range.startOffset;
          endContainer = range.endContainer;
          endOffset = range.endOffset;
          if ( startContainer == this.mFirstChild.parentNode ) {
            if ( startOffset > index ) {
              range.startOffset += this.mLength - 1;
            }
          }
          if ( startContainer == this.mNode ) {
            range.startContainer = this.mFirstChild.parentNode;
            range.startOffset += index;
          }
          if ( endContainer == this.mFirstChild.parentNode ) {
            if ( endOffset > index ) {
              range.endOffset += this.mLength - 1;
            }
          }
          if ( endContainer == this.mNode ) {
            range.endContainer = this.mFirstChild.parentNode;
            range.endOffset += index;
          }
        }
        setSelectionRanges( selectionRanges );
      },
      undoTransaction: function() {
        if ( !this.mNode ) {
          return;
        }
        var selectionRanges = getSelectionRanges();
        var index = DOMUtils.getNodeIndexInParent( this.mFirstChild );
        this.mFirstChild.parentNode.insertBefore( this.mNode, this.mFirstChild );
        var nextNode, currentNode = this.mFirstChild, i = 0;
        while ( currentNode && ( i < this.mLength ) ) {
          nextNode = currentNode.nextSibling;
          this.mNode.insertBefore( currentNode, null );
          currentNode = nextNode;
          i++;
        }
        var range, count = selectionRanges.length;
        var startContainer, startOffset;
        var endContainer, endOffset;
        for ( var i = 0; i < count; i++ ) {
          range = selectionRanges[i];
          startContainer = range.startContainer;
          startOffset = range.startOffset;
          endContainer = range.endContainer;
          endOffset = range.endOffset;
          if ( startContainer == this.mNode.parentNode ) {
            if ( startOffset >= index &&
                 startOffset < index + this.mLength ) {
              range.startContainer = this.mNode;
              range.startOffset -= index;
            } else if ( startOffset >= index + this.mLength ) {
              range.startOffset -= this.mLength - 1;
            }
          }
          if ( endContainer == this.mNode.parentNode ) {
            if ( endOffset >= index &&
                 endOffset <= index + this.mLength ) {
              range.endContainer = this.mNode;
              range.endOffset -= index;
            } else if ( endOffset > index + this.mLength ) {
              range.endOffset -= this.mLength - 1;
            }
          }
        }
        setSelectionRanges( selectionRanges );
      },
      merge: function( aTxn ) {
        return false;
      },
      QueryInterface: function( aIID, theResult ) {
        if ( aIID.equals( Ci.nsITransaction ) ||
             aIID.equals( Ci.nsISupports ) ) {
          return this;
        }
        Components.returnCode = Cr.NS_ERROR_NO_INTERFACE;
        return null;
      },
      getFirstChild: function() {
        return this.mFirstChild;
      },
      getLength: function() {
        return this.mLength;
      }
    };

    // TOOLBAR

    function restoreToolbarCurrentSet() {
      var currentSet, docName = self.getDocument().getName();
      //
      currentSet = designToolBar1.getAttribute( "defaultset" );
      if ( prefsBundle.hasPref( "designToolbar1CurrentSet." + docName ) ) {
        currentSet = prefsBundle.getCharPref( "designToolbar1CurrentSet." +
          docName );
      }
      designToolBar1.setAttribute( "currentset", currentSet );
      designToolBar1.currentSet = currentSet;
      //
      currentSet = designToolBar2.getAttribute( "defaultset" );
      if ( prefsBundle.hasPref( "designToolbar2CurrentSet." + docName ) ) {
        currentSet = prefsBundle.getCharPref( "designToolbar2CurrentSet." +
          docName );
      }
      designToolBar2.setAttribute( "currentset", currentSet );
      designToolBar2.currentSet = currentSet;
      //
      currentSet = sourceToolBar1.getAttribute( "defaultset" );
      if ( prefsBundle.hasPref( "sourceToolbar1CurrentSet." + docName ) ) {
        currentSet = prefsBundle.getCharPref( "sourceToolbar1CurrentSet." +
          docName );
      }
      sourceToolBar1.setAttribute( "currentset", currentSet );
      sourceToolBar1.currentSet = currentSet;
      //
      currentSet = sourceToolBar2.getAttribute( "defaultset" );
      if ( prefsBundle.hasPref( "sourceToolbar2CurrentSet." + docName ) ) {
        currentSet = prefsBundle.getCharPref( "sourceToolbar2CurrentSet." +
          docName );
      }
      sourceToolBar2.setAttribute( "currentset", currentSet );
      sourceToolBar2.currentSet = currentSet;
    };

    function saveToolbarCurrentSet() {
      var currentSet, docName = self.getDocument().getName();
      currentSet = designToolBar1.currentSet;
      if ( currentSet != "__empty" ) {
        prefsBundle.setCharPref( "designToolbar1CurrentSet." + docName,
          currentSet );
      }
      currentSet = designToolBar2.currentSet;
      if ( currentSet != "__empty" ) {
        prefsBundle.setCharPref( "designToolbar2CurrentSet." + docName,
          currentSet );
      }
      currentSet = sourceToolBar1.currentSet;
      if ( currentSet != "__empty" ) {
        prefsBundle.setCharPref( "sourceToolbar1CurrentSet." + docName,
          currentSet );
      }
      currentSet = sourceToolBar2.currentSet;
      if ( currentSet != "__empty" ) {
        prefsBundle.setCharPref( "sourceToolbar2CurrentSet." + docName,
          currentSet );
      }
    };

    // DEBUG

    function dumpSelection( ranges ) {
      var range, commonAncestorContainer;
      var startContainer, startOffset
      var endContainer, endOffset;
      for ( var i = 0; i < ranges.length; i++ ) {
        range = ranges[i];
        startContainer = range.startContainer;
        startOffset = range.startOffset;
        endContainer = range.endContainer;
        endOffset = range.endOffset;
        commonAncestorContainer = range.commonAncestorContainer;
        log.debug( i + ") ancestor => " + ( commonAncestorContainer.id ? commonAncestorContainer.id : commonAncestorContainer.nodeName ) );
        log.debug( i + ") start => " + ( startContainer.id ? startContainer.id : startContainer.nodeName ) +
          " : " + startOffset );
        if ( startContainer.nodeType === Ci.nsIDOMNode.TEXT_NODE ) {
          text = startContainer.textContent
                               .substring( startOffset, ( startContainer == endContainer ? endOffset : undefined ) )
                               .replace( /\n/img, "\\n" );
          log.debug( i + ") '" + text + "'" );
        }
        log.debug( i + ") end => " + ( endContainer.id ? endContainer.id : endContainer.nodeName ) +
          " : " + endOffset );
        if ( endContainer.nodeType === Ci.nsIDOMNode.TEXT_NODE ) {
          text = endContainer.textContent
                               .substring( ( startContainer == endContainer ? startOffset : 0 ), endOffset )
                               .replace( /\n/img, "\\n" );
          log.debug( i + ") '" + text + "'" );
        }
      }
    };

    function dumpSelectionChunks() {
      var element, info, node, offsets;
      var startOffset, endOffset, text;
      for ( var i = 0; i < selectionChunks.length; i++ ) {
        element = selectionChunks[i].element;
        info = selectionChunks[i].info;
        log.debug( element.nodeName + ( info.length ? " TEXT" : " ELEMENT" ) );
        for ( var j = 0; j < info.length; j++ ) {
          node = info[j].node;
          offsets = info[j].offsets;
          if ( offsets.length == 1 &&
               offsets[0].startOffset == 0 &&
               offsets[0].endOffset == node.length ) {
            log.debug( "* : '" + node.textContent + "'" );
          } else {
            for ( var k = 0; k < offsets.length; k++ ) {
              startOffset = offsets[k].startOffset;
              endOffset = offsets[k].endOffset;
              text = node.textContent.substring( startOffset, endOffset )
                                     .replace( /\n/img, "\\n" );
              log.debug( k + " : '" + text + "', { " + startOffset + ", " +
                endOffset + " }" );
            }
          }
        }
      }
    };

    function dumpSelectionElements( surround ) {
      try {
        designEditor.beginTransaction();
        var node, kind, name, text;
        var nodes = splitSelectionNodes( surround );
        for ( var i = 0; i < nodes.length; i++ ) {
          node = nodes[i].node;
          kind = nodes[i].kind;
          name = node.nodeName;
          switch ( kind ) {
            case 0:
              // node is an element node and does not contain any child nodes
              log.debug( "[" + kind + "] " + name );
              break;
            case 2:
              // node is element node and contains only one text node
              text = node.firstChild.textContent.replace( /\n/img, "\\n" );
              log.debug( "[" + kind + "] " + name + "\n'" + text + "'" );
              break;
            case 4:
              // node is a text node, but this shouldn't have happened here
              text = node.textContent.replace( /\n/img, "\\n" );
              log.debug( "[" + kind + "] " + name + "\n'" + text + "'" );
              break;
          }
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
    };

    function doDebug() {
      SampleModule.run();
      /*
      dumpSelection( getSelectionRanges() );
      dumpSelectionChunks();
      dumpSelectionElements(); doUndo();
      */
      /*
      try {
        designEditor.beginTransaction();
        var node, kind;
        var nodes = splitSelectionNodes();
        for ( var i = 0; i < nodes.length; i++ ) {
          node = nodes[i].node;
          kind = nodes[i].kind;
          switch ( kind ) {
            case 0:
              // node is an element node and does not contain any child nodes
              break;
            case 2:
              // node is an element node and contains exactly one child text node
              node = node.firstChild;
              // no break
            case 4:
              // node is a text node
              node = extractNode(
                node.parentNode,
                DOMUtils.getNodeIndexInParent( node )
              ).parentNode;
              break;
          }
          // node is an element node that not contains any nodes or
          // contains exactly one text node now
          while ( node && node !== designEditor.document.body ) {
            node = extractNode(
              node.parentNode,
              DOMUtils.getNodeIndexInParent( node )
            ).parentNode;
          }
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
      */
    };

    // DESIGN CONTROLS

    // name: font-family
    // inherited: yes
    // computed value: as specified
    //                 [ family-name | generic-family ][, ...]
    // initial: depends on user agent
    // comment:
    function getFontFamilyState( mixed ) {
      var fontMapping = Utils.getDefaultFontMapping();
      var element, computedStyle, value;
      var result = null;
      mixed.value = false;
      for ( var i = 0; i < selectionChunks.length; i++ ) {
        element = selectionChunks[i].element;
        computedStyle = getComputedStyle( element );
        value = computedStyle.fontFamily;
        if ( !value ) {
          value = fontMapping.defaultName;
          if ( value === null ) {
            log.debug( "fontMapping.defaultName: [" + fontMapping.defaultName +
                       "] is null" );
          }
        }
        if ( result === null ) {
          result = value;
        } else {
          if ( result !== value ) {
            mixed.value = true;
            break;
          }
        }
      }
      return result;
    };

    // name: font-size
    // inherited: yes
    // computed value: absolute length in px
    // initial: medium
    // comment:
    function getFontSizeState( mixed ) {
      var element, computedStyle, value;
      var result = null;
      mixed.value = false;
      for ( var i = 0; i < selectionChunks.length; i++ ) {
        element = selectionChunks[i].element;
        computedStyle = getComputedStyle( element );
        value = computedStyle.fontSize;
        if ( value !== null ) {
          value = parseInt( value.substring( 0, value.indexOf( "px" ) ) );
        }
        if ( result === null ) {
          result = value;
        } else {
          if ( result !== value ) {
            mixed.value = true;
            break;
          }
        }
      }
      return result;
    };

    // name: font-style
    // inherited: yes
    // computed value: as specified
    //                 normal | italic | oblique
    // initial: normal
    // comment:
    function getFontStyleState( mixed ) {
      var element, computedStyle, value;
      var result = null;
      mixed.value = false;
      for ( var i = 0; i < selectionChunks.length; i++ ) {
        element = selectionChunks[i].element;
        computedStyle = getComputedStyle( element );
        value = computedStyle.fontStyle;
        if ( result === null ) {
          result = value;
        } else {
          if ( result !== value ) {
            mixed.value = true;
            break;
          }
        }
      }
      return result;
    };

    // name: font-weight
    // inherited: yes
    // computed value: '100' - '900'
    // initial: normal === '400'
    // comment: bold === '700'
    function getFontWeightState( mixed ) {
      var element, computedStyle, value;
      var result = null;
      mixed.value = false;
      for ( var i = 0; i < selectionChunks.length; i++ ) {
        element = selectionChunks[i].element;
        computedStyle = getComputedStyle( element );
        value = computedStyle.fontWeight;
        if ( result === null ) {
          result = value;
        } else {
          if ( result !== value ) {
            mixed.value = true;
            break;
          }
        }
      }
      return result;
    };

    // name: text-decoration
    // inherited: no
    // computed value: as specified
    //                 none | [ underline || overline || line-through || blink ]
    // initial: none
    // comment: strange behavior ( inherited )
    function getTextDecorationState( mixed, underline, strike ) {
      var element, computedStyle, value;
      var result = null;
      mixed.value = false;
      for ( var i = 0; i < selectionChunks.length; i++ ) {
        element = selectionChunks[i].element;
        value = [];
        while ( element && element.nodeType === Ci.nsIDOMNode.ELEMENT_NODE ) {
          computedStyle = getComputedStyle( element );
          value = value.concat(
            computedStyle.textDecoration.split( /\s+/ )
          );
          element = element.parentNode;
        }
        value = value.join( " " );
        if ( result === null ) {
          result = value;
          underline.value = ( value.indexOf( "underline" ) != -1 );
          strike.value = ( value.indexOf( "line-through" ) != -1 );
        } else {
          if ( result !== value ) {
            mixed.value = true;
            break;
          }
        }
      }
    };

    // name: text-align
    // inherited: yes
    // computed value: the initial value or as specified
    //                 left | right | center | justify
    // initial: a nameless value that acts as
    //          left if direction is ltr,
    //          right if direction is rtl
    // comment: applies to block containers
    function getAlignmentState( mixed ) {
      var element, computedStyle, value, direction;
      var result = null;
      mixed.value = false;
      for ( var i = 0; i < selectionChunks.length; i++ ) {
        element = selectionChunks[i].element;
        computedStyle = getComputedStyle( element );
        direction = computedStyle.direction;
        value = computedStyle.textAlign;
        if ( !value ) {
          value = "start";
        }
        switch ( value ) {
          case "start":
            value = ( direction == "ltr" ) ? "left" : "right";
            break;
          case "end":
            value = ( direction == "ltr" ) ? "right" : "left";
            break;
        }
        if ( result === null ) {
          result = value;
        } else {
          if ( result !== value ) {
            mixed.value = true;
            break;
          }
        }
      }
      return result;
    };

    // name: color
    // inherited: yes
    // computed value: as specified
    // initial: depends on user agent
    // comment:
    function getFontColorState( mixed ) {
      var element, computedStyle, value;
      var result = null;
      mixed.value = false;
      for ( var i = 0; i < selectionChunks.length; i++ ) {
        element = selectionChunks[i].element;
        computedStyle = getComputedStyle( element );
        value = computedStyle.color;
        if ( result === null ) {
          result = value;
        } else {
          if ( result !== value ) {
            mixed.value = true;
            break;
          }
        }
      }
      return result;
    };

    // name: background-color
    // inherited: no
    // computed value: as specified
    // initial: transparent
    // comment:
    function getHighlightColorState( mixed ) {
      var element, computedStyle, value;
      var result = null;
      mixed.value = false;
      for ( var i = 0; i < selectionChunks.length; i++ ) {
        element = selectionChunks[i].element;
        while ( element && element.nodeType === Ci.nsIDOMNode.ELEMENT_NODE ) {
          computedStyle = getComputedStyle( element );
          value = computedStyle.backgroundColor;
          if ( value != "transparent" ) {
            break;
          }
          element = element.parentNode;
        }
        if ( result === null ) {
          result = value;
        } else {
          if ( result !== value ) {
            mixed.value = true;
            break;
          }
        }
      }
      return result;
    };

    // name: background-color
    // inherited: no
    // computed value: as specified
    // initial: transparent
    // comment:
    function getBackgroundColorState( mixed ) {
      var element, computedStyle, value;
      var result = null;
      mixed.value = false;
      for ( var i = 0; i < selectionChunks.length; i++ ) {
        element = selectionChunks[i].element;
        computedStyle = getComputedStyle( element );
        value = computedStyle.backgroundColor;
        if ( result === null ) {
          result = value;
        } else {
          if ( result !== value ) {
            mixed.value = true;
            break;
          }
        }
      }
      return result;
    };

    // name: vertical-align
    // inherited: no
    // computed value: for <percentage> and <length> the absolute length,
    //                 otherwise as specified
    //                 baseline | sub | super | top | text-top | middle |
    //                 bottom | text-bottom | <percentage> | <length> | inherit
    // initial: baseline
    // comment: applies to inline-level and table-cell elements
    //          values of this property have different meanings
    //          in the context of tables
    function getVerticalAlignmentState( mixed ) {
      var element, computedStyle;
      var value, result = null;
      mixed.value = false;
      for ( var i = 0; i < selectionChunks.length; i++ ) {
        element = selectionChunks[i].element;
        computedStyle = getComputedStyle( element );
        value = computedStyle.verticalAlign;
        if ( result === null ) {
          result = value;
        } else {
          if ( result !== value ) {
            mixed.value = true;
            break;
          }
        }
      }
      return result;
    };

    // name: display
    // inherited: no
    // computed value: inline | block | list-item | inline-block | table |
    //                 inline-table | table-row-group | table-header-group |
    //                 table-footer-group | table-row | table-column-group |
    //                 table-column | table-cell | table-caption | none
    // initial: inline
    // comment:
    function getBlockState( mixed ) {
      var element, computedStyle;
      var value, found, result = null;
      mixed.value = false;
      for ( var i = 0; i < selectionChunks.length; i++ ) {
        element = selectionChunks[i].element;
        value = "";
        while ( element && element.nodeType === Ci.nsIDOMNode.ELEMENT_NODE &&
                element !== element.ownerDocument.body ) {
          computedStyle = getComputedStyle( element );
          if ( computedStyle.display == "block" ) {
            found = false;
            for ( var name in formatBlockObject ) {
              if ( formatBlockObject[name] == element.nodeName ) {
                found = true;
                break;
              }
            }
            if ( found ) {
              value = element.nodeName;
              break;
            }
          }
          element = element.parentNode;
        }
        if ( result === null ) {
          result = value;
        } else {
          if ( result !== value ) {
            mixed.value = true;
            break;
          }
        }
      }
      return result;
    };

    // name: margin-left
    // inherited: no
    // computed value: the percentage as specified or the absolute length
    // initial: 0
    // comment: applies to all elements except elements with
    //          table display types other than table-caption,
    //          table and inline-table
    function getIndentState( mixed ) {
      var element, computedStyle;
      var value, index, result = null;
      mixed.value = false;
      for ( var i = 0; i < selectionChunks.length; i++ ) {
        element = selectionChunks[i].element;
        value = 0;
        while ( element && element.nodeType === Ci.nsIDOMNode.ELEMENT_NODE ) {
          computedStyle = getComputedStyle( element );
          if ( computedStyle.display == "block" ) {
            value = computedStyle.marginLeft;
            index = ( value !== null ) ? value.indexOf( "px" ) : -1;
            if ( index != -1 ) {
              value = parseInt( value.substring( 0, index ) );
              value = ( value >= 40 ) && ( ( value % 40 ) == 0 );
              if ( value ) {
                break;
              }
            }
          }
          if ( element == element.ownerDocument.body ) {
            break;
          }
          element = element.parentNode;
        }
        if ( result === null ) {
          result = value;
        } else {
          if ( result !== value ) {
            mixed.value = true;
            break;
          }
        }
      }
      return result;
    };

    function getSuperscriptState( mixed ) {
      var element, value, found, result = null;
      mixed.value = false;
      for ( var i = 0; i < selectionChunks.length; i++ ) {
        element = selectionChunks[i].element;
        value = false;
        while ( element && element.nodeType === Ci.nsIDOMNode.ELEMENT_NODE &&
                element != element.ownerDocument.body ) {
          if ( element.nodeName == "sup" ) {
            value = true;
            break;
          }
          element = element.parentNode;
        }
        if ( result === null ) {
          result = value;
        } else {
          if ( result !== value ) {
            mixed.value = true;
            break;
          }
        }
      }
      return result;
    };

    function getSubscriptState( mixed ) {
      var element, value, found, result = null;
      mixed.value = false;
      for ( var i = 0; i < selectionChunks.length; i++ ) {
        element = selectionChunks[i].element;
        value = false;
        while ( element && element.nodeType === Ci.nsIDOMNode.ELEMENT_NODE &&
                element != element.ownerDocument.body ) {
          if ( element.nodeName == "sub" ) {
            value = true;
            break;
          }
          element = element.parentNode;
        }
        if ( result === null ) {
          result = value;
        } else {
          if ( result !== value ) {
            mixed.value = true;
            break;
          }
        }
      }
      return result;
    };

    // is the selection "ol" || "ul" || "dl" element
    function getListState( mixed, ol, ul, dl ) {
      var element, value, result = null;
      mixed.value = false;
      for ( var i = 0; i < selectionChunks.length; i++ ) {
        element = selectionChunks[i].element;
        ol.value = false;
        ul.value = false;
        dl.value = false;
        value = 0;
        while ( element && element.nodeType === Ci.nsIDOMNode.ELEMENT_NODE &&
                element != element.ownerDocument.body ) {
          switch ( element.nodeName ) {
            case "ol":
              ol.value = true;
              ul.value = false;
              dl.value = false;
              value = 4;
              break;
            case "ul":
              ol.value = false;
              ul.value = true;
              dl.value = false;
              value = 2;
              break;
            case "dl":
              ol.value = false;
              ul.value = false;
              dl.value = true;
              value = 1;
              break;
          }
          if ( value ) {
            break;
          }
          element = element.parentNode;
        }
        if ( result === null ) {
          result = value;
        } else {
          if ( result !== value ) {
            mixed.value = true;
            break;
          }
        }
      }
    };

    // is the selection "li" || "dt" || "dd" element
    function getListItemState( mixed, li, dt, dd ) {
      var element, value, result = null;
      mixed.value = false;
      for ( var i = 0; i < selectionChunks.length; i++ ) {
        element = selectionChunks[i].element;
        if ( element.nodeName == "ol" ||
             element.nodeName == "ul" ||
             element.nodeName == "dl" ) {
          continue;
        }
        li.value = false;
        dt.value = false;
        dd.value = false;
        value = 0;
        while ( element && element.nodeType === Ci.nsIDOMNode.ELEMENT_NODE &&
                element != element.ownerDocument.body ) {
          switch ( element.nodeName ) {
            case "li":
              li.value = true;
              dt.value = false;
              dd.value = false;
              value = 4;
              break;
            case "dt":
              li.value = false;
              dt.value = true;
              dd.value = false;
              value = 2;
              break;
            case "dd":
              li.value = false;
              dt.value = false;
              dd.value = true;
              value = 1;
              break;
          }
          if ( value ) {
            break;
          }
          element = element.parentNode;
        }
        if ( result === null ) {
          result = value;
        } else {
          if ( result !== value ) {
            mixed.value = true;
            break;
          }
        }
      }
    };

    function updateDesignControls() {
      var fontNameArray = Utils.getFontNameArray();
      var fontMapping = Utils.getDefaultFontMapping();
      var iconSize = ( currentStyle.iconsize == "small" ) ? 16 : 24;
      var mixed, name, value, index, found;
      var underline, strike, align, valign, fgColor, bgColor;
      // font-family
      mixed = { value: null };
      value = getFontFamilyState( mixed );
      index = -1;
      if ( !mixed.value ) {
        value = value.split( /\s*,\s*/ );
        for ( var i = 0; i < value.length; i++ ) {
          name = value[i];
          if ( name.charAt( 0 ) == "'" || name.charAt( 0 ) == '"' ) {
            name = name.substring( 1, name.length - 1 );
          }
          if ( name in fontMapping.generics ) {
            name = fontMapping.generics[ name ];
          }
          index = fontNameArray.indexOf( name );
          if ( index != -1 ) {
            break;
          }
        }
      }
      fontNameMenuList.selectedIndex = index;
      // font-size
      mixed = { value: null };
      value = getFontSizeState( mixed );
      if ( mixed.value ) {
        value = "";
      } else {
        value = value ? value : "";
      }
      if ( !value ) {
        fontSizeTextBox.removeAttribute( "type" );
        fontSizeTextBox.value = "";
        fontSizeTextBox.setAttribute( "value", "" );
      } else {
        fontSizeTextBox.setAttribute( "type", "number" );
        fontSizeTextBox.value = value;
        fontSizeTextBox.setAttribute( "value", value );
      }
      // font-style
      mixed = { value: null };
      value = getFontStyleState( mixed );
      if ( !mixed.value ) {
        setCommandState( "znotes_italic_command", value == "italic" );
      } else {
        setCommandState( "znotes_italic_command", false );
      }
      // font-weight
      mixed = { value: null };
      value = getFontWeightState( mixed );
      if ( !mixed.value ) {
        setCommandState( "znotes_bold_command", value == "700" );
      } else {
        setCommandState( "znotes_bold_command", false );
      }
      // text-decoration
      underline = { value: null };
      strike = { value: null };
      mixed = { value: null };
      getTextDecorationState( mixed, underline, strike );
      if ( !mixed.value ) {
        setCommandState( "znotes_underline_command", underline.value );
        setCommandState( "znotes_strikethrough_command", strike.value );
      } else {
        setCommandState( "znotes_underline_command", false );
        setCommandState( "znotes_strikethrough_command", false );
      }
      // text-align
      align = { left: false, center: false, right: false, full: false };
      mixed = { value: null };
      value = getAlignmentState( mixed );
      if ( !mixed.value ) {
        switch ( value ) {
          case "left":
            align.left = true;
            break;
          case "right":
            align.right = true;
            break;
          case "center":
            align.center = true;
            break;
          case "justify":
            align.full = true;
            break;
        }
      }
      setCommandState( "znotes_justifyleft_command", align.left );
      setCommandState( "znotes_justifycenter_command", align.center );
      setCommandState( "znotes_justifyright_command", align.right );
      setCommandState( "znotes_justifyfull_command", align.full );
      /*
      // vertical-align
      valign = { sub: false, sup: false };
      mixed = { value: null };
      value = getVerticalAlignmentState( mixed );
      if ( !mixed.value ) {
        switch ( value ) {
          case "sub":
            valign.sub = true;
            break;
          case "super":
            valign.sup = true;
            break;
        }
      }
      setCommandState( "znotes_subscript_command", valign.sub );
      setCommandState( "znotes_superscript_command", valign.sup );
      */
      // superscript
      mixed = { value: null };
      value = getSuperscriptState( mixed );
      if ( !mixed.value ) {
        setCommandState( "znotes_superscript_command", value );
      } else {
        setCommandState( "znotes_superscript_command", false );
      }
      // subscript
      mixed = { value: null };
      value = getSubscriptState( mixed );
      if ( !mixed.value ) {
        setCommandState( "znotes_subscript_command", value );
      } else {
        setCommandState( "znotes_subscript_command", false );
      }
      // background color
      mixed = { value: null };
      value = getBackgroundColorState( mixed );
      backColorButton.setAttribute( "image",
        Images.makeBackColorImage( value, iconSize ) );
      // foreground && highlight colors
      fgColor = getFontColorState( mixed );
      bgColor = getHighlightColorState( mixed );
      foreColorButton.setAttribute( "image",
        Images.makeForeColorImage( fgColor, iconSize, bgColor ) );
      // block format
      mixed = { value: null };
      value = getBlockState( mixed );
      found = false;
      index = 0;
      if ( !mixed.value ) {
        for ( var name in formatBlockObject ) {
          if ( formatBlockObject[name] == value ) {
            found = true;
            break;
          }
          index++;
        }
      } else {
        found = true;
        index = -1;
      }
      formatBlockMenuList.selectedIndex = ( found ? index : 0 );
      // indent && outdent
      mixed = { value: null };
      value = getIndentState( mixed );
      Common.goSetCommandEnabled( "znotes_indent_command", true , currentWindow );
      if ( mixed.value ) {
        Common.goSetCommandEnabled( "znotes_outdent_command", false, currentWindow );
      } else {
        Common.goSetCommandEnabled( "znotes_outdent_command", value, currentWindow );
      }
      // ol && ul && dl
      mixed = { value: null };
      var ol = { value: null };
      var ul = { value: null };
      var dl = { value: null };
      getListState( mixed, ol, ul, dl );
      if ( !mixed.value ) {
        setCommandState( "znotes_insertorderedlist_command", ol.value );
        setCommandState( "znotes_insertunorderedlist_command", ul.value );
      } else {
        setCommandState( "znotes_insertorderedlist_command", false );
        setCommandState( "znotes_insertunorderedlist_command", false );
      }
      /*
      // li && dt && dd
      mixed = { value: null };
      var li = { value: null };
      var dt = { value: null };
      var dd = { value: null };
      getListItemState( mixed, li, dt, dd );
      */
    };

    // SOURCE CONTROLS

    function updateSourceControls() {
    };

    function updateControls() {
      if ( isDesignEditingActive ) {
        if ( !isParseError ) {
          updateDesignControls();
        }
      } else if ( isSourceEditingActive ) {
        updateSourceControls();
      }
    };

    function updateCommandsVisibility() {
      Common.goSetCommandHidden( "znotes_editordebug_command", !Utils.IS_DEBUG_ENABLED, currentWindow );
    };

    // SELECTION

    function updateSelection() {
      if ( isSourceEditingActive ) {
        return;
      }
      if ( designEditor ) {
        selectionChunks = getSelectionChunks();
      } else {
        selectionChunks = null;
      }
    };

    function onSelectionChanged( event ) {
      if ( !currentWindow ) {
        return;
      }
      // BUG: Ctrl+Home does not scroll selection into view
      if ( event &&
           event.type === "keyup" &&
           event.ctrlKey &&
           event.keyCode === event.DOM_VK_HOME ) {
        designFrame.contentDocument.body.scrollIntoView();
      }
      currentWindow.setTimeout(
        function() {
          if ( isSourceEditingActive ) {
            updateSourceEditorDirtyState();
            sourceEditor.focus();
          } else if ( isDesignEditingActive ) {
            updateDesignEditorDirtyState();
            designFrame.contentWindow.focus();
          } else {
            designFrame.focus();
          }
          updateSelection();
          updateCommandsVisibility();
          updateEditCommands();
          updateSpellCommands();
          updateEditorCommands();
          updateControls();
        },
        0
      );
    };

    // TAG LIST EVENTS

    function onTagChanged( e ) {
      var aTag = e.data.changedTag;
      if ( currentNote && !isDesignEditingActive && !isSourceEditingActive ) {
        setBackgroundColor();
      }
    };

    function onTagDeleted( e ) {
      var aTag = e.data.deletedTag;
      if ( currentNote && !isDesignEditingActive && !isSourceEditingActive ) {
        setBackgroundColor();
      }
    };

    // NOTE EVENTS

    function onNoteMainTagChanged( e ) {
      var aCategory = e.data.parentCategory;
      var aNote = e.data.changedNote;
      var oldTag = e.data.oldValue;
      var newTag = e.data.newValue;
      if ( currentNote && currentNote == aNote &&
           !isDesignEditingActive && !isSourceEditingActive ) {
        setBackgroundColor();
      }
    };

    // @@@@ 1 onNoteMainContentChanged
    function onNoteMainContentChanged( e ) {
      var aCategory = e.data.parentCategory;
      var aNote = e.data.changedNote;
      var oldContent = e.data.oldValue;
      var newContent = e.data.newValue;
      var params, reloadFlag = true;
      if ( currentNote && aNote == currentNote ) {
        if ( !isDesignEditingActive && !isSourceEditingActive ) {
          load();
          setBackgroundColor();
          return;
        }
        Utils.beep();
        Utils.showPopup( successImage, getEditorString( "note.changed" ),
          aNote.getName(), true );
        if ( isSourceEditingActive ) {
          sourceEditor.setValue( newContent );
        } else if ( isDesignEditingActive ) {
          showSource();
          sourceEditor.setValue( newContent );
          showDesign();
        }
      }
    };

    function onNoteDataChanged( e ) {
      var aCategory = e.data.parentCategory;
      var aNote = e.data.changedNote;
      if ( currentNote && currentNote == aNote ) {
        setDisplayStyle();
      }
    };

    // VIEW EVENTS

    function onFontNameChange( event ) {
      doFontFamily();
      onSelectionChanged();
      return true;
    };

    function onFormatBlockChange( event ) {
      doBlockFormat();
      onSelectionChanged();
      return true;
    };

    function onFontSizeTextBoxChange( event ) {
      var fontSize = parseInt( fontSizeTextBox.value );
      if ( !fontSize ) {
        Utils.beep();
        fontSizeTextBox.select();
      } else {
        doFontSize();
        onSelectionChanged();
      }
      return true;
    };

    function onFontSizeTextBoxFocus( event ) {
      fontSizeTextBox.select();
      return true;
    };

    function onEditorTabSelect( event ) {
      switch ( editorTabs.selectedIndex ) {
        case 0:
          showDesign();
          break;
        case 1:
          showSource();
          break;
      }
      return true;
    };

    function onSourceWindowResize( event ) {
      var sourceWindowInnerHeight = sourceWindow.innerHeight;
      if ( !sourceEditorHScrollbarHeight ) {
        var frameDocumentOffsetHeight =
          sourceWindow.document.documentElement.offsetHeight;
        var sourceEditorWrapperElementHeight =
          sourceEditor.getWrapperElement().style.height;
        var pxIndex = sourceEditorWrapperElementHeight.indexOf( "px" );
        pxIndex = pxIndex < 0 ?
          sourceEditorWrapperElementHeight.length : pxIndex;
        sourceEditorWrapperElementHeight =
          parseInt( sourceEditorWrapperElementHeight.substring( 0, pxIndex ) );
        sourceEditorHScrollbarHeight =
          frameDocumentOffsetHeight - sourceEditorWrapperElementHeight;
      }
      var updatedSourceEditorHeight =
        sourceWindowInnerHeight - sourceEditorHScrollbarHeight;
      if ( sourceEditorHeight != updatedSourceEditorHeight ) {
        sourceEditorHeight = updatedSourceEditorHeight;
        sourceEditor.setSize( null, sourceEditorHeight );
        sourceEditor.refresh();
        sourceEditor.focus();
      }
    };

    function designClickHandler( event ) {
      var href, uri, anchor;
      if ( !event.isTrusted || event.defaultPrevented || event.button ) {
        return true;
      }
      if ( currentMode == "editor" ) {
        return true;
      }
      href = Utils.getHREFForClickEvent( event, true );
      if ( !href ) {
        return true;
      }
      uri = null;
      try {
        uri = ioService.newURI( href, null, null );
      } catch ( e ) {
        uri = null;
      }
      if ( !uri ) {
        return true;
      }
      if ( !uri.equalsExceptRef( currentNote.getURI() ) ) {
        return Utils.clickHandler( event );
      }
      if ( uri.ref ) {
        anchor = designFrame.contentDocument.getElementById( uri.ref );
        if ( !anchor ) {
          anchor = designFrame.contentDocument.querySelector(
          'a[name="' + uri.ref + '"]' );
        }
        if ( anchor ) {
          anchor.scrollIntoView( true );
        }
      }
      event.stopPropagation();
      event.preventDefault();
      return false;
    };

    function designOverHandler( event ) {
      var href = "", element = event.target;
      while ( element ) {
        if ( element.nodeName === "a" ) {
          href = element.href;
          break;
        }
        element = element.parentNode;
      }
      observerService.notifyObservers( currentWindow, "znotes-href", href );
      return true;
    };

    // DESIGN EDITOR EVENTS

    function updateDesignEditorDirtyState() {
      if ( !designEditor ) {
        return;
      }
      var isEnabled, canUndo;
      isEnabled = {};
      canUndo = {};
      designEditor.canUndo( isEnabled, canUndo );
      documentStateListener.NotifyDocumentStateChanged( canUndo.value );
    };

    function onDesignDocumentStateChanged( nowDirty ) {
      switchState( !!nowDirty );
      return true;
    };

    // SOURCE EDITOR EVENTS

    function updateSourceEditorDirtyState() {
      if ( !sourceEditor ) {
        return;
      }
      onSourceDocumentStateChanged( sourceEditor.getDoc().historySize().undo );
    };

    function onSourceEditorChange( instance, changeObj ) {
      onSourceDocumentStateChanged( true );
    };

    function onSourceDocumentStateChanged( nowDirty ) {
      switchState( !!nowDirty );
      return true;
    };

    // PREFERENCES

    function loadPrefs() {
      currentPreferences = self.getPreferences();
    };

    function onDocumentPreferencesChanged( event ) {
    };

    function onEditorPreferencesChanged( event ) {
      currentPreferences = event.data.preferences;
      if ( isDesignEditingActive ) {
        // spell
        setCommandState( "znotes_spellcheckenabled_command",
          spellCheckerUI && currentPreferences.isSpellcheckEnabled );
        designEditor.setSpellcheckUserOverride(
          spellCheckerUI && currentPreferences.isSpellcheckEnabled );
        // tags
        currentPreferences.isTagsModeActive ? switchTagsOn() : switchTagsOff();
      }
      updateKeyset();
    };

    // DESIGN & SOURCE

    // TODO: diff/patch must be applied to DOM
    function patchDesign( dom ) {
      var node, index, doc = designEditor.document;
      try {
        designEditor.beginTransaction();
        while ( doc.firstChild ) {
          designEditor.deleteNode( doc.firstChild );
        }
        node = dom.firstChild;
        index = 0;
        while ( node ) {
          designEditor.insertNode(
            doc.importNode( node, true ),
            doc,
            index++
          );
          node = node.nextSibling;
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      } finally {
        designEditor.endTransaction();
      }
    };
    
    // TODO: diff/patch must be applied to SOURCE
    function patchSource( data ) {
      sourceEditor.setValue( data );
    };
    
    function loadDesign() {
      var dom, designDocument, node;
      var data = sourceEditor.getValue();
      var doc = self.getDocument();
      var obj = doc.parseFromString(
        data,
        currentNote.getURI(),
        currentNote.getBaseURI(),
        currentNote.getName()
      );
      dom = obj.dom;
      isParseError = !obj.result;
      isParseModified = obj.changed;
      if ( currentMode === "editor" ) {
        patchDesign( dom );
        undoState.push();
      } else {
        designDocument = designFrame.contentDocument;
        try {
          while ( designDocument.firstChild ) {
            designDocument.removeChild( designDocument.firstChild );
          }
          node = dom.firstChild;
          while ( node ) {
            designDocument.appendChild(
              designDocument.importNode( node, true )
            );
            node = node.nextSibling;
          }
        } catch ( e ) {
          log.warn( e + "\n" + Utils.dumpStack() );
        }
      }
    };

    function loadSource() {
      var data;
      if ( isParseError ) {
        return;
      }
      isParseModified = false;
      data = self.getDocument().serializeToString(
        currentMode === "editor" ?
          designEditor.document : designFrame.contentDocument,
        currentNote.getURI(),
        currentNote.getBaseURI()
      );
      if ( currentMode === "editor" ) {
        patchSource( data );
        undoState.push();
      } else {
        sourceEditor.setValue( data );
      }
    };

    function showDesign() {
      if ( currentMode === "editor" ) {
        if ( isSourceEditingActive ) {
          doneSourceEditing();
        }
        if ( isSourceModified() ) {
          loadDesign();
        }
        initDesignEditing();
      } else {
        setBackgroundColor();
      }
    };

    function showSource() {
      if ( currentMode === "editor" ) {
        if ( isDesignEditingActive ) {
          doneDesignEditing();
        }
        if ( !isParseError && ( isParseModified || isDesignModified() ) ) {
          loadSource();
        }
        initSourceEditing();
      }
    };

    function initDesignEditing() {
      if ( !isDesignEditingActive ) {
        isDesignEditingActive = true;
        if ( !isParseError ) {
          designFrame.setAttribute( "context", "znotes_editspell_menupopup" );
          setDocumentEditable( true );
          if ( designToolBox.hasAttribute( "collapsed" ) ) {
            designToolBox.removeAttribute( "collapsed" );
          }
          setupDesignEditorMarkers();
          if ( !initialCaretPosition ) {
            initialCaretPosition =
              designFrame.contentDocument.caretPositionFromPoint( 0, 0 );
            if ( initialCaretPosition ) {
              setSelectionRanges( [ {
                startContainer: initialCaretPosition.offsetNode,
                startOffset: initialCaretPosition.offset,
                endContainer: initialCaretPosition.offsetNode,
                endOffset: initialCaretPosition.offset
              } ] );
            }
          }
          scrollSelectionIntoView();
        } else {
          designFrame.setAttribute( "context", "znotes_edit_menupopup" );
          setDocumentEditable( false );
        }
      }
      onSelectionChanged();
    };

    function doneDesignEditing() {
      if ( isDesignEditingActive ) {
        isDesignEditingActive = false;
        designToolBox.setAttribute( "collapsed", "true" );
      }
    };

    function initSourceEditing() {
      if ( !isSourceEditingActive ) {
        isSourceEditingActive = true;
        if ( sourceToolBox.hasAttribute( "collapsed" ) ) {
          sourceToolBox.removeAttribute( "collapsed" );
        }
        setupSourceEditorMarkers();
        onSourceWindowResize();
      }
      onSelectionChanged();
    };

    function doneSourceEditing() {
      if ( isSourceEditingActive ) {
        isSourceEditingActive = false;
        sourceToolBox.setAttribute( "collapsed", "true" );
      }
    };

    // MARKER HELPERS

    function insertMarkers( ranges, markers ) {
      var range, startContainer, startOffset, endContainer, endOffset;
      var uuid, startMarker, startSplit, endMarker, endSplit;
      for ( var i = 0; i < ranges.length; i++ ) {
        range = ranges[i];
        startContainer = range.startContainer;
        startOffset = range.startOffset;
        endContainer = range.endContainer;
        endOffset = range.endOffset;
        uuid = Utils.createUUID();
        startMarker = designEditor.document.createTextNode(
          "{" + i + ":" + uuid + ":BEGIN}"
        );
        endMarker = designEditor.document.createTextNode(
          "{" + i + ":" + uuid + ":END}"
        );
        startSplit = null;
        endSplit = null;
        switch ( startContainer.nodeType ) {
          case Ci.nsIDOMNode.TEXT_NODE:
            if ( startOffset > 0 &&
                 startOffset < startContainer.textContent.length ) {
              startSplit = splitNode( startContainer, startOffset, true );
              if ( endContainer == startContainer ) {
                endOffset -= startOffset;
              }
              for ( var j = i + 1; j < ranges.length; j++ ) {
                if ( ranges[j].startContainer === startContainer ) {
                  ranges[j].startOffset -= startOffset;
                }
                if ( ranges[j].endContainer === startContainer ) {
                  ranges[j].endOffset -= startOffset;
                }
              }
              startOffset = 0;
            }
            if ( startOffset < startContainer.textContent.length ) {
              startContainer.parentNode.insertBefore(
                startMarker, startContainer );
            } else {
              startContainer.parentNode.insertBefore(
                startMarker, startContainer.nextSibling );
            }
            break;
          case Ci.nsIDOMNode.ELEMENT_NODE:
            startContainer.insertBefore(
              startMarker, startContainer.childNodes[startOffset] );
            if ( endContainer == startContainer ) {
              endOffset++;
            }
            for ( var j = i + 1; j < ranges.length; j++ ) {
              if ( ranges[j].startContainer === startContainer ) {
                ranges[j].startOffset++;
              }
              if ( ranges[j].endContainer === startContainer ) {
                ranges[j].endOffset++;
              }
            }
            break;
        }
        switch ( endContainer.nodeType ) {
          case Ci.nsIDOMNode.TEXT_NODE:
            if ( endOffset > 0 &&
                 endOffset < endContainer.textContent.length ) {
              endSplit = splitNode( endContainer, endOffset, true );
              for ( var j = i + 1; j < ranges.length; j++ ) {
                if ( ranges[j].startContainer === endContainer ) {
                  ranges[j].startOffset -= endOffset;
                }
                if ( ranges[j].endContainer === endContainer ) {
                  ranges[j].endOffset -= endOffset;
                }
              }
              endOffset = 0;
            }
            if ( endOffset < endContainer.textContent.length ) {
              endContainer.parentNode.insertBefore(
                endMarker, endContainer );
            } else {
              if ( endContainer == startContainer &&
                   endOffset == startOffset ) {
                endContainer.parentNode.insertBefore(
                  endMarker, startMarker.nextSibling );
              } else {
                endContainer.parentNode.insertBefore(
                  endMarker, endContainer.nextSibling );
              }
            }
            break;
          case Ci.nsIDOMNode.ELEMENT_NODE:
            if ( endContainer == startContainer &&
                 endOffset == startOffset ) {
              endContainer.insertBefore(
                endMarker, startMarker.nextSibling );
            } else {
              endContainer.insertBefore(
                endMarker, endContainer.childNodes[endOffset] );
            }
            for ( var j = i + 1; j < ranges.length; j++ ) {
              if ( ranges[j].startContainer === endContainer ) {
                ranges[j].startOffset++;
              }
              if ( ranges[j].endContainer === endContainer ) {
                ranges[j].endOffset++;
              }
            }
            break;
        }
        markers.push( {
          id: uuid,
          startMarker: startMarker,
          startSplit: startSplit,
          endMarker: endMarker,
          endSplit: endSplit
        } );
      }
    };

    function removeMarkers( markers ) {
      var marker, startMarker, startSplit, endMarker, endSplit;
      for ( var i = 0; i < markers.length; i++ ) {
        marker = markers[i];
        startMarker = marker.startMarker;
        startSplit = marker.startSplit;
        endMarker = marker.endMarker;
        endSplit = marker.endSplit;
        // order of calls is very significant
        endMarker.parentNode.removeChild( endMarker );
        if ( endSplit ) {
          joinNodes( endSplit, endSplit.nextSibling, true );
        }
        startMarker.parentNode.removeChild( startMarker );
        if ( startSplit ) {
          joinNodes( startSplit, startSplit.nextSibling, true );
        }
      }
    };

    function calcMarkersIndexies( markers ) {
      var result = [];
      try {
        var data = self.getDocument().serializeToString(
          designEditor.document,
          currentNote.getURI(),
          currentNote.getBaseURI()
        );
        var uuid, startMarker, endMarker, startIndex, endIndex;
        for ( var i = 0; i < markers.length; i++ ) {
          uuid = markers[i].id;
          startMarker = "{" + i + ":" + uuid + ":BEGIN}";
          endMarker = "{" + i + ":" + uuid + ":END}";
          startIndex = data.indexOf( startMarker );
          data = data.substring( 0, startIndex ) +
                 data.substring( startIndex + startMarker.length );
          endIndex = data.indexOf( endMarker );
          data = data.substring( 0, endIndex ) +
                 data.substring( endIndex + endMarker.length );
          result.push( {
            startIndex: startIndex,
            endIndex: endIndex,
            data: data.substring( startIndex, endIndex )
          } );
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      }
      return result;
    };

    function clearNodeIndexiesCache() {
      nodeIndexiesCache.splice( 0, nodeIndexiesCache.length );
    };

    function getNodeIndexiesFromCache( node ) {
      var idxs;
      for ( var i = 0; i < nodeIndexiesCache.length; i++ ) {
        if ( nodeIndexiesCache[i].node === node ) {
          idxs = nodeIndexiesCache[i].indexies;
          return {
            startIndex: idxs.startIndex,
            endIndex: idxs.endIndex,
            data: idxs.data
          };
        }
      }
      return null;
    };

    function putNodeIndexiesToCache( node, indexies ) {
      var idxs, index = -1;
      for ( var i = 0; i < nodeIndexiesCache.length; i++ ) {
        if ( nodeIndexiesCache[i].node === node ) {
          index = i;
          break;
        }
      }
      if ( index == -1 ) {
        nodeIndexiesCache.push( {
          node: node,
          indexies: {}
        } );
        index = nodeIndexiesCache.length - 1;
      }
      idxs = nodeIndexiesCache[index].indexies;
      idxs.startIndex = indexies.startIndex;
      idxs.endIndex = indexies.endIndex;
      idxs.data = indexies.data;
    };

    function getNodeIndexies( node ) {
      var nodeIndexies = getNodeIndexiesFromCache( node );
      if ( !nodeIndexies ) {
        var parent = node.parentNode;
        var index = DOMUtils.getNodeIndexInParent( node );
        var nodeMarkers = [];
        insertMarkers(
          [ {
            startContainer: parent,
            startOffset: index,
            endContainer: parent,
            endOffset: index + 1
          } ],
          nodeMarkers
        );
        nodeIndexies = calcMarkersIndexies( nodeMarkers )[0];
        removeMarkers( nodeMarkers );
        putNodeIndexiesToCache( node, nodeIndexies );
      }
      return nodeIndexies;
    };

    // flag: 0 - start marker || 1 - end marker
    function getMarkerPosition( index, flag ) {
      var BEFORE_NODE = -1;
      var BEFORE_FIRST_CHILD = -2;
      var IN_NODE = 0;
      var AFTER_LAST_CHILD = 2;
      var AFTER_NODE = 1;
      //
      function findMarkerPosition( node, index, flag ) {
        var delta = flag ? 1 : 0;
        var nodeIndexies = getNodeIndexies( node );
        var startIndex = nodeIndexies.startIndex;
        var endIndex = nodeIndexies.endIndex;
        var data = nodeIndexies.data;
        var child, offset, entities, result;
        if ( index < startIndex + delta ) {
          return {
            place: BEFORE_NODE,
            container: null
          };
        }
        if ( index >= endIndex + delta ) {
          return {
            place: AFTER_NODE,
            container: null
          };
        }
        if ( !node.hasChildNodes() ) {
          if ( node.nodeType === Ci.nsIDOMNode.TEXT_NODE ) {
            offset = index - startIndex;
            data = data.substring( 0, offset );
            // fix up offset taking into consideration entities presence
            entities = data.match(
              /&(?:#([0-9]+)|#x([0-9a-fA-F]+)|([0-9a-zA-Z]+));/gm
            );
            if ( entities ) {
              for ( var i = 0; i < entities.length; i++ ) {
                offset -= entities[i].length - 1;
              }
            }
            return {
              place: IN_NODE,
              container: node,
              offset: offset
            };
          }
          return {
            place: IN_NODE,
            container: node.parentNode,
            offset: DOMUtils.getNodeIndexInParent( node )
          };
        }
        child = node.firstChild;
        while ( child ) {
          result = findMarkerPosition( child, index, flag );
          if ( result.place == IN_NODE ||
               result.place == BEFORE_FIRST_CHILD ||
               result.place == AFTER_LAST_CHILD ) {
            return result;
          }
          if ( result.place == BEFORE_NODE ) {
            return {
              place: BEFORE_FIRST_CHILD,
              container: node,
              offset: 0
            };
          }
          child = child.nextSibling;
        }
        return {
          place: AFTER_LAST_CHILD,
          container: node,
          offset: node.childNodes.length
        };
      };
      //
      var body = designEditor.document.body;
      var result = findMarkerPosition( body, index, flag );
      switch ( result.place ) {
        case BEFORE_NODE:
          result.container = body;
          result.offset = 0;
          break;
        case AFTER_NODE:
          result.container = body;
          result.offset = body.childNodes.length;
          break;
      }
      return result;
    };

    // MARKERS

    function setupSourceEditorMarkers() {
      var selectionRanges, sourceMarkers, designMarkers = [];
      selectionRanges = getSelectionRanges();
      insertMarkers( selectionRanges, designMarkers );
      sourceMarkers = calcMarkersIndexies( designMarkers );
      removeMarkers( designMarkers );
      setSelectionRanges( selectionRanges );
      if ( !sourceMarkers.length ) {
        sourceMarkers = [ {
          startIndex: 0,
          endIndex: 0
        } ];
      }
      var doc = sourceEditor.getDoc();
      var from, to, sourceRanges = [];
      for ( var i = 0; i < sourceMarkers.length; i++ ) {
        from = doc.posFromIndex( sourceMarkers[i].startIndex );
        to = doc.posFromIndex( sourceMarkers[i].endIndex );
        sourceRanges.push( {
          anchor: from,
          head: to
        } );
      }
      doc.setSelections( sourceRanges );
      sourceEditor.scrollIntoView( { from: from, to: to },
        Math.floor( sourceEditorHeight * 0.8 ) );
    };

    function setupDesignEditorMarkers() {
      var editorStartIndex, editorEndIndex, tmpIndex;
      var startPosition, endPosition, selectionRanges = [];
      var sourceRanges = sourceEditor.listSelections();
      clearNodeIndexiesCache();
      for ( var i = 0; i < sourceRanges.length; i++ ) {
        editorStartIndex = sourceEditor.indexFromPos( sourceRanges[i].anchor );
        editorEndIndex = sourceEditor.indexFromPos( sourceRanges[i].head );
        if ( editorStartIndex > editorEndIndex ) {
          tmpIndex = editorEndIndex;
          editorEndIndex = editorStartIndex;
          editorStartIndex = tmpIndex;
        }
        startPosition = getMarkerPosition( editorStartIndex, 0 );
        if ( editorStartIndex == editorEndIndex ) {
          endPosition = {
            container: startPosition.container,
            offset: startPosition.offset
          };
        } else {
          endPosition = getMarkerPosition( editorEndIndex, 1 );
        }
        selectionRanges.push( {
          startContainer: startPosition.container,
          startOffset: startPosition.offset,
          endContainer: endPosition.container,
          endOffset: endPosition.offset
        } );
      }
      setSelectionRanges( selectionRanges );
    };

    // KEYSET
    
    function setupKeyset() {
      editorKeyset = new ru.akman.znotes.Keyset(
        currentDocument.getElementById( "znotes_editor_keyset" ),
        self.getDefaultPreferences().shortcuts
      );
    };

    function updateKeyset() {
      editorKeyset.update( currentPreferences.shortcuts );
    };

    function activateKeyset() {
      editorKeyset.activate();
    };

    function deactivateKeyset() {
      editorKeyset.deactivate();
    };

    // LISTENERS

    function addEventListeners() {
      editorTabs.addEventListener( "select", onEditorTabSelect, false );
      designFrame.addEventListener( "click", designClickHandler, false );
      designFrame.addEventListener( "mouseover", designOverHandler, false );
      //
      designFrame.contentDocument.addEventListener( "mouseup",
        onSelectionChanged, false );
      designFrame.contentDocument.addEventListener( "keyup",
        onSelectionChanged, false );
      //
      sourceWindow.addEventListener( "resize",
        onSourceWindowResize, false );
      sourceFrame.contentDocument.addEventListener( "mouseup",
        onSelectionChanged, false );
      sourceFrame.contentDocument.addEventListener( "keyup",
        onSelectionChanged, false );
      //
      editMenuPopup.addEventListener( "popupshowing",
        onEditMenuPopupShowing, false );
      editSpellMenuPopup.addEventListener( "popupshowing",
        onEditSpellMenuPopupShowing, false );
      editSpellMenuPopup.addEventListener( "popuphiding",
        onEditSpellMenuPopupHiding, false );
      //
      fontSizeTextBox.addEventListener( "change",
        onFontSizeTextBoxChange, false );
      fontSizeTextBox.addEventListener( "focus",
        onFontSizeTextBoxFocus, false );
      //
      currentNote.addStateListener( noteStateListener );
      currentBookTagList.addStateListener( tagListStateListener );
    };

    function removeEventListeners() {
      editorTabs.removeEventListener( "select", onEditorTabSelect, false );
      designFrame.removeEventListener( "click", designClickHandler, false );
      designFrame.removeEventListener( "mouseover", designOverHandler, false );
      //
      if ( currentNote && currentNote.isExists() ) {
        designFrame.contentDocument.removeEventListener( "mouseup",
          onSelectionChanged, false );
        designFrame.contentDocument.removeEventListener( "keyup",
          onSelectionChanged, false );
      }
      //
      sourceWindow.removeEventListener( "resize",
        onSourceWindowResize, false );
      if ( currentNote && currentNote.isExists() ) {
        sourceFrame.contentDocument.removeEventListener( "mouseup",
          onSelectionChanged, false );
        sourceFrame.contentDocument.removeEventListener( "keyup",
          onSelectionChanged, false );
      }
      //
      editMenuPopup.removeEventListener( "popupshowing",
        onEditMenuPopupShowing, false );
      editSpellMenuPopup.removeEventListener( "popupshowing",
        onEditSpellMenuPopupShowing, false );
      editSpellMenuPopup.removeEventListener( "popuphiding",
        onEditSpellMenuPopupHiding, false );
      //
      fontSizeTextBox.removeEventListener( "change",
        onFontSizeTextBoxChange, false );
      fontSizeTextBox.removeEventListener( "focus",
        onFontSizeTextBoxFocus, false );
      //
      currentNote.removeStateListener( noteStateListener );
      currentBookTagList.removeStateListener( tagListStateListener );
    };

    // INIT & DONE

    function initSourceEditor() {
      sourceWindow = sourceFrame.contentWindow;
      sourceEditorLibrary = sourceWindow.Source.getLibrary();
      sourceEditor = sourceWindow.Source.getEditor();
    };

    function initDesignEditor() {
      designFrame.contentDocument.designMode = "on";
      designFrame.contentDocument.designMode = "off";
    };

    function init( callback, wait ) {
      var initProgress = 0;

      function onCallback() {
        if ( initProgress == 10 ) {
          loadPrefs();
          prefsMozillaObserver.register();
          prefsBundle.addObserver( prefObserver );
          self.getDocument().addObserver( docPrefObserver );
          editorController.register();
          editController.register();
          spellEditController.register();
          addEventListeners();
          restoreToolbarCurrentSet();
          setupKeyset();
          updateKeyset();
          activateKeyset();
          load();
          callback();
        }
      };

      function onInitDone() {
        initProgress += 4;
        onCallback();
      };

      currentBookTagList = currentNote.getBook().getTagList();
      noteStateListener = {
        name: "EDITOR:XHTML",
        onNoteMainTagChanged: onNoteMainTagChanged,
        onNoteMainContentChanged: onNoteMainContentChanged,
        onNoteDataChanged: onNoteDataChanged
      };
      tagListStateListener = {
        onTagChanged: onTagChanged,
        onTagDeleted: onTagDeleted
      };
      documentStateListener = {
        NotifyDocumentStateChanged: onDesignDocumentStateChanged,
        NotifyDocumentCreated: function() {},
        NotifyDocumentWillBeDestroyed: function() {}
      };
      createFormatBlockObject();
      //
      designToolBox = currentDocument.getElementById( "designToolBox" );
      designToolBox.customizeDone = function( isChanged ) {
        updateStyle();
        saveToolbarCurrentSet();
      };
      designToolBar1 = currentDocument.getElementById( "designToolBar1" );
      designToolBar2 = currentDocument.getElementById( "designToolBar2" );
      //
      sourceToolBox = currentDocument.getElementById( "sourceToolBox" );
      sourceToolBox.customizeDone = function( isChanged ) {
        updateStyle();
        saveToolbarCurrentSet();
      };
      sourceToolBar1 = currentDocument.getElementById( "sourceToolBar1" );
      sourceToolBar2 = currentDocument.getElementById( "sourceToolBar2" );
      //
      editMenuPopup =
        currentDocument.getElementById( "znotes_edit_menupopup" );
      editSpellMenuPopup =
        currentDocument.getElementById( "znotes_editspell_menupopup" );
      //
      fontNameMenuPopup =
        currentDocument.getElementById( "fontNameMenuPopup" );
      fontNameMenuList =
        currentDocument.getElementById( "fontNameMenuList" );
      fontSizeTextBox =
        currentDocument.getElementById( "fontSizeTextBox" );
      foreColorButton =
        currentDocument.getElementById( "znotes_forecolor_button" );
      backColorButton =
        currentDocument.getElementById( "znotes_backcolor_button" );
      formatBlockMenuPopup =
        currentDocument.getElementById( "formatBlockMenuPopup" );
      formatBlockMenuList =
        currentDocument.getElementById( "formatBlockMenuList" );
      //
      editorTabs = currentDocument.getElementById( "editorTabs" );
      editorTabSource = currentDocument.getElementById( "editorTabSource" );
      //
      designFrame = currentDocument.getElementById( "designEditor" );
      sourceFrame = currentDocument.getElementById( "sourceEditor" );
      sourcePrintFrame = currentDocument.getElementById( "sourcePrintFrame" );
      //
      if ( wait ) {
        var onDesignFrameLoad = function() {
          designFrame.removeEventListener( "load", onDesignFrameLoad, true );
          initProgress += 1;
          initDesignEditor();
          onCallback();
        };
        var onSourceFrameLoad = function() {
          sourceFrame.removeEventListener( "load", onSourceFrameLoad, true );
          currentWindow.setTimeout( function() {
            initProgress += 2;
            initSourceEditor();
            onCallback();
          }, 0 );
        };
        var onPrintFrameLoad = function() {
          sourcePrintFrame.removeEventListener( "load",
            onPrintFrameLoad, true );
          initProgress += 3;
          onCallback();
        };
        designFrame.addEventListener( "load", onDesignFrameLoad, true );
        sourceFrame.addEventListener( "load", onSourceFrameLoad, true );
        sourcePrintFrame.addEventListener( "load", onPrintFrameLoad, true );
      } else {
        initProgress = 6;
        initSourceEditor();
        initDesignEditor();
      }
      onInitDone();
    };

    function done() {
      if ( currentMode == "editor" ) {
        if ( !stop() ) {
          cancel();
        }
        // switchMode( "viewer" );
      }
      prefsMozillaObserver.unregister();
      self.getDocument().removeObserver( docPrefObserver );
      prefsBundle.removeObserver( prefObserver );
      deactivateKeyset();
      removeEventListeners();
      spellEditController.unregister();
      editController.unregister();
      editorController.unregister();
      if ( designFrame.hasAttribute( "body.backgroundColor" ) ) {
        designFrame.removeAttribute( "body.backgroundColor" );
      }
      currentNote = null;
      currentDocument = null;
      currentWindow = null;
    };

    // PRIVATE

    function switchToDesignTab() {
      if ( editorTabs.selectedIndex == 1 ) {
        editorTabs.selectedIndex = 0;
      } else {
        onEditorTabSelect();
      }
    };

    function switchMode( mode ) {
      if ( currentMode && currentMode == mode ) {
        return;
      }
      currentMode = mode;
      if ( currentMode == "editor" ) {
        start();
      }
      switchToDesignTab();
      notifyStateListener(
        new ru.akman.znotes.core.Event(
          "ModeChanged",
          { note: currentNote, mode: currentMode }
        )
      );
    };

    function switchState( value ) {
      if ( isEditorDirty === value ) {
        return;
      }
      isEditorDirty = value;
      notifyStateListener(
        new ru.akman.znotes.core.Event(
          "StateChanged",
          { note: currentNote, dirty: isEditorDirty }
        )
      );
    };

    function load() {
      var res = currentNote.getDocument();
      if ( res.result && res.changed ) {
        // if document changed (fixed up) then
        // save changes before load it the first time
        currentNote.removeStateListener( noteStateListener );
        currentNote.setMainContent( res.data );
        currentNote.addStateListener( noteStateListener );
      }
      sourceEditor.setValue( res.data );
      sourceEditor.clearHistory();
      loadDesign();
    };

    function start() {
      var body, tagColor;
      if ( editorTabs.hasAttribute( "hidden" ) ) {
        editorTabs.removeAttribute( "hidden" );
      }
      if ( Utils.IS_EDIT_SOURCE_ENABLED ) {
        if ( editorTabSource.hasAttribute( "hidden" ) ) {
          editorTabSource.removeAttribute( "hidden" );
        }
      } else {
        editorTabSource.setAttribute( "hidden", "true" );
      }
      tagColor = designFrame.getAttribute( "body.backgroundColor" );
      body = designFrame.contentDocument.body;
      if ( body && body.style ) {
        if ( tagColor ) {
          body.style.setProperty( 'background-color', tagColor );
        } else {
          body.style.removeProperty( 'background-color' );
          if ( body.style.length == 0 ) {
            body.removeAttribute( "style" );
          }
        }
      }
      Common.goSetCommandHidden( "znotes_close_command", false, currentWindow );
      createFontNameMenuList();
      createFormatBlockMenuList();
      sourceEditor.clearHistory();
      sourceEditor.setSelection( { line: 0, ch: 0 } );
      sourceEditor.on( "change", onSourceEditorChange );
      designFrame.setAttribute( "context", "znotes_editspell_menupopup" );
      designFrame.contentDocument.designMode = "on";
      designFrame.contentDocument.execCommand(
        'styleWithCSS', false, null );
      designFrame.contentDocument.execCommand(
        'enableInlineTableEditing', false, null );
      designFrame.contentDocument.execCommand(
        'enableObjectResizing', false, null );
      designFrame.contentDocument.execCommand(
        'insertBrOnReturn', false, null );
      designEditor =
        designFrame.contentWindow
                   .QueryInterface( Ci.nsIInterfaceRequestor )
                   .getInterface( Ci.nsIWebNavigation )
                   .QueryInterface( Ci.nsIInterfaceRequestor )
                   .getInterface( Ci.nsIEditingSession )
                   .getEditorForWindow( designFrame.contentWindow )
                   .QueryInterface( Ci.nsIHTMLEditor )
                   .QueryInterface( Ci.nsIEditorStyleSheets );
      designEditor.addOverrideStyleSheet( tagsSheetURL );
      currentPreferences.isTagsModeActive ? switchTagsOn() : switchTagsOff();
      spellCheckerUI = new ru.akman.znotes.spellchecker.InlineSpellChecker(
        designEditor );
      setCommandState( "znotes_spellcheckenabled_command",
        spellCheckerUI && currentPreferences.isSpellcheckEnabled );
      designEditor.setSpellcheckUserOverride(
        spellCheckerUI && currentPreferences.isSpellcheckEnabled );
      designEditorTM = designEditor.transactionManager;
      designEditorTM =
        designEditorTM.QueryInterface( Ci.nsITransactionManager );
      designEditorTM.maxTransactionCount = -1;
      designEditor.resetModificationCount();
      designEditorTM.clear();
      designEditor.enableUndo( true );
      undoState.clear();
      isEditorDirty = false;
      designFrame.contentWindow.focus();
    };

    function stop() {
      if ( currentNote && currentNote.isExists() && isEditorDirty ) {
        switch ( confirm() ) {
          case -1:
            return false;
          case 1:
            save();
            break;
          case 0:
            cancel();
            break;
        }
      } else {
        cancel();
      }
      if ( isSourceEditingActive ) {
        doneSourceEditing();
      }
      if ( isDesignEditingActive ) {
        doneDesignEditing();
      }
      // BUG: Blinked cursor remains in the editor after closing
      // without following line
      designFrame.setAttribute( "context", "znotes_edit_menupopup" );
      editorTabs.setAttribute( "hidden", "true" );
      editorTabSource.setAttribute( "hidden", "true" );
      designToolBox.setAttribute( "collapsed", "true" );
      sourceToolBox.setAttribute( "collapsed", "true" );
      sourceEditor.off( "change", onSourceEditorChange );
      switchTagsOff();
      if ( currentNote && currentNote.isExists() ) {
        Common.goSetCommandHidden( "znotes_close_command", true, currentWindow );
        designEditor.selection.removeAllRanges();
        designFrame.contentDocument.designMode = "off";
        var body = designFrame.contentDocument.body;
        if ( body && body.style ) {
          designFrame.setAttribute(
            "body.backgroundColor",
            body.style.getPropertyValue( 'background-color' )
          );
        }
      }
      designEditor = null;
      designEditorTM = null;
      spellCheckerUI = null;
      initialCaretPosition = null;
      return true;
    };

    function save() {
      if ( isEditorDirty ) {
        if ( isParseModified || isDesignModified() ) {
          loadSource();
        } else if ( isSourceModified() ) {
          loadDesign();
        }
        // @@@@ 1 setMainContent
        currentNote.removeStateListener( noteStateListener );
        currentNote.setMainContent( sourceEditor.getValue() );
        currentNote.addStateListener( noteStateListener );
        sourceEditor.clearHistory();
        designEditor.enableUndo( false );
        designEditor.resetModificationCount();
        designEditor.enableUndo( true );
        undoState.clear();
        switchState( false );
        onSelectionChanged();
      }
    };

    function cancel( force ) {
      if ( isEditorDirty || force ) {
        if ( currentNote && currentNote.isExists() ) {
          load();
        }
        designEditor.enableUndo( false );
        designEditor.resetModificationCount();
        designEditor.enableUndo( true );
        sourceEditor.clearHistory();
        undoState.clear();
        if ( currentNote && currentNote.isExists() ) {
          switchState( false );
          onSelectionChanged();
        }
      }
    };

    function confirm() {
      var params = {
        input: {
          kind: 2,
          title: getString(
            "body.confirmSave.title"
          ),
          message1: getFormattedString(
            "body.confirmSave.message1",
            [ currentNote.getName() ]
          ),
          message2: getString(
            "body.confirmSave.message2"
          )
        },
        output: null
      };
      currentWindow.openDialog(
        "chrome://znotes/content/confirmdialog.xul",
        "",
        "chrome,dialog,modal,centerscreen,resizable=no",
        params
      ).focus();
      if ( params.output ) {
        return ( params.output.result ? 1 : 0 );
      }
      return -1;
    };

    function print() {
      var aContentWindow = designFrame.contentWindow;
      var sourceEditorText, ranges, doc, printView;
      var sourceText, lineCount, row, lIndex, rIndex;
      if ( editorTabs.selectedIndex == 1 ) {
        sourceEditorText = sourceEditor.getValue();
        if ( sourceEditor.somethingSelected() ) {
          ranges = sourceEditor.listSelections();
        } else {
          ranges = [{
            anchor: sourceEditor.posFromIndex( 0 ),
            head: sourceEditor.posFromIndex( sourceEditorText.length )
          }];
        }
        doc = sourcePrintFrame.contentWindow.document;
        printView = doc.getElementById( "printView" );
        while ( printView.firstChild ) {
          printView.removeChild( printView.firstChild );
        }
        for ( var i = 0; i < ranges.length; i++ ) {
          lIndex = sourceEditor.indexFromPos( ranges[i].anchor );
          rIndex = sourceEditor.indexFromPos( ranges[i].head );
          if ( lIndex > rIndex ) {
            sourceText = sourceEditorText.substring( rIndex, lIndex );
            row = parseInt( ranges[i].head.line ) + 1;
          } else {
            sourceText = sourceEditorText.substring( lIndex, rIndex );
            row = parseInt( ranges[i].anchor.line ) + 1;
          }
          lineCount = getCountOfLines( sourceText );
          printView.appendChild( doc.createElement( "span" ) )
                   .appendChild( doc.createTextNode(
            formatNumber( row, getCountOfDigits( lineCount ) ) + " "
          ) );
          sourceEditorLibrary.runMode(
            sourceText,
            "htmlmixed",
            function( text, style ) {
              var node;
              if ( text == "\n" ) {
                row++;
                printView.appendChild( doc.createElement( "br" ) );
                printView.appendChild( doc.createElement( "span" ) )
                         .appendChild( doc.createTextNode(
                  formatNumber( row, getCountOfDigits( lineCount ) ) + " "
                ) );
                return;
              }
              if ( style ) {
                node = printView.appendChild( doc.createElement( "span" ) );
                node.className = "cm-" + style.replace( / +/g, " cm-" );
              } else {
                node = printView;
              }
              node.appendChild( doc.createTextNode(
                replaceTabsWithSpaces( text ) ) );
            }
          );
          if ( i !== ranges.length - 1 ) {
            printView.appendChild( doc.createElement( "br" ) );
            printView.appendChild( doc.createElement( "br" ) );
            printView.appendChild( doc.createElement( "hr" ) );
            printView.appendChild( doc.createElement( "br" ) );
          }
        }
        aContentWindow = sourcePrintFrame.contentWindow;
      }
      currentWindow.openDialog(
        "chrome://znotes/content/printpreview.xul",
        "",
        "chrome,dialog=no,all,modal=yes,centerscreen,resizable=yes",
        {
          aWindow: aContentWindow,
          aTitle: currentNote.getName()
        }
      ).focus();
    };

    function updateStyle() {
      var elements = [
        designToolBox, designToolBar1, designToolBar2,
        sourceToolBox, sourceToolBar1, sourceToolBar2
      ];
      for ( var i = 0; i < elements.length; i++ ) {
        elements[i].setAttribute( "iconsize", currentStyle.iconsize );
      }
    };

    function editorInit( win, doc, note, style, wait ) {
      currentWindow = win;
      currentDocument = doc;
      currentNote = note;
      currentMode = null;
      currentStyle = {};
      Common = currentWindow.ru.akman.znotes.Common;
      prefsBundle = currentWindow.ru.akman.znotes.PrefsManager.getInstance();
      stringsBundle =
        currentDocument.getElementById( "znotes_editor_stringbundle" );
      Utils.cloneObject( style, currentStyle );
      init( function() {
        notifyStateListener(
          new ru.akman.znotes.core.Event(
            "Opened",
            { note: currentNote }
          )
        );
        switchMode( "viewer" );
        isEditorReady = true;
        updateEditorCommands();
      }, wait );
    };

    function cleanOverlay( doc ) {
      var node;
      node = doc.getElementById( "znotes_editor_commandset" );
      while ( node.firstChild ) {
        node.removeChild( node.firstChild );
      }
      node = doc.getElementById( "znotes_editor_keyset" );
      while ( node.firstChild ) {
        node.removeChild( node.firstChild );
      }
      node = doc.getElementById( "znotes_editor_popupset" );
      while ( node.firstChild ) {
        node.removeChild( node.firstChild );
      }
      node = doc.getElementById( "znotes_editor_stringbundleset" );
      while ( node.firstChild ) {
        node.removeChild( node.firstChild );
      }
      node = doc.getElementById( "znotes_editor_toolbar" );
      while ( node.firstChild ) {
        node.removeChild( node.firstChild );
      }
      node = doc.getElementById( "editorView" );
      while ( node.firstChild ) {
        node.removeChild( node.firstChild );
      }
    };
    
    // PUBLIC

    /**
     * Check editor ready state ( UI loaded )
     */
    this.isReady = function() {
      return isEditorReady;
    };

    /**
     * Check editor dirty state
     */
    this.isDirty = function() {
      return isEditorDirty;
    };

    /**
     * Open editor for a note
     * @param win Window in which Document live
     * @param doc Document in which will be loaded the editor
     * @param note Note that will be opened in the editor
     * @param style Style that will be applied to the editor
     */
    this.open = function( win, doc, note, style ) {
      isEditorReady = false;
      var editorView = doc.getElementById( "editorView" );
      var noteType = note.getType();
      var editorType = editorView.hasAttribute( "type" ) ?
        editorView.getAttribute( "type" ) : "";
      if ( editorType == noteType ) {
        editorInit( win, doc, note, style );
      } else {
        editorView.setAttribute( "type", noteType );
        cleanOverlay( doc );
        doc.loadOverlay(
          this.getDocument().getURL() + "editor.xul",
          {
            observe: function( subject, topic, data ) {
              if ( topic == "xul-overlay-merged" ) {
                editorInit( win, doc, note, style, true );
              }
            }
          }
        );
      }
    };

    /**
     * Close editor for current note
     */
    this.close = function() {
      if ( !currentDocument ) {
        throw new EditorException( "Editor was not loaded." );
      }
      notifyStateListener(
        new ru.akman.znotes.core.Event(
          "Close",
          { note: currentNote }
        )
      );
      done();
    };

    /**
     * Switch to editor mode
     */
    this.edit = function() {
      if ( !currentDocument ) {
        throw new EditorException( "Editor was not loaded." );
      }
      switchMode( "editor" );
    };

    /**
     * Save changes
     */
    this.save = function() {
      if ( !currentDocument ) {
        throw new EditorException( "Editor was not loaded." );
      }
      save();
    };

    /**
     * Discard changes
     */
    this.cancel = function() {
      if ( !currentDocument ) {
        throw new EditorException( "Editor was not loaded." );
      }
      cancel();
      switchToDesignTab();
    };

    /**
     * Print current view
     */
    this.print = function() {
      if ( !currentDocument ) {
        throw new EditorException( "Editor was not loaded." );
      }
      print();
    };

    /**
     * Update style of toolbars
     * @param style { iconsize: "small" || "normal" }
     */
    this.updateStyle = function( style ) {
      if ( !currentDocument ) {
        throw new EditorException( "Editor was not loaded." );
      }
      if ( !Utils.cloneObject( style, currentStyle ) ) {
        return;
      }
      updateStyle();
    };

    /**
     * Add state listener
     * @param stateListener Listener
     */
    this.addStateListener = function( stateListener ) {
      if ( listeners.indexOf( stateListener ) < 0 ) {
        listeners.push( stateListener );
      }
    };

    /**
     * Remove state listener
     * @param stateListener Listener
     */
    this.removeStateListener = function( stateListener ) {
      var index = listeners.indexOf( stateListener );
      if ( index < 0 ) {
        return;
      }
      listeners.splice( index, 1 );
    };

  };

}();

Editor.prototype.getDefaultPreferences = function() {
  return {
    isSpellcheckEnabled: false,
    isTagsModeActive: false,
    shortcuts: {
      znotes_bold_key: {
        command: "znotes_bold_command",
        key: "B",
        modifiers: "accel",
        keycode: ""
      },
      znotes_italic_key: {
        command: "znotes_italic_command",
        key: "I",
        modifiers: "accel",
        keycode: ""
      },
      znotes_underline_key: {
        command: "znotes_underline_command",
        key: "U",
        modifiers: "accel",
        keycode: ""
      },
      znotes_strikethrough_key: {
        command: "znotes_strikethrough_command",
        key: "",
        modifiers: "",
        keycode: ""
      },
      znotes_subscript_key: {
        command: "znotes_subscript_command",
        key: "",
        modifiers: "",
        keycode: ""
      },
      znotes_superscript_key: {
        command: "znotes_superscript_command",
        key: "",
        modifiers: "",
        keycode: ""
      },
      znotes_forecolor_key: {
        command: "znotes_forecolor_command",
        key: "",
        modifiers: "",
        keycode: ""
      },
      znotes_forecolordelete_key: {
        command: "znotes_forecolordelete_command",
        key: "",
        modifiers: "",
        keycode: ""
      },
      znotes_backcolor_key: {
        command: "znotes_backcolor_command",
        key: "",
        modifiers: "",
        keycode: ""
      },
      znotes_backcolordelete_key: {
        command: "znotes_backcolordelete_command",
        key: "",
        modifiers: "",
        keycode: ""
      },
      znotes_justifyleft_key: {
        command: "znotes_justifyleft_command",
        key: "L",
        modifiers: "accel",
        keycode: ""
      },
      znotes_justifyright_key: {
        command: "znotes_justifyright_command",
        key: "R",
        modifiers: "accel",
        keycode: ""
      },
      znotes_justifycenter_key: {
        command: "znotes_justifycenter_command",
        key: "E",
        modifiers: "accel",
        keycode: ""
      },
      znotes_justifyfull_key: {
        command: "znotes_justifyfull_command",
        key: "J",
        modifiers: "accel",
        keycode: ""
      },
      znotes_indent_key: {
        command: "znotes_indent_command",
        key: "[",
        modifiers: "accel",
        keycode: ""
      },
      znotes_outdent_key: {
        command: "znotes_outdent_command",
        key: "]",
        modifiers: "accel",
        keycode: ""
      },
      znotes_insertparagraph_key: {
        command: "znotes_insertparagraph_command",
        key: "",
        modifiers: "",
        keycode: ""
      },
      znotes_link_key: {
        command: "znotes_link_command",
        key: "L",
        modifiers: "accel",
        keycode: ""
      },
      znotes_unlink_key: {
        command: "znotes_unlink_command",
        key: "K",
        modifiers: "accel,shift",
        keycode: ""
      },
      znotes_removeformat_key: {
        command: "znotes_removeformat_command",
        key: "Y",
        modifiers: "accel,shift",
        keycode: ""
      },
      znotes_insertorderedlist_key: {
        command: "znotes_insertorderedlist_command",
        key: "F12",
        modifiers: "",
        keycode: ""
      },
      znotes_insertunorderedlist_key: {
        command: "znotes_insertunorderedlist_command",
        key: "F12",
        modifiers: "shift",
        keycode: ""
      },
      znotes_inserthorizontalrule_key: {
        command: "znotes_inserthorizontalrule_command",
        key: "",
        modifiers: "",
        keycode: ""
      },
      znotes_inserttable_key: {
        command: "znotes_inserttable_command",
        key: "F12",
        modifiers: "accel",
        keycode: ""
      },
      znotes_insertimage_key: {
        command: "znotes_insertimage_command",
        key: "",
        modifiers: "",
        keycode: ""
      },
      znotes_toggletagsmode_key: {
        command: "znotes_toggletagsmode_command",
        key: "",
        modifiers: "",
        keycode: ""
      },
      znotes_importresources_key: {
        command: "znotes_importresources_command",
        key: "",
        modifiers: "",
        keycode: ""
      },
      znotes_sourcebeautify_key: {
        command: "znotes_sourcebeautify_command",
        key: "",
        modifiers: "",
        keycode: ""
      },
      znotes_close_key: {
        command: "znotes_close_command",
        key: "",
        modifiers: "",
        keycode: ""
      },
      znotes_editorcustomizetoolbar_key: {
        command: "znotes_editorcustomizetoolbar_command",
        key: "",
        modifiers: "",
        keycode: ""
      },
      znotes_editordebug_key: {
        command: "znotes_editordebug_command",
        key: "",
        modifiers: "",
        keycode: ""
      }
    }
  };
};
