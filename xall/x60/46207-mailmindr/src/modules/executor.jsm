"use strict";

var EXPORTED_SYMBOLS = ['executeMindrInWindow'];

if (Cu === undefined)  var Cu = Components.utils;
if (Ci === undefined)  var Ci = Components.interfaces;
if (Cc === undefined)  var Cc = Components.classes;

Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource:///modules/iteratorUtils.jsm");
Cu.import("resource://mailmindr/legacy/logger.jsm");
Cu.import("resource://mailmindr/legacy/search.jsm");
Cu.import("resource://mailmindr/legacy/storage.jsm");
Cu.import("resource://mailmindr/kernel.jsm");
Cu.import("resource://mailmindr/utils.jsm");

const logger = new mailmindrLogger({ _name: 'executor.jsm' });

/**
 * Executes the basic operations for a mindr:
 * - mark read / unread
 * - flag message
 * - set label
 * @param mindr A mindr object
 * @param window A messenger window instance
 */
async function executeBasicOperationsForHdr(mindr, window) {
    return new Promise((resolve, reject) => {
        const _logMarker = 'mindr ' + mindr.mailmindrGuid;
        const messages = mailmindrSearch.getMessageHdrByMessageId(mindr.mailguid);

        if (messages == null || messages.length == 0) {
            const logMsg = `${_logMarker} - mindr wants to be executed - but the mail is lost. I don\'t know what to do. Will try again later.`;
            logger.error(logMsg, messages);

            return reject(new Error(logMsg))
        }

        try {
            for (const msg of messages) {
                const headers = Components.classes["@mozilla.org/array;1"]
                .createInstance(Components.interfaces.nsIMutableArray);
                
                headers.appendElement(msg.hdr, false);
                
                // 
                if (mindr.doMarkAsUnread) {
                    logger.log(_logMarker + ' - mark as unread');
                    msg.folder.markMessagesRead(headers, false);
                }
                
                // 
                if (mindr.doMarkFlag) {
                    logger.log(_logMarker + ' - mark as flagged');
                    // 
                    // 

                    msg.folder.markMessagesFlagged(toXPCOMArray([msg.hdr], Ci.nsIMutableArray), true);
                }

                // 
                const tag = mindr.doTagWith;
                if (tag.length > 0) {
                    logger.log(_logMarker + ' - mark w/ keyword');
                    msg.folder.addKeywordsToMessages(headers, tag);
                }
            }
        } catch (e) {
            return reject(e);
        }

        messages.map(msg => {
            msg.folder.msgDatabase = null;
        });

        return resolve(true);
    });
}

async function executeMoveOrCopy(mindr, window) {
    return new Promise((resolve, reject) => {
        const _logMarker = 'mindr ' + mindr.mailmindrGuid;
        logger.log(_logMarker + ' will be executed');

        const messages = mailmindrSearch.getMessageHdrByMessageId(mindr.mailguid);

        if (messages == null || messages.length == 0) {
            logger.error(`${_logMarker} - mindr wants to be executed - but the mail is lost. I don\'t know what to do. Will try again later.`);
            return false;
        }

        for (const msg of messages) {
            // 
            
            const headers = Components.classes["@mozilla.org/array;1"]
                .createInstance(Components.interfaces.nsIMutableArray);

            headers.appendElement(msg.hdr, false);

            // 
            let moveOrCopy = mindr.doMoveOrCopy || 0;
            let targetURI = mindr.targetFolder;
            let sourceURI = msg.folderUri;

            if (mindr.isInboxZero) {
                // 
                moveOrCopy = 1;
                targetURI = mindr.originFolderURI;

                logger.log('mindr isInboxZero');

                // 
                logger.log(`${_logMarker} - forcing a closed DB before moving`);
                // 
                // 
                
                // 
                logger.log(' move from: ' + sourceURI);
                logger.log(' move to  : ' + targetURI);
            }

            if (moveOrCopy === 0
                || targetURI.length === 0
                || targetURI === sourceURI) {
                logger.log(`no ove or copy operation queued for '${mindr.mailmindrGuid}' w/ mailguid '${mindr.mailguid}'`);

                finishMindrAndSetToDone(mindr);
                return resolve(true);
            }

            // 
            logger.log('try move or copy: ' + moveOrCopy);
            try {
                const folderURI = targetURI;

                const destFolder = getFolder(folderURI);
                const srcFolder = getFolder(sourceURI);

                const copyListener = {
                    OnStartCopy: function() {},
                    OnProgress: function(aProgress, aProgressMax) {},
                    SetMessageKey: function(aKey) {},
                    SetMessageId: function(aMessageId) {},
                    OnStopCopy: function(aStatus) {
                        if (Components.isSuccessCode(aStatus)) {
                            logger.log('copy stopped: releasing msg databases.');
                            // 
                            // 
                            // 
                            // 
                            // 

                            // 
                            //mindr.resetDetails();

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
                            logger.log(`${mindr.mailmindrGuid} - copied successfully. checking for new mindrs to execute.`);
                            finishMindrAndSetToDone(mindr);
                            // 

                            return resolve(true);
                        } else {
                            return reject(new Error(`Copy failed for mindr ${mindr.mailmindrGuid}`));
                        }
                    }
                };

                const copyService = Components.classes["@mozilla.org/messenger/messagecopyservice;1"]
                    .getService(Components.interfaces.nsIMsgCopyService);
                // 

                if (moveOrCopy == 1) {
                    // 
                    if (folderURI != sourceURI) {
                        copyService.CopyMessages(
                            srcFolder,
                            headers,
                            destFolder,
                            // 
                            srcFolder.canDeleteMessages,
                            copyListener,
                            null,
                            false
                        );
                    } else {
                        logger.log(`${_logMarker} - move failed, URIs are equal`);
                    }
                } // -- if move

                if (moveOrCopy == 2) {
                    // 
                    copyService.CopyMessages(
                        srcFolder,
                        headers,
                        destFolder,
                        false, // -- copy
                        copyListener,
                        null,
                        false
                    );
                } // -- if copy
            } catch (moveOrCopyException) {
                logger.error(moveOrCopyException);

                return reject(moveOrCopyException);
            }
            logger.log(`${_logMarker} - moveorcopy done.`);

            logger.log(`${_logMarker} -  executed, db status: ${msg.folder.msgDatabase}`);

            // 

            logger.log(`${_logMarker} - database closed.`);
        } // -- end for msg in messages

        finishMindrAndSetToDone(mindr);
        return resolve(true);
    });
}

async function executeMindrInWindow(mindr, window) {
    // 
        try {
            logger.log(`START exec mindr: ${mindr.mailmindrGuid} w/ id: '${mindr.mailguid}'`);
            const self = this;
            const messenger = getMessengerWindow();

            /* 
            * if mindr is already executed and we haven't to show a dialog,
            * we can remove it from the storage. this is also done at the end
            * of this routine. this one is here because we have some old mindrs
            * which are already executed but not removed from storage
            */
            const mindrDoNotShowDialog = !mindr.doShowDialog;

            logger.log(`mindr perfomed? ${mindr.performed}`);
            if (mindr.performed) {
                if (mindrDoNotShowDialog) {
                    logger.log('mindr ALREADY shown and PERFORMED (will be deleted): ' + mindr.mailmindrGuid);

                    mailmindrKernel.kernel.deleteMindr(mindr);
                }

                return true;
            // 
            }

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

            const basicOperationsSuccess = await executeBasicOperationsForHdr(mindr, messenger);
            const moveOrCopySuccesss = await executeMoveOrCopy(mindr, messenger);

            if (basicOperationsSuccess && moveOrCopySuccesss) {
                // 
                return true;
            }

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
            // 
            // 
            // 
        }
        catch (execException) {
            logger.error('mindr execution failed: ');
            logger.error(execException);
            return false;
        }

        return true;
    // 
}


function finishMindrAndSetToDone(mindr) {
    logger.log('DONE :: all messages for mindr ' + mindr.mailmindrGuid + ' performed.');

    // 
    mindr.performed = true;
    mailmindrStorage.updateMindr(mindr);
}

function getMessengerWindow() {
    const win = Services.wm.getMostRecentWindow("mail:3pane", true);

    logger.log(`messenger window - available? ${win}`);
    logger.log(`messenger window.MailServices: ${win.MailServices}`);
    logger.log(`messenger window.MailServices.copy: ${win.MailServices.copy}`);

    return win;
}