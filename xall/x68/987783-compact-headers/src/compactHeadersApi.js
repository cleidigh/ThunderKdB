var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
var { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var xulAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);

let doToggle = undefined; //declare it here to make removeEventlistener work
let popupEvent = undefined;
let mhcToolbarPopup = undefined;
let mhcToolbarPopupMenuItem = undefined;
let mhcToolbarBackup = undefined;
let mhcPopupCustomToolbarMSG = undefined;

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
                let expandedHeaders = window.document.getElementById("expandedHeaders");
                let expandedHeaders2 = window.document.getElementById("expandedHeaders2");
                let otherActionsBox = window.document.getElementById("otherActionsBox");
                let mailContext = window.document.getElementById("mailContext");
                let menu_HeadersPopup = window.document.getElementById("menu_HeadersPopup");

                let compactHeadersPopup = window.document.createXULElement("menupopup");
                compactHeadersPopup.id = "compactHeadersPopup";

                let expandedHeaders3 = window.document.createXULElement("html:table");
                expandedHeaders3.id = "expandedHeaders3";
                expandedHeaders3.setAttribute("style","display: inline-grid;");
                if (expandedHeaders) expandedHeaders.insertAdjacentElement("afterend", expandedHeaders3);

                let expandedHeaders4 = window.document.createXULElement("html:table");
                expandedHeaders4.id = "expandedHeaders4";
                expandedHeaders4.setAttribute("style","display: inline-grid;");
                if (expandedHeaders3) expandedHeaders3.insertAdjacentElement("afterend", expandedHeaders4);

                let expandedHeaders5 = window.document.createXULElement("html:table");
                expandedHeaders5.id = "expandedHeaders5";
                expandedHeaders5.setAttribute("style","display: grid; float: inline-end; margin-inline-end: 10px;");
                if (expandedHeaders4) expandedHeaders4.insertAdjacentElement("afterend", expandedHeaders5);

                let compactHeadersSingleLine = window.document.createXULElement("menuitem");
                compactHeadersSingleLine.id = "compactHeadersSingleLine";
                compactHeadersSingleLine.setAttribute("type", "checkbox");
                compactHeadersSingleLine.setAttribute("label", "Single Line Headers");
                compactHeadersSingleLine.setAttribute("tooltiptext", "Display compact headers on a single line (only author and subject)");
                compactHeadersSingleLine.addEventListener("command", () => setLines());

                let compactHeadersHideToolbar = window.document.createXULElement("menuitem");
                compactHeadersHideToolbar.id = "compactHeadersHideToolbar";
                compactHeadersHideToolbar.setAttribute("type", "checkbox");
                compactHeadersHideToolbar.setAttribute("label", "Hide Header Toolbar");
                compactHeadersHideToolbar.setAttribute("tooltiptext", "Hides the header toolbar \
and, when reading \r\nnews feeds, replaces it with the link to the \r\nwebsite (only in compact double line mode)");
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
                compactHeadersSeparator.id = "compactHeadersSeparator";

                let compactHeadersHideHeaders = window.document.createXULElement("menuitem");
                compactHeadersHideHeaders.id = "compactHeadersHideHeaders";
                compactHeadersHideHeaders.addEventListener("command", () => hideHeaders());

                let compactHeadersSeparator2 = window.document.createXULElement("menuseparator");
                compactHeadersSeparator2.id = "compactHeadersSeparator2";

                let compactHeadersSeparator3 = window.document.createXULElement("menuseparator");
                compactHeadersSeparator3.id = "compactHeadersSeparator3";

                let compactHeadersHideHeaders2 = window.document.createXULElement("menuitem");
                compactHeadersHideHeaders2.id = "compactHeadersHideHeaders2";
                compactHeadersHideHeaders2.addEventListener("command", () => hideHeaders());

                let msgHeaderView = window.document.getElementById("msgHeaderView");
                msgHeaderView.setAttribute("context", "compactHeadersPopup");

                popupEvent = (event) => {
                  mhcToolbarPopup = window.document.getElementById("mhcToolbarPopup");
                  mhcPopupCustomToolbarMSG = window.document.getElementById("mhcPopupCustomToolbarMSG");
                  if (mhcToolbarPopup) {
                    mhcToolbarPopupMenuItem = mhcToolbarPopup.firstChild;
                    compactHeadersHideToolbar.insertAdjacentElement("afterend", compactHeadersSeparator3);
                    compactHeadersSeparator3.insertAdjacentElement("afterend", mhcToolbarPopupMenuItem);
                    mhcToolbarBackup = window.mainPopupSet.removeChild(mhcToolbarPopup);
                    expandedHeadersTopBox.setAttribute("context", "compactHeadersPopup");
                  }
                };
                window.addEventListener('DOMContentLoaded', popupEvent);

                let expandedsubjectRow = window.document.getElementById("expandedsubjectRow");
                let expandedreplytoRow = window.document.getElementById("expandedreply-toRow");

                let expandedtoRow = window.document.getElementById("expandedtoRow");
                if (expandedtoRow) expandedtoRow.removeAttribute("style");
                let expandedtoLabel = window.document.getElementById("expandedtoLabel");
                let expandedtoBox = window.document.getElementById("expandedtoBox");

                let expandedccRow = window.document.getElementById("expandedccRow");
                if (expandedccRow) expandedccRow.removeAttribute("style");
                let expandedccLabel = window.document.getElementById("expandedccLabel");
                let expandedccBox = window.document.getElementById("expandedccBox");

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

                mailContext.append(compactHeadersHideHeaders);
                menu_HeadersPopup.append(compactHeadersSeparator2);
                menu_HeadersPopup.append(compactHeadersHideHeaders2);

                compactHeadersButton.addEventListener("command", () => toggleHeaders());
                compactHeadersBox.append(compactHeadersButton);
                msgHeaderViewDeck.parentNode.insertBefore(compactHeadersBox, msgHeaderViewDeck);

                doToggle = () => toggleHeaders();
                msgHeaderViewDeck.addEventListener("dblclick", doToggle);

                function singleLine() {
                  expandedHeaders.removeAttribute("style");
                  expandedHeadersTopBox.setAttribute("style", "padding: 8px 0px 2px; height: 0px; min-width: -moz-fit-content;");
                  expandedHeadersBottomBox.setAttribute("style", "padding: 8px 0px 2px; height: 0px; width: -moz-available;");
                  if (xulAppInfo.OS == "WINNT") {
                    expandedHeadersTopBox.setAttribute("style", "padding: 6px 0px 2px; height: 0px; min-width: -moz-fit-content;");
                    expandedHeadersBottomBox.setAttribute("style", "padding: 6px 0px 2px; height: 0px; width: -moz-available;");
                  }
                  expandedBoxSpacer.setAttribute("style", "display: none;");
                  headerViewToolbox.setAttribute("style", "display: none;");
                  expandedHeadersBox.setAttribute("style", "-moz-box-orient: horizontal; display: flex;");
                  if (expandedtoLabel) expandedtoLabel.setAttribute("style", "display: none;");
                  if (expandedtoBox) expandedtoBox.setAttribute("style", "display: none;");
                  if (expandedccLabel) expandedccLabel.setAttribute("style", "display: none;");
                  if (expandedccBox) expandedccBox.setAttribute("style", "display: none;");
                  if (expandedcontentBaseLabel) expandedcontentBaseLabel.setAttribute("style", "display: none;");
                  if (expandedcontentBaseBox) expandedcontentBaseBox.setAttribute("style", "display: none;");
                }

                function doubleLine() {
                  expandedHeadersTopBox.setAttribute("style", "min-height: 30px; overflow: hidden;\
                    text-overflow: ellipsis; white-space: nowrap;");
                  expandedHeadersBottomBox.removeAttribute("style");
                  expandedBoxSpacer.setAttribute("style", "height: 8px;");
                  if (xulAppInfo.OS == "WINNT") {
                    expandedHeadersTopBox.setAttribute("style", "min-height: 32px; overflow: hidden;\
                      text-overflow: ellipsis; white-space: nowrap;");
                    expandedBoxSpacer.setAttribute("style", "height: 6px;");
                    expandedHeadersBottomBox.setAttribute("style", "margin-top: -3px;");
                  }
                  headerViewToolbox.removeAttribute("style");
                  expandedHeadersBox.removeAttribute("style");
                  if (expandedtoLabel) expandedtoLabel.removeAttribute("style");
                  if (expandedtoBox) expandedtoBox.removeAttribute("style");
                  if (expandedccLabel) expandedccLabel.removeAttribute("style");
                  if (expandedccBox) expandedccBox.removeAttribute("style");
                  if (expandedcontentBaseLabel) expandedcontentBaseLabel.removeAttribute("style");
                  if (expandedcontentBaseBox) expandedcontentBaseBox.removeAttribute("style");
                }

                function setLines() {
                  if (expandedHeaders2.getAttribute("compact") == "compact") window.gDBView.reloadMessage();
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
                  if (expandedHeaders2.getAttribute("singleline") != "singleline") {
                    if (expandedHeaders2.getAttribute("compact") == "compact") window.gDBView.reloadMessage();
                  }
                  if (expandedHeaders2.getAttribute("hidetoolbar") == "hidetoolbar") {
                    expandedHeaders2.removeAttribute("hidetoolbar");
                    if (expandedHeaders2.getAttribute("singleline") != "singleline") {
                      checkToolbar();
                    }
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

                function hideHeaders() {
                  if (expandedHeaders2.getAttribute("hideheaders") == "hideheaders") {
                    compactHeadersHideHeaders.setAttribute("label", "Hide Headers");
                    compactHeadersHideHeaders2.setAttribute("label", "Hide Headers");
                    msgHeaderView.removeAttribute("style");
                    expandedHeaders2.removeAttribute("hideheaders");
                  } else {
                    compactHeadersHideHeaders.setAttribute("label", "Show Headers");
                    compactHeadersHideHeaders2.setAttribute("label", "Show Headers");
                    msgHeaderView.setAttribute("style", "visibility: collapse;");
                    expandedHeaders2.setAttribute("hideheaders", "hideheaders");
                  }
                }

                function checkHeaders() {
                  expandedHeaders2.setAttribute("persist", "compact; showall; singleline; hidetoolbar; hideheaders");
                  if (expandedHeaders2.getAttribute("showall") == "showall") {
                    compactHeadersViewAll.setAttribute("checked", true);
                  } else {
                    compactHeadersViewNormal.setAttribute("checked", true);
                  }

                  if (expandedHeaders2.getAttribute("hideheaders") == "hideheaders") {
                    compactHeadersHideHeaders.setAttribute("label", "Show Headers");
                    compactHeadersHideHeaders2.setAttribute("label", "Show Headers");
                    msgHeaderView.setAttribute("style", "visibility: collapse;");
                  } else {
                    compactHeadersHideHeaders.setAttribute("label", "Hide Headers");
                    compactHeadersHideHeaders2.setAttribute("label", "Hide Headers");
                    msgHeaderView.removeAttribute("style");
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
                    expandedtoBox.firstChild.removeAttribute("style");
                    expandedccBox.firstChild.removeAttribute("style");
                    expandedtoBox.lastChild.removeEventListener("click", doToggle);
                    expandedccBox.lastChild.removeEventListener("click", doToggle);
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
                    expandedtoBox.firstChild.setAttribute("style", "overflow-x: hidden;");
                    expandedccBox.firstChild.setAttribute("style", "overflow-x: hidden;");
                    expandedtoBox.lastChild.addEventListener("click", doToggle);
                    expandedccBox.lastChild.addEventListener("click", doToggle);
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
                  expandedHeadersTopBox.setAttribute("style", "min-height: 30px;overflow: hidden;text-overflow: ellipsis;white-space: nowrap;");
                  if (xulAppInfo.OS == "WINNT") {
                    expandedHeadersTopBox.setAttribute("style", "min-height: 32px;overflow: hidden;text-overflow: ellipsis;white-space: nowrap;");
                  }
                  if (expandedHeaders2.getAttribute("compact") == "compact") {
                    if (expandedHeaders2.getAttribute("hidetoolbar") == "hidetoolbar") {
                      hideToolbar();
                    } else {
                      hideToolbar();
                      headerViewToolbar.setAttribute("style", "margin-block: 4px -2px;");
                      //if (expandedtoRow) expandedtoLabel.setAttribute("style", "display: none;");
                      //if (expandedtoBox) expandedtoBox.setAttribute("style", "display: none;");
                      //if (expandedccRow) expandedccLabel.setAttribute("style", "display: none;");
                      //if (expandedccBox) expandedccBox.setAttribute("style", "display: none;");
                      if (expandedcontentBaseLabel) expandedcontentBaseLabel.setAttribute("style", "display: none;");
                      if (expandedcontentBaseBox) expandedcontentBaseBox.setAttribute("style", "display: none;");
                    }
                  } else {
                    showToolbar();
                  }
                }

                function hideToolbar() {
                  headerViewToolbar.setAttribute("style", "display: none;");
                  if (expandedtoRow) expandedHeaders3.append(expandedtoRow);
                  if (expandedtoLabel) expandedtoLabel.setAttribute("style", "padding: 0;");
                  if (expandedtoBox) expandedtoBox.setAttribute("style", "padding: 0;");

                  if (expandedccRow) expandedHeaders4.append(expandedccRow);
                  if (expandedccLabel) expandedccLabel.setAttribute("style", "padding: 0;");
                  if (expandedccBox) expandedccBox.setAttribute("style", "padding: 0;");

                  if (expandedcontentBaseRow) expandedHeaders5.append(expandedcontentBaseRow);
                  if (expandedcontentBaseLabel) expandedcontentBaseLabel.setAttribute("style", "padding: 0;");
                  if (expandedcontentBaseBox) expandedcontentBaseBox.setAttribute("style", "padding: 0 !important;");
                }

                function showToolbar() {
                  headerViewToolbar.setAttribute("style", "margin-block: 4px auto;");
                  if (expandedsubjectRow) expandedsubjectRow.insertAdjacentElement("afterend", expandedtoRow);
                  if (expandedtoLabel) expandedtoLabel.removeAttribute("style");
                  if (expandedtoBox) expandedtoBox.removeAttribute("style");

                  if (expandedreplytoRow) expandedreplytoRow.insertAdjacentElement("afterend", expandedccRow);
                  if (expandedccLabel) expandedccLabel.removeAttribute("style");
                  if (expandedccBox) expandedccBox.removeAttribute("style");

                  if (expandedcontentBaseRow) expandedHeaders2.append(expandedcontentBaseRow);
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

    let expandedreplytoRow = window.document.getElementById("expandedreply-toRow");
    let expandedccRow = window.document.getElementById("expandedccRow");
    if (expandedreplytoRow) {
      if (expandedccRow) {
        expandedreplytoRow.insertAdjacentElement("afterend", expandedccRow);
        expandedccRow.removeAttribute("style");
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

    let compactHeadersHideHeaders = window.document.getElementById("compactHeadersHideHeaders");
    if (compactHeadersHideHeaders) compactHeadersHideHeaders.remove();

    let compactHeadersSeparator2 = window.document.getElementById("compactHeadersSeparator2");
    if (compactHeadersSeparator2) compactHeadersSeparator2.remove();

    let compactHeadersHideHeaders2 = window.document.getElementById("compactHeadersHideHeaders2");
    if (compactHeadersHideHeaders2) compactHeadersHideHeaders2.remove();

    let msgHeaderView = window.document.getElementById("msgHeaderView");
    if (msgHeaderView) msgHeaderView.removeAttribute("style");

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

    let expandedHeaders3 = window.document.getElementById("expandedHeaders3");
    if (expandedHeaders3) expandedHeaders3.remove();

    let expandedHeaders4 = window.document.getElementById("expandedHeaders4");
    if (expandedHeaders4) expandedHeaders4.remove();

    let expandedHeaders5 = window.document.getElementById("expandedHeaders5");
    if (expandedHeaders5) expandedHeaders5.remove();

    if (mhcToolbarBackup) mhcToolbarPopup = mhcToolbarBackup;
    mhcToolbarPopup.append(mhcToolbarPopupMenuItem);
    window.mainPopupSet.append(mhcToolbarPopup);
    expandedHeadersTopBox.setAttribute("context", "mhcToolbarPopup");
    window.removeEventListener('DOMContentLoaded', popupEvent);
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

    let expandedreplytoRow = window.document.getElementById("expandedreply-toRow");
    let expandedccRow = window.document.getElementById("expandedccRow");
    if (expandedreplytoRow) {
      if (expandedccRow) {
        expandedreplytoRow.insertAdjacentElement("afterend", expandedccRow);
        expandedccRow.removeAttribute("style");
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

    let compactHeadersHideHeaders = window.document.getElementById("compactHeadersHideHeaders");
    if (compactHeadersHideHeaders) compactHeadersHideHeaders.remove();

    let compactHeadersSeparator2 = window.document.getElementById("compactHeadersSeparator2");
    if (compactHeadersSeparator2) compactHeadersSeparator2.remove();

    let compactHeadersHideHeaders2 = window.document.getElementById("compactHeadersHideHeaders2");
    if (compactHeadersHideHeaders2) compactHeadersHideHeaders2.remove();

    let msgHeaderView = window.document.getElementById("msgHeaderView");
    if (msgHeaderView) msgHeaderView.removeAttribute("style");

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

    let expandedHeaders3 = window.document.getElementById("expandedHeaders3");
    if (expandedHeaders3) expandedHeaders3.remove();

    let expandedHeaders4 = window.document.getElementById("expandedHeaders4");
    if (expandedHeaders4) expandedHeaders4.remove();

    let expandedHeaders5 = window.document.getElementById("expandedHeaders5");
    if (expandedHeaders5) expandedHeaders5.remove();

    if (mhcToolbarBackup) mhcToolbarPopup = mhcToolbarBackup;
    mhcToolbarPopup.append(mhcToolbarPopupMenuItem);
    window.mainPopupSet.append(mhcToolbarPopup);
    expandedHeadersTopBox.setAttribute("context", "mhcToolbarPopup");
    window.removeEventListener('DOMContentLoaded', popupEvent);
  }
  ExtensionSupport.unregisterWindowListener("compactHeadersListener");
  console.log("Compact Headers disabled");
  }
};
