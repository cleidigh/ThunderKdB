/******/ (() => { // webpackBootstrap
/******/ 	"use strict";
/******/ 	var __webpack_modules__ = ({

/***/ 657:
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
;// CONCATENATED MODULE: ./addon/compose/composeFields.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */




function TextBox({
  disabled = false,
  title,
  value = "",
  name,
  onChange = () => {}
}) {
  return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("div", null, /*#__PURE__*/react.createElement("label", null, title)), /*#__PURE__*/react.createElement("div", null, /*#__PURE__*/react.createElement("input", {
    type: "text",
    value: value,
    onChange: e => {
      onChange(name, e.target.value);
    },
    disabled: disabled
  })));
}
TextBox.propTypes = {
  disabled: (prop_types_default()).bool.isRequired,
  title: (prop_types_default()).string,
  value: (prop_types_default()).string,
  name: (prop_types_default()).string.isRequired,
  onChange: (prop_types_default()).func.isRequired
};
function TextArea({
  value = "",
  name,
  onChange = () => {}
}) {
  return /*#__PURE__*/react.createElement(react.Fragment, null, /*#__PURE__*/react.createElement("div", null), /*#__PURE__*/react.createElement("div", null, /*#__PURE__*/react.createElement("textarea", {
    value: value,
    onChange: e => {
      onChange(name, e.target.value);
    }
  })));
}
TextArea.propTypes = {
  value: (prop_types_default()).string,
  name: (prop_types_default()).string.isRequired,
  onChange: (prop_types_default()).func.isRequired
};
;// CONCATENATED MODULE: ./addon/compose/compose.jsx
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


function _extends() { _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; }; return _extends.apply(this, arguments); }






 //
// Create the redux store and appropriate actions/thunks
// using Redux Toolkit (RTK)
//

const {
  createSlice,
  configureStore
} = redux_toolkit_esm;
const initialState = {
  modified: false,
  os: "win",
  sending: false,
  sendingMsg: ""
};
const composeSlice = createSlice({
  name: "compose",
  initialState,
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
      return initialState;
    }

  }
});
const actions = {
  initCompose(accountId, identityId) {
    return async function (dispatch) {
      // Set from to be the default account / identity.
      let accountDetail;

      if (!accountId) {
        let accounts = await thunderbird_compat/* browser.accounts.list */.X.accounts.list();
        accountDetail = accounts[0];
      } else {
        accountDetail = await thunderbird_compat/* browser.accounts.get */.X.accounts.get(accountId);
      }

      let identityDetail = identityId ? accountDetail.identities.find(i => i.id == identityId) : accountDetail.identities[0];
      const platformInfo = await thunderbird_compat/* browser.runtime.getPlatformInfo */.X.runtime.getPlatformInfo();
      await dispatch(composeSlice.actions.setFromDetails({
        userModified: false,
        from: identityDetail.email,
        identityId: identityDetail.id,
        email: identityDetail.email,
        os: platformInfo.os
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
      } = getState();
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
      let state = getState();
      await dispatch(composeSlice.actions.setSendStatus({
        sending: true,
        sendingMsg: thunderbird_compat/* i18n.getMessage */.a.getMessage("compose.sendingMessage")
      }));
      let success = true;

      try {
        await thunderbird_compat/* browser.convCompose.send */.X.convCompose.send({
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
        sendingMsg: success ? "" : thunderbird_compat/* i18n.getMessage */.a.getMessage("compose.couldntSendTheMessage")
      }));

      if (success) {
        let currentTab = await thunderbird_compat/* browser.tabs.getCurrent */.X.tabs.getCurrent();
        setTimeout(() => thunderbird_compat/* browser.tabs.remove */.X.tabs.remove(currentTab.id), 0);
      }
    };
  }

};
const store = configureStore({
  reducer: composeSlice.reducer
});
const INPUT_FIELDS = [{
  props: {
    name: "from",
    title: "message.fromHeader",
    disabled: true
  },
  component: TextBox
}, {
  props: {
    name: "to",
    title: "message.toHeader",
    disabled: false
  },
  component: TextBox
}, {
  props: {
    name: "subject",
    title: "compose.fieldSubject",
    disabled: false
  },
  component: TextBox
}, {
  props: {
    name: "body",
    disabled: false
  },
  component: TextArea
}];

function _Compose({
  details,
  fieldsInfo,
  localizedSendButton,
  setValue,
  sendMessage
}) {
  function onSend() {
    sendMessage();
  } // Warn about unloading


  function checkBeforeUnload(event) {
    if (details.modified) {
      event.preventDefault();
    }
  }

  react.useEffect(() => {
    window.addEventListener("beforeunload", checkBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", checkBeforeUnload);
    };
  }); // TODO: We may need to be able to jest before we can remove these
  // undefined checks.

  const html = window.document && window.document.body && window.document.body.parentNode;

  if (html) {
    // TODO: Maybe should handle the tweak chrome option here.
    html.setAttribute("os", details.os);
  }

  return /*#__PURE__*/react.createElement("div", {
    className: "compose"
  }, fieldsInfo.map((Item, i) => /*#__PURE__*/react.createElement(Item.component, _extends({}, Item.props, {
    disabled: Item.props.disabled || details.sending,
    key: i,
    value: details[Item.props.name],
    sending: details.sending,
    onChange: setValue
  }))), /*#__PURE__*/react.createElement("div", null), /*#__PURE__*/react.createElement("div", {
    id: "sendStatus"
  }, details.sendingMsg), /*#__PURE__*/react.createElement("button", {
    id: "send",
    onClick: onSend,
    disabled: details.sending || !details.to || !details.subject
  }, localizedSendButton));
}

_Compose.propTypes = {
  details: (prop_types_default()).object.isRequired,
  fieldsInfo: (prop_types_default()).array.isRequired,
  localizedSendButton: (prop_types_default()).string.isRequired,
  sendMessage: (prop_types_default()).func.isRequired,
  setValue: (prop_types_default()).func.isRequired
};
const Compose = es/* connect */.$j(state => ({
  details: state
}), {
  setValue: actions.setValue,
  sendMessage: actions.sendMessage
})(_Compose);
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

      if (retProps.title) {
        retProps.title = i18n.getMessage(retProps.title);
      }

      return { ...pref,
        props: retProps
      };
    });
  }

  throw new Error("Don't know how to localize the object", prefsInfo);
} // The entry point for the options page


function Main() {
  const [fieldsInfo, setFieldsInfo] = react.useState(localize(INPUT_FIELDS, thunderbird_compat/* i18n */.a));
  const [localizedSendButton, setLocalizedSendButton] = react.useState(localize("compose.send", thunderbird_compat/* i18n */.a)); // When the i18n library is loaded, we want to translate all
  // the localized strings.

  react.useEffect(() => {
    if (!thunderbird_compat/* i18n.isPolyfilled */.a.isPolyfilled) {
      // The native `browser.i18n` is syncronous, so if we're using
      // that version, the translations have already been loaded; do
      // nothing here
      return;
    }

    thunderbird_compat/* i18n.isLoaded.then */.a.isLoaded.then(() => {
      setFieldsInfo(localize(INPUT_FIELDS, thunderbird_compat/* i18n */.a));
      setLocalizedSendButton(localize("compose.send", thunderbird_compat/* i18n */.a));
    }).catch(e => {
      throw e;
    });
  }, []);
  return /*#__PURE__*/react.createElement(es/* Provider */.zt, {
    store: store
  }, /*#__PURE__*/react.createElement(Compose, {
    fieldsInfo: fieldsInfo,
    localizedSendButton: localizedSendButton
  }));
}
;// CONCATENATED MODULE: ./addon/compose/compose-render.js
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at https://mozilla.org/MPL/2.0/. */


 // Render the options to the root of the page

react_dom.render( /*#__PURE__*/react.createElement(Main, null), document.querySelector("#root"));
let params = new URLSearchParams(document.location.search);
store.dispatch(actions.initCompose(params.get("accountId"), params.get("identityId")));

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
/******/ 		__webpack_require__.j = 496;
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
/******/ 			496: 0
/******/ 		};
/******/ 		
/******/ 		var deferredModules = [
/******/ 			[657,592]
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