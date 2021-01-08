/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 347:
/***/ ((__unused_webpack___webpack_module__, __unused_webpack___webpack_exports__, __webpack_require__) => {


// EXTERNAL MODULE: ./node_modules/react/index.js
var react = __webpack_require__(294);
// EXTERNAL MODULE: ./node_modules/react-dom/index.js
var react_dom = __webpack_require__(935);
// EXTERNAL MODULE: ./addon/content/es-modules/thunderbird-compat.js + 1 modules
var thunderbird_compat = __webpack_require__(415);
// EXTERNAL MODULE: ./node_modules/@reduxjs/toolkit/dist/redux-toolkit.esm.js + 3 modules
var redux_toolkit_esm = __webpack_require__(407);
// EXTERNAL MODULE: ./node_modules/react-redux/es/index.js + 15 modules
var es = __webpack_require__(308);
// EXTERNAL MODULE: ./node_modules/prop-types/index.js
var prop_types = __webpack_require__(697);
var prop_types_default = /*#__PURE__*/__webpack_require__.n(prop_types);
;// CONCATENATED MODULE: ./addon/options/options.jsx
function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }

/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */
// TODO: Some of this preference code should be in the background script prefs.js,
// however we currently aren't able to use sendMessage to send to both the
// background script and to bootstrap.js.





const prefsSlice = redux_toolkit_esm.createSlice({
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
      const prefs = await thunderbird_compat/* browser.storage.local.get */.X.storage.local.get("preferences");
      dispatch(prefsSlice.actions.set(prefs.preferences));
    };
  },

  savePref(name, value) {
    return async function (dispatch, getState) {
      const newPrefs = { ...getState(),
        [name]: value
      };
      await thunderbird_compat/* browser.storage.local.set */.X.storage.local.set({
        preferences: newPrefs
      });
      dispatch(prefsSlice.actions.set(newPrefs));
    };
  }

};
const store = redux_toolkit_esm.configureStore({
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
 * @returns {(string | object[])}
 */

function localize(prefsInfo, i18n = thunderbird_compat/* browser.i18n */.X.i18n) {
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
  thunderbird_compat/* browser.tabs.create */.X.tabs.create({
    url: "../assistant/assistant.html"
  });
}

function runUndoConversations() {
  (async () => {
    await thunderbird_compat/* browser.conversations.undoCustomizations */.X.conversations.undoCustomizations();
    const result = await thunderbird_compat/* browser.storage.local.get */.X.storage.local.get("preferences");
    result.preferences.uninstall_infos = "{}";
    await thunderbird_compat/* browser.storage.local.set */.X.storage.local.set({
      preferences: result.preferences
    });
    window.alert(localize("options.undoCustomizations.finished", thunderbird_compat/* i18n */.a));
  })().catch(console.error);
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
 * @param {*} {
 *   localizedPrefsInfo,
 *   localizedName,
 *   prefs,
 *   setPref,
 * }
 * @returnType {React.Node}
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
const ConversationOptions = es/* connect */.$j(state => ({
  prefs: state
}), {
  setPref: actions.savePref
})(_ConversationOptions); // The entry point for the options page

function Main() {
  const [localizedName, setLocalizedName] = react.useState(localize("extensionName", thunderbird_compat/* i18n */.a));
  const [localizedPrefsInfo, setLocalizedPrefsInfo] = react.useState(localize(PREFS_INFO, thunderbird_compat/* i18n */.a));
  const [localizedStartAssistant, setLocalizedStartAssistant] = react.useState(localize("options.start_setup_assistant", thunderbird_compat/* i18n */.a));
  const [localizedUndoCustomizations, setLocalizedUndoCustomizations] = react.useState(localize("options.undoCustomizations", thunderbird_compat/* i18n */.a));
  const [localizedUndoCustomizationsTooltip, setLocalizedUndoCustomizationsTooltip] = react.useState(localize("options.undoCustomizations.tooltip", thunderbird_compat/* i18n */.a)); // When the i18n library is loaded, we want to translate all
  // the localized strings.

  react.useEffect(() => {
    if (!thunderbird_compat/* i18n.isPolyfilled */.a.isPolyfilled) {
      // The native `browser.i18n` is synchronous, so if we're using
      // that version, the translations have already been loaded; do
      // nothing here
      return;
    }

    thunderbird_compat/* i18n.isLoaded.then */.a.isLoaded.then(() => {
      setLocalizedName(localize("extensionName", thunderbird_compat/* i18n */.a));
      setLocalizedPrefsInfo(localize(PREFS_INFO, thunderbird_compat/* i18n */.a));
      setLocalizedStartAssistant(localize("options.start_setup_assistant", thunderbird_compat/* i18n */.a));
      setLocalizedUndoCustomizations(localize("options.undoCustomizations", thunderbird_compat/* i18n */.a));
      setLocalizedUndoCustomizationsTooltip(localize("options.undoCustomizations.tooltip", thunderbird_compat/* i18n */.a));
    }).catch(e => {
      throw e;
    });
  }, []);
  return /*#__PURE__*/react.createElement(es/* Provider */.zt, {
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
/******/ 		if(__webpack_module_cache__[moduleId]) {
/******/ 			return __webpack_module_cache__[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			id: moduleId,
/******/ 			loaded: false,
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = __webpack_modules__;
/******/ 	
/******/ 	// the startup function
/******/ 	// It's empty as some runtime module handles the default behavior
/******/ 	__webpack_require__.x = x => {}
/************************************************************************/
/******/ 	/* webpack/runtime/compat get default export */
/******/ 	(() => {
/******/ 		// getDefaultExport function for compatibility with non-harmony modules
/******/ 		__webpack_require__.n = (module) => {
/******/ 			var getter = module && module.__esModule ?
/******/ 				() => module['default'] :
/******/ 				() => module;
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
/******/ 	/* webpack/runtime/global */
/******/ 	(() => {
/******/ 		__webpack_require__.g = (function() {
/******/ 			if (typeof globalThis === 'object') return globalThis;
/******/ 			try {
/******/ 				return this || new Function('return this')();
/******/ 			} catch (e) {
/******/ 				if (typeof window === 'object') return window;
/******/ 			}
/******/ 		})();
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/harmony module decorator */
/******/ 	(() => {
/******/ 		__webpack_require__.hmd = (module) => {
/******/ 			module = Object.create(module);
/******/ 			if (!module.children) module.children = [];
/******/ 			Object.defineProperty(module, 'exports', {
/******/ 				enumerable: true,
/******/ 				set: () => {
/******/ 					throw new Error('ES Modules may not assign module.exports or exports.*, Use ESM export syntax, instead: ' + module.id);
/******/ 				}
/******/ 			});
/******/ 			return module;
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/hasOwnProperty shorthand */
/******/ 	(() => {
/******/ 		__webpack_require__.o = (obj, prop) => Object.prototype.hasOwnProperty.call(obj, prop)
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/make namespace object */
/******/ 	(() => {
/******/ 		// define __esModule on exports
/******/ 		__webpack_require__.r = (exports) => {
/******/ 			if(typeof Symbol !== 'undefined' && Symbol.toStringTag) {
/******/ 				Object.defineProperty(exports, Symbol.toStringTag, { value: 'Module' });
/******/ 			}
/******/ 			Object.defineProperty(exports, '__esModule', { value: true });
/******/ 		};
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/runtimeId */
/******/ 	(() => {
/******/ 		__webpack_require__.j = 798;
/******/ 	})();
/******/ 	
/******/ 	/* webpack/runtime/jsonp chunk loading */
/******/ 	(() => {
/******/ 		// no baseURI
/******/ 		
/******/ 		// object to store loaded and loading chunks
/******/ 		// undefined = chunk not loaded, null = chunk preloaded/prefetched
/******/ 		// Promise = chunk loading, 0 = chunk loaded
/******/ 		var installedChunks = {
/******/ 			798: 0
/******/ 		};
/******/ 		
/******/ 		var deferredModules = [
/******/ 			[347,592]
/******/ 		];
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
/******/ 		var checkDeferredModules = x => {};
/******/ 		
/******/ 		// install a JSONP callback for chunk loading
/******/ 		var webpackJsonpCallback = (parentChunkLoadingFunction, data) => {
/******/ 			var [chunkIds, moreModules, runtime, executeModules] = data;
/******/ 			// add "moreModules" to the modules object,
/******/ 			// then flag all "chunkIds" as loaded and fire callback
/******/ 			var moduleId, chunkId, i = 0, resolves = [];
/******/ 			for(;i < chunkIds.length; i++) {
/******/ 				chunkId = chunkIds[i];
/******/ 				if(__webpack_require__.o(installedChunks, chunkId) && installedChunks[chunkId]) {
/******/ 					resolves.push(installedChunks[chunkId][0]);
/******/ 				}
/******/ 				installedChunks[chunkId] = 0;
/******/ 			}
/******/ 			for(moduleId in moreModules) {
/******/ 				if(__webpack_require__.o(moreModules, moduleId)) {
/******/ 					__webpack_require__.m[moduleId] = moreModules[moduleId];
/******/ 				}
/******/ 			}
/******/ 			if(runtime) runtime(__webpack_require__);
/******/ 			if(parentChunkLoadingFunction) parentChunkLoadingFunction(data);
/******/ 			while(resolves.length) {
/******/ 				resolves.shift()();
/******/ 			}
/******/ 		
/******/ 			// add entry modules from loaded chunk to deferred list
/******/ 			if(executeModules) deferredModules.push.apply(deferredModules, executeModules);
/******/ 		
/******/ 			// run deferred modules when all chunks ready
/******/ 			return checkDeferredModules();
/******/ 		}
/******/ 		
/******/ 		var chunkLoadingGlobal = self["webpackChunkthunderbirdconversations"] = self["webpackChunkthunderbirdconversations"] || [];
/******/ 		chunkLoadingGlobal.forEach(webpackJsonpCallback.bind(null, 0));
/******/ 		chunkLoadingGlobal.push = webpackJsonpCallback.bind(null, chunkLoadingGlobal.push.bind(chunkLoadingGlobal));
/******/ 		
/******/ 		function checkDeferredModulesImpl() {
/******/ 			var result;
/******/ 			for(var i = 0; i < deferredModules.length; i++) {
/******/ 				var deferredModule = deferredModules[i];
/******/ 				var fulfilled = true;
/******/ 				for(var j = 1; j < deferredModule.length; j++) {
/******/ 					var depId = deferredModule[j];
/******/ 					if(installedChunks[depId] !== 0) fulfilled = false;
/******/ 				}
/******/ 				if(fulfilled) {
/******/ 					deferredModules.splice(i--, 1);
/******/ 					result = __webpack_require__(__webpack_require__.s = deferredModule[0]);
/******/ 				}
/******/ 			}
/******/ 			if(deferredModules.length === 0) {
/******/ 				__webpack_require__.x();
/******/ 				__webpack_require__.x = x => {};
/******/ 			}
/******/ 			return result;
/******/ 		}
/******/ 		var startup = __webpack_require__.x;
/******/ 		__webpack_require__.x = () => {
/******/ 			// reset startup function so it can be called again when more startup code is added
/******/ 			__webpack_require__.x = startup || (x => {});
/******/ 			return (checkDeferredModules = checkDeferredModulesImpl)();
/******/ 		};
/******/ 	})();
/******/ 	
/************************************************************************/
/******/ 	// run startup
/******/ 	return __webpack_require__.x();
/******/ })()
;