import {
    capitalizeFirstLetter,
    toRelativeStringFromTimespan,
    pluralize
} from './string-utils.mjs.js';
import { createLogger } from './logger.mjs.js';

const logger = createLogger('core-utils');

export const findThunderbirdVersion = () => {
    // 
    const agent = window.navigator.userAgent;
    const version = (agent || '')
        .split('/')
        .pop()
        .split('.')
        .shift();
    return Number.parseInt(version) || 0;
};

export const isThunderbirdBelowVersion = version =>
    findThunderbirdVersion() < (version || 86);

export const buildQueryInfoForMessageAndFolder = (messageDetails, folder) => {
    const { headerMessageId, author, subject: _ } = messageDetails;
    const queryInfo = {
        headerMessageId: headerMessageId.substr(1, headerMessageId.length - 2),
        author: getMailAddress(author),
        folder: {
            accountId: folder.accountId,
            path: folder.path
        }
    };

    const thunderbirdVersion = findThunderbirdVersion();
    const isThunderbirdBelow86 = thunderbirdVersion < 86;

    if (isThunderbirdBelow86) {
        delete queryInfo.headerMessageId;
    }

    return queryInfo;
};

export const uniqueArray = (list, compare) => {
    return list.filter(
        compare || ((item, index, lst) => lst.indexOf(item) === index)
    );
};

export const isSameMindr = (mindrA, mindrB) =>
    mindrA.headerMessageId === mindrB.headerMessageId &&
    mindrA.guid === mindrB.guid;

export const createMailmindrId = scope =>
    `${scope}--${[Math.random(), Math.random(), Math.random()]
        .map(item => Math.round(item * 1000000).toString(16))
        .join('-')}`;

export const isExecuted = mindr => mindr.isExecuted;

export const isOverdue = mindr => {
    const now = Date.now();
    const due = mindr.due.getTime();
    return due <= now;
};

export const isActiveWithinLookAhead = (mindr, lookeahedInMinutes) => {
    const { due, remindMeMinutesBefore } = mindr;

    const now = Date.now();
    const dueTime = due.getTime();
    const reminderLookahead =
        (remindMeMinutesBefore || lookeahedInMinutes) * 60 * 1000;

    const remindMeAt = dueTime - reminderLookahead;
    logger.log(
        `>> reminder lookahead? ${remindMeMinutesBefore ||
            lookeahedInMinutes}, in milliseconds: ${reminderLookahead} which is ${new Date(
            remindMeAt
        )}, from due time: ${new Date(dueTime)}`
    );

    // 
    // 
    const executedButOverdue = isExecuted(mindr) && now >= remindMeAt;
    const remindBeforeDue = now < dueTime && remindMeAt < now;

    logger.log(
        `>> reminder executedButOverdue (${executedButOverdue}) / remindBeforeDue (${remindBeforeDue})`
    );

    return remindBeforeDue || executedButOverdue;
};

export const getParsedJsonOrDefaultValue = (value, defaultValue) => {
    try {
        return JSON.parse(value);
    } catch (exception) {
        logger.error(
            `getParsedJsonOrDefaultValue failed parsing and returns default value`,
            value,
            exception,
            'defaultValue: ',
            defaultValue
        );
        return defaultValue;
    }
};

export const equalTimePresetValues = (a, b) =>
    a &&
    b &&
    a.days === b.days &&
    a.hours === b.hours &&
    a.minutes === b.minutes &&
    a.isRelative === b.isRelative &&
    a.isGenerated === b.isGenerated &&
    a.isSelectable === b.isSelectable;

export const equalActionPresetValues = (a, b) =>
    a &&
    b &&
    a.flag === b.flag &&
    a.markUnread === b.markUnread &&
    a.showReminder === b.showReminder &&
    a.tagWithLabel === b.tagWithLabel &&
    a.copyMessageTo === b.copyMessageTo &&
    a.moveMessageTo === b.moveMessageTo;

export const createEmptyTimespan = (isRelative = true) => ({
    days: 0,
    hours: 0,
    minutes: 0,
    text: '',
    isRelative,
    isGenerated: false,
    isSelectable: true
});

export const createEmptyActionTemplate = () => ({
    flag: false,
    markUnread: false,
    showReminder: false,
    tagWithLabel: undefined,
    copyMessageTo: undefined,
    moveMessageTo: undefined,
    isSystemAction: false,
    text: ''
});

/**
 * createSystemTimespans - creates a list (array) of timespans
 * with 7 days and 7 hours
 */
export const createSystemTimespans = () => {
    let systemTimespans = [];

    const nonSelectablePreset = {
        ...createEmptyTimespan(),
        text: browser.i18n.getMessage('presets.time.userdefined'),
        isSelectable: false,
        isGenerated: true
    };
    systemTimespans.push(nonSelectablePreset);

    /* create a seven day lookahead */
    for (let days = 1; days <= 7; days++) {
        const dayPreset = {
            ...createEmptyTimespan(),
            days,
            isGenerated: true
        };

        dayPreset.text = capitalizeFirstLetter(
            toRelativeStringFromTimespan(dayPreset)
        );
        systemTimespans.push(dayPreset);
    }

    /* create a 6 hour window */
    for (let hours = 1; hours < 7; hours++) {
        const hourPreset = {
            ...createEmptyTimespan(true),
            hours,
            isGenerated: true
        };
        hourPreset.text = capitalizeFirstLetter(
            toRelativeStringFromTimespan(hourPreset)
        );
        systemTimespans.push(hourPreset);
    }

    return systemTimespans;
};

/**
 * createSystemActions - create an array of system actions:
 * - mark unread
 * - show dialog
 * - tag message with
 * ..
 */
export const createSystemActions = options => {
    let actionTemplates = [];

    const markUnreadAction = {
        ...createEmptyActionTemplate(),
        markUnread: true,
        isSystemAction: true,
        text: browser.i18n.getMessage('presets.action.mark-unread')
    };
    actionTemplates.push(markUnreadAction);

    const flagAction = {
        ...createEmptyActionTemplate(),
        flag: true,
        isSystemAction: true,
        text: browser.i18n.getMessage('presets.action.flag')
    };
    actionTemplates.push(flagAction);

    const reminderOnlyAction = {
        ...createEmptyActionTemplate(),
        showReminder: true,
        isSystemAction: true,
        text: browser.i18n.getMessage('presets.action.reminder-only')
    };

    actionTemplates.push(reminderOnlyAction);

    return actionTemplates;
};

export const getMailAddress = author => {
    if (!author) {
        logger.warn('author is empty');
        return null;
    }

    const tokenStartPos = author.indexOf('<');
    const tokenEndPos = author.indexOf('>');

    if (tokenStartPos > 0 && tokenStartPos < tokenEndPos) {
        const mayBeAddress = author.substring(tokenStartPos + 1, tokenEndPos);
        return mayBeAddress;
    }

    return author;
};

export const createMindrFromActionTemplate = async mindrData => {
    const {
        guid,
        headerMessageId,
        notes,
        actionTemplate,
        due,
        remindMeMinutesBefore,
        metaData,
        isExecuted = false
    } = mindrData;
    const {
        flag,
        markUnread,
        showReminder,
        tagWithLabel,
        copyMessageTo,
        moveMessageTo,
        isSystemAction
    } = actionTemplate;
    const action = {
        flag,
        markUnread,
        showReminder,
        tagWithLabel,
        copyMessageTo,
        moveMessageTo,
        isSystemAction
    };

    const mindrGuid = guid || createMailmindrId('mailmindr:mindr-guid');
    const modified = Date.now();

    return {
        guid: mindrGuid,
        headerMessageId,
        due,
        remindMeMinutesBefore,
        action,
        notes,
        metaData,
        isExecuted,
        modified
    };
};

export const getFlatFolderList = async () => {
    const accounts = await browser.accounts.list();
    const allFolders = [];

    const getNext = list => {
        const index = list.findIndex(item => !item.visited);
        return index < 0 ? null : { index, value: list[index] };
    };

    for await (let account of accounts) {
        allFolders.push({
            account,
            type: 'account',
            depth: 0,
            name: account.name
        });

        // 
        let folderList = (account.folders || []).map(item => ({
            visited: false,
            depth: 0,
            item
        }));

        // 
        let next = getNext(folderList);

        // 
        while (next) {
            // 
            const { index, value } = next;

            // 
            const {
                item: { folders, subFolders },
                depth
            } = value;

            // 
            const subfolders = (folders || subFolders || []).map(item => ({
                visited: false,
                item,
                depth: depth + 1
            }));

            // 
            folderList.splice(index + 1, 0, ...subfolders);

            // 
            value.visited = true;

            // 
            next = getNext(folderList);
        }

        // 
        for await (let option of folderList) {
            const { depth, item } = option;

            allFolders.push({
                type: 'folder',
                depth,
                name: item.name,
                folder: await localFolderToGenericFolder(item)
            });
        }
    }
    return allFolders;
};

export const localFolderToGenericFolder = async folder => {
    if (!folder) {
        return null;
    }

    const { accountId, name, path, type } = folder;
    const account = await browser.accounts.get(accountId);
    const identityEmailAddressList = account.identities.map(
        identity => identity.email
    );
    const identityEmailAddress = identityEmailAddressList[0];
    const genericFolder = { accountId, identityEmailAddress, name, path, type };

    return genericFolder;
};

export const genericFolderToLocalFolder = async genericFolder => {
    const { accountId, identityEmailAddress, name, path, type } = genericFolder;
    if (identityEmailAddress) {
        const accounts = await browser.accounts.list();
        const account = accounts.find(account =>
            account.identities.find(
                identity => identity.email === identityEmailAddress
            )
        );

        // 
        if (account) {
            return { accountId: account.id, name, path, type };
        }
    }

    // 
    return { accountId, name, path, type };
};

export const genericFoldersAreEqual = (a, b) =>
    a &&
    b &&
    (a.name || '') === (b.name || '') &&
    (a.path || '') === (b.path || '') &&
    (a.type || '') === (b.type || '') &&
    (a.identityEmailAddress || '') === (b.identityEmailAddress || '');

export const getPostPoneItems = () => {
    const minutesBeforeDueDate = [15, 10, 5, 0];
    const minutes = [5, 10, 15, 30, 45];
    const hours = [1, 2, 4];

    const result = [
        ...minutesBeforeDueDate.map(item => ({
            caption: pluralize(
                item,
                'mailmindr.utils.core.plural.beforestart.minutes'
            ),
            value: item,
            unit: 'minutes',
            type: 'beforeStart'
        })),
        {
            type: 'separator'
        },
        ...minutes.map(item => ({
            caption: pluralize(item, 'mailmindr.utils.core.plural.minutes'),
            value: item,
            unit: 'minutes',
            type: 'postpone'
        })),
        ...hours.map(item => ({
            caption: pluralize(item, 'mailmindr.utils.core.plural.hours'),
            value: item,
            unit: 'hours',
            type: 'postpone'
        }))
    ];

    return result;
};
