var { mailmindrLogger: MailmindrLogger } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/logger.jsm'
);
var { mailmindrI18n } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/i18n.jsm'
);

var { MailmindrPreferences } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/preferences.jsm'
);

var { mailmindrStorage } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/storage.jsm'
);

var { mailmindrSearch } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/search.jsm'
);

var { mailmindrCommon } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/common.jsm'
);

var { mailmindrKernel } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/kernel.jsm'
);

var { mailmindrCore } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/core.jsm'
);

var {
    calculateDaysHoursMinutes,
    enableElement,
    remainingMilliseconds,
    openMessageByMindr,
    selectMessageByMindr
} = ChromeUtils.import('chrome://mailmindr/content/modules/utils.jsm');

var {
    createMindrListViewItem,
    findMindrFromElement,
    updateMindrListViewItem
} = ChromeUtils.import('chrome://mailmindr/content/modules/ui-utils.jsm');

var { XPCOMUtils } = ChromeUtils.import(
    'resource://gre/modules/XPCOMUtils.jsm'
);

var gMailmindrMessenger;
function getMessenger() {
    if (!gMailmindrMessenger) {
        gMailmindrMessenger = Cc['@mozilla.org/messenger;1'].createInstance(
            Ci.nsIMessenger
        );
    }

    return gMailmindrMessenger;
}

function getSerializedTimespanFromSettings(timespanId) {
    if (timespanId.substr(0, 1) == '#') {
        return timespanId.substr(1);
    }

    const timespan = storage.loadTimespan(timespanId);
    if (timespan != null) {
        return timespan.serialize();
    }

    return null;
}

var MailmindrUI =
    MailmindrUI ||
    class MailmindrUI {
        constructor(wnd) {
            // 
            this.teardownStack = [];
            this.logger = new MailmindrLogger({ _name: 'mailmindrUI.js' });

            this.doSetMindrForMsg = this.doSetMindrForMsg.bind(this);
            this.doOpenSetMindrDialog = this.doOpenSetMindrDialog.bind(this);
            this.doCommandButtonMailHeaderView = this.doCommandButtonMailHeaderView.bind(
                this
            );
            this.doShowMindrNotes = this.doShowMindrNotes.bind(this);
            this.doShowMindrSummary = this.doShowMindrSummary.bind(this);

            this.onSelectMessage = this.onSelectMessage.bind(this);
            this.onClickMailmindrEditMindr = this.onClickMailmindrEditMindr.bind(
                this
            );
            this.onClickMailmindrDeleteMindr = this.onClickMailmindrDeleteMindr.bind(
                this
            );

            this.setupPendingListContextMenu = this.setupPendingListContextMenu.bind(
                this
            );

            this.setupUI();
        }

        setupUI() {
            this.createButtonInMailHeaderView();
            this.createMessageListeners();
            this.setupKeyset();
            this.setupContextMenu();

            window.setTimeout(() => {
                this.setupPendingListContextMenu();
            }, 0);

            window.addEventListener(
                'compose-window-init',
                () => this.setupMessageComposerUI(),
                true
            );

            // 

            const observer = {
                observe: (topic, subject, data) => {
                    const unwrappedData = JSON.parse(data);

                    switch (subject) {
                        case 'mailmindr-heartbeat':
                            const pendingMindrs =
                                (unwrappedData && unwrappedData.pending) || [];
                            this.doRefreshPendingReminderList(pendingMindrs);
                            this.refreshUI();
                            break;
                        case 'mailmindr-setmindr-success':
                            const touchedMindr = unwrappedData;
                            // 
                            // 
                            // 
                            this.onSelectMessage(null);
                            mailmindrKernel.kernel.onTick();
                            break;
                    }
                }
            };

            const observerService = Components.classes[
                '@mozilla.org/observer-service;1'
            ].getService(Components.interfaces.nsIObserverService);

            [
                'mailmindr-heartbeat',
                'mailmindr-setmindr-success'
            ].forEach(subject =>
                observerService.addObserver(observer, subject, false)
            );
        }

        refreshUI() {
            this.doShowPendingMindrsList();
        }

        registerTeardownStep(teardownFunction) {
            this.teardownStack.push(teardownFunction);
        }

        teardown() {
            this.teardownStack.reverse().map(doTeardown => {
                try {
                    doTeardown();
                } catch (exception) {
                    console.error(exception);
                    this.logger.error(exception);
                }
            });
        }

        createSetMindrHeaderButton() {
            const button = document.createXULElement('toolbarbutton');
            const mailmindrButtonId = 'MAILMINDR_SET_MINDR_BTN';

            const labelText = mailmindrI18n.getString(
                'mailmindr.message.header.view.button.label.add'
            );
            const tooltipText = mailmindrI18n.getString(
                'mailmindr.message.header.view.button.tooltip'
            );

            button.setAttribute('id', mailmindrButtonId);
            button.setAttribute('label', labelText);
            button.setAttribute('tooltiptext', tooltipText);
            button.setAttribute(
                'class',
                'toolbarbutton-1 msgHeaderView-button'
            );

            button.style.listStyleImage =
                'url(chrome://mailmindr/content/content/images/mailmindr-plus-icon-32x32.png)';

            // 

            button.addEventListener(
                'command',
                () => this.doCommandButtonMailHeaderView(),
                false
            );

            return button;
        }

        createButtonInMailHeaderView() {
            const mailmindrButtonId = 'MAILMINDR_SET_MINDR_BTN';
            const toolbox = document.getElementById('header-view-toolbox');
            const toolbar = document.getElementById('header-view-toolbar');

            if (toolbox) {
                // 
                this.logger.log('UI setup :: create button');

                if (toolbox.palette) {
                    const palette = toolbox.palette;

                    this.logger.log('UI setup :: appending button');
                    const button = this.createSetMindrHeaderButton();

                    palette.appendChild(button);

                    document
                        .getElementById('header-view-toolbar')
                        .insertItem(mailmindrButtonId, null);

                    this.registerTeardownStep(() => {
                        const button = document.getElementById(
                            mailmindrButtonId
                        );
                        button && button.remove();
                    });
                }
            } else if (toolbar) {
                // 
                const otherActionsButton = document.getElementById(
                    'otherActionsButton'
                );
                const button = this.createSetMindrHeaderButton();

                toolbar.insertBefore(button, otherActionsButton);

                this.registerTeardownStep(() => {
                    const button = document.getElementById(mailmindrButtonId);
                    button && button.remove();
                });
            } else {
                // 
                this.logger.log(
                    'UI setup failed: cannot determine toolbox nor toolbar'
                );
            }
        }

        createMessageListeners() {
            const threadTree = document.getElementById('threadTree');

            if (!threadTree) {
                return;
            }

            const onSelectMessageHandler = event => {
                this.onSelectMessage(event);
            };

            threadTree.addEventListener(
                'select',
                onSelectMessageHandler,
                false
            );
        }

        setupKeyset() {
            const set = document.createXULElement('keyset');
            set.id = 'mailmindrKeyset';

            const hotkey0 = document.createXULElement('key');
            const id = 'mailmindr-key-preset-0';
            hotkey0.id = id;
            hotkey0.setAttribute('key', '1');
            const { platform } = navigator;
            if (platform.startsWith('Linux')) {
                // 
                hotkey0.setAttribute('modifiers', 'control');
            } else if (platform.startsWith('Win')) {
                // 
                hotkey0.setAttribute('modifiers', 'control,alt');
            } else {
                // 
                hotkey0.setAttribute('modifiers', 'alt');
            }
            hotkey0.setAttribute(
                'oncommand',
                `mailmindr.doCommandShortcut('${id}')`
            );

            set.appendChild(hotkey0);

            const wnd = document.querySelector('window');
            if (!wnd) {
                this.logger.error(
                    `keyset cannot be appended due to missing window element`
                );
                return;
            }

            wnd.appendChild(set);

            this.registerTeardownStep(() => {
                const keyset = document.getElementById('mailmindrKeyset');
                if (keyset) {
                    keyset.remove();
                }
            });
        }

        // 
        setupContextMenu() {
            const separator = document.getElementById('mailContext-sep-reply');
            const menu = document.getElementById('mailContext');

            if (menu && separator) {
                const item = document.createXULElement('menuitem');
                item.id = 'mailmindrContextMenuItem';
                item.setAttribute('command', 'mailmindr-key-preset-0');
                item.setAttribute('label', 'Follow-Up');

                try {
                    menu.appendChild(item);
                } catch (e) {
                    console.error('have not inserted the menu item');
                }
            } else {
                // 
            }
        }

        setupPendingListContextMenu() {
            const menuItemEdit = document.getElementById(
                'mailmindrContextMenuEdit'
            );
            const menuItemOpenMessage = document.getElementById(
                'mailmindrContextMenuOpenMessage'
            );
            const menuItemSelectMessage = document.getElementById(
                'mailmindrContextMenuSelectMessage'
            );
            const menuItemPostpone = document.getElementById(
                'mailmindrContextMenuPostpone'
            );

            const getSelectedMindrIdOrNullFromPendinglist = () => {
                const list = document.getElementById('mailmindrPendingList');
                const selectedItem = list && list.selectedItem;
                const mindrGuid =
                    selectedItem && selectedItem.getAttribute('data-mindr-id');
                return mindrGuid;
            };

            const editMindr = () => {
                const mindrGuid = getSelectedMindrIdOrNullFromPendinglist();
                if (mindrGuid) {
                    this.onClickMailmindrEditMindr(mindrGuid);
                }
            };

            const openMessage = () => {
                const mindrGuid = getSelectedMindrIdOrNullFromPendinglist();
                if (mindrGuid) {
                    const mindrs = mailmindrKernel.kernel.currentMindrs;
                    const mindr = mailmindrCore.getMindrByGuid(
                        mindrs,
                        mindrGuid
                    );
                    openMessageByMindr(mindr);
                }
            };

            const selectMessage = () => {
                const mindrGuid = getSelectedMindrIdOrNullFromPendinglist();
                if (mindrGuid) {
                    const mindrs = mailmindrKernel.kernel.currentMindrs;
                    const mindr = mailmindrCore.getMindrByGuid(
                        mindrs,
                        mindrGuid
                    );
                    const selectMessageByMindr = mindr => {
                        const msgGuid = mindr.mailguid;
                        const messageHeader = mailmindrSearch.getMessageHdrByMessageId(
                            msgGuid
                        );

                        if (!messageHeader || messageHeader.length == 0) {
                            return false;
                        }

                        try {
                            const header = messageHeader[0].hdr;
                            MsgDisplayMessageInFolderTab(header);
                        } catch (openMessageException) {
                            console.error(openMessageException);
                            return false;
                        }

                        return true;
                    };

                    selectMessageByMindr(mindr);
                }
            };

            const postponeMindr = async () => {
                const mindrGuid = getSelectedMindrIdOrNullFromPendinglist();
                if (mindrGuid) {
                    const mindrs = mailmindrKernel.kernel.currentMindrs;
                    const mindr = mailmindrCore.getMindrByGuid(
                        mindrs,
                        mindrGuid
                    );
                    const updatedMindr = await mailmindrCore.postponeMindrRelative(
                        mindr,
                        1440
                    ); // postpone or one day

                    this.onSelectMessage(null);
                    mailmindrKernel.kernel.onTick();
                }
            };

            if (menuItemEdit) {
                menuItemEdit.label = mailmindrI18n.getString(
                    'mailmindr.pendinglist.contextmenu.edit'
                );
                menuItemEdit.addEventListener('click', editMindr);
            }

            if (menuItemOpenMessage) {
                menuItemOpenMessage.label = mailmindrI18n.getString(
                    'mailmindr.pendinglist.contextmenu.openmessage'
                );
                menuItemOpenMessage.addEventListener('click', openMessage);
            }

            if (menuItemSelectMessage) {
                menuItemSelectMessage.label = mailmindrI18n.getString(
                    'mailmindr.pendinglist.contextmenu.selectmessage'
                );
                menuItemSelectMessage.addEventListener('click', selectMessage);
            }

            if (menuItemPostpone) {
                menuItemPostpone.label = mailmindrI18n.getString(
                    'mailmindr.pendinglist.contextmenu.postpone'
                );
                menuItemPostpone.addEventListener('click', postponeMindr);
            }
        }

        setupMessageComposerUI() {
            const addressesBox = document.getElementById('addresses-box');
            if (!addressesBox) {
                return;
            }

            try {
                const styles = [
                    'chrome://calendar-common/skin/widgets/minimonth.css',
                    'chrome://calendar/content/widgets/calendar-widget-bindings.css',
                    'chrome://lightning-common/skin/datetimepickers.css'
                ];
                const scripts = [
                    'chrome://calendar/content/calendar-ui-utils.js',
                    // 
                    'chrome://calendar/content/datetimepickers/datetimepickers.js',
                    'chrome://mailmindr/content/controls/timespanPicker.js'
                ];

                styles.forEach(styleUrl => {
                    const style = document.createElement('link');
                    style.setAttribute('rel', 'stylesheet');
                    style.setAttribute('type', 'text/css');
                    style.setAttribute('href', styleUrl);

                    const pi = document.createProcessingInstruction(
                        'xml-stylesheet',
                        `href="${styleUrl}" type="text/css"`
                    );
                    document.insertBefore(pi, document.firstChild);
                });

                scripts.forEach(scriptUrl => {
                    try {
                        // 
                        Services.scriptloader.loadSubScript(scriptUrl);
                    } catch (ex) {
                        try {
                            console.warn('retry w/ fallback loader');
                            const scriptElement = document.createElement(
                                'script'
                            );
                            scriptElement.setAttribute('src', scriptUrl);
                            const wnd = document.getElementsByTagName('window');
                            if (wnd && wnd.length) {
                                wnd[0].appendChild(scriptElement);
                            }
                        } catch (scriptLoaderError) {
                            this._logger.error(
                                `cannot load script: ${scriptUrl}`,
                                scriptLoaderError
                            );
                        }
                    }
                });

                const xulMailmindr = window.MozXULElement.parseXULToFragment(`
                    <hbox id="mailmindrComposerRow">
                        <hbox class="aw-firstColBox">
                        </hbox>
                        <hbox align="center" pack="end" style="width: 9em;" id="mailmindrLabelWrapper">
                            <label id="mailmindrAwaitMainLabel">
                            </label>
                        </hbox>
                        <hbox align="center" flex="1">
                            <checkbox id="mailmindrAwaitReplyEnabled">
                            </checkbox>
                            <datepicker id="mailmindrAwaitReplyDate" type="popup" firstdayofweek="1" disabled="true">
                            </datepicker>
                            <timepicker id="mailmindrAwaitReplyTime" hideseconds="true">
                            </timepicker>
                            <label id="mailmindrAwaitDateTimePreset">
                            </label>
                            <menulist id="mailmindrTimespans" disabled="true">
                                <menupopup>
                                </menupopup>
                            </menulist>
                        </hbox>
                    </hbox>
                `);

                addressesBox.appendChild(xulMailmindr);

                const label = document.getElementById(
                    'mailmindrAwaitMainLabel'
                );
                label.value = mailmindrI18n.getString(
                    'mailmindr.message.compose.await.main.label'
                );

                const labelPreset = document.getElementById(
                    'mailmindrAwaitDateTimePreset'
                );
                labelPreset.value = mailmindrI18n.getString(
                    'mailmindr.message.compose.await.preset.label'
                );

                const checkBox = document.getElementById(
                    'mailmindrAwaitReplyEnabled'
                );
                checkBox.setAttribute(
                    'label',
                    `${mailmindrI18n.getString(
                        'mailmindr.message.compose.await.checkbox.label'
                    )} `
                );
                checkBox.addEventListener('command', () => {
                    const dp = document.getElementById(
                        'mailmindrAwaitReplyDate'
                    );
                    const tp = document.getElementById(
                        'mailmindrAwaitReplyTime'
                    );
                    const timespanPicker = document.getElementById(
                        'mailmindrTimespans'
                    );
                    const sender = document.getElementById(
                        'mailmindrAwaitReplyEnabled'
                    );
                    const controlsEnabled = sender.checked;

                    dp.setAttribute('disabled', !controlsEnabled);
                    tp.setAttribute('disabled', !controlsEnabled);
                    timespanPicker.setAttribute('disabled', !controlsEnabled);
                });

                const onSendSuccess = messageId => {
                    const sender = document.getElementById(
                        'mailmindrAwaitReplyEnabled'
                    );
                    const waitForReply = sender.checked;

                    if (!waitForReply) {
                        return;
                    }

                    const dp = document.getElementById(
                        'mailmindrAwaitReplyDate'
                    );
                    const tp = document.getElementById(
                        'mailmindrAwaitReplyTime'
                    );

                    const date = dp.value;
                    const time = tp.value;
                    const [hours, minutes] = time;
                    const due = new Date(
                        date.getFullYear(),
                        date.getMonth(),
                        date.getDate(),
                        hours,
                        minutes
                    );

                    const mindr = mailmindrCore.createMindrWithAction();
                    mindr.waitForReply = true;
                    mindr.doShowDialog = true;
                    mindr.mailguid = messageId;
                    mindr.remindat = due.getTime();

                    const to =
                        MailServices.headerParser.parseEncodedHeader(
                            gMsgCompose.compFields.to,
                            null,
                            false
                        ) || [];
                    const cc =
                        MailServices.headerParser.parseEncodedHeader(
                            gMsgCompose.compFields.cc,
                            null,
                            false
                        ) || [];

                    const addresses = [...to, ...cc]
                        .map(item => `${item.name} ${item.email}`.trim())
                        .join(', ');

                    mindr.details.subject = gMsgCompose.compFields.subject;
                    mindr.details.recipients = addresses;

                    if (mailmindrStorage.saveMindr(mindr)) {
                        const serializedMindr = JSON.stringify(mindr);
                        Services.obs.notifyObservers(
                            null,
                            'mailmindr-setmindr-success',
                            serializedMindr
                        );
                    }
                };

                const sendListener = {
                    // 
                    onStartSending: (aMsgID, aMsgSize) => {},
                    onProgress: (aMsgID, aProgress, aProgressMax) => {},
                    onStatus: (aMsgID, aMsg) => {},
                    onStopSending: (aMsgID, aStatus, aMsg, aReturnFile) => {
                        if (Components.isSuccessCode(aStatus)) {
                            // 
                            const messageId = (aMsgID || '')
                                .replace('<', '')
                                .replace('>', '');
                            onSendSuccess(messageId);
                        }
                    },
                    onGetDraftFolderURI: aFolderURI => {},
                    onSendNotPerformed: (aMsgID, aStatus) => {}
                };

                gMsgCompose.addMsgSendListener(sendListener);

                // 
                setTimeout(() => {
                    const newDate = new Date(
                        Date.now() + 3 * 24 * 60 * 60 * 1000
                    );
                    try {
                        console.log('set awaiting date');
                        const datePicker = document.getElementById(
                            'mailmindrAwaitReplyDate'
                        );
                        const timePicker = document.getElementById(
                            'mailmindrAwaitReplyTime'
                        );
                        const timespanPicker = document.getElementById(
                            'mailmindrTimespans'
                        );

                        const timespans = new mailmindr.controls.TimespanPicker(
                            timespanPicker,
                            datePicker,
                            timePicker,
                            {
                                canBeUserDefined: true
                            }
                        );

                        timePicker.setAttribute('disabled', true);
                        timespanPicker.value = '-1;-1;-1;false';
                        datePicker.value = newDate;
                    } catch (_) {
                        // 
                        const datePicker = document.getElementById(
                            'mailmindrAwaitReplyDate'
                        );
                        console.error(`this crashed: setting await date again`);
                        datePicker.value = newDate;
                        console.warn(`ok`);
                    }
                }, 1000);

                this.registerTeardownStep(() => {
                    if (gMsgCompose) {
                        gMsgCompose.removeMsgSendListener(sendListener);
                    }
                });

                window.addEventListener('close', () => this.teardown());
            } catch (e) {
                console.error(e);
            }
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

            const headerNode = document.getElementById('expandedHeader2Rows');
            headerNode.appendChild(row);
        }

        /**
         *
         * @param {any} mailmindrSummary
         * @param {Mindr} mindr
         */
        createReminderNotification(mailmindrSummary, mindr) {
            const remindAt = new Date(mindr.remindat);
            const localDateTimeString = remindAt.toLocaleString('de');

            const labelEdit = mailmindrI18n.getString(
                'mailmindr.overlay.headerview.notification.button.edit'
            );
            const labelPostpone = mailmindrI18n.getString(
                'mailmindr.overlay.headerview.notification.button.postpone'
            );
            const labelRemove = mailmindrI18n.getString(
                'mailmindr.overlay.headerview.notification.button.remove'
            );
            const labelMessage = mailmindrI18n.getString(
                'mailmindr.overlay.headerview.notification.message'
            );
            const labelMessagePast = mailmindrI18n.getString(
                'mailmindr.overlay.headerview.notification.message.past'
            );

            const buttons = [
                {
                    label: labelEdit,
                    callback: () => {
                        this.onClickMailmindrEditMindr(mindr.mailmindrGuid);
                        this.onSelectMessage(null);

                        return true;
                    }
                },
                {
                    label: labelRemove,
                    callback: () => {
                        this.onClickMailmindrDeleteMindr(mindr.mailmindrGuid);
                        this.onSelectMessage(null);

                        return true;
                    }
                },
                {
                    label: labelPostpone,
                    callback: async () => {
                        // 
                        const mindrOriginalTime = mindr.remindat;
                        const updatedMindr = await mailmindrCore.postponeMindrRelative(
                            mindr,
                            1440
                        ); // postpone or one day

                        this.onSelectMessage(null);
                        mailmindrKernel.kernel.onTick();
                        // 
                        // 
                        // 

                        return true;
                    }
                }
            ];

            const isMindrInThePast = remainingMilliseconds(mindr) < 0;
            if (isMindrInThePast) {
                mailmindrSummary.appendNotification(
                    labelMessagePast.replace('#1', localDateTimeString),
                    '',
                    null,
                    mailmindrSummary.PRIORITY_INFO_HIGH,
                    []
                );
            } else {
                mailmindrSummary.appendNotification(
                    labelMessage.replace('#1', localDateTimeString),
                    '',
                    null,
                    mailmindrSummary.PRIORITY_INFO_HIGH,
                    buttons
                );
            }
        }

        doCommandButtonMailHeaderView() {
            const msgHdr = gFolderDisplay.selectedMessage;

            this.doSetMindrForMsg(msgHdr);
        }

        doCommandShortcut(cmd) {
            // 

            // 
            this.doCommandButtonMailHeaderView();
        }

        doSetMindrForMsg(aMsg) {
            try {
                MailmindrPreferences.refresh();
            } catch (ex) {
                this.logger.error('refreshing preferences failed');
                this.logger.error(ex);
            }

            const timePresetId = MailmindrPreferences.getStringPref(
                'common.setMindrDefaultSelectedTimespan'
            );

            this.logger.log(
                `doSetMindrForMsg: timespan loaded: ${timePresetId}`
            );

            if (arguments.length > 1 && arguments[1] !== undefined) {
                this.logger.log(
                    `doSetMindrForMsg: more arguments delivered: ${arguments[1]}`
                );
                timePresetId = arguments[1];
            }

            let action = null;
            const actionJson = MailmindrPreferences.getStringPref(
                'common.action.default'
            );

            if (actionJson.length > 0) {
                try {
                    action = JSON.parse(actionJson);

                    if (action.id === -1) {
                        // 
                        const lastUsedActionJson = MailmindrPreferences.getStringPref(
                            'custom.lastSelectedAction',
                            null
                        );
                        const lastUsedAction = lastUsedActionJson
                            ? JSON.parse(lastUsedActionJson)
                            : null;
                        action = lastUsedAction || action;
                    }
                } catch (e) {
                    this.logger.warn(`error decoding action: *${actionJson}*`);
                    this.logger.error(e);
                    action = null;
                }
            }

            const timespan = getSerializedTimespanFromSettings(timePresetId);
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

            this.doOpenSetMindrDialog(data);
        }

        doOpenSetMindrDialog(data) {
            const dialog = mailmindrCommon.getWindow('mailmindr:setmindr');

            if (dialog) {
                this.logger.log('re-using setMindr dialog');

                dialog.setmindr.focus();
                return;
            }

            // 

            // 
            // 
            try {
                // 
                // 
                // 
                // 
                // 
                // 
                window.openDialog(
                    // 
                    // 
                    'chrome://mailmindr/content/dialogs/setmindr.xul',
                    'setMindr',
                    [
                        'centerscreen=yes',
                        'chrome',
                        'chrome=yes',
                        'dependent=true',
                        'resizeable=false'
                    ].join(','),
                    data
                );
            } catch (x) {
                this.logger.error('exception thrown in set mindr dlg');
                this.logger.error(x);
            }
        }

        doShowMindrNotes(messageId) {
            const mindrs = mailmindrKernel.kernel.currentMindrs || [];
            const mindrsForMessage = mailmindrCore.getMindrsForMessageId(
                mindrs,
                messageId
            );

            const aMindr = mindrsForMessage.length ? mindrsForMessage[0] : null;

            const value = mindrsForMessage
                .map(item => item.details.note || undefined)
                .filter(Boolean)
                .join(', ');
            const show = aMindr != null && value.length > 0;

            const mailmindrNotesHeaderElement = document.getElementById(
                'mailmindrNotes'
            );

            if (!show) {
                mailmindrNotesHeaderElement &&
                    mailmindrNotesHeaderElement.setAttribute(
                        'collapsed',
                        'true'
                    );
                return;
            }

            if (mailmindrNotesHeaderElement) {
                mailmindrNotesHeaderElement.setAttribute('collapsed', 'false');
            } else {
                const notesElement = document.createElement('description');
                notesElement.setAttribute(
                    'style',
                    'word-wrap: auto; margin-left: 0;'
                );
                notesElement.setAttribute('id', 'mailmindrNotesLabelContent');
                notesElement.setAttributeNS(
                    'xmlns',
                    'html',
                    'http://www.w3.org/1999/xhtml'
                );

                const labelText = mailmindrI18n.getString(
                    'mailmindr.overlay.headerview.label.notes'
                );
                this.createHeaderField(
                    'mailmindrNotes',
                    labelText,
                    notesElement
                );
            }

            const labelContent = document.getElementById(
                'mailmindrNotesLabelContent'
            );

            if (labelContent) {
                labelContent.textContent = value;
            }
        }

        /**
         *
         * @param {string} messageId
         */
        doShowMindrSummary(messageId) {
            // 
            // 
            // 
            //
            // 
            // 

            // 
            // 
            // 
            // 

            // 
            // 

            // 
            const mailmindrNotificationBoxId =
                'mailmindrNotificationSingleMessage';
            const view = document.getElementById('singlemessage');
            const msgNotificationBar = document.getElementById(
                'msgNotificationBar'
            );

            const mailmindrNotificationBox = document.getElementById(
                mailmindrNotificationBoxId
            );
            if (view && mailmindrNotificationBox) {
                view.removeChild(mailmindrNotificationBox);
            }

            if (!messageId) {
                return;
            }

            const mailmindrSummary = {};
            XPCOMUtils.defineLazyGetter(
                mailmindrSummary,
                'notificationbox',
                () => {
                    return new MozElements.NotificationBox(element => {
                        // 
                        element.id = mailmindrNotificationBoxId;
                        view.insertBefore(element, msgNotificationBar);
                    });
                }
            );

            const mindrs = mailmindrKernel.kernel.currentMindrs;
            const mindrsForMessage = mailmindrCore.getMindrsForMessageId(
                mindrs,
                messageId
            );

            mindrsForMessage.forEach(item =>
                this.createReminderNotification(
                    mailmindrSummary.notificationbox,
                    item
                )
            );
        }

        doRefreshPendingReminderList(pendingMindrs) {
            const list = document.getElementById('mailmindrPendingList');
            if (!list || !pendingMindrs) {
                return;
            }

            (pendingMindrs || [])
                .sort((mindrA, mindrB) => mindrA.remindat > mindrB.remindat)
                .map(mindr => {
                    const normalizedMindrId = mindr.mailmindrGuid;
                    const element = list.querySelector(
                        `[data-mindr-id='${normalizedMindrId}']`
                    );

                    const updatedElement =
                        (element && updateMindrListViewItem(element, mindr)) ||
                        createMindrListViewItem(mindr, document);
                    list.appendChild(updatedElement);
                });

            [
                ...list.querySelectorAll(
                    `[class='mailmindr-overviewlist-item']`
                )
            ].forEach(item => {
                const matchingMindr = findMindrFromElement(item, pendingMindrs);

                if (!matchingMindr) {
                    item.remove();
                }
            });
        }

        onMailmindrReplyHeightResized() {
            const replyList = document.getElementById(
                'mailmindrPendingListWrapper'
            );
            if (replyList) {
                const height = replyList.getAttribute('height') || null;
                if (height) {
                    mailmindrStorage.setPreference(
                        'custom.uiPendingListHeight',
                        height
                    );
                }
            }
        }

        doShowPendingMindrsList(height) {
            const splitter = document.getElementById(
                'mailmindrPendingListSplitter'
            );
            const pendingListWrapper = document.getElementById(
                'mailmindrPendingListWrapper'
            );
            const windowHasPendingMindrList = Boolean(pendingListWrapper);

            if (!windowHasPendingMindrList) {
                // 
                // 
                // 
                // 
                // 
                return;
            }

            const pendingListSetting = MailmindrPreferences.getIntPref(
                'common.uiShowPendingList'
            );
            const pendingListHeight =
                height ||
                mailmindrStorage.findPreference('custom.uiPendingListHeight') ||
                150;

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

            pendingListWrapper.setAttribute('hidden', pendingListIsHidden);
            if (pendingListHeight) {
                pendingListWrapper.setAttribute('height', pendingListHeight);
            }
            splitter.setAttribute('hidden', pendingListIsHidden);
        }

        getButtonMailHeaderViewLabel(messageId) {
            const mindrs = mailmindrKernel.kernel.currentMindrs;
            const mindrsForMessage = mailmindrCore.getMindrsForMessageId(
                mindrs,
                messageId
            );

            if (!messageId || !mindrsForMessage || !mindrsForMessage.length) {
                return mailmindrI18n.getString(
                    'mailmindr.message.header.view.button.label.add'
                );
            }

            return mailmindrI18n.getString(
                'mailmindr.message.header.view.button.label.edit'
            );
        }

        setMindrWithData(data) {
            const dialog = mailmindrCommon.getWindow('mailmindr:setmindr');
            if (dialog) {
                this.logger.log('recycling setMindr dialog');
                dialog.focus();
            } else {
                // 
                try {
                    window.openDialog(
                        'chrome://mailmindr/content/dialogs/setmindr.xul',
                        'setMindr',
                        'chrome, resizeable=false, dependent=true, chrome=yes, centerscreen=yes',
                        data
                    );
                } catch (x) {
                    this.logger.error('exception thrown in set mindr dlg');
                    this.logger.error(x);
                }
            }
        }

        /**
         * onSelectMessage - triggered when one or more messages in messenger window
         * are selected by the user. In case of only one selected message the routine
         * is looking for the outlook headers. This process is started with the CopyMessage-stuff.
         */
        onSelectMessage(event) {
            this.logger.log('onSelectMessage');

            if (typeof gFolderDisplay === 'undefined') {
                this.logger.warn(
                    `onMessageSelect: gFolderDisplay is not defined.`
                );

                return;
            }

            if (gFolderDisplay && gFolderDisplay.selectedCount != 1) {
                this.logger.log('disable button');
                enableElement(document, 'mailmindrCmdToggleMindr', false);

                return;
            }

            // 
            enableElement(document, 'mailmindrCmdToggleMindr', true);

            // 
            const msgHdr = gFolderDisplay.selectedMessage;

            /**
             * @returns {Array<Mindr>}
             */
            // 
            const getMindrForSelectedMessage = () => {
                try {
                    const mindrList = mailmindrKernel.kernel.currentMindrs; // this._reloadMindrs();
                    const messageId = msgHdr.messageId;
                    const mindrs = mailmindrCore.getMindrsForMessageId(
                        mindrList,
                        messageId
                    );

                    return mindrs;
                } catch (e) {
                    this.logger.error(e);
                    this.logger.error(`cannot get mindrs for selected message`);

                    return null;
                }
            };

            const mindrs = getMindrForSelectedMessage();

            this.logger.log(
                `count mindrs for selected message: ${
                    mindrs && mindrs.length ? mindrs.length : 'none'
                }`
            );

            const label = this.getButtonMailHeaderViewLabel(null);

            if (mindrs && mindrs.length) {
                const messageId = mindrs[0].mailguid;

                this.doShowMindrNotes(messageId);
                this.doShowMindrSummary(messageId);
            } else {
                this.logger.log(`setting empty notes section`);
                this.doShowMindrNotes(null);
                this.doShowMindrSummary(null);
            }

            const button = document.getElementById('MAILMINDR_SET_MINDR_BTN');
            if (button) {
                button.setAttribute('label', label);
            } else {
                this.logger.error(`There's no button in the header`);
            }
        }

        onClickMailmindrEditMindr(mindrGuid) {
            try {
                const mailmindrGuid = mindrGuid; //  || this._viewPendingMindrs.getSelectedMindrGuid();

                if (!mailmindrGuid) {
                    this.logger.log('no mindr selected for edit');
                    return;
                }

                const mindrs = mailmindrKernel.kernel.currentMindrs;
                const mindr = mailmindrCore.getMindrByGuid(
                    mindrs,
                    mailmindrGuid
                );
                const msgGuid = mindr.mailguid;
                const headers = mailmindrSearch.getMessageHdrByMessageId(
                    msgGuid
                );

                if (headers.length == 0) {
                    this.logger.log('cannot edit mindr - the message is gone.');
                    return;
                }

                // 
                const msghdr = headers[0];

                /* calc timespan */
                const delta = mindr.RemainingMilliseconds;
                const ts = calculateDaysHoursMinutes(delta);

                const timespan =
                    ts.days + ';' + ts.hours + ';' + ts.minutes + ';false';
                this.logger.log('edit: ' + timespan);

                const data = {
                    data: {
                        selectedMail: msghdr,
                        selectedTimespan: null,
                        mindr: mindr
                    },
                    out: null
                };

                this.logger.log('show edit mindr dialog');

                this.setMindrWithData(data);
            } catch (editException) {
                this.logger.error(editException);
            }
        }

        onClickMailmindrDeleteMindr(mindrGuid) {
            const mailmindrGuid = mindrGuid;

            if (null == mailmindrGuid) {
                return;
            }

            const mindrs = mailmindrKernel.kernel.currentMindrs;
            const mindr = mailmindrCore.getMindrByGuid(mindrs, mailmindrGuid);

            const promptService = Components.classes[
                '@mozilla.org/embedcomp/prompt-service;1'
            ].getService(Components.interfaces.nsIPromptService);

            const title = mailmindrI18n.getString(
                'mailmindr.overlay.mindr.delete.title'
            );
            const text = mailmindrI18n.getString(
                'mailmindr.overlay.mindr.delete.text'
            );

            if (promptService.confirm(null, title, text)) {
                mailmindrKernel.kernel.deleteMindr(mindr);
                mailmindrKernel.kernel.onTick();
                // 
                // 
                // 
                // 
                // 
                // 
            }
        }
    };

var mailmindr = mailmindr || new MailmindrUI(window);
