// This Source Code Form is subject to the terms of the
// GNU General Public License, version 3.0.

"use strict";

function filter_on_new(value){
      var dlog = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);

      var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
      
      prefs.setBoolPref("mail.imap.filter_on_new",value);
      dlog.logStringMessage("IFilter setting mail.imap.filter_on_new to "+value);
}

function startup(data, reason) {
  if (reason == ADDON_ENABLE) {
    filter_on_new(true);
  }
}

function shutdown(data, reason) {
  if (reason == ADDON_DISABLE) {
    filter_on_new(false);
  }
}

function install(data, reason) {
      var dlog = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);
      dlog.logStringMessage("IFilter calling INSTALL ");
 
      var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefBranch);
      var prefService = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefService);
                
      try {
        var ifi = prefsTP.getBoolPref("mail.imap.filter_on_new");
        prefs.setBoolPref("mail.imap.filter_on_new", true);
      } catch (e){
        prefs.setBoolPref("mail.imap.filter_on_new", true);
        prefService.savePrefFile(null);
      }
}

function uninstall(data, reason) {
  if (reason == ADDON_UNINSTALL) {
    filter_on_new(false);
  }
}
