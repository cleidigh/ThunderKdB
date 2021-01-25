var { MailServices } = ChromeUtils.import("resource:///modules/MailServices.jsm");

var ACR = Ci.nsIAutoCompleteResult;
var nsIAbAutoCompleteResult = Ci.nsIAbAutoCompleteResult;
var gListeners = new Set();

// nsAbJsAutoCompleteResult
// Derived from nsIAbAutoCompleteResult, provides a JsAutoComplete specific
// result implementation.

function nsAbJsAutoCompleteResult(aSearchString) {
  // Can't create this in the prototype as we'd get the same array for
  // all instances
  this._searchResults = [];
  this.searchString = aSearchString;
}

nsAbJsAutoCompleteResult.prototype = {
  _searchResults: null,

  // nsIAutoCompleteResult

  searchString: null,
  searchResult: ACR.RESULT_NOMATCH,
  defaultIndex: -1,
  errorDescription: null,

  get matchCount() {
    return this._searchResults.length;
  },

  getLabelAt(aIndex) {
    return this.getValueAt(aIndex);
  },

  getValueAt(aIndex) {
    return this._searchResults[aIndex];
  },

  getCommentAt(aIndex) {
    return "";
  },

  getStyleAt(aIndex) {
    return "remote-abook";
  },

  getImageAt(aIndex) {
    return "";
  },

  getFinalCompleteValueAt(aIndex) {
    return this.getValueAt(aIndex);
  },

  removeValueAt(aRowIndex, aRemoveFromDB) {},

  // nsISupports

  QueryInterface: ChromeUtils.generateQI([ACR]),
};

/// Registration information for the autocomplete XPCOM object
var gAutoCompleteProperties = {
  baseClassID: Components.ID("{227e6482-fe9f-441f-9b7d-7b60375e7449}"),
  contractID: "@mozilla.org/autocomplete/search;1?name=ldap",
  classDescription: "Extension AutoComplete",
  classID: Components.ID("{c0fdab87-5867-4fe8-9aca-2fc6cb1e31bf}"),
};

function AbJsAutoCompleteSearch() {
  // Because of static components, we need to temporarily register the original contract ID.
  gComponentRegistrar.registerFactory(gAutoCompleteProperties.baseClassID, null, gAutoCompleteProperties.contractID, null);
  this._ldapSearch = Cc[gAutoCompleteProperties.contractID].createInstance(Ci.nsIAutoCompleteSearch);
  gComponentRegistrar.registerFactory(gAutoCompleteProperties.classID, null, gAutoCompleteProperties.contractID, null);
}

AbJsAutoCompleteSearch.prototype = {
  // The real LDAP search object.
  _ldapSearch: null,
  // The previous LDAP search result.
  _previousResult: null,
  // The current search result.
  _result: null,

  applicableHeaders: new Set(["addr_to", "addr_cc", "addr_bcc", "addr_reply"]),

  // Private methods

  // nsIAutoCompleteSearch

  startSearch(aSearchString, aParam, aPreviousResult, aListener) {
    // Try to start an LDAP search.
    // This will finish synchronously if LDAP is not configured.
    let usingLDAP = null;
    this._ldapSearch.startSearch(aSearchString, aParam, this._previousResult, {
      onSearchResult: (ldapSearch, result) => {
        if (usingLDAP) {
          this._previousResult = result;
          aListener.onSearchResult(this, result);
        } else {
          usingLDAP = false;
        }
      },
    });
    // No synchronous result, so we'll let LDAP complete.
    if (usingLDAP == null) {
      usingLDAP = true;
      return;
    }
    let params = JSON.parse(aParam) || {};
    let applicable =
      !("type" in params) || this.applicableHeaders.has(params.type);

    let result = new nsAbJsAutoCompleteResult(aSearchString);

    // If the search string isn't value, or contains a comma, or the user
    // hasn't enabled autocomplete, then just return no matches / or the
    // result ignored.
    // The comma check is so that we don't autocomplete against the user
    // entering multiple addresses.
    if (!applicable || !aSearchString || aSearchString.includes(",")) {
      result.searchResult = ACR.RESULT_IGNORED;
      aListener.onSearchResult(this, result);
      return;
    }

    this._result = result;
    let numSearches = gListeners.size;
    if (!numSearches) {
      aListener.onSearchResult(this, result);
    } else {
      gListeners.forEach(async listener => {
        try {
          let cards = await listener.async(aSearchString);
          for (let card of cards) {
            let value = MailServices.headerParser.makeMailboxObject(card.DisplayName, card.PrimaryEmail).toString();
            result._searchResults.push(value);
          }
        } catch (ex) {
          console.log(ex);
        }
        if (this._result != result) {
          return;
        }
        result.searchResult = result._searchResults.length ?
          --numSearches ? ACR.RESULT_SUCCESS_ONGOING : ACR.RESULT_SUCCESS :
          --numSearches ? ACR.RESULT_NOMATCH_ONGOING : ACR.RESULT_NOMATCH;
        aListener.onSearchResult(this, result);
      });
    }
  },

  stopSearch() {
    this._result = null;
    this._ldapSearch.stopSearch();
  },

  // nsISupports

  QueryInterface: ChromeUtils.generateQI([Ci.nsIAutoCompleteSearch]),
};

var gComponentRegistrar = Components.manager.QueryInterface(Ci.nsIComponentRegistrar);
// First try to unregister the factory in case this is a reinstallation.
try {
  let oldFactory = gComponentRegistrar.getClassObject(gAutoCompleteProperties.classID, Ci.nsIFactory);
  gComponentRegistrar.unregisterFactory(gAutoCompleteProperties.classID, oldFactory);
} catch (ex) {
  if (ex.result != Cr.NS_ERROR_FACTORY_NOT_REGISTERED) {
    throw ex;
  }
}
gAutoCompleteProperties.factory = XPCOMUtils._getFactory(AbJsAutoCompleteSearch);
gComponentRegistrar.registerFactory(gAutoCompleteProperties.classID, gAutoCompleteProperties.classDescription, gAutoCompleteProperties.contractID, gAutoCompleteProperties.factory);

this.autoComplete = class extends ExtensionAPI {
  getAPI(context) {
    return {
      autoComplete: {
        onAutoComplete: new ExtensionCommon.EventManager({ context, name: "autoComplete.onAutoComplete", register: (fire, args) => {
          gListeners.add(fire);
          return () => gListeners.delete(fire);
        }}).api(),
      }
    };
  }
};
