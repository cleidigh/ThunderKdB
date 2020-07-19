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
 * Stefano Constantini, Onno Ekker, John Bieling
 */

"use strict";

const LOGGER_ID = "threadkey";

var debug_threadkey = false;

var Services, Log;

if (typeof ChromeUtils === "object" && typeof ChromeUtils.import === "function") {
  var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
  var { Log } = ChromeUtils.import("resource://gre/modules/Log.jsm");
} else {
  var { Services } = Components.utils.import("resource://gre/modules/Services.jsm", null);
  try {
    var { Log } = Components.utils.import("resource://gre/modules/Log.jsm", null);
  } catch(ex) {
    Components.utils.import("resource:///modules/gloda/log4moz.js");
  }
}

var stringBundle = Services.strings.createBundle("chrome://threadkey/locale/threadkey.properties");
var logger, logAppender;

var my_threadkey = {
  threadSortCmd: { command: "", oncommand: "MsgSortThreaded()" },
  unthreadSortCmd: { command: "", oncommand: "MsgSortUnthreaded()" },
  groupBySortCmd: { command: "", oncommand: "MsgGroupBySort()" }
}

function install(data, reason) {}
function uninstall(data, reason) {}

function startup(data, reason) {
  try {
    if (Services.prefs.getBoolPref("extensions.threadkey.debug")) {
      debug_threadkey = true;
    }
  } catch(ex) {}

  if (debug_threadkey) {
    if (typeof Log !== "undefined") {
      logger = Log.repository.getLogger(LOGGER_ID);
      logger.level = Log.Level.Debug;
      logAppender = new Log.ConsoleAppender(new Log.BasicFormatter());
      logger.addAppender(logAppender);
    } else {
      logger = Log4Moz.repository.getLogger(LOGGER_ID);
      logger.level = Log4Moz.Level.Debug;
      logAppender = new Log4Moz.ConsoleAppender(new Log4Moz.BasicFormatter());
      logger.addAppender(logAppender);
    }
  }
  log("startup");
  initThreadkey();
  forEachOpenWindow(loadIntoWindow);
  Services.wm.addListener(WindowListener);
  log("startup ready");
}

function shutdown(data, reason) {
  log("shutdown");
  if (reason === APP_SHUTDOWN) return;
  forEachOpenWindow(unloadFromWindow);
  Services.wm.removeListener(WindowListener);
  Services.obs.notifyObservers(null, "chrome-flush-caches", null);
  log("shutdown ready");
  if (debug_threadkey) {
    logger.removeAppender(logAppender);
  }
}

function initThreadkey() {
  log("init");
  getStringFromBundle("threadSortCmd", "key modifiers");
  getStringFromBundle("unthreadSortCmd", "key modifiers");
  getStringFromBundle("groupBySortCmd", "key modifiers");

  getStringFromBundle("overrideKey1", "id key modifiers");
  getStringFromBundle("overrideKey2", "id key modifiers");
  getStringFromBundle("overrideKey3", "id key modifiers");
  log("init ready");
}

function getStringFromBundle(obj, attrs) {
  if (!my_threadkey[obj]) { my_threadkey[obj] = {}; }
  let schema = my_threadkey[obj];
  let attr = attrs.split(" ");
  let attrsFilled = false;
  for (let i = 0; i < attr.length; i++) {
    let entity = obj + "." + attr[i];
    let value = stringBundle.GetStringFromName(entity);
    schema[attr[i]] = value;
    if (value) { attrsFilled = true }
  }
  if (attrsFilled) {
    for (let i = 0; i < attr.length; i++) {
      let entity = obj + "." + attr[i];
      let value = schema[attr[i]];
      log("getstring "+entity+"='"+value+"'");
    }
  }
}

function forEachOpenWindow(todo) {
  let windows = Services.wm.getEnumerator("mail:3pane");
  while (windows.hasMoreElements()) {
    let window = windows.getNext().QueryInterface(Components.interfaces.nsIDOMWindow);
    todo("foreachopenwindow", window);
  }
}

var WindowListener = {
  onOpenWindow: function(xulWindow) {
    let window = xulWindow.QueryInterface(Components.interfaces.nsIInterfaceRequestor)
                          .getInterface(Components.interfaces.nsIDOMWindow);
    function onWindowLoad() {
      if (window.document.documentElement.getAttribute("windowtype") === "mail:3pane") {
        loadIntoWindow("windowlistener", window);
      }
    }
    window.addEventListener("load", onWindowLoad, { once: true });
  },
  onCloseWindow: function(xulWindow) { }
}

async function loadIntoWindow(caller, window) {
  let doc = window.document;
  log(caller+" loadintowindow "+doc.readyState);
  await windowIsReady(window);
  log(caller+" loadintowindow loading "+doc.readyState);

  if (my_threadkey.overrideKey1.id !== "") {
    saveOriginalAttributes(doc, my_threadkey.overrideKey1.id, "originalKey1", "id key modifiers command oncommand");
    my_threadkey.overrideKey1.command = my_threadkey.originalKey1.command;
    my_threadkey.overrideKey1.oncommand = my_threadkey.originalKey1.oncommand;
    defineKey(doc, my_threadkey.overrideKey1.id, "overrideKey1");
    removeAcceltexts(doc, my_threadkey.overrideKey1.id);
  }
  if (my_threadkey.overrideKey2.id !== "") {
    saveOriginalAttributes(doc, my_threadkey.overrideKey2.id, "originalKey2", "id key modifiers command oncommand");
    my_threadkey.overrideKey2.command = my_threadkey.originalKey2.command;
    my_threadkey.overrideKey2.oncommand = my_threadkey.originalKey2.oncommand;
    defineKey(doc, my_threadkey.overrideKey2.id, "overrideKey2");
    removeAcceltexts(doc, my_threadkey.overrideKey2.id);
  }
  if (my_threadkey.overrideKey3.id) {
    saveOriginalAttributes(doc, my_threadkey.overrideKey3.id, "originalKey3", "id key modifiers command oncommand");
    my_threadkey.overrideKey3.command = my_threadkey.originalKey3.command;
    my_threadkey.overrideKey3.oncommand = my_threadkey.originalKey3.oncommand;
    defineKey(doc, my_threadkey.overrideKey3.id, "overrideKey3");
    removeAcceltexts(doc, my_threadkey.overrideKey3.id);
  }

  saveOriginalAttributes(doc, "sortThreaded", "sortThreaded", "key");
  saveOriginalAttributes(doc, "appmenu_sortThreaded", "appmenu_sortThreaded", "key");
  defineKey(doc, "key_threadSort", "threadSortCmd");
  setMenuitem(doc, "sortThreaded", "key_threadSort");
  setMenuitem(doc, "appmenu_sortThreaded", "key_threadSort");

  saveOriginalAttributes(doc, "sortUnthreaded", "sortUnthreaded", "key");
  saveOriginalAttributes(doc, "appmenu_sortUnthreaded", "appmenu_sortUnthreaded", "key");
  defineKey(doc, "key_unthreadSort", "unthreadSortCmd");
  setMenuitem(doc, "sortUnthreaded", "key_unthreadSort");
  setMenuitem(doc, "appmenu_sortUnthreaded", "key_unthreadSort");

  saveOriginalAttributes(doc, "groupBySort", "groupBySort", "key");
  saveOriginalAttributes(doc, "appmenu_groupBySort", "appmenu_groupBySort", "key");
  defineKey(doc, "key_groupBySort", "groupBySortCmd");
  setMenuitem(doc, "groupBySort", "key_groupBySort");
  setMenuitem(doc, "appmenu_groupBySort", "key_groupBySort");

  log(caller+" loadintowindow ready");
}

function windowIsReady(window) {
  return new Promise(function(resolve) {
    if (window.document.readyState !== "complete") {
      // If the window isn't completely loaded, add an event listener and resolve this Promise
      // as soon as the load event has fired.
      Components.utils.reportError("loading of window is not yet complete");
      window.addEventListener("load", resolve, { once: true });
    } else {
      // The window is  completely loaded, so we can resolve the Promise immediately.
      return resolve();
    }
  });
}

function unloadFromWindow(caller, window) {
  let doc = window.document;
  log(caller+" unloadfromwindow");

  setMenuitem(doc, "appmenu_sortThreaded", my_threadkey.sortThreaded.key);
  setMenuitem(doc, "sortThreaded", my_threadkey.sortThreaded.key);
  defineKey(doc, "key_threadSort", "key_threadSort");

  setMenuitem(doc, "appmenu_sortUnthreaded", my_threadkey.sortUnthreaded.key);
  setMenuitem(doc, "sortUnthreaded", my_threadkey.sortUnthreaded.key);
  defineKey(doc, "key_unthreadSort", "key_unthreadSort");

  setMenuitem(doc, "appmenu_groupBySort", my_threadkey.groupBySort.key);
  setMenuitem(doc, "groupBySort", my_threadkey.groupBySort.key);
  defineKey(doc, "key_groupBySort", "key_groupBySort");

  if (my_threadkey.overrideKey1.id !== "") {
    defineKey(doc, my_threadkey.overrideKey1.id, "originalKey1");
    removeAcceltexts(doc, my_threadkey.originalKey1.id);
  }

  if (my_threadkey.overrideKey2.id !== "") {
    defineKey(doc, my_threadkey.overrideKey2.id, "originalKey2");
    removeAcceltexts(doc, my_threadkey.originalKey2.id);
  }

  if (my_threadkey.overrideKey3.id !== "") {
    defineKey(doc, my_threadkey.overrideKey3.id, "originalKey3");
    removeAcceltexts(doc, my_threadkey.originalKey3.id);
  }

  log(caller+" unloadfromwindow ready");
}

function saveOriginalAttributes(doc, node, obj, attrs) {
  let id = doc.getElementById(node);
  if (id !== null) {
    log("save node "+node+" to "+obj);
    if (!my_threadkey[obj]) { my_threadkey[obj] = {}; }
    let schema = my_threadkey[obj];
    let attr = attrs.split(" ");
    for (let i = 0; i < attr.length; i++) {
      schema[attr[i]] = id.getAttribute(attr[i]);
      log("save "+node+"."+attr[i]+"='"+schema[attr[i]]+"'");
    }
  }
 }

function defineKey(doc, key, obj) {
  let mailKeys = doc.getElementById("mailKeys");
  let id = doc.getElementById(key);
  if (!my_threadkey[obj]) {
    log("remove "+key);
    id.parentNode.removeChild(id);
  } else {
    let schema = my_threadkey[obj];
    if (id === null) {
      log("create "+key);
      id = (typeof doc.createXULElement === "function") ? doc.createXULElement("key") : doc.createElement("key");
      id.setAttribute("id", key);
      mailKeys.appendChild(id);
    } else {
      log("change "+key);
    }
    setAttribute(id, "key", schema.key);
    setAttribute(id, "modifiers", schema.modifiers);
    setAttribute(id, "command", schema.command);
    setAttribute(id, "oncommand", schema.oncommand);
    log("key "+key+" key '"+schema.modifiers+(schema.modifiers !== "" ? "+" : "")+schema.key+"' mapped to '"+schema.oncommand+"'");
  }
}

/*
 * There seems to be a bug that when you change a key, the acceltext isn't updated.
 * Remove the acceltexts from the menuitems, so they get generated again
 */
function removeAcceltexts(doc, key) {
  let id = doc.getElementById(key);
  if (id !== null) {
    let elements = doc.getElementsByTagName("menuitem");
    for (let i = 0; i < elements.length; i++) {
      if (elements[i].hasAttribute("key") && elements[i].getAttribute("key") === key) {
        log("remove acceltext '"+elements[i].getAttribute("acceltext")+"' on "+elements[i].id);
        setAttribute(elements[i], "acceltext", "");
      }
    }
  }
}

function setMenuitem(doc, menuitem, key) {
  let id = doc.getElementById(menuitem);
  if (id !== null) {
    log("menuitem "+menuitem+(key ? " set attribute key "+key : " remove attribute key"));
    setAttribute(id, "key", key);
  } else {
    log("menuitem "+menuitem+" does not exist");
  }
}

function setAttribute(id, attr, value) {
  if (value !== undefined && value !== "") {
    id.setAttribute(attr, value);
  } else {
    if (id.hasAttribute(attr)) id.removeAttribute(attr);
  }
}

function log(message) {
  if (debug_threadkey) {
    logger.debug(message);
  }
}
