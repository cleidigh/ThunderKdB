import {
    createMindrFromActionTemplate,
    createMailmindrId,
    createSystemActions,
    createSystemTimespans,
    localFolderToGenericFolder,
    isActiveWithinLookAhead,
    isOverdue,
    isSameMindr,
    equalTimePresetValues,
    genericFolderToLocalFolder,
    getFlatFolderList,
    isExecuted
} from '../modules/core-utils.mjs.js';
import {
    getCurrentStorageAdapterVersion,
    getStorageAdapter
} from '../modules/storage.mjs.js';
import { createCorrelationId, createLogger } from '../modules/logger.mjs.js';
import { applyActionToMessageInFolder } from '../modules/message-utils.mjs.js';

const logger = createLogger('background');

let state = {
    presets: {
        actions: [],
        time: []
    },
    settings: [],
    mindrs: [],
    active: [],
    overdue: [],
    openDialogs: [],
    openConnections: [],
    __inExecution: []
};

const getState = () => {
    return state;
};

const createInitialSettings = (presets, _settings) => ({
    snoozeTime: 15, // 15 minutes is initial default
    defaultIceboxFolder: null, // we don't set a folder by default
    defaultTimePreset:
        presets.time?.[presets.time?.find(item => item.isSelectable) || 0], // get first preset (if any)
    defaultActionPreset:
        presets.actions?.[presets.actions?.find(item => item.isSelectable) || 0] // get first preset (if any)
});

const createSystemPresets = () => ({
    time: createSystemTimespans(),
    actions: createSystemActions()
});

const initializeStorage = async () => {
    // 
    const storage = await browser.storage.local.get(null);
    const persistedStorageVersion = storage?.storageVersion || 1;

    // 
    const storageVersion = getCurrentStorageAdapterVersion();
    const { loadState, storeState } = getStorageAdapter(storageVersion);

    // 
    if (storageVersion > persistedStorageVersion) {
        // 
        const { loadState: loadLegacyState } = getStorageAdapter(
            persistedStorageVersion
        );

        // 
        const legacyState = await loadLegacyState();

        logger.warn(`legacy storage migrated: `, legacyState);

        // 
        await storeState(legacyState);
    }

    // 
    const restoredState = await loadState();

    // 
    const { time: systemGeneratedTimePresets, actions } = createSystemPresets();
    const defaultSettings = createInitialSettings({
        systemGeneratedTimePresets,
        actions
    });

    // 
    const settings = {
        ...defaultSettings,
        ...restoredState.settings
    };

    // 
    const userGeneratedTimePresets = (
        restoredState?.presets?.time || []
    ).filter(item => !item.isGenerated && item.isSelectable);
    const time = [...systemGeneratedTimePresets, ...userGeneratedTimePresets];

    // 
    const localState = {
        ...restoredState,
        settings,
        presets: {
            time,
            actions
        },
        overdue: [], // can be computed
        active: [], // can be computed
        openDialogs: [], // can be computed
        openConnections: [], // can be computed
        __inExecution: []
    };

    logger.debug(`restored state: `, localState);

    return localState;
};

const getSettings = () => {
    const { presets, settings } = getState();
    return { presets, settings };
};

const onHeartBeat = async () => {
    const windows = await messenger.windows.getAll({
        windowTypes: ['normal', 'app']
    });
    if (!windows.length) {
        return;
    }

    await dispatch('heartbeat');

    const executeOverdueMindrs = async () => {
        const { overdue, active, __inExecution } = getState();
        const overdueNotExecuted = overdue.filter(item => !item.isExecuted);

        if (Array.isArray(__inExecution) && __inExecution.length > 0) {
            logger.warn(
                `Mindr is executing (${__inExecution.length} in total), skipping further executions`,
                { overdue, active, __inExecution }
            );
            return;
        }

        for (let mindr of overdueNotExecuted) {
            const { guid } = mindr;
            await dispatch('state:lock-execution', { guid });
            const executed = await executeMindr(mindr);
            await dispatch('state:unlock-execution', { guid });
            if (executed) {
                await dispatch('mindr:create-or-update', {
                    ...mindr,
                    isExecuted: true
                });
            }
        }
    };

    const showAlertDialog = async () => {
        const { overdue, active } = getState();
        const overdueAndUnexecuted = overdue.filter(
            mindr => !isExecuted(mindr)
        );

        if (overdueAndUnexecuted.length > 0 || active.length > 0) {
            await showMindrAlert({ overdue: overdueAndUnexecuted, active });
        }
    };

    await executeOverdueMindrs();
    await showAlertDialog();
};

const startHeartbeat = () => {
    setInterval(onHeartBeat, 1000 * 45);
};

const createOrUpdateMindr = async (state, mindr) => {
    const { mindrs: allMindrs, ...stateWithoutMindrs } = state;
    const mindrsWithoutUpdatedMindr = allMindrs.filter(
        item => !isSameMindr(item, mindr)
    );
    const mindrs = [...mindrsWithoutUpdatedMindr, mindr];

    const storageVersion = getCurrentStorageAdapterVersion();
    const { storeState } = getStorageAdapter(storageVersion);

    const localState = {
        ...stateWithoutMindrs,
        mindrs
    };

    await storeState(localState);

    return localState;
};

const executeMindr = async mindr => {
    const { headerMessageId, metaData, action, guid } = mindr;
    logger.log(`START executeMindr ${guid} w/ msgHdrId: '${headerMessageId}'`, {
        guid,
        headerMessageId
    });
    const {
        author,
        subject,
        folderAccountId,
        folderName,
        folderPath,
        folderType,
        folderAccountIdentityMailAddress
    } = metaData;
    const correlationId = createCorrelationId('executeMindr');
    const executionStart = Date.now();
    const { copyMessageTo, moveMessageTo } = action;

    const applyAction = async (messageId, action) => {
        const {
            flag,
            markUnread,
            showReminder,
            tagWithLabel,
            copyMessageTo,
            moveMessageTo
        } = action;
        const messageProps = {
            ...(flag && { flagged: true }),
            ...(markUnread && { read: false })
        };

        logger.info(`→ apply update to message ${messageId}`, messageProps);

        await messenger.messages.update(messageId, messageProps);
    };

    const destinationFolder = moveMessageTo
        ? await genericFolderToLocalFolder(moveMessageTo)
        : null;
    const possibleSourceFolder = await genericFolderToLocalFolder({
        accountId: folderAccountId,
        path: folderPath,
        identityEmailAddress: folderAccountIdentityMailAddress
    });
    const flatFolderList = await getFlatFolderList();
    const localFlatFolderList = await Promise.all(
        flatFolderList
            .filter(({ type }) => type === 'folder')
            .map(async ({ folder }) => await genericFolderToLocalFolder(folder))
    );
    const folders = [
        possibleSourceFolder,
        ...localFlatFolderList.filter(
            fldr =>
                fldr.accountId !== possibleSourceFolder.accountId &&
                fldr.path !== possibleSourceFolder.path
        )
    ];

    logger.log(`BEGIN execution of ${mindr.guid}`, {
        correlationId,
        guid
    });
    const startTime = performance.now();

    const targetFolders = folders;

    let hasError = false;

    logger.log(`BEGIN targetFolder iteration`, {
        guid,
        correlationId,
        targetFolderCount: (targetFolders || []).length,
        targetFolders
    });

    const applyActionToMessage = async (message, messageFolder) => {
        const { id } = message;

        await applyAction(id, action);
        if (destinationFolder) {
            await doMoveMessageToFolder(
                message,
                destinationFolder,
                correlationId
            );
        }
    };

    for await (let folder of targetFolders) {
        logger.log(` -- executeMindr: folder loop (${folder.name})`, {
            correlationId,
            folder
        });

        try {
            await applyActionToMessageInFolder(
                folder,
                { headerMessageId, author },
                applyActionToMessage,
                true
            );
        } catch (ex) {
            logger.error('ERROR: execute mindr // mailmindr: >> !!', {
                correlationId,
                guid,
                exception: ex
            });
            hasError = true;
        }
    }
    logger.log(`END targetFolder iteration`, {
        correlationId,
        guid,
        targetFolderCount: (targetFolders || []).length,
        targetFolders
    });

    const endTime = performance.now();
    logger.log(
        `mailmindr: execution finished in ${endTime - startTime}ms`,
        moveMessageTo
    );

    const executionEnd = Date.now();
    const executionDuration = (executionEnd - executionStart) / 1000;

    if (executionDuration > 3 * 60) {
        logger.error(
            `Execution of mindr '${guid}' took more than 180 seconds`,
            { guid, correlationId, executionDuration }
        );
    } else if (executionDuration > 60) {
        logger.warn(`Execution of mindr '${guid}' took more than 60 seconds`, {
            guid,
            correlationId,
            executionDuration
        });
    } else {
        logger.warn(
            `Execution of mindr '${guid}' took ${executionDuration} seconds`,
            { guid, correlationId, executionDuration }
        );
    }
    logger.log(`END execution of ${mindr.guid}`, { correlationId, guid });
    logger.log(`END executeMindr ${guid} w/ msgHdrId: '${headerMessageId}'`, {
        guid,
        headerMessageId
    });

    return !hasError;
};

const dispatch = async (action, payload) => {
    const correlationId = createCorrelationId('dispatch');

    const getUpdatedState = async (theAction, thePayload) => {
        const storageVersion = getCurrentStorageAdapterVersion();
        const { storeState } = getStorageAdapter(storageVersion);

        try {
            switch (theAction) {
                case 'heartbeat': {
                    const { mindrs: mindrList } = getState();
                    const { mindrs, overdue, active } = mindrList.reduce(
                        (collector, currentMindr) => {
                            // 
                            // 
                            // 
                            // 
                            // 
                            // 

                            if (isOverdue(currentMindr)) {
                                // 
                                collector.overdue.push(currentMindr);
                            }

                            // 
                            // 
                            if (isActiveWithinLookAhead(currentMindr, 0)) {
                                // 
                                // 
                                collector.active.push(currentMindr);
                            }

                            // 
                            collector.mindrs.push(currentMindr);

                            return collector;
                        },
                        { mindrs: [], overdue: [], active: [] }
                    );

                    // 
                    // 
                    // 

                    return { ...state, mindrs, active, overdue };
                }
                case 'connection:open': {
                    const { port } = payload;

                    const openConnections = [...state.openConnections, port];
                    logger.log(
                        `open connections: ${openConnections.length}`,
                        openConnections
                    );
                    return { ...state, openConnections };
                }
                case 'connection:close': {
                    const { port } = payload;
                    const { name } = port;

                    const openConnections = getState().openConnections.filter(
                        connection => connection.name !== name
                    );

                    return { ...state, openConnections };
                }
                case 'dialog:open': {
                    const newDialogDetails = thePayload;
                    const openDialogs = [
                        ...state.openDialogs,
                        newDialogDetails
                    ];
                    return { ...state, openDialogs };
                }
                case 'dialog:close': {
                    const { dialogId } = thePayload;
                    const { openDialogs: dialogs } = getState();
                    const dialogDetails = dialogs.find(
                        dialogInfo => dialogId === dialogInfo.dialogId
                    );
                    if (dialogDetails) {
                        const openDialogs = dialogs.filter(
                            openDialog => openDialog.dialogId !== dialogId
                        );
                        logger.info(
                            `remaining open dialogs: `,
                            openDialogs.length
                        );
                        return {
                            ...state,
                            openDialogs
                        };
                    } else {
                        logger.warn(
                            `cannot find details for open dialog ID: '${dialogId}'`,
                            {
                                payload: thePayload,
                                dialogId,
                                openDialogs: dialogs
                            }
                        );
                    }
                    return state;
                }
                case 'state:initialize':
                    return await initializeStorage();
                case 'mindr:create-or-update': {
                    return await createOrUpdateMindr(state, thePayload);
                }
                case 'mindr:remove': {
                    const { guid } = thePayload;
                    const currentState = getState();
                    const {
                        mindrs: stateMindrs,
                        overdue: stateOverdue,
                        active: stateActive
                    } = currentState;

                    // 
                    const mindrs = stateMindrs.filter(
                        item => item.guid !== guid
                    );

                    const overdue = (stateOverdue || []).filter(
                        mindr => mindr.guid !== guid
                    );
                    const active = (stateActive || []).filter(
                        mindr => mindr.guid !== guid
                    );

                    if (
                        stateOverdue.length === overdue.length &&
                        stateActive.length === active.length &&
                        stateMindrs.length === mindrs.length
                    ) {
                        // 

                        return getState();
                    }

                    const localState = {
                        ...currentState,
                        mindrs,
                        active,
                        overdue
                    };

                    await storeState(localState);

                    return localState;
                }
                case 'preset:timespan-create': {
                    const currentState = getState();
                    const { presets } = currentState;
                    const { time } = presets;
                    const { current } = thePayload;

                    const localState = {
                        ...currentState,
                        presets: {
                            ...presets,
                            time: [...time, current]
                        }
                    };

                    await storeState(localState);

                    return localState;
                }
                case 'preset:timespan-update': {
                    const currentState = getState();
                    const { presets } = currentState;
                    const { time: timePresets } = presets;
                    const { current, source } = thePayload;
                    const time = timePresets.map(item =>
                        equalTimePresetValues(item, source) ? current : item
                    );

                    logger.info(`new presets:`, time);

                    const newState = {
                        ...currentState,
                        presets: {
                            ...presets,
                            time
                        }
                    };

                    await browser.storage.local.set({
                        presets: newState.presets
                    });

                    return newState;
                }
                case 'preset:timespan-remove': {
                    const currentState = getState();
                    const { presets } = currentState;
                    const { time: timePresets } = presets;
                    const { presets: toBeRemoved = [] } = thePayload;

                    let time = [...timePresets];
                    toBeRemoved.forEach(toBeRemovedPreset => {
                        time = time.filter(
                            preset =>
                                !equalTimePresetValues(
                                    preset,
                                    toBeRemovedPreset
                                )
                        );
                    });

                    const newState = {
                        ...currentState,
                        presets: {
                            ...presets,
                            time
                        }
                    };

                    await browser.storage.local.set({
                        presets: newState.presets
                    });

                    return newState;
                }
                case 'setting:update': {
                    const currentState = getState();
                    const { name, value } = thePayload;

                    const localState = {
                        ...currentState,
                        settings: { ...state.settings, [name]: value }
                    };

                    storeState(localState);

                    return localState;
                }
                case 'state:lock-execution': {
                    // 
                    // 
                    const currentState = getState();
                    const { guid } = thePayload;

                    const localState = {
                        ...currentState,
                        __inExecution: [...currentState.__inExecution, guid]
                    };

                    storeState(localState);

                    return localState;
                }
                case 'state:unlock-execution': {
                    // 
                    const currentState = getState();
                    const { guid } = thePayload;

                    const localState = {
                        ...currentState,
                        __inExecution: currentState.__inExecution.filter(
                            item => item !== guid
                        )
                    };

                    storeState(localState);

                    return localState;
                }
            }
        } catch (exception) {
            logger.error(`ugh, we're compromising the state:`, exception);
        }
    };

    try {
        logger.log(`:: acn :: ${action}`, { correlationId, action, payload });
        const mutatedState = await getUpdatedState(action, payload);
        if (!mutatedState) {
            logger.error(`:: acn :: ${action} failed`, {
                correlationId,
                action,
                payload
            });
            return;
        }

        state = mutatedState;

        try {
            await refreshButtons();
        } catch (buttonUpdateException) {
            /* there's silence */
        }
    } catch (e) {
        logger.error(`mailmindr crashed due to ${e.message}`, {
            correlationId,
            error: e
        });
    }
};

const sendConnectionMessage = async (connectionName, message) => {
    const { openConnections } = getState();
    logger.info(`open connections?`, openConnections, 'send message', message);
    const connection = openConnections.find(con => con.name === connectionName);
    if (connection) {
        await connection.postMessage(message);
    }
};

const findDialogForType = dialogType => {
    const { openDialogs } = getState();
    return openDialogs.find(dialog => dialog.dialogType === dialogType);
};

const findMindrByGuid = guid => {
    const { mindrs } = getState();
    const result = (mindrs || []).find(item => item.guid === guid);

    return result;
};

const editMindrByGuid = async guid => {
    const correlationId = createCorrelationId('editMindrByGuid');
    logger.log('BEGIN editMindrByGuid', { correlationId, guid });
    const mindr = findMindrByGuid(guid);
    const {
        headerMessageId,
        author,
        subject,
        folderAccountId,
        folderName,
        folderPath,
        folderType,
        folderAccountIdentityMailAddress
    } = mindr.metaData;
    const folder = {
        accountId: folderAccountId,
        name: folderName,
        path: folderPath,
        type: folderType
    };
    const message = {
        headerMessageId,
        author,
        folder,
        subject
    };
    await showCreateOrUpdateMindrDialog(message, mindr);
    logger.log('END editMindrByGuid', { correlationId, guid });
};

const bringDialogToFront = async dialogType => {
    const dialog = await findDialogForType(dialogType);

    if (!dialog) {
        return false;
    }

    await messenger.windows.update(dialog.details.id, {
        focused: true
    });

    return true;
};

const closeCreateOrUpdateMindrDialog = async () => {
    const correlationId = createCorrelationId('closeCreateOrUpdateMindrDialog');
    const dialogType = 'mailmindr:dialog:set-mindr';
    const dialog = findDialogForType(dialogType);

    logger.log(`BEGIN closeCreateOrUpdateMindrDialog`, {
        correlationId,
        dialogType,
        dialog
    });

    if (dialog) {
        await dispatch('dialog:close', {
            dialogId: dialog.dialogId
        });

        messenger.windows.remove(dialog.details.id);
    }

    logger.log(`END closeCreateOrUpdateMindrDialog`, {
        correlationId,
        dialogType,
        dialog
    });
};

const showCreateOrUpdateMindrDialog = async (currentMessage, mindr) => {
    const dialogType = 'mailmindr:dialog:set-mindr';
    const { headerMessageId, author, folder, subject } = currentMessage;
    const genericFolder = await localFolderToGenericFolder(folder);

    logger.info('generic folder', genericFolder);

    const { accountId, name, path, type, identityEmailAddress } = genericFolder;
    // 
    // 
    // 
    // 
    // 
    // 

    const dialogId = createMailmindrId('mailmindr:dialog:set-mindr');

    const parameters = new URLSearchParams();
    parameters.set('dialogId', dialogId);
    parameters.set('headerMessageId', headerMessageId);
    parameters.set('author', author);
    parameters.set('subject', subject);

    if (mindr) {
        parameters.set('guid', mindr.guid);
    }

    parameters.set('folderAccountId', accountId);
    parameters.set('folderName', name || '');
    parameters.set('folderPath', path || '');
    parameters.set('folderType', type || '');
    parameters.set(
        'folderAccountIdentityMailAddress',
        identityEmailAddress || ''
    );

    const url = `/views/dialogs/create-mindr/index.html?${parameters}`;
    const details = await messenger.windows.create({
        height: 365,
        width: 500,
        url,
        type: 'popup',
        allowScriptsToClose: true
    });

    await dispatch('dialog:open', { dialogId, dialogType, details });
};

const showMindrAlert = async ({ overdue, active }) => {
    const dialogType = 'mailmindr:mindr-alert';
    const dialog = findDialogForType(dialogType);

    if (dialog) {
        logger.log('we already have a message dialog', dialog);

        if ((overdue || []).length === 0 && (active || []).length === 0) {
            // 
            await dispatch('dialog:close', {
                dialogId: dialog.details.id
            });
            messenger.windows.remove(dialog.details.id);
        } else {
            // 
            await sendConnectionMessage('connection:mindr-alert', {
                overdue,
                active
            });
            await messenger.windows.update(dialog.details.id, {
                // 
                drawAttention: true
            });
        }
    } else {
        logger.log(
            'need to open a new dialog with active/overdue mindrs',
            active,
            overdue
        );
        if ((active || []).length === 0 && (overdue || []).length === 0) {
            logger.log('no dialog needed');
            return;
        }
        const dialogId = createMailmindrId('mailmindr:dialog:mindr-alert');

        const parameters = new URLSearchParams();
        parameters.set('dialogId', dialogId);

        const { width: screenWidth, availHeight: screenHeight } = screen;
        const height = 200;
        const width = 380;
        const left = screenWidth - width;
        const top = screenHeight - height;
        const url = `/views/dialogs/mindr-alert/index.html?${parameters}`;
        const details = await messenger.windows.create({
            left,
            top,
            height,
            width,
            url,
            type: 'popup',
            state: 'normal',
            allowScriptsToClose: true
        });

        await messenger.windows.update(details.id, {
            top,
            left,
            width,
            height,
            focused: true,
            drawAttention: true
        });

        await dispatch('dialog:open', { dialogId, dialogType, details });
    }
};

const showTimespanPresetEditor = async timePreset => {
    const dialogType = 'mailmindr:time-preset-editor';
    const hasDialog = await bringDialogToFront(dialogType);

    if (hasDialog) {
        return;
    }

    const dialogId = createMailmindrId('mailmindr:dialog:time-preset-editor');

    const parameters = new URLSearchParams();
    parameters.set('dialogId', dialogId);
    if (timePreset) {
        parameters.set('preset', JSON.stringify(timePreset));
    }

    const height = 475;
    const width = 380;
    const url = `/views/dialogs/time-preset-editor/index.html?${parameters}`;
    const details = await messenger.windows.create({
        height,
        width,
        url,
        type: 'popup',
        state: 'normal',
        allowScriptsToClose: true
    });

    await dispatch('dialog:open', { dialogId, dialogType, details });
};

const handleStartup = async () => {
    await dispatch('state:initialize');
    startHeartbeat();
    messenger.messageDisplayScripts.register({
        js: [{ file: '/scripts/mailmindr-message-script.js' }]
    });
};

const findExistingMindrForTab = async tab => {
    const { id, windowId } = tab;
    const message = await getCurrentDisplayedMessage({ id, windowId });
    if (message) {
        const { headerMessageId } = message;
        const { mindrs } = getState();
        const mindr = mindrs.find(
            mindr =>
                mindr.headerMessageId === headerMessageId && !!headerMessageId
        );

        return mindr;
    }

    return null;
};

const handleSelectedMessagesChanged = async (tab, messageList) => {
    const mindr = await findExistingMindrForTab(tab);
    const title = !!mindr ? '!' : null;
    const details = { text: title };
    const { id, windowId: _ } = tab;

    messenger.messageDisplayAction.setBadgeText(details);

    if (!mindr) {
        messenger.tabs.executeScript(id, {
            code: `typeof removeExistingMessageBars === 'function' && removeExistingMessageBars()`
        });
        return;
    }

    messenger.messageDisplayAction.setBadgeBackgroundColor({
        color: '#ad3bff'
    });
    messenger.tabs.insertCSS(id, {
        file: '/styles/message-bar.css'
    });
    messenger.tabs.executeScript(id, {
        code: `createMindrBar('${JSON.stringify(mindr.guid)}')`
    });
};

const getCurrentDisplayedMessage = async tab => {
    const correlationId = createCorrelationId('getCurrentDisplayedMessage');
    const { id: tabId, windowId = WINDOW_ID_CURRENT } = tab;
    const query = {
        windowId
    };
    const tabs = await browser.tabs.query(query);

    if (!tabs || tabs.length === 0) {
        return undefined;
    }

    const message = await browser.messageDisplay.getDisplayedMessage(tabId);
    if (!message) {
        // 
        return null;
    }

    const messageId = message.id;

    logger.log(
        'BEGIN getCurrentDisplayedMessage, get full message and find messageHeaderId',
        { correlationId, messageId }
    );
    let messageWithHeader = null;
    try {
        messageWithHeader = await browser.messages.getFull(messageId);
    } catch (ex) {
        logger.warn(`could not retrieve full message`, {
            correlationId,
            messageId,
            error: ex,
            errorMessage: ex.message
        });
    }
    logger.log(
        'END getCurrentDisplayedMessage, get full message and find messageHeaderId',
        { correlationId, messageId }
    );
    if (messageWithHeader) {
        const headerMessageIds = messageWithHeader.headers['message-id'];
        logger.log(`headerMessageIds of selected Message`, {
            correlationId,
            headerMessageIds
        });

        let headerMessageId = null;
        try {
            headerMessageId = messageWithHeader.headers['message-id'][0];
        } catch (exception) {
            logger.error(`message with header`, {
                correlationId,
                messageWithHeader,
                headers: messageWithHeader.headers
            });
        }

        return {
            ...message,
            headerMessageId
        };
    }

    return message;
};

const refreshButtons = async () => {
    try {
        const { mindrs } = getState();
        const hasMindrs = mindrs.length;
        const current = await messenger.tabs.query({
            currentWindow: true,
            active: true
        });

        if (!current || !Array.isArray(current) || current.length === 0) {
            return;
        }

        const { id, windowId: _ } = current[0];

        if (hasMindrs) {
            messenger.browserAction.enable(id);
        } else {
            messenger.browserAction.disable(id);
        }

        // 
        // 
        messenger.messageDisplayAction.enable(id);

        // 
        handleSelectedMessagesChanged(current[0]);
    } catch (e) {
        logger.error(`refreshButtons: `, e);
    }
};

async function onLoadDialog(dialogOpenInfo) {
    const { name, ...rest } = dialogOpenInfo;
    switch (name) {
        case 'set-mindr': {
            const { settings, presets, mindrs } = getState();
            const { guid } = rest;

            const mindr = mindrs.find(mindr => mindr.guid === guid);

            return {
                settings,
                presets,
                mindr
            };
        }
        case 'mindr-alert': {
            const { active, overdue } = getState();
            return { active, overdue };
        }
        case 'time-preset-editor': {
            logger.log('REST', rest);
            return { ...rest };
            break;
        }
        default:
            logger.log(
                `mailmindr:onLoadDialog // no data loadable for dialog '${name}'`
            );
    }
}

const onWindowRemoved = async windowId => {
    const { openDialogs } = getState();
    const dialogInfo = openDialogs.find(
        dialog => dialog.details.id === windowId
    );
    logger.info(`onWindowRemoved called`, dialogInfo);
    if (dialogInfo) {
        logger.warn(
            `onWindowRemoved: will remove dialog: ${windowId} w/ ${dialogInfo.dialogId}`
        );
        const { dialogId, dialogType = '' } = dialogInfo;
        switch (dialogType.toLowerCase()) {
            case 'mailmindr:time-preset-editor':
                await sendConnectionMessage('connection:mailmindr-options', {
                    topic: 'settings:unlock',
                    message: { settings: getSettings() }
                });
                break;
        }
        await dispatch('dialog:close', { dialogId });
    }
};

const doMoveMessageToFolder = async (
    message,
    destinationFolder,
    parentCorrelationId
) => {
    const correlationId = createCorrelationId(
        'doMoveMessageToFolder',
        parentCorrelationId
    );
    try {
        const { id } = message;
        const { accountId, path } = destinationFolder;
        logger.log(`BEGIN move message ${id}`, {
            correlationId,
            message
        });
        await messenger.messages.move([id], { accountId, path });
        logger.log(`END move message ${id}`, {
            correlationId,
            message
        });
        return true;
    } catch (error) {
        logger.error(error, { correlationId });
        return false;
    }
};

const moveMessageToFolder = async (
    messageDetails,
    sourceFolder,
    targetFolder
) => {
    const correlationId = createCorrelationId('moveMessagesToFolder');
    try {
        logger.info('moveMessageToFolder target', {
            correlationId,
            targetFolder
        });

        const moveMessageToFolderAction = async (
            message,
            _messageSourceFolder
        ) => {
            await doMoveMessageToFolder(message, targetFolder, correlationId);
        };

        logger.info(`BEGIN applying action to folder`, {
            correlationId,
            sourceFolder,
            messageDetails
        });
        const success = await applyActionToMessageInFolder(
            sourceFolder,
            messageDetails,
            moveMessageToFolderAction,
            true
        );
        logger.info(`result: ${success}`, { correlationId, success });
        logger.info(`END applying action to folder`, {
            correlationId,
            sourceFolder,
            messageDetails
        });
    } catch (e) {
        logger.error(`moveMessageToFolder failed: ${e.message}`, {
            correlationId,
            error: e
        });
        return false;
    }

    return true;
};

const moveToIcebox = async (headerMessageId, metaData) => {
    const {
        settings: { defaultIceboxFolder }
    } = getState();

    if (!defaultIceboxFolder) {
        return false;
    }
    const correlationId = createCorrelationId('moveToIcebox');
    logger.log('BEGIN moveToIcebox', {
        correlationId,
        headerMessageId,
        metaData
    });

    const sourceFolder = {
        accountId: metaData.folderAccountId,
        path: metaData.folderPath
    };

    const targetFolder = await genericFolderToLocalFolder(defaultIceboxFolder);
    const { author, subject } = metaData;

    const messageDetails = {
        headerMessageId,
        author,
        subject
    };

    const success = await moveMessageToFolder(
        messageDetails,
        sourceFolder,
        targetFolder
    );

    logger.log('END moveToIcebox', {
        correlationId,
        headerMessageId,
        metaData
    });

    return success;
};

const messageHandler = async (request, _sender, _sendResponse) => {
    const { action, payload } = request;
    let result = null;

    switch (action) {
        case 'dialog:open':
            result = {
                status: 'ok',
                payload: await onLoadDialog(payload)
            };

            return result;
        case 'dialog:close':
            const dialogId = payload;
            const { openDialogs } = getState();
            const dialog = openDialogs.find(
                dialog => dialog.dialogId === dialogId
            );

            await dispatch('dialog:close', { dialogId });

            return { status: 'ok', dialog };
            break;
        case 'dialog:bring-to-front':
            const { dialogType } = payload;
            const hasDialog = await bringDialogToFront(dialogType);
            if (hasDialog) {
                return { status: 'ok', paylad: null };
            } else {
                return { status: 'error', paylad: null };
            }
            break;
        case 'mindrs:list':
            result = {
                status: 'ok',
                payload: {
                    mindrs: state.mindrs
                }
            };
            return result;
        case 'mindr:create': {
            const { guid, headerMessageId, metaData, doMoveToIcebox } = payload;
            const correlationId = createCorrelationId(
                `messageHandler:mindr:create`
            );
            logger.log(`BEGIN messageHandler:mindr:create`, {
                correlationId,
                payload
            });
            try {
                logger.log('create templates', { correlationId });
                const createdMindr = await createMindrFromActionTemplate({
                    ...payload
                });

                logger.log('await close dialog', { correlationId });
                await closeCreateOrUpdateMindrDialog();

                if (doMoveToIcebox) {
                    const isIceBoxed = Boolean(guid)
                        ? false
                        : await moveToIcebox(headerMessageId, metaData);

                    if (isIceBoxed) {
                        // 
                        // 
                        if (!createdMindr.action.moveMessageTo) {
                            const existingMindr = findMindrByGuid(guid);
                            if (existingMindr) {
                                logger.log(
                                    `updating existing mindr, set icebox folder from original mindr`,
                                    {
                                        correlationId,
                                        source_moveMessageTo:
                                            existingMindr.action.moveMessageTo
                                    }
                                );
                                // 
                                // 
                                createdMindr.action.moveMessageTo =
                                    existingMindr.action.moveMessageTo;
                            } else {
                                // 
                                const destinationFolderDetails = {
                                    accountId: metaData.folderAccountId,
                                    name: metaData.folderName,
                                    path: metaData.folderPath,
                                    type: metaData.folderType,
                                    identityEmailAddress:
                                        metaData.folderAccountIdentityMailAddress
                                };

                                // 
                                const {
                                    settings: { defaultIceboxFolder }
                                } = getState();
                                const iceBoxFolder = await genericFolderToLocalFolder(
                                    defaultIceboxFolder
                                );
                                createdMindr.metaData.folderAccountId =
                                    iceBoxFolder.accountId;
                                createdMindr.metaData.folderName =
                                    iceBoxFolder.name;
                                createdMindr.metaData.folderPath =
                                    iceBoxFolder.path;
                                createdMindr.metaData.folderType =
                                    iceBoxFolder.type;
                                createdMindr.metaData.folderAccountIdentityMailAddress =
                                    iceBoxFolder.identityEmailAddress;
                                createdMindr.action.moveMessageTo = await localFolderToGenericFolder(
                                    destinationFolderDetails
                                );
                            }
                        }
                    }
                }

                await dispatch('mindr:create-or-update', createdMindr);

                result = {
                    status: createdMindr ? 'ok' : 'error',
                    payload: {
                        message: 'mindr creation failed'
                    }
                };

                logger.log('refresh buttons', { correlationId });
                await refreshButtons();
            } catch (error) {
                logger.error(`FAIL messageHandler:mindr:create`, {
                    correlationId,
                    error,
                    payload
                });
            }

            logger.log(`END messageHandler:mindr:create`, {
                correlationId,
                payload
            });

            return result;
        }
        case 'mindr:remove': {
            const { guid } = payload;
            await dispatch('mindr:remove', { guid });

            return { status: 'ok', paylad: null };
        }
        case 'mindr:get-information': {
            logger.log('mindr:get-information', payload);
            const { guid } = payload;

            const { mindrs } = getState();
            const mindr = mindrs.find(mindr => mindr.guid === guid);

            logger.log(`mindr:get-information: ${mindr.headerMessageId}`);

            return { status: 'ok', payload: { mindr } };
        }
        case 'show:time-preset-editor': {
            const { preset } = payload;
            showTimespanPresetEditor(preset);
            break;
        }
        case 'navigate:open-message-by-mindr-guid':
            // 
            // 
            const { guid } = payload;
            const { mindrs } = getState();
            const mindr = mindrs.find(mindr => mindr.guid === guid);
            if (mindr) {
                const {
                    metaData: { folderAccountId, folderPath, author, subject },
                    headerMessageId
                } = mindr;
                const queryInfo = {
                    folder: { accountId: folderAccountId, path: folderPath },
                    subject,
                    author
                };

                await browser.mailmindrMessagesApi.openMessageByMessageHeaderId(
                    headerMessageId
                );

                // 
            }
            break;
        case 'refresh:buttons':
            await refreshButtons();
            break;
        case 'mindr:snooze': {
            const { minutes, list } = payload;

            do {
                const guid = list.pop();
                const { mindrs } = getState();
                const { presets, settings } = getSettings();
                const { snoozeTime } = settings;

                const mindr = mindrs.find(mindr => mindr.guid === guid);
                if (mindr) {
                    mindr.remindMeMinutesBefore =
                        mindr.remindMeMinutesBefore - (snoozeTime || 0);

                    const dueTime = mindr.due.getTime();
                    const now = Date.now();

                    if (dueTime < now) {
                        const diff = Math.floor(
                            (now + snoozeTime * 60 * 1000 - dueTime) / 60 / 1000
                        );
                        mindr.remindMeMinutesBefore = -1 * diff;
                    }

                    logger.log(`snoozed by: `, mindr.remindMeMinutesBefore);

                    await dispatch('mindr:create-or-update', mindr);
                }
            } while (list.length);

            await dispatch('heartbeat');

            const { active, overdue } = getState();
            const overdueNotExecuted = overdue.filter(item => !item.isExecuted);

            await showMindrAlert({ overdue: overdueNotExecuted, active });

            return { status: 'ok', paylad: null };
        }
        case 'mindr:dismiss': {
            const { list } = payload;

            do {
                const guid = list.pop();

                await dispatch('mindr:remove', { guid });
            } while (list.length);

            const { active, overdue } = getState();
            const overdueNotExecuted = overdue.filter(item => !item.isExecuted);

            await showMindrAlert({ overdue: overdueNotExecuted, active });

            return { status: 'ok', paylad: null };
        }
        case 'preset:modify-timespan': {
            const { source, current } = payload;

            if (source) {
                // 
                logger.warn(`updating timespan`, current, source);
                await dispatch('preset:timespan-update', { current, source });
            } else {
                // 
                logger.info(`creating new timespan`, current);
                await dispatch('preset:timespan-create', { current });
            }

            await sendConnectionMessage('connection:mailmindr-options', {
                topic: 'settings:unlock',
                message: { settings: getSettings() }
            });

            return { status: 'ok', paylad: null };
        }
        case 'preset:remove-timespans': {
            const { presets } = payload;

            if (presets && Array.isArray(presets) && presets.length) {
                await dispatch('preset:timespan-remove', { presets: presets });
                await sendConnectionMessage('connection:mailmindr-options', {
                    topic: 'settings:updated',
                    message: { settings: getSettings() }
                });
            }

            return { status: 'ok', paylad: null };
        }
        case 'settings:set': {
            const { name, value } = payload;
            logger.info(`→ set '${name}' to '${value}'`, value);

            const { settings } = getSettings();
            const propNames = Object.keys(settings);
            if (propNames.indexOf(name) >= 0) {
                await dispatch('setting:update', { name, value });

                const payload = getSettings();

                await sendConnectionMessage('connection:mailmindr-options', {
                    topic: 'settings:updated',
                    message: { settings: payload }
                });
            } else {
                logger.error(
                    `Setting '${name}' not found. Is the default value missing?`
                );
            }
            break;
        }
        case 'settings:force-unlock': {
            await sendConnectionMessage('connection:mailmindr-options', {
                topic: 'settings:unlock',
                message: { settings: getSettings() }
            });
            break;
        }
        case 'do:mindr-action-edit': {
            const { guid } = payload;
            await editMindrByGuid(guid);
            break;
        }
        case 'do:mindr-action-remove': {
            const { guid } = payload;
            const { mindrs } = getState();
            const mindr = mindrs.find(mindr => mindr.guid === guid);
            if (!mindr) {
                return;
            }

            const { due } = mindr;
            const relative = due - Date.now();

            if (relative < 0) {
                // 
                await messageHandler({
                    action: 'mindr:dismiss',
                    payload: { list: [guid] }
                });
            } else {
                // 
                await messageHandler({
                    action: 'mindr:remove',
                    payload: { guid }
                });
            }

            break;
        }
        default:
            logger.error(
                'mailmindr:messageHandler // unhandled message received',
                request
            );
    }

    // 
    if (state.mindrs.length) {
        messenger.browserAction.enable();
    } else {
        messenger.browserAction.disable();
    }

    return result;
};

const onConnectionMessage = async message => {
    logger.log('received message via post: ', message);
    return await messageHandler(message);
};

const connectionHandler = async port => {
    const {
        sender: { id },
        name
    } = port;

    if (id !== 'mailmindr@arndissler.net') {
        logger.error(
            `mailmindr doesn't support cross webextension communication (yet).`
        );
        // 
        return;
    }

    if (name === 'connection:mindr-alert') {
        port.onMessage.addListener(onConnectionMessage);
        port.onDisconnect.addListener(
            async () => await dispatch('connection:close', { port })
        );
        await dispatch('connection:open', { port });

        // 
        const { overdue, active } = getState();
        await sendConnectionMessage(name, {
            overdue,
            active
        });
    } else if (name === 'connection:mailmindr-options') {
        port.onMessage.addListener(onConnectionMessage);
        port.onDisconnect.addListener(
            async () => await dispatch('connection:close', { port })
        );
        await dispatch('connection:open', { port });

        const payload = getSettings();

        await sendConnectionMessage(name, {
            topic: 'settings:updated',
            message: { settings: payload }
        });
    }
};

document.addEventListener('DOMContentLoaded', handleStartup);

browser.tabs.onActivated.addListener(async ({ tabId, windowId }) => {
    await refreshButtons();
});

browser.mailTabs.onSelectedMessagesChanged.addListener(
    handleSelectedMessagesChanged
);

browser.messageDisplayAction.onClicked.addListener(async ({ id, windowId }) => {
    const mindr = await findExistingMindrForTab({ id, windowId });
    const currentMessage = await getCurrentDisplayedMessage({ id, windowId });

    await showCreateOrUpdateMindrDialog(currentMessage, mindr);
});

browser.menus.onShown.addListener(info => {
    let oneMessage =
        info.selectedMessages && info.selectedMessages.messages.length == 1;
    browser.menus.update('mailmindr-menu', { visible: oneMessage });
    browser.menus.refresh();
});

messenger.windows.onRemoved.addListener(onWindowRemoved);

browser.runtime.onMessage.addListener(
    // 
    messageHandler
);

browser.runtime.onConnect.addListener(connectionHandler);

browser.commands.onCommand.addListener(async command => {
    switch (command) {
        case 'mailmindr_set_follow_up':
            const current = await messenger.tabs.query({
                currentWindow: true,
                active: true
            });
            if (current && Array.isArray(current) && current.length > 0) {
                const { id, windowId } = current[0];
                const mindr = await findExistingMindrForTab({ id, windowId });
                const currentMessage = await getCurrentDisplayedMessage({
                    id,
                    windowId
                });

                if (currentMessage) {
                    await showCreateOrUpdateMindrDialog(currentMessage, mindr);
                }
            }

            break;
        case 'mailmindr_open_list':
            await messenger.browserAction.openPopup();
            break;
    }
});
