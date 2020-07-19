//Element IDs to be collapsed
var idList = [
  "messengerBox",
  "displayDeck",
  "threadContentArea",
  //"messagepanebox",
  "folderPaneBox",
  "msgHeaderView",
  "attachmentView",
  //"folderpane_splitter",
  //"threadpane-splitter",
  "today-pane-panel" //lightning
];

//User defined element IDs to be collapsed
var collapseList = [];
var prefs = [];

var colMsgPane = false; //wheather the message pane is collapsed or not in previous setting.
var isMaxMsgPane = false; //wheather the message pane is maximized.
var delaySettings = false;
var curTabId = null;
var eventListenerRegistered = false;

function doMMPToolbarCommand(cmd) {
  switch (cmd) {
    case "MP":
      doMMPCommand("cmd_max-msg-pane");
      break;
    case "FP":
      doMMPCommand("cmd_toggle-folder-pane");
      break;
    case "TP":
      doMMPCommand("cmd_toggle-msg-pane");
      break;
    default:
      doMMPCommand("cmd_max-msg-pane");
      break;
  }
}

async function doMMPCommand(command) {
  let mailTabs = await browser.mailTabs.query({
    active: true,
    currentWindow: true
  });

  let state = false;
  if (mailTabs.length > 0) {
    switch (command) {
      case "cmd_max-msg-pane":
        toggleMaxMessagePane();
        break;
      case "cmd_toggle-folder-pane":
        state = mailTabs[0].folderPaneVisible;
        browser.mailTabs.update(mailTabs[0].id, {
          folderPaneVisible: !state
        });

        if (state) {
          browser.maxMsgPaneApi.setFocusThreadPane();
        }
        break;
      case "cmd_toggle-msg-pane":
        state = mailTabs[0].messagePaneVisible;
        browser.mailTabs.update(mailTabs[0].id, {
          messagePaneVisible: !state
        });
        break;
      default:
        break;
    }
  }
}

//main toolbar button
browser.browserAction.onClicked.addListener(() => {
  doMMPToolbarCommand(prefs["toolbar_cmd"]);
});

//message display toolbar button
browser.messageDisplayAction.onClicked.addListener((tab, info) => {
  doMMPToolbarCommand(prefs["toolbar_cmd"]);
});

//keyboard shortcut
browser.commands.onCommand.addListener((command) => {
  doMMPCommand(command);
});

async function init() {
  await loadPrefs();

  browser.storage.onChanged.addListener((changes, area) => {
    if (isMaxMsgPane) {
      delaySettings = true;
    } else {
      let changedItems = Object.keys(changes);
      for (let item of changedItems) {
        prefs[item] = changes[item].newValue;
      }
      rebuildCollapseList();
      registerEventListener(prefs["use_splitters"] || prefs["use_msgheader"]);
    }
  });
}

async function loadPrefs() {
  let result = await browser.storage.local.get("toolbar_cmd");
  prefs["toolbar_cmd"] = result.toolbar_cmd ? result.toolbar_cmd : "MP";

  result = await browser.storage.local.get("col_header");
  prefs["col_header"] = result.col_header;

  result = await browser.storage.local.get("col_folder");
  prefs["col_folder"] = result.col_folder;

  result = await browser.storage.local.get("col_ltn");
  prefs["col_ltn"] = result.col_ltn;

  result = await browser.storage.local.get("col_attach");
  prefs["col_attach"] = result.col_attach;

  result = await browser.storage.local.get("col_other_en");
  prefs["col_other_en"] = result.col_other_en;

  result = await browser.storage.local.get("col_other_elems");
  prefs["col_other_elems"] = result.col_other_elems;

  rebuildCollapseList();

  result = await browser.storage.local.get("use_splitters");
  prefs["use_splitters"] = result.use_splitters;

  result = await browser.storage.local.get("use_msgheader");
  prefs["use_msgheader"] = result.use_msgheader;
  registerEventListener(prefs["use_splitters"] || prefs["use_msgheader"]);
}

function registerEventListener(register) {
  if (register && !eventListenerRegistered) {
    browser.maxMsgPaneApi.onDblClick.addListener(eventListenerCallback);
    eventListenerRegistered = true;
  } else if (!register && eventListenerRegistered) {
    browser.maxMsgPaneApi.onDblClick.removeListener(eventListenerCallback);
    eventListenerRegistered = false
  }
}

function eventListenerCallback(elementId, x, y) {
  switch (elementId) {
    case "folderpane_splitter":
      if (prefs["use_splitters"]) doMMPToolbarCommand("FP");
      break;
    case "threadpane-splitter":
      if (prefs["use_splitters"]) {
        if (isMaxMsgPane) {
          doMMPToolbarCommand("MP");
        } else {
          doMMPToolbarCommand("TP");
        }
      }
      break;
    case "msgHeaderView":
      if (prefs["use_msgheader"]) doMMPToolbarCommand("MP");
      break;
    default:
      break;
  }
}

function rebuildCollapseList() {
  collapseList = [];
  for (let i = 0; i < idList.length; i++) {
    let elem = new Array(2);
    elem[0] = false;
    elem[1] = true;
    collapseList[idList[i]] = elem;
  }

  if (prefs["col_other_en"] && prefs["col_other_elems"]) {
    let usrIdListPref = prefs["col_other_elems"].replace(/\s/g, "");
    let usrIdList = usrIdListPref.split(",");
    for (let i = 0; i < usrIdList.length; i++) {
      let elem = new Array(2);
      elem[0] = false;
      elem[1] = true;
      collapseList[usrIdList[i]] = elem;
    }
  }

  collapseList["folderPaneBox"][1] = prefs["col_folder"];
  collapseList["msgHeaderView"][1] = prefs["col_header"];
  collapseList["attachmentView"][1] = prefs["col_attach"];
  collapseList["today-pane-panel"][1] = prefs["col_ltn"];
}

async function toggleMaxMessagePane() {
  let hideFunc = async function (tab, message) {
    hideComponentsAgain();
  }

  let restoreByTabSwitchFunc = async function (activeInfo) {
    if (activeInfo.tabId == curTabId && isMaxMsgPane) {
      toggleMaxMessagePane();
    }
  }

  let restoreByFolderFunc = async function (tab, displayedFolder) {
    let tabId = tab.id ? tab.id : tab; //tab is tabId in TB68; mailTab object in TB76.
    if (curTabId == tabId && isMaxMsgPane) {
      toggleMaxMessagePane();
    }
  }

  if (isMaxMsgPane) { // restore maximize
    browser.messageDisplay.onMessageDisplayed.removeListener(hideFunc);
    browser.mailTabs.onDisplayedFolderChanged.removeListener(restoreByFolderFunc);
    browser.tabs.onActivated.removeListener(restoreByTabSwitchFunc);
    await restorePanes();
    await browser.maxMsgPaneApi.setFocusThreadPane();
  } else { // maximize
    await maximizeMessagePane();
    if (isMaxMsgPane) { //toggled
      browser.messageDisplay.onMessageDisplayed.addListener(hideFunc);
      browser.mailTabs.onDisplayedFolderChanged.addListener(restoreByFolderFunc);
      browser.tabs.onActivated.addListener(restoreByTabSwitchFunc);
    }
  }
}

async function hideComponentsAgain() {
  if (isMaxMsgPane) {
    if (prefs["col_attach"]) {
      let ret = await browser.maxMsgPaneApi.collapse("attachmentView", true);
      //update collapseList for the new message
      if (ret) {
        collapseList["attachmentView"][0] = false;
      } else {
        collapseList["attachmentView"][0] = true;
      }
    }
    //headers view
    if (prefs["col_header"]) {
      let ret = browser.maxMsgPaneApi.collapse("msgHeaderView", true);
      //update collapseList for the new message
      if (ret) {
        collapseList["msgHeaderView"][0] = false;
      } else {
        collapseList["msgHeaderView"][0] = true;
      }
    }
  }
}

async function maximizeMessagePane() {
  var paneConfig = await getCurrentLayout();
  //  var threadPaneBox = document.getElementById("threadPaneBox");

  //unable to maximize if folderpane exists on wide pane layout
  if (paneConfig == "wide" && !collapseList["folderPaneBox"][1]) {
    return false;
  }

  await updateCollapseList(paneConfig);
  await browser.maxMsgPaneApi.setFlex("messagepanebox", 1);
  await browser.maxMsgPaneApi.setFlex("mailContent", 1);
  await collapse(true);

  if (paneConfig == "wide") {
    await browser.maxMsgPaneApi.setFlex("mailContent", 0);
  }

  let mailTabs = await browser.mailTabs.query({
    active: true,
    currentWindow: true
  });

  if (mailTabs.length > 0 && !mailTabs[0].messagePaneVisible) {
    browser.mailTabs.update(mailTabs[0].id, {
      messagePaneVisible: true
    });
    colMsgPane = true;
  } else {
    colMsgPane = false;
  }

  if (mailTabs.length > 0) {
    curTabId = mailTabs[0].id;
  } else {
    curTabId = null;
  }

  isMaxMsgPane = true;
}

async function restorePanes() {
  await collapse(false);

  await browser.maxMsgPaneApi.setFlex("mailContent", 1);

  if (colMsgPane) await doMMPCommand("cmd_toggle-msg-pane");

  let layout = await getCurrentLayout();
  if (layout == "standard") {
    await browser.maxMsgPaneApi.setFlex("messagepanebox", 1);
  }

  isMaxMsgPane = false;

  if (delaySettings) {
    await loadPrefs();
    delaySettings = false;
  }
}

async function collapse(maximize) {
  let index = maximize ? 1 : 0;
  let id;
  for (id in collapseList) {
    if (!collapseList[id][1]) continue;
    try {
      await browser.maxMsgPaneApi.collapse(id, (collapseList[id][index] == true));
    } catch (e) {}
  }
}

async function updateCollapseList(paneConfig) {
  //save current status
  var id;
  for (id in collapseList) {
    var elem = collapseList[id];
    if (!elem[1]) continue;
    elem[0] = await browser.maxMsgPaneApi.isCollapsed(id);
  }

  if (paneConfig == "wide") {
    collapseList["messengerBox"][1] = true;
    collapseList["displayDeck"][1] = false;
  } else if (paneConfig == "vertical") {
    collapseList["threadContentArea"][1] = true;
    collapseList["messengerBox"][1] = false;
    collapseList["displayDeck"][1] = false;
  } else if (paneConfig == "standard") {
    collapseList["messengerBox"][1] = false;
    collapseList["displayDeck"][1] = true;
  }
}

async function getCurrentLayout() {
  let tabs = await browser.mailTabs.query({
    active: true,
    currentWindow: true
  });

  return tabs.length > 0 ? tabs[0].layout : "";
}

init();
