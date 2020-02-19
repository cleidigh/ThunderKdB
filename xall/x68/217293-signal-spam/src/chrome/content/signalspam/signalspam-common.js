var signalspam_PARAM = null;
var signalspam_notificationBox = null;
var signalspam_phishingNotification = null;
var signalspam_lastPhishDetected = null;
var signalspam_lastCheckId;

const debug = console.debug;
const log = console.log;
var signalspam_firstRun = false;
var signalspam_verifromSafeBrowsing;
var signalspam_stopPhishingStarted = false;
var signalspam_emailInspect = null;
var signalspam_junkButtonStatus = false;
var signalspam_socket;
var signalspam_ProgressBar = null;
var signalspam_updatedReportsNumber = 0;

/*var signalspam_prefs = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService)
    .getBranch("");*/

var { Services } = ChromeUtils.import('resource://gre/modules/Services.jsm');
var signalspam_prefs = Services.prefs.getBranch("");


var signalspam_NotificationReady = false;
const signalspam_Notification = {};
XPCOMUtils.defineLazyGetter(signalspam_Notification
    , "notificationbox"
    , function() {
        return new MozElements.NotificationBox(function(element) {
            element.setAttribute("flex", "1");
            element.setAttribute("notificationside","top");
            document.getElementById("mail-notification-top").append(element);
            signalspam_NotificationReady = true;
        });
    });

function signalspam_storeLocalParams(req, params, upgraded) {
    try {
        verifrom.indexeddb.delete('signalspamParams'
            ,function() {
                verifrom.indexeddb.open('signalspamParams', 'params'
                    , { keyPath: 'params', autoIncrement: false }
                    , 1
                    , function(event) {
                        // onSuccessCallBack
                        verifrom.console.log(0,'signalspam_storeLocalParams - DB opened',event);
                        /*params.UID = 'params';
                        params.id = 'params';*/
                        verifrom.indexeddb.objectStore.putItem('signalspamParams', 'params', {params:"params","data":JSON.stringify(params)}
                            , function() {
                                //onSuccessCallBack
                                verifrom.console.log(0,'signalspam_storeLocalParams - params stored');
                            }
                            , function() {
                                //onErrorCallBack
                                verifrom.console.log(0,'signalspam_storeLocalParams - Error updating params', arguments);
                            }
                        );
                    }
                    , function() {
                        // onErrorCallBack
                        verifrom.console.log(0,'signalspam_storeLocalParams - ERROR opening DB',arguments);
                    }
                    , function() {
                        // onUpgradeCallBack
                        verifrom.console.log(0,'signalspam_storeLocalParams - upgrade required on DB',arguments);
                        if (typeof upgraded === "undefined" || upgraded!==true)
                            signalspam_storeLocalParams(req, params, true);
                    }
                );
            },
            function() {
                verifrom.console.log(0,"signalspam_storeLocalParams - Error deleting DB",arguments);
            });
    } catch (e) {
        verifrom.console.log(1,"signalspam_storeLocalParams - got Exception",e);
    }
}

function signalspam_loadLocalParams(req, callback, upgraded) {
    try {
        verifrom.indexeddb.open('signalspamParams', 'params'
            , { keyPath: 'params', autoIncrement: false }
            , 1
            , function(event) {
                // onSuccessCallBack
                verifrom.console.log(0,'signalspam_loadLocalParams - DB opened',event);
                verifrom.indexeddb.objectStore.getItem('signalspamParams', 'params',"params",
                    function(params) {
                        verifrom.console.log(0,'signalspam_loadLocalParams - got params',typeof params.result,params.result);
                        if (typeof params.result === "string")
                        {
                            try {
                                params.result = JSON.parse(params.result);
                            } catch(e) {
                                verifrom.console.log(0,'signalspam_loadLocalParams - got exception loading local params',e);
                                callback(undefined);
                            }
                        }
                        callback(params.result);
                    },
                    function() {
                        verifrom.console.log(0,'signalspam_loadLocalParams - got error',arguments);
                        callback(undefined);
                    });
            }
            , function() {
                // onErrorCallBack
                verifrom.console.log(0,'signalspam_loadLocalParams - ERROR opening DB',arguments);
                callback(undefined);
            }
            , function() {
                // onUpgradeCallBack
                verifrom.console.log(0,'signalspam_loadLocalParams - upgrade required on DB',arguments);
                if (typeof upgraded === "undefined" || upgraded!==true)
                    signalspam_loadLocalParams(req, callback, true);
                else callback(undefined);
            }
        );
    } catch(e) {
        verifrom.console.log(0,'signalspam_loadLocalParams - Exception',e);
        callback(undefined);
    }
}

function signalspam_loadParams(callback) {
    verifrom.console.log(1, 'signalspam_loadParams - load from URI');
    // Load JSON parameters file from VERIFROM server
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
                        verifrom.console.log(1, 'signalspam_loadParams - success');
                        if (typeof req.response === 'string') {
                            verifrom.console.log(1, 'JSON parameters not parsed - try to parse it anyway');
                            signalspam_PARAM = JSON.parse(req.response);
                        } else if (typeof req.response === 'object')
                            signalspam_PARAM = req.response;
                        else throw "signalspam_PARAM request replied with unexpected type";
                        signalspam_storeLocalParams(req, signalspam_PARAM);

                        /*store = localforage.createInstance({
                            name: "signalspamParams"
                            });
                        store.setItem("signalspamParams",JSON.stringify(signalspam_PARAM));*/

                        if (typeof callback === 'function')
                            callback(true);
                        break;
                    default:
                        console.error('signalspam_loadParams - Failure for getting extension parameters');
                        signalspam_loadLocalParams(req, function(params){
                            if (typeof params === 'string') {
                                verifrom.console.log(1, 'JSON parameters not parsed - try to parse it anyway');
                                signalspam_PARAM = JSON.parse(params);
                            } else if (typeof params === 'object')
                                signalspam_PARAM = params;
                            else throw "signalspam_PARAM request replied with unexpected type";
                            if (typeof callback === 'function')
                                callback(true);
                        });
                        break;

                        /*store = localforage.createInstance({
                            name: "signalspamParams"
                        });
                        store.getItem("signalspamParams").then(function(storedPARAM){
                            if (storedPARAM && typeof storedPARAM === 'string')
                            {
                                signalspam_PARAM=JSON.parse(storedPARAM);
                                verifrom.console.log(1,'Retrieved configuration parameters from local storage');
                                if (typeof callback==='function')
                                    callback(true);
                            } else {
                                console.error('Failed retrieving params from local storage',signalspam_PARAM,store);
                            }
                        });*/

                        // Fallback to the last saved configuration file or at least local file
                }
            }
        };
        req.send();
    } catch (err) {
        verifrom.console.log(1, 'signalspam_loadParams - Exception including parameters :', err);
        signalspam_loadLocalParams(req, function(params){
            if (typeof params === 'string') {
                verifrom.console.log(1, 'JSON parameters not parsed - try to parse it anyway');
                signalspam_PARAM = JSON.parse(params);
            } else if (typeof params === 'object')
                signalspam_PARAM = params;
            else throw "signalspam_PARAM request replied with unexpected type";
            if (typeof callback === 'function')
                callback(true);
        });
    }
}

function signalspam_checkPartialDisplay() {
    return true;
}

/******************************************************************************
 * Extract links from mail displayed in messagepane
 * @param element, partialExtract
 */

function signalspam_getMailLinks(element, partialExtract) {
    var urlArray = new Array();
    var urlElementsArray = new Array();
    var uniqueUrlArray;
    var uniqueUrlElementsArray;
    var tagsAttrList;
    var tagsAttrPartialList = signalspam_PARAM.TAGSATTRPARTIALLIST_CONST;
    var mailLink = "";
    var originalLink = "";
    var mailLinkScheme = "";

    tagsAttrList = signalspam_PARAM.TAGSATTRLIST_CONST;

    // If the email is partially displayed, we do not include all tags
    if (signalspam_checkPartialDisplay() === true || partialExtract === true) {
        tagsAttrList = tagsAttrPartialList;
        verifrom.console.log(2, 'Message not fully displayed as sender is not approved');
    }
    verifrom.console.log(5, 'search links in ', element);
    if (element) {
        for (var i = 0; i < tagsAttrList.length; i++) {
            for (var j = 1; j < tagsAttrList[i].length; j++) {
                var tagAttr = tagsAttrList[i][0] + "[" + tagsAttrList[i][j] + "]";
                verifrom.console.log(4, 'search for links ' + tagAttr);

                // Search for each tag containing links to external content in the email body
                var linksInElement = element.querySelectorAll(tagAttr);
                for (var k = 0; k < linksInElement.length; k++) {
                    mailLink = linksInElement[k].getAttribute(tagsAttrList[i][j]);
                    originalLink = mailLink;
                    // Extract the URL scheme for link checking when clicked
                    mailLinkScheme = mailLink.trim().match(/([^:]*):.{1,}$/);
                    if (mailLinkScheme)
                        mailLinkScheme = mailLinkScheme[1];
                    else mailLinkScheme = "http";

                    if (mailLink && mailLinkScheme.match(/^https?/i)) {
                        mailLink = mailLink.replace(new RegExp(signalspam_PARAM.ALL_REPLACE_CONST1, signalspam_PARAM.ALL_REPLACE_CONST11), signalspam_PARAM.ALL_REPLACE_CONST2).replace(new RegExp(signalspam_PARAM.ALL_REPLACE_CONST3, signalspam_PARAM.ALL_REPLACE_CONST33), signalspam_PARAM.ALL_REPLACE_CONST4);
                        verifrom.console.log(5, 'link raw                = [' + mailLink + ']');
                        urlArray.push(mailLinkScheme + '://' + mailLink);
                        urlElementsArray.push({url: mailLinkScheme + '://' + mailLink, element: linksInElement[k]});
                        verifrom.console.log(4, 'add Link ', mailLink);
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
        // remove duplicates
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

function signalspam_alertOnPhishingSuspect(emailDOMElement, linksToAlert, elementsToAlert, linksHash, win) {
    verifrom.console.log(2, 'signalspam_alertOnPhishingSuspect - PHISHING detected');
    try {
        var style = emailDOMElement.ownerDocument.createElement("style");
        style.innerHTML = '[' + verifrom.appInfo.extensionName + '-tip] {\
    position: relative;\
    cursor: no-drop;\
    border-bottom: 2px dotted #BE0044;\
    z-index: 2147483647;\
    }\
    \
    [signalspam-tip]:after {\n' +
            '            position: absolute;\n' +
            '            top: 5px;\n' +
            '            left: calc(100% + 1.2em);\n' +
            '            font-size: 1em;\n' +
            '            color: #D70022;\n' +
            '            z-index: 2147483647;\n' +
            '            content: url(data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTQiIGhlaWdodD0iMTQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyIgeG1sbnM6c3ZnPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CiAgPG1ldGFkYXRhIGlkPSJtZXRhZGF0YTQzNDgiPmltYWdlL3N2Zyt4bWw8L21ldGFkYXRhPgogIDxnIGNsYXNzPSJsYXllciI+CiAgICA8dGl0bGU+TGF5ZXIgMTwvdGl0bGU+CiAgICA8ZyBpZD0ic3VyZmFjZTEiIHRyYW5zZm9ybT0ibWF0cml4KDAuMDc4MDY3NzQxNzk5MjU5NjcsMCwwLDAuMDc0ODM1NDEyMTkxMjMxNzMsLTAuMTEzMzEzNDY3NzM0NzIyNjQsOS43ODQxNzQ0MDE0NjY5NTYpICI+CiAgICAgIDxwYXRoIGZpbGw9IiNkNzAwMjIiIGQ9Im05MS4xNDkyOSwtMjAuNDc5MjFsMTIuMjYzMzMsLTE4LjgyOTVsLTI0LjUyNjY1LDBsMTIuMjYzMzIsMTguODI5NSIgaWQ9InBhdGg0Mjk3Ii8+CiAgICAgIDxwYXRoIGZpbGw9IiNkNzAwMjIiIGQ9Im04MC4wOTg5LC00NS44MjU2YzAsMCAtMTUuNzY4MDksMC4xNzg2NCAtMjUuMzc3NzIsLTkuMzE1NWMtOS42MDk2MiwtOS40ODA5MSAtOS40Mjg2OCwtMjUuMDQ4NjYgLTkuNDI4NjgsLTI1LjA0ODY2YzAsMCAxNS43NjEzOSwtMC4xNzg2NCAyNS4zNzc3MSw5LjMwMjI3YzkuNjA5NjIsOS40OTQxNSA5LjQyODY5LDI1LjA2MTg5IDkuNDI4NjksMjUuMDYxODkiIGlkPSJwYXRoNDI5OSIvPgogICAgICA8cGF0aCBmaWxsPSIjZDcwMDIyIiBkPSJtMTAyLjE5OTY5LC00NS44MjU2YzAsMCAxNS43NjEzOSwwLjE3ODY0IDI1LjM3NzcxLC05LjMxNTVjOS42MDk2MiwtOS40ODA5MSA5LjQyMTk5LC0yNS4wNDg2NiA5LjQyMTk5LC0yNS4wNDg2NmMwLDAgLTE1Ljc2ODA5LC0wLjE3ODY0IC0yNS4zNzEwMSw5LjMwMjI3Yy05LjYwOTYzLDkuNDk0MTUgLTkuNDI4NjksMjUuMDYxODkgLTkuNDI4NjksMjUuMDYxODkiIGlkPSJwYXRoNDMwMSIvPgogICAgICA8cGF0aCBmaWxsPSIjZDcwMDIyIiBkPSJtOTEuMzE3OTksLTEuNzQyNThjLTQzLjg4NjYzLDAgLTcxLjE3MjAzLC0xNy44Njk5MiAtNzEuMTcyMDMsLTUxLjkzNjM1YzAsLTM0LjE0NTg0IDQuNjM3MjcsLTQ2LjY0MDMgMjcuOTc3MDcsLTQ2LjQ1MTZjMjAuMDI2NSwwLjE2MTkyIDIxLjA5NzUsMi43NjUxNSAyOS4wMDk3Niw1LjQ3NDczbDE0LjAwOTgsNS45ODA3M2wxNi4yODk5NCwtNS40NDQwOWMwLjIxNDQ0LC0wLjEzMjMyIDguMDQzNTQsLTQuMDQzNjggMjguMzAxNDgsLTQuMDQzNjhjMjMuMzMzODQsMCAyNy44MDE2NywxMC4zMzgwNyAyNy44MDE2Nyw0NC40ODM5MWMwLDM0LjA2NjQzIC0yOC4zMzc3Nyw1MS45MzYzNSAtNzIuMjE3NjksNTEuOTM2MzV6bTg4LjE4NzU2LC01MS45MzYzNWMwLC03LjU0MjM5IC0wLjU1NjIxLC0xNC4xNzE3NSAtMS41NjE0LC0yMC4wMDcxOGwwLjA2MDQsMC4wNzkzOWwwLC00MC4xMzM0MmwtMzkuODEyMjUsMGMtMC44ODQ1NywtMC4wMzk2OSAtMS43NjI0MywtMC4wNjYxNiAtMi42MzM2LC0wLjA2NjE2Yy0xOC44OTc1OCwwIC0zNy45Njk0LDkuMzA4ODkgLTQ0LjQxNjAyLDEyLjc3NTc0Yy02LjQ1MzM3LC0zLjQ2Njg1IC0yNS41MjUxOSwtMTIuNzc1NzQgLTQ0LjQyMjc3LC0xMi43NzU3NGMtMC44NzExNywwIC0xLjc0OTA0LDAuMDI2NDcgLTIuNjMzNiwwLjA2NjE2bC0zOS41NTc2NCwwbDAsMzguOTM1OTFjLTEuMTMyNTIsNi4xMDAwNiAtMS43NjI0NCwxMy4wOTMzMSAtMS43NjI0NCwyMS4xMjUyOWMwLDI4LjE4NDcxIDIwLjg4MTE2LDUyLjUzODY3IDUwLjk0MzA2LDYzLjc5MjcxYy0yLjgyMTIzLDEuODk4ODIgLTQuNjc3NDgsNS4wODc3OSAtNC42Nzc0OCw4LjY5MzU4YzAsNi40MTc2NCA4LjI3NjA2LDIwLjUzNjQ3IDkuNzYzNzUsMjEuMjUxMDFjMC44NzExNiwwLjQ0OTg5IDEuOTU2NzcsMC4xNzIwMSAyLjUyNjM4LC0wLjYwODY5YzAuMzc1MjcsLTAuNTIyNjggMS45NjM0NywtMi45NjQwMiAzLjY5OTEsLTYuMTA2NjljMS45NTY3NywzLjU5OTE3IDMuODUzMjMsNi40MDQ0MSA0LjQ4MzE1LDYuNzE1MzhjMC44ODQ1NiwwLjQ0OTg5IDEuOTYzNDcsMC4xNzIwMSAyLjU0NjQ4LC0wLjYwODY5YzAuMzgxOTcsLTAuNTI5MjkgMS45NjM0NywtMi45NjQwMiAzLjY5OTEsLTYuMTEzMzFjMS45NjM0NywzLjYwNTc5IDMuODY2NjMsNi40MTEwMyA0LjUwMzI2LDYuNzIyYzAuODc3ODYsMC40NDk4OSAxLjk2MzQ3LDAuMTcyMDEgMi41NDY0OCwtMC42MDg2OWMwLjc0Mzg0LC0xLjA2NTE5IDYuNDMzMjIsLTkuOTA0MzUgOC4zNjMxOCwtMTYuNzM4OGMxLjk5MDI4LDYuOTkzMjQgNy44NjA2LDE2Ljc1MjAzIDkuMTAwMzQsMTcuMzQ3NDljMC44NTc3NiwwLjQ0OTg5IDEuOTM2NjYsMC4xNzIwMSAyLjUxMjk2LC0wLjYwODY5YzAuMzgxOTgsLTAuNTIyNjggMS45NzAxOCwtMi45NjQwMiAzLjcwNTgxLC02LjEwNjY5YzEuOTU2NzgsMy41OTkxNyAzLjg1OTkzLDYuNDA0NDEgNC40ODk4NSw2LjcxNTM4YzAuODc3ODcsMC40NDk4OSAxLjk3MDE4LDAuMTcyMDEgMi41Mzk3OSwtMC42MDg2OWMwLjM3NTI3LC0wLjUyOTI5IDEuOTYzNDcsLTIuOTcwNjQgMy43MDU3OSwtNi4xMTMzMWMxLjk1Njc4LDMuNTk5MTggMy44NTk5NCw2LjQxMTAzIDQuNDg5ODUsNi43MjJjMC44OTc5OCwwLjQ0OTg5IDEuOTcwMTgsMC4xNzIwMSAyLjU1MzE5LC0wLjYwODY5YzAuOTE4MDcsLTEuMjgzNTIgOS4wMDY1MSwtMTMuOTAwNDggOS4wMDY1MSwtMjAuNjQyMzJjMCwtMy42MDU3OSAtMS44NTYyNSwtNi44MDEzNyAtNC42ODQxOSwtOC42OTM1OGMzMC4wNTUyLC0xMS4yNjA2NiA1MC45MjI5NiwtMzUuNjE0NjIgNTAuOTIyOTYsLTYzLjc5MjciIGlkPSJwYXRoNDMwMyIvPgogICAgPC9nPgogICAgPHBhdGggZD0ibTE0OS4yNjEyOCwxMTMuNjA1MzdjMC4wMDYsLTAuNDc3OTQgMC4wNzA4LC0wLjYzODQgMC4xNDQyNiwtMC4zNTY1N2MwLjA3MzQsMC4yODE4NCAwLjA2ODYsMC42NzI4OCAtMC4wMTA3LDAuODY4OTljLTAuMDc5NCwwLjE5NjExIC0wLjEzOTQ0LC0wLjAzNDUgLTAuMTMzNTMsLTAuNTEyNDJsLTAuMDAwMDMsMHoiIGlkPSJwYXRoODQxIiB0cmFuc2Zvcm09InNjYWxlKDAuNzUpICIvPgogIDwvZz4KPC9zdmc+);\n' +
            '        }\n' +
            '\n' +
            '        /* on génère un second élément en :before*/\n' +
            '\n' +
            '        [signalspam-tip]:before {\n' +
            '            position: absolute;\n' +
            '            top: 5px;\n' +
            '            left: 101%;\n' +
            '            font-size: 1em;\n' +
            '            color: #D70022;\n' +
            '            z-index: 2147483647;\n' +
            '            content: "⬅";\n' +
            '        }\
    ';

        emailDOMElement.appendChild(style);

        /*var trash_div = emailDOMElement.ownerDocument.createElement('div');
        emailDOMElement.appendChild(trash_div);
        emailDOMElement.removeChild(trash_div);*/
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
        signalspam_showNotification(win);
        signalspam_lastPhishDetected = {
            emailDOMElement: emailDOMElement,
            linksToAlert: linksToAlert,
            elementsToAlert: elementsToAlert,
            linksHash: linksHash
        };
        signalspam_verifromSafeBrowsing.postMessage({
            'event': 'PHISHING_EMAIL_SIDEBAR',
            'eventDetail': extensionConfig.appInfo.environment,
            'links': linksToAlert
        }, {channel: "PhishingDetection"});
    } catch (e) {
        verifrom.console.error(2, 'Exception displaying phishing alert', e);
    }
}

/**************************************************
 * signalspam_startMailCheck
 * @param emailDOMElement
 */
function signalspam_startMailCheck(emailDOMElement, win) {
    var phishingAlert = false;
    var linksToAlert = [];
    var elementsToAlert = [];
    var linksHash = [];


    var id = signalspam_lastCheckId = Date.now();

    // function will be called if an email is displayed (caller : checkMailIsDisplayed)
    // get clicable links
    verifrom.console.log(3, 'signalspam_startMailCheck - get links');
    var mailLinks = signalspam_getMailLinks(emailDOMElement, true);

    verifrom.console.log(3, 'got links');
    signalspam_checkHostPathCombination(mailLinks.urlArray, id,
        function onSuspect(message) {
            if (message.id < signalspam_lastCheckId)
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
                verifrom.console.log(4, "URL : " + mailLinks.urlArray[i] + " phishing");
            }
            mailLinks = null;
            signalspam_alertOnPhishingSuspect(emailDOMElement, linksToAlert, elementsToAlert, linksHash, win);
        }
    );
}

function signalspam_checkHostPathCombination(mailLinks, id, onSuspectCallback) {
    verifrom.console.log(3, 'signalspam_checkHostPathCombination');
    signalspam_verifromSafeBrowsing.addListener("signalspam_checkHostPathCombination", function (message) {
        if (message.phishingAlert === true) {
            verifrom.console.log(2, 'signalspam_checkHostPathCombination - suspect email');
            onSuspectCallback(message);
        } else mailLinks = null;
    });
    verifrom.console.log(3, 'signalspam_checkHostPathCombination - post message to VSB worker');
    signalspam_verifromSafeBrowsing.postMessage({mailLinks: mailLinks, id: id}, {"channel": "signalspam_checkHostPathCombination"});
}

function signalspam_confirmMultipleReports(messages) {
    if (!messages || messages.length <= 0)
        return;

    var reportEmails = function (oneClickMode) {
        signalspam_showProgressBar(true);
        progressView = signalspam_showView("signalspamSendingReports", true);
        var progressMeter = progressView.querySelector("#signalspamReportsProgress");
        progressMeter.max = messages.length;
        progressMeter.value = 0;
        var reportsToSend = messages.length;
        var reportsSent = 0;
        var reportsInerror = 0;
        var authenticationError = false;
        var allReportsSent = function () {
            if (reportsInerror === 0) {
                var viewOK = signalspam_showView("signalspamMultipleReportsSent", true);
                if (extensionConfig.appInfo.extensionName==="spambee")
                    viewOK.querySelector("#signalspamWillNotifyMultiple").hidden = !willNotifyUser;
                viewOK.onclick = signalspam_closeSidebar;
                if (signalspam_prefs && signalspam_prefs.getBoolPref("extensions.signalspam.oneclick")==true) {
                    setTimeout(viewOK.onclick,1500);
                    return;
                }
            } else {
                var viewError = signalspam_showView("signalspamMultipleReportsFailed", true);
                var errorsNumber = viewError.querySelector("#failureNumber");
                var successNumber = viewError.querySelector("#successNumber");
                errorsNumber.value = reportsInerror;
                successNumber.value = reportsSent;
                if (authenticationError === 401) {
                    var reason = viewError.querySelector("#signalspamFailureReason", view);
                    if (reason) {
                        let bundle = Services.strings.createBundle("chrome://signalspam/locale/signalspam.properties");
                        reason.value = bundle.GetStringFromName("signalspam.contentScript.reportStatus.invalidpassword");
                    }
                    signalspam_openPreferences();
                } else if (authenticationError === 403) {
                    var reason = viewError.querySelector("#signalspamFailureReason", view);
                    if (reason) {
                        let bundle = Services.strings.createBundle("chrome://signalspam/locale/signalspam.properties");
                        reason.value = bundle.GetStringFromName("signalspam.contentScript.reportStatus.error403");
                    }
                    signalspam_openPreferences();
                }
                viewError.onclick = signalspam_closeSidebar;
            }
            signalspam_showProgressBar(false);
        };
        for (var i = 0; i < messages.length; i++) {
            signalspam_markAsSpam(messages[i].msg, messages[i].folder, function () {
                var message = this;
                signalspam_sendToServer(message.eml, message.folder, message.msg, notificationChoice ? notificationChoice.checked : null, dataprivacyChoice ? dataprivacyChoice.checked : null
                    , function (reportResponse) {
                        var message = this;
                        reportsToSend--;
                        reportsSent++;
                        progressMeter.value = reportsSent;
                        if (reportsToSend === 0)
                            allReportsSent();
                        if (extensionConfig.appInfo.extensionName==="spambee") {
                            var reportToStore = {
                                "sender": message.sender,
                                "subject": message.subject,
                                "webmail": verifrom.appInfo.extensionName,
                                "reportId": Date.now(),
                                "feedbackRequested": notificationChoice.checked,
                                "privacy": dataprivacyChoice.checked
                            };
                            verifrom.console.log(4, 'signalspam_confirmMultipleReports - report send - success callback', reportToStore);
                            signalspam_verifromSafeBrowsing.postMessage(
                                {
                                    uid: reportResponse.content.uuid,
                                    report: reportToStore
                                }
                                , {channel: "addReport"}
                            );
                        }
                    }.bind(message)
                    , function (failureCode) {
                        reportsToSend--;
                        reportsInerror++;
                        progressMeter.value = reportsSent;
                        if (reportsToSend === 0)
                            allReportsSent();
                        if ((failureCode === 401 || failureCode === 403) && extensionConfig.appInfo.extensionCodeName==="SIGNALSPAM") {
                            authenticationError = failureCode;
                        }
                    }
                );
            }.bind(messages[i]));
        }
    };

    if (signalspam_prefs && signalspam_prefs.getBoolPref("extensions.signalspam.oneclick")==true) {
        //reportEmails(true);
        signalspam_showProgressBar(true);
        let reportsToSend = messages.length;
        let reportsSent = 0;
        let reportsInerror = 0;
        let authenticationError = false;
        let allReportsSent = function () {
            if (reportsInerror !== 0) {
                var viewError = signalspam_showView("signalspamMultipleReportsFailed", true);
                var errorsNumber = viewError.querySelector("#failureNumber");
                var successNumber = viewError.querySelector("#successNumber");
                errorsNumber.value = reportsInerror;
                successNumber.value = reportsSent;
                if (authenticationError === 401) {
                    var reason = viewError.querySelector("#signalspamFailureReason", view);
                    if (reason) {
                        let bundle = Services.strings.createBundle("chrome://signalspam/locale/signalspam.properties");
                        reason.value = bundle.GetStringFromName("signalspam.contentScript.reportStatus.invalidpassword");
                    }
                    signalspam_openPreferences();
                } else if (authenticationError === 403) {
                    var reason = viewError.querySelector("#signalspamFailureReason", view);
                    if (reason) {
                        let bundle = Services.strings.createBundle("chrome://signalspam/locale/signalspam.properties");
                        reason.value = bundle.GetStringFromName("signalspam.contentScript.reportStatus.error403");
                    }
                    signalspam_openPreferences();
                }
                viewError.onclick = signalspam_closeSidebar;
            }
            signalspam_showProgressBar(false);
        };
        for (var i = 0; i < messages.length; i++) {
            signalspam_markAsSpam(messages[i].msg, messages[i].folder, function () {
                var message = this;
                signalspam_sendToServer(message.eml, message.folder, message.msg, notificationChoice ? notificationChoice.checked : null, dataprivacyChoice ? dataprivacyChoice.checked : null
                    , function (reportResponse) {
                        var message = this;
                        reportsToSend--;
                        reportsSent++;
                        if (reportsToSend === 0)
                            allReportsSent();
                        if (extensionConfig.appInfo.extensionName==="spambee") {
                            var reportToStore = {
                                "sender": message.sender,
                                "subject": message.subject,
                                "webmail": verifrom.appInfo.extensionName,
                                "reportId": Date.now(),
                                "feedbackRequested": notificationChoice.checked,
                                "privacy": dataprivacyChoice.checked
                            };
                            verifrom.console.log(4, 'signalspam_confirmMultipleReports - report send - success callback', reportToStore);
                            signalspam_verifromSafeBrowsing.postMessage(
                                {
                                    uid: reportResponse.content.uuid,
                                    report: reportToStore
                                }
                                , {channel: "addReport"}
                            );
                        }
                    }.bind(message)
                    , function (failureCode) {
                        reportsToSend--;
                        reportsInerror++;
                        if (reportsToSend === 0)
                            allReportsSent();
                        if ((failureCode === 401 || failureCode === 403) && extensionConfig.appInfo.extensionCodeName==="SIGNALSPAM") {
                            authenticationError = failureCode;
                        }
                    }
                );
            }.bind(messages[i]));
        }
        return;
    }

    var view = signalspam_showView("signalspamReportMultipleEmails");
    var reportsNumber = view.querySelector("#signalspamReportsNumber");
    var reportsNumber2 = view.querySelector("#signalspamReportsNumber2");
    reportsNumber.textContent = reportsNumber2.textContent;
    reportsNumber.textContent = reportsNumber.textContent.replace("__VFSELECTEDMAILS__", messages.length);

    if (extensionConfig.appInfo.extensionName==="spambee") {
        var notification = signalspam_prefs.getBoolPref("extensions.signalspam.notification");
        var notificationChoice = view.querySelector("#feedback2");
        notificationChoice.checked = notification;
        var willNotifyUser = notification;
        var dataprivacy = signalspam_prefs.getBoolPref("extensions.signalspam.privacy");
        var dataprivacyChoice = view.querySelector("#dataprivacy2");
        dataprivacyChoice.checked = dataprivacy;
    }

    var reportsToSend = messages.length;

    var clickToView = view.querySelector("#zoomOriginalEmail");
    var clickToReport = view.querySelector(".SPOKBox");
    clickToReport.onclick = reportEmails
    clickToView.onclick = function () {
        var multipleEmlView = signalspam_showView("signalspamViewMultipleMails", false);
        verifrom.console.log(4, 'signalspam_confirmMultipleReports - click to open raw mail content');
        var currentEml = 1;
        multipleEmlView.querySelector("#signalspamNDisplay").value = currentEml;
        multipleEmlView.querySelector("#signalspamNEmls").value = messages.length;
        var description = multipleEmlView.querySelector("#signalspamEmlContent");
        description.textContent = signalspam_cutEml(messages[currentEml - 1].eml);
        var prevEmlButton = multipleEmlView.querySelector("#signalspamPrevEml");
        var nextEmlButton = multipleEmlView.querySelector("#signalspamNextEml");
        prevEmlButton.onclick = function () {
            if (currentEml <= 1)
                return;
            currentEml--;
            description.textContent = signalspam_cutEml(messages[currentEml - 1].eml);
            multipleEmlView.querySelector("#signalspamNDisplay").value = currentEml;
        };
        nextEmlButton.onclick = function () {
            if (currentEml >= messages.length)
                return;
            currentEml++;
            description.textContent = signalspam_cutEml(messages[currentEml - 1].eml);
            multipleEmlView.querySelector("#signalspamNDisplay").value = currentEml;
        };
    };
}

function signalspam_confirmSingleReport(message) {
    /*
    "eml":eml,
    "msg":selectedMessage,
    "sender":sender,
    "subject":subject,
    "folder":folder */
    if (!message)
        return;


    if (signalspam_prefs && signalspam_prefs.getBoolPref("extensions.signalspam.oneclick")==true) {
        signalspam_showProgressBar(true);
        signalspam_markAsSpam(message.msg, message.folder, function () {
            signalspam_sendToServer(message.eml, message.folder, message.msg, notificationChoice ? notificationChoice.checked : null, dataprivacyChoice ? dataprivacyChoice.checked : null
                , function (reportResponse) {
                    if (extensionConfig.appInfo.extensionName==="spambee") {
                        reportToStore = {
                            "sender": message.sender,
                            "subject": message.subject,
                            "webmail": verifrom.appInfo.extensionName,
                            "reportId": Date.now(),
                            "feedbackRequested": notificationChoice.checked,
                            "privacy": dataprivacyChoice.checked
                        };
                        signalspam_verifromSafeBrowsing.postMessage(
                            {
                                uid: reportResponse.content.uuid,
                                report: reportToStore
                            }
                            , {channel: "addReport"}
                        );
                    }
                    signalspam_showProgressBar(false);
                }
                , function (failureCode) {
                    var view = signalspam_showView("signalspamSingleReportFailed", true);
                    view.onclick = signalspam_closeSidebar;
                    var reason = document.querySelector("#signalspamFailureReason", view);
                    if (failureCode === 401 && extensionConfig.appInfo.extensionCodeName==="SIGNALSPAM") {
                        if (reason) {
                            let bundle = Services.strings.createBundle("chrome://signalspam/locale/signalspam.properties");
                            reason.value = bundle.GetStringFromName("signalspam.contentScript.reportStatus.invalidpassword");
                        }
                        signalspam_openPreferences();
                    } else if (failureCode === 403 && extensionConfig.appInfo.extensionCodeName==="SIGNALSPAM") {
                        if (reason) {
                            let bundle = Services.strings.createBundle("chrome://signalspam/locale/signalspam.properties");
                            reason.value = bundle.GetStringFromName("signalspam.contentScript.reportStatus.error403");
                        }
                        signalspam_openPreferences();
                    } else if (reason)
                        reason.value = failureCode;
                    signalspam_showProgressBar(false);
                }
            );
        }.bind(this));
        return;
    }

    let reportEmail = function () {
        signalspam_showProgressBar(true);
        signalspam_markAsSpam(message.msg, message.folder, function () {
            signalspam_showView("signalspamSendingSingleReport", true);
            signalspam_sendToServer(message.eml, message.folder, message.msg, notificationChoice ? notificationChoice.checked : null, dataprivacyChoice ? dataprivacyChoice.checked : null
                , function (reportResponse) {
                    var view = signalspam_showView("signalspamSingleReportSent", true);
                    if (extensionConfig.appInfo.extensionName==="spambee")
                    {
                        view.querySelector("#signalspamWillNotify").hidden = !willNotifyUser;
                    }
                    view.onclick = signalspam_closeSidebar;

                    if (signalspam_prefs && signalspam_prefs.getBoolPref("extensions.signalspam.oneclick")==true) {
                        setTimeout(view.onclick,1500);
                        return;
                    }

                    if (extensionConfig.appInfo.extensionName==="spambee") {
                        reportToStore = {
                            "sender": message.sender,
                            "subject": message.subject,
                            "webmail": verifrom.appInfo.extensionName,
                            "reportId": Date.now(),
                            "feedbackRequested": notificationChoice.checked,
                            "privacy": dataprivacyChoice.checked
                        };
                        signalspam_verifromSafeBrowsing.postMessage(
                            {
                                uid: reportResponse.content.uuid,
                                report: reportToStore
                            }
                            , {channel: "addReport"}
                        );
                    }
                    signalspam_showProgressBar(false);
                }
                , function (failureCode) {
                    var view = signalspam_showView("signalspamSingleReportFailed", true);
                    view.onclick = signalspam_closeSidebar;
                    var reason = document.querySelector("#signalspamFailureReason", view);
                    if (failureCode === 401 && extensionConfig.appInfo.extensionCodeName==="SIGNALSPAM") {
                        if (reason) {
                            let bundle = Services.strings.createBundle("chrome://signalspam/locale/signalspam.properties");
                            reason.value = bundle.GetStringFromName("signalspam.contentScript.reportStatus.invalidpassword");
                        }
                        signalspam_openPreferences();
                    } else if (failureCode === 403 && extensionConfig.appInfo.extensionCodeName==="SIGNALSPAM") {
                        if (reason) {
                            let bundle = Services.strings.createBundle("chrome://signalspam/locale/signalspam.properties");
                            reason.value = bundle.GetStringFromName("signalspam.contentScript.reportStatus.error403");
                        }
                        signalspam_openPreferences();
                    } else if (reason)
                        reason.value = failureCode;
                    signalspam_showProgressBar(false);
                }
            );
        }.bind(this));
    };

    try {
        var view = signalspam_showView("signalspamSingleReport");
        var fromvalue = document.querySelector("#fromvalue", view);
        var emailsubject = document.querySelector("#emailsubject", view);
        fromvalue.value = message.sender;
        emailsubject.value = message.subject;

        if (extensionConfig.appInfo.extensionName==="spambee") {
            var notification = signalspam_prefs.getBoolPref("extensions.signalspam.notification");
            var notificationChoice = document.querySelector("#feedback", view);
            var willNotifyUser = notification;
            notificationChoice.checked = notification;
            var dataprivacy = signalspam_prefs.getBoolPref("extensions.signalspam.privacy");
            var dataprivacyChoice = document.querySelector("#dataprivacy", view);
            dataprivacyChoice.checked = dataprivacy;
        }

        var clickToView = document.querySelector("#zoomOriginalEmail", view);
        clickToView.onclick = function () {
            signalspam_showView("signalspamViewSingleMail", false);
            verifrom.console.log(4, 'signalspam_confirmSingleReport - click to open raw mail content');
            var description = document.querySelector("#signalspamViewSingleMail>vbox>description");
            description.textContent = signalspam_cutEml(message.eml);
        };
        var clickToReport = document.querySelector(".SPOKBox", view);
        clickToReport.onclick = reportEmail;
    } catch(e) {
        signalspam_showProgressBar(false);
    }
}

function signalspam_cutEml(bodyToDisplay) {
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

function signalspam_markAsSpam(selectedMessage, messageFolder, callback) {
    try {
        if (typeof selectedMessage.setStringProperty === 'function' && typeof selectedMessage.folder !== 'undefined') {

            //var aMsgHdr=selectedMessage.folder.msgDatabase.GetMsgHdrForKey(selectedMessage.messageKey);

            var aJunkMsgHdrs = Components.classes["@mozilla.org/array;1"]
                .createInstance(Components.interfaces.nsIMutableArray);
            /*var aGoodMsgHdrs = Components.classes["@mozilla.org/array;1"]
             .createInstance(Components.interfaces.nsIMutableArray);*/
            aJunkMsgHdrs.appendElement(selectedMessage, false);

            try {
                var markAsReadOnSpam = signalspam_prefs.getBoolPref("mail.spam.markAsReadOnSpam");
                if (markAsReadOnSpam === true) {
                    selectedMessage.markRead(true);
                    selectedMessage.folder.markMessagesRead(aJunkMsgHdrs, true);
                    //selectedMessage.folder.msgDatabase.MarkRead(selectedMessage.messageKey,true,null);
                    //selectedMessage.folder.msgDatabase.MarkHdrRead (selectedMessage, true, null);
                    //selectedMessage.folder.msgDatabase.Commit(Components.interfaces.nsMsgDBCommitType.kSessionCommit);
                }

                var nsIJunkMailPlugin = Components.interfaces.nsIJunkMailPlugin;
                if (nsIJunkMailPlugin && typeof nsIJunkMailPlugin.IS_SPAM_SCORE !== 'undefined' && selectedMessage.folder && selectedMessage.folder.msgDatabase) {
                    selectedMessage.setStringProperty("junkscore", nsIJunkMailPlugin.IS_SPAM_SCORE);
                    selectedMessage.setStringProperty('junkpercent', '100');
                    selectedMessage.setStringProperty("junkscoreorigin", "user");
                    //selectedMessage.folder.msgDatabase.setStringPropertyByHdr(selectedMessage,"junkscore", nsIJunkMailPlugin.IS_SPAM_SCORE);
                    //selectedMessage.folder.msgDatabase.setStringPropertyByHdr(selectedMessage,'junkpercent', '100');
                    //selectedMessage.folder.msgDatabase.setStringPropertyByHdr(selectedMessage,"junkscoreorigin", "user");
                    selectedMessage.folder.setJunkScoreForMessages(aJunkMsgHdrs, nsIJunkMailPlugin.IS_SPAM_SCORE);
                    //selectedMessage.folder.msgDatabase.Commit(Components.interfaces.nsMsgDBCommitType.kSessionCommit);
                }
                selectedMessage.folder.msgDatabase.updateHdrInCache(selectedMessage.folder.URI, selectedMessage, false);
            } catch (e) {
                verifrom.console.error(0, 'signalspam_markAsSpam - Exception trying to apply new properties', e);
            }

            if (signalspam_prefs.getBoolPref("extensions.signalspam.movereport") === true) {
                var manualMark = signalspam_prefs.getBoolPref("mail.spam.manualMark");
                var manualMarkMode = signalspam_prefs.getIntPref("mail.spam.manualMarkMode");
                if (manualMark === true) {
                    var destFolder;
                    //Components.utils.import("resource:///modules/mailServices.js");
                    var copyService = Components.classes["@mozilla.org/messenger/messagecopyservice;1"].getService(Components.interfaces.nsIMsgCopyService);

                    if (manualMarkMode !== 1) // Move to Spam folder
                    {
                        destFolder = signalspam_findJunkFolder(selectedMessage.folder.rootFolder);
                        if (!destFolder) // POP3 probably...
                            destFolder = signalspam_findTrashFolder(selectedMessage.folder.rootFolder); // move to Trash
                    } else if (manualMarkMode === 1) {
                        destFolder = signalspam_findTrashFolder(selectedMessage.folder.rootFolder);
                    }
                    if (destFolder && destFolder !== selectedMessage.folder) {
                        verifrom.console.log(4, 'signalspam_markAsSpam - move message into junk folder');
                        /*var listen = {
                            OnStartCopy: function () {
                                verifrom.console.log(4,"OnStartCopy",arguments)
                            },
                            OnStopCopy: function () {
                                verifrom.console.log(4,"OnStopCopy",arguments);
                            },
                            OnProgress: function () {
                                verifrom.console.log(4,"OnProgress",arguments)
                            }
                        };*/

                        copyService.CopyMessages(selectedMessage.folder, aJunkMsgHdrs, destFolder, true, null, msgWindow, true);
                    } else verifrom.console.log(2, 'signalspam_markAsSpam - destFolder not found or the same as current message folder');
                    copyService = null;
                    destFolder = null;
                }
            }
            aJunkMsgHdrs = null;

            /*var messageClassifier=new MessageClassifier(selectedMessage.folder,1);
             var aSpamSettings=selectedMessage.folder.server.spamSettings;
             messageClassifier.analyzeMessage(selectedMessage, aSpamSettings);*/

            //performActionsOnJunkMsgs(selectedMessage.folder, aJunkMsgHdrs, aGoodMsgHdrs);*/
        } else {
            verifrom.console.log(4, 'signalspam_markAsSpam - selectedMessage is not a message object => no action');
        }
    } catch (e) {
        verifrom.console.error(0, 'signalspam_markAsSpam - Exception', e);
    } finally {
        callback();
    }
}

function signalspam_channelObject(folder, selectedMessage, callback, sender, subject, recipients) {
    this.messagesSrc = "";
    this.folder = folder;
    this.selectedMessage = selectedMessage;
    this.sender = sender;
    this.subject = subject;
    this.recipients = recipients;
    this.context = undefined;
    this.onDataAvailable = function (request, inputStream, offset, count) {
        try {
            verifrom.console.log(4, "signalspam_channelObject - onDataAvailable",arguments);
            var inStream = Components.classes["@mozilla.org/scriptableinputstream;1"].createInstance(Components.interfaces.nsIScriptableInputStream);
            inStream.init(inputStream);
            //this.context.QueryInterface(Components.interfaces.nsISupportsString);
            this.messagesSrc += inStream.read(count);
        } catch(e) {
            verifrom.console.error(0, "signalspam_channelObject - onDataAvailable - Exception",e);
        }
    };

    this.onStartRequest = function (request, context) {
        verifrom.console.log(4, "signalspam_channelObject - onStartRequest",arguments);
            //this.context.QueryInterface(Components.interfaces.nsISupportsString);
            //this.messagesSrc = "";
    };

    this.onStopRequest = function (request, statusCode) {
        verifrom.console.log(4, "signalspam_channelObject - onStopRequest",arguments);

        if (statusCode != Components.results.NS_OK) {
            verifrom.console.error(1, "Message content retrieving error", statusCode);
            callback(null);
            return 0;
        }
        //context.QueryInterface(Components.interfaces.nsISupportsString);
        callback(this.messagesSrc, this.selectedMessage, this.sender, this.subject, this.folder, this.recipients);
        /*signalspam_markAsSpam(selectedMessage,this.folder,function(){
            signalspam_sendToServer(this.messagesSrc[context.data], this.folder, this.selectedMessage);
        }.bind(this));*/
    };
}

function signalspam_anonymizeMailHeader(header) {
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
            //TODO: optimize to have a single RegEx for all headers
            for (var i = 0; i < headersToReplace.length; i++) {
                var re = new RegExp("(^" + headersToReplace[i] + ":\\s{1,})(.*)$", "img");
                if (!headerLine.match(re))
                    continue;
                var headerValue = headerLine.replace(re, '$2');
                headerValue = headerValue.split(',');
                for (var j = 0; j < headerValue.length; j++) {
                    var re2 = /(([^<]+)<)*(([\s\w\.#\$%&'\*\+-\/=\?\^_`\{\|\}~!"]+)@([^>]*))>?/gi;
                    // /(?<prefix>(?<name>[^<]+)<)*(?<email>(?<id>[\s\w\.#\$%&'\*\+-\/=\?\^_`\{\|\}~!"]+)@(?<domain>[^>]*))>?/gi;
                    // (([^<]+)<)*(([\s\w\.#\$%&'\*\+-\/=\?\^_`\{\|\}~!"]+)@([^>]*))>?
                    // /(?<prefix>(?<name>[^<]+)<)*(?<email>(?<id>[\s\w\.#\$%&'\*\+-\/=\?\^_`\{\|\}~!"]+)@(?<domain>(?<host>[^\.>]{1,})\.(?<tld>\.?[^\.>]+)+))>?/gi;
                    /*/(?<all>(?<name>[\w\.\#\$\%\&\'\*\+\-\/\=\?\^\_\`\{\|\}\~\!\"]+)\@(?<domain>[^\.]+(?<tld>\.\w+){1,}))/gim;*/
                    /* /\s*<{0,1}\s*([^@<]{1,}\@[^>]*)>{0,1}\s*$/gim; */
                    var mailAddress = re2.exec(headerValue[j].trim()); //.replace(re2,'$1');
                    if (mailAddress && mailAddress.length === 6) {
                        if (mailAddress[3] && mailAddress[3].length > 0)
                            emailAddresses.push(mailAddress[3]);
                        if (mailAddress[2] && mailAddress[2].length > 0) {
                            try {
                                names.push.apply(names, mailAddress[2].trim().toLowerCase().split(/\s+/g).filter(function (a) {
                                    return a.length > 0
                                }));
                            } catch (e) {
                                verifrom.console.log(4, 'signalspam_anonymizeMailHeader - exception', e);
                            }
                        }
                    }
                }
                //headerLine=headerLine.replace(re,'$1'+signalspam_PARAM.UNDISCLOSED_RECIPIENT);
            }
            headers[k] = headerLine;
        }
        verifrom.console.log(4, 'signalspam_anonymizeMailHeader - Found addresses=', emailAddresses);
        headers = header.split('\n');
        if (emailAddresses.length > 0) {
            emailAddresses = Array.from(new Set(emailAddresses));
            for (var i = 0; i < emailAddresses.length; i++) {
                for (var k = 0; k < headers.length; k++) {
                    var headerLine = headers[k];
                    if (headerLine.length < emailAddresses[i].length) {
                        continue;
                    }
                    headers[k] = headers[k].split(emailAddresses[i]).join(signalspam_PARAM.UNDISCLOSED_RECIPIENT || "UNDISCLOSED_RECIPIENT@UNDISCLOSEDDOMAIN.TLD");
                }
            }
        }
        try {
            if (names.length > 0) {
                names = Array.from(new Set(names));
                for (var i = 0; i < names.length; i++) {
                    if (names[i].length < (signalspam_PARAM.MINIMUM_NAME_LENGTH || 3))
                        continue;
                    for (var k = 0; k < headers.length; k++) {
                        var headerLine = headers[k];
                        if (headerLine.length < names[i].length) {
                            continue;
                        }
                        headers[k] = headers[k].replace(new RegExp("\\b" + names[i] + "\\b", 'gim'), signalspam_PARAM.UNDISCLOSED_NAME || "UNDISCLOSED");
                    }
                }
            }
        } catch (e) {
            verifrom.console.log(4, 'signalspam_anonymizeMailHeader - exception', e);
        }
    } catch (e) {
        headers = header.split('\n');
        verifrom.console.log(4, 'signalspam_anonymizeMailHeader - exception', e);
    }
    return headers.join("\n");
}

function signalspam_reportEmail(cause, selectedMessagesParam, selectedMessageUrisParam) {
    verifrom.console.log(4, 'signalspam_reportEmail', gFolderDisplay);


    if (signalspam_PARAM && signalspam_PARAM.OPTIONS && signalspam_PARAM.OPTIONS.REPORT_USERACCOUNT_REQUIRED_ENABLED && signalspam_prefs.getBoolPref("extensions.signalspam.userauthentified") !== true) {
        verifrom.console.log(2, 'do_cmd_signalspamPreferences', arguments);
        signalspam_openPreferences("error");
        return;
    }

    try {
        var vSelectedMessages = selectedMessageUrisParam || gFolderDisplay.selectedMessageUris;
        if (vSelectedMessages.length == 0)
            return;

        var oSelectedMessages = selectedMessagesParam || gFolderDisplay.selectedMessages;

        //Components.interfaces.nsMsgFolderFlags.Junk & gFolderDisplay.displayedFolder.flags
        signalspam_showProgressBar(true);

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
                if (extensionConfig.appInfo.extensionName==="spambee")
                    eml = signalspam_anonymizeMailHeader(eml);
                retrievedMessages.push({
                    "eml": eml,
                    "msg": selectedMessage,
                    "sender": sender,
                    "subject": subject,
                    "folder": folder
                });
            }
            if (!messagesToRetrieve) {
                // all messages retrieved
                signalspam_showProgressBar(false);
                if (retrievedMessages.length === 1)
                    signalspam_confirmSingleReport(retrievedMessages[0]);
                else signalspam_confirmMultipleReports(retrievedMessages);
            }
        };


        //vSelectedMessages.forEach(function(selectedMessage) {
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
//                var channel = ioService.newChannelFromURI(realUri); //,null,null,null);
                var channel = ioService.newChannelFromURI(realUri,null, Services.scriptSecurityManager.getSystemPrincipal(),null, Components.interfaces.nsILoadInfo.SEC_ALLOW_CROSS_ORIGIN_DATA_IS_NULL,Components.interfaces.nsIContentPolicy.TYPE_OTHER);
                var nsStr = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
                nsStr.data = selectedMessage;
                var channelInstance = new signalspam_channelObject(folder, (signalspam_prefs.getBoolPref("extensions.signalspam.movereport") === true && cause !== 'hdrJunkButton') ? selectedMessage : {messageKey: selectedMessage.messageKey}, handleRawMail, sender, subject, recipients);
                channel.asyncOpen(channelInstance, nsStr);
            } catch (e) {
                verifrom.console.error(0, 'Exception 1 getting emails', e);
                continue;
            }
        }
    } catch (e) {
        verifrom.console.error(0, 'Exception 2 getting emails', e);
        signalspam_showProgressBar(false);
    }
}

function signalspam_sendToServer(data, folder, messageObject, notificationChoice, privacyChoice, onSuccessCallback, onFailureCallback) {
    //signalspam_showProgressBar(false);
    try {
        verifrom.console.log(4, 'signalspam_sendToServer');
        if (messageObject)
            verifrom.console.log(4, 'Message to report and move : (' + messageObject.messageKey + ') ' + messageObject.subject + ' move ?' + (folder !== 1 ? true : false));
        var password = null;
        var userid = null;
        if (signalspam_PARAM && signalspam_PARAM.OPTIONS && signalspam_PARAM.OPTIONS.REPORT_USERACCOUNT_REQUIRED_ENABLED === true) {
            userid = signalspam_prefs.getCharPref("extensions.signalspam.userid");
            var loginInfo = verifrom.credentials.get(userid);
            password = loginInfo.password;
        }
        signalspam_verifromSafeBrowsing.addListener("PayloadPosted" + messageObject.messageKey, signalspam_handleReportResponse.bind({
            onSuccessCallback: onSuccessCallback,
            onFailureCallback: onFailureCallback
        }));
        signalspam_verifromSafeBrowsing.postMessage({
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
        signalspam_showProgressBar(false);
        onFailureCallback("Exception");
        verifrom.console.error(0, 'Exception posting emails', e);
    }
}

function signalspam_findJunkFolder(rootFolder) {
    return rootFolder.getFolderWithFlags(Components.interfaces.nsMsgFolderFlags.Junk);
}

function signalspam_findTrashFolder(rootFolder) {
    return rootFolder.getFolderWithFlags(Components.interfaces.nsMsgFolderFlags.Trash);
}

function signalspam_handleReportResponse(message)
//signalspam_handleReportResponse.bind(null,messageObject,onSuccessCallback,onFailureCallback,notificationChoice,privacyChoice);
{
    signalspam_verifromSafeBrowsing.removeListener("PayloadPosted" + message.key)
    switch (message.response) {
        case 200:
        case 201:
        case 202:
            verifrom.console.log(2, 'signalspam_handleReportResponse - report posted to server');
            if (this && "function" === typeof this.onSuccessCallback)
                this.onSuccessCallback(message);
            break;
        default:
            verifrom.console.error(1, 'signalspam_handleReportResponse - report was not posted to server', message);
            if (this && "function" === typeof this.onFailureCallback)
                this.onFailureCallback(message.response);
            break;
    }
}

function signalspam_reportFalsePositive(command) {
    verifrom.console.log(1, 'signalspam_reportFalsePositive - command', command);
    signalspam_hideNotifications();
    if (!signalspam_lastPhishDetected) {
        verifrom.console.log(1, 'signalspam_reportFalsePositive - signalspam_lastPhishDetected is null');
        return;
    }
    signalspam_showProgressBar(true);
    var elementsToAlert = signalspam_lastPhishDetected.elementsToAlert;
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
    // send falsePositiveReport message to safe browsing worker
    signalspam_verifromSafeBrowsing.postMessage({
        'phishingLinks': signalspam_lastPhishDetected.linksToAlert,
        'phishingHashes': signalspam_lastPhishDetected.linksHash
    }, {"channel": "falsePositiveReport"});
    signalspam_showProgressBar(false);
}

/******************************************************************************
 * Event handler when a message is loaded in messagepane
 * @param event
 */
function signalspam_onMessageLoadHandler(event) {
    verifrom.console.log(2, 'signalspam_onMessageLoadHandler');
    var doc = event.originalTarget;  // doc is document that triggered "onload" event
    signalspam_startMailCheck(doc.body, this);
    event.originalTarget.defaultView.addEventListener("unload", signalspam_onMessageUnloadHandler, true);
}

/******************************************************************************
 * Event handler when a message is unloaded from messagepane
 * @param event
 */
function signalspam_onMessageUnloadHandler(event) {
    event.originalTarget.defaultView.removeEventListener("unload", signalspam_onMessageUnloadHandler, true);
    verifrom.console.log(4, 'signalspam_onMessageUnloadHandler', event);
    signalspam_hideNotifications(this);
    signalspam_lastPhishDetected = null;
}

function signalspam_emailInspector(doc, win, handler) {
    this.doc = doc || document;
    this.win = win || window;
    this.handler = handler || signalspam_onMessageLoadHandler;
    this.listener1 = false;
    this.listener2 = false;

    this.start = function () {
        verifrom.console.log(4, 'signalspam_emailInspector - start', this);
        var appcontent = this.doc.getElementById("appcontent"); // browser app content
        if (appcontent && !this.listener1) {
            appcontent.addEventListener("OMContentLoaded", this.handler, true);
            this.listener1 = true;
        }
        var messagepane = this.doc.getElementById("messagepane"); // thunderbird message pane
        if (messagepane && !this.listener2) {
            messagepane.addEventListener("load", this.handler, true);
            this.listener2 = true;
        }
    };
    this.stop = function () {
        verifrom.console.log(4, 'signalspam_emailInspector - stop', this);
        var appcontent = this.doc.getElementById("appcontent"); // browser app content
        if (appcontent && this.listener1) {
            appcontent.removeEventListener("OMContentLoaded", this.handler, true);
            this.listener1 = false;
        }
        var messagepane = this.doc.getElementById("messagepane"); // thunderbird message pane
        if (messagepane && this.listener2) {
            messagepane.removeEventListener("load", this.handler, true);
            this.listener2 = false;
        }
        this.doc = null;
        this.win = null;
        this.handler = null;
    }
}


/*function startEmailInspection(doc, win)
{
    var appcontent = (doc || document).getElementById("appcontent"); // browser app content
    if (appcontent) {
        appcontent.addEventListener("OMContentLoaded", signalspam_onMessageLoadHandler, true);
    }
    var messagepane = (doc || document).getElementById("messagepane"); // thunderbird message pane
    if(messagepane) {
        messagepane.addEventListener("load", signalspam_onMessageLoadHandler.bind(win), true);
    }
}

function stopEmailInspection(doc, win)
{
    var appcontent = (doc || document).getElementById("appcontent"); // browser app content
    if (appcontent) {
        appcontent.removeEventListener("OMContentLoaded", signalspam_onMessageLoadHandler);
    }
    var messagepane = (doc || document).getElementById("messagepane"); // thunderbird message pane
    if(messagepane) {
        messagepane.removeEventListener("load", signalspam_onMessageLoadHandler.bind(win));
    }
}*/
function initNotificationBox() {
    let waitForInit = new Promise(function(resolve, reject) {

    });
    return waitForInit
}

function signalspam_showNotification() {
    if (signalspam_NotificationReady === false || !signalspam_Notification || typeof signalspam_Notification.notificationbox === "undefined") {
        verifrom.console.log(4,'signalspam_showNotification - notification box not initialized');
        XPCOMUtils.defineLazyGetter(signalspam_Notification
            , "notificationbox"
            , function() {
                return new MozElements.NotificationBox(function(element) {
                    element.setAttribute("flex", "1");
                    element.setAttribute("notificationside","top");
                    document.getElementById("mail-notification-top").append(element);
                    signalspam_NotificationReady = true;
                });
            });
    }

    let notifyBox = signalspam_Notification.notificationbox;
    let notification = notifyBox.getNotificationWithValue("VFPhishingNotification");
    let bundle = Services.strings.createBundle("chrome://signalspam/locale/signalspam.properties");

    if (notification)
    {
        verifrom.console.log(4,'signalspam_showNotification - notification already displayed');
        return;
    }

    let phishingAlertLabel = bundle.GetStringFromName("signalspam.contentScript.sidebar.phishingtitle")+" - "+bundle.GetStringFromName("signalspam.contentScript.sidebar.phishingdetected")+" "+bundle.GetStringFromName("signalspam.contentScript.sidebar.phishinglinks");
    if (notifyBox) {
        notifyBox.appendNotification(
            phishingAlertLabel,
            "VFPhishingNotification",
            "chrome://signalspam/skin/icon48.png",
            notifyBox.PRIORITY_CRITICAL_HIGH,
            [
                {
                    callback: function() {
                        verifrom.console.log("signalspam_showNotification - click on report button in phishing alert");
                        signalspam_reportEmail("phishingAlert",null,null);
                        //We want the notification to remain
                        setTimeout(signalspam_showNotification,300);
                        return false;
                    }
                    ,label:bundle.GetStringFromName("signalspam.contentScript.sidebar.buttonlabel")
                    ,popup:null
                    ,isDefault:true
                    //,type:""
                },
                {
                    callback: function() {
                        signalspam_reportFalsePositive("cmd_signalspamFalsePositive");
                    }
                    ,label:bundle.GetStringFromName("signalspam.contentScript.sidebar.phishingfalseposbutton")
                    ,popup:null
                    ,isDefault:false
                    //,type:"menu-button"
                }
            ],function(){
                verifrom.console.log("signalspam_showNotification - notification event",arguments);
            }
        );
        var falsePositiveButton=document.querySelector("hbox#mail-notification-top>stack>notification[value=VFPhishingNotification]>hbox>button[label="+bundle.GetStringFromName("signalspam.contentScript.sidebar.phishingfalseposbutton")+"]");
        if (falsePositiveButton)
            falsePositiveButton.tooltipText = bundle.GetStringFromName("signalspam.contentScript.sidebar.phishingfalsepos");
    }
}

function signalspam_hideNotifications(win) {
    if (!signalspam_Notification || typeof signalspam_Notification.notificationbox === "undefined" || signalspam_NotificationReady === false) {
        verifrom.console.log(4,'signalspam_hideNotifications - signalspam_Notification not initialized');
        return;
    }
    let notifyBox = signalspam_Notification.notificationbox;
    let VFNotification = notifyBox.getNotificationWithValue("VFPhishingNotification");
    if (VFNotification)
        notifyBox.removeNotification(VFNotification);
    notifyBox._stack.remove();
    signalspam_NotificationReady = false;
    return;
}

function signalspam_prepare(doc) {
    if (signalspam_phishingNotification)
        return;
    if (!doc && !document) {
        verifrom.console.error(0,'signalspam_prepare - no doc and no document !');
        return;
    }
    let elem = (document || doc).querySelector('#signalspam-alert-notification');
    if (!elem || typeof elem.cloneNode !== "function")
    {
        verifrom.console.error(0,'signalspam_prepare - elem is null or cloneNode is not a function');
        return;
    }
    signalspam_phishingNotification = elem.cloneNode(true);
}

function signalspam_installButton(toolbarId, id, afterId) {
    if (!document.getElementById(id)) {
        var toolbar = document.getElementById(toolbarId);

        // If no afterId is given, then append the item to the toolbar
        var before = null;
        if (afterId) {
            var elem = document.getElementById(afterId);
            if (elem && elem.parentNode == toolbar)
                before = elem.nextElementSibling;
        }

        toolbar.insertItem(id, before);
        toolbar.setAttribute("currentset", toolbar.currentSet);
        //document.persist removed in TB68
        //document.persist(toolbar.id, "currentset");
        Services.xulStore.persist(toolbar, "currentSet");



        if (toolbarId == "addon-bar")
            toolbar.collapsed = false;
    }
}

function signalspam_showProgressBar(show) {
    if (!signalspam_ProgressBar)
        signalspam_ProgressBar = document.querySelector("#signalspam-statusbar");
    if (!signalspam_ProgressBar) {
        verifrom.console.error(4,'signalspam_showProgressBar - did not find progressBar');
        return;
    }

    if (show)
        signalspam_ProgressBar.className="signalspam_statusbar_visible";
    else signalspam_ProgressBar.className="signalspam_statusbar";
    signalspam_ProgressBar.hidden = !show;
}

function signalspam_showView(viewId, closeOthers) {
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

function signalspam_toggleSidebar() {
    var sidebarBox = document.getElementById("sidebar-box");
    if (!sidebarBox) {
        return
    }
    var sidebarSplitter = document.getElementById("sidebar-splitter");
    //var sidebarTitle = document.getElementById("sidebar-title");
    sidebarBox.hidden = false;
    sidebarSplitter.hidden = false;
    sidebarBox.setAttribute("sidebarVisible", "true");
    sidebarBox.setAttribute("collapsed", "false");
    //sidebarTitle.innerText="&signalspam.context;";
}

function signalspam_openSidebar() {
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

function signalspam_closeSidebar() {
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


function signalspam_junkButtonHandler() {
    verifrom.console.log(4, 'hdrJunkButton pressed', arguments);
    signalspam_reportEmail("hdrJunkButton");
}

function signalspam_setJunkButton(status) {
    var button = document.getElementById("hdrJunkButton");
    if (button && status === true && signalspam_junkButtonStatus == false) {
        button.addEventListener('command', signalspam_junkButtonHandler, true);
        signalspam_junkButtonStatus = true;
    }
    if (button && status === false && signalspam_junkButtonStatus === true) {
        button.removeEventListener('command', signalspam_junkButtonHandler, true);
        signalspam_junkButtonStatus = false;
    }
}

function signalspam_openPreferences(msg) {
    if (null == this._preferencesWindow || this._preferencesWindow.closed) {
        this._preferencesWindow = window.open('chrome://signalspam/content/signalspam/settings.xul' + (msg ? "?" + msg : ''), "signalspam_preferences", "chrome,titlebar,toolbar,centerscreen,width=800,height=720");
    }
    this._preferencesWindow.focus();
}

function signalspam_displayInstallManifest() {
    verifrom.console.log(2, 'signalspam_displayInstallManifest');
    if (navigator.language === 'fr' || navigator.language === 'fr-FR')
        openTab("chromeTab", {chromePage: extensionConfig.appInfo.installManifestURL["fr"]});
    else openTab("chromeTab", {chromePage: extensionConfig.appInfo.installManifestURL["en"]});
}

function signalspam_displayUpdateManifest() {
    verifrom.console.log(2, 'signalspam_displayUpdateManifest');
    if (navigator.language === 'fr' || navigator.language === 'fr-FR')
        openTab("chromeTab", {chromePage: extensionConfig.appInfo.updateManifestURL["fr"]});
    else openTab("chromeTab", {chromePage: extensionConfig.appInfo.updateManifestURL["en"]});
}