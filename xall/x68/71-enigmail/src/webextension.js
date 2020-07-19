"use strict";

/* global ExtensionCommon: false */
var Services = ChromeUtils.import("resource://gre/modules/Services.jsm").Services;
var ExtensionSupport = ChromeUtils.import("resource:///modules/ExtensionSupport.jsm").ExtensionSupport;

Components.utils.importGlobalProperties(["XMLHttpRequest"]);

const EXTENSION_NAME = "{847b3a00-7ab1-11d4-8f02-006008948af5}"; // Enigmail GUID
var gAllModules = [];

var enigmailApi = class extends ExtensionCommon.ExtensionAPI {

  onStartup() {
    const aomStartup = Cc["@mozilla.org/addons/addon-manager-startup;1"].getService(Ci.amIAddonManagerStartup);
    const manifestURI = Services.io.newURI("manifest.json", null, this.extension.rootURI);
    this.chromeHandle = aomStartup.registerChrome(manifestURI, [
      ["content", "enigmail", "chrome/content/"],
      ["locale", "enigmail", "en-US", "chrome/locale/en-US/"],
      ["locale", "enigmail", "ar", "chrome/locale/ar/"],
      ["locale", "enigmail", "bg", "chrome/locale/bg/"],
      ["locale", "enigmail", "ca", "chrome/locale/ca/"],
      ["locale", "enigmail", "cs", "chrome/locale/cs/"],
      ["locale", "enigmail", "da", "chrome/locale/da/"],
      ["locale", "enigmail", "de", "chrome/locale/de/"],
      ["locale", "enigmail", "el", "chrome/locale/el/"],
      ["locale", "enigmail", "es-ES", "chrome/locale/es-ES/"],
      ["locale", "enigmail", "fa", "chrome/locale/fa/"],
      ["locale", "enigmail", "fi", "chrome/locale/fi/"],
      ["locale", "enigmail", "fr", "chrome/locale/fr/"],
      ["locale", "enigmail", "gd", "chrome/locale/gd/"],
      ["locale", "enigmail", "gl", "chrome/locale/gl/"],
      ["locale", "enigmail", "hr", "chrome/locale/hr/"],
      ["locale", "enigmail", "hu", "chrome/locale/hu/"],
      ["locale", "enigmail", "it", "chrome/locale/it/"],
      ["locale", "enigmail", "ja", "chrome/locale/ja/"],
      ["locale", "enigmail", "ko", "chrome/locale/ko/"],
      ["locale", "enigmail", "lt", "chrome/locale/lt/"],
      ["locale", "enigmail", "nb", "chrome/locale/nb/"],
      ["locale", "enigmail", "nl", "chrome/locale/nl/"],
      ["locale", "enigmail", "pl", "chrome/locale/pl/"],
      ["locale", "enigmail", "pt-BR", "chrome/locale/pt-BR/"],
      ["locale", "enigmail", "pt-PT", "chrome/locale/pt-PT/"],
      ["locale", "enigmail", "ro", "chrome/locale/ro/"],
      ["locale", "enigmail", "ru", "chrome/locale/ru/"],
      ["locale", "enigmail", "sk", "chrome/locale/sk/"],
      ["locale", "enigmail", "sl", "chrome/locale/sl/"],
      ["locale", "enigmail", "sq", "chrome/locale/sq/"],
      ["locale", "enigmail", "sv", "chrome/locale/sv/"],
      ["locale", "enigmail", "tr", "chrome/locale/tr/"],
      ["locale", "enigmail", "vi", "chrome/locale/vi/"],
      ["locale", "enigmail", "zh-CN", "chrome/locale/zh-CN/"],
      ["locale", "enigmail", "zh-TW", "chrome/locale/zh-TW/"]
    ]);

    performStartup({
      version: this.extension.version,
      id: this.extension.id,
      installPath: this.extension.rootURI.file
    }, startupReason.ADDON_ENABLE);
    Services.console.logStringMessage("Enigmail startup completed");
  }

  onShutdown(isAppShutdown) {
    if (isAppShutdown) return;

    // invalidate the startup cache, such that after updating the addon the old
    // version is no longer cached
    Services.obs.notifyObservers(null, "startupcache-invalidate");
    performShutdown(null, startupReason.ADDON_DISABLE);
    this.chromeHandle.destruct();
    this.chromeHandle = null;

    console.debug("webextension.js: Enigmail shutdown");
  }

  getAPI(context) {
    return {
      enigmailApi: {
        startEnigmail() {
          // nothing done here
        }
      }
    };
  }

  close() {
    console.debug("webextension.js: close");
    ExtensionSupport.unregisterWindowListener(EXTENSION_NAME);
  }
};

const startupReason = {
  APP_STARTUP: 1, // The application is starting up.
  APP_SHUTDOWN: 2, // The application is shutting down.
  ADDON_ENABLE: 3, // Addon was enabled
  ADDON_DISABLE: 4 //	The add-on is being disabled. (Also sent during uninstallation)
};

function performStartup(data, reason) {
  try {
    const EnigmailApp = ChromeUtils.import("chrome://enigmail/content/modules/app.jsm").EnigmailApp;
    const EnigmailCore = ChromeUtils.import("chrome://enigmail/content/modules/core.jsm").EnigmailCore;
    const Services = ChromeUtils.import("resource://gre/modules/Services.jsm").Services;

    loadListOfModules();

    EnigmailApp.initAddon(data);
    EnigmailCore.startup(reason);

    Services.console.logStringMessage("Enigmail bootstrap completed");
  }
  catch (ex) {
    logException(ex);
  }
}

function performShutdown(data, reason) {
  try {
    const subprocess = ChromeUtils.import("chrome://enigmail/content/modules/subprocess.jsm").subprocess;
    subprocess.onShutdown();

    const EnigmailCore = ChromeUtils.import("chrome://enigmail/content/modules/core.jsm").EnigmailCore;
    const EnigmailWindows = ChromeUtils.import("chrome://enigmail/content/modules/windows.jsm").EnigmailWindows;
    const Services = ChromeUtils.import("resource://gre/modules/Services.jsm").Services;

    shutdownModule(EnigmailWindows, reason);
    shutdownModule(EnigmailCore, reason);
    unloadModules();

    // HACK WARNING: The Addon Manager does not properly clear all addon related caches on update;
    //               in order to fully update images and locales, their caches need clearing here
    Services.obs.notifyObservers(null, "chrome-flush-caches", null);

  }
  catch (ex) {
    logException(ex);
  }
}

/**
 * Perform shutdown of a module
 */
function shutdownModule(module, reason) {
  try {
    module.shutdown(reason);
  }
  catch (ex) {}
}

/**
 * Load list of all Enigmail modules that can be potentially loaded
 */
function loadListOfModules() {
  let request = new XMLHttpRequest();
  request.open("GET", "chrome://enigmail/content/modules/all-modules.txt", true); // async=true
  request.responseType = "text";
  request.onerror = function(event) {};
  request.onload = function(event) {
    if (request.response) {
      gAllModules = [];
      let modules = request.response.split(/[\r\n]/);
      for (let mod of modules) {
        mod = mod.replace(/^chrome/, "");
        gAllModules.push(mod);
      }
    }
    else
      request.onerror(event);
  };
  request.send();
}


/**
 * Unload all Enigmail modules that were potentially loaded
 */
function unloadModules() {
  for (let mod of gAllModules) {
    try {
      // cannot unload filtersWrapper as you can't unregister filters in TB
      if (mod.search(/filtersWrapper\.jsm$/) < 0) {
        Components.utils.unload("chrome://enigmail" + mod);
      }
    }
    catch (ex) {
      logException(ex);
    }
  }
}

function logException(exc) {
  try {
    const {
      Services
    } = ChromeUtils.import("resource://gre/modules/Services.jsm");
    Services.console.logStringMessage(exc.toString() + "\n" + exc.stack);
  }
  catch (x) {}
}
