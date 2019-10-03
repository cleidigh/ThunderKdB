// Grammalecte - Conjugueur
// License: GPL 3
/*jslint esversion: 6*/
/*global console,require,exports,self,browser*/

"use strict";


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
    var helpers = require("resource://grammalecte/graphspell/helpers.js");
}

var conj = {
    _lVtyp: [],
    _lTags: [],
    _dPatternConj: {},
    _dVerb: {},

    bInit: false,
    init: function (sJSONData) {
        try {
            let _oData = JSON.parse(sJSONData);
            this._lVtyp = _oData.lVtyp;
            this._lTags = _oData.lTags;
            this._dPatternConj = _oData.dPatternConj;
            this._dVerb = _oData.dVerb;
            this.bInit = true;
        }
        catch (e) {
            console.error(e);
        }
    },

    _zStartVoy: new RegExp("^[aeéiouœê]"),
    _zNeedTeuph: new RegExp("[tdc]$"),

    _dProSuj: new Map ([ [":1s", "je"], [":1ś", "je"], [":2s", "tu"], [":3s", "il"], [":1p", "nous"], [":2p", "vous"], [":3p", "ils"] ]),
    _dProObj: new Map ([ [":1s", "me "], [":1ś", "me "], [":2s", "te "], [":3s", "se "], [":1p", "nous "], [":2p", "vous "], [":3p", "se "] ]),
    _dProObjEl: new Map ([ [":1s", "m’"], [":1ś", "m’"], [":2s", "t’"], [":3s", "s’"], [":1p", "nous "], [":2p", "vous "], [":3p", "s’"] ]),
    _dImpePro: new Map ([ [":2s", "-toi"], [":1p", "-nous"], [":2p", "-vous"] ]),
    _dImpeProNeg: new Map ([ [":2s", "ne te "], [":1p", "ne nous "], [":2p", "ne vous "] ]),
    _dImpeProEn: new Map ([ [":2s", "-t’en"], [":1p", "-nous-en"], [":2p", "-vous-en"] ]),
    _dImpeProNegEn: new Map ([ [":2s", "ne t’en "], [":1p", "ne nous en "], [":2p", "ne vous en "] ]),

    _dGroup: new Map ([ ["0", "auxiliaire"], ["1", "1ᵉʳ groupe"], ["2", "2ᵉ groupe"], ["3", "3ᵉ groupe"] ]),

    _dTenseIdx: new Map ([ [":PQ", 0], [":Ip", 1], [":Iq", 2], [":Is", 3], [":If", 4], [":K", 5], [":Sp", 6], [":Sq", 7], [":E", 8] ]),

    isVerb: function (sVerb) {
        return this._dVerb.hasOwnProperty(sVerb);
    },

    getConj: function (sVerb, sTense, sWho) {
        // returns conjugation (can be an empty string)
        if (!this._dVerb.hasOwnProperty(sVerb)) {
            return null;
        }
        if (!this._dPatternConj[sTense][this._lTags[this._dVerb[sVerb][1]][this._dTenseIdx.get(sTense)]].hasOwnProperty(sWho)) {
            return "";
        }
        return this._modifyStringWithSuffixCode(sVerb, this._dPatternConj[sTense][this._lTags[this._dVerb[sVerb][1]][this._dTenseIdx.get(sTense)]][sWho]);
    },

    hasConj: function (sVerb, sTense, sWho) {
        // returns false if no conjugation (also if empty) else true
        if (!this._dVerb.hasOwnProperty(sVerb)) {
            return false;
        }
        if (this._dPatternConj[sTense][this._lTags[this._dVerb[sVerb][1]][this._dTenseIdx.get(sTense)]].hasOwnProperty(sWho)
                && this._dPatternConj[sTense][this._lTags[this._dVerb[sVerb][1]][this._dTenseIdx.get(sTense)]][sWho]) {
            return true;
        }
        return false;
    },

    getVtyp: function (sVerb) {
        // returns raw informations about sVerb
        if (!this._dVerb.hasOwnProperty(sVerb)) {
            return null;
        }
        return this._lVtyp[this._dVerb[sVerb][0]];
    },

    getSimil: function (sWord, sMorph, bSubst=false) {
        if (!sMorph.includes(":V")) {
            return new Set();
        }
        let sInfi = sMorph.slice(1, sMorph.indexOf(" "));
        let aSugg = new Set();
        let tTags = this._getTags(sInfi);
        if (tTags) {
            if (!bSubst) {
                // we suggest conjugated forms
                if (sMorph.includes(":V1")) {
                    aSugg.add(sInfi);
                    aSugg.add(this._getConjWithTags(sInfi, tTags, ":Ip", ":3s"));
                    aSugg.add(this._getConjWithTags(sInfi, tTags, ":Ip", ":2p"));
                    aSugg.add(this._getConjWithTags(sInfi, tTags, ":Iq", ":1s"));
                    aSugg.add(this._getConjWithTags(sInfi, tTags, ":Iq", ":3s"));
                    aSugg.add(this._getConjWithTags(sInfi, tTags, ":Iq", ":3p"));
                } else if (sMorph.includes(":V2")) {
                    aSugg.add(this._getConjWithTags(sInfi, tTags, ":Ip", ":1s"));
                    aSugg.add(this._getConjWithTags(sInfi, tTags, ":Ip", ":3s"));
                } else if (sMorph.includes(":V3")) {
                    aSugg.add(this._getConjWithTags(sInfi, tTags, ":Ip", ":1s"));
                    aSugg.add(this._getConjWithTags(sInfi, tTags, ":Ip", ":3s"));
                    aSugg.add(this._getConjWithTags(sInfi, tTags, ":Is", ":1s"));
                    aSugg.add(this._getConjWithTags(sInfi, tTags, ":Is", ":3s"));
                } else if (sMorph.includes(":V0a")) {
                    aSugg.add("eus");
                    aSugg.add("eut");
                } else {
                    aSugg.add("étais");
                    aSugg.add("était");
                }
                aSugg.delete("");
            } else {
                // we suggest past participles
                aSugg.add(this._getConjWithTags(sInfi, tTags, ":PQ", ":Q1"));
                aSugg.add(this._getConjWithTags(sInfi, tTags, ":PQ", ":Q2"));
                aSugg.add(this._getConjWithTags(sInfi, tTags, ":PQ", ":Q3"));
                aSugg.add(this._getConjWithTags(sInfi, tTags, ":PQ", ":Q4"));
                aSugg.delete("");
                // if there is only one past participle (epi inv), unreliable.
                if (aSugg.size === 1) {
                    aSugg.clear();
                }
            }
        }
        return aSugg;
    },

    _getTags: function (sVerb) {
        // returns tuple of tags (usable with functions _getConjWithTags and _hasConjWithTags)
        if (!this._dVerb.hasOwnProperty(sVerb)) {
            return null;
        }
        return this._lTags[this._dVerb[sVerb][1]];
    },

    _getConjWithTags: function (sVerb, tTags, sTense, sWho) {
        // returns conjugation (can be an empty string)
        if (!this._dPatternConj[sTense][tTags[this._dTenseIdx.get(sTense)]].hasOwnProperty(sWho)) {
            return "";
        }
        return this._modifyStringWithSuffixCode(sVerb, this._dPatternConj[sTense][tTags[this._dTenseIdx.get(sTense)]][sWho]);
    },

    _hasConjWithTags: function (tTags, sTense, sWho) {
        // returns false if no conjugation (also if empty) else true
        if (this._dPatternConj[sTense][tTags[this._dTenseIdx.get(sTense)]].hasOwnProperty(sWho)
                && this._dPatternConj[sTense][tTags[this._dTenseIdx.get(sTense)]][sWho]) {
            return true;
        }
        return false;
    },

    _modifyStringWithSuffixCode: function (sWord, sSfx) {
        // returns sWord modified by sSfx
        if (sSfx === "") {
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


class Verb {

    constructor (sVerb, sVerbPattern="") {
        // conjugate a unknown verb with rules from sVerbPattern
        if (typeof sVerb !== "string" || sVerb === "") {
            throw new TypeError ("The value should be a non-empty string.");
        }
        if (sVerbPattern.length == 0) {
            sVerbPattern = sVerb;
        }
        this.sVerb = sVerb;
        this.sVerbAux = "";
        this._sRawInfo = conj.getVtyp(sVerbPattern);
        this.sInfo = this._readableInfo(this._sRawInfo);
        this._tTags = conj._getTags(sVerbPattern);
        if (!this._tTags) {
            throw new RangeError ("Unknown verb.");
        }
        this._tTagsAux = conj._getTags(this.sVerbAux);
        this.bProWithEn = (this._sRawInfo[5] === "e");
        this.cGroup = this._sRawInfo[0];
        this.dConj = new Map ([
            [":Y", new Map ([
                ["label", "Infinitif"],
                [":", sVerb]
            ])],
            [":P", new Map ([
                ["label", "Participe présent"],
                [":", conj._getConjWithTags(sVerb, this._tTags, ":PQ", ":P")]
            ])],
            [":Q", new Map ([
                ["label", "Participes passés"],
                [":Q1", conj._getConjWithTags(sVerb, this._tTags, ":PQ", ":Q1")],
                [":Q2", conj._getConjWithTags(sVerb, this._tTags, ":PQ", ":Q2")],
                [":Q3", conj._getConjWithTags(sVerb, this._tTags, ":PQ", ":Q3")],
                [":Q4", conj._getConjWithTags(sVerb, this._tTags, ":PQ", ":Q4")],
            ])],
            [":Ip", new Map ([
                ["label", "Présent"],
                [":1s", conj._getConjWithTags(sVerb, this._tTags, ":Ip", ":1s")],
                [":1ś", conj._getConjWithTags(sVerb, this._tTags, ":Ip", ":1ś")],
                [":2s", conj._getConjWithTags(sVerb, this._tTags, ":Ip", ":2s")],
                [":3s", conj._getConjWithTags(sVerb, this._tTags, ":Ip", ":3s")],
                [":1p", conj._getConjWithTags(sVerb, this._tTags, ":Ip", ":1p")],
                [":2p", conj._getConjWithTags(sVerb, this._tTags, ":Ip", ":2p")],
                [":3p", conj._getConjWithTags(sVerb, this._tTags, ":Ip", ":3p")]
            ])],
            [":Iq", new Map ([
                ["label", "Imparfait"],
                [":1s", conj._getConjWithTags(sVerb, this._tTags, ":Iq", ":1s")],
                [":2s", conj._getConjWithTags(sVerb, this._tTags, ":Iq", ":2s")],
                [":3s", conj._getConjWithTags(sVerb, this._tTags, ":Iq", ":3s")],
                [":1p", conj._getConjWithTags(sVerb, this._tTags, ":Iq", ":1p")],
                [":2p", conj._getConjWithTags(sVerb, this._tTags, ":Iq", ":2p")],
                [":3p", conj._getConjWithTags(sVerb, this._tTags, ":Iq", ":3p")]
            ])],
            [":Is", new Map ([
                ["label", "Passé simple"],
                [":1s", conj._getConjWithTags(sVerb, this._tTags, ":Is", ":1s")],
                [":2s", conj._getConjWithTags(sVerb, this._tTags, ":Is", ":2s")],
                [":3s", conj._getConjWithTags(sVerb, this._tTags, ":Is", ":3s")],
                [":1p", conj._getConjWithTags(sVerb, this._tTags, ":Is", ":1p")],
                [":2p", conj._getConjWithTags(sVerb, this._tTags, ":Is", ":2p")],
                [":3p", conj._getConjWithTags(sVerb, this._tTags, ":Is", ":3p")]
            ])],
            [":If", new Map ([
                ["label", "Futur"],
                [":1s", conj._getConjWithTags(sVerb, this._tTags, ":If", ":1s")],
                [":2s", conj._getConjWithTags(sVerb, this._tTags, ":If", ":2s")],
                [":3s", conj._getConjWithTags(sVerb, this._tTags, ":If", ":3s")],
                [":1p", conj._getConjWithTags(sVerb, this._tTags, ":If", ":1p")],
                [":2p", conj._getConjWithTags(sVerb, this._tTags, ":If", ":2p")],
                [":3p", conj._getConjWithTags(sVerb, this._tTags, ":If", ":3p")]
            ])],
            [":Sp", new Map ([
                ["label", "Présent subjonctif"],
                [":1s", conj._getConjWithTags(sVerb, this._tTags, ":Sp", ":1s")],
                [":1ś", conj._getConjWithTags(sVerb, this._tTags, ":Sp", ":1ś")],
                [":2s", conj._getConjWithTags(sVerb, this._tTags, ":Sp", ":2s")],
                [":3s", conj._getConjWithTags(sVerb, this._tTags, ":Sp", ":3s")],
                [":1p", conj._getConjWithTags(sVerb, this._tTags, ":Sp", ":1p")],
                [":2p", conj._getConjWithTags(sVerb, this._tTags, ":Sp", ":2p")],
                [":3p", conj._getConjWithTags(sVerb, this._tTags, ":Sp", ":3p")]
            ])],
            [":Sq", new Map ([
                ["label", "Imparfait subjonctif"],
                [":1s", conj._getConjWithTags(sVerb, this._tTags, ":Sq", ":1s")],
                [":1ś", conj._getConjWithTags(sVerb, this._tTags, ":Sq", ":1ś")],
                [":2s", conj._getConjWithTags(sVerb, this._tTags, ":Sq", ":2s")],
                [":3s", conj._getConjWithTags(sVerb, this._tTags, ":Sq", ":3s")],
                [":1p", conj._getConjWithTags(sVerb, this._tTags, ":Sq", ":1p")],
                [":2p", conj._getConjWithTags(sVerb, this._tTags, ":Sq", ":2p")],
                [":3p", conj._getConjWithTags(sVerb, this._tTags, ":Sq", ":3p")]
            ])],
            [":K", new Map ([
                ["label", "Conditionnel"],
                [":1s", conj._getConjWithTags(sVerb, this._tTags, ":K", ":1s")],
                [":2s", conj._getConjWithTags(sVerb, this._tTags, ":K", ":2s")],
                [":3s", conj._getConjWithTags(sVerb, this._tTags, ":K", ":3s")],
                [":1p", conj._getConjWithTags(sVerb, this._tTags, ":K", ":1p")],
                [":2p", conj._getConjWithTags(sVerb, this._tTags, ":K", ":2p")],
                [":3p", conj._getConjWithTags(sVerb, this._tTags, ":K", ":3p")]
            ])],
            [":E", new Map ([
                ["label", "Impératif"],
                [":2s", conj._getConjWithTags(sVerb, this._tTags, ":E", ":2s")],
                [":1p", conj._getConjWithTags(sVerb, this._tTags, ":E", ":1p")],
                [":2p", conj._getConjWithTags(sVerb, this._tTags, ":E", ":2p")]
            ])]
        ]);
    }

    _readableInfo () {
        // returns readable infos
        this.sVerbAux = (this._sRawInfo.slice(7,8) == "e") ? "être" : "avoir";
        let sGroup = conj._dGroup.get(this._sRawInfo[0]);
        let sInfo = "";
        if (this._sRawInfo.slice(3,4) == "t") {
            sInfo = "transitif";
        } else if (this._sRawInfo.slice(4,5) == "n") {
            sInfo = "transitif indirect";
        } else if (this._sRawInfo.slice(2,3) == "i") {
            sInfo = "intransitif";
        } else if (this._sRawInfo.slice(5,6) == "r") {
            sInfo = "pronominal réciproque";
        } else if (this._sRawInfo.slice(5,6) == "p") {
            sInfo = "pronominal";
        }
        if ( ["q", "u", "v", "e"].includes(this._sRawInfo.slice(5,6)) ) {
            sInfo = sInfo + " (+ usage pronominal)";
        }
        if (this._sRawInfo.slice(6,7) == "m") {
            sInfo = sInfo + " impersonnel";
        }
        if (sInfo === "") {
            sInfo = "# erreur - code : " + this._sRawInfo;
        }
        return sGroup + " · " + sInfo;
    }

    infinitif (bPro, bNeg, bTpsCo, bInt, bFem) {
        let sInfi;
        if (bTpsCo) {
            sInfi = (bPro) ? "être" : this.sVerbAux;
        } else {
            sInfi = this.sVerb;
        }
        if (bPro) {
            if (this.bProWithEn) {
                sInfi = "s’en " + sInfi;
            } else {
                sInfi = (conj._zStartVoy.test(sInfi)) ? "s’" + sInfi : "se " + sInfi;
            }
        }
        if (bNeg) {
            sInfi = "ne pas " + sInfi;
        }
        if (bTpsCo) {
            sInfi += " " + this._seekPpas(bPro, bFem, (this._sRawInfo[5] == "r"));
        }
        if (bInt) {
            sInfi += " … ?";
        }
        return sInfi;
    }

    participePasse (sWho) {
        return this.dConj.get(":Q").get(sWho);
    }

    participePresent (bPro, bNeg, bTpsCo, bInt, bFem) {
        if (!this.dConj.get(":P").get(":")) {
            return "";
        }
        let sPartPre;
        if (bTpsCo) {
            sPartPre = (!bPro) ? conj._getConjWithTags(this.sVerbAux, this._tTagsAux, ":PQ", ":P") : conj.getConj("être", ":PQ", ":P");
        } else {
            sPartPre = this.dConj.get(":P").get(":");
        }
        if (sPartPre === "") {
            return "";
        }
        let bEli = conj._zStartVoy.test(sPartPre);
        if (bPro) {
            if (this.bProWithEn) {
                sPartPre = "s’en " + sPartPre;
            } else {
                sPartPre = (bEli) ? "s’" + sPartPre : "se " + sPartPre;
            }
        }
        if (bNeg) {
            sPartPre = (bEli && !bPro) ? "n’" + sPartPre + " pas" : "ne " + sPartPre + " pas";
        }
        if (bTpsCo) {
            sPartPre += " " + this._seekPpas(bPro, bFem, this._sRawInfo[5] == "r");
        }
        if (bInt) {
            sPartPre += " … ?";
        }
        return sPartPre;
    }

    conjugue (sTemps, sWho, bPro, bNeg, bTpsCo, bInt, bFem) {
        if (!this.dConj.get(sTemps).get(sWho)) {
            return "";
        }
        let sConj;
        if (!bTpsCo && bInt && sWho == ":1s" && this.dConj.get(sTemps).gl_get(":1ś", false)) {
            sWho = ":1ś";
        }
        if (bTpsCo) {
            sConj = (!bPro) ? conj._getConjWithTags(this.sVerbAux, this._tTagsAux, sTemps, sWho) : conj.getConj("être", sTemps, sWho);
        } else {
            sConj = this.dConj.get(sTemps).get(sWho);
        }
        if (sConj === "") {
            return "";
        }
        let bEli = conj._zStartVoy.test(sConj);
        if (bPro) {
            if (!this.bProWithEn) {
                sConj = (bEli) ? conj._dProObjEl.get(sWho) + sConj : conj._dProObj.get(sWho) + sConj;
            } else {
                sConj = conj._dProObjEl.get(sWho) + "en " + sConj;
            }
        }
        if (bNeg) {
            sConj = (bEli && !bPro) ? "n’" + sConj : "ne " + sConj;
        }
        if (bInt) {
            if (sWho == ":3s" && !conj._zNeedTeuph.test(sConj)) {
                sConj += "-t";
            }
            sConj += "-" + this._getPronom(sWho, bFem);
        } else {
            if (sWho == ":1s" && bEli && !bNeg && !bPro) {
                sConj = "j’" + sConj;
            } else {
                sConj = this._getPronom(sWho, bFem) + " " + sConj;
            }
        }
        if (bNeg) {
            sConj += " pas";
        }
        if (bTpsCo) {
            sConj += " " + this._seekPpas(bPro, bFem, sWho.endsWith("p") || this._sRawInfo[5] == "r");
        }
        if (bInt) {
            sConj += " … ?";
        }
        return sConj;
    }

    _getPronom (sWho, bFem) {
        if (sWho == ":3s") {
            if (this._sRawInfo[5] == "r") {
                return "on";
            } else if (bFem) {
                return "elle";
            }
        } else if (sWho == ":3p" && bFem) {
            return "elles";
        }
        return conj._dProSuj.get(sWho);
    }

    imperatif (sWho, bPro, bNeg, bTpsCo, bFem) {
        if (!this.dConj.get(":E").get(sWho)) {
            return "";
        }
        let sImpe;
        if (bTpsCo) {
            sImpe = (!bPro) ? conj._getConjWithTags(this.sVerbAux, this._tTagsAux, ":E", sWho) : conj.getConj("être", ":E", sWho);
        } else {
            sImpe = this.dConj.get(":E").get(sWho);
        }
        if (sImpe === "") {
            return "";
        }
        let bEli = conj._zStartVoy.test(sImpe);
        if (bNeg) {
            if (bPro) {
                if (!this.bProWithEn) {
                    sImpe = (bEli && sWho == ":2s") ? "ne t’" + sImpe + " pas" : conj._dImpeProNeg.get(sWho) + sImpe + " pas";
                } else {
                    sImpe = conj._dImpeProNegEn.get(sWho) + sImpe + " pas";
                }
            } else {
                sImpe = (bEli) ? "n’" + sImpe + " pas" : "ne " + sImpe + " pas";
            }
        } else if (bPro) {
            sImpe = (this.bProWithEn) ? sImpe + conj._dImpeProEn.get(sWho) : sImpe + conj._dImpePro.get(sWho);
        }
        if (bTpsCo) {
            return sImpe + " " + this._seekPpas(bPro, bFem, sWho.endsWith("p") || this._sRawInfo[5] == "r");
        }
        return sImpe;
    }

    _seekPpas (bPro, bFem, bPlur) {
        if (!bPro && this.sVerbAux == "avoir") {
            return this.dConj.get(":Q").get(":Q1");
        }
        if (!bFem) {
            return (bPlur && this.dConj.get(":Q").get(":Q2")) ? this.dConj.get(":Q").get(":Q2") : this.dConj.get(":Q").get(":Q1");
        }
        if (!bPlur) {
            return (this.dConj.get(":Q").get(":Q3")) ? this.dConj.get(":Q").get(":Q3") : this.dConj.get(":Q").get(":Q1");
        }
        return (this.dConj.get(":Q").get(":Q4")) ? this.dConj.get(":Q").get(":Q4") : this.dConj.get(":Q").get(":Q1");
    }
}


// Initialization
if (!conj.bInit && typeof(browser) !== 'undefined') {
    // WebExtension Standard (but not in Worker)
    conj.init(helpers.loadFile(browser.extension.getURL("grammalecte/fr/conj_data.json")));
} else if (!conj.bInit && typeof(chrome) !== 'undefined') {
    // WebExtension Chrome (but not in Worker)
    conj.init(helpers.loadFile(chrome.extension.getURL("grammalecte/fr/conj_data.json")));
} else if (!conj.bInit && typeof(require) !== 'undefined') {
    // Add-on SDK and Thunderbird
    conj.init(helpers.loadFile("resource://grammalecte/fr/conj_data.json"));
} else if (!conj.bInit && typeof(self) !== 'undefined' && typeof(self.port) !== 'undefined' && typeof(self.port.on) !== "undefined") {
    // used within Firefox content script (conjugation panel).
    // can’t load JSON from here, so we do it in ui.js and send it here.
    self.port.on("provideConjData", function (sJSONData) {
        conj.init(sJSONData);
    });    
} else if (conj.bInit){
    console.log("Module conj déjà initialisé");
} else {
    //console.log("Module conj non initialisé");
}


if (typeof(exports) !== 'undefined') {
    exports._lVtyp = conj._lVtyp;
    exports._lTags = conj._lTags;
    exports._dPatternConj = conj._dPatternConj;
    exports._dVerb = conj._dVerb;
    exports.init = conj.init;
    exports._zStartVoy = conj._zStartVoy;
    exports._zNeedTeuph = conj._zNeedTeuph;
    exports._dProSuj = conj._dProSuj;
    exports._dProObj = conj._dProObj;
    exports._dProObjEl = conj._dProObjEl;
    exports._dImpePro = conj._dImpePro;
    exports._dImpeProNeg = conj._dImpeProNeg;
    exports._dImpeProEn = conj._dImpeProEn;
    exports._dImpeProNegEn = conj._dImpeProNegEn;
    exports._dGroup = conj._dGroup;
    exports._dTenseIdx = conj._dTenseIdx;
    exports.isVerb = conj.isVerb;
    exports.getConj = conj.getConj;
    exports.hasConj = conj.hasConj;
    exports.getVtyp = conj.getVtyp;
    exports.getSimil = conj.getSimil;
    exports._getTags = conj._getTags;
    exports._getConjWithTags = conj._getConjWithTags;
    exports._hasConjWithTags = conj._hasConjWithTags;
    exports._modifyStringWithSuffixCode = conj._modifyStringWithSuffixCode;
    exports.Verb = Verb;
}
