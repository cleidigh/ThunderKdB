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

const EXPORTED_SYMBOLS = ["Keyset"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};

Cu.import( "resource://znotes/utils.js", ru.akman.znotes );

var Keyset = function() {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "modules.keyset" );

  var pub = function( aKeyset, aDefaults ) {

    var _shortcuts = {};
    var _keyset = aKeyset.getAttribute( "id" );
    var _doc = aKeyset.ownerDocument;
    var _defaults = ( aDefaults === undefined ) ? null : aDefaults;

    // helpers

    function getKeyNodeAttributesFromShortcut( shortcut ) {
      var result = {
        modifiers: "",
        key: "",
        keycode: ""
      }
      var items = shortcut.split( "+" );
      if ( !items.length ) {
        return result;
      }
      result.modifiers = [];
      var item;
      for ( var i = 0; i < items.length; i++ ) {
        item = items[i];
        if ( !item.length ) {
          continue;
        }
        if ( item.length == 1 ) {
          result.key = item;
        } else {
          if ( item[1].toUpperCase() == item[1] ) {
            result.keycode = "VK_" + item;
          } else {
            result.modifiers.push( item );
          }
        }
      }
      var accel = ( Utils.getSystemInfo().OS == 'Darwin' ) ? "Meta" : "Ctrl";
      var modifier;
      for ( var i = 0; i < result.modifiers.length; i++ ) {
        modifier = result.modifiers[i];
        if ( modifier == accel ) {
          modifier = "accel";
        } else if ( modifier == "Ctrl" ) {
          modifier = "control";
        } else if ( modifier == "Meta" ) {
          modifier = "meta";
        } else if ( modifier == "Alt" ) {
          modifier = "alt";
        } else if ( modifier == "Shift" ) {
          modifier = "shift";
        }
        result.modifiers[i] = modifier;
      }
      result.modifiers = result.modifiers.sort().join( "," );
      return result;
    };

    // private

    function updateTooltips() {
      var command = null;
      var menuitem = null;
      var tooltiptext = null;
      var acceltext = null;
      var index = null;
      var popupset = _doc.getElementById( "znotes_popupset" );
      if ( !popupset ) {
        popupset = _doc.getElementById( "znotes_platform_popupset" );
      }
      var menupopup = _doc.createElement( "menupopup" );
      popupset.appendChild( menupopup );
      for ( var name in _shortcuts ) {
        command = _doc.getElementById( _shortcuts[name].command );
        menuitem = _doc.createElement( "menuitem" );
        menuitem.setAttribute( "key", command.getAttribute( "key" ) );
        _shortcuts[name].menuitem = menuitem;
        menupopup.appendChild( menuitem );
      }
      menupopup.openPopup( null, null, 0, 0, true, false, null );
      menupopup.hidePopup();
      for ( var name in _shortcuts ) {
        command = _doc.getElementById( _shortcuts[name].command );
        menuitem = _shortcuts[name].menuitem;
        delete _shortcuts[name].menuitem;
        tooltiptext = command.getAttribute( "tooltiptext" );
        acceltext = menuitem.getAttribute( "acceltext" );
        index = tooltiptext.indexOf( "\n" );
        tooltiptext = ( index < 0 ) ?
          tooltiptext : tooltiptext.substring( 0, index );
        tooltiptext = ( acceltext.length ) ?
          tooltiptext + "\n" + acceltext : tooltiptext;
        command.setAttribute( "tooltiptext", tooltiptext );
      }
      while ( menupopup.firstChild ) {
        menupopup.removeChild( menupopup.firstChild );
      }
      popupset.removeChild( menupopup );
    };

    function keypressHandler( event ) {
      var Common;
      try {
        Common = _doc.defaultView.ru.akman.znotes.Common;
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
        Common = null;
      }
      if ( !Common ) {
        return false;
      }
      var eventCharCode = ( "charCode" in event ) ? event.charCode : 0;
      var eventKeyCode = ( "keyCode" in event ) ? event.keyCode : 0;
      var eventShortcut = Utils.getShortcutFromEvent( event );
      var handler = function( node ) {
        var nodeShortcut = Utils.getShortcutFromAttributes(
          node.getAttribute( "key" ),
          node.getAttribute( "keycode" ),
          node.getAttribute( "modifiers" )
        );
        if ( nodeShortcut === eventShortcut ) {
          return node.getAttribute( "command" );
        }
        return null;
      };
      var command = processKeyset(
        _doc.getElementById( _keyset ),
        handler
      );
      if ( command &&
           Common.goDoCommand( command, event.explicitOriginalTarget ) ) {
        if ( eventCharCode ) {
          event.stopPropagation();
          event.preventDefault();
          return false;
        }
        switch ( eventKeyCode ) {
          case event.DOM_VK_DELETE:
            event.stopPropagation();
            event.preventDefault();
            return false;
          default:
            //log.debug( "keypressHandler()\ncommand: '" + command +
            //  "', keyCode: " + eventKeyCode );
        }
      }
      return true;
    };

    function processKeyset( keyset, processor ) {
      var node = keyset.firstChild;
      var result, name, command;
      while ( node ) {
        if ( node.nodeName !== "key" || !node.hasAttribute( "id" ) ||
             !node.hasAttribute( "command" ) ) {
          node = node.nextSibling;
          continue;
        }
        name = Utils.getNameFromId( node.getAttribute( "id" ) );
        if ( !name ) {
          node = node.nextSibling;
          continue;
        }
        command = node.getAttribute( "command" );
        if ( !keyset.ownerDocument.getElementById( command ) ) {
          node = node.nextSibling;
          continue;
        }
        result = processor( node );
        if ( result ) {
          return result;
        }
        node = node.nextSibling;
      }
      return false;
    };

    // public

    this.activate = function() {
      if ( _doc && _doc.defaultView ) {
        _doc.defaultView.addEventListener( "keypress", keypressHandler, false );
      }
    };

    this.deactivate = function() {
      if ( _doc && _doc.defaultView ) {
        _doc.defaultView.removeEventListener( "keypress", keypressHandler, false );
      }
    };

    this.update = function( current, original ) {
      for ( var name in _shortcuts ) {
        _shortcuts[name]["original"] = ( original && ( name in original ) ) ?
          original[name] : null;
        _shortcuts[name]["current"] = ( current && ( name in current ) ) ?
          current[name] : _shortcuts[name]["default"];
      }
      var updater = function( node ) {
        var name = Utils.getNameFromId( node.getAttribute( "id" ) );
        if ( name in _shortcuts ) {
          var attrs = getKeyNodeAttributesFromShortcut(
            _shortcuts[name]["current"] );
          node.setAttribute( "key", attrs.key );
          node.setAttribute( "keycode", attrs.keycode );
          node.setAttribute( "modifiers", attrs.modifiers );
        }
        return false;
      };
      var keyset = _doc.getElementById( _keyset );
      processKeyset( keyset, updater );
      var parent = keyset.parentNode;
      while ( parent.nodeName == "keyset" ) {
        keyset = parent;
        parent = keyset.parentNode;
      }
      var clone = keyset.cloneNode( true );
      parent.removeChild( keyset );
      parent.appendChild( clone );
      updateTooltips();
    };

    this.getShortcuts = function() {
      var name, value, result = {};
      for ( name in _shortcuts ) {
        value = _shortcuts[name]["current"];
        if ( value ) {
          result[ value ] = true;
        }
      }
      return result;
    };
    
    // constructor

    if ( !_defaults ) {
      var loader = function( node ) {
        var id = node.getAttribute( "id" );
        if ( id ) {
          var name = Utils.getNameFromId( id );
          if ( name ) {
            _shortcuts[name] = {
              "command": node.getAttribute( "command" ),
              "default": Utils.getShortcutFromAttributes(
                node.getAttribute( "key" ),
                node.getAttribute( "keycode" ),
                node.getAttribute( "modifiers" )
              ),
              "original": null,
              "current": null
            };
          }
        }
        return false;
      };
      processKeyset( _doc.getElementById( _keyset ), loader );
    } else {
      var name, key;
      for ( var id in _defaults ) {
        name = Utils.getNameFromId( id );
        if ( name ) {
          key = _defaults[id];
          _shortcuts[name] = {
            "command": key.command,
            "default": Utils.getShortcutFromAttributes(
              key.key,
              key.keycode,
              key.modifiers
            ),
            "original": null,
            "current": null
          };
        }
      }
    }

  };

  return pub;

}();
