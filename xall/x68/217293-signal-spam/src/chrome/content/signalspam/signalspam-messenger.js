(function(){

    verifrom.console.log(1,"Extension loaded");

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
        do_cmd_closeSidebar: function () {
            verifrom.console.log(2, 'do_cmd_closeSidebar', arguments);
            signalspam_closeSidebar();
        },
        do_cmd_opensidebar: function () {
            verifrom.console.log(2, 'do_cmd_opensidebar', arguments);
            signalspam_openSidebar();
        },
        enabled_cmd_closeSidebar: function () {
            return true;
        },
        enabled_cmd_opensidebar: function () {
            return true;
        },
        do_cmd_signalspamReport: function () {
            verifrom.console.log(2, 'do_cmd_signalspamReport', arguments);
            signalspam_reportEmail();
        },
        enabled_cmd_signalspamReport: function () {
            verifrom.console.log(4, 'enabled_cmd_signalspamReport', arguments);
            return (gFolderDisplay.selectedCount > 0);
        },
        do_cmd_signalspamPreferences: function () {
            verifrom.console.log(2, 'do_cmd_signalspamPreferences', arguments);
            signalspam_openPreferences();
        },
        enabled_cmd_signalspamPreferences: function () {
            verifrom.console.log(4, 'enabled_cmd_signalspamPreferences', arguments);
            return true;
        },
        do_button_junk: function () {
            verifrom.console.log(2, 'do_button_junk', arguments);
        },
        enabled_button_junk: function () {
            verifrom.console.log(4, 'enabled_button_junk', arguments);
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
            //openTab("contentTab", {contentPage: 'chrome://signalspam/content/signalspam/reports.xul'});
            if (null == this._reportsWindow || this._reportsWindow.closed) {
                this._reportsWindow = window.open('chrome://signalspam/content/signalspam/reports.xul', "signalspam_reports", "chrome,titlebar,toolbar,resizable");//,centerscreen,width=1200,height=720");
            }
            this._reportsWindow.focus();
            signalspam_updatedReportsNumber = 0;
            setBadge("");
        },
        do_cmd_signalspamFalsePositive: function () {
            verifrom.console.log(1, 'do_cmd_signalspamFalsePositive');
            signalspam_reportFalsePositive(arguments);
        },
        enabled_cmd_signalspamFalsePositive: function () {
            verifrom.console.log(4, 'enabled_cmd_signalspamFalsePositive');
            return true;
        },
        supportsCommand: function (commandName) {
            //verifrom.console.log(4,'signalspamController - supportsCommand ' + commandName + ' ? ' + (typeof this["do_" + commandName] === 'function'));
            return (typeof this["do_" + commandName] === 'function');
        },
        isCommandEnabled: function (commandName) {
            //verifrom.console.log(4,'signalspamController - isCommandEnabled ' + commandName + ' ? ' + (this["enabled_" + commandName]()));
            return (this["enabled_" + commandName]());
        },
        onEvent: function (event) {
            verifrom.console.log(4, 'signalspamController - event', event);
        },
        doCommand: function (commandName) {
            verifrom.console.log(4, 'signalspamController - doCommand ' + commandName);
            this["do_" + commandName].apply(this);
        }
    };

    window.addEventListener("unload", function unloadExtension(e) {
        verifrom.console.log(1, '######################## signalspam addon is STOPPING ######################## ');
        signalspam_closeSidebar();
        stopStopPhishing();
        if (signalspam_verifromSafeBrowsing) {
            signalspam_verifromSafeBrowsing.close();
            //signalspam_emailInspect.stop();
        }
        //window.top.controllers.removeController(signalspamController);
        return true;
    });

    function installButtons(tries) {
        if (!tries)
            tries = 0;
        let toolbar = document.querySelector("#mail-bar3");
        if (!toolbar && tries < 5) {
            tries++;
            console.warn("installButtons - no toolbar");
            setTimeout(installButtons, tries * 500, tries);
        } else if (toolbar) {
            signalspam_installButton("mail-bar3", "signalspam-button", "button-address");
            signalspam_installButton("header-view-toolbar", "signalspam-button-hdr", "hdrJunkButton");
        } else console.error("installButtons - unable to install report button in toolbar");
    }

    window.addEventListener("load", function loadAtStartup(e) {
        verifrom.console.log(1, '######################## signalspam addon is starting ######################## ');
        window.removeEventListener("load", loadAtStartup, false);

        try {
            //signalspam_prepare();
            signalspam_closeSidebar();

            signalspam_loadParams(function () {
                verifrom.console.log(2, 'Params loaded : ', signalspam_PARAM);
                setInterval(signalspam_loadParams, 3600000);
                return startVFExtension();
            });

            window.top.controllers.appendController(signalspamController);

            signalspam_firstRun = signalspam_prefs.getBoolPref("extensions.signalspam.firsttime");

            verifrom.console.log(4, 'Add-on version : ' + signalspam_prefs.getCharPref("extensions.signalspam.lastversion") + ' vs current version :' + extensionConfig.appInfo.version + ' and first run ? :' + signalspam_firstRun);

            if (signalspam_firstRun !== false) {
                // The "addon-bar" is available since Firefox 4
                verifrom.console.log(4, 'add button to mail-bar3')
                signalspam_displayInstallManifest();
            } else if (extensionConfig.appInfo.version > signalspam_prefs.getCharPref("extensions.signalspam.lastversion")) {
                if (extensionConfig.appInfo.updateManifestURL.display !== false)
                    signalspam_displayUpdateManifest();
                else verifrom.console.log(4, 'update manifest not displayed');
            }
            signalspam_prefs.setBoolPref("extensions.signalspam.firsttime", false);
            signalspam_prefs.setCharPref("extensions.signalspam.lastversion", extensionConfig.appInfo.version);

            verifrom.console.log(4, 'After UPDATE : Last add-on version : ' + signalspam_prefs.getCharPref("extensions.signalspam.lastversion") + ' vs current version :' + extensionConfig.appInfo.version + ' and first run ? :' + signalspam_firstRun);
            if (signalspam_prefs.getBoolPref("extensions.signalspam.spambtonactive") === true)
                signalspam_setJunkButton(true);

            installButtons();
        } catch (e) {
            verifrom.console.error(0, 'Exception on load', e);
        }
    }, false);


// IF WE NEED TO LISTEN TO NEW INCOMING MAILS
    /*var newMailListener = {
        msgAdded: function(aMsgHdr) {
            log('newMailListener.msgAdded',aMsgHdr);
            if( !aMsgHdr.isRead ) {
                // Here we are, a new mail has popped
                // let get a Javascript string object from the subject property
                // Querying mime conversion interface
                var mimeConvert = Components.classes["@mozilla.org/messenger/mimeconverter;1"]
                    .getService(Components.interfaces.nsIMimeConverter);
                var subject =  mimeConvert.decodeMimeHeader(aMsgHdr.subject, null, false, true);
                // Here with have a string to modify with Javascript. By example, setting it to lower case
                subject = subject.toLocaleLowerCase();
                // Then we rebuild a subject objet by rencoding the string
                // and assign it to the message headers and we're done
                aMsgHdr.subject = mimeConvert.encodeMimePartIIStr_UTF8(subject, false, "UTF-8", 0, 72);
                debug('newMailListener.msgAdded (end)',aMsgHdr);
            }
        }
    };*/

    function setBadge(value) {
        var button = document.getElementById("signalspam-button");
        if (button) {
            button.setAttribute("signalspam_reportsNumber", value.toString());
        }
    }

    function setMessageListeners(backgroundWorker, callback) {
        backgroundWorker.addListener("ready", function (message) {
            verifrom.console.log(2, 'Background worker ready - DBs opened');
            //startEmailInspection();
        });
        backgroundWorker.addListener("log", function (message) {
            verifrom.console.log(2, message);
            //startEmailInspection();
        });

        backgroundWorker.addListener("resetbadge", function () {
            verifrom.console.log(2, "resetbadge message");
            signalspam_updatedReportsNumber = 0;
            setBadge("");
        });

        // signalspam_socket IO handlers
        // instead of self.port.on('updates',function(request){
        backgroundWorker.addListener('reportsUpdate', function (message) {
            verifrom.console.log(4, 'reportsUpdate message from worker');
            signalspam_updatedReportsNumber++;
            if (signalspam_updatedReportsNumber > 0)
                setBadge(signalspam_updatedReportsNumber);
            else setBadge("");
        });

        backgroundWorker.addListener('reportsNotification', function (message) {
            verifrom.console.log(4, 'reportsNotification message from worker');
            var stringsBundle = Services.strings.createBundle("chrome://signalspam/locale/signalspam.properties");
            verifrom.notifications.display({
                id: extensionConfig.appInfo.extensionCodeName,//+message.UID,
                iconUrl: "chrome://signalspam/skin/icon48.png",
                title: stringsBundle.GetStringFromName('signalspam.notification.title'),
                message: stringsBundle.GetStringFromName('signalspam.notification.message'),
                onClicked: function () {
                    signalspamController.do_cmd_signalspamSelfcare();
                }
            });
        });

        backgroundWorker.addListener('updates', function (request) {
            verifrom.console.log(4, 'SOCKET INTERFACE - updates event');
            signalspam_socket.emit("updates", request, function (JSONresponse) {
                self.port.emit('updatescallback', JSONresponse);
            });
        });

        backgroundWorker.addListener('reset', function (request) {
            verifrom.console.log(4, 'SOCKET INTERFACE - reset event');
            signalspam_socket.emit("reset", request, function (JSONresponse) {
                self.port.emit('resetcallback', JSONresponse);
            });
        });

        backgroundWorker.addListener('disconnect', function (request) {
            verifrom.console.log(4, 'SOCKET INTERFACE - disconnect event');
            signalspam_socket.disconnect();
        });

        backgroundWorker.addListener('reconnect', function (PARAM) {
            verifrom.console.log(4, 'SOCKET INTERFACE - reconnect event');
            signalspam_socket.disconnect();
            signalspam_socket = io.connect(PARAM.URL_PROXY_PUSH, PARAM.SOCKETIO.OPTIONS);
            setSocketEventHandlers();
        });

        backgroundWorker.addListener('connect', function (PARAM) {
            verifrom.console.log(4, 'SOCKET INTERFACE - connect event');
            if (signalspam_socket && (signalspam_socket.connected === false || signalspam_socket.disconnected === true)) {
                if (signalspam_socket.VerifromConnecting) {
                    verifrom.console.log(4, 'SOCKET INTERFACE - socketClient exists : already connecting');
                    return;
                }
                verifrom.console.log(4, 'SOCKET INTERFACE - socketClient exists : disconnect ...');
                signalspam_socket.disconnect();
                signalspam_socket.VerifromConnecting = true;
                verifrom.console.log(4, 'SOCKET INTERFACE - socketClient exists : connect ...');
                signalspam_socket.connect();
                return;
            } else {
                signalspam_socket = io.connect(PARAM.URL_PROXY_PUSH, PARAM.SOCKETIO.OPTIONS);
                verifrom.console.log(4, 'SOCKET INTERFACE - socketClient does not exists - connect');
                setSocketEventHandlers();
            }
        });

        if (typeof callback === 'function')
            callback();
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
                if (signalspam_verifromSafeBrowsing) {
                    signalspam_verifromSafeBrowsing.close();
                    signalspam_verifromSafeBrowsing = null;
                }
                signalspam_verifromSafeBrowsing = new verifrom.worker('chrome://signalspam/content/signalspam/worker/verifromSafeBrowsing.js',sharedWorkerDisabled);
                setMessageListeners(signalspam_verifromSafeBrowsing, function () {
                    verifrom.console.log(2,'start StopPhishing - message from worker listeners set');
                    signalspam_verifromSafeBrowsing.postMessage(signalspam_PARAM, {channel: 'connect'});
                    signalspam_verifromSafeBrowsing.postMessage(signalspam_PARAM, {channel: "params"});
                });
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
            signalspam_verifromSafeBrowsing.postMessage(signalspam_PARAM, {channel: 'connect'});
            signalspam_verifromSafeBrowsing.postMessage(signalspam_PARAM, {channel: "params"});
            signalspam_emailInspect.stop();
            signalspam_emailInspect = null;
        }
    }

    function startVFExtension() {
        verifrom.console.log(1, 'startVFExtension function called');

        startStopPhishing();

        //TODO
        // var bc = new BroadcastChannel('test_channel');
        // ou utiliser un observer pour écouter les changements sur userauthentified

        var myListener = new VF_PrefListener(
            "extensions.signalspam",
            function (branch, name) {
                verifrom.console.log(4, 'Pref ' + name + ' was changed in branch ' + (branch ? branch.root : "?"));

                switch (branch.root + name) {
                    case "extensions.signalspam.userauthentified":
                        if (signalspam_PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED!=true || branch.getBoolPref(name) === true)
                            startStopPhishing();
                        else if (signalspam_PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED==true)
                            stopStopPhishing();
                        break;
                    case 'extensions.signalspam.urldetect':
                        if (branch.getBoolPref(name) === true)
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


    function setSocketEventHandlers() {
        if (!signalspam_socket || signalspam_socket.VerifromHandlersOn)
            return;

        signalspam_socket.on('connect', function (data) {
            verifrom.console.log(4, 'CONNECT EVENT ###################');
            signalspam_socket.VerifromConnecting = false;
            //self.port.emit('connect',data);
            signalspam_verifromSafeBrowsing.postMessage(data, {channel: 'connect'});
        });

        signalspam_socket.on('updates', function (data) {
            verifrom.console.log(4, 'UPDATES EVENT ###################', data);
            //self.port.emit('updates',data);
            signalspam_verifromSafeBrowsing.postMessage(data, {channel: 'updates'});

        });

        signalspam_socket.on('reset', function (data) {
            verifrom.console.log(4, 'RESET EVENT ###################', data);
            //self.port.emit('reset',data);
            signalspam_verifromSafeBrowsing.postMessage(data, {channel: 'reset'});
        });

        signalspam_socket.on('disconnect', function (data) {
            verifrom.console.log(4, new Date() + 'DISCONNECT EVENT ###################', data);
            //self.port.emit('disconnect',data);
            signalspam_verifromSafeBrowsing.postMessage(data, {channel: 'disconnect'});
            /*signalspam_socket.disconnect();
            signalspam_socket=null;*/
        });

        signalspam_socket.on('reconnect', function (data) {
            verifrom.console.log(4, new Date() + 'RECONNECT EVENT ###################', data);
            //self.port.emit('reconnect',data);
            signalspam_verifromSafeBrowsing.postMessage(data, {channel: 'reconnect'});
        });

        signalspam_socket.on('connecting', function (data) {
            verifrom.console.log(4, new Date() + 'CONNECTING EVENT ###################', data);
            //self.port.emit('connecting',data);
            //signalspam_verifromSafeBrowsing.postMessage(data, {channel: 'connecting'});
            signalspam_socket.VerifromConnecting = true;
        });

        signalspam_socket.on('reconnecting', function (data) {
            verifrom.console.log(4, new Date() + 'reconnecting EVENT ###################', data);
            //self.port.emit('reconnecting',data);
            //signalspam_verifromSafeBrowsing.postMessage(data, {channel: 'reconnecting'});
            signalspam_socket.VerifromConnecting = true;
        });

        signalspam_socket.on('connect_failed', function (data) {
            verifrom.console.log(4, new Date() + 'connect_failed EVENT ###################', data);
            //self.port.emit('connect_failed',data);
            //signalspam_verifromSafeBrowsing.postMessage(data, {channel: 'connect_failed'});
            signalspam_socket.VerifromConnecting = false;
        });

        signalspam_socket.on('reconnect_failed', function (data) {
            verifrom.console.log(4, new Date() + 'reconnect_failed EVENT ###################', data);
            //self.port.emit('reconnect_failed',data);
            //signalspam_verifromSafeBrowsing.postMessage(data, {channel: 'reconnect_failed'});
            signalspam_socket.VerifromConnecting = false;
        });

        signalspam_socket.on('close', function (data) {
            verifrom.console.log(4, new Date() + 'close EVENT ###################', data);
            //self.port.emit('close',data);
            signalspam_verifromSafeBrowsing.postMessage(data, {channel: 'close'});
            signalspam_socket.VerifromConnecting = false;
        });

        signalspam_socket.on('reportstatus', function (data) {
            verifrom.console.log(4, new Date() + 'reportstatus ###################', data);
            //self.port.emit('close',data);
            signalspam_verifromSafeBrowsing.postMessage(data, {channel: 'reportstatus'});
            signalspam_socket.VerifromConnecting = false;
        });

        signalspam_socket.VerifromHandlersOn = true;
    }

// ouvrir une window : window.open("chrome://signalspam/content/signalspam/signalspam-baseMenuOverlay.xul", "bmarks", "chrome,width=600,height=600");


    /**
     * @constructor
     *
     * @param {string} branch_name
     * @param {Function} callback must have the following arguments:
     *   branch, pref_leaf_name
     */
    function VF_PrefListener(branch_name, callback) {
        // Keeping a reference to the observed preference branch or it will get
        // garbage collected.
        try {
            this._prefService = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService);
            this._branch = this._prefService.getBranch(branch_name);
            if (Components.interfaces.nsIPrefBranch2)
                this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
            if (Components.interfaces.nsIPrefBranch)
                this._branch.QueryInterface(Components.interfaces.nsIPrefBranch);
            this._callback = callback;
            verifrom.console.log(4, 'VF_PrefListener - initialized', this);
        } catch (e) {
            verifrom.console.error(0, 'VF_PrefListener - exception', e);
        }
    }

    VF_PrefListener.prototype.observe = function (subject, topic, data) {
        verifrom.console.log(4, 'VF_PrefListener.observe', subject, topic, data);
        if (topic == 'nsPref:changed')
            if (typeof this._callback === 'function')
                this._callback(this._branch, data);
            else throw "VF_PrefListener.observe - no callback set"
    };

    /**
     * @param {boolean=} trigger if true triggers the registered function
     *   on registration, that is, when this method is called.
     */
    VF_PrefListener.prototype.register = function (trigger) {
        try {
            this._branch.addObserver('', this, false);
            if (trigger) {
                var that = this;
                this._branch.getChildList('', {}).forEach(function (pref_leaf_name) {
                    that._callback(that._branch, pref_leaf_name);
                });
            }
        } catch (e) {
            verifrom.console.error(0, 'VF_PrefListener.register - exception', e);
        }
    };

    VF_PrefListener.prototype.unregister = function () {
        if (this._branch)
            this._branch.removeObserver('', this);
    };
})();