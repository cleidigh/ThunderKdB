// a namespace for this add-on
if (typeof gravatars == "undefined") {
  var gravatars = {};
};


gravatars.columnHandler = {
  getCellText: function(row, col) {
    // TODO show the name from the address book if possible
    let author = gravatars.getAuthorAtRow(row);
    return author.name || author.mailbox;
  },

  getImageSrc: function(row, col) {
    let author = gravatars.getAuthorAtRow(row);
    return gravatars.photo(author.mailbox);
  },

  getSortStringForRow: function(hdr) {
    return gravatars.getAuthorFromHdr(hdr).mailbox;
  },

  isString: function() { return true; },

  getCellProperties: function(row, col, props) { },

  getRowProperties: function(row, props) { },

  getSortLongForRow: function(hdr) { return 0; },
};


gravatars.getAuthorFromHdr = function(hdr) {
  let author = hdr.mime2DecodedAuthor
  return gravatars.firstEmailFromHeader(author);
};

gravatars.getAuthorAtRow = function(row) {
  return gravatars.getAuthorFromHdr(gDBView.getMsgHdrAt(row));
};

gravatars.firstEmailFromHeader = function(header, query) {
  const gHeaderParser = Cc["@mozilla.org/messenger/headerparser;1"].getService(Ci.nsIMsgHeaderParser);

  let mailboxes = {};
  let names = {};
  let fullNames = {};

  let numberOfParsedAddresses = gHeaderParser.parseHeadersWithArray(header, mailboxes, names, fullNames);

  return { name: names.value[0], fullName: fullNames.value[0], mailbox: mailboxes.value[0] };
};

gravatars.addressBookPicture = function(email) {
  return null; // NOT IMPLEMENTED YET

  // let defaultPhotoURI = "chrome://messenger/skin/addressbook/icons/contact-generic.png";
  // .. FIXME figure out how to grab all address books
  let card = collection.cardForEmailAddress(email);
  if (card == null) {
    return null;
  }
  // FIXME return a photo if there is one
};

gravatars.photo = function(email) {
  return gravatars.addressBookPicture(email) || gravatars.gravatar(email);
};

gravatars.gravatar = function(email) {
  let hash = GlodaUtils.md5HashString(email.toLowerCase().trim());
  photoURI = "http://www.gravatar.com/avatar/" + encodeURIComponent(hash) + '?s=16&d=identicon';
  return photoURI;
};

gravatars.init = function() {
  var ObserverService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
  ObserverService.addObserver(gravatars.CreateDbObserver, "MsgCreateDBView", false);
};

gravatars.CreateDbObserver = {
  observe: function(aMsgFolder, aTopic, aData) {
     gravatars.addCustomColumnHandler();
  }
};

gravatars.addCustomColumnHandler = function() {
   gDBView.addColumnHandler("colGravatar", gravatars.columnHandler);
};


window.addEventListener("load", function initGravatars(event) {
    // remove listener, no longer needed
    window.removeEventListener("load", initGravatars, false);
    // do the real initialization
    gravatars.init()
},false);
