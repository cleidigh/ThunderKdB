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
