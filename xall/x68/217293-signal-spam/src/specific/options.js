
browser.runtime.getBackgroundPage().then(backgroundPage=>{
    let stopPhishingLocales = backgroundPage.localizationData;
    let valueBeforeSave;
    let PARAM = backgroundPage.PARAM;
    let verifrom = backgroundPage.verifrom;

    function statusError(message)
    {
        let status = document.getElementById('statusBox');
        status.className="alert visible error";
        status.opacity="0";
        document.getElementById('statusMessage').textContent = message;
    }

    function statusOK(message)
    {
        let status = document.getElementById('statusBox');
        status.className="alert visible success";
        status.opacity="1";
        document.getElementById('statusMessage').textContent = message;
    }

    function statusHide()
    {
        let status = document.getElementById('statusBox');
        status.className="alert notvisible";
        status.opacity="0";
    }


    function checkCredentials()
    {
        let options={};

        for (let key of PARAM.USER_SETTINGS.SETTINGS) {
            let element = document.querySelector(`[extensionOption="${key}"]`);
            if (!element) {
                void 0;
                continue;
            }
            switch(element.getAttribute("type")) {
                case 'text':
                    options[key]=element.value;
                    break;
                case 'password':
                    options[key]=backgroundPage.passwordEncrypt(element.value);
                    break;
                case 'checkbox':
                    options[key]=element.checked;
                    break;
            }
        }

        void 0;

        backgroundPage.checkUserCredentials(
            ()=>{
                options.userAuthentified=true;
                saveOptions(options);
            },
            (statusCode)=> {
                options.userAuthentified = false;
                switch(statusCode) {
                    case 401:
                        statusError(verifrom.locales.getMessage("options.invalidCredentials"));
                        break;
                    case 403:
                        statusError(verifrom.locales.getMessage("options.invalidCredentials"));
                        break;
                    default:
                        statusError(verifrom.locales.getMessage("options.errorVerifyingCredentials"));
                        break;
                }
            },
            options
        );
    }

    function enableSave() {
        document.getElementById('save').setAttribute('style','opacity:1.0; cursor:pointer;');
        document.getElementById('save').addEventListener('click',validateAndSave);
    }

    function disableSave() {
        document.getElementById('save').setAttribute('style','opacity:0.2; cursor:not-allowed;');
        document.getElementById('save').removeEventListener('click',validateAndSave);
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

    function validateAndSave() {
        let cgu = document.getElementById('validCGU').checked;
        let email = document.getElementById('email').value;
        let password = document.getElementById('password').value;

        if (email.length===0)
        {
            statusError(verifrom.locales.getMessage("options.invalidUserId"));
            document.getElementById('email').setAttribute('style','border-color:red;');
            document.getElementById('email').focus();
            return;
        }
        if (password.length===0)
        {
            statusError(verifrom.locales.getMessage("options.missingPassword"));
            document.getElementById('password').setAttribute('style','border-color:red;');
            document.getElementById('password').focus();
            return;
        }
        if (cgu)
            checkCredentials();
        else {
            statusError(verifrom.locales.getMessage("options.validateAgreement"));
            document.getElementById('CGU').setAttribute('style','color:red;');
        }
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

    document.addEventListener('DOMContentLoaded', (event)=>{
        void 0;
        restoreOptions();
        verifrom.localize({
            languageData:backgroundPage.localizationData
        },event.target);
        setInputListeners();
        let query=location.search.split(/[\?\&]/);
        if (query.indexOf('invalidpassword=true')>=0)
        {
            statusError(verifrom.locales.getMessage("options.invalidCredentials")); 
        }
        let closeBtns = document.getElementsByClassName("closebtn");
        let i;

        for (i = 0; i < closeBtns.length; i++) {
            closeBtns[i].onclick = function(){
                let div = this.parentElement;
                setTimeout(function(){ div.className="alert notvisible" }, 200);
            }
        }
    });
});

