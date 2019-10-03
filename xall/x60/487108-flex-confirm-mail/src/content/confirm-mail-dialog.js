/*
* "The contents of this file are subject to the Mozilla Public Licenske
* Version 1.1 (the "License"); you may not use this file except in
* compliance with the License. You may obtain a copy of the License at
* http://www.mozilla.org/MPL/
* 
* Software distributed under the License is distributed on an "AS IS"
* basis, WITHOUT WARRANTY OF ANY KIND, either express or implied. See the
* License for the specific language governing rights and limitations
* under the License.
* 
* The Original Code is confirm-address.
* 
* The Initial Developers of the Original Code are kentaro.matsumae and Meatian.
* Portions created by Initial Developers are 
* Copyright (C) 2007-2011 the Initial Developer.All Rights Reserved.
* 
* Contributor(s): tanabec
*/ 

var Cc = Components.classes;
var Ci = Components.interfaces;

function getLocaleString(id, parameters) {
	var bundle = document.getElementById("confirm-mail-strbundle");
	if (arguments.length > 1 && parameters.length)
		return bundle.getFormattedString(id, parameters);
	return bundle.getString(id);
}

function startup() {
	function setupOKButton() {
		var okBtn = document.documentElement.getButton("accept");
		okBtn.disabled = true;
		// set button label
		var strbundle = document.getElementById("confirm-mail-strbundle");
		var BtnLabel = strbundle.getString("confirm.dialog.acceptbtn.label");
		okBtn.label = BtnLabel;
	}

	function createRecipientLabel(recipient) {
		var typePrefix = recipient.type + ": ";
		if (recipient.name && recipient.name != recipient.address)
			return typePrefix + recipient.name + " <" + recipient.address + ">";
		return typePrefix + (recipient.fullName || recipient.address);
	}

	function initCheckAllCheckboxFor(list) {
		var checkAllCaption = list.parentNode.querySelector('caption.check_all');
		var checkEachCaption = list.parentNode.querySelector('caption.check_each');
		var key = 'net.nyail.tanabec.confirm-mail.allowCheckAll.' + list.parentNode.id;
		checkAllCaption.hidden = !ConfirmMailDialog.getPref(key) && !ConfirmMailDialog.getPref(key + '.always');
		checkEachCaption.hidden = !checkAllCaption.hidden;
		if (checkAllCaption.hidden)
			return;
		var checkAllCheckbox = checkAllCaption.querySelector('checkbox');
		if (!list.querySelector('checkbox')) {
			checkAllCheckbox.checked = true;
			checkAllCheckbox.disabled = true;
		}
		checkAllCheckbox.addEventListener("command", function(event) {
			switchCheckAllCheckBox(list);
			checkAllChecked();
		}, false);
	}

	function setupInternalDestinationList(internals) {
		// create internal-domain list
		var internalList = document.getElementById("yourDomainsList");

		for (var i = 0; i < internals.length; i++) {
			var listitem = createListItemWithCheckbox(createRecipientLabel(internals[i]));
			listitem.addEventListener("click", function() { updateCheckAllCheckBox(internalList); }, false);
			internalList.appendChild(listitem);
		}

		initCheckAllCheckboxFor(internalList);
	}

	function setupExternalDomainList(externals) {
		function createGroupHeader(domain) {
			var headerItem = document.createElement("richlistitem");
			headerItem.setAttribute("class", "confirm-mail-list-separator");
			headerItem.setAttribute("data-domain-name", domain);
			var headerLabelItem = document.createElement("label");
			headerLabelItem.setAttribute("value", "@" + domain);
			headerItem.appendChild(headerLabelItem);
			return headerItem;
		}

		function setHeaderStarIconVisible(groupHeaderItem, groupAllChecked) {
			if (groupAllChecked)
				groupHeaderItem.classList.add("all-checked");
			else
				groupHeaderItem.classList.remove("all-checked");
		}

		let groupedExternalAddressItems = {};
		function isGroupAllChecked(domain) {
			return groupedExternalAddressItems[domain]
				.every(function (addressItem) {
					return addressItem.querySelector("checkbox").checked;
				});
		}
		function recordItemInGroup(domain, item) {
			if (!groupedExternalAddressItems[domain])
				groupedExternalAddressItems[domain] = [];
			groupedExternalAddressItems[domain].push(item);
		}

		function getGroupHeaderForItem(originItem) {
			var cursorItem = originItem;
			while (cursorItem &&
				!cursorItem.classList.contains("confirm-mail-list-separator")) {
				cursorItem = cursorItem.previousSibling;
			}
			return cursorItem;
		}

		var externalList = document.getElementById("otherDomainsList");
		externalList.addEventListener("click", function (event) {
			let target = event.target;
			while (target && target.localName !== "richlistitem") {
				target = target.parentNode;
			}
			if (!target || target.classList.contains("confirm-mail-list-separator"))
				return;

			let groupHeaderItem = getGroupHeaderForItem(target);
			let groupDomain = groupHeaderItem.getAttribute("data-domain-name");
			setHeaderStarIconVisible(
				groupHeaderItem,
				isGroupAllChecked(groupDomain)
			);
		}, false);

		// external domains
		var groupCount = 0;
		function createExternalDomainsListItems(externals) {
			var groupedExternalRecipients = AddressUtil.groupDestinationsByDomain(externals);
			var shouldHighlightExceptionalDomains = ConfirmMailDialog.highlightExceptionalOtherDomains();
			for (let domainForThisGroup in groupedExternalRecipients) {
				let destinationsForThisGroup = groupedExternalRecipients[domainForThisGroup];
				groupCount++;
				let shouldHighlight = ExceptionManager.isExceptionalDomain(domainForThisGroup) &&
										shouldHighlightExceptionalDomains;

				// header for this group
				let groupHeaderItem = createGroupHeader(domainForThisGroup);
				if (shouldHighlight)
					groupHeaderItem.setAttribute("data-exceptional", "true");
				setHeaderStarIconVisible(groupHeaderItem, false);
				externalList.appendChild(groupHeaderItem);

				// destinations in this group
				let domainClass = groupCount % 2 ? "domain-odd" : "domain-even";
				for (let destination of destinationsForThisGroup) {
					let listitem = createListItemWithCheckbox(createRecipientLabel(destination));
					if (shouldHighlight) {
						listitem.setAttribute("data-exceptional", "true");
					}
					listitem.classList.add(domainClass);
					listitem.addEventListener("click", function() { updateCheckAllCheckBox(externalList); }, false);
					externalList.appendChild(listitem);
					recordItemInGroup(domainForThisGroup, listitem);
				}
			}
		}

		var exceptionalExternals = [];
		externals = externals.filter(function(destination) {
			var domain = AddressUtil.extractDomainFromAddress(destination);
			if (ExceptionManager.isExceptionalDomain(domain)) {
				exceptionalExternals.push(destination);
				return false;
			}
			return true;
		});
		if (exceptionalExternals.length)
			createExternalDomainsListItems(exceptionalExternals);
		createExternalDomainsListItems(externals);

		initCheckAllCheckboxFor(externalList);
	}

	function setupBodyField() {
		if (ConfirmMailDialog.requireCheckBody()) {
			var body = window.arguments[4];
			var field = document.getElementById("bodyField");
			(field.contentDocument.body || field.contentDocument.documentElement).appendChild(body);
		} else {
			var check = document.getElementById("checkbox_body");
			var box = document.getElementById("body");
			check.hidden = box.hidden = box.previousSibling.hidden = true;
		}
	}

	function setupAttachmentList(fileNames) {
		//attachments list
		var fileNamesList = document.getElementById("fileNamesList");

		var requireReinputFilename = DestinationManager.getExternalDestinationList().length > 0 &&
										ConfirmMailDialog.requireReinputAttachmentNames();
		var exceptionalItems = [];
		var normalItems = [];
		for (var i = 0; i < fileNames.length; i++) {
			let fileName = fileNames[i];
			let attachmentFileItem = createListItemWithCheckbox(fileName, {
				requireReinput: requireReinputFilename
			});
			attachmentFileItem.addEventListener("click", function() { updateCheckAllCheckBox(fileNamesList); }, false);
			if (ExceptionManager.fileHasExceptionalSuffix(fileName)) {
				attachmentFileItem.setAttribute("data-exceptional", "true");
				exceptionalItems.push(attachmentFileItem);
			} else {
				normalItems.push(attachmentFileItem);
			}
		}
		exceptionalItems.concat(normalItems).forEach(function(attachmentFileItem) {
			fileNamesList.appendChild(attachmentFileItem);
		});

		initCheckAllCheckboxFor(fileNamesList);
	}

	setupOKButton();
	setupInternalDestinationList(DestinationManager.getInternalDestinationList());
	setupExternalDomainList(DestinationManager.getExternalDestinationList());
	setupBodyField();
	setupAttachmentList(AttachmentManager.getAttachmentList());

	if (ConfirmMailDialog.highlightUnmatchedDomains())
		document.documentElement.classList.add("highlight-domains");
	else
		document.documentElement.classList.remove("highlight-domains");

	if (ConfirmMailDialog.largeFontSizeForAddresses())
		document.documentElement.classList.add("large-font-size-for-addresses");
	else
		document.documentElement.classList.remove("large-font-size-for-addresses");
}

// Util

var FilenameUtil = {
	extractSuffix: function (fileName) {
		if (/\.([^\.]*)$/.exec(fileName)) {
			return RegExp.$1;
		} else {
			return "";
		}
	}
};

var AddressUtil = {
	trim: function (string) {
		return (string || "").replace(/^[\s\u3000]+|[\s\u3000]+$/g, "");
	},

	extractDomainFromAddress: function (address) {
		if (address && typeof address != "string")
			address = address.address || "";
		return this.trim(address.split("@")[1]) || null;
	},

	destinationListToDomains: function (destinationList) {
		return destinationList
			.map(this.extractDomainFromAddress, this);
	},

	groupDestinationsByDomain: function (recipients) {
		var recipientGroups = {};			   // domain -> [recipients]

		for (var i = 0, len = recipients.length; i < len; ++i) {
			var recipient = recipients[i];
			var domain = this.extractDomainFromAddress(recipient.address);
			if (domain) {
				if (!recipientGroups[domain]) {
					recipientGroups[domain] = [];
				}
				recipientGroups[domain].push(recipient);
			}
		}

		return recipientGroups;
	}
};

// Manager

var AttachmentManager = {
	getAttachmentList: function () {
		return window.arguments[3] || [];
	},

	hasAttachments: function () {
		let attachments = this.getAttachmentList();
		if (!attachments)
			return false;
		return attachments.length > 0;
	}
};

var DestinationManager = {
	getInternalDestinationList: function () {
		return window.arguments[1];
	},

	getExternalDestinationList: function () {
		return window.arguments[2];
	},

	getExternalDomainList: function () {
		return AddressUtil.destinationListToDomains(
			DestinationManager.getExternalDestinationList()
		);
	}
};

var ExceptionManager = {
	PREF_DOMAINS : "net.nyail.tanabec.confirm-mail.exceptional-domains",
	PREF_SUFFIXES : "net.nyail.tanabec.confirm-mail.exceptional-suffixes",

	get prefs() {
		delete this.prefs;
		let { prefs } = Components.utils.import('resource://confirm-mail-modules/lib/prefs.js', {});
		return this.prefs = prefs;
	},
	getPref: function(name, defaultValue) {
		var value = this.prefs.getPref(name);
		return value === null ? defaultValue : value;
	},

	_splitToItems: function (list) {
		return list.replace(/^\s+|\s+$/g, '').split(/[,\s\|;]+/).filter(function(item) {
			return item;
		});
	},

	// Exceptional Domain

	get domains () {
		delete this.domains;
		var domains = this.getPref(this.PREF_DOMAINS) || "";
		return this.domains = this._splitToItems(domains.toLowerCase());
	},

	isExceptionalDomain: function (domain) {
		return !!domain && this.domains.indexOf(domain.toLowerCase()) >= 0;
	},

	// Exceptional Suffix

	get suffixes () {
		delete this.suffixes;
		var suffixes = this.getPref(this.PREF_SUFFIXES) || "";
		return this.suffixes = this._splitToItems(suffixes.toLowerCase()).map(function(suffix) {
			return suffix.replace(/^\*?\./g, '');
		});
	},

	isExceptionalSuffix: function (suffix) {
		return !!suffix && this.suffixes.indexOf(suffix.toLowerCase()) >= 0;
	},

	fileHasExceptionalSuffix: function (fileName) {
		return this.isExceptionalSuffix(FilenameUtil.extractSuffix(fileName));
	}
};

var maxTooltipTextLength = 60;
function foldLongTooltipText(text) {
	var folded = [];
	while (text.length > 0) {
		folded.push(text.substring(0, maxTooltipTextLength));
		text = text.substring(maxTooltipTextLength);
	}
	return folded.join("\n");
}

function createListItemWithCheckbox(itemLabel, aOptions) {
	aOptions = aOptions || {};
	var listitem = document.createElement("richlistitem");

	var checkboxCell = document.createElement("hbox");
	checkboxCell.classList.add("checkbox");
	var checkbox = document.createElement("checkbox");
	listitem.appendChild(checkboxCell);

	checkboxCell.appendChild(checkbox);
	let label = document.createElement("label");
	label.setAttribute("flex", 1);
	label.setAttribute("crop", "end");
	label.setAttribute("value", itemLabel);
	label.setAttribute("tooltiptext", foldLongTooltipText(itemLabel));
	listitem.appendChild(label);

	if (aOptions.requireReinput) {
		checkbox.setAttribute("disabled", true);
		let field = document.createElement("textbox");
		field.setAttribute("placeholder", getLocaleString("confirm.dialog.attachmentName.reinput.placeholder"));
		field.addEventListener("input", function(event) {
			checkbox.setAttribute("checked", event.target.value == itemLabel);
			checkAllChecked();
		}, false);
		field.onresize = function() {
			field.width = parseInt(window.outerWidth * 0.45);
		};
		window.addEventListener("resize", function() {
			field.onresize();
		});
		window.setTimeout(function(){
			field.onresize();
		}, 0);
		listitem.insertBefore(field, label);
	} else {
		listitem.setAttribute("tooltiptext", foldLongTooltipText(itemLabel));
		listitem.onclick = function(event){
			if (event.target.localName == "checkbox") {
				setTimeout(checkAllChecked, 0);
			} else {
				var checked = checkbox.checked;
				checkbox.setAttribute("checked", !checked);
				checkAllChecked();
			}
		};
	}

	return listitem;
}

function checkAllChecked(){
	//すべてのチェックボックスの状況確認
	var complete = true;
	var checkboxes = document.getElementsByTagName("checkbox");
	for(var i = 0; i < checkboxes.length; i++){
		var cb = checkboxes[i];
		if (cb.parentNode.classList.contains("check_all") ||
			cb.hidden)
			continue;
		// don't use element.checked, because it doesn't work on out of screen elements.
		if(cb.getAttribute("checked") != "true"){
			complete = false;
			break;
		}
	}

	//送信ボタンのdisable切り替え
	var okBtn = document.documentElement.getButton("accept");
	if(complete){
		okBtn.disabled = false;
	}else{
		okBtn.disabled = true;
	}
}

//[すべて確認]チェックボックスがONなら、すべての確認ボックスをONにする。

function switchCheckAllCheckBox(list){
	var caption = list.parentNode.querySelector("caption.check_all");
	if (caption.hidden)
		return;
	var checkAll = caption.querySelector("checkbox");
	var isChecked = checkAll.checked;
	var checkboxes = list.getElementsByTagName("checkbox");
	for(var i=0; i<checkboxes.length; i++){
		// don't use element.checked=true, because hidden (out of screen) elements are not checked.
		checkboxes[i].setAttribute("checked", isChecked);
	}

}

function updateCheckAllCheckBox(list){
	var caption = list.parentNode.querySelector("caption.check_all");
	if (caption.hidden)
		return;
	setTimeout(function() {
		var checkAll = caption.querySelector("checkbox");
		var allItems = list.querySelectorAll("checkbox");
		var checkedItems = list.querySelectorAll("checkbox[checked='true']");
		checkAll.setAttribute("checked", allItems.length === checkedItems.length);
	}, 0);
}

var ConfirmMailDialog = {
	get prefs() {
		delete this.prefs;
		let { prefs } = Components.utils.import('resource://confirm-mail-modules/lib/prefs.js', {});
		return this.prefs = prefs;
	},
	getPref: function(name, defaultValue) {
		var value = this.prefs.getPref(name);
		return value === null ? defaultValue : value;
	},

	getExceptionalRecipients: function () {
		if (!this.reconfirmForExceptionalOtherDomains())
			return [];

		return DestinationManager.getExternalDomainList()
			.filter(function (recipient) {
				var domain = AddressUtil.extractDomainFromAddress(recipient);
				return ExceptionManager.isExceptionalDomain(domain);
			});
	},

	getExceptionalAttachments: function () {
		if (!this.getPref(CA_CONST.EXCEPTIONAL_SUFFIXES_CONFIRM) ||
			!AttachmentManager.hasAttachments())
			return [];

		return AttachmentManager.getAttachmentList()
			.filter(function (attachment) {
				var suffix = FilenameUtil.extractSuffix(attachment);
				return ExceptionManager.isExceptionalSuffix(suffix);
			});
	},

	reconfirmForExceptionalOtherDomains: function () {
		return this.getPref(CA_CONST.EXCEPTIONAL_DOMAINS_ONLY_WITH_ATTACHMENT) &&
				AttachmentManager.hasAttachments();
	},

	highlightExceptionalOtherDomains: function () {
		return this.getPref(CA_CONST.EXCEPTIONAL_DOMAINS_HIGHLIGHT) ||
				this.reconfirmForExceptionalOtherDomains();
	},

	requireCheckBody: function () {
		return this.getPref(CA_CONST.REQUIRE_CHECK_BODY);
	},

	requireReinputAttachmentNames: function () {
		return this.getPref(CA_CONST.REQUIRE_REINPUT_ATTACHMENT_NAMES);
	},

	highlightUnmatchedDomains: function () {
		return this.getPref(CA_CONST.HIGHLIGHT_UNMATCHED_DOMAINS);
	},

	largeFontSizeForAddresses: function() {
		return this.getPref(CA_CONST.LARGE_FONT_SIZE_FOR_ADDRESSES);
	},

	confirmExceptionalDomains: function (exceptions) {
		return this.confirm("exceptionalDomain", exceptions);
	},

	confirmExceptionalSuffixes: function (exceptions) {
		return this.confirm("exceptionalSuffix", exceptions);
	},

	confirm: function (messageType, exceptions) {
		let promptService = Components.classes["@mozilla.org/embedcomp/prompt-service;1"]
			.getService(Components.interfaces.nsIPromptService);
		let flags = (promptService.BUTTON_TITLE_IS_STRING * promptService.BUTTON_POS_0)
			+ (promptService.BUTTON_TITLE_CANCEL * promptService.BUTTON_POS_1);

		// force resize to contents, because window can be smaller than contents with too long CJK text.
		const WW = Components.classes["@mozilla.org/embedcomp/window-watcher;1"]
			.getService(Components.interfaces.nsIWindowWatcher);
		const listener = {
			observe(subject, topic, data) {
				if (topic != "domwindowopened")
					return;
				const window = subject.QueryInterface(Components.interfaces.nsIDOMWindow);
				window.addEventListener("load", function onLoad() {
					window.removeEventListener("load", onLoad, false);
					if (window.location.href != "chrome://global/content/commonDialog.xul")
						return;
					WW.unregisterNotification(listener);
					window.setTimeout(function() {
						const newHeight = window.document.documentElement.boxObject.height + (window.outerHeight - window.innerHeight);
						if (newHeight > window.outerHeight * 1.05)
							window.resizeTo(window.outerWidth, newHeight);
					}, 150);
				}, false);
			}
		};
		WW.registerNotification(listener);

		return promptService.confirmEx(window,
			this.prefs.getLocalizedPref("net.nyail.tanabec.confirm-mail." + messageType + ".title"),
			this.prefs.getLocalizedPref("net.nyail.tanabec.confirm-mail." + messageType + ".message")
				.replace(/\%s/i, exceptions),
			flags,
			getLocaleString("confirm.dialog.acceptbtn.label"),
			"",
			"",
			null,
			{}
		) === 0;
	}
};

function doOK(){
	let recipients = ConfirmMailDialog.getExceptionalRecipients();
	if (recipients.length > 0) {
		if (!ConfirmMailDialog.confirmExceptionalDomains(recipients.join('\n'))) {
			return false;
		}
	}

	let attachments = ConfirmMailDialog.getExceptionalAttachments();
	if (attachments.length > 0) {
		if (!ConfirmMailDialog.confirmExceptionalSuffixes(attachments.join('\n'))) {
			return false;
		}
	}

	var extraChecker = window.arguments[5];
	if (typeof extraChecker === 'function' &&
		!extraChecker(window))
		return true;

	var parentWindow = window.arguments[0];
	parentWindow.confmail_confirmOK = true;
	return true;
}

function doCancel(){

	var parentWindow = window.arguments[0];
	parentWindow.confmail_confirmOK = false;
	return true;
}
