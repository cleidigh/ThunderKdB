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
Cu.import( "resource://znotes/event.js", ru.akman.znotes.core );
Cu.import( "resource://znotes/prefsmanager.js", ru.akman.znotes );
Cu.import( "resource://gre/modules/InlineSpellChecker.jsm",
  ru.akman.znotes.spellchecker );
Cu.import( "resource://znotes/keyset.js", ru.akman.znotes );

var Editor = function() {

  return function() {

    var Utils = ru.akman.znotes.Utils;
    var Images = ru.akman.znotes.Images;

    var log = Utils.getLogger( "documents.text.editor" );

    // can't be initialized at once
    var Common = null;
    var prefsBundle = null;

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

    var designEditor = null;
    var isEditorDirty = false;
    var isDesignEditingActive = false;
    var isEditorReady = false;

    var editorKeyset = null;
    var editorTabs = null;
    var designFrame = null;
    var viewerFrame = null;
    var printFrame = null;
    var designToolBox = null;
    var designToolBar = null;
    var editMenuPopup = null;
    var editSpellMenuPopup = null;
    var spellCheckerUI = null;

    var fontNameMenuPopup = null;
    var fontNameMenuList = null;
    var fontSizeTextBox = null;
    var foreColorButton = null;
    var backColorButton = null;

    var viewState = {
      bold: false,
      italic: false,
      underline: false,
      justifycenter: false,
      justifyleft: false,
      justifyright: false,
      justifyfull: false
    };

    var prefObserver = {
      onPrefChanged: function( event ) {
        var docName = self.getDocument().getName();
        switch( event.data.name ) {
          case "designToolbarCurrentSet." + docName:
            restoreToolbarCurrentSet();
            break;
          case "isReplaceBackground":
            Utils.IS_REPLACE_BACKGROUND =
              prefsBundle.getBoolPref( "isReplaceBackground" );
            setBackgroundColor();
            break;
        }
      }
    };

    var docPrefObserver = {
      onEditorPreferencesChanged: onEditorPreferencesChanged,
      onDocumentPreferencesChanged: onDocumentPreferencesChanged
    };

    // COMMANDS

    var editorCommands = {
      "znotes_close_command": null,
      "znotes_bold_command": null,
      "znotes_italic_command": null,
      "znotes_underline_command": null,
      "znotes_forecolor_command": null,
      "znotes_backcolor_command": null,
      "znotes_justifycenter_command": null,
      "znotes_justifyleft_command": null,
      "znotes_justifyright_command": null,
      "znotes_justifyfull_command": null,
      "znotes_editorcustomizetoolbar_command": null,
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
          case "znotes_bold_command":
          case "znotes_italic_command":
          case "znotes_underline_command":
          case "znotes_forecolor_command":
          case "znotes_backcolor_command":
          case "znotes_justifycenter_command":
          case "znotes_justifyleft_command":
          case "znotes_justifyright_command":
          case "znotes_justifyfull_command":
          case "znotes_editorcustomizetoolbar_command":
            return isDesignEditingActive;
        }
        return false;
      },
      doCommand: function( cmd ) {
        switch ( cmd ) {
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
          case "znotes_forecolor_command":
            doForeColor();
            break;
          case "znotes_backcolor_command":
            doBackColor();
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
          case "znotes_editorcustomizetoolbar_command":
            currentWindow.openDialog(
              "chrome://global/content/customizeToolbar.xul",
              "",
              "chrome,all,dependent,centerscreen",
              designToolBox
            ).focus();
            break;
        }
      },
      onEvent: function( event ) {
      },
      getName: function() {
        return "EDITOR:TEXT";
      },
      getCommand: function( cmd ) {
        return ( cmd in editorCommands ) ?
          currentDocument.getElementById( cmd ) : null;
      },
      updateCommands: function() {
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

    function isDesignFrameFocused() {
      return currentDocument.activeElement == designFrame.inputField;
    };

    function isViewerFrameFocused() {
      return currentDocument.activeElement == viewerFrame;
    };

    function isTextSelected() {
      if ( isDesignFrameFocused() ) {
        return designFrame.selectionStart != designFrame.selectionEnd;
      }
      var win = currentDocument.commandDispatcher.focusedWindow;
      var selection = win.getSelection();
      return selection && !selection.isCollapsed;
    };

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
        var isEnabled, canUndo, canRedo;
        switch ( cmd ) {
          case "znotes_undo_command":
            if ( !isDesignEditingActive ) {
              return false;
            }
            isEnabled = {};
            canUndo = {};
            designEditor.canUndo( isEnabled, canUndo );
            return canUndo.value;
          case "znotes_redo_command":
            if ( !isDesignEditingActive ) {
              return false;
            }
            isEnabled = {};
            canRedo = {};
            designEditor.canRedo( isEnabled, canRedo );
            return canRedo.value;
          case "znotes_paste_command":
            if ( !isDesignEditingActive ) {
              return false;
            }
            return designEditor.canPaste( 1 );
          case "znotes_copy_command":
            return isTextSelected();
          case "znotes_cut_command":
          case "znotes_delete_command":
            if ( !isDesignEditingActive ) {
              return false;
            }
            return isTextSelected();
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
      },
      onEvent: function( event ) {
      },
      getName: function() {
        return "EDITOR:TEXT:editController";
      },
      getCommand: function( cmd ) {
        return ( cmd in editCommands ) ? currentDocument.getElementById( cmd ) : null;
      },
      updateCommands: function() {
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
          log.warn(
            "An error occurred unregistering '" + this.getName() +
            "' controller\n" + e
          );
        }
      }
    };

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
        return "EDITOR:TEXT:spellEditController";
      },
      getCommand: function( cmd ) {
        return ( cmd in spellEditCommands ) ?
          currentDocument.getElementById( cmd ) : null;
      },
      updateCommands: function() {
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
          log.warn(
            "An error occurred unregistering '" + this.getName() +
            "' controller\n" + e
          );
        }
      }
    };

    function updateCommands() {
      editorController.updateCommands();
    };

    function updateEditCommands() {
      editController.updateCommands();
    };

    function updateSpellCommands() {
      spellEditController.updateCommands();
    };

    function getCommandState( cmd ) {
      return Common.goGetCommandAttribute( cmd, "checked", currentWindow );
    };

    function setCommandState( cmd, flag ) {
      Common.goSetCommandAttribute( cmd, "checked", flag, currentWindow );
      Common.goSetCommandAttribute( cmd, "checkState", flag, currentWindow );
    };

    function onDesignFrameKeyup() {
      updateEditCommands();
      updateEditorDirtyState();
    };
    function onDesignFrameMouseup() {
      updateEditCommands();
      updateEditorDirtyState();
    };

    function onViewerFrameKeyup() {
      updateEditCommands();
    };

    function onViewerFrameMouseup() {
      updateEditCommands();
    };

    function onEditMenuPopupShowing() {
      updateEditCommands();
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

    // COMMANDS

    function doClose() {
      if ( stop() ) {
        switchMode( "viewer" );
      }
    };

    function doBold() {
      viewState.bold = !viewState.bold;
      setCommandState( "znotes_bold_command", viewState.bold );
      var fontWeight = viewState.bold ? "bold" : "normal";
      var data = currentNote.getData();
      data.fontWeight = fontWeight;
      currentNote.setData();
      setDisplayStyle();
      designFrame.focus();
      return true;
    };

    function doItalic() {
      viewState.italic = !viewState.italic;
      setCommandState( "znotes_italic_command", viewState.italic );
      var fontStyle = viewState.italic ? "italic" : "normal";
      var data = currentNote.getData();
      data.fontStyle = fontStyle;
      currentNote.setData();
      setDisplayStyle();
      designFrame.focus();
      return true;
    };

    function doUnderline() {
      viewState.underline = !viewState.underline;
      setCommandState( "znotes_underline_command", viewState.underline );
      var textDecoration = viewState.underline ? "underline" : "none";
      var data = currentNote.getData();
      data.textDecoration = textDecoration;
      currentNote.setData();
      setDisplayStyle();
      designFrame.focus();
      return true;
    };

    function doJustifyCenter() {
      viewState.justifycenter = !viewState.justifycenter;
      viewState.justifyfull = false;
      viewState.justifyleft = false;
      viewState.justifyright = false;
      setCommandState( "znotes_justifycenter_command", viewState.justifycenter );
      setCommandState( "znotes_justifyfull_command", viewState.justifyfull );
      setCommandState( "znotes_justifyleft_command", viewState.justifyleft );
      setCommandState( "znotes_justifyright_command", viewState.justifyright );
      var textAlign = "";
      if ( viewState.justifycenter ) {
        textAlign = "center";
      }
      var data = currentNote.getData();
      data.textAlign = textAlign;
      currentNote.setData();
      setDisplayStyle();
      designFrame.focus();
      return true;
    };

    function doJustifyLeft() {
      viewState.justifyleft = !viewState.justifyleft;
      viewState.justifyfull = false;
      viewState.justifycenter = false;
      viewState.justifyright = false;
      setCommandState( "znotes_justifycenter_command", viewState.justifycenter );
      setCommandState( "znotes_justifyfull_command", viewState.justifyfull );
      setCommandState( "znotes_justifyleft_command", viewState.justifyleft );
      setCommandState( "znotes_justifyright_command", viewState.justifyright );
      var textAlign = "";
      if ( viewState.justifyleft ) {
        textAlign = "start";
      }
      var data = currentNote.getData();
      data.textAlign = textAlign;
      currentNote.setData();
      setDisplayStyle();
      designFrame.focus();
      return true;
    };

    function doJustifyRight() {
      viewState.justifyright = !viewState.justifyright;
      viewState.justifyfull = false;
      viewState.justifycenter = false;
      viewState.justifyleft = false;
      setCommandState( "znotes_justifycenter_command", viewState.justifycenter );
      setCommandState( "znotes_justifyfull_command", viewState.justifyfull );
      setCommandState( "znotes_justifyleft_command", viewState.justifyleft );
      setCommandState( "znotes_justifyright_command", viewState.justifyright );
      var textAlign = "";
      if ( viewState.justifyright ) {
        textAlign = "end";
      }
      var data = currentNote.getData();
      data.textAlign = textAlign;
      currentNote.setData();
      setDisplayStyle();
      designFrame.focus();
      return true;
    };

    function doJustifyFull() {
      viewState.justifyfull = !viewState.justifyfull;
      viewState.justifyright = false;
      viewState.justifycenter = false;
      viewState.justifyleft = false;
      setCommandState( "znotes_justifycenter_command", viewState.justifycenter );
      setCommandState( "znotes_justifyfull_command", viewState.justifyfull );
      setCommandState( "znotes_justifyleft_command", viewState.justifyleft );
      setCommandState( "znotes_justifyright_command", viewState.justifyright );
      var textAlign = "";
      if ( viewState.justifyfull ) {
        textAlign = "justify";
      }
      var data = currentNote.getData();
      data.textAlign = textAlign;
      currentNote.setData();
      setDisplayStyle();
      designFrame.focus();
      return true;
    };

    function doForeColor() {
      var params = {
        input: {
          title: getString(
            "body.colorselectdialog.title"
          ),
          message: getString(
            "body.forecolorselectdialog.message"
          ),
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
      if ( params.output ) {
        var data = currentNote.getData();
        data.color = params.output.color;
        currentNote.setData();
        setDisplayStyle();
        setColorButtonsImages();
      }
      designFrame.focus();
      return true;
    };

    function doBackColor() {
      var params = {
        input: {
          title: getString(
            "body.colorselectdialog.title"
          ),
          message: getString(
            "body.backcolorselectdialog.message"
          ),
          color: "#FFFFFF"
        },
        output: null
      };
      currentWindow.openDialog(
        "chrome://znotes/content/colorselectdialog.xul",
        "",
        "chrome,dialog=yes,modal=yes,centerscreen,resizable=yes",
        params
      ).focus();
      if ( params.output ) {
        var data = currentNote.getData();
        data.background = params.output.color;
        currentNote.setData();
        setDisplayStyle();
        setColorButtonsImages();
      }
      designFrame.focus();
      return true;
    };

    function onFontNameChange( event ) {
      var fontFamily = fontNameMenuList.selectedItem.value;
      var data = currentNote.getData();
      data.fontFamily = fontFamily;
      currentNote.setData();
      setDisplayStyle();
      designFrame.focus();
      return true;
    };

    function onFontSizeTextBoxChange( event ) {
      var fontSize = fontSizeTextBox.value;
      var data = currentNote.getData();
      data.fontSize = fontSize;
      currentNote.setData();
      setDisplayStyle();
      designFrame.focus();
      return true;
    };

    function onFontSizeTextBoxFocus( event ) {
      fontSizeTextBox.select();
      return true;
    };

    // edit

    function doSelectAll() {
      if ( isDesignEditingActive ) {
        designEditor.selectAll();
        designFrame.focus();
      } else {
        viewerFrame.contentWindow.getSelection().selectAllChildren(
          viewerFrame.contentDocument.body
        );
        viewerFrame.contentWindow.focus();
      }
      updateEditCommands();
      return true;
    };

    function doCopy() {
      if ( isDesignEditingActive ) {
        designEditor.copy();
        designFrame.focus();
      } else {
        var transferable = Components.Constructor(
          "@mozilla.org/widget/transferable;1",
          "nsITransferable"
        )();
        transferable.init(
          currentWindow.QueryInterface( Ci.nsIInterfaceRequestor ).getInterface(
            Ci.nsIWebNavigation )
        );
        transferable.addDataFlavor( "text/unicode" );
        var textData = viewerFrame.contentWindow.getSelection().toString();
        var textSupportsString = Components.Constructor(
          "@mozilla.org/supports-string;1",
          "nsISupportsString"
        )();
        textSupportsString.data = textData;
        transferable.setTransferData(
          "text/unicode", textSupportsString, textData.length * 2 );
        var clipboard =
          Cc['@mozilla.org/widget/clipboard;1']
          .createInstance( Ci.nsIClipboard );
        clipboard.setData( transferable, null, clipboard.kGlobalClipboard );
        viewerFrame.contentWindow.focus();
      }
      updateEditCommands();
      return true;
    };

    function doCut() {
      designEditor.cut();
      designFrame.focus();
      updateEditorDirtyState();
      updateEditCommands();
      return true;
    };

    function doPaste() {
      designEditor.paste( 1 );
      designFrame.focus();
      updateEditorDirtyState();
      updateEditCommands();
      return true;
    };

    function doUndo() {
      designEditor.undo( 1 );
      designFrame.focus();
      updateEditorDirtyState();
      updateEditCommands();
      return true;
    };

    function doRedo() {
      designEditor.redo( 1 );
      designFrame.focus();
      updateEditorDirtyState();
      updateEditCommands();
      return true;
    };

    function doDelete() {
      designEditor.deleteSelection( null, null );
      designFrame.focus();
      updateEditorDirtyState();
      updateEditCommands();
      return true;
    };

    // HELPERS

    function isInEditorWindow() {
      var focusedWindow =
        currentWindow.top.document.commandDispatcher.focusedWindow;
      var focusedElement =
        currentWindow.top.document.commandDispatcher.focusedElement;
      if ( focusedWindow == currentWindow ) {
        if ( getElementId( focusedElement ) == "designFrame" ) {
          return true;
        }
        return false;
      }
      return ( focusedWindow == viewerFrame.contentWindow );
    };

    function getElementId( element ) {
      if ( !element ) {
        return null;
      }
      if ( element.hasAttribute( "id" ) ) {
        return element.getAttribute( "id" );
      }
      return getElementId( element.parentNode );
    };

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

    function setupView() {
      // font-family
      createFontNameMenuList();
      var fontNameArray = Utils.getFontNameArray();
      var fontFamily = getFontFamily( currentNote );
      fontNameMenuList.selectedIndex = fontNameArray.indexOf( fontFamily );
      if ( fontNameMenuList.selectedIndex != -1 ) {
        fontNameMenuList.style.setProperty(
          'font-family', "'" + fontFamily + "'" );
      }
      // font-size
      fontSizeTextBox.value = getFontSize( currentNote );
      // font-weight
      viewState.bold = ( getFontWeight( currentNote ) == "bold" );
      setCommandState( "znotes_bold_command", viewState.bold );
      // font-style
      viewState.italic = ( getFontStyle( currentNote ) == "italic" );
      setCommandState( "znotes_italic_command", viewState.italic );
      // text-decoration
      viewState.underline = ( getTextDecoration( currentNote ) == "underline" );
      setCommandState( "znotes_underline_command", viewState.underline );
      // text-align
      viewState.justifycenter = ( getTextAlign( currentNote ) == "center" );
      setCommandState( "znotes_justifycenter_command",
        viewState.justifycenter );
      viewState.justifyleft = ( getTextAlign( currentNote ) == "start" );
      setCommandState( "znotes_justifyleft_command", viewState.justifyleft );
      viewState.justifyright = ( getTextAlign( currentNote ) == "end" );
      setCommandState( "znotes_justifyright_command",
        viewState.justifyright );
      viewState.justifyfull = ( getTextAlign( currentNote ) == "justify" );
      setCommandState( "znotes_justifyfull_command", viewState.justifyfull );
    };

    function setDisplayStyle() {
      // design
      var style = designFrame.inputField.style;
      var textAlign = getTextAlign( currentNote );
      style.setProperty( 'font-family', "'" + getFontFamily( currentNote ) + "'" );
      style.setProperty( 'font-size', getFontSize( currentNote ) + "px" );
      style.setProperty( 'font-style', getFontStyle( currentNote ) );
      style.setProperty( 'font-weight', getFontWeight( currentNote ) );
      style.setProperty( 'color', getColor( currentNote ) );
      style.setProperty( 'background-color', getBackground( currentNote ) );
      style.setProperty( 'text-decoration', getTextDecoration( currentNote ) );
      if ( textAlign == "" ) {
        style.removeProperty( 'text-align' );
      } else {
        style.setProperty( 'text-align', textAlign );
      }
      // viewer
      style = viewerFrame.contentDocument.getElementById( "content" ).style;
      style.setProperty( 'font-family', "'" + getFontFamily( currentNote ) + "'" );
      style.setProperty( 'font-size', getFontSize( currentNote ) + "px" );
      style.setProperty( 'font-style', getFontStyle( currentNote ) );
      style.setProperty( 'font-weight', getFontWeight( currentNote ) );
      style.setProperty( 'color', getColor( currentNote ) );
      setBackgroundColor();
      style.setProperty( 'text-decoration', getTextDecoration( currentNote ) );
      if ( textAlign == "" ) {
        style.removeProperty( 'text-align' );
      } else {
        style.setProperty( 'text-align', textAlign );
      }
    };

    function getFontFamily( aNote ) {
      var data = aNote.getData();
      return data.fontFamily ? data.fontFamily : "Courier New";
    };

    function getFontSize( aNote ) {
      var data = aNote.getData();
      return data.fontSize ? data.fontSize : "16";
    };

    function getColor( aNote ) {
      var data = aNote.getData();
      return data.color ? data.color : "#000000";
    };

    function getBackground( aNote ) {
      var data = aNote.getData();
      return data.background ? data.background : "#FFFFFF";
    };

    function getFontStyle( aNote ) {
      var data = aNote.getData();
      return data.fontStyle ? data.fontStyle : "normal";
    };

    function getFontWeight( aNote ) {
      var data = aNote.getData();
      return data.fontWeight ? data.fontWeight : "normal";
    };

    function getTextDecoration( aNote ) {
      var data = aNote.getData();
      return data.textDecoration ? data.textDecoration : "none";
    };

    function getTextAlign( aNote ) {
      var data = aNote.getData();
      return data.textAlign ? data.textAlign : "";
    };

    function setColorButtonsImages() {
      if ( foreColorButton ) {
        foreColorButton.setAttribute( "image",
          Images.makeForeColorImage(
            getColor( currentNote ),
            currentStyle.iconsize == "small" ? 16 : 24,
            getBackground( currentNote )
          )
        );
      }
      if ( backColorButton ) {
        backColorButton.setAttribute( "image",
          Images.makeBackColorImage(
            getBackground( currentNote ),
            currentStyle.iconsize == "small" ? 16 : 24
          )
        );
      }
    };

    function setBackgroundColor() {
      if ( !currentNote ) {
        return;
      }
      var style = viewerFrame.contentDocument.body.style;
      if ( Utils.IS_REPLACE_BACKGROUND ) {
        var tagColor = currentBookTagList.getNoTag().getColor();
        var tagID = currentNote.getMainTag();
        if ( tagID ) {
          tagColor = currentBookTagList.getTagById( tagID ).getColor();
        }
        style.setProperty( 'background-color', tagColor );
      } else {
        style.setProperty( 'background-color', getBackground( currentNote ) );
      }
    };

    function getString( name ) {
      return Utils.STRINGS_BUNDLE.getString( name );
    };

    function getFormattedString( name, values ) {
      return Utils.STRINGS_BUNDLE.getFormattedString( name, values );
    };

    // TOOLBAR

    function restoreToolbarCurrentSet() {
      var docName = self.getDocument().getName();
      var currentset = designToolBar.getAttribute( "defaultset" );
      if ( prefsBundle.hasPref( "designToolbarCurrentSet." + docName ) ) {
        currentset = prefsBundle.getCharPref( "designToolbarCurrentSet." + docName );
      }
      designToolBar.setAttribute( "currentset", currentset );
      designToolBar.currentSet = currentset;
    };

    function saveToolbarCurrentSet() {
      var docName = self.getDocument().getName();
      var currentset = designToolBar.currentSet;
      if ( currentset != "__empty" ) {
        prefsBundle.setCharPref( "designToolbarCurrentSet." + docName, currentset );
      }
    };

    // CONTENT

    function setDesignFrameContent( aContent ) {
      designFrame.value = aContent;
      var content = viewerFrame.contentDocument.getElementById( "content" );
      if ( !content ) {
        content = viewerFrame.contentDocument.body.appendChild(
          viewerFrame.contentDocument.createElement( "pre" )
        );
        content.setAttribute( "id", "content" );
      }
      content.textContent = aContent;
    };

    function getDesignFrameContent() {
      return designFrame.value;
    };

    // TAG LIST EVENTS

    function onTagChanged( e ) {
      var aTag = e.data.changedTag;
      if ( currentNote ) {
        setBackgroundColor();
      }
    };

    function onTagDeleted( e ) {
      var aTag = e.data.deletedTag;
      if ( currentNote ) {
        setBackgroundColor();
      }
    };

    // NOTE EVENTS

    function onNoteMainTagChanged( e ) {
      var aCategory = e.data.parentCategory;
      var aNote = e.data.changedNote;
      var oldTag = e.data.oldValue;
      var newTag = e.data.newValue;
      if ( currentNote && currentNote == aNote ) {
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
      if ( currentNote && currentNote == aNote ) {
        if ( !isDesignEditingActive ) {
          load();
          return;
        }
        // TODO: see xhtml onNoteMainContentChanged()
        if ( isEditorDirty ) {
          reloadFlag = false;
          params = {
            input: {
              title: getString( "editor.confirmReload.title" ),
              message1: getFormattedString( "editor.confirmReload.message1", [ currentNote.getName() ] ),
              message2: getString( "editor.confirmReload.message2" )
            },
            output: null
          };
          currentWindow.openDialog(
            "chrome://znotes/content/confirmdialog.xul",
            "",
            "chrome,dialog=yes,modal=yes,centerscreen,resizable=no",
            params
          ).focus();
          if ( params.output && params.output.result ) {
            reloadFlag = true;
          }
        }
        if ( reloadFlag ) {
          cancel( true );
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

    // EDITOR EVENTS

    function onDocumentStateChanged( nowDirty ) {
      switchState( nowDirty );
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
        setCommandState( "znotes_spellcheckenabled_command",
          spellCheckerUI && currentPreferences.isSpellcheckEnabled );
        designEditor.setSpellcheckUserOverride(
          spellCheckerUI && currentPreferences.isSpellcheckEnabled );
      }
      updateKeyset();
    };

    // EDITOR

    function updateEditorDirtyState() {
      var isEnabled, canUndo;
      isEnabled = {};
      canUndo = {};
      designEditor.canUndo( isEnabled, canUndo );
      documentStateListener.NotifyDocumentStateChanged( canUndo.value );
    };

    function initDesignEditing() {
      if ( isDesignEditingActive ) {
        return;
      }
      isDesignEditingActive = true;
      setupView();
      setColorButtonsImages();
      viewerFrame.setAttribute( "hidden", "true" );
      designFrame.removeAttribute( "hidden" );
      designToolBox.removeAttribute( "collapsed" );
      // to get the editor ( nsIEditor ) from designFrame
      // we must first set the focus to designFrame
      designFrame.focus();
      designEditor = designFrame.editor;
      designEditor.resetModificationCount();
      designEditor.enableUndo( true );
      // spell checker
      spellCheckerUI = new ru.akman.znotes.spellchecker.InlineSpellChecker(
        designEditor );
      setCommandState( "znotes_spellcheckenabled_command",
        spellCheckerUI && currentPreferences.isSpellcheckEnabled );
      designEditor.setSpellcheckUserOverride(
        spellCheckerUI && currentPreferences.isSpellcheckEnabled );
      // BUG: Works only once!
      // BUG: Does not interact with the undo/redo system
      // designEditor.addDocumentStateListener( documentStateListener );
      designEditor.beginningOfDocument();
      designFrame.addEventListener( "keyup", onDesignFrameKeyup, false );
      designFrame.addEventListener( "mouseup", onDesignFrameMouseup, false );
      designFrame.focus();
      updateCommands();
      updateEditCommands();
      updateSpellCommands();
    };

    function doneDesignEditing() {
      if ( !isDesignEditingActive ) {
        return;
      }
      isDesignEditingActive = false;
      designFrame.removeEventListener( "keyup", onDesignFrameKeyup, false );
      designFrame.removeEventListener( "mouseup", onDesignFrameMouseup, false );
      designEditor.enableUndo( false );
      //designEditor.removeDocumentStateListener( documentStateListener );
      designEditor = null;
      spellCheckerUI = null;
      designToolBox.setAttribute( "collapsed", "true" );
      designFrame.setAttribute( "hidden", "true" );
      viewerFrame.removeAttribute( "hidden" );
      viewerFrame.contentWindow.focus();
      updateEditCommands();
    };

    function addEventListeners() {
      viewerFrame.addEventListener( "keyup", onViewerFrameKeyup, false );
      viewerFrame.addEventListener( "mouseup", onViewerFrameMouseup, false );
      editMenuPopup.addEventListener( "popupshowing", onEditMenuPopupShowing, false );
      editSpellMenuPopup.addEventListener( "popupshowing", onEditSpellMenuPopupShowing, false );
      editSpellMenuPopup.addEventListener( "popuphiding", onEditSpellMenuPopupHiding, false );
      fontSizeTextBox.addEventListener( "change", onFontSizeTextBoxChange,
        false );
      fontSizeTextBox.addEventListener( "focus", onFontSizeTextBoxFocus,
        false );
      currentNote.addStateListener( noteStateListener );
      currentBookTagList.addStateListener( tagListStateListener );
    };

    function removeEventListeners() {
      viewerFrame.removeEventListener( "keyup", onViewerFrameKeyup, false );
      viewerFrame.removeEventListener( "mouseup", onViewerFrameMouseup, false );
      editSpellMenuPopup.removeEventListener( "popupshowing", onEditSpellMenuPopupShowing, false );
      editSpellMenuPopup.removeEventListener( "popuphiding", onEditSpellMenuPopupHiding, false );
      editMenuPopup.removeEventListener( "popupshowing", onEditMenuPopupShowing, false );
      fontSizeTextBox.removeEventListener( "change", onFontSizeTextBoxChange,
        false );
      fontSizeTextBox.removeEventListener( "focus", onFontSizeTextBoxFocus,
        false );
      currentNote.removeStateListener( noteStateListener );
      currentBookTagList.removeStateListener( tagListStateListener );
    };

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

    function init( callback, wait ) {
      var initProgress = 0;
      var onCallback = function() {
        if ( initProgress == 6 ) {
          loadPrefs();
          load();
          setDisplayStyle();
          prefsBundle.addObserver( prefObserver );
          self.getDocument().addObserver( docPrefObserver );
          editorController.register();
          editController.register();
          spellEditController.register();
          addEventListeners();
          restoreToolbarCurrentSet();
          updateStyle();
          setupKeyset();
          updateKeyset();
          activateKeyset();
          callback();
        }
      };
      var onInitDone = function() {
        initProgress += 3;
        onCallback();
      };
      //
      currentBookTagList = currentNote.getBook().getTagList();
      noteStateListener = {
        name: "EDITOR:TEXT",
        onNoteMainTagChanged: onNoteMainTagChanged,
        onNoteMainContentChanged: onNoteMainContentChanged,
        onNoteDataChanged: onNoteDataChanged
      };
      tagListStateListener = {
        onTagChanged: onTagChanged,
        onTagDeleted: onTagDeleted
      };
      documentStateListener = {
        NotifyDocumentStateChanged: onDocumentStateChanged,
        NotifyDocumentCreated: function() {},
        NotifyDocumentWillBeDestroyed: function() {}
      };
      editorTabs = currentDocument.getElementById( "editorTabs" );
      designToolBox = currentDocument.getElementById( "designToolBox" );
      designToolBox.customizeDone = function( isChanged ) {
        updateStyle();
        saveToolbarCurrentSet();
      };
      designToolBar = currentDocument.getElementById( "designToolBar" );
      designFrame = currentDocument.getElementById( "designFrame" );
      viewerFrame = currentDocument.getElementById( "viewerFrame" );
      editMenuPopup = currentDocument.getElementById( "znotes_edit_menupopup" );
      editSpellMenuPopup = currentDocument.getElementById( "znotes_editspell_menupopup" );
      printFrame = currentDocument.getElementById( "printFrame" );
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
      //
      if ( wait ) {
        var onPrintFrameLoad = function() {
          printFrame.removeEventListener( "load", onPrintFrameLoad, true );
          initProgress += 1;
          onCallback();
        };
        printFrame.addEventListener( "load", onPrintFrameLoad, true );
        var onDesignViewerLoad = function() {
          viewerFrame.removeEventListener( "load", onDesignViewerLoad, true );
          initProgress += 2;
          onCallback();
        };
        viewerFrame.addEventListener( "load", onDesignViewerLoad, true );
      } else {
        initProgress = 3;
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
      deactivateKeyset();
      removeEventListeners();
      self.getDocument().removeObserver( docPrefObserver );
      prefsBundle.removeObserver( prefObserver );
      spellEditController.unregister();
      editController.unregister();
      editorController.unregister();
      currentNote = null;
      currentDocument = null;
      currentWindow = null;
    };

    function switchMode( mode ) {
      if ( currentMode && currentMode == mode ) {
        return;
      }
      currentMode = mode;
      if ( currentMode == "editor" ) {
        start();
      } else {
        load();
      }
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
      // @@@@ 1 getMainContent
      setDesignFrameContent( currentNote.getMainContent() );
    };

    function save() {
      if ( isEditorDirty ) {
        currentNote.removeStateListener( noteStateListener );
        // @@@@ 1 setMainContent
        currentNote.setMainContent( getDesignFrameContent() );
        currentNote.addStateListener( noteStateListener );
        designEditor.enableUndo( false );
        designEditor.resetModificationCount();
        designEditor.enableUndo( true );
        switchState( false );
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
        if ( currentNote && currentNote.isExists() ) {
          switchState( false );
        }
      }
    };

    function start() {
      editorTabs.removeAttribute( "hidden" );
      Common.goSetCommandHidden( "znotes_close_command", false, currentWindow );
      viewerFrame.setAttribute( "hidden", "true" );
      designFrame.removeAttribute( "hidden" );
      switchState( false );
      initDesignEditing();
    };

    function stop() {
      var res;
      if ( currentNote && currentNote.isExists() && isEditorDirty ) {
        res = confirm();
        if ( res === -1 ) {
          return false;
        }
        if ( res ) {
          save();
        } else {
          cancel();
        }
      } else {
        cancel();
      }
      if ( isDesignEditingActive ) {
        doneDesignEditing();
      }
      editorTabs.setAttribute( "hidden", "true" );
      designToolBox.setAttribute( "collapsed", "true" );
      designFrame.setAttribute( "hidden", "true" );
      viewerFrame.removeAttribute( "hidden" );
      Common.goSetCommandHidden( "znotes_close_command", true, currentWindow );
      return true;
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
      var aContentWindow = viewerFrame.contentWindow;
      if ( currentMode == "editor" ) {
        aContentWindow = printFrame.contentWindow;
        printFrame.contentDocument.body.style.setProperty(
          "background-color",
          viewerFrame.contentDocument.body.style.getPropertyValue( "background-color" )
        );
        var content = printFrame.contentDocument.getElementById( "content" );
        if ( !content ) {
          content = printFrame.contentDocument.body.appendChild(
            printFrame.contentDocument.createElement( "pre" )
          );
          content.setAttribute( "id", "content" );
        }
        content.style.setProperty( 'font-family',
          "'" + getFontFamily( currentNote ) + "'" );
        content.style.setProperty( 'font-size',
          getFontSize( currentNote ) + "px" );
        content.style.setProperty( 'font-style',
          getFontStyle( currentNote ) );
        content.style.setProperty( 'font-weight',
          getFontWeight( currentNote ) );
        content.style.setProperty( 'color',
          getColor( currentNote ) );
        content.style.setProperty( 'text-decoration',
          getTextDecoration( currentNote ) );
        var textAlign = getTextAlign( currentNote );
        if ( textAlign == "" ) {
          content.style.removeProperty( 'text-align' );
        } else {
          content.style.setProperty( 'text-align', textAlign );
        }
        content.textContent = designFrame.value;
        if ( designFrame.selectionStart != designFrame.selectionEnd ) {
          var range = printFrame.contentDocument.createRange();
          range.setStart( content.firstChild, designFrame.selectionStart );
          range.setEnd( content.firstChild, designFrame.selectionEnd );
          printFrame.contentWindow.getSelection().addRange( range );
        }
      }
      currentWindow.openDialog(
        "chrome://znotes/content/printpreview.xul",
        "",
        "chrome,dialog=no,all,modal,centerscreen,resizable",
        {
          aWindow: aContentWindow,
          aTitle: currentNote.getName()
        }
      ).focus();
    };

    function updateStyle() {
      designToolBox.setAttribute( "iconsize", currentStyle.iconsize );
      designToolBar.setAttribute( "iconsize", currentStyle.iconsize );
      if ( currentNote ) {
        setColorButtonsImages();
      }
    };

    function editorInit( win, doc, note, style, wait ) {
      currentWindow = win;
      currentDocument = doc;
      currentNote = note;
      currentMode = null;
      isEditorDirty = null;
      currentStyle = {};
      Common = currentWindow.ru.akman.znotes.Common;
      prefsBundle = currentWindow.ru.akman.znotes.PrefsManager.getInstance();
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
        updateCommands();
      }, wait );
    };

    // LISTENERS

    function notifyStateListener( event ) {
      for ( var i = 0; i < listeners.length; i++ ) {
        if ( listeners[i][ "on" + event.type ] ) {
          listeners[i][ "on" + event.type ]( event );
        }
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
        var node;
        editorView.setAttribute( "type", noteType );
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
        while ( editorView.firstChild ) {
          editorView.removeChild( editorView.firstChild );
        }
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
      znotes_forecolor_key: {
        command: "znotes_forecolor_command",
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
      }
    }
  };
};
