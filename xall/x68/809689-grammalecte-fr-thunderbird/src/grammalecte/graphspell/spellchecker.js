// Spellchecker
// Wrapper for the IBDAWG class.
// Useful to check several dictionaries at once.

// To avoid iterating over a pile of dictionaries, it is assumed that 3 are enough:
// - the main dictionary, bundled with the package
// - the community dictionary, a merge of different external dictionaries
// - the personal dictionary, created by the user for its own convenience

/* jshint esversion:6, -W097 */
/* jslint esversion:6 */
/* global require, exports, console, IBDAWG, Tokenizer */

"use strict";

if (typeof(process) !== 'undefined') {
    var ibdawg = require("./ibdawg.js");
    var tokenizer = require("./tokenizer.js");
}
else if (typeof(require) !== 'undefined') {
    var ibdawg = require("resource://grammalecte/graphspell/ibdawg.js");
    var tokenizer = require("resource://grammalecte/graphspell/tokenizer.js");
}


// Map
/*jslint esversion: 6*/

if (Map.prototype.grammalecte === undefined) {
    Map.prototype.gl_shallowCopy = function () {
        let oNewMap = new Map();
        for (let [key, val] of this.entries()) {
            oNewMap.set(key, val);
        }
        return oNewMap;
    };

    Map.prototype.gl_get = function (key, defaultValue) {
        let res = this.get(key);
        if (res !== undefined) {
            return res;
        }
        return defaultValue;
    };

    Map.prototype.gl_toString = function () {
        // Default .toString() gives nothing useful
        let sRes = "{ ";
        for (let [k, v] of this.entries()) {
            sRes += (typeof k === "string") ? '"' + k + '": ' : k.toString() + ": ";
            sRes += (typeof v === "string") ? '"' + v + '", ' : v.toString() + ", ";
        }
        sRes = sRes.slice(0, -2) + " }";
        return sRes;
    };

    Map.prototype.gl_update = function (dDict) {
        for (let [k, v] of dDict.entries()) {
            this.set(k, v);
        }
    };

    Map.prototype.gl_updateOnlyExistingKeys = function (dDict) {
        for (let [k, v] of dDict.entries()) {
            if (this.has(k)){
                this.set(k, v);
            }
        }
    };

    Map.prototype.gl_reverse = function () {
        let dNewMap = new Map();
        this.forEach((val, key) => {
            dNewMap.set(val, key);
        });
        return dNewMap;
    };

    Map.prototype.grammalecte = true;
}



const dDefaultDictionaries = new Map([
    ["fr", "fr-allvars.json"],
    ["en", "en.json"]
]);


class SpellChecker {

    constructor (sLangCode, sPath="", mainDic="", communityDic="", personalDic="") {
        // returns true if the main dictionary is loaded
        this.sLangCode = sLangCode;
        if (!mainDic) {
            mainDic = dDefaultDictionaries.gl_get(sLangCode, "");
        }
        this.oMainDic = this._loadDictionary(mainDic, sPath, true);
        this.oCommunityDic = this._loadDictionary(communityDic, sPath);
        this.oPersonalDic = this._loadDictionary(personalDic, sPath);
        this.bCommunityDic = Boolean(this.oCommunityDic);
        this.bPersonalDic = Boolean(this.oPersonalDic);
        this.oTokenizer = null;
        // Lexicographer
        this.lexicographer = null;
        this.loadLexicographer(sLangCode)
        // storage
        this.bStorage = false;
        this._dMorphologies = new Map();            // key: flexion, value: list of morphologies
        this._dLemmas = new Map();                  // key: flexion, value: list of lemmas
    }

    _loadDictionary (dictionary, sPath="", bNecessary=false) {
        // <dictionary> can be a filename or a JSON object, returns an IBDAWG object
        if (!dictionary) {
            return null;
        }
        try {
            if (typeof(ibdawg) !== 'undefined') {
                return new ibdawg.IBDAWG(dictionary, sPath);
            } else {
                return new IBDAWG(dictionary, sPath);
            }
        }
        catch (e) {
            let sfDictionary = (typeof(dictionary) == "string") ? dictionary : dictionary.sLangName + "/" + dictionary.sFileName;
            let sErrorMessage = "Error [" + this.sLangCode + "]: <" + sfDictionary + "> not loaded.";
            if (bNecessary) {
                throw sErrorMessage + " | " + e.message;
            }
            console.log(sErrorMessage);
            console.log(e.message);
            return null;
        }
    }

    loadTokenizer () {
        if (typeof(tokenizer) !== 'undefined') {
            this.oTokenizer = new tokenizer.Tokenizer(this.sLangCode);
        } else {
            this.oTokenizer = new Tokenizer(this.sLangCode);
        }
    }

    getTokenizer () {
        if (!this.oTokenizer) {
            this.loadTokenizer();
        }
        return this.oTokenizer;
    }

    setMainDictionary (dictionary, sPath="") {
        // returns true if the dictionary is loaded
        this.oMainDic = this._loadDictionary(dictionary, sPath, true);
        return Boolean(this.oMainDic);
    }

    setCommunityDictionary (dictionary, sPath="", bActivate=true) {
        // returns true if the dictionary is loaded
        this.oCommunityDic = this._loadDictionary(dictionary, sPath);
        this.bCommunityDic = (bActivate) ? Boolean(this.oCommunityDic) : false;
        return Boolean(this.oCommunityDic);
    }

    setPersonalDictionary (dictionary, sPath="", bActivate=true) {
        // returns true if the dictionary is loaded
        this.oPersonalDic = this._loadDictionary(dictionary, sPath);
        this.bPersonalDic = (bActivate) ? Boolean(this.oPersonalDic) : false;
        return Boolean(this.oPersonalDic);
    }

    activateCommunityDictionary () {
        this.bCommunityDic = Boolean(this.oCommunityDic);
    }

    activatePersonalDictionary () {
        this.bPersonalDic = Boolean(this.oPersonalDic);
    }

    deactivateCommunityDictionary () {
        this.bCommunityDic = false;
    }

    deactivatePersonalDictionary () {
        this.bPersonalDic = false;
    }


    // Lexicographer

    loadLexicographer (sLangCode) {
        // load default suggestion module for <sLangCode>
        if (typeof(process) !== 'undefined') {
            this.lexicographer = require(`./lexgraph_${sLangCode}.js`);
        }
        else if (typeof(require) !== 'undefined') {
            this.lexicographer = require(`resource://grammalecte/graphspell/lexgraph_${sLangCode}.js`);
        }
    }


    // Storage

    activateStorage () {
        this.bStorage = true;
    }

    deactivateStorage () {
        this.bStorage = false;
    }

    clearStorage () {
        this._dLemmas.clear();
        this._dMorphologies.clear();
    }


    // parse text functions

    parseParagraph (sText) {
        if (!this.oTokenizer) {
            this.loadTokenizer();
        }
        let aSpellErr = [];
        for (let oToken of this.oTokenizer.genTokens(sText)) {
            if (oToken.sType === 'WORD' && !this.isValidToken(oToken.sValue)) {
                aSpellErr.push(oToken);
            }
        }
        return aSpellErr;
    }

    // IBDAWG functions

    isValidToken (sToken) {
        // checks if sToken is valid (if there is hyphens in sToken, sToken is split, each part is checked)
        if (this.oMainDic.isValidToken(sToken)) {
            return true;
        }
        if (this.bCommunityDic && this.oCommunityDic.isValidToken(sToken)) {
            return true;
        }
        if (this.bPersonalDic && this.oPersonalDic.isValidToken(sToken)) {
            return true;
        }
        return false;
    }

    isValid (sWord) {
        // checks if sWord is valid (different casing tested if the first letter is a capital)
        if (this.oMainDic.isValid(sWord)) {
            return true;
        }
        if (this.bCommunityDic && this.oCommunityDic.isValid(sWord)) {
            return true;
        }
        if (this.bPersonalDic && this.oPersonalDic.isValid(sWord)) {
            return true;
        }
        return false;
    }

    lookup (sWord) {
        // checks if sWord is in dictionary as is (strict verification)
        if (this.oMainDic.lookup(sWord)) {
            return true;
        }
        if (this.bCommunityDic && this.oCommunityDic.lookup(sWord)) {
            return true;
        }
        if (this.bPersonalDic && this.oPersonalDic.lookup(sWord)) {
            return true;
        }
        return false;
    }

    getMorph (sWord) {
        // retrieves morphologies list, different casing allowed
        if (this.bStorage && this._dMorphologies.has(sWord)) {
            return this._dMorphologies.get(sWord);
        }
        let lMorph = this.oMainDic.getMorph(sWord);
        if (this.bCommunityDic) {
            lMorph.push(...this.oCommunityDic.getMorph(sWord));
        }
        if (this.bPersonalDic) {
            lMorph.push(...this.oPersonalDic.getMorph(sWord));
        }
        if (this.bStorage) {
            this._dMorphologies.set(sWord, lMorph);
            this._dLemmas.set(sWord, Array.from(new Set(this.getMorph(sWord).map((sMorph) => { return sMorph.slice(1, sMorph.indexOf("/")); }))));
            //console.log(sWord, this._dLemmas.get(sWord));
        }
        return lMorph;
    }

    getLemma (sWord) {
        // retrieves lemmas
        if (this.bStorage) {
            if (!this._dLemmas.has(sWord)) {
                this.getMorph(sWord);
            }
            return this._dLemmas.get(sWord);
        }
        return Array.from(new Set(this.getMorph(sWord).map((sMorph) => { return sMorph.slice(1, sMorph.indexOf("/")); })));
    }

    * suggest (sWord, nSuggLimit=10) {
        // generator: returns 1, 2 or 3 lists of suggestions
        if (this.lexicographer) {
            if (this.lexicographer.dSugg.has(sWord)) {
                yield this.lexicographer.dSugg.get(sWord).split("|");
            } else if (sWord.gl_isTitle() && this.lexicographer.dSugg.has(sWord.toLowerCase())) {
                let lRes = this.lexicographer.dSugg.get(sWord.toLowerCase()).split("|");
                yield lRes.map((sSugg) => { return sSugg.slice(0,1).toUpperCase() + sSugg.slice(1); });
            } else {
                yield this.oMainDic.suggest(sWord, nSuggLimit, true);
            }
        } else {
            yield this.oMainDic.suggest(sWord, nSuggLimit, true);
        }
        if (this.bCommunityDic) {
            yield this.oCommunityDic.suggest(sWord, Math.floor(nSuggLimit/2)+1);
        }
        if (this.bPersonalDic) {
            yield this.oPersonalDic.suggest(sWord, Math.floor(nSuggLimit/2)+1);
        }
    }

    * select (sFlexPattern="", sTagsPattern="") {
        // generator: returns all entries which flexion fits <sFlexPattern> and morphology fits <sTagsPattern>
        yield* this.oMainDic.select(sFlexPattern, sTagsPattern);
        if (this.bCommunityDic) {
            yield* this.oCommunityDic.select(sFlexPattern, sTagsPattern);
        }
        if (this.bPersonalDic) {
            yield* this.oPersonalDic.select(sFlexPattern, sTagsPattern);
        }
    }

    getSimilarEntries (sWord, nSuggLimit=10) {
        // return a list of tuples (similar word, stem, morphology)
        let lResult = this.oMainDic.getSimilarEntries(sWord, nSuggLimit);
        if (this.bCommunityDic) {
            lResult.push(...this.oCommunityDic.getSimilarEntries(sWord, nSuggLimit));
        }
        if (this.bPersonalDic) {
            lResult.push(...this.oPersonalDic.getSimilarEntries(sWord, nSuggLimit));
        }
        return lResult;
    }
}

if (typeof(exports) !== 'undefined') {
    exports.SpellChecker = SpellChecker;
}
