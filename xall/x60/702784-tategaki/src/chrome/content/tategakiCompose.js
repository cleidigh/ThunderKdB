// TategakiCompose.js
// Copyright (c) 2016, Masahiko Imanaka. All rights reserved.
/* global GetCurrentEditor, GetCurrentEditorElement, GetCurrentEditorType */
/* exported Tategaki */
/* jshint moz:true, esnext:true */

var Tategaki = {
  verticalWriting: false,
  textComposeWidth: "90ch",

  toggleWritingMode: function () {
    var editorElem = GetCurrentEditorElement();
    if (!editorElem) {
      return;
    }
    var editorType = GetCurrentEditorType(),
        composeDocument = editorElem.contentWindow.document.body,
        composeDocumentStyle = composeDocument.style,
        toolbarbtn = document.getElementById("button-tategaki");

    // Toggle "writing-mode".
    this.verticalWriting = !this.verticalWriting;
    composeDocumentStyle.writingMode = (this.verticalWriting) ? "vertical-rl" : "horizontal-tb";
    toolbarbtn.checked = this.verticalWriting;

    // Style tweaks.
    switch (editorType) {
      case "html":
      case "htmlmail":
        var btn = document.getElementById("textCombineUpright");
        btn.setAttribute("hidden", !this.verticalWriting);
        break;
      case "text":
      case "textmail":
        composeDocumentStyle.width = (this.verticalWriting) ? "" : this.textComposeWidth;
        break;
      default:
    }

    // Add head border line for vertical writing-mode.
    composeDocumentStyle.borderRight = (this.verticalWriting) ? "1px dotted #aaa" : "0px";
  },
  
  // tateChuYoko() is supported on Thunderbird 48.0 or later.
  tateChuYoko: function () {
    var editor = GetCurrentEditor(),
        selNode = editor.selection.anchorNode || editor.selection.focusNode,
        elem = (selNode) ? selNode.parentNode : null;

    if (elem && elem.hasAttribute("tcy")) {
      // Remove tcy.
      elem.removeAttribute("tcy");
      elem.style.textCombineUpright = "";
      for (var node of elem.childNodes) {
        if (node.nodeType === Node.ELEMENT_NODE &&
            node.style.textCombineUpright !== "") {
          node.removeAttribute("tcy");
          node.style.textCombineUpright = "";
        }
      }
      //elem.outerHTML = elem.innerHTML;
      var innerElem,
          parentNode = elem.parentNode;
      while ((innerElem = elem.firstChild)) {
        parentNode.insertBefore(innerElem, elem);
      }
      parentNode.removeChild(elem);
      parentNode.normalize();
    } else {
      // Add tcy.
      var tcyElm = editor.createElementWithDefaults("span");
      tcyElm.style.textCombineUpright = "all";
      tcyElm.setAttribute("tcy", "");
      tcyElm.textContent = editor.selection;
      editor.insertElementAtSelection(tcyElm, true);
      window.content.focus();
    }
  }
};
