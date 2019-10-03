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

const EXPORTED_SYMBOLS = ["TabMonitor"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};

Cu.import( "resource://znotes/utils.js", ru.akman.znotes );
Cu.import( "resource://znotes/sessionmanager.js", ru.akman.znotes );
Cu.import( "resource://znotes/prefsmanager.js", ru.akman.znotes );

var TabMonitor = function() {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "modules.tabmonitor" );

  var sessionManager = ru.akman.znotes.SessionManager.getInstance();
  var prefsManager = ru.akman.znotes.PrefsManager.getInstance();
  var prefsMozilla =
    Cc["@mozilla.org/preferences-service;1"]
    .getService( Ci.nsIPrefBranch );
  var browserChromeURLPrefValue;
  try {
    browserChromeURLPrefValue = prefsMozilla.getCharPref( "browser.chromeURL" );
  } catch ( e ) {
    browserChromeURLPrefValue = null;
  }

  var pub = {

    monitorName: "znotesMonitor",
    mIsActive: true,

    setActive: function( isActive ) {
      pub.mIsActive = isActive;
    },

    onTabTitleChanged: function( aTab ) {
      if ( aTab.mode.name == "znotesContentTab" ) {
        sessionManager.updateState( aTab );
      }
    },

    onTabOpened: function( aTab ) {
      if ( aTab.mode.name == "znotesMainTab" ) {
        prefsManager.setBoolPref( "isOpened", true );
        prefsMozilla.setCharPref( "browser.chromeURL",
          "chrome://znotes/content/browser.xul" );
      } else if ( aTab.mode.name == "znotesContentTab" ) {
        sessionManager.updateState(
          aTab, { opened: true, background: true } );
      }
      // xr only
      if ( aTab.window && (
           aTab.mode.name == "znotesMainTab" ||
           aTab.mode.name == "znotesContentTab" ) ) {
        aTab.window.focus();
      }
    },

    onTabClosing: function( aTab ) {
      if ( aTab.mode.name == "znotesMainTab" && pub.mIsActive ) {
        prefsManager.setBoolPref( "isOpened", false );
        if ( browserChromeURLPrefValue ) {
          prefsMozilla.setCharPref( "browser.chromeURL",
            browserChromeURLPrefValue );
        }
      } else if ( aTab.mode.name == "znotesContentTab" && pub.mIsActive ) {
        sessionManager.updateState( aTab, { opened: false } );
      }
    },

    onTabPersist: function( aTab ) {
    },

    onTabRestored: function( aTab ) {
    },

    onTabSwitched: function( aNewTab, anOldTab ) {
      if ( anOldTab.mode.name == "znotesMainTab" && pub.mIsActive ) {
        prefsManager.setBoolPref( "isActive", false );
        if ( browserChromeURLPrefValue ) {
          prefsMozilla.setCharPref( "browser.chromeURL",
            browserChromeURLPrefValue );
        }
      }
      if ( anOldTab.mode.name == "znotesContentTab" && pub.mIsActive ) {
        sessionManager.updateState( anOldTab, { background: true } );
      }
      if ( aNewTab.mode.name == "znotesMainTab" && pub.mIsActive ) {
        prefsManager.setBoolPref( "isActive", true );
        prefsMozilla.setCharPref( "browser.chromeURL",
          "chrome://znotes/content/browser.xul" );
      }
      if ( aNewTab.mode.name == "znotesContentTab" && pub.mIsActive ) {
        sessionManager.updateState( aNewTab, { background: false } );
      }
      // tb only
      if ( aNewTab.browser && (
           aNewTab.mode.name == "znotesMainTab" ||
           aNewTab.mode.name == "znotesContentTab" ) ) {
        aNewTab.browser.contentWindow.focus();
      }
    },

    getInstance: function() {
      return this;
    }

  };

  return pub;

}();
