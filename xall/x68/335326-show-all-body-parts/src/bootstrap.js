const {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");
var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefBranch);
if (! ("addObserver" in prefBranch))
    prefBranch.QueryInterface(Components.interfaces.nsIPrefBranch2);
var pref1 = "extensions.ShowAllBodyParts.active";
var pref2 = "mailnews.display.show_all_body_parts_menu";

function getActive() {
    var active;
    try { var active = prefBranch.getBoolPref(pref1); }
    catch (ex) { active = false; }
    return active;
}

function observer(aSubject, aTopic, aData) {
    prefBranch.removeObserver(pref2, observer);
    prefBranch.setBoolPref(pref1, false);
}

function startup() {
    var active = getActive();
    if (active) {
	prefBranch.setBoolPref(pref2, true);
	prefBranch.addObserver(pref2, observer, false);
    }
    Services.obs.addObserver(WindowObserver, "mail-startup-done", false);
    forEachOpenWindow(loadIntoWindow);
}

function shutdown() {
    var active = getActive();
    if (active) {
	prefBranch.removeObserver(pref2, observer);
	prefBranch.setBoolPref(pref2, false);
    }
}

function install() {
    var active = getActive();
    if (active) return;
    var old;
    try { old = prefBranch.getBoolPref(pref2); }
    catch (ex) { old = false; }
    if (! old) {
	prefBranch.setBoolPref(pref1, true);
	prefBranch.setBoolPref(pref2, true);
    }
}

function uninstall() {
    prefBranch.setBoolPref(pref1, false);
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
}
