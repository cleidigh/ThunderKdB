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

const EXPORTED_SYMBOLS = ["BookManager"];

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
Cu.import( "resource://znotes/book.js", ru.akman.znotes.core );
Cu.import( "resource://znotes/drivermanager.js", ru.akman.znotes );

var BookManager = function() {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "modules.bookmanager" );

  var registryPath = getEntry();
  var registryObject = [];
  var books = [];
  var listeners = [];

  var locked = false;

  var pub = {};

  function getEntry() {
    var entry = Utils.getPlacesPath();
    var placeId = Utils.getPlaceId();
    entry.append( placeId );
    if ( !entry.exists() || !entry.isDirectory() ) {
      entry.create( Ci.nsIFile.DIRECTORY_TYPE, parseInt( "0755", 8 ) );
    }
    entry.append( "notebooks.json" );
    return entry.clone();
  };

  function loadRegistryObject() {
    if ( !registryPath.exists() ) {
      registryObject = [];
      return;
    }
    try {
      registryObject =
        JSON.parse( Utils.readFileContent( registryPath, "UTF-8" ) );
    } catch ( e ) {
      log.warn( e + "\n" + Utils.dumpStack() );
      registryObject = [];
    }
  };

  pub.getInstance = function() {
    return this;
  };

  pub.getDefaultPreferences = function() {
    return {
      // data
      currentTree: "Categories",
      currentCategory: 0,
      currentTag: 0,
      rootPosition: -1,
      // view
      "folderBoxWidth": "227",
      "bookTreeViewHeight": "79",
      "bookSplitterState": "open",
      "categoryBoxHeight": "835",
      "folderTreeViewHeight": "437",
      "tagSplitterState": "open",
      "tagTreeViewHeight": "391",
      "folderSplitterState": "open",
      "noteBoxWidth": "1051",
      "noteTreeViewHeight": "121",
      "noteTreeSplitterState": "open",
      "noteBodyBoxHeight": "793",
      "noteBodyViewHeight": "900",
      "noteMainBoxHeight": "700",
      "noteBodySplitterState": "open",
      "noteAddonsBoxHeight": "100",
      "qfBoxCollapsed": "true"
    };
  };

  pub.updateRegistryObject = function() {
    if ( locked ) {
      return;
    }
    registryObject.splice( 0, registryObject.length );
    for each ( var book in books ) {
      registryObject.push( {
        id: book.getId(),
        name: book.getName(),
        description: book.getDescription(),
        index: book.getIndex(),
        opened: book.isOpen(),
        driver: book.getDriver(),
        connection: book.getConnection(),
        preferences: book.getPreferences()
      } );
    }
    try {
      Utils.writeFileContent(
        registryPath,
        "UTF-8",
        JSON.stringify( registryObject, null, 2 )
      );
    } catch ( e ) {
      log.warn( e + "\n" + Utils.dumpStack() );
    }
  };

  pub.load = function() {
    locked = true;
    loadRegistryObject();
    for ( var i = 0; i < registryObject.length; i++ ) {
      if ( !( "name" in registryObject[i] ) ) {
        registryObject[i].name = "";
      }
      if ( !( "description" in registryObject[i] ) ) {
        registryObject[i].description = "";
      }
      if ( !( "driver" in registryObject[i] ) ) {
        registryObject[i].driver = "default";
      }
      if ( !( "connection" in registryObject[i] ) ||
           typeof( registryObject[i].connection ) !== "object"  ) {
        registryObject[i].connection = {};
      }
      if ( !( "preferences" in registryObject[i] ) ||
           typeof( registryObject[i].preferences ) !== "object" ) {
        registryObject[i].preferences = pub.getDefaultPreferences();
      }
      if ( !( "index" in registryObject[i] ) ) {
        registryObject[i].index = -1;
      }
      if ( !( "opened" in registryObject[i] ) ) {
        registryObject[i].opened = false;
      }
    }
    registryObject.sort( function ( a, b ) {
      if ( a.index < 0 && b.index >= 0 ) {
        return 1;
      }
      if ( a.index >= 0 && b.index < 0 ) {
        return -1;
      }
      if ( a.index < 0 && b.index < 0 ) {
        return 0;
      }
      return a.index - b.index;
    } );
    books.splice( 0, books.length );
    for ( var i = 0; i < registryObject.length; i++ ) {
      registryObject[i].index = i;
      new ru.akman.znotes.core.Book(
        this,
        registryObject[i].id,
        registryObject[i].name,
        registryObject[i].description,
        registryObject[i].driver,
        registryObject[i].connection,
        registryObject[i].preferences,
        registryObject[i].index,
        registryObject[i].opened
      );
    }
    locked = false;
    pub.updateRegistryObject();
  };

  pub.hasBook = function( book ) {
    return books.indexOf( book ) >= 0;
  };

  pub.hasBooks = function() {
    return books.length > 0;
  };

  pub.getCount = function() {
    return books.length;
  };

  pub.getBookById = function( id ) {
    for each ( var book in books ) {
      if ( book.getId() === id ) {
        return book;
      }
    }
    return null;
  };

  pub.getBookByIndex = function( index ) {
    if ( index >= 0 && index < books.length ) {
      return books[index];
    }
    return null;
  };

  pub.getBooksAsArray = function() {
    return books.slice( 0 );
  };

  pub.exists = function( name ) {
    for each ( var book in books ) {
      if ( book.getName() === name ) {
        return true;
      }
    }
    return false;
  };

  pub.createBook = function( name, description, driver, connection, preferences ) {
    var index, suffix, book;
    var defaultDriver =
      ru.akman.znotes.DriverManager.getInstance().getDefaultDriver();
    if ( name === undefined ) {
      name = Utils.STRINGS_BUNDLE.getString( "booklist.default.book.name" );
    }
    index = 0;
    suffix = "";
    while ( pub.exists( name + suffix ) ) {
      suffix = " (" + ++index + ")";
    }
    name += suffix;
    if ( description === undefined ) {
      description = "";
    }
    if ( driver === undefined ) {
      if ( defaultDriver ) {
        driver = defaultDriver.getName();
        connection = defaultDriver.getParameters();
      } else {
        return null;
      }
    } else {
      if ( connection === undefined ) {
        defaultDriver = ru.akman.znotes.DriverManager.getInstance()
                                                     .getDriver( driver );
        if ( defaultDriver ) {
          connection = defaultDriver.getParameters();
        } else {
          return null;
        }
      }
    }
    if ( preferences === undefined ) {
      preferences = pub.getDefaultPreferences();
    }
    book = new ru.akman.znotes.core.Book(
      this,
      Utils.createUUID(),
      name,
      description,
      driver,
      connection,
      preferences,
      books.length,
      false
    );
    pub.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "BookCreated",
        { createdBook: book }
      )
    );
    return book;
  };

  pub.appendBook = function( book ) {
    books.push( book );
    book.setIndex( books.length - 1 );
    this.updateRegistryObject();
    pub.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "BookAppended",
        { appendedBook: book }
      )
    );
    return book;
  };

  pub.removeBook = function( book ) {
    var index = books.indexOf( book );
    if ( index === -1 ) {
      return book;
    }
    books.splice( index, 1 );
    for ( var i = index; i < books.length; i++ ) {
      books[i].setIndex( i );
    }
    this.updateRegistryObject();
    pub.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "BookRemoved",
        { removedBook: book }
      )
    );
    return book;
  };

  pub.moveBookTo = function( book, index ) {
    var oldValue = books.indexOf( book );
    if ( oldValue === -1 || oldValue === index ) {
      return book;
    }
    if ( index < 0 || index > books.length ) {
      return book;
    }
    books.splice( oldValue, 1 );
    books.splice( index, 0, book );
    for ( var i = Math.min( index, oldValue ); i < books.length; i++ ) {
      books[i].setIndex( i );
    }
    this.updateRegistryObject();
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "BookMovedTo",
        {
          movedToBook: book,
          oldValue: oldValue,
          newValue: index
        }
      )
    );
    return book;
  };

  pub.addStateListener = function( stateListener ) {
    if ( listeners.indexOf( stateListener ) < 0 ) {
      listeners.push( stateListener );
    }
  };

  pub.removeStateListener = function( stateListener ) {
    var index = listeners.indexOf( stateListener );
    if ( index < 0 ) {
      return;
    }
    listeners.splice( index, 1 );
  };

  pub.notifyStateListener = function( event ) {
    if ( locked ) {
      return;
    }
    for ( var i = 0; i < listeners.length; i++ ) {
      if ( listeners[i][ "on" + event.type ] ) {
        listeners[i][ "on" + event.type ]( event );
      }
    }
  };

  return pub;

}();
