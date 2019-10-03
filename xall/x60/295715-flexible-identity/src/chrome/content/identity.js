var fidIdentity = {

onLoad: function() {
    try {
        this.ro = new fidRules();
        this.embedIntoCompose();
    } catch (ex) {Components.utils.reportError(ex);}
},

showOptions: function() {
    var res = {};
    window.openDialog('chrome://fid/content/options.xul', '', 'chrome,centerscreen,modal,resizable', res);
},

embedIntoCompose: function() {
    var fid_SendMessageWithCheck = SendMessageWithCheck;
    var fid_SendMessage = SendMessage;
    var fid_SendMessageLater = SendMessageLater;
    var fid_GenericSendMessage = GenericSendMessage;

    window.SendMessageLater = function () {
        fidIdentity.checkAndSend(fid_SendMessageLater);
    };

    window.SendMessageWithCheck = function () {
        fidIdentity.checkAndSend(fid_SendMessageWithCheck);
    };

    window.SendMessage = function () {
        fidIdentity.checkAndSend(fid_SendMessage);
    };

    window.GenericSendMessage = function(msgType) {
        fidIdentity.genericSend(msgType, fid_GenericSendMessage);
    }
},

checkAndSend: function(aCallback) {
    try {
        if (!this.checkCC())
            return;

        if (!this.checkRules(true))
            return;
    } catch(ex) {Components.utils.reportError(ex);}

    aCallback();
},

getRecipients: function() {
    let res = [];
    let i = 0;
    let curTo = '';

    while (true) {
        i++;

        try {
            if ((curTo = document.getElementById('addressCol2#' + i).
                value.toLowerCase()) != '') {
                curTo.replace(' ', '');
                let temp1 = curTo.indexOf('<');
                let temp2 = curTo.indexOf('>');

                if (temp1 != -1 && temp2 != -1)
                    curTo = curTo.substring(temp1 + 1, temp2);

                let type = document.getElementById('addressCol1#' + i).value.toLowerCase();

                res.push({email: curTo, type: type});
            }
        } catch(ex) {break;}
    }

    return res;
},

checkRules: function(willSend) {
    let cmb = document.getElementById('msgIdentity');
    let idx = this.ro.match(this.getRecipients());

    if (idx != -1) {
        let r = this.ro.rules[idx];
        let key = r.account;
        let useAttr = cmb.selectedItem.hasAttribute('identitykey');
        let from = useAttr ? cmb.selectedItem.getAttribute('identitykey') : cmb.value;
        let fixError = true;

        if (key != from && key) {
            if (!r.noWarning && willSend) {
                let msg = this.ro.bundle.formatStringFromName(
                    'ruleWarning',
                    [this.ro.mgr.getIdentity(from).identityName,
                    this.ro.mgr.getIdentity(key).identityName], 2);

                let prompts = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].
                    getService(Components.interfaces.nsIPromptService);

                var check = {value: false};

                let ask = prompts.confirmEx(window,
                    this.ro.bundle.GetStringFromName('ruleWarnCaption'),
                    msg,
                    prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_IS_STRING +
                        prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_CANCEL +
                        prompts.BUTTON_POS_2 * prompts.BUTTON_TITLE_IS_STRING +
                        prompts.BUTTON_POS_1_DEFAULT,
                    this.ro.bundle.GetStringFromName('ruleWarnSend'),
                    '',
                    this.ro.bundle.GetStringFromName('ruleWarnCorrect'),
                    null,
                    check);

                if (ask === 1)
                    return false;

                fixError = ask === 2;
            }

            if (fixError) {
                if (useAttr) {
                    let identity = this.ro.mgr.getIdentity(key);
                    cmb.value = MailServices.headerParser.makeMailboxObject(
                        identity.fullName, identity.email).toString();
                } else
                    cmb.value = key;

                LoadIdentity(false); // thanks to Bruce Jolliffe
            }
        }
    }

    return true;
},

checkCC: function() {
    let prefs = Components.classes['@mozilla.org/preferences-service;1'].
        getService(Components.interfaces.nsIPrefBranch);

    if (!prefs.getBoolPref('extensions.fid.check.cc'))
        return true;

    let i = 0;
    let found = false;

    while (true) {
        i++;

        try {
            let type = document.getElementById('addressCol1#' + i).value.toLowerCase();

            if (type !== 'addr_cc' && type !== 'addr_bcc' && type !== '' &&
                document.getElementById('addressCol2#' + i).value.toLowerCase() !== '') {
                found = true;
                break;
            }
        } catch(ex) {break;}
    }

    if (found)
        return true;

    let prompts = Components.classes['@mozilla.org/embedcomp/prompt-service;1'].
        getService(Components.interfaces.nsIPromptService);

    var check = {value: false};

    let ask = prompts.confirmEx(window,
        this.ro.bundle.GetStringFromName('ccWarnCaption'),
        this.ro.bundle.GetStringFromName('ccWarning'),
        prompts.BUTTON_POS_0 * prompts.BUTTON_TITLE_IS_STRING +
            prompts.BUTTON_POS_1 * prompts.BUTTON_TITLE_CANCEL +
            prompts.BUTTON_POS_1_DEFAULT,
        this.ro.bundle.GetStringFromName('ccWarnSend'),
        '',
        '',
        this.ro.bundle.GetStringFromName('ccWarnCheck'),
        check);

    if (check.value) {
        prefs.setBoolPref('extensions.fid.check.cc', false);
    }

   return ask !== 1;
},

genericSend: function(aType, aCallback) {
    try {
        if (aType == nsIMsgCompDeliverMode.SaveAsDraft && !this.checkDraft())
            return;
    } catch(ex) {Components.utils.reportError(ex);}

    aCallback(aType);
},

checkDraft: function() {
    let prefs = Components.classes['@mozilla.org/preferences-service;1'].
        getService(Components.interfaces.nsIPrefBranch);

    return prefs.getBoolPref('extensions.fid.check.draft') ?
        this.checkRules(false) : true;
},

} // fidOptions

window.addEventListener('load', function() {fidIdentity.onLoad();}, false);
