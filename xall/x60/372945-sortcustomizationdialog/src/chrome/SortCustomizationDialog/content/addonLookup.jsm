/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["cacheAddons", "getAddonName", "allAddons", "haveCache", "addAddon", "removeAddon"];

Components.utils.import("resource://gre/modules/AddonManager.jsm");

var cachedAddons = {};

function debugLog(str) {
//  dump("SCD: " + str + "\n");
}

function cacheAddons() {
  if (!haveCache()) {
    debugLog("cache!\n");
    AddonManager.getAddonsByTypes(["extension"], function (addons) {
      for(let i = 0; i < addons.length; i++) {
        cacheAddon(addons[i]);
      }
    });
  } else {
    debugLog("have cache!\n");
  }
}


function cacheAddon(addon) {
  debugLog("addon: " + addon.name);
  let spec = addon.getResourceURI("").spec;
  let url  = spec.match(/.*?\/extensions\/(.*)/);
  debugLog("url: " + url);
  if (url && url.length >= 1) {
    debugLog("url: " + url);
    url  = url[1].match(/(.*)@jetpack\.xpi/);
    debugLog("url: " + url);
    if (url && url.length >= 1) {
      let res = url[1];
      debugLog("res: " + res);
      cachedAddons[addon.name] = res.toLowerCase();
    }
    else {
      debugLog("spec1: " + spec);
      cachedAddons[addon.name] = spec; //.QueryInterface(Components.interfaces.nsIFileURL);
    }
  }
  else {
    debugLog("spec2: " + spec);
    cachedAddons[addon.name] = spec; //.QueryInterface(Components.interfaces.nsIFileURL);
  }
}

function addAddon(addon) {
  cacheAddon(addon);
  debugLog("addAddon\n");
}

function removeAddon(addon) {
  delete cachedAddons[addon.name];
  debugLog("removeAddon\n");
}

function getAddonName(url) {
  let res = "";
  for (name in cachedAddons) {
    if (url.toLowerCase().indexOf(cachedAddons[name].toLowerCase()) != -1) {
      res = name;
      break;
    }
  }
  
  return res;
}

function allAddons() {
  return cachedAddons;
}

function haveCache() {
  return Object.keys(cachedAddons).length > 0;
}