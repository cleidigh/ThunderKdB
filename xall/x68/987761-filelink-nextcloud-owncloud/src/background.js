messenger.cloudFile.getAllAccounts()
    .then(
        allAccounts => {
            allAccounts.forEach(account => updateAccount(account.id));
        });

// If the current TB version does not support button labels, it uses the title instead
if (!messenger.composeAction.setLabel) {
    const manifest = browser.runtime.getManifest();
    if (manifest.compose_action && manifest.compose_action.default_label) {
        messenger.composeAction.setTitle({
            title: manifest.compose_action.default_label.replace(
                /^__MSG_([@\w]+)__$/, (matched, key) => {
                    return browser.i18n.getMessage(key) || matched;
                }),
        });
    }
}

messenger.cloudFile.onFileUpload.addListener(async (account, { id, name, data }) => {
    const ncc = new CloudConnection(account.id);
    await ncc.load();
    return ncc.uploadFile(makeUploadId(account, id), name, data);
});

messenger.cloudFile.onFileUploadAbort.addListener(
    (account, fileId) => {
        /* global allAbortControllers */
        // defined in davuploader.js
        const abortController = allAbortControllers.get(makeUploadId(account, fileId));
        if (abortController) {
            abortController.abort();
        }
        Status.remove(makeUploadId(account, fileId));
    });

/** Don't delete any files because we want to reuse uploads.  */
messenger.cloudFile.onFileDeleted.addListener(
    (account, fileId) => {
        Status.remove(makeUploadId(account, fileId));
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
    }
}

/**
 * The fileId is only unique within one account. makeUploadId creates a string
 * that identifies the upload even if more than one account is active.
 * @param {CloudFileAccount} account The CloudFileAccount as supplied by Thunderbird
 * @param {number} fileId The fileId supplied by Thunderbird
 */
function makeUploadId(account, fileId) {
    return `${account.id}_${fileId}`;
}

/* Make jshint happy */
/* global CloudConnection, Status */
