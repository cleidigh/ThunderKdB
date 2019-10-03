"use strict";

if(!tpec_org) var tpec_org = {};
if(!tpec_org.xtc) tpec_org.xtc = {};
if(!tpec_org.xtc.dchunks) tpec_org.xtc.dchunks = {};

let dchunks_uninstall_listener = {
  onUninstalling: function(addon) {
    if (addon.id == "dchunks.thunderpec@gmail.com") {
      var dlog = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);
      dlog.logStringMessage("DisableChunks calling UNINSTALLER ");

      var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
      
      var value = prefs.getIntPref("mail.imap.min_chunk_size_threshold");
      if(value!=98304){
          prefs.setIntPref("mail.imap.min_chunk_size_threshold",98304);
          dlog.logStringMessage("DisableChunks setting mail.imap.min_chunk_size_threshold to 98304 (default value) ");
      }
    }
  }
}


tpec_org.xtc.dchunks = function(){
  
  function pub(){};
  
    pub.init = function() {
      var dlog = Components.classes['@mozilla.org/consoleservice;1'].getService(Components.interfaces.nsIConsoleService);
      dlog.logStringMessage("DisableChunks calling INIT ");
 
      var prefs = Components.classes["@mozilla.org/preferences-service;1"].
                getService(Components.interfaces.nsIPrefBranch);
      var value = prefs.getIntPref("mail.imap.min_chunk_size_threshold");
      if(value!=100000000){
          prefs.setIntPref("mail.imap.min_chunk_size_threshold",100000000);
          dlog.logStringMessage("DisableChunks setting mail.imap.min_chunk_size_threshold to 100000000 ");
      }

      try {
        Components.utils.import("resource://gre/modules/AddonManager.jsm");
        AddonManager.addAddonListener(dchunks_uninstall_listener);
      } catch (ex) {
            dlog.logStringMessage("DisableChunks failing installing uninstaller hook");;
      }
    }

  return pub;
}();
