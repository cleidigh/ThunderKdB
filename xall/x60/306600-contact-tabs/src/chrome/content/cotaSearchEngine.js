var EXPORTED_SYMBOLS = ["SearchEngine"];

Components.utils.import("chrome://contacttabs/content/cotaAbookManager.js");
Components.utils.import("chrome://contacttabs/content/cotaStopWatch.js");
Components.utils.import("resource:///modules/mailServices.js");

var SearchEngine = function() {
  var self = this;
  self.IGNORABLE_DUPLICATE = 1;
  self.POPULAR_DUPLICATE = 2;
  self.NEW = 3;

  self.stopWatch = new StopWatch(false);

  var pub = {};

  self.cotaPrefs = Components.classes["@mozilla.org/preferences-service;1"];
  self.cotaPrefs = self.cotaPrefs.getService();
  self.cotaPrefs = self.cotaPrefs.QueryInterface(Components.interfaces.nsIPrefBranch);

  self.namesAndEmailSearchTerms = [ 'PrimaryEmail',
                                    'SecondEmail',
                                    'ThirdEmail',
                                    'FourthEmail',
                                    'DisplayName',
                                    'FirstName',
                                    'LastName',
                                    'NickName',
                                    'Company' ];

  self.addressesSearchTerms = [ 'HomeAddress',
                                'HomeAddress2',
                                'HomeCity',
                                'HomeState',
                                'HomeZipCode',
                                'HomeCountry',
                                'WorkAddress',
                                'WorkAddress2',
                                'WorkCity',
                                'WorkState',
                                'WorkZipCode',
                                'WorkCountry' ];

  self.phonesSearchTerms = [ 'HomePhone',
                             'WorkPhone',
                             'FaxNumber',
                             'PagerNumber',
                             'CellularNumber',
                             'HomeFaxNumber',
                             'OtherNumber'];

  self.notesSearchTerms = [ 'Notes',
                            'Custom1',
                            'Custom2',
                            'Custom3',
                            'Custom4' ];

  self.chatSearchTerms = [ "_GoogleTalk",
                           "_AimScreenName",
                           "_Yahoo",
                           "_Skype",
                           "_QQ",
                           "_MSN",
                           "_ICQ",
                           "_JabberId",
                           "_IRC"
                         ];

  pub.autoCompleteContacts = function(searchTerm, searchMode) {
    var queryTerms = []
    for(var i = 0; i < searchMode.length; i++) {
      var m = searchMode[i];

      if(m == 'cota-search-for-emails') {
        queryTerms = queryTerms.concat(self.namesAndEmailSearchTerms);
      }
      else if(m == 'cota-search-for-addresses') {
        queryTerms = queryTerms.concat(self.addressesSearchTerms);
      }
      else if(m == 'cota-search-for-phone') {
        queryTerms = queryTerms.concat(self.phonesSearchTerms);
      }
      else if(m == 'cota-search-for-chat') {
        queryTerms = queryTerms.concat(self.chatSearchTerms);
      }
      else if(m == 'cota-search-for-notes') {
        queryTerms = queryTerms.concat(self.notesSearchTerms);
      }
    }

    var searchQuery = self.createSearchQuery(queryTerms, searchTerm, null);

    return self.genericAutoComplete(searchQuery);
  }

  pub.autoCompleteEmails = function(searchTerm) {
    return self.genericAutoCompleteEmails(searchTerm);
  }

  /**
   * Taken from Thunderbirds autocomplete code.
   *
   * Returns the popularity index for a given card. This takes account of a
   * translation bug whereby Thunderbird 2 stores its values in mork as
   * hexadecimal, and Thunderbird 3 stores as decimal.
   *
   * @param aDirectory  The directory that the card is in.
   * @param aCard       The card to return the popularity index for.
   */
  self.getPopularityIndex =  function(aDirectory, aCard) {
    var popularityValue = aCard.getProperty("PopularityIndex", "0");
    var popularityIndex = parseInt(popularityValue);

    // If we haven't parsed it the first time round, parse it as hexadecimal
    // and repair so that we don't have to keep repairing.
    if (isNaN(popularityIndex)) {
      popularityIndex = parseInt(popularityValue, 16);

      // If its still NaN, just give up, we shouldn't ever get here.
      if (isNaN(popularityIndex))
        popularityIndex = 0;

      // Now store this change so that we're not changing it each time around.
      if (!aDirectory.readOnly) {
        aCard.setProperty("PopularityIndex", popularityIndex);
        try {
          aDirectory.modifyCard(aCard);
        }
        catch (ex) {
          Components.utils.reportError(e);
        }
      }
    }
    return popularityIndex;
  }

  self.genericAutoComplete = function(searchQuery) {
    var abManager = Components.classes["@mozilla.org/abmanager;1"]
      .getService(Components.interfaces.nsIAbManager);

    var allSearchResults = [];
    var allAddressBooks = AbookManager.getAddressBooks();
    for (var i = 0; i < allAddressBooks.length; i++) {
      var addressBook = allAddressBooks[i];

      if(addressBook.shouldSearch == false) {
        continue;
      }

      self.stopWatch.start();

      var searchResults =
        abManager.getDirectory(addressBook.abook.URI + searchQuery).childCards;

      self.stopWatch.log(addressBook.abook.URI +'search: ');

      self.stopWatch.start();

      while(searchResults.hasMoreElements()) {
        var r = searchResults.getNext();

        if (r instanceof Components.interfaces.nsIAbCard &&
            r.isMailList == false) {
          var cardPopularity = self.getPopularityIndex(addressBook.abook,
                                                       r);
          var generatedName =
            r.generateName(self.cotaPrefs.getIntPref("mail.addr_book.lastnamefirst"));
          if(generatedName == '') {
            generatedName = card.primaryEmail;
          }
          var generatedNameLower = generatedName.toLowerCase();

          // Find out where to insert the card.
          // First, sort based on popularity
          var insertPosition = 0;
          while (insertPosition < allSearchResults.length &&
                 cardPopularity <
                 allSearchResults[insertPosition].popularity) {
            ++insertPosition;
          }

          // Second, sort based on generated name
          while (insertPosition < allSearchResults.length &&
                 cardPopularity ==
                 allSearchResults[insertPosition].popularity &&
                 (generatedNameLower > allSearchResults[insertPosition].nameLower)) {
            ++insertPosition;
          }

          allSearchResults.splice(insertPosition, 0,
                                  { card: r,
                                    abook: addressBook.abook,
                                    popularity: cardPopularity,
                                    name: generatedName,
                                    nameLower: generatedNameLower });
        }
      }
      self.stopWatch.log(addressBook.abook.URI +'sort: ');

    }

    return allSearchResults;
  }

  self.genericAutoCompleteEmails = function(searchTerm) {
    var abManager = Components.classes["@mozilla.org/abmanager;1"]
      .getService(Components.interfaces.nsIAbManager);

    var primaryEmailQueryTerms = [ 'PrimaryEmail',
                                   'DisplayName',
                                   'FirstName',
                                   'LastName',
                                   'NickName' ];
    var secondEmailQueryTerms = [ 'SecondEmail',
                                  'DisplayName',
                                  'FirstName',
                                  'LastName',
                                  'NickName' ];


    var primaryEmailSearchQuery =
      self.createSearchQuery(primaryEmailQueryTerms,
                             searchTerm,
                             '(and(IsMailList,=,TRUE)(Notes,c,@V))');
    var secondEmailSearchQuery =
      self.createSearchQuery(secondEmailQueryTerms,
                             searchTerm,
                             '(and(IsMailList,=,TRUE)(Notes,c,@V))');
    var allSearchQueries = [ {query: primaryEmailSearchQuery, email: 'PrimaryEmail' },
                             {query: secondEmailSearchQuery, email: 'SecondEmail'} ];

    var parser = MailServices.headerParser;
    var allSearchResults = [];
    var allAddressBooks = AbookManager.getAddressBooks();
    for (var i = 0; i < allAddressBooks.length; i++) {
      var addressBook = allAddressBooks[i];
      self.stopWatch.start();

      for(var sq = 0; sq < allSearchQueries.length; sq++) {
        var searchQuery = allSearchQueries[sq].query;
        var emailProperty = allSearchQueries[sq].email;

        var searchResults =
          abManager.getDirectory(addressBook.abook.URI + searchQuery).childCards;

        self.stopWatch.log(addressBook.abook.URI +'search: ');

        while(searchResults.hasMoreElements()) {
          var r = searchResults.getNext();
          if(r instanceof Components.interfaces.nsIAbCard) {
            var generatedName;
            if(r.isMailList == false && (r.getProperty(emailProperty, ""))) {
              generatedName =
                self.makeFullAddress(parser,
                                     r.displayName,
                                     r.isMailList ?
                                     r.getProperty("Notes", "") || r.displayName :
                                     r.getProperty(emailProperty, ""));

              if(generatedName == '') {
                generatedName = r.getProperty(emailProperty, "");
              }
            } else if(r.isMailList) {
              generatedName =
                self.makeFullAddress(parser,
                                     r.displayName,
                                     r.getProperty("Notes", "") || r.displayName);

              if(generatedName == '') {
                generatedName = r.displayName;
              }
            } else {
              continue;
            }

            var insertPosition = self.addToResult(r,
                                                  generatedName,
                                                  0,
                                                  addressBook,
                                                  allSearchResults);
          }
        }
      }
      self.stopWatch.log(addressBook.abook.URI +'sort: ');
    }

    return allSearchResults;
  }

  self.makeFullAddress = function(parser, name, email) {
    if(typeof parser.makeMailboxObject == 'function') {
      return parser.makeMailboxObject(name, email).toString();
    }

    return parser.makeFullAddress(name, email);
  }

  self.addToResult = function(resultCard,
                              generatedName,
                              insertPosition,
                              addressBook,
                              allSearchResults) {
    var cardPopularity = self.getPopularityIndex(addressBook.abook,
                                                 resultCard);

    var generatedNameLower = generatedName.toLowerCase();
    var dup = self.checkDuplicate(cardPopularity,
                                  generatedName,
                                  allSearchResults);
    if(dup == self.IGNORABLE_DUPLICATE) {
      return;
    } else if(dup == self.POPULAR_DUPLICATE) {
      insertPosition = 0;
    }

    // Find out where to insert the card.
    // First, sort based on popularity
    while (insertPosition < allSearchResults.length &&
           cardPopularity <
           allSearchResults[insertPosition].popularity) {
      ++insertPosition;
    }

    // Second, sort based on generated name
    while (insertPosition < allSearchResults.length &&
           cardPopularity ==
           allSearchResults[insertPosition].popularity &&
           (generatedNameLower > allSearchResults[insertPosition].nameLower)) {
      ++insertPosition;
    }

    allSearchResults.splice(insertPosition, 0,
                            { card: resultCard,
                              abook: addressBook.abook,
                              popularity: cardPopularity,
                              name: generatedName,
                              nameLower: generatedNameLower });

    return insertPosition;
  }

  self.checkDuplicate = function(cardPopularity,
                                 generatedName,
                                 allSearchResults) {
    var generatedNameLower = generatedName.toLowerCase();

    for (var i = 0; i < allSearchResults.length; ++i) {
      if (allSearchResults[i].nameLower == generatedNameLower)
      {
        // Duplicate found. Is the new one more popular than the one
        // in the results?
        if (cardPopularity > allSearchResults[i].popularity) {
          // Yes it is, so delete this element, return false and allow
          // _addToResult to sort the new element into the correct place.
          allSearchResults.splice(i, 1);
          return self.POPULAR_DUPLICATE;
        }
        // Not more popular, but still a duplicate. Return true and
        // addToResults will ignore it.
        return self.IGNORABLE_DUPLICATE;
      }
    }

    return self.NEW;
  }

  self.createSearchQuery = function(queryTerms, searchTerm, trailing) {
    var searchQuery = '';
    for(var i = 0; i < queryTerms.length; i++) {
      searchQuery = searchQuery.concat('(', queryTerms[i], ',c,@V)');
    }

    if(trailing) {
      searchQuery = searchQuery.concat(trailing);
    }

    searchQuery = '?(or' + searchQuery + ')';

    searchQuery = searchQuery.replace(/@V/g,
                                      encodeURIComponent(searchTerm)
                                        .replace(/'/g, "%27")
                                        .replace(/\(/g, "%28")
                                        .replace(/\)/g, "%29"));

    return searchQuery;
  }


  return pub;
}
