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

const EXPORTED_SYMBOLS = ["Options"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};

Cu.import( "resource://znotes/utils.js", ru.akman.znotes );

var Options = function() {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "documents.text.options" );

  var Common = null;

  var pub = {};

  var stringBundle = null;

  var currentWindow = null;
  var currentDocument = null;
  var currentPreferences = null;
  var currentName = null;

  var defaultEditorPrefs = null;
  var originalEditorPrefs = null;
  var currentEditorPrefs = null;

  var defaultDocPrefs = null;
  var originalDocPrefs = null;
  var currentDocPrefs = null;

  var editorShortcuts = {};
  var editorSuffix = null;

  var isSpellcheckEnabled = null;
  //var fileExtension = null;

  // HELPERS

  function getString( name ) {
    return Utils.STRINGS_BUNDLE.getString( name );
  };

  function isShortcutChanged( shortcuts, name ) {
    var value = ( shortcuts[name]["original"] === null ) ?
      shortcuts[name]["default"] : shortcuts[name]["original"];
    return shortcuts[name]["current"] !== value;
  };

  function getTabShortcuts( defaultShortcuts, currentShortcuts ) {
    var name, result = {};
    for ( var id in defaultShortcuts ) {
      name = Utils.getNameFromId( id );
      if ( name in currentShortcuts ) {
        result[name] = currentShortcuts[name];
      } else {
        result[name] = Utils.getShortcutFromAttributes(
          defaultShortcuts[id].key,
          defaultShortcuts[id].keycode,
          defaultShortcuts[id].modifiers
        );
      }
    }
    return result;
  };

  function getEditorShortcuts() {
    var name, result = {};
    for ( var name in editorShortcuts ) {
      result[name] = editorShortcuts[name]["current"];
    }
    return result;
  };

  function checkShortcut( shortcuts, name, shortcut ) {
    for ( var n in shortcuts ) {
      if ( n != name && shortcuts[n] === shortcut ) {
        return true;
      }
    }
    return false;
  };

  function isShortcutExists( name, shortcut ) {
    var shortcuts;
    for ( var tab in currentPreferences ) {
      if ( tab == currentName ) {
        shortcuts = getEditorShortcuts();
        if ( checkShortcut( shortcuts, name, shortcut ) ) {
          return 1;
        }
      } else if ( tab == "main" ) {
        shortcuts = getTabShortcuts(
          currentPreferences[tab]["default"].shortcuts,
          currentPreferences[tab]["current"].shortcuts
        );
        if ( checkShortcut( shortcuts, name, shortcut ) ) {
          return 2;
        }
      } else {
        shortcuts = getTabShortcuts(
          currentPreferences[tab]["default"].editor.shortcuts,
          currentPreferences[tab]["current"].editor.shortcuts
        );
        if ( checkShortcut( shortcuts, name, shortcut ) ) {
          return 3;
        }
      }
    }
    return 0;
  };

  /**
   * existsFlag == 0 shortcut does not exist yet
   * existsFlag == 1 shortcut exists in current shrortcuts
   * existsFlag == 2 shortcut exists in main shortcuts
   * existsFlag == 3 shortcut exists in other shortcuts
   */
  function alertTextbox( shortcuts, textbox, message, value, existsFlag ) {
    var win = textbox.ownerDocument.defaultView;
    var flag = ( existsFlag === undefined ) ? 1 : existsFlag;
    if ( flag == 1 ) {
      textbox.inputField.style.setProperty( "background-color", "red" );
    } else if ( flag == 2 ) {
      textbox.inputField.style.setProperty( "background-color", "magenta" );
    } else if ( flag == 3 ) {
      textbox.inputField.style.setProperty( "background-color", "tomato" );
    }
    textbox.style.setProperty( "font-style", "italic" );
    textbox.style.removeProperty( "color" );
    textbox.style.removeProperty( "font-weight" );
    textbox.value = message;
    Utils.beep();
    win.setTimeout(
      function () {
        textbox.value = value;
        updateTextboxStyle( shortcuts, textbox );
      },
      1200
    );
  };

  function updateTextboxStyle( shortcuts, textbox ) {
    var name = Utils.getNameFromId( textbox.getAttribute( "id" ) );
    textbox.inputField.style.setProperty( "letter-spacing", "1px" );
    textbox.inputField.style.removeProperty( "background-color" );
    if ( isShortcutChanged( shortcuts, name ) ) {
      textbox.style.setProperty( "color", "red" );
    } else {
      textbox.style.removeProperty( "color" );
    }
    if ( textbox.value !== "" ) {
      textbox.style.removeProperty( "font-style" );
      textbox.style.setProperty( "font-weight", "bold" );
    } else {
      textbox.style.setProperty( "font-style", "italic" );
      textbox.style.removeProperty( "font-weight" );
    }
  };

  // SHORTCUTS

  function loadShortcuts( shortcuts, deftPrefs, origPrefs, currPrefs ) {
    var defaultShortcuts = ( "shortcuts" in deftPrefs ) ?
      deftPrefs.shortcuts : {};
    var originalShortcuts = ( "shortcuts" in origPrefs ) ?
      origPrefs.shortcuts : {};
    var currentShortcuts = ( "shortcuts" in currPrefs ) ?
      currPrefs.shortcuts : {};
    var name;
    for ( name in shortcuts ) {
      delete shortcuts[name];
    }
    for ( var id in defaultShortcuts ) {
      name = Utils.getNameFromId( id );
      shortcuts[name] = {
        "command": defaultShortcuts[id].command,
        "default": Utils.getShortcutFromAttributes(
          defaultShortcuts[id].key,
          defaultShortcuts[id].keycode,
          defaultShortcuts[id].modifiers
        ),
        "original": null,
        "current": null
      };
      if ( name in currentShortcuts ) {
        shortcuts[name]["current"] = currentShortcuts[name];
      } else {
        shortcuts[name]["current"] = shortcuts[name]["default"];
      }
      if ( name in originalShortcuts ) {
        shortcuts[name]["original"] = originalShortcuts[name];
      } else {
        shortcuts[name]["original"] = null;
      }
    }
  };

  // VIEW

  function createItem( doc, shortcuts, name, suffix ) {
    var cmd = doc.getElementById(
      shortcuts[name].command );
    var tooltiptext = cmd.getAttribute( "tooltiptext" );
    var item = doc.createElement( "richlistitem" );
    item.setAttribute( "id", "znotes_" + name + "_richlistitem" + suffix );
    item.setAttribute( "class", "key_item" );
    item.setAttribute( "tooltiptext", tooltiptext );
    var hbox = doc.createElement( "hbox" );
    hbox.setAttribute( "id", "znotes_" + name + "_hbox" + suffix );
    hbox.setAttribute( "class", "key_hbox" );
    hbox.setAttribute( "flex", "1" );
    var image = doc.createElement( "image" );
    image.setAttribute( "id", "znotes_" + name + "_image" + suffix );
    image.setAttribute( "class", "znotes_" + name + "_class key_image" );
    hbox.appendChild( image );
    var label = doc.createElement( "label" );
    label.setAttribute( "id", "znotes_" + name + "_label" + suffix );
    label.setAttribute( "class", "key_label" );
    label.setAttribute( "flex", "1" );
    label.setAttribute( "crop", "center" );
    label.setAttribute( "value", tooltiptext );
    hbox.appendChild( label );
    var textbox = doc.createElement( "textbox" );
    textbox.setAttribute( "id", "znotes_" + name + "_textbox" + suffix );
    textbox.setAttribute( "minwidth", "200" );
    textbox.setAttribute( "value", shortcuts[name]["current"] );
    if ( shortcuts[name]["current"] !== "" ) {
      textbox.style.setProperty( "font-weight", "bold" );
    }
    textbox.setAttribute( "placeholder",
      getString( "options.key.notassigned" ) );
    textbox.setAttribute( "class", "key_textbox" );
    textbox.setAttribute( "tooltiptext",
      getString( "options.key.pressakey" ) );
    hbox.appendChild( textbox );
    var bDefault = doc.createElement( "toolbarbutton" );
    bDefault.setAttribute( "id",
      "znotes_" + name + "_toolbarbutton1" + suffix );
    bDefault.setAttribute( "class", "key_default" );
    bDefault.setAttribute( "tooltiptext", getString( "options.key.default" ) );
    hbox.appendChild( bDefault );
    var bClear = doc.createElement( "toolbarbutton" );
    bClear.setAttribute( "id", "znotes_" + name + "_toolbarbutton2" + suffix );
    bClear.setAttribute( "class", "key_clear" );
    bClear.setAttribute( "tooltiptext", getString( "options.key.clear" ) );
    hbox.appendChild( bClear );
    item.appendChild( hbox );
    if ( Utils.IS_STANDALONE && cmd.hasAttribute( "thunderbird" ) ) {
      item.setAttribute( "collapsed", "true" );
    }
    textbox.addEventListener( "keypress", onKeyPress, false );
    bDefault.addEventListener( "command", onDefaultPress, false );
    bClear.addEventListener( "command", onClearPress, false );
    return {
      item: item,
      textbox: textbox
    };
  };

  function populateShortcuts( shortcuts, listbox, appendix ) {
    var suffix = ( appendix === undefined ) ? "" : appendix;
    var doc = listbox.ownerDocument;
    while ( listbox.firstChild ) {
      listbox.removeChild( listbox.firstChild );
    }
    var item;
    for ( var name in shortcuts ) {
      item = createItem( doc, shortcuts, name, suffix );
      listbox.appendChild( item.item );
      updateTextboxStyle( shortcuts, item.textbox );
    }
  };

  // EVENTS

  function onKeyPress( event ) {
    var id = event.target.getAttribute( "id" );
    var name = Utils.getNameFromId( id );
    var doc = event.target.ownerDocument;
    var textbox = doc.getElementById(
      "znotes_" + name + "_textbox" + editorSuffix );
    var shortcut = Utils.getShortcutFromEvent( event );
    var existsFlag = isShortcutExists( name, shortcut );
    if ( existsFlag ) {
      alertTextbox(
        editorShortcuts,
        textbox,
        getString( "options.key.duplicated" ),
        editorShortcuts[name]["current"],
        existsFlag
      );
    } else {
      textbox.value = shortcut;
      editorShortcuts[name]["current"] = shortcut;
      updateTextboxStyle( editorShortcuts, textbox );
    }
    event.preventDefault();
    event.stopPropagation();
    return false;
  };

  function onClearPress( event ) {
    var id = event.target.getAttribute( "id" );
    var name = Utils.getNameFromId( id );
    var doc = event.target.ownerDocument;
    var textbox = doc.getElementById(
      "znotes_" + name + "_textbox" + editorSuffix );
    textbox.value = "";
    editorShortcuts[name]["current"] = "";
    updateTextboxStyle( editorShortcuts, textbox );
  };

  function onDefaultPress( event ) {
    var id = event.target.getAttribute( "id" );
    var name = Utils.getNameFromId( id );
    var doc = event.target.ownerDocument;
    var textbox = doc.getElementById(
      "znotes_" + name + "_textbox" + editorSuffix );
    textbox.value = editorShortcuts[name]["default"];
    editorShortcuts[name]["current"] = editorShortcuts[name]["default"];
    updateTextboxStyle( editorShortcuts, textbox );
  };

  function onDefaults( event ) {
    isSpellcheckEnabled.checked = defaultEditorPrefs.isSpellcheckEnabled;
    //fileExtension.value = defaultDocPrefs.fileExtension;
    var doc = event.target.ownerDocument;
    var textbox;
    for ( var name in editorShortcuts ) {
      textbox = doc.getElementById(
        "znotes_" + name + "_textbox" + editorSuffix );
      editorShortcuts[name]["current"] = editorShortcuts[name]["default"];
      textbox.value = editorShortcuts[name]["default"];
      updateTextboxStyle( editorShortcuts, textbox );
    }
  };

  function onKeySelect( event ) {
    var doc = event.target.ownerDocument;
    var id = event.explicitOriginalTarget.getAttribute( "id" );
    var name = Utils.getNameFromId( id );
    var textbox = doc.getElementById(
      "znotes_" + name + "_textbox" + editorSuffix );
  };

  // PREFERENCES

  function updateDocPreferences( currPrefs, origPrefs ) {
    var isChanged = false;
    //currPrefs.fileExtension = fileExtension.value.trim();
    //isChanged = isChanged ||
    //  ( currPrefs.fileExtension !== origPrefs.fileExtension );
    return isChanged;
  };

  function updateEditorPreferences( currPrefs, origPrefs ) {
    var isChanged = false;
    currPrefs.isSpellcheckEnabled = isSpellcheckEnabled.checked;
    isChanged = isChanged ||
      ( currPrefs.isSpellcheckEnabled !== origPrefs.isSpellcheckEnabled );
    return isChanged;
  };

  function updateShortcutPreferences( currPrefs, shortcuts ) {
    var shortcut;
    var result = {};
    var isChanged = false;
    for ( var name in shortcuts ) {
      shortcut = shortcuts[name]["current"];
      shortcut = ( shortcuts[name]["default"] === shortcut ) ?
        null : shortcut;
      if ( shortcut !== shortcuts[name]["original"] ) {
        shortcuts[name]["original"] = shortcut;
        isChanged = true;
      }
      if ( shortcut !== null ) {
        result[name] = shortcut;
      }
    }
    currPrefs.shortcuts = result;
    return isChanged;
  };

  // INIT

  function init() {
    isSpellcheckEnabled = currentDocument.getElementById(
      "isSpellcheckEnabled" + editorSuffix );
    isSpellcheckEnabled.checked = currentEditorPrefs.isSpellcheckEnabled;
    //fileExtension = currentDocument.getElementById(
    //  "fileExtension" + editorSuffix );
    //fileExtension.value = ( currentDocPrefs.fileExtension === undefined ?
    //  "" : currentDocPrefs.fileExtension );
    var keysListBox = currentDocument.getElementById(
      "keysListBox" + editorSuffix );
    keysListBox.addEventListener( "select", onKeySelect, false );
    loadShortcuts( editorShortcuts, defaultEditorPrefs, originalEditorPrefs, currentEditorPrefs );
    populateShortcuts( editorShortcuts, keysListBox, editorSuffix );
    keysListBox.selectedIndex = keysListBox.itemCount ? 0 : -1;
    if ( currentPreferences[currentName].activeElement ) {
      currentPreferences[currentName].activeElement.focus();
    }
  };

  // PUBLIC

  /**
   * Called to reset values to defaults
   */
  pub.defaults = function( event ) {
    onDefaults( event );
  };

  /**
   * Called when closing tab
   */
  pub.close = function() {
    currentPreferences[currentName].activeElement =
      currentDocument.activeElement;
    var isChanged = false;
    if ( updateDocPreferences( currentDocPrefs, originalDocPrefs ) ) {
      isChanged = true;
    }
    if ( updateEditorPreferences( currentEditorPrefs, originalEditorPrefs ) ) {
      isChanged = true;
    }
    if ( updateShortcutPreferences( currentEditorPrefs, editorShortcuts ) ) {
      isChanged = true;
    }
    return isChanged;
  };

  /**
   * Called when opening tab
   * @param win Window in which Document live
   * @param doc Document in which will be loaded the editor
   * @param prefs Object contains original and current preferences for all tabs
   */
  pub.open = function( win, doc, prefs ) {
    currentName = pub.getDocument().getName();
    currentWindow = win;
    currentDocument = doc;
    currentPreferences = prefs;
    defaultEditorPrefs = currentPreferences[currentName]["default"].editor;
    defaultDocPrefs = currentPreferences[currentName]["default"].document;
    originalEditorPrefs = currentPreferences[currentName]["original"].editor;
    originalDocPrefs = currentPreferences[currentName]["original"].document;
    currentEditorPrefs = currentPreferences[currentName]["current"].editor;
    currentDocPrefs = currentPreferences[currentName]["current"].document;
    Common = currentWindow.ru.akman.znotes.Common;
    stringBundle = currentDocument.getElementById(
      "znotes_editor_stringbundle" );
    editorSuffix = ":" + currentName.toLowerCase();
    init();
  };

  /**
   * Is support UI
   */
  pub.isSupported = function() {
    return true;
  };

  return pub;

}();
