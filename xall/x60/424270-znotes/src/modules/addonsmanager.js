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

const EXPORTED_SYMBOLS = ["AddonsManager"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};

Cu.import( "resource://znotes/utils.js", ru.akman.znotes );

var AddonsManager = function() {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "modules.addonsmanager" );

  var pub = {};

  pub.open = function() {
    var winType = "Extension:Manager-extensions";
    var windowMediator =
      Cc["@mozilla.org/appshell/window-mediator;1"]
      .getService( Ci.nsIWindowMediator );
    var wins = windowMediator.getEnumerator( winType );
    var flag = true;
    while ( wins.hasMoreElements() ) {
      var win = wins.getNext().QueryInterface( Ci.nsIDOMWindowInternal );
      if ( win.document.documentElement.getAttribute( "windowtype" ) == winType ) {
        win.focus();
        flag = false;
        break;
      }
    }
    if ( flag ) {
      Utils.MAIN_WINDOW.openDialog(
        "chrome://mozapps/content/extensions/extensions.xul?type=extensions",
        "znotes:addons",
        "chrome,dialog=no,resizable=yes,centerscreen"
      );
    }
  };

  return pub;

}();
