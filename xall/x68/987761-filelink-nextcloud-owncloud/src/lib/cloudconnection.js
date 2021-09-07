//#region  Configurable options and useful constants
const apiUrlBase = "ocs/v1.php";
const apiUrlUserInfo = "/cloud/users/";
const apiUrlUserID = "/cloud/user";
const apiUrlShares = "/apps/files_sharing/api/v1/shares";
const apiUrlGetApppassword = "/core/getapppassword";
const apiUrlCapabilities = "/cloud/capabilities";
const davUrlBase = "remote.php/dav/files/";
const ncMinimalVersion = 20;
const ocMinimalVersion = 10 * 10000 + 0 * 100 + 10;
const DAV_MAX_FILE_SIZE = 0x100000000 - 1; /* Almost 4GB */
//#endregion

/**
 * This class encapsulates all calls to the Nextcloud or ownCloud web services
 * (API and DAV)
 */
class CloudConnection {
    //#region Constructors, load & store
    /**
     * @param {*} accountId Whatever Thunderbird uses as an account identifier
     */
    constructor(accountId) {
        this._accountId = accountId;
        this._apiHeaders = {
            "OCS-APIREQUEST": "true",
            "User-Agent": "Filelink for *cloud",
        };
        this.laststatus = null;
    }

    /**
     * Store the current values of all properties in the local browser storage
     */
    async store() {
        browser.storage.local.set({ [this._accountId]: this, });
    }

    /**
    * Load account state from configuration storage
    */
    async load() {
        const id = this._accountId;
        const accountInfo = await browser.storage.local.get(id);
        for (const key in accountInfo[id]) {
            this[key] = accountInfo[id][key];
        }
        return this;
    }
    //#endregion

    //#region Event Handlers
    /**
     * Upload a single file
     *
     * @param {string} uploadId The id of the upload created in background.js
     * @param {string} fileName w/o path
     * @param {File} fileObject the local file as a File object
     */
    async uploadFile(uploadId, fileName, fileObject) {
        const upload_status = new Status(fileName);
        attachmentStatus.set(uploadId, upload_status);

        upload_status.set_status('preparing');

        const uploader = new DavUploader(
            this.serverUrl, this.username, this.password, davUrlBase + this.userId, this.storageFolder);

        const response = await uploader.uploadFile(uploadId, fileName, fileObject);

        if (response.aborted) {
            return response;
        } else if (response.ok) {
            upload_status.set_status('sharing');
            this.updateFreeSpaceInfo();
            let url = this._cleanUrl(await this._getShareLink(fileName, uploadId));
            if (url) {
                if (upload_status.status !== 'generatedpassword') {
                    Status.remove(uploadId);
                }
                return { url, aborted: false, };
            }
        }

        upload_status.fail();
        throw new Error("Upload failed.");
    }

    /**
     * Clean up if an account is deleted
     */
    async deleteAccount() {
        browser.storage.local.remove(this._accountId);
    }
    //#endregion

    //#region Public Methods
    /**
     * Gets free/used space from web service and sets the parameters in
     * Thunderbirds cloudFileAccount
     * @returns {*} A data object that may contain error information (see _doApiCall)
     */
    async updateFreeSpaceInfo() {
        let spaceRemaining = -1;
        let spaceUsed = -1;

        const data = await this._doApiCall(apiUrlUserInfo + this.userId);
        if (data && data.quota) {
            if ("free" in data.quota) {
                const free = parseInt(data.quota.free);
                spaceRemaining = free >= 0 && free <= Number.MAX_SAFE_INTEGER ? free : -1;
            }
            if ("used" in data.quota) {
                const used = parseInt(data.quota.used);
                spaceUsed = used >= 0 && used <= Number.MAX_SAFE_INTEGER ? used : -1;
            }
        }
        const uploadSizeLimit = spaceRemaining >= 0 ? Math.min(spaceRemaining, DAV_MAX_FILE_SIZE) : DAV_MAX_FILE_SIZE;

        await messenger.cloudFile.updateAccount(this._accountId, { spaceRemaining, spaceUsed, uploadSizeLimit, });

        return data;
    }

    /**
     * Delete all the properties that are read from the server's capabilities to clean out old values
     */
    forgetCapabilities() {
        ['_password_validate_url', '_password_generate_url', 'api_enabled',
            'public_shares_enabled', 'enforce_password', 'expiry_max_days',
            'cloud_versionstring', 'cloud_productname', 'cloud_type', 'cloud_supported',]
            .forEach(p => delete this[p]);
    }

    /**
     * Get useful information from the server and store it as properties
     */
    async updateCapabilities() {
        const data = await this._doApiCall(apiUrlCapabilities);
        if (!data._failed && data.capabilities) {
            // Don't test data.capabilities.files_sharing.api_enabled because the next line contains it all
            // Is public sharing enabled?
            this.public_shares_enabled = !!data.capabilities.files_sharing &&
                !!data.capabilities.files_sharing.public && !!data.capabilities.files_sharing.public.enabled;
            if (this.public_shares_enabled) {
                // Remember if a download password is required
                if (data.capabilities.files_sharing.public.password) {
                    if (data.capabilities.files_sharing.public.password.enforced_for &&
                        'boolean' === typeof data.capabilities.files_sharing.public.password.enforced_for.read_only) {
                        // ownCloud
                        this.enforce_password = !!data.capabilities.files_sharing.public.password.enforced_for.read_only;
                    } else {
                        //Nextcloud                        
                        this.enforce_password = !!data.capabilities.files_sharing.public.password.enforced;
                    }
                }
                // Remember maximum expiry set on server
                delete this.expiry_max_days;
                if (data.capabilities.files_sharing.public.expire_date &&
                    data.capabilities.files_sharing.public.expire_date.enforced &&
                    isFinite(data.capabilities.files_sharing.public.expire_date.days) &&
                    data.capabilities.files_sharing.public.expire_date.days > 0) {
                    this.expiry_max_days = parseInt(data.capabilities.files_sharing.public.expire_date.days);
                }
            }

            // Remember password policy urls if they are present (AFAIK only in NC 17+)
            if (data.capabilities.password_policy && data.capabilities.password_policy.api) {
                try {
                    const u = new URL(data.capabilities.password_policy.api.validate);
                    if (u.host === (new URL(this.serverUrl)).host) {
                        this._password_validate_url = u.origin + u.pathname;
                    }
                } catch (error) { /* Error just means there is no url */ }
                try {
                    const u = new URL(data.capabilities.password_policy.api.generate);
                    if (u.host === (new URL(this.serverUrl)).host) {
                        this._password_generate_url = u.origin + u.pathname;
                    }
                } catch (error) { /* Error just means there is no url */ }
            }

            // Take version from capabilities
            this.cloud_versionstring = data.version.string;
            // Take name & type from capabilities
            if (data.capabilities.theming && data.capabilities.theming.name) {
                this.cloud_productname = data.capabilities.theming.name;
                this.cloud_type = "Nextcloud";
                this.cloud_supported = data.version.major >= ncMinimalVersion;
            } else if (data.capabilities.core.status && data.capabilities.core.status.productname) {
                this.cloud_productname = data.capabilities.core.status.productname;
                this.cloud_type = "ownCloud";
                this.cloud_supported = parseInt(data.version.major) * 10000 +
                    parseInt(data.version.minor) * 100 +
                    parseInt(data.version.micro) >= ocMinimalVersion;
            } else if (data.version.major >= ncMinimalVersion) {
                this.cloud_productname = 'Nextcloud';
                this.cloud_type = "Nextcloud";
                this.cloud_supported = true;
            } else {
                this.cloud_type = "Unsupported";
                this.cloud_supported = false;
            }
        }
        this.store();
        return data;
    }

    /**
     * Sets the "configured" property of Thunderbird's cloudFileAccount
     * to true if it is usable
     */
    async updateConfigured() {
        messenger.cloudFile.updateAccount(this._accountId, {
            configured:
                this.public_shares_enabled !== false &&
                Boolean(this.serverUrl) &&
                Boolean(this.username) &&
                Boolean(this.userId) &&
                Boolean(this.password) &&
                Boolean(this.storageFolder) &&
                !(this.enforce_password && !this.useDlPassword) &&
                (!this.useDlPassword || this.useGeneratedDlPassword || Boolean(this.downloadPassword)) &&
                !(this.useExpiry && !Boolean(this.expiryDays)) &&
                !(Boolean(this.expiry_max_days) && this.useExpiry && this.expiry_max_days < this.expiryDays),
        });
    }

    /**
     * Get the UserID from the cloud and store it in the objects's internals
     * @returns An object w/ the data from the response or error information
     */
    async updateUserId() {
        const data = await this._doApiCall(apiUrlUserID);
        // I don't have the faintest idea if we could/should check the userId against a RE
        if (data.id) {
            this.userId = data.id;
        }
        return data;
    }

    /**
     * Fetches a new app password from the Nextcloud/ownCloud web service and
     * replaces the current password with it
     */
    async convertToApppassword() {
        const data = await this._doApiCall(apiUrlGetApppassword);
        if (data && data.apppassword) {
            // Test if the apppassword really works with the given username
            const oldpassword = this.password;
            this.password = data.apppassword;
            const r = await this._doApiCall(apiUrlUserID);
            if (r._failed || r.status >= 900) {
                this.password = oldpassword;
            } else {
                return true;
            }
        }
        return false;
    }

    /**
     * Validate the download password using the validation web service url from capabilities.
     * If there is no such url, only check if the password is empty
     * @returns {*} An object containing either the validation status (and reason for failure) or error information if web service failed
     */
    async validateDLPassword() {
        if (this._password_validate_url) {
            const data = this._doApiCall(this._password_validate_url, 'POST',
                { "Content-Type": "application/x-www-form-urlencoded", },
                'password=' + encodeURIComponent(this.downloadPassword));
            data.passed = !!data.passed;
            return data;
        } else if (!this.downloadPassword) {
            return { passed: false, reason: 'Password must not be empty.', };
        } else {
            return {
                passed: true,
                _failed: true,
                status: 'not_nc',
                statusText: 'Cloud does not validate passwords, probably not a Nextcloud instance.',
            };
        }
    }
    /**
     * Generate a download password using the NC web service if its present or a local generator otherwise
     * @returns {string} A most probably valid password
     */
    async generateDLPassword() {
        let pw;
        if (this._password_generate_url) {
            const data = await this._doApiCall(this._password_generate_url);
            if (data.password) {
                // This needs no sanitization because it is only displayed, using textContet
                pw = data.password;
            }
        }
        /* If we generate a password locally, the generation via web service didn't work. In that case
        validation also doesn't work, so the locally generateed password cannot be validated. */
        return pw ? pw : generatePassword(16);
    }
    //#endregion

    //#region Internal helpers
    /**
     * Get a share link for the file, reusing an existing one with the same
     * parameters
     * @param {string} fileName The name of the file to share
     * @param {string} uploadId The id of the upload created in background.js
     * @returns {string} The share link as returned by the OCS API
     */
    async _getShareLink(fileName, uploadId) {
        const path_to_share = utils.encodepath(this.storageFolder + "/" + fileName);
        const expireDate = this.useExpiry ? daysFromTodayIso(this.expiryDays) : undefined;

        // It's not possible to retreive an display the password for an existing share
        if (!this.useDlPassword) {
            //  Check if the file is already shared ...
            const existingShare = await this._findExistingShare(path_to_share, expireDate);
            if (existingShare && existingShare.url) {
                return existingShare.url;
            }
        }
        return this._makeNewShare(path_to_share, expireDate, uploadId);

        /**
         * Adds the given number of days to the current date and returns an ISO sting of
         * that date
         * @param {number} days Number of days to add
         */
        function daysFromTodayIso(days) {
            const d = new Date();
            d.setDate(d.getDate() + parseInt(days));
            return d.toISOString().slice(0, 10);
        }
    }

    /**
     * Check if the file is already shared with the same parameters
     * @param {string} path_to_share The encoded path of the file
     * @param {string} expireDate The expiry date, encoded as ISO
     * @returns {*} The existing share or undefined
     */
    async _findExistingShare(path_to_share, expireDate) {
        const shareinfo = await this._doApiCall(apiUrlShares + "?path=" + path_to_share);

        // If we the ApiCall fails, the result is not an Array. So make sure, we can call find() before we do
        // Check for every existing share, if it meets our requirements:
        return !shareinfo.find ? undefined : shareinfo.find(share =>
            // It's a public share ...
            (share.share_type === 3) &&
            /* If a password is set, share_with is not empty in both cloud
            flavors. Since we have no chance to retreive the share password, we
            use this to ignore shares with passwords. But Nextcloud might "fix"
            this, so we also check for password to make sure we are still fine
            if that happens.*/
            // ... and it has no password ...
            !share.share_with && !share.password &&
            // ... and the same expiration date
            (
                (!this.useExpiry && share.expiration === null) ||
                (this.useExpiry && share.expiration !== null && share.expiration.startsWith(expireDate))
            ));
    }

    /**
     * Share the file
     * @param {string} path_to_share The encoded path of the file
     * @param {string} expireDate The expiry date, encoded as ISO
     * @param {string} uploadId The id of the upload created in background.js
     * @returns {string} The new share url or null
     */
    async _makeNewShare(path_to_share, expireDate, uploadId) {
        let shareFormData = "path=" + path_to_share;
        shareFormData += "&shareType=3"; // 3 = public share

        if (this.useDlPassword) {
            if (this.useGeneratedDlPassword) {
                this.downloadPassword = await this.generateDLPassword();
            }
            shareFormData += "&password=" + encodeURIComponent(this.downloadPassword);
        }

        if (this.useExpiry) {
            shareFormData += "&expireDate=" + expireDate;
        }

        const data = await this._doApiCall(apiUrlShares, 'POST', { "Content-Type": "application/x-www-form-urlencoded", }, shareFormData);

        if (data && data.url) {
            if (this.useDlPassword && this.useGeneratedDlPassword) {
                const status = attachmentStatus.get(uploadId);
                status.password = this.downloadPassword;
                status.set_status('generatedpassword');
            }
            return data.url;
        }
        return null;
    }

    /**
     * - Remove all unwanted parts like username, parameters, ...
     * - Convert punycode domain names to UTF-8
     * - URIencode special characters in path
     * @param {String} url An URL thant might contain illegal characters, Punycode and unwanted parameters
     * @returns {?String} The cleaned URL or null if url is not a valid http(s) URL
     */
    _cleanUrl(url) {
        let u;
        try {
            u = new URL(url);
        } catch (error) {
            return null;
        }
        if (!u.protocol.match(/^https?:$/)) {
            return null;
        }
        const encoderUrl = u.origin.replace(u.hostname, punycode.toUnicode(u.hostname)) +
            utils.encodepath(u.pathname);
        return encoderUrl + (encoderUrl.endsWith("/") ? "" : "/") + "download";
    }
    //#endregion

    //#region Wrapper for web service calls
    /**
     * Call a function of the Nextcloud/ownCloud web service API
     *
     * @param {string} suburl The function's URL relative to the API base URL or a full url
     * @param {string} [method='GET'] HTTP method of the function, default GET
     * @param {*} [additional_headers] Additional Headers this function needs
     * @param {string} [body] Request body if the function needs it
     * @returns {*} A Promise that resolves to the data element of the response
     */
    async _doApiCall(suburl, method = 'GET', additional_headers = undefined, body = undefined) {
        let url;
        if (suburl.startsWith(this.serverUrl)) {
            url = suburl;
        } else {
            url = this.serverUrl;
            url += apiUrlBase;
            url += suburl;
        }
        url += (suburl.includes('?') ? '&' : '?') + "format=json";

        let headers = this._apiHeaders;
        headers.Authorization = "Basic " + btoa(this.username + ':' + this.password);

        if (additional_headers) {
            headers = { ...headers, ...additional_headers, };
        }

        const fetchInfo = {
            method,
            headers,
            credentials: "omit",
        };
        if (undefined !== body) {
            fetchInfo.body = body;
        }

        try {
            const response = await fetch(url, fetchInfo);
            if (!response.ok) {
                return { _failed: true, status: response.status, statusText: response.statusText, };
            }
            const parsed = await response.json();
            if (!parsed || !parsed.ocs || !parsed.ocs.meta || !isFinite(parsed.ocs.meta.statuscode)) {
                return { _failed: true, status: 'invalid_json', statusText: "No valid data in json", };
            } else if (parsed.ocs.meta.statuscode >= 300) {
                return { _failed: true, status: parsed.ocs.meta.statuscode, statusText: parsed.ocs.meta.message, };
            } else {
                return parsed.ocs.data;
            }
        } catch (e) {
            return { _failed: true, status: e.name, statusText: e.message, };
        }
    }
    //#endregion
}

/* global utils*/
/* global DavUploader  */
/* global punycode */
/* global Status */
/* global attachmentStatus */
/* global generatePassword */
/* exported CloudConnection */
