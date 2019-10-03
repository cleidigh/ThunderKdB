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

const EXPORTED_SYMBOLS = ["Note"];

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
Cu.import( "resource://znotes/documentmanager.js", ru.akman.znotes );

var Note = function( aBook, anEntry, aCategory, aType, aTagID ) {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "modules.note" );

  this.getBook = function() {
    return this.book;
  };

  this.getRoot = function() {
    return this.getParent().getRoot();
  };

  this.getBin = function() {
    return this.getParent().getBin();
  };

  this.getEncoding = function() {
    return this.entry.getEncoding();
  };

  this.getParent = function() {
    return this.parent;
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

  this.getCreateDateTime = function() {
    return this.entry.getCreateDateTime();
  };

  this.getUpdateDateTime = function() {
    return this.entry.getUpdateDateTime();
  };

  this.getKeyWords = function() {
    var result = [];
    // name
    result.push( this.getName() );
    // categories
    var category = this.getParent();
    while ( category ) {
      result.push( category.getName() );
      category = category.getParent();
    }
    // book
    result.push( this.getBook().getName() );
    // tags
    var tagList = this.getBook().getTagList();
    var tagIDs = this.getTags();
    for ( var i = 0; i < tagIDs.length; i++ ) {
      result.push( tagList.getTagById( tagIDs[i] ).getName() );
    }
    // content
    // ...
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
    this.entry.setIndex( value );
  };

  this.dump = function( prefix ) {
    return prefix + this.getName() + "\n";
  };

  this.getType = function() {
    return this.type;
  };

  this.setType = function( type ) {
    if ( this.type == type ) {
      return;
    }
    this.type = type;
    this.entry.setType( type );
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "NoteTypeChanged",
        { parentCategory: this.getParent(), changedNote: this } )
    );
  };

  this.getData = function() {
    return this.data;
  };

  this.setData = function() {
    this.entry.setData( JSON.stringify( this.data ) );
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "NoteDataChanged",
        { parentCategory: this.getParent(), changedNote: this } )
    );
  };

  this.loadPreference = function( name, value ) {
    if ( "prefs" in this.data ) {
      if ( this.data.prefs == null ||
           Array.isArray( this.data.prefs ) ||
           typeof( this.data.prefs ) !== "object" ) {
        this.data.prefs = {};
      }
    } else {
      this.data.prefs = {};
    }
    if ( name in this.data.prefs ) {
      return this.data.prefs[name];
    }
    return value;
  };

  this.savePreference = function( name, value ) {
    if ( "prefs" in this.data ) {
      if ( this.data.prefs == null ||
           Array.isArray( this.data.prefs ) ||
           typeof( this.data.prefs ) !== "object" ) {
        this.data.prefs = {};
      }
    } else {
      this.data.prefs = {};
    }
    if ( name in this.data.prefs && this.data.prefs[name] == value ) {
      return;
    }
    var oldValue = ( name in this.data.prefs ) ?
      this.data.prefs[name] : undefined;
    this.data.prefs[name] = value;
    this.entry.setData( JSON.stringify( this.data ) );
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "NotePrefChanged",
        {
          parentCategory: this.getParent(),
          changedNote: this,
          prefName: name,
          oldValue: oldValue,
          newValue: value
        }
      )
    );
  };

  this.getExtension = function() {
    var doc = ru.akman.znotes.DocumentManager.getInstance()
                                             .getDocument( this.getType() );
    return doc ? doc.getExtension( this.getType() ) : null;
  };
  
  this.getDocument = function() {
    var doc = ru.akman.znotes.DocumentManager.getInstance()
                                             .getDocument( this.getType() );
    if ( !doc ) {
      return null;
    }
    return doc.parseFromString(
      this.getMainContent(),
      this.getURI(),
      this.getBaseURI(),
      this.getName()
    );
  };

  this.setDocument = function( dom ) {
    var doc = ru.akman.znotes.DocumentManager.getInstance()
                                             .getDocument( this.getType() );
    if ( !doc ) {
      return false;
    }
    this.setMainContent(
      doc.serializeToString( dom, this.getURI(), this.getBaseURI() ) );
    return true;
  };

  this.updateDocument = function() {
    var res = this.getDocument();
    if ( !res || !res.result ) {
      return;
    }
    if ( res.changed ) {
      this.setDocument( res.dom );
    }
  };

  this.importDocument = function( dom, params ) {
    var doc = ru.akman.znotes.DocumentManager.getInstance()
                                             .getDocument( this.getType() );
    if ( !doc ) {
      return;
    }
    this.setDocument(
      doc.importDocument(
        dom, this.getURI(), this.getBaseURI(), this.getName(), params ) );
    this.updateDocument();
  };

  this.getMainContent = function() {
    return this.entry.getMainContent();
  };

  this.setMainContent = function( data ) {
    var oldContent = this.getMainContent();
    this.entry.setMainContent( data );
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "NoteMainContentChanged",
        {
          parentCategory: this.getParent(),
          changedNote: this,
          oldValue: oldContent,
          newValue: data
        }
      )
    );
  };

  this.loadContentDirectory = function( fromDirectoryEntry, fMove, fClean ) {
    this.entry.loadContentDirectory( fromDirectoryEntry, fMove, fClean );
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "NoteContentLoaded",
        { parentCategory: this.getParent(), changedNote: this }
      )
    );
  };

  this.getContentEntry = function( id ) {
    return this.entry.getContentEntry( id );
  };

  this.hasContents = function() {
    return this.entry.hasContents();
  };

  this.getContents = function() {
    return this.entry.getContents();
  };

  this.getContent = function( id ) {
    return this.entry.getContent( id );
  };

  this.addContent = function( data ) {
    var info = this.entry.addContent( data );
    if ( info ) {
      this.notifyStateListener(
        new ru.akman.znotes.core.Event(
          "NoteContentAppended",
          {
            parentCategory: this.getParent(),
            changedNote: this,
            contentInfo: info
          }
        )
      );
    }
    return info;
  };

  this.removeContent = function( id ) {
    var info = this.entry.removeContent( id );
    if ( info ) {
      this.notifyStateListener(
        new ru.akman.znotes.core.Event(
          "NoteContentRemoved",
          {
            parentCategory: this.getParent(),
            changedNote: this,
            contentInfo: info
          }
        )
      );
    }
    return info;
  };

  this.getAttachmentEntry = function( id ) {
    return this.entry.getAttachmentEntry( id );
  };

  this.hasAttachments = function() {
    return this.entry.hasAttachments();
  };

  this.getAttachments = function() {
    return this.entry.getAttachments();
  };

  this.getAttachment = function( id ) {
    return this.entry.getAttachment( id );
  };

  this.addAttachment = function( data ) {
    var info = this.entry.addAttachment( data );
    if ( info ) {
      this.notifyStateListener(
        new ru.akman.znotes.core.Event(
          "NoteAttachmentAppended",
          {
            parentCategory: this.getParent(),
            changedNote: this,
            attachmentInfo: info
          }
        )
      );
    }
    return info;
  };

  this.removeAttachment = function( id ) {
    var info = this.entry.removeAttachment( id );
    if ( info ) {
      this.notifyStateListener(
        new ru.akman.znotes.core.Event(
          "NoteAttachmentRemoved",
          {
            parentCategory: this.getParent(),
            changedNote: this,
            attachmentInfo: info
          }
        )
      );
    }
    return info;
  };

  this.getURI = function() {
    return this.entry.getURI();
  };

  this.getBaseURI = function() {
    return this.entry.getBaseURI();
  };

  this.getName = function() {
    return this.name;
  };

  this.isInBin = function() {
    var aCategory = this.getParent();
    var aBin = aCategory.getBin();
    while ( aCategory ) {
      if ( aCategory === aBin ) {
        return true;
      }
      aCategory = aCategory.getParent();
    }
    return false;
  };

  this.rename = function( aName ) {
    if ( this.name != aName ) {
      this.entry.setName( aName );
      this.name = aName;
      // @@@@ 1 What if document in editing mode ?
      this.updateDocument();
      this.notifyStateListener(
        new ru.akman.znotes.core.Event(
          "NoteChanged",
          { parentCategory: this.getParent(), changedNote: this }
        )
      );
    }
  };

  this.remove = function() {
    var aParent = this.getParent();
    if ( this.isInBin() ) {
      this.entry.remove();
      this.exists = false;
      aParent.removeNote( this );
      this.notifyStateListener(
        new ru.akman.znotes.core.Event(
          "NoteDeleted",
          { parentCategory: aParent, deletedNote: this }
        )
      );
    } else {
      this.moveInto( this.getBin() );
    }
  };

  this.moveInto = function( aCategory, aName ) {
    var aSuffix, anIndex;
    var aParent = this.getParent();
    var aType = this.getType();
    if ( aName === undefined ) {
      aName = this.getName();
    }
    aSuffix = "";
    anIndex = 2;
    while ( !aCategory.canCreateNote( aName + aSuffix, aType ) ) {
      aSuffix = " (" + anIndex++ + ")";
    }
    aName += aSuffix;
    this.entry.moveTo( aCategory.entry, aName );
    if ( this.name !== aName ) {
      this.name = aName;
    }
    this.updateDocument();
    aParent.moveNoteInto( this, aCategory );
  };

  this.moveTo = function( anIndex ) {
    var aParent = this.getParent();
    aParent.moveNoteTo( this, anIndex );
  };

  this.refresh = function() {
    this.entry.refresh( this.parent.entry );
  };

  this.hasTags = function() {
    return this.tags.length > 0;
  }

  this.getTags = function() {
    return this.tags.slice( 0 );
  };

  this.setTags = function( ids ) {
    var tagIDs = this.getTags();
    if ( tagIDs.length == 0 && ids.length == 0 ) {
      return;
    }
    var mainTagFlag = true;
    if ( tagIDs.length > 0 && ids.length > 0 ) {
      mainTagFlag = ( tagIDs[0] != ids[0] ) ;
    }
    var tagsFlag = false;
    if ( tagIDs.length != ids.length ) {
      tagsFlag = true;
    } else {
      for ( var i = 0; i < tagIDs.length; i++ ) {
        if ( ids.indexOf( tagIDs[i] ) < 0 ) {
          tagsFlag = true;
          break;
        }
      }
    }
    if ( tagsFlag ) {
      this.entry.setTags( ids );
      this.tags = ids.slice(0);
      if ( !this.isLocked() ) {

        this.notifyStateListener(
          new ru.akman.znotes.core.Event(
            "NoteTagsChanged",
            {
              parentCategory: this.getParent(),
              changedNote: this,
              oldValue: tagIDs,
              newValue: ids
            }
          )
        );

      }
    }
    if ( mainTagFlag ) {
      this.entry.setTags( ids );
      this.tags = ids.slice(0);
      if ( this.isLocked() ) {
        return;
      }
      var oldTag = null;
      if ( tagIDs.length > 0 ) {
        oldTag = tagIDs[0];
      }

      this.notifyStateListener(
        new ru.akman.znotes.core.Event(
          "NoteMainTagChanged",
          {
            parentCategory: this.getParent(),
            changedNote: this,
            oldValue: oldTag,
            newValue: ids[0]
          }
        )
      );

    }
  };

  this.getMainTag = function() {
    var ids = this.getTags();
    if ( ids.length > 0 ) {
      return ids[0];
    }
    return null;
  };

  this.setMainTag = function( id ) {
    var ids = this.getTags();
    var index = ids.indexOf( id );
    if ( index < 0 ) {
      return;
    }
    ids.splice( index, 1 );
    ids.splice( 0, 0, id );
    this.setTags( ids );
  };

  this.getMainTagColor = function() {
    var tagList = this.getBook().getTagList();
    var color = tagList.getNoTag().getColor();
    var tagID = this.getMainTag();
    if ( tagID ) {
      color = tagList.getTagById( tagID ).getColor();
    }
    return color;
  };

  this.getOrigin = function() {
    return this.origin;
  };

  this.setOrigin = function( url ) {
    if ( this.origin == url ) {
      return;
    }
    this.origin = url;
  };

  this.getMode = function() {
    return this.mode;
  };

  this.setMode = function( mode ) {
    var oldValue = this.mode;
    this.mode = mode;
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "NoteModeChanged",
        {
          parentCategory: this.getParent(),
          changedNote: this,
          oldValue: oldValue,
          newValue: mode
        }
      )
    );
  };

  this.isLoading = function() {
    return this.loading;
  };

  this.setLoading = function( loading ) {
    var oldValue = this.loading;
    var newValue = !!loading;
    this.loading = newValue;
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "NoteLoadingChanged",
        {
          parentCategory: this.getParent(),
          changedNote: this,
          oldValue: oldValue,
          newValue: newValue
        }
      )
    );
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
    var parentName = "*NULL*";
    if ( parent ) {
      parentName = parent.getName();
    }
    var listenersNames = "{\n";
    for ( var i = 0; i < this.listeners.length; i++ ) {
      var listener = this.listeners[i];
      if ( "name" in listener ) {
        listenersNames += "'" + listener.name + "'\n";
      } else {
        listenersNames += "'[" + i + "]'\n";
      }
    }
    listenersNames += "}\n";
    return "\ninstanceId: " + this.instanceId + "\n" +
      "id: " + this.id + ", " +
      "index: " + this.index + "\n" +
      "name: '" + this.name + "'\n" +
      "parent: '" + parentName + "'\n" +
      "tags: " + this.getTags() + "\n" +
      "loading: " + this.loading + ", " +
      "locked: " + this.locked + ", " +
      "exists: " + this.exists + "\n" +
      "listeners:\n" + listenersNames +
      "entry:\n" + this.entry;
  };

  // C O N S T R U C T O R

  // for debug purpose
  this.instanceId = Utils.createUUID();

  this.loading = false;
  this.mode = "viewer";
  this.origin = "";
  this.locked = true;
  this.exists = true;
  this.listeners = [];
  this.book = aBook;
  this.parent = aCategory;
  this.entry = anEntry;
  this.name = this.entry.getName();
  this.id = this.entry.getId();
  this.index = this.entry.getIndex();
  try {
    this.data = JSON.parse( this.entry.getData() );
  } catch ( e ) {
    this.data = {};
  }
  //
  this.type = this.entry.getType();
  if ( aType && aType != this.type ) {
    this.setType( aType );
  }
  if ( this.type === "unknown" ) {
    if ( this.getMainContent().match( /<html/i ) ) {
      this.setType( "application/xhtml+xml" );
    } else {
      this.setType( "text/plain" );
    }
  }
  //
  this.tags = this.entry.getTags();
  var arrIDs = this.getTags();
  if ( aTagID && arrIDs.indexOf( aTagID ) < 0 ) {
    arrIDs.push( aTagID );
    this.setTags( arrIDs );
  }
  if ( this.entry.getSize() == 0 ) {
    var doc = ru.akman.znotes.DocumentManager.getInstance()
                                             .getDocument( this.getType() );
    if ( !doc ) {
      doc = ru.akman.znotes.DocumentManager.getInstance().getDefaultDocument();
      this.setType( doc.getType() );
    }
    if ( doc ) {
      var dom = doc.getBlankDocument(
        this.getURI(),
        this.getBaseURI(),
        this.getName(),
        true /* comments */
      );
      if ( dom ) {
        this.setDocument( dom );
      }
    }
  }
  aCategory.appendNote( this );
  this.locked = false;

};
