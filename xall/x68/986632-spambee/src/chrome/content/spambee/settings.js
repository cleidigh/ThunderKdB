var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');
var prefs;
try {
    prefs = Services.prefs.getBranch("");
    let extPrefs = [
        {
            id: "spambee_pref_oneclick",
            instantApply: true,
            name: "extensions.spambee.oneclick",
            type: "bool",
            defaultValue: false
        }
        , {
            id: "spambee_pref_urldetect",
            instantApply: true,
            name: "extensions.spambee.urldetect",
            type: "bool",
            defaultValue: true
        }
        , {
            id: "spambee_pref_movereport",
            instantApply: true,
            name: "extensions.spambee.movereport",
            type: "bool",
            defaultValue: true
        }
        , {
            id: "spambee_pref_spambtonactive",
            instantApply: true,
            name: "extensions.spambee.spambtonactive",
            type: "bool",
            defaultValue: false
        }
        , {
            id: "spambee_pref_userauthentified",
            instantApply: true,
            name: "extensions.spambee.userauthentified",
            type: "bool",
            defaultValue: true,
            hidden: true
        }
        , {
            id: "spambee_pref_firsttime",
            instantApply: true,
            name: "extensions.spambee.firsttime",
            type: "bool",
            defaultValue: false,
            hidden: true
        }
        , {
            id: "spambee_pref_lastversion",
            instantApply: true,
            name: "extensions.spambee.lastversion",
            type: "string",
            defaultValue: "",
            hidden: true
        }
        , {
            id: "spambee_pref_notification",
            instantApply: true,
            name: "extensions.spambee.notification",
            type: "bool",
            defaultValue: true,
            hidden: false
        }
        , {
            id: "spambee_pref_privacy",
            instantApply: true,
            name: "extensions.spambee.privacy",
            type: "bool",
            defaultValue: false,
            hidden: false
        }];

    for (let i=0;i<extPrefs.length;i++) {
        let p = extPrefs[i];
        Preferences.add(p);
        let e = document.querySelector(`[preference="${p.id}"]`);
        if (!e) {
            void 0;
            continue;
        }
        let l = document.querySelector(`label[control="${e.id}"]`);
        if (!l) {
            void 0;
            continue;
        }

        l.addEventListener("click",
            function setP(event) {
                void 0;
                Preferences.get(this.getAttribute("preference")).value=Preferences.get(this.getAttribute("preference")).getElementValue(this);
            }.bind(e),
            {}
        );
    }
} catch(e) {
    void 0;
}


window.addEventListener("load", function (e) {
    void 0;

    var spambee_NotificationReady = false;
    const spambee_Notification = {};
    try {
        if (typeof opener.XPCOMUtils==='object')
            opener.XPCOMUtils.defineLazyGetter(spambee_Notification
                , "notificationbox"
                , function() {
                    return new MozElements.NotificationBox(function(element) {
                        element.setAttribute("flex", "1");
                        element.setAttribute("notificationside","top");
                        document.getElementById("preferencesNotificationBox").append(element);
                        spambee_NotificationReady = true;
                        void 0;
                    });
                });
    } catch(e) {
        void 0;
    }
    var prefWindow=document.querySelector('dialog');;

    Preferences.forceEnableInstantApply();

    spambee_notificationBox=document.querySelector('notificationbox');
    if (spambee_notificationBox)
    {
        notifications=spambee_notificationBox.allNotifications;
        for (var i=0;i<notifications.length;i++)
        {
            notifications[i]=notifications[i].cloneNode();
        }
    }

    document.getElementById("dataprivacypolicy").onclick=function() {
        opener.openURL("https://services.verifrom.com/spambee/privacypolicy/SPAMBEE-PrivacyPolicy.html")
    }

    document.getElementById("thunderbirdpreferences").onclick=function(){
        try {
            var tWindow=window.open("chrome://messenger/content/preferences/aboutPreferences.xul", "Preferences","chrome,titlebar,toolbar,centerscreen,resizable,scrollbars,status,height=480,width=640");
            tWindow.onloadend=function() {
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
            void 0;
        }
    };

    Preferences.get("spambee_pref_lastversion").value = extensionConfig.appInfo.version;
    Preferences.get("spambee_pref_userauthentified").value = true;
    Preferences.get("spambee_pref_firsttime").value = false;

    var buttonAccept=document.documentElement.getButton('accept');
    buttonAccept.hidden = false;
    buttonAccept.disabled = false;
    buttonAccept.default = false;
    var buttonCancel=document.documentElement.getButton('cancel');
    buttonCancel.hidden = false;
    buttonCancel.disabled = false;
    buttonCancel.default = false;
    buttonAccept.focus();


    window.addEventListener("focus", function (e) {
        if (prefs.getBoolPref('mail.spam.manualMark') === false)
            document.getElementById('manualMarkFalse').setAttribute('hidden', false);
        else document.getElementById('manualMarkFalse').setAttribute('hidden', true);
    });

    window.addEventListener("keypressed", keyhandler);

    function keyhandler(e) {
        var keyCode=e.characterCode || e.keyCode || e.which || e.key;
        switch(keyCode)
        {
            case "Enter":
            case 13:
                e.preventDefault();
                void 0;
                acceptDialog();
                return false;
                break;
            case "Escape":
            case 27:
                e.preventDefault();
                void 0;
                cancelDialog();
                return false;
                break;
            default:
                return true;
                break;
        }
    }

    document.addEventListener('dialogaccept', onDialogAcceptHandler, {capture:true});
    function onDialogAcceptHandler(event) {
        try {
            event.stopImmediatePropagation();
            event.stopPropagation();
            event.preventDefault();
            return savePrefs();
        } catch(e) {
            void 0;
        }
    }

    document.addEventListener('dialogcancel', onDialogCancelHandler, {capture:true});
    function onDialogCancelHandler(event) {
        try {
            event.stopImmediatePropagation();
            event.stopPropagation();
            event.preventDefault();
            return cancelPrefs(true);
        } catch(e) {
            void 0;
        }
    }

    function savePrefs()
    {
        try {
            document.removeEventListener('dialogaccept', onDialogAcceptHandler, {capture: true});
            document.removeEventListener('dialogcancel', onDialogCancelHandler, {capture: true});
            if (prefWindow)
                prefWindow.acceptDialog();
            window.close();
            return true;
        } catch(e) {
            void 0;
            return false;
        }
    }

    function cancelPrefs()
    {
        try {
            void 0;
            document.removeEventListener('dialogaccept', onDialogAcceptHandler, {capture: true});
            document.removeEventListener('dialogcancel', onDialogCancelHandler, {capture: true});
            if (prefWindow)
                prefWindow.cancelDialog();
            window.close();
            return true;
        } catch(e) {
            void 0;
            return false;
        }
    }

});

