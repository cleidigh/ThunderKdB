import { isOverdue } from '../../../modules/core-utils.mjs.js';
import {
    capitalizeFirstLetter,
    toRelativeString,
    pluralize
} from '../../../modules/string-utils.mjs.js';
import { createLogger } from '../../../modules/logger.mjs.js';
import { translateDocument } from '../../../modules/ui-utils.mjs.js';

const logger = createLogger('views/dialogs/mindr-alert');

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

const onMindrClick = mindr => {
    const headerItem = document.getElementsByTagName('header').item(0);
    [...headerItem.childNodes].forEach(child => child.remove());
    const item = createListItem(mindr, true);
    headerItem.appendChild(item);

    item.addEventListener('click', async () => {
        await messenger.runtime.sendMessage({
            action: 'navigate:open-message-by-mindr-guid',
            payload: {
                guid: mindr.guid
            }
        });
    });

    selectListItem(mindr);
};

const listBaseClassName = 'mailmindr-alert-list';

const getListElement = () => document.querySelector(`.${listBaseClassName}`);

const clearList = () => {
    const list = getListElement();
    if (list) {
        Array.from(list.children).forEach(item => item.remove());
    }
};

const createListItem = (mindr, isForHeader = false) => {
    const {
        guid,
        due,
        metaData: { subject, author }
    } = mindr;

    const item = document.createElement('div');
    item.className = `${listBaseClassName}-item ${
        isOverdue(mindr) ? `${listBaseClassName}-item--overdue` : ''
    }`;
    item.setAttribute('data-mailmindr-guid', guid);

    const iconElement = document.createElement('div');
    iconElement.className = `${listBaseClassName}-item-icon`;

    if (isForHeader) {
        const iconImageElement = document.createElement('img');
        iconImageElement.src =
            '../../../images/mailmindr-envelope-plus-white.svg';
        iconImageElement.width = 45;
        iconImageElement.width = 45;
        iconElement.appendChild(iconImageElement);
    }

    const subjectElement = document.createElement('div');
    subjectElement.className = `${listBaseClassName}-item-subject`;
    subjectElement.innerText = subject;

    const authorElement = document.createElement('div');
    authorElement.className = `${listBaseClassName}-item-author`;
    authorElement.innerText = author;

    const dueElement = document.createElement('div');
    dueElement.className = `${listBaseClassName}-item-due`;
    dueElement.innerText = capitalizeFirstLetter(toRelativeString(due));

    item.appendChild(iconElement);
    item.appendChild(subjectElement);
    item.appendChild(authorElement);
    item.appendChild(dueElement);

    return item;
};

const displayListItems = mindrs => {
    logger.log('display', mindrs);
    clearList();
    const listElement = getListElement();
    mindrs.forEach(mindr => {
        const item = createListItem(mindr);
        item.onclick = () => onMindrClick(mindr);
        listElement.appendChild(item);
    });
};

const updateTitle = mindrCount => {
    document.title = pluralize(mindrCount, 'view.dialog.mindr-alert.title');
};

const selectListItem = mindr => {
    const selector = `.${listBaseClassName} .${listBaseClassName}-item[data-mailmindr-guid='${mindr.guid}']`;
    logger.log(selector);

    const itemElement = document.querySelector(selector);
    if (!itemElement) {
        return;
    }

    const previousSelectedElement = findSelectedElement();
    if (previousSelectedElement) {
        previousSelectedElement.className = previousSelectedElement.className
            .replace('mailmindr-alert-list-item--selected', '')
            .trim();
    }

    itemElement.className = `${itemElement.className} mailmindr-alert-list-item--selected`;
};

const findSelectedElement = () =>
    document.querySelector('.mailmindr-alert-list-item--selected');

const findSelectedGuid = () => {
    const headerMindrElement = document.querySelector('header > div');
    if (!headerMindrElement) {
        return null;
    }

    const guid = headerMindrElement.dataset['mailmindrGuid'];
    return guid;
};

const listMindrs = () => {
    const list = document.querySelectorAll('.mailmindr-alert-list-item');
    return (Array.from(list) || []).reduce((collector, current) => {
        const guid = current?.dataset['mailmindrGuid'];
        if (collector.indexOf(guid) < 0) {
            return [...collector, guid];
        }
        return collector;
    }, []);
};

const onSnoozeMindr = async (port, mindrGuidList, minutes) => {
    port.postMessage({
        action: 'mindr:snooze',
        payload: {
            minutes,
            list: mindrGuidList
        }
    });
};

const onDismissMindr = async port => {
    const guid = findSelectedGuid();

    port.postMessage({ action: 'mindr:dismiss', payload: { list: [guid] } });
};

const onDismissAllMindrs = async port => {
    const list = listMindrs();

    port.postMessage({ action: 'mindr:dismiss', payload: { list } });
};

const onMessage = message => {
    const { active, overdue } = message;
    const selectedGuid = findSelectedGuid();

    logger.log(`active: `, active, `overdue: `, overdue);
    const mindrs = [...overdue, ...active].filter(
        (item, index, list) =>
            list.findIndex(value => value.guid === item.guid) === index
    );

    displayListItems(mindrs);
    updateTitle(mindrs.length);

    if (mindrs.length) {
        const selectedMindr =
            mindrs.find(mindr => mindr.guid === selectedGuid) || mindrs[0];
        onMindrClick(selectedMindr);
    }
};

const onLoad = async () => {
    // 
    const port = await browser.runtime.connect({
        name: 'connection:mindr-alert'
    });

    await port.postMessage({
        action: 'dialog:open',
        payload: { name: 'mindr-alert' }
    });

    port.onMessage.addListener(onMessage);

    const dismissButton = document.getElementById(
        'mailmindr--do-dismiss-mindr'
    );
    dismissButton.addEventListener('click', async () => onDismissMindr(port));

    const dismissAll = document.getElementById(
        'mailmindr--do-dismiss-all-mindr'
    );
    dismissAll.addEventListener('click', async () => onDismissAllMindrs(port));

    // 
    // 
    const snoozeButton = document.getElementById(
        'mailmindr--do-postpone-mindr'
    );
    snoozeButton.addEventListener('click', async () => {
        // 
        // 
        const guid = findSelectedGuid();
        await onSnoozeMindr(port, [guid], null);
    });
    const snoozeAllButton = document.getElementById(
        'mailmindr--do-postpone-all-mindr'
    );
    snoozeAllButton.addEventListener('click', async () => {
        const list = listMindrs();
        await onSnoozeMindr(port, list, null);
    });
    // 
    // 
    // 
    // 
    // 
    // 

    translateDocument(document);
};

document.addEventListener('DOMContentLoaded', onLoad, { once: true });
document.addEventListener('keydown', async event => {
    if (event.code === 'Escape') {
        clearList();
    }
});

window.addEventListener('unload', async event => {
    // 
    logger.warn('window is about to close');
    // 
});
