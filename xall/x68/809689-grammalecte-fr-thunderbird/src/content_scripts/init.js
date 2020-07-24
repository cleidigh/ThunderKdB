// Modify page

/* jshint esversion:6, -W097 */
/* jslint esversion:6 */
/* global GrammalectePanel, GrammalecteButton, GrammalecteTextFormatter, GrammalecteGrammarChecker, GrammalecteMessageBox, showError, MutationObserver, chrome, document, console */

/*
    JS sucks (again, and again, and again, and again…)
    Not possible to load content from within the extension:
    https://bugzilla.mozilla.org/show_bug.cgi?id=1267027
    No SharedWorker, no images allowed for now…
*/

"use strict";


function showError (e) {
    // console can’t display error objects from content scripts
    console.error(e.fileName + "\n" + e.name + "\nline: " + e.lineNumber + "\n" + e.message);
}

// Chrome don’t follow the W3C specification:
// https://browserext.github.io/browserext/
let bChrome = false;
let bThunderbird = false;
if (typeof(browser) !== "object") {
    var browser = chrome;
    bChrome = true;
}
if (typeof(messenger) === "object" || browser.hasOwnProperty("composeAction")) {
    // JS sucks again.
    // In Thunderbird, <browser> exists in content-scripts, but not <messenger>
    // <browner> has property <composeAction> but is undefined...
    bThunderbird = true;
    //console.log("[Grammalecte] Thunderbird...");
}

/*
function loadImage (sContainerClass, sImagePath) {
    let xRequest = new XMLHttpRequest();
    xRequest.open('GET', browser.runtime.getURL("")+sImagePath, false);
    xRequest.responseType = "arraybuffer";
    xRequest.send();
    let blobTxt = new Blob([xRequest.response], {type: 'image/png'});
    let img = document.createElement('img');
    img.src = (URL || webkitURL).createObjectURL(blobTxt); // webkitURL is obsolete: https://bugs.webkit.org/show_bug.cgi?id=167518
    Array.filter(document.getElementsByClassName(sContainerClass), function (oElem) {
        oElem.appendChild(img);
    });
}
*/


const oGrammalecte = {

    nButton: 0,
    lButton: [],

    oPanelButton: null,
    oTFPanel: null,
    oGCPanel: null,

    oMessageBox: null,

    xRightClickedNode: null,

    xObserver: null,

    sExtensionUrl: null,

    oOptions: null,

    bAutoRefresh: (bThunderbird) ? false : true,

    listen: function () {
        document.addEventListener("click", (xEvent) => {
            //console.log("click", xEvent.target.id);
            this.oPanelButton.examineNode(xEvent.target);
        });
        document.addEventListener("keyup", (xEvent) => {
            //console.log("keyup", document.activeElement.id);
            this.oPanelButton.examineNode(document.activeElement);
        });
        // Node where a right click is done
        // Bug report: https://bugzilla.mozilla.org/show_bug.cgi?id=1325814
        document.addEventListener('contextmenu', (xEvent) => {
            this.xRightClickedNode = xEvent.target;
        }, true);
    },

    clearRightClickedNode: function () {
        this.xRightClickedNode = null;
    },

    createButton: function () {
        if (this.oPanelButton === null) {
            this.oPanelButton = new GrammalecteButton();
            this.oPanelButton.insertIntoPage();
        }
    },

    createTFPanel: function () {
        if (this.oTFPanel === null) {
            this.oTFPanel = new GrammalecteTextFormatter("grammalecte_tf_panel", "Formateur de texte", 760, 595, false);
            this.oTFPanel.insertIntoPage();
        }
    },

    createGCPanel: function () {
        if (this.oGCPanel === null) {
            this.oGCPanel = new GrammalecteGrammarChecker("grammalecte_gc_panel", "Grammalecte", 540, 950);
            this.oGCPanel.insertIntoPage();
        }
    },

    createMessageBox: function () {
        if (this.oMessageBox === null) {
            this.oMessageBox = new GrammalecteMessageBox("grammalecte_message_box", "Grammalecte");
            this.oMessageBox.insertIntoPage();
        }
    },

    startGCPanel: function (what, xResultNode=null) {
        this.createGCPanel();
        this.oGCPanel.clear();
        this.oGCPanel.show();
        this.oGCPanel.showEditor();
        this.oGCPanel.start(what, xResultNode);
        this.oGCPanel.startWaitIcon();
        let sText = this.oGCPanel.oTextControl.getText();
        if (bThunderbird && sText.trim() === "") {
            oGrammalecte.oGCPanel.clear();
            oGrammalecte.showMessage("❓ Le message ne semble contenir aucune réponse. Si vous écrivez votre réponse avant le message auquel vous répondez, celle-ci ne peut être vue de Grammalecte que si vous avez réglé votre compte pour répondre au-dessus du message cité.\n➜ Pour modifier ce réglage, allez dans vos paramètres de compte et, dans la section [Rédaction et adressage], sélectionnez [La réponse commence avant la citation].\n❗ Si vous ne modifiez pas ce réglage, seul le texte écrit après les passages cités sera vu et analysé par Grammalecte.");
        }
        oGrammalecteBackgroundPort.parseAndSpellcheck(sText, "__GrammalectePanel__");
    },

    showMessage: function (sMessage) {
        this.createMessageBox();
        this.oMessageBox.show();
        this.oMessageBox.setMessage(sMessage);
    },

    getPageText: function () {
        let sPageText = document.body.innerText;
        let nPos = sPageText.indexOf("__grammalecte_panel__");
        if (nPos >= 0) {
            sPageText = sPageText.slice(0, nPos).normalize("NFC");
        }
        return sPageText;
    },

    purgeText: function (sText) {
        return sText.replace(/&nbsp;/g, " ").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
    },

    createNode: function (sType, oAttr, oDataset=null) {
        try {
            let xNode = document.createElement(sType);
            Object.assign(xNode, oAttr);
            if (oDataset) {
                Object.assign(xNode.dataset, oDataset);
            }
            return xNode;
        }
        catch (e) {
            showError(e);
        }
    },

    createStyle: function (sLinkCss, sLinkId=null, xNodeToAppendTo=null) {
        try {
            let xNode = document.createElement("link");
            Object.assign(xNode, {
                rel: "stylesheet",
                type: "text/css",
                media: "all",
                href: this.sExtensionUrl + sLinkCss
            });
            if (sLinkId) {
                Object.assign(xNode, {id: sLinkId});
            }
            if (xNodeToAppendTo) {
                xNodeToAppendTo.appendChild(xNode);
            }
            return xNode;
        }
        catch (e) {
            showError(e);
        }
    },

    findOriginEditableNode: function (xNode) {
        if (!xNode) {
            return null;
        }
        if (xNode.tagName == "TEXTAREA" || xNode.tagName == "INPUT" || xNode.tagName == "IFRAME") {
            return xNode;
        }
        const findNode = function (xNode) {
            return (!xNode.parentNode.isContentEditable) ? xNode : findNode(xNode.parentNode);
        }
        return findNode(xNode);
    },

    getCaretPosition: function (xElement) {
        // JS awfulness again.
        // recepie from https://stackoverflow.com/questions/4811822/get-a-ranges-start-and-end-offsets-relative-to-its-parent-container
        let nCaretOffsetStart = 0;
        let nCaretOffsetEnd = 0;
        let xSelection = window.getSelection();
        if (xSelection.rangeCount > 0) {
            let xRange = xSelection.getRangeAt(0);
            let xPreCaretRange = xRange.cloneRange();
            xPreCaretRange.selectNodeContents(xElement);
            xPreCaretRange.setEnd(xRange.endContainer, xRange.endOffset);
            nCaretOffsetStart = xPreCaretRange.toString().length;
            nCaretOffsetEnd = nCaretOffsetStart + xRange.toString().length;
        }
        return [nCaretOffsetStart, nCaretOffsetEnd];
        // for later: solution with multilines text
        // https://stackoverflow.com/questions/4811822/get-a-ranges-start-and-end-offsets-relative-to-its-parent-container/4812022
    },

    setCaretPosition: function (xElement, nCaretOffsetStart, nCaretOffsetEnd) {
        // JS awfulness again.
        // recipie from https://stackoverflow.com/questions/6249095/how-to-set-caretcursor-position-in-contenteditable-element-div
        let iChar = 0;
        let xRange = document.createRange();
        xRange.setStart(xElement, 0);
        xRange.collapse(true);

        let lNode = [xElement];
        let xNode;
        let bFoundStart = false;
        let bStop = false;
        while (!bStop && (xNode = lNode.pop())) {
            if (xNode.nodeType == 3) { // Node.TEXT_NODE
                let iNextChar = iChar + xNode.length;
                if (!bFoundStart && nCaretOffsetStart >= iChar && nCaretOffsetStart <= iNextChar) {
                    xRange.setStart(xNode, nCaretOffsetStart - iChar);
                    bFoundStart = true;
                }
                if (bFoundStart && nCaretOffsetEnd >= iChar && nCaretOffsetEnd <= iNextChar) {
                    xRange.setEnd(xNode, nCaretOffsetEnd - iChar);
                    bStop = true;
                }
                iChar = iNextChar;
            } else {
                let i = xNode.childNodes.length;
                while (i--) {
                    lNode.push(xNode.childNodes[i]);
                }
            }
        }
        let xSelection = window.getSelection();
        xSelection.removeAllRanges();
        xSelection.addRange(xRange);
    },

    getElementCoord: function (xElem) {
        // https://stackoverflow.com/questions/5598743/finding-elements-position-relative-to-the-document
        let xBox = xElem.getBoundingClientRect();
        let scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
        let scrollLeft = document.documentElement.scrollLeft || document.body.scrollLeft;
        let clientTop = document.documentElement.clientTop || document.body.clientTop || 0;
        let clientLeft = document.documentElement.clientLeft || document.body.clientLeft || 0;
        let top  = xBox.top + scrollTop - clientTop;
        let left = xBox.left + scrollLeft - clientLeft;
        let bottom = xBox.bottom + scrollTop - clientTop;
        let right = xBox.right + scrollLeft - clientLeft;
        return { top: Math.round(top), left: Math.round(left), bottom: Math.round(bottom), right: Math.round(right) };
    }
};


function autoRefreshOption (oSavedOptions=null) {
    // auto recallable function
    if (bThunderbird) {
        return;
    }
    if (oSavedOptions === null) {
        if (bChrome) {
            browser.storage.local.get("autorefresh_option", autoRefreshOption);
            return;
        }
        browser.storage.local.get("autorefresh_option").then(autoRefreshOption, showError);
    }
    else if (oSavedOptions.hasOwnProperty("autorefresh_option")) {
        oGrammalecte.bAutoRefresh = oSavedOptions["autorefresh_option"];
    }
}

autoRefreshOption();


/*
    Connexion to the background
*/
const oGrammalecteBackgroundPort = {

    bConnected: false,

    xConnect: browser.runtime.connect({name: "content-script port"}),

    start: function () {
        console.log("[Grammalecte] background port: start.");
        this.listen();
        this.listen2();
        //this.ping();
    },

    restart: function () {
        console.log("[Grammalecte] try to reconnect to the background.")
        this.xConnect = browser.runtime.connect({name: "content-script port"});
        this.listen();
        this.ping();
    },

    /*
        Send messages to the background
        object {
            sCommand: the action to perform
            oParam: parameters necessary for the execution of the action
            oInfo: all kind of informations that needs to be sent back (usually to know where to use the result)
        }
    */

    send: function (sCommand, oParam={}, oInfo={}) {
        if (this.bConnected) {
            this.xConnect.postMessage({ sCommand: sCommand, oParam: oParam, oInfo: oInfo });
        } else {
            oGrammalecte.showMessage("Erreur. La connexion vers le correcteur grammatical est perdue.",
                                     "Tentative de reconnexion. Fermer la fenêtre et relancez. Si ça ne fonctionne pas, il sera nécessaire de recharger la page.");
            this.restart();
        }
    },

    ping: function () {
        this.xConnect.postMessage({ sCommand: "ping", oParam: {}, oInfo: {} });
    },

    parseAndSpellcheck: function (sText, sDestination) {
        this.send("parseAndSpellcheck", { sText: sText, sCountry: "FR", bDebug: false, bContext: false }, { sDestination: sDestination });
    },

    parseAndSpellcheck1: function (sText, sDestination, sParagraphId) {
        this.send("parseAndSpellcheck1", { sText: sText, sCountry: "FR", bDebug: false, bContext: false }, { sDestination: sDestination, sParagraphId: sParagraphId });
    },

    getListOfTokens: function (sText) {
        this.send("getListOfTokens", { sText: sText }, {});
    },

    parseFull: function (sText) {
        this.send("parseFull", { sText: sText, sCountry: "FR", bDebug: false, bContext: false }, {});
    },

    getVerb: function (sVerb, bStart=true, bPro=false, bNeg=false, bTpsCo=false, bInt=false, bFem=false) {
        this.send("getVerb", { sVerb: sVerb, bPro: bPro, bNeg: bNeg, bTpsCo: bTpsCo, bInt: bInt, bFem: bFem }, { bStart: bStart });
    },

    getSpellSuggestions: function (sWord, sDestination, sErrorId) {
        this.send("getSpellSuggestions", { sWord: sWord }, { sDestination: sDestination, sErrorId: sErrorId });
    },

    openURL: function (sURL) {
        this.send("openURL", { "sURL": sURL });
    },

    openLexiconEditor: function () {
        this.send("openLexiconEditor");
    },

    restartWorker: function (nTimeDelay=10) {
        this.send("restartWorker", { "nTimeDelay": nTimeDelay });
    },

    /*
        Messages from the background
    */
    listen: function () {
        this.xConnect.onDisconnect.addListener(function (xPort) {
            let sError = "";
            if (xPort.error) {
                sError = xPort.error.message;
            }
            else if (browser.runtime.lastError) {
                sError = browser.runtime.lastError.message;
            }
            console.log("[Grammalecte] Connection to the background script has been lost. Error :", sError);
            this.bConnected = false;
            this.restart();
        }.bind(this));
        this.xConnect.onMessage.addListener(function (oMessage) {
            let { sActionDone, result, oInfo, bEnd, bError } = oMessage;
            switch (sActionDone) {
                case "init":
                    //console.log("[Grammalecte] content-script: init");
                    this.bConnected = true;
                    oGrammalecte.sExtensionUrl = oMessage.sUrl;
                    oGrammalecte.listen();
                    oGrammalecte.createButton();
                    break;
                case "ping":
                    console.log("[Grammalecte] Connection to background done.");
                    this.bConnected = true;
                    break;
                case "parseAndSpellcheck":
                    if (oInfo.sDestination == "__GrammalectePanel__") {
                        if (!bEnd) {
                            oGrammalecte.oGCPanel.addParagraphResult(result);
                        } else {
                            oGrammalecte.oGCPanel.stopWaitIcon();
                            oGrammalecte.oGCPanel.endTimer();
                        }
                    }
                    else if (oInfo.sDestination  &&  document.getElementById(oInfo.sDestination)) {
                        const xEvent = new CustomEvent("GrammalecteResult", { detail: JSON.stringify({ sType: "proofreading", oResult: result, oInfo: oInfo }) });
                        document.getElementById(oInfo.sDestination).dispatchEvent(xEvent);
                    }
                    break;
                case "parseAndSpellcheck1":
                    if (oInfo.sDestination == "__GrammalectePanel__") {
                        oGrammalecte.oGCPanel.refreshParagraph(oInfo.sParagraphId, result);
                    }
                    break;
                case "parseFull":
                    // TODO
                    break;
                case "getListOfTokens":
                    if (!bEnd) {
                        oGrammalecte.oGCPanel.addListOfTokens(result);
                    } else {
                        oGrammalecte.oGCPanel.stopWaitIcon();
                        oGrammalecte.oGCPanel.endTimer();
                    }
                    break;
                case "getSpellSuggestions":
                    if (oInfo.sDestination == "__GrammalectePanel__") {
                        oGrammalecte.oGCPanel.oTooltip.setSpellSuggestionsFor(result.sWord, result.aSugg, result.iSuggBlock, oInfo.sErrorId);
                    }
                    else if (oInfo.sDestination  &&  document.getElementById(oInfo.sDestination)) {
                        const xEvent = new CustomEvent("GrammalecteResult", { detail: JSON.stringify({ sType: "spellsugg", oResult: result, oInfo: oInfo }) });
                        document.getElementById(oInfo.sDestination).dispatchEvent(xEvent);
                    }
                    break;
                case "getVerb":
                    if (oInfo.bStart) {
                        oGrammalecte.oGCPanel.conjugateWith(result.oVerb, result.oConjTable);
                    } else {
                        oGrammalecte.oGCPanel.displayConj(result.oConjTable);
                    }
                    break;
                case "workerRestarted":
                    oGrammalecte.oGCPanel.stopWaitIcon();
                    oGrammalecte.oGCPanel.showMessage("Le serveur grammatical a été arrêté et relancé.");
                    oGrammalecte.oGCPanel.endTimer();
                    break;
                /*
                    Commands received from the context menu
                    (Context menu are initialized in background)
                */
                // Grammar checker commands
                case "grammar_checker_editable":
                    if (oGrammalecte.xRightClickedNode !== null) {
                        let xNode = oGrammalecte.findOriginEditableNode(oGrammalecte.xRightClickedNode);
                        oGrammalecte.startGCPanel(xNode);
                    } else {
                        oGrammalecte.showMessage("Erreur. Le node sur lequel vous avez cliqué n’a pas pu être identifié. Sélectionnez le texte à corriger et relancez le correcteur via le menu contextuel.");
                    }
                    break;
                case "grammar_checker_page":
                    oGrammalecte.startGCPanel(oGrammalecte.getPageText());
                    break;
                case "grammar_checker_selection":
                    oGrammalecte.startGCPanel(result); // result is the selected text
                    break;
                case "grammar_checker_iframe":
                    console.log("[Grammalecte] selected iframe: ", result);
                    if (document.activeElement.tagName == "IFRAME") {
                        //console.log(document.activeElement.id); frameId given by result is different than frame.id
                        oGrammalecte.startGCPanel(document.activeElement);
                    } else {
                        oGrammalecte.showMessage("Erreur. Le cadre sur lequel vous avez cliqué n’a pas pu être identifié. Sélectionnez le texte à corriger et relancez le correcteur via le menu contextuel.");
                    }
                    break;
                /*
                    composeAction
                    (Thunderbird only)
                */
                case "grammar_checker_compose_window":
                    oGrammalecte.startGCPanel("__ThunderbirdComposeWindow__");
                    break;
                default:
                    console.log("[Grammalecte] Content-script. Unknown command: ", sActionDone);
            }
        }.bind(this));
    },

    /*
        Other messages from background
    */
    listen2: function () {
        browser.runtime.onMessage.addListener(function (oMessage) {
            let {sActionRequest} = oMessage;
            let xActiveNode = oGrammalecte.findOriginEditableNode(document.activeElement);
            switch (sActionRequest) {
                /*
                    Commands received from the keyboard (shortcuts)
                */
                case "shortcutGrammarChecker":
                    if (xActiveNode && (xActiveNode.tagName == "TEXTAREA" || xActiveNode.tagName == "INPUT" || xActiveNode.isContentEditable)) {
                        oGrammalecte.startGCPanel(xActiveNode);
                    } else {
                        oGrammalecte.startGCPanel(oGrammalecte.getPageText());
                    }
                    break;
                default:
                    console.log("[Grammalecte] Content-script. Unknown command: ", sActionRequest);
            }
        });
    }
}


oGrammalecteBackgroundPort.start();



/*
    Callable API for the webpage.
    (Not for Thunderbird)
*/
if (!bThunderbird) {
    document.addEventListener("GrammalecteCall", function (xEvent) {
        // GrammalecteCall events are dispatched by functions in the API script
        // The script is loaded below.
        try {
            let oCommand = JSON.parse(xEvent.detail);
            switch (oCommand.sCommand) {
                case "openPanelForNode":
                    if (oCommand.sNodeId && document.getElementById(oCommand.sNodeId)) {
                        oGrammalecte.startGCPanel(document.getElementById(oCommand.sNodeId));
                    }
                    break;
                case "openPanelForText":
                    if (oCommand.sText) {
                        if (oCommand.sText && oCommand.sNodeId && document.getElementById(oCommand.sNodeId)) {
                            oGrammalecte.startGCPanel(oCommand.sText, document.getElementById(oCommand.sNodeId));
                        }
                        else {
                            oGrammalecte.startGCPanel(oCommand.sText);
                        }
                    }
                    break;
                case "parseNode":
                    if (oCommand.sNodeId && document.getElementById(oCommand.sNodeId)) {
                        let xNode = document.getElementById(oCommand.sNodeId);
                        if (xNode.tagName == "TEXTAREA"  ||  xNode.tagName == "INPUT") {
                            oGrammalecteBackgroundPort.parseAndSpellcheck(xNode.value, oCommand.sNodeId);
                        }
                        else if (xNode.tagName == "IFRAME") {
                            oGrammalecteBackgroundPort.parseAndSpellcheck(xNode.contentWindow.document.body.innerText, oCommand.sNodeId);
                        }
                        else {
                            oGrammalecteBackgroundPort.parseAndSpellcheck(xNode.innerText, oCommand.sNodeId);
                        }
                    }
                    break;
                case "parseText":
                    if (oCommand.sText && oCommand.sNodeId) {
                        oGrammalecteBackgroundPort.parseAndSpellcheck(oCommand.sText, oCommand.sNodeId);
                    }
                    break;
                case "getSpellSuggestions":
                    if (oCommand.sWord && oCommand.sDestination) {
                        oGrammalecteBackgroundPort.getSpellSuggestions(oCommand.sWord, oCommand.sDestination, oCommand.sErrorId);
                    }
                    break;
                default:
                    console.log("[Grammalecte] Event: Unknown command", oCommand.sCommand);
            }
        }
        catch (e) {
            showError(e);
        }
    });

    // The API script must be injected this way to be callable by the page.
    // Note: Firefox offers another way to give access to webpage, via “user scripts”
    //       https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons/WebExtensions/API/userScripts
    //       (Firefox only feature for now)
    let xScriptGrammalecteAPI = document.createElement("script");
    xScriptGrammalecteAPI.src = browser.runtime.getURL("content_scripts/api.js");
    document.documentElement.appendChild(xScriptGrammalecteAPI);
}


/*
    Note:
    Initialization starts when the background is connected.
    See: oGrammalecteBackgroundPort.listen() -> case "init"
*/
