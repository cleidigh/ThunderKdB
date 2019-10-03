const debug=console.debug;
const log=console.log;
var firstRun=false;
var verifromSafeBrowsing;
var stopPhishingStarted=false;
var emailInspect=null;
var junkButtonStatus=false;

var socket;

var signalspamController = {
    do_cmd_signalspamReport: function () {
        verifrom.console.log(2,'do_cmd_signalspamReport', arguments);
        reportEmail();
    },
    do_cmd_signalspamPreferences: function () {
        verifrom.console.log(2,'do_cmd_signalspamPreferences', arguments);
        openPreferences();
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
        reportFalsePositive(arguments);
    },
    enabled_cmd_signalspamFalsePositive: function () {
        verifrom.console.log(4,'enabled_cmd_signalspamFalsePositive');
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
        verifrom.console.log(4,'signalspamController - event', event);
    },
    doCommand: function (commandName) {
        verifrom.console.log(4,'signalspamController - doCommand ' + commandName);
        this["do_" + commandName].apply(this);
    }
};

window.addEventListener("unload", function unloadExtension(e){
    verifrom.console.log(1,'######################## Signal Spam addon is STOPPING ######################## ');
    stopStopPhishing();
    if (verifromSafeBrowsing && verifromSafeBrowsing.worker)
    {
        verifromSafeBrowsing.worker.terminate();
        //emailInspect.stop();
    }
    //window.top.controllers.removeController(signalspamController);
    return true;
});

window.addEventListener("load", function loadAtStartup(e) {
    verifrom.console.log(1,'######################## Signal Spam addon is starting ######################## ');
    window.removeEventListener("load", loadAtStartup, false);

    try {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService)
            .getBranch("");

        prepare();

        loadParams(function () {
            verifrom.console.log(2, 'Params loaded : ', PARAM);
            return startVFExtension();
        });

        window.top.controllers.appendController(signalspamController);

        firstRun = prefs.getBoolPref("extensions.signalspam.firsttime");

        verifrom.console.log(4, 'Add-on version : ' + prefs.getCharPref("extensions.signalspam.lastversion") + ' vs current version :' + extensionConfig.appInfo.version + ' and first run ? :' + firstRun);

        if (firstRun !== false) {
            // The "addon-bar" is available since Firefox 4
            verifrom.console.log(4, 'add button to mail-bar3')
            installButton("mail-bar3", "signalspam-button", "button-address");
            installButton("header-view-toolbar", "signalspam-button-hdr", "hdrJunkButton");
            displayInstallManifest();
        } else if (extensionConfig.appInfo.version > prefs.getCharPref("extensions.signalspam.lastversion")) {
            if (extensionConfig.appInfo.updateManifestURL.display !== false)
                displayUpdateManifest();
            else verifrom.console.log(4, 'update manifest not displayed');
        }
        prefs.setBoolPref("extensions.signalspam.firsttime", false);
        prefs.setCharPref("extensions.signalspam.lastversion", extensionConfig.appInfo.version);

        verifrom.console.log(4, 'After UPDATE : Last add-on version : ' + prefs.getCharPref("extensions.signalspam.lastversion") + ' vs current version :' + extensionConfig.appInfo.version + ' and first run ? :' + firstRun);

        if (prefs.getBoolPref("extensions.signalspam.spambtonactive") === true)
            setJunkButton(true);
    } catch(e) {
        verifrom.console.error(0,'Exception on load',e);
    }
}, false);

function junkButtonHandler()
{
    verifrom.console.log(4,'hdrJunkButton pressed', arguments);
    reportEmail("hdrJunkButton");
}

function setJunkButton(status)
{
    var button = document.getElementById("hdrJunkButton");
    if (button && status===true && junkButtonStatus==false)
    {
        button.addEventListener('command', junkButtonHandler, true);
        junkButtonStatus=true;
    }
    if (button && status===false && junkButtonStatus===true)
    {
        button.removeEventListener('command', junkButtonHandler, true);
        junkButtonStatus=false;
    }
}

function displayInstallManifest()
{
    verifrom.console.log(2,'displayInstallManifest');
    if (navigator.language==='fr' || navigator.language==='fr-FR')
        openTab("chromeTab",{chromePage:extensionConfig.appInfo.installManifestURL["fr"]});
    else openTab("chromeTab",{chromePage:extensionConfig.appInfo.installManifestURL["en"]});
}

function displayUpdateManifest()
{
    verifrom.console.log(2,'displayUpdateManifest');
    if (navigator.language==='fr' || navigator.language==='fr-FR')
        openTab("chromeTab",{chromePage:extensionConfig.appInfo.updateManifestURL["fr"]});
    else openTab("chromeTab",{chromePage:extensionConfig.appInfo.updateManifestURL["en"]});
}

function openPreferences(msg)
{
    if (null == this._preferencesWindow || this._preferencesWindow.closed)
    {
        this._preferencesWindow = window.open('chrome://signalspam/content/settings.xul'+(msg ? "?"+msg : ''), "signalspam_preferences", "chrome,titlebar,toolbar,centerscreen,width=800,height=720");
    }
    this._preferencesWindow.focus();
}

function installButton(toolbarId, id, afterId)
{
    verifrom.console.log(2,'installButton - id:'+id+' toolbarId:'+toolbarId+' afterId:'+afterId);
    var toolbar = document.getElementById(toolbarId);

    // If no afterId is given, then append the item to the toolbar
    var before = null;
    if (afterId) {
        var elem = document.getElementById(afterId);
        if (elem && elem.parentNode == toolbar)
        {
            before = elem.nextElementSibling;
            verifrom.console.log(2,'installButton - found element to install button after');
        }
    }
    verifrom.console.log(2,'installButton - button will be inserted ');

    toolbar.insertItem(id, before);
    toolbar.setAttribute("currentset", toolbar.currentSet);
    document.persist(toolbar.id, "currentset");

    if (toolbarId == "addon-bar")
        toolbar.collapsed = false;
}

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

function setMessageListeners(backgroundWorker, callback)
{
    backgroundWorker.addListener("ready", function(message) {
        verifrom.console.log(2,'Background worker ready - DBs opened');
        //startEmailInspection();
    });
    backgroundWorker.addListener("log", function(message) {
        verifrom.console.log(2,message);
        //startEmailInspection();
    });


    // socket IO handlers
    //self.port.on('updates',function(request){
    backgroundWorker.addListener('updates',function(request){
        verifrom.console.log(4,'SOCKET INTERFACE - updates event');
        socket.emit("updates",request, function(JSONresponse) {
            self.port.emit('updatescallback',JSONresponse);
        });
    });

    backgroundWorker.addListener('reset',function(request){
        verifrom.console.log(4,'SOCKET INTERFACE - reset event');
        socket.emit("reset", request, function(JSONresponse) {
            self.port.emit('resetcallback',JSONresponse);
        });
    });

    backgroundWorker.addListener('disconnect',function(request){
        verifrom.console.log(4,'SOCKET INTERFACE - disconnect event');
        socket.disconnect();
    });

    backgroundWorker.addListener('reconnect',function(PARAM){
        verifrom.console.log(4,'SOCKET INTERFACE - reconnect event');
        socket.disconnect();
        socket = io.connect(PARAM.URL_PROXY_PUSH, PARAM.SOCKETIO.OPTIONS);
        setSocketEventHandlers();
    });

    backgroundWorker.addListener('connect',function(PARAM){
        verifrom.console.log(4,'SOCKET INTERFACE - connect event');
        if (socket && (socket.connected===false || socket.disconnected===true))
        {
            if (socket.VerifromConnecting)
            {
                verifrom.console.log(4,'SOCKET INTERFACE - socketClient exists : already connecting');
                return;
            }
            verifrom.console.log(4,'SOCKET INTERFACE - socketClient exists : disconnect ...');
            socket.disconnect();
            socket.VerifromConnecting=true;
            verifrom.console.log(4,'SOCKET INTERFACE - socketClient exists : connect ...');
            socket.connect();
            return;
        } else {
            socket = io.connect(PARAM.URL_PROXY_PUSH, PARAM.SOCKETIO.OPTIONS);
            verifrom.console.log(4,'SOCKET INTERFACE - socketClient does not exists - connect');
            setSocketEventHandlers();
        }
    });

    if (typeof callback==='function')
        callback();
}

function startStopPhishing()
{
    if (stopPhishingStarted)
        return;
    if (PARAM.OPTIONS.STOPPHISHING_WEBMAIL_ENABLE===true) {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService)
            .getBranch("");
        if (((PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED === true && prefs.getBoolPref("extensions.signalspam.userauthentified") === true) || PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED === false) && prefs.getBoolPref("extensions.signalspam.urldetect") === true) {
            verifrom.console.log(2,'start StopPhishing - start worker and listen');
            stopPhishingStarted=true;
            verifromSafeBrowsing = new verifrom.worker('chrome://signalspam/content/worker/verifromSafeBrowsing.js');
            setMessageListeners(verifromSafeBrowsing, function () {
                verifromSafeBrowsing.postMessage(PARAM, {channel: 'start'});
                if (!emailInspect)
                    emailInspect=new emailInspector(document, window, onMessageLoadHandler);
                emailInspect.start();
            });
        }
        else {
            verifromSafeBrowsing = new verifrom.worker('chrome://signalspam/content/worker/verifromSafeBrowsing.js');
            verifromSafeBrowsing.postMessage(PARAM, {channel:"params"});
        }
    }
}

function stopStopPhishing() {

    if (!stopPhishingStarted)
        return;

    if (PARAM.OPTIONS.STOPPHISHING_WEBMAIL_ENABLE === true) {
        verifrom.console.log(2,'stop StopPhishing - stop worker and listeners');
        stopPhishingStarted=false;
        verifromSafeBrowsing.removeListener("ready");
        verifromSafeBrowsing.worker.terminate();
        verifromSafeBrowsing=new verifrom.worker('chrome://signalspam/content/worker/verifromSafeBrowsing.js');
        verifromSafeBrowsing.postMessage(PARAM, {channel:"params"});
        emailInspect.stop();
        emailInspect=null;
    }
}

function startVFExtension()
{
    verifrom.console.log(1,'startVFExtension function called');

    startStopPhishing();

    //TODO
    // var bc = new BroadcastChannel('test_channel');
    // ou utiliser un observer pour écouter les changements sur userauthentified

    var myListener = new VF_PrefListener(
        "extensions.signalspam.",
        function(branch, name) {
            verifrom.console.log(4,'Pref extensions.signalspam.'+name+' was changed');
            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService)
                .getBranch("");

            switch (name) {
                case "userauthentified":
                    if (prefs.getBoolPref("extensions.signalspam.userauthentified")===true)
                        startStopPhishing();
                    else stopStopPhishing();
                    break;
                case 'urldetect':
                    if (prefs.getBoolPref("extensions.signalspam.urldetect")===true)
                        startStopPhishing();
                    else stopStopPhishing();
                    break;
                case 'spambtonactive':
                    setJunkButton(prefs.getBoolPref("extensions.signalspam.spambtonactive"))
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


function setSocketEventHandlers()
{
    if (!socket || socket.VerifromHandlersOn)
        return;

    socket.on('connect', function(data){
       verifrom.console.log(4,'CONNECT EVENT ###################');
        socket.VerifromConnecting=false;
        //self.port.emit('connect',data);
        verifromSafeBrowsing.postMessage(data, {channel: 'connect'});
    });

    socket.on('updates',function(data) {
       verifrom.console.log(4,'UPDATES EVENT ###################',data);
        //self.port.emit('updates',data);
        verifromSafeBrowsing.postMessage(data, {channel: 'updates'});

    });

    socket.on('reset',function(data) {
       verifrom.console.log(4,'RESET EVENT ###################',data);
        //self.port.emit('reset',data);
        verifromSafeBrowsing.postMessage(data, {channel: 'reset'});
    });

    socket.on('disconnect',function(data) {
       verifrom.console.log(4,new Date()+'DISCONNECT EVENT ###################',data);
        //self.port.emit('disconnect',data);
        verifromSafeBrowsing.postMessage(data, {channel: 'disconnect'});
        /*socket.disconnect();
        socket=null;*/
    });

    socket.on('reconnect',function(data) {
       verifrom.console.log(4,new Date()+'RECONNECT EVENT ###################',data);
        //self.port.emit('reconnect',data);
        verifromSafeBrowsing.postMessage(data, {channel: 'reconnect'});
    });

    socket.on('connecting',function(data) {
       verifrom.console.log(4,new Date()+'CONNECTING EVENT ###################',data);
        //self.port.emit('connecting',data);
        //verifromSafeBrowsing.postMessage(data, {channel: 'connecting'});
        socket.VerifromConnecting=true;
    });

    socket.on('reconnecting',function(data) {
       verifrom.console.log(4,new Date()+'reconnecting EVENT ###################',data);
        //self.port.emit('reconnecting',data);
        //verifromSafeBrowsing.postMessage(data, {channel: 'reconnecting'});
        socket.VerifromConnecting=true;
    });

    socket.on('connect_failed',function(data) {
       verifrom.console.log(4,new Date()+'connect_failed EVENT ###################',data);
        //self.port.emit('connect_failed',data);
        //verifromSafeBrowsing.postMessage(data, {channel: 'connect_failed'});
        socket.VerifromConnecting=false;
    });

    socket.on('reconnect_failed',function(data) {
       verifrom.console.log(4,new Date()+'reconnect_failed EVENT ###################',data);
        //self.port.emit('reconnect_failed',data);
        //verifromSafeBrowsing.postMessage(data, {channel: 'reconnect_failed'});
        socket.VerifromConnecting=false;
    });

    socket.on('close',function(data) {
       verifrom.console.log(4,new Date()+'close EVENT ###################',data);
        //self.port.emit('close',data);
        verifromSafeBrowsing.postMessage(data, {channel: 'close'});
        socket.VerifromConnecting=false;
    });

    socket.VerifromHandlersOn=true;
}

// ouvrir une window : window.open("chrome://signalspam/content/signalspam-baseMenuOverlay.xul", "bmarks", "chrome,width=600,height=600");


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
    var prefService = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService);
    this._branch = prefService.getBranch(branch_name);
    this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
    this._callback = callback;
}

VF_PrefListener.prototype.observe = function(subject, topic, data) {
    verifrom.console.log(4,'VF_PrefListener.observe',arguments);
    if (topic == 'nsPref:changed')
        this._callback(this._branch, data);
};

/**
 * @param {boolean=} trigger if true triggers the registered function
 *   on registration, that is, when this method is called.
 */
VF_PrefListener.prototype.register = function(trigger) {
    this._branch.addObserver('', this, false);
    if (trigger) {
        var that = this;
        this._branch.getChildList('', {}).
        forEach(function (pref_leaf_name)
        { that._callback(that._branch, pref_leaf_name); });
    }
};

VF_PrefListener.prototype.unregister = function() {
    if (this._branch)
        this._branch.removeObserver('', this);
};



