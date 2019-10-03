// Grammar checker engine
/*jslint esversion: 6*/
/*global console,require,exports*/

"use strict";


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
        return (this.search(/^[a-zA-Zà-öÀ-Öø-ÿØ-ßĀ-ʯ]+$/) !== -1);
    };
    String.prototype.gl_isLowerCase = function () {
        return (this.search(/^[a-zà-öø-ÿ0-9-]+$/) !== -1);
    };
    String.prototype.gl_isUpperCase = function () {
        return (this.search(/^[A-ZÀ-ÖØ-ßŒ0-9-]+$/) !== -1);
    };
    String.prototype.gl_isTitle = function () {
        return (this.search(/^[A-ZÀ-ÖØ-ßŒ][a-zà-öø-ÿ'’-]+$/) !== -1);
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


// regex
/*jslint esversion: 6*/

if (RegExp.prototype.grammalecte === undefined) {
    RegExp.prototype.gl_exec2 = function (sText, aGroupsPos, aNegLookBefore=null) {
        let m;
        while ((m = this.exec(sText)) !== null) {
            // we have to iterate over sText here too
            // because first match doesn’t imply it’s a valid match according to negative lookbefore assertions,
            // and even if first match is finally invalid, it doesn’t mean the following eligible matchs would be invalid too.
            if (aNegLookBefore !== null) {
                // check negative look before assertions
                if ( !aNegLookBefore.some(sRegEx  =>  (RegExp.leftContext.search(sRegEx) >= 0)) ) {
                    break;
                }
            } else {
                break;
            }
        }
        if (m === null) {
            return null;
        }

        let codePos;
        let iPos = 0;
        m.start = [m.index];
        m.end = [this.lastIndex];
        try {
            if (m.length > 1) {
                // there is subgroup(s)
                if (aGroupsPos !== null) {
                    // aGroupsPos is defined
                    for (let i = 1; i <= m.length-1; i++) {
                        codePos = aGroupsPos[i-1];
                        if (typeof codePos === "number") {
                            // position as a number
                            m.start.push(m.index + codePos);
                            m.end.push(m.index + codePos + m[i].length);
                        } else if (codePos === "$") {
                            // at the end of the pattern
                            m.start.push(this.lastIndex - m[i].length);
                            m.end.push(this.lastIndex);
                        } else if (codePos === "w") {
                            // word in the middle of the pattern
                            iPos = m[0].search("[ ’,()«»“”]"+m[i]+"[ ,’()«»“”]") + 1 + m.index;
                            m.start.push(iPos);
                            m.end.push(iPos + m[i].length);
                        } else if (codePos === "*") {
                            // anywhere
                            iPos = m[0].indexOf(m[i]) + m.index;
                            m.start.push(iPos);
                            m.end.push(iPos + m[i].length);
                        } else if (codePos === "**") {
                            // anywhere after previous group
                            iPos = m[0].indexOf(m[i], m.end[i-1]-m.index) + m.index;
                            m.start.push(iPos);
                            m.end.push(iPos + m[i].length);
                        } else if (codePos.startsWith(">")) {
                            // >x:_
                            // todo: look in substring x
                            iPos = m[0].indexOf(m[i]) + m.index;
                            m.start.push(iPos);
                            m.end.push(iPos + m[i].length);
                        } else {
                            console.error("# Error: unknown positioning code in regex [" + this.source + "], for group[" + i.toString() +"], code: [" + codePos + "]");
                        }
                    }
                } else {
                    // no aGroupsPos
                    for (let subm of m.slice(1)) {
                        iPos = m[0].indexOf(subm) + m.index;
                        m.start.push(iPos);
                        m.end.push(iPos + subm.length);
                    }
                }
            }
        }
        catch (e) {
            console.error(e);
        }
        return m;
    };

    RegExp.prototype.grammalecte = true;
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



if (typeof(require) !== 'undefined') {
    //var helpers = require("resource://grammalecte/graphspell/helpers.js");
    var gc_options = require("resource://grammalecte/fr/gc_options.js");
    var gc_rules = require("resource://grammalecte/fr/gc_rules.js");
    var cregex = require("resource://grammalecte/fr/cregex.js");
    var text = require("resource://grammalecte/text.js");
}


function capitalizeArray (aArray) {
    // can’t map on user defined function??
    let aNew = [];
    for (let i = 0; i < aArray.length; i = i + 1) {
        aNew[i] = aArray[i].gl_toCapitalize();
    }
    return aNew;
}


// data
let _sAppContext = "";                                  // what software is running
let _dOptions = null;
let _aIgnoredRules = new Set();
let _oSpellChecker = null;
let _dAnalyses = new Map();                             // cache for data from dictionary


var gc_engine = {

    //// Informations

    lang: "fr",
    locales: {'fr-FR': ['fr', 'FR', ''], 'fr-BE': ['fr', 'BE', ''], 'fr-CA': ['fr', 'CA', ''], 'fr-CH': ['fr', 'CH', ''], 'fr-LU': ['fr', 'LU', ''], 'fr-BF': ['fr', 'BF', ''], 'fr-BJ': ['fr', 'BJ', ''], 'fr-CD': ['fr', 'CD', ''], 'fr-CI': ['fr', 'CI', ''], 'fr-CM': ['fr', 'CM', ''], 'fr-MA': ['fr', 'MA', ''], 'fr-ML': ['fr', 'ML', ''], 'fr-MU': ['fr', 'MU', ''], 'fr-NE': ['fr', 'NE', ''], 'fr-RE': ['fr', 'RE', ''], 'fr-SN': ['fr', 'SN', ''], 'fr-TG': ['fr', 'TG', '']},
    pkg: "grammalecte",
    name: "Grammalecte",
    version: "0.6.5",
    author: "Olivier R.",

    //// Parsing

    parse: function (sText, sCountry="FR", bDebug=false, bContext=false) {
        // analyses the paragraph sText and returns list of errors
        let dErrors;
        let errs;
        let sAlt = sText;
        let dDA = new Map();        // Disamnbiguator
        let dPriority = new Map();  // Key = position; value = priority
        let sNew = "";

        // parse paragraph
        try {
            [sNew, dErrors] = this._proofread(sText, sAlt, 0, true, dDA, dPriority, sCountry, bDebug, bContext);
            if (sNew) {
                sText = sNew;
            }
        }
        catch (e) {
            console.error(e);
        }

        // cleanup
        if (sText.includes(" ")) {
            sText = sText.replace(/ /g, ' '); // nbsp
        }
        if (sText.includes(" ")) {
            sText = sText.replace(/ /g, ' '); // snbsp
        }
        if (sText.includes("'")) {
            sText = sText.replace(/'/g, "’");
        }
        if (sText.includes("‑")) {
            sText = sText.replace(/‑/g, "-"); // nobreakdash
        }

        // parse sentence
        for (let [iStart, iEnd] of this._getSentenceBoundaries(sText)) {
            if (4 < (iEnd - iStart) < 2000) {
                dDA.clear();
                try {
                    [, errs] = this._proofread(sText.slice(iStart, iEnd), sAlt.slice(iStart, iEnd), iStart, false, dDA, dPriority, sCountry, bDebug, bContext);
                    dErrors.gl_update(errs);
                }
                catch (e) {
                    console.error(e);
                }
            }
        }
        return Array.from(dErrors.values());
    },

    _zEndOfSentence: new RegExp ('([.?!:;…][ .?!… »”")]*|.$)', "g"),
    _zBeginOfParagraph: new RegExp ("^[-  –—.,;?!…]*", "ig"),
    _zEndOfParagraph: new RegExp ("[-  .,;?!…–—]*$", "ig"),

    _getSentenceBoundaries: function* (sText) {
        let mBeginOfSentence = this._zBeginOfParagraph.exec(sText);
        let iStart = this._zBeginOfParagraph.lastIndex;
        let m;
        while ((m = this._zEndOfSentence.exec(sText)) !== null) {
            yield [iStart, this._zEndOfSentence.lastIndex];
            iStart = this._zEndOfSentence.lastIndex;
        }
    },

    _proofread: function (s, sx, nOffset, bParagraph, dDA, dPriority, sCountry, bDebug, bContext) {
        let dErrs = new Map();
        let bChange = false;
        let bIdRule = option('idrule');
        let m;
        let bCondMemo;
        let nErrorStart;

        for (let [sOption, lRuleGroup] of this._getRules(bParagraph)) {
            if (!sOption || option(sOption)) {
                for (let [zRegex, bUppercase, sLineId, sRuleId, nPriority, lActions, lGroups, lNegLookBefore] of lRuleGroup) {
                    if (!_aIgnoredRules.has(sRuleId)) {
                        while ((m = zRegex.gl_exec2(s, lGroups, lNegLookBefore)) !== null) {
                            bCondMemo = null;
                            /*if (bDebug) {
                                console.log(">>>> Rule # " + sLineId + " - Text: " + s + " opt: "+ sOption);
                            }*/
                            for (let [sFuncCond, cActionType, sWhat, ...eAct] of lActions) {
                            // action in lActions: [ condition, action type, replacement/suggestion/action[, iGroup[, message, URL]] ]
                                try {
                                    //console.log(oEvalFunc[sFuncCond]);
                                    bCondMemo = (!sFuncCond || oEvalFunc[sFuncCond](s, sx, m, dDA, sCountry, bCondMemo));
                                    if (bCondMemo) {
                                        switch (cActionType) {
                                            case "-":
                                                // grammar error
                                                //console.log("-> error detected in " + sLineId + "\nzRegex: " + zRegex.source);
                                                nErrorStart = nOffset + m.start[eAct[0]];
                                                if (!dErrs.has(nErrorStart) || nPriority > dPriority.get(nErrorStart)) {
                                                    dErrs.set(nErrorStart, this._createError(s, sx, sWhat, nOffset, m, eAct[0], sLineId, sRuleId, bUppercase, eAct[1], eAct[2], bIdRule, sOption, bContext));
                                                    dPriority.set(nErrorStart, nPriority);
                                                }
                                                break;
                                            case "~":
                                                // text processor
                                                //console.log("-> text processor by " + sLineId + "\nzRegex: " + zRegex.source);
                                                s = this._rewrite(s, sWhat, eAct[0], m, bUppercase);
                                                bChange = true;
                                                if (bDebug) {
                                                    console.log("~ " + s + "  -- " + m[eAct[0]] + "  # " + sLineId);
                                                }
                                                break;
                                            case "=":
                                                // disambiguation
                                                //console.log("-> disambiguation by " + sLineId + "\nzRegex: " + zRegex.source);
                                                oEvalFunc[sWhat](s, m, dDA);
                                                if (bDebug) {
                                                    console.log("= " + m[0] + "  # " + sLineId + "\nDA: " + dDA.gl_toString());
                                                }
                                                break;
                                            case ">":
                                                // we do nothing, this test is just a condition to apply all following actions
                                                break;
                                            default:
                                                console.log("# error: unknown action at " + sLineId);
                                        }
                                    } else {
                                        if (cActionType == ">") {
                                            break;
                                        }
                                    }
                                }
                                catch (e) {
                                    console.log(s);
                                    console.log("# line id: " + sLineId + "\n# rule id: " + sRuleId);
                                    console.error(e);
                                }
                            }
                        }
                    }
                }
            }
        }
        if (bChange) {
            return [s, dErrs];
        }
        return [false, dErrs];
    },

    _createError: function (s, sx, sRepl, nOffset, m, iGroup, sLineId, sRuleId, bUppercase, sMsg, sURL, bIdRule, sOption, bContext) {
        let oErr = {};
        oErr["nStart"] = nOffset + m.start[iGroup];
        oErr["nEnd"] = nOffset + m.end[iGroup];
        oErr["sLineId"] = sLineId;
        oErr["sRuleId"] = sRuleId;
        oErr["sType"] = (sOption) ? sOption : "notype";
        // suggestions
        if (sRepl.slice(0,1) === "=") {
            let sugg = oEvalFunc[sRepl.slice(1)](s, m);
            if (sugg) {
                if (bUppercase && m[iGroup].slice(0,1).gl_isUpperCase()) {
                    oErr["aSuggestions"] = capitalizeArray(sugg.split("|"));
                } else {
                    oErr["aSuggestions"] = sugg.split("|");
                }
            } else {
                oErr["aSuggestions"] = [];
            }
        } else if (sRepl == "_") {
            oErr["aSuggestions"] = [];
        } else {
            if (bUppercase && m[iGroup].slice(0,1).gl_isUpperCase()) {
                oErr["aSuggestions"] = capitalizeArray(sRepl.gl_expand(m).split("|"));
            } else {
                oErr["aSuggestions"] = sRepl.gl_expand(m).split("|");
            }
        }
        // Message
        let sMessage = "";
        if (sMsg.slice(0,1) === "=") {
            sMessage = oEvalFunc[sMsg.slice(1)](s, m);
        } else {
            sMessage = sMsg.gl_expand(m);
        }
        if (bIdRule) {
            sMessage += " ##" + sLineId + " #" + sRuleId;
        }
        oErr["sMessage"] = sMessage;
        // URL
        oErr["URL"] = sURL || "";
        // Context
        if (bContext) {
            oErr["sUnderlined"] = sx.slice(m.start[iGroup], m.end[iGroup]);
            oErr["sBefore"] = sx.slice(Math.max(0, m.start[iGroup]-80), m.start[iGroup]);
            oErr["sAfter"] = sx.slice(m.end[iGroup], m.end[iGroup]+80);
        }
        return oErr;
    },

    _rewrite: function (s, sRepl, iGroup, m, bUppercase) {
        // text processor: write sRepl in s at iGroup position"
        let ln = m.end[iGroup] - m.start[iGroup];
        let sNew = "";
        if (sRepl === "*") {
            sNew = " ".repeat(ln);
        } else if (sRepl === ">" || sRepl === "_" || sRepl === "~") {
            sNew = sRepl + " ".repeat(ln-1);
        } else if (sRepl === "@") {
            sNew = "@".repeat(ln);
        } else if (sRepl.slice(0,1) === "=") {
            sNew = oEvalFunc[sRepl.slice(1)](s, m);
            sNew = sNew + " ".repeat(ln-sNew.length);
            if (bUppercase && m[iGroup].slice(0,1).gl_isUpperCase()) {
                sNew = sNew.gl_toCapitalize();
            }
        } else {
            sNew = sRepl.gl_expand(m);
            sNew = sNew + " ".repeat(ln-sNew.length);
        }
        //console.log("\n"+s+"\nstart: "+m.start[iGroup]+" end:"+m.end[iGroup])
        return s.slice(0, m.start[iGroup]) + sNew + s.slice(m.end[iGroup]);
    },

    // Actions on rules

    ignoreRule: function (sRuleId) {
        _aIgnoredRules.add(sRuleId);
    },

    resetIgnoreRules: function () {
        _aIgnoredRules.clear();
    },

    reactivateRule: function (sRuleId) {
        _aIgnoredRules.delete(sRuleId);
    },

    listRules: function* (sFilter=null) {
        // generator: returns tuple (sOption, sLineId, sRuleId)
        try {
            for (let [sOption, lRuleGroup] of this._getRules(true)) {
                for (let [,, sLineId, sRuleId,,] of lRuleGroup) {
                    if (!sFilter || sRuleId.test(sFilter)) {
                        yield [sOption, sLineId, sRuleId];
                    }
                }
            }
            for (let [sOption, lRuleGroup] of this._getRules(false)) {
                for (let [,, sLineId, sRuleId,,] of lRuleGroup) {
                    if (!sFilter || sRuleId.test(sFilter)) {
                        yield [sOption, sLineId, sRuleId];
                    }
                }
            }
        }
        catch (e) {
            console.error(e);
        }
    },

    _getRules: function (bParagraph) {
        if (!bParagraph) {
            return gc_rules.lSentenceRules;
        }
        return gc_rules.lParagraphRules;
    },

    //// Initialization

    load: function (sContext="JavaScript", sPath="") {
        try {
            if (typeof(require) !== 'undefined') {
                var spellchecker = require("resource://grammalecte/graphspell/spellchecker.js");
                _oSpellChecker = new spellchecker.SpellChecker("fr", "", "fr-allvars.json", "", "", "");
            } else {
                _oSpellChecker = new SpellChecker("fr", sPath, "fr-allvars.json", "", "", "");
            }
            _sAppContext = sContext;
            _dOptions = gc_options.getOptions(sContext).gl_shallowCopy();     // duplication necessary, to be able to reset to default
        }
        catch (e) {
            console.error(e);
        }
    },

    getSpellChecker: function () {
        return _oSpellChecker;
    },

    //// Options

    setOption: function (sOpt, bVal) {
        if (_dOptions.has(sOpt)) {
            _dOptions.set(sOpt, bVal);
        }
    },

    setOptions: function (dOpt) {
        _dOptions.gl_updateOnlyExistingKeys(dOpt);
    },

    getOptions: function () {
        return _dOptions;
    },

    getDefaultOptions: function () {
        return gc_options.getOptions(_sAppContext).gl_shallowCopy();
    },

    resetOptions: function () {
        _dOptions = gc_options.getOptions(_sAppContext).gl_shallowCopy();
    }
};


//////// Common functions

function option (sOpt) {
    // return true if option sOpt is active
    return _dOptions.get(sOpt);
}

function displayInfo (dDA, aWord) {
    // for debugging: info of word
    if (!aWord) {
        console.log("> nothing to find");
        return true;
    }
    if (!_dAnalyses.has(aWord[1]) && !_storeMorphFromFSA(aWord[1])) {
        console.log("> not in FSA");
        return true;
    }
    if (dDA.has(aWord[0])) {
        console.log("DA: " + dDA.get(aWord[0]));
    }
    console.log("FSA: " + _dAnalyses.get(aWord[1]));
    return true;
}

function _storeMorphFromFSA (sWord) {
    // retrieves morphologies list from _oSpellChecker -> _dAnalyses
    //console.log("register: "+sWord + " " + _oSpellChecker.getMorph(sWord).toString())
    _dAnalyses.set(sWord, _oSpellChecker.getMorph(sWord));
    return !!_dAnalyses.get(sWord);
}

function morph (dDA, aWord, sPattern, bStrict=true, bNoWord=false) {
    // analyse a tuple (position, word), return true if sPattern in morphologies (disambiguation on)
    if (!aWord) {
        //console.log("morph: noword, returns " + bNoWord);
        return bNoWord;
    }
    //console.log("aWord: "+aWord.toString());
    if (!_dAnalyses.has(aWord[1]) && !_storeMorphFromFSA(aWord[1])) {
        return false;
    }
    let lMorph = dDA.has(aWord[0]) ? dDA.get(aWord[0]) : _dAnalyses.get(aWord[1]);
    //console.log("lMorph: "+lMorph.toString());
    if (lMorph.length === 0) {
        return false;
    }
    //console.log("***");
    if (bStrict) {
        return lMorph.every(s  =>  (s.search(sPattern) !== -1));
    }
    return lMorph.some(s  =>  (s.search(sPattern) !== -1));
}

function morphex (dDA, aWord, sPattern, sNegPattern, bNoWord=false) {
    // analyse a tuple (position, word), returns true if not sNegPattern in word morphologies and sPattern in word morphologies (disambiguation on)
    if (!aWord) {
        //console.log("morph: noword, returns " + bNoWord);
        return bNoWord;
    }
    //console.log("aWord: "+aWord.toString());
    if (!_dAnalyses.has(aWord[1]) && !_storeMorphFromFSA(aWord[1])) {
        return false;
    }
    let lMorph = dDA.has(aWord[0]) ? dDA.get(aWord[0]) : _dAnalyses.get(aWord[1]);
    //console.log("lMorph: "+lMorph.toString());
    if (lMorph.length === 0) {
        return false;
    }
    //console.log("***");
    // check negative condition
    if (lMorph.some(s  =>  (s.search(sNegPattern) !== -1))) {
        return false;
    }
    // search sPattern
    return lMorph.some(s  =>  (s.search(sPattern) !== -1));
}

function analyse (sWord, sPattern, bStrict=true) {
    // analyse a word, return true if sPattern in morphologies (disambiguation off)
    if (!_dAnalyses.has(sWord) && !_storeMorphFromFSA(sWord)) {
        return false;
    }
    if (bStrict) {
        return _dAnalyses.get(sWord).every(s  =>  (s.search(sPattern) !== -1));
    }
    return _dAnalyses.get(sWord).some(s  =>  (s.search(sPattern) !== -1));
}

function analysex (sWord, sPattern, sNegPattern) {
    // analyse a word, returns True if not sNegPattern in word morphologies and sPattern in word morphologies (disambiguation off)
    if (!_dAnalyses.has(sWord) && !_storeMorphFromFSA(sWord)) {
        return false;
    }
    // check negative condition
    if (_dAnalyses.get(sWord).some(s  =>  (s.search(sNegPattern) !== -1))) {
        return false;
    }
    // search sPattern
    return _dAnalyses.get(sWord).some(s  =>  (s.search(sPattern) !== -1));
}

function stem (sWord) {
    // returns a list of sWord's stems
    if (!sWord) {
        return [];
    }
    if (!_dAnalyses.has(sWord) && !_storeMorphFromFSA(sWord)) {
        return [];
    }
    return _dAnalyses.get(sWord).map( s => s.slice(1, s.indexOf(" ")) );
}


//// functions to get text outside pattern scope

// warning: check compile_rules.py to understand how it works

function nextword (s, iStart, n) {
    // get the nth word of the input string or empty string
    let z = new RegExp("^(?: +[a-zà-öA-Zø-ÿÀ-Ö0-9Ø-ßĀ-ʯﬁ-ﬆ%_-]+){" + (n-1).toString() + "} +([a-zà-öA-Zø-ÿÀ-Ö0-9Ø-ßĀ-ʯﬁ-ﬆ%_-]+)", "ig");
    let m = z.exec(s.slice(iStart));
    if (!m) {
        return null;
    }
    return [iStart + z.lastIndex - m[1].length, m[1]];
}

function prevword (s, iEnd, n) {
    // get the (-)nth word of the input string or empty string
    let z = new RegExp("([a-zà-öA-Zø-ÿÀ-Ö0-9Ø-ßĀ-ʯﬁ-ﬆ%_-]+) +(?:[a-zà-öA-Zø-ÿÀ-Ö0-9Ø-ßĀ-ʯﬁ-ﬆ%_-]+ +){" + (n-1).toString() + "}$", "i");
    let m = z.exec(s.slice(0, iEnd));
    if (!m) {
        return null;
    }
    return [m.index, m[1]];
}

function nextword1 (s, iStart) {
    // get next word (optimization)
    let _zNextWord = new RegExp ("^ +([a-zà-öA-Zø-ÿÀ-Ö0-9Ø-ßĀ-ʯﬁ-ﬆ_][a-zà-öA-Zø-ÿÀ-Ö0-9Ø-ßĀ-ʯﬁ-ﬆ_-]*)", "ig");
    let m = _zNextWord.exec(s.slice(iStart));
    if (!m) {
        return null;
    }
    return [iStart + _zNextWord.lastIndex - m[1].length, m[1]];
}

const _zPrevWord = new RegExp ("([a-zà-öA-Zø-ÿÀ-Ö0-9Ø-ßĀ-ʯﬁ-ﬆ_][a-zà-öA-Zø-ÿÀ-Ö0-9Ø-ßĀ-ʯﬁ-ﬆ_-]*) +$", "i");

function prevword1 (s, iEnd) {
    // get previous word (optimization)
    let m = _zPrevWord.exec(s.slice(0, iEnd));
    if (!m) {
        return null;
    }
    return [m.index, m[1]];
}

function look (s, zPattern, zNegPattern=null) {
    // seek zPattern in s (before/after/fulltext), if antipattern zNegPattern not in s
    try {
        if (zNegPattern && zNegPattern.test(s)) {
            return false;
        }
        return zPattern.test(s);
    }
    catch (e) {
        console.error(e);
    }
    return false;
}

function look_chk1 (dDA, s, nOffset, zPattern, sPatternGroup1, sNegPatternGroup1=null) {
    // returns True if s has pattern zPattern and m.group(1) has pattern sPatternGroup1
    let m = zPattern.gl_exec2(s, null);
    if (!m) {
        return false;
    }
    try {
        let sWord = m[1];
        let nPos = m.start[1] + nOffset;
        if (sNegPatternGroup1) {
            return morphex(dDA, [nPos, sWord], sPatternGroup1, sNegPatternGroup1);
        }
        return morph(dDA, [nPos, sWord], sPatternGroup1, false);
    }
    catch (e) {
        console.error(e);
        return false;
    }
}


//////// Disambiguator

function select (dDA, nPos, sWord, sPattern, lDefault=null) {
    if (!sWord) {
        return true;
    }
    if (dDA.has(nPos)) {
        return true;
    }
    if (!_dAnalyses.has(sWord) && !_storeMorphFromFSA(sWord)) {
        return true;
    }
    if (_dAnalyses.get(sWord).length === 1) {
        return true;
    }
    let lSelect = _dAnalyses.get(sWord).filter( sMorph => sMorph.search(sPattern) !== -1 );
    if (lSelect.length > 0) {
        if (lSelect.length != _dAnalyses.get(sWord).length) {
            dDA.set(nPos, lSelect);
        }
    } else if (lDefault) {
        dDA.set(nPos, lDefaul);
    }
    return true;
}

function exclude (dDA, nPos, sWord, sPattern, lDefault=null) {
    if (!sWord) {
        return true;
    }
    if (dDA.has(nPos)) {
        return true;
    }
    if (!_dAnalyses.has(sWord) && !_storeMorphFromFSA(sWord)) {
        return true;
    }
    if (_dAnalyses.get(sWord).length === 1) {
        return true;
    }
    let lSelect = _dAnalyses.get(sWord).filter( sMorph => sMorph.search(sPattern) === -1 );
    if (lSelect.length > 0) {
        if (lSelect.length != _dAnalyses.get(sWord).length) {
            dDA.set(nPos, lSelect);
        }
    } else if (lDefault) {
        dDA.set(nPos, lDefault);
    }
    return true;
}

function define (dDA, nPos, lMorph) {
    dDA.set(nPos, lMorph);
    return true;
}


//////// GRAMMAR CHECKER PLUGINS



//// GRAMMAR CHECKING ENGINE PLUGIN: Parsing functions for French language
/*jslint esversion: 6*/

function rewriteSubject (s1, s2) {
    // s1 is supposed to be prn/patr/npr (M[12P])
    if (s2 == "lui") {
        return "ils";
    }
    if (s2 == "moi") {
        return "nous";
    }
    if (s2 == "toi") {
        return "vous";
    }
    if (s2 == "nous") {
        return "nous";
    }
    if (s2 == "vous") {
        return "vous";
    }
    if (s2 == "eux") {
        return "ils";
    }
    if (s2 == "elle" || s2 == "elles") {
        // We don’t check if word exists in _dAnalyses, for it is assumed it has been done before
        if (cregex.mbNprMasNotFem(_dAnalyses.gl_get(s1, ""))) {
            return "ils";
        }
        // si épicène, indéterminable, mais OSEF, le féminin l’emporte
        return "elles";
    }
    return s1 + " et " + s2;
}

function apposition (sWord1, sWord2) {
    // returns true if nom + nom (no agreement required)
    // We don’t check if word exists in _dAnalyses, for it is assumed it has been done before
    return cregex.mbNomNotAdj(_dAnalyses.gl_get(sWord2, "")) && cregex.mbPpasNomNotAdj(_dAnalyses.gl_get(sWord1, ""));
}

function isAmbiguousNAV (sWord) {
    // words which are nom|adj and verb are ambiguous (except être and avoir)
    if (!_dAnalyses.has(sWord) && !_storeMorphFromFSA(sWord)) {
        return false;
    }
    if (!cregex.mbNomAdj(_dAnalyses.gl_get(sWord, "")) || sWord == "est") {
        return false;
    }
    if (cregex.mbVconj(_dAnalyses.gl_get(sWord, "")) && !cregex.mbMG(_dAnalyses.gl_get(sWord, ""))) {
        return true;
    }
    return false;
}

function isAmbiguousAndWrong (sWord1, sWord2, sReqMorphNA, sReqMorphConj) {
    //// use it if sWord1 won’t be a verb; word2 is assumed to be true via isAmbiguousNAV
    // We don’t check if word exists in _dAnalyses, for it is assumed it has been done before
    let a2 = _dAnalyses.gl_get(sWord2, null);
    if (!a2 || a2.length === 0) {
        return false;
    }
    if (cregex.checkConjVerb(a2, sReqMorphConj)) {
        // verb word2 is ok
        return false;
    }
    let a1 = _dAnalyses.gl_get(sWord1, null);
    if (!a1 || a1.length === 0) {
        return false;
    }
    if (cregex.checkAgreement(a1, a2) && (cregex.mbAdj(a2) || cregex.mbAdj(a1))) {
        return false;
    }
    return true;
}

function isVeryAmbiguousAndWrong (sWord1, sWord2, sReqMorphNA, sReqMorphConj, bLastHopeCond) {
    //// use it if sWord1 can be also a verb; word2 is assumed to be true via isAmbiguousNAV
    // We don’t check if word exists in _dAnalyses, for it is assumed it has been done before
    let a2 = _dAnalyses.gl_get(sWord2, null);
    if (!a2 || a2.length === 0) {
        return false;
    }
    if (cregex.checkConjVerb(a2, sReqMorphConj)) {
        // verb word2 is ok
        return false;
    }
    let a1 = _dAnalyses.gl_get(sWord1, null);
    if (!a1 || a1.length === 0) {
        return false;
    }
    if (cregex.checkAgreement(a1, a2) && (cregex.mbAdj(a2) || cregex.mbAdjNb(a1))) {
        return false;
    }
    // now, we know there no agreement, and conjugation is also wrong
    if (cregex.isNomAdj(a1)) {
        return true;
    }
    //if cregex.isNomAdjVerb(a1): # considered true
    if (bLastHopeCond) {
        return true;
    }
    return false;
}

function checkAgreement (sWord1, sWord2) {
    // We don’t check if word exists in _dAnalyses, for it is assumed it has been done before
    let a2 = _dAnalyses.gl_get(sWord2, null);
    if (!a2 || a2.length === 0) {
        return true;
    }
    let a1 = _dAnalyses.gl_get(sWord1, null);
    if (!a1 || a1.length === 0) {
        return true;
    }
    return cregex.checkAgreement(a1, a2);
}

function mbUnit (s) {
    if (/[µ\/⁰¹²³⁴⁵⁶⁷⁸⁹Ωℓ·]/.test(s)) {
        return true;
    }
    if (s.length > 1 && s.length < 16 && s.slice(0, 1).gl_isLowerCase() && (!s.slice(1).gl_isLowerCase() || /[0-9]/.test(s))) {
        return true;
    }
    return false;
}


//// Syntagmes

const _zEndOfNG1 = new RegExp ("^ *$|^ +(?:, +|)(?:n(?:’|e |o(?:u?s|tre) )|l(?:’|e(?:urs?|s|) |a )|j(?:’|e )|m(?:’|es? |a |on )|t(?:’|es? |a |u )|s(?:’|es? |a )|c(?:’|e(?:t|tte|s|) )|ç(?:a |’)|ils? |vo(?:u?s|tre) )");
const _zEndOfNG2 = new RegExp ("^ +([a-zà-öA-Zø-ÿÀ-Ö0-9_Ø-ßĀ-ʯ][a-zà-öA-Zø-ÿÀ-Ö0-9_Ø-ßĀ-ʯ-]+)");
const _zEndOfNG3 = new RegExp ("^ *, +([a-zà-öA-Zø-ÿÀ-Ö0-9_Ø-ßĀ-ʯ][a-zà-öA-Zø-ÿÀ-Ö0-9_Ø-ßĀ-ʯ-]+)");

function isEndOfNG (dDA, s, iOffset) {
    if (_zEndOfNG1.test(s)) {
        return true;
    }
    let m = _zEndOfNG2.gl_exec2(s, ["$"]);
    if (m && morphex(dDA, [iOffset+m.start[1], m[1]], ":[VR]", ":[NAQP]")) {
        return true;
    }
    m = _zEndOfNG3.gl_exec2(s, ["$"]);
    if (m && !morph(dDA, [iOffset+m.start[1], m[1]], ":[NA]", false)) {
        return true;
    }
    return false;
}


const _zNextIsNotCOD1 = new RegExp ("^ *,");
const _zNextIsNotCOD2 = new RegExp ("^ +(?:[mtsnj](e +|’)|[nv]ous |tu |ils? |elles? )");
const _zNextIsNotCOD3 = new RegExp ("^ +([a-zéèî][a-zà-öA-Zø-ÿÀ-ÖØ-ßĀ-ʯ-]+)");

function isNextNotCOD (dDA, s, iOffset) {
    if (_zNextIsNotCOD1.test(s) || _zNextIsNotCOD2.test(s)) {
        return true;
    }
    let m = _zNextIsNotCOD3.gl_exec2(s, ["$"]);
    if (m && morphex(dDA, [iOffset+m.start[1], m[1]], ":[123][sp]", ":[DM]")) {
        return true;
    }
    return false;
}


const _zNextIsVerb1 = new RegExp ("^ +[nmts](?:e |’)");
const _zNextIsVerb2 = new RegExp ("^ +([a-zà-öA-Zø-ÿÀ-Ö0-9_Ø-ßĀ-ʯ][a-zà-öA-Zø-ÿÀ-Ö0-9_Ø-ßĀ-ʯ-]+)");

function isNextVerb (dDA, s, iOffset) {
    if (_zNextIsVerb1.test(s)) {
        return true;
    }
    let m = _zNextIsVerb2.gl_exec2(s, ["$"]);
    if (m && morph(dDA, [iOffset+m.start[1], m[1]], ":[123][sp]", false)) {
        return true;
    }
    return false;
}


//// Exceptions

const aREGULARPLURAL = new Set(["abricot", "amarante", "aubergine", "acajou", "anthracite", "brique", "caca", "café",
                                "carotte", "cerise", "chataigne", "corail", "citron", "crème", "grave", "groseille",
                                "jonquille", "marron", "olive", "pervenche", "prune", "sable"]);
const aSHOULDBEVERB = new Set(["aller", "manger"]);


//// GRAMMAR CHECKING ENGINE PLUGIN
/*jslint esversion: 6*/

// Check date validity

// WARNING: when creating a Date, month must be between 0 and 11


const _lDay = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const _dMonth = new Map ([
    ["janvier", 1], ["février", 2], ["mars", 3], ["avril", 4], ["mai", 5], ["juin", 6], ["juillet", 7],
    ["août", 8], ["aout", 8], ["septembre", 9], ["octobre", 10], ["novembre", 11], ["décembre", 12]
]);
const _dDaysInMonth = new Map ([
    [1, 31], [2, 28], [3, 31], [4, 30], [5, 31], [6, 30], [7, 31],
    [8, 31], [8, 31], [9, 30], [10, 31], [11, 30], [12, 31]
]);

function _checkDate (nDay, nMonth, nYear) {
    // returns true or false
    if (nMonth > 12 || nMonth < 1 || nDay > 31 || nDay < 1) {
        return false;
    }
    if (nDay <= _dDaysInMonth.get(nMonth)) {
        return true;
    }
    if (nDay === 29) {
        // leap years, http://jsperf.com/ily/15
        return !(nYear & 3 || !(nYear % 25) && nYear & 15);
    }
    return false;
}

function checkDate (sDay, sMonth, sYear) {
    // to use if sMonth is a number
    return _checkDate(parseInt(sDay, 10), parseInt(sMonth, 10), parseInt(sYear, 10));
}

function checkDateWithString (sDay, sMonth, sYear) {
    // to use if sMonth is a noun
    return _checkDate(parseInt(sDay, 10), _dMonth.get(sMonth.toLowerCase()), parseInt(sYear, 10));
}

function checkDay (sWeekday, sDay, sMonth, sYear) {
    // to use if sMonth is a number
    if (checkDate(sDay, sMonth, sYear)) {
        let oDate = new Date(parseInt(sYear, 10), parseInt(sMonth, 10)-1, parseInt(sDay, 10));
        if (_lDay[oDate.getDay()] != sWeekday.toLowerCase()) {
            return false;
        }
        return true;
    }
    return false;
}

function checkDayWithString (sWeekday, sDay, sMonth, sYear) {
    // to use if sMonth is a noun
    if (checkDateWithString(sDay, sMonth, sYear)) {
        let oDate = new Date(parseInt(sYear, 10), _dMonth.get(sMonth.toLowerCase())-1, parseInt(sDay, 10));
        if (_lDay[oDate.getDay()] != sWeekday.toLowerCase()) {
            return false;
        }
        return true;
    }
    return false;
}

function getDay (sDay, sMonth, sYear) {
    // to use if sMonth is a number
    let oDate = new Date(parseInt(sYear, 10), parseInt(sMonth, 10)-1, parseInt(sDay, 10));
    return _lDay[oDate.getDay()];
}

function getDayWithString (sDay, sMonth, sYear) {
    // to use if sMonth is a noun
    let oDate = new Date(parseInt(sYear, 10), _dMonth.get(sMonth.toLowerCase())-1, parseInt(sDay, 10));
    return _lDay[oDate.getDay()];
}


//// GRAMMAR CHECKING ENGINE PLUGIN: Suggestion mechanisms
/*jslint esversion: 6*/
/*global require*/

if (typeof(require) !== 'undefined') {
    var conj = require("resource://grammalecte/fr/conj.js");
    var mfsp = require("resource://grammalecte/fr/mfsp.js");
    var phonet = require("resource://grammalecte/fr/phonet.js");
}


//// verbs

function suggVerb (sFlex, sWho, funcSugg2=null) {
    // we don’t check if word exists in _dAnalyses, for it is assumed it has been done before
    let aSugg = new Set();
    for (let sStem of stem(sFlex)) {
        let tTags = conj._getTags(sStem);
        if (tTags) {
            // we get the tense
            let aTense = new Set();
            for (let sMorph of _dAnalyses.gl_get(sFlex, [])) {
                let m;
                let zVerb = new RegExp (">"+sStem+" .*?(:(?:Y|I[pqsf]|S[pq]|K))", "g");
                while ((m = zVerb.exec(sMorph)) !== null) {
                    // stem must be used in regex to prevent confusion between different verbs (e.g. sauras has 2 stems: savoir and saurer)
                    if (m) {
                        if (m[1] === ":Y") {
                            aTense.add(":Ip");
                            aTense.add(":Iq");
                            aTense.add(":Is");
                        } else if (m[1] === ":P") {
                            aTense.add(":Ip");
                        } else {
                            aTense.add(m[1]);
                        }
                    }
                }
            }
            for (let sTense of aTense) {
                if (sWho === ":1ś" && !conj._hasConjWithTags(tTags, sTense, ":1ś")) {
                    sWho = ":1s";
                }
                if (conj._hasConjWithTags(tTags, sTense, sWho)) {
                    aSugg.add(conj._getConjWithTags(sStem, tTags, sTense, sWho));
                }
            }
        }
    }
    if (funcSugg2) {
        let aSugg2 = funcSugg2(sFlex);
        if (aSugg2.size > 0) {
            aSugg.add(aSugg2);
        }
    }
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}

function suggVerbPpas (sFlex, sWhat=null) {
    let aSugg = new Set();
    for (let sStem of stem(sFlex)) {
        let tTags = conj._getTags(sStem);
        if (tTags) {
            if (!sWhat) {
                aSugg.add(conj._getConjWithTags(sStem, tTags, ":PQ", ":Q1"));
                aSugg.add(conj._getConjWithTags(sStem, tTags, ":PQ", ":Q2"));
                aSugg.add(conj._getConjWithTags(sStem, tTags, ":PQ", ":Q3"));
                aSugg.add(conj._getConjWithTags(sStem, tTags, ":PQ", ":Q4"));
                aSugg.delete("");
            } else if (sWhat === ":m:s") {
                aSugg.add(conj._getConjWithTags(sStem, tTags, ":PQ", ":Q1"));
            } else if (sWhat === ":m:p") {
                if (conj._hasConjWithTags(tTags, ":PQ", ":Q2")) {
                    aSugg.add(conj._getConjWithTags(sStem, tTags, ":PQ", ":Q2"));
                } else {
                    aSugg.add(conj._getConjWithTags(sStem, tTags, ":PQ", ":Q1"));
                }
            } else if (sWhat === ":f:s") {
                if (conj._hasConjWithTags(tTags, ":PQ", ":Q3")) {
                    aSugg.add(conj._getConjWithTags(sStem, tTags, ":PQ", ":Q3"));
                } else {
                    aSugg.add(conj._getConjWithTags(sStem, tTags, ":PQ", ":Q1"));
                }
            } else if (sWhat === ":f:p") {
                if (conj._hasConjWithTags(tTags, ":PQ", ":Q4")) {
                    aSugg.add(conj._getConjWithTags(sStem, tTags, ":PQ", ":Q4"));
                } else {
                    aSugg.add(conj._getConjWithTags(sStem, tTags, ":PQ", ":Q1"));
                }
            } else if (sWhat === ":s") {
                aSugg.add(conj._getConjWithTags(sStem, tTags, ":PQ", ":Q1"));
                aSugg.add(conj._getConjWithTags(sStem, tTags, ":PQ", ":Q3"));
                aSugg.delete("");
            } else if (sWhat === ":p") {
                aSugg.add(conj._getConjWithTags(sStem, tTags, ":PQ", ":Q2"));
                aSugg.add(conj._getConjWithTags(sStem, tTags, ":PQ", ":Q4"));
                aSugg.delete("");
            } else {
                aSugg.add(conj._getConjWithTags(sStem, tTags, ":PQ", ":Q1"));
            }
        }
    }
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}

function suggVerbTense (sFlex, sTense, sWho) {
    let aSugg = new Set();
    for (let sStem of stem(sFlex)) {
        if (conj.hasConj(sStem, sTense, sWho)) {
            aSugg.add(conj.getConj(sStem, sTense, sWho));
        }
    }
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}

function suggVerbImpe (sFlex) {
    let aSugg = new Set();
    for (let sStem of stem(sFlex)) {
        let tTags = conj._getTags(sStem);
        if (tTags) {
            if (conj._hasConjWithTags(tTags, ":E", ":2s")) {
                aSugg.add(conj._getConjWithTags(sStem, tTags, ":E", ":2s"));
            }
            if (conj._hasConjWithTags(tTags, ":E", ":1p")) {
                aSugg.add(conj._getConjWithTags(sStem, tTags, ":E", ":1p"));
            }
            if (conj._hasConjWithTags(tTags, ":E", ":2p")) {
                aSugg.add(conj._getConjWithTags(sStem, tTags, ":E", ":2p"));
            }
        }
    }
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}

function suggVerbInfi (sFlex) {
    return stem(sFlex).filter(sStem => conj.isVerb(sStem)).join("|");
}


const _dQuiEst = new Map ([
    ["je", ":1s"], ["j’", ":1s"], ["j’en", ":1s"], ["j’y", ":1s"],
    ["tu", ":2s"], ["il", ":3s"], ["on", ":3s"], ["elle", ":3s"],
    ["nous", ":1p"], ["vous", ":2p"], ["ils", ":3p"], ["elles", ":3p"]
]);
const _lIndicatif = [":Ip", ":Iq", ":Is", ":If"];
const _lSubjonctif = [":Sp", ":Sq"];

function suggVerbMode (sFlex, cMode, sSuj) {
    let lMode;
    if (cMode == ":I") {
        lMode = _lIndicatif;
    } else if (cMode == ":S") {
        lMode = _lSubjonctif;
    } else if (cMode.startsWith(":I") || cMode.startsWith(":S")) {
        lMode = [cMode];
    } else {
        return "";
    }
    let sWho = _dQuiEst.gl_get(sSuj.toLowerCase(), null);
    if (!sWho) {
        if (sSuj[0].gl_isLowerCase()) { // pas un pronom, ni un nom propre
            return "";
        }
        sWho = ":3s";
    }
    let aSugg = new Set();
    for (let sStem of stem(sFlex)) {
        let tTags = conj._getTags(sStem);
        if (tTags) {
            for (let sTense of lMode) {
                if (conj._hasConjWithTags(tTags, sTense, sWho)) {
                    aSugg.add(conj._getConjWithTags(sStem, tTags, sTense, sWho));
                }
            }
        }
    }
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}

//// Nouns and adjectives

function suggPlur (sFlex, sWordToAgree=null) {
    // returns plural forms assuming sFlex is singular
    if (sWordToAgree) {
        if (!_dAnalyses.has(sWordToAgree) && !_storeMorphFromFSA(sWordToAgree)) {
            return "";
        }
        let sGender = cregex.getGender(_dAnalyses.gl_get(sWordToAgree, []));
        if (sGender == ":m") {
            return suggMasPlur(sFlex);
        } else if (sGender == ":f") {
            return suggFemPlur(sFlex);
        }
    }
    let aSugg = new Set();
    if (!sFlex.includes("-")) {
        if (sFlex.endsWith("l")) {
            if (sFlex.endsWith("al") && sFlex.length > 2 && _oSpellChecker.isValid(sFlex.slice(0,-1)+"ux")) {
                aSugg.add(sFlex.slice(0,-1)+"ux");
            }
            if (sFlex.endsWith("ail") && sFlex.length > 3 && _oSpellChecker.isValid(sFlex.slice(0,-2)+"ux")) {
                aSugg.add(sFlex.slice(0,-2)+"ux");
            }
        }
        if (_oSpellChecker.isValid(sFlex+"s")) {
            aSugg.add(sFlex+"s");
        }
        if (_oSpellChecker.isValid(sFlex+"x")) {
            aSugg.add(sFlex+"x");
        }
    }
    if (mfsp.hasMiscPlural(sFlex)) {
        mfsp.getMiscPlural(sFlex).forEach(function(x) { aSugg.add(x); });
    }
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}

function suggSing (sFlex) {
    // returns singular forms assuming sFlex is plural
    if (sFlex.includes("-")) {
        return "";
    }
    let aSugg = new Set();
    if (sFlex.endsWith("ux")) {
        if (_oSpellChecker.isValid(sFlex.slice(0,-2)+"l")) {
            aSugg.add(sFlex.slice(0,-2)+"l");
        }
        if (_oSpellChecker.isValid(sFlex.slice(0,-2)+"il")) {
            aSugg.add(sFlex.slice(0,-2)+"il");
        }
    }
    if (_oSpellChecker.isValid(sFlex.slice(0,-1))) {
        aSugg.add(sFlex.slice(0,-1));
    }
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}

function suggMasSing (sFlex, bSuggSimil=false) {
    // returns masculine singular forms
    // we don’t check if word exists in _dAnalyses, for it is assumed it has been done before
    let aSugg = new Set();
    for (let sMorph of _dAnalyses.gl_get(sFlex, [])) {
        if (!sMorph.includes(":V")) {
            // not a verb
            if (sMorph.includes(":m") || sMorph.includes(":e")) {
                aSugg.add(suggSing(sFlex));
            } else {
                let sStem = cregex.getLemmaOfMorph(sMorph);
                if (mfsp.isFemForm(sStem)) {
                    mfsp.getMasForm(sStem, false).forEach(function(x) { aSugg.add(x); });
                }
            }
        } else {
            // a verb
            let sVerb = cregex.getLemmaOfMorph(sMorph);
            if (conj.hasConj(sVerb, ":PQ", ":Q1") && conj.hasConj(sVerb, ":PQ", ":Q3")) {
                // We also check if the verb has a feminine form.
                // If not, we consider it’s better to not suggest the masculine one, as it can be considered invariable.
                aSugg.add(conj.getConj(sVerb, ":PQ", ":Q1"));
            }
        }
    }
    if (bSuggSimil) {
        for (let e of phonet.selectSimil(sFlex, ":m:[si]")) {
            aSugg.add(e);
        }
    }
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}

function suggMasPlur (sFlex, bSuggSimil=false) {
    // returns masculine plural forms
    // we don’t check if word exists in _dAnalyses, for it is assumed it has been done before
    let aSugg = new Set();
    for (let sMorph of _dAnalyses.gl_get(sFlex, [])) {
        if (!sMorph.includes(":V")) {
            // not a verb
            if (sMorph.includes(":m") || sMorph.includes(":e")) {
                aSugg.add(suggPlur(sFlex));
            } else {
                let sStem = cregex.getLemmaOfMorph(sMorph);
                if (mfsp.isFemForm(sStem)) {
                    mfsp.getMasForm(sStem, true).forEach(function(x) { aSugg.add(x); });
                }
            }
        } else {
            // a verb
            let sVerb = cregex.getLemmaOfMorph(sMorph);
            if (conj.hasConj(sVerb, ":PQ", ":Q2")) {
                aSugg.add(conj.getConj(sVerb, ":PQ", ":Q2"));
            } else if (conj.hasConj(sVerb, ":PQ", ":Q1")) {
                let sSugg = conj.getConj(sVerb, ":PQ", ":Q1");
                // it is necessary to filter these flexions, like “succédé” or “agi” that are not masculine plural
                if (sSugg.endsWith("s")) {
                    aSugg.add(sSugg);
                }
            }
        }
    }
    if (bSuggSimil) {
        for (let e of phonet.selectSimil(sFlex, ":m:[pi]")) {
            aSugg.add(e);
        }
    }
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}


function suggFemSing (sFlex, bSuggSimil=false) {
    // returns feminine singular forms
    // we don’t check if word exists in _dAnalyses, for it is assumed it has been done before
    let aSugg = new Set();
    for (let sMorph of _dAnalyses.gl_get(sFlex, [])) {
        if (!sMorph.includes(":V")) {
            // not a verb
            if (sMorph.includes(":f") || sMorph.includes(":e")) {
                aSugg.add(suggSing(sFlex));
            } else {
                let sStem = cregex.getLemmaOfMorph(sMorph);
                if (mfsp.isFemForm(sStem)) {
                    aSugg.add(sStem);
                }
            }
        } else {
            // a verb
            let sVerb = cregex.getLemmaOfMorph(sMorph);
            if (conj.hasConj(sVerb, ":PQ", ":Q3")) {
                aSugg.add(conj.getConj(sVerb, ":PQ", ":Q3"));
            }
        }
    }
    if (bSuggSimil) {
        for (let e of phonet.selectSimil(sFlex, ":f:[si]")) {
            aSugg.add(e);
        }
    }
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}

function suggFemPlur (sFlex, bSuggSimil=false) {
    // returns feminine plural forms
    // we don’t check if word exists in _dAnalyses, for it is assumed it has been done before
    let aSugg = new Set();
    for (let sMorph of _dAnalyses.gl_get(sFlex, [])) {
        if (!sMorph.includes(":V")) {
            // not a verb
            if (sMorph.includes(":f") || sMorph.includes(":e")) {
                aSugg.add(suggPlur(sFlex));
            } else {
                let sStem = cregex.getLemmaOfMorph(sMorph);
                if (mfsp.isFemForm(sStem)) {
                    aSugg.add(sStem+"s");
                }
            }
        } else {
            // a verb
            let sVerb = cregex.getLemmaOfMorph(sMorph);
            if (conj.hasConj(sVerb, ":PQ", ":Q4")) {
                aSugg.add(conj.getConj(sVerb, ":PQ", ":Q4"));
            }
        }
    }
    if (bSuggSimil) {
        for (let e of phonet.selectSimil(sFlex, ":f:[pi]")) {
            aSugg.add(e);
        }
    }
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}

function hasFemForm (sFlex) {
    for (let sStem of stem(sFlex)) {
        if (mfsp.isFemForm(sStem) || conj.hasConj(sStem, ":PQ", ":Q3")) {
            return true;
        }
    }
    if (phonet.hasSimil(sFlex, ":f")) {
        return true;
    }
    return false;
}

function hasMasForm (sFlex) {
    for (let sStem of stem(sFlex)) {
        if (mfsp.isFemForm(sStem) || conj.hasConj(sStem, ":PQ", ":Q1")) {
            // what has a feminine form also has a masculine form
            return true;
        }
    }
    if (phonet.hasSimil(sFlex, ":m")) {
        return true;
    }
    return false;
}

function switchGender (sFlex, bPlur=null) {
    // we don’t check if word exists in _dAnalyses, for it is assumed it has been done before
    let aSugg = new Set();
    if (bPlur === null) {
        for (let sMorph of _dAnalyses.gl_get(sFlex, [])) {
            if (sMorph.includes(":f")) {
                if (sMorph.includes(":s")) {
                    aSugg.add(suggMasSing(sFlex));
                } else if (sMorph.includes(":p")) {
                    aSugg.add(suggMasPlur(sFlex));
                }
            } else if (sMorph.includes(":m")) {
                if (sMorph.includes(":s")) {
                    aSugg.add(suggFemSing(sFlex));
                } else if (sMorph.includes(":p")) {
                    aSugg.add(suggFemPlur(sFlex));
                } else {
                    aSugg.add(suggFemSing(sFlex));
                    aSugg.add(suggFemPlur(sFlex));
                }
            }
        }
    } else if (bPlur) {
        for (let sMorph of _dAnalyses.gl_get(sFlex, [])) {
            if (sMorph.includes(":f")) {
                aSugg.add(suggMasPlur(sFlex));
            } else if (sMorph.includes(":m")) {
                aSugg.add(suggFemPlur(sFlex));
            }
        }
    } else {
        for (let sMorph of _dAnalyses.gl_get(sFlex, [])) {
            if (sMorph.includes(":f")) {
                aSugg.add(suggMasSing(sFlex));
            } else if (sMorph.includes(":m")) {
                aSugg.add(suggFemSing(sFlex));
            }
        }
    }
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}

function switchPlural (sFlex) {
    let aSugg = new Set();
    for (let sMorph of _dAnalyses.gl_get(sFlex, [])) { // we don’t check if word exists in _dAnalyses, for it is assumed it has been done before
        if (sMorph.includes(":s")) {
            aSugg.add(suggPlur(sFlex));
        } else if (sMorph.includes(":p")) {
            aSugg.add(suggSing(sFlex));
        }
    }
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}

function hasSimil (sWord, sPattern=null) {
    return phonet.hasSimil(sWord, sPattern);
}

function suggSimil (sWord, sPattern=null, bSubst=false) {
    // return list of words phonetically similar to sWord and whom POS is matching sPattern
    let aSugg = phonet.selectSimil(sWord, sPattern);
    for (let sMorph of _dAnalyses.gl_get(sWord, [])) {
        for (let e of conj.getSimil(sWord, sMorph, bSubst)) {
            aSugg.add(e);
        }
    }
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}

function suggCeOrCet (sWord) {
    if (/^[aeéèêiouyâîï]/i.test(sWord)) {
        return "cet";
    }
    if (sWord[0] == "h" || sWord[0] == "H") {
        return "ce|cet";
    }
    return "ce";
}

function suggLesLa (sWord) {
    // we don’t check if word exists in _dAnalyses, for it is assumed it has been done before
    if (_dAnalyses.gl_get(sWord, []).some(s  =>  s.includes(":p"))) {
        return "les|la";
    }
    return "la";
}

function formatNumber (s) {
    let nLen = s.length;
    if (nLen < 4 ) {
        return s;
    }
    let sRes = "";
    // nombre ordinaire
    let nEnd = nLen;
    while (nEnd > 0) {
        let nStart = Math.max(nEnd-3, 0);
        sRes = sRes ? s.slice(nStart, nEnd) + " " + sRes : sRes = s.slice(nStart, nEnd);
        nEnd = nEnd - 3;
    }
    // binaire
    if (/^[01]+$/.test(s)) {
        nEnd = nLen;
        let sBin = "";
        while (nEnd > 0) {
            let nStart = Math.max(nEnd-4, 0);
            sBin = sBin ? s.slice(nStart, nEnd) + " " + sBin : sBin = s.slice(nStart, nEnd);
            nEnd = nEnd - 4;
        }
        sRes += "|" + sBin;
    }
    // numéros de téléphone
    if (nLen == 10) {
        if (s.startsWith("0")) {
            sRes += "|" + s.slice(0,2) + " " + s.slice(2,4) + " " + s.slice(4,6) + " " + s.slice(6,8) + " " + s.slice(8);   // téléphone français
            if (s[1] == "4" && (s[2]=="7" || s[2]=="8" || s[2]=="9")) {
                sRes += "|" + s.slice(0,4) + " " + s.slice(4,6) + " " + s.slice(6,8) + " " + s.slice(8);    // mobile belge
            }
            sRes += "|" + s.slice(0,3) + " " + s.slice(3,6) + " " + s.slice(6,8) + " " + s.slice(8);        // téléphone suisse
        }
        sRes += "|" + s.slice(0,4) + " " + s.slice(4,7) + "-" + s.slice(7);                                 // téléphone canadien ou américain
    } else if (nLen == 9 && s.startsWith("0")) {
        sRes += "|" + s.slice(0,3) + " " + s.slice(3,5) + " " + s.slice(5,7) + " " + s.slice(7,9);          // fixe belge 1
        sRes += "|" + s.slice(0,2) + " " + s.slice(2,5) + " " + s.slice(5,7) + " " + s.slice(7,9);          // fixe belge 2
    }
    return sRes;
}

function formatNF (s) {
    try {
        let m = /NF[  -]?(C|E|P|Q|S|X|Z|EN(?:[  -]ISO|))[  -]?([0-9]+(?:[\/‑-][0-9]+|))/i.exec(s);
        if (!m) {
            return "";
        }
        return "NF " + m[1].toUpperCase().replace(/ /g, " ").replace(/-/g, " ") + " " + m[2].replace(/\//g, "‑").replace(/-/g, "‑");
    }
    catch (e) {
        console.error(e);
        return "# erreur #";
    }
}

function undoLigature (c) {
    if (c == "ﬁ") {
        return "fi";
    } else if (c == "ﬂ") {
        return "fl";
    } else if (c == "ﬀ") {
        return "ff";
    } else if (c == "ﬃ") {
        return "ffi";
    } else if (c == "ﬄ") {
        return "ffl";
    } else if (c == "ﬅ") {
        return "ft";
    } else if (c == "ﬆ") {
        return "st";
    }
    return "_";
}


const _dNormalizedCharsForInclusiveWriting = new Map([
    ['(', '_'],  [')', '_'],
    ['.', '_'],  ['·', '_'],
    ['–', '_'],  ['—', '_'],
    ['/', '_']
]);

function normalizeInclusiveWriting (sToken) {
    let sRes = "";
    for (let c of sToken) {
        if (_dNormalizedCharsForInclusiveWriting.has(c)) {
            sRes += _dNormalizedCharsForInclusiveWriting.get(c);
        } else {
            sRes += c;
        }
    }
    return sRes;
}



// generated code, do not edit
const oEvalFunc = {
    p_p_URL2_2: function (s, m) {
        return m[2].gl_toCapitalize();
    },
    d_p_URL2_3: function (s, m, dDA) {
        return define(dDA, m.start[2], [":MP:e:i"]);
    },
    p_p_sigle1_1: function (s, m) {
        return m[1].replace(/\./g, "")+".";
    },
    c_p_sigle2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[0].search(/^(?:i\.e\.|s\.[tv]\.p\.|e\.g\.|a\.k\.a\.|c\.q\.f\.d\.|b\.a\.|n\.b\.)$/i) >= 0);
    },
    c_p_sigle2_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].length == 4;
    },
    s_p_sigle2_2: function (s, m) {
        return m[0].replace(/\./g, "").toUpperCase() + "|" + m[0].slice(0,2) + " " + m[0].slice(2,4);
    },
    c_p_sigle2_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    s_p_sigle2_3: function (s, m) {
        return m[0].replace(/\./g, "").toUpperCase();
    },
    c_p_sigle2_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0] != "b.a.";
    },
    p_p_sigle2_4: function (s, m) {
        return m[0].replace(/\./g, "_");
    },
    p_p_sigle3_1: function (s, m) {
        return m[0].replace(/\./g, "").replace(/-/g,"");
    },
    c_p_points_suspension_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[1].search(/^etc/i) >= 0);
    },
    c_p_prénom_lettre_point_patronyme_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":M[12]", false) && (morph(dDA, [m.start[3], m[3]], ":(?:M[12]|V)", false) || ! _oSpellChecker.isValid(m[3]));
    },
    c_p_prénom_lettre_point_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":M[12]", false) && look(s.slice(m.end[0]), /^\W+[a-zéèêîïâ]/);
    },
    p_p_patronyme_composé_avec_le_la_les_1: function (s, m) {
        return m[0].replace(/ /g, "_");
    },
    c_p_mot_entre_crochets_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1].gl_isDigit();
    },
    c_p_mot_entre_crochets_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morph(dDA, [m.start[1], m[1]], ":G", false);
    },
    p_p_mot_entre_crochets_2: function (s, m) {
        return " " + m[1] + " ";
    },
    c_p_mot_entre_crochets_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && m[1].gl_isAlpha();
    },
    c_typo_écriture_épicène_tous_toutes_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return option("typo");
    },
    p_typo_écriture_épicène_tous_toutes_2: function (s, m) {
        return normalizeInclusiveWriting(m[0]);
    },
    c_typo_écriture_épicène_ceux_celles_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return option("typo");
    },
    p_typo_écriture_épicène_ceux_celles_2: function (s, m) {
        return normalizeInclusiveWriting(m[0]);
    },
    c_typo_écriture_épicène_pluriel_eur_divers_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return option("typo") && m[2] != "se";
    },
    c_typo_écriture_épicène_pluriel_eur_divers_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return option("typo") && m[2] == "se";
    },
    p_typo_écriture_épicène_pluriel_eur_divers_3: function (s, m) {
        return normalizeInclusiveWriting(m[0]);
    },
    c_typo_écriture_épicène_pluriel_eux_euses_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return option("typo");
    },
    p_typo_écriture_épicène_pluriel_eux_euses_2: function (s, m) {
        return normalizeInclusiveWriting(m[0]);
    },
    c_typo_écriture_épicène_pluriel_aux_ales_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return option("typo");
    },
    p_typo_écriture_épicène_pluriel_aux_ales_2: function (s, m) {
        return normalizeInclusiveWriting(m[0]);
    },
    c_typo_écriture_épicène_pluriel_er_ère_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return option("typo");
    },
    p_typo_écriture_épicène_pluriel_er_ère_2: function (s, m) {
        return normalizeInclusiveWriting(m[0]);
    },
    c_typo_écriture_épicène_pluriel_if_ive_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return option("typo");
    },
    p_typo_écriture_épicène_pluriel_if_ive_2: function (s, m) {
        return normalizeInclusiveWriting(m[0]);
    },
    p_typo_écriture_épicène_pluriel_e_1: function (s, m) {
        return normalizeInclusiveWriting(m[0]);
    },
    c_typo_écriture_épicène_pluriel_e_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return option("typo") && ! m[0].endsWith("les");
    },
    c_typo_écriture_épicène_pluriel_e_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1].endsWith("s") && ! m[0].endsWith("·e·s");
    },
    c_typo_écriture_épicène_pluriel_e_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && ! m[0].endsWith("e·s");
    },
    c_typo_écriture_épicène_singulier_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return option("typo") && (m[1] == "un" || m[1] == "Un");
    },
    c_typo_écriture_épicène_singulier_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && option("typo") && ! m[0].endsWith("·e");
    },
    c_majuscule_après_point_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[1].search(/^(?:etc|[A-Z]|chap|cf|fig|hab|litt|circ|coll|r[eé]f|étym|suppl|bibl|bibliogr|cit|op|vol|déc|nov|oct|janv|juil|avr|sept)$/i) >= 0) && morph(dDA, [m.start[1], m[1]], ":", false) && morph(dDA, [m.start[2], m[2]], ":", false);
    },
    s_majuscule_après_point_1: function (s, m) {
        return m[2].gl_toCapitalize();
    },
    c_majuscule_en_début_phrase_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(m.end[0]), /\w\w[.] +\w+/);
    },
    s_majuscule_en_début_phrase_1: function (s, m) {
        return m[1].gl_toCapitalize();
    },
    c_virgule_manquante_avant_car_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":[DR]", false);
    },
    c_virgule_manquante_avant_mais_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ">(?:[mtscl]es|[nv]os|quels) ", false);
    },
    c_virgule_manquante_avant_donc_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":V", false);
    },
    c_virg_virgule_après_point_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[1].search(/^(?:etc|[A-Z]|fig|hab|litt|circ|coll|ref|étym|suppl|bibl|bibliogr|cit|vol|déc|nov|oct|janv|juil|avr|sept|pp?)$/) >= 0);
    },
    c_typo_espace_manquant_après1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[1].gl_isDigit();
    },
    c_typo_espace_manquant_après3_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (m[1].length > 1 && ! m[1].gl_isDigit() && _oSpellChecker.isValid(m[1])) || look(s.slice(m.end[0]), /^’/);
    },
    s_typo_point_après_titre_1: function (s, m) {
        return m[1].slice(0,-1);
    },
    s_typo_point_après_numéro_1: function (s, m) {
        return (m[1].slice(1,3) == "os" ) ? "nᵒˢ"  : "nᵒ";
    },
    c_typo_points_suspension1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /etc$/i);
    },
    s_typo_points_suspension2_1: function (s, m) {
        return m[0].replace(/\.\.\./g, "…").gl_trimRight(".");
    },
    s_typo_virgules_points_1: function (s, m) {
        return m[0].replace(/,/g, ".").replace(/\.\.\./g, "…");
    },
    s_typo_ponctuation_superflue1_1: function (s, m) {
        return ",|" + m[1];
    },
    s_typo_ponctuation_superflue2_1: function (s, m) {
        return ";|" + m[1];
    },
    s_typo_ponctuation_superflue3_1: function (s, m) {
        return ":|" + m[0][1];
    },
    c_nbsp_ajout_avant_double_ponctuation_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return sCountry != "CA";
    },
    s_nbsp_ajout_avant_double_ponctuation_1: function (s, m) {
        return " "+m[0];
    },
    c_typo_signe_multiplication_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[0].startsWith("0x");
    },
    s_ligatures_typographiques_1: function (s, m) {
        return undoLigature(m[0]);
    },
    c_typo_apostrophe_incorrecte_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[2].length == 1  &&  m[1].endsWith("′ "));
    },
    s_typo_apostrophe_manquante_prudence1_1: function (s, m) {
        return m[1].slice(0,-1)+"’";
    },
    c_typo_apostrophe_manquante_prudence2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! option("mapos") && morph(dDA, [m.start[2], m[2]], ":V", false);
    },
    s_typo_apostrophe_manquante_prudence2_1: function (s, m) {
        return m[1].slice(0,-1)+"’";
    },
    c_typo_apostrophe_manquante_audace1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return option("mapos") && ! look(s.slice(0,m.index), /(?:lettre|caractère|glyphe|dimension|variable|fonction|point) *$/i);
    },
    s_typo_apostrophe_manquante_audace1_1: function (s, m) {
        return m[1].slice(0,-1)+"’";
    },
    c_typo_guillemets_typographiques_doubles_ouvrants_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /[a-zA-Zéïîùàâäôö]$/);
    },
    c_typo_élision_déterminants_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[2].search(/^(?:onz[ei]|énième|iourte|ouistiti|ouate|one-?step|ouf|Ouagadougou|I(?:I|V|X|er|ᵉʳ|ʳᵉ|è?re))/i) >= 0) && ! m[2].gl_isUpperCase() && ! morph(dDA, [m.start[2], m[2]], ":G", false);
    },
    s_typo_élision_déterminants_1: function (s, m) {
        return m[1][0]+"’";
    },
    c_typo_euphonie_cet_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[2].search(/^(?:onz|énième|ouf|énième|ouistiti|one-?step|I(?:I|V|X|er|ᵉʳ))/i) >= 0) && morph(dDA, [m.start[2], m[2]], ":[me]");
    },
    c_nf_norme_française_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[0].search(/^NF (?:C|E|P|Q|S|X|Z|EN(?: ISO|)) [0-9]+(?:‑[0-9]+|)/) >= 0);
    },
    s_nf_norme_française_1: function (s, m) {
        return formatNF(m[0]);
    },
    s_chim_molécules_1: function (s, m) {
        return m[0].replace(/2/g, "₂").replace(/3/g, "₃").replace(/4/g, "₄");
    },
    c_typo_cohérence_guillemets_chevrons_ouvrants_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\w$/);
    },
    c_typo_cohérence_guillemets_chevrons_ouvrants_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(m.end[0]), /^\w/);
    },
    c_typo_cohérence_guillemets_chevrons_fermants_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\w$/);
    },
    c_typo_cohérence_guillemets_chevrons_fermants_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(m.end[0]), /^\w/);
    },
    c_typo_cohérence_guillemets_doubles_ouvrants_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\w$/);
    },
    c_typo_cohérence_guillemets_doubles_fermants_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\w$/);
    },
    c_typo_cohérence_guillemets_doubles_fermants_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(m.end[0]), /^\w/);
    },
    c_typo_guillemet_simple_ouvrant_non_fermé_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), / $/) || look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_typo_guillemet_simple_fermant_non_ouvert_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(m.end[0]), /^ /) || look(s.slice(m.end[0]), /^ *$|^,/);
    },
    c_unit_nbsp_avant_unités2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[3], m[3]], ";S", ":[VCR]") || mbUnit(m[3]) || ! _oSpellChecker.isValid(m[3]);
    },
    c_unit_nbsp_avant_unités3_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (m[2].length > 4 && ! _oSpellChecker.isValid(m[3])) || morphex(dDA, [m.start[3], m[3]], ";S", ":[VCR]") || mbUnit(m[3]);
    },
    c_num_grand_nombre_soudé_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /NF[  -]?(C|E|P|Q|X|Z|EN(?:[  -]ISO|)) *$/);
    },
    c_num_grand_nombre_soudé_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].length > 4;
    },
    s_num_grand_nombre_soudé_2: function (s, m) {
        return formatNumber(m[0]);
    },
    c_num_grand_nombre_soudé_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && look(s.slice(m.end[0]), /^(?:,\d+[⁰¹²³⁴⁵⁶⁷⁸⁹]?|[⁰¹²³⁴⁵⁶⁷⁸⁹])/) || look(s.slice(m.end[0]), /^[   ]*(?:[kcmµn]?(?:[slgJKΩ]|m[²³]?|Wh?|Hz|dB)|[%‰€$£¥Åℓhj]|min|°C|℃)(?![\w’'])/);
    },
    s_num_grand_nombre_soudé_3: function (s, m) {
        return formatNumber(m[0]);
    },
    c_num_nombre_quatre_chiffres_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ";S", ":[VCR]") || mbUnit(m[2]);
    },
    s_num_nombre_quatre_chiffres_1: function (s, m) {
        return formatNumber(m[1]);
    },
    c_num_grand_nombre_avec_points_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return option("num");
    },
    s_num_grand_nombre_avec_points_1: function (s, m) {
        return m[0].replace(/\./g, " ");
    },
    p_num_grand_nombre_avec_points_2: function (s, m) {
        return m[0].replace(/\./g, "_");
    },
    c_num_grand_nombre_avec_espaces_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return option("num");
    },
    s_num_grand_nombre_avec_espaces_1: function (s, m) {
        return m[0].replace(/ /g, " ");
    },
    p_num_grand_nombre_avec_espaces_2: function (s, m) {
        return m[0].replace(/ /g, "_");
    },
    c_date_nombres_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! checkDate(m[1], m[2], m[3]) && ! look(s.slice(0,m.index), /\bversions? +$/i);
    },
    p_date_nombres_2: function (s, m) {
        return m[0].replace(/\./g, "-").replace(/ /g, "-").replace(/\//g, "-");
    },
    c_redondances_paragraphe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":(?:G|V0)|>(?:t(?:antôt|emps|rès)|loin|souvent|parfois|quelquefois|côte|petit|même) ", false) && ! m[1][0].gl_isUpperCase();
    },
    c_redondances_paragraphe_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    p_p_trait_union_conditionnel1_1: function (s, m) {
        return m[0].replace(/‑/g, "");
    },
    p_p_trait_union_conditionnel2_1: function (s, m) {
        return m[0].replace(/‑/g, "");
    },
    c_doublon_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[1].search(/^([nv]ous|faire|en|la|lui|donnant|œuvre|h[éoa]|hou|olé|joli|Bora|couvent|dément|sapiens|très|vroum|[0-9]+)$/i) >= 0) && ! ((m[1].search(/^(?:est|une?)$/) >= 0) && look(s.slice(0,m.index), /[’']$/)) && ! (m[1] == "mieux" && look(s.slice(0,m.index), /qui +$/i));
    },
    c_num_lettre_O_zéro1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! option("ocr");
    },
    s_num_lettre_O_zéro1_1: function (s, m) {
        return m[0].replace(/O/g, "0");
    },
    c_num_lettre_O_zéro2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! option("ocr");
    },
    s_num_lettre_O_zéro2_1: function (s, m) {
        return m[0].replace(/O/g, "0");
    },
    s_typo_ordinaux_premier_1: function (s, m) {
        return m[0].replace(/ /g, "").replace(/è/g, "").replace(/i/g, "").replace(/e/g, "ᵉ").replace(/r/g, "ʳ").replace(/s/g, "ˢ");
    },
    s_typo_ordinaux_deuxième_1: function (s, m) {
        return m[0].replace(/ /g, "").replace(/n/g, "").replace(/d/g, "ᵈ").replace(/e/g, "ᵉ").replace(/s/g, "ˢ");
    },
    c_typo_ordinaux_nième_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].endsWith("s");
    },
    c_typo_ordinaux_nième_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    s_typo_ordinaux_romain_premier_1: function (s, m) {
        return m[0].replace(/ /g, "").replace(/è/g, "").replace(/i/g, "").replace(/e/g, "ᵉ").replace(/r/g, "ʳ").replace(/s/g, "ˢ");
    },
    s_typo_ordinaux_romain_deuxième_1: function (s, m) {
        return m[0].replace(/ /g, "").replace(/n/g, "").replace(/d/g, "ᵈ").replace(/e/g, "ᵉ").replace(/s/g, "ˢ");
    },
    c_typo_ordinaux_romains_nième_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[0], m[0]], ":G", false);
    },
    c_typo_ordinaux_romains_nième_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].endsWith("s");
    },
    c_typo_ordinaux_romains_nième_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    c_d_typo_écriture_épicène_pluriel_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ]", ":G");
    },
    d_d_typo_écriture_épicène_pluriel_1: function (s, m, dDA) {
        return define(dDA, m.start[1], [":N:A:Q:e:p"]);
    },
    c_d_typo_écriture_épicène_singulier_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[NAQ]", false);
    },
    d_d_typo_écriture_épicène_singulier_1: function (s, m, dDA) {
        return define(dDA, m.start[1], [":N:A:Q:e:s"]);
    },
    c_date_jour_mois_année_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! checkDateWithString(m[1], m[2], m[3]);
    },
    c_date_journée_jour_mois_année1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(m.end[0]), /^ +av(?:ant|) +J(?:C|ésus-Christ)/) && ! checkDay(m[1], m[2], m[3], m[4]);
    },
    s_date_journée_jour_mois_année1_1: function (s, m) {
        return getDay(m[2], m[3], m[4]);
    },
    c_date_journée_jour_mois_année2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(m.end[0]), /^ +av(?:ant|) +J(?:C|ésus-Christ)/) && ! checkDayWithString(m[1], m[2], m[3], m[4]);
    },
    s_date_journée_jour_mois_année2_1: function (s, m) {
        return getDayWithString(m[2], m[3], m[4]);
    },
    c_p_références_aux_notes_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[0], m[0]], ":", false);
    },
    c_p_pas_mal_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D", false);
    },
    c_p_pas_assez_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":A", false) && ! morph(dDA, prevword1(s, m.index), ":D", false);
    },
    c_p_titres_et_ordinaux_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1] != "I";
    },
    c_p_fusion_mots_multiples_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return _oSpellChecker.isValid(m[0].replace(/ /g, "_"));
    },
    p_p_fusion_mots_multiples_1: function (s, m) {
        return m[0].replace(/ /g, "_");
    },
    c_tu_t_euphonique_incorrect_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (m[2].search(/^(?:ils|elles|tu)$/i) >= 0);
    },
    c_tu_t_euphonique_incorrect_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && m[1] != "-t-" && m[1] != "-T-";
    },
    c_tu_trait_union_douteux_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return _oSpellChecker.isValid(m[1]+"-"+m[2]) && analyse(m[1]+"-"+m[2], ":", false);
    },
    c_tu_ce_cette_ces_nom_là1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[NB]", false);
    },
    c_tu_ce_cette_ces_nom_là2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[NB]", false) && look(s.slice(m.end[0]), /^ *$|^,/);
    },
    c_tu_préfixe_ex_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":N") && ! (m[1].search(/^(?:aequo|nihilo|cathedra|absurdo|abrupto)/i) >= 0);
    },
    c_tu_préfixe_in_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:drive|plug|sit) +$/i);
    },
    c_tu_préfixe_in_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (m[2].search(/^(?:dix-huit|douze|seize|folio|octavo|quarto|plano)$/) >= 0);
    },
    s_tu_préfixe_in_2: function (s, m) {
        return m[0].replace(/ /g, "-");
    },
    c_tu_préfixe_in_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morph(dDA, [m.start[2], m[2]], ":N:m");
    },
    c_tu_préfixe_mi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[NAQ]", false);
    },
    c_tu_préfixe_quasi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":N", ":[AGW]");
    },
    c_tu_préfixe_semi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ]", ":G");
    },
    c_tu_préfixe_xxxo_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return _oSpellChecker.isValid(m[1]+"-"+m[2]) && analyse(m[1]+"-"+m[2], ":", false);
    },
    c_tu_préfixe_pseudo_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":N");
    },
    c_tu_préfixe_pseudo_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_tu_préfixe_divers_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return _oSpellChecker.isValid(m[1]+"-"+m[2]) && analyse(m[1]+"-"+m[2], ":", false) && morph(dDA, prevword1(s, m.index), ":D", false, ! Boolean((m[1].search(/^(?:s(?:ans|ous)|non)$/i) >= 0)));
    },
    c_tu_mots_composés_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return _oSpellChecker.isValid(m[1]+"-"+m[2]) && analyse(m[1]+"-"+m[2], ":N", false) && morph(dDA, prevword1(s, m.index), ":(?:D|V0e)", false, true) && ! (morph(dDA, [m.start[1], m[1]], ":G", false) && morph(dDA, [m.start[2], m[2]], ":[GYB]", false));
    },
    s_tu_aller_retour_1: function (s, m) {
        return m[0].replace(/ /g, "-");
    },
    s_tu_arc_en_ciel_1: function (s, m) {
        return m[0].replace(/ /g, "-");
    },
    c_tu_bouche_à_oreille_bouche_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, prevword1(s, m.index), ":D", false);
    },
    s_tu_bouche_à_oreille_bouche_1: function (s, m) {
        return m[0].replace(/ /g, "-");
    },
    c_tu_celui_celle_là_ci_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[0].endsWith("si") && morph(dDA, nextword1(s, m.end[0]), ":[AW]", false));
    },
    s_tu_celui_celle_là_ci_1: function (s, m) {
        return m[0].replace(/ /g, "-").replace(/si/g, "ci");
    },
    s_tu_grand_père_mère_1: function (s, m) {
        return m[0].replace(/ /g, "-");
    },
    c_tu_nord_sud_est_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(m.end[0]), /^ *$|^,/);
    },
    c_tu_ouï_dire_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, prevword1(s, m.index), ":G");
    },
    c_tu_prêt_à_porter_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /\b(?:les?|du|des|un|ces?|[mts]on) +/i);
    },
    s_tu_stock_option_1: function (s, m) {
        return m[0].replace(/ /g, "-");
    },
    c_tu_soi_disant_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! ( morph(dDA, prevword1(s, m.index), ":R", false) && look(s.slice(m.end[0]), /^ +qu[e’]/) );
    },
    c_tu_est_ce_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":", ":N.*:[me]:[si]|>qui ") && morph(dDA, prevword1(s, m.index), ":Cs", false, true);
    },
    c_tu_pronom_même_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(m.end[0]), /^ +s(?:i |’)/);
    },
    s_tu_nombres_1: function (s, m) {
        return m[0].replace(/ /g, "-");
    },
    c_tu_nombres_vingt_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /quatre $/i);
    },
    s_tu_nombres_vingt_1: function (s, m) {
        return m[0].replace(/ /g, "-").replace(/vingts/g, "vingt");
    },
    s_tu_nombres_soixante_1: function (s, m) {
        return m[0].replace(/ /g, "-");
    },
    s_tu_nombres_octante_1: function (s, m) {
        return m[0].replace(/ /g, "-").replace(/vingts/g, "vingt");
    },
    s_tu_s_il_te_plaît_1: function (s, m) {
        return m[0].replace(/-/g, " ");
    },
    c_tu_trois_quarts_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D", false, false);
    },
    s_tu_parce_que_1: function (s, m) {
        return m[0].replace(/-/g, " ");
    },
    s_tu_qqch_ça_aussi_donc_1: function (s, m) {
        return m[0].replace(/-/g, " ");
    },
    s_tu_d_entre_pronom_1: function (s, m) {
        return m[0].replace(/-/g, " ");
    },
    c_tu_y_attaché_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":V0|>en ", false);
    },
    c_tu_lorsque_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\bd[eè]s +$/i);
    },
    s_tu_lorsque_1: function (s, m) {
        return m[0].replace(/ /g, "");
    },
    c_virgule_dialogue_après_nom_propre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":M", ":G") && ! morph(dDA, [m.start[2], m[2]], ":N", false) && look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_virgule_dialogue_avant_nom_propre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":E", false) && morph(dDA, [m.start[3], m[3]], ":M", false);
    },
    c_virgule_après_verbe_COD_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":Y", false) && morph(dDA, [m.start[2], m[2]], ":M", false) && ! morph(dDA, prevword1(s, m.index), ">à ", false, false);
    },
    c_typo_apostrophe_manquante_audace2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return option("mapos");
    },
    s_typo_apostrophe_manquante_audace2_1: function (s, m) {
        return m[1].slice(0,-1)+"’";
    },
    c_typo_À_début_phrase1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[GNAY]", ":(?:Q|3s)|>(?:priori|post[eé]riori|contrario|capella|fortiori) ") || (m[2] == "bientôt" && look(s.slice(m.end[0]), /^ *$|^,/));
    },
    s_maj_accents_1: function (s, m) {
        return "É"+m[0].slice(1);
    },
    p_maj_accents_2: function (s, m) {
        return "É"+m[0].slice(1);
    },
    c_d_dans_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D.*:p|>[a-z]+ièmes ", false, false);
    },
    d_d_dans_1: function (s, m, dDA) {
        return select(dDA, m.start[0], m[0], ":R");
    },
    c_d_ton_son_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:le|ce[st]?|ton|mon|son|quel(?:que|)s?|[nv]otre|un|leur|ledit|dudit) ");
    },
    d_d_ton_son_1: function (s, m, dDA) {
        return exclude(dDA, m.start[2], m[2], ":D");
    },
    c_d_je_le_la_les_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":1s", false, false);
    },
    d_d_je_le_la_les_1: function (s, m, dDA) {
        return select(dDA, m.start[1], m[1], ":Oo");
    },
    c_d_tu_le_la_les_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":2s", false, false);
    },
    d_d_tu_le_la_les_1: function (s, m, dDA) {
        return select(dDA, m.start[1], m[1], ":Oo");
    },
    c_d_il_elle_on_le_la_les_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":3s", false, false);
    },
    d_d_il_elle_on_le_la_les_1: function (s, m, dDA) {
        return select(dDA, m.start[1], m[1], ":Oo");
    },
    c_d_nous_le_la_les_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":1p", false, false);
    },
    d_d_nous_le_la_les_1: function (s, m, dDA) {
        return select(dDA, m.start[1], m[1], ":Oo");
    },
    c_d_vous_le_la_les_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":2p", false, false);
    },
    d_d_vous_le_la_les_1: function (s, m, dDA) {
        return select(dDA, m.start[1], m[1], ":Oo");
    },
    c_d_nous_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":1p", false);
    },
    d_d_nous_1: function (s, m, dDA) {
        return exclude(dDA, m.start[1], m[1], ":Os");
    },
    c_d_vous_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":2p", false);
    },
    d_d_vous_1: function (s, m, dDA) {
        return exclude(dDA, m.start[1], m[1], ":Os");
    },
    c_d_ils_elles_le_la_les_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":3p", false, false);
    },
    d_d_ils_elles_le_la_les_1: function (s, m, dDA) {
        return select(dDA, m.start[1], m[1], ":Oo");
    },
    d_d_ne_me_te_te_le_la_leur_1: function (s, m, dDA) {
        return select(dDA, m.start[1], m[1], ":Oo");
    },
    c_d_ne_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":(?:O[sp]|X)", false);
    },
    d_d_ne_verbe_1: function (s, m, dDA) {
        return select(dDA, m.start[1], m[1], ":V");
    },
    c_d_n_m_t_s_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":X", false);
    },
    d_d_n_m_t_s_verbe_1: function (s, m, dDA) {
        return select(dDA, m.start[1], m[1], ":V");
    },
    d_d_me_te_se_verbe_1: function (s, m, dDA) {
        return select(dDA, m.start[1], m[1], ":V");
    },
    d_d_je_verbe_1: function (s, m, dDA) {
        return select(dDA, m.start[1], m[1], ":[123][sp]");
    },
    c_d_je_il_ils_on_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":(?:Oo|X)", false);
    },
    d_d_je_il_ils_on_verbe_1: function (s, m, dDA) {
        return select(dDA, m.start[1], m[1], ":[123][sp]");
    },
    c_d_tu_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, prevword1(s, m.index), ":Cs", false, true) && ! morph(dDA, [m.start[1], m[1]], ":(?:Oo|X)", false);
    },
    d_d_tu_verbe_1: function (s, m, dDA) {
        return select(dDA, m.start[1], m[1], ":[123][sp]");
    },
    c_d_nom_propre_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":M") && m[2].gl_isLowerCase() && morphex(dDA, [m.start[2], m[2]], ":[123][sg]", ":Q") && morph(dDA, [m.start[2], m[2]], ":N", false) && morph(dDA, prevword1(s, m.index), ":Cs", false, true);
    },
    d_d_nom_propre_verbe_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":[123][sp]");
    },
    c_d_nom_propre_verbe_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":M", false) && morphex(dDA, [m.start[2], m[2]], ":[123]s|>(?:[nmts]e|nous|vous) ", ":A") && look(s.slice(0,m.index), /^ *$|, *$/);
    },
    d_d_nom_propre_verbe_2: function (s, m, dDA) {
        return select(dDA, m.start[1], m[1], ":M");
    },
    d_d_que_combien_pourquoi_en_y_verbe_1: function (s, m, dDA) {
        return exclude(dDA, m.start[1], m[1], ":E");
    },
    c_d_aucun_non_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[NA].*:[me]", false);
    },
    d_d_aucun_non_verbe_1: function (s, m, dDA) {
        return exclude(dDA, m.start[1], m[1], ":V");
    },
    c_d_de_non_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":[YD]", false);
    },
    d_d_de_non_verbe_1: function (s, m, dDA) {
        return exclude(dDA, m.start[1], m[1], ":V");
    },
    d_d_d_un_une_non_verbe_1: function (s, m, dDA) {
        return exclude(dDA, m.start[1], m[1], ":V");
    },
    d_d_déterminant_non_verbe_1: function (s, m, dDA) {
        return exclude(dDA, m.start[1], m[1], ":V");
    },
    c_d_de_la_non_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":Y", false);
    },
    d_d_de_la_non_verbe_1: function (s, m, dDA) {
        return exclude(dDA, m.start[1], m[1], ":V");
    },
    d_d_de_pronom_non_verbe_1: function (s, m, dDA) {
        return exclude(dDA, m.start[1], m[1], ":V");
    },
    d_d_par_non_verbe_1: function (s, m, dDA) {
        return exclude(dDA, m.start[1], m[1], ":V[123]");
    },
    d_d_très_non_verbe_1: function (s, m, dDA) {
        return exclude(dDA, m.start[1], m[1], ":[123][sp]");
    },
    d_d_en_tant_que_1: function (s, m, dDA) {
        return exclude(dDA, m.start[1], m[1], ":[123][sp]");
    },
    d_p_bac_plus_nombre_2: function (s, m, dDA) {
        return define(dDA, m.start[0], [":N:e:i"]);
    },
    c_ocr_point_interrogation_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(sx.slice(m.end[0]), /^(?: +[A-ZÉÈÂ(]|…|[.][.]+| *$)/);
    },
    c_ocr_virgules_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! sx.slice(m.index, m.end[0]).endsWith("…");
    },
    s_ocr_virgules_1: function (s, m) {
        return m[0].slice(0,-1);
    },
    c_ocr_nombres_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0] == "II";
    },
    c_ocr_nombres_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && ! m[0].gl_isDigit();
    },
    s_ocr_nombres_2: function (s, m) {
        return m[0].replace(/O/g, "0").replace(/I/g, "1");
    },
    s_ocr_age_1: function (s, m) {
        return m[0].replace(/a/g, "â").replace(/A/g, "Â");
    },
    s_ocr_autre_1: function (s, m) {
        return m[0].replace(/n/g, "u");
    },
    c_ocr_chère_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b([jnlmts]’|il |on |elle )$/i);
    },
    c_ocr_celui_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b[jn]e +$/i);
    },
    c_ocr_cette1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":N.*:f:s", false);
    },
    c_ocr_cette2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D.*:f:[si]");
    },
    c_ocr_comme_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, nextword1(s, m.end[0]), ">(?:et|o[uù]) ");
    },
    c_ocr_contre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[0].search(/^contre$/i) >= 0);
    },
    c_ocr_dans1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D.*:p", false, false);
    },
    c_ocr_dans2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D.*:p", false, false);
    },
    s_ocr_dame_1: function (s, m) {
        return m[0].replace(/rn/g, "m");
    },
    c_ocr_de_des1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].endsWith("é") && ! morph(dDA, prevword1(s, m.index), ":D.*:m:[si]", false, false);
    },
    c_ocr_de_des1_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].endsWith("s") && ! morph(dDA, prevword1(s, m.index), ":D.*:m:p", false, false);
    },
    c_ocr_de_des2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].endsWith("o");
    },
    c_ocr_de_des2_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && ! morph(dDA, prevword1(s, m.index), ":D.*:[me]", false, false);
    },
    c_ocr_de_la_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\bau /i);
    },
    c_ocr_du_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[NA]:[me]:[si]", ":Y");
    },
    c_ocr_elle_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].endsWith("e") && ( morph(dDA, prevword1(s, m.index), ":R", false, true) || isNextVerb(dDA, s.slice(m.end[0]), m.end[0]) );
    },
    c_ocr_elle_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].endsWith("s") && ( morph(dDA, prevword1(s, m.index), ":R", false, true) || isNextVerb(dDA, s.slice(m.end[0]), m.end[0]) );
    },
    c_ocr_et_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /[0-9] +$/);
    },
    c_ocr_état_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].endsWith("l");
    },
    c_ocr_état_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    c_ocr_il_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/) && morph(dDA, [m.start[2], m[2]], ":(?:O[on]|3s)", false);
    },
    c_ocr_il_ils2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].endsWith("s");
    },
    c_ocr_il_ils2_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    c_ocr_il_ils3_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[0].endsWith("s");
    },
    c_ocr_il_ils3_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    s_ocr_large_1: function (s, m) {
        return m[0].replace(/o/g, "e");
    },
    c_ocr_lj1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ]/i) || ! morph(dDA, [m.start[2], m[2]], ":Y", false);
    },
    c_ocr_exclamation2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, nextword1(s, m.end[0]), ";S", false) && ! morph(dDA, prevword1(s, m.index), ":R", false);
    },
    c_ocr_lv_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].gl_isTitle() && look(s.slice(0,m.index), /[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ]/i) && morphex(dDA, [m.start[0], m[0]], ":", ":M");
    },
    c_ocr_lv_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return _oSpellChecker.isValid(m[1]);
    },
    c_ocr_lv_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    c_ocr_lp_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ]/i) && morphex(dDA, [m.start[0], m[0]], ":", ":M") && _oSpellChecker.isValid(m[1]);
    },
    c_ocr_l_était_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ]/i);
    },
    s_ocr_le_les_1: function (s, m) {
        return m[0].replace(/é/g, "e").replace(/É/g, "E");
    },
    c_ocr_le_la_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].endsWith("e");
    },
    c_ocr_le_la_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && m[0].endsWith("a");
    },
    c_ocr_le_la_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && m[0].endsWith("à");
    },
    c_ocr_le_la_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    c_ocr_tu_le_la_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":(?:V0|N.*:m:[si])", false, false);
    },
    c_ocr_mais2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D:[me]:p", false, false);
    },
    c_ocr_mais3_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D:(?:m:s|e:p)", false, false);
    },
    c_ocr_mais4_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ">(?:homme|ce|quel|être) ", false, false);
    },
    c_ocr_même1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].endsWith("e") && ! morph(dDA, prevword1(s, m.index), ":D.*:[me]:[si]", false, false);
    },
    c_ocr_même1_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].endsWith("s") && ! morph(dDA, prevword1(s, m.index), ":D.*:[me]:[pi]", false, false);
    },
    s_ocr_même2_1: function (s, m) {
        return m[0].replace(/è/g, "ê").replace(/È/g, "Ê");
    },
    s_ocr_même3_1: function (s, m) {
        return m[0].replace(/é/g, "ê").replace(/É/g, "Ê");
    },
    s_ocr_mot_1: function (s, m) {
        return m[0].replace(/l/g, "t").replace(/L/g, "T")+"|"+m[0].replace(/l/g, "i").replace(/L/g, "I");
    },
    c_ocr_par_le_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:ne|il|on|elle|je) +$/i) && morph(dDA, [m.start[2], m[2]], ":[NA].*:[me]:[si]", false);
    },
    c_ocr_par_la_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:ne|il|on|elle) +$/i) && morph(dDA, [m.start[2], m[2]], ":[NA].*:[fe]:[si]", false);
    },
    c_ocr_par_les_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:ne|tu) +$/i) && morph(dDA, [m.start[2], m[2]], ":[NA].*:[pi]", false);
    },
    c_ocr_peu_peux_peut_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].endsWith("u") && ! morph(dDA, prevword1(s, m.index), ":D.*:m:s", false, false);
    },
    c_ocr_peu_peux_peut_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].endsWith("x") && ! morph(dDA, prevword1(s, m.index), ":D.*:m:p", false, false);
    },
    c_ocr_puis_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D.*:m:p", false, false);
    },
    c_ocr_pour_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D.*:f:s", false, false);
    },
    c_ocr_près_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D.*:[me]:p", false, false);
    },
    c_ocr_que_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].endsWith("a") && ! look(s.slice(0,m.index), /sine +$/);
    },
    c_ocr_que_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].endsWith("o") && ! look(s.slice(0,m.index), /statu +$/);
    },
    c_ocr_qui_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D.*:m:s", false, false);
    },
    c_ocr_s_il_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].endsWith("s");
    },
    c_ocr_s_il_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    c_ocr_tard_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:ce|[mts]on|du|un|le) $/i);
    },
    c_ocr_l_est_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ]/i);
    },
    c_ocr_tête_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:je|il|elle|on|ne) $/i);
    },
    s_ocr_tête_1: function (s, m) {
        return m[0].replace(/è/g, "ê").replace(/È/g, "Ê");
    },
    s_ocr_ton_1: function (s, m) {
        return m[0].replace(/a/g, "o").replace(/A/g, "O");
    },
    s_ocr_toute_1: function (s, m) {
        return m[0].replace(/n/g, "u").replace(/N/g, "U");
    },
    c_ocr_tu_es_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":(?:N.*:f:p|V0e.*:3p)", false, false);
    },
    c_ocr_un_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:ce|d[eu]|un|quel|leur|le) +/i);
    },
    c_ocr_casse1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0].gl_isTitle() && look(s.slice(0,m.index), /[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ]/i);
    },
    c_ocr_casse1_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[0], m[0]], ":G", ":M");
    },
    s_ocr_casse1_2: function (s, m) {
        return m[0].toLowerCase();
    },
    c_ocr_casse1_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morphex(dDA, [m.start[0], m[0]], ":[123][sp]", ":[MNA]|>Est ");
    },
    s_ocr_casse1_3: function (s, m) {
        return m[0].toLowerCase();
    },
    s_ocr_casse2_1: function (s, m) {
        return m[1].toLowerCase();
    },
    c_ocr_casse3_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ]/i);
    },
    s_ocr_casse3_1: function (s, m) {
        return m[0].toLowerCase();
    },
    c_ocr_lettres_isolées_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[0].search(/[0-9aàAÀyYdlnmtsjcçDLNMTSJCÇ_]/) >= 0) && ! look(s.slice(0,m.index), /\d +$/) && ! (m[0].gl_isUpperCase() && look(sx.slice(m.end[0]), /^\./));
    },
    c_ocr_caractères_rares_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[0] != "<" && m[0] != ">";
    },
    c_double_négation_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D:[me]" ,false, false);
    },
    s_incohérences_globales1_1: function (s, m) {
        return suggSimil(m[2], ":[NA].*:[pi]", true);
    },
    s_incohérences_globales2_1: function (s, m) {
        return suggSimil(m[2], ":[NA].*:[si]", true);
    },
    c_incohérence_globale_au_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].gl_isUpperCase();
    },
    c_incohérence_globale_au_qqch_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">(?:[cdlmst]es|[nv]os|cettes?|[mts]a|mon|je|tu|ils?|elle?|[vn]ous|on|parce) ", false);
    },
    s_incohérence_globale_au_qqch_2: function (s, m) {
        return suggSimil(m[2], ":[NA].*:[si]", true);
    },
    c_incohérence_globale_au_qqch_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morph(dDA, [m.start[2], m[2]], ">quelle ", false);
    },
    c_incohérence_globale_au_qqch_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && m[2] == "combien" && morph(dDA, nextword1(s, m.end[0]), ":[AY]", false);
    },
    c_incohérence_globale_aux_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].gl_isUpperCase();
    },
    c_incohérence_globale_aux_qqch_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">(?:[cdlmst]es|[nv]os|cettes?|[mts]a|mon|je|tu|ils?|elle?|[vn]ous|on|parce) ", false);
    },
    s_incohérence_globale_aux_qqch_2: function (s, m) {
        return suggSimil(m[2], ":[NA].*:[pi]", true);
    },
    c_incohérence_globale_aux_qqch_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morph(dDA, [m.start[2], m[2]], ">quelle ", false);
    },
    c_incohérence_globale_aux_qqch_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && m[2] == "combien" && morph(dDA, nextword1(s, m.end[0]), ":[AY]", false);
    },
    s_incohérences_globales3_1: function (s, m) {
        return suggSimil(m[2], ":[NA].*:[pi]", true);
    },
    c_bs_avoir_été_chez_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[1].search(/^avoir$/i) >= 0) && morph(dDA, [m.start[1], m[1]], ">avoir ", false);
    },
    c_bs_à_date_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:être|mettre) ", false);
    },
    c_bs_incessamment_sous_peu_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[1].endsWith("u");
    },
    c_bs_incessamment_sous_peu_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    c_bs_malgré_que_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look_chk1(dDA, s.slice(m.end[0]), m.end[0], / [a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+ en ([aeo][a-zû]*)/i, ":V0a");
    },
    c_pleo_abolir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">abolir ", false);
    },
    c_pleo_acculer_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">acculer ", false);
    },
    c_pleo_achever_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">achever ", false);
    },
    c_pleo_en_cours_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(m.end[0]), / +de?\b/);
    },
    c_pleo_avancer_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">avancer ", false);
    },
    c_pleo_avenir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, prevword1(s, m.index), ":A|>un", false);
    },
    c_pleo_collaborer_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">collaborer ", false);
    },
    c_pleo_comparer_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">comparer ", false);
    },
    c_pleo_contraindre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">contraindre ", false);
    },
    c_pleo_enchevêtrer_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">enchevêtrer ", false);
    },
    c_pleo_entraider_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">entraider ", false);
    },
    c_pleo_joindre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">joindre ");
    },
    c_pleo_monter_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">monter ", false);
    },
    c_pleo_rénover_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">rénov(?:er|ation) ", false);
    },
    c_pleo_réunir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">réunir ", false);
    },
    c_pleo_reculer_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">recul(?:er|) ", false);
    },
    c_pleo_suffire_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">suffire ", false);
    },
    c_pleo_talonner_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">talonner ", false);
    },
    c_pleo_verbe_à_l_avance_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:prévenir|prévoir|prédire|présager|préparer|pressentir|pronostiquer|avertir|devancer|deviner|réserver) ", false);
    },
    c_pleo_différer_ajourner_reporter_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:ajourner|différer|reporter) ", false);
    },
    c_gn_mon_ton_son_euphonie_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ">[aâeéèêiîoôuûyœæ].+:[NAQ].*:f", ":[eGW]");
    },
    s_gn_mon_ton_son_euphonie_1: function (s, m) {
        return m[1].replace(/a/g, "on");
    },
    c_conf_à_le_la_les_leur_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":", ":[GNAWMBYŴ]");
    },
    s_conf_à_le_la_les_leur_1: function (s, m) {
        return suggSimil(m[1], ":[NA]", true);
    },
    c_conf_en_mts_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[3], m[3]], ":[123][sp]", ":[PY]") && ! m[0].endsWith("n’importe");
    },
    c_conf_en_mts_verbe_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[3], m[3]], ":3p", false);
    },
    s_conf_en_mts_verbe_2: function (s, m) {
        return suggVerb(m[2], ":P");
    },
    c_conf_en_mts_verbe_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[1].endsWith("se ") && morph(dDA, [m.start[3], m[3]], ":[NA]", false));
    },
    c_conf_malgré_le_la_les_leur_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":", ":[GNAWMB]");
    },
    s_conf_malgré_le_la_les_leur_1: function (s, m) {
        return suggSimil(m[1], ":[NA]", true);
    },
    c_conf_ma_ta_cette_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V.*:(?:Y|[123][sp])", ":[NAQ]") && m[2][0].gl_isLowerCase();
    },
    s_conf_ma_ta_cette_verbe_1: function (s, m) {
        return suggSimil(m[2], ":[NA]:[fe]:[si]", true);
    },
    c_conf_sa_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2][0].gl_isLowerCase() && morphex(dDA, [m.start[2], m[2]], ":V.*:(?:Y|[123][sp])", ":(?:N.*:[fe]|A|W)");
    },
    c_conf_sa_verbe_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], "V.....[pqx]", false);
    },
    c_conf_sa_verbe_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    c_conf_sa_verbe_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return hasSimil(m[2]);
    },
    s_conf_sa_verbe_4: function (s, m) {
        return suggSimil(m[2], ":[NA]:[fe]:[si]", true);
    },
    c_conf_du_cet_au_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V.*:(?:Y|[123][sp])", ":[NAQ]") && m[2][0].gl_isLowerCase() && ! (m[2] == "sortir" && (m[1].search(/au/i) >= 0));
    },
    s_conf_du_cet_au_verbe_1: function (s, m) {
        return suggSimil(m[2], ":[NA]:[me]:[si]", true);
    },
    c_conf_ce_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V.*:(?:Y|[123][sp])", ":[NAQ]:.:[si]|:V0e.*:3[sp]|>devoir") && m[2][0].gl_isLowerCase() && hasSimil(m[2]);
    },
    s_conf_ce_verbe_1: function (s, m) {
        return suggSimil(m[2], ":[NA]:[me]:[si]", true);
    },
    c_conf_mon_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V.*:(?:Y|[123][sp])", ":[NAQ]") && m[2][0].gl_isLowerCase();
    },
    s_conf_mon_verbe_1: function (s, m) {
        return suggSimil(m[2], ":[NA]:.:[si]", true);
    },
    c_conf_ton_son_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V.*:(?:Y|[123][sp])") && m[1][0].gl_isLowerCase() && look(s.slice(0,m.index), /^ *$|, *$/);
    },
    s_conf_ton_son_verbe_1: function (s, m) {
        return suggSimil(m[1], ":[NA]:[me]:[si]", true);
    },
    c_conf_det_plur_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V.*:(?:Y|[123][sp])", ":[NAQ]") && m[2][0].gl_isLowerCase() && ! (m[0].search(/^quelques? soi(?:ent|t|s)\b/i) >= 0);
    },
    s_conf_det_plur_verbe_1: function (s, m) {
        return suggSimil(m[2], ":[NA]:.:[pi]", true);
    },
    c_conf_auxdits_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V.*:(?:Y|[123][sp])", ":[NAQ]") && m[2][0].gl_isLowerCase();
    },
    s_conf_auxdits_verbe_1: function (s, m) {
        return suggSimil(m[2], ":[NA]:[me]:[pi]", true);
    },
    c_conf_auxdites_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V.*:(?:Y|[123][sp])", ":[NAQ]") && m[2][0].gl_isLowerCase();
    },
    s_conf_auxdites_verbe_1: function (s, m) {
        return suggSimil(m[2], ":[NA]:[fe]:[pi]", true);
    },
    c_conf_de_la_vconj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[123][sp]", ":[NAQ]");
    },
    c_conf_de_la_vconj_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V1.*:(?:Iq|Ip:2p)", ":1p");
    },
    s_conf_de_la_vconj_2: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_conf_de_la_vconj_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    s_conf_de_la_vconj_3: function (s, m) {
        return suggSimil(m[1], ":(?:[NA]:[fe]:[si])", false);
    },
    c_conf_de_le_nom_ou_vconj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:[me]", ":[YG]") && m[2][0].gl_isLowerCase();
    },
    c_conf_de_le_nom_ou_vconj_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[123][sp]", false);
    },
    s_conf_de_le_nom_ou_vconj_2: function (s, m) {
        return suggVerbInfi(m[2]);
    },
    c_conf_de_l_vconj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[123][sp]", ":[NAQ]");
    },
    s_conf_de_l_vconj_1: function (s, m) {
        return suggSimil(m[1], ":[NA]:.:[si]", true);
    },
    c_conf_un_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":(?:Y|[123][sp])") && ! look(s.slice(0,m.index), /(?:dont|sauf|un à) +$/i);
    },
    s_conf_un_verbe_1: function (s, m) {
        return suggSimil(m[1], ":[NAQ]:[me]:[si]", true);
    },
    c_conf_de_dès_par_vconj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1][0].gl_isLowerCase() && morph(dDA, [m.start[1], m[1]], ":V.*:[123][sp]");
    },
    s_conf_de_dès_par_vconj_1: function (s, m) {
        return suggSimil(m[1], ":[NA]", true);
    },
    c_conf_d_une_vconj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1][0].gl_isLowerCase() && morphex(dDA, [m.start[1], m[1]], ":V.*:[123][sp]", ":[GNA]") && ! look(s.slice(0,m.index), /\b(?:plus|moins) +$/i);
    },
    s_conf_d_une_vconj_1: function (s, m) {
        return suggSimil(m[1], ":[NA]", true);
    },
    c_conf_il_on_pas_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":", ":(?:[123][sp]|O[onw]|X)|ou ") && morphex(dDA, prevword1(s, m.index), ":", ":3s", true);
    },
    s_conf_il_on_pas_verbe_1: function (s, m) {
        return suggSimil(m[1], ":(?:3s|Oo)", false);
    },
    c_conf_ils_pas_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":", ":(?:[123][sp]|O[onw]|X)|ou ") && morphex(dDA, prevword1(s, m.index), ":", ":3p", true);
    },
    s_conf_ils_pas_verbe_1: function (s, m) {
        return suggSimil(m[1], ":(?:3p|Oo)", false);
    },
    c_conf_je_pas_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":", ":(?:[123][sp]|O[onw]|X)") && morphex(dDA, prevword1(s, m.index), ":", ":1s", true);
    },
    s_conf_je_pas_verbe_1: function (s, m) {
        return suggSimil(m[1], ":(?:1s|Oo)", false);
    },
    c_conf_tu_pas_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":", ":(?:[123][sp]|O[onw]|X)") && morphex(dDA, prevword1(s, m.index), ":", ":(?:2s|V0e|R)", true);
    },
    s_conf_tu_pas_verbe_1: function (s, m) {
        return suggSimil(m[1], ":(?:2s|Oo)", false);
    },
    c_conf_adj_part_présent1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":", ":P");
    },
    c_conf_adj_part_présent2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[NAQ]");
    },
    c_conf_très_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":(?:Y|[123][sp])", ":[AQW]");
    },
    s_conf_très_verbe_1: function (s, m) {
        return suggSimil(m[1], ":[AW]", true);
    },
    c_conf_très_verbe_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">jeûne ", false);
    },
    s_conf_très_verbe_2: function (s, m) {
        return m[1].replace(/û/g, "u");
    },
    c_conf_trop_vconj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[123][sp]", ":(?:[GNAQWM]|3p)") && ! look(s.slice(0,m.index), /\bce que? /i);
    },
    c_conf_presque_trop_vconj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[123][sp]", ":[GNAQWM]") && ! look(s.slice(0,m.index), /\bce que? |ou $/i);
    },
    c_conf_chez_vconj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[1][0].gl_isUpperCase() && morphex(dDA, [m.start[1], m[1]], ":[123][sp]", ":[GNAQM]");
    },
    c_conf_sur_vconj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[1][0].gl_isUpperCase() && morphex(dDA, [m.start[1], m[1]], ":[123][sp]", ":[GNAQM]") && ! morph(dDA, prevword1(s, m.index), ":[NA]:[me]:si", false);
    },
    c_conf_si_vconj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[123][sp]", ":[GNAQWMT]") && morphex(dDA, nextword1(s, m.end[0]), ":", ":D", true);
    },
    s_conf_si_vconj_1: function (s, m) {
        return suggSimil(m[1], ":[AWGT]", true);
    },
    c_conf_de_plus_en_plus_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":(?:[123][sp]|Y)", ":(?:[GAQW]|3p)") && ! morph(dDA, prevword1(s, m.index), ":V[123].*:[123][sp]|>(?:pouvoir|vouloir|falloir) ", false, false);
    },
    s_conf_de_plus_en_plus_verbe_1: function (s, m) {
        return suggVerbPpas(m[1]);
    },
    c_conf_a_à_grâce_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, prevword1(s, m.index), ":[VN]", false, true);
    },
    c_conf_a_à_moins_que_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_conf_a_à_face_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:[lmts]a|leur|une|en) +$/i);
    },
    c_conf_a_à_par_rapport_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:D|Oo|M)", false);
    },
    c_conf_a_à_être_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">être :V") && ! look(s.slice(0,m.index), /\bce que? /i);
    },
    c_conf_a_à_l_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[2].search(/^(?:côtés?|coups?|peu(?:-près|)|pics?|propos|valoir|plat-ventrismes?)/i) >= 0);
    },
    c_conf_a_à_l_à_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (m[2].search(/^(?:côtés?|coups?|peu-près|pics?|propos|valoir|plat-ventrismes?)/i) >= 0);
    },
    c_conf_a_à_il_on_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":3s", false, false);
    },
    c_conf_a_à_elle_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":(?:3s|R)", false, false) && ! morph(dDA, nextword1(s, m.end[0]), ":Oo|>qui ", false, false);
    },
    c_conf_a_à_qui_a_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":Q", ":M[12P]");
    },
    c_conf_a_à_le_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:[me]", ":(?:Y|Oo)");
    },
    c_conf_a_à_le_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f", ":(?:Y|Oo)");
    },
    c_conf_a_à_les_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ]", ":(?:Y|Oo)");
    },
    c_conf_a_à_base_cause_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\bce que?\b/i);
    },
    c_conf_a_à_part_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:M[12]|D|Oo)");
    },
    c_conf_a_participe_passé_ou_vconj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2].gl_isLowerCase() && m[2] != "coté";
    },
    c_conf_a_participe_passé_ou_vconj_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":(?:V.......[_z][az].*:Q|V1.*:Ip:2p)", ":[MGWNY]");
    },
    c_conf_a_participe_passé_ou_vconj_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && morph(dDA, [m.start[2], m[2]], "V1.*:(?:Ip:2p|Q)", false) && ! look(s.slice(0,m.index), /\b(?:il +|elle +|on +|l(?:es|ui|leur) +|[nv]ous +|y +|en +|[nmtsld]’)$/i);
    },
    s_conf_a_participe_passé_ou_vconj_3: function (s, m) {
        return suggVerbInfi(m[2]);
    },
    c_conf_a_participe_passé_ou_vconj_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morph(dDA, [m.start[2], m[2]], ":[123][sp]") && ! m[2].startsWith("tord");
    },
    c_conf_a_participe_passé_ou_vconj_5: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":V2.*:Ip:3s");
    },
    s_conf_a_participe_passé_ou_vconj_5: function (s, m) {
        return suggVerbPpas(m[2], ":m:s");
    },
    c_conf_a_participe_passé_ou_vconj_6: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_conf_a_participe_passé_ou_vconj_7: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    c_conf_a_à_locutions2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /[ln]’$|\b(?:il|elle|on|y|n’en) +$/i);
    },
    c_conf_a_à_locutions3_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /(?:\bque? |[ln]’$|\b(?:il|elle|on|y|n’en) +$)/i);
    },
    c_conf_a_à_locutions4_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /(?:\bque? |[ln]’$|\b(?:il|elle|on|y|n’en) +$)/i);
    },
    c_conf_a_à_infi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":Y", false) && ! look(s.slice(0,m.index), /\bque? |(?:il|elle|on|n’(?:en|y)) +$/i);
    },
    c_conf_mener_à_bien_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">mener ", false) && ( ! look(s.slice(0,m.index), /\bque? /) || morph(dDA, prevword1(s, m.index), ">(?:falloir|aller|pouvoir) ", false, true) );
    },
    c_conf_mener_à_bien_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_conf_mettre_à_profit_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">mettre ", false);
    },
    c_conf_aux_dépens_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[1].endsWith("x") && ! m[1].endsWith("X");
    },
    c_conf_aux_dépens_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].endsWith("ens") && ! m[2].endsWith("ENS");
    },
    c_conf_au_temps_pour_moi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_conf_ça_sa_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f") && ! (m[2].search(/^seule?s?/) >= 0);
    },
    c_conf_sa_ça1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":G", ">(?:tr(?:ès|op)|peu|bien|plus|moins|toute) |:[NAQ].*:f");
    },
    c_conf_çà_ça_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:[oO]h|[aA]h) +$/);
    },
    c_conf_çà_et_là_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":R");
    },
    c_conf_se_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2][0].gl_isLowerCase() && m[2] != "faire" && ( morphex(dDA, [m.start[2], m[2]], ":V[123].*:(?:Y|[123][sp])", ":[NAGM]|>(?:devoir|pouvoir|sembler) ") || (m[2].search(/-(?:ils?|elles?|on)$/) >= 0) );
    },
    c_conf_pour_ce_faire_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (m[0].indexOf(",") >= 0 || morphex(dDA, [m.start[2], m[2]], ":G", ":[AYD]"));
    },
    c_conf_qui_se_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":[NAQ].*:[me]") || look(s.slice(0,m.index), /\b[cs]e +$/i);
    },
    c_conf_ce_ne_être_doit_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">(?:être|pouvoir|devoir) .*:3s", false);
    },
    c_conf_ce_ne_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[123]s", ":P");
    },
    c_conf_ce_nom1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ]", ":([123][sp]|Y|P|Q)|>l[ea]? ");
    },
    c_conf_ce_nom2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":N.*:s", ":(?:A.*:[pi]|P|R)|>autour ");
    },
    c_conf_c_est4_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[WX]", ":N:.*:[pi]") && morph(dDA, [m.start[3], m[3]], ":[RD]|>pire ", false);
    },
    c_conf_ces_ses_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":N.*:p", ":(?:G|W|M|A.*:[si])");
    },
    c_conf_compte_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[1].startsWith("tenu") || look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_conf_en_fin_de_compte_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1].startsWith("f");
    },
    c_conf_en_fin_de_compte_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1].startsWith("l");
    },
    c_régler_son_compte_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">régler ", false);
    },
    c_conf_date1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(m.end[0]), /^ +(?:fra[iî]ches|dénoyautées|fourrées|sèches|séchées|cultivées|produites|muscade|medjool|Hamraya|deglet[ -]nour|kenta|allig|khouat)/i) || look(s.slice(0,m.index), /\b(?:confiture|crème|gâteau|mélasse|noyau|pâte|recette|sirop)[sx]? de +$|\b(?:moelleux|gateau|fondant|cake)[sx]? aux +$/i);
    },
    c_conf_dans1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1].endsWith("en") || look(s.slice(0,m.index), /^ *$/);
    },
    c_conf_être_davantage_ppas_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0e", false) && morphex(dDA, [m.start[3], m[3]], ":[NAQ]", ":G");
    },
    c_conf_davantage1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":Q|>(?:profiter|bénéficier|nombre) ") && ! morph(dDA, nextword1(s, m.end[0]), ">(?:financi[eè]re?|pécuni(?:er|aire)|sociaux)s? ", false, false);
    },
    c_conf_davantage2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ">(?:profiter|bénéficier) ", false) && ! morph(dDA, nextword1(s, m.end[0]), ">(?:financi[eè]re?|pécuni(?:er|aire)|sociaux)s? ", false, false);
    },
    c_conf_différent_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, prevword1(s, m.index), ":W", false, false);
    },
    s_conf_différent_1: function (s, m) {
        return m[0].replace(/end/g, "ent");
    },
    c_conf_différend1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, nextword1(s, m.end[0]), ":[GVX]", ":[NAQ]", true);
    },
    c_conf_différend2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, nextword1(s, m.end[0]), ":[GVX]", ":[NAQ]", true) && ! morph(dDA, prevword1(s, m.index), ":D", false, false);
    },
    c_conf_un_différend_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, nextword1(s, m.end[0]), ":[GV]", ":[NAQ]", false);
    },
    c_conf_différends_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, nextword1(s, m.end[0]), ":[GV]", ":[NAQ]", true);
    },
    c_conf_les_différends_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, nextword1(s, m.end[0]), ":G", ":[NAQ]", false);
    },
    c_conf_être_différent_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0e", false);
    },
    s_conf_être_différent_1: function (s, m) {
        return m[2].replace(/nd/g, "nt");
    },
    c_conf_eh_bien_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/) && ! morph(dDA, nextword1(s, m.end[0]), ":[WAY]", false, false);
    },
    c_conf_eh_ben_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[1].startsWith("B");
    },
    c_conf_faux_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ">(?:ils?|ne|en|y|leur|lui|nous|vous|[mtsl]e|la|les) ", false, true) && morphex(dDA, nextword1(s, m.end[0]), ":",  ":(?:Y|Oo|X|M)", true);
    },
    s_conf_flan_1: function (s, m) {
        return m[1].replace(/c/g, "").replace(/C/g, "");
    },
    s_conf_flanc_1: function (s, m) {
        return m[0].replace(/an/g, "anc").replace(/AN/g, "ANC");
    },
    c_conf_sur_le_flanc_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:attaquer|allonger|blesser|coucher|étendre|toucher) ", false);
    },
    s_conf_sur_le_flanc_1: function (s, m) {
        return m[0].replace(/an/g, "anc").replace(/AN/g, "ANC");
    },
    c_conf_tirer_au_flanc_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">tir(?:er|) ", false);
    },
    s_conf_tirer_au_flanc_1: function (s, m) {
        return m[0].replace(/an/g, "anc").replace(/AN/g, "ANC");
    },
    c_conf_la_là_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":E|>le ", false, false);
    },
    c_conf_les1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":N.*:m:[pi]");
    },
    c_conf_les2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(m.end[0]), /^ *$|^,/) || morph(dDA, prevword1(s, m.index), ":D.*:p");
    },
    c_conf_les2_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    c_conf_leurs_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":(?:[123][sp]|Y)", ":(?:G|N|A|M[12P])") && ! look(s.slice(0,m.index), /\b[ld]es +$/i);
    },
    c_conf_loin_s_en_faut_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[0].search(/loin s’en faut/i) >= 0) && morph(dDA, prevword1(s, m.index), ":N", ">(?:aller|venir|partir) ", true);
    },
    c_mais_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":O", ":3s") && look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_conf_on_ont_adverbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":W", ":3s") && ! morph(dDA, prevword1(s, m.index), ":V.*:3s", false, false);
    },
    c_conf_où_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":3[sp]", ":Y");
    },
    c_conf_vers_où_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D", false, false);
    },
    s_conf_pale_pâle1_1: function (s, m) {
        return m[1].replace(/pal/g, "pâl");
    },
    s_conf_pale_pâle2_1: function (s, m) {
        return m[1].replace(/pal/g, "pâl");
    },
    c_conf_peut_adv_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /très +$/);
    },
    c_conf_cela_peut_être_adj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[AQ]", false);
    },
    c_conf_peu_importe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, prevword1(s, m.index), ":C", false, true);
    },
    c_conf_un_peu_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /(?:quelqu|l|d)’/i);
    },
    c_conf_peu_adj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":A") && ! (m[2].search(/^seule?s?$/i) >= 0) && ! look(s.slice(0,m.index), /\b(?:il|on|ne|je|tu) +$/i);
    },
    c_conf_par_dessus_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":D|>bord ", false) && ! morph(dDA, prevword1(s, m.index), ":D.*:[me]|>(?:grande|petite) ", false, false);
    },
    c_conf_prêt_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /(?:peu|de|au plus) $/i) && morph(dDA, [m.start[2], m[2]], ":Y|>(?:tout|les?|la) ");
    },
    c_conf_près_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:Y|M[12P])|>(?:en|y|les?) ", false);
    },
    c_conf_quant_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ">(?:arriver|venir|à|revenir|partir|aller) ") && !(m[0].endsWith("à") && look(s.slice(m.end[0]), /^ +[mts]on tour[, ]/));
    },
    c_conf_qu_en2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":P", false);
    },
    c_conf_quand2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(m.end[0]), /^ +ne s(?:ai[st]|u[st]|urent|avai(?:[ts]|ent)) /);
    },
    c_conf_quand_bien_même_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(m.end[0]), /^ si /);
    },
    c_conf_quelle_nom_adj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ]", ":(?:G|[123][sp]|W)");
    },
    s_conf_quelle_nom_adj_1: function (s, m) {
        return m[1].replace(/ /g, "");
    },
    c_conf_qu_elle_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2].gl_isLowerCase() && (morphex(dDA, [m.start[2], m[2]], ":V|>(?:ne?|me?|te?|se?|[nv]ous|l(?:e|a|es|ui|leur|)|en|y) ", ":[NA].*:[fe]|>(?:plus|moins)") || m[2] == "t" || m[2] == "s") && ! (morph(dDA, [m.start[2], m[2]], ">(?:pouvoir|devoir|en)", false) && morph(dDA, nextword1(s, m.end[0]), ":V0e", false));
    },
    c_conf_qu_elle_verbe_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1].endsWith("e") && ! morph(dDA, [m.start[2], m[2]], ":V0e", false) && ! (morph(dDA, [m.start[2], m[2]], ":V0a", false) && look(s.slice(m.end[0]), /^ +été /));
    },
    c_conf_qu_elle_verbe_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && m[1].endsWith("s") && ! morph(dDA, [m.start[2], m[2]], ":V0e", false)  && ! (morph(dDA, [m.start[2], m[2]], ":V0a", false) && look(s.slice(m.end[0]), /^ +été /));
    },
    c_conf_qu_elle_verbe_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morph(dDA, [m.start[2], m[2]], ":V0e", false) && morphex(dDA, nextword1(s, m.end[0]), ":[QA]", ":G", false);
    },
    c_conf_qu_elle_verbe_5: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1].endsWith("e");
    },
    c_conf_qu_elle_verbe_6: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && m[1].endsWith("s");
    },
    c_être_pas_sans_savoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0e", false);
    },
    c_conf_il_on_s_en_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/) && morph(dDA, [m.start[2], m[2]], ":V", false);
    },
    c_conf_elle_s_en_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/) && morph(dDA, [m.start[2], m[2]], ":V", false) && ! ( m[1] == "sans" && morph(dDA, [m.start[2], m[2]], ":[NY]", false) );
    },
    c_conf_son_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NA].*:[me]:s|>[aeéiîou].* :[NA].*:f:s", ":[GW]") && morphex(dDA, prevword1(s, m.index), ":V|>(?:à|avec|chez|dès|contre|devant|derrière|en|par|pour|sans|sur) ", ":[NA].*:[pi]|>(?:ils|elles|vous|nous|leur|lui|[nmts]e) ", true) && ! look(s.slice(0,m.index), /\bce que? |[mts]’en +$/i);
    },
    c_conf_qui_sont_les_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, nextword1(s, m.end[0]), ":[DR]", false, true);
    },
    c_conf_sûr_de_nom_propre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":M[12]", false);
    },
    c_conf_en_temps_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(m.end[0]), /^[ ’](?:lieux|endroits|places|mondes|villes|pays|régions|cités)/);
    },
    c_conf_ouvrir_la_voix_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">ouvrir ", false);
    },
    c_conf_voir_voire_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[2].search(/^(?:grand|petit|rouge)$/) >= 0) && morphex(dDA, [m.start[2], m[2]], ":A", ":[NGM]") && ! m[2].gl_isTitle() && ! look(s.slice(0,m.index), /\b[ndmts](?:e |’(?:en |y ))(?:pas |jamais |) *$/i) && ! morph(dDA, prevword1(s, m.index), ":O[os]|>(?:[ndmts]e|falloir|pouvoir|savoir|de) ", false);
    },
    c_conf_voire_voir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, prevword1(s, m.index), ":Cs|>(?:ni|et|sans|pour|falloir|[pv]ouvoir|aller) ", true, false);
    },
    c_conf_j_y_en_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":", ":(?:[123][sp]|O[onw])");
    },
    s_conf_j_y_en_qqch_1: function (s, m) {
        return suggSimil(m[2], ":1s", false);
    },
    c_conf_ne_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":", ":(?:[123][sp]|Y|P|O[onw]|X)|>(?:[lmtsn]|surtout|guère|presque|même|tout|parfois|vraiment|réellement|justement) ") && ! (m[2].search(/-(?:ils?|elles?|[nv]ous|je|tu|on|ce)$/i) >= 0);
    },
    s_conf_ne_qqch_1: function (s, m) {
        return suggSimil(m[2], ":(?:[123][sp]|Oo|Y)", false);
    },
    c_conf_n_y_en_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":", ":(?:[123][sp]|Y|P|O[onw]|X)") && ! (m[2].search(/-(?:ils?|elles?|[nv]ous|je|tu|on|ce)$/i) >= 0);
    },
    s_conf_n_y_en_qqch_1: function (s, m) {
        return suggSimil(m[2], ":(?:[123][sp]|Y)", false);
    },
    c_conf_ne_pronom_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":", ":(?:[123][sp]|Y|P|O[onw]|X)") && ! (m[2].search(/-(?:ils?|elles?|[nv]ous|je|tu|on|ce)$/i) >= 0);
    },
    s_conf_ne_pronom_qqch_1: function (s, m) {
        return suggSimil(m[2], ":(?:[123][sp]|Y)", false);
    },
    c_conf_me_te_se_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[0].search(/^se que?/i) >= 0) && morphex(dDA, [m.start[2], m[2]], ":", ":(?:[123][sp]|Y|P|Oo)|>[lmts] ") && ! (m[2].search(/-(?:ils?|elles?|[nv]ous|je|tu|on|ce)$/i) >= 0);
    },
    s_conf_me_te_se_qqch_1: function (s, m) {
        return suggSimil(m[2], ":(?:[123][sp]|Oo|Y)", false);
    },
    c_conf_m_t_s_y_en_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":", ":(?:[123][sp]|Y|P|X|Oo)|rien ") && ! (m[2].search(/-(?:ils?|elles?|[nv]ous|je|tu|on|ce)$/i) >= 0);
    },
    s_conf_m_t_s_y_en_qqch_1: function (s, m) {
        return suggSimil(m[2], ":(?:[123][sp]|Y)", false);
    },
    c_conf_m_s_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":", ":(?:[123][sp]|Y|P)|>(?:en|y|ils?) ") && ! (m[2].search(/-(?:ils?|elles?|[nv]ous|je|tu|on|ce)$/i) >= 0);
    },
    s_conf_m_s_qqch_1: function (s, m) {
        return suggSimil(m[2], ":(?:[123][sp]|Y)", false);
    },
    c_conf_t_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":", ":(?:[123][sp]|Y|P)|>(?:en|y|ils?|elles?) ") && ! (m[2].search(/-(?:ils?|elles?|[nv]ous|je|tu|on|ce)$/i) >= 0);
    },
    s_conf_t_qqch_1: function (s, m) {
        return suggSimil(m[2], ":(?:[123][sp]|Y)", false);
    },
    c_conf_c_ç_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":", ":[123][sp]|>(?:en|y|que?) ") && ! (m[2].search(/-(?:ils?|elles?|[nv]ous|je|tu|on|dire)$/i) >= 0);
    },
    s_conf_c_ç_qqch_1: function (s, m) {
        return suggSimil(m[2], ":3s", false);
    },
    c_conj_xxxai_sans_sujet_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ( morph(dDA, [m.start[0], m[0]], ":1s") || ( look(s.slice(0,m.index), /> +$/) && morph(dDA, [m.start[0], m[0]], ":1s", false) ) ) && ! (m[0].slice(0,1).gl_isUpperCase() && look(sx.slice(0,m.index), /[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ]/)) && ! look(s.slice(0,m.index), /\b(?:j(?:e |[’'])|moi(?:,? qui| seul) )/i);
    },
    s_conj_xxxai_sans_sujet_1: function (s, m) {
        return suggVerb(m[0], ":3s");
    },
    c_conj_xxxes_sans_sujet_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[0], m[0]], ":2s", ":(?:E|G|W|M|J|[13][sp]|2p)") && ! m[0].slice(0,1).gl_isUpperCase() && ! look(s.slice(0,m.index), /^ *$/) && ( ! morph(dDA, [m.start[0], m[0]], ":[NAQ]", false) || look(s.slice(0,m.index), /> +$/) ) && ! look(s.slice(0,m.index), /\bt(?:u |[’']|oi,? qui |oi seul )/i);
    },
    s_conj_xxxes_sans_sujet_1: function (s, m) {
        return suggVerb(m[0], ":3s");
    },
    c_conj_xxxas_sans_sujet_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[0], m[0]], ":2s", ":(?:G|W|M|J|[13][sp]|2p)") && ! (m[0].slice(0,1).gl_isUpperCase() && look(sx.slice(0,m.index), /[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ]/)) && ( ! morph(dDA, [m.start[0], m[0]], ":[NAQ]", false) || look(s.slice(0,m.index), /> +$/) ) && ! look(s.slice(0,m.index), /\bt(?:u |[’']|oi,? qui |oi seul )/i);
    },
    s_conj_xxxas_sans_sujet_1: function (s, m) {
        return suggVerb(m[0], ":3s");
    },
    c_conj_xxxxs_sans_sujet_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[0], m[0]], ":[12]s", ":(?:E|G|W|M|J|3[sp]|2p|1p)") && ! (m[0].slice(0,1).gl_isUpperCase() && look(sx.slice(0,m.index), /[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ]/)) && ( ! morph(dDA, [m.start[0], m[0]], ":[NAQ]", false) || look(s.slice(0,m.index), /> +$/) || ( (m[0].search(/^étais$/i) >= 0) && ! morph(dDA, prevword1(s, m.index), ":[DA].*:p", false, true) ) ) && ! look(s.slice(0,m.index), /\b(?:j(?:e |[’'])|moi(?:,? qui| seul) |t(?:u |[’']|oi,? qui |oi seul ))/i);
    },
    s_conj_xxxxs_sans_sujet_1: function (s, m) {
        return suggVerb(m[0], ":3s");
    },
    c_conj_peux_veux_sans_sujet_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[0].slice(0,1).gl_isUpperCase() && look(sx.slice(0,m.index), /[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ]/)) && ! look(s.slice(0,m.index), /\b(?:j(?:e |[’'])|moi(?:,? qui| seul) |t(?:u |[’']|oi,? qui |oi seul ))/i);
    },
    s_conj_peux_veux_sans_sujet_1: function (s, m) {
        return suggVerb(m[0], ":3s");
    },
    c_conj_équivaux_prévaux_sans_sujet_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[0].slice(0,1).gl_isUpperCase() && look(sx.slice(0,m.index), /[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ]/)) && ! (m[0] == "vaux" && morph(dDA, prevword1(s, m.index), ":(?:R|D.*:p)", false, false)) && ! look(s.slice(0,m.index), /\b(?:j(?:e |[’'])|moi(?:,? qui| seul) |t(?:u |[’']|oi,? qui |oi seul ))/i);
    },
    s_conj_équivaux_prévaux_sans_sujet_1: function (s, m) {
        return suggVerb(m[0], ":3s");
    },
    c_conj_xxxons_sans_sujet_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[0], m[0]], ":V.*:1p", ":[EGMNAJ]") && ! (m[0].slice(0,1).gl_isUpperCase() && look(s.slice(0,m.index), /[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ]/)) && ! look(sx.slice(0,m.index), /\b(?:[nN]ous(?:-mêmes?|)|(?:[eE]t|[oO]u) moi(?:-même|)|[nN]i (?:moi|nous)),? /);
    },
    s_conj_xxxons_sans_sujet_1: function (s, m) {
        return suggVerb(m[0], ":3p");
    },
    c_conj_xxxez_sans_sujet_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[0], m[0]], ":V.*:2p", ":[EGMNAJ]") && ! (m[0].slice(0,1).gl_isUpperCase() && look(s.slice(0,m.index), /[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ]/)) && ! look(sx.slice(0,m.index), /\b(?:[vV]ous(?:-mêmes?|)|(?:[eE]t|[oO]u) toi(?:-même|)|[tT]oi(?:-même|) et|[nN]i (?:vous|toi)),? /);
    },
    c_p_tout_débuts_petits_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /\b(aux|[ldmtsc]es|[nv]os|leurs) +$/);
    },
    c_p_les_tout_xxx_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[AQ].*:[pi]", false);
    },
    c_gn_tous_deux_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_gn_tous_déterminant_pluriel_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:d[eu]|avant|après|sur|malgré) +$/i);
    },
    c_gn_tous_les_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:d[eu]|avant|après|sur|malgré) +$/i) && ! morph(dDA, [m.start[2], m[2]], ":(?:3s|Oo)", false);
    },
    c_gn_tous_ceux_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:d[eu]|avant|après|sur|malgré) +$/i);
    },
    c_gn_toutes_déterminant_nom_fem_plur_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":f", ":(?:[123][sp]|[me])") && morphex(dDA, prevword1(s, m.index), ":", ":(?:R|[123][sp]|Q)|>(?:[nv]ous|eux) ", true);
    },
    c_gn_toutes_déterminant_nom_fem_plur_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_toutes_déterminant_nom_fem_plur_2: function (s, m) {
        return suggMasPlur(m[2], true);
    },
    c_gn_tous_déterminant_nom_mas_plur_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":m", ":(?:[123][sp]|[fe])") && morphex(dDA, prevword1(s, m.index), ":", ":(?:R|[123][sp]|Q)|>(?:[nv]ous|eux) ", true);
    },
    c_gn_tous_déterminant_nom_mas_plur_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_tous_déterminant_nom_mas_plur_2: function (s, m) {
        return suggFemPlur(m[2], true);
    },
    c_gn_tout_nom_mas_sing_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":N.*:[fp]", ":(?:A|W|G|M[12P]|Y|[me]:i|3s)") && morph(dDA, prevword1(s, m.index), ":R|>de ", false, true);
    },
    s_gn_tout_nom_mas_sing_1: function (s, m) {
        return suggMasSing(m[1], true);
    },
    c_gn_toute_nom_fem_sing_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[NAQ].*:[mp]") && morph(dDA, prevword1(s, m.index), ":R|>de ", false, true);
    },
    s_gn_toute_nom_fem_sing_1: function (s, m) {
        return suggFemSing(m[1], true);
    },
    c_gn_tous_nom_mas_plur_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[NAQ].*:[fs]") && morph(dDA, prevword1(s, m.index), ":R|>de ", false, true);
    },
    s_gn_tous_nom_mas_plur_1: function (s, m) {
        return suggMasPlur(m[1], true);
    },
    c_gn_toutes_nom_fem_plur_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[NAQ].*:[ms]") && morph(dDA, prevword1(s, m.index), ":R|>de ", false, true);
    },
    s_gn_toutes_nom_fem_plur_1: function (s, m) {
        return suggFemPlur(m[1], true);
    },
    c_ne_manquant1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[123][sp]", false) && ! ((m[2].search(/^(?:jamais|rien)$/i) >= 0) && look(s.slice(0,m.index), /\b(?:que?|plus|moins) /));
    },
    c_ne_manquant2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[123][sp]", false) && ! ((m[2].search(/^(?:jamais|rien)$/i) >= 0) && look(s.slice(0,m.index), /\b(?:que?|plus|moins) /));
    },
    c_ne_manquant3_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[123][sp]", false) && ! ((m[3].search(/^(?:jamais|rien)$/i) >= 0) && look(s.slice(0,m.index), /\b(?:que?|plus|moins) /));
    },
    c_ne_manquant4_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[123][sp]", false) && ! ((m[3].search(/^(?:jamais|rien)$/i) >= 0) && look(s.slice(0,m.index), /\b(?:que?|plus|moins) /));
    },
    c_infi_ne_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":(?:Y|W|O[ow])|>que? ", false) && _oSpellChecker.isValid(m[1]);
    },
    s_infi_ne_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_imp_infinitif_erroné_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V1.*:Y", false) && look(s.slice(0,m.index), /^ *$|, *$/);
    },
    s_imp_infinitif_erroné_1: function (s, m) {
        return suggVerbTense(m[1], ":E", ":2p");
    },
    c_p_en_année_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, nextword1(s, m.end[0]), ":[AN].*:[pi]", false, false);
    },
    c_p_de_année_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":A.*:s", false);
    },
    c_p_un_nombre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":A.*:s");
    },
    c_loc_côte_à_côte_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[0].search(/^côte à côte$/i) >= 0);
    },
    c_p_grand_bien_lui_fasse_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/);
    },
    p_p_le_pour_et_le_contre_1: function (s, m) {
        return m[0].replace(/ /g, "_");
    },
    c_loc_tour_à_tour_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[0].search(/^tour à tour$/i) >= 0);
    },
    c_p_qqch_tiret_là_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ]", ":G");
    },
    c_p_tout_au_long_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":R", false, false);
    },
    c_p_suite_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:une|la|cette|[mts]a|[nv]otre|de) +/i);
    },
    c_p_dét_plur_nombre_nom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NA].*:[pi]", ":(?:V0|3p)|>(?:janvier|février|mars|avril|mai|juin|juillet|ao[ûu]t|septembre|octobre|novembre|décembre|vendémiaire|brumaire|frimaire|nivôse|pluviôse|ventôse|germinal|floréal|prairial|messidor|thermidor|fructidor)");
    },
    c_loc_arc_à_poulies_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_armes_à_feu_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_bombe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_canne_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1].indexOf("ane") != -1;
    },
    s_loc_canne_à_1: function (s, m) {
        return m[1].replace(/ane/g, "anne");
    },
    c_loc_canne_à_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[3] == "a";
    },
    c_loc_caisse_à_outils_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_chair_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_crayon_à_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_cuillère_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_fard_à_paupières_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_fils_fille_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_gaz_à_effet_de_serre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_lime_à_ongles_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_machine_à_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_p_mineur_de_moins_de_x_ans_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2].gl_isDigit() || morph(dDA, [m.start[2], m[2]], ":B", false);
    },
    c_loc_moule_à_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_p_numéro_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /\b[lL]a +$/);
    },
    d_p_numéro_1: function (s, m, dDA) {
        return define(dDA, m.start[0], [">numéro :N:f:s"]);
    },
    c_p_papier_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_remire_à_plat_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_rouge_à_lèvres_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_sac_à_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_silo_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_soue_à_cochons_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_p_trou_à_rat_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_tueur_à_gages_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_vache_à_lait_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_vente_à_domicile_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_vernis_à_ongles_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_vol_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_loc_voie_de_recours_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1].endsWith("x");
    },
    c_loc_usine_à_gaz_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "a";
    },
    c_p_qqch_100_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:[pi]", ":(?:G|3p)");
    },
    c_p_det_plur_nombre_nom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:[pi]", ":(?:G|3p)");
    },
    c_p_à_xxx_pour_cent_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":B", false);
    },
    c_p_au_moins_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":[AQ].*:[me]:[si]", false);
    },
    c_p_au_hasard_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return isEndOfNG(dDA, s.slice(m.end[0]), m.end[0]);
    },
    c_p_aussi_adv_que_possible_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":W", false);
    },
    c_p_au_sens_adj_du_terme_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":A .*:m:s", false);
    },
    c_p_nombre_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, prevword1(s, m.index), ":(?:R|C[sc])", false, true);
    },
    c_p_à_xxx_reprises_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":B", false) || (m[1].search(/^(?:plusieurs|maintes)/i) >= 0);
    },
    c_p_bien_entendu_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, nextword1(s, m.end[0]), ":[NAQR]|>que? ", false, true);
    },
    c_p_comme_pronom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ]", ":V0");
    },
    c_p_pêle_mêle_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":D", false);
    },
    c_p_droit_devant_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":D.*:[me]:[si]", false);
    },
    c_p_dans_xxx_cas_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, nextword1(s, m.end[0]), ":([AQ].*:[me]:[pi])", false, false);
    },
    c_p_du_coup_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":A", false);
    },
    c_p_verbe_pronom_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:croire|devoir|estimer|imaginer|penser) ");
    },
    c_p_en_partie_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":(?:R|D|[123]s|X)", false);
    },
    c_p_en_plus_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, nextword1(s, m.end[0]), ":A", false, true);
    },
    c_p_en_plus_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    c_p_en_quelques_tps1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":[AQ]:[ef]:[si]", false);
    },
    c_p_en_quelques_tps2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":[AQ]:[em]:[si]", false);
    },
    c_p_entre_pronom_et_pronom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:il +|n’)$/i);
    },
    c_p_haut_et_fort_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D", false, false);
    },
    c_p_hélas_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\bt(?:u|oi qui)[ ,]/i);
    },
    c_p_nécessité_fait_loi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D", false, false);
    },
    c_p_non_par_trop_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":A", false);
    },
    c_p_plein_est_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D", false, false);
    },
    c_p_plus_adv_que_prévu_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":W", false);
    },
    c_p_plus_adv_que_les_autres_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[AW]", ":G");
    },
    c_p_plus_adv_les_uns_que_les_autres_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[AW]", false);
    },
    c_p_pour_autant_que_su_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":Y", false);
    },
    c_p_tambour_battant_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, prevword1(s, m.index), ":(?:V|N:f)", ":G");
    },
    c_p_tête_baissée_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NV]", ":D");
    },
    c_p_tant_que_ça_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":(?:3s|X)", false);
    },
    c_p_putain_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[me]", false);
    },
    c_p_nom_propre_nom_propre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":M[12]", false);
    },
    c_p_nom_propre_nom_propre_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && m[2] != "";
    },
    c_p_de_nom_propre_et_ou_de_nom_propre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":M", false) && morph(dDA, [m.start[2], m[2]], ":M", false);
    },
    c_p_de_nom_propre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":M", false) || ! _oSpellChecker.isValid(m[1]);
    },
    c_p_entre_nom_propre_et_nom_propre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":(?:M[12]|N)") && morph(dDA, [m.start[2], m[2]], ":(?:M[12]|N)");
    },
    c_p_en_nom_propre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":MP");
    },
    c_p_titre_masculin_nom_propre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":M[12]", false);
    },
    c_p_titre_féminin_nom_propre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":M[12]", false);
    },
    c_p_nom_propre_et_pronom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[MT]", false) && morph(dDA, prevword1(s, m.index), ":Cs", false, true) && ! look(s.slice(0,m.index), /\b(?:plus|moins|aussi) .* que +$/);
    },
    p_p_nom_propre_et_pronom_1: function (s, m) {
        return rewriteSubject(m[1],m[2]);
    },
    c_p_être_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0e", false);
    },
    c_p_être_pronom_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0e", false);
    },
    c_p_qqch_on_ne_peut_plus_que_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":(?:V0e|N)", false) && morph(dDA, [m.start[3], m[3]], ":[AQ]", false);
    },
    c_p_avoir_être_loc_adv1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0", false);
    },
    c_p_avoir_être_loc_adv2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0", false) && morph(dDA, [m.start[3], m[3]], ":[QY]", false);
    },
    c_p_avoir_loc_adv_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0a", false) && ! (m[2] == "crainte" && look(s.slice(0,m.index), /[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ]/));
    },
    c_p_avoir_pronom_loc_adv_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0a", false);
    },
    c_p_avoir_tous_toutes_les_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0a", false) && morph(dDA, [m.start[3], m[3]], ":B", false) && morph(dDA, [m.start[4], m[4]], ">besoin |:(?:Q|V1.*:Y)", false);
    },
    c_p_elle_aussi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":A:[fe]:s", false);
    },
    c_p_elle_aussi_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morphex(dDA, [m.start[2], m[2]], ":W", ":3s") && morph(dDA, nextword1(s, m.end[0]), ":A:[fe]:s", false, true);
    },
    c_p_elles_aussi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":A:[fe]:p", false);
    },
    c_p_elles_aussi_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morphex(dDA, [m.start[2], m[2]], ":W", ":3p") && morph(dDA, nextword1(s, m.end[0]), ":A:[fe]:p", false, true);
    },
    c_p_verbe_loc_adv1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V", false);
    },
    c_p_verbe_loc_adv2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V[123]");
    },
    c_p_verbe_loc_adv3_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V[123]", false);
    },
    c_p_verbe_pronom_aussi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V", false);
    },
    c_p_verbe_même_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":G");
    },
    c_p_le_xxx_le_plus_adj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[me]", ":G") && morph(dDA, [m.start[3], m[3]], ":[AQ].*:[me]", false);
    },
    c_p_la_xxx_la_plus_adj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[fe]", ":G") && morph(dDA, [m.start[3], m[3]], ":[AQ].*:[fe]", false);
    },
    c_p_les_xxx_les_plus_adj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[pi]", ":[123][sp]") && morph(dDA, [m.start[3], m[3]], ":A.*:[pi]", false);
    },
    c_p_le_plus_le_moins_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":A", ":([me]:[si]|G)") && morph(dDA, prevword1(s, m.index), ">(?:avoir|être) :V", false);
    },
    c_p_bien_mal_fort_adj_adv_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[AW]");
    },
    c_p_loc_adj_adv_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[AW]", false);
    },
    c_p_un_brin_chouïa_rien_tantinet_soupçon_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":A", ":G");
    },
    c_p_assez_trop_adv_xxxment_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":W", ":3p");
    },
    c_p_assez_trop_adj_adv_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[AW]", ":[123][sp]");
    },
    c_p_le_la_plus_moins_adv_xxxment_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[NAQ]", false) && morph(dDA, [m.start[3], m[3]], ":W", false) && morph(dDA, [m.start[4], m[4]], ":[AQ]", false);
    },
    c_p_complètement_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D", false, true);
    },
    c_p_adverbe_xxxment_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":W\\b");
    },
    c_p_couleurs_invariables_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[NAQ]", false);
    },
    c_p_locutions_adj_nom_et_couleurs_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":(?:N|A|Q|V0e)", ":D");
    },
    c_p_jamais1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\bne +$/i);
    },
    c_p_à_nos_yeux_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":A.*:[me]:[pi]", false);
    },
    c_p_à_la_dernière_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":A.*:[fe]:[si]", false);
    },
    c_p_à_l_époque_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":A.*:[fe]:[si]", false);
    },
    c_p_au_pire_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":A", ":N:[me]:[si]");
    },
    c_p_ben_voyons_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_p_chaque_année_semaine_journée_décennie_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":(?:A.*:[fe]:[si]|Oo|[123][sp])", false);
    },
    c_p_chaque_an_jour_mois_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":(?:A.*:[me]:[si]|Oo|[123][sp])", false);
    },
    c_p_d_évidence_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":A.*:[fe]:[si]", false);
    },
    c_p_dans_l_ensemble_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":A.*:[me]:[si]", false);
    },
    c_p_de_ce_seul_fait_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":A.*:[me]:[si]", false);
    },
    c_p_dès_le_départ_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":A.*:[me]:[si]");
    },
    c_p_dès_les_premiers_jours_mois_ans_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":A.*:[me]:[pi]", false);
    },
    c_p_dès_les_premières_années_heures_minutes_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":A.*:[fe]:[pi]", false);
    },
    c_p_en_certaines_plusieurs_occasions_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":A.*:[fe]:[pi]", false);
    },
    c_p_entre_autres_choses_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":A.*:[fe]:[pi]", false);
    },
    c_p_quelques_minutes_heures_années_plus_tard_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":A.*:[fe]:[pi]", false);
    },
    c_p_quelques_instants_jours_siècles_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":A.*:[me]:[pi]", false);
    },
    c_p_un_moment_instant_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":A.*:[me]:[si]", false);
    },
    c_loc_arriver_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">arriver ", false);
    },
    c_loc_arriver_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[3] == "a";
    },
    c_p_donner_sens_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:re|)donner ", false);
    },
    c_p_faire_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">faire ", false);
    },
    c_p_faire_qqch_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_loc_laisser_pour_compte_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">laisser ", false);
    },
    c_loc_laisser_pour_compte_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[3] != "compte";
    },
    c_loc_mettre_à_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">mettre ", false);
    },
    c_loc_mettre_à_qqch_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[3] == "a";
    },
    c_p_mettre_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">mettre ", false);
    },
    c_loc_mourir_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">mourir ", false);
    },
    s_loc_mourir_qqch_1: function (s, m) {
        return m[2].replace(/û/g, "u");
    },
    c_p_paraitre_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">para[îi]tre ", false);
    },
    s_p_paraitre_qqch_1: function (s, m) {
        return m[2].replace(/û/g, "u");
    },
    c_p_porter_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">porter ", false);
    },
    c_loc_prendre_à_la_légère_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">prendre ", false);
    },
    c_loc_prendre_à_la_légère_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[3] == "a";
    },
    c_p_prendre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">prendre ", false);
    },
    c_loc_rendre_compte_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">rendre ", false);
    },
    c_loc_rester_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">rester ", false);
    },
    c_loc_rester_qqch_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">jeûne ", false);
    },
    s_loc_rester_qqch_2: function (s, m) {
        return m[2].replace(/û/g, "u");
    },
    c_loc_rester_qqch_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    c_loc_semble_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">sembler ", false);
    },
    s_loc_semble_qqch_1: function (s, m) {
        return m[2].replace(/û/g, "u");
    },
    c_p_sembler_paraitre_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:sembler|para[îi]tre) ") && morphex(dDA, [m.start[3], m[3]], ":A", ":G");
    },
    c_loc_suivre_de_près_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">suivre ", false);
    },
    c_loc_suivre_de_près_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[3] != "près";
    },
    c_loc_tenir_à_distance_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">tenir ", false);
    },
    c_loc_tenir_à_distance_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[3] == "a";
    },
    c_loc_tenir_compte_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">tenir ", false);
    },
    c_loc_tenir_compte_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">co[mn]te(?:sse|) ", false);
    },
    c_p_tirer_profit_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">tirer ", false);
    },
    c_loc_tourner_court_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">tourner ", false);
    },
    c_loc_tourner_court_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] != "court";
    },
    c_p_trier_sur_le_volet_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">trier ", false);
    },
    c_p_venir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">venir ", false);
    },
    c_redondances_phrase_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":(?:G|V0)|>même ", false);
    },
    c_redondances_phrase_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_au_le_nom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[NAQ]", false);
    },
    c_au_les_nom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[NAQ]", false);
    },
    c_au_la_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[NAQ].*:[fe]", false);
    },
    c_gn_l_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:p", ":[123][sp]|:[si]");
    },
    s_gn_l_accord_1: function (s, m) {
        return suggSing(m[1]);
    },
    c_gn_le_accord1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f", ":(?:e|m|P|G|W|[123][sp]|Y)");
    },
    s_gn_le_accord1_1: function (s, m) {
        return suggLesLa(m[2]);
    },
    c_gn_le_accord1_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasMasForm(m[2]);
    },
    s_gn_le_accord1_2: function (s, m) {
        return suggMasSing(m[2], true);
    },
    c_gn_le_accord1_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:p");
    },
    s_gn_le_accord1_3: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_gn_le_accord1_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_gn_le_accord2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":D", false);
    },
    c_gn_le_accord2_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:f", ":(?:e|m|P|G|W|[123][sp]|Y)") || ( morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:f", ":[me]") && morphex(dDA, [m.start[1], m[1]], ":R", ">(?:e[tn]|ou) ") && ! (morph(dDA, [m.start[1], m[1]], ":Rv", false) && morph(dDA, [m.start[3], m[3]], ":Y", false)) );
    },
    s_gn_le_accord2_2: function (s, m) {
        return suggLesLa(m[3]);
    },
    c_gn_le_accord2_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasMasForm(m[3]);
    },
    s_gn_le_accord2_3: function (s, m) {
        return suggMasSing(m[3], true);
    },
    c_gn_le_accord2_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morph(dDA, [m.start[3], m[3]], ":[NAQ].*:p") || ( morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[si]") && morphex(dDA, [m.start[1], m[1]], ":[RC]", ">(?:e[tn]|ou)") && ! (morph(dDA, [m.start[1], m[1]], ":Rv", false) && morph(dDA, [m.start[3], m[3]], ":Y", false)) );
    },
    s_gn_le_accord2_4: function (s, m) {
        return suggMasSing(m[3]);
    },
    c_gn_le_accord2_5: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_gn_le_accord3_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f", ":(?:e|m|P|G|W|Y)");
    },
    s_gn_le_accord3_1: function (s, m) {
        return suggLesLa(m[2]);
    },
    c_gn_le_accord3_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasMasForm(m[2]);
    },
    s_gn_le_accord3_2: function (s, m) {
        return suggMasSing(m[2], true);
    },
    c_gn_le_accord3_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[siGW]");
    },
    s_gn_le_accord3_3: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_gn_le_accord3_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_gn_ledit_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f", ":[GWme]");
    },
    c_gn_ledit_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasMasForm(m[2]);
    },
    s_gn_ledit_accord_2: function (s, m) {
        return suggMasSing(m[2], true);
    },
    c_gn_ledit_accord_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[siGW]");
    },
    s_gn_ledit_accord_3: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_gn_un_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f", ":(?:e|m|G|W|V0|3s|Y)");
    },
    c_gn_un_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasMasForm(m[2]);
    },
    s_gn_un_accord_2: function (s, m) {
        return suggMasSing(m[2], true);
    },
    c_gn_un_accord_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[siGW]") && ! morph(dDA, prevword(s, m.index, 2), ":B", false);
    },
    s_gn_un_accord_3: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_gn_un_des_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f", ":(?:e|m|G|W|V0|3s)");
    },
    c_gn_un_des_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasMasForm(m[2]);
    },
    s_gn_un_des_accord_2: function (s, m) {
        return suggMasPlur(m[2], true);
    },
    c_gn_du_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f", ":[GWme]");
    },
    c_gn_du_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasMasForm(m[2]);
    },
    s_gn_du_accord_2: function (s, m) {
        return suggMasSing(m[2], true);
    },
    c_gn_du_accord_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[siGW]");
    },
    s_gn_du_accord_3: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_gn_cet_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f", ":[GWme]");
    },
    c_gn_cet_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasMasForm(m[2]);
    },
    s_gn_cet_accord_2: function (s, m) {
        return suggMasSing(m[2], true);
    },
    c_gn_cet_accord_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ">[bcçdfgjklmnpqrstvwxz].+:[NAQ].*:m", ":[efGW]");
    },
    c_gn_cet_accord_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[siGW]");
    },
    s_gn_cet_accord_4: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_gn_ce_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f", ":(?:3s|[GWme])");
    },
    c_gn_ce_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasMasForm(m[2]);
    },
    s_gn_ce_accord_2: function (s, m) {
        return suggMasSing(m[2], true);
    },
    c_gn_ce_accord_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f", ":[GWme]") && morph(dDA, [m.start[2], m[2]], ":3s", false);
    },
    c_gn_ce_accord_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[siGW]");
    },
    s_gn_ce_accord_4: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_gn_mon_ton_son_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":D", false);
    },
    c_gn_mon_ton_son_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ">[bcdfgjklmnpqrstvwxz].*:[NAQ].*:f", ":[GWme]");
    },
    s_gn_mon_ton_son_accord_2: function (s, m) {
        return m[1].replace(/on/g, "a");
    },
    c_gn_mon_ton_son_accord_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasMasForm(m[2]);
    },
    s_gn_mon_ton_son_accord_3: function (s, m) {
        return suggMasSing(m[2], true);
    },
    c_gn_mon_ton_son_accord_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[siGW]");
    },
    s_gn_mon_ton_son_accord_4: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_gn_au_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f:s", ":[GWme]");
    },
    c_gn_au_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasMasForm(m[2]);
    },
    s_gn_au_accord_2: function (s, m) {
        return suggMasSing(m[2], true);
    },
    c_gn_au_accord_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[siGW]");
    },
    s_gn_au_accord_3: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_gn_au_accord_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_gn_la_accord1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:m", ":(?:e|f|P|G|W|[1-3][sp]|Y)");
    },
    c_gn_la_accord1_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_la_accord1_2: function (s, m) {
        return suggFemSing(m[2], true);
    },
    c_gn_la_accord1_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:p");
    },
    s_gn_la_accord1_3: function (s, m) {
        return suggFemSing(m[2]);
    },
    c_gn_la_accord2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":D", false);
    },
    c_gn_la_accord2_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:m", ":(?:e|f|P|G|W|[1-3][sp]|Y)") || ( morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:m", ":[fe]") && morphex(dDA, [m.start[1], m[1]], ":[RC]", ">(?:e[tn]|ou) ") && ! (morph(dDA, [m.start[1], m[1]], ":(?:Rv|C)", false) && morph(dDA, [m.start[3], m[3]], ":Y", false)) );
    },
    c_gn_la_accord2_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[3]);
    },
    s_gn_la_accord2_3: function (s, m) {
        return suggFemSing(m[3], true);
    },
    c_gn_la_accord2_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morph(dDA, [m.start[3], m[3]], ":[NAQ].*:p") || ( morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[si]") && morphex(dDA, [m.start[1], m[1]], ":[RC]", ">(?:e[tn]|ou)") && ! (morph(dDA, [m.start[1], m[1]], ":Rv", false) && morph(dDA, [m.start[3], m[3]], ":Y", false)) );
    },
    s_gn_la_accord2_4: function (s, m) {
        return suggFemSing(m[3]);
    },
    c_gn_la_accord3_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:m", ":[efPGWY]");
    },
    c_gn_la_accord3_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_la_accord3_2: function (s, m) {
        return suggFemSing(m[2], true);
    },
    c_gn_la_accord3_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[siGW]");
    },
    s_gn_la_accord3_3: function (s, m) {
        return suggFemSing(m[2]);
    },
    c_gn_ladite_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:m", ":[efGW]");
    },
    c_gn_ladite_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_ladite_accord_2: function (s, m) {
        return suggFemSing(m[2], true);
    },
    c_gn_ladite_accord_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[siGW]");
    },
    s_gn_ladite_accord_3: function (s, m) {
        return suggFemSing(m[2]);
    },
    c_gn_une_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:m", ":(?:e|f|G|W|V0|3s|P)") && ! ( m[2] == "demi" && morph(dDA, nextword1(s, m.end[0]), ":N.*:f") );
    },
    c_gn_une_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_une_accord_2: function (s, m) {
        return suggFemSing(m[2], true);
    },
    c_gn_une_accord_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[siGW]") && ! morph(dDA, prevword(s, m.index, 2), ":B", false);
    },
    s_gn_une_accord_3: function (s, m) {
        return suggFemSing(m[2]);
    },
    c_gn_une_des_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:m", ":(?:e|f|G|W|V0|3s)");
    },
    c_gn_une_des_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_une_des_accord_2: function (s, m) {
        return suggFemPlur(m[2], true);
    },
    c_gn_cette_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:m", ":[efGW]");
    },
    s_gn_cette_accord_1: function (s, m) {
        return suggCeOrCet(m[2]);
    },
    c_gn_cette_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_cette_accord_2: function (s, m) {
        return suggFemSing(m[2], true);
    },
    c_gn_cette_accord_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[siGW]");
    },
    s_gn_cette_accord_3: function (s, m) {
        return suggFemSing(m[2]);
    },
    c_gn_ma_ta_sa_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:m", ":[efGW]");
    },
    s_gn_ma_ta_sa_accord_1: function (s, m) {
        return m[1].replace(/a/g, "on");
    },
    c_gn_ma_ta_sa_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && ! (m[2].search(/^[aâeéèêiîoôuûyœæ]/i) >= 0) && hasFemForm(m[2]);
    },
    s_gn_ma_ta_sa_accord_2: function (s, m) {
        return suggFemSing(m[2], true);
    },
    c_gn_ma_ta_sa_accord_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[siGW]");
    },
    s_gn_ma_ta_sa_accord_3: function (s, m) {
        return suggFemSing(m[2]);
    },
    c_gn_certains_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f", ":[emGWP]");
    },
    c_gn_certains_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasMasForm(m[2]);
    },
    s_gn_certains_accord_2: function (s, m) {
        return suggMasPlur(m[2], true);
    },
    c_gn_certains_accord_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:s", ":(?:[ipGWP]|V0)") && ! (look(s.slice(m.end[0]), /^ +(?:et|ou) /) && morph(dDA, nextword(s, m.end[0], 2), ":[NAQ]", true, false))) || aREGULARPLURAL.has(m[1]);
    },
    s_gn_certains_accord_3: function (s, m) {
        return suggPlur(m[2]);
    },
    c_gn_certains_des_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f", ":[emGW]");
    },
    c_gn_certains_des_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasMasForm(m[2]);
    },
    s_gn_certains_des_accord_2: function (s, m) {
        return suggMasPlur(m[2], true);
    },
    c_gn_certaines_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:m", ":[efGWP]");
    },
    c_gn_certaines_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_certaines_accord_2: function (s, m) {
        return suggFemPlur(m[2], true);
    },
    c_gn_certaines_accord_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:s", ":[ipGWP]") && ! (look(s.slice(m.end[0]), /^ +(?:et|ou) /) && morph(dDA, nextword(s, m.end[0], 2), ":[NAQ]", true, false))) || aREGULARPLURAL.has(m[2]);
    },
    s_gn_certaines_accord_3: function (s, m) {
        return suggPlur(m[2]);
    },
    c_gn_certaines_des_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:m", ":[efGW]");
    },
    c_gn_certaines_des_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_certaines_des_accord_2: function (s, m) {
        return suggFemPlur(m[2], true);
    },
    c_gn_leur_accord1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[NAQ].*:p");
    },
    c_gn_leur_accord1_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    s_gn_leur_accord1_2: function (s, m) {
        return suggSing(m[2]);
    },
    c_gn_leur_accord2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[3], m[3]], ":[NAQ].*:p") || ( morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[si]") && morphex(dDA, [m.start[1], m[1]], ":[RC]|>de ", ">(?:e[tn]|ou)") && ! (morph(dDA, [m.start[1], m[1]], ":Rv", false) && morph(dDA, [m.start[3], m[3]], ":Y", false)) );
    },
    c_gn_leur_accord2_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    s_gn_leur_accord2_2: function (s, m) {
        return suggSing(m[3]);
    },
    c_gn_leur_accord3_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[siGW]");
    },
    c_gn_leur_accord3_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    s_gn_leur_accord3_2: function (s, m) {
        return suggSing(m[2]);
    },
    c_gn_notre_votre_chaque_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:p", ":[siGW]");
    },
    s_gn_notre_votre_chaque_accord_1: function (s, m) {
        return suggSing(m[1]);
    },
    c_gn_quelque_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[siG]");
    },
    c_gn_les_accord1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ( morph(dDA, [m.start[2], m[2]], ":[NAQ].*:s") && ! (look(s.slice(m.end[0]), /^ +(?:et|ou) /) && morph(dDA, nextword(s, m.end[0], 2), ":[NAQ]", true, false)) ) || aREGULARPLURAL.has(m[2]);
    },
    s_gn_les_accord1_1: function (s, m) {
        return suggPlur(m[2]);
    },
    c_gn_les_accord2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":D", false);
    },
    c_gn_les_accord2_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ( morph(dDA, [m.start[3], m[3]], ":[NAQ].*:s") || (morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:s", ":[pi]|>avoir") && morphex(dDA, [m.start[1], m[1]], ":[RC]", ">(?:e[tn]|ou) ") && ! (morph(dDA, [m.start[1], m[1]], ":Rv", false) && morph(dDA, [m.start[3], m[3]], ":Y", false))) ) && ! (look(s.slice(m.end[0]), /^ +(?:et|ou) /) && morph(dDA, nextword(s, m.end[0], 2), ":[NAQ]", true, false));
    },
    s_gn_les_accord2_2: function (s, m) {
        return suggPlur(m[3]);
    },
    c_gn_les_accord3_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:s", ":[ipYPGW]") && ! (look(s.slice(m.end[0]), /^ +(?:et|ou) /) && morph(dDA, nextword(s, m.end[0], 2), ":[NAQ]", true, false))) || aREGULARPLURAL.has(m[2]);
    },
    s_gn_les_accord3_1: function (s, m) {
        return suggPlur(m[2]);
    },
    c_gn_leurs_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:s", ":(?:[ipGW]|[123][sp])") && ! (look(s.slice(m.end[0]), /^ +(?:et|ou) /) && morph(dDA, nextword(s, m.end[0], 2), ":[NAQ]", true, false))) || aREGULARPLURAL.has(m[2]);
    },
    s_gn_leurs_accord_1: function (s, m) {
        return suggPlur(m[2]);
    },
    c_gn_leurs_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_gn_det_pluriel_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:s", ":[ipGW]") && ! (look(s.slice(m.end[0]), /^ +(?:et|ou) /) && morph(dDA, nextword(s, m.end[0], 2), ":[NAQ]", true, false))) || aREGULARPLURAL.has(m[1]);
    },
    s_gn_det_pluriel_accord_1: function (s, m) {
        return suggPlur(m[1]);
    },
    c_gn_ces_aux_pluriel_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:s", ":[ipGW]") && ! (look(s.slice(m.end[0]), /^ +(?:et|ou) /) && morph(dDA, nextword(s, m.end[0], 2), ":[NAQ]", true, false))) || aREGULARPLURAL.has(m[2]);
    },
    s_gn_ces_aux_pluriel_accord_1: function (s, m) {
        return suggPlur(m[2]);
    },
    c_gn_ces_aux_pluriel_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && morphex(dDA, [m.start[2], m[2]], ">[bcdfglklmnpqrstvwxz].*:m", ":f");
    },
    c_gn_ces_aux_pluriel_accord_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1].endsWith("x") || m[1].endsWith("X");
    },
    c_gn_ces_aux_pluriel_accord_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    c_gn_plusieurs_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:s", ":[ipGWP]") && ! (look(s.slice(m.end[0]), /^ +(?:et|ou) /) && morph(dDA, nextword(s, m.end[0], 2), ":[NAQ]", true, false))) || aREGULARPLURAL.has(m[1]);
    },
    s_gn_plusieurs_accord_1: function (s, m) {
        return suggPlur(m[1]);
    },
    c_gn_nombre_de_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:s", ":[ip]|>o(?:nde|xydation|or)\\b") && morphex(dDA, prevword1(s, m.index), ":(?:G|[123][sp])", ":[AD]", true)) || aREGULARPLURAL.has(m[1]);
    },
    s_gn_nombre_de_accord_1: function (s, m) {
        return suggPlur(m[1]);
    },
    c_gn_det_plur_groupe_de_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:s", ":[ip]") || aREGULARPLURAL.has(m[1]);
    },
    s_gn_det_plur_groupe_de_accord_1: function (s, m) {
        return suggPlur(m[1]);
    },
    c_gn_det_sing_groupe_de_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:s", ":[ip]") || aREGULARPLURAL.has(m[1]);
    },
    s_gn_det_sing_groupe_de_accord_1: function (s, m) {
        return suggPlur(m[1]);
    },
    c_gn_quelque_adverbe2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":B.*:p", false) && m[2] != "cents";
    },
    c_gn_nombre_lettres_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (morph(dDA, [m.start[2], m[2]], ":[NAQ].*:s") && ! (m[2].search(/^(janvier|février|mars|avril|mai|juin|juillet|ao[ûu]t|septembre|octobre|novembre|décembre|rue|route|ruelle|place|boulevard|avenue|allée|chemin|sentier|square|impasse|cour|quai|chaussée|côte|vendémiaire|brumaire|frimaire|nivôse|pluviôse|ventôse|germinal|floréal|prairial|messidor|thermidor|fructidor)$/i) >= 0)) || aREGULARPLURAL.has(m[2]);
    },
    s_gn_nombre_lettres_accord_1: function (s, m) {
        return suggPlur(m[2]);
    },
    c_gn_neuf_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (morph(dDA, [m.start[2], m[2]], ":[NAQ].*:s") && ! morph(dDA, prevword1(s, m.index), ":N", false) && ! (m[2].search(/^(janvier|février|mars|avril|mai|juin|juillet|ao[ûu]t|septembre|octobre|novembre|décembre|rue|route|ruelle|place|boulevard|avenue|allée|chemin|sentier|square|impasse|cour|quai|chaussée|côte|vendémiaire|brumaire|frimaire|nivôse|pluviôse|ventôse|germinal|floréal|prairial|messidor|thermidor|fructidor)$/i) >= 0)) || aREGULARPLURAL.has(m[2]);
    },
    s_gn_neuf_accord_1: function (s, m) {
        return suggPlur(m[2]);
    },
    c_gn_mille_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (morph(dDA, [m.start[1], m[1]], ":[NAQ].*:s") || aREGULARPLURAL.has(m[1])) && ! look(s.slice(0,m.index), /\b(?:le|un|ce|du) +$/i);
    },
    s_gn_mille_accord_1: function (s, m) {
        return suggPlur(m[1]);
    },
    c_gn_01_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[NAQ].*:p") && ! (m[1].search(/^(janvier|février|mars|avril|mai|juin|juillet|ao[ûu]t|septembre|octobre|novembre|décembre|rue|route|ruelle|place|boulevard|avenue|allée|chemin|sentier|square|impasse|cour|quai|chaussée|côte|vendémiaire|brumaire|frimaire|nivôse|pluviôse|ventôse|germinal|floréal|prairial|messidor|thermidor|fructidor|Rois|Corinthiens|Thessaloniciens)$/i) >= 0);
    },
    s_gn_01_accord_1: function (s, m) {
        return suggSing(m[1]);
    },
    c_gn_nombre_chiffres_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[1].search(/^0*[01]$/) >= 0) && ((morph(dDA, [m.start[2], m[2]], ":[NAQ].*:s") && ! (m[2].search(/^(janvier|février|mars|avril|mai|juin|juillet|ao[ûu]t|septembre|octobre|novembre|décembre|rue|route|ruelle|place|boulevard|avenue|allée|chemin|sentier|square|impasse|cour|quai|chaussée|côte|vendémiaire|brumaire|frimaire|nivôse|pluviôse|ventôse|germinal|floréal|prairial|messidor|thermidor|fructidor)$/i) >= 0)) || aREGULARPLURAL.has(m[1]));
    },
    s_gn_nombre_chiffres_accord_1: function (s, m) {
        return suggPlur(m[2]);
    },
    c_gn_quel_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f:p", ":(?:V0e|[NAQ].*:[me]:[si])");
    },
    c_gn_quel_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_quel_accord_2: function (s, m) {
        return suggMasSing(m[2], true);
    },
    c_gn_quel_accord_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:m:p", ":(?:V0e|[NAQ].*:[me]:[si])");
    },
    c_gn_quel_accord_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    s_gn_quel_accord_4: function (s, m) {
        return suggSing(m[2]);
    },
    c_gn_quel_accord_5: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f:[si]", ":(?:V0e|[NAQ].*:[me]:[si])");
    },
    c_gn_quel_accord_6: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_quel_accord_6: function (s, m) {
        return suggMasSing(m[2], true);
    },
    c_gn_quels_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f:s", ":(?:V0e|[NAQ].*:[me]:[pi])");
    },
    c_gn_quels_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_quels_accord_2: function (s, m) {
        return suggMasPlur(m[2], true);
    },
    c_gn_quels_accord_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:m:s", ":(?:V0e|[NAQ].*:[me]:[pi])");
    },
    c_gn_quels_accord_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    s_gn_quels_accord_4: function (s, m) {
        return suggPlur(m[2]);
    },
    c_gn_quels_accord_5: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f:[pi]", ":(?:V0e|[NAQ].*:[me]:[pi])");
    },
    c_gn_quels_accord_6: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_quels_accord_6: function (s, m) {
        return suggMasPlur(m[2], true);
    },
    c_gn_quelle_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:m:p", ":(?:V0e|[NAQ].*:[fe]:[si])");
    },
    c_gn_quelle_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_quelle_accord_2: function (s, m) {
        return suggFemSing(m[2], true);
    },
    c_gn_quelle_accord_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f:p", ":(?:V0e|[NAQ].*:[fe]:[si])");
    },
    c_gn_quelle_accord_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    s_gn_quelle_accord_4: function (s, m) {
        return suggSing(m[2]);
    },
    c_gn_quelle_accord_5: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:m:[si]", ":(?:V0e|[NAQ].*:[fe]:[si])");
    },
    c_gn_quelle_accord_6: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_quelle_accord_6: function (s, m) {
        return suggFemSing(m[2], true);
    },
    c_gn_quelles_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:m:s", ":(?:V0e|[NAQ].*:[fe]:[pi])");
    },
    c_gn_quelles_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_quelles_accord_2: function (s, m) {
        return suggFemPlur(m[2], true);
    },
    c_gn_quelles_accord_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f:s", ":(?:V0e|[NAQ].*:[fe]:[pi])");
    },
    c_gn_quelles_accord_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    s_gn_quelles_accord_4: function (s, m) {
        return suggPlur(m[2]);
    },
    c_gn_quelles_accord_5: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:m:[pi]", ":(?:V0e|[NAQ].*:[fe]:[pi])");
    },
    c_gn_quelles_accord_6: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_quelles_accord_6: function (s, m) {
        return suggFemPlur(m[2], true);
    },
    c_gn_quel_quel_accord_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\btel(?:le|)s? +$/);
    },
    c_gn_quels_quelles_accord_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\btel(?:le|)s? +$/);
    },
    s_gn_quels_quelles_accord_être_1: function (s, m) {
        return m[1].slice(0,-1);
    },
    c_gn_quel_accord_être_sujet_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\btel(?:le|)s? +$/) && morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:f", ":[me]");
    },
    c_gn_quelle_accord_être_sujet_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\btel(?:le|)s? +$/) && morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:m", ":[fe]");
    },
    c_gn_quels_accord_être_sujet_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\btel(?:le|)s? +$/) && morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:f", ":[me]");
    },
    c_gn_quelles_accord_être_sujet_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\btel(?:le|)s? +$/) && morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:m", ":[fe]");
    },
    c_gn_quel_que_être_mas_sing_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":V0e", false);
    },
    c_gn_quel_que_être_mas_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":V0e", false) && morphex(dDA, [m.start[4], m[4]], ":[NAQ].*:m", ":[fe]");
    },
    s_gn_quel_que_être_mas_1: function (s, m) {
        return m[1].replace(/lle/g, "l");
    },
    c_gn_quelle_que_être_fem_sing_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":V0e", false);
    },
    c_gn_quelle_que_être_fem_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":V0e", false) && morphex(dDA, [m.start[4], m[4]], ":[NAQ].*:f", ":[me]");
    },
    s_gn_quelle_que_être_fem_1: function (s, m) {
        return m[1].replace(/l/g, "lle");
    },
    c_gn_trouver_ça_adj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">trouver ", false) && morphex(dDA, [m.start[3], m[3]], ":A.*:(?:f|m:p)", ":(?:G|3[sp]|M[12P])");
    },
    s_gn_trouver_ça_adj_1: function (s, m) {
        return suggMasSing(m[3]);
    },
    c_gn_2m_accord_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ((morph(dDA, [m.start[1], m[1]], ":[NAQ].*:m") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f")) || (morph(dDA, [m.start[1], m[1]], ":[NAQ].*:f") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:m"))) && ! apposition(m[1], m[2]);
    },
    s_gn_2m_accord_1: function (s, m) {
        return switchGender(m[2]);
    },
    c_gn_2m_accord_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[1]);
    },
    s_gn_2m_accord_2: function (s, m) {
        return switchGender(m[1]);
    },
    c_gn_2m_accord_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ((morph(dDA, [m.start[1], m[1]], ":[NAQ].*:s") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:p")) || (morph(dDA, [m.start[1], m[1]], ":[NAQ].*:p") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:s"))) && ! apposition(m[1], m[2]);
    },
    s_gn_2m_accord_3: function (s, m) {
        return switchPlural(m[2]);
    },
    c_gn_2m_accord_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    s_gn_2m_accord_4: function (s, m) {
        return switchPlural(m[1]);
    },
    c_gn_2m_pfx_en_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ( (morph(dDA, [m.start[1], m[1]], ":[NAQ].*:m") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f")) || (morph(dDA, [m.start[1], m[1]], ":[NAQ].*:f") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:m")) ) && ! apposition(m[1], m[2]) && morph(dDA, prevword1(s, m.index), ":[VRX]", true, true);
    },
    s_gn_2m_pfx_en_1: function (s, m) {
        return switchGender(m[2]);
    },
    c_gn_2m_pfx_en_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[1]);
    },
    s_gn_2m_pfx_en_2: function (s, m) {
        return switchGender(m[1]);
    },
    c_gn_2m_pfx_en_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ( (morph(dDA, [m.start[1], m[1]], ":[NAQ].*:p") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:s")) || (morph(dDA, [m.start[1], m[1]], ":[NAQ].*:s") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:p")) ) && ! apposition(m[1], m[2]) && morph(dDA, prevword1(s, m.index), ":[VRX]", true, true);
    },
    s_gn_2m_pfx_en_3: function (s, m) {
        return switchPlural(m[2]);
    },
    c_gn_2m_pfx_en_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    s_gn_2m_pfx_en_4: function (s, m) {
        return switchPlural(m[1]);
    },
    c_gn_2m_pfx_à_par_pour_sans_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ( (morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:m", ":[GYfe]") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f")) || (morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:f", ":[GYme]") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:m")) ) && ! apposition(m[1], m[2]) && morph(dDA, prevword1(s, m.index), ":[VRX]", true, true);
    },
    s_gn_2m_pfx_à_par_pour_sans_1: function (s, m) {
        return switchGender(m[2]);
    },
    c_gn_2m_pfx_à_par_pour_sans_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[1]);
    },
    s_gn_2m_pfx_à_par_pour_sans_2: function (s, m) {
        return switchGender(m[1]);
    },
    c_gn_2m_pfx_à_par_pour_sans_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ( (morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:p", ":[GYsi]") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:s")) || (morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:s", ":[GYpi]") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:p")) ) && ! apposition(m[1], m[2]) && morph(dDA, prevword1(s, m.index), ":[VRX]", true, true);
    },
    s_gn_2m_pfx_à_par_pour_sans_3: function (s, m) {
        return switchPlural(m[2]);
    },
    c_gn_2m_pfx_à_par_pour_sans_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    s_gn_2m_pfx_à_par_pour_sans_4: function (s, m) {
        return switchPlural(m[1]);
    },
    c_gn_2m_pfx_de_sur_avec_après_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ( (morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:m", ":(?:[Gfe]|V0e|Y)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f")) || (morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:f", ":(?:[Gme]|V0e|Y)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:m")) ) && ! apposition(m[1], m[2]) && morph(dDA, prevword1(s, m.index), ":[VRX]", true, true);
    },
    s_gn_2m_pfx_de_sur_avec_après_1: function (s, m) {
        return switchGender(m[2]);
    },
    c_gn_2m_pfx_de_sur_avec_après_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[1]);
    },
    s_gn_2m_pfx_de_sur_avec_après_2: function (s, m) {
        return switchGender(m[1]);
    },
    c_gn_2m_pfx_de_sur_avec_après_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ( (morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:p", ":(?:[Gsi]|V0e|Y)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:s")) || (morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:s", ":(?:[Gpi]|V0e|Y)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:p")) ) && ! apposition(m[1], m[2]) && morph(dDA, prevword1(s, m.index), ":[VRX]", true, true);
    },
    s_gn_2m_pfx_de_sur_avec_après_3: function (s, m) {
        return switchPlural(m[2]);
    },
    c_gn_2m_pfx_de_sur_avec_après_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    s_gn_2m_pfx_de_sur_avec_après_4: function (s, m) {
        return switchPlural(m[1]);
    },
    c_gn_de_manière_façon_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":A.*:(m|f:p)", ":[GM]");
    },
    s_gn_de_manière_façon_1: function (s, m) {
        return suggFemSing(m[2]);
    },
    c_gn_2m_l_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[1].search(/^air$/i) >= 0) && ! m[2].startsWith("seul") && ( (morph(dDA, [m.start[1], m[1]], ":m") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f")) || (morph(dDA, [m.start[1], m[1]], ":f") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:m")) ) && ! apposition(m[1], m[2]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_l_1: function (s, m) {
        return switchGender(m[2], false);
    },
    c_gn_2m_l_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[1]);
    },
    s_gn_2m_l_2: function (s, m) {
        return switchGender(m[1]);
    },
    c_gn_2m_l_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[1].search(/^air$/i) >= 0) && ! m[2].startsWith("seul") && morph(dDA, [m.start[1], m[1]], ":[si]") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:p") && ! apposition(m[1], m[2]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_l_3: function (s, m) {
        return suggSing(m[2]);
    },
    c_gn_2m_l_après_et_ou_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && ( (morph(dDA, [m.start[1], m[1]], ":m") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f")) || (morph(dDA, [m.start[1], m[1]], ":f") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:m")) ) && ! apposition(m[1], m[2]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]", false, false);
    },
    s_gn_2m_l_après_et_ou_de_1: function (s, m) {
        return switchGender(m[2], false);
    },
    c_gn_2m_l_après_et_ou_de_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[1]);
    },
    s_gn_2m_l_après_et_ou_de_2: function (s, m) {
        return switchGender(m[1]);
    },
    c_gn_2m_l_après_et_ou_de_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[1].search(/^air$/i) >= 0) && ! m[2].startsWith("seul") && morph(dDA, [m.start[1], m[1]], ":[si]") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:p") && ! apposition(m[1], m[2]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]", false, false);
    },
    s_gn_2m_l_après_et_ou_de_3: function (s, m) {
        return suggSing(m[2]);
    },
    c_gn_2m_un_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[me]", ":(?:B|G|V0)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f") && ! apposition(m[1], m[2]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_un_1: function (s, m) {
        return suggMasSing(m[2], true);
    },
    c_gn_2m_un_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[si]", ":G") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:p") && ! m[2].startsWith("seul") && ! apposition(m[1], m[2]) && ! look(s.slice(0,m.index), /\b(?:et|ou|d’) *$/);
    },
    s_gn_2m_un_2: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_gn_2m_un_après_et_ou_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[me]", ":(?:B|G|V0|f)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f") && ! apposition(m[1], m[2]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_un_après_et_ou_de_1: function (s, m) {
        return suggMasSing(m[2], true);
    },
    c_gn_2m_un_après_et_ou_de_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[si]", ":G") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:p") && ! m[2].startsWith("seul") && ! apposition(m[1], m[2]) && ! morph(dDA, prevword1(s, m.index), ":[NAQB]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_un_après_et_ou_de_2: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_gn_2m_une_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[fe]", ":(?:B|G|V0)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:m") && ! apposition(m[1], m[2]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_une_1: function (s, m) {
        return suggFemSing(m[2], true);
    },
    c_gn_2m_une_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1] != "fois" && morph(dDA, [m.start[1], m[1]], ":[NAQ].*:[si]", false) && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:p") && ! m[2].startsWith("seul") && ! apposition(m[1], m[2]) && ! look(s.slice(0,m.index), /\b(?:et|ou|d’) *$/);
    },
    s_gn_2m_une_2: function (s, m) {
        return suggFemSing(m[2]);
    },
    c_gn_2m_une_après_et_ou_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[fe]", ":(?:B|G|V0|m)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:m") && ! apposition(m[1], m[2]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_une_après_et_ou_de_1: function (s, m) {
        return suggFemSing(m[2], true);
    },
    c_gn_2m_une_après_et_ou_de_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1] != "fois" && morph(dDA, [m.start[1], m[1]], ":[NAQ].*:[si]", false) && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:p") && ! m[2].startsWith("seul") && ! apposition(m[1], m[2]) && ! morph(dDA, prevword1(s, m.index), ":[NAQB]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_une_après_et_ou_de_2: function (s, m) {
        return suggFemSing(m[2]);
    },
    c_gn_2m_le_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":D", false);
    },
    c_gn_2m_le_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[3].startsWith("seul") && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:[me]", ":(?:B|G|V0)") && morph(dDA, [m.start[3], m[3]], ":[NAQ].*:f") && ! apposition(m[2], m[3]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_le_2: function (s, m) {
        return suggMasSing(m[3], true);
    },
    c_gn_2m_le_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[3].startsWith("seul") && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:[si]", ":G") && morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[GWsi]") && ! apposition(m[2], m[3]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_le_3: function (s, m) {
        return suggMasSing(m[3]);
    },
    c_gn_2m_le_après_et_ou_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":D", false);
    },
    c_gn_2m_le_après_et_ou_de_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[3].startsWith("seul") && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:[me]", ":(?:B|G|V0|f)") && morph(dDA, [m.start[3], m[3]], ":[NAQ].*:f") && ! apposition(m[2], m[3]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_le_après_et_ou_de_2: function (s, m) {
        return suggMasSing(m[3], true);
    },
    c_gn_2m_le_après_et_ou_de_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[3].startsWith("seul") && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:[si]", ":G") && morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[GWsi]") && ! apposition(m[2], m[3]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_le_après_et_ou_de_3: function (s, m) {
        return suggMasSing(m[3]);
    },
    c_gn_2m_det_mas_sing_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[me]", ":(?:B|G|V0)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f") && ! apposition(m[1], m[2]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_det_mas_sing_1: function (s, m) {
        return suggMasSing(m[2], true);
    },
    c_gn_2m_det_mas_sing_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[si]", ":G") && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[GWsi]") && ! apposition(m[1], m[2]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_det_mas_sing_2: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_gn_2m_det_mas_sing_après_et_ou_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[me]", ":(?:B|G|V0|f)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f") && ! apposition(m[1], m[2]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_det_mas_sing_après_et_ou_de_1: function (s, m) {
        return suggMasSing(m[2], true);
    },
    c_gn_2m_det_mas_sing_après_et_ou_de_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[si]", ":G") && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[GWsi]") && ! apposition(m[1], m[2]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_det_mas_sing_après_et_ou_de_2: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_gn_2m_mon_ton_son_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:m", ":(?:B|G|e|V0|f)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f") && ! apposition(m[1], m[2]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_mon_ton_son_1: function (s, m) {
        return suggMasSing(m[2], true);
    },
    c_gn_2m_mon_ton_son_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[si]", ":G") && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[GWsi]") && ! apposition(m[1], m[2]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_mon_ton_son_2: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_gn_2m_mon_ton_son_après_et_ou_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:m", ":(?:B|G|e|V0|f)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f") && ! apposition(m[1], m[2]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_mon_ton_son_après_et_ou_de_1: function (s, m) {
        return suggMasSing(m[2], true);
    },
    c_gn_2m_mon_ton_son_après_et_ou_de_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[si]", ":G") && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[GWsi]") && ! apposition(m[1], m[2]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_mon_ton_son_après_et_ou_de_2: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_gn_2m_la_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":D", false);
    },
    c_gn_2m_la_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] != "fois" && ! m[3].startsWith("seul") && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:[fe]", ":(?:B|G|V0)") && morph(dDA, [m.start[3], m[3]], ":[NAQ].*:m") && ! apposition(m[2], m[3]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_la_2: function (s, m) {
        return suggFemSing(m[3], true);
    },
    c_gn_2m_la_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[3].startsWith("seul") && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:[si]", ":G") && morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[GWsi]") && ! apposition(m[2], m[3]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_la_3: function (s, m) {
        return suggFemSing(m[3]);
    },
    c_gn_2m_la_après_et_ou_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":D", false);
    },
    c_gn_2m_la_après_et_ou_de_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] != "fois" && ! m[3].startsWith("seul") && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:[fe]", ":(?:B|G|V0|m)") && morph(dDA, [m.start[3], m[3]], ":[NAQ].*:m") && ! apposition(m[2], m[3]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_la_après_et_ou_de_2: function (s, m) {
        return suggFemSing(m[3], true);
    },
    c_gn_2m_la_après_et_ou_de_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[3].startsWith("seul") && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:[si]", ":G") && morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[GWsi]") && ! apposition(m[2], m[3]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_la_après_et_ou_de_3: function (s, m) {
        return suggFemSing(m[3]);
    },
    c_gn_2m_det_fem_sing_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1] != "fois" && ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[fe]", ":(?:B|G|V0)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:m") && ! apposition(m[1], m[2]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_det_fem_sing_1: function (s, m) {
        return suggFemSing(m[2], true);
    },
    c_gn_2m_det_fem_sing_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[si]", ":G") && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[GWsi]") && ! apposition(m[1], m[2]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_det_fem_sing_2: function (s, m) {
        return suggFemSing(m[2]);
    },
    c_gn_2m_det_fem_sing_après_et_ou_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1] != "fois" && ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[fe]", ":(?:B|G|V0|m)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:m") && ! apposition(m[1], m[2]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_det_fem_sing_après_et_ou_de_1: function (s, m) {
        return suggFemSing(m[2], true);
    },
    c_gn_2m_det_fem_sing_après_et_ou_de_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[si]", ":G") && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[GWsi]") && ! apposition(m[1], m[2]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_det_fem_sing_après_et_ou_de_2: function (s, m) {
        return suggFemSing(m[2]);
    },
    c_gn_2m_leur_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":D", false);
    },
    c_gn_2m_leur_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] != "fois" && ! m[3].startsWith("seul") && ((morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:m", ":(?:B|e|G|V0|f)") && morph(dDA, [m.start[3], m[3]], ":[NAQ].*:f")) || (morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f", ":(?:B|e|G|V0|m)") && morph(dDA, [m.start[3], m[3]], ":[NAQ].*:m"))) && ! apposition(m[2], m[3]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_leur_2: function (s, m) {
        return switchGender(m[3], false);
    },
    c_gn_2m_leur_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_2m_leur_3: function (s, m) {
        return switchGender(m[1], false);
    },
    c_gn_2m_leur_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[3].startsWith("seul") && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:[si]", ":G") && morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[GWsi]") && ! apposition(m[2], m[3]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_leur_4: function (s, m) {
        return suggSing(m[3]);
    },
    c_gn_2m_leur_après_et_ou_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":D", false);
    },
    c_gn_2m_leur_après_et_ou_de_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] != "fois" && ! m[3].startsWith("seul") && ((morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:m", ":(?:B|e|G|V0|f)") && morph(dDA, [m.start[3], m[3]], ":[NAQ].*:f")) || (morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f", ":(?:B|e|G|V0|m)") && morph(dDA, [m.start[3], m[3]], ":[NAQ].*:m"))) && ! apposition(m[2], m[3]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_leur_après_et_ou_de_2: function (s, m) {
        return switchGender(m[3], false);
    },
    c_gn_2m_leur_après_et_ou_de_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_2m_leur_après_et_ou_de_3: function (s, m) {
        return switchGender(m[1], false);
    },
    c_gn_2m_leur_après_et_ou_de_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[3].startsWith("seul") && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:[si]", ":G") && morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[GWsi]") && ! apposition(m[2], m[3]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_leur_après_et_ou_de_4: function (s, m) {
        return suggSing(m[3]);
    },
    c_gn_2m_det_epi_sing_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1] != "fois" && ! m[2].startsWith("seul") && ! (m[0].search(/^quelque chose/i) >= 0) && ((morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:m", ":(?:B|e|G|V0|f)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f")) || (morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:f", ":(?:B|e|G|V0|m)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:m"))) && ! apposition(m[1], m[2]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_det_epi_sing_1: function (s, m) {
        return switchGender(m[2], false);
    },
    c_gn_2m_det_epi_sing_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[1]);
    },
    s_gn_2m_det_epi_sing_2: function (s, m) {
        return switchGender(m[1], false);
    },
    c_gn_2m_det_epi_sing_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[si]", ":G") && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[GWsi]") && ! apposition(m[1], m[2]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_det_epi_sing_3: function (s, m) {
        return suggSing(m[2]);
    },
    c_gn_2m_det_epi_sing_après_et_ou_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1] != "fois" && ! m[2].startsWith("seul") && ! (m[0].search(/quelque chose/i) >= 0) && ((morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:m", ":(?:B|e|G|V0|f)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f")) || (morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:f", ":(?:B|e|G|V0|m)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:m"))) && ! apposition(m[1], m[2]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_det_epi_sing_après_et_ou_de_1: function (s, m) {
        return switchGender(m[2], false);
    },
    c_gn_2m_det_epi_sing_après_et_ou_de_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[1]);
    },
    s_gn_2m_det_epi_sing_après_et_ou_de_2: function (s, m) {
        return switchGender(m[1], false);
    },
    c_gn_2m_det_epi_sing_après_et_ou_de_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[si]", ":G") && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[GWsi]") && ! apposition(m[1], m[2]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_det_epi_sing_après_et_ou_de_3: function (s, m) {
        return suggSing(m[2]);
    },
    c_gn_2m_det_mas_plur_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[me]", ":(?:B|G|V0)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f") && ! apposition(m[1], m[2]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_det_mas_plur_1: function (s, m) {
        return suggMasPlur(m[2], true);
    },
    c_gn_2m_det_mas_plur_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[pi]", ":G") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:s") && ! apposition(m[1], m[2]) && ! (look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ +et +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A") || look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ *, +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A.*:[si]")) && ! look(s.slice(0,m.index), /\bune de /i);
    },
    s_gn_2m_det_mas_plur_2: function (s, m) {
        return suggMasPlur(m[2]);
    },
    c_gn_2m_det_mas_plur_après_et_ou_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[me]", ":(?:B|G|V0|f)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f") && ! apposition(m[1], m[2]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_det_mas_plur_après_et_ou_de_1: function (s, m) {
        return suggMasPlur(m[2], true);
    },
    c_gn_2m_det_mas_plur_après_et_ou_de_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[pi]", ":G") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:s") && ! apposition(m[1], m[2]) && ! (look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ +et +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A") || look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ *, +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A.*:[si]")) && ! ( look(s.slice(0,m.index), /\bune? de /i) || (m[0].startsWith("de") && look(s.slice(0,m.index), /\bune? +$/i)) );
    },
    s_gn_2m_det_mas_plur_après_et_ou_de_2: function (s, m) {
        return suggMasPlur(m[2]);
    },
    c_gn_2m_det_fem_plur_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1] != "fois" && ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[fe]", ":(?:B|G|V0)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:m") && ! apposition(m[1], m[2]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_det_fem_plur_1: function (s, m) {
        return suggFemPlur(m[2], true);
    },
    c_gn_2m_det_fem_plur_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morph(dDA, [m.start[1], m[1]], ":[NAQ].*:[pi]", false) && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:s") && ! apposition(m[1], m[2]) && ! (look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ +et +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A") || look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ *, +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A.*:[si]")) && ! look(s.slice(0,m.index), /\bune de /i);
    },
    s_gn_2m_det_fem_plur_2: function (s, m) {
        return suggFemPlur(m[2]);
    },
    c_gn_2m_det_fem_plur_après_et_ou_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1] != "fois" && ! m[2].startsWith("seul") && morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:[fe]", ":(?:B|G|V0|m)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:m") && ! apposition(m[1], m[2]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_det_fem_plur_après_et_ou_de_1: function (s, m) {
        return suggFemPlur(m[2], true);
    },
    c_gn_2m_det_fem_plur_après_et_ou_de_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].startsWith("seul") && morph(dDA, [m.start[1], m[1]], ":[NAQ].*:[pi]", false) && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:s") && ! apposition(m[1], m[2]) && ! (look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ +et +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A") || look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ *, +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A.*:[si]")) && ! ( look(s.slice(0,m.index), /\bune? de /i) || (m[0].startsWith("de") && look(s.slice(0,m.index), /\bune? +$/i)) );
    },
    s_gn_2m_det_fem_plur_après_et_ou_de_2: function (s, m) {
        return suggFemPlur(m[2]);
    },
    c_gn_2m_les_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":D", false);
    },
    c_gn_2m_les_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] != "fois" && ! m[3].startsWith("seul") && ((morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:m", ":(?:B|e|G|V0|f)") && morph(dDA, [m.start[3], m[3]], ":[NAQ].*:f")) || (morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f", ":(?:B|e|G|V0|m)") && morph(dDA, [m.start[3], m[3]], ":[NAQ].*:m"))) && ! apposition(m[2], m[3]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_les_2: function (s, m) {
        return switchGender(m[3], true);
    },
    c_gn_2m_les_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_2m_les_3: function (s, m) {
        return switchGender(m[2], true);
    },
    c_gn_2m_les_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] != "fois" && ! m[3].startsWith("seul") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:[pi]", false) && morph(dDA, [m.start[3], m[3]], ":[NAQ].*:s") && ! apposition(m[2], m[3]) && ! (look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ +et +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A") || look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ *, +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A.*:[si]")) && ! look(s.slice(0,m.index), /\bune? de /i);
    },
    s_gn_2m_les_4: function (s, m) {
        return suggPlur(m[3]);
    },
    c_gn_2m_les_après_et_ou_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":D", false);
    },
    c_gn_2m_les_après_et_ou_de_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] != "fois" && ! m[3].startsWith("seul") && ((morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:m", ":(?:B|e|G|V0|f)") && morph(dDA, [m.start[3], m[3]], ":[NAQ].*:f")) || (morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:f", ":(?:B|e|G|V0|m)") && morph(dDA, [m.start[3], m[3]], ":[NAQ].*:m"))) && ! apposition(m[2], m[3]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_les_après_et_ou_de_2: function (s, m) {
        return switchGender(m[3], true);
    },
    c_gn_2m_les_après_et_ou_de_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[2]);
    },
    s_gn_2m_les_après_et_ou_de_3: function (s, m) {
        return switchGender(m[2], true);
    },
    c_gn_2m_les_après_et_ou_de_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] != "fois" && ! m[3].startsWith("seul") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:[pi]", false) && morph(dDA, [m.start[3], m[3]], ":[NAQ].*:s") && ! apposition(m[2], m[3]) && ! (look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ +et +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A") || look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ *, +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A.*:[si]")) && ! ( look(s.slice(0,m.index), /\bune? de /i) || (m[0].startsWith("de") && look(s.slice(0,m.index), /\bune? +$/i)) );
    },
    s_gn_2m_les_après_et_ou_de_4: function (s, m) {
        return suggPlur(m[3]);
    },
    c_gn_2m_det_epi_plur_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1] != "fois" && ! m[2].startsWith("seul") && ((morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:m", ":(?:B|e|G|V0|f)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f")) || (morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:f", ":(?:B|e|G|V0|m)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:m"))) && ! apposition(m[1], m[2]) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_gn_2m_det_epi_plur_1: function (s, m) {
        return switchGender(m[2], true);
    },
    c_gn_2m_det_epi_plur_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[1]);
    },
    s_gn_2m_det_epi_plur_2: function (s, m) {
        return switchGender(m[1], true);
    },
    c_gn_2m_det_epi_plur_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1] != "fois" && ! m[2].startsWith("seul") && morph(dDA, [m.start[1], m[1]], ":[NAQ].*:[pi]", false) && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:s") && ! apposition(m[1], m[2]) && ! (look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ +et +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A") || look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ *, +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A.*:[si]")) && ! look(s.slice(0,m.index), /\bune? de /i);
    },
    s_gn_2m_det_epi_plur_3: function (s, m) {
        return suggPlur(m[2]);
    },
    c_gn_2m_det_epi_plur_après_et_ou_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1] != "fois" && ! m[2].startsWith("seul") && ((morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:m", ":(?:B|e|G|V0|f)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f")) || (morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:f", ":(?:B|e|G|V0|m)") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:m"))) && ! apposition(m[1], m[2]) && ! morph(dDA, prevword1(s, m.index), ":[NAQ]|>(?:et|ou) ", false, false);
    },
    s_gn_2m_det_epi_plur_après_et_ou_de_1: function (s, m) {
        return switchGender(m[2], true);
    },
    c_gn_2m_det_epi_plur_après_et_ou_de_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[1]);
    },
    s_gn_2m_det_epi_plur_après_et_ou_de_2: function (s, m) {
        return switchGender(m[1], true);
    },
    c_gn_2m_det_epi_plur_après_et_ou_de_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1] != "fois" && ! m[2].startsWith("seul") && morph(dDA, [m.start[1], m[1]], ":[NAQ].*:[pi]", false) && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:s") && ! apposition(m[1], m[2]) && ! (look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ +et +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A") || look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ *, +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A.*:[si]")) && ! ( look(s.slice(0,m.index), /\bune? de /i) || (m[0].startsWith("de") && look(s.slice(0,m.index), /\bune? +$/i)) );
    },
    s_gn_2m_det_epi_plur_après_et_ou_de_3: function (s, m) {
        return suggPlur(m[2]);
    },
    c_gn_2m_des_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1] != "fois" && ! m[2].startsWith("seul") && ( (morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:m", ":[fe]") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f")) || (morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:f", ":[me]") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:m")) ) && ! apposition(m[1], m[2]) && ! (look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ +et +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A") || look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ *, +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A.*:[si]")) && morph(dDA, prevword1(s, m.index), ":[VRBX]|>comme ", true, true);
    },
    s_gn_2m_des_1: function (s, m) {
        return switchGender(m[2], true);
    },
    c_gn_2m_des_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && hasFemForm(m[1]);
    },
    s_gn_2m_des_2: function (s, m) {
        return switchGender(m[1]);
    },
    c_gn_2m_des_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[NAQ].*:[pi]", false) && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:s") && ! apposition(m[1], m[2]) && ! (look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ +et +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A") || look_chk1(dDA, s.slice(m.end[0]), m.end[0], /^ *, +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":A.*:[si]")) && (morphex(dDA, [m.start[2], m[2]], ":N", ":[AQ]") || morph(dDA, prevword1(s, m.index), ":[VRBX]|>comme ", true, true));
    },
    s_gn_2m_des_3: function (s, m) {
        return suggPlur(m[2]);
    },
    c_gn_2m_des_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return checkAgreement(m[1], m[2]);
    },
    d_gn_2m_des_4: function (s, m, dDA) {
        return exclude(dDA, m.start[2], m[2], ":V");
    },
    c_gn_3m_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (morph(dDA, [m.start[1], m[1]], ":[NAQ].*:p") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:[pi]") && morph(dDA, [m.start[3], m[3]], ":[NAQ].*:s")) || (morph(dDA, [m.start[1], m[1]], ":[NAQ].*:s") && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:[si]") && morph(dDA, [m.start[3], m[3]], ":[NAQ].*:p"));
    },
    s_gn_3m_1: function (s, m) {
        return switchPlural(m[3]);
    },
    c_gn_3m_les_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":D", false) && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:[pi]") && morph(dDA, [m.start[3], m[3]], ":[NAQ].*:[pi]") && morph(dDA, [m.start[4], m[4]], ":[NAQ].*:s");
    },
    s_gn_3m_les_1: function (s, m) {
        return suggPlur(m[4]);
    },
    c_gn_3m_le_la_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":D", false) && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:[si]", false) && morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:[si]", ":G") && morph(dDA, [m.start[4], m[4]], ":[NAQ].*:p");
    },
    s_gn_3m_le_la_1: function (s, m) {
        return suggSing(m[4]);
    },
    c_gn_3m_det_sing_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[NAQ].*:[si]", false) && morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:[si]", ":G") && morph(dDA, [m.start[4], m[4]], ":[NAQ].*:p");
    },
    s_gn_3m_det_sing_1: function (s, m) {
        return suggSing(m[4]);
    },
    c_gn_3m_det_plur_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[NAQ].*:[pi]", false) && morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:[pi]", ":G") && morph(dDA, [m.start[4], m[4]], ":[NAQ].*:s") && ! look(s.slice(0,m.index), /\bune? de /i);
    },
    s_gn_3m_det_plur_1: function (s, m) {
        return suggPlur(m[4]);
    },
    c_gn_devinette1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:(?:m|f:p)", ":(?:G|P|[fe]:[is]|V0|3[sp])") && ! apposition(m[1], m[2]);
    },
    s_gn_devinette1_1: function (s, m) {
        return suggFemSing(m[2], true);
    },
    c_gn_devinette2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:(?:f|m:p)", ":(?:G|P|[me]:[is]|V0|3[sp])") && ! apposition(m[1], m[2]);
    },
    s_gn_devinette2_1: function (s, m) {
        return suggMasSing(m[2], true);
    },
    c_gn_devinette3_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":[NAQ].*:f|>[aéeiou].*:e", false) && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:(?:f|m:p)", ":(?:G|P|m:[is]|V0|3[sp])") && ! apposition(m[1], m[2]);
    },
    s_gn_devinette3_1: function (s, m) {
        return suggMasSing(m[2], true);
    },
    c_gn_devinette4_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:m", ":G|>[aéeiou].*:[ef]") && morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:(?:f|m:p)", ":(?:G|P|[me]:[is]|V0|3[sp])") && ! apposition(m[2], m[3]);
    },
    s_gn_devinette4_1: function (s, m) {
        return suggMasSing(m[3], true);
    },
    c_gn_devinette5_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:m", ":G|>[aéeiou].*:[ef]") && ! morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f|>[aéeiou].*:e", false) && morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:(?:f|m:p)", ":(?:G|P|[me]:[is]|V0|3[sp])") && ! apposition(m[2], m[3]);
    },
    s_gn_devinette5_1: function (s, m) {
        return suggMasSing(m[3], true);
    },
    c_gn_devinette6_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:s", ":(?:G|P|[me]:[ip]|V0|3[sp])") && ! apposition(m[1], m[2]);
    },
    s_gn_devinette6_1: function (s, m) {
        return suggPlur(m[2]);
    },
    c_sgpl_prep_attendu_que_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_sgpl_prep_étant_donné_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_sgpl_prep_vu_det_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_sgpl_vingt_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\bquatre $/i);
    },
    c_sgpl_quatre_vingt_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, nextword1(s, m.end[0]), ":B", false) && ! look(s.slice(0,m.index), /\b(?:numéro|page|chapitre|référence|année|test|série)s? +$/i);
    },
    s_sgpl_xxx_neuf_1: function (s, m) {
        return m[0].slice(0,-1);
    },
    c_sgpl_xxx_cents_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, nextword1(s, m.end[0]), ":B|>une?", false, true) && ! look(s.slice(0,m.index), /\b(?:numéro|page|chapitre|référence|année|test|série)s? +$/i);
    },
    c_sgpl_xxx_cent_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, nextword1(s, m.end[0]), ":B|>une?", false, false);
    },
    c_sgpl_cents_nom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:[pi]", ":G") && morphex(dDA, prevword1(s, m.index), ":[VR]", ":B", true);
    },
    c_sgpl_mille_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, nextword1(s, m.end[0]), ":B|:N.*:p", ":[QA]", false) || (morph(dDA, prevword1(s, m.index), ":B") && morph(dDA, nextword1(s, m.end[0]), ":[NAQ]", false));
    },
    c_sgpl_collectif_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, prevword1(s, m.index), ":D.*:[si]", false, true);
    },
    s_sgpl_confluence_de_1: function (s, m) {
        return suggPlur(m[1]);
    },
    s_sgpl_troupeau_de_1: function (s, m) {
        return suggPlur(m[1]);
    },
    s_sgpl_x_fois_par_période_1: function (s, m) {
        return suggSing(m[1]);
    },
    c_sgpl_à_nu_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:mettre|mise) ", false);
    },
    c_sgpl_faire_affaire_avec_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">faire ", false);
    },
    c_sgpl_faire_affaire_à_en_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">faire ", false) && morph(dDA, [m.start[3], m[3]], ":(?:N|MP)");
    },
    s_sgpl_à_l_intérieur_extérieur_1: function (s, m) {
        return m[1].gl_trimRight("e");
    },
    c_sgpl_collet_monté_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":(?:V0e|W)|>très", false);
    },
    c_sgpl_coûter_cher_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:co[ûu]ter|payer) ", false);
    },
    c_sgpl_donner_lieu_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">donner ", false);
    },
    c_sgpl_ensemble_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V.*:[123]p|>(?:tou(?:te|)s|pas|rien|guère|jamais|toujours|souvent) ", ":[DRB]");
    },
    c_sgpl_avoir_pied_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:avoir|perdre) ", false);
    },
    c_sgpl_à_pied_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:lit|fauteuil|armoire|commode|guéridon|tabouret|chaise)s?\b/i);
    },
    c_sgpl_plein_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, prevword1(s, m.index), ":(?:V|[NAQ].*:s)", ":(?:[NA]:.:[pi]|V0e.*:[123]p)", true);
    },
    c_conf_ce_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (look(s.slice(m.end[0]), /^ [ldmtsc]es /) && ! look(s.slice(0,m.index), /\b(?:ils?|elles?|ne) +/i)) || ( morph(dDA, prevword1(s, m.index), ":Cs", false, true) && ! look(s.slice(0,m.index), /, +$/) && ! look(s.slice(m.end[0]), /^ +(?:ils?|elles?)\b/i) && ! morph(dDA, nextword1(s, m.end[0]), ":Q", false, false) );
    },
    c_sgpl_bonnes_vacances_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D.*:f:s", false, false);
    },
    c_sgpl_en_vacances_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:aller|partir) ", false);
    },
    c_sgpl_vite_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":V0e.*:3p", false, false) || morph(dDA, nextword1(s, m.end[0]), ":Q", false, false);
    },
    c_conf_suite_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":D|>[ld] ", false) && look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_conf_pronom_à_l_air_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[AR]", ">libre ") && morph(dDA, prevword1(s, m.index), ":Cs", false, true);
    },
    c_conf_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:il |elle |n’) *$/i);
    },
    s_conf_acre_1: function (s, m) {
        return m[1].replace(/â/g, "a").replace(/Â/g, "A");
    },
    c_conf_âcre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, prevword1(s, m.index), ">(?:être|go[ûu]t|humeur|odeur|parole|parfum|remarque|reproche|réponse|saveur|senteur|sensation|vin)", false, false);
    },
    s_conf_âcre_1: function (s, m) {
        return m[0].replace(/a/g, "â").replace(/A/g, "Â");
    },
    c_conf_être_accro_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:être|devenir|para[îi]tre|rendre|sembler) ", false);
    },
    s_conf_être_accro_1: function (s, m) {
        return m[2].replace(/oc/g, "o");
    },
    s_conf_accro_à_1: function (s, m) {
        return m[1].replace(/oc/g, "o");
    },
    c_conf_tenir_pour_acquit_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">tenir ");
    },
    c_conf_à_l_amende_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">mettre ", false);
    },
    c_conf_faire_amende_honorable_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">faire ", false);
    },
    c_conf_hospice1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:être|aller) ", false);
    },
    s_conf_hospice2_1: function (s, m) {
        return m[1].replace(/auspice/g, "hospice");
    },
    s_conf_hospice3_1: function (s, m) {
        return m[1].replace(/auspice/g, "hospice").replace(/Auspice/g, "Hospice");
    },
    s_conf_arrière_ban_1: function (s, m) {
        return m[0].replace(/c/g, "").replace(/C/g, "");
    },
    c_conf_mettre_au_ban_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">mettre ", false) && ! look(s.slice(m.end[0]), /^ +des accusés/);
    },
    c_conf_publier_les_bans_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">publi(?:er|cation) ", false);
    },
    c_conf_bel_et_bien_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, nextword1(s, m.end[0]), ":[AQ]");
    },
    s_conf_bitte_1: function (s, m) {
        return m[0].replace(/ite/g, "itte");
    },
    c_conf_en_bonne_et_due_forme_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1] != "bonne et due forme";
    },
    c_conf_c_est_était_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[3], m[3]], ":[AM]", ":[QGW]");
    },
    s_conf_canne_à_de_1: function (s, m) {
        return m[1].replace(/cane/g, "canne");
    },
    c_conf_verbe_canne_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:appuyer|battre|frapper|lever|marcher) ", false);
    },
    s_conf_verbe_canne_1: function (s, m) {
        return m[2].replace(/cane/g, "canne");
    },
    c_conf_ville_de_Cannes1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[1].search(/^C(?:annes|ANNES)/) >= 0);
    },
    c_conf_ville_de_Cannes2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[1].search(/^C(?:annes|ANNES)/) >= 0);
    },
    c_conf_faire_bonne_chère_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">faire ", false);
    },
    s_conf_champ_de_1: function (s, m) {
        return m[1].replace(/nt/g, "mp");
    },
    c_conf_être_censé_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0e", false) && morph(dDA, [m.start[3], m[3]], ":(?:Y|Oo)", false);
    },
    s_conf_être_censé_1: function (s, m) {
        return m[2].replace(/sens/g, "cens");
    },
    s_conf_sensé_1: function (s, m) {
        return m[1].replace(/c/g, "s").replace(/C/g, "S");
    },
    c_conf_content_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0a", false);
    },
    c_conf_argent_comptant_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, prevword1(s, m.index), ":[VR]", false);
    },
    c_conf_à_cor_et_à_cri_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[0].search(/^à cor et à cri$/i) >= 0);
    },
    s_conf_côté_1: function (s, m) {
        return m[1].replace(/o/g, "ô");
    },
    s_conf_côte_1: function (s, m) {
        return m[1].replace(/o/g, "ô").replace(/tt/g, "t");
    },
    s_conf_cote_1: function (s, m) {
        return m[1].replace(/ô/g, "o").replace(/tt/g, "t");
    },
    s_conf_cotte_1: function (s, m) {
        return m[1].replace(/ô/g, "o").replace(/t/g, "tt");
    },
    c_conf_avoir_la_cote_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0a", false);
    },
    c_conf_tordre_le_cou_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">tordre ", false);
    },
    c_conf_rendre_coup_pour_coup_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">rendre ", false);
    },
    c_conf_couper_court_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">couper ");
    },
    c_conf_laisser_libre_cours_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:avoir|donner|laisser) ", false);
    },
    c_conf_dès_que_lors1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:[lmtsc]es|des?|[nv]os|leurs|quels) +$/i);
    },
    c_conf_erreur_problème_decelé_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">(?:desceller|desseller) ", false);
    },
    s_conf_erreur_problème_decelé_1: function (s, m) {
        return m[2].replace(/escell/g, "écel").replace(/essell/g, "écel");
    },
    c_conf_deceler_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:desceller|desseller) ", false);
    },
    s_conf_deceler_qqch_1: function (s, m) {
        return m[1].replace(/escell/g, "écel").replace(/essell/g, "écel");
    },
    c_conf_en_train_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, prevword1(s, m.index), ">(?:être|voyager|surprendre|venir|arriver|partir|aller) ", false, false) || look(s.slice(0,m.index), /-(?:ils?|elles?|on|je|tu|nous|vous) +$/);
    },
    c_conf_entrain_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, prevword1(s, m.index), ">(?:avec|sans|quel(?:le|)|cet|votre|notre|mon|leur) ", false, false) || look(s.slice(0,m.index), / [dlDL]’$/);
    },
    c_conf_à_l_envi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ">(?:abandonner|céder|résister) ", false) && ! look(s.slice(m.end[0]), /^ d(?:e |’)/);
    },
    c_conf_est_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[QA]", ":M") && m[2].gl_isLowerCase();
    },
    c_conf_est_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look_chk1(dDA, s.slice(0,m.index), 0, /^ *(?:l[ea]|ce(?:tte|t|)|mon|[nv]otre) +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+\w) +$/i, ":[NA].*:[is]", ":G");
    },
    c_conf_est_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look_chk1(dDA, s.slice(0,m.index), 0, /^ *(?:ton) +([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+\w) +$/i, ":N.*:[is]", ":[GA]");
    },
    c_conf_est_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look_chk1(dDA, s.slice(0,m.index), 0, /^ *([A-ZÉÈ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+\w) +$/i, ":M", ":G");
    },
    c_conf_où_est_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":D", ":R|>(?:quand|pourquoi)") || (m[2] == "l" && look(s.slice(m.end[0]), /^’/));
    },
    c_conf_faites_vous_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D.*:[me]:[sp]", false);
    },
    c_conf_avoir_être_faite_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0", false);
    },
    s_conf_avoir_être_faite_1: function (s, m) {
        return m[2].replace(/î/g, "i");
    },
    c_conf_en_fait_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:[vn]ous|lui|leur|et toi) +$|[nm]’$/i);
    },
    s_conf_flamant_rose_1: function (s, m) {
        return m[1].replace(/and/g, "ant");
    },
    c_conf_bonne_mauvaise_foi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! ( m[1] == "bonne" && look(s.slice(0,m.index), /\bune +$/i) && look(s.slice(m.end[0]), /^ +pour toute/i) );
    },
    c_conf_faire_perdre_donner_foi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:faire|perdre|donner|avoir) ", false);
    },
    c_conf_glacière_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":D", false);
    },
    s_conf_goutte_1: function (s, m) {
        return m[1].replace(/û/g, "u").replace(/t/g, "tt");
    },
    s_conf_jeûne_1: function (s, m) {
        return m[1].replace(/u/g, "û");
    },
    s_conf_jeune_1: function (s, m) {
        return m[1].replace(/û/g, "u");
    },
    s_conf_celui_celle_là_1: function (s, m) {
        return m[0].slice(0,-1).replace(/ /g, "-")+"à";
    },
    c_conf_verbe_impératif_la_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":[NAQ]");
    },
    c_conf_mot_là_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ]", ":[123][sp]");
    },
    c_conf_il_elle_on_la_vconj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[123][sp]", ":[GQ]");
    },
    c_conf_ne_la_vconj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[123][sp]", ":[GQ]");
    },
    c_conf_me_se_se_la_vconj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[123][sp]", ":[GQ]");
    },
    c_conf_il_elle_on_l_a_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":Q", ":(?:[123][sp]|V[123]......e)|>lui ");
    },
    c_conf_ne_l_a_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":Q", ":(?:[123][sp]|V[123]......e)|>lui ");
    },
    c_conf_me_te_l_a_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":Q", ":(?:[123][sp]|V[123]......e)|>lui ");
    },
    s_conf_lever_de_rideau_soleil_1: function (s, m) {
        return m[0].replace(/ée/g, "er");
    },
    c_conf_lever_un_lièvre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">soulever ", false);
    },
    s_conf_lever_un_lièvre_1: function (s, m) {
        return m[1].slice(3);
    },
    c_conf_être_à_xxx_lieues_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:être|habiter|trouver|situer|rester|demeurer?) ", false);
    },
    c_conf_avoir_eu_lieu_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">avoir ", false);
    },
    c_conf_marre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /(?:la|une|cette|quelle|cette|[mts]a) +$/i);
    },
    c_conf_avoir_marre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0a", false);
    },
    c_conf_avoir_mis_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0a", false);
    },
    c_conf_les_nôtres_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[1] == "Notre" && look(s.slice(m.end[0]), /Père/));
    },
    s_conf_les_nôtres_1: function (s, m) {
        return m[1].replace(/otre/g, "ôtre");
    },
    c_conf_notre_votre_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(les?|la|du|des|aux?) +/i) && morphex(dDA, [m.start[2], m[2]], ":[NAQ]", ":D");
    },
    s_conf_notre_votre_qqch_1: function (s, m) {
        return m[1].replace(/ôtre/g, "otre").gl_trimRight("s");
    },
    c_conf_nulle_part_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":D", false, false);
    },
    c_conf_on1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_conf_on2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ( (m[2].search(/^[nmts]e$/) >= 0) || (! (m[2].search(/^(?:confiance|envie|peine|prise|crainte|affaire|hâte|force|recours|somme)$/i) >= 0) && morphex(dDA, [m.start[2], m[2]], ":[0123][sp]", ":[QG]")) ) && morph(dDA, prevword1(s, m.index), ":Cs", false, true);
    },
    c_conf_on3_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V.*:(?:[1-3][sp])", ":(?:G|1p)") && ! ( m[0].indexOf(" leur ") && morph(dDA, [m.start[2], m[2]], ":[NA].*:[si]", false) ) && look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_conf_on6_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":[VR]", false, false) && ! morph(dDA, nextword1(s, m.end[0]), ":(?:3s|Oo|X)", false);
    },
    c_conf_xxx_on2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":3s", false) && look(s.slice(0,m.index), /^ *$|, $/);
    },
    s_conf_pain_qqch_1: function (s, m) {
        return m[1].replace(/pin/g, "pain");
    },
    c_conf_manger_pain_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:manger|dévorer|avaler|engloutir) ");
    },
    s_conf_manger_pain_1: function (s, m) {
        return m[2].replace(/pin/g, "pain");
    },
    c_conf_aller_de_pair_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">aller ", false);
    },
    c_conf_être_pâle_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0e", false);
    },
    s_conf_être_pâle_1: function (s, m) {
        return m[2].replace(/pal/g, "pâl");
    },
    s_conf_qqch_pâle_1: function (s, m) {
        return m[1].replace(/pal/g, "pâl");
    },
    c_conf_prendre_parti_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">prendre ", false);
    },
    c_conf_tirer_parti_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">tirer ", false);
    },
    c_conf_faire_partie_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">faire ", false);
    },
    c_conf_prendre_à_partie_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">prendre ", false);
    },
    c_conf_pâtes_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (m[1].search(/^pattes?/i) >= 0);
    },
    s_conf_pâtes_1: function (s, m) {
        return m[1].replace(/att/g, "ât");
    },
    c_conf_pâtes_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2].startsWith("d’amende");
    },
    c_conf_pâtes_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2].startsWith("a ");
    },
    s_conf_pâtes_3: function (s, m) {
        return m[2].replace(/a /g, "à ");
    },
    c_conf_peu_de_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[NAQ]");
    },
    c_conf_peut_être_adverbe1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":(?:N|A|Q|G|MP)");
    },
    c_conf_diagnostic_pronostique_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ( m[0].endsWith("s") && look(s.slice(0,m.index), /\b(?:[mtscd]es|[nv]os|leurs|quels) $/i) ) || ( m[0].endsWith("e") && look(s.slice(0,m.index), /\b(?:mon|ce|quel|un|du|[nv]otre) $/i) );
    },
    s_conf_diagnostic_pronostique_1: function (s, m) {
        return m[0].replace(/que/g, "c");
    },
    c_conf_pu_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0a", false);
    },
    c_conf__1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, nextword1(s, m.end[0]), ":(?:Os|C)", false, true);
    },
    c_conf_quoi_qu_il_en_soit_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, nextword1(s, m.end[0]), ":[AQ]", false);
    },
    c_conf_quoi_qu_il_en_coûte_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(m.end[0]), /^ *$|^,/);
    },
    c_conf_raisonner_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">résonner ", false);
    },
    s_conf_raisonner_1: function (s, m) {
        return m[1].replace(/réso/g, "raiso");
    },
    c_conf_saint_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":M1", false) && morph(dDA, prevword1(s, m.index), ":(?:R|[123][sp])", false, true);
    },
    s_conf_salle_qqch_1: function (s, m) {
        return m[1].replace(/sale/g, "salle");
    },
    c_conf_être_sale_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0e", false);
    },
    s_conf_être_sale_1: function (s, m) {
        return m[2].replace(/salle/g, "sale");
    },
    s_conf_qqch_septique_1: function (s, m) {
        return m[1].replace(/scep/g,"sep");
    },
    c_conf_être_sceptique_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:être|demeurer) ", false);
    },
    s_conf_être_sceptique_1: function (s, m) {
        return m[2].replace(/sep/g, "scep");
    },
    c_conf_s_ensuivre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">suivre ", false);
    },
    c_conf_soi_disant_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[0].search(/^soi-disant$/i) >= 0);
    },
    c_conf_prep_soi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(m.end[0]), / soit /);
    },
    c_conf_en_soi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, nextword1(s, m.end[0]), ":[GY]", true, true) && ! look(s.slice(0,m.index), /quel(?:s|les?|) qu $|on $|il $/i) && ! look(s.slice(m.end[0]), / soit /);
    },
    c_conf_soi_même1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, prevword1(s, m.index), ":[YQ]|>(?:avec|contre|par|pour|sur) ", false, true);
    },
    c_conf_soit1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/) && morphex(dDA, [m.start[2], m[2]], ":[OC]", ":R");
    },
    c_conf_soit2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/);
    },
    s_conf_sûr_que_1: function (s, m) {
        return m[1].replace(/sur/g, "sûr");
    },
    s_conf_sûre_surs_de_1: function (s, m) {
        return m[1].replace(/sur/g, "sûr");
    },
    c_conf_sûr_de_vinfi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":Y", false);
    },
    s_conf_sûr_de_vinfi_1: function (s, m) {
        return m[1].replace(/sur/g, "sûr");
    },
    c_conf_tache_de_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":N", ":[GMY]|>(?:fonds?|grande (?:envergure|ampleur|importance)|envergure|ampleur|importance|départ|surveillance) ") && ! look(s.slice(0,m.index), /accompl|dél[éè]gu/);
    },
    s_conf_tache_de_qqch_1: function (s, m) {
        return m[1].replace(/â/g, "a");
    },
    s_conf_tache_adjectif_1: function (s, m) {
        return m[1].replace(/â/g, "a");
    },
    c_conf_aller_en_taule_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">aller ", false);
    },
    c_conf_faire_de_la_taule_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">faire ", false);
    },
    s_conf_tôle_qqch_1: function (s, m) {
        return m[1].replace(/au/g, "ô");
    },
    c_conf_il_être_tant_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0e", false) && morph(dDA, [m.start[3], m[3]], ":Y|>(?:ne|en|y) ", false);
    },
    c_conf_avoir_tort_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:avoir|donner) ", false);
    },
    s_conf_qqch_venimeux_1: function (s, m) {
        return m[1].replace(/énén/g, "enim");
    },
    s_conf_qqch_vénéneux_1: function (s, m) {
        return m[1].replace(/enim/g, "énén");
    },
    s_conf_ver_de_terre_1: function (s, m) {
        return m[1].replace(/re/g, "").replace(/t/g, "");
    },
    c_conf_vieil_euphonie_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[NAQ].*:[me]:s");
    },
    c_mc_mot_composé_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[1].gl_isDigit() && ! m[2].gl_isDigit() && ! morph(dDA, [m.start[0], m[0]], ":", false) && ! morph(dDA, [m.start[2], m[2]], ":G", false) && _oSpellChecker.isValid(m[1]+m[2]);
    },
    c_mc_mot_composé_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] != "là" && ! (m[1].search(/^(?:ex|mi|quasi|semi|non|demi|pro|anti|multi|pseudo|proto|extra)$/i) >= 0) && ! m[1].gl_isDigit() && ! m[2].gl_isDigit() && ! morph(dDA, [m.start[2], m[2]], ":G", false) && ! morph(dDA, [m.start[0], m[0]], ":", false) && ! _oSpellChecker.isValid(m[1]+m[2]);
    },
    c_maj_jours_semaine_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ,] +$/);
    },
    s_maj_jours_semaine_1: function (s, m) {
        return m[0].toLowerCase();
    },
    c_maj_mois_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ,] +$/) && !( ( m[0]=="Juillet" && look(s.slice(0,m.index), /monarchie +de +$/i) ) || ( m[0]=="Octobre" && look(s.slice(0,m.index), /révolution +d’$/i) ) );
    },
    s_maj_mois_1: function (s, m) {
        return m[0].toLowerCase();
    },
    c_maj_qqch_de_l_État_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[0].search(/^fonctions? /i) >= 0) || ! look(s.slice(0,m.index), /\ben $/i);
    },
    s_maj_État_nation_providence_1: function (s, m) {
        return m[1].replace(/é/g, "É");
    },
    c_maj_gentilés_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2].gl_isTitle() && morphex(dDA, [m.start[1], m[1]], ":N", ":(?:A|V0e|D|R|B)") && ! (m[0].search(/^([oO]céan Indien|[îÎiI]les Britanniques)/) >= 0);
    },
    s_maj_gentilés_1: function (s, m) {
        return m[2].toLowerCase();
    },
    c_maj_gentilés_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2].gl_isLowerCase() && ! m[2].startsWith("canadienne") && ( (m[1].search(/^(?:certaine?s?|cette|ce[ts]?|[dl]es|[nv]os|quelques|plusieurs|chaque|une|aux)$/i) >= 0) || ( (m[1].search(/^un$/i) >= 0) && ! look(s.slice(m.end[0]), /(?:approximatif|correct|courant|parfait|facile|aisé|impeccable|incompréhensible)/) && ! look(s.slice(0,m.index), /\bdans +/i)) );
    },
    s_maj_gentilés_2: function (s, m) {
        return m[2].gl_toCapitalize();
    },
    s_maj_gentilés2_1: function (s, m) {
        return m[1].gl_toCapitalize();
    },
    c_maj_langues_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:parler|cours|leçon|apprendre|étudier|traduire|enseigner|professeur|enseignant|dictionnaire|méthode) ", false);
    },
    s_maj_langues_1: function (s, m) {
        return m[2].toLowerCase();
    },
    s_maj_en_langue_1: function (s, m) {
        return m[1].toLowerCase();
    },
    c_maj_église_qqch_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ]/);
    },
    s_maj_qqch_du_Nord_Sud_1: function (s, m) {
        return m[1].gl_toCapitalize();
    },
    s_maj_qqch_de_l_Ouest_Est_1: function (s, m) {
        return m[1].gl_toCapitalize();
    },
    c_maj_unités_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (m[2].search(/^(?:Mètre|Watt|Gramme|Seconde|Ampère|Kelvin|Mole|Cand[eé]la|Hertz|Henry|Newton|Pascal|Joule|Coulomb|Volt|Ohm|Farad|Tesla|W[eé]ber|Radian|Stéradian|Lumen|Lux|Becquerel|Gray|Sievert|Siemens|Katal)s?|(?:Exa|P[ée]ta|Téra|Giga|Méga|Kilo|Hecto|Déc[ai]|Centi|Mi(?:lli|cro)|Nano|Pico|Femto|Atto|Ze(?:pto|tta)|Yo(?:cto|etta))(?:mètre|watt|gramme|seconde|ampère|kelvin|mole|cand[eé]la|hertz|henry|newton|pascal|joule|coulomb|volt|ohm|farad|tesla|w[eé]ber|radian|stéradian|lumen|lux|becquerel|gray|sievert|siemens|katal)s?/) >= 0);
    },
    s_maj_unités_1: function (s, m) {
        return m[2].toLowerCase();
    },
    c_infi_à_en_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":Y");
    },
    s_infi_à_en_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_infi_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V1") && ! m[1].slice(0,1).gl_isUpperCase() && (m[1].endsWith("z") || ! look(s.slice(0,m.index), /\b(?:quelqu(?:e chose|’une?)|(?:l(es?|a)|nous|vous|me|te|se)[ @]trait|personne|point +$|rien(?: +[a-zéèêâîûù]+|) +$)/i));
    },
    s_infi_de_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_infi_de_nous_vous_lui_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V1", ":M[12P]");
    },
    s_infi_de_nous_vous_lui_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_infi_de_le_les_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V1", false);
    },
    s_infi_de_le_les_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_infi_y_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":[123][sp]");
    },
    c_infi_pour_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V1", ":[NM]") && ! morph(dDA, prevword1(s, m.index), ">(?:tenir|passer) ", false);
    },
    s_infi_pour_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_infi_pour_nous_vous_lui_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V1", false);
    },
    s_infi_pour_nous_vous_lui_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_infi_sans_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V1", ":[NM]");
    },
    s_infi_sans_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_infi_nous_vous_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":Q", false) && ! morph(dDA, prevword1(s, m.index), "V0.*[12]p", false);
    },
    c_infi_devoir_savoir_pouvoir_interrogatif_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:devoir|savoir|pouvoir|vouloir) ", false) && morphex(dDA, [m.start[2], m[2]], ":(?:Q|A|[123][sp])", ":[GYW]");
    },
    s_infi_devoir_savoir_pouvoir_interrogatif_1: function (s, m) {
        return suggVerbInfi(m[2]);
    },
    c_infi_est_ce_que_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":(?:V1.*:Q|[13]s|2[sp])", ":[GYWM]") && ! look(s.slice(0,m.index), /\bque? +$/i);
    },
    s_infi_est_ce_que_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_infi_commencer_finir_par_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:commencer|finir) ", false) && morphex(dDA, [m.start[2], m[2]], ":V", ":[NGM]") && ! m[2].slice(0,1).gl_isUpperCase();
    },
    s_infi_commencer_finir_par_1: function (s, m) {
        return suggVerbInfi(m[2]);
    },
    c_infi_verbe_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:cesser|décider|défendre|suggérer|commander|essayer|tenter|choisir|permettre|interdire) ", false) && analysex(m[2], ":(?:Q|2p)", ":M");
    },
    s_infi_verbe_de_1: function (s, m) {
        return suggVerbInfi(m[2]);
    },
    c_infi_adjectifs_masculins_singuliers_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":N.*:m:[si]", ":G") && morphex(dDA, [m.start[2], m[2]], ":Y", ">aller |:(?:M|N.*:m:s)") && isNextVerb(dDA, s.slice(m.end[0]), m.end[0]);
    },
    s_infi_adjectifs_masculins_singuliers_1: function (s, m) {
        return suggVerbPpas(m[2], ":m:s");
    },
    c_infi_adjectifs_féminins_singuliers_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":N.*:f:[si]", ":G") && morphex(dDA, [m.start[2], m[2]], ":Y", ">aller |:M") && isNextVerb(dDA, s.slice(m.end[0]), m.end[0]);
    },
    s_infi_adjectifs_féminins_singuliers_1: function (s, m) {
        return suggVerbPpas(m[2], ":f:s");
    },
    c_infi_adjectifs_singuliers_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":N.*:[si]", ":G") && morphex(dDA, [m.start[2], m[2]], ":Y", ">aller |:M") && isNextVerb(dDA, s.slice(m.end[0]), m.end[0]);
    },
    s_infi_adjectifs_singuliers_1: function (s, m) {
        return suggVerbPpas(m[2], ":s");
    },
    c_infi_adjectifs_pluriels_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":N.*:[pi]", ":G") && morphex(dDA, [m.start[2], m[2]], ":Y", ">aller |:M") && isNextVerb(dDA, s.slice(m.end[0]), m.end[0]);
    },
    s_infi_adjectifs_pluriels_1: function (s, m) {
        return suggVerbPpas(m[2], ":p");
    },
    c_conj_participe_présent_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":A", false);
    },
    s_conj_participe_présent_1: function (s, m) {
        return m[1].slice(0,-1);
    },
    c_p_pas_point_rien_bien_ensemble1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V", false);
    },
    c_p_que_semble_le_penser_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">sembler ", false);
    },
    c_p_en_plein_xxx_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[NAQ]", false) && isEndOfNG(dDA, s.slice(m.end[0]), m.end[0]);
    },
    c_p_de_vinfi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V[123]_i", ">(?:devenir|rester|demeurer) ") && isNextNotCOD(dDA, s.slice(m.end[0]), m.end[0]);
    },
    c_p_de_manière_façon_xxx_et_xxx_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":A", false) && morphex(dDA, [m.start[2], m[2]], ":A", ":[GM]");
    },
    c_p_de_manière_façon_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":A", false);
    },
    c_p_de_nom_adj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[NAQ].*:s", false) && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:s", ":[GV]") && isEndOfNG(dDA, s.slice(m.end[0]), m.end[0]);
    },
    c_p_det_nom_adj_nom_adj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ]", ":V0") && morphex(dDA, [m.start[2], m[2]], ":[NAQ]", ":(?:G|[123][sp]|P)");
    },
    c_p_groupes_déjà_simplifiés_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[NAQ]", false) && isEndOfNG(dDA, s.slice(m.end[0]), m.end[0]);
    },
    c_p_y_compris_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:[jn]’|tu )$/i);
    },
    c_p_préposition_nom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ]", ":[GY]") && isEndOfNG(dDA, s.slice(m.end[0]), m.end[0]);
    },
    c_p_préposition_déterminant_nom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ]", ":G") && isEndOfNG(dDA, s.slice(m.end[0]), m.end[0]);
    },
    c_p_lors_de_du_nom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ]", ":G") && isEndOfNG(dDA, s.slice(m.end[0]), m.end[0]);
    },
    c_p_nul_doute_que_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_p_douter_que_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">douter ", false) && look(s.slice(0,m.index), /\b(?:[mts]e|[nv]ous) +$/i);
    },
    c_p_de_nom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":N", ":[GY]") && isEndOfNG(dDA, s.slice(m.end[0]), m.end[0]);
    },
    c_p_de_pronom_nom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[NAQ]", false) && isEndOfNG(dDA, s.slice(m.end[0]), m.end[0]);
    },
    c_p_de_la_leur_nom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ]", ":Y") && isEndOfNG(dDA, s.slice(m.end[0]), m.end[0]);
    },
    c_ocr_être_participes_passés_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0e", false);
    },
    c_ocr_être_participes_passés_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2].endsWith("e") && morphex(dDA, [m.start[2], m[2]], ":V1.*:Ip.*:[13]s", ":(?:[GM]|A)") && ! look(s.slice(0,m.index), /\belle +(?:ne +|n’|)$/i);
    },
    s_ocr_être_participes_passés_2: function (s, m) {
        return suggVerbPpas(m[2], ":m:s");
    },
    c_ocr_être_participes_passés_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && m[2].endsWith("s") && morphex(dDA, [m.start[2], m[2]], ":V1.*:Ip.*:2s", ":(?:[GM]|A)") && ! look(s.slice(0,m.index), /\belles +(?:ne +|n’|)$/i);
    },
    s_ocr_être_participes_passés_3: function (s, m) {
        return suggVerbPpas(m[2], ":m:p");
    },
    c_ocr_avoir_participes_passés_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0a", false);
    },
    c_ocr_avoir_participes_passés_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2].endsWith("e") && morphex(dDA, [m.start[2], m[2]], ":V1.*:Ip.*:[13]s", ":[GM]|>envie ");
    },
    s_ocr_avoir_participes_passés_2: function (s, m) {
        return suggVerbPpas(m[2], ":m:s");
    },
    c_ocr_avoir_participes_passés_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && m[2].endsWith("s") && morphex(dDA, [m.start[2], m[2]], ":V1.*:Ip.*:2s", ":[GM]");
    },
    s_ocr_avoir_participes_passés_3: function (s, m) {
        return suggVerbPpas(m[2], ":m:p");
    },
    c_conf_c_en_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (m[2].search(/^(?:fini|terminé)s?/i) >= 0) && morph(dDA, prevword1(s, m.index), ":C", false, true);
    },
    c_conf_c_en_être_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (m[2].search(/^(?:assez|trop)$/i) >= 0) && (look(s.slice(m.end[0]), /^ +d(?:e |’)/) || look(s.slice(m.end[0]), /^ *$|^,/));
    },
    c_conf_c_en_être_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":A", ":[GVW]") && morph(dDA, prevword1(s, m.index), ":C", false, true);
    },
    c_conf_aller_de_soi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">aller", false) && ! look(s.slice(m.end[0]), / soit /);
    },
    c_sgpl_verbe_fort_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":[AN].*:[me]:[pi]|>(?:être|sembler|devenir|re(?:ster|devenir)|para[îi]tre|appara[îi]tre) .*:(?:[123]p|P|Q)|>(?:affirmer|trouver|croire|désirer|estime|préférer|penser|imaginer|voir|vouloir|aimer|adorer|souhaiter) ") && ! morph(dDA, nextword1(s, m.end[0]), ":A.*:[me]:[pi]", false);
    },
    c_sgpl_bien_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, prevword1(s, m.index), ":V", ":D.*:p|:A.*:p", false);
    },
    c_infi_d_en_y_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":Y");
    },
    s_infi_d_en_y_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_infi_de_pronom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V", false);
    },
    s_infi_de_pronom_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_infi_de_pronom_le_les_la_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V", false);
    },
    s_infi_de_pronom_le_les_la_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_infi_faire_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">faire ", false) && ! look(s.slice(0,m.index), /\b(?:en|[mtsldc]es?|[nv]ous|un) +$/i) && morphex(dDA, [m.start[2], m[2]], ":V", ":M") && ! ((m[1].search(/^fait$/i) >= 0) && m[2].endsWith("é")) && ! ((m[1].search(/^faits$/i) >= 0) && m[2].endsWith("és"));
    },
    s_infi_faire_1: function (s, m) {
        return suggVerbInfi(m[2]);
    },
    c_infi_vouloir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">vouloir ", false) && ! look(s.slice(0,m.index), /\b(?:[mtsldc]es?|[nv]ous|un) +$/i) && morphex(dDA, [m.start[2], m[2]], ":V", ":M") && ! ((m[1].search(/^vouloir$/i) >= 0) && m[2].endsWith("é")) && ! ((m[1].search(/^vouloirs$/i) >= 0) && m[2].endsWith("és"));
    },
    s_infi_vouloir_1: function (s, m) {
        return suggVerbInfi(m[2]);
    },
    c_infi_me_te_se_faire_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">faire ", false) && morphex(dDA, [m.start[2], m[2]], ":V", ":M");
    },
    s_infi_me_te_se_faire_1: function (s, m) {
        return suggVerbInfi(m[2]);
    },
    c_infi_de_vouloir_faire_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":M");
    },
    s_infi_de_vouloir_faire_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_infi_savoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">savoir :V", false) && morph(dDA, [m.start[2], m[2]], ":V", false) && ! look(s.slice(0,m.index), /\b(?:[mts]e|[vn]ous|les?|la|un) +$/i);
    },
    s_infi_savoir_1: function (s, m) {
        return suggVerbInfi(m[2]);
    },
    c_infi_il_faut_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":(?:Q|2p)", false);
    },
    s_infi_il_faut_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_infi_il_faut_le_les_la_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":(?:Q|2p)", ":N");
    },
    s_infi_il_faut_le_les_la_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_infi_lui_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":Q", false);
    },
    s_infi_lui_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_conj_se_conf_être_avoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">avoir ", false);
    },
    c_conj_se_conf_être_avoir_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":3p", false);
    },
    c_conj_se_conf_être_avoir_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    c_conj_je_me_conf_être_avoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">avoir ", false);
    },
    c_conj_tu_te_conf_être_avoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">avoir ", false) && ! morph(dDA, prevword1(s, m.index), ":V0", false, false);
    },
    c_conj_nous_nous_conf_être_avoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">avoir ", false) && look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_conj_nous_nous_conf_être_avoir_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_conj_vous_vous_conf_être_avoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">avoir ", false) && look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_conj_vous_vous_conf_être_avoir_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_ppas_je_me_être_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":Q.*:p", ":(?:G|Q.*:[si])") && ( morph(dDA, [m.start[1], m[1]], ":V[123]_.__p_e_") || (look(s.slice(m.end[0]), /^ *$/) && ! look(s.slice(0,m.index), /\b[qQ]ue? +$/)) );
    },
    s_ppas_je_me_être_verbe_1: function (s, m) {
        return suggVerbPpas(m[1], ":m:s");
    },
    c_ppas_tu_te_être_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":Q.*:p", ":(?:G|Q.*:[si])") && ( morph(dDA, [m.start[1], m[1]], ":V[123]_.__p_e_") || (look(s.slice(m.end[0]), /^ *$/) && ! look(s.slice(0,m.index), /\b[qQ]ue? +$/)) );
    },
    s_ppas_tu_te_être_verbe_1: function (s, m) {
        return suggVerbPpas(m[1], ":m:s");
    },
    c_ppas_il_se_être_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":Q.*:(?:f|m:p)", ":(?:G|Q.*:m:[si])|>dire ") && ( morph(dDA, [m.start[1], m[1]], ":V[123]_.__p_e_") || (look(s.slice(m.end[0]), /^ *$/) && ! look(s.slice(0,m.index), /\b[qQ]ue? +$/)) );
    },
    s_ppas_il_se_être_verbe_1: function (s, m) {
        return suggVerbPpas(m[1], ":m:s");
    },
    c_ppas_elle_se_être_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":Q.*:(?:m|f:p)", ":(?:G|Q.*:f:[si])|>dire ") && ( morph(dDA, [m.start[1], m[1]], ":V[123]_.__p_e_") || (look(s.slice(m.end[0]), /^ *$/) && ! morph(dDA, prevword1(s, m.index), ":R|>que ", false, false)) );
    },
    s_ppas_elle_se_être_verbe_1: function (s, m) {
        return suggVerbPpas(m[1], ":f:s");
    },
    c_ppas_nous_nous_être_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":Q.*:s", ":(?:G|Q.*:[pi])|>dire ") && ( morph(dDA, [m.start[1], m[1]], ":V[123]_.__p_e_") || (look(s.slice(m.end[0]), /^ *$/) && ! morph(dDA, prevword1(s, m.index), ":R|>que ", false, false)) );
    },
    s_ppas_nous_nous_être_verbe_1: function (s, m) {
        return suggVerbPpas(m[1], ":p");
    },
    c_ppas_ils_se_être_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":Q.*:(?:f|m:s)", ":(?:G|Q.*:m:[pi])|>dire ") && ( morph(dDA, [m.start[1], m[1]], ":V[123]_.__p_e_") || (look(s.slice(m.end[0]), /^ *$/) && ! look(s.slice(0,m.index), /\b[qQ]ue? +$/)) );
    },
    s_ppas_ils_se_être_verbe_1: function (s, m) {
        return suggVerbPpas(m[1], ":m:p");
    },
    c_ppas_elles_se_être_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":Q.*:(?:m|f:s)", ":(?:G|Q.*:f:[pi])|>dire ") && ( morph(dDA, [m.start[1], m[1]], ":V[123]_.__p_e_") || (look(s.slice(m.end[0]), /^ *$/) && ! morph(dDA, prevword1(s, m.index), ":R|>que ", false, false)) );
    },
    s_ppas_elles_se_être_verbe_1: function (s, m) {
        return suggVerbPpas(m[1], ":f:p");
    },
    c_ppas_se_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">être ", false);
    },
    c_ppas_se_être_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":(?:Y|[123][sp])", ":Q") && ! (m[0].search(/^t’(?:es|étais)/i) >= 0);
    },
    s_ppas_se_être_2: function (s, m) {
        return suggVerbPpas(m[2]);
    },
    c_ppas_se_être_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morph(dDA, [m.start[1], m[1]], ":[123]s", false) && morph(dDA, [m.start[2], m[2]], ":Q.*:p", false) && ! look(s.slice(0,m.index), /\bque?[, ]|\bon (?:ne |)$/i) && ! (m[0].search(/^t’(?:es|étais)/i) >= 0);
    },
    s_ppas_se_être_3: function (s, m) {
        return suggSing(m[2]);
    },
    c_ppas_me_te_laisser_adj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">laisser ", false) &&  morphex(dDA, [m.start[3], m[3]], ":[AQ].*:p", ":(?:[YG]|[AQ].*:[is])");
    },
    s_ppas_me_te_laisser_adj_1: function (s, m) {
        return suggSing(m[3]);
    },
    c_ppas_nous_les_laisser_adj_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">laisser ", false) && morphex(dDA, [m.start[3], m[3]], ":[AQ].*:s", ":(?:[YG]|[AQ].*:[ip])") && (m[1].endsWith("es") || ( m[1].endsWith("us") && ! m[2].endsWith("ons") ));
    },
    s_ppas_nous_les_laisser_adj_1: function (s, m) {
        return suggPlur(m[3]);
    },
    c_ppas_je_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (morph(dDA, [m.start[1], m[1]], ">(?:être|sembler|devenir|re(?:ster|devenir)|para[îi]tre) ", false) || m[1].endsWith(" été")) && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[GWYsi]");
    },
    s_ppas_je_verbe_1: function (s, m) {
        return suggSing(m[2]);
    },
    c_ppas_tu_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (morph(dDA, [m.start[1], m[1]], ">(?:être|sembler|devenir|re(?:ster|devenir)|para[îi]tre) ", false) || m[1].endsWith(" été")) && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[GWYsi]");
    },
    s_ppas_tu_verbe_1: function (s, m) {
        return suggSing(m[2]);
    },
    c_ppas_il_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (morph(dDA, [m.start[2], m[2]], ">(?:être|sembler|devenir|re(?:ster|devenir)|para[îi]tre) ", false) || m[2].endsWith(" été")) && (morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[GWYsi]") || morphex(dDA, [m.start[3], m[3]], ":[AQ].*:f", ":[GWYme]"));
    },
    s_ppas_il_verbe_1: function (s, m) {
        return suggMasSing(m[3]);
    },
    c_ppas_c_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (morph(dDA, [m.start[1], m[1]], ">seule ", false) && look(s.slice(m.end[0]), /^ +que? /)) && ( morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:p", ":[GWYsi]") || ( morphex(dDA, [m.start[1], m[1]], ":[AQ].*:f", ":[GWYme]") && ! morph(dDA, nextword1(s, m.end[0]), ":N.*:f", false, false) ) );
    },
    s_ppas_c_être_1: function (s, m) {
        return suggMasSing(m[1]);
    },
    c_ppas_ç_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ].*:p", ":[GWYsi]") || ( morphex(dDA, [m.start[1], m[1]], ":[AQ].*:f", ":[GWYme]") && ! morph(dDA, nextword1(s, m.end[0]), ":N.*:f", false, false) );
    },
    s_ppas_ç_être_1: function (s, m) {
        return suggMasSing(m[1]);
    },
    c_ppas_ça_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (morph(dDA, [m.start[2], m[2]], ">(?:être|sembler|devenir|re(?:ster|devenir)|para[îi]tre) ", false) || m[2].endsWith(" été")) && ( morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[GWYsi]") || ( morphex(dDA, [m.start[3], m[3]], ":[AQ].*:f", ":[GWYme]") && ! morph(dDA, nextword1(s, m.end[0]), ":N.*:f", false, false) ) ) && ! morph(dDA, prevword1(s, m.index), ":(?:R|V...t)|>de ", false, false);
    },
    s_ppas_ça_verbe_1: function (s, m) {
        return suggMasSing(m[3]);
    },
    c_ppas_lequel_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (morph(dDA, [m.start[2], m[2]], ">(?:être|sembler|devenir|re(?:ster|devenir)|para[îi]tre) ", false) || m[2].endsWith(" été")) && ( morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[GWYsi]") || ( morphex(dDA, [m.start[3], m[3]], ":[AQ].*:f", ":[GWYme]") && ! morph(dDA, nextword1(s, m.end[0]), ":N.*:f", false, false) ) ) && ! morph(dDA, prevword1(s, m.index), ":R", false, false);
    },
    s_ppas_lequel_verbe_1: function (s, m) {
        return suggMasSing(m[3]);
    },
    c_ppas_elle_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (morph(dDA, [m.start[2], m[2]], ">(?:être|sembler|devenir|re(?:ster|devenir)|para[îi]tre) ", false) || m[2].endsWith(" été")) && (morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[GWYsi]") || morphex(dDA, [m.start[3], m[3]], ":[AQ].*:m", ":[GWYfe]")) && ! morph(dDA, prevword1(s, m.index), ":R|>de ", false, false);
    },
    s_ppas_elle_verbe_1: function (s, m) {
        return suggFemSing(m[3]);
    },
    c_ppas_elle_qui_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (morph(dDA, [m.start[2], m[2]], ">(?:être|sembler|devenir|re(?:ster|devenir)|para[îi]tre) ", false) || m[2].endsWith(" été")) && (morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[GWYsi]") || morphex(dDA, [m.start[3], m[3]], ":[AQ].*:m", ":[GWYfe]"));
    },
    s_ppas_elle_qui_verbe_1: function (s, m) {
        return suggFemSing(m[3]);
    },
    c_ppas_nous_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[2].search(/^légion$/i) >= 0) && ! look(s.slice(0,m.index), /\b(?:nous|ne) +$/i) && ((morph(dDA, [m.start[1], m[1]], ">(?:être|sembler|devenir|re(?:ster|devenir)|para[îi]tre) ", false) && morph(dDA, [m.start[1], m[1]], ":1p", false)) || m[1].endsWith(" été")) && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:s", ":[GWYpi]");
    },
    s_ppas_nous_verbe_1: function (s, m) {
        return suggPlur(m[2]);
    },
    c_ppas_ils_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[3].search(/^légion$/i) >= 0) && (morph(dDA, [m.start[2], m[2]], ">(?:être|sembler|devenir|re(?:ster|devenir)|para[îi]tre) ", false) || m[2].endsWith(" été")) && (morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:s", ":[GWYpi]") || morphex(dDA, [m.start[3], m[3]], ":[AQ].*:f", ":[GWYme]")) && ! look(s.slice(0,m.index), /ce que? +$/i) && (! (m[1].search(/^(?:ceux-(?:ci|là)|lesquels)$/) >= 0) || ! morph(dDA, prevword1(s, m.index), ":R", false, false));
    },
    s_ppas_ils_verbe_1: function (s, m) {
        return suggMasPlur(m[3]);
    },
    c_ppas_elles_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[3].search(/^légion$/i) >= 0) && (morph(dDA, [m.start[2], m[2]], ">(?:être|sembler|devenir|re(?:ster|devenir)|para[îi]tre) ", false) || m[2].endsWith(" été")) && (morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:s", ":[GWYpi]") || morphex(dDA, [m.start[3], m[3]], ":[AQ].*:m", ":[GWYfe]")) && (! (m[1].search(/^(?:elles|celles-(?:ci|là)|lesquelles)$/i) >= 0) || ! morph(dDA, prevword1(s, m.index), ":R", false, false));
    },
    s_ppas_elles_verbe_1: function (s, m) {
        return suggFemPlur(m[3]);
    },
    c_ppas_avoir_été_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":V0a", false);
    },
    c_ppas_avoir_été_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[3], m[3]], ":[123]s", ":[GNAQWY]");
    },
    s_ppas_avoir_été_2: function (s, m) {
        return suggVerbPpas(m[3]);
    },
    c_ppas_avoir_été_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /[çcCÇ]’$|[cC]e n’$|[çÇ]a (?:n’|)$/) && ! look(s.slice(0,m.index), /^ *ne pas /i) && ! morph(dDA, prevword1(s, m.index), ":Y", false);
    },
    c_ppas_avoir_été_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[3], m[3]], ":Y", ":A");
    },
    c_ppas_avoir_été_5: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[3], m[3]], ":V1..t.*:Y", ":A");
    },
    s_ppas_avoir_été_5: function (s, m) {
        return suggVerbPpas(m[3]);
    },
    c_ppas_je_verbe_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:sembler|para[îi]tre|pouvoir|penser|préférer|croire|d(?:evoir|éclarer|ésirer|étester|ire)|vouloir|affirmer|aimer|adorer|souhaiter|estimer|imaginer|risquer|aller) ", false) && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[GWYsi]");
    },
    s_ppas_je_verbe_être_1: function (s, m) {
        return suggSing(m[2]);
    },
    c_ppas_tu_verbe_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:sembler|para[îi]tre|pouvoir|penser|préférer|croire|d(?:evoir|éclarer|ésirer|étester|ire)|vouloir|affirmer|aimer|adorer|souhaiter|estimer|imaginer|risquer|aller) ", false) && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[GWYsi]");
    },
    s_ppas_tu_verbe_être_1: function (s, m) {
        return suggSing(m[2]);
    },
    c_ppas_il_verbe_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">(?:sembler|para[îi]tre|pouvoir|penser|préférer|croire|d(?:evoir|éclarer|ésirer|étester|ire)|vouloir|affirmer|aimer|adorer|souhaiter|estimer|imaginer|risquer|aller) ", false) && (morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[GWYsi]") || morphex(dDA, [m.start[3], m[3]], ":[AQ].*:f", ":[GWYme]"));
    },
    s_ppas_il_verbe_être_1: function (s, m) {
        return suggMasSing(m[3]);
    },
    c_ppas_ça_verbe_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">(?:sembler|para[îi]tre|pouvoir|penser|préférer|croire|d(?:evoir|éclarer|ésirer|étester|ire)|vouloir|affirmer|aimer|adorer|souhaiter|estimer|imaginer|risquer|aller) ", false) && (morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[MWYsi]") || morphex(dDA, [m.start[3], m[3]], ":[AQ].*:f", ":[GWYme]")) && ! morph(dDA, prevword1(s, m.index), ":R", false, false);
    },
    s_ppas_ça_verbe_être_1: function (s, m) {
        return suggMasSing(m[3]);
    },
    c_ppas_elle_verbe_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">(?:sembler|para[îi]tre|pouvoir|penser|préférer|croire|d(?:evoir|éclarer|ésirer|étester|ire)|vouloir|affirmer|aimer|adorer|souhaiter|estimer|imaginer|risquer|aller) ", false) && (morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[GWYsi]") || morphex(dDA, [m.start[3], m[3]], ":[AQ].*:m", ":[GWYfe]")) && ! morph(dDA, prevword1(s, m.index), ":R", false, false);
    },
    s_ppas_elle_verbe_être_1: function (s, m) {
        return suggFemSing(m[3]);
    },
    c_ppas_elle_qui_verbe_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">(?:sembler|para[îi]tre|pouvoir|penser|préférer|croire|d(?:evoir|éclarer|ésirer|étester|ire)|vouloir|affirmer|aimer|adorer|souhaiter|estimer|imaginer|risquer|aller) ", false) && (morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[MWYsi]") || morphex(dDA, [m.start[3], m[3]], ":[AQ].*:m", ":[GWYfe]"));
    },
    s_ppas_elle_qui_verbe_être_1: function (s, m) {
        return suggFemSing(m[3]);
    },
    c_ppas_nous_verbe_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[2].search(/^légion$/i) >= 0) && morph(dDA, [m.start[1], m[1]], ">(?:sembler|para[îi]tre|pouvoir|penser|préférer|croire|d(?:evoir|éclarer|ésirer|étester|ire)|vouloir|affirmer|aimer|adorer|souhaiter|estimer|imaginer|risquer|aller) ", false) && morph(dDA, [m.start[1], m[1]], ":1p", false) && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:s", ":[GWYpi]");
    },
    s_ppas_nous_verbe_être_1: function (s, m) {
        return suggPlur(m[2]);
    },
    c_ppas_ils_verbe_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[3].search(/^légion$/i) >= 0) && morph(dDA, [m.start[2], m[2]], ">(?:sembler|para[îi]tre|pouvoir|penser|préférer|croire|d(?:evoir|éclarer|ésirer|étester|ire)|vouloir|affirmer|aimer|adorer|souhaiter|estimer|imaginer|risquer|aller) ", false) && (morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:s", ":[GWYpi]") || morphex(dDA, [m.start[3], m[3]], ":[AQ].*:f", ":[GWYme]")) && (! (m[1].search(/^(?:ceux-(?:ci|là)|lesquels)$/) >= 0) || ! morph(dDA, prevword1(s, m.index), ":R", false, false));
    },
    s_ppas_ils_verbe_être_1: function (s, m) {
        return suggMasPlur(m[3]);
    },
    c_ppas_elles_verbe_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[3].search(/^légion$/i) >= 0) && morph(dDA, [m.start[2], m[2]], ">(?:sembler|para[îi]tre|pouvoir|penser|préférer|croire|d(?:evoir|éclarer|ésirer|étester|ire)|vouloir|affirmer|aimer|adorer|souhaiter|estimer|imaginer|risquer|aller) ", false) && (morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:s", ":[GWYpi]") || morphex(dDA, [m.start[3], m[3]], ":[AQ].*:m", ":[GWYfe]")) && (! (m[1].search(/^(?:elles|celles-(?:ci|là)|lesquelles)$/) >= 0) || ! morph(dDA, prevword1(s, m.index), ":R", false, false));
    },
    s_ppas_elles_verbe_être_1: function (s, m) {
        return suggFemPlur(m[3]);
    },
    c_ppas_être_accord_singulier_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[GMWYsi]") && ! morph(dDA, [m.start[1], m[1]], ":G", false);
    },
    s_ppas_être_accord_singulier_1: function (s, m) {
        return suggSing(m[2]);
    },
    c_ppas_être_accord_pluriel_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[2].search(/^légion$/i) >= 0) && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:s", ":[GWYpi]") && ! morph(dDA, [m.start[1], m[1]], ":G", false);
    },
    s_ppas_être_accord_pluriel_1: function (s, m) {
        return suggPlur(m[2]);
    },
    c_ppas_sujet_être_accord_genre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[3].search(/^légion$/i) >= 0) && ((morphex(dDA, [m.start[3], m[3]], ":[AQ].*:f", ":[GWme]") && morphex(dDA, [m.start[2], m[2]], ":m", ":[Gfe]")) || (morphex(dDA, [m.start[3], m[3]], ":[AQ].*:m", ":[GWfe]") && morphex(dDA, [m.start[2], m[2]], ":f", ":[Gme]"))) && ! ( morph(dDA, [m.start[3], m[3]], ":p", false) && morph(dDA, [m.start[2], m[2]], ":s", false) ) && ! morph(dDA, prevword1(s, m.index), ":(?:R|P|Q|Y|[123][sp])", false, false) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_ppas_sujet_être_accord_genre_1: function (s, m) {
        return switchGender(m[3]);
    },
    c_ppas_nom_propre_être_accord_genre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[2].search(/^légion$/i) >= 0) && ((morphex(dDA, [m.start[1], m[1]], ":M[1P].*:f", ":[GWme]") && morphex(dDA, [m.start[2], m[2]], ":m", ":[GWfe]")) || (morphex(dDA, [m.start[1], m[1]], ":M[1P].*:m", ":[GWfe]") && morphex(dDA, [m.start[2], m[2]], ":f", ":[GWme]"))) && ! morph(dDA, prevword1(s, m.index), ":(?:R|P|Q|Y|[123][sp])", false, false) && ! look(s.slice(0,m.index), /\b(?:et|ou|de) +$/);
    },
    s_ppas_nom_propre_être_accord_genre_1: function (s, m) {
        return switchGender(m[2]);
    },
    c_ppas_adj_accord_je_tu_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":A.*:p", ":(?:G|E|M1|W|s|i)");
    },
    s_ppas_adj_accord_je_tu_1: function (s, m) {
        return suggSing(m[1]);
    },
    c_ppas_adj_accord_il_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":A.*:[fp]", ":(?:G|E|M1|W|m:[si])");
    },
    s_ppas_adj_accord_il_1: function (s, m) {
        return suggMasSing(m[1]);
    },
    c_ppas_adj_accord_elle_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":A.*:[mp]", ":(?:G|E|M1|W|f:[si])|>(?:désoler|pire) ");
    },
    s_ppas_adj_accord_elle_1: function (s, m) {
        return suggFemSing(m[1]);
    },
    c_ppas_adj_accord_ils_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":A.*:[fs]", ":(?:G|E|M1|W|m:[pi])|>(?:désoler|pire) ");
    },
    s_ppas_adj_accord_ils_1: function (s, m) {
        return suggMasPlur(m[1]);
    },
    c_ppas_adj_accord_elles_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":A.*:[ms]", ":(?:G|E|M1|W|f:[pi])|>(?:désoler|pire) ");
    },
    s_ppas_adj_accord_elles_1: function (s, m) {
        return suggFemPlur(m[1]);
    },
    c_ppas_être_rendu_compte_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], "V0e", false) && m[3] != "rendu";
    },
    c_ppas_inversion_être_je_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":(?:[123][sp]|Y|[NAQ].*:p)", ":[GWsi]");
    },
    s_ppas_inversion_être_je_1: function (s, m) {
        return suggSing(m[1]);
    },
    c_ppas_inversion_être_tu_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":(?:[123][sp]|Y|[NAQ].*:p)", ":[GWsi]");
    },
    s_ppas_inversion_être_tu_1: function (s, m) {
        return suggSing(m[1]);
    },
    c_ppas_inversion_être_il_ce_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":(?:[123][sp]|Y|[NAQ].*:[pf])", ":(?:G|W|[me]:[si])|question ") && ! (m[1] == "ce" && morph(dDA, [m.start[2], m[2]], ":Y", false));
    },
    s_ppas_inversion_être_il_ce_1: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_ppas_inversion_être_elle_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":(?:[123][sp]|Y|[NAQ].*:[pm])", ":(?:G|W|[fe]:[si])");
    },
    s_ppas_inversion_être_elle_1: function (s, m) {
        return suggFemSing(m[1]);
    },
    c_ppas_inversion_être_nous_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":(?:[123][sp]|Y|[NAQ].*:s)", ":[GWpi]|>dire ");
    },
    s_ppas_inversion_être_nous_1: function (s, m) {
        return suggPlur(m[1]);
    },
    c_ppas_inversion_être_ils_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[1].search(/^légion$/i) >= 0) && (morphex(dDA, [m.start[1], m[1]], ":(?:[123][sp]|Y|[NAQ].*:s)", ":[GWpi]|>dire ") || morphex(dDA, [m.start[1], m[1]], ":(?:[123][sp]|[AQ].*:f)", ":[GWme]|>dire "));
    },
    s_ppas_inversion_être_ils_1: function (s, m) {
        return suggMasPlur(m[1]);
    },
    c_ppas_inversion_être_elles_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[1].search(/^légion$/i) >= 0) && (morphex(dDA, [m.start[1], m[1]], ":(?:[123][sp]|Y|[NAQ].*:s)", ":[GWpi]|>dire ") || morphex(dDA, [m.start[1], m[1]], ":(?:[123][sp]|[AQ].*:m)", ":[GWfe]|>dire "));
    },
    s_ppas_inversion_être_elles_1: function (s, m) {
        return suggFemPlur(m[1]);
    },
    c_ppas_sont_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ]", ":[QWGBMpi]") && ! (m[1].search(/^(?:légion|nombre|cause)$/i) >= 0) && ! look(s.slice(0,m.index), /\bce que?\b/i);
    },
    s_ppas_sont_1: function (s, m) {
        return suggPlur(m[1]);
    },
    c_ppas_sont_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morphex(dDA, [m.start[1], m[1]], ":V", ":(?:N|A|Q|W|G|3p)") && ! look(s.slice(0,m.index), /\bce que?\b/i);
    },
    s_ppas_sont_2: function (s, m) {
        return suggVerbPpas(m[1], ":m:p");
    },
    c_ppas_je_me_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:montrer|penser|révéler|savoir|sentir|voir|vouloir) ", false) && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[GWYsi]");
    },
    s_ppas_je_me_verbe_1: function (s, m) {
        return suggSing(m[2]);
    },
    c_ppas_tu_te_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:montrer|penser|révéler|savoir|sentir|voir|vouloir) ", false) && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:p", ":[GWYsi]");
    },
    s_ppas_tu_te_verbe_1: function (s, m) {
        return suggSing(m[2]);
    },
    c_ppas_il_se_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">(?:montrer|penser|révéler|savoir|sentir|voir|vouloir) ", false) && (morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[GWsi]") || morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:f", ":[GWYme]")) && (! (m[1].search(/^(?:celui-(?:ci|là)|lequel)$/) >= 0) || ! morph(dDA, prevword1(s, m.index), ":R", false, false));
    },
    s_ppas_il_se_verbe_1: function (s, m) {
        return suggMasSing(m[3]);
    },
    c_ppas_elle_se_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">(?:montrer|penser|révéler|savoir|sentir|voir|vouloir) ", false) && (morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[GWsi]") || morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:m", ":[GWYfe]")) && ! morph(dDA, prevword1(s, m.index), ":R", false, false);
    },
    s_ppas_elle_se_verbe_1: function (s, m) {
        return suggFemSing(m[3]);
    },
    c_ppas_elle_qui_se_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">(?:montrer|penser|révéler|savoir|sentir|voir|vouloir) ", false) && (morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:p", ":[GWsi]") || morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:m", ":[GWYfe]"));
    },
    s_ppas_elle_qui_se_verbe_1: function (s, m) {
        return suggFemSing(m[3]);
    },
    c_ppas_nous_nous_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:montrer|penser|révéler|savoir|sentir|voir|vouloir) ", false) && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:s", ":[GWpi]");
    },
    s_ppas_nous_nous_verbe_1: function (s, m) {
        return suggPlur(m[2]);
    },
    c_ppas_ils_se_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">(?:montrer|penser|révéler|savoir|sentir|voir|vouloir) ", false) && (morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:s", ":[GWpi]") || morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:f", ":[GWYme]")) && (! (m[1].search(/^(?:ceux-(?:ci|là)|lesquels)$/) >= 0) || ! morph(dDA, prevword1(s, m.index), ":R", false, false));
    },
    s_ppas_ils_se_verbe_1: function (s, m) {
        return suggMasPlur(m[3]);
    },
    c_ppas_elles_se_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">(?:montrer|penser|révéler|savoir|sentir|voir|vouloir) ", false) && (morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:s", ":[GWpi]") || morphex(dDA, [m.start[3], m[3]], ":[NAQ].*:m", ":[GWYfe]")) && (! (m[1].search(/^(?:elles|celles-(?:ci|là)|lesquelles)$/) >= 0) || ! morph(dDA, prevword1(s, m.index), ":R", false, false));
    },
    s_ppas_elles_se_verbe_1: function (s, m) {
        return suggFemPlur(m[3]);
    },
    c_ppas_le_verbe_pensée_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:trouver|considérer|croire|rendre|voilà) ", false) && morphex(dDA, [m.start[2], m[2]], ":[AQ].*:(?:[me]:p|f)", ":(?:G|Y|[AQ].*:m:[is])") && ! (morph(dDA, [m.start[1], m[1]], ":Y", false) && morph(dDA, [m.start[2], m[2]], ":3s", false));
    },
    s_ppas_le_verbe_pensée_1: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_ppas_la_verbe_pensée_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:trouver|considérer|croire|rendre|voilà) ", false) && morphex(dDA, [m.start[2], m[2]], ":[AQ].*:(?:[fe]:p|m)", ":(?:G|Y|[AQ]:f:[is])") && ! (morph(dDA, [m.start[1], m[1]], ":Y", false) && morph(dDA, [m.start[2], m[2]], ":3s", false));
    },
    s_ppas_la_verbe_pensée_1: function (s, m) {
        return suggFemSing(m[2]);
    },
    c_ppas_les_verbe_pensée_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:trouver|considérer|croire|rendre|voilà) ", false) && morphex(dDA, [m.start[2], m[2]], ":[AQ].*:s", ":(?:G|Y|[AQ].*:[ip])") && ! (morph(dDA, [m.start[1], m[1]], ":Y", false) && morph(dDA, [m.start[2], m[2]], ":3s", false));
    },
    s_ppas_les_verbe_pensée_1: function (s, m) {
        return suggPlur(m[2]);
    },
    c_ppas_me_te_verbe_pensée_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">(?:trouver|considérer|croire|rendre|voilà) ", false) && morphex(dDA, [m.start[3], m[3]], ":[AQ].*:p", ":(?:G|Y|[AQ].*:[is])") && ! (morph(dDA, [m.start[1], m[1]], ":Y", false) && morph(dDA, [m.start[2], m[2]], ":3s", false));
    },
    s_ppas_me_te_verbe_pensée_1: function (s, m) {
        return suggSing(m[3]);
    },
    c_ppas_se_verbe_pensée_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:trouver|considérer|croire|rendre) .*:3s", false) && morphex(dDA, [m.start[2], m[2]], ":[AQ].*:p", ":(?:G|Y|[AQ].*:[is])") && ! (morph(dDA, [m.start[1], m[1]], ":Y", false) && morph(dDA, [m.start[2], m[2]], ":3s", false));
    },
    s_ppas_se_verbe_pensée_1: function (s, m) {
        return suggSing(m[2]);
    },
    c_ppas_se_verbe_pensée_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morph(dDA, [m.start[1], m[1]], ">(?:trouver|considérer|croire|rendre) .*:3p", false) && morphex(dDA, [m.start[2], m[2]], ":[AQ].*:s", ":(?:G|Y|[AQ].*:[ip])") && ! (morph(dDA, [m.start[1], m[1]], ":Y", false) && morph(dDA, [m.start[2], m[2]], ":3s", false));
    },
    s_ppas_se_verbe_pensée_2: function (s, m) {
        return suggPlur(m[2]);
    },
    c_ppas_nous_verbe_pensée_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ( morphex(dDA, [m.start[1], m[1]], ">(?:trouver|considérer|croire|rendre|voilà) ", ":1p") || (morph(dDA, [m.start[1], m[1]], ">(?:trouver|considérer|croire) .*:1p", false) && look(s.slice(0,m.index), /\bn(?:ous|e) +$/)) ) && morphex(dDA, [m.start[2], m[2]], ":[AQ].*:s", ":(?:G|Y|[AQ].*:[ip])") && ! (morph(dDA, [m.start[1], m[1]], ":Y", false) && morph(dDA, [m.start[2], m[2]], ":3s", false));
    },
    s_ppas_nous_verbe_pensée_1: function (s, m) {
        return suggPlur(m[2]);
    },
    c_p_les_avoir_fait_vinfi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">avoir ", false) && morph(dDA, [m.start[3], m[3]], ":Y", false);
    },
    c_ppas_pronom_avoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[2].search(/^(?:barre|confiance|cours|envie|peine|prise|crainte|cure|affaire|hâte|force|recours)$/i) >= 0) && morph(dDA, prevword1(s, m.index), ">(?:comme|et|lorsque?|mais|o[uù]|puisque?|qu(?:oique?|i|and)|si(?:non|)) ", false, true) && morph(dDA, [m.start[1], m[1]], ":V0a", false) && ! m[2].gl_isUpperCase() && morphex(dDA, [m.start[2], m[2]], ":(?:[123][sp]|Q.*:[fp])", ":(?:G|W|Q.*:m:[si])");
    },
    s_ppas_pronom_avoir_1: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_ppas_nous_vous_avoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":Os", false) && ! (m[3].search(/^(?:barre|confiance|cours|envie|peine|prise|crainte|cure|affaire|hâte|force|recours)$/i) >= 0) && morph(dDA, prevword1(s, m.index), ">(?:comme|et|lorsque?|mais|o[uù]|puisque?|qu(?:oique?|i|and)|si(?:non|)) ", false, true) && morph(dDA, [m.start[2], m[2]], ":V0a", false) && ! m[3].gl_isUpperCase() && morphex(dDA, [m.start[3], m[3]], ":(?:[123][sp]|Q.*:[fp])", ":(?:G|W|Q.*:m:[si])");
    },
    s_ppas_nous_vous_avoir_1: function (s, m) {
        return suggMasSing(m[3]);
    },
    c_ppas_det_nom_avoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[4].search(/^(?:barre|confiance|cours|envie|peine|prise|crainte|cure|affaire|hâte|force|recours)$/i) >= 0) && morph(dDA, prevword1(s, m.index), ">(?:comme|et|lorsque?|mais|o[uù]|puisque?|qu(?:oique?|i|and)|si(?:non|)) ", false, true) && ! morph(dDA, [m.start[2], m[2]], ":G", false) && morph(dDA, [m.start[3], m[3]], ":V0a", false) && ! m[4].gl_isUpperCase() && morphex(dDA, [m.start[4], m[4]], ":(?:[123][sp]|Q.*:[fp])", ":(?:G|W|Q.*:m:[si])") && ! (m[3] == "avions" && morph(dDA, [m.start[4], m[4]], ":3[sp]", false));
    },
    s_ppas_det_nom_avoir_1: function (s, m) {
        return suggMasSing(m[4]);
    },
    c_ppas_les_avoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0a", false) && morphex(dDA, [m.start[2], m[2]], ":V[0-3]..t.*:Q.*:s", ":[GWpi]");
    },
    s_ppas_les_avoir_1: function (s, m) {
        return suggPlur(m[2]);
    },
    c_ppas_nous_avoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(m.end[0]), /^ *$/) && morph(dDA, [m.start[1], m[1]], ":V0a", false) && morphex(dDA, [m.start[2], m[2]], ":V[0-3]..t_.*:Q.*:s", ":[GWpi]") && morphex(dDA, prevword1(s, m.index), ":(?:M|Os|N)", ":R") && ! look(s.slice(0,m.index), /\bque? +[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+ +$/);
    },
    s_ppas_nous_avoir_1: function (s, m) {
        return suggPlur(m[2]);
    },
    c_ppas_l_avoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0a", false) && morphex(dDA, [m.start[2], m[2]], ":V[0-3]..t.*:Q.*:p", ":[GWsi]");
    },
    s_ppas_l_avoir_1: function (s, m) {
        return m[2].slice(0,-1);
    },
    c_ppas_m_t_avoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":V0a", false) && morphex(dDA, [m.start[3], m[3]], ":V[0-3]..t_.*:Q.*:p", ":[GWsi]") && ! look(s.slice(0,m.index), /\bque? /);
    },
    s_ppas_m_t_avoir_1: function (s, m) {
        return m[3].slice(0,-1);
    },
    c_ppas_qui_avoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">avoir ", false) && morphex(dDA, [m.start[2], m[2]], ":Q.*:(?:f|m:p)", ":m:[si]");
    },
    s_ppas_qui_avoir_1: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_ppas_avoir_ppas_mas_sing_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[1].search(/^(?:confiance|cours|envie|peine|prise|crainte|cure|affaire|hâte|force|recours)$/i) >= 0) && morphex(dDA, [m.start[1], m[1]], ":Q.*:(?:f|m:p)", ":m:[si]") && look(s.slice(0,m.index), /(?:après +$|sans +$|pour +$|que? +$|quand +$|, +$|^ *$)/i);
    },
    s_ppas_avoir_ppas_mas_sing_1: function (s, m) {
        return suggMasSing(m[1]);
    },
    c_ppas_m_t_l_avoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">avoir ", false) && morphex(dDA, [m.start[2], m[2]], ":(?:Y|[123][sp])", ":[QGWMX]") && ! (m[0].search(/^t’as +envie/i) >= 0);
    },
    s_ppas_m_t_l_avoir_1: function (s, m) {
        return suggVerbPpas(m[2], ":m:s");
    },
    c_ppas_det_plur_COD_que_avoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[3], m[3]], ":V0a", false) && ! (((m[4].search(/^(?:décidé|essayé|tenté|oublié)$/) >= 0) && look(s.slice(m.end[0]), / +d(?:e |’)/)) || ((m[4].search(/^réussi$/) >= 0) && look(s.slice(m.end[0]), / +à/))) && morph(dDA, [m.start[2], m[2]], ":[NAQ]", false) && morphex(dDA, [m.start[4], m[4]], ":V[0-3]..t.*:Q.*:s", ":[GWpi]") && ! morph(dDA, nextword1(s, m.end[0]), ":(?:Y|Oo|D)", false);
    },
    s_ppas_det_plur_COD_que_avoir_1: function (s, m) {
        return suggPlur(m[4], m[2]);
    },
    c_ppas_det_mas_sing_COD_que_avoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[3], m[3]], ":V0a", false) && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:m", false) && (morphex(dDA, [m.start[4], m[4]], ":V[0-3]..t.*:Q.*:f", ":[GWme]") || morphex(dDA, [m.start[4], m[4]], ":V[0-3]..t.*:Q.*:p", ":[GWsi]"));
    },
    s_ppas_det_mas_sing_COD_que_avoir_1: function (s, m) {
        return suggMasSing(m[4]);
    },
    c_ppas_det_fem_sing_COD_que_avoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[3], m[3]], ":V0a", false) && ! (((m[4].search(/^(?:décidé|essayé|tenté)$/) >= 0) && look(s.slice(m.end[0]), / +d(?:e |’)/)) || ((m[4].search(/^réussi$/) >= 0) && look(s.slice(m.end[0]), / +à/))) && morph(dDA, [m.start[2], m[2]], ":[NAQ].*:f", false) && (morphex(dDA, [m.start[4], m[4]], ":V[0-3]..t.*:Q.*:m", ":[GWfe]") || morphex(dDA, [m.start[4], m[4]], ":V[0-3]..t.*:Q.*:p", ":[GWsi]")) && ! morph(dDA, nextword1(s, m.end[0]), ":(?:Y|Oo)|>que?", false);
    },
    s_ppas_det_fem_sing_COD_que_avoir_1: function (s, m) {
        return suggFemSing(m[4]);
    },
    c_ppas_ce_que_pronom_avoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0a", false) && (morphex(dDA, [m.start[2], m[2]], ":V[0-3]..t.*:Q.*:f", ":[GWme]") || morphex(dDA, [m.start[2], m[2]], ":V[0-3]..t.*:Q.*:p", ":[GWsi]"));
    },
    s_ppas_ce_que_pronom_avoir_1: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_ppas_avoir_conf_infi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[1].search(/^(?:A|avions)$/) >= 0) && morph(dDA, [m.start[1], m[1]], ":V0a", false) && morph(dDA, [m.start[2], m[2]], ":V.+:(?:Y|2p)", false);
    },
    s_ppas_avoir_conf_infi_1: function (s, m) {
        return suggVerbPpas(m[2], ":m:s");
    },
    c_ppas_avoir_conf_infi_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && m[1] == "a" && m[2].endsWith("r") && ! look(s.slice(0,m.index), /\b(?:[mtn]’|il +|on +|elle +)$/i);
    },
    c_ppas_avoir_dû_vinfi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0a", false) && (morph(dDA, [m.start[3], m[3]], ":Y") || (m[3].search(/^(?:[mtsn]e|[nv]ous|leur|lui)$/) >= 0));
    },
    c_ppas_avoir_pronom_du_vinfi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0a", false) && (morph(dDA, [m.start[3], m[3]], ":Y") || (m[3].search(/^(?:[mtsn]e|[nv]ous|leur|lui)$/) >= 0));
    },
    c_ppas_ton_son_dû_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, nextword1(s, m.end[0]), ":[NAQ].*:[me]", false);
    },
    c_ppas_qui_être_dû_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0e", false);
    },
    c_ppas_avoir_pronom1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0a", false) && morphex(dDA, [m.start[2], m[2]], ":(?:Y|2p|Q.*:[fp])", ":m:[si]") && m[2] != "prise" && ! morph(dDA, prevword1(s, m.index), ">(?:les|[nv]ous|en)|:[NAQ].*:[fp]", false) && ! look(s.slice(0,m.index), /\b(?:quel(?:le|)s?|combien) /i);
    },
    s_ppas_avoir_pronom1_1: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_ppas_avoir_pronom2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0a", false) && morphex(dDA, [m.start[2], m[2]], ":(?:Y|2p|Q.*:[fp])", ":m:[si]") && m[2] != "prise" && ! morph(dDA, prevword1(s, m.index), ">(?:les|[nv]ous|en)|:[NAQ].*:[fp]", false) && ! look(s.slice(0,m.index), /\b(?:quel(?:le|)s?|combien) /i);
    },
    s_ppas_avoir_pronom2_1: function (s, m) {
        return suggMasSing(m[2]);
    },
    c_ppas_l_m_t_avoir_pronom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":V0a", false) && morphex(dDA, [m.start[3], m[3]], ":(?:Y|2p|Q.*:p)", ":[si]");
    },
    s_ppas_l_m_t_avoir_pronom_1: function (s, m) {
        return suggMasSing(m[3]);
    },
    c_ppas_les_avoir_pronom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0a", false) && morphex(dDA, [m.start[2], m[2]], ":V[123]..t.*:Q.*:s", ":[GWpi]");
    },
    s_ppas_les_avoir_pronom_1: function (s, m) {
        return suggPlur(m[2]);
    },
    c_conj_nous_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":(?:G|Y|P|1p|3[sp])") && ! look(s.slice(m.end[0]), /^ +(?:je|tu|ils?|elles?|on|[vn]ous) /);
    },
    s_conj_nous_verbe_1: function (s, m) {
        return suggVerb(m[1], ":1p");
    },
    c_conj_vous_verbe1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":(?:G|Y|P|2p|3[sp])") && ! look(s.slice(m.end[0]), /^ +(?:je|ils?|elles?|on|[vn]ous) /);
    },
    s_conj_vous_verbe1_1: function (s, m) {
        return suggVerb(m[1], ":2p");
    },
    c_conj_vous_verbe2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":2p") && look(s.slice(0,m.index), /^ *$|, *$/);
    },
    s_conj_vous_verbe2_1: function (s, m) {
        return suggVerb(m[1], ":2p");
    },
    c_conj_se_incohérence_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":2s", ":3[sp]");
    },
    s_conj_se_incohérence_1: function (s, m) {
        return suggVerb(m[1], ":3s");
    },
    c_conj_se_incohérence_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morphex(dDA, [m.start[1], m[1]], ":1p", ":3[sp]");
    },
    s_conj_se_incohérence_2: function (s, m) {
        return suggVerb(m[1], ":3p");
    },
    c_conj_se_incohérence_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && morphex(dDA, [m.start[1], m[1]], ":2p", ":3[sp]");
    },
    s_conj_se_incohérence_3: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_conf_det_nom_où_pronom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[NAQ]", ":G");
    },
    c_p_premier_ne_pro_per_obj1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P)", false);
    },
    d_p_premier_ne_pro_per_obj1_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2],":(?:[123][sp]|P)");
    },
    c_p_premier_ne_pro_per_obj2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P)", false);
    },
    d_p_premier_ne_pro_per_obj2_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2],":(?:[123][sp]|P)");
    },
    c_p_premier_ne_pro_per_obj2_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":X|>rien ", false);
    },
    c_p_premier_ne_pro_per_obj3_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P)", false);
    },
    d_p_premier_ne_pro_per_obj3_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2],":(?:[123][sp]|P)");
    },
    c_p_premier_ne_pro_per_obj4_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P)", false);
    },
    d_p_premier_ne_pro_per_obj4_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2],":(?:[123][sp]|P)");
    },
    c_p_premier_ne_pro_per_obj5_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P)", false);
    },
    d_p_premier_ne_pro_per_obj5_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2],":(?:[123][sp]|P)");
    },
    c_p_premier_ne_pro_per_obj5_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":X|>rien ", false);
    },
    c_p_premier_ne_pro_per_obj6_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P)", false);
    },
    d_p_premier_ne_pro_per_obj6_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2],":(?:[123][sp]|P)");
    },
    c_p_premier_ne_pro_per_obj7_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P)", false);
    },
    d_p_premier_ne_pro_per_obj7_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2],":(?:[123][sp]|P)");
    },
    c_p_premier_ne_pro_per_obj7_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":X|>rien ", false);
    },
    c_imp_confusion_2e_pers_pluriel_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V", false) && look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_imp_confusion_2e_pers_pluriel_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "moi";
    },
    s_imp_confusion_2e_pers_pluriel_2: function (s, m) {
        return suggVerbTense(m[1], ":E", ":2p") + "-moi";
    },
    c_imp_confusion_2e_pers_pluriel_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && m[2].startsWith("l") && morph(dDA, nextword1(s, m.end[0]), ":[OR]", ":N", true);
    },
    s_imp_confusion_2e_pers_pluriel_3: function (s, m) {
        return suggVerbTense(m[1], ":E", ":2p") + "-" + m[2];
    },
    c_imp_confusion_2e_pers_pluriel_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && look(s.slice(m.end[0]), /^ *$|^,/);
    },
    s_imp_confusion_2e_pers_pluriel_4: function (s, m) {
        return suggVerbTense(m[1], ":E", ":2p") + "-" + m[2];
    },
    c_imp_vgroupe1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V[13].*:Ip.*:2s", ":[GNAM]");
    },
    s_imp_vgroupe1_1: function (s, m) {
        return m[1].slice(0,-1);
    },
    c_imp_allez2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[MYOs]");
    },
    c_imp_vgroupe2_vgroupe3_t_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V[23].*:Ip.*:3s", ":[GNA]|>(?:devoir|suffire)") && analyse(m[1].slice(0,-1)+"s", ":E:2s", false) && ! ((m[1].search(/^vient$/i) >= 0) && look(s.slice(m.end[0]), /^ +(?:l[ea]|se |s’)/)) && ! ((m[1].search(/^dit$/i) >= 0) && look(s.slice(m.end[0]), /^ +[A-ZÉÈÂÎ]/));
    },
    s_imp_vgroupe2_vgroupe3_t_1: function (s, m) {
        return m[1].slice(0,-1)+"s";
    },
    c_imp_vgroupe3_d_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V3.*:Ip.*:3s", ":[GNA]") && ! ((m[1].search(/^répond$/i) >= 0) && look(s.slice(m.end[0]), /^ +[A-ZÉÈÂÎ]/));
    },
    c_imp_sois_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V") || (morphex(dDA, [m.start[2], m[2]], ":A", ":G") && ! look(s.slice(m.end[0]), /\bsoit\b/));
    },
    c_imp_verbe_lui_le_la_les_leur_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":E|>chez", false) && _oSpellChecker.isValid(m[1]);
    },
    s_imp_verbe_lui_le_la_les_leur_1: function (s, m) {
        return suggVerbImpe(m[1]);
    },
    c_imp_verbe_lui_le_la_les_leur_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "leurs";
    },
    c_imp_verbe_moi_toi_m_t_en_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":E|>chez", false) && _oSpellChecker.isValid(m[1]);
    },
    s_imp_verbe_moi_toi_m_t_en_1: function (s, m) {
        return suggVerbTense(m[1], ":E", ":2s");
    },
    c_imp_union_moi_toi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":E", ":[GM]");
    },
    c_imp_union_nous_vous_lui_y_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":E", ":[GM]") && morphex(dDA, nextword1(s, m.end[0]), ":", ":(?:Y|3[sp])", true) && morph(dDA, prevword1(s, m.index), ":Cc", false, true);
    },
    c_imp_union_les_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":E", ":[GM]") && morphex(dDA, nextword1(s, m.end[0]), ":", ":(?:N|A|Q|Y|B|3[sp])", true) && morph(dDA, prevword1(s, m.index), ":Cc", false, true);
    },
    c_imp_union_le_la_leur_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":E", ":[GM]") && morphex(dDA, nextword1(s, m.end[0]), ":", ":(?:N|A|Q|Y|MP|H|T)", true) && morph(dDA, prevword1(s, m.index), ":Cc", false, true);
    },
    c_imp_laisser_le_la_les_infi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ">laisser .*:E", false) && morphex(dDA, [m.start[3], m[3]], ":(?:Y|X|Oo)", ":[NAB]");
    },
    s_imp_laisser_le_la_les_infi_1: function (s, m) {
        return m[1].replace(/ /g, "-");
    },
    c_imp_apostrophe_m_t_en_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! (m[0].endsWith("t-en") && look(s.slice(0,m.index), /\bva$/i) && morph(dDA, nextword1(s, m.end[0]), ">guerre ", false, false));
    },
    c_imp_union_m_t_en_y_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":E", ":(?:G|M[12])") && morphex(dDA, nextword1(s, m.end[0]), ":", ":(?:Y|[123][sp])", true);
    },
    s_imp_union_m_t_en_y_1: function (s, m) {
        return m[0].replace(/ /g, "-");
    },
    c_imp_union_verbe_pronom_moi_toi_lui_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":E", false);
    },
    s_imp_union_verbe_pronom_moi_toi_lui_1: function (s, m) {
        return m[0].replace(/ /g, "-");
    },
    c_imp_union_verbe_pronom_en_y_leur_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":E", false) && morphex(dDA, nextword1(s, m.end[0]), ":[RC]", ":[NAQ]", true);
    },
    s_imp_union_verbe_pronom_en_y_leur_1: function (s, m) {
        return m[0].replace(/ /g, "-");
    },
    c_imp_union_verbe_pronom_nous_vous_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":E", false) && morphex(dDA, nextword1(s, m.end[0]), ":[RC]", ":Y", true);
    },
    s_imp_union_verbe_pronom_nous_vous_1: function (s, m) {
        return m[0].replace(/ /g, "-");
    },
    c_imp_union_aller_y_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, nextword1(s, m.end[0]), ":Y", false, false);
    },
    s_imp_union_aller_y_1: function (s, m) {
        return m[0].replace(/ /g, "-");
    },
    c_imp_union_vas_y_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/) && ! morph(dDA, nextword1(s, m.end[0]), ":Y", false, false);
    },
    s_imp_union_convenir_en_1: function (s, m) {
        return m[0].replace(/ /g, "-");
    },
    c_p_pro_per_obj01_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj01_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj02_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj02_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj03_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj03_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj04_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj04_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj05_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj05_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj06_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":R", false, true);
    },
    c_p_pro_per_obj06_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj06_2: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj07_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":R", false, false);
    },
    c_p_pro_per_obj07_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj07_2: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj08_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj08_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj08_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_p_pro_per_obj09_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return (m[1] == "le" && ! morph(dDA, [m.start[2], m[2]], ":N.*:[me]:[si]")) || (m[1] == "la" && ! morph(dDA, [m.start[2], m[2]], ":N.*:[fe]:[si]")) || (m[1] == "les" && ! morph(dDA, [m.start[2], m[2]], ":N.*:.:[pi]"));
    },
    c_p_pro_per_obj09_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj09_2: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj10_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":R", false, false);
    },
    c_p_pro_per_obj10_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj10_2: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj11_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj11_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj11_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_p_pro_per_obj12_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj13_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":[123]s", false, false);
    },
    c_p_pro_per_obj13_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj13_2: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj14_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":(?:[123]s|R)", false, false);
    },
    c_p_pro_per_obj14_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj14_2: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj15_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":(?:[123]p|R)", false, false);
    },
    c_p_pro_per_obj15_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj15_2: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj16_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, prevword1(s, m.index), ":3p", false, false);
    },
    c_p_pro_per_obj16_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj16_2: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj17_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    c_p_pro_per_obj17_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    d_p_pro_per_obj17_2: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj18_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", ":(?:[NAQ].*:[me]:[si]|G|M)");
    },
    c_p_pro_per_obj18_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    d_p_pro_per_obj18_2: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj19_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", ":(?:[NAQ].*:[fe]:[si]|G|M)");
    },
    c_p_pro_per_obj19_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    d_p_pro_per_obj19_2: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj20_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", ":(?:[NAQ].*:[si]|G|M)");
    },
    c_p_pro_per_obj20_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    d_p_pro_per_obj20_2: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj21_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", ":(?:[NAQ].*:[si]|G|M)");
    },
    c_p_pro_per_obj21_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    d_p_pro_per_obj21_2: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    d_p_pro_per_obj22_1: function (s, m, dDA) {
        return select(dDA, m.start[1], m[1], ":V");
    },
    c_p_pro_per_obj23_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", ":(?:A|G|M|1p)");
    },
    d_p_pro_per_obj23_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj23_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_p_pro_per_obj24_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", ":(?:A|G|M|2p)");
    },
    d_p_pro_per_obj24_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj24_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_p_pro_per_obj25_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj25_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj26_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj26_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj26_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_p_pro_per_obj27_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj27_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj27_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_p_pro_per_obj28_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj28_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj28_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_p_pro_per_obj29_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj29_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj29_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":2s", false) || look(s.slice(0,m.index), /\b(?:je|tu|on|ils?|elles?|nous) +$/i);
    },
    c_p_pro_per_obj30_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj30_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj30_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":2s|>(ils?|elles?|on) ", false) || look(s.slice(0,m.index), /\b(?:je|tu|on|ils?|elles?|nous) +$/i);
    },
    c_p_pro_per_obj31_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj31_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj32_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj32_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj33_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj33_1: function (s, m, dDA) {
        return select(dDA, m.start[1], m[1], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj34_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":(?:[123][sp]|P|Y)", false);
    },
    d_p_pro_per_obj34_1: function (s, m, dDA) {
        return select(dDA, m.start[2], m[2], ":(?:[123][sp]|P|Y)");
    },
    c_p_pro_per_obj34_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_conf_pronom_verbe_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V", false) && m[2] != "A";
    },
    c_conf_j_verbe_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V", false) && m[2] != "A";
    },
    c_conf_nous_vous_verbe_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":Y") && m[2] != "A";
    },
    c_conf_ait_confiance_été_faim_tort_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:ce que?|tout) /i);
    },
    c_conf_veillez2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/) && morph(dDA, [m.start[2], m[2]], ":Y|>ne ", false);
    },
    c_conf_veuillez_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/) && morph(dDA, [m.start[2], m[2]], ":Y|>ne ", false);
    },
    c_infi_comment_où_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":M") && ! (m[1].endsWith("ez") && look(s.slice(m.end[0]), / +vous/));
    },
    s_infi_comment_où_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_infi_qqch_de_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":(?:Q|2p)", ":M");
    },
    s_infi_qqch_de_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_infi_verbe_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ">(?:aimer|aller|désirer|devoir|espérer|pouvoir|préférer|souhaiter|venir) ", ":[GN]") && morphex(dDA, [m.start[2], m[2]], ":V", ":M");
    },
    s_infi_verbe_1: function (s, m) {
        return suggVerbInfi(m[2]);
    },
    c_infi_devoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">devoir ", false) && morphex(dDA, [m.start[2], m[2]], ":V", ":M") && ! morph(dDA, prevword1(s, m.index), ":D", false);
    },
    s_infi_devoir_1: function (s, m) {
        return suggVerbInfi(m[2]);
    },
    c_infi_divers_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":(?:Q|2p)", ":M");
    },
    s_infi_divers_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_infi_mieux_valoir_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">valoir ", false) && morphex(dDA, [m.start[2], m[2]], ":(?:Q|2p)", ":[GM]");
    },
    s_infi_mieux_valoir_1: function (s, m) {
        return suggVerbInfi(m[2]);
    },
    c_infi_à_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V1", ":[NM]") && ! m[1].gl_isTitle() && ! look(s.slice(0,m.index), /\b(?:les|en) +$/i);
    },
    s_infi_à_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_infi_avoir_beau_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">avoir ", false) && morphex(dDA, [m.start[2], m[2]], ":V1", ":N");
    },
    s_infi_avoir_beau_1: function (s, m) {
        return suggVerbInfi(m[2]);
    },
    c_infi_par_pour_sans_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[Q123][sp]?", ":[YN]");
    },
    s_infi_par_pour_sans_1: function (s, m) {
        return suggVerbInfi(m[1]);
    },
    c_ppas_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":V0e", false) && (morphex(dDA, [m.start[2], m[2]], ":Y", ":[NAQ]") || aSHOULDBEVERB.has(m[2])) && ! (m[1].search(/^(?:soit|été)$/i) >= 0) && ! morph(dDA, prevword1(s, m.index), ":Y|>ce", false, false) && ! look(s.slice(0,m.index), /ce que? +$/i) && ! morph(dDA, prevword1(s, m.index), ":Y", false, false) && ! look_chk1(dDA, s.slice(0,m.index), 0, /^ *>? *([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i, ":Y");
    },
    s_ppas_être_1: function (s, m) {
        return suggVerbPpas(m[2]);
    },
    c_conj_j_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":1s|>(?:en|y) ");
    },
    c_conj_j_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1] == "est" || m[1] == "es";
    },
    c_conj_j_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    s_conj_j_3: function (s, m) {
        return suggVerb(m[1], ":1s");
    },
    c_conj_je_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:1s|G)") && ! (morph(dDA, [m.start[2], m[2]], ":[PQ]", false) && morph(dDA, prevword1(s, m.index), ":V0.*:1s", false, false));
    },
    c_conj_je_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "est" || m[2] == "es";
    },
    c_conj_je_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    s_conj_je_3: function (s, m) {
        return suggVerb(m[2], ":1s");
    },
    c_conj_j_en_y_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:1s|G|1p)");
    },
    c_conj_j_en_y_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "est" || m[2] == "es";
    },
    c_conj_j_en_y_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    s_conj_j_en_y_3: function (s, m) {
        return suggVerb(m[2], ":1s");
    },
    c_conj_moi_qui_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:1s|G|1p|3p!)");
    },
    c_conj_moi_qui_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "est" || m[2] == "es";
    },
    c_conj_moi_qui_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    s_conj_moi_qui_3: function (s, m) {
        return suggVerb(m[2], ":1s");
    },
    c_conj_tu_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:G|[ISK].*:2s)") && ! (morph(dDA, [m.start[2], m[2]], ":[PQ]", false) && morph(dDA, prevword1(s, m.index), ":V0.*:2s", false, false));
    },
    s_conj_tu_1: function (s, m) {
        return suggVerb(m[2], ":2s");
    },
    c_conj_toi_qui_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:G|2p|3p!|[ISK].*:2s)");
    },
    s_conj_toi_qui_1: function (s, m) {
        return suggVerb(m[2], ":2s");
    },
    c_conj_il_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:3s|P|G)") && ! (morph(dDA, [m.start[2], m[2]], ":[PQ]", false) && morph(dDA, prevword1(s, m.index), ":V0.*:3s", false, false));
    },
    s_conj_il_1: function (s, m) {
        return suggVerb(m[2], ":3s");
    },
    c_conj_il_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && morph(dDA, [m.start[2], m[2]], ":3p", false);
    },
    c_conj_on_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:3s|P|G)") && ! (morph(dDA, [m.start[2], m[2]], ":[PQ]", false) && morph(dDA, prevword1(s, m.index), ":V0.*:3s", false, false));
    },
    s_conj_on_1: function (s, m) {
        return suggVerb(m[2], ":3s");
    },
    c_conj_quiconque_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":(?:3s|P|G|Q.*:m:[si])");
    },
    s_conj_quiconque_1: function (s, m) {
        return suggVerb(m[1], ":3s");
    },
    c_conj_ce_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:N|A|3s|P|Q|G|V0e.*:3p)");
    },
    s_conj_ce_1: function (s, m) {
        return suggVerb(m[2], ":3s");
    },
    c_conj_celui_celle_qui_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:3s|P|Q|G)");
    },
    s_conj_celui_celle_qui_1: function (s, m) {
        return suggVerb(m[2], ":3s");
    },
    c_conj_ça_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:3s|P|Q|G|3p!)") && ! morph(dDA, prevword1(s, m.index), ":[VR]|>de ", false, false);
    },
    s_conj_ça_1: function (s, m) {
        return suggVerb(m[2], ":3s");
    },
    c_conj_tout_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":(?:3s|P|Q|Y|G|3p!)") && ! morph(dDA, prevword1(s, m.index), ":[VRD]|>de", false, false) && !( morph(dDA, [m.start[1], m[1]], ":(?:Y|N.*:m:[si])", false) && ! (m[0].search(/ (?:qui|>) /) >= 0) );
    },
    s_conj_tout_1: function (s, m) {
        return suggVerb(m[1], ":3s");
    },
    c_conj_tout_qui_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":(?:3s|P|Q|G|3p!)") && ! morph(dDA, prevword1(s, m.index), ":[VRD]|>de", false, false) && !( morph(dDA, [m.start[1], m[1]], ":(?:Y|N.*:m:[si])", false) && ! (m[0].search(/ (?:qui|>) /) >= 0) );
    },
    s_conj_tout_qui_1: function (s, m) {
        return suggVerb(m[1], ":3s");
    },
    c_conj_lequel_laquelle_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:3s|P|Q|G|3p!)") && ! morph(dDA, prevword1(s, m.index), ":[VR]|>de", false, false) && !( morph(dDA, [m.start[2], m[2]], ":Y", false) && ! (m[0].search(/ (?:qui|>) /) >= 0) );
    },
    s_conj_lequel_laquelle_1: function (s, m) {
        return suggVerb(m[2], ":3s");
    },
    c_conj_c_en_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":3s", false);
    },
    s_conj_c_en_1: function (s, m) {
        return suggVerb(m[2], ":3s");
    },
    c_conj_c_en_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[YP]", false);
    },
    c_conj_elle_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:3s|P|G)") && ! morph(dDA, prevword1(s, m.index), ":R|>(?:et|ou)", false, false) && ! (morph(dDA, [m.start[2], m[2]], ":[PQ]", false) && morph(dDA, prevword1(s, m.index), ":V0.*:3s", false, false));
    },
    s_conj_elle_1: function (s, m) {
        return suggVerb(m[2], ":3s");
    },
    c_conj_elle_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && morph(dDA, [m.start[2], m[2]], ":3p", false);
    },
    s_conj_mieux_vaut_1: function (s, m) {
        return m[1].slice(0,-1)+"t";
    },
    c_conj_personne_aucun_rien_nul_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:3s|P|G)") && morphex(dDA, prevword1(s, m.index), ":C", ":(?:Y|P|Q|[123][sp]|R)", true) && !( m[1].endsWith("ien") && look(s.slice(0,m.index), /> +$/) && morph(dDA, [m.start[2], m[2]], ":Y", false) );
    },
    s_conj_personne_aucun_rien_nul_1: function (s, m) {
        return suggVerb(m[2], ":3s");
    },
    c_conj_un_une_des_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:3s|P|G|Q)") && morphex(dDA, prevword1(s, m.index), ":C", ":(?:Y|P|Q|[123][sp]|R)", true) && ! morph(dDA, [m.start[2], m[2]], ":[NA].*:[pi]", false);
    },
    s_conj_un_une_des_1: function (s, m) {
        return suggVerb(m[2], ":3s");
    },
    c_conj_un_une_des_qui_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:3[sp]|P|G)") && morphex(dDA, prevword1(s, m.index), ":C", ":(?:Y|P|Q|[123][sp]|R)", true);
    },
    s_conj_un_une_des_qui_1: function (s, m) {
        return suggVerb(m[2], ":3s");
    },
    c_conj_infi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":Y", false) && morph(dDA, [m.start[2], m[2]], ":V.[a-z_!?]+(?!.*:(?:3s|P|Q|Y|3p!))");
    },
    s_conj_infi_1: function (s, m) {
        return suggVerb(m[2], ":3s");
    },
    c_conj_det_sing_nom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! ((m[0].search(/^une? +(?:dizaine|douzaine|quinzaine|vingtaine|trentaine|quarantaine|cinquantaine|soixantaine|centaine|majorité|minorité|millier|partie|poignée|tas|paquet) /i) >= 0) && morph(dDA, [m.start[3], m[3]], ":3p", false)) && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:[si]", ":G") && morphex(dDA, [m.start[3], m[3]], ":V", ":(?:3s|P|Q|Y|3p!|G)") && morphex(dDA, prevword1(s, m.index), ":C", ":(?:Y|P)", true) && ! (look(s.slice(0,m.index), /\b(?:et|ou) +$/i) && morph(dDA, [m.start[3], m[3]], ":[123]?p", false)) && ! look(s.slice(0,m.index), /\bni .* ni /i);
    },
    c_conj_det_sing_nom_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! checkAgreement(m[2], m[3]);
    },
    s_conj_det_sing_nom_2: function (s, m) {
        return suggVerb(m[3], ":3s");
    },
    c_conj_det_sing_nom_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && isAmbiguousAndWrong(m[2], m[3], ":s", ":3s");
    },
    s_conj_det_sing_nom_3: function (s, m) {
        return suggVerb(m[3], ":3s", suggSing);
    },
    c_conj_det_sing_nom_confusion_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! ((m[0].search(/^la +moitié /i) >= 0) && morph(dDA, [m.start[3], m[3]], ":3p", false)) && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:[si]", ":G") && morphex(dDA, [m.start[3], m[3]], ":V", ":(?:3s|P|Q|Y|3p!|G)") && morphex(dDA, prevword1(s, m.index), ":C", ":(?:Y|P)", true) && ! (look(s.slice(0,m.index), /\b(?:et|ou) +$/i) && morph(dDA, [m.start[3], m[3]], ":[123]?p", false)) && ! look(s.slice(0,m.index), /\bni .* ni /i);
    },
    c_conj_det_sing_nom_confusion_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! checkAgreement(m[2], m[3]);
    },
    s_conj_det_sing_nom_confusion_2: function (s, m) {
        return suggVerb(m[3], ":3s");
    },
    c_conj_det_sing_nom_confusion_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && isVeryAmbiguousAndWrong(m[2], m[3], ":s", ":3s", look(s.slice(0,m.index), /^ *$|, *$/));
    },
    s_conj_det_sing_nom_confusion_3: function (s, m) {
        return suggVerb(m[3], ":3s", suggSing);
    },
    c_conj_det_sing_nom_qui_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! ( (m[0].search(/^(?:une? +(?:dizaine|douzaine|quinzaine|vingtaine|trentaine|quarantaine|cinquantaine|soixantaine|centaine|majorité|minorité|millier|partie|poignée|tas|paquet) |la +moitié) /i) >= 0) && morph(dDA, [m.start[3], m[3]], ":3p", false) ) && morphex(dDA, [m.start[2], m[2]], ":[NAQ].*:[si]", ":G") && morphex(dDA, [m.start[3], m[3]], ":V", ":(?:3s|P|Q|Y|3p!|G)") && morphex(dDA, prevword1(s, m.index), ":C", ":(?:Y|P)", true) && ! (look(s.slice(0,m.index), /\b(?:et|ou) +$/i) && morph(dDA, [m.start[3], m[3]], ":[123]p", false)) && ! look(s.slice(0,m.index), /\bni .* ni /i);
    },
    s_conj_det_sing_nom_qui_1: function (s, m) {
        return suggVerb(m[3], ":3s");
    },
    c_conj_nous_pronom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":(?:1p|3[sp])") && ! look(s.slice(m.end[0]), /^ +(?:je|tu|ils?|elles?|on|[vn]ous)/);
    },
    s_conj_nous_pronom_1: function (s, m) {
        return suggVerb(m[1], ":1p");
    },
    c_conj_nous_qui_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":[13]p") && ! look(s.slice(m.end[0]), /^ +(?:je|tu|il|elle|on|[vn]ous)/);
    },
    s_conj_nous_qui_1: function (s, m) {
        return suggVerb(m[1], ":1p");
    },
    c_conj_nous_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":1p") && ! look(s.slice(m.end[0]), /^ +(?:ils|elles)/);
    },
    s_conj_nous_1: function (s, m) {
        return suggVerb(m[1], ":1p");
    },
    c_conj_vous_pronom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":(?:2p|3[sp])") && ! look(s.slice(m.end[0]), /^ +(?:je|ils?|elles?|on|[vn]ous)/);
    },
    s_conj_vous_pronom_1: function (s, m) {
        return suggVerb(m[1], ":2p");
    },
    c_conj_vous_qui_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":2p") && ! look(s.slice(m.end[0]), /^ +(?:je|ils?|elles?|on|[vn]ous)/);
    },
    s_conj_vous_qui_1: function (s, m) {
        return suggVerb(m[1], ":2p");
    },
    c_conj_ils_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:3p|P|Q|G)") && ! (morph(dDA, [m.start[2], m[2]], ":[PQ]", false) && morph(dDA, prevword1(s, m.index), ":V0.*:3p", false, false));
    },
    s_conj_ils_1: function (s, m) {
        return suggVerb(m[2], ":3p");
    },
    c_conj_ils_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && morph(dDA, [m.start[2], m[2]], ":3s", false);
    },
    c_conj_ceux_celles_qui_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:3p|P|Q|G)");
    },
    s_conj_ceux_celles_qui_1: function (s, m) {
        return suggVerb(m[2], ":3p");
    },
    c_conj_ceux_là_celles_ci_lesquels_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:3p|P|Q|G)") && ! morph(dDA, prevword1(s, m.index), ":[VR]", false, false) && ! (morph(dDA, [m.start[2], m[2]], ":Y", false) && (m[1].search(/lesquel/i) >= 0) && ! (m[0].search(/ qui |>/) >= 0));
    },
    s_conj_ceux_là_celles_ci_lesquels_1: function (s, m) {
        return suggVerb(m[2], ":3p");
    },
    c_conj_elles_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:3p|P|Q|G)") && ! morph(dDA, prevword1(s, m.index), ":R", false, false) && ! (morph(dDA, [m.start[2], m[2]], ":[PQ]", false) && morph(dDA, prevword1(s, m.index), ":V0.*:3p", false, false));
    },
    s_conj_elles_1: function (s, m) {
        return suggVerb(m[2], ":3p");
    },
    c_conj_elles_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo && morph(dDA, [m.start[2], m[2]], ":3s", false);
    },
    c_conf_ont2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:à|avec|sur|chez|par|dans|parmi|contre|ni|de|pour|sous) +$/i);
    },
    c_conj_beaucoup_d_aucuns_la_plupart_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:3p|P|Q|G)") && ! morph(dDA, prevword1(s, m.index), ":[VR]|>de ", false, false);
    },
    s_conj_beaucoup_d_aucuns_la_plupart_1: function (s, m) {
        return suggVerb(m[2], ":3p");
    },
    c_conj_beaucoup_d_aucuns_la_plupart_qui_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:3p|P|Q|G)") && ! morph(dDA, prevword1(s, m.index), ":[VR]", false, false);
    },
    s_conj_beaucoup_d_aucuns_la_plupart_qui_1: function (s, m) {
        return suggVerb(m[2], ":3p");
    },
    c_conj_certains_tous_plusieurs_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V", ":(?:G|N|A|3p|P|Q)") && ! morph(dDA, prevword1(s, m.index), ":[VR]", false, false);
    },
    s_conj_certains_tous_plusieurs_1: function (s, m) {
        return suggVerb(m[2], ":3p");
    },
    c_conj_certains_certaines_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_conj_certains_certaines_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V.*:[123]p", ":[GWM]");
    },
    c_conj_certains_certaines_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1].endsWith("n") && morphex(dDA, [m.start[2], m[2]], ":V.*:[123]s", ":(?:V0e.*:3s|N.*:[me]:[si])");
    },
    s_conj_certains_certaines_3: function (s, m) {
        return suggVerb(m[2], ":3p");
    },
    c_conj_certains_certaines_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_conj_certains_certaines_5: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && m[1].endsWith("e") && morphex(dDA, [m.start[2], m[2]], ":V.*:[123]s", ":(?:V0e.*:3s|N.*:[fe]:[si])");
    },
    s_conj_certains_certaines_5: function (s, m) {
        return suggVerb(m[2], ":3p");
    },
    c_conj_certains_certaines_6: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return bCondMemo;
    },
    c_conj_det_plur_nom_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[NAQ].*:[pi]", false) && morphex(dDA, [m.start[3], m[3]], ":V", ":(?:[13]p|P|Y|G|A.*:e:[pi])") && morphex(dDA, prevword1(s, m.index), ":C", ":[YP]", true) && !( morph(dDA, [m.start[3], m[3]], ":3s", false) && look(s.slice(0,m.index), /\b(?:l[ea] |l’|une? |ce(?:tte|t|) |[mts](?:on|a) |[nv]otre ).+ entre .+ et /i) );
    },
    c_conj_det_plur_nom_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! checkAgreement(m[2], m[3]);
    },
    s_conj_det_plur_nom_2: function (s, m) {
        return suggVerb(m[3], ":3p");
    },
    c_conj_det_plur_nom_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && isAmbiguousAndWrong(m[2], m[3], ":p", ":3p");
    },
    s_conj_det_plur_nom_3: function (s, m) {
        return suggVerb(m[3], ":3p", suggPlur);
    },
    c_conj_det_plur_nom_qui_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[NAQ].*:[pi]", false) && morphex(dDA, [m.start[3], m[3]], ":V", ":(?:[13]p|P|Y|G|A.*:e:[pi])") && morphex(dDA, prevword1(s, m.index), ":C", ":[YP]", true) && !( morph(dDA, [m.start[3], m[3]], ":3s", false) && look(s.slice(0,m.index), /\b(?:l[ea] |l’|une? |ce(?:tte|t|) |[mts](?:on|a) |[nv]otre ).+ entre .+ et /i) );
    },
    s_conj_det_plur_nom_qui_1: function (s, m) {
        return suggVerb(m[3], ":3p");
    },
    c_conj_det_plur_nom_confusion_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[NAQ].*:[pi]", false) && morphex(dDA, [m.start[3], m[3]], ":V", ":(?:[13]p|P|Y|G|A.*:e:[pi])") && morphex(dDA, prevword1(s, m.index), ":C", ":[YP]", true) && !( morph(dDA, [m.start[3], m[3]], ":3s", false) && look(s.slice(0,m.index), /\b(?:l[ea] |l’|une? |ce(?:tte|t|) |[mts](?:on|a) |[nv]otre ).+ entre .+ et /i) );
    },
    c_conj_det_plur_nom_confusion_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! checkAgreement(m[2], m[3]);
    },
    s_conj_det_plur_nom_confusion_2: function (s, m) {
        return suggVerb(m[3], ":3p");
    },
    c_conj_det_plur_nom_confusion_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && (m[1] == "les" || m[1] == "Les") && isVeryAmbiguousAndWrong(m[2], m[3], ":p", ":3p", look(s.slice(0,m.index), /^ *$|, *$/));
    },
    s_conj_det_plur_nom_confusion_3: function (s, m) {
        return suggVerb(m[3], ":3p", suggPlur);
    },
    c_conj_det_plur_nom_confusion_4: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && (m[1] == "certains" || m[1] == "Certains") && isVeryAmbiguousAndWrong(m[2], m[3], ":m:p", ":3p", look(s.slice(0,m.index), /^ *$|, *$/));
    },
    s_conj_det_plur_nom_confusion_4: function (s, m) {
        return suggVerb(m[3], ":3p", suggMasPlur);
    },
    c_conj_det_plur_nom_confusion_5: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && (m[1] == "certaines" || m[1] == "Certaines") && isVeryAmbiguousAndWrong(m[2], m[3], ":f:p", ":3p", look(s.slice(0,m.index), /^ *$|, *$/));
    },
    s_conj_det_plur_nom_confusion_5: function (s, m) {
        return suggVerb(m[3], ":3p", suggFemPlur);
    },
    c_conj_det_plur_nom_qui_confusion_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":[NAQ].*:[pi]", false) && morphex(dDA, [m.start[3], m[3]], ":V", ":(?:[13]p|P|Q|Y|G|A.*:e:[pi])") && morphex(dDA, prevword1(s, m.index), ":C", ":[YP]", true) && !( morph(dDA, [m.start[3], m[3]], ":3s", false) && look(s.slice(0,m.index), /\b(?:l[ea] |l’|une? |ce(?:tte|t|) |[mts](?:on|a) |[nv]otre ).+ entre .+ et /i) );
    },
    s_conj_det_plur_nom_qui_confusion_1: function (s, m) {
        return suggVerb(m[3], ":3p");
    },
    c_conj_des_nom1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[NAQ].*:[pi]", false) && morphex(dDA, [m.start[2], m[2]], ":V", ":(?:[13]p|P|G|Q|A.*:[pi])") && morph(dDA, nextword1(s, m.end[0]), ":(?:R|D.*:p)|>au ", false, true);
    },
    c_conj_des_nom1_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[2], m[2]], ":[NA]", false);
    },
    s_conj_des_nom1_2: function (s, m) {
        return suggVerb(m[2], ":3p");
    },
    c_conj_des_nom1_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && ! checkAgreement(m[1], m[2]);
    },
    s_conj_des_nom1_3: function (s, m) {
        return suggVerb(m[2], ":3p", suggPlur);
    },
    c_conj_des_nom_qui_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":[NAQ].*:[pi]", false) && morphex(dDA, [m.start[2], m[2]], ":V", ":(?:[13]p|P|G)");
    },
    s_conj_des_nom_qui_1: function (s, m) {
        return suggVerb(m[2], ":3p");
    },
    c_conj_quel_quelle_que_3sg1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V0e", ":3s");
    },
    s_conj_quel_quelle_que_3sg1_1: function (s, m) {
        return suggVerb(m[1], ":3s");
    },
    c_conj_quel_quelle_que_3sg2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V0e.*:3s", ":3p");
    },
    s_conj_quel_quelle_que_3sg2_1: function (s, m) {
        return m[1].slice(0,-1);
    },
    c_conj_quels_quelles_que_3pl1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V0e", ":3p");
    },
    s_conj_quels_quelles_que_3pl1_1: function (s, m) {
        return suggVerb(m[1], ":3p");
    },
    c_conj_quels_quelles_que_3pl2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":V0e.*:3p", ":3s");
    },
    c_conj_nom_propre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! look(s.slice(0,m.index), /\b(?:et |ou |[dD][eu] |ni |[dD]e l’) *$/) && morph(dDA, [m.start[1], m[1]], ":M", false) && morphex(dDA, [m.start[2], m[2]], ":[123][sp]", ":(?:G|3s|3p!|P|M|[AQ].*:[si]|N.*:m:s)") && ! morph(dDA, prevword1(s, m.index), ":[VRD]", false, false) && ! look(s.slice(0,m.index), /([A-ZÉÈ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+), +([A-ZÉÈ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+), +$/) && ! (morph(dDA, [m.start[2], m[2]], ":3p", false) && prevword1(s, m.index));
    },
    s_conj_nom_propre_1: function (s, m) {
        return suggVerb(m[2], ":3s");
    },
    c_conj_nom_propre_et_nom_propre_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":M", false) && morph(dDA, [m.start[2], m[2]], ":M", false) && morphex(dDA, [m.start[3], m[3]], ":[123][sp]", ":(?:G|3p|P|Q.*:[pi])") && ! morph(dDA, prevword1(s, m.index), ":R", false, false);
    },
    s_conj_nom_propre_et_nom_propre_1: function (s, m) {
        return suggVerb(m[3], ":3p");
    },
    c_conj_que_où_comment_verbe_sujet_sing_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":(?:[12]s|3p)", ":(?:3s|G|W|3p!)") && ! look(s.slice(m.end[0]), /^ +(?:et|ou) (?:l(?:es? |a |’|eurs? )|[mts](?:a|on|es) |ce(?:tte|ts|) |[nv]o(?:s|tre) |d(?:u|es) )/);
    },
    s_conj_que_où_comment_verbe_sujet_sing_1: function (s, m) {
        return suggVerb(m[1], ":3s");
    },
    c_conj_lxquel_verbe_sujet_sing_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":(?:[12]s|3p)", ":(?:3s|G|W|3p!)") && ! look(s.slice(m.end[0]), /^ +(?:et|ou) (?:l(?:es? |a |’|eurs? )|[mts](?:a|on|es) |ce(?:tte|ts|) |[nv]o(?:s|tre) |d(?:u|es) )/) && morph(dDA, prevword1(s, m.index), ":R", false, false);
    },
    s_conj_lxquel_verbe_sujet_sing_1: function (s, m) {
        return suggVerb(m[1], ":3s");
    },
    c_conj_que_où_comment_verbe_sujet_pluriel_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[123]s", ":(?:3p|G|W)");
    },
    s_conj_que_où_comment_verbe_sujet_pluriel_1: function (s, m) {
        return suggVerb(m[1], ":3p");
    },
    c_conj_lxquel_verbe_sujet_pluriel_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[123]s", ":(?:3p|G|W)") && morph(dDA, prevword1(s, m.index), ":R", false, false);
    },
    s_conj_lxquel_verbe_sujet_pluriel_1: function (s, m) {
        return suggVerb(m[1], ":3p");
    },
    c_conj_que_où_comment_verbe_sujet_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[12][sp]", ":(?:G|W|3[sp]|Y|P|Q|N|A|M)");
    },
    s_conj_que_où_comment_verbe_sujet_1: function (s, m) {
        return suggVerb(m[1], ":3s");
    },
    c_conj_puisse_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_conj_puisse_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":D.*:p", false);
    },
    c_conj_puisse_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! bCondMemo && m[1].endsWith("s") && m[2] != "tu" && ! look(s.slice(0,m.index), /\btu /i);
    },
    c_inte_union_xxxe_je_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V.*:1[sŝś]", ":[GNW]") && ! look(s.slice(0,m.index), /\bje +$/i) && morphex(dDA, nextword1(s, m.end[0]), ":", ":(?:Oo|X|1s)", true);
    },
    s_inte_union_xxxe_je_1: function (s, m) {
        return m[1].slice(0,-1)+"é-je";
    },
    c_inte_union_xxx_je_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V.*:1s", ":[GNW]") && ! look(s.slice(0,m.index), /\b(?:je|tu) +$/i) && morphex(dDA, nextword1(s, m.end[0]), ":", ":(?:Oo|X|1s)", true);
    },
    c_inte_union_tu_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V.*:2s", ":[GNW]") && ! look(s.slice(0,m.index), /\b(?:je|tu) +$/i) && morphex(dDA, nextword1(s, m.end[0]), ":", ":2s", true);
    },
    c_inte_union_il_on_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V.*:3s", ":[GNW]") && ! look(s.slice(0,m.index), /\b(?:ce|il|elle|on) +$/i) && morphex(dDA, nextword1(s, m.end[0]), ":", ":3s|>y ", true);
    },
    s_inte_union_il_on_1: function (s, m) {
        return m[0].replace(/ /g, "-");
    },
    c_inte_union_elle_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V.*:3s", ":[GNW]") && ! look(s.slice(0,m.index), /\b(?:ce|il|elle|on) +$/i) && morphex(dDA, nextword1(s, m.end[0]), ":", ":3s", true);
    },
    c_inte_union_nous_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V.*:1p", ":[GNW]") && ! morph(dDA, prevword1(s, m.index), ":Os", false, false) && morphex(dDA, nextword1(s, m.end[0]), ":", ":(?:Y|1p)", true);
    },
    c_inte_union_vous_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V.*:2p", ":[GNW]|>vouloir .*:E:2p") && ! morph(dDA, prevword1(s, m.index), ":Os", false, false) && morphex(dDA, nextword1(s, m.end[0]), ":", ":(?:Y|2p)", true);
    },
    c_inte_union_ils_elles_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V.*:3p", ":[GNW]") && ! look(s.slice(0,m.index), /\b(?:ce|ils|elles) +$/i) && morphex(dDA, nextword1(s, m.end[0]), ":", ":3p", true);
    },
    s_inte_union_ils_elles_1: function (s, m) {
        return m[0].replace(/ /g, "-");
    },
    c_inte_je_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":1[sśŝ]");
    },
    s_inte_je_1: function (s, m) {
        return suggVerb(m[1], ":1ś");
    },
    c_inte_je_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":V", false);
    },
    s_inte_je_2: function (s, m) {
        return suggSimil(m[1], ":1[sśŝ]", false);
    },
    c_inte_tu_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":[ISK].*:2s");
    },
    s_inte_tu_1: function (s, m) {
        return suggVerb(m[1], ":2s");
    },
    c_inte_tu_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":V", false);
    },
    s_inte_tu_2: function (s, m) {
        return suggSimil(m[1], ":2s", false);
    },
    c_inte_il_elle_on_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":3s");
    },
    s_inte_il_elle_on_1: function (s, m) {
        return suggVerb(m[1], ":3s");
    },
    c_inte_il_elle_on_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1] != "t" && (! m[1].endsWith("oilà") || m[2] != "il") && morphex(dDA, [m.start[1], m[1]], ":", ":V");
    },
    s_inte_il_elle_on_2: function (s, m) {
        return suggSimil(m[1], ":3s", false);
    },
    c_inte_il_elle_on_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! m[2].endsWith(("n", "N")) && morphex(dDA, [m.start[1], m[1]], ":3p", ":3s");
    },
    c_inte_ce_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":(?:3s|V0e.*:3p)");
    },
    s_inte_ce_1: function (s, m) {
        return suggVerb(m[1], ":3s");
    },
    c_inte_ce_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":", ":V");
    },
    s_inte_ce_2: function (s, m) {
        return suggSimil(m[1], ":3s", false);
    },
    c_inte_ce_3: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[2] == "se";
    },
    c_inte_nous_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":(?:1p|E:2[sp])");
    },
    s_inte_nous_1: function (s, m) {
        return suggVerb(m[1], ":1p");
    },
    c_inte_nous_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":", ":V|>chez ");
    },
    s_inte_nous_2: function (s, m) {
        return suggSimil(m[1], ":1p", false);
    },
    c_inte_vous_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":2p");
    },
    s_inte_vous_1: function (s, m) {
        return suggVerb(m[1], ":2p");
    },
    c_inte_vous_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return ! morph(dDA, [m.start[1], m[1]], ":V|>chez ", false);
    },
    s_inte_vous_2: function (s, m) {
        return suggSimil(m[1], ":2p", false);
    },
    c_inte_ils_elles_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":V", ":3p") && _oSpellChecker.isValid(m[1]);
    },
    s_inte_ils_elles_1: function (s, m) {
        return suggVerb(m[1], ":3p");
    },
    c_inte_ils_elles_2: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return m[1] != "t" && ! morph(dDA, [m.start[1], m[1]], ":V", false) && _oSpellChecker.isValid(m[1]);
    },
    s_inte_ils_elles_2: function (s, m) {
        return suggSimil(m[1], ":3p", false);
    },
    c_conf_avoir_sujet_participe_passé_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">avoir ", false) && morph(dDA, [m.start[2], m[2]], ":V.......e_.*:Q", false);
    },
    c_conf_sujet_avoir_participe_passé_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">avoir ", false) && morph(dDA, [m.start[2], m[2]], ":V.......e_.*:Q", false);
    },
    c_vmode_j_aimerais_vinfi_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":[YX]|>(?:y|ne|que?) ", ":R") && look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_vmode_j_aurais_aimé_que_avoir_être_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[2], m[2]], ":Y|>(?:ne|que?) ", false);
    },
    c_vmode_si_sujet1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":(?:Os|M)", false) && morphex(dDA, [m.start[2], m[2]], ":[SK]", ":(?:G|V0|I)") && look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_vmode_si_sujet2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":[SK]", ":(?:G|V0|I)") && look(s.slice(0,m.index), /^ *$|, *$/);
    },
    c_vmode_dès_que_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":(?:Os|M)", false) && morphex(dDA, [m.start[2], m[2]], ":S", ":[IG]");
    },
    s_vmode_dès_que_1: function (s, m) {
        return suggVerbMode(m[2], ":I", m[1]);
    },
    c_vmode_qqch_que_subjonctif1_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ">(?:afin|avant|pour|quoi|permettre|falloir|vouloir|ordonner|exiger|désirer|douter|préférer|suffire) ", false) && morph(dDA, [m.start[2], m[2]], ":(?:Os|M)", false) && morphex(dDA, [m.start[3], m[3]], ":I", ":[GYS]") && ! (morph(dDA, [m.start[1], m[1]], ">douter ", false) && morph(dDA, [m.start[3], m[3]], ":(?:If|K)", false));
    },
    s_vmode_qqch_que_subjonctif1_1: function (s, m) {
        return suggVerbMode(m[3], ":S", m[2]);
    },
    c_vmode_bien_que_subjonctif_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":(?:Os|M)", false) && morphex(dDA, [m.start[2], m[2]], ":V.*:I", ":(?:[GSK]|If)|>(?:hériter|recevoir|donner|offrir) ") && look(s.slice(0,m.index), /^ *$|, *$/) && ! ( morph(dDA, [m.start[2], m[2]], ":V0a", false) && morph(dDA, nextword1(s, m.end[0]), ">(?:hériter|recevoir|donner|offrir) ", false) ) && ! look(sx.slice(0,m.index), /\bsi /i);
    },
    s_vmode_bien_que_subjonctif_1: function (s, m) {
        return suggVerbMode(m[2], ":S", m[1]);
    },
    c_vmode_qqch_que_subjonctif2_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":(?:Os|M)", false) && morphex(dDA, [m.start[2], m[2]], ":", ":[GYS]");
    },
    s_vmode_qqch_que_subjonctif2_1: function (s, m) {
        return suggVerbMode(m[2], ":S", m[1]);
    },
    c_vmode_sujet_indicatif_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[2], m[2]], ":S", ":[GIK]") && ! (m[2].search(/^e(?:usse|û[mt]es|ût)/) >= 0);
    },
    s_vmode_sujet_indicatif_1: function (s, m) {
        return suggVerbMode(m[2], ":I", m[1]);
    },
    c_vmode_j_indicatif_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morphex(dDA, [m.start[1], m[1]], ":S", ":[GIK]") && m[1] != "eusse";
    },
    s_vmode_j_indicatif_1: function (s, m) {
        return suggVerbMode(m[1], ":I", "je");
    },
    c_vmode_après_que_indicatif_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":(?:Os|M)", false) && (morphex(dDA, [m.start[2], m[2]], ":V.*:S", ":[GI]") || morph(dDA, [m.start[2], m[2]], ":V0e.*:S", false));
    },
    s_vmode_après_que_indicatif_1: function (s, m) {
        return suggVerbMode(m[2], ":I", m[1]);
    },
    c_vmode_quand_lorsque_indicatif_1: function (s, sx, m, dDA, sCountry, bCondMemo) {
        return morph(dDA, [m.start[1], m[1]], ":(?:Os|M)", false) && (morphex(dDA, [m.start[2], m[2]], ":V.*:S", ":[GI]") || morph(dDA, [m.start[2], m[2]], ":V0e.*:S", false));
    },
    s_vmode_quand_lorsque_indicatif_1: function (s, m) {
        return suggVerbMode(m[2], ":I", m[1]);
    },
}




if (typeof(exports) !== 'undefined') {
    exports.lang = gc_engine.lang;
    exports.locales = gc_engine.locales;
    exports.pkg = gc_engine.pkg;
    exports.name = gc_engine.name;
    exports.version = gc_engine.version;
    exports.author = gc_engine.author;
    exports.parse = gc_engine.parse;
    exports._zEndOfSentence = gc_engine._zEndOfSentence;
    exports._zBeginOfParagraph = gc_engine._zBeginOfParagraph;
    exports._zEndOfParagraph = gc_engine._zEndOfParagraph;
    exports._getSentenceBoundaries = gc_engine._getSentenceBoundaries;
    exports._proofread = gc_engine._proofread;
    exports._createError = gc_engine._createError;
    exports._rewrite = gc_engine._rewrite;
    exports.ignoreRule = gc_engine.ignoreRule;
    exports.resetIgnoreRules = gc_engine.resetIgnoreRules;
    exports.reactivateRule = gc_engine.reactivateRule;
    exports.listRules = gc_engine.listRules;
    exports._getRules = gc_engine._getRules;
    exports.load = gc_engine.load;
    exports.getSpellChecker = gc_engine.getSpellChecker;
    exports.setOption = gc_engine.setOption;
    exports.setOptions = gc_engine.setOptions;
    exports.getOptions = gc_engine.getOptions;
    exports.getDefaultOptions = gc_engine.getDefaultOptions;
    exports.resetOptions = gc_engine.resetOptions;
}
