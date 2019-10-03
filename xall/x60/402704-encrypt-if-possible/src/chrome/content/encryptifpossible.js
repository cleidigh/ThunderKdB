// from https://developer.mozilla.org/en-US/docs/XUL_School/JavaScript_Object_Management
// or as domain from: define namespace (from http://blogger.ziesemer.com/2007/10/respecting-javascript-global-namespace.html)
if (typeof atGwuEncryptIfPossible == "undefined") {
  var atGwuEncryptIfPossible = {};
};


// main object
atGwuEncryptIfPossible = {
    me: "encryptifpossible",
    prefs: null,
    strbundle: null,

   // log function
   log: function(msg) {
      if (this.debug) {
          try {
              console.log(this.me + ": " + msg);
          } catch (e) {}
      }
    },

    // get preferences, which are added since very first version
    getBoolPref: function(name, defVal) { 
      try {
        return this.prefs.getBoolPref(name);
      } catch (e) {
        this.log(name + " not set");
        this.prefs.setBoolPref(name,defVal);
        return defVal;
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
      this.auto_encrypt_ask = this.prefs.getBoolPref("auto_encrypt_ask");               
      this.warn_no_encrypt = this.prefs.getIntPref("warn_no_encrypt");               
      // new options
      this.auto_sign = this.getBoolPref("auto_sign", false);               
      
      this.log("pref - debug: " +  this.debug);
      this.log("pref - auto_encrypt_ask: " +  this.auto_encrypt_ask );
      this.log("pref - warn_no_encrypt: " +  this.warn_no_encrypt );
      this.log("pref - auto_sign: " +  this.auto_sign );
      
      // get strings
      this.strbundle = document.getElementById(this.me + "-strings");
    },

    // get String
    getString: function(name) {
      return this.strbundle.getString(name);
    },

    getFormattedString: function(name,pars) {
      return this.strbundle.getFormattedString(name,pars);
    },

    setSign: function() {
      // get sign button
      let btn = window.document.getElementById("menu_securitySign1");

      // if not already set, do so now   
      if (!gMsgCompose.compFields.securityInfo.QueryInterface(Components.interfaces.nsIMsgSMIMECompFields).signMessage) {
        if (gCurrentIdentity.getUnicharAttribute("signing_cert_name")) {
          this.log("setting sign");
          btn.doCommand();
        } else {
          this.log("no signing certificate set for " + gCurrentIdentity.email + ", you need to set one in Account Settings/Security");
        }
      }  
    },

    
    setEncrypt: function (enable) {
      // get encrypt button
      let btn = window.document.getElementById("menu_securityEncryptRequire1");
      let encryptOn = gMsgCompose.compFields.securityInfo.QueryInterface(Components.interfaces.nsIMsgSMIMECompFields).requireEncryptMessage;
      let doEncrypt = true;
      
       // toggle on?
      if (enable && !encryptOn) {
        if (this.auto_encrypt_ask)
          doEncrypt = this.askUser(this.getString("certficatesFound"),this.getString("encryptMessage"));
          
        if (doEncrypt) {
          // if not already set, do so now   
          if (!encryptOn) {
              this.log("setting encrypt");
              btn.doCommand();
          }        
          
          // sign message
          if (this.auto_sign) {
            this.setSign()
          }
        }  

        // or  toggle off?
      } else if (!enable && encryptOn) {

          // for security reasons, always ask before disabling encryption
          doEncrypt = this.askUser(this.getString("certficatesNotFound"),this.getString("unEncryptMessage"));
            
          if (doEncrypt) {
            // toggle off
            this.log("unsetting encrypt");
            btn.doCommand();
          }        
      }
       
    },

    askUser: function (title, message)
    {
      let button = Services.prompt.confirmEx(
        window,
        this.me + ": " + title,
        message,
        Services.prompt.STD_YES_NO_BUTTONS,
        null,
        null,
        null,
        null,
        {});
      // confirmEx returns button index:
      return (button == 0);
    },

    getHaveCertsForAll: function() {
    
      let missingCount     = new Object();
      let emailAddresses   = new Object();
      let overallCount     = new Object();
      let certVerification = new Object();
      let certIssuedInfos  = new Object();
      let certExpiresInfos = new Object(); 
      let certs            = new Object();
      let retCanEncrypt    = new Object();
         
      let canEncrypt = false;
      
      try {
          // check recipients for valid certs 
          Components.classes["@mozilla.org/messenger-smime/smimejshelper;1"]
                      .createInstance(Components.interfaces.nsISMimeJSHelper)
                      .getRecipientCertsInfo(gMsgCompose.compFields,
                                             overallCount,
                                             emailAddresses,
                                             certVerification,
                                             certIssuedInfos,
                                             certExpiresInfos,
                                             certs,
                                             retCanEncrypt
                                             );                                             
          this.log("overallCount = " + overallCount.value);
          this.log("canEncrypt = " + retCanEncrypt.value);
          canEncrypt = retCanEncrypt.value;
      }    
      catch (e)
      {
        this.log("error calling getRecipientCertsInfo:" + e);
      }
      
      // show warning if some valid but not all
      if (!canEncrypt) {
        this.log("certs are missing");

        try {
          this.missing_certs_for = "";
          Components.classes["@mozilla.org/messenger-smime/smimejshelper;1"]
                      .createInstance(Components.interfaces.nsISMimeJSHelper)
                      .getNoCertAddresses(gMsgCompose.compFields,
                                          missingCount,
                                          emailAddresses);
          this.log("missingCount = " + missingCount.value);
          this.missing_certs_for = emailAddresses.value;
          this.log("missing for " + this.missing_certs_for);
          
          canEncrypt = (missingCount.value == 0); // in case getRecipientCertsInfo failed
          
        }
        catch (e)
        {
          this.log("error calling getNoCertAddresses:" + e);
          return false;
        }
        
        if (overallCount.value > 0 && overallCount.value != missingCount.value && this.warn_no_encrypt >= 1)
          canEncrypt = !(this.askUser(this.getString("certficatesNotFound"),this.getFormattedString("unEncryptWarnMessageMixed", [this.missing_certs_for])));
        else if (overallCount.value > 0  && this.warn_no_encrypt == 2)
          canEncrypt = !(this.askUser(this.getString("certficatesNotFound"),this.getString("unEncryptWarnMessageNone")));

      }
  
      return canEncrypt;
    },
 
    getHaveCertForSelf: function() {
      if (!gCurrentIdentity.getUnicharAttribute("encryption_cert_name")) {
        this.log("no certificate set for " + gCurrentIdentity.email + ", you need to set one in Account Settings/Security");
        return false;
      } else {
        this.log("cert key for " + gCurrentIdentity.email + ": " + gCurrentIdentity.getUnicharAttribute("encryption_cert_name"));
        // validity checked by TB internally ...
        return true
      }  
    },
    
    doEventHandler: function () {
        // read options + strings
        this.getSettings();
        
        if (gMsgCompose) {
          // check if we can encrypt messages for ourself at all
          if (this.getHaveCertForSelf()) {
            // if we have certs for all recipients, set encrypt
            this.setEncrypt(this.getHaveCertsForAll());
          }
        } 
    },

    startup: function () {
        document.getElementById("msgcomposeWindow").addEventListener("compose-send-message", function() {
            
            // uncomment if we do not want to continue unless this is an actual send event (now we do also set properties when saving)
            //let msgcomposeWindow = document.getElementById("msgcomposeWindow");
            //let msg_type = msgcomposeWindow.getAttribute("msgtype");
            //if (!(msg_type == nsIMsgCompDeliverMode.Now || msg_type == nsIMsgCompDeliverMode.Later)) 
            //  return;
            
            try {
              atGwuEncryptIfPossible.doEventHandler();
            } catch (e) {
              atGwuEncryptIfPossible.log(e);
            }
        }, true);
    }

}

window.addEventListener("load", function(e) {
    atGwuEncryptIfPossible.startup();
}, false);

//for debugging
//encryptifpossible.doEventHandler();

// "C:\Program Files (x86)\Mozilla Thunderbird\thunderbird.exe" -no-remote -P dev -purgecaches
// package app: 
//   cd /cygdrive/c/Users/gwu/Documents/projects/Thunderbird-AddOns/encryptifpossible@gwu.at
//   zip -r /cygdrive/c/Temp/1/encryptifpossible-$(date +%Y%m%d_%H%M).xpi *
//   mv /cygdrive/c/Temp/1/encryptifpossible-*.xpi /cygdrive/c/Users/GWu/AppData/Roaming/Thunderbird/Profiles/7mj4411z.dev/extensions/
//
//   rm -rf /cygdrive/c/Users/GWu/AppData/Roaming/Thunderbird/Profiles/7mj4411z.dev/extensions/encryptifpossible@gwu.at/ 
//   cp -r /cygdrive/c/Users/gwu/Documents/projects/Thunderbird-AddOns/encryptifpossible@gwu.at/ /cygdrive/c/Users/GWu/AppData/Roaming/Thunderbird/Profiles/7mj4411z.dev/extensions/
//   /cygdrive/c/Program\ Files\ \(x86\)/Mozilla\ Thunderbird/thunderbird.exe -no-remote -P dev -purgecaches    
//
// debug
//  FF remote debug: http://kewisch.wordpress.com/2013/06/13/the-thunderbird-remote-debugger-is-alive/
