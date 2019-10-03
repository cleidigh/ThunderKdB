//var psvc = Components.classes["@mozilla.org/preferences-service;1"]
//                                .getService(Components.interfaces.nsIPrefBranch);
//var instantApply = psvc.getBoolPref("browser.preferences.instantApply");

var prefWindow;
var prefs = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService)
    .getBranch("");
var notificationBox;
var notifications;
var credentials;
function encode(string) {
    var result = "";

    var s = string.replace(/\r\n/g, "\n");

    for(var index = 0; index < s.length; index++) {
        var c = s.charCodeAt(index);

        if(c < 128) {
            result += String.fromCharCode(c);
        }
        else if((c > 127) && (c < 2048)) {
            result += String.fromCharCode((c >> 6) | 192);
            result += String.fromCharCode((c & 63) | 128);
        }
        else {
            result += String.fromCharCode((c >> 12) | 224);
            result += String.fromCharCode(((c >> 6) & 63) | 128);
            result += String.fromCharCode((c & 63) | 128);
        }
    }

    return result;
};


function decode(string) {
    var result = "";

    var index = 0;
    var c = c1 = c2 = 0;

    while(index < string.length) {
        c = string.charCodeAt(index);

        if(c < 128) {
            result += String.fromCharCode(c);
            index++;
        }
        else if((c > 191) && (c < 224)) {
            c2 = string.charCodeAt(index + 1);
            result += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
            index += 2;
        }
        else {
            c2 = string.charCodeAt(index + 1);
            c3 = string.charCodeAt(index + 2);
            result += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            index += 3;
        }
    }

    return result;
};

var passwordEncrypt=function(string) {
    result=btoa(encode(string));
    //console.log("passwordEncrypt=["+result+"]");
    return result;
}; //btoa;
var passwordDecrypt=function(string){
    result=decode(atob(string));
    //console.log("passwordDecrypt=["+result+"]");
    return result;
};//atob;


window.addEventListener("load", function (e) {
    verifrom.console.log(1,'Preferences window loaded');
    prefWindow = document.querySelector('prefwindow');
    notificationBox=document.querySelector('notificationbox');
    if (!notificationBox)
        verifrom.console.error(1,'load event - notificationBox is undefined');
    else {
        notifications=notificationBox.allNotifications;
        for (var i=0;i<notifications.length;i++)
        {
            notifications[i]=notifications[i].cloneNode();
        }
        if (/error/.test(document.location.search))
            showNotification('notify-notauthentified');
    }
    credentials=verifrom.credentials.get(prefs.getCharPref("extensions.signalspam.userid"));
    if (credentials && credentials.username)
    {
        document.getElementById('signalspam_pref_password').value=credentials.password;
    } else verifrom.console.error(1,'No credentials loaded :',credentials);

    document.getElementById("thunderbirdpreferences").addEventListener("click",function(){
       var tWindow=window.open("chrome://messenger/content/preferences/preferences.xul", "Preferences","chrome,titlebar,toolbar,centerscreen");
       try {
           tWindow.onload=function() {
               //mail.spam.manualMark
               tWindow.focus();
               if (tWindow) {
                   tPrefWindow=tWindow.document.getElementsByTagName('prefwindow')[0];
                   var paneSec=tPrefWindow.querySelector('#paneSecurity');
                   tPrefWindow.showPane(paneSec);
               }
           };
       } catch(e) {
           verifrom.console.log('Exception opening Thunderbird preferences window',e);
       }
    },true);

    /*prefWindow.instantApply=false;
     prefWindow.buttons="accept,cancel,extra1,extra2";*/
});

window.addEventListener("focus", function (e) {
    if (prefs.getBoolPref('mail.spam.manualMark') === false)
        document.getElementById('manualMarkFalse').setAttribute('hidden', false);
    else document.getElementById('manualMarkFalse').setAttribute('hidden', true);
});

window.addEventListener("keypressed", keyhandler);
//document.getElementById("signalspam-pref-pane").addEventListener("keypressed", keyhandler);

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
            return cancelPrefs();
            break;
        default:
            return true;
            break;
    }
}

function checkCredentials(userid, password, callback)
{
    var xmlhttp = new XMLHttpRequest();
    xmlhttp.withCredentials=true;
    xmlhttp.open("OPTIONS", "https://www.signal-spam.fr/api/signaler", true);
    xmlhttp.setRequestHeader("Authorization","Basic "+passwordEncrypt(userid+':'+password));
    xmlhttp.setRequestHeader("Content-type","application/x-www-form-urlencoded");
    xmlhttp.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
    xmlhttp.onreadystatechange=function() {
        if (xmlhttp.readyState == 4) {
            switch (xmlhttp.status) {
                case 200:
                    callback(true);
                    break;
                default:
                    callback(false);
                    break;
            }
        }
    };
    xmlhttp.send();
}

function savePrefs()
{
    var preferences=document.querySelectorAll('preference');
    var userid, password;

    for (var i=0;i<preferences.length;i++)
    {
        if (preferences[i].getAttribute("hidden")===true)
            continue;
        var prefName=preferences[i].name;

        if (prefName==="extensions.signalspam.password")
        {
            password=preferences[i].value;
            continue;
        }
        if (prefName==="extensions.signalspam.userid")
        {
            userid=preferences[i].value;
        }
        var prefType=preferences[i].type;
        var prefValue=preferences[i].value;
        verifrom.console.log(4,'savePrefs - '+prefName+'=='+prefValue+' ('+prefType+')');
        switch(prefType)
        {
            case 'string':
                prefs.setCharPref(prefName,prefValue);
                break;
            case 'bool':
                prefs.setBoolPref(prefName,prefValue);
                break;
        }
    }
    verifrom.credentials.set(userid, password);
    if (credentials) {
        credentials.username=userid;
        credentials.password=password;
    }
    prefs.setCharPref("extensions.signalspam.password","**********"+Date.now());
    prefs.setBoolPref("extensions.signalspam.userauthentified",true);
    prefs.setBoolPref("extensions.signalspam.firsttime",false);
    prefs.setCharPref("extensions.signalspam.lastversion",extensionConfig.appInfo.version);
}

function showNotification(notificationId)
{
    notificationBox=document.querySelector('notificationbox');
    if (!notificationBox.appendNotification)
        verifrom.console.error(1,'ERROR - notificationBox.append undefined');
    if (notifications.length>0)
    {
        var notificationFound=false;
        for (var i=0;i<notifications.length&&notificationFound===false;i++)
        {
            var newNotification=notifications[i];
            if (newNotification && newNotification.id===notificationId)
            {
                newNotification=newNotification.cloneNode();
                newNotification.hidden=false;
                notificationBox.appendChild(newNotification);
                notificationFound=true;
            }
        }
    }
}

function hideNotifications()
{
    notificationBox=document.querySelector('notificationbox');

    var existingNotifications=notificationBox.allNotifications;
    for (var i=0;i<existingNotifications.length;i++)
    {
        if (existingNotifications[i].hidden===false)
            existingNotifications[i].close();
    }
}

function checkUserId()
{
    var notif;
    hideNotifications();
    
    var userid=document.getElementById('signalspam_pref_userid').value;
    //a-z, A-Z, 0-9, le point, le trait d'union et le tiret bas.
    //if (!userid || /^([a-z]|[0-9]|\.|-|_|\ |\*){1,}$/i.test(userid)===false || userid.length===0)
    if (!userid || userid.length===0)
    {
        showNotification('notify-invaliduserid');
        document.getElementById('signalspam_pref_userid').focus();
        return false;
    } else {
        hideNotifications();
        notif=document.getElementById('notify-invaliduserid');
        if (notif)
            notif.hidden=true;
        return true;
    }
}

function validPrefs(accept)
{
    verifrom.console.log(2,'validPrefs',arguments);

    var userid=document.getElementById('signalspam_pref_userid').value;
    var password=document.getElementById('signalspam_pref_password').value;

    if (checkUserId()===false)
        return false;

    checkCredentials(userid, password, function(credentialsValid){
        if (credentialsValid) {
            savePrefs();
            if (accept!==true)
                prefWindow.acceptDialog();
            window.close();
            return true;
        } else {
            showNotification('notify-invalidcredentials');
            //var notif=document.getElementById('notify-invalidcredentials');
            //notif.hidden=false
            if (accept===true)
            {
                if (credentials && credentials.username)
                {
                    prefs.setCharPref("extensions.signalspam.password","");
                    prefs.setCharPref("extensions.signalspam.userid",credentials.username);
                    document.getElementById('signalspam_pref_userid').value=credentials.username;
                    document.getElementById('signalspam_pref_password').value=credentials.password;
                } else {
                    prefs.setCharPref("extensions.signalspam.password","");
                    prefs.setCharPref("extensions.signalspam.userid","");
                    document.getElementById('signalspam_pref_userid').value="";
                    document.getElementById('signalspam_pref_password').value="";
                }
            }
            return false;
        }
    });
    return false;
}

function cancelPrefs(cancel)
{
    verifrom.console.log(2,'cancelPrefs');
    /*if (cancel!==true)
        prefWindow.cancelDialog();*/
    if (cancel===true)
    {
        var userid=document.getElementById('signalspam_pref_userid').value;
        var password=document.getElementById('signalspam_pref_password').value;
        if (checkUserId()===true) {
            checkCredentials(userid, password, function(credentialsValid){
                if (credentialsValid) {
                    verifrom.credentials.set(userid, password);
                    prefs.setCharPref("extensions.signalspam.password","**********"+Date.now());
                    prefs.setBoolPref("extensions.signalspam.userauthentified",true);
                    prefs.setBoolPref("extensions.signalspam.firsttime",false);
                }
                else {
                    verifrom.credentials.set(userid, "");
                    prefs.setCharPref("extensions.signalspam.password","**********"+Date.now());
                    prefs.setBoolPref("extensions.signalspam.userauthentified",false);
                    prefs.setBoolPref("extensions.signalspam.firsttime",false);
                }
            });
        }
    }
    if (!cancel)
        window.close();
    return true;
}

