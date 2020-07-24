// Grammar checker engine

/* jshint esversion:6, -W097 */
/* jslint esversion:6 */
/* global require, exports, console */

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



if (typeof(process) !== 'undefined') {
    // NodeJS
    var gc_options = require("./gc_options.js");
    var gc_rules = require("./gc_rules.js");
    var gc_rules_graph = require("./gc_rules_graph.js");
    var cregex = require("./cregex.js");
    var text = require("../text.js");
}


function capitalizeArray (aArray) {
    // can’t map on user defined function??
    let aNew = [];
    for (let i = 0; i < aArray.length; i = i + 1) {
        aNew[i] = aArray[i].slice(0,1).toUpperCase() + aArray[i].slice(1);
    }
    return aNew;
}


// data
let _sAppContext = "";                                  // what software is running
let _dOptions = null;
let _dOptionsColors = null;
let _oSpellChecker = null;
let _oTokenizer = null;
let _aIgnoredRules = new Set();


function echo (x) {
    console.log(x);
    return true;
}


var gc_engine = {

    //// Informations

    lang: "fr",
    locales: {'fr-FR': ['fr', 'FR', ''], 'fr-BE': ['fr', 'BE', ''], 'fr-CA': ['fr', 'CA', ''], 'fr-CH': ['fr', 'CH', ''], 'fr-LU': ['fr', 'LU', ''], 'fr-BF': ['fr', 'BF', ''], 'fr-BJ': ['fr', 'BJ', ''], 'fr-CD': ['fr', 'CD', ''], 'fr-CI': ['fr', 'CI', ''], 'fr-CM': ['fr', 'CM', ''], 'fr-MA': ['fr', 'MA', ''], 'fr-ML': ['fr', 'ML', ''], 'fr-MU': ['fr', 'MU', ''], 'fr-NE': ['fr', 'NE', ''], 'fr-RE': ['fr', 'RE', ''], 'fr-SN': ['fr', 'SN', ''], 'fr-TG': ['fr', 'TG', '']},
    pkg: "grammalecte",
    name: "Grammalecte",
    version: "1.11.0",
    author: "Olivier R.",

    //// Initialization

    load: function (sContext="JavaScript", sColorType="aRGB", sPath="") {
        try {
            if(typeof(process) !== 'undefined') {
                var spellchecker = require("../graphspell/spellchecker.js");
                _oSpellChecker = new spellchecker.SpellChecker("fr", "", "fr-allvars.json", "", "");
            } else if (typeof(require) !== 'undefined') {
                var spellchecker = require("resource://grammalecte/graphspell/spellchecker.js");
                _oSpellChecker = new spellchecker.SpellChecker("fr", "", "fr-allvars.json", "", "");
            } else {
                _oSpellChecker = new SpellChecker("fr", sPath, "fr-allvars.json", "", "");
            }
            _sAppContext = sContext;
            _dOptions = gc_options.getOptions(sContext).gl_shallowCopy();     // duplication necessary, to be able to reset to default
            _dOptionsColors = gc_options.getOptionsColors(sContext, sColorType);
            _oTokenizer = _oSpellChecker.getTokenizer();
            _oSpellChecker.activateStorage();
        }
        catch (e) {
            console.error(e);
        }
    },

    getSpellChecker: function () {
        return _oSpellChecker;
    },

    //// Rules

    getRules: function (bParagraph) {
        if (!bParagraph) {
            return gc_rules.lSentenceRules;
        }
        return gc_rules.lParagraphRules;
    },

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
            for (let [sOption, lRuleGroup] of this.getRules(true)) {
                for (let [,, sLineId, sRuleId,,] of lRuleGroup) {
                    if (!sFilter || sRuleId.test(sFilter)) {
                        yield [sOption, sLineId, sRuleId];
                    }
                }
            }
            for (let [sOption, lRuleGroup] of this.getRules(false)) {
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
    },

    //// Parsing

    parse: function (sText, sCountry="FR", bDebug=false, dOptions=null, bContext=false, bFullInfo=false) {
        // init point to analyse <sText> and returns an iterable of errors or (with option <bFullInfo>) a list of sentences with tokens and errors
        let oText = new TextParser(sText);
        return oText.parse(sCountry, bDebug, dOptions, bContext, bFullInfo);
    }
};


class TextParser {

    constructor (sText) {
        this.sText = sText;
        this.sText0 = sText;
        this.sSentence = "";
        this.sSentence0 = "";
        this.nOffsetWithinParagraph = 0;
        this.lToken = [];
        this.dTokenPos = new Map();         // {position: token}
        this.dTags = new Map();             // {position: tags}
        this.dError = new Map();            // {position: error}
        this.dSentenceError = new Map();    // {position: error} (for the current sentence only)
        this.dErrorPriority = new Map();    // {position: priority of the current error}
    }

    asString () {
        let s = "===== TEXT =====\n";
        s += "sentence: " + this.sSentence0 + "\n";
        s += "now:      " + this.sSentence  + "\n";
        for (let dToken of this.lToken) {
            s += `#${dToken["i"]}\t${dToken["nStart"]}:${dToken["nEnd"]}\t${dToken["sValue"]}\t${dToken["sType"]}`;
            if (dToken.hasOwnProperty("lMorph")) {
                s += "\t" + dToken["lMorph"].toString();
            }
            if (dToken.hasOwnProperty("aTags")) {
                s += "\t" + dToken["aTags"].toString();
            }
            s += "\n";
        }
        return s;
    }

    parse (sCountry="FR", bDebug=false, dOptions=null, bContext=false, bFullInfo=false) {
        // analyses <sText> and returns an iterable of errors or (with option <bFullInfo>) a list of sentences with tokens and errors
        let dOpt = dOptions || _dOptions;
        let bShowRuleId = option('idrule');
        // parse paragraph
        try {
            this.parseText(this.sText, this.sText0, true, 0, sCountry, dOpt, bShowRuleId, bDebug, bContext);
        }
        catch (e) {
            console.error(e);
        }
        let lParagraphErrors = null;
        if (bFullInfo) {
            lParagraphErrors = Array.from(this.dError.values());
            this.dSentenceError.clear();
        }
        // parse sentence
        let sText = this._getCleanText();
        let lSentences = [];
        let oSentence = null;
        for (let [iStart, iEnd] of text.getSentenceBoundaries(sText)) {
            try {
                this.sSentence = sText.slice(iStart, iEnd);
                this.sSentence0 = this.sText0.slice(iStart, iEnd);
                this.nOffsetWithinParagraph = iStart;
                this.lToken = Array.from(_oTokenizer.genTokens(this.sSentence, true));
                this.dTokenPos.clear();
                for (let dToken of this.lToken) {
                    if (dToken["sType"] != "INFO") {
                        this.dTokenPos.set(dToken["nStart"], dToken);
                    }
                }
                if (bFullInfo) {
                    oSentence = { "nStart": iStart, "nEnd": iEnd, "sSentence": this.sSentence, "lToken": Array.from(this.lToken) };
                    for (let oToken of oSentence["lToken"]) {
                        if (oToken["sType"] == "WORD") {
                            oToken["bValidToken"] = _oSpellChecker.isValidToken(oToken["sValue"]);
                        }
                    }
                    // the list of tokens is duplicated, to keep all tokens from being deleted when analysis
                }
                this.parseText(this.sSentence, this.sSentence0, false, iStart, sCountry, dOpt, bShowRuleId, bDebug, bContext);
                if (bFullInfo) {
                    oSentence["lGrammarErrors"] = Array.from(this.dSentenceError.values());
                    lSentences.push(oSentence);
                    this.dSentenceError.clear();
                }
            }
            catch (e) {
                console.error(e);
            }
        }
        if (bFullInfo) {
            // Grammar checking and sentence analysis
            return [lParagraphErrors, lSentences];
        } else {
            // Grammar checking only
            return Array.from(this.dError.values());
        }
    }

    _getCleanText () {
        let sText = this.sText;
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
        if (sText.includes("@@")) {
            sText = sText.replace(/@@+/g, "");
        }
        return sText;
    }

    parseText (sText, sText0, bParagraph, nOffset, sCountry, dOptions, bShowRuleId, bDebug, bContext) {
        let bChange = false;
        let m;

        for (let [sOption, lRuleGroup] of gc_engine.getRules(bParagraph)) {
            if (sOption == "@@@@") {
                // graph rules
                if (!bParagraph && bChange) {
                    this.update(sText, bDebug);
                    bChange = false;
                }
                for (let [sGraphName, sLineId] of lRuleGroup) {
                    if (!dOptions.has(sGraphName) || dOptions.get(sGraphName)) {
                        if (bDebug) {
                            console.log(">>>> GRAPH: " + sGraphName + " " + sLineId);
                        }
                        sText = this.parseGraph(gc_rules_graph.dAllGraph[sGraphName], sCountry, dOptions, bShowRuleId, bDebug, bContext);
                    }
                }
            }
            else if (!sOption || option(sOption)) {
                for (let [zRegex, bUppercase, sLineId, sRuleId, nPriority, lActions, lGroups, lNegLookBefore] of lRuleGroup) {
                    if (!_aIgnoredRules.has(sRuleId)) {
                        while ((m = zRegex.gl_exec2(sText, lGroups, lNegLookBefore)) !== null) {
                            let bCondMemo = null;
                            for (let [sFuncCond, cActionType, sWhat, ...eAct] of lActions) {
                                // action in lActions: [ condition, action type, replacement/suggestion/action[, iGroup[, message, URL]] ]
                                try {
                                    bCondMemo = (!sFuncCond || oEvalFunc[sFuncCond](sText, sText0, m, this.dTokenPos, sCountry, bCondMemo));
                                    if (bCondMemo) {
                                        switch (cActionType) {
                                            case "-":
                                                // grammar error
                                                //console.log("-> error detected in " + sLineId + "\nzRegex: " + zRegex.source);
                                                let nErrorStart = nOffset + m.start[eAct[0]];
                                                if (!this.dError.has(nErrorStart) || nPriority > this.dErrorPriority.get(nErrorStart)) {
                                                    this.dError.set(nErrorStart, this._createErrorFromRegex(sText, sText0, sWhat, nOffset, m, eAct[0], sLineId, sRuleId, bUppercase, eAct[1], eAct[2], bShowRuleId, sOption, bContext));
                                                    this.dErrorPriority.set(nErrorStart, nPriority);
                                                    this.dSentenceError.set(nErrorStart, this.dError.get(nErrorStart));
                                                }
                                                break;
                                            case "~":
                                                // text processor
                                                //console.log("-> text processor by " + sLineId + "\nzRegex: " + zRegex.source);
                                                sText = this.rewriteText(sText, sWhat, eAct[0], m, bUppercase);
                                                bChange = true;
                                                if (bDebug) {
                                                    console.log("~ " + sText + "  -- " + m[eAct[0]] + "  # " + sLineId);
                                                }
                                                break;
                                            case "=":
                                                // disambiguation
                                                //console.log("-> disambiguation by " + sLineId + "\nzRegex: " + zRegex.source);
                                                oEvalFunc[sWhat](sText, m, this.dTokenPos);
                                                if (bDebug) {
                                                    console.log("= " + m[0] + "  # " + sLineId, "\nDA:", this.dTokenPos);
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
                                    console.log(sText);
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
            if (bParagraph) {
                this.sText = sText;
            } else {
                this.sSentence = sText;
            }
        }
    }

    update (sSentence, bDebug=false) {
        // update <sSentence> and retokenize
        this.sSentence = sSentence;
        let lNewToken = Array.from(_oTokenizer.genTokens(sSentence, true));
        for (let oToken of lNewToken) {
            if (this.dTokenPos.gl_get(oToken["nStart"], {}).hasOwnProperty("lMorph")) {
                oToken["lMorph"] = this.dTokenPos.get(oToken["nStart"])["lMorph"];
            }
            if (this.dTokenPos.gl_get(oToken["nStart"], {}).hasOwnProperty("aTags")) {
                oToken["aTags"] = this.dTokenPos.get(oToken["nStart"])["aTags"];
            }
        }
        this.lToken = lNewToken;
        this.dTokenPos.clear();
        for (let oToken of this.lToken) {
            if (oToken["sType"] != "INFO") {
                this.dTokenPos.set(oToken["nStart"], oToken);
            }
        }
        if (bDebug) {
            console.log("UPDATE:");
            console.log(this.asString());
        }
    }

    * _getNextPointers (oToken, oGraph, oPointer, bDebug=false) {
        // generator: return nodes where <oToken> “values” match <oNode> arcs
        try {
            let oNode = oGraph[oPointer["iNode"]];
            let iToken1 = oPointer["iToken1"];
            let bTokenFound = false;
            // token value
            if (oNode.hasOwnProperty(oToken["sValue"])) {
                if (bDebug) {
                    console.log("  MATCH: " + oToken["sValue"]);
                }
                yield { "iToken1": iToken1, "iNode": oNode[oToken["sValue"]] };
                bTokenFound = true;
            }
            if (oToken["sValue"].slice(0,2).gl_isTitle()) { // we test only 2 first chars, to make valid words such as "Laissez-les", "Passe-partout".
                let sValue = oToken["sValue"].toLowerCase();
                if (oNode.hasOwnProperty(sValue)) {
                    if (bDebug) {
                        console.log("  MATCH: " + sValue);
                    }
                    yield { "iToken1": iToken1, "iNode": oNode[sValue] };
                    bTokenFound = true;
                }
            }
            else if (oToken["sValue"].gl_isUpperCase()) {
                let sValue = oToken["sValue"].toLowerCase();
                if (oNode.hasOwnProperty(sValue)) {
                    if (bDebug) {
                        console.log("  MATCH: " + sValue);
                    }
                    yield { "iToken1": iToken1, "iNode": oNode[sValue] };
                    bTokenFound = true;
                }
                sValue = oToken["sValue"].gl_toCapitalize();
                if (oNode.hasOwnProperty(sValue)) {
                    if (bDebug) {
                        console.log("  MATCH: " + sValue);
                    }
                    yield { "iToken1": iToken1, "iNode": oNode[sValue] };
                    bTokenFound = true;
                }
            }
            // regex value arcs
            if (oToken["sType"] != "INFO"  &&  oToken["sType"] != "PUNC"  &&  oToken["sType"] != "SIGN") {
                if (oNode.hasOwnProperty("<re_value>")) {
                    for (let sRegex in oNode["<re_value>"]) {
                        if (!sRegex.includes("¬")) {
                            // no anti-pattern
                            if (oToken["sValue"].search(sRegex) !== -1) {
                                if (bDebug) {
                                    console.log("  MATCH: ~" + sRegex);
                                }
                                yield { "iToken1": iToken1, "iNode": oNode["<re_value>"][sRegex] };
                                bTokenFound = true;
                            }
                        } else {
                            // there is an anti-pattern
                            let [sPattern, sNegPattern] = sRegex.split("¬", 2);
                            if (sNegPattern && oToken["sValue"].search(sNegPattern) !== -1) {
                                continue;
                            }
                            if (!sPattern || oToken["sValue"].search(sPattern) !== -1) {
                                if (bDebug) {
                                    console.log("  MATCH: ~" + sRegex);
                                }
                                yield { "iToken1": iToken1, "iNode": oNode["<re_value>"][sRegex] };
                                bTokenFound = true;
                            }
                        }
                    }
                }
            }
            // analysable tokens
            if (oToken["sType"].slice(0,4) == "WORD") {
                // token lemmas
                if (oNode.hasOwnProperty("<lemmas>")) {
                    for (let sLemma of _oSpellChecker.getLemma(oToken["sValue"])) {
                        if (oNode["<lemmas>"].hasOwnProperty(sLemma)) {
                            if (bDebug) {
                                console.log("  MATCH: >" + sLemma);
                            }
                            yield { "iToken1": iToken1, "iNode": oNode["<lemmas>"][sLemma] };
                            bTokenFound = true;
                        }
                    }
                }
                // morph arcs
                if (oNode.hasOwnProperty("<morph>")) {
                    let lMorph = (oToken.hasOwnProperty("lMorph")) ? oToken["lMorph"] : _oSpellChecker.getMorph(oToken["sValue"]);
                    if (lMorph.length > 0) {
                        for (let sSearch in oNode["<morph>"]) {
                            if (!sSearch.includes("¬")) {
                                // no anti-pattern
                                if (lMorph.some(sMorph  =>  (sMorph.includes(sSearch)))) {
                                    if (bDebug) {
                                        console.log("  MATCH: $" + sSearch);
                                    }
                                    yield { "iToken1": iToken1, "iNode": oNode["<morph>"][sSearch] };
                                    bTokenFound = true;
                                }
                            } else {
                                // there is an anti-pattern
                                let [sPattern, sNegPattern] = sSearch.split("¬", 2);
                                if (sNegPattern == "*") {
                                    // all morphologies must match with <sPattern>
                                    if (sPattern) {
                                        if (lMorph.every(sMorph  =>  (sMorph.includes(sPattern)))) {
                                            if (bDebug) {
                                                console.log("  MATCH: $" + sSearch);
                                            }
                                            yield { "iToken1": iToken1, "iNode": oNode["<morph>"][sSearch] };
                                            bTokenFound = true;
                                        }
                                    }
                                } else {
                                    if (sNegPattern  &&  lMorph.some(sMorph  =>  (sMorph.includes(sNegPattern)))) {
                                        continue;
                                    }
                                    if (!sPattern  ||  lMorph.some(sMorph  =>  (sMorph.includes(sPattern)))) {
                                        if (bDebug) {
                                            console.log("  MATCH: $" + sSearch);
                                        }
                                        yield { "iToken1": iToken1, "iNode": oNode["<morph>"][sSearch] };
                                        bTokenFound = true;
                                    }
                                }
                            }
                        }
                    }
                }
                // regex morph arcs
                if (oNode.hasOwnProperty("<re_morph>")) {
                    let lMorph = (oToken.hasOwnProperty("lMorph")) ? oToken["lMorph"] : _oSpellChecker.getMorph(oToken["sValue"]);
                    if (lMorph.length > 0) {
                        for (let sRegex in oNode["<re_morph>"]) {
                            if (!sRegex.includes("¬")) {
                                // no anti-pattern
                                if (lMorph.some(sMorph  =>  (sMorph.search(sRegex) !== -1))) {
                                    if (bDebug) {
                                        console.log("  MATCH: @" + sRegex);
                                    }
                                    yield { "iToken1": iToken1, "iNode": oNode["<re_morph>"][sRegex] };
                                    bTokenFound = true;
                                }
                            } else {
                                // there is an anti-pattern
                                let [sPattern, sNegPattern] = sRegex.split("¬", 2);
                                if (sNegPattern == "*") {
                                    // all morphologies must match with <sPattern>
                                    if (sPattern) {
                                        if (lMorph.every(sMorph  =>  (sMorph.search(sPattern) !== -1))) {
                                            if (bDebug) {
                                                console.log("  MATCH: @" + sRegex);
                                            }
                                            yield { "iToken1": iToken1, "iNode": oNode["<re_morph>"][sRegex] };
                                            bTokenFound = true;
                                        }
                                    }
                                } else {
                                    if (sNegPattern  &&  lMorph.some(sMorph  =>  (sMorph.search(sNegPattern) !== -1))) {
                                        continue;
                                    }
                                    if (!sPattern  ||  lMorph.some(sMorph  =>  (sMorph.search(sPattern) !== -1))) {
                                        if (bDebug) {
                                            console.log("  MATCH: @" + sRegex);
                                        }
                                        yield { "iToken1": iToken1, "iNode": oNode["<re_morph>"][sRegex] };
                                        bTokenFound = true;
                                    }
                                }
                            }
                        }
                    }
                }
            }
            // token tags
            if (oToken.hasOwnProperty("aTags") && oNode.hasOwnProperty("<tags>")) {
                for (let sTag of oToken["aTags"]) {
                    if (oNode["<tags>"].hasOwnProperty(sTag)) {
                        if (bDebug) {
                            console.log("  MATCH: /" + sTag);
                        }
                        yield { "iToken1": iToken1, "iNode": oNode["<tags>"][sTag] };
                        bTokenFound = true;
                    }
                }
            }
            // meta arc (for token type)
            if (oNode.hasOwnProperty("<meta>")) {
                for (let sMeta in oNode["<meta>"]) {
                    // no regex here, we just search if <oNode["sType"]> exists within <sMeta>
                    if (sMeta == "*" || oToken["sType"] == sMeta) {
                        if (bDebug) {
                            console.log("  MATCH: *" + sMeta);
                        }
                        yield { "iToken1": iToken1, "iNode": oNode["<meta>"][sMeta] };
                        bTokenFound = true;
                    }
                    else if (sMeta.includes("¬")) {
                        if (!sMeta.includes(oToken["sType"])) {
                            if (bDebug) {
                                console.log("  MATCH: *" + sMeta);
                            }
                            yield { "iToken1": iToken1, "iNode": oNode["<meta>"][sMeta] };
                            bTokenFound = true;
                        }
                    }
                }
            }
            if (!bTokenFound  &&  oPointer.hasOwnProperty("bKeep")) {
                yield oPointer;
            }
            // JUMP
            // Warning! Recurssion!
            if (oNode.hasOwnProperty("<>")) {
                let oPointer2 = { "iToken1": iToken1, "iNode": oNode["<>"], "bKeep": true };
                yield* this._getNextPointers(oToken, oGraph, oPointer2, bDebug);
            }
        }
        catch (e) {
            console.error(e);
        }
    }

    parseGraph (oGraph, sCountry="FR", dOptions=null, bShowRuleId=false, bDebug=false, bContext=false) {
        // parse graph with tokens from the text and execute actions encountered
        let lPointer = [];
        let bTagAndRewrite = false;
        try {
            for (let [iToken, oToken] of this.lToken.entries()) {
                if (bDebug) {
                    console.log("TOKEN: " + oToken["sValue"]);
                }
                // check arcs for each existing pointer
                let lNextPointer = [];
                for (let oPointer of lPointer) {
                    lNextPointer.push(...this._getNextPointers(oToken, oGraph, oPointer, bDebug));
                }
                lPointer = lNextPointer;
                // check arcs of first nodes
                lPointer.push(...this._getNextPointers(oToken, oGraph, { "iToken1": iToken, "iNode": 0 }, bDebug));
                // check if there is rules to check for each pointer
                for (let oPointer of lPointer) {
                    if (oGraph[oPointer["iNode"]].hasOwnProperty("<rules>")) {
                        let bChange = this._executeActions(oGraph, oGraph[oPointer["iNode"]]["<rules>"], oPointer["iToken1"]-1, iToken, dOptions, sCountry, bShowRuleId, bDebug, bContext);
                        if (bChange) {
                            bTagAndRewrite = true;
                        }
                    }
                }
            }
        } catch (e) {
            console.error(e);
        }
        if (bTagAndRewrite) {
            this.rewriteFromTags(bDebug);
        }
        if (bDebug) {
            console.log(this.asString());
        }
        return this.sSentence;
    }

    _executeActions (oGraph, oNode, nTokenOffset, nLastToken, dOptions, sCountry, bShowRuleId, bDebug, bContext) {
        // execute actions found in the DARG
        let bChange = false;
        for (let [sLineId, nextNodeKey] of Object.entries(oNode)) {
            let bCondMemo = null;
            for (let sRuleId of oGraph[nextNodeKey]) {
                try {
                    if (bDebug) {
                        console.log("   >TRY: " + sRuleId + " " + sLineId);
                    }
                    let [_, sOption, sFuncCond, cActionType, sWhat, ...eAct] = gc_rules_graph.dRule[sRuleId];
                    // Suggestion    [ option, condition, "-", replacement/suggestion/action, iTokenStart, iTokenEnd, cStartLimit, cEndLimit, bCaseSvty, nPriority, sMessage, iURL ]
                    // TextProcessor [ option, condition, "~", replacement/suggestion/action, iTokenStart, iTokenEnd, bCaseSvty ]
                    // Disambiguator [ option, condition, "=", replacement/suggestion/action ]
                    // Tag           [ option, condition, "/", replacement/suggestion/action, iTokenStart, iTokenEnd ]
                    // Immunity      [ option, condition, "!", "",                            iTokenStart, iTokenEnd ]
                    // Test          [ option, condition, ">", "" ]
                    if (!sOption || dOptions.gl_get(sOption, false)) {
                        bCondMemo = !sFuncCond || oEvalFunc[sFuncCond](this.lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, this.dTags, this.sSentence, this.sSentence0);
                        if (bCondMemo) {
                            if (cActionType == "-") {
                                // grammar error
                                let [iTokenStart, iTokenEnd, cStartLimit, cEndLimit, bCaseSvty, nPriority, sMessage, iURL] = eAct;
                                let nTokenErrorStart = (iTokenStart > 0) ? nTokenOffset + iTokenStart : nLastToken + iTokenStart;
                                if (!this.lToken[nTokenErrorStart].hasOwnProperty("bImmune")) {
                                    let nTokenErrorEnd = (iTokenEnd > 0) ? nTokenOffset + iTokenEnd : nLastToken + iTokenEnd;
                                    let nErrorStart = this.nOffsetWithinParagraph + ((cStartLimit == "<") ? this.lToken[nTokenErrorStart]["nStart"] : this.lToken[nTokenErrorStart]["nEnd"]);
                                    let nErrorEnd = this.nOffsetWithinParagraph + ((cEndLimit == ">") ? this.lToken[nTokenErrorEnd]["nEnd"] : this.lToken[nTokenErrorEnd]["nStart"]);
                                    if (!this.dError.has(nErrorStart) || nPriority > this.dErrorPriority.gl_get(nErrorStart, -1)) {
                                        this.dError.set(nErrorStart, this._createErrorFromTokens(sWhat, nTokenOffset, nLastToken, nTokenErrorStart, nErrorStart, nErrorEnd, sLineId, sRuleId, bCaseSvty,
                                                                                                 sMessage, gc_rules_graph.dURL[iURL], bShowRuleId, sOption, bContext));
                                        this.dErrorPriority.set(nErrorStart, nPriority);
                                        this.dSentenceError.set(nErrorStart, this.dError.get(nErrorStart));
                                        if (bDebug) {
                                            console.log("    NEW_ERROR: ",  this.dError.get(nErrorStart));
                                        }
                                    }
                                }
                            }
                            else if (cActionType == "~") {
                                // text processor
                                let nTokenStart = (eAct[0] > 0) ? nTokenOffset + eAct[0] : nLastToken + eAct[0];
                                let nTokenEnd = (eAct[1] > 0) ? nTokenOffset + eAct[1] : nLastToken + eAct[1];
                                this._tagAndPrepareTokenForRewriting(sWhat, nTokenStart, nTokenEnd, nTokenOffset, nLastToken, eAct[2], bDebug);
                                bChange = true;
                                if (bDebug) {
                                    console.log(`    TEXT_PROCESSOR: [${this.lToken[nTokenStart]["sValue"]}:${this.lToken[nTokenEnd]["sValue"]}]  > ${sWhat}`);
                                }
                            }
                            else if (cActionType == "=") {
                                // disambiguation
                                oEvalFunc[sWhat](this.lToken, nTokenOffset, nLastToken);
                                if (bDebug) {
                                    console.log(`    DISAMBIGUATOR: (${sWhat})  [${this.lToken[nTokenOffset+1]["sValue"]}:${this.lToken[nLastToken]["sValue"]}]`);
                                }
                            }
                            else if (cActionType == ">") {
                                // we do nothing, this test is just a condition to apply all following actions
                                if (bDebug) {
                                    console.log("    COND_OK");
                                }
                            }
                            else if (cActionType == "/") {
                                // Tag
                                let nTokenStart = (eAct[0] > 0) ? nTokenOffset + eAct[0] : nLastToken + eAct[0];
                                let nTokenEnd = (eAct[1] > 0) ? nTokenOffset + eAct[1] : nLastToken + eAct[1];
                                for (let i = nTokenStart; i <= nTokenEnd; i++) {
                                    if (this.lToken[i].hasOwnProperty("aTags")) {
                                        this.lToken[i]["aTags"].add(...sWhat.split("|"))
                                    } else {
                                        this.lToken[i]["aTags"] = new Set(sWhat.split("|"));
                                    }
                                }
                                if (bDebug) {
                                    console.log(`    TAG:  ${sWhat} > [${this.lToken[nTokenStart]["sValue"]}:${this.lToken[nTokenEnd]["sValue"]}]`);
                                }
                                for (let sTag of sWhat.split("|")) {
                                    if (!this.dTags.has(sTag)) {
                                        this.dTags.set(sTag, [nTokenStart, nTokenEnd]);
                                    } else {
                                        this.dTags.set(sTag, [Math.min(nTokenStart, this.dTags.get(sTag)[0]), Math.max(nTokenEnd, this.dTags.get(sTag)[1])]);
                                    }
                                }
                            }
                            else if (cActionType == "!") {
                                // immunity
                                if (bDebug) {
                                    console.log("    IMMUNITY: " + sLineId + " / " + sRuleId);
                                }
                                let nTokenStart = (eAct[0] > 0) ? nTokenOffset + eAct[0] : nLastToken + eAct[0];
                                let nTokenEnd = (eAct[1] > 0) ? nTokenOffset + eAct[1] : nLastToken + eAct[1];
                                if (nTokenEnd - nTokenStart == 0) {
                                    this.lToken[nTokenStart]["bImmune"] = true;
                                    let nErrorStart = this.nOffsetWithinParagraph + this.lToken[nTokenStart]["nStart"];
                                    if (this.dError.has(nErrorStart)) {
                                        this.dError.delete(nErrorStart);
                                    }
                                } else {
                                    for (let i = nTokenStart;  i <= nTokenEnd;  i++) {
                                        this.lToken[i]["bImmune"] = true;
                                        let nErrorStart = this.nOffsetWithinParagraph + this.lToken[i]["nStart"];
                                        if (this.dError.has(nErrorStart)) {
                                            this.dError.delete(nErrorStart);
                                        }
                                    }
                                }
                            } else {
                                console.log("# error: unknown action at " + sLineId);
                            }
                        }
                        else if (cActionType == ">") {
                            if (bDebug) {
                                console.log("    COND_BREAK");
                            }
                            break;
                        }
                    }
                }
                catch (e) {
                    console.log("Error: ", sLineId, sRuleId, this.sSentence);
                    console.error(e);
                }
            }
        }
        return bChange;
    }

    _createErrorFromRegex (sText, sText0, sSugg, nOffset, m, iGroup, sLineId, sRuleId, bCaseSvty, sMsg, sURL, bShowRuleId, sOption, bContext) {
        let nStart = nOffset + m.start[iGroup];
        let nEnd = nOffset + m.end[iGroup];
        // suggestions
        let lSugg = [];
        if (sSugg.startsWith("=")) {
            sSugg = oEvalFunc[sSugg.slice(1)](sText, m);
            lSugg = (sSugg) ? sSugg.split("|") : [];
        } else if (sSugg == "_") {
            lSugg = [];
        } else {
            lSugg = sSugg.gl_expand(m).split("|");
        }
        if (bCaseSvty && lSugg.length > 0 && m[iGroup].slice(0,1).gl_isUpperCase()) {
            lSugg = (m[iGroup].gl_isUpperCase()) ? lSugg.map((s) => s.toUpperCase()) : capitalizeArray(lSugg);
        }
        // Message
        let sMessage = (sMsg.startsWith("=")) ? oEvalFunc[sMsg.slice(1)](sText, m) : sMsg.gl_expand(m);
        if (bShowRuleId) {
            sMessage += "  #" + sLineId + " / " + sRuleId;
        }
        //
        return this._createError(nStart, nEnd, sLineId, sRuleId, sOption, sMessage, lSugg, sURL, bContext);
    }

    _createErrorFromTokens (sSugg, nTokenOffset, nLastToken, iFirstToken, nStart, nEnd, sLineId, sRuleId, bCaseSvty, sMsg, sURL, bShowRuleId, sOption, bContext) {
        // suggestions
        let lSugg = [];
        if (sSugg.startsWith("=")) {
            sSugg = oEvalFunc[sSugg.slice(1)](this.lToken, nTokenOffset, nLastToken);
            lSugg = (sSugg) ? sSugg.split("|") : [];
        } else if (sSugg == "_") {
            lSugg = [];
        } else {
            lSugg = this._expand(sSugg, nTokenOffset, nLastToken).split("|");
        }
        if (bCaseSvty && lSugg.length > 0 && this.lToken[iFirstToken]["sValue"].slice(0,1).gl_isUpperCase()) {
            lSugg = (this.sSentence.slice(nStart, nEnd).gl_isUpperCase()) ? lSugg.map((s) => s.toUpperCase()) : capitalizeArray(lSugg);
        }
        // Message
        let sMessage = (sMsg.startsWith("=")) ? oEvalFunc[sMsg.slice(1)](this.lToken, nTokenOffset, nLastToken) : this._expand(sMsg, nTokenOffset, nLastToken);
        if (bShowRuleId) {
            sMessage += "  #" + sLineId + " / " + sRuleId;
        }
        //
        return this._createError(nStart, nEnd, sLineId, sRuleId, sOption, sMessage, lSugg, sURL, bContext);
    }

    _createError (nStart, nEnd, sLineId, sRuleId, sOption, sMessage, lSugg, sURL, bContext) {
        let oErr = {
            "nStart": nStart,
            "nEnd": nEnd,
            "sLineId": sLineId,
            "sRuleId": sRuleId,
            "sType": sOption || "notype",
            "aColor": _dOptionsColors[sOption],
            "sMessage": sMessage,
            "aSuggestions": lSugg,
            "URL": sURL
        }
        if (bContext) {
            oErr['sUnderlined'] = this.sText0.slice(nStart, nEnd);
            oErr['sBefore'] = this.sText0.slice(Math.max(0,nStart-80), nStart);
            oErr['sAfter'] = this.sText0.slice(nEnd, nEnd+80);
        }
        return oErr;
    }

    _expand (sText, nTokenOffset, nLastToken) {
        let m;
        while ((m = /\\(-?[0-9]+)/.exec(sText)) !== null) {
            if (m[1].slice(0,1) == "-") {
                sText = sText.replace(m[0], this.lToken[nLastToken+parseInt(m[1],10)+1]["sValue"]);
            } else {
                sText = sText.replace(m[0], this.lToken[nTokenOffset+parseInt(m[1],10)]["sValue"]);
            }
        }
        return sText;
    }

    rewriteText (sText, sRepl, iGroup, m, bUppercase) {
        // text processor: write sRepl in sText at iGroup position"
        let ln = m.end[iGroup] - m.start[iGroup];
        let sNew = "";
        if (sRepl === "*") {
            sNew = " ".repeat(ln);
        }
        else if (sRepl === "_") {
            sNew = "_".repeat(ln);
        }
        else if (sRepl === "@") {
            sNew = "@".repeat(ln);
        }
        else if (sRepl.slice(0,1) === "=") {
            sNew = oEvalFunc[sRepl.slice(1)](sText, m);
            sNew = sNew + " ".repeat(ln-sNew.length);
            if (bUppercase && m[iGroup].slice(0,1).gl_isUpperCase()) {
                sNew = sNew.gl_toCapitalize();
            }
        } else {
            sNew = sRepl.gl_expand(m);
            sNew = sNew + " ".repeat(ln-sNew.length);
        }
        //console.log(sText+"\nstart: "+m.start[iGroup]+" end:"+m.end[iGroup]);
        return sText.slice(0, m.start[iGroup]) + sNew + sText.slice(m.end[iGroup]);
    }

    _tagAndPrepareTokenForRewriting (sWhat, nTokenRewriteStart, nTokenRewriteEnd, nTokenOffset, nLastToken, bCaseSvty, bDebug) {
        // text processor: rewrite tokens between <nTokenRewriteStart> and <nTokenRewriteEnd> position
        if (sWhat === "*") {
            // purge text
            if (nTokenRewriteEnd - nTokenRewriteStart == 0) {
                this.lToken[nTokenRewriteStart]["bToRemove"] = true;
            } else {
                for (let i = nTokenRewriteStart;  i <= nTokenRewriteEnd;  i++) {
                    this.lToken[i]["bToRemove"] = true;
                }
            }
        }
        else if (sWhat === "␣") {
            // merge tokens
            this.lToken[nTokenRewriteStart]["nMergeUntil"] = nTokenRewriteEnd;
        }
        else if (sWhat === "_") {
            // neutralized token
            if (nTokenRewriteEnd - nTokenRewriteStart == 0) {
                this.lToken[nTokenRewriteStart]["sNewValue"] = "_";
            } else {
                for (let i = nTokenRewriteStart;  i <= nTokenRewriteEnd;  i++) {
                    this.lToken[i]["sNewValue"] = "_";
                }
            }
        }
        else {
            if (sWhat.startsWith("=")) {
                sWhat = oEvalFunc[sWhat.slice(1)](this.lToken, nTokenOffset, nLastToken);
            } else {
                sWhat = this._expand(sWhat, nTokenOffset, nLastToken);
            }
            let bUppercase = bCaseSvty && this.lToken[nTokenRewriteStart]["sValue"].slice(0,1).gl_isUpperCase();
            if (nTokenRewriteEnd - nTokenRewriteStart == 0) {
                // one token
                if (bUppercase) {
                    sWhat = sWhat.gl_toCapitalize();
                }
                this.lToken[nTokenRewriteStart]["sNewValue"] = sWhat;
            }
            else {
                // several tokens
                let lTokenValue = sWhat.split("|");
                if (lTokenValue.length != (nTokenRewriteEnd - nTokenRewriteStart + 1)) {
                    if (bDebug) {
                        console.log("Error. Text processor: number of replacements != number of tokens.");
                    }
                    return;
                }
                let j = 0;
                for (let i = nTokenRewriteStart;  i <= nTokenRewriteEnd;  i++) {
                    let sValue = lTokenValue[j];
                    if (!sValue || sValue === "*") {
                        this.lToken[i]["bToRemove"] = true;
                    } else {
                        if (bUppercase) {
                            sValue = sValue.gl_toCapitalize();
                        }
                        this.lToken[i]["sNewValue"] = sValue;
                    }
                    j++;
                }
            }
        }
    }

    rewriteFromTags (bDebug=false) {
        // rewrite the sentence, modify tokens, purge the token list
        if (bDebug) {
            console.log("REWRITE");
        }
        let lNewToken = [];
        let nMergeUntil = 0;
        let oMergingToken = null;
        for (let [iToken, oToken] of this.lToken.entries()) {
            let bKeepToken = true;
            if (oToken["sType"] != "INFO") {
                if (nMergeUntil && iToken <= nMergeUntil) {
                    oMergingToken["sValue"] += " ".repeat(oToken["nStart"] - oMergingToken["nEnd"]) + oToken["sValue"];
                    oMergingToken["nEnd"] = oToken["nEnd"];
                    if (bDebug) {
                        console.log("  MERGED TOKEN: " + oMergingToken["sValue"]);
                    }
                    bKeepToken = false;
                }
                if (oToken.hasOwnProperty("nMergeUntil")) {
                    if (iToken > nMergeUntil) { // this token is not already merged with a previous token
                        oMergingToken = oToken;
                    }
                    if (oToken["nMergeUntil"] > nMergeUntil) {
                        nMergeUntil = oToken["nMergeUntil"];
                    }
                    delete oToken["nMergeUntil"];
                }
                else if (oToken.hasOwnProperty("bToRemove")) {
                    if (bDebug) {
                        console.log("  REMOVED: " + oToken["sValue"]);
                    }
                    this.sSentence = this.sSentence.slice(0, oToken["nStart"]) + " ".repeat(oToken["nEnd"] - oToken["nStart"]) + this.sSentence.slice(oToken["nEnd"]);
                    bKeepToken = false;
                }
            }
            //
            if (bKeepToken) {
                lNewToken.push(oToken);
                if (oToken.hasOwnProperty("sNewValue")) {
                    // rewrite token and sentence
                    if (bDebug) {
                        console.log(oToken["sValue"] + " -> " + oToken["sNewValue"]);
                    }
                    oToken["sRealValue"] = oToken["sValue"];
                    oToken["sValue"] = oToken["sNewValue"];
                    let nDiffLen = oToken["sRealValue"].length - oToken["sNewValue"].length;
                    let sNewRepl = (nDiffLen >= 0) ? oToken["sNewValue"] + " ".repeat(nDiffLen) : oToken["sNewValue"].slice(0, oToken["sRealValue"].length);
                    this.sSentence = this.sSentence.slice(0,oToken["nStart"]) + sNewRepl + this.sSentence.slice(oToken["nEnd"]);
                    delete oToken["sNewValue"];
                }
            }
            else {
                try {
                    this.dTokenPos.delete(oToken["nStart"]);
                }
                catch (e) {
                    console.log(this.asString());
                    console.log(oToken);
                }
            }
        }
        if (bDebug) {
            console.log("  TEXT REWRITED: " + this.sSentence);
        }
        this.lToken.length = 0;
        this.lToken = lNewToken;
    }
};


//////// Common functions

function option (sOpt) {
    // return true if option sOpt is active
    return _dOptions.get(sOpt);
}

var re = {
    search: function (sRegex, sText) {
        if (sRegex.startsWith("(?i)")) {
            return sText.search(new RegExp(sRegex.slice(4), "i")) !== -1;
        } else {
            return sText.search(sRegex) !== -1;
        }
    },

    createRegExp: function (sRegex) {
        if (sRegex.startsWith("(?i)")) {
            return new RegExp(sRegex.slice(4), "i");
        } else {
            return new RegExp(sRegex);
        }
    }
}


//////// functions to get text outside pattern scope

// warning: check compile_rules.py to understand how it works

function nextword (s, iStart, n) {
    // get the nth word of the input string or empty string
    let z = new RegExp("^(?: +[a-zà-öA-Zø-ÿÀ-Ö0-9Ø-ßĀ-ʯﬀ-ﬆᴀ-ᶿ%_-]+){" + (n-1).toString() + "} +([a-zà-öA-Zø-ÿÀ-Ö0-9Ø-ßĀ-ʯﬀ-ﬆᴀ-ᶿ%_-]+)", "ig");
    let m = z.exec(s.slice(iStart));
    if (!m) {
        return null;
    }
    return [iStart + z.lastIndex - m[1].length, m[1]];
}

function prevword (s, iEnd, n) {
    // get the (-)nth word of the input string or empty string
    let z = new RegExp("([a-zà-öA-Zø-ÿÀ-Ö0-9Ø-ßĀ-ʯﬀ-ﬆᴀ-ᶿ%_-]+) +(?:[a-zà-öA-Zø-ÿÀ-Ö0-9Ø-ßĀ-ʯﬀ-ﬆᴀ-ᶿ%_-]+ +){" + (n-1).toString() + "}$", "i");
    let m = z.exec(s.slice(0, iEnd));
    if (!m) {
        return null;
    }
    return [m.index, m[1]];
}

function nextword1 (s, iStart) {
    // get next word (optimization)
    let _zNextWord = new RegExp ("^ +([a-zà-öA-Zø-ÿÀ-Ö0-9Ø-ßĀ-ʯﬀ-ﬆᴀ-ᶿ_][a-zà-öA-Zø-ÿÀ-Ö0-9Ø-ßĀ-ʯﬀ-ﬆᴀ-ᶿ_-]*)", "ig");
    let m = _zNextWord.exec(s.slice(iStart));
    if (!m) {
        return null;
    }
    return [iStart + _zNextWord.lastIndex - m[1].length, m[1]];
}

const _zPrevWord = new RegExp ("([a-zà-öA-Zø-ÿÀ-Ö0-9Ø-ßĀ-ʯﬀ-ﬆᴀ-ᶿ_][a-zà-öA-Zø-ÿÀ-Ö0-9Ø-ßĀ-ʯﬀ-ﬆᴀ-ᶿ_-]*) +$", "i");

function prevword1 (s, iEnd) {
    // get previous word (optimization)
    let m = _zPrevWord.exec(s.slice(0, iEnd));
    if (!m) {
        return null;
    }
    return [m.index, m[1]];
}

function look (s, sPattern, sNegPattern=null) {
    // seek sPattern in s (before/after/fulltext), if antipattern sNegPattern not in s
    try {
        if (sNegPattern && re.search(sNegPattern, s)) {
            return false;
        }
        return re.search(sPattern, s);
    }
    catch (e) {
        console.error(e);
    }
    return false;
}


//////// Analyse groups for regex rules

function displayInfo (dTokenPos, aWord) {
    // for debugging: info of word
    if (!aWord) {
        console.log("> nothing to find");
        return true;
    }
    let lMorph = _oSpellChecker.getMorph(aWord[1]);
    if (lMorph.length === 0) {
        console.log("> not in dictionary");
        return true;
    }
    if (dTokenPos.has(aWord[0])) {
        console.log("DA: " + dTokenPos.get(aWord[0]));
    }
    console.log("FSA: " + lMorph);
    return true;
}

function morph (dTokenPos, aWord, sPattern, sNegPattern, bNoWord=false) {
    // analyse a tuple (position, word), returns true if not sNegPattern in word morphologies and sPattern in word morphologies (disambiguation on)
    if (!aWord) {
        return bNoWord;
    }
    let lMorph = (dTokenPos.has(aWord[0])  &&  dTokenPos.get(aWord[0]))["lMorph"] ? dTokenPos.get(aWord[0])["lMorph"] : _oSpellChecker.getMorph(aWord[1]);
    if (lMorph.length === 0) {
        return false;
    }
    if (sNegPattern) {
        // check negative condition
        if (sNegPattern === "*") {
            // all morph must match sPattern
            return lMorph.every(sMorph  =>  (sMorph.search(sPattern) !== -1));
        }
        else {
            if (lMorph.some(sMorph  =>  (sMorph.search(sNegPattern) !== -1))) {
                return false;
            }
        }
    }
    // search sPattern
    return lMorph.some(sMorph  =>  (sMorph.search(sPattern) !== -1));
}

function analyse (sWord, sPattern, sNegPattern) {
    // analyse a word, returns True if not sNegPattern in word morphologies and sPattern in word morphologies (disambiguation off)
    let lMorph = _oSpellChecker.getMorph(sWord);
    if (lMorph.length === 0) {
        return false;
    }
    if (sNegPattern) {
        // check negative condition
        if (sNegPattern === "*") {
            // all morph must match sPattern
            return lMorph.every(sMorph  =>  (sMorph.search(sPattern) !== -1));
        }
        else {
            if (lMorph.some(sMorph  =>  (sMorph.search(sNegPattern) !== -1))) {
                return false;
            }
        }
    }
    // search sPattern
    return lMorph.some(sMorph  =>  (sMorph.search(sPattern) !== -1));
}


//// Analyse tokens for graph rules

function g_value (oToken, sValues, nLeft=null, nRight=null) {
    // test if <oToken['sValue']> is in sValues (each value should be separated with |)
    let sValue = (nLeft === null) ? "|"+oToken["sValue"]+"|" : "|"+oToken["sValue"].slice(nLeft, nRight)+"|";
    if (sValues.includes(sValue)) {
        return true;
    }
    if (oToken["sValue"].slice(0,2).gl_isTitle()) { // we test only 2 first chars, to make valid words such as "Laissez-les", "Passe-partout".
        if (sValues.includes(sValue.toLowerCase())) {
            return true;
        }
    }
    else if (oToken["sValue"].gl_isUpperCase()) {
        //if sValue.lower() in sValues:
        //    return true;
        sValue = "|"+sValue.slice(1).gl_toCapitalize();
        if (sValues.includes(sValue)) {
            return true;
        }
        sValue = sValue.toLowerCase();
        if (sValues.includes(sValue)) {
            return true;
        }
    }
    return false;
}

function g_morph (oToken, sPattern, sNegPattern="", nLeft=null, nRight=null, bMemorizeMorph=true) {
    // analyse a token, return True if <sNegPattern> not in morphologies and <sPattern> in morphologies
    let lMorph;
    if (oToken.hasOwnProperty("lMorph")) {
        lMorph = oToken["lMorph"];
    }
    else {
        if (nLeft !== null) {
            let sValue = (nRight !== null) ? oToken["sValue"].slice(nLeft, nRight) : oToken["sValue"].slice(nLeft);
            lMorph = _oSpellChecker.getMorph(sValue);
            if (bMemorizeMorph) {
                oToken["lMorph"] = lMorph;
            }
        } else {
            lMorph = _oSpellChecker.getMorph(oToken["sValue"]);
        }
    }
    if (lMorph.length == 0) {
        return false;
    }
    // check negative condition
    if (sNegPattern) {
        if (sNegPattern == "*") {
            // all morph must match sPattern
            return lMorph.every(sMorph  =>  (sMorph.search(sPattern) !== -1));
        }
        else {
            if (lMorph.some(sMorph  =>  (sMorph.search(sNegPattern) !== -1))) {
                return false;
            }
        }
    }
    // search sPattern
    return lMorph.some(sMorph  =>  (sMorph.search(sPattern) !== -1));
}

function g_analyse (oToken, sPattern, sNegPattern="", nLeft=null, nRight=null, bMemorizeMorph=true) {
    // analyse a token, return True if <sNegPattern> not in morphologies and <sPattern> in morphologies
    let lMorph;
    if (nLeft !== null) {
        let sValue = (nRight !== null) ? oToken["sValue"].slice(nLeft, nRight) : oToken["sValue"].slice(nLeft);
        lMorph = _oSpellChecker.getMorph(sValue);
        if (bMemorizeMorph) {
            oToken["lMorph"] = lMorph;
        }
    } else {
        lMorph = _oSpellChecker.getMorph(oToken["sValue"]);
    }
    if (lMorph.length == 0) {
        return false;
    }
    // check negative condition
    if (sNegPattern) {
        if (sNegPattern == "*") {
            // all morph must match sPattern
            return lMorph.every(sMorph  =>  (sMorph.search(sPattern) !== -1));
        }
        else {
            if (lMorph.some(sMorph  =>  (sMorph.search(sNegPattern) !== -1))) {
                return false;
            }
        }
    }
    // search sPattern
    return lMorph.some(sMorph  =>  (sMorph.search(sPattern) !== -1));
}

function g_merged_analyse (oToken1, oToken2, cMerger, sPattern, sNegPattern="", bSetMorph=true) {
    // merge two token values, return True if <sNegPattern> not in morphologies and <sPattern> in morphologies (disambiguation off)
    let lMorph = _oSpellChecker.getMorph(oToken1["sValue"] + cMerger + oToken2["sValue"]);
    if (lMorph.length == 0) {
        return false;
    }
    // check negative condition
    if (sNegPattern) {
        if (sNegPattern == "*") {
            // all morph must match sPattern
            let bResult = lMorph.every(sMorph  =>  (sMorph.search(sPattern) !== -1));
            if (bResult && bSetMorph) {
                oToken1["lMorph"] = lMorph;
            }
            return bResult;
        }
        else {
            if (lMorph.some(sMorph  =>  (sMorph.search(sNegPattern) !== -1))) {
                return false;
            }
        }
    }
    // search sPattern
    let bResult = lMorph.some(sMorph  =>  (sMorph.search(sPattern) !== -1));
    if (bResult && bSetMorph) {
        oToken1["lMorph"] = lMorph;
    }
    return bResult;
}

function g_tag_before (oToken, dTags, sTag) {
    if (!dTags.has(sTag)) {
        return false;
    }
    if (oToken["i"] > dTags.get(sTag)[0]) {
        return true;
    }
    return false;
}

function g_tag_after (oToken, dTags, sTag) {
    if (!dTags.has(sTag)) {
        return false;
    }
    if (oToken["i"] < dTags.get(sTag)[1]) {
        return true;
    }
    return false;
}

function g_tag (oToken, sTag) {
    return oToken.hasOwnProperty("aTags") && oToken["aTags"].has(sTag);
}

function g_space_between_tokens (oToken1, oToken2, nMin, nMax=null) {
    let nSpace = oToken2["nStart"] - oToken1["nEnd"]
    if (nSpace < nMin) {
        return false;
    }
    if (nMax !== null && nSpace > nMax) {
        return false;
    }
    return true;
}

function g_token (lToken, i) {
    if (i < 0) {
        return lToken[0];
    }
    if (i >= lToken.length) {
        return lToken[lToken.length-1];
    }
    return lToken[i];
}


//////// Disambiguator

function select (dTokenPos, nPos, sWord, sPattern, lDefault=null) {
    if (!sWord) {
        return true;
    }
    if (!dTokenPos.has(nPos)) {
        console.log("Error. There should be a token at this position: ", nPos);
        return true;
    }
    let lMorph = _oSpellChecker.getMorph(sWord);
    if (lMorph.length === 0  ||  lMorph.length === 1) {
        return true;
    }
    let lSelect = lMorph.filter( sMorph => sMorph.search(sPattern) !== -1 );
    if (lSelect.length > 0) {
        if (lSelect.length != lMorph.length) {
            dTokenPos.get(nPos)["lMorph"] = lSelect;
        }
    } else if (lDefault) {
        dTokenPos.get(nPos)["lMorph"] = lDefault;
    }
    return true;
}

function exclude (dTokenPos, nPos, sWord, sPattern, lDefault=null) {
    if (!sWord) {
        return true;
    }
    if (!dTokenPos.has(nPos)) {
        console.log("Error. There should be a token at this position: ", nPos);
        return true;
    }
    let lMorph = _oSpellChecker.getMorph(sWord);
    if (lMorph.length === 0  ||  lMorph.length === 1) {
        return true;
    }
    let lSelect = lMorph.filter( sMorph => sMorph.search(sPattern) === -1 );
    if (lSelect.length > 0) {
        if (lSelect.length != lMorph.length) {
            dTokenPos.get(nPos)["lMorph"] = lSelect;
        }
    } else if (lDefault) {
        dTokenPos.get(nPos)["lMorph"] = lDefault;
    }
    return true;
}

function define (dTokenPos, nPos, sMorphs) {
    dTokenPos.get(nPos)["lMorph"] = sMorphs.split("|");
    return true;
}


//// Disambiguation for graph rules

function g_select (oToken, sPattern, lDefault=null) {
    // select morphologies for <oToken> according to <sPattern>, always return true
    let lMorph = (oToken.hasOwnProperty("lMorph")) ? oToken["lMorph"] : _oSpellChecker.getMorph(oToken["sValue"]);
    if (lMorph.length === 0  || lMorph.length === 1) {
        if (lDefault) {
            oToken["lMorph"] = lDefault;
        }
        return true;
    }
    let lSelect = lMorph.filter( sMorph => sMorph.search(sPattern) !== -1 );
    if (lSelect.length > 0) {
        if (lSelect.length != lMorph.length) {
            oToken["lMorph"] = lSelect;
        }
    } else if (lDefault) {
        oToken["lMorph"] = lDefault;
    }
    return true;
}

function g_exclude (oToken, sPattern, lDefault=null) {
    // select morphologies for <oToken> according to <sPattern>, always return true
    let lMorph = (oToken.hasOwnProperty("lMorph")) ? oToken["lMorph"] : _oSpellChecker.getMorph(oToken["sValue"]);
    if (lMorph.length === 0  || lMorph.length === 1) {
        if (lDefault) {
            oToken["lMorph"] = lDefault;
        }
        return true;
    }
    let lSelect = lMorph.filter( sMorph => sMorph.search(sPattern) === -1 );
    if (lSelect.length > 0) {
        if (lSelect.length != lMorph.length) {
            oToken["lMorph"] = lSelect;
        }
    } else if (lDefault) {
        oToken["lMorph"] = lDefault;
    }
    return true;
}

function g_add_morph (oToken, sNewMorph) {
    // Disambiguation: add a morphology to a token
    let lMorph = (oToken.hasOwnProperty("lMorph")) ? oToken["lMorph"] : _oSpellChecker.getMorph(oToken["sValue"]);
    lMorph.push(...sNewMorph.split("|"));
    oToken["lMorph"] = lMorph;
    return true;
}

function g_rewrite (oToken, sToReplace, sReplace) {
    // Disambiguation: rewrite morphologies
    let lMorph = (oToken.hasOwnProperty("lMorph")) ? oToken["lMorph"] : _oSpellChecker.getMorph(oToken["sValue"]);
    oToken["lMorph"] = lMorph.map(s => s.replace(sToReplace, sReplace));
    return true;
}

function g_define (oToken, sMorphs) {
    // set morphologies of <oToken>, always return true
    oToken["lMorph"] = sMorphs.split("|");
    return true;
}

function g_define_from (oToken, nLeft=null, nRight=null) {
    let sValue = oToken["sValue"];
    if (nLeft !== null) {
        sValue = (nRight !== null) ? sValue.slice(nLeft, nRight) : sValue.slice(nLeft);
    }
    oToken["lMorph"] = _oSpellChecker.getMorph(sValue);
    return true;
}

function g_change_meta (oToken, sType) {
    // Disambiguation: change type of token
    oToken["sType"] = sType;
    return true;
}



//////// GRAMMAR CHECKER PLUGINS



// GRAMMAR CHECKING ENGINE PLUGIN: Parsing functions for French language

/* jshint esversion:6 */
/* jslint esversion:6 */

function g_morphVC (oToken, sPattern, sNegPattern="") {
    let nEnd = oToken["sValue"].lastIndexOf("-");
    if (oToken["sValue"].gl_count("-") > 1) {
        if (oToken["sValue"].includes("-t-")) {
            nEnd = nEnd - 2;
        }
        else if (oToken["sValue"].search(/-l(?:es?|a)-(?:[mt]oi|nous|leur)$|(?:[nv]ous|lui|leur)-en$/) != -1) {
            nEnd = oToken["sValue"].slice(0,nEnd).lastIndexOf("-");
        }
    }
    return g_morph(oToken, sPattern, sNegPattern, 0, nEnd, false);
}

function apposition (sWord1, sWord2) {
    // returns true if nom + nom (no agreement required)
    return sWord2.length < 2 || (cregex.mbNomNotAdj(_oSpellChecker.getMorph(sWord2)) && cregex.mbPpasNomNotAdj(_oSpellChecker.getMorph(sWord1)));
}

function g_checkAgreement (oToken1, oToken2, bNotOnlyNames=true) {
    // check agreement between <oToken1> and <oToken2>
    let lMorph1 = oToken1.hasOwnProperty("lMorph") ? oToken1["lMorph"] : _oSpellChecker.getMorph(oToken1["sValue"]);
    if (lMorph1.length === 0) {
        return true;
    }
    let lMorph2 = oToken2.hasOwnProperty("lMorph") ? oToken2["lMorph"] : _oSpellChecker.getMorph(oToken2["sValue"]);
    if (lMorph2.length === 0) {
        return true;
    }
    if (bNotOnlyNames && !(cregex.mbAdj(lMorph2) || cregex.mbAdjNb(lMorph1))) {
        return false;
    }
    return cregex.checkAgreement(lMorph1, lMorph2);
}

function checkAgreement (sWord1, sWord2) {
    let lMorph2 = _oSpellChecker.getMorph(sWord2);
    if (lMorph2.length === 0) {
        return true;
    }
    let lMorph1 = _oSpellChecker.getMorph(sWord1);
    if (lMorph1.length === 0) {
        return true;
    }
    return cregex.checkAgreement(lMorph1, lMorph2);
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


// GRAMMAR CHECKING ENGINE PLUGIN

// Check date validity
// WARNING: when creating a Date, month must be between 0 and 11

/* jshint esversion:6 */
/* jslint esversion:6 */


const _lDay = ["dimanche", "lundi", "mardi", "mercredi", "jeudi", "vendredi", "samedi"];
const _dMonth = new Map ([
    ["janvier", 1], ["février", 2], ["mars", 3], ["avril", 4], ["mai", 5], ["juin", 6], ["juillet", 7],
    ["août", 8], ["aout", 8], ["septembre", 9], ["octobre", 10], ["novembre", 11], ["décembre", 12]
]);
const _dDaysInMonth = new Map ([
    [1, 31], [2, 28], [3, 31], [4, 30], [5, 31], [6, 30], [7, 31],
    [8, 31], [8, 31], [9, 30], [10, 31], [11, 30], [12, 31]
]);

// Dans Python, datetime.weekday() envoie le résultat comme si nous étions dans un calendrier grégorien universal.
// https://fr.wikipedia.org/wiki/Passage_du_calendrier_julien_au_calendrier_gr%C3%A9gorien
// Selon Grégoire, le jeudi 4 octobre 1582 est immédiatement suivi par le vendredi 15 octobre.
// En France, la bascule eut lieu le 9 décembre 1582 qui fut suivi par le 20 décembre 1582.
// C’est la date retenue pour la bascule dans Grammalecte, mais le calendrier grégorien fut adopté dans le monde diversement.
// Il fallut des siècles pour qu’il soit adopté par l’Occident et une grande partie du reste du monde.
const _dGregorianToJulian = new Map ([
    ["lundi",    "jeudi"],
    ["mardi",    "vendredi"],
    ["mercredi", "samedi"],
    ["jeudi",    "dimanche"],
    ["vendredi", "lundi"],
    ["samedi",   "mardi"],
    ["dimanche", "mercredi"]
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
    // return True if the date is valid
    if (!sMonth.gl_isDigit()) {
        sMonth = _dMonth.get(sMonth.toLowerCase());
    }
    if (_checkDate(parseInt(sDay, 10), parseInt(sMonth, 10), parseInt(sYear, 10))) {
        return new Date(parseInt(sYear, 10), parseInt(sMonth, 10)-1, parseInt(sDay, 10));
    }
    return false;
}

function checkDay (sWeekday, sDay, sMonth, sYear) {
    // return True if sWeekday is valid according to the given date
    let xDate = checkDate(sDay, sMonth, sYear);
    if (xDate  &&  _getDay(xDate) != sWeekday.toLowerCase()) {
        return false;
    }
    // if the date isn’t valid, any day is valid.
    return true;
}

function getDay (sDay, sMonth, sYear) {
    // return the day of the date (in Gregorian calendar after 1582-12-20, in Julian calendar before 1582-12-09)
    let xDate = checkDate(sDay, sMonth, sYear);
    if (xDate) {
        return _getDay(xDate);
    }
    return ""
}

function _getDay (xDate) {
    // return the day of the date (in Gregorian calendar after 1582-12-20, in Julian calendar before 1582-12-09)
    if (xDate.getFullYear() > 1582) {
        // Calendrier grégorien
        return _lDay[xDate.getDay()];
    }
    if (xDate.getFullYear() < 1582) {
        // Calendrier julien
        let sGregorianDay = _lDay[xDate.getDay()];
        return _dGregorianToJulian.get(sGregorianDay, "Erreur: jour inconnu")
    }
    // 1582
    if ((xDate.getMonth()+1) < 12  || xDate.getDate() <= 9) {
        // Calendrier julien
        let sGregorianDay = _lDay[xDate.getDay()];
        return _dGregorianToJulian.get(sGregorianDay, "Erreur: jour inconnu");
    }
    else if (xDate.getDate() >= 20) {
        // Calendrier grégorien
        return _lDay[xDate.getDay()];
    }
    else {
        // 10 - 19 décembre 1582: jours inexistants en France.
        return "";
    }
}


// GRAMMAR CHECKING ENGINE PLUGIN: Suggestion mechanisms

/* jshint esversion:6 */
/* jslint esversion:6 */
/* global require */

if(typeof(process) !== 'undefined') {
    var conj = require("./conj.js");
    var mfsp = require("./mfsp.js");
    var phonet = require("./phonet.js");
} else if (typeof(require) !== 'undefined') {
    var conj = require("resource://grammalecte/fr/conj.js");
    var mfsp = require("resource://grammalecte/fr/mfsp.js");
    var phonet = require("resource://grammalecte/fr/phonet.js");
}


//// verbs

function splitVerb (sVerb) {
    // renvoie le verbe et les pronoms séparément
    let iRight = sVerb.lastIndexOf("-");
    let sSuffix = sVerb.slice(iRight);
    sVerb = sVerb.slice(0, iRight);
    if (sVerb.endsWith("-t") || sVerb.endsWith("-le") || sVerb.endsWith("-la") || sVerb.endsWith("-les")) {
        iRight = sVerb.lastIndexOf("-");
        sSuffix = sVerb.slice(iRight) + sSuffix;
        sVerb = sVerb.slice(0, iRight);
    }
    return [sVerb, sSuffix];
}

function suggVerb (sFlex, sWho, funcSugg2=null, bVC=false) {
    let sSfx;
    if (bVC) {
        [sFlex, sSfx] = splitVerb(sFlex);
    }
    let aSugg = new Set();
    for (let sStem of _oSpellChecker.getLemma(sFlex)) {
        let tTags = conj._getTags(sStem);
        if (tTags) {
            // we get the tense
            let aTense = new Set();
            for (let sMorph of _oSpellChecker.getMorph(sFlex)) {
                let m;
                let zVerb = new RegExp (">"+sStem+"/.*?(:(?:Y|I[pqsf]|S[pq]|K|P|Q))", "g");
                while ((m = zVerb.exec(sMorph)) !== null) {
                    // stem must be used in regex to prevent confusion between different verbs (e.g. sauras has 2 stems: savoir and saurer)
                    if (m) {
                        if (m[1] === ":Y" || m[1] == ":Q") {
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
        if (bVC) {
            return Array.from(aSugg).map((sSugg) => { return sSugg + sSfx; }).join("|");
        }
        return Array.from(aSugg).join("|");
    }
    return "";
}

function suggVerbPpas (sFlex, sWhat=null) {
    let aSugg = new Set();
    for (let sStem of _oSpellChecker.getLemma(sFlex)) {
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
    for (let sStem of _oSpellChecker.getLemma(sFlex)) {
        if (conj.hasConj(sStem, sTense, sWho)) {
            aSugg.add(conj.getConj(sStem, sTense, sWho));
        }
    }
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}

function suggVerbImpe (sFlex, bVC=false) {
    let sSfx;
    if (bVC) {
        [sFlex, sSfx] = splitVerb(sFlex);
    }
    let aSugg = new Set();
    for (let sStem of _oSpellChecker.getLemma(sFlex)) {
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
        if (bVC) {
            return Array.from(aSugg).map((sSugg) => { return sSugg + sSfx; }).join("|");
        }
        return Array.from(aSugg).join("|");
    }
    return "";
}

function suggVerbInfi (sFlex) {
    return _oSpellChecker.getLemma(sFlex).filter(sStem => conj.isVerb(sStem)).join("|");
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
    for (let sStem of _oSpellChecker.getLemma(sFlex)) {
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

function suggPlur (sFlex, sWordToAgree=null, bSelfSugg=false) {
    // returns plural forms assuming sFlex is singular
    if (sWordToAgree) {
        let lMorph = _oSpellChecker.getMorph(sWordToAgree);
        if (lMorph.length === 0) {
            return "";
        }
        let sGender = cregex.getGender(lMorph);
        if (sGender == ":m") {
            return suggMasPlur(sFlex);
        } else if (sGender == ":f") {
            return suggFemPlur(sFlex);
        }
    }
    let aSugg = new Set();
    if (sFlex.endsWith("l")) {
        if (sFlex.endsWith("al") && sFlex.length > 2 && _oSpellChecker.isValid(sFlex.slice(0,-1)+"ux")) {
            aSugg.add(sFlex.slice(0,-1)+"ux");
        }
        if (sFlex.endsWith("ail") && sFlex.length > 3 && _oSpellChecker.isValid(sFlex.slice(0,-2)+"ux")) {
            aSugg.add(sFlex.slice(0,-2)+"ux");
        }
    }
    if (sFlex.endsWith("L")) {
        if (sFlex.endsWith("AL") && sFlex.length > 2 && _oSpellChecker.isValid(sFlex.slice(0,-1)+"UX")) {
            aSugg.add(sFlex.slice(0,-1)+"UX");
        }
        if (sFlex.endsWith("AIL") && sFlex.length > 3 && _oSpellChecker.isValid(sFlex.slice(0,-2)+"UX")) {
            aSugg.add(sFlex.slice(0,-2)+"UX");
        }
    }
    if (sFlex.slice(-1).gl_isLowerCase()) {
        if (_oSpellChecker.isValid(sFlex+"s")) {
            aSugg.add(sFlex+"s");
        }
        if (_oSpellChecker.isValid(sFlex+"x")) {
            aSugg.add(sFlex+"x");
        }
    } else {
        if (_oSpellChecker.isValid(sFlex+"S")) {
            aSugg.add(sFlex+"s");
        }
        if (_oSpellChecker.isValid(sFlex+"X")) {
            aSugg.add(sFlex+"x");
        }
    }
    if (mfsp.hasMiscPlural(sFlex)) {
        mfsp.getMiscPlural(sFlex).forEach(function(x) { aSugg.add(x); });
    }
    if (aSugg.size == 0 && bSelfSugg && (sFlex.endsWith("s") || sFlex.endsWith("x") || sFlex.endsWith("S") || sFlex.endsWith("X"))) {
        aSugg.add(sFlex);
    }
    aSugg.delete("");
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}

function suggSing (sFlex, bSelfSugg=false) {
    // returns singular forms assuming sFlex is plural
    let aSugg = new Set();
    if (sFlex.endsWith("ux")) {
        if (_oSpellChecker.isValid(sFlex.slice(0,-2)+"l")) {
            aSugg.add(sFlex.slice(0,-2)+"l");
        }
        if (_oSpellChecker.isValid(sFlex.slice(0,-2)+"il")) {
            aSugg.add(sFlex.slice(0,-2)+"il");
        }
    }
    if (sFlex.endsWith("UX")) {
        if (_oSpellChecker.isValid(sFlex.slice(0,-2)+"L")) {
            aSugg.add(sFlex.slice(0,-2)+"L");
        }
        if (_oSpellChecker.isValid(sFlex.slice(0,-2)+"IL")) {
            aSugg.add(sFlex.slice(0,-2)+"IL");
        }
    }
    if ((sFlex.endsWith("s") || sFlex.endsWith("x") || sFlex.endsWith("S") || sFlex.endsWith("X")) && _oSpellChecker.isValid(sFlex.slice(0,-1))) {
        aSugg.add(sFlex.slice(0,-1));
    }
    if (bSelfSugg && aSugg.size == 0) {
        aSugg.add(sFlex);
    }
    aSugg.delete("");
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}

function suggMasSing (sFlex, bSuggSimil=false) {
    // returns masculine singular forms
    let aSugg = new Set();
    for (let sMorph of _oSpellChecker.getMorph(sFlex)) {
        if (!sMorph.includes(":V")) {
            // not a verb
            if (sMorph.includes(":m") || sMorph.includes(":e")) {
                aSugg.add(suggSing(sFlex));
            } else {
                let sStem = cregex.getLemmaOfMorph(sMorph);
                if (mfsp.isMasForm(sStem)) {
                    aSugg.add(sStem);
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
    aSugg.delete("");
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}

function suggMasPlur (sFlex, bSuggSimil=false) {
    // returns masculine plural forms
    let aSugg = new Set();
    for (let sMorph of _oSpellChecker.getMorph(sFlex)) {
        if (!sMorph.includes(":V")) {
            // not a verb
            if (sMorph.includes(":m") || sMorph.includes(":e")) {
                aSugg.add(suggPlur(sFlex));
            } else {
                let sStem = cregex.getLemmaOfMorph(sMorph);
                if (mfsp.isMasForm(sStem)) {
                    aSugg.add(suggPlur(sStem));
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
    aSugg.delete("");
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}


function suggFemSing (sFlex, bSuggSimil=false) {
    // returns feminine singular forms
    let aSugg = new Set();
    for (let sMorph of _oSpellChecker.getMorph(sFlex)) {
        if (!sMorph.includes(":V")) {
            // not a verb
            if (sMorph.includes(":f") || sMorph.includes(":e")) {
                aSugg.add(suggSing(sFlex));
            } else {
                let sStem = cregex.getLemmaOfMorph(sMorph);
                if (mfsp.isMasForm(sStem)) {
                    mfsp.getFemForm(sStem, false).forEach(function(x) { aSugg.add(x); });
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
    aSugg.delete("");
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}

function suggFemPlur (sFlex, bSuggSimil=false) {
    // returns feminine plural forms
    let aSugg = new Set();
    for (let sMorph of _oSpellChecker.getMorph(sFlex)) {
        if (!sMorph.includes(":V")) {
            // not a verb
            if (sMorph.includes(":f") || sMorph.includes(":e")) {
                aSugg.add(suggPlur(sFlex));
            } else {
                let sStem = cregex.getLemmaOfMorph(sMorph);
                if (mfsp.isMasForm(sStem)) {
                    mfsp.getFemForm(sStem, true).forEach(function(x) { aSugg.add(x); });
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
    aSugg.delete("");
    if (aSugg.size > 0) {
        return Array.from(aSugg).join("|");
    }
    return "";
}

function hasFemForm (sFlex) {
    for (let sStem of _oSpellChecker.getLemma(sFlex)) {
        if (mfsp.isMasForm(sStem) || conj.hasConj(sStem, ":PQ", ":Q3")) {
            return true;
        }
    }
    if (phonet.hasSimil(sFlex, ":f")) {
        return true;
    }
    return false;
}

function hasMasForm (sFlex) {
    for (let sStem of _oSpellChecker.getLemma(sFlex)) {
        if (mfsp.isMasForm(sStem) || conj.hasConj(sStem, ":PQ", ":Q1")) {
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
    let aSugg = new Set();
    if (bPlur === null) {
        for (let sMorph of _oSpellChecker.getMorph(sFlex)) {
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
        for (let sMorph of _oSpellChecker.getMorph(sFlex)) {
            if (sMorph.includes(":f")) {
                aSugg.add(suggMasPlur(sFlex));
            } else if (sMorph.includes(":m")) {
                aSugg.add(suggFemPlur(sFlex));
            }
        }
    } else {
        for (let sMorph of _oSpellChecker.getMorph(sFlex)) {
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
    for (let sMorph of _oSpellChecker.getMorph(sFlex)) {
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

function suggSimil (sWord, sPattern=null, bSubst=false, bVC=false) {
    // return list of words phonetically similar to sWord and whom POS is matching sPattern
    let sSfx;
    if (bVC) {
        [sWord, sSfx] = splitVerb(sWord);
    }
    let aSugg = phonet.selectSimil(sWord, sPattern);
    if (aSugg.size === 0 || !bSubst) {
        for (let sMorph of _oSpellChecker.getMorph(sWord)) {
            for (let e of conj.getSimil(sWord, sMorph, bSubst)) {
                aSugg.add(e);
            }
        }
    }
    if (aSugg.size > 0) {
        if (bVC) {
            return Array.from(aSugg).map((sSugg) => { return sSugg + sSfx; }).join("|");
        }
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
    if (_oSpellChecker.getMorph(sWord).some(s  =>  s.includes(":p"))) {
        return "les|la";
    }
    return "la";
}

function formatNumber (sNumber) {
    let nLen = sNumber.length;
    if (nLen < 4 ) {
        return sNumber;
    }
    let sRes = "";
    if (!sNumber.includes(",")) {
        // Nombre entier
        sRes = _formatNumber(sNumber, 3);
        // binaire
        if (/^[01]+$/.test(sNumber)) {
            sRes += "|" + _formatNumber(sNumber, 4);
        }
        // numéros de téléphone
        if (nLen == 10) {
            if (sNumber.startsWith("0")) {
                sRes += "|" + _formatNumber(sNumber, 2);                                                                           // téléphone français
                if (sNumber[1] == "4" && (sNumber[2]=="7" || sNumber[2]=="8" || sNumber[2]=="9")) {
                    sRes += "|" + sNumber.slice(0,4) + " " + sNumber.slice(4,6) + " " + sNumber.slice(6,8) + " " + sNumber.slice(8); // mobile belge
                }
                sRes += "|" + sNumber.slice(0,3) + " " + sNumber.slice(3,6) + " " + sNumber.slice(6,8) + " " + sNumber.slice(8);     // téléphone suisse
            }
            sRes += "|" + sNumber.slice(0,4) + " " + sNumber.slice(4,7) + "-" + sNumber.slice(7);                                   // téléphone canadien ou américain
        } else if (nLen == 9 && sNumber.startsWith("0")) {
            sRes += "|" + sNumber.slice(0,3) + " " + sNumber.slice(3,5) + " " + sNumber.slice(5,7) + " " + sNumber.slice(7,9);       // fixe belge 1
            sRes += "|" + sNumber.slice(0,2) + " " + sNumber.slice(2,5) + " " + sNumber.slice(5,7) + " " + sNumber.slice(7,9);       // fixe belge 2
        }
    } else {
        // Nombre réel
        let [sInt, sFloat] = sNumber.split(",", 2);
        sRes = _formatNumber(sInt, 3) + "," + sFloat;
    }
    return sRes;
}

function _formatNumber (sNumber, nGroup=3) {
    let sRes = "";
    let nEnd = sNumber.length;
    while (nEnd > 0) {
        let nStart = Math.max(nEnd-nGroup, 0);
        sRes = sRes ? sNumber.slice(nStart, nEnd) + " " + sRes : sRes = sNumber.slice(nStart, nEnd);
        nEnd = nEnd - nGroup;
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
    ['.', '_'],  ['·', '_'],  ['•', '_'],
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
    // callables for regex rules
    _c_esp_avant_après_tiret_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! m[1].endsWith("-t") && m[3] != "t" && ! (m[2] == " -" && m[3].gl_isDigit());
    },
    _c_esp_avant_après_tiret_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return (m[3] == "je" && morph(dTokenPos, [m.start[1], m[1]], ":1s")) || (m[3] == "tu" && morph(dTokenPos, [m.start[1], m[1]], ":2s")) || (m[3] == "il" && morph(dTokenPos, [m.start[1], m[1]], ":3s")) || (m[3] == "elle" && morph(dTokenPos, [m.start[1], m[1]], ":3s")) || (m[3] == "on" && morph(dTokenPos, [m.start[1], m[1]], ":3s")) || (m[3] == "nous" && morph(dTokenPos, [m.start[1], m[1]], ":1p")) || (m[3] == "vous" && morph(dTokenPos, [m.start[1], m[1]], ":2P")) || (m[3] == "ils" && morph(dTokenPos, [m.start[1], m[1]], ":3p")) || (m[3] == "elles" && morph(dTokenPos, [m.start[1], m[1]], ":3p"));
    },
    _c_esp_avant_après_tiret_3: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    _c_typo_parenthèse_fermante_collée_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! look(sSentence.slice(0,m.index), "\\([rR][eéEÉ]$");
    },
    _p_p_URL2_2: function (sSentence, m) {
        return m[2].gl_toCapitalize();
    },
    _p_p_sigle1_1: function (sSentence, m) {
        return m[1].replace(/\./g, "")+".";
    },
    _c_p_sigle2_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! re.search("(?i)^(?:i\\.e\\.|s\\.[tv]\\.p\\.|e\\.g\\.|a\\.k\\.a\\.|c\\.q\\.f\\.d\\.|b\\.a\\.|n\\.b\\.)$", m[0]);
    },
    _c_p_sigle2_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return m[0].length == 4;
    },
    _s_p_sigle2_2: function (sSentence, m) {
        return m[0].replace(/\./g, "").toUpperCase() + "|" + m[0].slice(0,2) + " " + m[0].slice(2,4);
    },
    _c_p_sigle2_3: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    _s_p_sigle2_3: function (sSentence, m) {
        return m[0].replace(/\./g, "").toUpperCase();
    },
    _c_p_sigle2_4: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return m[0] != "b.a.";
    },
    _p_p_sigle2_4: function (sSentence, m) {
        return m[0].replace(/\./g, "_");
    },
    _p_p_sigle3_1: function (sSentence, m) {
        return m[0].replace(/\./g, "").replace(/-/g,"");
    },
    _c_p_prénom_lettre_point_patronyme_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return morph(dTokenPos, [m.start[1], m[1]], ":M[12]") && (morph(dTokenPos, [m.start[3], m[3]], ":(?:M[12]|V)") || ! _oSpellChecker.isValid(m[3]));
    },
    _c_p_prénom_lettre_point_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return morph(dTokenPos, [m.start[1], m[1]], ":M[12]") && look(sSentence.slice(m.end[0]), "^\\W+[a-zéèêîïâ]");
    },
    _p_p_patronyme_composé_avec_le_la_les_1: function (sSentence, m) {
        return m[0].replace(/ /g, "_");
    },
    _c_p_mot_entre_crochets_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return m[1].gl_isDigit();
    },
    _c_p_mot_entre_crochets_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! bCondMemo && morph(dTokenPos, [m.start[1], m[1]], ":G");
    },
    _p_p_mot_entre_crochets_2: function (sSentence, m) {
        return " " + m[1] + " ";
    },
    _c_p_mot_entre_crochets_3: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! bCondMemo && m[1].gl_isAlpha();
    },
    _c_typo_apostrophe_incorrecte_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! (m[2].length == 1  &&  m[1].endsWith("′ "));
    },
    _s_typo_apostrophe_manquante_prudence1_1: function (sSentence, m) {
        return m[1].slice(0,-1)+"’";
    },
    _c_typo_apostrophe_manquante_prudence2_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! option("mapos") && (m[2] == "<" || morph(dTokenPos, [m.start[2], m[2]], ":V"));
    },
    _s_typo_apostrophe_manquante_prudence2_1: function (sSentence, m) {
        return m[1].slice(0,-1)+"’";
    },
    _c_typo_apostrophe_manquante_audace1_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return option("mapos") && ! look(sSentence.slice(0,m.index), "(?i)(?:lettre|caractère|glyphe|dimension|variable|fonction|point) *$");
    },
    _s_typo_apostrophe_manquante_audace1_1: function (sSentence, m) {
        return m[1].slice(0,-1)+"’";
    },
    _c_typo_guillemets_typographiques_doubles_ouvrants_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! look(sSentence.slice(0,m.index), "[a-zA-Zéïîùàâäôö]$");
    },
    _c_eepi_écriture_épicène_tous_toutes_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return option("eepi");
    },
    _p_eepi_écriture_épicène_tous_toutes_2: function (sSentence, m) {
        return normalizeInclusiveWriting(m[0]);
    },
    _c_eepi_écriture_épicène_ceux_celles_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return option("eepi");
    },
    _p_eepi_écriture_épicène_ceux_celles_2: function (sSentence, m) {
        return normalizeInclusiveWriting(m[0]);
    },
    _c_eepi_écriture_épicène_pluriel_eur_divers_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return option("eepi") && m[2] != "se";
    },
    _c_eepi_écriture_épicène_pluriel_eur_divers_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return option("eepi") && m[2] == "se";
    },
    _p_eepi_écriture_épicène_pluriel_eur_divers_3: function (sSentence, m) {
        return normalizeInclusiveWriting(m[0]);
    },
    _c_eepi_écriture_épicène_pluriel_eux_euses_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return option("eepi");
    },
    _p_eepi_écriture_épicène_pluriel_eux_euses_2: function (sSentence, m) {
        return normalizeInclusiveWriting(m[0]);
    },
    _c_eepi_écriture_épicène_pluriel_aux_ales_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return option("eepi");
    },
    _p_eepi_écriture_épicène_pluriel_aux_ales_2: function (sSentence, m) {
        return normalizeInclusiveWriting(m[0]);
    },
    _c_eepi_écriture_épicène_pluriel_er_ère_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return option("eepi");
    },
    _p_eepi_écriture_épicène_pluriel_er_ère_2: function (sSentence, m) {
        return normalizeInclusiveWriting(m[0]);
    },
    _c_eepi_écriture_épicène_pluriel_if_ive_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return option("eepi");
    },
    _p_eepi_écriture_épicène_pluriel_if_ive_2: function (sSentence, m) {
        return normalizeInclusiveWriting(m[0]);
    },
    _c_eepi_écriture_épicène_pluriel_e_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! (m[0].endsWith(".Les") || m[0].endsWith(".Tes"));
    },
    _p_eepi_écriture_épicène_pluriel_e_2: function (sSentence, m) {
        return normalizeInclusiveWriting(m[0]);
    },
    _c_eepi_écriture_épicène_pluriel_e_3: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return option("eepi") && ! m[0].endsWith("les") && ! m[0].endsWith("LES") && ! re.search("(?i)·[ntlf]?e·s$", m[0]);
    },
    _c_eepi_écriture_épicène_pluriel_e_4: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return m[1].endsWith("s") || m[1].endsWith("S");
    },
    _c_eepi_écriture_épicène_pluriel_e_5: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    _c_eepi_écriture_épicène_singulier_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! (m[0].endsWith(".Le") || m[0].endsWith(".Ne") || m[0].endsWith(".De")) && ! ((m[0].endsWith("-le") || m[0].endsWith("-Le") || m[0].endsWith("-LE")) && ! (m[1].endsWith("l") || m[1].endsWith("L")));
    },
    _p_eepi_écriture_épicène_singulier_2: function (sSentence, m) {
        return normalizeInclusiveWriting(m[0]);
    },
    _c_eepi_écriture_épicène_singulier_3: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return option("eepi") && (m[1] == "un" || m[1] == "Un" || m[1] == "UN");
    },
    _c_eepi_écriture_épicène_singulier_4: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! bCondMemo && option("eepi") && ! re.search("(?i)·[ntl]?e$", m[2]);
    },
    _s_eepi_écriture_épicène_singulier_4: function (sSentence, m) {
        return m[1]+"·"+m[2].slice(1).gl_trimRight(")");
    },
    _p_typo_écriture_invariable_1: function (sSentence, m) {
        return normalizeInclusiveWriting(m[0]);
    },
    _c_typo_écriture_invariable_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return option("typo") && option("eepi") && ! m[0].endsWith("·s") && ! (m[0].endsWith("/s") && morph(dTokenPos, [m.start[1], m[1]], ";S"));
    },
    _c_majuscule_après_point_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! re.search("(?i)^(?:etc|[A-Z]|chap|cf|fig|hab|litt|circ|coll|r[eé]f|étym|suppl|bibl|bibliogr|cit|op|vol|déc|nov|oct|janv|juil|avr|sept)$", m[1]) && morph(dTokenPos, [m.start[1], m[1]], ":") && morph(dTokenPos, [m.start[2], m[2]], ":");
    },
    _s_majuscule_après_point_1: function (sSentence, m) {
        return m[2].gl_toCapitalize();
    },
    _c_majuscule_début_paragraphe_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return look(sSentence.slice(m.end[0]), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ][.] +[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]+");
    },
    _s_majuscule_début_paragraphe_1: function (sSentence, m) {
        return m[1].gl_toCapitalize();
    },
    _c_poncfin_règle1_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return look(sSentence.slice(0,m.index), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]+(?:\\.|[   ][!?]) +(?:[A-ZÉÈÎ][a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]+|[ÀÔ])");
    },
    _c_virgule_manquante_avant_car_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! morph(dTokenPos, [m.start[1], m[1]], ":[DR]");
    },
    _c_virgule_manquante_avant_mais_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! morph(dTokenPos, [m.start[1], m[1]], ">(?:[mtscl]es|[nv]os|quels)/");
    },
    _c_virgule_manquante_avant_donc_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! morph(dTokenPos, [m.start[1], m[1]], ":[VG]");
    },
    _c_virg_virgule_après_point_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! re.search("^(?:etc|[A-Z]|fig|hab|litt|circ|coll|ref|étym|suppl|bibl|bibliogr|cit|vol|déc|nov|oct|janv|juil|avr|sept|pp?)$", m[1]);
    },
    _c_typo_espace_manquant_après1_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! m[1].gl_isDigit();
    },
    _c_typo_espace_manquant_après3_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return (m[1].length > 1 && ! m[1].slice(0,1).gl_isDigit() && _oSpellChecker.isValid(m[1])) || look(sSentence.slice(m.end[0]), "^’");
    },
    _c_typo_espace_manquant_après4_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return m[1].slice(0,1).gl_isUpperCase() || m[1].length > 5 || ! m[1].gl_isAlpha() || (m[1].length > 1 && _oSpellChecker.isValid(m[1]));
    },
    _s_typo_point_après_titre_1: function (sSentence, m) {
        return m[1].slice(0,-1);
    },
    _c_typo_point_après_numéro_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return m[1].slice(1,3) == "os";
    },
    _c_typo_point_après_numéro_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    _c_typo_points_suspension1_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! look(sSentence.slice(0,m.index), "(?i)etc$");
    },
    _s_typo_points_suspension2_1: function (sSentence, m) {
        return m[0].replace(/\.\.\./g, "…").gl_trimRight(".");
    },
    _s_typo_virgules_points_1: function (sSentence, m) {
        return m[0].replace(/,/g, ".").replace(/\.\.\./g, "…");
    },
    _s_typo_ponctuation_superflue1_1: function (sSentence, m) {
        return ",|" + m[1];
    },
    _s_typo_ponctuation_superflue2_1: function (sSentence, m) {
        return ";|" + m[1];
    },
    _s_typo_ponctuation_superflue3_1: function (sSentence, m) {
        return ":|" + m[0][1];
    },
    _c_nbsp_ajout_avant_double_ponctuation_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return sCountry != "CA";
    },
    _s_nbsp_ajout_avant_double_ponctuation_1: function (sSentence, m) {
        return " "+m[0];
    },
    _c_unit_nbsp_avant_unités1_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return option("num");
    },
    _s_unit_nbsp_avant_unités1_1: function (sSentence, m) {
        return formatNumber(m[2]) + " " + m[3];
    },
    _c_unit_nbsp_avant_unités1_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    _c_unit_nbsp_avant_unités2_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return morph(dTokenPos, [m.start[3], m[3]], ";S", ":[VCR]") || mbUnit(m[3]) || ! _oSpellChecker.isValid(m[3]);
    },
    _c_unit_nbsp_avant_unités2_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return option("num");
    },
    _s_unit_nbsp_avant_unités2_2: function (sSentence, m) {
        return formatNumber(m[2]) + " " + m[3];
    },
    _c_unit_nbsp_avant_unités2_3: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    _c_unit_nbsp_avant_unités3_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return (m[2].length > 4 && ! _oSpellChecker.isValid(m[3])) || morph(dTokenPos, [m.start[3], m[3]], ";S", ":[VCR]") || mbUnit(m[3]);
    },
    _c_unit_nbsp_avant_unités3_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return option("num");
    },
    _s_unit_nbsp_avant_unités3_2: function (sSentence, m) {
        return formatNumber(m[2]) + " " + m[3];
    },
    _c_unit_nbsp_avant_unités3_3: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    _s_typo_math_1: function (sSentence, m) {
        return m[0].replace(/ /g, "(")+")|"+m[0].replace(/ /g, " ");
    },
    _c_typo_signe_moins_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! look(sSentence.slice(0,m.index), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]$");
    },
    _c_typo_signe_multiplication_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! m[0].startsWith("0x");
    },
    _s_ligatures_typographiques_1: function (sSentence, m) {
        return undoLigature(m[0]);
    },
    _c_nf_norme_française_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! re.search("^NF (?:C|E|P|Q|S|X|Z|EN(?: ISO|)) [0-9]+(?:‑[0-9]+|)", m[0]);
    },
    _s_nf_norme_française_1: function (sSentence, m) {
        return formatNF(m[0]);
    },
    _c_typo_cohérence_guillemets_chevrons_ouvrants_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! look(sSentence.slice(0,m.index), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]$");
    },
    _c_typo_cohérence_guillemets_chevrons_ouvrants_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! look(sSentence.slice(m.end[0]), "^[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]");
    },
    _c_typo_cohérence_guillemets_chevrons_fermants_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! look(sSentence.slice(0,m.index), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]$");
    },
    _c_typo_cohérence_guillemets_chevrons_fermants_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! look(sSentence.slice(m.end[0]), "^[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]");
    },
    _c_typo_cohérence_guillemets_doubles_ouvrants_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! look(sSentence.slice(0,m.index), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]$");
    },
    _c_typo_cohérence_guillemets_doubles_fermants_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! look(sSentence.slice(0,m.index), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]$");
    },
    _c_typo_cohérence_guillemets_doubles_fermants_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! look(sSentence.slice(m.end[0]), "^[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]");
    },
    _c_typo_guillemet_simple_ouvrant_non_fermé_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return look(sSentence.slice(0,m.index), " $") || look(sSentence.slice(0,m.index), "^ *$|, *$");
    },
    _c_typo_guillemet_simple_fermant_non_ouvert_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return look(sSentence.slice(m.end[0]), "^ ") || look(sSentence.slice(m.end[0]), "^ *$|^,");
    },
    _c_num_grand_nombre_soudé_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! look(sSentence.slice(0,m.index), "NF[  -]?(C|E|P|Q|X|Z|EN(?:[  -]ISO|)) *$");
    },
    _c_num_grand_nombre_soudé_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return m[0].length > 4;
    },
    _s_num_grand_nombre_soudé_2: function (sSentence, m) {
        return formatNumber(m[0]);
    },
    _c_num_grand_nombre_soudé_3: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! bCondMemo && ((look(sSentence.slice(m.end[0]), "^(?:,[0-9]+[⁰¹²³⁴⁵⁶⁷⁸⁹]?|[⁰¹²³⁴⁵⁶⁷⁸⁹])") && ! (re.search("^[01]+$", m[0]) && look(sSentence.slice(m.end[0]), "^,[01]+\\b"))) || look(sSentence.slice(m.end[0]), "^[   ]*(?:[kcmµn]?(?:[slgJKΩ]|m[²³]?|Wh?|Hz|dB)|[%‰€$£¥Åℓhj]|min|°C|℃)(?![a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ’'])"));
    },
    _s_num_grand_nombre_soudé_3: function (sSentence, m) {
        return formatNumber(m[0]);
    },
    _c_num_nombre_quatre_chiffres_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return morph(dTokenPos, [m.start[2], m[2]], ";S", ":[VCR]") || mbUnit(m[2]);
    },
    _s_num_nombre_quatre_chiffres_1: function (sSentence, m) {
        return formatNumber(m[1]);
    },
    _c_num_grand_nombre_avec_points_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return option("num");
    },
    _s_num_grand_nombre_avec_points_1: function (sSentence, m) {
        return m[0].replace(/\./g, " ");
    },
    _p_num_grand_nombre_avec_points_2: function (sSentence, m) {
        return m[0].replace(/\./g, "_");
    },
    _c_num_grand_nombre_avec_espaces_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return option("num");
    },
    _s_num_grand_nombre_avec_espaces_1: function (sSentence, m) {
        return m[0].replace(/ /g, " ");
    },
    _p_num_grand_nombre_avec_espaces_2: function (sSentence, m) {
        return m[0].replace(/ /g, "_");
    },
    _c_date_nombres_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return m[2] == m[4] && ! checkDate(m[1], m[3], m[5]) && ! look(sSentence.slice(0,m.index), "(?i)\\b(?:version|article|référence)s? +$");
    },
    _c_redondances_paragraphe_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! morph(dTokenPos, [m.start[1], m[1]], ":(?:G|V0)|>(?:t(?:antôt|emps|rès)|loin|souvent|parfois|quelquefois|côte|petit|même)/") && ! m[1][0].gl_isUpperCase();
    },
    _c_redondances_paragraphe_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return bCondMemo;
    },
    _c_ocr_point_interrogation_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return look(sSentence0.slice(m.end[0]), "^(?: +[A-ZÉÈÂ(]|…|[.][.]+| *$)");
    },
    _c_ocr_exclamation2_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! morph(dTokenPos, nextword1(sSentence, m.end[0]), ";S") && ! morph(dTokenPos, prevword1(sSentence, m.index), ":R");
    },
    _c_ocr_nombres_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return m[0] == "II";
    },
    _c_ocr_nombres_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! bCondMemo && ! m[0].gl_isDigit();
    },
    _s_ocr_nombres_2: function (sSentence, m) {
        return m[0].replace(/O/g, "0").replace(/I/g, "1");
    },
    _s_ocr_casse_pronom_vconj_1: function (sSentence, m) {
        return m[1].toLowerCase();
    },
    _c_mots_composés_inconnus_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! _oSpellChecker.isValid(m[0]) && ! re.search("(?i)-(?:je|tu|on|nous|vous|ie?ls?|elles?|ce|là|ci|les?|la|leur|une?s|moi|toi|en|y)$", m[0]);
    },
    _c_ocr_caractères_rares_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return m[0] != "<" && m[0] != ">";
    },
    _c_ocr_le_la_les_regex_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return m[0].endsWith("e");
    },
    _c_ocr_le_la_les_regex_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! bCondMemo && m[0].endsWith("a");
    },
    _c_ocr_le_la_les_regex_3: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! bCondMemo && m[0].endsWith("à");
    },
    _c_ocr_le_la_les_regex_4: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    _c_conf_1e_1a_1es_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return m[0].endsWith("e") && (morph(dTokenPos, nextword1(sSentence, m.end[0]), ":(?:N.*:[me]:[si]|V)", ":G") || morph(dTokenPos, prevword1(sSentence, m.index), ">ne/"));
    },
    _c_conf_1e_1a_1es_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return m[0].endsWith("a") && (morph(dTokenPos, nextword1(sSentence, m.end[0]), ":(?:N.*:[fe]:[si]|V)", ":G") || morph(dTokenPos, prevword1(sSentence, m.index), ">ne/"));
    },
    _c_conf_1e_1a_1es_3: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return m[0].endsWith("es") && (morph(dTokenPos, nextword1(sSentence, m.end[0]), ":(?:N.*:[pi]|V)", ":G") || morph(dTokenPos, prevword1(sSentence, m.index), ">ne/"));
    },
    _c_ocr_il_regex_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return m[0].endsWith("s");
    },
    _c_ocr_il_regex_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! bCondMemo;
    },
    _p_p_trait_union_conditionnel1_1: function (sSentence, m) {
        return m[0].replace(/‑/g, "");
    },
    _p_p_trait_union_conditionnel2_1: function (sSentence, m) {
        return m[0].replace(/‑/g, "");
    },
    _c_doublon_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! re.search("(?i)^([nv]ous|faire|en|la|lui|donnant|œuvre|h[éoa]|hou|olé|joli|Bora|couvent|dément|sapiens|très|vroum|[0-9]+)$", m[1]) && ! (re.search("^(?:est|une?)$", m[1]) && look(sSentence.slice(0,m.index), "[’']$")) && ! (m[1] == "mieux" && look(sSentence.slice(0,m.index), "(?i)qui +$"));
    },
    _c_num_lettre_O_zéro1_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! option("ocr");
    },
    _s_num_lettre_O_zéro1_1: function (sSentence, m) {
        return m[0].replace(/O/g, "0");
    },
    _c_num_lettre_O_zéro2_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! option("ocr");
    },
    _s_num_lettre_O_zéro2_1: function (sSentence, m) {
        return m[0].replace(/O/g, "0");
    },
    _c_d_eepi_écriture_épicène_pluriel_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return morph(dTokenPos, [m.start[1], m[1]], ":[NAQ]", ":G");
    },
    _d_d_eepi_écriture_épicène_pluriel_1: function (sSentence, m, dTokenPos) {
        return define(dTokenPos, m.start[1], ":N:A:Q:e:p");
    },
    _c_d_eepi_écriture_épicène_singulier_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return morph(dTokenPos, [m.start[1], m[1]], ":[NAQ]");
    },
    _d_d_eepi_écriture_épicène_singulier_1: function (sSentence, m, dTokenPos) {
        return define(dTokenPos, m.start[1], ":N:A:Q:e:s");
    },
    _c_p_références_aux_notes_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! morph(dTokenPos, [m.start[0], m[0]], ":") && morph(dTokenPos, [m.start[1], m[1]], ":");
    },
    _c_tu_trait_union_douteux_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return _oSpellChecker.isValid(m[1]+"-"+m[2]) && analyse(m[1]+"-"+m[2], ":");
    },
    _c_tu_t_euphonique_incorrect_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return re.search("(?i)^(?:ie?ls|elles|tu)$", m[2]);
    },
    _c_tu_t_euphonique_incorrect_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! bCondMemo && m[1] != "-t-" && m[1] != "-T-";
    },
    _c_tu_t_euphonique_incorrect_3: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return m[1] != "-t-";
    },
    _c_tu_t_euphonique_superflu_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return m[1] != "-t-";
    },
    _c_redondances_phrase_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! morph(dTokenPos, [m.start[1], m[1]], ":(?:G|V0)|>même/");
    },
    _c_redondances_phrase_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return bCondMemo;
    },
    _c_mc_mot_composé_1: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return ! m[1].gl_isDigit() && ! m[2].gl_isDigit() && ! morph(dTokenPos, [m.start[0], m[0]], ":") && ! morph(dTokenPos, [m.start[2], m[2]], ":G") && _oSpellChecker.isValid(m[1]+m[2]);
    },
    _c_mc_mot_composé_2: function (sSentence, sSentence0, m, dTokenPos, sCountry, bCondMemo) {
        return m[2] != "là" && ! re.search("(?i)^(?:ex|mi|quasi|semi|non|demi|pro|anti|multi|pseudo|proto|extra)$", m[1]) && ! m[1].gl_isDigit() && ! m[2].gl_isDigit() && ! morph(dTokenPos, [m.start[2], m[2]], ":G") && ! morph(dTokenPos, [m.start[0], m[0]], ":") && ! _oSpellChecker.isValid(m[1]+m[2]);
    },


    // callables for graph rules
    _g_cond_g0_1: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 0, 1) && g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 0, 1);
    },
    _g_cond_g0_2: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 0, 1);
    },
    _g_cond_g0_3: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 0, 1);
    },
    _g_cond_g0_4: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 0, 0) && g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 0, 0);
    },
    _g_cond_g0_5: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 0, 0);
    },
    _g_cond_g0_6: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 0, 0);
    },
    _g_cond_g0_7: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":1s");
    },
    _g_da_g0_1: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nTokenOffset+2], ":Ov");
    },
    _g_cond_g0_8: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:2s|V0)");
    },
    _g_cond_g0_9: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":3s");
    },
    _g_cond_g0_10: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:3s|R)");
    },
    _g_cond_g0_11: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:1p|R)");
    },
    _g_cond_g0_12: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:2p|R)");
    },
    _g_cond_g0_13: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":3p");
    },
    _g_cond_g0_14: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:3p|R)");
    },
    _g_cond_g0_15: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|ne|n’|me|m’|te|t’|se|s’|");
    },
    _g_da_g0_2: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nTokenOffset+1], ":D");
    },
    _g_da_g0_3: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+2], ":Os");
    },
    _g_cond_g0_16: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+2], ":1p");
    },
    _g_da_g0_4: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+1], ":Os");
    },
    _g_cond_g0_17: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+2], ":2p");
    },
    _g_da_g0_5: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nLastToken-1+1], ":V");
    },
    _g_da_g0_6: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nTokenOffset+3], ":(?:[123][sp]|P|Y)");
    },
    _g_da_g0_7: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nTokenOffset+2], ":(?:[123][sp]|P|Y)");
    },
    _g_da_g0_8: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nLastToken-1+1], ":[123][sp]");
    },
    _g_cond_g0_18: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":V0");
    },
    _g_cond_g0_19: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":R");
    },
    _g_cond_g0_20: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].gl_isLowerCase() && g_morph(lToken[nTokenOffset], ":Cs|<start>");
    },
    _g_da_g0_9: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nTokenOffset+2], ":[123][sp]");
    },
    _g_da_g0_10: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nTokenOffset+2], ":M");
    },
    _g_da_g0_11: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nLastToken-1+1], ":E");
    },
    _g_da_g0_12: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+4], ":N");
    },
    _g_da_g0_13: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+2], ":N");
    },
    _g_da_g0_14: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nLastToken-1+1], ":Q");
    },
    _g_cond_g0_21: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|l’|un|cet|quel|");
    },
    _g_da_g0_15: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+1], ":N");
    },
    _g_cond_g0_22: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":D");
    },
    _g_da_g0_16: function (lToken, nTokenOffset, nLastToken) {
        return (lToken[nTokenOffset+1]["sValue"], ":W");
    },
    _g_cond_g0_23: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:[me]");
    },
    _g_cond_g0_24: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:p|>[a-z]+ième/");
    },
    _g_da_g0_17: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nTokenOffset+1], ":R");
    },
    _g_da_g0_18: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+2], ":D");
    },
    _g_da_g0_19: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nTokenOffset+2], ":N");
    },
    _g_da_g0_20: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nTokenOffset+2], ":A");
    },
    _g_cond_g0_25: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|je|ne|n’|le|la|l’|les|lui|nous|vous|leur|");
    },
    _g_da_g0_21: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+1], ":V");
    },
    _g_da_g0_22: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+1], ":D");
    },
    _g_da_g0_23: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+1], ":G");
    },
    _g_cond_g0_26: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|que|qu’|");
    },
    _g_cond_g0_27: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|n’|j’|tu|t’|m’|s’|");
    },
    _g_cond_g0_28: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo;
    },
    _g_da_g0_24: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+1], ":G:R");
    },
    _g_da_g0_25: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+2], ":N:m:s");
    },
    _g_cond_g0_29: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ">entre/|:D");
    },
    _g_da_g0_26: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+1], ":G");
    },
    _g_da_g0_27: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+2], ":V");
    },
    _g_cond_g0_30: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_1p_") && ! g_value(lToken[nTokenOffset], "|n’|") && ! g_value(lToken[nLastToken+1], "|nous|");
    },
    _g_da_g0_28: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nLastToken-1+1], ":N");
    },
    _g_cond_g0_31: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":Y");
    },
    _g_da_g0_29: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+1], ":N:e:i");
    },
    _g_da_g0_30: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+2], ":(?:[123][sp]|P)");
    },
    _g_da_g0_31: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+3], ":V");
    },
    _g_cond_g0_32: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+3], "|plus|");
    },
    _g_da_g0_32: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nTokenOffset+3], ":[123][sp]");
    },
    _g_da_g0_33: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+1], ":LN:m:p");
    },
    _g_da_g0_34: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+1], ":LN:f:p");
    },
    _g_cond_g0_33: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nLastToken-1+1], ":V0");
    },
    _g_cond_g0_34: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nLastToken-1+1], ":V0") && ! g_morph(lToken[nLastToken-1+1], ":3s");
    },
    _g_cond_g0_35: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|tu|ne|n’|me|m’|te|t’|se|s’|nous|vous|") && g_morph(lToken[nTokenOffset+2], ":V1.*Ip.*:2s") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_2s_") && ! g_value(lToken[nLastToken+1], "|tu|pas|jamais|");
    },
    _g_cond_g0_36: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|l’|quelqu’|quelqu|") && ! g_value(lToken[nTokenOffset+2], "|a|fut|fût|est|fait|") && ! g_morph(lToken[nTokenOffset+2], ":P");
    },
    _g_cond_g0_37: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|semblant|");
    },
    _g_da_g0_35: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nTokenOffset+2], ":D");
    },
    _g_da_g0_36: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nTokenOffset+4], ":[NA]");
    },
    _g_da_g0_37: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+4], ":[123][sp]");
    },
    _g_cond_g0_38: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|ne|n’|j’|on|il|elle|iel|");
    },
    _g_cond_g0_39: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D");
    },
    _g_cond_g0_40: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":A.*:[me]:[si]");
    },
    _g_da_g0_38: function (lToken, nTokenOffset, nLastToken) {
        return g_add_morph(lToken[nTokenOffset+1], ">nombre/:G:D");
    },
    _g_cond_g0_41: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo;
    },
    _g_da_g0_39: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+1], ">nombre/:G:D");
    },
    _g_da_g0_40: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+2], ":[123][sp]");
    },
    _g_cond_g0_42: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:m|>(?:être|(?:re|)devenir|rester|demeurer|sembler|para[iî]tre)/");
    },
    _g_cond_g0_43: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ">(?:être|(?:re|)devenir|rester|demeurer|sembler|para[iî]tre)/");
    },
    _g_da_g0_41: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+1], ":LV");
    },
    _g_da_g0_42: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+1], ":A:e:i");
    },
    _g_cond_g0_44: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":(D.*:p|B)");
    },
    _g_da_g0_43: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+2], ":A:e:i");
    },
    _g_cond_g0_45: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:f");
    },
    _g_da_g0_44: function (lToken, nTokenOffset, nLastToken) {
        return g_add_morph(lToken[nTokenOffset+1], ">Concorde/:MP:m:i");
    },
    _g_cond_g0_46: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:m");
    },
    _g_da_g0_45: function (lToken, nTokenOffset, nLastToken) {
        return g_add_morph(lToken[nTokenOffset+1], ">Mustang/:MP:f:i");
    },
    _g_cond_g0_47: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ">ne/|:R");
    },
    _g_cond_g0_48: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":R");
    },
    _g_da_g0_46: function (lToken, nTokenOffset, nLastToken) {
        return g_define_from(lToken[nTokenOffset+1], 0, -3);
    },
    _g_cond_g0_49: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"].gl_isUpperCase();
    },
    _g_cond_g0_50: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":[NA]");
    },
    _g_da_g0_47: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+1], ":Cs");
    },
    _g_da_g0_48: function (lToken, nTokenOffset, nLastToken) {
        return g_change_meta(lToken[nTokenOffset+1], "WORD");
    },
    _g_da_g0_49: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+1], ":N:m:i");
    },
    _g_da_g0_50: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+1], ":N:f:p");
    },
    _g_cond_g0_51: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":D.*:[mp]");
    },
    _g_cond_g0_52: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 0, 0) && g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 0, 0);
    },
    _g_cond_g0_53: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 0, 0) && g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 0, 0) && g_morph(lToken[nTokenOffset+1], ":N") && g_morph(lToken[nLastToken-1+1], ":N");
    },
    _g_da_g0_51: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+1], ":M2:e:i");
    },
    _g_cond_g0_54: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_merged_analyse(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], " ", ":");
    },
    _g_cond_g0_55: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nTokenOffset+1], ":M") && g_morph(lToken[nTokenOffset+2], ":V", ":[GM]");
    },
    _g_da_g0_52: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+2], ":M2");
    },
    _g_da_g0_53: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+1], ":T");
    },
    _g_da_g0_54: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+2], ":MP:f:s");
    },
    _g_da_g0_55: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+2], ":MP:m:s");
    },
    _g_da_g0_56: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+2], ":MP:e:s");
    },
    _g_da_g0_57: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+2], ":MP:e:i");
    },
    _g_cond_g0_56: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":V");
    },
    _g_cond_g0_57: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":V");
    },
    _g_cond_g0_58: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+4], ":V");
    },
    _g_cond_g0_59: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+2], ">[iî]le/");
    },
    _g_cond_g0_60: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+2], "|un|une|");
    },
    _g_cond_g0_61: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ":V", ":1[sśŝ]");
    },
    _g_sugg_g0_1: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+1]["sValue"], ":1ś", null, true);
    },
    _g_cond_g0_62: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && ! g_morphVC(lToken[nTokenOffset+1], ":V");
    },
    _g_sugg_g0_2: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+1]["sValue"], ":1[sśŝ]", false, true);
    },
    _g_cond_g0_63: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ":V", ":[ISK].*:2s");
    },
    _g_sugg_g0_3: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+1]["sValue"], ":2s", null, true);
    },
    _g_sugg_g0_4: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+1]["sValue"], ":2s", false, true);
    },
    _g_cond_g0_64: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ":3p", ":3s");
    },
    _g_sugg_g0_5: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+1]["sValue"], ":3s", null, true) + "|" + lToken[nTokenOffset+1]["sValue"]+"s";
    },
    _g_cond_g0_65: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morphVC(lToken[nTokenOffset+1], ":V", ":3s");
    },
    _g_sugg_g0_6: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+1]["sValue"], ":3s", null, true);
    },
    _g_cond_g0_66: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morphVC(lToken[nTokenOffset+1], ":", ":V|>(?:t|voilà)/");
    },
    _g_sugg_g0_7: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+1]["sValue"], ":3s", false, true);
    },
    _g_cond_g0_67: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morphVC(lToken[nTokenOffset+1], ":", ":V|>t/");
    },
    _g_cond_g0_68: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ":V", ":3s");
    },
    _g_cond_g0_69: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ":V", ":(?:3s|V0e.*:3p)");
    },
    _g_cond_g0_70: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morphVC(lToken[nTokenOffset+1], ":", ":V");
    },
    _g_cond_g0_71: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"].endsWith("se");
    },
    _g_sugg_g0_8: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].slice(0,-2)+"ce";
    },
    _g_cond_g0_72: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ":V", ":3p");
    },
    _g_sugg_g0_9: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+1]["sValue"], ":3p", null, true);
    },
    _g_sugg_g0_10: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+1]["sValue"], ":3p", false, true);
    },
    _g_cond_g0_73: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ":V", ":(?:1p|E:2[sp])");
    },
    _g_sugg_g0_11: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+1]["sValue"], ":1p", null, true);
    },
    _g_cond_g0_74: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morphVC(lToken[nTokenOffset+1], ":", ":V|>(?:chez|malgré)/");
    },
    _g_sugg_g0_12: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+1]["sValue"], ":1p", false, true);
    },
    _g_cond_g0_75: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ":V", ":2p");
    },
    _g_sugg_g0_13: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+1]["sValue"], ":2p", null, true);
    },
    _g_cond_g0_76: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morphVC(lToken[nTokenOffset+1], ":", ":V|>chez/");
    },
    _g_sugg_g0_14: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+1]["sValue"], ":2p", false, true);
    },
    _g_da_g0_58: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nLastToken-1+1], ":VCi1:2p");
    },
    _g_cond_g0_77: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ":V", ":E");
    },
    _g_sugg_g0_15: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbImpe(lToken[nTokenOffset+1]["sValue"], true);
    },
    _g_sugg_g0_16: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+1]["sValue"], ":E", false, true);
    },
    _g_sugg_g0_17: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/-là-/g, "-la-");
    },
    _g_cond_g0_78: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morphVC(lToken[nTokenOffset+1], ":", ":V") && ! g_value(lToken[nTokenOffset], "|ce|cet|cette|ces|") && ! g_value(lToken[nTokenOffset+1], "|par-la|de-la|jusque-la|celui-la|celle-la|ceux-la|celles-la|");
    },
    _g_sugg_g0_18: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+1]["sValue"], ":E", false, true)+"|"+lToken[nTokenOffset+1]["sValue"].slice(0,-3)+" là";
    },
    _g_sugg_g0_19: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].slice(0,-1);
    },
    _g_cond_ocr_1: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]") && (g_morph(lToken[nTokenOffset+1], ":G", ":M") || g_morph(lToken[nTokenOffset+1], ":[123][sp]", ":[MNA]|>Est/"));
    },
    _g_sugg_ocr_1: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].toLowerCase();
    },
    _g_cond_ocr_2: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]") && ! lToken[nTokenOffset+2]["sValue"].gl_isUpperCase();
    },
    _g_cond_ocr_3: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return re.search("^[aâeéèêiîouyh]", lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_ocr_4: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "\\d[   ]+$") && ! (lToken[nTokenOffset+1]["sValue"].gl_isUpperCase() && g_value(lToken[nLastToken+1], "|.|<end>|"));
    },
    _g_cond_ocr_5: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 0, 0) && ! lToken[nTokenOffset+1]["sValue"].gl_isUpperCase() || g_value(lToken[nTokenOffset+1], "|à|");
    },
    _g_cond_ocr_6: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|<start>|—|–|");
    },
    _g_sugg_ocr_2: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/a/g, "â").replace(/A/g, "Â");
    },
    _g_sugg_ocr_3: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/n/g, "u");
    },
    _g_cond_ocr_7: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|il|ne|n’|âne|ânesse|");
    },
    _g_cond_ocr_8: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|il|ne|elle|");
    },
    _g_cond_ocr_9: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|je|ne|le|la|les|");
    },
    _g_cond_ocr_10: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:f:[si]");
    },
    _g_cond_ocr_11: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|j’|n’|l’|m’|t’|s’|il|on|elle|ça|cela|ceci|");
    },
    _g_cond_ocr_12: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|et|ou|où|");
    },
    _g_cond_ocr_13: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:p");
    },
    _g_cond_ocr_14: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_value(lToken[nTokenOffset], "|grand|") && g_value(g_token(lToken, nTokenOffset+1-2), "|au|"));
    },
    _g_sugg_ocr_4: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/rn/g, "m").replace(/in/g, "m");
    },
    _g_cond_ocr_15: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:m:[si]");
    },
    _g_cond_ocr_16: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:m:p");
    },
    _g_cond_ocr_17: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:[me]");
    },
    _g_cond_ocr_18: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|au|de|en|par|");
    },
    _g_cond_ocr_19: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":R|<start>|>,") || isNextVerb();
    },
    _g_cond_ocr_20: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "[0-9] +$");
    },
    _g_cond_ocr_21: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|tu|");
    },
    _g_sugg_ocr_5: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/ess/g, "ass").replace(/ESS/g, "ASS");
    },
    _g_sugg_ocr_6: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/l/g, "i").replace(/L/g, "I");
    },
    _g_cond_ocr_22: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|il|elle|on|") && ! g_value(g_token(lToken, nTokenOffset+1-2), "|il|elle|on|");
    },
    _g_cond_ocr_23: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nLastToken+1], ":(?:Ov|Y|W)");
    },
    _g_cond_ocr_24: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":(?:O[on]|3s)");
    },
    _g_cond_ocr_25: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nLastToken+1], ":N", "*");
    },
    _g_sugg_ocr_7: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/o/g, "e");
    },
    _g_sugg_ocr_8: function (lToken, nTokenOffset, nLastToken) {
        return "l’"+lToken[nTokenOffset+1]["sValue"].slice(2) + "|L’"+lToken[nTokenOffset+1]["sValue"].slice(2) + "|j’"+lToken[nTokenOffset+1]["sValue"].slice(2) + "|J’"+lToken[nTokenOffset+1]["sValue"].slice(2);
    },
    _g_cond_ocr_26: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]") && ! g_morph(lToken[nTokenOffset+2], ":Y");
    },
    _g_cond_ocr_27: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"].gl_isTitle() && look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]") && g_morph(lToken[nTokenOffset+1], ":", ":M");
    },
    _g_cond_ocr_28: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return _oSpellChecker.isValid(lToken[nTokenOffset+1]["sValue"].slice(1));
    },
    _g_sugg_ocr_9: function (lToken, nTokenOffset, nLastToken) {
        return "v"+lToken[nTokenOffset+1]["sValue"].slice(1) + "|l’"+lToken[nTokenOffset+1]["sValue"].slice(1);
    },
    _g_cond_ocr_29: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo;
    },
    _g_sugg_ocr_10: function (lToken, nTokenOffset, nLastToken) {
        return "v"+lToken[nTokenOffset+1]["sValue"].slice(1);
    },
    _g_cond_ocr_30: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]") && g_morph(lToken[nTokenOffset+1], ":", ":M") && _oSpellChecker.isValid(lToken[nTokenOffset+1]["sValue"].slice(1));
    },
    _g_sugg_ocr_11: function (lToken, nTokenOffset, nLastToken) {
        return "l’"+lToken[nTokenOffset+1]["sValue"].slice(1) + "|p"+lToken[nTokenOffset+1]["sValue"].slice(1);
    },
    _g_cond_ocr_31: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:[me]:[si]");
    },
    _g_sugg_ocr_12: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/é/g, "e").replace(/É/g, "E");
    },
    _g_cond_ocr_32: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:V0|N.*:m:[si])");
    },
    _g_cond_ocr_33: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 0, 1);
    },
    _g_cond_ocr_34: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D:[me]:p");
    },
    _g_cond_ocr_35: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D:(?:m:s|e:p)");
    },
    _g_cond_ocr_36: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ">(?:homme|ce|quel|être)/");
    },
    _g_sugg_ocr_13: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/â/g, "a").replace(/Â/g, "A");
    },
    _g_sugg_ocr_14: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/ô/g, "ê").replace(/Ô/g, "Ê");
    },
    _g_sugg_ocr_15: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/è/g, "ê").replace(/È/g, "Ê");
    },
    _g_sugg_ocr_16: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/é/g, "ê").replace(/É/g, "Ê").replace(/o/g, "e").replace(/O/g, "E");
    },
    _g_cond_ocr_37: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|tu|ne|n’|");
    },
    _g_sugg_ocr_17: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/l/g, "t").replace(/L/g, "T")+"|"+lToken[nTokenOffset+1]["sValue"].replace(/l/g, "i").replace(/L/g, "I");
    },
    _g_cond_ocr_38: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|ne|il|on|elle|je|");
    },
    _g_cond_ocr_39: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|ne|il|on|elle|");
    },
    _g_cond_ocr_40: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|ne|tu|");
    },
    _g_cond_ocr_41: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:m:s");
    },
    _g_cond_ocr_42: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:f:s");
    },
    _g_cond_ocr_43: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:[me]:p");
    },
    _g_cond_ocr_44: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|sine|");
    },
    _g_cond_ocr_45: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|statu|");
    },
    _g_cond_ocr_46: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_value(lToken[nTokenOffset+1], "|raine|raines|");
    },
    _g_sugg_ocr_18: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/ain/g, "uin").replace(/AIN/g, "UIN");
    },
    _g_cond_ocr_47: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|generis|");
    },
    _g_cond_ocr_48: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|le|ce|mon|ton|son|du|un|");
    },
    _g_cond_ocr_49: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]");
    },
    _g_cond_ocr_50: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|je|il|elle|on|ne|ça|");
    },
    _g_sugg_ocr_19: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/a/g, "o").replace(/A/g, "O");
    },
    _g_sugg_ocr_20: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/n/g, "u").replace(/N/g, "U");
    },
    _g_cond_ocr_51: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:N.*:f:p|V0e.*:3p)|>(?:tu|ne)/");
    },
    _g_cond_ocr_52: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|ce|de|du|un|quel|leur|le|");
    },
    _g_sugg_ocr_21: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/l/g, "t").replace(/L/g, "T");
    },
    _g_cond_g1_1: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && ! re.search("(?i)^(?:onz[ei]|énième|iourte|ouistiti|ouate|one-?step|ouf|Ouagadougou|I(?:I|V|X|er|ᵉʳ|ʳᵉ|è?re))", lToken[nTokenOffset+2]["sValue"]) && ! g_morph(lToken[nTokenOffset+2], ":G");
    },
    _g_sugg_g1_1: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].slice(0,1)+"’";
    },
    _g_cond_g1_2: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1);
    },
    _g_cond_g1_3: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+1]["sValue"].gl_isUpperCase() && g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V", ":Q");
    },
    _g_cond_g1_4: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! re.search("(?i)^(?:onz|énième|ouf|énième|ouistiti|one-?step|I(?:I|V|X|er|ᵉʳ))", lToken[nTokenOffset+2]["sValue"]) && g_morph(lToken[nTokenOffset+2], ":[NA].*:[me]");
    },
    _g_cond_g1_5: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], "V1.*:1s") && lToken[nTokenOffset+1]["sValue"].endsWith("e-je");
    },
    _g_sugg_g1_2: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/e-je/g, "é-je")+"|"+lToken[nTokenOffset+1]["sValue"].replace(/e-je/g, "è-je");
    },
    _g_cond_g1_6: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA]") && ! re.search("(?i)^(?:onz|énième|ouf|énième|I(?:I|V|X|i?[eè]?re|ʳᵉ))", lToken[nTokenOffset+2]["sValue"]);
    },
    _g_sugg_g1_3: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].slice(0,1)+"on";
    },
    _g_cond_g1_7: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+1]["sValue"].gl_isUpperCase() && g_morph(lToken[nTokenOffset+2], ":[NA]") && ! re.search("(?i)^(?:onz|énième|ouf|énième|I(?:I|V|X|i?[eè]?re|ʳᵉ))", lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g1_8: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[123][sp]");
    },
    _g_sugg_g1_4: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].slice(0,1)+"on|ça";
    },
    _g_cond_g1_9: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo;
    },
    _g_cond_g1_10: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[me]:s", ":[123][sp]");
    },
    _g_cond_g1_11: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:[me]:s", ":[123][sp]");
    },
    _g_cond_g1_12: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return _sAppContext != "Writer";
    },
    _g_cond_g1_13: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"] != "1e" && _sAppContext != "Writer";
    },
    _g_sugg_g1_5: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].slice(0,-1)+"ᵉ";
    },
    _g_cond_g1_14: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"] != "1es" && _sAppContext != "Writer";
    },
    _g_sugg_g1_6: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].slice(0,-2)+"ᵉˢ";
    },
    _g_cond_g1_15: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"].endsWith("s");
    },
    _g_sugg_g1_7: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/mes/g, "").replace(/è/g, "").replace(/e/g, "").replace(/i/g, "") + "ᵉˢ";
    },
    _g_sugg_g1_8: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/me/g, "").replace(/è/g, "").replace(/e/g, "").replace(/i/g, "") + "ᵉ";
    },
    _g_cond_g1_16: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return _sAppContext != "Writer" && ! option("romain");
    },
    _g_cond_g1_17: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+1], ":G");
    },
    _g_cond_g1_18: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"].endsWith("s") || lToken[nTokenOffset+1]["sValue"].endsWith("S");
    },
    _g_sugg_g1_9: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/1/g, "₁").replace(/2/g, "₂").replace(/3/g, "₃").replace(/4/g, "₄").replace(/5/g, "₅").replace(/6/g, "₆").replace(/7/g, "₇").replace(/8/g, "₈").replace(/9/g, "₉").replace(/0/g, "₀");
    },
    _g_cond_g1_19: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"].gl_isDigit();
    },
    _g_da_g1_1: function (lToken, nTokenOffset, nLastToken) {
        return g_change_meta(lToken[nTokenOffset+1], "DATE");
    },
    _g_cond_g1_20: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! checkDate(lToken[nTokenOffset+1]["sValue"], lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g1_21: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), "^ +av(?:ant|) +J(?:C|ésus-Christ)") && ! checkDay(lToken[nTokenOffset+1]["sValue"], lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+4]["sValue"], lToken[nTokenOffset+6]["sValue"]);
    },
    _g_sugg_g1_10: function (lToken, nTokenOffset, nLastToken) {
        return getDay(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+4]["sValue"], lToken[nTokenOffset+6]["sValue"]);
    },
    _g_cond_g1_22: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), "^ +av(?:ant|) +J(?:C|ésus-Christ)") && ! checkDay(lToken[nTokenOffset+1]["sValue"], lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+5]["sValue"], lToken[nTokenOffset+7]["sValue"]);
    },
    _g_sugg_g1_11: function (lToken, nTokenOffset, nLastToken) {
        return getDay(lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+5]["sValue"], lToken[nTokenOffset+7]["sValue"]);
    },
    _g_cond_g1_23: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), "^ +av(?:ant|) +J(?:C|ésus-Christ)") && ! checkDay(lToken[nTokenOffset+1]["sValue"], lToken[nTokenOffset+4]["sValue"], lToken[nTokenOffset+6]["sValue"], lToken[nTokenOffset+8]["sValue"]);
    },
    _g_sugg_g1_12: function (lToken, nTokenOffset, nLastToken) {
        return getDay(lToken[nTokenOffset+4]["sValue"], lToken[nTokenOffset+6]["sValue"], lToken[nTokenOffset+8]["sValue"]);
    },
    _g_cond_g1_24: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), "^ +av(?:ant|) +J(?:C|ésus-Christ)") && ! checkDay(lToken[nTokenOffset+1]["sValue"], lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+4]["sValue"]);
    },
    _g_sugg_g1_13: function (lToken, nTokenOffset, nLastToken) {
        return getDay(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_g1_25: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), "^ +av(?:ant|) +J(?:C|ésus-Christ)") && ! checkDay(lToken[nTokenOffset+1]["sValue"], lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+4]["sValue"], lToken[nTokenOffset+5]["sValue"]);
    },
    _g_sugg_g1_14: function (lToken, nTokenOffset, nLastToken) {
        return getDay(lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+4]["sValue"], lToken[nTokenOffset+5]["sValue"]);
    },
    _g_cond_g1_26: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), "^ +av(?:ant|) +J(?:C|ésus-Christ)") && ! checkDay(lToken[nTokenOffset+1]["sValue"], lToken[nTokenOffset+4]["sValue"], lToken[nTokenOffset+5]["sValue"], lToken[nTokenOffset+6]["sValue"]);
    },
    _g_sugg_g1_15: function (lToken, nTokenOffset, nLastToken) {
        return getDay(lToken[nTokenOffset+4]["sValue"], lToken[nTokenOffset+5]["sValue"], lToken[nTokenOffset+6]["sValue"]);
    },
    _g_cond_g1_27: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NB]", ":V0e") && ! g_value(lToken[nLastToken+1], "|où|");
    },
    _g_cond_g1_28: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NB]", ":V0e");
    },
    _g_cond_g1_29: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NB]");
    },
    _g_cond_g1_30: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+3], "|aequo|nihilo|cathedra|absurdo|abrupto|");
    },
    _g_cond_g1_31: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+2], "|aequo|nihilo|cathedra|absurdo|abrupto|") && ! g_value(lToken[nTokenOffset], "|l’|");
    },
    _g_cond_g1_32: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|drive|plug|sit|");
    },
    _g_cond_g1_33: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+2], "|a|");
    },
    _g_cond_g1_34: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":D");
    },
    _g_cond_g1_35: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":[WA]", ":N", 6);
    },
    _g_sugg_g1_16: function (lToken, nTokenOffset, nLastToken) {
        return "quasi " + lToken[nTokenOffset+1]["sValue"].slice(6);
    },
    _g_cond_g1_36: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_merged_analyse(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], "-", ":");
    },
    _g_cond_g1_37: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && (g_morph(lToken[nTokenOffset+2], ":N") || g_merged_analyse(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], "-", ":"));
    },
    _g_cond_g1_38: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":D|<start>|>,") && g_merged_analyse(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], "-", ":");
    },
    _g_cond_g1_39: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":D") && g_merged_analyse(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], "-", ":");
    },
    _g_cond_g1_40: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return !(lToken[nTokenOffset+2]["sValue"] == "forme" && g_value(lToken[nLastToken+1], "|de|d’|")) && g_morph(lToken[nTokenOffset], ":D") && g_merged_analyse(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], "-", ":");
    },
    _g_da_g1_2: function (lToken, nTokenOffset, nLastToken) {
        return g_define_from(lToken[nTokenOffset+1], 7);
    },
    _g_cond_g1_41: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+2], ":[GYB]") && g_morph(lToken[nTokenOffset], ":(?:D|V0e)|<start>|>,") && g_merged_analyse(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], "-", ":N");
    },
    _g_cond_g1_42: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":V") && g_merged_analyse(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], "-", ":V");
    },
    _g_cond_g1_43: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+4], ":V") && g_merged_analyse(lToken[nTokenOffset+3], lToken[nTokenOffset+3+1], "-", ":V") && ! g_morph(lToken[nTokenOffset], ":R");
    },
    _g_cond_g1_44: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":(?:D|V0e)|<start>|>,") && g_merged_analyse(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], "-", ":N");
    },
    _g_cond_g1_45: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].gl_isLowerCase();
    },
    _g_cond_g1_46: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nLastToken+1], ":[WA]");
    },
    _g_cond_g1_47: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|si|s’|");
    },
    _g_cond_g1_48: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_value(lToken[nLastToken+1], "|et|") && g_morph(g_token(lToken, nLastToken+2), ":N"));
    },
    _g_cond_g1_49: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":G");
    },
    _g_cond_g1_50: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_value(lToken[nTokenOffset], "|par|") && g_value(g_token(lToken, nTokenOffset+1-2), "|un|"));
    },
    _g_cond_g1_51: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset] , ":D");
    },
    _g_cond_g1_52: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":D.*:[me]");
    },
    _g_cond_g1_53: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nLastToken+1], ":A.*:[me]:[si]");
    },
    _g_cond_g1_54: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":O[sv]");
    },
    _g_cond_g1_55: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":[DR]|<start>|>,");
    },
    _g_cond_g1_56: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! ( g_morph(lToken[nTokenOffset], ":R") && g_value(lToken[nLastToken+1], "|que|qu’|") );
    },
    _g_cond_g1_57: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|de|d’|");
    },
    _g_cond_g1_58: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ">en/|:D");
    },
    _g_cond_g1_59: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|guerre|guerres|");
    },
    _g_cond_g1_60: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":Cs|<start>") && g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1);
    },
    _g_cond_g1_61: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|<start>|") && g_morph(lToken[nTokenOffset+2], ":M");
    },
    _g_cond_g1_62: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|quatre|");
    },
    _g_cond_g1_63: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nLastToken+1], ":B:e:p");
    },
    _g_sugg_g1_17: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/-/g, " ");
    },
    _g_sugg_g1_18: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].replace(/-/g, " ");
    },
    _g_cond_g1_64: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|centre|aile|") && ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), "équipe");
    },
    _g_cond_g1_65: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), "équipe");
    },
    _g_cond_g1_66: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "[Pp]ar[ -]ci ?,? *$");
    },
    _g_cond_g1_67: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":V0", "", 2);
    },
    _g_sugg_g1_19: function (lToken, nTokenOffset, nLastToken) {
        return "y " + lToken[nTokenOffset+1]["sValue"].slice(2);
    },
    _g_sugg_g1_20: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/ /g, "-");
    },
    _g_cond_g1_68: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|dès|des|");
    },
    _g_sugg_g1_21: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/’/g, "-");
    },
    _g_tp_g1_1: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/’/g, "-");
    },
    _g_cond_g1_69: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nLastToken-2+1], lToken[nLastToken-2+2], 1, 1) && g_morph(lToken[nLastToken-2+1], ":V.*:1p", ":[GW]") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_1p_");
    },
    _g_cond_g1_70: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:1p", ":[GW]") && ! g_value(lToken[nTokenOffset+2], "|veuillons|sachons|");
    },
    _g_cond_g1_71: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:1p", ":[GW]") && ! g_value(lToken[nTokenOffset+2], "|veuillons|sachons|allons|venons|partons|");
    },
    _g_cond_g1_72: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nLastToken-2+1], lToken[nLastToken-2+2], 1, 1) && g_morph(lToken[nLastToken-2+1], ":V.*:2p", ":[GW]") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_2p_");
    },
    _g_cond_g1_73: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:2p", ":[GW]") && ! g_value(lToken[nTokenOffset+2], "|veuillez|sachez|");
    },
    _g_cond_g1_74: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:2p", ":[GW]") && ! g_value(lToken[nTokenOffset+2], "|veuillez|sachez|allez|venez|partez|");
    },
    _g_cond_g1_75: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":E", "", 0, -4);
    },
    _g_cond_g1_76: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":E", "", 0, -3);
    },
    _g_cond_g1_77: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+2], "|appeler|") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_que_") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_comme_");
    },
    _g_cond_g1_78: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[123][sp]", ">appeler/|:[NA]") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_que_") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_comme_");
    },
    _g_cond_g1_79: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1);
    },
    _g_sugg_g1_22: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"]+"’";
    },
    _g_cond_g1_80: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+3], "|t’|priori|posteriori|postériori|contrario|capella|fortiori|giorno|");
    },
    _g_cond_g1_81: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+4], "|il|ils|elle|elles|iel|iels|on|ont|");
    },
    _g_sugg_g1_23: function (lToken, nTokenOffset, nLastToken) {
        return "É"+lToken[nTokenOffset+1]["sValue"].slice(1);
    },
    _g_tp_g1_2: function (lToken, nTokenOffset, nLastToken) {
        return "É"+lToken[nTokenOffset+1]["sValue"].slice(1);
    },
    _g_cond_g1_82: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:[me]");
    },
    _g_cond_g1_83: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+1]["sValue"].gl_isUpperCase() && ! lToken[nTokenOffset+2]["sValue"].gl_isUpperCase();
    },
    _g_sugg_g1_24: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+2]["sValue"], ":[NA].*:[si]", true);
    },
    _g_cond_g1_84: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+1]["sValue"].gl_isUpperCase() && ! lToken[nTokenOffset+2]["sValue"].gl_isUpperCase() && ! g_value(lToken[nTokenOffset], "|tel|telle|");
    },
    _g_sugg_g1_25: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+2]["sValue"], ":[NA].*:[pi]", true);
    },
    _g_cond_g1_85: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+1]["sValue"].gl_isUpperCase() && ! lToken[nTokenOffset+2]["sValue"].gl_isUpperCase() && ! g_value(lToken[nTokenOffset], "|tels|telles|");
    },
    _g_cond_g1_86: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|l’|");
    },
    _g_cond_g1_87: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+3], "|peu|") || ! g_value(lToken[nTokenOffset+2], "|sous|");
    },
    _g_cond_g1_88: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), " en (?:a|aie|aies|ait|eut|eût|aura|aurait|avait)\\b");
    },
    _g_cond_g1_89: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|nuit|");
    },
    _g_sugg_g1_26: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].replace(/vrai/g, "exact");
    },
    _g_cond_g1_90: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":A|>un");
    },
    _g_cond_g1_91: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|de|des|du|d’|");
    },
    _g_sugg_g1_27: function (lToken, nTokenOffset, nLastToken) {
        return suggPlur(lToken[nTokenOffset+3]["sValue"], "", true);
    },
    _g_cond_g1_92: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nLastToken+1], ":D");
    },
    _g_cond_g1_93: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_morph(lToken[nLastToken-1+1], ":[PQ]") && g_morph(lToken[nTokenOffset], ":V0.*:1s"));
    },
    _g_sugg_g1_28: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nLastToken-1+1]["sValue"], ":1s");
    },
    _g_cond_g1_94: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_value(lToken[nLastToken-1+1], "|est|es|");
    },
    _g_cond_g1_95: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+2], "|soussigné|soussignée|") && ! g_morph(lToken[nTokenOffset], ":1s");
    },
    _g_sugg_g1_29: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+2]["sValue"], ":(?:1s|Ov)", false);
    },
    _g_sugg_g1_30: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nLastToken-1+1]["sValue"], ":(?:1s|Ov)", false);
    },
    _g_cond_g1_96: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":V0");
    },
    _g_sugg_g1_31: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nLastToken-1+1]["sValue"], ":2s");
    },
    _g_cond_g1_97: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:2s|V0|R)");
    },
    _g_sugg_g1_32: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nLastToken-1+1]["sValue"], ":(?:2s|Ov)", false);
    },
    _g_cond_g1_98: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_morph(lToken[nTokenOffset+2], ":[PQ]") && g_morph(lToken[nTokenOffset], ":V0.*:3s"));
    },
    _g_sugg_g1_33: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+2]["sValue"], ":3s");
    },
    _g_cond_g1_99: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && g_morph(lToken[nTokenOffset+2], ":3p");
    },
    _g_sugg_g1_34: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nLastToken-1+1]["sValue"], ":3s");
    },
    _g_cond_g1_100: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":3p");
    },
    _g_cond_g1_101: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":3s") && ! g_value(lToken[nTokenOffset], "|t’|") && ! g_value(lToken[nLastToken-1+1], "|c’|ce|ou|si|");
    },
    _g_sugg_g1_35: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+2]["sValue"], ":(?:3s|Ov)", false);
    },
    _g_cond_g1_102: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":3s") && ! g_value(lToken[nTokenOffset], "|t’|") && ! g_value(lToken[nLastToken-1+1], "|c’|ce|");
    },
    _g_sugg_g1_36: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nLastToken-1+1]["sValue"], ":(?:3s|Ov)", false);
    },
    _g_cond_g1_103: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":3s") && ! g_value(lToken[nTokenOffset], "|n’|m’|t’|s’|") && ! g_value(lToken[nLastToken-1+1], "|c’|ce|si|");
    },
    _g_sugg_g1_37: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+2]["sValue"], ":(?:3s|Oo)", false);
    },
    _g_cond_g1_104: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":3s") && ! g_value(lToken[nTokenOffset], "|n’|m’|t’|s’|") && ! g_value(lToken[nLastToken-1+1], "|c’|ce|");
    },
    _g_sugg_g1_38: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+2]["sValue"], ":3s", false);
    },
    _g_cond_g1_105: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ">(?:être|devoir|devenir|pouvoir|vouloir|savoir)/:V", ":3s");
    },
    _g_sugg_g1_39: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+3]["sValue"], ":3s");
    },
    _g_cond_g1_106: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[YP]") || g_morph(lToken[nTokenOffset+3], ":V", ">(?:être|devoir|devenir|pouvoir|vouloir|savoir)/");
    },
    _g_sugg_g1_40: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nLastToken-1+1]["sValue"].slice(0,-1)+"t";
    },
    _g_cond_g1_107: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|je|tu|il|elle|on|nous|vous|ils|elles|iel|iels|");
    },
    _g_sugg_g1_41: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+3]["sValue"], ":1p");
    },
    _g_sugg_g1_42: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nLastToken-1+1]["sValue"], ":1p");
    },
    _g_sugg_g1_43: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nLastToken-1+1]["sValue"], ":2p");
    },
    _g_sugg_g1_44: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+3]["sValue"], ":2p");
    },
    _g_cond_g1_108: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_morph(lToken[nTokenOffset+2], ":[PQ]") && g_morph(lToken[nTokenOffset], ":V0.*:3p"));
    },
    _g_sugg_g1_45: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+2]["sValue"], ":3p");
    },
    _g_cond_g1_109: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && g_morph(lToken[nTokenOffset+2], ":3s");
    },
    _g_sugg_g1_46: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nLastToken-1+1]["sValue"], ":3p");
    },
    _g_cond_g1_110: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":3s");
    },
    _g_cond_g1_111: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":3p") && ! g_value(lToken[nTokenOffset], "|t’|");
    },
    _g_sugg_g1_47: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+2]["sValue"], ":(?:3p|Ov)", false);
    },
    _g_sugg_g1_48: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+3]["sValue"], ":(?:3p|Ov)", false);
    },
    _g_cond_g1_112: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":[12]s");
    },
    _g_cond_g1_113: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nLastToken-1+1], ":1p");
    },
    _g_cond_g1_114: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nLastToken-1+1], ":2p");
    },
    _g_sugg_g1_49: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbInfi(lToken[nLastToken-1+1]["sValue"]);
    },
    _g_sugg_g1_50: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+4]["sValue"], ":(?:[123][sp]|Y)", false);
    },
    _g_sugg_g1_51: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+3]["sValue"], ":(?:[123][sp]|Y)", false);
    },
    _g_cond_g1_115: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":R");
    },
    _g_sugg_g1_52: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+2]["sValue"], ":(?:[123][sp]|Y)", false);
    },
    _g_cond_g1_116: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_1s_") && g_morph(lToken[nLastToken-1+1], ":1s", ":(?:E|G|W|M|J|3[sp])");
    },
    _g_cond_g1_117: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nLastToken-1+1], dTags, "_1s_") && ! g_morph(lToken[nTokenOffset], ":R") && g_morph(lToken[nLastToken-1+1], ":1s", ":(?:E|G|W|M|J|3[sp]|2p|1p)");
    },
    _g_cond_g1_118: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_1s_") && g_morph(lToken[nTokenOffset+1], ":1s", ":(?:E|G|W|M|J|3[sp]|N|A|Q)") && ! (lToken[nTokenOffset+1]["sValue"].gl_isTitle() && look(sSentence0.slice(0,lToken[1+nTokenOffset]["nStart"]), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]"));
    },
    _g_sugg_g1_53: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+1]["sValue"], ":3s");
    },
    _g_cond_g1_119: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_2s_") && g_morph(lToken[nLastToken-1+1], ":2s", ":(?:E|G|W|M|J|3[sp]|1p)");
    },
    _g_cond_g1_120: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nLastToken-1+1], dTags, "_2s_") && g_morph(lToken[nLastToken-1+1], ":2s", ":(?:E|G|W|M|J|3[sp]|1p)");
    },
    _g_cond_g1_121: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nLastToken-1+1], dTags, "_2s_") && ! g_morph(lToken[nTokenOffset], ":R") && g_morph(lToken[nLastToken-1+1], ":2s", ":(?:E|G|W|M|J|3[sp]|2p|1p)");
    },
    _g_cond_g1_122: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_2s_") && g_morph(lToken[nTokenOffset+1], ":2s", ":(?:E|G|W|M|J|3[sp]|N|A|Q|1p)") && ! (lToken[nTokenOffset+1]["sValue"].gl_isTitle() && look(sSentence0.slice(0,lToken[1+nTokenOffset]["nStart"]), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]"));
    },
    _g_cond_g1_123: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_1s_") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_2s_") && g_morph(lToken[nLastToken-1+1], ":[12]s", ":(?:E|G|W|M|J|3[sp]|2p|1p)");
    },
    _g_cond_g1_124: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nLastToken-1+1], dTags, "_1s_") && ! g_tag_before(lToken[nLastToken-1+1], dTags, "_2s_") && g_morph(lToken[nLastToken-1+1], ":[12]s", ":(?:E|G|W|M|J|3[sp]|2p|1p)");
    },
    _g_cond_g1_125: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nLastToken-1+1], dTags, "_1s_") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_2s_") && ! g_morph(lToken[nTokenOffset], ":R") && g_morph(lToken[nLastToken-1+1], ":[12]s", ":(?:E|G|W|M|J|3[sp]|2p|1p)");
    },
    _g_cond_g1_126: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_1s_") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_2s_") && ! (lToken[nTokenOffset+1]["sValue"].gl_isTitle() && look(sSentence0.slice(0,lToken[1+nTokenOffset]["nStart"]), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]")) && ! g_morph(lToken[nTokenOffset], ":[DA].*:p");
    },
    _g_cond_g1_127: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_1s_") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_2s_") && g_morph(lToken[nTokenOffset+1], ":[12]s", ":(?:E|G|W|M|J|3[sp]|2p|1p|V0e|N|A|Q)") && ! (lToken[nTokenOffset+1]["sValue"].gl_isTitle() && look(sSentence0.slice(0,lToken[1+nTokenOffset]["nStart"]), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]"));
    },
    _g_cond_g1_128: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_1s_") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_2s_");
    },
    _g_cond_g1_129: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_1s_") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_2s_") && ! (lToken[nTokenOffset+1]["sValue"].gl_isTitle() && look(sSentence0.slice(0,lToken[1+nTokenOffset]["nStart"]), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]")) && ! g_morph(lToken[nTokenOffset], ":(?:R|D.*:p)");
    },
    _g_cond_g1_130: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_1s_") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_2s_") && ! (lToken[nTokenOffset+1]["sValue"].gl_isTitle() && look(sSentence0.slice(0,lToken[1+nTokenOffset]["nStart"]), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]"));
    },
    _g_cond_g1_131: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":1p", ":[EGMNAJ]") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_1p_") && ! (lToken[nTokenOffset+1]["sValue"].gl_isTitle() && look(sSentence0.slice(0,lToken[1+nTokenOffset]["nStart"]), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]"));
    },
    _g_sugg_g1_54: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+1]["sValue"], ":3p");
    },
    _g_cond_g1_132: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":2p", ":[EGMNAJ]") && ! g_tag_before(lToken[nTokenOffset+2], dTags, "_2p_") && ! (lToken[nTokenOffset+1]["sValue"].gl_isTitle() && look(sSentence0.slice(0,lToken[1+nTokenOffset]["nStart"]), "[a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆᴀ-ᶿ]"));
    },
    _g_cond_g1_133: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+4], ":K:1s", ">(?:aimer|vouloir)/");
    },
    _g_sugg_g1_55: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+4]["sValue"].slice(0,-1);
    },
    _g_cond_g1_134: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+5], ":K:1s", ">(?:aimer|vouloir)/");
    },
    _g_sugg_g1_56: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+5]["sValue"].slice(0,-1);
    },
    _g_cond_g1_135: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+6], ":K:1s", ">(?:aimer|vouloir)/");
    },
    _g_sugg_g1_57: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+6]["sValue"].slice(0,-1);
    },
    _g_cond_g1_136: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+7], ":K:1s", ">(?:aimer|vouloir)/");
    },
    _g_sugg_g1_58: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+7]["sValue"].slice(0,-1);
    },
    _g_cond_g1_137: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+1]["sValue"].gl_isUpperCase() && lToken[nTokenOffset+2]["sValue"].gl_isLowerCase();
    },
    _g_cond_g1_138: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"] == "l’";
    },
    _g_cond_g1_139: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+1]["sValue"].gl_isUpperCase() && lToken[nTokenOffset+3]["sValue"].gl_isLowerCase();
    },
    _g_sugg_g1_59: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+2]["sValue"], ":[NA]:[fe]:[si]", true);
    },
    _g_cond_g1_140: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].gl_isLowerCase() && ! g_value(lToken[nTokenOffset], "|le|la|les|") && hasSimil(lToken[nTokenOffset+2]["sValue"], ":[NA]:[fe]:[si]");
    },
    _g_cond_g1_141: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], "V.....[pqx]");
    },
    _g_cond_g1_142: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+2], ":V0") && hasSimil(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g1_143: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+1]["sValue"].gl_isUpperCase();
    },
    _g_sugg_g1_60: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+2]["sValue"], ":[NA]:[me]:[si]", true);
    },
    _g_cond_g1_144: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].gl_isLowerCase() && ! g_value(lToken[nTokenOffset], "|le|la|les|");
    },
    _g_cond_g1_145: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].gl_isLowerCase() && ! g_value(lToken[nTokenOffset+2], "|sortir|");
    },
    _g_cond_g1_146: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].gl_isLowerCase() && ! g_value(lToken[nTokenOffset+2], "|faire|sont|soit|fut|fût|serait|sera|seront|soient|furent|fussent|seraient|peut|pouvait|put|pût|pourrait|pourra|doit|dut|dût|devait|devrait|devra|") && hasSimil(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_sugg_g1_61: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+2]["sValue"], ":[NA]:.:[si]", true);
    },
    _g_cond_g1_147: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+3]["sValue"].gl_isLowerCase();
    },
    _g_sugg_g1_62: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+3]["sValue"], ":[NA]:[me]:[si]", true);
    },
    _g_cond_g1_148: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|dont|l’|d’|sauf|excepté|qu’|") && ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "(?i)\\bun à +$") && ! g_morph(lToken[nTokenOffset+2], ":V0");
    },
    _g_sugg_g1_63: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+2]["sValue"], ":[NAQ]:[me]:[si]", true);
    },
    _g_sugg_g1_64: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+2]["sValue"], ":[NA]:.:[pi]", true);
    },
    _g_cond_g1_149: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && g_morph(lToken[nTokenOffset+2], ":1p");
    },
    _g_cond_g1_150: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && g_morph(lToken[nTokenOffset+2], ":2p");
    },
    _g_sugg_g1_65: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+2]["sValue"], ":[NA]:[me]:[pi]", true);
    },
    _g_cond_g1_151: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].gl_isLowerCase() && ! g_value(lToken[nTokenOffset], "|le|la|les|") && hasSimil(lToken[nTokenOffset+2]["sValue"], ":[NA]:[fe]:[pi]");
    },
    _g_sugg_g1_66: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+2]["sValue"], ":[NA]:[fe]:[pi]", true);
    },
    _g_cond_g1_152: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].gl_isLowerCase() && ! g_value(lToken[nTokenOffset+2], "|soient|soit|sois|puisse|puisses|puissent|");
    },
    _g_sugg_g1_67: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+3]["sValue"], ":[NA]", true);
    },
    _g_cond_g1_153: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|un|une|");
    },
    _g_cond_g1_154: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+2]["sValue"].gl_isTitle() && ! g_value(lToken[nTokenOffset+2], "|jure|");
    },
    _g_sugg_g1_68: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+2]["sValue"], ":[NA]", true);
    },
    _g_cond_g1_155: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+3]["sValue"].gl_isTitle();
    },
    _g_sugg_g1_69: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+3]["sValue"], ":[NA]:.:[si]", true);
    },
    _g_cond_g1_156: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 0, 1) && g_morph(lToken[nTokenOffset+3], ":[NAQ].*:[me]", ":[YG]") && ! lToken[nTokenOffset+3]["sValue"].gl_isTitle() && ! (g_value(lToken[nTokenOffset+3], "|mal|") && g_morph(lToken[nLastToken+1], ":Y"));
    },
    _g_cond_g1_157: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[123][sp]");
    },
    _g_sugg_g1_70: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbInfi(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g1_158: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[123][sp]", ":[NAQ]") && ! lToken[nTokenOffset+3]["sValue"].gl_isTitle();
    },
    _g_cond_g1_159: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":V1.*:(?:Iq|Ip:2p)", ":1p");
    },
    _g_cond_g1_160: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return hasSimil(lToken[nTokenOffset+3]["sValue"], ":(?:[NA]:[fe]:[si])");
    },
    _g_sugg_g1_71: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+3]["sValue"], ":(?:[NA]:[fe]:[si])", true);
    },
    _g_cond_g1_161: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+3]["sValue"].gl_isTitle() && ! g_value(lToken[nTokenOffset], "|plus|moins|");
    },
    _g_cond_g1_162: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nLastToken-1+1]["sValue"].gl_isTitle();
    },
    _g_sugg_g1_72: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nLastToken-1+1]["sValue"], ":[NA]", true);
    },
    _g_cond_g1_163: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+3]["sValue"].gl_isTitle() && ! g_value(lToken[nTokenOffset], "|un|une|");
    },
    _g_cond_g1_164: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+2]["sValue"].gl_isTitle();
    },
    _g_cond_g1_165: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":V[123].*:[123][sp]|>(?:pouvoir|vouloir|falloir)/");
    },
    _g_sugg_g1_73: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nTokenOffset+5]["sValue"]);
    },
    _g_cond_g1_166: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":", ":P");
    },
    _g_cond_g1_167: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":R") && g_morph(lToken[nTokenOffset+2], ":[NAQ]", ":[PG]");
    },
    _g_cond_g1_168: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":3p");
    },
    _g_sugg_g1_74: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbTense(lToken[nTokenOffset+3]["sValue"], ":PQ", ":P");
    },
    _g_cond_g1_169: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_value(lToken[nTokenOffset+2], "|m’|t’|s’|");
    },
    _g_sugg_g1_75: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].slice(0,1) + "’en";
    },
    _g_cond_g1_170: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+3], ":[NA]");
    },
    _g_cond_g1_171: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+1]["sValue"].gl_isUpperCase() && ! g_value(lToken[nTokenOffset+3], "|importe|");
    },
    _g_cond_g1_172: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|n’|");
    },
    _g_cond_g1_173: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":Q") && ! g_morph(lToken[nTokenOffset], ":(?:V0a|R)");
    },
    _g_sugg_g1_76: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nLastToken-1+1]["sValue"], ":m:s")+"|"+suggVerbInfi(lToken[nLastToken-1+1]["sValue"])+"|"+suggVerbTense(lToken[nLastToken-1+1]["sValue"], ":Iq", ":3s");
    },
    _g_sugg_g1_77: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nLastToken-1+1]["sValue"], ":f:s")+"|"+suggVerbTense(lToken[nLastToken-1+1]["sValue"], ":Iq", ":3s");
    },
    _g_sugg_g1_78: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nLastToken-1+1]["sValue"], ":[NA]");
    },
    _g_cond_g1_174: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_ceque_") && ! g_value(lToken[nTokenOffset], "|ou|");
    },
    _g_cond_g1_175: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+2]["sValue"].gl_isTitle() && ! g_morph(lToken[nTokenOffset], ":[NA]:[me]:si");
    },
    _g_cond_g1_176: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+3], ">(?:être|devenir|redevenir|rester|sembler|demeurer|para[îi]tre)/") && g_morph(lToken[nTokenOffset+2], ":(?:Y|[123][sp])", ":[AQ]");
    },
    _g_sugg_g1_79: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g1_177: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+3], ">(?:être|devenir|redevenir|rester|sembler|demeurer|para[îi]tre)/") && g_morph(lToken[nTokenOffset+2], ":A.*:p", ":[si]");
    },
    _g_sugg_g1_80: function (lToken, nTokenOffset, nLastToken) {
        return suggSing(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g1_178: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+3], ">(?:être|devenir|redevenir|rester|sembler|demeurer|para[îi]tre)/") && g_morph(lToken[nTokenOffset+2], ":A.*:[fp]", ":[me]:[si]");
    },
    _g_sugg_g1_81: function (lToken, nTokenOffset, nLastToken) {
        return suggMasSing(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g1_179: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+3], ">(?:être|devenir|redevenir|rester|sembler|demeurer|para[îi]tre)/") && g_morph(lToken[nTokenOffset+2], ":A.*:[mp]", ":[fe]:[si]");
    },
    _g_sugg_g1_82: function (lToken, nTokenOffset, nLastToken) {
        return suggFemSing(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g1_180: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+3], ">(?:être|devenir|redevenir|rester|sembler|demeurer|para[îi]tre)/") && g_morph(lToken[nTokenOffset+2], ":A.*:s", ":[pi]");
    },
    _g_sugg_g1_83: function (lToken, nTokenOffset, nLastToken) {
        return suggPlur(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g1_181: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+3], ">(?:être|devenir|redevenir|rester|sembler|demeurer|para[îi]tre)/") && g_morph(lToken[nTokenOffset+2], ":A.*:[sf]", ":[me]:[pi]");
    },
    _g_sugg_g1_84: function (lToken, nTokenOffset, nLastToken) {
        return suggMasPlur(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g1_182: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+3], ">(?:être|devenir|redevenir|rester|sembler|demeurer|para[îi]tre)/") && g_morph(lToken[nTokenOffset+2], ":A.*:[sm]", ":[fe]:[pi]");
    },
    _g_sugg_g1_85: function (lToken, nTokenOffset, nLastToken) {
        return suggFemPlur(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g1_183: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_ceque_");
    },
    _g_cond_g1_184: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+2], "|envie|");
    },
    _g_sugg_g1_86: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+2]["sValue"], ":[AW]", true);
    },
    _g_cond_g1_185: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":V1.*:Y", ":[AW]");
    },
    _g_cond_g1_186: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+4]["sValue"] == "soie" || lToken[nTokenOffset+4]["sValue"] == "soies";
    },
    _g_cond_g1_187: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+4], ":V", ":3[sp]");
    },
    _g_cond_g1_188: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":A.*:p", ":[is]");
    },
    _g_cond_g1_189: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":A.*:s", ":[ip]");
    },
    _g_cond_g1_190: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|moins|plus|mieux|");
    },
    _g_cond_g1_191: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+1]["sValue"].gl_isUpperCase() && ! g_value(lToken[nLastToken+1], "|côté|coup|pic|peine|peu|plat|propos|valoir|");
    },
    _g_cond_g1_192: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+1]["sValue"].gl_isUpperCase() && ! g_value(lToken[nLastToken+1], "|côté|coup|pic|peine|peu|plat|propos|valoir|") && ! g_morph(lToken[nTokenOffset], ">venir/");
    },
    _g_cond_g1_193: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:3s|R)") && ! g_morph(lToken[nLastToken+1], ":Oo|>quo?i/");
    },
    _g_cond_g1_194: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D");
    },
    _g_cond_g1_195: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].gl_isLowerCase() && ! g_value(lToken[nTokenOffset+2], "|coté|sont|");
    },
    _g_cond_g1_196: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":(?:V.......[_z][az].*:Q|V1.*:Ip:2p)", ":[MGWNY]");
    },
    _g_cond_g1_197: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && g_morph(lToken[nTokenOffset+2], "V1.*:(?:Ip:2p|Q)", "*") && ! g_value(lToken[nTokenOffset], "|il|elle|on|n’|les|l’|m’|t’|s’|d’|en|y|lui|nous|vous|leur|");
    },
    _g_sugg_g1_87: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbInfi(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g1_198: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nTokenOffset+2], ":[123][sp]", "*") && ! g_value(lToken[nTokenOffset+2], "|tord|tords|");
    },
    _g_cond_g1_199: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":V2.*:I[ps]:3s", "*");
    },
    _g_sugg_g1_88: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nTokenOffset+2]["sValue"], ":m:s");
    },
    _g_cond_g1_200: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo;
    },
    _g_cond_g1_201: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|il|elle|iel|on|n’|m’|t’|l’|") && ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "(?i)\\bqu[e’] |n’(?:en|y) +$");
    },
    _g_cond_g1_202: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":N", ":Ov");
    },
    _g_cond_g1_203: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:D.*:f:s|A.*:[fe]:[si])|>en/");
    },
    _g_cond_g1_204: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":[VN]|<start>", "*");
    },
    _g_cond_g1_205: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":Ov|>(?:il|elle)/");
    },
    _g_cond_g1_206: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_value(lToken[nTokenOffset+3], "|sur|") && g_value(lToken[nTokenOffset], "|tout|par|") && g_value(lToken[nTokenOffset+2], "|coup|"));
    },
    _g_cond_g1_207: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ">(?:cadeau|offrande|présent)");
    },
    _g_cond_g1_208: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_value(lToken[nTokenOffset+1], "|à|") && g_value(lToken[nTokenOffset+2], "|tue-tête|"));
    },
    _g_cond_g1_209: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|l’|n’|il|elle|on|y|") && ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "(?i)n’en +$");
    },
    _g_cond_g1_210: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].gl_isLowerCase() && ! g_value(lToken[nTokenOffset+3], "|accès|bon|bonne|beau|besoin|charge|confiance|connaissance|conscience|crainte|droit|envie|été|faim|grand|grande|hâte|honte|interdiction|lieu|mauvaise|peine|peur|raison|rapport|recours|soif|tendance|terre|tort|vent|vocation|") && g_morph(lToken[nTokenOffset+1], ":N", "*");
    },
    _g_cond_g1_211: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ">(?:falloir|aller|pouvoir)/", ">que/");
    },
    _g_cond_g1_212: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ">(?:être|rester|demeurer)/");
    },
    _g_cond_g1_213: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|l’|d’|") && ! g_tag(lToken[nTokenOffset], "_en_");
    },
    _g_cond_g1_214: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":V", "*") && ! g_tag(lToken[nTokenOffset], "_en_");
    },
    _g_cond_g1_215: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|le|du|");
    },
    _g_cond_g1_216: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|les|des|");
    },
    _g_sugg_g1_89: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].replace(/scé/g, "cé").replace(/SCÉ/g, "CÉ");
    },
    _g_sugg_g1_90: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].replace(/cé/g, "scé").replace(/CÉ/g, "SCÉ");
    },
    _g_sugg_g1_91: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].replace(/a/g, "â").replace(/A/g, "Â");
    },
    _g_cond_g1_217: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], "<start>|,|:D");
    },
    _g_sugg_g1_92: function (lToken, nTokenOffset, nLastToken) {
        return "à "+ lToken[nTokenOffset+2]["sValue"].replace(/on/g, "es").replace(/ON/g, "ES").replace(/otre/g, "os").replace(/OTRE/g, "OS").replace(/eur/g, "eurs").replace(/EUR/g, "EURS") + " dépens";
    },
    _g_sugg_g1_93: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nLastToken-1+1]["sValue"].replace(/é/g, "ée").replace(/É/g, "ÉE");
    },
    _g_cond_g1_218: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|du|");
    },
    _g_cond_g1_219: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ">(?:appeler|considérer|trouver)/");
    },
    _g_cond_g1_220: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_value(lToken[nTokenOffset+2], "|ou|") && g_value(lToken[nLastToken+1], "|son|ses|")) && g_morph(lToken[nTokenOffset+1], ":D");
    },
    _g_cond_g1_221: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"] != "SA";
    },
    _g_cond_g1_222: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|oh|ah|") && ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), "^ +et là");
    },
    _g_cond_g1_223: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 0, 0) && ! (g_value(lToken[nTokenOffset+2], "|a|") && g_value(lToken[nLastToken+1], "|été|"));
    },
    _g_cond_g1_224: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_value(lToken[nLastToken+1], "|été|");
    },
    _g_cond_g1_225: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), "^ +en +heure");
    },
    _g_sugg_g1_94: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/o/g, "a").replace(/O/g, "A");
    },
    _g_cond_g1_226: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+2], ":[NA]");
    },
    _g_cond_g1_227: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+1]["sValue"].gl_isUpperCase() && lToken[nTokenOffset+2]["sValue"].gl_isLowerCase() && ! g_value(lToken[nTokenOffset+2], "|faire|");
    },
    _g_cond_g1_228: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+1]["sValue"].gl_isUpperCase() && ! g_value(lToken[nTokenOffset+2], "|quelques|");
    },
    _g_cond_g1_229: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|que|qu’|");
    },
    _g_cond_g1_230: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"] == "a";
    },
    _g_cond_g1_231: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (lToken[nTokenOffset+3]["sValue"] == "ce" && g_value(lToken[nLastToken+1], "|moment|"));
    },
    _g_sugg_g1_95: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/tt/g, "t").replace(/TT/g, "T");
    },
    _g_cond_g1_232: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+1], ":Q|>(?:profiter|bénéficier|nombre|tant)/") && ! g_morph(lToken[nLastToken+1], ">(?:financi[eè]re?|pécuni(?:er|aire)|sociaux)s?/");
    },
    _g_cond_g1_233: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morphVC(lToken[nTokenOffset+1], ">(?:profiter|bénéficier)/") && ! g_morph(lToken[nLastToken+1], ">(?:financière|pécuni(?:er|aire)|sociale)/");
    },
    _g_sugg_g1_96: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/nud/g, "nu").replace(/NUD/g, "NU");
    },
    _g_cond_g1_234: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:D.*:p|B)|>de/");
    },
    _g_cond_g1_235: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|un|une|les|ces|mes|tes|ses|nos|vos|leurs|quelques|plusieurs|");
    },
    _g_cond_g1_236: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && hasSimil(lToken[nTokenOffset+2]["sValue"], ":[NA].*:[pi]");
    },
    _g_cond_g1_237: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|%|") && ! g_morph(lToken[nTokenOffset], ":B|>(?:pourcent|barre|seuil|aucun|plusieurs|certaine?s|une?)/");
    },
    _g_cond_g1_238: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":R|>(?:approcher|anniversaire|cap|célébration|commémoration|occasion|passage|programme|terme|classe|délai|échéance|autour|celui|ceux|celle|celles)/") && ! g_value(lToken[nLastToken+1], "|de|du|des|d’|") && ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "% +$");
    },
    _g_cond_g1_239: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":R|>(?:approcher|cap|passage|programme|terme|classe|autour|celui|ceux|celle|celles|au-delà)/") && ! g_value(lToken[nLastToken+1], "|de|du|des|d’|") && ! g_value(lToken[nTokenOffset+2], "|35|39|40|48|");
    },
    _g_cond_g1_240: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":R|>(?:approcher|cap|passage|programme|terme|classe|autour|celui|ceux|celle|celles)/") && ! g_value(lToken[nLastToken+1], "|de|du|des|d’|");
    },
    _g_cond_g1_241: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":E");
    },
    _g_sugg_g1_97: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].replace(/que/g, "c").replace(/QUE/g, "C");
    },
    _g_cond_g1_242: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":W");
    },
    _g_sugg_g1_98: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/nd/g, "nt").replace(/ND/g, "NT");
    },
    _g_sugg_g1_99: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nLastToken-1+1]["sValue"].replace(/nd/g, "nt").replace(/ND/g, "NT");
    },
    _g_cond_g1_243: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":[NA].*:[fe]:[pi]", ":G");
    },
    _g_cond_g1_244: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":[DB]") && g_morph(lToken[nTokenOffset+2], ":N", ":[GAWM]");
    },
    _g_cond_g1_245: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|de|d’|des|du|") && ! g_value(g_token(lToken, nLastToken+2), "|de|d’|des|du|");
    },
    _g_cond_g1_246: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nLastToken+1], ":[NA].*:[me]");
    },
    _g_cond_g1_247: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|que|qu’|sûr|davantage|entendu|d’|avant|souvent|longtemps|des|moins|plus|trop|loin|au-delà|") && ! g_morph(lToken[nLastToken+1], ":[YAW]");
    },
    _g_cond_g1_248: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_value(lToken[nTokenOffset+1], "|emballé|") && g_value(lToken[nLastToken-1+1], "|pesé|")) && g_morph(lToken[nTokenOffset], ":C|<start>|>,");
    },
    _g_cond_g1_249: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":V", ":A");
    },
    _g_cond_g1_250: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|n’|") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_2p_");
    },
    _g_sugg_g1_100: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/a/g, "").replace(/A/g, "");
    },
    _g_cond_g1_251: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|il|ils|ne|en|y|leur|lui|nous|vous|me|te|se|la|le|les|qui|<start>|,|");
    },
    _g_sugg_g1_101: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/c/g, "").replace(/C/g, "");
    },
    _g_sugg_g1_102: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/an/g, "anc").replace(/AN/g, "ANC");
    },
    _g_sugg_g1_103: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/au/g, "o").replace(/AU/g, "O");
    },
    _g_sugg_g1_104: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/o/g, "au").replace(/O/g, "AU");
    },
    _g_cond_g1_252: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":(?:[123][sp]|Y)", "*") && ! g_value(lToken[nLastToken+1], "|civile|commerciale|froide|mondiale|nucléaire|préventive|psychologique|sainte|totale|");
    },
    _g_cond_g1_253: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":D.*:f:s");
    },
    _g_sugg_g1_105: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/û/g, "u");
    },
    _g_cond_g1_254: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":[123][sp]", ":[GQ]");
    },
    _g_cond_g1_255: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+4], ":[123][sp]", ":[GQ]");
    },
    _g_cond_g1_256: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+5], ":[123][sp]", ":[GQ]");
    },
    _g_cond_g1_257: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+1]["sValue"].gl_isUpperCase() && ! lToken[nTokenOffset+2]["sValue"].gl_isUpperCase() && ! g_morph(lToken[nTokenOffset], ":E|>le/");
    },
    _g_sugg_g1_106: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].slice(0,-2)+"là";
    },
    _g_sugg_g1_107: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].slice(0,-2)+"là";
    },
    _g_cond_g1_258: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":V", ":[NA]", 0, -3);
    },
    _g_cond_g1_259: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":V...t");
    },
    _g_sugg_g1_108: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].slice(0,-3)+"-la|" + lToken[nTokenOffset+1]["sValue"].slice(0,-3)+" là";
    },
    _g_sugg_g1_109: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].slice(0,-3)+" là";
    },
    _g_cond_g1_260: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":D|<start>|,");
    },
    _g_cond_g1_261: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":V") && ! g_tag(lToken[nTokenOffset], "_en_");
    },
    _g_cond_g1_262: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ">[ld]es/");
    },
    _g_cond_g1_263: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":3s");
    },
    _g_cond_g1_264: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], "<start>|:C|>,/");
    },
    _g_cond_g1_265: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], "<start>|:C|>,/") && g_analyse(lToken[nLastToken-1+1], ":(?:Q|V1.*:Y)", ":N.*:[fe]");
    },
    _g_cond_g1_266: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_analyse(lToken[nLastToken-1+1], ":(?:Q|V1.*:Y)", ":N.*:[fe]");
    },
    _g_cond_g1_267: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:3p|D)");
    },
    _g_cond_g1_268: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return (lToken[nTokenOffset+1]["sValue"].gl_isLowerCase() || g_value(lToken[nTokenOffset], "|<start>|,|")) && lToken[nTokenOffset+2]["sValue"].gl_isLowerCase();
    },
    _g_cond_g1_269: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|père|");
    },
    _g_cond_g1_270: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|le|la|les|du|des|au|aux|");
    },
    _g_cond_g1_271: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:m:[si]");
    },
    _g_cond_g1_272: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":V.*:3s") && ! look(sSentence0.slice(0,lToken[1+nTokenOffset]["nStart"]), "’$");
    },
    _g_cond_g1_273: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[VR]|<start>") && ! g_morph(lToken[nLastToken+1], ":(?:3s|Ov)");
    },
    _g_cond_g1_274: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|il|ils|elle|elles|iel|iels|");
    },
    _g_sugg_g1_110: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].slice(0,-1);
    },
    _g_cond_g1_275: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && ! g_value(lToken[nTokenOffset+2], "|soit|") && g_morph(lToken[nTokenOffset+2], ":3s");
    },
    _g_cond_g1_276: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D") && ! g_value(lToken[nLastToken+1], "|depuis|à|");
    },
    _g_sugg_g1_111: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/a/g, "â").replace(/A/g, "Â");
    },
    _g_cond_g1_277: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:[me]|>(?:grande|petite)/");
    },
    _g_cond_g1_278: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-3+1], ":V");
    },
    _g_cond_g1_279: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":V");
    },
    _g_sugg_g1_112: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+3]["sValue"].replace(/pé/g, "pê").replace(/Pé/g, "Pê").replace(/PÉ/g, "PÊ");
    },
    _g_sugg_g1_113: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/pé/g, "pê").replace(/Pé/g, "Pê").replace(/PÉ/g, "PÊ");
    },
    _g_cond_g1_280: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ">(?:très|en|un|de|du)/");
    },
    _g_cond_g1_281: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":C|<start>");
    },
    _g_cond_g1_282: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|quelqu’|l’|d’|sauf|");
    },
    _g_cond_g1_283: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+2], ">seul/") && ! g_morph(lToken[nTokenOffset], ">(?:je|tu|il|on|ne)/");
    },
    _g_sugg_g1_114: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/n/g, "nt").replace(/N/g, "NT");
    },
    _g_cond_g1_284: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|la|en|une|") && ! g_value(lToken[nLastToken+1], "|position|dance|");
    },
    _g_cond_g1_285: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":Y|<start>");
    },
    _g_sugg_g1_115: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/om/g, "au").replace(/OM/g, "AU");
    },
    _g_sugg_g1_116: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/au/g, "om").replace(/AU/g, "OM");
    },
    _g_cond_g1_286: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|peu|de|") && ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "(?i)\\bau plus $");
    },
    _g_cond_g1_287: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D") && ! g_morph(g_token(lToken, nTokenOffset+1-2), ">obtenir/");
    },
    _g_cond_g1_288: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":D.*:[pm]");
    },
    _g_cond_g1_289: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":D.*:[mp]|<start>");
    },
    _g_cond_g1_290: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ">(?:arriver|venir|à|revenir|partir|repartir|aller|de)/") && ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), "^ +[mts]on tour[, ]");
    },
    _g_cond_g1_291: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ">(?:arriver|venir|à|revenir|partir|repartir|aller|de)/");
    },
    _g_cond_g1_292: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+2], "|à|au|aux|");
    },
    _g_cond_g1_293: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), "^ ne s(?:ai[st]|u[ts]|avai(?:s|t|ent)|urent) ");
    },
    _g_cond_g1_294: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+2], ">(?:déduire|penser)/");
    },
    _g_cond_g1_295: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_value(lToken[nTokenOffset+2], "|en|ne|")  && g_morph(lToken[nLastToken+1], ":V0e"));
    },
    _g_cond_g1_296: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].gl_isLowerCase() && ! (g_morph(lToken[nTokenOffset+2], ">(?:pouvoir|devoir|aller)/") && (g_morph(lToken[nLastToken+1], ":V0e") || g_morph(g_token(lToken, nLastToken+2), ":V0e"))) && ! (g_morph(lToken[nTokenOffset+2], ":V0a") && g_value(lToken[nLastToken+1], "|été|"));
    },
    _g_cond_g1_297: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_value(lToken[nTokenOffset+2], "|en|ne|") && g_morph(lToken[nLastToken+1], ":V0e"));
    },
    _g_sugg_g1_117: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].replace(/éson/g, "aison").replace(/ÉSON/g, "AISON");
    },
    _g_sugg_g1_118: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/è/g, "ai").replace(/È/g, "AI");
    },
    _g_sugg_g1_119: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nLastToken-1+1]["sValue"].replace(/ai/g, "è").replace(/AI/g, "È");
    },
    _g_sugg_g1_120: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/ai/g, "è").replace(/AI/g, "È");
    },
    _g_cond_g1_298: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":(?:R|[123][sp])|<start>");
    },
    _g_sugg_g1_121: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].replace(/sen/g, "cen").replace(/Cen/g, "Sen").replace(/CEN/g, "SEN");
    },
    _g_cond_g1_299: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":(?:[123]s|Q)");
    },
    _g_cond_g1_300: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nTokenOffset+3], ":(?:[123]p|Y|P)");
    },
    _g_cond_g1_301: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+1]["sValue"].gl_isUpperCase() && ! g_value(lToken[nTokenOffset], "|ne|il|ils|on|");
    },
    _g_sugg_g1_122: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+2]["sValue"], ":[AWGT]", true);
    },
    _g_cond_g1_302: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+1]["sValue"].gl_isUpperCase() && ! g_value(lToken[nTokenOffset], "|ne|il|ils|on|") && ! (g_morph(lToken[nTokenOffset+2], ":V0") && g_morph(lToken[nTokenOffset+3], ":[QY]"));
    },
    _g_cond_g1_303: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nLastToken-2+1]["sValue"].gl_isLowerCase() && g_morph(lToken[nTokenOffset+2], ":M");
    },
    _g_cond_g1_304: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[si]");
    },
    _g_cond_g1_305: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[pi]");
    },
    _g_cond_g1_306: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[pi]", ":3p");
    },
    _g_cond_g1_307: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_value(lToken[nLastToken-1+1], "|soit|") && look(sSentence.slice(lToken[nLastToken]["nEnd"]), " soit "));
    },
    _g_cond_g1_308: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken+1], ":[GY]|<end>", ">à/") && ! g_value(lToken[nTokenOffset], "|il|on|elle|n’|m’|t’|s’|") && ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "(?i)quel(?:s|les?|) qu[’ ]$") && ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), " soit ");
    },
    _g_cond_g1_309: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), " soit ");
    },
    _g_cond_g1_310: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":[YQ]|>(?:avec|contre|par|pour|sur)/|<start>|>,");
    },
    _g_cond_g1_311: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], "[123][sp]");
    },
    _g_cond_g1_312: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":(?:V|Cs|R)", ":(?:[NA].*:[pi]|Ov)") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_ceque_");
    },
    _g_cond_g1_313: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|ils|elles|iels|leur|lui|nous|vous|m’|t’|s’|l’|") && ! g_tag(lToken[nTokenOffset], "_ceque_");
    },
    _g_cond_g1_314: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:m:s");
    },
    _g_sugg_g1_123: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/u/g, "û").replace(/U/g, "Û");
    },
    _g_sugg_g1_124: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+3]["sValue"].replace(/u/g, "û").replace(/U/g, "Û");
    },
    _g_cond_g1_315: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_value(lToken[nTokenOffset+2], "|temps|") && g_value(lToken[nTokenOffset], "|temps|"));
    },
    _g_cond_g1_316: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_value(lToken[nLastToken+1], "|tel|tels|telle|telles|");
    },
    _g_cond_g1_317: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|je|tu|il|elle|iel|on|ne|n’|le|la|les|l’|me|m’|te|t’|se|s’|");
    },
    _g_sugg_g1_125: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/au/g, "ô").replace(/AU/g, "Ô");
    },
    _g_sugg_g1_126: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/è/g, "ê").replace(/È/g, "Ê");
    },
    _g_cond_g1_318: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_morph(lToken[nTokenOffset+2], ">trait/") && g_morph(lToken[nTokenOffset+3], ">(?:facial|vertical|horizontal|oblique|diagonal)/"));
    },
    _g_cond_g1_319: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":(?:D|A.*:m)");
    },
    _g_cond_g1_320: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":D|<start>|>,");
    },
    _g_cond_g1_321: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+2]["sValue"].gl_isTitle() && ! g_morph(lToken[nTokenOffset], ":O[os]|>(?:[ndmts]e|aller|falloir|pouvoir|savoir|vouloir|préférer|faire|penser|imaginer|souhaiter|désirer|espérer|de|à)/") && ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "(?i)\\b[ndmts](?:e |’(?:en |y ))(?:pas |jamais |) *$");
    },
    _g_cond_g1_322: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|part|");
    },
    _g_cond_g1_323: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ">agir/");
    },
    _g_cond_g1_324: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|j’|n’|il|elle|on|");
    },
    _g_cond_g1_325: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|avenu|");
    },
    _g_cond_g1_326: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|avenue|");
    },
    _g_cond_g1_327: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|avenus|");
    },
    _g_cond_g1_328: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|avenues|");
    },
    _g_cond_g1_329: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"].toLowerCase() != lToken[nLastToken-1+1]["sValue"].toLowerCase();
    },
    _g_cond_g1_330: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"].toLowerCase() != lToken[nLastToken-2+1]["sValue"].toLowerCase();
    },
    _g_sugg_g1_127: function (lToken, nTokenOffset, nLastToken) {
        return suggSing(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_sugg_g1_128: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].slice(0,-1);
    },
    _g_cond_g1_331: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+2]["sValue"].gl_isUpperCase() && ! g_value(lToken[nLastToken+1], "|saint|");
    },
    _g_sugg_g1_129: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].toLowerCase();
    },
    _g_cond_g1_332: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+2]["sValue"].gl_isUpperCase() && ! g_value(lToken[nLastToken+1], "|gras|saint|");
    },
    _g_cond_g1_333: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+1], ":M1") && ! lToken[nTokenOffset+2]["sValue"].gl_isUpperCase();
    },
    _g_cond_g1_334: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+2]["sValue"].gl_isUpperCase();
    },
    _g_cond_g1_335: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"] == "assemblée";
    },
    _g_sugg_g1_130: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+3]["sValue"].gl_toCapitalize();
    },
    _g_cond_g1_336: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+4]["sValue"].gl_isLowerCase();
    },
    _g_sugg_g1_131: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+4]["sValue"].gl_toCapitalize();
    },
    _g_cond_g1_337: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"] == "état";
    },
    _g_cond_g1_338: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"] == "états";
    },
    _g_cond_g1_339: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+3]["sValue"] == "état";
    },
    _g_cond_g1_340: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+4]["sValue"] == "état";
    },
    _g_cond_g1_341: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"].slice(0,1) == "é";
    },
    _g_sugg_g1_132: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/é/g, "É");
    },
    _g_cond_g1_342: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"].gl_isTitle() && g_morph(lToken[nTokenOffset], ":N", ":(?:A|V0e|D|R|B|X)");
    },
    _g_sugg_g1_133: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].toLowerCase();
    },
    _g_cond_g1_343: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"].gl_isLowerCase() && ! lToken[nTokenOffset+1]["sValue"].startsWith("canadienne") && ( g_value(lToken[nTokenOffset], "|certains|certaines|ce|cet|cette|ces|des|les|nos|vos|leurs|quelques|plusieurs|chaque|une|aux|la|ma|ta|sa|") || ( g_morph(lToken[nTokenOffset], ":B:e:p") && ! g_morph(g_token(lToken, nTokenOffset+1-2), ">numéro/") ) || ( g_value(lToken[nTokenOffset], "|l’|") && g_morph(lToken[nTokenOffset+1], ":N.*:f:[si]") ) || ( g_value(lToken[nTokenOffset], "|de|d’|") && g_morph(g_token(lToken, nTokenOffset+1-2), ">(?:beaucoup|énormément|multitude|tant|tellement|poignée|groupe|car|bus|équipe|plus|moins|pas|trop|majorité|millier|million|centaine|dizaine|douzaine|combien|photo|complot|enlèvement|témoignage|viol|meurtre|assassinat|duel|tiers|quart|pourcentage|proportion|génération|portrait|rencontre|reportage|parole|communauté|vie|rassemblement|bataillon|armée|émigration|immigration|invasion|trio|couple|famille|descendante|action|attente|désir|souhait|vote|volonté)/") ) || ( g_value(lToken[nTokenOffset], "|un|") && ! g_value(g_token(lToken, nTokenOffset+1-2), "|dans|numéro|") && ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), "(?:approximatif|correct|courant|parfait|facile|aisé|impeccable|incompréhensible)") ) );
    },
    _g_sugg_g1_134: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].gl_toCapitalize();
    },
    _g_sugg_g1_135: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].gl_toCapitalize();
    },
    _g_cond_g1_344: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+3]["sValue"].gl_isUpperCase();
    },
    _g_sugg_g1_136: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+3]["sValue"].toLowerCase();
    },
    _g_cond_g1_345: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"].gl_isLowerCase() && lToken[nTokenOffset+2]["sValue"].gl_isLowerCase();
    },
    _g_cond_g1_346: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":(?:D.*:p|R|C)");
    },
    _g_cond_g1_347: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ">(?:d[eu]|avant|après|malgré)/");
    },
    _g_cond_g1_348: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && hasFemForm(lToken[nTokenOffset+4]["sValue"]);
    },
    _g_sugg_g1_137: function (lToken, nTokenOffset, nLastToken) {
        return suggMasPlur(lToken[nTokenOffset+4]["sValue"], true);
    },
    _g_cond_g1_349: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":", ":(?:R|[123][sp]|Q)|>(?:[nv]ous|eux)/");
    },
    _g_cond_g1_350: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && hasFemForm(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_sugg_g1_138: function (lToken, nTokenOffset, nLastToken) {
        return suggMasPlur(lToken[nTokenOffset+3]["sValue"], true);
    },
    _g_sugg_g1_139: function (lToken, nTokenOffset, nLastToken) {
        return suggFemPlur(lToken[nTokenOffset+4]["sValue"], true);
    },
    _g_sugg_g1_140: function (lToken, nTokenOffset, nLastToken) {
        return suggFemPlur(lToken[nTokenOffset+3]["sValue"], true);
    },
    _g_sugg_g1_141: function (lToken, nTokenOffset, nLastToken) {
        return suggMasSing(lToken[nTokenOffset+3]["sValue"], true);
    },
    _g_cond_g1_351: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":R", ":D.*:p");
    },
    _g_sugg_g1_142: function (lToken, nTokenOffset, nLastToken) {
        return suggMasSing(lToken[nTokenOffset+2]["sValue"], true);
    },
    _g_cond_g1_352: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":R");
    },
    _g_sugg_g1_143: function (lToken, nTokenOffset, nLastToken) {
        return suggMasPlur(lToken[nTokenOffset+2]["sValue"], true);
    },
    _g_sugg_g1_144: function (lToken, nTokenOffset, nLastToken) {
        return suggFemSing(lToken[nTokenOffset+3]["sValue"], true);
    },
    _g_cond_g1_353: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:f:p");
    },
    _g_sugg_g1_145: function (lToken, nTokenOffset, nLastToken) {
        return suggFemSing(lToken[nTokenOffset+2]["sValue"], true);
    },
    _g_cond_g1_354: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && g_morph(lToken[nTokenOffset+2], ":[NA].*:f:p");
    },
    _g_cond_g1_355: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:f:s");
    },
    _g_sugg_g1_146: function (lToken, nTokenOffset, nLastToken) {
        return suggFemPlur(lToken[nTokenOffset+2]["sValue"], true);
    },
    _g_cond_g1_356: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && g_morph(lToken[nTokenOffset+2], ":[NA].*:f:s");
    },
    _g_cond_g1_357: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ">[aâeéêiîoôuœæ]");
    },
    _g_cond_g1_358: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_analyse(lToken[nLastToken-1+1], ":V");
    },
    _g_sugg_g1_147: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbTense(lToken[nTokenOffset+3]["sValue"], ":E", ":2p");
    },
    _g_sugg_g1_148: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+3]["sValue"], ":2s");
    },
    _g_cond_g1_359: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":V");
    },
    _g_sugg_g1_149: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nLastToken-1+1]["sValue"], ":m:s");
    },
    _g_sugg_g1_150: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nLastToken-1+1]["sValue"], ":m:p");
    },
    _g_sugg_g1_151: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nLastToken-1+1]["sValue"], ":f:s");
    },
    _g_sugg_g1_152: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nLastToken-1+1]["sValue"], ":f:p");
    },
    _g_cond_g1_360: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":V[123].*:Iq.*:[32]s");
    },
    _g_sugg_g1_153: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nLastToken-1+1]["sValue"]);
    },
    _g_cond_g1_361: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|n’importe|ce|se|") && ! g_morph(lToken[nTokenOffset], ":R");
    },
    _g_sugg_g1_154: function (lToken, nTokenOffset, nLastToken) {
        return "l’a " + suggVerbPpas(lToken[nLastToken-1+1]["sValue"], ":m:s") + "|la " + lToken[nTokenOffset+3]["sValue"].slice(0,-2) + "ait";
    },
    _g_cond_g1_362: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nLastToken-2+1]["sValue"].gl_isDigit() && lToken[nLastToken-2+1]["sValue"] != "1" && lToken[nLastToken-2+1]["sValue"] != "01";
    },
    _g_cond_g1_363: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nLastToken+1], ":A.*:[me]:[pi]");
    },
    _g_cond_g1_364: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nLastToken+1], ":A.*:[fe]:[pi]") && ! (g_value(lToken[nLastToken-1+1], "|année|") && re.search("^[0-9]+$", lToken[nLastToken+1]["sValue"]));
    },
    _g_cond_g1_365: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nLastToken+1], ":A.*:[fe]:[pi]");
    },
    _g_da_g1_3: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+1], ":LP");
    },
    _g_da_g1_4: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+1], ":G:R:LR");
    },
    _g_cond_g1_366: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|que|qu’|");
    },
    _g_cond_g1_367: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|ne|n’|");
    },
    _g_da_g1_5: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+1], ":LN:m:p");
    },
    _g_cond_g1_368: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":[NV]", ":A:[em]:[is]");
    },
    _g_da_g1_6: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+1], ":N");
    },
    _g_cond_g1_369: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|une|la|cet|cette|ma|ta|sa|notre|votre|leur|de|quelque|certaine|");
    },
    _g_cond_g1_370: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nLastToken+1], ":E");
    },
    _g_da_g1_7: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+2], ">numéro/:N:f:s");
    },
    _g_cond_g1_371: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":[NA]", ":G", 0, -3);
    },
    _g_tp_g1_3: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].slice(0,-3);
    },
    _g_da_g1_8: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+1], ":B:e:p");
    },
    _g_cond_g1_372: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|d’|");
    },
    _g_cond_g1_373: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":[NAQR]|>que/");
    },
    _g_cond_g1_374: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":[NA]", ":V0");
    },
    _g_cond_g1_375: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":[NA]", ":V0") && ! g_morph(lToken[nLastToken+1], ":(?:Ov|3s)");
    },
    _g_cond_g1_376: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":[NA]", ":V0") && ! g_morph(lToken[nLastToken+1], ":(?:Ov|1p)");
    },
    _g_cond_g1_377: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":[NA]", ":V0") && ! g_morph(lToken[nLastToken+1], ":(?:Ov|2p)");
    },
    _g_cond_g1_378: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":[NA]", ":V0") && ! g_morph(lToken[nLastToken+1], ":(?:Ov|3p)");
    },
    _g_cond_g1_379: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":V[123]");
    },
    _g_cond_g1_380: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:[me]:[si]");
    },
    _g_cond_g1_381: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken+1], ":A");
    },
    _g_cond_g1_382: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":Ov|>(?:il|on|elle)|>d’");
    },
    _g_cond_g1_383: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|en|de|d’|");
    },
    _g_cond_g1_384: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:X|Ov)") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_2s_");
    },
    _g_cond_g1_385: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":N.*:[me]:[si]");
    },
    _g_cond_g1_386: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":N.*:[fe]:[si]");
    },
    _g_cond_g1_387: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":N.*:[me]:[pi]");
    },
    _g_cond_g1_388: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":N.*:[fe]:[pi]");
    },
    _g_cond_g1_389: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:D.*:p|N|V)");
    },
    _g_cond_g1_390: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:f:[si]");
    },
    _g_cond_g1_391: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":(?:R|C[sc])");
    },
    _g_cond_g1_392: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[AW]") && ! g_morph(lToken[nTokenOffset], ":D");
    },
    _g_cond_g1_393: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":(?:V|N:f)", ":G");
    },
    _g_cond_g1_394: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":[NV]", ":D.*:[fe]:[si]");
    },
    _g_cond_g1_395: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_value(lToken[nTokenOffset], "|recettes|réponses|solutions|");
    },
    _g_cond_g1_396: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_morph(lToken[nTokenOffset+1], ":[123][sp]") && g_morph(lToken[nTokenOffset], ":O[sv]"));
    },
    _g_da_g1_9: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nTokenOffset+1], ":[NA]");
    },
    _g_da_g1_10: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nTokenOffset+1], ":N");
    },
    _g_cond_g1_397: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":N") && ! g_morph(lToken[nLastToken+1], ":A.*:[me]:[si]");
    },
    _g_cond_g1_398: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":N") && ! g_morph(lToken[nLastToken+1], ":A.*:[fe]:[si]");
    },
    _g_cond_g1_399: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":(?:N|A|Q|W|V0e)", ":D");
    },
    _g_cond_g1_400: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":[NA]", ":D");
    },
    _g_cond_g1_401: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nTokenOffset], ":D|>(?:être|devenir|redevenir|rester|sembler|demeurer|para[îi]tre)");
    },
    _g_da_g1_11: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+1], ":A:e:i");
    },
    _g_cond_g1_402: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].gl_isTitle() && g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) || re.search("^[MDCLXVI]+$", lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g1_403: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].gl_isTitle();
    },
    _g_cond_g1_404: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+3]["sValue"].gl_isTitle();
    },
    _g_cond_g1_405: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].gl_isTitle() && lToken[nTokenOffset+4]["sValue"].gl_isTitle();
    },
    _g_cond_g1_406: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":1s");
    },
    _g_cond_g1_407: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":2s");
    },
    _g_cond_g1_408: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":3s");
    },
    _g_cond_g1_409: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":1p");
    },
    _g_cond_g1_410: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":2p");
    },
    _g_cond_g1_411: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":3p");
    },
    _g_da_g1_12: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+2], ":LV");
    },
    _g_da_g1_13: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+3], ":LV");
    },
    _g_cond_g1_412: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ">(?:être|devenir|rester)");
    },
    _g_cond_g1_413: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken+1], ":[QY]");
    },
    _g_cond_g1_414: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ">(?:être|devenir|rester)") && g_morph(lToken[nLastToken+1], ":[QY]");
    },
    _g_cond_g1_415: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":(?:V0e|N)") && g_morph(lToken[nLastToken+1], ":[AQ]");
    },
    _g_cond_g1_416: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ":V0a");
    },
    _g_cond_g1_417: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ":V0a") && g_morph(lToken[nLastToken+1], ":[QY]");
    },
    _g_cond_g1_418: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":[VW]", ":G");
    },
    _g_cond_g1_419: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":V") && ! g_value(lToken[nLastToken+1], "|qui|de|d’|");
    },
    _g_cond_g1_420: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|qui|de|d’|");
    },
    _g_cond_g1_421: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":V");
    },
    _g_cond_g1_422: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|de|d’|des|du|");
    },
    _g_cond_g1_423: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken+1], ":[AW]");
    },
    _g_cond_g1_424: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|un|le|ce|du|mon|ton|son|notre|votre|leur|");
    },
    _g_cond_g1_425: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_value(lToken[nTokenOffset+2], "|bien|") && g_value(lToken[nLastToken+1], "|que|qu’|")) && ! g_value(lToken[nTokenOffset+2], "|tant|");
    },
    _g_cond_g1_426: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken+1], ":A", ":G");
    },
    _g_cond_g1_427: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:(?:m:s|[me]:p)");
    },
    _g_cond_g1_428: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":W", ":3p");
    },
    _g_cond_g1_429: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+4], ":W", ":A");
    },
    _g_cond_g1_430: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:m");
    },
    _g_cond_g1_431: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":W", ":(?:3p|N)");
    },
    _g_cond_pp2_1: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":N", ":D");
    },
    _g_cond_pp2_2: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":R");
    },
    _g_cond_pp2_3: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":N", ":V");
    },
    _g_cond_pp2_4: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":N");
    },
    _g_cond_pp2_5: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|je|tu|n’|il|on|elle|iel|");
    },
    _g_cond_pp2_6: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|j’|tu|il|elle|on|n’|");
    },
    _g_cond_pp2_7: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|de|du|d’|des|");
    },
    _g_cond_pp2_8: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D");
    },
    _g_cond_pp2_9: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|ça|cela|ceci|me|m’|te|t’|lui|nous|vous|leur|ne|n’|");
    },
    _g_cond_pp2_10: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|il|ne|n’|");
    },
    _g_cond_pp2_11: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D") && ! g_morph(lToken[nLastToken+1], ":A.*:[fe]:[si]");
    },
    _g_cond_pp2_12: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":[123]p") || (lToken[nTokenOffset+1]["sValue"] == "fait" && g_value(lToken[nTokenOffset], "|on|"));
    },
    _g_cond_pp2_13: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":[123]p");
    },
    _g_cond_pp2_14: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-2+1], ":[123]s");
    },
    _g_cond_pp3_1: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|que|qu’|");
    },
    _g_cond_pp3_2: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo;
    },
    _g_cond_pp3_3: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-3+1], ":[123][sp]");
    },
    _g_da_pp3_1: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nLastToken-2+1], ":D") && g_exclude(lToken[nLastToken-1+1], ":[123][sp]");
    },
    _g_cond_pp3_4: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA]", ":(?:G|V0)") && g_morph(lToken[nTokenOffset+4], ":[NA]", ":(?:[PG]|V[023])");
    },
    _g_da_pp3_2: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+4], ":V");
    },
    _g_cond_pp3_5: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":p") && g_morph(lToken[nTokenOffset+3], ":[NA].*:p", ":(?:G|V0)") && g_morph(lToken[nTokenOffset+4], ":[NA].*:p", ":(?:[PGQ]|V[023])");
    },
    _g_cond_pp3_6: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nTokenOffset+2], ":s") && g_morph(lToken[nTokenOffset+3], ":[NA].*:s", ":(?:G|V0)") && g_morph(lToken[nTokenOffset+4], ":[NA].*:s", ":(?:[PGQ]|V[023])") && ! g_morph(lToken[nTokenOffset+5], ":A.*:[si]");
    },
    _g_da_pp3_3: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+3], ":V");
    },
    _g_cond_pp3_7: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), ":O[vs]");
    },
    _g_da_pp3_4: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+2], ":V") && g_exclude(lToken[nTokenOffset+3], ":V");
    },
    _g_da_pp3_5: function (lToken, nTokenOffset, nLastToken) {
        return g_define(lToken[nTokenOffset+2], ":LV");
    },
    _g_cond_pp3_8: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|avoir|avoirs|") && ! g_morph(lToken[nTokenOffset], ":D");
    },
    _g_da_pp3_6: function (lToken, nTokenOffset, nLastToken) {
        return g_rewrite(lToken[nTokenOffset+2], ":A", "");
    },
    _g_cond_pp3_9: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|être|êtres|") && ! g_morph(lToken[nTokenOffset], ":D");
    },
    _g_cond_pp3_10: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_morph(lToken[nTokenOffset], ":V0a") && g_value(lToken[nLastToken+1], "|fait|"));
    },
    _g_cond_g2_1: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+2], ">avoir/");
    },
    _g_cond_g2_2: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nLastToken-1+1]["sValue"] != "A" && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_àCOI_") && ! g_value(lToken[nLastToken+1], "|été|");
    },
    _g_cond_g2_3: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_propsub_") && ! g_morph(lToken[nTokenOffset+1], ":[YNA]") && ! g_value(lToken[nLastToken+1], "|été|");
    },
    _g_cond_g2_4: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nLastToken-1+1]["sValue"] != "A" && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_propsub_") && ! g_morph(lToken[nLastToken+1], ":Q");
    },
    _g_cond_g2_5: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|rendez-vous|");
    },
    _g_cond_g2_6: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":Cs|<start>|>,");
    },
    _g_sugg_g2_1: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].replace(/â/g, "a").replace(/Â/g, "A");
    },
    _g_sugg_g2_2: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].replace(/a/g, "â").replace(/A/g, "Â");
    },
    _g_sugg_g2_3: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].replace(/oc/g, "o");
    },
    _g_sugg_g2_4: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/oc/g, "o");
    },
    _g_sugg_g2_5: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+3]["sValue"].replace(/ro/g, "roc");
    },
    _g_cond_g2_7: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ">faire");
    },
    _g_cond_g2_8: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nLastToken+1], ":Y");
    },
    _g_sugg_g2_6: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+3]["sValue"].replace(/auspice/g, "hospice");
    },
    _g_sugg_g2_7: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/auspice/g, "hospice").replace(/Auspice/g, "Hospice");
    },
    _g_sugg_g2_8: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/âill/g, "ay").replace(/aill/g, "ay").replace(/ÂILL/g, "AY").replace(/AILL/g, "AY");
    },
    _g_sugg_g2_9: function (lToken, nTokenOffset, nLastToken) {
        return "arrière-"+lToken[nTokenOffset+2]["sValue"].replace(/c/g, "").replace(/C/g, "");
    },
    _g_sugg_g2_10: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/c/g, "").replace(/C/g, "");
    },
    _g_cond_g2_9: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), "^ +des accusés");
    },
    _g_sugg_g2_11: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+3]["sValue"].replace(/an/g, "anc").replace(/AN/g, "ANC");
    },
    _g_sugg_g2_12: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/an/g, "anc").replace(/AN/g, "ANC");
    },
    _g_cond_g2_10: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return (g_morph(lToken[nLastToken+1], ":[AQR]") || g_morph(lToken[nTokenOffset], ":V", ">être")) && ! g_value(lToken[nLastToken+1], "|que|qu’|sûr|");
    },
    _g_sugg_g2_13: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/ite/g, "itte");
    },
    _g_sugg_g2_14: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nLastToken-1+1]["sValue"].replace(/itte/g, "ite");
    },
    _g_sugg_g2_15: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/itte/g, "ite");
    },
    _g_sugg_g2_16: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/ane/g, "anne");
    },
    _g_sugg_g2_17: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+4]["sValue"].replace(/ane/g, "anne");
    },
    _g_cond_g2_11: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+3], "|Cannes|CANNES|");
    },
    _g_cond_g2_12: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], "<start>|>[,(]");
    },
    _g_cond_g2_13: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], "<start>|>[,(]") && ! (g_value(lToken[nTokenOffset+1], "|c’|") && g_value(lToken[nTokenOffset+2], "|en|"));
    },
    _g_cond_g2_14: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":C|<start>|>[,(]");
    },
    _g_cond_g2_15: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":A");
    },
    _g_sugg_g2_18: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/omp/g, "on").replace(/OMP/g, "ON");
    },
    _g_sugg_g2_19: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/omt/g, "ompt").replace(/OMT/g, "OMPT").replace(/ont/g, "ompt").replace(/ONT/g, "OMPT");
    },
    _g_cond_g2_16: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|ils|elles|iels|ne|eux|");
    },
    _g_sugg_g2_20: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/nt/g, "mp");
    },
    _g_cond_g2_17: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|l’|un|les|des|ces|");
    },
    _g_sugg_g2_21: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].replace(/sens/g, "cens").replace(/Sens/g, "Cens").replace(/SENS/g, "CENS");
    },
    _g_sugg_g2_22: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/cens/g, "sens").replace(/Cens/g, "Sens").replace(/CENS/g, "SENS");
    },
    _g_cond_g2_18: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":[VR]");
    },
    _g_sugg_g2_23: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/o/g, "ô").replace(/tt/g, "t");
    },
    _g_sugg_g2_24: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/ô/g, "o").replace(/tt/g, "t");
    },
    _g_sugg_g2_25: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/ô/g, "o").replace(/t/g, "tt");
    },
    _g_sugg_g2_26: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/t/g, "tt").replace(/T/g, "TT");
    },
    _g_cond_g2_19: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":A.*:f");
    },
    _g_sugg_g2_27: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/tt/g, "t").replace(/TT/g, "T");
    },
    _g_sugg_g2_28: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/ssa/g, "ça").replace(/ss/g, "c");
    },
    _g_cond_g2_20: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":Q");
    },
    _g_sugg_g2_29: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/nud/g, "nu").replace(/NUD/g, "NU");
    },
    _g_sugg_g2_30: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nLastToken-1+1]["sValue"].replace(/escell/g, "écel").replace(/essell/g, "écel");
    },
    _g_sugg_g2_31: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/escell/g, "écel").replace(/essell/g, "écel");
    },
    _g_cond_g2_21: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ">(?:être|voyager|surprendre|venir|arriver|partir|aller)/") || look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "-(?:ils?|elles?|on|je|tu|nous|vous) +$");
    },
    _g_cond_g2_22: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_value(lToken[nTokenOffset], "|avec|sans|quel|quelle|quels|quelles|cet|votre|notre|mon|leur|l’|d’|");
    },
    _g_cond_g2_23: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].gl_isLowerCase();
    },
    _g_sugg_g2_32: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/imm/g, "ém").replace(/Imm/g, "Ém");
    },
    _g_cond_g2_24: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":D");
    },
    _g_sugg_g2_33: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].replace(/imm/g, "ém").replace(/Imm/g, "Ém");
    },
    _g_sugg_g2_34: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nLastToken-1+1]["sValue"].replace(/émi/g, "immi").replace(/Émi/g, "Immi");
    },
    _g_sugg_g2_35: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/end/g, "ind").replace(/End/g, "Ind").replace(/END/g, "IND");
    },
    _g_sugg_g2_36: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+3]["sValue"].replace(/end/g, "ind").replace(/End/g, "Ind").replace(/END/g, "IND");
    },
    _g_sugg_g2_37: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/ind/g, "end").replace(/Ind/g, "End").replace(/IND/g, "END");
    },
    _g_cond_g2_25: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], "<start>|:C||>,/") && g_morph(lToken[nTokenOffset+2], ":N", ":[AG]");
    },
    _g_cond_g2_26: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], "<start>|:C||>,/") && g_morph(lToken[nTokenOffset+2], ":N.*:[fe]");
    },
    _g_cond_g2_27: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], "<start>|:C||>,/") && g_morph(lToken[nTokenOffset+2], ":N", ":A.*:[me]:[si]");
    },
    _g_cond_g2_28: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], "<start>|:C||>,/") && g_morph(lToken[nTokenOffset+2], ":[NA]") && g_morph(lToken[nTokenOffset+3], ":N", ":[AG]");
    },
    _g_cond_g2_29: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], "<start>|:C||>,/") && g_morph(lToken[nTokenOffset+2], ":[NA].*:[fe]:[si]") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[fe]:[si]");
    },
    _g_cond_g2_30: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], "<start>|:C||>,/") && ( (g_morph(lToken[nTokenOffset+2], ":N", "*") && g_morph(lToken[nTokenOffset+3], ":A")) || (g_morph(lToken[nTokenOffset+2], ":[NA]") && g_morph(lToken[nTokenOffset+3], ":N", ":A.*:[me]:[si]")) );
    },
    _g_cond_g2_31: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ">(?:abandonner|céder|résister)/") && ! g_value(lToken[nLastToken+1], "|de|d’|");
    },
    _g_cond_g2_32: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[is]", ":G") && g_morph(lToken[nLastToken-2+1], ":[QA]", ":M") && lToken[nLastToken-2+1]["sValue"].gl_isLowerCase();
    },
    _g_cond_g2_33: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":N.*:[is]", ":[GA]") && g_morph(lToken[nLastToken-2+1], ":[QA]", ":M") && lToken[nLastToken-2+1]["sValue"].gl_isLowerCase();
    },
    _g_cond_g2_34: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":M", ":[GA]") && g_morph(lToken[nLastToken-2+1], ":[QA]", ":M") && lToken[nLastToken-2+1]["sValue"].gl_isLowerCase();
    },
    _g_cond_g2_35: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":N.*:m:[si]", ":(?:[AWG]|V0a)") && g_morph(lToken[nTokenOffset], ":Cs|<start>|>,");
    },
    _g_cond_g2_36: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":N.*:f:[si]", ":(?:[AWG]|V0a)") && g_morph(lToken[nTokenOffset], ":Cs|<start>|>,");
    },
    _g_cond_g2_37: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":N.*:[pi]", ":(?:[AWG]|V0a)") && g_morph(lToken[nTokenOffset], ":Cs|<start>|>,");
    },
    _g_cond_g2_38: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":R");
    },
    _g_cond_g2_39: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:[me]:[sp]");
    },
    _g_sugg_g2_38: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].replace(/î/g, "i");
    },
    _g_sugg_g2_39: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+3]["sValue"].replace(/o/g, "au").replace(/O/g, "AU");
    },
    _g_sugg_g2_40: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nLastToken-1+1]["sValue"].replace(/n/g, "nc").replace(/N/g, "NC");
    },
    _g_sugg_g2_41: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/and/g, "ant");
    },
    _g_cond_g2_40: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_value(lToken[nTokenOffset], "|une|") && look(sSentence.slice(lToken[nLastToken]["nEnd"]), "(?i)^ +pour toute") );
    },
    _g_cond_g2_41: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":D.*:(?:f|e:p)");
    },
    _g_sugg_g2_42: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/iai/g, "iè");
    },
    _g_sugg_g2_43: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/iè/g, "iai");
    },
    _g_sugg_g2_44: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/û/g, "u").replace(/t/g, "tt").replace(/Û/g, "U").replace(/T/g, "TT");
    },
    _g_cond_g2_42: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-2+1], "|de|");
    },
    _g_sugg_g2_45: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/outt/g, "oût").replace(/OUTT/g, "OÛT");
    },
    _g_sugg_g2_46: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nLastToken-1+1]["sValue"].replace(/oût/g, "outt").replace(/OÛT/g, "OUTT").replace(/out/g, "outt").replace(/OUT/g, "OUTT");
    },
    _g_sugg_g2_47: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nLastToken-1+1]["sValue"].replace(/outt/g, "oût").replace(/OUTT/g, "OÛT");
    },
    _g_cond_g2_43: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nLastToken-1+1], ":1p");
    },
    _g_cond_g2_44: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nLastToken-1+1], ":2p");
    },
    _g_sugg_g2_48: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/u/g, "û").replace(/U/g, "Û");
    },
    _g_sugg_g2_49: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/û/g, "u").replace(/Û/g, "U");
    },
    _g_sugg_g2_50: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].slice(3);
    },
    _g_sugg_g2_51: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].toLowerCase().replace(/cha/g, "lâ");
    },
    _g_cond_g2_45: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":Q");
    },
    _g_cond_g2_46: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 4);
    },
    _g_sugg_g2_52: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/a/g, "â").replace(/A/g, "Â");
    },
    _g_sugg_g2_53: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/ât/g, "at").replace(/ÂT/g, "AT");
    },
    _g_sugg_g2_54: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nLastToken-1+1]["sValue"].replace(/u/g, "û").replace(/U/g, "Û");
    },
    _g_cond_g2_47: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":D", ">de/");
    },
    _g_sugg_g2_55: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/en/g, "an").replace(/EN/g, "AN");
    },
    _g_sugg_g2_56: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/an/g, "en").replace(/AN/g, "EN");
    },
    _g_sugg_g2_57: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nLastToken-1+1]["sValue"].replace(/a/g, "â").replace(/A/g, "Â");
    },
    _g_cond_g2_48: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-3+1], ":V");
    },
    _g_sugg_g2_58: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nLastToken-1+1]["sValue"].replace(/êch/g, "éch").replace(/er/g, "é").replace(/ÊCH/g, "ÉCH").replace(/ER/g, "É");
    },
    _g_sugg_g2_59: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/éch/g, "êch").replace(/èch/g, "êch").replace(/ÉCH/g, "ÊCH").replace(/ÈCH/g, "ÊCH");
    },
    _g_cond_g2_49: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|je|tu|il|elle|on|ne|n’|") && g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 3);
    },
    _g_cond_g2_50: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":N");
    },
    _g_cond_g2_51: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && g_morph(lToken[nLastToken-1+1], ":V1..t") && g_morph(lToken[nLastToken+1], ":(?:Ov|[123][sp]|P)|<end>|>(?:,|par)/");
    },
    _g_sugg_g2_60: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nLastToken-1+1]["sValue"], ":m:s");
    },
    _g_sugg_g2_61: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nLastToken-1+1]["sValue"], ":f:s");
    },
    _g_sugg_g2_62: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nLastToken-1+1]["sValue"], ":s");
    },
    _g_cond_g2_52: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA]") && g_morph(lToken[nTokenOffset+4], ":[NA]", ":V0");
    },
    _g_cond_g2_53: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+1], ":V", ":[NAQGM]");
    },
    _g_cond_g2_54: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1);
    },
    _g_sugg_g2_63: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+3]["sValue"].replace(/t/g, "g").replace(/T/g, "G");
    },
    _g_cond_g2_55: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":A") && g_morph(lToken[nTokenOffset], ":D");
    },
    _g_sugg_g2_64: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/t/g, "g").replace(/T/g, "G");
    },
    _g_cond_g2_56: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|n’|");
    },
    _g_cond_g2_57: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1);
    },
    _g_sugg_g2_65: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/out/g, "oot").replace(/OUT/g, "OOT");
    },
    _g_sugg_g2_66: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/etr/g, "ebr").replace(/ETR/g, "EBR").replace(/dét/g, "reb").replace(/Dét/g, "Reb").replace(/DÉT/g, "REB");
    },
    _g_sugg_g2_67: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/ô/g, "o").replace(/Ô/g, "O");
    },
    _g_sugg_g2_68: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/od/g, "ôd").replace(/OD/g, "ÔD");
    },
    _g_sugg_g2_69: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/ale/g, "alle");
    },
    _g_sugg_g2_70: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].replace(/alle/g, "ale");
    },
    _g_cond_g2_58: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":D.*:[me]");
    },
    _g_sugg_g2_71: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].replace(/scep/g,"sep");
    },
    _g_cond_g2_59: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ">plaie/");
    },
    _g_sugg_g2_72: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].replace(/sep/g, "scep");
    },
    _g_cond_g2_60: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_analyse(lToken[nTokenOffset+3], ":N.*:[me]:[si]", ":Y");
    },
    _g_cond_g2_61: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_analyse(lToken[nTokenOffset+3], ":[NA]", ":Y");
    },
    _g_cond_g2_62: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), " soit ");
    },
    _g_cond_g2_63: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|lourde|lourdes|") && ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "[aA]ccompl|[dD]él[éè]gu");
    },
    _g_sugg_g2_73: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/â/g, "a").replace(/Â/g, "A");
    },
    _g_sugg_g2_74: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nLastToken-1+1]["sValue"].replace(/â/g, "a").replace(/Â/g, "A");
    },
    _g_sugg_g2_75: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+3]["sValue"].replace(/a/g, "â").replace(/A/g, "Â");
    },
    _g_cond_g2_64: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":D", ":R");
    },
    _g_sugg_g2_76: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+3]["sValue"].replace(/ach/g, "âch").replace(/ACH/g, "ÂCH");
    },
    _g_sugg_g2_77: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/au/g, "ô").replace(/AU/g, "Ô");
    },
    _g_sugg_g2_78: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/énén/g, "enim").replace(/ÉNÉN/g, "ENIM");
    },
    _g_sugg_g2_79: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/enim/g, "énén").replace(/ENIM/g, "ÉNÉN");
    },
    _g_sugg_g2_80: function (lToken, nTokenOffset, nLastToken) {
        return suggSing(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g2_65: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|et|ou|de|") && ! g_value(lToken[nTokenOffset+2], "|air|") && ! g_morph(lToken[nTokenOffset+3], ">seul/");
    },
    _g_cond_g2_66: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ( (g_morph(lToken[nTokenOffset+2], ":m", "*") && g_morph(lToken[nTokenOffset+3], ":f", "*")) || (g_morph(lToken[nTokenOffset+2], ":f", "*") && g_morph(lToken[nTokenOffset+3], ":m", "*")) ) && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]);
    },
    _g_sugg_g2_81: function (lToken, nTokenOffset, nLastToken) {
        return switchGender(lToken[nTokenOffset+3]["sValue"], false);
    },
    _g_cond_g2_67: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && hasFemForm(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_sugg_g2_82: function (lToken, nTokenOffset, nLastToken) {
        return switchGender(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g2_68: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[si]", "*") && g_morph(lToken[nTokenOffset+3], ":p", "*") && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]);
    },
    _g_sugg_g2_83: function (lToken, nTokenOffset, nLastToken) {
        return suggSing(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_69: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+3], "|air|") && ! g_morph(lToken[nTokenOffset+4], ">seul/");
    },
    _g_cond_g2_70: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ( (g_morph(lToken[nTokenOffset+3], ":m", "*") && g_morph(lToken[nTokenOffset+4], ":f", "*")) || (g_morph(lToken[nTokenOffset+3], ":f", "*") && g_morph(lToken[nTokenOffset+4], ":m", "*")) ) && ! apposition(lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+4]["sValue"]) && ! g_morph(lToken[nTokenOffset], ":[NA]");
    },
    _g_sugg_g2_84: function (lToken, nTokenOffset, nLastToken) {
        return switchGender(lToken[nTokenOffset+4]["sValue"], false);
    },
    _g_cond_g2_71: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && hasFemForm(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_sugg_g2_85: function (lToken, nTokenOffset, nLastToken) {
        return switchGender(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_72: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[si]", "*") && g_morph(lToken[nTokenOffset+4], ":p", "*") && ! apposition(lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+4]["sValue"]) && ! g_morph(lToken[nTokenOffset], ":[NA]");
    },
    _g_sugg_g2_86: function (lToken, nTokenOffset, nLastToken) {
        return suggSing(lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_g2_73: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:f", ":(?:e|m|P|G|W|[123][sp]|Y)");
    },
    _g_sugg_g2_87: function (lToken, nTokenOffset, nLastToken) {
        return suggLesLa(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_74: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && hasMasForm(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_sugg_g2_88: function (lToken, nTokenOffset, nLastToken) {
        return suggMasSing(lToken[nTokenOffset+3]["sValue"], true);
    },
    _g_cond_g2_75: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nTokenOffset+3], ":[NA].*:p", ":[siGW]");
    },
    _g_sugg_g2_89: function (lToken, nTokenOffset, nLastToken) {
        return suggMasSing(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_76: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo;
    },
    _g_cond_g2_77: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":D");
    },
    _g_cond_g2_78: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:f", ":(?:e|m|P|G|W|[123][sp]|Y)") || ( g_morph(lToken[nTokenOffset+3], ":[NA].*:f", ":[me]") && g_morph(lToken[nTokenOffset+1], ":R", ">(?:e[tn]|ou)/") && ! (g_morph(lToken[nTokenOffset+1], ":Rv") && g_morph(lToken[nTokenOffset+3], ":Y")) );
    },
    _g_cond_g2_79: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nTokenOffset+3], ":[NA].*:p", "*") || ( g_morph(lToken[nTokenOffset+3], ":[NA].*:p", ":[si]") && g_morph(lToken[nTokenOffset+1], ":[RC]", ">(?:e[tn]|ou)/") && ! (g_morph(lToken[nTokenOffset+1], ":Rv") && g_morph(lToken[nTokenOffset+3], ":Y")) );
    },
    _g_cond_g2_80: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:f", ":(?:e|m|P|G|W|Y)");
    },
    _g_cond_g2_81: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":D") && ! g_value(lToken[nTokenOffset], "|et|ou|de|") && ! g_morph(lToken[nTokenOffset+3], ">seul/");
    },
    _g_cond_g2_82: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:[me]", ":(?:B|G|V0)") && g_morph(lToken[nTokenOffset+3], ":[NA].*:f", "*") && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_83: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:[si]", ":G") && g_morph(lToken[nTokenOffset+3], ":[NA].*:p", ":[GWsi]") && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_84: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":D") && ! g_morph(lToken[nTokenOffset], ":[NA]") && ! g_morph(lToken[nTokenOffset+4], ">seul/");
    },
    _g_cond_g2_85: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[me]", ":(?:B|G|V0|f)") && g_morph(lToken[nTokenOffset+4], ":[NA].*:f", "*") && ! apposition(lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+4]["sValue"]);
    },
    _g_sugg_g2_90: function (lToken, nTokenOffset, nLastToken) {
        return suggMasSing(lToken[nTokenOffset+4]["sValue"], true);
    },
    _g_cond_g2_86: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[si]", ":G") && g_morph(lToken[nTokenOffset+4], ":[NA].*:p", ":[GWsi]") && ! apposition(lToken[nTokenOffset+4]["sValue"], lToken[nTokenOffset+4]["sValue"]);
    },
    _g_sugg_g2_91: function (lToken, nTokenOffset, nLastToken) {
        return suggMasSing(lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_g2_87: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:m", ":(?:e|f|P|G|W|M|[1-3][sp]|Y)");
    },
    _g_sugg_g2_92: function (lToken, nTokenOffset, nLastToken) {
        return suggFemSing(lToken[nTokenOffset+3]["sValue"], true);
    },
    _g_cond_g2_88: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nTokenOffset+3], ":[NA].*:p");
    },
    _g_sugg_g2_93: function (lToken, nTokenOffset, nLastToken) {
        return suggFemSing(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_89: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:m", ":(?:e|f|P|G|W|M|[1-3][sp]|Y)") || ( g_morph(lToken[nTokenOffset+3], ":[NA].*:m", ":[Mfe]") && g_morph(lToken[nTokenOffset+1], ":[RC]", ">(?:e[tn]|ou)/") && ! (g_morph(lToken[nTokenOffset+1], ":(?:Rv|C)") && g_morph(lToken[nTokenOffset+3], ":Y")) );
    },
    _g_cond_g2_90: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nTokenOffset+3], ":[NA].*:p", "*") || ( g_morph(lToken[nTokenOffset+3], ":[NA].*:p", ":[Msi]") && g_morph(lToken[nTokenOffset+1], ":[RC]", ">(?:e[tn]|ou)/") && ! (g_morph(lToken[nTokenOffset+1], ":Rv") && g_morph(lToken[nTokenOffset+3], ":Y")) );
    },
    _g_cond_g2_91: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:m", ":[efPGWMY]");
    },
    _g_cond_g2_92: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":D") && ! g_value(lToken[nTokenOffset], "|et|ou|de|d’|") && ! g_morph(lToken[nTokenOffset+3], ">seul/");
    },
    _g_cond_g2_93: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:[fe]", ":(?:B|G|V0)") && g_morph(lToken[nTokenOffset+3], ":[NA].*:m", "*") && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_94: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":D") && ! g_morph(lToken[nTokenOffset], ":[NA]|>(?:et|ou)/") && ! g_morph(lToken[nTokenOffset+4], ">seul/");
    },
    _g_cond_g2_95: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[fe]", ":(?:B|G|V0|m)") && g_morph(lToken[nTokenOffset+4], ":[NA].*:m", "*") && ! apposition(lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+4]["sValue"]);
    },
    _g_sugg_g2_94: function (lToken, nTokenOffset, nLastToken) {
        return suggFemSing(lToken[nTokenOffset+4]["sValue"], true);
    },
    _g_cond_g2_96: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[si]", ":G") && g_morph(lToken[nTokenOffset+4], ":[NA].*:p", ":[GWsi]") && ! apposition(lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+4]["sValue"]);
    },
    _g_sugg_g2_95: function (lToken, nTokenOffset, nLastToken) {
        return suggFemSing(lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_g2_97: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:p", "*");
    },
    _g_cond_g2_98: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:p", "*") || ( g_morph(lToken[nTokenOffset+3], ":[NA].*:p", ":[si]") && g_morph(lToken[nTokenOffset+1], ":[RC]", ">(?:e[tn]|ou)/") && ! (g_morph(lToken[nTokenOffset+1], ":Rv") && g_morph(lToken[nTokenOffset+3], ":Y")) );
    },
    _g_cond_g2_99: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:p", ":[siGW]");
    },
    _g_cond_g2_100: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ((g_morph(lToken[nTokenOffset+2], ":[NA].*:m", ":(?:B|e|G|V0|f)") && g_morph(lToken[nTokenOffset+3], ":[NA].*:f", "*")) || (g_morph(lToken[nTokenOffset+2], ":[NA].*:f", ":(?:B|e|G|V0|m)") && g_morph(lToken[nTokenOffset+3], ":[NA].*:m", "*"))) && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]);
    },
    _g_sugg_g2_96: function (lToken, nTokenOffset, nLastToken) {
        return switchGender(lToken[nTokenOffset+2]["sValue"], false);
    },
    _g_cond_g2_101: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && g_morph(lToken[nTokenOffset+2], ":[NA].*:i");
    },
    _g_cond_g2_102: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ((g_morph(lToken[nTokenOffset+3], ":[NA].*:m", ":(?:B|e|G|V0|f)") && g_morph(lToken[nTokenOffset+4], ":[NA].*:f", "*")) || (g_morph(lToken[nTokenOffset+3], ":[NA].*:f", ":(?:B|e|G|V0|m)") && g_morph(lToken[nTokenOffset+4], ":[NA].*:m", "*"))) && ! apposition(lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_g2_103: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && g_morph(lToken[nTokenOffset+3], ":[NA].*:i");
    },
    _g_cond_g2_104: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|et|ou|") && g_morph(lToken[nTokenOffset+1], ":D") && g_morph(lToken[nTokenOffset+2], ":[NA].*:[si]", ":(?:[123][sp]|G)") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[si]", ":(?:[123][sp]|G|P)") && g_morph(lToken[nTokenOffset+4], ":[NA].*:p", "*") && lToken[nTokenOffset+4]["sValue"].gl_isLowerCase();
    },
    _g_cond_g2_105: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:f", ":[GWme]");
    },
    _g_cond_g2_106: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && hasMasForm(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_sugg_g2_97: function (lToken, nTokenOffset, nLastToken) {
        return suggMasSing(lToken[nTokenOffset+2]["sValue"], true);
    },
    _g_cond_g2_107: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:p", ":[siGW]");
    },
    _g_sugg_g2_98: function (lToken, nTokenOffset, nLastToken) {
        return suggMasSing(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g2_108: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:m", ":[efGW]");
    },
    _g_sugg_g2_99: function (lToken, nTokenOffset, nLastToken) {
        return suggFemSing(lToken[nTokenOffset+2]["sValue"], true);
    },
    _g_sugg_g2_100: function (lToken, nTokenOffset, nLastToken) {
        return suggFemSing(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g2_109: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:f", ":(?:e|m|G|W|V0|3s|Y)");
    },
    _g_cond_g2_110: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:f", ":(?:e|m|G|W|V0|3s)");
    },
    _g_sugg_g2_101: function (lToken, nTokenOffset, nLastToken) {
        return suggMasPlur(lToken[nTokenOffset+3]["sValue"], true);
    },
    _g_cond_g2_111: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:m", ":(?:e|f|G|W|V0|3s|P)") && ! ( lToken[nTokenOffset+2]["sValue"] == "demi" && g_morph(lToken[nLastToken+1], ":N.*:f", "*") );
    },
    _g_cond_g2_112: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:m", ":(?:e|f|G|W|V0|3s)");
    },
    _g_sugg_g2_102: function (lToken, nTokenOffset, nLastToken) {
        return suggFemPlur(lToken[nTokenOffset+3]["sValue"], true);
    },
    _g_cond_g2_113: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|et|ou|d’|") && ! g_morph(lToken[nTokenOffset+3], ">seul/");
    },
    _g_cond_g2_114: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:[si]", ":G") && g_morph(lToken[nTokenOffset+3], ":[NA].*:p", "*") && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_115: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[NA]|>(?:et|ou)/") && ! g_morph(lToken[nTokenOffset+4], ">seul/");
    },
    _g_cond_g2_116: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[si]", ":G") && g_morph(lToken[nTokenOffset+4], ":[NA].*:p", "*") && ! apposition(lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_g2_117: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"] != "fois" && g_morph(lToken[nTokenOffset+2], ":[NA].*:[si]", ":G") && g_morph(lToken[nTokenOffset+3], ":[NA].*:p", "*") && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_118: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+3]["sValue"] != "fois" && g_morph(lToken[nTokenOffset+3], ":[NA].*:[si]", ":G") && g_morph(lToken[nTokenOffset+4], ":[NA].*:p", "*") && ! apposition(lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_g2_119: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:f", ":(?:3s|[GWme])");
    },
    _g_cond_g2_120: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:f", ":[GWme]") && g_morph(lToken[nTokenOffset+2], ":3s");
    },
    _g_cond_g2_121: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ">[bcçdfgjklmnpqrstvwxz].+:[NA].*:m", ":[efGW]");
    },
    _g_sugg_g2_103: function (lToken, nTokenOffset, nLastToken) {
        return suggCeOrCet(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g2_122: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:f:s", ":[GWme]");
    },
    _g_cond_g2_123: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|et|ou|de|d’|") && ! g_morph(lToken[nTokenOffset+3], ">seul/");
    },
    _g_cond_g2_124: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":D");
    },
    _g_cond_g2_125: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ">[bcdfgjklmnpqrstvwxz].*:[NA].*:f", ":[GWme]");
    },
    _g_sugg_g2_104: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/on/g, "a").replace(/ON/g, "A");
    },
    _g_cond_g2_126: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:m", ":(?:B|G|e|V0|f)") && g_morph(lToken[nTokenOffset+3], ":[NA].*:f", "*") && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_127: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ">[aâeéèêiîoôuûyœæ].*:[NA].*:f", ":(?:B|G|e|V0|m)") && g_morph(lToken[nTokenOffset+3], ":[NA].*:m", "*") && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_128: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:m", ":(?:B|G|e|V0|f)") && g_morph(lToken[nTokenOffset+4], ":[NA].*:f", "*") && ! apposition(lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_g2_129: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ">[aâeéèêiîoôuûyœæ].*:[NA].*:f", ":(?:B|G|e|V0|m)") && g_morph(lToken[nTokenOffset+4], ":[NA].*:m", "*") && ! apposition(lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_g2_130: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_tag(lToken[nTokenOffset+1], "_CAP_") && g_morph(lToken[nTokenOffset+1], ":N"));
    },
    _g_sugg_g2_105: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].slice(0,-1)+"on";
    },
    _g_cond_g2_131: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && ! re.search("(?i)^[aâeéèêiîoôuûyœæ]", lToken[nTokenOffset+2]["sValue"]) && hasFemForm(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g2_132: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NAQ].*:[fe]", ":(?:B|G|V0)") && g_morph(lToken[nTokenOffset+3], ":[NAQ].*:m", "*") && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_133: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NAQ].*:[si]", ":G") && g_morph(lToken[nTokenOffset+3], ":[NAQ].*:p", ":[GWsi]") && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_134: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[NAQ]|>(?:et|ou)/") && ! g_morph(lToken[nTokenOffset+4], ">seul/");
    },
    _g_cond_g2_135: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NAQ].*:[fe]", ":(?:B|G|V0|m)") && g_morph(lToken[nTokenOffset+4], ":[NAQ].*:m", "*") && ! apposition(lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_g2_136: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NAQ].*:[si]", ":G") && g_morph(lToken[nTokenOffset+4], ":[NAQ].*:p", ":[GWsi]") && ! apposition(lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_g2_137: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:p", ":[siG]") && ! g_value(lToken[nLastToken+1], "|que|qu’|");
    },
    _g_cond_g2_138: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|et|ou|") && g_morph(lToken[nTokenOffset+2], ":[NA].*:[si]") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[si]", ":(?:[123][sp]|G|P|B)") && g_morph(lToken[nTokenOffset+4], ":[NA].*:p", "*") && lToken[nTokenOffset+4]["sValue"].gl_isLowerCase();
    },
    _g_cond_g2_139: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:s", "*") && ! (g_value(lToken[nLastToken+1], "|et|ou|") && g_morph(g_token(lToken, nLastToken+2), ":[NA]"));
    },
    _g_sugg_g2_106: function (lToken, nTokenOffset, nLastToken) {
        return suggPlur(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_140: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":D") && ( g_morph(lToken[nTokenOffset+3], ":[NA].*:s", "*") || (g_morph(lToken[nTokenOffset+3], ":[NA].*:s", ":[pi]|>avoir/") && g_morph(lToken[nTokenOffset+1], ":[RC]", ">(?:e[tn]|ou|puis)/") && ! (g_morph(lToken[nTokenOffset+1], ":Rv") && g_morph(lToken[nTokenOffset+3], ":Y"))) ) && ! (g_value(lToken[nLastToken+1], "|et|ou|") && g_morph(g_token(lToken, nLastToken+2), ":[NA]")) && ! (g_value(lToken[nTokenOffset+1], "|que|") && g_morph(lToken[nTokenOffset], ">tel/") && g_morph(lToken[nTokenOffset+3], ":3[sp]"));
    },
    _g_cond_g2_141: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:s", ":[ipYPGW]") && ! (g_value(lToken[nLastToken+1], "|et|ou|") && g_morph(g_token(lToken, nLastToken+2), ":[NA]"));
    },
    _g_sugg_g2_107: function (lToken, nTokenOffset, nLastToken) {
        return switchGender(lToken[nTokenOffset+3]["sValue"], true);
    },
    _g_sugg_g2_108: function (lToken, nTokenOffset, nLastToken) {
        return switchGender(lToken[nTokenOffset+2]["sValue"], true);
    },
    _g_cond_g2_142: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:[pi]") && g_morph(lToken[nTokenOffset+3], ":[NA].*:s", "*") && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]) && ! (g_value(lToken[nLastToken+1], "|et|,|") && g_morph(g_token(lToken, nLastToken+2), ":A"));
    },
    _g_cond_g2_143: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":D") && ! g_morph(lToken[nTokenOffset], ":[NA]") && ! g_morph(lToken[nTokenOffset+3], ">seul/");
    },
    _g_sugg_g2_109: function (lToken, nTokenOffset, nLastToken) {
        return switchGender(lToken[nTokenOffset+4]["sValue"], true);
    },
    _g_cond_g2_144: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[pi]") && g_morph(lToken[nTokenOffset+4], ":[NA].*:s", "*") && ! apposition(lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+4]["sValue"]) && ! (g_value(lToken[nLastToken+1], "|et|,|") && g_morph(g_token(lToken, nLastToken+2), ":A"));
    },
    _g_sugg_g2_110: function (lToken, nTokenOffset, nLastToken) {
        return suggPlur(lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_g2_145: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:s", ":(?:[ipGW]|[123][sp])") && ! (g_value(lToken[nLastToken+1], "|et|ou|") && g_morph(g_token(lToken, nLastToken+2), ":[NA]"));
    },
    _g_sugg_g2_111: function (lToken, nTokenOffset, nLastToken) {
        return suggPlur(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g2_146: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:s", ":[ipGW]") && ! (g_value(lToken[nLastToken+1], "|et|ou|") && g_morph(g_token(lToken, nLastToken+2), ":[NA]"));
    },
    _g_cond_g2_147: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && g_morph(lToken[nTokenOffset+2], ">[bcdfglklmnpqrstvwxz].*:m", ":f");
    },
    _g_cond_g2_148: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"].endsWith("x") || lToken[nTokenOffset+1]["sValue"].endsWith("X");
    },
    _g_cond_g2_149: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo;
    },
    _g_cond_g2_150: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|et|ou|de|d’|au|aux|") && ! g_morph(lToken[nTokenOffset+3], ">seul/");
    },
    _g_cond_g2_151: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[pi]") && g_morph(lToken[nTokenOffset+4], ":[NA].*:s", "*") && ! apposition(lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+4]["sValue"]) && ! (g_value(lToken[nLastToken+1], "|et|,|") && g_morph(g_token(lToken, nLastToken+2), ":A")) && ! (g_value(lToken[nTokenOffset+1], "|de|d’|") && g_value(lToken[nTokenOffset], "|un|une|"));
    },
    _g_cond_g2_152: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ">(?:et|ou)/|:R") && ! g_morph(lToken[nTokenOffset+3], ">(?:seul|minimum|maximum)/");
    },
    _g_cond_g2_153: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:[pi]", ":(?:B|G|V0)") && g_morph(lToken[nTokenOffset+3], ":[NA].*:s", "*") && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]) && ! (g_value(lToken[nLastToken+1], "|et|,|") && g_morph(g_token(lToken, nLastToken+2), ":A"));
    },
    _g_cond_g2_154: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return (g_morph(lToken[nTokenOffset], ":(?:[VRBX]|Cs|LV)|>comme/|<start>|>,", "*") || g_morph(lToken[nTokenOffset+3], ":N", ":[AQ]")) && ! g_morph(lToken[nTokenOffset+3], ">(?:seul|minimum|maximum)/");
    },
    _g_cond_g2_155: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ( (g_morph(lToken[nTokenOffset+2], ":[NA].*:m", ":[fe]") && g_morph(lToken[nTokenOffset+3], ":[NA].*:f", "*")) || (g_morph(lToken[nTokenOffset+2], ":[NA].*:f", ":[me]") && g_morph(lToken[nTokenOffset+3], ":[NA].*:m", "*")) ) && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_156: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:[pi]", ":G") && g_morph(lToken[nTokenOffset+3], ":[NA].*:s", "*") && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]) && ! (g_value(lToken[nLastToken+1], "|et|,|") && g_morph(g_token(lToken, nLastToken+2), ":A"));
    },
    _g_cond_g2_157: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+3], ":G|>a/") && g_checkAgreement(lToken[nTokenOffset+2], lToken[nTokenOffset+3]);
    },
    _g_da_g2_1: function (lToken, nTokenOffset, nLastToken) {
        return g_exclude(lToken[nTokenOffset+3], ":V");
    },
    _g_cond_g2_158: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:s", ":[ipGWP]") && ! (g_value(lToken[nLastToken+1], "|et|ou|") && g_morph(g_token(lToken, nLastToken+2), ":[NA]"));
    },
    _g_cond_g2_159: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":D") && g_morph(lToken[nTokenOffset+2], ":[NA].*:[pi]", ":(?:[123][sp]|G)") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[pi]", ":(?:[123][sp]|G)") && g_morph(lToken[nTokenOffset+4], ":[NA].*:s", "*") && lToken[nTokenOffset+4]["sValue"].gl_isLowerCase();
    },
    _g_cond_g2_160: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:[pi]") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[pi]", ":(?:[123][sp]|G)") && g_morph(lToken[nTokenOffset+4], ":[NA].*:s", "*") && lToken[nTokenOffset+4]["sValue"].gl_isLowerCase() && ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "(?i)\\bune? de +$") && ! g_morph(lToken[nTokenOffset+4], ">seul/");
    },
    _g_cond_g2_161: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:[pi]", ":[123][sp]") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[pi]", ":(?:[123][sp]|G)") && g_morph(lToken[nTokenOffset+4], ":[NA].*:s", "*") && ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "(?i)\\bune? de +$") && ! g_morph(lToken[nTokenOffset+4], ">seul/");
    },
    _g_cond_g2_162: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:f", ":[emGWP]");
    },
    _g_sugg_g2_112: function (lToken, nTokenOffset, nLastToken) {
        return suggMasPlur(lToken[nTokenOffset+2]["sValue"], true);
    },
    _g_cond_g2_163: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:s", ":(?:[ipGWP]|V0)") && ! (g_value(lToken[nLastToken+1], "|et|ou|") && g_morph(g_token(lToken, nLastToken+2), ":[NA]"));
    },
    _g_cond_g2_164: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:f", ":[emGW]");
    },
    _g_cond_g2_165: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:m", ":[efGWP]");
    },
    _g_sugg_g2_113: function (lToken, nTokenOffset, nLastToken) {
        return suggFemPlur(lToken[nTokenOffset+2]["sValue"], true);
    },
    _g_cond_g2_166: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:m", ":[efGW]");
    },
    _g_cond_g2_167: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:f:p", ":(?:V0|Oo|[NA].*:[me]:[si])");
    },
    _g_cond_g2_168: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:m:p", ":(?:V0|Oo|[NA].*:[me]:[si])");
    },
    _g_cond_g2_169: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:f:[si]", ":(?:V0|Oo|[NA].*:[me]:[si])");
    },
    _g_cond_g2_170: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:f:s", ":(?:V0|Oo|[NA].*:[me]:[pi])");
    },
    _g_cond_g2_171: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:m:s", ":(?:V0|Oo|[NA].*:[me]:[pi])");
    },
    _g_cond_g2_172: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:f:[pi]", ":(?:V0|Oo|[NA].*:[me]:[pi])");
    },
    _g_cond_g2_173: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:m:p", ":(?:V0|Oo|[NA].*:[fe]:[si])");
    },
    _g_cond_g2_174: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:f:p", ":(?:V0|Oo|[NA].*:[fe]:[si])");
    },
    _g_cond_g2_175: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:m:[si]", ":(?:V0|Oo|[NA].*:[fe]:[si])");
    },
    _g_cond_g2_176: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:m:s", ":(?:V0|Oo|[NA].*:[fe]:[pi])");
    },
    _g_cond_g2_177: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:f:s", ":(?:V0|Oo|[NA].*:[fe]:[pi])");
    },
    _g_cond_g2_178: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:m:[pi]", ":(?:V0|Oo|[NA].*:[fe]:[pi])");
    },
    _g_cond_g2_179: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|tel|telle|");
    },
    _g_cond_g2_180: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|tels|telles|");
    },
    _g_sugg_g2_114: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].slice(0,-1);
    },
    _g_cond_g2_181: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|tel|telle|") && g_morph(lToken[nTokenOffset+4], ":[NA].*:[fe]", ":m");
    },
    _g_cond_g2_182: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|tel|telle|") && g_morph(lToken[nTokenOffset+4], ":[NA].*:f", ":[me]");
    },
    _g_cond_g2_183: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|tel|telle|") && g_morph(lToken[nTokenOffset+4], ":[NA].*:[me]", ":f");
    },
    _g_cond_g2_184: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|tel|telle|") && g_morph(lToken[nTokenOffset+4], ":[NA].*:m", ":[fe]");
    },
    _g_cond_g2_185: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|tels|telles|") && g_morph(lToken[nTokenOffset+4], ":[NA].*:f", ":[me]");
    },
    _g_cond_g2_186: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|tels|telles|") && g_morph(lToken[nTokenOffset+4], ":[NA].*:m", ":[fe]");
    },
    _g_cond_g2_187: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":[NA].*:m", ":[fe]");
    },
    _g_cond_g2_188: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+5], ":[NA].*:f", ":[me]");
    },
    _g_sugg_g2_115: function (lToken, nTokenOffset, nLastToken) {
        return suggMasPlur(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_189: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[NA]|>(?:et|ou)/") && ! g_morph(lToken[nTokenOffset+3], ">seul/");
    },
    _g_sugg_g2_116: function (lToken, nTokenOffset, nLastToken) {
        return suggMasPlur(lToken[nTokenOffset+4]["sValue"], true);
    },
    _g_cond_g2_190: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[pi]", ":G") && g_morph(lToken[nTokenOffset+4], ":[NA].*:s", "*") && ! apposition(lToken[nTokenOffset+3]["sValue"], lToken[nTokenOffset+4]["sValue"]) && ! (g_value(lToken[nLastToken+1], "|et|,|") && g_morph(g_token(lToken, nLastToken+2), ":A")) && ! (g_value(lToken[nTokenOffset+1], "|de|d’|") && g_value(lToken[nTokenOffset], "|un|une|"));
    },
    _g_sugg_g2_117: function (lToken, nTokenOffset, nLastToken) {
        return suggMasPlur(lToken[nTokenOffset+4]["sValue"]);
    },
    _g_sugg_g2_118: function (lToken, nTokenOffset, nLastToken) {
        return suggFemPlur(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_sugg_g2_119: function (lToken, nTokenOffset, nLastToken) {
        return suggFemPlur(lToken[nTokenOffset+4]["sValue"], true);
    },
    _g_sugg_g2_120: function (lToken, nTokenOffset, nLastToken) {
        return suggFemPlur(lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_g2_191: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"] != "cents";
    },
    _g_cond_g2_192: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":A.*:f");
    },
    _g_sugg_g2_121: function (lToken, nTokenOffset, nLastToken) {
        return suggMasSing(lToken[nLastToken-1+1]["sValue"], true);
    },
    _g_cond_g2_193: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nLastToken-1+1], ":A.*:p");
    },
    _g_sugg_g2_122: function (lToken, nTokenOffset, nLastToken) {
        return suggMasSing(lToken[nLastToken-1+1]["sValue"]);
    },
    _g_cond_g2_194: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":A.*:m");
    },
    _g_sugg_g2_123: function (lToken, nTokenOffset, nLastToken) {
        return suggFemSing(lToken[nLastToken-1+1]["sValue"], true);
    },
    _g_sugg_g2_124: function (lToken, nTokenOffset, nLastToken) {
        return suggFemSing(lToken[nLastToken-1+1]["sValue"]);
    },
    _g_sugg_g2_125: function (lToken, nTokenOffset, nLastToken) {
        return suggMasPlur(lToken[nLastToken-1+1]["sValue"], true);
    },
    _g_cond_g2_195: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nLastToken-1+1], ":A.*:s");
    },
    _g_sugg_g2_126: function (lToken, nTokenOffset, nLastToken) {
        return suggMasPlur(lToken[nLastToken-1+1]["sValue"]);
    },
    _g_sugg_g2_127: function (lToken, nTokenOffset, nLastToken) {
        return suggFemPlur(lToken[nLastToken-1+1]["sValue"], true);
    },
    _g_sugg_g2_128: function (lToken, nTokenOffset, nLastToken) {
        return suggFemPlur(lToken[nLastToken-1+1]["sValue"]);
    },
    _g_cond_g2_196: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|neuf|mille|") && g_morph(lToken[nTokenOffset+2], ":[NA].*:s", "*") && ! g_morph(lToken[nTokenOffset], ":D.*:s") && ! g_value(lToken[nTokenOffset+2], "|maximum|minimum|multiplié|divisé|janvier|février|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|rue|route|ruelle|place|boulevard|avenue|allée|chemin|sentier|square|impasse|cour|quai|chaussée|côte|vendémiaire|brumaire|frimaire|nivôse|pluviôse|ventôse|germinal|floréal|prairial|messidor|thermidor|fructidor|") && ! re.search("^[IVXLDM]+$", lToken[nTokenOffset+1]["sValue"]);
    },
    _g_cond_g2_197: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:s", "*") && ! g_morph(lToken[nTokenOffset], ":N.*:m:[is]") && ! g_morph(lToken[nTokenOffset], ":D.*:s") && ! g_value(lToken[nTokenOffset+2], "|maximum|minimum|multiplié|divisé|janvier|février|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|rue|route|ruelle|place|boulevard|avenue|allée|chemin|sentier|square|impasse|cour|quai|chaussée|côte|vendémiaire|brumaire|frimaire|nivôse|pluviôse|ventôse|germinal|floréal|prairial|messidor|thermidor|fructidor|");
    },
    _g_cond_g2_198: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+2], "|maximum|minimum|multiplié|divisé|") && g_morph(lToken[nTokenOffset+2], ":[NA].*:s", "*") && ! g_morph(lToken[nTokenOffset], ":D.*:s");
    },
    _g_cond_g2_199: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && ! g_value(lToken[nTokenOffset+2], "|Rois|Corinthiens|Thessaloniciens|");
    },
    _g_cond_g2_200: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && ! g_value(lToken[nTokenOffset], "|/|") && ! re.search("^0*[01](?:,[0-9]+|)$", lToken[nTokenOffset+1]["sValue"]) && g_morph(lToken[nTokenOffset+2], ":[NA].*:s", "*") && ! g_morph(lToken[nTokenOffset], ":(?:N|D.*:s)") && ! g_value(lToken[nTokenOffset+2], "|maximum|minimum|multiplié|divisé|janvier|février|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|rue|route|ruelle|place|boulevard|avenue|allée|chemin|sentier|square|impasse|cour|quai|chaussée|côte|vendémiaire|brumaire|frimaire|nivôse|pluviôse|ventôse|germinal|floréal|prairial|messidor|thermidor|fructidor|");
    },
    _g_cond_g2_201: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+2], "|maximum|minimum|fois|multiplié|divisé|janvier|février|mars|avril|mai|juin|juillet|août|aout|septembre|octobre|novembre|décembre|rue|route|ruelle|place|boulevard|avenue|allée|chemin|sentier|square|impasse|cour|quai|chaussée|côte|vendémiaire|brumaire|frimaire|nivôse|pluviôse|ventôse|germinal|floréal|prairial|messidor|thermidor|fructidor|") && ! re.search("^0*[01](?:,[0-9]+|)$", lToken[nTokenOffset+1]["sValue"]) && ! g_morph(lToken[nTokenOffset], ">(?:et|ou)/|:(?:N|D.*:[si])") && ! g_morph(lToken[nTokenOffset+3], ">(?:seul|maximum|minimum)/|:(?:[BG]|V0)");
    },
    _g_cond_g2_202: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:[pi]", "*") && g_morph(lToken[nTokenOffset+3], ":[NA].*:s", "*") && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]) && ! (g_value(lToken[nLastToken+1], "|et|,|") && g_morph(g_token(lToken, nLastToken+2), ":A"));
    },
    _g_sugg_g2_129: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].slice(0,-1);
    },
    _g_cond_g2_203: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ((g_morph(lToken[nTokenOffset+2], ":m", "*") && g_morph(lToken[nTokenOffset+3], ":f", "*")) || (g_morph(lToken[nTokenOffset+2], ":f", "*") && g_morph(lToken[nTokenOffset+3], ":m", "*"))) && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_204: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ((g_morph(lToken[nTokenOffset+2], ":s", "*") && g_morph(lToken[nTokenOffset+3], ":p", "*")) || (g_morph(lToken[nTokenOffset+2], ":p", "*") && g_morph(lToken[nTokenOffset+3], ":s", "*"))) && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]);
    },
    _g_sugg_g2_130: function (lToken, nTokenOffset, nLastToken) {
        return switchPlural(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_sugg_g2_131: function (lToken, nTokenOffset, nLastToken) {
        return switchPlural(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g2_205: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":p") && g_morph(lToken[nTokenOffset+3], ":[pi]") && g_morph(lToken[nTokenOffset+4], ":s") && lToken[nTokenOffset+4]["sValue"].gl_isLowerCase();
    },
    _g_sugg_g2_132: function (lToken, nTokenOffset, nLastToken) {
        return switchPlural(lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_g2_206: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":i") && g_morph(lToken[nTokenOffset+3], ":p")    && g_morph(lToken[nTokenOffset+4], ":s") && lToken[nTokenOffset+4]["sValue"].gl_isLowerCase();
    },
    _g_cond_g2_207: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":s") && g_morph(lToken[nTokenOffset+3], ":[si]") && g_morph(lToken[nTokenOffset+4], ":p") && lToken[nTokenOffset+4]["sValue"].gl_isLowerCase();
    },
    _g_cond_g2_208: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":i") && g_morph(lToken[nTokenOffset+3], ":s")    && g_morph(lToken[nTokenOffset+4], ":p") && lToken[nTokenOffset+4]["sValue"].gl_isLowerCase();
    },
    _g_cond_g2_209: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ( (g_morph(lToken[nTokenOffset+2], ":p", "*") && g_morph(lToken[nTokenOffset+3], ":s", "*")) || (g_morph(lToken[nTokenOffset+2], ":s", "*") && g_morph(lToken[nTokenOffset+3], ":p", "*")) ) && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_210: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ( (g_morph(lToken[nTokenOffset+2], ":m", ":[fe]") && g_morph(lToken[nTokenOffset+3], ":f", "*")) || (g_morph(lToken[nTokenOffset+2], ":f", ":[me]") && g_morph(lToken[nTokenOffset+3], ":m", "*")) ) && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_211: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ( (g_morph(lToken[nTokenOffset+2], ":p", ":[si]") && g_morph(lToken[nTokenOffset+3], ":s", "*")) || (g_morph(lToken[nTokenOffset+2], ":s", ":[pi]") && g_morph(lToken[nTokenOffset+3], ":p", "*")) ) && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_212: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ( (g_morph(lToken[nTokenOffset+2], ":m", ":[fe]") && g_morph(lToken[nTokenOffset+3], ":f", "*")) || (g_morph(lToken[nTokenOffset+2], ":f", ":[me]") && g_morph(lToken[nTokenOffset+3], ":m", "*")) ) && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]) && ! g_morph(lToken[nTokenOffset], ":[NA]|>(?:et|ou)/");
    },
    _g_cond_g2_213: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ( (g_morph(lToken[nTokenOffset+2], ":p", ":[si]") && g_morph(lToken[nTokenOffset+3], ":s", "*")) || (g_morph(lToken[nTokenOffset+2], ":s", ":[pi]") && g_morph(lToken[nTokenOffset+3], ":p", "*")) ) && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]) && ! g_morph(lToken[nTokenOffset], ":[NA]|>(?:et|ou)/");
    },
    _g_cond_g2_214: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ( (g_morph(lToken[nTokenOffset+2], ":m", ":[fe]") && g_morph(lToken[nTokenOffset+3], ":f", "*")) || (g_morph(lToken[nTokenOffset+2], ":f", ":[me]") && g_morph(lToken[nTokenOffset+3], ":m", "*")) ) && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]) && g_morph(lToken[nTokenOffset], ":[VRX]|<start>");
    },
    _g_cond_g2_215: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ( (g_morph(lToken[nTokenOffset+2], ":p", ":[si]") && g_morph(lToken[nTokenOffset+3], ":s", "*")) || (g_morph(lToken[nTokenOffset+2], ":s", ":[pi]") && g_morph(lToken[nTokenOffset+3], ":p", "*")) ) && ! apposition(lToken[nTokenOffset+2]["sValue"], lToken[nTokenOffset+3]["sValue"]) && g_morph(lToken[nTokenOffset], ":[VRX]|<start>");
    },
    _g_cond_g2_216: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+3]["sValue"].gl_isLowerCase();
    },
    _g_cond_g2_217: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+6], ":[NA].*:(?:m|f:p)", ":(?:G|P|[fe]:[is]|V0|3[sp])") && g_morph(lToken[nTokenOffset+5], ":[NA].*:[fe]") && ! apposition(lToken[nTokenOffset+5]["sValue"], lToken[nTokenOffset+6]["sValue"]);
    },
    _g_sugg_g2_133: function (lToken, nTokenOffset, nLastToken) {
        return suggFemSing(lToken[nTokenOffset+6]["sValue"], true);
    },
    _g_cond_g2_218: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+6], ":[NA].*:(?:f|m:p)", ":(?:G|P|[me]:[is]|V0|3[sp])") && g_morph(lToken[nTokenOffset+5], ":[NA].*:[me]") && ! apposition(lToken[nTokenOffset+5]["sValue"], lToken[nTokenOffset+6]["sValue"]);
    },
    _g_sugg_g2_134: function (lToken, nTokenOffset, nLastToken) {
        return suggMasSing(lToken[nTokenOffset+6]["sValue"], true);
    },
    _g_cond_g2_219: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+5], ":[NA].*:(?:f|m:p)", ":(?:G|P|[me]:[is]|V0|3[sp])") && g_morph(lToken[nTokenOffset+4], ":[NA].*:[me]") && ! apposition(lToken[nTokenOffset+4]["sValue"], lToken[nTokenOffset+5]["sValue"]);
    },
    _g_sugg_g2_135: function (lToken, nTokenOffset, nLastToken) {
        return suggMasSing(lToken[nTokenOffset+5]["sValue"], true);
    },
    _g_cond_g2_220: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+5], ":", ":[NA].*:f|>[aéeiou].*:e") && g_morph(lToken[nTokenOffset+6], ":[NA].*:(?:f|m:p)", ":(?:G|P|m:[is]|V0|3[sp])") && ! apposition(lToken[nTokenOffset+5]["sValue"], lToken[nTokenOffset+6]["sValue"]);
    },
    _g_cond_g2_221: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:m", ":G|>[aéeiou].*:[ef]") && g_morph(lToken[nLastToken-1+1], ":[NA].*:(?:f|m:p)", ":(?:G|P|[me]:[is]|V0|3[sp])") && ! apposition(lToken[nLastToken-2+1]["sValue"], lToken[nLastToken-1+1]["sValue"]);
    },
    _g_cond_g2_222: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:m", ":G|>[aéeiou].*:[ef]") && ! g_morph(lToken[nLastToken-2+1], ":[NA].*:f|>[aéeiou].*:e") && g_morph(lToken[nLastToken-1+1], ":[NA].*:(?:f|m:p)", ":(?:G|P|[me]:[is]|V0|3[sp])") && ! apposition(lToken[nLastToken-2+1]["sValue"], lToken[nLastToken-1+1]["sValue"]);
    },
    _g_cond_g2_223: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":[NA].*:s", ":(?:G|P|[me]:[ip]|V0|3[sp])") && g_morph(lToken[nLastToken-2+1], ":[NA].*:[pi]") && ! apposition(lToken[nLastToken-2+1]["sValue"], lToken[nLastToken-1+1]["sValue"]) && ! (g_value(lToken[nLastToken+1], "|et|ou|") && g_morph(g_token(lToken, nLastToken+2), ":A.*:[si]"));
    },
    _g_sugg_g2_136: function (lToken, nTokenOffset, nLastToken) {
        return suggPlur(lToken[nLastToken-1+1]["sValue"]);
    },
    _g_cond_g2_224: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+4], "|bâtiment|collège|corps|culte|établissement|groupe|journal|lycée|pays|régiment|vaisseau|village|");
    },
    _g_sugg_g2_137: function (lToken, nTokenOffset, nLastToken) {
        return "leurs " + suggPlur(lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_g2_225: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+4], "|armée|cité|compagnie|entreprise|église|fac|nation|université|planète|promotion|religion|unité|ville|");
    },
    _g_cond_g2_226: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":N.*:m:[si]", ":f") && g_morph(lToken[nTokenOffset+4], ":R", ">à/");
    },
    _g_cond_g2_227: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":N.*:f:[si]", ":m") && g_morph(lToken[nTokenOffset+4], ":R", ">à/");
    },
    _g_cond_g2_228: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":N.*:m:[pi]", ":f") && g_morph(lToken[nTokenOffset+4], ":R", ">à/");
    },
    _g_cond_g2_229: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":N.*:f:[pi]", ":m") && g_morph(lToken[nTokenOffset+4], ":R", ">à/");
    },
    _g_cond_g2_230: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":N.*:m:[si]", ":f");
    },
    _g_cond_g2_231: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":N.*:m:[si]", ":f:[si]");
    },
    _g_cond_g2_232: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":N.*:f:[si]", ":m");
    },
    _g_cond_g2_233: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":N.*:m:[pi]");
    },
    _g_cond_g2_234: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":N.*:f:[pi]", ":m");
    },
    _g_cond_g2_235: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":R") && g_morph(lToken[nTokenOffset+4], ":N.*:m:[pi]", ":f:[pi]");
    },
    _g_cond_g2_236: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":R") && g_morph(lToken[nTokenOffset+4], ":N.*:f:[pi]", ":m:[pi]");
    },
    _g_cond_g2_237: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":N.*:m:[pi]", ":f:[pi]");
    },
    _g_cond_g2_238: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":N.*:f:[pi]", ":m:[pi]");
    },
    _g_cond_g2_239: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":N", ":[GAVWM]");
    },
    _g_cond_g2_240: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":N", ":D") && (! g_morph(lToken[nTokenOffset+1], ":[me]:[si]") || g_morph(lToken[nTokenOffset+2], ":[pf]"));
    },
    _g_sugg_g2_138: function (lToken, nTokenOffset, nLastToken) {
        return suggSing(lToken[nTokenOffset+1]["sValue"]) + " " + suggMasSing(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_sugg_g2_139: function (lToken, nTokenOffset, nLastToken) {
        return suggMasSing(lToken[nTokenOffset+1]["sValue"]) + " " + suggMasSing(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g2_241: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":N", ":D") && (! g_morph(lToken[nTokenOffset+1], ":[me]:[si]") || g_morph(lToken[nTokenOffset+2], ":p"));
    },
    _g_sugg_g2_140: function (lToken, nTokenOffset, nLastToken) {
        return suggSing(lToken[nTokenOffset+1]["sValue"]) + " " + suggSing(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_sugg_g2_141: function (lToken, nTokenOffset, nLastToken) {
        return suggMasSing(lToken[nTokenOffset+1]["sValue"]) + " " + suggSing(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g2_242: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D");
    },
    _g_sugg_g2_142: function (lToken, nTokenOffset, nLastToken) {
        return suggPlur(lToken[nLastToken-2+1]["sValue"]);
    },
    _g_cond_g2_243: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|quatre|");
    },
    _g_cond_g2_244: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nLastToken+1], ":B") && ! g_morph(lToken[nTokenOffset], ">(?:numéro|page|chapitre|référence|année|test|série)/");
    },
    _g_sugg_g2_143: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/vingts/g, "vingt").replace(/VINGTS/g, "VINGT");
    },
    _g_cond_g2_245: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nLastToken+1], ":B:e:p|>une?") && ! g_morph(lToken[nTokenOffset], ">(?:numéro|page|chapitre|référence|année|test|série)/");
    },
    _g_cond_g2_246: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken+1], ":B:e:p|>une?");
    },
    _g_cond_g2_247: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":[VR]|<start>", ":B");
    },
    _g_cond_g2_248: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken+1], ":(?:B:e:p|N.*:p)", ":[QA]") || (g_morph(lToken[nTokenOffset], ":B") && g_morph(lToken[nLastToken+1], ":[NA]"));
    },
    _g_cond_g2_249: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:s", ":[ip]|>o(?:nde|xydation|r)/") && g_morph(lToken[nTokenOffset], ":(?:G|[123][sp])|<start>|>,", ":[AD]");
    },
    _g_cond_g2_250: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+4], ":[NA].*:s", ":[ip]|>fraude/");
    },
    _g_cond_g2_251: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":D|<start>");
    },
    _g_sugg_g2_144: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+3]["sValue"].slice(0,-1);
    },
    _g_cond_g2_252: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+4], ":(?:N|MP)");
    },
    _g_sugg_g2_145: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].slice(0,-2)+"s";
    },
    _g_cond_g2_253: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":V.*:[123]|>(?:tou(?:te|)s|pas|rien|guère|jamais|toujours|souvent)/", ":[DRB]");
    },
    _g_cond_g2_254: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+1]["sValue"].gl_isLowerCase() && g_morph(lToken[nTokenOffset], ":V", ":[DA]") && ! g_morph(lToken[nLastToken+1], ":[NA].*:[pi]") && ! (g_morph(lToken[nTokenOffset], ">(?:être|sembler|devenir|rester|demeurer|redevenir|para[îi]tre|trouver)/.*:[123]p") && g_morph(lToken[nLastToken+1], ":G|<end>|>,/"));
    },
    _g_cond_g2_255: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "(?i)\\b(?:lit|fauteuil|armoire|commode|guéridon|tabouret|chaise)s?\\b") && ! g_morph(lToken[nLastToken+1], ">sculpter/");
    },
    _g_cond_g2_256: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":(?:V|R|[NAQ].*:s)", ":(?:[NA].*:[pi]|V0e.*:[123]p)");
    },
    _g_cond_g2_257: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":D.*:f:s");
    },
    _g_cond_g2_258: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":V0e.*:3p") || g_morph(lToken[nLastToken+1], ":[AQ]");
    },
    _g_cond_g2_259: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"] != "clair" && lToken[nTokenOffset+2]["sValue"] != "Claire" && g_morph(lToken[nTokenOffset+1], ":(?:[123][sp]|P|Y)");
    },
    _g_cond_g2_260: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":V");
    },
    _g_cond_g2_261: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":V", ":[AN].*:[me]:[pi]|>(?:être|sembler|devenir|re(?:ster|devenir)|para[îi]tre|appara[îi]tre)/.*:(?:[123]p|P|Q|Y)|>(?:affirmer|trouver|croire|désirer|estimer|préférer|penser|imaginer|voir|vouloir|aimer|adorer|rendre|souhaiter)/") && ! g_morph(lToken[nLastToken+1], ":A.*:[me]:[pi]");
    },
    _g_cond_g2_262: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":V", ":[AN].*:[me]:[pi]|>(?:être|sembler|devenir|re(?:ster|devenir)|para[îi]tre|appara[îi]tre)/.*:(?:[123]p|P|Q|Y)");
    },
    _g_cond_g2_263: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":V", ":[DA].*:p");
    },
    _g_cond_g2_264: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+2], ":3[sp]");
    },
    _g_sugg_g2_146: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+2]["sValue"], ":3s");
    },
    _g_cond_g2_265: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+3], ":3[sp]");
    },
    _g_sugg_g2_147: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+3]["sValue"], ":3s");
    },
    _g_sugg_g2_148: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+3]["sValue"], ":3p");
    },
    _g_cond_g2_266: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[me]:[si]") &&  g_morph(lToken[nTokenOffset+4], ":Q.*:[me]:[si]", ":3s");
    },
    _g_sugg_g2_149: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+4]["sValue"], ":3s");
    },
    _g_cond_g2_267: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[fe]:[si]") &&  g_morph(lToken[nTokenOffset+4], ":Q.*:[fe]:[si]", ":3s");
    },
    _g_cond_g2_268: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[si]") &&  g_morph(lToken[nTokenOffset+4], ":Q.*:[si]", ":3s");
    },
    _g_cond_g2_269: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[pi]") &&  g_morph(lToken[nTokenOffset+4], ":Q.*:[pi]", ":3s");
    },
    _g_cond_g2_270: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[pi]", ":3pl") &&  g_morph(lToken[nTokenOffset+4], ":Q.*:[pi]", ":3s");
    },
    _g_cond_g2_271: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ">être/");
    },
    _g_cond_g2_272: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nLastToken-1+1]["sValue"].gl_isLowerCase() && g_morph(lToken[nLastToken-1+1], ":V", ":[YM]" );
    },
    _g_sugg_g2_150: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbInfi(lToken[nLastToken-1+1]["sValue"]);
    },
    _g_cond_g2_273: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nLastToken-1+1]["sValue"].gl_isLowerCase() && g_morph(lToken[nLastToken-1+1], ":V", ":[NYM]" );
    },
    _g_cond_g2_274: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nLastToken-1+1]["sValue"].gl_isLowerCase() && g_morph(lToken[nLastToken-1+1], ":V", ":[YEM]");
    },
    _g_cond_g2_275: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":V", ":M") && ! (lToken[nLastToken-1+1]["sValue"].endsWith("ez") && g_value(lToken[nLastToken+1], "|vous|"));
    },
    _g_cond_g2_276: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":V1.*:(?:Q|[123][sp])");
    },
    _g_cond_g2_277: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":V1.*:(?:Q|[12][sp])", ":N");
    },
    _g_cond_g2_278: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":V1", ":M");
    },
    _g_sugg_g2_151: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbInfi(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_g2_279: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":V1.*:(?:Q|[123][sp])", ":[NM]");
    },
    _g_cond_g2_280: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ">(?:passer|tenir)/") && g_morph(lToken[nLastToken-1+1], ":V1.*:(?:Q|[123][sp])", ":[NM]");
    },
    _g_cond_g2_281: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+3]["sValue"].slice(0,1).gl_isUpperCase();
    },
    _g_cond_g2_282: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nLastToken-1+1]["sValue"].gl_isLowerCase();
    },
    _g_cond_g2_283: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+2]["sValue"].slice(0,1).gl_isUpperCase() && ! g_morph(lToken[nTokenOffset], ">(?:en|passer|qualifier)/") && ! g_morph(lToken[nTokenOffset+2], ">(?:fieffer|sacrer)/") && ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "(?i)(?:quelqu(?:e chose|’une?)|qu’y a-t-il |\\b(?:l(?:es?|a)|nous|vous|me|te|se) trait|personne|points? +$|autant +$|ça +|rien d(?:e |’)|rien(?: +[a-zéèêâîûù]+|) +$)") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_ceque_");
    },
    _g_sugg_g2_152: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbInfi(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g2_284: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+1], ":N") && (g_analyse(lToken[nLastToken-1+1], ":V1.*:Q", ":(?:M|Oo)") || g_analyse(lToken[nLastToken-1+1], ":[123][sp]", ":[MNGA]"));
    },
    _g_cond_g2_285: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_analyse(lToken[nLastToken-1+1], ":Q", ":M");
    },
    _g_cond_g2_286: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_analyse(lToken[nLastToken-1+1], ":Q", ":[MN]");
    },
    _g_cond_g2_287: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_analyse(lToken[nLastToken-1+1], ":Q", ":M") && (g_value(lToken[nTokenOffset], "|me|m’|te|t’|se|s’|") || (g_value(lToken[nTokenOffset], "|nous|") && g_value(g_token(lToken, nTokenOffset+1-2), "|nous|")) || (g_value(lToken[nTokenOffset], "|vous|") && g_value(g_token(lToken, nTokenOffset+1-2), "|vous|")));
    },
    _g_cond_g2_288: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|une|la|cette|ma|ta|sa|notre|votre|leur|quelle|de|d’|") && g_analyse(lToken[nLastToken-1+1], ":Q", ":M");
    },
    _g_cond_g2_289: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":(?:Q|2p)", ":M") && ! (lToken[nLastToken-1+1]["sValue"].endsWith("ez") && g_value(lToken[nLastToken+1], "|vous|"));
    },
    _g_cond_g2_290: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":V", ":[123][sp]");
    },
    _g_cond_g2_291: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 3) && g_morph(lToken[nTokenOffset+2], ":Q") && ! g_morph(lToken[nTokenOffset], "V0.*[12]p");
    },
    _g_cond_g2_292: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|devoirs|") && g_morph(lToken[nLastToken-1+1], ":V", ":M") && ! (g_morph(lToken[nTokenOffset+1], ":N") && g_morph(lToken[nTokenOffset], ":D")) && ! (g_value(lToken[nTokenOffset+1], "|devant|") && g_morph(lToken[nLastToken-1+1], ":N"));
    },
    _g_cond_g2_293: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|devoirs|") && g_morph(lToken[nLastToken-1+1], ":V", ":M") && ! (g_morph(lToken[nTokenOffset+1], ":N") && g_morph(lToken[nTokenOffset], ":D")) && ! (g_value(lToken[nTokenOffset+1], "|devant|") && g_morph(lToken[nLastToken-1+1], ":N")) && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_ceque_");
    },
    _g_cond_g2_294: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":V", ":M");
    },
    _g_cond_g2_295: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|puis|pouvoirs|") && g_morph(lToken[nLastToken-1+1], ":V", ":M") && ! (g_morph(lToken[nTokenOffset+1], ":N") && g_morph(lToken[nTokenOffset], ":D"));
    },
    _g_cond_g2_296: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|puis|pouvoirs|") && g_morph(lToken[nLastToken-1+1], ":V", ":M") && ! (g_morph(lToken[nTokenOffset+1], ":N") && g_morph(lToken[nTokenOffset], ":D")) && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_ceque_");
    },
    _g_cond_g2_297: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|savoirs|") && ! g_value(lToken[nTokenOffset], "|me|m’|te|t’|se|s’|nous|vous|le|la|l’|les|") && g_morph(lToken[nLastToken-1+1], ":V", ":M") && ! (g_morph(lToken[nTokenOffset+1], ":N") && g_morph(lToken[nTokenOffset], ":D"));
    },
    _g_cond_g2_298: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|savoirs|") && g_morph(lToken[nLastToken-1+1], ":V", ":M") && ! (g_morph(lToken[nTokenOffset+1], ":N") && g_morph(lToken[nTokenOffset], ":D"));
    },
    _g_cond_g2_299: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|savoirs|") && g_morph(lToken[nLastToken-1+1], ":V", ":M") && ! (g_morph(lToken[nTokenOffset+1], ":N") && g_morph(lToken[nTokenOffset], ":D")) && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_ceque_");
    },
    _g_cond_g2_300: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|vouloirs|") && ! g_value(lToken[nTokenOffset], "|me|m’|te|t’|se|s’|nous|vous|le|la|l’|les|") && g_morph(lToken[nLastToken-1+1], ":V", ":M") && ! (g_morph(lToken[nTokenOffset+1], ":N") && g_morph(lToken[nTokenOffset], ":D"));
    },
    _g_cond_g2_301: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|vouloirs|") && g_morph(lToken[nLastToken-1+1], ":V", ":[MN]") && ! (g_morph(lToken[nTokenOffset+1], ":N") && g_morph(lToken[nTokenOffset], ":D"));
    },
    _g_cond_g2_302: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|vouloirs|") && g_morph(lToken[nLastToken-1+1], ":V", ":M") && ! (g_morph(lToken[nTokenOffset+1], ":N") && g_morph(lToken[nTokenOffset], ":D"));
    },
    _g_cond_g2_303: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|vouloirs|") && g_morph(lToken[nLastToken-1+1], ":V", ":M") && ! (g_morph(lToken[nTokenOffset+1], ":N") && g_morph(lToken[nTokenOffset], ":D")) && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_ceque_");
    },
    _g_cond_g2_304: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ">(?:devoir|savoir|pouvoir|vouloir)/") && g_morph(lToken[nLastToken-1+1], ":(?:Q|A|[123][sp])", ":[GYW]");
    },
    _g_cond_g2_305: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ">(?:devoir|savoir|pouvoir|vouloir)/") && g_morph(lToken[nLastToken-1+1], ":(?:Q|A|[123][sp])", ":[GYWN]");
    },
    _g_cond_g2_306: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_tag_before(lToken[nTokenOffset+1], dTags, "_que_") && g_morph(lToken[nLastToken-1+1], ":3[sp]"));
    },
    _g_cond_g2_307: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ">(?:en|de|être)/") && g_morph(lToken[nTokenOffset+2], ":V", ":[MG]") && ! (g_morph(lToken[nTokenOffset+1], ":N") && g_morph(lToken[nTokenOffset+2], ":Q.*:m:[sp]"));
    },
    _g_cond_g2_308: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":V1.*:(?:Q|Ip.*:2p|Iq.*:[123]s)", ">désemparer/.*:Q");
    },
    _g_cond_g2_309: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":V1.*:(?:Q|Ip.*:2p|Iq.*:[123]s)", ">désemparer/.*:Q|:N");
    },
    _g_cond_g2_310: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":V1.*:(?:Q|Ip.*:2p|Iq.*:[123]s)", ">désemparer/.*:Q");
    },
    _g_cond_g2_311: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+2], ":N") && g_morph(lToken[nTokenOffset+3], ":V1.*:(?:Q|Ip.*:2p)", ">désemparer/.*:Q");
    },
    _g_cond_g2_312: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+2], ":N") && g_morph(lToken[nLastToken-1+1], ":V1.*:(?:Q|Ip.*:2p|Iq.*:[123]s)", ">désemparer/.*:Q|:N");
    },
    _g_cond_g2_313: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+2], ":N") && g_morph(lToken[nLastToken-1+1], ":V1.*:(?:Q|Ip.*:2p|Iq.*:[123]s)", ">désemparer/.*:Q");
    },
    _g_cond_g2_314: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ">laisser") && (g_morph(lToken[nTokenOffset+2], ":V1.*:(?:Q|Ip.*:2[sp])", ">désemparer/.*:Q") || (! g_morph(lToken[nTokenOffset], ":D") && g_morph(lToken[nLastToken-1+1], ":V1.*:Iq.*:[123]s", ">désemparer/.*:Q")));
    },
    _g_cond_g2_315: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ">laisser") && (g_morph(lToken[nLastToken-1+1], ":V1.*:(?:Q|Ip.*:2[sp])", ">désemparer/.*:Q|:N") || (! g_morph(lToken[nTokenOffset], ":D") && g_morph(lToken[nLastToken-1+1], ":V1.*:Iq.*:[123]s", ">désemparer/.*:Q|:N")));
    },
    _g_cond_g2_316: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ">laisser") && (g_morph(lToken[nLastToken-1+1], ":V1.*:(?:Q|Ip.*:2[sp])", ">désemparer/.*:Q") || (! g_morph(lToken[nTokenOffset], ":D") && g_morph(lToken[nLastToken-1+1], ":V1.*:Iq.*:[123]s", ">désemparer/.*:Q")));
    },
    _g_cond_g2_317: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_analyse(lToken[nLastToken-1+1], ":V1.*:(?:Q|[123][sp])", ":[GM]");
    },
    _g_cond_g2_318: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":", ":[GN]") && g_morph(lToken[nTokenOffset+2], ":V", ":M");
    },
    _g_cond_g2_319: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":", ":[GN]") && g_morph(lToken[nTokenOffset+2], ":V", ":M") && ! g_value(lToken[nTokenOffset], "|le|la|l’|les|");
    },
    _g_cond_g2_320: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":", ":[GN]") && g_morph(lToken[nLastToken-1+1], ":V", ":M|>(?:accompagner|armer|armurer|casquer|débrailler|déguiser|épuiser)/") && ! g_value(lToken[nLastToken+1], "|par|");
    },
    _g_cond_g2_321: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":V1");
    },
    _g_cond_g2_322: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|que|qu’|");
    },
    _g_cond_g2_323: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+3], lToken[nTokenOffset+3+1], 1, 1);
    },
    _g_sugg_g2_153: function (lToken, nTokenOffset, nLastToken) {
        return "a "+suggVerbPpas(lToken[nTokenOffset+4]["sValue"], ":m:s");
    },
    _g_sugg_g2_154: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nTokenOffset+4]["sValue"], ":m:s");
    },
    _g_cond_g2_324: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+4], lToken[nTokenOffset+4+1], 1, 1);
    },
    _g_sugg_g2_155: function (lToken, nTokenOffset, nLastToken) {
        return "a "+suggVerbPpas(lToken[nTokenOffset+5]["sValue"], ":m:s");
    },
    _g_sugg_g2_156: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nTokenOffset+5]["sValue"], ":m:s");
    },
    _g_cond_g2_325: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+5], lToken[nTokenOffset+5+1], 1, 1);
    },
    _g_sugg_g2_157: function (lToken, nTokenOffset, nLastToken) {
        return "a "+suggVerbPpas(lToken[nTokenOffset+6]["sValue"], ":m:s");
    },
    _g_sugg_g2_158: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nTokenOffset+6]["sValue"], ":m:s");
    },
    _g_cond_g2_326: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":V1.*:Y");
    },
    _g_sugg_g2_159: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_g2_327: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_value(lToken[nLastToken-1+1], "|nous|vous|") && g_morph(lToken[nLastToken+1], ":Y"));
    },
    _g_cond_g2_328: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:p", ":(?:[NA].*:[si]|G)");
    },
    _g_cond_g2_329: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nTokenOffset+3], ":[NA].*:s", ":(?:[NA].*:[pi]|G)");
    },
    _g_cond_g2_330: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+2], "|été|");
    },
    _g_cond_g2_331: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA]", ":(?:[123]p|P|X|G|V0)") && g_morph(lToken[nTokenOffset+3], ":[NA]", ":(?:G|[123][sp]|P|M)");
    },
    _g_cond_g2_332: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":N", ":A") && g_morph(lToken[nTokenOffset+2], ":A", ":N");
    },
    _g_cond_g2_333: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA]", ":(?:[123]p|P|X|G|Y|V0)") && g_morph(lToken[nTokenOffset+3], ":[NA]", ":(?:G|[123][sp]|P|M)");
    },
    _g_cond_g2_334: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":N", ":A") && g_morph(lToken[nTokenOffset+2], ":A");
    },
    _g_cond_g2_335: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA]", ":(?:[123][sp]|P|X|G|Y|V0)|>air/") && g_morph(lToken[nTokenOffset+3], ":[NA]", ":(?:G|[123][sp]|P|M)");
    },
    _g_cond_g2_336: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|le|la|du|au|") && g_morph(lToken[nTokenOffset+2], ":[NA]", ":(?:[123]p|P|X|G|Y|V0)") && g_morph(lToken[nTokenOffset+3], ":[NA]", ":(?:G|[123][sp]|P|M)");
    },
    _g_cond_g2_337: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|des|les|aux|") && g_morph(lToken[nTokenOffset+2], ":[NA]", ":(?:[123]p|P|X|G|Y|V0)") && g_morph(lToken[nTokenOffset+3], ":[NA]", ":(?:G|[123][sp]|P|M)");
    },
    _g_cond_g2_338: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA]") && g_morph(lToken[nTokenOffset+3], ":[NA]", ":(?:G|[123][sp]|P|M)");
    },
    _g_cond_g2_339: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+2], "|autres|");
    },
    _g_cond_g2_340: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+2], ">(?:être|demeurer|devenir|redevenir|sembler|para[îi]tre|rester)/");
    },
    _g_cond_g2_341: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|en|");
    },
    _g_cond_g2_342: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|j’|n’|tu|il|on|");
    },
    _g_cond_g2_343: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":M") && g_morph(lToken[nTokenOffset+3], ":M") && g_morph(lToken[nTokenOffset+3], ":M");
    },
    _g_cond_g2_344: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":M") && g_morph(lToken[nTokenOffset+4], ":M");
    },
    _g_da_ppc2_1: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nTokenOffset+2], ":Q");
    },
    _g_cond_ppc2_1: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:[pi]") && g_morph(lToken[nTokenOffset+5], ":[NA].*:[si]");
    },
    _g_cond_gv1_1: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|êtres|");
    },
    _g_cond_gv1_2: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].endsWith("e") && g_morph(lToken[nTokenOffset+2], ":V1.*:Ip.*:[13]s", ":[GMA]") && ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "(?i)\\belle +(?:ne +|n’|)$");
    },
    _g_sugg_gv1_1: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nTokenOffset+2]["sValue"], ":m:s");
    },
    _g_cond_gv1_3: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && lToken[nTokenOffset+2]["sValue"].endsWith("s") && g_morph(lToken[nTokenOffset+2], ":V1.*:Ip.*:2s", ":[GMA]") && ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "(?i)\\belles +(?:ne +|n’|)$");
    },
    _g_sugg_gv1_2: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nTokenOffset+2]["sValue"], ":m:p");
    },
    _g_cond_gv1_4: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|avoirs|");
    },
    _g_cond_gv1_5: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].endsWith("e") && g_morph(lToken[nTokenOffset+2], ":V1.*:Ip.*:[13]s", ":[GM]|>envie/");
    },
    _g_cond_gv1_6: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && lToken[nTokenOffset+2]["sValue"].endsWith("s") && g_morph(lToken[nTokenOffset+2], ":V1.*:Ip.*:2s", ":[GM]");
    },
    _g_cond_gv1_7: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[pi]", ":G");
    },
    _g_cond_gv1_8: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA]", ":G");
    },
    _g_cond_gv1_9: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":V[123]", ":(?:N|A|Q|W|G|3p)") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_ceque_");
    },
    _g_cond_gv1_10: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":V.*:3p", ":[GPY]") && ! g_value(lToken[nLastToken+1], "|ils|elles|iel|iels|") && ( (g_morph(lToken[nTokenOffset+3], ":V...t_") && g_value(lToken[nLastToken+1], "le|la|l’|un|une|ce|cet|cette|mon|ton|son|ma|ta|sa|leur") && ! g_tag(lToken[nLastToken+1], "_enum_")) || g_morph(lToken[nTokenOffset+3], ":V..i__") );
    },
    _g_sugg_gv1_3: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+3]["sValue"], ":1p");
    },
    _g_sugg_gv1_4: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+4]["sValue"], ":1p");
    },
    _g_sugg_gv1_5: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+4]["sValue"], ":2p");
    },
    _g_cond_gv1_11: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":V0");
    },
    _g_cond_gv1_12: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":[123]p");
    },
    _g_cond_gv1_13: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo;
    },
    _g_cond_gv1_14: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":V[123]_.__p_e_", "*") || (g_value(lToken[nLastToken+1], "|<end>|") && ! g_value(lToken[nTokenOffset], "|que|qu’|"));
    },
    _g_sugg_gv1_6: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nLastToken-1+1]["sValue"], ":m:s");
    },
    _g_cond_gv1_15: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":V[123]_.__p_e_", "*") || (g_value(lToken[nLastToken+1], "|<end>|") && ! g_morph(lToken[nTokenOffset], ":R|>que/"));
    },
    _g_sugg_gv1_7: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nLastToken-1+1]["sValue"], ":f:s");
    },
    _g_sugg_gv1_8: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nLastToken-1+1]["sValue"], ":p");
    },
    _g_sugg_gv1_9: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nLastToken-1+1]["sValue"], ":m:p");
    },
    _g_sugg_gv1_10: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nLastToken-1+1]["sValue"], ":f:p");
    },
    _g_cond_gv1_16: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":(?:Y|[123][sp])", ":[QAG]");
    },
    _g_sugg_gv1_11: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nLastToken-1+1]["sValue"]);
    },
    _g_cond_gv1_17: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nLastToken-2+1], ":[123]s") && g_morph(lToken[nLastToken-1+1], ":Q.*:p") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_que_") && ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "(?i)\\bon (?:ne |)$");
    },
    _g_sugg_gv1_12: function (lToken, nTokenOffset, nLastToken) {
        return suggSing(lToken[nLastToken-1+1]["sValue"]);
    },
    _g_cond_gv1_18: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nLastToken-2+1], ">(?:matin|soir|soirée|nuit|après-midi|jour|année|semaine|mois|seconde|minute|heure|siècle|millénaire|fois)/");
    },
    _g_sugg_gv1_13: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nLastToken-4+1]["sValue"], ":m:s");
    },
    _g_sugg_gv1_14: function (lToken, nTokenOffset, nLastToken) {
        return suggSing(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_sugg_gv1_15: function (lToken, nTokenOffset, nLastToken) {
        return suggPlur(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_gv1_19: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! lToken[nTokenOffset+2]["sValue"].endsWith("ons");
    },
    _g_cond_gv1_20: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_21: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":(?:[123]s|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_sugg_gv1_16: function (lToken, nTokenOffset, nLastToken) {
        return suggMasSing(lToken[nLastToken-1+1]["sValue"]);
    },
    _g_cond_gv1_22: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":(?:[123]s|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_23: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+4], ":(?:[123]s|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_24: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+5], ":(?:[123]s|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_25: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+1], "_enum_") && g_morph(lToken[nTokenOffset+2], ":(?:3s|P)") && ! g_morph(lToken[nTokenOffset], ":[RV]|>(?:et|ou)/") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_26: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+1], "_enum_") && g_morph(lToken[nTokenOffset+3], ":(?:3s|P)") && ! g_morph(lToken[nTokenOffset], ":[RV]|>(?:et|ou)/") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_27: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+1], "_enum_") && g_morph(lToken[nTokenOffset+4], ":(?:3s|P)") && ! g_morph(lToken[nTokenOffset], ":[RV]|>(?:et|ou)/") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_28: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+1], "_enum_") && g_morph(lToken[nTokenOffset+5], ":(?:3s|P)") && ! g_morph(lToken[nTokenOffset], ":[RV]|>(?:et|ou)/") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_29: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], "[123][sp]");
    },
    _g_cond_gv1_30: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+4], "[123][sp]");
    },
    _g_cond_gv1_31: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+5], "[123][sp]");
    },
    _g_cond_gv1_32: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[RV]") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_33: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+6], ":(?:[123]s|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_34: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":R");
    },
    _g_cond_gv1_35: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":(?:[123]s|P)");
    },
    _g_cond_gv1_36: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+4], ":(?:[123]s|P)");
    },
    _g_cond_gv1_37: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+5], ":(?:[123]s|P)");
    },
    _g_cond_gv1_38: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+6], ":(?:[123]s|P)");
    },
    _g_cond_gv1_39: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+7], ":(?:[123]s|P)");
    },
    _g_cond_gv1_40: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+1], "_enum_") && ! g_morph(lToken[nTokenOffset], ":[RV]|>(?:et|ou)/") && g_morph(lToken[nTokenOffset+2], ":(?:[123]s|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_sugg_gv1_17: function (lToken, nTokenOffset, nLastToken) {
        return suggFemSing(lToken[nLastToken-1+1]["sValue"]);
    },
    _g_cond_gv1_41: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+1], "_enum_") && ! g_morph(lToken[nTokenOffset], ":[RV]|>(?:et|ou)/") && g_morph(lToken[nTokenOffset+3], ":(?:[123]s|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_42: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+1], "_enum_") && ! g_morph(lToken[nTokenOffset], ":[RV]|>(?:et|ou)/") && g_morph(lToken[nTokenOffset+4], ":(?:[123]s|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_43: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+1], "_enum_") && ! g_morph(lToken[nTokenOffset], ":[RV]|>(?:et|ou)/") && g_morph(lToken[nTokenOffset+5], ":(?:[123]s|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_44: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! g_morph(lToken[nTokenOffset], ":[RV]") && g_morph(lToken[nTokenOffset+2], ":(?:3s|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_45: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! g_morph(lToken[nTokenOffset], ":[RV]") && g_morph(lToken[nTokenOffset+3], ":(?:3s|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_46: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! g_morph(lToken[nTokenOffset], ":[RV]") && g_morph(lToken[nTokenOffset+4], ":(?:3s|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_47: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! g_morph(lToken[nTokenOffset], ":[RV]") && g_morph(lToken[nTokenOffset+5], ":(?:3s|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_48: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! g_morph(lToken[nTokenOffset], ":[RV]|>(?:ne|nous)/") && g_morph(lToken[nTokenOffset+2], ":(?:1p|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_sugg_gv1_18: function (lToken, nTokenOffset, nLastToken) {
        return suggPlur(lToken[nLastToken-1+1]["sValue"]);
    },
    _g_cond_gv1_49: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! g_morph(lToken[nTokenOffset], ":[RV]|>(?:ne|nous)/") && g_morph(lToken[nTokenOffset+3], ":(?:1p|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_50: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! g_morph(lToken[nTokenOffset], ":[RV]|>(?:ne|nous)/") && g_morph(lToken[nTokenOffset+4], ":(?:1p|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_51: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! g_morph(lToken[nTokenOffset], ":[RV]|>(?:ne|nous)/") && g_morph(lToken[nTokenOffset+5], ":(?:1p|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_52: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_sugg_gv1_19: function (lToken, nTokenOffset, nLastToken) {
        return suggMasPlur(lToken[nLastToken-1+1]["sValue"]);
    },
    _g_cond_gv1_53: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[RV]") && g_morph(lToken[nTokenOffset+2], ":(?:3p|P)") && ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_54: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[RV]") && g_morph(lToken[nTokenOffset+3], ":(?:3p|P)") && ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_55: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[RV]") && g_morph(lToken[nTokenOffset+4], ":(?:3p|P)") && ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_56: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[RV]") && g_morph(lToken[nTokenOffset+5], ":(?:3p|P)") && ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_57: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":(?:3p|P)") && ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_58: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+4], ":(?:3p|P)") && ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_59: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+5], ":(?:3p|P)") && ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_60: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+6], ":(?:3p|P)") && ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_61: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":R") && ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|");
    },
    _g_sugg_gv1_20: function (lToken, nTokenOffset, nLastToken) {
        return suggFemPlur(lToken[nLastToken-1+1]["sValue"]);
    },
    _g_cond_gv1_62: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! g_morph(lToken[nTokenOffset], ":[RV]") && g_morph(lToken[nTokenOffset+2], ":(?:3p|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_63: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! g_morph(lToken[nTokenOffset], ":[RV]") && g_morph(lToken[nTokenOffset+3], ":(?:3p|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_64: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! g_morph(lToken[nTokenOffset], ":[RV]") && g_morph(lToken[nTokenOffset+4], ":(?:3p|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_65: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! g_morph(lToken[nTokenOffset], ":[RV]") && g_morph(lToken[nTokenOffset+5], ":(?:3p|P)") && ! (g_tag(lToken[nTokenOffset], "_ceque_") && g_morph(lToken[nLastToken-1+1], ":3s"));
    },
    _g_cond_gv1_66: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[123]s", ":[GNAQWY]");
    },
    _g_sugg_gv1_21: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_gv1_67: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "[çcCÇ]’$|[cC][eE] n’$|[çÇ][aA] (?:[nN]’|)$") && ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "(?i)^ *ne pas ") && ! g_morph(lToken[nTokenOffset], ":Y");
    },
    _g_cond_gv1_68: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":Y", ":[AN]");
    },
    _g_cond_gv1_69: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":V1..t.*:Y", ":[AN]") && ! g_morph(lToken[nLastToken+1], ":D");
    },
    _g_cond_gv1_70: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_que_") && ! g_morph(lToken[nTokenOffset+1], ":G") && g_morph(lToken[nTokenOffset+2], ":[123]s", ":(?:C|N.*:p)");
    },
    _g_cond_gv1_71: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_que_") && ! g_morph(lToken[nTokenOffset+1], ":G") && g_morph(lToken[nTokenOffset+3], ":[123]s", ":(?:C|N.*:p)");
    },
    _g_cond_gv1_72: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_que_") && ! g_morph(lToken[nTokenOffset+1], ":G") && g_morph(lToken[nTokenOffset+4], ":[123]s", ":(?:C|N.*:p)");
    },
    _g_cond_gv1_73: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_que_") && ! g_morph(lToken[nTokenOffset+1], ":G") && g_morph(lToken[nTokenOffset+5], ":[123]s", ":(?:C|N.*:p)");
    },
    _g_cond_gv1_74: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[123]s", ":(?:C|N.*:p)");
    },
    _g_cond_gv1_75: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[123]s", ":(?:C|N.*:p)");
    },
    _g_cond_gv1_76: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+4], ":[123]s", ":(?:C|N.*:p)");
    },
    _g_cond_gv1_77: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+5], ":[123]s", ":(?:C|N.*:p)");
    },
    _g_cond_gv1_78: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_que_") && ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! g_morph(lToken[nTokenOffset+1], ":G") && g_morph(lToken[nTokenOffset+2], ":[13]p");
    },
    _g_cond_gv1_79: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_que_") && ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! g_morph(lToken[nTokenOffset+1], ":G") && g_morph(lToken[nTokenOffset+3], ":[13]p");
    },
    _g_cond_gv1_80: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_que_") && ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! g_morph(lToken[nTokenOffset+1], ":G") && g_morph(lToken[nTokenOffset+4], ":[13]p");
    },
    _g_cond_gv1_81: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_que_") && ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && ! g_morph(lToken[nTokenOffset+1], ":G") && g_morph(lToken[nTokenOffset+5], ":[13]p");
    },
    _g_cond_gv1_82: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+2], ":[13]p");
    },
    _g_cond_gv1_83: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[13]p");
    },
    _g_cond_gv1_84: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+4], ":[13]p");
    },
    _g_cond_gv1_85: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+5], ":[13]p");
    },
    _g_cond_gv1_86: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return checkAgreement(lToken[nTokenOffset+5]["sValue"], lToken[nLastToken-1+1]["sValue"]);
    },
    _g_cond_gv1_87: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return checkAgreement(lToken[nTokenOffset+6]["sValue"], lToken[nLastToken-1+1]["sValue"]);
    },
    _g_cond_gv1_88: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return checkAgreement(lToken[nTokenOffset+7]["sValue"], lToken[nLastToken-1+1]["sValue"]);
    },
    _g_cond_gv1_89: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return checkAgreement(lToken[nTokenOffset+4]["sValue"], lToken[nLastToken-1+1]["sValue"]);
    },
    _g_cond_gv1_90: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[me]", ":[GW]") && (g_morph(lToken[nTokenOffset+4], ":[123]s") || (! g_tag(lToken[nTokenOffset+3], "_enum_") && g_morph(lToken[nTokenOffset+4], ":P")));
    },
    _g_cond_gv1_91: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[me]", ":[GW]") && (g_morph(lToken[nTokenOffset+5], ":[123]s") || (! g_tag(lToken[nTokenOffset+3], "_enum_") && g_morph(lToken[nTokenOffset+5], ":P")));
    },
    _g_cond_gv1_92: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[me]", ":[GW]") && (g_morph(lToken[nTokenOffset+6], ":[123]s") || (! g_tag(lToken[nTokenOffset+3], "_enum_") && g_morph(lToken[nTokenOffset+6], ":P")));
    },
    _g_cond_gv1_93: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[me]", ":[GW]") && (g_morph(lToken[nTokenOffset+7], ":[123]s") || (! g_tag(lToken[nTokenOffset+3], "_enum_") && g_morph(lToken[nTokenOffset+7], ":P")));
    },
    _g_cond_gv1_94: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[me]", ":[GW]") && (g_morph(lToken[nTokenOffset+8], ":[123]s") || (! g_tag(lToken[nTokenOffset+3], "_enum_") && g_morph(lToken[nTokenOffset+8], ":P")));
    },
    _g_cond_gv1_95: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[fe]", ":[GW]") && (g_morph(lToken[nTokenOffset+4], ":[123]s") || (! g_tag(lToken[nTokenOffset+3], "_enum_") && g_morph(lToken[nTokenOffset+4], ":P")));
    },
    _g_cond_gv1_96: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[fe]", ":[GW]") && (g_morph(lToken[nTokenOffset+5], ":[123]s") || (! g_tag(lToken[nTokenOffset+3], "_enum_") && g_morph(lToken[nTokenOffset+5], ":P")));
    },
    _g_cond_gv1_97: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[fe]", ":[GW]") && (g_morph(lToken[nTokenOffset+6], ":[123]s") || (! g_tag(lToken[nTokenOffset+3], "_enum_") && g_morph(lToken[nTokenOffset+6], ":P")));
    },
    _g_cond_gv1_98: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[fe]", ":[GW]") && (g_morph(lToken[nTokenOffset+7], ":[123]s") || (! g_tag(lToken[nTokenOffset+3], "_enum_") && g_morph(lToken[nTokenOffset+7], ":P")));
    },
    _g_cond_gv1_99: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[fe]", ":[GW]") && (g_morph(lToken[nTokenOffset+8], ":[123]s") || (! g_tag(lToken[nTokenOffset+3], "_enum_") && g_morph(lToken[nTokenOffset+8], ":P")));
    },
    _g_cond_gv1_100: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && (g_morph(lToken[nTokenOffset+4], ":[123]s") || (! g_tag(lToken[nTokenOffset+3], "_enum_") && g_morph(lToken[nTokenOffset+4], ":P")));
    },
    _g_cond_gv1_101: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":f", ":[me]") && g_morph(lToken[nLastToken-1+1], ":m", ":[fe]");
    },
    _g_cond_gv1_102: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nTokenOffset+3], ":m", ":[fe]") && g_morph(lToken[nLastToken-1+1], ":f", ":[me]");
    },
    _g_cond_gv1_103: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nLastToken-1+1], ":p", ":[si]");
    },
    _g_cond_gv1_104: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && (g_morph(lToken[nTokenOffset+5], ":[123]s") || (! g_tag(lToken[nTokenOffset+3], "_enum_") && g_morph(lToken[nTokenOffset+5], ":P")));
    },
    _g_cond_gv1_105: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && (g_morph(lToken[nTokenOffset+6], ":[123]s") || (! g_tag(lToken[nTokenOffset+3], "_enum_") && g_morph(lToken[nTokenOffset+6], ":P")));
    },
    _g_cond_gv1_106: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && (g_morph(lToken[nTokenOffset+7], ":[123]s") || (! g_tag(lToken[nTokenOffset+3], "_enum_") && g_morph(lToken[nTokenOffset+7], ":P")));
    },
    _g_cond_gv1_107: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && (g_morph(lToken[nTokenOffset+8], ":[123]s") || (! g_tag(lToken[nTokenOffset+3], "_enum_") && g_morph(lToken[nTokenOffset+8], ":P")));
    },
    _g_cond_gv1_108: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+4], ":(?:[123]p|P)");
    },
    _g_cond_gv1_109: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nLastToken-1+1], ":s", ":[pi]");
    },
    _g_cond_gv1_110: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+5], ":(?:[123]p|P)");
    },
    _g_cond_gv1_111: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+6], ":(?:[123]p|P)");
    },
    _g_cond_gv1_112: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+7], ":(?:[123]p|P)");
    },
    _g_cond_gv1_113: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+8], ":(?:[123]p|P)");
    },
    _g_cond_gv1_114: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[me]:[pi]", ":[GW]") && g_morph(lToken[nTokenOffset+4], ":(?:[123]p|P)");
    },
    _g_cond_gv1_115: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[me]:[pi]", ":[GW]") && g_morph(lToken[nTokenOffset+5], ":(?:[123]p|P)");
    },
    _g_cond_gv1_116: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[me]:[pi]", ":[GW]") && g_morph(lToken[nTokenOffset+6], ":(?:[123]p|P)");
    },
    _g_cond_gv1_117: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[me]:[pi]", ":[GW]") && g_morph(lToken[nTokenOffset+7], ":(?:[123]p|P)");
    },
    _g_cond_gv1_118: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[me]:[pi]", ":[GW]") && g_morph(lToken[nTokenOffset+8], ":(?:[123]p|P)");
    },
    _g_cond_gv1_119: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[fe]:[pi]", ":[GW]") && g_morph(lToken[nTokenOffset+4], ":(?:[123]p|P)");
    },
    _g_cond_gv1_120: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[fe]:[pi]", ":[GW]") && g_morph(lToken[nTokenOffset+5], ":(?:[123]p|P)");
    },
    _g_cond_gv1_121: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[fe]:[pi]", ":[GW]") && g_morph(lToken[nTokenOffset+6], ":(?:[123]p|P)");
    },
    _g_cond_gv1_122: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[fe]:[pi]", ":[GW]") && g_morph(lToken[nTokenOffset+7], ":(?:[123]p|P)");
    },
    _g_cond_gv1_123: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && g_morph(lToken[nTokenOffset+3], ":[NA].*:[fe]:[pi]", ":[GW]") && g_morph(lToken[nTokenOffset+8], ":(?:[123]p|P)");
    },
    _g_cond_gv1_124: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+2], "_enum_") && ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && (g_morph(lToken[nTokenOffset+3], ":[123]s") || (! g_tag(lToken[nTokenOffset+2], "_enum_") && g_morph(lToken[nTokenOffset+3], ":P")));
    },
    _g_cond_gv1_125: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":M.*:f", ":[me]") && g_morph(lToken[nLastToken-1+1], ":[AQ].*:m", ":[fe]");
    },
    _g_cond_gv1_126: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nTokenOffset+2], ":M.*:m", ":[fe]") && g_morph(lToken[nLastToken-1+1], ":[AQ].*:f", ":[me]");
    },
    _g_cond_gv1_127: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nLastToken-1+1], ":p", ":[AQ].*:[si]");
    },
    _g_cond_gv1_128: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+2], "_enum_") && ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && (g_morph(lToken[nTokenOffset+4], ":[123]s") || (! g_tag(lToken[nTokenOffset+2], "_enum_") && g_morph(lToken[nTokenOffset+4], ":P")));
    },
    _g_cond_gv1_129: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+2], "_enum_") && ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && (g_morph(lToken[nTokenOffset+5], ":[123]s") || (! g_tag(lToken[nTokenOffset+2], "_enum_") && g_morph(lToken[nTokenOffset+5], ":P")));
    },
    _g_cond_gv1_130: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+2], "_enum_") && ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && (g_morph(lToken[nTokenOffset+6], ":[123]s") || (! g_tag(lToken[nTokenOffset+2], "_enum_") && g_morph(lToken[nTokenOffset+6], ":P")));
    },
    _g_cond_gv1_131: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+2], "_enum_") && ! g_value(lToken[nLastToken-1+1], "|légion|néant|réalité|") && (g_morph(lToken[nTokenOffset+7], ":[123]s") || (! g_tag(lToken[nTokenOffset+2], "_enum_") && g_morph(lToken[nTokenOffset+7], ":P")));
    },
    _g_cond_gv1_132: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[AQ].*:[fp]", ":(?:G|:m:[si])") && g_morph(lToken[nTokenOffset+3], ":(?:[123]s|P)");
    },
    _g_sugg_gv1_22: function (lToken, nTokenOffset, nLastToken) {
        return suggMasSing(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_gv1_133: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[AQ].*:[mp]", ":(?:G|:f:[si])") && g_morph(lToken[nTokenOffset+3], ":(?:[123]s|P)");
    },
    _g_sugg_gv1_23: function (lToken, nTokenOffset, nLastToken) {
        return suggFemSing(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_gv1_134: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[AQ].*:[fs]", ":(?:G|:m:[pi])") && g_morph(lToken[nTokenOffset+3], ":(?:[123]p|P)");
    },
    _g_sugg_gv1_24: function (lToken, nTokenOffset, nLastToken) {
        return suggMasPlur(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_gv1_135: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[AQ].*:[ms]", ":(?:G|:f:[pi])") && g_morph(lToken[nTokenOffset+3], ":(?:[123]p|P)");
    },
    _g_sugg_gv1_25: function (lToken, nTokenOffset, nLastToken) {
        return suggFemPlur(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_gv1_136: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[AQ].*:m", ":[fe]") && g_morph(lToken[nLastToken-1+1], ":[NA]:f", ":[me]");
    },
    _g_cond_gv1_137: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nTokenOffset+2], ":[AQ].*:f", ":[me]") && g_morph(lToken[nLastToken-1+1], ":[NA]:m", ":[fe]");
    },
    _g_cond_gv1_138: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[AQ].*:p", ":[Gsi]") && g_morph(lToken[nTokenOffset+3], ":(?:[123]s|P)");
    },
    _g_sugg_gv1_26: function (lToken, nTokenOffset, nLastToken) {
        return suggSing(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_gv1_139: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nTokenOffset+2], ":[AQ].*:s", ":[Gpi]") && g_morph(lToken[nTokenOffset+3], ":(?:[123]p|P)");
    },
    _g_sugg_gv1_27: function (lToken, nTokenOffset, nLastToken) {
        return suggPlur(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_gv1_140: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":R|>(?:et|ou)/");
    },
    _g_cond_gv1_141: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[me]", ":f");
    },
    _g_cond_gv1_142: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:[fe]", ":m");
    },
    _g_cond_gv1_143: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":M.*:m", ":M.*:[fe]");
    },
    _g_cond_gv1_144: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NA].*:m:[pi]", ":[fe]") && g_morph(lToken[nLastToken-1+1], ":[NA].*:f");
    },
    _g_cond_gv1_145: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nTokenOffset+3], ":[NA].*:f:[pi]", ":[me]") && g_morph(lToken[nLastToken-1+1], ":[NA].*:(?:m:p|f:s)");
    },
    _g_cond_gv1_146: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":V0a.*:[123]s") && g_morph(lToken[nLastToken-1+1], ":A.*:p") && ! g_value(lToken[nTokenOffset], "|on|");
    },
    _g_cond_gv1_147: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nTokenOffset+1], ":V0a.*:[123]p") && g_morph(lToken[nLastToken-1+1], ":A.*:s");
    },
    _g_cond_gv1_148: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ":V0a");
    },
    _g_cond_gv1_149: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ">(?:être|devenir|redevenir)/");
    },
    _g_cond_gv1_150: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ">(?:sembler|rester|demeurer|para[îi]tre)/");
    },
    _g_cond_gv1_151: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ":V0e.*:3s") && g_morph(lToken[nTokenOffset+2], ":(?:[123][sp]|A.*:[pf])", ":(?:G|W|Y|[me]:[si])");
    },
    _g_cond_gv1_152: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morphVC(lToken[nTokenOffset+1], ":V0e.*:3p") && g_morph(lToken[nTokenOffset+2], ":(?:[123][sp]|A.*:[sf])", ":(?:G|W|Y|[me]:[pi])");
    },
    _g_cond_gv1_153: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ">(?:être|devenir|redevenir)/") && ! g_value(lToken[nTokenOffset], "|se|s’|");
    },
    _g_sugg_gv1_28: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_gv1_154: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ">(?:être|devenir|redevenir)/") && ! g_value(lToken[nTokenOffset], "|nous|");
    },
    _g_cond_gv1_155: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|rendez-vous|") && g_morphVC(lToken[nTokenOffset+1], ">(?:être|devenir|redevenir)/") && ! g_value(lToken[nTokenOffset], "|vous|");
    },
    _g_cond_gv1_156: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|rendez-vous|") && g_morphVC(lToken[nTokenOffset+1], ">(?:sembler|rester|demeurer|para[îi]tre)/");
    },
    _g_cond_gv1_157: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo;
    },
    _g_sugg_gv1_29: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+3]["sValue"].slice(0,-1);
    },
    _g_cond_gv1_158: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[RV]");
    },
    _g_cond_gv1_159: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-2+1], ":[123]s");
    },
    _g_cond_gv1_160: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-2+1], ":1p");
    },
    _g_cond_gv1_161: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-2+1], ":3p");
    },
    _g_cond_gv1_162: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[AQ].*:(?:[me]:p|f)", ":(?:G|Y|V0|P|[AQ].*:m:[is])") && ! (g_morph(lToken[nTokenOffset+2], ":Y") && g_morph(lToken[nTokenOffset+3], ":3s"));
    },
    _g_sugg_gv1_30: function (lToken, nTokenOffset, nLastToken) {
        return suggMasSing(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_gv1_163: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[AQ].*:(?:[fe]:p|m)", ":(?:G|Y|V0|P|[AQ]:f:[is])") && ! (g_morph(lToken[nTokenOffset+2], ":Y") && g_morph(lToken[nTokenOffset+2], ":3s"));
    },
    _g_sugg_gv1_31: function (lToken, nTokenOffset, nLastToken) {
        return suggFemSing(lToken[nTokenOffset+3]["sValue"]);
    },
    _g_cond_gv1_164: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[AQ].*:s", ":(?:G|Y|V0|P|[AQ].*:[ip])") && ! (g_morph(lToken[nTokenOffset+2], ":Y") && g_morph(lToken[nTokenOffset+3], ":3s"));
    },
    _g_cond_gv1_165: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[AQ].*:p", ":(?:G|Y|V0|P|[AQ].*:[is])") && ! (g_morph(lToken[nTokenOffset+2], ":Y") && g_morph(lToken[nTokenOffset+3], ":3s"));
    },
    _g_cond_gv1_166: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":3s") && g_morph(lToken[nTokenOffset+4], ":[AQ].*:[fp]", ":(?:G|Y|V0|P|[AQ].*:m:[si])");
    },
    _g_sugg_gv1_32: function (lToken, nTokenOffset, nLastToken) {
        return suggMasSing(lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_gv1_167: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":3s") && g_morph(lToken[nTokenOffset+4], ":[AQ].*:[mp]", ":(?:G|Y|V0|P|[AQ].*:f:[si])") && ! g_morph(lToken[nTokenOffset], ":R");
    },
    _g_sugg_gv1_33: function (lToken, nTokenOffset, nLastToken) {
        return suggFemSing(lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_gv1_168: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":3p") && g_morph(lToken[nTokenOffset+4], ":[AQ].*:[fs]", ":(?:G|Y|V0|P|[AQ].*:m:[pi])");
    },
    _g_sugg_gv1_34: function (lToken, nTokenOffset, nLastToken) {
        return suggMasPlur(lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_gv1_169: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":3p") && g_morph(lToken[nTokenOffset+4], ":[AQ].*:[ms]", ":(?:G|Y|V0|P|[AQ].*:f:[pi])") && ! g_morph(lToken[nTokenOffset], ":R");
    },
    _g_sugg_gv1_35: function (lToken, nTokenOffset, nLastToken) {
        return suggFemPlur(lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_gv1_170: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":3s") && g_morph(lToken[nTokenOffset+3], ":[AQ].*:p", ":(?:G|Y|V0|P|[AQ].*:[si])");
    },
    _g_cond_gv1_171: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nTokenOffset+2], ":3p") && g_morph(lToken[nTokenOffset+3], ":[AQ].*:s", ":(?:G|Y|V0|[AQ].*:[pi])");
    },
    _g_cond_gv1_172: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ( ! g_morph(lToken[nTokenOffset+2], ":1p") || (g_morph(lToken[nTokenOffset+2], ":1p") && g_value(lToken[nTokenOffset], "|nous|ne|")) ) && g_morph(lToken[nTokenOffset+3], ":[AQ].*:s", ":(?:G|Y|V0|P|[AQ].*:[ip])") && ! (g_morph(lToken[nTokenOffset+2], ":Y") && g_morph(lToken[nTokenOffset+3], ":3s"));
    },
    _g_cond_gv1_173: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|barre|confiance|charge|cours|envie|peine|prise|crainte|cure|affaire|hâte|force|recours|");
    },
    _g_cond_gv1_174: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|barre|confiance|cours|envie|peine|prise|crainte|cure|affaire|hâte|force|recours|") && (g_value(lToken[nTokenOffset], "|<start>|,|comme|comment|et|lorsque|lorsqu’|mais|où|ou|quand|qui|pourquoi|puisque|puisqu’|quoique|quoiqu’|si|s’|sinon|") || (g_value(lToken[nTokenOffset], "|que|qu’|") && g_morph(g_token(lToken, nTokenOffset+1-2), ":V|<start>", ":[NA]"))) && lToken[nLastToken-1+1]["sValue"].gl_isLowerCase() && g_morph(lToken[nLastToken-1+1], ":(?:[123][sp]|Q.*:[fp])", ":(?:G|W|Q.*:m:[si])");
    },
    _g_cond_gv1_175: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|barre|confiance|cours|envie|peine|prise|crainte|cure|affaire|hâte|force|recours|") && (g_value(lToken[nTokenOffset], "|<start>|,|comme|comment|et|lorsque|lorsqu’|mais|où|ou|quand|qui|pourquoi|puisque|puisqu’|quoique|quoiqu’|si|s’|sinon|") || (g_value(lToken[nTokenOffset], "|que|qu’|") && g_morph(g_token(lToken, nTokenOffset+1-2), ":V|<start>", ":[NA]"))) && lToken[nLastToken-1+1]["sValue"].gl_isLowerCase() && g_morph(lToken[nLastToken-1+1], ":(?:[123][sp]|Q.*:[fp])", ":(?:G|W|N|Q.*:m:[si])");
    },
    _g_cond_gv1_176: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|barre|confiance|cours|envie|peine|prise|crainte|cure|affaire|hâte|force|recours|") && (g_value(lToken[nTokenOffset], "|<start>|,|comme|comment|et|lorsque|lorsqu’|mais|où|ou|quand|qui|pourquoi|puisque|puisqu’|quoique|quoiqu’|si|s’|sinon|") || (g_value(lToken[nTokenOffset], "|que|qu’|") && g_morph(g_token(lToken, nTokenOffset+1-2), ":V|<start>", ":[NA]"))) && lToken[nLastToken-1+1]["sValue"].gl_isLowerCase() && g_morph(lToken[nLastToken-1+1], ":(?:[123][sp])", ":[GWQ]");
    },
    _g_cond_gv1_177: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":Os") && ! g_value(lToken[nLastToken-1+1], "|barre|confiance|charge|cours|envie|peine|prise|crainte|cure|affaire|hâte|force|recours|") && (g_value(lToken[nTokenOffset], "|<start>|,|comme|comment|et|lorsque|lorsqu’|mais|où|ou|quand|qui|pourquoi|puisque|puisqu’|quoique|quoiqu’|si|s’|sinon|") || (g_value(lToken[nTokenOffset], "|que|qu’|") && g_morph(g_token(lToken, nTokenOffset+1-2), ":V|<start>", ":[NA]"))) && ! lToken[nLastToken-1+1]["sValue"].gl_isUpperCase() && g_morph(lToken[nLastToken-1+1], ":(?:[123][sp]|Q.*:[fp])", ":(?:G|W|Q.*:m:[si])");
    },
    _g_cond_gv1_178: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|barre|confiance|charge|cours|envie|peine|prise|crainte|cure|affaire|hâte|force|recours|") && (g_value(lToken[nTokenOffset], "|<start>|,|comme|comment|et|lorsque|lorsqu’|mais|où|ou|quand|qui|pourquoi|puisque|puisqu’|quoique|quoiqu’|si|s’|sinon|") || (g_value(lToken[nTokenOffset], "|que|qu’|") && g_morph(g_token(lToken, nTokenOffset+1-2), ":V|<start>", ":[NA]"))) && g_morph(lToken[nTokenOffset+2], ":[NA]", ":G") && ! lToken[nLastToken-1+1]["sValue"].gl_isUpperCase() && g_morph(lToken[nLastToken-1+1], ":(?:[123][sp]|Y|Q.*:[fp])", ":(?:G|W|Q.*:m:[si])") && ! (g_value(lToken[nLastToken-2+1], "|avions|") && g_morph(lToken[nLastToken-1+1], ":3[sp]"));
    },
    _g_cond_gv1_179: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":V0a");
    },
    _g_cond_gv1_180: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":V0a", ":1p") && g_morph(lToken[nTokenOffset+3], ":V[0-3]..t_.*:Q.*:s", ":[GWpi]") && g_morph(lToken[nTokenOffset], ":(?:M|Os|N)", ":R") && ! g_value(g_token(lToken, nTokenOffset+1-2), "|que|qu’|");
    },
    _g_cond_gv1_181: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_que_") || g_morph(lToken[nTokenOffset+3], ":V[0-3]..t_");
    },
    _g_cond_gv1_182: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken-1+1], "|confiance|charge|cours|envie|peine|prise|crainte|cure|affaire|hâte|force|recours|");
    },
    _g_cond_gv1_183: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|A|avions|avoirs|") && g_morph(lToken[nTokenOffset+2], ":(?:Y|2p)");
    },
    _g_cond_gv1_184: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && lToken[nTokenOffset+1]["sValue"] == "a" && lToken[nTokenOffset+2]["sValue"].endsWith("r") && ! g_value(lToken[nTokenOffset], "|n’|m’|t’|l’|il|on|elle|");
    },
    _g_cond_gv1_185: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|A|avions|avoirs|") && g_morph(lToken[nTokenOffset+2], ":V(?:2.*:Ip.*:3s|3.*:Is.*:3s)", ":[NAQ]");
    },
    _g_cond_gv1_186: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|A|avions|avoirs|") && g_morph(lToken[nTokenOffset+2], ":V3.*:Is.*:3s", ":[NAQ]");
    },
    _g_cond_gv1_187: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA]") && ! g_morph(lToken[nLastToken+1], ":(?:Y|Ov|D|LV)") && ! ((g_value(lToken[nLastToken-1+1], "|décidé|essayé|tenté|oublié|imaginé|supplié|") && g_value(lToken[nLastToken+1], "|de|d’|")) || (g_value(lToken[nLastToken-1+1], "|réussi|pensé|") && g_value(lToken[nLastToken+1], "|à|")));
    },
    _g_sugg_gv1_36: function (lToken, nTokenOffset, nLastToken) {
        return suggPlur(lToken[nLastToken-1+1]["sValue"], lToken[nTokenOffset+2]["sValue"]);
    },
    _g_cond_gv1_188: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:m");
    },
    _g_cond_gv1_189: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NA].*:f", ">(?:fois|impression)/") && ! g_morph(lToken[nLastToken+1], ":(?:Y|Ov|D|LV)|>qu[e’]/") && ! ((g_value(lToken[nLastToken-1+1], "|décidé|essayé|tenté|oublié|imaginé|supplié|") && g_value(lToken[nLastToken+1], "|de|d’|")) || (g_value(lToken[nLastToken-1+1], "|réussi|pensé|") && g_value(lToken[nLastToken+1], "|à|")));
    },
    _g_cond_gv1_190: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+3]["sValue"] != "pouvoir";
    },
    _g_cond_gv1_191: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+2], ":V0a") && ! g_value(lToken[nTokenOffset+3], "|barre|charge|confiance|cours|envie|peine|prise|crainte|cure|affaire|hâte|force|recours|");
    },
    _g_cond_gv1_192: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":(?:Y|[123][sp])", ":[QMG]");
    },
    _g_sugg_gv1_37: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nTokenOffset+3]["sValue"], ":m:s");
    },
    _g_cond_gv1_193: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && ! g_value(lToken[nTokenOffset+1], "|les|l’|m’|t’|nous|vous|en|") && g_morph(lToken[nTokenOffset+3], ":Q.*:[fp]", ":m:[si]") && ! g_morph(lToken[nTokenOffset+1], ":[NA].*:[fp]") && ! look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "(?i)\\b(?:quel(?:le|)s?|combien) ");
    },
    _g_cond_gv1_194: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nLastToken-2+1], ":V0a") && ! g_value(lToken[nLastToken-1+1], "|barre|charge|confiance|cours|envie|peine|prise|crainte|cure|affaire|hâte|force|recours|");
    },
    _g_cond_gv1_195: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":(?:Y|[123][sp])", ":[QMG]");
    },
    _g_cond_gv1_196: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nLastToken-1+1], ":Q.*:[fp]", ":m:[si]");
    },
    _g_cond_gv1_197: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+2], ":V0a") && g_morph(lToken[nTokenOffset+3], ":(?:Y|2p|Q.*:p|3[sp])", ":[GWsi]");
    },
    _g_cond_gv1_198: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+2], ":V0a") && g_morph(lToken[nTokenOffset+3], ":(?:Y|2p|Q.*:s|3[sp])", ":[GWpi]");
    },
    _g_sugg_gv1_38: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nTokenOffset+3]["sValue"], ":p");
    },
    _g_cond_gv1_199: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":A.*:p", ":[GEMWPsi]") && ! g_tag(lToken[nTokenOffset+2], "_exctx_");
    },
    _g_cond_gv1_200: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+2], "|bref|désolé|désolée|pire|")  && ! g_tag(lToken[nTokenOffset+2], "_exctx_") && g_morph(lToken[nTokenOffset+2], ":A.*:[fp]", ":(?:G|E|M1|W|P|m:[si])") && ! g_morph(lToken[nLastToken+1], ">falloir/") && ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), "^ +(?:y (?:a|aura|avait|eut)|d(?:ut|oit|evait|evra) y avoir|s’agi(?:ssait|t|ra))[, .]");
    },
    _g_cond_gv1_201: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+2], "|bref|désolé|désolée|pire|") && ! g_tag(lToken[nTokenOffset+2], "_exctx_") && g_morph(lToken[nTokenOffset+2], ":A.*:[mp]", ":(?:G|E|M1|W|P|f:[si])");
    },
    _g_cond_gv1_202: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+2], "|bref|désolé|désolée|pire|") && ! g_tag(lToken[nTokenOffset+2], "_exctx_") && g_morph(lToken[nTokenOffset+2], ":A.*:[fs]", ":(?:G|E|M1|W|P|m:[pi])");
    },
    _g_cond_gv1_203: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+2], "|bref|désolé|désolée|pire|") && ! g_tag(lToken[nTokenOffset+2], "_exctx_") && g_morph(lToken[nTokenOffset+2], ":A.*:[ms]", ":(?:G|E|M1|W|P|f:[pi])");
    },
    _g_cond_gv1_204: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":(?:V1.*:[YQ]|Iq.*:[123]s)");
    },
    _g_sugg_gv1_39: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbTense(lToken[nTokenOffset+2]["sValue"], ":E", ":2p") + "-" + lToken[nTokenOffset+3]["sValue"];
    },
    _g_cond_gv1_205: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":(?:V1.*:[YQ]|Iq.*:[123]s)") && g_morph(lToken[nTokenOffset+4], ":[ORC]", ":[NA]|>plupart/");
    },
    _g_cond_gv1_206: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":(?:V1.*:[YQ]|Iq.*:[123]s)") && g_morph(lToken[nTokenOffset+4], ":[ORC]", ":[NA]");
    },
    _g_cond_gv1_207: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":(?:V1.*:[YQ]|Iq.*:[123]s)") && g_morph(lToken[nTokenOffset+4], ":[ORCD]", ":Y");
    },
    _g_cond_gv1_208: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! look(sSentence.slice(lToken[nLastToken]["nEnd"]), " soit ");
    },
    _g_cond_gv1_209: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|je|");
    },
    _g_cond_gv1_210: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[MYO]", ":A|>et/");
    },
    _g_cond_gv1_211: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|tu|");
    },
    _g_cond_gv1_212: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":V[13].*:Ip.*:2s", ":G") && ! g_value(lToken[nLastToken+1], "|tu|");
    },
    _g_sugg_gv1_40: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nLastToken-1+1]["sValue"].slice(0,-1);
    },
    _g_cond_gv1_213: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-1+1], ":V[13].*:Ip.*:2s", ":[GNAM]") && ! g_value(lToken[nLastToken+1], "|tu|");
    },
    _g_cond_gv1_214: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|il|elle|on|ils|elles|iel|iels|") && ! g_value(lToken[nLastToken-1+1], "|provient|") && ! (g_value(lToken[nLastToken-1+1], "|vient|dit|surgit|survient|périt|") && g_morph(lToken[nLastToken+1], ":(?:[MD]|Oo)|>[A-Z]/")) && g_morph(lToken[nLastToken-1+1], ":V[23].*:Ip.*:3s", ":G|>(?:devoir|suffire|para[îi]tre)/") && analyse(lToken[nLastToken-1+1]["sValue"].slice(0,-1)+"s", ":E:2s");
    },
    _g_sugg_gv1_41: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nLastToken-1+1]["sValue"].slice(0,-1)+"s";
    },
    _g_cond_gv1_215: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|il|elle|on|ils|elles|iel|iels|") && ! g_value(lToken[nLastToken-1+1], "|provient|") && ! (g_value(lToken[nLastToken-1+1], "|vient|dit|surgit|survient|périt|") && g_morph(lToken[nLastToken+1], ":(?:[MD]|Oo)|>[A-Z]/")) && g_morph(lToken[nLastToken-1+1], ":V[23].*:Ip.*:3s", ":[GNA]|>(?:devoir|suffire|para[îi]tre)/") && analyse(lToken[nLastToken-1+1]["sValue"].slice(0,-1)+"s", ":E:2s");
    },
    _g_cond_gv1_216: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|il|elle|on|") && ! ( g_value(lToken[nLastToken-1+1], "|répond|") && (g_morph(lToken[nLastToken+1], ":[MD]|>[A-Z]/") || g_value(lToken[nLastToken+1], "|l’|d’|")) ) && g_morph(lToken[nLastToken-1+1], ":V3.*:Ip.*:3s", ":G");
    },
    _g_cond_gv1_217: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|il|elle|on|") && ! ( g_value(lToken[nLastToken-1+1], "|répond|") && (g_morph(lToken[nLastToken+1], ":[MD]|>[A-Z]/") || g_value(lToken[nLastToken+1], "|l’|d’|")) ) && g_morph(lToken[nLastToken-1+1], ":V3.*:Ip.*:3s", ":[GNA]");
    },
    _g_cond_gv1_218: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && g_morph(lToken[nTokenOffset+1], ":E", ":[GM]|>(?:venir|aller|partir)/") && ! g_value(lToken[nTokenOffset], "|de|d’|le|la|les|l’|je|j’|me|m’|te|t’|se|s’|nous|vous|lui|leur|");
    },
    _g_cond_gv1_219: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V(?:1.*:Ip.*:2s|[23].*:Ip.*:3s)", ":[GM]|>(?:venir|aller|partir)/");
    },
    _g_sugg_gv1_42: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbTense(lToken[nTokenOffset+2]["sValue"], ":E", ":2s")+"-moi";
    },
    _g_cond_gv1_220: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && g_morph(lToken[nTokenOffset+1], ":E:2s", ":[GM]|>(?:venir|aller|partir)/") && ! g_value(lToken[nTokenOffset], "|de|d’|le|la|les|l’|me|m’|te|t’|se|s’|nous|vous|lui|leur|");
    },
    _g_sugg_gv1_43: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbTense(lToken[nTokenOffset+2]["sValue"], ":E", ":2s")+"-toi";
    },
    _g_cond_gv1_221: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && g_morph(lToken[nTokenOffset+1], ":E", ":[GM]|>(?:venir|aller|partir)/") && g_morph(lToken[nLastToken+1], ":|<end>", ":(?:Y|3[sp]|Oo)|>(?:en|y)/") && g_morph(lToken[nTokenOffset], ":Cc|<start>|>,");
    },
    _g_cond_gv1_222: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V(?:1.*:Ip.*:2s|[23].*:Ip.*:3s)", ":[GM]|>(?:venir|aller|partir)/") && ! g_morph(lToken[nLastToken+1], ":Y");
    },
    _g_sugg_gv1_44: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbTense(lToken[nTokenOffset+2]["sValue"], ":E", ":2s")+"-"+lToken[nTokenOffset+3]["sValue"];
    },
    _g_cond_gv1_223: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && g_morph(lToken[nTokenOffset+1], ":E", ":[GM]") && g_morph(lToken[nLastToken+1], ":|<end>", ":(?:Y|3[sp]|Oo)|>(?:en|y)/") && g_morph(lToken[nTokenOffset], ":Cc|<start>|>,");
    },
    _g_cond_gv1_224: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && g_morph(lToken[nTokenOffset+1], ":E", ":[GM]|>(?:venir|aller|partir)") && g_morph(lToken[nLastToken+1], ":|<end>|>,", ":(?:N|A|Y|B|3[sp])|>(?:pour|plus|moins|mieux|peu|trop|très|en|y)/") && g_morph(lToken[nTokenOffset], ":Cc|<start>|>,");
    },
    _g_cond_gv1_225: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V(?:1.*:Ip.*:2s|[23].*:Ip.*:3s)", ":[GM]|>(?:venir|aller|partir)/") && g_morph(lToken[nLastToken+1], ":|<end>|>,", ":(?:N|A|Y|B|3[sp])|>(?:pour|plus|moins|mieux|peu|trop|très|en|y)/");
    },
    _g_sugg_gv1_45: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbTense(lToken[nTokenOffset+2]["sValue"], ":E", ":2s")+"-les";
    },
    _g_cond_gv1_226: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && g_morph(lToken[nTokenOffset+1], ":E", ":[GM]|>(?:venir|aller|partir)/") && g_morph(lToken[nLastToken+1], ":|<end>|>,", ":(?:N|A|Q|Y|MP|H|T)|>(?:pour|plus|moins|mieux|peu|plupart|trop|très|en|y|une?)/") && g_morph(lToken[nTokenOffset], ":Cc|<start>|>,");
    },
    _g_cond_gv1_227: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V(?:1.*:Ip.*:2s|[23].*:Ip.*:3s)", ":[GM]|>(?:venir|aller|partir)/") && g_morph(lToken[nLastToken+1], ":|<end>|>,", ":(?:N|A|Y|B|T|MP|3[sp])|>(?:pour|plus|moins|mieux|peu|trop|très|une)/");
    },
    _g_cond_gv1_228: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && g_morph(lToken[nTokenOffset+1], ":E", ":[GM]|>(?:aller|partir)/") && g_morph(lToken[nLastToken+1], ":|<end>|>,", ":(?:N|A|Q|Y|M|P|B|H|T|D|Ov)|>(?:plus|moins|mieux|peu|trop|très|une?)/") && g_morph(lToken[nTokenOffset], ":Cc|<start>|>,");
    },
    _g_cond_gv1_229: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V(?:1.*:Ip.*:2s|[23].*:Ip.*:3s)", ":[GM]|>(?:aller|partir)/") && g_morph(lToken[nLastToken+1], ":|<end>|>,", ":(?:N|A|Y|M|P|B|3[sp]|D|Ov)|>(?:plus|moins|mieux|peu|trop|très|une?)/");
    },
    _g_cond_gv1_230: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && g_morph(lToken[nTokenOffset+3], ":(?:Y|Ov)", ":[NAB]") && ! g_morph(lToken[nTokenOffset], ":O[sv]");
    },
    _g_sugg_gv1_46: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].slice(0,-3)+"’en";
    },
    _g_cond_gv1_231: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nLastToken+1], "|guerre|");
    },
    _g_cond_gv1_232: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_value(lToken[nTokenOffset], "|va|") && g_value(lToken[nLastToken+1], "|guerre|"));
    },
    _g_cond_gv1_233: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && g_morph(lToken[nTokenOffset+1], ":E", ":[MG]") && g_morph(lToken[nLastToken+1], ":|<end>|>,", ":(?:Y|[123][sp])");
    },
    _g_cond_gv1_234: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && g_morphVC(lToken[nTokenOffset+1], ":E");
    },
    _g_cond_gv1_235: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && g_morphVC(lToken[nTokenOffset+1], ":E") && g_morph(lToken[nLastToken+1], ":[RC]|<end>|>,", ":Y");
    },
    _g_cond_gv1_236: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && g_morphVC(lToken[nTokenOffset+1], ":E") && g_morph(lToken[nLastToken+1], ":[RC]|<end>|>,", ":[NAY]");
    },
    _g_cond_gv1_237: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && ! g_morph(lToken[nLastToken+1], ":Y");
    },
    _g_cond_gv1_238: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && ! g_value(lToken[nTokenOffset], "|tu|il|elle|on|ne|n’|") && ! g_morph(lToken[nLastToken+1], ":Y");
    },
    _g_cond_gv1_239: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 1) && ! g_value(lToken[nLastToken+1], "|partie|");
    },
    _g_cond_gv1_240: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return hasSimil(lToken[nTokenOffset+3]["sValue"], ":[NA].*:[me]:[si]");
    },
    _g_sugg_gv1_47: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+3]["sValue"], ":[NA].*:[me]:[si]", true);
    },
    _g_cond_gv1_241: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return hasSimil(lToken[nTokenOffset+3]["sValue"], ":[NA].*:[fe]:[si]");
    },
    _g_sugg_gv1_48: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+3]["sValue"], ":[NA].*:[fe]:[si]", true);
    },
    _g_cond_gv1_242: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return hasSimil(lToken[nTokenOffset+3]["sValue"], ":[NA].*:[si]");
    },
    _g_sugg_gv1_49: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+3]["sValue"], ":[NA].*:[si]", true);
    },
    _g_cond_gv1_243: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return hasSimil(lToken[nTokenOffset+3]["sValue"], ":[NA].*:[pi]");
    },
    _g_sugg_gv1_50: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+3]["sValue"], ":[NA].*:[pi]", true);
    },
    _g_cond_gv1_244: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return hasSimil(lToken[nTokenOffset+3]["sValue"], ":[NA].*:[me]:[pi]");
    },
    _g_sugg_gv1_51: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+3]["sValue"], ":[NA].*:[me]:[pi]", true);
    },
    _g_cond_gv1_245: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return hasSimil(lToken[nTokenOffset+3]["sValue"], ":[NA].*:[fe]:[pi]");
    },
    _g_sugg_gv1_52: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nTokenOffset+3]["sValue"], ":[NA].*:[fe]:[pi]", true);
    },
    _g_sugg_gv1_53: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nLastToken-1+1]["sValue"], ":[NA].*:[me]:[si]", true);
    },
    _g_sugg_gv1_54: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nLastToken-1+1]["sValue"], ":[NA].*:[fe]:[si]", true);
    },
    _g_sugg_gv1_55: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nLastToken-1+1]["sValue"], ":[NA].*:[si]", true);
    },
    _g_sugg_gv1_56: function (lToken, nTokenOffset, nLastToken) {
        return suggSimil(lToken[nLastToken-1+1]["sValue"], ":[NA].*:[pi]", true);
    },
    _g_cond_gv1_246: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset+1], "|rendez-vous|entre-nous|entre-vous|entre-elles|") && ! g_morphVC(lToken[nTokenOffset+1], ":V0");
    },
    _g_sugg_gv1_57: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nLastToken-1+1]["sValue"], ":s");
    },
    _g_cond_gv1_247: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|l’|") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_que_");
    },
    _g_cond_gv1_248: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+2], "_upron_") && g_morph(lToken[nTokenOffset+1], ":V", ":Q|>soit/") && (g_morph(lToken[nTokenOffset+2], ":Y", ":[NAQ]") || g_morph(lToken[nTokenOffset+2], ">(?:aller|manger)/")) && ! g_morph(lToken[nTokenOffset], ":Y|>ce/") && ! g_value(lToken[nTokenOffset], "|c’|") && ! g_value(g_token(lToken, nTokenOffset+1-2), "|ce|") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_ceque_") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_sujinfi_");
    },
    _g_cond_gv1_249: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":V", ":Q|>soit/") && g_morph(lToken[nTokenOffset+2], ":2p", ":[NAQ]");
    },
    _g_cond_gv1_250: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":V", ":Q|>soit/") && g_morph(lToken[nTokenOffset+2], ":V(?:2.*:Ip.*:3s|3.*:Is.*:3s)", ":[NAQ]") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_ceque_") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_sujinfi_");
    },
    _g_cond_gv1_251: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":V", ":Q|>soit/") && g_morph(lToken[nTokenOffset+2], ":V3.*:Is.*:3s", ":[NAQ]") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_ceque_") && ! g_tag_before(lToken[nTokenOffset+1], dTags, "_sujinfi_");
    },
    _g_cond_gv1_252: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+4]["sValue"].gl_isLowerCase() && g_morph(lToken[nTokenOffset+3], ":[NA].*:m:[si]", ":G|>verbe/") && g_morph(lToken[nTokenOffset+4], ":V1.*:Y", ":M");
    },
    _g_sugg_gv1_58: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nTokenOffset+4]["sValue"], ":m:s");
    },
    _g_cond_gv1_253: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+4]["sValue"].gl_isLowerCase() && g_morph(lToken[nTokenOffset+3], ":[NA].*:f:[si]", ":G") && g_morph(lToken[nTokenOffset+4], ":V1.*:Y", ":M");
    },
    _g_sugg_gv1_59: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nTokenOffset+4]["sValue"], ":f:s");
    },
    _g_cond_gv1_254: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+4]["sValue"].gl_isLowerCase() && g_morph(lToken[nTokenOffset+3], ":[NA].*:e:[si]", ":G") && g_morph(lToken[nTokenOffset+4], ":V1.*:Y", ":M");
    },
    _g_sugg_gv1_60: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nTokenOffset+4]["sValue"], ":s");
    },
    _g_cond_gv1_255: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+4]["sValue"].gl_isLowerCase() && g_morph(lToken[nTokenOffset+3], ":[NA].*:[pi]", ":G") && g_morph(lToken[nTokenOffset+4], ":V1.*:Y", ":M");
    },
    _g_sugg_gv1_61: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbPpas(lToken[nTokenOffset+4]["sValue"], ":p");
    },
    _g_cond_gv1_256: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[123][sp]");
    },
    _g_sugg_gv1_62: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].replace(/ut/g, "ût").replace(/UT/g, "ÛT");
    },
    _g_cond_gv1_257: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].gl_isLowerCase();
    },
    _g_cond_gv1_258: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].gl_isLowerCase() && ! (g_value(lToken[nTokenOffset+2], "|attendant|admettant|") && g_value(lToken[nLastToken+1], "|que|qu’|"));
    },
    _g_cond_gv1_259: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].gl_isLowerCase() && ! (g_morph(lToken[nTokenOffset], ":1p") && ! g_value(lToken[nTokenOffset], "|sachons|veuillons|allons|venons|partons|") && g_value(g_token(lToken, nTokenOffset+1-2), "|<start>|,|"));
    },
    _g_cond_gv1_260: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+2]["sValue"].gl_isLowerCase() && ! (g_morph(lToken[nTokenOffset], ":2p") && ! g_value(lToken[nTokenOffset], "|sachez|veuillez|allez|venez|partez|") && g_value(g_token(lToken, nTokenOffset+1-2), "|<start>|,|"));
    },
    _g_cond_gv1_261: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[123]s") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[me]:[si]");
    },
    _g_cond_gv1_262: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[123]s") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[fe]:[si]");
    },
    _g_cond_gv1_263: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[123]s") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[si]");
    },
    _g_cond_gv1_264: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[123]s") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[pi]");
    },
    _g_cond_gv1_265: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[123]s") || ! g_morph(lToken[nTokenOffset+3], ":[NA]");
    },
    _g_cond_gv1_266: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:[123]s|V0)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[me]:[si]");
    },
    _g_cond_gv1_267: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:[123]s|V0)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[fe]:[si]");
    },
    _g_cond_gv1_268: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:[123]s|V0)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[si]");
    },
    _g_cond_gv1_269: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:[123]s|V0)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[pi]");
    },
    _g_cond_gv1_270: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:[123]s|V0)") || ! g_morph(lToken[nTokenOffset+3], ":[NA]");
    },
    _g_cond_gv1_271: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:3s|R)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[me]:[si]");
    },
    _g_cond_gv1_272: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:3s|R)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[fe]:[si]");
    },
    _g_cond_gv1_273: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:3s|R)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[si]");
    },
    _g_cond_gv1_274: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:3s|R)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[pi]");
    },
    _g_cond_gv1_275: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:3s|R)") || ! g_morph(lToken[nTokenOffset+3], ":[NA]");
    },
    _g_cond_gv1_276: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:1p|R)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[me]:[si]");
    },
    _g_cond_gv1_277: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:1p|R)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[fe]:[si]");
    },
    _g_cond_gv1_278: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:1p|R)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[si]");
    },
    _g_cond_gv1_279: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:1p|R)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[pi]");
    },
    _g_cond_gv1_280: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:1p|R)") || ! g_morph(lToken[nTokenOffset+3], ":[NA]");
    },
    _g_cond_gv1_281: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:2p|R)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[me]:[si]");
    },
    _g_cond_gv1_282: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:2p|R)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[fe]:[si]");
    },
    _g_cond_gv1_283: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:2p|R)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[si]");
    },
    _g_cond_gv1_284: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:2p|R)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[pi]");
    },
    _g_cond_gv1_285: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:2p|R)") || ! g_morph(lToken[nTokenOffset+3], ":[NA]");
    },
    _g_cond_gv1_286: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":3p") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[me]:[si]");
    },
    _g_cond_gv1_287: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":3p") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[fe]:[si]");
    },
    _g_cond_gv1_288: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":3p") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[si]");
    },
    _g_cond_gv1_289: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":3p") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[pi]");
    },
    _g_cond_gv1_290: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":3p") || ! g_morph(lToken[nTokenOffset+3], ":[NA]");
    },
    _g_cond_gv1_291: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:3p|R)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[me]:[si]");
    },
    _g_cond_gv1_292: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:3p|R)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[fe]:[si]");
    },
    _g_cond_gv1_293: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:3p|R)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[si]");
    },
    _g_cond_gv1_294: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:3p|R)") || ! g_morph(lToken[nTokenOffset+3], ":N.*:[pi]");
    },
    _g_cond_gv1_295: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:3p|R)") || ! g_morph(lToken[nTokenOffset+3], ":[NA]");
    },
    _g_cond_gv1_296: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":(?:R|3s)");
    },
    _g_cond_gv1_297: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+3], ":2s") || g_value(lToken[nTokenOffset], "|je|j’|tu|il|elle|on|nous|vous|ils|elles|iel|iels|");
    },
    _g_cond_gv1_298: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":N", ":V");
    },
    _g_cond_gv1_299: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NAM]") && g_morph(lToken[nTokenOffset+5], ":[NAM]") && g_morph(lToken[nTokenOffset+8], ":[NAM]");
    },
    _g_cond_gv1_300: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NAM]") && g_morph(lToken[nTokenOffset+5], ":[NAM]") && g_morph(lToken[nTokenOffset+9], ":[NAM]");
    },
    _g_cond_gv1_301: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[NAM]") && g_morph(lToken[nTokenOffset+5], ":[NAM]") && g_morph(lToken[nTokenOffset+10], ":[NAM]");
    },
    _g_cond_gv1_302: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NAM]") && g_morph(lToken[nTokenOffset+6], ":[NAM]");
    },
    _g_cond_gv1_303: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NAM]") && g_morph(lToken[nTokenOffset+7], ":[NAM]");
    },
    _g_cond_gv1_304: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[NAM]") && g_morph(lToken[nTokenOffset+8], ":[NAM]");
    },
    _g_cond_gv1_305: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":V", ":N");
    },
    _g_da_gv1_1: function (lToken, nTokenOffset, nLastToken) {
        return g_select(lToken[nTokenOffset+2], ":V");
    },
    _g_cond_gv2_1: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nLastToken-1+1]["sValue"] != "A";
    },
    _g_cond_gv2_2: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag_before(lToken[nTokenOffset+1], dTags, "_ceque_") && ! g_value(lToken[nTokenOffset], "|tout|d’|l’|");
    },
    _g_cond_gv2_3: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+4], ":[123][sp]", ":[NAGW]");
    },
    _g_cond_gv2_4: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+4], ":(?:[123][sp]|P)") && g_morph(lToken[nTokenOffset+5], ":Q");
    },
    _g_cond_gv2_5: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+4], ":(?:[123][sp]|P)") && g_morph(lToken[nTokenOffset+5], ":[QA]");
    },
    _g_cond_gv2_6: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return (g_morph(lToken[nTokenOffset+2], ":M") && g_morph(lToken[nTokenOffset+4], ":M")) || (g_morph(lToken[nTokenOffset+2], ":Y") && g_morph(lToken[nTokenOffset+4], ":Y"));
    },
    _g_cond_gv2_7: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[123][sp]") && g_morph(lToken[nTokenOffset+6], ":[123][sp]");
    },
    _g_cond_gv2_8: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-2+1], ":[QA]");
    },
    _g_cond_gv2_9: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken-2+1], ":Q");
    },
    _g_cond_gv2_10: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":([123][sp]|P)");
    },
    _g_cond_gv2_11: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":([123][sp]|P)") && g_morph(lToken[nTokenOffset+4], ":[QA]");
    },
    _g_cond_gv2_12: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":([123][sp]|P)") && g_morph(lToken[nTokenOffset+4], ":Q");
    },
    _g_cond_gv2_13: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":M", ":G") && lToken[nTokenOffset+3]["sValue"].gl_isLowerCase() && g_morph(lToken[nTokenOffset+3], ":3s", ":G");
    },
    _g_cond_gv2_14: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:1[sŝś]", ":[GW]");
    },
    _g_sugg_gv2_1: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+2]["sValue"].slice(0,-1)+"é-je";
    },
    _g_cond_gv2_15: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:1[sŝś]", ":[GNW]") && ! g_value(lToken[nTokenOffset+1], "|je|j’|il|elle|");
    },
    _g_cond_gv2_16: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:1s", ":[GW]");
    },
    _g_cond_gv2_17: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1);
    },
    _g_cond_gv2_18: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:1s", ":[GNW]") && ! g_value(lToken[nTokenOffset+1], "|je|j’|tu|");
    },
    _g_cond_gv2_19: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:2s", ":[GW]");
    },
    _g_cond_gv2_20: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:2s", ":[GNW]") && ! g_value(lToken[nTokenOffset+1], "|je|j’|tu|");
    },
    _g_cond_gv2_21: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:3s", ":[GW]");
    },
    _g_cond_gv2_22: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:3s", ":[GNW]") && ! g_value(lToken[nTokenOffset+1], "|ce|il|elle|on|");
    },
    _g_cond_gv2_23: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:3s", ":[GNW]") && ! g_value(lToken[nTokenOffset+1], "|ce|c’|ça|ç’|il|elle|on|iel|");
    },
    _g_cond_gv2_24: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:1p", ":[GW]") && ! g_value(lToken[nTokenOffset+2], "|veuillons|sachons|");
    },
    _g_cond_gv2_25: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:1p", ":[GW]") && ! g_value(lToken[nTokenOffset+2], "|veuillons|sachons|allons|venons|partons|");
    },
    _g_cond_gv2_26: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && ( (g_value(lToken[nTokenOffset+2], "|avions|") && ! g_morph(lToken[nTokenOffset+1], ":A.*:[me]:[sp]") && ! g_morph(lToken[nLastToken-1+1], ":(:?3[sp]|Ov)")) || (g_morph(lToken[nTokenOffset+2], ":V.*:1p", ":[GNW]") && ! g_morph(lToken[nTokenOffset+1], ":Os")) );
    },
    _g_cond_gv2_27: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:2p", ":[GW]") && ! g_value(lToken[nTokenOffset+2], "|veuillez|sachez|");
    },
    _g_cond_gv2_28: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:2p", ":[GW]") && ! g_value(lToken[nTokenOffset+2], "|veuillez|sachez|allez|venez|partez|");
    },
    _g_cond_gv2_29: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:2p", ":[GNW]") && ! g_value(lToken[nTokenOffset+2], "|veuillez|") && ! g_morph(lToken[nTokenOffset+1], ":Os");
    },
    _g_cond_gv2_30: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:3p", ":[GW]");
    },
    _g_cond_gv2_31: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 1, 1) && g_morph(lToken[nTokenOffset+2], ":V.*:3p", ":[GNW]") && ! g_value(lToken[nTokenOffset+1], "|ce|ils|elles|iels|");
    },
    _g_cond_gv2_32: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return lToken[nTokenOffset+3]["sValue"] == "est" || lToken[nTokenOffset+3]["sValue"] == "es";
    },
    _g_cond_gv2_33: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo;
    },
    _g_sugg_gv2_2: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+3]["sValue"], ":1s");
    },
    _g_sugg_gv2_3: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+3]["sValue"], ":2s");
    },
    _g_cond_gv2_34: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":R|>(?:et|ou)") && ! (g_morph(lToken[nTokenOffset+2], ":Q") && g_morph(lToken[nTokenOffset], ":V0.*:3s"));
    },
    _g_sugg_gv2_4: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+2]["sValue"], ":3s");
    },
    _g_cond_gv2_35: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && g_morph(lToken[nTokenOffset+2], ":3p");
    },
    _g_cond_gv2_36: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":R|>(?:et|ou)");
    },
    _g_sugg_gv2_5: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+3]["sValue"], ":3s");
    },
    _g_cond_gv2_37: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && g_morph(lToken[nTokenOffset+3], ":3p");
    },
    _g_cond_gv2_38: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[VR]");
    },
    _g_cond_gv2_39: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && g_morph(lToken[nTokenOffset+2], ":[123]p");
    },
    _g_sugg_gv2_6: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/e-/g, "es-").replace(/E-/g, "ES-");
    },
    _g_cond_gv2_40: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[123]p");
    },
    _g_sugg_gv2_7: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nLastToken-1+1]["sValue"], ":3s");
    },
    _g_cond_gv2_41: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[VRD]");
    },
    _g_cond_gv2_42: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":C|<start>|>,", ":(?:P|Q|[123][sp]|R)|>ni/");
    },
    _g_cond_gv2_43: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":[CRV]|<start>|>,", ":D");
    },
    _g_cond_gv2_44: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_tag(lToken[nTokenOffset+2], "neg") && g_morph(lToken[nTokenOffset], ":Cs|<start>|>,", ":(?:Y|P|Q|[123][sp]|R)") && !(g_morph(lToken[nTokenOffset+2], ":Y") && g_value(lToken[nTokenOffset], "|ne|"));
    },
    _g_cond_gv2_45: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":[CRV]|<start>|>,");
    },
    _g_cond_gv2_46: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":Cs|<start>|>,", ":(?:Y|P|Q|[123][sp]|R)");
    },
    _g_cond_gv2_47: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":(?:Cs|R|V)|<start>|>,");
    },
    _g_cond_gv2_48: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_value(lToken[nTokenOffset+2], "|avoir|croire|être|devenir|redevenir|voir|sembler|paraître|paraitre|sentir|rester|retrouver|") && g_morph(lToken[nTokenOffset+3], ":[NA]"));
    },
    _g_cond_gv2_49: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+2], "_enum_") && g_morph(lToken[nTokenOffset], ":C|<start>|>,", ":[YP]") && g_morph(lToken[nTokenOffset+2], ":[NA].*:[si]", ":G") && ! ( (g_value(lToken[nTokenOffset+2], "|dizaine|douzaine|quinzaine|vingtaine|trentaine|quarantaine|cinquantaine|soixantaine|centaine|majorité|minorité|millier|partie|poignée|tas|paquet|moitié|") || g_tag_before(lToken[nTokenOffset+1], dTags, "_ni_") || g_value(lToken[nTokenOffset], "|et|ou|")) && g_morph(lToken[nTokenOffset+3], ":3?p") ) && ! g_checkAgreement(lToken[nTokenOffset+2], lToken[nTokenOffset+3]) && ! ( g_morph(lToken[nTokenOffset+2], "(?:[123][sp]|P)") && ! g_value(lToken[nTokenOffset], "|<start>|,|") );
    },
    _g_cond_gv2_50: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nLastToken-1+1], "_ngn_") && g_morph(lToken[nTokenOffset+3], ":A.*:p") || (g_morph(lToken[nTokenOffset+3], ":N.*:p") && g_morph(lToken[nTokenOffset+2], ":A"));
    },
    _g_sugg_gv2_8: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+3]["sValue"], ":3s", suggSing);
    },
    _g_cond_gv2_51: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+2], "_enum_") && g_morph(lToken[nTokenOffset], ":C|<start>|>,", ":[YP]") && g_morph(lToken[nTokenOffset+2], ":[NA].*:[si]", ":G") && ! ( (g_value(lToken[nTokenOffset+2], "|dizaine|douzaine|quinzaine|vingtaine|trentaine|quarantaine|cinquantaine|soixantaine|centaine|majorité|minorité|millier|partie|poignée|tas|paquet|moitié|") || g_tag_before(lToken[nTokenOffset+1], dTags, "_ni_") || g_value(lToken[nTokenOffset], "|et|ou|")) && g_morph(lToken[nTokenOffset+4], ":3p") );
    },
    _g_sugg_gv2_9: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+4]["sValue"], ":3s");
    },
    _g_cond_gv2_52: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+2], "_enum_") && g_morph(lToken[nTokenOffset], ":C|<start>|>,", ":[YP]") && g_morph(lToken[nTokenOffset+2], ":[NA].*:[me]:[si]", ":G") && ! ( (g_value(lToken[nTokenOffset+2], "|dizaine|douzaine|quinzaine|vingtaine|trentaine|quarantaine|cinquantaine|soixantaine|centaine|majorité|minorité|millier|partie|poignée|tas|paquet|moitié|") || g_tag_before(lToken[nTokenOffset+1], dTags, "_ni_") || g_value(lToken[nTokenOffset], "|et|ou|")) && g_morph(lToken[nTokenOffset+3], ":3?p") ) && ! g_checkAgreement(lToken[nTokenOffset+2], lToken[nTokenOffset+3]);
    },
    _g_cond_gv2_53: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+2], "_enum_") && g_morph(lToken[nTokenOffset], ":C|<start>|>,", ":[YP]") && g_morph(lToken[nTokenOffset+2], ":[NA].*:[fe]:[si]", ":G") && ! ( (g_value(lToken[nTokenOffset+2], "|dizaine|douzaine|quinzaine|vingtaine|trentaine|quarantaine|cinquantaine|soixantaine|centaine|majorité|minorité|millier|partie|poignée|tas|paquet|moitié|") || g_tag_before(lToken[nTokenOffset+1], dTags, "_ni_") || g_value(lToken[nTokenOffset], "|et|ou|")) && g_morph(lToken[nTokenOffset+3], ":3?p") ) && ! g_checkAgreement(lToken[nTokenOffset+2], lToken[nTokenOffset+3]);
    },
    _g_cond_gv2_54: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+1], "_un_des_") && g_morph(lToken[nTokenOffset], ":C|<start>|>(?:,|dont)", ":(?:Y|P|Q|[123][sp]|R)̉|>(?:sauf|excepté|et|ou)/");
    },
    _g_cond_gv2_55: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+1], "_un_des_") && g_morph(lToken[nTokenOffset], "<start>|>(?:,|dont)/|:R");
    },
    _g_cond_gv2_56: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_tag(lToken[nTokenOffset+1], "_un_des_") && g_morph(lToken[nTokenOffset], ":C|<start>|>,", ":(?:Y|P|Q|[123][sp]|R)");
    },
    _g_cond_gv2_57: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":C|<start>|>,", ":(?:Y|P|Q|[123][sp]|R)");
    },
    _g_cond_gv2_58: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_morph(lToken[nTokenOffset], ":R") && g_morph(lToken[nLastToken-1+1], ":3p"));
    },
    _g_sugg_gv2_10: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+3]["sValue"], ":1p");
    },
    _g_sugg_gv2_11: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+3]["sValue"], ":2p");
    },
    _g_cond_gv2_59: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":R") && ! (g_morph(lToken[nTokenOffset+2], ":Q") && g_morph(lToken[nTokenOffset], ":V0.*:3p"));
    },
    _g_sugg_gv2_12: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+2]["sValue"], ":3p");
    },
    _g_cond_gv2_60: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && g_morph(lToken[nTokenOffset+2], ":3s");
    },
    _g_sugg_gv2_13: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+3]["sValue"], ":3p");
    },
    _g_cond_gv2_61: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && g_morph(lToken[nTokenOffset+3], ":3s");
    },
    _g_cond_gv2_62: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":3s");
    },
    _g_cond_gv2_63: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[123]s");
    },
    _g_cond_gv2_64: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo && g_morph(lToken[nTokenOffset+2], ":[123]s");
    },
    _g_sugg_gv2_14: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].replace(/s/g, "").replace(/S/g, "");
    },
    _g_cond_gv2_65: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_tag(lToken[nTokenOffset+1], "_bcp_plur_") && ! g_morph(lToken[nTokenOffset+2], ":3p");
    },
    _g_cond_gv2_66: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_tag(lToken[nTokenOffset+1], "_bcp_sing_") && ! g_morph(lToken[nTokenOffset+2], ":3s");
    },
    _g_cond_gv2_67: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && lToken[nTokenOffset+2]["sValue"] != "a" && ! g_tag(lToken[nTokenOffset+1], "_bcp_sing_") && ! g_morph(lToken[nTokenOffset+2], ":3p") && ! (g_space_between_tokens(lToken[nTokenOffset+1], lToken[nTokenOffset+1+1], 1, 2) && g_morph(lToken[nTokenOffset+2], ":V0"));
    },
    _g_sugg_gv2_15: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nLastToken-1+1]["sValue"], ":3p");
    },
    _g_cond_gv2_68: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[VR]") && ! (g_tag(lToken[nTokenOffset+1], "_d_entre_nous_") && g_morph(lToken[nLastToken-1+1], ":1p")) && ! (g_tag(lToken[nTokenOffset+1], "_d_entre_vous_") && g_morph(lToken[nLastToken-1+1], ":2p"));
    },
    _g_cond_gv2_69: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! (g_tag(lToken[nTokenOffset+1], "_d_entre_nous_") && g_morph(lToken[nLastToken-1+1], ":1p")) && ! (g_tag(lToken[nTokenOffset+1], "_d_entre_vous_") && g_morph(lToken[nLastToken-1+1], ":2p"));
    },
    _g_cond_gv2_70: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":[12]p");
    },
    _g_cond_gv2_71: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[VR]|>(?:et|ou)/");
    },
    _g_cond_gv2_72: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":Cs|<start>|>,") && !( g_morph(lToken[nTokenOffset+3], ":3s") && look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "(?i)\\b(?:l[ea] |l’|une? |ce(?:tte|t|) |[mts](?:on|a) |[nv]otre ).+ entre .+ et ") );
    },
    _g_cond_gv2_73: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nLastToken-1+1], "_ngn_") && g_morph(lToken[nTokenOffset+3], ":A.*:s") || (g_morph(lToken[nTokenOffset+3], ":N.*:s") && g_morph(lToken[nTokenOffset+2], ":A"));
    },
    _g_sugg_gv2_16: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+3]["sValue"], ":3p", suggPlur);
    },
    _g_cond_gv2_74: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":Cs|<start>|>,") && !( g_morph(lToken[nTokenOffset+4], ":3s") && look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "(?i)\\b(?:l[ea] |l’|une? |ce(?:tte|t|) |[mts](?:on|a) |[nv]otre ).+ entre .+ et ") );
    },
    _g_sugg_gv2_17: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+4]["sValue"], ":3p");
    },
    _g_cond_gv2_75: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":Cs|<start>|>,") && ! ( g_morph(lToken[nTokenOffset+3], ":3s") && look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "(?i)\\b(?:l[ea] |l’|une? |ce(?:tte|t|) |[mts](?:on|a) |[nv]otre ).+ entre .+ et ") ) && ! g_checkAgreement(lToken[nTokenOffset+2], lToken[nTokenOffset+3]) && ! ( g_morph(lToken[nTokenOffset+2], "(?:[123][sp]|P)") && ! g_value(lToken[nTokenOffset], "|<start>|,|") );
    },
    _g_cond_gv2_76: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset], ":Cs|<start>|>,") && !( g_morph(lToken[nTokenOffset+3], ":3s") && look(sSentence.slice(0,lToken[1+nTokenOffset]["nStart"]), "(?i)\\b(?:l[ea] |l’|une? |ce(?:tte|t|) |[mts](?:on|a) |[nv]otre ).+ entre .+ et ") ) && ! g_checkAgreement(lToken[nTokenOffset+2], lToken[nTokenOffset+3]) && ! ( g_morph(lToken[nTokenOffset+2], "(?:[123][sp]|P)") && ! g_value(lToken[nTokenOffset], "|<start>|,|") );
    },
    _g_sugg_gv2_18: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+3]["sValue"], ":3p", suggMasPlur);
    },
    _g_sugg_gv2_19: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+3]["sValue"], ":3p", suggFemPlur);
    },
    _g_cond_gv2_77: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nLastToken+1], ":(?:R|D.*:p)|>au/|<end>|>,");
    },
    _g_cond_gv2_78: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+4], ":[NA]");
    },
    _g_cond_gv2_79: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && ! g_checkAgreement(lToken[nTokenOffset+3], lToken[nTokenOffset+4]);
    },
    _g_sugg_gv2_20: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+4]["sValue"], ":3p", suggPlur);
    },
    _g_sugg_gv2_21: function (lToken, nTokenOffset, nLastToken) {
        return suggVerb(lToken[nTokenOffset+5]["sValue"], ":3p");
    },
    _g_cond_gv2_80: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+2], "_enum_") && g_morph(lToken[nTokenOffset+2], ":M");
    },
    _g_cond_gv2_81: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":M") && g_morph(lToken[nTokenOffset+3], ":M") && ! g_morph(lToken[nTokenOffset], ":[RV]|>(?:des?|du|et|ou|ni)/");
    },
    _g_cond_gv2_82: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset], ":[RV]");
    },
    _g_cond_gv2_83: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[123][sp]", ":(?:3s|G|W|3p!)") && ! g_value(lToken[nTokenOffset+4], "|plupart|majorité|groupe|") && ! g_tag(lToken[nTokenOffset+4], "_enum_") && ! (g_value(lToken[nLastToken+1], "|et|ou|") && g_morph(g_token(lToken, nLastToken+2), ":D")) && ! (g_value(g_token(lToken, nLastToken+2), "|et|ou|") && g_morph(g_token(lToken, nLastToken+3), ":D"));
    },
    _g_cond_gv2_84: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[123][sp]", ":(?:3s|G|W|3p!)") && ! g_value(lToken[nTokenOffset+4], "|plupart|majorité|groupe|") && ! g_tag(lToken[nTokenOffset+4], "_enum_") && ! (g_value(lToken[nLastToken+1], "|et|ou|") && g_morph(g_token(lToken, nLastToken+2), ":D")) && ! (g_value(g_token(lToken, nLastToken+2), "|et|ou|") && g_morph(g_token(lToken, nLastToken+3), ":D")) && ! g_morph(lToken[nTokenOffset+4], ":Y");
    },
    _g_cond_gv2_85: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[123][sp]", ":(?:3s|G|W|3p!)") && ! g_value(lToken[nTokenOffset+4], "|plupart|majorité|groupe|") && ! g_tag(lToken[nTokenOffset+4], "_enum_") && ! (g_value(lToken[nLastToken+1], "|et|ou|") && g_morph(g_token(lToken, nLastToken+2), ":D")) && ! (g_value(g_token(lToken, nLastToken+2), "|et|ou|") && g_morph(g_token(lToken, nLastToken+3), ":D")) && ! g_morph(lToken[nTokenOffset], ":[NA]");
    },
    _g_cond_gv2_86: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[123][sp]", ":(?:3s|G|W|3p!)") && ! g_value(lToken[nTokenOffset+4], "|plupart|majorité|groupe|") && ! g_tag(lToken[nTokenOffset+4], "_enum_") && ! (g_value(lToken[nLastToken+1], "|et|ou|") && g_morph(g_token(lToken, nLastToken+2), ":D")) && ! (g_value(g_token(lToken, nLastToken+2), "|et|ou|") && g_morph(g_token(lToken, nLastToken+3), ":D")) && ! g_morph(lToken[nTokenOffset+4], ":Y") && ! g_morph(lToken[nTokenOffset], ":[NA]");
    },
    _g_cond_gv2_87: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[123][sp]", ":(?:3s|G|W|3p!)") && g_morph(lToken[nTokenOffset], ":R") && ! g_value(lToken[nTokenOffset+4], "|plupart|majorité|groupe|") && ! (g_value(lToken[nLastToken+1], "|et|ou|") && g_morph(g_token(lToken, nLastToken+2), ":D"));
    },
    _g_cond_gv2_88: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[123][sp]", ":(?:3p|G|W)");
    },
    _g_cond_gv2_89: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[123][sp]", ":(?:3p|G|W)") && ! g_morph(lToken[nTokenOffset], ":[NA]");
    },
    _g_cond_gv2_90: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[123][sp]", ":(?:3p|G|W)") && g_morph(lToken[nTokenOffset], ":R");
    },
    _g_cond_gv2_91: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+2], ":[12]s") && ! g_value(lToken[nLastToken+1], "|je|tu|");
    },
    _g_cond_gv2_92: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! bCondMemo && g_morph(lToken[nTokenOffset+2], ":[12]p") && ! g_value(lToken[nLastToken+1], "|nous|vous|");
    },
    _g_cond_gv2_93: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":V0e", ":3s");
    },
    _g_cond_gv2_94: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! ( g_morph(lToken[nTokenOffset+3], ":3p") && (g_value(lToken[nLastToken+1], "|et|") || g_tag(lToken[nTokenOffset+5], "_enum_")) );
    },
    _g_cond_gv2_95: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return bCondMemo;
    },
    _g_sugg_gv2_22: function (lToken, nTokenOffset, nLastToken) {
        return lToken[nTokenOffset+1]["sValue"].slice(0,-1);
    },
    _g_cond_gv2_96: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+3], ":V0e", ":3p");
    },
    _g_cond_gv2_97: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morphVC(lToken[nTokenOffset+1], ">avoir/");
    },
    _g_cond_gv2_98: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+4], ":K");
    },
    _g_sugg_gv2_23: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbTense(lToken[nTokenOffset+4]["sValue"], ":Iq", ":1s");
    },
    _g_sugg_gv2_24: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbTense(lToken[nTokenOffset+4]["sValue"], ":Iq", ":2s");
    },
    _g_sugg_gv2_25: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbTense(lToken[nTokenOffset+4]["sValue"], ":Iq", ":3s");
    },
    _g_sugg_gv2_26: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbTense(lToken[nTokenOffset+4]["sValue"], ":Iq", ":1p");
    },
    _g_sugg_gv2_27: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbTense(lToken[nTokenOffset+4]["sValue"], ":Iq", ":2p");
    },
    _g_sugg_gv2_28: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbTense(lToken[nTokenOffset+4]["sValue"], ":Iq", ":3p");
    },
    _g_cond_gv2_99: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+5], ":K");
    },
    _g_sugg_gv2_29: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbTense(lToken[nTokenOffset+5]["sValue"], ":Iq", ":3s");
    },
    _g_sugg_gv2_30: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbTense(lToken[nTokenOffset+5]["sValue"], ":Iq", ":3p");
    },
    _g_sugg_gv2_31: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbMode(lToken[nTokenOffset+3]["sValue"], ":I", lToken[nTokenOffset+2]["sValue"]);
    },
    _g_sugg_gv2_32: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbMode(lToken[nLastToken-1+1]["sValue"], ":I", lToken[nLastToken-2+1]["sValue"]);
    },
    _g_sugg_gv2_33: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbMode(lToken[nTokenOffset+4]["sValue"], ":I", lToken[nTokenOffset+3]["sValue"]);
    },
    _g_sugg_gv2_34: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbMode(lToken[nTokenOffset+3]["sValue"], ":I", "je");
    },
    _g_sugg_gv2_35: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbMode(lToken[nTokenOffset+5]["sValue"], ":I", lToken[nTokenOffset+4]["sValue"]);
    },
    _g_cond_gv2_100: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+1], ":V", ":N");
    },
    _g_sugg_gv2_36: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbMode(lToken[nLastToken-1+1]["sValue"], ":S", lToken[nLastToken-2+1]["sValue"]);
    },
    _g_cond_gv2_101: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_morph(lToken[nTokenOffset+1], ":Q");
    },
    _g_cond_gv2_102: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_tag(lToken[nTokenOffset+1], "_upron_");
    },
    _g_cond_gv2_103: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|ça|cela|ceci|");
    },
    _g_cond_gv2_104: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_value(lToken[nTokenOffset], "|la|");
    },
    _g_cond_gv2_105: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return ! g_tag(lToken[nTokenOffset+1], "_upron_") && ! g_tag(lToken[nTokenOffset+1], "neg") && g_morph(lToken[nTokenOffset+1], ":V", ":N");
    },
    _g_cond_gv2_106: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_tag(lToken[nTokenOffset+2], "_upron_");
    },
    _g_sugg_gv2_37: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbMode(lToken[nTokenOffset+3]["sValue"], ":S", lToken[nTokenOffset+2]["sValue"]);
    },
    _g_sugg_gv2_38: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbMode(lToken[nTokenOffset+4]["sValue"], ":S", lToken[nTokenOffset+3]["sValue"]);
    },
    _g_sugg_gv2_39: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbMode(lToken[nTokenOffset+5]["sValue"], ":S", lToken[nTokenOffset+4]["sValue"]);
    },
    _g_sugg_gv2_40: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbMode(lToken[nTokenOffset+6]["sValue"], ":S", lToken[nTokenOffset+5]["sValue"]);
    },
    _g_cond_gv2_107: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_morph(lToken[nTokenOffset+5], ":I", ":S");
    },
    _g_cond_gv2_108: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 0, 0);
    },
    _g_sugg_gv2_41: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbTense(lToken[nTokenOffset+4]["sValue"], ":E", ":2s");
    },
    _g_cond_gv2_109: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+2], lToken[nTokenOffset+2+1], 0, 0) && g_morph(lToken[nTokenOffset+4], ">(?:être|devenir|redevenir|sembler|para[iî]tre)/");
    },
    _g_cond_gv2_110: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+3], lToken[nTokenOffset+3+1], 0, 0);
    },
    _g_sugg_gv2_42: function (lToken, nTokenOffset, nLastToken) {
        return suggVerbTense(lToken[nTokenOffset+5]["sValue"], ":E", ":2s");
    },
    _g_cond_gv2_111: function (lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, dTags, sSentence, sSentence0) {
        return g_space_between_tokens(lToken[nTokenOffset+3], lToken[nTokenOffset+3+1], 0, 0) && g_morph(lToken[nTokenOffset+5], ">(?:être|devenir|redevenir|sembler|para[iî]tre)/");
    },

}


if (typeof(exports) !== 'undefined') {
    exports.lang = gc_engine.lang;
    exports.locales = gc_engine.locales;
    exports.pkg = gc_engine.pkg;
    exports.name = gc_engine.name;
    exports.version = gc_engine.version;
    exports.author = gc_engine.author;
    // init
    exports.load = gc_engine.load;
    exports.parse = gc_engine.parse;
    exports.getSpellChecker = gc_engine.getSpellChecker;
    // rules
    exports.ignoreRule = gc_engine.ignoreRule;
    exports.resetIgnoreRules = gc_engine.resetIgnoreRules;
    exports.reactivateRule = gc_engine.reactivateRule;
    exports.listRules = gc_engine.listRules;
    exports.getRules = gc_engine.getRules;
    // options
    exports.setOption = gc_engine.setOption;
    exports.setOptions = gc_engine.setOptions;
    exports.getOptions = gc_engine.getOptions;
    exports.getDefaultOptions = gc_engine.getDefaultOptions;
    exports.resetOptions = gc_engine.resetOptions;
    // other
    exports.TextParser = TextParser;
}
