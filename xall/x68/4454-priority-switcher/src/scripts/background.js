var currentMsg = {}; //message in tab or top of selected messages
var messageToBeDeleted = {
  non_priority: [],
  priority: [],
  skipTrash: false
};

var prefs = {
  priorityButtonEn: true,
  deleteButtonEn: true,
  delCheckStar: true,
  delCheckPriority: 2,
  delCheckIgnoreJunk: true,
  autoRewriteMode: 0, //0: no, 1: all, 2: IMAP only
  trashOnRewrite: false,
  readOtherHeaders: false
};

var priorityTable = {
  "p_1": "1",
  "p_2": "2",
  "p_3": "3",
  "p_4": "4",
  "p_5": "5",
  "p_8": "8", //delete command
  "p_high": "1",
  "p_normal": "3",
  "p_low": "5",
  "p_urgent": "1",
  "p_non-urgent": "5",
  "p_delete": "8" //delete command
};

var locales = {};

async function init() {
  browser.browserAction.disable();

  for (let key of Object.keys(prefs)) {
    let result = await browser.storage.local.get(key);
    if (result[key] !== undefined) {
      prefs[key] = result[key];
    }
  }
  
  locales["p_0"] = browser.i18n.getMessage("pswNone");
  locales["p_1"] = browser.i18n.getMessage("pswHighest");
  locales["p_2"] = browser.i18n.getMessage("pswHigh");
  locales["p_3"] = browser.i18n.getMessage("pswNormal");
  locales["p_4"] = browser.i18n.getMessage("pswLow");
  locales["p_5"] = browser.i18n.getMessage("pswLowest");
  locales["p_6"] = browser.i18n.getMessage("pswReset");
  locales["p_7"] = browser.i18n.getMessage("pswRewrite");
  locales["p_8"] = browser.i18n.getMessage("pswDeletePriority");
  locales["p_8s"] = browser.i18n.getMessage("pswDelete");
  
  setToolbarButtonCommand();
  createMenus();
}
init();

browser.storage.onChanged.addListener((changes, area) => {
  let changedItems = Object.keys(changes);
  for (let item of changedItems) {
    prefs[item] = changes[item].newValue;
    if (item == "deleteButtonEn" || item == "priorityButtonEn") {
      currentMsg = {}; //force icon switch
      setToolbarButtonCommand();
    }
  }
});

browser.commands.onCommand.addListener((command) => {
  switch (command) {
    case "cmd_delete":
      doPSWCommand("8", false);
      break;
    case "cmd_delete_skip_trash":
      doPSWCommand("8", true);
      break;
    default: //unknown command
      break;
  }
});

function createMenus() {
  browser.menus.create({
    contexts: ["message_list"],
    id: "psw_highest",
    onclick: () => {
      doPSWCommand("1");
    },
    title: locales["p_1"]
  });

  browser.menus.create({
    contexts: ["message_list"],
    id: "psw_high",
    onclick: () => {
      doPSWCommand("2");
    },
    title: locales["p_2"]
  });

  browser.menus.create({
    contexts: ["message_list"],
    id: "psw_normal",
    onclick: () => {
      doPSWCommand("3");
    },
    title: locales["p_3"]
  });

  browser.menus.create({
    contexts: ["message_list"],
    id: "psw_low",
    onclick: () => {
      doPSWCommand("4");
    },
    title: locales["p_4"]
  });

  browser.menus.create({
    contexts: ["message_list"],
    id: "psw_lowest",
    onclick: () => {
      doPSWCommand("5");
    },
    title: locales["p_5"]
  });

  browser.menus.create({
    contexts: ["message_list"],
    id: "psw_sep",
    type: "separator"
  });

  browser.menus.create({
    contexts: ["message_list"],
    id: "psw_reset",
    onclick: () => {
      doPSWCommand("6");
    },
    title: locales["p_6"]
  });

  browser.menus.create({
    contexts: ["message_list"],
    id: "psw_rewrite",
    onclick: () => {
      doPSWCommand("7");
    },
    title: locales["p_7"]
  });

  browser.menus.create({
    contexts: ["message_list"],
    id: "psw_sep2",
    type: "separator"
  });

  browser.menus.create({
    contexts: ["message_list"],
    id: "psw_delete",
    onclick: (data) => {
      doPSWCommand("8", data.modifiers.indexOf("Shift") != -1);
    },
    title: locales["p_8s"]
  });
}

function setToolbarButtonCommand() {
  if (prefs.priorityButtonEn) {
    browser.browserAction.setPopup({popup: "html/popup.html"});
  } else {
    browser.browserAction.setPopup({popup: ""});
  }
}

browser.browserAction.onClicked.addListener(async (tab, info)=>{
  if (prefs.deleteButtonEn) {
    doPSWCommand("8",info.modifiers.indexOf("Shift") != -1);
  }
});

async function getOriginalPriority(message) {
  let full = await browser.messages.getFull(message.id);
  let hdr = full.headers["x-psw-org"];
  priority = hdr ? hdr[0] : null;

  if (!priority) { //x-psw-org is not recorded
    //find x-priority in source
    let hdr = full.headers["x-priority"];
    priority = hdr ? hdr[0] : null;
  }

  return priority;
}

async function getPriority(message) {
  //get x-priority from nsIMsgDBHdr
  let priority = await browser.prioritySwitcherApi.getDBPriorityForMessage(message.id);
  if (priority) priority = priority.toString();

  //check other headers
  if (prefs.readOtherHeaders && !priority) {
    //check Importance
    let full = await browser.messages.getFull(message.id);
    let hdr = full.headers["importance"];
    priority = hdr ? hdr[0] : null;

    //check Priority
    if (!priority) {
      let hdr = full.headers["priority"];
      priority = hdr ? hdr[0] : null;
    }

    //check X-MSMail-Priority
    if (!priority) {
      let hdr = full.headers["x-msmail-priority"];
      priority = hdr ? hdr[0] : null;
    }
  }

  return priority;
}

function switchButtonIcon(priority) {
  let icon = null;
  let title = locales["p_0"];

  if (!prefs.priorityButtonEn && prefs.deleteButtonEn) {
    priority = "8"; //delete icon
  } else {
    priority = priorityTable["p_" + priority]; //priority icon
  }

  switch (priority) {
    case "1":
      icon = "images/highest.svg";
      title = locales["p_"+priority];
      break;
    case "2":
      icon = "images/high.svg";
      title = locales["p_"+priority];
      break;
    case "3":
      icon = "images/normal.svg";
      title = locales["p_"+priority];
      break;
    case "4":
      icon = "images/low.svg";
      title = locales["p_"+priority];
      break;
    case "5":
      icon = "images/lowest.svg";
      title = locales["p_"+priority];
      break;
    case "8":
      icon = null;
      title = locales["p_"+priority];
      break;
    default:
      icon = "images/normal.svg";
      title = locales["p_0"];
      break;
  }

  browser.browserAction.setTitle({
    title: title
  });

  browser.browserAction.setIcon({
    path: icon
  });
}

browser.mailTabs.onSelectedMessagesChanged.addListener(async (tab, messages) => {
  if (messages.messages.length > 0 && messages.messages[0].id != currentMsg.id) {
    browser.browserAction.enable();
    currentMsg = messages.messages[0];
    let priority = await getPriority(messages.messages[0]);
    switchButtonIcon(priority);
  }
});

browser.messageDisplay.onMessageDisplayed.addListener(async (tab, message) => {
  if (message.id != currentMsg.id) {
    browser.browserAction.enable();
    currentMsg = message;
    let priority = await getPriority(message);
    switchButtonIcon(priority);
  }
});

browser.tabs.onActivated.addListener(async (activeInfo) => {
  let tab = await browser.tabs.get(activeInfo.tabId);
  let message = null;
  try {
    if (tab.mailTab) {
      let msgs = await browser.mailTabs.getSelectedMessages(tab.id);
      message = msgs.messages[0];
    } else {
      message = await browser.messageDisplay.getDisplayedMessage(tab.id);
    }
  } catch (e) {
    console.log("No message is selected and displayed.");
  }

  if (message && message.id != currentMsg.id) {
    browser.browserAction.enable();
    currentMsg = message;
    let priority = await getPriority(message);
    switchButtonIcon(priority);
  } else if (!message) {
    browser.browserAction.disable();
    switchButtonIcon(null);
  }
});


async function deleteWithPriorityCheck(skipTrash) {
  let tabs = await browser.tabs.query({
    active: true,
    currentWindow: true
  });

  let messages = [];
  try {
    if (tabs[0].mailTab) {
      let msgs = await browser.mailTabs.getSelectedMessages(tabs[0].id);
      messages = msgs.messages;
      while (msgs.id) {
        msgs = await browser.messages.continueList(msgs.id);
        messages = messages.concat(msgs.messages);
      }
    } else {
      let msg = await browser.messageDisplay.getDisplayedMessage(tabs[0].id);
      if (msg) messages.push(msg);
    }
  } catch (e) {
    console.log("No message is selected and displayed.");
  }

  if (messages.length > 0) {
    messageToBeDeleted = await sortByStarAndPriority(messages);
    messageToBeDeleted.skipTrash = skipTrash;
    if (messageToBeDeleted.priority.length > 0) {
      //show confirmation and delete
      await browser.windows.create({
        height: 200,
        width: 400,
        url: "html/delete-alert.html",
        type: "popup"
      });
    } else {
      //delete non-priority messages
      browser.messages.delete(messageToBeDeleted.non_priority, skipTrash);
    }
  }
}

async function sortByStarAndPriority(messages) {
  let ret = {
    non_priority: [],
    priority: []
  };

  for (let i = 0; i < messages.length; i++) {
    let msg = messages[i];
    let starred = prefs.delCheckStar && msg.flagged;
    if (prefs.delCheckIgnoreJunk && msg.junk) {
      ret.non_priority.push(msg.id);
    } else if (starred) {
      ret.priority.push(msg.id);
    } else if (prefs.delCheckPriority > 0) {
      let priority = await getPriority(msg);
      priority = priority ? priorityTable["p_" + priority.toLowerCase()] : "3"; //regard none as normal

      if (parseInt(priority) > prefs.delCheckPriority) {
        ret.non_priority.push(msg.id);
      } else {
        ret.priority.push(msg.id);
      }
    } else {
      ret.non_priority.push(msg.id);
    }
  }

  return ret;
}

browser.runtime.onMessage.addListener(async (message) => {
  switch (message.message) {
    case "PRIORITY_CHANGED":
      doPSWCommand(message.priority, false);
      break;
    case "GET_CURRENT_MSG_PRIORITY":
      let val = currentMsg ? await getPriority(currentMsg) : null;
      browser.runtime.sendMessage({
        message: "SEND_CURRENT_MSG_PRIORITY",
        priority: val
      });
      break;
    case "DELETE_CONFIRMED":
      let delMsgs = null;
      if (message.skipPriority) {
        delMsgs = messageToBeDeleted.non_priority;
      } else {
        delMsgs = messageToBeDeleted.non_priority.concat(messageToBeDeleted.priority);
      }
      await browser.messages.delete(delMsgs, messageToBeDeleted.skipTrash);
      break;
    default:
      break;
  }
});

async function doPSWCommand(priority, shiftKey) {
  let tabs = await browser.tabs.query({
    active: true,
    currentWindow: true
  });

  let msgs = [];
  try {
    if (tabs[0].mailTab) {
      let selMsgs = await browser.mailTabs.getSelectedMessages(tabs[0].id);
      msgs = selMsgs.messages;
    } else {
      let msg = await browser.messageDisplay.getDisplayedMessage(tabs[0].id);
      msgs.push(msg);
    }
  } catch (e) {
    console.error("No message is selected. Cannot change priority.");
    priority = null;
  }

  switch (priority) {
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
      await switchPriority(msgs, priority);
      autoRewrite(msgs, priority);
      break;
    case "6":
      await resetPriority(msgs);
      autoRewrite(msgs);
      break;
    case "7":
      rewritePriority(msgs);
      break;
    case "8":
      deleteWithPriorityCheck(shiftKey);
      break;
    default:
      break;
  }
}

async function autoRewrite(msgs, priority) {
  if (prefs.autoRewriteMode == 1) {
    await rewritePriority(msgs, priority);
  } else if (prefs.autoRewriteMode == 2) {
    let type = await getServerType(msgs[0]);
    if (type == "imap") {
      await rewritePriority(msgs, priority);
    }
  }
}

async function getServerType(msg) {
  let folder = msg.folder;
  let accountId = folder.accountId;
  let account = await browser.accounts.get(accountId);

  return account.type;
}

async function switchPriority(msgs, priority) {
  let intPriority = parseInt(priority);
  for (let i = 0; i < msgs.length; i++) {
    let msg = msgs[i];
    await browser.prioritySwitcherApi.switchPriority(msg.id, intPriority);
  }
  switchButtonIcon(priority);
}

async function resetPriority(msgs) {
  for (let i = 0; i < msgs.length; i++) {
    let msg = msgs[i];
    let orgPriority = await getOriginalPriority(msg);
    if (!orgPriority || orgPriority == "none") {
      orgPriority = "-1"; //none
    }

    await switchPriority([msg], orgPriority);
  }
}

async function rewritePriority(msgs, priority) {
  let messageIds = [];
  for (let i = 0; i < msgs.length; i++) {
    let msg = msgs[i];
    let newPriority = priority ? priority : await getPriority(msg);
    if (newPriority == "none") newPriority = null; //X-Priority is not needed

    messageIds.push(msg.id);
    let src = await loadMessageToString(msg.id);
    let hdrs = makeHdrList(src[0], src[2]);
    let newHdrsStr = makeNewHdrSource(hdrs, newPriority, src[2])
    let newSrcStr = newHdrsStr + src[1];
    await browser.prioritySwitcherApi.rewritePriority(msg.id, newSrcStr);
  }

  browser.messages.delete(messageIds, !prefs.trashOnRewrite);
}

async function loadMessageToString(msgId) {
  let src = await browser.messages.getRaw(msgId);

  //search end of header
  let headerEnd = -1;
  let candidates = ["\r\n", "\n\r", "\n", "\r"];
  let i = 0;
  for (; i < candidates.length; i++) {
    let candidate = candidates[i];
    headerEnd = src.indexOf(candidate + candidate);
    if (headerEnd != -1) {
      headerEnd += candidate.length;
      break;
    }
  }

  let ret = null;
  if (headerEnd != -1) {
    let header = src.substring(0, headerEnd);
    let body = src.substring(headerEnd, src.length);
    let delimiter = candidates[i];
    ret = [header, body, delimiter];
  }

  return ret;
}

function makeHdrList(hdrString, delimiter) {
  let hdrs = hdrString.split(delimiter);
  let list = [];
  let keys = [];

  let prevKey = "";
  let hdrIndex = -1;
  for (let i = 0; i < hdrs.length; i++) {
    let hdr = hdrs[i];
    if (hdr.match(/^(\S+:|From \-)\s+(.+)$/)) {
      hdrIndex++;
      list[hdrIndex] = {
        key: RegExp.$1,
        value: RegExp.$2
      };
      keys.push(RegExp.$1);
      prevKey = RegExp.$1;
    } else { //multiline header
      if (hdr != "") list[hdrIndex].value += delimiter + hdr;
    }
  }

  return {
    keys: keys,
    list: list
  };
}

function makeNewHdrSource(hdrs, priority, delimiter) {
  //add Date header if it is missing
  let fromDashIndex = getMessageHeaderIndex(hdrs.keys, "From -");
  if (getMessageHeaderIndex(hdrs.keys, "Date:") == -1 && fromDashIndex != -1) {
    hdrs.list.push({
      key: "Date:",
      value: hdrs.list[fromDashIndex].value
    });
  }

  let orgPriority = "none";
  let xPriorityIndex = getMessageHeaderIndex(hdrs.keys, "X-Priority:");

  if (xPriorityIndex == -1) { //no priority or another priority header
    orgPriority = "none";
    hdrs.list.push({
      key: "X-Priority:",
      value: priority
    });
  } else { //x-priority
    orgPriority = hdrs.list[xPriorityIndex].value;
    hdrs.list[xPriorityIndex].value = priority;
  }


  if (getMessageHeaderIndex(hdrs.keys, "X-PSW-Org:") == -1) {
    hdrs.list.push({
      key: "X-PSW-Org:",
      value: orgPriority
    });
  }

  //Adopt hack in EditMailSubject add-on for Gmail IMAP.
  try {
    let dateIndex = getMessageHeaderIndex(hdrs.keys, "Date:");
    let date = hdrs.list[dateIndex].value;
    date = date.replace(/(\d{2}):(\d{2}):(\d{2})/, (str, p1, p2, p3) => {
      let seconds = parseInt(p3) + 1;
      if (seconds > 59) seconds = 58;
      if (seconds < 10) seconds = "0" + seconds.toString();
      return p1 + ":" + p2 + ":" + seconds
    });
    hdrs.list[dateIndex].value = date;
  } catch (e) {
    console.error(e);
  }

  //change Message-ID. It seems Gmail IMAP cannot replace if the ID is the same.
  let messageIDIndex = getMessageHeaderIndex(hdrs.keys, "message-id:");
  if (messageIDIndex != -1) {
    let messageID = hdrs.list[messageIDIndex].value;
    hdrs.list[messageIDIndex].value = messageID.replace(/\@/, ".psw@");
  }

  let newHdrStr = "";
  for (let i = 0; i < hdrs.list.length; i++) {
    let hdrObj = hdrs.list[i];
    if (hdrObj.value !== null) { // null means the header is not set.
      newHdrStr += hdrObj.key + " " + hdrObj.value + delimiter;
    }
  }

  return newHdrStr;
}

function getMessageHeaderIndex(keys, key) {
  let messageIDIndex = -1;
  for (let i = 0; i < keys.length; i++) {
    let key1 = keys[i];
    if (key1.toLowerCase() == key.toLowerCase()) {
      messageIDIndex = i;
      break;
    }
  }

  return messageIDIndex;
}
