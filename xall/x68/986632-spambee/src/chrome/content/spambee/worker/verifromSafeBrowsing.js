(function() {

    let sharedWorkerDisabled = false;
    void 0;
    try {
        let w=new SharedWorker("");
        if (w && typeof w.terminate==="function")
            w.terminate();
    } catch (e) {
        sharedWorkerDisabled = /insecure/i.test(e.message);
        if (sharedWorkerDisabled)
            void 0;
    }


    if (sharedWorkerDisabled===false && typeof self.importScripts === "function") {
        void 0;
        self.importScripts('chrome://spambee/content/spambee/extensionConfig.js');
        self.importScripts('chrome://spambee/content/spambee/include/verifrom_api.js');
        self.importScripts('chrome://spambee/content/spambee/include/xxhash.js');
        self.importScripts('chrome://spambee/content/spambee/include/uint64.js');
        self.importScripts('chrome://spambee/content/spambee/include/xxhash64.js');
        void 0;
    } else {
        if (sharedWorkerDisabled===false && typeof self.importScripts !== "function") {
            void 0;
            return;
        } else {
            void 0;
            var inMemoryLastReset=null;
            var inMemoryLastUpdate=null;
        }
    }

    void 0;

    var PARAM;
    var hashLinkArray = new Map();
    var linksArray = {};
    var checkHostHashCache = new Map();
    var socketClient = null;
    var socketPort = undefined;
    var hostHashTable = [];
    var hostAnalyticsTimeout;
    var pendingSignaling = [];

    var hashTableId = 1;
    var lastResetId = 1;
    var lastTimestampId = 2;

    var reportsDBName = "spambee";
    var reportsCollection = "reports";
    var pendingReports = new Set();
    var pendingReportsTimeout = null;
    var reportsTabs = new Set();
    var updatedReportsNumber = 0;

    var listeningWorkers = [];

    function notifyAllWorkerListeners(msg, optionsObject) {
        if (!optionsObject.channel)
            throw "notifyAllWorkerListeners - missing channel in options";
        void 0;
        for (var i = 0; i < listeningWorkers.length; i++)
            listeningWorkers[i].postMessage(msg, optionsObject);
    }

    function openReportsDB() {
        if (extensionConfig.appInfo.localReportsDB !== true)
            return;
        verifrom.indexeddb.open(reportsDBName, reportsCollection
            , {keyPath: 'UID', autoIncrement: false}
            , 1
            , function (event) {
                void 0;
                loadReports();
                setTimeout(cleanReports, 20000);
                setInterval(cleanReports, 3600000);
            }
            , function () {
                void 0;
            }
            , function () {
                void 0;
            }
        );
    }

    function updateReport(UID, status, timestamp) {
        if (extensionConfig.appInfo.localReportsDB !== true)
            return;
        verifrom.indexeddb.objectStore.getItem(reportsDBName, reportsCollection, UID
            , function (item) {
                void 0;
                if (!timestamp || Date(timestamp).toString() === 'Invalid Date')
                    timestamp = Date.now();
                if (item && item.result) {
                    pendingReports.delete(UID);
                    var report = item.result;
                    if (report.feedbackRequested) {
                        report.feedbackTime = parseInt(timestamp);
                        notifyAllWorkerListeners({UID: UID}, {channel: "reportsNotification"});
                    }
                    updatedReportsNumber++;
                    report.status = status;
                    verifrom.indexeddb.objectStore.putItem(reportsDBName, reportsCollection, report
                        , function () {
                            void 0;
                            notifyAllWorkerListeners({
                                "reports": [{
                                    UID: UID,
                                    t: timestamp,
                                    s: status
                                }]
                            }, {channel: "reportsUpdate"});
                        }
                        , function () {
                            void 0;
                        }
                    );
                }
            }
            , function () {
                void 0;
            }
        );
    }

    function deleteReports(message, callback) {
        if (extensionConfig.appInfo.localReportsDB !== true)
            return;
        var items;
        if (message instanceof Array)
            items = message;
        else if (typeof message === "object" && message.reports)
            items = message.reports;
        else return void 0;

        if (items && items.length > 0) {
            for (var i = 0; i < items.length; i++) {
                var UID = items[i];
                pendingReports.delete(UID);
                verifrom.indexeddb.objectStore.deleteItem(reportsDBName, reportsCollection, UID
                    , function () {
                        void 0;
                        if (typeof callback === "function")
                            callback();
                    }
                    , function () {
                        void 0;
                    }
                );
            }
            var Request = verifrom.Request;
            Request({
                url: PARAM.URL_DELETE_REPORT,
                contentType: "application/json",
                headers: {
                    'X-User-Agent': verifrom.appInfo.name + ' - Version ' + verifrom.appInfo.version + ' - ' + navigator.userAgent + ' - '
                },
                content: JSON.stringify({reports: items}),
                timeout: 280000,
                anonymous: true,
                onComplete: function (authResponse) {
                    if (authResponse.status === 200) {
                        void 0;
                    } else {
                        void 0;
                    }
                }
            }).delete();
        } else {
            void 0;
        }
    }

    function addReport(UID, report) {
        if (extensionConfig.appInfo.localReportsDB !== true)
            return;
        report.UID = UID;
        report.time = Date.now();
        pendingReports.add(UID);
        if (!pendingReportsTimeout)
            pendingReportsTimeout = setTimeout(updateReports, 60000);
        var reportToStore = JSON.parse(JSON.stringify(report));
        if (typeof reportToStore.payLoad !== "undefined")
            delete reportToStore.payLoad;
        verifrom.indexeddb.objectStore.addItem(reportsDBName, reportsCollection, report
            , function () {
                void 0;
                notifyAllWorkerListeners(report, {channel: "newReport"});
            }
            , function () {
                void 0;
            }
        );
    }

    function cleanReports() {
        if (extensionConfig.appInfo.localReportsDB !== true)
            return;
        verifrom.indexeddb.objectStore.getAllItems(reportsDBName, reportsCollection
            , function (items) {
                void 0;
                if (items) {
                    var beforeTimeStamp = Date.now() - parseInt(PARAM ? PARAM.REPORTS_MAX_AGE : 10*24*3600*1000);
                    var reportsDeleted = false;
                    var reportsToDelete = [];
                    void 0;
                    for (var i = 0; i < items.length; i++) {
                        var reportTime = items[i].time || items[i].reportId;
                        if (reportTime < beforeTimeStamp) {
                            pendingReports.delete(items[i].UID);
                            reportsToDelete.push(items[i].UID);
                        }
                    }
                    if (reportsToDelete.length > 0) {
                        var numberToDelete = reportsToDelete.length;
                        for (var i = 0; i < items.length; i++) {
                            verifrom.indexeddb.objectStore.deleteItem(reportsDBName, reportsCollection, reportsToDelete[i]
                                , function () {
                                    void 0;
                                    reportsDeleted = true;
                                    numberToDelete--;
                                    if (numberToDelete === 0)
                                        notifyAllWorkerListeners({}, {channel: "reportsDeleted"});
                                },
                                function () {
                                    void 0;
                                    numberToDelete--;
                                    if (numberToDelete === 0)
                                        notifyAllWorkerListeners({}, {channel: "reportsDeleted"});
                                }
                            )
                        }
                    }
                }
            }
            , function () {
                void 0;
            }
        );
    }

    function loadReports(callback) {
        if (extensionConfig.appInfo.localReportsDB !== true)
            return;
        verifrom.indexeddb.objectStore.getAllItems(reportsDBName, reportsCollection
            , function (items) {
                var beforeTimeStamp = Date.now() - (90 * 1000);
                if (items) {
                    void 0;
                    for (var i = 0; i < items.length; i++) {
                        var reportTime = items[i].time || items[i].reportId;
                        if ((!items[i].status || items[i].status === 'pending') && reportTime < beforeTimeStamp)
                            pendingReports.add(items[i].UID);
                    }
                }
                if (pendingReports.size > 0)
                    pendingReportsTimeout = setTimeout(updateReports, 60000);
                if (typeof callback === "function")
                    callback({reports: items});
            }
            , function () {
                if (typeof callback === "function")
                    callback({reports: []});
                void 0;
            }
        );
    }

    function updateReports(JSONList) {
        if (extensionConfig.appInfo.localReportsDB !== true)
            return;
        var updates = false;
        var toProcess = pendingReports.size;
        pendingReportsTimeout = null;
        var _finally = function () {
            toProcess--;
            if (pendingReportsTimeout)
                clearTimeout(pendingReportsTimeout);
            pendingReportsTimeout = setTimeout(updateReports, 60000);
        };
        if (pendingReports.size <= 0) {
            _finally();
            return;
        }
        if (!PARAM) {
            _finally();
            return;
        }

        var applyUpdates = function (JSONresponse) {
            if (JSONresponse && JSONresponse.length > 0) {
                for (var i = 0; i < JSONresponse.length; i++) {
                    var reportStatus = JSONresponse[i];
                    if (reportStatus.s !== "pending") {
                        void 0;
                        pendingReports.delete(reportStatus.UID);
                        updateReport(reportStatus.UID, reportStatus.s, reportStatus.t);
                        updates = true;
                        _finally(JSONresponse);
                    } else _finally(JSONresponse);
                }
            } else {
                toProcess = 0;
                _finally(JSONresponse);
            }
        };

        if (!JSONList) {
            var Request = verifrom.Request;
            Request({
                url: PARAM.URL_CHECK_STATUS,
                contentType: 'application/json; charset=utf-8',
                responseDataType: 'json',
                headers: {
                    'X-User-Agent': verifrom.appInfo.name + ' - Version ' + verifrom.appInfo.version + ' - ' + navigator.userAgent + ' - '
                },
                content: JSON.stringify(Array.from(pendingReports)),
                timeout: 30000,
                anonymous: true,

                onComplete: function (authResponse) {
                    switch (authResponse.status) {
                        case 200:
                        case 201:
                        case 202:
                        case 204:
                            void 0;
                            var JSONresponse = JSON.parse(authResponse.response);
                            applyUpdates(JSONresponse);
                            break;
                        default:
                            void 0;
                            toProcess = 0;
                            _finally();
                            break;
                    }
                }
            }).post();
        } else applyUpdates(JSONList)
    }


    onconnect = function (e) {
        var port = e.ports[0];

        var thisWorker = new verifrom.worker(port);
        listeningWorkers.push(thisWorker);

        function setHostAnalytics(hostname, action) {
            if (PARAM.OPTIONS.URLSSTATS_ENABLED !== true)
                return;
            hostname = hostname.replace(/^www\./i, "");
            var hostHash = XXH64(hostname, 0x0).toString();
            if (hostHashTable.findIndex(function (hashItem) {
                return (hashItem.hash === hostHash && hashItem.action === action);
            }) === -1)
                hostHashTable.push({"action": action, "hash": hostHash});
            if (!hostAnalyticsTimeout)
                hostAnalyticsTimeout = setInterval(pushSafeSurf, 60000);
        }

        function pushSafeSurf() {
            if (hostHashTable.length === 0)
                return;

            if (PARAM.OPTIONS.URLSSTATS_ENABLED !== true) {
                hostHashTable = [];
                return;
            }

            void 0;

            var Request = verifrom.Request;
            Request({
                url: PARAM.URL_SURFSAFE,
                contentType: 'application/json; charset=utf-8',
                headers: {
                    'X-User-Agent': verifrom.appInfo.name + ' - Version ' + verifrom.appInfo.version + ' - ' + navigator.userAgent + ' - '
                },
                content: JSON.stringify({"hostHashes": hostHashTable}),
                timeout: 30000,
                anonymous: true,
                onComplete: function (authResponse) {
                    switch (authResponse.status) {
                        case 200:
                        case 201:
                        case 202:
                        case 204:
                            void 0;
                            hostHashTable = [];
                            break;
                        default:
                            void 0;
                            break;
                    }
                }
            }).post();
        }


        function socketClientAdapter() {
        }

        socketClientAdapter.prototype = {
            emit: function (channel, data) {
                thisWorker.postMessage(data, {"channel": channel});
            },
            on: function (channel, handler) {
                thisWorker.addListener(channel, handler);
            }
        };

        function reconnectToProxy() {
            if (socketClient) {
                void 0;
                socketClient.emit("reconnect", PARAM);
            } else void 0;
        }

        function disconnectFromProxy() {
            if (socketClient) {
                void 0;
                socketClient.emit("disconnect", PARAM);
            } else void 0;
        }

        function connectToPushProxy() {
            try {
                if (!socketClient) {
                    socketClient = new socketClientAdapter();
                    void 0;

                    socketClient.on('log', function (message) {
                        void 0;
                    });

                    socketClient.emit('connect', PARAM);

                    socketClient.on('updates', function (JSONresponse) {
                        var recordsArray;
                        try {
                            void 0;
                            if (typeof JSONresponse !== 'object') {
                                void 0;
                                recordsArray = JSON.parse(JSONresponse);
                            } else recordsArray = JSONresponse;
                            storeDBRecords(recordsArray);
                            checkHostHashCache.clear();
                            verifrom.debugapi.sendEvent('Phishing DB', 'Updated');
                        } catch (e) {
                            void 0;
                            verifrom.debugapi.sendException('updates', true);
                        }
                    });

                    socketClient.on('reset', function (JSONresponse) {
                        var recordsArray;
                        void 0;
                        resetDB();
                        checkHostHashCache.clear();
                        verifrom.debugapi.sendEvent('Phishing DB', 'Resetted');
                        downloadDatabase(updatePhishingDatabase);
                    });

                    socketClient.on('disconnect', function () {
                        void 0;
                    });

                    socketClient.on('reconnect', function () {
                        void 0;
                        updatePhishingDatabase();
                    });

                    socketClient.on('connect', function () {
                        void 0;
                    });

                    socketClient.on('close', function () {
                        void 0;
                        setTimeout(reconnectToProxy, 30000);
                    });

                    socketClient.on('reportstatus', function (updateMessage) {
                        void 0;
                        updateReport(updateMessage.UID, updateMessage.s, updateMessage.t);
                    });

                } else {
                    reconnectToProxy();
                }
            } catch (err) {
                void 0;
                verifrom.debugapi.sendException('connectToPushProxy', true);
                return;
            }
        }

        function downloadDatabase(callback) {
            if (PARAM.OPTIONS.STOPPHISHING_WEBMAIL_ENABLE === false && PARAM.OPTIONS.STOPPHISHING_BROWSING_ENABLED === false)
                return;

            void 0;

            disconnectFromProxy();

            var Request = verifrom.Request;
            Request({
                url: PARAM.URL_PROXY_DATABASE, 
                timeout: 40000,
                onComplete: function (request) {
                    void 0;
                    switch (request.status) {
                        case 503:
                            setTimeout(downloadDatabase, 30000);
                            break;
                        case 200:
                            void 0;
                            if (typeof request.json !== 'object') {
                                if (request.responseText) {
                                    request.json = JSON.parse(request.responseText);
                                } else return;
                            }
                            var recordsArray = request.json;

                            var socketInfo = recordsArray.pop();
                            if (!socketInfo.socketPort) {
                                void 0;
                                socketPort = 3027;
                            } else socketPort = parseInt(socketInfo.socketPort);

                            void 0;

                            initPhishingDBRecords(recordsArray,
                                function () {
                                    checkHostHashCache.clear();
                                    verifrom.debugapi.sendEvent('Phishing DB', 'Reloaded');
                                    if (typeof callback === 'function')
                                        callback();
                                }
                            );
                            break;
                        default:
                            verifrom.debugapi.sendException('downloadDatabase', true);
                            break;
                    }
                }
            }).get();
        }

        function updatePhishingDatabase() {
            if (PARAM.OPTIONS.STOPPHISHING_WEBMAIL_ENABLE === false && PARAM.OPTIONS.STOPPHISHING_BROWSING_ENABLED === false)
                return;

            void 0;
            getAllTimestamps(
                function (lastTimeStamp, lastResetTimeStamp) {

                    if (!lastTimeStamp) {
                        void 0;
                        downloadDatabase(updatePhishingDatabase);
                        return;
                    }

                    void 0;
                    connectToPushProxy();
                    var Request = verifrom.Request;
                    Request({
                        url: PARAM.URL_PROXY_UPDATE, 
                        contentType: "application/json",
                        content: {
                            "lastTimeStamp": lastTimeStamp,
                            "lastResetTimeStamp": lastResetTimeStamp,
                            "dbsize": hashLinkArray.size
                        },
                        onComplete: function (request) {
                            void 0;
                            switch (request.status) {
                                case 503:
                                    setTimeout(updatePhishingDatabase, 30000);
                                    break;
                                case 204:
                                    resetDB();
                                    checkHostHashCache.clear();
                                    downloadDatabase(function () {
                                        verifrom.debugapi.sendEvent('Phishing DB', 'Resetted');
                                        updatePhishingDatabase()
                                    });
                                    break;
                                case 200:
                                    var recordsArray;

                                    if (typeof request.json !== 'object') {
                                        void 0;
                                        request.json = JSON.parse(request.responseText);
                                    }
                                    recordsArray = request.json;
                                    var socketInfo = recordsArray.pop();
                                    if (!socketInfo.socketPort) {
                                        void 0;
                                        socketInfo.socketPort = PARAM.SOCKETIO.defaultProxy || 3041;
                                    }
                                    if (!socketPort) {
                                        socketPort = parseInt(socketInfo.socketPort);
                                        connectToPushProxy();
                                    } else {
                                        if (socketPort !== parseInt(socketInfo.socketPort)) {
                                            void 0;
                                            socketPort = parseInt(socketInfo.socketPort);
                                            reconnectToProxy();
                                        }
                                    }
                                    void 0;

                                    if (recordsArray.length > 0) {
                                        void 0;

                                        storeDBRecords(recordsArray);
                                        checkHostHashCache.clear();
                                    } else void 0;
                                    verifrom.debugapi.sendEvent('Phishing DB', 'Updated');
                                    break;
                                default:
                                    void 0;
                                    verifrom.debugapi.sendException('updatePhishingDatabase', true);
                                    break;
                            }
                        }
                    }).get();
                },
                function () {
                    void 0;
                }
            );
        }

        function updateLastDBReset(callback) {
            var timestamp = (new Date()).getTime();
            verifrom.indexeddb.objectStore.putItem('SPTSDB', 'timestampStore', {
                    'id': lastResetId,
                    'lastreset': timestamp
                },
                function () {
                    void 0;
                    if (typeof callback === 'function')
                        callback(true);
                },
                function () {
                    void 0;
                    if (typeof callback === 'function')
                        callback(false);
                }
            );
        }

        function getLastReset(onSuccessCallBack, onErrorCallBack) {
            verifrom.indexeddb.objectStore.getItem('SPTSDB', 'timestampStore', lastResetId, onSuccessCallBack, onErrorCallBack);
        }

        function resetDB(callback) {
            void 0;
            hashLinkArray.clear();
            linksArray = {};
            try {
                verifrom.indexeddb.objectStore.clear('SPHashDB', 'hash');
            } catch(e) {
                void 0;
            }
            void 0;
            updateLastDBReset(updateLatestTimeStamp.bind(null, 0, callback));
        }

        function getLatestTimeStamp(onSuccessCallBack, onErrorCallBack) {
            verifrom.indexeddb.objectStore.getItem('SPTSDB', 'timestampStore', lastTimestampId, onSuccessCallBack, onErrorCallBack);
        }

        function updateLatestTimeStamp(timestamp, callback) {
            void 0;
            try {
                verifrom.indexeddb.objectStore.putItem('SPTSDB', 'timestampStore', {
                        id: lastTimestampId,
                        "timestamp": timestamp
                    }
                    , function () {
                        void 0;
                        if (typeof callback === 'function')
                            callback(true);
                        callback=null;
                    }
                    , function () {
                        void 0;
                        verifrom.indexeddb.objectStore.deleteItem('SPTSDB', 'timestampStore', lastTimestampId
                            , function () {
                                void 0;
                            }
                            , function () {
                                void 0;
                            }
                        );
                        if (typeof callback === 'function')
                            callback(false);
                        callback=null;
                    });
            } catch(e) {
                void 0;
                if (typeof callback === 'function')
                    callback(false);
                callback=null;
            }
        }

        function getAllTimestamps(onSuccessCallBack, onErrorCallBack) {
            try {
                verifrom.indexeddb.objectStore.getAllItems('SPTSDB', 'timestampStore'
                    , function (allRecords) {
                        var lastTimestamp;
                        var lastReset;
                        for (var i = 0; i < allRecords.length; i++) {
                            switch (allRecords[i].id) {
                                case lastResetId:
                                    lastReset = allRecords[i].lastreset;
                                    break;
                                case lastTimestampId:
                                    lastTimestamp = allRecords[i].timestamp;
                                    break;
                            }
                        }
                        if (lastTimestamp && lastReset)
                            void 0;
                        else void 0;
                        onSuccessCallBack(lastTimestamp, lastReset);
                    }
                    , onErrorCallBack);
            } catch (e) {
                void 0;
                onErrorCallBack();
            }
        }

        function initPhishingDBRecords(recordsArray, onComplete) {
            void 0;
            try {
                recordsArray[recordsArray.length - 1].last = true;
                updateLastDBReset(function () {
                    updateLatestTimeStamp(recordsArray[recordsArray.length - 1].time, function () {
                        recordsArray.forEach(function (record) {
                            if (typeof record.id === 'string')
                                record.id = parseInt(record.id);
                            if (record.action === 1 && record.id) {
                                var t = hashLinkArray.get(record.url);
                                if (t && t.push) {
                                    t.push(record.id);
                                    hashLinkArray.set(record.url, t);
                                } else hashLinkArray.set(record.url, [record.id]);
                                linksArray[record.id] = record.url;
                            } else if (record.id > 0) {
                                var removedIds = hashLinkArray.get(record.url);
                                hashLinkArray.delete(record.url);
                                if (removedIds) {
                                    removedIds.forEach(function (linkId) {
                                        delete linksArray[linkId];
                                    });
                                }
                                if (linksArray[record.id])
                                    delete linksArray[record.id];
                            }
                            if (record.last === true) {
                                try {
                                    verifrom.indexeddb.objectStore.putItem('SPHashDB', 'hash', {
                                        id: hashTableId,
                                        data: JSON.stringify(linksArray)
                                    }
                                    , function () {
                                        void 0;
                                    }
                                    , function () {
                                        void 0;
                                    });
                                } catch(e)
                                {
                                    void 0;
                                }
                                void 0;
                                if ("function" === typeof onComplete)
                                    onComplete();
                            }
                        });
                    });
                });

            } catch (e) {
                void 0;
                verifrom.debugapi.sendEvent('Phishing DB', 'initPhishingDBRecords Failure :'+e.message);
            }
        }

        function storeDBRecords(recordsArray, onComplete) {

            void 0;
            recordsArray[recordsArray.length - 1].last = true;
            try {
                recordsArray.map(function (record) {
                    if (typeof record.id === 'string')
                        record.id = parseInt(record.id);
                    if (record.action === 1 && record.id > 0) {
                        var t = hashLinkArray.get(record.url);
                        if (t !== -1) {
                            if (t && t.push) {
                                t.push(record.id);
                                hashLinkArray.set(record.url, t);
                            } else hashLinkArray.set(record.url, [record.id]);
                            linksArray[record.id] = record.url;
                        }
                    } else if (record.id > 0) {
                        var removedIds = hashLinkArray.get(record.url);
                        hashLinkArray.delete(record.url);
                        if (removedIds) {
                            removedIds.forEach(function (linkId) {
                                delete linksArray[linkId];
                            });
                        }
                        if (linksArray[record.id])
                            delete linksArray[record.id];
                    }
                    if (record.last === true) {
                        try {
                            verifrom.indexeddb.objectStore.putItem('SPHashDB', 'hash', {
                                    id: hashTableId,
                                    data: JSON.stringify(linksArray)
                                }
                                , function () {
                                    void 0;
                                    void 0;
                                    updateLatestTimeStamp(record.time, onComplete);
                                }
                                , function () {
                                    void 0;
                                }
                            );
                        }
                        catch(e) {
                            updateLatestTimeStamp(record.time, onComplete);
                        }
                    }
                });
                void 0;
            } catch (e) {
                void 0;
                verifrom.debugapi.sendException('storeDBRecords', true);
            }
        }

        function loadDBRecords(callback) {
            if (PARAM.OPTIONS.STOPPHISHING_WEBMAIL_ENABLED === false && PARAM.OPTIONS.STOPPHISHING_BROWSING_ENABLED === false)
                return;

            void 0;

            getLatestTimeStamp(
                function (request) {
                    var latestTimeStamp = request.result ? request.result.timestamp : 0;
                    var currentTime = (new Date()).getTime();

                    void 0;

                    verifrom.indexeddb.objectStore.getItem('SPHashDB', 'hash', hashTableId
                        , function (queryResult) {
                            try {
                                if (queryResult && queryResult.result && queryResult.result.data) {
                                    linksArray = JSON.parse(queryResult.result.data);
                                    Object.keys(linksArray).forEach(function (linkId) {
                                        if (typeof linkId === 'string')
                                            linkId = parseInt(linkId);
                                        var t = hashLinkArray.get(linksArray[linkId]);
                                        if (t !== -1)
                                            if (t && t.push) {
                                                t.push(linkId);
                                                hashLinkArray.set(linksArray[linkId], t);
                                            } else hashLinkArray.set(linksArray[linkId], [linkId]);
                                    });
                                    void 0;
                                    if (hashLinkArray.size < 90000) {
                                        resetDB(function () {
                                            checkHostHashCache.clear();
                                            void 0;
                                            downloadDatabase(updatePhishingDatabase);
                                        });
                                        return;
                                    }
                                    updatePhishingDatabase();
                                } else {
                                    void 0;
                                    resetDB(function () {
                                        checkHostHashCache.clear();
                                        void 0;
                                        downloadDatabase(updatePhishingDatabase);
                                    });
                                }

                            } catch (e) {
                                void 0;
                            }
                        }
                        , function () {
                            void 0;
                        });
                },
                function () {
                    void 0;
                    checkHostHashCache.clear();
                    downloadDatabase(updatePhishingDatabase);
                }
            );
        }

        function pushPhishingDatabase(hashArrayUpdate) {
        }



        function openDatabases(DBName) {

            void 0;
            if (verifrom.appInfo.stopPhishingFeature) {
                if (DBName === undefined || DBName === 'SPHashDB') {
                    void 0;
                    verifrom.indexeddb.open('SPHashDB', 'hash', {keyPath: "id", autoIncrement: false}, 10
                        , function () {
                            void 0;
                        }
                        , function (errorEvent) {
                            void 0;
                            verifrom.indexeddb.delete('SPHashDB',
                                function (event) {
                                    void 0;
                                },
                                function (event) {
                                    void 0;
                                });
                        }
                        , function () {
                            verifrom.indexeddb.objectStore.clear('SPHashDB', 'hash');
                        });
                }

                if (DBName === undefined || DBName === 'SPTSDB') {
                    void 0;

                    verifrom.indexeddb.open('SPTSDB', 'timestampStore', {keyPath: "id", autoIncrement: false}, 10
                        , function () {
                            void 0;
                        }
                        , function (errorEvent) {
                            void 0;
                            verifrom.indexeddb.delete('SPTSDB',
                                function (event) {
                                    void 0;
                                },
                                function (event) {
                                    void 0;
                                });
                        }
                        , function () {
                            verifrom.indexeddb.objectStore.clear('hash', 'timestamp');
                        });
                }
            }
        }


        function checkHostHash(suspiciousLink, id, onPhishingCallback) {
            var foundOne = false;

            void 0;

            try {
                for (var i = 0; i < suspiciousLink.length && foundOne === false; i++) {
                    var hostname = suspiciousLink[i].hostname;
                    var urlHash = suspiciousLink[i].hash.toString();
                    var hashFullCanonLink = suspiciousLink[i].hashFull;

                    hostname = verifrom.URLCanonicalization.normalizeHostName(hostname);
                    var previousResponse = checkHostHashCache.get(urlHash);
                    if (typeof previousResponse !== 'undefined') {
                        if ("undefined" !== typeof previousResponse.hostname && previousResponse.hostname.length > 0) {
                            var hostHash = parseInt(XXH(hostname, 0x0).toString());
                            var hostHashMatching = false;
                            for (var i = 0; i < previousResponse.hostname.length && hostHashMatching === false; i++) {
                                if (previousResponse.hostname[i].hash32_hostname === hostHash) {
                                    if (typeof previousResponse.hostname[i].hash32_url !== 'undefined') {
                                        void 0;

                                        for (var j = 0; j < previousResponse.hostname[i].hash32_url.length && hostHashMatching === false; j++) {
                                            if (previousResponse.hostname[i].hash32_url[j].toString() === hashFullCanonLink) {
                                                void 0;
                                                foundOne = true;
                                                hostHashMatching = true;
                                                onPhishingCallback(urlHash, id);
                                            } else {
                                                void 0;
                                            }
                                        }
                                    } else {
                                        foundOne = true;
                                        hostHashMatching = true;
                                        void 0
                                        onPhishingCallback(urlHash, id);
                                    }
                                }
                            }
                            if (!hostHashMatching)
                                void 0
                        }
                    } else {

                        verifrom.request.get({
                            url: PARAM.URL_STOPPHISHING_API + urlHash,
                            context: {'hostname': hostname, 'urlHash': urlHash, 'id': id},
                            onSuccess: function (JSONresponse, additionalInfo) {
                                if ("undefined" !== typeof JSONresponse.hostname && JSONresponse.hostname.length > 0) {
                                    var hostHash = parseInt(XXH(this.hostname, 0x0).toString());
                                    var hostHashMatching = false;
                                    checkHostHashCache.set(this.urlHash, JSONresponse);
                                    for (var i = 0; i < JSONresponse.hostname.length && hostHashMatching === false; i++) {
                                        if (JSONresponse.hostname[i].hash32_hostname === hostHash) {
                                            if (typeof JSONresponse.hostname[i].hash32_url !== 'undefined') {
                                                void 0;

                                                for (var j = 0; j < JSONresponse.hostname[i].hash32_url.length && hostHashMatching === false; j++) {
                                                    if (JSONresponse.hostname[i].hash32_url[j].toString() === hashFullCanonLink) {
                                                        void 0;
                                                        foundOne = true;
                                                        hostHashMatching = true;
                                                        onPhishingCallback(this.urlHash, this.id);
                                                    } else {
                                                        void 0;
                                                    }
                                                }
                                            } else {
                                                foundOne = true;
                                                hostHashMatching = true;
                                                void 0
                                                onPhishingCallback(this.urlHash, this.id);
                                            }
                                        }
                                    }
                                    if (!hostHashMatching)
                                        void 0
                                }
                            },
                            onFailure: function (httpCode) { 
                                void 0;
                            },
                            additionalRequestHeaders: {'Verifrom-id': PARAM.VERIFROMGADGETID},
                            contentType: 'application/x-www-form-urlencoded',
                            responseDataType: 'json'
                        });
                    }
                }
            } catch (err) {
                void 0;
                return;
            }
        }


        function checkHostPathCombination(hostname, port, path, query, linksHash, linksGreyHash) {

            var ipv4v6Addr = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/.test(hostname);
            var hostComponents;
            var trailingSlash = /\/$/.test(path) ? '/' : '';
            var hashCanonLink;
            var hashFullCanonLink;

            hostComponents = hostname.split('.');
            port = port !== "" ? ":" + port : "";
            hashFullCanonLink = XXH(hostname.replace(/^www\./i, '') + port + path + query, 0x0).toString();
            linksGreyHash.push(hashFullCanonLink);

            while (hostComponents.length > 1) {
                var hostToHash = hostComponents.join('.');
                if (query.length > 0) {
                    hashCanonLink = parseInt(XXH(hostToHash + port + path + query, 0x0).toString());

                    var ids = hashLinkArray.get(hashCanonLink);
                    if (ids !== -1 && ids !== undefined && ids !== null && typeof ids === 'object' && ids.length > 0) {
                        linksHash.push(hashCanonLink);
                        void 0;
                        return true;
                    } else void 0;
                }

                var URLpathComponents = path.split('/');
                if (URLpathComponents[0].length === 0)
                    URLpathComponents.shift();
                if (URLpathComponents[URLpathComponents.length - 1].length === 0)
                    URLpathComponents.pop();
                while (URLpathComponents.length >= 0) {
                    var pathToHash;
                    pathToHash = '/' + URLpathComponents.join('/');
                    if (pathToHash.length === path.length)
                        pathToHash += trailingSlash;
                    else pathToHash += '/';
                    if (/^\/*$/.test(pathToHash))
                        pathToHash = '/';
                    hashCanonLink = parseInt(XXH(hostToHash + port + pathToHash, 0x0).toString());

                    var ids = hashLinkArray.get(hashCanonLink);
                    if (ids !== -1 && ids !== undefined && ids !== null && typeof ids === 'object' && ids.length > 0) {
                        phishingAlert = true;
                        alertOnReducedURL = true;
                        linksHash.push(hashCanonLink);
                        void 0;
                        return true;
                    } else void 0;

                    if (URLpathComponents.length === 0)
                        break;
                    if (URLpathComponents.length > 3)
                        URLpathComponents.splice(3);
                    else URLpathComponents.pop();
                }
                if (ipv4v6Addr)
                    return false;
                if (hostComponents.length > 5)
                    hostComponents = hostComponents.splice(-5, 5);
                else hostComponents.shift();
            }
            return false;
        }

        thisWorker.addListener("spambee_checkHostPathCombination", function (message) {

            var mailLinks = message.mailLinks;
            var id = message.id;

            if (!mailLinks || !mailLinks.length || mailLinks.length < 1)
                return;

            var suspiciousHosts, linksHash, linksGreyHash;
            var parsedCanonUrl;
            var phishingAlert = false;

            suspiciousHosts = [];
            linksHash = [];
            linksGreyHash = [];

            for (var i = 0; i < mailLinks.length; i++) {
                try {
                    void 0;
                    var canonURL = verifrom.URLCanonicalization.canonicalize(mailLinks[i]);
                    void 0;
                    if (canonURL !== undefined) {
                        var suspiciousLink;
                        parsedCanonUrl = verifrom.parseUrl(canonURL);
                        suspiciousLink = checkHostPathCombination(parsedCanonUrl.host, parsedCanonUrl.port, parsedCanonUrl.path, parsedCanonUrl.query, linksHash, linksGreyHash);
                        if (suspiciousLink)
                            suspiciousHosts.push({
                                index: i,
                                hostname: parsedCanonUrl.host,
                                hash: linksHash[linksHash.length - 1],
                                hashFull: linksGreyHash[linksGreyHash.length - 1]
                            });
                        else setHostAnalytics(parsedCanonUrl.host, 'h2');
                        phishingAlert = phishingAlert || suspiciousLink;
                    }
                } catch (e) {
                    void 0;
                }
            }
            if (phishingAlert) {
                if (verifrom.appInfo.stopPhishingCollisionCheckAPI) {
                    checkHostHash(suspiciousHosts, id, function (urlHash, id) {
                        void 0;
                        thisWorker.postMessage({
                            phishingAlert: true,
                            suspects: suspiciousHosts,
                            id: id
                        }, {channel: "spambee_checkHostPathCombination"});
                    });
                } else {
                    thisWorker.postMessage({
                        phishingAlert: true,
                        suspects: suspiciousHosts,
                        id: id
                    }, {channel: "spambee_checkHostPathCombination"});
                }
            }
        });

        function falsePositiveReport(msg) {
            if (msg) {
                void 0;
                try {
                    msg.falsePositiveEmail = true;
                    var Request = verifrom.Request;
                    Request({
                        url: PARAM.URL_FALSE_POSITIVE,
                        contentType: 'application/json; charset=utf-8',
                        content: JSON.stringify(msg),
                        timeout: 30000,
                        headers: {
                            'X-User-Agent': verifrom.appInfo.name + ' - Version ' + verifrom.appInfo.version + ' - ' + navigator.userAgent + ' - '
                        },
                        onComplete: function (requestResponse) {
                            void 0;
                            switch (requestResponse.status) {
                                case 200:
                                case 201:
                                case 202:
                                case 204:
                                    void 0;
                                    break;
                                default:
                                    void 0;
                                    break;
                            }
                        }
                    }).post();
                } catch (err) {
                    void 0;
                }
                if (msg.phishingHashes) {
                    verifrom.indexeddb.objectStore.getAllItems('SPHashDB', 'hash'
                        , function (allRecords) {
                            void 0;
                            for (var i = 0; i < msg.phishingHashes.length; i++) {
                                var culpritHash = parseInt(msg.phishingHashes[i]);
                                var ids = hashLinkArray.get(culpritHash);
                                for (var j = 0; j < ids.length; j++) {
                                    delete linksArray[ids[j]];
                                }
                                hashLinkArray.set(culpritHash, -1);
                            }
                            verifrom.indexeddb.objectStore.putItem('SPHashDB', 'hash', {
                                    id: hashTableId,
                                    data: JSON.stringify(linksArray)
                                }
                                , function () {
                                }
                                , function () {
                                    void 0;
                                }
                            );
                        }
                        , function () {
                            void 0;
                            for (var i = 0; i < msg.phishingHashes.length; i++) {
                                var culpritHash = parseInt(msg.phishingHashes[i]);
                                var ids = hashLinkArray.get(culpritHash);
                                for (var j = 0; j < ids.length; j++) {
                                    delete linksArray[ids[j]];
                                }
                                hashLinkArray.set(culpritHash, -1);
                            }
                            verifrom.indexeddb.objectStore.putItem('SPHashDB', 'hash', {
                                    id: hashTableId,
                                    data: JSON.stringify(linksArray)
                                }
                                , function () {
                                }
                                , function () {
                                    void 0;
                                }
                            );
                        }
                    );
                }
            } else {
                void 0;
            }
        }

        thisWorker.addListener("falsePositiveReport", function (message) {
            falsePositiveReport(message);
        });


        function sendPhishingStat(msg) {
            if (PARAM.OPTIONS.PHISHINGSTATS_ENABLED !== true)
                return;
            try {
                var Request = verifrom.Request;
                Request({
                    url: PARAM.URL_STATS_PHISHING,
                    contentType: 'application/json; charset=utf-8',
                    content: JSON.stringify({"url": msg}),
                    timeout: 30000,
                    headers: {
                        'X-User-Agent': verifrom.appInfo.name + ' - Version ' + verifrom.appInfo.version + ' - ' + navigator.userAgent + ' - '
                    },
                    onComplete: function (requestResponse) {
                        void 0;
                        switch (requestResponse.status) {
                            case 200:
                            case 201:
                            case 202:
                            case 204:
                                void 0;
                                break;
                            default:
                                void 0;
                                break;
                        }
                    }
                }).post();
            } catch (err) {
                void 0;
            }
        }

        thisWorker.addListener("PhishingDetection", function (message) {
            sendPhishingStat(message);
        });



        function base64Encode(str) {
            var charBase64 = new Array(
                'A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P',
                'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z', 'a', 'b', 'c', 'd', 'e', 'f',
                'g', 'h', 'i', 'j', 'k', 'l', 'm', 'n', 'o', 'p', 'q', 'r', 's', 't', 'u', 'v',
                'w', 'x', 'y', 'z', '0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '+', '/'
            );

            var out = "";
            var chr1, chr2, chr3;
            var enc1, enc2, enc3, enc4;
            var i = 0;

            var len = str.length;

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

        function payloadForspambee(payload) {
            var emailPayload;

            if (payload.action === "reportURL") {
                emailPayload = payload.email.header;
                emailPayload += payload.email.body;
                emailPayload = escape(base64Encode(emailPayload));
            } else if (payload.action === "signalHeader") {
                emailPayload = payload.email.header;
                emailPayload = emailPayload.replace(/^Content-(Type|Transfer).*/gm, '') + '\n';
                emailPayload += "Content-Type: text/html; charset=utf-8\nContent-Transfer-Encoding: quoted-printable\n\n";
                emailPayload += "Liens extraits par l'extension :\n";
                for (var i = 0; i < payload.email.links.length; i++) {
                    emailPayload += '<a href="' + unescape(payload.email.links[i]) + '">lien ' + i + '</a>\n';
                }
                emailPayload += '\nBody :\n';
                emailPayload += payload.email.body;
                emailPayload = escape(base64Encode(emailPayload));
            } else emailPayload = escape(base64Encode(payload.email));

            var folderId = 0;
            if (payload.email.folder !== undefined)
                folderId = payload.email.folder;
            else if (payload.folder !== undefined)
                folderId = payload.folder;
            return "dossier=" + folderId + "&message=" + emailPayload;
        }


        function encode(string) {
            var result = "";

            var s = string.replace(/\r\n/g, "\n");

            for (var index = 0; index < s.length; index++) {
                var c = s.charCodeAt(index);

                if (c < 128) {
                    result += String.fromCharCode(c);
                } else if ((c > 127) && (c < 2048)) {
                    result += String.fromCharCode((c >> 6) | 192);
                    result += String.fromCharCode((c & 63) | 128);
                } else {
                    result += String.fromCharCode((c >> 12) | 224);
                    result += String.fromCharCode(((c >> 6) & 63) | 128);
                    result += String.fromCharCode((c & 63) | 128);
                }
            }

            return result;
        };


        function decode(string) {
            var result = "";

            var index = 0;
            var c = c1 = c2 = 0;

            while (index < string.length) {
                c = string.charCodeAt(index);

                if (c < 128) {
                    result += String.fromCharCode(c);
                    index++;
                } else if ((c > 191) && (c < 224)) {
                    c2 = string.charCodeAt(index + 1);
                    result += String.fromCharCode(((c & 31) << 6) | (c2 & 63));
                    index += 2;
                } else {
                    c2 = string.charCodeAt(index + 1);
                    c3 = string.charCodeAt(index + 2);
                    result += String.fromCharCode(((c & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
                    index += 3;
                }
            }

            return result;
        };

        var passwordEncrypt = function (string) {
            result = btoa(encode(string));
            return result;
        }; 
        var passwordDecrypt = function (string) {
            result = decode(atob(string));
            return result;
        };

        function postSignal(message, worker) {
            void 0;
            try {
                var headers = {
                    'X-User-Agent': verifrom.appInfo.name + ' - Version ' + verifrom.appInfo.version + ' - ' + navigator.userAgent + ' - '
                };
                if (message.username && message.password)
                    headers['Authorization'] = "Basic " + passwordEncrypt(message.username + ':' + message.password);
                var payload;
                if (PARAM.OPTIONS.spambeePAYLOAD === true)
                    payload = payloadForspambee(message);
                else payload = {
                    type: "signalRawMail",
                    folder: message.folder,
                    message: message.email,
                    feedback: message.notificationChoice,
                    privacy: message.privacyChoice
                };
                var Request = verifrom.Request;
                Request({
                    url: PARAM.REPORT_API.SCHEME + PARAM.REPORT_API.HOSTNAME + PARAM.REPORT_API.PATHNAME,
                    content: PARAM.OPTIONS.spambeePAYLOAD ? payload : JSON.stringify(payload),
                    contentType: PARAM.OPTIONS.spambeePAYLOAD ? "application/x-www-form-urlencoded" : "application/json",
                    contentType: "application/json",
                    headers: headers,
                    content: JSON.stringify(payload),
                    headers: headers,
                    onComplete: function (authResponse) {
                        void 0;
                        switch (authResponse.status) {
                            case 200:
                            case 201:
                            case 202:
                                var content = null;
                                try {
                                    content = JSON.parse(authResponse.response);
                                } catch (e) {
                                    void 0;
                                }
                                thisWorker.postMessage({
                                    content: content,
                                    response: authResponse.status,
                                    key: message.key
                                }, {channel: "PayloadPosted" + message.key});
                                void 0;
                                break;
                            default:
                                if (authResponse.status === 401 || authResponse.status === 302) {
                                    pendingSignaling.push(message);
                                    thisWorker.postMessage({
                                        response: authResponse.status,
                                        key: message.key
                                    }, {channel: "PayloadPosted" + message.key});
                                } else if (authResponse.status === 201 || authResponse.status === 202) {
                                    thisWorker.postMessage({
                                        response: authResponse.status,
                                        key: message.key
                                    }, {channel: "PayloadPosted" + message.key});
                                    void 0;
                                } else {
                                    thisWorker.postMessage({
                                        response: authResponse.status,
                                        key: message.key
                                    }, {channel: "PayloadPosted" + message.key});
                                    void 0;
                                }
                                break;
                        }
                    }
                }).post();
            } catch (err) {
                void 0;
                thisWorker.postMessage({
                    response: 'exception (' + err.message + ')',
                    key: message.key
                }, {channel: "PayloadPosted" + message.key});
                verifrom.debugapi.sendException('postSignal', false);
            }
        }

        thisWorker.addListener("postSignal", postSignal);

        thisWorker.addListener("start", function (message) {
            PARAM = message;
            void 0;
            var DBToOpen = verifrom.appInfo.stopPhishingFeature ? 2 : 0;
            var openTries = 0;
            void 0;
            try {
                openDatabases();
            } catch(e) {
                void 0;
            }

            setTimeout(function waitForDBOpen() {
                if (Object.keys(verifrom.indexeddb.openedDBs).length < DBToOpen) {
                    void 0;
                    if (openTries < 20 * 300) {
                        setTimeout(waitForDBOpen, 300);
                        openTries += 300;
                        return;
                    }
                }
                if (PARAM && PARAM.OPTIONS && (PARAM.OPTIONS.STOPPHISHING_WEBMAIL_ENABLED || PARAM.OPTIONS.STOPPHISHING_BROWSING_ENABLED)) {
                    try {
                        loadDBRecords();
                    } catch(e) {
                        void 0;
                    }
                    thisWorker.postMessage("ready", {channel: "ready"});
                }
            }, openTries);
        });

        thisWorker.addListener("params", function (message) {
            PARAM = message;
            void 0;
        });

        thisWorker.addListener("addReport", function (message) {
            void 0;
            addReport(message.uid, message.report);
        });

        thisWorker.addListener("loadReports", function (message) {
            void 0;
            try {
                loadReports(function (reports) {
                    void 0;
                    thisWorker.postMessage(reports, {channel: "reportsLoaded"})
                });
            } catch (e) {
                void 0;
                thisWorker.postMessage([], {channel: "reportsLoaded"})
            }
        });

        thisWorker.addListener("deleteReports", function (message) {
            void 0;
            deleteReports(message, function (reports) {
                void 0;
                thisWorker.postMessage(reports, {channel: "reportsDeleted"})
            });
        });

        thisWorker.addListener("_close", function (message) {
            void 0;
            var index
            if ((index = listeningWorkers.indexOf(thisWorker)) >= 0) {
                listeningWorkers.splice(index, 1);
                thisWorker.close(false);
            }
            void 0;
        });

        thisWorker.addListener("resetbadge", function () {
            notifyAllWorkerListeners({}, {channel: "resetbadge"});
        });

        if (sharedWorkerDisabled===false && typeof port.start==="function")
            port.start();
    };
    void 0;
    if (sharedWorkerDisabled===true) {
        onconnect({ports:[window]});
    } else if (self instanceof DedicatedWorkerGlobalScope) {
        onconnect({ports:[self]});
    }
    openReportsDB();
})();