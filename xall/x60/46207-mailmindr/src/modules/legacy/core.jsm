/* jshint curly: true, strict: true, multistr: true, moz: true, undef: true, unused: true */
/* global Components, mailmindrLogger, mailmindrSearch, mailmindrFactory */
"use strict";

if (Cu === undefined)  var Cu = Components.utils;
if (Ci === undefined)  var Ci = Components.interfaces;
if (Cc === undefined)  var Cc = Components.classes;

let EXPORTED_SYMBOLS = ["mailmindrCore"];

Cu.import("resource://gre/modules/XPCOMUtils.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/PluralForm.jsm");
// 
Cu.import("resource://mailmindr/preferences.jsm");
Cu.import("resource://mailmindr/legacy/logger.jsm");
Cu.import('resource://mailmindr/localisation.jsm');
Cu.import("resource://mailmindr/legacy/common.jsm");
Cu.import("resource://mailmindr/legacy/search.jsm");
Cu.import("resource://mailmindr/kernel.jsm");
Cu.import("resource://mailmindr/executor.jsm");
Cu.import("resource://mailmindr/utils.jsm");

// 
// 
// 

const _logger = new mailmindrLogger({ _name: 'core.jsm' });

class MailmindrCoreBase {
    constructor() {
        this._messengerInstances = [];
        this._name = "mailmindrCore";
        this._logger = new mailmindrLogger(this);
        // 

        this.data = {
            mindrsInDialog: [],
            mindrExecutionQueue: []
        };

        this._logger.enabled = true;
    }

    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 

    // 
        // 
        // 
        // 
        // 
        // 
        // 
        // 

        // 

        // 
        // 
    // 

    safeCall(caller, func) {
        let name = caller._name;

        this._logger.log('safeCall::from: ' + caller._name || 'undefined');

        try {
            func.call(caller);
        } catch (safeCallException) {
            this._logger.error('ERROR in safeCall :: ' + name);
            this._logger.error(safeCallException);
        }
    }

    /**
     * startNextTimer - starts the timer for the next messenger instance
     */
    startNextTimer() {
        this._logger.log(`-- startNextTimer: ${this._messengerInstances.length}`);
        if (this._messengerInstances.length > 0) {
            if (this._messengerInstances[0].startTimer) {

                this._messengerInstances[0].startTimer();
            }
        }
    }

    /**
     * adds a new messenger instance to the global messenger counter
     * @params messenger A Messenger instance
     * @returns number of registered messengers (without the new messenger)
     */
    registerMessengerInstance(instance) {
        this._messengerInstances.push(instance);
        return this._messengerInstances.length - 1;
    }

    /**
     * unregisters a mesenger from the global messenger list
     */
    unregisterMessengerInstance(messenger) {
        this._messengerInstances.pop(messenger);
    }

    /** 
     * gets the acive messenger instance
     */
    getMessengerInstance() {
        return this._messengerInstances[this._messengerInstances.length - 1];
    }

// 
// 
// 

// 
// 
// 
// 



    /**
     * createSystemTimespans - creates a list (array) of timespans
     * with 7 days and 7 hours
     */
    createSystemTimespans() {
        let systemTimespans = [];

        /* create a seven day lookahead */
        for (let days = 1; days <= 7; days++) {
            let item = mailmindrKernel.kernel.modules.factory.createTimespan();
            item.days = days;
            item.text = item.toRelativeString();
            item.isGenerated = true;
            systemTimespans.push(item);
        }

        /* create a 6 hour window */
        for (let hours = 1; hours < 7; hours++) {
            let item = mailmindrKernel.kernel.modules.factory.createTimespan();
            item.hours = hours;
            item.text = item.toRelativeString();
            item.isGenerated = true;
            systemTimespans.push(item);
        }

        return systemTimespans;
    }

    /**
     * createSystemActions - create an array of system actions:
     * - mark unread
     * - show dialog
     * - tag message with ..
     *
     * tryout: if first argument is a document object we create a colored list of tags
     */
    createSystemActions(options) {
        let actions = [];
        let actionTpl = {};
        let mailmindrFactory = mailmindrKernel.kernel.modules.factory;
        // 
        let doc = options && typeof(options.document) != "undefined" ? options.document : null;

        // 
        if (options && options.canBeDeactivated) {
            actionTpl = mailmindrFactory.createActionTemplate();
            actionTpl.id = -1; // flag the "nop"-action with id -1 
            actionTpl.text = mailmindrI18n.getString("mailmindr.utils.core.actiontemplate.donothing");
            actionTpl.isGenerated = true;
            actions.push(actionTpl);
        }

        // 
        actionTpl = mailmindrFactory.createActionTemplate();
        actionTpl.text = mailmindrI18n.getString("mailmindr.utils.core.actiontemplate.flag");
        actionTpl.isGenerated = true;
        actionTpl.doMarkFlag = true;
        actions.push(actionTpl);

        // 
        actionTpl = mailmindrFactory.createActionTemplate();
        actionTpl.text = mailmindrI18n.getString("mailmindr.utils.core.actiontemplate.markunread");
        actionTpl.isGenerated = true;
        actionTpl.doMarkAsUnread = true;
        actions.push(actionTpl);

        // 
        actionTpl = mailmindrFactory.createActionTemplate();
        actionTpl.text = mailmindrI18n.getString("mailmindr.utils.core.actiontemplate.reminderonly");
        actionTpl.isGenerated = true;
        actionTpl.doShowDialog = true;
        actionTpl.doMarkFlag = false;
        actions.push(actionTpl);

        // 
        let tags = mailmindrCommon.getAllTags();

        for (let tag of tags) {
            let actionTpl = mailmindrFactory.createActionTemplate();
            let text = mailmindrI18n.getString("mailmindr.utils.core.actiontemplate.tag");
            let label = tag.tag;

            // 
            if (doc != null) {
                let item = doc.createElement("menuitem");
                let txt = doc.createTextNode(tag.tag);
                let e = doc.createElement("span");
                let a = doc.createAttribute("style");

                a.nodeValue = "font-weight: bold; color: " + tag.color;
                e.setAttributeNode(a);

                item.appendChild(txt);
                item.appendChild(e);

                actionTpl.htmlElement = item;
            }

            actionTpl.text = text.replace("#1", tag.tag);
            actionTpl.isGenerated = true;
            actionTpl.doTagWith = tag.key;

            actions.push(actionTpl);
        }


        // 
        let folder = (options && options.isSentFolder) 
            ? MailmindrPreferences.getStringPref("common.targetFolderSent") 
            : MailmindrPreferences.getStringPref("common.targetFolderIncoming");

        if (folder.length > 0) {
            let actionTplMove = mailmindrFactory.createActionTemplate();
            let textMove = mailmindrI18n.getString("mailmindr.utils.core.actiontemplate.domove");
            let textCopy = mailmindrI18n.getString("mailmindr.utils.core.actiontemplate.docopy");

            actionTplMove.text = textMove.replace("#1", getFolder(folder).prettyName);
            actionTplMove.isGenerated = true;
            actionTplMove.doMoveOrCopy = 1;
            actionTplMove.targetFolder = folder;

            actions.push(actionTplMove);

            let actionTplCopy = mailmindrFactory.createActionTemplate();
            actionTplCopy.text = textCopy.replace("#1", getFolder(folder).prettyName);
            actionTplCopy.isGenerated = true;
            actionTplCopy.doMoveOrCopy = 2;
            actionTplCopy.targetFolder = folder;

            actions.push(actionTplCopy);
        }


        if (options && options.canBeUserDefined) {
            let actionTpl = mailmindrFactory.createActionTemplate();
            actionTpl.id = -2;
            actionTpl.text = mailmindrI18n.getString("mailmindr.utils.core.actiontemplate.userdefined");
            actionTpl.isGenerated = true;
            actions.push(actionTpl);
        }

        return actions;
    }


    /**
     * createMindrWithAction - create a mindr object
     * and initializes it with the given action
     * @returns
     */
    createMindrWithAction(action) {
        let mindr = mailmindrKernel.kernel.modules.factory.createMindr();
        return action.copyTo(mindr);
    }

// 
// 
// 
// 
// 
// 

// 
// 
// 
// 
// 
// 

// 
// 
// 
// 
// 

// 
// 
// 
// 
// 
// 
// 

// 
// 

    /**
     * getMindrs - gets mindrs within the absolute timestamps absMin and absMax
     */
    getMindrs(mindrs, absMin, absMax) {
        let pending = new Array();
        if (absMin >= absMax) {
            return pending;
        }

        for (var idx = 0; idx < mindrs.length; idx++) {
            var evt = mindrs[idx];
            if ((evt.remindat >= absMin) && (evt.remindat < absMax) && (evt.id > 0)) {
                pending.push(evt);
            }
        }
        return pending;
    }


// 
// 
// 
// 
// 
// 

// 
// 
// 
// 
// 

// 
// 
// 
// 

    /**
     * getMindrForMessageId - gets the mindr for the given message id
     * @param array mindrs The list of active mindrs
     * @param String messageId The Message Id we look for
     * @returns Object Returns the mindr for the message id or null, if no such mindr can be found
     */
    getMindrForMessageId(mindrs, messageId) {
        this._logger.log('call getMindrForMessageId(.., ' + messageId + ')');

        const mindrsForMessage = this.getMindrsForMessageId(mindrs, messageId);

        return mindrsForMessage && mindrsForMessage.length ? mindrsForMessage[0] : null;
        // 
    }

    getMindrsForMessageId(mindrs, messageId) {
        if ((mindrs == null) || (mindrs.length == 0)) {
            this._logger.warn('call getMindrsForMessageId w/ <null>');
            return null;
        }

        this._logger.log('call getMindrsForMessageId(.., ' + messageId + ')');

        return Array.from(mindrs).filter(mindr => mindr.mailguid === messageId);
    }

    /**
     * getMindrByGuid - gets the mindr for the given MINDR id
     * @param array mindrs The list of active mindrs
     * @param String messageId The Message Id we look for
     * @returns Object Returns the mindr for the message id or null, if no such mindr can be found
     */
    getMindrByGuid(mindrs, mailmindrGuid) {
        return mindrs.find(mindr => mindr.mailmindrGuid === mailmindrGuid) || null;
    }

    queueMindrForExecution(mindr) {
        return new Promise((resolve, reject) => {
            const position = this.data.mindrExecutionQueue.length;
            this._logger.log('queing mindr for execution at pos #' + position);
            this.data.mindrExecutionQueue.push(mindr);

            if (position === 0) {
                // 
                this.executeNextMindr();
            }

            return resolve();
        });
    }

    async executeNextMindr() {        
        let mindr = this.data.mindrExecutionQueue.shift();
        if (mindr) {
            this._logger.log(`mindr from queue, ready for execution: '${mindr.mailmindrGuid}' w/ '${mindr.mailguid}'`);
            // 
            const success = await executeMindrInWindow(mindr, null);
            return success;
        } 

        this._logger.log('queue empty');
    }

    /**
     * executes a mindr:
     * - copy to folder
     * - move to folder
     * - flag with keyword
     * - markAsUnread
     * - markFlagged
     * @param object mindr The mindr object to execute
     * @returns true if action object is valid and maybe executed, false otherwise (mindr is null)
     */
    // 
    // 
    // 
    // 
    // 

    // 
    // 
    // 
    // 
    // 
    // 
    // 

    // 
    // 

    // 

    // 
    // 

    // 
    // 
    // 
    // 
    // 
    // 
    // 

    // 
    // 
    // 
    // 

    // 
    // 
                    
    // 
    // 

    // 

    // 
    // 
    // 
    // 
    // 

    // 
    // 
    // 
    // 
    // 
    // 

    // 
    // 
    // 
    // 
    // 
    // 

    // 
    // 
    // 
    // 

    // 
    // 
    // 
    // 

    // 

    // 
    // 
    // 
    // 
                        
    // 
    // 
    // 
    // 

    // 
    // 
    // 
    // 
    // 
    // 
    // 

    // 
    // 

    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 

    // 
    // 

    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 

    // 
    // 
    // 
    // 
    // 
    // 

    // 
    // 
    // 

    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 

    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 

    // 

    // 

    // 
    // 

    // 
    // 
    // 
    // 
    // 

    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 

    // 
    // 

// 
// 
// 
// 
// 
// 

// 
// 
// 
// 
// 
// 



    /** 
     * writePreference - store preference to DB
     */
    writePreference(key, value) {
        this._logger.log('DB write preference: ' + key);
         mailmindrKernel.kernel.modules.storage.setPreference(key, value);
    }

    /**
     * readPreferences - read preferences
     */
    readPreference(key, defaultValue) {
        this._logger.log('DB read preference: ' + key);
        let value = mailmindrKernel.kernel.modules.storage.findPreference(key);

        this._logger.log('DB read from db w/ key ' + key + ': ' + value);
        return typeof value === 'undefined'
            ? defaultValue
            : value;
    }

    get Settings() {
        return {
            firstDayOfWeek: MailmindrPreferences.getIntPref("common.firstdayofweek"),
        }
    }

    postponeMindrRelative(mindr, minutesToAdd) {
        const millisecondsToAdd = this.calculateMilliseconds(minutesToAdd);

        mindr.remindat = mindr.remindat + millisecondsToAdd;

        mailmindrKernel.kernel.modules.storage.updateMindr(mindr);
    }

// 
// 
// 
// 

    addMindrToDialog(mindr) {
        // 
        if (this.isMindrInDialog(mindr) || !mindr.doShowDialog) {
            this._logger.log('-> must not add ' + mindr.mailmindrGuid + ' to dialog (' + (mindr.doShowDialog ? 'alrady in list' : 'do not show dialog') + ')');
            return false;
        }

        // 
        this._logger.log("-> pushing mindr to the reminder dialog list: " + mindr.mailmindrGuid);
        this.data.mindrsInDialog.push(mindr);
        return true;
    }

// 
// 
// 
// 

    isMindrInDialog(mindr) {
        if (!this.mindrsInDialogAvailable()) {
            this._logger.log("no mindrs in list");
            return false;
        }

        let foundMindrs = this.data.mindrsInDialog.filter(function(mindrOne) {
            let result = mindrOne.mailmindrGuid == mindr.mailmindrGuid;
            return result;
        });

        this._logger.log(
            "- mindrs in dialogs list? "
            + (foundMindrs != 0 ? 'yes' : 'no')
            + ' ' + mindr.mailmindrGuid
        );

        return foundMindrs.length != 0;
    }

    mindrsInDialogAvailable() {
        return this.data.mindrsInDialog.length > 0;
    }

    getMindrsInDialog() {
        this._logger.log("return # list of mindrs: " + this.data.mindrsInDialog.length);
        return this.data.mindrsInDialog;
    }

    removeMindrFromDialog(mindr) {
        this._logger.log('remove mindr from dialog list: ' + mindr.mailmindrGuid);
        if (!this.isMindrInDialog(mindr)) {
            return;
        }

        this.data.mindrsInDialog = this.data.mindrsInDialog.filter(function(mindrOne) {
            return mindrOne.mailmindrGuid != mindr.mailmindrGuid;
        });
    }

    calculateMilliseconds(minutes) {
        return minutes * 60000;
    }

    getAccounts() {
        const self = this;
        var acctMgr = Components.classes["@mozilla.org/messenger/account-manager;1"]
            .getService(Components.interfaces.nsIMsgAccountManager);
        var accounts = acctMgr.accounts;
        var result = [];

        for (let i = 0; i < accounts.length; i++) {
            const accountObject = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);
            if ((accountObject.incomingServer.type.indexOf('imap') == 0) || (accountObject.incomingServer.type.indexOf('pop') == 0) || (accountObject.incomingServer.type.indexOf('none') == 0)) {
                const server = accountObject.incomingServer;
                const identity = accountObject.defaultIdentity || {
                    email: '',
                    identityName: ''
                };
                const isLocal = (accountObject.incomingServer.type.indexOf('imap') < 0 && accountObject.incomingServer.type.indexOf('pop') < 0);
                result.push({
                    account: accountObject,
                    displayName: server.prettyName || accountObject.key,
                    identityMail: identity.email,
                    identityName: identity.identityName,
                    internalKey: accountObject.key,
                    key: isLocal ? 'mailmindr:global' : self.createAccountKey(accountObject.incomingServer),
                    isImap: (accountObject.incomingServer.type.indexOf('imap') == 0),
                    isLocal: isLocal
                });
            }
        }

        return result;
    }

    createAccountKey(msgIncomingServer) {
        this._logger.log(`createAccountKey: ${msgIncomingServer.isLocal}, ${msgIncomingServer.realUsername}`);

        //let server = msgIncomingServer.incomingServer;
        if (!msgIncomingServer) {
            return '9c70933aff6b2a6d08c687a6cbb6b765'; // md5('global')
        }

        let dummy = msgIncomingServer.realHostName + '|' + msgIncomingServer.realUsername;
        let encryptedResult = this.createMD5(dummy);

        return encryptedResult;
    }

    ///
    /// Compute hash from a string
    /// source: https://developer.mozilla.org/en-US/docs/Mozilla/Tech/XPCOM/Reference/Interface/nsICryptoHash#Computing_the_Hash_of_a_String
    ///
    createMD5(data) {
        function toHexString(charCode) {
            return ("0" + charCode.toString(16)).slice(-2);
        }

        const converter = Components.classes["@mozilla.org/intl/scriptableunicodeconverter"]
            .createInstance(Components.interfaces.nsIScriptableUnicodeConverter);

        converter.charset = "UTF-8";

        let result = {};
        let dummyData = converter.convertToByteArray(data, result);

        let md5 = Components.classes['@mozilla.org/security/hash;1']
            .getService(Components.interfaces.nsICryptoHash);

        md5.init(Components.interfaces.nsICryptoHash.MD5);
        md5.update(dummyData, dummyData.length);
        const hash = md5.finish(false);;

        // 
        const resultedHash = Array.from(hash, (current, index) => toHexString(hash.charCodeAt(index))).join("");
        this._logger.log(`hash: ${resultedHash}`);

        return resultedHash;
    }

    getAccountKeyFromFolder(msgFolder) {
        let result = this.createAccountKey(msgFolder.server);

        return result;
    }

    getInboxZeroFolder(accountKey) {
        let serializedAccounts = this.readPreference('common.inboxZeroAccounts', '');
        let serializedData = this.readPreference('common.inboxZeroPreferences', '');

        let data = serializedData.length > 0 ? JSON.parse(serializedData) : {};

        if (typeof data[accountKey] == 'undefined' || data[accountKey].folderURI == '') {
            this._logger.log('no folder set, get global fallback');
            return MailmindrPreferences.getStringPref('common.inboxZeroLaterFolder');
        }

        return data[accountKey].folderURI || '';
    }

    // 
    // 
    // 
// 
}

function finishMindrAndSetToDone(mindr) {
    _logger.log('all messages for mindr ' + mindr.mailmindrGuid + ' performed.');

    // 
    mindr.performed = true;
    mailmindrKernel.kernel.modules.storage.updateMindr(mindr);
}

function getMessengerWindow() {
    const win = Services.wm.getMostRecentWindow("mail:3pane", true);
    _logger.log(`messenger window - available? ${win}`);
    _logger.log(`messenger window.MailServices: ${win.MailServices}`);
    _logger.log(`messenger window.MailServices.copy: ${win.MailServices.copy}`);

    return win;
}

var mailmindrCore = mailmindrCore || new MailmindrCoreBase();
