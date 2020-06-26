/* ***** BEGIN LICENSE BLOCK *****
 * Version: MPL 2.0/GPL 2.0/LGPL 2.1
 *
 * The contents of this file are subject to the Mozilla Public License Version
 * 1.1 (the "License"); you may not use this file except in compliance with
 * the License. You may obtain a copy of the License at
 * http://www.mozilla.org/MPL/
 *
 * Software distributed under the License is distributed on an "AS IS" basis,
 * WITHOUT WARRANTY OF ANY KIND, either express or implied. See the License
 * for the specific language governing rights and limitations under the
 * License.
 *
 * The Original Code is Check Domain.
 *
 * The Initial Developer of the Original Code is
 * karakawa.
 * Portions created by the Initial Developer are Copyright (C) 2012
 * the Initial Developer. All Rights Reserved.
 *
 * This is a fork of Check Domain, which can run the 60.0.8 version of Firefox.
 *
 * Contributor(s):
 *   hayasa <hayasa@hayasa.com>
 *
 * Alternatively, the contents of this file may be used under the terms of
 * either the GNU General Public License Version 2 or later (the "GPL"), or
 * the GNU Lesser General Public License Version 2.1 or later (the "LGPL"),
 * in which case the provisions of the GPL or the LGPL are applicable instead
 * of those above. If you wish to allow use of your version of this file only
 * under the terms of either the GPL or the LGPL, and not to allow others to
 * use your version of this file under the terms of the MPL, indicate your
 * decision by deleting the provisions above and replace them with the notice
 * and other provisions required by the GPL or the LGPL. If you do not delete
 * the provisions above, a recipient may use your version of this file under
 * the terms of any one of the MPL, the GPL or the LGPL.
 *
 * ***** END LICENSE BLOCK ***** */

var CheckDomainDialog = {
	
	init: function() {
		
		var params = window.arguments[1];
		var externalRecipientList = params.externalRecipientList;
		var limit = params.limit;
		var to = params.to;
		var cc = params.cc;
		var bcc = params.bcc; 
		
		var bundle = document.getElementById("checkdomain-bundle");
		
		var acceptButton = document.documentElement.getButton("accept");
		acceptButton.label = bundle.getString("checkdomain.label.acccept");
		
		var cancelButton = document.documentElement.getButton("cancel");
		cancelButton.label = bundle.getString("checkdomain.label.cancel");

		document.addEventListener("dialogaccept", (event) => { CheckDomainDialog.doOk(); });
        document.addEventListener("dialogcancel", (event) => { CheckDomainDialog.doCancel(); });

		
		var checkTarget = "";
		if (to) {
			checkTarget += bundle.getString("checkdomain.label.to");
		}
		if (cc) {
			if (checkTarget) checkTarget += ",";
			checkTarget += bundle.getString("checkdomain.label.cc");
		}
		if (bcc) {
			if (checkTarget) checkTarget += ",";
			checkTarget += bundle.getString("checkdomain.label.bcc");
		}
		
		var messageLabel = bundle.getFormattedString("checkdomain.label.message", [String(limit), checkTarget]);
		var message = document.getElementById("checkdomain-dialog-message");
		message.textContent = messageLabel;
		
		var listbox = document.getElementById("checkdomain-dialog-listbox");
		for (var i = 0; i < externalRecipientList.length; i++) {
			var recipient = externalRecipientList[i];
			var listitem = this.createListitem(recipient);
			listbox.appendChild(listitem);
		}
	},
	
	createListitem: function(recipient) {
		
		var listitem = document.createElement("richlistitem");
		listitem.setAttribute("disabled", "true");
		
		var listcellType = document.createElement("label");
		var bundle = document.getElementById("checkdomain-bundle");
		listcellType.setAttribute("flex", "0");
		listcellType.setAttribute("value", bundle.getString("checkdomain.label." + recipient.type));
		listitem.appendChild(listcellType);
		
		var listcellAddress = document.createElement("label");
		listcellType.setAttribute("flex", "0");
		listcellAddress.setAttribute("value", recipient.address);
		listitem.appendChild(listcellAddress);
		
		return listitem;
	},
	
	doOk: function(event) {
		var parent = window.arguments[0];
		parent.confirmOk = true;
		//return true;
		dump("[OK] \n");
	},
	
	doCancel: function(event) {
		var parent = window.arguments[0];
		parent.confirmOk = false;
		//return true;
		dump("[CANCEL] \n");
	}
}
