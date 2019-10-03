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

const EXPORTED_SYMBOLS = ["Params"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};

Cu.import( "resource://znotes/utils.js", ru.akman.znotes );

var Params = function() {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "drivers.default.params" );

  var pub = {};

  var currentWindow = null;
  var currentDocument = null;
  var currentDriver = null;
  var originalConnection = null;
  var currentConnection = null;
  var stringBundle = null;

  var textEncoding = null;
  var textPath = null;
  var buttonPath = null;
  var extensionsTree = null;
  var extensionsTreeChildren = null;
  var extensionsTreeTextBox = null;
  var extensionsTreeBoxObject = null;

  var oldValue = null;
  var newValue = null;

  // HELPERS

  function onFolderPicker( event ) {
    var result, currentFolder =
      Cc["@mozilla.org/file/local;1"]
      .createInstance( Ci.nsIFile );
    var filePicker =
      Cc["@mozilla.org/filepicker;1"]
      .createInstance( Ci.nsIFilePicker );
    filePicker.init( currentWindow, null, Ci.nsIFilePicker.modeGetFolder );
    try {
      currentFolder.initWithPath( textPath.value );
      while ( !currentFolder.exists() || !currentFolder.isDirectory() ) {
        currentFolder = currentFolder.parent;
      }
      filePicker.displayDirectory = currentFolder;
    } catch ( e ) {
      filePicker.displayDirectory = Utils.getDataPath();
    }
    result = filePicker.show();
    if ( result === Ci.nsIFilePicker.returnOK ||
         result === Ci.nsIFilePicker.returnReplace ) {
      textPath.value = filePicker.file.path;
      currentConnection.path = textPath.value;
      textPath.setAttribute( "tooltiptext", textPath.value );
    }
  };

  function onEncodingChange( event ) {
    if ( !textEncoding.value.trim().length ) {
      Utils.beep();
      textEncoding.value = currentConnection.encoding;
    } else {
      textEncoding.value = textEncoding.value.trim();
      currentConnection.encoding = textEncoding.value;
    }
  };

  function onPathChange( event ) {
    var currentFolder =
      Cc["@mozilla.org/file/local;1"]
      .createInstance( Ci.nsIFile );
    try {
      currentFolder.initWithPath( textPath.value );
      textPath.value = currentFolder.path;
      currentConnection.path = textPath.value;
      textPath.setAttribute( "tooltiptext", textPath.value );
    } catch ( e ) {
      Utils.beep();
      textPath.value = currentConnection.path;
      textPath.setAttribute( "tooltiptext", textPath.value );
    }
  };

  function checkExtension( aType, anExtension ) {
    return currentDriver.checkExtension( anExtension ) &&
           /^\.[^.\\/:*?"<>|\s]+$/g.test( anExtension );
  };

  function getFileExtension( leafName ) {
    var result = /\.[^.\\/:*?"<>|\s]+$/g.exec( leafName );
    if ( result ) {
      return result[0];
    }
    return "";
  };

  function getFileName( leafName ) {
    return leafName.substring( 0,
      leafName.length - getFileExtension( leafName ).length );
  };

  function processCategoryEntry( root, exts ) {
    var entry, entries = root.getEntries();
    for ( var i = 0; i < entries.length; i++ ) {
      entry = entries[i];
      if ( entry.isCategory() ) {
        processCategoryEntry( entry, exts );
      } else {
        processNoteEntry( entry, exts );
      }
    }
  };

  function processNoteEntry( entry, exts ) {
    var type = entry.getType();
    if ( type in exts ) {
      try {
        entry.setLeafName( getFileName( entry.getLeafName() ) + exts[type] );
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      }
    }
  };

  // EXTENSIONS TREE

  function createExtensionsTreeItem( aType, aValue ) {
    var anItem, aRow, aCell;
    aRow = currentDocument.createElement( "treerow" );
    aCell = currentDocument.createElement( "treecell" );
    aCell.setAttribute( "label", aType );
    aCell.setAttribute( "properties", "extension" );
    // Utils.getMimeTypeIcon( aType, 16 )
    aCell.setAttribute( "src", Utils.getExtensionIcon( aValue, 16 ) );
    aRow.appendChild( aCell );
    aCell = currentDocument.createElement( "treecell" );
    aCell.setAttribute( "label", aValue );
    aRow.appendChild( aCell );
    anItem = currentDocument.createElement( "treeitem" );
    anItem.appendChild( aRow );
    anItem.setAttribute( "value", aType );
    return anItem;
  };

  function fillExtensionsTree() {
    var aType, aValue;
    for ( aType in currentConnection.extensions ) {
      aValue = currentConnection.extensions[aType];
      extensionsTreeChildren.appendChild(
        createExtensionsTreeItem( aType, aValue )
      );
    }
  };

  function onExtensionsTreeDblClick( event ) {
    var aRow = extensionsTreeBoxObject.getRowAt( event.clientX, event.clientY );
    if ( event.button != "0" ||
         aRow < 0 || aRow > extensionsTree.view.rowCount - 1 ) {
      event.stopPropagation();
      event.preventDefault();
      return false;
    }
    var aColumn =
      extensionsTree.columns.getNamedColumn( "extensionsTreeValue" );
    extensionsTree.setAttribute( "editable", "true" );
    extensionsTree.startEditing( aRow, aColumn );
    return true;
  };

  function onExtensionsTreeTextBoxEvent( event ) {
    var aRow, aColumn, aCell, anItem, aType, textLength;
    switch ( event.type ) {
      case "keypress" :
        switch ( event.keyCode ) {
          case event.DOM_VK_HOME :
            if ( event.shiftKey ) {
              extensionsTreeTextBox.setSelectionRange(
                0, extensionsTreeTextBox.selectionEnd );
            } else {
              extensionsTreeTextBox.setSelectionRange( 0, 0 );
            }
            break;
          case event.DOM_VK_END :
            textLength = extensionsTreeTextBox.textLength;
            if ( textLength > 0 ) {
              if ( event.shiftKey ) {
                extensionsTreeTextBox.setSelectionRange(
                  extensionsTreeTextBox.selectionStart, textLength );
              } else {
                extensionsTreeTextBox.setSelectionRange(
                  textLength, textLength );
              }
            }
            break;
        }
        break;
      case "focus" :
        aRow = extensionsTree.currentIndex;
        aColumn = extensionsTree.columns.getNamedColumn(
          "extensionsTreeValue" );
        oldValue = extensionsTree.view.getCellText( aRow, aColumn );
        break;
      case "blur" :
        aRow = extensionsTree.currentIndex;
        aColumn = extensionsTree.columns.getNamedColumn(
          "extensionsTreeValue" );
        newValue = extensionsTree.view.getCellText( aRow, aColumn );
        if ( newValue.trim().length == 0 ) {
          extensionsTree.view.setCellText( aRow, aColumn, oldValue );
          extensionsTree.setAttribute( "editable", "false" );
          break;
        }
        if ( oldValue != newValue ) {
          aType = extensionsTree.view.getCellText( aRow,
            extensionsTree.columns.getNamedColumn( "extensionsTreeType" ) );
          if ( !checkExtension( aType, newValue ) ) {
            extensionsTree.view.setCellText( aRow, aColumn, oldValue );
            Utils.beep();
          } else {
            anItem = extensionsTree.view.getItemAtIndex( aRow );
            aCell = anItem.firstChild.childNodes[
              extensionsTree.columns.getNamedColumn(
                "extensionsTreeType" ).index ];
            aCell.setAttribute( "src", Utils.getExtensionIcon( newValue, 16 ) );
            currentConnection.extensions[aType] = newValue;
          }
        }
        extensionsTree.setAttribute( "editable", "false" );
        break;
    }
    return true;
  };

  // PUBLIC

  /**
   * Called when loaded UI
   * @param win Window in which Document live
   * @param doc Document in which will be loaded the UI
   * @param originalConn Object contains original connection object
   * @param currentConn Object contains current connection object
   */
  pub.open = function( win, doc, driver, originalConn, currentConn ) {
    currentWindow = win;
    currentDocument = doc;
    currentDriver = driver;
    originalConnection = originalConn;
    currentConnection = currentConn;
    stringBundle = currentDocument.getElementById( "paramsStringbundle" );
    textEncoding = currentDocument.getElementById( "textbox_encoding" );
    textPath = currentDocument.getElementById( "textbox_path" );
    buttonPath = currentDocument.getElementById( "button_path" );
    extensionsTree = currentDocument.getElementById( "extensionsTree" );
    extensionsTreeChildren =
      currentDocument.getElementById( "extensionsTreeChildren" );
    extensionsTreeTextBox = extensionsTree.inputField;
    extensionsTreeBoxObject = extensionsTree.boxObject;
    extensionsTreeBoxObject.QueryInterface( Ci.nsITreeBoxObject );
    //
    textEncoding.value = currentConnection.encoding;
    textPath.value = currentConnection.path;
    textPath.setAttribute( "tooltiptext", textPath.value );
    fillExtensionsTree();
    //
    textEncoding.addEventListener( "change", onEncodingChange, false );
    textPath.addEventListener( "change", onPathChange, false );
    buttonPath.addEventListener( "command", onFolderPicker, false );
    extensionsTree.addEventListener( "dblclick",
      onExtensionsTreeDblClick, false );
    extensionsTreeTextBox.addEventListener( "focus",
      onExtensionsTreeTextBoxEvent, false );
    extensionsTreeTextBox.addEventListener( "keypress",
      onExtensionsTreeTextBoxEvent, false );
    extensionsTreeTextBox.addEventListener( "blur",
      onExtensionsTreeTextBoxEvent, false );
  };

  /**
   * Called on accept button pressed
   * before close dialog
   */
  pub.accept = function( connection ) {
    var type, value, args, exts = {};
    for ( type in currentConnection.extensions ) {
      value = currentConnection.extensions[type];
      if ( originalConnection.extensions[type] !== value ) {
        exts[type] = value;
      }
    }
    if ( !Object.keys( exts ).length ) {
      return;
    }
    args = {
      input: {
        title: stringBundle.getString( "confirm.rename.title" ),
        message1: stringBundle.getString( "confirm.rename.message1" ),
        message2: stringBundle.getString( "confirm.rename.message2" )
      },
      output: null
    };
    currentWindow.openDialog(
      "chrome://znotes/content/confirmdialog.xul",
      "",
      "chrome,dialog=yes,modal=yes,centerscreen,resizable=no",
      args
    ).focus();
    if ( args.output && args.output.result ) {
      currentWindow.setCursor( "wait" );
      processCategoryEntry( connection.getRootCategoryEntry(), exts );
      currentWindow.setCursor( "auto" );
    }
  };

  return pub;

}();
