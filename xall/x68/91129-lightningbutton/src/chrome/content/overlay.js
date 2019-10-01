if (typeof lightningbutton == "undefined"){
  lightningbutton={};
}

lightningbutton.tabhider={
  onLoad:function(){
    this.hideTabButtons(0);
  },

  hideTabButtons:function(retryCount){
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService);
    prefs = prefs.getBranch("extensions.LightningButton.");
    lastError = null;
    if (prefs.getBoolPref("hideTabButton.Calendar")){
      try {
        document.getElementById("calendar-tab-button").setAttribute("style","display:none");
      } catch (e) {
        lastError = e;
      }
    }
    if (prefs.getBoolPref("hideTabButton.Tasks")){
      try {
        document.getElementById("task-tab-button").setAttribute("style","display:none");
      } catch (e) {
        lastError = e;
      }
    }
    if (lastError == null) {
      return;
    }
    if (retryCount < 10) {
      // Retry removing the buttons within the first five seconds, as the
      // buttons are sometimes created after the window is loaded.
      var self = this;
      setTimeout(function(){ self.hideTabButtons(retryCount + 1); }, 500);
      return;
    }
    Components.utils.reportError(lastError);
  }
};

lightningbutton.controller={
  
  onLoad:function(){
    document.getElementById("tabmail").registerTabMonitor(this);
    // If we're in another thab than the main one, we'll recive a onTabSwitched event later.
    var gomainnode = document.getElementById("lightningbutton-gomain");
    if (gomainnode)
      gomainnode.checked=true;
  },
  onCalendarClick:function(){
    if (document.getElementById("lightningbutton-calendar").checked)
    {
      document.getElementById("tabmail").closeTab();
    } else {
      document.getElementById("switch2calendar").doCommand();
      this.onTabChange();
    }
  },
  onTasksClick:function(){
    if (document.getElementById("lightningbutton-tasks").checked)
    {
      document.getElementById("tabmail").closeTab();
    } else {
      document.getElementById("switch2task").doCommand();
      this.onTabChange();
    }
  },
  onMainClick:function(){
    document.getElementById("tabmail").selectTabByIndex(null,0);
  },
  onTabChange:function(ignoreTab){
    // Check if we should hide tabbar
    var tabmail = document.getElementById("tabmail");
    var numTabs = tabmail.tabContainer.itemCount;
    var shouldHide = true;
    for (var i = 0; i < numTabs; i++){
      if (tabmail.tabInfo[i] == ignoreTab)
        continue; // ignore closing tabs
      var tabType = tabmail.tabInfo[i].mode.name;
      if ((tabType == "folder") &&
          document.getElementById("lightningbutton-gomain"))
        continue;
      if ((tabType == "calendar") &&
          document.getElementById("lightningbutton-calendar"))
        continue;
      if ((tabType == "tasks") &&
          document.getElementById("lightningbutton-tasks"))
        continue;
      // We don't have a button for that tab, so we should show the tab bar
      shouldHide = false;
    }
    tabmail.tabContainer.mCollapseToolbar.collapsed = shouldHide;
  },
  onTabTitleChanged:function(){},
  onTabClosing:function(aTab){
    this.onTabChange(aTab);
  },
  onTabOpened:function(){
    this.onTabChange();
  },
  onTabSwitched:function(tab){
    try {
      document.getElementById("lightningbutton-calendar").checked=tab.mode==document.getElementById("tabmail").tabModes["calendar"];
    } catch (e){}
    try {
      document.getElementById("lightningbutton-tasks").checked=tab.mode==document.getElementById("tabmail").tabModes["tasks"];
    } catch (e){}
    try {
      document.getElementById("lightningbutton-gomain").checked=tab.mode==document.getElementById("tabmail").tabModes["folder"];
    } catch (e){}
    this.onTabChange();
  }
};

lightningbutton.mail_to_controller = {
  onLoad:function(e) {
    top.controllers.appendController(this);
  },

  supportsCommand: function(command) {
    switch(command) {
      case "button_calendar_mail_to":
        return true;
    }
    return false;
  },

  isCommandEnabled: function(command) {
    switch (command) {
      case "button_calendar_mail_to":
        var tabmail = document.getElementById("tabmail");
        return ((tabmail.selectedTab.mode.name == "folder") && (gFolderDisplay.selectedCount == 1)) || (tabmail.selectedTab.mode.name == "message");
    }
    return false;
  },

  doCommand: function(command) { },

  onEvent: function(event) { }
};


window.addEventListener("load", function(e) { lightningbutton.tabhider.onLoad(e); }, false);
window.addEventListener("load", function(e) { lightningbutton.controller.onLoad(e); }, false);
window.addEventListener("load", function(e) { lightningbutton.mail_to_controller.onLoad(e); }, false);
