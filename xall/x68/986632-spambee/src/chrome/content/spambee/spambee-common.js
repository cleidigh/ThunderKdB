var spambee_PARAM = null;
var spambee_notificationBox = null;
var spambee_phishingNotification = null;
var spambee_lastPhishDetected = null;
var spambee_lastCheckId;

const debug = console.debug;
const log = console.log;
var spambee_firstRun = false;
var spambee_verifromSafeBrowsing;
var spambee_stopPhishingStarted = false;
var spambee_emailInspect = null;
var spambee_junkButtonStatus = false;
var spambee_socket;
var spambee_ProgressBar = null;
var spambee_updatedReportsNumber = 0;

var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');
var spambee_prefs = Services.prefs.getBranch("");

var spambee_NotificationReady = false;
const spambee_Notification = {};
XPCOMUtils.defineLazyGetter(spambee_Notification
    , "notificationbox"
    , function() {
        return new MozElements.NotificationBox(function(element) {
            element.setAttribute("flex", "1");
            element.setAttribute("notificationside","top");
            document.getElementById("mail-notification-top").append(element);
            spambee_NotificationReady = true;
        });
    });

function spambee_storeLocalParams(req, params) {
    try {
                verifrom.indexeddb.open('spambeeParams', 'params'
            , { keyPath: 'UID', autoIncrement: false }
                    , 1
                    , function(event) {
                void 0;
                params.UID = 'params';
                verifrom.indexeddb.objectStore.putItem('spambeeParams', 'params', params
                            , function() {
                        void 0;
                            }
                            , function() {
                        void 0;
                            }
                        );
                    }
                    , function() {
                void 0;
                    }
                    , function() {
                void 0;
                    }
                );
    } catch (e) {
        void 0;
    }
}

function spambee_loadLocalParams(req, callback) {
    try {
        verifrom.indexeddb.open('spambeeParams', 'params'
            , { keyPath: 'params', autoIncrement: false }
            , 1
            , function(event) {
                void 0;
                verifrom.indexeddb.objectStore.getItem('spambeeParams', 'params',"params",
                    function(params) {
                        void 0;
                        callback(params.result);
                    },
                    function() {
                        void 0;
                        callback(undefined);
                    });
            }
            , function() {
                void 0;
                callback(undefined);
            }
            , function() {
                void 0;
                callback(undefined);
            }
        );
    } catch(e) {
        void 0;
        callback(undefined);
    }
}

function spambee_loadParams(callback) {
    void 0;
    try {

        var req = new XMLHttpRequest();
        if (extensionConfig.appInfo.staging===true)
            req.open("GET", extensionConfig.jsonConfig.staging + "?time=" + Date.now());
        else
            req.open("GET", extensionConfig.jsonConfig.url + "?time=" + Date.now());
        req.onreadystatechange = function () {
            if (req.readyState == 4) {
                switch (req.status) {
                    case 200:
                        void 0;
                        if (typeof req.response === 'string') {
                            void 0;
                            spambee_PARAM = JSON.parse(req.response);
                        } else if (typeof req.response === 'object')
                            spambee_PARAM = req.response;
                        else throw "spambee_PARAM request replied with unexpected type";
                        spambee_storeLocalParams(req, spambee_PARAM);


                        if (typeof callback === 'function')
                            callback(true);
                        break;
                    default:
                        void 0;
                        spambee_loadLocalParams(req, function(params){
                            if (typeof params === 'string') {
                                void 0;
                                spambee_PARAM = JSON.parse(params);
                            } else if (typeof params === 'object')
                                spambee_PARAM = params;
                            else throw "spambee_PARAM request replied with unexpected type";
                            if (typeof callback === 'function')
                                callback(true);
                        });
                        break;
                }
            }
        };
        req.send();
    } catch (err) {
        void 0;
            if (typeof callback === 'function')
            callback(false);
    }
}

function spambee_checkPartialDisplay() {
    return true;
}


function spambee_getMailLinks(element, partialExtract) {
    var urlArray = new Array();
    var urlElementsArray = new Array();
    var uniqueUrlArray;
    var uniqueUrlElementsArray;
    var tagsAttrList;
    var tagsAttrPartialList = spambee_PARAM.TAGSATTRPARTIALLIST_CONST;
    var mailLink = "";
    var originalLink = "";
    var mailLinkScheme = "";

    tagsAttrList = spambee_PARAM.TAGSATTRLIST_CONST;

    if (spambee_checkPartialDisplay() === true || partialExtract === true) {
        tagsAttrList = tagsAttrPartialList;
        void 0;
    }
    void 0;
    if (element) {
        for (var i = 0; i < tagsAttrList.length; i++) {
            for (var j = 1; j < tagsAttrList[i].length; j++) {
                var tagAttr = tagsAttrList[i][0] + "[" + tagsAttrList[i][j] + "]";
                void 0;

                var linksInElement = element.querySelectorAll(tagAttr);
                for (var k = 0; k < linksInElement.length; k++) {
                    mailLink = linksInElement[k].getAttribute(tagsAttrList[i][j]);
                    originalLink = mailLink;
                    mailLinkScheme = mailLink.trim().match(/([^:]*):.{1,}$/);
                    if (mailLinkScheme)
                        mailLinkScheme = mailLinkScheme[1];
                    else mailLinkScheme = "http";

                    if (mailLink && mailLinkScheme.match(/^https?/i)) {
                        mailLink = mailLink.replace(new RegExp(spambee_PARAM.ALL_REPLACE_CONST1, spambee_PARAM.ALL_REPLACE_CONST11), spambee_PARAM.ALL_REPLACE_CONST2).replace(new RegExp(spambee_PARAM.ALL_REPLACE_CONST3, spambee_PARAM.ALL_REPLACE_CONST33), spambee_PARAM.ALL_REPLACE_CONST4);
                        void 0;
                        urlArray.push(mailLinkScheme + '://' + mailLink);
                        urlElementsArray.push({url: mailLinkScheme + '://' + mailLink, element: linksInElement[k]});
                        void 0;
                    }
                }
            }
        }
        urlArray.sort();
        urlElementsArray.sort(function (a, b) {
            if (a.url < b.url) return -1;
            else if (a.url > b.url) return 1;
            else return 0;
        });
        uniqueUrlArray = new Array();
        uniqueUrlElementsArray = new Array();
        if (urlArray.length > 0) {
            uniqueUrlArray[0] = urlArray[0];
            uniqueUrlElementsArray[0] = [];
            uniqueUrlElementsArray[0][0] = urlElementsArray[0].element;
            for (var i = 1; i < urlArray.length; i++) {
                if (urlArray[i] !== uniqueUrlArray[uniqueUrlArray.length - 1]) {
                    uniqueUrlArray.push(urlArray[i]);
                    if (uniqueUrlElementsArray[i] === undefined) uniqueUrlElementsArray[uniqueUrlArray.length - 1] = [];
                }
                uniqueUrlElementsArray[uniqueUrlArray.length - 1].push(urlElementsArray[i].element);
            }
        }
    }
    return {urlArray: uniqueUrlArray, urlElementsArray: uniqueUrlElementsArray};
}

function spambee_alertOnPhishingSuspect(emailDOMElement, linksToAlert, elementsToAlert, linksHash, win, doc) {
    void 0;
    if (!doc) {
        if (emailDOMElement.parentNode && emailDOMElement.parentNode.parentNode) 
            doc = emailDOMElement.parentNode.parentNode;
        if (!doc)
            return;
    }
    try {

        if(typeof doc.createStyleSheet === 'undefined') {
            doc.createStyleSheet = (function() {
                function createStyleSheet(id) {
                    let sheets = doc.styleSheets;
                    if (sheets && sheets.length>0) {
                        for (let i=0;i<sheets.length;i++) {
                            if (sheets[i].verifromId===id) {
                                if(typeof sheets[i].addRule === 'undefined') 
                                    sheets[i].addRule = addRule;
                                return sheets[i];
                            }
                        }
                    }

                    let element = doc.createElement('style');
                    element.id = id;
                    element.type = 'text/css';
                    doc.getElementsByTagName('head')[0].appendChild(element);
                    let sheet = doc.styleSheets[doc.styleSheets.length - 1];
                    sheet.verifromId = id;
                    if(typeof sheet.addRule === 'undefined')
                        sheet.addRule = addRule;
                    if(typeof sheet.removeRule === 'undefined')
                        sheet.removeRule = sheet.deleteRule;
                    return sheet;
                }
                function addRule(selectorText, cssText, index) {
                    if(typeof index === 'undefined')
                        index = this.cssRules.length;

                    this.insertRule(selectorText + ' {' + cssText + '}', index);
                }
                return createStyleSheet;
            })();
        }

        var styleSheet = doc.createStyleSheet("spambee_stylesheet");
        styleSheet.addRule("[spambee-tip]","position: relative; cursor: no-drop; border-bottom: 2px dotted #BE0044; z-index: 2147483647;");
        styleSheet.addRule("[spambee-tip]::after",'position: absolute; ' +
            'top: 5px; ' +
            'left: calc(100% + 1.2em); ' +
            'font-size: 1em; ' +
            'color: #D70022; ' +
            'z-index: 2147483647; ' +
            'content: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABMAAAATCAYAAAByUDbMAAACVklEQVQ4jY2U30tTYRjH/RO88SZ2UUFQ0cUgoqAIk6AhZUl1ETUZC1Gp1cC8UIbO9cOWelMD3SwbDGbBiTnIPKlZ5I515RyLGC6yHYN5MfHAYd1+umnHc86Oo+/le57zeb7Py/N+6+osBLiABLDOjtLAS6DR6h8ryCUTAIBUOkdclPRHHwF7LZDfDNErLkrcfjypP9oGXLuNZZCilgkLCzh9IZy+EFOixP4LdxgX5s2ldj3Ibv6azcs4fSEKxZJh1GM3+mjxDpvLt4H6Cmy6cjqztAKgjVMolggLC2TzstakqSNgdQv+CkxTX+gVgYhANi8TFyVOtPk40HKXPee6NJdu/5gVbL0KViiWcNwaIpuXic0scfqmn4amdo5e79XcBaNJKxiAvQr28EWCmaUVvv/8zZn2AA1N7bgGdtzUgDUaYKl0DnF5lUKxhKKWCUaTxN5+RlHLWo1pPTTF36X6LWG7KZuXq5zFRYlgNEkqnaMKpt90vSNFLeP0hVDUMopaZuofRL8+BhjARe8w779kGBfmSaVzWpOznQ9o9jwhGE0SFyUDpNLMsGcA13qfceRqD63do7R2j3LKPcDhKz3YHB72nfcSfvMBeXMLeXPLAJtILMqGF/B67ituf4RZKYO8ucVyZo1ZKYN3JMbB1nvYHB4OXe6pcjWRWNzouD/RbHiby5m1qkuv6OnUHCddg9gcHoYmpxkX5glGk3Q9ep6ob+zc+9+poah/6B8TON7Wj83hqTRVsEoNU579sgJ++7GB2x/BOxID+EStPLOIpGkTeBWIUiNp/wL1eCe7YviSUQAAAABJRU5ErkJggg==);');

        styleSheet.addRule("[spambee-tip]::before",'position: absolute;' +
            '            top: 5px;' +
            '            left: 101%;' +
            '            font-size: 1em;' +
            '            color: #BE0044;' +
            '            z-index: 2147483647;' +
            '            content: "⬅";');

        var style = emailDOMElement.ownerDocument.createElement("style");

        for (var i = 0; i < elementsToAlert.length; i++) {
            if (elementsToAlert[i]) {
                if (elementsToAlert[i].length)
                    for (var j = 0; j < elementsToAlert[i].length; j++)
                        if (elementsToAlert[i][j].setAttribute)
                            elementsToAlert[i][j].setAttribute(verifrom.appInfo.extensionName + '-tip', 'warning');
                        else if (elementsToAlert[i].setAttribute)
                            elementsToAlert[i].setAttribute(verifrom.appInfo.extensionName + '-tip', 'warning');
            }
        }
        spambee_showNotification(win);
        spambee_lastPhishDetected = {
            emailDOMElement: emailDOMElement,
            linksToAlert: linksToAlert,
            elementsToAlert: elementsToAlert,
            linksHash: linksHash
        };
        spambee_verifromSafeBrowsing.postMessage({
            'event': 'PHISHING_EMAIL_SIDEBAR',
            'eventDetail': extensionConfig.appInfo.environment,
            'links': linksToAlert
        }, {channel: "PhishingDetection"});
    } catch (e) {
        void 0;
    }
}

function spambee_startMailCheck(emailDOMElement, win, doc) {
    var phishingAlert = false;
    var linksToAlert = [];
    var elementsToAlert = [];
    var linksHash = [];


    var id = spambee_lastCheckId = Date.now();

    void 0;
    var mailLinks = spambee_getMailLinks(emailDOMElement, true);
    if (!mailLinks)
        return;
    void 0;
    spambee_checkHostPathCombination(mailLinks.urlArray, id,
        function onSuspect(message) {
            if (!mailLinks)
                return;
            if (message.id < spambee_lastCheckId)
                return;
            phishingAlert = true;
            for (var k = 0; k < message.suspects.length; k++) {
                i = message.suspects[k].index;
                if (mailLinks.urlArray[i])
                    linksToAlert.push(mailLinks.urlArray[i]);
                if (mailLinks.urlElementsArray[i])
                    elementsToAlert.push(mailLinks.urlElementsArray[i]);
                if (message.suspects[k].hash)
                    linksHash.push(message.suspects[k].hash);
                void 0;
            }
            mailLinks = null;
            spambee_alertOnPhishingSuspect(emailDOMElement, linksToAlert, elementsToAlert, linksHash, win, doc);
        }
    );
}

function spambee_checkHostPathCombination(mailLinks, id, onSuspectCallback) {
    void 0;
    spambee_verifromSafeBrowsing.addListener("spambee_checkHostPathCombination", function (message) {
        if (message.phishingAlert === true) {
            void 0;
            onSuspectCallback(message);
        } else mailLinks = null;
    });
    void 0;
    spambee_verifromSafeBrowsing.postMessage({mailLinks: mailLinks, id: id}, {"channel": "spambee_checkHostPathCombination"});
}

function spambee_confirmMultipleReports(messages) {
    if (!messages || messages.length <= 0)
        return;
    var view = spambee_showView("spambeeReportMultipleEmails");
    var reportsNumber = view.querySelector("#spambeeReportsNumber");
    var reportsNumber2 = view.querySelector("#spambeeReportsNumber2");
    reportsNumber.textContent = reportsNumber2.textContent;
    reportsNumber.textContent = reportsNumber.textContent.replace("__VFSELECTEDMAILS__", messages.length);
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService)
        .getBranch("");
    var notification = prefs.getBoolPref("extensions.spambee.notification");
    var notificationChoice = view.querySelector("#feedback2");
    notificationChoice.checked = notification;
    var willNotifyUser = notification;
    var dataprivacy = prefs.getBoolPref("extensions.spambee.privacy");
    var dataprivacyChoice = view.querySelector("#dataprivacy2");
    dataprivacyChoice.checked = dataprivacy;

    var reportsToSend = messages.length;

    var clickToView = view.querySelector("#zoomOriginalEmail");
    var clickToReport = view.querySelector(".SPOKBox");
    clickToReport.onclick = function () {
        progressView = spambee_showView("spambeeSendingReports", true);
        var progressMeter = progressView.querySelector("#spambeeReportsProgress");
        progressMeter.max = messages.length;
        progressMeter.value = 0;
        var reportsToSend = messages.length;
        var reportsSent = 0;
        var reportsInerror = 0;
        var allReportsSent = function () {
            if (reportsInerror === 0) {
                var viewOK = spambee_showView("spambeeMultipleReportsSent", true);
                viewOK.querySelector("#spambeeWillNotifyMultiple").hidden = !willNotifyUser;
                viewOK.onclick = spambee_closeSidebar;
            } else {
                var viewError = spambee_showView("spambeeMultipleReportsFailed", true);
                var errorsNumber = viewError.querySelector("#failureNumber");
                var successNumber = viewError.querySelector("#successNumber");
                errorsNumber.value = reportsInerror;
                successNumber.value = reportsSent;
                viewError.onclick = spambee_closeSidebar;
            }
            spambee_showProgressBar(false);
        };
        spambee_showProgressBar(true);
        for (var i = 0; i < messages.length; i++) {
            spambee_markAsSpam(messages[i].msg, messages[i].folder, function () {
                var message = this;
                spambee_sendToServer(message.eml, message.folder, message.msg, notificationChoice.checked, dataprivacyChoice.checked
                    , function (reportResponse) {
                        var message = this;
                        reportsToSend--;
                        reportsSent++;
                        progressMeter.value = reportsSent;
                        if (reportsToSend === 0)
                            allReportsSent();
                        var reportToStore = {
                            "sender": message.sender,
                            "subject": message.subject,
                            "webmail": verifrom.appInfo.extensionName,
                            "reportId": Date.now(),
                            "feedbackRequested": notificationChoice.checked,
                            "privacy": dataprivacyChoice.checked
                        };
                        void 0;
                        spambee_verifromSafeBrowsing.postMessage(
                            {
                                uid: reportResponse.content.uuid,
                                report: reportToStore
                            }
                            , {channel: "addReport"}
                        );
                    }.bind(message)
                    , function () {
                        reportsToSend--;
                        reportsInerror++;
                        progressMeter.value = reportsSent;
                        if (reportsToSend === 0)
                            allReportsSent();
                    }
                );
            }.bind(messages[i]));
        }
    };
    clickToView.onclick = function () {
        var multipleEmlView = spambee_showView("spambeeViewMultipleMails", false);
        void 0;
        var currentEml = 1;
        multipleEmlView.querySelector("#spambeeNDisplay").value = currentEml;
        multipleEmlView.querySelector("#spambeeNEmls").value = messages.length;
        var description = multipleEmlView.querySelector("#spambeeEmlContent");
        description.textContent = spambee_cutEml(messages[currentEml - 1].eml);
        var prevEmlButton = multipleEmlView.querySelector("#spambeePrevEml");
        var nextEmlButton = multipleEmlView.querySelector("#spambeeNextEml");
        prevEmlButton.onclick = function () {
            if (currentEml <= 1)
                return;
            currentEml--;
            description.textContent = spambee_cutEml(messages[currentEml - 1].eml);
            multipleEmlView.querySelector("#spambeeNDisplay").value = currentEml;
        };
        nextEmlButton.onclick = function () {
            if (currentEml >= messages.length)
                return;
            currentEml++;
            description.textContent = spambee_cutEml(messages[currentEml - 1].eml);
            multipleEmlView.querySelector("#spambeeNDisplay").value = currentEml;
        };
    };
}

function spambee_confirmSingleReport(message) {
    if (!message)
        return;
    var view = spambee_showView("spambeeSingleReport");
    var fromvalue = document.querySelector("#fromvalue", view);
    var emailsubject = document.querySelector("#emailsubject", view);
    fromvalue.value = message.sender;
    emailsubject.value = message.subject;
    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService)
        .getBranch("");
    var notification = prefs.getBoolPref("extensions.spambee.notification");
    var notificationChoice = document.querySelector("#feedback", view);
    var willNotifyUser = notification;
    notificationChoice.checked = notification;
    var dataprivacy = prefs.getBoolPref("extensions.spambee.privacy");
    var dataprivacyChoice = document.querySelector("#dataprivacy", view);
    dataprivacyChoice.checked = dataprivacy;
    var clickToView = document.querySelector("#zoomOriginalEmail", view);
    clickToView.onclick = function () {
        spambee_showView("spambeeViewSingleMail", false);
        void 0;
        var description = document.querySelector("#spambeeViewSingleMail>vbox>description");
        description.textContent = spambee_cutEml(message.eml);
    };
    var clickToReport = document.querySelector(".SPOKBox", view);
    clickToReport.onclick = function () {
        spambee_markAsSpam(message.msg, message.folder, function () {
            spambee_showView("spambeeSendingSingleReport", true);
            spambee_sendToServer(message.eml, message.folder, message.msg, notificationChoice.checked, dataprivacyChoice.checked
                , function (reportResponse) {
                    var view = spambee_showView("spambeeSingleReportSent", true);
                    view.querySelector("#spambeeWillNotify").hidden = !willNotifyUser;
                    view.onclick = spambee_closeSidebar;
                    var reportToStore = {
                        "sender": message.sender,
                        "subject": message.subject,
                        "webmail": verifrom.appInfo.extensionName,
                        "reportId": Date.now(),
                        "feedbackRequested": notificationChoice.checked,
                        "privacy": dataprivacyChoice.checked
                    };
                    spambee_verifromSafeBrowsing.postMessage(
                        {
                            uid: reportResponse.content.uuid,
                            report: reportToStore
                        }
                        , {channel: "addReport"}
                    );
                    spambee_showProgressBar(false);
                }
                , function (failureCode) {
                    var view = spambee_showView("spambeeSingleReportFailed", true);
                    view.onclick = spambee_closeSidebar;
                    var reason = document.querySelector("#spambeeFailureReason", view);
                    if (reason)
                        reason.value = failureCode;
                    spambee_showProgressBar(false);
                }
            );
        }.bind(this));
    };
}

function spambee_cutEml(bodyToDisplay) {
    var limit = 7000;
    var bodyContentDisplayed = bodyToDisplay.substr(0, limit);
    if (bodyToDisplay.length > limit)
        bodyContentDisplayed += '[...]';
    if (bodyToDisplay.length > 2 * limit) {
        bodyContentDisplayed += bodyToDisplay.substr(bodyToDisplay.length - limit, limit);
    } else if (bodyToDisplay.length > (1.5 * limit)) {
        bodyContentDisplayed += emailContent.substr(bodyToDisplay.length - (limit / 2), limit / 2);
    }
    return bodyContentDisplayed;
}

function spambee_markAsSpam(selectedMessage, messageFolder, callback) {
    try {
        if (typeof selectedMessage.setStringProperty === 'function' && typeof selectedMessage.folder !== 'undefined') {


            var prefs = Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService)
                .getBranch("");

            var aJunkMsgHdrs = Components.classes["@mozilla.org/array;1"]
                .createInstance(Components.interfaces.nsIMutableArray);
            aJunkMsgHdrs.appendElement(selectedMessage, false);

            try {
                var markAsReadOnSpam = prefs.getBoolPref("mail.spam.markAsReadOnSpam");
                if (markAsReadOnSpam === true) {
                    selectedMessage.markRead(true);
                    selectedMessage.folder.markMessagesRead(aJunkMsgHdrs, true);
                }

                var nsIJunkMailPlugin = Components.interfaces.nsIJunkMailPlugin;
                if (nsIJunkMailPlugin && typeof nsIJunkMailPlugin.IS_SPAM_SCORE !== 'undefined' && selectedMessage.folder && selectedMessage.folder.msgDatabase) {
                    selectedMessage.setStringProperty("junkscore", nsIJunkMailPlugin.IS_SPAM_SCORE);
                    selectedMessage.setStringProperty('junkpercent', '100');
                    selectedMessage.setStringProperty("junkscoreorigin", "user");
                    selectedMessage.folder.setJunkScoreForMessages(aJunkMsgHdrs, nsIJunkMailPlugin.IS_SPAM_SCORE);
                }
                selectedMessage.folder.msgDatabase.updateHdrInCache(selectedMessage.folder.URI, selectedMessage, false);
            } catch (e) {
                void 0;
            }

            if (prefs.getBoolPref("extensions.spambee.movereport") === true) {
                var manualMark = prefs.getBoolPref("mail.spam.manualMark");
                var manualMarkMode = prefs.getIntPref("mail.spam.manualMarkMode");
                if (manualMark === true) {
                    var destFolder;
                    var copyService = Components.classes["@mozilla.org/messenger/messagecopyservice;1"].getService(Components.interfaces.nsIMsgCopyService);

                    if (manualMarkMode !== 1) 
                    {
                        destFolder = spambee_findJunkFolder(selectedMessage.folder.rootFolder);
                        if (!destFolder) 
                            destFolder = spambee_findTrashFolder(selectedMessage.folder.rootFolder); 
                    } else if (manualMarkMode === 1) {
                        destFolder = spambee_findTrashFolder(selectedMessage.folder.rootFolder);
                    }
                    if (destFolder && destFolder !== selectedMessage.folder) {
                        void 0;

                        copyService.CopyMessages(selectedMessage.folder, aJunkMsgHdrs, destFolder, true, null, msgWindow, true);
                    } else void 0;
                    copyService = null;
                    destFolder = null;
                }
            }
            prefs = null;
            aJunkMsgHdrs = null;


        } else {
            void 0;
        }
    } catch (e) {
        void 0;
    } finally {
        callback();
    }
}

function spambee_channelObject(folder, selectedMessage, callback, sender, subject, recipients) {
    this.messagesSrc = "";
    this.folder = folder;
    this.selectedMessage = selectedMessage;
    this.sender = sender;
    this.subject = subject;
    this.recipients = recipients;
    this.context = undefined;
    this.onDataAvailable = function (request, inputStream, offset, count) {
        try {
            void 0;
            var inStream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
            inStream.init(inputStream);
            this.messagesSrc += inStream.read(count);
        } catch(e) {
            void 0;
        }
    };

    this.onStartRequest = function (request, context) {
        void 0;
    };

    this.onStopRequest = function (request, statusCode) {
        void 0;

        if (statusCode != Components.results.NS_OK) {
            void 0;
            callback(null);
            return 0;
        }
        callback(this.messagesSrc, this.selectedMessage, this.sender, this.subject, this.folder, this.recipients);
    };
}

function spambee_anonymizeMailHeader(header) {
    if (!header)
        return header;
    var headersToReplace = [
        "To",
        "Recipient",
        "Delivered-To",
        "X-Delivered-to",
        "X-Resolved-to",
        "Cc",
        "Bcc",
        "Resent-To",
        "Resent-CC",
        "Resent-BCC",
        "Alternate-Recipient",
        "Disclose-Recipients",
        "Downgraded-Bcc",
        "Downgraded-Cc",
        "Downgraded-Final-Recipient",
        "Downgraded-Original-Recipient",
        "Downgraded-Rcpt-To",
        "Downgraded-Resent-Bcc",
        "Downgraded-Resent-Cc",
        "Downgraded-Resent-To",
        "Downgraded-To",
        "X400-Recipients",
        "Original-Recipient"
    ];
    var emailAddresses = [];
    var names = [];
    var headers = header.replace(/\n\n.*/gm, ' ').replace(/\n\s{1,}/gm, ' ').split('\n');
    try {
        var done = false;
        for (var k = 0; k < headers.length && done === false; k++) {
            var headerLine = headers[k];
            if (headerLine.length === 0) {
                done = true;
                continue;
            }
            for (var i = 0; i < headersToReplace.length; i++) {
                var re = new RegExp("(^" + headersToReplace[i] + ":\\s{1,})(.*)$", "img");
                if (!headerLine.match(re))
                    continue;
                var headerValue = headerLine.replace(re, '$2');
                headerValue = headerValue.split(',');
                for (var j = 0; j < headerValue.length; j++) {
                    var re2 = /(([^<]+)<)*(([\s\w\.#\$%&'\*\+-\/=\?\^_`\{\|\}~!"]+)@([^>]*))>?/gi;
                    var mailAddress = re2.exec(headerValue[j].trim()); 
                    if (mailAddress && mailAddress.length === 6) {
                        if (mailAddress[3] && mailAddress[3].length > 0)
                            emailAddresses.push(mailAddress[3]);
                        if (mailAddress[2] && mailAddress[2].length > 0) {
                            try {
                                names.push.apply(names, mailAddress[2].trim().toLowerCase().split(/\s+/g).filter(function (a) {
                                    return a.length > 0
                                }));
                            } catch (e) {
                                void 0;
                            }
                        }
                    }
                }
            }
            headers[k] = headerLine;
        }
        void 0;
        headers = header.split('\n');
        if (emailAddresses.length > 0) {
            emailAddresses = Array.from(new Set(emailAddresses));
            for (var i = 0; i < emailAddresses.length; i++) {
                for (var k = 0; k < headers.length; k++) {
                    var headerLine = headers[k];
                    if (headerLine.length < emailAddresses[i].length) {
                        continue;
                    }
                    headers[k] = headers[k].split(emailAddresses[i]).join(spambee_PARAM.UNDISCLOSED_RECIPIENT || "UNDISCLOSED_RECIPIENT@UNDISCLOSEDDOMAIN.TLD");
                }
            }
        }
        try {
            if (names.length > 0) {
                names = Array.from(new Set(names));
                for (var i = 0; i < names.length; i++) {
                    if (names[i].length < (spambee_PARAM.MINIMUM_NAME_LENGTH || 3))
                        continue;
                    for (var k = 0; k < headers.length; k++) {
                        var headerLine = headers[k];
                        if (headerLine.length < names[i].length) {
                            continue;
                        }
                        headers[k] = headers[k].replace(new RegExp("\\b" + names[i] + "\\b", 'gim'), spambee_PARAM.UNDISCLOSED_NAME || "UNDISCLOSED");
                    }
                }
            }
        } catch (e) {
            void 0;
        }
    } catch (e) {
        headers = header.split('\n');
        void 0;
    }
    return headers.join("\n");
}

function spambee_reportEmail(cause, selectedMessagesParam, selectedMessageUrisParam) {
    void 0;

    var prefs = Components.classes["@mozilla.org/preferences-service;1"]
        .getService(Components.interfaces.nsIPrefService)
        .getBranch("");

    if (spambee_PARAM.OPTIONS.REPORT_USERACCOUNT_REQUIRED_ENABLED && prefs.getBoolPref("extensions.spambee.userauthentified") !== true) {
        void 0;
        spambee_openPreferences("error");
        return;
    }

    try {
        var vSelectedMessages = selectedMessageUrisParam || gFolderDisplay.selectedMessageUris;
        if (vSelectedMessages.length == 0)
            return;

        var oSelectedMessages = selectedMessagesParam || gFolderDisplay.selectedMessages;

        spambee_showProgressBar(true);

        const IOServiceContractID = "@mozilla.org/network/io-service;1";
        const nsIIOService = Components.interfaces.nsIIOService;
        const mailSessionContractID = "@mozilla.org/messenger/services/session;1";
        const nsIMsgMailSession = Components.interfaces.nsIMsgMailSession;
        var mailSession = Components.classes[mailSessionContractID].getService(nsIMsgMailSession);
        var ioService = Components.classes[IOServiceContractID].getService(nsIIOService);

        var messagesToRetrieve = vSelectedMessages.length;
        var retrievedMessages = [];
        var handleRawMail = function (eml, selectedMessage, sender, subject, folder) {
            messagesToRetrieve--;
            if (eml) {
                    eml = spambee_anonymizeMailHeader(eml);
                retrievedMessages.push({
                    "eml": eml,
                    "msg": selectedMessage,
                    "sender": sender,
                    "subject": subject,
                    "folder": folder
                });
            }
            if (!messagesToRetrieve) {
                spambee_showProgressBar(false);
                if (retrievedMessages.length === 1)
                    spambee_confirmSingleReport(retrievedMessages[0]);
                else spambee_confirmMultipleReports(retrievedMessages);
            }
        };


        for (var i = 0; i < vSelectedMessages.length; i++) {
            try {
                var selectedMessageUri = vSelectedMessages[i];
                var selectedMessage = oSelectedMessages[i];
                var sender = oSelectedMessages[i].mime2DecodedAuthor;
                var subject = oSelectedMessages[i].mime2DecodedSubject;
                var recipients = oSelectedMessages[i].recipients;
                var folder = (Components.interfaces.nsMsgFolderFlags.Junk & selectedMessage.folder.flags) ? 1 : 2;
                var vUrl = mailSession.ConvertMsgURIToMsgURL(selectedMessageUri, msgWindow);
                var realUri = ioService.newURI(vUrl, null, null);
                var channel = ioService.newChannelFromURI(realUri,null, Services.scriptSecurityManager.getSystemPrincipal(),null, Components.interfaces.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL,Components.interfaces.nsIContentPolicy.TYPE_OTHER);
                var nsStr = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
                nsStr.data = selectedMessage;
                var channelInstance = new spambee_channelObject(folder, (prefs.getBoolPref("extensions.spambee.movereport") === true && cause !== 'hdrJunkButton') ? selectedMessage : {messageKey: selectedMessage.messageKey}, handleRawMail, sender, subject, recipients);
                channel.asyncOpen(channelInstance, nsStr);
            } catch (e) {
                void 0;
                continue;
            }
        }
    } catch (e) {
        void 0;
        spambee_showProgressBar(false);
    }
}

function spambee_sendToServer(data, folder, messageObject, notificationChoice, privacyChoice, onSuccessCallback, onFailureCallback) {
    spambee_showProgressBar(false);
    try {
        var prefs = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService)
            .getBranch("");

        void 0;
        if (messageObject)
            void 0;
        var password = null;
        var userid = null;
        if (spambee_PARAM.OPTIONS.REPORT_USERACCOUNT_REQUIRED_ENABLED === true) {
            userid = prefs.getCharPref("extensions.spambee.userid");
            var loginInfo = verifrom.credentials.get(userid);
            password = loginInfo.password;
        }
        spambee_verifromSafeBrowsing.addListener("PayloadPosted" + messageObject.messageKey, spambee_handleReportResponse.bind({
            onSuccessCallback: onSuccessCallback,
            onFailureCallback: onFailureCallback
        }));
        spambee_verifromSafeBrowsing.postMessage({
            'action': 'signalEmail',
            key: messageObject.messageKey,
            email: data,
            folder: folder,
            username: userid,
            password: password,
            notificationChoice: notificationChoice,
            privacyChoice: privacyChoice
        }, {channel: "postSignal"});
    } catch (e) {
        spambee_showProgressBar(false);
        onFailureCallback("Exception");
        void 0;
    }
}

function spambee_findJunkFolder(rootFolder) {
    return rootFolder.getFolderWithFlags(Components.interfaces.nsMsgFolderFlags.Junk);
}

function spambee_findTrashFolder(rootFolder) {
    return rootFolder.getFolderWithFlags(Components.interfaces.nsMsgFolderFlags.Trash);
}

function spambee_handleReportResponse(message)
{
    spambee_verifromSafeBrowsing.removeListener("PayloadPosted" + message.key)
    switch (message.response) {
        case 200:
        case 201:
        case 202:
            void 0;
            if (this && "function" === typeof this.onSuccessCallback)
                this.onSuccessCallback(message);
            break;
        default:
            void 0;
            if (this && "function" === typeof this.onFailureCallback)
                this.onFailureCallback(message.response);
            break;
    }
}

function spambee_reportFalsePositive(command) {
    void 0;
    spambee_hideNotifications();
    if (!spambee_lastPhishDetected) {
        void 0;
        return;
    }
    spambee_showProgressBar(true);
    var elementsToAlert = spambee_lastPhishDetected.elementsToAlert;
    for (var i = 0; i < elementsToAlert.length; i++) {
        if (elementsToAlert[i]) {
            if (elementsToAlert[i].length)
                for (var j = 0; j < elementsToAlert[i].length; j++)
                    if (elementsToAlert[i][j].removeAttribute)
                        elementsToAlert[i][j].removeAttribute(verifrom.appInfo.extensionName + '-tip', 'warning');
                    else if (elementsToAlert[i].removeAttribute)
                        elementsToAlert[i].removeAttribute(verifrom.appInfo.extensionName + '-tip', 'warning');
        }
    }
    spambee_verifromSafeBrowsing.postMessage({
        'phishingLinks': spambee_lastPhishDetected.linksToAlert,
        'phishingHashes': spambee_lastPhishDetected.linksHash
    }, {"channel": "falsePositiveReport"});
    spambee_showProgressBar(false);
}

function spambee_onMessageLoadHandler(event) {
    void 0;
    var doc = event.originalTarget;  
    spambee_startMailCheck(doc.body, this, doc);
    event.originalTarget.defaultView.addEventListener("unload", spambee_onMessageUnloadHandler, true);
}

function spambee_onMessageUnloadHandler(event) {
    event.originalTarget.defaultView.removeEventListener("unload", spambee_onMessageUnloadHandler, true);
    void 0;
    spambee_hideNotifications(this);
    spambee_lastPhishDetected = null;
}

function spambee_emailInspector(doc, win, handler) {
    this.doc = doc || document;
    this.win = win || window;
    this.handler = handler || spambee_onMessageLoadHandler;
    this.listener1 = false;
    this.listener2 = false;

    this.start = function () {
        void 0;
        var appcontent = this.doc.getElementById("appcontent"); 
        if (appcontent && !this.listener1) {
            appcontent.addEventListener("OMContentLoaded", this.handler, true);
            this.listener1 = true;
        }
        var messagepane = this.doc.getElementById("messagepane"); 
        if (messagepane && !this.listener2) {
            messagepane.addEventListener("load", this.handler, true);
            this.listener2 = true;
        }
    };
    this.stop = function () {
        void 0;
        var appcontent = this.doc.getElementById("appcontent"); 
        if (appcontent && this.listener1) {
            appcontent.removeEventListener("OMContentLoaded", this.handler, true);
            this.listener1 = false;
        }
        var messagepane = this.doc.getElementById("messagepane"); 
        if (messagepane && this.listener2) {
            messagepane.removeEventListener("load", this.handler, true);
            this.listener2 = false;
        }
        this.doc = null;
        this.win = null;
        this.handler = null;
    }
}


function initNotificationBox() {
    let waitForInit = new Promise(function(resolve, reject) {

    });
    return waitForInit
}

function spambee_showNotification() {
    if (spambee_NotificationReady === false || !spambee_Notification || typeof spambee_Notification.notificationbox === "undefined") {
        void 0;
        XPCOMUtils.defineLazyGetter(spambee_Notification
            , "notificationbox"
            , function() {
                return new MozElements.NotificationBox(function(element) {
                    element.setAttribute("flex", "1");
                    element.setAttribute("notificationside","top");
                    document.getElementById("mail-notification-top").append(element);
                    spambee_NotificationReady = true;
                });
            });
    }

    let notifyBox = spambee_Notification.notificationbox;
    let notification = notifyBox.getNotificationWithValue("VFPhishingNotification");
    let bundle = Services.strings.createBundle("chrome://spambee/locale/spambee.properties");

    if (notification)
    {
        void 0;
        return;
    }

    let phishingAlertLabel = bundle.GetStringFromName("spambee.contentScript.sidebar.phishingtitle")+" - "+bundle.GetStringFromName("spambee.contentScript.sidebar.phishingdetected")+" "+bundle.GetStringFromName("spambee.contentScript.sidebar.phishinglinks");
    if (notifyBox) {
        notifyBox.appendNotification(
            phishingAlertLabel,
            "VFPhishingNotification",
            "chrome://spambee/skin/icon48.png",
            notifyBox.PRIORITY_CRITICAL_HIGH,
            [
                {
                    callback: function() {
                        void 0;
                        spambee_reportEmail("phishingAlert",null,null);
                        setTimeout(spambee_showNotification,300);
                        return false;
                    }
                    ,label:bundle.GetStringFromName("spambee.contentScript.sidebar.buttonlabel")
                    ,popup:null
                    ,isDefault:true
                },
                {
                    callback: function() {
                        spambee_reportFalsePositive("cmd_spambeeFalsePositive");
                    }
                    ,label:bundle.GetStringFromName("spambee.contentScript.sidebar.phishingfalseposbutton")
                    ,popup:null
                    ,isDefault:false
                }
            ],function(){
                void 0;
            }
        );
        var falsePositiveButton=document.querySelector("hbox#mail-notification-top>stack>notification[value=VFPhishingNotification]>hbox>button[label="+bundle.GetStringFromName("spambee.contentScript.sidebar.phishingfalseposbutton")+"]");
        if (falsePositiveButton)
            falsePositiveButton.tooltipText = bundle.GetStringFromName("spambee.contentScript.sidebar.phishingfalsepos");
    }
}

function spambee_hideNotifications(win) {
    if (!spambee_Notification || typeof spambee_Notification.notificationbox === "undefined" || spambee_NotificationReady === false) {
        void 0;
        return;
    }
    let notifyBox = spambee_Notification.notificationbox;
    let VFNotification = notifyBox.getNotificationWithValue("VFPhishingNotification");
    if (VFNotification)
        notifyBox.removeNotification(VFNotification);
    notifyBox._stack.remove();
    spambee_NotificationReady = false;
    return;
}

function spambee_prepare(doc) {
    if (spambee_phishingNotification)
        return;
    if (!doc && !document) {
        void 0;
        return;
    }
    let elem = (document || doc).querySelector('#spambee-alert-notification');
    if (!elem || typeof elem.cloneNode !== "function")
    {
        void 0;
        return;
    }
    spambee_phishingNotification = elem.cloneNode(true);
}

function spambee_installButton(toolbarId, id, afterId) {
    void 0
    const selector = "#"+toolbarId+">#"+id;
    const alreadyInstalled = document.querySelectorAll(selector).length === 1;
    if (!alreadyInstalled) {
        var toolbar = document.getElementById(toolbarId);
        if (!toolbar) {
            void 0;
            return;
        }
        var before = null;
        if (afterId) {
            var elem = document.getElementById(afterId);
            if (elem && elem.parentNode == toolbar)
                before = elem.nextElementSibling;
            else before = toolbar.lastChild;
        } else before = toolbar.lastChild;

        void 0
        toolbar.insertItem(id, before);
        void 0;
        toolbar.setAttribute("currentset", toolbar.currentSet);
        Services.xulStore.persist(toolbar, "currentSet");
        void 0;
        if (toolbarId == "addon-bar")
            toolbar.collapsed = false;
    } else void 0;
}

function spambee_showProgressBar(show) {
    if (!spambee_ProgressBar)
        spambee_ProgressBar = document.querySelector("#spambee-statusbar");
    if (!spambee_ProgressBar) {
        void 0;
        return;
    }

    if (show)
        spambee_ProgressBar.className="spambee_statusbar_visible";
    else spambee_ProgressBar.className="spambee_statusbar";
    spambee_ProgressBar.hidden = !show;
}

function spambee_showView(viewId, closeOthers) {
    window.focus();
    var sidebar = document.getElementById("sidebar-box");
    if (!sidebar)
        return;
    var groupboxes = sidebar.querySelectorAll("vbox>groupbox");
    if (!groupboxes)
        return;
    var view;
    for (var i = 0; i < groupboxes.length; i++) {
        if (groupboxes[i].id === viewId) {
            view = groupboxes[i];
            view.hidden = false;
        } else if (closeOthers !== false)
            groupboxes[i].hidden = true;
    }
    var sidebarSplitter = document.getElementById("sidebar-splitter");
    var sidebarSplitterBox = document.getElementById("sidebar-panels-splitter-box");
    sidebar.hidden = false;
    sidebar.setAttribute("sidebarVisible", "true");
    sidebar.setAttribute("collapsed", "false");
    sidebarSplitter.hidden = false;
    sidebarSplitterBox.hidden = false;
    return view;
}

function spambee_toggleSidebar() {
    var sidebarBox = document.getElementById("sidebar-box");
    if (!sidebarBox) {
        return
    }
    var sidebarSplitter = document.getElementById("sidebar-splitter");
    sidebarBox.hidden = false;
    sidebarSplitter.hidden = false;
    sidebarBox.setAttribute("sidebarVisible", "true");
    sidebarBox.setAttribute("collapsed", "false");
}

function spambee_openSidebar() {
    window.focus();
    var sidebarBox = document.getElementById("sidebar-box");
    if (!sidebarBox) {
        return
    }
    var sidebarSplitter = document.getElementById("sidebar-splitter");
    sidebarBox.hidden = false;
    sidebarSplitter.hidden = false;
    sidebarBox.setAttribute("sidebarVisible", "true");
    sidebarBox.setAttribute("collapsed", "false");
}

function spambee_closeSidebar() {
    var sidebarBox = document.getElementById("sidebar-box");
    if (!sidebarBox) {
        return
    }
    var sidebarSplitter = document.getElementById("sidebar-splitter");

    sidebarBox.hidden = true;
    sidebarSplitter.hidden = true;
    sidebarBox.setAttribute("sidebarVisible", "false");
    sidebarBox.setAttribute("collapsed", "true");
}


function spambee_junkButtonHandler() {
    void 0;
    spambee_reportEmail("hdrJunkButton");
}

function spambee_setJunkButton(status) {
    var button = document.getElementById("hdrJunkButton");
    if (button && status === true && spambee_junkButtonStatus == false) {
        button.addEventListener('command', spambee_junkButtonHandler, true);
        spambee_junkButtonStatus = true;
    }
    if (button && status === false && spambee_junkButtonStatus === true) {
        button.removeEventListener('command', spambee_junkButtonHandler, true);
        spambee_junkButtonStatus = false;
    }
}

function spambee_openPreferences(msg) {
    if (null == this._preferencesWindow || this._preferencesWindow.closed) {
        this._preferencesWindow = window.open('chrome://spambee/content/spambee/settings.xul' + (msg ? "?" + msg : ''), "spambee_preferences", "chrome,titlebar,toolbar,centerscreen,width=800,height=720");
    }
    this._preferencesWindow.focus();
}

function spambee_displayInstallManifest() {
    void 0;
    if (navigator.language === 'fr' || navigator.language === 'fr-FR')
        openTab("chromeTab", {chromePage: extensionConfig.appInfo.installManifestURL["fr"]});
    else openTab("chromeTab", {chromePage: extensionConfig.appInfo.installManifestURL["en"]});
}

function spambee_displayUpdateManifest() {
    void 0;
    if (navigator.language === 'fr' || navigator.language === 'fr-FR')
        openTab("chromeTab", {chromePage: extensionConfig.appInfo.updateManifestURL["fr"]});
    else openTab("chromeTab", {chromePage: extensionConfig.appInfo.updateManifestURL["en"]});
}

function VF_PrefListener(branch_name, callback) {
    try {
        this._prefService = Components.classes["@mozilla.org/preferences-service;1"]
            .getService(Components.interfaces.nsIPrefService);
        this._branch = this._prefService.getBranch(branch_name);
        if (Components.interfaces.nsIPrefBranch2)
            this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
        if (Components.interfaces.nsIPrefBranch)
            this._branch.QueryInterface(Components.interfaces.nsIPrefBranch);
        this._callback = callback;
        void 0;
    } catch (e) {
        void 0;
    }
}

VF_PrefListener.prototype.observe = function (subject, topic, data) {
    void 0;
    if (topic == 'nsPref:changed')
        if (typeof this._callback === 'function')
            this._callback(this._branch, data);
        else throw "VF_PrefListener.observe - no callback set"
};

VF_PrefListener.prototype.register = function (trigger) {
    try {
        this._branch.addObserver('', this, false);
        if (trigger) {
            let that = this;
            this._branch.getChildList('', {}).forEach(function (pref_leaf_name) {
                that._callback(that._branch, pref_leaf_name);
            });
        }
    } catch (e) {
        void 0;
    }
};

VF_PrefListener.prototype.unregister = function () {
    if (this._branch)
        this._branch.removeObserver('', this);
};
