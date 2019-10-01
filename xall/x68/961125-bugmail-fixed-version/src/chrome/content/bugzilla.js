/*
bugmail extension for Thunderbird
    
    Copyright (C) 2008  Fabrice Desré

    This program is free software: you can redistribute it and/or modify
    it under the terms of the GNU General Public License as published by
    the Free Software Foundation, either version 3 of the License, or
    (at your option) any later version.

    This program is distributed in the hope that it will be useful,
    but WITHOUT ANY WARRANTY; without even the implied warranty of
    MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
    GNU General Public License for more details.

    You should have received a copy of the GNU General Public License
    along with this program.  If not, see <http://www.gnu.org/licenses/>.

    Initial author is Fabrice Desré - fabrice.desre@gmail.com
*/

var bugzillaEngine = {
  
  iconURL : "chrome://bugmail/skin/bugzilla.png",
  realm: "",
  isFeed: false,
  
  isBug: function(mailURI, headers) {
    var product = headers.extractHeader("X-Bugzilla-Product", false);
    
    var contentBase = headers.extractHeader("Content-Base", false);
    
    this.isFeed = (contentBase != null) && (contentBase.length > 0) &&
                  (contentBase.indexOf("https://bugzilla.mozilla.org/show_bug.cgi") == 0);
    
    return this.isFeed || ((product != null) && (product.length > 0));
  },
  
  getPassword: function(host) {
    var result = {found: false, user: null, password: null};
    if  (Cc["@mozilla.org/passwordmanager;1"]) {
      var passwordManager = Cc["@mozilla.org/passwordmanager;1"].getService(Ci.nsIPasswordManager);
      var e = passwordManager.enumerator;
      while (e.hasMoreElements()) {
        try {
          var pass = e.getNext().QueryInterface(Ci.nsIPassword);
          if (pass.host == host) {
                   result.user = pass.user;
             result.password = pass.password;
             result.found = true;
          }
        }
        catch(e) {}
      }
    }
    else {
      var loginMgr = Cc["@mozilla.org/login-manager;1"].
		     getService(Ci.nsILoginManager);
      var logins = loginMgr.findLogins({}, host,
					  null, "Bugmail");
      if (logins.length) {
        result.user = logins[0].username;
        result.password = logins[0].password;
        result.found = true;
      }
    }
    
    return result;
  },
  
  addPassword: function(host, user, password) {
    if  (Cc["@mozilla.org/passwordmanager;1"]) {
      var passwordManager = Cc["@mozilla.org/passwordmanager;1"].getService(Ci.nsIPasswordManager);
      try {
        passwordManager.addUser(host, user, password);
      } catch(e) {}
    } else {
      var loginMgr = Cc["@mozilla.org/login-manager;1"].
		     getService(Ci.nsILoginManager);
		     
      var loginInfo = Cc["@mozilla.org/login-manager/loginInfo;1"]
	     .createInstance(Ci.nsILoginInfo);
      loginInfo.init(host, null, "Bugmail", user, password, "", "");
      var logins = loginMgr.findLogins({}, host, null, "Bugmail");
      try {
        if (logins.length) {
          loginMgr.modifyLogin(logins[0], loginInfo);
        } else {
          loginMgr.addLogin(loginInfo);
        }
      } catch(e) {}
    }
  },

/*  https://bugzilla.mozilla.org/show_bug.cgi?id=379306&ctype=xml */

  getBugURI: function(mailURI, headers) {
    var uri;
    if (this.isFeed) {
      uri = headers.extractHeader("Content-Base", false).split('\n')[0] + "&ctype=xml&excludefield=attachmentdata";
    }
    else { // Extract bugzilla URI from mail content
       var doc = document.getElementById('messagepane').contentDocument;
       uri = doc.querySelector("a[href*=show_bug]").href +
             "&ctype=xml&excludefield=attachmentdata";
    }
    
    //uri = "https://bugzilla.mozilla.org/show_bug.cgi?id=379306&ctype=xml";
    
    this.realm = uri.substring(0, uri.indexOf('?'));
    var pass = this.getPassword(this.realm);
    if (pass.found && (uri.indexOf("https://") == 0)) {
      uri += "&Bugzilla_login=" + encodeURIComponent(pass.user) +
             "&Bugzilla_password=" + encodeURIComponent(pass.password);
    }
    return uri;
  },
  
  updateUI: function(doc, text) {
    var binding = new xsltBinding();
    binding.initWithSrc("bugmail-info", doc, "chrome://bugmail/content/bugzilla.xsl",
              function() {}, []);
		
  },
  
  askLogin: function() {
    var bundle = document.getElementById("bugmail-strings");
    
    var CC = Components.classes;
    var CI = Components.interfaces;
    
    var pass = this.getPassword(this.realm);
    
    var promptClass = Cc["@mozilla.org/network/default-prompt;1"] ? Cc["@mozilla.org/network/default-prompt;1"] :Cc["@mozilla.org/login-manager/prompter;1"];
    var prompt = promptClass.getService(Ci.nsIAuthPrompt);
    var password = {value: pass.password};
    var user = {value: pass.user};
    var check = {value: true};               // default the checkbox to true
    var result = prompt.promptUsernameAndPassword(bundle.getString("loginprompt.title"),
      bundle.getString("loginprompt.message"), this.realm,
      Ci.nsIAuthPrompt.SAVE_PASSWORD_PERMANENTLY , user, password);
    if (result && user.value.length && password.value.length) {
      this.addPassword(this.realm, user.value, password.value);
      bugmail.forceUpdate();
    }
  }
}

bugmail.addEngine(bugzillaEngine);
