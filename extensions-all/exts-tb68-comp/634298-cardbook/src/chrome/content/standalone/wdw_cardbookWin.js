var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "BrowserToolboxProcess", "resource://devtools/client/framework/ToolboxProcess.jsm");

window.addEventListener("focus", function() {
	document.getElementById("cardboookModeBroadcasterWindow").setAttribute("mode", "cardbook");
}, false);

window.addEventListener("blur", function() {
	document.getElementById("cardboookModeBroadcasterWindow").setAttribute("mode", "mail");
}, false);

window.addEventListener("load", function() {
	// remove the hamburger menus
	var toolbar = document.getElementById("cardbook-toolbar");
	if (toolbar) {
		var toolbarItems = toolbar.currentSet.split(",");
		if (toolbarItems.indexOf("cardbookToolbarAppMenuButton") != -1) {
			toolbarItems.splice(toolbarItems.indexOf("cardbookToolbarAppMenuButton"), 1);
		}
		if (toolbarItems.indexOf("cardbookToolbarThMenuButton") != -1) {
			toolbarItems.splice(toolbarItems.indexOf("cardbookToolbarThMenuButton"), 1);
		}
		toolbar.setAttribute("currentset", toolbarItems.join(","));
		Services.xulStore.persist(toolbar, "currentset");
	}
}, false);
