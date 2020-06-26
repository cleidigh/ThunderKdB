const {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");

// Existing window on startup that is fully loaded:
//   handleExistingWindow ->
//   handleDocument
// Existing window on startup that is not fully loaded:
//   handleExistingWindow ->
//   addEventListener ->
//   (later) handleEvent -> removeEventListener -> handleDocument
// New window:
//   (courtesy of window watcher) observe ->
//   addEventListener ->
//   (later) handleEvent -> removeEventListener -> handleDocument

var allInOneObserver = {
    observe: function(aSubject, aTopic, aData) {
        aSubject.addEventListener("load", this, true);
    },
    handleEvent: function(aEvent) {
        var document = aEvent.originalTarget;
        document.defaultView.removeEventListener("load", this, true);
        this.handleDocument(document);
    },
    handleExistingWindow: function(window) {
        var document = window.document;
        if (document.readyState != "complete") {
            window.addEventListener("load", this, true);
            return;
        }
        this.handleDocument(document);
    },
    handleDocument: function(document) {
        if (!document.location || document.location.protocol != "chrome:") {
            return;
        }
        var file = Services.dirsvc.get("UChrm", Components.interfaces.nsIFile);
        file.append("userChrome.js");
        if (! file.exists()) {
            return;
        }
        var url = Services.io.getProtocolHandler("file").
            QueryInterface(Components.interfaces.nsIFileProtocolHandler).
            getURLSpecFromFile(file);
        Services.scriptloader.loadSubScriptWithOptions(url, {
            target: document.defaultView,
            charset: "UTF-8",
            ignoreCache: true
        });
    },
}

function startup() {
    for (let window of Services.wm.getEnumerator(null)) {
        allInOneObserver.handleExistingWindow(window);
    }
    Cc["@mozilla.org/embedcomp/window-watcher;1"].
        getService(Ci.nsIWindowWatcher).registerNotification(
            allInOneObserver);
}

function shutdown() {
    Cc["@mozilla.org/embedcomp/window-watcher;1"].
        getService(Ci.nsIWindowWatcher).unregisterNotification(
            allInOneObserver);
}

function install() {
}

function uninstall() {
}
