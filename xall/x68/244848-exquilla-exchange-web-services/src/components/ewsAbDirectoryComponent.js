/*
 ***** BEGIN LICENSE BLOCK *****
 * This file is part of ExQuilla by Mesquilla.
 *
 * Copyright 2016 R. Kent James
 *
 * All Rights Reserved
 *
 * ***** END LICENSE BLOCK *****
 */

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

ChromeUtils.defineModuleGetter(this, "EwsNativeService",
                               "resource://exquilla/EwsNativeService.jsm");
ChromeUtils.defineModuleGetter(this, "StringArray",
                               "resource://exquilla/StringArray.jsm");
ChromeUtils.defineModuleGetter(this, "PropertyList",
                               "resource://exquilla/PropertyList.jsm");
ChromeUtils.defineModuleGetter(this, "JaBaseAbDirectory",
                               "resource://exquilla/JaBaseAbDirectory.jsm");
ChromeUtils.defineModuleGetter(this, "PromiseUtils",
                               "resource://exquilla/PromiseUtils.jsm");

ChromeUtils.defineModuleGetter(this, "JSAccountUtils", "resource://exquilla/JSAccountUtils.jsm");

// Main class.
var global = this;
function EwsAbDirectory(aDelegator, aBaseInterfaces) {
  if (typeof (safeGetJS) == "undefined")
    Utils.importLocally(global);

  // Superclass constructor
  JaBaseAbDirectory.call(this, aDelegator, aBaseInterfaces);

  // We want to ensure that calls to any methods used in extraInterfaces always
  // refer to this object, and not a wrapper. We use wrap to always point to
  // the correct object to use for refering to the object. All references that
  // are called from an extra interface method or attribute must refer to
  // this.wrap and not simply this.
  this.wrap = this;

  // instance variables

  this.mNativeFolder = null;
  this.cards = null;
  this.mailLists = [];
  this.addressMap = null;
  this.mURI = null;

  // operational status
  this.gettingCardIds = false; // We don't want to get these twice if there are multiple requests
  this.gettingNewItems = false; // We don't want to get these twice if there are multiple requests
  this.updatingCard = false;
  this.resolvingNames = false;

  // todo: we need some method to update the ab when loaded

  // query-related stuff, following nsAbDirectoryRDFResource
  this.mIsQueryURI = false;
  this.mQueryString = null;
  this.mURINoQuery = null;
  this.mNoQueryDirectory = null;
  this.rebuildListener = null;
  this.getChildCardsListener = null;
  this.mIsGAL = false;
  // storage of strings for non-top level directories (that is, mailing lists)
  this.stringValues = {};
  this.startup();
}

// Extend the base properties.
EwsAbDirectory.Properties = {
  __proto__: JaBaseAbDirectory.Properties,

  classID: Components.ID("{62EC44B5-D647-4023-96D6-EAE7A17DCD79}"),

  // Add additional interfaces only needed by this custom class.
  extraInterfaces: [ Ci.nsIAbDirSearchListener ],
}

// Extend the base class methods.
EwsAbDirectory.prototype = {
  // Typical boilerplate to include in all implementations.
  __proto__: JaBaseAbDirectory.prototype,

  // Used to identify this as an EwsAbDirectory
  get EwsAbDirectory() {
    return this;
  },

  // InterfaceRequestor override, needed if extraInterfaces.
  getInterface: function(iid) {
    for (let iface of EwsAbDirectory.Properties.extraInterfaces) {
      if (iid.equals(iface)) {
        return this;
      }
    }
    return this.QueryInterface(iid);
  },

  // nsIAbDirectory overrides
  get childCards()
  { try {
    if (!this.mIsQueryURI)
      log.config('ewsAbDirectory get childCards, directory URI is ' + this.mURI);
    else
      log.config('ewsAbDirectory get childCards for query, directory URI is ' + this.mURI);
    if (this.isMailList)
    {
      log.debug('child card count ' + (this.cards ? this.cards.size : 0));
      return new ArrayEnumerator(this.cards ? [...this.cards.values()] : []);
    }
    // Setup a call to get existing ids
    let cardArray = [];
    if (!this.cards)
    {
      this.loadDirectoryCards(null);
    }
    // a query will declare and load this.cards
    if (this.cards)
    {
      for (let card of this.cards.values())
      {
        if (card)
          cardArray.push(card);
        else
          log.warn('EwsAbDirectoryOverride trying to add a null card');
      }
    }
    log.debug("get childCards() count is " + cardArray.length + " for directory " + this.URI);
    if (!this.gettingNewItems && !this.mIsQueryURI && !this.mIsGAL)
    {
      this.mailbox.getNewItems(this.nativeFolder, this);
      this.gettingNewItems = true;
    }
    return new ArrayEnumerator(cardArray);
  } catch(e) {re(e);}},

  get childNodes()
  {
    return new ArrayEnumerator(this.wrap.mailLists);
  },

  get URI()
  {
    return this.mURI;
  },

  get readOnly()
  {
    return this.isMailList || this.mIsGAL;
  },

  useForAutocomplete: function _useForAutocomplete(aIdentityKey)
  {
    // todo: I need an option to include or exclude EWS address books from auto complete.
    // For now, I will autocomplete as local, but treat the GAL separately async.
    let doAbAutocomplete = Cc["@mozilla.org/preferences-service;1"]
                             .getService(Ci.nsIPrefBranch)
                             .getBoolPref("extensions.exquilla.doAbAutocomplete");
    return (doAbAutocomplete && !this.mIsGAL);
  },

  deleteDirectory: function _deleteDirectory(aDirectory)
  {
    // When we are asked to remove a directory, sometimes we just want to stop viewing it locally.
    // Calendar has the concept of "unregister" which is what we usually want to do. AbManager
    // does that when it is asked to delete, but we can't tell if calls to delete are really
    // a user wanting to remove a sub calendar, or "unregister". So for now we will do nothing.
    log.warn("request to deleteDirectory is ignored");
  },

  addMailList: function _addMailList(aDirectory)
  {
    log.config('addMailList for uri ' + aDirectory.URI);
    if (this.mIsGAL)
    {
      log.warn("Can't add mail list to GAL");
      return;
    }
    // Don't add if it already exists
    if (this.hasDirectory(aDirectory))
    {
      log.warn('***Warning: trying to add existing mailList ' + aDirectory.URI);
      return;
    }
    this.wrap.mailLists.push(aDirectory);
    MailServices.ab.notifyDirectoryItemAdded(this, aDirectory);
  },

  hasDirectory: function _hasDirectory(aDirectory)
  {
    let uri = aDirectory.URI;
    for (let existingDirectory of this.wrap.mailLists)
    {
      //dl('Looking for subdirectory ' + existingDirectory.URI);
      if (uri == existingDirectory.URI)
        return true;
    }
    return false;
  },

  init: function _init(aUri)
  { try {
    log.config('ewsAbDirectory.init(' + aUri + ')');
    this.mURI = aUri;
    // query-related stuff
    this.mURINoQuery = aUri;
    let searchCharLocation = aUri.indexOf("?");
    if (searchCharLocation != -1)
    {
      this.mURINoQuery = aUri.substring(0, searchCharLocation);
      this.mIsQueryURI = true;
      this.mQueryString = aUri.substring(searchCharLocation + 1);
      this.mNoQueryDirectory = MailServices.ab
                                   .getDirectory(this.mURINoQuery);
      let jsBaseDirectory = safeGetJS(this.mNoQueryDirectory);
      this.mIsGAL = jsBaseDirectory.mIsGAL;
      if (this.mNoQueryDirectory.isQuery)
        throw Cr.NS_ERROR_UNEXPECTED;
      log.debug('ewsAbDirectory.init() for query ' + this.mQueryString + ' of directory ' + this.mURINoQuery);
      if (this.mIsGAL)
        log.debug('base of query is the GAL');
    }
    else
    {
      // We set the prefID to use by escaping the true URL to eliminate "."
      let util = Cc["@mozilla.org/network/util;1"]
                   .getService(Ci.nsINetUtil);
      let postScheme = aUri.substr(aUri.indexOf("://") + 3);
      let escapedPostScheme = util.escapeURL(postScheme, Ci.nsINetUtil.ESCAPE_URL_FILE_EXTENSION);
      this.dirPrefId = "ldap_2.servers.ews://" + escapedPostScheme;
      if (this.distinguishedFolderId == "msgfolderroot")
        this.mIsGAL = true;
    }

    // Is this a mailing list?
    searchCharLocation = aUri.indexOf('/_MailList_/');
    if (searchCharLocation != -1)
      this.isMailList = true;
    //log.debug('Is directory at ' + aUri + ' a MailList? ' + this.isMailList);

    if (!this.mIsQueryURI && this.serverURI && this.serverURI.length)
    {
    // try to get the mailbox, which will prove we are valid
      let mailbox;
      try {
        mailbox = this.mailbox;
      } catch (e) {}
      if (!mailbox)
      {
        log.config("Trying to initialize an address book with no valid account, serverURI is " + this.serverURI);
      }
    }

    let baseResource = this.cppBase.QueryInterface(Ci.nsIAbDirectory);
    baseResource.init(aUri);

  } catch(e) {re(e);}},

  modifyCard: function _modifyCard(aCard)
  {
    if (this.mIsGAL)
    {
      // We seem to get an attempt to modify a GAL card when it is used as part
      //  of a compose address. We just want to ignore those.
      log.debug("Attempt to modify a GAL card, just ignore if we are sending");
      throw CE("Trying to modify an Exchange GAL card");
    }
  try {
    //dl('EwsAbDirectoryOverride.modifyCard');
    // The UI calls us twice on modify, but with no async handling
    //  we can't really deal with that. The second call is just for save
    //  listeners, so we will ignore the second modify if either an add
    //  or modify soap action is pending.
    let doingUpdate = aCard.getProperty("doingUpdate", "");
    if (doingUpdate.length)
    {
      log.debug('modifyCard: skipping modifyCard since update in progress');
      return;
    }
    // Is this an existing card?
    let itemId = aCard.getProperty('itemId', '');
    if (!itemId.length)
    {
      log.debug('modifyCard: this is not an existing ews card');
      throw Cr.NS_ERROR_NOT_INITIALIZED;
    }
    //dl('card has item id ' + itemId);
    let nativeItem = this.mailbox.getItem(itemId);
    let newProperties = nativeItem.properties.clone(null);
    let didChange =  this.updatePropertiesFromCard(aCard, newProperties, true);
    //nativeItem.raiseFlags(nativeItem.UpdatedLocally);
    if (didChange)
    {
      let listener = new UpdateCardListener(aCard);
      aCard.setProperty("doingUpdate", "true");
      this.mailbox.updateItemProperties(nativeItem, newProperties, listener);
    }

  } catch (e) {re(e);}},

  addCard: function _addCard(aCard)
  {
    if (this.mIsGAL)
    {
      log.warn("Can't add a card to the GAL");
      return;
    }
    log.debug('EwsAbDirectoryOverride.addCard');
    let properties = new PropertyList();
    this.updatePropertiesFromCard(aCard, properties, false);
    let newCard = Cc['@mozilla.org/addressbook/cardproperty;1']
                    .createInstance(Ci.nsIAbCard);
    newCard.directoryId = this.uuid;
    let newNativeContact = this.mailbox.createItem(null, "IPM.Contact", this.nativeFolder);
    newNativeContact.properties = properties;
    this.updateCardFromItem(newNativeContact, newCard);
    let listener = new NewCardListener(newCard, newNativeContact, this);

    this.mailbox.saveNewItem(newNativeContact, listener);
  },

  deleteCards: function _deleteCards(aCards)
  {
    return this.deleteCardsWithListener(/* COMPAT for TB 68 */toArray(aCards, Ci.nsIAbCard), null);
  },

  dropCard: function _dropCard(aCard, aNeedToCopyCard)
  {
    // We're going to ignore the need to copy bit
    this.addCard(aCard);
  },

  setStringValue: function _setStringValue(aName, aValue)
  {
    if (this.isMailList)
      this.stringValues[aName] = aValue;
    else
      this.cppBase.QueryInterface(Ci.nsIAbDirectory).setStringValue(aName, aValue);
  },
  getStringValue: function _getStringValue(aName, aDefaultValue)
  {
    if (this.isMailList)
    {
      if (aName in this.stringValues)
        return this.stringValues[aName];
      return aDefaultValue;
    }
    return this.cppBase.QueryInterface(Ci.nsIAbDirectory).getStringValue(aName, aDefaultValue);
  },

  // the base dirName uses a preference, which forces this to be a top level directory. That
  //  does not work for mailing lists
  set dirName(aName)
  {
    if (this.isMailList)
      this.setStringValue("description", aName);
    else
      this.cppBase.QueryInterface(Ci.nsIAbDirectory).dirName = aName;
  },
  get dirName()
  {
    if (this.isMailList)
      return this.getStringValue("description", "?");
    return this.cppBase.QueryInterface(Ci.nsIAbDirectory).dirName;
  },

  // nsIAbCollection overrides

  cardForEmailAddress: function _cardForEmailAddress(emailAddress)
  { try {
    if (!this.addressMap || !this.cards)
    {
      // This seems to happen on startup. coming from the view before cards are loaded
      //log.debug("cardForEmailAddress not initialized");
      return null;
    }
    if (!emailAddress || !emailAddress.length)
      return null;
    let idList = this.addressMap[emailAddress.toLowerCase()];
    return (idList && idList.length) ? this.cards.get(idList[0])
                                     : null;
  } catch(e) {re(e);}},

  getCardFromProperty: function _getCardFromProperty(aName, aValue, aCaseSensitive)
  {
    let value = aCaseSensitive ? aValue : aValue.toLowerCase();
    if (aName != 'PrimaryEmail' && aName != 'SecondEmail')
      throw Cr.NS_ERROR_NOT_IMPLEMENTED;
    let card = this.cardForEmailAddress(value);
    if (card)
    {
      let property = card.getProperty(aName, '');
      if (!aCaseSensitive)
        property = property.toLowerCase();
      if (property == value)
        return card;
      else
        return null;
    }
  },

  // local helper functions
  addCardFromItem: function _addCardFromItem(aItem)
  {
    let card = Cc['@mozilla.org/addressbook/cardproperty;1'].createInstance(Ci.nsIAbCard);
    card.directoryId = this.uuid;
    this.updateCardFromItem(aItem, card);
    return card;
  },

  // Update native item properties from a skink card. Return false if nothing changed,
  //  true if something changed. Note this gets called from modify card, which
  //  gets called routinely during compose to update a frequency count (which we do not
  //  support).
  updatePropertiesFromCard: function _updatePropertiesFromCard(aCard, aProperties, aNotify)
  {
    let didChange = false;
    if (this.mIsGAL)
    {
      log.debug("Can't update properties in the GAL");
      return didChange;
    }
    for (let skinkName in gSkinkEwsMap)
    {
      let oldValue = aProperties.getAString(gSkinkEwsMap[skinkName]);
      let newValue = aCard.getProperty(skinkName, '');
      if (oldValue != newValue)
      {
        aProperties.setAString(gSkinkEwsMap[skinkName], newValue);
        if (aNotify)
          MailServices.ab.notifyItemPropertyChanged(aCard, skinkName, oldValue, newValue);
        didChange = true;
      }
    }

    // special handling

    // Email addresses
    let oldEmail;
    let newEmail;
    let emailAddressPL;
    let itemId = aCard.getProperty('itemId', '');

    emailAddressPL = aProperties.getPropertyListByAttribute("EmailAddresses/Entry", "Key", "EmailAddress1");
    oldEmail = emailAddressPL ? emailAddressPL.getAString("$value") : "";
    newEmail = aCard.getProperty("PrimaryEmail", "");
    if (oldEmail != newEmail)
    {
      if (newEmail.length)
      {
        if (!emailAddressPL)
          emailAddressPL = createKeyedEntry(aProperties, "EmailAddresses", "EmailAddress1");
        emailAddressPL.setAString("$value", newEmail);
      }
      // else add to delete list
      if (aNotify)
        MailServices.ab.notifyItemPropertyChanged(aCard, "PrimaryEmail", oldEmail, newEmail);
      this.removeFromAddressMap(oldEmail, itemId);
      this.addToAddressMap(newEmail, itemId);
      didChange = true;
    }

    emailAddressPL = aProperties.getPropertyListByAttribute("EmailAddresses/Entry", "Key", "EmailAddress2");
    oldEmail = emailAddressPL ? emailAddressPL.getAString("$value") : "";
    newEmail = aCard.getProperty("SecondEmail", "");
    if (oldEmail != newEmail)
    {
      if (newEmail.length)
      {
        if (!emailAddressPL)
          emailAddressPL = createKeyedEntry(aProperties, "EmailAddresses", "EmailAddress2");
        emailAddressPL.setAString("$value", newEmail);
      }
      // else add to delete list
      if (aNotify)
        MailServices.ab.notifyItemPropertyChanged(aCard, "SecondEmail", oldEmail, newEmail);
      this.removeFromAddressMap(oldEmail, itemId);
      this.addToAddressMap(newEmail, itemId);
      didChange = true;
    }

    // middle name
    let oldGivenName = aProperties.getAString('GivenName');
    let oldMiddleName = aProperties.getAString('MiddleName');
    let oldFirstName = oldGivenName;
    if (oldMiddleName.length)
      oldFirstName = oldFirstName + ' ' + oldMiddleName;
    let newFirstName = aCard.getProperty('FirstName', '');
    if (oldFirstName != newFirstName)
    {
      // what can we do since TB does not support middle name? I'll
      //  just set it to blank instead if changed in TB
      aProperties.setAString('GivenName', newFirstName);
      aProperties.setAString('MiddleName', '');
      if (aNotify)
        MailServices.ab.notifyItemPropertyChanged(aCard, 'FirstName', oldFirstName, newFirstName);
      didChange = true;
    }

    // FileAs

    //  We have to create this, but I have no way of knowing what is the correct
    //  format. So I will use LastName, FirstName if it does not exist
    let fileAs = aProperties.getAString("FileAs");
    if (!fileAs.length)
    {
      let firstName = aProperties.getAString("GivenName");
      let lastName = aProperties.getAString("Surname");
      if (lastName.length)
        fileAs = lastName;
      if (firstName.length)
      {
        if (fileAs.length)
          fileAs = fileAs + ', ';
        fileAs = fileAs + firstName;
      }
      if (!fileAs.length)
        fileAs = aCard.getProperty("PrimaryEmail", "");
      aProperties.setAString("FileAs", fileAs);
      didChange = true;
    }

    // Physical Addresses

    let keys = ['Business', 'Home'];
    let key;
    while ((key = keys.pop()))
    {
      let address = aProperties.getPropertyListByAttribute("PhysicalAddresses/Entry", "Key", key);
      let prefix = 'Home';
      if (key == 'Business')
        prefix = 'Work';

      for (let skinkName in gSkinkEwsAddressMap)
      {
        if (skinkName == 'Street') // which is a dummy name
        {
          // split street to multiple lines
          let oldStreet = address ? address.getAString('Street') : "";
          let regex = /(.*)[\f\r\n]*([\s\S]*)/m;
          let match = regex.exec(oldStreet);
          let oldAddress = match[1];
          let oldAddress2 = match[2];
          let newAddress = aCard.getProperty(prefix + 'Address', '');
          let newAddress2 = aCard.getProperty(prefix + 'Address2', '');
          if ( (oldAddress != newAddress) || (oldAddress2 != newAddress2) )
          {
            let newStreet = newAddress;
            if (newAddress2.length)
              newStreet = newStreet + '\n' + newAddress2;
            if (newStreet.length)
            {
              if (!address)
                address = createKeyedEntry(aProperties, "PhysicalAddresses", key);
              address.setAString('Street', newStreet);
            }
            if (oldAddress != newAddress && aNotify)
            {
              MailServices.ab.notifyItemPropertyChanged(aCard, prefix + 'Address', oldAddress, newAddress);
              didChange = true;
            }
            if (oldAddress2 != newAddress2 && aNotify)
            {
              MailServices.ab.notifyItemPropertyChanged(aCard, prefix + 'Address2', oldAddress2, newAddress2);
              didChange = true;
            }
          }
        }
        else
        {
          let newProperty = aCard.getProperty(prefix + skinkName, '');
          let oldProperty = address ? address.getAString(gSkinkEwsAddressMap[skinkName]) : '';

          if (oldProperty != newProperty)
          {
            if (newProperty.length)
            {
              if (!address)
                address = createKeyedEntry(aProperties, "PhysicalAddresses", key);
              address.setAString(gSkinkEwsAddressMap[skinkName], newProperty);
            }
            if (aNotify)
              MailServices.ab.notifyItemPropertyChanged(aCard, prefix + skinkName, oldProperty, newProperty);
            didChange = true;
          }
        }
      }
    }

    // Phone Numbers
    for (let skinkName in gSkinkEwsPhoneMap)
    {
      let key = gSkinkEwsPhoneMap[skinkName];
      let phone = aProperties.getPropertyListByAttribute('PhoneNumbers/Entry', 'Key', key);
      let oldPhoneNumber = phone ? phone.getAString('$value') : '';
      let newPhoneNumber = aCard.getProperty(skinkName, '');

      // Alternate numbers
      if (skinkName == 'FaxNumber' && !oldPhoneNumber.length)
      {
        let altPhone = aProperties.getPropertyListByAttribute('PhoneNumbers/Entry', 'Key', 'HomeFax');
        oldPhoneNumber = altPhone ? altPhone.getAString('$value') : '';
        if (oldPhoneNumber.length)
          phone = altPhone;
      }
      else if (skinkName == 'CellularNumber' && !oldPhoneNumber.length)
      {
        let altPhone = aProperties.getPropertyListByAttribute('PhoneNumbers/Entry', 'Key', 'CarPhone');
        oldPhoneNumber = altPhone ? altPhone.getAString('$value') : '';
        if (oldPhoneNumber.length)
          phone = altPhone;
      }
      if (oldPhoneNumber != newPhoneNumber)
      {
        if (newPhoneNumber.length)
        {
          if (!phone)
            phone = createKeyedEntry(aProperties, "PhoneNumbers", key);
          phone.setAString('$value', newPhoneNumber);
        }
        if (aNotify)
          MailServices.ab.notifyItemPropertyChanged(aCard, skinkName, oldPhoneNumber, newPhoneNumber);
        didChange = true;
      }
    }

    // Birthday
    let oldBirthDay = null, oldBirthMonth = null, oldBirthYear = null;

    let birthDay = aCard.getProperty("BirthDay", "");
    let birthMonth = aCard.getProperty("BirthMonth", "");
    let birthYear = aCard.getProperty("BirthYear", "");
    let newIsValid = false;
    try {
      newIsValid = (birthDay && birthMonth && birthYear && birthDay.length && birthMonth.length && birthYear.length);
    } catch (e) {}
    if (!newIsValid)
    {
      birthDay = null;
      birthYear = null;
      birthMonth = null;
    }

    let birthdayString = aProperties.getAString("Birthday");
    log.debug("existing Birthday string is <" + birthdayString + ">");
    if (birthdayString.length)
    {
      let correctedDate = correctedBirthday(birthdayString);
      oldBirthDay = correctedDate.getDate();
      oldBirthMonth =  correctedDate.getMonth() + 1;
      oldBirthYear = correctedDate.getFullYear();
    }

    if ( (birthDay != oldBirthDay) ||
         (birthMonth != oldBirthMonth) ||
         (birthYear != oldBirthYear))
    {
      log.debug("Changed birthday, new day " + birthDay + " old day " + oldBirthDay);
      if (newIsValid)
      {
        let date = new Date(birthYear, birthMonth - 1, birthDay);
        aProperties.setAString("Birthday", ISODateString(date));
      }
      else
        aProperties.removeElement("Birthday");
      log.debug("Setting birthdayString to " + aProperties.getAString("Birthday"));
      if (aNotify)
      {
        if (birthDay != oldBirthDay)
          MailServices.ab.notifyItemPropertyChanged(aCard, "BirthDay", oldBirthDay, birthDay);
        if (birthMonth != oldBirthMonth)
          MailServices.ab.notifyItemPropertyChanged(aCard, "BirthMonth", oldBirthMonth, birthMonth);
        if (birthYear != oldBirthYear)
          MailServices.ab.notifyItemPropertyChanged(aCard, "BirthYear", oldBirthYear, birthYear);
      }
      didChange = true;
    }
    return didChange;
  },

  // set properties with notifications of changes
  setCardProperty: function _setCardProperty(aCard, aSkinkName, aNewValue)
  {
    let oldValue = aCard.getProperty(aSkinkName, '');
    if (oldValue != aNewValue)
    {
      aCard.setProperty(aSkinkName, aNewValue);
      MailServices.ab.notifyItemPropertyChanged(aCard, aSkinkName, oldValue, aNewValue);
    }
  },

  updateCardFromItem: function _updateCardFromItem(aItem, card)
  { try {

    let contact = aItem.properties;
    for (let skinkName in gSkinkEwsMap)
    {
      try {
        this.setCardProperty(card, skinkName, contact.getAString(gSkinkEwsMap[skinkName]));
      } catch(e) {}
    }

    // Special handling

    // itemId
    if (aItem.itemId)
      card.setProperty('itemId', aItem.itemId);

    // Email addresses
    let emails = null;
    try {
      emails = contact.getPropertyList('EmailAddresses')
                      .getPropertyLists('Entry');
    } catch (e) {}

    let currentAddress = 1;
    for (let email of emails || [])
    {
      let value;
      try {
        value = email.getAString('$value');
      } catch(e) {continue;}
      // In some cases (such as in ResolveNames) the email address
      //  is given prefixed with a protocol. If found, only include
      //  SMTP (upper or lower case) and strip.
      let matches = /^([^:]*):(.*)$/.exec(value);
      if (matches && matches[1] && matches[1].length)
      { // found a protocol in matches[1]
        if (matches[1].toLowerCase() == "smtp")
          value = matches[2];
        else
          continue; // don't include this address
      }
      if (currentAddress == 1)
        this.setCardProperty(card, 'PrimaryEmail', value);
      else if (currentAddress == 2)
        this.setCardProperty(card, 'SecondEmail', value);
      currentAddress++;
    }

    // middle name
    let middleName = card.getProperty('MiddleName', '');

    let shortFirstName = card.getProperty('ShortFirstName', '');
    let firstName = middleName.length ?
      shortFirstName + ' ' + middleName : shortFirstName;
    this.setCardProperty(card, 'FirstName', firstName);

    // Physical Addresses
    let addresses = null;
    try {
      addresses = contact.getPropertyList('PhysicalAddresses')
                         .getPropertyLists('Entry');
    } catch (e) {}
    for (let address of addresses || [])
    {
      let key = address.getAString('$attributes/Key');
      let prefix = '';
      if (key == 'Business')
        prefix = 'Work';
      else if (key == 'Home')
        prefix = 'Home';
      else // We only support Business and Home addresses
        continue;
      for (let skinkName in gSkinkEwsAddressMap)
      {
        if (skinkName == 'Street')
        {
          // split street to multiple lines
          let street = address.getAString('Street');
          let regex = /(.*)[\f\r\n]*([\s\S]*)/m;
          let match = regex.exec(street);
          this.setCardProperty(card, prefix + 'Address', match[1]);
          this.setCardProperty(card, prefix + 'Address2', match[2]);
        }
        else
          this.setCardProperty(card, prefix + skinkName, address.getAString(gSkinkEwsAddressMap[skinkName]));
      }
    }

    // Phone Numbers
    let phones;
    try {
      phones = contact.getPropertyList('PhoneNumbers')
                      .getPropertyLists('Entry');
    } catch (e) {}
    for (let phone of phones || [])
    {
      let key = phone.getAString('$attributes/Key');
      let value = '';
      try {
        value = phone.getAString('$value');
      } catch (e) {}
      let prop = '';
      if (key == 'BusinessPhone')
        prop = 'WorkPhone';
      else if (key == 'HomePhone')
        prop = 'HomePhone';
      else if (key == 'MobilePhone')
        prop = 'CellularNumber';
      else if (key == 'Pager')
        prop = 'PagerNumber';
      else if (key == 'BusinessFax')
        prop = 'FaxNumber';
      else
        continue;
      this.setCardProperty(card, prop, value);
    }

    // There are alternate names for mobile, cellular, and fax in EWS. Rescan and use
    //  those alternatives if the primaries are blank
    for (let phone of phones || [])
    {
      let key = phone.getAString('$attributes/Key');
      let value = '';
      try {
        value = phone.getAString('$value');
      } catch(e) {}
      if (!value.length)
        continue;
      let prop = '';
      if (key == 'HomeFax' && !(card.getProperty('FaxNumber', '').length))
        this.setCardProperty(card, 'FaxNumber', value);
      else if (key == 'CarPhone' && !(card.getProperty('CellularNumber', '').length))
        this.setCardProperty(card, 'CellularNumber', value);
    }

    // Birthday
    let birthdayString = contact.getAString("Birthday");
    if (birthdayString.length)
    {
      let date = correctedBirthday(birthdayString);
      this.setCardProperty(card, 'BirthDay', date.getDate());
      this.setCardProperty(card, 'BirthMonth', date.getMonth() + 1);
      this.setCardProperty(card, 'BirthYear', date.getFullYear());
    }
    else
    {
      this.setCardProperty(card, 'BirthDay', null);
      this.setCardProperty(card, 'BirthMonth', null);
      this.setCardProperty(card, 'BirthYear', null);
    }

    if (aItem.flags & aItem.AllOnServer && !this.mIsGAL)
    {
      aItem.clearFlags(aItem.AllOnServer);
      aItem.persist();
    }

  } catch(e) {re(e);}},

  get mailbox()
  {
    if (this.serverURI.length)
    {
      let nativeService = new EwsNativeService();
      return nativeService.getNativeMailbox(this.serverURI);
    }
    log.error("Can't get mailbox because serverURI is missing");
  },

  addToAddressMap: function _addToAddressMap(email, itemId)
  {
    if (!email || !email.length || !itemId.length)
      return;
    let lowerCaseEmail = email.toLowerCase();
    if (!this.addressMap)
      this.addressMap = {}; // uncached since we only see this for query URLs
    let idList = this.addressMap[lowerCaseEmail];
    if (!idList)
      idList = (this.addressMap[lowerCaseEmail] = []);
    if (-1 == idList.indexOf(itemId))
      idList.push(itemId);
  },

  removeFromAddressMap: function _removeFromAddressMap(email, itemId)
  {
    if (!email.length || !itemId.length)
      return;
    let lowerCaseEmail = email.toLowerCase();
    let idList = this.addressMap[lowerCaseEmail];
    if (idList)
    {
      let itemIndex = idList.indexOf(itemId);
      if (itemIndex != -1)
        idList.splice(itemIndex, 1);
    }
    if (!idList.length)
      delete this.addressMap[lowerCaseEmail];
  },

  // returns the card that was added or modified
  updateItem: function _updateItem(aItem)
  {
    let itemClass = aItem.itemClass;

    if (/^IPM\.Contact/.test(itemClass))
      return this.updateContact(aItem);
    if (/^IPM\.DistList/.test(itemClass))
      return this.updateDistList(aItem);
    // This seems to happen when a new directory is added and the address book is open
    log.warn('update item class <' + itemClass + '> not supported');
    return null;
  },

  updateContact: function _updateContact(aItem)
  {
    let itemId = aItem.itemId;
    if (!this.cards)
      this.loadDirectoryCards(null);

    let card = null;
    if (this.cards)
      card = this.cards.get(itemId);
    // AFAICT, there is no provision to update a changed card in the UI. Instead,
    //  I will notify a delete then an add
    if (card)
    {
      //MailServices.ab.notifyDirectoryItemDeleted(this.cppBase, card);
      if (aItem.deletedOnServer)
      {
        MailServices.ab.notifyDirectoryItemDeleted(this.delegator, card);
        this.removeFromAddressMap(card.primaryEmail, itemId);
        this.removeFromAddressMap(card.getProperty('SecondEmail', ''), itemId);
        log.debug('updateContact: card deleting');
        this.cards.delete(itemId);
        aItem.clearFlags(aItem.AllOnServer);
        return;
      }
      this.updateCardFromItem(aItem, card);
    }
    else if (!aItem.deletedOnServer)
    {
      card = this.addCardFromItem(aItem);
      this.cards.set(itemId, card);
      MailServices.ab.notifyDirectoryItemAdded(this.delegator, card);
    }
    if (card)
    {
      // update the address map
      this.addToAddressMap(card.primaryEmail, itemId);
      this.addToAddressMap(card.getProperty('SecondEmail', ''), itemId);
    }
    aItem.clearFlags(aItem.AllOnServer);
    return card;
  },

  updateDistList: function _updateDistList(aItem)
  {
    if (this.mIsGAL)
    {
      log.warn("Can't update a DL in the GAL");
      return null;
    }
    if (aItem.dlExpansion)
    {
      let itemId = aItem.itemId;
      let itemName = aItem.properties.getAString('DisplayName');

      // search the mailLists for a matching item
      let itemDirectory = null;
      for (let addressList of this.mailLists)
      {
        if (itemId == addressList.getStringValue('itemId', ''))
        {
          itemDirectory = addressList;
          break;
        }
      }

      // if not found, then add one
      if (!itemDirectory)
      {
        let util = Cc["@mozilla.org/network/util;1"]
                     .getService(Ci.nsINetUtil);
        let escapedName = util.escapeURL(itemName, Ci.nsINetUtil.ESCAPE_URL_FILE_BASENAME);
        log.config('adding new EwsAbMailingList with name ' + escapedName);
        let uri = this.URI + "/_MailList_/" + escapedName;
        itemDirectory = MailServices.ab.getDirectory(uri);
        log.config('URI for new distList is ' + itemDirectory.URI);
        itemDirectory.setStringValue('itemId', itemId);
        itemDirectory.setStringValue('uri', uri);
        this.addMailList(itemDirectory);
      }
      else
      {
        // We'll send a delete notification, since we'll do an add at the end
        MailServices.ab.notifyDirectoryItemDeleted(this.delegator, itemDirectory);
      }

      itemDirectory.dirName = itemName;

      // The item directory at this point might be a js item, or it might point to the
      //  underlying C++ skinkglue item. Let's make sure it points to the js item.
      itemDirectory = safeGetJS(itemDirectory);

      itemDirectory.cards = new Map();

      let mailboxes = aItem.dlExpansion.getPropertyLists('Mailbox');
      for (let itemMailbox of mailboxes)
      {
        // todo: support complex dist list items
        try {
          let mailboxType = itemMailbox.getAString('MailboxType');
          if (mailboxType != 'Mailbox' && mailboxType != 'Contact')
          {
            log.warn('Warning: dist item mailbox is not a simple mailbox, but ' + mailboxType);
            continue;
          }
          if (itemMailbox.getAString('RoutingType') != 'SMTP')
          {
            log.warn('Warning: non-SMTP dist list item found');
            continue;
          }
        } catch (e) {continue;}
        let card = Cc['@mozilla.org/addressbook/cardproperty;1'].createInstance(Ci.nsIAbCard);
        card.directoryId = this.uuid;

        card.displayName = itemMailbox.getAString('Name');
        card.primaryEmail = itemMailbox.getAString('EmailAddress');
        log.debug('Adding card for name ' + card.displayName);
        itemDirectory.cards.set(card.primaryEmail, card);
      }
    }
    else
      log.error('missing dlExpansion');
    return null;
  },

  // Given a resolution item from ResolveNames, generate an appropriate nativeItem that can be
  //  converted into a card using standard item processing
  itemFromResolution: function _itemFromResolution(resolution)
  { try {
    if (!(resolution && resolution.PropertyList))
    {
      log.warn('resolution is not a property list');
      return null;
    }
    let box = resolution.getPropertyList("Mailbox");
    let name = box.getAString("Name");
    let email = box.getAString("EmailAddress");
    log.debug("itemFromResolution found email " + email);
    let contact = resolution.getPropertyList("Contact");
    if (!contact || !contact.length)
    {
      // Is this a local contact?
      let itemId = box.getAString("ItemId/$attributes/Id");
      if (itemId.length)
      {
        //  return the contact
        //let item = this.mailbox.getItem(itemId);
        //if (item && item.properties)
        //  return item;
        return null;
      }
      if (box.getAString("RoutingType") == "SMTP")
      {
        // create contact properties from the mailbox (we really should not get here!)
        contact = new PropertyList();
        contact.setAString("DisplayName", name);
        contact.setAString("EmailAddresses/Entry/$attributes/Key", "EmailAddress1");
        contact.setAString("EmailAddresses/Entry/$value", "SMTP:" + email);
      }
    }
    if (!contact)
    {
      log.warn("Could not create a usable contact for " + box.getAString("Name"));
      return;
    }
    // Create an artificial item. We will use name-email as a fake id
    let itemId = name + "-" + email;
    let item = this.mailbox.getItemFromCache(itemId);
    if (!item)
      item = this.mailbox.createItem(itemId, "IPM.Contact", null);
    item.itemClass = "IPM.Contact";
    item.flags = item.HasTempId;

    // If the contact does not have first and last names, then I will guess from
    //   the display name.
    let givenName = contact.getAString("GivenName");
    let surname = contact.getAString("Surname");
    let displayName = contact.getAString("DisplayName");
    if (!givenName.length || !surname.length)
    { try {
      // We'll need to guess.
      // first, last format:
      if (displayName.indexOf(",") == -1)
        [match, guessedFirst, guessedLast] = /^(.*)\s([^\s]+)$/.exec(displayName);
      else
        [match, guessedLast, guessedFirst] = /^([^\s]+)\s*,\s*(.*)$/.exec(displayName);
      if (!givenName.length)
        contact.setAString("GivenName", guessedFirst);
      if (!surname.length)
        contact.setAString("Surname", guessedLast);
    } catch (e) {log.debug("Could not guess first, last from display name " + displayName)}}

    // If an item has lots of proxy addresses, then those seem to displace the main SMTP address.
    //  So if a contact does not include the base SMTP address, then I will add it.
    let emailAddressPL = contact.getPropertyListByAttribute("EmailAddresses/Entry", "Key", "EmailAddress1");
    let oldEmail = emailAddressPL ? emailAddressPL.getAString("$value") : "";
    if (oldEmail != email && email.length)
    {
      if (!emailAddressPL)
        emailAddressPL = createKeyedEntry(contact, "EmailAddresses", "EmailAddress1");
      emailAddressPL.setAString("$value", email);
      // move oldEmail to the second position
      let emailAddressPL2 = contact.getPropertyListByAttribute("EmailAddresses/Entry", "Key", "EmailAddress2");
      if (!emailAddressPL2)
        emailAddressPL2 = createKeyedEntry(contact, "EmailAddresses", "EmailAddress2");
      emailAddressPL2.setAString("$value", oldEmail);
    }

    item.properties = contact;
    return item;
  } catch (e) {re(e);}},

  startup: function _startup()
  {
    let observerService = Cc["@mozilla.org/observer-service;1"]
                             .getService(Ci.nsIObserverService);
    observerService.addObserver(this, "quit-application", false);
  },

  shutdown: function _shutdown()
  {
    this.jsParent = null;
  },

  observe: function _observe(aMessage, aTopic, aData)
  {
    if (aTopic == "quit-application")
    {
      this.shutdown();
    }
    return;
  },

  // EwsAbDirectory implementation

  get folderId() {return this.wrap.getStringValue('folderId', '');},
  set folderId(aFolderId) {this.wrap.setStringValue('folderId', aFolderId);},

  get distinguishedFolderId() {return this.wrap.getStringValue('distinguishedFolderId', '');},
  set distinguishedFolderId(aDistinguishedFolderId)
  {
    this.wrap.setStringValue('distinguishedFolderId', aDistinguishedFolderId);
    if (aDistinguishedFolderId == "msgfolderroot")
      this.wrap.mIsGAL = true;
  },

  get serverURI() {
    try {
      if (!this.wrap.mURI || !this.wrap.mURI.length)
        throw("missing address book uri");
      let uriObject = newParsingURI(this.wrap.mURI);
      if (Ci.nsIURIMutator) {
        uriObject = uriObject.mutate().setScheme("exquilla").finalize();
      } else {
        uriObject.scheme = "exquilla";
      }
      return uriObject.prePath;
    } catch(e) {re(e);}},

  loadDirectoryCards: function _loadDirectoryCards(aListener)
  { try {
    let uri = this.wrap.URI;
    if (!uri || !uri.length)
      throw Cr.NS_ERROR_NOT_INITIALIZED;

    log.config("ewsAbDirectory loadDirectoryCards() for " + uri);
    if (this.wrap.mIsQueryURI)
    {
      this.wrap.startSearch();
    }

    else
    {
      if (uri in cardCache)
        this.wrap.cards = cardCache[uri];
      else
        this.wrap.cards = (cardCache[uri] = new Map());

      if (uri in addressMapCache)
        this.wrap.addressMap = addressMapCache[uri];
      else
        this.wrap.addressMap = (addressMapCache[uri] = {});

      if (!this.wrap.gettingCardIds && !this.wrap.mIsGAL)
      {
        this.wrap.gettingCardIds = true;
        let self = this;
        return this.wrap.mailbox.allIds(this.wrap.folderId,
            {
              onEvent: function _onEvent(aItem, aEvent, aData, result)
              {
                if (aEvent == "StopMachine")
                {
                  self.gettingCardIds = false;
                  let idArray = null;
                  try {
                    idArray = aData.wrappedJSObject.StringArray;
                  } catch (e) {log.config('null aData while getting cards for '+ self.URI);}
                  if (idArray)
                  {
                    let count = idArray.length;
                    log.debug("gettingCardsIds found " + count + " cards for " + self.URI);
                    for (let i = 0; i < count; i++)
                    {
                      let id = idArray.getAt(i);
                      let item = self.mailbox.getItem(id);
                      if (item.properties)
                        self.updateItem(item);
                      else
                      {
                        // Item has bad properties, set dirty to reload
                        item.raiseFlags(item.Dirty);
                      }
                    }
                  }
                  if (aListener)
                    aListener.onEvent(aItem, aEvent, aData, result);
                }
              }
            });
      }
      if (aListener)
        callLater( function () {aListener.onEvent(null, "StopMachine", null, Cr.NS_OK);});
    }

  } catch(e) {re(e);}},

  startSearch: function _startSearch()
  {
    this.wrap.cards = new Map();
    let qarguments = Cc["@mozilla.org/addressbook/directory/query-arguments;1"]
                      .createInstance(Ci.nsIAbDirectoryQueryArguments);
    qarguments.expression = MailServices.ab.convertQueryStringToExpression(this.wrap.mQueryString);
    // Don't search the subdirectories which are mailing lists. Is this correct?
    qarguments.querySubDirectories = false;
    let queryProxy = Cc["@mozilla.org/addressbook/directory-query/proxy;1"]
                       .createInstance(Ci.nsIAbDirectoryQueryProxy);
    queryProxy.initiate();
    queryProxy.doQuery(this.wrap.mNoQueryDirectory, qarguments, this.wrap, -1, 0);
  },

  search: async function _search(aQuery, aListener)
  {
    let qarguments = Cc["@mozilla.org/addressbook/directory/query-arguments;1"]
                      .createInstance(Ci.nsIAbDirectoryQueryArguments);
    let expression = MailServices.ab.convertQueryStringToExpression(aQuery);
    qarguments.expression = expression;
    // Don't search the subdirectories which are mailing lists. Is this correct?
    qarguments.querySubDirectories = false;

    if (this.mIsGAL) {
      while (expression instanceof Ci.nsIAbBooleanExpression) {
        expression = toArray(expression.expressions, Ci.nsISupports)[0];
      }
      let term = expression.QueryInterface(Ci.nsIAbBooleanConditionString).value;
      let listener = new PromiseUtils.MachineListener();
      let dirListener = new SearchGALListener(this, listener);
      this.mailbox.resolveNames(term, true, dirListener);
      await listener.promise;
    }

    let queryProxy = Cc["@mozilla.org/addressbook/directory-query/proxy;1"]
                       .createInstance(Ci.nsIAbDirectoryQueryProxy);
    queryProxy.initiate();
    queryProxy.doQuery(this, qarguments, aListener, -1, 0);
  },

  rebuild: function _rebuild()
  {
    log.warn('EwsAbDirectoryOverride rebuilding address directory');
    // don't start this twice
    if (this.wrap.rebuildListener)
    {
      Cu.reportError("Rebuild already in progress");
      return;
    }
    this.wrap.rebuildListener = new EwsRebuildListener(this);
    this.wrap.rebuildListener.onEvent(null, "Begin", null, Cr.NS_OK);
  },

  getChildCardsWithListener: function _getChildCardsWithListener(aListener)
  { log.debug("ewsAbDirectory getChildCardsWithListener for directory " + this.URI);
    try {
    this.wrap.getChildCardsListener = aListener;
    // Setup a call to get existing ids
    let cardArray = [];
    if (!this.wrap.cards)
    {
      this.wrap.loadDirectoryCards(null);
    }
    // a query will declare and load this.cards
    let cards = this.wrap.cards;
    if (cards)
    {
      for (let card of cards.values())
      {
        if (card)
          cardArray.push(card);
        else
          log.warn('trying to add a null card');
      }
    }
    if (aListener && this.wrap.gettingNewItems)
      log.warn('EwsAbDirectoryOverride gettingNewItems while existing gettingNewItems still active');
    if (aListener && !this.wrap.gettingNewItems && !this.wrap.mIsQueryURI && !this.wrap.mIsGAL)
    {
      this.wrap.mailbox.getNewItems(this.wrap.nativeFolder, this.wrap);
      this.wrap.gettingNewItems = true;
      return null;
    }
    // If we have a listener, then the card enum will be returned from that
    return new ArrayEnumerator(cardArray);
  } catch(e) {re(e);}},

  deleteCardsWithListener: function _deleteCardsWithListener(aCards, aListener)
  {
    try {
    if (this.wrap.mIsGAL)
    {
      log.warn("We cannot delete from the GAL");
    }
    // We delete immediately, then store in EWS
    let itemIds = new StringArray();
    for (let card of this.wrap.mIsGAL ? [] : aCards) {
      let itemId = card.getProperty('itemId', '');
      if (itemId.length)
      {
        itemIds.append(itemId);
        this.wrap.cards.delete(itemId);
        this.wrap.removeFromAddressMap(card.primaryEmail, itemId);
        this.wrap.removeFromAddressMap(card.getProperty('SecondEmail', ''), itemId);
        MailServices.ab.notifyDirectoryItemDeleted(this.wrap.delegator, card);
      }
      else
        log.warn('card with address ' + card.primaryEmail + ' has no item id');
    }

    if (!itemIds.length)
    {
      // nothing to delete, execute start and stop on listener and return
      if (aListener)
      {
        aListener.onEvent(null, "StartMachine", null, Cr.NS_OK);
        aListener.onEvent(null, "StopMachine", null, Cr.NS_OK);
      }
      return; // nothing to delete
    }
    this.wrap.mailbox.deleteItems(itemIds, false, aListener);
  } catch(e) {re(e);}},

  searchGAL: function _searchGAL(aEntry, aListener)
  { try {
    log.debug('EwsAbDirectoryOverride searchGAL entry ' + aEntry);
    let dirListener = new SearchGALListener(this, aListener);
    return this.wrap.mailbox.resolveNames(aEntry, true, dirListener);
  } catch(e) {re(e);}},

  get isGAL() {
    return this.wrap.mIsGAL;
  },

  get nativeFolder()
  {
    if (!this.wrap.mNativeFolder)
    {
      if (!this.wrap.mailbox)
        return null;
      let id = this.wrap.distinguishedFolderId;
      if (!id.length)
        id = this.wrap.folderId;
      let nativeFolder = this.wrap.mailbox.getNativeFolder(id);
      //nativeFolder.displayName = this.wrap.dirName;
      this.wrap.mNativeFolder = nativeFolder;
    }
    return this.wrap.mNativeFolder;
  },

  updateDirectory: function _updateDirectory(aListener)
  {
    let updateListener = new UpdateDirectoryListener(this.wrap, aListener);
    callLater( function () {updateListener.onEvent(null, "Begin", null, Cr.NS_OK);});
  },

  // EwsEventListener implementation
  onEvent: function onEvent(aItem, aEvent, aData, result)
  { try {
    if (aEvent == "StopMachine")
    {
      if (this.wrap.gettingNewItems)
      {
        log.debug("StopMachine for gettingNewItems");
        this.wrap.gettingNewItems = false;
        if (this.wrap.getChildCardsListener)
        {
          this.wrap.getChildCardsListener.onEvent(aItem, aEvent, this.wrap.getChildCardsWithListener(null), result);
          this.wrap.getChildCardsListener = null;
        }
        // Something to listener for, since get childCards() is sync.
        Services.obs.notifyObservers(this, "exquilla-gettingNewItems-StopMachine", this.mURI);
      }
      else if (this.wrap.resolvingNames)
      {
        log.debug("StopMachine for resolvingNames");
        this.wrap.resolvingNames = false;
        let resolutions = aData;
        if (!resolutions || !resolutions.length)
        {
          log.debug("resolveNames returned no results");
          return;
        }
        for (let resolution of resolutions)
        {
          if (!(resolution && resolution.PropertyList))
            log.warning("resolution not a property list")
          else
          {
            //log.debug("Resolution #" + i + " PL is\n" + stringPL(resolution));
            // We have to turn the search resolution into a card
            // XXX todo - store in base directory
            let item = this.wrap.itemFromResolution(resolution);
            if (item)
            {
              this.wrap.updateItem(item);
              // we cache these in the base GAL as well
              let jsBaseDirectory = this.wrap.mNoQueryDirectory
                                        .QueryInterface(Ci.msgIOverride)
                                        .jsDelegate
                                        .wrappedJSObject;
              jsBaseDirectory.updateItem(item);
            }
          }
        }
      }
    }
    else if (aEvent == "ItemChanged")
    {
      if (aData.EwsNativeItem)
        this.wrap.updateItem(aData);
    }

  } catch (e) {re(e);}},

  // nsIAbDirSearchListener implementation
  onSearchFinished: function _onSearchFinished(aResult, aErrorMsg)
  {
    log.debug("ewsAbDirectoryComponent.onSearchFinished with result " + aResult);
    if (this.wrap.mIsGAL)
    {
      // We'll initiate a remote search for items
      // First get the search entry from the query, which looks like (for "test"):
      // (or(PrimaryEmail,c,test)(DisplayName,c,test)(FirstName,c,test)(LastName,c,test))
      let entries = /\,([^\,\(\)]*)\)/.exec(this.wrap.mQueryString);
      let entry = (entries && entries.length > 1 ? entries[1] : "");
      // start a resolveNames search
      this.wrap.resolvingNames = true;
      let decodedEntry = decodeURIComponent(entry);
      this.wrap.mailbox.resolveNames(decodedEntry, true, this);
    }
  },

  onSearchFoundCard: function _onSearchFoundCard(aCard)
  { try {
      //dl('onSearchFoundCard email ' + aCard.primaryEmail);
      let itemId = aCard.getProperty('itemId', '');
      if (!this.wrap.cards.has(itemId))
      {
        this.wrap.cards.set(itemId, aCard);
        this.wrap.addToAddressMap(aCard.primaryEmail, itemId);
        this.wrap.addToAddressMap(aCard.getProperty('SecondEmail', ''), itemId);
      }
    } catch(e) {re(e);}
  },

}

// Constructor
function EwsAbDirectoryConstructor() {
}

// Constructor prototype (not instance prototype).
EwsAbDirectoryConstructor.prototype = {
  classID: EwsAbDirectory.Properties.classID,
  _xpcom_factory: JSAccountUtils.jaFactory(EwsAbDirectory.Properties, EwsAbDirectory),
}

function EwsAbDirFactory()
{
}

EwsAbDirFactory.prototype = 
{
  classID:          Components.ID("{BDE94D3E-5A66-4027-AADA-13CE8FE762E6}"),
  QueryInterface:   ChromeUtils.generateQI([Ci.nsIAbDirFactory]),

  // nsIAbDirFactory implementation

  //*
  // Get a top level address book directory and sub directories, given some
  //  properties.
  //
  // @param aDirName  Name of the address book
  //
  // @param aURI      URI of the address book
  //
  // @param aPrefName Pref name for the preferences of the address book
  //
  // @return          Enumeration of nsIAbDirectory interfaces
  //
  //nsISimpleEnumerator getDirectories(in AString aDirName, in ACString aURI,
  //                                   in ACString aPrefName);
  getDirectories: function _getDirectories(aDirName, aURI, aPrefName)
  {
    
    var ewsAbDirectory = MailServices.ab.getDirectory(aURI);
    let enumerator = new Utils.ArrayEnumerator([ewsAbDirectory]);
    return enumerator;
  },

  //*
  // Delete a top level address book directory
  // 
  //
  //void deleteDirectory (in nsIAbDirectory directory);
  deleteDirectory: function _deleteDirectory(directory)
  { 
    let prefBranch = Cc["@mozilla.org/preferences-service;1"]
                       .getService(Ci.nsIPrefService)
                       .getBranch(directory.dirPrefId);
    if (prefBranch)
      prefBranch.deleteBranch('');
  },
}

// helper functions

// This module owns a memory cache of address cards that are created for each
// directory. The cache contains separate object caches for each directory, indexed
// by directory URL.
var cardCache = {};

// This module contains a map of email address to EWS item ID for each directory,
// indexed by directory URL. The array map is an associative array of email addresses
// (in lower case) to an array of item ids that match the email address.
var addressMapCache = {};

// Map from EWS property to card property
var gSkinkEwsMap = {
  ShortFirstName: 'GivenName',
  MiddleName: 'MiddleName', // needs special handling
  LastName: 'Surname',
  DisplayName: 'DisplayName',
  NickName: 'Nickname',
  SpouseName: 'SpouseName',
  JobTitle: 'JobTitle',
  Department: 'Department',
  Company: 'CompanyName',
  WebPage1: 'BusinessHomePage',
  _AimScreenName: 'ImAddresses/Entry',
  Notes: 'Body'

}

var gSkinkEwsAddressMap = {
  City: 'City',
  State: 'State',
  ZipCode: 'PostalCode',
  Country: 'CountryOrRegion',
  Street: 'Street' // this is a dummy entry
}

var gSkinkEwsPhoneMap = {
      WorkPhone: 'BusinessPhone',
      HomePhone: 'HomePhone',
      CellularNumber: 'MobilePhone',
      PagerNumber: 'Pager',
      FaxNumber: 'BusinessFax'
}

function correctedBirthday(zuluBirthday)
{
  // The original birthday was set to 00:00:00 in the local timezone.
  // Add 13 hours to correct for the maximum time zone variation
  let correctedDate = new Date();
  correctedDate.setTime(Date.parse(zuluBirthday) + 13*1000*3600);
  return correctedDate;
}

function ISODateString(d)
{
  function pad(n) { return n < 10 ? '0' + n : n; }
  return d.getUTCFullYear() + '-'
      + pad(d.getUTCMonth() + 1) +'-'
      + pad(d.getUTCDate()) + 'T'
      + pad(d.getUTCHours()) + ':'
      + pad(d.getUTCMinutes()) + ':'
      + pad(d.getUTCSeconds()) + 'Z';
}

function createKeyedEntry(aPropertyList, aName, aKey)
{
  let basePL = aPropertyList.getPropertyList(aName);
  if (!basePL)
  {
    basePL = new PropertyList();
    aPropertyList.appendPropertyList(aName, basePL);
  }
  let entryPL = basePL.getPropertyListByAttribute("Entry", "Key", aKey);
  if (!entryPL)
  {
    entryPL = new PropertyList();
    let attributesPL = new PropertyList();
    entryPL.appendPropertyList("$attributes", attributesPL);
    attributesPL.appendString("Key", aKey);
    basePL.appendPropertyList("Entry", entryPL);
  }
  return entryPL;
}

// This object is used to chain event listeners for async calls
function EwsListenerChain(aHead, aTail)
{
  this.head = aHead;
  this.tail = aTail;
}

EwsListenerChain.prototype.onEvent = function _onEvent(aItem, aEvent, aData, result)
{
  if (this.head)
    this.head.onEvent(aItem, aEvent, aData, result);
  if (this.tail)
    this.tail.onEvent(aItem, aEvent, aData, result);
}

function EwsRebuildListener(aDirectory)
{
  this.mState = "INITIAL";
  this.mDirectory = aDirectory;
}

EwsRebuildListener.prototype.onEvent = function EwsRebuildListener_onEvent(aItem, aEvent, aData, result)
{
  //dl('EwsRebuildListener event ' + aEvent);
  switch (this.mState)
  {
    case "INITIAL":
    {
      let directory = this.mDirectory;
      // remove all existing cards from the skink AB representation
      for (let card of directory.cards)
        MailServices.ab.notifyDirectoryItemDeleted(directory.delegator, card);
      directory.addressMap = (addressMapCache[directory.URI] = {});
      directory.cards = (cardCache[directory.URI] = {});

      // clear the datastore for this native folder
      this.mState = "WAIT_DELETE";
      directory.mailbox
               .datastore
               .deleteDataFromFolder(directory.mNativeFolder.folderId, this);
      return;
    }
    case "WAIT_DELETE":
    {
      let directory = this.mDirectory;
      directory.mailbox
               .datastore
               .setSyncState(directory.mNativeFolder, "", null);
      directory.gettingNewItems = true;
      directory.mailbox
               .getNewItems(directory.mNativeFolder, directory);
      this.mState = "Done";
      // fall through to end since this listener is now done
    }
  }

  // exit, normal or with error
  this.mDirectory.rebuildListener = null;
  return;
}

// state management for directory update
function UpdateDirectoryListener(aDirectory, aListener)
{
  this.mDirectory = aDirectory;
  this.mListener = aListener;
  // Don't propogate an error that has been handled
  this.noError = false;
}

UpdateDirectoryListener.prototype.onEvent = function UpdateDirectoryListener_OnEvent(aItem, aEvent, aData, result)
{
  //log.debug('UpdateDirectoryListener event ' + aEvent + " directory " + this.mDirectory.dirName);
  let nextEvent = aEvent;
  let directory = this.mDirectory;
  switch (aEvent)
  {
    case "Begin":
    {
      if (!directory.cards)
      {
        log.config("Uninitialized directory, loading cards");
        return directory.loadDirectoryCards(this);
      }
      // fall through to StopMachine
    }
    case "StopMachine":
    {
      if (!directory.gettingNewItems)
      {
        log.debug("getNewItems for directory " + directory.URI + " in UpdateDirectoryListener");
        directory.gettingNewItems = true;
        return directory.mailbox.getNewItems(directory.nativeFolder, this);
      }
      directory.gettingNewItems = false;
      break;
    }
    case "ItemChanged":
      if (!!aData.EwsNativeItem)
        directory.updateItem(aData);
      break;
    case "MachineError":
    {
      let responseCode = "";
      try {
        responseCode = aData.QueryInterface(Ci.nsISupportsString).data;
      } catch(e) {}
      if (responseCode == "ErrorItemNotFound")
      {
        log.info("Directory " + directory.dirName + " missing on server, deleting locally");
        let rootDirectory = MailServices.ab.getDirectory('moz-abdirectory://');
        rootDirectory.deleteDirectory(directory.delegator);

        nextEvent = "ItemNotFound";
        this.noError = true;
      }
      break;
    }
  }
  if (this.mListener)
    this.mListener.onEvent(aItem, nextEvent, aData,
                           this.noError ? Cr.NS_OK : result);
}

// update card listener
function UpdateCardListener(aCard)
{
  this.card = aCard;
}

// EwsEventListener implementation
UpdateCardListener.prototype.onEvent =
function UpdateCardListener_onEvent(aItem, aEvent, aData, result)
{
  if (aEvent == "StopMachine")
  {
    this.card.deleteProperty("doingUpdate");
    Services.obs.notifyObservers(this.card, "exquilla-updateCard-StopMachine", null);
  }
}

// new card listener
function NewCardListener(aCard, aItem, aDirectory)
{
  this.card = aCard;
  this.item = aItem;
  this.directory = aDirectory;
}

// EwsEventListener implementation
NewCardListener.prototype.onEvent =
function NewCardListener_onEvent(aItem, aEvent, aData, result)
{
  if (aEvent == "StopMachine")
  {
    let itemId = this.item.itemId;
    this.card.setProperty('itemId', itemId);
    this.directory.cards.set(itemId, this.card);
    this.directory.addToAddressMap(this.card.primaryEmail, itemId);
    this.directory.addToAddressMap(this.card.getProperty('SecondEmail', ''), itemId);
    MailServices.ab.notifyDirectoryItemAdded(this.directory.delegator, this.card);
  }
}

function SearchGALListener(aDirectory, aListener)
{
  this.directory = aDirectory;
  this.listener = aListener;
}

// EwsEventListener implementation
SearchGALListener.prototype.onEvent =
function SearchGALListener_onEvent(aItem, aEvent, aData, result)
{ try {
  if (aEvent == "StopMachine")
  {
    log.debug("SearchGALListener_onEvent StopMachine");
    let cards = Cc["@mozilla.org/array;1"].createInstance(Ci.nsIMutableArray);
    let resolutions = aData;
    if (!resolutions || !resolutions.length)
      log.debug("resolveNames returned no results");
    for (let resolution of resolutions || [])
    {
      if (!(resolution && resolution.PropertyList))
        log.warning("resolution not a property list")
      else
      {
        let item = this.directory.itemFromResolution(resolution);
        if (item)
        {
          let card = this.directory.updateItem(item);
          if (card)
            cards.appendElement(card, false);
        }
      }
    }
    log.config("SearchGALListener found " + cards.length + " matching cards");
    if (this.listener)
      this.listener.onEvent(this.directory.delegator, aEvent, cards, result);
  }
} catch(e) {re(e);}}

var NSGetFactory = XPCOMUtils.generateNSGetFactory([EwsAbDirectoryConstructor, EwsAbDirFactory]);
var EXPORTED_SYMBOLS = ["NSGetFactory"];
