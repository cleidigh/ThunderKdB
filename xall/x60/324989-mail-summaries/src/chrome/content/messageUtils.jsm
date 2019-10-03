/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var EXPORTED_SYMBOLS = ["ComposeMessageToAddress", "FormatDisplayNameNoYou",
                        "OpenMessageInTab", "OpenMessagesInTab",
                        "DisplayMessage", "DisplayMessages",
                        "AddCommandListener", "ContextMenu", "AddContextMenu",
                        "AddOverflowTooltip", "IsMessageIndexed"];

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/MailUtils.js");
Cu.import("resource:///modules/MailConsts.js");
Cu.import("resource:///modules/gloda/public.js");
const MU = MailUtils;
const MC = MailConsts;

// XXX Move to mailCore?
function ComposeMessageToAddress(addresses, server, format) {
  let fields = Cc["@mozilla.org/messengercompose/composefields;1"]
                 .createInstance(Ci.nsIMsgCompFields);
  let params = Cc["@mozilla.org/messengercompose/composeparams;1"]
                 .createInstance(Ci.nsIMsgComposeParams);
  let accountManager = Cc["@mozilla.org/messenger/account-manager;1"]
                         .getService(Ci.nsIMsgAccountManager);
  let msgComposeService = Cc["@mozilla.org/messengercompose;1"]
                            .getService(Ci.nsIMsgComposeService);

  fields.to = addresses.to;
  fields.cc = addresses.cc;
  fields.bcc = addresses.bcc;
  fields.newsgroups = addresses.newsgroups;

  params.type = Ci.nsIMsgCompType.New;
  params.format = format;
  params.identity = accountManager.getFirstIdentityForServer(server);
  params.composeFields = fields;
  msgComposeService.OpenComposeWindowWithParams(null, params);
}

// Copied from msgHdrViewOverlay.js. This should probably be a function on
// nsIAbManager.
function getCardForEmail(emailAddress)
{
  // Email address is searched for in any of the address books that support
  // the cardForEmailAddress function.
  // Future expansion could be to domain matches

  let books = Cc["@mozilla.org/abmanager;1"]
                .getService(Ci.nsIAbManager).directories;

  let result = { book: null, card: null };

  while (!result.card && books.hasMoreElements()) {
    let ab = books.getNext().QueryInterface(Ci.nsIAbDirectory);
    try {
      let card = ab.cardForEmailAddress(emailAddress);
      if (card) {
        result.book = ab;
        result.card = card;
      }
    }
    catch (ex) { }
  }

  return result;
}

function FormatDisplayNameNoYou(aEmailAddress, aHeaderDisplayName) {
  let card = getCardForEmail(aEmailAddress).card;

  if (card) {
    if (aHeaderDisplayName == aEmailAddress ||
        card.getProperty("PreferDisplayName", true) != false)
      return card.displayName || aHeaderDisplayName;
  }

  return aHeaderDisplayName;
}

function OpenMessageInTab(aMsgHdr, aViewWrapperToClone, aTabmail, aBgSwap) {
  OpenMessagesInTab([aMsgHdr], aViewWrapperToClone, aTabmail, aBgSwap);
}

function OpenMessagesInTab(aMsgHdrs, aViewWrapperToClone, aTabmail, aBgSwap) {
  let pref = Cc["@mozilla.org/preferences-service;1"]
               .getService(Ci.nsIPrefService)
               .getBranch(null);
  let bgLoad = pref.getBoolPref("mail.tabs.loadInBackground");
  if (aBgSwap)
    bgLoad = !bgLoad;

  let mail3PaneWindow = null;
  if (!aTabmail) {
    // Try opening new tabs in a 3pane window
    let windowMediator = Cc["@mozilla.org/appshell/window-mediator;1"]
                           .getService(Ci.nsIWindowMediator);
    mail3PaneWindow = windowMediator.getMostRecentWindow("mail:3pane");
    if (mail3PaneWindow)
      aTabmail = mail3PaneWindow.document.getElementById("tabmail");
  }

  if (aTabmail) {
    let i = 0;
    for (let msgHdr of aMsgHdrs) {
      // Open all the tabs in the background, except for the last one, which
      // is opened according to our preference.
      let background = bgLoad || i < (aMsgHdrs.length - 1);
      i++;
      aTabmail.openTab("message", {msgHdr: msgHdr,
                                   viewWrapperToClone: aViewWrapperToClone,
                                   background: background});
    }
    if (mail3PaneWindow)
      mail3PaneWindow.focus();
  }
  else {
    // We still haven't found a tabmail, so we'll need to open new windows
    MU.openMessagesInNewWindows(aMsgHdrs, aViewWrapperToClone);
  }
}

// A fork from MailUtils.js, since we need to be able to control background-ness
function DisplayMessage(aMsgHdr, aViewWrapperToClone, aTabmail, aBackground) {
  DisplayMessages([aMsgHdr], aViewWrapperToClone, aTabmail, aBackground);
}

function DisplayMessages(aMsgHdrs, aViewWrapperToClone, aTabmail, aBgSwap) {
  let pref = Cc["@mozilla.org/preferences-service;1"]
               .getService(Ci.nsIPrefService)
               .getBranch(null);
  let openMessageBehavior = pref.getIntPref("mail.openMessageBehavior");

  if (openMessageBehavior == MC.OpenMessageBehavior.NEW_WINDOW) {
    MU.openMessagesInNewWindows(aMsgHdrs, aViewWrapperToClone);
  }
  else if (openMessageBehavior == MC.OpenMessageBehavior.EXISTING_WINDOW) {
    // Try reusing an existing window. If we can't, fall back to opening new
    // windows
    if (aMsgHdrs.length > 1 || !MU.openMessageInExistingWindow(aMsgHdrs[0]))
      MU.openMessagesInNewWindows(aMsgHdrs, aViewWrapperToClone);
  }
  else if (openMessageBehavior == MC.OpenMessageBehavior.NEW_TAB) {
    OpenMessagesInTab(aMsgHdrs, aViewWrapperToClone, aTabmail, aBgSwap);
  }
}

function AddCommandListener(node, onclick) {
  node.addEventListener("mousedown", function(event) {
    event.target.focus();
    event.preventDefault();
  }, false);
  node.addEventListener("mouseup", onclick, false);
  node.addEventListener("keypress", function(event) {
    if (event.keyCode == 13)
      return onclick(event);
  }, false);
}

function ContextMenu(menu, events, showMethodName) {
  if (showMethodName === undefined)
    showMethodName = "showContextMenu";

  this.menu = menu;
  for (let item of this.menu.querySelectorAll("[data-action]")) {
    let method = "context" + item.dataset.action;
    item.addEventListener("click", function(event) {
      event.triggerNode = this.triggerNode;
      events[method].call(events, event);
    }.bind(this));
  }
  if (events[showMethodName]) {
    this.menu.addEventListener("show", function(event) {
      event.triggerNode = this.triggerNode;
      events[showMethodName].call(events, event);
    }.bind(this));
  }
}

ContextMenu.prototype = {
  get id() {
    return this.menu.id;
  },

  item: function(action) {
    return this.menu.querySelector("[data-action=\"" + action + "\"]");
  },
};

function AddContextMenu(node, contextMenu) {
  node.setAttribute("contextmenu", contextMenu.id);
  node.addEventListener("contextmenu", function(event) {
    contextMenu.triggerNode = node;
  }, false);
}

function AddOverflowTooltip(node) {
  node.addEventListener("overflow", function() {
    this.title = this.textContent;
  }, false);
  node.addEventListener("underflow", function() {
    this.title = "";
  }, false);
}

function IsMessageIndexed(message) {
  return Services.prefs.getBoolPref(
         "mailnews.database.global.indexer.enabled") &&
         Gloda.isMessageIndexed(message);
}
