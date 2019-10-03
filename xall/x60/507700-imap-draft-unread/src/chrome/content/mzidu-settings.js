"use strict";
var miczImapDraftUnreadPref = {
  
  currentOS:'',

  onLoad: function(){
    this.currentOS=miczImapDraftUnreadOSUtils.getCurrentOS();
    //dump('>>>>>>>> miczImapDraftUnreadPref currentOS: '+this.currentOS+"\r\n");
    
    if(miczImapDraftUnreadOSUtils.onOSX(this.currentOS)){
        //dump('>>>>>>>> miczImapDraftUnreadPref we are on OSX!'+"\r\n");
        let strbundle = document.getElementById("ImapDraftUnread-string-bundle_settings");
        let osx_msg=strbundle.getString("OSX_Settings_Msg");
        document.getElementById("ImapDraftUnread.clearNew_checkbox").disabled=true;
        document.getElementById("ImapDraftUnread.makeRead_checkbox").disabled=true;
        document.getElementById("ImapDraftUnread.GlobalDescSettingTab_label").textContent=osx_msg;
        document.getElementById("ImapDraftUnread.GlobalDescSettingTab_label").style.color="red";
        document.getElementById("ImapDraftUnread_tabbox").style.minHeight="14em";
    }
  },

  clearNew_reset: function(){
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    prefs = prefs.getBranch("extensions.miczImapDraftUnread.");
    if(prefs.getBoolPref("makeRead")){
        document.getElementById("ImapDraftUnread.clearNew_checkbox").checked=0;
        prefs.setBoolPref("clearNew",false);
    }
  },

  makeRead_reset: function(){
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    prefs = prefs.getBranch("extensions.miczImapDraftUnread.");
    if(prefs.getBoolPref("clearNew")){
        document.getElementById("ImapDraftUnread.makeRead_checkbox").checked=0;
        prefs.setBoolPref("makeRead",false);
    }
  },

};
