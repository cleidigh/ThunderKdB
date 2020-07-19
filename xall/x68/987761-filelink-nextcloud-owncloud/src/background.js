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

browser.storage.local.get().then(
    allAccounts => {
        for (const accountId in allAccounts) { updateAccount(accountId); }
    });

messenger.cloudFile.onFileUpload.addListener(async (account, { id, name, data }) => {
    const ncc = new CloudConnection(account.id);
    await ncc.load();
    return ncc.uploadFile(id, name, data);
});

messenger.cloudFile.onFileUploadAbort.addListener(
    (account, fileId) => {
        /* global allAbortControllers */
        // defined in davuploader.js
        const abortController = allAbortControllers.get(fileId);
        if (abortController) {
            abortController.abort();
        }
        Status.remove(fileId);
    });

/** Don't delete any files because we want to reuse uploads.  */
messenger.cloudFile.onFileDeleted.addListener(
    (account, fileId) => {
        Status.remove(fileId);
    });

/** Nothing to be done, so don't add a listener */
// messenger.cloudFile.onAccountAdded.addListener(async account => { */

messenger.cloudFile.onAccountDeleted.addListener(accountId => {
    const ncc = new CloudConnection(accountId);
    ncc.deleteAccount();
});

async function updateAccount(accountId) {
    const ncc = new CloudConnection(accountId);
    await ncc.load();
    await upgradeOldConfigurations();

    // Check if login works
    const answer = await ncc.updateUserId();
    ncc.laststatus = null;
    if (answer._failed) {
        ncc.laststatus = answer.status;
    } else {
        await Promise.all([ncc.updateFreeSpaceInfo(), ncc.updateCapabilities(),]);
        await ncc.updateConfigured();
    }
    ncc.store();

    function upgradeOldConfigurations() {
        if (ncc.serverUrl && !ncc.serverUrl.endsWith('/')) {
            ncc.serverUrl += '/';
        }

        if (!ncc.user_id) {
            ncc.updateUserId();
        }
    }
}

/* Make jshint happy */
/* global CloudConnection, Status */
