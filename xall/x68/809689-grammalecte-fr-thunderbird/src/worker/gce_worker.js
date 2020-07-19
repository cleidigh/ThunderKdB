// JavaScript

// Grammar checker engine
// PromiseWorker
// This code is executed in a separate thread (×20 faster too!!!)

// Firefox WTF: it’s impossible to use require as in the main thread here,
// so it is required to declare a resource in the file “chrome.manifest”.


"use strict";

// copy/paste
// https://developer.mozilla.org/en-US/docs/Mozilla/JavaScript_code_modules/PromiseWorker.jsm

importScripts("resource://gre/modules/workers/require.js");
let PromiseWorker = require("resource://gre/modules/workers/PromiseWorker.js");

// Instantiate AbstractWorker (see below).
let worker = new PromiseWorker.AbstractWorker();

worker.dispatch = function(method, args = []) {
  // Dispatch a call to method `method` with args `args`
  return self[method](...args);
};
worker.postMessage = function(...args) {
  // Post a message to the main thread
  self.postMessage(...args);
};
worker.close = function() {
  // Close the worker
  self.close();
};
worker.log = function(...args) {
  // Log (or discard) messages (optional)
  dump("Worker: " + args.join(" ") + "\n");
};

// Connect it to message port.
self.addEventListener("message", msg => worker.handleMessage(msg));

// end of copy/paste


// no console here, use “dump”

let gce = null; // module: grammar checker engine
let text = null;
let tkz = null; // module: tokenizer
let lxg = null; // module: lexicographer
let helpers = null;

let oTokenizer = null;
let oSpellChecker = null;
let oLxg = null;

function loadGrammarChecker (sGCOptions="", sContext="JavaScript") {
    if (gce === null) {
        try {
            gce = require("resource://grammalecte/fr/gc_engine.js");
            helpers = require("resource://grammalecte/graphspell/helpers.js");
            text = require("resource://grammalecte/text.js");
            tkz = require("resource://grammalecte/graphspell/tokenizer.js");
            //lxg = require("resource://grammalecte/fr/lexicographe.js");
            oTokenizer = new tkz.Tokenizer("fr");
            gce.load(sContext, "sCSS");
            oSpellChecker = gce.getSpellChecker();
            if (sGCOptions !== "") {
                gce.setOptions(helpers.objectToMap(JSON.parse(sGCOptions)));
            }
            // we always retrieve options from the gce, for setOptions filters obsolete options
            return gce.getOptions().gl_toString();
        }
        catch (e) {
            console.log("# Error: " + e.fileName + "\n" + e.name + "\nline: " + e.lineNumber + "\n" + e.message);
        }
    }
}

function setDictionary (sTypeDic, sDictionary) {
    try {
        console.log("set dictionary: " + sTypeDic);
        switch (sTypeDic) {
            case "main":
                oSpellChecker.setMainDictionary(sDictionary);
                break;
            case "community":
                break;
            case "personal":
                let oJSON = JSON.parse(sDictionary);
                oSpellChecker.setPersonalDictionary(oJSON);
                break;
            default:
                console.log("[GCE worker] unknown dictionary type");
        }
    }
    catch (e) {
        console.error(e);
    }
}

function parse (sText, sCountry, bDebug, bContext) {
    let aGrammErr = gce.parse(sText, sCountry, bDebug, bContext);
    return JSON.stringify(aGrammErr);
}

function parseAndSpellcheck (sText, sCountry, bDebug, bContext) {
    let aGrammErr = gce.parse(sText, sCountry, bDebug, null, bContext);
    let aSpellErr = oSpellChecker.parseParagraph(sText);
    return JSON.stringify({ aGrammErr: aGrammErr, aSpellErr: aSpellErr });
}

function suggest (sWord, nSuggLimit=10) {
    let lSugg = []
    for (let aSugg of oSpellChecker.suggest(sWord, nSuggLimit)) {
        lSugg.push(...aSugg);
    }
    return lSugg.join("|");
}

function getOptions () {
    return gce.getOptions().gl_toString();
}

function getDefaultOptions () {
    return gce.getDefaultOptions().gl_toString();
}

function setOptions (sGCOptions) {
    gce.setOptions(helpers.objectToMap(JSON.parse(sGCOptions)));
    return gce.getOptions().gl_toString();
}

function setOption (sOptName, bValue) {
    gce.setOptions(new Map([ [sOptName, bValue] ]));
    return gce.getOptions().gl_toString();
}

function resetOptions () {
    gce.resetOptions();
    return gce.getOptions().gl_toString();
}

function fullTests (sGCOptions="") {
    if (!gce || !oSpellChecker) {
        return "# Error: grammar checker or dictionary not loaded."
    }
    let dMemoOptions = gce.getOptions();
    if (sGCOptions) {
        gce.setOptions(helpers.objectToMap(JSON.parse(sGCOptions)));
    }
    let tests = require("resource://grammalecte/tests.js");
    let oTest = new tests.TestGrammarChecking(gce);
    let sAllRes = "";
    for (let sRes of oTest.testParse()) {
        console.log(sRes+"\n");
        sAllRes += sRes+"\n";
    }
    gce.setOptions(dMemoOptions);
    return sAllRes;
}
