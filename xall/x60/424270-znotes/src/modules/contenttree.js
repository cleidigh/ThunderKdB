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

const EXPORTED_SYMBOLS = ["ContentTree"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};
if ( !ru.akman.znotes.core ) ru.akman.znotes.core = {};

Cu.import( "resource://znotes/utils.js", ru.akman.znotes );
Cu.import( "resource://znotes/category.js", ru.akman.znotes.core );
Cu.import( "resource://znotes/note.js", ru.akman.znotes.core );

var ContentTree = function( book, rootCategoryEntry ) {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "modules.contenttree" );

  this.getBook = function() {
    return this.book;
  };

  this.getRoot = function() {
    return this.root;
  };

  this.getBin = function() {
    return this.bin;
  };

  this.clearBin = function() {
    var bin = this.getBin();
    if ( !bin ) {
      return;
    }
    var categories = bin.getCategories();
    var notes = bin.getNotes();
    for each ( var note in notes ) {
      note.remove();
    }
    for each ( var category in categories ) {
      category.remove();
    }
  };

  this.load = function() {
    var read = function( aCategory ) {
      var aBook = aCategory.getBook();
      var entries = aCategory.entry.getEntries();
      var anEntry = null;
      for ( var i = 0; i < entries.length; i++ ) {
        anEntry = entries[i];
        if ( anEntry.isCategory() ) {
          read( new ru.akman.znotes.core.Category( aBook, anEntry, aCategory ) );
        } else {
          new ru.akman.znotes.core.Note( aBook, anEntry, aCategory );
        }
      }
    };
    this.root = new ru.akman.znotes.core.Category( this.getBook(), this.rootEntry, null );
    read( this.root );
    for each ( var category in this.root.categories ) {
      if ( category.isBin() ) {
        this.bin = category;
        break;
      }
    }
    if ( !this.bin ) {
      this.bin = new ru.akman.znotes.core.Category(
        this.getBook(),
        this.rootEntry.createBin(),
        this.root
      );
    }
  };

  /*
   * aProcessor
   *
  var data1 = {};
  var data2 = {};
  ...
  var dataN = {};
  var aProcessor = {
    param1: data1,
    param2: data2,
    ...
    paramN: dataN,
    processCategory: function( aCategory ) {
      ...
      this.param1 ... this.paramN
      ...
    },
    processNote: function( aNote ) {
      ...
      this.param1 ... this.paramN
      ...
    }
  };
  */
  this.process = function( aProcessor ) {
    var aRoot = this.getRoot();
    if ( aRoot ) {
      aRoot.process( aProcessor );
    }
  };

  this.getCategoryById = function( categoryId ) {
    var result = [];
    var getCategoryByIdProcessor = {
      id: categoryId,
      categories: result,
      processCategory: function( aCategory ) {
        if ( aCategory.getId() == this.id )
          this.categories.push( aCategory );
      },
      processNote: function( aNote ) {
      }
    };
    this.process( getCategoryByIdProcessor );
    if ( result.length > 0 ) {
      return result[0];
    } else {
      return null;
    }
  };

  this.getNoteByName = function( aName ) {
    var result = [];
    var getNoteByNameProcessor = {
      name: aName,
      notes: result,
      processCategory: function( aCategory ) {
      },
      processNote: function( aNote ) {
        if ( aNote.getName() == this.name )
          this.notes.push( aNote );
      }
    };
    this.process( getNoteByNameProcessor );
    if ( result.length > 0 ) {
      return result[0];
    } else {
      return null;
    }
  };

  this.getNoteById = function( noteID ) {
    var result = [];
    var getNoteByIdProcessor = {
      id: noteID,
      notes: result,
      processCategory: function( aCategory ) {
      },
      processNote: function( aNote ) {
        if ( aNote.getId() == this.id ) {
          this.notes.push( aNote );
        }
      }
    };
    this.process( getNoteByIdProcessor );
    if ( result.length > 0 ) {
      return result[0];
    } else {
      return null;
    }
  };

  this.getNotesByTag = function( tagID ) {
    var result = [];
    var getNotesByTagProcessor = {
      tagID: tagID,
      notes: result,
      processCategory: function( aCategory ) {
      },
      processNote: function( aNote ) {
        var noteIDs = aNote.getTags();
        if ( noteIDs.length == 0 && this.tagID == "00000000000000000000000000000000" ) {
          this.notes.push( aNote );
        } else {
          var indexID = noteIDs.indexOf( this.tagID );
          if ( indexID != -1 ) {
            this.notes.push( aNote );
          }
        }
      }
    };
    this.process( getNotesByTagProcessor );
    return result;
  };

  this.addStateListener = function( stateListener ) {
    this.root.addStateListener( stateListener );
  };

  this.removeStateListener = function( stateListener ) {
    this.root.removeStateListener( stateListener );
  };

  this.book = book;
  this.rootEntry = rootCategoryEntry;
  this.root = null;
  this.bin = null;

};
