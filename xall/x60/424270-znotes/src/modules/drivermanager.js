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

const EXPORTED_SYMBOLS = ["DriverManager"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};
if ( !ru.akman.znotes.data ) ru.akman.znotes.data = {};

Cu.import( "resource://znotes/utils.js", ru.akman.znotes );

var DriverManager = function() {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "modules.drivermanager" );

  var pub = {};

  var drivers = null;

  /**
   * name - driver directory name
   */
  function registerDriver( name ) {
    var driver, params, bundle;
    var driverURL = "chrome://znotes_drivers/content/" + name + "/";
    var bundleURL = "chrome://znotes/locale/drivers/" + name + "/";
    var bundleID = "znotes_driver_" + name + "_stringbundle";
    unregisterDriver( name );
    try {
      ru.akman.znotes.data[ name ] = {};
      Cu.import( driverURL + "driver.js", ru.akman.znotes.data[ name ] );
      Cu.import( driverURL + "params.js", ru.akman.znotes.data[ name ] );
      driver = ru.akman.znotes.data[ name ].Driver;
      params = ru.akman.znotes.data[ name ].Params;
      driver.getParams = function() {
        return params;
      };
      bundle = Utils.STRINGS_BUNDLE.ownerDocument.getElementById( bundleID );
      if ( !bundle ) {
        bundle = Utils.STRINGS_BUNDLE.ownerDocument.createElement( "stringbundle" );
        bundle.setAttribute( "id", bundleID );
        Utils.STRINGS_BUNDLE.parentNode.appendChild( bundle );
      }
      bundle.setAttribute( "src", bundleURL + "driver.properties" );
      driver.getBundle = function() {
        return bundle;
      };
      drivers[ name ] = driver;
    } catch ( e ) {
      delete ru.akman.znotes.data[ name ];
      throw e;
    }
    return driver;
  };

  function unregisterDriver( name ) {
    if ( ru.akman.znotes.data[ name ] ) {
      delete ru.akman.znotes.data[ name ];
    }
    if ( drivers[ name ] ) {
      delete drivers[ name ];
    }
  };

  // CONSTRUCTOR

  function init() {
    if ( drivers ) {
      return;
    }
    drivers = {};
    var driverDirectory = Utils.getDriversPath();
    var entries = driverDirectory.directoryEntries;
    var driver = null;
    var name = null;
    var entry = null;
    while( entries.hasMoreElements() ) {
      entry = entries.getNext();
      entry.QueryInterface( Ci.nsIFile );
      if ( !entry.isDirectory() ) {
        continue;
      }
      name = entry.leafName;
      try {
        driver = registerDriver( name );
      } catch ( e ) {
        driver = null;
        log.warn( e + "\n" + Utils.dumpStack() );
      }
      if ( driver == null ) {
        log.error( "Error registering driver\n" + entry.path );
      }
    }
  };

  // PUBLIC

  pub.getDrivers = function() {
    return drivers;
  };

  pub.getDriver = function( driverName ) {
    if ( driverName === "default" ) {
      return pub.getDefaultDriver();
    }
    if ( driverName in drivers ) {
      return drivers[ driverName ];
    }
    return null;
  };

  pub.getDefaultDriver = function() {
    var driver;
    for ( var name in drivers ) {
      driver = drivers[ name ];
      if ( ( "default" in driver ) && driver["default"] ) {
        return driver;
      }
    }
    return null;
  };

  pub.getInstance = function() {
    return this;
  };

  init();

  return pub;

}();
