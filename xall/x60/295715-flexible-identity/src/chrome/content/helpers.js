var fidHelpers = {

onLoad: function() {
    try {
        let prefs = Components.classes['@mozilla.org/preferences-service;1'].
            getService(Components.interfaces.nsIPrefBranch);

        this.pref = 'extensions.fid.welcome.version';
        this.version = 1;

        if (this.willShowNotify(prefs)) {
            this.showNotify();
            this.resetNotifyPref(prefs);
        }
    } catch (ex) {Components.utils.reportError(ex);}
},

willShowNotify: function(prefs) {
    try {
        return prefs.getIntPref(this.pref) < this.version;
    } catch (ex) { /* nothing */ }

    return true;
},

resetNotifyPref: function(prefs) {
    prefs.setIntPref(this.pref, this.version);
},

showNotify: function() {
    let notifyBox = document.getElementById('mail-notification-box');

    let bundle = Components.classes['@mozilla.org/intl/stringbundle;1'].
        getService(Components.interfaces.nsIStringBundleService).
        createBundle('chrome://fid/locale/rules.properties');

    let notifyText = bundle.GetStringFromName('fidWelcome');

    var buttons = [
        {
            label: bundle.GetStringFromName('fidWelcomeAction'),
            accessKey: null,
            popup: null,
            callback: function(aNotificationBar, aButton) {
                window.open('chrome://fid/content/options.xul', '', 'chrome,centerscreen,modal,resizable');
                return true;
            }
        }
    ];

    var box = notifyBox.appendNotification(notifyText, "about-fid",
        null, notifyBox.PRIORITY_INFO_LOW, buttons);

    box.persistence = 4;
},

} // fidHelpers

window.addEventListener('load', function() {fidHelpers.onLoad();}, false);
