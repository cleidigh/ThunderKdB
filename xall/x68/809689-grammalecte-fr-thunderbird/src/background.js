// Background

"use strict";

// Draft for later

const oWorkerHandler = {
    xGCEWorker: null,

    nLastTimeWorkerResponse: 0,  // milliseconds since 1970-01-01

    oTask: {},

    start: function () {
        this.xGCEWorker = new Worker("gce_worker.js");
        this.xGCEWorker.onmessage = function (e) {
            // Messages received from the Worker
            // https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent
            try {
                this.nLastTimeWorkerResponse = Date.now();
                let {sActionDone, result, oInfo, bEnd, bError} = e.data;
                if (bError) {
                    console.log(result);
                    console.log(oInfo);
                    return;
                }
                switch (sActionDone) {
                    case "init":
                        storeGCOptions(result);
                        break;
                    case "parse":
                    case "parseAndSpellcheck":
                    case "parseAndSpellcheck1":
                    case "parseFull":
                    case "getListOfTokens":
                    case "getSpellSuggestions":
                    case "getVerb":
                        // send result to content script
                        if (typeof(oInfo.iReturnPort) === "number") {
                            let xPort = dConnx.get(oInfo.iReturnPort);
                            xPort.postMessage(e.data);
                        } else {
                            console.log("[background] don’t know where to send results");
                            console.log(e.data);
                        }
                        break;
                    case "textToTest":
                    case "fullTests":
                        // send result to panel
                        browser.runtime.sendMessage(e.data);
                        break;
                    case "getOptions":
                    case "getDefaultOptions":
                    case "resetOptions":
                        // send result to panel
                        storeGCOptions(result);
                        browser.runtime.sendMessage(e.data);
                        break;
                    case "setOptions":
                    case "setOption":
                        storeGCOptions(result);
                        break;
                    case "setDictionary":
                    case "setDictionaryOnOff":
                        //console.log("[background] " + sActionDone + ": " + result);
                        break;
                    default:
                        console.log("[background] Unknown command: " + sActionDone);
                        console.log(e.data);
                }
            }
            catch (error) {
                showError(error);
                console.log(e.data);
            }
        };
    },

    getTimeSinceLastResponse: function () {
        // result in seconds
        return Math.floor((Date.now() - this.nLastTimeWorkerResponse) / 1000);
    },

    restart: function (nDelay=5) {
        if (this.getTimeSinceLastResponse() <= nDelay) {
            console.log("Worker not restarted. Worked ", nDelay, " seconds ago.");
            return false;
        }
        if (this.xGCEWorker) {
            this.xGCEWorker.terminate();
        }
        this.start();
        oInitHandler.initGrammarChecker();
        sendCommandToAllTabs("workerRestarted");
        console.log("Worker restarted.");
        return true;
    },

    addTask: function () {
        //
    },

    closeTask: function () {
        //
    }
}


const oInitHandler = {

    initUIOptions: function () {
        browser.storage.local.get("ui_options").then(this._initUIOptions, showError);
        browser.storage.local.get("autorefresh_option").then(this._initUIOptions, showError);
    },

    initGrammarChecker: function () {
        browser.storage.local.get("gc_options").then(this._initGrammarChecker, showError);
        browser.storage.local.get("personal_dictionary").then(this._setSpellingDictionaries, showError);
        browser.storage.local.get("community_dictionary").then(this._setSpellingDictionaries, showError);
        browser.storage.local.get("sc_options").then(this._initSCOptions, showError);
    },

    _initUIOptions: function (oSavedOptions) {
        if (!oSavedOptions.hasOwnProperty("ui_options")) {
            browser.storage.local.set({"ui_options": {
                textarea: true,
                editablenode: true
            }});
        }
        if (!oSavedOptions.hasOwnProperty("autorefresh_option")) {
            browser.storage.local.set({"autorefresh_option": true});
        }
    },

    _initGrammarChecker: function (oSavedOptions) {
        try {
            let dOptions = (oSavedOptions.hasOwnProperty("gc_options")) ? oSavedOptions.gc_options : null;
            if (dOptions !== null && Object.getOwnPropertyNames(dOptions).length == 0) {
                console.log("# Error: the saved options was an empty object.");
                dOptions = null;
            }
            oWorkerHandler.xGCEWorker.postMessage({
                sCommand: "init",
                oParam: {sExtensionPath: browser.extension.getURL(""), dOptions: dOptions, sContext: "Firefox"},
                oInfo: {}
            });
        }
        catch (e) {
            console.log("initGrammarChecker failed");
            showError(e);
        }
    },

    _setSpellingDictionaries: function (oData) {
        if (oData.hasOwnProperty("community_dictionary")) {
            oWorkerHandler.xGCEWorker.postMessage({ sCommand: "setDictionary", oParam: { sDictionary: "community", oDict: oData["community_dictionary"] }, oInfo: {} });
        }
        if (oData.hasOwnProperty("personal_dictionary")) {
            oWorkerHandler.xGCEWorker.postMessage({ sCommand: "setDictionary", oParam: { sDictionary: "personal", oDict: oData["personal_dictionary"] }, oInfo: {} });
        }
    },

    _initSCOptions: function (oData) {
        if (!oData.hasOwnProperty("sc_options")) {
            browser.storage.local.set({"sc_options": {
                community: true,
                personal: true
            }});
            oWorkerHandler.xGCEWorker.postMessage({ sCommand: "setDictionaryOnOff", oParam: { sDictionary: "community", bActivate: true }, oInfo: {} });
            oWorkerHandler.xGCEWorker.postMessage({ sCommand: "setDictionaryOnOff", oParam: { sDictionary: "personal", bActivate: true }, oInfo: {} });
        } else {
            oWorkerHandler.xGCEWorker.postMessage({ sCommand: "setDictionaryOnOff", oParam: { sDictionary: "community", bActivate: oData.sc_options["community"] }, oInfo: {} });
            oWorkerHandler.xGCEWorker.postMessage({ sCommand: "setDictionaryOnOff", oParam: { sDictionary: "personal", bActivate: oData.sc_options["personal"] }, oInfo: {} });
        }
    }
}

// start the Worker for the GC
oWorkerHandler.start();

// init the options stuff and start the GC
oInitHandler.initUIOptions();
oInitHandler.initGrammarChecker();



/*
    Actions
*/

function storeGCOptions (dOptions) {
    if (dOptions instanceof Map) {
        dOptions = helpers.mapToObject(dOptions);
    }
    browser.storage.local.set({"gc_options": dOptions});
}


function showError (e) {
    console.error(e);
    //console.error(e.fileName + "\n" + e.name + "\nline: " + e.lineNumber + "\n" + e.message);
}
