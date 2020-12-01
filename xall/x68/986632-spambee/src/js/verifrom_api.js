

var verifrom = {
    appInfo : extensionConfig.appInfo,
    extension: {
        name: function() {
            return ("undefined" !== typeof safari) ? verifrom.appInfo.version : chrome.runtime.getManifest().name;
        },
        version: function() {
            return ("undefined" !== typeof safari) ? verifrom.appInfo.version : chrome.runtime.getManifest().version;
        },
        onInstalled:function(callback) {
            if (verifrom.appInfo.safari===true) {
                if (safari.extension.settings.hasRun!==true)
                {
                    safari.extension.settings.hasRun = true;
                    callback();
                }
            } else chrome.runtime.onInstalled.addListener(callback);
        },
        openOptions:function(query) {
            if ("string"===typeof query && query.length>0)
                query=query.replace(/^\?(.*)/,'$1');
            else query="";
            try {
                browser.runtime.getBrowserInfo()
                    .then((info)=>{
                        if (/^6[0-9]\./.test(info.version))
                            verifrom.tabs.create({'url': chrome.runtime.getURL("/html/options.html")});
                        else if (!query && chrome && chrome.runtime && "function" === typeof chrome.runtime.openOptionsPage)
                            chrome.runtime.openOptionsPage();
                        else if (!query && browser && browser.runtime && "function" === typeof browser.runtime.openOptionsPage)
                            browser.runtime.openOptionsPage();

                    });
            } catch(e) {
                verifrom.tabs.create({'url': chrome.runtime.getURL("/html/options.html")});
            }
        }
    },
    windows: {
        getCurrent:function() {
            if (verifrom.appInfo.quantum)
                return browser.windows.getLastFocused();
            else {
                return new Promise(function (resolve, reject) {
                    chrome.tabs.getSelected(function (tab) {
                        void 0;
chrome.tabs.query({currentWindow: true}, function (tabs) {
                            void 0;

                            if (tabs && tabs.length > 0)
                                resolve({id: tabs[0].windowId});
                            else reject("no window selected");
                        });
                    });

                });
            }
        }
    },
    tabs : {
        create: function(options,callback) {
            if (verifrom.appInfo.safari===true)
            {
                if (!options.url)
                    return;
                if (!safari.application || !safari.application.activeBrowserWindow || "function" !== typeof safari.application.activeBrowserWindow.openTab)
                    return;
                var newTab = safari.application.activeBrowserWindow.openTab();
                newTab.url = options.url;
                if ("function"===typeof newTab.activate)
                    newTab.activate();
                return;
            } else {
                var promise=chrome.tabs.create(options,function(tab){
                    if (typeof callback==='function')
                        callback(tab.id);
                });
                if (promise && promise instanceof Promise)
                    promise.then(function(tab) {
                        if (typeof callback==='function')
                            callback(tab.id)
                    },function() {
                    }).catch(()=>{});
            }
        },
        reload: function(pattern) {
            if (verifrom.appInfo.safari) {
                var patternRE=new RegExp(pattern.join('|').replace(/\*/g,'.*'));
                for (var i=0;i<safari.application.browserWindows.length;i++) {
                    for (var j=0;j<safari.application.browserWindows[i].tabs.length;j++) {
                        var url=safari.application.browserWindows[i].tabs[j].url;
                        if (patternRE.test(url))
                            safari.application.browserWindows[i].tabs[j].url=url;
                    }
                }
            } else {
                chrome.tabs.query({url: pattern},
                    function (Tabs) {
                        for (var i = 0; i < Tabs.length; i++) {
                            if (Tabs[i].id) {
                                chrome.tabs.reload(Tabs[i].id);
                            }
                        }
                    });
            }
        },
        query: function(options, callback) {
            if (verifrom.appInfo.safari) {
                var tabs=[];
                for (var i=0;i<safari.application.browserWindows.length;i++) {
                    if ((options.currentWindow===true && safari.application.browserWindows[i].visible===true) || options.currentWindow!==true) {
                        var win=safari.application.browserWindows[i];
                        if (options.active===true)
                            tabs.push(win.activeTab)
                        else for (var j=0;j<win.tabs.length;j++) {
                            tabs.push(win.tabs[j]);
                        }
                    }
                }
                callback(tabs);
            } else chrome.tabs.query(options,callback);
        },
        update: function(tabId, options) {
            if (verifrom.appInfo.safari)
            {
                var tab=verifrom.message.getTabById(tabId);
                tab.url=options.url;
            } else browser.tabs.update(tabId, options);
        },
        activate: function(tabId,winId) {
            void 0;
            if (!verifrom.appInfo.quantum) {
                verifrom.tabs.update(tabId,{active:true});
            }
            else verifrom.tabs.update(tabId,{active:true});
        },
        get: function(tabId,callback) {
            if (verifrom.appInfo.quantum)
            {
                var promise=browser.tabs.get(tabId);
                promise.then(function(tabInfo) {
                    callback(tabInfo);
                }).catch(function(reason){
                    callback({error:reason});
                });
            }
            else {
                chrome.tabs.get(tabId,callback);
            }
        },
        close: function(options, callback) {
            var matchingURL=options.url;
            var queryOptions=verifrom.merge(options);
            delete queryOptions.url;
            verifrom.tabs.query(queryOptions,function(tabs){
                if (matchingURL instanceof RegExp) {
                    for (var i=0;i<tabs.length;i++) {
                        if (tabs[i].url && matchingURL.test(tabs[i].url))
                            if (verifrom.appInfo.safari)
                                tabs[i].close();
                            else browser.tabs.remove(tabs[i].id);
                    }
                } else if ("string"===typeof machingURL) {
                    for (var i=0;i<tabs.length;i++) {
                        if (tabs[i].url && tabs[i].url===matchingURL)
                            if (verifrom.appInfo.safari)
                                tabs.close();
                            else browser.tabs.remove(tabs[i].id);
                    }
                }
            })
        }
    },
    console : {
        log: function ()
        {
            if (verifrom.appInfo.logLevel<=0)
                return;
            var argArray=Array.prototype.constructor.apply(null,arguments);
            if (argArray.length>1 && typeof argArray[0]==='number')
            {
                if (argArray[0]<=verifrom.appInfo.logLevel) {
                    argArray[0]=verifrom.appInfo.extensionCodeName+':';
                    console.debug.apply(console,argArray);
                }
            }
            else if (verifrom.appInfo.logLevel>1)
            {
                argArray.unshift(verifrom.appInfo.extensionCodeName+':');
                console.debug.apply(console,argArray);
            }
        },
        error: function ()
        {
            if (verifrom.appInfo.logLevel<=0)
                return;
            var argArray=Array.prototype.constructor.apply(null,arguments);
            if (argArray.length>1 && typeof argArray[0]==='number')
            {
                if (argArray[0]<=verifrom.appInfo.logLevel) {
                    argArray[0]=verifrom.appInfo.extensionCodeName+':';
                    console.error.apply(console,argArray);
                }
            }
            else if (verifrom.appInfo.logLevel>1)
            {
                argArray.unshift(verifrom.appInfo.extensionCodeName+':');
                console.error.apply(console,argArray);
            }
        },
        trace: function ()
        {
            if (verifrom.appInfo.logLevel<=0)
                return;
            var argArray=Array.prototype.constructor.apply(null,arguments);
            if (argArray.length>1 && typeof argArray[0]==='number')
            {
                if (argArray[0]<=verifrom.appInfo.logLevel) {
                    argArray[0]=verifrom.appInfo.extensionCodeName+':';
                    console.trace.apply(console,argArray);
                }
            }
            else if (verifrom.appInfo.logLevel>1)
            {
                argArray.unshift(verifrom.appInfo.extensionCodeName+':');
                console.trace.apply(console,argArray);
            }
        }
    },
    time: {
        secondsFromNow: function (delay) {
            var currentTime= +new Date();
            return (currentTime+(delay*1000));
        },
        now: function() {
            return (+new Date());
        }
    },
    date: {
        toString: function (timeStamp) {
            function pad(number) {
                return number < 10 ? '0' + number : number;
            }

            var dateToFormat=new Date(timeStamp);
            return dateToFormat.getFullYear() +
                '-' + pad( dateToFormat.getMonth() + 1 ) +
                '-' + pad( dateToFormat.getDate() ) +
                ' ' + pad( dateToFormat.getHours() ) +
                ':' + pad( dateToFormat.getMinutes() ) +
                ':' + pad( dateToFormat.getSeconds() ) +
                '.' + (dateToFormat.getMilliseconds() / 1000).toFixed(3).slice(2, 5);
        }
    },
    parseUrl:function(url) {
        var splitRegExp = new RegExp(
            '^' +
            '(?:' +
            '([^:/?#.]+)' +                         
            ':)?' +
            '(?://' +
            '(?:([^/?#]*)@)?' +                     
            '([\\s\\w\\d\\-\\u0100-\\uffff.%]*)' +     
            '(?::([0-9]+))?' +                      
            ')?' +
            '([^?#]+)?' +                           
            '(?:\\?([^#]*))?' +                     
            '(?:#(.*))?' +                          
            '$');

        var split = url.match(splitRegExp);
        var splitUserPwd = split[2] ? split[2].match(/([^:@]*):{0,1}(.*)/) : undefined;
        return {
            'scheme':split[1]===undefined ? "" : split[1],
            'host':split[3]===undefined ? "" : split[3],
            'domain':split[3]===undefined ? "" : split[3].split('.').splice(-2,2).join('.'),
            'port':split[4]===undefined ? "" : split[4],
            'path':split[5]===undefined ? "" : split[5],
            'query':split[6]===undefined ? "" : '?'+split[6],
            'searchObject': undefined,
            'hash':split[7]===undefined ? "" : '#'+split[7],
            'href':url,
            'username':splitUserPwd ? splitUserPwd[1] : '',
            'password':splitUserPwd ? splitUserPwd[2] : ''
        }
    },
    normalizeHostName: function(hostname)
    {
        var decodedHostname=unescape(hostname);
        while (decodedHostname !== unescape(decodedHostname))
            decodedHostname=unescape(decodedHostname);
        decodedHostname=decodedHostname.replace(/([^:]*:[\/]{1,2})(.*)/,'$2');
        decodedHostname=decodedHostname.replace(/^\.*/,'');
        decodedHostname=decodedHostname.replace(/\.*$/,'');
        decodedHostname=decodedHostname.toLowerCase();
        decodedHostname=decodedHostname.replace(/^www\./,'');
        decodedHostname=escape(decodedHostname);
        return decodedHostname;
    },
    getExtensionURL: function(documentName) {
        return chrome.extension.getURL(verifrom.appInfo.htmlFilesFolder+documentName);
    },
    getURL: function(documentPathName) {
        return (extensionConfig.appInfo.safari===true) ? (safari.extension.baseURI+documentPathName).replace(/([^:])\/{2,}/g,'$1/') : browser.extension.getURL(documentPathName);
    },
    chunkString :function(str, len) {
        const size = Math.ceil(str.length/len)
        const r = Array(size)
        let offset = 0
        for (let i = 0; i < size; i++) {
            r[i] = str.substr(offset, len)
            offset += len
        }
        return r;
    },
    cookie: {
        set:function(cname, cvalue, exdays) {
            var d = new Date();
            d.setTime(d.getTime() + (exdays*24*60*60*1000));
            var expires = "expires="+ d.toUTCString();
            document.cookie = cname + "=" + cvalue + ";" + expires + ";path=/";
        },
        get:function(cname) {
            var name = cname + "=";
            var decodedCookie = decodeURIComponent(document.cookie);
            var ca = decodedCookie.split(';');
            for(var i = 0; i <ca.length; i++) {
                var c = ca[i];
                while (c.charAt(0) == ' ') {
                    c = c.substring(1);
                }
                if (c.indexOf(name) == 0) {
                    return c.substring(name.length, c.length);
                }
            }
            return null;
        }
    },
    customEvent: {
        customEventListeners:new Map(),
        oneEventListeners:new Map(),
        one:function(eventName, eventHandler) {
            if (verifrom.customEvent.oneEventListeners.has(eventName) && verifrom.customEvent.oneEventListeners.get(eventName)===eventHandler)
                return;
            verifrom.customEvent.oneEventListeners.set(eventName, eventHandler);
            $(window.top.document).one(verifrom.appInfo.extensionCodeName+eventName, eventHandler);
        },
        addEventListener:function(eventName, eventHandler) {
            if (verifrom.customEvent.customEventListeners.has(eventName) && verifrom.customEvent.customEventListeners.get(eventName)===eventHandler)
                return;
            verifrom.customEvent.customEventListeners.set(eventName, eventHandler);
            window.top.document.addEventListener(verifrom.appInfo.extensionCodeName+eventName, eventHandler);
        },
        removeEventListener:function(eventName, eventHandler) {
            verifrom.customEvent.customEventListeners.delete(eventName);
            window.top.document.removeEventListener(verifrom.appInfo.extensionCodeName+eventName, eventHandler);
        },
        dispatchEvent:function(event) {
            window.postMessage(event,window.top.location.origin);
        },
        CustomEvent:function(eventName, eventDetails) {
            if (eventDetails && eventDetails.detail) {
                eventDetails.verifrom = true;
                eventDetails.name = eventName;
                eventDetails.type = eventName;
                eventDetails.extensionCodeName = verifrom.appInfo.extensionCodeName;
                eventDetails.detail.extensionCodeName = verifrom.appInfo.extensionCodeName;
            }
            else {
                eventDetails={};
                eventDetails.verifrom = true;
                eventDetails.name = eventName;
                eventDetails.type = eventName;
                eventDetails.extensionCodeName = verifrom.appInfo.extensionCodeName;
                eventDetails.detail={extensionCodeName:verifrom.appInfo.extensionCodeName};
            }
            return eventDetails;
        }
    },
    LZString : {
        compress:function(a) {
            var b="",s;
            for (var i=0;i<a.length;i+=4) {b+=String.fromCharCode(parseInt(a.substring(i,i+4)));}
            return b;
        },
        decompress:function(a) {
            var b="",s;
            for (var i=0;i<a.length;i++) {b+=a.charCodeAt(i);}
            return b;
        }
    },
    dbStorage: {
            clear:function() {
                void 0;
                localStorage.clear();
            },
            getAll:function() {
                return localStorage;
            },
            removeItem:function(id) {
                return localStorage.removeItem(id);
            },
            remove:function(id) {
                return localStorage.removeItem(id);
            },
            get:function(id) {
                var item=localStorage.getItem(id);
                if (item===undefined || item===null)
                    return undefined;
                else {
                    try {
                        item=JSON.parse(item);
                        if (item && item.DBtimeout)
                        {
                            var currentTime= +new Date();
                            if (item.DBtimeout>=currentTime)
                            {
                                delete item['DBtimeout'];
                                return item;
                            }
                            else {
                                localStorage.removeItem(id);
                                return undefined;
                            }
                        }
                        return item;
                    } catch (e) {
                        return undefined;
                    }
                }
            },

            set:function(id, data, timeout) {
                if (timeout)
                {
                    data['DBtimeout']=timeout;
                }
                localStorage.setItem(id, JSON.stringify(data));
                return true;
            }
        },
    merge: function(){
        if (arguments.length===0)
            return {};
        var a = [].slice.call( arguments ), i = 0;
        if (!a || a.length<=0)
            return {};
        while( a[i] )
            a[i] = JSON.stringify( a[i++] ).slice( 1,-1 );
        return JSON.parse( "{"+ a.join().replace(/,*$/g,'') +"}" );
    },
    db: {
            removeItem:function(id) {
                return sessionStorage.removeItem(id);
            },
            remove:function(id) {
                return sessionStorage.removeItem(id);
            },
            get:function(id) {
                var item=sessionStorage.getItem(id);
                if (item===undefined || item===null)
                    return undefined;
                else {
                    try {
                        item=JSON.parse(item);
                        if (item && item.DBtimeout)
                        {
                            var currentTime= +new Date();
                            if (item.DBtimeout>=currentTime)
                            {
                                delete item['DBtimeout'];
                                return item;
                            }
                            else {
                                sessionStorage.removeItem(id);
                                return undefined;
                            }
                        }
                        return item;
                    } catch (e) {
                        return undefined;
                    }
                }
            },
            set:function(id, data, timeout) {
                try {
                    if (timeout)
                    {
                        data['DBtimeout']=timeout;
                    }
                    sessionStorage.setItem(id, JSON.stringify(data));
                    return true;
                } catch (e) {
                    void 0;
                    return null;
                }
            }
        },
    indexeddb : {
        openedDBs:[],
        close(dbName)
        {
            if (verifrom.indexeddb.openedDBs[dbName])
            {
                verifrom.indexeddb.openedDBs[dbName].close();
                delete verifrom.indexeddb.openedDBs[dbName];
            }
        },
        open : function(dbName, objectStoreName, objectStoreOptions, dbVersion, onSuccessCallBack, onErrorCallBack, onUpgradeCallBack)
        {
            var openRequest;

            if ((typeof onSuccessCallBack !== 'function') || (typeof onErrorCallBack !== 'function'))
                throw 'VF - missing argument for opening indexedDB';

            if (verifrom.indexeddb.openedDBs[dbName] && verifrom.indexeddb.openedDBs[dbName].objectStoreNames.contains(objectStoreName))
                return onSuccessCallBack(verifrom.indexeddb.openedDBs[dbName]);
            else openRequest = indexedDB.open(dbName,dbVersion);

            openRequest.onupgradeneeded = function(dbEvent) {
                var thisDB = dbEvent.target.result;

                if(!thisDB.objectStoreNames.contains(objectStoreName)) {
                    var objectStore=verifrom.indexeddb.objectStore.create(thisDB, objectStoreName, objectStoreOptions);
                    if (typeof onUpgradeCallBack === 'function')
                        objectStore.transaction.oncomplete=onUpgradeCallBack(dbEvent);
                    return;
                }
                if (typeof onUpgradeCallBack === 'function')
                    onUpgradeCallBack(dbEvent);
            };
            openRequest.onsuccess = function(dbEvent) {
                var objectStore;

                verifrom.indexeddb.openedDBs[dbName]=dbEvent.target.result;
                verifrom.indexeddb.openedDBs[dbName].onversionchange = function(event) {
                    verifrom.indexeddb.close(dbName);
                };
                if(!verifrom.indexeddb.openedDBs[dbName].objectStoreNames.contains(objectStoreName)) {
                    objectStore=verifrom.indexeddb.objectStore.create(verifrom.indexeddb.openedDBs[dbName], objectStoreName, objectStoreOptions);
                    objectStore.transaction.oncomplete=onSuccessCallBack;
                }
                else {
                    onSuccessCallBack(dbEvent);
                }
            };
            openRequest.onerror = function(dbEvent) {
                void 0;
                onErrorCallBack(dbEvent);
            };
        },
        get : function(dbName)
        {
            return verifrom.indexeddb.openedDBs[dbName];
        },
        transaction : function(dbName, objectStores, transactionMode) {
            if (verifrom.indexeddb.openedDBs[dbName])
            {
                return verifrom.indexeddb.openedDBs[dbName].transaction(typeof objectStores==='string' ? [objectStores] : objectStores, transactionMode);
            }
            else throw 'Database '+dbName+' not opened';
        },
        objectStore: {
            create: function(dbObject, objectStoreName, objectStoreOptions) {
                return dbObject.createObjectStore(objectStoreName, objectStoreOptions);
            },
            get : function(dbName, objectStoreName, options)
            {
                if (verifrom.indexeddb.openedDBs[dbName] && verifrom.indexeddb.openedDBs[dbName].objectStoreNames.contains(objectStoreName))
                    return verifrom.indexeddb.openedDBs[dbName].transaction(objectStoreName, options?options:"readwrite").objectStore(objectStoreName);
                else throw 'DB '+dbName+' with '+objectStoreName+' is not opened';
            },
            createIndex: function(objectStore, indexName, keyId, indexOptions) {
                objectStore.createInxdex(indexName, keyId, indexOptions);
            },
            clear : function(dbName, objectStoreName, onSuccessCallBack) {
                var store=get(dbName, objectStoreName);
                store.clear().onsuccess = function (dbEvent) {
                    void 0;
                    if (typeof onSuccessCallBack === 'function')
                        onSuccessCallBack(dbEvent);
                };
            },
            operationItem: function(dbName, storeName, operation, object, onSuccessCallBack, onErrorCallBack) {
                var transaction=verifrom.indexeddb.transaction(dbName,[storeName],'readwrite');
                var addedItemsCounter=0;

                transaction.oncomplete=function(dbEvent){
                    void 0;

                    if (object.forEach)
                    {
                        if (addedItemsCounter===object.length && typeof onSuccessCallBack==='function')
                            onSuccessCallBack();
                        else if (typeof onErrorCallBack==='function')
                            onErrorCallBack()
                        else throw 'Error in DB operation '+arguments.caller;
                    } else if (typeof onSuccessCallBack==='function')
                        onSuccessCallBack(dbEvent);
                };
                transaction.onerror=function(dbEvent){
                    void 0;
                    if (typeof onErrorCallBack==='function')
                        onErrorCallBack(dbEvent);
                };
                transaction.onabort=function(dbEvent){
                    void 0;
                    if (typeof onErrorCallBack==='function')
                        onErrorCallBack(dbEvent);
                };
                var objectStore=transaction.objectStore([storeName]);

                if (!object || !objectStore || !objectStore.add)
                    throw 'Store is not accessible';
                if (object.forEach)
                {
                    object.forEach(function(item) {
                        var request=objectStore[operation](item);
                        request.onsuccess=function(dbEvent) {
                            addedItemsCounter++;
                        };
                        request.onerror=function(dbEvent) {
                            if (typeof onErrorCallBack==='function')
                                onErrorCallBack(dbEvent);
                            else throw 'Error updating item';
                        };
                    });
                }
                else {
                    var request=objectStore[operation](object);
                    request.onsuccess=function(dbEvent) {
                    };
                    request.onerror=function(dbEvent) {
                    };
                }
            },
            addItem: function(dbName, storeName, object, onSuccessCallBack, onErrorCallBack) {
                verifrom.indexeddb.objectStore.operationItem(dbName, storeName, 'add', object, onSuccessCallBack, onErrorCallBack);
            },
            putItem: function(dbName, storeName, object, onSuccessCallBack, onErrorCallBack) {
                verifrom.indexeddb.objectStore.operationItem(dbName, storeName, 'put', object, onSuccessCallBack, onErrorCallBack);
            },
            deleteItem: function(dbName, storeName, keyValue, onSuccessCallBack, onErrorCallBack) {
                if (!keyValue) {
                    void 0;
                    throw `deleteItem - missing keyValue - keyValue=${keyValue}`;
                    return;
                }
                var request;
                var transaction=verifrom.indexeddb.transaction(dbName,[storeName],'readwrite');
                transaction.oncomplete=function(dbEvent){
                    void 0;
                };
                transaction.onerror=function(dbEvent){
                    void 0;
                    if (typeof onErrorCallBack==='function')
                        onErrorCallBack(dbEvent);
                };
                transaction.onabort=function(dbEvent){
                    void 0;
                    if (typeof onErrorCallBack==='function')
                        onErrorCallBack(dbEvent);
                };
                var objectStore=transaction.objectStore([storeName]);

                if (objectStore && typeof objectStore.delete === 'function' && keyValue)
                {
                    request=objectStore.delete(keyValue);
                    request.onsuccess=onSuccessCallBack.bind(request);
                    request.onerror=onErrorCallBack;
                }
                else {
                    if (objectStore)
                        throw `deleteItem - Bad store argument - keyValue=${keyValue} objectStore=${objectStore} - no get`;
                    else throw `deleteItem - Bad store argument - keyValue=${keyValue} objectStore=${objectStore} - no keyValue`;
                }
            },
            getItem: function(dbName, storeName, keyValue, onSuccessCallBack, onErrorCallBack) {
                var getRequest;
                var transaction=verifrom.indexeddb.transaction(dbName,[storeName],'readonly');
                transaction.oncomplete=function(dbEvent){
                    void 0;
                };
                transaction.onerror=function(dbEvent){
                    void 0;
                    if (typeof onErrorCallBack==='function')
                        onErrorCallBack(dbEvent);
                };
                transaction.onabort=function(dbEvent){
                    void 0;
                    if (typeof onErrorCallBack==='function')
                        onErrorCallBack(dbEvent);
                };
                var objectStore=transaction.objectStore([storeName]);

                if (objectStore && objectStore.get && keyValue)
                {
                    getRequest=objectStore.get(keyValue);
                    getRequest.onsuccess=onSuccessCallBack.bind(getRequest);
                    getRequest.onerror=onErrorCallBack;
                }
                else throw 'Bad store argument';
            },
            getAllItems: function(dbName, objectStoreName, onSuccessCallBack, onErrorCallBack) {
                var itemsArray=[];
                var transaction=verifrom.indexeddb.transaction(dbName,[objectStoreName],'readonly');
                transaction.oncomplete=function(dbEvent){
                    void 0;
                    if (typeof onSuccessCallBack==='function')
                    {
                        onSuccessCallBack.bind(itemsArray)(dbEvent);
                    }
                };
                transaction.onerror=function(dbEvent){
                    void 0;
                    if (typeof onErrorCallBack==='function')
                        onErrorCallBack(dbEvent);
                };
                transaction.onabort=function(dbEvent){
                    void 0;
                    if (typeof onErrorCallBack==='function')
                        onErrorCallBack(dbEvent);
                };
                var objectStore=transaction.objectStore(objectStoreName);

                var request=objectStore.openCursor();
                request.onsuccess = function(dbEvent) {
                    var cursor = dbEvent.target.result;
                    if (cursor)
                    {
                        itemsArray.push(cursor.value);
                        cursor.continue();
                    }
                };
            }
        }
    },
    dom: {
        createSanitizedDoc: function(title, htmlContent, callback)
        {
            verifrom.sanitizer.getSanitizedHTMLContent(htmlContent,function(sanitizedContent){
                var doc = document.implementation.createHTMLDocument(title);
                var range=doc.createRange();
                range.selectNode(doc.body);
                var parser=new DOMParser;
                var newdoc=parser.parseFromString(sanitizedContent, "text/html");
                var newNode=doc.importNode(newdoc.documentElement,true);
                doc.replaceChild(newNode,doc.documentElement);
                callback(doc);
            });
        },
        location:{
            href:window.top.document.location.href,
            hostname:window.top.document.location.hostname,
            domainname:window.top.document.location.hostname.replace(/.*?([^\.]+\.[^\.]+)$/,"$1"),
            pathname:window.top.document.location.pathname
        },
        isIframe:function() {
            return (window.self !== window.top);
        }
    },
    JSON: {
        parse:function(string) {
            return JSON.parse(string);
        }
    },
    request: {
        ajax:function(paramObject) {
            if (!paramObject.url) {
                void 0;
                throw "Missing argument";
            }

            if (!XMLHttpRequest.prototype.wrappedSetRequestHeader) {
                XMLHttpRequest.prototype.wrappedSetRequestHeader = XMLHttpRequest.prototype.setRequestHeader;

                XMLHttpRequest.prototype.setRequestHeader = function(header, value) {

                    if(!this.headers) {
                        this.headers = {};
                    }

                    if (!this.headers[header.toLowerCase()]) {
                        this.wrappedSetRequestHeader(header, value);
                        this.headers[header.toLowerCase()] = value;
                    } else if (value!=this.headers[header.toLowerCase()])
                        void 0;
                    else void 0;
                }
            }

            const param = function (object) {
                var encodedString = '';
                for (var prop in object) {
                    if (object.hasOwnProperty(prop)) {
                        if (encodedString.length > 0) {
                            encodedString += '&';
                        }
                        encodedString += encodeURI(prop + '=' + object[prop]);
                    }
                }
                return encodedString;
            };

            void 0;

            let xmlhttp=new XMLHttpRequest;
            try {
                xmlhttp.withCredentials=true;
                let method = (paramObject.method || paramObject.type).toUpperCase();
                let url = paramObject.url;

                if (method==="GET" && paramObject.data) {
                    url = url + "?" + param(paramObject.data);
                    paramObject.data = null;
                }

                void 0;

                if (paramObject.credentials && paramObject.credentials.login)
                    xmlhttp.open(method,url,paramObject.async || true, paramObject.credentials.login, paramObject.credentials.password);
                else xmlhttp.open(method,url,paramObject.async || true);
                xmlhttp.setRequestHeader("Content-type", paramObject.contentType);
                xmlhttp.setRequestHeader('X-Requested-With', 'XMLHttpRequest');
                xmlhttp.setRequestHeader('X-User-Agent',verifrom.appInfo.name + ' - Version ' + verifrom.appInfo.version + ' - ' + navigator.userAgent);

                if (paramObject.additionalRequestHeaders) {
                    for (let header of Object.keys(paramObject.additionalRequestHeaders)) {
                        xmlhttp.setRequestHeader(header, paramObject.additionalRequestHeaders[header]);
                    }
                }

                if (typeof paramObject.beforeSend==="function") {
                    paramObject.beforeSend(xmlhttp);
                }

                if (paramObject.timeout)
                    xmlhttp.timeout = paramObject.timeout;

                xmlhttp.onerror=function() {
                    if (typeof paramObject.error === "function") {
                        return Promise.resolve().then(()=>{
                            paramObject.error(xmlhttp, xmlhttp.statusText, xmlhttp.responseText);
                            paramObject.error = null;
                        });
                    }
                    void 0;
                };

                xmlhttp.onreadystatechange=function()
                {
                    if (xmlhttp.readyState==4)
                    {
                        if (xmlhttp.status>=200 && xmlhttp.status<300)
                        {
                            void 0;
                            let response = xmlhttp.response;
                            try {
                                if (/json/i.test(paramObject.dataType) || /json/i.test(xmlhttp.headers["accept"]))  {
                                    if (typeof response === "string" && response.length>0) {
                                        response = JSON.parse(response);
                                        xmlhttp.responseJSON = response;
                                        void 0;
                                    } else void 0;
                                }
                            } catch(e) {
                                void 0;
                            }
                            if (typeof paramObject.success === "function")
                                return Promise.resolve().then(()=>{
                                    void 0;
                                    paramObject.success(response, xmlhttp.statusText, xmlhttp);
                                    paramObject.success = null;
                                });
                        }
                        else
                        {
                            void 0;
                            if (typeof paramObject.error === "function")
                                return Promise.resolve().then(()=>{
                                    void 0;
                                    paramObject.error(xmlhttp, xmlhttp.statusText, xmlhttp.responseText);
                                    paramObject.error = null;
                                });
                        }
                    }
                };

                if (paramObject.timeout)
                    xmlhttp.ontimeout = (e) => {
                        void 0;
                        if (typeof paramObject.error === "function")
                            return Promise.resolve().then(()=>{
                                paramObject.error(xmlhttp, xmlhttp.statusText, xmlhttp.responseText);
                            });
                    };

                let data = paramObject.data;
                if (typeof data === "object") {
                    try {
                        data = JSON.stringify(data);
                    } catch(e) {
                        void 0;
                    }
                }

                void 0;
                xmlhttp.send(data);
                return xmlhttp;
            } catch(e) {
                void 0;
                if (typeof paramObject.error === "function")
                    return Promise.resolve().then(()=>{
                        paramObject.error(xmlhttp, xmlhttp.statusText, xmlhttp.responseText);
                    });
            }
        },
        get:function(paramObject) {
            if (!paramObject.url || !paramObject.onSuccess || !paramObject.onFailure || !paramObject.contentType || !paramObject.responseDataType)
                throw "Missing argument";

            paramObject.type="GET";
            paramObject.success = paramObject.onSuccess;
            paramObject.error = paramObject.onFailure;
            paramObject.dataType = paramObject.responseDataType;
            return verifrom.request.ajax(paramObject);
        },
        post:function(paramObject,values) {
            if (!paramObject.url || !paramObject.onSuccess || !paramObject.onFailure || !paramObject.contentType || !paramObject.responseDataType)
                throw "Missing argument";

            paramObject.type="POST";
            paramObject.success = paramObject.onSuccess;
            paramObject.error = paramObject.onFailure;
            paramObject.dataType = paramObject.responseDataType;
            paramObject.data = values;

            return verifrom.request.ajax(paramObject);
        }
    },
    setTimeout:function(callback, timer) {
        return window.setTimeout(callback, timer);
    },
    clearTimeout:function(timeoutID) {
        if(typeof timeoutID == "number")
            window.clearTimeout(timeoutID);
    },
    openURL:function(optionObject) {
        if (optionObject && optionObject.url && optionObject.where)
            window.open(optionObject.url, '_blank');
    },
    notifications : {
        enabled:false,
        checkEnabled:function() {
            if (extensionConfig.appInfo.safari===true)
                return;
            if (extensionConfig.appInfo.quantum) {
                verifrom.notifications.enabled=true;
            } else {
                if (!chrome.notifications || !chrome.notifications.getPermissionLevel)
                    return;
                chrome.notifications.getPermissionLevel(function(level) {
                    void 0;
                    verifrom.notifications.enabled=(level==='granted');
                });
                if (!chrome.notifications || !chrome.notifications.onPermissionLevelChanged)
                    return;
                chrome.notifications.onPermissionLevelChanged.addListener(function(level){
                    void 0;
                    verifrom.notifications.enabled=(level==='granted');
                });
            }
        },
        clickHandlers:{},
        clickHandlerSet:false,
        onClosedSet:false,
        onClosed:function(notificationId,byUser){
            void 0;
            if (typeof verifrom.notifications.clickHandlers[notificationId]==='function')
                delete verifrom.notifications.clickHandlers[notificationId];
        },
        clickHandler:function(notificationId, buttonIndex) {
            void 0;
            if (typeof verifrom.notifications.clickHandlers[notificationId]==='function')
            {
                verifrom.notifications.clickHandlers[notificationId]();
            } else void 0;

        },
        clear:function(id, callback) {
            void 0;
            if (typeof verifrom.notifications.clickHandlers[id]==='function')
                delete verifrom.notifications.clickHandlers[id];
            chrome.notifications.clear(id,function(cleared){
                if (typeof callback==='function')
                    callback(cleared);
            });
        },
        display:function(msg) {
            if (!verifrom.notifications.enabled)
            {
                void 0;
                return;
            }
            try {
                var id=extensionConfig.appInfo.extensionName+(msg.id || "Message");
                verifrom.notifications.clear(id,function(cleared){
                    var n={
                        "type": "basic",
                        "iconUrl": msg.iconUrl ? verifrom.getURL(msg.iconUrl) : verifrom.getURL("/logo/icon65.png"),
                        "title": msg.title ? msg.title : extensionConfig.appInfo.extensionName,
                        "message": msg.message ? msg.message : ""
                    };
                    if (typeof msg.onClicked==='function') {
                        if (verifrom.notifications.clickHandlerSet===false)
                            chrome.notifications.onClicked.addListener(verifrom.notifications.clickHandler);
                        verifrom.notifications.clickHandlerSet=true;
                        n.isClickable=true;
                        verifrom.notifications.clickHandlers[id]=msg.onClicked;
                    }
                    if (verifrom.notifications.onClosedSet===false) {
                        chrome.notifications.onClosed.addListener(verifrom.notifications.onClosed);
                        verifrom.notifications.onClosedSet=true;
                    }
                    chrome.notifications.create(id,n);
                    void 0;
                });
            } catch (e) {
                void 0;
            }
        }
    },
    contextMenus: browser.menus,
    messageDisplayAction: {
        enable:function(tabId) {
            browser.messageDisplayAction.enable(tabId);
        },
        disable:function(tabId) {
            browser.messageDisplayAction.disable(tabId);
        },
        onClicked:function(callback) {
            browser.messageDisplayAction.onClicked.addListener(callback);
        },
        setTitle:function(options) {
            browser.messageDisplayAction.setTitle({"title": options.title});
        },
        setPopup:function(popupObject) {
            browser.messageDisplayAction.setPopup({"tabId": popupObject.tabId, "popup": popupObject.popup});
        },
        openPopup:function() {
            if (verifrom.appInfo.quantum)
                browser.messageDisplayAction.openPopup();
            else throw "openPopup : unsupported feature";
        },
        setBadgeText:function(option) {
            browser.messageDisplayAction.setBadgeText(option);
        }
    },
    browserAction: {
        enable:function(tabId) {
            browser.browserAction.enable(tabId);
        },
        disable:function(tabId) {
            browser.browserAction.disable(tabId);
        },
        onClicked:function(callback) {
            browser.browserAction.onClicked.addListener(callback);
        },
        setTitle:function(options) {
            browser.browserAction.setTitle({"title": options.title});
        },
        setPopup:function(popupObject) {
            browser.browserAction.setPopup({"tabId": popupObject.tabId, "popup": popupObject.popup});
        },
        openPopup:function() {
            if (verifrom.appInfo.quantum)
                browser.browserAction.openPopup();
            else throw "openPopup : unsupported feature";
        },
        setBadgeText:function(option) {
            browser.browserAction.setBadgeText(option);
        }
    },
    settings: {
        options:null,
        get:function(defaults,callback) {
            if (verifrom.appInfo.safari) {
                callback(verifrom.merge(defaults,safari.extension.settings,safari.extension.secureSettings));
            } else {
                chrome.storage.sync.get(defaults,callback);
            }
        },
        set:function(items,callback) {
            if (verifrom.appInfo.safari) {
                Object.keys(items).forEach(function (item) {
                    if (item==='password')
                        safari.extension.secureSettings[item] = items[item];
                    else if (item!=='password')
                        safari.extension.settings[item] = items[item];
                    else throw "Cannot set settings for item "+item;
                });
                callback(verifrom.merge(safari.extension.settings,safari.extension.secureSettings));
            } else {
                chrome.storage.sync.set(items, callback.bind(this,items));
            }
        },
        onChangedSafariHandler:function(event) {
            if (event.key==="open" && event.newValue!==event.oldValue)
            {
                void 0;
                verifrom.extension.openOptions();
                return;
            } else if (event.key==="open")
            {
                void 0;
                return;
            }
            if (event.newValue===event.oldValue)
            {
                void 0;
                return;
            }
            if ('function'===typeof this)
                this(verifrom.merge(safari.extension.settings,safari.extension.secureSettings));
        },
        onChanged: {
            addListener:function(callback) {
                if (verifrom.appInfo.safari) {
                    safari.extension.settings.addEventListener("change", verifrom.settings.onChangedSafariHandler.bind(callback), false);
                    safari.extension.secureSettings.addEventListener("change", verifrom.settings.onChangedSafariHandler.bind(callback), false);
                }
                else
                    chrome.storage.onChanged.addListener(function(items,areaName){
                        if (areaName==='sync')
                            callback(items);
                    });
            }
        }
    },
    messageWebExt: {
        messageChannels:{},
        listeningChannels:false,
        connectListner: ("undefined" !== typeof chrome) ? chrome.runtime.onConnect.addListener(function(port) { messagePorts[port.name]=port;}) : undefined,
        addListener:function(optionObject, callback)
        {
            if (!(typeof callback === "function"))
                throw "Callback is not a function";
            if (browser && browser.runtime && "object" === typeof browser.runtime.onMessage)
            {
                this.messageChannels[verifrom.appInfo.extensionCodeName+optionObject.channel]=callback;
                if (verifrom.message.listeningChannels)
                {
                    void 0;
                    return;
                }
                verifrom.message.listeningChannels=true;
                browser.runtime.onMessage.addListener(function(request, sender, sendResponse) {
                    void 0;
                    if (request.channel && typeof verifrom.message.messageChannels[request.channel]==='function')
                    {
                        var _response=request['_response'];
                        var channel=request.channel;
                        delete request['channel'];
                        delete request['_response'];
                        setTimeout(verifrom.message.messageChannels[channel].bind(null,request, sender, _response ? sendResponse : false),1);
                        return _response ? true : false;
                    }
                });
            }
        },
        removeListener:function(channel) {
            delete verifrom.message.messageChannels[channel];
        },
        toBackground:function(message, optionObject)
        {
            if (chrome)
            {
                void 0;

                var request=message;
                if (optionObject && optionObject.channel)
                    request['channel']=verifrom.appInfo.extensionCodeName+optionObject.channel;
                try {
                    if (typeof optionObject.response==='function') {
                        var responseHandler=optionObject.response;
                        request['_response']=true;
                        if (verifrom.appInfo.quantum===true) {
                            var sending=browser.runtime.sendMessage(request);
                            sending.then(responseHandler,function() {
                                void 0;
                            }.bind(optionObject))
                                .catch((reason)=>{
                                    void 0;
                                });
                        } else {
                            let p = browser.runtime.sendMessage(request,responseHandler);
                            if (p && p.catch)
                                p.catch((reason)=>{
                                   void 0;
                                });
                        }
                    } else {
                        request['_response']=false;
                        let p = browser.runtime.sendMessage(request);
                        if (p && p.catch)
                            p.catch((reason)=>{
                                void 0;
                            });
                    }
                } catch(e)
                {
                    void 0;
                }
            }
        },
        toAllTabs:function(message, optionObject,callback)
        {
            var request=message;
            var anyTab=false;
            try {
                if (optionObject && optionObject.channel)
                    request['channel']=verifrom.appInfo.extensionCodeName+optionObject.channel;
                request['_response']=false;
                browser.runtime.sendMessage(request).catch((reason)=>{
                    void 0;
                });
            } catch(e)
            {
                void 0;
                if ("function"===typeof callback)
                    callback(anyTab);
            }
        },
        toActiveTabs:function(message, optionObject)
        {
            var request=message;
            if (optionObject && optionObject.channel)
                request['channel']=verifrom.appInfo.extensionCodeName+optionObject.channel;

            try {
                chrome.tabs.query({active:true, currentWindow:true},function(Tabs) {
                    for (var i=0;i<Tabs.length;i++)
                    {
                        if (Tabs[i].id)
                        {
                            let p=browser.tabs.sendMessage(Tabs[i].id, request);
                            if (p && p.catch)
                                p.catch((reason)=>{
                                    void 0;
                                });
                        }
                    }
                });
            } catch(e)
            {
                void 0;
            }
        },
        toTab:function(tabID, message, optionObject)
        {
            var request=message;
            if (optionObject && optionObject.channel)
                request['channel']=verifrom.appInfo.extensionCodeName+optionObject.channel;
            try {
                let p = browser.tabs.sendMessage(tabID, request);
                if (p && p.catch)
                    p.catch((reason)=>{
                        void 0;
                    });
            } catch(e)
            {
                void 0;
            }
        },
        getFullChannel:function(channelSuffix)
        {
            return verifrom.appInfo.extensionCodeName+channelSuffix;
        }
    },
    message: null,
    sanitizer: {
        getSanitizedURLContent:function(url, onSuccessCallBack) {
            if ("function" !== typeof onSuccessCallBack)
                throw 'Callback is not a function';
            try {
                verifrom.request.get({
                    url: url,
                    onSuccess: function (content) {
                        onSuccessCallBack(DOMPurify.sanitize(content,{ADD_ATTR: ['data-VerifromLocalize','yes','no','target'],WHOLE_DOCUMENT: true, ADD_TAGS: ['link','iframe']}));
                    },
                    onFailure: function (httpCode) {
                        throw "Could not get content " + url + " to sanitize : " + httpCode;
                    },
                    contentType:'application/x-www-form-urlencoded',
                    responseDataType:'html'
                });
            }catch(e){
                void 0;
            }
        },
        getSanitizedHTMLContent:function(htmlContent, onSuccessCallBack)
        {
            if ("function" !== typeof onSuccessCallBack)
                void 0;
            var sanitizedContent=DOMPurify.sanitize(htmlContent, {ADD_ATTR: ['data-VerifromLocalize'], WHOLE_DOCUMENT: true, ADD_TAGS: ['link','iframe']});
            if ("function"===typeof onSuccessCallBack)
                onSuccessCallBack(sanitizedContent);
            return sanitizedContent;
        }
    },
    };

verifrom.message = verifrom.messageWebExt;

verifrom.actionButton = function(tabId, actionButton) {
    this._id = Date.now();
    this._popup = null;
    this._button = actionButton;
    this._view = null;
    this._tabId = tabId;
    this._defaultPopup = null;
    this._handlers = new Map();
    this._data = null;
    this._viewName = null;
    this._context = null;
    this._openResolved = null;
    this._openRejected = null;
    this._applyDefault = false;
    verifrom.actionButton._instances.set(tabId,this);
};

verifrom.actionButton._instances = new Map();
verifrom.actionButton._onTabsRemovedListener = false;
verifrom.actionButton.instanceForTab=function(tabId, button) {
    let instance = verifrom.actionButton._instances.get(tabId);
    if (!instance) {
        instance = new verifrom.actionButton(tabId, button);
        verifrom.actionButton._instances.set(tabId, instance);
        void 0;
    } else {
        if (button && instance._button !== button) {
            instance._button = button;
            void 0;
        }
        void 0;
    }
    if (!verifrom.actionButton._onTabsRemovedListener) {
        verifrom.actionButton._onTabsRemovedListener=true;
        browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
            void 0;
            verifrom.actionButton._instances.delete(tabId);
        });
        browser.tabs.onUpdated.addListener((tabId, changeInfo,tab) => {
            void 0;
            if (changeInfo.hasOwnProperty("title"))
                verifrom.actionButton._instances.delete(tabId);
        }, {properties:["title"]});
    }
    return instance;
};
verifrom.actionButton.onLoad = function(href,window) {
    let url = new URL(href);
    let tabId = url.searchParams.get("tabId");
    if (!tabId) {
        void 0;
        return;
    }
    tabId=parseInt(tabId);
    void 0;
    let instance = verifrom.actionButton._instances.get(tabId);
    if (!instance) {
        void 0;
        if (this._openRejected)
            return this._openRejected(new Error("cannot retrieve instance for action manager"));
    } else void 0;
    instance._viewLoaded(href,window);
    return instance;
};
verifrom.actionButton.onClickedListening=new Map();
verifrom.actionButton.lastClick=Date.now();
verifrom.actionButton.onClicked = function(button, handler) {
    let innerHandler=function(tab,info) {

        if (verifrom.actionButton.onClickedListening.has(button)===true) {
            void 0;
            verifrom.actionButton.onClickedListening.delete(button);
            button.onClicked.removeListener(innerHandler);
        } else void 0;

        let t = Date.now();
        void 0;
        let delay = t - verifrom.actionButton.lastClick;
        if (delay < 500) {
            void 0;
            if (verifrom.actionButton.onClickedListening.has(button)===false) {
                void 0;
                verifrom.actionButton.onClickedListening.set(button,true);
                button.onClicked.addListener(innerHandler);
            } else void 0;
            return false;
        }
        if (typeof tab !== "object") {
            if (typeof tab==="number") {
                void 0;
                tab = {id: tab}; 
            } else {
                void 0;
                browser.tabs.query({
                    active:true,
                    lastFocusedWindow:true
                }).then((tabsArray)=> {
                    if (tabsArray && tabsArray.length) {
                        void 0;
                        innerHandler(tabsArray[0]);
                    }
                });
                return;
            }
        }
        verifrom.actionButton.lastClick=t;
        void 0;
        let instance = verifrom.actionButton.instanceForTab(tab.id, button);
        handler.call(instance,tab,info);

        if (verifrom.actionButton.onClickedListening.has(button)===false) {
            void 0;
            verifrom.actionButton.onClickedListening.set(button,true);
            button.onClicked.addListener(innerHandler);
        } else void 0;

    };
    if (verifrom.actionButton.onClickedListening.has(button)===false) {
        void 0;
        verifrom.actionButton.onClickedListening.set(button,true);
        button.onClicked.addListener(innerHandler);
    } else void 0;
};
verifrom.actionButton.prototype = {
    get popup() {
        let url;
        if (this._viewName && this._applyDefault!==true)
            url = chrome.extension.getURL(`/html/views/${this._viewName}.html?tabId=${this._tabId}`);
        else if (this._defaultPopup)
            url = chrome.extension.getURL(`/html/views/${this._defaultPopup}.html?tabId=${this._tabId}`);
        void 0;
        return url;
    },
    get viewName() {
        let name = (this._applyDefault || !this._viewName) ? this._defaultPopup : this._viewName;
        void 0;
        return name;
    },
    set viewName(value) {
        void 0;
        return this._viewName=value;
    },
    get data() {
        return this._data;
    },
    set data(value) {
        return this._data=value;
    },
    get tabId() {
        return this._tabId;
    },
    _viewLoaded(href, window) {
        void 0;
        try {
            this._view = window;
            this.localize();
            this.updateView();
            if (this._openResolved)
                this._openResolved(this);
            else void 0;
        } catch(e) {
            if (this._openRejected)
                this._openRejected(e);
        }
    },
    localize: function(data) {
        try {
            if (!this._view)
                void 0;
            let elements = this._view.document.querySelectorAll('[data-verifromlocalize]');
            for (let element of elements) {
                let key = element.getAttribute("data-verifromlocalize");
                let value = verifrom.locales.getMessage(key);
                if (value) {
                    element.innerHTML = value;
                } else void 0;
            }
        } catch(e) {
            void 0;
        } finally {
            var event = new Event('localized');
            this._view.document.body.dispatchEvent(event);
        }
    },
    openDefault:function() {
        this._applyDefault=true;
        return this.open();
    },
    open:function(name) {
        void 0;
        return new Promise(function (resolvePromise, rejectPromise) {
        if (typeof name === "string")
                this.viewName = name;
            this._button.setPopup({"tabId": this._tabId, "popup": this.popup});
            let openPromise = this._button.openPopup();
            openPromise
                .then(function (resolvePromise, rejectPromise) {
                    void 0;
                    this._openRejected = rejectPromise;
                    this._openResolved = resolvePromise;
                    this._resetPopup();
                }.bind(this, resolvePromise, rejectPromise))
                .catch((reason) => {
                    void 0;
                    rejectPromise(reason);
                });
        }.bind(this));
    },
    closed:function() {
        void 0;
        this._applyDefault=false;
        this._view = null;
        let handlers = this._handlers.get("close");
        let handlersOnce = this._handlers.get("closeOnce");
        this._handlers.delete("closeOnce");
        verifrom.actionButton._instances.delete(this.tabId);
        if (handlers)
            handlers.forEach((handler)=>{
                Promise.resolve().then(handler.bind(this));
            });
        if (handlersOnce)
            handlersOnce.forEach((handler)=>{
                Promise.resolve().then(handler.bind(this));
            });
        void 0;
    },
    unloaded:function() {
        void 0;
        this._applyDefault=false;
        this._view = null;
        let handlers = this._handlers.get("unload");
        let handlersOnce = this._handlers.get("unloadOnce");
        this._handlers.delete("unloadOnce");
        this._resetPopup();
        if (handlers)
            handlers.forEach((handler)=>{
                Promise.resolve().then(handler.bind(this));
            });
        void 0;
        if (handlersOnce)
            handlersOnce.forEach((handler)=>{
                Promise.resolve().then(handler.bind(this));
            });
        void 0;

    },
    onClosed:function(eventHandler, once) {
        let event = "close"+(once===true?"Once":"");
        if (!this._handlers.has(event))
            this._handlers.set(event, new Set());
        this._handlers.get(event).add(eventHandler.bind(this));
    },
    onUnloaded:function(eventHandler, once) {
        let event = "unload"+(once===true?"Once":"");
        if (!this._handlers.has(event))
            this._handlers.set(event, new Set());
        this._handlers.get(event).add(eventHandler.bind(this));
        void 0;
    },
    switch:function(name) {
        return new Promise((resolve, reject) => {
            try {
                this.removeAllEventListeners();
                if (!this._view)
                    return reject(new Error("No view"));
                if (typeof name === "string")
                    this.viewName = name;
                let prevHeight = this._view.document.height;
                this._openRejected = reject;
                this._openResolved = resolve;
                this._view.location.href = this.popup;
                this._view.document.height = prevHeight;
            } catch(e) {
                void 0;
                reject(e);
            }
        });
    },
    _resetPopup() {
        try {
            this._button.setPopup({popup: null});
            this._button.setPopup({popup: null, tabId:this.tabId});
        } catch(e) {
            void 0;
        } finally {
            void 0;
        }
    },
    resetPopup() {
        this._resetPopup();
    },
    setPopup(name, data) {
        this._viewName = name;
        this._data = data;
        void 0;
    },
    setDefaultPopup:function(name) {
        void 0;
        this._defaultPopup = name;
    },
    close:function() {
        void 0;
        try {
            if (this._view)
                this._view.close();
        } catch(e) {
            void 0;
            this._resetPopup();
        }
        this._view = null;
    },
    set context(value) {
        void 0;
        this._context = value;
    },
    get context() {
        return this._context;
    },
    setElementVisibilty:function(selector,visibility) {
        void 0;
        try {
            let e = this._view.document.querySelector(selector);
            e.style.visibility = visibility ? e.parentElement.style.visibility : "hidden";
            e.style.display = visibility ? e.parentElement.style.display : "none";
        } catch(e) {
            void 0;
        }
    },
    updateView:function(data) {
        void 0;
        try {
            this._view.document.querySelector("body");
        } catch(e) {
            void 0;
            this._view=null;
        }
        if (!this._view) {
            void 0;
            this._data = data;
            return;
        }
        try {
            if (!data && this._data)
                data=this._data;
            if (!data)
                return;
            void 0;
            let selectors = Object.keys(data);
            for (let selector of selectors) {
                let e = this._view.document.querySelector(selector);
                if (!e) {
                    void 0;
                    continue;
                } else void 0;
                Object.assign(e, data[selector]);
            }
        } catch(ex) {
            void 0;
        }
    },
    addEventListener:function(selector, event, handler, options) {
        if (!this._view)
            throw new Error("no view");
        try {
            let e = this._view.document.body.querySelector(selector);
            if (e) {
                let h = handler.bind(this);
                this.removeEventListener(event, selector);
                e.addEventListener(event, h, options);
                this._handlers.set(event+"@"+selector, {event: event, element:e, selector:selector, handler:h, options: options});
            } else void 0;
        } catch(e) {
            void 0;
        }
    },
    removeAllEventListeners:function() {
        if (this._handlers) {
            let keys=this._handlers.keys();
            for (let key of keys) {
                handler = this._handlers.get(key);
                if (handler.event && handler.selector) {
                    this.removeEventListener(handler.event, handler.selector);
                }
            }
            this._handlers = new Map();
        }
    },
    removeEventListener:function(event, selector) {
        try {
            let h = this._handlers.get(event+"@"+selector);
            this._handlers.delete(event+"@"+selector);
            if (h && h.element && h.handler)
                h.element.removeEventListener(h.event, h.handler, h.options);
        } catch(e) {
            void 0;
        }
    }
};

verifrom.notifications.checkEnabled();
