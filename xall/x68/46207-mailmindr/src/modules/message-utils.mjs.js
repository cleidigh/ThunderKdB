import {
    buildQueryInfoForMessageAndFolder,
    getMailAddress
} from './core-utils.mjs.js';
import { createLogger, createCorrelationId } from './logger.mjs.js';

const logger = createLogger('modules.message-utils');

const findMessage = async (
    messages,
    { author, headerMessageId },
    parentCorrelationId
) => {
    const correlationId = createCorrelationId(
        'findMessage',
        parentCorrelationId
    );
    const authorMailAddress = getMailAddress(author);
    logger.log(`BEGIN findMessage in ${messages.length} messages`, {
        correlationId,
        messages,
        author,
        authorMailAddress,
        headerMessageId
    });
    const maybeMatching = messages.filter(
        msg => getMailAddress(msg.author) === authorMailAddress
    );

    if (maybeMatching.length === 0) {
        logger.info(`no messages matching in this chunk`);
        return null;
    }

    logger.log(`matching messages: ${maybeMatching.length}`, {
        correlationId,
        maybeMatching
    });

    do {
        const message = maybeMatching.pop();
        const { id, headerMessageId: msgHdrId } = message;
        try {
            if (msgHdrId) {
                if (msgHdrId === headerMessageId) {
                    logger.log(
                        `SUCCESS headerMessageId found: '<${headerMessageId}>' === '${msgHdrId}'`
                    );
                    return message;
                } else {
                    // 
                    // 
                    // 
                }
            }

            const msgWithHeader = await browser.messages.getFull(id);
            const msgHdrId0 = msgWithHeader.headers['message-id'][0];

            if (msgHdrId0 === headerMessageId) {
                logger.log(
                    `SUCCESS headerMessageId found: '${headerMessageId}' === '${msgHdrId0}'`
                );
                return message;
            } else {
                // 
                // 
                // 
            }
        } catch (ex) {
            logger.warn(`could not retrieve full message`, {
                correlationId,
                messageId: id,
                error: ex,
                errorMessage: ex.message
            });
        }
    } while (maybeMatching.length > 0);
    logger.log(`END findMessage in ${messages.length} messages`, {
        correlationId,
        messages,
        author,
        authorMailAddress,
        headerMessageId
    });

    return null;
};

export async function* applyActionToMessageInFolder(
    folder,
    msg,
    action,
    returnOnFirstMessage
) {
    const correlationId = createCorrelationId('applyActionToMessagesInFolder');
    const { headerMessageId, author } = msg;
    const queryInfo = buildQueryInfoForMessageAndFolder(
        { headerMessageId, author },
        folder
    );
    const { path } = folder;

    logger.info(`BEGIN messages.query on folder '${path}'`, {
        correlationId,
        queryInfo
    });

    let queryResult = await messenger.messages.query(queryInfo);

    logger.log(`messages query done, result is`, {
        correlationId,
        queryResult
    });
    logger.info(`END messages.query on folder '${path}'`, {
        correlationId,
        queryInfo
    });

    if (
        queryResult.id === null &&
        Array.isArray(queryResult.messages) &&
        queryResult.messages.length === 0
    ) {
        logger.warn(
            `query result is { id:  null, messages: [] }, fallback to list on folder '${path}'`,
            { correlationId, queryResult }
        );

        queryResult = await messenger.messages.list(folder);
    }

    let continueIteration = true;
    let pageCount = 0;
    do {
        const message = await findMessage(
            queryResult.messages,
            msg,
            correlationId
        );
        if (message) {
            if (returnOnFirstMessage) {
                await action(message, folder);
                return Promise.resolve({ message, folder, executed: true });
            }

            await action(message, folder);
            yield Promise.resolve({ message, folder, executed: true });
        }

        if (queryResult.id !== null) {
            logger.log(`query next page ${pageCount}`, { correlationId });
            queryResult = await messenger.messages.continueList(queryResult.id);
            pageCount++;
        } else {
            continueIteration = false;
        }
    } while (continueIteration); // queryResult.id !== null); // && continueIteration);

    return Promise.resolve(null);
}
