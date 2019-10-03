const Ci = Components.interfaces;

const CLASS_ID = Components.ID("35e49567-cc9f-4648-ba50-bac367c76015");
const CLASS_NAME = "Subject Manager AutoCompletion";
const CONTRACT_ID = "@mozilla.org/autocomplete/search;1?name=subjectmanager-autocompletion";


function NSGetFactory(cid)
{
	if ( cid.toString().toUpperCase() != CLASS_ID.toString().toUpperCase() ) {
		throw Components.results.NS_ERROR_FACTORY_NOT_REGISTERED;
	}

	return SubjectManagerAutoCompleteSearchFactory;
};

// Implements nsIAutoCompleteResult
function SubjectManagerAutoCompleteResult(searchString, searchResult, defaultIndex, errorDescription, results, comments)
{
	this._searchString = searchString;
	this._searchResult = searchResult;
	this._defaultIndex = defaultIndex;
	this._errorDescription = errorDescription;
	this._results = results;
	this._comments = comments;
};

SubjectManagerAutoCompleteResult.prototype =
{
	_searchString : "",
	_searchResult : 0,
	_defaultIndex : 0,
	_errorDescription : "",
	_results : [],
	_comments : [],

	/**
	 * The original search string
	 */
	get searchString()
	{
		return this._searchString;
	},

	/**
	 * The result code of this result object, either:
	 *				 RESULT_IGNORED	 (invalid searchString)
	 *				 RESULT_FAILURE	 (failure)
	 *				 RESULT_NOMATCH	 (no matches found)
	 *				 RESULT_SUCCESS	 (matches found)
	 */
	get searchResult()
	{
		return this._searchResult;
	},

	/**
	 * Index of the default item that should be entered if none is selected
	 */
	get defaultIndex()
	{
		return this._defaultIndex;
	},

	/**
	 * A string describing the cause of a search failure
	 */
	get errorDescription()
	{
		return this._errorDescription;
	},

	/**
	 * The number of matches
	 */
	get matchCount()
	{
		return this._results.length;
	},

	/**
	 * Get the value of the result at the given index
	 */
	getValueAt : function (index)
	{
		return this._results[index];
	},

	/**
	 * Get the comment of the result at the given index
	 */
	getCommentAt : function (index)
	{
		return this._comments[index];
	},

	/**
	 * Get the style hint for the result at the given index
	 */
	getStyleAt : function (index)
	{
		if ( !this._comments[index] ) {
			return null; // not a category label, so no special styling
		}

		if ( index == 0 ) {
			return "suggestfirst"; // category label on first line of results
		}

		return "suggesthint"; // category label on any other line of results
	},

	/**
	 * Get the image for the result at the given index
	 * The return value is expected to be an URI to the image to display
	 */
	getImageAt : function (index)
	{
		return "";
	},

	/**
	 * Get the final value that should be completed when the user confirms
	 * the match at the given index.
	 * @return {string} the final value of the result at the given index 
	 */
	getFinalCompleteValueAt : function (index)
	{
		return this.getValueAt(index);
	},

	/**
	 * Remove the value at the given index from the autocomplete results.
	 * If removeFromDb is set to true, the value should be removed from
	 * persistent storage as well.
	 */
	removeValueAt : function (index, removeFromDb)
	{
		this._results.splice(index, 1);
		this._comments.splice(index, 1);
	},

	QueryInterface : function (aIID)
	{
		if ( !aIID.equals(Ci.nsIAutoCompleteResult) && !aIID.equals(Ci.nsISupports) ) {
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}

		return this;
	},

	getLabelAt : function (index)
	{
		return this._results[index];
	}
};


// Implements nsIAutoCompleteSearch
function SubjectManagerAutoCompleteSearch()
{
	this.componentAddOnName = "SubjectManager";
	this.componentPrefs = Components.classes["@mozilla.org/preferences-service;1"]
						.getService(Components.interfaces.nsIPrefService)
						.getBranch("extensions." + this.componentAddOnName + ".");
	this.componentPrefs.QueryInterface(Components.interfaces.nsIPrefBranch);
};

SubjectManagerAutoCompleteSearch.prototype =
{
	/**
	 * Search for a given string and notify a listener (either synchronously
	 * or asynchronously) of the result
	 *
	 * @param searchString - The string to search for
	 * @param searchParam - An extra parameter
	 * @param previousResult - A previous result to use for faster searchinig
	 * @param listener - A listener to notify when the search is complete
	 */
	startSearch : function (searchString, searchParam, result, listener)
	{
		var subjectBoxAutoCompleteCaseSensitive = this.componentPrefs.getBoolPref("subjectBoxAutoCompleteCaseSensitive");

		// This autocomplete source assumes the developer attached a JSON string
		// to the the "autocompletesearchparam" attribute or "searchParam" property
		// of the <textbox> element. The JSON is converted into an array and used
		// as the source of match data. Any values that match the search string
		// are moved into temporary arrays and passed to the AutoCompleteResult
		if ( searchParam.length > 0 ) {
			var searchResults = JSON.parse(searchParam);
			var results = [];
			var comments = [];

			var tmpSearchString = "";
			var tmpSearchResult = "";

			tmpSearchString = ( subjectBoxAutoCompleteCaseSensitive ) ? searchString : searchString.toLowerCase();

			for ( var idx = 0 ; idx < searchResults.length ; idx++ ) { // for each
				var searchResult = unescape(searchResults[idx].value); // decodes search result
				tmpSearchResult = ( subjectBoxAutoCompleteCaseSensitive ) ? searchResult : searchResult.toLowerCase();

				if ( tmpSearchResult.indexOf(tmpSearchString) == 0 ) { // if search result begins with search string
					results.push(searchResult); // adds search result to autocompletion list

					if ( searchResult.comment ) {
						comments.push(searchResult.comment);
					}
					else {
						comments.push(null);
					}
				}
			}

			listener.onSearchResult(this, new SubjectManagerAutoCompleteResult(searchString, Ci.nsIAutoCompleteResult.RESULT_SUCCESS, 0, "", results, comments));
		}
	},

	/*
	 * Stop an asynchronous search that is in progress
	 */
	stopSearch : function ()
	{
	},
		
	QueryInterface : function (aIID)
	{
		if ( !aIID.equals(Ci.nsIAutoCompleteSearch) && !aIID.equals(Ci.nsISupports) ) {
			throw Components.results.NS_ERROR_NO_INTERFACE;
		}

		return this;
	}
};

// Factory
var SubjectManagerAutoCompleteSearchFactory =
{
	singleton : null,

	createInstance : function (aOuter, aIID)
	{
		if ( aOuter != null ) {
			throw Components.results.NS_ERROR_NO_AGGREGATION;
		}

		if ( this.singleton == null ) {
			this.singleton = new SubjectManagerAutoCompleteSearch();
		}

		return this.singleton.QueryInterface(aIID);
	}
};

// Module
var SubjectManagerAutoCompleteSearchModule =
{
	registerSelf : function (aCompMgr, aFileSpec, aLocation, aType)
	{
		aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
		aCompMgr.registerFactoryLocation(CLASS_ID, CLASS_NAME, CONTRACT_ID, aFileSpec, aLocation, aType);
	},

	unregisterSelf : function (aCompMgr, aLocation, aType)
	{
		aCompMgr = aCompMgr.QueryInterface(Components.interfaces.nsIComponentRegistrar);
		aCompMgr.unregisterFactoryLocation(CLASS_ID, aLocation);				
	},
	
	getClassObject : function (aCompMgr, aCID, aIID)
	{
		if ( !aIID.equals(Components.interfaces.nsIFactory) ) {
			throw Components.results.NS_ERROR_NOT_IMPLEMENTED;
		}

		if ( aCID.equals(CLASS_ID) ) {
			return SubjectManagerAutoCompleteSearchFactory;
		}

		throw Components.results.NS_ERROR_NO_INTERFACE;
	},

	canUnload : function (aCompMgr)
	{
		return true;
	}
};

// Module initialization
function NSGetModule(aCompMgr, aFileSpec) { return SubjectManagerAutoCompleteSearchModule; };
