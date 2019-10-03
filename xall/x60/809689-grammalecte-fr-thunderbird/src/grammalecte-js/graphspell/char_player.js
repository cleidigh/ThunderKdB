// list of similar chars
// useful for suggestion mechanism


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



var char_player = {

    _xTransCharsForSpelling: new Map([
        ['ſ', 's'],  ['ﬃ', 'ffi'],  ['ﬄ', 'ffl'],  ['ﬀ', 'ff'],  ['ﬅ', 'ft'],  ['ﬁ', 'fi'],  ['ﬂ', 'fl'],  ['ﬆ', 'st']
    ]),

    spellingNormalization: function (sWord) {
        let sNewWord = "";
        for (let c of sWord) {
            sNewWord += this._xTransCharsForSpelling.gl_get(c, c);
        }
        return sNewWord.normalize("NFC");
    },

    _xTransCharsForSimplification: new Map([
        ['à', 'a'],  ['é', 'e'],  ['î', 'i'],  ['ô', 'o'],  ['û', 'u'],  ['ÿ', 'i'],  ['y', 'i'],
        ['â', 'a'],  ['è', 'e'],  ['ï', 'i'],  ['ö', 'o'],  ['ù', 'u'],  ['ŷ', 'i'],
        ['ä', 'a'],  ['ê', 'e'],  ['í', 'i'],  ['ó', 'o'],  ['ü', 'u'],  ['ý', 'i'],
        ['á', 'a'],  ['ë', 'e'],  ['ì', 'i'],  ['ò', 'o'],  ['ú', 'u'],  ['ỳ', 'i'],
        ['ā', 'a'],  ['ē', 'e'],  ['ī', 'i'],  ['ō', 'o'],  ['ū', 'u'],  ['ȳ', 'i'],
        ['ç', 'c'],  ['ñ', 'n'],  ['k', 'q'],  ['w', 'v'],
        ['œ', 'oe'], ['æ', 'ae'], 
        ['ſ', 's'],  ['ﬃ', 'ffi'],  ['ﬄ', 'ffl'],  ['ﬀ', 'ff'],  ['ﬅ', 'ft'],  ['ﬁ', 'fi'],  ['ﬂ', 'fl'],  ['ﬆ', 'st']
    ]),

    simplifyWord: function (sWord) {
        // word simplication before calculating distance between words
        sWord = sWord.toLowerCase();
        sWord = [...sWord].map(c => this._xTransCharsForSimplification.gl_get(c, c)).join('');
        let sNewWord = "";
        let i = 1;
        for (let c of sWord) {
            if (c == 'e' || c != sWord.slice(i, i+1)) {  // exception for <e> to avoid confusion between crée / créai
                sNewWord += c;
            }
            i++;
        }
        return sNewWord.replace(/eau/g, "o").replace(/au/g, "o").replace(/ai/g, "e").replace(/ei/g, "e").replace(/ph/g, "f");
    },

    aVowel: new Set("aáàâäāeéèêëēiíìîïīoóòôöōuúùûüūyýỳŷÿȳœæAÁÀÂÄĀEÉÈÊËĒIÍÌÎÏĪOÓÒÔÖŌUÚÙÛÜŪYÝỲŶŸȲŒÆ"),
    aConsonant: new Set("bcçdfghjklmnñpqrstvwxzBCÇDFGHJKLMNÑPQRSTVWXZ"),
    aDouble: new Set("bcdfjklmnprstzBCDFJKLMNPRSTZ"),  // letters that may be used twice successively


    // Similar chars

    d1to1: new Map([
        ["1", "liîLIÎ"],
        ["2", "zZ"],
        ["3", "eéèêEÉÈÊ"],
        ["4", "aàâAÀÂ"],
        ["5", "sgSG"],
        ["6", "bdgBDG"],
        ["7", "ltLT"],
        ["8", "bB"],
        ["9", "gbdGBD"],
        ["0", "oôOÔ"],

        ["a", "aAàÀâÂáÁäÄāĀæÆ"],
        ["A", "AaÀàÂâÁáÄäĀāÆæ"],
        ["à", "aAàÀâÂáÁäÄāĀæÆ"],
        ["À", "AaÀàÂâÁáÄäĀāÆæ"],
        ["â", "aAàÀâÂáÁäÄāĀæÆ"],
        ["Â", "AaÀàÂâÁáÄäĀāÆæ"],
        ["á", "aAàÀâÂáÁäÄāĀæÆ"],
        ["Á", "AaÀàÂâÁáÄäĀāÆæ"],
        ["ä", "aAàÀâÂáÁäÄāĀæÆ"],
        ["Ä", "AaÀàÂâÁáÄäĀāÆæ"],

        ["æ", "æÆéÉaA"],
        ["Æ", "ÆæÉéAa"],

        ["b", "bB"],
        ["B", "Bb"],

        ["c", "cCçÇsSkKqQśŚŝŜ"],
        ["C", "CcÇçSsKkQqŚśŜŝ"],
        ["ç", "cCçÇsSkKqQśŚŝŜ"],
        ["Ç", "CcÇçSsKkQqŚśŜŝ"],

        ["d", "dDðÐ"],
        ["D", "DdÐð"],

        ["e", "eEéÉèÈêÊëËēĒœŒ"],
        ["E", "EeÉéÈèÊêËëĒēŒœ"],
        ["é", "eEéÉèÈêÊëËēĒœŒ"],
        ["É", "EeÉéÈèÊêËëĒēŒœ"],
        ["ê", "eEéÉèÈêÊëËēĒœŒ"],
        ["Ê", "EeÉéÈèÊêËëĒēŒœ"],
        ["è", "eEéÉèÈêÊëËēĒœŒ"],
        ["È", "EeÉéÈèÊêËëĒēŒœ"],
        ["ë", "eEéÉèÈêÊëËēĒœŒ"],
        ["Ë", "EeÉéÈèÊêËëĒēŒœ"],

        ["f", "fF"],
        ["F", "Ff"],

        ["g", "gGjJĵĴ"],
        ["G", "GgJjĴĵ"],
        
        ["h", "hH"],
        ["H", "Hh"],

        ["i", "iIîÎïÏyYíÍìÌīĪÿŸ"],
        ["I", "IiÎîÏïYyÍíÌìĪīŸÿ"],
        ["î", "iIîÎïÏyYíÍìÌīĪÿŸ"],
        ["Î", "IiÎîÏïYyÍíÌìĪīŸÿ"],
        ["ï", "iIîÎïÏyYíÍìÌīĪÿŸ"],
        ["Ï", "IiÎîÏïYyÍíÌìĪīŸÿ"],
        ["í", "iIîÎïÏyYíÍìÌīĪÿŸ"],
        ["Í", "IiÎîÏïYyÍíÌìĪīŸÿ"],
        ["ì", "iIîÎïÏyYíÍìÌīĪÿŸ"],
        ["Ì", "IiÎîÏïYyÍíÌìĪīŸÿ"],

        ["j", "jJgGĵĴ"],
        ["J", "JjGgĴĵ"],

        ["k", "kKcCqQ"],
        ["K", "KkCcQq"],

        ["l", "lLłŁ"],
        ["L", "LlŁł"],

        ["m", "mMḿḾ"],
        ["M", "MmḾḿ"],

        ["n", "nNñÑńŃǹǸ"],
        ["N", "NnÑñŃńǸǹ"],

        ["o", "oOôÔóÓòÒöÖōŌœŒ"],
        ["O", "OoÔôÓóÒòÖöŌōŒœ"],
        ["ô", "oOôÔóÓòÒöÖōŌœŒ"],
        ["Ô", "OoÔôÓóÒòÖöŌōŒœ"],
        ["ó", "oOôÔóÓòÒöÖōŌœŒ"],
        ["Ó", "OoÔôÓóÒòÖöŌōŒœ"],
        ["ò", "oOôÔóÓòÒöÖōŌœŒ"],
        ["Ò", "OoÔôÓóÒòÖöŌōŒœ"],
        ["ö", "oOôÔóÓòÒöÖōŌœŒ"],
        ["Ö", "OoÔôÓóÒòÖöŌōŒœ"],

        ["œ", "œŒoOôÔeEéÉèÈêÊëË"],
        ["Œ", "ŒœOoÔôEeÉéÈèÊêËë"],

        ["p", "pPṕṔ"],
        ["P", "PpṔṕ"],

        ["q", "qQcCkK"],
        ["Q", "QqCcKk"],

        ["r", "rRŕŔ"],
        ["R", "RrŔŕ"],

        ["s", "sScCçÇśŚŝŜ"],
        ["S", "SsCcÇçŚśŜŝ"],
        ["ś", "sScCçÇśŚŝŜ"],
        ["Ś", "SsCcÇçŚśŜŝ"],
        ["ŝ", "sScCçÇśŚŝŜ"],
        ["Ŝ", "SsCcÇçŚśŜŝ"],

        ["t", "tT"],
        ["T", "Tt"],

        ["u", "uUûÛùÙüÜúÚūŪ"],
        ["U", "UuÛûÙùÜüÚúŪū"],
        ["û", "uUûÛùÙüÜúÚūŪ"],
        ["Û", "UuÛûÙùÜüÚúŪū"],
        ["ù", "uUûÛùÙüÜúÚūŪ"],
        ["Ù", "UuÛûÙùÜüÚúŪū"],
        ["ü", "uUûÛùÙüÜúÚūŪ"],
        ["Ü", "UuÛûÙùÜüÚúŪū"],
        ["ú", "uUûÛùÙüÜúÚūŪ"],
        ["Ú", "UuÛûÙùÜüÚúŪū"],

        ["v", "vVwW"],
        ["V", "VvWw"],

        ["w", "wWvV"],
        ["W", "WwVv"],

        ["x", "xXcCkK"],
        ["X", "XxCcKk"],

        ["y", "yYiIîÎÿŸŷŶýÝỳỲȳȲ"],
        ["Y", "YyIiÎîŸÿŶŷÝýỲỳȲȳ"],
        ["ÿ", "yYiIîÎÿŸŷŶýÝỳỲȳȲ"],
        ["Ÿ", "YyIiÎîŸÿŶŷÝýỲỳȲȳ"],
        ["ŷ", "yYiIîÎÿŸŷŶýÝỳỲȳȲ"],
        ["Ŷ", "YyIiÎîŸÿŶŷÝýỲỳȲȳ"],
        ["ý", "yYiIîÎÿŸŷŶýÝỳỲȳȲ"],
        ["Ý", "YyIiÎîŸÿŶŷÝýỲỳȲȳ"],
        ["ỳ", "yYiIîÎÿŸŷŶýÝỳỲȳȲ"],
        ["Ỳ", "YyIiÎîŸÿŶŷÝýỲỳȲȳ"],

        ["z", "zZsSẑẐźŹ"],
        ["Z", "ZzSsẐẑŹź"],
    ]),

    d1toX: new Map([
        ["æ", ["ae",]],
        ["Æ", ["AE",]],
        ["b", ["bb",]],
        ["B", ["BB",]],
        ["c", ["cc", "ss", "qu", "ch"]],
        ["C", ["CC", "SS", "QU", "CH"]],
        ["d", ["dd",]],
        ["D", ["DD",]],
        ["é", ["ai", "ei"]],
        ["É", ["AI", "EI"]],
        ["f", ["ff", "ph"]],
        ["F", ["FF", "PH"]],
        ["g", ["gu", "ge", "gg", "gh"]],
        ["G", ["GU", "GE", "GG", "GH"]],
        ["j", ["jj", "dj"]],
        ["J", ["JJ", "DJ"]],
        ["k", ["qu", "ck", "ch", "cu", "kk", "kh"]],
        ["K", ["QU", "CK", "CH", "CU", "KK", "KH"]],
        ["l", ["ll",]],
        ["L", ["LL",]],
        ["m", ["mm", "mn"]],
        ["M", ["MM", "MN"]],
        ["n", ["nn", "nm", "mn"]],
        ["N", ["NN", "NM", "MN"]],
        ["o", ["au", "eau"]],
        ["O", ["AU", "EAU"]],
        ["œ", ["oe", "eu"]],
        ["Œ", ["OE", "EU"]],
        ["p", ["pp", "ph"]],
        ["P", ["PP", "PH"]],
        ["q", ["qu", "ch", "cq", "ck", "kk"]],
        ["Q", ["QU", "CH", "CQ", "CK", "KK"]],
        ["r", ["rr",]],
        ["R", ["RR",]],
        ["s", ["ss", "sh"]],
        ["S", ["SS", "SH"]],
        ["t", ["tt", "th"]],
        ["T", ["TT", "TH"]],
        ["x", ["cc", "ct", "xx"]],
        ["X", ["CC", "CT", "XX"]],
        ["z", ["ss", "zh"]],
        ["Z", ["SS", "ZH"]],
    ]),

    get1toXReplacement: function (cPrev, cCur, cNext) {
        if (this.aConsonant.has(cCur)  &&  (this.aConsonant.has(cPrev)  ||  this.aConsonant.has(cNext))) {
            return [];
        }
        return this.d1toX.gl_get(cCur, []);
    },

    d2toX: new Map([
        ["am", ["an", "en", "em"]],
        ["AM", ["AN", "EN", "EM"]],
        ["an", ["am", "en", "em"]],
        ["AN", ["AM", "EN", "EM"]],
        ["au", ["eau", "o", "ô"]],
        ["AU", ["EAU", "O", "Ô"]],
        ["em", ["an", "am", "en"]],
        ["EM", ["AN", "AM", "EN"]],
        ["en", ["an", "am", "em"]],
        ["EN", ["AN", "AM", "EM"]],
        ["ae", ["æ", "é"]],
        ["AE", ["Æ", "É"]],
        ["ai", ["ei", "é", "è", "ê", "ë"]],
        ["AI", ["EI", "É", "È", "Ê", "Ë"]],
        ["ei", ["ai", "é", "è", "ê", "ë"]],
        ["EI", ["AI", "É", "È", "Ê", "Ë"]],
        ["ch", ["sh", "c", "ss"]],
        ["CH", ["SH", "C", "SS"]],
        ["ct", ["x", "cc"]],
        ["CT", ["X", "CC"]],
        ["oa", ["oi",]],
        ["OA", ["OI",]],
        ["oe", ["œ",]],
        ["OE", ["Œ",]],
        ["oi", ["oa", "oie"]],
        ["OI", ["OA", "OIE"]],
        ["gg", ["gu",]],
        ["GG", ["GU",]],
        ["gu", ["gg",]],
        ["GU", ["GG",]],
        ["ph", ["f",]],
        ["PH", ["F",]],
        ["qu", ["q", "cq", "ck", "c", "k"]],
        ["QU", ["Q", "CQ", "CK", "C", "K"]],
        ["ss", ["c", "ç"]],
        ["SS", ["C", "Ç"]],
        ["un", ["ein",]],
        ["UN", ["EIN",]],
    ]),

    // End of word
    dFinal1: new Map([
        ["a", ["as", "at", "ant", "ah"]],
        ["A", ["AS", "AT", "ANT", "AH"]],
        ["c", ["ch",]],
        ["C", ["CH",]],
        ["e", ["et", "er", "ets", "ée", "ez", "ai", "ais", "ait", "ent", "eh"]],
        ["E", ["ET", "ER", "ETS", "ÉE", "EZ", "AI", "AIS", "AIT", "ENT", "EH"]],
        ["é", ["et", "er", "ets", "ée", "ez", "ai", "ais", "ait"]],
        ["É", ["ET", "ER", "ETS", "ÉE", "EZ", "AI", "AIS", "AIT"]],
        ["è", ["et", "er", "ets", "ée", "ez", "ai", "ais", "ait"]],
        ["È", ["ET", "ER", "ETS", "ÉE", "EZ", "AI", "AIS", "AIT"]],
        ["ê", ["et", "er", "ets", "ée", "ez", "ai", "ais", "ait"]],
        ["Ê", ["ET", "ER", "ETS", "ÉE", "EZ", "AI", "AIS", "AIT"]],
        ["ë", ["et", "er", "ets", "ée", "ez", "ai", "ais", "ait"]],
        ["Ë", ["ET", "ER", "ETS", "ÉE", "EZ", "AI", "AIS", "AIT"]],
        ["g", ["gh",]],
        ["G", ["GH",]],
        ["i", ["is", "it", "ie", "in"]],
        ["I", ["IS", "IT", "IE", "IN"]],
        ["n", ["nt", "nd", "ns", "nh"]],
        ["N", ["NT", "ND", "NS", "NH"]],
        ["o", ["aut", "ot", "os"]],
        ["O", ["AUT", "OT", "OS"]],
        ["ô", ["aut", "ot", "os"]],
        ["Ô", ["AUT", "OT", "OS"]],
        ["ö", ["aut", "ot", "os"]],
        ["Ö", ["AUT", "OT", "OS"]],
        ["p", ["ph",]],
        ["P", ["PH",]],
        ["s", ["sh",]],
        ["S", ["SH",]],
        ["t", ["th",]],
        ["T", ["TH",]],
        ["u", ["ut", "us", "uh"]],
        ["U", ["UT", "US", "UH"]],
    ]),

    dFinal2: new Map([
        ["ai", ["aient", "ais", "et"]],
        ["AI", ["AIENT", "AIS", "ET"]],
        ["an", ["ant", "ent"]],
        ["AN", ["ANT", "ENT"]],
        ["en", ["ent", "ant"]],
        ["EN", ["ENT", "ANT"]],
        ["ei", ["ait", "ais"]],
        ["EI", ["AIT", "AIS"]],
        ["on", ["ons", "ont"]],
        ["ON", ["ONS", "ONT"]],
        ["oi", ["ois", "oit", "oix"]],
        ["OI", ["OIS", "OIT", "OIX"]],
    ]),


    // Préfixes et suffixes
    aPfx1: new Set([
        "anti", "archi", "contre", "hyper", "mé", "méta", "im", "in", "ir", "par", "proto",
        "pseudo", "pré", "re", "ré", "sans", "sous", "supra", "sur", "ultra"
    ]),

    aPfx2: new Set([
        "belgo", "franco", "génito", "gynéco", "médico", "russo"
    ]),


    cut: function (sWord) {
        // returns an arry of strings (prefix, trimed_word, suffix)
        let sPrefix = "";
        let sSuffix = "";
        let m = /^([ldmtsnjcç]|lorsqu|presqu|jusqu|puisqu|quoiqu|quelqu|qu)[’'‘`]([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ-]+)/i.exec(sWord);
        if (m) {
            sPrefix = m[1] + "’";
            sWord = m[2];
        }
        m = /^([a-zA-Zà-öÀ-Ö0-9_ø-ÿØ-ßĀ-ʯﬁ-ﬆ]+)(-(?:t-|)(?:ils?|elles?|on|je|tu|nous|vous|ce)$)/i.exec(sWord);
        if (m) {
            sWord = m[1];
            sSuffix = m[2];
        }
        return [sPrefix, sWord, sSuffix];
    },

    // Other functions
    filterSugg: function (aSugg) {
        return aSugg.filter((sSugg) => { return !sSugg.endsWith("è") && !sSugg.endsWith("È"); });
    }

}


if (typeof(exports) !== 'undefined') {
    exports._xTransCharsForSpelling = char_player._xTransCharsForSpelling;
    exports.spellingNormalization = char_player.spellingNormalization;
    exports._xTransCharsForSimplification = char_player._xTransCharsForSimplification;
    exports.simplifyWord = char_player.simplifyWord;
    exports.aVowel = char_player.aVowel;
    exports.aConsonant = char_player.aConsonant;
    exports.aDouble = char_player.aDouble;
    exports.d1to1 = char_player.d1to1;
    exports.d1toX = char_player.d1toX;
    exports.get1toXReplacement = char_player.get1toXReplacement;
    exports.d2toX = char_player.d2toX;
    exports.dFinal1 = char_player.dFinal1;
    exports.dFinal2 = char_player.dFinal2;
    exports.aPfx1 = char_player.aPfx1;
    exports.aPfx2 = char_player.aPfx2;
    exports.cut = char_player.cut;
    exports.filterSugg = char_player.filterSugg;
}
