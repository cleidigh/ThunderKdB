const Ci = Components.interfaces;
const Cu = Components.utils;

Cu.import('resource://gre/modules/XPCOMUtils.jsm');

const CLASS_ID = Components.ID('bacc1cc1-0d61-4c47-b65d-823b074280b4');
const CLASS_NAME = "REST AutoComplete Issue";
const CONTRACT_ID = '@mozilla.org/autocomplete/search;1?name=rest-autocomplete-issue';

/**
 * @constructor
 *
 * @see https://developer.mozilla.org/en-US/docs/How_to_implement_custom_autocomplete_search_component#Basic_example_for_Gecko_2.0_and_up_%28Firefox_4_.2F_Thunderbird_3.3_.2F_SeaMonkey_2.1%29
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

		QueryInterface: ChromeUtils.generateQI([ Ci.nsIAutoCompleteResult ])
};


/**
 * @constructor
 *
 * @implements {nsIAutoCompleteSearch}
 */
function ProviderAutoCompleteSearch() {
	;
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
		 * @param previousResult a previous result to use for faster searching
		 * @param listener the listener to notify when the search is complete
		 */
		startSearch: function(searchString, searchParam, previousResult, listener) {
			var consoleService = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
			// consoleService.logStringMessage("rest-autocomplete-issue:startSearch() searchString " + searchString);
			//get preferences
			var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
			prefs = prefs.getBranch("extensions.createjiraissue.");
			var jiraurl = prefs.getCharPref("jiraurl");
			// consoleService.logStringMessage("rest-autocomplete-issue:startSearch() jiraurl " + jiraurl);
			var username = null;
			var password = null;
			// get username and password from password manager
			var loginManager = Components.classes["@mozilla.org/login-manager;1"].getService(Components.interfaces.nsILoginManager);
			//var nsLoginInfo = new Components.Constructor("@mozilla.org/login-manager/loginInfo;1", Components.interfaces.nsILoginInfo, "init");
			var logins = loginManager.findLogins("chrome://createjiraissue", null, "Jira Login");
			if (logins.length > 0) {
				username = logins[0].username;
				password = logins[0].password;
			} else {
				window.openDialog("chrome://createjiraissue/content/options.xul", "createjiraissuePreferences", "chrome, titlebar, toolbar, dialog=yes, resizable=yes").focus();
				return;
			}
			var that = this;
			var xmlhttp = Components.classes["@mozilla.org/xmlextras/xmlhttprequest;1"].createInstance();
			var lowerSearchString = searchString.toLowerCase();
			var url = jiraurl + "/rest/api/latest/search?jql=issuekey=" + lowerSearchString;
			// consoleService.logStringMessage("rest-autocomplete-issue:startSearch() url " + url);
			var credentials = btoa(username + ":" + password);
			xmlhttp.open("GET", url, true, username, password);
			xmlhttp.setRequestHeader("Authorization","Basic " + credentials);
			xmlhttp.send(null);
			xmlhttp.onreadystatechange = function() {
				if (xmlhttp.readyState == 4) {
					if ( xmlhttp.status == 200) {
						var results = JSON.parse(xmlhttp.responseText);
						// consoleService.logStringMessage("rest-autocomplete-issue:startSearch() results " + results);
						var filteredResults = new Array();
						var filteredComments = new Array();
						for ( var i = 0; i < results.length; i++ ) {
							var result = results[i].name;
							filteredResults.push(result);
							result = results[i].displayName;
							filteredComments.push(result);
						}
						filteredResults.sort();
						var autocomplete_result = new ProviderAutoCompleteResult(searchString,
								Ci.nsIAutoCompleteResult.RESULT_SUCCESS, 0, "", filteredResults, filteredComments);

						listener.onSearchResult(that, autocomplete_result);
					} else {
						var autocomplete_result = new ProviderAutoCompleteResult(searchString,
								Ci.nsIAutoCompleteResult.RESULT_SUCCESS, 0, "Error ->" + xmlhttp.status + " " + xmlhttp.statusText, null, null);

						listener.onSearchResult(that, autocomplete_result);
					}
				}
			};
		},

		/**
		 * Stops an asynchronous search that is in progress
		 */
		stopSearch: function() {
		},

		QueryInterface: ChromeUtils.generateQI([ Ci.nsIAutoCompleteSearch ])
};

//The following line is what XPCOM uses to create components
const NSGetFactory =
	XPCOMUtils.generateNSGetFactory([ ProviderAutoCompleteSearch ]);