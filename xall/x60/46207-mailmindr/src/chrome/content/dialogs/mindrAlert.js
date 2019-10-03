"use strict";

if (!mailmindr) var mailmindr = {};
if (!mailmindr.dialogs) mailmindr.dialogs = {};
if (!mailmindr.controls) mailmindr.controls = {};

Components.utils.import("resource:///modules/MailUtils.js");
Components.utils.import("resource://gre/modules/Services.jsm");

Components.utils.import("resource://mailmindr/legacy/core.jsm");
Components.utils.import("resource://mailmindr/legacy/search.jsm");
Components.utils.import("resource://mailmindr/legacy/common.jsm");
Components.utils.import("resource://mailmindr/legacy/logger.jsm");
Components.utils.import("resource://mailmindr/kernel.jsm");
Components.utils.import("resource://mailmindr/legacy/storage.jsm");
Components.utils.import("resource://mailmindr/linq.jsm");

const MAILMINDR_POSTPONE_MINUTES_DEFAULT = 15;

mailmindr.dialogs.mindralert = {
    _logger: null,
    _name: "mailmindr.dialogs.mindralert",
    _initialized: false,
    _callback: null,
    _elements: {},
    _options: {},
    _data: {},
    _sender: null,
    _openMessageFunction: null,
    _selectMessageFunction: null,

    /**
     * onLoad - triggered when editor is loaded
     * @returns Returns always true
     */
    onLoad: function() {
        this.Initialize();
    },


    /**
     * initialize dialog - set tags, combobox entries, etc
     */
    Initialize: function() {
        if (!this._initialized) {
            var self = this;
            this._elements.listBox = document.getElementById("mailmindr-alert-listbox");
            this._elements.viewButton = document.getElementById("mailmindrViewMessageButton");
            this._elements.dismissMindrButton = document.getElementById("mailmindrDismissMindrButton");
            this._elements.dismissAllMindrButton = document.getElementById("mailmindrDismissAllMindrButton");

            this._logger = new mailmindrLogger(this);
            this._data = window.arguments[0].list;
            this._sender = window.arguments[0].sender;

            this._listView = new MailmindrListView('mindrAlert.js');
            this._elements.listBox.treeBoxObject.view = this._listView;

            this._elements.listBox.treeBoxObject.beginUpdateBatch();
            this._listView.updateItems(this._data);
            /*
            this._listView.clear();
            this._listView.selection.select(-1);

            for each(let mindr in this._data) {
                if ('undefined' != typeof mindr.mailmindrGuid) {
                    this._listView.appendData(mindr);
                }
            }
            */
            this._elements.listBox.treeBoxObject.endUpdateBatch();

            this.setEventListeners();

            this.updateButtonStates();

            this._initialized = true;

            // 
            this._openMessageFunction = self.doOpenMessage;
            this._selectMessageFunction = window.arguments[0].selectMessageFunction;
        }

    },

    /**
     * setEventListeners - set the listeners for the timespan/action picker(s)
     */
    setEventListeners: function() {
        let scope = this;

        this._elements.viewButton.addEventListener('click', function() {
            scope.viewSelectedMessages();
        }, false);

        this._elements.dismissMindrButton.addEventListener('click', function() {
            mailmindrCore.safeCall(scope, scope.dismissMindrForSelectedMessages);
        }, false);

        this._elements.dismissAllMindrButton.addEventListener('click', function() {
            mailmindrCore.safeCall(scope, scope.dismissAllMindrs);
        }, false);

        this._elements.listBox.addEventListener('select', function() {
            scope.updateButtonStates();
        }, false);

        this._elements.listBox.addEventListener('dblclick', function() {
            scope.viewSelectedMessages();
        }, false);

        window.addEventListener('close', function() {
            scope._logger.log('POSTPONED! count: ' + scope._listView.rowCount);
            mailmindrCore.safeCall(scope, scope.postponeAllMindrs);
        }, false);

        ///
        /// set observers
        ///
        var sortMindrsByDueDate = function(mindrA, mindrB) {
            if (mindrA.remindat < mindrB.remindat) {
                return 1;
            } else if (mindrA.remindat > mindrB.remindat) {
                return -1;
            }

            return 0;
        };

        var onPushMindrs = {
            observe : function(aSubject, aTopic, aData) {
                scope._logger.log('-- [observer] -- mindrs pushed to open dialog : ' + aData + ' --');
                var tmp = JSON.parse(aData);
                var mindrs = Enumerable
                    .from(tmp)
                    .select(guid => mailmindrKernel.kernel.modules.storage.findMindrByGuid(guid))
                    .toArray();
                scope._logger.log('pushed mindrs: ' + mindrs);
                for (var m of mindrs) {
                    scope._logger.log('# ' + m.mailmindrGuid + ' // ' + m.details.subject);
                }
                
                scope._elements.listBox.treeBoxObject.beginUpdateBatch();
                // 

                var mindrsToUpdate = Enumerable.from(mindrs).sort(sortMindrsByDueDate).toArray();

                scope._listView.clear();
                scope._listView.updateItems(mindrsToUpdate);
                scope._elements.listBox.treeBoxObject.endUpdateBatch();
            }
        };

        Services.obs.addObserver(onPushMindrs, "mailmindr-mindrAlert-pushMindrsToDialog", false);
    },

    updateButtonStates: function() {
        this._logger.log('IDX:: ' + this._listView.selection.currentIndex);
        let isSelected = this._listView.selection.currentIndex < 0;;
        this._elements.viewButton.disabled = isSelected;
        this._elements.dismissMindrButton.disabled = isSelected;
        this._elements.dismissAllMindrButton.disabled = this._listView.rowCount == 0;
    },

    doOpenMessage: function(messageHeader) {
        let folder = messageHeader.folder;
        // 
        // 

        try {
            MailUtils.displayMessage(messageHeader.hdr);
            //MailUtils.openMessageInNewWindow(messageHeader.hdr); //, gFolderDisplay);
  // 
  // 
  // 
            // 
            // 

            // 
            return;

            // 
            // 
            // 
            // 
        } catch (e) {
            this._logger.error(e);
        }
    },

    /**
     * viewSelectedMessages
     * opens all selected messages - at this time, we have only a single selection,
     * so we can select the message. this function is able to handle multiselection.
     * >> find out how to open in new window >> remove seltype=single from XUL
     */
    viewSelectedMessages: function() {
        let start = new Object();
        let end = new Object();
        let numRanges = this._listView.selection.getRangeCount();

        for (let idx = 0; idx < numRanges; idx++) {
            this._listView.selection.getRangeAt(idx, start, end);
            for (let v = start.value; v <= end.value; v++) {
                let mindr = this._listView.getCellValue(v, -1);
                let msgGuid = mindr.mailguid;

                let messageHeader = mailmindrSearch.getMessageHdrByMessageId(msgGuid);

                if (messageHeader.length == 0) {
                    continue;
                }

                try {
                    //this._selectMessageFunction(messageHeader);
                    this._openMessageFunction.call(this._sender, messageHeader[0]);
                } catch (openMessageException) {
                    this._logger.error(openMessageException);
                }
            }
        }
    },

    postponeAllMindrs: function() {
        /* for each mindr which is already perfomed: set new reminder date */
        /*
            let mindr = this._listView.getCellValue(v, -1);
            let msgGuid = mindr.mailguid;
        */
        this._logger.log('postponing mindrs');
        while (this._listView.rowCount > 0) {
            var mindr = this._listView.getItemAt(0);
            var milliseconds = 60000 * MAILMINDR_POSTPONE_MINUTES_DEFAULT;
            var newTime = new Date(Date.now() + milliseconds); // postpone five minutes

            if (mindr) {
                if (mindr.remindat > Date.now()) {
                    this.postponeMindrRelative(mindr, MAILMINDR_POSTPONE_MINUTES_DEFAULT);
                } else {
                    this.postponeMindrAbsolute(mindr, newTime);                
                }
            } else {
                this._logger.log('there is no mindr');
            }
        }

        mailmindrCore.clearMindrsInDialog();
        this._logger.log('postponing mindrs DONE');
    },

    postponeMindrAbsolute: function(mindr, dateTime) {
        mailmindrCore.postponeMindrAbsolute(mindr, dateTime);
        this._listView.remove(mindr);
    },

    postponeMindrRelative: function(mindr, minutes) {
        mailmindrCore.postponeMindrRelative(mindr, minutes);
        this._listView.remove(mindr);
    },

    dismissAllMindrs: function() {
        this._listView.selection.selectAll();
        this.dismissMindrForSelectedMessages();
    },

    dismissMindrForSelectedMessages: function() {
        let start = new Object();
        let end = new Object();
        let numRanges = this._listView.selection.getRangeCount();
        let lastIndex = -1;

        for (let idx = 0; idx < numRanges; idx++) {
            this._listView.selection.getRangeAt(idx, start, end);
            for (let v = end.value; v >= start.value; v--) {
                let mindr = this._listView.getCellValue(v, -1);

                if (mindr) {
                    mailmindrKernel.kernel.deleteMindr(mindr);
                    mailmindrCore.removeMindrFromDialog(mindr);

                    this._listView.remove(mindr);
                }

                lastIndex = v;
            }
        }

        if (this._listView.rowCount > 0) {
            this._listView.selection.select(lastIndex - 1 < 0 ? 0 : lastIndex - 1);
        }

        this.checkAndClose();
    },


    close: function() {
        window.close();
    },

    checkAndClose: function() {
        if (this._listView.rowCount == 0) {
            this.close();
        }
    },

    /**
     * onDialogAccept
     * @returns Returns always true
     * */
    onDialogAccept: function() {
        mailmindrCore.clearMindrsInDialog();
        return true;
    },

    sortList: function(aColumn, aSortOrder) {
        // 
        // 
    }
}

window.addEventListener("load", function() {
    mailmindr.dialogs.mindralert.onLoad();
}, false);
