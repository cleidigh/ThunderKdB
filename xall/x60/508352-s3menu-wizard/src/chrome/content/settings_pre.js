Components.utils.import("resource://gre/modules/Services.jsm");

var wm = Components.classes["@mozilla.org/appshell/window-mediator;1"].getService(Components.interfaces.nsIWindowMediator);
var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService).getBranch("extensions.s3menuwizard.");

if (Services.appinfo.ID == '{3550f703-e582-4d05-9a08-453d09bdfdc6}') {
	var win = wm.getMostRecentWindow("mail:3pane");
	var tabmail = win.document.getElementById('tabmail');
	win.focus();
	if (tabmail) {
		tabmail.openTab('contentTab', {contentPage: 'about:config-menu'});
	}
	window.setTimeout(function(){
		window.close();
	}, 100);
} else {
	var win = wm.getMostRecentWindow("navigator:browser");
	var tab_download = null;
	var tabs = (win.gBrowser.visibleTabs) ? win.gBrowser.visibleTabs : win.gBrowser.tabs;
	for (let tab of tabs) {
		if (tab.linkedBrowser.currentURI.spec == 'about:config-menu') {
			tab_download = tab;
		}
	}
	if (tab_download == null) {
		tab_download = win.gBrowser.addTab('about:config-menu');
	}
	if (prefs.getBoolPref('focus_to_options')) {
		window.setTimeout(function(){
			win.gBrowser.selectedTab = tab_download;
			window.close();
		}, 100);
	} else {
		window.close();
	}
}
