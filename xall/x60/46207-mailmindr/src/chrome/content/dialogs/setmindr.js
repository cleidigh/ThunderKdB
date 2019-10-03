/* jshint curly: true, strict: true, moz: true, undef: true, unused: true */
/* global Components, mailmindrLogger, mailmindrSearch */
"use strict";

if (!mailmindr) var mailmindr = {};
if (!mailmindr.dialogs) mailmindr.dialogs = {};
if (!mailmindr.controls) mailmindr.controls = {};

Components.utils.import("resource://mailmindr/legacy/core.jsm");
Components.utils.import("resource://mailmindr/legacy/common.jsm");
Components.utils.import("resource://mailmindr/legacy/logger.jsm");
Components.utils.import("resource://mailmindr/legacy/factory.jsm");
Components.utils.import("resource://mailmindr/legacy/storage.jsm");
Components.utils.import("resource://mailmindr/legacy/search.jsm");
Components.utils.import("resource://mailmindr/kernel.jsm");
Components.utils.import("resource://mailmindr/localisation.jsm");
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://mailmindr/utils.jsm");
// 

mailmindr.dialogs.setmindr = {

    _logger: null,
    _name: "mailmindr.dialogs.setMindr",
    _initialized: false,
    _elements: {},
    _controls: {},
    _options: {},
    _data: {},

    /**
     * onLoad - triggered when editor is loaded
     * @returns Returns always true
     */
    onLoad: function() {
        this.Initialize();


        //return true;
    },

    /**
     * onDialogCancel triggered when the user cancels or closes the dialog
     * @returns result is always true;
     */
    onDialogCancel: function() {
        return true;
    },

    /**
     * initialize dialog - set tags, combobox entries, etc
     */
    Initialize: function() {
        let options;

        if (!this._initialized) {
            try {
                let self = this;

                options = window.arguments[0];

                var settings = mailmindrCore.Settings;

                this._logger = new mailmindrLogger(this);
                this._data = options.data;
                this._options = options;

                this._logger.log('attaching error handler.');
                // 
                this._logger.log('error handler attached.');

                this._logger.log('creating datepicker.');
                // 
                var dtp = document.createElement('datepicker');
                dtp.setAttribute('id', 'mailmindrDatePicker');
                dtp.setAttribute('type', 'popup');
                dtp.setAttribute('firstdayofweek', settings.firstDayOfWeek);

                document.getElementById('mailmindrDatePickerWrapper').appendChild(dtp);
                this._logger.log('datepicker created.');

                this._elements.textMailSubject = document.getElementById("mailmindrMailSubject");
                // 
                
                this._elements.textMailSender = document.getElementById("mailmindrMailSender");
                
                this._elements.timespans = document.getElementById("mailmindrTimespans");
                //this._elements.datePicker = document.getElementById("mailmindrDatePicker");
                this._elements.datePicker = dtp;
                this._elements.timePicker = document.getElementById("mailmindrTimePicker");

                this._logger.log('check if datepicker and timepicker are created');
                this._logger.log(`datetpicker (should be XUL element: ${this._elements.datePicker})`);
                this._logger.log(`timepicker (should be XUL element: ${this._elements.timePicker})`);
                this._logger.log('check for datepicker and timepicker done.');


                this._elements.actionPicker = document.getElementById("mailmindrActionPicker");
                this._elements.buttonAccept = document.documentElement.getButton("accept");
                this._elements.doSetReminder = document.getElementById("mailmindrDoSetReminder");
                this._elements.noteTextBox = document.getElementById('mailmindrNotes');

                this._logger.log('creating timepicker.');
                // 
                this._controls.timespans = new mailmindr.controls.TimespanPicker(
                    this._elements.timespans,
                    this._elements.datePicker,
                    this._elements.timePicker, {
                        canBeUserDefined: true
                    }
                );
                this._logger.log('timepicker created.');

                this._logger.log('creating actionpicker.');
                this._controls.actions = new mailmindr.controls.ActionPicker(
                    this._elements.actionPicker
                );
                this._logger.log('actionpicker craeted.');

                this._logger.log('set mindr :: type:     ' + typeof this._data.mindr);
                this._logger.log('set mindr :: timespan: ' + this._data.selectedTimespan);
                this._logger.log('set mindr :: action:   ' + this._data.selectedAction);

                let hasMindr = this._hasMindr();
                this._controls.actions.Enabled = hasMindr ? 'true' : 'false';

                // 
                if (this._data.selectedTimespan === null) {
                    this._logger.log('NO timespan is selected.')
                    if (!this._hasMindr()) {
                        //
                        // 
                        //
                        this._logger.log('mindr is NOT SET');
                        this._elements.timespans.value = "1;0;0;false";
                        this._elements.doSetReminder.setAttribute(
                            "checked",
                            mailmindrCore.getPreferenceBool("common.showAlertDialog") ? "true" : "false"
                        );
                        this._elements.noteTextBox.value = '';
                    } else if (this._hasMindr()) {
                        //
                        // 
                        //
                        this._logger.log('mindr IS ALREADY SET (modifying the old one)');
                        this._logger.log('doShowDialog: ' + this._data.mindr.doShowDialog);
                        this._controls.actions.Action = this._data.mindr;
                        this._elements.timespans.value = "-1;-1;-1;false";
                        this._controls.timespans.setDateTime(new Date(this._data.mindr.remindat));
                        this._elements.doSetReminder.setAttribute(
                            "checked",
                            this._data.mindr.doShowDialog ? "true" : "false"
                        );
                        this._elements.noteTextBox.value = this._data.mindr.details.note;
                    }
                }else {
                    this._logger.log('timespan IS SET');
                    if (!this._hasMindr()) {
                        this._logger.log('NO MINDR is set');
                        const checked = MailmindrPreferences.getBoolPref('common.showAlertDialog');
                        this._elements.doSetReminder.setAttribute(
                            "checked",
                            checked
                        );
                        this._controls.actions.Action = this._data.selectedAction;
                    }

                    this._elements.timespans.value = this._data.selectedTimespan;
                    if (this._elements.timespans.selectedIndex < 0) {
                        // 
                        this._elements.timespans.value = "-1;-1;-1;false";
                        this._controls.timespans.setTimespan(
                            this._data.selectedTimespan,
                            this._elements.timePicker,
                            this._elements.datePicker);
                    }
                }

                this.setEventListeners();

                if (!hasMindr) {
                    this._elements.textMailSubject.textContent = this._data.selectedMail.mime2DecodedSubject;
                    this._elements.textMailSender.textContent = this._data.selectedMail.mime2DecodedAuthor;
                } else {
                    this._elements.textMailSubject.textContent = this._data.mindr.details.subject;
                    this._elements.textMailSender.textContent = this._data.mindr.details.author;
                }

                /* check if we have inbox zero support, so we can't move/copy mails */
                this._logger.log('check account/folder for selected mail');
                let key = mailmindrCore.getAccountKeyFromFolder(this._data.selectedMail.folder) || 'mailmindr:global';
                let folder = mailmindrCore.getInboxZeroFolder(key);
                this._logger.log(`account key: ${key} which is mapped to folder: ${folder}`);

                if (folder === '' && key !== 'mailmindr:global') {
                    // 
                    this._logger.log(`checking for global fallback 'mailmindr:global'`);
                    folder = mailmindrCore.getInboxZeroFolder('mailmindr:global');
                    this._logger.log(`~> fallback for 'mailmindr:global' is ${folder}`);
                }

                this.inboxZeroLaterFolder = folder
                this.enableInboxZero = this.inboxZeroLaterFolder != '';

                let notifyMsg = document.getElementById("mailmindrInboxZeroActiveNotificationMessage");
                if (this.enableInboxZero) {
                    let messageIdentifier = "mailmindr.dialog.setmindr.inboxzero.notificationmessage";
                    let information = mailmindrI18n.getString(messageIdentifier);
                    let folder = getFolder(this.inboxZeroLaterFolder);
                    let localJson = [
                        [
                            'strong', 
                            {}, 
                            mailmindrI18n.getString('mailmindr.dialog.setmindr.inboxzero.notificationmessage.label'),
                            ' '
                        ],
                        [
                            'span', 
                            {}, 
                            mailmindrI18n.getString('mailmindr.dialog.setmindr.inboxzero.notificationmessage.link_before'),
                            ' '
                        ],
                        [
                            'a', 
                            {
                                'style':  'text-decoration: underline; cursor: pointer;',
                                'onclick': function() { self.openFolderTab(folder); return false; }
                            },
                            folder.prettyName
                        ],
                        [
                            'span',
                            {},
                            mailmindrI18n.getString('mailmindr.dialog.setmindr.inboxzero.notificationmessage.link_after')
                        ]
                    ];

                    let localNodes = {};
                    let localParsedElement = mailmindrKernel.kernel.modules.common.jsonToDom(localJson, document, localNodes);
                    notifyMsg.appendChild(localParsedElement);
                    notifyMsg.setAttribute("hidden", "false");
                } else {
                    notifyMsg.setAttribute("hidden", "true");
                }

                this._initialized = true;
            } catch (initializeException) {
                this._logger.error(initializeException);
            }

            this.resize();
        }

    },

    resize: function() {
        // 
        window.width = 300;
    },

    /**
     * setEventListeners - set the listeners for the timespan/action picker(s)
     */
    setEventListeners: function() {
        let scope = this;

        this._controls.timespans.addEventListener('selectTimespan', function(datetime) {
            scope.onSelectTimespan(scope, datetime);
        });

        this._controls.actions.addEventListener('selectAction', function(action) {
            scope.onSelectAction(scope, action);
        });
    },


    /**
	* get action object from the values of the controls in dialog
	
	getAction: function()
	{
		let action = mailmindrFactory.createActionTemplate();
--
		action.doTagWith = this._elements.checkTagAction.getAttribute("checked") ? this._elements.tags.value : false;
		action.targetFolder = this._elements.checkFolderAction.getAttribute("checked") ? this._elements.folders.value : '';
		action.doMoveOrCopy = this._elements.checkFolderAction.getAttribute("checked") ? (this._elements.radioDoMove.getAttribute("selected") ? 1 : this._elements.radioDoCopy.getAttribute("selected") ? 2 : 0) : 0;
		action.doShowDialog = this._elements.checkDoShowDialog.getAttribute("checked") ? true : false;
		action.doMarkAsUnread = this._elements.checkDoMarkAsUnread.getAttribute("checked") ? true : false;
		action.doMarkFlag = this._elements.checkDoMarkFlag.getAttribute("checked") ? true : false;
--
		return action;
	},
	*/


    /**
     * onSelectTimespan - triggered when a timespan is selected
     */
    onSelectTimespan: function(target, datetime) {
        let pickedTime = datetime.valueOf();
        let disabled = pickedTime + 60 * 1000 < Date.now();

        target._elements.buttonAccept.disabled = disabled;
    },


    onSelectAction: function(target, action) {
        target._elements.doSetReminder.disabled = action.doShowDialog;
        if (action.doShowDialog) {
            target._elements.doSetReminder.checked = true;
        }

        // 
        let disabled = ((action.doMoveOrCopy != 0) && this.enableInboxZero);
        target._elements.buttonAccept.disabled = disabled;
    },


    /**
     * onDialogAccept
     * @returns Returns always true
     * */
    onDialogAccept: function() {
        try {
            this._createMindr().then(mindr => {
                // 
                // 
                // 
                // 
                // 

                // 
                var serializedMindr = JSON.stringify({ mailmindrGuid : mindr.mailmindrGuid });
                this._persistMindr(mindr, function () {
                    Services.obs.notifyObservers(null, "mailmindr-setMindr-success", serializedMindr);
                });

                this._logger.log('dialog::setMindr closing / notifying observers');
            })
        } catch (onDialogAcceptException) {
            this._logger.error('cannot save/update mindr');
            this._logger.error(onDialogAcceptException);
            return false;
        }
        
        return true;
    },


    /**
     * _createMindr - Create mindr for selected mail with the selected action and timespan
     * @returns mindr
     */
    _createMindr: function() {
        return new Promise((resolve, reject) => {
            let mindr = null;
            if (this._hasMindr()) {
                // 
                let dummy = this._data.mindr;
                let action = this._controls.actions.Action;
                if (this._controls.actions.Enabled) {
                    this._logger.log('UPDATE mindr set action');
                    mindr = action.copyTo(dummy);
                } else {
                    this._logger.log('NOTUPDATING mindr');
                    mindr = dummy;
                }
            } else {
                // 
                mindr = mailmindrCore.createMindrWithAction(this._controls.actions.Action);
                mindr.mailguid = this._data.selectedMail.messageId;
                mindr.details.subject = this._data.selectedMail.mime2DecodedSubject;
                mindr.details.author = this._data.selectedMail.mime2DecodedAuthor;
                mindr.details.recipients = this._data.selectedMail.recipients;
            }

            mindr.DateTime = this._controls.timespans.dateValue;
            mindr.details.note = this._elements.noteTextBox.value;

            // 
            mindr.doShowDialog = this._elements.doSetReminder.checked;

            resolve(mindr);
        });
    },

    _persistMindr: function(mindr, onSuccess, onFailure) {
        if (this._hasMindr()) {
            this._logger.log('UPDATE mindr');
            if (mailmindrStorage.updateMindr(mindr)) {
                this._logger.log('call OBSERVER #1');
                onSuccess(mindr);
            }
        } else {
            if (this.enableInboxZero) {
                mindr.originFolderURI = this._data.selectedMail.folder.folderURL;
            }

            this._logger.log('SAVE mindr');
            if (mailmindrStorage.saveMindr(mindr)) {
                // 
                if (!this.enableInboxZero) {
                    this._logger.log('Inbox Zero is DISABLED.');
                    onSuccess(mindr);
                } else {
                    try {
                        this._logger.log(`Inbox Zero is ENABLED, w/ data: ${this._data.selectedMail} and ${this.inboxZeroLaterFolder}`);
                        let message = this._data.selectedMail;
                        this.moveMailToInboxZeroLaterFolder(
                                mindr, 
                                message, 
                                this.inboxZeroLaterFolder, 
                                onSuccess
                            );
                    } catch (exc) {
                        this._logger.log('setMindr._persistMindr > moving the mail failed, because: ' + exc);
                        this._logger.error(exc);
                    }
                } // -- move mail when mindr is set
            }
        }
    },

    _hasMindr: function() {
        return (typeof this._data.mindr != 'undefined' && this._data.mindr != null);
    },

    moveMailToInboxZeroLaterFolder: function(mindr, message, targetFolderURI, onSuccess) {
        let folderURI = targetFolderURI;
        let sourceURI = message.folder.URI;

        this._logger.log(' copy from :: ' + sourceURI);
        this._logger.log(' copy to   :: ' + folderURI);

        if (sourceURI == folderURI) {
            this._logger.log('Destination and source folder is equal - cancel copy.');
            onSuccess();
            return;
        }

        let headers = Components.classes["@mozilla.org/array;1"]
            .createInstance(Components.interfaces.nsIMutableArray);

        headers.appendElement(message, false);

        let copyService = Components.classes["@mozilla.org/messenger/messagecopyservice;1"]
            .getService(Components.interfaces.nsIMsgCopyService);

        let srcFolder = getFolder(sourceURI);
        let destFolder = getFolder(folderURI);

        let self = this;
        
        // 
        var threePaneWindow = mailmindrKernel.kernel.modules.common.getWindow("mail:3pane").msgWindow; 
        if (!threePaneWindow) {
            this._logger.error("threePane: " + threePaneWindow);
            this._logger.error("module:    " + mailmindrKernel.modules.common);
            return false;
        }   
        
        copyService.CopyMessages(
            srcFolder,
            headers,
            destFolder,
            true, // -- move
            {
                OnStartCopy: function() {},
                OnProgress: function(aProgress, aProgressMax) {},
                SetMessageKey: function(aKey) {},
                SetMessageId: function(aMessageId) {},
                OnStopCopy: function(aStatus) {
                    // 
                    try {
                        self._logger.log('releasing DBs');
                        srcFolder.msgDatabase = null;
                        destFolder.msgDatabase = null;
                        //mindr.resetDetails();
                        onSuccess();
                    } catch (cbFailed) {
                        self._logger.log('error on setMindr callback');
                        self._logger.error(cbFailed);
                    }
                    self._logger.log('moved source mail to inbox zero folder.');
                }
            }, // -- copy listener
            threePaneWindow, // -- main window 
            threePaneWindow ? true : false // -- w/ undo
        );
    },

    openFolderTab: function(msgFolder) {
        window.openDialog("chrome://messenger/content/", 
                "_blank",
                "chrome,all,dialog=no", 
                msgFolder.URI
            );
    }
}

window.addEventListener("load", function() {
    mailmindr.dialogs.setmindr.onLoad();
}, false);