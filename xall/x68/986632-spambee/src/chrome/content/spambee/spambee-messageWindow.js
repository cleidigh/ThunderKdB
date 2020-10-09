(function(){

    void 0;

    let sharedWorkerDisabled=false;
    try {
        try {
            new SharedWorker("");
        } catch(e) {
            sharedWorkerDisabled = /insecure/i.test(e.message);
        }
        void 0;
    } catch(e) {
        void 0;
    }

    var spambeeController = {
        do_cmd_closeSidebar: function () {
            void 0;
            spambee_closeSidebar();
        },
        do_cmd_opensidebar: function () {
            void 0;
            spambee_openSidebar();
        },
        enabled_cmd_closeSidebar: function () {
            return true;
        },
        enabled_cmd_opensidebar: function () {
            return true;
        },
        do_cmd_spambeeReport: function () {
            void 0;
            spambee_reportEmail();
        },
        do_cmd_spambeePreferences: function () {
            void 0;
            if (null == this._preferencesWindow || this._preferencesWindow.closed) {

                this._preferencesWindow = window.open('chrome://spambee/content/spambee/settings.xul', "spambee_preferences", "chrome,titlebar,toolbar,centerscreen,modal");
            }
            this._preferencesWindow.focus();
        },
        enabled_cmd_spambeeReport: function () {
            void 0;
            return (gFolderDisplay.selectedCount > 0);
        },
        enabled_cmd_spambeePreferences: function () {
            void 0;
            return true;
        },
        do_button_junk: function () {
            void 0;
        },
        enabled_button_junk: function () {
            void 0;
            return true;
        },
        enabled_cmd_spambeeSelfcare: function () {
            return true;
        },
        do_cmd_spambeeSelfcare: function () {
            if (extensionConfig.appInfo.localReportsDB!==true) {
                messenger.launchExternalURL(spambee_PARAM.URL_SELFCARE || 'https://signalants.signal-spam.fr');
                return;
            }
            if (null == this._reportsWindow || this._reportsWindow.closed) {
                this._reportsWindow = window.open('chrome://spambee/content/spambee/reports.xul', "spambee_reports", "chrome,titlebar,toolbar,resizable");
            }
            this._reportsWindow.focus();
            spambee_updatedReportsNumber = 0;
            setBadge("");
        },
        do_cmd_spambeeFalsePositive: function() {
            void 0;
            spambee_reportFalsePositive(arguments);
        },
        enabled_cmd_spambeeFalsePositive: function () {
            void 0;
            return true;
        },
        supportsCommand: function (commandName) {
            void 0;
            return (typeof this["do_" + commandName] === 'function');
        },
        isCommandEnabled: function (commandName) {
            void 0;
            return (this["enabled_" + commandName]());
        },
        onEvent: function (event) {
            void 0;
        },
        doCommand: function (commandName) {
            void 0;
            if (opener) 
                spambee_verifromSafeBrowsing = opener.spambee_verifromSafeBrowsing;
            this["do_" + commandName].apply(this);
        }
    };

    window.addEventListener("load", function loadAtStartup(e) {
        void 0;
        window.removeEventListener("load", loadAtStartup, false);
        try {
            spambee_closeSidebar();

            if (window.opener) {
                spambee_PARAM = window.opener.spambee_PARAM;
                startVFExtension();
            } else spambee_loadParams(function () {
                    void 0;
                    return startVFExtension();
                });

            window.top.controllers.appendController(spambeeController);

            spambee_firstRun = spambee_prefs.getBoolPref("extensions.spambee.firsttime");

            {
                spambee_installButton("header-view-toolbar", "spambee-button-hdr", "hdrJunkButton");
            }
            if (spambee_prefs.getBoolPref("extensions.spambee.spambtonactive") === true)
                spambee_setJunkButton(true);
        } catch(e) {
            void 0;
        }
    }, false);


    window.addEventListener("unload", function unloadExtension(e){
        void 0;
        spambee_closeSidebar();
        return true;
    });

    function startVFExtension()
    {
        void 0;

        startStopPhishing();


        var myListener = new VF_PrefListener(
            "extensions.spambee",
            function(branch, name) {
                void 0;

                switch (branch.root+name) {
                    case "extensions.spambee.userauthentified":
                        if (spambee_PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED!=true || branch.getBoolPref(name) === true)
                            startStopPhishing();
                        else if (spambee_PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED==true)
                            stopStopPhishing();
                        break;
                    case 'extensions.spambee.urldetect':
                        if (branch.getBoolPref(name)===true)
                            startStopPhishing();
                        else stopStopPhishing();
                        break;
                    case 'extensions.spambee.spambtonactive':
                        spambee_setJunkButton(branch.getBoolPref(name))
                        break;
                    default:
                        break;
                }
            }
        );

        myListener.register(true);
        return;

    }

    function startStopPhishing() {
        if (spambee_stopPhishingStarted)
            return;
        spambee_stopPhishingStarted = true;
        if (spambee_PARAM.OPTIONS.STOPPHISHING_WEBMAIL_ENABLE === true) {
            if (((spambee_PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED === true && spambee_prefs.getBoolPref("extensions.spambee.userauthentified") === true) || spambee_PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED === false) && spambee_prefs.getBoolPref("extensions.spambee.urldetect") === true) {
                void 0;
                if (opener && opener.spambee_verifromSafeBrowsing)
                    spambee_verifromSafeBrowsing = opener.spambee_verifromSafeBrowsing;
                else {
                    void 0;
                    spambee_verifromSafeBrowsing = new verifrom.worker('chrome://spambee/content/spambee/worker/verifromSafeBrowsing.js', sharedWorkerDisabled);
                    spambee_verifromSafeBrowsing.postMessage(spambee_PARAM, {channel: 'start'});
                }
                if (!spambee_emailInspect)
                    spambee_emailInspect = new spambee_emailInspector(document, window, spambee_onMessageLoadHandler);
                spambee_emailInspect.start();
                spambee_stopPhishingStarted = spambee_verifromSafeBrowsing.loaded();
                if (spambee_stopPhishingStarted)
                    void 0;
                else void 0;
            } else {
                if (opener && opener.spambee_verifromSafeBrowsing)
                    spambee_verifromSafeBrowsing = opener.spambee_verifromSafeBrowsing;
                else {
                    spambee_verifromSafeBrowsing = new verifrom.worker('chrome://spambee/content/spambee/worker/verifromSafeBrowsing.js', sharedWorkerDisabled);
                    spambee_verifromSafeBrowsing.postMessage(spambee_PARAM, {channel: "params"});
                }
                spambee_stopPhishingStarted = spambee_verifromSafeBrowsing.loaded();
                if (spambee_stopPhishingStarted)
                    void 0;
                else void 0;
            }
        }
    }

    function stopStopPhishing() {
        if (!spambee_stopPhishingStarted)
            return;
        if (spambee_PARAM.OPTIONS.STOPPHISHING_WEBMAIL_ENABLE === true) {
            void 0;
            spambee_stopPhishingStarted = false;
            if (spambee_emailInspect)
                spambee_emailInspect.stop();
            spambee_emailInspect = null;
        }
    }

})();