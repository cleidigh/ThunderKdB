if (typeof contacttabs == "undefined") {
  var contacttabs = {};
};

Components.utils.import("resource://gre/modules/Services.jsm");

Components.utils.import("chrome://contacttabs/content/cotaAbookManager.js");
Components.utils.import("chrome://contacttabs/content/cotaTabUtils.js");
Components.utils.import("chrome://contacttabs/content/cotaStorage.js",
                        contacttabs);

var gAddressBookBundle;

contacttabs.CardEditor = new function() {
  var pub = {};
  var self = this;

  self.addressBookBundle = null;
  self.prefs = Components.classes["@mozilla.org/preferences-service;1"];
  self.prefs = self.prefs.getService();
  self.prefs = self.prefs.QueryInterface(Components.interfaces.nsIPrefBranch);

  self.cardTitle = null;
  self.card = null;
  self.createNewCard = false;
  self.abook = null;

  self.generateDisplayName = true;
  self.displayLastNameFirst = true;

  self.cardFields =
    [
      ["FirstName", "FirstName"],
      ["LastName", "LastName"],
      ["DisplayName", "DisplayName"],
      ["NickName", "NickName"],

      ["PrimaryEmail", "PrimaryEmail"],
      ["SecondEmail", "SecondEmail"],
      ["ScreenName", "_AimScreenName"], // NB: AIM (for TB < 15)

      ["WorkPhone", "WorkPhone"],
      ["HomePhone", "HomePhone"],
      ["FaxNumber", "FaxNumber"],
      ["PagerNumber", "PagerNumber"],
      ["CellularNumber", "CellularNumber"],

      ["HomeAddress", "HomeAddress"],
      ["HomeAddress2", "HomeAddress2"],
      ["HomeCity", "HomeCity"],
      ["HomeState", "HomeState"],
      ["HomeZipCode", "HomeZipCode"],
      ["HomeCountry", "HomeCountry"],
      ["WebPage2", "WebPage2"],

      ["JobTitle", "JobTitle"],
      ["Department", "Department"],
      ["Company", "Company"],
      ["WorkAddress", "WorkAddress"],
      ["WorkAddress2", "WorkAddress2"],
      ["WorkCity", "WorkCity"],
      ["WorkState", "WorkState"],
      ["WorkZipCode", "WorkZipCode"],
      ["WorkCountry", "WorkCountry"],
      ["WebPage1", "WebPage1"],

      ["Custom1", "Custom1"],
      ["Custom2", "Custom2"],
      ["Custom3", "Custom3"],
      ["Custom4", "Custom4"],

      ["Notes", "Notes"],

      ["Gtalk", "_GoogleTalk"],
      ["AIM", "_AimScreenName"],
      ["Yahoo", "_Yahoo"],
      ["Skype", "_Skype"],
      ["QQ", "_QQ"],
      ["MSN", "_MSN"],
      ["ICQ", "_ICQ"],
      ["XMPP", "_JabberId"]
    ];

  pub.cancelEdit = function() {
    var tabBar = TabUtils.findTabBar(window);
    var browser = tabBar.getBrowserForSelectedTab();

    if(self.createNewCard) {
      // Don't create new contact => simply close this tab
      var mainWindow = TabUtils.findMainWindow(window);

      // Now close the tab
      mainWindow.document.getElementById('tabmail').removeCurrentTab();
    }
    else {
      self.loadCardView(browser);
    }
  }

  pub.saveCard = function() {
    if (!CheckCardRequiredDataPresence(document)) {
      return false;  // don't close window
    }

    // Store Data in Contact
    self.setCardValues(self.card, document, false);

    var tabBar = TabUtils.findTabBar(window);
    var browser = tabBar.getBrowserForSelectedTab();
    var localStorageId = null;
    if(self.createNewCard) {
      var abooksListElem = document.getElementById('cota-abookslist');
      var selectedAbookUri = abooksListElem.selectedItem.value;
      self.abook = AbookManager.getAddressBook(selectedAbookUri);

      self.card = self.abook.addCard(self.card);

      localStorageId = self.card.uuid + '/' + self.card.directoryId;

      browser.setUserData("LocalStorageId", localStorageId, null);
      var loadListener =
        function (event) {
          // After the XUL is loaded we register the LocalStorageId as ID
          // at the CardViewBox element.
          var cardViewBox = browser.contentDocument.getElementById("CardViewBox");
          cardViewBox.setAttribute("LocalStorageId", localStorageId);

          browser.setUserData("LocalStorageId", localStorageId, null);
          browser.removeEventListener("load",
                                      loadListener,
                                      true);
        };

      browser.addEventListener("load",
                               loadListener,
                               true);
    }
    else {
      localStorageId = TabUtils.getLocalStorageId(document, window);
      self.abook.modifyCard(self.card);

      var abooksListElem = document.getElementById('cota-abookslist');
      var selectedAbookUri = abooksListElem.selectedItem.value;
      if(self.abook.URI != selectedAbookUri) {
        self.moveContactToAddressbook();
      }
    }

    contacttabs.cotaStorage.set(localStorageId,
                            { card: self.card,
                              abook: self.abook });

    self.loadCardView(browser);
  }

  self.loadCardView = function(browser) {
    var xulAppInfo = Components.classes["@mozilla.org/xre/app-info;1"]
      .getService(Components.interfaces.nsIXULAppInfo);
    var versionComparator =
      Components.classes["@mozilla.org/xpcom/version-comparator;1"]
      .getService(Components.interfaces.nsIVersionComparator);

    if(versionComparator.compare(xulAppInfo.version, "15.0") >= 0) {
      browser.loadURI("chrome://contacttabs/content/cotaCardView15.xul");
    }
    else {
      browser.loadURI("chrome://contacttabs/content/cotaCardView.xul");
    }
  }

  self.moveContactToAddressbook = function() {
    var abooksListElem = document.getElementById('cota-abookslist');
    var toAbookUri = abooksListElem.selectedItem.value;

    if(self.abook.URI != toAbookUri) {
      var toAbook = AbookManager.moveContact(self.card,
                                             self.abook.URI,
                                             toAbookUri);
      self.abook = toAbook;
    }
  }

  pub.openPhotoEditor = function() {
    var editorReturned = {};

    var photoType = document.getElementById("PhotoType").value;
    var photoUri = '';
    if(photoType == 'file') {
      var file = document.getElementById("PhotoFile").file;
      photoUri = Components.classes["@mozilla.org/network/io-service;1"]
        .getService(Components.interfaces.nsIIOService)
        .newFileURI(file)
        .spec;
    }
    else if(photoType == 'file') {
      document.getElementById("PhotoURI").value;
    }

    var photoCard = {
      getProperty: function(k) {
        if(k == 'PhotoURI') {
          return photoUri;
        }

        if(k == 'PhotoType') {
          return photoType;
        }
      }
    };

    var photoEditor =
      window.openDialog("chrome://contacttabs/content/cotaPhotoEditor.xul",
                        "",
                        "chrome,resizable=no,modal,titlebar,centerscreen",
                        {card: photoCard,
                         out: editorReturned});

    if(editorReturned.action == 'OK') {
      var photoType = editorReturned.photoType;
      var photoUri = editorReturned.uri;

      var returnedCard = {
        getProperty: function(k) {
          if(k == 'PhotoURI') {
            return photoUri;
          }

          if(k == 'PhotoType') {
            return photoType;
          }
        }
      };

      document.getElementById("PhotoType").value = photoType;
      loadPhoto(returnedCard);
    }
  }

  pub.generateDisplayName = function() {
    if (!self.generateDisplayName)
      return;

    var displayName;

    var firstNameValue = document.getElementById("FirstName").value;
    var lastNameValue = document.getElementById("LastName").value;
    if (lastNameValue && firstNameValue) {
      displayName = (self.displayLastNameFirst)
        ? self.addressBookBundle.getFormattedString("lastFirstFormat",
                                                     [lastNameValue, firstNameValue])
        : self.addressBookBundle.getFormattedString("firstLastFormat",
                                                     [firstNameValue, lastNameValue]);
    }
    else {
      // one (or both) of these is empty, so this works.
      displayName = firstNameValue + lastNameValue;
    }

    document.getElementById("DisplayName").value = displayName;

    self.setTitle(displayName);
  }

  pub.displayNameChanged = function() {
    // turn off generateDisplayName if the user changes the display name
    self.generateDisplayName = false;

    self.setTitle(document.getElementById("DisplayName").value);
  }

  pub.init = function() {
    window.addEventListener("unload",
                            self.unload,
                            false);

    self.addressBookBundle = document.getElementById("bundle_addressBook");
    gAddressBookBundle = self.addressBookBundle;

    var displayLastNameFirst =
        self.prefs.getComplexValue("mail.addr_book.displayName.lastnamefirst",
                                   Components.interfaces.nsIPrefLocalizedString).data;
    self.displayLastNameFirst = (displayLastNameFirst == "true");
    self.generateDisplayName =
      self.prefs.getBoolPref("mail.addr_book.displayName.autoGeneration");

    var localStorageId = TabUtils.getLocalStorageId(document, window);

    var cardAbookTuple = contacttabs.cotaStorage.get(localStorageId, null);
    if(cardAbookTuple != null) {
      self.card = cardAbookTuple.card;
      self.abook = cardAbookTuple.abook;
    }

    self.reloadTab();
  }

  self.unload = function() {
    window.removeEventListener("load",
                               pub.init,
                               false);
    window.removeEventListener("unload",
                               self.unload,
                               false);
  }

  self.setupAbooksListElem = function(abooksListElem) {
    abooksListElem.removeAllItems();

    var allAddressBooks = AbookManager.getAddressBooks();
    for (var i = 0; i < allAddressBooks.length; i++) {
      var addressBook = allAddressBooks[i];

      var item = abooksListElem.appendItem(addressBook.abook.dirName,
                                           addressBook.abook.URI);

      if(addressBook.abook.URI == self.abook.URI) {
        abooksListElem.selectedItem = item;
      }
    }
  }

  self.reloadTab = function() {
    if(self.card == null) {
      // Create new contact
      self.card = Components.classes["@mozilla.org/addressbook/cardproperty;1"]
                    .createInstance(Components.interfaces.nsIAbCard);
      self.abook = AbookManager.getPersonalAddressBook();
      self.createNewCard = true;

      var primaryEmail = TabUtils.getPrimaryEmail(document, window);
      self.setTitle(primaryEmail);
      self.card.setProperty('PrimaryEmail', primaryEmail);
    }
    else if(self.card != null &&
            self.abook == null) {
      self.abook = AbookManager.getPersonalAddressBook();
      self.createNewCard = true;
    }
    else {
      // Edit existing contact
      var generatedName = self.card.generateName(
        self.prefs.getIntPref("mail.addr_book.lastnamefirst"));

      var titleString;
      if (generatedName == "") {
        titleString = card.primaryEmail;  // if no generatedName, use email
      }
      else {
        titleString = generatedName;
      }

      self.setTitle(titleString);
    }

    var abooksListElem = document.getElementById('cota-abookslist');
    self.setupAbooksListElem(abooksListElem);

    self.loadCardValues(self.card, document);
  }

  self.setTitle = function(titleString) {
    document.title = titleString;

    var title = document.getElementById("CardTitle");
    if(title.childNodes.length > 0) {
      title.removeChild(title.firstChild);
    }

    title.appendChild(document.createTextNode(titleString));
  }

  self.setCardValues = function(cardproperty, doc) {
    for (var i = kVcardFields.length; i-- > 0; ) {
      if(doc.getElementById(self.cardFields[i][0]) != null) {
        var value = doc.getElementById(self.cardFields[i][0]).value
        var trimmed = value.replace(/^\s\s*/, '').replace(/\s\s*$/, '');
        cardproperty.setProperty(self.cardFields[i][1],
                                 trimmed);
      }
    }

    var popup = document.getElementById("PreferMailFormatPopup");
    if (popup) {
      cardproperty.setProperty("PreferMailFormat", popup.value);
    }

    var preferDisplayNameEl = document.getElementById("preferDisplayName");
    if (preferDisplayNameEl) {
      cardproperty.setProperty("PreferDisplayName", preferDisplayNameEl.checked);
    }
  }

  self.loadCardValues = function(cardproperty, doc) {
    for (var i = self.cardFields.length; i-- > 0; ) {
      if(doc.getElementById(self.cardFields[i][0]) != null) {
        doc.getElementById(self.cardFields[i][0]).value =
          cardproperty.getProperty(self.cardFields[i][1], "");
      }
    }

    var popup = doc.getElementById("PreferMailFormatPopup");
    if (popup) {
      popup.value = cardproperty.getProperty("PreferMailFormat", "");
    }

    var preferDisplayNameEl = doc.getElementById("preferDisplayName");
    if (preferDisplayNameEl) {
      // getProperty may return a "1" or "0" string, we want a boolean
      preferDisplayNameEl.checked =
        cardproperty.getProperty("PreferDisplayName", true) != false;
    }

    // Store the original photo URI and update the photo
    // Select the type if there is a valid value stored for that type, otherwise
    // select the generic photo
    var photoType = cardproperty.getProperty("PhotoType", "");
    document.getElementById("PhotoType").value = photoType;
    loadPhoto(cardproperty);

    // Gets and sets column width
    var cotaPrefs =
      Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService)
                .getBranch("extensions.org.janek.cota.");
      cotaPrefs.QueryInterface(Components.interfaces.nsIPrefBranch);

    var columnOne = cotaPrefs.getCharPref("cotaCardEditorLayout");
    try {
      if (columnOne) {
        var colonewidth = cotaPrefs.getIntPref("cotaCardEditorOne");
        var maxwidthValue = document.getElementById("cvbOneColumn");
        maxwidthValue.setAttribute('maxwidth', colonewidth);
      }
    } catch(e){}

  var columnTwo = cotaPrefs.getCharPref("cotaCardEditorLayout");
    try {
      if (columnTwo) {
        var colfirstwidth = cotaPrefs.getIntPref("cotaCardEditorFirst");
        var maxwidthValue1 = document.getElementById("cvbFirstColumn");
        maxwidthValue1.setAttribute('maxwidth', colfirstwidth);

        var colsecondwidth = cotaPrefs.getIntPref("cotaCardEditorSecond");
        var maxwidthValue2 = document.getElementById("cvbSecondColumn");
        maxwidthValue2.setAttribute('maxwidth', colsecondwidth);
      }
    } catch(e){}
  }

  return pub;
}

window.addEventListener("load",
                        contacttabs.CardEditor.init,
                        false);
