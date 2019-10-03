if (typeof contacttabs == "undefined") {
  var contacttabs = {};
};

Components.utils.import("resource://gre/modules/AddonManager.jsm");
Components.utils.import("resource:///modules/mailServices.js");
Components.utils.import("chrome://contacttabs/content/cotaAbookManager.js",
                       contacttabs);
Components.utils.import("chrome://contacttabs/content/cotaTabUtils.js",
                       contacttabs);
Components.utils.import("chrome://contacttabs/content/cotaClipboardManager.js",
                       contacttabs);
Components.utils.import("chrome://contacttabs/content/cotaStorage.js",
                        contacttabs);

// abCommon.js requires this to be globally available
var gAddressBookBundle;

contacttabs.CardView = new function() {
  var pub = {};
  var self = this;

  self.cardTitle = null;
  self.card = null;
  self.prefsBranchName = "extensions.org.janek.cota.";
  self.prefs = null;
  self.abook = null;
  self.contactMoved = false;

  self.incompatibleAddonsActive = false;

  self.abListener = {
    onItemAdded: function(parentDir, item) {
      try {
        item.QueryInterface(Components.interfaces.nsIAbDirectory);

        var abooksListElem = document.getElementById('cota-abookslist');
        self.setupAbooksListElem(abooksListElem);
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

        var abooksListElem = document.getElementById('cota-abookslist');
        self.setupAbooksListElem(abooksListElem);
      }
      catch(e) {
        // If item is not an nsIAbDirectory we'll get a NS_ERROR_NO_INTERFACE.
        // We ignore this exception because we're only interested in
        // added address books
      }
    },
    onItemPropertyChanged: function(item, property, oldValue, newValue) {
      var changedCard = item.QueryInterface(Components.interfaces.nsIAbCard);

      if(changedCard.uuid == self.card.uuid) {
        self.card = changedCard;

        var localStorageId =
          contacttabs.TabUtils.getLocalStorageId(document, window);
        contacttabs.cotaStorage.set(localStorageId,
                                { card: self.card,
                                  abook: self.abook });

        pub.reloadTab();
      }
    }
  };

  self.moveContactToAddressbook = function() {
    var abooksListElem = document.getElementById('cota-abookslist');
    var toAbookUri = abooksListElem.selectedItem.value;

    if(self.abook.URI != toAbookUri) {
      var toAbook = contacttabs.AbookManager.moveContact(self.card,
                                                            self.abook.URI,
                                                            toAbookUri);
      self.abook = toAbook;
      self.contactMoved = true;
    }
  }

  self.showContactMovedHumanMsg = function() {
    if(self.contactMoved == false) {
      return;
    }

    self.contactMoved = false;

    var cardContent = document.getElementById('CardContent');
    if(cardContent) {
      var msg = document.getElementById('card-moved-humanmsg');
      msg.className = 'humanMsgVisible';

      var humanMsg = self.cardMovedHumanMsgContent.replace(/@V/g,
                                                           self.abook.dirName);
      document
        .getElementById('card-moved-humanmsg-content')
        .setAttribute('value', humanMsg);

      var x = (cardContent.getBoundingClientRect().width - msg.width) / 2;
      msg.openPopup(cardContent,
                    '',
                    x,
                    25,
                    false,
                    false);

      msg.addEventListener("transitionend",
                           self.removeContactMovedHumanMsg,
                           true);
      window.addEventListener('mousemove',
                              self.startRemovingContactMovedHumanMsg,
                              true);
      window.addEventListener('click',
                              self.startRemovingContactMovedHumanMsg,
                              true);
      window.addEventListener('keypress',
                              self.startRemovingContactMovedHumanMsg,
                              true);
      window.setTimeout(function() { self.startRemovingContactMovedHumanMsg() },
                        3000);
    }
  }

  self.startRemovingContactMovedHumanMsg = function() {
    var msg = document.getElementById('card-moved-humanmsg');

    if(msg.className != 'humanMsgHidden') {
      msg.className = 'humanMsgHidden';
    }
  };

  self.removeContactMovedHumanMsg = function() {
    var msg = document.getElementById('card-moved-humanmsg');
    msg.hidePopup();

    msg.removeEventListener("transitionend",
                            self.removeContactMovedHumanMsg,
                            true);
    window.removeEventListener('mousemove',
                               self.startRemovingContactMovedHumanMsg,
                               true);
    window.removeEventListener('click',
                               self.startRemovingContactMovedHumanMsg,
                               true);
    window.removeEventListener('keypress',
                               self.startRemovingContactMovedHumanMsg,
                               true);
  }

  self.unload = function() {
    window.removeEventListener("load",
                               contacttabs.CardView.init,
                               false);
    window.removeEventListener("unload",
                               self.unload,
                               false);
    var abooksListElem = document.getElementById('cota-abookslist');
    abooksListElem.removeEventListener('select',
                                       self.moveContactToAddressbook,
                                       false);
    abooksListElem.removeEventListener('popuphidden',
                                       self.showContactMovedHumanMsg,
                                       false);

    MailServices.ab.removeAddressBookListener(self.abListener);
  }

  pub.init = function() {
    window.addEventListener("unload",
                            self.unload,
                            false);

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
    });

    MailServices.ab.addAddressBookListener(self.abListener,
                                           Components.interfaces.nsIAbListener.all);

    gAddressBookBundle = document.getElementById("bundle_addressBook");

    OnLoadCardView();

    var localStorageId =
        contacttabs.TabUtils.getLocalStorageId(document, window);
    var cardAbookTuple = contacttabs.cotaStorage.get(localStorageId, null);
    if(cardAbookTuple != null) {
      self.card = cardAbookTuple.card;
      self.abook = cardAbookTuple.abook;
    }

    self.prefs = Components.classes["@mozilla.org/preferences-service;1"]
                           .getService(Components.interfaces.nsIPrefService)
                           .getBranch(self.prefsBranchName);
    self.prefs.QueryInterface(Components.interfaces.nsIPrefBranch);

    self.cardMovedHumanMsgContent = document.getElementById('card-moved-humanmsg-content').getAttribute('value');
    pub.reloadTab();
  }

  pub.editCard = function(e) {
    var cotaPrefs =
      Components.classes["@mozilla.org/preferences-service;1"]
                .getService(Components.interfaces.nsIPrefService)
                .getBranch('extensions.org.janek.cota.');
    cotaPrefs.QueryInterface(Components.interfaces.nsIPrefBranch);

    if(e.shiftKey) {
      self.openAbEditCardDialog();
    }
    else if(cotaPrefs.getBoolPref('cotaCardEditor') &&
       self.incompatibleAddonsActive == false) {
      var tabBar = contacttabs.TabUtils.findTabBar(window);
      var browser = tabBar.getBrowserForSelectedTab();

      self.loadCardEditor(browser);
    }
    else {
      self.openAbEditCardDialog();
    }
  }

  self.openAbEditCardDialog = function() {
    window.openDialog("chrome://messenger/content/addressbook/abEditCardDialog.xul",
                      "",
                      "chrome,resizable=no,modal,titlebar,centerscreen",
                      {abURI:self.abook.URI, card: self.card});

    pub.reloadTab();
  }

  pub.copyToClipboard = function() {
    contacttabs.ClipboardManager.copyToClipboard(self.card, document);
  }

  pub.copyPrivateAddressToClipboard = function() {
    contacttabs.ClipboardManager.copyPrivateAddressToClipboard(self.card, document);
  }

  pub.copyWorkAddressToClipboard = function() {
    contacttabs.ClipboardManager.copyWorkAddressToClipboard(self.card, document);
  }

  pub.copyPhonesToClipboard = function() {
    contacttabs.ClipboardManager.copyPhonesToClipboard(self.card, document);
  }

  self.loadCardEditor = function(aBrowser) {
    var xulAppInfo = Components.classes["@mozilla.org/xre/app-info;1"]
      .getService(Components.interfaces.nsIXULAppInfo);
    var versionComparator =
      Components.classes["@mozilla.org/xpcom/version-comparator;1"]
      .getService(Components.interfaces.nsIVersionComparator);

    if(versionComparator.compare(xulAppInfo.version, "15.0") >= 0) {
      var colMode = self.prefs.getCharPref("cotaCardEditorLayout");
      aBrowser.loadURI("chrome://contacttabs/content/cotaCardEditor15" +
                       colMode + ".xul");
    }
    else {
      aBrowser.loadURI("chrome://contacttabs/content/cotaCardEditor.xul");
    }
    },

  pub.reloadTab = function() {
    // TB's DisplayCardViewPane reads data from top.cvData. Therefore, we need to provide it.
    top.cvData = window.cvData;

    if(self.card) {
      DisplayCardViewPane(self.card);

      //
      // Copy CardTitle to document.title to show the contact's name in the tab header
      //
      self.cardTitle = document.getElementById("CardTitle").childNodes[0].nodeValue;
      document.title = self.cardTitle;

      if(self.prefs.getBoolPref('showCardPropertiesInCardView')) {
        self.showCardPropertiesInCardView();
      }


      if(self.card.getProperty('SelfURL', '') != '') {
        self.showGContactSyncProperties();
      }
    }

    var abooksListElem = document.getElementById('cota-abookslist');
    self.setupAbooksListElem(abooksListElem);
    abooksListElem.addEventListener('select',
                                    self.moveContactToAddressbook,
                                    false);

    abooksListElem.addEventListener('popuphidden',
                                    self.showContactMovedHumanMsg,
                                    false);

  }

  self.showCardPropertiesInCardView = function() {
    var cardPropsBox = document.getElementById('cvbCardProps');
    cardPropsBox.removeAttribute('collapsed');
    var cardPropsTree = document.getElementById('cvCardPropertiesTreeChildren');
    var cardProps = self.card.properties;

    while (cardProps.hasMoreElements()) {
      var property = cardProps.getNext().QueryInterface(Components.interfaces.nsIProperty);

      var treeItem = document.createElement("treeitem");
      var treeRow = document.createElement("treerow");
      var treeCellPropName = document.createElement("treecell");
      var treeCellPropValue = document.createElement("treecell");

      treeCellPropName.setAttribute("label", property.name);
      treeCellPropValue.setAttribute("label", property.value);

      treeRow.appendChild(treeCellPropName);
      treeRow.appendChild(treeCellPropValue);

      treeItem.appendChild(treeRow);

      cardPropsTree.appendChild(treeItem);
    }
  }

  self.showGContactSyncProperties = function() {
    var bundle = document.getElementById("gcontactsync-strings");

    // Contact section (ThirdEmail, FourthEmail)
    var visible     = !cvData.cvbContact.getAttribute("collapsed");

    // Third Email
    var thirdEmail = self.card.getProperty('ThirdEmail', '');
    if(thirdEmail != '') {
      var thirdEmailBox = document.getElementById('cvEmail3Box');
      visible = HandleLink(document.getElementById('cvEmail3'),
                           bundle.getString("ThirdEmail"),
                           thirdEmail,
                           document.getElementById('cvEmail3Box'),
                           "mailto:" +
                           thirdEmail) || visible;
    }

    // Fourth Email
    var fourthEmail = self.card.getProperty('FourthEmail', '');
    if(fourthEmail != '') {
      var fourthEmailBox = document.getElementById('cvEmail4Box');
      visible = HandleLink(document.getElementById('cvEmail4'),
                           bundle.getString("FourthEmail"),
                           fourthEmail,
                           document.getElementById('cvEmail4Box'),
                           "mailto:" +
                           fourthEmail) || visible;
    }

    cvSetVisible(cvData.cvhContact, visible);
    cvSetVisible(cvData.cvbContact, visible);

    // Add types to webpages
    var webpageValues = ["WebPage1", "WebPage2"];
    for (var i = 0; i < webpageValues.length; ++i) {
      var value = self.card.getProperty(webpageValues[i], null);
      var type  = self.card.getProperty(webpageValues[i] + "Type", null);
      var visible = value && type;
      var elem = document.getElementById(webpageValues[i] + "Type");
      cvSetVisible(elem, visible);
      try {
        elem.value = bundle.getString(type);
      } catch(e) {
        elem.value = type;
      }
    }

    // Relations
    var relationValues = ['Relation0',
                          'Relation1',
                          'Relation2',
                          'Relation3',
                          'Relation4',
                          'Relation5'];

    var cvhRelationsVisible = false;
    for(var i = 0; i < relationValues.length; ++i) {
      var value = self.card.getProperty(relationValues[i], null);
      var type = self.card.getProperty(relationValues[i] + 'Type', null);
      var visible = value && type;
      var elem = document.getElementById('cv' + relationValues[i]);

      cvSetVisible(elem, visible);
      try {
        elem.value = bundle.getString(type) + ': ' + value;
      } catch(e) {
        elem.value = type + ': ' + value;
      }
      cvhRelationsVisible = cvhRelationsVisible || visible;
    }

    cvSetVisible(document.getElementById('cvhRelations'), cvhRelationsVisible);
    cvSetVisible(document.getElementById('cvbRelations'), cvhRelationsVisible);

    // Phone numbers
    var phoneNumbers = [
      { domId: 'cvPhWork', cardProp: 'WorkPhone', type: 'WorkPhoneType'},
      { domId: 'cvPhHome', cardProp: 'HomePhone', type: 'HomePhoneType'},
      { domId: 'cvPhFax', cardProp: 'FaxNumber', type: 'FaxNumberType'},
      { domId: 'cvPhCellular', cardProp: 'CellularNumber', type: 'CellularNumberType'},
      { domId: 'cvPhPager', cardProp: 'PagerNumber', type: 'PagerNumberType'},
      { domId: 'cvPhHomeFax', cardProp: 'HomeFaxNumber', type: 'HomeFaxNumberType'},
      { domId: 'cvPhOther', cardProp: 'OtherNumber', type: 'OtherNumberType'},
    ];

    var cvhPhoneNumbersVisible = false;
    for(var i = 0; i < phoneNumbers.length; ++i) {
      var phone = phoneNumbers[i];

      var value = self.card.getProperty(phone.cardProp, null);
      var type = self.card.getProperty(phone.type, null);
      var visible = value && type;
      var elem = document.getElementById(phone.domId);

      cvSetVisible(elem, visible);
      try {
        elem.value = bundle.getString(type) + ': ' + value;
      } catch(e) {
        elem.value = type + ': ' + value;
      }

      cvhPhoneNumbersVisible = cvhPhoneNumbersVisible || visible;
    }

    cvSetVisible(document.getElementById('cvhPhone'), cvhPhoneNumbersVisible);
    cvSetVisible(document.getElementById('cvbPhone'), cvhPhoneNumbersVisible);
  }

  self.setupAbooksListElem = function(abooksListElem) {
    abooksListElem.removeAllItems();

    var allAddressBooks = contacttabs.AbookManager.getAddressBooks();
    for (var i = 0; i < allAddressBooks.length; i++) {
      var addressBook = allAddressBooks[i];

      var item = abooksListElem.appendItem(addressBook.abook.dirName,
                                           addressBook.abook.URI);

      if(addressBook.abook.URI == self.abook.URI) {
        abooksListElem.selectedItem = item;
      }
    }
  }

  pub.deleteCard = function() {
    var bundle = document.getElementById("cota-strings");
    var deleteCardDialogTitle = bundle.getString("deleteCardDialog.title");
    var deleteCardDialogMessage = bundle.getString("deleteCardDialog.message");

    var promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
                    .getService(Components.interfaces.nsIPromptService);
    var result =
      promptService.confirmEx(
        window,
        deleteCardDialogTitle,
        deleteCardDialogMessage,
        (promptService.BUTTON_TITLE_YES * promptService.BUTTON_POS_0) +
        (promptService.BUTTON_TITLE_NO * promptService.BUTTON_POS_1),
        null, null, null, null, {value:0});

    if(result == 0)
      {
        var abManager = Components.classes["@mozilla.org/abmanager;1"]
          .getService(Components.interfaces.nsIAbManager);
        var cardsToDelete = Components.classes["@mozilla.org/array;1"]
          .createInstance(Components.interfaces.nsIMutableArray);
        cardsToDelete.appendElement(self.card, false);

        self.abook.deleteCards(cardsToDelete);

        var mainWindow = contacttabs.TabUtils.findMainWindow(window);

        // Now close the tab
        mainWindow.document.getElementById('tabmail').removeCurrentTab();
      }
  }

  pub.openLink = function(id) {
    try {
      var messenger = Components.classes["@mozilla.org/messenger;1"].createInstance();
      messenger = messenger.QueryInterface(Components.interfaces.nsIMessenger);

      var href = document.getElementById(id).getAttribute("href")
      if(href.indexOf("://") == -1) {
        href = "http://" + href;
      }

      messenger.launchExternalURL(href);
    } catch (ex) {}

    // return false, so we don't load the href in the addressbook window
    return false;
  }

  pub.showOptions = function() {
      var features = "chrome,titlebar,toolbar,centerscreen,resizable";
      window.openDialog("chrome://contacttabs/content/preferences.xul", "Contact Tabs options", features);
  }

  return pub;
};

window.addEventListener("load",
                        contacttabs.CardView.init,
                        false);
