/* jshint curly: true, strict: true, multistr: true, moz: true, undef: true, unused: true */
/* global Components, mailmindrLogger, mailmindrSearch */
"use strict";

if (!mailmindr) var mailmindr = {};
if (!mailmindr.dialogs) mailmindr.dialogs = {};

Components.utils.import("resource://mailmindr/legacy/logger.jsm");
Components.utils.import("resource://mailmindr/legacy/storage.jsm");
Components.utils.import("resource://mailmindr/legacy/factory.jsm");
Components.utils.import("resource://mailmindr/legacy/common.jsm");
Components.utils.import("resource://mailmindr/localisation.jsm");
Components.utils.import("resource://mailmindr/stringUtils.jsm");

mailmindr.dialogs.timeSpanEditor = {
    _logger: null,
    _currentTimespan: null,
    _elements: {
        timespanTypePicker: null,
        fixedTimePicker: null,
        timeSpanName: null,
        days: null,
        hours: null,
        minutes: null,
        fixedDays: null,
        autoRenameCheckbox: null
    },

    onLoad: function() {
        this.Initialize();
    },

    Initialize: function() {
        this._name = "timespanEditorDialog";
        this._logger = new mailmindrLogger(this);
        this._logger.log('init start.');
        try {
            this._elements.autoRenameCheckbox = document.getElementById('mailmindrAutoRename');
            this._elements.timeSpanName = document.getElementById("mailmindrTimespanName");
            this._elements.timespanTypePicker = document.getElementById("mailmindrTimespanTypePicker");
            this._elements.fixedTimePicker = document.getElementById("mailmindrFixedTimePicker");
            this._elements.fixedDays = document.getElementById('mailmindrTimespanDaysFixed');
            this._elements.days = document.getElementById('mailmindrTimespanDays');
            this._elements.hours = document.getElementById('mailmindrTimespanHours');
            this._elements.minutes = document.getElementById('mailmindrTimespanMinutes');
            this._elements.buttonAccept = document.documentElement.getButton("accept");;

            var timespan = window.arguments[0];
            this._logger.log('>> given timespan: ' + typeof timespan.id);

            if ("undefined" == typeof timespan.id) {
                this._logger.log('NEW timespan');
                this._elements.autoRenameCheckbox.setAttribute('checked', 'true');
                this._currentTimespan = {
                    id: -1,
                    days: 0,
                    hours: 0,
                    minutes: 0,
                    name: this.getString('mailmindr.timespaneditor.NoName')
                };
                this._elements.fixedTimePicker.value = "09:00";
            } else {
                this._logger.log('EDIT timespan');
                this._currentTimespan = timespan;
            }

            this.resize();

            this.displayTimespan(this._currentTimespan);

            let scope = this;

            this._elements.timespanTypePicker.addEventListener('select', function(event) {
                scope.onSelectTimespanType();
            }, false);

            let edits = [
                this._elements.timespanTypePicker,
                this._elements.fixedTimePicker,
                this._elements.fixedDays,
                this._elements.days,
                this._elements.hours,
                this._elements.minutes,
                this._elements.autoRenameCheckbox,
                this._elements.timeSpanName
            ];

            for (let item of edits) {
                item.addEventListener('command', function() {
                    scope.onNotifyChange();
                }, false);
                item.addEventListener('change', function() {
                    scope.onNotifyChange();
                }, false);
            }

            this._logger.log('init end.');
        } catch (exx) {
            this._logger.error(exx);
        }
    },

    resize: function() {
        window.sizeToContent();
    },

    encodeTimespan: function() {
        let result = {};
        try {
            result = mailmindrFactory.createTimespan();
            result.id = this._currentTimespan.id;
            result.text = document.getElementById('mailmindrTimespanName').value;
            result.days = this._getDays();
            result.hours = this._getHours();
            result.minutes = this._getMinutes();
            result.isFixedTime = this._isFixed();
            result.isGenerated = false;
        } catch (encodingException) {
            this._logger.error(encodingException);
        }

        return result;
    },

    toStringTimespan: function(ts) {

    },

    displayTimespan: function(ts) {
        this._logger.log('call displayTimespan');
        this._logger.log('> ' + ts.text);
        document.getElementById('mailmindrTimespanName').value = ts.text;
        document.getElementById('mailmindrTimespanDaysFixed').value = ts.days;
        document.getElementById('mailmindrTimespanDays').value = ts.days;

        if (ts.isFixedTime) {
            let timestamp = ts.hours + ":" + ts.minutes;
            this._elements.fixedTimePicker.value = timestamp;
            this._elements.timespanTypePicker.value = "fix";
        } else {
            document.getElementById('mailmindrTimespanHours').value = ts.hours;
            document.getElementById('mailmindrTimespanMinutes').value = ts.minutes;
            this._elements.timespanTypePicker.value = "relative";
        }

        this.onSelectTimespanType();

        if (this.getAutoName() == ts.text) {
            this._logger.log('set chckbox TO CHECKED');
            this._elements.autoRenameCheckbox.setAttribute('checked', 'true');
        }
    },

    getString: function(identifier) {
        return mailmindrI18n.getString(identifier);
        // 
        // 
    },

    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 
    // 

    _getNumeric: function(id, defaultValue) {
        var value = document.getElementById(id).value;
        if (isNaN(value * 1)) {
            return defaultValue;
        }
        return value * 1;
    },

    /**
     * can set name for timespan, e.g. when the 'name' field is
     * empty or
     */
    _canRename: function() {
        return this._elements.autoRenameCheckbox.hasAttribute('checked') && this._elements.autoRenameCheckbox.getAttribute('checked') == 'true';
    },

    _isFixed: function() {
        return this._elements.timespanTypePicker.value == "fix";
    },

    _getDays: function() {
        if (this._isFixed()) {
            return this._getNumeric("mailmindrTimespanDaysFixed", 0);
        }

        return this._getNumeric("mailmindrTimespanDays", 0);
    },

    _getHours: function() {
        if (this._isFixed()) {
            return this._elements.fixedTimePicker.hour;
        }
        return this._getNumeric('mailmindrTimespanHours', 0);
    },

    _getMinutes: function() {
        if (this._isFixed()) {
            return this._elements.fixedTimePicker.minute;
        }
        return this._getNumeric('mailmindrTimespanMinutes', 0);
    },

    onDialogAccept: function() {
        let data = this.encodeTimespan();
        if (this._currentTimespan.id < 0) {
            data = mailmindrStorage.saveTimespan(data) ? data : null;
        } else {
            data = mailmindrStorage.updateTimespan(data) ? data : null;
        }
        window.arguments[0].out = {
            button: 'accept',
            result: data
        };
        return true;
    },

    onDialogCancel: function() {
        window.arguments[0].out = null;
        return true;
    },

    onSelectTimespanType: function() {
        let selectedType = this._elements.timespanTypePicker.value;
        let panels = document.getElementsByClassName('mailmindr-js-timespanTypePanel');
        for (var i = panels.length - 1; i >= 0; i--) {
            panels[i].hidden = true;
        }

        document.getElementById('mailmindrTimespanType-' + selectedType).hidden = false;
        this.onNotifyChange();
    },

    getAutoName: function() {
        let current = this.encodeTimespan();
        return MailmindrStringUtils.capitalize(current.toRelativeString());
    },

    onNotifyChange: function() {
        if (this._canRename()) {
            let name = this.getAutoName();
            this._elements.timeSpanName.disabled = true;
            this._elements.timeSpanName.value = name;
        } else {
            this._elements.timeSpanName.disabled = false;
        }

        this._elements.buttonAccept.disabled = !this.isValid();
    },

    isValid: function() {
        let current = this.encodeTimespan();
        let text = this._elements.timeSpanName.value;
        let isNameOk = text.trim().length > 0;

        if (current.isFixedTime && isNameOk) {
            return true;
        }

        return isNameOk && (current.days > 0 || current.hours > 0 || current.minutes > 0);
    }
};

window.addEventListener("load", function() {
	mailmindr.dialogs.timeSpanEditor.onLoad();
}, false);
