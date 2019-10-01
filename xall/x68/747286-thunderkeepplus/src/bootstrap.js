const Cu = ChromeUtils;
const Cc = Components.classes;
const Ci = Components.interfaces;

var { Services } = Cu.import("resource://gre/modules/Services.jsm");

const extensionLink = "chrome://ThunderKeepPlus/",
	contentLink = extensionLink + "content/",
	uiModuleLink = contentLink + "ui.jsm",
	mainScriptLink = contentLink + "overlay.js";

const PREF_BRANCH = "extensions.thunderkeepplus.";
// Default button position
const PREFS = new Map([["parentNodeId", "mail-bar3"], ["nextNodeId", "button-tag"]]);

var ui = undefined;
var tkpManager = undefined;

var enableDebug = false;

function startup(data,reason) {
	debug("startup");

	var { Ui } = Cu.import(uiModuleLink);
	var { TKPManager } = Cu.import(mainScriptLink);
	
	loadDefaultPreferences();
	
	ui = new Ui(enableDebug);
	tkpManager = new TKPManager(enableDebug);

	loadForEachOpenWindow();
	maybeAddWindowListener();
}
function shutdown(data,reason) {
	debug("shutdown");
	
	if (reason == APP_SHUTDOWN){
		return;
	}
	debug("shutdown not APP_SHUTDOWN");

	unloadDefaultPreferences();

	unloadThunderKeepPlus();
	Services.wm.removeListener(WindowListener);

}
function unloadThunderKeepPlus() {
	debug("unloadThunderKeepPlus");

	tkpManager.onUnload();
	ui.destroy();
}
function install(data) {
	/** Present here only to avoid warning on addon installation **/
}
function uninstall() {
	/** Present here only to avoid warning on addon removal **/
}

function loadForEachOpenWindow()  // Try to load in all open browser windows
{
	debug("loadForEachOpenWindow");

	var windows = Services.wm.getEnumerator("mail:3pane");
	while (windows.hasMoreElements()){
		let domWindow = windows.getNext().QueryInterface(Ci.nsIDOMWindow);
		if(WindowListener.loadIntoWindow(domWindow)){
			// The button was added in the main window,
			// so there is no need to keep trying with other windows
			return;
		}
	}
}
function maybeAddWindowListener(){
	debug("maybeAddWindowListener");

	if(!(ui.loaded && tkpManager.loaded)){
		debug("maybeAddWindowListener adding listener");
		Services.wm.addListener(WindowListener);
	}
	debug("maybeAddWindowListener exit");
}
function maybeRemoveWindowListener(){
	debug("maybeRemoveWindowListener");

	if(ui.loaded && tkpManager.loaded){
		debug("maybeRemoveWindowListener removing listener");
		Services.wm.removeListener(WindowListener);
	}
}
function loadDefaultPreferences() {
	debug("loadDefaultPreferences");

	let branch = Services.prefs.getDefaultBranch(PREF_BRANCH);
	for (let [key, val] of PREFS) {
		switch (typeof val) {
		case "boolean":
			branch.setBoolPref(key, val);
			break;
		case "number":
			branch.setIntPref(key, val);
			break;
		case "string":
			branch.setCharPref(key, val);
			break;
		}
	}
}
function unloadDefaultPreferences() {
	debug("unloadDefaultPreferences");

	let branch = Services.prefs.getDefaultBranch(PREF_BRANCH);
	branch.deleteBranch("");
}
function debug(aMessage) {
	if(enableDebug) {
		console.debug("ThunderKeepPlus: " + aMessage);
	}
}
var WindowListener =
{

	async loadIntoWindow(window) {
		debug("loadIntoWindow");
		if (window.document.readyState != "complete") {
			// Make sure the window load has completed.
			debug("loadIntoWindow await");
			await new Promise(resolve => {
				window.addEventListener("load", resolve, { once: true });
			});
		}

		debug("loadIntoWindow calling loadIntoWindowAfterWindowIsReady");
		return this.loadIntoWindowAfterWindowIsReady(window);
	},

	loadIntoWindowAfterWindowIsReady: function(window) {
		debug("loadIntoWindowAfterWindowIsReady");

		if(window.document != null){
			debug("loadIntoWindowAfterWindowIsReady dom title: " + window.document.title);
			ui.attach(window);
			tkpManager.onLoad(window.document);
		}
		return (ui.loaded && tkpManager.loaded);
	},

	onOpenWindow: function(xulWindow) {
		debug("WindowListener: onOpenWindow");

		// A new window has opened.
		let domWindow = xulWindow.QueryInterface(Ci.nsIInterfaceRequestor)
				             .getInterface(Ci.nsIDOMWindow);


		// Check if the opened window is the one we want to modify.
		if (domWindow.document.documentElement
				.getAttribute("windowtype") === "mail:3pane") {
			this.loadIntoWindow(domWindow);
		}
	},

	onCloseWindow: function(xulWindow) { },

	onWindowTitleChange: function(xulWindow, newTitle) { }
};
