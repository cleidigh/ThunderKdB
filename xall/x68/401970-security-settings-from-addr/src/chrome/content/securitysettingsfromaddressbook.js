// from https://developer.mozilla.org/en-US/docs/XUL_School/JavaScript_Object_Management
// or as domain from: define namespace (from http://blogger.ziesemer.com/2007/10/respecting-javascript-global-namespace.html)
if (typeof atGwuSecuritySettingsFromAddressbook == "undefined") {
  var atGwuSecuritySettingsFromAddressbook = {};
};


// main object
atGwuSecuritySettingsFromAddressbook = {

  me: "securitysettingsfromaddressbook",
  prefs: null,


  // log function
  log: function(msg) {
    if (this.debug) {
      try {
        dump(this.me + ": " + msg + '\n');
        console.log(this.me + ": " + msg);
      } catch (e) {}
    }
  },

  // read options
  getSettings: function() {
    // get pref object
    this.prefs = Components.classes["@mozilla.org/preferences-service;1"]
      .getService(Components.interfaces.nsIPrefService)
      .getBranch("extensions." + this.me + ".");
    //this.log(this.prefs);

    // set options
    this.debug = this.prefs.getBoolPref("debug");
    this.adressbook_field = this.prefs.getCharPref("adressbook_field");
    this.enabled = this.prefs.getBoolPref("enabled");
    this.warn_missing = this.prefs.getBoolPref("warn_missing");

    this.log("pref - debug: " + this.debug);
    this.log("pref - adressbook_field: " + this.adressbook_field);
    this.log("pref - enabled: " + this.enabled);
    this.log("pref - warn_missing: " + this.warn_missing);

    // get strings
    this.strbundle = document.getElementById(this.me + "-strings");
  },

  // read list of recipients from compose window
  getRecipientsTo: function() {
    // get list of recipients as-is in window
    let msgTo = gMsgCompose.compFields.to 
       + ", " + gMsgCompose.compFields.cc 
       + ", " + gMsgCompose.compFields.bcc;
    this.log(msgTo);
    // get plain e-mail address (strip names etc)
    let msgToPlain = MailServices.headerParser.extractHeaderAddressMailboxes(msgTo);
    this.log(msgToPlain);

    return msgToPlain;
  },

  // split address list
  splitAdressList: function(msgToPlain) {
    // split by ',' and strip blanks
    let msgToPlainArray = msgToPlain.split(/,/);
    return msgToPlainArray.map(e => e.trim());
  },

  // get sign/encrypt info from custom field
  parseCustomField: function(customField, ret) {

    // first check if one of the recipients has no-sign or no-encrypt set
    if (customField.indexOf("nosign") > -1) {
      ret.nosign = true;
      this.log("->nosign");
    }
    // encrypt message?
    if (customField.indexOf("noencrypt") > -1) {
      ret.noencrypt = true;
      this.log("->noencrypt");
    }

    // then check if  the recipients has sign or encrypt set,  but only if we didn't find anyone with no-* previously
    // sign message?
    if (!ret.nosign && (customField.indexOf("sign") > -1)) {
      this.log("->sign");
      ret.sign = true;
    }
    // encrypt message?
    if (!ret.noencrypt && (customField.indexOf("encrypt") > -1)) {
      this.log("->encrypt");
      ret.encrypt = true;
    }

    return ret;

  },

  // get value of custom field in TB address book
  getCustomFieldAB: function(msgToPlainArray, ret) {

    //get address books
    let abManager = Components.classes["@mozilla.org/abmanager;1"].getService(Components.interfaces.nsIAbManager);
    let allAddressBooks = abManager.directories;

    // for all address books
    while (allAddressBooks.hasMoreElements()) {
      let addressBook = allAddressBooks.getNext().QueryInterface(Components.interfaces.nsIAbDirectory);
      if (addressBook instanceof Components.interfaces.nsIAbCollection) {
        try {
          // build array of e-mail addresses and iterate
          for (var n in msgToPlainArray) {
            this.log(msgToPlainArray[n]);
            let vCard = addressBook.cardForEmailAddress(msgToPlainArray[n]);
            // if found ...
            if (vCard) {
              // read address book field from entry 
              let custom1 = vCard.getProperty(this.adressbook_field, '?').toLowerCase();
              this.log(msgToPlainArray[n] + ': ' + custom1);

              // parse
              this.parseCustomField(custom1, ret);
            }
          }
        } catch (e) {
          this.log("error reading address book: " + e);
        }
      }
    }
  },

  // get value of custom field in CardBook address book
  getCustomFieldCardBook: function(msgToPlainArray, ret) {

    this.log("testing for CardBook Add-On");
    try {
      // check for CardBook installation
      Components.utils.import("chrome://cardbook/content/cardbookRepository.js");
      this.log("CardBook Add-On found");

      var accounts = cardbookRepository.cardbookAccounts;
      for (var i = 0; i < accounts.length; i++) {

        var account = accounts[i];
        if (!account[6]) { continue; }

        // build array of e-mail addresses and iterate
        for (var n in msgToPlainArray) {
          this.log(msgToPlainArray[n]);
          let vCard = cardbookRepository.cardbookDisplayCards[account[4]].cards.filter(function(element) {
                         return (element.email.join().indexOf(msgToPlainArray[n]) != -1);
                      })[0];
          // if found ...
          if (vCard) {
            let custom1 = "";
            // read address book field from entry 
            if (this.adressbook_field.startsWith('X-')) {
              // search in array of vCard.others
              for (var m in vCard.others) {
                if (vCard.others[m].startsWith('X-')) {
                  let keyValue = vCard.others[m].split(/:/);
                  if ((keyValue[1]) && (keyValue[0] === this.adressbook_field)) {
                    custom1 = keyValue[1];
                  }
                }
              }
            } else {
              custom1 = vCard[(this.adressbook_field).toLowerCase()].toLowerCase();
            }
            this.log("CardBook value for " + msgToPlainArray[n] + ': ' + custom1);

            // parse
            this.parseCustomField(custom1, ret);
          }
        }
      }
    } catch (e) {
      this.log("error reading CardBook: " + e);
    }

  },

  // read address book entries for given list of recipients and return if the custom field (option) contains sign and/or encrypt
  getEncryptSign: function(msgToPlain) {

    // init
    let ret = {
      sign: null,
      encrypt: null,
      nosign: false,
      noencrypt: false
    };

    // addresses to array
    let msgToPlainArray = this.splitAdressList(msgToPlain);

    // search in TB address book
    this.getCustomFieldAB(msgToPlainArray, ret);

    // search in CardBook address book
    this.getCustomFieldCardBook(msgToPlainArray, ret);

    // if we found someone with no-*, set for all
    if (ret.nosign) ret.sign = false;
    if (ret.noencrypt) ret.encrypt = false;

    return ret;
  },

  setSign: function(setOn) {
    // get sign button
    let btn = window.document.getElementById("menu_securitySign1");

    // if not already set, do so now   
    if (!gMsgCompose.compFields.composeSecure.signMessage && setOn) {
      if (gCurrentIdentity.getUnicharAttribute("signing_cert_name")) {
        this.log("setting sign");
        btn.doCommand();
      } else {
        this.log("no signing certificate set for " + gCurrentIdentity.email + ", you need to set one in Account Settings/Security");
      }
    } else if (gMsgCompose.compFields.composeSecure.signMessage && !setOn) {
      this.log("unsetting sign");
      btn.doCommand();
    }

  },

  getHaveCertsForAll: function() {
    let missingCount = new Object();
    let emailAddresses = new Object();

    try {
      Components.classes["@mozilla.org/messenger-smime/smimejshelper;1"]
        .createInstance(Components.interfaces.nsISMimeJSHelper)
        .getNoCertAddresses(gMsgCompose.compFields,
          missingCount,
          emailAddresses);
      this.log("missingCount = " + missingCount.value);
    } catch (e) {
      return false;
    }

    if (missingCount.value == 0)
      return true;
    else
      this.log("missing for " + emailAddresses.value);
    return false;
  },

  informUser: function(title, message) {
    Services.prompt.alert(
      window,
      this.me + ": " + title,
      message
    );
  },

  // get String
  getString: function(name) {
    return this.strbundle.getString(name);
  },

  setEncrypt: function(setOn) {

    // get current encryption setting state
    let encryptSet = gMsgCompose.compFields.composeSecure.requireEncryptMessage;

    // get encrypt button
    let btn = window.document.getElementById("menu_securityEncryptRequire1");

    // check if certificates for all recipients are available
    if (!this.getHaveCertsForAll() && setOn) {
      this.log("certs are missing, can not encrypt");
      // show alert
      if (this.warn_missing)
        this.informUser(this.getString("warning"), this.getString("certficatesNotFound"));

      // unset encrypt, might have been set before  
      if (encryptSet) {
        this.log("unsetting encrypt");
        btn.doCommand();
      }
    } else {
      // if not already set, do so now   
      if (!encryptSet && setOn) {
        if (gCurrentIdentity.getUnicharAttribute("encryption_cert_name")) {
          this.log("setting encrypt");
          btn.doCommand();
        } else {
          this.log("no encryption certificate set for " + gCurrentIdentity.email + ", you need to set one in Account Settings/Security");
        }
      } else if (encryptSet && !setOn) {
        this.log("unsetting encrypt");
        btn.doCommand();
      }
    }
  },

  doEventHandler: function() {
    // read options
    this.getSettings();

    if (this.enabled && gMsgCompose) {
      // check if we'd like to enable security based on address book entry of recipients          
      let signEncrypt = this.getEncryptSign(this.getRecipientsTo());
      if (signEncrypt.encrypt != null) this.setEncrypt(signEncrypt.encrypt);
      if (signEncrypt.sign != null) this.setSign(signEncrypt.sign);
    }
  },

  startup: function() {
    document.getElementById("msgcomposeWindow").addEventListener("compose-send-message", function() {

      // uncomment if we do not want to continue unless this is an actual send event (now we do also set properties when saving)
      //let msgcomposeWindow = document.getElementById("msgcomposeWindow");
      //let msg_type = msgcomposeWindow.getAttribute("msgtype");
      //if (!(msg_type == nsIMsgCompDeliverMode.Now || msg_type == nsIMsgCompDeliverMode.Later)) 
      //  return;

      try {
        atGwuSecuritySettingsFromAddressbook.doEventHandler();
      } catch (e) {
        atGwuSecuritySettingsFromAddressbook.log(e);
      }
    }, true);
  }

}

window.addEventListener("load", function(e) {
  atGwuSecuritySettingsFromAddressbook.startup();
}, false);

//for debugging
//securitySettingsFromAddressbook.doEventHandler();

// "C:\Program Files (x86)\Mozilla Thunderbird\thunderbird.exe" -no-remote -P dev -purgecaches
// package app: 
//   cd /cygdrive/c/Users/gwu/Documents/projects/Thunderbird-AddOns/securitysettingsfromaddressbook@gwu.at
//   zip -r /cygdrive/c/Temp/1/securitysettingsfromaddressbook-$(date +%Y%m%d_%H%M).xpi *
//   mv /cygdrive/c/Temp/1/securitysettingsfromaddressbook-*.xpi /cygdrive/c/Users/GWu/AppData/Roaming/Thunderbird/Profiles/7mj4411z.dev/extensions/
//
//   rm -rf /cygdrive/c/Users/GWu/AppData/Roaming/Thunderbird/Profiles/7mj4411z.dev/extensions/securitysettingsfromaddressbook@gwu.at/ 
//   cp -r /cygdrive/c/Users/gwu/Documents/projects/Thunderbird-AddOns/securitysettingsfromaddressbook@gwu.at/ /cygdrive/c/Users/GWu/AppData/Roaming/Thunderbird/Profiles/7mj4411z.dev/extensions/
//
// debug
//  extension workspace, menu switch context to chrome
//  FF remote debug: http://kewisch.wordpress.com/2013/06/13/the-thunderbird-remote-debugger-is-alive/