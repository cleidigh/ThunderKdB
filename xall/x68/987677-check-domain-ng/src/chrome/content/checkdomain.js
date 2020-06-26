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

var CheckDomain = {
	
	check: function() {
		
		var preferencesService = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
		var to = preferencesService.getBoolPref('extensions.checkdomain.to');
		var cc = preferencesService.getBoolPref('extensions.checkdomain.cc');
		var bcc = preferencesService.getBoolPref('extensions.checkdomain.bcc');
		var limit = preferencesService.getIntPref('extensions.checkdomain.limit');
		var exclude = decodeURIComponent(escape(preferencesService.getCharPref('extensions.checkdomain.exclude')));
		var selfexclude = preferencesService.getBoolPref('extensions.checkdomain.selfexclude');
		
		var recipientList = this.getRecipientList(to, cc, bcc);
		var sender = this.getSender();
		var senderDomain = this.getDomain(sender);
		
		var excludeList = exclude.split("\n");
		excludeList.contains = this.contains;
		if (selfexclude) {
			excludeList.push(senderDomain);
		}
		
		var externalDomainList = [];
		externalDomainList.contains = this.contains;
		var externalRecipientList = [];
		for (var i = 0; i < recipientList.length; i++) {
			var recipientFullAddress = recipientList[i].address;
			var recipientEmailAddress = this.getEmailAddress(recipientFullAddress);
			var recipientDomain = this.getDomain(recipientEmailAddress);
			if (recipientDomain != "" && !excludeList.contains(recipientDomain)) {
				externalRecipientList.push(recipientList[i]);
				if (!externalDomainList.contains(recipientDomain)) {
					externalDomainList.push(recipientDomain);
				}
			}
		}
		
		if (externalDomainList.length >= limit) {
			this.confirmOk= false;
			window.openDialog("chrome://checkdomain/content/checkdomain-dialog.xul",
				"CheckDomainDialog", "chrome,modal,titlebar,centerscreen", 
				this, { externalRecipientList: externalRecipientList, limit: limit, to: to, cc: cc, bcc: bcc });
			if (!this.confirmOk) {
				return false;
			}
		}
		
		return true;
	},
	
	getRecipientList: function(to, cc, bcc) {
		
		var recipientList = [];
		
		if (gMsgCompose.compFields != null) {
			
			var headerParser = Components.classes["@mozilla.org/messenger/headerparser;1"].getService(Components.interfaces.nsIMsgHeaderParser);
			
			for (var index = 1; ; index++) {
				var inputField = document.getElementById("addressCol2#" + index);
				if (inputField == null) {
					break;
				}
				
				var fieldValue = inputField.value;
				if (fieldValue == null) {
					fieldValue = inputField.getAttribute("value");
				}
				
				if (fieldValue != "") {
					
					var recipient = null;
					
					try {
						recipient = headerParser.reformatUnquotedAddresses(fieldValue);
					} catch (ex) {
						recipient = fieldValue;
					}
					
					var recipientType = "";
					var popupElement = document.getElementById("addressCol1#" + index);
					if (popupElement != null) {
						recipientType = popupElement.selectedItem.getAttribute("value");
					}
					
					switch (recipientType) {
						case "addr_to":
							if (to) {
								recipientList.push({type: "to", address: recipient});
							}
							break;
						case "addr_cc":
							if (cc) {
								recipientList.push({type: "cc", address: recipient});
							}
							break;
						case "addr_bcc":
							if (bcc) {
								recipientList.push({type: "bcc", address: recipient});
							}
							break;
						default:
							break;
					}
				}
			}
		}
		
		return recipientList;
	},
	
	getSender: function() {
		
		var identityWidget = document.getElementById('msgIdentity');
		var fromIdentityKey= identityWidget.value;
		
		var accountManager = Components.classes["@mozilla.org/messenger/account-manager;1"].getService(Components.interfaces.nsIMsgAccountManager);
		var accounts = accountManager.accounts;
		if (accounts.queryElementAt) {
			for (var i = 0; i < accounts.length; i++) {
				var account = accounts.queryElementAt(i, Components.interfaces.nsIMsgAccount);
				var accountIdentities = account.identities;
				
				for (var identCount = 0; identCount < accountIdentities.length; identCount++) {
					var identity = accountIdentities.queryElementAt(identCount, Components.interfaces.nsIMsgIdentity);
					if (identity.key == fromIdentityKey) {
						return identity.email;
					}
				}
			}
		} else {
			for (var i = 0; i < accounts.Count(); i++) {
				var account = accounts.QueryElementAt(i, Components.interfaces.nsIMsgAccount);
				var accountIdentities = account.identities;
				
				for (var identCount = 0; identCount < accountIdentities.Count(); identCount++) {
					var identity = accountIdentities.QueryElementAt(identCount, Components.interfaces.nsIMsgIdentity);
					if (identity.key == fromIdentityKey) {
						return identity.email;
					}
				}
			}
		}
		
		return "";
	},
	
	getEmailAddress: function(fullAddress) {
		
		var startIndex = fullAddress.indexOf("<");
		var endIndex = fullAddress.indexOf(">");
		if (startIndex != -1 && endIndex != -1 && startIndex < endIndex) {
			return fullAddress.substring(startIndex + 1, endIndex);
		}
		return fullAddress;
	},
	
	getDomain: function(address) {
		
		var domain = address;
		var index = address.indexOf("@");
		if (index != -1) {
			domain = address.substring(index + 1, address.length);
		}
		return domain;
	},
	
	contains: function(value) {
		
		for (var i in this) {
			if (this.hasOwnProperty(i) && this[i] === value) {
				return true;
			}
		}
		return false;
	}
}
