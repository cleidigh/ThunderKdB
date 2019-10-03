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

const EXPORTED_SYMBOLS = ["DOMUtils"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};

Cu.import( "resource://znotes/utils.js", ru.akman.znotes );

var DOMUtils = function() {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "modules.domutils" );

  var pub = {};

  // NODE

  pub.isDocumentHTML5 = function( aDOM ) {
    if ( aDOM.doctype === null ) {
      return false;
    }
    var doctype = '<!DOCTYPE ' + aDOM.doctype.name;
    if ( aDOM.doctype.publicId ) {
      doctype += ' PUBLIC "' + aDOM.doctype.publicId + '"';
    }
    if ( !aDOM.doctype.publicId && aDOM.doctype.systemId ) {
      doctype += ' SYSTEM';
    }
    if ( aDOM.doctype.systemId ) {
      doctype += ' "' + aDOM.doctype.systemId + '"';
    }
    doctype += '>';
    return doctype === '<!DOCTYPE html>' ||
           doctype === '<!DOCTYPE html SYSTEM "about:legacy-compat">';
  };

  pub.serializeHTMLToString = function( aDOM, anEncoding ) {
    var documentEncoder =
      Cc["@mozilla.org/layout/documentEncoder;1?type=text/html"]
      .createInstance( Ci.nsIDocumentEncoder );
    documentEncoder.init( aDOM, "text/html", Ci.nsIDocumentEncoder.OutputRaw );
    if ( anEncoding ) {
      documentEncoder.setCharset( anEncoding );
    }
    return documentEncoder.encodeToString();
  };

  /*
  pub.serializeHTMLToString = function( aDOM ) {
    var result = "";
    var node = aDOM.firstChild;
    while ( node ) {
      switch ( node.nodeType ) {
        case Ci.nsIDOMNode.DOCUMENT_TYPE_NODE:
          result += '<!DOCTYPE ' + aDOM.doctype.name;
          if ( aDOM.doctype.publicId ) {
            result += ' PUBLIC "' + aDOM.doctype.publicId + '"';
          }
          if ( !aDOM.doctype.publicId && aDOM.doctype.systemId ) {
            result += ' SYSTEM';
          }
          if ( aDOM.doctype.systemId ) {
            result += ' "' + aDOM.doctype.systemId + '"';
          }
          result += ">\n";
          break;
        case Ci.nsIDOMNode.TEXT_NODE:
          result += node.textContent;
          break;
        case Ci.nsIDOMNode.COMMENT_NODE:
          result += "<!--" + node.textContent + "-->\n";
          break;
        case Ci.nsIDOMNode.ELEMENT_NODE:
        case Ci.nsIDOMNode.DOCUMENT_NODE:
          result += pub.getElementOuterHTML( node );
          break;
      }
      node = node.nextSibling;
    }
    return result;
  };
  */

  /*
  pub.getElementOuterHTML = function( element ) {
    var name, value;
    if ( element.nodeType !== Ci.nsIDOMNode.ELEMENT_NODE &&
         element.nodeType !== Ci.nsIDOMNode.DOCUMENT_NODE &&
         element.nodeType !== Ci.nsIDOMNode.DOCUMENT_FRAGMENT_NODE ) {
      throw Cr.NS_ERROR_UNEXPECTED;
    }
    var result = '<' + element.nodeName.toLowerCase();
    for ( var i = element.attributes.length - 1; i >= 0; i-- ) {
      name = element.attributes[i].name;
      value = element.attributes[i].value;
      result += ' ' + name + '="' + value + '"';
    }
    result += '>\n';
    result += element.innerHTML;
    result += '\n</' + element.nodeName.toLowerCase() + '>\n';
    return result;
  };
  */

  pub.getNodeIndexInParent = function( aNode ) {
    var result = 0;
    var node = aNode.previousSibling;
    while ( node ) {
      node = node.previousSibling;
      result++;
    }
    return result;
  };

  pub.isElementDescendantOf = function( element, name ) {
    var nodeName, result = false;
    while ( element ) {
      nodeName = element.nodeName.toLowerCase();
      if ( nodeName == name.toLowerCase() ) {
        result = true;
        break;
      }
      element = element.parentElement;
    }
    return result;
  };

  // is testedNode right sibling of baseNode
  pub.isRightSibling = function( baseNode, testedNode ) {
    var node = baseNode.nextSibling;
    while ( node ) {
      if ( node == testedNode ) {
        return true;
      }
      node = node.nextSibling;
    }
    return false;
  };

  pub.getNextTerminalNode = function( node ) {
    var body = node.ownerDocument.body;
    var result = node;
    while ( result && result != body && !result.nextSibling ) {
      result = result.parentNode;
    }
    result = ( result == body ) ? null : result.nextSibling;
    while ( result && result.firstChild ) {
      result = result.firstChild;
    }
    return result;
  };

  pub.getPrevTerminalNode = function( node ) {
    var body = node.ownerDocument.body;
    var result = node;
    while ( result && result != body && !result.previousSibling ) {
      result = result.parentNode;
    }
    result = ( result == body ) ? null : result.previousSibling;
    while ( result && result.lastChild ) {
      result = result.lastChild;
    }
    return result;
  };

  pub.normalizeRangeStart = function( range ) {
    var startContainer = range.startContainer;
    var startOffset = range.startOffset;
    var nextTerm = null;
    if ( startContainer.nodeType == Ci.nsIDOMNode.TEXT_NODE &&
         startOffset == startContainer.length ) {
      nextTerm = pub.getNextTerminalNode( startContainer );
    } else if ( startContainer.nodeType == Ci.nsIDOMNode.ELEMENT_NODE ) {
      if ( startOffset == startContainer.childNodes.length ) {
        nextTerm = pub.getNextTerminalNode( startContainer );
      } else if ( startContainer.childNodes.item( startOffset ).hasChildNodes() ) {
        nextTerm = startContainer.childNodes.item( startOffset ).firstChild;
        while ( nextTerm.firstChild ) {
          nextTerm = nextTerm.firstChild;
        }
      }
    }
    if ( nextTerm ) {
      switch ( nextTerm.nodeType ) {
        case Ci.nsIDOMNode.TEXT_NODE:
          range.setStart( nextTerm, 0 );
          break;
        case Ci.nsIDOMNode.ELEMENT_NODE:
          range.setStart(
            nextTerm.parentNode,
            pub.getNodeIndexInParent( nextTerm )
          );
          break;
      }
    }
  };

  pub.normalizeRangeEnd = function( range ) {
    var endContainer = range.endContainer;
    var endOffset = range.endOffset;
    var prevTerm = null;
    if ( endContainer.nodeType === Ci.nsIDOMNode.TEXT_NODE &&
         endOffset == 0 ) {
      prevTerm = pub.getPrevTerminalNode( endContainer );
    } else if ( endContainer.nodeType === Ci.nsIDOMNode.ELEMENT_NODE ) {
      if ( endOffset == 0 ) {
        prevTerm = pub.getPrevTerminalNode( endContainer );
      } else if ( endContainer.childNodes.item( endOffset - 1 ).hasChildNodes() ) {
        prevTerm = endContainer.childNodes.item( endOffset - 1 ).lastChild;
        while ( prevTerm.lastChild ) {
          prevTerm = prevTerm.lastChild;
        }
      }
    }
    if ( prevTerm ) {
      switch ( prevTerm.nodeType ) {
        case Ci.nsIDOMNode.TEXT_NODE:
          range.setEnd( prevTerm, prevTerm.length );
          break;
        case Ci.nsIDOMNode.ELEMENT_NODE:
          range.setEnd(
            prevTerm.parentNode,
            pub.getNodeIndexInParent( prevTerm ) + 1
          );
          break;
      }
    }
  };

  pub.convolveSelection = function( selection ) {
    if ( !selection || !selection.rangeCount || selection.isCollapsed ) {
      return;
    }
    var prevRange, nextRange, adjacentFlag, removedRanges = [];
    for ( var i = 0; i < selection.rangeCount; i++ ) {
      nextRange = selection.getRangeAt( i );
      pub.normalizeRangeStart( nextRange );
      pub.normalizeRangeEnd( nextRange );
      if ( prevRange ) {
        adjacentFlag = (
          prevRange.endContainer == nextRange.startContainer &&
          prevRange.endOffset == nextRange.startOffset
        ) || (
          (
            (
              prevRange.endContainer.nodeType === Ci.nsIDOMNode.TEXT_NODE &&
              prevRange.endOffset === prevRange.endContainer.length
            ) || (
              prevRange.endContainer.nodeType === Ci.nsIDOMNode.ELEMENT_NODE
            )
          ) && (
            (
              nextRange.startContainer.nodeType === Ci.nsIDOMNode.TEXT_NODE &&
              nextRange.startOffset === 0
            ) || (
              nextRange.startContainer.nodeType === Ci.nsIDOMNode.ELEMENT_NODE
            )
          ) && (
            pub.getNextTerminalNode( prevRange.endContainer ) ===
              nextRange.startContainer
          )
        );
        if ( adjacentFlag ) {
          nextRange.setStart( prevRange.startContainer, prevRange.startOffset );
          removedRanges.push( prevRange );
        }
      }
      prevRange = nextRange;
    }
    for ( var i = 0; i < removedRanges.length; i++ ) {
      selection.removeRange( removedRanges[i] );
    }
  };

  // STYLE

  pub.ElementStyle = function() {
  };
  pub.ElementStyle.prototype = {
    toString: function() {
      var name, flag = false, result = "";
      for ( name in this ) {
        if ( this.hasOwnProperty( name ) ) {
          if ( flag ) {
            result += " ";
          } else {
            flag = true;
          }
          result += name + ": " + this[name].value;
          if ( this[name].priority ) {
            result += " !" + this[name].priority;
          }
          result += ";";
        }
      }
      return result;
    }
  };

  pub.getElementStyle = function( element ) {
    if ( !element || !element.style ) {
      return null;
    }
    var result = null;
    var style = element.style;
    var declarations = style.cssText.split( ";" );
    var index, declaration, name, value, priority;
    for ( var i = 0; i < declarations.length; i++ ) {
      declaration = declarations[i].trim();
      index = declaration.indexOf( ":" );
      if ( index > 1 ) {
        if ( !result ) {
          result = new pub.ElementStyle();
        }
        name = declaration.substring( 0, index );
        // TODO: How about short form ?
        // "margin: 10px 10px 10px 10px;"
        result[ name ] = {
          value: style.getPropertyValue( name ),
          priority: style.getPropertyPriority( name )
        }
      }
    }
    return result;
  };

  // SELECTION

  pub.cloneSelection = function( win ) {
    var selection = win.getSelection();
    if ( !selection || selection.rangeCount == 0 ) {
      return null;
    }
    var doc = win.document;
    var fragment = doc.createDocumentFragment();
    for ( var i = 0; i < selection.rangeCount; i++ ) {
      pub.cloneRange( fragment, selection.getRangeAt( i ) )
    }
    return fragment;
  };

  pub.cloneRange = function( target, range ) {
    var state = {
      processFlag: false,
      breakFlag: false,
      rootFlag: true
    };
    pub.cloneNode(
      target,
      range.commonAncestorContainer,
      range.startContainer,
      range.startOffset,
      range.endContainer,
      range.endOffset,
      state
    );
  };

  pub.cloneStyle = function( from, to ) {
    var fromStyle = from.style;
    var toStyle = to.style;
    var name, value, priority;
    for ( var i = 0; i < fromStyle.length; i++ ) {
      name = fromStyle[i];
      value = fromStyle.getPropertyValue( name );
      priority = fromStyle.getPropertyPriority( name );
      toStyle.setProperty( name, value, priority );
    }
  };

  pub.cloneComputedStyle = function( from, to ) {
    var win = from.ownerDocument.defaultView;
    var fromStyle = win.getComputedStyle( from, null );
    var toStyle = to.style;
    var name, value, priority;
    for ( var i = 0; i < fromStyle.length; i++ ) {
      name = fromStyle[i];
      value = fromStyle.getPropertyValue( name );
      priority = fromStyle.getPropertyPriority( name );
      toStyle.setProperty( name, value, priority );
    }
  };

  pub.cloneLinks = function( from, to ) {
    if ( from.hasAttribute( "src" ) ) {
      to.setAttribute(
        "src",
        from.baseURIObject.resolve( from.getAttribute( "src" ) )
      );
    }
    if ( from.hasAttribute( "href" ) ) {
      to.setAttribute(
        "href",
        from.baseURIObject.resolve( from.getAttribute( "href" ) )
      );
    }
  };

  pub.cloneNode = function( target, root, startContainer, startOffset,
                            endContainer, endOffset, state ) {
    var doc = root.ownerDocument;
    var textNode;
    var targetNode;
    var span;
    var isBody = (
      root &&
      root.nodeType === 1 &&
      root.nodeName.toLowerCase() === "body"
    );
    switch ( root.nodeType ) {
      case Ci.nsIDOMNode.TEXT_NODE:
        if ( root == startContainer && root == endContainer ) {
          textNode = root.cloneNode( false );
          textNode.nodeValue =
            textNode.nodeValue.substring( startOffset, endOffset );
          span = doc.createElement( "span" );
          pub.cloneComputedStyle( root.parentNode, span );
          span.appendChild( textNode );
          target.appendChild( span );
          state.breakFlag = true;
          return;
        }
        if ( root == startContainer && root != endContainer ) {
          textNode = root.cloneNode( false );
          textNode.nodeValue = textNode.nodeValue.substring( startOffset );
          target.appendChild( textNode );
          state.processFlag = true;
          return;
        }
        if ( root != startContainer && root == endContainer ) {
          textNode = root.cloneNode( false );
          textNode.nodeValue = textNode.nodeValue.substring( 0, endOffset );
          target.appendChild( textNode );
          state.processFlag = false;
          state.breakFlag = true;
          return;
        }
        if ( state.processFlag ) {
          textNode = root.cloneNode( false );
          target.appendChild( textNode );
          return;
        }
        break;
      case Ci.nsIDOMNode.ELEMENT_NODE:
        if ( isBody ) {
          targetNode = doc.createElement( "div" );
        } else {
          targetNode = root.cloneNode( false );
          if ( targetNode.hasAttribute( "id" ) ) {
            targetNode.removeAttribute( "id" );
          }
        }
        if ( state.rootFlag ) {
          state.rootFlag = false;
          if ( isBody ) {
            pub.cloneStyle( root, targetNode );
            targetNode.style.removeProperty( "background-color" );
            if ( targetNode.style.length == 0 ) {
              targetNode.removeAttribute( "style" );
            }
          } else {
            pub.cloneComputedStyle( root, targetNode );
          }
        }
        pub.cloneLinks( root, targetNode );
        target.appendChild( targetNode );
        if ( root == startContainer ) {
          state.processFlag = true;
        }
        var node = root.firstChild;
        while ( node ) {
          var nextSibling = node.nextSibling;
          pub.cloneNode(
            targetNode,
            node,
            startContainer,
            startOffset,
            endContainer,
            endOffset,
            state
          );
          if ( state.breakFlag ) {
            return;
          }
          node = nextSibling;
        }
        if ( root == endContainer ) {
          state.processFlag = false;
          state.breakFlag = true;
        }
        break;
    }
  };

  return pub;

}();
