/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2010 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, Exception: CE, results: Cr, } = Components;
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
try { // COMPAT for TB 78 (bug 1649554)
  var { ComponentUtils } = ChromeUtils.import("resource://gre/modules/ComponentUtils.jsm");
} catch (ex) { // COMPAT for TB 78 (bug 1649554)
  var ComponentUtils = XPCOMUtils; // COMPAT for TB 78 (bug 1649554)
} // COMPAT for TB 78 (bug 1649554)

const catMan = Cc["@mozilla.org/categorymanager;1"]
                 .getService(Ci.nsICategoryManager);

function ewsserver() {
}

ewsserver.prototype = {
  name: "exquillaserver",
  // This should be the extension that
  //  contains the am-ewsserver.* files
  chromePackageName: "exquilla", 
  showPanel: function showPanel(server) {
    if (server.type == 'exquilla')
      return true;
    return false;
  },

  QueryInterface: ChromeUtils.generateQI(["nsIMsgAccountManagerExtension"]),
  classDescription: "Exchange Web Services server pane",
  classID: Components.ID("{4D08B157-4381-48a8-8E9C-8833315F2B29}"),
  contractID: "@mozilla.org/accountmanager/extension;1?name=exquillaserver",

  _xpcom_categories: [{category: "mailnews-accountmanager-extensions",
                       entry: "mesquilla exquilla server pane"}]
};

var NSGetFactory = ComponentUtils.generateNSGetFactory([ewsserver]);
var EXPORTED_SYMBOLS = ["NSGetFactory"];
