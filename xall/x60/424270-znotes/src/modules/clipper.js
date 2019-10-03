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

const EXPORTED_SYMBOLS = ["Clipper"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};

Cu.import( "resource://znotes/utils.js", ru.akman.znotes );
Cu.import( "resource://znotes/cssutils.js", ru.akman.znotes );
Cu.import( "resource://znotes/domevents.js", ru.akman.znotes );
Cu.import( "resource://znotes/mimetypes.js", ru.akman.znotes );

var Utils = ru.akman.znotes.Utils;
var CSSUtils = ru.akman.znotes.CSSUtils;
var DOMEvents = ru.akman.znotes.DOMEvents;
var MIME = ru.akman.znotes.MIME;

var log = Utils.getLogger( "modules.clipper" );

var HTML5NS = CSSUtils.Namespaces.knowns["html"];
var DOMEventHandlers = DOMEvents.getEventHandlers();
/**
Maximum Path Length Limitation
@see http://msdn.microsoft.com/en-us/library/aa365247.aspx#maxpath
*/
var MAX_PATH = 259;

var ioService = Cc["@mozilla.org/network/io-service;1"].getService(
  Ci.nsIIOService );
var chromeService = Cc["@mozilla.org/chrome/chrome-registry;1"].getService(
  Ci.nsIChromeRegistry );
var mimeService = Cc["@mozilla.org/mime;1"].getService(
  Ci.nsIMIMEService );

// Substitution

function Substitution() {
  this.mTags = {};
}
Substitution.prototype = {
  add: function( namespaceURI, localName, substitute ) {
    this.mTags[localName] = {};
    this.mTags[localName][namespaceURI] = {
      namespaceURI: substitute.namespaceURI,
      localName: substitute.localName,
      className: substitute.className
    };
  },
  get: function( tag, flag ) {
    var result = null;
    var namespaceURI = tag.namespaceURI ? tag.namespaceURI.toLowerCase() : "";
    var localName = tag.localName.toLowerCase();
    if ( localName in this.mTags ) {
      result = {
        elementInfo: null,
        className: null
      };
      if ( namespaceURI ) {
        if ( !this.mTags[localName][namespaceURI].className && flag ) {
          this.mTags[localName][namespaceURI].className =
            localName.replace( /\:/g, "-" ) + "-" + createUUID();
        }
        result.className = this.mTags[localName][namespaceURI].className;
        result.elementInfo = {
          namespaceURI: this.mTags[localName][namespaceURI].namespaceURI,
          localName: this.mTags[localName][namespaceURI].localName
        };
      } else {
        if ( !this.mTags[localName].className && flag ) {
          this.mTags[localName].className =
            localName.replace( /\:/g, "-" ) + "-all-ns-" + createUUID();
        }
        result.className = this.mTags[localName].className;
      }
    }
    return result;
  }
}
Substitution.create = function() {
  return new Substitution();
}

// HELPERS

function createHTML5Substitutes( aSubstitution ) {
  // an article in the document
  aSubstitution.add( HTML5NS, "article", {
    namespaceURI: HTML5NS,
    localName: "div",
    className: null
  } );
  // content aside from the page content
  aSubstitution.add( HTML5NS, "aside", {
    namespaceURI: HTML5NS,
    localName: "div",
    className: null
  } );
  // additional details that the user can view or hide
  aSubstitution.add( HTML5NS, "details", {
    namespaceURI: HTML5NS,
    localName: "div",
    className: null
  } );
  // a caption for a <figure> element
  aSubstitution.add( HTML5NS, "figcaption", {
    namespaceURI: HTML5NS,
    localName: "h3",
    className: null
  } ),
  // self-contained content, like illustrations, etc.
  aSubstitution.add( HTML5NS, "figure", {
    namespaceURI: HTML5NS,
    localName: "div",
    className: null
  } );
  // a footer for the document or a section
  aSubstitution.add( HTML5NS, "footer", {
    namespaceURI: HTML5NS,
    localName: "div",
    className: null
  } );
  // header for the document or a section
  aSubstitution.add( HTML5NS, "header", {
    namespaceURI: HTML5NS,
    localName: "div",
    className: null
  } );
  // the main content of a document
  aSubstitution.add( HTML5NS, "main", {
    namespaceURI: HTML5NS,
    localName: "div",
    className: null
  } );
  // marked or highlighted text
  aSubstitution.add( HTML5NS, "mark", {
    namespaceURI: HTML5NS,
    localName: "strong",
    className: null
  } );
  // navigation links in the document
  aSubstitution.add( HTML5NS, "nav", {
    namespaceURI: HTML5NS,
    localName: "div",
    className: null
  } );
  // a section in the document
  aSubstitution.add( HTML5NS, "section", {
    namespaceURI: HTML5NS,
    localName: "div",
    className: null
  } );
  // a visible heading for a <details> element
  aSubstitution.add( HTML5NS, "summary", {
    namespaceURI: HTML5NS,
    localName: "h3",
    className: null
  } );
  // a possible line-break
  aSubstitution.add( HTML5NS, "wbr", {
    namespaceURI: HTML5NS,
    localName: "br",
    className: null
  } );
  // an example of a code in the document
  aSubstitution.add( HTML5NS, "xmp", {
    namespaceURI: HTML5NS,
    localName: "pre",
    className: null
  } );
};

function getErrorName( code ) {
  for ( var name in Cr ) {
    if ( Cr[name] === "" + code ) {
      return name;
    }
  }
  var e = new Components.Exception( "", code );
  if ( e.name ) {
    return e.name;
  }
  return "0x" + Number( code ).toString( 16 ).toUpperCase();
};

function createUUID() {
  var s = [], hexDigits = "0123456789ABCDEF";
  for ( var i = 0; i < 32; i++ ) {
    s[i] = hexDigits.substr(
      Math.floor( Math.random() * parseInt( "0x10", 16 ) ), 1 );
  }
  s[12] = "4";
  s[16] = hexDigits.substr(
    ( s[16] & parseInt( "0x3", 16 ) ) | parseInt( "0x8", 16 ), 1 );
  return s.join( "" );
};

function serializeXMLToString( dom ) {
  var result = Cc["@mozilla.org/xmlextras/xmlserializer;1"].createInstance(
    Ci.nsIDOMSerializer ).serializeToString( dom ).replace( /\r\n?/g, "\n" );
  /*
  @see http://www.w3.org/TR/2000/REC-xml-20001006#dt-xmldecl
  XMLDecl ::= '<?xml'
              S 'version'	S? '=' S?
              ( "'" VersionNum "'" | '"' VersionNum '"' )
              EncodingDecl?
              SDDecl?
              S?
              '?>'
  VersionNum ::= ( [a-zA-Z0-9_.:] | '-' )+
  EncodingDecl ::= S 'encoding' S? '=' S?
                   ( '"' EncName '"' | "'" EncName "'" )
  EncName ::= [A-Za-z] ( [A-Za-z0-9._] | '-' )*
  SDDecl ::= S 'standalone' S? '=' S?
             ( ( "'" ( 'yes' | 'no' ) "'" ) | ( '"' ( 'yes' | 'no' ) '"' ) )
  S ::= ( #x20 | #x9 | #xD | #xA )+
  */
  if ( !/^<\?xml\s+version\s?=\s?(\'([a-zA-Z0-9_.:]|-)+\'|\"([a-zA-Z0-9_.:]|-)+\")(\s+encoding\s?=\s?(\"[A-Za-z]([A-Za-z0-9._]|-)*\"|\'[A-Za-z]([A-Za-z0-9._]|-)*\'))?(\s+standalone\s?=\s?((\'(yes|no)\')|(\"(yes|no)\")))?\s?\?>/gi.test( result ) ) {
    result = '<?xml version="1.0" encoding="UTF-8"?>\n' + result;
  }
  return result;
};

function serializeHTMLToString( dom ) {
  var result, documentEncoder =
    Cc["@mozilla.org/layout/documentEncoder;1?type=text/html"]
    .createInstance( Ci.nsIDocumentEncoder );
  documentEncoder.init( dom, "text/html",
    Ci.nsIDocumentEncoder.OutputLFLineBreak |
    Ci.nsIDocumentEncoder.OutputRaw
  );
  documentEncoder.setCharset( "UTF-8" );
  result = documentEncoder.encodeToString();
  return result;
};

function getFileURI( file ) {
  var fph = ioService.getProtocolHandler( "file" ).QueryInterface(
    Ci.nsIFileProtocolHandler );
  return fph.newFileURI( file ).QueryInterface( Ci.nsIURL );
};

function resolveURL( url, href ) {
  var result, uri;
  try {
    uri = ioService.newURI( href, null, null );
    result = uri.resolve( url );
  } catch ( e ) {
    log.warn( "resolveURL()\n" + e + "\n" + url + "\n" + href );
    result = url;
  }
  return result;
};

function getURI( url ) {
  var uri;
  try {
    uri = ioService.newURI( url, null, null );
  } catch ( e ) {
    uri = ioService.newURI( "about:blank", null, null );
  }
  return uri;
};

function parseFileName( name ) {
  var index = name.lastIndexOf( "." );
  if ( index !== -1 ) {
    return {
      name: name.substring( 0, index ),
      extension: name.substring( index )
    };
  }
  return {
    name: name,
    extension: ""
  };
};

function getValidFileNameChunk( name ) {
  name = decodeURIComponent( name ).replace( /\u005C/g, "\u0000" )  // '\'
                                   .replace( /\u002F/g, "\u0000" )  // '/'
                                   .replace( /\u003A/g, "\u0000" )  // ':'
                                   .replace( /\u002A/g, "\u0000" )  // '*'
                                   .replace( /\u003F/g, "\u0000" )  // '?'
                                   .replace( /\u0022/g, "\u0000" )  // '"'
                                   .replace( /\u003C/g, "\u0000" )  // '<'
                                   .replace( /\u003E/g, "\u0000" )  // '>'
                                   .replace( /\u007C/g, "\u0000" )  // '|'
                                   // ------------------------------------
                                   .replace( /\u003D/g, "\u0000" )  // '='
                                   .replace( /\u0026/g, "\u0000" )  // '&'
                                   .replace( /\u003B/g, "\u0000" )  // ';'
                                   .replace( /\u0021/g, "\u0000" )  // '!'
                                   .replace( /\u007E/g, "\u0000" )  // '~'
                                   .replace( /\u0060/g, "\u0000" )  // '`'
                                   .replace( /\u0025/g, "\u0000" ); // '%'
  name = name.split( "\u0000" );
  return name[name.length - 1];
};

function getSuitableFileName( url, contentType, defaultType ) {
  var uri = ioService.newURI( url, null, null );
  var query, name, mime, path, ext, mime_ext, index, file_name, pattern, match;
  if ( uri.scheme.toLowerCase() === "mailbox" ) {
    mime = ( contentType ? contentType : ( defaultType ? defaultType : "" ) );
    try {
      uri.QueryInterface( Ci.nsIURL );
      name = getValidFileNameChunk( uri.fileBaseName );
      ext = getValidFileNameChunk( uri.fileExtension );
      query = uri.query.split( "&" );
      for ( var i = 0; i < query.length; i++ ) {
        index = query[i].toLowerCase().indexOf( "filename=" );
        if ( index === 0 ) {
          name = decodeURIComponent( query[i].substring( index + 9 ) );
          index = name.lastIndexOf( "." );
          if ( index === -1 ) {
            ext = "";
          } else {
            ext = name.substring( index + 1 );
            name = name.substring( 0, index );
          }
          break;
        }
      }
    } catch ( e ) {
      name = "";
      ext = "";
    }
    if ( !name.length ) {
      name = "noname_" + createUUID().toLowerCase();
    }
  } else if ( uri.scheme.toLowerCase() === "data" ) {
    path = uri.path;
    pattern = /[\;\,\!]/g;
    match = pattern.exec( path );
    index = match ? match.index : path.length;
    mime = path.substring( path.indexOf( ":" ) + 1, index );
    name = "data_" + createUUID().toLowerCase();
    ext = "";
  } else if ( uri.scheme.toLowerCase() === "about" ) {
    mime = ( contentType ? contentType : ( defaultType ? defaultType : "" ) );
    name = "noname_" + createUUID().toLowerCase();
    ext = "";
  } else if ( uri.scheme.toLowerCase() === "javascript" ) {
    mime = ( contentType ? contentType : ( defaultType ? defaultType : "" ) );
    name = "noname_" + createUUID().toLowerCase();
    ext = "";
  } else {
    mime = ( contentType ? contentType : ( defaultType ? defaultType : "" ) );
    try {
      uri.QueryInterface( Ci.nsIURL );
      name = getValidFileNameChunk( uri.fileBaseName );
      ext = getValidFileNameChunk( uri.fileExtension );
    } catch ( e ) {
      name = "";
      ext = "";
    }
    if ( !name.length ) {
      name = "noname_" + createUUID().toLowerCase();
    }
  }
  mime_ext = "";
  if ( mime.length ) {
    mime = mime.toLowerCase();
    if ( mime in MIME ) {
      mime_ext = MIME[mime];
    } else {
      try {
        mime_ext = mimeService.getPrimaryExtension( mime, null ).toLowerCase();
      } catch ( e ) {
        if ( mime.indexOf( "+xml" ) !== -1 ) {
          mime_ext = "xml";
        } else {
          log.info( "Unregistered mime type: '" + mime + "'" );
        }
      }
    }
  }
  if ( mime_ext.length ) {
    ext = mime_ext;
  }
  return {
    name: name,
    ext: ext
  };
};

function getFileEntryFromURL( url ) {
  var fph =
    ioService.getProtocolHandler( "file" )
             .QueryInterface( Ci.nsIFileProtocolHandler );
  var uri = ioService.newURI( url, null, null );
  uri = chromeService.convertChromeURL( uri );
  return fph.getFileFromURLSpec( uri.spec ).clone();
};

function createFileEntry( dir, name ) {
  var ostream =
    Cc["@mozilla.org/network/file-output-stream;1"]
    .createInstance( Ci.nsIFileOutputStream );
  var entry, prefix = "";
  do {
    entry = dir.clone();
    entry.append( prefix + name );
    prefix += "_";
  } while ( entry.exists() && !entry.isDirectory() );
  ostream.init(
    entry,
    parseInt( "0x02", 16 ) | // PR_WRONLY
    parseInt( "0x08", 16 ) | // PR_CREATE_FILE
    parseInt( "0x20", 16 ),  // PR_TRUNCATE
    parseInt( "0644", 8 ),
    0
  );
  ostream.close();
  return entry.clone();
};

function createEntriesToSaveFrame( dir, name, ext, suffix ) {
  var ostream =
    Cc["@mozilla.org/network/file-output-stream;1"]
    .createInstance( Ci.nsIFileOutputStream );
  var fileEntry, dirEntry, fileExt, prefix = "";
  fileExt = ( ext ? "." + ext : ext );
  do {
    fileEntry = dir.clone();
    fileEntry.append( prefix + name + fileExt );
    dirEntry = dir.clone();
    dirEntry.append( prefix + name + suffix );
    prefix += "_";
  } while (
    dirEntry.exists() && dirEntry.isDirectory() ||
    fileEntry.exists() && !fileEntry.isDirectory()
  );
  ostream.init(
    fileEntry,
    parseInt( "0x02", 16 ) | // PR_WRONLY
    parseInt( "0x08", 16 ) | // PR_CREATE_FILE
    parseInt( "0x20", 16 ),  // PR_TRUNCATE
    parseInt( "0644", 8 ),
    0
  );
  ostream.close();
  dirEntry.create( Ci.nsIFile.DIRECTORY_TYPE, parseInt( "0774", 8 ) );
  return {
    fileEntry: fileEntry.clone(),
    dirEntry: dirEntry.clone()
  };
};

function writeFileEntry( entry, encoding, data ) {
  var isInit = false, enc = encoding;
  var cstream =
    Cc["@mozilla.org/intl/converter-output-stream;1"]
    .createInstance( Ci.nsIConverterOutputStream );
  var ostream =
    Cc["@mozilla.org/network/file-output-stream;1"]
    .createInstance( Ci.nsIFileOutputStream );
  ostream.init(
    entry,
    // PR_WRONLY | PR_CREATE_FILE | PR_TRUNCATE
    parseInt( "0x02", 16 ) | parseInt( "0x08", 16 ) | parseInt( "0x20", 16 ),
    parseInt( "0644", 8 ),
    0
  );
  try {
    while ( !isInit ) {
      try {
        cstream.init(
          ostream,
          enc,
          0,
          Ci.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER
        );
        cstream.writeString( data );
        isInit = true;
      } catch( e ) {
        if ( enc == "UTF-8" ) {
          isInit = true;
        }
        enc = "UTF-8";
      }
    }
  } finally {
    cstream.close();
    ostream.close();
  }
};

// TODO: implementation of nsIPrompt, nsIAuthPrompt/nsIAuthPrompt2
function ChannelObserver( channel, ctx, entry, mode, perm, bufsize, listener ) {
  this.mChannel = channel;
  this.mContext = ctx;
  this.mEntry = entry;
  this.mMode = mode;
  this.mPerm = perm;
  this.mBufsize = bufsize;
  this.mListener = listener;
  this.mFileOutputStream =
    Cc["@mozilla.org/network/safe-file-output-stream;1"]
    .createInstance( Ci.nsIFileOutputStream );
  this.mBufferedOutputStream =
    Cc["@mozilla.org/network/buffered-output-stream;1"]
    .createInstance( Ci.nsIBufferedOutputStream );
};
ChannelObserver.prototype = {
  QueryInterface: function( iid ) {
    if ( iid.equals( Components.interfaces.nsISupports ) ||
         iid.equals( Components.interfaces.nsIRequestObserver ) ||
         iid.equals( Components.interfaces.nsIStreamListener ) ||
         iid.equals( Components.interfaces.nsIInterfaceRequestor ) ||
         iid.equals( Components.interfaces.nsIProgressEventSink ) ||
         iid.equals( Components.interfaces.nsIChannelEventSink ) ) {
      return this;
    }
    throw Cr.NS_ERROR_NO_INTERFACE;
  },
  // nsIRequestObserver
  getInterface: function( iid ) {
    if ( iid.equals( Components.interfaces.nsIProgressEventSink ) ||
         iid.equals( Components.interfaces.nsIChannelEventSink ) ||
         iid.equals( Components.interfaces.nsIRequestObserver ) ||
         iid.equals( Components.interfaces.nsIStreamListener ) ) {
      return this;
    }
    return null;
  },
  // nsIChannelEventSink
  asyncOnChannelRedirect: function( oldChannel, newChannel, flags, callback ) {
    this.mChannel = newChannel;
    this.mChannel.notificationCallbacks = this;
    this.mChannel.asyncOpen( this, this.mContext );
    callback.onRedirectVerifyCallback( Cr.NS_OK );
    if ( this.mListener && this.mListener.onChannelRedirect ) {
      this.mListener.onChannelRedirect( oldChannel, newChannel, flags );
    }
  },
  // nsIRequestObserver
  onStartRequest: function( aRequest, aContext ) {
    if ( this.mListener && this.mListener.onStartRequest ) {
      this.mListener.onStartRequest( this.mChannel, aRequest, aContext );
    }
    try {
      this.mFileOutputStream.init( this.mEntry, this.mMode, this.mPerm,
        Ci.nsIFileOutputStream.DEFER_OPEN );
      this.mBufferedOutputStream.init( this.mFileOutputStream, this.mBufsize );
    } catch ( e ) {
      log.warn( "onStartRequest()\n" + e + "\n" + this.mEntry.path );
    }
  },
  onStopRequest: function( aRequest, aContext, aStatusCode ) {
    try {
      // TODO: sometimes flush() throws exception NS_ERROR_FILE_NOT_FOUND
      this.mBufferedOutputStream.flush();
      if ( this.mFileOutputStream instanceof Ci.nsISafeOutputStream ) {
        this.mFileOutputStream.finish();
      } else {
        this.mFileOutputStream.close();
      }
    } catch ( e ) {
      log.warn( "onStopRequest()\n" + e + "\n" + this.mEntry.path );
    }
    if ( this.mListener && this.mListener.onStopRequest ) {
      this.mListener.onStopRequest( this.mChannel, aRequest, aContext,
        aStatusCode );
    }
  },
  // nsIStreamListener
  onDataAvailable: function( aRequest, aContext, aStream, aOffset, aCount ) {
    var count;
    try {
      count = aCount;
      while ( count > 0 ) {
        count -= this.mBufferedOutputStream.writeFrom( aStream, count );
      }
    } catch ( e ) {
      log.warn( "onDataAvailable()\n" + e + "\n" + this.mEntry.path );
    }
    if ( this.mListener && this.mListener.onDataAvailable ) {
      this.mListener.onDataAvailable( this.mChannel, aRequest, aContext,
        aStream, aOffset, aCount );
    }
  },
  // nsIProgressEventSink
  onProgress: function( aRequest, aContext, aProgress, aProgressMax ) {
    if ( this.mListener && this.mListener.onProgress ) {
      this.mListener.onProgress( this.mChannel, aRequest, aContext, aProgress,
        aProgressMax );
    }
  },
  onStatus: function( aRequest, aContext, aStatus, aStatusArg ) {
    if ( this.mListener && this.mListener.onStatus ) {
      this.mListener.onStatus( this.mChannel, aRequest, aContext, aStatus,
        aStatusArg );
    }
  }
};

function loadURLToFileEntry( url, referrer, ctx,
                             entry, mode, perm, bufsize, listener ) {
  var uri, status, observer, channel = null;
  try {
    uri = ioService.newURI( url, null, null );
    if ( uri.scheme.toLowerCase() === "mailbox" ) {
      uri.QueryInterface( Ci.nsIURL );
      if ( uri.query ) {
        /**
         * @see Implementation of nsIMimeEmitter in components/jsmimeemitter.js
         * @quote We need to strip our magic flags from the URL
         *
         * mailbox:///...?number=foo&header=filter&emitter=js&part=bar&filename=image.jpg
         *                           ^^^^^^^^^^^^^^^^^^^^^^^^^
         * mailbox:///...?number=foo&part=bar&filename=image.jpg
         */
        uri.query = uri.query.replace(
          /header=filter&emitter=js(&fetchCompleteMessage=false)?&?/,
          ""
        );
      }
    }
    channel = ioService.newChannelFromURI( uri );
    if ( channel ) {
      if ( uri.scheme.toLowerCase().indexOf( "http" ) === 0 &&
           channel instanceof Ci.nsIHttpChannel &&
           referrer ) {
        channel.referrer = ioService.newURI( referrer, null, null );
      }
      observer =
        new ChannelObserver( channel, ctx, entry, mode, perm, bufsize, listener );
      channel.notificationCallbacks = observer;
      channel.asyncOpen( observer, ctx );
    }
  } catch ( e ) {
    if ( e.name && ( e.name in Cr ) ) {
      status = Cr[e.name];
    } else {
      status = Cr.NS_ERROR_UNEXPECTED;
    }
    if ( listener && listener.onStopRequest ) {
      listener.onStopRequest( channel, null, ctx, status );
    }
  }
};

function parsePrefixAttribute( value ) {
  var prefix, uri;
  var result = {};
  var chunks = value.split( /\s+/ );
  for ( var i = 1; i < chunks.length; i += 2 ) {
    prefix = chunks[i - 1];
    uri = chunks[i];
    if ( prefix.length > 1 && prefix[prefix.length - 1] === ":" &&
         uri.length ) {
      prefix = prefix.substring( 0, prefix.length - 1 );
      result[prefix] = uri;
    }
  }
  return Object.keys( result ).length ? result : null;
};

function collectElementNamespaces( anElement, aNamespaces ) {
  var uri, prefix, prefixies = null;
  for ( var name, i = anElement.attributes.length - 1; i >= 0; i-- ) {
    name = anElement.attributes[i].name.toLowerCase();
    if ( name === "xmlns" ) {
      aNamespaces.set( anElement.attributes[i].value );
    } else if ( name.indexOf( "xmlns:" ) === 0 ) {
      aNamespaces.set( anElement.attributes[i].value, name.substring( 6 ) );
    } else if ( name === "prefix" ) {
      prefixies = parsePrefixAttribute( anElement.attributes[i].value );
    }
  }
  if ( prefixies ) {
    for ( prefix in prefixies ) {
      uri = prefixies[prefix];
      anElement.setAttribute( "xmlns:" + prefix, uri );
      aNamespaces.set( uri, prefix );
    }
  }
};

// CSS

function splitNodeName( nodeName ) {
  var index = -1;
  do {
    index = nodeName.indexOf( ":", index + 1 );
  } while ( index > 0 && nodeName.charAt( index - 1) === "\\" );
  if ( index !== -1 ) {
    return [ nodeName.substring( 0, index ), nodeName.substring( index ) ];
  }
  return [ nodeName, "" ];
};

function inspectRule( aSubstitution, aGlobalNamespaces, aLocalNamespaces,
                      aRule, aSheetURL, aGroupId, aDirectory, aLoader,
                      aFlags, aCallback, aLines, anIndex ) {
  var selectors, selector, substitute, prefix, ns, flag = false;
  var selectorText = aRule.selectorText ? aRule.selectorText : "";
  var cssText = aRule.cssText;
  var index = selectorText ? cssText.indexOf( selectorText ) : -1;
  if ( index !== -1 ) {
    cssText = cssText.substr( index + selectorText.length );
  }
  cssText = cssText.replace( /url\s*\(\s*(['"]?)(\S+)\1\s*\)/img,
    function( s0, s1, s2 ) {
      var anURL = resolveURL( s2, aSheetURL );
      switch( getURI( anURL ).scheme.toLowerCase() ) {
        case "about":
          break;
        case "data":
          if ( !( aFlags & 0x00100000 /* SAVE_INLINE_RESOURCES_IN_SEPARATE_FILES */ ) ) {
            break;
          }
        default:
          addJobObserver(
            aLoader.createJob( aDirectory, anURL, aSheetURL, "" /* contentType */,
                               aGroupId ),
            aCallback,
            aLines,
            anIndex
          );
      }
      return "url(" + anURL + ")";
    }
  );
  if ( selectorText ) {
    try {
      selectors = CSSUtils.parseSelectors( selectorText, aLocalNamespaces );
      selectorText = selectors.serialize( function( production ) {
        var ns;
        switch( production.name.toLowerCase() ) {
          case "tag":
            substitute = aSubstitution.get(
              {
                localName: production.localName,
                namespaceURI: production.namespaceURI
              },
              true /* create className */
            );
            if ( substitute && substitute.className ) {
              return "." + substitute.className;
            }
            // no break
          case "universal":
          case "attr":
            if (
              // no global namespaces
              !aGlobalNamespaces ||
              // all namespaces
              production.prefix === "*" ||
              // attr is not in namespace
              production.namespaceURI === null ) {
              break;
            }
            ns = {
              uri: production.namespaceURI,
              prefix: null
            };
            if ( aGlobalNamespaces.lookupURI( ns ) ) {
              return ( ns.prefix !== null ? ns.prefix + "|" : "" ) +
                     production.get( "localNameSource" );
            } else {
              // At this point namespaceURI MUST be defined!
              // Otherwise it is a syntax error in style sheet i.e.,
              // used the namespace prefix defined in none at-namespace-rule.
              log.warn( "inspectRule()\nUnknown namespaceURI: " +
                production.namespaceURI + "\n" + selectorText );
            }
            break;
        }
        return null;
      } );
    } catch ( e ) {
      log.warn( "inspectRule()\n" + e + "\n" + selectorText );
    }
  }
  cssText =
    ( selectorText + cssText ).replace( /([^\{\}])(\r|\n|\r\n)/g, "$1" );
  return cssText;
};

function processRule( aRule, aRules, aSubstitution, aDocument, aGroupId,
  aDirectory, aLoader, aFlags ) {
  var sheet, url, matchMedia, matchSupports, matchDocument;
  var aFileName, filePrefix, sheetFile, cssIndex, cssText;
  var globalNamespaces, localNamespaces;
  var aSheet = aRule.parentStyleSheet;
  var aSheetURL = resolveSheetURL( aDocument, aSheet );
  globalNamespaces = aRules.namespaces;
  // get current sheet from aRules
  for ( var i = 0; i < aRules.sheets.length; i++ ) {
    sheet = aRules.sheets[i];
    if ( sheet.sheet === aSheet ) {
      break;
    }
  }
  localNamespaces = sheet.namespaces;
  /**
  @see https://developer.mozilla.org/en-US/docs/Web/API/CSSRule
  */
  switch ( aRule.type ) {
    case Ci.nsIDOMCSSRule.STYLE_RULE:
      if ( aRule.cssText ) {
        cssIndex = sheet.lines.length;
        cssText = inspectRule( aSubstitution, null /* globalNamespaces */,
          localNamespaces, aRule, aSheetURL, aGroupId, aDirectory, aLoader,
          aFlags,
          function( job, lines, index ) {
            if ( job.getStatus() ) {
              return;
            }
            lines[index] = lines[index].replace(
              job.getURL(),
              encodeURI( job.getEntry().leafName ),
              "g"
            );
          },
          sheet.lines,
          cssIndex
        );
        sheet.lines.push( cssText );
      }
      break;
    case Ci.nsIDOMCSSRule.FONT_FACE_RULE:
    case Ci.nsIDOMCSSRule.KEYFRAME_RULE:
      if ( aRule.cssText ) {
        cssIndex = sheet.lines.length;
        cssText = inspectRule( aSubstitution, null /* globalNamespaces */,
          localNamespaces, aRule, aSheetURL, aGroupId, aDirectory, aLoader,
          aFlags,
          function( job, lines, index ) {
            if ( job.getStatus() ) {
              return;
            }
            lines[index] = lines[index].replace(
              job.getURL(),
              encodeURI( job.getEntry().leafName ),
              "g"
            );
          },
          sheet.lines,
          cssIndex
        );
        sheet.lines.push( cssText );
      }
      break;
    case Ci.nsIDOMCSSRule.IMPORT_RULE:
      /**
      The @import CSS at-rule allows to import style rules from other style
      sheets. These rules must precede all other types of rules, except
      @charset rules; as it is not a nested statement, it cannot be used
      inside conditional group at-rules.
      @import url;
      @import url list-of-media-queries;
      Example:
      @import url("fineprint.css") print;
      @import url("bluish.css") projection, tv;
      @import 'custom.css';
      @import url("chrome://communicator/skin/");
      @import "common.css" screen, projection;
      @import url('landscape.css') screen and (orientation:landscape);
      Where relative url are used, they’re interpreted as being relative
      to the importing style sheet.
      */
      matchMedia = true;
      if ( aFlags & 0x10000000 /* SAVE_ACTIVE_RULES_ONLY */ ) {
        if ( aDocument.defaultView &&
             aRule.media && aRule.media.mediaText ) {
          matchMedia = aDocument.defaultView.matchMedia( aRule.media.mediaText );
          matchMedia = matchMedia && matchMedia.matches;
        }
      }
      if ( matchMedia && aRule.styleSheet ) {
        aFileName = null;
        if ( !( aFlags & 0x01000000 /* INLINE_STYLESHEETS_IN_DOCUMENT */ ) ) {
          url = aRule.styleSheet.href.toLowerCase();
          if ( url in aRules.urls ) {
            aFileName = aRules.urls[url].fileName;
          } else {
            aFileName = getSuitableFileName( aRule.styleSheet.href,
              aRule.styleSheet.type );
            filePrefix = "";
            do {
              sheetFile = aDirectory.clone();
              sheetFile.append( filePrefix +
                aFileName.name + "." + aFileName.ext );
              filePrefix += "_";
            } while ( sheetFile.exists() && !sheetFile.isDirectory() );
            writeFileEntry( sheetFile, "utf-8", "" );
            aFileName = sheetFile.leafName;
            aRules.urls[url] = {
              fileName: aFileName,
              isDone: false
            };
          }
          cssText = '@import url( "' + aFileName + '" )';
          if ( !( aFlags & 0x10000000 /* SAVE_ACTIVE_RULES_ONLY */ ) &&
            aRule.media && aRule.media.mediaText ) {
            cssText += " " + aRule.media.mediaText;
          }
          sheet.lines.push( cssText + ";" );
        }
        processStyleSheet( aRules, aSubstitution, aDocument, sheet,
          aRule.styleSheet, true /* isImport */, aFileName,
          aGroupId, aDirectory, aLoader, aFlags );
      }
      break;
    case Ci.nsIDOMCSSRule.SUPPORTS_RULE:
      /**
      Gecko 22 and Gecko 21 supported this feature only if the user enables
      it by setting the config value layout.css.supports-rule.enabled to true
      @supports not ( display: flex ) {
        body { width: 100%; height: 100%; background: white; color: black; }
        #navigation { width: 25%; }
        #article { width: 75%; }
      }
      The CSSOM class CSSSupportsRule, and the CSS.supports method
      allows to perform the same check via JavaScript
      The supports() methods returns a Boolean value indicating
      if the browser supports a given CSS feature, or not
      boolValue = CSS.supports( propertyName, value );
      boolValue = CSS.supports( supportCondition );
      */
      matchSupports = true;
      if ( aFlags & 0x10000000 /* SAVE_ACTIVE_RULES_ONLY */ ) {
        matchSupports = aRule.supports( aRule.conditionText );
      } else {
        sheet.lines.push( "@supports " + aRule.conditionText + " {" );
      }
      if ( matchSupports ) {
        for ( var j = 0; j < aRule.cssRules.length; j++ ) {
          processRule( aRule.cssRules[j], aRules, aSubstitution, aDocument,
            aGroupId, aDirectory, aLoader, aFlags );
        }
      }
      if ( !( aFlags & 0x10000000 /* SAVE_ACTIVE_RULES_ONLY */ ) ) {
        sheet.lines.push( "}" );
      }
      break;
    case Ci.nsIDOMCSSRule.MEDIA_RULE:
      /**
      The @media CSS at-rule associates a set of nested statements, in
      a CSS block, that is delimited by curly braces, with a condition
      defined by a media query. The @media at-rule may be used not only at
      the top level of a CSS, but also inside any CSS conditional-group
      at-rule.
      @media <media types> {
        media-specific rules
      }
      Firefox currently only implements the print and screen media types.
      interface CSSMediaRule {
        readonly attribute MediaList media;
        attribute DOMString conditionText;
        readonly attribute CSSRuleList cssRules;
      }
      */
      matchMedia = true;
      if ( aDocument.defaultView &&
           ( aFlags & 0x10000000 /* SAVE_ACTIVE_RULES_ONLY */ ) ) {
        matchMedia = aDocument.defaultView.matchMedia( aRule.conditionText );
        matchMedia = matchMedia && matchMedia.matches;
      } else {
        // aRule.media.mediaText === aRule.conditionText
        sheet.lines.push( "@media " + aRule.conditionText + " {" );
      }
      if ( matchMedia ) {
        for ( var j = 0; j < aRule.cssRules.length; j++ ) {
          processRule( aRule.cssRules[j], aRules, aSubstitution, aDocument,
            aGroupId, aDirectory, aLoader, aFlags );
        }
      }
      if ( !( aFlags & 0x10000000 /* SAVE_ACTIVE_RULES_ONLY */ ) ) {
        sheet.lines.push( "}" );
      }
      break;
    case Ci.nsIDOMCSSRule.DOCUMENT_RULE:
      /**
      CSS4 ( deferred )
      The @document rule is an at-rule that restricts the style rules
      contained within it based on the URL of the document.
      It is designed primarily for user style sheets.
      A @document rule can specify one or more matching functions.
      If any of the functions apply to a URL, the rule will take effect
      on that URL.
      The main use case is for user-defined stylesheets,
      though this at-rule can be used on author-defined stylesheets too.
      The functions available are:

      url(), which matches an exact URL
      url-prefix(), which matches if the document URL starts with
                    the value provided
      domain(), which matches if the document URL is on the domain
                provided (or a subdomain of it)
      regexp(), which matches if the document URL is matched by
                the regular expression provided. The expression must match
                the entire URL.

      The values provided to the url(), url-prefix(), and domain()
      functions can optionally be enclosed by single or double quotes.
      The values provided to the regexp() function must be enclosed in quotes.

      Escaped values provided to the regexp() function must additionally
      escaped from the CSS. For example, a . (period) matches any character
      in regular expressions. To match a literal period, you would first
      need to escape it using regular expression rules (to \.),
      then escape that string using CSS rules (to \\.).
      @document url(http://www.w3.org/),
                     url-prefix(http://www.w3.org/Style/),
                     domain(mozilla.org),
                     regexp("https:.*")
      {
        CSS rules here apply to:
        + The page "http://www.w3.org/".
        + Any page whose URL begins with "http://www.w3.org/Style/"
        + Any page whose URL's host is "mozilla.org" or ends with
          ".mozilla.org"
        + Any page whose URL starts with "https:"
      }
      */
      if ( aRule.cssText ) {
        sheet.lines.push( aRule.cssText );
      }
      break;
      // TODO: implementation of matchDocument() CSS4 feature
      matchDocument = true;
      if ( aDocument.defaultView &&
           ( aFlags & 0x10000000 /* SAVE_ACTIVE_RULES_ONLY */ ) ) {
        // matchDocument = aDocument.defaultView.matchDocument( aRule.???? );
      } else {
        // sheet.lines.push( "@document " + aRule.conditionText + " {" );
      }
      if ( matchDocument ) {
        for ( var j = 0; j < aRule.cssRules.length; j++ ) {
          processRule( aRule.cssRules[j], aRules, aSubstitution, aDocument,
            aGroupId, aDirectory, aLoader, aFlags );
        }
      }
      if ( !( aFlags & 0x10000000 /* SAVE_ACTIVE_RULES_ONLY */ ) ) {
        // sheet.lines.push( "}" );
      }
      break;
    case Ci.nsIDOMCSSRule.NAMESPACE_RULE:
      /**
      Any @namespace rules must follow all @charset and @import rules and
      precede all other non-ignored at-rules and style rules in a style sheet.

      The @namespace rule is an at-rule that defines the XML namespaces
      that will be used in the style sheet. The namespaces defined can be used
      to restrict the universal, type, and attribute selectors to only select
      elements under that namespace. The @namespace rule is generally only
      useful when dealing with an XML document containing multiple
      namespaces - for example, an XHTML document with SVG embedded.
      @namespace url(http://www.w3.org/1999/xhtml);
      @namespace svg url(http://www.w3.org/2000/svg);
      This matches all XHTML <a> elements, as XHTML is the default namespace
      a {}
      This matches all SVG <a> elements
      svg|a {}
      This matches both XHTML and SVG <a> elements
      *|a {}
      interface CSSNamespaceRule : CSSRule {
        readonly attribute DOMString namespaceURI;
        readonly attribute DOMString? prefix;
      };
      */
      sheet.lines.push( aRule.cssText );
      break;
    case Ci.nsIDOMCSSRule.CHARSET_RULE:
      /**
      The @charset CSS at-rule specifies the character encoding used in the
      style sheet. It must be the first element in the style sheet and not
      be preceded by any character; as it is not a nested statement,
      it cannot be used inside conditional group at-rules.
      If several @charset at-rules are defined, only the first one is used,
      and it cannot be used inside a style attribute on an HTML element
      or inside the <style> element where the character set of the HTML page
      is relevant.
      @charset charset;
      Set the encoding of the style sheet to Unicode UTF-8
      @charset "UTF-8";
      */
      // skip, always utf-8
      break;
    case Ci.nsIDOMCSSRule.KEYFRAMES_RULE:
      /**
        Describes the aspect of intermediate steps in a CSS animation sequence
        interface CSSKeyframesRule {
          attribute DOMString name;
          readonly attribute CSSRuleList cssRules;
        };
        To use keyframes, you create a @keyframes rule with a name that is
        then used by the animation-name property to match an animation to
        its keyframe list. Each @keyframes rule contains a style list of
        keyframe selectors, each of which is comprised of a percentage
        along the animation at which the keyframe occurs as well as
        a block containing the style information for that keyframe.
        @keyframes <identifier> {
          [ [ from | to | <percentage> ] [, from | to | <percentage> ]* block ]*
        }
        @keyframes animation_name {
          0% { top: 0; left: 0; }
          30% { top: 50px; }
          68%, 72% { left: 50px; }
          100% { top: 100px; left: 100%; }
        }
      */
      sheet.lines.push( "@keyframes " + aRule.name + " {" );
      for ( var j = 0; j < aRule.cssRules.length; j++ ) {
        processRule( aRule.cssRules[j], aRules, aSubstitution, aDocument,
          aGroupId, aDirectory, aLoader, aFlags );
      }
      sheet.lines.push( "}" );
      break;
    case Ci.nsIDOMCSSRule.PAGE_RULE:
      /**
        interface CSSPageRule {
          attribute DOMString selectorText;
          readonly attribute CSSStyleDeclaration style;
        };
        The @page CSS at-rule is used to modify some CSS properties when
        printing a document. You can't change all CSS properties with @page.
        You can only change the margins, orphans, widows, and page breaks
        of the document. Attempts to change any other CSS properties
        will be ignored.
        @page :pseudo-class {
          margin: 2in;
        }
      */
      if ( aRule.cssText ) {
        sheet.lines.push( aRule.cssText );
      }
      break;
    case Ci.nsIDOMCSSRule.REGION_STYLE_RULE:
      /**
      @see http://www.w3.org/TR/css3-regions/
      */
      if ( aRule.cssText ) {
        sheet.lines.push( aRule.cssText );
      }
      break;
    case Ci.nsIDOMCSSRule.VIEWPORT_RULE:
      /**
      @see http://www.w3.org/TR/css-device-adapt/
      */
      if ( aRule.cssText ) {
        sheet.lines.push( aRule.cssText );
      }
      break;
    case Ci.nsIDOMCSSRule.COUNTER_STYLE_RULE:
      /**
      @see http://www.w3.org/TR/css-counter-styles-3/
      */
      if ( aRule.cssText ) {
        sheet.lines.push( aRule.cssText );
      }
      break;
    case Ci.nsIDOMCSSRule.FONT_FEATURE_VALUES_RULE:
      /**
      @see http://www.w3.org/TR/css-fonts-3/
      */
      if ( aRule.cssText ) {
        sheet.lines.push( aRule.cssText );
      }
      break;
    case Ci.nsIDOMCSSRule.UNKNOWN_RULE:
    default:
      if ( aRule.cssText ) {
        sheet.lines.push( aRule.cssText );
      }
      break;
  }
};

function resolveSheetURL( aDocument, aSheet ) {
  var result = aSheet.href;
  while ( !result ) {
    if ( aSheet.parentStyleSheet ) {
      aSheet = aSheet.parentStyleSheet;
      result = aSheet.href;
    } else {
      result = aDocument.baseURI;
    }
  }
  return result;
};

function collectSheetNamespaces( aNamespaces, aSheet ) {
  var info, rule;
  for ( var i = 0; i < aSheet.cssRules.length; i++ ) {
    rule = aSheet.cssRules[i];
    if ( rule.type === Ci.nsIDOMCSSRule.NAMESPACE_RULE ) {
      try {
        info = CSSUtils.parseNamespaceRule( rule.cssText );
        aNamespaces.set( info.namespaceURI, info.prefix );
      } catch ( e ) {
        log.warn( "collectSheetNamespaces()\n" + e + "\n" + rule.cssText );
      }
    }
  }
};

function processStyleSheet( aRules, aSubstitution, aDocument, aParentSheet,
  aSheet, isImport, aFileName, aGroupId, aDirectory, aLoader, aFlags ) {
  var sheet, namespaces, matchMedia;
  var headNode, ownerNode, ownerName, ownerType;
  var parentSheetIndex, relList;
  namespaces = CSSUtils.Namespaces.create(
    aDocument.documentElement.namespaceURI );
  collectSheetNamespaces( namespaces, aSheet );
  if ( !aRules.namespaces ) {
    aRules.namespaces = namespaces.clone();
  } else {
    aRules.namespaces.mixin( namespaces );
  }
  try {
    headNode = aDocument.head;
  } catch ( e ) {
    headNode = null;
  }
  ownerNode = aSheet.ownerNode;
  ownerName = null;
  ownerType = null;
  relList = [];
  if ( ownerNode ) {
    ownerType = ownerNode.nodeType;
    if ( ownerType === Ci.nsIDOMNode.PROCESSING_INSTRUCTION_NODE ) {
      ownerName = ownerNode.target.toLowerCase();
      relList = [ "stylesheet" ];
      if ( ownerNode.data.match( /\s*alternate\s*=\s*('yes'|"yes")\s*/gm ) ) {
        relList.unshift( "alternate" );
      }
    } else {
      ownerName = ownerNode.nodeName.toLowerCase();
      if ( ownerName === "link" && ownerNode.hasAttribute( "rel" ) ) {
        relList = ownerNode.getAttribute( "rel" ).toLowerCase().split( /\s+/ );
      }
    }
  }
  sheet = {
    sheet: aSheet,
    parent: aParentSheet,
    isImport: isImport,
    fileName: aFileName,
    type: aSheet.type,
    title: aSheet.title,
    disabled: aSheet.disabled,
    nodeId: ownerNode ? createUUID() : null,
    nodeName: ownerName,
    nodeType: ownerType,
    scoped: ownerName === "style" && ownerNode.hasAttribute( "scoped" ),
    media: aSheet.media,
    href: aSheet.href,
    hrefLang: ownerName === "link" ? ownerNode.getAttribute( "hreflang" ) : null,
    relList: relList,
    namespaces: namespaces,
    lines: []
  };
  if ( sheet.nodeId ) {
    if ( sheet.nodeType === Ci.nsIDOMNode.PROCESSING_INSTRUCTION_NODE ) {
      node = aDocument.createProcessingInstruction( "xml-data", sheet.nodeId );
    } else {
      if ( !aRules.id && !sheet.scoped &&
        headNode && headNode.contains( ownerNode ) ) {
        aRules.id = createUUID();
        node = aDocument.createElementNS(
          aDocument.documentElement.namespaceURI, "div" );
        node.classList.add( "stub_" + aRules.id );
        ownerNode.parentNode.insertBefore( node, ownerNode );
      }
      node = aDocument.createElementNS( aDocument.documentElement.namespaceURI,
        "div" );
      node.classList.add( "node_" + sheet.nodeId );
    }
    ownerNode.parentNode.insertBefore( node, ownerNode );
  }
  parentSheetIndex = aParentSheet ? aRules.sheets.indexOf( aParentSheet ) : -1;
  if ( parentSheetIndex === -1 ) {
    aRules.sheets.push( sheet );
  } else {
    aRules.sheets.splice( parentSheetIndex, 0, sheet );
  }
  for ( var i = 0; i < aSheet.cssRules.length; i++ ) {
    processRule( aSheet.cssRules[i], aRules, aSubstitution, aDocument,
      aGroupId, aDirectory, aLoader, aFlags );
  }
};

function collectStyles( aRules, aSubstitution, aDocument, aGroupId, aDirectory,
  aLoader, aFlags ) {
  var aSheet, aFileName, matchMedia, sheetFile, filePrefix, url;
  for ( var i = 0; i < aDocument.styleSheets.length; i++ ) {
    aSheet = aDocument.styleSheets[i];
    if ( aSheet ) {
      matchMedia = true;
      if ( aFlags & 0x10000000 /* SAVE_ACTIVE_RULES_ONLY */ ) {
        if ( aSheet.disabled ) {
          matchMedia = false;
        } else if ( aDocument.defaultView &&
          aSheet.media && aSheet.media.mediaText ) {
          matchMedia = aDocument.defaultView.matchMedia(
            aSheet.media.mediaText );
          matchMedia = matchMedia && matchMedia.matches;
        }
      }
      if ( matchMedia ) {
        aFileName = null;
        if ( !( aFlags & 0x01000000 /* INLINE_STYLESHEETS_IN_DOCUMENT */ ) &&
          aSheet.href ) {
          url = aSheet.href.toLowerCase();
          if ( url in aRules.urls ) {
            aFileName = aRules.urls[url].fileName;
          } else {
            aFileName = getSuitableFileName( aSheet.href, aSheet.type );
            filePrefix = "";
            do {
              sheetFile = aDirectory.clone();
              sheetFile.append( filePrefix +
                aFileName.name + "." + aFileName.ext );
              filePrefix += "_";
            } while ( sheetFile.exists() && !sheetFile.isDirectory() );
            writeFileEntry( sheetFile, "utf-8", "" );
            aFileName = sheetFile.leafName;
            aRules.urls[url] = {
              fileName: aFileName,
              isDone: false
            };
          }
        }
        processStyleSheet( aRules, aSubstitution, aDocument,
        null /* aParentSheet */, aSheet, false /* isImport */, aFileName,
        aGroupId, aDirectory, aLoader, aFlags );
      }
    }
  }
};

// DOM

function isDocumentHTML5( aDocument ) {
  if ( aDocument.doctype === null ) {
    return false;
  }
  var doctype = '<!DOCTYPE ' + aDocument.doctype.name;
  if ( aDocument.doctype.publicId ) {
    doctype += ' PUBLIC "' + aDocument.doctype.publicId + '"';
  }
  if ( !aDocument.doctype.publicId && aDocument.doctype.systemId ) {
    doctype += ' SYSTEM';
  }
  if ( aDocument.doctype.systemId ) {
    doctype += ' "' + aDocument.doctype.systemId + '"';
  }
  doctype += '>';
  return doctype === '<!DOCTYPE html>' ||
         doctype === '<!DOCTYPE html SYSTEM "about:legacy-compat">';
};

function setElementAttribute( anElement, aName, aValue ) {
  try {
    anElement.setAttribute( aName, aValue );
  } catch ( e ) {
    // Successful assignment to OBJECT.DATA or EMBED.SRC throws exception
  }
};

function replaceAttribute( element, attr, prefix, localName ) {
  var name, value;
  try {
    name = attr.name;
    value = attr.value;
    element.removeAttribute( name );
    element.setAttribute(
      ( prefix ? prefix + ":" : "" ) + localName,
      value
    );
  } catch ( e ) {
    log.warn( "replaceAttribute()\n" + e + "\n" +
      element.nodeName + "." + name + ": " + value );
  }
};

function replaceElement( anElement, aSubstitute, aClassName ) {
  var node, next, element, name, value;
  if ( aSubstitute ) {
    if ( aSubstitute.namespaceURI ) {
      element = anElement.ownerDocument.createElementNS(
        aSubstitute.namespaceURI,
        aSubstitute.prefix ?
          aSubstitute.prefix + ":" + aSubstitute.localName :
          aSubstitute.localName
      );
    } else {
      element = anElement.ownerDocument.createElement(
        aSubstitute.prefix ?
          aSubstitute.prefix + ":" + aSubstitute.localName :
          aSubstitute.localName
      );
    }
    node = anElement.firstChild;
    while ( node ) {
      next = node.nextSibling;
      element.appendChild( node );
      node = next;
    }
    for ( var i = anElement.attributes.length - 1; i >= 0; i-- ) {
      name = anElement.attributes[i].name.toLowerCase();
      if ( name !== "xmlns" ||
           !aSubstitute.prefix ||
           name !== "xmlns:" + aSubstitute.prefix.toLowerCase() ) {
        value = anElement.attributes[i].value;
        setElementAttribute( element, anElement.attributes[i].name, value );
      }
    }
    anElement.parentNode.replaceChild( element, anElement );
  } else {
    element = anElement;
  }
  if ( aClassName ) {
    element.classList.add( aClassName );
  }
  return element;
};

function fixupName( aName ) {
  var result = ( new RegExp(
    "^[\:A-Z_a-z" +
    "\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF" +
    "\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF" +
    "\uFDF0-\uFFFD]" +
    "[\:A-Z_a-z" +
    "\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF" +
    "\u200C\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF" +
    "\uFDF0-\uFFFD" +
    "\-\.0-9\u00B7\u0300-\u036F\u203F-\u2040]*"
  ) ).exec( aName );
  return result ? result[0] : null;
};

function replaceElt( element, namespaceURI, prefix, localName ) {
  if ( localName ) {
    if ( element.localName !== localName ) {
      element = replaceElement( element, {
        prefix: prefix,
        localName: localName,
        namespaceURI: namespaceURI
      } );
    }
  } else {
    switch ( namespaceURI ) {
      case HTML5NS:
        element = replaceElement( element, {
          prefix: prefix,
          localName: "div",
          namespaceURI: HTML5NS
        } );
        break;
      default:
        element.parentNode.removeChild( element );
        element = null;
        break;
    }
  }
  return element;
};

function replaceAtr( element, attr, prefix, localName ) {
  if ( localName ) {
    if ( attr.localName !== localName ) {
      replaceAttribute( element, attr, prefix, localName );
    }
  } else {
    element.removeAttribute( attr.name );
  }
};

function fixupElement( anElement, aNamespaces, aFlags ) {
  var localName, prefix, namespaceURI;
  var nodeName, attrName;
  var attr, attrs = [];
  var name, value, index;
  // attributes
  for ( var i = 0; i < anElement.attributes.length; i++ ) {
    attrs.push( anElement.attributes[i] );
  }
  for ( var i = 0; i < attrs.length; i++ ) {
    attr = attrs[i];
    name = attr.name.toLowerCase();
    if ( !( aFlags & 0x00000001 /* SAVE_SCRIPTS */ ) &&
         ( name in DOMEventHandlers ) ) {
      anElement.removeAttribute( attr.name );
      continue;
    }
    attrName = attr.prefix ? attr.prefix + ":" : "";
    attrName += attr.localName;
    name = fixupName( attrName );
    if ( !name ) {
      anElement.removeAttribute( attr.name );
      continue;
    }
    if ( attr.prefix ) {
      prefix = attr.prefix;
      localName = name.substring( prefix.length + 1 )
                      .replace( /\:/g, "_" );
    } else {
      index = name.indexOf( ":" );
      if ( index < 1 ) {
        prefix = null;
        localName = name.replace( /\:/g, "_" );
      } else {
        prefix = name.substring( 0, index );
        localName = name.substring( index + 1 )
                        .replace( /\:/g, "_" );
        namespaceURI = aNamespaces.get( prefix );
        if ( !namespaceURI && ( prefix in CSSUtils.Namespaces.knowns ) ) {
          namespaceURI = CSSUtils.Namespaces.knowns[prefix];
          anElement.setAttribute( "xmlns:" + prefix, namespaceURI );
          aNamespaces.set( prefix, namespaceURI );
        }
        if ( !namespaceURI ) {
          // drop the prefix, localName becomes without the prefix now
          prefix = null;
        }
      }
    }
    replaceAtr( anElement, attr, prefix, localName );
  }
  // tag
  nodeName = anElement.prefix ? anElement.prefix + ":" : "";
  nodeName += anElement.localName;
  name = fixupName( nodeName );
  if ( !name ) {
    anElement.parentNode.removeChild( anElement );
    return null;
  }
  if ( anElement.prefix ) {
    prefix = anElement.prefix;
    localName = name.substring( prefix.length + 1 )
                    .replace( /\:/g, "_" );
    namespaceURI = anElement.namespaceURI;
  } else {
    index = name.indexOf( ":" );
    if ( index < 1 ) {
      prefix = null;
      localName = name.replace( /\:/g, "_" );
      namespaceURI = anElement.namespaceURI;
    } else {
      prefix = name.substring( 0, index );
      localName = name.substring( index + 1 )
                      .replace( /\:/g, "_" );
      namespaceURI = aNamespaces.get( prefix );
      if ( !namespaceURI && ( prefix in CSSUtils.Namespaces.knowns ) ) {
        namespaceURI = CSSUtils.Namespaces.knowns[prefix];
        aNamespaces.set( prefix, namespaceURI );
      }
      if ( !namespaceURI ) {
        // drop the prefix, localName becomes without the prefix now
        prefix = null;
        namespaceURI = anElement.namespaceURI;
      }
    }
  }
  return replaceElt( anElement, namespaceURI, prefix, localName );
};

function substituteElement( anElement, aSubstitution, aFlags ) {
  var elementInfo = null, className = null;
  var substitute = aSubstitution.get(
    {
      localName: anElement.localName,
      namespaceURI: anElement.namespaceURI
    },
    false /* create className */
  );
  if ( substitute ) {
    if ( substitute.className && ( aFlags & 0x00010000 /* SAVE_STYLES */ ) ) {
      className = substitute.className;
    }
    if ( substitute.elementInfo ) {
      elementInfo = substitute.elementInfo;
    }
  }
  if ( elementInfo || className ) {
    anElement = replaceElement( anElement, elementInfo, className );
  }
  return anElement;
};

function addJobObserver( aJob, aCallback, aLines, anIndex ) {
  var aLoader = aJob.getLoader();
  if ( aJob.isDone() ) {
    aCallback( aJob, aLines, anIndex );
  } else {
    aLoader.addObserver( {
      onJobStopped: function( anEvent ) {
        if ( anEvent.getData().job === aJob ) {
          aLoader.removeObserver( this );
          aCallback( aJob, aLines, anIndex );
        }
      }
    } );
  }
  return aJob;
};

function createLoaderJob( aLoader, aDirectory, aDocumentURL, aGroupId,
  aContentType, anURL, anElement, anAttrName, aFlags ) {
  switch( getURI( anURL ).scheme.toLowerCase() ) {
    case "about":
      break;
    case "data":
      if ( !( aFlags & 0x00100000 /* SAVE_INLINE_RESOURCES_IN_SEPARATE_FILES */ ) ) {
        setElementAttribute( anElement, anAttrName, anURL );
        break;
      }
    default:
      addJobObserver(
        aLoader.createJob( aDirectory, anURL, aDocumentURL,
          aContentType, aGroupId ),
        function( job ) {
          var entry = job.getEntry();
          var status = job.getStatus();
          if ( status ) {
            if ( entry.exists() ) {
              entry.remove( false );
            }
          } else {
            setElementAttribute( anElement, anAttrName,
              encodeURI( entry.leafName ) );
          }
        }
      );
      setElementAttribute( anElement, anAttrName, anURL );
  }
};

function inspectElement( aRules, aSubstitution, anElement, aDocumentURL,
  aBaseURL, aFrames, aGroupId, aDirectory, aLoader, aFlags, aBaseURI ) {
  var anURI, anURL, aContentType, aFrame, aDocument, aRelList, aLink;
  var aName, aValue;
  var frameEntries, fileNameObj, oldCSSText, newCSSText;
  if ( anElement.nodeType !== Ci.nsIDOMNode.ELEMENT_NODE ) {
    return anElement;
  }
  if ( !( aFlags & 0x00000001 /* SAVE_SCRIPTS */ ) && anElement.href ) {
    anURL = resolveURL( anElement.href, aBaseURL );
    try {
      anURI = ioService.newURI( anURL, null, null );
      if ( anURI.scheme.indexOf( "javascript" ) !== -1 ) {
        anElement.removeAttribute( "href" );
      }
    } catch ( e ) {
      log.warn( "inspectElement()\n" + e + "\n" + anURL );
    }
  }
  if ( anElement.namespaceURI === HTML5NS ) {
    switch ( anElement.localName.toLowerCase() ) {
      case "meta":
        if ( anElement.hasAttribute( "http-equiv" ) &&
             anElement.getAttribute( "http-equiv" )
                      .toLowerCase() === "content-type" ||
             anElement.hasAttribute( "content" ) &&
             anElement.getAttribute( "content" )
                      .toLowerCase().indexOf( "charset=" ) !== -1 ||
             anElement.hasAttribute( "charset" ) &&
             anElement.getAttribute( "charset" ).toLowerCase() !== "utf-8"
           ) {
          return anElement.parentNode.removeChild( anElement );
        }
        break;
      case "base":
        if ( aBaseURI ) {
          anElement.setAttribute( "href", aBaseURI.spec );
          return anElement;
        }
        return anElement.parentNode.removeChild( anElement );
      case "style":
        return anElement.parentNode.removeChild( anElement );
      case "script":
      case "noscript":
        if ( aFlags & 0x00000001 /* SAVE_SCRIPTS */ ) {
          if ( anElement.src ) {
            aContentType = anElement.type ? anElement.type : "text/javascript";
            anURL = resolveURL( anElement.src, aBaseURL );
            createLoaderJob( aLoader, aDirectory, aDocumentURL, aGroupId,
              aContentType, anURL, anElement, "src", aFlags );
          }
          return anElement;
        }
        return anElement.parentNode.removeChild( anElement );
      case "link":
        aContentType = anElement.type ? anElement.type.toLowerCase() : "";
        aRelList = anElement.hasAttribute( "rel" ) ?
          anElement.getAttribute( "rel" ).toLowerCase().split( /\s+/ ) : [];
        if ( aRelList.indexOf( "stylesheet" ) !== -1 ) {
          return anElement.parentNode.removeChild( anElement );
        } else if ( aRelList.indexOf( "icon" ) !== -1 ||
          aRelList.indexOf( "apple-touch-icon" ) !== -1 ||
          aRelList.indexOf( "apple-touch-icon-precomposed" ) !== -1 ) {
          if ( anElement.href ) {
            aContentType = "image/x-icon";
            anURL = resolveURL( anElement.href, aBaseURL );
            createLoaderJob( aLoader, aDirectory, aDocumentURL, aGroupId,
              aContentType, anURL, anElement, "href", aFlags );
          }
          return anElement;
        } else {
          if ( ( aRelList.indexOf( "search" ) !== -1 &&
            aContentType === "application/opensearchdescription+xml" ) ||
            ( aRelList.indexOf( "alternate" ) !== -1 && (
            aContentType === "application/rss+xml" ||
            aContentType === "application/atom+xml" ) ) ) {
            if ( anElement.href ) {
              anURL = resolveURL( anElement.href, aBaseURL );
              createLoaderJob( aLoader, aDirectory, aDocumentURL, aGroupId,
                aContentType, anURL, anElement, "href", aFlags );
            }
            return anElement;
          }
        }
        if ( anElement.href ) {
          anURL = resolveURL( anElement.href, aBaseURL );
          if ( getURI( anURL ).scheme.toLowerCase() !== "about" ) {
            setElementAttribute( anElement, "href", anURL );
          }
        }
        return anElement;
      case "img":
        if ( anElement.src ) {
          anURL = resolveURL( anElement.src, aBaseURL );
          createLoaderJob( aLoader, aDirectory, aDocumentURL, aGroupId,
            "" /* contentType */, anURL, anElement, "src", aFlags );
        }
        anElement.removeAttribute( "livesrc" );
        break;
      case "embed":
        anURL = anElement.getAttribute( "pluginspage" );
        if ( anURL ) {
          anURL = resolveURL( anURL, aBaseURL );
          if ( getURI( anURL ).scheme.toLowerCase() !== "about" ) {
            setElementAttribute( anElement, "pluginspage", anURL );
          }
        }
        anURL = anElement.getAttribute( "base" );
        if ( anURL ) {
          anURL = resolveURL( anURL, aBaseURL );
          if ( getURI( anURL ).scheme.toLowerCase() !== "about" ) {
            setElementAttribute( anElement, "base", anURL );
          }
        }
        if ( anElement.src ) {
          aContentType = anElement.type ? anElement.type : "";
          anURL = resolveURL( anElement.src, aBaseURL );
          createLoaderJob( aLoader, aDirectory, aDocumentURL, aGroupId,
            aContentType, anURL, anElement, "src", aFlags );
        }
        anElement.removeAttribute( "livesrc" );
        break;
      case "object":
        anURL = anElement.getAttribute( "codebase" );
        if ( anURL ) {
          anURL = resolveURL( anURL, aBaseURL );
          if ( getURI( anURL ).scheme.toLowerCase() !== "about" ) {
            setElementAttribute( anElement, "codebase", anURL );
          }
        }
        anURL = anElement.getAttribute( "base" );
        if ( anURL ) {
          anURL = resolveURL( anURL, aBaseURL );
          if ( getURI( anURL ).scheme.toLowerCase() !== "about" ) {
            setElementAttribute( anElement, "base", anURL );
          }
        }
        if ( anElement.data ) {
          aContentType = anElement.type ? anElement.type : "";
          anURL = resolveURL( anElement.data, aBaseURL );
          createLoaderJob( aLoader, aDirectory, aDocumentURL, aGroupId,
            aContentType, anURL, anElement, "data", aFlags );
        }
        break;
      case "param":
        if ( anElement.parentNode.nodeName.toLowerCase() === "object" ) {
          aName = anElement.getAttribute( "name" );
          switch ( aName ) {
            case "movie":
              anURL = anElement.getAttribute( "value" );
              aContentType = anElement.parentNode.type ?
                anElement.parentNode.type : "";
              anURL = resolveURL( anURL, aBaseURL );
              createLoaderJob( aLoader, aDirectory, aDocumentURL, aGroupId,
                aContentType, anURL, anElement, "value", aFlags );
              break;
            case "base":
              anURL = anElement.getAttribute( "value" );
              if ( anURL ) {
                anURL = resolveURL( anURL, aBaseURL );
                if ( getURI( anURL ).scheme.toLowerCase() !== "about" ) {
                  setElementAttribute( anElement, "value", anURL );
                }
              }
              break;
          }
        }
        break;
      case "body":
      case "table":
      case "tr":
      case "th":
      case "td":
        if ( anElement.background ) {
          anURL = resolveURL( anElement.background, aBaseURL );
          createLoaderJob( aLoader, aDirectory, aDocumentURL, aGroupId,
            "" /* contentType */, anURL, anElement, "background", aFlags );
        }
        break;
      case "input" :
        switch ( anElement.type.toLowerCase() ) {
          case "image":
            if ( anElement.src ) {
              anURL = resolveURL( anElement.src, aBaseURL );
              createLoaderJob( aLoader, aDirectory, aDocumentURL, aGroupId,
                "" /* contentType */, anURL, anElement, "src", aFlags );
            }
            break;
          case "text":
            setElementAttribute( anElement, "value", anElement.value );
            break;
          case "checkbox":
          case "radio":
            if ( anElement.checked ) {
              setElementAttribute( anElement, "checked", "checked" );
            } else {
              anElement.removeAttribute( "checked" );
            }
            break;
        }
        break;
      case "a":
      case "area":
        if ( anElement.href ) {
          anURL = resolveURL( anElement.href, aBaseURL );
          if ( getURI( anURL ).scheme.toLowerCase() !== "about" ) {
            setElementAttribute( anElement, "href", anURL );
          }
        }
        break;
      case "form":
        if ( anElement.action ) {
          anURL = resolveURL( anElement.action, aBaseURL );
          if ( getURI( anURL ).scheme.toLowerCase() !== "about" ) {
            setElementAttribute( anElement, "action", anURL );
          }
        }
        break;
      case "frame":
      case "iframe":
        if ( !( aFlags & 0x00000010 /* SAVE_FRAMES */ ) ) {
          return anElement.parentNode.removeChild( anElement );
        }
        aDocument = aFrames.shift();
        fileNameObj =
          getSuitableFileName( aDocument.documentURI, aDocument.contentType );
        if ( aFlags & 0x00000100 /* SAVE_FRAMES_IN_SEPARATE_DIRECTORY */ ) {
          frameEntries = createEntriesToSaveFrame(
            aDirectory,
            fileNameObj.name,
            fileNameObj.ext,
            "_files"
          );
        } else {
          frameEntries = {
            fileEntry: createFileEntry(
              aDirectory,
              fileNameObj.name +
              ( fileNameObj.ext ? "." + fileNameObj.ext : "" )
            ),
            dirEntry: aDirectory.clone()
          };
        }
        setElementAttribute(
          anElement,
          "src",
          encodeURI( frameEntries.fileEntry.leafName )
        );
        saveDocument(
          aDocument,
          { value: null } /* aResult */,
          frameEntries.fileEntry,
          frameEntries.dirEntry,
          aFlags,
          null /* aBaseURI */,
          aLoader
        );
        break;
    }
    anElement.removeAttribute( "_base_href" );
  }
  if ( aFlags & 0x00010000 /* SAVE_STYLES */ ) {
    if ( anElement.style && anElement.style.cssText ) {
      oldCSSText = anElement.style.cssText;
      newCSSText = inspectRule( aSubstitution, null /* globalNamespaces */,
        null /* localNamespaces */, anElement.style, aBaseURL, aGroupId,
        aDirectory, aLoader, aFlags,
        function( job ) {
          var entry = job.getEntry();
          var status = job.getStatus();
          if ( status ) {
            if ( entry.exists() ) {
              entry.remove( false );
            }
          } else {
            var cssText = anElement.style.cssText.replace(
              job.getURL(),
              encodeURI( job.getEntry().leafName ),
              "g"
            );
            anElement.style.cssText = cssText;
          }
        }
      );
      if ( oldCSSText !== newCSSText ) {
        anElement.style.cssText = newCSSText;
      }
    }
  } else {
    anElement.removeAttribute( "style" );
    anElement.removeAttribute( "class" );
  }
  return anElement;
};

function getPI( aDocument, anId ) {
  var aNode = aDocument.firstChild;
  while ( aNode ) {
    if ( aNode.nodeType === Ci.nsIDOMNode.PROCESSING_INSTRUCTION_NODE &&
      aNode.target === "xml-data" &&
      aNode.data === anId ) {
      return aNode;
    }
    aNode = aNode.nextSibling;
  }
  return null;
};

function getIndent( text ) {
  var index = -1, result = text, pattern = /(\r|\n|\r\n)/ig;
  while ( pattern.exec( result ) ) {
    index = pattern.lastIndex;
  }
  if ( index === -1 ) {
    return "";
  }
  return "\n" + result.substring( index );
};

function createStyles( aDocument, isFrame, aRules, aBaseURL, aDirectory,
  aFlags ) {
  var aStyle, anURL, aText, aData, aCSSFile, aCSSFileName, aSheet, isNewGroup;
  var aLine, aNode, aStub, aStubTextPrefix, anIndent, anIndentText;
  var aHead = aDocument.getElementsByTagName( "head" )[0];
  // clean sheet array
  for ( var i = aRules.sheets.length - 1; i >= 0 ; i-- ) {
    for ( var j = aRules.sheets[i].lines.length - 1; j >= 0 ; j-- ) {
      aLine = aRules.sheets[i].lines[j].trim();
      if ( !aLine.length ) {
        aRules.sheets[i].lines.splice( j, 1 );
      }
    }
  }
  if ( !aRules.id ) {
    aRules.id = createUUID();
    aNode = aDocument.createElementNS(
      aDocument.documentElement.namespaceURI, "div" );
    aNode.classList.add( "stub_" + aRules.id );
    aStub = aHead.lastElementChild;
    aStubTextPrefix = (
      aStub &&
      aStub.previousSibling &&
      aStub.previousSibling.nodeType === Ci.nsIDOMNode.TEXT_NODE ?
        getIndent( aStub.previousSibling.textContent ) : ""
    );
    aStub = aHead.insertBefore( aNode, aStub ? aStub.nextSibling : null );
  } else {
    aStub = aDocument.querySelector( ".stub_" + aRules.id );
    aStubTextPrefix = (
      aStub &&
      aStub.previousSibling &&
      aStub.previousSibling.nodeType === Ci.nsIDOMNode.TEXT_NODE ?
        getIndent( aStub.previousSibling.textContent ) : ""
    );
    if ( aStubTextPrefix ) {
      aNode = aStub.previousSibling;
      aStub.parentNode.insertBefore( aStub.parentNode.removeChild( aStub ),
        aNode );
    }
  }
  if ( aFlags & 0x01000000 /* INLINE_STYLESHEETS_IN_DOCUMENT */ ) {
    aNode = null;
    for ( var i = 0; i < aRules.sheets.length; i++ ) {
      aSheet = aRules.sheets[i];
      while ( aSheet.parent ) {
        aSheet = aSheet.parent;
      }
      anURL = aRules.sheets[i].href;
      if ( !aNode ) {
        isNewGroup = true;
        if ( aSheet.nodeType === Ci.nsIDOMNode.PROCESSING_INSTRUCTION_NODE ) {
          aNode = getPI( aDocument, aSheet.nodeId );
          anIndentText = aStubTextPrefix;
        } else {
          aNode = aDocument.querySelector( ".node_" + aSheet.nodeId );
          anIndent = aNode.previousSibling;
          anIndentText = ( anIndent &&
            anIndent.nodeType === Ci.nsIDOMNode.TEXT_NODE ?
              getIndent( anIndent.textContent ) : "" );
        }
      } else {
        isNewGroup = false;
      }
      if ( aRules.sheets[i].lines.length ) {
        aText = anIndentText + "  ";
        if ( anURL ) {
          aText += "/***** " + anURL + " *****/" + anIndentText + "  ";
        }
        aText += aRules.sheets[i].lines.join( anIndentText + "  " ) +
          anIndentText;
        aStyle = aDocument.createElementNS(
          aDocument.documentElement.namespaceURI, "style" );
        if ( !( aFlags & 0x10000000 /* SAVE_ACTIVE_RULES_ONLY */ ) ) {
          if ( aRules.sheets[i].media && aRules.sheets[i].media.mediaText ) {
            aStyle.setAttribute( "media", aRules.sheets[i].media.mediaText );
          }
          if ( aSheet.title ) {
            aStyle.setAttribute( "title", aSheet.title );
          }
        }
        if ( aSheet.scoped ) {
          aStyle.setAttribute( "scoped", "true" );
        }
        aStyle.textContent = aText;
        if ( aSheet.nodeType === Ci.nsIDOMNode.PROCESSING_INSTRUCTION_NODE ) {
          if ( anIndentText ) {
            aStub.parentNode.insertBefore(
              aDocument.createTextNode( anIndentText ), aStub );
          }
          aStub.parentNode.insertBefore( aStyle, aStub );
        } else {
          if ( aRules.sheets[i].parent && anIndentText && !isNewGroup ) {
            // when inserted the first style in the new parent group
            // should not insert an indent
            aNode.parentNode.insertBefore(
              aDocument.createTextNode( anIndentText ), aNode );
          }
          aNode.parentNode.insertBefore( aStyle, aNode );
        }
      }
      if ( !aRules.sheets[i].parent ) {
        aNode.parentNode.removeChild( aNode );
        aNode = null;
      }
    }
  } else /* NOT INLINE_STYLESHEETS_IN_DOCUMENT */ {
    for ( var i = 0; i < aRules.sheets.length; i++ ) {
      aNode = null;
      if ( aRules.sheets[i].nodeId ) {
        if ( aRules.sheets[i].nodeType ===
          Ci.nsIDOMNode.PROCESSING_INSTRUCTION_NODE ) {
          aNode = getPI( aDocument, aRules.sheets[i].nodeId );
        } else {
          aNode = aDocument.querySelector( ".node_" + aRules.sheets[i].nodeId );
        }
      }
      if ( !aRules.sheets[i].lines.length ) {
        if ( aNode ) {
          aNode.parentNode.removeChild( aNode );
        }
        continue;
      }
      anURL = aRules.sheets[i].href;
      if ( anURL ) {
        // link || xml-stylesheet || @import
        aText = "/***** " + anURL + " *****/\n" +
          aRules.sheets[i].lines.join( "\n" );
        aCSSFile = aDirectory.clone();
        aCSSFile.append( aRules.sheets[i].fileName );
        writeFileEntry( aCSSFile, "utf-8", aText );
        if ( !aRules.sheets[i].isImport ) {
          // link || xml-stylesheet
          if ( aRules.sheets[i].nodeType ===
            Ci.nsIDOMNode.PROCESSING_INSTRUCTION_NODE ) {
            // xml-stylesheet
            //aData = 'type="' + aRules.sheets[i].type + '" ' +
            //  'href="' + aBaseURL + aCSSFile.leafName + '"';
            //if ( !( aFlags & 0x10000000 /* SAVE_ACTIVE_RULES_ONLY */ ) ) {
            //  if ( aRules.sheets[i].title ) {
            //    aData += ' title="' + aRules.sheets[i].title + '"';
            //  }
            //  if ( aRules.sheets[i].relList.indexOf( "alternate" ) !== -1 ) {
            //    aData += ' alternate="yes"';
            //  }
            //}
            //aStyle = aDocument.createProcessingInstruction(
            //  aRules.sheets[i].nodeName, aData );
            //aNode.parentNode.insertBefore( aStyle, aNode );
            aNode.parentNode.removeChild( aNode );
            // replicate xml processing instruction `xml-stylesheet`
            // as html `link` element
            aStyle = aDocument.createElementNS(
              aDocument.documentElement.namespaceURI, "link" );
            aStyle.setAttribute( "type", aRules.sheets[i].type );
            aStyle.setAttribute( "href", aCSSFile.leafName );
            if ( aRules.sheets[i].hrefLang ) {
              aStyle.setAttribute( "hreflang", aRules.sheets[i].hrefLang );
            }
            if ( !( aFlags & 0x10000000 /* SAVE_ACTIVE_RULES_ONLY */ ) ) {
              if ( aRules.sheets[i].media && aRules.sheets[i].media.mediaText ) {
                aStyle.setAttribute( "media", aRules.sheets[i].media.mediaText );
              }
              if ( aRules.sheets[i].title ) {
                aStyle.setAttribute( "title", aRules.sheets[i].title );
              }
              aStyle.setAttribute( "rel", aRules.sheets[i].relList.join( " " ) );
            } else {
              aStyle.setAttribute( "rel", aRules.sheets[i].relList.filter(
                function( rel ) { return rel !== "alternate"; } ).join( " " ) );
            }
            if ( aStubTextPrefix ) {
              aStub.parentNode.insertBefore(
                aDocument.createTextNode( aStubTextPrefix ), aStub );
            }
            aStub.parentNode.insertBefore( aStyle, aStub );
          } else {
            // link
            aStyle = aDocument.createElementNS(
              aDocument.documentElement.namespaceURI, "link" );
            aStyle.setAttribute( "type", aRules.sheets[i].type );
            aStyle.setAttribute( "href", aCSSFile.leafName );
            if ( aRules.sheets[i].hrefLang ) {
              aStyle.setAttribute( "hreflang", aRules.sheets[i].hrefLang );
            }
            if ( !( aFlags & 0x10000000 /* SAVE_ACTIVE_RULES_ONLY */ ) ) {
              if ( aRules.sheets[i].media && aRules.sheets[i].media.mediaText ) {
                aStyle.setAttribute( "media", aRules.sheets[i].media.mediaText );
              }
              if ( aRules.sheets[i].title ) {
                aStyle.setAttribute( "title", aRules.sheets[i].title );
              }
              aStyle.setAttribute( "rel", aRules.sheets[i].relList.join( " " ) );
            } else {
              aStyle.setAttribute( "rel", aRules.sheets[i].relList.filter(
                function( rel ) { return rel !== "alternate"; } ).join( " " ) );
            }
            aNode.parentNode.insertBefore( aStyle, aNode );
            aNode.parentNode.removeChild( aNode );
          }
        }
      } else {
        // style
        anIndent = aNode.previousSibling;
        anIndentText = ( anIndent &&
          anIndent.nodeType === Ci.nsIDOMNode.TEXT_NODE ?
            getIndent( anIndent.textContent ) : "" );
        aText = anIndentText + "  " +
          aRules.sheets[i].lines.join( anIndentText + "  " ) + anIndentText;        
        aStyle = aDocument.createElementNS(
          aDocument.documentElement.namespaceURI, "style" );
        if ( !( aFlags & 0x10000000 /* SAVE_ACTIVE_RULES_ONLY */ ) ) {
          if ( aRules.sheets[i].media && aRules.sheets[i].media.mediaText ) {
            aStyle.setAttribute( "media", aRules.sheets[i].media.mediaText );
          }
          if ( aRules.sheets[i].title ) {
            aStyle.setAttribute( "title", aRules.sheets[i].title );
          }
        }
        if ( aRules.sheets[i].scoped ) {
          aStyle.setAttribute( "scoped", "true" );
        }
        aStyle.textContent = aText;
        aNode.parentNode.insertBefore( aStyle, aNode );
        aNode.parentNode.removeChild( aNode );
      }
    }
  }
  aStub.parentNode.removeChild( aStub );
};

function processNode( aRules, aSubstitution, aRoot, aNamespaces,
  aDocumentURL, aBaseURL, aFrames, aGroupId, aDirectory, aLoader, aFlags,
  aBaseURI ) {
  var aNode, aNext, anElementNamespaces;
  switch ( aRoot.nodeType ) {
    case Ci.nsIDOMNode.ELEMENT_NODE:
      anElementNamespaces = aNamespaces.clone();
      collectElementNamespaces( aRoot, anElementNamespaces );
      aRoot = fixupElement( aRoot, anElementNamespaces, aFlags );
      if ( aRoot ) {
        aRoot = substituteElement( aRoot, aSubstitution, aFlags );
        aRoot = inspectElement( aRules, aSubstitution, aRoot,
          aDocumentURL, aBaseURL, aFrames, aGroupId, aDirectory, aLoader,
          aFlags, aBaseURI );
      }
      break;
    case Ci.nsIDOMNode.COMMENT_NODE:
      aRoot.textContent = aRoot.textContent.replace( /\-\-/gm, " - - " )
                                           .replace( /^\-/gm, " - " )
                                           .replace( /\-$/gm, " - " );
      break;
    default:
      break;
  }
  if ( aRoot ) {
    aNode = aRoot.firstChild;
    while ( aNode ) {
      aNext = aNode.nextSibling;
      processNode( aRules, aSubstitution, aNode, anElementNamespaces,
        aDocumentURL, aBaseURL, aFrames, aGroupId, aDirectory, aLoader, aFlags,
        aBaseURI );
      aNode = aNext;
    }
  }
};

function collectFrames( aDocument ) {
  /*
  The following block of code does not collect all frames in a document right :(
  if ( aDocument.defaultView ) {
    frames = aDocument.defaultView.frames;
  }
  */
  var result = [], frames = aDocument.querySelectorAll( "frame, iframe" );
  for each ( var frame in frames ) {
    result.push( frame.contentDocument );
  }
  return result;
};

function doneDocument( aDocument, aResult, aRules, aBaseURL, aFile,
  aDirectory, aFlags, aBaseURI ) {
  var isFrame, aHead, aStyle, aMeta, aCollection, aBase, aBaseTarget;
  var aNode, aBaseIndentText;
  isFrame = aDocument.defaultView &&
    aDocument.defaultView.self !== aDocument.defaultView.window.top;
  var namespaceURI = aResult.documentElement.namespaceURI;
  if ( namespaceURI && namespaceURI === HTML5NS ) {
    // HEAD
    aCollection = aResult.getElementsByTagName( "head" );
    if ( !aCollection.length ) {
      aHead = aResult.createElementNS( namespaceURI, "head" );
      aResult.documentElement.insertBefore(
        aHead,
        aResult.documentElement.firstChild
      );
    } else {
      aHead = aCollection[0];
    }
    // BASE
    if ( !aBaseURI ) {
      aCollection = aDocument.getElementsByTagName( "base" );
      aBaseTarget = null;
      if ( aCollection.length ) {
        aBaseTarget = aCollection[0].hasAttribute( "target" ) ?
          aCollection[0].getAttribute( "target" ) : null;
      }
      aBase = aResult.createElementNS( namespaceURI, "base" );
      setElementAttribute( aBase, "href", aBaseURL );
      if ( aBaseTarget ) {
        setElementAttribute( aBase, "target", aBaseTarget );
      }
      aNode = aHead.firstElementChild;
      if ( aNode ) {
        if ( aNode.previousSibling &&
          aNode.previousSibling.nodeType === Ci.nsIDOMNode.TEXT_NODE ) {
          aBaseIndentText = getIndent( aNode.previousSibling.textContent );
        } else {
          aBaseIndentText = "\n";
        }
        aHead.insertBefore( aBase, aNode );
        aHead.insertBefore( aResult.createTextNode( aBaseIndentText ),
          aNode );
      } else {
        aNode = aHead.firstChild;
        aBaseIndentText = "\n";
        aHead.insertBefore( aBase, aNode );
        if ( aNode ) {
          aHead.insertBefore( aResult.createTextNode( aBaseIndentText ),
            aNode );
        }
      }
    }
    // STYLE
    if ( aFlags & 0x00010000 /* SAVE_STYLES */ ) {
      createStyles( aResult, isFrame, aRules, aBaseURL, aDirectory,
        aFlags );
    }
  }
  // WRITE
  writeDocument( aResult, aDocument.contentType, aFile );
};

function saveDocument( aDocument, aResultObj, aFile, aDirectory, aFlags,
  aBaseURI, aLoader ) {
  var aResult, aNode, aNext;
  var isFrame = aDocument.defaultView ?
    aDocument.defaultView.top !== aDocument.defaultView.self : false;
  var aBaseURL = getFileURI( aFile.parent ).getRelativeSpec(
    getFileURI( aDirectory ) );
  var aGroupId = createUUID();
  var aRules = {
    namespaces: null, // global namespaces
    sheets: [],
    urls: {},
    id: null
  };
  var aFrames = collectFrames( aDocument );
  var aNamespaces = CSSUtils.Namespaces.create();
  var aSubstitution = Substitution.create();
  if ( !( aFlags & 0x00001000 /* PRESERVE_HTML5_TAGS */ ) ) {
    createHTML5Substitutes( aSubstitution );
  }
  if ( aFlags & 0x00010000 /* SAVE_STYLES */ ) {
    collectStyles(
      aRules,
      aSubstitution,
      aDocument,
      aGroupId,
      aDirectory,
      aLoader,
      aFlags
    );
  }
  aResult = aResultObj.value = cloneDocument( aDocument );
  collectElementNamespaces( aResult.documentElement, aNamespaces );
  aNode = aResult.firstChild;
  while ( aNode ) {
    aNext = aNode.nextSibling;
    processNode(
      aRules,
      aSubstitution,
      aNode,
      aNamespaces,
      aDocument.documentURI,
      aDocument.baseURI,
      aFrames,
      aGroupId,
      aDirectory,
      aLoader,
      aFlags,
      aBaseURI
    );
    aNode = aNext;
  }
  if ( aLoader.hasGroupJobs( aGroupId ) ) {
    aLoader.addObserver( {
      onGroupStopped: function( anEvent ) {
        if ( anEvent.getData().id === aGroupId ) {
          doneDocument( aDocument, aResult, aRules, aBaseURL, aFile, aDirectory,
            aFlags, aBaseURI );
        }
      }
    } );
  } else {
    doneDocument( aDocument, aResult, aRules, aBaseURL, aFile, aDirectory,
      aFlags, aBaseURI );
  }
};

function cloneDocument( aDocument ) {
  var aResult, aNode, aTop;
  aResult = aDocument.implementation.createDocument(
    aDocument.documentElement.namespaceURI, null, null );
  while ( aResult.firstChild ) {
    aResult.removeChild( aResult.firstChild );
  }
  aNode = aDocument.firstChild;
  while ( aNode ) {
    if ( aNode.nodeType !== Ci.nsIDOMNode.PROCESSING_INSTRUCTION_NODE ||
      aNode.target.toLowerCase() !== "xml-stylesheet" ) {
      aResult.appendChild( aResult.importNode( aNode, true ) );
    }
    aNode = aNode.nextSibling;
  }
  return aResult;
};

function writeDocument( aDocument, aType, aFile ) {
  var aData = aType.indexOf( "xml" ) !== -1 ?
    serializeXMLToString( aDocument ) :
    serializeHTMLToString( aDocument );
  writeFileEntry( aFile, "utf-8", aData );
};

// CLIPPER

var Event = function( aName, aData ) {
  this.mName = aName;
  this.mData = aData;
};
Event.prototype = {
  getName: function() {
    return this.mName;
  },
  getData: function() {
    return this.mData;
  }
};

var Job = function( aLoader, aDirectory, anURL, aReferrerURL, aContentType,
                    aGroupId ) {
  this.mLoader = aLoader;
  this.mDirectory = aDirectory;
  this.mURL = anURL;
  this.mReferrerURL = aReferrerURL;
  this.mContentType = aContentType ? aContentType : "";
  this.mGroupId = aGroupId ? aGroupId : "";
  this.mId = createUUID();
  this.mEntry = this.mDirectory.clone();
  this.mEntry.append( this.mId );
  this.mStatus = -1;
  this.mStatusText = null;
  this.mActive = false;
  this.mDone = false;
  this.mDataAvailable = false;
  this.mRequest = null;
  //
  this.mCount = 0;
  this.mLog = [];
};
Job.prototype = {
  getLoader: function() {
    return this.mLoader;
  },
  getDirectory: function() {
    return this.mDirectory.clone();
  },
  getGroupId: function() {
    return this.mGroupId;
  },
  getId: function() {
    return this.mId;
  },
  getURL: function() {
    return this.mURL;
  },
  getEntry: function() {
    return this.mEntry.clone();
  },
  getStatus: function() {
    return this.mStatus;
  },
  getStatusText: function() {
    return this.mStatusText;
  },
  isActive: function() {
    return this.mActive;
  },
  isDone: function() {
    return this.mDone;
  },
  start: function() {
    if ( this.mActive ) {
      return this;
    }
    this.getLoader()._initJob( this );
    this.mActive = true;
    var self = this;
    var ctx = null;
    var entryMode = parseInt( "0x02", 16 ) | // PR_WRONLY
                    parseInt( "0x08", 16 ) | // PR_CREATE_FILE
                    parseInt( "0x20", 16 );  // PR_TRUNCATE
    var entryPermissions = parseInt( "0644", 8 );
    var bufferSize = parseInt( "0x8000", 16 );
    loadURLToFileEntry(
      this.mURL,
      this.mReferrerURL,
      ctx,
      this.mEntry,
      entryMode,
      entryPermissions,
      bufferSize,
      {
        onStartRequest: function( aChannel, aRequest, aContext ) {
          var mime, contentType, fileNameObj, len, dir, name, ext;
          try {
            mime = aChannel.contentType;
          } catch ( e ) {
            // NS_ERROR_NOT_AVAILABLE
            mime = null;
            self.mLog.push( "CHANNEL [ " + e.name + " ] contentType" );
          }
          contentType = self.mContentType;
          if ( mime && !contentType ) {
            contentType = mime;
          }
          self.mLog.push( "START [ " + ( ++self.mCount ) + " ] MIME: " +
            ( mime ? mime : "NOT AVAILABLE" ) + " :: " +
            ( contentType ? contentType : "NOT AVAILABLE" ) );
          fileNameObj = getSuitableFileName( aChannel.URI.spec, contentType );
          dir = self.getDirectory();
          len = MAX_PATH - dir.path.length - 1;
          name = fileNameObj.name;
          name = name.substring( 0, len );
          ext = fileNameObj.ext;
          ext = ext.substring( 0, len );
          if ( ext.length ) {
            len--;
          }
          if ( name.length + ext.length > len ) {
            ext = ext.substring( 0, 5 );
            name = name.substring( 0, len - ext.length );
          }
          if ( ext.length ) {
            name += "." + ext;
          }
          self.mLog.push( "DIR [ " +
            ( dir.exists() ? "EXISTS" : "NOT EXISTS" ) + " ] " + dir.path );
          self.mLog.push( "PATH [ " + ( dir.path + "/" + name ).length + " ] " +
            dir.path + "/" + name );
          try {
            self.mEntry.initWithFile( createFileEntry( dir , name ) );
          } catch ( e ) {
            self.mCount++;
            self.mLog.push( "FILE [ " + e.name + " ]" );
          }
          self.mRequest = aRequest;
          self.getLoader()._startJob( self );
        },
        onDataAvailable: function( aChannel, aRequest, aContext, aStream,
          aOffset, aCount ) {
          var contentLength;
          try {
            contentLength = aChannel.contentLength;
          } catch ( e ) {
            self.mLog.push( "CHANNEL [ " + e.name + " ] contentLength" );
            contentLength = -1;
            // NS_ERROR_NOT_AVAILABLE
          }
          self.mLog.push( "DATA [ " + aCount + " / " + aOffset + " ] LENGTH: " +
            contentLength );
          self.mDataAvailable = true;
          self.mRequest = aRequest;
          self.getLoader()._progressJob( self, aCount, contentLength, aOffset,
            contentLength );
        },
        onStopRequest: function( aChannel, aRequest, aContext, aStatusCode ) {
          var aResponseStatus = 200, aResponseStatusText = "OK";
          if ( aStatusCode ) {
            self.mLog.push( "STOP [ 0x" + aStatusCode.toString( 16 ) + " ]" );
            switch ( aStatusCode ) {
              case 0x804B000F: // NS_ERROR_IN_PROGRESS
                if ( self.mEntry.exists() ) {
                  self.mEntry.remove( false );
                }
                /*
                JOB: http://cdn.api.twitter.com/1/urls/count.json?url=http%3A%2F%2Fwww.wikihow.com%2FDownload-Google-Books&callback=twttr.receiveCount
                CHANNEL [ NS_ERROR_NOT_AVAILABLE ] contentType
                START [ 1 ] MIME: NOT AVAILABLE :: text/javascript
                DIR [ EXISTS ] C:\Users\Akman\AppData\Local\Temp\4E578C1177B44BC388E158859993B16F_files
                PATH [ 81 ] C:\Users\Akman\AppData\Local\Temp\4E578C1177B44BC388E158859993B16F_files/count.js
                STOP [ 0x804b000f ]
                CONTINUE [ NS_ERROR_IN_PROGRESS ]
                START [ 2 ] MIME: application/javascript :: text/javascript
                DIR [ EXISTS ] C:\Users\Akman\AppData\Local\Temp\4E578C1177B44BC388E158859993B16F_files
                PATH [ 81 ] C:\Users\Akman\AppData\Local\Temp\4E578C1177B44BC388E158859993B16F_files/count.js
                DATA [ 94 / 0 ] LENGTH: 117
                STOP [ OK ]
                HTTP [ DETECTED ]
                HTTP RESPONSE: 200 OK
                */
                self.mLog.push( "CONTINUE [ NS_ERROR_IN_PROGRESS ]" );
                return;
            }
          } else {
            self.mLog.push( "STOP [ OK ]" );
            if ( aChannel instanceof Ci.nsIHttpChannel ) {
              self.mLog.push( "HTTP [ DETECTED ]" );
              try {
                aResponseStatus = aChannel.responseStatus;
                aResponseStatusText = aChannel.responseStatusText.toUpperCase();
                if ( !aChannel.requestSucceeded ) {
                  aStatusCode = 0x8000FFFF; // NS_ERROR_UNEXPECTED
                }
                self.mLog.push( "HTTP RESPONSE: " +
                  aResponseStatus + " " + aResponseStatusText );
              } catch ( e ) {
                // NS_ERROR_NOT_AVAILABLE
                aResponseStatus = -1;
                self.mLog.push( "HTTP RESPONSE: [ " + e.name + " ]" );
              }
            }
          }
          if ( aResponseStatus === -1 ) {
            if ( self.mEntry.exists() ) {
              self.mEntry.remove( false );
            }
            /*
            JOB: http://cm.ipinyou.com/gdn/cms.gif?google_gid=CAESEFkaZl7MeJ9EM-7h0QOT_BU&google_cver=1&google_push=AHNF13J3mFuYuQdklNHIhT16ipU-1l99PAM7v9GK
            CHANNEL [ NS_ERROR_NOT_AVAILABLE ] contentType
            START [ 1 ] MIME: NOT AVAILABLE :: NOT AVAILABLE
            DIR [ EXISTS ] C:\Users\Akman\AppData\Local\Temp\CA05F88DEEB944108AA457DEA09DA988_files
            PATH [ 78 ] C:\Users\Akman\AppData\Local\Temp\CA05F88DEEB944108AA457DEA09DA988_files/pixel
            STOP [ OK ]
            HTTP [ DETECTED ]
            HTTP RESPONSE: [ NS_ERROR_NOT_AVAILABLE ]
            CONTINUE [ NS_ERROR_NOT_AVAILABLE ]
            START [ 2 ] MIME: image/png :: image/png
            DIR [ EXISTS ] C:\Users\Akman\AppData\Local\Temp\CA05F88DEEB944108AA457DEA09DA988_files
            PATH [ 82 ] C:\Users\Akman\AppData\Local\Temp\CA05F88DEEB944108AA457DEA09DA988_files/pixel.png
            DATA [ 170 / 0 ] LENGTH: 170
            STOP [ OK ]
            HTTP [ DETECTED ]
            HTTP RESPONSE: 200 OK
            
            JOB: http://pr.ybp.yahoo.com/sync/adx?google_gid=CAESEC9vKVAWnP107RpeXJnph4o&google_cver=1&google_push=AHNF13KMw-GF6x0kwpCw3_Rj-r06wj_B6uyKnV6EXg
            CHANNEL [ NS_ERROR_NOT_AVAILABLE ] contentType
            START [ 1 ] MIME: NOT AVAILABLE :: NOT AVAILABLE
            DIR [ EXISTS ] C:\Users\Akman\AppData\Local\Temp\F29A9FEB24B64B6B8355F81510ACB64D_files
            PATH [ 78 ] C:\Users\Akman\AppData\Local\Temp\F29A9FEB24B64B6B8355F81510ACB64D_files/pixel
            STOP [ OK ]
            HTTP [ DETECTED ]
            HTTP RESPONSE: [ NS_ERROR_NOT_AVAILABLE ]
            CONTINUE [ NS_ERROR_NOT_AVAILABLE ]
            START [ 2 ] MIME: image/png :: image/png
            DIR [ EXISTS ] C:\Users\Akman\AppData\Local\Temp\F29A9FEB24B64B6B8355F81510ACB64D_files
            PATH [ 82 ] C:\Users\Akman\AppData\Local\Temp\F29A9FEB24B64B6B8355F81510ACB64D_files/pixel.png
            DATA [ 170 / 0 ] LENGTH: 170
            STOP [ OK ]
            HTTP [ DETECTED ]
            HTTP RESPONSE: 200 OK
            */
            self.mLog.push( "CONTINUE [ NS_ERROR_NOT_AVAILABLE ]" );
            return;
          }          
          if ( !aStatusCode && !self.mDataAvailable ) {
            /*
            JOB: http://lostfilm.info/vision/button.png
            START [ 1 ] MIME: image/png :: image/png
            DIR [ EXISTS ] C:\Users\Akman\AppData\Local\Temp\CA86846A4D9F4C60894830FDB4CDC811_files
            PATH [ 83 ] C:\Users\Akman\AppData\Local\Temp\CA86846A4D9F4C60894830FDB4CDC811_files/button.png
            STOP [ OK ]
            HTTP [ DETECTED ]
            HTTP RESPONSE: 200 OK
            ERROR [ DATA NOT AVAILABLE ]
            */
            self.mLog.push( "ERROR [ DATA NOT AVAILABLE ]" );
            aStatusCode = 0x8000FFFF; // NS_ERROR_UNEXPECTED
            aResponseStatusText = "DATA NOT AVAILABLE"
            self.mCount++;
          }
          if ( self.mCount !== 1 ) {
            log.debug( "JOB: " + self.mURL + "\n" + self.mLog.join( "\n" ) );
          }
          if ( aStatusCode && self.mEntry.exists() ) {
            self.mEntry.remove( false );
          }
          self.mRequest = aRequest;
          self.stop( aStatusCode, aResponseStatusText );
        }
      }
    );
    return this;
  },
  stop: function( aStatus, aStatusText ) {
    if ( !this.mActive ) {
      return;
    }
    this.mActive = false;
    this.mDone = true;
    this.mRequest = null;
    this.mStatus = aStatus;
    this.mStatusText = ( aStatusText ? aStatusText : null );
    this.getLoader()._stopJob( this );
    return this;
  },
  abort: function() {
    if ( this.mActive ) {
      if ( this.mRequest ) {
        this.mRequest.cancel( Cr.NS_BINDING_ABORTED );
      }
      this.stop( Cr.NS_BINDING_ABORTED );
    }
    return this;
  },
  remove: function() {
    this.getLoader()._removeJob( this );
    return this;
  }
};

var Loader = function() {
  this.mLength = 0;
  this.mErrors = 0;
  this.mJobs = {};
  this.mObservers = [];
};
Loader.prototype = {
  _initJob: function( aJob ) {
    if ( !this.hasActiveJobs() ) {
      this._startLoader();
    }
    if ( !this.hasActiveGroupJobs( aJob.getGroupId() ) ) {
      this._startGroup( aJob.getGroupId() );
    }
    return aJob;
  },
  _startJob: function( aJob ) {
    this.notifyObservers( new Event( "JobStarted", {
      job: aJob
    } ) );
    return aJob;
  },
  _progressJob: function( aJob, aCurSelfProgress, aMaxSelfProgress,
                                aCurTotalProgress, aMaxTotalProgress ) {
    this.notifyObservers( new Event( "JobProgress", {
      job: aJob,
      curSelfProgress: aCurSelfProgress,
      maxSelfProgress: aMaxSelfProgress,
      curTotalProgress: aCurTotalProgress,
      maxTotalProgress: aMaxTotalProgress
    } ) );
  },
  _stopJob: function( aJob ) {
    if ( aJob.getStatus() ) {
      this.mErrors++;
    }
    this.notifyObservers( new Event( "JobStopped", {
      job: aJob
    } ) );
    if ( !this.hasActiveGroupJobs( aJob.getGroupId() ) ) {
      this._stopGroup( aJob.getGroupId() );
    }
    if ( !this.hasActiveJobs() ) {
      this._stopLoader();
    }
    return aJob;
  },
  _removeJob: function( aJob ) {
    delete this.mJobs[ aJob.getURL() ];
    this.mLength--;
    this.notifyObservers( new Event( "JobRemoved", {
      job: aJob
    } ) );
    return aJob;
  },
  _startLoader: function() {
    this.notifyObservers( new Event( "LoaderStarted", {} ) );
  },
  _stopLoader: function() {
    this.notifyObservers( new Event( "LoaderStopped", {
      count: this.getCount(),
      errors: this.getErrors(),
      status: this.getStatus()
    } ) );
  },
  _startGroup: function( groupId ) {
    this.notifyObservers( new Event( "GroupStarted", {
      id: groupId
    } ) );
  },
  _stopGroup: function( groupId ) {
    this.notifyObservers( new Event( "GroupStopped", {
      id: groupId
    } ) );
  },
  getJob: function( anURL ) {
    return ( anURL in this.mJobs ) ? this.mJobs[anURL] : null;
  },
  getJobById: function( anId ) {
    for each ( var aJob in this.mJobs ) {
      if ( anId === aJob.getId() ) {
        return aJob;
      }
    }
    return null;
  },
  createJob: function( aDirectory, anURL, aReferrerURL, aContentType,
                       aGroupId ) {
    var aJob = this.getJob( anURL );
    if ( aJob ) {
      return aJob;
    }
    aJob = new Job(
      this,
      aDirectory,
      anURL,
      aReferrerURL,
      aContentType,
      aGroupId
    );
    this.mJobs[anURL] = aJob;
    this.mLength++;
    this.notifyObservers( new Event( "JobCreated", {
      job: aJob
    } ) );
    return aJob;
  },
  getCount: function() {
    return this.mLength;
  },
  getErrors: function() {
    return this.mErrors;
  },
  getStatus: function() {
    for each ( var aJob in this.mJobs ) {
      if ( !aJob.isActive() && aJob.getStatus() ) {
        return 1;
      }
    }
    return 0;
  },
  start: function() {
    if ( this.hasJobs() ) {
      for each ( var aJob in this.mJobs ) {
        if ( !aJob.isActive() ) {
          aJob.start();
        }
      }
    } else {
      this._startLoader();
      this._stopLoader();
    }
  },
  stop: function() {
    if ( !this.hasJobs() ) {
      this._stopLoader();
    } else {
      this.abort();
    }
  },
  abort: function() {
    if ( !this.hasActiveJobs() ) {
      this.mStatus = -1;
      this._stopLoader();
    } else {
      for each ( var aJob in this.mJobs ) {
        if ( aJob.isActive() ) {
          aJob.abort();
        }
      }
    }
  },
  hasJobs: function() {
    return !!this.mLength;
  },
  hasGroupJobs: function( groupId ) {
    for each ( var aJob in this.mJobs ) {
      if ( aJob.getGroupId() === groupId ) {
        return true;
      }
    }
    return false;
  },
  hasActiveJobs: function() {
    for each ( var aJob in this.mJobs ) {
      if ( aJob.isActive() ) {
        return true;
      }
    }
    return false;
  },
  hasActiveGroupJobs: function( groupId ) {
    for each ( var aJob in this.mJobs ) {
      if ( aJob.getGroupId() === groupId && aJob.isActive() ) {
        return true;
      }
    }
    return false;
  },
  notifyObservers: function( anEvent ) {
    var observers = this.mObservers.slice( 0 );
    var name = "on" + anEvent.getName();
    for ( var i = 0; i < observers.length; i++ ) {
      if ( observers[i][ name ] ) {
        observers[i][ name ]( anEvent );
      }
    }
    return this;
  },
  addObserver: function( anObserver ) {
    if ( this.mObservers.indexOf( anObserver ) === -1 ) {
      this.mObservers.push( anObserver );
    }
    return this;
  },
  removeObserver: function( anObserver ) {
    var anIndex = this.mObservers.indexOf( anObserver );
    if ( anIndex !== -1 ) {
      this.mObservers.splice( anIndex, 1 );
    }
    return this;
  }
};

var Clipper = function() {
  this.mLoader = null;
};
Clipper.prototype = {
  save: function( aDocument, aResultObj, aFile, aDirectory, aFlags, aBaseURI,
                  anObserver ) {
    this.mLoader = new Loader();
    if ( anObserver ) {
      this.mLoader.addObserver( anObserver );
    }
    saveDocument(
      aDocument,
      aResultObj,
      aFile,
      aDirectory,
      aFlags === undefined ? 0x11010000 : aFlags,
      aBaseURI,
      this.mLoader
    );
    this.mLoader.start();
  },
  abort: function() {
    if ( this.mLoader ) {
      this.mLoader.abort();
    }
  }
};
