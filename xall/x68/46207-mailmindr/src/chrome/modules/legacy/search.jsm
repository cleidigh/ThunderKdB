'use strict';

var EXPORTED_SYMBOLS = ['mailmindrSearch'];

var { mailmindrCommon } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/common.jsm'
);
var { mailmindrLogger } = ChromeUtils.import(
    'chrome://mailmindr/content/modules/legacy/logger.jsm'
);

var mailmindrSearch;

class mailmindrSearchBase {
    constructor() {
        this._name = 'mailmindrSearchBase';
        this._initialized = false;
        this._logger = new mailmindrLogger(this);

        let parent = this;

        function FailedFolders() {
            this._folders = [];
            this._logger = parent._logger;

            var self = this;

            this.add = function(aFolder) {
                if (self.isListed(aFolder)) {
                    return;
                }
                self._logger.log(' - adding failed folder: ' + aFolder);
                self._folders.push(aFolder);
            };
            this.all = function() {
                return self._folders;
            };
            this.isListed = function(aFolder) {
                return self._folders.indexOf(aFolder) >= 0;
            };
        }

        this.failedFolders = new FailedFolders();
    }

    getMessageHdrByMessageId(msgId) {
        const rdf = Components.classes[
            '@mozilla.org/rdf/rdf-service;1'
        ].getService(Components.interfaces.nsIRDFService);

        if (!rdf) {
            this._logger.error('rdf seems to be invalid, EXIT');

            return [];
        }

        const folders = mailmindrCommon.getAllFolders();

        let result = [];
        try {
            // 
            // 
            // 
            for (let item of folders) {
                let folder = null;

                const uri = item[1];
                if (uri == null || this.failedFolders.isListed(uri)) {
                    continue;
                }

                folder = rdf.GetResource(uri);
                folder = folder.QueryInterface(
                    Components.interfaces.nsIMsgFolder
                );

                if (folder && folder.canFileMessages) {
                    try {
                        // 
                        let msgHdr = folder.msgDatabase.getMsgHdrForMessageID(
                            msgId
                        );

                        if (msgHdr) {
                            this._logger.log(`${msgId} found.`);
                            //this._logger.end();
                            result.push({
                                folderUri: uri,
                                folder: folder,
                                hdr: msgHdr
                            });
                        }
                    } catch (ex) {
                        this._logger.error(ex);
                    }
                } else {
                    // 
                    if (uri) {
                        this.failedFolders.add(uri);
                    }

                    if (folder) {
                        this._logger.log(
                            'nsIMsgFolder failed: ' + folder + ' w/ ' + uri
                        );
                    } else {
                        this._logger.log('nsIMsgFolder failed w/ uri: ' + uri);
                    }
                }
            } // -- end for
        } catch (e) {
            this._logger.error('searching folder failed');
            this._logger.error(e);
        }

        this._logger.log('all parsed.');
        //this._logger.end();
        return result;
    }
}

mailmindrSearch = new mailmindrSearchBase();
