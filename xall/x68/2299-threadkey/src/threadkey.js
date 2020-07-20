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
var { ExtensionCommon } = ChromeUtils.import("resource://gre/modules/ExtensionCommon.jsm");

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { Log } = ChromeUtils.import("resource://gre/modules/Log.jsm");

var { ExtensionParent } = ChromeUtils.import("resource://gre/modules/ExtensionParent.jsm");
var extension = ExtensionParent.GlobalManager.getExtension("{1a2d9681-ba56-11da-959b-00e08161165f}");

var debug_threadkey = false;

var l10n = {};

var my_threadkey = {
  threadSortCmd: { command: "", oncommand: "MsgSortThreaded()" },
  unthreadSortCmd: { command: "", oncommand: "MsgSortUnthreaded()" },
  groupBySortCmd: { command: "", oncommand: "MsgGroupBySort()" }
}

var myapi = class extends ExtensionCommon.ExtensionAPI {
  getAPI(context) {
    context.callOnClose(this);

    return {
      myapi: {
        startup: async function(l10nStrings, locale) {
          try {
            if (Services.prefs.getBoolPref("extensions.threadkey.debug")) {
              debug_threadkey = true;
            }
          } catch(ex) {}
          debug("startup threadkey");
          debug("locale " + locale);

          let win = Services.wm.getMostRecentWindow("mail:3pane");
          let doc = win.document;
          if (doc.readyState !== "complete") {
            debug("await readyState complete");
            await this.windowIsReady(win);
            debug("readyState " + doc.readyState);
          }

          l10n = JSON.parse(l10nStrings);
          getMessages("threadSortCmd", "key modifiers");
          getMessages("unthreadSortCmd", "key modifiers");
          getMessages("groupBySortCmd", "key modifiers");
          getMessages("overrideKey1", "id key modifiers");
          getMessages("overrideKey2", "id key modifiers");
          getMessages("overrideKey3", "id key modifiers");

          // Override keys as specified in (localized) messages.json
          if (my_threadkey.overrideKey1.id !== "") {
            saveOriginalAttributes(doc, my_threadkey.overrideKey1.id, "originalKey1", "id key modifiers command oncommand");
            let menuitems = Array.prototype.filter.call(doc.getElementsByTagName("menuitem"), function(menuitem) { return menuitem.getAttribute("key") === my_threadkey.overrideKey1.id; });
            menuitems.forEach(menuitem => menuitem.removeAttribute("key"));
            my_threadkey.overrideKey1.command = my_threadkey.originalKey1.command;
            my_threadkey.overrideKey1.oncommand = my_threadkey.originalKey1.oncommand;
            defineKey(doc, my_threadkey.overrideKey1.id, "overrideKey1");
            menuitems.forEach(menuitem => menuitem.setAttribute("key", my_threadkey.overrideKey1.id)); // Re-add modified key so that acceltext is updated
          }
          if (my_threadkey.overrideKey2.id !== "") {
            saveOriginalAttributes(doc, my_threadkey.overrideKey2.id, "originalKey2", "id key modifiers command oncommand");
            let menuitems = Array.prototype.filter.call(doc.getElementsByTagName("menuitem"), function(menuitem) { return menuitem.getAttribute("key") === my_threadkey.overrideKey2.id; });
            menuitems.forEach(menuitem => menuitem.removeAttribute("key"));
            my_threadkey.overrideKey2.command = my_threadkey.originalKey2.command;
            my_threadkey.overrideKey2.oncommand = my_threadkey.originalKey2.oncommand;
            defineKey(doc, my_threadkey.overrideKey2.id, "overrideKey2");
            menuitems.forEach(menuitem => menuitem.setAttribute("key", my_threadkey.overrideKey2.id)); // Re-add modified key so that acceltext is updated
          }
          if (my_threadkey.overrideKey3.id !== "") {
            saveOriginalAttributes(doc, my_threadkey.overrideKey3.id, "originalKey3", "id key modifiers command oncommand");
            let menuitems = Array.prototype.filter.call(doc.getElementsByTagName("menuitem"), function(menuitem) { return menuitem.getAttribute("key") === my_threadkey.overrideKey3.id; });
            menuitems.forEach(menuitem => menuitem.removeAttribute("key"));
            my_threadkey.overrideKey3.command = my_threadkey.originalKey3.command;
            my_threadkey.overrideKey3.oncommand = my_threadkey.originalKey3.oncommand;
            defineKey(doc, my_threadkey.overrideKey3.id, "overrideKey3");
            menuitems.forEach(menuitem => menuitem.setAttribute("key", my_threadkey.overrideKey3.id)); // Re-add modified key so that acceltext is updated
          }

          // Now the three keys T, U, and G should be available: modify the predefined combinations to the correct values.
          // This isn't possible in the manifest.json, because there all command keys must have at least one modifier.
          let keys = doc.querySelector("#ext-keyset-id-_1a2d9681-ba56-11da-959b-00e08161165f_").querySelectorAll("key");
          let sortByMenu = doc.querySelector("#menu_viewSortPopup");
          let appmenu_sortByView = doc.querySelector("#appMenu-viewSortByView");
          function changeKey(node) {
            switch(node.getAttribute("key")) {
              case "T":
                node.setAttribute("id", "key_threadSort");
                node.setAttribute("key", my_threadkey.threadSortCmd.key);
                node.setAttribute("modifiers", my_threadkey.threadSortCmd.modifiers);
                let sortThreaded = sortByMenu.querySelector("#sortThreaded");
                sortThreaded.setAttribute("key", "key_threadSort");
                let appmenu_sortThreaded = appmenu_sortByView.querySelector("#appmenu_sortThreaded");
                appmenu_sortThreaded.setAttribute("key", "key_threadSort");
                break;
              case "U":
                node.setAttribute("id", "key_unthreadSort");
                node.setAttribute("key", my_threadkey.unthreadSortCmd.key);
                node.setAttribute("modifiers", my_threadkey.unthreadSortCmd.modifiers);
                let sortUnthreaded = sortByMenu.querySelector("#sortUnthreaded");
                sortUnthreaded.setAttribute("key", "key_unthreadSort");
                let appmenu_sortUnthreaded = appmenu_sortByView.querySelector("#appmenu_sortUnthreaded");
                appmenu_sortUnthreaded.setAttribute("key", "key_unthreadSort");
                break;
              case "G":
                node.setAttribute("id", "key_groupBySort");
                node.setAttribute("key", my_threadkey.groupBySortCmd.key);
                node.setAttribute("modifiers", my_threadkey.groupBySortCmd.modifiers);
                let groupBySort = sortByMenu.querySelector("#groupBySort");
                groupBySort.setAttribute("key", "key_groupBySort");
                let appmenu_groupBySort = appmenu_sortByView.querySelector("#appmenu_groupBySort");
                appmenu_groupBySort.setAttribute("key", "key_groupBySort");
                break;
            }
          }
          keys.forEach(changeKey);
        },

        windowIsReady: function(win) {
          return new Promise(function(resolve) {
            if (win.document.readyState !== "complete") {
              win.addEventListener("load", resolve, { once: true });
            } else {
              return resolve();
            }
          });
        },

        threadSortCmd: async function() {
          debug("threadSortCmd");
          let win = Services.wm.getMostRecentWindow(null);
          if (checkWinTab(win)) {
            // It's not possible anymore to call MsgSortThreaded() and there's no API
            // Fortunately I can mimick MsgSortThreaded and set a global variable on the window
            let gFolderDisplay = win.gFolderDisplay;
            gFolderDisplay.view.showThreaded = true;
          }
        },

        unthreadSortCmd: async function() {
          debug("unthreadSortCmd");
          let win = Services.wm.getMostRecentWindow(null);
          if (checkWinTab(win)) {
            // It's not possible anymore to call MsgSortUnthreaded() and there's no API
            // Fortunately I can mimick MsgSortUnthreaded and set a global variable on the window
            let gFolderDisplay = win.gFolderDisplay;
            gFolderDisplay.view.showUnthreaded = true;
          }
        },

        groupedBySortCmd: async function() {
          debug("groupedBySortCmd");
          let win = Services.wm.getMostRecentWindow(null);
          if (checkWinTab(win)) {
            // It's not possible anymore to call MsgGroupBySort() and there's no API
            // Fortunately I can mimick MsgGroupBySort and set a global variable on the window
            let gFolderDisplay = win.gFolderDisplay;
            gFolderDisplay.view.showGroupedBySort = true;
          }
        }
      }
    }
  }

  close() {
    debug("shutdown threadkey");
    let win = Services.wm.getMostRecentWindow("mail:3pane");
    let doc = win.document;

    // Remove the assignment of the added command keys, so that the original keys can be restored
    let keys = doc.querySelector("#ext-keyset-id-_1a2d9681-ba56-11da-959b-00e08161165f_").querySelectorAll("key");
    let sortByMenu = doc.querySelector("#menu_viewSortPopup");
    let appmenu_sortByView = doc.querySelector("#appMenu-viewSortByView");
    function removeKey(node) {
      switch(node.getAttribute("id")) {
        case "key_threadSort":
          let sortThreaded = sortByMenu.querySelector("#sortThreaded");
          sortThreaded.removeAttribute("key");
          let appmenu_sortThreaded = appmenu_sortByView.querySelector("#appmenu_sortThreaded");
          appmenu_sortThreaded.removeAttribute("key");
          break;
        case "U":
          node.setAttribute("id", "key_unthreadSort");
          node.setAttribute("key", my_threadkey.unthreadSortCmd.key);
          node.setAttribute("modifiers", my_threadkey.unthreadSortCmd.modifiers);
          let sortUnthreaded = sortByMenu.querySelector("#sortUnthreaded");
          sortUnthreaded.setAttribute("key", "key_unthreadSort");
          let appmenu_sortUnthreaded = appmenu_sortByView.querySelector("#appmenu_sortUnthreaded");
          appmenu_sortUnthreaded.setAttribute("key", "key_unthreadSort");
          break;
        case "G":
          node.setAttribute("id", "key_groupBySort");
          node.setAttribute("key", my_threadkey.groupBySortCmd.key);
          node.setAttribute("modifiers", my_threadkey.groupBySortCmd.modifiers);
          let groupBySort = sortByMenu.querySelector("#groupBySort");
          groupBySort.setAttribute("key", "key_groupBySort");
          let appmenu_groupBySort = appmenu_sortByView.querySelector("#appmenu_groupBySort");
          appmenu_groupBySort.setAttribute("key", "key_groupBySort");
          break;
      }
    }
    keys.forEach(removeKey);

    if (my_threadkey.overrideKey1.id !== "") {
      let menuitems = Array.prototype.filter.call(doc.getElementsByTagName("menuitem"), function(menuitem) { return menuitem.getAttribute("key") === my_threadkey.overrideKey1.id; });
      menuitems.forEach(menuitem => menuitem.removeAttribute("key"));
      defineKey(doc, my_threadkey.overrideKey1.id, "originalKey1");
      menuitems.forEach(menuitem => menuitem.setAttribute("key", my_threadkey.overrideKey1.id));
    }
    if (my_threadkey.overrideKey2.id !== "") {
      let menuitems = Array.prototype.filter.call(doc.getElementsByTagName("menuitem"), function(menuitem) { return menuitem.getAttribute("key") === my_threadkey.overrideKey2.id; });
      menuitems.forEach(menuitem => menuitem.removeAttribute("key"));
      defineKey(doc, my_threadkey.overrideKey2.id, "originalKey2");
      menuitems.forEach(menuitem => menuitem.setAttribute("key", my_threadkey.overrideKey2.id));
    }
    if (my_threadkey.overrideKey3.id !== "") {
      let menuitems = Array.prototype.filter.call(doc.getElementsByTagName("menuitem"), function(menuitem) { return menuitem.getAttribute("key") === my_threadkey.overrideKey3.id; });
      menuitems.forEach(menuitem => menuitem.removeAttribute("key"));
      defineKey(doc, my_threadkey.overrideKey3.id, "originalKey3");
      menuitems.forEach(menuitem => menuitem.setAttribute("key", my_threadkey.overrideKey3.id));
    }
  }
}

function debug(message) {
  if (debug_threadkey) {
    console.log(message);
  }
}

function checkWinTab(win) {
  let doc = win.document.documentElement, attrs = {};
  if (doc.getAttribute("windowtype") === "mail:3pane") {
    let tabs = doc.getElementsByClassName("tabmail-tab");
    let selectedTab = Array.prototype.filter.call(tabs, function(tab) { return tab.getAttribute("selected") === "true"; });
    attrs = selectedTab[0].attributes;
    if (["folder", "glodaSearch"].includes(attrs.getNamedItem("type").value) && attrs.getNamedItem("linkedpanel").value === "mailContent") {
      return true;
    }
  }
  debug("not in mail tab, windowtype " + doc.getAttribute("windowtype") + ", tabtype " + attrs.getNamedItem("type").value + ", linked panel " + attrs.getNamedItem("linkedpanel").value) + " "  + ["folder", "glodaSearch"].includes(attrs.getNamedItem("type").value);
  return false;
}

function getMessages(obj, attrs) {
  if (!my_threadkey[obj]) { my_threadkey[obj] = {}; }
  let schema = my_threadkey[obj];
  let attr = attrs.split(" ");
  let attrsFilled = false;
  for (let i = 0; i < attr.length; i++) {
    let entity = obj + "." + attr[i];
    let value = l10n[entity];
    schema[attr[i]] = value;
    if (value) { attrsFilled = true }
  }
  if (attrsFilled) {
    for (let i = 0; i < attr.length; i++) {
      let entity = obj + "." + attr[i];
      let value = schema[attr[i]];
      debug("getstring "+entity+"='"+value+"'");
    }
  }
}

function saveOriginalAttributes(doc, node, obj, attrs) {
  let id = doc.getElementById(node);
  if (id !== null) {
    debug("save node "+node+" to "+obj);
    if (!my_threadkey[obj]) { my_threadkey[obj] = {}; }
    let schema = my_threadkey[obj];
    let attr = attrs.split(" ");
    for (let i = 0; i < attr.length; i++) {
      schema[attr[i]] = id.getAttribute(attr[i]);
      debug("save "+node+"."+attr[i]+"='"+schema[attr[i]]+"'");
    }
  }
}

function defineKey(doc, key, obj) {
  let mailKeys = doc.getElementById("mailKeys");
  let id = doc.getElementById(key);
  if (!my_threadkey[obj]) {
    debug("remove "+key);
    id.parentNode.removeChild(id);
  } else {
    let schema = my_threadkey[obj];
    if (id === null) {
      debug("create "+key);
      id = (typeof doc.createXULElement === "function") ? doc.createXULElement("key") : doc.createElement("key");
      id.setAttribute("id", key);
      mailKeys.appendChild(id);
    } else {
      debug("change "+key);
    }
    setAttribute(id, "key", schema.key);
    setAttribute(id, "modifiers", schema.modifiers);
    setAttribute(id, "command", schema.command);
    setAttribute(id, "oncommand", schema.oncommand);
    debug("key "+key+" key '"+schema.modifiers+(schema.modifiers !== "" ? "+" : "")+schema.key+"' mapped to '"+schema.oncommand+"'");
  }
}

function setMenuitem(doc, menuitem, key) {
  let id = doc.getElementById(menuitem);
  if (id !== null) {
    debug("menuitem "+menuitem+(key ? " set attribute key "+key : " remove attribute key"));
    setAttribute(id, "key", key);
  } else {
    debug("menuitem "+menuitem+" does not exist");
  }
}

function setAttribute(id, attr, value) {
  if (value !== undefined && value !== "") {
    id.setAttribute(attr, value);
  } else {
    if (id.hasAttribute(attr)) id.removeAttribute(attr);
  }
}
