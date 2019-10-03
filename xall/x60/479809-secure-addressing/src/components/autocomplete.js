const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');
Cu.import("chrome://secure-addressing/content/memcache.js");
Cu.import("chrome://secure-addressing/content/ablib.js");
Cu.import("chrome://secure-addressing/content/prefs.js");
Cu.import("chrome://secure-addressing/content/log.js");
Cu.import("resource://gre/modules/Timer.jsm");

const CLASS_ID = Components.ID('480d8220-6b99-11e3-981f-0800200c9a66');
const CLASS_NAME = "Basic AutoComplete";
const CONTRACT_ID = '@mozilla.org/autocomplete/search;1?name=basic-autocomplete';


/**
 * @constructor
 *
 * @implements {nsIAutoCompleteResult}
 *
 * @param {string} searchString
 * @param {number} searchResult
 * @param {number} defaultIndex
 * @param {string} errorDescription
 * @param {Array.<string>} results
 * @param {Array.<string>|null=} comments
 */
function ProviderAutoCompleteResult(searchString, searchResult,
  defaultIndex, errorDescription, results, comments) {
  this._searchString = searchString;
  this._searchResult = searchResult;
  this._defaultIndex = defaultIndex;
  this._errorDescription = errorDescription;
  this._results = results;
  this._comments = comments;
}

ProviderAutoCompleteResult.prototype = {
  _searchString: "",
  _searchResult: 0,
  _defaultIndex: 0,
  _errorDescription: "",
  _results: [],
  _comments: [],

  /**
   * @return {string} the original search string
   */
  get searchString() {
    return this._searchString;
  },

  /**
   * @return {number} the result code of this result object, either:
   *   RESULT_IGNORED   (invalid searchString)
   *   RESULT_FAILURE   (failure)
   *   RESULT_NOMATCH   (no matches found)
   *   RESULT_SUCCESS   (matches found)
   */
  get searchResult() {
    return this._searchResult;
  },

  /**
   * @return {number} the index of the default item that should be entered if
   *   none is selected
   */
  get defaultIndex() {
    return this._defaultIndex;
  },

  /**
   * @return {string} description of the cause of a search failure
   */
  get errorDescription() {
    return this._errorDescription;
  },

  /**
   * @return {number} the number of matches
   */
  get matchCount() {
    return this._results.length;
  },

  /**
   * @return {string} the value of the result at the given index
   */
  getValueAt: function(index) {
    return this._results[index];
  },

  /**
   * @return {string} the comment of the result at the given index
   */
  getCommentAt: function(index) {
    if (this._comments)
      return this._comments[index];
    else
      return '';
  },

  /**
   * @return {string} the style hint for the result at the given index
   */
  getStyleAt: function(index) {
    if (!this._comments || !this._comments[index])
      return null;  // not a category label, so no special styling

    if (index == 0)
      return 'suggestfirst';  // category label on first line of results

    return 'suggesthint';   // category label on any other line of results
  },

  /**
   * Gets the image for the result at the given index
   *
   * @return {string} the URI to the image to display
   */
  getImageAt : function (index) {
    return '';
  },

  /**
   * Get the final value that should be completed when the user confirms
   * the match at the given index.
   * @return {string} the final value of the result at the given index 
   **/
   getFinalCompleteValueAt: function(index) {
     return this.getValueAt(index);
   },

  /**
   * Removes the value at the given index from the autocomplete results.
   * If removeFromDb is set to true, the value should be removed from
   * persistent storage as well.
   */
  removeValueAt: function(index, removeFromDb) {
    this._results.splice(index, 1);

    if (this._comments)
      this._comments.splice(index, 1);
  },

  getLabelAt: function(index) { return this._results[index]; },

  QueryInterface: XPCOMUtils.generateQI([ Ci.nsIAutoCompleteResult ])
};


/**
 * @constructor
 *
 * @implements {nsIAutoCompleteSearch}
 */
function ProviderAutoCompleteSearch() {
}


ProviderAutoCompleteSearch.prototype = {

  classID: CLASS_ID,
  classDescription : CLASS_NAME,
  contractID : CONTRACT_ID,

  /**
   * Searches for a given string and notifies a listener (either synchronously
   * or asynchronously) of the result
   *
   * @param searchString the string to search for
   * @param searchParam an extra parameter
   * @param previousResult a previous result to use for faster searchinig
   * @param listener the listener to notify when the search is complete
   */


    startSearch: function(searchString, searchParam, previousResult, listener) {
        let abManager = Components.classes["@mozilla.org/abmanager;1"]
                            .getService(Components.interfaces.nsIAbManager);
        let allAddressBooks = abManager.directories;

        let obj = this;
        let success = function(results) {
            let autocomplete_result = new ProviderAutoCompleteResult(searchString,
                        Ci.nsIAutoCompleteResult.RESULT_SUCCESS, 0, "", results, null);
            listener.onSearchResult(obj, autocomplete_result);
        };
        let fail = function(n) {
            let results = [];
            let desc = n + " results found";
            let autocomplete_result = new ProviderAutoCompleteResult(searchString,
                        Ci.nsIAutoCompleteResult.RESULT_NOMATCH, -1, desc, [], null);
            listener.onSearchResult(obj, autocomplete_result);
        };

        let qlist = [];
        let ablist;
        let domains = SaGetPrefAry("internal_domain");
        let subt = 0;
        let external = false;
        let extended = false;
        let ss = searchString;

        if (searchString.match(/^\* */)) {
            ss = searchString.replace(/^\* */, "");
            external = true;
        }            
        if (searchString.match(/^\+ */)) {
            ss = searchString.replace(/^\+ */, "");
            extended = true;
        }            
        //log("string = " + ss + ", external = " + external + 
        //    ", extended = " + extended + "\n");
        if (ss.length < 5) {
            return;
        }

        qlist.push([{key: "PrimaryEmail", op: "c", value: "@"}]);

        if (external) {
            for(let i = 0; i < domains.length; i++) {
                qlist.push([{key: "PrimaryEmail", op: "!c", value: domains[i]}]);
            }
            ablist = SaGetPrefAry("ab_external_ac");
        } else {
            ablist = new Array();
            let abl = SaGetPrefAry("ab_internal_ac");
            if (extended) {
                for(let i = 0; i < abl.length; i++) {
                    if (abl[i] != "+") {
                        ablist.push(abl[i]);
                    }
                }
            } else {
                for(let i = 0; i < abl.length; i++) {
                    if (abl[i] == "+") {
                        break;
                    }
                    ablist.push(abl[i]);
                }
            }
            if (domains.length > 0) {
                let subq = new Array();
                for(let i = 0; i < domains.length; i++) {
                    subq.push({key: "PrimaryEmail", op: "c", value: domains[i]});
                }
                qlist.push(subq);
            }
        }
        //log("ablist = " + ablist.join("; ") + "\n");
        let qitems = ss.split(/\s+/);
        let nitems = 0;
        let targets = SaGetPrefAry("ab_search_target");
        for(let i = 0; i < qitems.length; i++) {
            if (qitems[i] != "") {
                let subq = new Array();
                for(let j = 0; j < targets.length; j++) {
                    subq.push({key: targets[j], op: "c", value: qitems[i]});
                }
                qlist.push(subq);
                nitems++;
            }
        }
        if (nitems == 0) {
            //log("nitems == 0\n");
            return;
        }

        let emails = new Object();
        let finished = false;
        let timeout = function() {
            //log("timeout called: " + searchString + "\n");
            if (finished) {
                return;
            }
            finished = true;
            let len = 0;
            for(let e in emails) {len++};
            //log(len + " candidates for " + searchString + "\n");
            let acmaxitem = SaGetPrefInt("autocomplete_max");
            if ((len == 0) || (len > acmaxitem)) {
                fail(len);
                return;
            }
            //log("found = " + len + "\n");
            let results = new Array();
            for(let e in emails) {
                let cb = function(obj, data, error, hit) {
                    //log("final callback: data = " + data + "\n");
                    let retstr;
                    if (data) {
                        retstr = createDisplayString(data);
                    } else {
                        retstr = createDisplayString(emails[e]);
                    }
                    results.push(retstr);
                    //log("ok = " + results.length + "\n");
                    if (len == results.length) {
                        success(results);
                    }
                };
                //log("candidate email = " + e + "\n");
                memcacheSearchForDisplay(e, cb, 0);
            }
        };

        let alllocal = true;
        let done = 0;
        let callback = function(idx, items, remote) {
            if (remote) {
                alllocal = false;
            }
            done++;
            for(let i = 0; i < items.length; i++) {
                emails[items[i].email] = items[i];
            }
            if ((done == ablist.length) && alllocal) {
                timeout();
            }
        };

        for(let i = 0; i < ablist.length; i++) {
            getAbEnt(ablist[i], qlist, callback, 0, 5.0, 0.2, timeout);
        }
        return;
    },

  /**
   * Stops an asynchronous search that is in progress
   */
  stopSearch: function() {
  },

  QueryInterface: XPCOMUtils.generateQI([ Ci.nsIAutoCompleteSearch ])
};

// The following line is what XPCOM uses to create components
const NSGetFactory =
  XPCOMUtils.generateNSGetFactory([ ProviderAutoCompleteSearch ]);
  
