"use strict";

Components.utils.import("resource://gre/modules/PromiseUtils.jsm");
Components.utils.import("resource://mailmindr/legacy/logger.jsm");
Components.utils.import("resource://mailmindr/legacy/common.jsm");
Components.utils.import("resource://mailmindr/legacy/core.jsm");
Components.utils.import("resource://mailmindr/legacy/storage.jsm");

var mailmindrPrefPaneCommon = {
    _name: "prefPane.Common",
    _logger: null,
    _initialized: false,
    _elements: {},
    _controls: {},

    initialize: function() {
        this._logger = new mailmindrLogger(this);
        try {
            this._logger.log('initialize : prefpane.common.js');
            
            this._elements.tagSelector = document.getElementById("mailmindrOnTagSelector");
            this._elements.tagTimespanSelector = document.getElementById("mailmindrOnTagTimespanSelector");

            this._elements.defaultTimespanSelector = document.getElementById("mailmindrDefaultTimespanSelector");
            this._elements.defaultActionSelector = document.getElementById("mailmindrDefaultActionSelector");

            this._elements.targetFolderIncoming = document.getElementById("mailmindrTargetFolderIncoming");
            this._elements.targetFolderSent = document.getElementById("mailmindrTargetFolderSent");
            this._elements.inboxZeroLaterFolder = document.getElementById("mailmindrInboxZeroLaterFolder");

            this._controls.defaultAction = new mailmindr.controls.ActionPicker(
                    this._elements.defaultActionSelector,
                    { canBeDeactivated: true }
                );

            this._initialized = true;
            this.refresh();
        } catch (exception) {
            this._logger.error('messup on preferences detected');
            this._logger.error(exception);
        }

    },

    doRefreshAll : function() {
        let panes = [mailmindrPrefPaneCommon, mailmindrPrefPaneInboxZero, mailmindrPrefPaneTimespan];
        for (let pane of panes) {
            pane.refresh();
        }
    },

    refresh: function() {
        if (!this._initialized) {
            // 
            return; 
        }
        
        // 
        mailmindrCommon.fillTags(this._elements.tagSelector, 0, MailmindrPreferences.getStringPref("common.setMindrOnTagSelectedTag"));

        try {
            mailmindrCommon.listAllFolders(this._elements.targetFolderIncoming);
            mailmindrCommon.listAllFolders(this._elements.targetFolderSent);
            mailmindrCommon.listAllFolders(this._elements.inboxZeroLaterFolder);
        } catch (exce) {
            this._logger.error(exce);
        }

        // 
        let folderIncoming = MailmindrPreferences.getStringPref("common.targetFolderIncoming");
        let folderSent = MailmindrPreferences.getStringPref("common.targetFolderSent");
        let inboxZeroLaterFolder = MailmindrPreferences.getStringPref("common.inboxZeroLaterFolder");
        let onTagSetTimespan = MailmindrPreferences.getStringPref("common.setMindrOnTagSelectedTimespan");
        let defaultTimespan = MailmindrPreferences.getStringPref("common.setMindrDefaultSelectedTimespan");

        let serializedDefaultAction = MailmindrPreferences.getStringPref("common.action.default");
        let defaultAction = null;
        if (serializedDefaultAction.length > 2) {
            defaultAction = JSON.parse(serializedDefaultAction);
        }

        this._elements.targetFolderIncoming.value = folderIncoming;
        this._elements.targetFolderSent.value = folderSent;
        this._elements.inboxZeroLaterFolder.value = inboxZeroLaterFolder;

        let timespans = mailmindrCore.createSystemTimespans();
        timespans = timespans.concat(mailmindrStorage.loadTimespans());

        this._elements.tagTimespanSelector.removeAllItems();
        this._elements.defaultTimespanSelector.removeAllItems();

        this._controls.defaultAction.Action = defaultAction;

        for (let timespan of timespans) {
            let key = timespan.id;
            if (timespan.isGenerated) {
                key = '#' + timespan.serialize();
            }
            this._elements.tagTimespanSelector.appendItem(timespan.text, key);
            this._elements.defaultTimespanSelector.appendItem(timespan.text, key);
        }

        this._elements.tagTimespanSelector.value = onTagSetTimespan;
        this._elements.defaultTimespanSelector.value = defaultTimespan;

        for (let element of [this._elements.tagTimespanSelector, this._elements.defaultTimespanSelector]) {
            if (element.selectedIndex < 0) {
                element.selectedIndex = 0;
            }
        }

        this._logger.log('[SUCCESS] refresh of prefpane.common');
    },

    get elements() {
        return document.querySelectorAll('#mailmindrCommonPreferencePanel [data-preference]') || [];
    },

    getPreferenceMapping: function(preference) {
        const mapping = mailmindrPreferencesDialog && mailmindrPreferencesDialog.dataMapping && mailmindrPreferencesDialog.dataMapping[preference];
        if (!Boolean(mapping)) {
            return null;
        }
        
        return mapping;
    },

    loadPreferences: async function() {
        this._logger.log('loading preferences - common');
        const elements = this.elements;
        elements.forEach(element => {
            const attribute = element.getAttribute('data-preference');
            const preference = attribute.valueOf();
            const mapping = this.getPreferenceMapping(preference);
            if (!Boolean(mapping)) {
                return;
            }

            const { name } = mapping;
            const prefName = name.substring('extensions.mailmindr.'.length);

            const value = mailmindrCore.readPreference(prefName);
            this._logger.log(`>>>  loadPref  ${prefName} :: ${value}`);

            if (prefName.indexOf('common.action.default') >= 0) {
                this._controls.defaultAction.Action = JSON.parse(value);
            } else if (value !== undefined) {
                this._logger.log(`loaded >> ${prefName} :: set to :: '${value}' using element '${element}'`);
                mailmindrPreferencesDialog.setValueToElement(element, value);
            }
        });
        // 
    },

    savePreferences: function() {
        this.elements.forEach(element => {
            const attribute = element.getAttribute('data-preference');
            const preference = attribute.valueOf();
            const mapping = this.getPreferenceMapping(preference);
            if (!Boolean(mapping)) {
                return;
            }

            const { name } = mapping;
            const prefName = name.substring('extensions.mailmindr.'.length);

            let value = undefined;
            if (element.localName === 'checkbox') {
                if (element.hasAttribute('checked')) {
                    value = true;
                } else {
                    value = false;
                }
            } else {
                value = element.value;
            }
            // 

            this._logger.log(`get pref  :: ${prefName}: '${value}'`);
            value = String(value).trim();
            // 
            this._logger.log(`save pref :: ${prefName}: '${value}'`);
            mailmindrCore.writePreference(prefName, value);
            // 

            // 
            // 
        });
    }
};