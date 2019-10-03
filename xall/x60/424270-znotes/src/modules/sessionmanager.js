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

const EXPORTED_SYMBOLS = ["SessionManager"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};

Cu.import( "resource://znotes/utils.js", ru.akman.znotes );

var SessionManager = function() {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "modules.sessionmanager" );

  var persistedState = null;
  var currentState = null;

  function getEntry() {
    var entry = Utils.getPlacesPath();
    var placeId = Utils.getPlaceId();
    entry.append( placeId );
    if ( !entry.exists() || !entry.isDirectory() ) {
      entry.create( Ci.nsIFile.DIRECTORY_TYPE, parseInt( "0755", 8 ) );
    }
    entry.append( "session.json" );
    return entry.clone();
  };

  function loadSession() {
    var state = {
      tabs: []
    };
    var entry = getEntry();
    if ( !entry.exists() ) {
      return state;
    }
    try {
      var data = Utils.readFileContent( entry, "UTF-8" );
      state = JSON.parse( data );
    } catch ( e ) {
      log.warn( e + "\n" + Utils.dumpStack() );
      state = {
        tabs: []
      };
    }
    return state;
  };

  function saveSession( state ) {
    var data = JSON.stringify( state, null, 2 );
    var entry = getEntry();
    Utils.writeFileContent( entry, "UTF-8", data );
  };

  var pub = {};

  pub.init = function() {
    persistedState = loadSession();
    currentState = { tabs: [] };
    saveSession( currentState );
  };

  pub.getPersistedState = function() {
    return { tabs: persistedState.tabs.slice( 0 ) };
  };

  pub.getCurrentState = function() {
    return { tabs: currentState.tabs.slice( 0 ) };
  };

  pub.updateState = function( aTab, aState ) {
    if ( aState === undefined ) {
      var aState = {};
    }
    var isModified = false;
    var isFound = false;
    var mode = aTab.mode.name;
    var bookId = aTab.bookId;
    var noteId = aTab.noteId;
    for ( var i = 0; i < currentState.tabs.length; i++ ) {
      var tab = currentState.tabs[i];
      if ( tab.state.noteId == noteId ) {
        if ( "opened" in aState ) {
          if ( !aState.opened ) {
            currentState.tabs.splice( i, 1 );
            saveSession( currentState );
            return;
          }
        }
        isFound = true;
        if ( "background" in aState ) {
          if ( tab.state.background != aState.background ) {
            tab.state.background = aState.background;
            isModified = true;
          }
        }
      }
    }
    if ( "opened" in aState ) {
      if ( !isFound && aState.opened ) {
        currentState.tabs.push(
          {
            mode: mode,
            state: {
              bookId: bookId,
              noteId: noteId,
              background: true
            },
            ext: {}
          }
        );
        isModified = true;
      }
    }
    if ( isModified ) {
      saveSession( currentState );
    }
  };

  pub.getInstance = function() {
    return this;
  };

  return pub;

}();
