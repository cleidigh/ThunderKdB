var EXPORTED_SYMBOLS = ["AbookManager"];

var AbookManager = new function() {
  var self = this;
  self.prefsBranchName = "extensions.org.janek.cota."

  var pub = {};

  self.readSearchableAbooksPref = function(){
    var prefs =
      Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService)
                .getBranch(self.prefsBranchName);
    prefs.QueryInterface(Components.interfaces.nsIPrefBranch);

    var searchableAbooks = {};
    if(prefs.prefHasUserValue('searchableAbooks')) {
      var searchableAbooksPref = prefs.getCharPref('searchableAbooks');
      searchableAbooks = JSON.parse(searchableAbooksPref);
    }

    return searchableAbooks;
  }

  pub.getPersonalAddressBook = function() {
    var abManager = Components.classes["@mozilla.org/abmanager;1"]
      .getService(Components.interfaces.nsIAbManager);

    return abManager.getDirectory('moz-abmdbdirectory://abook.mab');
  }

  pub.getAddressBook = function(abookUri) {
    var abManager = Components.classes["@mozilla.org/abmanager;1"]
      .getService(Components.interfaces.nsIAbManager);

    return abManager.getDirectory(abookUri);
  }

  pub.moveContact = function(card, fromAbookUri, toAbookUri) {
    var abManager = Components.classes["@mozilla.org/abmanager;1"]
      .getService(Components.interfaces.nsIAbManager);

    var fromAbook = abManager.getDirectory(fromAbookUri);
    var toAbook = abManager.getDirectory(toAbookUri);

    var cardsToDelete = Components.classes["@mozilla.org/array;1"]
      .createInstance(Components.interfaces.nsIMutableArray);
    cardsToDelete.appendElement(card, false);

    fromAbook.deleteCards(cardsToDelete);
    toAbook.addCard(card);

    return toAbook;
  }

  pub.getAddressBooks = function() {
    var ret = [];
    var searchableAbooks = self.readSearchableAbooksPref();

    var abManager = Components.classes["@mozilla.org/abmanager;1"]
      .getService(Components.interfaces.nsIAbManager);

    var allAddressBooks = abManager.directories;
    while (allAddressBooks.hasMoreElements()) {
      var addressBook = allAddressBooks.getNext();

      if(addressBook instanceof Components.interfaces.nsIAbDirectory &&
         !addressBook.isRemote) {
        var abook = {};
        abook.abook = addressBook;

        if(searchableAbooks.hasOwnProperty(addressBook.URI)) {
          abook.shouldSearch = searchableAbooks[addressBook.URI];
        }
        else {
          abook.shouldSearch = true;
        }

        ret.push(abook);
      }
    }

    return ret;
  }

  return pub;
}
