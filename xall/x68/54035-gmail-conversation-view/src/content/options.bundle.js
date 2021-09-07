/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 7294:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {



if (true) {
  module.exports = __webpack_require__(2408);
} else {}


/***/ }),

/***/ 6155:
/***/ ((__unused_webpack___webpack_module__, __unused_webpack___webpack_exports__, __webpack_require__) => {


// EXTERNAL MODULE: ./node_modules/react/index.js
var react = __webpack_require__(7294);
// EXTERNAL MODULE: ./node_modules/react-dom/index.js
var react_dom = __webpack_require__(3935);
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
/**
 * Handles loading of the preferences, and any migration routines that are
 * necessary.
 */

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
      }

      await browser.conversations.startup(results.preferences.logging_enabled);

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
    logging_enabled: true,
    expand_who: 4,
    uninstall_infos: "{}"
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
    },

    async getCorePref(name) {
      switch (name) {
        case "mail.showCondensedAddresses":
          return false;

        case "mailnews.mark_message_read.auto":
          return true;

        case "mailnews.mark_message_read.delay":
          return false;
      }

      throw new Error("Unexpected pref");
    },

    async getFolderName(name) {
      return "Fake/Folder";
    },

    async makeFriendlyDateAgo() {
      return "yesterday";
    },

    async formatFileSize(size) {
      return `${size} bars`;
    },

    async makePlural(form, string, count) {
      return `${string} ${count}`;
    },

    async isInView() {
      return true;
    },

    async quoteMsgHdr() {
      return "MsgBody";
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

if (!thunderbird_compat_browser.compose) {
  thunderbird_compat_browser.compose = {
    async beginNew() {}

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

if (!thunderbird_compat_browser.messages) {
  thunderbird_compat_browser.messages = {
    async listTags() {
      return [{
        key: "$label1",
        tag: "Important",
        color: "#ff2600",
        ordinal: ""
      }, {
        key: "$label2",
        tag: "Work",
        color: "#FF9900",
        ordinal: ""
      }, {
        color: "#009900",
        key: "$label3",
        ordinal: "",
        tag: "Personal"
      }];
    },

    async get(id) {
      return {};
    },

    async update(id) {}

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
    async quickSearch(queryInfo) {
      if (["foo@example.com", "bar@example.com"].includes(queryInfo.searchString)) {
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
      } else if (queryInfo.searchString == "id4@example.com") {
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
      } else if (queryInfo.searchString == "extra@example.com") {
        return [{
          id: "75312468",
          type: "contact",
          properties: {
            PrimaryEmail: "extra@example.com",
            DisplayName: "extra card",
            PreferDisplayName: "0",
            PhotoURI: "https://example.com/fake"
          },
          readOnly: true
        }];
      } else if (["arch@example.com", "cond@example.com"].includes(queryInfo.searchString)) {
        return [{
          id: "1357924680",
          type: "contact",
          properties: {
            PrimaryEmail: "search@example.com",
            SecondEmail: "second@example.com",
            DisplayName: "search name",
            PreferDisplayName: "1",
            PhotoURI: undefined
          }
        }, {
          id: "3216549870",
          type: "contact",
          properties: {
            PrimaryEmail: "arch@example.com",
            SecondEmail: "other@example.com",
            DisplayName: "arch test",
            PreferDisplayName: "1",
            PhotoURI: undefined
          }
        }, {
          id: "9753124680",
          type: "contact",
          properties: {
            PrimaryEmail: "another@example.com",
            SecondEmail: "cond@example.com",
            DisplayName: "cond test",
            PreferDisplayName: "1",
            PhotoURI: undefined
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


// EXTERNAL MODULE: ./node_modules/@reduxjs/toolkit/dist/redux-toolkit.esm.js
var redux_toolkit_esm = __webpack_require__(9829);
// EXTERNAL MODULE: ./node_modules/react-redux/es/components/Provider.js
var Provider = __webpack_require__(682);
// EXTERNAL MODULE: ./node_modules/react-redux/es/components/connectAdvanced.js
var connectAdvanced = __webpack_require__(6685);
// EXTERNAL MODULE: ./node_modules/react-redux/es/components/Context.js
var Context = __webpack_require__(6526);
// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/extends.js
var esm_extends = __webpack_require__(7462);
// EXTERNAL MODULE: ./node_modules/@babel/runtime/helpers/esm/objectWithoutPropertiesLoose.js
var objectWithoutPropertiesLoose = __webpack_require__(3366);
// EXTERNAL MODULE: ./node_modules/react-redux/es/utils/shallowEqual.js
var shallowEqual = __webpack_require__(5067);
// EXTERNAL MODULE: ./node_modules/react-redux/es/utils/bindActionCreators.js
var bindActionCreators = __webpack_require__(3480);
// EXTERNAL MODULE: ./node_modules/react-redux/es/connect/wrapMapToProps.js
var wrapMapToProps = __webpack_require__(6343);
;// CONCATENATED MODULE: ./node_modules/react-redux/es/connect/mapDispatchToProps.js


function whenMapDispatchToPropsIsFunction(mapDispatchToProps) {
  return typeof mapDispatchToProps === 'function' ? (0,wrapMapToProps/* wrapMapToPropsFunc */.xv)(mapDispatchToProps, 'mapDispatchToProps') : undefined;
}
function whenMapDispatchToPropsIsMissing(mapDispatchToProps) {
  return !mapDispatchToProps ? (0,wrapMapToProps/* wrapMapToPropsConstant */.dX)(function (dispatch) {
    return {
      dispatch: dispatch
    };
  }) : undefined;
}
function whenMapDispatchToPropsIsObject(mapDispatchToProps) {
  return mapDispatchToProps && typeof mapDispatchToProps === 'object' ? (0,wrapMapToProps/* wrapMapToPropsConstant */.dX)(function (dispatch) {
    return (0,bindActionCreators/* default */.Z)(mapDispatchToProps, dispatch);
  }) : undefined;
}
/* harmony default export */ const mapDispatchToProps = ([whenMapDispatchToPropsIsFunction, whenMapDispatchToPropsIsMissing, whenMapDispatchToPropsIsObject]);
;// CONCATENATED MODULE: ./node_modules/react-redux/es/connect/mapStateToProps.js

function whenMapStateToPropsIsFunction(mapStateToProps) {
  return typeof mapStateToProps === 'function' ? (0,wrapMapToProps/* wrapMapToPropsFunc */.xv)(mapStateToProps, 'mapStateToProps') : undefined;
}
function whenMapStateToPropsIsMissing(mapStateToProps) {
  return !mapStateToProps ? (0,wrapMapToProps/* wrapMapToPropsConstant */.dX)(function () {
    return {};
  }) : undefined;
}
/* harmony default export */ const mapStateToProps = ([whenMapStateToPropsIsFunction, whenMapStateToPropsIsMissing]);
;// CONCATENATED MODULE: ./node_modules/react-redux/es/connect/mergeProps.js


function defaultMergeProps(stateProps, dispatchProps, ownProps) {
  return (0,esm_extends/* default */.Z)({}, ownProps, stateProps, dispatchProps);
}
function wrapMergePropsFunc(mergeProps) {
  return function initMergePropsProxy(dispatch, _ref) {
    var displayName = _ref.displayName,
        pure = _ref.pure,
        areMergedPropsEqual = _ref.areMergedPropsEqual;
    var hasRunOnce = false;
    var mergedProps;
    return function mergePropsProxy(stateProps, dispatchProps, ownProps) {
      var nextMergedProps = mergeProps(stateProps, dispatchProps, ownProps);

      if (hasRunOnce) {
        if (!pure || !areMergedPropsEqual(nextMergedProps, mergedProps)) mergedProps = nextMergedProps;
      } else {
        hasRunOnce = true;
        mergedProps = nextMergedProps;
        if (false) {}
      }

      return mergedProps;
    };
  };
}
function whenMergePropsIsFunction(mergeProps) {
  return typeof mergeProps === 'function' ? wrapMergePropsFunc(mergeProps) : undefined;
}
function whenMergePropsIsOmitted(mergeProps) {
  return !mergeProps ? function () {
    return defaultMergeProps;
  } : undefined;
}
/* harmony default export */ const mergeProps = ([whenMergePropsIsFunction, whenMergePropsIsOmitted]);
// EXTERNAL MODULE: ./node_modules/react-redux/es/connect/selectorFactory.js
var connect_selectorFactory = __webpack_require__(8548);
;// CONCATENATED MODULE: ./node_modules/react-redux/es/connect/connect.js








/*
  connect is a facade over connectAdvanced. It turns its args into a compatible
  selectorFactory, which has the signature:

    (dispatch, options) => (nextState, nextOwnProps) => nextFinalProps
  
  connect passes its args to connectAdvanced as options, which will in turn pass them to
  selectorFactory each time a Connect component instance is instantiated or hot reloaded.

  selectorFactory returns a final props selector from its mapStateToProps,
  mapStateToPropsFactories, mapDispatchToProps, mapDispatchToPropsFactories, mergeProps,
  mergePropsFactories, and pure args.

  The resulting final props selector is called by the Connect component instance whenever
  it receives new props or store state.
 */

function match(arg, factories, name) {
  for (var i = factories.length - 1; i >= 0; i--) {
    var result = factories[i](arg);
    if (result) return result;
  }

  return function (dispatch, options) {
    throw new Error("Invalid value of type " + typeof arg + " for " + name + " argument when connecting component " + options.wrappedComponentName + ".");
  };
}

function strictEqual(a, b) {
  return a === b;
} // createConnect with default args builds the 'official' connect behavior. Calling it with
// different options opens up some testing and extensibility scenarios


function createConnect(_temp) {
  var _ref = _temp === void 0 ? {} : _temp,
      _ref$connectHOC = _ref.connectHOC,
      connectHOC = _ref$connectHOC === void 0 ? connectAdvanced/* default */.Z : _ref$connectHOC,
      _ref$mapStateToPropsF = _ref.mapStateToPropsFactories,
      mapStateToPropsFactories = _ref$mapStateToPropsF === void 0 ? mapStateToProps : _ref$mapStateToPropsF,
      _ref$mapDispatchToPro = _ref.mapDispatchToPropsFactories,
      mapDispatchToPropsFactories = _ref$mapDispatchToPro === void 0 ? mapDispatchToProps : _ref$mapDispatchToPro,
      _ref$mergePropsFactor = _ref.mergePropsFactories,
      mergePropsFactories = _ref$mergePropsFactor === void 0 ? mergeProps : _ref$mergePropsFactor,
      _ref$selectorFactory = _ref.selectorFactory,
      selectorFactory = _ref$selectorFactory === void 0 ? connect_selectorFactory/* default */.ZP : _ref$selectorFactory;

  return function connect(mapStateToProps, mapDispatchToProps, mergeProps, _ref2) {
    if (_ref2 === void 0) {
      _ref2 = {};
    }

    var _ref3 = _ref2,
        _ref3$pure = _ref3.pure,
        pure = _ref3$pure === void 0 ? true : _ref3$pure,
        _ref3$areStatesEqual = _ref3.areStatesEqual,
        areStatesEqual = _ref3$areStatesEqual === void 0 ? strictEqual : _ref3$areStatesEqual,
        _ref3$areOwnPropsEqua = _ref3.areOwnPropsEqual,
        areOwnPropsEqual = _ref3$areOwnPropsEqua === void 0 ? shallowEqual/* default */.Z : _ref3$areOwnPropsEqua,
        _ref3$areStatePropsEq = _ref3.areStatePropsEqual,
        areStatePropsEqual = _ref3$areStatePropsEq === void 0 ? shallowEqual/* default */.Z : _ref3$areStatePropsEq,
        _ref3$areMergedPropsE = _ref3.areMergedPropsEqual,
        areMergedPropsEqual = _ref3$areMergedPropsE === void 0 ? shallowEqual/* default */.Z : _ref3$areMergedPropsE,
        extraOptions = (0,objectWithoutPropertiesLoose/* default */.Z)(_ref3, ["pure", "areStatesEqual", "areOwnPropsEqual", "areStatePropsEqual", "areMergedPropsEqual"]);

    var initMapStateToProps = match(mapStateToProps, mapStateToPropsFactories, 'mapStateToProps');
    var initMapDispatchToProps = match(mapDispatchToProps, mapDispatchToPropsFactories, 'mapDispatchToProps');
    var initMergeProps = match(mergeProps, mergePropsFactories, 'mergeProps');
    return connectHOC(selectorFactory, (0,esm_extends/* default */.Z)({
      // used in error messages
      methodName: 'connect',
      // used to compute Connect's displayName from the wrapped component's displayName.
      getDisplayName: function getDisplayName(name) {
        return "Connect(" + name + ")";
      },
      // if mapStateToProps is falsy, the Connect component doesn't subscribe to store state changes
      shouldHandleStateChanges: Boolean(mapStateToProps),
      // passed through to selectorFactory
      initMapStateToProps: initMapStateToProps,
      initMapDispatchToProps: initMapDispatchToProps,
      initMergeProps: initMergeProps,
      pure: pure,
      areStatesEqual: areStatesEqual,
      areOwnPropsEqual: areOwnPropsEqual,
      areStatePropsEqual: areStatePropsEqual,
      areMergedPropsEqual: areMergedPropsEqual
    }, extraOptions));
  };
}
/* harmony default export */ const connect = (/*#__PURE__*/createConnect());
;// CONCATENATED MODULE: ./node_modules/react-redux/es/hooks/useReduxContext.js


/**
 * A hook to access the value of the `ReactReduxContext`. This is a low-level
 * hook that you should usually not need to call directly.
 *
 * @returns {any} the value of the `ReactReduxContext`
 *
 * @example
 *
 * import React from 'react'
 * import { useReduxContext } from 'react-redux'
 *
 * export const CounterComponent = ({ value }) => {
 *   const { store } = useReduxContext()
 *   return <div>{store.getState()}</div>
 * }
 */

function useReduxContext() {
  var contextValue = useContext(ReactReduxContext);

  if (false) {}

  return contextValue;
}
;// CONCATENATED MODULE: ./node_modules/react-redux/es/hooks/useStore.js



/**
 * Hook factory, which creates a `useStore` hook bound to a given context.
 *
 * @param {React.Context} [context=ReactReduxContext] Context passed to your `<Provider>`.
 * @returns {Function} A `useStore` hook bound to the specified context.
 */

function useStore_createStoreHook(context) {
  if (context === void 0) {
    context = ReactReduxContext;
  }

  var useReduxContext = context === ReactReduxContext ? useDefaultReduxContext : function () {
    return useContext(context);
  };
  return function useStore() {
    var _useReduxContext = useReduxContext(),
        store = _useReduxContext.store;

    return store;
  };
}
/**
 * A hook to access the redux store.
 *
 * @returns {any} the redux store
 *
 * @example
 *
 * import React from 'react'
 * import { useStore } from 'react-redux'
 *
 * export const ExampleComponent = () => {
 *   const store = useStore()
 *   return <div>{store.getState()}</div>
 * }
 */

var useStore = /*#__PURE__*/(/* unused pure expression or super */ null && (useStore_createStoreHook()));
;// CONCATENATED MODULE: ./node_modules/react-redux/es/hooks/useDispatch.js


/**
 * Hook factory, which creates a `useDispatch` hook bound to a given context.
 *
 * @param {React.Context} [context=ReactReduxContext] Context passed to your `<Provider>`.
 * @returns {Function} A `useDispatch` hook bound to the specified context.
 */

function createDispatchHook(context) {
  if (context === void 0) {
    context = ReactReduxContext;
  }

  var useStore = context === ReactReduxContext ? useDefaultStore : createStoreHook(context);
  return function useDispatch() {
    var store = useStore();
    return store.dispatch;
  };
}
/**
 * A hook to access the redux `dispatch` function.
 *
 * @returns {any|function} redux store's `dispatch` function
 *
 * @example
 *
 * import React, { useCallback } from 'react'
 * import { useDispatch } from 'react-redux'
 *
 * export const CounterComponent = ({ value }) => {
 *   const dispatch = useDispatch()
 *   const increaseCounter = useCallback(() => dispatch({ type: 'increase-counter' }), [])
 *   return (
 *     <div>
 *       <span>{value}</span>
 *       <button onClick={increaseCounter}>Increase counter</button>
 *     </div>
 *   )
 * }
 */

var useDispatch = /*#__PURE__*/(/* unused pure expression or super */ null && (createDispatchHook()));
// EXTERNAL MODULE: ./node_modules/react-redux/es/utils/Subscription.js
var utils_Subscription = __webpack_require__(6496);
// EXTERNAL MODULE: ./node_modules/react-redux/es/utils/useIsomorphicLayoutEffect.js
var utils_useIsomorphicLayoutEffect = __webpack_require__(1881);
;// CONCATENATED MODULE: ./node_modules/react-redux/es/hooks/useSelector.js






var refEquality = function refEquality(a, b) {
  return a === b;
};

function useSelectorWithStoreAndSubscription(selector, equalityFn, store, contextSub) {
  var _useReducer = useReducer(function (s) {
    return s + 1;
  }, 0),
      forceRender = _useReducer[1];

  var subscription = useMemo(function () {
    return new Subscription(store, contextSub);
  }, [store, contextSub]);
  var latestSubscriptionCallbackError = useRef();
  var latestSelector = useRef();
  var latestStoreState = useRef();
  var latestSelectedState = useRef();
  var storeState = store.getState();
  var selectedState;

  try {
    if (selector !== latestSelector.current || storeState !== latestStoreState.current || latestSubscriptionCallbackError.current) {
      var newSelectedState = selector(storeState); // ensure latest selected state is reused so that a custom equality function can result in identical references

      if (latestSelectedState.current === undefined || !equalityFn(newSelectedState, latestSelectedState.current)) {
        selectedState = newSelectedState;
      } else {
        selectedState = latestSelectedState.current;
      }
    } else {
      selectedState = latestSelectedState.current;
    }
  } catch (err) {
    if (latestSubscriptionCallbackError.current) {
      err.message += "\nThe error may be correlated with this previous error:\n" + latestSubscriptionCallbackError.current.stack + "\n\n";
    }

    throw err;
  }

  useIsomorphicLayoutEffect(function () {
    latestSelector.current = selector;
    latestStoreState.current = storeState;
    latestSelectedState.current = selectedState;
    latestSubscriptionCallbackError.current = undefined;
  });
  useIsomorphicLayoutEffect(function () {
    function checkForUpdates() {
      try {
        var newStoreState = store.getState();

        var _newSelectedState = latestSelector.current(newStoreState);

        if (equalityFn(_newSelectedState, latestSelectedState.current)) {
          return;
        }

        latestSelectedState.current = _newSelectedState;
        latestStoreState.current = newStoreState;
      } catch (err) {
        // we ignore all errors here, since when the component
        // is re-rendered, the selectors are called again, and
        // will throw again, if neither props nor store state
        // changed
        latestSubscriptionCallbackError.current = err;
      }

      forceRender();
    }

    subscription.onStateChange = checkForUpdates;
    subscription.trySubscribe();
    checkForUpdates();
    return function () {
      return subscription.tryUnsubscribe();
    };
  }, [store, subscription]);
  return selectedState;
}
/**
 * Hook factory, which creates a `useSelector` hook bound to a given context.
 *
 * @param {React.Context} [context=ReactReduxContext] Context passed to your `<Provider>`.
 * @returns {Function} A `useSelector` hook bound to the specified context.
 */


function createSelectorHook(context) {
  if (context === void 0) {
    context = ReactReduxContext;
  }

  var useReduxContext = context === ReactReduxContext ? useDefaultReduxContext : function () {
    return useContext(context);
  };
  return function useSelector(selector, equalityFn) {
    if (equalityFn === void 0) {
      equalityFn = refEquality;
    }

    if (false) {}

    var _useReduxContext = useReduxContext(),
        store = _useReduxContext.store,
        contextSub = _useReduxContext.subscription;

    var selectedState = useSelectorWithStoreAndSubscription(selector, equalityFn, store, contextSub);
    useDebugValue(selectedState);
    return selectedState;
  };
}
/**
 * A hook to access the redux store's state. This hook takes a selector function
 * as an argument. The selector is called with the store state.
 *
 * This hook takes an optional equality comparison function as the second parameter
 * that allows you to customize the way the selected state is compared to determine
 * whether the component needs to be re-rendered.
 *
 * @param {Function} selector the selector function
 * @param {Function=} equalityFn the function that will be used to determine equality
 *
 * @returns {any} the selected state
 *
 * @example
 *
 * import React from 'react'
 * import { useSelector } from 'react-redux'
 *
 * export const CounterComponent = () => {
 *   const counter = useSelector(state => state.counter)
 *   return <div>{counter}</div>
 * }
 */

var useSelector = /*#__PURE__*/(/* unused pure expression or super */ null && (createSelectorHook()));
// EXTERNAL MODULE: ./node_modules/react-redux/es/utils/batch.js
var batch = __webpack_require__(9256);
// EXTERNAL MODULE: ./node_modules/react-redux/es/utils/reactBatchedUpdates.js
var reactBatchedUpdates = __webpack_require__(1679);
;// CONCATENATED MODULE: ./node_modules/react-redux/es/index.js










(0,batch/* setBatch */.F)(reactBatchedUpdates/* unstable_batchedUpdates */.m);

// EXTERNAL MODULE: ./node_modules/prop-types/index.js
var prop_types = __webpack_require__(5697);
var prop_types_default = /*#__PURE__*/__webpack_require__.n(prop_types);
;// CONCATENATED MODULE: ./addon/options/options.jsx
function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
// TODO: Some of this preference code should be in the background script prefs.js,
// however we currently aren't able to use sendMessage to send to both the
// background script and to bootstrap.js.





const prefsSlice = redux_toolkit_esm/* createSlice */.oM({
  name: "prefs",
  initialState: {},
  reducers: {
    set(state, {
      payload
    }) {
      return { ...state,
        ...payload
      };
    }

  }
});
const actions = {
  initPrefs() {
    return async function (dispatch) {
      const prefs = await thunderbird_compat_browser.storage.local.get("preferences");
      dispatch(prefsSlice.actions.set(prefs.preferences));
    };
  },

  savePref(name, value) {
    return async function (dispatch, getState) {
      const newPrefs = { ...getState(),
        [name]: value
      };
      await thunderbird_compat_browser.storage.local.set({
        preferences: newPrefs
      });
      dispatch(prefsSlice.actions.set(newPrefs));
    };
  }

};
const store = redux_toolkit_esm/* configureStore */.xC({
  reducer: prefsSlice.reducer
});
store.dispatch(actions.initPrefs()); // A list of all preferences that can be set via the GUI.
// `desc` and `name` will get run through l10n before being rendered

const PREFS_INFO = [{
  props: {
    title: "",
    desc: "options.expand_who",
    name: "expand_who",
    choices: [{
      desc: "options.expand_none",
      value: 1
    }, {
      desc: "options.expand_all",
      value: 3
    }, {
      desc: "options.expand_auto",
      value: 4
    }]
  },
  component: ChoiceOption
}, {
  props: {
    title: "options.quoting_title",
    desc: "options.quoting_desc",
    name: "hide_quote_length"
  },
  component: NumericOption
}, {
  props: {
    title: "options.hide_sigs_title",
    desc: "options.hide_sigs_desc",
    name: "hide_sigs"
  },
  component: BinaryOption
}, {
  props: {
    title: "options.friendly_date_title",
    desc: "options.friendly_date_desc",
    name: "no_friendly_date"
  },
  component: BinaryOption
}, {
  props: {
    title: "options.tweak_chrome_title",
    desc: "options.tweak_chrome_desc",
    name: "tweak_chrome"
  },
  component: BinaryOption
}, {
  props: {
    title: "options.tweak_bodies_title",
    desc: "options.tweak_bodies_desc",
    name: "tweak_bodies"
  },
  component: BinaryOption
}, {
  props: {
    title: "options.operate_on_conversations_title",
    desc: "options.operate_on_conversations_desc",
    name: "operate_on_conversations"
  },
  component: BinaryOption
}, {
  props: {
    title: "options.extra_attachments_title",
    desc: "options.extra_attachments_desc",
    name: "extra_attachments"
  },
  component: BinaryOption
}, {
  props: {
    title: "options.hide_quick_reply_title",
    desc: "options.hide_quick_reply_desc",
    name: "hide_quick_reply"
  },
  component: BinaryOption
}, {
  props: {
    title: "options.compose_in_tab2_title",
    desc: "options.compose_in_tab2_desc",
    name: "compose_in_tab"
  },
  component: BinaryOption
}, {
  props: {
    title: "options.debugging_title",
    desc: "options.debugging_desc",
    name: "logging_enabled"
  },
  component: BinaryOption
}];
/**
 * Localize `PREFS_INFO` or a single string using
 * `i18n.getMessage(...)`
 *
 * @param {(string | object[])} prefsInfo
 * @param {object} [i18n]
 * @returns {(string | object[])}
 */

function localize(prefsInfo, i18n = thunderbird_compat_browser.i18n) {
  if (!i18n) {
    throw new Error("`i18n` object not specified");
  }

  if (typeof prefsInfo === "string") {
    return i18n.getMessage(prefsInfo);
  } // If `prefsInfo` is an array, it is an array of information used
  // to render the preference setting GUI. Localize all `desc` and `title`
  // properties


  if (Array.isArray(prefsInfo)) {
    return prefsInfo.map(pref => {
      const retProps = { ...pref.props
      };

      if (retProps.desc) {
        retProps.desc = i18n.getMessage(retProps.desc);
      }

      if (retProps.title) {
        retProps.title = i18n.getMessage(retProps.title);
      }

      if (retProps.choices) {
        retProps.choices = retProps.choices.map(choice => {
          if (choice.desc) {
            return { ...choice,
              desc: i18n.getMessage(choice.desc)
            };
          }

          return choice;
        });
      }

      return { ...pref,
        props: retProps
      };
    });
  }

  throw new Error("Don't know how to localize the object", prefsInfo);
}

function openSetupAssistant() {
  thunderbird_compat_browser.tabs.create({
    url: "../assistant/assistant.html"
  });
}

async function runUndoConversations() {
  const result = await thunderbird_compat_browser.storage.local.get("preferences");
  await thunderbird_compat_browser.conversations.undoCustomizations(result.preferences.uninstall_infos);
  result.preferences.uninstall_infos = "{}";
  await thunderbird_compat_browser.storage.local.set({
    preferences: result.preferences
  });
  window.alert(localize("options.undoCustomizations.finished", i18n));
} //
// React components to render the options types
//


function ChoiceOption({
  title,
  desc,
  choices = [],
  value,
  name,
  onChange
}) {
  const elementName = `choice_${title}`.replace(/\s+/g, "");
  return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("div", null, /*#__PURE__*/react.createElement("label", {
    className: "title"
  }, title), /*#__PURE__*/react.createElement("br", null), /*#__PURE__*/react.createElement("label", null, desc)), /*#__PURE__*/react.createElement("div", null, choices.map((choice, i) => /*#__PURE__*/react.createElement("span", {
    key: i
  }, /*#__PURE__*/react.createElement("input", {
    type: "radio",
    className: "pref",
    id: `${elementName}-${i}`,
    name: elementName,
    value: choice.value,
    checked: choice.value === value,
    onChange: () => {
      onChange(name, choice.value);
    }
  }), /*#__PURE__*/react.createElement("label", {
    htmlFor: `${elementName}-${i}`
  }, choice.desc)))));
}
ChoiceOption.propTypes = {
  title: (prop_types_default()).string,
  desc: (prop_types_default()).string,
  value: (prop_types_default()).any.isRequired,
  name: (prop_types_default()).string.isRequired,
  onChange: (prop_types_default()).func.isRequired,
  choices: prop_types_default().arrayOf(prop_types_default().shape({
    value: (prop_types_default()).any,
    desc: (prop_types_default()).string
  })).isRequired
};
function TextOption({
  title,
  desc,
  value = "",
  name,
  onChange = () => {}
}) {
  return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("div", null, /*#__PURE__*/react.createElement("label", {
    className: "title"
  }, title), /*#__PURE__*/react.createElement("br", null), /*#__PURE__*/react.createElement("label", null, desc)), /*#__PURE__*/react.createElement("div", null, /*#__PURE__*/react.createElement("input", {
    type: "text",
    className: "pref",
    value: value,
    onChange: e => {
      onChange(name, e.target.value);
    }
  })));
}
TextOption.propTypes = {
  title: (prop_types_default()).string,
  desc: (prop_types_default()).string,
  value: (prop_types_default()).string.isRequired,
  name: (prop_types_default()).string.isRequired,
  onChange: (prop_types_default()).func.isRequired
};
function NumericOption({
  title,
  desc,
  value = 0,
  name,
  onChange = () => {}
}) {
  return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("div", null, /*#__PURE__*/react.createElement("label", {
    className: "title"
  }, title), /*#__PURE__*/react.createElement("br", null), /*#__PURE__*/react.createElement("label", null, desc)), /*#__PURE__*/react.createElement("div", null, /*#__PURE__*/react.createElement("input", {
    type: "number",
    className: "pref",
    min: 0,
    onChange: e => {
      onChange(name, parseInt(e.target.value || value, 10));
    },
    value: value
  })));
}
NumericOption.propTypes = {
  title: (prop_types_default()).string,
  desc: (prop_types_default()).string,
  value: (prop_types_default()).number.isRequired,
  name: (prop_types_default()).string.isRequired,
  onChange: (prop_types_default()).func.isRequired
};
function BinaryOption({
  title,
  desc,
  value = false,
  name,
  onChange = () => {}
}) {
  return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("div", null, /*#__PURE__*/react.createElement("label", {
    className: "title"
  }, title), /*#__PURE__*/react.createElement("br", null), /*#__PURE__*/react.createElement("label", null, desc)), /*#__PURE__*/react.createElement("div", null, /*#__PURE__*/react.createElement("input", {
    type: "checkbox",
    className: "pref",
    checked: value,
    onChange: e => {
      onChange(name, e.target.checked);
    }
  })));
}
BinaryOption.propTypes = {
  title: (prop_types_default()).string,
  desc: (prop_types_default()).string,
  value: (prop_types_default()).bool.isRequired,
  name: (prop_types_default()).string.isRequired,
  onChange: (prop_types_default()).func.isRequired
};
/**
 * Render the options list for Conversations. `localizedPrefsInfo`
 * should be an array following the format of `PREFS_INFO`, but
 * localized. `localizedName` is the localized name of the extension.
 * `prefs` should be an object whose keys are the `name`s mentioned in
 * `localizedPrefsInfo`. And, `setPref` should be a function that accepts
 * `(name, value)` pairs and saves them as preferences.
 *
 * @param {object} root0
 * @param {object[]} root0.localizedPrefsInfo
 * @param {string} root0.localizedName
 * @param  {string}root0.localizedStartAssistant
 * @param {string} root0.localizedUndoCustomizations
 * @param {string} root0.localizedUndoCustomizationsTooltip
 * @param {object} root0.prefs
 * @param {Function} root0.setPref
 * @param {Function} root0.startSetupAssistant
 * @param {Function} root0.startUndoConversations
 * @returns {React.Node}
 */

function _ConversationOptions({
  localizedPrefsInfo,
  localizedName,
  localizedStartAssistant,
  localizedUndoCustomizations,
  localizedUndoCustomizationsTooltip,
  prefs,
  setPref,
  startSetupAssistant,
  startUndoConversations
}) {
  return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("h1", null, localizedName), /*#__PURE__*/react.createElement("form", {
    id: "conversationOptions"
  }, /*#__PURE__*/react.createElement("div", {
    id: "preferencesGrid"
  }, localizedPrefsInfo.map((Item, i) => /*#__PURE__*/react.createElement(Item.component, _extends({}, Item.props, {
    key: i,
    value: prefs[Item.props.name],
    onChange: setPref
  }))))), /*#__PURE__*/react.createElement("button", {
    className: "start",
    onClick: startSetupAssistant
  }, localizedStartAssistant), /*#__PURE__*/react.createElement("button", {
    className: "undo",
    onClick: startUndoConversations,
    title: localizedUndoCustomizationsTooltip
  }, localizedUndoCustomizations));
}

_ConversationOptions.propTypes = {
  localizedPrefsInfo: (prop_types_default()).array.isRequired,
  localizedName: (prop_types_default()).string.isRequired,
  localizedStartAssistant: (prop_types_default()).string.isRequired,
  localizedUndoCustomizations: (prop_types_default()).string.isRequired,
  localizedUndoCustomizationsTooltip: (prop_types_default()).string.isRequired,
  prefs: (prop_types_default()).object.isRequired,
  setPref: (prop_types_default()).func.isRequired,
  startSetupAssistant: (prop_types_default()).func.isRequired,
  startUndoConversations: (prop_types_default()).func.isRequired
};
const ConversationOptions = connect(state => ({
  prefs: state
}), {
  setPref: actions.savePref
})(_ConversationOptions); // The entry point for the options page

function Main() {
  const [localizedName, setLocalizedName] = react.useState(localize("extensionName", i18n));
  const [localizedPrefsInfo, setLocalizedPrefsInfo] = react.useState(localize(PREFS_INFO, i18n));
  const [localizedStartAssistant, setLocalizedStartAssistant] = react.useState(localize("options.start_setup_assistant", i18n));
  const [localizedUndoCustomizations, setLocalizedUndoCustomizations] = react.useState(localize("options.undoCustomizations", i18n));
  const [localizedUndoCustomizationsTooltip, setLocalizedUndoCustomizationsTooltip] = react.useState(localize("options.undoCustomizations.tooltip", i18n)); // When the i18n library is loaded, we want to translate all
  // the localized strings.

  react.useEffect(() => {
    if (!i18n.isPolyfilled) {
      // The native `browser.i18n` is synchronous, so if we're using
      // that version, the translations have already been loaded; do
      // nothing here
      return;
    }

    i18n.isLoaded.then(() => {
      setLocalizedName(localize("extensionName", i18n));
      setLocalizedPrefsInfo(localize(PREFS_INFO, i18n));
      setLocalizedStartAssistant(localize("options.start_setup_assistant", i18n));
      setLocalizedUndoCustomizations(localize("options.undoCustomizations", i18n));
      setLocalizedUndoCustomizationsTooltip(localize("options.undoCustomizations.tooltip", i18n));
    }).catch(e => {
      throw e;
    });
  }, []);
  return /*#__PURE__*/react.createElement(Provider/* default */.Z, {
    store: store
  }, /*#__PURE__*/react.createElement(ConversationOptions, {
    localizedPrefsInfo: localizedPrefsInfo,
    localizedName: localizedName,
    localizedStartAssistant: localizedStartAssistant,
    localizedUndoCustomizations: localizedUndoCustomizations,
    localizedUndoCustomizationsTooltip: localizedUndoCustomizationsTooltip,
    startSetupAssistant: openSetupAssistant,
    startUndoConversations: runUndoConversations
  }));
}
;// CONCATENATED MODULE: ./addon/options/options-render.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


 // Render the options to the root of the page

react_dom.render( /*#__PURE__*/react.createElement(Main, null), document.querySelector("#root"));

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
/******/ 					var r = fn();
/******/ 					if (r !== undefined) result = r;
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
/******/ 			798: 0
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
/******/ 	var __webpack_exports__ = __webpack_require__.O(undefined, [415,928,829,50], () => (__webpack_require__(6155)))
/******/ 	__webpack_exports__ = __webpack_require__.O(__webpack_exports__);
/******/ 	
/******/ })()
;