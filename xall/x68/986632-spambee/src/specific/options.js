browser.runtime.getBackgroundPage().then(backgroundPage=> {

    let verifrom = backgroundPage.verifrom;
    let valueBeforeSave = {};
    let PARAM = backgroundPage.PARAM;

    verifrom.console.log(1, 'Start');


    function statusError(message) {
        let status = document.getElementById('statusBox');
        status.className = "alert visible error";
        status.opacity = "0";
        status = document.getElementById('statusMessage');
        status.textContent = message;
    }

    function statusOK(message) {
        let status = document.getElementById('statusBox');
        status.className = "alert visible success";
        status.opacity = "1";
        status = document.getElementById('statusMessage');
        status.textContent = message;
    }

    function statusHide()
    {
        let status = document.getElementById('statusBox');
        status.className="alert notvisible";
        status.opacity="0";
    }

    function checkAndSave() {
        verifrom.console.log(4, 'checkAndSave - PARAM =', PARAM, 'arguments=', arguments);
        try {
            let options = {};
            let elements = document.querySelectorAll(`[extensionOption]`);
            for (let element of elements) {
                let key = element.getAttribute("extensionOption");
                switch (element.getAttribute("type").toLowerCase()) {
                    case 'text':
                        options[key] = element.value;
                        break;
                    case 'password':
                        options[key] = backgroundPage.passwordDecrypt(element.value);
                        break;
                    case 'checkbox':
                        options[key] = element.checked;
                        break;
                    default:
                        throw new Error("unexpected option type");
                }
            }
            saveOptions(options);
        } catch (e) {
            verifrom.console.error(1, 'Exception while verifying credentials', e);
            statusError(verifrom.locales.getMessage("options.errorVerifyingCredentials") + " (" + e + ")");
        }
    }

    function enableSave() {
        document.getElementById('save').setAttribute('style', 'opacity:1.0; cursor:pointer;');
        document.getElementById('save').addEventListener('click', checkAndSave);
    }

    function disableSave() {
        document.getElementById('save').setAttribute('style', 'opacity:0.2; cursor:not-allowed;');
        document.getElementById('save').removeEventListener('click', checkAndSave);
    }

    function checkOptionChange() {
        let changed;
        changed=false;

        for (let key of Object.keys(valueBeforeSave)) {
            let element = document.querySelector(`[extensionOption="${key}"]`);
            if (!element) {
                void 0;
                continue;
            }
            switch(element.getAttribute("type").toLowerCase()) {
                case 'text':
                    changed=element.value!==valueBeforeSave[key];
                    break;
                case 'password':
                    changed=element.value!==backgroundPage.passwordDecrypt(valueBeforeSave[key]);
                    break;
                case 'checkbox':
                    changed=element.checked!==valueBeforeSave[key];
                    break;
            }
            if (changed) {
                void 0;
                break;
            }
        }
        if (changed) {
            enableSave();
            statusHide();
        } else disableSave();
    }

    function saveOptions(options) {
        chrome.storage.sync.get(PARAM.USER_SETTINGS.DEFAULT,
            function(items) {
                chrome.storage.sync.set(options, function() {
                    valueBeforeSave=options;
                    disableSave();
                    statusOK(verifrom.locales.getMessage("options.saved"));
                    setTimeout(function() {
                        this.close();
                    }, 1200);
                });
            }
        );
    }

    function restoreOptions() {
        chrome.storage.sync.get(PARAM.USER_SETTINGS.DEFAULT, function(items) {
            for (let key of Object.keys(items)) {
                let element = document.querySelector(`[extensionOption="${key}"]`);
                if (!element) {
                    void 0;
                    continue;
                }
                switch(element.getAttribute("type").toLowerCase()) {
                    case 'text':
                        element.value=items[key];
                        break;
                    case 'password':
                        element.value=backgroundPage.passwordDecrypt(items[key]);
                        break;
                    case 'checkbox':
                        element.checked=items[key];
                        break;
                }
            }
            valueBeforeSave=items;
        });
        disableSave();
    }

    function setInputListeners() {
        for (let key of PARAM.USER_SETTINGS.SETTINGS) {
            let element = document.querySelector(`[extensionOption="${key}"]`);
            if (!element) {
                void 0;
                continue;
            }
            if (key==="cgu") {
                document.getElementById('CGU').addEventListener('click', function(e) {
                    let cgu = document.getElementById('validCGU').checked;
                    if (cgu) {
                        document.getElementById('CGU').setAttribute('style','color:black;');
                        enableSave();
                    }
                    else {
                        statusError(verifrom.locales.getMessage("options.validateAgreement"));
                        document.getElementById('CGU').setAttribute('style','color:red;');
                        disableSave();
                    }
                });
            } else {
                if (element.oninput===null)
                    element.oninput=checkOptionChange;
                else element.onchange=checkOptionChange;
            }
        }
    }


    document.addEventListener('DOMContentLoaded', (event)=> {
        void 0;
        restoreOptions();
        verifrom.localize(null, window.document);
        setInputListeners();
        document.getElementById('reportslist').addEventListener('click', (event)=>{
            event.preventDefault();
            backgroundPage.openReportsList();
        });
        document.getElementById('moreinfo').addEventListener('click', (event)=>{
            event.preventDefault();
            backgroundPage.notifyInstall();
        });

        let closeBtns = document.getElementsByClassName("closebtn");
        let i;

        for (i = 0; i < closeBtns.length; i++) {
            closeBtns[i].onclick = function () {
                let div = this.parentElement;
                setTimeout(function () {
                    div.className = "alert notvisible"
                }, 200);
            }
        }
    });

});