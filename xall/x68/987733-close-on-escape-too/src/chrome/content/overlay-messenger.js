var closetabonesc = {
  prefs: null,
  
  startup: function(e) {
    closetabonesc.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.CloseTabOnEsc@david-winter.at.");
    document.getElementById("messengerWindow").addEventListener("keypress", closetabonesc.onKeyPress, false);
  },
  
  onKeyPress: function(e) { 
    if (e.keyCode == KeyEvent.DOM_VK_ESCAPE) {
      var tabmail = document.getElementById('tabmail');
      if (tabmail.tabInfo.length > 1) {     
        var idx = tabmail.tabContainer.selectedIndex;
        if (closetabonesc.prefs.getBoolPref("onlymessagetabs") && tabmail.tabInfo[idx].mode.name != 'message') {
          return;
        }
        
        if (closetabonesc.prefs.getBoolPref("gotofirsttab")) {  
          tabmail.selectTabByIndex(null, 0);
        }
		else {
		  tabmail.selectTabByIndex(null, tabmail.tabInfo.length > idx ? idx : (tabmail.tabInfo.length >= 1 ? tabmail.tabInfo.length - 1 : 0));
		}
        tabmail.removeTabByNode(tabmail.tabContainer.childNodes[idx]);
		e.preventDefault();
      }
    }
  },
  
  beforeUnload: function(e) {
	// Refresh preferences
	closetabonesc.prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.CloseTabOnEsc@david-winter.at.");
	
    if (closetabonesc.prefs.getBoolPref("closetabsonexit")) {
      var tabmail = document.getElementById('tabmail');
      for (var idx = tabmail.tabInfo.length-1; idx >= 0; idx--) {
        if (tabmail.tabInfo[idx].mode.name == 'message') {
          tabmail.removeTabByNode(tabmail.tabContainer.childNodes[idx]);
        }
      }
    }
  }
};

window.addEventListener("load", closetabonesc.startup, false);
window.addEventListener("beforeunload", closetabonesc.beforeUnload, false);