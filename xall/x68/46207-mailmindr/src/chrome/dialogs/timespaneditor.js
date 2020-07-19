/* jshint curly: true, strict: true, multistr: true, moz: true, undef: true, unused: true */
/* global Components, mailmindrLogger, mailmindrSearch */
'use strict';

if (!mailmindr) var mailmindr = {};
if (!mailmindr.dialogs) mailmindr.dialogs = {};

var { mailmindrLogger } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/logger.jsm'
);
var { mailmindrStorage } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/storage.jsm'
);
var { mailmindrFactory } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/factory.jsm'
);
var { mailmindrCommon } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/common.jsm'
);
var { mailmindrI18n } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/i18n.jsm'
);
var { MailmindrStringUtils } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/stringUtils.jsm'
);

const elements = {};
const _logger = new mailmindrLogger({ _name: 'timeSpanEditor' });

let _currentTimespan;

function _getNumeric(id, defaultValue) {
    const value = document.getElementById(id).value;
    if (isNaN(value * 1)) {
        return defaultValue;
    }
    return value * 1;
}

function getAutoName() {
    const current = getTimespan();
    return MailmindrStringUtils.capitalize(current.toRelativeString());
}

/**
 * can set name for timespan, e.g. when the 'name' field is
 * empty or
 */
function _canRename() {
    return Boolean(
        elements.autoRenameCheckbox.hasAttribute('checked') &&
            elements.autoRenameCheckbox.getAttribute('checked') === 'true'
    );
}

function _isFixed() {
    const isFixed = selectTimeSpanType() === 'fix';
    // 

    return isFixed;
}

function _getDays() {
    if (_isFixed()) {
        return _getNumeric('mailmindrTimespanDaysFixed', 0);
    }
    return _getNumeric('mailmindrTimespanDays', 0);
}

function _getFixedTimeHourAndMinute() {
    const now = new Date();
    const hoursAndMinute = elements.fixedTimePicker.value || [
        now.getHours(),
        now.getMinutes()
    ];

    return hoursAndMinute;
}

function _getHours() {
    if (_isFixed()) {
        return _getFixedTimeHourAndMinute()[0];
    }
    return _getNumeric('mailmindrTimespanHours', 0);
}

function _getMinutes() {
    if (_isFixed()) {
        return _getFixedTimeHourAndMinute()[1];
    }
    return _getNumeric('mailmindrTimespanMinutes', 0);
}

function isValid() {
    const current = getTimespan();
    const text = elements.timeSpanName.value;
    const isNameOk = text.trim().length > 0;

    if (current.isFixedTime && isNameOk) {
        return true;
    }

    return (
        isNameOk &&
        (current.days > 0 || current.hours > 0 || current.minutes > 0)
    );
}

function getString(identifier) {
    return mailmindrI18n.getString(identifier);
}

function getTimespan() {
    try {
        const result = mailmindrFactory.createTimespan();

        result.id = _currentTimespan.id;
        result.text = document.getElementById('mailmindrTimespanName').value;
        result.days = _getDays();
        result.hours = _getHours();
        result.minutes = _getMinutes();
        result.isFixedTime = _isFixed();
        result.isGenerated = false;

        return result;
    } catch (encodingException) {
        _logger.error(encodingException);

        return {};
    }
}

function setTimeSpanType(whatType) {
    if (whatType === 'fix') {
        document.getElementById('mailmindrTimeSpanTypeFixed').checked = true;
        return;
    }

    document.getElementById('mailmindrTimeSpanTypeRelative').checked = true;
}

function selectTimeSpanType() {
    return document.getElementById('mailmindrTimeSpanTypeFixed').checked
        ? 'fix'
        : 'relative';
}

function displayTimespan(ts) {
    _logger.log('call displayTimespan');
    _logger.log('> ' + ts.text);
    document.getElementById('mailmindrTimespanName').value = ts.text;
    document.getElementById('mailmindrTimespanDaysFixed').value = ts.days;
    document.getElementById('mailmindrTimespanDays').value = ts.days;

    if (ts.isFixedTime) {
        const timestamp = [ts.hours, ts.minutes];
        elements.fixedTimePicker.value = timestamp;
        setTimeSpanType('fix');
    } else {
        document.getElementById('mailmindrTimespanHours').value = ts.hours;
        document.getElementById('mailmindrTimespanMinutes').value = ts.minutes;
        setTimeSpanType('relative');
    }

    onSelectTimespanType();

    if (getAutoName() == ts.text) {
        elements.autoRenameCheckbox.setAttribute('checked', 'true');
    }
}

function toStringTimespan(ts) {}

function onDialogLoad() {
    _logger.log('init start.');
    try {
        elements.autoRenameCheckbox = document.getElementById(
            'mailmindrAutoRename'
        );
        elements.timeSpanName = document.getElementById(
            'mailmindrTimespanName'
        );
        elements.fixedTimePicker = document.getElementById(
            'mailmindrFixedTimePicker'
        );
        elements.fixedDays = document.getElementById(
            'mailmindrTimespanDaysFixed'
        );
        elements.days = document.getElementById('mailmindrTimespanDays');
        elements.hours = document.getElementById('mailmindrTimespanHours');
        elements.minutes = document.getElementById('mailmindrTimespanMinutes');
        elements.buttonAccept = document.documentElement.getButton('accept');

        const timespan =
            (window &&
                window.arguments &&
                window.arguments.length &&
                window.arguments[0]) ||
            {};

        _logger.log(
            `>> given timespan: ${typeof timespan.id} (${timespan.id})`
        );

        if ('undefined' === typeof timespan.id) {
            _logger.log('NEW timespan (timespan.id is undefined)');
            elements.autoRenameCheckbox.setAttribute('checked', 'true');
            _currentTimespan = {
                id: -1,
                days: 0,
                hours: 0,
                minutes: 0,
                name: getString('mailmindr.timespaneditor.NoName')
            };
            elements.fixedTimePicker.value = '09:00';
        } else {
            _logger.log('EDIT timespan');
            _currentTimespan = timespan;
        }

        displayTimespan(_currentTimespan);

        document
            .getElementById('mailmindrTimeSpanTypeFixed')
            .addEventListener('change', function(event) {
                onSelectTimespanType();
            });

        document
            .getElementById('mailmindrTimeSpanTypeRelative')
            .addEventListener('change', function(event) {
                onSelectTimespanType();
            });

        const editFields = [elements.days, elements.hours, elements.minutes];

        for (let item of editFields) {
            item.addEventListener(
                'change',
                function(e) {
                    onNotifyChange();
                },
                false
            );
        }

        elements.fixedTimePicker.addEventListener('change', function() {
            onNotifyChange();
        });

        elements.fixedDays.addEventListener('change', function() {
            onNotifyChange();
        });

        _logger.log('init end.');
    } catch (exx) {
        _logger.error(exx);
    }
}

function onDialogCancel() {
    window.arguments[0].out = {
        button: 'cancel',
        result: null
    };

    return true;
}

function onDialogAccept() {
    let data = getTimespan() || null;
    if (_currentTimespan.id < 0) {
        data = mailmindrStorage.saveTimespan(data);
    } else {
        data = mailmindrStorage.updateTimespan(data);
    }
    window.arguments[0].out = {
        button: 'accept',
        result: data
    };

    const onClose =
        window.arguments && window.arguments[0] && window.arguments[0].onClose;
    if (onClose) {
        onClose();
    }

    return true;
}

function onNotifyChange() {
    const textBox = elements.timeSpanName;
    const autoRename = _canRename();
    const name = getAutoName();

    if (autoRename) {
        textBox.value = name;
        textBox.hasAttribute('disabled') &&
            textBox.setAttribute('disabled', 'true');
    } else {
        textBox.removeAttribute('disabled');
    }

    textBox.readOnly = autoRename;

    elements.buttonAccept.disabled = !isValid();
}

function onSelectTimespanType() {
    const selectedType = selectTimeSpanType();
    const panels = document.getElementsByClassName(
        'mailmindr-js-timespanTypePanel'
    );

    for (let i = panels.length - 1; i >= 0; i--) {
        panels[i].hidden = true;
    }

    document.getElementById(
        'mailmindrTimespanType-' + selectedType
    ).hidden = false;
    onNotifyChange();
}

window.addEventListener(
    'load',
    function() {
        onDialogLoad();
    },
    false
);

document.addEventListener('dialogaccept', function(event) {
    if (!onDialogAccept()) {
        event.preventDefault(); // Prevent the dialog closing.
    }
});
