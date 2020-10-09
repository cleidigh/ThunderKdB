/*
 * This Source Code is subject to the terms of the Mozilla Public License
 * version 2.0 (the "License"). You can obtain a copy of the License at
 * http://mozilla.org/MPL/2.0/.
 *
 * The Original Code is ThreadKey Extension.
 * The Initial Developer of the Original Code is Luca Porzio.
 * Portions created by the Initial Developer are Copyright (c) 2006
 * the Initial Deveoper. All Rights Reserved.
 *
 * Contributors:
 * Stefano Constantini, Onno Ekker
 */

"use strict";

const Cc = Components.classes, Ci = Components.interfaces;

const { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
const { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
const { CustomizableUI } = ChromeUtils.import("resource:///modules/CustomizableUI.jsm");
const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
const { Log } = ChromeUtils.import("resource://gre/modules/Log.jsm");

const messageAttrs = [ "key", "modifiers" ];
const originalAttrs = [ "id", "key", "modifiers" ];
const saveAttrs = [ "id", "key", "modifiers", "command", "oncommand" ];
const saveKey = [ "key" ];

const targetWindowTypes = [ "mail:3pane", "mailnews:search"];
const mail3paneTargetTabs = ["folder", "glodaSearch"];

const validSortTypesForGrouping = [
  Ci.nsMsgViewSortType.byAccount,
  Ci.nsMsgViewSortType.byAttachments,
  Ci.nsMsgViewSortType.byAuthor,
  Ci.nsMsgViewSortType.byCorrespondent,
  Ci.nsMsgViewSortType.byDate,
  Ci.nsMsgViewSortType.byFlagged,
  Ci.nsMsgViewSortType.byLocation,
  Ci.nsMsgViewSortType.byPriority,
  Ci.nsMsgViewSortType.byReceived,
  Ci.nsMsgViewSortType.byRecipient,
  Ci.nsMsgViewSortType.byStatus,
  Ci.nsMsgViewSortType.bySubject,
  Ci.nsMsgViewSortType.byTags,
  Ci.nsMsgViewSortType.byCustom
];

const sortTypeToColumnID = {};
sortTypeToColumnID[Ci.nsMsgViewSortType.byNone] = "None";
sortTypeToColumnID[Ci.nsMsgViewSortType.byDate] = "Date";
sortTypeToColumnID[Ci.nsMsgViewSortType.bySubject] = "Subject";
sortTypeToColumnID[Ci.nsMsgViewSortType.byAuthor] = "Author";
sortTypeToColumnID[Ci.nsMsgViewSortType.byId] = "Id";
sortTypeToColumnID[Ci.nsMsgViewSortType.byThread] = "Thread";
sortTypeToColumnID[Ci.nsMsgViewSortType.byPriority] = "Priority";
sortTypeToColumnID[Ci.nsMsgViewSortType.byStatus] = "Status";
sortTypeToColumnID[Ci.nsMsgViewSortType.bySize] = "Size";
sortTypeToColumnID[Ci.nsMsgViewSortType.byFlagged] = "Flagged";
sortTypeToColumnID[Ci.nsMsgViewSortType.byUnread] = "Unread";
sortTypeToColumnID[Ci.nsMsgViewSortType.byRecipient] = "Recipient";
sortTypeToColumnID[Ci.nsMsgViewSortType.byLocation] = "Location";
sortTypeToColumnID[Ci.nsMsgViewSortType.byTags] = "Tags";
sortTypeToColumnID[Ci.nsMsgViewSortType.byJunkStatus] = "JunkStatus";
sortTypeToColumnID[Ci.nsMsgViewSortType.byAttachments] = "Attachments";
sortTypeToColumnID[Ci.nsMsgViewSortType.byAccount] = "Account";
sortTypeToColumnID[Ci.nsMsgViewSortType.byCustom] = "Custom";
sortTypeToColumnID[Ci.nsMsgViewSortType.byReceived] = "Received";
sortTypeToColumnID[Ci.nsMsgViewSortType.byCorrespondent] = "Correspondent";

let threadkey = {
  debug: false,
  attributesSaved: false,

  key_threadSort: { command: "", oncommand: "goDoCommand('cmd_threadSort');" },
  key_unthreadSort: { command: "", oncommand: "goDoCommand('cmd_unthreadSort');" },
  key_groupBySort: { command: "", oncommand: "goDoCommand('cmd_groupBySort');" },

  threadkeyController: {
    supportsCommand: function(command) {
      switch (command) {
        case "cmd_threadSort":
        case "cmd_unthreadSort":
        case "cmd_groupBySort":
          if (threadkey.debug) console.log(command + " supportsCommand");
          return true;
        default:
          return false;
      }
    },

    isCommandEnabled: function(command, doCommand = false) {
      switch (command) {
        case "cmd_threadSort":
        case "cmd_unthreadSort":
        case "cmd_groupBySort":
	  let win = Services.wm.getMostRecentWindow(null);
	  let doc = win.document.documentElement;
	  let windowType = doc.getAttribute("windowtype");
          if (!targetWindowTypes.includes(windowType)) {
            if (threadkey.debug && !doCommand) console.log(command + " isCommandEnabled false, unsupported windowtype " + windowType);
            return false;
          }
          let gFolderDisplay = win.gFolderDisplay;
          let sortType = gFolderDisplay.view.primarySortType;
          let columnID = sortTypeToColumnID[sortType];
          if (command === "cmd_groupBySort") {
            if (!validSortTypesForGrouping.includes(sortType)) {
              if (threadkey.debug && !doCommand) console.log(command + " isCommandEnabled false, windowtype " + windowType + ", unsupported column " + columnID);
              return false;
            }
          }
          switch (windowType) {
            case "mail:3pane":
              let tabs = doc.getElementsByClassName("tabmail-tab");
              let selectedTab = Array.prototype.filter.call(tabs, function(tab) { return tab.getAttribute("selected") === "true"; });
              let attrs = selectedTab[0].attributes;
              let tabType = attrs.getNamedItem("type").value;
              let tabLinkedPanel = attrs.getNamedItem("linkedpanel").value;
              if (!mail3paneTargetTabs.includes(tabType) || tabLinkedPanel !== "mailContent") {
                if (threadkey.debug && !doCommand) console.log(command + " isCommandEnabled false, windowtype " + windowType + ", column " + columnID + ", unsupported tab " + tabType);
                return false;
              }
              if (threadkey.debug && !doCommand) console.log(command + " isCommandEnabled true, windowtype " + windowType + ", column " + columnID + ", tab " + tabType);
              return true;
            case "mailnews:search":
              if (threadkey.debug && !doCommand) console.log(command + " isCommandEnabled true, windowtype " + windowType + ", column " + columnID);
              return true;
          }

        default:
          return false;
      }
    },

    doCommand: function(command) {
      if (!this.isCommandEnabled(command, true)) {
        return;
      }

      switch (command) {
        case "cmd_threadSort":
          if (threadkey.debug) console.log(command + " doCommand");
          Services.wm.getMostRecentWindow(null).gFolderDisplay.view.showThreaded = true;
          break;
        case "cmd_unthreadSort":
          if (threadkey.debug) console.log(command + " doCommand");
          Services.wm.getMostRecentWindow(null).gFolderDisplay.view.showUnthreaded = true;
          break;
        case "cmd_groupBySort":
          if (threadkey.debug) console.log(command + " doCommand");
          Services.wm.getMostRecentWindow(null).gFolderDisplay.view.showGroupedBySort = true;
          break;
      }
    }
  }
};

var threadkeyApi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    context.callOnClose(this);

    return {
      threadkeyApi: {
        init: async function() {
          threadkey.extension = context.extension;

          try {
            if (Services.prefs.getBoolPref("extensions.threadkey.debug")) {
              threadkey.debug = true;
            }
          } catch(ex) {}
          if (threadkey.debug) console.log("init");

          let locale = Services.locale.appLocaleAsBCP47;
          let locales = await threadkey.extension.promiseLocales();
          locale = locales.get(locale) || threadkey.extension.defaultLocale;
          if (threadkey.debug) console.log("locale", locale);

          getMessages(threadkey.extension.localeData, "key_threadSort", messageAttrs);
          getMessages(threadkey.extension.localeData, "key_unthreadSort", messageAttrs);
          getMessages(threadkey.extension.localeData, "key_groupBySort", messageAttrs);
          getMessages(threadkey.extension.localeData, "overrideKey1", originalAttrs);
          getMessages(threadkey.extension.localeData, "overrideKey2", originalAttrs);
          getMessages(threadkey.extension.localeData, "overrideKey3", originalAttrs);

          let win = Services.wm.getMostRecentWindow("mail:3pane");
          if (win === null) {
            console.log("mail:3pane window not found")
          } else {
            if (win.document.readyState !== "complete") {
              if (threadkey.debug) console.log("await readyState complete");
              await windowIsReady(win);
            }
            let doc = win.document;
            saveOriginalAttributes(doc);
          }

          ExtensionSupport.registerWindowListener("threadkeyWindowListener", {
            chromeURLs: [
              "chrome://messenger/content/messenger.xul",
              "chrome://messenger/content/messenger.xhtml",
              "chrome://messenger/content/SearchDialog.xhtml"
            ],
            onLoadWindow(win) {
              loadIntoWindow(win);
            }
          });

          if (threadkey.debug) console.log("init ready");
        }
      }
    }
  }

  close() {
    if (threadkey.debug) console.log("shutdown");
    forEachOpenWindow(unloadFromWindow);
    ExtensionSupport.unregisterWindowListener("threadkeyWindowListener");
    if (threadkey.debug) console.log("shutdown ready");
  }
}

async function windowIsReady(win) {
  // if (threadkey.debug) console.log("await readyState complete");
  return new Promise(function(resolve) {
    if (win.document.readyState !== "complete") {
      win.addEventListener("load", resolve, { once: true });
    } else {
      return resolve();
    }
  });
}

async function loadIntoWindow(win) {
  let doc = win.document, newNode;
  let windowType = doc.documentElement.getAttribute("windowtype")
  if (threadkey.debug) console.log("loadIntoWindow " + windowType);
  if (!threadkey.attributesSaved) saveOriginalAttributes(doc);

  if (windowType === "mail:3pane") {
    // Override keys as specified in (localized) messages.json
    if (threadkey.overrideKey1.id !== "") {
      let nodes = Array.prototype.filter.call(doc.getElementsByTagName("*"), function(node) { return node.getAttribute("key") === threadkey.overrideKey1.id; });
      nodes.forEach(node => node.removeAttribute("key"));
      defineKey(doc, threadkey.overrideKey1.id, "overrideKey1");
      nodes.forEach(node => node.setAttribute("key", threadkey.overrideKey1.id)); // Re-add modified key so that acceltext is updated
    }
    if (threadkey.overrideKey2.id !== "") {
      let nodes = Array.prototype.filter.call(doc.getElementsByTagName("*"), function(node) { return node.getAttribute("key") === threadkey.overrideKey2.id; });
      nodes.forEach(node => node.removeAttribute("key"));
      defineKey(doc, threadkey.overrideKey2.id, "overrideKey2");
      nodes.forEach(node => node.setAttribute("key", threadkey.overrideKey2.id)); // Re-add modified key so that acceltext is updated
    }
    if (threadkey.overrideKey3.id !== "") {
      let nodes = Array.prototype.filter.call(doc.getElementsByTagName("*"), function(node) { return node.getAttribute("key") === threadkey.overrideKey3.id; });
      nodes.forEach(node => node.removeAttribute("key"));
      defineKey(doc, threadkey.overrideKey3.id, "overrideKey3");
      nodes.forEach(node => node.setAttribute("key", threadkey.overrideKey3.id)); // Re-add modified key so that acceltext is updated
    }
  }

  defineCommand(doc, "cmd_threadSort", "goDoCommand('cmd_threadSort');");
  defineCommand(doc, "cmd_unthreadSort", "goDoCommand('cmd_unthreadSort');");
  defineCommand(doc, "cmd_groupBySort", "goDoCommand('cmd_groupBySort');");

  defineKey(doc, "key_threadSort", "key_threadSort");
  defineKey(doc, "key_unthreadSort", "key_unthreadSort");
  defineKey(doc, "key_groupBySort", "key_groupBySort");

  if (windowType === "mail:3pane") {
    setKeyAttribute(doc, "sortThreaded", "key_threadSort");
    setKeyAttribute(doc, "appmenu_sortThreaded", "key_threadSort");

    setKeyAttribute(doc, "sortUnthreaded", "key_unthreadSort");
    setKeyAttribute(doc, "appmenu_sortUnthreaded", "key_unthreadSort");

    setKeyAttribute(doc, "groupBySort", "key_groupBySort");
    setKeyAttribute(doc, "appmenu_groupBySort", "key_groupBySort");
  }

  if (threadkey.debug) console.log("appendController " + windowType);
  win.controllers.appendController(threadkey.threadkeyController);

  if (threadkey.debug) console.log("loadIntoWindow " + windowType + " ready");
}

function saveOriginalAttributes(doc) {
  if (threadkey.debug) console.log("saveOriginalAttributes");

  // Save original attributes if keys are overridden
  if (threadkey.overrideKey1.id !== "") {
    saveAttributes(doc, threadkey.overrideKey1.id, originalAttrs);
  }
  if (threadkey.overrideKey2.id !== "") {
    saveAttributes(doc, threadkey.overrideKey2.id, originalAttrs);
  }
  if (threadkey.overrideKey3.id !== "") {
    saveAttributes(doc, threadkey.overrideKey3.id, originalAttrs);
  }

  saveAttributes(doc, "key_threadSort", saveAttrs);
  saveAttributes(doc, "sortThreaded", saveKey);
  saveAttributes(doc, "appmenu_sortThreaded", saveKey);

  saveAttributes(doc, "key_unthreadSort", saveAttrs);
  saveAttributes(doc, "sortUnthreaded", saveKey);
  saveAttributes(doc, "appmenu_sortUnthreaded", saveKey);

  saveAttributes(doc, "key_groupBySort", saveAttrs);
  saveAttributes(doc, "groupBySort", saveKey);
  saveAttributes(doc, "appmenu_groupBySort", saveKey);

  threadkey.attributesSaved = true;
  if (threadkey.debug) console.log("saveOriginalAttributes ready");
}

function forEachOpenWindow(todo) {
  if (threadkey.debug) console.log("forEachOpenWindow");
  let windows = Services.wm.getEnumerator(null);
  while (windows.hasMoreElements()) {
    let win = windows.getNext();
    let windowType = win.document.documentElement.getAttribute("windowtype");
    if (targetWindowTypes.includes(windowType)) {
      todo(win);
    }
  }
  if (threadkey.debug) console.log("forEachOpenWindow ready");
}

function unloadFromWindow(win) {
  let doc = win.document, node;
  let windowType = doc.documentElement.getAttribute("windowtype");
  if (threadkey.debug) console.log("unloadFromWindow " + windowType);

  if (threadkey.debug) console.log("removeController " + windowType);
  win.controllers.removeController(threadkey.threadkeyController);

  if (windowType === "mail:3pane") {
    restoreAttributes(doc, "sortThreaded");
    restoreAttributes(doc, "appmenu_sortThreaded");

    restoreAttributes(doc, "sortUnthreaded");
    restoreAttributes(doc, "appmenu_sortUnthreaded");

    restoreAttributes(doc, "groupBySort");
    restoreAttributes(doc, "appmenu_groupBySort");
  }

  restoreAttributes(doc, "key_threadSort");
  restoreAttributes(doc, "key_unthreadSort");
  restoreAttributes(doc, "key_groupBySort");

  defineCommand(doc, "cmd_threadSort", null);
  defineCommand(doc, "cmd_unthreadSort", null);
  defineCommand(doc, "cmd_groupBySort", null);

  if (windowType === "mail:3pane") {
    // Restore original keys
    if (threadkey.overrideKey1.id !== "") {
      let nodes = Array.prototype.filter.call(doc.getElementsByTagName("*"), function(node) { return node.getAttribute("key") === threadkey.overrideKey1.id; });
      nodes.forEach(node => node.removeAttribute("key"));
      restoreAttributes(doc, threadkey.overrideKey1.id);
      nodes.forEach(node => node.setAttribute("key", threadkey.overrideKey1.id));
    }
    if (threadkey.overrideKey2.id !== "") {
      let nodes = Array.prototype.filter.call(doc.getElementsByTagName("*"), function(node) { return node.getAttribute("key") === threadkey.overrideKey2.id; });
      nodes.forEach(node => node.removeAttribute("key"));
      restoreAttributes(doc, threadkey.overrideKey2.id);
      nodes.forEach(node => node.setAttribute("key", threadkey.overrideKey2.id));
    }
    if (threadkey.overrideKey3.id !== "") {
      let nodes = Array.prototype.filter.call(doc.getElementsByTagName("*"), function(node) { return node.getAttribute("key") === threadkey.overrideKey3.id; });
      nodes.forEach(node => node.removeAttribute("key"));
      restoreAttributes(doc, threadkey.overrideKey3.id);
      nodes.forEach(node => node.setAttribute("key", threadkey.overrideKey3.id));
    }
  }

  if (threadkey.debug) console.log("unloadFromWindow " + windowType + " ready");
}

function getMessages(localeData, obj, attrs) {
  if (!threadkey[obj]) { threadkey[obj] = {}; }
  let schema = threadkey[obj];
  attrs.forEach(attr => {
    let messageName = obj + "." + attr;
    let messageValue = localeData.localizeMessage(messageName);
    schema[attr] = messageValue;
    if (threadkey.debug) console.log("getMessage " + messageName + "=" + messageValue);
  });
}

function saveAttributes(doc, id, attrs) {
  if (!threadkey[id]) { threadkey[id] = {}; }
  let schema = threadkey[id];
  if (!schema["originalAttributes"]) { schema["originalAttributes"] = {}; }
  let originalAttributes = schema["originalAttributes"];
  let node = doc.getElementById(id);
  if (node !== null) {
    attrs.forEach(attr => originalAttributes[attr] = node.getAttribute(attr));
    if (threadkey.debug) {
      console.log("saveAttributes(" + id + ")", originalAttributes);
    }
  }
}

function restoreAttributes(doc, id) {
  let schema = threadkey[id];
  let originalAttributes = Object.entries(schema["originalAttributes"]);
  let node = doc.getElementById(id);
  if (originalAttributes.length > 0) {
    originalAttributes.forEach(([name, value]) => setAttribute(node, name, value));
    if (threadkey.debug) {
      console.log("restoreAttributes(" + id + ")", node);
    }
  } else {
    if (threadkey.debug) console.log("remove " + id);
    node.parentNode.removeChild(node);
  }
}

function defineCommand(doc, command, oncommand) {
  let node = doc.getElementById(command);
  if (oncommand === null) {
    if (threadkey.debug) console.log("remove " + command);
    node.parentNode.removeChild(node);
  } else {
    let action = "";
    if (node === null) {
      action = "create";
      let commandset = doc.getElementById("mailCommands") || doc.getElementById("commands");
      if (commandset === null) {
        let windowType = doc.documentElement.getAttribute("windowtype");
        if (threadkey.debug) console.log("mailCommands not found in " + windowType);
        commandset = doc.getElementsByTagName("commandset")[0];
        if (threadkey.debug) console.log("commandset " + commandset);
      }
      node = doc.createXULElement("command");
      node.setAttribute("id", command);
      commandset.appendChild(node);
    } else {
      action = "change";
    }
    setAttribute(node, "oncommand", oncommand);
    if (threadkey.debug) console.log(action, command, node);
  }
}

function defineKey(doc, key, obj) {
  let node = doc.getElementById(key);
  if (!threadkey[obj]) {
    if (threadkey.debug) console.log("remove " + key);
    node.parentNode.removeChild(node);
  } else {
    let action = "";
    let schema = threadkey[obj];
    if (node === null) {
      action = "create";
      let keyset = doc.getElementById("mailKeys");
      if (keyset === null) {
        let windowType = doc.documentElement.getAttribute("windowtype");
        keyset = doc.getElementsByTagName("keyset")[0];
        if (threadkey.debug) console.log("mailKeys not found in " + windowType + ", using keyset " + keyset);
      }
      node = doc.createXULElement("key");
      node.setAttribute("id", key);
      keyset.appendChild(node);
    } else {
      action = "change";
    }
    for (const [attr, value] of Object.entries(schema)) {
      if (attr !== "originalAttributes") {
        setAttribute(node, attr, value);
      }
    }
    if (threadkey.debug) console.log(action, key, node);
  }
}

function setKeyAttribute(doc, id, key) {
  let node = doc.getElementById(id);
  if (node !== null) {
    let action = "";
    if (threadkey.debug) {
      if (key !== undefined && key !== "") {
        action = "setAttribute(\"key\", \"" + key + "\");";
      } else {
        action = "removeAttribute(\"key\");";
      }
    }
    setAttribute(node, "key", key);
    if (threadkey.debug) console.log(id + "." + action, node);
  } else {
    if (threadkey.debug) console.log("node " + id + " does not exist");
  }
}

function setAttribute(node, attr, value) {
  if (node !== null) {
    if (value !== undefined && value !== "") {
      node.setAttribute(attr, value);
    } else {
      if (node.hasAttribute(attr)) node.removeAttribute(attr);
    }
  }
}
