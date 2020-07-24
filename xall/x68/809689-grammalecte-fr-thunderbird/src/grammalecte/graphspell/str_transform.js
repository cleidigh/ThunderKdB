// STRING TRANSFORMATION

/* jshint esversion:6, -W097 */
/* jslint esversion:6 */
/* global exports, console */

"use strict";

if (typeof(process) !== 'undefined') {
    var char_player = require("./char_player.js");
} else if (typeof(require) !== 'undefined') {
    var char_player = require("resource://grammalecte/graphspell/char_player.js");
}


// Note: 48 is the ASCII code for "0"

var str_transform = {

    getNgrams: function (sWord, n=2) {
        let lNgrams = [];
        for (let i=0;  i <= sWord.length - n;  i++) {
            lNgrams.push(sWord.slice(i, i+n));
        }
        return lNgrams;
    },

    longestCommonSubstring: function (string1, string2) {
        // https://en.wikibooks.org/wiki/Algorithm_Implementation/Strings/Longest_common_substring
        // untested

        // init max value
        let longestCommonSubstring = 0;
        // init 2D array with 0
        let table = [],
            len1 = string1.length,
            len2 = string2.length,
            row, col;
        for (row = 0; row <= len1; row++) {
            table[row] = [];
            for (col = 0; col <= len2; col++) {
                table[row][col] = 0;
            }
        }
        // fill table
        let i, j;
        for (i = 0;  i < len1;  i++) {
            for (j = 0;  j < len2;  j++) {
                if (string1[i] === string2[j]) {
                    if (table[i][j] === 0){
                        table[i+1][j+1] = 1;
                    } else {
                        table[i+1][j+1] = table[i][j] + 1;
                    }
                    if (table[i+1][j+1] > longestCommonSubstring) {
                        longestCommonSubstring = table[i+1][j+1];
                    }
                } else {
                    table[i+1][j+1] = 0;
                }
            }
        }
        return longestCommonSubstring;
    },

    distanceDamerauLevenshtein: function (s1, s2) {
        // distance of Damerau-Levenshtein between <s1> and <s2>
        // https://fr.wikipedia.org/wiki/Distance_de_Damerau-Levenshtein
        try {
            let nLen1 = s1.length;
            let nLen2 = s2.length;
            let matrix = [];
            for (let i = 0;  i <= nLen1+1;  i++) {
                matrix[i] = new Array(nLen2 + 2);
            }
            for (let i = 0;  i <= nLen1+1;  i++) {
                matrix[i][0] = i;
            }
            for (let j = 0;  j <= nLen2+1;  j++) {
                matrix[0][j] = j;
            }
            for (let i = 1;  i <= nLen1;  i++) {
                for (let j = 1;  j <= nLen2;  j++) {
                    //let nCost = (s1[i-1] === s2[j-1]) ? 0 : 1;
                    let nCost = char_player.distanceBetweenChars(s1[i-1], s2[j-1]);
                    matrix[i][j] = Math.min(
                        matrix[i-1][j] + 1,         // Deletion
                        matrix[i][j-1] + 1,         // Insertion
                        matrix[i-1][j-1] + nCost    // Substitution
                    );
                    if (i > 1 && j > 1 && s1[i] == s2[j-1] && s1[i-1] == s2[j]) {
                        matrix[i][j] = Math.min(matrix[i][j], matrix[i-2][j-2] + nCost);  // Transposition
                    }
                }
            }
            return Math.floor(matrix[nLen1][nLen2]);
        }
        catch (e) {
            console.error(e);
        }
    },

    showDistance (s1, s2) {
        console.log(`Distance: ${s1} / ${s2} = ${this.distanceDamerauLevenshtein(s1, s2)})`);
    },

    // Suffix only
    defineSuffixCode: function (sFlex, sStem) {
        /*
            Returns a string defining how to get stem from flexion
                "n(sfx)"
            with n: a char with numeric meaning, "0" = 0, "1" = 1, ... ":" = 10, etc. (See ASCII table.) Says how many letters to strip from flexion.
                 sfx [optional]: string to add on flexion
            Examples:
                "0": strips nothing, adds nothing
                "1er": strips 1 letter, adds "er"
                "2": strips 2 letters, adds nothing
        */
        if (sFlex == sStem) {
            return "0";
        }
        let jSfx = 0;
        for (let i = 0;  i < Math.min(sFlex.length, sStem.length);  i++) {
            if (sFlex[i] !== sStem[i]) {
                break;
            }
            jSfx += 1;
        }
        return String.fromCharCode(sFlex.length-jSfx+48) + sStem.slice(jSfx);
    },

    changeWordWithSuffixCode: function (sWord, sSfxCode) {
        if (sSfxCode == "0") {
            return sWord;
        }
        return sSfxCode[0] == '0' ? sWord + sSfxCode.slice(1) : sWord.slice(0, -(sSfxCode.charCodeAt(0)-48)) + sSfxCode.slice(1);
    },

    // Prefix and suffix
    defineAffixCode: function (sFlex, sStem) {
        /*
            UNTESTED!
            Returns a string defining how to get stem from flexion. Examples:
                "0" if stem = flexion
                "stem" if no common substring
                "n(pfx)/m(sfx)"
            with n and m: chars with numeric meaning, "0" = 0, "1" = 1, ... ":" = 10, etc. (See ASCII table.) Says how many letters to strip from flexion.
                pfx [optional]: string to add before the flexion
                sfx [optional]: string to add after the flexion
        */
        if (sFlex == sStem) {
            return "0";
        }
        // is stem a substring of flexion?
        let n = sFlex.indexOf(sStem);
        if (n >= 0) {
            return String.fromCharCode(n+48) + "/" + String.fromCharCode(sFlex.length-(sStem.length+n)+48);
        }
        // no, so we are looking for common substring
        let sSubs = this.longestCommonSubstring(sFlex, sStem);
        if (sSubs.length > 1) {
            let iPos = sStem.indexOf(sSubs);
            let sPfx = sStem.slice(0, iPos);
            let sSfx = sStem.slice(iPos+sSubs.length);
            let n = sFlex.indexOf(sSubs);
            let m = sFlex.length - (sSubs.length+n);
            return String.fromCharCode(n+48) + sPfx + "/" + String.fromCharCode(m+48) + sSfx;
        }
        return sStem;
    },

    changeWordWithAffixCode: function (sWord, sAffCode) {
        if (sAffCode == "0") {
            return sWord;
        }
        if (!sAffCode.includes("/")) {
            return sAffCode;
        }
        let [sPfxCode, sSfxCode] = sAffCode.split('/');
        sWord = sPfxCode.slice(1) + sWord.slice(sPfxCode.charCodeAt(0)-48);
        return sSfxCode[0] == '0' ? sWord + sSfxCode.slice(1) : sWord.slice(0, -(sSfxCode.charCodeAt(0)-48)) + sSfxCode.slice(1);
    }
};


if (typeof(exports) !== 'undefined') {
    exports.longestCommonSubstring = str_transform.longestCommonSubstring;
    exports.distanceDamerauLevenshtein = str_transform.distanceDamerauLevenshtein;
    exports.distanceDamerauLevenshtein2 = str_transform.distanceDamerauLevenshtein2;
    exports.showDistance = str_transform.showDistance;
    exports.changeWordWithSuffixCode = str_transform.changeWordWithSuffixCode;
    exports.changeWordWithAffixCode = str_transform.changeWordWithAffixCode;
    exports.defineAffixCode = str_transform.defineAffixCode;
    exports.defineSuffixCode = str_transform.defineSuffixCode;
}
