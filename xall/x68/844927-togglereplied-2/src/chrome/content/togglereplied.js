/* Copyright (c) 2017 Jonathan Kamens.
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/.

 * Earlier versions of this file were "triple-licensed" under MPL 1.1 / for
 * details.GPL 2.0 / LGPL 2.1. Please see the file "license.txt" or
 * https://github.com/jikamens/ToggleReplied/blob/master/license.txt for
 * details. */

/* Toggle Replied and Forwarded states for Seamonkey and Thunderbird */

function toggleRepliedClass()
{
	// do initialisation stuff
	this.toggleRepliedInit = function()
	{
		var stringService = Components.classes["@mozilla.org/intl/stringbundle;1"]
																	.getService(Components.interfaces.nsIStringBundleService);
		var strbundle = stringService.createBundle("chrome://toggleReplied/locale/togglereplied.properties");
		var toggleRepliedLabel = strbundle.GetStringFromName("toggleReplied.label");
		var toggleForwardedLabel = strbundle.GetStringFromName("toggleForwarded.label");
		var toggleRedirectedLabel = strbundle.GetStringFromName("toggleRedirected.label");

	  // mailContext-mark is there in TB and SM for the thread pane and message pane
	  // for Postbox it's messagePaneContext-mark
		var contextMenu = document.getElementById("mailContext-mark");
	  if (!contextMenu)
	    contextMenu = document.getElementById("messagePaneContext-mark");
	  if (contextMenu)
	  {
	   	// gets first menupopup in mailContext-mark - has no id
	    var markMenupopup = contextMenu.getElementsByTagName("menupopup")[0];
	   	// gets menuseparator before which we insert our new items - has no id
	    var markMenuseparator = markMenupopup.getElementsByTagName("menuseparator")[0];
	   	// build and insert our Replied item
	    markMenupopup.insertBefore(createRepliedMenuitem("mailContext-markReplied", toggleRepliedLabel), markMenuseparator);
	   	// build and insert our Forwarded item
	    markMenupopup.insertBefore(createForwardedMenuitem("mailContext-markForwarded", toggleForwardedLabel), markMenuseparator);
		// build and insert our Forwarded item
		markMenupopup.insertBefore(createRedirectedMenuitem("mailContext-markRedirected", toggleRedirectedLabel), markMenuseparator);

	   	contextMenu.addEventListener("popupshowing", toggleRepliedObj.toggleRepliedPopup, false);
	  }

	  // in Postbox there also is threadPaneContext-mark
	  var threadContextMenu = document.getElementById("threadPaneContext-mark");
	  if (threadContextMenu)
	  {
	   	// gets first menupopup in mailContext-mark - has no id
	    var markMenupopup = threadContextMenu.getElementsByTagName("menupopup")[0];
	   	// gets menuseparator before which we insert our new items - has no id
	    var markMenuseparator = markMenupopup.getElementsByTagName("menuseparator")[0];
	   	// build and insert our Replied item
	    markMenupopup.insertBefore(createRepliedMenuitem("threadContext-markReplied", toggleRepliedLabel), markMenuseparator);
	   	// build and insert our Forwarded item
	    markMenupopup.insertBefore(createForwardedMenuitem("threadContext-markForwarded", toggleForwardedLabel), markMenuseparator);
	   	// build and insert our Redirected item
	    markMenupopup.insertBefore(createRedirectedMenuitem("threadContext-markRedirected", toggleRedirectedLabel), markMenuseparator);

	   	threadContextMenu.addEventListener("popupshowing", toggleRepliedObj.toggleRepliedPopup, false);
	  }


		// gets first menupopup in markMenu - has no id
	  var markMenu = document.getElementById("markMenu");
	  if (markMenu)
	  {
			var markMenupopup = markMenu.getElementsByTagName("menupopup")[0];
			// gets menuseparator before which we insert our new items - has no id
			var markMenuseparator = markMenupopup.getElementsByTagName("menuseparator")[0];
			// build and insert our Replied item
			markMenupopup.insertBefore(createRepliedMenuitem("markRepliedMenu", toggleRepliedLabel), markMenuseparator);
			// build and insert our Forwarded item
			markMenupopup.insertBefore(createForwardedMenuitem("markForwardedMenu", toggleForwardedLabel), markMenuseparator);
			// build and insert our Redirected item
			markMenupopup.insertBefore(createRedirectedMenuitem("markRedirectedMenu", toggleRedirectedLabel), markMenuseparator);

			markMenu.addEventListener("popupshowing", toggleRepliedObj.toggleRepliedPopup, false);
		}
	}

	function createRepliedMenuitem(id, label)
	{
		menuitem = document.createXULElement("menuitem");
		menuitem.setAttribute("label", label);
		menuitem.setAttribute("id", id);
		menuitem.setAttribute("type", "checkbox");
		menuitem.addEventListener('command', toggleRepliedObj.toggleReplied, false);
	
		return menuitem;
	}

	function createForwardedMenuitem(id, label)
	{
		menuitem = document.createXULElement("menuitem");
		menuitem.setAttribute("label", label);
		menuitem.setAttribute("id", id);
		menuitem.setAttribute("type", "checkbox");
		menuitem.addEventListener('command', toggleRepliedObj.toggleForwarded, false);

		return menuitem;
	}

	function createRedirectedMenuitem(id, label)
	{
		menuitem = document.createXULElement("menuitem");
		menuitem.setAttribute("label", label);
		menuitem.setAttribute("id", id);
		menuitem.setAttribute("type", "checkbox");
		menuitem.addEventListener('command', toggleRepliedObj.toggleRedirected, false);

		return menuitem;
	}

	// hide or show the menu entry
	this.toggleRepliedPopup = function()
	{
		var dBView = gDBView;
		var numSelected = dBView.numSelected;

		var isMessageReplied = false;
		var isMessageForwarded = false;
		var isMessageRedirected = false;
		if (numSelected)
		{
			isMessageReplied = (dBView.hdrForFirstSelectedMessage.flags&0x02) != 0;
			isMessageForwarded = (dBView.hdrForFirstSelectedMessage.flags&0x1000) != 0;
			isMessageRedirected = /(?:^| )redirected(?: |$)/.test(dBView.hdrForFirstSelectedMessage.getStringProperty("keywords"));

			document.getElementById("mailContext-markReplied").setAttribute('checked', isMessageReplied ? 'true' : '');
			document.getElementById("mailContext-markForwarded").setAttribute('checked', isMessageForwarded ? 'true' : '');
			document.getElementById("mailContext-markRedirected").setAttribute('checked', isMessageRedirected ? 'true' : '');

			// if threadContext-markReplied, threadContext-markForwarded should also,
			// because we're running in Postbox
			if (document.getElementById("threadContext-markReplied"))
			{
				document.getElementById("threadContext-markReplied").setAttribute('checked', isMessageReplied ? 'true' : '');
				document.getElementById("threadContext-markForwarded").setAttribute('checked', isMessageForwarded ? 'true' : '');
				document.getElementById("threadContext-markRedirected").setAttribute('checked', isMessageRedirected ? 'true' : '');
			}
		}

		document.getElementById("markRepliedMenu").setAttribute('checked', isMessageReplied ? 'true' : '');
		document.getElementById("markForwardedMenu").setAttribute('checked', isMessageForwarded ? 'true' : '');
		document.getElementById("markRedirectedMenu").setAttribute('checked', isMessageRedirected ? 'true' : '');

		var disable = (numSelected == 0);
		document.getElementById("markRepliedMenu").setAttribute('disabled', disable ? 'true' : '');
		document.getElementById("markForwardedMenu").setAttribute('disabled', disable ? 'true' : '');
		document.getElementById("markRedirectedMenu").setAttribute('disabled', disable ? 'true' : '');
	}

	this.toggleReplied = function()
	{
		var dBView = gDBView;
		// use the state of the first selected message to determine
		// what to set. That's the same TB does for Mark Read.
		const repliedFlag = 0x02;
		var markReplied = (dBView.hdrForFirstSelectedMessage.flags&repliedFlag) == 0;
		var uris;
		// try-catch because Thunderbird made an incompatible change in revision b0e37b312b54
		try {
			uris = GetSelectedMessages();
		} catch(e) {
			uris = gFolderDisplay.selectedMessageUris;
		}
		for (var uri of uris)
		{
			var hdr = messenger.msgHdrFromURI(uri);
			dBView.db.MarkReplied(hdr.messageKey, markReplied, null);

			// Propagate the \Answered (replied) flag to the IMAP server
			var fdr = dBView.msgFolder;
			if (fdr instanceof Components.interfaces.nsIMsgImapMailFolder)
				fdr.storeImapFlags(repliedFlag, markReplied, [hdr.messageKey], 1, null);
		}

		// update the menus to be sure they display the new state
		// toggleRepliedObj.toggleRepliedPopup();
	}

	this.toggleForwarded = function()
	{
		var dBView = gDBView;
		// use the state of the first selected message to determine
		// what to set. That's the same TB does for Mark Read.
		const imapForwardedFlag = 0x0040; 
		var markForwarded = (dBView.hdrForFirstSelectedMessage.flags&0x1000) == 0;
		var uris;
		// try-catch because Thunderbird made an incompatible change in revision b0e37b312b54
		try {
			uris = GetSelectedMessages();
		} catch(e) {
			uris = gFolderDisplay.selectedMessageUris;
		}
		for (var uri of uris)
		{
			var hdr = messenger.msgHdrFromURI(uri);
			dBView.db.MarkForwarded(hdr.messageKey, markForwarded, null);

			// Propagate the (nonstandard) $Forwarded flag to the IMAP server
			var fdr = dBView.msgFolder;
			if (fdr instanceof Components.interfaces.nsIMsgImapMailFolder)
				fdr.storeImapFlags(imapForwardedFlag, markForwarded, [hdr.messageKey], 1, null);
		}

		// update the menus to be sure they display the new state
		// toggleRepliedObj.toggleRepliedPopup();
	}

	this.toggleRedirected = function()
	{
		var dBView = gDBView;
		// use the state of the first selected message to determine
		// what to set. That's the same TB does for Mark Read.
		var markRedirected = (/(?:^| )redirected(?: |$)/.test(dBView.hdrForFirstSelectedMessage.getStringProperty("keywords")));
		var uris;
		// try-catch because Thunderbird made an incompatible change in revision b0e37b312b54
		try {
			uris = GetSelectedMessages();
		} catch(e) {
			uris = gFolderDisplay.selectedMessageUris;
		}
		var toggler = !markRedirected ? "addKeywordsToMessages" : "removeKeywordsFromMessages";
		for (var uri of uris)
		{
			var hdr = messenger.msgHdrFromURI(uri);
			var msg = Components.classes["@mozilla.org/array;1"]
			  .createInstance(Components.interfaces.nsIMutableArray);
			msg.appendElement(hdr, false);
			try {
				hdr.folder[toggler](msg, "redirected");
			} catch(e) {}
		}

		// update the menus to be sure they display the new state
		// toggleRepliedObj.toggleRepliedPopup();
	}
}

var toggleRepliedObj = new toggleRepliedClass();
