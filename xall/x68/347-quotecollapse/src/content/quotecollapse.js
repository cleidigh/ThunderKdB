/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 1.1/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * Contributor(s): Michael J Gruber  http://quotecollapse.mozdev.org/
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

window.addEventListener("load", function load(event){
    window.removeEventListener("load", load, false); //remove listener, no longer needed
    QuoteCollapse.onMailWindowLoad();
},false);

var QuoteCollapse = {
//  _URIFixup : Components.classes["@mozilla.org/docshell/urifixup;1"].getService(Components.interfaces.nsIURIFixup),
//  _pref : Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch(null),


  // Taken from LinkVisitor.
  // This function is invoked in window (?) context,
  // so use 'QuoteCollapse' instead of 'this'.
  // event.originalTarget is the loaded document.

  messagePane : null,

  onMailWindowLoad : function(event) {
    QuoteCollapse._messagePane = document.getElementById('messagepane'); // browser parenting the document
    // messagePane.addEventListener("click", QuoteCollapse._onClick, false); // cpould also reg. on doc
    QuoteCollapse._messagePane.addEventListener("load", QuoteCollapse._onLoad, true); // wait for doc to be loaded
  },

 // this is called when loading the document; time to insert style
  _onLoad: function(event) {
    var messageDocument = QuoteCollapse._messagePane.contentDocument; 
    if( ! messageDocument.getElementsByTagName("blockquote").item(0) ) return; // nothing to be done
    messageDocument.addEventListener("click", QuoteCollapse._onClick, false);
    messageDocument.getElementsByTagName("body").item(0).className='mailview'; // class for customizing

    // the following is inspired by code from quotecolors
    var StyleElement = messageDocument.createElement("style");
    StyleElement.type = "text/css";
    // we don't need a BODY.mailview qualifier here
    var stylecontent='\
blockquote[type="cite"] {\n\
 background-image: url("chrome://quotecollapse/skin/twisty-clsd.png");\n\
 background-repeat: no-repeat;\n\
 background-position: top left;\n\
 max-height: 2ex;\n\
 padding: 0px 2ex ! important;\n\
 overflow: -moz-hidden-unscrollable;\n\
}\n\
\n\
blockquote[type="cite"][qctoggled="true"] {\n\
 background-image: url("chrome://quotecollapse/skin/twisty-open.png");\n\
 max-height: none;\n\
 overflow: visible;\n\
}\n\
';
    var styletext = document.createTextNode(stylecontent);
    StyleElement.appendChild(styletext);
    messageDocument.getElementsByTagName("head").item(0).appendChild(StyleElement);

    for(let quote of QuoteCollapse._getQuoteRoots(messageDocument.body)) {
      QuoteCollapse._toggleFullyVisible(quote);
    }
  },
  
  _toggleFullyVisible: function toggleFullyVisible(quote) {
    if(quote.clientHeight < quote.scrollHeight)
      return false;

    for(let nested of QuoteCollapse._getQuoteRoots(quote)) {
      if(!toggleFullyVisible(nested))
        return false;
    }
    quote.setAttribute("qctoggled", "true");
    return true;
  },

  _getState: function(node) {
    let current = node;
    while(current) {
      if(current.nodeName == "BLOCKQUOTE" && current.getAttribute("qctoggled") != "true")
        return false;

      current = current.parentNode
    }
    return true;
  },

  _setState: function(node, state, bubble) {
    if(state)
      node.setAttribute("qctoggled","true");
    else
      node.setAttribute("qctoggled","false");

    if(bubble) {
      var currentParent = node.parentNode;
      while(currentParent) {
        if(currentParent.nodeName == 'BLOCKQUOTE')
          QuoteCollapse._setState(currentParent, state);

        currentParent = currentParent.parentNode;
      }
    }
  },

  _setSubTree: function(node, state) {
    if(node.nodeName == 'BLOCKQUOTE')
      QuoteCollapse._setState(node, state);
   
    for (var i=0; i<node.childNodes.length; i++) {
      QuoteCollapse._setSubTree(node.childNodes.item(i), state);
    }
  },

  _setSubTreeLevel: function(node, state, level) {
    if(node.nodeName == 'BLOCKQUOTE') {
      if(level<=0) {
        QuoteCollapse._setState(node, state, state);
        if(state)
          for(let nested of node.querySelectorAll("blockquote")) {
            QuoteCollapse._toggleFullyVisible(nested);
          }

	return; // no need to go deeper
      }
      level--; // only BQs count for the level magic
    } 
    for (var i=0; i<node.childNodes.length; i++) {
      QuoteCollapse._setSubTreeLevel(node.childNodes.item(i), state, level);
    }
  },

  // we could use subtree on BODY, but the following is more efficient
  _setTree : function(doc, newstate) {
    var tree =  doc.getElementsByTagName("blockquote");
    for(var i=0; i<tree.length; i++)
      QuoteCollapse._setState(tree.item(i), newstate);
  },
  
  _setLevel : function(target, newstate) {
    var level=0;
    var node=target;
    do {
      node = node.parentNode;
      if(node.nodeName == 'BLOCKQUOTE')
        level++;
    } while(node.nodeName != 'BODY');
    QuoteCollapse._setSubTreeLevel(node, newstate, level); // node is the BODY element
  },
  
 // this is called by a click event
  _onClick: function(event) {
    var target = event.target;
    if(target.nodeName == 'SPAN')
      target = target.parentNode; // cite-tags span?
    if(target.nodeName == 'PRE')
      target = target.parentNode; // PRE inside; don't walk all the way up
    if(target.nodeName != 'BLOCKQUOTE')
      return true;

    var newstate= ! QuoteCollapse._getState(target);


// react only to active spot (leave rest for copy etc.)
    if(event.pageX > target.offsetLeft+12) return true;
    
    if(event.shiftKey)
      if(event.ctrlKey || event.metaKey)
        QuoteCollapse._setTree(target.ownerDocument, newstate);
      else
       QuoteCollapse._setSubTree(target, newstate);
    else
      if(event.ctrlKey || event.metaKey)
        QuoteCollapse._setLevel(target, newstate);
      else {
        QuoteCollapse._setState(target, newstate, newstate);
        if(newstate)
          for(let nested of target.querySelectorAll("blockquote")) {
            QuoteCollapse._toggleFullyVisible(nested);
          }
      }
    return true;
  },

  _getQuoteRoots: function getQuoteRoots(node, result = []) {
    for(let childElement of node.children) {
      if(childElement.localName == "blockquote")
        result.push(childElement);
      else
        getQuoteRoots(childElement, result);
    }
    return result;
  },


};

