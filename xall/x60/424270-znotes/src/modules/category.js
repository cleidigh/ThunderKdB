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

const EXPORTED_SYMBOLS = ["Category"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};
if ( !ru.akman.znotes.core ) ru.akman.znotes.core = {};

Cu.import( "resource://znotes/event.js", ru.akman.znotes.core );
Cu.import( "resource://znotes/note.js", ru.akman.znotes.core );
Cu.import( "resource://znotes/utils.js", ru.akman.znotes );

var Category = function( aBook, anEntry, aParent ) {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "modules.category" );

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
    if ( "processCategory" in aProcessor ) {
      aProcessor.processCategory( this );
    }
    if ( "processNote" in aProcessor ) {
      for ( var i = 0; i < this.notes.length; i++ ) {
        aProcessor.processNote( this.notes[i] );
      }
    }
    for ( var i = 0; i < this.categories.length; i++ ) {
      this.categories[i].process( aProcessor );
    }
  };

  this.dump = function( prefix ) {
    var result = prefix + this.getName() + "\n";
    for ( var i = 0; i < this.notes.length; i++ ) {
      result += this.notes[i].dump( prefix + "  " );
    }
    for ( var i = 0; i < this.categories.length; i++ ) {
      result += this.categories[i].dump( prefix + "  " );
    }
    return result;
  };

  this.getCategoryWithSubcategoriesAsArray = function() {
    var result = [];
    var categoryProcessor = {
      categories: result,
      processCategory: function( aCategory ) {
        this.categories.push( aCategory );
      }
    };
    this.process( categoryProcessor );
    return result;
  };

  this.refresh = function() {
    this.entry.refresh( this.parent.entry );
    for ( var i = 0; i < this.notes.length; i++ ) {
      this.notes[i].refresh();
    }
    for ( var i = 0; i < this.categories.length; i++ ) {
      this.categories[i].refresh();
    }
  };

  this.getBook = function() {
    return this.book;
  };

  this.getParent = function() {
    return this.parent;
  };

  this.isRoot = function() {
    return ( this.parent == null );
  };

  this.getRoot = function() {
    if ( this.book ) {
      return this.book ? this.book.getContentTree().getRoot() : null;
    }
  };

  this.isBin = function() {
    return this.entry.isBin();
  };

  this.getBin = function() {
    var tree = this.book ? this.book.getContentTree() : null;
    return tree ? tree.getBin() : null;
  };

  this.isDescendantOf = function( anAncestor ) {
    var aCategory = this.getParent();
    while ( aCategory ) {
      if ( aCategory === anAncestor ) {
        return true;
      }
      aCategory = aCategory.getParent();
    }
    return false;
  };

  this.isInBin = function() {
    return this.isDescendantOf( this.getBin() );
  };

  this.noteExists = function( name, aType ) {
    return this.entry.exists( name, aType );
  };

  this.canCreateNote = function( name, aType ) {
    return this.entry.canCreate( name, aType );
  };

  this.categoryExists = function( name ) {
    return this.entry.exists( name );
  };

  this.canCreateCategory = function( name ) {
    return this.entry.canCreate( name );
  };

  this.depth = function() {
    var result = this.categories.length;
    for ( var i = 0; i < this.categories.length; i++ )
      result += this.categories[i].depth();
    return result;
  };

  this.isOpen = function() {
    if ( this.isRoot() )
      return true;
    return this.openState;
  };

  this.getOpenState = function() {
    return this.openState;
  };

  this.setOpenState = function( aState ) {
    if ( this.isRoot() ) {
      return;
    }
    if ( this.openState !== aState ) {
      this.entry.setOpenState( aState );
      this.openState = aState;
    }
  };

  this.getSelectedIndex = function() {
    return parseInt( this.selectedIndex );
  };

  this.setSelectedIndex = function( anIndex ) {
    var value = parseInt( anIndex );
    if ( this.getSelectedIndex() !== value ) {
      this.entry.setSelectedIndex( value );
      this.selectedIndex = value;
    }
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
    this.entry.setIndex( value );
  };

  this.isLocked = function() {
    return this.locked;
  };

  this.isExists = function() {
    return this.exists;
  };

  this.getId = function() {
    return this.id;
  };

  this.getName = function() {
    if ( this.isRoot() ) {
      return this.getBook().getName();
    }
    return this.name;
  };

  this.hasNotes = function() {
    return this.notes.length > 0;
  };

  this.getNotes = function() {
    return this.notes.slice(0);
  };

  this.getNoteByName = function( aName ) {
    for ( var i = 0; i < this.notes.length; i++ ) {
      if ( this.notes[i].getName() === aName ) {
        return this.notes[i];
      }
    }
    return null;
  };

  this.getNotesCount = function() {
    return this.notes.length;
  };

  this.hasNote = function( aNote ) {
    return this.notes.indexOf( aNote ) >= 0;
  };

  this.hasCategories = function() {
    return this.categories.length > 0;
  };

  this.hasNotes = function() {
    return this.notes.length > 0;
  };

  this.isEmpty = function() {
    return !this.hasCategories() && !this.hasNotes();
  };

  this.getCategories = function() {
    return this.categories.slice(0);
  };

  this.getCategoriesCount = function() {
    return this.categories.length;
  };

  this.hasCategory = function( aCategory ) {
    return this.categories.indexOf( aCategory ) >= 0;
  };

  this.getCategoryByIndex = function( anIndex ) {
    if ( anIndex >= 0 && anIndex <= this.categories.length - 1 ) {
      return this.categories[anIndex];
    }
    return null;
  };

  this.rename = function( aNewName ) {
    if ( this.isRoot() ) {
      return;
    }
    if ( this.name != aNewName ) {
      this.entry.setName( aNewName );
      this.name = aNewName;
      this.refresh();
      this.notifyStateListener(
        new ru.akman.znotes.core.Event(
          "CategoryChanged",
          { parentCategory: this.getParent(), changedCategory: this }
        )
      );
    }
  };

  this.remove = function() {
    var aParent = this.getParent();
    if ( this.isRoot() || this.isBin() ) {
      return;
    }
    if ( this.isInBin() ) {
      var categories = this.getCategories();
      var notes = this.getNotes();
      for ( var i = 0; i < categories.length; i++ ) {
        categories[i].remove();
      }
      for ( var i = 0; i < notes.length; i++ ) {
        notes[i].remove();
      }
      this.entry.remove();
      this.exists = false;
      aParent.removeCategory( this );
      this.notifyStateListener(
        new ru.akman.znotes.core.Event(
          "CategoryDeleted",
          { parentCategory: aParent, deletedCategory: this }
        )
      );
    } else {
      this.moveInto( this.getBin() );
    }
  };

  this.moveInto = function( aCategory, aName ) {
    var aSuffix, anIndex;
    var aParent = this.getParent();
    if ( aName === undefined ) {
      aName = this.getName();
    }
    aSuffix = "";
    anIndex = 2;
    while ( !aCategory.canCreateCategory( aName + aSuffix ) ) {
      aSuffix = " (" + anIndex++ + ")";
    }
    aName += aSuffix;
    this.entry.moveTo( aCategory.entry, aName );
    if ( aName !== undefined ) {
      this.name = aName;
    }
    aParent.moveCategoryInto( this, aCategory );
    return this;
  };

  this.moveTo = function( anIndex ) {
    this.getParent().moveCategoryTo( this, anIndex );
    return this;
  };

  this.createCategory = function( aName ) {
    var aCategory = new Category(
      this.book,
      this.entry.createCategory( aName ),
      this
    );
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "CategoryCreated",
        { parentCategory: this, createdCategory: aCategory }
      )
    );
    return aCategory;
  };

  this.appendCategory = function( aCategory ) {
    var aBinIndex = this.categories.indexOf( this.getBin() );
    aCategory.parent = this;
    if ( aBinIndex === -1 ) {
      this.categories.push( aCategory );
      aCategory.setIndex( this.categories.length - 1 );
    } else {
      this.categories.splice( aBinIndex, 0, aCategory );
      for ( var i = aBinIndex; i < this.categories.length; i++ ) {
        this.categories[i].setIndex( i );
      }
    }
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "CategoryAppended",
        { parentCategory: this, appendedCategory: aCategory }
      )
    );
    return this;
  };

  this.removeCategory = function( aCategory ) {
    var anIndex = this.categories.indexOf( aCategory );
    if ( anIndex === -1 ) {
      return aCategory;
    }
    this.categories.splice( anIndex, 1 );
    for ( var i = anIndex; i < this.categories.length; i++ ) {
      this.categories[i].setIndex( i );
    }
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "CategoryRemoved",
        { parentCategory: this, removedCategory: aCategory }
      )
    );
    return aCategory;
  };

  this.moveCategoryTo = function( aCategory, anIndex ) {
    var oldValue = this.categories.indexOf( aCategory );
    if ( oldValue === -1 || oldValue === anIndex ) {
      return this;
    }
    if ( anIndex < 0 || anIndex > this.categories.length ) {
      return this;
    }
    this.categories.splice( oldValue, 1 );
    this.categories.splice( anIndex, 0, aCategory );
    for ( var i = Math.min( anIndex, oldValue ); i < this.categories.length; i++ ) {
      this.categories[i].setIndex( i );
    }
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "CategoryMovedTo",
        {
          parentCategory: this,
          movedToCategory: aCategory,
          oldValue: oldValue,
          newValue: anIndex
        }
      )
    );
    return this;
  };

  this.moveCategoryInto = function( aCategory, aParent ) {
    var aBinIndex, aNewIndex;
    var anOldIndex = this.categories.indexOf( aCategory );
    if ( anOldIndex === -1 ) {
      return this;
    }
    aBinIndex = aParent.categories.indexOf( this.getBin() );
    this.categories.splice( anOldIndex, 1 );
    for ( var i = anOldIndex; i < this.categories.length; i++ ) {
      this.categories[i].setIndex( i );
    }
    aCategory.parent = aParent;
    if ( aBinIndex === -1 ) {
      aParent.categories.push( aCategory );
      aNewIndex = aParent.categories.length - 1;
      aCategory.setIndex( aNewIndex );
    } else {
      aNewIndex = aBinIndex;
      aParent.categories.splice( aNewIndex, 0, aCategory );
      for ( var i = aNewIndex; i < aParent.categories.length; i++ ) {
        aParent.categories[i].setIndex( i );
      }
    }
    aCategory.refresh();
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "CategoryMovedInto",
        {
          oldParentCategory: this,
          oldIndex: anOldIndex,
          newParentCategory: aParent,
          newIndex: aNewIndex,
          movedIntoCategory: aCategory
        }
      )
    );
    return this;
  };

  this.createNote = function( aName, aType, aTag ) {
    var aNote = new ru.akman.znotes.core.Note(
      this.book,
      this.entry.createNote( aName, aType ),
      this,
      aType,
      aTag
    );
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "NoteCreated",
        { parentCategory: this, createdNote: aNote }
      )
    );
    return aNote;
  };

  this.appendNote = function( aNote ) {
    this.notes.push( aNote );
    aNote.parent = this;
    aNote.setIndex( this.notes.length - 1 );
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "NoteAppended",
        { parentCategory: this, appendedNote: aNote }
      )
    );
    return this;
  };

  this.removeNote = function( aNote ) {
    var anIndex = this.notes.indexOf( aNote );
    if ( anIndex === -1 ) {
      return aNote;
    }
    this.notes.splice( anIndex, 1 );
    for ( var i = anIndex; i < this.notes.length; i++ ) {
      this.notes[i].setIndex( i );
    }
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "NoteRemoved",
        { parentCategory: this, removedNote: aNote }
      )
    );
    return aNote;
  };

  this.moveNoteTo = function( aNote, anIndex ) {
    var oldValue = this.notes.indexOf( aNote );
    if ( oldValue === -1 || oldValue === anIndex ) {
      return this;
    }
    if ( anIndex < 0 || anIndex > this.notes.length ) {
      return this;
    }
    this.notes.splice( oldValue, 1 );
    this.notes.splice( anIndex, 0, aNote );
    for ( var i = Math.min( anIndex, oldValue ); i < this.notes.length; i++ ) {
      this.notes[i].setIndex( i );
    }
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "NoteMovedTo",
        {
          parentCategory: this,
          movedToNote: aNote,
          oldValue: oldValue,
          newValue: anIndex
        }
      )
    );
    return this;
  };

  this.moveNoteInto = function( aNote, aCategory ) {
    var aNewIndex, anOldIndex = this.notes.indexOf( aNote );
    if ( anOldIndex === -1 ) {
      return this;
    }
    this.notes.splice( anOldIndex, 1 );
    for ( var i = anOldIndex; i < this.notes.length; i++ ) {
      this.notes[i].setIndex( i );
    }
    aCategory.notes.push( aNote );
    aNote.parent = aCategory;
    aNewIndex = aCategory.notes.length - 1;
    aNote.setIndex( aNewIndex );
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "NoteMovedInto",
        {
          oldParentCategory: this,
          oldIndex: anOldIndex,
          newParentCategory: aCategory,
          newIndex: aNewIndex,
          movedIntoNote: aNote
        }
      )
    );
    return this;
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
    if ( this.isLocked() ) {
      return;
    }
    for ( var i = 0; i < this.listeners.length; i++ ) {
      if ( this.listeners[i][ "on" + event.type ] ) {
        this.listeners[i][ "on" + event.type ]( event );
      }
    }
    var parent = this.getParent();
    if ( parent ) {
      parent.notifyStateListener( event );
    }
  };

  this.toString = function() {
    var parent = this.getParent();
    var parentName = parent ? parent.getName() : "*NULL*";
    return "{ " +
      "'" + this.getName() + "', " +
      "'" + parentName + "', " +
      this.index + ", " +
      this.selectedIndex +
      " }\n{ " +
      "locked = " + this.locked + ", " +
      "exists = " + this.exists + ", " +
      "listeners = " + this.listeners.length +
      " }\n" +
      this.entry
  };

  this.locked = true;
  this.exists = true;
  this.book = aBook;
  this.listeners = [];
  this.categories = [];
  this.notes = [];
  this.parent = aParent;
  this.entry = anEntry;
  this.id = this.parent ? this.entry.getId() : this.book.getId();
  this.name = this.entry.getName();
  this.index = this.entry.getIndex();
  this.openState = this.entry.getOpenState();
  this.selectedIndex = this.entry.getSelectedIndex();
  if ( this.parent ) {
    this.parent.appendCategory( this );
  }
  this.locked = false;

};
