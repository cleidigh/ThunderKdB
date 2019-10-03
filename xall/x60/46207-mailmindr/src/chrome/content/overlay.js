/* jshint curly: true, strict: true, multistr: true, moz: true, undef: true, unused: true */
/* global Components, mailmindrLogger, mailmindrSearch */
// 

if (Cu === undefined)  var Cu = Components.utils;
if (Ci === undefined)  var Ci = Components.interfaces;
if (Cc === undefined)  var Cc = Components.classes;

/**
 * @typedef {Object} MindrDetails
 * @property {string} author
 * @property {string} subject
 * @property {string} recipients
 * @property {string} note
 */
/**
 * @typedef {Object} Mindr
 * @property {string} mailguid
 * @property {string} mailmindrGuid
 * @property {boolean} waitForReply
 * @property {number} remindat
 * @property {boolean} performed
 * @property {string} targetFolder
 * @property {boolean} doShowDialog
 * @property {boolean} doMarkAsUnread
 * @property {boolean} doMarkFlag
 * @property {string} doTagWith
 * @property {number} doMoveOrCopy
 * @property {MindrDetails} details
 */

// 
// 
// 
// 
// 
Components.utils.import("resource://gre/modules/Services.jsm");
Components.utils.import("resource://mailmindr/preferences.jsm");
Components.utils.import("resource:///modules/MailUtils.js");
// 
// 
// 
Components.utils.import("resource://mailmindr/legacy/logger.jsm");
// 
Components.utils.import("resource://mailmindr/legacy/core.jsm");
Components.utils.import("resource://mailmindr/kernel.jsm");
Components.utils.import("resource://mailmindr/legacy/common.jsm");
Components.utils.import("resource://mailmindr/legacy/search.jsm");
Components.utils.import("resource://mailmindr/legacy/storage.jsm");
Components.utils.import("resource://mailmindr/linq.jsm");
Components.utils.import("resource://mailmindr/localisation.jsm");
Components.utils.import("resource://mailmindr/stringUtils.jsm");
Components.utils.import("resource://mailmindr/executor.jsm");

if (!mailmindr) var mailmindr = {};
if (!mailmindr.kernel) mailmindr.kernel = [];
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

var mailmindrOverlay = mailmindrOverlay || {};

var mailmindrBase = mailmindrBase || class mailmindrBase {

    // 
    // 

    constructor(window, isBootstrapped) {
        this.MAILMINDR_GLOBAL_INTERVAL = 5000;

        this._targetWindow = window;
        this._name = "overlay";
        this._instanceName = this._name + Math.random();
        this._initialized = false;
        this._isBootstrapped = isBootstrapped;
        this._data = {
            pendingMindrs: []
        // 
        // 
        };
        this._dialogs = {
            setmindr: null,
            mindralert: null
        }
        this._logger = new mailmindrLogger(this, MAILMINDR_LOG_INFO);
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


    initialize() {
        let scope = this;

        this._instanceID = Math.random(7);

        // 

        let s = mailmindrI18n.getString('mailmindr.utils.core.NoName');
        this._logger.log('- i18n');
        this._logger.log(`I18N: ${s}`);

        /*
        * okay, webworkers won't work here.
        * maybe we keep this code and give it another try in next release
        this._service = new Worker("chrome://mailmindr/content/mailmindrWorker.js");
        this._service.addEventListener("message", function onMessage(event) {
                scope.onMessage(event);
            }, false);
        
        this._service.postMessage({});
        */

        this._logger.log('-- waiting for the storage engine to come up --');
        // 
        this._logger.log('-- storage up and running --');
        this._logger.log('** sysinfo ** mailmindr running on: ' + window.navigator.userAgent);

        this._logger.log('reading preferences');
        // 
        this._logger.log('done reading preferences');

        // 
        this.createUI();

        // 
        this.uxSetup();

        // 
        this._reloadMindrs();
        this.setListeners();

        if (this.hasPendingMindrList) {
            try {
                this._viewPendingMindrs = new MailmindrListView();
                this._elements.pendingList.treeBoxObject.view = this._viewPendingMindrs;
                
                // 
                const columnName = MailmindrPreferences.getStringPref('sorting.overlay.pendingList.columnName');
                const sortOrder = MailmindrPreferences.getStringPref('sorting.overlay.pendingList.order');
                const sortColumn = document.getElementById(columnName);
                
                this.sortList(this._elements.pendingList, sortColumn, sortOrder);
            } catch (x) {
                this._logger.error('--->');
                this._logger.error(x);
            }
        }

        this._logger.log("******* mailmindr successfully initialized the messagewindow *******");

        // 

        this._initialized = true;
    }

    get hasPendingMindrList() {
        return Boolean(document.getElementById("mailmindrPendingList"));
    }

    get isMessageWindow() {
        return Boolean(window.location.href.indexOf('/messageWindow.xul') > 0);
    }

    createUI() {
        if (this.hasPendingMindrList) {
            this._elements = this._elements || {};
            // 
            this._elements.pendingList = document.getElementById("mailmindrPendingList");
            this._elements.list = document.getElementById("mailmindrReplies");
            this._elements.buttonEdit = document.getElementById("mailmindrPendingMindrEditButton");
            this._elements.buttonView = document.getElementById("mailmindrPendingMindrViewButton");
            this._elements.buttonDelete = document.getElementById("mailmindrPendingMindrDeleteButton");
        }
    }

    /**
     * uxSetup - will set all UI elements / initialize with settings
     */
    uxSetup() {
        if (this.hasPendingMindrList) {
            const pendingListSetting = MailmindrPreferences.getIntPref("common.uiShowPendingList");
            let pendingListIsHidden = false;
            switch (pendingListSetting) {
                case 0: // -- show never
                    pendingListIsHidden = true;
                    break;
                case 1: // -- show always
                    pendingListIsHidden = false;
                    break;
                default:
                    pendingListIsHidden = false;
            }
            this._elements.list.setAttribute("hidden", pendingListIsHidden);
        }

        // 
        // 

        // 
        if (MailmindrPreferences.getBoolPref("common.updated")) {
            // 
        }

        this.createButtonInMailHeaderView();
    }

    createButtonInMailHeaderView() {
        // 
        // 
        // 
        const toolbox = document.getElementById('header-view-toolbox');
        if (toolbox) {
            this._logger.log('UI setup :: create button');
            const palette = toolbox.palette;
            const button = document.createElement('toolbarbutton');
            const mailmindrButtonId = 'MAILMINDR_SET_MINDR_BTN';

            const label = mailmindrI18n.getString('mailmindr.message.header.view.button.label.add');
            const tooltip = mailmindrI18n.getString('mailmindr.message.header.view.button.tooltip');

            button.setAttribute("id", mailmindrButtonId); // BUTTON_ID);
            button.setAttribute("label", label);
            button.setAttribute("tooltiptext", tooltip);
            button.setAttribute("class", "toolbarbutton-1 msgHeaderView-button");
            // 
            button.addEventListener("command", () => this.doCommandButtonMailHeaderView(), false);

            this._logger.log('UI setup :: appending button');
            palette.appendChild(button);

            const toolbar = document.getElementById('header-view-toolbar');

            toolbar.insertItem(mailmindrButtonId, null);

        } else {
            this._logger.log('UI setup failed: cannot determine toolbox');
        }
    }

    doCommandButtonMailHeaderView() {
        const msgHdr = gFolderDisplay.selectedMessage;
    
        this.doSetMindrForMsg(msgHdr);
    }

    refreshPendingList() {
        // 
        var _mindrs = this._reloadMindrs();

        // 
        this._data.pendingList = _mindrs;

        // 
        let selectedMindrId = this._viewPendingMindrs.getSelectedMindrGuid();

        // 
        //--this._elements.pendingList.treeBoxObject.beginUpdateBatch();

        //--this._viewPendingMindrs.clear();

        let selectedMindrInList = false;
        let activeMindrs = [];
        let listed = [];

        // 
        // 
        _mindrs.forEach(mindr => {
            if (mindr.RemainingMilliseconds > 0) {
                // 
                //--this._viewPendingMindrs.appendData(mindr);
                mindr._details.author = mindr._details.author; //+ this._instanceID;

                listed.push(mindr);
                selectedMindrInList = selectedMindrInList ||  (mindr.mailmindrGuid == selectedMindrId);
            } else {
                activeMindrs.push(mindr);
            }
        });

        this._elements.pendingList.treeBoxObject.beginUpdateBatch();
        this._viewPendingMindrs.updateItems(listed);
        this._elements.pendingList.treeBoxObject.endUpdateBatch();

        var sortOrder = this._elements.pendingList.getAttribute("sortDirection");
        var sortColumn;
        this.sortPendingList(sortColumn, sortOrder);

        // 
        //--this._elements.pendingList.treeBoxObject.endUpdateBatch();

        // 
        // 
        // 
        /*--
        if (selectedMindrInList) {
            this._viewPendingMindrs.selectMindrByGuid(selectedMindrId);
        } else {
            this._viewPendingMindrs.selection.select(-1);
        }
        --*/
    }


    setListeners() {
        var scope = this;

        /*-- >> kernel
        ///
        /// set listener for incoming mail
        ///
        let incomingMailListener = {
            msgAdded: function(msgHeader) {
                if (!msgHeader.isRead) {
                    scope._logger.log('call msgAdded()');
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
        --*/


        ///
        /// set listener for msg selection
        ///
        const threadTree = document.getElementById("threadTree");
        if (threadTree) {
            threadTree.addEventListener('select', (event) => {
                this.onSelectMessage(event);
            }, false);
        } else {
            this._logger.warn('setListeners: #threadTree not found, setting via gListeners');
            try {
                gMessageListeners.push({
                    onBeforeShowHeaderPane: () => {},
                    onStartHeaders: function () {},
                    onEndHeaders: () => this.onSelectMessage(undefined),
                    // 
                        // 
                        // 
                        // 
                    // 
                    onEndAttachments: function () {},
                });
            } catch (e) {
                this._logger.error(e);
            }
        }


        ///
        /// set listener for pending mindr list and its buttons
        ///
        if (this.hasPendingMindrList) {
            this._elements.pendingList.addEventListener('select', (event) => {
                this.onSelectPendingMindr(event);
            }, false);
            this._elements.buttonView.addEventListener('click', (event) => {
                this.onClickMailmindrViewMail();
            }, false);
            this._elements.buttonDelete.addEventListener('click', (event) => {
                this.onClickMailmindrDeleteMindr();
            }, false);
            this._elements.buttonEdit.addEventListener('click', (event) => {
                this.onClickMailmindrEditMindr();
            }, false);

            this._elements.pendingList.addEventListener('dblclick', () => {
                this.onClickMailmindrViewMail();
            }, false);


            ///
            /// set observers for refreshing the pending mindr list
            ///
            var setMindrSuccessObserver = {
                observe : function(aSubject, aTopic, aData) {
                    scope._logger.log('-- [observer] -- new mindr set : ' + aData + ' --');
                    var tmp = JSON.parse(aData);
                    var newMindr = mailmindrKernel.kernel.modules.storage.findMindrByGuid(tmp.mailmindrGuid);
                    if (!newMindr) { scope._logger.log('cannot find mindr for: ' + tmp.mailmindrGuid); return; }
                    mailmindrKernel.kernel.addMindrToPendingList(newMindr);
                    scope._reloadMindrs();
                    scope.refreshPendingList();
                }
            };

            var setMindrDeleteSuccessObserver = {
                observe : function(aSubject, aTopic, aData) {
                    scope._logger.log('-- [observer] -- mindr deleted : ' + aData + ' --');
                    scope._logger.log(' > TODO: refresh pending list');
                }
            };

            var setUIpendingListRefresh = {
                observe : function(aSubject, aTopic, aData) {
                    scope._logger.log('-- [observer] -- rui:refreshPendingList :  --');
                    scope._logger.log(' > refresh pending list');
                    scope.refreshPendingList();
                }
            };

            Services.obs.addObserver(setMindrSuccessObserver, "mailmindr-setMindr-success", false);
            Services.obs.addObserver(setMindrDeleteSuccessObserver, "mailmindr-deleteMindr-success", false);
            Services.obs.addObserver(setUIpendingListRefresh, 'mailmindr-ui-refreshPendingList', false);
        }


        ///
        /// parse X.Message headers
        ///
        this.HeaderStreamListener = this.HeaderStreamListener || {
            onStartRequest: function() {
                scope._lastHeaders = "";
            },

            onStopRequest: function() {},

            onDataAvailable: function(aRequest, aContext, aInputStream, aOffset, aCount) {
                let stream = Components.classes["@mozilla.org/scriptableinputstream;1"]
                    .createInstance(Components.interfaces.nsIScriptableInputStream);
                stream.init(aInputStream);

                let data = stream.read(aCount).replace(/\r/g, "");
                scope._lastHeaders += data;

                let endOfHeader = scope._lastHeaders.indexOf("\n\n");
                if (endOfHeader > 0) {
                    scope._lastHeaders = scope._lastHeaders.substring(0, endOfHeader);

                    let regEx = /X-Message-Flag: (.*)$/img;
                    let xMsgFlagContent = regEx.exec(scope._lastHeaders);

                    if (xMsgFlagContent) {
                        scope._showXMsgHdr(true, xMsgFlagContent[1]);
                        return;
                    }

                    scope._showXMsgHdr(false, '');
                }
            }
        };
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

    /**
     * startTimer - will start the (global) timer for mindr execution
     */
    startTimer() {
        this._logger.log('START TIMER');
        let scope = this;
        window.setInterval(function() {
            scope.onTick();
        }, this.MAILMINDR_GLOBAL_INTERVAL);
    }


    /**
     * _enableElement - enabled/disables the target elemnt given by id
     * @returns Returns true if element was found, false otherwise
     */
    _enableElement(id, enabled) {
        let target = document.getElementById(id);
        if (target) {
            target.setAttribute('disabled', !enabled);

            return true;
        }

        return false;
    }


    /**
     * onLoad - triggered when mailmindr is loaded
     * intitalization of timers and "first run activities",
     * e.g. setup the toolbar buttons
     */
    onLoad() {
        if (!this._initialized) {
            // 
            this.initialize();
        }

        let count = mailmindrCore.registerMessengerInstance(this);
        if (count == 0) {
            this._logger.log('-->> start next timer');
            mailmindrCore.startNextTimer();
        }
    }

    /**
     * onUnload - triggered when a message window instance is closed
     * seems to be a little bit tricky: we only need ONE mailmindr instance
     * connected to a single message window
     *
     * approach:  - if user opens messenger window,
     * 				it will itself register at mailmindrs wnd list
     *			  - if active is closed, we look at the next instance in list
    * 				and start a new mailmindr instance
    */
    onUnload() {
        this._logger.info("unregister messenger instance");
        mailmindrCore.unregisterMessengerInstance(this);
        mailmindrCore.startNextTimer();
        this._logger.info("messenger instance unloaded");
        this._logger.info("---------------------------");
    }


    /**
     * onTick - interval trigger for checking mindrs to be executed
     */
    onTick() {
        this._count += 1;

        // 
        // 
        // 
        // 

        var _mindrs = this._reloadMindrs();
        let activeMindrs = mailmindrCore.getMindrs(_mindrs, 0, Date.now()); // + MAILMINDR_TIMESPAN_MINUTE);

        this._logger.log('reloaded/active: ' + _mindrs.length + '/' + activeMindrs.length);

        // 
        // 
        let showActiveMindrs = false;
        // 
        // 
        activeMindrs.forEach(mindr => {
            if (mailmindrCore.addMindrToDialog(mindr)) {
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
            this.showMindrAlert(mailmindrCore.getMindrsInDialog());
        }

        // 
        // 
        activeMindrs.forEach(mindr => {
            this._logger.log(`pre-push mindr for queue: ${mindr.mailmindrGuid}`);
            window.setTimeout(
                () => mailmindrCore.queueMindrForExecution(mindr),
                0
            );
        });

        this.refreshPendingList();
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
     * onToggleMessageTagKey - Triggered when a tag/flag key is pressed
     * checks if user configured the "set mindr on tag key" feature in settings
     */
    onToggleMessageTagKey(aKey) {
        /* check if message is tagged by this key, if not, tag it and raise event */

        // 
        const msgHdr = gFolderDisplay.selectedMessage;
        const currentKeys = msgHdr.getStringProperty("keywords");

        this._logger.log(`onToggleMessageTagKey: ${aKey}`);

        // 
        if ((" " + currentKeys + " ").indexOf(" $label" + aKey + " ") < 0) {
            /* raise event */
            if (MailmindrPreferences.getBoolPref('common.setMindrOnTag') && 
                (MailmindrPreferences.getStringPref('common.setMindrOnTagSelectedTag') == '$label' + aKey)) {
                const timespan = MailmindrPreferences.getStringPref('common.setMindrOnTagSelectedTimespan');
                this.onToggleMindr(timespan);
            }
        }

        return ToggleMessageTagKey(aKey);
    }


    /**
     * activate mindr for selected message(s)
     */
    onToggleMindr(preselectedTimeSpan) {
        if (gFolderDisplay.selectedCount != 1) {
            this._logger.log('no mail for resubmission selected.');
            return;
        }

        this.doSetMindrForMsg(gFolderDisplay.selectedMessage, preselectedTimeSpan);
    }

// 
// 
// 

    doSetMindrForMsg(aMsg) {
        // 
        // 
        // 
        // 
        // 

        try {
            MailmindrPreferences.refresh();
        } catch (ex) {
            this._logger.error('refreshing preferences failed');
            this._logger.error(ex);
        }

        let tsid = MailmindrPreferences.getStringPref('common.setMindrDefaultSelectedTimespan');
        this._logger.log(`doSetMindrForMsg: timespan loaded: ${tsid}`);
        if (arguments.length > 1 && arguments[1] !== undefined) {
            this._logger.log(`doSetMindrForMsg: more arguments delivered: ${arguments[1]}`);
            tsid = arguments[1];
        }

        const actionJson = MailmindrPreferences.getStringPref('common.action.default');
        let action = null;
        if (actionJson.length > 0) {
            try {
                action = JSON.parse(actionJson);
            } catch (e) {
                this._logger.warn(`error decoding action: *${actionJson}*`)
                this._logger.error(e);
            }
        }

        const timespan = this._getSerializedTimespanFromSettings(tsid);
        const selected = aMsg; 
        const data = {
            data: {
                selectedMail: selected,
                selectedTimespan: timespan,
                selectedAction: action,
                mindr: null
            },
            out: null
        };

        this.setMindr(data);
    }

    setMindr(data) {
        var dialog = mailmindrCommon.getWindow("mailmindr:setmindr");
        if (dialog) {
            this._logger.log('recycling setMindr dialog');
            this._dialogs.setmindr.focus();
        } else {
            // 
            try {
            this._dialogs.setmindr = window.openDialog(
                "chrome://mailmindr/content/dialogs/setmindr.xul",
                "setMindr",
                "chrome, resizeable=false, dependent=true, chrome=yes, centerscreen=yes",
                data
            );
            } catch (x) {
                this._logger.error('exception thrown in set mindr dlg');
                this._logger.error(x);
            }
        }
    }


    /**
     * onSelectMessage - triggered when one or more messages in messenger window
     * are selected by the user. In case of only one selected message the routine
     * is looking for the outlook headers. This process is started with the CopyMessage-stuff.
     */
    onSelectMessage(event) {
        this._logger.log('msg selected');

        if (gFolderDisplay && gFolderDisplay.selectedCount != 1) {
            this._logger.log('disable button');
            this._enableElement("mailmindrCmdToggleMindr", false);
            return;
        }

        // 
        this._enableElement("mailmindrCmdToggleMindr", true);

        // 
        const msgHdr = gFolderDisplay.selectedMessage;
        const msgURI = gDBView.URIForFirstSelectedMessage;

         /**
          * @returns {Array<Mindr>}
          */
        // 
        const getMindrForSelectedMessage = () => {
            try {
                const mindrList = this._reloadMindrs();
                const messageId = msgHdr.messageId;
                const mindrs = mailmindrCore.getMindrsForMessageId(mindrList, messageId);

                return mindrs;
            } catch (e) {
                this._logger.error(e);
                this._logger.error(`cannot get mindrs for selected message`);

                return null;
            }
        };

        const mindrs = getMindrForSelectedMessage();

        this._logger.log(`mindrs for selected message ${mindrs && mindrs.length ? mindrs.length : 'none'}`);

        let label = this.getButtonMailHeaderViewLabel(null);

        if (mindrs && mindrs.length) {
            const messageId = mindrs[0].mailguid;
            this._logger.warn(`setting notes for mindr: msgid ${messageId} >> ${mindrs.mailmindrGuid}`);
            this.showMindrNotes(messageId);
            this.showMindrSummary(messageId);

            label = this.getButtonMailHeaderViewLabel(messageId);
        } else {
            this._logger.warn(`setting empty notes section`);
            this.showMindrNotes(null);
            this.showMindrSummary(null);
        }
        
        const button = document.getElementById('MAILMINDR_SET_MINDR_BTN');
        // 
        button.setAttribute('label', label);
        

        if (msgURI == null) {
            return;
        }

        const msgService = messenger.messageServiceFromURI(msgURI);

        msgService.CopyMessage(
            msgURI,
            this.HeaderStreamListener,
            false,
            null,
            msgWindow, {}
        );
    }

    /**
     * onSelectPendingMindr - triggered when a mindr in pending list is selected
     * tasks: 	- select the mindr's message and folder
     */
    onSelectPendingMindr(event) {
        let mindrGuid = this._viewPendingMindrs.getSelectedMindrGuid();
        let buttonDisabled = mindrGuid == null;

        this._elements.buttonEdit.disabled = buttonDisabled;
        this._elements.buttonView.disabled = buttonDisabled;
        this._elements.buttonDelete.disabled = buttonDisabled;

        return;
    }


    /**
     * triggered when a mindr is selected and the view mail button is pressed
     */
    onClickMailmindrViewMail() {
        let mindr = this._viewPendingMindrs.findSelectedMindr();
        this._logger.log('trying to open message for mindr: ' + mindr);
        if (mindr && mindr.details) {
            this._logger.log('open mail for mindr: ' + mindr);
            let headers = mailmindrSearch.getMessageHdrByMessageId(mindr.mailguid);
            if (headers.length == 0) {
                return;
            }

            let hdr = headers[0];
            this.openMessageInNewWindow(hdr);
        }
    }


    /**
     * triggered when a mindr is selected and the 'delete mindr' button is pressed
     */
    onClickMailmindrDeleteMindr(mindrGuid) {
        let mailmindrGuid = mindrGuid || this._viewPendingMindrs.getSelectedMindrGuid();

        if (null == mailmindrGuid) {
            return;
        }

        var _mindrs = this._reloadMindrs();
        let mindr = mailmindrCore.getMindrByGuid(_mindrs, mailmindrGuid);

        let promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
            .getService(Components.interfaces.nsIPromptService);

        let title = mailmindrI18n.getString("mailmindr.overlay.mindr.delete.title");
        let text = mailmindrI18n.getString("mailmindr.overlay.mindr.delete.text");

        if (promptService.confirm(null, title, text)) {
            mailmindrKernel.kernel.deleteMindr(mindr);
        }
    }


    onClickMailmindrEditMindr(mindrGuid) {
        try {
            let mailmindrGuid = mindrGuid || this._viewPendingMindrs.getSelectedMindrGuid();

            if (null == mailmindrGuid) {
                this._logger.log('no mindr selected for edit');
                return;
            }

            let scope = this;
            let _mindrs = this._reloadMindrs();
            let mindr = mailmindrCore.getMindrByGuid(_mindrs, mailmindrGuid);
            let msgGuid = mindr.mailguid;
            let headers = mailmindrSearch.getMessageHdrByMessageId(msgGuid);
            
            if (headers.length == 0) {
                this._logger.log('cannot edit mindr - the message is gone.');
                return;
            }

            // 
            let msghdr = headers[0];

            /* calc timespan */
            let delta = mindr.RemainingMilliseconds;
            let ts = this._calculateDaysHoursMinutes(delta);

            let timespan = ts.days + ";" + ts.hours + ";" + ts.minutes + ";false";
            this._logger.log('edit: ' + timespan);

            let data = {
                callback: function(result) {
                    scope.onSetMindrCallback(result);
                },
                data: {
                    selectedMail: msghdr,
                    selectedTimespan: null,
                    mindr: mindr
                },
                out: null
            };

            this._logger.log('show edit mindr dialog');
            this.setMindr(data);
        } catch (editException) {
            this._logger.error(editException);
        }
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

        let data = {
            list: living,
            openMessageFunction: this.openMessageInNewWindow,
            selectMessageFunction: this.selectMessageByMessageHeader,
            sender: this,
            out: null
        };

        let wnd = mailmindrCommon.getWindow("mailmindr:alert");
        let alertDialog;
        
        if (wnd) {
            this._logger.log('alert window already open, must reload data');
            var listOfGuids = Enumerable.from(mindrs).select(mindr => mindr.mailmindrGuid).toArray();
            var serializedMindrs = JSON.stringify(listOfGuids);

            Services.obs.notifyObservers(null, "mailmindr-mindrAlert-pushMindrsToDialog", serializedMindrs);
        } else {
            alertDialog = window.openDialog(
                "chrome://mailmindr/content/dialogs/mindrAlert.xul",
                "mindrAlert",
                "chrome, resizeable=true, dependent=true, chrome=yes, centerscreen=yes, width=650, height=300",
                data
            );
        }

        (wnd || alertDialog).focus();
    }


    doCmdPreferences() {
        window.openDialog('chrome://mailmindr/content/preferences/preferences.xul', 'Preferences', '', 'mmrPaneActions');
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


    /**
     * _showXMsgHdr - shows the additional header with outlooks x-message
     */
    _showXMsgHdr(show, value) {
        let xMsgHeaderPane = document.getElementById("mailmindrShowXMsg");
        let xMsgHeaderLabel = document.getElementById("mailmindrXMsgLabel");

        xMsgHeaderPane.setAttribute("hidden", !show);
        xMsgHeaderLabel.value = value;
    }

    createHeaderField(elementId, labelText, child) {
        const row = document.createElement('row');
        row.setAttribute('id', elementId);

        const label = document.createElement('label');
        label.setAttribute('id', `${elementId}-LabelElement`);
        label.setAttribute('value', labelText);
        label.setAttribute('class', 'headerName');
        label.setAttribute('control', 'mailmindrNotesLabel');
        row.appendChild(label);

        const valueNode = document.createElement('mail-headerfield');
        valueNode.setAttribute('id', `${elementId}-NotesLabel`);
        valueNode.setAttribute('flex', '1');

        row.appendChild(valueNode);
        valueNode.appendChild(child);

        const headerNode = document.getElementById("expandedHeader2Rows");
        headerNode.appendChild(row);
    }

    showMindrNotes(messageId) {
        const mindrs = mailmindrKernel.kernel.currentMindrs;
        const mindrsForMessage = mailmindrCore.getMindrsForMessageId(mindrs, messageId);
        const aMindr = mindrsForMessage.length ? mindrsForMessage[0] : null;

        const value = aMindr == null ? '' : aMindr.details.note;
        const show = aMindr != null && value.length > 0;

        const mailmindrNotesHeaderElement = document.getElementById('mailmindrNotes');

        if (!show) {
            mailmindrNotesHeaderElement && mailmindrNotesHeaderElement.setAttribute('collapsed', 'true');
            return;
        }

        if (mailmindrNotesHeaderElement) {
            mailmindrNotesHeaderElement.setAttribute('collapsed', 'false');
        } else {
            const notesElement = document.createElement('description');
            notesElement.setAttribute('style', 'word-wrap: auto; margin-left: 0;');
            notesElement.setAttribute('id', 'mailmindrNotesLabelContent');
            notesElement.setAttributeNS('xmlns', 'html', 'http://www.w3.org/1999/xhtml');
            
            const labelText = mailmindrI18n.getString('mailmindr.overlay.headerview.label.notes');
            this.createHeaderField('mailmindrNotes', labelText, notesElement);
        }

        const labelContent = document.getElementById('mailmindrNotesLabelContent');
        if (labelContent) {
            labelContent.textContent = value;
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
    }

    getButtonMailHeaderViewLabel(messageId) {
        const mindrs = mailmindrKernel.kernel.currentMindrs;
        const mindrsForMessage = mailmindrCore.getMindrsForMessageId(mindrs, messageId);

        if (!messageId || !mindrsForMessage || !mindrsForMessage.length) {
            return mailmindrI18n.getString('mailmindr.message.header.view.button.label.add');
        }
        
        return mailmindrI18n.getString('mailmindr.message.header.view.button.label.edit');
    }

    /**
     * 
     * @param {string} messageId
     */
    showMindrSummary(messageId) {
        const view = document.getElementById("singlemessage");
        const msgNotificationBar = document.getElementById("msgNotificationBar");

        let mailmindrSummary = document.getElementById('mailmindrSummary');
        if (!mailmindrSummary) {
            mailmindrSummary = document.createElement('notificationbox');
            mailmindrSummary.setAttribute('id', 'mailmindrSummary');

            view.insertBefore(mailmindrSummary, msgNotificationBar);
        }

        mailmindrSummary.removeAllNotifications(true);

        if (!messageId) {
            return;
        }

        const mindrs = mailmindrKernel.kernel.currentMindrs;
        const mindrsForMessage = mailmindrCore.getMindrsForMessageId(mindrs, messageId);
        mindrsForMessage.forEach(item => this.appendMindrSummary(mailmindrSummary, item));
    }

    /**
     * 
     * @param {any} mailmindrSummary 
     * @param {Mindr} mindr 
     */
    appendMindrSummary(mailmindrSummary, mindr) {
        const remindAt = new Date(mindr.remindat);
        const localDateTimeString = remindAt.toLocaleString('de');

        const labelEdit = mailmindrI18n.getString('mailmindr.overlay.headerview.notification.edit');
        const labelPostpone = mailmindrI18n.getString('mailmindr.overlay.headerview.notification.postpone');
        const labelRemove = mailmindrI18n.getString('mailmindr.overlay.headerview.notification.remove');
        const labelMessage = mailmindrI18n.getString('mailmindr.overlay.headerview.notification.message');

        const buttons = [
            {
                label: labelEdit,
                callback: () => {
                    this.onClickMailmindrEditMindr(mindr.mailmindrGuid);
                    
                    return true;
                }
            } ,
            {
                label: labelRemove,
                callback: () => {
                    this.onClickMailmindrDeleteMindr(mindr.mailmindrGuid);

                    return true;
                }
            },
            {
                label: labelPostpone,
                callback: () => {
                    mailmindrCore.postponeMindrRelative(mindr, 1440); // postpone or one day

                    return true;
                }
            }
        ];

        mailmindrSummary.appendNotification(
            labelMessage.replace('#1', localDateTimeString),
            '',
            null,
            mailmindrSummary.PRIORITY_INFO_HIGH,
            buttons
        );
    }


    _getSerializedTimespanFromSettings(timespanId) {
        if (timespanId.substr(0, 1) == '#') {
            return timespanId.substr(1);
        }

        let timespan = mailmindrKernel.kernel.modules.storage.loadTimespan(timespanId);
        if (timespan != null) {
            return timespan.serialize();
        }

        return null;
    }

    _calculateDaysHoursMinutes(delta) {
        let x = delta / 1000
        let seconds = x % 60
        x = Math.floor(Math.abs(x / 60));
        let minutes = x % 60
        x = Math.floor(Math.abs(x / 60));
        let hours = x % 24
        x = Math.floor(Math.abs(x / 24));
        let days = x;

        return {
            days: days,
            hours: hours,
            minutes: minutes,
            seconds: seconds
        }
    }

    /**
     * _reloadMindrs - shortcut for mailmindrKernel.kernel.modules.storage.loadMindrs();
     */
    _reloadMindrs() {
        return mailmindrKernel.kernel.currentMindrs;
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
// 
// 
// 
// 
// 

    /**
     * sort(column) - 
     * 
     * core code taken from: https://developer.mozilla.org/en/docs/Sorting_and_filtering_a_custom_tree_view
     */
    sortList(aTree, aColumn, aSortOrder) {
        try { 
            var columnName;
            var order = (aSortOrder ? aSortOrder : aTree.getAttribute("sortDirection")) == "ascending" ? 1 : -1;
            var treeView = aTree.treeBoxObject.view;
            var getSortOrder = function(aOrder) {
                return aOrder == 1 ? "ascending" : "descending";
            }
            
            //if the column is passed and it's already sorted by that column, reverse sort
            if (aColumn) {
                columnName = aColumn.id;
                if (aTree.getAttribute("sortResource") == columnName) {
                    if (!aSortOrder) {
                        order *= -1;
                    }
                }
            } else {
                columnName = aTree.getAttribute("sortResource");
            }

            // 
            // 
            //this._logger.log(this._logger.explode(treeView));
            // 
            this._viewPendingMindrs.sortByColumn(columnName, order);
            // 

            //setting these will make the sort option persist
            aTree.setAttribute("sortDirection", getSortOrder(order));
            aTree.setAttribute("sortResource", columnName);

            //set the appropriate attributes to show to indicator
            var cols = aTree.getElementsByTagName("treecol");
            for (var i = 0; i < cols.length; i++) {
                cols[i].removeAttribute("sortDirection");
            }

            var sortDirection = getSortOrder(order);
            if (aColumn) {
                aColumn.setAttribute("sortDirection", sortDirection);
            }

            MailmindrPreferences.setStringPref('sorting.overlay.pendingList.columnName', columnName);
            MailmindrPreferences.setStringPref('sorting.overlay.pendingList.order', sortDirection);
        } catch (sortException) {
            this._logger.error(sortException);
        }
    }

    sortPendingList(aColumn, aSortOrder) {
        var column = aColumn || document.getElementById(this._elements.pendingList.getAttribute('sortResource'));
        this.sortList(this._elements.pendingList, column, aSortOrder);
    }
}

// 
// 
// 
// 

// 
// 
// 

async function setupWindow() {
    const href = String(window.document.location.href);
    if (href.indexOf('/messenger.xul') >= 0 && messenger) {
        await getMailmindrStorage();  
        mailmindrOverlay.base = new mailmindrBase(window);
        mailmindrOverlay.base.onLoad();

        window.addEventListener("unload", function onLoad() {
            mailmindrOverlay.base.onUnload();
        }, false);
    }

    if (href.indexOf('/messageWindow.xul') >= 0 && !Boolean(mailmindrOverlay.base)) {
        mailmindrOverlay.base = new mailmindrBase(window);
        mailmindrOverlay.base.onLoad();

        window.addEventListener("unload", function onLoad() {
            mailmindrOverlay.base.onUnload();
        }, false);
    }
}

window.addEventListener('load', setupWindow, false);
