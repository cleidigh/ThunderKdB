// Main panel

"use strict";


function showError (e) {
    console.error(e.fileName + "\n" + e.name + "\nline: " + e.lineNumber + "\n" + e.message);
}

// Chrome don’t follow the W3C specification:
// https://browserext.github.io/browserext/
let bChrome = false;
if (typeof(browser) !== "object") {
    var browser = chrome;
    bChrome = true;
}


/*
    Events
*/
window.addEventListener(
    "click",
    function (xEvent) {
        let xElem = xEvent.target;
        if (xElem.id) {
            // tests
            if (xElem.id === "text_to_test_button") {
                browser.runtime.sendMessage({
                    sCommand: "textToTest",
                    oParam: {sText: document.getElementById("text_to_test").value, sCountry: "FR", bDebug: true, bContext: false},
                    oInfo: {}
                });
            }
            else if (xElem.id === "fulltests_button") {
                document.getElementById("tests_result").textContent = "Veuillez patienter…";
                browser.runtime.sendMessage({
                    sCommand: "fullTests",
                    oParam: {},
                    oInfo: {}
                });
            }
            else if (xElem.id == "restart_worker") {
                browser.runtime.sendMessage({
                    sCommand: "restartWorker",
                    oParam: { "nDelayLimit": 3 },
                    oInfo: {}
                });
            }
            // grammar options
            else if (xElem.id === "default_options_button") {
                browser.runtime.sendMessage({
                   sCommand: "resetOptions",
                   oParam: {},
                   oInfo: {}
                });
            }
            else if (xElem.id.startsWith("option_")) {
                if (xElem.dataset.option) {
                    browser.runtime.sendMessage({
                        sCommand: "setOption",
                        oParam: {sOptName: xElem.dataset.option, bValue: xElem.checked},
                        oInfo: {}
                    });
                }
            }
            // dictionaries options
            else if (xElem.id.endsWith("_dic")) {
                if (xElem.dataset.dictionary) {
                    storeSCOptions();
                    browser.runtime.sendMessage({
                        sCommand: "setDictionaryOnOff",
                        oParam: {sDictionary: xElem.dataset.dictionary, bActivate: xElem.checked},
                        oInfo: {}
                    });
                }
            }
            else if (xElem.id.startsWith("spelling_")) {
                updateSpellingChoiceUI(xElem.id);
                let sMainDicName = document.getElementById(xElem.id).dataset.dicname;
                browser.storage.local.set({"main_dic_name": sMainDicName});
                browser.runtime.sendMessage({
                    sCommand: "setDictionary",
                    oParam: { sDictionary: "main", oDict: sMainDicName },
                    oInfo: { sExtPath: browser.runtime.getURL("") }
                });
            }
            // UI options
            else if (xElem.id.startsWith("ui_option_")) {
                storeUIOptions();
            }
            //
            else if (xElem.id.startsWith("link_")) {
                browser.tabs.create({url: xElem.dataset.url});
            }
            else if (xElem.id == "conj_button") {
                browser.runtime.sendMessage({
                    sCommand: "openConjugueurTab",
                    oParam: {},
                    oInfo: {}
                });
            }
            else if (xElem.id == "dictionaries_button") {
                browser.runtime.sendMessage({
                    sCommand: "openDictionaries",
                    oParam: {},
                    oInfo: {}
                });
            }
            else if (xElem.id == "dic_community_button") {
                browser.runtime.sendMessage({
                    sCommand: "openLexiconEditor",
                    oParam: { "dictionary": "__community__"},
                    oInfo: {}
                });
            }
            else if (xElem.id == "dic_personal_button") {
                browser.runtime.sendMessage({
                    sCommand: "openLexiconEditor",
                    oParam: { "dictionary": "__personal__"},
                    oInfo: {}
                });
            }
        // change UI page
        } else if (xElem.className.startsWith("select")) {
            showPage(xElem.dataset.page);
        }/* else if (xElem.tagName === "A") {
            openURL(xElem.getAttribute("href"));
        }*/
    },
    false
);


/*
    Message sender
    and response handling
*/
function handleResponse (oResponse) {
    console.log(`[Panel] received:`);
    console.log(oResponse);
}

function handleError (error) {
    console.log(`[Panel] Error:`);
    console.log(error);
}

function sendMessageAndWaitResponse (oData) {
    let xPromise = browser.runtime.sendMessage(oData);
    xPromise.then(handleResponse, handleError);
}


/*
    Messages received
*/
function handleMessage (oMessage, xSender, sendResponse) {
    let {sActionDone, result, oInfo, bEnd, bError} = oMessage;
    switch(sActionDone) {
        case "textToTest":
        case "fullTests":
            showTestResult(result);
            break;
        case "resetOptions":
            displayGCOptions(result);
            break;
        default:
            console.log("GRAMMALECTE. Unknown command: " + sActionDone);
    }
    //sendResponse({sCommand: "none", result: "done"});
}

browser.runtime.onMessage.addListener(handleMessage);


/*
    Actions
*/

function showPage (sPageName) {
    try {
        // hide them all
        for (let xNodePage of document.getElementsByClassName("page")) {
            xNodePage.style.display = "none";
        }
        // show the selected one
        document.getElementById(sPageName).style.display = "block";
        if (sPageName == "gc_options_page") {
            displayGCOptionsLoadedFromStorage();
        }
        else if (sPageName == "ui_options_page") {
            displayUIOptionsLoadedFromStorage();
        }
        else if (sPageName == "sc_options_page") {
            displaySCOptionsLoadedFromStorage();
        }
    }
    catch (e) {
        showError(e);
    }
}


function showTestResult (sText) {
    document.getElementById("tests_result").textContent = sText;
}


/*
    UI options
*/
function displayUIOptionsLoadedFromStorage () {
    if (bChrome) {
        browser.storage.local.get("ui_options", displayUIOptions);
        return;
    }
    let xPromise = browser.storage.local.get("ui_options");
    xPromise.then(displayUIOptions, showError);
}

function displayUIOptions (dOptions) {
    if (!dOptions.hasOwnProperty("ui_options")) {
        console.log("no ui options found");
        return;
    }
    dOptions = dOptions.ui_options;
    for (let sOpt in dOptions) {
        if (document.getElementById("ui_option_"+sOpt)) {
            document.getElementById("ui_option_"+sOpt).checked = dOptions[sOpt];
        }
    }
}

function storeUIOptions () {
    browser.storage.local.set({"ui_options": {
        textarea: document.getElementById("ui_option_textarea").checked,
        editablenode: document.getElementById("ui_option_editablenode").checked
    }});
}


/*
    SC Options
*/
function displaySCOptionsLoadedFromStorage () {
    if (bChrome) {
        browser.storage.local.get("sc_options", displaySCOptions);
        browser.storage.local.get("main_dic_name", displaySCOptions);
        return;
    }
    browser.storage.local.get("sc_options").then(displaySCOptions, showError);
    browser.storage.local.get("main_dic_name").then(displaySCOptions, showError);
}

function displaySCOptions (dOptions) {
    if (dOptions.hasOwnProperty("sc_options")) {
        document.getElementById("community_dic").checked = dOptions.sc_options.community;
        document.getElementById("personal_dic").checked = dOptions.sc_options.personal;
    }
    if (dOptions.hasOwnProperty("main_dic_name")) {
        switch (dOptions.main_dic_name) {
            case "fr-classic.json":  updateSpellingChoiceUI("spelling_classic"); break;
            case "fr-reform.json":  updateSpellingChoiceUI("spelling_reform"); break;
            case "fr-allvars.json":  updateSpellingChoiceUI("spelling_allvars"); break;
            default:
                console.log("Unknown dictionary name:", dOptions.main_dic_name);
        }
    }
}

function storeSCOptions () {
    browser.storage.local.set({"sc_options": {
        extended: false,
        community: document.getElementById("community_dic").checked,
        personal: document.getElementById("personal_dic").checked
    }});
}

function updateSpellingChoiceUI (sSpellingChoice) {
    document.getElementById("spelling_classic").className = (sSpellingChoice == "spelling_classic") ? "radiolike selected" : "radiolike";
    document.getElementById("spelling_reform").className = (sSpellingChoice == "spelling_reform") ? "radiolike selected" : "radiolike";
    document.getElementById("spelling_allvars").className = (sSpellingChoice == "spelling_allvars") ? "radiolike selected" : "radiolike";
}


/*
    GC options
*/
function displayGCOptionsLoadedFromStorage () {
    if (bChrome) {
        browser.storage.local.get("gc_options", _displayGCOptions);
        return;
    }
    let xPromise = browser.storage.local.get("gc_options");
    xPromise.then(_displayGCOptions, showError);
}

function _displayGCOptions (dSavedOptions) {
    if (dSavedOptions.hasOwnProperty("gc_options")) {
        displayGCOptions(dSavedOptions.gc_options);
    }
}

function displayGCOptions (oOptions) {
    try {
        for (let sParam in oOptions) {
            if (document.getElementById("option_"+sParam)) {
                document.getElementById("option_"+sParam).checked = oOptions[sParam];
            }
        }
    }
    catch (e) {
        showError(e);
        console.log(oOptions);
    }
}
