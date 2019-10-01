"use strict";

Preferences.addAll([
  { id: "mail.quota.mainwindow_threshold.show", type: "int" },
  { id: "mail.quota.mainwindow_threshold.warning", type: "int" },
  { id: "mail.quota.mainwindow_threshold.critical", type: "int" },
]);

var miczImapQuotaPref = {

  update_show_check: function(){
    document.getElementById("ImapQuota.Show_checkbox").checked=(document.getElementById("ImapQuota.ThresholdShow_textfield").value==0);
  },

  update_show_value: function(){
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    prefs = prefs.getBranch(miczImapQuota.baseBranch);
    if(document.getElementById("ImapQuota.Show_checkbox").checked){
      document.getElementById("ImapQuota.ThresholdShow_textfield").value=0;
      prefs.setIntPref("show",0);
    }else{
      document.getElementById("ImapQuota.ThresholdShow_textfield").value=miczImapQuota.defaultThresholdShow;
      prefs.setIntPref("show",miczImapQuota.defaultThresholdShow);
    }
  },
  
  set_default_values: function(){
    let strbundle = document.getElementById("ImapQuota-string-bundle_settings");
    let p_msg_c=strbundle.getString("promptMessage");
    let t_msg=strbundle.getString("promptTitle");
  
    let promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"].getService(Components.interfaces.nsIPromptService);
    if(!promptService.confirm(null,t_msg,p_msg_c)){
      return;
    }
    
    let prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    prefs = prefs.getBranch(miczImapQuota.baseBranch);
    document.getElementById("ImapQuota.ThresholdShow_textfield").value=miczImapQuota.defaultThresholdShow;
    prefs.setIntPref("show",miczImapQuota.defaultThresholdShow);
    document.getElementById("ImapQuota.ThresholdWarning_textfield").value=miczImapQuota.defaultThresholdWarning;
    prefs.setIntPref("warning",miczImapQuota.defaultThresholdWarning);
    document.getElementById("ImapQuota.ThresholdCritical_textfield").value=miczImapQuota.defaultThresholdCritical;
    prefs.setIntPref("critical",miczImapQuota.defaultThresholdCritical);
    miczImapQuotaPref.update_show_check();
  },

};
