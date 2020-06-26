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

/* global PlikConnection */

(() => {

    /* Whenever TB starts, all the providers are in state configured:false */
    browser.cloudFile.getAllAccounts()
        .then(allAccounts =>
            allAccounts.forEach(async function (account) {
                const pc = new PlikConnection(account.id);
                await pc.load();
                pc.getServerConfiguration()
                    .then(() => pc.store());
                pc.updateConfigured();
            }));

    browser.cloudFile.onAccountAdded.addListener((account) => (new PlikConnection(account.id)).updateConfigured());

    browser.cloudFile.onFileUpload.addListener((account, fileInfo) =>
        (new PlikConnection(account.id)).load().then(pc => pc.uploadFile(fileInfo)));

    browser.cloudFile.onFileDeleted.addListener((account, fileId) =>
        (new PlikConnection(account.id)).load().then(pc => pc.deleteFile(fileId)));

    browser.cloudFile.onFileUploadAbort.addListener(PlikConnection.abortUpload);

    browser.cloudFile.onAccountDeleted.addListener(PlikConnection.deleteAccount);

})();