import { createEmptyTimespan } from '../../../modules/core-utils.mjs.js';
import { translateDocument } from '../../../modules/ui-utils.mjs.js';
import {
    capitalizeFirstLetter,
    pluralize
} from '../../../modules/string-utils.mjs.js';
import { createLogger } from '../../../modules/logger.mjs.js';

const logger = createLogger('views/dialogs/time-preset-editor');

const getLocalizedTime = (hours, minutes) => {
    const date = new Date(0, 0, 0, hours, minutes, 0);
    // 
    // 
    // 

    // 
    return date.toLocaleTimeString([navigator.language], {
        hour: '2-digit',
        minute: '2-digit'
    });
};

/**
 * will create something like
 * 		"tomorrow"
 *  	"in 5 seconds"
 */
export const toRelativeString = timespan => {
    let daysPluralized = '';
    if (timespan.isRelative) {
        const pair = browser.i18n.getMessage('mailmindr.utils.core.timePair');
        const props = ['days', 'hours', 'minutes'];

        let buffer = '';
        for (let propname of props) {
            let value = timespan[propname];
            if (value > 0) {
                buffer +=
                    ', ' +
                    pair
                        .replace('#1', value)
                        .replace(
                            '#2',
                            pluralize(value, `mailmindr.utils.core.${propname}`)
                        );
            }
        }

        return buffer.replace(/^, /, '');
    }

    const { days, hours = 0, minutes = 0 } = timespan;

    if (days >= 7 && days % 7 == 0) {
        daysPluralized = pluralize(
            days / 7,
            'mailmindr.utils.core.relative.weeks'
        );
    } else if (days > 0) {
        daysPluralized = pluralize(days, 'mailmindr.utils.core.relative.days');
    } else if (days == 0) {
        daysPluralized = browser.i18n.getMessage(
            'mailmindr.utils.core.relative.today'
        );
    }

    const buffer = browser.i18n.getMessage(
        'mailmindr.utils.core.fix.tostringpattern'
    );

    return buffer
        .replace('#1', daysPluralized)
        .replace('#2', getLocalizedTime(hours, minutes));
};

const getDialogParameters = () => {
    const params = new URLSearchParams(window.location.search.substr(1));
    const serializedPreset = params.get('preset') || 'null';

    logger.log(serializedPreset);

    return {
        dialogId: params.get('dialogId'),
        preset: JSON.parse(serializedPreset)
    };
};

const isFixed = () => selectTimeSpanType() === 'fix';

const getNumeric = (id, defaultValue) => {
    const result = Number.parseInt(document.getElementById(id).value || 0, 10);
    return isNaN(result) ? defaultValue : result;
};

const getDays = () =>
    isFixed()
        ? getNumeric('mailmindr-timespan-days-fixed', 0)
        : getNumeric('mailmindr-timespan-days', 0);

const getHours = () =>
    isFixed()
        ? getFixedTimeHourAndMinute().hours
        : getNumeric('mailmindr-timespan-hours', 0);

const getMinutes = () =>
    isFixed()
        ? getFixedTimeHourAndMinute().minutes
        : getNumeric('mailmindr-timespan-minutes', 0);

const isValid = () => {
    const current = getTimespan();
    const isNameOk = current.text.trim().length > 0;

    if (current.isFixedTime && isNameOk) {
        return true;
    }

    return (
        isNameOk &&
        (current.days > 0 || current.hours > 0 || current.minutes > 0)
    );
};

const getFixedTimeHourAndMinute = () => {
    const timePickerValue = document.getElementById(
        'mailmindr-fixed-time-picker'
    ).value;
    const [hours, minutes] = timePickerValue
        .split(':')
        .map(item => Number.parseInt(item || 0, 10));
    return { hours, minutes };
};

const getTimespan = () => {
    try {
        const result = createEmptyTimespan();
        const nameInput = document.getElementById('mailmindr-timespan-name');

        result.text = nameInput?.value || '';
        result.days = getDays();
        result.hours = getHours();
        result.minutes = getMinutes();
        result.isRelative = !isFixed();
        result.isGenerated = false;

        return result;
    } catch (encodingException) {
        logger.error(encodingException);

        return null;
    }
};

const closeWindow = () => {
    window.close();
};

const canRename = () =>
    Boolean(document.getElementById('mailmindr-auto-rename')?.checked || false);

const getAutoName = () => {
    const current = getTimespan();

    if (!current) {
        return;
    }

    return capitalizeFirstLetter(toRelativeString(current));
};

const doCancel = async () => closeWindow();

const doApply = async () => {
    const timespan = getTimespan();
    const params = getDialogParameters();
    const data = await messenger.runtime.sendMessage({
        action: 'preset:modify-timespan',
        payload: {
            current: {
                ...timespan
            },
            source: params.preset
        }
    });

    if (data && data.status !== 'ok') {
        logger.error(
            'something wrong has happened and we are unable to save this preset data'
        );
    }

    return closeWindow();
};

const selectTimeSpanType = () =>
    document.getElementById('mailmindr-timespan-type-fixed').checked
        ? 'fix'
        : 'relative';

const setUiForTimeSpan = timespan => {
    const { days = 0, hours = 0, minutes = 0, isRelative, text } = {
        ...timespan
    };

    document.getElementById('mailmindr-timespan-name').value = text || '';
    document.getElementById('mailmindr-timespan-type-fixed').checked =
        isRelative ?? true ? 'relative' : 'fix';

    document.getElementById('mailmindr-timespan-days-fixed').value = days;
    document.getElementById('mailmindr-timespan-days').value = days;
    document.getElementById('mailmindr-timespan-hours').value = hours;
    document.getElementById('mailmindr-timespan-minutes').value = minutes;

    const timePicker = document.getElementById('mailmindr-fixed-time-picker');
    timePicker.value = [`0${hours}`.substr(-2), `0${minutes}`.substr(-2)].join(
        ':'
    );

    if (null === timespan) {
        const now = new Date();
        timePicker.value = [
            `0${now.getHours()}`.substr(-2),
            `0${now.getMinutes()}`.substr(-2)
        ].join(':');
        const autoRenameCheckbox = document.getElementById(
            'mailmindr-auto-rename'
        );
        if (autoRenameCheckbox) {
            autoRenameCheckbox.checked = true;
        }
    }
};

const onNotifyChange = () => {
    const textBox = document.getElementById('mailmindr-timespan-name');
    const autoRename = canRename();
    const name = getAutoName();

    if (autoRename) {
        textBox.value = name;
        textBox.readOnly = true;
    } else {
        textBox.readOnly = false;
    }

    const acceptButton = document.getElementById('mailmindr--do-apply');
    acceptButton.disabled = !isValid();
};

const onSelectTimespanType = () => {
    const selectedType = selectTimeSpanType();
    const panels = document.getElementsByClassName(
        'mailmindr-js-timespan-type-panel'
    );

    Array.from(panels).forEach(element => (element.style.display = 'none'));

    const visiblePanelId = `mailmindr-timespan-type-panel-${selectedType}`;
    logger.warn(`id:: ${visiblePanelId}`);
    document.getElementById(visiblePanelId).style.display = 'flex';
};

const onLoad = () => {
    const params = getDialogParameters();

    setUiForTimeSpan(params.preset);

    document
        .querySelectorAll('input')
        .forEach(element => element.addEventListener('change', onNotifyChange));

    document
        .querySelectorAll('input[type=radio]')
        .forEach(element =>
            element.addEventListener('change', onSelectTimespanType)
        );

    document
        .querySelectorAll('.mailmindr-js-timespan-type-panel')
        .forEach(element => (element.style.display = 'none'));

    translateDocument(document);

    const cancelButton = document.getElementById('mailmindr--do-cancel');
    cancelButton.addEventListener('click', doCancel);

    const acceptButton = document.getElementById('mailmindr--do-apply');
    acceptButton.addEventListener('click', doApply);

    onSelectTimespanType();
    onNotifyChange();
};

document.addEventListener('DOMContentLoaded', () => onLoad(), { once: true });
document.addEventListener('keydown', async event => {
    if (event.code === 'Escape') {
        await doCancel();
    }
});
window.addEventListener('unload', async event => {
    event.preventDefault();
    logger.warn('window is about to close');
    await closeWindow();
});
