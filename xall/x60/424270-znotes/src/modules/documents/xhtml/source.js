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

const EXPORTED_SYMBOLS = ["Source"];

var Cc = Components.classes;
var Ci = Components.interfaces;
var Cr = Components.results;
var Cu = Components.utils;

if ( !ru ) var ru = {};
if ( !ru.akman ) ru.akman = {};
if ( !ru.akman.znotes ) ru.akman.znotes = {};

Cu.import( "resource://znotes/utils.js", ru.akman.znotes );

var Source = function() {

  var Utils = ru.akman.znotes.Utils;
  var log = Utils.getLogger( "documents.xhtml.source" );

  var editor = null;

  var pub = {};

  pub.getEditor = function() {
    return editor;
  };

  pub.getLibrary = function() {
    return CodeMirror;
  };

  pub.onLoad = function() {
    var foldFunc = CodeMirror.newFoldFunction( CodeMirror.tagRangeFinder );
    editor = CodeMirror(
      document.getElementById( "editorView" ),
      {
        theme: "eclipse",
        mode: "htmlmixed", // mode required: javascript, xml, css
        lineNumbers: true,
        lineWrapping: false,
        styleActiveLine: true,
        autoCloseTags: true,
        indentUnit: 2,
        tabSize: 2,
        undoDepth: 500,
        historyEventDelay: 100
      }
    );
    //editor.setOption( "extraKeys", {
    //  "Ctrl-Q": function( cm ) {
    //    foldFunc( cm, cm.getCursor().line );
    //  }
    //} );
    editor.on( "keydown", function( cm, event ) {
      switch ( event.key ) {
        case "Esc":
          event.codemirrorIgnore = true;
          return;
      }
      switch ( CodeMirror.keyMap["default"][event.key] ) {
        case "undo":
        case "redo":
        case "selectAll":
          event.codemirrorIgnore = true;
          return;
      }
    } );
    editor.on( "gutterClick", function( cm, n ) {
      foldFunc( cm, n );
    } );
    editor.setSize( null, 100 );
  };

  return pub;

}();

window.addEventListener( "load"  , function() { Source.onLoad(); }, false );
