"use strict";

/**
 * Wrapper module to load library
 */
const EXPORTED_SYMBOLS = ['DOMPurify'];

Components.utils.import("resource://esign/lib.jsm"); // Export Lib

// Add "DOMPurify" original library
let url = "chrome://esign/content/script/purify.min.js";
let scope = Lib.getLib(url);
let DOMPurify = scope.DOMPurify;