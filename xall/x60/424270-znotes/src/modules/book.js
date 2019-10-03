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

const EXPORTED_SYMBOLS = ["Book"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};
if ( !ru.akman.znotes.core ) ru.akman.znotes.core = {};

Cu.import( "resource://znotes/utils.js", ru.akman.znotes );
Cu.import( "resource://znotes/event.js", ru.akman.znotes.core );
Cu.import( "resource://znotes/drivermanager.js", ru.akman.znotes );
Cu.import( "resource://znotes/contenttree.js", ru.akman.znotes.core );
Cu.import( "resource://znotes/taglist.js", ru.akman.znotes.core );

var Book = function( aManager, anId, aName, aDescription, aDriver, aConnection,
                     aPreferences, anIndex, anOpened ) {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "modules.book" );

  this.updateRegistryObject = function() {
    if ( !this.isLocked() ) {
      this.manager.updateRegistryObject();
    }
  };

  this.getPlaces = function() {
    return this.places;
  };

  this.getTagList = function() {
    return this.tagList;
  };

  this.getContentTree = function() {
    return this.contentTree;
  };

  this.getId = function() {
    return this.id;
  };

  this.getName = function() {
    return this.name;
  };

  this.setName = function( name ) {
    if ( this.getName() == name ) {
      return;
    }
    this.name = name;
    this.updateRegistryObject();
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "BookChanged",
        { changedBook: this }
      )
    );
  };

  this.getDescription = function() {
    return this.description;
  };

  this.setDescription = function( description ) {
    if ( this.getDescription() == description ) {
      return;
    }
    this.description = description;
    this.updateRegistryObject();
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "BookChanged",
        { changedBook: this }
      )
    );
  };

  this.getDriver = function() {
    return this.driver;
  };

  this.setDriver = function( driver ) {
    if ( this.isOpen() ) {
      return;
    }
    if ( this.getDriver() == driver ) {
      return;
    }
    this.driver = driver;
    this.updateRegistryObject();
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "BookChanged",
        { changedBook: this }
      )
    );
  };

  this.getConnection = function() {
    var result = {};
    Utils.cloneObject( this.connection, result );
    return result;
  };

  this.setConnection = function( connection ) {
    if ( this.isOpen() ) {
      return;
    }
    if ( !Utils.cloneObject( connection, this.connection ) ) {
      return;
    }
    this.updateRegistryObject();
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "BookChanged",
        { changedBook: this }
      )
    );
  };

  this.getPreferences = function() {
    var result = {};
    Utils.cloneObject( this.preferences, result );
    return result;
  };

  this.getIndex = function() {
    return parseInt( this.index );
  };

  this.setIndex = function( index ) {
    var value = parseInt( index );
    if ( this.getIndex() === value ) {
      return;
    }
    this.index = value;
    this.updateRegistryObject();
  };

  this.getSelectedTree = function() {
    var selectedTree = this.loadPreference( "currentTree", "Categories" );
    switch ( selectedTree ) {
      case "Categories":
      case "Tags":
        break;
      default:
        selectedTree = "Categories";
    }
    return selectedTree;
  };

  this.setSelectedTree = function( selectedTree ) {
    switch ( selectedTree ) {
      case "Categories":
      case "Tags":
        break;
      default:
        selectedTree = "Categories";
    }
    if ( this.getSelectedTree() == selectedTree ) {
      return;
    }
    this.savePreference( "currentTree", selectedTree );
  };

  this.getSelectedCategory = function() {
    return this.loadPreference( "currentCategory", 0 );
  };

  this.setSelectedCategory = function( selectedCategory ) {
    if ( this.getSelectedCategory() == selectedCategory ) {
      return;
    }
    this.savePreference( "currentCategory", selectedCategory );
  };

  this.getSelectedTag = function() {
    return this.loadPreference( "currentTag", 0 );
  };

  this.setSelectedTag = function( selectedTag ) {
    if ( this.getSelectedTag() == selectedTag ) {
      return;
    }
    this.savePreference( "currentTag", selectedTag );
  };

  this.remove = function() {
    if ( this.isOpen() ) {
      this.close();
    }
    this.manager.removeBook( this );
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "BookDeleted",
        { deletedBook: this }
      )
    );
  };

  this.removeWithAllData = function() {
    var driver;
    try {
      driver = ru.akman.znotes.DriverManager.getInstance()
                                            .getDriver( this.getDriver() );
      if ( driver ) {
        driver.getConnection( this.getConnection() ).remove();
      }
    } catch ( e ) {
      log.warn( e + "\n" + Utils.dumpStack() );
    }
    if ( this.isOpen() ) {
      this.close();
    }
    this.manager.removeBook( this );
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "BookDeletedWithAllData",
        { deletedWithAllDataBook: this }
      )
    );
  };

  this.createData = function() {
    var driver;
    try {
      driver = ru.akman.znotes.DriverManager.getInstance()
                                            .getDriver( this.getDriver() );
      driver.getConnection( this.getConnection() ).create();
    } catch ( e ) {
      driver = null;
      log.warn( e + "\n" + Utils.dumpStack() );
    }
    return !!driver;
  };

  this.close = function() {
    if ( !this.isOpen() ) {
      return;
    }
    this.tagList = null;
    this.contentTree = null;
    this.opened = false;
    this.updateRegistryObject();
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "BookClosed",
        { closedBook: this }
      )
    );
  };

  this.open = function() {
    var OK = 0;
    var ALREADY_OPENED = 2;
    var DRIVER_ERROR = 4;
    var CONNECTION_ERROR = 8;
    var NOT_EXISTS = 16;
    var NOT_PERMITS = 32;
    if ( this.isOpen() ) {
      return ALREADY_OPENED;
    }
    var driver = ru.akman.znotes.DriverManager.getInstance()
                                              .getDriver( this.getDriver() );
    if ( !driver ) {
      return DRIVER_ERROR;
    }
    var connection = driver.getConnection( this.getConnection() );
    if ( connection == null ) {
      return CONNECTION_ERROR;
    }
    if ( !connection.exists() ) {
      return NOT_EXISTS;
    }
    if ( !connection.permits() ) {
      return NOT_PERMITS;
    }
    // *************************************************************************
    this.tagList = new ru.akman.znotes.core.TagList(
      this,
      connection.getTagListDescriptor()
    );
    this.tagList.load();
    this.contentTree = new ru.akman.znotes.core.ContentTree(
      this,
      connection.getRootCategoryEntry()
    );
    this.contentTree.load();
    // *************************************************************************
    this.opened = true;
    this.updateRegistryObject();
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "BookOpened",
        { openedBook: this }
      )
    );
    return OK;
  };

  this.isOpen = function() {
    return this.opened;
  };

  this.savePreference = function( name, value ) {
    if ( this.hasPreference( name ) ) {
      if ( this.preferences[name] == value ) {
        return;
      }
    }
    this.preferences[name] = value;
    this.updateRegistryObject();
  };

  this.loadPreference = function( name, value ) {
    if ( this.hasPreference( name ) ) {
      return this.preferences[name];
    } else {
      if ( value === undefined ) {
        return null;
      }
    }
    this.savePreference( name, value );
    return value;
  };

  this.hasPreference = function( name ) {
    return name in this.preferences;
  };

  this.isLocked = function() {
    return this.locked;
  };

  this.addStateListener = function( stateListener ) {
    if ( this.listeners.indexOf( stateListener ) < 0 ) {
      this.listeners.push( stateListener );
    }
  };

  this.removeStateListener = function( stateListener ) {
    var index = this.listeners.indexOf( stateListener );
    if ( index < 0 ) {
      return;
    }
    this.listeners.splice( index, 1 );
  };

  this.notifyStateListener = function( event ) {
    if ( !this.isLocked() ) {
      for ( var i = 0; i < this.listeners.length; i++ ) {
        if ( this.listeners[i][ "on" + event.type ] ) {
          this.listeners[i][ "on" + event.type ]( event );
        }
      }
    }
    this.manager.notifyStateListener( event );
  };

  this.toString = function() {
    return "{ id='" +
      this.id + "', name='" +
      this.name + "', '" +
      this.description + "', driver='" +
      this.driver + "', index=" +
      this.index + ", opened=" + this.opened +
      " }\n" +
      "{ locked = " + this.locked + ", " +
      " listeners = " + this.listeners.length +
      " }";
  };

  this.locked = true;
  this.manager = aManager;
  this.listeners = [];
  this.id = anId;
  this.name = aName;
  this.description = aDescription;
  this.places = {};
  this.driver = aDriver;
  try {
    this.connection =
      ru.akman.znotes.DriverManager.getInstance()
                                   .getDriver( this.getDriver() )
                                   .getParameters();
    Utils.fillObject( aConnection, this.connection );
  } catch ( e ) {
    log.warn( e + "\n" + Utils.dumpStack() );
    this.connection = aConnection;
  }
  this.preferences = aPreferences;
  this.index = anIndex;
  this.tagList = null;
  this.contentTree = null;
  this.opened = false;
  if ( anOpened ) {
    try {
      if ( this.open() > 2 ) {
        this.opened = false;
      };
    } catch ( e ) {
      this.opened = false;
    }
  }
  this.manager.appendBook( this );
  this.locked = false;
};
