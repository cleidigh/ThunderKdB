// Grammalecte - Lexicographe
// License: MPL 2
/*jslint esversion: 6*/
/*global require,exports*/

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



const _dTag = new Map([
    [':N', [" nom,", "Nom"]],
    [':A', [" adjectif,", "Adjectif"]],
    [':M1', [" prénom,", "Prénom"]],
    [':M2', [" patronyme,", "Patronyme, matronyme, nom de famille…"]],
    [':MP', [" nom propre,", "Nom propre"]],
    [':W', [" adverbe,", "Adverbe"]],
    [':J', [" interjection,", "Interjection"]],
    [':B', [" nombre,", "Nombre"]],
    [':T', [" titre,", "Titre de civilité"]],

    [':e', [" épicène", "épicène"]],
    [':m', [" masculin", "masculin"]],
    [':f', [" féminin", "féminin"]],
    [':s', [" singulier", "singulier"]],
    [':p', [" pluriel", "pluriel"]],
    [':i', [" invariable", "invariable"]],

    [':V1', [" verbe (1ᵉʳ gr.),", "Verbe du 1ᵉʳ groupe"]],
    [':V2', [" verbe (2ᵉ gr.),", "Verbe du 2ᵉ groupe"]],
    [':V3', [" verbe (3ᵉ gr.),", "Verbe du 3ᵉ groupe"]],
    [':V0e', [" verbe,", "Verbe auxiliaire être"]],
    [':V0a', [" verbe,", "Verbe auxiliaire avoir"]],

    [':Y', [" infinitif,", "Infinitif"]],
    [':P', [" participe présent,", "Participe présent"]],
    [':Q', [" participe passé,", "Participe passé"]],

    [':Ip', [" présent,", "Indicatif présent"]],
    [':Iq', [" imparfait,", "Indicatif imparfait"]],
    [':Is', [" passé simple,", "Indicatif passé simple"]],
    [':If', [" futur,", "Indicatif futur"]],
    [':K', [" conditionnel présent,", "Conditionnel présent"]],
    [':Sp', [" subjonctif présent,", "Subjonctif présent"]],
    [':Sq', [" subjonctif imparfait,", "Subjonctif imparfait"]],
    [':E', [" impératif,", "Impératif"]],

    [':1s', [" 1ʳᵉ p. sg.,", "Verbe à la 1ʳᵉ personne du singulier"]],
    [':1ŝ', [" présent interr. 1ʳᵉ p. sg.,", "Verbe à la 1ʳᵉ personne du singulier (présent interrogatif)"]],
    [':1ś', [" présent interr. 1ʳᵉ p. sg.,", "Verbe à la 1ʳᵉ personne du singulier (présent interrogatif)"]],
    [':2s', [" 2ᵉ p. sg.,", "Verbe à la 2ᵉ personne du singulier"]],
    [':3s', [" 3ᵉ p. sg.,", "Verbe à la 3ᵉ personne du singulier"]],
    [':1p', [" 1ʳᵉ p. pl.,", "Verbe à la 1ʳᵉ personne du pluriel"]],
    [':2p', [" 2ᵉ p. pl.,", "Verbe à la 2ᵉ personne du pluriel"]],
    [':3p', [" 3ᵉ p. pl.,", "Verbe à la 3ᵉ personne du pluriel"]],
    [':3p!', [" 3ᵉ p. pl.,", "Verbe à la 3ᵉ personne du pluriel (prononciation distinctive)"]],

    [':G', ["[mot grammatical]", "Mot grammatical"]],
    [':X', [" adverbe de négation,", "Adverbe de négation"]],
    [':U', [" adverbe interrogatif,", "Adverbe interrogatif"]],
    [':R', [" préposition,", "Préposition"]],
    [':Rv', [" préposition verbale,", "Préposition verbale"]],
    [':D', [" déterminant,", "Déterminant"]],
    [':Dd', [" déterminant démonstratif,", "Déterminant démonstratif"]],
    [':De', [" déterminant exclamatif,", "Déterminant exclamatif"]],
    [':Dp', [" déterminant possessif,", "Déterminant possessif"]],
    [':Di', [" déterminant indéfini,", "Déterminant indéfini"]],
    [':Dn', [" déterminant négatif,", "Déterminant négatif"]],
    [':Od', [" pronom démonstratif,", "Pronom démonstratif"]],
    [':Oi', [" pronom indéfini,", "Pronom indéfini"]],
    [':On', [" pronom indéfini négatif,", "Pronom indéfini négatif"]],
    [':Ot', [" pronom interrogatif,", "Pronom interrogatif"]],
    [':Or', [" pronom relatif,", "Pronom relatif"]],
    [':Ow', [" pronom adverbial,", "Pronom adverbial"]],
    [':Os', [" pronom personnel sujet,", "Pronom personnel sujet"]],
    [':Oo', [" pronom personnel objet,", "Pronom personnel objet"]],
    [':O1', [" 1ʳᵉ pers.,", "Pronom : 1ʳᵉ personne"]],
    [':O2', [" 2ᵉ pers.,", "Pronom : 2ᵉ personne"]],
    [':O3', [" 3ᵉ pers.,", "Pronom : 3ᵉ personne"]],
    [':C', [" conjonction,", "Conjonction"]],
    [':Ĉ', [" conjonction (él.),", "Conjonction (élément)"]],
    [':Cc', [" conjonction de coordination,", "Conjonction de coordination"]],
    [':Cs', [" conjonction de subordination,", "Conjonction de subordination"]],
    [':Ĉs', [" conjonction de subordination (él.),", "Conjonction de subordination (élément)"]],

    [':Ñ', [" locution nominale (él.),", "Locution nominale (élément)"]],
    [':Â', [" locution adjectivale (él.),", "Locution adjectivale (élément)"]],
    [':Ṽ', [" locution verbale (él.),", "Locution verbale (élément)"]],
    [':Ŵ', [" locution adverbiale (él.),", "Locution adverbiale (élément)"]],
    [':Ŕ', [" locution prépositive (él.),", "Locution prépositive (élément)"]],
    [':Ĵ', [" locution interjective (él.),", "Locution interjective (élément)"]],

    [':Zp', [" préfixe,", "Préfixe"]],
    [':Zs', [" suffixe,", "Suffixe"]],

    [';S', [" : symbole (unité de mesure)", "Symbole (unité de mesure)"]],

    ['/*', ["", "sous-dictionnaire <Commun>"]],
    ['/C', [" <classique>", "sous-dictionnaire <Classique>"]],
    ['/M', ["", "sous-dictionnaire <Moderne>"]],
    ['/R', [" <réforme>", "sous-dictionnaire <Réforme 1990>"]],
    ['/A', ["", "sous-dictionnaire <Annexe>"]],
    ['/X', ["", "sous-dictionnaire <Contributeurs>"]]
]);


const _dLocTag = new Map([
    [':L', "locution"],
    [':LN', "locution nominale"],
    [':LA', "locution adjectivale"],
    [':LV', "locution verbale"],
    [':LW', "locution adverbiale"],
    [':LR', "locution prépositive"],
    [':LRv', "locution prépositive verbale"],
    [':LO', "locution pronominale"],
    [':LC', "locution conjonctive"],
    [':LJ', "locution interjective"],

    [':B', " cardinale"],
    [':e', " épicène"],
    [':m', " masculine"],
    [':f', " féminine"],
    [':s', " singulière"],
    [':p', " plurielle"],
    [':i', " invariable"],
    ['/L', " (latin)"]
]);

const _dLocVerb = new Map([
    ['i', " intransitive"],
    ['n', " transitive indirecte"],
    ['t', " transitive directe"],
    ['p', " pronominale"],
    ['m', " impersonnelle"],
]);

const _dElidedPrefix = new Map([
    ['d', "(de), déterminant épicène invariable"],
    ['l', "(le/la), déterminant masculin/féminin singulier"],
    ['j', "(je), pronom personnel sujet, 1ʳᵉ pers., épicène singulier"],
    ['m', "(me), pronom personnel objet, 1ʳᵉ pers., épicène singulier"],
    ['t', "(te), pronom personnel objet, 2ᵉ pers., épicène singulier"],
    ['s', "(se), pronom personnel objet, 3ᵉ pers., épicène singulier/pluriel"],
    ['n', "(ne), adverbe de négation"],
    ['c', "(ce), pronom démonstratif, masculin singulier/pluriel"],
    ['ç', "(ça), pronom démonstratif, masculin singulier"],
    ['qu', "(que), conjonction de subordination"],
    ['lorsqu', "(lorsque), conjonction de subordination"],
    ['quoiqu', "(quoique), conjonction de subordination"],
    ['jusqu', "(jusque), préposition"]
]);

const _dPronoms = new Map([
    ['je', " pronom personnel sujet, 1ʳᵉ pers. sing."],
    ['tu', " pronom personnel sujet, 2ᵉ pers. sing."],
    ['il', " pronom personnel sujet, 3ᵉ pers. masc. sing."],
    ['on', " pronom personnel sujet, 3ᵉ pers. sing. ou plur."],
    ['elle', " pronom personnel sujet, 3ᵉ pers. fém. sing."],
    ['nous', " pronom personnel sujet/objet, 1ʳᵉ pers. plur."],
    ['vous', " pronom personnel sujet/objet, 2ᵉ pers. plur."],
    ['ils', " pronom personnel sujet, 3ᵉ pers. masc. plur."],
    ['elles', " pronom personnel sujet, 3ᵉ pers. masc. plur."],

    ["là", " particule démonstrative"],
    ["ci", " particule démonstrative"],

    ['le', " COD, masc. sing."],
    ['la', " COD, fém. sing."],
    ['les', " COD, plur."],

    ['moi', " COI (à moi), sing."],
    ['toi', " COI (à toi), sing."],
    ['lui', " COI (à lui ou à elle), sing."],
    ['nous2', " COI (à nous), plur."],
    ['vous2', " COI (à vous), plur."],
    ['leur', " COI (à eux ou à elles), plur."],

    ['y', " pronom adverbial"],
    ["m'y", " (me) pronom personnel objet + (y) pronom adverbial"],
    ["t'y", " (te) pronom personnel objet + (y) pronom adverbial"],
    ["s'y", " (se) pronom personnel objet + (y) pronom adverbial"],

    ['en', " pronom adverbial"],
    ["m'en", " (me) pronom personnel objet + (en) pronom adverbial"],
    ["t'en", " (te) pronom personnel objet + (en) pronom adverbial"],
    ["s'en", " (se) pronom personnel objet + (en) pronom adverbial"]
]);

const _dSeparator = new Map([
    ['.', "point"],
    ['·', "point médian"],
    ['…', "points de suspension"],
    [':', "deux-points"],
    [';', "point-virgule"],
    [',', "virgule"],
    ['?', "point d’interrogation"],
    ['!', "point d’exclamation"],
    ['(', "parenthèse ouvrante"],
    [')', "parenthèse fermante"],
    ['[', "crochet ouvrante"],
    [']', "crochet fermante"],
    ['{', "accolade ouvrante"],
    ['}', "accolade fermante"],
    ['-', "tiret"],
    ['—', "tiret cadratin"],
    ['–', "tiret demi-cadratin"],
    ['«', "guillemet ouvrant (chevrons)"],
    ['»', "guillemet fermant (chevrons)"],
    ['“', "guillemet ouvrant double"],
    ['”', "guillemet fermant double"],
    ['‘', "guillemet ouvrant"],
    ['’', "guillemet fermant"],
    ['/', "signe de la division"],
    ['+', "signe de l’addition"],
    ['*', "signe de la multiplication"],
    ['=', "signe de l’égalité"],
    ['<', "inférieur à"],
    ['>', "supérieur à"],
]);


class Lexicographe {

    constructor (oSpellChecker, oTokenizer, oLocGraph) {
        this.oSpellChecker = oSpellChecker;
        this.oTokenizer = oTokenizer;
        this.oLocGraph = JSON.parse(oLocGraph);

        this._zPartDemForm = new RegExp("([a-zA-Zà-ö0-9À-Öø-ÿØ-ßĀ-ʯ]+)-(là|ci)$", "i");
        this._aPartDemExceptList = new Set(["celui", "celle", "ceux", "celles", "de", "jusque", "par", "marie-couche-toi"]);
        this._zInterroVerb = new RegExp("([a-zA-Zà-ö0-9À-Öø-ÿØ-ßĀ-ʯ]+)-(t-(?:il|elle|on)|je|tu|ils?|elles?|on|[nv]ous)$", "i");
        this._zImperatifVerb = new RegExp("([a-zA-Zà-ö0-9À-Öø-ÿØ-ßĀ-ʯ]+)-((?:les?|la)-(?:moi|toi|lui|[nv]ous|leur)|y|en|[mts][’'](?:y|en)|les?|la|[mt]oi|leur|lui)$", "i");
        this._zTag = new RegExp("[:;/][a-zA-Z0-9ÑÂĴĈŔÔṼŴ!][^:;/]*", "g");
    }

    getInfoForToken (oToken) {
        // Token: .sType, .sValue, .nStart, .nEnd
        // return a object {sType, sValue, aLabel}
        let m = null;
        try {
            switch (oToken.sType) {
                case 'SEPARATOR':
                    return {
                        sType: oToken.sType,
                        sValue: oToken.sValue,
                        aLabel: [_dSeparator.gl_get(oToken.sValue, "caractère indéterminé")]
                    };
                    break;
                case 'NUM':
                    return {
                        sType: oToken.sType,
                        sValue: oToken.sValue,
                        aLabel: ["nombre"]
                    };
                    break;
                case 'LINK':
                    return {
                        sType: oToken.sType,
                        sValue: oToken.sValue.slice(0, 40) + "…",
                        aLabel: ["hyperlien"]
                    };
                    break;
                case 'ELPFX':
                    let sTemp = oToken.sValue.replace("’", "").replace("'", "").replace("`", "").toLowerCase();
                    return {
                        sType: oToken.sType,
                        sValue: oToken.sValue,
                        aLabel: [_dElidedPrefix.gl_get(sTemp, "préfixe élidé inconnu")]
                    };
                    break;
                case 'FOLDERUNIX':
                    return {
                        sType: oToken.sType,
                        sValue: oToken.sValue.slice(0, 40) + "…",
                        aLabel: ["dossier UNIX (et dérivés)"]
                    };
                    break;
                case 'FOLDERWIN':
                    return {
                        sType: oToken.sType,
                        sValue: oToken.sValue.slice(0, 40) + "…",
                        aLabel: ["dossier Windows"]
                    };
                    break;
                case 'ACRONYM':
                    return {
                        sType: oToken.sType,
                        sValue: oToken.sValue,
                        aLabel: ["Sigle ou acronyme"]
                    };
                    break;
                case 'WORD':
                    if (oToken.sValue.gl_count("-") > 4) {
                        return {
                            sType: "COMPLEX",
                            sValue: oToken.sValue,
                            aLabel: ["élément complexe indéterminé"]
                        };
                    } else if (m = this._zPartDemForm.exec(oToken.sValue)) {
                        // mots avec particules démonstratives
                        if (this._aPartDemExceptList.has(m[1].toLowerCase())) {
                            return {
                                sType: "WORD",
                                sValue: oToken.sValue,
                                aLabel: this._getMorph(oToken.sValue)
                            };
                        }
                        return {
                            sType: oToken.sType,
                            sValue: oToken.sValue,
                            aLabel: ["mot avec particule démonstrative"],
                            aSubElem: [
                                { sType: oToken.sType, sValue: m[1],       aLabel: this._getMorph(m[1]) },
                                { sType: oToken.sType, sValue: "-" + m[2], aLabel: [this._formatSuffix(m[2].toLowerCase())] }
                            ]
                        };
                    } else if (m = this._zImperatifVerb.exec(oToken.sValue)) {
                        // formes interrogatives
                        return {
                            sType: oToken.sType,
                            sValue: oToken.sValue,
                            aLabel: ["forme verbale impérative"],
                            aSubElem: [
                                { sType: oToken.sType, sValue: m[1],       aLabel: this._getMorph(m[1]) },
                                { sType: oToken.sType, sValue: "-" + m[2], aLabel: [this._formatSuffix(m[2].toLowerCase())] }
                            ]
                        };
                    } else if (m = this._zInterroVerb.exec(oToken.sValue)) {
                        // formes interrogatives
                        return {
                            sType: oToken.sType,
                            sValue: oToken.sValue,
                            aLabel: ["forme verbale interrogative"],
                            aSubElem: [
                                { sType: oToken.sType, sValue: m[1],       aLabel: this._getMorph(m[1]) },
                                { sType: oToken.sType, sValue: "-" + m[2], aLabel: [this._formatSuffix(m[2].toLowerCase())] }
                            ]
                        };
                    } else if (this.oSpellChecker.isValidToken(oToken.sValue)) {
                        return {
                            sType: oToken.sType,
                            sValue: oToken.sValue,
                            aLabel: this._getMorph(oToken.sValue)
                        };
                    } else {
                        return {
                            sType: "UNKNOWN",
                            sValue: oToken.sValue,
                            aLabel: ["mot inconnu du dictionnaire"]
                        };
                    }
                    break;
            }
        } catch (e) {
            console.error(e);
        }
        return null;
    }

    _getMorph (sWord) {
        let aElem = [];
        for (let s of this.oSpellChecker.getMorph(sWord)) {
            if (s.includes(":")) aElem.push(this._formatTags(s));
        }
        if (aElem.length == 0) {
            aElem.push("mot inconnu du dictionnaire");
        }
        return aElem;
    }

    _formatTags (sTags) {
        let sRes = "";
        sTags = sTags.replace(/V([0-3][ea]?)[itpqnmr_eaxz]+/, "V$1");
        let m;
        while ((m = this._zTag.exec(sTags)) !== null) {
            sRes += _dTag.get(m[0])[0];
        }
        if (sRes.startsWith(" verbe") && !sRes.includes("infinitif")) {
            sRes += " [" + sTags.slice(1, sTags.indexOf(" ")) + "]";
        }
        if (!sRes) {
            return "#Erreur. Étiquette inconnue : [" + sTags + "]";
        }
        return sRes.gl_trimRight(",");
    }

    _formatTagsLoc (sTags) {
        let sRes = "";
        let m;
        while ((m = this._zTag.exec(sTags)) !== null) {
            if (m[0].startsWith(":LV")) {
                sRes += _dLocTag.get(":LV");
                for (let c of m[0].slice(3)) {
                    sRes += _dLocVerb.get(c);
                }
            } else {
                sRes += _dLocTag.get(m[0]);
            }
        }
        if (!sRes) {
            return "#Erreur. Étiquette inconnue : [" + sTags + "]";
        }
        return sRes.gl_trimRight(",");
    }

    _formatSuffix (s) {
        if (s.startsWith("t-")) {
            return "“t” euphonique +" + _dPronoms.get(s.slice(2));
        }
        if (!s.includes("-")) {
            return _dPronoms.get(s.replace("’", "'"));
        }
        if (s.endsWith("ous")) {
            s += '2';
        }
        let nPos = s.indexOf("-");
        return _dPronoms.get(s.slice(0, nPos)) + " +" + _dPronoms.get(s.slice(nPos + 1));
    }

    getListOfTokens (sText, bInfo=true) {
        let aElem = [];
        if (sText !== "") {
            for (let oToken of this.oTokenizer.genTokens(sText)) {
                if (bInfo) {
                    let aRes = this.getInfoForToken(oToken);
                    if (aRes) {
                        aElem.push(aRes);
                    }
                } else if (oToken.sType !== "SPACE") {
                    aElem.push(oToken);
                }
            }
        }
        return aElem;
    }

    * generateInfoForTokenList (lToken) {
        for (let oToken of lToken) {
            let aRes = this.getInfoForToken(oToken);
            if (aRes) {
                yield aRes;
            }
        }
    }

    getListOfTokensReduc (sText, bInfo=true) {
        let aTokenList = this.getListOfTokens(sText.replace("'", "’").trim(), false);
        let iKey = 0;
        let aElem = [];
        do {
            let oToken = aTokenList[iKey];
            let sMorphLoc = '';
            let aTokenTempList = [oToken];
            if (oToken.sType == "WORD" || oToken.sType == "ELPFX"){
                let iKeyTree = iKey + 1;
                let oLocNode = this.oLocGraph[oToken.sValue.toLowerCase()];
                while (oLocNode) {
                    let oTokenNext = aTokenList[iKeyTree];
                    iKeyTree++;
                    if (oTokenNext) {
                        oLocNode = oLocNode[oTokenNext.sValue.toLowerCase()];
                    }
                    if (oLocNode && iKeyTree <= aTokenList.length) {
                        sMorphLoc = oLocNode["_:_"];
                        aTokenTempList.push(oTokenNext);
                    } else {
                        break;
                    }
                }
            }

            if (sMorphLoc) {
                let sValue = '';
                for (let oTokenWord of aTokenTempList) {
                    sValue += oTokenWord.sValue+' ';
                }
                let oTokenLocution = {
                    'nStart': aTokenTempList[0].nStart,
                    'nEnd': aTokenTempList[aTokenTempList.length-1].nEnd,
                    'sType': "LOC",
                    'sValue': sValue.replace('’ ','’').trim(),
                    'aSubToken': aTokenTempList
                };
                if (bInfo) {
                    let aSubElem = null;
                    if (sMorphLoc.startsWith("*|")) {
                        // cette suite de tokens n’est une locution que dans certains cas minoritaires
                        oTokenLocution.sType = "LOCP";
                        for (let oElem of this.generateInfoForTokenList(aTokenTempList)) {
                            aElem.push(oElem);
                        }
                        sMorphLoc = sMorphLoc.slice(2);
                    } else {
                        aSubElem = [...this.generateInfoForTokenList(aTokenTempList)];
                    }
                    // cette suite de tokens est la plupart du temps une locution
                    let aFormatedTag = [];
                    for (let sTagLoc of sMorphLoc.split('|') ){
                        aFormatedTag.push(this._formatTagsLoc(sTagLoc));
                    }
                    aElem.push({
                        sType: oTokenLocution.sType,
                        sValue: oTokenLocution.sValue,
                        aLabel: aFormatedTag,
                        aSubElem: aSubElem
                    });
                } else {
                    aElem.push(oTokenLocution);
                }
                iKey = iKey + aTokenTempList.length;
            } else {
                if (bInfo) {
                    let aRes = this.getInfoForToken(oToken);
                    if (aRes) {
                        aElem.push(aRes);
                    }
                } else {
                    aElem.push(oToken);
                }
                iKey++;
            }
        } while (iKey < aTokenList.length);
        return aElem;
    }
}


if (typeof(exports) !== 'undefined') {
    exports.Lexicographe = Lexicographe;
}
