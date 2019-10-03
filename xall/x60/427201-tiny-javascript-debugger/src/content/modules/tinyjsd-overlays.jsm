/*global Components: false*/
/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = ["TinyjsdOverlays"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

const APP_SHUTDOWN = 2;

Cu.importGlobalProperties(["XMLHttpRequest"]);
const {
  Services, Promise
} = Cu.import("resource://gre/modules/Services.jsm", {});

const BASE_PATH = "chrome://tinyjsd/content/ui/";
const MY_ADDON_ID = "tinyjsd";

// Overlays to load at startup/enabling
const LOAD_OVERLAYS = {
  // Thunderbird & SeaMonkey (Mail)
  "chrome://messenger/content/messenger.xul": ["tinyjsd-overlay.xul"],
  "chrome://messenger/content/messageWindow.xul": ["tinyjsd-overlay.xul"],
  // SeaMonkey (Browser)
  "chrome://navigator/content/navigator.xul": ["tinyjsd-overlay.xul"],
  // Komodo
  "chrome://komodo/content/komodo.xul": ["tinyjsd-overlay.xul"]
};

function DEBUG_LOG(str) {
  //dump(str + "\n");
}

function ERROR_LOG(str) {
  //dump(str + "\n");
}

var WindowListener = {
  setupUI: function(window, overlayDefs) {
    DEBUG_LOG("overlays.jsm: setupUI(" + window.document.location.href + ")\n");

    loadOverlay(window, overlayDefs, 0);
  },

  tearDownUI: function(window) {
    let document = window.document;

    // unload UI elements
    let s = document.querySelectorAll("[overlay_source='" + MY_ADDON_ID + "']");

    for (let i = 0; i < s.length; i++) {
      let p = s[i].parentNode;
      p.removeChild(s[i]);
    }

    let e = new Event("unload-" + MY_ADDON_ID);
    window.dispatchEvent(e);

    // unload CSS
    s = document.querySelectorAll("overlayed_css[source='" + MY_ADDON_ID + "']");
    for (let i = 0; i < s.length; i++) {
      unloadCSS(s[i].getAttribute("href"), window);

      let p = s[i].parentNode;
      p.removeChild(s[i]);
    }
  },

  // nsIWindowMediatorListener functions
  onOpenWindow: function(xulWindow) {
    // A new window has opened
    let domWindow = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindow);

    // Wait for it to finish loading
    domWindow.addEventListener("load", function listener() {
      domWindow.removeEventListener("load", listener, false);

      for (let w in LOAD_OVERLAYS) {
        // If this is a relevant window then setup its UI
        if (domWindow.document.location.href.startsWith(w))
          WindowListener.setupUI(domWindow, LOAD_OVERLAYS[w]);
      }
    }, false);
  },

  onCloseWindow: function(xulWindow) {},

  onWindowTitleChange: function(xulWindow, newTitle) {}
};


var TinyjsdOverlays = {
  startup: function(reason) {
    let wm = Cc["@mozilla.org/appshell/window-mediator;1"].
    getService(Ci.nsIWindowMediator);

    // Get the list of browser windows already open
    let windows = wm.getEnumerator(null);
    while (windows.hasMoreElements()) {
      let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);

      for (let w in LOAD_OVERLAYS) {
        // If this is a relevant window then setup its UI
        if (domWindow.document.location.href.startsWith(w))
          WindowListener.setupUI(domWindow, LOAD_OVERLAYS[w]);
      }
    }

    // Wait for any new browser windows to open
    wm.addListener(WindowListener);
  },

  shutdown: function(reason) {
    // When the application is shutting down we normally don't have to clean
    // up any UI changes made
    if (reason == APP_SHUTDOWN)
      return;

    let wm = Cc["@mozilla.org/appshell/window-mediator;1"].getService(Ci.nsIWindowMediator);

    // Get the list of browser windows already open
    let windows = wm.getEnumerator(null);
    while (windows.hasMoreElements()) {
      let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);

      WindowListener.tearDownUI(domWindow);

      // If this is a window opened by the addon, then close it
      if (domWindow.document.location.href.startsWith(BASE_PATH))
        domWindow.close();
    }

    // Stop listening for any new browser windows to open
    wm.removeListener(WindowListener);
  }
};

function getAppId() {
  return Cc["@mozilla.org/xre/app-info;1"].getService(Ci.nsIXULAppInfo).ID;
}


/**
 * Register a new overlay (XUL)
 * @param xul:      DOM-tre  - source XUL to register
 * @param window:   Object   - target window
 * @param document: Object   - document in target window
 */


/**
 * Load XUL into window
 * @param srcUrl:   String - URL of XUL to load
 * @param window:   Object - target window
 * @param document: Object - document in target window
 */

function insertXul(srcUrl, window, document, callback) {


  function injectDOM(xul) {
    function $(id) {
      return document.getElementById(id);
    }

    function $$(q) {
      return document.querySelector(q);
    }

    function getToolbarNthTag(toolbar, tagName, elemIndex) {
      if (elemIndex >= 0) {
        let s = new RegExp("^" + tagName + "[0-9]+$");
        let node = toolbar.firstChild;
        let n = -1;
        while (node) {
          if (node.id.search(s) === 0) n++;
          if (n == elemIndex) return node;
          node = node.nextSibling;
        }
      }

      return null;
    }

    /**
     * get toolbar element for separator, spacer and spring
     */
    function getToolbarElem(toolbar, currentset, index) {
      if (currentset[index] && (currentset[index].search(/^(separator|spacer|spring)$/) === 0)) {
        let target = currentset[index];
        let foundIndex = -1;
        // find the n-th separator/spacer/spring
        for (let i = 0; i < index + 1; i++) {
          if (currentset[i] === target) ++foundIndex;
        }

        return getToolbarNthTag(toolbar, target, foundIndex);
      }
      return null;
    }

    /**
     * Add a button at the correct place on a toolbar.
     * Buttons are always added to the toolbar palette. Whether or not the button is added to the
     * toolbar depends on:
     * 1. if it's in the currentset of the toolbar (i.e. added previously)
     * 2. if it's defined a default button and the button has never been added to the toolbar before
     *
     * @param palette:      Object - the toolbar palette containing all buttons (also invisible ones)
     * @param toolbarButton Object - the button to add
     * @param toolbarId     String - the ID of the toolbar where the button shall be added
     *
     */
    function addToolbarButton(palette, toolbarButton, toolbarId) {
      DEBUG_LOG("overlays.jsm: adding button '" + toolbarButton.id + " to " + toolbarId + "'\n");

      let toolbar = $(toolbarId);
      let buttonId = toolbarButton.id;
      let firstRun = false;

      let currentset = toolbar.getAttribute("currentset").split(/,/);
      if (toolbar.getAttribute("currentset").length === 0) {
        currentset = toolbar.getAttribute("defaultset").split(/,/);
      }

      toolbarButton.setAttribute("overlay_source", MY_ADDON_ID);
      palette.appendChild(toolbarButton);

      let index = currentset.indexOf(buttonId);
      if (index >= 0) {
        // button was added before
        let before = null;

        for (let i = index + 1; i < currentset.length; i++) {
          if (currentset[i].search(/^(separator|spacer|spring)$/) < 0) {
            before = $(currentset[i]);
          }
          else {
            before = getToolbarElem(toolbar, currentset, i);
          }
          if (before) break;
        }

        toolbar.insertItem(buttonId, before);
      }
    }


    // loadOverlay for the poor
    function addNode(target, node) {
      // helper: insert according to position
      function insertX(nn, attr, callbackFunc) {
        if (!nn.hasAttribute(attr)) {
          return false;
        }
        let places = nn.getAttribute(attr)
          .split(',')
          .map(p => p.trim())
          .filter(p => Boolean(p));
        for (let p of places) {
          let pn = $$('#' + target.id + ' > #' + p);
          if (!pn) {
            continue;
          }
          if (callbackFunc) callbackFunc(pn);
          return true;
        }
        return false;
      }

      node.setAttribute("overlay_source", MY_ADDON_ID);

      // bring the node to be inserted into the document
      let nn = document.importNode(node, true);

      // try to insert according to insertafter/before
      if (insertX(nn, 'insertafter',
          pn => pn.parentNode.insertBefore(nn, pn.nextSibling)) ||
        insertX(nn, 'insertbefore',
          pn => pn.parentNode.insertBefore(nn, pn))) {}
      // just append
      else {
        target.appendChild(nn);
      }
      return nn;
    }

    DEBUG_LOG("overlays.jsm: injectDOM: gonna stuff: " + srcUrl + " into: " + document.location.href + "\n");

    try {
      // store unloaders for all elements inserted
      let unloaders = [];

      // Add all overlays
      for (let id in xul) {
        let target = $(id);
        if (!target) {
          if (xul[id].tagName === "toolbarpalette") {
            let toolboxId = xul[id].getAttribute("targetToolbox");
            let toolbarId = xul[id].getAttribute("targetToolbar");
            let defaultSet = xul[id].getAttribute("targetToolbarDefaultset");
            if (!toolboxId) {
              DEBUG_LOG("overlays.jsm: injectDOM: cannot overlay toolbarpalette " + id + ": no target toolbox defined\n");
              continue;
            }
            if (!toolbarId) {
              DEBUG_LOG("overlays.jsm: injectDOM: cannot overlay toolbarpalette " + id + ": no target toolbar defined\n");
              continue;
            }

            if (defaultSet) {
              let toolbar = $(toolbarId);
              if (toolbar) {
                toolbar.setAttribute("defaultset", defaultSet);
              }
            }

            let toolbox = $(toolboxId);
            let palette = toolbox.palette;
            let c = xul[id].children;

            while (c.length > 0) {
              // added toolbar buttons are removed from the palette's children
              if (c[0].tagName && c[0].tagName === "toolbarbutton") {
                addToolbarButton(palette, c[0], toolbarId);
              }
            }
          }
          else {
            DEBUG_LOG("overlays.jsm: injectDOM: no target for " + id + ", not inserting\n");
          }
          continue;
        }

        // insert all children
        for (let n of xul[id].children) {
          if (n.nodeType != n.ELEMENT_NODE) {
            continue;
          }
          let nn = addNode(target, n);
          unloaders.push(() => nn.parentNode.removeChild(nn));
        }
      }
    }
    catch (ex) {
      ERROR_LOG("overlays.jsm: injectDOM: failed to inject xul " + ex.toString());
    }
  }

  DEBUG_LOG("overlays.jsm: insertXul(" + srcUrl + ")\n");

  let xmlReq = new XMLHttpRequest();

  xmlReq.onload = function() {
    DEBUG_LOG("loaded: " + srcUrl + "\n");
    let document = xmlReq.responseXML;

    // clean the document a bit
    let emptyNodes = document.evaluate(
      "//text()[normalize-space(.) = '']", document, null, 7, null);
    for (let i = 0, e = emptyNodes.snapshotLength; i < e; ++i) {
      let n = emptyNodes.snapshotItem(i);
      n.parentNode.removeChild(n);
    }

    // prepare all elements to be inserted
    let xul = {};
    for (let n = document.documentElement.firstChild; n; n = n.nextSibling) {
      if (n.nodeType != n.ELEMENT_NODE) {
        continue;
      }
      if (n.tagName === "script" || n.tagName === "link") {
        continue;
      }
      if (!n.hasAttribute("id")) {
        DEBUG_LOG("overlays.jsm: insertXul: no ID for " + n.tagName + "\n");
        continue;
      }

      let id = n.getAttribute("id");
      if (id in xul) {
        DEBUG_LOG("overlays.jsm: insertXul: duplicate ID: " + id + "\n");
        continue;
      }
      xul[id] = n;
    }
    if (!Object.keys(xul).length) {
      ERROR_LOG("No element to overlay found. Maybe a parsing error?\n");
      return;
    }

    injectDOM(xul, window, document);

    // load css into window
    let css = document.getElementsByTagName("link");
    for (let i = 0; i < css.length; i++) {
      let rel = css[i].getAttribute("rel");
      if (rel && rel === "stylesheet") {
        loadCss(css[i].getAttribute("href"), window);
      }
    }

    // load scripts into window
    let sc = document.getElementsByTagName("script");
    for (let i = 0; i < sc.length; i++) {
      let src = sc[i].getAttribute("src");
      if (src) {
        loadScript(src, window);
      }
    }

    if (callback) {
      callback(0);
    }
  };


  xmlReq.onerror = xmlReq.onabort = function() {
    ERROR_LOG("Failed to load " + srcUrl + "\n");
    callback(0);
  };

  xmlReq.overrideMimeType("application/xml");
  xmlReq.open("GET", BASE_PATH + srcUrl);

  // Elevate the request, so DTDs will work. Not a security issue since we
  // always load from BASE_PATH, and that is our privileged chrome package.
  // This is no different than regular overlays.

  let sec = Cc['@mozilla.org/scriptsecuritymanager;1'].getService(Ci.nsIScriptSecurityManager);
  try {
    xmlReq.channel.owner = sec.getSystemPrincipal();
  }
  catch (ex) {
    ERROR_LOG("Failed to set system principal\n");
  }

  xmlReq.send();

}

function loadOverlay(window, overlayDefs, index) {
  DEBUG_LOG("overlays.jsm: loadOverlay(" + index + ")\n");

  try {
    if (index < overlayDefs.length) {
      let overlayDef = overlayDefs[index];
      let document = window.document;
      let url = overlayDef;

      if (typeof(overlayDef) !== "string") {
        url = overlayDef.url;
        if (overlayDef.application.substr(0, 1) === "!") {
          if (overlayDef.application.indexOf(getAppId()) > 0) {
            DEBUG_LOG("overlays.jsm: loadOverlay: skipping " + url + "\n");
            loadOverlay(window, overlayDefs, index + 1);
            return;
          }
        }
        else if (overlayDef.application.indexOf(getAppId()) < 0) {
          DEBUG_LOG("overlays.jsm: loadOverlay: skipping " + url + "\n");
          loadOverlay(window, overlayDefs, index + 1);
          return;
        }
      }

      let observer = function(result) {
        loadOverlay(window, overlayDefs, index + 1);
      };

      insertXul(url, window, document, observer);
    }
    else {
      DEBUG_LOG("overlays.jsm: loadOverlay: completed\n");

      let e = new Event("load-" + MY_ADDON_ID);
      window.dispatchEvent(e);
      DEBUG_LOG("overlays.jsm: loadOverlay: event completed\n");
    }
  }
  catch (ex) {
    ERROR_LOG("overlays.jsm: could not overlay for " + window.document.location.href + ":\n" + ex.toString() + "\n");
  }
}


function unloadCSS(url, targetWindow) {
  let domWindowUtils = targetWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
  domWindowUtils.removeSheetUsingURIString(url, 1);
}

function loadCss(url, targetWindow) {
  try {
    let domWindowUtils = targetWindow.QueryInterface(Ci.nsIInterfaceRequestor).getInterface(Ci.nsIDOMWindowUtils);
    domWindowUtils.loadSheetUsingURIString(url, 1);
    let document = targetWindow.document;
    let e = document.createElement("overlayed_css");
    e.setAttribute("href", url);
    e.setAttribute("source", MY_ADDON_ID);

    let node = document.firstChild;
    while (node && (!node.tagName)) {
      node = node.nextSibling;
    }
    if (node) node.appendChild(e);
  }
  catch (ex) {
    ERROR_LOG("Error while loading CSS " + url + ":\n" + ex.message + "\n");
  }
}

function loadScript(url, targetWindow) {
  let loader = Cc["@mozilla.org/moz/jssubscript-loader;1"].getService(Ci.mozIJSSubScriptLoader);

  try {
    loader.loadSubScript(url, targetWindow);
  }
  catch (ex) {
    ERROR_LOG("Error while loading script " + url + ":\n" + ex.message + "\n");
  }
}
