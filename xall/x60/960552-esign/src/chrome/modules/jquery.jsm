"use strict";

/**
 * Wrapper module to load library
 */
const EXPORTED_SYMBOLS = ['jQuery'];

Components.utils.import("resource://esign/lib.jsm"); // Export Lib

// Add "jQuery" original library
let url = "chrome://esign/content/script/jquery-3.3.1.min.js";
let scope = Lib.getLib(url);
let jQuery = scope.window.jQuery;