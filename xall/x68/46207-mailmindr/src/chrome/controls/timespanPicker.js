/* jshint curly: true, strict: true, multistr: true, moz: true, undef: true, unused: true */
/* global Components, mailmindrLogger, mailmindrSearch */
'use strict';

if (!mailmindr) var mailmindr = {};
if (!mailmindr.controls) mailmindr.controls = {};

var { mailmindrCore } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/core.jsm'
);
var { mailmindrFactory } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/factory.jsm'
);
var { mailmindrLogger } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/logger.jsm'
);
var { mailmindrStorage } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/storage.jsm'
);
var { MailmindrPreferences } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/preferences.jsm'
);

mailmindr.controls.TimespanPicker = function TimespanPicker(
    spanCombo,
    datePicker,
    timePicker,
    options
) {
    this._name = 'controls.TimespanPicker';
    this._logger = new mailmindrLogger(this);

    // 
    this._elements = {
        timespans: spanCombo,
        datePicker: datePicker,
        timePicker: timePicker
    };

    // 
    let timespans = [];
    let preference = MailmindrPreferences.getIntPref('common.showTimespans');
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
        this._logger.log(
            'loaded: ' + userdefined.length + ' user defined timespans'
        );
        timespans = timespans.concat(userdefined);
    }

    this._logger.log(timespans.length + ' timespans loaded.');

    if (options && options.canBeUserDefined) {
        timespans.splice(0, 0, mailmindrFactory.createTimespan(-1));
    }

    if (options && options.canBeDeactivated) {
        timespans.splice(0, 0, mailmindrFactory.createTimespan(0));
    }

    // 
    this._elements.timespans.removeAllItems();

    for (let timespan of timespans) {
        let serialized = timespan.serialize();
        let text = timespan.text;

        this._logger.log('adding: ' + text + '//' + serialized);
        this._elements.timespans.appendItem(text, serialized);
    }

    // 

    var initialPickerValue = new Date();
    this._logger.log(
        'setting datetimepicker initial value: ' + initialPickerValue
    );
    try {
        this._logger.log(
            'timepicker element set? ' + this._elements.timePicker
        );

        this._elements.datePicker.value = initialPickerValue;
        this._elements.timePicker.value = [
            initialPickerValue.getHours(),
            initialPickerValue.getMinutes()
        ];
    } catch (x) {
        this._logger.error(x);
    }
    this._logger.log('initial value set.');

    this.setEventListeners(spanCombo, datePicker, timePicker);
};

mailmindr.controls.TimespanPicker.prototype = {
    get dateValue() {
        return this.getDateTime();
    },

    getDateTime: function() {
        const result = new Date();
        const date = this._elements.datePicker.value;
        const [hours, minutes] = this._elements.timePicker.value;

        result.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
        result.setHours(hours, minutes, 0, 0);

        return result;
    },

    setEventListeners: function(timespanPicker, datePicker, timePicker) {
        var scope = this;
        timespanPicker.addEventListener(
            'select',
            () => {
                this.onSelectTimespan(scope);
            },
            false
        );

        // 
        datePicker.addEventListener(
            'change',
            sender =>
                this.onChangeDateTimePicker(
                    sender,
                    timespanPicker,
                    datePicker,
                    timePicker
                ),
            false
        );

        // 
        timePicker.addEventListener(
            'change',
            sender =>
                this.onChangeDateTimePicker(
                    sender,
                    timespanPicker,
                    datePicker,
                    timePicker
                ),
            false
        );
    },

    /**
     * onSelectTimespan - triggers when timespan has selected
     * sets the calculated date and time when resubmission will be triggered
     */
    onSelectTimespan: function(target) {
        let value = target._elements.timespans.value;
        let timepicker = target._elements.timePicker;
        let datepicker = target._elements.datePicker;
        this.setTimespan(value, timepicker, datepicker);
    },

    setTimespan: function(value, timepicker, datepicker) {
        try {
            const eventTime = this.calculateDateTimeFromSerializedTimespan(
                value
            );

            if (eventTime) {
                const tpValue = [eventTime.getHours(), eventTime.getMinutes()];

                this._logger.log('set ' + tpValue);
                timepicker.setAttribute('data-skip-event-handler', 'true');
                timepicker.value = tpValue;

                this._logger.log('set ' + eventTime);
                datepicker.setAttribute('data-skip-event-handler', 'true');
                datepicker.value = eventTime;

                timepicker.removeAttribute('data-skip-event-handler');
                datepicker.removeAttribute('data-skip-event-handler');
            }
        } catch (exception) {
            this._logger.error('setTimespan');
            this._logger.error(exception);
        }
    },

    setDateTime: function(dateTime) {
        if (dateTime instanceof Date) {
            this._elements.datePicker.value = dateTime;
            this._elements.timePicker.value = [
                dateTime.getHours(),
                dateTime.getMinutes()
            ];
        } else {
            console.error(
                `not a valid date/time value for timespan picker: '${dateTime}`
            );
        }
    },

    calculateDateTimeFromSerializedTimespan: function(serializedTimeSpan) {
        let now = Date.now();
        const timespan = serializedTimeSpan.split(';');

        try {
            if (
                timespan.length >= 3 &&
                timespan[0] >= 0 &&
                timespan[1] >= 0 &&
                timespan[2] >= 0
            ) {
                const days = timespan[0] * 24 * 60 * 60 * 1000;

                if (timespan[3] == 'true') {
                    this._logger.log('TSE > set fixed time');
                    now = now + days;
                    let d = new Date(now);
                    d.setHours(
                        Number.parseInt(timespan[1], 10),
                        Number.parseInt(timespan[2], 10),
                        0,
                        0
                    );
                    now = d.valueOf();
                    if (now < Date.now()) {
                        now += 1 * 24 * 60 * 60 * 1000;
                    }
                } else {
                    now =
                        now +
                        days /* add days */ +
                        timespan[1] * 60 * 60 * 1000 /* add hours */ +
                        timespan[2] * 60 * 1000; /* add minutes */
                }

                const eventTime = new Date(now);

                return eventTime;
            }
        } catch (exception) {
            this._logger.error('setTimespan');
            this._logger.error(exception);
        }

        return null;
    },

    /**
     * onChangedatePicker - triggered when datepicker has changed
     * should set the timespan combo to "user defined"
     */
    onChangeDateTimePicker: function(
        sender,
        timespanPicker,
        datePicker,
        timePicker
    ) {
        if (
            sender &&
            sender.target &&
            sender.target.hasAttribute &&
            sender.target.hasAttribute('data-skip-event-handler')
        ) {
            return;
        }

        const defaultPreset = '-1;-1;-1;false';
        const selectedPreset = timespanPicker.value;

        if (selectedPreset === defaultPreset) {
            return;
        }

        const date = datePicker.value;
        const time = timePicker.value;
        const calculatedDueDateTime = this.calculateDateTimeFromSerializedTimespan(
            selectedPreset
        );

        if (
            time[0] === calculatedDueDateTime.getHours() &&
            time[1] === calculatedDueDateTime.getMinutes() &&
            date.getFullYear() === calculatedDueDateTime.getFullYear() &&
            date.getMonth() === calculatedDueDateTime.getMonth() &&
            date.getDate() === calculatedDueDateTime.getDate()
        ) {
            return;
        }

        timespanPicker.value = defaultPreset;
    }
};
