/* exported PlikConnection */

/**
 * Keep track of current attachments to abort uploads and delete unused files
 */
var currentAttachments = {};

class PlikConnection {
    /**
     *  * @param {string} accountId The id as Thunderbird uses it
     *  * @param {string} [plikUrl] The url of the Plik instance
     */
    constructor(accountId, plikUrl = "https://plik.root.gg/") {
        this.accountId = accountId;
        this.serverUrl = plikUrl;
    }

    /**
     * Store the current values of all properties in the local browser storage
     */
    async store() {
        browser.storage.local.set({ [this.accountId]: this, });
        return this;
    }

    /**
    * Load account state from configuration storage
    */
    async load() {
        const id = this.accountId;
        const accountInfo = await browser.storage.local.get(id);
        for (const key in accountInfo[id]) {
            this[key] = accountInfo[id][key];
        }
        return this;
    }

    /**
     * Set the account's configured state
     */
    async updateConfigured() {
        messenger.cloudFile.updateAccount(this.accountId, {
            configured: true,
        });
        return this;
    }

    /**
     * Get the configuration from the server and store it in the current object
     */
    async getServerConfiguration() {
        const conf = await this._parseJsonResponse(await this._talkToPlik(this.serverUrl + 'config'));

        if (conf.maxFileSize) {
            messenger.cloudFile.updateAccount(this.accountId, { uploadSizeLimit: conf.maxFileSize, });
        }

        ['maxTTL', 'oneShot', 'protectedByPassword', 'removable',].forEach(
            p => this[`server_${p}`] = conf[p] ? conf[p] : false
        );
        if (!this.Ttl_days || this.Ttl_days > this.server_maxTTL / (24 * 60 * 60)) {
            this.Ttl_days = this.server_maxTTL / (24 * 60 * 60);
        }
        return this;
    }

    /* cloudFile event handlers */
    async uploadFile(fileInfo) {
        const uploadInfo = await this._createUpload();

        let uploadedFileInfo;
        // Make sure we ca abort the upload
        currentAttachments[fileInfo.id] = { abortController: new AbortController(), };
        try {
            uploadedFileInfo = await this._uploadData(uploadInfo, fileInfo);
        } catch (error) {
            if ("AbortError" === error.name) {
                return { aborted: true, };
            } else {
                throw error;
            }
        } finally {
            delete currentAttachments[fileInfo.id].abortController;
        }

        const encodedFileName = uploadedFileInfo.fileName.split("/").map(c => encodeURIComponent(c)).join("/");

        let url = this.serverUrl + ['file', uploadInfo.id, uploadedFileInfo.id, encodedFileName,].join('/');

        currentAttachments[fileInfo.id].url = url;
        currentAttachments[fileInfo.id]["X-UploadToken"] = uploadInfo.uploadToken;

        if (uploadInfo.downloadDomain) {
            if (!uploadInfo.downloadDomain.endsWith('/')) {
                uploadInfo.downloadDomain += '/';
            }
            url = url.replace(this.serverUrl, uploadInfo.downloadDomain);
        }

        return { url, };
    }

    async deleteFile(fileId) {
        if (this.server_removable) {
            const fetchInfo = {
                method: "DELETE",
                headers: { "X-UploadToken": currentAttachments[fileId]["X-UploadToken"], },
            };

            this._talkToPlik(currentAttachments[fileId].url, fetchInfo);
        }
        delete currentAttachments[fileId];
    }

    static abortUpload(accountId, fileId) {
        if (currentAttachments[fileId] && currentAttachments[fileId].abortController) {
            currentAttachments[fileId].abortController.abort();
        }
    }

    static deleteAccount(accountId) {
        browser.storage.local.remove(accountId);
    }

    /* Internal Helpers */
    async _createUpload() {
        const body = {
            removable: this.server_removable,
            oneshot: Boolean(this.oneShot),
            Ttl: this.Ttl_days ? this.Ttl_days * 24 * 60 * 60 : 0,
        };
        if (this.protectedDownloads) {
            body.login = this.DLUser;
            body.password = this.DLPass;
        }

        const fetchInfo = {
            method: "POST",
            headers: this.ULToken ? { "X-PlikToken": this.ULToken, } : {},
            body: JSON.stringify(body),
        };

        const url = this.serverUrl + 'upload';

        return this._parseJsonResponse(await this._talkToPlik(url, fetchInfo));
    }

    async _uploadData(uploadInfo, fileInfo) {
        const headers = { "X-UploadToken": uploadInfo.uploadToken, };
        const body = new FormData();
        body.append("file", fileInfo.data);

        const fetchInfo = {
            method: "POST",
            body,
            headers,
        };

        if (currentAttachments[fileInfo.id] && currentAttachments[fileInfo.id].abortController) {
            fetchInfo.signal = currentAttachments[fileInfo.id].abortController.signal;
        }

        const url = `${this.serverUrl}file/${uploadInfo.id}`;

        return this._parseJsonResponse(await this._talkToPlik(url, fetchInfo));
    }

    async _talkToPlik(url, fetchInfo) {
        let response;
        try {
            response = await fetch(url, fetchInfo);
        } catch (error) {
            if ("AbortError" !== error.name) {
                this._errorNotification("error_network");
            }
            throw error;
        }

        if (!response.ok || response.status !== 200) {
            this._errorNotification("error_communication");
            throw new TypeError(`${response.status} - ${response.statusText}`);
        }
        return response;
    }

    _parseJsonResponse(response) {
        try {
            return response.json();
        } catch (error) {
            this._errorNotification("error_json");
            throw error;
        }
    }

    _errorNotification(errorID) {
        browser.notifications.create(null, {
            type: "basic",
            title: browser.i18n.getMessage("extensionName"),
            message: browser.i18n.getMessage(errorID),
        });
    }
}
