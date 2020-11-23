/* MIT License

Copyright (c) 2020 Johannes Endres

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE. */

/* global encodepath, attachmentStatus, promisedTimeout */
/* exported DavUploader */

/** AbortControllers for all active uploads */
const allAbortControllers = new Map();

/**
 * This class encapsulates communication with a WebDAV service
 */
class DavUploader {
    /**
     *
     * @param {string} server_url The URL of the server
     * @param {string} user The username
     * @param {string} password the password
     * @param {string} dav_url The url path to the webdav service
     * @param {string} folder The folder to store attachment
     */
    constructor(server_url, user, password, dav_url, folder) {
        this._serverurl = server_url;
        this._storageFolder = folder;
        this._davUrl = dav_url;

        this._davHeaders = {
            "Authorization": "Basic " + btoa(user + ':' + password),
            "User-Agent": "Filelink for *cloud",
            "Content-Type": "application/octet-stream",
        };
    }

    /**
     * Upload one file to the storage folder
     *
     * @param {number} fileId The id Thunderbird uses to reference the upload
     * @param {string} fileName w/o path
     * @param {File} fileObject the local file as a File object
     * @returns {Promise<Response>}
     */
    async uploadFile(fileId, fileName, fileObject) {
        const stat = await this._getRemoteFileInfo(fileName);

        if (!stat) {
            // There is no conflicting file in the cloud
            return this._doUpload(fileId, fileName, fileObject);
        } else {
            // There is a file of the same name
            // The mtime is in milliseconds, but on the cloud it's only accurate to seconds
            if (Math.abs(stat.mtime - fileObject.lastModified) < 1000 &&
                stat.size === fileObject.size) {
                // It's the same as the local file
                return { ok: true, };
            } else {
                // It's different, move it out of the way
                await this._moveFileToDir(fileId, fileName, "old_shares/" + (stat.mtime / 1000 | 0));
                return this._doUpload(fileId, fileName, fileObject);
            }
        }
    }

    //#region Helpers for uploadFile
    /**
     * Create a complete folder path, returns true if that path already exists
     *
     * @param {string} folder 
     * @returns {boolean} if creation succeeded
     */
    async _recursivelyCreateFolder(folder, retry_count = 0) {
        // Looks clumsy, but *always* make sure recursion ends
        if ("/" === folder) {
            return false;
        } else {
            let response;
            try {
                response = await this._doDavCall(folder, 'MKCOL');
            } catch (e) {
                return false;
            }
            switch (response.status) {
                case 405: // Already exists
                case 201: // Created successfully
                    return true;
                case 409: // Intermediate folder missing
                    // Try to create parent folder
                    if (await this._recursivelyCreateFolder(folder.split("/").slice(0, -1).join("/"))) {
                        // Try again to create the initial folder
                        return this._recursivelyCreateFolder(folder);
                    }
                    break;
                case 423: // Locked
                    // Maybe a parallel upload is currently creating the folder, so wait a little and try again
                    // This timout is longer in reality because it adds to the waiting time in the queue
                    if (retry_count < 3) {
                        await promisedTimeout(500);
                        return await this._recursivelyCreateFolder(folder, retry_count++);
                    }
                    break;
            }
        }
        return false;
    }

    /**
     * Fetches information about a remote file
     * @param {File} file The file to check on the cloud
     * @returns {Promise<?{mtime: Date, size: number}>} A promise resolving to an object containing mtime and
     * size or null if the file doesn't exit
     */
    async _getRemoteFileInfo(fileName) {
        const response = await this._doDavCall(this._storageFolder + '/' + fileName, "PROPFIND");
        // something with the right name exists ...
        if (response.ok && response.status < 300) {
            const xmlDoc = new DOMParser().parseFromString(await response.text(), 'application/xml');
            // ... and it's a file ...
            if (null === xmlDoc.getElementsByTagName("d:resourcetype")[0].firstChild) {
                return {
                    mtime: (new Date(xmlDoc.getElementsByTagName("d:getlastmodified")[0].textContent)).getTime(),
                    size: Number(xmlDoc.getElementsByTagName("d:getcontentlength")[0].textContent),
                };
            }
        }
        return null;
    }

    /**
     * Moves a file to a new destination folder
     * @param {*} fileId The id of the upload as given by TB
     * @param {string} fileName The file's path and name relative to the storage
     * folder
     * @param {string} newPath The new path and name
     * @returns {Promise<Response>} A promise that resolves to the Response object of the DAV request
     */
    async _moveFileToDir(fileId, fileName, newPath) {
        attachmentStatus.get(fileId).set_status('moving');
        const dest_header = {
            "Destination":
                this._davUrl + encodepath(this._storageFolder + "/" + newPath + "/" + fileName),
        };
        if (await this._recursivelyCreateFolder(this._storageFolder + "/" + newPath)) {
            const retval = await this._doDavCall(this._storageFolder + "/" + fileName, "MOVE", null, dest_header);
            if (retval.ok && (retval.status === 201 || retval.status === 204)) {
                return retval;
            }
        }
        attachmentStatus.get(fileId).fail();
        throw new Error("Couldn't move file.");
    }

    /**
     * Set the mtime, so later checks for identity with local file succeed
     * @param {string} fileName The name of the file to change
     * @param {number} newMtime The mtime to set ont the file as a unix
     * timestamp (seconds)
     */
    _setMtime(fileName, newMtime) {
        const body =
            `<d:propertyupdate xmlns:d="DAV:">
                <d:set>
                    <d:prop>
                        <d:lastmodified>${newMtime}</d:lastmodified>
                    </d:prop>
                </d:set>
            </d:propertyupdate>`;

        this._doDavCall(this._storageFolder + '/' + fileName, "PROPPATCH", body);
    }

    /**
     * @returns {number} Free space in bytes or -1 if no info available
     */
    async _getFreeSpace() {
        const response = await this._doDavCall(this._storageFolder + "/.", "PROPFIND");
        let free = -1;
        if (response.ok && response.status < 300) {
            const xmlDoc = new DOMParser().parseFromString(await response.text(), 'application/xml');
            free = parseInt(xmlDoc.getElementsByTagName("d:quota-available-bytes")[0].textContent);
        }
        return isNaN(free) ? -1 : free;
    }

    /**
     *
     * @param {number} fileId Thunderbird's internal file if
     * @param {string} fileName The name in the cloud
     * @param {File} fileObject The File object to upload
     * @returns {Promise<Response>} A Promise that resolves to the http response
     */
    async _doUpload(fileId, fileName, fileObject) {
        // Check it there is enough free space
        attachmentStatus.get(fileId).set_status('checkingspace');
        const free = await this._getFreeSpace();
        if (free >= 0 && free < fileObject.size) {
            attachmentStatus.get(fileId).fail();
            return { ok: false, };
        }

        // Make sure storageFolder exists. Creation implicitly checks for
        // existence of folder, so the extra webservice call for checking first
        // isn't necessary.
        if (!(await this._recursivelyCreateFolder(this._storageFolder))) {
            attachmentStatus.get(fileId).set_status('creating');
            attachmentStatus.get(fileId).fail();
            throw new Error("Upload failed: Can't create folder");
        }

        let response;
        try {
            response = await this._xhrUpload(fileId, this._storageFolder + '/' + fileName, fileObject);
            this._setMtime(fileName, fileObject.lastModified / 1000 | 0);
            // Handle errors that don't throw an exception
            if (response.status < 300) {
                response.ok = true;
            }
        } catch (error) {
            if (error.type === 'abort') {
                response = { aborted: true, url: "", };
            }
            else {
                attachmentStatus.get(fileId).fail();
                response.ok = false;
            }
        }
        allAbortControllers.delete(fileId);
        return response;
    }    //#endregion

    /**
     * Calls one function of the WebDAV service
     *
     * @param {string} path the full file path of the object
     * @param {string} method the HTTP METHOD to use, default GET
     * @param {Array} [body] Body of the request, eg. file contents
     * @param {*} [additional_headers] Additional headers to include in the request
     * @returns {Promise<Response>}  A Promise that resolves to the Response object
     */
    _doDavCall(path, method, body, additional_headers) {
        let url = this._serverurl;
        url += this._davUrl;
        url += encodepath(path);

        let fetchInfo = {
            method,
            headers: additional_headers ? { ...this._davHeaders, ...additional_headers, } : this._davHeaders,
            credentials: "omit",
        };

        if (body) {
            fetchInfo.body = body;
        }

        return fetch(url, fetchInfo);
    }

    /**
     * 
     * @param {*} fileId The id of this upload as supplied by Thunderbird
     * @param {string} path The path the file will be uploaded to
     * @param {Blob} data The file content (as a File object)
     * @returns {Promise} A promise that resolves to the XHR or rejects with the entire event
     */
    async _xhrUpload(fileId, path, data) {
        let url = this._serverurl;
        url += this._davUrl;
        url += encodepath(path);

        // Remove session password as it interferes with credentials 
        await browser.cookies.remove({ url, name: "oc_sessionPassphrase", firstPartyDomain: "", });

        return new Promise((resolve, reject) => {
            const uploadRequest = new XMLHttpRequest();

            uploadRequest.addEventListener("load", e => {
                if (e.target.status < 300) {
                    resolve(e.target);
                } else {
                    reject(e);
                }
            });

            uploadRequest.addEventListener("error", reject);
            uploadRequest.addEventListener("abort", reject);
            uploadRequest.addEventListener("timeout", reject);

            uploadRequest.addEventListener("loadstart", () => attachmentStatus.get(fileId).set_status('uploading'));
            uploadRequest.upload.addEventListener("progress", e => {
                attachmentStatus.get(fileId).set_progress(e.total ? e.loaded * 1.0 / e.total : 0);
            });

            uploadRequest.open("PUT", url);
            for (const key in this._davHeaders) {
                uploadRequest.setRequestHeader(key, this._davHeaders[key]);
            }

            allAbortControllers.set(fileId, uploadRequest);
            uploadRequest.send(data);
        });
    }
}