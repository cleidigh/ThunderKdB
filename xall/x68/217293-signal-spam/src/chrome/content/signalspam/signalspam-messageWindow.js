(function(){

    verifrom.console.log(1,'**************** signalspam messageWindow SCRIPT ************************');

    let sharedWorkerDisabled=false;
    try {
        try {
            new SharedWorker("");
        } catch(e) {
            sharedWorkerDisabled = /insecure/i.test(e.message);
        }
        verifrom.console.log(1,"SharedWorker disabled? :",sharedWorkerDisabled);
    } catch(e) {
        console.error("got exception when checking cookies behaviour",e);
    }

    var signalspamController = {
        do_cmd_signalspamReport: function () {
            verifrom.console.log(2,'do_cmd_signalspamReport', arguments);
            signalspam_reportEmail();
        },
        do_cmd_signalspamPreferences: function () {
            verifrom.console.log(2,'do_cmd_signalspamPreferences', arguments);
            if (null == this._preferencesWindow || this._preferencesWindow.closed) {

                this._preferencesWindow = window.open('chrome://signalspam/content/signalspam/settings.xul', "signalspam_preferences", "chrome,titlebar,toolbar,centerscreen,modal");
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
            if (extensionConfig.appInfo.localReportsDB!==true) {
                messenger.launchExternalURL(signalspam_PARAM.URL_SELFCARE || 'https://signalants.signal-spam.fr');
                return;
            }
            if (null == this._reportsWindow || this._reportsWindow.closed) {
                this._reportsWindow = window.open('chrome://signalspam/content/signalspam/reports.xul', "signalspam_reports", "chrome,titlebar,toolbar,resizable");//,centerscreen,width=1200,height=720");
            }
            this._reportsWindow.focus();
            signalspam_updatedReportsNumber = 0;
            setBadge("");
        },
        do_cmd_signalspamFalsePositive: function() {
            verifrom.console.log(1,'do_cmd_signalspamFalsePositive');
            signalspam_reportFalsePositive(arguments);
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
        verifrom.console.log(1,'######################## signalspam addon is starting ######################## ');
        window.removeEventListener("load", loadAtStartup, false);
        try {
            //signalspam_prepare();
            signalspam_closeSidebar();
            if (window.opener)
                signalspam_PARAM=window.opener.PARAM;
            else signalspam_loadParams(function () {
                    verifrom.console.log(2, 'Params loaded : ', signalspam_PARAM);
                    return startVFExtension();
                });

            window.top.controllers.appendController(signalspamController);

            signalspam_firstRun = signalspam_prefs.getBoolPref("extensions.signalspam.firsttime");

            if (signalspam_firstRun !== false) {
                // The "addon-bar" is available since Firefox 4
                signalspam_installButton("header-view-toolbar", "signalspam-button-hdr", "hdrJunkButton");
            }
            if (signalspam_prefs.getBoolPref("extensions.signalspam.spambtonactive") === true)
                signalspam_setJunkButton(true);
        } catch(e) {
            verifrom.console.error(0,'Exception on load',e);
        }
    }, false);


    window.addEventListener("unload", function unloadExtension(e){
        verifrom.console.log(1,'######################## signalspam addon is STOPPING ######################## ');
        signalspam_closeSidebar();
        if (signalspam_verifromSafeBrowsing)
        {
            signalspam_verifromSafeBrowsing.close();
        }
        return true;
    });

    function startVFExtension()
    {
        verifrom.console.log(1,'startVFExtension function called');

        startStopPhishing();

        //TODO
        // var bc = new BroadcastChannel('test_channel');
        // ou utiliser un observer pour écouter les changements sur userauthentified

        var myListener = new VF_PrefListener(
            "extensions.signalspam",
            function(branch, name) {
                verifrom.console.log(4,'Pref '+name+' was changed in branch '+(branch ? branch.root : "?"));

                switch (branch.root+name) {
                    case "extensions.signalspam.userauthentified":
                        if (signalspam_PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED!=true || branch.getBoolPref(name) === true)
                            startStopPhishing();
                        else if (signalspam_PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED==true)
                            stopStopPhishing();
                        break;
                    case 'extensions.signalspam.urldetect':
                        if (branch.getBoolPref(name)===true)
                            startStopPhishing();
                        else stopStopPhishing();
                        break;
                    case 'extensions.signalspam.spambtonactive':
                        signalspam_setJunkButton(branch.getBoolPref(name))
                        break;
                    default:
                        break;
                }
            }
        );

        myListener.register(true);
        return;

        // IF WE NEED TO LISTEN TO NEW INCOMING MAILS
        /*
        var notificationService = Components.classes["@mozilla.org/messenger/msgnotificationservice;1"]
            .getService(Components.interfaces.nsIMsgFolderNotificationService);
        debug('notificationService=',notificationService);

        notificationService.addListener(newMailListener, notificationService.msgAdded);
        */
    }
    function startStopPhishing() {
        if (signalspam_stopPhishingStarted)
            return;
        if (signalspam_PARAM.OPTIONS.STOPPHISHING_WEBMAIL_ENABLE === true) {
            if (((signalspam_PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED === true && signalspam_prefs.getBoolPref("extensions.signalspam.userauthentified") === true) || signalspam_PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED === false) && signalspam_prefs.getBoolPref("extensions.signalspam.urldetect") === true) {
                verifrom.console.log(2, 'start StopPhishing - start worker and listen');
                signalspam_stopPhishingStarted = true;
                if (signalspam_verifromSafeBrowsing) {
                    signalspam_verifromSafeBrowsing.close();
                    signalspam_verifromSafeBrowsing = null;
                }

                signalspam_verifromSafeBrowsing = new verifrom.worker('chrome://signalspam/content/signalspam/worker/verifromSafeBrowsing.js',sharedWorkerDisabled);
                setMessageListeners(signalspam_verifromSafeBrowsing, function () {
                    signalspam_verifromSafeBrowsing.postMessage(signalspam_PARAM, {channel: 'start'});
                    if (!signalspam_emailInspect)
                        signalspam_emailInspect = new signalspam_emailInspector(document, window, signalspam_onMessageLoadHandler);
                    signalspam_emailInspect.start();
                });
            } else {
                signalspam_verifromSafeBrowsing = new verifrom.worker('chrome://signalspam/content/signalspam/worker/verifromSafeBrowsing.js',sharedWorkerDisabled);
                signalspam_verifromSafeBrowsing.postMessage(signalspam_PARAM, {channel: "params"});
            }
        }
    }

    function stopStopPhishing() {

        if (!signalspam_stopPhishingStarted)
            return;

        if (signalspam_PARAM.OPTIONS.STOPPHISHING_WEBMAIL_ENABLE === true) {
            verifrom.console.log(2, 'stop StopPhishing - stop worker and listeners');
            signalspam_stopPhishingStarted = false;
            signalspam_verifromSafeBrowsing.removeListener("ready");
            signalspam_verifromSafeBrowsing.close();
            signalspam_verifromSafeBrowsing = null;
            signalspam_verifromSafeBrowsing = new verifrom.worker('chrome://signalspam/content/signalspam/worker/verifromSafeBrowsing.js',sharedWorkerDisabled);
            signalspam_verifromSafeBrowsing.postMessage(signalspam_PARAM, {channel: "params"});
            signalspam_emailInspect.stop();
            signalspam_emailInspect = null;
        }
    }

})();