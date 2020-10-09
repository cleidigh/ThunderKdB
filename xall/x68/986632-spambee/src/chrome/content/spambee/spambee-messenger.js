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
        enabled_cmd_spambeeReport: function () {
            void 0;
            return (gFolderDisplay.selectedCount > 0);
        },
        do_cmd_spambeePreferences: function () {
            void 0;
            spambee_openPreferences();
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
        do_cmd_spambeeFalsePositive: function () {
            void 0;
            spambee_reportFalsePositive(arguments);
        },
        enabled_cmd_spambeeFalsePositive: function () {
            void 0;
            return true;
        },
        supportsCommand: function (commandName) {
            return (typeof this["do_" + commandName] === 'function');
        },
        isCommandEnabled: function (commandName) {
            return (this["enabled_" + commandName]());
        },
        onEvent: function (event) {
            void 0;
        },
        doCommand: function (commandName) {
            void 0;
            this["do_" + commandName].apply(this);
        }
    };

    function installButtons(tries) {
        if (spambee_firstRun===false) {
            void 0;
            return; 
        }
        if (!tries)
            tries = 0;
        let toolbar = document.querySelector("#mail-bar3");
        if (!toolbar && tries < 5) {
            tries++;
            void 0;
            setTimeout(installButtons, tries * 500, tries);
        } else if (toolbar) {
            spambee_installButton("mail-bar3", "spambee-button", "button-address");
            spambee_installButton("header-view-toolbar", "spambee-button-hdr", "hdrJunkButton");
            if (document.getElementById("spambee-button")===null
                || document.getElementById("spambee-button-hdr")===null) {
                tries++;
                void 0;
                setTimeout(installButtons, tries * 500, tries);
            } else void 0;
        } else void 0;
    }


    window.addEventListener("beforeunload", function unloadExtension(e) {
        void 0;
        spambee_closeSidebar();
        void 0;
        stopStopPhishing();
        void 0;
        return true;
    });

    window.addEventListener("unload", function unloadExtension(e) {
        void 0;
        spambee_closeSidebar();
        void 0;
        stopStopPhishing();
        void 0;
        return true;
    });

    window.addEventListener("load", function loadAtStartup(e) {
        void 0;
        window.removeEventListener("load", loadAtStartup, false);

        try {
            spambee_closeSidebar();
            spambee_loadParams(function () {
                void 0;
                setInterval(spambee_loadParams, 3600000);
                return startVFExtension();
            });
            window.top.controllers.appendController(spambeeController);


            spambee_firstRun = spambee_prefs.getBoolPref("extensions.spambee.firsttime");

            void 0;

            if (spambee_firstRun !== false) {
                void 0
                spambee_displayInstallManifest();
            } else if (extensionConfig.appInfo.version > spambee_prefs.getCharPref("extensions.spambee.lastversion")) {
                if (extensionConfig.appInfo.updateManifestURL.display !== false)
                    spambee_displayUpdateManifest();
                else void 0;
            }
            spambee_prefs.setBoolPref("extensions.spambee.firsttime", false);
            spambee_prefs.setCharPref("extensions.spambee.lastversion", extensionConfig.appInfo.version);

            void 0;
            if (spambee_prefs.getBoolPref("extensions.spambee.spambtonactive") === true)
                spambee_setJunkButton(true);

            setTimeout(installButtons,500);
        } catch (e) {
            void 0;
        }
    }, false);



    function setBadge(value) {
        var button = document.getElementById("spambee-button");
        if (button) {
            button.setAttribute("spambee_reportsNumber", value.toString());
        }
    }

    function setMessageListeners(backgroundWorker, callback) {

        void 0;

        backgroundWorker.addListener("ready", function (message) {
            void 0;
        });
        backgroundWorker.addListener("log", function (message) {
            void 0;
        });

        backgroundWorker.addListener("resetbadge", function () {
            void 0;
            spambee_updatedReportsNumber = 0;
            setBadge("");
        });

        backgroundWorker.addListener('reportsUpdate', function (message) {
            void 0;
            spambee_updatedReportsNumber++;
            if (spambee_updatedReportsNumber > 0)
                setBadge(spambee_updatedReportsNumber);
            else setBadge("");
        });

        backgroundWorker.addListener('reportsNotification', function (message) {
            void 0;
            var stringsBundle = Services.strings.createBundle("chrome://spambee/locale/spambee.properties");
            verifrom.notifications.display({
                id: extensionConfig.appInfo.extensionCodeName,
                iconUrl: "chrome://spambee/skin/icon48.png",
                title: stringsBundle.GetStringFromName('spambee.notification.title'),
                message: stringsBundle.GetStringFromName('spambee.notification.message'),
                onClicked: function () {
                    spambeeController.do_cmd_spambeeSelfcare();
                }
            });
        });

        backgroundWorker.addListener('updates', function (request) {
            void 0;
            spambee_socket.emit("updates", request, function (JSONresponse) {
                self.port.emit('updatescallback', JSONresponse);
            });
        });

        backgroundWorker.addListener('reset', function (request) {
            void 0;
            spambee_socket.emit("reset", request, function (JSONresponse) {
                self.port.emit('resetcallback', JSONresponse);
            });
        });

        backgroundWorker.addListener('disconnect', function (request) {
            void 0;
            spambee_socket.disconnect();
        });

        backgroundWorker.addListener('reconnect', function (PARAM) {
            void 0;
            spambee_socket.disconnect();
            spambee_socket = io.connect(PARAM.URL_PROXY_PUSH, PARAM.SOCKETIO.OPTIONS);
            setSocketEventHandlers();
        });

        backgroundWorker.addListener('connect', function (PARAM) {
            void 0;
            if (spambee_socket && (spambee_socket.connected === false || spambee_socket.disconnected === true)) {
                if (spambee_socket.VerifromConnecting) {
                    void 0;
                    return;
                }
                void 0;
                spambee_socket.disconnect();
                spambee_socket.VerifromConnecting = true;
                void 0;
                spambee_socket.connect();
                return;
            } else {
                spambee_socket = io.connect(PARAM.URL_PROXY_PUSH, PARAM.SOCKETIO.OPTIONS);
                void 0;
                setSocketEventHandlers();
            }
        });

        if (typeof callback === 'function')
            callback();
    }

    function startStopPhishing() {
        if (spambee_stopPhishingStarted && spambee_verifromSafeBrowsing)
            return;
        spambee_stopPhishingStarted = true;
        if (spambee_PARAM.OPTIONS.STOPPHISHING_WEBMAIL_ENABLE === true) {
            if (((spambee_PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED === true && spambee_prefs.getBoolPref("extensions.spambee.userauthentified") === true) || spambee_PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED === false) && spambee_prefs.getBoolPref("extensions.spambee.urldetect") === true) {
                void 0;
                if (!spambee_verifromSafeBrowsing) {
                    spambee_verifromSafeBrowsing = new verifrom.worker('chrome://spambee/content/spambee/worker/verifromSafeBrowsing.js', sharedWorkerDisabled);
                    window.spambee_verifromSafeBrowsing = spambee_verifromSafeBrowsing;
                    setMessageListeners(spambee_verifromSafeBrowsing, function () {
                        spambee_verifromSafeBrowsing.postMessage(spambee_PARAM, {channel: 'start'});
                    });
                    spambee_stopPhishingStarted=spambee_verifromSafeBrowsing.loaded();
                }
                if (!spambee_emailInspect)
                    spambee_emailInspect = new spambee_emailInspector(document, window, spambee_onMessageLoadHandler);
                spambee_emailInspect.start();
            } else {
                spambee_stopPhishingStarted = true;
                if (!spambee_verifromSafeBrowsing) {
                    spambee_verifromSafeBrowsing = new verifrom.worker('chrome://spambee/content/spambee/worker/verifromSafeBrowsing.js',sharedWorkerDisabled);
                    window.spambee_verifromSafeBrowsing = spambee_verifromSafeBrowsing;
                    setMessageListeners(spambee_verifromSafeBrowsing, function () {
                        void 0;
                        spambee_verifromSafeBrowsing.postMessage(spambee_PARAM, {channel: "start"});
                    });
                    spambee_stopPhishingStarted=spambee_verifromSafeBrowsing.loaded();
                }
            }
        }
    }

    function stopStopPhishing(shutdown) {
        if (!spambee_stopPhishingStarted)
            return;
        void 0;
        spambee_stopPhishingStarted = false;
        if (shutdown===true) {
            void 0;
            spambee_verifromSafeBrowsing.close(shutdown);
            spambee_verifromSafeBrowsing = null;
        } else {
            if (!spambee_verifromSafeBrowsing || spambee_verifromSafeBrowsing.loaded()===false) {
                void 0
                spambee_verifromSafeBrowsing = new verifrom.worker('chrome://spambee/content/spambee/worker/verifromSafeBrowsing.js',sharedWorkerDisabled);
                window.spambee_verifromSafeBrowsing = spambee_verifromSafeBrowsing;
                spambee_verifromSafeBrowsing.postMessage(spambee_PARAM, {channel: 'start'});
            }
        }
        if (spambee_emailInspect) {
            spambee_emailInspect.stop();
            spambee_emailInspect = null;
        }
    }

    function startVFExtension() {
        void 0;

        VFshutdownObserver.setUpObservers();
        startStopPhishing();

        var myListener = new VF_PrefListener(
            "extensions.spambee",
            function (branch, name) {
                void 0;

                switch (branch.root + name) {
                    case "extensions.spambee.userauthentified":
                        if (branch.getBoolPref(".urldetect")===true && (spambee_PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED!=true || branch.getBoolPref(name) === true))
                            startStopPhishing();
                        else if (spambee_PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED==true)
                            stopStopPhishing();
                        break;
                    case 'extensions.spambee.urldetect':
                        if (branch.getBoolPref(name)===true && (spambee_PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED!=true || branch.getBoolPref(".userauthentified") === true))
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


    function setSocketEventHandlers() {
        if (!spambee_socket || spambee_socket.VerifromHandlersOn)
            return;

        spambee_socket.on('connect', function (data) {
            void 0;
            spambee_socket.VerifromConnecting = false;
            spambee_verifromSafeBrowsing.postMessage(data, {channel: 'connect'});
        });

        spambee_socket.on('updates', function (data) {
            void 0;
            spambee_verifromSafeBrowsing.postMessage(data, {channel: 'updates'});

        });

        spambee_socket.on('reset', function (data) {
            void 0;
            spambee_verifromSafeBrowsing.postMessage(data, {channel: 'reset'});
        });

        spambee_socket.on('disconnect', function (data) {
            void 0;
            spambee_verifromSafeBrowsing.postMessage(data, {channel: 'disconnect'});
        });

        spambee_socket.on('reconnect', function (data) {
            void 0;
            spambee_verifromSafeBrowsing.postMessage(data, {channel: 'reconnect'});
        });

        spambee_socket.on('connecting', function (data) {
            void 0;
            spambee_socket.VerifromConnecting = true;
        });

        spambee_socket.on('reconnecting', function (data) {
            void 0;
            spambee_socket.VerifromConnecting = true;
        });

        spambee_socket.on('connect_failed', function (data) {
            void 0;
            spambee_socket.VerifromConnecting = false;
        });

        spambee_socket.on('reconnect_failed', function (data) {
            void 0;
            spambee_socket.VerifromConnecting = false;
        });

        spambee_socket.on('close', function (data) {
            void 0;
            spambee_verifromSafeBrowsing.postMessage(data, {channel: 'close'});
            spambee_socket.VerifromConnecting = false;
        });

        spambee_socket.on('reportstatus', function (data) {
            void 0;
            spambee_verifromSafeBrowsing.postMessage(data, {channel: 'reportstatus'});
            spambee_socket.VerifromConnecting = false;
        });

        spambee_socket.VerifromHandlersOn = true;
    }


    function VF_ShutdownObserver() {
    }

    VF_ShutdownObserver.prototype.QueryInterface = ChromeUtils.generateQI([Ci.nsIObserver]);

    VF_ShutdownObserver.prototype.setUpObservers = function() {
        void 0;
        Services.obs.addObserver(this, "profile-after-change");
        Services.obs.addObserver(this, "profile-before-change");
        Services.obs.addObserver(this, "xpcom-shutdown");
        void 0;
    };

    VF_ShutdownObserver.prototype.observe = function(aSubject, aTopic, aData) {
        switch (aTopic) {
            case "profile-after-change":
                void 0;
                installButtons();
                break;
            case "profile-before-change":
                void 0;
                stopStopPhishing(true);
                break;
            case "xpcom-shutdown":
                Services.obs.removeObserver(this, "profile-before-change");
                Services.obs.removeObserver(this, "xpcom-shutdown");
                stopStopPhishing(true);
                break;
        }
    };

    var VFshutdownObserver = new VF_ShutdownObserver();
})();