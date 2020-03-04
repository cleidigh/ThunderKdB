const {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
var didKickstarter = false;

function startup() {
    var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);
    var prefName = "mailnews.customDBHeaders";
    var headers = prefBranch.getCharPref(prefName);
    if (headers.search(/(^| )Received( |$)/i) < 0) {
	headers = headers + " Received";
	prefBranch.setCharPref(prefName, headers);
    }
    Services.obs.addObserver(WindowObserver, "mail-startup-done", false);
    forEachOpenWindow(loadIntoWindow);
}

function shutdown() {
}

function install() {
}

function uninstall() {
}

function forEachOpenWindow(todo) { // Apply a function to all open windows
  for (let window of Services.wm.getEnumerator("mail:3pane")) {
    if (window.document.readyState != "complete")
      continue;
    todo(window);
  }
}

var WindowObserver = {
    observe: function(aSubject, aTopic, aData) {
        var window = aSubject;
        var document = window.document;
        if (document.documentElement.getAttribute("windowtype") ==
            "mail:3pane") {
            loadIntoWindow(window);
        }
    },
};

function loadIntoWindow(window) {
    if (! didKickstarter) {
        didKickstarter = true;
        var {KickstarterPopup} = ChromeUtils.import(
            "chrome://IMAPReceivedDate/content/kickstarter.jsm");
        KickstarterPopup(window,
                         "chrome://IMAPReceivedDate/content/kickstarter.xul");
    }
}
