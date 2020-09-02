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
    var spellchecker = require("../graphspell/spellchecker.js");
    var gc_functions = require("./gc_functions.js");
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


var gc_engine = {

    //// Informations

    lang: "fr",
    locales: {'fr-FR': ['fr', 'FR', ''], 'fr-BE': ['fr', 'BE', ''], 'fr-CA': ['fr', 'CA', ''], 'fr-CH': ['fr', 'CH', ''], 'fr-LU': ['fr', 'LU', ''], 'fr-BF': ['fr', 'BF', ''], 'fr-BJ': ['fr', 'BJ', ''], 'fr-CD': ['fr', 'CD', ''], 'fr-CI': ['fr', 'CI', ''], 'fr-CM': ['fr', 'CM', ''], 'fr-MA': ['fr', 'MA', ''], 'fr-ML': ['fr', 'ML', ''], 'fr-MU': ['fr', 'MU', ''], 'fr-NE': ['fr', 'NE', ''], 'fr-RE': ['fr', 'RE', ''], 'fr-SN': ['fr', 'SN', ''], 'fr-TG': ['fr', 'TG', '']},
    pkg: "grammalecte",
    name: "Grammalecte",
    version: "1.12.1",
    author: "Olivier R.",

    //// Tools
    oSpellChecker: null,
    oTokenizer: null,

    //// Data
    aIgnoredRules: new Set(),
    oOptionsColors: null,

    //// Initialization

    load: function (sContext="JavaScript", sColorType="aRGB", sPath="") {
        try {
            if (typeof(process) !== 'undefined') {
                this.oSpellChecker = new spellchecker.SpellChecker("fr", "", "fr-allvars.json", "", "");
            } else {
                this.oSpellChecker = new SpellChecker("fr", sPath, "fr-allvars.json", "", "");
            }
            this.oSpellChecker.activateStorage();
            this.oTokenizer = this.oSpellChecker.getTokenizer();
            gc_functions.load(sContext, this.oSpellChecker);
            gc_options.load(sContext)
            this.oOptionsColors = gc_options.getOptionsColors(sContext, sColorType);
        }
        catch (e) {
            console.error(e);
        }
    },

    getSpellChecker: function () {
        return this.oSpellChecker;
    },

    //// Rules

    getRules: function (bParagraph) {
        if (!bParagraph) {
            return gc_rules.lSentenceRules;
        }
        return gc_rules.lParagraphRules;
    },

    ignoreRule: function (sRuleId) {
        this.aIgnoredRules.add(sRuleId);
    },

    resetIgnoreRules: function () {
        this.aIgnoredRules.clear();
    },

    reactivateRule: function (sRuleId) {
        this.aIgnoredRules.delete(sRuleId);
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
        gc_options.setOption(sOpt, bVal);
    },

    setOptions: function (dOpt) {
        gc_options.setOptions(dOpt);
    },

    getOptions: function () {
        return gc_options.getOptions();
    },

    getDefaultOptions: function () {
        return gc_options.getDefaultOptions();
    },

    resetOptions: function () {
        gc_options.resetOptions();
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
        let dOpt = dOptions || gc_options.dOptions;
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
                this.lToken = Array.from(gc_engine.oTokenizer.genTokens(this.sSentence, true));
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
                            oToken["bValidToken"] = gc_engine.oSpellChecker.isValidToken(oToken["sValue"]);
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
        if (sText.includes("‐")) {
            sText = sText.replace(/‐/g, "-"); // Hyphen (U+2010)
        }
        if (sText.includes("‑")) {
            sText = sText.replace(/‑/g, "-"); // Non-Breaking Hyphen (U+2011)
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
                    if (!gc_engine.aIgnoredRules.has(sRuleId)) {
                        while ((m = zRegex.gl_exec2(sText, lGroups, lNegLookBefore)) !== null) {
                            let bCondMemo = null;
                            for (let [sFuncCond, cActionType, sWhat, ...eAct] of lActions) {
                                // action in lActions: [ condition, action type, replacement/suggestion/action[, iGroup[, message, URL]] ]
                                try {
                                    bCondMemo = (!sFuncCond || gc_functions[sFuncCond](sText, sText0, m, this.dTokenPos, sCountry, bCondMemo));
                                    //bCondMemo = (!sFuncCond || oEvalFunc[sFuncCond](sText, sText0, m, this.dTokenPos, sCountry, bCondMemo));
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
                                                gc_functions[sWhat](sText, m, this.dTokenPos);
                                                //oEvalFunc[sWhat](sText, m, this.dTokenPos);
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
        let lNewToken = Array.from(gc_engine.oTokenizer.genTokens(sSentence, true));
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
                    for (let sLemma of gc_engine.oSpellChecker.getLemma(oToken["sValue"])) {
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
                    let lMorph = (oToken.hasOwnProperty("lMorph")) ? oToken["lMorph"] : gc_engine.oSpellChecker.getMorph(oToken["sValue"]);
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
                    let lMorph = (oToken.hasOwnProperty("lMorph")) ? oToken["lMorph"] : gc_engine.oSpellChecker.getMorph(oToken["sValue"]);
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
                        bCondMemo = !sFuncCond || gc_functions[sFuncCond](this.lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, this.dTags, this.sSentence, this.sSentence0);
                        //bCondMemo = !sFuncCond || oEvalFunc[sFuncCond](this.lToken, nTokenOffset, nLastToken, sCountry, bCondMemo, this.dTags, this.sSentence, this.sSentence0);
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
                                gc_functions[sWhat](this.lToken, nTokenOffset, nLastToken);
                                //oEvalFunc[sWhat](this.lToken, nTokenOffset, nLastToken);
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
            sSugg = gc_functions[sSugg.slice(1)](sText, m);
            //sSugg = oEvalFunc[sSugg.slice(1)](sText, m);
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
        let sMessage = (sMsg.startsWith("=")) ? gc_functions[sMsg.slice(1)](sText, m) : sMsg.gl_expand(m);
        //let sMessage = (sMsg.startsWith("=")) ? oEvalFunc[sMsg.slice(1)](sText, m) : sMsg.gl_expand(m);
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
            sSugg = gc_functions[sSugg.slice(1)](this.lToken, nTokenOffset, nLastToken);
            //sSugg = oEvalFunc[sSugg.slice(1)](this.lToken, nTokenOffset, nLastToken);
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
        let sMessage = (sMsg.startsWith("=")) ? gc_functions[sMsg.slice(1)](this.lToken, nTokenOffset, nLastToken) : this._expand(sMsg, nTokenOffset, nLastToken);
        //let sMessage = (sMsg.startsWith("=")) ? oEvalFunc[sMsg.slice(1)](this.lToken, nTokenOffset, nLastToken) : this._expand(sMsg, nTokenOffset, nLastToken);
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
            "aColor": gc_engine.oOptionsColors[sOption],
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
            sNew = gc_functions[sRepl.slice(1)](sText, m);
            //sNew = oEvalFunc[sRepl.slice(1)](sText, m);
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
                sWhat = gc_functions[sWhat.slice(1)](this.lToken, nTokenOffset, nLastToken);
                //sWhat = oEvalFunc[sWhat.slice(1)](this.lToken, nTokenOffset, nLastToken);
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
