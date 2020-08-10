/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2011 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

// adapted from https://developer.mozilla.org/en/How_to_implement_custom_autocomplete_search_component

const { classes: Cc, Constructor: CC, interfaces: Ci, utils: Cu, Exception: CE, results: Cr, } = Components;
var { XPCOMUtils } = ChromeUtils.import("resource://gre/modules/XPCOMUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Utils",
  "resource://exquilla/ewsUtils.jsm");
ChromeUtils.defineModuleGetter(this, "Services",
  "resource://gre/modules/Services.jsm");
ChromeUtils.defineModuleGetter(this, "MailServices",
  "resource:///modules/MailServices.jsm");
var _log = null;
XPCOMUtils.defineLazyGetter(this, "log", () => {
  if (!_log) _log = Utils.configureLogging("contacts");
  return _log;
});

//const CONTRACT_ID = "@mozilla.org/autocomplete/search;1?name=exquilla-ab";

function SearchEwsListener(results, comments, finish) {
  this.results = results;
  this.comments = comments;
  this.finish = finish;
}
SearchEwsListener.prototype = {
  onEvent: function _onEvent(aItem, aEvent, aData, result)
  {
    if (aEvent != "StopMachine")
      return;
    if (aData instanceof Ci.nsIArray)
    {
      let commentColumn = 0;
      let dirName = "";
      try {
        commentColumn = Services.prefs.getIntPref("mail.autoComplete.commentColumn");
        dirName = aItem.QueryInterface(Ci.nsIAbDirectory).dirName;
      } catch(e) { }

      var comment = commentColumn == 1 ? dirName : "";

      for (let i = 0; i < aData.length; i++)
      {
        let card = aData.queryElementAt(i, Ci.nsIAbCard);
        if (card)
        {
          let emailAddress = 
              MailServices.headerParser.makeFullAddress ? // pre Moz29 is makeFullAddress
                MailServices.headerParser.makeFullAddress(card.displayName, card.primaryEmail) :
                MailServices.headerParser.makeMimeAddress(card.displayName, card.primaryEmail);
                
          if (emailAddress && emailAddress.length)
          {
            this.results.push(emailAddress);
            this.comments.push(comment);
          }
        }
      }
    }
    this.finish();
  }
}

var global = this;
function EwsAbAutoCompleteResult(searchString, searchResult,
                                 defaultIndex, errorDescription,
                                 results, comments)
{
  if (typeof (safeGetJS) == "undefined")
    Utils.importLocally(global);

  this._searchString = searchString;
  this._searchResult = searchResult;
  this._defaultIndex = defaultIndex;
  this._errorDescription = errorDescription;
  this._results = results;
  this._comments = comments;
}

EwsAbAutoCompleteResult.prototype = {

  // Implements nsIAutoCompleteResult

  /**
   * The original search string
   */
  get searchString() {
    return this._searchString;
  },

  /**
   * The result code of this result object, either:
   *         RESULT_IGNORED   (invalid searchString)
   *         RESULT_FAILURE   (failure)
   *         RESULT_NOMATCH   (no matches found)
   *         RESULT_SUCCESS   (matches found)
   */
  get searchResult() {
    return this._searchResult;
  },

  /**
   * Index of the default item that should be entered if none is selected
   */
  get defaultIndex() {
    return this._defaultIndex;
  },

  /**
   * A string describing the cause of a search failure
   */
  get errorDescription() {
    return this._errorDescription;
  },

  /**
   * The number of matches
   */
  get matchCount() {
    return this._results.length;
  },

  get typeAheadResult() {return false;},

  /**
   * Get the value of the result at the given index
   */
  getValueAt: function _getValueAt(index) {
    return this._results[index];
  },

  getLabelAt: function _getLabelAt(index) {
    return this.getValueAt(index);
  },

  /**
   * Get the comment of the result at the given index
   */
  getCommentAt: function _getCommentAt(index) {
    return this._comments[index];
  },

  /**
   * Get the style hint for the result at the given index
   */
  getStyleAt: function _getStyleAt(index) {
    return "exquilla-abook";
  },

  /**
   * Get the image for the result at the given index
   * The return value is expected to be an URI to the image to display
   */
  getImageAt : function _getImageAt(index) {
    return "";
  },

  getFinalCompleteValueAt: function _getFinalCompleteValueAt(index) {
    return this.getValueAt(index);
  },

  /**
   * Remove the value at the given index from the autocomplete results.
   * If removeFromDb is set to true, the value should be removed from
   * persistent storage as well.
   */
  removeValueAt: function _removeValueAt(index, removeFromDb) {
    throw Cr.NS_ERROR_NOT_IMPLEMENTED;
  },

  // nsISupports:

  QueryInterface: ChromeUtils.generateQI([Ci.nsIAutoCompleteResult]),

};


// Implements nsIAutoCompleteSearch
function EwsAbAutoCompleteSearch() {
  //log.debug("EwsAbAutoCompleteSearch");
  if (typeof (safeGetJS) == "undefined")
    Utils.importLocally(global);
}

EwsAbAutoCompleteSearch.prototype = {
  classID:    Components.ID("AB68A3B5-2971-40d3-89FA-0AE1D9611224"),
  QueryInterface: ChromeUtils.generateQI([Ci.nsIAutoCompleteSearch]),

  /*
   * Search for a given string and notify a listener (either synchronously
   * or asynchronously) of the result
   *
   * @param searchString - The string to search for
   * @param searchParam - An extra parameter
   * @param previousResult - A previous result to use for faster searchinig
   * @param listener - A listener to notify when the search is complete
   */
  _results: [],
  _comments: [],
  _activeMachines: [],
  startSearch: function(searchString, searchParam, previousResult, listener) {

    log.debug("EwsAbAutoCompleteSearch.startSearch searchString " + searchString);
    let doAbGALAutocomplete = Cc["@mozilla.org/preferences-service;1"]
                                .getService(Ci.nsIPrefBranch)
                                .getBoolPref("extensions.exquilla.doAbGALAutocomplete");
    this._results.length = 0;
    this._comments.length = 0;
    this._activeMachines.length = 0;
    var expectedResults = 0;
    let finish = function()
    {
      log.debug("ewsAbAutocomplete.finish() with expectedResults " + expectedResults);
      if (--expectedResults <= 0) {
        let newResult = new EwsAbAutoCompleteResult(searchString,
                                                    this._results.length ? Ci.nsIAutoCompleteResult.RESULT_SUCCESS : Ci.nsIAutoCompleteResult.RESULT_NOMATCH,
                                                    0, "", this._results, this._comments);
        listener.onSearchResult(this, newResult);
      }
    }.bind(this);

    // If the search string isn't value, or contains a comma, or the user
    // hasn't enabled autocomplete, then just return no matches / or the
    // result ignored.
    // The comma check is so that we don't autocomplete against the user
    // entering multiple addresses.
    if (!doAbGALAutocomplete ||
        !searchString ||
        /,/.test(searchString))
    {
      log.debug("finishing search, no need to search");
      finish();
      return;
    }

    // Scan through all address books, looking for GAL accounts
    let directories = MailServices.ab.directories;
    let galDirectories = [];
    while (directories.hasMoreElements())
    {
      let directory = directories.getNext();
      let jsEwsDirectory = safeGetJS(directory);
      if (jsEwsDirectory && jsEwsDirectory.isGAL)
        galDirectories.push(directory);
    }
    log.debug('Need to autocomplete ' + galDirectories.length + ' GAL directory(ies)');

    if (!galDirectories.length)
    {
      log.debug("no gal directories to search");
      finish();
      return;
    }

    for (let directory of galDirectories)
    {
      let ewsDirectory = safeGetJS(directory);
      let ewsListener = new SearchEwsListener(this._results, this._comments, finish);
      expectedResults++;
      this._activeMachines.push(ewsDirectory.searchGAL(searchString, ewsListener));
    }
  },

  /*
   * Stop an asynchronous search that is in progress
   */
  stopSearch: function() {
    log.debug("ewsAbAutocomplete stopSearch() received");
    for (let machine of this._activeMachines)
      machine.abort();
    this._activeMachines.length = 0;
  },

};

var NSGetFactory = XPCOMUtils.generateNSGetFactory([EwsAbAutoCompleteSearch]);
var EXPORTED_SYMBOLS = ["NSGetFactory"];
