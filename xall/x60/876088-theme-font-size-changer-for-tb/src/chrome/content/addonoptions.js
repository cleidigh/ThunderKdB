function load() {
	    document.getElementById("hidesbicon").addEventListener("command", function (event) {var sss = Components.classes['@mozilla.org/content/style-sheet-service;1'].getService(Components.interfaces.nsIStyleSheetService);var ios = Components.classes['@mozilla.org/network/io-service;1'].getService(Components.interfaces.nsIIOService);var css = "@namespace url(http://www.mozilla.org/keymaster/gatekeeper/there.is.only.xul);#themefontsizechangertb-statusbar {display: none !important;}";var uri = ios.newURI("data:text/css," + encodeURIComponent(css), null, null);if (!sss.sheetRegistered(uri, sss.AGENT_SHEET)) {sss.loadAndRegisterSheet(uri, sss.AGENT_SHEET);var themefontsizechangertbprefsinstance = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);var themefontsizechangertbsbiconhide = themefontsizechangertbprefsinstance.getBoolPref("extensions.themefontsizechangertb.sbiconhide");themefontsizechangertbprefsinstance.setBoolPref("extensions.themefontsizechangertb.sbiconhide", true);} else {sss.unregisterSheet(uri, sss.AGENT_SHEET);var themefontsizechangertbprefsinstance = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);var themefontsizechangertbsbiconhide = themefontsizechangertbprefsinstance.getBoolPref("extensions.themefontsizechangertb.sbiconhide");themefontsizechangertbprefsinstance.setBoolPref("extensions.themefontsizechangertb.sbiconhide", false);}}, false);
	    document.getElementById("hidetoolsmenu").addEventListener("command", function (event) {
var themefontsizechangertbprefsinstance = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);
themefontsizechangertbprefsinstance.setBoolPref("extensions.themefontsizechangertb.hidetoolsmenu", event.target.checked);
	    }, false);
	    document.getElementById("hideappmenu").addEventListener("command", function (event) {
var themefontsizechangertbprefsinstance = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);
themefontsizechangertbprefsinstance.setBoolPref("extensions.themefontsizechangertb.hideappmenu", event.target.checked);
	    }, false);	
	    document.getElementById("abbreviatetoolbarbuttontext").addEventListener("command", function (event) {
var themefontsizechangertbprefsinstance = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefBranch);
themefontsizechangertbprefsinstance.setBoolPref("extensions.themefontsizechangertb.abbreviatetoolbarbuttontext", event.target.checked);
	    }, false);		        
}