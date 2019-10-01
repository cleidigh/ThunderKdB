/*
 * description: utility functions for composer window
 */

var {ThunderHTMLedit} = ChromeUtils.import('resource://thunderHTMLedit/content/thunderHTMLedit.jsm');

var EXPORTED_SYMBOLS = [];

ThunderHTMLedit.definePreference('License',  { type: 'string', default: 'unlicensed' });
ThunderHTMLedit.definePreference('UseCount', { type: 'int',    default: 0 });

//how to find/set cursor position?
// seek through all nodes, and if node is #TEXT then count number of characters in.
// stop when Node = selection.focusNode, and then add htmled.selection.focusOffset instead of node characters count.
// reverse function is similar, but in every node we decrease cursor offset by number of characters in node.
// if cursor offset < number of characters in current node then we set this node as selection,
// and set remaining  cursor offset as selection offset.
ThunderHTMLedit.getCursorOffset = function(editor /*nsIEditor*/) {

  let cursorOffset = 0;

  function recurse(nodes) {
    for (let i = 0 ; i < nodes.length; i++) {
      let node = nodes[i];

      if(node.nodeType == node.TEXT_NODE) {
        if(node === editor.selection.focusNode) {
          cursorOffset += editor.selection.focusOffset;
          return true;
        }
        cursorOffset += node.nodeValue.length;
      } else
        if(node === editor.selection.focusNode)
          return true;

      if (node.hasChildNodes())
        if (recurse(node.childNodes)) return true;
    }
    return false;
  }

  if (recurse(editor.rootElement.childNodes)) return cursorOffset;
  return 0; //editor.selection.focusNode not found
}

ThunderHTMLedit.setCursorOffset = function(editor /*nsIEditor*/, offset) {

  let cursorOffset = offset;

  function recurse(nodes) {
    for (let i = 0 ; i < nodes.length; i++) {
      let node = nodes[i];

      if(node.nodeType == node.TEXT_NODE) {
        if(cursorOffset <= node.nodeValue.length) {
          editor.selection.collapse(node, cursorOffset);
          return true;
        } else
          cursorOffset -= node.nodeValue.length;
      } else
        if (node.hasChildNodes())
          if (recurse(node.childNodes)) return true;
    }
    return false;
  }

  recurse(editor.rootElement.childNodes)
}

// Replace mailbox:///C|/ with  mailbox:///C:/ - note: %7C is | and %3A is :
// JKJK Not sure why this is necessary, but it won't hurt.
ThunderHTMLedit.fixImagesPaths = function(htmlDocument) {
  let images = htmlDocument.getElementsByTagName('IMG');
  for (let i = 0 ; i < images.length; i++) {
    let node = images[i];
    if (node.hasAttribute('src')) {
      if (node.src.match(/mailbox:\/\/\/(.)(?:%7C|\|)\//i))
        node.src = node.src.replace(/mailbox:\/\/\/(.)(?:%7C|\|)\//i, 'mailbox:///$1%3A/');

      if (node.src.match(/file:\/\/\/(.)(?:%7C|\|)\//i))
        node.src = node.src.replace(/file:\/\/\/(.)(?:%7C|\|)\//i, 'file:///$1%3A/');
    }
  }
}

function useFontPreview() {
  if (typeof useFontPreview.useFontPreview === "undefined")
    useFontPreview.useFontPreview = ThunderHTMLedit.fontEnumerator.EnumerateAllFonts({ value: 0 }).length < 300;
  return useFontPreview.useFontPreview;
}

ThunderHTMLedit.onComposeBodyReady = function(wnd) {
  try{
    wnd.ThunderHTMLedit_.PrepareHTMLtab();

    wnd.setTimeout(function() {
      wnd.document.getElementById('FontFaceSelect').setAttribute('maxwidth', 250);
      let FontFacePopup = wnd.document.getElementById('FontFacePopup')
      let nodes = FontFacePopup.childNodes;

      nodes[1].setAttribute('style', 'font-family: monospace !important;');
      nodes[3].setAttribute('style', 'font-family: Helvetica, Arial, sans-serif !important;');
      nodes[4].setAttribute('style', 'font-family: Times, serif !important;');
      nodes[5].setAttribute('style', 'font-family: Courier, monospace !important;');

      //todo customize fonts AFTER composer is shown, as background task
      if (useFontPreview())
        for (let i = 7; i < nodes.length; ++i) {
          let n = nodes[i];
          n.setAttribute('style', 'font-family: "' + n.value + '" !important;');
          n.tooltipText = n.value;
        }
    }, 0);
  } catch (e) { ThunderHTMLedit.handleException(e); }
}
