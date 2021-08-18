/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 6720:
/***/ ((__unused_webpack___webpack_module__, __unused_webpack___webpack_exports__, __webpack_require__) => {


// EXTERNAL MODULE: ./node_modules/react/index.js
var react = __webpack_require__(7294);
// EXTERNAL MODULE: ./node_modules/react-dom/index.js
var react_dom = __webpack_require__(3935);
// EXTERNAL MODULE: ./node_modules/react-redux/es/index.js
var es = __webpack_require__(533);
// EXTERNAL MODULE: ./node_modules/@reduxjs/toolkit/dist/redux-toolkit.esm.js
var redux_toolkit_esm = __webpack_require__(9829);
// EXTERNAL MODULE: ./node_modules/redux/es/redux.js + 2 modules
var redux = __webpack_require__(8676);
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


;// CONCATENATED MODULE: ./addon/content/reducer/reducer-compose.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

 // Prefer the global browser object to the imported one.

window.browser = window.browser || thunderbird_compat_browser;
const initialCompose = {
  modified: false,
  sending: false,
  sendingMsg: ""
};
const composeSlice = redux_toolkit_esm/* createSlice */.oM({
  name: "compose",
  initialState: initialCompose,
  reducers: {
    setFromDetails(state, {
      payload
    }) {
      let userModified = payload.userModified;
      delete payload.userModified;

      if (!userModified || state.modified) {
        return { ...state,
          ...payload
        };
      }

      for (let [k, v] of Object.entries(payload)) {
        if (state[k] != v) {
          return { ...state,
            ...payload,
            modified: true
          };
        }
      } // If we get here, nothing changed.


      return state;
    },

    setSendStatus(state, {
      payload
    }) {
      let newState = { ...state
      };

      if ("sending" in payload) {
        newState.sending = payload.sending;
      }

      if ("modified" in payload) {
        newState.modified = payload.modified;
      }

      if ("sendingMsg" in payload) {
        newState.sendingMsg = payload.sendingMsg;
      }

      return newState;
    },

    resetStore() {
      return initialCompose;
    }

  }
});
const composeActions = {
  initCompose({
    accountId,
    identityId,
    to,
    subject
  }) {
    return async function (dispatch) {
      await dispatch(composeSlice.actions.resetStore()); // Set from to be the default account / identity.

      let accountDetail;

      if (!accountId) {
        let accounts = await browser.accounts.list();
        accountDetail = accounts[0];
      } else {
        accountDetail = await browser.accounts.get(accountId);
      }

      let identityDetail = identityId ? accountDetail.identities.find(i => i.id == identityId) : accountDetail.identities[0];
      await dispatch(composeSlice.actions.setFromDetails({
        userModified: false,
        from: identityDetail.email,
        identityId: identityDetail.id,
        email: identityDetail.email,
        to,
        subject
      }));
    };
  },

  setValue(name, value) {
    return async function (dispatch, getState) {
      let {
        from,
        to,
        subject,
        body
      } = getState().compose;
      await dispatch(composeSlice.actions.setFromDetails({
        from,
        to,
        subject,
        body,
        [name]: value,
        userModified: true
      }));
    };
  },

  resetStore() {
    return async dispatch => {
      await dispatch(composeSlice.actions.resetStore());
    };
  },

  sendMessage() {
    return async function (dispatch, getState) {
      let state = getState().compose;
      await dispatch(composeSlice.actions.setSendStatus({
        sending: true,
        sendingMsg: browser.i18n.getMessage("compose.sendingMessage")
      }));
      let success = true;

      try {
        await browser.convCompose.send({
          from: state.identityId,
          to: state.to,
          subject: state.subject,
          body: state.body || ""
        });
      } catch (ex) {
        console.error(ex);
        success = false;
      }

      await dispatch(composeSlice.actions.setSendStatus({
        sending: false,
        modified: false,
        sendingMsg: success ? "" : browser.i18n.getMessage("compose.couldntSendTheMessage")
      }));

      if (success) {
        await dispatch(composeActions.close());
      }
    };
  },

  /**
   * A generic close action that is designed to be overriden by compose in a
   * new tab, or by quick reply, so that it may be handled correctly.
   */
  close() {
    return async function (dispatch, getState) {};
  }

};
Object.assign(composeActions, composeSlice.actions);
;// CONCATENATED MODULE: ./addon/content/es-modules/utils.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/**
 * Take a name and extract initials from it.
 * If `name` is an email address, get the part before the @.
 * Then, capitalize the first letter of the first and last word (or the first
 * two letters of the first word if only one exists).
 *
 * @param {string} name
 * @returns {string}
 */
function getInitials(name) {
  name = name.trim().split("@")[0];
  let words = name.split(/[ .\-_]/).filter(function (word) {
    return word;
  });
  let initials = "??";
  let n = words.length;

  if (n == 1) {
    initials = words[0].substr(0, 2);
  } else if (n > 1) {
    initials = fixedCharAt(words[0], 0) + fixedCharAt(words[n - 1], 0);
  }

  return initials.toUpperCase();
} // Taken from
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/String/charAt#Fixing_charAt()_to_support_non-Basic-Multilingual-Plane_(BMP)_characters

function fixedCharAt(str, idx) {
  var ret = "";
  str += "";
  var end = str.length;
  var surrogatePairs = /[\uD800-\uDBFF][\uDC00-\uDFFF]/g;

  while (surrogatePairs.exec(str) != null) {
    var li = surrogatePairs.lastIndex;

    if (li - 2 < idx) {
      idx++;
    } else {
      break;
    }
  }

  if (idx >= end || idx < 0) {
    return "";
  }

  ret += str.charAt(idx);

  if (/[\uD800-\uDBFF]/.test(ret) && /[\uDC00-\uDFFF]/.test(str.charAt(idx + 1))) {
    // Go one further, since one of the "characters" is part of a surrogate pair
    ret += str.charAt(idx + 1);
  }

  return ret;
}
;// CONCATENATED MODULE: ./addon/content/reducer/contacts.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


/**
 * Adds necessary information for display contacts.
 *
 * @param {object} contact
 *   The contact details from the ContactManager.
 * @param {string} email
 *   The associated email for the contact.
 * @param {string} field
 *   The field of the email the contact is in, e.g. from, to, cc etc.
 * @param {string} nameFromEmail
 *   The name from the email address.
 * @param {boolean} showCondensed
 *   Whether or not to show condensed names.
 */

async function enrichWithDisplayData({
  contact,
  email,
  field,
  nameFromEmail,
  showCondensed
}) {
  // `name` is the only attribute that depend on `position`
  let name = contact.name || nameFromEmail || email;

  if (contact.identityId !== undefined) {
    name = field === "from" ? thunderbird_compat_browser.i18n.getMessage("message.meFromMeToSomeone") : thunderbird_compat_browser.i18n.getMessage("message.meFromSomeoneToMe");
  }

  const displayEmail = name != email ? email : "";
  const skipEmail = contact.contactId !== undefined && showCondensed;
  let data = {
    name,
    initials: getInitials(name),
    displayEmail: skipEmail ? "" : displayEmail,
    email,
    avatar: contact.photoURI,
    contactId: contact.contactId,
    colorStyle: {
      backgroundColor: contact.color
    }
  };
  return data;
}
/**
 * Walk through each message in `msgData` and fetch details about
 * each contact. When the details are fetched, merge them into the
 * message object itself.
 *
 * @export
 * @param {[object]} msgData
 */


async function mergeContactDetails(msgData) {
  let showCondensed = await thunderbird_compat_browser.conversations.getCorePref("mail.showCondensedAddresses");

  for (const message of msgData) {
    // We want to fetch the detailed data about every contact in the `_contactsData` object.
    // So fetch all the data upfront.
    for (const [field, contacts] of Object.entries(message._contactsData)) {
      const contactData = await Promise.all(contacts.map(async contact => [await thunderbird_compat_browser._background.request({
        type: "contactDetails",
        payload: contact
      }), // We need to keep the raw email around to format the data correctly
      contact.email, contact.name]));
      const formattedData = await Promise.all(contactData.map(([contact, email, name]) => enrichWithDisplayData({
        contact,
        email,
        field,
        nameFromEmail: name,
        showCondensed
      }))); // There is only ever one email in the `from` field. All the others are arrays.

      if (field === "from") {
        message[field] = formattedData[0];
      } else {
        message[field] = formattedData;
      }
    }
  }
}
;// CONCATENATED MODULE: ./addon/content/reducer/reducer-messages.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* global Conversation, BrowserSim, topMail3Pane */


 // Prefer the global browser object to the imported one.

window.browser = window.browser || thunderbird_compat_browser;
const initialMessages = {
  msgData: []
};

function modifyOnlyMsg(state, msgUri, modifier) {
  return { ...state,
    msgData: state.msgData.map(msg => msg.msgUri == msgUri ? modifier(msg) : msg)
  };
}

function modifyOnlyMsgId(state, id, modifier) {
  return { ...state,
    msgData: state.msgData.map(msg => msg.id == id ? modifier(msg) : msg)
  };
}

async function getPreference(name, defaultValue) {
  const prefs = await browser.storage.local.get("preferences");
  return prefs?.preferences?.[name] ?? defaultValue;
} // TODO: Once the WebExtension parts work themselves out a bit more,
// determine if this is worth sharing via a shared module with the background
// scripts, or if it doesn't need it.


async function setupConversationInTab(params, isInTab) {
  let isThreaded = params.get("isThreaded");
  isThreaded = !!parseInt(isThreaded); // If we start up Thunderbird with a saved conversation tab, then we
  // have no selected message. Fallback to the usual mode.

  if (!isThreaded && !topMail3Pane(window).gFolderDisplay.selectedMessage) {
    isThreaded = true;
  }

  if (window.frameElement) {
    window.frameElement.setAttribute("tooltip", "aHTMLTooltip");
  }

  const msgUrls = params.get("urls").split(",");
  const msgIds = [];

  for (const url of msgUrls) {
    const id = await browser.conversations.getMessageIdForUri(url);

    if (id) {
      msgIds.push(id);
    }
  } // It might happen that there are no messages left...


  if (!msgIds.length) {
    document.getElementById("messageList").textContent = browser.i18n.getMessage("message.movedOrDeletedConversation");
  } else {
    window.Conversations = {
      currentConversation: null,
      counter: 0
    };
    let freshConversation = new Conversation(window, // TODO: This should really become ids at some stage, but we need to
    // teach Conversation how to handle those.
    msgUrls, isThreaded, ++window.Conversations.counter, isInTab);
    let browserFrame = window.frameElement; // Because Thunderbird still hasn't fixed that...

    if (browserFrame) {
      browserFrame.setAttribute("context", "mailContext");
    }

    freshConversation.outputInto(window, async function (aConversation) {
      // This is a stripped-down version of what's in msgWindowApi.js,
      //  make sure the two are in sync!
      window.Conversations.currentConversation = aConversation;
      aConversation.completed = true; // TODO: Re-enable this.
      // registerQuickReply();
      // That's why we saved it before...
      // newComposeSessionByDraftIf();
      // TODO: expandQuickReply isn't defined anywhere. Should it be?
      // let willExpand = parseInt(params.get("willExpand"));
      // if (willExpand)
      //   expandQuickReply();
      // Create a new rule that will override the default rule, so that
      // the expanded quick reply is twice higher.

      document.body.classList.add("inTab"); // Do this now so as to not defeat the whole expand/collapse
      // logic.

      if (await browser.conversations.getCorePref("mailnews.mark_message_read.auto")) {
        const markAsReadAfterDelay = await browser.conversations.getCorePref("mailnews.mark_message_read.delay");
        let markAsReadDelay = 0;

        if (markAsReadAfterDelay) {
          markAsReadDelay = await browser.conversations.getCorePref("mailnews.mark_message_read.delay.interval");
        }

        setTimeout(function () {
          for (const id of msgIds) {
            browser.messages.update(id, {
              read: true
            }).catch(console.error);
          }
        }, markAsReadDelay * 1000);
      }
    });
  }
}

const messageActions = {
  waitForStartup() {
    return async dispatch => {
      const params = new URL(document.location).searchParams;
      const isInTab = params.has("urls");
      const topWin = topMail3Pane(window);
      await dispatch(summaryActions.setConversationState({
        isInTab,
        tabId: BrowserSim.getTabId(topWin, window),
        windowId: BrowserSim.getWindowId(topWin)
      }));
      const platformInfo = await browser.runtime.getPlatformInfo();
      const browserInfo = await browser.runtime.getBrowserInfo();
      const defaultFontSize = await browser.conversations.getCorePref("font.size.variable.x-western");
      const browserForegroundColor = await browser.conversations.getCorePref("browser.display.foreground_color");
      const browserBackgroundColor = await browser.conversations.getCorePref("browser.display.background_color");
      const defaultDetailsShowing = (await browser.conversations.getCorePref("mail.show_headers")) == 2;
      await dispatch(summaryActions.setSystemOptions({
        browserForegroundColor,
        browserBackgroundColor,
        defaultDetailsShowing,
        defaultFontSize,
        hideQuickReply: await getPreference("hide_quick_reply", false),
        OS: platformInfo.os,
        browserVersion: browserInfo.version
      }));

      if (!isInTab) {
        return;
      }

      await new Promise((resolve, reject) => {
        let tries = 0;

        function checkStarted() {
          let mainWindow = topMail3Pane(window);

          if (mainWindow.Conversations && mainWindow.Conversations.finishedStartup) {
            resolve();
          } else {
            // Wait up to 10 seconds, if it is that slow we're in trouble.
            if (tries >= 100) {
              console.error("Failed waiting for monkeypatch to finish startup");
              reject();
              return;
            }

            tries++;
            setTimeout(checkStarted, 100);
          }
        }

        checkStarted();
      });
      await dispatch(messageActions.initializeMessageThread({
        isInTab: true,
        params
      }));
    };
  },

  getLateAttachments({
    id
  }) {
    return async dispatch => {
      const attachments = await browser.conversations.getLateAttachments(id);
      const numAttachments = attachments.length; // This is bug 630011, remove when fixed

      const unknown = browser.i18n.getMessage("attachments.sizeUnknown");

      for (let i = 0; i < numAttachments; i++) {
        // -1 means size unknown
        let formattedSize = unknown;

        if (attachments[i].size != -1) {
          formattedSize = await browser.conversations.formatFileSize(attachments[i].size);
        }

        attachments[i].formattedSize = formattedSize;
      }

      await dispatch(messagesSlice.actions.msgUpdateDataId({
        msgData: {
          attachments,
          attachmentsPlural: await browser.conversations.makePlural(browser.i18n.getMessage("pluralForm"), browser.i18n.getMessage("attachments.numAttachments"), numAttachments),
          id,
          needsLateAttachments: false
        }
      }));
    };
  },

  initializeMessageThread({
    isInTab,
    params
  }) {
    return async (dispatch, getState) => {
      if (getState().summary.isInTab) {
        setupConversationInTab(params, isInTab).catch(console.error);
      }
    };
  },

  editDraft({
    id,
    shiftKey
  }) {
    return async () => {
      browser.conversations.beginEdit(id, "editDraft").catch(console.error);
    };
  },

  editAsNew({
    id,
    shiftKey
  }) {
    return async () => {
      browser.conversations.beginEdit(id, "editAsNew").catch(console.error);
    };
  },

  reply({
    id,
    shiftKey
  }) {
    return async () => {
      browser.conversations.beginReply(id, "replyToSender").catch(console.error);
    };
  },

  replyAll({
    id,
    shiftKey
  }) {
    return async () => {
      browser.conversations.beginReply(id, "replyToAll").catch(console.error);
    };
  },

  replyList({
    id,
    shiftKey
  }) {
    return async () => {
      browser.conversations.beginReply(id, "replyToList").catch(console.error);
    };
  },

  forward({
    id,
    shiftKey
  }) {
    return async () => {
      let forwardMode = (await browser.conversations.getCorePref("mail.forward_message_mode")) ?? 0;
      browser.conversations.beginForward(id, forwardMode == 0 ? "forwardAsAttachment" : "forwardInline").catch(console.error);
    };
  },

  archive({
    id
  }) {
    return async () => {
      browser.messages.archive([id]).catch(console.error);
    };
  },

  delete({
    id
  }) {
    return async () => {
      browser.messages.delete([id]).catch(console.error);
    };
  },

  openClassic({
    id
  }) {
    return async () => {
      browser.conversations.openInClassic(id).catch(console.error);
    };
  },

  openSource({
    id
  }) {
    return async () => {
      browser.conversations.openInSourceView(id).catch(console.error);
    };
  },

  setTags({
    id,
    tags
  }) {
    return async () => {
      browser.messages.update(id, {
        tags: tags.map(t => t.key)
      }).catch(console.error);
    };
  },

  toggleTagByIndex({
    id,
    index,
    tags
  }) {
    return async () => {
      browser.messages.listTags().then(allTags => {
        // browser.messages.update works via arrays of tag keys only,
        // so strip away all non-key information
        allTags = allTags.map(t => t.key);
        tags = tags.map(t => t.key);
        const toggledTag = allTags[index]; // Toggling a tag that is out of range does nothing.

        if (!toggledTag) {
          return null;
        }

        if (tags.includes(toggledTag)) {
          tags = tags.filter(t => t !== toggledTag);
        } else {
          tags.push(toggledTag);
        }

        return browser.messages.update(id, {
          tags
        });
      }).catch(console.error);
    };
  },

  setStarred({
    id,
    starred
  }) {
    return async () => {
      browser.messages.update(id, {
        flagged: starred
      }).catch(console.error);
    };
  },

  markAsRead({
    id
  }) {
    return async () => {
      browser.messages.update(id, {
        read: true
      }).catch(console.error);
    };
  },

  selected({
    msgUri
  }) {
    return async () => {
      if (window.Conversations?.currentConversation) {
        const msg = window.Conversations.currentConversation.getMessage(msgUri);

        if (msg) {
          msg.onSelected();
        }
      }
    };
  },

  toggleConversationRead({
    read
  }) {
    return async (dispatch, getState) => {
      const state = getState().messages;

      for (let msg of state.msgData) {
        browser.messages.update(msg.id, {
          read
        }).catch(console.error);
      }
    };
  },

  archiveConversation() {
    return async (dispatch, getState) => {
      const state = getState();
      let msgs;

      if (state.summary.isInTab || (await getPreference("operate_on_conversations", false))) {
        msgs = state.messages.msgData.map(msg => msg.id);
      } else {
        if ("getDisplayedMessages" in browser.messageDisplay) {
          msgs = await browser.messageDisplay.getDisplayedMessages(state.summary.tabId);
        } else {
          msgs = await browser.convMsgWindow.getDisplayedMessages(state.summary.tabId);
        }

        msgs = msgs.map(m => m.id);
      }

      browser.messages.archive(msgs).catch(console.error);
    };
  },

  deleteConversation() {
    return async (dispatch, getState) => {
      const state = getState();
      let msgs;

      if (state.summary.isInTab || (await getPreference("operate_on_conversations", false))) {
        msgs = state.messages.msgData.map(msg => msg.id);
      } else {
        if ("getDisplayedMessages" in browser.messageDisplay) {
          msgs = await browser.messageDisplay.getDisplayedMessages(state.summary.tabId);
        } else {
          msgs = await browser.convMsgWindow.getDisplayedMessages(state.summary.tabId);
        }

        msgs = msgs.map(m => m.id);
      }

      try {
        await browser.messages.delete(msgs);
      } catch (ex) {
        console.error(ex);
      }

      if (state.summary.isInTab) {
        // The additional nulls appear to be necessary due to our browser proxying.
        let currentTab = await browser.tabs.query({
          active: true,
          currentWindow: null,
          lastFocusedWindow: null,
          title: null,
          windowId: state.summary.windowId,
          windowType: null
        });
        await browser.tabs.remove(currentTab[0].id);
      }
    };
  },

  clickIframe({
    event
  }) {
    return () => {
      // Hand this off to Thunderbird's content clicking algorithm as that's simplest.
      if (!topMail3Pane(window).contentAreaClick(event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    };
  },

  showRemoteContent({
    id
  }) {
    return async dispatch => {
      await browser.conversations.showRemoteContent(id);
      const msg = window.Conversations.currentConversation.getMessageByApiId(id); // Turn remote content message "off", as although it has it, it can be loaded.

      msg.hasRemoteContent = false;
      const msgData = await msg.toReactData();
      dispatch(messagesSlice.actions.msgUpdateData({
        msgData
      }));
    };
  },

  alwaysShowRemoteContent({
    id,
    realFrom
  }) {
    return async dispatch => {
      await browser.conversations.alwaysShowRemoteContent(realFrom);
      const msg = window.Conversations.currentConversation.getMessageByApiId(id); // Turn remote content message "off", as although it has it, it can be loaded.

      msg.hasRemoteContent = false;
      const msgData = await msg.toReactData();
      dispatch(messagesSlice.actions.msgUpdateData({
        msgData
      }));
    };
  },

  detachTab() {
    return async (dispatch, getState) => {
      const state = getState(); // TODO: Fix re-enabling composition when expanded into new tab.
      // let willExpand = element.hasClass("expand") && startedEditing();
      // First, save the draft, and once it's saved, then move on to opening the
      // conversation in a new tab...
      // onSave(() => {

      const urls = state.messages.msgData.map(x => x.msgUri);
      BrowserSim.callBackgroundFunc("_window", "openConversation", [state.summary.windowId, urls // "&willExpand=" + Number(willExpand);
      ]);
    };
  },

  notificationClick({
    msgUri,
    notificationType,
    extraData
  }) {
    return async () => {
      const msg = window.Conversations.currentConversation.getMessage(msgUri);
      msg.msgPluginNotification(topMail3Pane(window), notificationType, extraData);
    };
  },

  tagClick({
    msgUri,
    event,
    details
  }) {
    return async () => {
      const msg = window.Conversations.currentConversation.getMessage(msgUri);
      msg.msgPluginTagClick(topMail3Pane(window), event, details);
    };
  },

  switchToFolderAndMsg({
    id
  }) {
    return async () => {
      browser.conversations.switchToFolderAndMsg(id).catch(console.error);
    };
  },

  sendUnsent() {
    return async () => {
      browser.conversations.sendUnsent().catch(console.error);
    };
  },

  ignorePhishing({
    id
  }) {
    return async dispatch => {
      await browser.conversations.ignorePhishing(id);
      await dispatch(messagesSlice.actions.msgUpdateDataId({
        msgData: {
          isPhishing: false
        }
      }));
    };
  },

  showMsgDetails({
    id,
    detailsShowing
  }) {
    return async (dispatch, getState) => {
      if (!detailsShowing) {
        await dispatch(messagesSlice.actions.msgHdrDetails({
          detailsShowing: false,
          id
        }));
        return;
      }

      let currentMsg = getState().messages.msgData.find(msg => msg.id == id); // If we already have header information, don't get it again.

      if (currentMsg?.extraLines?.length) {
        await dispatch(messagesSlice.actions.msgHdrDetails({
          detailsShowing: true,
          id
        }));
        return;
      }

      let msg = await browser.messages.getFull(id);

      try {
        let extraLines = [{
          key: browser.i18n.getMessage("message.headerFolder"),
          value: currentMsg.folderName
        }];
        const interestingHeaders = ["mailed-by", "x-mailer", "mailer", "date", "user-agent", "reply-to"];

        for (const h of interestingHeaders) {
          if (h in msg.headers) {
            let key = h; // Not all the header names are translated.

            if (h == "date") {
              key = browser.i18n.getMessage("message.headerDate");
            }

            extraLines.push({
              key,
              value: msg.headers[h]
            });
          }
        }

        extraLines.push({
          key: browser.i18n.getMessage("message.headerSubject"),
          value: currentMsg?.subject
        });
        dispatch(messagesSlice.actions.msgHdrDetails({
          extraLines,
          detailsShowing: true,
          id
        }));
      } catch (ex) {
        console.error(ex);
      }
    };
  },

  markAsJunk(action) {
    return async dispatch => {
      // This action should only be activated when the conversation is not a
      //  conversation in a tab AND there's only one message in the conversation,
      //  i.e. the currently selected message
      await browser.conversations.markSelectedAsJunk(action.isJunk).catch(console.error);
      dispatch(messagesSlice.actions.msgSetIsJunk(action));
    };
  }

};
const messagesSlice = redux_toolkit_esm/* createSlice */.oM({
  name: "messages",
  initialState: initialMessages,
  reducers: {
    /**
     * Update the message list either replacing or appending the messages.
     *
     * @param {object} messages
     *   The messages to insert or append.
     * @param {boolean} append
     *   Set to true to append messages, false to replace the current conversation.
     */
    updateConversation(state, {
      payload
    }) {
      const {
        messages,
        append
      } = payload;

      if (append) {
        return { ...state,
          msgData: state.msgData.concat(messages.msgData)
        };
      }

      return { ...state,
        ...messages
      };
    },

    msgExpand(state, {
      payload
    }) {
      return modifyOnlyMsg(state, payload.msgUri, msg => ({ ...msg,
        expanded: payload.expand
      }));
    },

    toggleConversationExpanded(state, {
      payload
    }) {
      return { ...state,
        msgData: state.msgData.map(m => ({ ...m,
          expanded: payload.expand
        }))
      };
    },

    msgUpdateData(state, {
      payload
    }) {
      return modifyOnlyMsg(state, payload.msgData.msgUri, msg => ({ ...msg,
        ...payload.msgData
      }));
    },

    msgUpdateDataId(state, {
      payload
    }) {
      return modifyOnlyMsgId(state, payload.msgData.id, msg => ({ ...msg,
        ...payload.msgData
      }));
    },

    msgAddSpecialTag(state, {
      payload
    }) {
      return modifyOnlyMsg(state, payload.uri, msg => ({ ...msg,
        specialTags: (msg.specialTags || []).concat(payload.tagDetails)
      }));
    },

    msgRemoveSpecialTag(state, {
      payload
    }) {
      return modifyOnlyMsg(state, payload.uri, msg => {
        if (msg.specialTags == null) {
          return msg;
        }

        return { ...msg,
          specialTags: msg.specialTags.filter(t => t.name != payload.tagDetails.name)
        };
      });
    },

    msgSetIsJunk(state, {
      payload
    }) {
      return payload.isJunk ? state : modifyOnlyMsgId(state, payload.id, msg => ({ ...msg,
        isJunk: false
      }));
    },

    msgHdrDetails(state, {
      payload
    }) {
      return modifyOnlyMsgId(state, payload.id, msg => {
        if (payload.extraLines != null) {
          return { ...msg,
            detailsShowing: payload.detailsShowing
          };
        }

        return { ...msg,
          detailsShowing: payload.detailsShowing,
          extraLines: payload.extraLines
        };
      });
    },

    removeMessageFromConversation(state, {
      payload
    }) {
      return { ...state,
        msgData: state.msgData.filter(m => m.msgUri !== payload.msgUri)
      };
    },

    clearScrollto(state, {
      payload
    }) {
      return modifyOnlyMsgId(state, payload.id, msg => {
        return { ...msg,
          scrollTo: false
        };
      });
    },

    msgShowNotification(state, {
      payload
    }) {
      return modifyOnlyMsg(state, payload.msgData.msgUri, msg => {
        // We put the notification on the end of the `extraNotifications` list
        // unless there is a notification with a matching type, in which case
        // we update it in place.
        let modifiedInPlace = false;
        let extraNotifications = (msg.extraNotifications || []).map(n => {
          if (n.type === payload.msgData.notification.type) {
            modifiedInPlace = true;
            return payload.msgData.notification;
          }

          return n;
        });

        if (!modifiedInPlace) {
          extraNotifications.push(payload.msgData.notification);
        }

        return { ...msg,
          extraNotifications
        };
      });
    }

  }
});
Object.assign(messageActions, messagesSlice.actions);
;// CONCATENATED MODULE: ./addon/content/reducer/reducer-quickReply.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


 // Prefer the global browser object to the imported one.

window.browser = window.browser || thunderbird_compat_browser;
const initialQuickReply = {
  expanded: false
};
const quickReplySlice = redux_toolkit_esm/* createSlice */.oM({
  name: "quickReply",
  initialState: initialQuickReply,
  reducers: {
    setExpandedState(state, {
      payload
    }) {
      return { ...state,
        expanded: payload.expanded
      };
    }

  }
});
const quickReplyActions = {
  expand({
    id
  }) {
    return async function (dispatch, getState) {
      let msg = await browser.messages.get(id);
      let accountDetail = await browser.accounts.get(msg.folder.accountId);
      let accountId;
      let identityId;

      if (accountDetail && accountDetail.identities.length) {
        accountId = accountDetail.id;
        identityId = accountDetail.identities[0].id;
      }

      let to = msg.author;
      let subject = msg.subject;

      if (!subject.toLowerCase().includes("re:")) {
        subject = "Re: " + subject;
      } // Initialise the compose section first, to avoid flicker, and ensure
      // the compose widget has the correct information to set focus correctly
      // on first render.


      await dispatch(composeActions.initCompose({
        accountId,
        identityId,
        to,
        subject
      }));
      await dispatch(quickReplySlice.actions.setExpandedState({
        expanded: true
      }));
    };
  },

  discard() {
    return async function (dispatch) {
      await dispatch(quickReplySlice.actions.setExpandedState({
        expanded: false
      }));
    };
  }

};

composeActions.close = () => {
  return async function (dispatch) {
    await dispatch(quickReplySlice.actions.setExpandedState({
      expanded: false
    }));
  };
};

Object.assign(quickReplyActions, quickReplySlice.actions);
;// CONCATENATED MODULE: ./addon/content/reducer/reducer-summary.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */

/* global Conversations, getMail3Pane, topMail3Pane, printConversation */





const initialSummary = {
  browserForegroundColor: "#000000",
  browserBackgroundColor: "#FFFFFF",
  conversation: null,
  defaultFontSize: 15,
  hasBuiltInPdf: false,
  hasIdentityParamsForCompose: false,
  hideQuickReply: false,
  iframesLoading: 0,
  isInTab: false,
  // TODO: What is loading used for?
  loading: true,
  OS: "win",
  tabId: null,
  tenPxFactor: 0.7,
  subject: "",
  windowId: null,
  defaultDetailsShowing: false
};

async function handleShowDetails(messages, state, dispatch, updateFn) {
  let defaultShowing = state.summary.defaultDetailsShowing;

  for (let msg of messages.msgData) {
    msg.detailsShowing = defaultShowing;
  }

  await updateFn();

  if (defaultShowing) {
    for (let msg of state.messages.msgData) {
      await dispatch(messageActions.showMsgDetails({
        id: msg.id,
        detailsShowing: true
      }));
    }
  }
}

const summaryActions = {
  /**
   * Update a conversation either replacing or appending the messages.
   *
   * @param {object} [summary]
   *   Only applies to replacing a conversation, the summary details to update.
   * @param {object} messages
   *   The messages to insert or append.
   * @param {boolean} append
   *   Set to true to append messages, false to replace the current conversation.
   */
  updateConversation({
    summary,
    messages,
    append
  }) {
    return async (dispatch, getState) => {
      await handleShowDetails(messages, getState(), dispatch, async () => {
        // The messages inside `msgData` don't come with filled in `to`/`from`/ect. fields.
        // We need to fill them in ourselves.
        await mergeContactDetails(messages.msgData);

        if (!append) {
          await dispatch(composeSlice.actions.resetStore());
          await dispatch(quickReplySlice.actions.setExpandedState({
            expanded: false
          }));
          await dispatch(summarySlice.actions.replaceSummaryDetails(summary));
        }

        return dispatch(messageActions.updateConversation({
          messages,
          append
        }));
      });
    };
  },

  showMessagesInvolving({
    name,
    email
  }) {
    return async (dispatch, getState) => {
      await browser.convContacts.showMessagesInvolving({
        email,
        title: browser.i18n.getMessage("involvingTabTitle", [name]),
        windowId: getState().summary.windowId
      }).catch(console.error);
    };
  },

  sendEmail({
    name,
    email
  }) {
    return async (dispatch, getState) => {
      let state = getState();
      let dest = await browser.convContacts.makeMimeAddress({
        name,
        email
      });

      if (state.summary.hasIdentityParamsForCompose) {
        // Ideally we should use the displayed folder, but the displayed message
        // works fine, as we'll only
        let tab = await browser.mailTabs.query({
          active: true,
          currentWindow: true
        });
        let account = await browser.accounts.get(tab[0].displayedFolder.accountId);
        await browser.compose.beginNew({
          identityId: account.identities[0]?.id,
          to: dest
        });
      } else {
        await browser.convContacts.composeNew({
          to: dest
        }).catch(console.error);
      }
    };
  },

  createFilter({
    email
  }) {
    return async (dispatch, getState) => {
      browser.conversations.createFilter(email, getState().summary.windowId).catch(console.error);
    };
  },

  copyEmail({
    email
  }) {
    return () => {
      navigator.clipboard.writeText(email);
    };
  },

  editContact({
    email
  }) {
    return () => {
      browser.convContacts.beginEdit({
        email
      });
    };
  },

  addContact({
    email,
    name
  }) {
    return () => {
      browser.convContacts.beginNew({
        email,
        displayName: name
      }); // TODO: In theory we should be updating the store so that the button can
      // then be updated to indicate this is now in the address book. However,
      // until we start getting the full conversation messages hooked up, this
      // won't be easy. As this is only a small bit of hidden UI, we can punt on
      // this for now.
    };
  },

  openLink({
    url
  }) {
    return () => {
      if ("openDefaultBrowser" in browser.windows) {
        browser.windows.openDefaultBrowser(url);
      } else {
        getMail3Pane().messenger.launchExternalURL(url);
      }
    };
  },

  printConversation() {
    return () => {
      // TODO: Fix printing
      printConversation();
    };
  },

  forwardConversation() {
    return async () => {
      try {
        await Conversations.currentConversation.forward();
      } catch (e) {
        console.error(e);
      }
    };
  },

  msgStreamLoadFinished({
    dueToExpansion,
    msgUri,
    iframe
  }) {
    return async (dispatch, getState) => {
      if (!dueToExpansion) {
        dispatch(summarySlice.actions.decIframesLoading());
      } // It might be that we're trying to send a message on unmount, but the
      // conversation/message has gone away. If that's the case, we just skip
      // and move on.


      const {
        summary
      } = getState();

      if (summary.conversation?.getMessage) {
        const msg = summary.conversation.getMessage(msgUri);

        if (msg) {
          msg.postStreamMessage(topMail3Pane(window), iframe);
        }
      }
    };
  },

  msgStreamMsg({
    dueToExpansion,
    msgUri,
    docshell
  }) {
    return async (dispatch, getState) => {
      if (!dueToExpansion) {
        dispatch(summarySlice.actions.incIframesLoading());
      }

      const {
        summary
      } = getState();
      let message = summary.conversation.getMessage(msgUri); // The message might not be found, if so it has probably been deleted from
      // under us, so just continue and not blow up.

      if (message) {
        message.streamMessage(topMail3Pane(window).msgWindow, docshell);
      } else {
        console.warn("Could not find message for streaming", msgUri);
      }
    };
  }

};
const summarySlice = redux_toolkit_esm/* createSlice */.oM({
  name: "summary",
  initialState: initialSummary,
  reducers: {
    incIframesLoading(state) {
      return { ...state,
        iframesLoading: state.iframesLoading + 1
      };
    },

    decIframesLoading(state) {
      return { ...state,
        // Never decrement below zero
        iframesLoading: Math.max(state.iframesLoading - 1, 0)
      };
    },

    setConversationState(state, {
      payload
    }) {
      const {
        isInTab,
        tabId,
        windowId
      } = payload;
      return { ...state,
        isInTab,
        tabId,
        windowId
      };
    },

    setSystemOptions(state, {
      payload
    }) {
      const {
        OS,
        browserForegroundColor,
        browserBackgroundColor,
        defaultFontSize,
        defaultDetailsShowing,
        browserVersion,
        hideQuickReply
      } = payload;
      let tenPxFactor = 0.625;

      if (OS == "mac") {
        tenPxFactor = 0.666;
      } else if (OS == "win") {
        tenPxFactor = 0.7;
      }

      let [mainVersion, minorVersion] = browserVersion?.split(".");
      return { ...state,
        browserForegroundColor,
        browserBackgroundColor,
        defaultFontSize,
        defaultDetailsShowing,
        // Thunderbird 81 has built-in PDF viewer.
        hasBuiltInPdf: mainVersion >= 81,
        hasIdentityParamsForCompose: mainVersion > 78 || mainVersion == 78 && minorVersion >= 6,
        hideQuickReply,
        OS,
        tenPxFactor
      };
    },

    replaceSummaryDetails(state, {
      payload
    }) {
      if (payload) {
        return { ...state,
          ...payload
        };
      }

      return state;
    }

  }
}); // We don't really care about drawing a distinction between
// actions and thunks, so we make the actions and thunks
// available from the same object.

Object.assign(summaryActions, summarySlice.actions);
globalThis.conversationSummaryActions = summaryActions;
;// CONCATENATED MODULE: ./addon/compose/reducer.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */




composeActions.close = () => {
  return async function (dispatch) {
    let currentTab = await browser.tabs.getCurrent();
    setTimeout(() => browser.tabs.remove(currentTab.id), 0);
  };
};

const composeApp = redux/* combineReducers */.UY({
  compose: composeSlice.reducer,
  summary: summarySlice.reducer
});
// EXTERNAL MODULE: ./node_modules/prop-types/index.js
var prop_types = __webpack_require__(5697);
var prop_types_default = /*#__PURE__*/__webpack_require__.n(prop_types);
;// CONCATENATED MODULE: ./addon/content/components/compose/composeFields.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */



const TextBox = /*#__PURE__*/react.forwardRef(({
  disabled = false,
  title,
  value = "",
  name,
  onChange = () => {}
}, ref) => {
  return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("div", null, /*#__PURE__*/react.createElement("label", null, thunderbird_compat_browser.i18n.getMessage(title))), /*#__PURE__*/react.createElement("div", null, /*#__PURE__*/react.createElement("input", {
    type: "text",
    ref: ref,
    value: value,
    onChange: e => {
      onChange(name, e.target.value);
    },
    disabled: disabled
  })));
});
TextBox.displayName = "TextBox";
TextBox.propTypes = {
  disabled: (prop_types_default()).bool,
  title: (prop_types_default()).string.isRequired,
  value: (prop_types_default()).string,
  name: (prop_types_default()).string.isRequired,
  onChange: (prop_types_default()).func.isRequired
};
const TextArea = /*#__PURE__*/react.forwardRef(({
  value = "",
  name,
  onChange = () => {}
}, ref) => {
  return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("div", null), /*#__PURE__*/react.createElement("div", null, /*#__PURE__*/react.createElement("textarea", {
    ref: ref,
    value: value,
    onChange: e => {
      onChange(name, e.target.value);
    }
  })));
});
TextArea.displayName = "TextArea";
TextArea.propTypes = {
  value: (prop_types_default()).string,
  name: (prop_types_default()).string.isRequired,
  onChange: (prop_types_default()).func.isRequired
};
;// CONCATENATED MODULE: ./addon/content/components/compose/composeWidget.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */




function ComposeWidget() {
  const dispatch = es/* useDispatch */.I0();
  const {
    composeState
  } = es/* useSelector */.v9(state => ({
    composeState: state.compose
  }));
  const bodyInput = /*#__PURE__*/react.createRef();
  const subjectInput = /*#__PURE__*/react.createRef();
  react.useEffect(() => {
    if (composeState.subject) {
      bodyInput.current.focus();
    } else {
      subjectInput.current.focus();
    }
  }, []);

  function onSend() {
    dispatch(composeActions.sendMessage());
  }

  function setValue(name, value) {
    dispatch(composeActions.setValue(name, value));
  } // Warn about unloading


  function checkBeforeUnload(event) {
    if (composeState.modified) {
      event.preventDefault();
    }
  }

  react.useEffect(() => {
    window.addEventListener("beforeunload", checkBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", checkBeforeUnload);
    };
  });
  return /*#__PURE__*/react.createElement("div", {
    className: "compose"
  }, /*#__PURE__*/react.createElement(TextBox, {
    name: "from",
    title: "message.fromHeader",
    disabled: true,
    value: composeState.from,
    sending: composeState.sending,
    onChange: setValue
  }), /*#__PURE__*/react.createElement(TextBox, {
    name: "to",
    title: "message.toHeader",
    value: composeState.to,
    sending: composeState.sending,
    onChange: setValue
  }), /*#__PURE__*/react.createElement(TextBox, {
    name: "subject",
    ref: subjectInput,
    title: "compose.fieldSubject",
    value: composeState.subject,
    sending: composeState.sending,
    onChange: setValue
  }), /*#__PURE__*/react.createElement(TextArea, {
    name: "body",
    ref: bodyInput,
    value: composeState.body,
    sending: composeState.sending,
    onChange: setValue
  }), /*#__PURE__*/react.createElement("div", null), /*#__PURE__*/react.createElement("div", {
    id: "sendStatus"
  }, composeState.sendingMsg), /*#__PURE__*/react.createElement("button", {
    id: "send",
    onClick: onSend,
    disabled: composeState.sending || !composeState.to || !composeState.subject
  }, browser.i18n.getMessage("compose.send")));
}
;// CONCATENATED MODULE: ./addon/compose/compose.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */





const store = redux_toolkit_esm/* configureStore */.xC({
  reducer: composeApp
});

function ComposeWrapper() {
  const {
    OS
  } = es/* useSelector */.v9(state => ({
    OS: state.summary.OS
  })); // TODO: Maybe should handle the tweak chrome option here.

  window.document.body.parentNode.setAttribute("os", OS);
  return /*#__PURE__*/react.createElement(ComposeWidget, null);
} // The entry point for the compose page


function Main() {
  return /*#__PURE__*/react.createElement(es/* Provider */.zt, {
    store: store
  }, /*#__PURE__*/react.createElement(ComposeWrapper, null));
}
;// CONCATENATED MODULE: ./addon/compose/compose-render.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */



 // Render the options to the root of the page

react_dom.render( /*#__PURE__*/react.createElement(Main, null), document.querySelector("#root"));
let params = new URLSearchParams(document.location.search);
store.dispatch(composeActions.initCompose({
  accountId: params.get("accountId"),
  identityId: params.get("identityId")
}));

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/************************************************************************/
/******/ 	/* webpack/runtime/chunk loaded */
/******/ 	(() => {
/******/ 		var deferred = [];
/******/ 		__webpack_require__.O = (result, chunkIds, fn, priority) => {
/******/ 			if(chunkIds) {
/******/ 				priority = priority || 0;
/******/ 				for(var i = deferred.length; i > 0 && deferred[i - 1][2] > priority; i--) deferred[i] = deferred[i - 1];
/******/ 				deferred[i] = [chunkIds, fn, priority];
/******/ 				return;
/******/ 			}
/******/ 			var notFulfilled = Infinity;
/******/ 			for (var i = 0; i < deferred.length; i++) {
/******/ 				var [chunkIds, fn, priority] = deferred[i];
/******/ 				var fulfilled = true;
/******/ 				for (var j = 0; j < chunkIds.length; j++) {
/******/ 					if ((priority & 1 === 0 || notFulfilled >= priority) && Object.keys(__webpack_require__.O).every((key) => (__webpack_require__.O[key](chunkIds[j])))) {
/******/ 						chunkIds.splice(j--, 1);
/******/ 					} else {
/******/ 						fulfilled = false;
/******/ 						if(priority < notFulfilled) notFulfilled = priority;
/******/ 					}
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferred.splice(i--, 1)
/******/ 					result = fn();
/******/ 				}
/******/ 			}
/******/ 			return result;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => (module['default']) :
/******/ 				() => (module);
/******/ 			__webpack_require__.d(getter, { a: getter });
/******/ 			return getter;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/define property getters */
/******/ 	(() => {
/******/ 		// define getter functions for harmony exports
/******/ 		__webpack_require__.d = (exports, definition) => {
/******/ 			for(var key in definition) {
/******/ 				if(__webpack_require__.o(definition, key) && !__webpack_require__.o(exports, key)) {
/******/ 					Object.defineProperty(exports, key, { enumerable: true, get: definition[key] });
/******/ 				}
/******/ 			}
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => (Object.prototype.hasOwnProperty.call(obj, prop))
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// [resolve, reject, Promise] = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			496: 0
/******/ 		};
/******/ 		
/******/ 		// no chunk on demand loading
/******/ 		
/******/ 		// no prefetching
/******/ 		
/******/ 		// no preloaded
/******/ 		
/******/ 		// no HMR
/******/ 		
/******/ 		// no HMR manifest
/******/ 		
/******/ 		__webpack_require__.O.j = (chunkId) => (installedChunks[chunkId] === 0);
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0;
/******/ 			for(moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) var result = runtime(__webpack_require__);
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					installedChunks[chunkId][0]();
/******/ 				}
/******/ 				installedChunks[chunkIds[i]] = 0;
/******/ 			}
/******/ 			return __webpack_require__.O(result);
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunkthunderbirdconversations"] = self["webpackChunkthunderbirdconversations"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module depends on other loaded chunks and execution need to be delayed
/******/ 	var __webpack_exports__ = __webpack_require__.O(undefined, [415,800,829,533], () => (__webpack_require__(6720)))
/******/ 	__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 	
/******/ })()
;