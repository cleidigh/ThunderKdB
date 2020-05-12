if ("undefined" == typeof(phoenityButtons)) {
  var phoenityButtons = {};
};

var prefs = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);
var prefServiceBranch = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("");
var xulAppInfo = Components.classes["@mozilla.org/xre/app-info;1"].getService(Components.interfaces.nsIXULAppInfo);

Services.obs.notifyObservers(null, "startupcache-invalidate");

window.addEventListener("load", function load(event){
    window.removeEventListener("load", load, false); //remove listener, no longer needed
    phoenityButtons.checkIconSize();
    phoenityButtons.checkDetails();
    phoenityButtons.checkTabsInTitlebar();
    phoenityButtons.checkCompactHeader();
},false);

phoenityButtons = {

  toggleMailLayout: function() {
    if (document.getElementById("mailContent").getAttribute("layout") == "standard") {
      goDoCommand('cmd_viewVerticalMailLayout');
    } else if (document.getElementById("mailContent").getAttribute("layout") == "vertical") {
      goDoCommand('cmd_viewClassicMailLayout');
      goDoCommand('cmd_viewWideMailLayout');
    } else {
      goDoCommand('cmd_viewClassicMailLayout');
    }
  },

  checkCompactHeader: function() {
    if (typeof org_mozdev_compactHeader != "undefined") {
      document.getElementById("phb_twistyBox").setAttribute("hidden","true");
      document.getElementById("expandedHeaderView").className = "expanded";
      prefs.setBoolPref('extensions.phoenitybuttons.display.headers',true);
      document.getElementById("phb_CompactHeader-separator").removeAttribute("hidden");
    }
  },

  toggleDetailsKey: function() {
    if (typeof org_mozdev_compactHeader != "undefined") {
      org_mozdev_compactHeader.pane.coheToggleHeaderView();
    } else {
      phoenityButtons.toggleDetails();
    }
  },

  checkDetails: function() {
    switch(prefs.getBoolPref('extensions.phoenitybuttons.display.headers')) {
      case false:
      document.getElementById("expandedHeaderView").className = "compact";
      document.getElementById("phb_compactTwisty1").setAttribute("hidden",true);
      document.getElementById("phb_compactTwisty2").removeAttribute("hidden");
      break;
      default:
      document.getElementById("expandedHeaderView").className = "expanded";
      document.getElementById("phb_compactTwisty1").removeAttribute("hidden");
      document.getElementById("phb_compactTwisty2").setAttribute("hidden",true);
    }
  },

  toggleDetails: function() {
    gDBView.reloadMessage();
    switch(prefs.getBoolPref('extensions.phoenitybuttons.display.headers')) {
      case true: prefs.setBoolPref('extensions.phoenitybuttons.display.headers',false);
      document.getElementById("expandedHeaderView").className = "compact";
      document.getElementById("phb_compactTwisty1").setAttribute("hidden",true);
      document.getElementById("phb_compactTwisty2").removeAttribute("hidden");
      break;
      default: prefs.setBoolPref('extensions.phoenitybuttons.display.headers',true);
      document.getElementById("expandedHeaderView").className = "expanded";
      document.getElementById("phb_compactTwisty1").removeAttribute("hidden");
      document.getElementById("phb_compactTwisty2").setAttribute("hidden",true);
    }
  },

  toggleHeaderViewKey: function() {
    if (typeof com_mattsch_toggleHeaders != "undefined") {
      com_mattsch_toggleHeaders.toggleHeadersView();
    } else {
      phoenityButtons.toggleHeaderView();
    }
  },

  toggleHeaderView: function() {
    switch(prefs.getIntPref('mail.show_headers')) {
      case 1: goDoCommand('cmd_viewAllHeader');
      break;
      default: goDoCommand('cmd_viewNormalHeader');
    }
  },

  checkIconSize: function() {
    switch(prefs.getBoolPref('extensions.phoenitybuttons.iconsize.small')) {
      case false:
      document.getElementById("mail-toolbar-menubar2").setAttribute("iconsize","small");
      document.getElementById("mail-bar3").setAttribute("iconsize","large");
      document.getElementById("phb_iconsize-small").setAttribute("checked",false);
      document.getElementById("phb_chat-iconsize-small").setAttribute("checked",false);
      if (document.getElementById("chat-toolbar") != null) {
      document.getElementById("chat-toolbar").setAttribute("iconsize","large");
      } else {
      document.getElementById("chat-toobar").setAttribute("iconsize","large");
      }
      if (document.getElementById("cardbook-toolbar") != null) {
      document.getElementById("cardbook-toolbar").setAttribute("iconsize","large");
      }
      if (document.getElementById("phb_cardbook-iconsize-small") != null) {
      document.getElementById("phb_cardbook-iconsize-small").setAttribute("checked",false);
      }
      if (document.getElementById("calendar-toolbar2") != null) {
      document.getElementById("calendar-toolbar2").setAttribute("iconsize","large");
      document.getElementById("task-toolbar2").setAttribute("iconsize","large");
      }
      if (document.getElementById("phb_calendar-iconsize-small") != null) {
      document.getElementById("phb_calendar-iconsize-small").setAttribute("checked",false);
      document.getElementById("phb_task-iconsize-small").setAttribute("checked",false);
      }
      break;
      default:
      document.getElementById("mail-toolbar-menubar2").setAttribute("iconsize","small");
      document.getElementById("mail-bar3").setAttribute("iconsize","small");
      document.getElementById("phb_iconsize-small").setAttribute("checked",true);
      document.getElementById("phb_chat-iconsize-small").setAttribute("checked",true);
      if (document.getElementById("chat-toolbar") != null) {
      document.getElementById("chat-toolbar").setAttribute("iconsize","small");
      } else {
      document.getElementById("chat-toobar").setAttribute("iconsize","small");
      }
      if (document.getElementById("cardbook-toolbar") != null) {
      document.getElementById("cardbook-toolbar").setAttribute("iconsize","small");
      }
      if (document.getElementById("phb_cardbook-iconsize-small") != null) {
      document.getElementById("phb_cardbook-iconsize-small").setAttribute("checked",true);
      }
      if (document.getElementById("calendar-toolbar2") != null) {
      document.getElementById("calendar-toolbar2").setAttribute("iconsize","small");
      document.getElementById("task-toolbar2").setAttribute("iconsize","small");
      }
      if (document.getElementById("phb_calendar-iconsize-small") != null) {
      document.getElementById("phb_calendar-iconsize-small").setAttribute("checked",true);
      document.getElementById("phb_task-iconsize-small").setAttribute("checked",true);
      }
    }
  },


  toggleIconSize: function() {
    switch(prefs.getBoolPref('extensions.phoenitybuttons.iconsize.small')) {
      case true: prefs.setBoolPref('extensions.phoenitybuttons.iconsize.small',false);
      document.getElementById("mail-toolbar-menubar2").setAttribute("iconsize","small");
      document.getElementById("mail-bar3").setAttribute("iconsize","large");
      document.getElementById("phb_iconsize-small").setAttribute("checked",false);
      document.getElementById("phb_chat-iconsize-small").setAttribute("checked",false);
      if (document.getElementById("chat-toolbar") != null) {
      document.getElementById("chat-toolbar").setAttribute("iconsize","large");
      } else {
      document.getElementById("chat-toobar").setAttribute("iconsize","large");
      }
      if (document.getElementById("cardbook-toolbar") != null) {
      document.getElementById("cardbook-toolbar").setAttribute("iconsize","large");
      document.getElementById("phb_cardbook-iconsize-small").setAttribute("checked",false);
      }
      if (document.getElementById("calendar-toolbar2") != null) {
      document.getElementById("calendar-toolbar2").setAttribute("iconsize","large");
      document.getElementById("task-toolbar2").setAttribute("iconsize","large");
      document.getElementById("phb_calendar-iconsize-small").setAttribute("checked",false);
      document.getElementById("phb_task-iconsize-small").setAttribute("checked",false);
      }
      break;
      default: prefs.setBoolPref('extensions.phoenitybuttons.iconsize.small',true);
      document.getElementById("mail-toolbar-menubar2").setAttribute("iconsize","small");
      document.getElementById("mail-bar3").setAttribute("iconsize","small");
      document.getElementById("phb_iconsize-small").setAttribute("checked",true);
      document.getElementById("phb_chat-iconsize-small").setAttribute("checked",true);
      if (document.getElementById("chat-toolbar") != null) {
      document.getElementById("chat-toolbar").setAttribute("iconsize","small");
      } else {
      document.getElementById("chat-toobar").setAttribute("iconsize","small");
      }
      if (document.getElementById("cardbook-toolbar") != null) {
      document.getElementById("cardbook-toolbar").setAttribute("iconsize","small");
      document.getElementById("phb_cardbook-iconsize-small").setAttribute("checked",true);
      }
      if (document.getElementById("calendar-toolbar2") != null) {
      document.getElementById("calendar-toolbar2").setAttribute("iconsize","small");
      document.getElementById("task-toolbar2").setAttribute("iconsize","small");
      document.getElementById("phb_calendar-iconsize-small").setAttribute("checked",true);
      document.getElementById("phb_task-iconsize-small").setAttribute("checked",true);
      }
    }
  },

  checkTabsInTitlebar: function() {
    switch(prefs.getBoolPref('mail.tabs.drawInTitlebar')) {
      case false:
      document.getElementById("phb_drawTabsInTitlebar").setAttribute("checked",false);
      document.getElementById("phb_drawTabsInTitlebar2").setAttribute("checked",false);
      if (document.getElementById("calendar-toolbar2") != null) {
      document.getElementById("phb_drawTabsInTitlebar3").setAttribute("checked",false);
      document.getElementById("phb_drawTabsInTitlebar4").setAttribute("checked",false);
      }
      if (document.getElementById("cardbook-toolbar") != null) {
      document.getElementById("phb_drawTabsInTitlebar5").setAttribute("checked",false);
      }
      break;
      default:
      document.getElementById("phb_drawTabsInTitlebar").setAttribute("checked",true);
      document.getElementById("phb_drawTabsInTitlebar2").setAttribute("checked",true);
      if (document.getElementById("calendar-toolbar2") != null) {
      document.getElementById("phb_drawTabsInTitlebar3").setAttribute("checked",true);
      document.getElementById("phb_drawTabsInTitlebar4").setAttribute("checked",true);
      }
      if (document.getElementById("cardbook-toolbar") != null) {
      document.getElementById("phb_drawTabsInTitlebar5").setAttribute("checked",true);
      }
    }
  },

  drawTabsInTitlebar: function() {
    switch(prefs.getBoolPref('mail.tabs.drawInTitlebar')) {
      case true: prefs.setBoolPref('mail.tabs.drawInTitlebar',false);
      document.getElementById("phb_drawTabsInTitlebar").setAttribute("checked",false);
      document.getElementById("phb_drawTabsInTitlebar2").setAttribute("checked",false);
      if (document.getElementById("calendar-toolbar2") != null) {
      document.getElementById("phb_drawTabsInTitlebar3").setAttribute("checked",false);
      document.getElementById("phb_drawTabsInTitlebar4").setAttribute("checked",false);
      }
      if (document.getElementById("cardbook-toolbar") != null) {
      document.getElementById("phb_drawTabsInTitlebar5").setAttribute("checked",false);
      }
      break;
      default: prefs.setBoolPref('mail.tabs.drawInTitlebar',true);
      document.getElementById("phb_drawTabsInTitlebar").setAttribute("checked",true);
      document.getElementById("phb_drawTabsInTitlebar2").setAttribute("checked",true);
      if (document.getElementById("calendar-toolbar2") != null) {
      document.getElementById("phb_drawTabsInTitlebar3").setAttribute("checked",true);
      document.getElementById("phb_drawTabsInTitlebar4").setAttribute("checked",true);
      }
      if (document.getElementById("cardbook-toolbar") != null) {
      document.getElementById("phb_drawTabsInTitlebar5").setAttribute("checked",true);
      }
    }
  },

  nextUnreadThread: function() {
    goDoCommand('cmd_markThreadAsRead');
    goDoCommand('cmd_nextUnreadMsg');
  },

  nextUnreadGroup: function() {
    goDoCommand('cmd_markAllRead');
    goDoCommand('cmd_nextUnreadMsg');
  },

  getAllMessages: function() {
    goDoCommand('cmd_getMsgsForAuthAccounts');
  },

  viewIgnoredThreads: function() {
    goDoCommand('cmd_viewIgnoredThreads');
  },

  devToolbox: function() {
    if (xulAppInfo.version >= "72.0") {
    BrowserToolboxLauncher.init();
    } else {
    BrowserToolboxProcess.init();
    }
  },

  configEditor: function() {
    openDialog("chrome://global/content/config.xul","","centerscreen,resizable");
  },

  showCookies: function() {
    openDialog("chrome://messenger/content/preferences/cookies.xul","","centerscreen");
  },

  restartApp: function() {
    let appStartup = Cc["@mozilla.org/toolkit/app-startup;1"]
                       .getService(Ci.nsIAppStartup);
    let cancelQuit = Cc["@mozilla.org/supports-PRBool;1"]
                       .createInstance(Ci.nsISupportsPRBool);
    Services.obs.notifyObservers(cancelQuit, "quit-application-requested", "restart");
    if (cancelQuit.data) { // The quit request has been canceled.
      return false;
    }
    //if already in safe mode restart in safe mode
    if (Services.appinfo.inSafeMode) {
      appStartup.restartInSafeMode(Ci.nsIAppStartup.eAttemptQuit | Ci.nsIAppStartup.eRestart);
      return;
    }
    appStartup.quit(Ci.nsIAppStartup.eAttemptQuit | Ci.nsIAppStartup.eRestart);
  }

};
