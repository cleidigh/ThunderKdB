var {Services} = ChromeUtils.import("resource://gre/modules/Services.jsm");

window.addEventListener("load", function(e) { ahtFunctions.startup(); }, false);
window.addEventListener("unload", function(e) { ahtFunctions.shutdown(); }, false);

var ahtFunctions = {

	// 5 variables for the original settings
	// html and remote content settings
	prefer_plaintext: false,
	html_as: 0,
	disallow_classes: 0,
	// javascript setting
	javascript_enabled: false,
	// inline attachment setting
	mail_inline_attachments: false,

	block: false,

	startup: function()
	{
		// console.log("AHT startup");

		this.observerService = Components.classes["@mozilla.org/observer-service;1"]
			.getService(Components.interfaces.nsIObserverService);
		this.observerService.addObserver(this, "MsgMsgDisplayed", false);

		// if not existing, set addons default settings
		try {
			if(Services.prefs.getIntPref("extensions.allowhtmltemp.ButtonFunction")) {
				// console.log("AHT default setting ButtonFunction existing:");
				// console.log(Services.prefs.getIntPref("extensions.allowhtmltemp.ButtonFunction"));
			}
		}
		catch(e) {
			// console.log("AHT default setting ButtonFunction doesn't exist");
			Services.prefs.setIntPref("extensions.allowhtmltemp.ButtonFunction", 0)
		}
		try {
			if(Services.prefs.getBoolPref("extensions.allowhtmltemp.ForceRemoteContent")) {
				// console.log("AHT default setting ForceRemoteContent existing and true");
			}
			else {
				// console.log("AHT default setting ForceRemoteContent existing but false");
			}
		}
		catch(e) {
			// console.log("AHT default setting ForceRemoteContent doesn't exist");
			Services.prefs.setBoolPref("extensions.allowhtmltemp.ForceRemoteContent", false)
		}
		try {
			if(Services.prefs.getBoolPref("extensions.allowhtmltemp.JavaScriptTemp")) {
				// console.log("AHT default setting JavaScriptTemp existing and true");
			}
			else {
				// console.log("AHT default setting JavaScriptTemp existing but false");
			}
		}
		catch(e) {
			// console.log("AHT default setting JavaScriptTemp doesn't exist");
			Services.prefs.setBoolPref("extensions.allowhtmltemp.JavaScriptTemp", false)
		}
		try {
			if(Services.prefs.getBoolPref("extensions.allowhtmltemp.InlineAttachmentsTemp")) {
				// console.log("AHT default setting InlineAttachmentsTemp existing and true");
			}
			else {
				// console.log("AHT default setting InlineAttachmentsTemp existing but false");
			}
		}
		catch(e) {
			// console.log("AHT default setting InlineAttachmentsTemp doesn't exist");
			Services.prefs.setBoolPref("extensions.allowhtmltemp.InlineAttachmentsTemp", false)
		}
	},

	shutdown: function()
	{
		this.observerService.removeObserver(this, "MsgMsgDisplayed", false);
	},

	observe: function(subject, topic, data)
	{
		switch(topic)
		{
			case "MsgMsgDisplayed":
				// console.log("AHT MsgMsgDisplayed");
				if (this.block)
				{
					// Revert to the users default settings
					// after the message is reloaded.
					this.RestoreHTMLcontentPrefs();					
				}
				break;
		}
	},

	AllowHTMLtemp: function(ahtKeyboardEvent, ahtTriggeredBy)
	{
		// console.log("AHT fired");
		// console.log(ahtKeyboardEvent);
		// console.log(ahtTriggeredBy);

		// ahtButtons should be disabled, if no msg or multiple msgs are selected,
		// but sometimes we nevertheless could land here.
		// So we check if only one email is selected, otherwise we do nothing.
		if (gFolderDisplay.selectedCount == 1)
		{
			// Save users applications default settings
			this.SaveHTMLcontentPrefs();

			// Get users pref for the buttons function
			// 0 = Original HTML; 1 = Sanitized HTML; 2 = Plaintext
			let ahtPrefButtonFunction = Services.prefs.getIntPref("extensions.allowhtmltemp.ButtonFunction");
			// Get users pref to force remote content
			// true = force; false = no remote content
			let ahtPrefForceRemoteContent = Services.prefs.getBoolPref("extensions.allowhtmltemp.ForceRemoteContent");

			// RemoteContent popupmenu item clicked in remote content bar in a HTML message
			if (ahtTriggeredBy == "remoteButton")
			{
				this.ShowRemote();
			}
			
			// Keyboard shortcut invokes the same function as a simple click on the addon button
			else if (ahtTriggeredBy == "keyboard")
			{
				switch (ahtPrefButtonFunction)
				{
					case 0:
						if(ahtPrefForceRemoteContent) {
							this.ShowRemote();				
						}
						else {
							this.ShowOriginalHTML();
						}
						break;
					case 1:
						this.ShowSanitizedHTML();					
						break;
					case 2:
						this.ShowPlaintext();
						break;
				}
			}

			// If we land here, the trigger must be a click on the addon button.
			// We must now differ the choosen function by modifier key (ahtKeyboardEvent).

			// Addon button clicked + both CTRL and SHIFT key
			else if (ahtKeyboardEvent.shiftKey && (ahtKeyboardEvent.ctrlKey || ahtKeyboardEvent.metaKey))
			{
				this.ShowSanitizedHTML();					
			}

			// Addon button clicked + only CTRL key
			else if ((ahtKeyboardEvent.ctrlKey || ahtKeyboardEvent.metaKey) && !(ahtKeyboardEvent.shiftKey))
			{
				this.ShowRemote();
			}
	
			// Addon button clicked + only SHIFT key
			else if ((ahtKeyboardEvent.shiftKey) && !(ahtKeyboardEvent.ctrlKey || ahtKeyboardEvent.metaKey))
			{
				this.ShowPlaintext();
			}

			// Addon button clicked - no key pressed
			else if (!(ahtKeyboardEvent.ctrlKey || ahtKeyboardEvent.metaKey || ahtKeyboardEvent.shiftKey))
			{
				switch (ahtPrefButtonFunction)
				{
					case 0:
						if(ahtPrefForceRemoteContent) {
							this.ShowRemote();				
						}
						else {
							this.ShowOriginalHTML();
						}
						break;
					case 1:
						this.ShowSanitizedHTML();					
						break;
					case 2:
						this.ShowPlaintext();
						break;
				}
			}
	
		}
	},

	ShowPlaintext: function()
	{
		// console.log("AHT ShowPlaintext");
		try
		{
			// reload message in plaintext:
			MsgBodyAsPlaintext();
		}
		catch(e) {
			// console.log("AHT Plaintext error");
		}
	},

	ShowSanitizedHTML: function()
	{
		// console.log("AHT ShowSanitizedHTML");
		try
		{
			// reload message in sanitized HTML:
			MsgBodySanitized();
		}
		catch(e) {
			// console.log("AHT ShowSanitizedHTML error");
		}
	},

	ShowOriginalHTML: function()
	{
		// console.log("AHT ShowOriginalHTML");
		try
		{
			// enable temporarily JavaScript if temp option is set
			if(Services.prefs.getBoolPref("extensions.allowhtmltemp.JavaScriptTemp") == true)
				Services.prefs.setBoolPref("javascript.enabled", true);
			// enable temporarily InlineAttachments if temp option is set
			if(Services.prefs.getBoolPref("extensions.allowhtmltemp.InlineAttachmentsTemp") == true)
				Services.prefs.setBoolPref("mail.inline_attachments", true);
			
			// reload message with original HTML:
			MsgBodyAllowHTML();
			// show own RemoteContentPopupmenuItem to allow HTML again in case of event
			ahtButtonStatus.changeRemoteContentPopupmenuItem();
		}
		catch(e) {
			// console.log("AHT ShowOriginalHTML error");
		}
	},

	ShowRemote: function()
	{
		// console.log("AHT ShowRemote");
		try
		{
			// enable temporarily HTML
			Services.prefs.setBoolPref("mailnews.display.prefer_plaintext", false);
			Services.prefs.setIntPref("mailnews.display.html_as", 0);
			Services.prefs.setIntPref("mailnews.display.disallow_mime_handlers", 0);

			// enable temporarily JavaScript if temp option is set
			if(Services.prefs.getBoolPref("extensions.allowhtmltemp.JavaScriptTemp") == true)
				Services.prefs.setBoolPref("javascript.enabled", true);
			// enable temporarily InlineAttachments if temp option is set
			if(Services.prefs.getBoolPref("extensions.allowhtmltemp.InlineAttachmentsTemp") == true)
				Services.prefs.setBoolPref("mail.inline_attachments", true);
			
			// now HTML is allowed, so we can reload the message with remote content:
			LoadMsgWithRemoteContent();
		}
		catch(e) {
			// console.log("AHT ShowRemote error");
		}
	},

	SaveHTMLcontentPrefs: function()
	{
		// console.log("AHT SaveHTMLcontentPrefs");
		if(!this.block)	// we need this block to prevent from
						// starting AHT again before the return
						// to the original settings! Otherwise we would loose
						// original settings -> 'Security leak'!
		{
			this.block = true;

			this.prefer_plaintext = Services.prefs.getBoolPref("mailnews.display.prefer_plaintext");
			this.html_as = Services.prefs.getIntPref("mailnews.display.html_as");
			this.disallow_classes = Services.prefs.getIntPref("mailnews.display.disallow_mime_handlers");
			this.javascript_enabled = Services.prefs.getBoolPref("javascript.enabled");
			this.mail_inline_attachments = Services.prefs.getBoolPref("mail.inline_attachments");
		}
	},

	RestoreHTMLcontentPrefs: function()
	{
		// console.log("AHT RestoreHTMLcontentPrefs");
		if (this.block)
		{
			Services.prefs.setBoolPref("mailnews.display.prefer_plaintext", this.prefer_plaintext);
			Services.prefs.setIntPref("mailnews.display.html_as", this.html_as);
			Services.prefs.setIntPref("mailnews.display.disallow_mime_handlers", this.disallow_classes);
			Services.prefs.setBoolPref("javascript.enabled", this.javascript_enabled);
			Services.prefs.setBoolPref("mail.inline_attachments", this.mail_inline_attachments);

			this.block = false;
		}
	},
	
	InitPrefs: function()
	{
		// console.log("AHT InitPrefs");
		let html_as = Services.prefs.getIntPref("mailnews.display.html_as");
		let prefer_plaintext = Services.prefs.getBoolPref("mailnews.display.prefer_plaintext");
		let disallow_classes = Services.prefs.getIntPref("mailnews.display.disallow_mime_handlers");
		const menuIDs = ["ahtAppHtmlBodyAllowHTML",
							"ahtAppHtmlBodySanitized",
							"ahtAppHtmlBodyAsPlaintext",
							"ahtAppHtmlBodyAllParts"];

		if (disallow_classes > 0)
			gDisallow_classes_no_html = disallow_classes;
		// else gDisallow_classes_no_html keeps its inital value

		let HtmlBody_Radiogroup = document.getElementById("ahtAppHtmlRadiogroup");
		let AllowHTML_menuitem = document.getElementById(menuIDs[0]);
		let Sanitized_menuitem = document.getElementById(menuIDs[1]);
		let AsPlaintext_menuitem = document.getElementById(menuIDs[2]);
		let AllBodyParts_menuitem = menuIDs[3] ? document.getElementById(menuIDs[3]) : null;

		document.getElementById("ahtAppHtmlBodyAllParts").hidden =
			! Services.prefs.getBoolPref("mailnews.display.show_all_body_parts_menu");

		if (!prefer_plaintext && !html_as && !disallow_classes &&
				AllowHTML_menuitem && HtmlBody_Radiogroup)
			HtmlBody_Radiogroup.selectedIndex = 0;
		else if (!prefer_plaintext && html_as == 3 && disallow_classes > 0 &&
				Sanitized_menuitem && HtmlBody_Radiogroup)
			HtmlBody_Radiogroup.selectedIndex = 1;
		else if (prefer_plaintext && html_as == 1 && disallow_classes > 0 &&
				AsPlaintext_menuitem && HtmlBody_Radiogroup)
			HtmlBody_Radiogroup.selectedIndex = 2;
		else if (!prefer_plaintext && html_as == 4 && !disallow_classes &&
				AllBodyParts_menuitem && HtmlBody_Radiogroup)
			HtmlBody_Radiogroup.selectedIndex = 3;
		// else (the user edited prefs/user.js) select none of the radio items

		document.getElementById("ahtForceRemoteContentPrefCheckbox").disabled =
			!Services.prefs.getBoolPref("mailnews.message_display.disable_remote_image");
		document.getElementById("ahtJavaScriptTempPrefCheckbox").disabled =
			Services.prefs.getBoolPref("javascript.enabled");
		document.getElementById("ahtInlineAttachmentsTempPrefCheckbox").disabled =
			Services.prefs.getBoolPref("mail.inline_attachments");
	},

	RefreshPrefsOption: function()
	{
		document.getElementById("ahtForceRemoteContentPrefCheckbox").disabled =
			(document.getElementById("ahtRemoteContentPrefCheckbox").checked == true);
		document.getElementById("ahtJavaScriptTempPrefCheckbox").disabled =
			(document.getElementById("ahtJavaScriptPrefCheckbox").checked == true);
		document.getElementById("ahtInlineAttachmentsTempPrefCheckbox").disabled =
			(document.getElementById("ahtInlineAttachmentsPrefCheckbox").checked == true);
	},

	AhtSetMsgBodyAllowHTML: function()
	{
		Services.prefs.setBoolPref("mailnews.display.prefer_plaintext", false);
		Services.prefs.setIntPref("mailnews.display.html_as", 0);
		Services.prefs.setIntPref("mailnews.display.disallow_mime_handlers", 0);
	},

	AhtSetMsgBodySanitized: function()
	{
		Services.prefs.setBoolPref("mailnews.display.prefer_plaintext", false);
		Services.prefs.setIntPref("mailnews.display.html_as", 3);
		Services.prefs.setIntPref("mailnews.display.disallow_mime_handlers",
			gDisallow_classes_no_html);
	},

	AhtSetMsgBodyAsPlaintext: function()
	{
		Services.prefs.setBoolPref("mailnews.display.prefer_plaintext", true);
		Services.prefs.setIntPref("mailnews.display.html_as", 1);
		Services.prefs.setIntPref("mailnews.display.disallow_mime_handlers",
			gDisallow_classes_no_html);
	},

	AhtSetMsgBodyAllParts: function()
	{
		Services.prefs.setBoolPref("mailnews.display.prefer_plaintext", false);
		Services.prefs.setIntPref("mailnews.display.html_as", 4);
		Services.prefs.setIntPref("mailnews.display.disallow_mime_handlers", 0);
	}

}
