// Background

/* jshint esversion:6, -W097 */
/* jslint esversion:6 */
/* global helpers, showError, Worker, chrome, console */

"use strict";


// Chrome don’t follow the W3C specification:
// https://browserext.github.io/browserext/
let bChrome = false;
let bThunderbird = false;
if (typeof(browser) !== "object") {
    var browser = chrome;
    bChrome = true;
}
if (typeof(messenger) === "object") {
    bThunderbird = true;
}


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
        if (bChrome) {
            browser.storage.local.get("ui_options", this._initUIOptions);
            browser.storage.local.get("autorefresh_option", this._initUIOptions);
            return;
        }
        browser.storage.local.get("ui_options").then(this._initUIOptions, showError);
        browser.storage.local.get("autorefresh_option").then(this._initUIOptions, showError);
    },

    initGrammarChecker: function () {
        if (bChrome) {
            browser.storage.local.get("gc_options", this._initGrammarChecker);
            browser.storage.local.get("main_dic_name", this._setSpellingDictionaries);
            browser.storage.local.get("personal_dictionary", this._setSpellingDictionaries);
            browser.storage.local.get("community_dictionary", this._setSpellingDictionaries);
            browser.storage.local.get("oPersonalDictionary", this._setSpellingDictionaries); // deprecated
            browser.storage.local.get("sc_options", this._initSCOptions);
            return;
        }
        browser.storage.local.get("gc_options").then(this._initGrammarChecker, showError);
        browser.storage.local.get("main_dic_name", this._setSpellingDictionaries);
        browser.storage.local.get("personal_dictionary").then(this._setSpellingDictionaries, showError);
        browser.storage.local.get("community_dictionary").then(this._setSpellingDictionaries, showError);
        browser.storage.local.get("oPersonalDictionary").then(this._setSpellingDictionaries, showError); // deprecated
        browser.storage.local.get("sc_options").then(this._initSCOptions, showError);
    },

    registerComposeScripts: async function () {
        // For Thunderbird only
        if (bThunderbird) {
            let xRegisteredScripts = await messenger.composeScripts.register({
                /*css: [
                    // Any number of code or file objects could be listed here.
                    { code: "body { background-color: red; }" },
                    { file: "compose.css" },
                ],*/
                js: [
                    // Any number of code or file objects could be listed here.
                    //{ code: `document.body.textContent = "Hey look, the script ran!";` },
                    { file: "content_scripts/editor.js" },
                    { file: "content_scripts/html_src.js" },
                    { file: "content_scripts/panel.js" },
                    { file: "grammalecte/fr/textformatter.js" },
                    { file: "content_scripts/panel_tf.js" },
                    { file: "content_scripts/panel_gc.js" },
                    { file: "content_scripts/message_box.js" },
                    { file: "content_scripts/menu.js" },
                    { file: "content_scripts/init.js" }
                ]
            });
            // To unregister scripts:
            // await xRegisteredScripts.unregister();
        }
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
                oParam: {sExtensionPath: browser.runtime.getURL(""), dOptions: dOptions, sContext: "Firefox"},
                oInfo: {}
            });
        }
        catch (e) {
            console.log("initGrammarChecker failed");
            showError(e);
        }
    },

    _setSpellingDictionaries: function (oData) {
        if (oData.hasOwnProperty("oPersonalDictionary")) {
            // deprecated (to be removed in 2020)
            console.log("personal dictionary migration");
            browser.storage.local.set({ "personal_dictionary": oData["oPersonalDictionary"] });
            oWorkerHandler.xGCEWorker.postMessage({ sCommand: "setDictionary", oParam: { sDictionary: "personal", oDict: oData["oPersonalDictionary"] }, oInfo: {} });
            browser.storage.local.remove("oPersonalDictionary");
        }
        if (oData.hasOwnProperty("main_dic_name")) {
            oWorkerHandler.xGCEWorker.postMessage({ sCommand: "setDictionary", oParam: { sDictionary: "main", oDict: oData["main_dic_name"] }, oInfo: {sExtPath: browser.runtime.getURL("")} });
        }
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
    },
}

// start the Worker for the GC
oWorkerHandler.start();

// init the options stuff and start the GC
oInitHandler.initUIOptions();
oInitHandler.initGrammarChecker();
oInitHandler.registerComposeScripts(); // Thunderbird only


// When the extension is installed or updated
browser.runtime.onInstalled.addListener(function (oDetails) {
    // launched at installation or update
    // https://developer.mozilla.org/fr/Add-ons/WebExtensions/API/runtime/onInstalled
    if (oDetails.reason == "update"  ||  oDetails.reason == "installed") {
        // todo
        //browser.tabs.create({url: "http://grammalecte.net"});
    }
});


/*
    Messages from the extension (not the Worker)
*/
function handleMessage (oRequest, xSender, sendResponse) {
    // message from panels
    //console.log(xSender);
    let {sCommand, oParam, oInfo} = oRequest;
    switch (sCommand) {
        case "getOptions":
        case "getDefaultOptions":
        case "setOptions":
        case "setOption":
        case "resetOptions":
        case "textToTest":
        case "fullTests":
        case "setDictionary":
        case "setDictionaryOnOff":
            oWorkerHandler.xGCEWorker.postMessage(oRequest);
            break;
        case "restartWorker":
            oWorkerHandler.restart(oParam["nDelayLimit"]);
            break;
        case "openURL":
            browser.tabs.create({url: oParam.sURL});
            break;
        case "openConjugueurTab":
            openConjugueurTab();
            break;
        case "openLexiconEditor":
            openLexiconEditor(oParam["dictionary"]);
            break;
        case "openDictionaries":
            openDictionaries();
            break;
        default:
            console.log("[background] Unknown command: " + sCommand);
            console.log(oRequest);
    }
    //sendResponse({response: "response from background script"});
}

browser.runtime.onMessage.addListener(handleMessage);


/*
    Ports from content-scripts
*/
let dConnx = new Map();

function handleConnexion (xPort) {
    // Messages from tabs
    let iPortId = xPort.sender.tab.id; // identifier for the port: each port can be found at dConnx[iPortId]
    dConnx.set(iPortId, xPort);
    xPort.onMessage.addListener(function (oRequest) {
        let {sCommand, oParam, oInfo} = oRequest;
        switch (sCommand) {
            case "ping":
                //console.log("[background] ping");
                xPort.postMessage({sActionDone: "ping", result: null, bInfo: null, bEnd: true, bError: false});
                break;
            case "parse":
            case "parseAndSpellcheck":
            case "parseAndSpellcheck1":
            case "parseFull":
            case "getListOfTokens":
            case "getSpellSuggestions":
            case "getVerb":
                oRequest.oInfo.iReturnPort = iPortId; // we pass the id of the return port to receive answer
                oWorkerHandler.xGCEWorker.postMessage(oRequest);
                break;
            case "restartWorker":
                oWorkerHandler.restart(oParam["nDelayLimit"]);
                break;
            case "openURL":
                browser.tabs.create({url: oParam.sURL});
                break;
            case "openConjugueurTab":
                openConjugueurTab();
                break;
            case "openConjugueurWindow":
                openConjugueurWindow();
                break;
            case "openLexiconEditor":
                openLexiconEditor("__personal__", oParam["sWord"]);
                break;
            default:
                console.log("[background] Unknown command: " + sCommand);
                console.log(oRequest);
        }
    });
    //xPort.postMessage({sActionDone: "newId", result: iPortId});
    //console.log("[Grammalecte] init connection to content-script");
    xPort.postMessage({sActionDone: "init", sUrl: browser.runtime.getURL("")});
}

browser.runtime.onConnect.addListener(handleConnexion);



/*
    ComposeAction
    (Thunderbird only)
*/
if (bThunderbird) {
    messenger.composeAction.onClicked.addListener(function (xTab, xData) {
        sendCommandToTabViaPort(xTab.id, "grammar_checker_compose_window");
    });
}


/*
    Context Menu
    (not for MailExtension)
*/
if (!bThunderbird) {
    // Analyze
    browser.contextMenus.create({ id: "grammar_checker_editable",   title: "Analyser cette zone de texte",              contexts: ["editable"] });
    browser.contextMenus.create({ id: "grammar_checker_selection",  title: "Analyser la sélection",                     contexts: ["selection"] });
    browser.contextMenus.create({ id: "grammar_checker_iframe",     title: "Analyser le contenu de ce cadre",           contexts: ["frame"] });
    browser.contextMenus.create({ id: "grammar_checker_page",       title: "Analyser la page",                          contexts: ["all"] });
    browser.contextMenus.create({ id: "separator_tools",            type: "separator",                                  contexts: ["all"] });
    // Tools
    browser.contextMenus.create({ id: "conjugueur_tab",             title: "Conjugueur [onglet]",                       contexts: ["all"] });
    browser.contextMenus.create({ id: "conjugueur_window",          title: "Conjugueur [fenêtre]",                      contexts: ["all"] });
    //browser.contextMenus.create({ id: "dictionaries",               title: "Dictionnaires",                             contexts: ["all"] });
    browser.contextMenus.create({ id: "lexicon_editor",             title: "Éditeur lexical",                           contexts: ["all"] });

    browser.contextMenus.onClicked.addListener(function (xInfo, xTab) {
        // xInfo = https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/contextMenus/OnClickData
        // xTab = https://developer.mozilla.org/en-US/Add-ons/WebExtensions/API/tabs/Tab
        // confusing: no way to get the node where we click?!
        switch (xInfo.menuItemId) {
            // analyze
            case "grammar_checker_editable":
            case "grammar_checker_page":
                sendCommandToTabViaPort(xTab.id, xInfo.menuItemId);
                break;
            case "grammar_checker_iframe":
                sendCommandToTabViaPort(xTab.id, xInfo.menuItemId, xInfo.frameId);
                break;
            case "grammar_checker_selection":
                sendCommandToTabViaPort(xTab.id, xInfo.menuItemId, xInfo.selectionText);
                break;
            // tools
            case "conjugueur_window":
                openConjugueurWindow();
                break;
            case "conjugueur_tab":
                openConjugueurTab();
                break;
            case "lexicon_editor":
                openLexiconEditor();
                break;
            case "dictionaries":
                openDictionaries();
                break;
            default:
                console.log("[Background] Unknown menu id: " + xInfo.menuItemId);
                console.log(xInfo);
                console.log(xTab);
        }
    });
}



/*
    Keyboard shortcuts
*/
browser.commands.onCommand.addListener(function (sCommand) {
    switch (sCommand) {
        case "grammar_checker":
            sendCommandToCurrentTab("shortcutGrammarChecker");
            break;
        case "conjugueur_tab":
            openConjugueurTab();
            break;
        case "lexicon_editor":
            openLexiconEditor();
            break;
        case "dictionaries":
            openDictionaries();
            break;
    }
});


/*
    Tabs
*/
let nTabLexiconEditor = null;
let nTabDictionaries = null;
let nTabConjugueur = null;

browser.tabs.onRemoved.addListener(function (nTabId, xRemoveInfo) {
    switch (nTabId) {
        case nTabLexiconEditor: nTabLexiconEditor = null; break;
        case nTabDictionaries:  nTabDictionaries = null; break;
        case nTabConjugueur:    nTabConjugueur = null; break;
    }
});


/*
    Actions
*/

function storeGCOptions (dOptions) {
    if (dOptions instanceof Map) {
        dOptions = helpers.mapToObject(dOptions);
    }
    browser.storage.local.set({"gc_options": dOptions});
}

function sendCommandToTabViaPort (iTab, sCommand, result=null) {
    let xTabPort = dConnx.get(iTab);
    xTabPort.postMessage({sActionDone: sCommand, result: result, oInfo: null, bEnd: false, bError: false});
}

function sendCommandToTab (iTab, sCommand, oParam=null) {
    //console.log("send to:", iTab, "command:", sCommand, "params:", oParam);
    browser.tabs.sendMessage(iTab, {sActionRequest: sCommand, oParam: oParam});
}

function sendCommandToCurrentTab (sCommand) {
    if (bChrome) {
        browser.tabs.query({ currentWindow: true, active: true }, (lTabs) => {
            for (let xTab of lTabs) {
                //console.log(xTab);
                browser.tabs.sendMessage(xTab.id, {sActionRequest: sCommand});
            }
        });
        return;
    }
    browser.tabs.query({ currentWindow: true, active: true }).then((lTabs) => {
        for (let xTab of lTabs) {
            //console.log(xTab);
            browser.tabs.sendMessage(xTab.id, {sActionRequest: sCommand});
        }
    }, showError);
}

function sendCommandToAllTabs (sCommand) {
    for (let [iTab, xTabPort] of dConnx.entries()) {
        xTabPort.postMessage({sActionDone: sCommand, result: null, oInfo: null, bEnd: false, bError: false});
    }
}


let sWordForLexiconEditor = "";

function openLexiconEditor (sName="__personal__", sWord="") {
    if (nTabLexiconEditor === null) {
        sWordForLexiconEditor = sWord;
        if (bChrome) {
            browser.tabs.create({
                url: browser.runtime.getURL("panel/lex_editor.html")
            }, onLexiconEditorOpened);
            return;
        }
        let xLexEditor = browser.tabs.create({
            url: browser.runtime.getURL("panel/lex_editor.html")
        });
        xLexEditor.then(onLexiconEditorOpened, showError);
    }
    else {
        browser.tabs.update(nTabLexiconEditor, {active: true});
        sendCommandToTab(nTabLexiconEditor, "new_entry", { sWord: sWord });
    }
}

function onLexiconEditorOpened (xTab) {
    nTabLexiconEditor = xTab.id;
    if (sWordForLexiconEditor !== "") {
        setTimeout(sendCommandToTab, 1000, nTabLexiconEditor, "new_entry", { sWord: sWordForLexiconEditor });
    }
}

function openDictionaries () {
    if (nTabDictionaries === null) {
        if (bChrome) {
            browser.tabs.create({
                url: browser.runtime.getURL("panel/dictionaries.html")
            }, onDictionariesOpened);
            return;
        }
        let xLexEditor = browser.tabs.create({
            url: browser.runtime.getURL("panel/dictionaries.html")
        });
        xLexEditor.then(onDictionariesOpened, showError);
    }
    else {
        browser.tabs.update(nTabDictionaries, {active: true});
    }
}

function onDictionariesOpened (xTab) {
    nTabDictionaries = xTab.id;
}

function openConjugueurTab () {
    if (nTabConjugueur === null) {
        if (bChrome) {
            browser.tabs.create({
                url: browser.runtime.getURL("panel/conjugueur.html")
            }, onConjugueurOpened);
            return;
        }
        let xConjTab = browser.tabs.create({
            url: browser.runtime.getURL("panel/conjugueur.html")
        });
        xConjTab.then(onConjugueurOpened, showError);
    }
    else {
        browser.tabs.update(nTabConjugueur, {active: true});
    }
}

function onConjugueurOpened (xTab) {
    nTabConjugueur = xTab.id;
}

function openConjugueurWindow () {
    if (bChrome) {
        browser.windows.create({
            url: browser.runtime.getURL("panel/conjugueur.html"),
            type: "popup",
            width: 710,
            height: 980
        });
        return;
    }
    let xConjWindow = browser.windows.create({
        url: browser.runtime.getURL("panel/conjugueur.html"),
        type: "popup",
        width: 710,
        height: 980
    });
}


function showError (e) {
    console.error(e);
    //console.error(e.fileName + "\n" + e.name + "\nline: " + e.lineNumber + "\n" + e.message);
}
