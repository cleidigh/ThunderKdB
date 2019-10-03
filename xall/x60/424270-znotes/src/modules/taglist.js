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

const EXPORTED_SYMBOLS = ["TagList"];

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
Cu.import( "resource://znotes/tag.js", ru.akman.znotes.core );

var TagList = function( aBook, aDescriptor ) {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "modules.taglist" );

  this.listeners = [];
  this.book = aBook;
  this.descriptor = aDescriptor;
  this.tags = [];

  function getNoTagDefaultItemInfo() {
    return [
      "00000000000000000000000000000000", // id
      "No tag", // name
      "#CCFFFF", // color
      0, // index
      -1 // selectedIndex
    ];
  };

  function fillTagDefaultItemInfo( info ) {
    // name
    if ( info[1] === undefined ) {
      info[1] = info[0]; // id
    }
    // color
    if ( info[2] === undefined ) {
      info[2] = "#FFFF00";
    }
    // index
    if ( info[3] === undefined ) {
      info[3] = -1;
    } else {
      info[3] = parseInt( info[3], 10 );
    }
    // selectedIndex
    if ( info[4] === undefined ) {
      info[4] = -1;
    } else {
      info[4] = parseInt( info[4], 10 );
    }
    // trim others
    if ( info.length > 5 ) {
      info.splice( 5 );
    }
  };

  this.getDescriptor = function() {
    return this.descriptor;
  };

  this.getBook = function() {
    return this.book;
  };

  this.getNoTag = function() {
    return this.tags[0];
  };

  this.hasTag = function( tag ) {
    return this.tags.indexOf( tag ) !== -1;
  };

  this.isLocked = function() {
    return this.locked;
  };

  this.getTagById = function( id ) {
    for each ( var tag in this.tags ) {
      if ( tag.getId() === id ) {
        return tag;
      }
    }
    return null;
  };

  this.getCount = function() {
    return this.tags.length;
  };

  this.getTagsAsObject = function() {
    var result = {};
    for each ( var tag in this.tags ) {
      result[tag.getId()] = tag;
    }
    return result;
  };

  this.getTagsAsArray = function() {
    return this.tags.slice( 0 );
  };

  this.getTagsIdsArray = function() {
    var result = [];
    for each ( var tag in this.tags ) {
      result.push( tag.getId() );
    }
    return result;
  };

  this.checkTagsIdsArray = function( ids ) {
    var tagsIds = this.getTagsIdsArray();
    var id, resultIds = [];
    for ( var i = 0; i < ids.length; i++ ) {
      id = ids[i];
      if ( tagsIds.indexOf( id ) !== -1 ) {
        resultIds.push( id );
      }
    }
    if ( ids.length !== resultIds.length ) {
      ids.splice( 0, ids.length );
      for ( var i = 0; i < resultIds.length; i++ ) {
        ids.push( resultIds[i] );
      }
      return false;
    }
    return true;
  };

  this.load = function() {
    var info, hasNoTag = false;
    var items = this.getDescriptor().getItems();
    this.locked = true;
    for ( var i = 0; i < items.length; i++ ) {
      info = items[i];
      fillTagDefaultItemInfo( info );
      if ( info[0] === "00000000000000000000000000000000" /* id */ ) {
        if ( hasNoTag ) {
          info[0] = Utils.createUUID(); /* id */
          if ( info[3] === 0 /* index */ ) {
            info[3] = -1;
          }
        } else {
          hasNoTag = true;
          if ( info[3] !== 0 /* index */ ) {
            info[3] = 0;
          }
        }
      } else {
        if ( info[3] === 0 /* index */ ) {
          info[3] = -1;
        }
      }
    }
    if ( !hasNoTag ) {
      items.push( getNoTagDefaultItemInfo() );
    }
    items.sort( function ( aInfo, bInfo ) {
      var a = aInfo[3], b = bInfo[3]; // index
      if ( a < 0 && b >= 0 ) {
        return 1;
      }
      if ( a >= 0 && b < 0 ) {
        return -1;
      }
      if ( a < 0 && b < 0 ) {
        return 0;
      }
      return a - b;
    } );
    this.tags.splice( 0, this.tags.length );
    for ( var i = 0; i < items.length; i++ ) {
      items[i][3] = i; // index
      new ru.akman.znotes.core.Tag(
        this,
        items[i][0],
        items[i][1],
        items[i][2],
        items[i][3],
        items[i][4]
      );
    }
    this.getDescriptor().setItems( items );
    this.locked = false;
  };

  this.createTag = function( name, color ) {
    var tag = new ru.akman.znotes.core.Tag(
      this,
      Utils.createUUID(),
      name,
      color,
      this.tags.length,
      -1
    );
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "TagCreated",
        { createdTag: tag }
      )
    );
    return tag;
  };

  this.appendTag = function( tag ) {
    this.tags.push( tag );
    tag.setIndex( this.tags.length - 1 );
    this.getDescriptor().addItem( tag.getDescriptorItemInfo() );
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "TagAppended",
        { appendedTag: tag }
      )
    );
    return tag;
  };

  this.removeTag = function( tag ) {
    var index = this.tags.indexOf( tag );
    if ( index === -1 ) {
      return tag;
    }
    this.tags.splice( index, 1 );
    for ( var i = index; i < this.tags.length; i++ ) {
      this.tags[i].setIndex( i );
    }
    this.getDescriptor().removeItem( tag.getId() );
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "TagRemoved",
        { removedTag: tag }
      )
    );
    return tag;
  };

  this.moveTagTo = function( tag, index ) {
    var oldValue = this.tags.indexOf( tag );
    if ( oldValue === -1 || oldValue === index ) {
      return tag;
    }
    if ( index < 0 || index > this.tags.length ) {
      return tag;
    }
    this.tags.splice( oldValue, 1 );
    this.tags.splice( index, 0, tag );
    for ( var i = Math.min( index, oldValue ); i < this.tags.length; i++ ) {
      this.tags[i].setIndex( i );
    }
    this.getDescriptor().setItem( tag.getDescriptorItemInfo() );
    this.notifyStateListener(
      new ru.akman.znotes.core.Event(
        "TagMovedTo",
        {
          movedToTag: tag,
          oldValue: oldValue,
          newValue: index
        }
      )
    );
    return tag;
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
  };

};
