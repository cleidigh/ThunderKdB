// IBDAWG

/* jshint esversion:6, -W097 */
/* jslint esversion:6 */
/* global require, exports, console, __dirname */

"use strict";

// Don’t remove <string>. Necessary in TB.

// String
/*jslint esversion: 6*/

if (String.prototype.grammalecte === undefined) {
    String.prototype.gl_count = function (sSearch, bOverlapping) {
        // http://jsperf.com/string-ocurrence-split-vs-match/8
        if (sSearch.length <= 0) {
            return this.length + 1;
        }
        let nOccur = 0;
        let iPos = 0;
        let nStep = (bOverlapping) ? 1 : sSearch.length;
        while ((iPos = this.indexOf(sSearch, iPos)) >= 0) {
            nOccur++;
            iPos += nStep;
        }
        return nOccur;
    };
    String.prototype.gl_isDigit = function () {
        return (this.search(/^[0-9⁰¹²³⁴⁵⁶⁷⁸⁹]+$/) !== -1);
    };
    String.prototype.gl_isAlpha = function () {
        return (this.search(/^[a-zà-öA-Zø-ÿÀ-ÖØ-ßĀ-ʯﬀ-ﬆᴀ-ᶿ]+$/) !== -1);
    };
    String.prototype.gl_isLowerCase = function () {
        return (this.search(/^[a-zà-öø-ÿﬀ-ﬆ0-9 '’-]+$/) !== -1);
    };
    String.prototype.gl_isUpperCase = function () {
        return (this.search(/^[A-ZÀ-ÖØ-ßŒ0-9 '’-]+$/) !== -1  &&  this.search(/^[0-9]+$/) === -1);
    };
    String.prototype.gl_isTitle = function () {
        return (this.search(/^[A-ZÀ-ÖØ-ßŒ][a-zà-öø-ÿﬀ-ﬆ '’-]+$/) !== -1);
    };
    String.prototype.gl_toCapitalize = function () {
        return this.slice(0,1).toUpperCase() + this.slice(1).toLowerCase();
    };
    String.prototype.gl_expand = function (oMatch) {
        let sNew = this;
        for (let i = 0; i < oMatch.length ; i++) {
            let z = new RegExp("\\\\"+parseInt(i), "g");
            sNew = sNew.replace(z, oMatch[i]);
        }
        return sNew;
    };
    String.prototype.gl_trimRight = function (sChars) {
        let z = new RegExp("["+sChars+"]+$");
        return this.replace(z, "");
    };
    String.prototype.gl_trimLeft = function (sChars) {
        let z = new RegExp("^["+sChars+"]+");
        return this.replace(z, "");
    };
    String.prototype.gl_trim = function (sChars) {
        let z1 = new RegExp("^["+sChars+"]+");
        let z2 = new RegExp("["+sChars+"]+$");
        return this.replace(z1, "").replace(z2, "");
    };

    String.prototype.grammalecte = true;
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


// Set
/*jslint esversion: 6*/

if (Set.prototype.grammalecte === undefined) {
    Set.prototype.gl_update = function (aSet) {
        for (let elem of aSet) {
            this.add(elem);
        }
    };

    Set.prototype.grammalecte = true;
}



if (typeof(process) !== 'undefined') {
    var str_transform = require("./str_transform.js");
    var helpers = require("./helpers.js");
    var char_player = require("./char_player.js");
}


class SuggResult {
    // Structure for storing, classifying and filtering suggestions

    constructor (sWord, nDistLimit=-1) {
        this.sWord = sWord;
        this.sSimplifiedWord = str_transform.simplifyWord(sWord);
        this.nDistLimit = (nDistLimit >= 0) ? nDistLimit :  Math.floor(sWord.length / 3) + 1;
        this.nMinDist = 1000;
        this.aSugg = new Set();
        this.dSugg = new Map([ [0, []],  [1, []],  [2, []] ]);
        this.aAllSugg = new Set();      // all found words even those refused
    }

    addSugg (sSugg, nDeep=0) {
        // add a suggestion
        if (this.aAllSugg.has(sSugg)) {
            return;
        }
        this.aAllSugg.add(sSugg);
        if (!this.aSugg.has(sSugg)) {
            let nDist = str_transform.distanceDamerauLevenshtein(this.sSimplifiedWord, str_transform.simplifyWord(sSugg));
            if (nDist <= this.nDistLimit) {
                if (sSugg.includes(" ")) { // add 1 to distance for split suggestions
                    nDist += 1;
                }
                if (!this.dSugg.has(nDist)) {
                    this.dSugg.set(nDist, []);
                }
                this.dSugg.get(nDist).push(sSugg);
                this.aSugg.add(sSugg);
                if (nDist < this.nMinDist) {
                    this.nMinDist = nDist;
                }
                this.nDistLimit = Math.min(this.nDistLimit, this.nMinDist+1);
            }
        }
    }

    getSuggestions (nSuggLimit=10, nDistLimit=-1) {
        // return a list of suggestions
        let lRes = [];
        if (this.dSugg.get(0).length) {
            // we sort the better results with the original word
            let dDistTemp = new Map();
            lRes.forEach((sSugg) => { dDistTemp.set(sSugg, str_transform.distanceDamerauLevenshtein(this.sWord, sSugg)); });
            lRes = lRes.sort((sA, sB) => { return dDistTemp.get(sA) - dDistTemp.get(sB); });
            dDistTemp.clear();
        }
        for (let [nDist, lSugg] of this.dSugg.entries()) {
            if (nDist > this.nDistLimit) {
                break;
            }
            lRes.push(...lSugg);
            if (lRes.length > nSuggLimit) {
                break;
            }
        }
        if (this.sWord.gl_isUpperCase()) {
            lRes = lRes.map((sSugg) => { return sSugg.toUpperCase(); });
            lRes = [...new Set(lRes)];
        }
        else if (this.sWord.slice(0,1).gl_isUpperCase()) {
            lRes = lRes.map((sSugg) => { return sSugg.slice(0,1).toUpperCase() + sSugg.slice(1); });
            lRes = [...new Set(lRes)];
        }
        return lRes.slice(0, nSuggLimit);
    }

    reset () {
        this.aSugg.clear();
        this.dSugg.clear();
    }
}


class IBDAWG {
    // INDEXABLE BINARY DIRECT ACYCLIC WORD GRAPH

    constructor (source, sPath="") {
        // <source> can be a filename or a object with all the necessary data.
        try {
            let oData = null;
            if (typeof(source) == "string") {
                let sURL;
                if (typeof(process) !== 'undefined') {
                    sURL = (sPath !== "") ? sPath + "/" + source : __dirname + "/_dictionaries/"+source;
                } else {
                    sURL = (sPath !== "") ? sPath + "/" + source : "resource://grammalecte/graphspell/_dictionaries/"+source;
                }
                oData = JSON.parse(helpers.loadFile(sURL));
            } else {
                oData = source;
            }
            Object.assign(this, oData);
        }
        catch (e) {
            console.error(e);
            console.log("path: " + sPath);
            console.log("dic:" + source.slice(0, 1000));
            throw Error("# Error. File not found or not loadable.\n" + e.message + "\n");
        }
        /*
            Properties:
            sName, nCompressionMethod, sHeader, lArcVal, nArcVal, sByDic, sLang, nChar, nBytesArc, nBytesNodeAddress,
            nEntry, nNode, nArc, nAff, cStemming, nTag, dChar, nBytesOffset,
        */

        /*
            Bug workaround.
            Mozilla’s JS parser sucks. Can’t read file bigger than 4 Mb!
            So we convert huge hexadecimal string to list of numbers…
            https://github.com/mozilla/addons-linter/issues/1361
        */
        let lTemp = [];
        for (let i = 0;  i < this.sByDic.length;  i+=2) {
            lTemp.push(parseInt(this.sByDic.slice(i, i+2), 16));
        }
        this.byDic = lTemp;
        //this.byDic = new Uint8Array(lTemp);  // not quicker, even slower
        /* end of bug workaround */

        if (!(this.sHeader.startsWith("/grammalecte-fsa/") || this.sHeader.startsWith("/pyfsa/"))) {
            throw TypeError("# Error. Not a grammalecte-fsa binary dictionary. Header: " + this.sHeader);
        }
        if (!(this.nCompressionMethod == 1 || this.nCompressionMethod == 2 || this.nCompressionMethod == 3)) {
            throw RangeError("# Error. Unknown dictionary compression method: " + this.nCompressionMethod);
        }
        // <dChar> to get the value of an arc, <dCharVal> to get the char of an arc with its value
        this.dChar = helpers.objectToMap(this.dChar);
        this.dCharVal = this.dChar.gl_reverse();
        this.a2grams = (this.l2grams) ? new Set(this.l2grams) : null;

        if (this.cStemming == "S") {
            this.funcStemming = str_transform.changeWordWithSuffixCode;
        } else if (this.cStemming == "A") {
            this.funcStemming = str_transform.changeWordWithAffixCode;
        } else {
            this.funcStemming = str_transform.noStemming;
        }

        this._arcMask = (2 ** ((this.nBytesArc * 8) - 3)) - 1;
        this._finalNodeMask = 1 << ((this.nBytesArc * 8) - 1);
        this._lastArcMask = 1 << ((this.nBytesArc * 8) - 2);


        // Configuring DAWG functions according to nCompressionMethod
        switch (this.nCompressionMethod) {
            case 1:
                this.morph = this._morph1;
                this.stem = this._stem1;
                this._lookupArcNode = this._lookupArcNode1;
                this._getArcs = this._getArcs1;
                this._writeNodes = this._writeNodes1;
                break;
            case 2:
                this.morph = this._morph2;
                this.stem = this._stem2;
                this._lookupArcNode = this._lookupArcNode2;
                this._getArcs = this._getArcs2;
                this._writeNodes = this._writeNodes2;
                break;
            case 3:
                this.morph = this._morph3;
                this.stem = this._stem3;
                this._lookupArcNode = this._lookupArcNode3;
                this._getArcs = this._getArcs3;
                this._writeNodes = this._writeNodes3;
                break;
            default:
                throw ValueError("# Error: unknown code: " + this.nCompressionMethod);
        }
        //console.log(this.getInfo());
        this.bAcronymValid = true;
        this.bNumAtLastValid = false;

        // lexicographer module ?
        this.lexicographer = null;
        // JS still sucks: we’ll try importation when importation will be available in Workers. Still waiting...
        if (self && self.hasOwnProperty("lexgraph_"+this.sLangCode)) { // self is the Worker
            this.lexicographer = self["lexgraph_"+this.sLangCode];
        }

    }

    getInfo () {
        return  `  Language: ${this.sLangName}   Lang code: ${this.sLangCode}   Dictionary name: ${this.sDicName}\n` +
                `  Compression method: ${this.nCompressionMethod}   Date: ${this.sDate}   Stemming: ${this.cStemming}FX\n` +
                `  Arcs values:  ${this.nArcVal} = ${this.nChar} characters,  ${this.nAff} affixes,  ${this.nTag} tags\n` +
                `  Dictionary: ${this.nEntry} entries,    ${this.nNode} nodes,   ${this.nArc} arcs\n` +
                `  Address size: ${this.nBytesNodeAddress} bytes,  Arc size: ${this.nBytesArc} bytes\n`;
    }

    getJSON () {
        let oJSON = {
            "sHeader": "/grammalecte-fsa/",
            "sLangCode": this.sLangCode,
            "sLangName": this.sLangName,
            "sDicName": this.sDicName,
            "sDescription": this.sDescription,
            "sFileName": this.sFileName,
            "sDate": this.sDate,
            "nEntry": this.nEntry,
            "nChar": this.nChar,
            "nAff": this.nAff,
            "nTag": this.nTag,
            "cStemming": this.cStemming,
            "dChar": helpers.mapToObject(this.dChar),
            "nNode": this.nNode,
            "nArc": this.nArc,
            "lArcVal": this.lArcVal,
            "nArcVal": this.nArcVal,
            "nCompressionMethod": this.nCompressionMethod,
            "nBytesArc": this.nBytesArc,
            "nBytesNodeAddress": this.nBytesNodeAddress,
            "nBytesOffset": this.nBytesOffset,
            "sByDic": this.sByDic,  // binary word graph
            "l2grams": this.l2grams
        };
        return oJSON;
    }

    isValidToken (sToken) {
        // checks if sToken is valid (if there is hyphens in sToken, sToken is split, each part is checked)
        sToken = str_transform.spellingNormalization(sToken);
        if (this.isValid(sToken)) {
            return true;
        }
        if (sToken.includes("-")) {
            if (sToken.gl_count("-") > 4) {
                return true;
            }
            return sToken.split("-").every(sWord  =>  this.isValid(sWord));
        }
        if (sToken.includes(".") || sToken.includes("·")) {
            return true;
        }
        return false;
    }

    isValid (sWord) {
        // checks if sWord is valid (different casing tested if the first letter is a capital)
        if (!sWord) {
            return null;
        }
        if (sWord.includes("'")) { // ugly hack
            sWord = sWord.replace("'", "’");
        }
        if (this.lookup(sWord)) {
            return true;
        }
        if (sWord.charAt(0).gl_isUpperCase()) {
            if (sWord.length > 1) {
                if (sWord.gl_isTitle()) {
                    return !!this.lookup(sWord.toLowerCase());
                }
                if (sWord.gl_isUpperCase()) {
                    return !!(this.bAcronymValid || this.lookup(sWord.toLowerCase()) || this.lookup(sWord.gl_toCapitalize()));
                }
                return !!this.lookup(sWord.slice(0, 1).toLowerCase() + sWord.slice(1));
            }
            return !!this.lookup(sWord.toLowerCase());
        }
        if (sWord.slice(0,1).gl_isDigit()) {
            return true;
        }
        return false;
    }

    _convBytesToInteger (aBytes) {
        // Byte order = Big Endian (bigger first)
        let nVal = 0;
        let nWeight = (aBytes.length - 1) * 8;
        for (let n of aBytes) {
            nVal += n << nWeight;
            nWeight = nWeight - 8;
        }
        return nVal;
    }

    lookup (sWord) {
        // returns true if sWord in dictionary (strict verification)
        let iAddr = 0;
        for (let c of sWord) {
            if (!this.dChar.has(c)) {
                return false;
            }
            iAddr = this._lookupArcNode(this.dChar.get(c), iAddr);
            if (iAddr === null) {
                return false;
            }
        }
        return Boolean(this._convBytesToInteger(this.byDic.slice(iAddr, iAddr+this.nBytesArc)) & this._finalNodeMask);
    }

    getMorph (sWord) {
        // retrieves morphologies list, different casing allowed
        sWord = str_transform.spellingNormalization(sWord);
        let l = this.morph(sWord);
        if (sWord[0].gl_isUpperCase()) {
            l.push(...this.morph(sWord.toLowerCase()));
            if (sWord.gl_isUpperCase() && sWord.length > 1) {
                l.push(...this.morph(sWord.gl_toCapitalize()));
            }
        }
        return l;
    }

    suggest (sWord, nSuggLimit=10, bSplitTrailingNumbers=false) {
        // returns a array of suggestions for <sWord>
        //console.time("Suggestions for " + sWord);
        sWord = str_transform.spellingNormalization(sWord);
        let sPfx = "";
        let sSfx = "";
        if (this.lexicographer) {
            [sPfx, sWord, sSfx] = this.lexicographer.split(sWord);
        }
        let nMaxSwitch = Math.max(Math.floor(sWord.length / 3), 1);
        let nMaxDel = Math.floor(sWord.length / 5);
        let nMaxHardRepl = Math.max(Math.floor((sWord.length - 5) / 4), 1);
        let nMaxJump = Math.max(Math.floor(sWord.length / 4), 1);
        let oSuggResult = new SuggResult(sWord);
        if (bSplitTrailingNumbers) {
            this._splitTrailingNumbers(oSuggResult, sWord);
        }
        this._splitSuggest(oSuggResult, sWord);
        this._suggest(oSuggResult, sWord, nMaxSwitch, nMaxDel, nMaxHardRepl, nMaxJump);
        let aSugg = oSuggResult.getSuggestions(nSuggLimit);
        if (this.lexicographer) {
            aSugg = this.lexicographer.filterSugg(aSugg);
        }
        if (sSfx || sPfx) {
            // we add what we removed
            return aSugg.map( (sSugg) => { return sPfx + sSugg + sSfx; } );
        }
        //console.timeEnd("Suggestions for " + sWord);
        return aSugg;
    }

    _splitTrailingNumbers (oSuggResult, sWord) {
        let m = /^([a-zA-Zà-öÀ-Ö_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)([0-9]+)$/.exec(sWord);
        if (m  &&  !m[1].endsWith("-")  &&  !m[1].endsWith("_")) {
            oSuggResult.addSugg(m[1] + " " + str_transform.numbersToExponent(m[2]));
        }
    }

    _splitSuggest (oSuggResult, sWord) {
        // split at apostrophes
        for (let cSplitter of "'’") {
            if (sWord.includes(cSplitter)) {
                let [sWord1, sWord2] = sWord.split(cSplitter, 2);
                if (this.isValid(sWord1) && this.isValid(sWord2)) {
                    oSuggResult.addSugg(sWord1+" "+sWord2);
                }
            }
        }
    }

    _suggest (oSuggResult, sRemain, nMaxSwitch=0, nMaxDel=0, nMaxHardRepl=0, nMaxJump=0, nDist=0, nDeep=0, iAddr=0, sNewWord="", bAvoidLoop=false) {
        // returns a set of suggestions
        // recursive function
        if (this._convBytesToInteger(this.byDic.slice(iAddr, iAddr+this.nBytesArc)) & this._finalNodeMask) {
            if (sRemain == "") {
                oSuggResult.addSugg(sNewWord);
                for (let sTail of this._getTails(iAddr)) {
                    oSuggResult.addSugg(sNewWord+sTail);
                }
                return;
            }
            else if ( (sNewWord.length + sRemain.length == oSuggResult.sWord.length) && oSuggResult.sWord.toLowerCase().startsWith(sNewWord.toLowerCase()) && this.isValid(sRemain) ) {
                if (this.sLangCode == "fr"
                    && ["l", "d", "n", "m", "t", "s", "c", "j", "qu", "lorsqu", "puisqu", "quoiqu", "jusqu", "quelqu"].includes(sNewWord.toLowerCase()) && char_player.aVowel.has(sRemain.slice(0,1))) {
                    oSuggResult.addSugg(sNewWord+"’"+sRemain);
                }
                if ((sNewWord.length > 1 && sRemain.length > 1) || ["a", "à", "y"].includes(sNewWord) || ["a", "à", "y"].includes(sRemain)) {
                    oSuggResult.addSugg(sNewWord+" "+sRemain);
                }
            }
        }
        if (nDist > oSuggResult.nDistLimit) {
            return;
        }
        let cCurrent = sRemain.slice(0, 1);
        for (let [cChar, jAddr] of this._getCharArcs(iAddr)) {
            if (char_player.d1to1.gl_get(cCurrent, cCurrent).indexOf(cChar) != -1) {
                this._suggest(oSuggResult, sRemain.slice(1), nMaxSwitch, nMaxDel, nMaxHardRepl, nMaxJump, nDist, nDeep+1, jAddr, sNewWord+cChar);
            }
            else if (!bAvoidLoop) {
                if (nMaxHardRepl  &&  this.isNgramsOK(cChar+sRemain.slice(1,2))) {
                    this._suggest(oSuggResult, sRemain.slice(1), nMaxSwitch, nMaxDel, nMaxHardRepl-1, nMaxJump, nDist+1, nDeep+1, jAddr, sNewWord+cChar, true);
                }
                if (nMaxJump) {
                    this._suggest(oSuggResult, sRemain, nMaxSwitch, nMaxDel, nMaxHardRepl, nMaxJump-1, nDist+1, nDeep+1, jAddr, sNewWord+cChar, true); // true for avoiding loop?
                }
            }
        }
        if (!bAvoidLoop) { // avoid infinite loop
            if (sRemain.length > 1) {
                if (cCurrent == sRemain.slice(1, 2)) {
                    // same char, we remove 1 char without adding 1 to <sNewWord>
                    this._suggest(oSuggResult, sRemain.slice(1), nMaxSwitch, nMaxDel, nMaxHardRepl, nMaxJump, nDist, nDeep+1, iAddr, sNewWord);
                }
                else {
                    // switching chars
                    if (nMaxSwitch > 0  &&  this.isNgramsOK(sNewWord.slice(-1)+sRemain.slice(1,2))  &&  this.isNgramsOK(sRemain.slice(1,2)+sRemain.slice(0,1))) {
                        this._suggest(oSuggResult, sRemain.slice(1, 2)+sRemain.slice(0, 1)+sRemain.slice(2), nMaxSwitch-1, nMaxDel, nMaxHardRepl, nMaxJump, nDist+1, nDeep+1, iAddr, sNewWord, true);
                    }
                    // delete char
                    if (nMaxDel > 0  &&  this.isNgramsOK(sNewWord.slice(-1)+sRemain.slice(1,2))) {
                        this._suggest(oSuggResult, sRemain.slice(1), nMaxSwitch, nMaxDel-1, nMaxHardRepl, nMaxJump, nDist+1, nDeep+1, iAddr, sNewWord, true);
                    }
                }
                // Phonetic replacements
                for (let sRepl of char_player.get1toXReplacement(sNewWord.slice(-1), cCurrent, sRemain.slice(1,2))) {
                    this._suggest(oSuggResult, sRepl + sRemain.slice(1), nMaxSwitch, nMaxDel, nMaxHardRepl, nMaxJump, nDist, nDeep+1, iAddr, sNewWord, true);
                }
                for (let sRepl of char_player.d2toX.gl_get(sRemain.slice(0, 2), [])) {
                    this._suggest(oSuggResult, sRepl + sRemain.slice(2), nMaxSwitch, nMaxDel, nMaxHardRepl, nMaxJump, nDist, nDeep+1, iAddr, sNewWord, true);
                }
            }
            // end of word
            if (sRemain.length == 2) {
                for (let sRepl of char_player.dFinal2.gl_get(sRemain, [])) {
                    this._suggest(oSuggResult, sRepl, nMaxSwitch, nMaxDel, nMaxHardRepl, nMaxJump, nDist, nDeep+1, iAddr, sNewWord, true);
                }
            }
            else if (sRemain.length == 1) {
                this._suggest(oSuggResult, "", nMaxSwitch, nMaxDel, nMaxHardRepl, nMaxJump, nDist, nDeep+1, iAddr, sNewWord, true); // remove last char and go on
                for (let sRepl of char_player.dFinal1.gl_get(sRemain, [])) {
                    this._suggest(oSuggResult, sRepl, nMaxSwitch, nMaxDel, nMaxHardRepl, nMaxJump, nDist, nDeep+1, iAddr, sNewWord, true);
                }
            }
        }
    }

    isNgramsOK (sChars) {
        if (sChars.length != 2) {
            return true;
        }
        if (!this.a2grams) {
            return true;
        }
        return this.a2grams.has(sChars);
    }

    * _getCharArcs (iAddr) {
        // generator: yield all chars and addresses from node at address <iAddr>
        for (let [nVal, jAddr] of this._getArcs(iAddr)) {
            if (nVal <= this.nChar) {
                yield [this.dCharVal.get(nVal), jAddr];
            }
        }
    }

    * _getSimilarCharArcs (cChar, iAddr) {
        // generator: yield similar char of <cChar> and address of the following node
        for (let c of char_player.d1to1.gl_get(cChar, [cChar])) {
            if (this.dChar.has(c)) {
                let jAddr = this._lookupArcNode(this.dChar.get(c), iAddr);
                if (jAddr) {
                    yield [c, jAddr];
                }
            }
        }
    }

    _getTails (iAddr, sTail="", n=2) {
        // return a list of suffixes ending at a distance of <n> from <iAddr>
        let aTails = new Set();
        for (let [nVal, jAddr] of this._getArcs(iAddr)) {
            if (nVal <= this.nChar) {
                if (this._convBytesToInteger(this.byDic.slice(jAddr, jAddr+this.nBytesArc)) & this._finalNodeMask) {
                    aTails.add(sTail + this.dCharVal.get(nVal));
                }
                if (n && aTails.size == 0) {
                    aTails.gl_update(this._getTails(jAddr, sTail+this.dCharVal.get(nVal), n-1));
                }
            }
        }
        return aTails;
    }

    // morph (sWord) {
    //     is defined in constructor
    // }
    getSimilarEntries (sWord, nSuggLimit=10) {
        // return a list of tuples (similar word, stem, morphology)
        if (sWord == "") {
            return [];
        }
        let lResult = [];
        for (let sSimilar of this.suggest(sWord, nSuggLimit)) {
            for (let sMorph of this.getMorph(sSimilar)) {
                let nCut = sMorph.indexOf("/");
                lResult.push( [sSimilar, sMorph.slice(1, nCut), sMorph.slice(nCut+1)] );
            }
        }
        return lResult;
    }

    * select (sFlexPattern="", sTagsPattern="") {
        // generator: returns all entries which flexion fits <sFlexPattern> and morphology fits <sTagsPattern>
        let zFlexPattern = null;
        let zTagsPattern = null;
        try {
            zFlexPattern = (sFlexPattern !== "") ? new RegExp(sFlexPattern) : null;
            zTagsPattern = (sTagsPattern !== "") ? new RegExp(sTagsPattern) : null;
        }
        catch (e) {
            console.log("Error in regex pattern");
            console.log(e.message);
        }
        yield* this._select1(zFlexPattern, zTagsPattern, 0, "");
    }

    // VERSION 1

    * _select1 (zFlexPattern, zTagsPattern, iAddr, sWord) {
        // recursive generator
        for (let [nVal, jAddr] of this._getArcs1(iAddr)) {
            if (nVal <= this.nChar) {
                // simple character
                yield* this._select1(zFlexPattern, zTagsPattern, jAddr, sWord + this.lArcVal[nVal]);
            } else {
                if (!zFlexPattern || zFlexPattern.test(sWord)) {
                    let sStem = this.funcStemming(sWord, this.lArcVal[nVal]);
                    for (let [nMorphVal, _] of this._getArcs1(jAddr)) {
                        if (!zTagsPattern || zTagsPattern.test(this.lArcVal[nMorphVal])) {
                            yield [sWord, sStem, this.lArcVal[nMorphVal]];
                        }
                    }
                }
            }
        }
    }

    _morph1 (sWord) {
        // returns morphologies of sWord
        let iAddr = 0;
        for (let c of sWord) {
            if (!this.dChar.has(c)) {
                return [];
            }
            iAddr = this._lookupArcNode(this.dChar.get(c), iAddr);
            if (iAddr === null) {
                return [];
            }
        }
        if (this._convBytesToInteger(this.byDic.slice(iAddr, iAddr+this.nBytesArc)) & this._finalNodeMask) {
            let l = [];
            let nRawArc = 0;
            while (!(nRawArc & this._lastArcMask)) {
                let iEndArcAddr = iAddr + this.nBytesArc;
                nRawArc = this._convBytesToInteger(this.byDic.slice(iAddr, iEndArcAddr));
                let nArc = nRawArc & this._arcMask;
                if (nArc > this.nChar) {
                    // This value is not a char, this is a stemming code
                    let sStem = ">" + this.funcStemming(sWord, this.lArcVal[nArc]);
                    // Now , we go to the next node and retrieve all following arcs values, all of them are tags
                    let iAddr2 = this._convBytesToInteger(this.byDic.slice(iEndArcAddr, iEndArcAddr+this.nBytesNodeAddress));
                    let nRawArc2 = 0;
                    while (!(nRawArc2 & this._lastArcMask)) {
                        let iEndArcAddr2 = iAddr2 + this.nBytesArc;
                        nRawArc2 = this._convBytesToInteger(this.byDic.slice(iAddr2, iEndArcAddr2));
                        l.push(sStem + "/" + this.lArcVal[nRawArc2 & this._arcMask]);
                        iAddr2 = iEndArcAddr2+this.nBytesNodeAddress;
                    }
                }
                iAddr = iEndArcAddr + this.nBytesNodeAddress;
            }
            return l;
        }
        return [];
    }

    _stem1 (sWord) {
        // returns stems list of sWord
        let iAddr = 0;
        for (let c of sWord) {
            if (!this.dChar.has(c)) {
                return [];
            }
            iAddr = this._lookupArcNode(this.dChar.get(c), iAddr);
            if (iAddr === null) {
                return [];
            }
        }
        if (this._convBytesToInteger(this.byDic.slice(iAddr, iAddr+this.nBytesArc)) & this._finalNodeMask) {
            let l = [];
            let nRawArc = 0;
            while (!(nRawArc & this._lastArcMask)) {
                let iEndArcAddr = iAddr + this.nBytesArc;
                nRawArc = this._convBytesToInteger(this.byDic.slice(iAddr, iEndArcAddr));
                let nArc = nRawArc & this._arcMask;
                if (nArc > this.nChar) {
                    // This value is not a char, this is a stemming code
                    l.push(this.funcStemming(sWord, this.lArcVal[nArc]));
                }
                iAddr = iEndArcAddr + this.nBytesNodeAddress;
            }
            return l;
        }
        return [];
    }

    _lookupArcNode1 (nVal, iAddr) {
        // looks if nVal is an arc at the node at iAddr, if yes, returns address of next node else None
        while (true) {
            let iEndArcAddr = iAddr+this.nBytesArc;
            let nRawArc = this._convBytesToInteger(this.byDic.slice(iAddr, iEndArcAddr));
            if (nVal == (nRawArc & this._arcMask)) {
                // the value we are looking for
                // we return the address of the next node
                return this._convBytesToInteger(this.byDic.slice(iEndArcAddr, iEndArcAddr+this.nBytesNodeAddress));
            }
            else {
                // value not found
                if (nRawArc & this._lastArcMask) {
                    return null;
                }
                iAddr = iEndArcAddr + this.nBytesNodeAddress;
            }
        }
    }

    * _getArcs1 (iAddr) {
        // generator: return all arcs at <iAddr> as tuples of (nVal, iAddr)
        while (true) {
            let iEndArcAddr = iAddr+this.nBytesArc;
            let nRawArc = this._convBytesToInteger(this.byDic.slice(iAddr, iEndArcAddr));
            yield [nRawArc & this._arcMask, this._convBytesToInteger(this.byDic.slice(iEndArcAddr, iEndArcAddr+this.nBytesNodeAddress))];
            if (nRawArc & this._lastArcMask) {
                break;
            }
            iAddr = iEndArcAddr+this.nBytesNodeAddress;
        }
    }

    // VERSION 2
    _morph2 (sWord) {
        // to do
    }

    _stem2 (sWord) {
        // to do
    }

    _lookupArcNode2 (nVal, iAddr) {
        // to do
    }


    // VERSION 3
    _morph3 (sWord) {
        // to do
    }

    _stem3 (sWord) {
        // to do
    }

    _lookupArcNode3 (nVal, iAddr) {
        // to do
    }
}


if (typeof(exports) !== 'undefined') {
    exports.IBDAWG = IBDAWG;
}
