// JavaScript

"use strict";

const Cc = Components.classes;
const Ci = Components.interfaces;
const Cu = Components.utils;
const prefs = Cc["@mozilla.org/preferences-service;1"].getService(Ci.nsIPrefService).getBranch("extensions.grammarchecker.");


/*
    Common functions
*/

function showError (e) {
    Cu.reportError(e);
    console.error(e.fileName + "\n" + e.name + "\nline: " + e.lineNumber + "\n" + e.message);
}

function createNode  (sType, oAttr) {
    try {
        let xNode = document.createElement(sType);
        for (let sParam in oAttr) {
            xNode.setAttribute(sParam, oAttr[sParam]);
        }
        return xNode;
    }
    catch (e) {
        showError(e);
    }
}

function enableElement (sElemId) {
    if (document.getElementById(sElemId)) {
        document.getElementById(sElemId).disabled = false;
    } else {
        console.log("HTML node named <" + sElemId + "> not found.")
    }
}

function disableElement (sElemId) {
    if (document.getElementById(sElemId)) {
        document.getElementById(sElemId).disabled = true;
    } else {
        console.log("HTML node named <" + sElemId + "> not found.")
    }
}



class Table {

    constructor (sNodeId, lColumn, lColumnWidth, sProgressBarId, sResultId="") {
        this.sNodeId = sNodeId;
        this.xTable = document.getElementById(sNodeId);
        this.nColumn = lColumn.length;
        this.lColumn = lColumn;
        this.lColumnWidth = lColumnWidth;
        this.xProgressBar = document.getElementById(sProgressBarId);
        this.xNumEntry = sResultId ? document.getElementById(sResultId) : null;
        this.iEntryIndex = 0;
        this.lEntry = [];
        this.nEntry = 0
        this._createHeader();
    }

    _createHeader () {
        let xListheadNode = createNode("richlistitem", { class: "listheader" });
        for (let i=0;  i < this.lColumn.length;  i++) {
            xListheadNode.appendChild(createNode("label", { value: this.lColumn[i], width: this.lColumnWidth[i] }));
        }
        this.xTable.appendChild(xListheadNode);
    }

    clear () {
        while (this.xTable.firstChild) {
            this.xTable.removeChild(this.xTable.firstChild);
        }
        this.iEntryIndex = 0;
        this._createHeader();
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
            window.setTimeout(() => { this.xProgressBar.value = 0; }, 3000);
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
            this.xNumEntry.value = this.nEntry;
        }
    }

    _addRow (lData) {
        let xRowNode = createNode("richlistitem", { id: this.sNodeId + "_item_" + this.iEntryIndex, value: this.iEntryIndex });
        for (let i=0;  i < lData.length;  i++) {
            xRowNode.appendChild(createNode("label", { class: "listcell", value: lData[i], width: this.lColumnWidth[i] }));
        }
        this.xTable.appendChild(xRowNode);
        this.iEntryIndex += 1;
    }

    deleteSelection () {
        for (let xItem of this.xTable.selectedItems) {
            this.lEntry[parseInt(xItem.value)] = null;
            xItem.style.display = "none";
            this.nEntry -= 1;
        }
        this.showEntryNumber();
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
        document.getElementById("lemma").addEventListener("keyup", () => { this.update(); }, false);
        // nom commun
        document.getElementById("tag_N").addEventListener("click", () => { this.update("N"); }, false);
        document.getElementById("nom_adj").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("nom").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("adj").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("N_epi").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("N_mas").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("N_fem").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("N_s").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("N_x").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("N_inv").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("lemma2").addEventListener("keyup", () => { this.update(); }, false);
        // nom propre
        document.getElementById("tag_M").addEventListener("click", () => { this.update("M"); }, false);
        document.getElementById("M1").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("M2").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("MP").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("M_epi").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("M_mas").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("M_fem").addEventListener("click", () => { this.update(); }, false);
        // verbe
        document.getElementById("tag_V").addEventListener("click", () => { this.update("V"); }, false);
        document.getElementById("v_i").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("v_t").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("v_n").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("v_p").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("v_m").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("v_ae").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("v_aa").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("v_ppas").addEventListener("click", () => { this.update(); }, false);
        document.getElementById("verbe_modele").addEventListener("keyup", () => { this.update(); }, false);
        // adverbe
        document.getElementById("tag_W").addEventListener("click", () => { this.update("W"); }, false);
        // autre
        document.getElementById("tag_X").addEventListener("click", () => { this.update("X"); }, false);
        document.getElementById("flexion").addEventListener("keyup", () => { this.update(); }, false);
        document.getElementById("tags").addEventListener("keyup", () => { this.update(); }, false);
        // ajout
        document.getElementById("add_to_lexicon").addEventListener("click", () => { this.addToLexicon(); }, false);
        document.getElementById("delete_selection").addEventListener("click", () => { oGenWordsTable.deleteSelection(); }, false);
    },

    clear: function () {
        try {
            // nom commun
            document.getElementById("tag_N").checked = false;
            document.getElementById("nom_adj").checked = false;
            document.getElementById("nom").checked = false;
            document.getElementById("adj").checked = false;
            document.getElementById("N_epi").checked = false;
            document.getElementById("N_mas").checked = false;
            document.getElementById("N_fem").checked = false;
            document.getElementById("N_s").checked = false;
            document.getElementById("N_x").checked = false;
            document.getElementById("N_inv").checked = false;
            document.getElementById("lemma2").value = "";
            // nom propre
            document.getElementById("tag_M").checked = false;
            document.getElementById("M1").checked = false;
            document.getElementById("M2").checked = false;
            document.getElementById("MP").checked = false;
            document.getElementById("M_epi").checked = false;
            document.getElementById("M_mas").checked = false;
            document.getElementById("M_fem").checked = false;
            // verbe
            document.getElementById("tag_V").checked = false;
            document.getElementById("v_i").checked = false;
            document.getElementById("v_t").checked = false;
            document.getElementById("v_n").checked = false;
            document.getElementById("v_p").checked = false;
            document.getElementById("v_m").checked = false;
            document.getElementById("v_ae").checked = false;
            document.getElementById("v_aa").checked = false;
            document.getElementById("v_ppas").checked = false;
            document.getElementById("verbe_modele").value = "";
            // adverbe
            document.getElementById("tag_W").checked = false;
            // autre
            document.getElementById("tag_X").checked = false;
            document.getElementById("flexion").value = "";
            document.getElementById("tags").value = "";
        }
        catch (e) {
            showError(e);
        }
    },

    lTag: ["N", "M", "V", "W", "X"],

    setMainTag: function (cTag) {
        this.cMainTag = cTag;
        for (let c of this.lTag) {
            if (c !== cTag) {
                document.getElementById("tag_"+c).checked = false;
            }
        }
    },

    update: function (cTag=null) {
        if (cTag !== null) {
            this.setMainTag(cTag);
        }
        try {
            this.lFlexion = [];
            this.sLemma = document.getElementById("lemma").value.trim();
            if (this.sLemma.length > 0) {
                switch (this.cMainTag) {
                    case "N":
                        if (!this.getRadioValue("pos_nom_commun") || !this.getRadioValue("genre_nom_commun")) {
                            break;
                        }
                        let sTag = this.getRadioValue("pos_nom_commun") + this.getRadioValue("genre_nom_commun");
                        switch (this.getRadioValue("pluriel_nom_commun")) {
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
                        if (sLemma2.length > 0  &&  this.getRadioValue("pos_nom_commun2")  &&  this.getRadioValue("genre_nom_commun2")) {
                            let sTag2 = this.getRadioValue("pos_nom_commun2") + this.getRadioValue("genre_nom_commun2");
                            switch (this.getRadioValue("pluriel_nom_commun2")) {
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
                        let c_i = (document.getElementById("v_i").checked) ? "i" : "_";
                        let c_t = (document.getElementById("v_t").checked) ? "t" : "_";
                        let c_n = (document.getElementById("v_n").checked) ? "n" : "_";
                        let c_p = (document.getElementById("v_p").checked) ? "p" : "_";
                        let c_m = (document.getElementById("v_m").checked) ? "m" : "_";
                        let c_ae = (document.getElementById("v_ae").checked) ? "e" : "_";
                        let c_aa = (document.getElementById("v_aa").checked) ? "a" : "_";
                        let sVerbTag = c_i + c_t + c_n + c_p + c_m + c_ae + c_aa;
                        if (sVerbTag.includes("p") && !sVerbTag.startsWith("___p_")) {
                            sVerbTag = sVerbTag.replace("p", "q");
                        }
                        if (!sVerbTag.endsWith("__") && !sVerbTag.startsWith("____")) {
                            let sVerbPattern = document.getElementById("verbe_modele").value.trim();
                            if (sVerbPattern.length == 0) {
                                // utilisation du générateur de conjugaison
                                let bVarPpas = !document.getElementById("v_ppas").checked;
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
                                            if (dFlex.get(":Q3") !== "") {
                                                if (dFlex.get(":Q2") !== "") {
                                                    this.lFlexion.push([dFlex.get(":Q1"), ":V" + oVerb.cGroup + "_" + sVerbTag + ":Q:A:m:s/*"]);
                                                    this.lFlexion.push([dFlex.get(":Q2"), ":V" + oVerb.cGroup + "_" + sVerbTag + ":Q:A:m:p/*"]);
                                                } else {
                                                    this.lFlexion.push([dFlex.get(":Q1"), ":V" + oVerb.cGroup + "_" + sVerbTag + ":Q:A:m:i/*"]);
                                                }
                                                this.lFlexion.push([dFlex.get(":Q3"), ":V" + oVerb.cGroup + "_" + sVerbTag + ":Q:A:f:s/*"]);
                                                this.lFlexion.push([dFlex.get(":Q4"), ":V" + oVerb.cGroup + "_" + sVerbTag + ":Q:A:f:p/*"]);
                                            } else {
                                                this.lFlexion.push([dFlex.get(":Q1"), ":V" + oVerb.cGroup + "_" + sVerbTag + ":Q:e:i/*"]);
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
                        let sPOSTag = this.getRadioValue("pos_nom_propre");
                        let sGenderTag = this.getRadioValue("genre_nom_propre");
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
            oGenWordsTable.fill(this.lFlexion);
        }
        catch (e) {
            showError(e);
        }
    },

    getRadioValue: function (sName) {
        if (document.getElementById(sName)) {
            for (let xNode of document.getElementById(sName).children) {
                if (xNode.selected) {
                    return xNode.value;
                }
            }
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
            enableElement("save_button");
            this.clear();
            this.cMainTag = "";
        }
        catch (e) {
            showError(e);
        }
    }
}


const oBinaryDict = {

    oIBDAWG: null,

    load: async function () {
        let sJSON = await oFileHandler.loadFile("fr.personal.json");
        this._load(sJSON);
    },

    _load: function (sJSON, bSave=false) {
        //console.log("_load");
        if (sJSON) {
            try {
                let oJSON = JSON.parse(sJSON);
                this.oIBDAWG = new IBDAWG(oJSON);
            }
            catch (e) {
                this.setDictData(0, "#Erreur. Voir la console.");
                console.error(e);
                return;
            }
            if (bSave) {
                oFileHandler.saveFile("fr.personal.json", sJSON);
            }
            let lEntry = [];
            for (let aRes of this.oIBDAWG.select()) {
                lEntry.push(aRes);
            }
            oLexiconTable.fill(lEntry);
            this.setDictData(this.oIBDAWG.nEntry, this.oIBDAWG.sDate);
            enableElement("export_button");
        } else {
            this.setDictData(0, "[néant]");
            disableElement("export_button");
        }
    },

    import: function () {
        oFileHandler.loadAs(this._import.bind(this));
    },

    _import: function (sJSON) {
        this._load(sJSON, true);
    },

    setDictData: function (nEntries, sDate) {
        document.getElementById("dic_num_entries").value = nEntries;
        document.getElementById("dic_save_date").value = sDate;
    },

    listen: function () {
        document.getElementById("delete_button").addEventListener("click", () => { oLexiconTable.deleteSelection(); }, false);
        document.getElementById("save_button").addEventListener("click", () => { this.build(); }, false);
        document.getElementById("export_button").addEventListener("click", () => { this.export(); }, false);
        document.getElementById("import_button").addEventListener("click", () => { this.import(); }, false);
    },

    build: function () {
        let xProgressNode = document.getElementById("wait_progress");
        let lEntry = oLexiconTable.getEntries();
        if (lEntry.length > 0) {
            let oDAWG = new DAWG(lEntry, "S", "fr", "Français", "fr.personal", "Dictionnaire personnel", xProgressNode);
            let oJSON = oDAWG.createBinaryJSON(1);
            oFileHandler.saveFile("fr.personal.json", JSON.stringify(oJSON));
            this.oIBDAWG = new IBDAWG(oJSON);
            this.setDictData(this.oIBDAWG.nEntry, this.oIBDAWG.sDate);
            //browser.runtime.sendMessage({ sCommand: "setDictionary", oParam: {sType: "personal", oDict: oJSON}, oInfo: {} });
            enableElement("export_button");
        } else {
            oFileHandler.deleteFile("fr.personal.json");
            this.setDictData(0, "[néant]");
            disableElement("export_button");
        }
    },

    export: function () {
        let sJSON = JSON.stringify(this.oIBDAWG.getJSON());
        oFileHandler.saveAs(sJSON);
    }
}


const oSearch = {

    oSpellChecker: null,

    load: function () {
        this.oSpellChecker = new SpellChecker("fr", "", "fr-allvars.json");
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
        for (let [sTag, [_, sLabel]] of _dTag) {
            lEntry.push([sTag, sLabel.trim()]);
        }
        oTagsTable.fill(lEntry);
    }
}


const oGenWordsTable = new Table("generated_words_table", ["Flexions", "Étiquettes"], ["125px", "225px"], "progress_new_words");
const oLexiconTable = new Table("lexicon_table", ["Flexions", "Lemmes", "Étiquettes"], ["190px", "150px", "200px"], "progress_lexicon", "num_entries");
const oSearchTable = new Table("search_table", ["Flexions", "Lemmes", "Étiquettes"], ["190px", "150px", "200px"], "progress_search", "search_num_entries");
const oTagsTable = new Table("tags_table", ["Étiquette", "Signification"], ["75px", "475px"], "progress_lexicon");

conj.init(helpers.loadFile("resource://grammalecte/fr/conj_data.json"));


oTagsInfo.load();
oSearch.load();
oBinaryDict.load();
oBinaryDict.listen();
oGenerator.listen();
oSearch.listen();
