// JavaScript

"use strict";

// Chrome don’t follow the W3C specification:
// https://browserext.github.io/browserext/
let bChrome = false;
if (typeof(browser) !== "object") {
    var browser = chrome;
    bChrome = true;
}


/*
    Common functions
*/

function showError (e) {
    console.error(e.fileName + "\n" + e.name + "\nline: " + e.lineNumber + "\n" + e.message);
}

function createNode (sType, oAttr, oDataset=null) {
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
}

function showElement (sElemId, sDisplay="block") {
    if (document.getElementById(sElemId)) {
        document.getElementById(sElemId).style.display = sDisplay;
    } else {
        console.log("HTML node named <" + sElemId + "> not found.")
    }
}

function hideElement (sElemId) {
    if (document.getElementById(sElemId)) {
        document.getElementById(sElemId).style.display = "none";
    } else {
        console.log("HTML node named <" + sElemId + "> not found.")
    }
}

function switchDisplay (sElemId, sDisplay="block") {
    if (document.getElementById(sElemId)) {
        if (document.getElementById(sElemId).style.display != "none") {
            document.getElementById(sElemId).style.display = "none";
        } else {
            document.getElementById(sElemId).style.display = sDisplay;
        }
    }
}

function showMessage (sMessage) {
    console.log(sMessage);
}


const oTabulations = {

    lPage: ["lexicon_page", "add_page", "search_page", "info_page"],

    showPage: function (sRequestedPage) {
        for (let sPage of this.lPage) {
            if (sPage !== sRequestedPage) {
                hideElement(sPage);
                this.downlightButton(sPage.slice(0,-5) + "_button");
            }
        }
        showElement(sRequestedPage);
        this.highlightButton(sRequestedPage.slice(0,-5) + "_button");
        if (sRequestedPage == "add_page") {
            document.getElementById("lemma").focus();
        }
    },

    highlightButton: function (sButton) {
        if (document.getElementById(sButton)) {
            let xButton = document.getElementById(sButton);
            xButton.style.backgroundColor = "hsl(210, 80%, 90%)";
            xButton.style.color = "hsl(210, 80%, 30%)";
            xButton.style.fontWeight = "bold";
        }
    },

    downlightButton: function (sButton) {
        if (document.getElementById(sButton)) {
            let xButton = document.getElementById(sButton);
            xButton.style.backgroundColor = "hsl(210, 10%, 95%)";
            xButton.style.color = "hsl(210, 10%, 50%)";
            xButton.style.fontWeight = "normal";
        }
    },

    listen: function () {
        document.getElementById("lexicon_button").addEventListener("click", () => { this.showPage("lexicon_page"); }, false);
        document.getElementById("add_button").addEventListener("click", () => { this.showPage("add_page"); }, false);
        document.getElementById("search_button").addEventListener("click", () => { this.showPage("search_page"); }, false);
        document.getElementById("info_button").addEventListener("click", () => { this.showPage("info_page"); }, false);
    }
}


class Table {

    constructor (sNodeId, lColumn, sProgressBarId, sResultId="", bDeleteButtons=true) {
        this.sNodeId = sNodeId;
        this.xTable = document.getElementById(sNodeId);
        this.nColumn = lColumn.length;
        this.lColumn = lColumn;
        this.xProgressBar = document.getElementById(sProgressBarId);
        this.xNumEntry = (sResultId) ? document.getElementById(sResultId) : null;
        this.iEntryIndex = 0;
        this.lEntry = [];
        this.nEntry = 0;
        this.bDeleteButtons = bDeleteButtons;
        this._createHeader();
        this.listen();
    }

    _createHeader () {
        let xRowNode = createNode("tr");
        if (this.bDeleteButtons) {
            xRowNode.appendChild(createNode("th", { textContent: "·", width: "12px" }));
        }
        for (let sColumn of this.lColumn) {
            xRowNode.appendChild(createNode("th", { textContent: sColumn }));
        }
        this.xTable.appendChild(xRowNode);
    }

    clear () {
        while (this.xTable.firstChild) {
            this.xTable.removeChild(this.xTable.firstChild);
        }
        this.lEntry = [];
        this.nEntry = 0;
        this.iEntryIndex = 0;
        this._createHeader();
        this.showEntryNumber();
    }

    fill (lFlex) {
        this.clear();
        if (lFlex.length > 0) {
            this.xProgressBar.max = lFlex.length;
            this.xProgressBar.value = 1;
            for (let lData of lFlex) {
                this._addRow(lData);
                this.xProgressBar.value += 1;
            }
            this.xProgressBar.value = this.xProgressBar.max;
        }
        this.lEntry = lFlex;
        this.nEntry = lFlex.length;
        this.showEntryNumber();
    }

    addEntries (lFlex) {
        this.lEntry.push(...lFlex);
        for (let lData of lFlex) {
            this._addRow(lData);
        }
        this.nEntry += lFlex.length;
        this.showEntryNumber();
    }

    showEntryNumber () {
        if (this.xNumEntry) {
            this.xNumEntry.textContent = this.nEntry.toString() + ((this.nEntry > 1) ? " entrées" : " entrée");
        }
    }

    _addRow (lData) {
        let xRowNode = createNode("tr", { id: this.sNodeId + "_row_" + this.iEntryIndex });
        if (this.bDeleteButtons) {
            xRowNode.appendChild(createNode("td", { textContent: "×", className: "delete_entry", title: "Effacer cette entrée" }, { id_entry: this.iEntryIndex }));
        }
        for (let data of lData) {
            xRowNode.appendChild(createNode("td", { textContent: data }));
        }
        this.xTable.appendChild(xRowNode);
        this.iEntryIndex += 1;
    }

    listen () {
        if (this.bDeleteButtons) {
            this.xTable.addEventListener("click", (xEvent) => { this.onTableClick(xEvent); }, false);
        }
    }

    onTableClick (xEvent) {
        try {
            let xElem = xEvent.target;
            if (xElem.className) {
                if (xElem.className == "delete_entry") {
                    this.deleteRow(xElem.dataset.id_entry);
                }
            }
        }
        catch (e) {
            showError(e);
        }
    }

    deleteRow (iEntry) {
        this.lEntry[parseInt(iEntry)] = null;
        if (document.getElementById(this.sNodeId + "_row_" + iEntry)) {
            document.getElementById(this.sNodeId + "_row_" + iEntry).style.display = "none";
        }
        this.nEntry -= 1;
        this.showEntryNumber();
        if (this.sNodeId == "lexicon_table") {
            showElement("save_button", "inline-block");
        }
    }

    getEntries () {
        return this.lEntry.filter((e) => e !== null);
    }
}


const oGenerator = {

    sLemma: "",

    cMainTag: "",

    lFlexion: [],

    listen: function () {
        document.getElementById("editor").addEventListener("click", (xEvent) => { this.onSelectionClick(xEvent); }, false);
        document.getElementById("lemma").addEventListener("keyup", () => { this.onWrite(); }, false);
        document.getElementById("lemma2").addEventListener("keyup", () => { this.onWrite2(); }, false);
        document.getElementById("verb_pattern").addEventListener("keyup", () => { this.update(); }, false);
        document.getElementById("flexion").addEventListener("keyup", () => { this.update(); }, false);
        document.getElementById("tags").addEventListener("keyup", () => { this.update(); }, false);
        document.getElementById("add_to_lexicon").addEventListener("click", () => { this.addToLexicon(); }, false);
    },

    lSection: ["nom", "verbe", "adverbe", "nom_propre", "autre"],

    hideAllSections: function () {
        for (let sSection of this.lSection) {
            hideElement("section_" + sSection);
            document.getElementById("select_" + sSection).style.backgroundColor = "";
        }
    },

    showSection: function (sName) {
        this.clear();
        this.hideAllSections();
        if (document.getElementById(sName).style.display == "none") {
            showElement(sName);
        } else {
            hideElement(sName);
        }
    },

    clear: function () {
        try {
            document.getElementById("lemma2").value = "";
            hideElement("word_section2");
            // nom, adjectif, noms propres
            for (let xElem of document.getElementsByName("POS")) {
                xElem.checked = false;
            }
            for (let xElem of document.getElementsByName("POS2")) {
                xElem.checked = false;
            }
            for (let xElem of document.getElementsByName("pluriel")) {
                xElem.checked = false;
            }
            for (let xElem of document.getElementsByName("genre")) {
                xElem.checked = false;
            }
            for (let xElem of document.getElementsByName("pluriel2")) {
                xElem.checked = false;
            }
            for (let xElem of document.getElementsByName("genre2")) {
                xElem.checked = false;
            }
            // verbe
            document.getElementById("up_v_i").checked = false;
            document.getElementById("up_v_t").checked = false;
            document.getElementById("up_v_n").checked = false;
            document.getElementById("up_v_p").checked = false;
            document.getElementById("up_v_m").checked = false;
            document.getElementById("up_v_ae").checked = false;
            document.getElementById("up_v_aa").checked = false;
            document.getElementById("verb_pattern").value = "";
            // autre
            document.getElementById("flexion").value = "";
            document.getElementById("tags").value = "";
        }
        catch (e) {
            showError(e);
        }
    },

    onSelectionClick: function (xEvent) {
        try {
            let xElem = xEvent.target;
            if (xElem.id) {
                if (xElem.id.startsWith("select_")) {
                    this.showSection("section_" + xElem.id.slice(7));
                    xElem.style.backgroundColor = "hsl(210, 50%, 90%)";
                    this.cMainTag = xElem.dataset.tag;
                    this.update();
                } else if (xElem.id.startsWith("up_")) {
                    this.update();
                }
            }
        }
        catch (e) {
            showError(e);
        }
    },

    newEntry: function (sWord) {
        if (typeof(sWord) !== "string" || !sWord) {
            return;
        }
        oTabulations.showPage("add_page");
        document.getElementById("lemma").value = sWord;
        this.onWrite();
    },

    onWrite: function () {
        if (document.getElementById("lemma").value.trim() !== "") {
            showElement("editor");
            this.update();
        } else {
            hideElement("editor");
        }
    },

    onWrite2: function () {
        if (document.getElementById("lemma2").value.trim() !== "") {
            showElement("word_section2");
            this.update();
        } else {
            hideElement("word_section2");
        }
    },

    update: function () {
        try {
            this.lFlexion = [];
            this.sLemma = document.getElementById("lemma").value.trim();
            if (this.sLemma.length > 0) {
                switch (this.cMainTag) {
                    case "N":
                        if (!this.getRadioValue("POS") || !this.getRadioValue("genre")) {
                            break;
                        }
                        let sTag = this.getRadioValue("POS") + this.getRadioValue("genre");
                        switch (this.getRadioValue("pluriel")) {
                            case "s":
                                this.lFlexion.push([this.sLemma, sTag+":s/*"]);
                                this.lFlexion.push([this.sLemma+"s", sTag+":p/*"]);
                                break;
                            case "x":
                                this.lFlexion.push([this.sLemma, sTag+":s/*"]);
                                this.lFlexion.push([this.sLemma+"x", sTag+":p/*"]);
                                break;
                            case "i":
                                this.lFlexion.push([this.sLemma, sTag+":i/*"]);
                                break;
                        }
                        let sLemma2 = document.getElementById("lemma2").value.trim();
                        if (sLemma2.length > 0  &&  this.getRadioValue("POS2")  &&  this.getRadioValue("genre2")) {
                            let sTag2 = this.getRadioValue("POS2") + this.getRadioValue("genre2");
                            switch (this.getRadioValue("pluriel2")) {
                                case "s":
                                    this.lFlexion.push([sLemma2, sTag2+":s/*"]);
                                    this.lFlexion.push([sLemma2+"s", sTag2+":p/*"]);
                                    break;
                                case "x":
                                    this.lFlexion.push([sLemma2, sTag2+":s/*"]);
                                    this.lFlexion.push([sLemma2+"x", sTag2+":p/*"]);
                                    break;
                                case "i":
                                    this.lFlexion.push([sLemma2, sTag2+":i/*"]);
                                    break;
                            }
                        }
                        break;
                    case "V": {
                        if (!this.sLemma.endsWith("er") && !this.sLemma.endsWith("ir") && !this.sLemma.endsWith("re")) {
                            break;
                        }
                        this.sLemma = this.sLemma.toLowerCase();
                        let cGroup = "";
                        let c_i = (document.getElementById("up_v_i").checked) ? "i" : "_";
                        let c_t = (document.getElementById("up_v_t").checked) ? "t" : "_";
                        let c_n = (document.getElementById("up_v_n").checked) ? "n" : "_";
                        let c_p = (document.getElementById("up_v_p").checked) ? "p" : "_";
                        let c_m = (document.getElementById("up_v_m").checked) ? "m" : "_";
                        let c_ae = (document.getElementById("up_v_ae").checked) ? "e" : "_";
                        let c_aa = (document.getElementById("up_v_aa").checked) ? "a" : "_";
                        let sVerbTag = c_i + c_t + c_n + c_p + c_m + c_ae + c_aa;
                        if (sVerbTag.includes("p") && !sVerbTag.startsWith("___p_")) {
                            sVerbTag = sVerbTag.replace("p", "q");
                        }
                        if (!sVerbTag.endsWith("__") && !sVerbTag.startsWith("____")) {
                            let sVerbPattern = document.getElementById("verb_pattern").value.trim();
                            if (sVerbPattern.length == 0) {
                                // utilisation du générateur de conjugaison
                                let bVarPpas = !document.getElementById("up_v_ppas").checked;
                                for (let [sFlexion, sFlexTags] of conj_generator.conjugate(this.sLemma, sVerbTag, bVarPpas)) {
                                    this.lFlexion.push([sFlexion, sFlexTags]);
                                }
                            } else {
                                // copie du motif d’un autre verbe : utilisation du conjugueur
                                if (conj.isVerb(sVerbPattern)) {
                                    let oVerb = new Verb(this.sLemma, sVerbPattern);
                                    for (let [sTag1, dFlex] of oVerb.dConj.entries()) {
                                        if (sTag1 !== ":Q") {
                                            for (let [sTag2, sConj] of dFlex.entries()) {
                                                if (sTag2.startsWith(":") && sConj !== "") {
                                                    this.lFlexion.push([sConj, ":V" + oVerb.cGroup + "_" + sVerbTag + sTag1 + sTag2]);
                                                }
                                            }
                                        } else {
                                            // participes passés
                                            if (dFlex.get(":f:s") !== "") {
                                                if (dFlex.get(":m:p") !== "") {
                                                    this.lFlexion.push([dFlex.get(":m:s"), ":V" + oVerb.cGroup + "_" + sVerbTag + ":Q:A:m:s/*"]);
                                                    this.lFlexion.push([dFlex.get(":m:p"), ":V" + oVerb.cGroup + "_" + sVerbTag + ":Q:A:m:p/*"]);
                                                } else {
                                                    this.lFlexion.push([dFlex.get(":m:s"), ":V" + oVerb.cGroup + "_" + sVerbTag + ":Q:A:m:i/*"]);
                                                }
                                                this.lFlexion.push([dFlex.get(":f:s"), ":V" + oVerb.cGroup + "_" + sVerbTag + ":Q:A:f:s/*"]);
                                                this.lFlexion.push([dFlex.get(":f:p"), ":V" + oVerb.cGroup + "_" + sVerbTag + ":Q:A:f:p/*"]);
                                            } else {
                                                this.lFlexion.push([dFlex.get(":m:s"), ":V" + oVerb.cGroup + "_" + sVerbTag + ":Q:e:i/*"]);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        break;
                    }
                    case "W":
                        this.sLemma = this.sLemma.toLowerCase();
                        this.lFlexion.push([this.sLemma, ":W/*"]);
                        break;
                    case "M":
                        this.sLemma = this.sLemma.slice(0,1).toUpperCase() + this.sLemma.slice(1);
                        let sPOSTag = this.getRadioValue("pos_nom_propre")
                        let sGenderTag = this.getRadioValue("genre_m");
                        if (sGenderTag) {
                            this.lFlexion.push([this.sLemma, sPOSTag+sGenderTag+":i/*"]);
                        }
                        break;
                    case "X":
                        let sFlexion = document.getElementById("flexion").value.trim();
                        let sTags = document.getElementById("tags").value.trim();
                        if (sFlexion.length > 0 && sTags.startsWith(":")) {
                            this.lFlexion.push([sFlexion, sTags]);
                        }
                        break;
                }
            }
            if (this.lFlexion.length > 0) {
                showElement("add_to_lexicon");
            } else {
                hideElement("add_to_lexicon");
            }
            oGenWordsTable.fill(this.lFlexion);
        }
        catch (e) {
            showError(e);
        }
    },

    getRadioValue: function (sName) {
        if (document.querySelector('input[name="' + sName + '"]:checked')) {
            return document.querySelector('input[name="' + sName + '"]:checked').value;
        }
        return null;
    },

    createFlexLemmaTagArray: function () {
        let lEntry = [];
        for (let [sFlex, sTags] of oGenWordsTable.getEntries()) {
            lEntry.push([sFlex, this.sLemma, sTags]);
        }
        return lEntry;
    },

    addToLexicon: function () {
        try {
            oLexiconTable.addEntries(this.createFlexLemmaTagArray());
            oGenWordsTable.clear();
            document.getElementById("lemma").value = "";
            document.getElementById("lemma").focus();
            this.hideAllSections();
            hideElement("editor");
            showElement("save_button", "inline-block");
            this.clear();
            this.cMainTag = "";
        }
        catch (e) {
            showError(e);
        }
    }
}


const oDictHandler = {
    oDictionaries: {},
    oPersonalDictionary: null,
    lCreatedDictionaries: [],
    xDicSelector: document.getElementById("dic_selector"),

    loadDictionaries: function () {
        if (bChrome) {
            browser.storage.local.get("shared_dictionaries", this._loadDictionaries.bind(this));
            browser.storage.local.get("personal_dictionary", this._loadDictionaries.bind(this));
            browser.storage.local.get("created_dictionaries_list", this._loadDictionaries.bind(this));
            return;
        }
        let xPromise = browser.storage.local.get("shared_dictionaries");
        xPromise.then(this._loadDictionaries.bind(this), showError);
        let xPromise2 = browser.storage.local.get("personal_dictionary");
        xPromise2.then(this._loadDictionaries.bind(this), showError);
        let xPromise3 = browser.storage.local.get("created_dictionaries_list");
        xPromise3.then(this._loadDictionaries.bind(this), showError);
    },

    _loadDictionaries: function (oResult) {
        if (oResult.hasOwnProperty("shared_dictionaries")) {
            this.oDictionaries = oResult.shared_dictionaries;
        }
        if (oResult.hasOwnProperty("personal_dictionary")) {
            this.oPersonalDictionary = oResult.personal_dictionary;
        }
        if (oResult.hasOwnProperty("created_dictionaries_list")) {
            this.lCreatedDictionaries = oResult.created_dictionaries_list;
            for (let sDicName of this.lCreatedDictionaries) {
                let xOption = createNode("option", {value: sDicName, textContent: sDicName});
                this.xDicSelector.appendChild(xOption);
            }
        }
        oBinaryDict.load("__personal__");
    },

    addDictionary: function (sDicName) {
        if (!this.oDictionaries.hasOwnProperty(sDicName)) {
            let xOption = createNode("option", {value: sDicName, textContent: sDicName});
            this.xDicSelector.appendChild(xOption);
            this.xDicSelector.selectedIndex = this.xDicSelector.options.length-1;
            this.lCreatedDictionaries.push(sDicName);
            browser.storage.local.set({ "created_dictionaries_list": this.lCreatedDictionaries });
        }
    },

    deleteDictionary: function (sDicName) {
        this.saveDictionary(sDicName, null);
        if (sDicName != "__personal__") {
            let iDict = this.lCreatedDictionaries.indexOf(sDicName);
            if (iDict > -1) {
                this.lCreatedDictionaries.splice(iDict, 1);
            }
            browser.storage.local.set({ "created_dictionaries_list": this.lCreatedDictionaries });
            for (let xNode of this.xDicSelector.childNodes) {
                if (xNode.value == sDicName) {
                    this.xDicSelector.removeChild(xNode);
                }
            }
            this.xDicSelector.selectedIndex = 0;
            oBinaryDict.load("__personal__");
        }
    },

    getDictionary: function (sName) {
        if (sName == "__personal__") {
            return this.oPersonalDictionary;
        }
        else if (this.oDictionaries  &&  this.oDictionaries.hasOwnProperty(sName)) {
            //console.log(this.oDictionaries[sName]);
            return this.oDictionaries[sName];
        }
        return null;
    },

    saveDictionary: function (sName, oJSON) {
        if (!sName) {
            console.log("Error: name of dictionary to save is empty.")
            return;
        }
        if (sName == "__personal__") {
            browser.runtime.sendMessage({ sCommand: "setDictionary", oParam: {sDictionary: "personal", oDict: oJSON}, oInfo: {} });
            browser.storage.local.set({ "personal_dictionary": oJSON });
        }
        else {
            this.oDictionaries[sName] = oJSON;
            if (oJSON === null) {
                delete this.oDictionaries[sName];
            }
            browser.storage.local.set({ "shared_dictionaries": this.oDictionaries });
            this.sendDictionaryOnline(oJSON);
        }
    },

    sendDictionaryOnline: function (oJSON) {
        let sJSON = "";
        try {
            sJSON = JSON.stringify(oJSON);
        }
        catch (e) {
            showError(e);
            return e.message;
        }
        console.log("Send online dictionary: " + oJSON.sDicName);
        fetch("http://localhost/receive/", {
            method: "POST", // *GET, POST, PUT, DELETE, etc.
            //mode: "cors", // no-cors, cors, *same-origin
            //cache: "no-cache", // *default, no-cache, reload, force-cache, only-if-cached
            credentials: "include", // include, *same-origin, omit
            headers: {
                "Content-Type": "application/json",  // text/plain, application/json
                "Content-Length": sJSON.length
            },
            redirect: "follow", // manual, *follow, error
            referrer: "no-referrer", // no-referrer, *client
            body: sJSON, // body data type must match "Content-Type" header
        })
        .then((response) => {
            if (response.ok) {
                for (let param in response) {
                    console.log(param, response[param]);
                }
                console.log(response);
                return response.json();
            } else {
                console.log("Error: dictionary not sent: " + oJSON.sDicName);
                return null;
            }
        })
        .then((response) => {
            if (response) {
                console.log(response);
            } else {
                //
            }
        })
        .catch((e) => {
            showError(e);
        });
    }
}


const oBinaryDict = {

    oIBDAWG: null,
    sName: "",
    sDescription: "",

    load: function (sName="__personal__") {
        console.log("lexicon editor, load: " + sName);
        this.sName = sName;
        let oJSON = oDictHandler.getDictionary(sName);
        if (oJSON) {
            this.parseDict(oJSON);
        } else {
            oLexiconTable.clear();
            this.setDictData(0, "[néant]");
            hideElement("save_button");
        }
    },

    newDictionary: function () {
        this.oIBDAWG = null;
        this.sName = document.getElementById("new_dictionary_name").value;
        this.sDescription = document.getElementById("new_dictionary_description").value;
        oDictHandler.addDictionary(this.sName);
        oLexiconTable.clear();
        this.setDictData(0, "[néant]");
        hideElement("save_button");
        document.getElementById("new_dictionary_name").value = "";
        document.getElementById("new_dictionary_description").value = "";
        hideElement("new_dictionary_section")
    },

    parseDict: function (oJSON) {
        try {
            this.oIBDAWG = new IBDAWG(oJSON);
        }
        catch (e) {
            console.error(e);
            this.setDictData(0, "#Erreur. Voir la console.");
            return;
        }
        let lEntry = [];
        for (let aRes of this.oIBDAWG.select()) {
            lEntry.push(aRes);
        }
        oLexiconTable.fill(lEntry);
        this.setDictData(this.oIBDAWG.nEntry, this.oIBDAWG.sDate);
        hideElement("save_button");
    },

    import: function () {
        let xInput = document.getElementById("import_input");
        let xFile = xInput.files[0];
        let xURL = URL.createObjectURL(xFile);
        let sJSON = helpers.loadFile(xURL);
        if (sJSON) {
            try {
                let oJSON = JSON.parse(sJSON);
                this.parseDict(oJSON);
                oDictHandler.saveDictionary(this.sName, oJSON);
            }
            catch (e) {
                console.error(e);
                this.setDictData(0, "#Erreur. Voir la console.");
                return;
            }
        } else {
            this.setDictData(0, "[néant]");
            oDictHandler.saveDictionary(this.sName, null);
        }
    },

    setDictData: function (nEntries, sDate) {
        document.getElementById("dic_num_entries").textContent = nEntries.toString() + ((this.nEntry > 1) ? " entrées" : " entrée");
        document.getElementById("dic_save_date").textContent = sDate;
        if (nEntries == 0) {
            hideElement("export_button");
        } else {
            showElement("export_button");
        }
    },

    listen: function () {
        document.getElementById("dic_selector").addEventListener("change", () => {this.load(document.getElementById("dic_selector").value)}, false);
        document.getElementById("save_button").addEventListener("click", () => { this.build(); }, false);
        document.getElementById("export_button").addEventListener("click", () => { this.export(); }, false);
        document.getElementById("import_input").addEventListener("change", () => { this.import(); }, false);
        //document.getElementById("new_dictionary_button").addEventListener("click", () => { switchDisplay("new_dictionary_section"); }, false);
        document.getElementById("delete_dictionary_button").addEventListener("click", () => { this.delete(); }, false);
        document.getElementById("create_dictionary_button").addEventListener("click", () => { this.newDictionary(); }, false);
    },

    build: function () {
        let xProgressNode = document.getElementById("wait_progress");
        let lEntry = oLexiconTable.getEntries();
        if (lEntry.length > 0) {
            let oDAWG = new DAWG(lEntry, "S", "fr", "Français", this.sName, this.sDescription, xProgressNode);
            let oJSON = oDAWG.createBinaryJSON();
            oDictHandler.saveDictionary(this.sName, oJSON);
            this.oIBDAWG = new IBDAWG(oJSON);
            this.setDictData(this.oIBDAWG.nEntry, this.oIBDAWG.sDate);
        } else {
            oDictHandler.saveDictionary(this.sName, null);
            this.setDictData(0, "[néant]");
        }
        hideElement("save_button");
    },

    delete: function () {
        if (confirm("Voulez-vous effacer le dictionnaire “"+this.sName+"” ?")) {
            oLexiconTable.clear();
            this.setDictData(0, "[néant]");
            oDictHandler.deleteDictionary(this.sName);
        }
    },

    export: function () {
        let xBlob = new Blob([ JSON.stringify(this.oIBDAWG.getJSON()) ], {type: 'application/json'});
        let sURL = URL.createObjectURL(xBlob);
        browser.downloads.download({ filename: "fr."+this.sName+".json", url: sURL, saveAs: true });
    }
}


const oSearch = {

    oSpellChecker: null,

    load: function () {
        this.oSpellChecker = new SpellChecker("fr", browser.runtime.getURL("")+"grammalecte/graphspell/_dictionaries", "fr-allvars.json");
    },

    loadOtherDictionaries: function () {
        //TODO
    },

    listen: function () {
        document.getElementById("search_similar_button").addEventListener("click", () => { this.searchSimilar(); }, false);
        document.getElementById("search_regex_button").addEventListener("click", () => { this.searchRegex() }, false);
    },

    searchSimilar: function () {
        oSearchTable.clear();
        let sWord = document.getElementById("search_similar").value;
        if (sWord !== "") {
            let lResult = this.oSpellChecker.getSimilarEntries(sWord, 20);
            oSearchTable.fill(lResult);
        }
    },

    searchRegex: function () {
        let sFlexPattern = document.getElementById("search_flexion_pattern").value.trim();
        let sTagsPattern = document.getElementById("search_tags_pattern").value.trim();
        let lEntry = [];
        let i = 0;
        for (let aRes of this.oSpellChecker.select(sFlexPattern, sTagsPattern)) {
            lEntry.push(aRes);
            i++;
            if (i >= 2000) {
                break;
            }
        }
        oSearchTable.fill(lEntry);
    }
}


const oTagsInfo = {
    load: function () {
        let lEntry = [];
        for (let [sTag, [_, sLabel]] of lexgraph_fr.dTag) {
            lEntry.push([sTag, sLabel.trim()]);
        }
        oTagsTable.fill(lEntry);
    }
}


const oGenWordsTable = new Table("generated_words_table", ["Flexions", "Étiquettes"], "wait_progress");
const oLexiconTable = new Table("lexicon_table", ["Flexions", "Lemmes", "Étiquettes"], "wait_progress", "num_entries");
const oSearchTable = new Table("search_table", ["Flexions", "Lemmes", "Étiquettes"], "wait_progress", "", false);
const oTagsTable = new Table("tags_table", ["Étiquette", "Signification"], "wait_progress", "", false);


oTagsInfo.load();
oSearch.load();
oDictHandler.loadDictionaries();
oBinaryDict.listen();
oGenerator.listen();
oTabulations.listen();
oSearch.listen();


/*
    Messages received
*/
function handleMessage (oMessage, xSender, sendResponse) {
    let {sActionRequest, oParam} = oMessage;
    switch(sActionRequest) {
        case "new_entry":
            oGenerator.newEntry(oParam.sWord);
            break;
        default:
            console.log("[Grammalecte] Lexicon editor. Unknown command: " + sActionRequest);
    }
    //sendResponse({sCommand: "none", result: "done"});
}

browser.runtime.onMessage.addListener(handleMessage);
