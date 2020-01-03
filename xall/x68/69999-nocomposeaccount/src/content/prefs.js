/*
 * Copyright (c) 2006-2008, Kyosuke Takayama <support@mc.neweb.ne.jp>
 * It is released under the MIT LICENSE.
 * "Borrowed" from addon: faviconizeTab (https://addons.mozilla.org/en-US/firefox/addon/3780)
*/

if(typeof noComposeAccount == 'undefined')
   var noComposeAccount = {};

noComposeAccount.prefManager = {
   keys: new Array('defComp.appliesOnComposeNew', 'defComp.appliesOnReply', 'defComp.force'),

   initPrefs: function() {
		document.addEventListener("dialogaccept", function(event) {
			noComposeAccount.prefManager.setPrefs();
		});
	  
      var io = noComposeAccount.IO.init();
      var $  = this.$;
	  
      for(var key, i = 0; key = this.keys[i]; i++) {
         if(io.getBool(key))
            $(key).checked = true;
      }
	  // restore behavior option value
	  try {
		var strSavedValue = io.getChar("defCompBehavior");
		var objDefComp = noComposeAccount.g("defCompBehavior");
		for(var i = 0, len = objDefComp.itemCount; i < len; i++) {
			if(objDefComp.getItemAtIndex(i).value == strSavedValue) {
				objDefComp.selectedIndex = i;
				break;
			}
		}
		// trigger behavior settings restore
		/* removed as per conversation with Giacomo > 1.1
		strSavedValue = io.getChar("defTiggerBehavior");
		objDefComp = noComposeAccount.g("defTiggerBehavior");
		if(strSavedValue == null || strSavedValue == "") {
			objDefComp.selectedIndex = 1; // auto select "trigger only on new" by default
		} else {
			for(var i = 0, len = objDefComp.itemCount; i < len; i++) {
				if(objDefComp.getItemAtIndex(i).value == strSavedValue) {
					objDefComp.selectedIndex = i;
					break;
				}
			}
		}
		this.EvalBehaviorSelection(objDefComp);
		*/
		// make sure this is run on startup
		if(io.getChar("defCompBehavior") == "defComp.nothing") {
			$("defComp.appliesOnComposeNew").disabled = true;
			$("defComp.appliesOnReply").disabled = true;
		}
		if(io.getChar("defCompBehavior") != "defComp.blank") {
			$("defComp.force").disabled = true;
		}
		
	  } catch(err) {}
   },

   setPrefs: function() {
      var io = noComposeAccount.IO.init();
      var $  = this.$;

      for(var key, i = 0; key = this.keys[i]; i++) {
         var bool = $(key).checked;
         io.setBool(key, bool);
      }
	  
	  io.setChar("defCompBehavior", noComposeAccount.g("defCompBehavior").value);
	  
      var win= Components.classes["@mozilla.org/appshell/window-mediator;1"].
         getService(Components.interfaces.nsIWindowMediator).getEnumerator("navigator:browser");

      while(win.hasMoreElements()) {
         var browser = win.getNext();
         browser.noComposeAccount.addon.update();
      }
   },

   EvalBehaviorSelection: function(obj) {
      var instance = noComposeAccount;
	  var self = noComposeAccount.prefManager;
      var val = (instance.g(obj).value);
	  var blnEnable = (val == "defComp.nothing");
	  this.$("defComp.force").disabled = (val != "defComp.blank");
	  instance.g("defComp.appliesOnComposeNew").disabled = blnEnable;
	  instance.g("defComp.appliesOnReply").disabled = blnEnable;
	  //instance.g("defTiggerBehavior").disabled = blnEnable;
   },

   $: function(e) {
      return document.getElementById(e);
   }
}

