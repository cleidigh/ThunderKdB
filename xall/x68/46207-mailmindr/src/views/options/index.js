import {
    getFlatFolderList,
    genericFoldersAreEqual
} from '../../modules/core-utils.mjs.js';
import {
    createTimePresetPicker,
    selectDefaultActionPreset,
    selectDefaultTimePreset,
    translateDocument,
    webHandler
} from '../../modules/ui-utils.mjs.js';
import { createLogger } from '../../modules/logger.mjs.js';

const logger = createLogger('views/options');

let uiLocked = false;

const createFolderPicker = async element => {
    const browser = window.browser.extension.getBackgroundPage().browser;

    const nullValue = document.createElement('option');
    nullValue.value = 'null';
    nullValue.innerText = browser.i18n.getMessage(
        'view.options.default-icebox-folder.option-none'
    );
    element.appendChild(nullValue);

    const allFolders = await getFlatFolderList();

    allFolders.forEach(accountOrFolder => {
        if (accountOrFolder.type === 'account') {
            const optionElement = document.createElement('option');
            optionElement.innerText = accountOrFolder.name;
            optionElement.disabled = true;
            element.appendChild(optionElement);
        } else {
            const folderOptionElement = document.createElement('option');

            folderOptionElement.style = `padding-left: ${20 *
                (accountOrFolder.depth + 1)}px`;
            folderOptionElement.innerText = `${accountOrFolder.name}`;
            folderOptionElement.value = JSON.stringify(accountOrFolder.folder);
            element.appendChild(folderOptionElement);
        }
    });

    return element;
};

const selectDefaultIceboxFolder = (selectElement, settingsValue) => {
    logger.log(selectElement);
    const availableOptions = Array.from(selectElement.options)
        .map(item =>
            item.disabled
                ? undefined
                : {
                      index: item.index,
                      value: JSON.parse(item.value)
                  }
        )
        .filter(
            item =>
                item &&
                (item.value === settingsValue ||
                    (item.value &&
                        settingsValue &&
                        genericFoldersAreEqual(item.value, settingsValue)))
        )
        .map(({ index }) => index);
    const selectedIndex = availableOptions.shift() || 0;
    selectElement.selectedIndex = selectedIndex;
};

const lockUI = locked => {
    const lockElement = document.getElementById('mailmindr-ui-lock');
    if (locked) {
        document.body.style.overflowX = 'hidden';
        document.body.style.overflowY = 'hidden';
        lockElement.style.display = 'block';
    } else {
        lockElement.style.display = 'none';
        document.body.style.overflowX = 'auto';
        document.body.style.overflowY = 'auto';
    }

    Array.from(document.querySelectorAll('fieldset')).forEach(
        fieldsetElement => (fieldsetElement.disabled = locked)
    );

    uiLocked = locked;

    return locked;
};

const openTimespanEditor = async (port, timespan) => {
    await port.postMessage({
        action: 'show:time-preset-editor',
        payload: { preset: timespan }
    });
};

const displayTimePresets = timePresetList => {
    const timePresets = document.getElementById(
        'mailmindr-options_time-preset-list'
    );

    Array.from(timePresets.children).forEach(item => item.remove());

    timePresetList.forEach(timePreset => {
        if (!timePreset.isSelectable) {
            return;
        }

        const timeOption = document.createElement('option');
        if (timePreset.isGenerated) {
            timeOption.disabled = true;
        }
        timeOption.className = 'mailmindr-list-item';
        timeOption.innerText = timePreset.text;
        timeOption.value = JSON.stringify(timePreset);
        timePresets.appendChild(timeOption);
    });
};

const createActionPresetPicker = (element, actionPresetList) => {
    Array.from(element.children).forEach(item => item.remove());

    actionPresetList.map(actionPreset => {
        const actionOption = document.createElement('option');
        actionOption.value = JSON.stringify(actionPreset);
        actionOption.innerText = actionPreset.text;

        element.appendChild(actionOption);
    });

    return element;
};

const doCancelTimespanEditor = () => {
    lockUI(false);
};

const displaySettings = async options => {
    const { presets, settings } = options;
    const { time, actions } = presets;

    displayTimePresets(time);

    // 
    const {
        defaultTimePreset,
        defaultActionPreset,
        defaultIceboxFolder,
        snoozeTime
    } = settings;

    document.getElementById('mailmindr-options_snooze-time').value = snoozeTime;

    const defaultTimePresetPicker = createTimePresetPicker(
        document.getElementById('mailmindr-options_default-time-preset'),
        time
    );

    selectDefaultTimePreset(defaultTimePresetPicker, defaultTimePreset);

    const defaultActionPresetPicker = createActionPresetPicker(
        document.getElementById('mailmindr-options_default-action-preset'),
        actions
    );

    selectDefaultActionPreset(defaultActionPresetPicker, defaultActionPreset);

    const defaultIceboxFolderPicker = await createFolderPicker(
        document.getElementById('mailmindr-options_default-icebox-folder')
    );
    selectDefaultIceboxFolder(defaultIceboxFolderPicker, defaultIceboxFolder);
};

const onLockActionButtonClick = async (port, event) => {
    const { target } = event;
    if (target) {
        const { value: action } = target;
        switch (action) {
            case 'bring-to-front': {
                await port.postMessage({
                    action: 'dialog:bring-to-front',
                    payload: { dialogType: 'mailmindr:time-preset-editor' }
                });
                break;
            }
            case 'proceed-anyways': {
                await port.postMessage({ action: 'settings:force-unlock' });
                break;
            }
        }
    }
};

const onMessage = async message => {
    const { topic = '' } = message;

    logger.warn(`received topic: '${topic}'`);

    switch (topic) {
        case 'settings:updated': {
            const {
                message: { settings }
            } = message;
            await displaySettings(settings);
            break;
        }
        case 'settings:unlock': {
            lockUI(false);
            const {
                message: { settings }
            } = message;
            await displaySettings(settings);
            break;
        }
    }
};

const jumpToHandler = sender => {
    const { target } = sender;
    if (target) {
        const { jumpTo } = target.dataset;
        const jumpTarget = document.getElementById((jumpTo || ' ').substr(1));

        if (jumpTarget) {
            jumpTarget.scrollIntoView();
        }
    }
};

const onLoad = async () => {
    lockUI(false);

    Array.from(
        document.querySelectorAll('button.mailmindr-jump-button')
    ).forEach(btn => {
        btn.addEventListener('click', jumpToHandler);
    });

    Array.from(
        document.querySelectorAll('button.mailmindr-button-web')
    ).forEach(btn => {
        btn.addEventListener('click', webHandler);
    });

    // 
    const port = await browser.runtime.connect({
        name: 'connection:mailmindr-options'
    });

    port.onMessage.addListener(onMessage);

    // 
    document
        .querySelectorAll('button.mailmindr-lock-action')
        .forEach(btn =>
            btn.addEventListener(
                'click',
                async event => await onLockActionButtonClick(port, event)
            )
        );

    const addBtn = document.getElementById('mailmindr-timespan-preset-add');
    addBtn.addEventListener('click', async () => {
        await openTimespanEditor(port, null);
        lockUI(true);
    });

    const editBtn = document.getElementById('mailmindr-timespan-preset-edit');
    editBtn.addEventListener('click', async () => {
        const list = document.getElementById(
            'mailmindr-options_time-preset-list'
        );
        if (list.value) {
            await openTimespanEditor(port, JSON.parse(list.value));
            lockUI(true);
        }
    });

    const removeBtn = document.getElementById(
        'mailmindr-timespan-preset-remove'
    );

    removeBtn.addEventListener('click', () => {
        const list = document.getElementById(
            'mailmindr-options_time-preset-list'
        );
        if (list.value) {
            const preset = JSON.parse(list.value);
            const { text } = preset;

            if (
                window.confirm(
                    `Delete the preset '${text}'? This cannot be undone.`
                )
            ) {
                messenger.runtime.sendMessage({
                    action: 'preset:remove-timespans',
                    payload: {
                        presets: [preset]
                    }
                });
            }
        }
    });
    removeBtn.disabled = true;

    const list = document.getElementById('mailmindr-options_time-preset-list');
    list.addEventListener('change', sender => {
        const removeBtn = document.getElementById(
            'mailmindr-timespan-preset-remove'
        );
        removeBtn.disabled = !!!sender.target.value;
    });

    const set = async (settingName, value) => {
        await port.postMessage({
            action: 'settings:set',
            payload: { name: settingName, value }
        });
    };

    // 
    const snoozeTime = document.getElementById('mailmindr-options_snooze-time');
    snoozeTime.addEventListener('change', async sender => {
        const value = sender.target.value;
        await set('snoozeTime', value);
        logger.log(`select snooze time:`, value);
    });

    const defaultTimePreset = document.getElementById(
        'mailmindr-options_default-time-preset'
    );
    defaultTimePreset.addEventListener('change', async sender => {
        const value = JSON.parse(sender.target.value);
        await set('defaultTimePreset', value);
        logger.log(`select default time preset:`, value);
    });

    const defaultActionPreset = document.getElementById(
        'mailmindr-options_default-action-preset'
    );
    defaultActionPreset.addEventListener('change', async sender => {
        const value = JSON.parse(sender.target.value);
        await set('defaultActionPreset', value);
        logger.log(`select default action preset:`, value);
    });

    const defaultIceboxFolderPicker = document.getElementById(
        'mailmindr-options_default-icebox-folder'
    );
    defaultIceboxFolderPicker.addEventListener('change', async sender => {
        const value = JSON.parse(sender.target.value);
        await set('defaultIceboxFolder', value);
        logger.log(`select default icebox folder:`, value);
    });

    translateDocument();
};

document.addEventListener('DOMContentLoaded', async () => {
    await onLoad();
});
