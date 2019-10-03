/*jslint browser: true, unparam: true */
/*global Components */

function ResubmitLogger() {
    "use strict";

    var Cc = Components.classes,
        Ci = Components.interfaces;

    this.name = ResubmitLogger;

    this.console = Cc["@mozilla.org/consoleservice;1"]
        .getService(Ci.nsIConsoleService);
    this.prefs = Cc["@mozilla.org/preferences-service;1"]
        .getService(Ci.nsIPrefService)
        .getBranch("extensions.resubmit.debug.");
    this.debugEnabled = true;
    this.debugLevel = 7;
    this.logId = 0;
}

ResubmitLogger.prototype = {
    log: function (aMsg, aLevel) {
        "use strict";
        function zfill(num, len) {
            return (new Array(len).join("0") + num).slice(-len);
        }
        if (aLevel === undefined) {
            aLevel = 1;
        }
        if (this.debugEnabled && this.debugLevel >= aLevel) {
            this.console.logStringMessage("resubmit: [" + zfill(this.logId, 8) + "]: " + aMsg);
            this.logId += 1;
        }
    },
    readDebugPrefs: function () {
        "use strict";
        var err = null,
            prefs = this.prefs;
        try { // debugEnabled
            this.debugEnabled = prefs.getBoolPref("enabled");
        } catch (e) {
            err = e;
        }
        try { // debugLevel
            this.debugLevel = prefs.getIntPref("level");
            this.log("debug: ResubmitLogger.readDebugPrefs(): retrieved preference "
                    + "(extensions.resubmit.debug.level)", 4);
        } catch (e) {
            this.log("error: ResubmitLogger.readDebugPrefs(): failed to retrieve "
                    + "preference (extensions.resubmit.debug.level): " + e, 1);
        }
        this.log("debug: ResubmitLogger.readDebugPrefs(): assigned this.debugLevel = "
                + this.debugLevel, 7);
        // resolve chicken-egg dillema ...
        if (err) {
            this.log("error: ResubmitLogger.readDebugPrefs(): failed to retrieve "
                    + "preference (extensions.resubmit.debug.enabled): " + err, 1);
        } else {
            this.log("debug: ResubmitLogger.readDebugPrefs(): retrieved preference "
                    + "(extensions.resubmit.debug.enabled)", 4);
        }
        this.log("debug: ResubmitLogger.readDebugPrefs(): assigned this.debugEnabled = "
                + this.debugEnabled, 7);
    }
};

function gResubmitLogger() {
    "use strict";
    var win;
    function rootWin(aWin) {
        if (aWin.opener) {
            return rootWin(aWin.opener);
        }
        return aWin;
    }
    win = rootWin(window);
    if (!win.resubmitLogger) {
        win.resubmitLogger = new ResubmitLogger();
        win.resubmitLogger.readDebugPrefs();
    }
    return win.resubmitLogger;
}

function log(aMsg, aLevel) {
    "use strict";
    gResubmitLogger().log(aMsg, aLevel);
}

// vim: set expandtab tabstop=4 shiftwidth=4:
