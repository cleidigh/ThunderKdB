function startup() {
    var prefBranch = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefBranch);
    var prefName = "mailnews.customDBHeaders";
    var headers = prefBranch.getCharPref(prefName);
    if (headers.search(/(^| )Received( |$)/i) < 0) {
	headers = headers + " Received";
	prefBranch.setCharPref(prefName, headers);
    }
}

function shutdown() {
}

function install() {
}

function uninstall() {
}
