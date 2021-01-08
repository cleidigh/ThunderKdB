/*
 * This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/.
 */

"use strict";

var EXPORTED_SYMBOLS = ["EnigmailPassword"];

const EnigmailLazy = ChromeUtils.import("chrome://enigmail/content/modules/lazy.jsm").EnigmailLazy;
const EnigmailPrefs = ChromeUtils.import("chrome://enigmail/content/modules/prefs.jsm").EnigmailPrefs;
const EnigmailCore = ChromeUtils.import("chrome://enigmail/content/modules/core.jsm").EnigmailCore;
const EnigmailCryptoAPI = ChromeUtils.import("chrome://enigmail/content/modules/cryptoAPI.jsm").EnigmailCryptoAPI;

const getDialog = EnigmailLazy.loader("enigmail/dialog.jsm", "EnigmailDialog");
const getLocale = EnigmailLazy.loader("enigmail/locale.jsm", "EnigmailLocale");

var EnigmailPassword = {
  /*
   * Get GnuPG command line options for receiving the password depending
   * on the various user and system settings (gpg-agent/no passphrase)
   *
   * @return: Array the GnuPG command line options
   */
  command: function() {
    return ["--use-agent"];
  },

  getMaxIdleMinutes: function() {
    try {
      return EnigmailPrefs.getPref("maxIdleMinutes");
    }
    catch (ex) {}

    return 5;
  },

  clearPassphrase: async function(win) {
    // clear all passphrases from gpg-agent by reloading the config
    if (!EnigmailCore.getService()) return;

    const cApi = EnigmailCryptoAPI();
    let isSuccess = false;

    try {
      isSuccess = await cApi.clearPassphrase();
    }
    catch (ex) {}

    if (isSuccess) {
      getDialog().alert(win, getLocale().getString("passphraseCleared"));
    }
    else {
      getDialog().alert(win, getLocale().getString("cannotClearPassphrase"));
    }
  }
};
