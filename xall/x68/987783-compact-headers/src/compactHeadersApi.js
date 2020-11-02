var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var xulAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);

let doToggle = undefined; //declare it here to make removeEventlistener work

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
                compactHeadersSingleLine.setAttribute("tooltiptext", "Display compact headers on a single line (only author and subject)");
                compactHeadersSingleLine.addEventListener("command", () => setLines());

                let compactHeadersHideToolbar = window.document.createXULElement("menuitem");
                compactHeadersHideToolbar.id = "compactHeadersHideToolbar";
                compactHeadersHideToolbar.setAttribute("type", "checkbox");
                compactHeadersHideToolbar.setAttribute("label", "Replace Header Toolbar");
                compactHeadersHideToolbar.setAttribute("tooltiptext", "Replace the header toolbar \
with the recipient \r\nor, when reading news feeds, the link to the \r\nwebsite (only in compact double line mode)");
                compactHeadersHideToolbar.addEventListener("command", () => toggleToolbar());

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

                let expandedtoRow = window.document.getElementById("expandedtoRow");
                if (expandedtoRow) expandedtoRow.removeAttribute("style");
                let expandedsubjectRow = window.document.getElementById("expandedsubjectRow");
                let expandedtoLabel = window.document.getElementById("expandedtoLabel");
                let expandedtoBox = window.document.getElementById("expandedtoBox");

                let expandedcontentBaseRow = window.document.getElementById("expandedcontent-baseRow");
                let expandedcontentBaseLabel = window.document.getElementById("expandedcontent-baseLabel");
                let expandedcontentBaseBox = window.document.getElementById("expandedcontent-baseBox");

                checkHeaders();
                checkLines();
                markToolbar();

                compactHeadersPopup.append(compactHeadersSingleLine);
                compactHeadersPopup.append(compactHeadersHideToolbar);
                compactHeadersPopup.append(compactHeadersSeparator);
                compactHeadersPopup.append(compactHeadersViewAll);
                compactHeadersPopup.append(compactHeadersViewNormal);
                window.mainPopupSet.append(compactHeadersPopup);

                compactHeadersButton.addEventListener("command", () => toggleHeaders());
                compactHeadersBox.append(compactHeadersButton);
                msgHeaderViewDeck.parentNode.insertBefore(compactHeadersBox, msgHeaderViewDeck);

                doToggle = () => toggleHeaders();
                msgHeaderViewDeck.addEventListener("dblclick", doToggle);

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
                  expandedHeadersTopBox.setAttribute("style", "min-height: 30px;");
                  expandedHeadersBottomBox.removeAttribute("style");
                  expandedBoxSpacer.setAttribute("style", "height: 8px;");
                  if (xulAppInfo.OS == "WINNT") {
                    expandedHeadersTopBox.setAttribute("style", "min-height: 32px;");
                    expandedBoxSpacer.setAttribute("style", "height: 6px;");
                    expandedHeadersBottomBox.setAttribute("style", "margin-top: -3px;");
                  }
                  headerViewToolbox.removeAttribute("style");
                  expandedHeadersBox.removeAttribute("style");
                }

                function setLines() {
                  window.gDBView.reloadMessage();
                  if (expandedHeaders2.getAttribute("singleline") == "singleline") {
                    expandedHeaders2.setAttribute("singleline", "");
                    doubleLine();
                    checkHeaders();
                  } else {
                    expandedHeaders2.setAttribute("singleline", "singleline");
                    singleLine();
                    checkHeaders();
                  }
                }

                function checkLines() {
                  if (expandedHeaders2.getAttribute("singleline") == "singleline") {
                    compactHeadersSingleLine.setAttribute("checked",true);
                  } else {
                    compactHeadersSingleLine.setAttribute("checked",false);
                  }
                }

                function toggleToolbar() {
                  if (expandedHeaders2.getAttribute("hidetoolbar") == "hidetoolbar") {
                    expandedHeaders2.removeAttribute("hidetoolbar");
                    if (expandedHeaders2.getAttribute("singleline") != "singleline") checkToolbar();
                  } else {
                    expandedHeaders2.setAttribute("hidetoolbar", "hidetoolbar");
                    if (expandedHeaders2.getAttribute("singleline") != "singleline") checkToolbar();
                  }
                }

                function markToolbar() {
                  if (expandedHeaders2.getAttribute("hidetoolbar") == "hidetoolbar") {
                    compactHeadersHideToolbar.setAttribute("checked",true);
                  } else {
                    compactHeadersHideToolbar.setAttribute("checked",false);
                  }
                }

                function checkHeaders() {
                  expandedHeaders2.setAttribute("persist", "compact; showall; singleline; hidetoolbar");
                  if (expandedHeaders2.getAttribute("showall") == "showall") {
                    compactHeadersViewAll.setAttribute("checked", true);
                  } else {
                    compactHeadersViewNormal.setAttribute("checked", true);
                  }
                  if (expandedHeaders2.getAttribute("compact") == "compact") {
                    checkToolbar();
                    compactHeadersButton.setAttribute("image", "chrome://global/skin/icons/twisty-collapsed.svg");
                    compactHeadersButton.setAttribute("tooltiptext", "Show Details");
                    msgHeaderViewDeck.setAttribute("style", "margin-block: -4px -2px;");
                    hideCryptoBox();
                    hideOverflow();
                    var i;
                    for (i = 1; i < expandedHeaders2.childElementCount; i++) {
                      expandedHeaders2.children[i].setAttribute("persist", "style");
                      expandedHeaders2.children[i].setAttribute("style", "display: none;");
                      if (expandedHeaders2.getAttribute("singleline") == "singleline") singleLine();
                    }
                  } else {
                    checkToolbar();
                    compactHeadersButton.setAttribute("image", "chrome://global/skin/icons/twisty-expanded.svg");
                    compactHeadersButton.setAttribute("tooltiptext", "Hide Details");
                    msgHeaderViewDeck.setAttribute("style", "margin-block: -4px 0px;");
                    showCryptoBox();
                    showOverflow();
                    var i;
                    for (i = 1; i < expandedHeaders2.childElementCount; i++) {
                      expandedHeaders2.children[i].setAttribute("persist", "style");
                      expandedHeaders2.children[i].removeAttribute("style");
                      doubleLine();
                    }
                  }
                }

                function markHeaders() {
                  if (compactHeadersViewAll.getAttribute("checked") == "true") {
                    expandedHeaders2.setAttribute("showall", "showall");
                    if (expandedHeaders2.getAttribute("compact") != "compact") window.MsgViewAllHeaders();
                  } else {
                    expandedHeaders2.removeAttribute("showall");
                    if (expandedHeaders2.getAttribute("compact") != "compact") window.MsgViewNormalHeaders();
                  }
                }

                function toggleHeaders() {
                  switch(expandedHeaders2.getAttribute("compact")) {
                  case "compact": expandedHeaders2.removeAttribute("compact");
                    checkToolbar();
                    compactHeadersButton.setAttribute("image", "chrome://global/skin/icons/twisty-expanded.svg");
                    compactHeadersButton.setAttribute("tooltiptext", "Hide Details");
                    if (expandedHeaders2.getAttribute("showall") == "showall") window.MsgViewAllHeaders();
                    else window.MsgViewNormalHeaders();
                    msgHeaderViewDeck.setAttribute("style", "margin-block: -4px 0px;");
                    showCryptoBox();
                    showOverflow();
                    var i;
                    for (i = 1; i < expandedHeaders2.childElementCount; i++) {
                      expandedHeaders2.children[i].setAttribute("persist", "style");
                      expandedHeaders2.children[i].removeAttribute("style");
                      doubleLine();
                    }
                  break;
                  default: expandedHeaders2.setAttribute("compact", "compact");
                    checkToolbar();
                    compactHeadersButton.setAttribute("image", "chrome://global/skin/icons/twisty-collapsed.svg");
                    compactHeadersButton.setAttribute("tooltiptext", "Show Details");
                    window.MsgViewNormalHeaders();
                    msgHeaderViewDeck.setAttribute("style", "margin-block: -4px -2px;");
                    hideCryptoBox();
                    hideOverflow();
                    var i;
                    for (i = 1; i < expandedHeaders2.childElementCount; i++) {
                      expandedHeaders2.children[i].setAttribute("persist", "style");
                      expandedHeaders2.children[i].setAttribute("style", "display: none;");
                      if (expandedHeaders2.getAttribute("singleline") == "singleline") singleLine();
                    }
                  }
                }

                function checkToolbar() {
                  expandedHeadersTopBox.setAttribute("style", "min-height: 30px;");
                  if (xulAppInfo.OS == "WINNT") {
                    expandedHeadersTopBox.setAttribute("style", "min-height: 32px;");
                  }
                  if (expandedHeaders2.getAttribute("compact") == "compact") {
                    if (expandedHeaders2.getAttribute("hidetoolbar") == "hidetoolbar") {
                      hideToolbar();
                      //headerViewToolbox.setAttribute("style", "float: inline-start;");
                      //expandedtoLabel.setAttribute("style", "padding-top: 6px; min-width: 35px;");
                    } else {
                      hideToolbar();
                      //headerViewToolbox.removeAttribute("style");
                      headerViewToolbar.setAttribute("style", "margin-block: 4px -2px;");
                      if (expandedtoRow) expandedtoLabel.setAttribute("style", "display: none;");
                      if (expandedtoBox) expandedtoBox.setAttribute("style", "display: none;");
                      if (expandedcontentBaseLabel) expandedcontentBaseLabel.setAttribute("style", "display: none;");
                      if (expandedcontentBaseBox) expandedcontentBaseBox.setAttribute("style", "display: none;");
                    }
                  } else {
                    //headerViewToolbox.removeAttribute("style");
                    showToolbar();
                  }
                }

                function hideToolbar() {
                  headerViewToolbar.setAttribute("style", "display: none;");
                  headerViewToolbox.append(expandedtoRow);
                  if (expandedtoLabel) expandedtoLabel.setAttribute("style", "padding-top: 6px;");
                  if (expandedtoBox) expandedtoBox.setAttribute("style", "padding-top: 7px;");
                  if (xulAppInfo.OS == "WINNT") {
                    if (expandedtoLabel) expandedtoLabel.setAttribute("style", "padding-top: 5px;");
                    if (expandedtoBox) expandedtoBox.setAttribute("style", "padding-top: 5px;");
                  }
                  headerViewToolbox.append(expandedcontentBaseRow);
                  if (expandedcontentBaseLabel) expandedcontentBaseLabel.setAttribute("style", "padding-top: 6px;");
                  if (expandedcontentBaseBox) expandedcontentBaseBox.setAttribute("style", "padding: 7px 4px 0 0 !important;");
                  if (xulAppInfo.OS == "WINNT") {
                    if (expandedcontentBaseLabel) expandedcontentBaseLabel.setAttribute("style", "padding-top: 5px;");
                    if (expandedcontentBaseBox) expandedcontentBaseBox.setAttribute("style", "padding: 6px 6px 0 0 !important;");
                  }
                }

                function showToolbar() {
                  headerViewToolbar.setAttribute("style", "margin-block: 4px auto;");
                  if (expandedsubjectRow) expandedsubjectRow.insertAdjacentElement("afterend", expandedtoRow);
                  if (expandedtoLabel) expandedtoLabel.removeAttribute("style");
                  if (expandedtoBox) expandedtoBox.removeAttribute("style");
                  expandedHeaders2.append(expandedcontentBaseRow);
                  if (expandedcontentBaseLabel) expandedcontentBaseLabel.removeAttribute("style");
                  if (expandedcontentBaseBox) expandedcontentBaseBox.removeAttribute("style");
                }

                function hideCryptoBox() {
                  let cryptoBox = window.document.getElementById("cryptoBox");
                  if (cryptoBox) cryptoBox.setAttribute("style", "display: none;")
                }

                function showCryptoBox() {
                  let cryptoBox = window.document.getElementById("cryptoBox");
                  if (cryptoBox) cryptoBox.removeAttribute("style")
                }

                function hideOverflow() {
                  let expandedsubjectBox = window.document.getElementById("expandedsubjectBox");
                  if (expandedsubjectBox) expandedsubjectBox.setAttribute("style", "overflow: hidden;\
                    text-overflow: ellipsis; white-space: nowrap; width: -moz-fit-content;");
                  //let tooltiptext = expandedsubjectBox.getAttribute("aria-label");
                  //expandedsubjectBox.setAttribute("tooltiptext", tooltiptext);
                }

                function showOverflow() {
                  let expandedsubjectBox = window.document.getElementById("expandedsubjectBox");
                  if (expandedsubjectBox) expandedsubjectBox.removeAttribute("style");
                  //expandedsubjectBox.removeAttribute("tooltiptext");
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
    let msgHeaderViewDeck = window.document.getElementById("msgHeaderViewDeck");
    if (msgHeaderViewDeck) msgHeaderViewDeck.removeAttribute("style");
    if (msgHeaderViewDeck) msgHeaderViewDeck.removeEventListener("dblclick", doToggle);

    let headerViewToolbar = window.document.getElementById("header-view-toolbar");
    if (headerViewToolbar) headerViewToolbar.removeAttribute("style");

    let expandedsubjectRow = window.document.getElementById("expandedsubjectRow");
    let expandedtoRow = window.document.getElementById("expandedtoRow");
    if (expandedsubjectRow) {
      if (expandedtoRow) {
        expandedsubjectRow.insertAdjacentElement("afterend", expandedtoRow);
        expandedtoRow.removeAttribute("style");
      }
    }

    let expandedtoLabel = window.document.getElementById("expandedtoLabel");
    if (expandedtoLabel) expandedtoLabel.removeAttribute("style");

    let expandedtoBox = window.document.getElementById("expandedtoBox");
    if (expandedtoBox) expandedtoBox.removeAttribute("style");

    let expandedcontentBaseLabel = window.document.getElementById("expandedcontent-baseLabel");
    if (expandedcontentBaseLabel) expandedcontentBaseLabel.removeAttribute("style");

    let expandedcontentBaseBox = window.document.getElementById("expandedcontent-baseBox");
    if (expandedcontentBaseBox) expandedcontentBaseBox.removeAttribute("style");

    let cryptoBox = window.document.getElementById("cryptoBox");
    if (cryptoBox) cryptoBox.removeAttribute("style")

    let expandedHeadersTopBox = window.document.getElementById("expandedHeadersTopBox");
    if (expandedHeadersTopBox) expandedHeadersTopBox.removeAttribute("style");

    let expandedHeadersBottomBox = window.document.getElementById("expandedHeadersBottomBox");
    if (expandedHeadersBottomBox) expandedHeadersBottomBox.removeAttribute("style");

    let expandedBoxSpacer = window.document.getElementById("expandedBoxSpacer");
    if (expandedBoxSpacer) expandedBoxSpacer.removeAttribute("style");

    let headerViewToolbox = window.document.getElementById("header-view-toolbox");
    if (headerViewToolbox) headerViewToolbox.removeAttribute("style");

    let expandedHeadersBox = window.document.getElementById("expandedHeadersBox");
    if (expandedHeadersBox) expandedHeadersBox.removeAttribute("style");

    let expandedsubjectBox = window.document.getElementById("expandedsubjectBox");
    if (expandedsubjectBox) expandedsubjectBox.removeAttribute("style");

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
    if (compactHeadersButton) compactHeadersButton.remove();

    let compactHeadersBox = window.document.getElementById("compactHeadersBox");
    if (compactHeadersBox) compactHeadersBox.remove();

    let expandedHeaders2 = window.document.getElementById("expandedHeaders2");
    let expandedcontentBaseRow = window.document.getElementById("expandedcontent-baseRow");
    if (expandedHeaders2) {
      var i;
      for (i = 1; i < expandedHeaders2.childElementCount; i++) {
        expandedHeaders2.children[i].setAttribute("persist", "style");
        expandedHeaders2.children[i].removeAttribute("style");
      }
      if (expandedcontentBaseRow) expandedHeaders2.append(expandedcontentBaseRow);
    }
  }

  for (let window of Services.wm.getEnumerator("mail:messageWindow")) {
    let msgHeaderViewDeck = window.document.getElementById("msgHeaderViewDeck");
    if (msgHeaderViewDeck) msgHeaderViewDeck.removeAttribute("style");
    if (msgHeaderViewDeck) msgHeaderViewDeck.removeEventListener("dblclick", doToggle);

    let headerViewToolbar = window.document.getElementById("header-view-toolbar");
    if (headerViewToolbar) headerViewToolbar.removeAttribute("style");

    let expandedsubjectRow = window.document.getElementById("expandedsubjectRow");
    let expandedtoRow = window.document.getElementById("expandedtoRow");
    if (expandedsubjectRow) {
      if (expandedtoRow) {
        expandedsubjectRow.insertAdjacentElement("afterend", expandedtoRow);
        expandedtoRow.removeAttribute("style");
      }
    }

    let expandedtoLabel = window.document.getElementById("expandedtoLabel");
    if (expandedtoLabel) expandedtoLabel.removeAttribute("style");

    let expandedtoBox = window.document.getElementById("expandedtoBox");
    if (expandedtoBox) expandedtoBox.removeAttribute("style");

    let expandedcontentBaseLabel = window.document.getElementById("expandedcontent-baseLabel");
    if (expandedcontentBaseLabel) expandedcontentBaseLabel.removeAttribute("style");

    let expandedcontentBaseBox = window.document.getElementById("expandedcontent-baseBox");
    if (expandedcontentBaseBox) expandedcontentBaseBox.removeAttribute("style");

    let cryptoBox = window.document.getElementById("cryptoBox");
    if (cryptoBox) cryptoBox.removeAttribute("style")

    let expandedHeadersTopBox = window.document.getElementById("expandedHeadersTopBox");
    if (expandedHeadersTopBox) expandedHeadersTopBox.removeAttribute("style");

    let expandedHeadersBottomBox = window.document.getElementById("expandedHeadersBottomBox");
    if (expandedHeadersBottomBox) expandedHeadersBottomBox.removeAttribute("style");

    let expandedBoxSpacer = window.document.getElementById("expandedBoxSpacer");
    if (expandedBoxSpacer) expandedBoxSpacer.removeAttribute("style");

    let headerViewToolbox = window.document.getElementById("header-view-toolbox");
    if (headerViewToolbox) headerViewToolbox.removeAttribute("style");

    let expandedHeadersBox = window.document.getElementById("expandedHeadersBox");
    if (expandedHeadersBox) expandedHeadersBox.removeAttribute("style");

    let expandedsubjectBox = window.document.getElementById("expandedsubjectBox");
    if (expandedsubjectBox) expandedsubjectBox.removeAttribute("style");

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
    if (compactHeadersButton) compactHeadersButton.remove();

    let compactHeadersBox = window.document.getElementById("compactHeadersBox");
    if (compactHeadersBox) compactHeadersBox.remove();

    let expandedHeaders2 = window.document.getElementById("expandedHeaders2");
    let expandedcontentBaseRow = window.document.getElementById("expandedcontent-baseRow");
    if (expandedHeaders2) {
      var i;
      for (i = 1; i < expandedHeaders2.childElementCount; i++) {
        expandedHeaders2.children[i].setAttribute("persist", "style");
        expandedHeaders2.children[i].removeAttribute("style");
      }
      if (expandedcontentBaseRow) expandedHeaders2.append(expandedcontentBaseRow);
    }
  }
  ExtensionSupport.unregisterWindowListener("compactHeadersListener");
  console.log("Compact Headers disabled");
  }
};
