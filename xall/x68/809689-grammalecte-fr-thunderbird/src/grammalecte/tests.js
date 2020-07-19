// JavaScript

/* jshint esversion:6, -W097 */
/* jslint esversion:6 */
/* global require, exports, console */

"use strict";


if(typeof(process) !== 'undefined') {
    var helpers = require("./graphspell/helpers.js");
} else if (typeof(require) !== 'undefined') {
    var helpers = require("resource://grammalecte/graphspell/helpers.js");
}


class TestGrammarChecking {

    constructor (gce, spfTests="") {
        this.gce = gce;
        this.spfTests = spfTests;
        this._aRuleTested = new Set();
    }

    * testParse (bDebug=false) {
        const t0 = Date.now();
        let sURL;
        if(typeof(process) !== 'undefined') {
            sURL = (this.spfTests !== "") ? this.spfTests : "./"+this.gce.lang+"/tests_data.json";
        } else {
            sURL = (this.spfTests !== "") ? this.spfTests : "resource://grammalecte/"+this.gce.lang+"/tests_data.json";
        }
        const aData = JSON.parse(helpers.loadFile(sURL)).aData;
        let nInvalid = 0;
        let nTotal = 0;
        let sErrorText;
        let sSugg;
        let sExpectedErrors;
        let sTextToCheck;
        let sFoundErrors;
        let sListErr;
        let sLineNum;
        let i = 1;
        let sUntestedRules = "";
        let bShowUntested = false;
        let zOption = /^__([a-zA-Z0-9]+)__ /;
        let sOption;
        let m;
        yield "Tests [" + this.gce.lang + "]: " + aData.length.toString();
        try {
            for (let sLine of aData) {
                sLineNum = sLine.slice(0,10).trim();
                sLine = sLine.slice(10).trim();
                if (sLine.length > 0 && !sLine.startsWith("#")) {
                    sOption = false;
                    m = zOption.exec(sLine);
                    if (m) {
                        sLine = sLine.slice(sLine.indexOf(" ")+1);
                        sOption = m[1];
                    }
                    if (sLine.includes("->>")) {
                        [sErrorText, sSugg] = sLine.split("->>");
                        sErrorText = sErrorText.trim();
                        sSugg = sSugg.trim();
                    } else {
                        sErrorText = sLine.trim();
                    }
                    sExpectedErrors = this._getExpectedErrors(sErrorText);
                    sTextToCheck = sErrorText.replace(/\{\{/g, "").replace(/\}\}/g, "");
                    [sFoundErrors, sListErr] = this._getFoundErrors(sTextToCheck, bDebug, sOption);
                    if (sExpectedErrors !== sFoundErrors) {
                        yield "\n" + i.toString() +
                              "\n# Line num: " + sLineNum +
                              "\n> to check: " + sTextToCheck +
                              "\n  expected: " + sExpectedErrors +
                              "\n  found:    " + sFoundErrors +
                              "\n  errors:   \n" + sListErr;
                        nInvalid = nInvalid + 1;
                    }
                    nTotal = nTotal + 1;
                }
                i = i + 1;
                if (i % 1000 === 0) {
                    yield i.toString();
                }
            }
            bShowUntested = true;
        }
        catch (e) {
            console.error(e);
        }

        if (bShowUntested) {
            i = 0;
            for (let [sOpt, sLineId, sRuleId] of this.gce.listRules()) {
                if (sOpt !== "@@@@" && !this._aRuleTested.has(sLineId) && !/^[0-9]+[sp]$|^[pd]_/.test(sRuleId)) {
                    sUntestedRules += sLineId + "/" + sRuleId + ", ";
                    i += 1;
                }
            }
            if (i > 0) {
                yield sUntestedRules + "\n[" + i.toString() + " untested rules]";
            }
        }

        const t1 = Date.now();
        yield "Tests parse finished in " + ((t1-t0)/1000).toString()
            + " s\nTotal errors: " + nInvalid.toString() + " / " + nTotal.toString();
    }

    _getExpectedErrors (sLine) {
        try {
            let sRes = " ".repeat(sLine.length);
            let z = /\{\{.+?\}\}/g;
            let m;
            let i = 0;
            while ((m = z.exec(sLine)) !== null) {
                let nStart = m.index - (4 * i);
                let nEnd = m.index + m[0].length - (4 * (i+1));
                sRes = sRes.slice(0, nStart) + "~".repeat(nEnd - nStart) + sRes.slice(nEnd, -4);
                i = i + 1;
                // Warning! JS sucks: infinite loop if writing directly /\{\{.+?\}\}/g.exec(sLine)
                // lines below to remove when I know why.
                if (i > 10) {
                    console.log("\ninfinite loop?\nline:"+sLine+"\nm: "+ m.toString());
                    break;
                }
            }
            return sRes;
        }
        catch (e) {
            console.error(e);
        }
        return " ".repeat(sLine.length);
    }

    _getFoundErrors (sLine, bDebug, sOption) {
        try {
            let aErrs = [];
            if (sOption) {
                this.gce.setOption(sOption, true);
                aErrs = this.gce.parse(sLine, "FR", bDebug);
                this.gce.setOption(sOption, false);
            } else {
                aErrs = this.gce.parse(sLine, "FR", bDebug);
            }
            let sRes = " ".repeat(sLine.length);
            let sListErr = "";
            for (let dErr of aErrs) {
                sRes = sRes.slice(0, dErr["nStart"]) + "~".repeat(dErr["nEnd"] - dErr["nStart"]) + sRes.slice(dErr["nEnd"]);
                sListErr += "    * {" + dErr['sLineId'] + " / " + dErr['sRuleId'] + "}  at  " + dErr['nStart'] + ":" + dErr['nEnd'] + "\n";
                this._aRuleTested.add(dErr["sLineId"]);
            }
            return [sRes, sListErr];
        }
        catch (e) {
            console.error(e);
        }
        return [" ".repeat(sLine.length), ""];
    }

}


if (typeof(exports) !== 'undefined') {
    exports.TestGrammarChecking = TestGrammarChecking;
}
