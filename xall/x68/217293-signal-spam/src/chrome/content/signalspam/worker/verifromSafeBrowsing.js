/**
 * Created by emmanuelsellier on 17/05/2017.
 */
//self.importScripts('chrome://signalspam/content/signalspam/include/localforage.nopromises.min.js');

(function() {

    let sharedWorkerDisabled = false;
    try {
        //console.log("worker - check cookie behaviour");
        try {
            new SharedWorker("");
        } catch (e) {
            sharedWorkerDisabled = /insecure/i.test(e.message);
        }
    } catch (e) {
        //verifrom.console.error(0,"got exception when checking cookies behaviour", e);
    }

    if (sharedWorkerDisabled===false && typeof self.importScripts === "function") {
        self.importScripts('chrome://signalspam/content/signalspam/specific/signalspam/extensionConfig.js');
        self.importScripts('chrome://signalspam/content/signalspam/include/verifrom_api.js');
        self.importScripts('chrome://signalspam/content/signalspam/include/xxhash.js');
        self.importScripts('chrome://signalspam/content/signalspam/include/uint64.js');
        self.importScripts('chrome://signalspam/content/signalspam/include/xxhash64.js');
    } else {
        if (sharedWorkerDisabled===false && typeof self.importScripts !== "function") {
            verifrom.console.log(0,"Extension - worker script should not load since it will run in a SharedWorker");
            return;
        } else {
            // shared workers === true or importScripts === function
            verifrom.console.log(0,"Extension - worker script will load");
            var inMemoryLastReset=null;
            var inMemoryLastUpdate=null;
        }
    }
    verifrom.console.log(0,"Extension - worker script starting");

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

    var reportsDBName = "signalspam";
    var reportsCollection = "reports";
    var pendingReports = new Set();
    var pendingReportsTimeout = null;
    var reportsTabs = new Set();
    var updatedReportsNumber = 0;

    var listeningWorkers = [];

    function notifyAllWorkerListeners(msg, optionsObject) {
        if (!optionsObject.channel)
            throw "notifyAllWorkerListeners - missing channel in options";
        verifrom.console.log(2, 'notifyAllWorkerListeners - on channel', optionsObject.channel);
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
                // onSuccessCallBack
                verifrom.console.log(0, 'openReportsDB - Reports DB opened', event);
                loadReports();
                setTimeout(cleanReports, 20000);
                setInterval(cleanReports, 3600000);
            }
            , function () {
                // onErrorCallBack
                verifrom.console.log(0, 'openReportsDB - ERROR opening Reports DB', arguments);
            }
            , function () {
                // onUpgradeCallBack
                verifrom.console.log(0, 'openReportsDB - upgrade required on Reports DB', arguments);
            }
        );
    }

    function updateReport(UID, status, timestamp) {
        if (extensionConfig.appInfo.localReportsDB !== true)
            return;
        verifrom.indexeddb.objectStore.getItem(reportsDBName, reportsCollection, UID
            , function (item) {
                //onSuccessCallBack
                verifrom.console.log(4, 'updateReport - got report to update', item);
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
                    //TODO: ADD BADGE (IF POSSIBLE...)
                    /*verifrom.browserAction.setBadgeText({text: signalspam_updatedReportsNumber.toString()});
                    verifrom.browserAction.setTitle({"title": localizationData.actionButtonWhenReportsUpdated});*/
                    report.status = status;
                    verifrom.indexeddb.objectStore.putItem(reportsDBName, reportsCollection, report
                        , function () {
                            //onSuccessCallBack
                            verifrom.console.log(4, 'updateReport - report ' + UID + ' updated');
                            notifyAllWorkerListeners({
                                "reports": [{
                                    UID: UID,
                                    t: timestamp,
                                    s: status
                                }]
                            }, {channel: "reportsUpdate"});
                        }
                        , function () {
                            //onErrorCallBack
                            verifrom.console.log(0, 'updateReport - Error updating report ' + UID, arguments);
                        }
                    );
                }
            }
            , function () {
                //onErrorCallBack
                verifrom.console.log(0, 'updateReport - ERROR getting item in indexed DB with UID ' + UID);
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
        else return verifrom.console.log(0, 'deleteReports - invalid arguments', message);

        if (items && items.length > 0) {
            for (var i = 0; i < items.length; i++) {
                var UID = items[i];
                pendingReports.delete(UID);
                verifrom.indexeddb.objectStore.deleteItem(reportsDBName, reportsCollection, UID
                    , function () {
                        verifrom.console.log(4, 'deleteReports - report ' + UID + ' deleted');
                    }
                    , function () {
                        verifrom.console.log(4, 'deleteReports - Error deleting report ' + UID, arguments);
                    }
                );
                if (typeof callback === "function")
                    callback();
                //verifrom.message.toAllTabs({},{channel:"reportsDeleted"});
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
                        verifrom.console.log(2, 'deleteReports - Server deleted reports: ' + authResponse.status);
                    } else {
                        verifrom.console.log(1, 'deleteReports - Server error (not 200) while deleting reports: ' + authResponse.status);
                    }
                }
            }).delete();
        } else {
            verifrom.console.log(4, 'deleteReports - no reports to delete, list empty');
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
                // on success
                verifrom.console.log(2, 'addReport - report stored in DB ID ' + UID);
                //verifrom.message.toAllTabs({"reports":[{UID:UID,t:null,s:"pending"}]},{channel:"reportsUpdate"});
                notifyAllWorkerListeners(report, {channel: "newReport"});
            }
            , function () {
                // on error
                verifrom.console.log(0, 'addReport - Error adding report ID ' + UID + ' in DB', arguments);
            }
        );
    }

    function cleanReports() {
        if (extensionConfig.appInfo.localReportsDB !== true)
            return;
        verifrom.indexeddb.objectStore.getAllItems(reportsDBName, reportsCollection
            , function (items) {
                // on success
                verifrom.console.log(2, 'cleanReports - got all reports from DB');
                if (items) {
                    //var beforeTimeStamp=Date.now()-(30*24*3600*1000);
                    var beforeTimeStamp = Date.now() - parseInt(PARAM.REPORTS_MAX_AGE);
                    var reportsDeleted = false;
                    var reportsToDelete = [];
                    verifrom.console.log(2, 'cleanReports - got all reports from DB - #items=' + items.length);
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
                                    verifrom.console.log(6, 'cleanReports - delete report');
                                    reportsDeleted = true;
                                    numberToDelete--;
                                    if (numberToDelete === 0)
                                        notifyAllWorkerListeners({}, {channel: "reportsDeleted"});
                                },
                                function () {
                                    verifrom.console.log(0, 'cleanReports - Error deleting report', arguments);
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
                // on error
                verifrom.console.log(0, 'cleanReports - Error getting all reports in DB', arguments);
            }
        );
    }

    function loadReports(callback) {
        if (extensionConfig.appInfo.localReportsDB !== true)
            return;
        verifrom.indexeddb.objectStore.getAllItems(reportsDBName, reportsCollection
            , function (items) {
                // on success
                var beforeTimeStamp = Date.now() - (90 * 1000);
                if (items) {
                    verifrom.console.log(2, 'loadReports - got all reports from DB - #items=' + items.length);
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
                // on error
                if (typeof callback === "function")
                    callback({reports: []});
                verifrom.console.log(0, 'loadReports - Error getting all reports in DB', arguments);
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
        var applyUpdates = function (JSONresponse) {
            if (JSONresponse && JSONresponse.length > 0) {
                for (var i = 0; i < JSONresponse.length; i++) {
                    var reportStatus = JSONresponse[i];
                    if (reportStatus.s !== "pending") {
                        verifrom.console.log(4, 'updateReports - Apply update for UID' + reportStatus.UID + "=" + reportStatus.s);
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
                //url: "https://services.verifrom.com/signalspam/report/checkstatus/",
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
                            verifrom.console.log(4, 'updateReports - got update');
                            var JSONresponse = JSON.parse(authResponse.response);
                            applyUpdates(JSONresponse);
                            break;
                        default:
                            verifrom.console.error(1, 'updateReports - Failure updating reports status:', authResponse.status);
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

            verifrom.console.log(4, 'pushSafeSurf - send data:', hostHashTable);

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
                            verifrom.console.log(4, 'pushSafeSurf - request success');
                            hostHashTable = [];
                            break;
                        default:
                            verifrom.console.log(4, 'pushSafeSurf - request error:', authResponse);
                            break;
                    }
                }
            }).post();
        }

        /*********************************************************************************************************************/
        /************************************************ SOCKET.IO - PUSH MANAGEMENT ****************************************/
        /*********************************************************************************************************************/

        //TODO: UPDATE SOCKET.IO LIB TO 2.0
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
                verifrom.console.log(1, 'reconnectToProxy - reconnect to proxy');
                socketClient.emit("reconnect", PARAM);
            } else verifrom.console.log(1, 'reconnectToProxy - socketClient not connected');
        }

        function disconnectFromProxy() {
            if (socketClient) {
                // disconnect from push
                verifrom.console.log(1, 'disconnectFromProxy - disconnecting from proxy');
                //socketClient.disconnect();
                socketClient.emit("disconnect", PARAM);
            } else verifrom.console.log(1, 'disconnectFromProxy - socketClient not connected');
        }

        function connectToPushProxy() {
            try {
                if (!socketClient) {
                    //socketClient= new verifrom.worker('chrome://signalspam/content/signalspam/worker/signalspam_socket.interface.js');
                    socketClient = new socketClientAdapter();
                    verifrom.console.log(3, 'socketClient worker created');

                    socketClient.on('log', function (message) {
                        verifrom.console.log(1, 'socketClient', message);
                    });

                    socketClient.emit('connect', PARAM);

                    socketClient.on('updates', function (JSONresponse) {
                        var recordsArray;
                        try {
                            verifrom.console.log(3, 'Proxy sent updates from updates Channel =', JSONresponse);
                            if (typeof JSONresponse !== 'object') {
                                verifrom.console.error(1, 'StopPhishing API Response not parsed');
                                recordsArray = JSON.parse(JSONresponse);
                            } else recordsArray = JSONresponse;
                            storeDBRecords(recordsArray);
                            // clear cache of the host check algorithm
                            checkHostHashCache.clear();
                            verifrom.debugapi.sendEvent('Phishing DB', 'Updated');
                        } catch (e) {
                            verifrom.console.error(1, 'Exception calling in updates :', e);
                            verifrom.debugapi.sendException('updates', true);
                        }
                    });

                    // initDB
                    socketClient.on('reset', function (JSONresponse) {
                        var recordsArray;
                        verifrom.console.log(3, 'Proxy sent reset command =', JSONresponse);
                        resetDB();
                        // clear cache of the host check algorithm
                        checkHostHashCache.clear();
                        verifrom.debugapi.sendEvent('Phishing DB', 'Resetted');
                        downloadDatabase(updatePhishingDatabase);
                    });

                    socketClient.on('disconnect', function () {
                        verifrom.console.error(1, 'WARNING proxy server disconnected');
                        //setTimeout(connectToPushProxy,60000);
                        /*setTimeout(function() {
                            //socketClient.worker.terminate();
                            socketClient=null;
                            setTimeout(connectToPushProxy,60000);
                        },5000);*/
                    });

                    socketClient.on('reconnect', function () {
                        verifrom.console.log(3, 'Proxy server REconnected');
                        updatePhishingDatabase();
                    });

                    socketClient.on('connect', function () {
                        verifrom.console.log(3, 'Proxy server connected :', arguments, this);
                    });

                    socketClient.on('close', function () {
                        verifrom.console.log(3, 'Proxy server sent close event');
                        setTimeout(reconnectToProxy, 30000);
                    });

                    socketClient.on('reportstatus', function (updateMessage) {
                        verifrom.console.log(3, 'Proxy server sent report update', updateMessage);
                        updateReport(updateMessage.UID, updateMessage.s, updateMessage.t);
                    });

                } else {
                    reconnectToProxy();
                }
            } catch (err) {
                verifrom.console.error(1, 'Exception calling StopPhishing API :', err);
                verifrom.debugapi.sendException('connectToPushProxy', true);
                return;
            }
        }

        function downloadDatabase(callback) {
            if (PARAM.OPTIONS.STOPPHISHING_WEBMAIL_ENABLE === false && PARAM.OPTIONS.STOPPHISHING_BROWSING_ENABLED === false)
                return;

            verifrom.console.log(1, 'downloadDatabase - download all database');

            disconnectFromProxy();

            var Request = verifrom.Request;
            Request({
                url: PARAM.URL_PROXY_DATABASE, //'https://extension.verifrom.com/proxy/database',
                timeout: 40000,
                onComplete: function (request) {
                    verifrom.console.log(4, 'downloadDatabase - request success :', request.status);
                    switch (request.status) {
                        case 503:
                            // DB not available - should retry later
                            setTimeout(downloadDatabase, 30000);
                            break;
                        case 200:
                            // Got all DB
                            verifrom.console.log(3, 'Proxy replied with all database after reset');
                            if (typeof request.json !== 'object') {
                                if (request.responseText) {
                                    request.json = JSON.parse(request.responseText);
                                } else return;
                            }
                            var recordsArray = request.json;

                            var socketInfo = recordsArray.pop();
                            if (!socketInfo.socketPort) {
                                verifrom.console.error(1, 'downloadDatabase - Missing signalspam_socket port');
                                socketPort = 3027;
                            } else socketPort = parseInt(socketInfo.socketPort);

                            verifrom.console.log(4, 'downloadDatabase - socketPort =' + socketPort);

                            initPhishingDBRecords(recordsArray,
                                function () {
                                    // clear cache of the host check algorithm
                                    checkHostHashCache.clear();
                                    verifrom.debugapi.sendEvent('Phishing DB', 'Reloaded');
                                    if (typeof callback === 'function')
                                        callback();
                                }
                            );
                            break;
                        default:
                            // unexpected response
                            verifrom.debugapi.sendException('downloadDatabase', true);
                            break;
                    }
                }
            }).get();
        }

        // Update the database of phishing links (hashed) with links added since the last update
        // Links and laste update time are stored in indexedDB databases
        function updatePhishingDatabase() {
            if (PARAM.OPTIONS.STOPPHISHING_WEBMAIL_ENABLE === false && PARAM.OPTIONS.STOPPHISHING_BROWSING_ENABLED === false)
                return;

            verifrom.console.log(2, 'updatePhishingDatabase called');
            getAllTimestamps(
                function (lastTimeStamp, lastResetTimeStamp) {

                    if (!lastTimeStamp) {
                        verifrom.console.log(2, 'updatePhishingDatabase - StopPhishing DB has never been initialized or has been resetted - latestTimeStamp=', lastTimeStamp);
                        downloadDatabase(updatePhishingDatabase);
                        return;
                    }

                    verifrom.console.log(2, 'Update StopPhishing DB : lastTimeStamp=' + lastTimeStamp + ' lastResetTimeStamp=' + lastResetTimeStamp);
                    // connect to Proxy
                    // As fetcher and proxy may be updated while the HTTP update request in ongoing
                    // We don't wait for connecting to Proxy
                    connectToPushProxy();
                    var Request = verifrom.Request;
                    Request({
                        url: PARAM.URL_PROXY_UPDATE, //'https://extension.verifrom.com/proxy/update',
                        contentType: "application/json",
                        content: {
                            "lastTimeStamp": lastTimeStamp,
                            "lastResetTimeStamp": lastResetTimeStamp,
                            "dbsize": hashLinkArray.size
                        },
                        onComplete: function (request) {
                            verifrom.console.log(4, 'updatePhishingDatabase - request result:' + request.status);
                            switch (request.status) {
                                case 503:
                                    // DB not available - should retry later
                                    setTimeout(updatePhishingDatabase, 30000);
                                    break;
                                case 204:
                                    // Reset is needed - we disconnect and reset the Database, and then updatePhishingDatabase will be called after updates
                                    resetDB();
                                    // clear cache of the host check algorithm
                                    checkHostHashCache.clear();
                                    downloadDatabase(function () {
                                        verifrom.debugapi.sendEvent('Phishing DB', 'Resetted');
                                        updatePhishingDatabase()
                                    });
                                    break;
                                case 200:
                                    // Got updates
                                    var recordsArray;

                                    if (typeof request.json !== 'object') {
                                        verifrom.console.log(1, 'updatePhishingDatabase - StopPhishing API Response not parsed');
                                        request.json = JSON.parse(request.responseText);
                                    }
                                    recordsArray = request.json;
                                    var socketInfo = recordsArray.pop();
                                    if (!socketInfo.socketPort) {
                                        verifrom.console.error(1, 'updatePhishingDatabase - Missing signalspam_socket port');
                                        socketInfo.socketPort = PARAM.SOCKETIO.defaultProxy || 3041;
                                    }
                                    if (!socketPort) {
                                        socketPort = parseInt(socketInfo.socketPort);
                                        connectToPushProxy();
                                    } else {
                                        if (socketPort !== parseInt(socketInfo.socketPort)) {
                                            verifrom.console.log(4, 'updatePhishingDatabase - socketPort changed ' + parseInt(socketInfo.socketPort) + ', was ' + socketPort);
                                            socketPort = parseInt(socketInfo.socketPort);
                                            reconnectToProxy();
                                        }
                                    }
                                    verifrom.console.log(4, 'updatePhishingDatabase - socketPort =' + socketPort);

                                    if (recordsArray.length > 0) {
                                        verifrom.console.log(3, 'updatePhishingDatabase - Proxy replied with updates :', request.json);

                                        storeDBRecords(recordsArray);
                                        // clear cache of the host check algorithm
                                        checkHostHashCache.clear();
                                    } else verifrom.console.log(3, 'updatePhishingDatabase - Proxy replied with 0 updates');
                                    verifrom.debugapi.sendEvent('Phishing DB', 'Updated');
                                    break;
                                default:
                                    // unexpected response
                                    verifrom.console.log(0, 'updatePhishingDatabase - unexpected response code ', request);
                                    verifrom.debugapi.sendException('updatePhishingDatabase', true);
                                    break;
                            }
                        }
                    }).get();
                },
                function () {
                    verifrom.console.error('Error or exception in getAllTimeStamps - could not load Phishing DB');
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
                    verifrom.console.log(4, 'updateLastDBReset - lastreset stored ' + timestamp);
                    if (typeof callback === 'function')
                        callback(true);
                },
                function () {
                    verifrom.console.error(1, 'updateLastDBReset - Error while saving lastreset timestamp');
                    if (typeof callback === 'function')
                        callback(false);
                }
            );
        }

        // Get the last time the phishing links DB was resetted
        function getLastReset(onSuccessCallBack, onErrorCallBack) {
            verifrom.indexeddb.objectStore.getItem('SPTSDB', 'timestampStore', lastResetId, onSuccessCallBack, onErrorCallBack);
        }

        // Reset the phishing DB
        function resetDB(callback) {
            verifrom.console.log(2, 'resetDB called');
            hashLinkArray.clear();
            linksArray = {};
            try {
                verifrom.indexeddb.objectStore.clear('SPHashDB', 'hash');
            } catch(e) {
                verifrom.console.error(0,"resetDB - could not reset DB");
            }
            verifrom.console.log(1, 'resetDB - Phishing DB is - cleared');
            updateLastDBReset(updateLatestTimeStamp.bind(null, 0, callback));
        }

        // Get the last time the phishing links DB was updated
        function getLatestTimeStamp(onSuccessCallBack, onErrorCallBack) {
            verifrom.indexeddb.objectStore.getItem('SPTSDB', 'timestampStore', lastTimestampId, onSuccessCallBack, onErrorCallBack);
        }

        // Update the last time the phishing links DB was updated
        function updateLatestTimeStamp(timestamp, callback) {
            verifrom.console.log(4, 'updateLatestTimeStamp - request to update latest timestamp to ' + timestamp);
            try {
                verifrom.indexeddb.objectStore.putItem('SPTSDB', 'timestampStore', {
                        id: lastTimestampId,
                        "timestamp": timestamp
                    }
                    , function () {
                        verifrom.console.log(4, 'updateLatestTimeStamp - latest timestamp stored ' + timestamp);
                        if (typeof callback === 'function')
                            callback(true);
                        callback=null;
                    }
                    , function () {
                        verifrom.console.error(3, 'updateLatestTimeStamp - Error while saving hash in DB');
                        verifrom.indexeddb.objectStore.deleteItem('SPTSDB', 'timestampStore', {id: lastTimestampId}
                            , function () {
                                verifrom.console.log(4, 'updateLatestTimeStamp - SPTSDB record deleted');
                            }
                            , function () {
                                verifrom.console.error(2, 'updateLatestTimeStamp - Error while deleting SPTSDB record');
                            }
                        );
                        if (typeof callback === 'function')
                            callback(false);
                        callback=null;
                    });
            } catch(e) {
                verifrom.console.error(0,"updateLatestTimeStamp - error updating latest timestamp");
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
                            //verifrom.console.log(4,'timestamp '+JSON.stringiy(allRecords[i]));
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
                            verifrom.console.log(4, 'Got all timestamp items');
                        else verifrom.console.log(1, 'Missing timestamp reset=' + lastReset + ' timestamp=' + lastTimestamp);
                        onSuccessCallBack(lastTimestamp, lastReset);
                    }
                    , onErrorCallBack);
            } catch (e) {
                verifrom.console.error(0, 'Exception in getAllTimestamps ', e);
                onErrorCallBack();
            }
        }

        function initPhishingDBRecords(recordsArray, onComplete) {
            verifrom.console.log(4, 'initPhishingDBRecords called');
            try {
                recordsArray[recordsArray.length - 1].last = true;
                updateLastDBReset(function () {
                    updateLatestTimeStamp(recordsArray[recordsArray.length - 1].time, function () {
                        recordsArray.forEach(function (record) {
                            if (typeof record.id === 'string')
                                record.id = parseInt(record.id);
                            if (record.action === 1 && record.id) {
                                var t = hashLinkArray.get(record.url);//,record.id);
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
                                        verifrom.console.log(4, 'SPHashDB stored');
                                    }
                                    , function () {
                                        verifrom.console.error(2, 'Error while storing SPHashDB record');
                                    });
                                } catch(e)
                                {
                                    verifrom.console.error(0,"initPhishingDBRecords - Got exception",e);
                                }
                                verifrom.console.log(2, 'A - Recorded ', recordsArray.length, ' records in SPHashDB');
                                if ("function" === typeof onComplete)
                                    onComplete();
                            }
                        });
                    });
                });

            } catch (e) {
                verifrom.console.error(1, 'Exception while saving phishing DB records', e);
                verifrom.debugapi.sendEvent('Phishing DB', 'initPhishingDBRecords Failure :'+e.message);
            }
        }

        // Store a set of phishing links in the local indexedDB
        function storeDBRecords(recordsArray, onComplete) {
            //var hashArrayUpdate=[];

            verifrom.console.log(2, 'storeDBRecords called');
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
                                    verifrom.console.log(4, 'SPHashDB stored');
                                    verifrom.console.log(2, 'B - Recorded ', recordsArray.length, ' records in SPHashDB');
                                    updateLatestTimeStamp(record.time, onComplete);
                                }
                                , function () {
                                    verifrom.console.error(2, 'Error while storing SPHashDB record');
                                }
                            );
                        }
                        catch(e) {
                            updateLatestTimeStamp(record.time, onComplete);
                        }
                    }
                });
                verifrom.console.log(2, 'C - Recorded ', recordsArray.length, ' records in SPHashDB');
            } catch (e) {
                verifrom.console.error(1, 'Exception while saving phishing DB records', e);
                verifrom.debugapi.sendException('storeDBRecords', true);
            }
        }

        // Load all phishing links (hashed) stored in the local indexedDB
        // And push required information to the content-script
        function loadDBRecords(callback) {
            if (PARAM.OPTIONS.STOPPHISHING_WEBMAIL_ENABLED === false && PARAM.OPTIONS.STOPPHISHING_BROWSING_ENABLED === false)
                return;

            verifrom.console.log(2, 'loadDBRecords called');

            getLatestTimeStamp(
                function (request) {
                    //var hashArrayUpdate=[];
                    var latestTimeStamp = request.result ? request.result.timestamp : 0;
                    var currentTime = (new Date()).getTime();

                    verifrom.console.log(4, 'loadDBRecords - Start load - latestTimeStamp=' + latestTimeStamp);

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
                                    verifrom.console.log(4, 'Got all items #' + hashLinkArray.size);
                                    if (hashLinkArray.size < 90000) {
                                        resetDB(function () {
                                            checkHostHashCache.clear();
                                            verifrom.console.log(4, 'DB too smal : reset');
                                            downloadDatabase(updatePhishingDatabase);
                                        });
                                        return;
                                    }
                                    //pushPhishingDatabase(hashArrayUpdate);
                                    updatePhishingDatabase();
                                } else {
                                    verifrom.console.error(1, 'SPHashDB does not contains hashtable data');
                                    resetDB(function () {
                                        checkHostHashCache.clear();
                                        verifrom.console.log(4, 'SPHashDB does not contains hashtable data : reset');
                                        downloadDatabase(updatePhishingDatabase);
                                    });
                                }

                            } catch (e) {
                                verifrom.console.error(1, 'Error while initializing url table');
                            }
                        }
                        , function () {
                            verifrom.console.error(1, 'Error while loading phishing DB records');
                        });
                },
                function () {
                    verifrom.console.error(1,"Could not get latest timestamp");
                    checkHostHashCache.clear();
                    downloadDatabase(updatePhishingDatabase);
                }
            );
        }

        // Push the phishing URLs array to content-scripts running in opened tabs
        function pushPhishingDatabase(hashArrayUpdate) {
        }

        /*********************************************************************************************************************/
        /************************* Open local database for Phishing hashes       *********************************************/

        /*********************************************************************************************************************/

        function openDatabases(DBName) {

            verifrom.console.log(4, 'openDatabases - open DBs');
            if (verifrom.appInfo.stopPhishingFeature) {
                if (DBName === undefined || DBName === 'SPHashDB') {
                    verifrom.console.log(1, 'openDatabases - open SPHashDB');
                    verifrom.indexeddb.open('SPHashDB', 'hash', {keyPath: "id", autoIncrement: false}, 10
                        , function () {
                            verifrom.console.log(3, 'openDatabases - SPHashDB objectStore opened');
                        }
                        , function (errorEvent) {
                            verifrom.console.error(1, 'openDatabases - Error while opening SPHashDB and hash objectStore', errorEvent);
                            verifrom.indexeddb.delete('SPHashDB',
                                function (event) {
                                    verifrom.console.log(3, 'SPHashDB database deleted');
                                    //openDatabases('SPHashDB');
                                },
                                function (event) {
                                    verifrom.console.error(1, 'openDatabases - Error when deleting SPHashDB database', event);
                                });
                        }
                        , function () {
                            verifrom.indexeddb.objectStore.clear('SPHashDB', 'hash');
                        });
                }

                if (DBName === undefined || DBName === 'SPTSDB') {
                    verifrom.console.log(1, 'openDatabases - open SPTSDB');

                    verifrom.indexeddb.open('SPTSDB', 'timestampStore', {keyPath: "id", autoIncrement: false}, 10
                        , function () {
                            verifrom.console.log(3, 'openDatabases - SPTSDB - timestamp objectStore opened');
                        }
                        , function (errorEvent) {
                            verifrom.console.error(1, 'openDatabases - Error while opening SPTSDB and timestampStore objectStore', errorEvent);
                            verifrom.indexeddb.delete('SPTSDB',
                                function (event) {
                                    verifrom.console.log(3, 'SPTSDB database deleted');
                                    //openDatabases('SPTSDB');
                                },
                                function (event) {
                                    verifrom.console.error(1, 'openDatabases - Error when deleting SPTSDB database');
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

            verifrom.console.log(4, 'suspiciousLink=', suspiciousLink);

            try {
                for (var i = 0; i < suspiciousLink.length && foundOne === false; i++) {
                    //var domainname=hostname.split('.').splice(-2,2).join('.');
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
                                        verifrom.console.log(4, 'checkHostHash - Grey listed hostname in cache - hashFullCanonLink==' + hashFullCanonLink + ' (' + typeof hashFullCanonLink + ')');

                                        for (var j = 0; j < previousResponse.hostname[i].hash32_url.length && hostHashMatching === false; j++) {
                                            if (previousResponse.hostname[i].hash32_url[j].toString() === hashFullCanonLink) {
                                                verifrom.console.log(4, 'checkHostHash - Grey-listed Phishing URL confirmed with hostname hash AND url hash in cache', hostname, hostHash, urlHash, previousResponse);
                                                foundOne = true;
                                                hostHashMatching = true;
                                                onPhishingCallback(urlHash, id);
                                            } else {
                                                verifrom.console.log(4, 'checkHostHash - Grey listed hostname in cache - Hash not matching : ' + previousResponse.hostname[i].hash32_url[j].toString());
                                            }
                                        }
                                    } else {
                                        foundOne = true;
                                        hostHashMatching = true;
                                        verifrom.console.log(4, 'Phishing URL confirmed with hostname hash from Cache', hostname, hostHash, urlHash, previousResponse)
                                        onPhishingCallback(urlHash, id);
                                    }
                                }
                            }
                            if (!hostHashMatching)
                                verifrom.console.log(4, 'No alert - hash collision detected in Cache', hostname, hostHash, urlHash, previousResponse)
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
                                                verifrom.console.log(4, 'checkHostHash - Grey listed hostname - hashFullCanonLink==' + hashFullCanonLink + ' (' + typeof hashFullCanonLink + ')');

                                                for (var j = 0; j < JSONresponse.hostname[i].hash32_url.length && hostHashMatching === false; j++) {
                                                    if (JSONresponse.hostname[i].hash32_url[j].toString() === hashFullCanonLink) {
                                                        verifrom.console.log(4, 'checkHostHash - Grey-listed Phishing URL confirmed with hostname hash AND url hash', hostname, hostHash, urlHash, JSONresponse);
                                                        foundOne = true;
                                                        hostHashMatching = true;
                                                        onPhishingCallback(this.urlHash, this.id);
                                                    } else {
                                                        verifrom.console.log(4, 'checkHostHash - Grey listed hostname - Hash not matching : ' + JSONresponse.hostname[i].hash32_url[j].toString());
                                                    }
                                                }
                                            } else {
                                                foundOne = true;
                                                hostHashMatching = true;
                                                verifrom.console.log(4, 'Phishing URL confirmed with hostname hash', this.hostname, hostHash, this.urlHash, JSONresponse)
                                                onPhishingCallback(this.urlHash, this.id);
                                            }
                                        }
                                    }
                                    if (!hostHashMatching)
                                        verifrom.console.log(4, 'No alert - hash collision detected', this.hostname, hostHash, this.urlHash, JSONresponse)
                                }
                            },
                            onFailure: function (httpCode) { // display an error message if the JSON param file could not be loaded
                                verifrom.console.error(1, 'checkHostHash : Failure calling StopPhishing API');
                            },
                            additionalRequestHeaders: {'Verifrom-id': PARAM.VERIFROMGADGETID},
                            contentType: 'application/x-www-form-urlencoded',
                            responseDataType: 'json'
                        });
                    }
                }
            } catch (err) {
                verifrom.console.error(1, 'checkHostHash : Exception calling StopPhishing API :', err);
                //verifrom.message.toBackground({'event':'checkHostHash Exception calling StopPhishing API from '+pageDomainName, 'fatal':true}, {channel: "AnalyticsException"});
                return;
            }
        }


        // Compute hash for links displayed in emails
        // The algorithm is very similar to the one being used by Google for Google Safe Browsing
        function checkHostPathCombination(hostname, port, path, query, linksHash, linksGreyHash) {
            // compute hash for each link

            var ipv4v6Addr = /^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/.test(hostname);
            var hostComponents;
            var trailingSlash = /\/$/.test(path) ? '/' : '';
            var hashCanonLink;
            var hashFullCanonLink;

            hostComponents = hostname.split('.');
            port = port !== "" ? ":" + port : "";
            hashFullCanonLink = XXH(hostname.replace(/^www\./i, '') + port + path + query, 0x0).toString();
            linksGreyHash.push(hashFullCanonLink);

            // Check link following Google Safe Browsing Dev Guide v3
            // >1 because TLD is not combined alone
            while (hostComponents.length > 1) {
                // Hash with the exact path of the URL, including query parameters
                var hostToHash = hostComponents.join('.');
                if (query.length > 0) {
                    hashCanonLink = parseInt(XXH(hostToHash + port + path + query, 0x0).toString());

                    var ids = hashLinkArray.get(hashCanonLink);
                    if (ids !== -1 && ids !== undefined && ids !== null && typeof ids === 'object' && ids.length > 0) {
                        linksHash.push(hashCanonLink);
                        verifrom.console.log(4, "URL : [" + hostToHash + port + query + "] phishing - hash is " + hashCanonLink);
                        return true;
                    } else verifrom.console.log(4, "URL : [" + hostToHash + port + query + "] NOT phishing - hash is " + hashCanonLink);
                }

                var URLpathComponents = path.split('/');
                if (URLpathComponents[0].length === 0)
                    URLpathComponents.shift();
                if (URLpathComponents[URLpathComponents.length - 1].length === 0)
                    URLpathComponents.pop();
                while (URLpathComponents.length >= 0) {
                    var pathToHash;
                    /*if (/\.[a-z0-9]{2,4}$/i.test(URLpathComponents[URLpathComponents.length-1]))
                     pathToHash='/'+URLpathComponents.join('/');
                     else*/
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
                        verifrom.console.log(4, "URL : [" + hostToHash + port + pathToHash + "] phishing - hash is " + hashCanonLink);
                        return true;
                    } else verifrom.console.log(4, "URL : [" + hostToHash + port + pathToHash + "] NOT phishing - hash is " + hashCanonLink);

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

        thisWorker.addListener("signalspam_checkHostPathCombination", function (message) {

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
                // canonalize URLs
                try {
                    verifrom.console.log(4, 'signalspam_checkHostPathCombination Handler - URL[' + i + ']=' + mailLinks[i]);
                    var canonURL = verifrom.URLCanonicalization.canonicalize(mailLinks[i]);
                    verifrom.console.log(4, 'signalspam_checkHostPathCombination Handler - Canon URL[' + i + ']=' + canonURL);
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
                    verifrom.console.error(4, 'Exception in signalspam_checkHostPathCombination message handler', e);
                }
            }
            if (phishingAlert) {
                if (verifrom.appInfo.stopPhishingCollisionCheckAPI) {
                    checkHostHash(suspiciousHosts, id, function (urlHash, id) {
                        verifrom.console.log(3, 'signalspam_startMailCheck - Hostname hash confirms phishing alert');
                        thisWorker.postMessage({
                            phishingAlert: true,
                            suspects: suspiciousHosts,
                            id: id
                        }, {channel: "signalspam_checkHostPathCombination"});
                    });
                } else {
                    thisWorker.postMessage({
                        phishingAlert: true,
                        suspects: suspiciousHosts,
                        id: id
                    }, {channel: "signalspam_checkHostPathCombination"});
                }
            }
        });

        // false positive reports from webmail
        function falsePositiveReport(msg) {
            if (msg) {
                verifrom.console.log(4, 'falsePositiveReport - msg=', msg);
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
                            verifrom.console.log(4, 'falsePositiveReport - negative url report completed');
                            switch (requestResponse.status) {
                                case 200:
                                case 201:
                                case 202:
                                case 204:
                                    verifrom.console.log(4, 'falsePositiveReport - negative url report - request success');
                                    break;
                                default:
                                    verifrom.console.log(4, 'falsePositiveReport - negative url report - request error:', requestResponse);
                                    break;
                            }
                        }
                    }).post();
                } catch (err) {
                    verifrom.console.error(1, 'Exception while posting false positive report', err);
                }
                if (msg.phishingHashes) {
                    verifrom.indexeddb.objectStore.getAllItems('SPHashDB', 'hash'
                        , function (allRecords) {
                            verifrom.console.log(4, 'falsePositiveReport - Got all DB items');
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
                                    //verifrom.console.log(5,'SPHashDB record deleted');
                                }
                                , function () {
                                    verifrom.console.error(2, 'Error while updating SPHashDB record');
                                }
                            );
                        }
                        , function () {
                            verifrom.console.error(1, 'Error while loading phishing DB records');
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
                                    //verifrom.console.log(5,'SPHashDB record deleted');
                                }
                                , function () {
                                    verifrom.console.error(2, 'Error while updating SPHashDB record');
                                }
                            );
                        }
                    );
                }
            } else {
                verifrom.console.error(1, 'falsePositiveReport - emailContent not set ?!', msg);
            }
        }

        // REPORT A FALSE POSITIVE PHISHING EMAIL
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
                        verifrom.console.log(4, 'sendPhishingStat - Phishing stat report completed');
                        switch (requestResponse.status) {
                            case 200:
                            case 201:
                            case 202:
                            case 204:
                                verifrom.console.log(4, 'sendPhishingStat - Phishing stat report succeeded ');
                                break;
                            default:
                                verifrom.console.log(4, 'sendPhishingStat - Error while posting Phishing stat report :', requestResponse);
                                break;
                        }
                    }
                }).post();
            } catch (err) {
                verifrom.console.error(1, 'Exception while posting false positive report', err);
            }
        }

        thisWorker.addListener("PhishingDetection", function (message) {
            sendPhishingStat(message);
        });


        /*********************************************************************************************************************/
        /******************************************* Phishing Reports transmission *******************************************/
        /*********************************************************************************************************************/

        // Encode text in base64
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

                //enc1 = (chr1 & 0xFC) >> 2;
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

        // Prepare the payload for the signalspam back-end server
        // The raw email header and body are encoded (base64) and formatted suttingly to signalspam back-end requirements
        function payloadForSignalSpam(payload) {
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
            //console.log("passwordEncrypt=["+result+"]");
            return result;
        }; //btoa;
        var passwordDecrypt = function (string) {
            result = decode(atob(string));
            //console.log("passwordDecrypt=["+result+"]");
            return result;
        };//atob;

        // Transmit a phishing email to the back-end server
        function postSignal(message, worker) {
            verifrom.console.log(2, 'signalPhishing message');
            try {
                var headers = {
                    'X-User-Agent': verifrom.appInfo.name + ' - Version ' + verifrom.appInfo.version + ' - ' + navigator.userAgent + ' - '
                };
                if (message.username && message.password)
                    headers['Authorization'] = "Basic " + passwordEncrypt(message.username + ':' + message.password);
                var payload;
                if (PARAM.OPTIONS.SIGNALSPAMPAYLOAD === true)
                    payload = payloadForSignalSpam(message);
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
                    contentType: PARAM.OPTIONS.SIGNALSPAMPAYLOAD ? "application/x-www-form-urlencoded" : "application/json",
                    headers: headers,
                    content: PARAM.OPTIONS.SIGNALSPAMPAYLOAD ? payload : JSON.stringify(payload),
                    onComplete: function (authResponse) {
                        verifrom.console.log(5, 'Auth Response=', authResponse.status);
                        switch (authResponse.status) {
                            case 200:
                            case 201:
                            case 202:
                                var content = null;
                                try {
                                    content = JSON.parse(authResponse.response);
                                } catch (e) {
                                    verifrom.console.log(0, 'Report Success but response has no valid json', authResponse.response);
                                }
                                thisWorker.postMessage({
                                    content: content,
                                    response: authResponse.status,
                                    key: message.key
                                }, {channel: "PayloadPosted" + message.key});
                                verifrom.console.log(3, 'Signaling succeeded', authResponse);
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
                                    verifrom.console.log(3, 'Signaling succeeded', authResponse);
                                } else {
                                    thisWorker.postMessage({
                                        response: authResponse.status,
                                        key: message.key
                                    }, {channel: "PayloadPosted" + message.key});
                                    verifrom.console.error(1, 'Error while posting signaling : ', authResponse.statusText);
                                }
                                break;
                        }
                    }
                }).post();
            } catch (err) {
                verifrom.console.error('Exception while posting phishing email', err);
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
            verifrom.console.log(1, '@WORKER - start signalspam_PARAM=', PARAM);

            var DBToOpen = verifrom.appInfo.stopPhishingFeature ? 2 : 0;
            var openTries = 0;
            verifrom.console.log(1, 'start - open ' + DBToOpen + ' databases');

            try {
                openDatabases();
            } catch(e) {
                verifrom.console.error(0, 'start - could not open databases');
            }

            // We wait for all databases to be opened
            setTimeout(function waitForDBOpen() {
                if (Object.keys(verifrom.indexeddb.openedDBs).length < DBToOpen) {
                    verifrom.console.log(3, 'Waiting for databases opened');
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
                        verifrom.console.error(0, 'start - could not load DB records');
                    }
                    thisWorker.postMessage("ready", {channel: "ready"});
                }
            }, openTries);
        });

        thisWorker.addListener("params", function (message) {
            PARAM = message;
            verifrom.console.log(1, 'Worker started - params set');
        });

        thisWorker.addListener("addReport", function (message) {
            verifrom.console.log(2, 'Worker message - addReport');
            addReport(message.uid, message.report);
        });

        thisWorker.addListener("loadReports", function (message) {
            verifrom.console.log(2, 'Worker message - loadReports');
            try {
                loadReports(function (reports) {
                    verifrom.console.log(2, 'Worker message - loadReports - send response');
                    thisWorker.postMessage(reports, {channel: "reportsLoaded"})
                });
            } catch (e) {
                verifrom.console.error(0, 'Worker message - loadReports - Exception', e);
                thisWorker.postMessage([], {channel: "reportsLoaded"})
            }
        });

        thisWorker.addListener("deleteReports", function (message) {
            verifrom.console.log(2, 'Worker message - deleteReports');
            deleteReports(message, function (reports) {
                verifrom.console.log(2, 'Worker message - deleteReports - send response');
                thisWorker.postMessage(reports, {channel: "reportsDeleted"})
            });
        });

        thisWorker.addListener("_close", function (message) {
            verifrom.console.log(2, "_close message");
            var index
            if ((index = listeningWorkers.indexOf(thisWorker)) >= 0) {
                listeningWorkers.splice(index, 1);
                thisWorker.close(false);
            }
            verifrom.console.log(2, "_close message - listeners remaining", listeningWorkers);
        });

        thisWorker.addListener("resetbadge", function () {
            notifyAllWorkerListeners({}, {channel: "resetbadge"});
        });

        if (sharedWorkerDisabled===false)
            port.start();
        // else we do nothing
    };
    verifrom.console.log(0, 'WORKER launched');
    if (sharedWorkerDisabled===true) {
        onconnect({ports:[window]});
    }
    openReportsDB();
})();