/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
var __webpack_exports__ = {};

;// CONCATENATED MODULE: ./addon/prefs.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
const kCurrentLegacyMigration = 3;
const kPrefDefaults = {
  hide_quote_length: 5,
  expand_who: 4,
  // kExpandAuto
  no_friendly_date: false,
  uninstall_infos: "{}",
  logging_enabled: false,
  tweak_bodies: true,
  tweak_chrome: true,
  operate_on_conversations: false,
  extra_attachments: false,
  hide_quick_reply: false,
  compose_in_tab: true,
  unwanted_recipients: "{}",
  hide_sigs: false
};
class Prefs {
  async init() {
    try {
      await this._migrate();
    } catch (ex) {
      console.error(ex);
    } // Now we've done the migration, tell the backend about all our prefs.


    const results = await browser.storage.local.get("preferences");

    if (results.preferences) {
      let updatePrefs = false;

      for (const prefName of Object.getOwnPropertyNames(kPrefDefaults)) {
        // Ensure all preference values are defined.
        if (results.preferences[prefName] === "undefined") {
          updatePrefs = true;
          results.preferences[prefName] = kPrefDefaults[prefName];
        }

        await browser.conversations.setPref(prefName, results.preferences[prefName]);
      } // Set a special pref so bootstrap knows it can continue.


      await browser.conversations.setPref("finishedStartup", true);

      if (updatePrefs) {
        try {
          await browser.storage.local.set({
            preferences: results.preferences
          });
        } catch (ex) {
          console.error(ex);
        }
      }
    } else {
      console.error("Could not find the preferences to send to the API.");
    }

    this._addListener();
  }

  async _migrate() {
    const results = await browser.storage.local.get("preferences");
    const currentMigration = results.preferences && results.preferences.migratedLegacy ? results.preferences.migratedLegacy : 0;

    if (currentMigration >= kCurrentLegacyMigration) {
      return;
    }

    let prefs = results.preferences || {};

    if (currentMigration < 1) {
      for (const prefName of Object.getOwnPropertyNames(kPrefDefaults)) {
        prefs[prefName] = await browser.conversations.getPref(prefName);

        if (prefs[prefName] === undefined) {
          prefs[prefName] = kPrefDefaults[prefName];
        }
      }
    } // Version 2 was the migration from the legacy storage format for saved
    // quick reply drafts. It might be better just to drop these completely
    // now, but in case we decide to keep & use the old data:
    //
    // Stored in key/value format in draftsData (top-level).
    // The key is the gloda id. The value was generated from this:
    // {
    //   msgUri: msgHdrGetUri(gComposeSession.params.msgHdr),
    //   from: gComposeSession.params.identity.email,
    //   to: JSON.parse($("#to").val()).join(","),
    //   cc: JSON.parse($("#cc").val()).join(","),
    //   bcc: JSON.parse($("#bcc").val()).join(","),
    //   body: getActiveEditor().value,
    //   attachments: gComposeSession.attachmentList.save()
    // }


    if (currentMigration < 3) {
      prefs.hide_quick_reply = false;
    }

    prefs.migratedLegacy = kCurrentLegacyMigration;
    await browser.storage.local.set({
      preferences: prefs
    });
  }

  _addListener() {
    browser.storage.onChanged.addListener((changed, areaName) => {
      if (areaName != "local" || !("preferences" in changed) || !("newValue" in changed.preferences)) {
        return;
      }

      for (const prefName of Object.getOwnPropertyNames(changed.preferences.newValue)) {
        if (prefName == "migratedLegacy") {
          continue;
        }

        if (!changed.preferences.oldValue || changed.preferences.oldValue[prefName] != changed.preferences.newValue[prefName]) {
          browser.conversations.setPref(prefName, changed.preferences.newValue[prefName]);
        }
      }
    });
  }

}
;// CONCATENATED MODULE: ./addon/content/es-modules/thunderbird-compat.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
// A compatibility layer that can be imported whether in the browser or
// in Thunderbird
 // Make sure the browser object exists

if (window.BrowserSim && !window.browser) {
  // BrowserSim is a workaround until Conversations is converted to a webextension
  // and has a native `browser` object available.
  window.browser = window.BrowserSim.getBrowser();
} // If we have a `window.browser` object, we are running as a webextension as opposed to
// running in the browser or in test mode. We suppress certain expected errors when we
// know that we're not a webextension.


const isWebextension = !!window.browser;
const thunderbird_compat_browser = window.browser || {}; // `i18n` is a replacement for `browser.i18n`.  `getMessage` defaults
// `browser.i18n.getMessage` if the function exists. Otherwise, locale
// information is `fetch`ed and `getMessage` is polyfilled. The `isLoaded`
// promise resolves to `true` when the library has fully loaded.

const i18n = {
  getMessage: (messageName, substitutions) => `<not loaded>${messageName}`,
  isLoaded: Promise.resolve(true),
  isPolyfilled: true
};
const ALL_LOCALES = ["bg", "ca", "cs", "da", "de", "el", "en", "es", "eu", "fi", "fr", "gl", "he-IL", "hr", "it", "ja-JP", "lt", "nl", "pl", "pt-BR", "rm", "ru-RU", "sl", "sr", "sv-SE", "tr", "uk", "zh-CN", "zh-TW"];
/**
 * This function should only be used in the dev frame. It is exported
 * to give the dev frame a way to mock a change to the UI language.
 *
 * @export
 * @param {*} resolve
 * @param {string} [locale="en"]
 */

async function initializeI18n(resolve, locale = "en") {
  let resp;

  try {
    resp = await fetch(`../_locales/${locale}/messages.json`);
  } catch (ex) {
    // For tests.
    resp = await fetch(`_locales/${locale}/messages.json`);
  }

  i18n._messages = await resp.json();
  i18n._currentLocale = locale; // Replace the `getMessage` function with one that retrieves
  // values from the loaded JSON.

  i18n.getMessage = (messageName, substitutions) => {
    let message = (i18n._messages[messageName] || {}).message || `<translation not found>${messageName}`;

    if (!substitutions || !i18n._messages[messageName]) {
      return message;
    } // If we're here, we have a valid i18n object and we need to do
    // some substitutions.


    const placeholders = i18n._messages[messageName].placeholders; // `placeholders` is an object with keys and values={ content: "$?" }.
    // We need to substitute strings of the form `$key$` with the content at the `$?` position
    // of the `substitutions` array.

    for (const key in placeholders) {
      const index = parseInt(placeholders[key].content.slice(1), 10) - 1;
      message = message.replace(`$${key}$`, substitutions[index]);
    }

    return message;
  };

  i18n.getUILanguage = async () => i18n._currentLocale;

  i18n.getAcceptLanguages = async () => ALL_LOCALES;

  resolve(true);
}

if (thunderbird_compat_browser.i18n) {
  i18n.getMessage = thunderbird_compat_browser.i18n.getMessage;
  i18n.getUILanguage = thunderbird_compat_browser.i18n.getUILanguage;
  i18n.getAcceptLanguages = thunderbird_compat_browser.i18n.getAcceptLanguages;
  i18n.isPolyfilled = false;
} else {
  // Fake what we need from the i18n library
  i18n.isLoaded = new Promise((resolve, reject) => {
    // initializeI18n modifies the global i18n object and calls
    // `resolve(true)` when finished.
    initializeI18n(resolve).catch(reject);
  });
  thunderbird_compat_browser.i18n = i18n;
}

if (!thunderbird_compat_browser.storage) {
  const DEFAULT_PREFS = { ...kPrefDefaults,
    // DEFAULT_PREFS is only used when browser.storage does not exist. I.e.,
    // when running in the browser in dev mode. Turn on logging in this case.
    logging_enabled: true
  }; // Fake what we need from the browser storage library

  const _stored = {
    preferences: DEFAULT_PREFS
  };
  thunderbird_compat_browser.storage = {
    local: {
      async get(key) {
        if (typeof key === "undefined") {
          return _stored;
        }

        if (typeof key === "string") {
          return {
            [key]: _stored[key]
          };
        }

        if (Array.isArray(key)) {
          const ret = {};

          for (const k of key) {
            if (k in _stored) {
              ret[k] = _stored[k];
            }
          }

          return ret;
        } // the last case is that we are an object with default values


        const ret = {};

        for (const [k, v] of Object.entries(key)) {
          ret[k] = k in _stored ? _stored[k] : v;
        }

        return ret;
      },

      async set(key) {
        return Object.assign(_stored, key);
      }

    }
  };
}

if (!thunderbird_compat_browser.tabs) {
  thunderbird_compat_browser.tabs = {
    async create() {},

    async getCurrent() {
      return {
        id: "135246"
      };
    },

    async remove() {}

  };
}

if (!thunderbird_compat_browser.conversations) {
  thunderbird_compat_browser.conversations = {
    undoCustomizations() {},

    send(details) {
      console.log(details);
    },

    async getLocaleDirection() {
      // RTL languages taken from https://github.com/shadiabuhilal/rtl-detect/blob/master/lib/rtl-detect.js
      const RTL_LANGUAGES = ["ae"
      /* Avestan */
      , "ar"
      /* 'العربية', Arabic */
      , "arc"
      /* Aramaic */
      , "bcc"
      /* 'بلوچی مکرانی', Southern Balochi */
      , "bqi"
      /* 'بختياري', Bakthiari */
      , "ckb"
      /* 'Soranî / کوردی', Sorani */
      , "dv"
      /* Dhivehi */
      , "fa"
      /* 'فارسی', Persian */
      , "glk"
      /* 'گیلکی', Gilaki */
      , "he"
      /* 'עברית', Hebrew */
      , "ku"
      /* 'Kurdî / كوردی', Kurdish */
      , "mzn"
      /* 'مازِرونی', Mazanderani */
      , "nqo"
      /* N'Ko */
      , "pnb"
      /* 'پنجابی', Western Punjabi */
      , "ps"
      /* 'پښتو', Pashto, */
      , "sd"
      /* 'سنڌي', Sindhi */
      , "ug"
      /* 'Uyghurche / ئۇيغۇرچە', Uyghur */
      , "ur"
      /* 'اردو', Urdu */
      , "yi"
      /* 'ייִדיש', Yiddish */
      ];
      const locale = await i18n.getUILanguage();

      if (locale && RTL_LANGUAGES.some(l => locale.startsWith(l))) {
        return "rtl";
      }

      return "ltr";
    }

  };
}

if (!thunderbird_compat_browser.convCompose) {
  thunderbird_compat_browser.convCompose = {
    send(details) {
      console.log("Sending:", details);
    }

  };
}

if (!thunderbird_compat_browser.accounts) {
  thunderbird_compat_browser.accounts = {
    async list() {
      return [{
        id: "ac1",
        identities: [{
          id: `id3`,
          email: `id3@example.com`
        }]
      }, {
        id: "ac2",
        identities: [{
          id: `id4`,
          email: `id4@example.com`
        }]
      }];
    },

    async get(id) {
      return {
        id,
        identities: [{
          id: `id${id}`,
          email: `${id}@example.com`
        }]
      };
    },

    async setDefaultIdentity() {}

  };
}

if (!thunderbird_compat_browser.messageDisplay) {
  thunderbird_compat_browser.messageDisplay = {
    async getDisplayedMessages(tabId) {
      return [{
        author: "author@example.com",
        folder: {
          accountId: "ac34",
          path: "Inbox/test"
        },
        id: 123456,
        read: false
      }];
    }

  };
}

if (!thunderbird_compat_browser.windows) {
  thunderbird_compat_browser.windows = {
    async create() {},

    async getCurrent() {
      return {
        focused: true,
        id: 1,
        tabs: [{
          active: true,
          highlighted: true,
          id: 123,
          index: 0,
          selected: true
        }],
        type: "normal"
      };
    }

  };
}

if (!thunderbird_compat_browser.runtime) {
  thunderbird_compat_browser.runtime = {
    async getPlatformInfo() {
      return {
        os: "win"
      };
    }

  };
}

if (!thunderbird_compat_browser.contacts) {
  thunderbird_compat_browser.contacts = {
    async quickSearch(email) {
      if (["foo@example.com", "bar@example.com"].includes(email)) {
        return [{
          id: "135246",
          type: "contact",
          properties: {
            PrimaryEmail: "foo@example.com",
            SecondEmail: "bar@example.com",
            DisplayName: "display name",
            PreferDisplayName: "1",
            PhotoURI: undefined
          }
        }];
      } else if (email == "id4@example.com") {
        return [{
          id: "15263748",
          type: "contact",
          properties: {
            PrimaryEmail: "id4@example.com",
            DisplayName: "id4 card",
            PreferDisplayName: "1",
            PhotoURI: undefined
          }
        }];
      } else if (email == "extra@example.com") {
        return [{
          id: "75312468",
          type: "contact",
          properties: {
            PrimaryEmail: "extra@example.com",
            DisplayName: "extra card",
            PreferDisplayName: "0",
            PhotoURI: "https://example.com/fake"
          }
        }];
      }

      return [];
    },

    onCreated: {
      addListener() {}

    },
    onUpdated: {
      addListener() {}

    },
    onDeleted: {
      addListener() {}

    }
  };
}


;// CONCATENATED MODULE: ./addon/background/uiHandler.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


if (!globalThis.browser) {
  globalThis.browser = thunderbird_compat_browser;
}

class UIHandler {
  init() {
    browser.commands.onCommand.addListener(this.onKeyCommand.bind(this));
    browser.convContacts.onColumnHandler.addListener(() => {}, browser.i18n.getMessage("between.columnName"), browser.i18n.getMessage("between.columnTooltip"), browser.i18n.getMessage("message.meBetweenMeAndSomeone"), browser.i18n.getMessage("message.meBetweenSomeoneAndMe"), browser.i18n.getMessage("header.commaSeparator"), browser.i18n.getMessage("header.andSeparator"));
  }

  onKeyCommand(command) {
    if (command == "quick_compose") {
      this.openQuickCompose().catch(console.error);
    }
  }

  async openQuickCompose() {
    let win = await browser.windows.getCurrent({
      populate: true
    });
    let identityId;
    let accountId;

    if (win.type == "normal") {
      let [tab] = win.tabs.filter(t => t.active);

      if (tab) {
        let msgs;

        if ("getDisplayedMessages" in browser.messageDisplay) {
          msgs = await browser.messageDisplay.getDisplayedMessages(tab.id);
        } else {
          msgs = await browser.convMsgWindow.getDisplayedMessages(tab.id);
        }

        if (msgs && msgs.length) {
          let accountDetail = await browser.accounts.get(msgs[0].folder.accountId);

          if (accountDetail && accountDetail.identities.length) {
            accountId = accountDetail.id;
            identityId = accountDetail.identities[0].id;
          }
        }
      }
    }

    if (!identityId) {
      [accountId, identityId] = await this.getDefaultIdentity();
    } // The title/description for this pref is really confusing, we should
    // reconsider it when we re-enable.


    const result = await browser.storage.local.get("preferences");
    const url = `../compose/compose.html?accountId=${accountId}&identityId=${identityId}`;

    if (result.preferences.compose_in_tab) {
      browser.tabs.create({
        url
      });
    } else {
      browser.windows.create({
        url,
        type: "popup",
        width: 1024,
        height: 600
      });
    }
  }

  async getDefaultIdentity() {
    let accounts = await browser.accounts.list();
    return [accounts[0].id, accounts[0].identities[0].id];
  }

}
;// CONCATENATED MODULE: ./addon/background/window.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
class Window {
  async init() {
    // Set up our monkey patches which aren't really listeners, but this
    // is a good way to manage them.
    browser.convMsgWindow.onMonkeyPatch.addListener(() => {});
    browser.convMsgWindow.onThreadPaneDoubleClick.addListener(async (windowId, msgHdrs) => {
      for (const hdr of msgHdrs) {
        const account = await browser.accounts.get(hdr.folder.accountId);

        if (account.type == "nntp" || account.type == "rss") {
          return {};
        }
      }

      const urls = [];

      for (const hdr of msgHdrs) {
        urls.push(await browser.conversations.getMessageUriForId(hdr.id));
      }

      await this.openConversation(windowId, urls);
      return {
        cancel: true
      };
    });
    browser.convMsgWindow.onThreadPaneMiddleClick.addListener(async (windowId, msgHdrs) => {
      for (const hdr of msgHdrs) {
        const account = await browser.accounts.get(hdr.folder.accountId);

        if (account.type == "nntp" || account.type == "rss") {
          return {};
        }
      }

      const urls = [];

      for (const hdr of msgHdrs) {
        urls.push(await browser.conversations.getMessageUriForId(hdr.id));
      }

      const url = this.makeConversationUrl(urls, await browser.convMsgWindow.isSelectionThreaded(windowId));
      await browser.conversations.createTab({
        url,
        type: "chromeTab"
      });
      return {
        cancel: true
      };
    });
    browser.convMsgWindow.onSummarizeThread.addListener(async () => {});
  }

  async openConversation(windowId, urls) {
    const url = this.makeConversationUrl(urls, await browser.convMsgWindow.isSelectionThreaded(windowId));

    switch (await browser.conversations.getCorePref("mail.openMessageBehavior")) {
      case 0: // fall-through

      case 1:
        browser.convMsgWindow.openNewWindow(url);
        break;

      case 2:
        await browser.conversations.createTab({
          url,
          type: "contentTab"
        });
        break;
    }
  }
  /**
   * Makes a conversation url for opening in new windows/tabs.
   *
   * @param {Array} urls
   *   An array of urls to be opened.
   * @param {Boolean} [isSelectionThreaded]
   *   Is the selection threaded
   */


  makeConversationUrl(urls, isSelectionThreaded) {
    let queryString = "?urls=" + encodeURIComponent(urls.join(","));

    if (isSelectionThreaded) {
      queryString += "&isThreaded=" + (isSelectionThreaded ? 1 : 0);
    }

    return `chrome://conversations/content/stub.html${queryString}`;
  }

}
;// CONCATENATED MODULE: ./addon/background/contactManager.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


if (!globalThis.browser) {
  globalThis.browser = thunderbird_compat_browser;
}
/**
 * @typedef {object} Contact
 * @property {string} color
 *   A string denoting the color to use for this contact,, the same email address
 *   will always return the same color.
 * @property {string} contactId
 *   The id of the associated ContactNode from the WebExtension APIs (if any).
 * @property {string} identityId
 *   The id of the associated MailIdentiy from the WebExtension APIs (if any).
 * @property {string} name
 *   The name from the associated ContactNode. This is only returned if the
 *   ContactNode has "Always prefer display name over message header" set for
 *   the contact.
 * @property {string} photoURI
 *   A uri to use for the avator photo for the contact (if any).
 */

/**
 * Extended Contact information that is cached.
 */


class ExtendedContact {
  constructor({
    contactId,
    email,
    identityId,
    name,
    photoURI
  }) {
    this.color = freshColor(email);
    this.contactId = contactId;
    this.identityId = identityId;
    this.name = name;
    this.photoURI = photoURI;
    /**
     * The time when the contact was last accessed in the cache, used for
     * clearing out the cache.
     *
     * @type {number}
     */

    this.lastAccessed = performance.now();
    /**
     * Hard limit to the maximumsize of the cache for contacts - when we hit this
     * we will cleanup straight away.
     *
     * @type {number}
     */

    this.HARD_MAX_CACHE_SIZE = 1000;
    /**
     * When we do a soft cleanup, we'll cleanup by this amount of contacts.
     * @type {number}
     */

    this.CACHE_CLEANUP_AMOUNT = 750;
  }
  /**
   * Returns a copy of the details for this contact which are used for display.
   *
   * @returns {Contact}
   */


  clone() {
    return {
      color: this.color,
      contactId: this.contactId,
      identityId: this.identityId,
      name: this.name,
      photoURI: this.photoURI
    };
  }

}
/**
 * A contact manager to cache the contacts retrieved from Thunderbird, and
 * associate them with colors.
 *
 * The cache also avoids expensive look-ups in the Thunderbird address book
 * database.
 */


class ContactManager {
  constructor() {
    /**
     * This is a cache for the contacts, so that we don't keep re-requesting
     * them. The key is the email address.
     *
     * @type {Map<string, ExtendedContact>}
     */
    this._cache = new Map();
    /**
     * We may ask for the same contact twice in rapid succession. In this
     * case, we don't want to do queries multiple times. Instead we want to wait
     * for the first query to finish. So, we keep track of all active queries.
     * The key is the email address. The value is a promise which will resolve
     * to an ExtendedContact.
     *
     * @type {Map<string, Promise>}
     */

    this._activeFetches = new Map();
    browser.contacts.onCreated.addListener(this._contactCreated.bind(this));
    browser.contacts.onUpdated.addListener(this._contactUpdated.bind(this));
    browser.contacts.onDeleted.addListener(this._contactDeleted.bind(this));
  }
  /**
   * Returns contact information for an email.
   *
   * @param {string} email
   *   The email address to get the contact information for.
   * @returns {Contact}
   *   The contact information.
   */


  async get(email) {
    let cachedValue = this._cache.get(email);

    if (cachedValue) {
      cachedValue.lastAccessed = performance.now();
      return cachedValue.clone();
    }

    let activeFetch = this._activeFetches.get(email);

    if (activeFetch) {
      let [, contact] = await activeFetch;
      return contact.clone();
    }

    let fetchPromise = this._fetchContactDetails(email);

    this._activeFetches.set(email, fetchPromise);

    let [emails, contact] = await fetchPromise;

    for (let email of emails) {
      this._cache.set(email, contact);
    }

    let cacheSize = this._cache.size;

    if (cacheSize >= this.HARD_MAX_CACHE_SIZE) {
      // Schedule a cleanup after the current events.
      setTimeout(this._cleanupCache.bind(this), 0);
    }

    this._activeFetches.delete(email);

    return contact.clone();
  }
  /**
   * Fetches contact details from the address book and account identity APIs.
   *
   * @param {string} email
   *   The email address to fetch contact details for.
   * @returns {ExtendedContact}
   */


  async _fetchContactDetails(email) {
    let matchingCards = []; // See #1492. This attempts to catch errors from quickSearch that can
    // happen if there are broken address books.

    try {
      matchingCards = await browser.contacts.quickSearch(email);
    } catch (ex) {
      console.error(ex);
    }

    let contactId = undefined;
    let emails = [];
    let name = undefined;
    let photoURI = undefined;
    let emailAddressForColor = email;

    if (matchingCards.length) {
      // We only look at the first contact.
      let card = matchingCards[0].properties;
      contactId = matchingCards[0].id; // PreferDisplayName returns a literal string "0" or "1". We must convert it
      // to a boolean appropriately.

      let useCardName = card.PreferDisplayName != null ? !!+card.PreferDisplayName : true;

      if (useCardName) {
        name = card.DisplayName;
      } else {
        if (card.FirstName) {
          name = card.FirstName;
        }

        if (card.LastName) {
          name += (name ? " " : "") + card.LastName;
        }
      }

      if (card.PrimaryEmail) {
        emails.push(card.PrimaryEmail);
        emailAddressForColor = card.PrimaryEmail;
      }

      if (card.SecondEmail) {
        emails.push(card.SecondEmail);
      }

      if (card.PhotoURI) {
        photoURI = card.PhotoURI;
      }
    } else {
      emails.push(email);
    }

    let identityEmails = await this._getIdentityEmails();
    let identityId = identityEmails.get(email);
    return [emails, new ExtendedContact({
      contactId,
      email: emailAddressForColor,
      identityId,
      name,
      photoURI
    })];
  }
  /**
   * Gets and caches the email addresses from the user's identities.
   *
   * Currently there is no refresh when account changes are made - Thunderbird
   * will need to be restart.
   *
   * @returns {string[]}
   *   An array of emails.
   */


  async _getIdentityEmails() {
    if (this._identityEmails) {
      return this._identityEmails;
    }

    let emails = new Map();
    let accounts = await browser.accounts.list().catch(console.error);

    for (let account of accounts) {
      if (account.type == "nntp") {
        continue;
      }

      for (let identity of account.identities) {
        emails.set(identity.email, identity.id);
      }
    }

    this._identityEmails = emails;
    return emails;
  }
  /**
   * Listener function for when a contact is created.
   *
   * @param {ContactNode} node
   *   The added contact.
   */


  _contactCreated(node) {
    this._cache.delete(node.properties.PrimaryEmail);

    this._cache.delete(node.properties.SecondEmail);
  }
  /**
   * Listener function for when a contact is updated.
   *
   * @param {ContactNode} node
   *   The updated contact.
   */


  _contactUpdated(node) {
    this._cache.delete(node.properties.PrimaryEmail);

    this._cache.delete(node.properties.SecondEmail);
  }
  /**
   * Listener function for when a contact is deleted.
   *
   * @param {string} parentId
   *   The parent id of the contact.
   * @param {string} id
   *   The id of the contact that was deleted.
   */


  _contactDeleted(parentId, id) {
    for (let [key, value] of this._cache.entries()) {
      if (value.contactId == id) {
        this._cache.delete(key);
      }
    }
  }
  /**
   * Removes old contacts from the cache to avoid it getting too large.
   */


  _cleanupCache() {
    let amountToRemove = this._cache.size - this.CACHE_CLEANUP_AMOUNT - 1;

    if (amountToRemove <= 0) {
      return;
    }

    let times = new Array(this._cache.size);
    let i = 0;

    for (let value of this._cache.values()) {
      times[i++] = value.lastAccessed;
    }

    times.sort((a, b) => a - b);

    for (let [key, value] of this._cache.entries()) {
      if (value.lastAccessed <= times[amountToRemove]) {
        this._cache.delete(key);
      }
    }
  }

}
const contactManager = new ContactManager();
/**
 * Hash an email address to produce a color. The same email address will
 * always return the same color.
 *
 * @param {string} email
 * @returns {string} - valid css hsl(...) string
 */

function freshColor(email) {
  let hash = 0;

  for (let i = 0; i < email.length; i++) {
    let chr = email.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash &= 0xffff;
  }

  let hue = Math.floor(360 * hash / 0xffff); // try to provide a consistent lightness across hues

  let lightnessStops = [48, 25, 28, 27, 62, 42];
  let j = Math.floor(hue / 60);
  let l1 = lightnessStops[j];
  let l2 = lightnessStops[(j + 1) % 6];
  let lightness = Math.floor((hue / 60 - j) * (l2 - l1) + l1);
  return "hsl(" + hue + ", 70%, " + Math.floor(lightness) + "%)";
}
;// CONCATENATED MODULE: ./addon/background/background.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */




const requestHandlers = [];

class Background {
  constructor() {
    this._prefs = new Prefs();
    this._uiHandler = new UIHandler();
    this._window = new Window();
    this._background = {
      // This is a special method to allow the background script to send messages to itself.
      // It is needed because we're not a full webextension yet. Basically, to imitate access
      // to the `browser` object, we pass around the background scripts `browser` object. That
      // means we cannot use `postMessage` from the "content script" to send the background
      // script data because there is effectively no content script.
      async request(message) {
        // Send the request to all request handlers and return the first one that gives
        // a non-null response.
        return (await Promise.all(requestHandlers.map(handler => handler(message)))).find(response => response != null);
      }

    };
  }

  async init() {
    // Setup the temporary API caller that stub.html uses.
    // Do this first to ensure it is set before bootstrap fires after
    // preference startup.
    browser.conversations.onCallAPI.addListener(async (apiName, apiItem, args) => {
      if (apiName.startsWith("_")) {
        return this[apiName][apiItem](...args);
      }

      return browser[apiName][apiItem](...args);
    });
    await this._prefs.init();
    await this._uiHandler.init();
    await this._window.init(); // Reset the message pane if the font size is changed, that seems to be
    // the best we can do at the moment, as the message pane doesn't get
    // told otherwise.

    browser.conversations.onCorePrefChanged.addListener(() => {
      browser.conversations.resetMessagePane().catch(console.error);
    }, "font.size.variable.x-western");
    browser.conversations.onSetConversationPreferences.addListener(() => {});
  }

}

let background = new Background();
background.init().catch(console.error);
browser.runtime.onInstalled.addListener(details => {
  if (details.reason == "install") {
    browser.tabs.create({
      url: "../assistant/assistant.html"
    });
  } else if (details.reason == "update" && !details.previousVersion.startsWith("3.1.")) {
    // Hopefully just needed for 3.0.x to 3.1.x upgrade to ensure the cache
    // is invalidated to work around previous issues with the startup cache
    // caching jsms that we didn't want it to.
    browser.conversations.invalidateCache().catch(console.error);
  }
}); // Request handler for getting contact details.
// Accessible through browser._background.request({ type: "contactDetails", payload: contact })

requestHandlers.push(async msg => {
  if (msg.type !== "contactDetails") {
    return null;
  }

  return contactManager.get(msg.payload.email);
});
/******/ })()
;