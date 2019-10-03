console.log('**************** SIGNALSPAM messageWindow SCRIPT ************************');

const debug=console.debug;
const log=console.log;

var emailInspect;

var signalspamController = {
    do_cmd_signalspamReport: function () {
        verifrom.console.log(2,'do_cmd_signalspamReport', arguments);
        window.opener.reportEmail();
    },
    do_cmd_signalspamPreferences: function () {
        verifrom.console.log(2,'do_cmd_signalspamPreferences', arguments);
        if (null == this._preferencesWindow || this._preferencesWindow.closed) {

            this._preferencesWindow = window.open('chrome://signalspam/content/settings.xul', "signalspam_preferences", "chrome,titlebar,toolbar,centerscreen,modal");
        }
        this._preferencesWindow.focus();
    },
    enabled_cmd_signalspamReport: function () {
        verifrom.console.log(4,'enabled_cmd_signalspamReport', arguments);
        return (gFolderDisplay.selectedCount > 0);
    },
    enabled_cmd_signalspamPreferences: function () {
        verifrom.console.log(4,'enabled_cmd_signalspamPreferences', arguments);
        return true;
    },
    do_button_junk: function () {
        verifrom.console.log(2,'do_button_junk', arguments);
    },
    enabled_button_junk: function () {
        verifrom.console.log(4,'enabled_button_junk', arguments);
        return true;
    },
    enabled_cmd_signalspamSelfcare: function () {
        return true;
    },
    do_cmd_signalspamSelfcare: function () {
        messenger.launchExternalURL('https://signalants.signal-spam.fr');
        /*if (null == this._selfcarewindow || this._preferencesWindow.closed) {

            this._selfcarewindow = window.openDialog('https://signalants.signal-spam.fr', "_signalspam_selfcare", "chrome");
        }
        this._selfcarewindow.focus();*/
    },
    do_cmd_signalspamFalsePositive: function() {
        verifrom.console.log(1,'do_cmd_signalspamFalsePositive');
        window.opener.reportFalsePositive(arguments);
    },
    enabled_cmd_signalspamFalsePositive: function () {
        verifrom.console.log(4,'enabled_cmd_signalspamFalsePositive');
        return true;
    },
    supportsCommand: function (commandName) {
        verifrom.console.log(4,'signalspamController - supportsCommand ' + commandName + ' ? ' + (typeof this["do_" + commandName] === 'function'));
        return (typeof this["do_" + commandName] === 'function');
    },
    isCommandEnabled: function (commandName) {
        verifrom.console.log(4,'signalspamController - isCommandEnabled ' + commandName + ' ? ' + (this["enabled_" + commandName]()));
        return (this["enabled_" + commandName]());
    },
    onEvent: function (event) {
        verifrom.console.log(4,'signalspamController - event', event);
    },
    doCommand: function (commandName) {
        verifrom.console.log(4,'signalspamController - doCommand ' + commandName);
        this["do_" + commandName].apply(this);
    }
};

window.addEventListener("load", function loadAtStartup(e) {
    verifrom.console.log(1,'LOAD **************** SIGNALSPAM ************************',e);
    window.removeEventListener("load", loadAtStartup, false);

    PARAM=window.opener.PARAM;

    window.opener.prepare(document);
    emailInspect=new window.opener.emailInspector(document, window, window.opener.onMessageLoadHandler.bind(window));
    emailInspect.start();

    PARAM=window.opener.PARAM;

    if (window.opener.firstRun) {
        // The "addon-bar" is available since Firefox 4
        verifrom.console.log(4,'add button to mail-bar3')
        //installButton("mail-bar3", "signalspam-button", "button-address");
        installButton("header-view-toolbar", "signalspam-button-hdr", "hdrJunkButton");
    }
    debug('controllers set');
    window.top.controllers.appendController(signalspamController);
    var button = document.getElementById("hdrJunkButton");
    button.addEventListener('command', function () {
        debug('hdrJunkButton pressed', arguments);
    }, true);
}, false);

function installButton(toolbarId, id, afterId) {
    if (!document.getElementById(id)) {
        var toolbar = document.getElementById(toolbarId);

        // If no afterId is given, then append the item to the toolbar
        var before = null;
        if (afterId) {
            var elem = document.getElementById(afterId);
            if (elem && elem.parentNode == toolbar)
                before = elem.nextElementSibling;
        }

        toolbar.insertItem(id, before);
        toolbar.setAttribute("currentset", toolbar.currentSet);
        document.persist(toolbar.id, "currentset");

        if (toolbarId == "addon-bar")
            toolbar.collapsed = false;
    }
}
