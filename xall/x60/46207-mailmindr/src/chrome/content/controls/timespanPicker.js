/* jshint curly: true, strict: true, multistr: true, moz: true, undef: true, unused: true */
/* global Components, mailmindrLogger, mailmindrSearch */
"use strict";

if (!mailmindr) var mailmindr = {};
if (!mailmindr.controls) mailmindr.controls = {};

Components.utils.import("resource://mailmindr/legacy/core.jsm");
Components.utils.import("resource://mailmindr/legacy/factory.jsm");
Components.utils.import("resource://mailmindr/legacy/logger.jsm");
Components.utils.import("resource://mailmindr/legacy/storage.jsm");
Components.utils.import("resource://mailmindr/preferences.jsm");

mailmindr.controls.TimespanPicker = function TimespanPicker(spanCombo, datePicker, timePicker, options) {
    this._name = "controls.TimespanPicker";
    this._logger = new mailmindrLogger(this);

    // 
    this._elements = {
        timespans: spanCombo,
        datePicker: datePicker,
        timePicker: timePicker
    };

    // 
    this._events = {
        onSelectTimespan: []
    };

    // 
    let timespans = [];
    let preference = MailmindrPreferences.getIntPref("common.showTimespans");
    this._logger.log('pref -> ' + preference);

    const systemOnly = preference == 0;
    const userDefinedOnly = preference == 1;
    const systemAndUserDefined = preference == 2;

    if (systemOnly || systemAndUserDefined) {
        // 
        this._logger.log('loading system timespans');
        timespans = timespans.concat(mailmindrCore.createSystemTimespans());
    }

    if (userDefinedOnly || systemAndUserDefined) {
        // 
        this._logger.log('loading user defined timespans');
        let userdefined = mailmindrStorage.loadTimespans();
        this._logger.log('loaded: ' + userdefined.length + ' user defined timespans');
        timespans = timespans.concat(userdefined);
    }

    this._logger.log(timespans.length + ' timespans loaded.');

    if (options && options.canBeUserDefined) {
        timespans.splice(
            0,
            0,
            mailmindrFactory.createTimespan(-1)
        );
    }

    if (options && options.canBeDeactivated) {
        timespans.splice(
            0,
            0,
            mailmindrFactory.createTimespan(0)
        );
    }


    // 
    this._elements.timespans.removeAllItems();

    for (let timespan of timespans) {
        let serialized = timespan.serialize();
        let text = timespan.text;

        this._logger.log('adding: ' + text + "//" + serialized);
        this._elements.timespans.appendItem(text, serialized);
    }

    // 
    
    var initialPickerValue = new Date();
    this._logger.log('setting datetimepicker initial value: ' + initialPickerValue);
    try {
        this._logger.log('timepicker element set? ' + this._elements.timePicker);
        //this._elements.timePicker.dateValue = initialPickerValue;
        let dpValue = initialPickerValue.getFullYear()+ '-' + (initialPickerValue.getMonth() + 1) + '-' + initialPickerValue.getDate();

        this._elements.datePicker.value = dpValue;
        this._elements.timePicker.value = initialPickerValue.getHours() + ':' + initialPickerValue.getMinutes();
    } catch (x) {
        this._logger.error(x);
    }
    this._logger.log('initial value set.');

    this.setEventListeners();
}

mailmindr.controls.TimespanPicker.prototype = {

    get dateValue() {
        return this.getDateTime();
    },


    getDateTime: function() {
        let result = new Date();
        let date = this._elements.datePicker.dateValue;
        let time = this._elements.timePicker.dateValue;

        result.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        result.setHours(time.getHours(), time.getMinutes(), 0, 0);

        return result;
    },


    setEventListeners: function() {
        var scope = this;
        this._elements.timespans.addEventListener("select", function() {
            scope.onSelectTimespan(scope);
        }, false);

        // 
        this._elements.datePicker.addEventListener("change", function() {
            scope.onChangeDatePicker(scope);
        }, false);

        // 
        this._elements.timePicker.addEventListener("change", function() {
            scope.onChangeTimePicker(scope);
        }, false);
    },


    /**
     * onSelectTimespan - triggers when timespan has selected
     * sets the calculated date and time when resubmission will be triggered
     */
    onSelectTimespan: function(target) {
        let value = target._elements.timespans.value;
        let timepicker = target._elements.timePicker;
        let datepicker = target._elements.datePicker;
        this.setTimespan(value, timepicker, datepicker)

        // 
        this.triggerOnSelectTimespan();
    },

    setTimespan: function(value, timepicker, datepicker) {

        function getInt(text) {
            if (Number.parseInt) {
                return Number.parseInt(text, 10);
            }

            return parseInt(text);
        }

        let now = Date.now();
        let timespan = value.split(';');

        // 
        // 

        try {
            if (
                (timespan.length >= 3) && (timespan[0] >= 0 && timespan[1] >= 0 && timespan[2] >= 0)) {
                let days = timespan[0] * 24 * 60 * 60 * 1000;

                if (timespan[3] == 'true') {
                    this._logger.log('TSE > set fixed time');
                    now = now + days;
                    let d = new Date(now);
                    d.setHours(getInt(timespan[1]), getInt(timespan[2]), 0, 0);
                    now = d.valueOf();
                    if (now < Date.now()) {
                        now += 1 * 24 * 60 * 60 * 1000;
                    }
                } else {
                    now = now + days /* add days */ + timespan[1] * 60 * 60 * 1000 /* add hours */ + timespan[2] * 60 * 1000; /* add minutes */
                }

                let eventTime = new Date(now);
                let tpValue = eventTime.getHours() + ':' + eventTime.getMinutes();
                let dpValue = eventTime.getFullYear()+ '-' + (eventTime.getMonth() + 1) + '-' + eventTime.getDate();

                this._logger.log('set ' + tpValue);
                timepicker.value = tpValue;

                this._logger.log('set ' + dpValue);
                datepicker.value = dpValue;
            }
        } catch (exception) {
            this._logger.error('setTimespan');
            this._logger.error(exception);
        }
    },


    setDateTime: function(dateTime) {
        //this._elements.datePicker.dateValue = dateTime;
        //this._elements.timePicker.dateValue = dateTime;
        let dpValue = dateTime.getFullYear()+ '-' + (dateTime.getMonth() + 1) + '-' + dateTime.getDate();

        this._elements.datePicker.value = dpValue;
        this._elements.timePicker.value = dateTime.getHours() + ':' + dateTime.getMinutes();

    },


    /**
     * onChangedatePicker - triggered when datepicker has changed
     * should set the timespan combo to "user defined"
     */
    onChangeDatePicker: function(target) {
        target._elements.timespans.value = "-1;-1;-1;false";

        // 
        target.triggerOnSelectTimespan();
    },


    /**
     * onChangeTimePicker - triggerer when timepicker has changed
     * call onChangeDatePicker to raise the same action
     */
    onChangeTimePicker: function(target) {
        target.onChangeDatePicker(target);
    },


    /**
     * triggerOnSelectTimespan - triggers all registered event handlers for
     * event 'selectTimespan'
     */
    triggerOnSelectTimespan: function() {
        let dateTime = this.getDateTime();

        for (let trigger of this._events.onSelectTimespan) {
            trigger(dateTime);
        }
    },


    /**
     * addEventListener - adds the given trigger to the events trigger chain.
     * @returns bool True, if event can be pushed to trigger chain, false otherwise
     */
    addEventListener: function(event, trigger) {
        switch (event) {
            case "selectTimespan":
                this._events.onSelectTimespan.push(trigger);
                return true;
                break;
        }

        return false;
    }

};
