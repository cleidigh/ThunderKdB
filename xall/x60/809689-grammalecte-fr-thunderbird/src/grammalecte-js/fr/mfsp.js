// Grammalecte
/*jslint esversion: 6*/
/*global console,require,exports,browser*/

"use strict";


if (typeof(require) !== 'undefined') {
    var helpers = require("resource://grammalecte/graphspell/helpers.js");
}


var mfsp = {
    // list of affix codes
    _lTagMiscPlur: [],
    _lTagMasForm: [],
    // dictionary of words with uncommon plurals (-x, -ux, english, latin and italian plurals) and tags to generate them
    _dMiscPlur: new Map(),
    // dictionary of feminine forms and tags to generate masculine forms (singular and plural)
    _dMasForm: new Map(),

    bInit: false,
    init: function (sJSONData) {
        try {
            let _oData = JSON.parse(sJSONData);
            this._lTagMiscPlur = _oData.lTagMiscPlur;
            this._lTagMasForm = _oData.lTagMasForm;
            this._dMiscPlur = helpers.objectToMap(_oData.dMiscPlur);
            this._dMasForm = helpers.objectToMap(_oData.dMasForm);
            this.bInit = true;
        }
        catch (e) {
            console.error(e);
        }
    },

    isFemForm: function (sWord) {
        // returns True if sWord exists in this._dMasForm
        return this._dMasForm.has(sWord);
    },

    getMasForm: function (sWord, bPlur) {
        // returns masculine form with feminine form
        if (this._dMasForm.has(sWord)) {
            let aMasForm = [];
            for (let sTag of this._whatSuffixCode(sWord, bPlur)){
                aMasForm.push( this._modifyStringWithSuffixCode(sWord, sTag) );
            }
            return aMasForm;
        }
        return [];
    },

    hasMiscPlural: function (sWord) {
        // returns True if sWord exists in dMiscPlur
        return this._dMiscPlur.has(sWord);
    },

    getMiscPlural: function (sWord) {
        // returns plural form with singular form
        if (this._dMiscPlur.has(sWord)) {
            let aMiscPlural = [];
            for (let sTag of this._lTagMiscPlur[this._dMiscPlur.get(sWord)].split("|")){
                aMiscPlural.push( this._modifyStringWithSuffixCode(sWord, sTag) );
            }
            return aMiscPlural;
        }
        return [];
    },

    _whatSuffixCode: function (sWord, bPlur) {
        // necessary only for dMasFW
        let sSfx = this._lTagMasForm[this._dMasForm.get(sWord)];
        if (sSfx.includes("/")) {
            if (bPlur) {
                return sSfx.slice(sSfx.indexOf("/")+1).split("|");
            }
            return sSfx.slice(0, sSfx.indexOf("/")).split("|");
        }
        return sSfx.split("|");
    },

    _modifyStringWithSuffixCode: function (sWord, sSfx) {
        // returns sWord modified by sSfx
        if (!sWord) {
            return "";
        }
        if (sSfx === "0") {
            return sWord;
        }
        try {
            if (sSfx[0] !== '0') {
                return sWord.slice(0, -(sSfx.charCodeAt(0)-48)) + sSfx.slice(1); // 48 is the ASCII code for "0"
            } else {
                return sWord + sSfx.slice(1);
            }
        }
        catch (e) {
            console.log(e);
            return "## erreur, code : " + sSfx + " ##";
        }
    }
};


// Initialization
if (!mfsp.bInit && typeof(browser) !== 'undefined') {
    // WebExtension
    mfsp.init(helpers.loadFile(browser.extension.getURL("grammalecte/fr/mfsp_data.json")));
} else if (!mfsp.bInit && typeof(require) !== 'undefined') {
    // Add-on SDK and Thunderbird
    mfsp.init(helpers.loadFile("resource://grammalecte/fr/mfsp_data.json"));
} else if (mfsp.bInit){
    console.log("Module mfsp déjà initialisé");
} else {
    //console.log("Module mfsp non initialisé");
}


if (typeof(exports) !== 'undefined') {
    exports._lTagMiscPlur = mfsp._lTagMiscPlur;
    exports._lTagMasForm = mfsp._lTagMasForm;
    exports._dMiscPlur = mfsp._dMiscPlur;
    exports._dMasForm = mfsp._dMasForm;
    exports.init = mfsp.init;
    exports.isFemForm = mfsp.isFemForm;
    exports.getMasForm = mfsp.getMasForm;
    exports.hasMiscPlural = mfsp.hasMiscPlural;
    exports.getMiscPlural = mfsp.getMiscPlural;
    exports._whatSuffixCode = mfsp._whatSuffixCode;
    exports._modifyStringWithSuffixCode = mfsp._modifyStringWithSuffixCode;
}
