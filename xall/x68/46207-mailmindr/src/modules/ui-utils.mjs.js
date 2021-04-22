import {
    equalActionPresetValues,
    equalTimePresetValues
} from './core-utils.mjs.js';
import { createLogger } from './logger.mjs.js';

const logger = createLogger('ui-utils');

export const appendI18n = element => {
    if (!element) {
        return;
    }

    if (element.hasAttribute('data-i18n')) {
        const _i18n = element.getAttribute('data-i18n');
        const text = browser.i18n.getMessage(_i18n);

        const node = document.createTextNode(text);
        element.insertBefore(node, element.firstChild);
    }
};

export const translateDocument = doc => {
    const nodes = (doc || document).querySelectorAll('[data-i18n]');
    const translateableNodes = Array.from(nodes);

    translateableNodes.forEach(appendI18n);
};

export const createTimePresetPicker = (element, timePresets) => {
    Array.from(element.children).forEach(item => item.remove());
    timePresets.map(timePreset => {
        const timeOption = document.createElement('option');
        if (!timePreset.isSelectable) {
            timeOption.disabled = true;
        }

        timeOption.innerText = timePreset.text;
        timeOption.value = JSON.stringify(timePreset);

        element.appendChild(timeOption);
    });

    return element;
};

export const selectDefaultTimePreset = (timePresets, defaultTimePreset) => {
    const availablePresets = Array.from(timePresets.options)
        .map(item => ({
            index: item.index,
            timePreset: JSON.parse(item.value)
        }))
        .filter(
            ({ timePreset }) =>
                timePreset.isSelectable &&
                equalTimePresetValues(timePreset, defaultTimePreset)
        )
        .map(({ index }) => index);
    const selectedIndex = availablePresets.shift() || 1;
    timePresets.selectedIndex = selectedIndex;
};

export const selectDefaultActionPreset = (element, defaultActionPreset) => {
    const availablePresets = Array.from(element.options)
        .map(item => ({
            index: item.index,
            actionPreset: JSON.parse(item.value)
        }))
        .filter(({ actionPreset }) =>
            equalActionPresetValues(actionPreset, defaultActionPreset)
        )
        .map(({ index }) => index);
    const selectedIndex = availablePresets.shift() || 0;
    element.selectedIndex = selectedIndex;
};

export const createSplitButton = (element, items, onMenuItemClick) => {
    const menuId = element.getAttribute('aria-controls');
    const menuList = document.getElementById(menuId);
    if (!menuList) {
        logger.error(
            '[mailmindr] cannot create split button: the target list element was not found'
        );
        return;
    }

    items.forEach(item => {
        const listItem = document.createElement('li');
        listItem.setAttribute('role', 'none');

        const menuItemElement = document.createElement('button');
        menuItemElement.setAttribute('role', 'menuitem');
        menuItemElement.innerText = item.caption;
        menuItemElement.addEventListener('click', () =>
            closeMenuItem(item, onMenuItemClick(item))
        );

        listItem.appendChild(menuItemElement);
        menuList.appendChild(listItem);
    });
};

export const webHandler = sender => {
    const { target } = sender;
    if (target) {
        const { web } = target.dataset;

        if (web && web.startsWith('https://')) {
            browser.windows.openDefaultBrowser(web);
        }
    }
};
