//var psvc = Components.classes["@mozilla.org/preferences-service;1"]
//                                .getService(Components.interfaces.nsIPrefBranch);
//var instantApply = psvc.getBoolPref("browser.preferences.instantApply");

//var prefWindow;
/*var signalspam_prefs = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService)
    .getBranch("");*/
var prefWindow=null;
var signalspam_NotificationReady = false;
const signalspam_Notification = {};
if (typeof opener.XPCOMUtils==='object')
    opener.XPCOMUtils.defineLazyGetter(signalspam_Notification
        , "notificationbox"
        , function() {
            return new MozElements.NotificationBox(function(element) {
                element.setAttribute("flex", "1");
                element.setAttribute("notificationside","top");
                document.getElementById("preferencesNotificationBox").append(element);
                signalspam_NotificationReady = true;
                verifrom.console.log(4,'signalspam_Notification initialized');
            });
        });
var credentials;
var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');
var prefs = Services.prefs.getBranch("");
Preferences.addAll([
    {
        id: "signalspam_pref_userid",
        instantApply: "false",
        name: "extensions.signalspam.userid",
        type: "string",
        defaultValue: ""
    }/*,{
        id: "signalspam_pref_password",
        instantApply: "false",
        name: "extensions.signalspam.password",
        type: "string",
        defaultValue: "false"
    }*/
    , {
        id: "signalspam_pref_oneclick",
        instantApply: "false",
        name: "extensions.signalspam.oneclick",
        type: "bool",
        defaultValue: false,
        hidden: "false"
    }
    , {
        id: "signalspam_pref_urldetect",
        instantApply: "false",
        name: "extensions.signalspam.urldetect",
        type: "bool",
        defaultValue: true
    }
    , {
        id: "signalspam_pref_movereport",
        instantApply: "false",
        name: "extensions.signalspam.movereport",
        type: "bool",
        defaultValue: true
    }
    , {
        id: "signalspam_pref_spambtonactive",
        instantApply: "false",
        name: "extensions.signalspam.spambtonactive",
        type: "bool",
        defaultValue: false
    }
    , {
        id: "signalspam_pref_userauthentified",
        instantApply: "false",
        name: "extensions.signalspam.userauthentified",
        type: "bool",
        defaultValue: false,
        hidden: "true"
    }
    , {
        id: "signalspam_pref_firsttime",
        instantApply: "false",
        name: "extensions.signalspam.firsttime",
        type: "bool",
        defaultValue: true,
        hidden: "true"
    }
    , {
        id: "signalspam_pref_lastversion",
        instantApply: "false",
        name: "extensions.signalspam.lastversion",
        type: "string",
        defaultValue: "",
        hidden: "true"
    }
    , {
        id: "signalspam_pref_notification",
        instantApply: "false",
        name: "extensions.signalspam.notification",
        type: "bool",
        defaultValue: true,
        hidden: "true"
    }
    , {
        id: "signalspam_pref_privacy",
        instantApply: "false",
        name: "extensions.signalspam.privacy",
        type: "bool",
        defaultValue: false,
        hidden: "true"
    }]);


window.addEventListener("load", function (e) {
    verifrom.console.log(1,'Preferences window loaded');
    prefWindow = document.querySelector('dialog');

    credentials=verifrom.credentials.get(prefs.getCharPref("extensions.signalspam.userid"));
    if (credentials && credentials.username)
    {
        document.getElementById('signalspam_pref_password').value=credentials.password;
    }
    document.getElementById("thunderbirdpreferences").onclick=function(){
       try {
           var tWindow=window.open("chrome://messenger/content/preferences/aboutPreferences.xul", "Preferences","chrome,titlebar,toolbar,centerscreen");
           tWindow.onloadend=function() {
               //mail.spam.manualMark
               tWindow.focus();
               if (tWindow) {
                   var paneSec=tWindow.document.querySelector('#paneSecurity');
                   if (paneSec && paneSec.id)
                       tWindow.showPane(paneSec.id);
               }
           };
           setTimeout(function() {
               if (typeof tWindow.showPane === "function")
                   tWindow.showPane("paneSecurity");
           },300);
       } catch(e) {
           verifrom.console.log('Exception opening Thunderbird preferences window',e);
       }
    };
    prefs.setBoolPref("extensions.signalspam.firsttime",false);
    prefs.setCharPref("extensions.signalspam.lastversion",extensionConfig.appInfo.version);
    Preferences.get("signalspam_pref_firsttime").value = false;
    Preferences.get("signalspam_pref_lastversion").value = extensionConfig.appInfo.version;

    let link = document.getElementById('newPasswordLink');
    if (link) {
        link.addEventListener("click",function() {
            if (opener && typeof opener.openLinkExternally === 'function')
                opener.openLinkExternally(link.getAttribute("href"));
        });
    }
    if (prefWindow)
        prefWindow.getButton("accept").setAttribute("default",false);
    checkUserIdAndPassord();
});

window.addEventListener("focus", function (e) {
    if (prefs.getBoolPref('mail.spam.manualMark') === false)
        document.getElementById('manualMarkFalse').setAttribute('hidden', false);
    else document.getElementById('manualMarkFalse').setAttribute('hidden', true);
    checkUserIdAndPassord();
});

window.addEventListener("keypressed", keyhandler);
function keyhandler(e) {
    var keyCode=e.characterCode || e.keyCode || e.which || e.key;
    switch(keyCode)
    {
        case "Enter":
        case 13:
            e.preventDefault();
            verifrom.console.log(4,'Enter key pressed - valid dialog');
            return validPrefs(); // returning false will prevent the event from bubbling up.
            break;
        case "Escape":
        case 27:
            e.preventDefault();
            verifrom.console.log(4,'Enter key pressed - cancel dialog');
            return cancelPrefs(true);
            break;
        default:
            return true;
            break;
    }
}


document.getElementById('signalspam_pref_userid').oninput= keyOnCredentialshandler;
document.getElementById('signalspam_pref_password').oninput= keyOnCredentialshandler;
var keyOnCredentialshandlerTimeout = null;
function keyOnCredentialshandler(e) {
    if (keyOnCredentialshandlerTimeout) {
        clearTimeout(keyOnCredentialshandlerTimeout);
        keyOnCredentialshandlerTimeout = null;
    }
    keyOnCredentialshandlerTimeout = setTimeout(checkUserIdAndPassord,1000);
}

var prevUserId  = null;
var prevPassword = null;
var prevResult = null;
function checkUserIdAndPassord() {
    let userid=document.getElementById('signalspam_pref_userid').value;
    let password=document.getElementById('signalspam_pref_password').value;
    if (userid === prevUserId && password === prevPassword && prevResult !== null) {
        if (prefWindow)
            prefWindow.getButton("accept").disabled = !prevResult;
        return prevResult;
    }
    if (userid.length===0 && password.length===0) {
        showNotification('notauthentified');
        prevResult = false;
        if (prefWindow)
            prefWindow.getButton("accept").disabled = !prevResult;
        return;
    }
    if (checkUserId()===false) {
        prevResult = false;
        if (prefWindow)
            prefWindow.getButton("accept").disabled = !prevResult;
        return;
    }
    checkCredentials(userid,password,function(valid, error403) {
        prevResult = valid;
        if (prefWindow)
            prefWindow.getButton("accept").disabled = !prevResult;
        if (valid)
            showNotification('userauthentified');
        else if (error403===false)
            showNotification('invalidcredentials');
        else showNotification('error403');
    })
}

function checkCredentials(userid, password, callback)
{
    var req = new XMLHttpRequest();
    let async = typeof callback === "function";
    req.open("GET", "https://www.signal-spam.fr/api/signaler", async, userid, password);
    if (async)
        req.onreadystatechange=function() {
            if (req.readyState == 4) {
                switch (req.status) {
                    case 200:
                    case 202:
                        callback(true,false);
                        break;
                    case 403:
                        callback(false,true);
                        break;
                    default:
                        callback(false,false);
                        break;
                }
            }
        };
    req.send();
    if (!async) {
        switch (req.status) {
            case 200:
            case 202:
                return true;
                break;
            case 403:
                return 403;
                break;
            default:
                return false;
                break;
        }
    }
}

function showNotification(notificationId) {
    if (!signalspam_Notification || typeof signalspam_Notification.notificationbox === "undefined") {
        verifrom.console.log(4,'signalspam_showNotification - notification box not initialized');
        if (typeof opener.XPCOMUtils === 'object')
            opener.XPCOMUtils.defineLazyGetter(signalspam_Notification
                , "notificationbox"
                , function() {
                    return new MozElements.NotificationBox(function(element) {
                        element.setAttribute("flex", "1");
                        element.setAttribute("notificationside","top");
                        document.getElementById("preferencesNotificationBox").append(element);
                        signalspam_NotificationReady = true;
                        verifrom.console.log(4,'signalspam_Notification initialized (2)');
                        showNotification(notificationId);
                    });
                });
        return;
    }
    signalspam_Notification.notificationbox.removeAllNotifications();

    let notifyBox = signalspam_Notification.notificationbox;
    notifyBox.removeAllNotifications();

    let bundle = Services.strings.createBundle("chrome://signalspam/locale/signalspam.properties");
    let notifications = {
        "invalidcredentials": {
            "label": bundle.GetStringFromName("signalspam-invalidcredentials"),
            "value": "invalidcredentials",
            "priority": notifyBox.PRIORITY_CRITICAL_HIGH
        },
        "invaliduserid": {
            "label": bundle.GetStringFromName("signalspam-invaliduserid"),
            "value": "invaliduserid",
            "priority": notifyBox.PRIORITY_CRITICAL_HIGH
        },
        "notauthentified": {
            "label": bundle.GetStringFromName("signalspam-notauthentified"),
            "value": "notauthentified",
            "priority": notifyBox.PRIORITY_CRITICAL_HIGH
        },
        "userauthentified": {
            "label": bundle.GetStringFromName("signalspam-userauthentified"),
            "value": "userauthentified",
            "priority": notifyBox.PRIORITY_INFO_LOW
        },
        "error403": {
            "label": bundle.GetStringFromName("signalspam-error403"),
            "value": "usernotconfirmed",
            "priority": notifyBox.PRIORITY_CRITICAL_HIGH
        }
    };
    let notificationToDisplay = notifications[notificationId];

    let notification = notifyBox.getNotificationWithValue(notificationToDisplay.value);
    if (notification)
    {
        verifrom.console.log(4,`signalspam_showNotification - notification ${notificationToDisplay.value} already displayed`);
        return;
    }

    if (notifyBox) {
        notifyBox.appendNotification(
            notificationToDisplay.label,
            notificationToDisplay.value,
            "chrome://signalspam/skin/icon48.png",
            notificationToDisplay.priority,
            [],function(){
                verifrom.console.log("signalspam_showNotification - notification event",arguments);
            }
        );
    }
}

function hideNotifications() {
    if (!signalspam_Notification || typeof signalspam_Notification.notificationbox === "undefined") {
        verifrom.console.log(4,'signalspam_hideNotifications - signalspam_Notification not initialized');
        return;
    }
    signalspam_Notification.notificationbox.removeAllNotifications();
    signalspam_NotificationReady = true;
    return;
}


function checkUserId()
{
    let userid=document.getElementById('signalspam_pref_userid').value;
    if (!userid || userid.length===0) {
        showNotification('invaliduserid');
        return false;
    }
    return true;
}

function savePrefs()
{
    prefs.setBoolPref("extensions.signalspam.userauthentified",true);
    prefs.setBoolPref("extensions.signalspam.firsttime",false);
    prefs.setCharPref("extensions.signalspam.lastversion",extensionConfig.appInfo.version);
    var preferences=document.querySelectorAll('preference');
    let userid=document.getElementById('signalspam_pref_userid').value;
    let password=document.getElementById('signalspam_pref_password').value;
    Preferences.get("signalspam_pref_lastversion").value = extensionConfig.appInfo.version;
    Preferences.get("signalspam_pref_userauthentified").value = true;
    Preferences.get("signalspam_pref_firsttime").value = false;

    verifrom.credentials.set(userid, password);
    if (credentials) {
        credentials.username=userid;
        credentials.password=password;
    }
}

function validPrefs(accept)
{
    verifrom.console.log(2,'validPrefs',arguments);

    var userid=document.getElementById('signalspam_pref_userid').value;
    var password=document.getElementById('signalspam_pref_password').value;

    if (checkUserId()===false)
        return false;

    let credentialsValid = checkCredentials(userid, password);
    if (credentialsValid===true) {
        savePrefs();
        document.removeEventListener('dialogaccept',onDialogAcceptHandler,{capture:true});
        document.removeEventListener('dialogcancel',onDialogCancelHandler,{capture:true});
        if (prefWindow)
            prefWindow.acceptDialog();
        window.close();
        return true;
    } else if (credentialsValid===403) {
        showNotification('error403');
        prefs.setCharPref("extensions.signalspam.userid",userid);
        Preferences.get("signalspam_pref_userid").value = userid;
        if (accept===true)
        {
            if (credentials && credentials.username)
            {
                //signalspam_prefs.setCharPref("extensions.signalspam.password","");
                document.getElementById('signalspam_pref_userid').value=credentials.username;
                document.getElementById('signalspam_pref_password').value=credentials.password;
                checkUserIdAndPassord();
            }
        }
        return false;
    } else if (credentialsValid===false) {
        showNotification('invalidcredentials');
        prefs.setCharPref("extensions.signalspam.userid",userid);
        Preferences.get("signalspam_pref_userid").value = userid;
        if (accept===true)
        {
            if (credentials && credentials.username)
            {
                //signalspam_prefs.setCharPref("extensions.signalspam.password","");
                document.getElementById('signalspam_pref_userid').value=credentials.username;
                document.getElementById('signalspam_pref_password').value=credentials.password;
                checkUserIdAndPassord();
            }
        }
        return false;
    }
}

function cancelPrefs(cancel)
{
    verifrom.console.log(2,'cancelPrefs');
    prefs.setBoolPref("extensions.signalspam.firsttime",false);
    Preferences.get("signalspam_pref_userauthentified").value = prefs.getBoolPref("extensions.signalspam.userauthentified");
    Preferences.get("signalspam_pref_firsttime").value = false;
    document.removeEventListener('dialogaccept',onDialogAcceptHandler,{capture:true});
    document.removeEventListener('dialogcancel',onDialogCancelHandler,{capture:true});
    if (prefWindow)
        prefWindow.cancelDialog();
    window.close();
    return true;
}



document.addEventListener('dialogaccept', onDialogAcceptHandler, {capture:true});
function onDialogAcceptHandler(event) {
    event.stopImmediatePropagation();
    event.stopPropagation();
    event.preventDefault();
    return validPrefs(true);
}

document.addEventListener('dialogcancel', onDialogCancelHandler, {capture:true});
function onDialogCancelHandler(event) {
    event.stopImmediatePropagation();
    event.stopPropagation();
    event.preventDefault();
    return cancelPrefs(true);
}
