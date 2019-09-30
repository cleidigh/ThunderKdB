/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
/* Authors:
 *   Myk Melez <myk@mozilla.org> (API)
 *   Ben Bucksch <ben.bucksch  beonex> <http://business.beonex.com>
 *       (generic implementation)
 */

/**
 * A string bundle.
 *
 * This object presents two APIs: a deprecated one that is equivalent to the API
 * for the stringbundle XBL binding, to make it easy to switch from that binding
 * to this module, and a new one that is simpler and easier to use.
 *
 * The benefit of this module over the XBL binding is that it can also be used
 * in JavaScript modules and components, not only in chrome JS.
 *
 * To use this module, import it, create a new instance of StringBundle,
 * and then use the instance's |get| and |getAll| methods to retrieve strings
 * (you can get both plain and formatted strings with |get|):
 *
 *   let strings =
 *     new StringBundle("strings.properties");
 *   let foo = strings.get("foo");
 *   let barFormatted = strings.get("bar", [arg1, arg2]);
 *   strings.getAll().forEach(function(string) {
 *     dump (string.key + " = " + string.value + "\n");
 *   });
 *
 * @param path {String}
 *        the filename of the string bundle, in your addon's locale/<lang>/ directory
 *        with or without .properties siffix
 *        e.g. "email/login" for locale/email/login.properties
 */
function StringBundle(path) {
  if (window.location.protocol == "chrome:") {
    this._url = "chrome://exquilla/locale/" + path;
  } else {
    this._url = chrome.extension.getURL("locale/" + getExtLocale() + "/" + path);
  }
  if (path.indexOf(".properties") == -1) {
    this._url += ".properties";
  }
}

StringBundle.prototype = {
  /**
   * the URL of the string bundle
   * @type String
   */
  _url: null,

  /**
   * { map property ID {String} -> translation {String} }
   */
  _properties : null,

  /**
   * Read the string bundle from disk.
   * Only if necessary.
   */
  _ensureLoaded : function() {
    if (this._properties)
      return;
    let fileContent = readURLasUTF8(this._url);
    this._properties = {};
    //console.log(this._url + ": " + fileContent);
    let spLines = splitLines(fileContent);
    for (let i in spLines) {
      let line = spLines[i].trim();
      if (line[0] == "#") // comment
        continue;
      let sp = line.split("=", 2);
      if (sp.length < 2)
        continue;
      let id = sp[0].trim();
      let translation = sp[1].trim();
      translation = translation.replace(/\\(\\|u([0-9a-f]{4}))/gi, (dummy1, dummy2, hex) => hex ? String.fromCharCode("0x" + hex) : "\\");
      this._properties[id] = translation;
    }
    //console.dir(this._properties);
  },

  _get: function(key) {
    try {
      this._ensureLoaded();
    } catch (e) {
      //console.error("Could not get stringbundle <" + this._url +
      //    ">, error: " + e);
      throw e;
    }
    if (this._properties[key] === undefined) {
      let msg = "Could not get key " + key + " from stringbundle <" +
          this._url + ">";
      //console.error(msg);
      let ex = new Error(msg);
      ex.code = "translation-missing-for-" + key;
      throw ex;
    }

    return this._properties[key];
  },

  /**
   * Get a string from the bundle.
   *
   * @param key {String}
   *        the identifier of the string to get
   * @param args {array} [optional]
   *        an array of arguments that replace occurrences of %S in the string
   *
   * @returns {String} the value of the string
   */
  get: function(key, args) {
    if (args)
      return this.getFormattedString(key, args);
    else
      return this._get(key);
  },

  /**
   * Get a string from the bundle.
   * @deprecated use |get| instead
   *
   * @param key {String}
   *        the identifier of the string to get
   *
   * @returns {String}
   *          the value of the string
   */
  getString: function(key) {
    return this._get(key);
  },

  /**
   * Get a formatted string from the bundle.
   * @deprecated use |get| instead
   *
   * @param key {string}
   *        the identifier of the string to get
   * @param args {array}
   *        an array of arguments that replace occurrences of %S in the string
   *
   * @returns {String}
   *          the formatted value of the string
   */
  getFormattedString: function(key, args) {
    let result = this._get(key);
    if (result.indexOf("%1$S") > -1) {
      for (let i = 0; i < args.length; i++)
        result = result.replace("%" + (i+1) + "$S", args[i]);
    } else { // Just simple %S
      for (let i in args) {
        result = result.replace("%S", args[i]);
      }
    }
    return result;
  },

  /**
   * Get all the strings in the bundle.
   *
   * @returns {Array}
   *          an array of objects with key and value properties
   */
  getAll: function() {
    this._ensureLoaded();
    let strings = [];
    for (let i in this._properties) {
      let id = this._properties[i];
      strings.push({ key: id, value: this._properties[id] });
    }
    return strings;
  },

}
