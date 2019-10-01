"use strict";

var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');
var { miczImapQuotaUtils } = ChromeUtils.import("chrome://imapquota/content/mziq-utils.jsm");

var gQuotaUICache;

var miczImapQuota = {

  baseBranch: "mail.quota.mainwindow_threshold.",
  //Default Thunderbird options
  defaultThresholdShow: 75,
  defaultThresholdWarning: 80,
  defaultThresholdCritical: 95,

  init: function() {
    miczImapQuotaUtils.setStringBundle();
    window.addEventListener(
      "MailViewChanged",
      function(aEvent){miczImapQuota.updateDisplay(aEvent);});
  },
  
  updateDisplay: function(aEvent){
    let wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].
      getService(Components.interfaces.nsIWindowMediator);
    let enumerator = wm.getEnumerator("mail:3pane");
    while (enumerator.hasMoreElements()) {
      let win = enumerator.getNext();
      if(win.gFolderDisplay){
        miczImapQuota.updateStatusQuota(win.document,win.gFolderDisplay.displayedFolder);
      }
    }
  },

  //The updateStatusQuota function is derived from http://dxr.mozilla.org/comm-central/source/mail/base/content/commandglue.js#125
  updateStatusQuota: function(document,folder)
  {
    if (!(folder && // no folder selected
          folder instanceof Components.interfaces.nsIMsgImapMailFolder)) // POP etc.
    {
      if (typeof(gQuotaUICache) == "object") // ever shown quota
        gQuotaUICache.panel.hidden = true;
      return;
    }
    folder = folder.QueryInterface(Components.interfaces.nsIMsgImapMailFolder);

    // get element references and prefs
    if (typeof(gQuotaUICache) != "object")
    {
      gQuotaUICache = new Object();
      gQuotaUICache.meter = document.getElementById("quotaMeter");
      gQuotaUICache.panel = document.getElementById("quotaPanel");
      gQuotaUICache.label = document.getElementById("quotaLabel");
      gQuotaUICache.showTreshold = Services.prefs.getIntPref(this.baseBranch + "show");
      gQuotaUICache.warningTreshold = Services.prefs.getIntPref(this.baseBranch + "warning");
      gQuotaUICache.criticalTreshold = Services.prefs.getIntPref(this.baseBranch + "critical");
    }else{  //Reload prefs BEGIN -- Added to the original updateStatusQuota version
      gQuotaUICache.showTreshold = Services.prefs.getIntPref(this.baseBranch + "show");
      gQuotaUICache.warningTreshold = Services.prefs.getIntPref(this.baseBranch + "warning");
      gQuotaUICache.criticalTreshold = Services.prefs.getIntPref(this.baseBranch + "critical");
    }      //Reload prefs END

    let valid = {value: null};
    let used = {value: null};
    let max = {value: null};
    try {
      // get data from backend
      folder.getQuota(valid, used, max);
    } catch (e) { dump(e + "\n"); }
    if (valid.value && max.value > 0)
    {
      let percent = Math.round(used.value / max.value * 100);

      // show in UI
      if (percent < gQuotaUICache.showTreshold)
        gQuotaUICache.panel.hidden = true;
      else
      {
        gQuotaUICache.panel.hidden = false;
        gQuotaUICache.meter.setAttribute("value", percent);
       // do not use value property, because that is imprecise (3%)
       // for optimization that we don't need here
        let bundle = document.getElementById("bundle_messenger");
        let label = bundle.getFormattedString("percent", [percent]);
        let tooltip = miczImapQuotaUtils._bundleIQ.formatStringFromName("ImapQuota.quotaTooltip",[miczImapQuotaUtils.formatKB(used.value,2), miczImapQuotaUtils.formatKB(max.value,2)],2);
        gQuotaUICache.label.value = label;
        gQuotaUICache.label.tooltipText = tooltip;
        if (percent < gQuotaUICache.warningTreshold)
          gQuotaUICache.panel.removeAttribute("alert");
        else if (percent < gQuotaUICache.criticalTreshold)
          gQuotaUICache.panel.setAttribute("alert", "warning");
        else
          gQuotaUICache.panel.setAttribute("alert", "critical");
      }
    }
    else
      gQuotaUICache.panel.hidden = true;
  }

};

window.addEventListener("load", miczImapQuota.init, false);
