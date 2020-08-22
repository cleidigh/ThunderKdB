/*
    WORKER:
    https://developer.mozilla.org/en-US/docs/Web/API/Worker
    https://developer.mozilla.org/en-US/docs/Web/API/DedicatedWorkerGlobalScope


    JavaScript sucks.
    No module available in WebExtension at the moment! :(
    No require, no import/export.

    In Worker, we have importScripts() which imports everything in this scope.

    In order to use the same base of code with XUL-addon for Thunderbird and SDK-addon for Firefox,
    all modules have been “objectified”. And while they are still imported via “require”
    in the previous extensions, they are loaded as background scripts in WebExtension sharing
    the same memory space…

    When JavaScript become a modern language, “deobjectify” the modules…

    ATM, import/export are not available by default:
    — Chrome 60 – behind the Experimental Web Platform flag in chrome:flags.
    — Firefox 54 – behind the dom.moduleScripts.enabled setting in about:config.
    — Edge 15 – behind the Experimental JavaScript Features setting in about:flags.

    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/import
    https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/export
*/

"use strict";


//console.log("[Worker] GC Engine Worker [start]");
//console.log(self);

importScripts("grammalecte/graphspell/helpers.js");
importScripts("grammalecte/graphspell/str_transform.js");
importScripts("grammalecte/graphspell/char_player.js");
importScripts("grammalecte/graphspell/lexgraph_fr.js");
importScripts("grammalecte/graphspell/ibdawg.js");
importScripts("grammalecte/graphspell/spellchecker.js");
importScripts("grammalecte/text.js");
importScripts("grammalecte/graphspell/tokenizer.js");
importScripts("grammalecte/fr/conj.js");
importScripts("grammalecte/fr/mfsp.js");
importScripts("grammalecte/fr/phonet.js");
importScripts("grammalecte/fr/cregex.js");
importScripts("grammalecte/fr/gc_options.js");
importScripts("grammalecte/fr/gc_rules.js");
importScripts("grammalecte/fr/gc_rules_graph.js");
importScripts("grammalecte/fr/gc_engine.js");
importScripts("grammalecte/tests.js");
/*
    Warning.
    Initialization can’t be completed at startup of the worker,
    for we need the path of the extension to load data stored in JSON files.
    This path is retrieved in background.js and passed with the event “init”.
*/


function createResponse (sActionDone, result, oInfo, bEnd, bError=false) {
    return {
        "sActionDone": sActionDone,
        "result": result, // can be of any type
        "oInfo": oInfo,
        "bEnd": bEnd,
        "bError": bError
    };
}

function createErrorResult (e, sDescr="no description") {
    return {
        "sType": "error",
        "sDescription": sDescr,
        "sMessage": e.fileName + "\n" + e.name + "\nline: " + e.lineNumber + "\n" + e.message
    };
}

function showData (e) {
    for (let sParam in e) {
        console.log(sParam);
        console.log(e[sParam]);
    }
}


/*
    Message Event Object
    https://developer.mozilla.org/en-US/docs/Web/API/MessageEvent
*/
onmessage = function (e) {
    let {sCommand, oParam, oInfo} = e.data;
    switch (sCommand) {
        case "init":
            init(oParam.sExtensionPath, oParam.dOptions, oParam.sContext, oInfo);
            break;
        case "parse":
            parse(oParam.sText, oParam.sCountry, oParam.bDebug, oParam.bContext, oInfo);
            break;
        case "parseAndSpellcheck":
            parseAndSpellcheck(oParam.sText, oParam.sCountry, oParam.bDebug, oParam.bContext, oInfo);
            break;
        case "parseAndSpellcheck1":
            parseAndSpellcheck1(oParam.sText, oParam.sCountry, oParam.bDebug, oParam.bContext, oInfo);
            break;
        case "parseFull":
            parseFull(oParam.sText, oParam.sCountry, oParam.bDebug, oParam.bContext, oInfo);
            break;
        case "getListOfTokens":
            getListOfTokens(oParam.sText, oInfo);
            break;
        case "getOptions":
            getOptions(oInfo);
            break;
        case "getDefaultOptions":
            getDefaultOptions(oInfo);
            break;
        case "setOptions":
            setOptions(oParam.sOptions, oInfo);
            break;
        case "setOption":
            setOption(oParam.sOptName, oParam.bValue, oInfo);
            break;
        case "resetOptions":
            resetOptions(oInfo);
            break;
        case "textToTest":
            textToTest(oParam.sText, oParam.sCountry, oParam.bDebug, oParam.bContext, oInfo);
            break;
        case "fullTests":
            fullTests(oInfo);
            break;
        case "setDictionary":
            setDictionary(oParam.sDictionary, oParam.oDict, oInfo);
            break;
        case "setDictionaryOnOff":
            setDictionaryOnOff(oParam.sDictionary, oParam.bActivate, oInfo);
            break;
        case "getSpellSuggestions":
            getSpellSuggestions(oParam.sWord, oInfo);
            break;
        case "getVerb":
            getVerb(oParam.sVerb, oParam.bPro, oParam.bNeg, oParam.bTpsCo, oParam.bInt, oParam.bFem, oInfo);
            break;
        default:
            console.log("[Worker] Unknown command: " + sCommand);
            showData(e.data);
    }
}



let bInitDone = false;

let oSpellChecker = null;
let oTokenizer = null;
let oTest = null;
let oLocution = null;


/*
    Technical note:
    This worker don’t work as a PromiseWorker (which returns a promise),  so when we send request
    to this worker, we can’t wait the return of the answer just after the request made.
    The answer is received by the background in another function (onmessage).
    That’s why the full text to analyze is send in one block, but analyse is returned paragraph
    by paragraph.
*/

function init (sExtensionPath, dOptions=null, sContext="JavaScript", oInfo={}) {
    try {
        if (!bInitDone) {
            //console.log("[Worker] Loading… Extension path: " + sExtensionPath);
            conj.init(helpers.loadFile(sExtensionPath + "/grammalecte/fr/conj_data.json"));
            phonet.init(helpers.loadFile(sExtensionPath + "/grammalecte/fr/phonet_data.json"));
            mfsp.init(helpers.loadFile(sExtensionPath + "/grammalecte/fr/mfsp_data.json"));
            //console.log("[Worker] Modules have been initialized…");
            gc_engine.load(sContext, "aHSL", sExtensionPath+"grammalecte/graphspell/_dictionaries");
            oSpellChecker = gc_engine.getSpellChecker();
            oTest = new TestGrammarChecking(gc_engine, sExtensionPath+"/grammalecte/fr/tests_data.json");
            oTokenizer = new Tokenizer("fr");
            oLocution =  helpers.loadFile(sExtensionPath + "/grammalecte/fr/locutions_data.json");
            lexgraph_fr.load(oSpellChecker, oTokenizer, oLocution);
            if (dOptions !== null) {
                if (!(dOptions instanceof Map)) {
                    dOptions = helpers.objectToMap(dOptions);
                }
                gc_engine.setOptions(dOptions);
            }
            //tests();
            bInitDone = true;
        } else {
            console.log("[Worker] Already initialized…")
        }
        // we always retrieve options from the gc_engine, for setOptions filters obsolete options
        dOptions = helpers.mapToObject(gc_engine.getOptions());
        postMessage(createResponse("init", dOptions, oInfo, true));
    }
    catch (e) {
        console.error(e);
        postMessage(createResponse("init", createErrorResult(e, "init failed"), oInfo, true, true));
    }
}


function parse (sText, sCountry, bDebug, bContext, oInfo={}) {
    sText = sText.replace(/­/g, "").normalize("NFC");
    for (let sParagraph of text.getParagraph(sText)) {
        let aGrammErr = gc_engine.parse(sParagraph, sCountry, bDebug, bContext);
        postMessage(createResponse("parse", aGrammErr, oInfo, false));
    }
    postMessage(createResponse("parse", null, oInfo, true));
}

function parseAndSpellcheck (sText, sCountry, bDebug, bContext, oInfo={}) {
    let i = 0;
    sText = sText.replace(/­/g, "").normalize("NFC");
    for (let sParagraph of text.getParagraph(sText)) {
        let aGrammErr = gc_engine.parse(sParagraph, sCountry, bDebug, null, bContext);
        let aSpellErr = oSpellChecker.parseParagraph(sParagraph);
        postMessage(createResponse("parseAndSpellcheck", {sParagraph: sParagraph, iParaNum: i, aGrammErr: aGrammErr, aSpellErr: aSpellErr}, oInfo, false));
        i += 1;
    }
    postMessage(createResponse("parseAndSpellcheck", null, oInfo, true));
}

function parseAndSpellcheck1 (sParagraph, sCountry, bDebug, bContext, oInfo={}) {
    sParagraph = sParagraph.replace(/­/g, "").normalize("NFC");
    let aGrammErr = gc_engine.parse(sParagraph, sCountry, bDebug, null, bContext);
    let aSpellErr = oSpellChecker.parseParagraph(sParagraph);
    postMessage(createResponse("parseAndSpellcheck1", {sParagraph: sParagraph, aGrammErr: aGrammErr, aSpellErr: aSpellErr}, oInfo, true));
}

function parseFull (sText, sCountry, bDebug, bContext, oInfo={}) {
    let i = 0;
    sText = sText.replace(/­/g, "").normalize("NFC");
    for (let sParagraph of text.getParagraph(sText)) {
        let lSentence = gc_engine.parse(sParagraph, sCountry, bDebug, null, bContext, true);
        console.log("*", lSentence);
        postMessage(createResponse("parseFull", {sParagraph: sParagraph, iParaNum: i, lSentence: lSentence}, oInfo, false));
        i += 1;
    }
    postMessage(createResponse("parseFull", null, oInfo, true));
}

function getListOfTokens (sText, oInfo={}) {
    // lexicographer
    try {
        sText = sText.replace(/­/g, "").normalize("NFC");
        for (let sParagraph of text.getParagraph(sText)) {
            if (sParagraph.trim() !== "") {
                postMessage(createResponse("getListOfTokens", lexgraph_fr.getListOfTokensReduc(sParagraph, true), oInfo, false));
            }
        }
        postMessage(createResponse("getListOfTokens", null, oInfo, true));
    }
    catch (e) {
        console.error(e);
        postMessage(createResponse("getListOfTokens", createErrorResult(e, "no tokens"), oInfo, true, true));
    }
}

function getOptions (oInfo={}) {
    let dOptions = helpers.mapToObject(gc_engine.getOptions());
    postMessage(createResponse("getOptions", dOptions, oInfo, true));
}

function getDefaultOptions (oInfo={}) {
    let dOptions = helpers.mapToObject(gc_engine.getDefaultOptions());
    postMessage(createResponse("getDefaultOptions", dOptions, oInfo, true));
}

function setOptions (dOptions, oInfo={}) {
    if (!(dOptions instanceof Map)) {
        dOptions = helpers.objectToMap(dOptions);
    }
    gc_engine.setOptions(dOptions);
    dOptions = helpers.mapToObject(gc_engine.getOptions());
    postMessage(createResponse("setOptions", dOptions, oInfo, true));
}

function setOption (sOptName, bValue, oInfo={}) {
    console.log(sOptName+": "+bValue);
    if (sOptName) {
        gc_engine.setOption(sOptName, bValue);
        let dOptions = helpers.mapToObject(gc_engine.getOptions());
        postMessage(createResponse("setOption", dOptions, oInfo, true));
    }
}

function resetOptions (oInfo={}) {
    gc_engine.resetOptions();
    let dOptions = helpers.mapToObject(gc_engine.getOptions());
    postMessage(createResponse("resetOptions", dOptions, oInfo, true));
}

function tests () {
    console.log(conj.getConj("devenir", ":E", ":2s"));
    console.log(mfsp.getMasForm("emmerdeuse", true));
    console.log(mfsp.getMasForm("pointilleuse", false));
    console.log(phonet.getSimil("est"));
    let aRes = gc_engine.parse("Je suit...");
    for (let oErr of aRes) {
        console.log(text.getReadableError(oErr));
    }
}

function textToTest (sText, sCountry, bDebug, bContext, oInfo={}) {
    if (!gc_engine) {
        postMessage(createResponse("textToTest", "# Grammar checker not loaded.", oInfo, true));
        return;
    }
    sText = sText.replace(/­/g, "").normalize("NFC");
    let aGrammErr = gc_engine.parse(sText, sCountry, bDebug, bContext);
    let sMsg = "";
    for (let oErr of aGrammErr) {
        sMsg += text.getReadableError(oErr) + "\n";
    }
    if (sMsg == "") {
        sMsg =  "Aucune erreur détectée.";
    }
    postMessage(createResponse("textToTest", sMsg, oInfo, true));
}

function fullTests (oInfo={}) {
    if (!gc_engine) {
        postMessage(createResponse("fullTests", "# Grammar checker not loaded.", oInfo, true));
        return;
    }
    let dMemoOptions = gc_engine.getOptions();
    let dTestOptions = gc_engine.getDefaultOptions();
    dTestOptions.set("nbsp", true);
    dTestOptions.set("esp", true);
    dTestOptions.set("unit", true);
    dTestOptions.set("num", true);
    gc_engine.setOptions(dTestOptions);
    let sMsg = "";
    for (let sRes of oTest.testParse()) {
        sMsg += sRes + "\n";
        console.log(sRes);
    }
    gc_engine.setOptions(dMemoOptions);
    postMessage(createResponse("fullTests", sMsg, oInfo, true));
}


// SpellChecker

function setDictionary (sDictionary, oDict, oInfo) {
    if (!oSpellChecker) {
        postMessage(createResponse("setDictionary", "# Error. SpellChecker not loaded.", oInfo, true));
        return;
    }
    //console.log("setDictionary", sDictionary);
    switch (sDictionary) {
        case "main":
            oSpellChecker.setMainDictionary(oDict, oInfo["sExtPath"]+"/grammalecte/graphspell/_dictionaries");
            break;
        case "community":
            oSpellChecker.setCommunityDictionary(oDict);
            break;
        case "personal":
            oSpellChecker.setPersonalDictionary(oDict);
            break;
        default:
            console.log("[worker] setDictionary: Unknown dictionary <"+sDictionary+">");
    }
    postMessage(createResponse("setDictionary", true, oInfo, true));
}

function setDictionaryOnOff (sDictionary, bActivate, oInfo) {
    if (!oSpellChecker) {
        postMessage(createResponse("setDictionary", "# Error. SpellChecker not loaded.", oInfo, true));
        return;
    }
    //console.log("setDictionaryOnOff", sDictionary, bActivate);
    switch (sDictionary) {
        case "community":
            if (bActivate) {
                oSpellChecker.activateCommunityDictionary();
            } else {
                oSpellChecker.deactivateCommunityDictionary();
            }
            break;
        case "personal":
            if (bActivate) {
                oSpellChecker.activatePersonalDictionary();
            } else {
                oSpellChecker.deactivatePersonalDictionary();
            }
            break;
        default:
            console.log("[worker] setDictionaryOnOff: Unknown dictionary <"+sDictionary+">");
    }
    postMessage(createResponse("setDictionaryOnOff", true, oInfo, true));
}

function getSpellSuggestions (sWord, oInfo) {
    if (!oSpellChecker) {
        postMessage(createResponse("getSpellSuggestions", "# Error. SpellChecker not loaded.", oInfo, true));
        return;
    }
    let i = 0;
    for (let aSugg of oSpellChecker.suggest(sWord)) {
        postMessage(createResponse("getSpellSuggestions", {sWord: sWord, aSugg: aSugg, iSuggBlock: i}, oInfo, true));
        i += 1;
    }
}


// Conjugueur

function getVerb (sWord, bPro, bNeg, bTpsCo, bInt, bFem, oInfo) {
    try {
        let oVerb = null;
        let oConjTable = null;
        if (conj.isVerb(sWord)) {
            oVerb = new Verb(sWord);
            oConjTable = oVerb.createConjTable(bPro, bNeg, bTpsCo, bInt, bFem);
        }
        postMessage(createResponse("getVerb", { oVerb: oVerb, oConjTable: oConjTable }, oInfo, true));
    }
    catch (e) {
        console.error(e);
        postMessage(createResponse("getVerb", createErrorResult(e, "no verb"), oInfo, true, true));
    }
}
