import {
    capitalizeFirstLetter,
    toRelativeString
} from '../../../modules/string-utils.mjs.js';
import { createLogger } from '../../../modules/logger.mjs.js';
import { webHandler } from '../../../modules/ui-utils.mjs.js';

const logger = createLogger('views/popups/list-all');

const actionButtonHandler = async (event, action, guid) => {
    // 
    // 
    // 
    // 
    event.stopPropagation();

    await messenger.runtime.sendMessage({
        action: `do:mindr-action-${action}`,
        payload: {
            guid
        }
    });

    window.close();
};

const createMindrItem = mindr => {
    const {
        guid,
        due,
        metaData: { author, subject }
    } = mindr;
    const relative = due - Date.now();
    const item = document.createElement('li');
    item.className = `mailmindr-list-item ${
        relative < 0 ? 'mailmindr-list-item--is-in-past' : ''
    }`;
    item.setAttribute('guid', guid);

    const contentWrapper = document.createElement('div');
    contentWrapper.className = 'mailmindr-list-item-content';

    const actionWrapper = document.createElement('div');
    actionWrapper.className = 'mailmindr-list-item-buttonpanel';
    const actionList = document.createElement('ul');

    ['edit', 'remove'].forEach(action => {
        const actionItem = document.createElement('li');
        const actionButton = document.createElement('button');
        actionButton.className = `mailmindr-list-item-action mailmindr-icon--${action}`;
        actionButton.dataset.guid = guid;
        actionButton.dataset.action = action;

        const actionButtonIcon = document.createElement('img');
        actionButtonIcon.src = {
            edit: 'chrome://messenger/skin/icons/newmsg.svg',
            remove: 'chrome://messenger/skin/icons/delete.svg'
        }[action];

        actionButtonIcon.width = 16;
        actionButtonIcon.height = 16;

        actionButton.appendChild(actionButtonIcon);

        actionButton.addEventListener(
            'click',
            async event => await actionButtonHandler(event, action, guid)
        );

        actionItem.appendChild(actionButton);
        actionList.appendChild(actionItem);
    });

    actionWrapper.appendChild(actionList);

    const subjectWrapper = document.createElement('div');
    subjectWrapper.className = 'mailmindr-list-item-subject';
    subjectWrapper.innerText = subject;

    const authorWrapper = document.createElement('div');
    authorWrapper.className = 'mailmindr-list-item-author';
    authorWrapper.innerText = author;

    const dueWrapper = document.createElement('div');
    dueWrapper.className = 'mailmindr-list-item-duedate';

    const relativeString = capitalizeFirstLetter(toRelativeString(due));
    const absoluteLocaleDate = new Intl.DateTimeFormat(navigator.language, {
        dateStyle: 'short',
        timeStyle: 'short'
    }).format(due);
    dueWrapper.innerText = `${relativeString}  (${absoluteLocaleDate})`;

    contentWrapper.appendChild(actionWrapper);
    contentWrapper.appendChild(subjectWrapper);
    contentWrapper.appendChild(authorWrapper);
    contentWrapper.appendChild(dueWrapper);

    item.appendChild(contentWrapper);
    item.addEventListener('click', async () => {
        await messenger.runtime.sendMessage({
            action: 'navigate:open-message-by-mindr-guid',
            payload: {
                guid
            }
        });

        window.close();
    });

    return item;
};

const displayList = (listElement, mindrs) => {
    mindrs.forEach(mindr => {
        listElement.appendChild(createMindrItem(mindr));
    });
};

const clearList = listElement => {
    Array.from(listElement.children).forEach(listItemElement =>
        listItemElement.remove()
    );
};

const sortMindrsByDueDateAsc = mindrs => mindrs.sort((a, b) => a.due - b.due);

const loadMindrs = async () => {
    const data = await messenger.runtime.sendMessage({
        action: 'mindrs:list'
    });

    if (!data) {
        return;
    }

    const {
        payload: { mindrs: unsortedMindrList }
    } = data;
    const mindrs = sortMindrsByDueDateAsc(unsortedMindrList);
    return mindrs;
};

const onLoad = async () => {
    const listElement = document.getElementById('mailmindr--list');
    clearList(listElement);

    const mindrs = await loadMindrs();
    displayList(listElement, mindrs);

    Array.from(
        document.querySelectorAll('button.mailmindr-button-web')
    ).forEach(btn => {
        btn.addEventListener('click', webHandler);
    });
};

document.addEventListener('DOMContentLoaded', onLoad, { once: true });
