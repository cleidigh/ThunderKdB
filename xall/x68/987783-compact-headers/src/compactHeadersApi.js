var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var xulAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);

var compactHeadersApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    context.callOnClose(this);
    return {
      compactHeadersApi: {
        async compactHeaders() {
          ExtensionSupport.registerWindowListener("compactHeadersListener", {
            chromeURLs: [
              "chrome://messenger/content/messenger.xhtml",
              "chrome://messenger/content/messenger.xul",
            ],
            onLoadWindow(window) {
              let targetHeaderViewDeck = window.document.getElementById("msgHeaderViewDeck");
              if (targetHeaderViewDeck) {
                let compactHeadersBox = window.document.createXULElement("vbox");
                let compactHeadersButton = window.document.createXULElement("button");
                compactHeadersBox.id = "compactHeadersBox";
                compactHeadersBox.setAttribute("style","margin-inline-end: -8px; position: relative; z-index: 1;");
                compactHeadersButton.id = "compactHeadersButton";
                compactHeadersButton.setAttribute("accesskey", "D");
                compactHeadersButton.setAttribute("style","-moz-user-focus: ignore;\
                  border: 4px solid transparent; background: transparent; margin: 2px 0px;\
                  box-shadow: none; min-width: 0px; min-height: 0px; padding: 0px !important;\
                  -moz-appearance: none; color: currentColor; -moz-context-properties: fill; fill: currentColor;");
                if (xulAppInfo.version >= "71.0") {
                  var myExpandedHeaders = window.document.getElementById("expandedHeaders2");
                } else {
                  var myExpandedHeaders = window.document.getElementById("expandedHeader2Rows");
                }
                if (myExpandedHeaders.getAttribute("compact") == "compact") {
                  compactHeadersButton.setAttribute("image", "chrome://global/skin/icons/twisty-collapsed.svg");
                  compactHeadersButton.setAttribute("tooltiptext", "Show Details");
                  let myExpandedRows = myExpandedHeaders.children;
                  var i;
                  for (i = 1; i < myExpandedRows.length; i++) {
                    myExpandedRows[i].setAttribute("persist", "style");
                    myExpandedRows[i].setAttribute("style", "display: none;");
                  }
                } else {
                  compactHeadersButton.setAttribute("image", "chrome://global/skin/icons/twisty-expanded.svg");
                  compactHeadersButton.setAttribute("tooltiptext", "Hide Details");
                }
                compactHeadersButton.addEventListener("command", () => toggleHeaders());
                compactHeadersBox.append(compactHeadersButton);
                targetHeaderViewDeck.parentNode.insertBefore(compactHeadersBox, targetHeaderViewDeck);

                function toggleHeaders() {
                  var myExpandedRows = myExpandedHeaders.children;
                  window.gDBView.reloadMessage();
                  myExpandedHeaders.setAttribute("persist", "compact");
                  switch(myExpandedHeaders.getAttribute("compact")) {
                  case "compact": myExpandedHeaders.removeAttribute("compact");
                    compactHeadersButton.setAttribute("image", "chrome://global/skin/icons/twisty-expanded.svg");
                    compactHeadersButton.setAttribute("tooltiptext", "Hide Details");
                    var i;
                    for (i = 1; i < myExpandedRows.length; i++) {
                      myExpandedRows[i].setAttribute("persist", "style");
                      myExpandedRows[i].removeAttribute("style");
                    }
                  break;
                  default: myExpandedHeaders.setAttribute("compact", "compact");
                    compactHeadersButton.setAttribute("image", "chrome://global/skin/icons/twisty-collapsed.svg");
                    compactHeadersButton.setAttribute("tooltiptext", "Show Details");
                    for (i = 1; i < myExpandedRows.length; i++) {
                      myExpandedRows[i].setAttribute("persist", "style");
                      myExpandedRows[i].setAttribute("style", "display: none;");
                    }
                  }
                }
              }
            },
          });
        },
      },
    };
  }

  close() {
    for (let window of Services.wm.getEnumerator("mail:3pane")) {
      let compactHeadersButton = window.document.getElementById("compactHeadersButton");
      if (compactHeadersButton) {
        compactHeadersButton.remove();
      }
      let compactHeadersBox = window.document.getElementById("compactHeadersBox");
      if (compactHeadersBox) {
        compactHeadersBox.remove();
      }
      if (xulAppInfo.version >= "71.0") {
        var myExpandedHeaders = window.document.getElementById("expandedHeaders2");
      } else {
        var myExpandedHeaders = window.document.getElementById("expandedHeader2Rows");
      }
      if (myExpandedHeaders) {
        let myExpandedRows = myExpandedHeaders.children;
        var i;
        for (i = 1; i < myExpandedRows.length; i++) {
          myExpandedRows[i].setAttribute("persist", "style");
          myExpandedRows[i].removeAttribute("style");
        }
      }
      console.log("Compact Headers disabled");
    }
    ExtensionSupport.unregisterWindowListener("compactHeadersListener");
  }
};
