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

const EXPORTED_SYMBOLS = ["UpdateManager"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};

Cu.import( "resource://znotes/utils.js", ru.akman.znotes );

var UpdateManager = function() {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "modules.updatemanager" );

  /*
  addons.update-checker	WARN	Update manifest was not valid XML
  ----------
  file:///F:/ZNotes/platform/locale/ru/mozapps/extensions/extensions.properties
  Line: 1, Char : 2
  # This Source Code Form is subject to the terms of the Mozilla Public
  ----------
  addons.repository	WARN	Search failed when repopulating cache
  addons.repository	WARN	AddonRepository search failed: searching false aURI null aMaxResults 3
  addons.repository	WARN	_formatURLPref: Couldn't get pref: extensions.getAddons.get.url
  */
  
  var aus, mgr, aup;

  var pub = {};

  pub.isSupported = function() {
    return ( aus != null && mgr != null && aup != null );
  };

  pub.canUpdate = function() {
    if ( !pub.isSupported() ) {
      return false;
    }
    if ( aus.canUpdate === undefined ) {
      return false;
    }
    return aus.canUpdate;
  };

  pub.isActive = function() {
    if ( !pub.isSupported() ) {
      return false;
    }
    return !!mgr.activeUpdate;
  };

  pub.getName = function() {
    if ( !pub.isSupported() ) {
      return null;
    }
    if ( mgr.activeUpdate ) {
      return mgr.activeUpdate.name;
    }
    return null;
  };

  /**
   * default     - idle
   *               show: "Check for updates ..."
   * downloading - downloading an update at present
   *               show: "Downloading updates ..."
   * paused      - paused an update at present
   *               show: "Resume downloading updates ..."
   * pending     - waiting for the user to restart,
   *               show: "Apply downloaded updates now ..."
   */
  pub.getState = function() {
    var state = "default";
    if ( pub.isSupported() && mgr.activeUpdate ) {
      switch ( mgr.activeUpdate.state ) {
        case "downloading":
          state = aus.isDownloading ? "downloading" : "paused";
          break;
        case "pending":
          state = "pending";
          break;
      }
    }
    return state;
  };

  pub.open = function() {
    if ( !pub.isSupported() ) {
      return false;
    }
    if ( mgr.activeUpdate && mgr.activeUpdate.state == "pending" ) {
      aup.showUpdateDownloaded( mgr.activeUpdate );
    } else {
      aup.checkForUpdates();
    }
    return true;
  };

  try {
    aus = Components.classes["@mozilla.org/updates/update-service;1"]
                    .getService( Components.interfaces.nsIApplicationUpdateService );
    mgr = Components.classes["@mozilla.org/updates/update-manager;1"]
                    .getService( Components.interfaces.nsIUpdateManager );
    aup = Components.classes["@mozilla.org/updates/update-prompt;1"]
                    .createInstance( Components.interfaces.nsIUpdatePrompt );
  } catch ( e ) {
    aus = null;
    mgr = null;
    aup = null;
  }

  return pub;

}();
