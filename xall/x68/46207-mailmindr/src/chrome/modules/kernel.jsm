/* jshint curly: true, strict: true, multistr: true, moz: true, undef: true, unused: true */
/* global Components, mailmindrLogger, mailmindrSearch */
'use strict';

if (Ci === undefined) var Ci = Components.interfaces;
if (Cc === undefined) var Cc = Components.classes;

var { MailServices } = ChromeUtils.import(
    'resource:///modules/MailServices.jsm'
);
var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');

var { mailmindrLogger, mailmindrInitializeLogger } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/logger.jsm'
);
var { mailmindrStorage } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/storage.jsm'
);
var { mailmindrFactory } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/factory.jsm'
);
var { mailmindrCommon } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/common.jsm'
);
var { executeMindrInWindow, getMessengerWindow } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/executor.jsm'
);
var { Enumerable } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/linq.jsm'
);

let EXPORTED_SYMBOLS = ['mailmindrKernel'];

/* mailmindr constants */
const MAILMINDR_GLOBAL_INTERVAL = 5000;
const TYPE_REPEATING_PRECISE =
    Components.interfaces.nsITimer.TYPE_REPEATING_PRECISE;
const TYPE_REPEATING_SLACK =
    Components.interfaces.nsITimer.TYPE_REPEATING_SLACK;

const timer = Components.classes['@mozilla.org/timer;1'].createInstance(
    Components.interfaces.nsITimer
);

class MailmindrKernelBase {
    constructor() {
        'use strict';

        this._name = 'mailmindrKernel';
        this._logger = new mailmindrLogger(this);
        this._mindrs = [];

        this.data = {
            mindrsInDialog: [],
            mindrExecutionQueue: []
        };

        let self = this;

        this.initialize = function() {
            'use strict';
            if (self._isInitialized) {
                self._logger.log('-- already initialized --');
                return;
            }

            self.setGlobalListeners();

            const observer = {
                observe: (topic, subject, data) => {
                    const unwrappedData = JSON.parse(data);

                    switch (subject) {
                        case 'mailmindr-storemindr-success':
                            this.injectExistingMindr(unwrappedData);
                            break;
                    }
                }
            };

            Services.obs.addObserver(
                observer,
                'mailmindr-storemindr-success',
                false
            );

            ///
            /// set up modules
            ///
            self.modules = {
                factory: mailmindrFactory,
                storage: mailmindrStorage,
                common: mailmindrCommon
                // 
            };

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

            self._logger.log('------- MailmindrKernel initialized -------');

            self._isInitialized = true;
        };

        this.initialize();

        // 
        // 
        timer.initWithCallback(this, 5 * 1000, timer.TYPE_REPEATING_SLACK);
    }

    notify() {
        this.onTick();
    }

    /**
     * setGlobalListeners - set all global listeners that should be
     * registered just once
     */
    setGlobalListeners() {
        ///
        /// set listener for incoming mail
        ///
        const incomingMailListener = {
            msgAdded: msgHeader => {
                if (!msgHeader.isRead) {
                    this._logger.log('call ***NEW*** msgAdded()');
                    this.onIncomingMail(msgHeader);
                }
            }
        };

        const notificationService = Components.classes[
            '@mozilla.org/messenger/msgnotificationservice;1'
        ].getService(Components.interfaces.nsIMsgFolderNotificationService);

        notificationService.addListener(
            incomingMailListener,
            notificationService.msgAdded
        );
    }

    /**
     * getMessageIdsWaitingForReply - gets all messageids for outgoing mails with a mindr
     */
    getMessageIdsWaitingForReply(mindrs) {
        this._logger.log(
            'call getMessageIdsWaitingForReply(' + mindrs.length + ')'
        );
        const result = mindrs
            .filter(mindr => mindr.waitForReply)
            .map(mindr => mindr.mailguid);

        this._logger.log('getMessageIdsWaitingForReply -> ' + result.length);
        this._logger.log('reply: ' + this._logger.explode(result));

        return result;
    }

    /**
     * onIncomingMail - will be troggered when a new e-mail comes in
     * @param aMsgHdr The headers for the new mail
     */
    onIncomingMail(aMsgHdr) {
        function* range(begin, end) {
            for (let i = begin; i < end; ++i) {
                yield i;
            }
        }

        this._logger.log('call onIncomingMail( ' + typeof aMsgHdr + ' )');

        let pendingList = this.currentMindrs;

        const msgId = aMsgHdr.messageId;
        const waitingMessages = this.getMessageIdsWaitingForReply(pendingList);

        if (waitingMessages.length === 0) {
            this._logger.log(`no messages waiting for reply`);
            return;
        }

        this._logger.log(' #> try getting references');
        const refCount = aMsgHdr.numReferences;
        this._logger.log(' #> (ok)');

        if (refCount === 0) {
            //
            // 
            //

            this._logger.log('## message has no references');
            return;

            // 

            /*
             * TODO: get feedback from users - if reference stuff won't work,
             * check
             * - subjects
             * - X-Reply-To
             */
        }

        // 
        // 
        // 
        // 
        // 
        // 

        // 

        this._logger.log('   refCount: ' + refCount);

        // 
        let references = [];
        try {
            if (aMsgHdr.numReferences > 0) {
                for (
                    let index = 0;
                    index < aMsgHdr.numReferences;
                    index = references.push(aMsgHdr.getStringReference(index))
                );
            } else {
                this._logger.log('no references');
            }
        } catch (referenceException) {
            this._logger.error('cannot get reference(s)');
            this._logger.error(referenceException);
        }

        this._logger.log('found # references: ' + references.length);
        try {
            references.forEach(reference => {
                this._logger.log(
                    '  #> searching for reference "' + reference + '"'
                );

                const index = waitingMessages.indexOf(reference);

                if (index < 0) {
                    this._logger.log(
                        `#> no mindr found for reference ${reference}`
                    );
                    return;
                }

                this._logger.log('  #> reference found.');

                try {
                    const mindr = pendingList.find(
                        item => item.mailguid === reference
                    );

                    if (!mindr) {
                        this._logger.log('no mindr found for ' + reference);

                        return;
                    }

                    mindr.IsReplyAvailable = true;

                    const reply = mailmindrKernel.kernel.modules.factory.createReplyObject();
                    reply.mailguid = msgId;
                    reply.replyForMindrGuid = mindr.mailmindrGuid;
                    reply.receivedAt = aMsgHdr.dateInSeconds;
                    reply.sender = aMsgHdr.mime2DecodedAuthor;
                    reply.recipients = aMsgHdr.recipients;

                    this._logger.log('reference found. created reply: ');
                    this._logger.log(' ' + this._logger.explode(reply));
                    this._logger.log('reply exploded.');

                    mailmindrKernel.kernel.modules.storage.saveReply(reply);

                    this.deleteMindr(mindr);
                } catch (ex) {
                    this._logger.error('+>');
                    this._logger.error(ex);
                }
            }); // -- end for
        } catch (iterex) {
            this._logger.error('iteration failed.');
            this._logger.error(iterex);
        }
    }

    /**
     * refreshMindrsFromStorage - loads all active mindrs from storage
     * filter them by active and pending mindrs and push then into the
     * execution queue
     */
    refreshMindrsFromStorage() {}

    globalUiErrorHandler(whatLogger, whatError) {
        whatLogger.error(whatError);
    }

    attachWindowGlobalUiErrorHandler(whatWindow, whatLogger) {
        let self = this;
        whatWindow.onerror = function(e) {
            self.globalUiErrorHandler(whatLogger, e);
        };
    }

    /**
     * serializeMindr - serializes a mindr object to a json string
     */
    serializeMindr(aMindr) {
        return JSON.stringify(aMindr);
    }

    isMindrInList(list, mindr) {
        return (
            Array.from(list).find(
                item => item.mailmindrGuid === mindr.mailmindrGuid
            ) !== undefined
        );

        // 
        // 
        // 
        // 
        // 
        // 
        // 

        // 
    }

    injectExistingMindr(mindr) {
        const { mailmindrGuid } = mindr;
        const mindrList = this._mindrs;

        this._mindrs = [
            ...mindrList.filter(item => item.mailmindrGuid !== mailmindrGuid),
            mindr
        ];

        return this._mindrs;
    }

    reloadMindrFromStorage() {
        this._logger.log('reload mindrs from storage');
        const list = mailmindrKernel.kernel.modules.storage.loadMindrs();
        let livingMindrs = [];

        while (list.length > 0) {
            let mindr = list.pop();
            let foundMindr = this.getMindrByGuid(
                this._mindrs,
                mindr.mailmindrGuid
            );

            // 
            if (foundMindr != null) {
                //this._logger.log('       already in list: ' + foundMindr.mailmindrGuid + ' w/ : ' + new Date(foundMindr.remindat));
                livingMindrs.push(foundMindr);
            } else {
                this._logger.log(
                    '       push to living mindrs list:    ' +
                        mindr.mailmindrGuid
                );
                livingMindrs.push(mindr);
            }
        }

        // 

        return livingMindrs;
    }

    /**
     * getMindrByGuid - gets the mindr for the given MINDR id
     * @param array mindrs The list of active mindrs
     * @param String mindrs' GUID we look for
     * @returns Object Returns the mindr for the message id or null, if no such mindr can be found
     */
    getMindrByGuid(mindrs, mailmindrGuid) {
        return (
            Array.from(mindrs).find(
                item => item.mailmindrGuid === mailmindrGuid
            ) || null
        );
    }

    get currentMindrs() {
        if (this._mindrs.length > 0) {
            this._logger.log('> currentMindrs: ' + this._mindrs.length);
            return this._mindrs;
        }

        this._logger.log(`seems like no mindrs are stored. Force reload.`);

        // 
        return (this._mindrs = this.reloadMindrFromStorage());
    }

    updateMindr(mindr) {
        const currentList = [];
        let updated = false;

        this.modules.storage.updateMindr(mindr);

        (this._mindrs || []).forEach(item => {
            if (item.mailmindrGuid === mindr.mailmindrGuid) {
                currentList.push(mindr);
                updated = true;
                // 
            } else {
                currentList.push(item);
                // 
            }
        });

        if (!updated) {
            currentList.push(mindr);
            // 
        }

        this._mindrs = currentList;

        return currentList;
    }

    deleteMindr(mindr) {
        this._logger.log('deleteMindr: ' + mindr.mailmindrGuid);
        this._logger.log(
            ' > living mindr before deletion: ' + this._mindrs.length
        );
        var serializedMindr = JSON.stringify({
            mailmindrGuid: mindr.mailmindrGuid
        });
        var mindrs = [];
        for (var item of this._mindrs) {
            if (item.mailmindrGuid == mindr.mailmindrGuid) {
                continue;
            }

            mindrs.push(item);
        }
        this._mindrs = mindrs;
        this._logger.log(
            ' > living mindr after deletion: ' + this._mindrs.length
        );

        this.modules.storage.deleteMindr(mindr);
        Services.obs.notifyObservers(
            null,
            'mailmindr-deletemindr-success',
            serializedMindr
        );
    }

    addMindrToDialog(mindr) {
        // 
        if (this.isMindrInDialog(mindr) || !mindr.doShowDialog) {
            this._logger.log(
                '-> must not add ' +
                    mindr.mailmindrGuid +
                    ' to dialog (' +
                    (mindr.doShowDialog
                        ? 'alrady in list'
                        : 'do not show dialog') +
                    ')'
            );
            return false;
        }

        // 
        this._logger.log(
            '-> pushing mindr to the reminder dialog list: ' +
                mindr.mailmindrGuid
        );
        this.data.mindrsInDialog.push(mindr);
        return true;
    }

    // 
    // 
    // 
    // 

    isMindrInDialog(mindr) {
        if (!this.mindrsInDialogAvailable()) {
            this._logger.log('no mindrs in list');
            return false;
        }

        let foundMindrs = this.data.mindrsInDialog.filter(function(mindrOne) {
            let result = mindrOne.mailmindrGuid == mindr.mailmindrGuid;
            return result;
        });

        this._logger.log(
            '- mindrs in dialogs list? ' +
                (foundMindrs != 0 ? 'yes' : 'no') +
                ' ' +
                mindr.mailmindrGuid
        );

        return foundMindrs.length != 0;
    }

    mindrsInDialogAvailable() {
        return this.data.mindrsInDialog.length > 0;
    }

    getMindrsInDialog() {
        this._logger.log(
            'return # list of mindrs: ' + this.data.mindrsInDialog.length
        );
        return this.data.mindrsInDialog;
    }

    removeMindrFromDialog(mindr) {
        this._logger.log(
            'remove mindr from dialog list: ' + mindr.mailmindrGuid
        );
        if (!this.isMindrInDialog(mindr)) {
            return;
        }

        this.data.mindrsInDialog = this.data.mindrsInDialog.filter(function(
            mindrOne
        ) {
            return mindrOne.mailmindrGuid != mindr.mailmindrGuid;
        });
    }

    /**
     * getMindrs - gets mindrs within the absolute timestamps absMin and absMax
     */
    getMindrs(mindrs, absMin, absMax) {
        let pending = new Array();
        if (absMax && absMin >= absMax) {
            return pending;
        }

        // 
        // 
        // 

        for (var idx = 0; idx < mindrs.length; idx++) {
            var evt = mindrs[idx];
            const isDateInFuture = evt.remindat >= absMin;
            const isDateInRange = absMax === undefined || evt.remindat < absMax;
            const hasId = evt.id > 0;
            const dateString = new Date(evt.remindat).toLocaleString();

            if (isDateInFuture && isDateInRange && hasId) {
                pending.push(evt);
            }
        }
        return pending;
    }

    onTick() {
        this._count += 1;

        // 
        // 
        // 
        // 

        const _mindrs = this.currentMindrs;

        const activeMindrs = this.getMindrs(_mindrs, 0, Date.now()); // + MAILMINDR_TIMESPAN_MINUTE);
        const pendingMindrs = this.getMindrs(_mindrs, Date.now());

        // 
        // 
        // 

        // 
        // 
        let showActiveMindrs = false;

        // 
        // 
        activeMindrs.forEach(mindr => {
            if (this.addMindrToDialog(mindr)) {
                showActiveMindrs = true;
            }
            // 

            // 
            // 
            // 

            // 
            // 
            // 
            // 
        });

        if (showActiveMindrs) {
            // 
            this.showMindrAlert(this.getMindrsInDialog());
        }

        // 
        // 
        activeMindrs.forEach(mindr => {
            this._logger.log(
                `pre-push mindr for queue: ${mindr.mailmindrGuid}`
            );

            this.queueMindrForExecution(mindr);
            // 
        });

        // 
        const notificationPayload = {
            active: activeMindrs,
            pending: pendingMindrs
        };

        Services.obs.notifyObservers(
            null,
            'mailmindr-heartbeat',
            JSON.stringify(notificationPayload)
        );
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
            this._logger.log(
                `mindr from queue, ready for execution: '${mindr.mailmindrGuid}' w/ '${mindr.mailguid}'`
            );
            // 
            const success = await executeMindrInWindow(mindr, toBeDeleted =>
                this.deleteMindr(toBeDeleted)
            );

            return success;
        }

        this._logger.log('queue empty');
    }

    showMindrAlert(mindrs) {
        let dead = [];
        let scope = this;

        /*
        we assume that all mindrs are active mindrs,
        because we cannot really decide whether a mail
        still exists or not
    */
        let living = mindrs;

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

        if (living.length == 0) {
            return;
        }

        const data = {
            list: living,
            openMessageFunction: this.openMessageInNewWindow,
            // 
            selectMessageFunction: this.selectMessageByMessageHeader,
            sender: this,
            out: null
        };

        const wnd = mailmindrCommon.getWindow('mailmindr:alert');
        let alertDialog;

        if (wnd) {
            this._logger.log('alert window already open, must reload data');
            const listOfGuids = Enumerable.from(mindrs)
                .select(mindr => mindr.mailmindrGuid)
                .toArray();
            const serializedMindrs = JSON.stringify(listOfGuids);

            Services.obs.notifyObservers(
                null,
                'mailmindr-mindrAlert-pushMindrsToDialog',
                serializedMindrs
            );
        } else {
            const mainWindow = getMessengerWindow();
            // 
            // 
            // 
            // 

            alertDialog = mainWindow.openDialog(
                'chrome://mailmindr/content/dialogs/mindrAlert.xul',
                'mindrAlert',
                'chrome, resizeable=true, dependent=true, chrome=yes, centerscreen=yes, width=650, height=300',
                data
            );
        }

        (wnd || alertDialog).focus();
    }

    openMessageInNewWindow(messageHeader) {
        // 
        // 
        // 

        try {
            //MailUtils.openMessageInNewWindow(messageHeader.hdr); //, gFolderDisplay);
            MailUtils.displayMessage(messageHeader.hdr);
        } catch (e) {
            this._logger.error(e);
        }
    }
}

// 
mailmindrInitializeLogger();

// 
if (!mailmindrKernel) var mailmindrKernel = {};
if (!mailmindrKernel.kernel) mailmindrKernel.kernel = new MailmindrKernelBase();
