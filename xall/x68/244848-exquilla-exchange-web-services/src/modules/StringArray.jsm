/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2016 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

const EXPORTED_SYMBOLS = ["StringArray"];

var { Utils } = ChromeUtils.import("resource://exquilla/ewsUtils.jsm");
Utils.importLocally(this);

function StringArray() {
  this._a = [];
}

StringArray.prototype = {
  // Used to access an instance as JS, bypassing XPCOM.
  get wrappedJSObject() {
    return this;
  },
  // Used to identify this as a StringArray
  get StringArray() {
    return this;
  },
  get length() { return this._a.length;},
  assignAt(index, value) {
    // make sure we have elements
    while (index >= this._a.length) {
      this._a.push(null);
    }
    this._a[index] = value;
  },
  getAt(index) { return this._a[index];},
  removeAt(index) { this._a.splice(index, 1); },
  indexOf(value) {
    return this._a.indexOf(value);
  },
  get isEmpty() { return this._a.length == 0;},
  append(value) { this._a.push(value);},
  clear() { this._a.length = 0;},
}
