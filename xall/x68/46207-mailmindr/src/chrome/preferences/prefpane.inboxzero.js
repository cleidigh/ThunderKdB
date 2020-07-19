'use strict';

var { mailmindrLogger } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/logger.jsm'
);
var { mailmindrCommon } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/common.jsm'
);
var { mailmindrCore } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/core.jsm'
);
var { mailmindrI18n } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/i18n.jsm'
);
var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');

var mailmindrPrefPaneInboxZero = {
    _initialized: false,
    _name: 'prefPane.InboxZero',
    _logger: null,
    _data: [],

    initialize: function() {
        this._logger = new mailmindrLogger(this);
        try {
            this._logger.log('initialize : prefpane.inboxzero.js');

            this._inboxMappingList = document.getElementById(
                'mailmindrInboxZeroMappingList'
            );

            this.refresh();

            // 
            let accounts = mailmindrCore.getAccounts();
            this._createListMarkup(accounts);

            this._initialized = true;
        } catch (initException) {
            this._logger.error(initException);
        }
    },

    refresh: function() {
        if (!this._initialized) {
            return;
        }

        this._logger.log('[SUCCESS] refresh of prefpane.common');
    },

    _createListMarkup: function(accountList) {
        const rows = this._inboxMappingList;

        let index = 0;
        for (let account of accountList) {
            if (account.isLocal) {
                this._logger.log(`>>> local account: ${account.displayName}`);
                // 

                continue;
            }

            let row = document.createElement('row');

            let labelElement = document.createElement('label');
            labelElement.setAttribute('value', account.displayName);

            let pickerElement = document.createElement('menulist');
            pickerElement.setAttribute('id', 'picker-' + index);
            pickerElement.setAttribute('data-hash', account.key);

            this._createFolderPicker(pickerElement, account.key);

            row.appendChild(labelElement);
            row.appendChild(pickerElement);
            rows.appendChild(row);

            mailmindrCommon.listAllFolders(pickerElement, '', account.account);

            index++;
        }
    },

    _createFolderPicker: function(parent, pickerId) {
        let popup = document.createElement('menupopup');
        let emptyItem = document.createElement('menuitem');
        let emptyLabel = mailmindrI18n.getString(
            'mailmindr.prefpane.inboxzero.selectfolder.label'
        );
        emptyItem.setAttribute('label', emptyLabel);
        emptyItem.setAttribute('value', '');

        popup.appendChild(emptyItem);
        parent.appendChild(popup);
    },

    _getPickerForKeyHash: function(hash) {
        const selector = 'menulist[data-hash="' + key + '"]';
        return this._inboxMappingList.querySelector(selector);
    },

    savePreferences: function() {
        let selector = 'menulist';
        let elements = this._inboxMappingList.querySelectorAll(selector);

        let accounts = [];
        let data = {};

        this._logger.log('found items: ' + elements.length);

        for (let element of elements) {
            if (element == null || !(element instanceof XULMenuElement)) {
                continue;
            }

            let key = element.getAttribute('data-hash');
            accounts.push(key);

            let item = {
                key: key || 'mailmindr:global',
                folderURI: element.value,
                folderDisplayName: element.label.trim()
            };

            data[key] = item;
        }

        let serializedData = JSON.stringify(data);
        let serializedAccounts = JSON.stringify(accounts);

        try {
            mailmindrCore.writePreference(
                'common.inboxZeroAccounts',
                serializedAccounts
            );
            mailmindrCore.writePreference(
                'common.inboxZeroPreferences',
                serializedData
            );
        } catch (ex) {
            this._logger.error(`saving preferences failed`);
            this._logger.error(ex);
        }
    },

    loadPreferences: function() {
        this._logger.log('loading preferences - inbox');
        const serializedAccounts = mailmindrCore.readPreference(
            'common.inboxZeroAccounts',
            ''
        );
        const serializedData = mailmindrCore.readPreference(
            'common.inboxZeroPreferences',
            ''
        );

        const keys =
            serializedAccounts.length > 0 ? JSON.parse(serializedAccounts) : [];
        let data = serializedData.length > 0 ? JSON.parse(serializedData) : {};

        for (let key of keys) {
            this._logger.log(`loadPreferences key '${key}' of ${keys}`);
            const item = data[key];
            this._logger.log(
                `loadPreferences key '${key}' resolved to item: '${item}', folder: '${item &&
                    item.folderURI}'`
            );

            if (typeof item === undefined) {
                this._logger.warn(`data item is undefined`);
                continue;
            }

            let selector = 'menulist[data-hash="' + key + '"]';
            let target = this._inboxMappingList.querySelector(selector);
            if (target) {
                this._logger.log(
                    `trying to set value ${item && item.folderURI} to ${target}`
                );
                mailmindrPreferencesDialog.setValueToElement(
                    target,
                    item.folderURI
                );

                if (target.selectedIndex < 0) {
                    target.value = '';
                }
            }
        }
    }
};
