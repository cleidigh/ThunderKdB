import {
    genericFoldersAreEqual,
    getParsedJsonOrDefaultValue,
    localFolderToGenericFolder
} from '../../../modules/core-utils.mjs.js';
import {
    createTimePresetPicker,
    selectDefaultActionPreset,
    selectDefaultTimePreset
} from '../../../modules/ui-utils.mjs.js';
import { pluralize } from '../../../modules/string-utils.mjs.js';
import {
    createCorrelationId,
    createLogger
} from '../../../modules/logger.mjs.js';
import { translateDocument } from '../../../modules/ui-utils.mjs.js';

const logger = createLogger('views/dialogs/create-mindr');

const getDialogParameters = () => {
    const correlationId = createCorrelationId(`getDialogParameters`);
    logger.log('BEGIN getDialogParameters', { correlationId });
    const params = new URLSearchParams(window.location.search.substr(1));
    const result = {
        dialogId: params.get('dialogId'),
        headerMessageId: params.get('headerMessageId'),
        author: params.get('author'),
        subject: params.get('subject'),
        folderAccountId: params.get('folderAccountId'),
        folderName: params.get('folderName'),
        folderPath: params.get('folderPath'),
        folderType: params.get('folderType'),
        guid: params.get('guid'),
        folderAccountIdentityMailAddress: params.get(
            'folderAccountIdentityMailAddress'
        )
    };

    logger.log('dialog result', { correlationId, result });
    logger.log('END getDialogParameters', { correlationId });

    return result;
};

const closeWindow = async () => {
    const correlationId = createCorrelationId('closeWindow');
    logger.log(`BEGIN closeWindow`, { correlationId });
    logger.log(`try to get dialog parameters`);
    try {
        const { dialogId } = getDialogParameters();
        logger.log(`closing dialog ${dialogId}`);
        // 
        window.close();
    } catch (e) {
        logger.error('create-mindr::closeWindow', e);
    }
    logger.log('END closeWindow', { correlationId });
};

const getGenericSourceFolder = () => {
    const {
        folderAccountId,
        folderName,
        folderPath,
        folderType,
        folderAccountIdentityMailAddress
    } = getDialogParameters();

    // 
    // 
    // 
    // 
    // 
    // 
    // 

    const sourceFolder = {
        name: JSON.parse(`"${folderName}"`),
        accountId: JSON.parse(`"${folderAccountId}"`),
        path: JSON.parse(`"${folderPath}"`),
        type: JSON.parse(`"${folderType}"`),
        identityEmailAddress: JSON.parse(
            `"${folderAccountIdentityMailAddress}"`
        )
    };

    return sourceFolder;
};

const doCancel = async () => await closeWindow();

const doAccept = async () => {
    const {
        guid,
        headerMessageId,
        author,
        subject,
        folderAccountId,
        folderName,
        folderPath,
        folderType,
        folderAccountIdentityMailAddress
    } = getDialogParameters();

    const remindMe = document.getElementById('mailmindr--preset-remind-me');
    const remindMeMinutesBefore = remindMe.value || 0;

    const due = getDateTimefromPickers();
    const actionTemplate = getActionTemplateFromPicker();
    const iceBox = document.getElementById('mailmindr--icebox');
    const doMoveToIcebox = iceBox.disabled ? false : iceBox.checked;

    messenger.runtime.sendMessage({
        action: 'mindr:create',
        payload: {
            guid,
            headerMessageId,
            due,
            remindMeMinutesBefore,
            actionTemplate,
            notes: '',
            metaData: {
                headerMessageId,
                author,
                subject,
                folderAccountId,
                folderName,
                folderPath,
                folderType,
                folderAccountIdentityMailAddress
            },
            doMoveToIcebox
        }
    });
};

const doRemove = async () => {
    const removeFollowUp = window.confirm(
        'Do you want to remove this follow-up? This will only remove the follow-up, the message will not be removed.\n\nYou cannot undo this action.'
    );

    if (!removeFollowUp) {
        return;
    }

    const {
        guid,
        headerMessageId,
        folderAccountId,
        folderName,
        folderPath,
        folderType,
        folderAccountIdentityMailAddress
    } = getDialogParameters();

    const removed = await messenger.runtime.sendMessage({
        action: 'mindr:remove',
        payload: { guid }
    });

    if (removed && removed.status && removed.status === 'ok') {
        doCancel();
    }
};

const handleChangeTimePreset = event => {
    const {
        target: { value }
    } = event;

    const preset = getParsedJsonOrDefaultValue(value, {});
    const { days, hours, minutes, isRelative, isSelectable } = preset;

    if (!isSelectable) {
        logger.log('nothing to change here');
        return;
    }

    const millisecondsForDays = days * 24 * 60 * 60 * 1000;
    let now = Date.now() + millisecondsForDays;

    if (isRelative) {
        now +=
            hours * 60 * 60 * 1000 /* add hours */ +
            minutes * 60 * 1000; /* add minutes */
    }

    const nowAsDate = new Date(now);
    const newDate = new Date(
        Date.UTC(
            nowAsDate.getFullYear(),
            nowAsDate.getMonth(),
            nowAsDate.getDate()
        )
    );
    const datePicker = document.getElementById('mailmindr--date-picker');
    const timePicker = document.getElementById('mailmindr--time-picker');

    datePicker.valueAsDate = newDate;

    if (isRelative) {
        const hourString = `0${nowAsDate.getHours()}`.substr(-2);
        const minuteString = `0${nowAsDate.getMinutes()}`.substr(-2);
        const newTimePickerValue = `${hourString}:${minuteString}`;

        timePicker.value = newTimePickerValue;
    } else {
        const hourString = `0${hours}`.substr(-2);
        const minuteString = `0${minutes}`.substr(-2);
        const newTimePickerValue = `${hourString}:${minuteString}`;

        timePicker.value = newTimePickerValue;

        const pickedDateTime = getDateTimefromPickers();

        logger.info(pickedDateTime, new Date());

        if (pickedDateTime <= new Date()) {
            logger.info(
                'adjusting time by adding a day, adjusted to: ',
                getDateTimefromPickers()
            );
            // 
            datePicker.valueAsDate = new Date(Date.now() + 24 * 60 * 60 * 1000);
        }
    }
};

const getDateTimefromPickers = () => {
    const datePicker = document.getElementById('mailmindr--date-picker');
    const timePicker = document.getElementById('mailmindr--time-picker');

    const timePickerValue = timePicker.value;
    const [hours, minutes] = timePickerValue
        .split(':')
        .map(item => Number.parseInt(item, 10));

    const [year, month, day] = datePicker.value.split('-');
    const newDate = new Date(year, month - 1, day, hours, minutes, 0, 0);

    logger.warn(
        'current date from datepicker without adjusting time and timezone',
        newDate
    );

    return newDate;
};

const getActionTemplateFromPicker = () => {
    const actionTemplatePicker = document.getElementById(
        'mailmindr--preset-action'
    );
    const actionTemplate = JSON.parse(actionTemplatePicker.value);

    return actionTemplate;
};

async function onLoad() {
    const { guid, author, subject } = getDialogParameters();

    const result = await messenger.runtime.sendMessage({
        action: 'dialog:open',
        payload: { name: 'set-mindr', guid }
    });

    const {
        payload: {
            settings,
            presets: { time, actions },
            mindr
        }
    } = result;

    const editMindr = Boolean(mindr);

    const isIceboxFolderSet = Boolean(settings?.defaultIceboxFolder);

    const sourceFolder = getGenericSourceFolder();
    const iceBoxFolder = await localFolderToGenericFolder(
        settings.defaultIceboxFolder
    );

    const sourceFolderIsIceboxFolder = genericFoldersAreEqual(
        sourceFolder,
        iceBoxFolder
    );

    const moveToIceBox = document.getElementById('mailmindr--icebox');
    moveToIceBox.disabled = editMindr || !isIceboxFolderSet;
    moveToIceBox.checked = editMindr
        ? sourceFolderIsIceboxFolder
        : isIceboxFolderSet;

    const removeButton = document.getElementById('mailmindr--do-remove-mindr');
    removeButton.addEventListener('click', doRemove);
    removeButton.setAttribute(
        'style',
        editMindr ? 'display: block;' : 'display: none;'
    );

    const cancelButton = document.getElementById(
        'mailmindr--do-cancel-create-mindr'
    );
    cancelButton.addEventListener('click', doCancel);

    const acceptButton = document.getElementById('mailmindr--do-create-mindr');
    acceptButton.addEventListener('click', doAccept);
    acceptButton.innerText = editMindr
        ? browser.i18n.getMessage(
              'view.dialog.create-mindr.caption.update-mindr'
          )
        : browser.i18n.getMessage(
              'view.dialog.create-mindr.caption.create-mindr'
          );

    document.getElementById('mailmindr--author').innerText = author;
    document.getElementById('mailmindr--subject').innerText = subject;

    const datePicker = document.getElementById('mailmindr--date-picker');
    const timePicker = document.getElementById('mailmindr--time-picker');

    const now = new Date();
    const hours = `0${now.getHours()}`.substr(-2);
    const minutes = `0${now.getMinutes()}`.substr(-2);

    timePicker.value = [hours, minutes].join(':');
    datePicker.valueAsDate = now;

    const actionPresets = document.getElementById('mailmindr--preset-action');
    actions.map(actionPreset => {
        const actionOption = document.createElement('option');
        actionOption.value = JSON.stringify(actionPreset);
        actionOption.innerText = actionPreset.text;

        actionPresets.appendChild(actionOption);
    });

    const timePresets = createTimePresetPicker(
        document.getElementById('mailmindr--preset-time'),
        time
    );

    const handlePickerChange = () => {
        const presetTimePicker = document.getElementById(
            'mailmindr--preset-time'
        );
        presetTimePicker.selectedIndex = 0;
    };

    datePicker.addEventListener('change', handlePickerChange);
    timePicker.addEventListener('change', handlePickerChange);
    timePresets.addEventListener('change', handleChangeTimePreset);

    if (editMindr) {
        const due = mindr.due;
        const dueHours = `0${due.getHours()}`.substr(-2);
        const dueMinutes = `0${due.getMinutes()}`.substr(-2);

        timePicker.value = [dueHours, dueMinutes].join(':');
        datePicker.valueAsDate = due;

        timePresets.selectedIndex = 0;

        const preselectedAction = mindr?.action
            ? { ...mindr?.action, moveMessageTo: undefined }
            : undefined;
        selectDefaultActionPreset(actionPresets, preselectedAction);

        document.title = `${browser.i18n.getMessage(
            'view.dialog.create-mindr.title.edit'
        )} | mailmindr`;
    } else {
        const defaultTimePreset = settings?.defaultTimePreset;
        const defaultActionPreset = settings?.defaultActionPreset;

        selectDefaultTimePreset(timePresets, defaultTimePreset);
        selectDefaultActionPreset(actionPresets, defaultActionPreset);

        const changeEvent = new Event('change', { target: timePresets });
        timePresets.dispatchEvent(changeEvent);

        document.title = `${browser.i18n.getMessage(
            'view.dialog.create-mindr.title.create'
        )} | mailmindr`;
    }

    const remindMeMinutesBefore = [
        { minutes: 0, display: 0, unit: 'on-time' },
        { minutes: 5, display: 5, unit: 'minutes' },
        { minutes: 15, display: 15, unit: 'minutes' },
        { minutes: 30, display: 30, unit: 'minutes' },
        { minutes: 60, display: 1, unit: 'hours' },
        { minutes: 120, display: 2, unit: 'hours' },
        { minutes: 240, display: 4, unit: 'hours' }
    ];
    const remindMe = document.getElementById('mailmindr--preset-remind-me');
    remindMeMinutesBefore.forEach(item => {
        const option = document.createElement('option');
        const { minutes, unit, display: displayedValue } = item;

        option.value = minutes;

        if (unit === 'on-time') {
            option.innerText = pluralize(
                displayedValue,
                'mailmindr.utils.core.remindme.before.on-time'
            );
        } else if (unit === 'minutes') {
            option.innerText = pluralize(
                displayedValue,
                'mailmindr.utils.core.remindme.before.minutes'
            );
        } else if (unit === 'hours') {
            option.innerText = pluralize(
                displayedValue,
                'mailmindr.utils.core.remindme.before.hours'
            );
        }
        remindMe.appendChild(option);
    });

    translateDocument(document);

    acceptButton.focus();
}

document.addEventListener('DOMContentLoaded', onLoad, { once: true });
document.addEventListener('keydown', async event => {
    if (event.code === 'Escape') {
        await doCancel();
    }
});
