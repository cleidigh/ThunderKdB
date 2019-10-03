if (typeof contacttabs == "undefined") {
  var contacttabs = {};
};

Components.utils.import("resource://gre/modules/AddonManager.jsm");
Components.utils.import("resource:///modules/mailServices.js");
Components.utils.import("chrome://contacttabs/content/cotaAbookManager.js",
                        contacttabs);
Components.utils.import("chrome://contacttabs/content/cotaStopWatch.js",
                        contacttabs);
Components.utils.import("chrome://contacttabs/content/cotaSearchEngine.js",
                        contacttabs);
Components.utils.import("chrome://contacttabs/content/cotaStorage.js",
                        contacttabs);

contacttabs.Main = new function() {
  var pub = {};
  var self = this;

  self.stopWatch = new contacttabs.StopWatch();

  self.cotaPrefs = null;
  self.prefsBranchName = "extensions.org.janek.cota.";

  self.searchEngine = new contacttabs.SearchEngine();
  self.selectedCard = null;
  self.selectedAbookUri = null;

  self.editedEmailCardDetails = null;
  self.incompatibleAddonsActive = false;
  self.cotaBundle = false;

  self.searchModes = [ 'cota-search-for-emails',
                       'cota-search-for-addresses',
                       'cota-search-for-phone',
                       'cota-search-for-chat',
                       'cota-search-for-notes'];
  self.curSearchMode = [];

  self.clickableEmailProperties = [ 'PrimaryEmail',
                                    'SecondEmail',
                                    'ThirdEmail',
                                    'FourthEmail'];

  self.abListener = {
    onItemAdded: function(parentDir, item) {
      try {
        item.QueryInterface(Components.interfaces.nsIAbDirectory);
        self.setupCotaOptionsPopup();
      }
      catch(e) {
        // If item is not an nsIAbDirectory we'll get a NS_ERROR_NO_INTERFACE.
        // We ignore this exception because we're only interested in
        // added address books
      }
    },
    onItemRemoved: function(parentDir, item) {
      try {
        item.QueryInterface(Components.interfaces.nsIAbDirectory);
        self.setupCotaOptionsPopup();
      }
      catch(e) {
        // If item is not an nsIAbDirectory we'll get a NS_ERROR_NO_INTERFACE.
        // We ignore this exception because we're only interested in
        // removed address books
      }
    },
    onItemPropertyChanged: function(item, property, oldValue, newValue) {
      // ignored
    }
  };

  self.displayCard = function(aLocalStorageId) {
    document.getElementById('tabmail').openTab('cota-cardViewTab',
                                               {localStorageId: aLocalStorageId,
                                                mode: 'view-contact'});
  }

  self.searchableAbooksChanged = function() {
    var popup = document.getElementById("cota-searchbutton-popup");

    if(popup == null) {
      return;
    }

    var menuitems = popup.childNodes;
    if (menuitems == null) {
      return;
    }

    var searchableAbooks = {};
    for (var i = 0; i < menuitems.length; i++) {
      var menuitem = menuitems[i];
      var abookUri = menuitem.getAttribute('value')
      searchableAbooks[abookUri] = menuitem.getAttribute('checked')
    }

    self.cotaPrefs.setCharPref('searchableAbooks',
                               JSON.stringify(searchableAbooks));
  }

  self.setupCotaOptionsPopup = function() {
    var popup = document.getElementById("cota-searchbutton-popup");
    if(popup == null) {
      // User doesn't have the search interface on the toolbar
      return;
    }
    else {
      // We need to remove all address book menu items. Since the address book items
      // come last in the menu, we start with the last entry of the menu and
      // delete until we reach the first non-menuitem (menuseparator).
      if (popup.hasChildNodes()) {
        while (popup.childNodes.length >= 1) {
          var menuitem = popup.lastChild;

          if(menuitem.localName != 'menuitem') {
            break;
          }
          menuitem.removeEventListener('command', self.searchableAbooksChanged);
          popup.removeChild(menuitem);
        }
      }
    }

    var allAddressBooks = contacttabs.AbookManager.getAddressBooks();
    for (var i = 0; i < allAddressBooks.length; i++) {
      var addressBook = allAddressBooks[i];

      var menuitem = document.createElement('menuitem');
      menuitem.setAttribute('value', addressBook.abook.URI);
      menuitem.setAttribute('label', addressBook.abook.dirName);
      menuitem.setAttribute('type', 'checkbox');
      menuitem.setAttribute('closemenu', 'none');

      menuitem.setAttribute('checked', addressBook.shouldSearch);

      menuitem.addEventListener('command', self.searchableAbooksChanged);
      popup.appendChild(menuitem);
    }
  }

  pub.init = function() {
    window.addEventListener("unload",
                            self.unload,
                            false);

    MailServices.ab.addAddressBookListener(
      self.abListener,
      Components.interfaces.nsIAbListener.itemAdded |
        Components.interfaces.nsIAbListener.directoryRemoved);

    //
    // Add search box to main tool bar (but only at first run)
    //
    self.cotaPrefs =
      Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService)
                .getBranch(self.prefsBranchName);
    self.cotaPrefs.QueryInterface(Components.interfaces.nsIPrefBranch);

    var curSearchModeIds = {};
    var curSearchModePref = self.cotaPrefs.getCharPref('searchMode');
    curSearchModeIds = JSON.parse(curSearchModePref);


    for(var i = 0; i < curSearchModeIds.length; i++) {
      var mode = curSearchModeIds[i];

      self.curSearchMode.push(mode);
      var menuItem = document.getElementById(mode);
      if(menuItem) {
        menuItem.setAttribute('checked', true);
      }
    }

    var firstrun = self.cotaPrefs.getBoolPref("firstrun");
    if (firstrun) {
      self.cotaPrefs.setBoolPref("firstrun", false);

      var myId    = "cota-search"; // ID of button to add
      var afterId = "gloda-search";    // ID of element to insert after
      var navBar  = document.getElementById("mail-bar3");
      var curSet  = navBar.currentSet.split(",");

      if (curSet.indexOf(myId) == -1) {
        var pos = curSet.indexOf(afterId) + 1 || curSet.length;
        var set = curSet.slice(0, pos).concat(myId).concat(curSet.slice(pos));

        navBar.setAttribute("currentset", set.join(","));
        navBar.currentSet = set.join(",");
        document.persist(navBar.id, "currentset");
        try {
          BrowserToolboxCustomizeDone(true);
        }
        catch (e) {}
      }
    }

    var tabmail = document.getElementById('tabmail');
    tabmail.registerTabType(contacttabs.CardViewTabType);
    tabmail.registerTabMonitor(new contacttabs.SearchFieldTabMonitor());

    self.setupCotaOptionsPopup();

    var cotaSearchInput = document.getElementById("cotaSearchInput");
    if(cotaSearchInput) {
      cotaSearchInput.addEventListener("keypress",
                                       self.onKeypress,
                                       true);
    }

    var cotaSearchResultsPanel =
      document.getElementById("cota-search-results-panel");
    if(cotaSearchResultsPanel) {
      cotaSearchResultsPanel.addEventListener('click',
                                              self.cotaSearchResultClicked,
                                              false);
    }


    //
    // Asynchronously, determine if we should enable our own
    // tab-based contact editor. We use our own editor if and only if
    //
    // - pref cotaCardEditor is true
    // - no incompatible addon is installed (or, respectively, active)
    //
    AddonManager.getAllAddons(function(addons) {
      for(var i = 0; i < addons.length; i++) {
        if(addons[i].id == 'gContactSync@pirules.net' &&
           addons[i].isActive) {
          self.incompatibleAddonsActive = true;

          break;
        }

        if(addons[i].id == '>sendtocategory@jobisoft.de' &&
           addons[i].isActive) {
          self.incompatibleAddonsActive = true;

          break;
        }
      }

      self.cotaBundle = document.getElementById("cota-strings");

      if(!self.incompatibleAddonsActive && self.cotaPrefs.getBoolPref('cotaCardEditor')) {
        var newContactMenu = document.getElementById('menu_newCard');
        if(newContactMenu) {
          newContactMenu.removeAttribute('command');
          newContactMenu.addEventListener('command',
                                          self.createNewContact);
        }

        var newContactAppMenu = document.getElementById('appmenu_newCard');
        if(newContactAppMenu) {
          newContactAppMenu.removeAttribute('command');
          newContactAppMenu.addEventListener('command',
                                           self.createNewContact);
        }

        var addToAddressBookItem = document.getElementById('addToAddressBookItem');
        if(addToAddressBookItem) {
          addToAddressBookItem.removeAttribute('oncommand');
          addToAddressBookItem.addEventListener('command',
                                                self.addToAddressBookItem);
        }

        var editContactItem = document.getElementById('editContactItem');
        if(editContactItem) {
          editContactItem.addEventListener('command',
                                           self.onOpenEditContactPanel);
        }

        var editContactButton =
          document.getElementById('editContactPanelEditDetailsButton');
        if(editContactButton) {
          editContactButton.removeAttribute('oncommand');
          editContactButton.addEventListener('command',
                                             self.editContact);
        }

        self.setupEmailStar('expandedtoBox');
        self.setupEmailStar('expandedfromBox');
        self.setupEmailStar('expandedccBox');
      }
    });
  }

  self.setupEmailStar = function(boxId) {
    var addressBox = document.getElementById(boxId);
    if(addressBox) {
      var addressDesc = document.getAnonymousElementByAttribute(addressBox,
                                                                'anonid',
                                                                'emailAddresses');
      addressDesc.addEventListener('click',
                                   self.onAddressDescClicked);
    }
  }

  self.unload = function() {
    window.removeEventListener("load",
                               contacttabs.Main.init,
                               false);
    window.removeEventListener("unload",
                               self.unload,
                               false);

    var cotaSearchInput = document.getElementById("cotaSearchInput");
    cotaSearchInput.removeEventListener("keypress",
                                        self.onKeypress,
                                        true);

    var popup = document.getElementById("cota-searchbutton-popup");
    if(popup != null) {
      if (popup.hasChildNodes()) {
        while (popup.childNodes.length >= 1) {
          var menuitem = popup.firstChild;
          menuitem.removeEventListener('command', self.searchableAbooksChanged);
          popup.removeChild(menuitem);
        }
      }
    }

    MailServices.ab.removeAddressBookListener(self.abListener);
  }

  self.openEmailComposer = function(selectedItem){
    if(selectedItem != null &&
       selectedItem.getUserData('cardAbookTuple') != null) {
      var cardAbookTuple = selectedItem.getUserData('cardAbookTuple');
      var card = cardAbookTuple.card;
      var primaryEmail = card.getProperty('PrimaryEmail', '');
      var sURL = 'mailto:' +  primaryEmail;

      var msgCompService =
        Components.classes["@mozilla.org/messengercompose;1"]
        .getService(Components.interfaces.nsIMsgComposeService);

      // make the URI
      var ioService =
        Components.classes["@mozilla.org/network/io-service;1"]
        .getService(Components.interfaces.nsIIOService);
      aURI = ioService.newURI(sURL, null, null);
      // open new message
      msgCompService.OpenComposeWindowWithURI (null, aURI);
    }
  }

  self.cotaSearchResultClicked = function(e) {
    if (e && e.defaultPrevented) {
      return;
    }

    if(e && e.type == 'click' && e.button != 0) {
      return;
    }

    var cotaResultsList = document.getElementById('cota-results-list');

    var selectedItem = cotaResultsList.selectedItem;
    if(selectedItem != null &&
       selectedItem.getUserData('cardAbookTuple') != null) {
      var cardAbookTuple = selectedItem.getUserData('cardAbookTuple');
      var card = cardAbookTuple.card;

      if(e && (e.target.localName == 'a' || e.target.localName == 'A')) {
        var emailAddress = e.target.getAttribute('href');
        var sURL= emailAddress;
        var msgCompService =
          Components.classes["@mozilla.org/messengercompose;1"]
          .getService(Components.interfaces.nsIMsgComposeService);

        // make the URI
        var ioService =
          Components.classes["@mozilla.org/network/io-service;1"]
          .getService(Components.interfaces.nsIIOService);
        aURI = ioService.newURI(sURL, null, null);
        // open new message
        msgCompService.OpenComposeWindowWithURI (null, aURI);
      }
      else {
        var localStorageId = card.uuid + '/' + card.directoryId;
        contacttabs.cotaStorage.set(localStorageId, cardAbookTuple);

        var cotaSearchResultsPanel =
          document.getElementById("cota-search-results-panel");
        cotaSearchResultsPanel.hidePopup();

        self.displayCard(localStorageId);
      }

      if(e != null) {
        e.preventDefault();
      }
    }
    else if(selectedItem != null &&
            selectedItem.getUserData('cotaCreateContact') != null) {
      var cotaSearchResultsPanel =
        document.getElementById("cota-search-results-panel");
      cotaSearchResultsPanel.hidePopup();

      self.createCard(selectedItem.getUserData('cotaCreateContact'));
    }
  }

  self.onKeypress = function(e) {
    const KEY_UP = 38;
    const KEY_DOWN = 40;
    const KEY_ESCAPE = 27;
    const KEY_PGDOWN = 34;
    const KEY_PGUP = 33;
    const KEY_TAB = 9;

    var cotaSearchResultsPanel =
      document.getElementById("cota-search-results-panel");

    //
    // If the user presses ESCAPE, empty the textfield
    //
    if(e.keyCode == KEY_ESCAPE) {
      if(cotaSearchResultsPanel.state == 'open' ||
         cotaSearchResultsPanel.state == 'showing') {
        cotaSearchResultsPanel.hidePopup();
      }

      var cotaSearchInput = document.getElementById("cotaSearchInput");
      cotaSearchInput.inputField.value = '';

      e.preventDefault();
      return false;
    }

    if(e.keyCode != KEY_UP &&
       e.keyCode != KEY_DOWN &&
       e.keyCode != KEY_PGDOWN &&
       e.keyCode != KEY_PGUP &&
       e.keyCode != KEY_TAB) {
      return true;
    }

    var cotaResultsList = document.getElementById('cota-results-list');

    if(cotaSearchResultsPanel.state == 'open' &&
       cotaResultsList.itemCount > 0) {
      var idx = cotaResultsList.selectedIndex;

      if(e.keyCode == KEY_UP) {
        idx = idx - 1;
        if(idx < 0) {
          idx = cotaResultsList.itemCount - 1;
        }
      }
      else if(e.keyCode == KEY_DOWN ||
              e.keyCode == KEY_TAB) {
        idx = idx + 1;

        if(idx >= cotaResultsList.itemCount) {
          idx = 0;
        }
      }
      else if(e.keyCode == KEY_PGUP) {
        idx = idx - cotaResultsList.getNumberOfVisibleRows();

        if(idx < 0) {
          idx = 0;
        }
      }
      else if(e.keyCode == KEY_PGDOWN) {
        var firstVisibleIdx = cotaResultsList.getIndexOfFirstVisibleRow();
        idx = idx + cotaResultsList.getNumberOfVisibleRows();

        if(idx >= cotaResultsList.itemCount) {
          idx = cotaResultsList.itemCount - 1;
        }
      }

      cotaResultsList.selectedIndex = idx;
      cotaResultsList.ensureIndexIsVisible(idx);
    }

    if(e.keyCode == KEY_TAB) {
      e.preventDefault();
      return false;
    }

    return true;
  }

  pub.onSearchModeChanged = function() {
    var cotaResultsList = document.getElementById('cota-results-list');

    while(cotaResultsList.childNodes.length > 0) {
      cotaResultsList.removeChild(cotaResultsList.lastChild);
    }

    self.curSearchMode = [ ];
    var curSearchModePrefValue = [ ];
    for(var i = 0; i < self.searchModes.length; i++) {
      var curMode = self.searchModes[i];
      var menuItem = document.getElementById(curMode);

      if(menuItem.getAttribute('checked') == 'true') {
        self.curSearchMode.push(curMode);
        curSearchModePrefValue.push(curMode);
      }
    }

    // Somehow the user deselected all search modes. Since this is
    // useless, we select namesAndEmails as a backup
    if(self.curSearchMode.length == 0) {
      self.curSearchMode.push(self.searchModes[0]);
      var menuItem = document.getElementById(self.searchModes[0]);

      if(menuItem) {
        menuItem.setAttribute('checked', true);
        curSearchModePrefValue.push(self.searchModes[0]);
      }
    }

    self.cotaPrefs.setCharPref('searchMode',
                               JSON.stringify(curSearchModePrefValue));
  }

  pub.onInput = function() {
    var cotaSearchInput = document.getElementById("cotaSearchInput");
    var cotaSearchResultsPanel =
      document.getElementById("cota-search-results-panel");
    var cotaResultsList = document.getElementById('cota-results-list');

    var results = self.searchEngine.autoCompleteContacts(cotaSearchInput.value,
                                                         self.curSearchMode);
    var resultsDocFragment = document.createDocumentFragment();
    if(cotaSearchResultsPanel.state == 'closed') {
      var width = cotaSearchInput.getBoundingClientRect().width;
      cotaSearchResultsPanel.setAttribute('width',
                                          width > 200 ? width : 200);

      cotaResultsList.setAttribute('maxheight', 500);

      cotaSearchResultsPanel.openPopup(cotaSearchInput,
                                       "after_start",
                                       0, 0,
                                       false, false);
      cotaResultsList.selectedIndex = -1;
      cotaResultsList.ensureIndexIsVisible(0);
    }

    if(results.length == 0 &&
       cotaSearchInput.value == '') {
      cotaSearchResultsPanel.hidePopup();
    }
    else if(results.length == 0) {
      var vbox =
        document.getElementById('cota-create-contact-prototype').cloneNode(true);
      vbox.removeAttribute('id');
      var createNewContactText = vbox.children[0].getAttribute('value');
      createNewContactText = createNewContactText.replace(/@C/g,
                                                          cotaSearchInput.value);
      vbox.children[0].setAttribute('value', createNewContactText);
      var listItem = document.createElement('richlistitem');
      listItem.setAttribute("class", "autocomplete-richlistitem");
      listItem.appendChild(vbox);
      listItem.setUserData('cotaCreateContact', cotaSearchInput.value, null);
      resultsDocFragment.appendChild(listItem);
    }
    else {
      var useClickableEmails = self.cotaPrefs.getBoolPref("useClickableEmails");
      var prototypeIds = ['cota-name-and-organisation-prototype'];
      if(self.arrayContains(self.curSearchMode, 'cota-search-for-emails')) {
        prototypeIds.push('cota-email-prototype');
      }

      if(self.arrayContains(self.curSearchMode, 'cota-search-for-addresses')) {
        prototypeIds.push('cota-work-address-prototype');
        prototypeIds.push('cota-home-address-prototype');
      }

      if(self.arrayContains(self.curSearchMode, 'cota-search-for-phone')) {
        prototypeIds.push('cota-phones-prototype');
      }

      if(self.arrayContains(self.curSearchMode, 'cota-search-for-chat')) {
        prototypeIds.push('cota-chat-prototype');
      }

      if(self.arrayContains(self.curSearchMode, 'cota-search-for-notes')) {
        prototypeIds.push('cota-notes-and-userfields-prototype');
      }

      var numOfResultsPref = self.cotaPrefs.getIntPref('numberOfResults');
      var numOfResults =
        (results.length < numOfResultsPref) ? results.length: numOfResultsPref;
      for(var i = 0; i < numOfResults; i++) {
        var listItem = self.createListItem(results[i],
                                           prototypeIds,
                                           useClickableEmails);
        resultsDocFragment.appendChild(listItem);
      }
    }

    //
    // Replace current richlist with newly created one
    //
    var clonedCotaResultsList = cotaResultsList.cloneNode(false);
    clonedCotaResultsList.appendChild(resultsDocFragment);
    var resultListContainer = document.getElementById('cota-results-list-container');
    if(resultListContainer) {
        resultListContainer.replaceChild(clonedCotaResultsList, cotaResultsList);
    }
  }

  self.createListItem = function(cardAbookTuple, boxIds, useClickableEmails) {
    var listItem = document.createElement('richlistitem');
    listItem.setAttribute("class", "autocomplete-richlistitem");

    var listItemContentRoot = listItem;
    if(boxIds.length > 0) {
      listItemContentRoot = document.createElement('vbox');
      listItem.appendChild(listItemContentRoot);
    }

    for(var boxIdIdx = 0; boxIdIdx < boxIds.length; boxIdIdx++) {
      var boxId = boxIds[boxIdIdx];
      var vbox = document.getElementById(boxId).cloneNode(true);
      vbox.removeAttribute('id');

      var hasData = self.createBox(vbox, cardAbookTuple, useClickableEmails);

      if(hasData) {
        listItemContentRoot.appendChild(vbox);
      }
    }

    listItem.setUserData('cardAbookTuple', cardAbookTuple, null);

    return listItem;
  }

  self.createBox = function(box, cardAbookTuple, useClickableEmails) {
    var hasData = false;
    for (var i = 0; i < box.children.length; i++) {
      var child = box.children[i];

      if(self.isBox(child)) {
        var childBoxHasData = self.createBox(child, cardAbookTuple);

        if(childBoxHasData == true) {
          hasData = true;
        }
        else {
          child.setAttribute('style', 'visibility: hidden; display: none;');
        }
      }
      else {
        if(child.hasAttribute('cotaCardProperty')) {
          var cotaCardProperty = child.getAttribute('cotaCardProperty');

          if(cotaCardProperty == 'CotaAlwaysVisible') {
            child.removeAttribute('style');
          }
          else if(cotaCardProperty == 'CotaName') {
            var cotaName =
              cardAbookTuple.name;
            child.setAttribute('value', cotaName);
            child.removeAttribute('style');
            hasData = true;
          }
          else if(cotaCardProperty == 'AbookName') {
            var showAbookName = self.cotaPrefs.getBoolPref("showAddressBookName");
            if(showAbookName) {
              child.setAttribute('value', '(' + cardAbookTuple.abook.dirName + ')');
              child.removeAttribute('style');
            }
            hasData = true;
          }
          else if(cotaCardProperty.indexOf(',') >= 0) {
            var cardProperties = cotaCardProperty.split(',');
            var cpValues = [];

            for(var cpIdx = 0; cpIdx < cardProperties.length; cpIdx++) {
              var v = cardAbookTuple.card.getProperty(cardProperties[cpIdx], '');
              v = v.replace(/^\s\s*/, '').replace(/\s\s*$/, '');

              if(v && v != '') {
                cpValues.push(v);
              }
            }

            if(cpValues.length > 0) {
              child.setAttribute('value', cpValues.join(', '));
              child.removeAttribute('style');
              hasData = true;
            }
          }
          else if(cotaCardProperty.endsWith('Type')) {
            var v = cardAbookTuple.card.getProperty(cotaCardProperty, '');
            if(v && v != '') {
              try {
                var typePrefix = self.cotaBundle.getString('cota.searchinput.resultlistitem.' + v);
                child.setAttribute('value', typePrefix);
              } catch(e) {
                child.setAttribute('value', v + ':');
              }
            }
          }
          else {
            var v = cardAbookTuple.card.getProperty(cotaCardProperty, '');
            v = v.replace(/^\s\s*/, '').replace(/\s\s*$/, '');

            if(v && v != '') {
              if(useClickableEmails &&
                 self.arrayContains(self.clickableEmailProperties, cotaCardProperty)) {
                var ahref = document.createElementNS("http://www.w3.org/1999/xhtml",
                                                     "a");
                ahref.setAttribute('href', 'mailto:' + v);
                ahref.className = 'emailLink';
                var txtNode = document.createTextNode(v);
                ahref.appendChild(txtNode);
                child.appendChild(ahref);
              }
              else {
                child.setAttribute('value', v);
              }
              child.removeAttribute('style');
              hasData = true;
            }
            else {
              child.setAttribute('style', 'visibility: hidden; display: none;');
            }
          }
        }
        else {
          child.setAttribute('style', 'visibility: hidden; display: none;');
        }
      }
    }

    return hasData;
  }

  self.isBox = function(node) {
    return (node.localName == 'box' ||
            node.localName == 'vbox' ||
            node.localName == 'hbox');
  }

  pub.onEnterInSearchBar = function(eventParam, event) {
    var cotaResultsList = document.getElementById('cota-results-list');
    if(cotaResultsList.itemCount > 0) {
      if(cotaResultsList.selectedIndex == -1) {
        cotaResultsList.selectedIndex = 0;
      }

      if(event &&
         event.shiftKey &&
         cotaResultsList.selectedItem &&
         self.cotaPrefs.getBoolPref('enableSendToPrimaryEmail')) {
        self.openEmailComposer(cotaResultsList.selectedItem);

        return;
      }

      self.cotaSearchResultClicked(event);
    }
  }

  self.createCard = function(aPrimaryEmail) {
    document.getElementById('tabmail').openTab('cota-cardViewTab',
                                               {mode: 'create-new-contact',
                                                primaryemail: aPrimaryEmail});
  }

  self.createNewContact = function(e) {
    self.createCard(null);
  }

  self.addToAddressBookItem = function() {
    var emailAddressNode = self.findEmailNodeFromPopupNode(document.popupNode,
                                                           'emailAddressPopup');

    var card = Components.classes["@mozilla.org/addressbook/cardproperty;1"]
      .createInstance(Components.interfaces.nsIAbCard);

    card.displayName = emailAddressNode.getAttribute("displayName");
    card.primaryEmail = emailAddressNode.getAttribute("emailAddress");

    var localStorageId = card.primaryEmail;

    var cardAbookTuple = {
      card: card,
      abook: null
    };

    contacttabs.cotaStorage.set(localStorageId, cardAbookTuple);

    document.getElementById('tabmail').openTab('cota-cardViewTab',
                                               {mode: 'create-new-contact',
                                                localStorageId: localStorageId});
  }

  self.onAddressDescClicked = function(evt) {
    var star = document.getAnonymousElementByAttribute(evt.target,
                                                       'anonid',
                                                       'emailStar');
    if(star) {
      var emailAddressNode = star.parentNode.parentNode;
      if (emailAddressNode && emailAddressNode.cardDetails &&
          emailAddressNode.cardDetails.card) {
        self.editedEmailCardDetails = emailAddressNode.cardDetails;
      }
    }
  }

  self.onOpenEditContactPanel = function () {
    var emailAddressNode = self.findEmailNodeFromPopupNode(document.popupNode,
                                                           'emailAddressPopup');
    self.editedEmailCardDetails = emailAddressNode.cardDetails;
  }

  self.editContact = function() {
    var localStorageId =
      self.editedEmailCardDetails.card.uuid + '/' +
      self.editedEmailCardDetails.card.directoryId;

    var cardAbookTuple = {
      card: self.editedEmailCardDetails.card,
      abook: self.editedEmailCardDetails.book
    };

    contacttabs.cotaStorage.set(localStorageId, cardAbookTuple);

    document.getElementById('tabmail').openTab('cota-cardViewTab',
                                               {mode: 'edit-contact',
                                                localStorageId: localStorageId});

    document.getElementById('editContactPanel').hidePopup();
  }

  self.findEmailNodeFromPopupNode = function(elt, popup) {
    // This annoying little function is needed because in the binding for
    // mail-emailaddress, we set the context on the <description>, but that if
    // the user clicks on the label, then popupNode is set to it, rather than
    // the description.  So we have walk up the parent until we find the
    // element with the popup set, and then return its parent.

    while (elt.getAttribute("popup") != popup) {
      elt = elt.parentNode;
      if (elt == null) {
        return null;
      }
    }

    return elt.parentNode;
  }

  self.arrayContains = function(arr, findValue) {
    var i = arr.length;

    while (i--) {
      if (arr[i] === findValue) {
        return true;
      }
    }
    return false;
  }

  pub.onCotaShortcut = function() {
    var s = document.getElementById('cotaSearchInput');
    if (s) {
      s.focus();
    }
  }

  return pub;
};

// Init addin after window loaded
window.addEventListener("load",
                        contacttabs.Main.init,
                        false);
