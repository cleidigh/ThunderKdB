/* Copyright (c) 2020 Andreas Krinke.
 *
 * Based on the thunderbird add-on "ToggleReplied 2" by Jonathan Kamens
 * https://addons.thunderbird.net/thunderbird/addon/togglereplied-2
 *
 * This Source Code Form is subject to the terms of the Mozilla Public License,
 * v. 2.0. If a copy of the MPL was not distributed with this file, You can
 * obtain one at http://mozilla.org/MPL/2.0/. */

/* Disable S/MIME signatures for Seamonkey and Thunderbird */

const { msgUriToMsgHdr, msgHdrsModifyRaw } = ChromeUtils.import("chrome://disablesignature/content/modules/msgHdrUtils.js")

/*
 * regular expressions that match both protocols: pkcs7-signature and x-pkcs7-signature
 */
// for the value of the "content-type" header
const oldContentTypeValue = /multipart\/signed; protocol="application\/(x-)?pkcs7-signature";/;
// for the raw message
const oldContentType = /Content-Type: multipart\/signed; protocol="application\/(x-)?pkcs7-signature";/;
// replacement value that references the (x-)? match
const newContentType = "Content-Type: multipart/mixed; protocol=\"application/$1pkcs7-disabled-signature\";";

function disableSignatureClass()
{
	// do initialisation stuff
	this.disableSignatureInit = function()
	{
		var stringService = Components.classes["@mozilla.org/intl/stringbundle;1"]
			.getService(Components.interfaces.nsIStringBundleService);
		var strbundle = stringService.createBundle("chrome://disableSignature/locale/disablesignature.properties");
		var disableSignatureLabel = strbundle.GetStringFromName("disableSignature.label");

		// mailContext-mark is there in TB and SM for the thread pane and message pane
		// for Postbox it's messagePaneContext-mark
		var contextMenu = document.getElementById("mailContext");
		if (!contextMenu)
			contextMenu = document.getElementById("messagePaneContext");
		if (contextMenu)
		{
			// gets menu separator before which we insert our new item
			var afterMarkMenuSeparator = document.getElementById("mailContext-sep-afterMarkMenu");
			// build and insert our item
			contextMenu.insertBefore(createDisableSignatureMenuitem("mailContext-disableSignature", disableSignatureLabel), afterMarkMenuSeparator);

			contextMenu.addEventListener("popupshowing", disableSignatureObj.disableSignaturePopup, false);
		}

		// in Postbox there also is threadPaneContext-mark
		var threadContextMenu = document.getElementById("threadPaneContext");
		if (threadContextMenu)
		{
			// gets menu separator before which we insert our new item
			var afterMarkMenuSeparator = document.getElementById("threadPaneContext-sep-afterMarkMenu");
			// build and insert our item
			contextMenu.insertBefore(createDisableSignatureMenuitem("threadContext-disableSignature", disableSignatureLabel), afterMarkMenuSeparator);

			threadContextMenu.addEventListener("popupshowing", disableSignatureObj.disableSignaturePopup, false);
		}

		var messageMenu = document.getElementById("messageMenuPopup");
		if (messageMenu)
		{
			// gets menu separator before which we insert our new item
			var afterMarkMenuSeparator = document.getElementById("messageMenuAfterMarkSeparator");
			// build and insert our item
			messageMenu.insertBefore(createDisableSignatureMenuitem("disableSignatureMenu", disableSignatureLabel), afterMarkMenuSeparator);

			messageMenu.addEventListener("popupshowing", disableSignatureObj.disableSignaturePopup, false);
		}
	}

	function createDisableSignatureMenuitem(id, label)
	{
		menuitem = document.createXULElement("menuitem");
		menuitem.setAttribute("label", label);
		menuitem.setAttribute("id", id);
		menuitem.addEventListener('command', disableSignatureObj.disableSignature, false);

		return menuitem;
	}

	// enable or disable the menu entries
	this.disableSignaturePopup = function()
	{
		var dBView = gDBView;
		var numSelected = dBView.numSelected;

		// initially, disable all menu items because the callback below is called asynchronously later on
		var disable = true;

		var menuitem = document.getElementById("mailContext-disableSignature");
		if (menuitem) {
			menuitem.setAttribute('disabled', disable ? 'true' : '');
		}

		menuitem = document.getElementById("threadContext-disableSignature");
		if (menuitem) {
			menuitem.setAttribute('disabled', disable ? 'true' : '');
		}

		menuitem = document.getElementById("disableSignatureMenu");
		if (menuitem) {
			menuitem.setAttribute('disabled', disable ? 'true' : '');
		}

		if (numSelected) {
			var header = dBView.hdrForFirstSelectedMessage;
			// documentation: https://dxr.mozilla.org/comm-central/source/comm/mailnews/db/gloda/modules/mimemsg.js#173
			MsgHdrToMimeMessage(header, null, function(header, mimeMsg) {
				var contentType = mimeMsg.get("content-type");
				isMessageSigned = oldContentTypeValue.test(contentType);

				if (isMessageSigned) {
					var disable = false;
					var menuitem = document.getElementById("mailContext-disableSignature");
					if (menuitem) {
						menuitem.setAttribute('disabled', disable ? 'true' : '');
					}

					menuitem = document.getElementById("threadContext-disableSignature");
					if (menuitem) {
						menuitem.setAttribute('disabled', disable ? 'true' : '');
					}

					menuitem = document.getElementById("disableSignatureMenu");
					if (menuitem) {
						menuitem.setAttribute('disabled', disable ? 'true' : '');
					}
				}
			},
			true,
			{
				partsOnDemand: true,
			});
		}
	}

	function disableSignatureInMessage(msg) {
		msg = msg.replace(oldContentType, newContentType);
		return msg;
	}

	this.disableSignature = function()
	{
		var uris;
		// try-catch because Thunderbird made an incompatible change in revision b0e37b312b54
		try {
			uris = GetSelectedMessages();
		} catch(e) {
			uris = gFolderDisplay.selectedMessageUris;
		}

		// convert URIs to headers
		var headers = uris.map(function (uri) { return msgUriToMsgHdr(uri); });
		for (header of headers) {
			// first, check if the mail is actually signed

			// documentation: https://dxr.mozilla.org/comm-central/source/comm/mailnews/db/gloda/modules/mimemsg.js#173
			MsgHdrToMimeMessage(header, null, function(header, mimeMsg) {
				var contentType = mimeMsg.get("content-type");
				isMessageSigned = oldContentTypeValue.test(contentType);

				if (isMessageSigned) {
					msgHdrsModifyRaw([header], disableSignatureInMessage);
				}
			},
			true,
			{
				partsOnDemand: true,
			});
		}

		// update the menus to be sure they display the new state
		disableSignatureObj.disableSignaturePopup();
	}
}

var disableSignatureObj = new disableSignatureClass();
