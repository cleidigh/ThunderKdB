var EXPORTED_SYMBOLS = ["ClipboardManager"];

var ClipboardManager = new function() {
  var self = this;

  self.defaultNameFmt = '{FirstName} {LastName}';
  self.defaultHomeFmt = '{HomeAddress}\n{HomeAddress2}\n{HomeCity}, {HomeState}  {HomeZipCode}\n{HomeCountry}';
  self.defaultWorkFmt = '{JobTitle}\n{Department}\n{Company}\n{WorkAddress}\n{WorkAddress2}\n{WorkCity}, {WorkState}  {WorkZipCode}\n{WorkCountry}';
  self.defaultPhonesFmt = 'Work: {WorkPhone}\nPrivate: {HomePhone}\nFax: {FaxNumber}\nMobile: {CellularNumber}\nPager: {PagerNumber}';
  self.defaultEmailsFmt = 'Email: {PrimaryEmail}\nAdditional Email: {SecondEmail}';

  var pub = {};

  self.copyToClipboard = function(str) {
    const gClipboardHelper = Components.classes["@mozilla.org/widget/clipboardhelper;1"].
      getService(Components.interfaces.nsIClipboardHelper);

    gClipboardHelper.copyString(self.toWindowLineEndings(str));

  }

  self.toWindowLineEndings = function(str) {
    var xulRuntime = Components.classes["@mozilla.org/xre/app-info;1"]
      .getService(Components.interfaces.nsIXULRuntime);

    var ret = str;
    if(xulRuntime.OS == 'WINNT') {
      ret = str.replace(/\n/g, "\r\n");
    }

    return ret;
  }

  pub.copyToClipboard = function(card, doc) {
    var bundle = doc.getElementById("cota-strings");
    var getFormat = function(str) {
      try {
        return bundle.getString(str);
      }
      catch (e) {
        return undefined;
      }
    };

    var nameFmt = getFormat("cardView.copyToClipboard.nameFmt");
    var homeFmt = getFormat("cardView.copyToClipboard.homeFmt");
    var workFmt = getFormat("cardView.copyToClipboard.workFmt");
    var phonesFmt = getFormat("cardView.copyToClipboard.phonesFmt");
    var emailsFmt = getFormat("cardView.copyToClipboard.emailsFmt");

    var formattedName = nameFmt ? self.applyAddressFmt(nameFmt, card) :
      self.applyAddressFmt(self.defaultNameFmt, card);
    var formattedHome = homeFmt ? self.applyAddressFmt(homeFmt, card) :
      self.applyAddressFmt(self.defaultHomeFmt, card);
    var formattedWork = workFmt ? self.applyAddressFmt(workFmt, card) :
      self.applyAddressFmt(self.defaultWorkFmt, card);
    var formattedPhones = phonesFmt ? self.applyAddressFmt(phonesFmt, card) :
      self.applyAddressFmt(self.defaultPhonesFmt, card);
    var formattedEmails = emailsFmt ? self.applyAddressFmt(emailsFmt, card) :
      self.applyAddressFmt(self.defaultEmailsFmt, card);

    var formattedCard = '';
    if(formattedName != '') {
      formattedCard = formattedName;
    }

    if(formattedHome != '') {
      if(formattedCard != '') {
        formattedCard = formattedCard + '\n' + formattedHome;
      }
      else {
        formattedCard = formattedHome;
      }
    }

    if(formattedWork != '') {
      if(formattedCard != '') {
        formattedCard = formattedCard + '\n\n' + formattedWork;
      }
      else {
        formattedCard = formattedWork;
      }
    }

    if(formattedPhones != '') {
      if(formattedCard != '') {
        formattedCard = formattedCard + '\n\n' + formattedPhones;
      }
      else {
        formattedCard = formattedPhones;
      }
    }

    if(formattedEmails != '') {
      if(formattedCard != '') {
        formattedCard = formattedCard + '\n\n' + formattedEmails;
      }
      else {
        formattedCard = formattedEmails;
      }
    }

    formattedCard = formattedCard + '\n';
    self.copyToClipboard(formattedCard);
  }

  pub.copyPrivateAddressToClipboard = function(card, doc) {
    var bundle = doc.getElementById("cota-strings");
    var getFormat = function(str) {
      try {
        return bundle.getString(str);
      }
      catch (e) {
        return undefined;
      }
    };

    var nameFmt = getFormat("cardView.copyToClipboard.nameFmt");
    var homeFmt = getFormat("cardView.copyToClipboard.homeFmt");

    var formattedName = nameFmt ? self.applyAddressFmt(nameFmt, card) :
      self.applyAddressFmt(self.defaultNameFmt, card);
    var formattedHome = homeFmt ? self.applyAddressFmt(homeFmt, card) :
      self.applyAddressFmt(self.defaultHomeFmt, card);

    var formattedCard = '';
    if(formattedName != '') {
      formattedCard = formattedName;
    }

    if(formattedHome != '') {
      if(formattedCard != '') {
        formattedCard = formattedCard + '\n' + formattedHome;
      }
      else {
        formattedCard = formattedHome;
      }
    }

    formattedCard = formattedCard + '\n';
    self.copyToClipboard(formattedCard);
  }

  pub.copyWorkAddressToClipboard = function(card, doc) {
    var bundle = doc.getElementById("cota-strings");
    var getFormat = function(str) {
      try {
        return bundle.getString(str);
      }
      catch (e) {
        return undefined;
      }
    };

    var nameFmt = getFormat("cardView.copyToClipboard.nameFmt");
    var workFmt = getFormat("cardView.copyToClipboard.workFmt");

    var formattedName = nameFmt ? self.applyAddressFmt(nameFmt, card) :
      self.applyAddressFmt(self.defaultNameFmt, card);
    var formattedWork = workFmt ? self.applyAddressFmt(workFmt, card) :
      self.applyAddressFmt(self.defaultWorkFmt, card);

    var formattedCard = '';
    if(formattedName != '') {
      formattedCard = formattedName;
    }

    if(formattedWork != '') {
      if(formattedCard != '') {
        formattedCard = formattedCard + '\n' + formattedWork;
      }
      else {
        formattedCard = formattedWork;
      }
    }

    formattedCard = formattedCard + '\n';
    self.copyToClipboard(formattedCard);
  }

  pub.copyPhonesToClipboard = function(card, doc) {
    var bundle = doc.getElementById("cota-strings");
    var getFormat = function(str) {
      try {
        return bundle.getString(str);
      }
      catch (e) {
        return undefined;
      }
    };

    var nameFmt = getFormat("cardView.copyToClipboard.nameFmt");
    var phonesFmt = getFormat("cardView.copyToClipboard.phonesFmt");

    var formattedName = nameFmt ? self.applyAddressFmt(nameFmt, card) :
      self.applyAddressFmt(self.defaultNameFmt, card);
    var formattedPhones = phonesFmt ? self.applyAddressFmt(phonesFmt, card) :
      self.applyAddressFmt(self.defaultPhonesFmt, card);

    var formattedCard = '';
    if(formattedName != '') {
      formattedCard = formattedName;
    }

    if(formattedPhones != '') {
      if(formattedCard != '') {
        formattedCard = formattedCard + '\n' + formattedPhones;
      }
      else {
        formattedCard = formattedPhones;
      }
    }

    formattedCard = formattedCard + '\n';
    self.copyToClipboard(formattedCard);
  }

  self.applyAddressFmt = function(fmt, card) {
    var replacer = function(m, preSep, placeHolder, postSep) {
      var ret = '';
      var r = card.getProperty(placeHolder, '');
      if(r && r.trim() != '') {
        ret = preSep + r + postSep;
      }

      return ret;
    };

    var lines = fmt.split('\n');
    var formatted = '';
    for(var i = 0; i < lines.length; i++) {
      var line = lines[i];

      formattedLine = line.replace(/([^{}]*){([^{}]*)}([^{}]*)/g, replacer);
      if(formattedLine.trim() != '') {
        formatted = formatted + formattedLine + '\n';
      }
    }

    return formatted.trim();
  }

  return pub;
}
