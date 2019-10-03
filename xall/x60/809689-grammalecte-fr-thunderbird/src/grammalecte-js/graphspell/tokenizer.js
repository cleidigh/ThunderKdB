// JavaScript
// Very simple tokenizer
/*jslint esversion: 6*/
/*global require,exports*/

"use strict";


const aTkzPatterns = {
    // All regexps must start with ^.
    "default":
        [
            [/^[   \t]+/, 'SPACE'],
            [/^\/(?:~|bin|boot|dev|etc|home|lib|mnt|opt|root|sbin|tmp|usr|var|Bureau|Documents|Images|Musique|Public|Téléchargements|Vidéos)(?:\/[a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ_.()-]+)*/, 'FOLDERUNIX'],
            [/^[a-zA-Z]:\\(?:Program Files(?: \(x86\)|)|[a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ.()]+)(?:\\[a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ_.()-]+)*/, 'FOLDERWIN'],
            [/^[,.;:!?…«»“”‘’"(){}\[\]/·–—]+/, 'SEPARATOR'],
            [/^[A-Z][.][A-Z][.](?:[A-Z][.])*/, 'ACRONYM'],
            [/^(?:https?:\/\/|www[.]|[a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ_-]+[@.][a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ_-]{2,}[@.])[a-zA-Z0-9][a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ_.\/?&!%=+*"'@$#-]+/, 'LINK'],
            [/^[#@][a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ_-]+/, 'TAG'],
            [/^<[a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ]+.*?>|<\/[a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ]+ *>/, 'HTML'],
            [/^\[\/?[a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ]+\]/, 'PSEUDOHTML'],
            [/^&\w+;(?:\w+;|)/, 'HTMLENTITY'],
            [/^\d\d?h\d\d\b/, 'HOUR'],
            [/^-?\d+(?:[.,]\d+|)/, 'NUM'],
            [/^[a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ]+(?:[’'`-][a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ]+)*/, 'WORD']
        ],
    "fr":
        [
            [/^[   \t]+/, 'SPACE'],
            [/^\/(?:~|bin|boot|dev|etc|home|lib|mnt|opt|root|sbin|tmp|usr|var|Bureau|Documents|Images|Musique|Public|Téléchargements|Vidéos)(?:\/[a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ_.()-]+)*/, 'FOLDERUNIX'],
            [/^[a-zA-Z]:\\(?:Program Files(?: \(x86\)|)|[a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ.()]+)(?:\\[a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ_.()-]+)*/, 'FOLDERWIN'],
            [/^[,.;:!?…«»“”‘’"(){}\[\]/·–—]+/, 'SEPARATOR'],
            [/^[A-Z][.][A-Z][.](?:[A-Z][.])*/, 'ACRONYM'],
            [/^(?:https?:\/\/|www[.]|[a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ_-]+[@.][a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ_-]{2,}[@.])[a-zA-Z0-9][a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ_.\/?&!%=+*"'@$#-]+/, 'LINK'],
            [/^[#@][a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ_-]+/, 'TAG'],
            [/^<[a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ]+.*?>|<\/[a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ]+ *>/, 'HTML'],
            [/^\[\/?[a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ]+\]/, 'PSEUDOHTML'],
            [/^&\w+;(?:\w+;|)/, 'HTMLENTITY'],
            [/^(?:l|d|n|m|t|s|j|c|ç|lorsqu|puisqu|jusqu|quoiqu|qu)['’`]/i, 'ELPFX'],
            [/^\d\d?[hm]\d\d\b/, 'HOUR'],
            [/^\d+(?:er|nd|e|de|ième|ème|eme)s?\b/, 'ORDINAL'],
            [/^-?\d+(?:[.,]\d+|)/, 'NUM'],
            [/^[a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ]+(?:[’'`-][a-zA-Zà-öÀ-Ö0-9ø-ÿØ-ßĀ-ʯﬁ-ﬆ]+)*/, 'WORD']
        ]
};


class Tokenizer {

    constructor (sLang) {
        this.sLang = sLang;
        if (!aTkzPatterns.hasOwnProperty(sLang)) {
            this.sLang = "default";
        }
        this.aRules = aTkzPatterns[this.sLang];
    }

    * genTokens (sText) {
        let m;
        let i = 0;
        while (sText) {
            let nCut = 1;
            for (let [zRegex, sType] of this.aRules) {
                try {
                    if ((m = zRegex.exec(sText)) !== null) {
                        if (sType == 'SEPARATOR') {
                            for (let c of m[0]) {
                                yield { "sType": sType, "sValue": c, "nStart": i, "nEnd": i + m[0].length }
                            }
                        } else {
                            yield { "sType": sType, "sValue": m[0], "nStart": i, "nEnd": i + m[0].length }
                        }
                        nCut = m[0].length;
                        break;
                    }
                }
                catch (e) {
                    console.error(e);
                }
            }
            i += nCut;
            sText = sText.slice(nCut);
        }
    }
}


if (typeof(exports) !== 'undefined') {
    exports.Tokenizer = Tokenizer;
}
