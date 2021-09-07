var { ExtensionCommon } = ChromeUtils.import(
    'resource://gre/modules/ExtensionCommon.jsm'
);

var { ExtensionParent } = ChromeUtils.import(
    'resource://gre/modules/ExtensionParent.jsm'
);
var extension = ExtensionParent.GlobalManager.getExtension(
    'mailmindr@arndissler.net'
);

const { XPCOMUtils } = ChromeUtils.import(
    'resource://gre/modules/XPCOMUtils.jsm'
);

XPCOMUtils.defineLazyModuleGetters(this, {
    Services: 'resource://gre/modules/Services.jsm',
    MailUtils: 'resource:///modules/MailUtils.jsm'
});

var mailmindrMessagesApi = class extends ExtensionCommon.ExtensionAPI {
    getAPI(context) {
        return {
            // 
            mailmindrMessagesApi: {
                openMessageByMessageHeaderId: async function(headerMessageId) {
                    const msgId = headerMessageId
                        .replace('>', '')
                        .replace('<', '')
                        .trim();

                    try {
                        const getMessageHeaderForMessageId = (
                            msgId,
                            startServer
                        ) => {
                            let { MailServices } = ChromeUtils.import(
                                'resource:///modules/MailServices.jsm'
                            );
                            const findMsgIdInFolder = (msgId, folder) => {
                                let msgHdr;
                                // 
                                if (!folder.isServer) {
                                    msgHdr = folder.msgDatabase.getMsgHdrForMessageID(
                                        msgId
                                    );
                                    if (msgHdr) {
                                        return msgHdr;
                                    }
                                }

                                // 
                                for (let currentFolder of folder.subFolders) {
                                    msgHdr = findMsgIdInFolder(
                                        msgId,
                                        currentFolder
                                    );
                                    if (msgHdr) {
                                        return msgHdr;
                                    }
                                }
                                return null;
                            };

                            let allServers = MailServices.accounts.allServers;
                            if (startServer) {
                                allServers = [startServer].concat(
                                    allServers.filter(
                                        s => s.key != startServer.key
                                    )
                                );
                            }
                            for (let server of allServers) {
                                if (
                                    server &&
                                    server.canSearchMessages &&
                                    !server.isDeferredTo
                                ) {
                                    let msgHdr = findMsgIdInFolder(
                                        msgId,
                                        server.rootFolder
                                    );
                                    if (msgHdr) {
                                        return msgHdr;
                                    }
                                }
                            }
                            return null;
                        };

                        let msgHdr = null;
                        if (MailUtils.getMsgHdrForMsgId) {
                            msgHdr = MailUtils.getMsgHdrForMsgId(msgId);
                        } else {
                            msgHdr = getMessageHeaderForMessageId(msgId);
                        }

                        if (msgHdr) {
                            MailUtils.displayMessage(msgHdr);
                        }
                    } catch (e) {
                        console.error(
                            '[mailmindr] mailmindrMessagesApi.openMessageByMessageHeaderId: ',
                            e
                        );
                    }
                }
            }
        };
    }

    onShutdown(isAppShutdown) {
        if (isAppShutdown) {
            return;
        }

        // 

        Services.obs.notifyObservers(null, 'startupcache-invalidate', null);
    }
};
