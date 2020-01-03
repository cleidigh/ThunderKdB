// blank compose message handler
var noComposeAccount = {
	 active: true,
	logActive: !true,
	
	log: function(v) {
		if(this.logActive) {
			console.log(v);
		}
	},
	
  setActive: function(value) {
	this.active = value;
  },
  getActive: function() {
	return this.active;
  },
  // helper method
  g: function(v) { 
	if(typeof(v) == "object")
		return v;
	else
		return document.getElementById(v); 
  },
  
  // get settings property value
  // propertyId: name of saved property 
  // type: type of data to get. Valid values are "bool" and "char"
  getSettingsValue: function(propertyId, type) {
	var io = noComposeAccount.IO.init();
	if(type == "bool")
		return io.getBool(propertyId);
	if(type == "char")
		return io.getChar(propertyId);
  },
  
  // onload (first time only, it appears) enable the handler (and initialize property value)
  onLoad: function() { 
	// to be able to show an "please choose From account" alert
	if(this.g("button-send")) {
		//Application.console.log('button-send found');
		this.g("button-send").addEventListener("click", function(e) { noComposeAccount.onSendButtonClick(); }, true);
	}
  },
  onComposeInit: function() {
	// always run the NCA main method
	this.runNCA();
	
	var io = noComposeAccount.IO.init();
	var blnForce = io.getBool("defComp.force");
	var blnBehaviorOk = (io.getChar("defCompBehavior") == "defComp.blank");
	var blnNoAccountSelected = (this.g("msgIdentity").selectedIndex == -1);
	
	if(blnForce && blnBehaviorOk && blnNoAccountSelected)
		this.g("content-frame").addEventListener("focus", function(e) { noComposeAccount.forceFocus(); }, true);
	else 
		this.g("content-frame").removeEventListener("focus", function(e) { noComposeAccount.forceFocus(); }, true);
  },
  
  forceFocus: function() {
	 noComposeAccount.log("focus");
	 noComposeAccount.log(noComposeAccount.addon.defaultAccount);
	 
	 var io = noComposeAccount.IO.init();
	 var blnForce = io.getBool("defComp.force");
	 var blnBehaviorOk = (io.getChar("defCompBehavior") == "defComp.blank");
	 var blnNoAccountSelected = (this.g("msgIdentity").selectedIndex == -1);
	 
	 if(blnForce && blnBehaviorOk && blnNoAccountSelected) {
		var t = this;
		setTimeout(function() { 
			t.g("msgIdentity").focus();//.select().focus();
		}, 150);
	 }
  },
  runNCA: function() {
		//var msgComposeService = Components.classes['@mozilla.org/messengercompose;1']
        //                        .getService(Components.interfaces.nsIMsgComposeService);
		var msgCompType = Components.interfaces.nsIMsgCompType;
		var intMessageType = (gMsgCompose ? gMsgCompose.type : -1);
		var instance = this;
		var obj = this.g("msgIdentity"); // button-send // msgSubject
		var strDefAccount = "";
		var prefs = noComposeAccount.prefManager;
		var io = noComposeAccount.IO.init();
		var strBehavior = io.getChar("defCompBehavior");
		var blnChange = false;
		var blnChangeOnCompose = io.getBool("defComp.appliesOnComposeNew");
		var blnChangeOnReply = io.getBool("defComp.appliesOnReply");
		
		noComposeAccount.log('Behavior: ' + strBehavior);
		
		if(strBehavior != "defComp.nothing") { // for starters if addon is "activated", we should do further evals
			// if this is a new mail, and addon is activated for compose then change
			if((gMsgCompose.type == msgCompType.New || gMsgCompose.type == msgCompType.MailToUrl) && blnChangeOnCompose) {
				blnChange = true;
			}
			/*  http://doxygen.db48x.net/mozilla-full/html/d3/d0e/interfacensIMsgCompType.html
			const  long 	New  = 0
			const long 	Reply = 1
			const long 	ReplyAll = 2
			const long 	ForwardAsAttachment = 3
			const long 	ForwardInline = 4
			const long 	NewsPost = 5
			const long 	ReplyToSender = 6
			const long 	ReplyToGroup = 7
			const long 	ReplyToSenderAndGroup = 8
			const long 	Draft = 9
			const long 	Template = 10
			const long 	MailToUrl = 11
			const long 	ReplyWithTemplate = 12
			const long 	ReplyToList = 13
			*/
			// if this is any type of reply message and addon is activate for replies, then change
			if((gMsgCompose.type == msgCompType.Reply ||
				gMsgCompose.type == msgCompType.ReplyAll ||
				gMsgCompose.type == msgCompType.ForwardAsAttachment ||
				gMsgCompose.type == msgCompType.ForwardInline ||
				gMsgCompose.type == msgCompType.ReplyToSender ||
				gMsgCompose.type == msgCompType.ReplyToGroup ||
				gMsgCompose.type == msgCompType.ReplyToSenderAndGroup ||
				gMsgCompose.type == msgCompType.ReplyWithTemplate ||
				gMsgCompose.type == msgCompType.ReplyToList ||
				gMsgCompose.type == msgCompType.MailToUrl) && blnChangeOnReply) {
				blnChange = true;
			}
		}

		if(blnChange) { // if evals above means we should alter from address then:
			switch(strBehavior) {
				case "defComp.blank": // set sender account to blank
					if(obj && blnChange) {
						obj.selectedIndex = -1;
					}
					break;
				case "defComp.default":  // use the default account
					noComposeAccount.log('getting default account');
					// https://developer.mozilla.org/en/Thunderbird/Account_examples
					var accKey = noComposeAccount.addon.defaultAccount.key;// get the default account key (smth like 'account4')
					//var objAccNo, accIdNo = "";
					var defaultAccountId = ""; // id1, id2 etc
					defaultAccountId = noComposeAccount.addon.defaultAccount.defaultIdentity.key;
					noComposeAccount.log(defaultAccountId);
					
					if(defaultAccountId != "") {
						// account id no (defaultAccountId) has the form of "idX, idY, idZ" (ei: "id1, id2, id5") 
						// when more than one identity is configured for an account
						// we'll just get the first one.
						if(defaultAccountId.indexOf(",") > -1) {
							defaultAccountId = defaultAccountId.substr(0, defaultAccountId.indexOf(","));
						}
						var objMsgId = this.g("msgIdentity");
						
						for(var i = 0, len = obj.itemCount; i < len; i++) {
							var mItem = obj.getItemAtIndex(i);
							if(mItem.getAttribute('identitykey') == defaultAccountId) {
								obj.selectedIndex = i;
								obj.click();
								break; 				
							}
						}
					}
					break;
			} // switch
		} // if
		
	/*} catch(err) {
		//alert(err.description);
	}*/
    this.initialized = true;
  },
  // onClose: function() {
  // },
  
  onSendButtonClick: function() {
	var obj = this.g("msgIdentity");
	if(obj.selectedIndex == -1) {
		var strbundle = document.getElementById("NoComposeAccountStringBundle");
		var prompts = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
					.getService(Components.interfaces.nsIPromptService);
		prompts.alert(null, strbundle.getString("chooseFromAccountTitle"), strbundle.getString("chooseFromAccount"));
	}
  }
};