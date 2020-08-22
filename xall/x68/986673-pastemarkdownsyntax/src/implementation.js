var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");

var myapi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    context.callOnClose(this);
    return {
      myapi: {
        pasteCode: function() {
          ExtensionSupport.registerWindowListener("PasteMarkdownSyntax", {
           chromeURLs: [
              "chrome://calendar/content/calendar-event-dialog.xhtml"
              ],
           onLoadWindow(window) {
    var pasteButton = window.document.createXULElement("toolbarbutton");
    pasteButton.setAttribute("is", "customizable-toolbar");
    pasteButton.setAttribute("id", "paste-syntax");
    pasteButton.setAttribute("customizable", "true");
    pasteButton.setAttribute("toolboxid", "event-toolbox");
    pasteButton.setAttribute("class", "toolbarbutton-1");
    pasteButton.setAttribute("mode", "dialog");
    pasteButton.setAttribute("defaultlabelalign", "end");
    pasteButton.setAttribute("label", "PasteMarkdownSyntax");
    pasteButton.setAttribute("removable", "true");
    pasteButton.setAttribute("type", "menu");
    pasteButton.style["list-style-image"] = "url(" + context.extension.getURL("pms16.png") + ")";

    var menuPopup = window.document.createXULElement(
        "menupopup"
    );
    menuPopup.setAttribute("id", "menu-popup");
    menuPopup.setAttribute("type", "popup");

    var menuitem1 = window.document.createXULElement(
        "menuitem"
    );
    menuitem1.setAttribute("id", "one");
    menuitem1.setAttribute("label", "Bold **");
    menuitem1.addEventListener("click", funcOne);

    function funcOne() {
        var syntaxArr = new Array; 
         syntaxArr = ['**', '###', '~~', '----', '|---', '|---|', '---|', '|:---|', '|:---:|', '|---:|', '![alt text]( )'];
        var targetApply = syntaxArr[0];
        window.frames[0].document.activeElement.setRangeText(targetApply);
    };

    var menuitem2 = window.document.createXULElement(
        "menuitem"
    );
    menuitem2.setAttribute("id", "two");
    menuitem2.setAttribute("label", "Heading ###");
    menuitem2.addEventListener("click", funcTwo);

    function funcTwo() {
        var syntaxArr = new Array; 
        syntaxArr = ['**', '###', '~~', '----', '|---', '|---|', '---|', '|:---|', '|:---:|', '|---:|', '![alt text]( )'];
        var targetApply = syntaxArr[1];
        window.frames[0].document.activeElement.setRangeText(targetApply);
    };

    var menuitem3 = window.document.createXULElement(
        "menuitem"
    );
    menuitem3.setAttribute("id", "three");
    menuitem3.setAttribute("label", "Strike out ~~");
    menuitem3.addEventListener("click", funcThree);

    function funcThree() {
        var syntaxArr = new Array; 
        syntaxArr = ['**', '###', '~~', '----', '|---', '|---|', '---|', '|:---|', '|:---:|', '|---:|', '![alt text]( )'];
        var targetApply = syntaxArr[2];
        window.frames[0].document.activeElement.setRangeText(targetApply);
    };

    var menuitem4 = window.document.createXULElement(
        "menuitem"
    );
    menuitem4.setAttribute("id", "four");
    menuitem4.setAttribute("label", "Horizon ----");
    menuitem4.addEventListener("click", funcFour);

    function funcFour() {
        var syntaxArr = new Array; 
        syntaxArr = ['**', '###', '~~', '----', '|---', '|---|', '---|', '|:---|', '|:---:|', '|---:|', '![alt text]( )'];
        var targetApply = syntaxArr[3];
        window.frames[0].document.activeElement.setRangeText(targetApply);
    };

    var menuitem5 = window.document.createXULElement(
        "menuitem"
    );
    menuitem5.setAttribute("id", "five");
    menuitem5.setAttribute("label", "Table left |---");
    menuitem5.addEventListener("click", funcFive);

    function funcFive() {
        var syntaxArr = new Array; 
        syntaxArr = ['**', '###', '~~', '----', '|---', '|---|', '---|', '|:---|', '|:---:|', '|---:|', '![alt text]( )'];
        var targetApply = syntaxArr[4];
        window.frames[0].document.activeElement.setRangeText(targetApply);
    };

    var menuitem6 = window.document.createXULElement(
        "menuitem"
    );
    menuitem6.setAttribute("id", "six");
    menuitem6.setAttribute("label", "Table center |---|");
    menuitem6.addEventListener("click", funcSix);

    function funcSix() {
        var syntaxArr = new Array; 
        syntaxArr = ['**', '###', '~~', '----', '|---', '|---|', '---|', '|:---|', '|:---:|', '|---:|', '![alt text]( )'];
        var targetApply = syntaxArr[5];
        window.frames[0].document.activeElement.setRangeText(targetApply);
    };

    var menuitem7 = window.document.createXULElement(
        "menuitem"
    );
    menuitem7.setAttribute("id", "seven");
    menuitem7.setAttribute("label", "Table right ---|");
    menuitem7.addEventListener("click", funcSeven);

    function funcSeven() {
        var syntaxArr = new Array; 
        syntaxArr = ['**', '###', '~~', '----', '|---', '|---|', '---|', '|:---|', '|:---:|', '|---:|', '![alt text]( )'];
        var targetApply = syntaxArr[6];
        window.frames[0].document.activeElement.setRangeText(targetApply);
    };

    var menuitem8 = window.document.createXULElement(
        "menuitem"
    );
    menuitem8.setAttribute("id", "eight");
    menuitem8.setAttribute("label", "Table align left |:---|");
    menuitem8.addEventListener("click", funcEight);

    function funcEight() {
        var syntaxArr = new Array; 
        syntaxArr = ['**', '###', '~~', '----', '|---', '|---|', '---|', '|:---|', '|:---:|', '|---:|', '![alt text]( )'];
        var targetApply = syntaxArr[7];
        window.frames[0].document.activeElement.setRangeText(targetApply);
    };

    var menuitem9 = window.document.createXULElement(
        "menuitem"
    );
    menuitem9.setAttribute("id", "nine");
    menuitem9.setAttribute("label", "Table align center |:---:|");
    menuitem9.addEventListener("click", funcNine);

    function funcNine() {
        var syntaxArr = new Array; 
        syntaxArr = ['**', '###', '~~', '----', '|---', '|---|', '---|', '|:---|', '|:---:|', '|---:|', '![alt text]( )'];
        var targetApply = syntaxArr[8];
        window.frames[0].document.activeElement.setRangeText(targetApply);
    };

    var menuitem10 = window.document.createXULElement(
        "menuitem"
    );
    menuitem10.setAttribute("id", "ten");
    menuitem10.setAttribute("label", "Table align right |---:|");
    menuitem10.addEventListener("click", funcTen);

    function funcTen() {
        var syntaxArr = new Array; 
        syntaxArr = ['**', '###', '~~', '----', '|---', '|---|', '---|', '|:---|', '|:---:|', '|---:|', '![alt text]( )'];
        var targetApply = syntaxArr[9];
        window.frames[0].document.activeElement.setRangeText(targetApply);
    };

    var menuitem11 = window.document.createXULElement(
        "menuitem"
    );
    menuitem11.setAttribute("id", "eleven");
    menuitem11.setAttribute("label", "Image ![alt text]( )");
    menuitem11.addEventListener("click", funcEleven);

    function funcEleven() {
        var syntaxArr = new Array; 
        syntaxArr = ['**', '###', '~~', '----', '|---', '|---|', '---|', '|:---|', '|:---:|', '|---:|', '![alt text]( )'];
        var targetApply = syntaxArr[10];
        window.frames[0].document.activeElement.setRangeText(targetApply);
    };


    menuPopup.appendChild(menuitem1);
    menuPopup.appendChild(menuitem2);
    menuPopup.appendChild(menuitem3);
    menuPopup.appendChild(menuitem4);
    menuPopup.appendChild(menuitem5);
    menuPopup.appendChild(menuitem6);
    menuPopup.appendChild(menuitem7);
    menuPopup.appendChild(menuitem8);
    menuPopup.appendChild(menuitem9);
    menuPopup.appendChild(menuitem10);
    menuPopup.appendChild(menuitem11);


   pasteButton.appendChild(menuPopup);
   window.document.getElementById("event-toolbar").appendChild(pasteButton);
            }
          });
        }
      }
    }
  }

  close() {
    // check all open windows to find the window we manipulated and remove our stuff
    for (let window of Services.wm.getEnumerator(null)) {
      if (window.location.href == "chrome://calendar/content/calendar-event-dialog.xhtml") {
        let element = window.document.getElementById("paste-syntax");
        if (element) element.remove();
      }
    }
    // Stop listening for new windows.
    ExtensionSupport.unregisterWindowListener("PasteMarkdownSyntax");
  }  
  
};