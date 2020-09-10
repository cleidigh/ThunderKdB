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

const messageAttrs = [ "key", "modifiers" ];
const originalAttrs = [ "id", "key", "modifiers" ];
const saveAttrs = [ "id", "key", "modifiers", "command", "oncommand" ];
const saveKey = [ "key" ];

const targetWindowtypes = [ "mail:3pane", "mailnews:search"];
const mail3paneTargetTabs = ["folder", "glodaSearch"];

const { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");
const { ExtensionSupport } = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm");
const { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
const { Log } = ChromeUtils.import("resource://gre/modules/Log.jsm");

let threadkey = {
  debug: false,

  key_threadSort: { command: "", oncommand: "MsgSortThreaded();" },
  key_unthreadSort: { command: "", oncommand: "MsgSortUnthreaded();" },
  key_groupBySort: { command: "", oncommand: "MsgGroupBySort();" }
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

          if (threadkey.debug) console.log("locale " + Services.locale.appLocaleAsBCP47);
          getMessages(threadkey.extension.localeData, "key_threadSort", messageAttrs);
          getMessages(threadkey.extension.localeData, "key_unthreadSort", messageAttrs);
          getMessages(threadkey.extension.localeData, "key_groupBySort", messageAttrs);
          getMessages(threadkey.extension.localeData, "overrideKey1", originalAttrs);
          getMessages(threadkey.extension.localeData, "overrideKey2", originalAttrs);
          getMessages(threadkey.extension.localeData, "overrideKey3", originalAttrs);

          let win = Services.wm.getMostRecentWindow("mail:3pane");
          if (win.document.readyState !== "complete") {
            if (threadkey.debug) console.log("await readyState complete");
            await windowIsReady(win);
          }
          let doc = win.document;

          // Save original attributes if keys are overridden
          if (threadkey.overrideKey1.id !== "") {
            saveOriginalAttributes(doc, threadkey.overrideKey1.id, originalAttrs);
          }
          if (threadkey.overrideKey2.id !== "") {
            saveOriginalAttributes(doc, threadkey.overrideKey2.id, originalAttrs);
          }
          if (threadkey.overrideKey3.id !== "") {
            saveOriginalAttributes(doc, threadkey.overrideKey3.id, originalAttrs);
          }

          saveOriginalAttributes(doc, "key_threadSort", saveAttrs);
          saveOriginalAttributes(doc, "sortThreaded", saveKey);
          saveOriginalAttributes(doc, "appmenu_sortThreaded", saveKey);

          saveOriginalAttributes(doc, "key_unthreadSort", saveAttrs);
          saveOriginalAttributes(doc, "sortUnthreaded", saveKey);
          saveOriginalAttributes(doc, "appmenu_sortUnthreaded", saveKey);

          saveOriginalAttributes(doc, "key_groupBySort", saveAttrs);
          saveOriginalAttributes(doc, "groupBySort", saveKey);
          saveOriginalAttributes(doc, "appmenu_groupBySort", saveKey);

          ExtensionSupport.registerWindowListener("threadkeyWindowListener", {
            chromeURLs: [
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
  let windowtype = doc.documentElement.getAttribute("windowtype")
  if (threadkey.debug) console.log("loadIntoWindow " + windowtype);

  if (windowtype === "mail:3pane") {
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

  newNode = defineKey(doc, "key_threadSort", "key_threadSort");
  newNode = defineKey(doc, "key_unthreadSort", "key_unthreadSort");
  newNode = defineKey(doc, "key_groupBySort", "key_groupBySort");

  if (windowtype === "mail:3pane") {
    setKeyAttribute(doc, "sortThreaded", "key_threadSort");
    setKeyAttribute(doc, "appmenu_sortThreaded", "key_threadSort");

    setKeyAttribute(doc, "sortUnthreaded", "key_unthreadSort");
    setKeyAttribute(doc, "appmenu_sortUnthreaded", "key_unthreadSort");

    setKeyAttribute(doc, "groupBySort", "key_groupBySort");
    setKeyAttribute(doc, "appmenu_groupBySort", "key_groupBySort");
  }

  if (threadkey.debug) { console.log("loadIntoWindow " + windowtype + " ready"); }
}

function MsgSortThreaded() {
  // if (threadkey.debug) console.log("MsgSortThreaded()");
  let win = Services.wm.getMostRecentWindow(null);
  if (checkWinTab(win)) {
    // It's not possible anymore to call MsgSortThreaded() and there's no API
    // Fortunately I can mimick MsgSortThreaded and set a global variable on the window
    let gFolderDisplay = win.gFolderDisplay;
    gFolderDisplay.view.showThreaded = true;
  }
}

function MsgSortUnthreaded() {
  // if (threadkey.debug) console.log("MsgSortUnthreaded()");
  let win = Services.wm.getMostRecentWindow(null);
  if (checkWinTab(win)) {
    // It's not possible anymore to call MsgSortUnthreaded() and there's no API
    // Fortunately I can mimick MsgSortUnthreaded and set a global variable on the window
    let gFolderDisplay = win.gFolderDisplay;
    gFolderDisplay.view.showUnthreaded = true;
  }
}

function MsgGroupBySort() {
  // if (threadkey.debug) console.log("MsgGroupBySort()");
  let win = Services.wm.getMostRecentWindow(null);
  if (checkWinTab(win)) {
    // It's not possible anymore to call MsgGroupBySort() and there's no API
    // Fortunately I can mimick MsgGroupBySort and set a global variable on the window
    let gFolderDisplay = win.gFolderDisplay;
    gFolderDisplay.view.showGroupedBySort = true;
  }
}

function checkWinTab(win) {
  let doc = win.document.documentElement, attrs = {};
  let windowtype = doc.getAttribute("windowtype");
  switch (windowtype) {
    case "mail:3pane":
      let tabs = doc.getElementsByClassName("tabmail-tab");
      let selectedTab = Array.prototype.filter.call(tabs, function(tab) { return tab.getAttribute("selected") === "true"; });
      attrs = selectedTab[0].attributes;
      return (mail3paneTargetTabs.includes(attrs.getNamedItem("type").value) && attrs.getNamedItem("linkedpanel").value === "mailContent");
    case "mailnews:search":
      return true;
  }
  return false;
}

function forEachOpenWindow(todo) {
  if (threadkey.debug) console.log("forEachOpenWindow");
  let windows = Services.wm.getEnumerator(null);
  while (windows.hasMoreElements()) {
    let win = windows.getNext();
    let windowtype = win.document.documentElement.getAttribute("windowtype");
    if (targetWindowtypes.includes(windowtype)) {
      todo(win);
    }
  }
  if (threadkey.debug) console.log("forEachOpenWindow ready");
}

function unloadFromWindow(win) {
  let doc = win.document, node;
  let windowtype = doc.documentElement.getAttribute("windowtype");
  if (threadkey.debug) console.log("unloadFromWindow " + windowtype);

  if (windowtype === "mail:3pane") {
    restoreOriginalAttributes(doc, "sortThreaded");
    restoreOriginalAttributes(doc, "appmenu_sortThreaded");

    restoreOriginalAttributes(doc, "sortUnthreaded");
    restoreOriginalAttributes(doc, "appmenu_sortUnthreaded");

    restoreOriginalAttributes(doc, "groupBySort");
    restoreOriginalAttributes(doc, "appmenu_groupBySort");
  }

  restoreOriginalAttributes(doc, "key_threadSort");
  restoreOriginalAttributes(doc, "key_unthreadSort");
  restoreOriginalAttributes(doc, "key_groupBySort");

  if (windowtype === "mail:3pane") {
    // Restore original keys
    if (threadkey.overrideKey1.id !== "") {
      let nodes = Array.prototype.filter.call(doc.getElementsByTagName("*"), function(node) { return node.getAttribute("key") === threadkey.overrideKey1.id; });
      nodes.forEach(node => node.removeAttribute("key"));
      restoreOriginalAttributes(doc, threadkey.overrideKey1.id);
      nodes.forEach(node => node.setAttribute("key", threadkey.overrideKey1.id));
    }
    if (threadkey.overrideKey2.id !== "") {
      let nodes = Array.prototype.filter.call(doc.getElementsByTagName("*"), function(node) { return node.getAttribute("key") === threadkey.overrideKey2.id; });
      nodes.forEach(node => node.removeAttribute("key"));
      restoreOriginalAttributes(doc, threadkey.overrideKey2.id);
      nodes.forEach(node => node.setAttribute("key", threadkey.overrideKey2.id));
    }
    if (threadkey.overrideKey3.id !== "") {
      let nodes = Array.prototype.filter.call(doc.getElementsByTagName("*"), function(node) { return node.getAttribute("key") === threadkey.overrideKey3.id; });
      nodes.forEach(node => node.removeAttribute("key"));
      restoreOriginalAttributes(doc, threadkey.overrideKey3.id);
      nodes.forEach(node => node.setAttribute("key", threadkey.overrideKey3.id));
    }
  }

  if (threadkey.debug) console.log("unloadFromWindow " + windowtype + " ready");
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

function saveOriginalAttributes(doc, id, attrs) {
  if (!threadkey[id]) { threadkey[id] = {}; }
  let schema = threadkey[id];
  if (!schema["originalAttributes"]) { schema["originalAttributes"] = {}; }
  let originalAttributes = schema["originalAttributes"];
  let node = doc.getElementById(id);
  if (node !== null) {
    attrs.forEach(attr => originalAttributes[attr] = node.getAttribute(attr));
  }
}

function restoreOriginalAttributes(doc, id) {
  let schema = threadkey[id];
  let originalAttributes = Object.entries(schema["originalAttributes"]);
  let node = doc.getElementById(id);
  if (originalAttributes.length > 0) {
    originalAttributes.forEach(([name, value]) => setAttribute(node, name, value));
    if (threadkey.debug) {
      console.log("restoreOriginalAttributes(" + id + ")");
      console.log(node);
    }
  } else {
    if (threadkey.debug) console.log("remove " + id);
    node.parentNode.removeChild(node);
  }
}

function defineKey(doc, key, obj) {
  let node = doc.getElementById(key);
  if (!threadkey[obj]) {
    if (threadkey.debug) console.log("remove " + key);
    node.parentNode.removeChild(node);
  } else {
    let schema = threadkey[obj];
    if (node === null) {
      if (threadkey.debug) console.log("create " + key);
      let keyset = doc.getElementById("mailKeys");
      if (keyset === null) {
        let windowtype = doc.documentElement.getAttribute("windowtype");
        if (threadkey.debug) console.log("mailKeys not found in " + windowtype);
        keyset = doc.getElementsByTagName("keyset")[0];
        if (threadkey.debug) console.log("keyset " + keyset);
      }
      node = doc.createXULElement("key");
      node.setAttribute("id", key);
      keyset.appendChild(node);
    } else {
      if (threadkey.debug) console.log("change " + key);
    }
    node.setAttribute("key", schema.key);
    node.setAttribute("modifiers", schema.modifiers);
    setAttribute(node, "command", schema.command);
    setAttribute(node, "oncommand", schema.oncommand);
    if (threadkey.debug) console.log(node);
    return(node);
  }
}

function setKeyAttribute(doc, id, key) {
  let node = doc.getElementById(id);
  if (node !== null) {
    if (threadkey.debug) {
      if (key !== undefined && key !== "") {
        console.log(id + ".setAttribute(\"key\", \"" + key + "\")");
      } else {
        console.log(id + ".removeAttribute(\"key\")");
      }
    }
    setAttribute(node, "key", key);
    if (threadkey.debug) console.log(node);
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
