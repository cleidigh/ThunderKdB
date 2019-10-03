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

const EXPORTED_SYMBOLS = ["Document"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};
if ( !ru.akman.znotes.doc ) ru.akman.znotes.doc = {};
if ( !ru.akman.znotes.core ) ru.akman.znotes.core = {};

Cu.import( "resource://znotes/utils.js", ru.akman.znotes );
Cu.import( "resource://znotes/event.js", ru.akman.znotes.core );

var Document = function() {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "documents.text.document" );

  var registryObject = null;

  var DocumentException = function( message ) {
    this.name = "DocumentException";
    this.message = message;
    this.toString = function() {
      return this.name + ": " + this.message;
    }
  };

  var observers = [];

  // HELPERS

  function getErrorDocument( anURI, aBaseURI, aTitle, errorText, sourceText ) {
    var dom = pub.getBlankDocument( anURI, aBaseURI, aTitle );
    if ( errorText ) {
      dom += "\n" + errorText + "\n";
    }
    if ( sourceText ) {
      dom += "\n" + sourceText + "\n";
    }
    return dom;
  };

  function checkDocument( aDOM, anURI, aBaseURI, aTitle ) {
    return null;
  };

  function sanitizeDocument( aDOM, anURI, aBaseURI ) {
  };

  function markupDocument( aDOM ) {
    return {};
  };

  function fixupDocument( aDOM, anURI, aBaseURI, aTitle, aMarkup ) {
    return false;
  };

  // PUBLIC

  var pub = {};

  pub.getInfo = function() {
    return {
      url: "chrome://znotes_documents/content/text/",
      iconURL: "chrome://znotes_images/skin/documents/text/icon-16x16.png",
      types: {
        "text/plain": {
          extension: ".txt"
        }
      },
      // !!! DO NOT CHANGE NAME !!!
      // The name used as suffix for ids in options.xul
      name: "TEXT",
      version: "1.0",
      description: "TEXT Document",
    };
  };

  pub.getType = function() {
    return "text/plain";
  };

  pub.addObserver = function( aObserver ) {
    if ( observers.indexOf( aObserver ) < 0 ) {
      observers.push( aObserver );
    }
  };

  pub.removeObserver = function( aObserver ) {
    var index = observers.indexOf( aObserver );
    if ( index < 0 ) {
      return;
    }
    observers.splice( index, 1 );
  };

  pub.notifyObservers = function( event ) {
    for ( var i = 0; i < observers.length; i++ ) {
      if ( observers[i][ "on" + event.type ] ) {
        observers[i][ "on" + event.type ]( event );
      }
    }
  };

  pub.getId = function() {
    var info = pub.getInfo();
    return info.name + "-" + info.version;
  };

  pub.getURL = function() {
    return pub.getInfo().url;
  };

  pub.getIconURL = function() {
    return pub.getInfo().iconURL;
  };

  pub.getTypes = function() {
    return Object.keys( pub.getInfo().types );
  }

  pub.supportsType = function( aType ) {
    return ( aType in pub.getInfo().types );
  };

  pub.getExtension = function( aType ) {
    var contentType = ( aType && pub.supportsType( aType ) ) ?
      aType : pub.getType();
    return pub.getInfo().types[ contentType ].extension;
  };

  pub.getName = function() {
    return pub.getInfo().name;
  };

  pub.getVersion = function() {
    return pub.getInfo().version;
  };

  pub.getDescription = function() {
    return pub.getInfo().description;
  };

  pub.getDefaultPreferences = function() {
    return {
    };
  };

  pub.getBlankDocument = function( anURI, aBaseURI, aTitle, aCommentFlag, aParams ) {
    return "";
  };

  pub.serializeToString = function( aDOM, anURI, aBaseURI ) {
    return aDOM;
  };

  pub.parseFromString = function( aData, anURI, aBaseURI, aTitle ) {
    var tmp, err, markup;
    tmp = aData;
    err = checkDocument( tmp, anURI, aBaseURI, aTitle );
    if ( err ) {
      return { result: false, dom: err, changed: false };
    }
    markup = markupDocument( tmp );
    sanitizeDocument( tmp, anURI, aBaseURI );
    fixupDocument( tmp, anURI, aBaseURI, aTitle, markup );
    return {
      result: true,
      dom: tmp,
      changed: ( aData !== pub.serializeToString( tmp, anURI, aBaseURI ) )
    };
  };

  pub.importDocument = function( aDOM, anURI, aBaseURI, aTitle, aParams ) {

    // TODO: documentEncoder html -> text
    /*
    try {
      var documentEncoder =
        Cc["@mozilla.org/layout/documentEncoder;1?type=text/plain"]
        .createInstance( Ci.nsIDocumentEncoder );
      documentEncoder.init( aDOM, "text/plain",
        Ci.nsIDocumentEncoder.OutputLFLineBreak |
        Ci.nsIDocumentEncoder.OutputPersistNBSP |
        Ci.nsIDocumentEncoder.OutputBodyOnly |
        Ci.nsIDocumentEncoder.SkipInvisibleContent |
        Ci.nsIDocumentEncoder.OutputNoScriptContent
      );
      log.debug( documentEncoder.encodeToString() );
    } catch ( e ) {
      log.warn( e + "\n" + Utils.dumpStack() );
    }
    */

    var dom, body;
    dom = pub.getBlankDocument( anURI, aBaseURI, aTitle, false, aParams );
    try {
      body = aDOM.querySelector( "body" );
      if ( body ) {
        dom += body.textContent;
      }
    } catch ( e ) {
      log.warn( e + "\n" + Utils.dumpStack() );
    }
    return dom;
  };

  return pub;

}();
