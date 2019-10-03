/*
 This Source Code Form is subject to the terms of the Mozilla Public
 License, v. 2.0. If a copy of the MPL was not distributed with this
 file, You can obtain one at http://mozilla.org/MPL/2.0/.
*/

/* global Components: false */

'use strict';

Components.utils.import("resource://gre/modules/Services.jsm"); /* global Services: false */


var TinyJsd = {
  openDebugger: function() {
    const Cc = Components.classes;
    const Ci = Components.interfaces;

    var winName = "tinyJsd:mainWindow";
    var spec = "chrome://tinyjsd/content/ui/tinyjsd-main.xul";


    let recentWin = Services.wm.getMostRecentWindow(winName);

    if (recentWin) {
      recentWin.focus();
    }
    else {
      Services.appShell.hiddenDOMWindow.open(spec, winName, "chrome,resizable");
    }
  }
};

// Listener that is fired when Tinyjsd in disabled or before update
window.addEventListener("unload-tinyjsd", function _listener() {
  window.removeEventListener("unload-tinyjsd", _listener, false);

  TinyJsd = undefined;

}, false);
