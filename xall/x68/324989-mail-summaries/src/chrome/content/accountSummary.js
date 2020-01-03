/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource:///modules/DisplayNameUtils.jsm");
Cu.import("resource:///modules/iteratorUtils.jsm");
Cu.import("resource:///modules/MailServices.jsm");
Cu.import("resource:///modules/folderUtils.jsm");
Cu.import("resource:///modules/MailUtils.jsm");
Cu.import("resource:///modules/templateUtils.js");
Cu.import("chrome://mailsummaries/content/colorUtils.jsm");
Cu.import("chrome://mailsummaries/content/messageUtils.jsm");
Cu.import("chrome://mailsummaries/content/stats.jsm");

// Since this is executed in the context of the account summary page, not main
// chrome, we need to use some globals from our parent.
var global = window.top;

function debugLog(str) {
  if (Services.prefs.getBoolPref("extensions.mailsummaries.debug"))
    console.log("[account summary]", str);
}

var gMessenger = Cc["@mozilla.org/messenger;1"]
                   .createInstance(Ci.nsIMessenger);

// Set up our string formatter for localizing strings.
XPCOMUtils.defineLazyGetter(this, "formatString", function() {
  let formatter = new PluralStringFormatter(
    "chrome://mailsummaries/locale/accountSummary.properties"
  );
  return function() {
    return formatter.get.apply(formatter, arguments);
  };
});

/**
 * Make a function asynchronous to allow other things to run while we're
 * processing. This relies on the function being a generator, which will get
 * iterated over until it's finished. If you need to return something from your
 * function, use a callback.
 *
 * @param gen The function to be made asynchronous.
 */
function makeAsync(gen) {
  // slow bits get done in a timeout, to preserve apparent speed
  function doDefer() {
    if (!gen.next().done)
      window.setTimeout(function() { doDefer(); }, 0);
  }
  doDefer();
}

/**
 * Create a new account summary object.
 */
function AccountSummary() {
  this._analyzers = [];
  this._timeoutId = null;
  this.mailSession = Cc["@mozilla.org/messenger/services/session;1"]
                       .getService(Ci.nsIMsgMailSession);
}

AccountSummary.prototype = {
  /**
   * Return a list of all of the folders in a server, using depth-first
   * search.
   *
   * @return a list of nsIMsgDBFolders
   */
  enumerateFolders: function() {
    let folders = this.server.rootFolder.descendants;
    if (folders) {
      return fixIterator(folders.enumerate(), Ci.nsIMsgFolder);
    }
    else {
      folders = Cc["@mozilla.org/supports-array;1"]
                  .createInstance(Ci.nsISupportsArray);
      this.server.rootFolder.ListDescendents(folders);
      return fixIterator(folders, Ci.nsIMsgFolder);
    }
  },

  /**
   * Register a new folder analyzer.
   *
   * @param analyzer the analyzer object
   */
  registerAnalyzer: function(analyzer) {
    this._analyzers.push(analyzer);
    analyzer.onregistered(this);
  },

  /**
   * Summarize a server.
   *
   * @param server the server we're summarizing
   * @param contentDoc the document corresponding to accountSummary.xhtml
   */
  summarize: function(server) {
    debugLog("Loading account summary for " + server.prettyName);

    this.server = server;

    // Set up the unload listener for the account summary pane. This can be
    // unloaded in one of two ways: 1) by being hidden (when switching to a
    // non-account summary view), or 2) by listening to the "unload" event (when
    // switching to a different account's summary).
    this._unloadFunc = (e) => {
      this._onUnload();
    };
    let deck = global.document.getElementById("displayDeck");
    deck.addEventListener("select", this._unloadFunc, false);
    window.addEventListener("unload", this._unloadFunc, false);

    let heading = document.getElementById("heading");
    heading.textContent = formatString(
      "accountSummary", [this.server.prettyName]
    );

    let settings = document.getElementById("settings");
    AddCommandListener(settings, (event) => {
      if (event.button == 0 || event.button == undefined)
        global.MsgAccountManager(null);
    });

    let more_settings = document.getElementById("more_settings");
    AddCommandListener(more_settings, (event) => {
      if (event.button != 0 && event.button != undefined)
        return;

      if (!more_settings.classList.contains("active")) {
        more_settings.classList.add("active");
        event.stopPropagation();
      }
    });

    window.addEventListener("mouseup", (event) => {
      if (more_settings.classList.contains("active"))
        more_settings.classList.remove("active");
    }, false);

    let search_messages = document.getElementById("search_messages");
    if (server.canSearchMessages) {
      search_messages.classList.remove("hidden");
      AddCommandListener(search_messages, (event) => {
        if (event.button != 0 && event.button != undefined)
          return;
        global.MsgSearchMessages();
      });
    }
    else {
      search_messages.classList.add("hidden");
    }

    let manage_filters = document.getElementById("manage_filters");
    if (server.canHaveFilters) {
      manage_filters.classList.remove("hidden");
      AddCommandListener(manage_filters, (event) => {
        if (event.button != 0 && event.button != undefined)
          return;
        global.MsgFilters();
      });
    }
    else {
      manage_filters.classList.add("hidden");
    }

    let manage_subs = document.getElementById("manage_subscriptions");
    let protocolInfo = Cc["@mozilla.org/messenger/protocol/info;1?type=" +
                          server.type].getService(Ci.nsIMsgProtocolInfo);
    if (server.rootFolder.canSubscribe && protocolInfo.canGetMessages) {
      manage_subs.classList.remove("hidden");
      AddCommandListener(manage_subs, (event) => {
        if (event.button != 0 && event.button != undefined)
          return;

        if (server.type == "rss")
          global.openSubscriptionsDialog(server.rootFolder);
        else
          window.setTimeout(() => { global.Subscribe(); }, 0);
      });
    }
    else {
      manage_subs.classList.add("hidden");
    }

    let offline_settings = document.getElementById("offline_settings");
    if (server.offlineSupportLevel != 0) {
      offline_settings.classList.remove("hidden");
      AddCommandListener(offline_settings, (event) => {
        if (event.button != 0 && event.button != undefined)
          return;
        global.MsgAccountManager("am-offline.xul");
      });
    }
    else {
      offline_settings.classList.add("hidden");
    }

    // Make sure we aren't processing in the background.
    if (this._timeoutId !== null)
      window.clearTimeout(this._timeoutId);

    for (let analyzer of this._analyzers) {
      analyzer.init(this);
    }

    for (let analyzer of this._analyzers) {
      if (analyzer.render)
        analyzer.render();
    }
  },

  /**
   * Unload the account summary, cleaning up widgets and unhooking event
   * listeners.
   */
  _onUnload: function() {
    debugLog("Unloading account summary");

    for (let analyzer of this._analyzers)
      analyzer.uninit(this);

    let deck = global.document.getElementById("displayDeck");
    deck.removeEventListener("select", this._unloadFunc, false);
    window.removeEventListener("unload", this._unloadFunc, false);
  },
};

var gAccountSummary = new AccountSummary();

window.addEventListener("DOMContentLoaded", function() {
  let query = window.location.search.slice(1);
  let params = {};
  for (let piece of query.split("&")) {
    let [key, value] = piece.split("=");
    params[key] = decodeURIComponent(value);
  }

  let server = MailServices.accounts.getIncomingServer(params.serverKey);
  gAccountSummary.summarize(server);
}, false);
