window.addEventListener("load", doLoad, false);

function doLoad() {
    var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
                        .getService(Components.interfaces.nsIStyleSheetService);
    var ios = Components.classes["@mozilla.org/network/io-service;1"]
                        .getService(Components.interfaces.nsIIOService);
    var uri = ios.newURI("chrome://viewabout/content/dialogs/viewabout.css", null, null);
    if(!sss.sheetRegistered(uri, sss.USER_SHEET))
      sss.loadAndRegisterSheet(uri, sss.USER_SHEET);
}

window.addEventListener("unload", doUnLoad, false);

function doUnLoad() {
    var sss = Components.classes["@mozilla.org/content/style-sheet-service;1"]
                      .getService(Components.interfaces.nsIStyleSheetService);
    var ios = Components.classes["@mozilla.org/network/io-service;1"]
                      .getService(Components.interfaces.nsIIOService);
    var u = ios.newURI("chrome://viewabout/content/dialogs/viewabout.css", null, null);
    if(sss.sheetRegistered(u, sss.USER_SHEET))
      sss.unregisterSheet(u, sss.USER_SHEET);
}
