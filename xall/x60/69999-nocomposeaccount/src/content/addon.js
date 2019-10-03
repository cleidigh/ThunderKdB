/*
 * Copyright (c) 2006-2007, Kyosuke Takayama <support@mc.neweb.ne.jp>
 * It is released under the MIT LICENSE.
 * "Borrowed" from addon: faviconizeTab (https://addons.mozilla.org/en-US/firefox/addon/3780)
*/

noComposeAccount.addon = {
   lists: new Array(),
   defaultAccount: null,
   init: function() {
      for(var list, i = 0; list = noComposeAccount.addon.lists[i]; i++)
         list.init();
   },

   add: function(l) {
      this.lists.push(l);
   },

   update: function() {
      for(var list, i = 0; list = this.lists[i]; i++)
         list.update();
   }
}

noComposeAccount.IO = {
   pref: null,

   /*tests: function() {
	   
	   alert("5");
	   Components.utils.import('resource:///modules/iteratorUtils.jsm');
   },*/
   
   init: function() {
		ChromeUtils.import("resource://gre/modules/Services.jsm");
	   var prefsService = Services.prefs;
	   

		let accountMgrSvc = Components.classes["@mozilla.org/messenger/account-manager;1"]
                                .getService(Components.interfaces.nsIMsgAccountManager);
		noComposeAccount.addon.defaultAccount = accountMgrSvc.defaultAccount;
	
		noComposeAccount.log(accountMgrSvc.defaultAccount);
		noComposeAccount.log(accountMgrSvc.defaultAccount.defaultIdentity);
	
	  //this.tests();
      this.pref = Components.classes["@mozilla.org/preferences-service;1"].
         getService(Components.interfaces.nsIPrefService).getBranch('extensions.nocomposeaccount.');
      return this;
   },

   getBool: function(key) {
      try {
         return this.pref.getBoolPref(key);
      } catch(e) {
         return false;
      }
   },

   setBool: function(key, val) {
      return this.pref.setBoolPref(key, val);
   },

   getChar: function(key) {
      try {
         return this.pref.getCharPref(key);
      } catch(e) {
         return '';
      }
   },

   setChar: function(key, val) {
      return this.pref.setCharPref(key, val);
   },

   getLists: function(key) {
      return this.getChar(key).replace(/\n/, ' ').split(/\s+/);
   }
}

window.addEventListener('load', noComposeAccount.addon.init, false);

