"use strict";

/**
 * Wrapper module to load library
 */
const EXPORTED_SYMBOLS = ['quotedPrintable'];

Components.utils.import("resource://esign/lib.jsm"); // Export Lib

// Add "quotedPrintable" original library
let url = "chrome://esign/content/script/quoted-printable.js";
let scope = Lib.getLib(url);
let quotedPrintable = scope.quotedPrintable;
