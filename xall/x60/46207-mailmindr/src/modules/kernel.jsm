/* jshint curly: true, strict: true, multistr: true, moz: true, undef: true, unused: true */
/* global Components, mailmindrLogger, mailmindrSearch */
"use strict";

if (Cu === undefined) var Cu = Components.utils;
if (Ci === undefined) var Ci = Components.interfaces;
if (Cc === undefined) var Cc = Components.classes;

Cu.import("resource:///modules/mailServices.js");
Cu.import("resource://gre/modules/Services.jsm");

Cu.import("resource://mailmindr/legacy/logger.jsm");
Cu.import("resource://mailmindr/legacy/storage.jsm");
Cu.import("resource://mailmindr/legacy/factory.jsm");
Cu.import("resource://mailmindr/legacy/common.jsm");

// 

let EXPORTED_SYMBOLS = ["mailmindrKernel"];

/* mailmindr constants */
const MAILMINDR_GLOBAL_INTERVAL = 5000;
const TYPE_REPEATING_PRECISE = Components.interfaces.nsITimer.TYPE_REPEATING_PRECISE;
const TYPE_REPEATING_SLACK = Components.interfaces.nsITimer.TYPE_REPEATING_SLACK;

class MailmindrKernelBase {
    constructor() 
    {
        "use strict";

        this._name = "mailmindrKernel";
        this._logger = new mailmindrLogger(this);
        this._mindrs = [];

        let self = this;

        this.initialize = function() {
            "use strict";
            if (self._isInitialized) {
                self._logger.log('-- already initialized --');
                return;
            }

            self.setGlobalListeners();

            ///
            /// initialize the timer
            ///

            /*
            let event = {
                notify: function(aTimer) {
                    self.refreshMindrsFromStorage();
                }
            };

            self._timer = Components.classes["@mozilla.org/timer;1"]
                .createInstance(Components.interfaces.nsITimer);
            self._timer.init(event, 3 * 1000, TYPE_REPEATING_SLACK);

            */

            ///
            /// set up modules
            ///
            self.modules = {
                factory : mailmindrFactory,
                storage : mailmindrStorage,
                common  : mailmindrCommon,
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

            //self._logger.log('--- ' + mailmindr.kernel);
            self._logger.log('------- MailmindrKernel initialized -------');
            

            //scope._logger.log('** sysinfo ** running mailmindr on ' + window.navigator);

            self._isInitialized = true;
        }

        this.initialize();
    }

    /**
     * setGlobalListeners - set all global listeners that should be
     * registered just once
     */
    setGlobalListeners() {
        let scope = this;

        ///
        /// set listener for incoming mail
        ///
        let incomingMailListener = {
            msgAdded: function(msgHeader) {
                if (!msgHeader.isRead) {
                    scope._logger.log('call ***NEW*** msgAdded()');
                    scope.onIncomingMail(msgHeader);
                }
            }
        };

        let notificationService = Components.classes["@mozilla.org/messenger/msgnotificationservice;1"]
            .getService(Components.interfaces.nsIMsgFolderNotificationService);

        notificationService.addListener(
            incomingMailListener,
            notificationService.msgAdded
        );
    }

    /**
     * onIncomingMail - will be troggered when a new e-mail comes in
     * @param aMsgHdr The headers for the new mail
     */
    // 
    // 
    // 
    // 
    // 
    // 

    // 
    // 

    /**
     * refreshMindrsFromStorage - loads all active mindrs from storage
     * filter them by active and pending mindrs and push then into the
     * execution queue
     */
    refreshMindrsFromStorage() {

    }

    globalUiErrorHandler(whatLogger, whatError) {
        whatLogger.error(whatError);
    }

    attachWindowGlobalUiErrorHandler(whatWindow, whatLogger) {
        let self = this;
        whatWindow.onerror = function(e) { 
            self.globalUiErrorHandler(whatLogger, e);
        }
    }

    /**
     * serializeMindr - serializes a mindr object to a json string
     */
    serializeMindr(aMindr) {
        return JSON.stringify(aMindr);
    }

    isMindrInList(list, mindr) {
        return Array.from(list).find(item => item.mailmindrGuid === mindr.mailmindrGuid) !== undefined;
        
        // 
        // 
        // 
        // 
        // 
        // 
        // 

        // 
    }

    reloadMindrFromStorage() {
        let list = mailmindrKernel.kernel.modules.storage.loadMindrs();
        let livingMindrs = [];

        while (list.length > 0) {
            let mindr = list.pop();
            let foundMindr = this.getMindrByGuid(this._mindrs, mindr.mailmindrGuid);

            // 
            if (foundMindr != null) {
                //this._logger.log('       already in list: ' + foundMindr.mailmindrGuid + ' w/ : ' + new Date(foundMindr.remindat));
                livingMindrs.push(foundMindr);
            } else {
                this._logger.log('       push to living mindrs list:    ' + mindr.mailmindrGuid);
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
        return Array.from(mindrs).find(item => item.mailmindrGuid === mailmindrGuid) || null;
    }

    addMindrToPendingList(aMindr) {
        this._logger.log('kernel::addMindr: ' + aMindr.mailmindrGuid);
        if (!this.isMindrInList(this._mindrs, aMindr)) {
            this._mindrs.push(aMindr);
        } else {
            this._logger.log('not added: already in list');
        }
    }

    get currentMindrs() {
        if (this._mindrs.length > 0) {
            this._logger.log('> currentMindrs: ' + this._mindrs.length);
            return this._mindrs;
        }

        // 
        return (this._mindrs = this.reloadMindrFromStorage());
    }

    deleteMindr(mindr) {
        this._logger.log('deleteMindr: ' + mindr.mailmindrGuid);
        this._logger.log(' > living mindr before deletion: ' + this._mindrs.length);
        var serializedMindr = JSON.stringify({ mailmindrGuid : mindr.mailmindrGuid });
        var mindrs = [];
        for (var item of this._mindrs) {
            if (item.mailmindrGuid == mindr.mailmindrGuid) {
                continue;
            }

            mindrs.push(item);
        }
        this._mindrs = mindrs;
        this._logger.log(' > living mindr after deletion: ' + this._mindrs.length);

        this.modules.storage.deleteMindr(mindr);
        Services.obs.notifyObservers(null, "mailmindr-deleteMindr-success", serializedMindr);
    }
}

// 
mailmindrInitializeLogger();

// 
if (!mailmindrKernel)    var mailmindrKernel = {};
if (!mailmindrKernel.kernel) mailmindrKernel.kernel = new MailmindrKernelBase();
