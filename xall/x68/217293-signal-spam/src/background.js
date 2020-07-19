

function getMailLinks(element) {
    let urlArray = new Array();
    let urlElementsArray = new Array();
    let tagsAttrList;
    let mailLink = "";
    let originalLink = "";
    let mailLinkScheme = "";

    tagsAttrList = PARAM.TAGSATTRLIST_CONST;

    if (element) {
        for (let i = 0; i < tagsAttrList.length; i++) {
            for (let j = 1; j < tagsAttrList[i].length; j++) {
                let tagAttr = tagsAttrList[i][0] + "[" + tagsAttrList[i][j] + "]";
                void 0;
                let linksInElement = element.querySelectorAll(tagAttr);
                for (let k = 0; k < linksInElement.length; k++) {
                    mailLink = linksInElement[k].getAttribute(tagsAttrList[i][j]);
                    originalLink = mailLink;
                    mailLinkScheme = mailLink.trim().match(/([^:]*):.{1,}$/);
                    if (mailLinkScheme)
                        mailLinkScheme = mailLinkScheme[1];
                    else mailLinkScheme = "http";
                    if (mailLink && mailLinkScheme.match(/^https?/i)) {
                        mailLink = mailLink.replace(new RegExp(PARAM.ALL_REPLACE_CONST1, PARAM.ALL_REPLACE_CONST11), PARAM.ALL_REPLACE_CONST2).replace(new RegExp(PARAM.ALL_REPLACE_CONST3, PARAM.ALL_REPLACE_CONST33), PARAM.ALL_REPLACE_CONST4);
                        void 0;
                        urlArray.push(mailLinkScheme + '://' + mailLink);
                        void 0;
                    }
                }
            }
        }
    }
    return urlArray;
}

function getMailLinksFromText(text) {
    if (!text || typeof text !== "string" || text.length===0)
        return [];
    const linkifyRegex = /(?:((https?|ftp|mailto):\/\/)*(?:(([^\s]*?):(?:([^\s]*?)\@{1,1})*)*?)(([0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3})|((?:[\w\d\-\uc0-\u1FFF]+\.)+([\w]+[\-\w\d](?!\-))))(?:\:([0-9]+))?((\/[^\s<>'"\?]*)(\?([^\s\b,;\\<>"'\?]*))*)?)/gim;
    return text.match(linkifyRegex);
}

function extractURLs(parts) {
    let urls = [];
    if (!parts || parts.length === 0)
        return urls;
    for (part of parts) {
        if (part.body) {
            switch (part.contentType) {
                case 'text/plain': {
                    urls = urls.concat(getMailLinksFromText(part.body));
                }
                    break;
                case 'text/html': {
                    let parser = new DOMParser();
                    let htmlDoc = parser.parseFromString(part.body, 'text/html');
                    urls = urls.concat(getMailLinks(htmlDoc.querySelector("body")));
                }
                    break;
            }
        }
        if (part.parts) {
            urls = urls.concat(extractURLs(part.parts));
        }
    }
    return urls.filter(function (item, pos) {
        return urls.indexOf(item) == pos;
    });
}




var PARAM = undefined;
var options = undefined;
var hashLinkArray = new Map();
var hashLinkById = {};
var checkHostHashCache = new Map();
var surfsafeStatsInterval;
var hostHashTable = [];
var localizationData;
var socketClient = null;
var socketPort = undefined;

function payloadForSignalSpam(payload) {
    let emailPayload;

    if (payload.action === "reportURL") {
        emailPayload = payload.email.header;
        emailPayload += payload.email.body;
        try {
            emailPayload = btoa(encode(emailPayload)); 
        } catch (e) {
            emailPayload = payload.email.header;
            emailPayload += payload.email.body;
            emailPayload = escape(base64Encode(emailPayload));
        }
    } else if (payload.action === "signalHeader") {
        emailPayload = payload.email.header;
        emailPayload = emailPayload.replace(/^Content-(Type|Transfer).*/gm, '') + '\n';
        emailPayload += "Content-Type: text/html; charset=utf-8\nContent-Transfer-Encoding: quoted-printable\n\n";
        emailPayload += "Liens extraits par l'extension :\n";
        for (let i = 0; i < payload.email.links.length; i++) {
            emailPayload += '<a href="' + unescape(payload.email.links[i]) + '">lien ' + i + '</a>\n';
        }
        emailPayload += '\nBody :\n';
        emailPayload += payload.email.body;
        let emailPayloadEncoded;
        try {
            emailPayloadEncoded = btoa(encode(emailPayload)); 
        } catch (e) {
            emailPayloadEncoded = escape(base64Encode(emailPayload));
        }
        emailPayload = emailPayloadEncoded;
    } else {
        try {
            emailPayload = btoa(encode(payload.email)); 
        } catch (e) {
            emailPayload = escape(base64Encode(payload.email));
        }
    }
    let folderId = 0;
    if (payload.email.folder !== undefined)
        folderId = payload.email.folder;
    else if (payload.folder !== undefined)
        folderId = payload.folder;
    return "dossier=" + folderId + "&message=" + emailPayload;
}

function reportEmail(message) {
    return new Promise((resolve,reject)=>{
        if (!message || !message.payLoad) {
            let err="no message to report";
            void 0;
            reject('Exception - No message to report');
            ExceptionReportHandler(err);
            return;
        }
        let payload = message.payLoad;
        void 0;
        try {
            let sigspamPayload = payloadForSignalSpam(payload);
            verifrom.request.ajax({
                url: PARAM.REPORT_API.SCHEME + PARAM.REPORT_API.HOSTNAME + PARAM.REPORT_API.PATHNAME,
                contentType: "application/x-www-form-urlencoded",
                cache: false,
                method: 'POST',
                type: 'POST',
                processData: false,
                data: sigspamPayload,
                timeout: 120000,
                beforeSend: function (request) {
                    request.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
                    request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                    request.setRequestHeader('X-User-Agent', 'Plugin Navigateur - Version ' + verifrom.extension.name() + ' ' + verifrom.extension.version() + ' - Webmail ' + message.webmail + ' - ' + window.navigator.userAgent + ' - ');
                    request.setRequestHeader("Authorization", "Basic " + passwordEncrypt(options.email + ':' + passwordDecrypt(options.password)));
                },
                error: function (request, textStatus, errorThrown) {
                    if (request.status === 401) {
                        reject(verifrom.locales.getMessage("contentScript.reportStatus.invalidpassword"));
                        setTimeout(function () {
                            openOptionsMsgHandler('?invalidpassword=true');
                        }, 500);
                    } else if (request.status === 403) {
                        pendingSignaling.push(message);
                        reject(verifrom.locales.getMessage("contentScript.reportStatus.error403"));
                    } else reject(verifrom.locales.getMessage("contentScript.reportStatus.error") + " " + request.status);
                    void 0;
                },
                success: function (HTTPResponse, textStatus, request) {
                    if (request.status===202 && request.statusText==='Accepted') {
                        resolve();
                        void 0;
                    } else {
                        if (request.status===403)
                            reject(verifrom.locales.getMessage("contentScript.reportStatus.error403") + " " + request.status);
                        else reject (verifrom.locales.getMessage("contentScript.reportStatus.error") + " " + request.status);
                        void 0;
                    }
                }
            });
        } catch (err) {
            void 0;
            reject("Exception : "+err);
            ExceptionReportHandler(err);
        }
    });
}

function openReportsList() {
    if (PARAM && PARAM.hasOwnProperty("URL_SELFCARE"))
        browser.tabs.create({url:PARAM.URL_SELFCARE});
    else void 0;
}

async function migrateOptions(callback) {
    try {
        let email = await browser.legacyprefs.getPref("userid", "string", "extensions.signalspam.");
        let oneClickOption = await browser.legacyprefs.getPref("oneclick", "bool", "extensions.signalspam.");
        let URLDETECT = await browser.legacyprefs.getPref("urldetect", "bool", "extensions.signalspam.");
        let movereport = await browser.legacyprefs.getPref("movereport", "bool", "extensions.signalspam.");
        let password = await browser.legacyprefs.getPassword(email || options.email, verifrom.appInfo.credHostname);

        void 0;
        if (password) {
            options.password = passwordEncrypt(password);
            void 0;
        }
        if (email)
            options.email = email;
        if (typeof oneClickOption === "boolean")
            options.oneClickOption = oneClickOption;
        if (typeof URLDETECT === "boolean")
            options.URLDETECT = URLDETECT;
        if (typeof movereport === "boolean") {
            options.movereport = movereport;
            options.markread = movereport;
            options.markspam = movereport;
        }
        options.cgu = true;
        void 0;
        verifrom.settings.set(options, callback);
        callback(options);
    } catch(e) {
        void 0;
    }
}

function anonymizeMailHeader(header,subject,sender) {
    return header;
}

function setSurfSafe(hostname, action) {
    if (PARAM.OPTIONS.SURFSAFE_ENABLED === false)
        return;
    try {
        hostname = hostname.replace(/^www\./i, "").toLowerCase();
        let hostHash = XXH64(hostname, 0x0).toString();
        if (hostHashTable.findIndex(function (hashItem) {
            return (hashItem.hash === hostHash && hashItem.action === action);
        }) === -1)
            hostHashTable.push({"action": action, "hash": hostHash});
        if (!surfsafeStatsInterval)
            surfsafeStatsInterval = setInterval(pushSurfSafe, 60000);
    } catch (e) {
        void 0;
    }
}

function pushSurfSafe() {
    if (hostHashTable.length === 0)
        return;

    if (PARAM.OPTIONS.SURFSAFE_ENABLED === false || !PARAM.URL_SURFSAFE || PARAM.URL_SURFSAFE.length === 0) {
        hostHashTable = [];
        return;
    }

    void 0;

    verifrom.request.ajax({
        url: PARAM.URL_SURFSAFE,
        cache: false,
        method: 'POST',
        type: 'POST',
        processData: false,
        data: JSON.stringify({"hostHashes": hostHashTable}),
        dataType: 'json',
        contentType: 'application/json; charset=utf-8',
        timeout: 30000,
        async: true,
        error: function (request, textStatus, errorThrown) {
            void 0;
        },
        success: function (HTTPResponse, textStatus, request) {
            void 0;
            hostHashTable = [];
        }
    });
}

function downloadDatabase(callback) {

    void 0;

    disconnectFromProxy();

    verifrom.request.ajax({
        url: PARAM.URL_PROXY_DATABASE,
        contentType: "application/json",
        cache: false,
        method: 'GET',
        type: 'GET',
        dataType: 'json',
        timeout: 60000,
        async: true,
        error: function (request, textStatus, errorThrown) {
            setTimeout(downloadDatabase.bind(this, callback), 30000);
        },
        success: function (JSONresponse, textStatus, request) {
            void 0;
            switch (request.status) {
                case 503:
                    setTimeout(downloadDatabase.bind(this, callback), 30000);
                    break;
                case 200:
                    let recordsArray;
                    void 0;
                    if (typeof JSONresponse !== 'object') {
                        void 0;
                        recordsArray = JSON.parse(JSONresponse);
                    }
                    else recordsArray = JSONresponse;

                    let socketInfo = recordsArray.pop();
                    if (!socketInfo.socketPort) {
                        void 0;
                        socketPort = 3027;
                    }
                    else socketPort = parseInt(socketInfo.socketPort);

                    void 0;

                    storeDBRecords(recordsArray);
                    checkHostHashCache.clear();
                    if (typeof callback === 'function')
                        Promise.resolve().then(callback);
                    break;
                default:
                    break;
            }
        }
    });
}

function updatePhishingDatabase() {
    let lastTimeStamp;
    lastTimeStamp = getLatestTimeStamp();
    let lastResetTimeStamp;
    lastResetTimeStamp = getLastReset();

    void 0;

    if (!lastTimeStamp) {
        void 0;
        downloadDatabase(updatePhishingDatabase);
        return;
    }

    connectToPushProxy();

    verifrom.request.ajax({
        url: PARAM.URL_PROXY_UPDATE,
        contentType: "application/json",
        cache: false,
        method: 'GET',
        type: 'GET',
        dataType: 'json',
        data: {"lastTimeStamp": lastTimeStamp, "lastResetTimeStamp": lastResetTimeStamp, "dbsize": hashLinkArray.size},
        timeout: 60000,
        async: true,
        error: function (request, textStatus, errorThrown) {
            void 0;
            setTimeout(updatePhishingDatabase, 30000);
        },
        success: function (JSONresponse, textStatus, request) {
            void 0;
            switch (request.status) {
                case 503:
                    void 0;
                    setTimeout(updatePhishingDatabase, 30000);
                    break;
                case 204:
                    void 0;
                    resetDB("204 received from proxy");
                    checkHostHashCache.clear();
                    downloadDatabase(function () {
                        updatePhishingDatabase()
                    });
                    break;
                case 200:
                    void 0;
                    let recordsArray;

                    if (typeof JSONresponse !== 'object') {
                        void 0;
                        recordsArray = JSON.parse(JSONresponse);
                    }
                    else recordsArray = JSONresponse;

                    let socketInfo = recordsArray.pop();
                    if (!socketInfo.socketPort) {
                        void 0;
                        socketInfo.socketPort = PARAM.SOCKETIO.defaultProxy || extensionConfig.appInfo.defaultSocketioPort || 3041;
                    }
                    if (!socketPort) {
                        socketPort = parseInt(socketInfo.socketPort);
                        connectToPushProxy();
                    } else {
                        if (socketPort !== parseInt(socketInfo.socketPort)) {
                            void 0;
                            socketClient.VerifromReconnect = true;
                            socketPort = parseInt(socketInfo.socketPort);
                            disconnectFromProxy();
                        }
                    }
                    void 0;

                    if (recordsArray.length > 0) {
                        void 0;
                        storeDBRecords(recordsArray);
                        checkHostHashCache.clear();
                    }
                    else void 0;
                    break;
                default:
                    break;
            }
        }
    });
}

function disconnectFromProxy() {
    if (socketClient && (socketClient.connected === true || socketClient.disconnected === false)) {
        void 0;
        socketClient.disconnect();
    }
}

function connectToPushProxy() {
    disconnectFromProxy();
    try {
        if (socketClient === null || socketClient === undefined || (socketClient.connected === false || socketClient.disconnected === true)) {
            if (socketClient && (socketClient.connected === false || socketClient.disconnected === true)) {
                if (socketClient.VerifromConnecting) {
                    void 0;
                    return;
                }
                void 0;
                socketClient.disconnect();
                socketClient.VerifromConnecting = true;
                socketClient.connect();
                return;
            }
            else if (!socketClient) {
                void 0;
                if (socketPort)
                    socketClient = io.connect(PARAM.URL_PROXY_PUSH, PARAM.SOCKETIO.OPTIONS);
                else {
                    void 0;
                    return;
                }
            }

            if (socketClient.VerifromListening)
                return;

            socketClient.VerifromListening = true;

            void 0;

            socketClient.on('updates', function (JSONresponse) {
                let recordsArray;
                void 0;
                if (typeof JSONresponse !== 'object') {
                    void 0;
                    recordsArray = JSON.parse(JSONresponse);
                }
                else recordsArray = JSONresponse;
                storeDBRecords(recordsArray);
                checkHostHashCache.clear();
            });

            if ("function"===typeof updateReport)
                socketClient.on('reportstatus',function (message) {
                    void 0;
                    Promise.resolve().then(()=>{updateReport(message.UID,message.s,message.t)});
                });

            socketClient.on('close', function (JSONresponse) {
                void 0;
                disconnectFromProxy();
                setTimeout(connectToPushProxy, 30000);
            });

            socketClient.on('reset', function (JSONresponse) {
                void 0;
                resetDB("Reset received from proxy");
                checkHostHashCache.clear();
                Promise.resolve().then(()=>{downloadDatabase(updatePhishingDatabase)});
            });

            socketClient.on('disconnect', function () {
                socketClient.VerifromConnecting = false;
                void 0;
                if (socketClient.VerifromReconnect) {
                    void 0;
                    socketClient.VerifromReconnect = false;
                    socketClient = null;
                    Promise.resolve().then(()=>{connectToPushProxy()});
                }
            });

            socketClient.on('reconnect', function () {
                socketClient = this;
                void 0;
                Promise.resolve().then(()=>{updatePhishingDatabase()});
            });

            socketClient.on('connect', function () {
                socketClient.VerifromConnecting = false;
                void 0;
            });

        }
    } catch (err) {
        void 0;
    }
}

function updateLastDBReset() {
    let timestamp;
    timestamp = (new Date()).getTime();
    verifrom.dbStorage.set('lastreset', timestamp);
}

function getLastReset() {
    let lastreset;
    lastreset = verifrom.dbStorage.get('lastreset');
    if (lastreset === undefined || lastreset === null)
        lastreset = 0;
    return lastreset;
}

function resetDB(reason) {

    disconnectFromProxy();

    let previousVersion;
    previousVersion = verifrom.dbStorage.get(verifrom.appInfo.extensionName + '_Version');

    void 0;
    verifrom.dbStorage.clear();
    hashLinkArray.clear();
    hashLinkById = {};
    if (previousVersion)
        verifrom.dbStorage.set(verifrom.appInfo.extensionName + '_Version', previousVersion);
    if (PARAM)
        verifrom.dbStorage.set(verifrom.appInfo.extensionName + 'PARAMS', PARAM);
    updateLastDBReset();
}

function getLatestTimeStamp() {
    let latestTimeStamp;
    latestTimeStamp = verifrom.dbStorage.get('timestamp');
    if (!latestTimeStamp)
        latestTimeStamp = 0;
    void 0;
    return latestTimeStamp;
}

function updateLatestTimeStamp(timestamp) {
    verifrom.dbStorage.set('timestamp', timestamp);
}

function storeDBRecords(recordsArray, callback) {
    let latestTimeStamp;
    let previousRecord;

    latestTimeStamp = getLatestTimeStamp();
    void 0;
    try {
        for (let record of recordsArray) {
            if (record.url) {
                record.url = parseInt(record.url);
                record.id = parseInt(record.id);
                switch (record.action) {
                    case 1:
                        if (!(previousRecord = hashLinkArray.get(record.url)))
                            hashLinkArray.set(record.url, [record.id]);
                        else {
                            if (!previousRecord.includes(record.id))
                                previousRecord.push(record.id);
                            hashLinkArray.set(record.url, previousRecord);
                        }
                        hashLinkById[record.id] = record.url;
                        break;
                    case 0:
                        previousRecord = hashLinkArray.get(record.url);
                        if (previousRecord) {
                            for (let i = 0; i < previousRecord.length; i++)
                                delete hashLinkById[previousRecord[i]];
                        }
                        hashLinkArray.delete(record.url);
                        delete hashLinkById[record.id];
                        break;
                }
                if (record.time > latestTimeStamp)
                    latestTimeStamp = record.time;
            }
        }
    } catch (e) {
        void 0;
    }
    finally {
        void 0
        verifrom.dbStorage.set("phishingDB", JSON.stringify(hashLinkById));
        updateLatestTimeStamp(latestTimeStamp);
    }
    void 0;
    if (typeof callback === 'function')
        Promise.resolve().then(callback);
}

function loadDBRecords(tabId) {
    if (options.userAuthentified === false && PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED === true)
        return;
    let previousRecord;

    void 0;
    void 0;
    let dbRecords = verifrom.dbStorage.get("phishingDB");
    if (!dbRecords) {
        void 0;
        resetDB("not found");
        checkHostHashCache.clear();
        downloadDatabase(function () {
            void 0;
            updatePhishingDatabase();
        });
        return;
    }
    dbRecords = JSON.parse(dbRecords);
    void 0;
    hashLinkById = {};
    hashLinkArray.clear();
    Object.keys(dbRecords).forEach(function (id) {
        let urlHash = parseInt(dbRecords[id]); 
        if (!(previousRecord = hashLinkArray.get(urlHash)))
            hashLinkArray.set(urlHash, [id]);
        else {
            if (!previousRecord.includes(id))
                previousRecord.push(id);
            hashLinkArray.set(urlHash, previousRecord);
        }
        hashLinkById[id] = urlHash;
    });
    void 0;
    if (!tabId)
        updatePhishingDatabase();
}

function checkHostHash(hostname, urlHash, hashFullCanonLink) {
    return new Promise((resolve,reject)=>{
        try {
            hostname = verifrom.normalizeHostName(hostname);
            let previousResponse = checkHostHashCache.get(urlHash);
            if (typeof previousResponse === "undefined") {
                let hostHashMatching = false, hostHash = null;

                verifrom.request.get({
                    url: PARAM.URL_STOPPHISHING_API + urlHash,
                    onSuccess: function (JSONresponse, additionalInfo) {
                        if ("undefined" !== typeof JSONresponse.hostname && JSONresponse.hostname.length > 0) {
                            hostHash = parseInt(XXH(hostname, 0x0).toString());
                            checkHostHashCache.set(urlHash, JSONresponse);
                            for (let i = 0; i < JSONresponse.hostname.length && hostHashMatching === false; i++) {
                                if (JSONresponse.hostname[i].hash32_hostname === hostHash) {
                                    if (typeof JSONresponse.hostname[i].hash32_url !== 'undefined') {
                                        void 0;

                                        for (let j = 0; j < JSONresponse.hostname[i].hash32_url.length && hostHashMatching === false; j++) {
                                            if (JSONresponse.hostname[i].hash32_url[j].toString() === hashFullCanonLink) {
                                                void 0;
                                                hostHashMatching = true;
                                                resolve(urlHash);
                                                break;
                                            } else {
                                                void 0;
                                            }
                                        }
                                    } else {
                                        void 0;
                                        hostHashMatching = true;
                                        resolve(urlHash);
                                        break;
                                    }
                                }
                            }
                        }
                        if (hostHashMatching === false) {
                            void 0;
                            resolve(false);
                        }
                    },
                    onFailure: function (httpCode) {
                        void 0;
                        hostHashMatching = false;
                        void 0;
                        reject(false);
                    },
                    additionalRequestHeaders: {'Verifrom-id': PARAM.VERIFROMGADGETID},
                    contentType: 'application/x-www-form-urlencoded',
                    responseDataType: 'json'
                });
            } else {
                void 0;
                let hostHashMatching = false, hostHash = null;
                if ("undefined" !== typeof previousResponse.hostname && previousResponse.hostname.length > 0) {
                    hostHash = parseInt(XXH(hostname, 0x0).toString());
                    for (let i = 0; i < previousResponse.hostname.length && hostHashMatching === false; i++) {
                        if (previousResponse.hostname[i].hash32_hostname === hostHash) {
                            if (typeof previousResponse.hostname[i].hash32_url !== 'undefined') {
                                void 0;
                                for (let j = 0; j < previousResponse.hostname[i].hash32_url.length && hostHashMatching === false; j++) {
                                    if (previousResponse.hostname[i].hash32_url[j].toString() === hashFullCanonLink) {
                                        void 0;
                                        hostHashMatching = true;
                                        resolve(urlHash);
                                    } else {
                                        void 0;
                                    }
                                }
                                if (hostHashMatching === false)
                                    void 0;
                            } else {
                                void 0;
                                hostHashMatching = true;
                                resolve(urlHash);
                            }
                        }
                    }
                }
                if (hostHashMatching === false) {
                    void 0;
                    resolve(false);
                }
            }
        } catch (err) {
            void 0;
            reject(false);
        }
    });
}

function checkHostPathCombination(hostname, port, path, query, onPhishingCallback) {

    return new Promise((resolve,reject)=>{
        try {
            let ipv4v6Addr = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/.test(hostname);
            let hostComponents;
            let trailingSlash = /\/$/.test(path) ? '/' : '';
            let hashCanonLink;
            let hashFullCanonLink;
            let waitPromises=[];

            hostComponents = hostname.split('.');
            port = port !== "" ? ":" + port : "";

            hashFullCanonLink = XXH(hostname.replace(/^www\./i, '') + port + path + query, 0x0).toString();

            while (hostComponents.length > 1) {
                let hostToHash = hostComponents.join('.');
                if (query.length > 0) {
                    hashCanonLink = parseInt(XXH(hostToHash + port + path + query, 0x0).toString());
                    if (hashLinkArray.has(hashCanonLink)) {
                        void 0;
                        if (verifrom.appInfo.stopPhishingCollisionCheckAPI)
                            waitPromises.push(checkHostHash(hostname, hashCanonLink, hashFullCanonLink));
                        else waitPromises.push(Promise.resolve(hashCanonLink));
                    }
                }

                let URLpathComponents = path.split('/');
                if (URLpathComponents[0].length === 0)
                    URLpathComponents.shift();
                if (URLpathComponents[URLpathComponents.length - 1].length === 0)
                    URLpathComponents.pop();
                while (URLpathComponents.length >= 0) {
                    let pathToHash;
                    pathToHash = '/' + URLpathComponents.join('/');
                    if (pathToHash.length === path.length)
                        pathToHash += trailingSlash;
                    else pathToHash += '/';
                    if (/^\/*$/.test(pathToHash))
                        pathToHash = '/';
                    hashCanonLink = parseInt(XXH(hostToHash + port + pathToHash, 0x0).toString());
                    if (hashLinkArray.has(hashCanonLink)) {
                        if (verifrom.appInfo.stopPhishingCollisionCheckAPI)
                            waitPromises.push(checkHostHash(hostname, hashCanonLink, hashFullCanonLink));
                        else waitPromises.push(Promise.resolve(hashCanonLink));
                    }
                    else {
                        void 0;
                    }
                    if (URLpathComponents.length === 0)
                        break;
                    if (URLpathComponents.length > 3)
                        URLpathComponents.splice(3);
                    else URLpathComponents.pop();
                }
                if (ipv4v6Addr)
                    break;
                if (hostComponents.length > 5)
                    hostComponents = hostComponents.splice(-5, 5);
                else hostComponents.shift();
            }
            void 0;
            Promise.allSettled(waitPromises).then((results)=>{
                void 0;
                let phishing=false;
                for (let result of results) {
                    if (result.status==="fulfilled" && result.value!==false) {
                        phishing = result.value;
                        break;
                    }
                }
                resolve(phishing);
            });
        } catch(e) {
            reject(e);
        }
    });
}

function checkURLForPhishing(url) {

    if (options.URLDETECT === false || PARAM.OPTIONS.STOPPHISHING_BROWSING_ENABLED !== true)
        return Promise.resolve(false);
    return new Promise((resolve,reject)=>{
        let previousResponse;
        if ((previousResponse=checkHostHashCache.get(url))!==undefined) {
            void 0;
            resolve(previousResponse);
            return;
        }

        try {
            let parsedCanonUrl = verifromURLCanonicalization.canonicalize(url);
            parsedCanonUrl = verifrom.parseUrl(parsedCanonUrl);
            setSurfSafe(parsedCanonUrl.host, "h1");
            checkHostPathCombination(parsedCanonUrl.host, parsedCanonUrl.port, parsedCanonUrl.path, parsedCanonUrl.query)
            .then(phishingAlert=> {
                checkHostHashCache.set(url,phishingAlert);
                if (phishingAlert!==false) {
                    void 0;
                    if (verifrom.dbStorage.get(phishingAlert + '-falsePositive') === undefined) {
                        void 0;
                        resolve(phishingAlert);
                    } else {
                        void 0;
                        resolve(false);
                    }
                } else {
                    setSurfSafe(parsedCanonUrl.host,"h2");
                    resolve(false);
                }
            })
            .catch(reason=>{
                void 0;
                resolve(false);
            });
        } catch (e) {
            void 0;
            resolve(false);
        }
    });
}

function checkForPhishing(urls, checkId, onPhishingCallback) {
    void 0;
    let waitPromises=[];
    let phishingUrls=[];
    let phishingHashes=[];
    let cancelled = false;
    if (!urls || urls.length===0)
        return {
            checkUrlsPromise : Promise.resolve({phishingUrls:phishingUrls,phishingHashes:phishingHashes,phishingStatus:false}),
            cancelPromise:null
        };
    let checkUrlsPromiseReject;
    let checkUrlsPromise = new Promise((resolve,reject)=>{
            checkUrlsPromiseReject = reject;
            for (let url of urls) {
                if (cancelled===true)
                    break;
                let p=new Promise((resolve2,reject2)=>{
                    checkURLForPhishing(url).then((phishing)=>{
                        if (cancelled===true)
                            return resolve2(phishing);
                        if (phishing!==false) {
                            phishingUrls.push(url);
                            phishingHashes.push(phishing);
                            Promise.resolve().then(()=>{onPhishingCallback(true,checkId)});
                        }
                        resolve2(phishing);
                    }).catch(()=>{
                        resolve2(false);
                    });
                });
                waitPromises.push(p);
            }
            void 0;
            Promise.allSettled(waitPromises).then((results)=>{
                if (cancelled===true) {
                    void 0;
                    reject("cancelled");
                    return;
                }
                void 0;
                if (phishingUrls.length>0) {
                    void 0;
                }
                resolve({phishingUrls:phishingUrls,phishingHashes:phishingHashes,phishingStatus:phishingUrls.length>0});
            });
        });
    let cancelPromise = () => {
            cancelled=true;
            void 0;
            checkUrlsPromiseReject({ reason: 'cancelled check id '+checkId });
    };
    return { checkUrlsPromise: checkUrlsPromise, cancelPromise: cancelPromise};
}

function restoreOptions() {
    return new Promise((resolve,reject)=>{
        void 0;
        verifrom.settings.get(PARAM.USER_SETTINGS.DEFAULT, async function (items) {
            options = items;
            if (options.firstTime===true) { 
                void 0;
                let oldFirstTime = await browser.legacyprefs.getPref("firsttime","boolean","extensions.signalspam.");
                void 0;
                if (oldFirstTime!==undefined) {
                    void 0;
                    migrateOptions(resolve);
                    return;
                } else resolve();
                void 0;
                return;
            } else void 0;
            void 0;
            resolve();
        });
    });
}

function loadParamsFromLocalFile(onSuccessCallback, onFailureCallback) {
    PARAM = verifrom.dbStorage.get(verifrom.appInfo.extensionName + 'PARAMS');
    if (typeof PARAM === 'object') {
        void 0;
        onSuccessCallback();
        return;
    }

    verifrom.request.get({
            url: verifrom.getURL(extensionConfig.jsonConfig.localFileName),
            onSuccess: function (JSONresponse, additionalInfo) {
                PARAM = JSONresponse;
                void 0;
                verifrom.dbStorage.set(verifrom.appInfo.extensionName + 'PARAMS', PARAM);
                onSuccessCallback();
            },
            onFailure: function (httpCode) { 
                void 0;
                if (typeof onFailureCallback === 'function')
                    onFailureCallback();
            },
            contentType: 'application/x-www-form-urlencoded',
            responseDataType: 'json'
        }
    );
}

function loadParams() {
    void 0;
    return new Promise((resolve,reject)=>
    {
        try {
            let paramsUrl = extensionConfig.jsonConfig.url;
            if (extensionConfig.appInfo.staging === true || extensionConfig.appInfo.logLevel > 0)
                paramsUrl = extensionConfig.jsonConfig.staging;
            verifrom.request.get({
                url: paramsUrl + '?nocache=' + (new Date().getTime()),
                onSuccess: function (JSONresponse, additionalInfo) {
                    PARAM = JSONresponse;
                    void 0;
                    if (typeof PARAM !== 'object')
                        loadParamsFromLocalFile(resolve, reject);
                    else
                        verifrom.dbStorage.set(verifrom.appInfo.extensionName + 'PARAMS', PARAM);
                    resolve();
                },
                onFailure: function (httpCode) { 
                    void 0;
                    loadParamsFromLocalFile(resolve, reject);
                },
                contentType: 'application/x-www-form-urlencoded',
                responseDataType: 'json',
                timeout: 5000
            });
        } catch (err) {
            void 0;
            reject(err);
        }
    });
}


function tabUpdateHandler (tabId, changeInfo, tab) {
    void 0;
    if (tab && tab.windowId)
        browser.notification.hide(extensionConfig.appInfo.name+"phishing",tab.windowId);
    else {
        browser.windows.getCurrent().then((w)=>{
            void 0
            if (w && w.id)
                browser.notification.hide(extensionConfig.appInfo.name+"phishing",w.id);
        });
    }

}

function setEventListeners() {

    verifrom.actionButton.onClicked(browser.browserAction,clickOnActionButton);
    verifrom.actionButton.onClicked(browser.messageDisplayAction,clickOnMessageDisplayActionButton);

    void 0;
    if (PARAM.OPTIONS.STOPPHISHING_BROWSING_ENABLED === true && ((options.userAuthentified === true && PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED === true) || PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED === false)) {
        void 0;
        if (browser.messageDisplay.onMessageDisplayed.hasListener(onMessageDisplayedHandler)===false)
            browser.messageDisplay.onMessageDisplayed.addListener(onMessageDisplayedHandler);
        if (browser.mailTabs.onSelectedMessagesChanged.hasListener(onSelectedMessagesChangedHandler)===false)
            browser.mailTabs.onSelectedMessagesChanged.addListener(onSelectedMessagesChangedHandler);
    } else {
        void 0;
        browserActionManager.setDefaultPopup("notAuthentified");
        displayActionManager.setDefaultPopup("notAuthentified");
    }

    verifrom.contextMenus.create({
        id: "reportsList",
        title: verifrom.locales.getMessage("reports.title"),
        contexts: ["tab"]
    });

    verifrom.contextMenus.create({
        id: "optionsFromTab",
        title: verifrom.locales.getMessage("options.title"),
        contexts: ["tab"]
    });

    verifrom.contextMenus.create({
        id: "report",
        title: verifrom.locales.getMessage("contentScript.sidebar.buttonlabel"),
        contexts: ["message_list"]
    });

    verifrom.contextMenus.create({
        id: "options",
        title: verifrom.locales.getMessage("options.title"),
        contexts: ["message_list"]
    });

    verifrom.contextMenus.create({
        id: "reportsListFromMessages",
        title: verifrom.locales.getMessage("reports.title"),
        contexts: ["message_list"]
    });

    verifrom.contextMenus.onClicked.removeListener(contextMenuHandler);
    verifrom.contextMenus.onClicked.addListener(contextMenuHandler);

    browser.tabs.onUpdated.removeListener(tabUpdateHandler);
    browser.tabs.onUpdated.addListener(tabUpdateHandler, {properties:["title"]});

    browser.tabs.onActivated.removeListener(tabUpdateHandler);
    browser.tabs.onActivated.addListener(tabUpdateHandler);
}

function setChromeExtensionEventListeners() {
    verifrom.extension.onInstalled(function () {
        void 0;
        resetDB("extension just installed");
        restoreOptions();
    });
    if (verifrom.appInfo.safari===false) {
        chrome.runtime.onUpdateAvailable.addListener(function (object) {
            void 0;
            chrome.runtime.reload();
        });

        if (verifrom.appInfo.uninstallURL)
            chrome.runtime.setUninstallURL(verifrom.appInfo.uninstallURL, function () {});
    }
}

function openOptionsMsgHandler(query) {
    void 0;
    verifrom.extension.openOptions(query);
}

function sendPhishingStat(msg) {
    try {
        verifrom.request.ajax({
            url: PARAM.URL_STATS_PHISHING,
            contentType: "application/json",
            cache: false,
            method: 'POST',
            type: 'POST',
            processData: false,
            data: JSON.stringify(msg),
            timeout: 120000,
            beforeSend: function (request) {
                request.setRequestHeader("Content-type", "application/json");
                request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                request.setRequestHeader('X-User-Agent',verifrom.appInfo.name + ' - Version ' + verifrom.appInfo.version + ' - ' + navigator.userAgent);
            },
            error: function (request, textStatus, errorThrown) {
                void 0;
            },
            success: function (HTTPResponse, textStatus, request) {
                void 0;
            }
        });
    } catch (err) {
        void 0;
    }
}

function ExceptionReportHandler(message) {
    if (!message)
        return;
    try {
        verifrom.request.ajax({
            url: PARAM.URL_REPORT_FAILURE,
            contentType: "application/json",
            cache: false,
            method: 'POST',
            type: 'POST',
            data: JSON.stringify(message),
            timeout: 120000,
            beforeSend: function (request) {
                request.setRequestHeader("Content-type", "application/json");
                request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                request.setRequestHeader('X-User-Agent',verifrom.appInfo.name + ' - Version ' + verifrom.appInfo.version + ' - ' + navigator.userAgent);
            },
            error: function (request, textStatus, errorThrown) {
                void 0;
            },
            success: function (HTTPResponse, textStatus, request) {
                void 0;
            }
        });
    } catch (err) {
        void 0;
    }
}

function PARAMSMsgHandler(msg, sender, sendResponse) {
    void 0;
    if (sender && sender.tab && sender.tab.id)
        void 0;
    else void 0;
    switch (msg.action) {
        case 'getParam':
            if (!PARAM || typeof PARAM !== 'object')
            {
                void 0;
                PARAM = verifrom.dbStorage.get(verifrom.appInfo.extensionName + 'PARAMS');
            }
            void 0;
            if (!PARAM || typeof PARAM !== 'object') {
                void 0;
                if (sendResponse && verifrom.appInfo.quantum === true)
                    sendResponse({});
                else
                    verifrom.message.toTab(sender.tab.id, {}, {channel: "PARAMS"});
            } else {
                if ('function'===typeof sendResponse)
                    Promise.resolve().then(()=>{sendResponse(PARAM)});
                else if (sender.tab && sender.tab.id)
                    verifrom.message.toTab(sender.tab.id, PARAM, {channel: "PARAMS"});
                else verifrom.message.toAllTabs(PARAM, {channel: "PARAMS"});
            }
            break;
        case 'setParam':
            void 0;
            verifrom.dbStorage.set(verifrom.appInfo.extensionName + 'PARAMS', msg.PARAM);
            break;
    }
}

function falsePositiveReport(msg) {
    if (msg) {
        void 0;
        msg.falsePositiveEmail = msg.phishingPageAlert!==true;
        try {
            verifrom.request.ajax({
                url: PARAM.URL_FALSE_POSITIVE,
                contentType: "application/json",
                cache: false,
                method: 'POST',
                type: 'POST',
                processData: false,
                data: JSON.stringify(msg),
                timeout: 120000,
                beforeSend: function (request) {
                    request.setRequestHeader("Content-type", "application/json");
                    request.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                    request.setRequestHeader('X-User-Agent',verifrom.appInfo.name + ' - Version ' + verifrom.appInfo.version + ' - ' + navigator.userAgent);
                },
                error: function (request, textStatus, errorThrown) {
                    void 0;
                },
                success: function (HTTPResponse, textStatus, request) {
                    void 0;
                }
            });
        } catch (err) {
            void 0;
        }
        if (msg.phishingHashes) {
            void 0;
            for (let i = 0; i < msg.phishingHashes.length; i++) {
                let hash = parseInt(msg.phishingHashes[i]);
                let ids = hashLinkArray.get(hash);
                verifrom.dbStorage.set(hash + '-falsePositive', {mutex: true}, verifrom.time.secondsFromNow(24 * 3600));
                if (ids.length>0)
                    for (let j = 0; j < ids.length; j++)
                        delete(hashLinkById[ids[j]]);
                hashLinkArray.delete(hash);
            }
            verifrom.dbStorage.set("phishingDB", JSON.stringify(hashLinkById));
        }
    } else {
        void 0;
    }
}

function displayNotification(msg) {
    verifrom.notifications.display(msg);
}

function alertUserOnCredentials(display) {
    if (display===true){
        browser.browserAction.setBadgeText({text:"!"});
        browser.browserAction.setBadgeBackgroundColor({color:"red"});
    } else {
        browser.browserAction.setBadgeText({text:""});
    }
}

function checkUserCredentials(userOKCallback, userNotOKCallback, values) {
    void 0;
    if (PARAM.OPTIONS.REPORT_USERACCOUNT_REQUIRED_ENABLED !== true && typeof userOKCallback === "function") {
        Promise.resolve().then(userOKCallback);
        return;
    }
    let optionsValue = values || options;
    if (!optionsValue.email || !optionsValue.password || optionsValue.email.length===0 || optionsValue.password.length===0)
    {
        void 0;
        if (typeof userNotOKCallback === 'function')
            Promise.resolve().then(userNotOKCallback);
        return;
    }

    try {
        void 0;
        let xmlhttp=new XMLHttpRequest;
        xmlhttp.withCredentials=true;
        xmlhttp.open("OPTIONS",PARAM.REPORT_API.SCHEME+PARAM.REPORT_API.HOSTNAME+PARAM.REPORT_API.PATHNAME,false,optionsValue.email,passwordDecrypt(optionsValue.password));
        xmlhttp.setRequestHeader("Content-type","application/x-www-form-urlencoded");
        xmlhttp.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
        xmlhttp.setRequestHeader('X-User-Agent',verifrom.appInfo.name + ' - Version ' + verifrom.appInfo.version + ' - ' + navigator.userAgent);
        xmlhttp.onreadystatechange=function()
        {
            if (xmlhttp.readyState==4)
            {
                if (xmlhttp.status>=200 && xmlhttp.status<300)
                {
                    void 0;
                    optionsValue.userAuthentified = true;
                    if (typeof userOKCallback === 'function')
                        Promise.resolve().then(()=>{userOKCallback(xmlhttp.status)});
                }
                else
                {
                    void 0;
                    optionsValue.userAuthentified = false;
                    void 0;
                    if (typeof userNotOKCallback === 'function')
                        Promise.resolve().then(()=>{userNotOKCallback(xmlhttp.status)});
                }
            }
        };
        xmlhttp.send(null);
    } catch (err) {
        void 0;
        optionsValue.userAuthentified = false;
        void 0;
        if (typeof userNotOKCallback === 'function')
            Promise.resolve().then(()=>{userNotOKCallback(500)});
    }
}

function refreshParams() {
    loadParams().then(()=>{
        void 0;
    }).catch((reason)=>{
        void 0;
    });
}


function cutEml(bodyToDisplay) {
    let limit = 7000;
    let bodyContentDisplayed = bodyToDisplay.substr(0, limit);
    if (bodyToDisplay.length > limit)
        bodyContentDisplayed += '\n[...]\n';
    if (bodyToDisplay.length > 2 * limit) {
        bodyContentDisplayed += bodyToDisplay.substr(bodyToDisplay.length - limit, limit);
    } else if (bodyToDisplay.length > (1.5 * limit)) {
        bodyContentDisplayed += bodyToDisplay.substr(bodyToDisplay.length - (limit / 2), limit / 2);
    }
    return bodyContentDisplayed;
}

function viewRawMessages(actionManager) {
    if (!actionManager.context)
        return; 

    let backToPreviousView=function() {
        let currentViewName=null;
        if (actionManager.context.multiple===false)
            currentViewName = "reportEmailView";
        else currentViewName = "reportMultipleEmailsView";
        delete actionManager.data["#rawMessage"];
        delete actionManager.data["#pageNumber"];
        actionManager.switch(currentViewName).then(()=>{
            listenPopupClicks(actionManager);
        }).catch((reason)=>{
            void 0;
        });
    };

    if (actionManager.context.multiple===false) {
        actionManager.switch("rawMessages").then(()=>{
            actionManager.onUnloaded(()=>{
                void 0;
                delete actionManager.data["#rawMessage"];
                actionManager.setPopup("reportEmailView",actionManager.data);
            },true); 
            actionManager.setElementVisibilty("#pager",false);
            browser.messages.getRaw(actionManager.context.messageId).then(rawMessage => {
                actionManager.data["#rawMessage"] = {textContent: cutEml(anonymizeMailHeader(rawMessage, actionManager.context.subject, actionManager.context.sender))};
                actionManager.updateView();
                actionManager.setElementVisibilty("#spinner",false);
            });
            actionManager.addEventListener(".zommOnOriginalDiv", "click", backToPreviousView, true);
        }).catch(reason=>{
            void 0;
        });
    } else {
        void 0;
        let currentPage = 0;
        let nbPages = actionManager.context.messages.length;
        let updateMessage=function () {
            void 0;
            actionManager.setElementVisibilty("#spinner",true);
            browser.messages.getRaw(actionManager.context.messages[currentPage].messageId).then(rawMessage => {
                void 0;
                actionManager.data["#rawMessage"] = {textContent: cutEml(anonymizeMailHeader(rawMessage, actionManager.context.messages[currentPage].subject, actionManager.context.messages[currentPage].sender))};
                actionManager.data["#pageNumber"] = {textContent:`${currentPage+1} / ${nbPages}`};
                actionManager.updateView();
                actionManager.setElementVisibilty("#pager",true);
                actionManager.setElementVisibilty("#spinner",false);
            }).catch(reason => {
                void 0;
                if (currentPage !== 0) {
                    currentPage = 0;
                    updateMessage();
                }
            });
        };
        actionManager.switch("rawMessages").then(()=>{
            actionManager.onUnloaded(()=>{
                delete actionManager.data["#rawMessage"];
                delete actionManager.data["#pageNumber"];
                actionManager.setPopup("reportMultipleEmailsView",actionManager.data);
            },true); 

            actionManager.addEventListener(".zommOnOriginalDiv", "click", backToPreviousView, true);
            actionManager.addEventListener("#previous","click", function () {
                if (currentPage - 1 >= 0) {
                    currentPage--;
                    updateMessage();
                }
            });
            actionManager.addEventListener("#next","click", function () {
                if (currentPage + 1 < nbPages) {
                    currentPage++;
                    updateMessage();
                }
            });
            updateMessage();
        }).catch(reason=>{
            void 0;
        });
    }
}

let previousJunkFolders=new Map();
function findJunkFolderForAccount(accountId) {
    return new Promise((resolve,reject)=>{
        if (previousJunkFolders.has(accountId))
            resolve(previousJunkFolders.get(accountId));
        else {
            browser.accounts.get(accountId).then(account => {
                let junkFolder=null;
                function traverse(folders) {
                    if (!folders) {
                        return;
                    }
                    for (let f of folders) {
                        if (f.type === "junk") {
                            junkFolder = f;
                            return f;
                        }
                    }
                    for (let f of folders) {
                        if (f.subFolders)
                            traverse(f.subFolders);
                        if (junkFolder)
                            break;
                    }
                }
                traverse(account.folders);
                if (junkFolder) {
                    previousJunkFolders.set(accountId,junkFolder);
                    resolve(junkFolder);
                } else reject();
            });
        }
    });
}

function markMessageAsReadAndJunk(messageId) {

    setTimeout(()=>{
        browser.messages.get(messageId).then(message=>{
            void 0;
            if (message.folder && options.movereport===true) {
                findJunkFolderForAccount(message.folder.accountId).then(junkFolder=>{
                    if (message.junk===false || message.read===false) {
                        let attr = {read:message.read,junk:message.junk};
                        if (options.markread)
                            attr.read = true;
                        if (options.markspam)
                            attr.junk = true;
                        if (attr.read || attr.junk)
                            browser.messages.update(messageId, attr);
                    }
                    if (junkFolder.path!==message.folder.path) {
                        browser.messages.move([messageId], junkFolder);
                    }
                }).catch(()=>{
                    void 0;
                });
            } else {
                if (message.junk===false || message.read===false) {
                    let attr = {read:message.read,junk:message.junk};
                    if (options.markread)
                        attr.read = true;
                    if (options.markspam)
                        attr.junk = true;
                    if (attr.read || attr.junk)
                        browser.messages.update(messageId, attr);
                }
            }
        }).catch(reason=>{
            void 0;
        });
    },500); 
}

function contextMenuHandler(info, tab) {
    if (typeof tab!=="object") {
        void 0;
        browser.tabs.query({
            active:true
        }).then((tabsArray)=>{
            if (tabsArray && tabsArray.length) {
                for (let tabc of tabsArray) {
                    if (tabc.url===info.pageUrl)
                        return contextMenuHandler(info, tabc);
                }
                void 0;
            }
        }).catch((reason)=>{
            void 0;
        });
        return;
    }
    void 0;
    switch (info.menuItemId) {
        case 'report':
            onSelectedMessagesChangedHandler(tab,info.selectedMessages);
            clickOnActionButton.apply(verifrom.actionButton.instanceForTab(tab.id, tab.mailTab===true ? browser.browserAction : browser.messageDisplayAction),tab,info);
            break;
        case 'reportsListFromMessages':
        case 'reportsList':
            openReportsList();
            break;
        case 'options':
        case 'optionsFromTab':
            verifrom.extension.openOptions();
            break;
    }
}

function onSelectedMessagesChangedHandler(tab,messageList) {
    if (typeof tab!=="object") {
        void 0;
        browser.tabs.query({
            active:true,
            lastFocusedWindow:true
        }).then((tabsArray)=>{
            if (tabsArray && tabsArray.length) {
                onSelectedMessagesChangedHandler(tabsArray[0],messageList);
            }
        }).catch((reason)=>{
            void 0;
        });
        return;
    }

    void 0;
    if (!messageList || !messageList.messages) {
        void 0;
        return;
    }

    if (messageList.messages.length===1) {
        let data = {
            "#fromvalue" : {textContent: messageList.messages[0].author},
            "#emailsubject" : {textContent: messageList.messages[0].subject}
        };
        let actionManager = verifrom.actionButton.instanceForTab(tab.id,browser.browserAction);
        actionManager.setPopup("reportEmailView", data);
        actionManager.context = { privacy: options.privacy, feedbackRequested: options.FEEDBACK, multiple: false, messageId: messageList.messages[0].id, folder: messageList.messages[0].junk ? 1 : 2, subject: messageList.messages[0].subject,sender: messageList.messages[0].author};
        actionManager.updateView(data);
        void 0;
    } else if (messageList.messages.length>1) {
        let data = {
            "#VFSELECTEDMAILS" : {textContent: messageList.messages.length}
        };
        let actionManager = verifrom.actionButton.instanceForTab(tab.id,browser.browserAction);
        actionManager.setPopup("reportMultipleEmailsView", data);
        let messages=[];
        for (let message of messageList.messages)
            messages.push({messageId:message.id,folder:message.junk?1:2, subject:message.subject, sender:message.author});
        actionManager.context = { privacy: options.privacy, feedbackRequested: options.FEEDBACK, multiple: true, messages: messages};
        actionManager.updateView(data);
        void 0;
    } else {
        let actionManager = verifrom.actionButton.instanceForTab(tab.id,browser.browserAction);
        actionManager.setPopup("menu", null);
        actionManager.context = null;
        actionManager.updateView(null);
    }
}


var latestCheck=null, checkUrlsPromise = null, cancelPromise = null;
function onMessageDisplayedHandler(tab,message) {
    void 0;

    if (typeof tab!=="object") {
        void 0;
        browser.tabs.query({
            active:true,
            lastFocusedWindow:true
        }).then((tabsArray)=>{
            if (tabsArray && tabsArray.length) {
                onMessageDisplayedHandler(tabsArray[0],message);
            }
        }).catch((reason)=>{
            void 0;
        });
        return;
    }

    browser.messages.getFull(message.id).then(fullMail=>{
        void 0;
        let urls = extractURLs(fullMail.parts);
        void 0;
        let data = {
            "#fromvalue" : {textContent: message.author},
            "#emailsubject" : {textContent: message.subject}
        };
        let actionManager = verifrom.actionButton.instanceForTab(tab.id,browser.messageDisplayAction);
        actionManager.context = { privacy: options.privacy, feedbackRequested: options.FEEDBACK, multiple: false, messageId: message.id, folder: message.junk ? 1 : 2 , subject:message.subject, sender:message.author, urls: urls};
        actionManager.setPopup("reportEmailView", data);
        if (typeof cancelPromise==="function") {
            void 0;
            cancelPromise();
        } else void 0;
        latestCheck = Date.now();
        let checker = checkForPhishing(urls, latestCheck, (phishing, checkId) => {
            if (phishing===false) {
                void 0;
                return;
            }
            if (checkId < latestCheck) {
                void 0;
                cancelPromise();
                return;
            }
            let phishingAlertMsg = verifrom.locales.getMessage("contentScript.sidebar.phishingtitle")+" - "+verifrom.locales.getMessage("contentScript.sidebar.phishingdetected");
            browser.notification.show(
                extensionConfig.appInfo.name+"phishing",
                phishingAlertMsg,
                chrome.runtime.getURL(extensionConfig.appInfo.phishingAlertIcon || "logo/32x32.png"),
                [
                    {
                        label: verifrom.locales.getMessage("contentScript.sidebar.phishingfalseposbutton"),
                        popup: null,
                        isDefault: true
                    }
                ],
                tab.windowId,
                null
            );
        });
        checkUrlsPromise = checker.checkUrlsPromise;
        cancelPromise = checker.cancelPromise;
        void 0;
        void 0;
        checkUrlsPromise.then(({phishingUrls, phishingHashes, phishingStatus})=>{
            if (phishingStatus!==true) {
                browser.notification.hide(extensionConfig.appInfo.name+"phishing",tab.windowId);
                return;
            }
            void 0;
            browser.notification.onClicked.addListener(function (label) {
                void 0;
                switch(label) {
                case verifrom.locales.getMessage("contentScript.sidebar.phishingfalseposbutton"):
                    falsePositiveReport({
                        phishingPageAlert:false,
                        phishingHashes:phishingHashes,
                        phishingLinks:phishingUrls
                    });
                break;
                case verifrom.locales.getMessage("contentScript.sidebar.buttonlabel"):
                    clickOnMessageDisplayActionButton(tab);
                break;
                default:
                    void 0;
                break;
                }
                return false;
            });
            browser.notification.onDismissed.addListener(function() {
                void 0;
                return false;
            });
            browser.notification.onRemoved.addListener(function() {
                void 0;
                browser.notification.hide(extensionConfig.appInfo.extensionName,tab.windowId);
                return false;
            });
        }).catch(reason=>{
            browser.notification.hide(extensionConfig.appInfo.name+"phishing",tab.windowId);
        });
    }).catch(e=>{
        void 0;
    });
}

async function listenPopupClicks(actionManager) {
    void 0;
    try {
        switch(actionManager.viewName) {
            case "menu":
                actionManager.addEventListener("#previousReports","click", openReportsList, true);
                actionManager.addEventListener("#options","click", openOptionsMsgHandler, true);
                break;
            case "reportEmailView":
            case "reportMultipleEmailsView":
                let clickOnReportButton = function() {
                    let context = actionManager.context;
                    if (context && context.multiple === false) {
                        actionManager.switch("sendingSingleReportView").catch(reason=>{
                            void 0
                        });
                        browser.messages.getRaw(context.messageId).then(rawMessage => {
                            reportEmail({
                                "subject": context.subject,
                                "sender": context.sender,
                                "privacy": context.privacy,
                                "feedbackRequested": context.feedbackRequested,
                                "payLoad": {
                                    "action": "signalRawMail",
                                    "email": anonymizeMailHeader(rawMessage, context.subject, context.sender),
                                    "folder": context.folder
                                }
                            }).then(() => {
                                actionManager.switch("singleReportSentView").then(()=>{
                                    listenPopupClicks(actionManager);
                                }).catch(reason=>{
                                    void 0;
                                    actionManager.close();
                                });
                                markMessageAsReadAndJunk(context.messageId);
                            }).catch(reason => {
                                void 0;
                                setTimeout(()=>{
                                    actionManager.switch("singleReportFailedView").then(() => {
                                        actionManager.updateView({
                                            "#failureReason": {textContent: reason}
                                        });
                                        listenPopupClicks(actionManager);
                                    }).catch(reason=>{
                                        void 0;
                                        actionManager.close();
                                    });
                                },500);
                            });
                        }).catch(reason => {
                            void 0;
                            actionManager.switch("singleReportFailedView").then(() => {
                                actionManager.updateView({
                                    "#failureReason": {textContent: reason}
                                });
                                listenPopupClicks(actionManager);
                            }).catch(reason=>{
                                void 0;
                                actionManager.close();
                            });
                        });
                    } else if (context && context.multiple === true) {
                        actionManager.switch("sendingReportsView").catch(reason=>{
                            void 0;
                        });
                        let nbReports = context.messages.length;
                        let nbSuccess = 0;
                        let nbErrors = 0;
                        let lastError =
                            actionManager.updateView({
                                "#reportsNumber": {"textContent": nbReports}
                            });
                        let reportDone = function (success) {
                            nbReports--;
                            nbSuccess += success;
                            nbErrors += !success;
                            actionManager.updateView({
                                "#reportsNumber": {"textContent": nbReports}
                            });
                            if (nbReports <= 0) {
                                if (nbErrors === 0) {
                                    actionManager.switch("multipleReportsSentView").then(()=>{
                                        listenPopupClicks(actionManager);
                                    }).catch(reason=>{
                                        void 0;
                                        actionManager.close();
                                    });
                                } else {
                                    setTimeout(()=>{
                                        actionManager.switch("multipleReportsFailedView").then(() => {
                                            actionManager.updateView({
                                                "#successNumber": {textContent: nbSuccess},
                                                "#failureNumber": {textContent: nbErrors},
                                                "#failureReason": {textContent: lastError}
                                            });
                                            listenPopupClicks(actionManager);
                                        }).catch(reason=>{
                                            void 0;
                                            actionManager.close();
                                        });
                                    },500);
                                }
                            }
                        };
                        for (let message of context.messages) {
                            browser.messages.getRaw(message.messageId).then(rawMessage => {
                                reportEmail({
                                    "subject": message.subject,
                                    "sender": message.sender,
                                    "privacy": context.privacy,
                                    "feedbackRequested": context.feedbackRequested,
                                    "payLoad": {
                                        "action": "signalRawMail",
                                        "email": anonymizeMailHeader(rawMessage, message.subject, message.sender),
                                        "folder": message.folder
                                    }
                                }).then(() => {
                                    reportDone(1);
                                    markMessageAsReadAndJunk(message.messageId);
                                }).catch(reason => {
                                    lastError = reason;
                                    reportDone(0);
                                });
                            }).catch(reason => {
                                lastError = reason;
                                reportDone(0);
                            });
                        }
                    } else {
                        actionManager.switch("singleReportFailedView").then(() => {
                            actionManager.updateView({
                                "#failureReason": {textContent: verifrom.locales.getMessage("contentScript.notificationMessage.error2")}
                            }).then(()=>{
                                listenPopupClicks(actionManager);
                            }).catch(reason=>{
                                void 0;
                            });
                        }).catch(reason=>{
                            void 0;
                        });
                    }
                };
                if (options.oneClickOption===true)
                    clickOnReportButton();
                else {
                    actionManager.addEventListener("#SigSpamOKBox", "click", clickOnReportButton, true);
                    actionManager.addEventListener("#zoomOriginalEmail", "click", viewRawMessages.bind(this,actionManager));
                    }
                break;
            default:
                if (options.oneClickOption===true && (actionManager.viewName==="singleReportSentView" || actionManager.viewName==="multipleReportsSentView"))
                    setTimeout(()=>{actionManager.close()}, 3000);
                else
                    actionManager.addEventListener("#SigSpamOKBox","click", ()=>{
                        actionManager.close();
                        actionManager.resetPopup();
                    }, true);
                break;
        }
    } catch(e) {
        void 0;
    }
}

function clickOnActionButton(tab,info) {
    void 0;
    if (info && info.modifiers && info.modifiers.length>0) {
        this.setDefaultPopup("menu");
        this.openDefault().then((actionManager)=>{
            void 0;
            listenPopupClicks(actionManager);
        });
        return;
    }
    if (PARAM.OPTIONS.REPORT_USERACCOUNT_REQUIRED_ENABLED === true && options.userAuthentified !== true) {
        this.setDefaultPopup("notAuthentified");
        this.openDefault();
    } else {
        try {
            if (options.userAuthentified === false && (PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED === true || PARAM.OPTIONS.REPORT_USERACCOUNT_REQUIRED_ENABLED === true)) {
                this.setDefaultPopup("notAuthentified");
                this.openDefault();
            } else {
                void 0;
                this.setDefaultPopup("menu");
                this.open().then((actionManager)=>{
                    if (!actionManager.context) {
                        browser.mailTabs.getSelectedMessages(tab.id).then(messageList => {
                            onSelectedMessagesChangedHandler(tab, messageList);
                        });
                    }
                    listenPopupClicks(actionManager);
                }).catch(reason=>{
                    void 0;
                });
            }
        } catch(e) {
            void 0;
        }
    }
    return false;
}

function clickOnMessageDisplayActionButton(tab,info) {
    void 0;
    if (PARAM.OPTIONS.REPORT_USERACCOUNT_REQUIRED_ENABLED === true && options.userAuthentified !== true) {
        this.setDefaultPopup("notAuthentified");
        this.openDefault();
        return;
    }
    this.open("reportEmailView").then((actionManager)=>{
        if (!actionManager.context) {
            browser.mailTabs.getSelectedMessages(tab.id).then(messageList => {
                onSelectedMessagesChangedHandler(tab, messageList);
            });
        }
        listenPopupClicks(actionManager);
    });
}

function compareversion(version1,version2){

    if (!version1 || !version2)
        return false;
    let result=false;

    if(typeof version1!=='object'){ version1=version1.toString().split('.'); }
    if(typeof version2!=='object'){ version2=version2.toString().split('.'); }

    for(let i=0;i<(Math.max(version1.length,version2.length));i++){

        if(version1[i]==undefined){ version1[i]=0; }
        if(version2[i]==undefined){ version2[i]=0; }

        if(Number(version1[i])<Number(version2[i])){
            result=true;
            break;
        }
        if(version1[i]!=version2[i]){
            break;
        }
    }
    return(result);
}

function notificationUpdateClick(url) {
    void 0;
    verifrom.tabs.create({
        "url": url
    },()=>{
        void 0;
    });
}

function notifyUpdate() {
    try {
        if (!verifrom.appInfo.updateManifestURL.display || !verifrom.appInfo.updateManifestURL || (!verifrom.appInfo.updateManifestURL[verifrom.getLoadedLocale()] && !verifrom.appInfo.updateManifestURL.en))
            return;
        let url = verifrom.appInfo.updateManifestURL[verifrom.getLoadedLocale()] || verifrom.appInfo.updateManifestURL["en"];
        let manifest = browser.runtime.getManifest();
        let title = manifest.name || extensionConfig.appInfo.extensionName;
        verifrom.request.get({
            url: url,
            onSuccess: function (HTMLresponse, additionalInfo) {
                displayNotification({
                    id:extensionConfig.appInfo.extensionCodeName+"UPDATE",
                    title: title,
                    message:verifrom.locales.getMessage("update.updated") + (manifest ? "("+manifest.version+")" : ""),
                    onClicked:notificationUpdateClick.bind(null,url)
                });
            },
            onFailure: function (httpCode) { 
                void 0;
            },
            contentType: 'application/x-www-form-urlencoded',
            responseDataType: 'html'
        });
    } catch (e) {
        void 0;
    }
}

function notifyInstall() {
    try {
        if (!verifrom.appInfo.installManifestURL.display || !verifrom.appInfo.installManifestURL || (!verifrom.appInfo.installManifestURL[verifrom.getLoadedLocale()] && !verifrom.appInfo.installManifestURL.en))
            return;
        let url = verifrom.appInfo.installManifestURL[verifrom.getLoadedLocale()] || verifrom.appInfo.installManifestURL["en"];

        verifrom.request.get({
            url: url,
            onSuccess: function (HTMLresponse, additionalInfo) {
                notificationUpdateClick(url);
            },
            onFailure: function (httpCode) { 
                void 0;
            },
            contentType: 'application/x-www-form-urlencoded',
            responseDataType: 'html'
        });
    } catch (e) {
        void 0;
    }
}

function checkUpdate() {
    void 0;
    let lastExtensionVersion = verifrom.dbStorage.get(verifrom.appInfo.extensionName + '_Version');
    verifrom.dbStorage.set(`${verifrom.appInfo.extensionName}_Version`, {version: verifrom.appInfo.version});
    if (typeof lastExtensionVersion === 'object' && compareversion(lastExtensionVersion.version,verifrom.appInfo.version)) {
        if (verifrom.appInfo.updateManifestURL.display === true) {
            notifyUpdate();
        }
    } else if ((typeof lastExtensionVersion !== 'object' || typeof lastExtensionVersion.version !== 'string') && typeof verifrom.appInfo.installManifestURL === 'object' && verifrom.appInfo.installManifestURL.display === true && verifrom.appInfo.installManifestURL[verifrom.getLoadedLocale()].length > 0) {
        if (verifrom.appInfo.updateManifestURL.display === true) {
            notifyInstall();
        }
    }
}

function setMessageListeners() {
    void 0;
    verifrom.message.addListener({channel: "notification"}, displayNotification);
    verifrom.message.addListener({channel: "PARAMS"}, PARAMSMsgHandler);
    verifrom.message.addListener({channel: "openOptions"}, openOptionsMsgHandler);
    if ("function"===typeof reportsTabsHandler)
        verifrom.message.addListener({channel: 'reportsTab'}, reportsTabsHandler);
    if ("function"===typeof deleteReports)
        verifrom.message.addListener({channel: 'deleteReports'}, deleteReports);
    if ("function"===typeof resetBadge)
        verifrom.message.addListener({channel: 'resetBadge'}, resetBadge);
}

async function startExtension() {
    void 0;
    await loadParams();
    if (!PARAM || typeof PARAM !== 'object') {
        void 0;
        displayNotification(verifrom.locales.getMessage("critical.noparams"));
        return;
    }
    setChromeExtensionEventListeners();
    await restoreOptions();
    checkUserCredentials();
    if (options.userAuthentified===true || PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED !== true)
        Promise.resolve().then(loadDBRecords);
    setMessageListeners();
    setEventListeners();
    if (options.userAuthentified===false && PARAM.OPTIONS.STOPPHISHING_USERACCOUNT_REQUIRED_ENABLED===true)
        alertUserOnCredentials(true);
    verifrom.settings.get(
            PARAM.USER_SETTINGS.DEFAULT,
            function (items) {
                items.firstTime = false;
                verifrom.settings.set(items, function () {
                });
            }
    );
    if ("function"===typeof openReportsDB)
        Promise.resolve().then(openReportsDB);
    verifrom.settings.onChanged.addListener(optionsUpdate);
    setInterval(refreshParams, 3600000);
    checkUpdate();
}


function base64Encode(str) {
    let charBase64 = new Array(
        'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
        'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f',
        'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
        'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '/'
    );

    let out = "";
    let chr1, chr2, chr3;
    let enc1, enc2, enc3, enc4;
    let i = 0;

    let len = str.length;

    do {
        chr1 = str.charCodeAt(i++);
        chr2 = str.charCodeAt(i++);
        chr3 = str.charCodeAt(i++);

        enc1 = chr1 >> 2;
        enc2 = ((chr1 & 0x03) << 4) | (chr2 >> 4);
        enc3 = ((chr2 & 0x0F) << 2) | (chr3 >> 6);
        enc4 = chr3 & 0x3F;

        out += charBase64[enc1] + charBase64[enc2];
        if (out.length % 79 == 78)
            out += '\n';
        if (isNaN(chr2)) {
            out += '==';
        } else if (isNaN(chr3)) {
            out += charBase64[enc3] + '=';
        } else {
            out += charBase64[enc3] + charBase64[enc4];
        }
        if (out.length % 79 == 78)
            out += '\n';
    } while (i < len);
    return out;
}

function encode(string) {
    let result = "";
    let s = string.replace(/\r\n/g, "\n");
    for (let index = 0; index < s.length; index++) {
        let c = s.charCodeAt(index);

        if(c < 128) {
            result += String.fromCharCode(c);
        }
        else if((c > 127) && (c < 2048)) {
            result += String.fromCharCode((c >> 6) | 192);
            result += String.fromCharCode((c & 63) | 128);
        }
        else {
            result += String.fromCharCode((c >> 12) | 224);
            result += String.fromCharCode(((c >> 6) & 63) | 128);
            result += String.fromCharCode((c & 63) | 128);
        }
    }
    return result;
}

function decode(string) {
    let result = "";
    let index = 0;
    let c = c1 = c2 = 0;

    while(index < string.length) {
        c = string.charCodeAt(index);

        if(c < 128) {
            result += String.fromCharCode(c);
            index++;
        }
        else if((c > 191) && (c < 224)) {
            c2 = string.charCodeAt(index + 1);
            result += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
            index += 2;
        }
        else {
            c2 = string.charCodeAt(index + 1);
            c3 = string.charCodeAt(index + 2);
            result += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
            index += 3;
        }
    }
    return result;
}

function passwordEncrypt(string) {
    return btoa(encode(string));
}

function passwordDecrypt(string){
    return decode(atob(string));
}

function optionsUpdate(newSettings) {
    let userWasAuthentified = options ? options.userAuthentified : false;
    if (verifrom.appInfo.safari!==true) {
        let _newSettings={};
        let settingKeys=Object.keys(newSettings);
        for (let i=0;i<settingKeys.length;i++) {
            if (typeof newSettings[settingKeys[i]].newValue!=='undefined')
                _newSettings[settingKeys[i]]=newSettings[settingKeys[i]].newValue;
        }
        newSettings=_newSettings;
    }

    verifrom.settings.get(PARAM.USER_SETTINGS.DEFAULT,
        function (currentSettings) {
            void 0;
            let items=verifrom.merge(PARAM.USER_SETTINGS.DEFAULT,currentSettings,newSettings);
            let settingKeys=Object.keys(PARAM.USER_SETTINGS.DEFAULT);
            let settingsChanged=false;
            for (let i=0;i<settingKeys.length;i++) {
                let settingKey=settingKeys[i];
                if (typeof newSettings[settingKey] !== 'undefined' && options[settingKey] != newSettings[settingKey]) {
                    options[settingKey] = items[settingKey];
                    settingsChanged=true;
                    void 0;
                }
            }
            if (settingsChanged)
                verifrom.settings.set(items,function(items) {
                    if (!userWasAuthentified && options.userAuthentified === true) {
                        options.userAuthentified = true;
                        loadDBRecords();
                        setEventListeners();
                        setMessageListeners();
                        alertUserOnCredentials(false);
                    }
                });
        }
    );
}


try {
    startExtension();
} catch(e) {
    void 0;
    ExceptionReportHandler(e);
}

