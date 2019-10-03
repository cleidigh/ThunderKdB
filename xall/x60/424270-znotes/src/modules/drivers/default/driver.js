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

const EXPORTED_SYMBOLS = ["Driver"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};

Cu.import( "resource://znotes/utils.js", ru.akman.znotes );
Cu.import( "resource://znotes/documentmanager.js", ru.akman.znotes );

var Driver = function() {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "drivers.default.driver" );

  var ENTRY_DESCRIPTOR_FILENAME = ".znotes";
  var TAGS_DESCRIPTOR_FILENAME = ".ztags";
  var NOTE_CONTENT_DIRECTORY_SUFFIX = "_files";
  var NOTE_ATTACHMENTS_DIRECTORY_SUFFIX = "_attachments";
  var NOTE_DEFAULT_FILE_EXTENSION = ".znote";
  var BIN_CATEGORY_DIRECTORY_NAME = ".zbin";

  var MAX_SAFE_INTEGER = ( "MAX_SAFE_INTEGER" in Number ) ?
    Number.MAX_SAFE_INTEGER : 9007199254740991;

  // E X C E P T I O N

  var DriverExceptionCodes = {
    // ----------------------------  ----     -----
    // name                          code     param
    // ----------------------------  ----     -----
    DESCRIPTOR_ITEM_WAS_NOT_FOUND:      1, // id
    DESCRIPTOR_NAME_ALREADY_EXISTS:     2, // name
    ENTRY_CATEGORY_INVALID_OPERATION:   4, // -
    ENTRY_CATEGORY_ALREADY_EXISTS:      8, // name
    ENTRY_BIN_ALREADY_EXISTS:          16, // -
    ENTRY_NOTE_INVALID_OPERATION:      32, // -
    ENTRY_NOTE_ALREADY_EXISTS:         64, // name
    ENTRY_NOTE_DATA_CORRUPTED:        128, // -
    DRIVER_INVALID_PATH:              256, // path
    DRIVER_DIRECTORY_NOT_FOUND:       512, // path
    DRIVER_ACCESS_DENIED:            1024, // path
    DRIVER_DIRECTORY_CREATE_ERROR:   2048, // path
    DRIVER_DIRECTORY_REMOVE_ERROR:   4096  // path
  };

  var DriverException = function( name, param ) {
    this.name = "DriverException";
    this.message = pub.getBundle().getString( name );
    this.param = param ? param : "";
    this.toString = function() {
      return this.name + "\nDriver: " + pub.getName() + " " +
             pub.getVersion() + "(" + pub.getDescription() +
             ")\nMessage: " + this.message + "\nData: " + this.param;
    };
  };

  // D E S C R I P T O R

  var Descriptor = function( entryPath, encoding, entryName ) {

    var parseString = function( str ) {
      return str.split( "\u0000" );
    };

    var composeString = function( data ) {
      return data.join( "\u0000" );
    };

    var trimString = function( s ) {
      return s.replace( /(^\s+)|(\s+$)/g, "" );
    };

    this.readDescriptorFile = function() {
      var content = Utils.readFileContent(
        this.entry,
        this.encoding
      );
      return content.split(/\r\n|\r|\n/);
    };

    this.writeDescriptorFile = function( data ) {
      Utils.writeFileContent(
        this.entry,
        this.encoding,
        data.join("\r\n")
      );
    };

    this.getItems = function() {
      var data = this.readDescriptorFile();
      var result = [];
      var str = null;
      for ( var i = 0; i < data.length; i++ ) {
        str = trimString( data[i] );
        if ( str.length ) {
          result.push( parseString( str ) )
        }
      }
      return result;
    };

    this.setItems = function( items ) {
      var arr = [];
      for ( var i = 0; i < items.length; i++ ) {
        arr.push( composeString( items[i] ) );
      }
      this.writeDescriptorFile( arr );
      return this;
    };

    this.addItem = function( info ) {
      var data = this.readDescriptorFile();
      var arr = [];
      var str = null;
      for ( var i = 0; i < data.length; i++ ) {
        str = trimString( data[i] );
        if ( str.length ) {
          arr.push( str );
        }
      }
      str = composeString( info );
      arr.push( str );
      this.writeDescriptorFile( arr );
      return info[0];
    };

    this.removeItem = function( id ) {
      var data = this.readDescriptorFile();
      var arr = [];
      var isChanged = false;
      var parseInfo = null;
      var str = null;
      for ( var i = 0; i < data.length; i++ ) {
        str = trimString( data[i] );
        if ( str.length ) {
          parseInfo = parseString( str );
          if ( parseInfo[0] === id ) {
            isChanged = true;
          } else {
            arr.push( str );
          }
        }
      }
      if ( isChanged ) {
        this.writeDescriptorFile( arr );
      } else {
        throw new DriverException( "DESCRIPTOR_ITEM_WAS_NOT_FOUND", id );
      }
    };

    this.getItem = function( id ) {
      var data = this.readDescriptorFile();
      var result = null;
      var parseInfo = null;
      var str = null;
      for ( var i = 0; i < data.length; i++ ) {
        str = trimString( data[i] );
        if ( str.length ) {
          parseInfo = parseString( str );
          if ( parseInfo[0] === id ) {
            result = parseInfo;
          }
        }
      }
      return result;
    };

    this.setItem = function( info ) {
      var data = this.readDescriptorFile();
      var arr = [];
      var isChanged = false;
      var parseInfo = null;
      var str = null;
      for ( var i = 0; i < data.length; i++ ) {
        str = trimString( data[i] );
        if ( str.length ) {
          parseInfo = parseString( str );
          if ( parseInfo[0] === info[0] ) {
            str = composeString( info );
            isChanged = true;
          }
          arr.push( str );
        }
      }
      if ( !isChanged ) {
        throw new DriverException( "DESCRIPTOR_ITEM_WAS_NOT_FOUND", info[0] );
      }
      this.writeDescriptorFile( arr );
    };

    this.refresh = function( newEntryPath ) {
      this.entryPath = newEntryPath.clone();
      this.entry = newEntryPath.clone();
      this.entry.append( this.entryName );
    };

    this.entryPath = entryPath.clone();
    this.entryName = entryName;
    this.encoding = encoding;

    this.entry = entryPath.clone();
    this.entry.append( entryName );
    if ( this.entry.exists() && this.entry.isDirectory() ) {
      throw new DriverException( "DESCRIPTOR_NAME_ALREADY_EXISTS", entryName );
    }
    if ( !this.entry.exists() ) {
      this.entry.create( Ci.nsIFile.NORMAL_FILE_TYPE, parseInt( "0644", 8 ) );
    }

  };

  // E N T R Y

  var Entry = function( aParent, anEntry, anEncoding, anExtensions ) {

    var getFileNameFromNoteName = function( noteName ) {
      return noteName.replace(/\u005C/g, "%5C")  // '\'
                     .replace(/\u002F/g, "%2F")  // '/'
                     .replace(/\u003A/g, "%3A")  // ':'
                     .replace(/\u002A/g, "%2A")  // '*'
                     .replace(/\u003F/g, "%3F")  // '?'
                     .replace(/\u0022/g, "%22")  // '"'
                     .replace(/\u003C/g, "%3C")  // '<'
                     .replace(/\u003E/g, "%3E")  // '>'
                     .replace(/\u007C/g, "%7C"); // '|'
    };

    var getNoteNameFromFileName = function( fileName ) {
      return fileName.replace(/%5C/g, "\u005C")  // '\'
                     .replace(/%2F/g, "\u002F")  // '/'
                     .replace(/%3A/g, "\u003A")  // ':'
                     .replace(/%2A/g, "\u002A")  // '*'
                     .replace(/%3F/g, "\u003F")  // '?'
                     .replace(/%22/g, "\u0022")  // '"'
                     .replace(/%3C/g, "\u003C")  // '<'
                     .replace(/%3E/g, "\u003E")  // '>'
                     .replace(/%7C/g, "\u007C"); // '|'
    };

    var compareEntries = function( e1, e2 ) {
      return ( e1.isBin() ? MAX_SAFE_INTEGER : e1.getIndex() ) -
             ( e2.isBin() ? MAX_SAFE_INTEGER : e2.getIndex() );
    };

    var getFileExtension = function( leafName ) {
      var result = /\.[^.\\/:*?"<>|\s]+$/g.exec( leafName );
      if ( result ) {
        return result[0];
      }
      return "";
    };

    var getFileName = function( leafName ) {
      return leafName.substring( 0,
        leafName.length - getFileExtension( leafName ).length );
    };

    var checkDirectoryEntry = function( entry ) {
      return getFileName( entry.leafName ).length;
    };

    var checkFileEntry = function( entry ) {
      return getFileName( entry.leafName ).length;
    };

    var getDirectoryPrefix = function( leafName ) {
      var cLength = NOTE_CONTENT_DIRECTORY_SUFFIX.length;
      var cIndex = leafName.lastIndexOf( NOTE_CONTENT_DIRECTORY_SUFFIX );
      if ( cIndex > 0 && cIndex + cLength == leafName.length ) {
        return leafName.substring( 0, cIndex );
      }
      var aLength = NOTE_ATTACHMENTS_DIRECTORY_SUFFIX.length;
      var aIndex = leafName.lastIndexOf( NOTE_ATTACHMENTS_DIRECTORY_SUFFIX );
      if ( aIndex > 0 && aIndex + aLength == leafName.length ) {
        return leafName.substring( 0, aIndex );
      }
      return "";
    };

    var getDirectorySuffix = function( leafName ) {
      var cLength = NOTE_CONTENT_DIRECTORY_SUFFIX.length;
      var cIndex = leafName.lastIndexOf( NOTE_CONTENT_DIRECTORY_SUFFIX );
      if ( cIndex > 0 && cIndex + cLength == leafName.length ) {
        return leafName.substring( cIndex );
      }
      var aLength = NOTE_ATTACHMENTS_DIRECTORY_SUFFIX.length;
      var aIndex = leafName.lastIndexOf( NOTE_ATTACHMENTS_DIRECTORY_SUFFIX );
      if ( aIndex > 0 && aIndex + aLength == leafName.length ) {
        return leafName.substring( aIndex );
      }
      return "";
    };

    var getSuitableLeafName = function( entry, names ) {
      var name = getFileName( entry.leafName );
      var extension = getFileExtension( entry.leafName );
      var newName, newEntry, cEntry, aEntry;
      var i = 1;
      do {
        newName = name + " (" + i++ + ")";
        newEntry = entry.parent.clone();
        newEntry.append( newName + extension );
        cEntry = entry.parent.clone();
        cEntry.append( newName + NOTE_CONTENT_DIRECTORY_SUFFIX );
        aEntry = entry.parent.clone();
        aEntry.append( newName + NOTE_ATTACHMENTS_DIRECTORY_SUFFIX );
      } while (
        ( names && names.indexOf( newName ) != -1 ) ||
        newEntry.exists() || cEntry.exists() || aEntry.exists()
      );
      return newName + extension;
    };

    this.createCategory = function( aName ) {
      if ( !this.isCategory() ) {
        throw new DriverException( "ENTRY_NOTE_INVALID_OPERATION" );
      }
      if ( !this.canCreate( aName ) ) {
        throw new DriverException( "ENTRY_CATEGORY_ALREADY_EXISTS", aName );
      }
      var entry = this.entry.clone();
      var leafName = getFileNameFromNoteName( aName );
      entry.append( leafName );
      if ( !entry.exists() || !entry.isDirectory() ) {
        entry.create( Ci.nsIFile.DIRECTORY_TYPE, parseInt( "0755", 8 ) );
      } else {
        throw new DriverException( "ENTRY_CATEGORY_ALREADY_EXISTS", aName );
      }
      var result = new Entry( this, entry, this.encoding, this.extensions );
      result.setName( aName );
      return result;
    };

    this.createBin = function() {
      if ( !this.isRoot() ) {
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      }
      var entry = this.entry.clone();
      var leafName = BIN_CATEGORY_DIRECTORY_NAME;
      entry.append( leafName );
      if ( !entry.exists() || !entry.isDirectory() ) {
        entry.create( Ci.nsIFile.DIRECTORY_TYPE, parseInt( "0755", 8 ) );
      } else {
        throw new DriverException( "ENTRY_BIN_ALREADY_EXISTS" );
      }
      var result = new Entry( this, entry, this.encoding, this.extensions );
      result.setName( "Trash" );
      return result;
    };

    this.createNote = function( aName, aType ) {
      if ( !this.isCategory() )
        throw new DriverException( "ENTRY_NOTE_INVALID_OPERATION" );
      if ( !this.canCreate( aName, aType ) ) {
        throw new DriverException( "ENTRY_NOTE_ALREADY_EXISTS", aName );
      }
      var entry = this.entry.clone();
      var ext = ( aType in this.extensions ) ?
        this.extensions[aType] : NOTE_DEFAULT_FILE_EXTENSION;
      var leafName = getFileNameFromNoteName( aName ) + ext;
      entry.append( leafName );
      if( !entry.exists() ) {
        entry.create( Ci.nsIFile.NORMAL_FILE_TYPE, parseInt( "0644", 8 ) );
      } else {
        throw new DriverException( "ENTRY_NOTE_ALREADY_EXISTS", aName );
      }
      var datetime = Date.now();
      var result = new Entry( this, entry, this.encoding, this.extensions );
      result.setName( aName );
      result.setType( aType );
      result.setCreateDateTime( datetime );
      result.setUpdateDateTime( datetime );
      return result;
    };

    this.canCreate = function( aName, aType ) {
      var parent = this.entry.clone();
      var fileName, entry, entries = parent.directoryEntries;
      var name, prefix;
      var dirs = {};
      var categories = [], notes = [];
      while ( entries.hasMoreElements() ) {
        entry = entries.getNext();
        entry.QueryInterface( Ci.nsIFile );
        if ( entry.isDirectory() ) {
          if ( this.isRoot() &&
               entry.leafName === BIN_CATEGORY_DIRECTORY_NAME ) {
            categories.push( entry.leafName );
          } else if ( checkDirectoryEntry( entry ) ) {
            name = getDirectoryPrefix( entry.leafName );
            if ( name ) {
              if ( !( name in dirs ) ) {
                dirs[name] = [];
              }
              dirs[name].push( entry.leafName );
            } else {
              categories.push( entry.leafName );
            }
          }
        } else {
          if ( checkFileEntry( entry ) ) {
            name = getFileName( entry.leafName );
            if ( notes.indexOf( name ) == -1 ) {
              notes.push( name );
            }
          }
        }
      }
      for ( name in dirs ) {
        if ( notes.indexOf( name ) == -1 ) {
          for each ( fileName in dirs[name] ) {
            categories.push( fileName );
          }
        }
      }
      fileName = getFileNameFromNoteName( aName );
      if ( !!aType ) {
        return (
          notes.indexOf( fileName ) == -1 &&
          categories.indexOf(
            fileName + NOTE_CONTENT_DIRECTORY_SUFFIX ) == -1 &&
          categories.indexOf(
            fileName + NOTE_ATTACHMENTS_DIRECTORY_SUFFIX ) == -1
        );
      }
      prefix = getDirectoryPrefix( fileName );
      if ( prefix ) {
        return (
          categories.indexOf( fileName ) == -1 &&
          notes.indexOf( prefix ) == -1
        );
      }
      return ( categories.indexOf( fileName ) == -1 );
    };

    this.exists = function( aName, aType ) {
      var entry = this.entry.clone();
      var leafName = getFileNameFromNoteName( aName );
      if ( aType ) {
        leafName += this.extensions[aType];
      }
      entry.append( leafName );
      return entry.exists();
    };

    this.getSize = function() {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      return this.entry.fileSize;
    };

    this.remove = function() {
      var leafName = this.getLeafName();
      var entry = this.entry.clone();
      var descriptor = this.getDescriptor();
      if ( this.entry.isDirectory() ) {
        entry.append( ENTRY_DESCRIPTOR_FILENAME );
        if ( entry.exists() )
          entry.remove( false );
      } else {
        var name = getFileName( leafName );
        var contentDirName = name + NOTE_CONTENT_DIRECTORY_SUFFIX;
        entry = this.entry.parent.clone();
        entry.append( contentDirName );
        if ( entry.exists() ) {
          entry.remove( true );
        }
        var attachmentsDirName = name + NOTE_ATTACHMENTS_DIRECTORY_SUFFIX;
        entry = this.entry.parent.clone();
        entry.append( attachmentsDirName );
        if ( entry.exists() ) {
          entry.remove( true );
        }
      }
      this.entry.remove( false );
      descriptor.removeItem( leafName );
    };

    this.refresh = function( parent ) {
      var leafName = this.getLeafName();
      var entry = parent.entry.clone();
      entry.append( leafName );
      this.entry = entry.clone();
      this.parent = parent;
      if ( this.isCategory() ) {
        this.descriptor.refresh( this.entry );
      } else {
        var name = getFileName( leafName );
        var contentDirName = name + NOTE_CONTENT_DIRECTORY_SUFFIX;
        var contentDirEntry = this.entry.parent.clone();
        contentDirEntry.append( contentDirName );
        this.contentsDescriptor.refresh( contentDirEntry );
        var attachmentsDirName = name + NOTE_ATTACHMENTS_DIRECTORY_SUFFIX;
        var attachmentsDirEntry = this.entry.parent.clone();
        attachmentsDirEntry.append( attachmentsDirName );
        this.attachmentsDescriptor.refresh( attachmentsDirEntry );
      }
    };

    this.moveTo = function( aCategory, aName ) {
      var leafName = this.getLeafName();
      var fileExt = this.isCategory() ? "" : getFileExtension( leafName );
      var fileName = this.isCategory() ? leafName : getFileName( leafName );
      var name = getNoteNameFromFileName( fileName );
      var targetName = ( aName === undefined ? name : aName );
      var targetLeafName = getFileNameFromNoteName( targetName ) + fileExt;
      if ( !aCategory.canCreate( targetName, !this.isCategory() ) ) {
        throw new DriverException(
          this.isCategory() ? "ENTRY_CATEGORY_ALREADY_EXISTS" :
                              "ENTRY_NOTE_ALREADY_EXISTS",
          targetName
        );
      }
      var descriptor = this.getDescriptor();
      var data = descriptor.getItem( leafName );
      var targetEntry = aCategory.entry.clone();
      targetEntry.append( targetLeafName );
      if ( this.isCategory() ) {
        if ( !targetEntry.exists() ) {
          this.entry.moveTo( aCategory.entry, targetLeafName );
        } else {
          throw new DriverException( "ENTRY_CATEGORY_ALREADY_EXISTS", name );
        }
      } else {
        var contentsDescriptor = this.getContentsDescriptor();
        var contentDirName = getFileNameFromNoteName( name ) +
                             NOTE_CONTENT_DIRECTORY_SUFFIX;
        var contentDirEntry = this.entry.parent.clone();
        contentDirEntry.append( contentDirName );
        var targetContentDirName = getFileNameFromNoteName( targetName ) +
                                   NOTE_CONTENT_DIRECTORY_SUFFIX;
        var targetContentDirEntry = aCategory.entry.clone();
        targetContentDirEntry.append( targetContentDirName );
        var attachmentsDescriptor = this.getAttachmentsDescriptor();
        var attachmentsDirName = getFileNameFromNoteName( name ) +
                                 NOTE_ATTACHMENTS_DIRECTORY_SUFFIX;
        var attachmentsDirEntry = this.entry.parent.clone();
        attachmentsDirEntry.append( attachmentsDirName );
        var targetAttachmentsDirName = getFileNameFromNoteName( targetName ) +
                                       NOTE_ATTACHMENTS_DIRECTORY_SUFFIX;
        var targetAttachmentsDirEntry = aCategory.entry.clone();
        targetAttachmentsDirEntry.append( targetAttachmentsDirName );
        if ( targetEntry.exists() ) {
          throw new DriverException( "ENTRY_NOTE_ALREADY_EXISTS", targetName );
        }
        if ( targetContentDirEntry.exists() ) {
          throw new DriverException( "ENTRY_NOTE_ALREADY_EXISTS", targetName );
        }
        if ( targetAttachmentsDirEntry.exists() ) {
          throw new DriverException( "ENTRY_NOTE_ALREADY_EXISTS", targetName );
        }
        if ( !contentDirEntry.exists() ) {
          throw new DriverException( "ENTRY_NOTE_DATA_CORRUPTED" );
        }
        if ( !attachmentsDirEntry.exists() ) {
          throw new DriverException( "ENTRY_NOTE_DATA_CORRUPTED" );
        }
        this.entry.moveTo( aCategory.entry, targetLeafName );
        contentDirEntry.moveTo( aCategory.entry, targetContentDirName );
        contentsDescriptor.refresh( targetContentDirEntry );
        attachmentsDirEntry.moveTo( aCategory.entry, targetAttachmentsDirName );
        attachmentsDescriptor.refresh( targetAttachmentsDirEntry );
      }
      descriptor.removeItem( leafName );
      this.parent = aCategory;
      descriptor = this.getDescriptor();
      data[0] = targetLeafName;
      data[1] = targetName;
      descriptor.addItem( data );
    };

    this.createDefaultItemInfo = function( leafName ) {
      var info = [];
      info.push( leafName );
      this.fillDefaultItemInfo( info );
      return info;
    };

    this.fillDefaultItemInfo = function( info ) {
      if ( this.entry == null )
        return false;
      if ( !this.entry.exists() )
        return false;
      var name = info[0];
      if ( !this.entry.isDirectory() ) {
        name = getFileName( name );
      }
      name = getNoteNameFromFileName( name );
      var index = -1;
      var openState = false;
      var tagsIDs = "";
      var selectedIndex = -1;
      var createdDateTime = this.entry.lastModifiedTime;
      var updatedDateTime = this.entry.lastModifiedTime;
      var id = Utils.createUUID();
      var type = this.entry.isDirectory() ? "" : "unknown";
      var data = "{}";
      var result = false;
      if ( info[1] === undefined ) {
        info[1] = name;
        result = true;
      }
      if ( info[2] === undefined ) {
        info[2] = index;
        result = true;
      }
      if ( info[3] === undefined ) {
        info[3] = openState;
        result = true;
      }
      if ( info[4] === undefined ) {
        info[4] = tagsIDs;
        result = true;
      }
      if ( info[5] === undefined ) {
        info[5] = selectedIndex;
        result = true;
      }
      if ( info[6] === undefined ) {
        info[6] = createdDateTime;
        result = true;
      }
      if ( info[7] === undefined ) {
        info[7] = updatedDateTime;
        result = true;
      }
      if ( info[8] === undefined ) {
        info[8] = id;
        result = true;
      }
      if ( info[9] === undefined ) {
        info[9] = type;
        result = true;
      }
      if ( info[10] === undefined ) {
        info[10] = data;
        result = true;
      }
      if ( info.length > 11 ) {
        info.splice( 11 );
        result = true;
      }
      return result;
    };

    this.getDescriptorItemField = function( index ) {
      var descriptor = this.getDescriptor();
      var leafName = this.getLeafName();
      var info = descriptor.getItem( leafName );
      if ( info == null ) {
        info = this.createDefaultItemInfo( leafName );
        descriptor.addItem( info );
      }
      if ( this.fillDefaultItemInfo( info ) ) {
        descriptor.setItem( info );
      }
      return info[index];
    };

    this.setDescriptorItemField = function( index, value ) {
      var descriptor = this.getDescriptor();
      var leafName = this.getLeafName();
      var data = descriptor.getItem( leafName );
      if ( data == null ) {
        data = this.createDefaultItemInfo( leafName );
        descriptor.addItem( data );
      }
      data[index] = value;
      descriptor.setItem( data );
    };

    this.getName = function() {
      if ( this.isRoot() ) {
        return null;
      }
      return this.getDescriptorItemField( 1 );
    };

    this.getLeafName = function() {
      return this.entry.leafName;
    };

    this.setLeafName = function( leafName ) {
      var oldLeafName = this.getLeafName();
      var descriptor = this.getDescriptor();
      var data = descriptor.getItem( oldLeafName );
      var targetEntry = this.entry.parent.clone();
      targetEntry.append( leafName );
      if ( this.isCategory() ) {
        if ( !targetEntry.exists() ) {
          this.entry.moveTo( null, leafName );
        } else {
          throw new DriverException(
            "ENTRY_CATEGORY_ALREADY_EXISTS", leafName );
        }
      } else {
        var name = getFileName( leafName );
        var oldName = getFileName( oldLeafName );
        var contentsDescriptor = this.getContentsDescriptor();
        var contentDirName = oldName + NOTE_CONTENT_DIRECTORY_SUFFIX;
        var contentDirEntry = this.entry.parent.clone();
        contentDirEntry.append( contentDirName );
        var targetContentDirName = name + NOTE_CONTENT_DIRECTORY_SUFFIX;
        var targetContentDirEntry = this.entry.parent.clone();
        targetContentDirEntry.append( targetContentDirName );
        var attachmentsDescriptor = this.getAttachmentsDescriptor();
        var attachmentsDirName = oldName + NOTE_ATTACHMENTS_DIRECTORY_SUFFIX;
        var attachmentsDirEntry = this.entry.parent.clone();
        attachmentsDirEntry.append( attachmentsDirName );
        var targetAttachmentsDirName = name + NOTE_ATTACHMENTS_DIRECTORY_SUFFIX;
        var targetAttachmentsDirEntry = this.entry.parent.clone();
        targetAttachmentsDirEntry.append( targetAttachmentsDirName );
        if ( targetEntry.exists() ) {
          throw new DriverException( "ENTRY_NOTE_ALREADY_EXISTS", name );
        }
        if ( targetContentDirEntry.exists() ) {
          throw new DriverException( "ENTRY_NOTE_ALREADY_EXISTS", name );
        }
        if ( targetAttachmentsDirEntry.exists() ) {
          throw new DriverException( "ENTRY_NOTE_ALREADY_EXISTS", name );
        }
        if ( !contentDirEntry.exists() ) {
          throw new DriverException( "ENTRY_NOTE_DATA_CORRUPTED" );
        }
        if ( !attachmentsDirEntry.exists() ) {
          throw new DriverException( "ENTRY_NOTE_DATA_CORRUPTED" );
        }
        if ( contentDirEntry.leafName !== targetContentDirName ) {
          contentDirEntry.moveTo( null, targetContentDirName );
          contentsDescriptor.refresh( targetContentDirEntry );
        }
        if ( attachmentsDirEntry.leafName !== targetAttachmentsDirName ) {
          attachmentsDirEntry.moveTo( null, targetAttachmentsDirName );
          attachmentsDescriptor.refresh( targetAttachmentsDirEntry );
        }
        this.entry.moveTo( null, leafName );
      }
      descriptor.removeItem( oldLeafName );
      data[0] = leafName;
      descriptor.addItem( data );
    };

    this.setName = function( name ) {
      if ( this.isRoot() ) {
        return;
      }
      if ( !this.isBin() ) {
        var oldLeafName = this.getLeafName();
        var newLeafName = getFileNameFromNoteName( name );
        if ( !this.isCategory() ) {
          newLeafName = newLeafName + getFileExtension( oldLeafName );
        }
        if ( oldLeafName !== newLeafName ) {
          try {
            if ( !this.parent.canCreate( name, !this.isCategory() ) ) {
              throw new DriverException(
                this.isCategory() ? "ENTRY_CATEGORY_ALREADY_EXISTS" :
                                    "ENTRY_NOTE_ALREADY_EXISTS",
                name
              );
            }
            this.setLeafName( newLeafName );
          } catch ( e ) {
            if ( oldLeafName.toLowerCase() !== newLeafName.toLowerCase() ) {
              throw e;
            } else {
              // On Windows the file/directory names "Abc" and "ABC" are equal
            }
          }
        }
      }
      this.setDescriptorItemField( 1, name );
    };

    this.getIndex = function() {
      if ( this.isRoot() ) {
        return 0;
      }
      return parseInt( this.getDescriptorItemField( 2 ) );
    };

    this.getOpenState = function() {
      if ( !this.isCategory() ) {
        throw new DriverException( "ENTRY_NOTE_INVALID_OPERATION" );
      }
      if ( this.isRoot() ) {
        return true;
      }
      return this.getDescriptorItemField( 3 ) == "true" ? true : false;
    };

    this.getTags = function() {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      var result = this.getDescriptorItemField( 4 );
      if ( result ) {
        result = result.split(",");
        if ( result.length == 1 && result[0] == "" ) {
          result.splice( 0, 1 );
        }
      } else {
        result = [];
      }
      return result;
    };

    this.getSelectedIndex = function() {
      if ( !this.isCategory() )
        throw new DriverException( "ENTRY_NOTE_INVALID_OPERATION" );
      if ( this.isRoot() )
        return -1;
      return parseInt( this.getDescriptorItemField( 5 ) );
    };

    this.getCreateDateTime = function() {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      return new Date( parseInt( this.getDescriptorItemField( 6 ) ) );
    };

    this.getUpdateDateTime = function() {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      return new Date( parseInt( this.getDescriptorItemField( 7 ) ) );
    };

    this.getId = function() {
      if ( this.isRoot() ) {
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      }
      return this.getDescriptorItemField( 8 );
    };

    this.getType = function() {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      return this.getDescriptorItemField( 9 );
    };

    this.getData = function() {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      return this.getDescriptorItemField( 10 );
    };

    this.setData = function( data ) {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      this.setDescriptorItemField( 10, data );
    };

    this.setType = function( type ) {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      this.setDescriptorItemField( 9, type );
    };

    this.setId = function( id ) {
      if ( this.isRoot() ) {
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      }
      this.setDescriptorItemField( 8, id );
    };

    this.setIndex = function( index ) {
      if ( this.isRoot() ) {
        return;
      }
      this.setDescriptorItemField( 2, index );
    };

    this.setOpenState = function( state ) {
      if ( !this.isCategory() || this.isRoot() ) {
        throw new DriverException( "ENTRY_NOTE_INVALID_OPERATION" );
      }
      this.setDescriptorItemField( 3, "" + state );
    };

    this.setTags = function( ids ) {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      this.setDescriptorItemField( 4, ids.join( "," ) );
    };

    this.setSelectedIndex = function( index ) {
      if ( !this.isCategory() || this.isRoot() )
        throw new DriverException( "ENTRY_NOTE_INVALID_OPERATION" );
      this.setDescriptorItemField( 5, index );
    };

    this.setCreateDateTime = function( datetime ) {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      this.setDescriptorItemField( 6, datetime );
    };

    this.setUpdateDateTime = function( datetime ) {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      this.setDescriptorItemField( 7, datetime );
    };

    this.getMainContent = function() {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      return Utils.readFileContent( this.entry, this.encoding);
    };

    this.setMainContent = function( data ) {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      Utils.writeFileContent( this.entry, this.encoding, data );
      var datetime = Date.now();
      this.setUpdateDateTime( datetime );
    };

    this.hasContents = function() {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      var result = false;
      var items = this.contentsDescriptor.getItems();
      return items.length > 0;
      return result;
    };

    this.getContents = function() {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      var contentsDescriptor = this.getContentsDescriptor();
      return contentsDescriptor.getItems();
    }

    this.getContent = function( leafName ) {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      var contentsDescriptor = this.getContentsDescriptor();
      return contentsDescriptor.getItem( leafName );
    }

    this.getContentEntry = function( leafName ) {
      var entry = this.getContentDirectory();
      entry = entry.clone();
      entry.append( leafName );
      return entry;
    };

    this.addContent = function( data ) {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      var contentsDescriptor = this.getContentsDescriptor();
      var leafName = data[0];
      var isItemExists = true;
      var info = contentsDescriptor.getItem( leafName );
      if ( info == null ) {
        info = [ leafName ];
        isItemExists = false;
      }
      var contentDirectoryEntry = this.getContentDirectory();
      var sourceDirectoryEntry =
        Cc["@mozilla.org/file/local;1"]
        .createInstance( Ci.nsIFile );
      sourceDirectoryEntry.initWithPath( data[1] );
      if ( sourceDirectoryEntry.leafName == ENTRY_DESCRIPTOR_FILENAME ) {
        return null;
      }
      if ( sourceDirectoryEntry.path != contentDirectoryEntry.path ) {
        var srcEntry = sourceDirectoryEntry.clone();
        srcEntry.append( leafName );
        var dstEntry = contentDirectoryEntry.clone();
        dstEntry.append( leafName );
        try {
          if ( dstEntry.exists() ) {
            dstEntry.remove( false );
          }
          srcEntry.copyTo( contentDirectoryEntry, null );
        } catch ( e ) {
          log.warn( e + "\n" + Utils.dumpStack() );
          return null;
        }
      }
      if ( isItemExists ) {
        contentsDescriptor.setItem( info );
      } else {
        contentsDescriptor.addItem( info );
      }
      return info;
    };

    this.removeContent = function( leafName ) {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      var contentsDescriptor = this.getContentsDescriptor();
      var info = contentsDescriptor.getItem( leafName );
      if ( info == null ) {
        throw new DriverException( "ENTRY_NOTE_DATA_CORRUPTED" );
      }
      var contentDirectoryEntry = this.getContentDirectory();
      var fileEntry = contentDirectoryEntry.clone();
      fileEntry.append( leafName );
      try {
        if ( fileEntry.exists() ) {
          fileEntry.remove( false );
        }
      } catch ( e ) {
        log.warn( e + "\n" + Utils.dumpStack() );
      }
      contentsDescriptor.removeItem( leafName );
      return info;
    };

    this.hasAttachments = function() {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      var result = false;
      var items = this.attachmentsDescriptor.getItems();
      return items.length > 0;
      return result;
    };

    this.getAttachments = function() {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      var attachmentsDescriptor = this.getAttachmentsDescriptor();
      return attachmentsDescriptor.getItems();
    }

    this.getAttachment = function( leafName ) {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      var attachmentsDescriptor = this.getAttachmentsDescriptor();
      return attachmentsDescriptor.getItem( leafName );
    }

    this.getAttachmentEntry = function( leafName ) {
      var entry = this.getAttachmentsDirectory();
      entry = entry.clone();
      entry.append( leafName );
      return entry;
    };

    this.addAttachment = function( data ) {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      var attachmentsDescriptor = this.getAttachmentsDescriptor();
      var leafName = data[0];
      var type = data[1];
      var isItemExists = true;
      var info = attachmentsDescriptor.getItem( leafName );
      if ( info == null ) {
        info = [ leafName ];
        isItemExists = false;
      }
      info[1] = type;
      switch ( type ) {
        case "file" :
          var attachmentsDirectoryEntry = this.getAttachmentsDirectory();
          var sourceDirectoryEntry =
            Cc["@mozilla.org/file/local;1"]
            .createInstance( Ci.nsIFile );
          sourceDirectoryEntry.initWithPath( data[2] );
          if ( sourceDirectoryEntry.leafName == ENTRY_DESCRIPTOR_FILENAME ) {
            return null;
          }
          if ( sourceDirectoryEntry.path != attachmentsDirectoryEntry.path ) {
            var srcEntry = sourceDirectoryEntry.clone();
            srcEntry.append( leafName );
            var dstEntry = attachmentsDirectoryEntry.clone();
            dstEntry.append( leafName );
            try {
              if ( dstEntry.exists() ) {
                dstEntry.remove( false );
              }
              srcEntry.copyTo( attachmentsDirectoryEntry, null );
            } catch ( e ) {
              log.warn( e + "\n" + Utils.dumpStack() );
              return null;
            }
          }
          break;
        case "contact" :
          break;
      }
      if ( isItemExists ) {
        attachmentsDescriptor.setItem( info );
      } else {
        attachmentsDescriptor.addItem( info );
      }
      return info;
    };

    this.removeAttachment = function( leafName ) {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      var attachmentsDescriptor = this.getAttachmentsDescriptor();
      var info = attachmentsDescriptor.getItem( leafName );
      if ( info == null ) {
        throw new DriverException( "ENTRY_NOTE_DATA_CORRUPTED" );
      }
      var type = info[1];
      switch ( type ) {
        case "file" :
          var attachmentsDirectoryEntry = this.getAttachmentsDirectory();
          var fileEntry = attachmentsDirectoryEntry.clone();
          fileEntry.append( leafName );
          try {
            if ( fileEntry.exists() ) {
              fileEntry.remove( false );
            }
          } catch ( e ) {
            log.warn( e + "\n" + Utils.dumpStack() );
          }
          break;
        case "contact" :
          break;
      }
      attachmentsDescriptor.removeItem( leafName );
      return info;
    };

    this.getEntries = function() {
      if ( !this.isCategory() )
        throw new DriverException( "ENTRY_NOTE_INVALID_OPERATION" );
      var result = [];
      var categories = [], notes = [];
      var dirs = {}, files = {};
      var name, names, leafName, fileName;
      var entry, fileEntry, dirEntry;
      var entries = this.entry.directoryEntries;
      while( entries.hasMoreElements() ) {
        entry = entries.getNext();
        entry.QueryInterface( Ci.nsIFile );
        if ( entry.isDirectory() ) {
          if ( this.isRoot() &&
               entry.leafName === BIN_CATEGORY_DIRECTORY_NAME ) {
            categories.push(
              new Entry( this, entry, this.encoding, this.extensions )
            );
          } else if ( checkDirectoryEntry( entry ) ) {
            name = getDirectoryPrefix( entry.leafName );
            if ( name ) {
              if ( !( name in dirs ) ) {
                dirs[name] = [];
              }
              dirs[name].push( entry );
            } else {
              categories.push(
                new Entry( this, entry, this.encoding, this.extensions )
              );
            }
          }
        } else {
          if ( checkFileEntry( entry ) ) {
            name = getFileName( entry.leafName );
            if ( !( name in files ) ) {
              files[name] = [];
            }
            files[name].push( entry );
          }
        }
      }
      names = [];
      for ( name in dirs ) {
        names.push( name );
      }
      for each ( name in names ) {
        if ( !( name in files ) ) {
          for each ( entry in dirs[name] ) {
            entry.QueryInterface( Ci.nsIFile );
            categories.push(
              new Entry( this, entry, this.encoding, this.extensions )
            );
          }
          delete dirs[name];
        } else if ( files[name].length === 1 ) {
          entry = files[name][0];
          entry.QueryInterface( Ci.nsIFile );
          notes.push(
            new Entry( this, entry, this.encoding, this.extensions ) );
          delete dirs[name];
          delete files[name];
        }
      }
      // names[] was not clear
      for ( name in files ) {
        if ( names.indexOf( name ) == -1 ) {
          names.push( name );
        }
      }
      for ( name in files ) {
        for ( var i = 0; i < files[name].length; i++ ) {
          fileEntry = files[name][i];
          fileEntry.QueryInterface( Ci.nsIFile );
          if ( i == 0 ) {
            notes.push(
              new Entry( this, fileEntry, this.encoding, this.extensions ) );
          } else {
            leafName = getSuitableLeafName( fileEntry, names );
            fileName = getFileName( leafName );
            fileEntry.moveTo( null, leafName );
            if ( name in dirs ) {
              for ( var j = 0; j < dirs[name].length; j++ ) {
                dirEntry = dirs[name][j];
                dirEntry.QueryInterface( Ci.nsIFile );
                leafName = fileName + getDirectorySuffix( dirEntry.leafName );
                // dirEntry.copyTo( null, leafName );
                // method does not copy subdirectories recursively :(
                Utils.copyEntryTo( dirEntry, null, leafName,
                  false /* overwrite */ );
              }
            }
            names.push( fileName );
            notes.push(
              new Entry( this, fileEntry, this.encoding, this.extensions ) );
          }
        }
      }
      //
      categories.sort( compareEntries );
      notes.sort( compareEntries );
      for ( var i = 0; i < categories.length; i++ ) {
        categories[i].setIndex( i );
        result.push( categories[i] );
      }
      for ( var i = 0; i < notes.length; i++ ) {
        notes[i].setIndex( i );
        result.push( notes[i] );
      }
      return result;
    };

    this.isCategory = function() {
      if ( this.entry && this.entry.exists() ) {
        return this.entry.isDirectory();
      } else {
        return false;
      }
    };

    this.isRoot = function() {
      return this.parent == null;
    };

    this.isBin = function() {
      return this.isCategory() &&
             this.entry.leafName === BIN_CATEGORY_DIRECTORY_NAME;
    };

    this.getDescriptor = function() {
      if ( this.isRoot() ) {
        return null;
      }
      return this.parent.descriptor;
    };

    this.getContentsDescriptor = function() {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      return this.contentsDescriptor;
    };

    this.getAttachmentsDescriptor = function() {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      return this.attachmentsDescriptor;
    };

    this.getURI = function() {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      var ioService =
        Cc["@mozilla.org/network/io-service;1"]
        .getService( Ci.nsIIOService );
      var fph =
        ioService.getProtocolHandler( "file" )
        .QueryInterface( Ci.nsIFileProtocolHandler );
      return fph.newFileURI( this.entry );
    };

    this.getBaseURI = function() {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      var ioService =
        Cc["@mozilla.org/network/io-service;1"]
        .getService( Ci.nsIIOService );
      var fph =
        ioService.getProtocolHandler( "file" )
        .QueryInterface( Ci.nsIFileProtocolHandler );
      return fph.newFileURI( this.getContentDirectory() );
    };

    this.getContentDirectory = function() {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      var contentDirectoryName =
        getFileName( this.getLeafName() ) + NOTE_CONTENT_DIRECTORY_SUFFIX;
      var contentDirectoryEntry = this.entry.parent.clone();
      contentDirectoryEntry.append( contentDirectoryName );
      return contentDirectoryEntry;
    };

    this.loadContentDirectory = function( fromDirectoryEntry, fMove, fClean ) {
      var entry, entries;
      var toDirectoryEntry = this.getContentDirectory();
      if ( fClean ) {
        entries = toDirectoryEntry.directoryEntries;
        while( entries && entries.hasMoreElements() ) {
          entry = entries.getNext();
          entry.QueryInterface( Ci.nsIFile );
          if ( entry.leafName !== ENTRY_DESCRIPTOR_FILENAME ) {
            entry.remove( true );
          }
        }
      }
      entries = fromDirectoryEntry.directoryEntries;
      while( entries && entries.hasMoreElements() ) {
        entry = entries.getNext();
        entry.QueryInterface( Ci.nsIFile );
        Utils.copyEntryTo( entry, toDirectoryEntry, entry.leafName,
          true /* overwrite */ );
        if ( fMove && entry.exists() ) {
          entry.remove( true );
        }
      }
      if ( fMove && fromDirectoryEntry.exists() ) {
        fromDirectoryEntry.remove( true );
      }
      this.updateContentsDescriptor( toDirectoryEntry );
    };

    this.getAttachmentsDirectory = function() {
      if ( this.isCategory() )
        throw new DriverException( "ENTRY_CATEGORY_INVALID_OPERATION" );
      var attachmentsDirectoryName =
        getFileName( this.getLeafName() ) + NOTE_ATTACHMENTS_DIRECTORY_SUFFIX;
      var attachmentsDirectoryEntry = this.entry.parent.clone();
      attachmentsDirectoryEntry.append( attachmentsDirectoryName );
      return attachmentsDirectoryEntry;
    };

    this.getEncoding = function() {
      return this.encoding;
    };

    this.updateAttachmentsDescriptor = function( attachmentsDirectoryEntry ) {
      var items = this.attachmentsDescriptor.getItems();
      for ( var i = 0; i < items.length; i++ ) {
        var item = items[i];
        if ( item[1] == "file" ) {
          var itemEntry = attachmentsDirectoryEntry.clone();
          itemEntry.append( item[0] );
          if ( !itemEntry.exists() )
            this.attachmentsDescriptor.removeItem( item[0] );
        }
      }
      var entries = attachmentsDirectoryEntry.directoryEntries;
      while( entries.hasMoreElements() ) {
        var entry = entries.getNext();
        entry.QueryInterface( Ci.nsIFile );
        if ( !entry.isDirectory() ) {
          var name = entry.leafName;
          if ( name != ENTRY_DESCRIPTOR_FILENAME ) {
            if ( this.attachmentsDescriptor.getItem( name ) == null ) {
              this.attachmentsDescriptor.addItem( [ name, "file" ] );
            }
          }
        }
      }
    };

    this.updateContentsDescriptor = function( contentDirectoryEntry ) {
      var items = this.contentsDescriptor.getItems();
      for ( var i = 0; i < items.length; i++ ) {
        var item = items[i];
        var itemEntry = contentDirectoryEntry.clone();
        itemEntry.append( item[0] );
        if ( !itemEntry.exists() )
          this.contentsDescriptor.removeItem( item[0] );
      }
      var entries = contentDirectoryEntry.directoryEntries;
      while( entries.hasMoreElements() ) {
        var entry = entries.getNext();
        entry.QueryInterface( Ci.nsIFile );
        if ( !entry.isDirectory() ) {
          var name = entry.leafName;
          if ( name != ENTRY_DESCRIPTOR_FILENAME ) {
            if ( this.contentsDescriptor.getItem( name ) == null ) {
              this.contentsDescriptor.addItem( [ name ] );
            }
          }
        }
      }
    };

    this.toString = function() {
      return "'" + this.entry.path + "'\n" +
        "'" + ( this.parent ? this.parent.entry.path : "*NULL*" ) + "'\n" +
        ( this.isCategory() ? "" : this.encoding + "\n" ) +
        ( "isCategory = " + this.isCategory() );
    };

    this.parent = aParent;
    this.entry = anEntry;
    this.encoding = anEncoding;
    this.extensions = anExtensions;
    this.descriptor = null;
    this.contentsDescriptor = null;
    this.attachmentsDescriptor = null;
    if ( this.isCategory() ) {
      var descriptorEntry = this.entry.clone();
      this.descriptor = new Descriptor(
        descriptorEntry,
        this.encoding,
        ENTRY_DESCRIPTOR_FILENAME
      );
      var items = this.descriptor.getItems();
      for ( var i = 0; i < items.length; i++ ) {
        var item = items[i];
        var itemEntry = this.entry.clone();
        itemEntry.append( item[0] );
        if ( !itemEntry.exists() )
          this.descriptor.removeItem( item[0] );
      }
    } else {
      var contentDirectoryEntry = this.getContentDirectory();
      if ( !contentDirectoryEntry.exists() ) {
        contentDirectoryEntry.create(
          Ci.nsIFile.DIRECTORY_TYPE, parseInt( "0755", 8 ) );
      }
      this.contentsDescriptor = new Descriptor(
        contentDirectoryEntry,
        this.encoding,
        ENTRY_DESCRIPTOR_FILENAME
      );
      this.updateContentsDescriptor( contentDirectoryEntry );
      var attachmentsDirectoryEntry = this.getAttachmentsDirectory();
      if ( !attachmentsDirectoryEntry.exists() ) {
        attachmentsDirectoryEntry.create(
          Ci.nsIFile.DIRECTORY_TYPE, parseInt( "0755", 8 ) );
      }
      this.attachmentsDescriptor = new Descriptor(
        attachmentsDirectoryEntry,
        this.encoding,
        ENTRY_DESCRIPTOR_FILENAME
      );
      this.updateAttachmentsDescriptor( attachmentsDirectoryEntry );
    }

  };

  // D R I V E R

  var pub = {};

  pub["default"] = true;

  pub.getInfo = function() {
    return {
      name: "default",
      version: "1.0",
      url: "chrome://znotes_drivers/content/default/",
      description: "Local file system driver"
    };
  };

  pub.getName = function() {
    return pub.getInfo().name;
  };

  pub.getURL = function() {
    return pub.getInfo().url;
  };

  pub.getVersion = function() {
    return pub.getInfo().version;
  };

  pub.getDescription = function() {
    return pub.getInfo().description;
  };

  pub.checkExtension = function( ext ) {
    return ext &&
           ext !== ENTRY_DESCRIPTOR_FILENAME &&
           ext !== TAGS_DESCRIPTOR_FILENAME;
  };

  pub.getParameters = function() {
    var docs = ru.akman.znotes.DocumentManager.getInstance().getDocuments();
    var doc, types, exts = {};
    for ( var name in docs ) {
      doc = docs[name];
      types = doc.getTypes();
      for each ( var t in types ) {
        exts[t] = doc.getExtension( t );
      }
    }
    var defaultDataPath = Utils.getDataPath();
    do {
      var defaultDirName = Utils.createUUID();
      var defaultDirEntry = defaultDataPath.clone();
      defaultDirEntry.append( defaultDirName );
    } while ( defaultDirEntry.exists() );
    defaultDataPath.append( defaultDirName );
    return {
      encoding: "UTF-8",
      path: defaultDataPath.path,
      extensions: exts
    };
  };

  pub.getConnection = function( params ) {

    // I N I T I A L I Z A T I O N

    var path = params.path;
    var encoding = params.encoding;
    var extensions = {};
    var dataPath =
      Cc["@mozilla.org/file/local;1"]
      .createInstance( Ci.nsIFile );
    try {
      dataPath.initWithPath( path );
    } catch ( e ) {
      throw new DriverException( "DRIVER_INVALID_PATH", path );
    }
    Utils.cloneObject( params.extensions, extensions );

    // C O N N E C T I O N

    var connection = {};

    var tagListDescriptor = null;
    connection.getTagListDescriptor = function() {
      if ( !this.exists() ) {
        throw new DriverException(
          "DRIVER_DIRECTORY_NOT_FOUND", dataPath.path );
      }
      if ( !this.permits() ) {
        throw new DriverException( "DRIVER_ACCESS_DENIED", dataPath.path );
      }
      if ( !tagListDescriptor ) {
        tagListDescriptor = new Descriptor(
          dataPath,
          encoding,
          TAGS_DESCRIPTOR_FILENAME
        );
      }
      return tagListDescriptor;
    };

    var rootCategoryEntry = null;
    connection.getRootCategoryEntry = function() {
      if ( !this.exists() ) {
        throw new DriverException(
          "DRIVER_DIRECTORY_NOT_FOUND", dataPath.path );
      }
      if ( !this.permits() ) {
        throw new DriverException( "DRIVER_ACCESS_DENIED", dataPath.path );
      }
      if ( !rootCategoryEntry ) {
        rootCategoryEntry = new Entry(
          null,
          dataPath,
          encoding,
          extensions
        );
      }
      return rootCategoryEntry;
    };

    connection.exists = function() {
      return dataPath.exists() && dataPath.isDirectory();
    };

    connection.permits = function() {
      if ( !this.exists() ) {
        return false;
      }
      var result = true;
      var entry = null;
      do {
        entry = dataPath.clone();
        entry.append( Utils.createUUID() );
      } while ( entry.exists() )
      try {
        entry.create( Ci.nsIFile.DIRECTORY_TYPE, parseInt( "0755", 8 ) );
        entry.remove( true );
      } catch ( e ) {
        result = false;
      }
      return result;
    };

    connection.create = function() {
      if ( !this.exists() ) {
        try {
          dataPath.create( Ci.nsIFile.DIRECTORY_TYPE, parseInt( "0755", 8 ) );
        } catch ( e ) {
          throw new DriverException(
            "DRIVER_DIRECTORY_CREATE_ERROR", dataPath.path );
        }
      }
    };

    connection.remove = function() {
      if ( this.exists() ) {
        try {
          dataPath.remove( true );
        } catch ( e ) {
          throw new DriverException(
            "DRIVER_DIRECTORY_REMOVE_ERROR", dataPath.path );
        }
      }
    };

    return connection;

  };

  return pub;

}();
