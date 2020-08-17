var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var xulAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);

var compactHeadersApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    return {
      compactHeadersApi: {
        async compactHeaders() {
          ExtensionSupport.registerWindowListener("compactHeadersListener", {
            chromeURLs: [
              "chrome://messenger/content/messenger.xhtml",
              "chrome://messenger/content/messageWindow.xhtml",
            ],
            onLoadWindow(window) {
              let msgHeaderViewDeck = window.document.getElementById("msgHeaderViewDeck");
              if (msgHeaderViewDeck) {

                let expandedHeadersBox = window.document.getElementById("expandedHeadersBox");
                let expandedHeadersTopBox = window.document.getElementById("expandedHeadersTopBox");
                let expandedHeadersBottomBox = window.document.getElementById("expandedHeadersBottomBox");
                let headerViewToolbox = window.document.getElementById("header-view-toolbox");
                let headerViewToolbar = window.document.getElementById("header-view-toolbar");
                let expandedBoxSpacer = window.document.getElementById("expandedBoxSpacer");
                let expandedHeaders2 = window.document.getElementById("expandedHeaders2");
                let otherActionsBox = window.document.getElementById("otherActionsBox");

                let compactHeadersPopup = window.document.createXULElement("menupopup");
                compactHeadersPopup.id = "compactHeadersPopup";

                let compactHeadersSingleLine = window.document.createXULElement("menuitem");
                compactHeadersSingleLine.id = "compactHeadersSingleLine";
                compactHeadersSingleLine.setAttribute("type", "checkbox");
                compactHeadersSingleLine.setAttribute("label", "Single Line Headers");
                compactHeadersSingleLine.addEventListener("command", () => setLines());

                let compactHeadersViewAll = window.document.createXULElement("menuitem");
                compactHeadersViewAll.id = "compactHeadersViewAll";
                compactHeadersViewAll.setAttribute("type", "radio");
                compactHeadersViewAll.setAttribute("label", "View All Headers");
                compactHeadersViewAll.setAttribute("name", "compactHeaderViewGroup");
                compactHeadersViewAll.addEventListener("command", () => markHeaders());

                let compactHeadersViewNormal = window.document.createXULElement("menuitem");
                compactHeadersViewNormal.id = "compactHeadersViewNormal";
                compactHeadersViewNormal.setAttribute("type", "radio");
                compactHeadersViewNormal.setAttribute("label", "View Normal Headers");
                compactHeadersViewNormal.setAttribute("name", "compactHeaderViewGroup");
                compactHeadersViewNormal.addEventListener("command", () => markHeaders());

                let compactHeadersBox = window.document.createXULElement("vbox");
                let compactHeadersButton = window.document.createXULElement("button");
                compactHeadersBox.id = "compactHeadersBox";
                compactHeadersBox.setAttribute("style","margin-inline-end: -8px; position: relative; z-index: 1;");
                compactHeadersButton.id = "compactHeadersButton";
                compactHeadersButton.setAttribute("accesskey", "D");
                compactHeadersButton.setAttribute("style","-moz-user-focus: ignore;\
                  border: 4px solid transparent; background: transparent; margin: 0px;\
                  box-shadow: none; min-width: 0px; min-height: 0px; padding: 0px !important;\
                  -moz-appearance: none; color: currentColor; -moz-context-properties: fill; fill: currentColor;");

                let compactHeadersSeparator = window.document.createXULElement("menuseparator");

                let msgHeaderView = window.document.getElementById("msgHeaderView");
                msgHeaderView.setAttribute("context", "compactHeadersPopup");
                headerViewToolbar.setAttribute("style", "margin: 4px 0 0;");

                checkHeaders();
                checkLines();

                compactHeadersPopup.append(compactHeadersSingleLine);
                compactHeadersPopup.append(compactHeadersSeparator);
                compactHeadersPopup.append(compactHeadersViewAll);
                compactHeadersPopup.append(compactHeadersViewNormal);
                window.mainPopupSet.append(compactHeadersPopup);

                compactHeadersButton.addEventListener("command", () => toggleHeaders());
                compactHeadersBox.append(compactHeadersButton);
                msgHeaderViewDeck.parentNode.insertBefore(compactHeadersBox, msgHeaderViewDeck);

                function singleLine() {
                  expandedHeadersTopBox.setAttribute("style", "padding: 8px 0px 2px; height: 0px; min-width: -moz-fit-content;");
                  expandedHeadersBottomBox.setAttribute("style", "padding: 8px 0px 2px; height: 0px; width: -moz-available;");
                  if (xulAppInfo.OS == "WINNT") {
                    expandedHeadersTopBox.setAttribute("style", "padding: 6px 0px 2px; height: 0px; min-width: -moz-fit-content;");
                    expandedHeadersBottomBox.setAttribute("style", "padding: 6px 0px 2px; height: 0px; width: -moz-available;");
                  }
                  expandedBoxSpacer.setAttribute("style", "display: none;");
                  headerViewToolbox.setAttribute("style", "display: none;");
                  expandedHeadersBox.setAttribute("style", "-moz-box-orient: horizontal; display: flex;");
                }

                function doubleLine() {
                  expandedHeadersTopBox.removeAttribute("style");
                  expandedHeadersBottomBox.removeAttribute("style");
                  expandedBoxSpacer.setAttribute("style", "height: 8px;");
                  if (xulAppInfo.OS == "WINNT") {
                    expandedBoxSpacer.setAttribute("style", "height: 6px;");
                    expandedHeadersBottomBox.setAttribute("style", "margin-top: -3px;");
                  }
                  headerViewToolbox.removeAttribute("style");
                  expandedHeadersBox.removeAttribute("style");
                }

                function setLines() {
                  if (expandedHeaders2.getAttribute("singleline") == "singleline") {
                    expandedHeaders2.setAttribute("singleline", "");
                  } else {
                    expandedHeaders2.setAttribute("singleline", "singleline");
                  }
                  toggleHeaders();
                  toggleHeaders();
                }

                function checkLines() {
                  if (expandedHeaders2.getAttribute("singleline") == "singleline") {
                    compactHeadersSingleLine.setAttribute("checked",true);
                  } else {
                    compactHeadersSingleLine.setAttribute("checked",false);
                  }
                }

                function checkHeaders() {
                  expandedHeaders2.setAttribute("persist", "compact; showall; singleline");
                  if (expandedHeaders2.getAttribute("showall") == "showall") {
                    compactHeadersViewAll.setAttribute("checked", true);
                  } else {
                    compactHeadersViewNormal.setAttribute("checked", true);
                  }
                  if (expandedHeaders2.getAttribute("compact") == "compact") {
                    compactHeadersButton.setAttribute("image", "chrome://global/skin/icons/twisty-collapsed.svg");
                    compactHeadersButton.setAttribute("tooltiptext", "Show Details");
                    msgHeaderViewDeck.setAttribute("style", "margin-block: -4px -2px;");
                    var i;
                    for (i = 1; i < expandedHeaders2.childElementCount; i++) {
                      expandedHeaders2.children[i].setAttribute("persist", "style");
                      expandedHeaders2.children[i].setAttribute("style", "display: none;");
                      if (expandedHeaders2.getAttribute("singleline") == "singleline") singleLine();
                    }
                  } else {
                    compactHeadersButton.setAttribute("image", "chrome://global/skin/icons/twisty-expanded.svg");
                    compactHeadersButton.setAttribute("tooltiptext", "Hide Details");
                    msgHeaderViewDeck.setAttribute("style", "margin-block: -4px 0px;");
                    var i;
                    for (i = 1; i < expandedHeaders2.childElementCount; i++) {
                      expandedHeaders2.children[i].setAttribute("persist", "style");
                      expandedHeaders2.children[i].removeAttribute("style");
                      doubleLine();
                    }
                  }
                }

                function markHeaders() {
                  window.gDBView.reloadMessage();
                  if (compactHeadersViewAll.getAttribute("checked") == "true") {
                    expandedHeaders2.setAttribute("showall", "showall");
                    if (expandedHeaders2.getAttribute("compact") != "compact") window.MsgViewAllHeaders();
                  } else {
                    expandedHeaders2.removeAttribute("showall");
                    if (expandedHeaders2.getAttribute("compact") != "compact") window.MsgViewNormalHeaders();
                  }
                }

                function toggleHeaders() {
                  window.gDBView.reloadMessage();
                  if (compactHeadersViewAll.getAttribute("checked") == "true") {
                    window.MsgViewAllHeaders();
                    expandedHeaders2.setAttribute("showall", "showall");
                  } else {
                    expandedHeaders2.removeAttribute("showall");
                  }
                  switch(expandedHeaders2.getAttribute("compact")) {
                  case "compact": expandedHeaders2.removeAttribute("compact");
                    compactHeadersButton.setAttribute("image", "chrome://global/skin/icons/twisty-expanded.svg");
                    compactHeadersButton.setAttribute("tooltiptext", "Hide Details");
                    msgHeaderViewDeck.setAttribute("style", "margin-block: -4px 0px;");
                    var i;
                    for (i = 1; i < expandedHeaders2.childElementCount; i++) {
                      expandedHeaders2.children[i].setAttribute("persist", "style");
                      expandedHeaders2.children[i].removeAttribute("style");
                      doubleLine();
                    }
                  break;
                  default: expandedHeaders2.setAttribute("compact", "compact");
                    compactHeadersButton.setAttribute("image", "chrome://global/skin/icons/twisty-collapsed.svg");
                    compactHeadersButton.setAttribute("tooltiptext", "Show Details");
                    window.MsgViewNormalHeaders();
                    msgHeaderViewDeck.setAttribute("style", "margin-block: -4px -2px;");
                    var i;
                    for (i = 1; i < expandedHeaders2.childElementCount; i++) {
                      expandedHeaders2.children[i].setAttribute("persist", "style");
                      expandedHeaders2.children[i].setAttribute("style", "display: none;");
                      if (expandedHeaders2.getAttribute("singleline") == "singleline") singleLine();
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

  onShutdown(isAppShutdown) {
  if (isAppShutdown) return;

  for (let window of Services.wm.getEnumerator("mail:3pane")) {
    let compactHeadersViewAll = window.document.getElementById("compactHeadersViewAll");
    if (compactHeadersViewAll) {
      compactHeadersViewAll.remove();
    }
    let compactHeadersViewNormal = window.document.getElementById("compactHeadersViewNormal");
    if (compactHeadersViewNormal) {
      compactHeadersViewNormal.remove();
    }
    let compactHeadersPopup = window.document.getElementById("compactHeadersPopup");
    if (compactHeadersPopup) {
      compactHeadersPopup.remove();
    }
    let compactHeadersButton = window.document.getElementById("compactHeadersButton");
    if (compactHeadersButton) {
      compactHeadersButton.remove();
    }
    let compactHeadersBox = window.document.getElementById("compactHeadersBox");
    if (compactHeadersBox) {
      compactHeadersBox.remove();
    }
    let expandedHeaders2 = window.document.getElementById("expandedHeaders2");
    if (expandedHeaders2) {
      var i;
      for (i = 1; i < expandedHeaders2.childElementCount; i++) {
        expandedHeaders2.children[i].setAttribute("persist", "style");
        expandedHeaders2.children[i].removeAttribute("style");
      }
    }
  }

  for (let window of Services.wm.getEnumerator("mail:messageWindow")) {
    let compactHeadersViewAll = window.document.getElementById("compactHeadersViewAll");
    if (compactHeadersViewAll) {
      compactHeadersViewAll.remove();
    }
    let compactHeadersViewNormal = window.document.getElementById("compactHeadersViewNormal");
    if (compactHeadersViewNormal) {
      compactHeadersViewNormal.remove();
    }
    let compactHeadersPopup = window.document.getElementById("compactHeadersPopup");
    if (compactHeadersPopup) {
      compactHeadersPopup.remove();
    }
    let compactHeadersButton = window.document.getElementById("compactHeadersButton");
    if (compactHeadersButton) {
      compactHeadersButton.remove();
    }
    let compactHeadersBox = window.document.getElementById("compactHeadersBox");
    if (compactHeadersBox) {
      compactHeadersBox.remove();
    }
    let expandedHeaders2 = window.document.getElementById("expandedHeaders2");
    if (expandedHeaders2) {
      var i;
      for (i = 1; i < expandedHeaders2.childElementCount; i++) {
        expandedHeaders2.children[i].setAttribute("persist", "style");
        expandedHeaders2.children[i].removeAttribute("style");
      }
    }
  }
  ExtensionSupport.unregisterWindowListener("compactHeadersListener");
  console.log("Compact Headers disabled");
  }
};
