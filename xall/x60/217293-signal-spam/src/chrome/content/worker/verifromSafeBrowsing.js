/**
 * Created by emmanuelsellier on 17/05/2017.
 */
//self.importScripts('chrome://signalspam/content/include/localforage.nopromises.min.js');
self.importScripts('chrome://signalspam/content/specific/signalspam/extensionConfig.js');
self.importScripts('chrome://signalspam/content/include/verifrom_api.js');
self.importScripts('chrome://signalspam/content/include/xxhash.js');
self.importScripts('chrome://signalspam/content/include/uint64.js');
self.importScripts('chrome://signalspam/content/include/xxhash64.js');

var thisWorker=new verifrom.worker(self);

var PARAM;
var hashLinkArray=new Map();
var linksArray={};
var checkHostHashCache=new Map();
var socketClient=null;
var socketPort=undefined;
var hostHashTable=[];
var hostAnalyticsTimeout;
var pendingSignaling=[];

var hashTableId=1;
var lastResetId=1;
var lastTimestampId=2;

function setHostAnalytics(hostname, action)
{
    hostname=hostname.replace(/^www\./i,"");
    var hostHash=XXH64(hostname,0x0).toString();
    if (hostHashTable.findIndex(function(hashItem){return (hashItem.hash===hostHash && hashItem.action===action);})===-1)
        hostHashTable.push({"action":action, "hash":hostHash});
    if (!hostAnalyticsTimeout)
        hostAnalyticsTimeout=setInterval(pushSafeSurf,60000);
}

function pushSafeSurf()
{
    if (hostHashTable.length===0)
        return;

    if (PARAM.OPTIONS.SURFSAFE_ENABLED===false)
    {
        hostHashTable=[];
        return;
    }

    verifrom.console.log(4,'pushSafeSurf - send data:',hostHashTable);

    var Request = verifrom.Request;
    Request({
        url:PARAM.URL_SURFSAFE,
        contentType: 'application/json; charset=utf-8',
        headers: {
            'X-User-Agent': verifrom.appInfo.name+' - Version '+verifrom.appInfo.version+' - '+navigator.userAgent+' - '
        },
        content: JSON.stringify({"hostHashes":hostHashTable}),
        timeout:30000,
        anonymous: true,
        onComplete: function(authResponse) {
            switch (authResponse.status)
            {
                case 200:
                case 201:
                case 202:
                case 204:
                    verifrom.console.log(4,'pushSafeSurf - request success');
                    hostHashTable=[];
                    break;
                default:
                    verifrom.console.log(4,'pushSafeSurf - request error:',authResponse);
                    break;
            }
        }
    }).post();
}

/*********************************************************************************************************************/
/************************************************ SOCKET.IO - PUSH MANAGEMENT ****************************************/
/*********************************************************************************************************************/

function socketClientAdapter()
{

}

socketClientAdapter.prototype={
    emit:function(channel,data){
        thisWorker.postMessage(data, {"channel":channel});
    },
    on:function(channel,handler) {
        thisWorker.addListener(channel, handler);
    }
};

function reconnectToProxy()
{
    if (socketClient)
    {
        verifrom.console.log(1,'reconnectToProxy - reconnect to proxy');
        socketClient.emit("reconnect",PARAM);
    }
    else verifrom.console.log(1,'reconnectToProxy - socketClient not connected');
}

function disconnectFromProxy()
{
    if (socketClient)
    {
        // disconnect from push
        verifrom.console.log(1,'disconnectFromProxy - disconnecting from proxy');
        //socketClient.disconnect();
        socketClient.emit("disconnect",PARAM);
    }
    else verifrom.console.log(1,'disconnectFromProxy - socketClient not connected');
}

function connectToPushProxy()
{
    try {
        if (!socketClient)
        {
            //socketClient= new verifrom.worker('chrome://signalspam/content/worker/socket.interface.js');
            socketClient= new socketClientAdapter();
            verifrom.console.log(3,'socketClient worker created');

            socketClient.on('log', function(message) {
                verifrom.console.log(1,'socketClient',message);
            });

            socketClient.emit('connect',PARAM);

            socketClient.on('updates',function(JSONresponse) {
                var recordsArray;
                try {
                    verifrom.console.log(3,'Proxy sent updates from updates Channel =',JSONresponse);
                    if (typeof JSONresponse!=='object')
                    {
                        verifrom.console.error(1,'StopPhishing API Response not parsed');
                        recordsArray=JSON.parse(JSONresponse);
                    }
                    else recordsArray=JSONresponse;
                    storeDBRecords(recordsArray);
                    // clear cache of the host check algorithm
                    checkHostHashCache.clear();
                    verifrom.tracker.sendEvent('Phishing DB', 'Updated');
                } catch(e)
                {
                    verifrom.console.error(1,'Exception calling in updates :',e);
                    verifrom.tracker.sendException('updates', true);
                }
            });

            // initDB
            socketClient.on('reset',function(JSONresponse) {
                var recordsArray;
                verifrom.console.log(3,'Proxy sent reset command =',JSONresponse);
                resetDB();
                // clear cache of the host check algorithm
                checkHostHashCache.clear();
                verifrom.tracker.sendEvent('Phishing DB', 'Resetted');
                downloadDatabase(updatePhishingDatabase);
            });

            socketClient.on('disconnect', function() {
                verifrom.console.error(1,'WARNING proxy server disconnected');
                //setTimeout(connectToPushProxy,60000);
                /*setTimeout(function() {
                    //socketClient.worker.terminate();
                    socketClient=null;
                    setTimeout(connectToPushProxy,60000);
                },5000);*/
            });

            socketClient.on('reconnect', function() {
                verifrom.console.log(3,'Proxy server REconnected');
                updatePhishingDatabase();
            });

            socketClient.on('connect', function() {
                verifrom.console.log(3,'Proxy server connected :',arguments,this);
            });

            socketClient.on('close', function() {
                verifrom.console.log(3,'Proxy server sent close event');
                setTimeout(reconnectToProxy, 30000);
            });

        }
        else  {
            reconnectToProxy();
        }
    } catch (err)
    {
        verifrom.console.error(1,'Exception calling StopPhishing API :',err);
        verifrom.tracker.sendException('connectToPushProxy', true);
        return;
    }
}

function downloadDatabase(callback)
{
    if (PARAM.OPTIONS.STOPPHISHING_WEBMAIL_ENABLE===false && PARAM.OPTIONS.STOPPHISHING_BROWSING_ENABLED===false)
        return;

    verifrom.console.log(1,'downloadDatabase - download all database');

    disconnectFromProxy();

    var Request = verifrom.Request;
    Request({
        url: PARAM.URL_PROXY_DATABASE, //'https://extension.verifrom.com/proxy/database',
        timeout:40000,
        onComplete: function(request)
        {
            verifrom.console.log(4,'downloadDatabase - request success :',request.status);
            switch (request.status)
            {
                case 503:
                    // DB not available - should retry later
                    setTimeout(downloadDatabase,30000);
                    break;
                case 200:
                    // Got all DB
                    verifrom.console.log(3,'Proxy replied with all database after reset');
                    if (typeof request.json!=='object')
                    {
                        if (request.responseText)
                        {
                            request.json=JSON.parse(request.responseText);
                        }
                        else return;
                    }
                    var recordsArray=request.json;

                    var socketInfo=recordsArray.pop();
                    if (!socketInfo.socketPort)
                    {
                        verifrom.console.error(1,'downloadDatabase - Missing socket port');
                        socketPort=3027;
                    }
                    else socketPort=parseInt(socketInfo.socketPort);

                    verifrom.console.log(4,'downloadDatabase - socketPort ='+socketPort);

                    initPhishingDBRecords(recordsArray,
                        function(){
                            // clear cache of the host check algorithm
                            checkHostHashCache.clear();
                            verifrom.tracker.sendEvent('Phishing DB', 'Reloaded');
                            if (typeof callback === 'function')
                                callback();
                        }
                    );
                    break;
                default:
                    // unexpected response
                    verifrom.tracker.sendException('downloadDatabase', true);
                    break;
            }
        }
    }).get();
}

// Update the database of phishing links (hashed) with links added since the last update
// Links and laste update time are stored in indexedDB databases
function updatePhishingDatabase()
{
    if (PARAM.OPTIONS.STOPPHISHING_WEBMAIL_ENABLE===false && PARAM.OPTIONS.STOPPHISHING_BROWSING_ENABLED===false)
        return;

    verifrom.console.log(2,'updatePhishingDatabase called');
    getAllTimestamps(
        function(lastTimeStamp,lastResetTimeStamp) {

            if (!lastTimeStamp)
            {
                verifrom.console.log(2,'updatePhishingDatabase - StopPhishing DB has never been initialized or has been resetted - latestTimeStamp=', lastTimeStamp);
                downloadDatabase(updatePhishingDatabase);
                return;
            }

            verifrom.console.log(2,'Update StopPhishing DB : lastTimeStamp='+lastTimeStamp+' lastResetTimeStamp='+lastResetTimeStamp);
            // connect to Proxy
            // As fetcher and proxy may be updated while the HTTP update request in ongoing
            // We don't wait for connecting to Proxy
            connectToPushProxy();
            var Request = verifrom.Request;
            Request({
                url: PARAM.URL_PROXY_UPDATE, //'https://extension.verifrom.com/proxy/update',
                contentType:"application/json",
                content:{"lastTimeStamp":lastTimeStamp,"lastResetTimeStamp":lastResetTimeStamp,"dbsize":hashLinkArray.size},
                onComplete: function(request) {
                    verifrom.console.log(4,'updatePhishingDatabase - request result:'+request.status);
                    switch (request.status)
                    {
                        case 503:
                            // DB not available - should retry later
                            setTimeout(updatePhishingDatabase,30000);
                            break;
                        case 204:
                            // Reset is needed - we disconnect and reset the Database, and then updatePhishingDatabase will be called after updates
                            resetDB();
                            // clear cache of the host check algorithm
                            checkHostHashCache.clear();
                            downloadDatabase(function() {
                                verifrom.tracker.sendEvent('Phishing DB', 'Resetted');
                                updatePhishingDatabase()
                            });
                            break;
                        case 200:
                            // Got updates
                            var recordsArray;

                            if (typeof request.json!=='object')
                            {
                                verifrom.console.log(1,'updatePhishingDatabase - StopPhishing API Response not parsed');
                                request.json=JSON.parse(request.responseText);
                            }
                            recordsArray=request.json;
                            var socketInfo=recordsArray.pop();
                            if (!socketInfo.socketPort)
                            {
                                verifrom.console.error(1,'updatePhishingDatabase - Missing socket port');
                                socketInfo.socketPort=3027;
                            }
                            if (!socketPort)
                            {
                                socketPort=parseInt(socketInfo.socketPort);
                                connectToPushProxy();
                            } else {
                                if (socketPort !== parseInt(socketInfo.socketPort))
                                {
                                    verifrom.console.log(4,'updatePhishingDatabase - socketPort changed '+parseInt(socketInfo.socketPort)+', was '+socketPort);
                                    socketPort=parseInt(socketInfo.socketPort);
                                    reconnectToProxy();
                                }
                            }
                            verifrom.console.log(4,'updatePhishingDatabase - socketPort ='+socketPort);

                            if (recordsArray.length>0)
                            {
                                verifrom.console.log(3,'updatePhishingDatabase - Proxy replied with updates :',request.json);

                                storeDBRecords(recordsArray);
                                // clear cache of the host check algorithm
                                checkHostHashCache.clear();
                            }
                            else verifrom.console.log(3,'updatePhishingDatabase - Proxy replied with 0 updates');
                            verifrom.tracker.sendEvent('Phishing DB', 'Updated');
                            break;
                        default:
                            // unexpected response
                            verifrom.console.log(0,'updatePhishingDatabase - unexpected response code ',request);
                            verifrom.tracker.sendException('updatePhishingDatabase', true);
                            break;
                    }
                }
            }).get();
        },
        function(){
            verifrom.console.error('Error or exception in getAllTimeStamps - could not load Phishing DB');
        }
    );
}

function updateLastDBReset(callback)
{
    var timestamp=(new Date()).getTime();

    verifrom.indexeddb.objectStore.putItem('SPTSDB', 'timestampStore', {'id':lastResetId, 'lastreset':timestamp},
        function() {
            verifrom.console.log(4,'updateLastDBReset - lastreset stored '+timestamp);
            if (typeof callback==='function')
                callback(true);
        },
        function() {
            verifrom.console.error(1,'updateLastDBReset - Error while saving lastreset timestamp');
            if (typeof callback==='function')
                callback(false);
        }
    );
}

// Get the last time the phishing links DB was resetted
function getLastReset(onSuccessCallBack, onErrorCallBack)
{
    verifrom.indexeddb.objectStore.getItem('SPTSDB', 'timestampStore', lastResetId, onSuccessCallBack, onErrorCallBack);
}

// Reset the phishing DB
function resetDB(callback)
{
    verifrom.console.log(2,'resetDB called');

    verifrom.indexeddb.objectStore.clear('SPHashDB', 'hash');
    hashLinkArray.clear();
    linksArray={};
    verifrom.console.log(1,'Phishing DB is - cleared');
    updateLastDBReset(updateLatestTimeStamp.bind(null,0, callback));
}

// Get the last time the phishing links DB was updated
function getLatestTimeStamp(onSuccessCallBack, onErrorCallBack)
{
    verifrom.indexeddb.objectStore.getItem('SPTSDB', 'timestampStore', lastTimestampId, onSuccessCallBack, onErrorCallBack);
}

// Update the last time the phishing links DB was updated
function updateLatestTimeStamp(timestamp, callback)
{
    verifrom.console.log(4,'updateLatestTimeStamp - request to update latest timestamp to '+timestamp);
    verifrom.indexeddb.objectStore.putItem('SPTSDB', 'timestampStore', {id: lastTimestampId, "timestamp":timestamp}
    , function() {
        verifrom.console.log(4,'updateLatestTimeStamp - latest timestamp stored '+timestamp);
        if (typeof callback==='function')
            callback(true);
    }
    , function() {
        verifrom.console.error(3,'updateLatestTimeStamp - Error while saving hash in DB');
        verifrom.indexeddb.objectStore.deleteItem('SPTSDB', 'timestampStore', {id: lastTimestampId}
            ,function() {
                verifrom.console.log(4,'updateLatestTimeStamp - SPTSDB record deleted');
            }
            ,function() {
                verifrom.console.error(2,'updateLatestTimeStamp - Error while deleting SPTSDB record');
            }
        );
        if (typeof callback==='function')
            callback(false);

        });
}

function getAllTimestamps(onSuccessCallBack, onErrorCallBack)
{
    try {
        verifrom.indexeddb.objectStore.getAllItems('SPTSDB', 'timestampStore'
            ,function(allRecords) {
                var lastTimestamp;
                var lastReset;
                for(var i=0;i<allRecords.length;i++)
                {
                    //verifrom.console.log(4,'timestamp '+JSON.stringiy(allRecords[i]));
                    switch (allRecords[i].id)
                    {
                        case lastResetId:
                            lastReset=allRecords[i].lastreset;
                            break;
                        case lastTimestampId:
                            lastTimestamp=allRecords[i].timestamp;
                            break;
                    }
                }
                if (lastTimestamp && lastReset)
                    verifrom.console.log(4,'Got all timestamp items');
                else verifrom.console.log(1,'Missing timestamp reset='+lastReset+' timestamp='+lastTimestamp);
                onSuccessCallBack(lastTimestamp, lastReset);
            }
            ,onErrorCallBack);
    } catch(e) {
        verifrom.console.error(0,'Exception in getAllTimestamps ',e);
        onErrorCallBack();
    }
}

// Store a set of phishing links in the local indexedDB
function initPhishingDBRecords(recordsArray, onComplete)
{
   // var hashArrayUpdate=[];

    verifrom.console.log(4,'initPhishingDBRecords called');
    try {
        //var addedRecords=[];
        //var deletedRecords=[];
        recordsArray[recordsArray.length-1].last=true;
        updateLastDBReset(function() {
            updateLatestTimeStamp(recordsArray[recordsArray.length-1].time, function(){
                recordsArray.forEach(function(record) {
                    if (typeof record.id==='string')
                        record.id=parseInt(record.id);
                    if (record.action===1)
                    {
                        //addedRecords.push({"id":record.id, "url":record.url});
                        var t=hashLinkArray.get(record.url);//,record.id);
                        if (t && t.push) {
                            t.push(record.id);
                            hashLinkArray.set(record.url,t);
                        }
                        else hashLinkArray.set(record.url,[record.id]);
                        linksArray[record.id]=record.url;
                        /*verifrom.indexeddb.objectStore.putItem('SPHashDB', 'hash', {"id":record.id, "url":record.url}
                         ,function() {
                         //verifrom.console.log(5,'Hash record saved in SPHashDB:',record.id,record.url);
                         }
                         , function(){
                         verifrom.console.error(2,'Error while saving hash in DB');
                         }
                         );*/
                    }
                    else {
                        //deletedRecords.push({"id":record.id});
                        var removedIds=hashLinkArray.get(record.url);
                        hashLinkArray.delete(record.url);
                        if (removedIds)
                        {
                            removedIds.forEach(function(linkId) {
                                delete linksArray[linkId];
                            });
                        }
                        if (linksArray[record.id])
                            delete linksArray[record.id];
                        /*verifrom.indexeddb.objectStore.deleteItem('SPHashDB', 'hash', record.id
                         ,function() {
                         //verifrom.console.log(5,'SPHashDB record deleted');
                         }
                         ,function() {
                         verifrom.console.error(2,'Error while deleting SPHashDB record');
                         }
                         );*/
                    }
                    if (record.last===true)
                    {
                        verifrom.indexeddb.objectStore.putItem('SPHashDB', 'hash', {id:hashTableId, data:JSON.stringify(linksArray)}
                            ,function() {
                                verifrom.console.log(4,'SPHashDB stored');
                            }
                            ,function() {
                                verifrom.console.error(2,'Error while storing SPHashDB record');
                            }
                        );
                        verifrom.console.log(2,'A - Recorded ',recordsArray.length,' records in SPHashDB');
                        if ("function" === typeof onComplete)
                            onComplete();
                    }
                    //hashArrayUpdate.push({u:record.url,a:record.action});
                });
            });
        });


        /*verifrom.indexeddb.objectStore.putItem('SPHashDB', 'hash', addedRecords
            ,function() {
                //verifrom.console.log(5,'Hash record saved in SPHashDB:',record.id,record.url);
            }
            , function(){
                verifrom.console.error(2,'Error while saving hash in DB');
            }
        );
        deletedRecords.forEach(function(record) {
            verifrom.indexeddb.objectStore.deleteItem('SPHashDB', 'hash', record.id
                ,function() {
                    //verifrom.console.log(5,'SPHashDB record deleted');
                }
                ,function() {
                    verifrom.console.error(2,'Error while deleting SPHashDB record');
                }
            );
        });*/
    } catch (e) {
        verifrom.console.error(1,'Exception while saving phishing DB records',e);
        verifrom.tracker.sendEvent('Phishing DB', 'initPhishingDBRecords Failure');
    }
    //pushPhishingDatabase(hashArrayUpdate);
}

// Store a set of phishing links in the local indexedDB
function storeDBRecords(recordsArray, onComplete)
{
    //var hashArrayUpdate=[];

    verifrom.console.log(2,'storeDBRecords called');
    recordsArray[recordsArray.length-1].last=true;
    try {
        recordsArray.map(function(record) {
            if (typeof record.id==='string')
                record.id=parseInt(record.id);
            if (record.action===1) {
                var t=hashLinkArray.get(record.url);
                if (t!==-1) {
                    if (t && t.push) {
                        t.push(record.id);
                        hashLinkArray.set(record.url, t);
                    }
                    else hashLinkArray.set(record.url, [record.id]);
                    linksArray[record.id] = record.url;
                }
                /*verifrom.indexeddb.objectStore.putItem('SPHashDB', 'hash', {"id":record.id, "url":record.url}
                    ,function() {
                        //verifrom.console.log(5,'Hash record saved in SPHashDB:',record.id,record.url);
                    }
                    , function(){
                        verifrom.console.error(2,'Error while saving hash in DB');
                    }
                );*/
            }
            else {
                var removedIds=hashLinkArray.get(record.url);
                hashLinkArray.delete(record.url);
                if (removedIds)
                {
                    removedIds.forEach(function(linkId) {
                        delete linksArray[linkId];
                    });
                }
                if (linksArray[record.id])
                    delete linksArray[record.id];
                /*verifrom.indexeddb.objectStore.deleteItem('SPHashDB', 'hash', record.id
                    ,function() {
                        //verifrom.console.log(5,'SPHashDB record deleted');
                    }
                    ,function() {
                        verifrom.console.error(2,'Error while deleting SPHashDB record');
                    }
                );*/
            }
            if (record.last===true)
            {
                verifrom.indexeddb.objectStore.putItem('SPHashDB', 'hash', {id:hashTableId, data:JSON.stringify(linksArray)}
                    ,function() {
                        verifrom.console.log(4,'SPHashDB stored');
                        verifrom.console.log(2,'B - Recorded ',recordsArray.length,' records in SPHashDB');
                        updateLatestTimeStamp(record.time, onComplete);
                        /*if ("function" === typeof onComplete)
                            onComplete();*/
                    }
                    ,function() {
                        verifrom.console.error(2,'Error while storing SPHashDB record');
                    }
                );
            }

            //hashArrayUpdate.push({u:record.url,a:record.action});
        });
        verifrom.console.log(2,'C - Recorded ',recordsArray.length,' records in SPHashDB');
    } catch (e) {
        verifrom.console.error(1,'Exception while saving phishing DB records',e);
        verifrom.tracker.sendException('storeDBRecords', true);
    }
    //pushPhishingDatabase(hashArrayUpdate);
    /*if ("function" === typeof onComplete)
        onComplete();*/
}

// Load all phishing links (hashed) stored in the local indexedDB
// And push required information to the content-script
function loadDBRecords(callback)
{
    if (PARAM.OPTIONS.STOPPHISHING_WEBMAIL_ENABLE===false && PARAM.OPTIONS.STOPPHISHING_BROWSING_ENABLED===false)
        return;

    verifrom.console.log(2,'loadDBRecords called');

    getLatestTimeStamp(
        function(request) {
            //var hashArrayUpdate=[];
            var latestTimeStamp=request.result ? request.result.timestamp : 0;
            var currentTime=(new Date()).getTime();

            verifrom.console.log(4,'loadDBRecords - Start load - latestTimeStamp='+latestTimeStamp);
            verifrom.indexeddb.objectStore.getItem('SPHashDB', 'hash', hashTableId
                ,function(queryResult) {
                    try {
                        if (queryResult && queryResult.result && queryResult.result.data)
                        {
                            linksArray=JSON.parse(queryResult.result.data);
                            Object.keys(linksArray).forEach(function(linkId) {
                                if (typeof linkId==='string')
                                    linkId=parseInt(linkId);
                                var t=hashLinkArray.get(linksArray[linkId]);
                                if (t!==-1)
                                    if (t && t.push) {
                                        t.push(linkId);
                                        hashLinkArray.set(linksArray[linkId], t);
                                    }
                                    else hashLinkArray.set(linksArray[linkId], [linkId]);
                            });
                            verifrom.console.log(4,'Got all items #'+hashLinkArray.size);
                            if (hashLinkArray.size<90000)
                            {
                                resetDB(function() {
                                    checkHostHashCache.clear();
                                    verifrom.console.log(4,'DB too smal : reset');
                                    downloadDatabase(updatePhishingDatabase);
                                });
                                return;
                            }
                            //pushPhishingDatabase(hashArrayUpdate);
                            updatePhishingDatabase();
                        } else {
                            verifrom.console.error(1,'SPHashDB does not contains hashtable data');
                            resetDB(function() {
                                checkHostHashCache.clear();
                                verifrom.console.log(4,'SPHashDB does not contains hashtable data : reset');
                                downloadDatabase(updatePhishingDatabase);
                            });
                        }

                    } catch(e) {
                        verifrom.console.error(1,'Error while initializing url table');
                    }
                }
                ,function() {
                    verifrom.console.error(1,'Error while loading phishing DB records');
                });


                    /*verifrom.indexeddb.objectStore.getAllItems('SPHashDB', 'hash'
                        ,function(allRecords) {
                            for(var i=0;i<allRecords.length;i++)
                            {
                                var t=hashLinkArray.get(allRecords[i].url);
                                if (t!==-1)
                                    if (t && t.push) {
                                        t.push(allRecords[i].id);
                                        hashLinkArray.set(allRecords[i].url, t);
                                    }
                                    else hashLinkArray.set(allRecords[i].url, [allRecords[i].id]);
                            }
                            verifrom.console.log(4,'Got all items #'+hashLinkArray.size);
                            if (hashLinkArray.size<90000)
                            {
                                resetDB(function() {
                                    checkHostHashCache.clear();
                                    verifrom.console.log(4,'DB too smal : reset');
                                    downloadDatabase(updatePhishingDatabase);
                                });
                                return;
                            }
                            //pushPhishingDatabase(hashArrayUpdate);
                            updatePhishingDatabase();
                        }
                        ,function() {
                            verifrom.console.error(1,'Error while loading phishing DB records');
                        });*/
        }
    );
}

// Push the phishing URLs array to content-scripts running in opened tabs
function pushPhishingDatabase(hashArrayUpdate)
{
}

/*********************************************************************************************************************/
/************************* Open local database for Phishing hashes       *********************************************/
/*********************************************************************************************************************/

function openDatabases(DBName)
{

    verifrom.console.log(4,'openDatabases - open DBs');
    if (verifrom.appInfo.stopPhishingFeature) {
        if (DBName === undefined || DBName==='SPHashDB')
        {
            verifrom.console.log(1,'openDatabases - open SPHashDB');
            verifrom.indexeddb.open('SPHashDB', 'hash', {keyPath: "id", autoIncrement:false}, 10
                ,function(){
                    verifrom.console.log(3,'openDatabases - SPHashDB objectStore opened');
                }
                ,function(errorEvent){
                    verifrom.console.error(1,'openDatabases - Error while opening SPHashDB and hash objectStore', errorEvent);
                    verifrom.indexeddb.delete('SPHashDB',
                        function(event) {
                            verifrom.console.log(3,'SPHashDB database deleted');
                            //openDatabases('SPHashDB');
                        },
                        function(event) {
                            verifrom.console.error(1,'openDatabases - Error when deleting SPHashDB database',event);
                        });
                }
                ,function(){
                    verifrom.indexeddb.objectStore.clear('SPHashDB','hash');
                });
        }

        if (DBName === undefined || DBName==='SPTSDB')
        {
            verifrom.console.log(1,'openDatabases - open SPTSDB');

            verifrom.indexeddb.open('SPTSDB', 'timestampStore', { keyPath: "id", autoIncrement:false }, 10
                ,function(){
                    verifrom.console.log(3,'openDatabases - SPTSDB - timestamp objectStore opened');
                }
                ,function(errorEvent){
                    verifrom.console.error(1,'openDatabases - Error while opening SPTSDB and timestampStore objectStore',errorEvent);
                    verifrom.indexeddb.delete('SPTSDB',
                        function(event) {
                            verifrom.console.log(3,'SPTSDB database deleted');
                            //openDatabases('SPTSDB');
                        },
                        function(event) {
                            verifrom.console.error(1,'openDatabases - Error when deleting SPTSDB database');
                        });
                }
                ,function(){
                    verifrom.indexeddb.objectStore.clear('hash','timestamp');
                });
        }
    }
}


function checkHostHash(suspiciousLink, id, onPhishingCallback)
{
    var foundOne=false;

    verifrom.console.log(4,'suspiciousLink=',suspiciousLink);

    try {
        for (var i=0; i<suspiciousLink.length && foundOne===false;i++)
        {
            //var domainname=hostname.split('.').splice(-2,2).join('.');
            var hostname=suspiciousLink[i].hostname;
            var urlHash=suspiciousLink[i].hash.toString();
            var hashFullCanonLink=suspiciousLink[i].hashFull;

            hostname=verifrom.URLCanonicalization.normalizeHostName(hostname);
            var previousResponse=checkHostHashCache.get(urlHash);
            if (typeof previousResponse !== 'undefined')
            {
                if ("undefined" !== typeof previousResponse.hostname && previousResponse.hostname.length > 0)
                {
                    var hostHash=parseInt(XXH(hostname, 0x0).toString());
                    var hostHashMatching=false;
                    for (var i=0; i<previousResponse.hostname.length && hostHashMatching===false;i++)
                    {
                        if (previousResponse.hostname[i].hash32_hostname===hostHash)
                        {
                            if (typeof previousResponse.hostname[i].hash32_url !== 'undefined')
                            {
                                verifrom.console.log(4,'checkHostHash - Grey listed hostname in cache - hashFullCanonLink=='+hashFullCanonLink+' ('+typeof hashFullCanonLink+')');

                                for (var j=0; j<previousResponse.hostname[i].hash32_url.length && hostHashMatching===false; j++)
                                {
                                    if (previousResponse.hostname[i].hash32_url[j].toString()===hashFullCanonLink)
                                    {
                                        verifrom.console.log(4,'checkHostHash - Grey-listed Phishing URL confirmed with hostname hash AND url hash in cache',hostname, hostHash, urlHash, previousResponse);
                                        foundOne=true;
                                        hostHashMatching=true;
                                        onPhishingCallback(urlHash, id);
                                    } else {
                                        verifrom.console.log(4,'checkHostHash - Grey listed hostname in cache - Hash not matching : '+previousResponse.hostname[i].hash32_url[j].toString());
                                    }
                                }
                            }
                            else
                            {
                                foundOne=true;
                                hostHashMatching=true;
                                verifrom.console.log(4,'Phishing URL confirmed with hostname hash from Cache',hostname, hostHash, urlHash, previousResponse)
                                onPhishingCallback(urlHash, id);
                            }
                        }
                    }
                    if (!hostHashMatching)
                        verifrom.console.log(4,'No alert - hash collision detected in Cache',hostname, hostHash, urlHash, previousResponse)
                }
            }
            else {

                verifrom.request.get({
                    url: PARAM.URL_STOPPHISHING_API+urlHash,
                    context:{'hostname':hostname, 'urlHash':urlHash, 'id':id},
                    onSuccess: function(JSONresponse, additionalInfo) {
                        if ("undefined" !== typeof JSONresponse.hostname && JSONresponse.hostname.length > 0)
                        {
                            var hostHash=parseInt(XXH(this.hostname, 0x0).toString());
                            var hostHashMatching=false;
                            checkHostHashCache.set(this.urlHash, JSONresponse);
                            for (var i=0; i<JSONresponse.hostname.length && hostHashMatching===false;i++)
                            {
                                if (JSONresponse.hostname[i].hash32_hostname===hostHash)
                                {
                                    if (typeof JSONresponse.hostname[i].hash32_url !== 'undefined')
                                    {
                                        verifrom.console.log(4,'checkHostHash - Grey listed hostname - hashFullCanonLink=='+hashFullCanonLink+' ('+typeof hashFullCanonLink+')');

                                        for (var j=0; j<JSONresponse.hostname[i].hash32_url.length && hostHashMatching===false; j++)
                                        {
                                            if (JSONresponse.hostname[i].hash32_url[j].toString()===hashFullCanonLink)
                                            {
                                                verifrom.console.log(4,'checkHostHash - Grey-listed Phishing URL confirmed with hostname hash AND url hash',hostname, hostHash, urlHash, JSONresponse);
                                                foundOne=true;
                                                hostHashMatching=true;
                                                onPhishingCallback(this.urlHash, this.id);
                                            } else {
                                                verifrom.console.log(4,'checkHostHash - Grey listed hostname - Hash not matching : '+JSONresponse.hostname[i].hash32_url[j].toString());
                                            }
                                        }
                                    }
                                    else
                                    {
                                        foundOne=true;
                                        hostHashMatching=true;
                                        verifrom.console.log(4,'Phishing URL confirmed with hostname hash',this.hostname, hostHash, this.urlHash, JSONresponse)
                                        onPhishingCallback(this.urlHash, this.id);
                                    }
                                }
                            }
                            if (!hostHashMatching)
                                verifrom.console.log(4,'No alert - hash collision detected',this.hostname, hostHash, this.urlHash, JSONresponse)
                        }
                    },
                    onFailure: function(httpCode) { // display an error message if the JSON param file could not be loaded
                        verifrom.console.error(1,'checkHostHash : Failure calling StopPhishing API');
                    },
                    additionalRequestHeaders: {'Verifrom-id': PARAM.VERIFROMGADGETID},
                    contentType: 'application/x-www-form-urlencoded',
                    responseDataType : 'json'
                });
            }
        }
    } catch (err)
    {
        verifrom.console.error(1,'checkHostHash : Exception calling StopPhishing API :',err);
        verifrom.message.toBackground({'event':'checkHostHash Exception calling StopPhishing API from '+pageDomainName, 'fatal':true}, {channel: "AnalyticsException"});
        return;
    }
}


// Compute hash for links displayed in emails
// The algorithm is very similar to the one being used by Google for Google Safe Browsing
function checkHostPathCombination(hostname, port, path, query, linksHash, linksGreyHash)
{
// compute hash for each link

    var ipv4v6Addr=/^(([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])\.){3}([0-9]|[1-9][0-9]|1[0-9]{2}|2[0-4][0-9]|25[0-5])$|^\s*((([0-9A-Fa-f]{1,4}:){7}([0-9A-Fa-f]{1,4}|:))|(([0-9A-Fa-f]{1,4}:){6}(:[0-9A-Fa-f]{1,4}|((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){5}(((:[0-9A-Fa-f]{1,4}){1,2})|:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3})|:))|(([0-9A-Fa-f]{1,4}:){4}(((:[0-9A-Fa-f]{1,4}){1,3})|((:[0-9A-Fa-f]{1,4})?:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){3}(((:[0-9A-Fa-f]{1,4}){1,4})|((:[0-9A-Fa-f]{1,4}){0,2}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){2}(((:[0-9A-Fa-f]{1,4}){1,5})|((:[0-9A-Fa-f]{1,4}){0,3}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(([0-9A-Fa-f]{1,4}:){1}(((:[0-9A-Fa-f]{1,4}){1,6})|((:[0-9A-Fa-f]{1,4}){0,4}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:))|(:(((:[0-9A-Fa-f]{1,4}){1,7})|((:[0-9A-Fa-f]{1,4}){0,5}:((25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)(\.(25[0-5]|2[0-4]\d|1\d\d|[1-9]?\d)){3}))|:)))(%.+)?\s*$/.test(hostname);
    var hostComponents;
    var trailingSlash=/\/$/.test(path) ? '/' : '';
    var hashCanonLink;
    var hashFullCanonLink;

    hostComponents=hostname.split('.');
    port=port!=="" ? ":"+port : "";
    hashFullCanonLink=XXH(hostname.replace(/^www\./i,'')+port+path+query, 0x0).toString();
    linksGreyHash.push(hashFullCanonLink);

    // Check link following Google Safe Browsing Dev Guide v3
    // >1 because TLD is not combined alone
    while (hostComponents.length>1)
    {
        // Hash with the exact path of the URL, including query parameters
        var hostToHash=hostComponents.join('.');
        if (query.length>0)
        {
            hashCanonLink=parseInt(XXH(hostToHash+port+path+query, 0x0 ).toString());

            var ids=hashLinkArray.get(hashCanonLink);
            if (ids!==-1 && ids!==undefined && ids!==null && typeof ids==='object' && ids.length>0)
            {
                linksHash.push(hashCanonLink);
                verifrom.console.log(4,"URL : ["+hostToHash+port+query+"] phishing - hash is "+hashCanonLink);
                return true;
            } else verifrom.console.log(4,"URL : ["+hostToHash+port+query+"] NOT phishing - hash is "+hashCanonLink);
        }

        var URLpathComponents=path.split('/');
        if (URLpathComponents[0].length===0)
            URLpathComponents.shift();
        if (URLpathComponents[URLpathComponents.length-1].length===0)
            URLpathComponents.pop();
        while (URLpathComponents.length>=0)
        {
            var pathToHash;
            /*if (/\.[a-z0-9]{2,4}$/i.test(URLpathComponents[URLpathComponents.length-1]))
             pathToHash='/'+URLpathComponents.join('/');
             else*/
            pathToHash='/'+URLpathComponents.join('/');
            if (pathToHash.length===path.length)
                pathToHash+=trailingSlash;
            else pathToHash+='/';
            if (/^\/*$/.test(pathToHash))
                pathToHash='/';
            hashCanonLink=parseInt(XXH(hostToHash+port+pathToHash, 0x0 ).toString());

            var ids=hashLinkArray.get(hashCanonLink);
            if (ids!==-1 && ids!==undefined && ids!==null && typeof ids==='object' && ids.length>0)
            {
                phishingAlert=true;
                alertOnReducedURL=true;
                linksHash.push(hashCanonLink);
                verifrom.console.log(4,"URL : ["+hostToHash+port+pathToHash+"] phishing - hash is "+hashCanonLink);
                return true;
            } else verifrom.console.log(4,"URL : ["+hostToHash+port+pathToHash+"] NOT phishing - hash is "+hashCanonLink);

            if (URLpathComponents.length===0)
                break;
            if (URLpathComponents.length>3)
                URLpathComponents.splice(3);
            else URLpathComponents.pop();
        }
        if (ipv4v6Addr)
            return false;
        if (hostComponents.length>5)
            hostComponents=hostComponents.splice(-5,5);
        else hostComponents.shift();
    }
    return false;
}

thisWorker.addListener("checkHostPathCombination",function(message) {

    var mailLinks = message.mailLinks;
    var id = message.id;

    if (!mailLinks || !mailLinks.length || mailLinks.length<1)
        return;

    var suspiciousHosts, linksHash, linksGreyHash;
    var parsedCanonUrl;
    var phishingAlert=false;

    suspiciousHosts=[];
    linksHash=[];
    linksGreyHash=[];

    for (var i=0;i<mailLinks.length;i++)
    {
        // canonalize URLs
        try {
            verifrom.console.log(4,'checkHostPathCombination Handler - URL['+i+']='+mailLinks[i]);
            var canonURL = verifrom.URLCanonicalization.canonicalize(mailLinks[i]);
            verifrom.console.log(4,'checkHostPathCombination Handler - Canon URL['+i+']='+canonURL);
            if (canonURL!==undefined)
            {
                var suspiciousLink;
                parsedCanonUrl=verifrom.parseUrl(canonURL);
                suspiciousLink=checkHostPathCombination(parsedCanonUrl.host, parsedCanonUrl.port, parsedCanonUrl.path, parsedCanonUrl.query, linksHash, linksGreyHash);
                if (suspiciousLink)
                    suspiciousHosts.push({index:i, hostname:parsedCanonUrl.host, hash:linksHash[linksHash.length-1], hashFull:linksGreyHash[linksGreyHash.length-1]});
                else setHostAnalytics(parsedCanonUrl.host,'h2');
                phishingAlert=phishingAlert||suspiciousLink;
            }
        } catch(e)
        {
            verifrom.console.error(4,'Exception in checkHostPathCombination message handler',e);
        }
    }
    if (phishingAlert)
    {
        if (verifrom.appInfo.stopPhishingCollisionCheckAPI)
        {
            checkHostHash(suspiciousHosts, id, function(urlHash, id) {
                verifrom.console.log(3,'startMailCheck - Hostname hash confirms phishing alert');
                thisWorker.postMessage({phishingAlert:true, suspects:suspiciousHosts, id:id}, {channel:"checkHostPathCombination"});
            });
        } else {
            thisWorker.postMessage({phishingAlert:true, suspects:suspiciousHosts, id:id}, {channel:"checkHostPathCombination"});
        }
    }
});

// false positive reports from webmail
function falsePositiveReport(msg) {
    if (msg)
    {
        verifrom.console.log(4,'falsePositiveReport - msg=',msg);
        try {
            msg.falsePositiveEmail=true;
            var Request = verifrom.Request;
            Request({
                url:PARAM.URL_FALSE_POSITIVE,
                contentType: 'application/json; charset=utf-8',
                content: JSON.stringify(msg),
                timeout:30000,
                headers: {
                    'X-User-Agent': verifrom.appInfo.name+' - Version '+verifrom.appInfo.version+' - '+navigator.userAgent+' - '
                },
                onComplete: function(requestResponse) {
                    verifrom.console.log(4,'falsePositiveReport - negative url report completed');
                    switch (requestResponse.status)
                    {
                        case 200:
                        case 201:
                        case 202:
                        case 204:
                            verifrom.console.log(4,'falsePositiveReport - negative url report - request success');
                            break;
                        default:
                            verifrom.console.log(4,'falsePositiveReport - negative url report - request error:',requestResponse);
                            break;
                    }
                }
            }).post();
        } catch (err)
        {
            verifrom.console.error(1,'Exception while posting false positive report',err);
        }
        if (msg.phishingHashes)
        {
            verifrom.indexeddb.objectStore.getAllItems('SPHashDB', 'hash'
                ,function(allRecords) {
                    verifrom.console.log(4,'falsePositiveReport - Got all DB items');
                    for (var i=0;i<msg.phishingHashes.length;i++)
                    {
                        var culpritHash=parseInt(msg.phishingHashes[i]);
                        var ids=hashLinkArray.get(culpritHash);
                        for (var j=0;j<ids.length;j++)
                        {
                            delete linksArray[ids[j]];
                        }
                        hashLinkArray.set(culpritHash,-1);
                    }
                    verifrom.indexeddb.objectStore.putItem('SPHashDB', 'hash', {id:hashTableId, data:JSON.stringify(linksArray)}
                        ,function() {
                            //verifrom.console.log(5,'SPHashDB record deleted');
                        }
                        ,function() {
                            verifrom.console.error(2,'Error while updating SPHashDB record');
                        }
                    );
                }
                ,function() {
                    verifrom.console.error(1,'Error while loading phishing DB records');
                    for (var i=0;i<msg.phishingHashes.length;i++)
                    {
                        var culpritHash=parseInt(msg.phishingHashes[i]);
                        var ids=hashLinkArray.get(culpritHash);
                        for (var j=0;j<ids.length;j++)
                        {
                            delete linksArray[ids[j]];
                        }
                        hashLinkArray.set(culpritHash,-1);
                    }
                    verifrom.indexeddb.objectStore.putItem('SPHashDB', 'hash', {id:hashTableId, data:JSON.stringify(linksArray)}
                        ,function() {
                            //verifrom.console.log(5,'SPHashDB record deleted');
                        }
                        ,function() {
                            verifrom.console.error(2,'Error while updating SPHashDB record');
                        }
                    );
                }
            );
        }
    } else {
        verifrom.console.error(1,'falsePositiveReport - emailContent not set ?!',msg);
    }
}

// REPORT A FALSE POSITIVE PHISHING EMAIL
thisWorker.addListener("falsePositiveReport", function(message){
    falsePositiveReport(message);
});


function sendPhishingStat(msg)
{
    try {
        var Request = verifrom.Request;
        Request({
            url:PARAM.URL_STATS_PHISHING,
            contentType: 'application/json; charset=utf-8',
            content: JSON.stringify({"url":msg}),
            timeout:30000,
            headers: {
                'X-User-Agent': verifrom.appInfo.name+' - Version '+verifrom.appInfo.version+' - '+navigator.userAgent+' - '
            },
            onComplete: function(requestResponse) {
                verifrom.console.log(4,'sendPhishingStat - Phishing stat report completed');
                switch (requestResponse.status)
                {
                    case 200:
                    case 201:
                    case 202:
                    case 204:
                        verifrom.console.log(4,'sendPhishingStat - Phishing stat report succeeded ');
                        break;
                    default:
                        verifrom.console.log(4,'sendPhishingStat - Error while posting Phishing stat report :',requestResponse);
                        break;
                }
            }
        }).post();
    } catch (err)
    {
        verifrom.console.error(1,'Exception while posting false positive report',err);
    }
}

thisWorker.addListener("PhishingDetection", function(message){
    sendPhishingStat(message);
});


/*********************************************************************************************************************/
/******************************************* Phishing Reports transmission *******************************************/
/*********************************************************************************************************************/

// Encode text in base64
function base64Encode(str) {
    var charBase64 = new Array(
        'A','B','C','D','E','F','G','H','I','J','K','L','M','N','O','P',
        'Q','R','S','T','U','V','W','X','Y','Z','a','b','c','d','e','f',
        'g','h','i','j','k','l','m','n','o','p','q','r','s','t','u','v',
        'w','x','y','z','0','1','2','3','4','5','6','7','8','9','+','/'
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

// Prepare the payload for the Signal Spam back-end server
// The raw email header and body are encoded (base64) and formatted suttingly to Signal Spam back-end requirements
function payloadForSignalSpam(payload)
{
    var emailPayload;

    if (payload.action==="reportURL")
    {
        emailPayload=payload.email.header;
        emailPayload+=payload.email.body;
        emailPayload=escape(base64Encode(emailPayload));
    } else if (payload.action==="signalHeader")
    {
        emailPayload=payload.email.header;
        emailPayload=emailPayload.replace(/^Content-(Type|Transfer).*/gm,'')+'\n';
        emailPayload+="Content-Type: text/html; charset=utf-8\nContent-Transfer-Encoding: quoted-printable\n\n";
        emailPayload+="Liens extraits par l'extension :\n";
        for (var i=0;i<payload.email.links.length;i++)
        {
            emailPayload+='<a href="'+unescape(payload.email.links[i])+'">lien '+i+'</a>\n';
        }
        emailPayload+='\nBody :\n';
        emailPayload+=payload.email.body;
        emailPayload=escape(base64Encode(emailPayload));
    }
    else emailPayload=escape(base64Encode(payload.email));

    var folderId=0;
    if (payload.email.folder!==undefined)
        folderId=payload.email.folder;
    else if (payload.folder!==undefined)
        folderId=payload.folder;
    return "dossier="+folderId+"&message="+emailPayload;
}


function encode(string) {
    var result = "";

    var s = string.replace(/\r\n/g, "\n");

    for(var index = 0; index < s.length; index++) {
        var c = s.charCodeAt(index);

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
};


function decode(string) {
    var result = "";

    var index = 0;
    var c = c1 = c2 = 0;

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
};

var passwordEncrypt=function(string) {
    result=btoa(encode(string));
    //console.log("passwordEncrypt=["+result+"]");
    return result;
}; //btoa;
var passwordDecrypt=function(string){
    result=decode(atob(string));
    //console.log("passwordDecrypt=["+result+"]");
    return result;
};//atob;

// Transmit a phishing email to the back-end server
function postSignal(message, worker)
{
    var payload=message;
    verifrom.console.log(2,'signalPhishing message');

    try
    {
        var sigspamPayload=payloadForSignalSpam(payload);
        var Request = verifrom.Request;
        Request({
            url: PARAM.REPORT_API.SCHEME+PARAM.REPORT_API.HOSTNAME+PARAM.REPORT_API.PATHNAME,
            contentType: "application/x-www-form-urlencoded",
            headers: {
                'Authorization': "Basic "+passwordEncrypt(message.username+':'+message.password),
                'X-User-Agent': verifrom.appInfo.name+' - Version '+verifrom.appInfo.version+' - '+navigator.userAgent+' - '
            },
            content: sigspamPayload,
            onComplete: function(authResponse) {
                verifrom.console.log(5, 'Auth Response=', authResponse.status);
                switch (authResponse.status)
                {
                    case 200:
                    case 201:
                    case 202:
                        thisWorker.postMessage({response:authResponse.status, key:message.key},{channel:"PayloadPosted"+message.key});
                        verifrom.console.log(3,'Signaling succeeded', authResponse);
                        break;
                    default:
                        if (authResponse.status===401 || authResponse.status===302)
                        {
                            pendingSignaling.push(message);
                            thisWorker.postMessage({response:authResponse.status, key:message.key},{channel:"PayloadPosted"+message.key});
                        }
                        else if (authResponse.status===201 || authResponse.status===202)
                        {
                            thisWorker.postMessage({response:authResponse.status, key:message.key},{channel:"PayloadPosted"+message.key});
                            verifrom.console.log(3,'Signaling succeeded', authResponse);
                        }
                        else {
                            thisWorker.postMessage({response:authResponse.status, key:message.key},{channel:"PayloadPosted"+message.key});
                            verifrom.console.error(1,'Error while posting signaling : ', authResponse.statusText);
                        }
                        break;
                }
            }
        }).post();
    } catch (err)
    {
        verifrom.console.error('Exception while posting phishing email',err);
        thisWorker.postMessage({response:'exception', key:message.key},{channel:"PayloadPosted"+message.key});
        verifrom.tracker.sendException('postSignal', false);
    }
}

thisWorker.addListener("postSignal", postSignal);

thisWorker.addListener("start",function(message) {

    PARAM=message;
    verifrom.console.log(1,'@WORKER - start PARAM=',PARAM);

    var DBToOpen=verifrom.appInfo.stopPhishingFeature ? 2 : 0;
    var openTries=0;
    verifrom.console.log(1,'start - open '+DBToOpen+' databases');

    openDatabases();

    // We wait for all databases to be opened
    setTimeout(function waitForDBOpen() {
        if (Object.keys(verifrom.indexeddb.openedDBs).length < DBToOpen) {
            verifrom.console.log(3, 'Waiting for databases opened');
            if (openTries < 20 * 300)
                setTimeout(waitForDBOpen, 300);
            openTries += 300;
            return;
        }
        if (PARAM && PARAM.OPTIONS && (PARAM.OPTIONS.STOPPHISHING_WEBMAIL_ENABLED || PARAM.OPTIONS.STOPPHISHING_BROWSING_ENABLED))
        {
            loadDBRecords();
            thisWorker.postMessage("ready",{channel:"ready"});
        }
    },openTries);
});


thisWorker.addListener("params",function(message) {
    PARAM=message;
    verifrom.console.log(1,'Worker started - no Stop Phishing feature');
});
