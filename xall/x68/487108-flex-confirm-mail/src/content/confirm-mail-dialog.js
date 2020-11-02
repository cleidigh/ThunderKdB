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
	var bundle = document.getElementById("strings");
	if (arguments.length > 1 && parameters.length)
		return bundle.getFormattedString(id, parameters);
	return bundle.getString(id);
}

function startup() {
	function setupOKButton() {
		var okBtn = document.documentElement.getButton("accept");
		okBtn.disabled = true;
		// set button label
		var strbundle = document.getElementById("strings");
		var BtnLabel = strbundle.getString("confirm.dialog.acceptbtn.label");
		okBtn.label = BtnLabel;
	}

	function initCheckAllCheckboxFor(list) {
		var checkAllCaption = list.parentNode.querySelector('.check_all');
		var checkEachCaption = list.parentNode.querySelector('.check_each');
		var key = 'net.nyail.tanabec.confirm-mail.allowCheckAll.' + list.parentNode.id;
		checkAllCaption.hidden = !ConfirmMailDialog.getPref(key) && !ConfirmMailDialog.getPref(key + '.always');
		checkEachCaption.hidden = !checkAllCaption.hidden;
		if (checkAllCaption.hidden)
			return;
		var checkAllCheckbox = checkAllCaption;
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
			var listitem = createListItemWithCheckbox(internals[i]);
			listitem.addEventListener("click", function() { updateCheckAllCheckBox(internalList); }, false);
			internalList.appendChild(listitem);
		}

		initCheckAllCheckboxFor(internalList);
	}

	function setupExternalDomainList(externals) {
		function createGroupHeader(domain) {
			var headerItem = document.createXULElement("richlistitem");
			headerItem.setAttribute("class", "confirm-mail-list-separator");
			headerItem.setAttribute("data-domain-name", domain);
			var headerLabelItem = document.createXULElement("label");
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

		const externalGroupAllCheck = document.querySelector("#otherDomains .check_all");
		externalGroupAllCheck.addEventListener("command", function (event) {
			setTimeout(() => {
				for (const groupHeaderItem of document.querySelectorAll("#otherDomains .confirm-mail-list-separator")) {
					const groupDomain = groupHeaderItem.getAttribute("data-domain-name");
					setHeaderStarIconVisible(
						groupHeaderItem,
						isGroupAllChecked(groupDomain)
					);
				}
			}, 100);
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
					let listitem = createListItemWithCheckbox(destination);
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

    function setupSubject() {
		var checkbox = document.getElementById("subjectCheck");
		if (ConfirmMailDialog.requireCheckSubject()) {
			var subject = window.arguments[5];
			var strbundle = document.getElementById("strings");
			var label = strbundle.getFormattedString("confirm.dialog.subject.label", [subject]);
			checkbox.setAttribute("label", label);
			checkbox.hidden = false;
			return true;
		}
		else {
			checkbox.hidden = true;
			return false;
		}
	}

	function setupBodyField() {
		var check = document.getElementById("checkbox_body");
		var box = document.getElementById("body");
		if (ConfirmMailDialog.requireCheckBody()) {
			var body = window.arguments[4];
			var field = document.getElementById("bodyField");
			(field.contentDocument.body || field.contentDocument.documentElement).appendChild(body);
			check.hidden = box.hidden = box.previousSibling.hidden = false;
			return true;
		} else {
			check.hidden = box.hidden = box.previousSibling.hidden = true;
			return false;
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
			if (ExceptionManager.fileHasExceptionalSuffix(fileName) ||
				ExceptionManager.fileHasExceptionalTerm(fileName)) {
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

	let subjectIsVisible = setupSubject();
	let bodyIsVisible = setupBodyField();
	document.getElementById('bodySeparator').setAttribute('hidden', !subjectIsVisible && !bodyIsVisible);
	document.getElementById('bodyContainer').setAttribute('hidden', !subjectIsVisible && !bodyIsVisible);

	setupAttachmentList(AttachmentManager.getAttachmentList());

	if (ConfirmMailDialog.highlightUnmatchedDomains())
		document.documentElement.classList.add("highlight-domains");
	else
		document.documentElement.classList.remove("highlight-domains");

	if (ConfirmMailDialog.largeFontSizeForAddresses())
		document.documentElement.classList.add("large-font-size-for-addresses");
	else
		document.documentElement.classList.remove("large-font-size-for-addresses");

	if (ConfirmMailDialog.emphasizeTopMessage())
		document.documentElement.classList.add("emphasize-top-message");
	else
		document.documentElement.classList.remove("emphasize-top-message");

	if (ConfirmMailDialog.emphasizeRecipientType())
		document.documentElement.classList.add("emphasize-recipient-type");
	else
		document.documentElement.classList.remove("emphasize-recipient-type");

	document.getElementById("top-message").textContent = ConfirmMailDialog.prefs.getLocalizedPref("net.nyail.tanabec.confirm-mail.topMessage");
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
	},

	getMultipleRecipientDomains: function () {
		var domains = new Set();
		for (const recipient of this.getExternalDestinationList()) {
			if (recipient.type != 'Bcc')
				domains.add(AddressUtil.extractDomainFromAddress(recipient.address));
		}
		return Array.from(domains);
	}
};

var ExceptionManager = {
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

	readFile: function(path, encoding) {
		if (path in this.cachedFileContents)
			return this.cachedFileContents[path];

		const file = Cc['@mozilla.org/file/local;1'].createInstance(Ci.nsIFile);
		file.initWithPath(path);
		if (!file.exists())
			throw new Error(file.path + ' does not exist.');

		const stream = Cc['@mozilla.org/network/file-input-stream;1']
				.createInstance(Ci.nsIFileInputStream);
		stream.init(file, 1, 0, false); // open as "read only"

		let fileContents = null;
		try {
			if (encoding) {
				const converterStream = Cc['@mozilla.org/intl/converter-input-stream;1']
						.createInstance(Ci.nsIConverterInputStream);
				const buffer = stream.available();
				converterStream.init(stream, encoding, buffer,
					converterStream.DEFAULT_REPLACEMENT_CHARACTER);
				const out = { value : null };
				converterStream.readString(stream.available(), out);
				converterStream.close();
				fileContents = out.value;
			}
			else {
				const scriptableStream = Cc['@mozilla.org/scriptableinputstream;1']
						.createInstance(Ci.nsIScriptableInputStream);
				scriptableStream.init(stream);
				fileContents = scriptableStream.read(scriptableStream.available());
				scriptableStream.close();
			}
		}
		catch (error) {
			throw error;
		}
		finally {
			stream.close();
		}

		return this.cachedFileContents[path] = fileContents;
	},
	cachedFileContents: {},

	// Exceptional Domain

	get domains () {
		delete this.domains;
		let domains;
		if (this.getPref(CA_CONST.EXCEPTIONAL_DOMAINS_SOURCE) == "file") {
			try {
				domains = this.readFile(this.getPref(CA_CONST.EXCEPTIONAL_DOMAINS_FILE)) || "";
			}
			catch(e) {
				domains = "";
			}
		}
		else {
			domains = this.getPref(CA_CONST.EXCEPTIONAL_DOMAINS) || "";
		}
		return this.domains = this._splitToItems(domains.toLowerCase());
	},

	isExceptionalDomain: function (domain) {
		return !!domain && this.domains.indexOf(domain.toLowerCase()) >= 0;
	},

	// Exceptional Suffix

	get suffixes () {
		delete this.suffixes;
		let suffixes;
		if (this.getPref(CA_CONST.EXCEPTIONAL_SUFFIXES_SOURCE) == "file") {
			try {
				suffixes = this.readFile(this.getPref(CA_CONST.EXCEPTIONAL_SUFFIXES_FILE)) || "";
			}
			catch(e) {
				suffixes = "";
			}
		}
		else {
			suffixes = this.getPref(CA_CONST.EXCEPTIONAL_SUFFIXES) || "";
		}
		return this.suffixes = this._splitToItems(suffixes.toLowerCase()).map(function(suffix) {
			return suffix.replace(/^\*?\./g, '');
		});
	},

	isExceptionalSuffix: function (suffix) {
		return !!suffix && this.suffixes.indexOf(suffix.toLowerCase()) >= 0;
	},

	fileHasExceptionalSuffix: function (fileName) {
		return this.isExceptionalSuffix(FilenameUtil.extractSuffix(fileName));
	},

	// Exceptional Term

	get terms () {
		delete this.terms;
		let terms;
		if (this.getPref(CA_CONST.EXCEPTIONAL_TERMS_SOURCE) == "file") {
			try {
				terms = this.readFile(this.getPref(CA_CONST.EXCEPTIONAL_TERMS_FILE), "UTF-8") || "";
			}
			catch(e) {
				terms = "";
			}
		}
		else {
			terms = this.getPref(CA_CONST.EXCEPTIONAL_TERMS) || "";
		}
		return this.terms = this._splitToItems(terms.toLowerCase()).map(function(term) {
			return term.replace(/^\*?\./g, '');
		});
	},

	fileHasExceptionalTerm: function (fileName) {
		fileName = fileName.toLowerCase();
		return this.terms.some(function (term) {
			return fileName.indexOf(term) > -1;
		});
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

function createListItemWithCheckbox(recipientOrLabel, aOptions) {
	aOptions = aOptions || {};
	var listitem = document.createXULElement("richlistitem");

	var checkboxCell = document.createXULElement("hbox");
	checkboxCell.classList.add("checkbox");
	var checkbox = document.createXULElement("checkbox");
	listitem.appendChild(checkboxCell);

	checkboxCell.appendChild(checkbox);

	let itemLabel = recipientOrLabel;
	let itemTooltip = itemLabel;
	if (typeof itemLabel != 'string') {
		const recipient = recipientOrLabel;
		if (recipient.name && recipient.name != recipient.address)
			itemLabel = recipient.name + " <" + recipient.address + ">";
		else
			itemLabel = recipient.fullName || recipient.address;

		itemTooltip = recipient.type + ": " + itemLabel;

		let typeCell = document.createXULElement("label");
		typeCell.classList.add("type");
		typeCell.setAttribute("value", recipient.type + ":");
		typeCell.setAttribute("tooltiptext", itemTooltip);
		listitem.appendChild(typeCell);
	}

	itemTooltip = foldLongTooltipText(itemTooltip);

	let label = document.createXULElement("label");
	label.classList.add("address");
	label.setAttribute("flex", 1);
	label.setAttribute("crop", "end");
	label.setAttribute("value", itemLabel);
	label.setAttribute("tooltiptext", itemTooltip);
	listitem.appendChild(label);

	if (aOptions.requireReinput) {
		checkbox.setAttribute("disabled", true);
		let field = document.createXULElement("textbox");
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
		listitem.setAttribute("tooltiptext", itemTooltip);
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
		if (cb.closest(".check_all") ||
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
	var caption = list.parentNode.querySelector(".check_all");
	if (caption.hidden)
		return;
	var checkAll = caption;
	var isChecked = checkAll.checked;
	var checkboxes = list.getElementsByTagName("checkbox");
	for(var i=0; i<checkboxes.length; i++){
		// don't use element.checked=true, because hidden (out of screen) elements are not checked.
		checkboxes[i].setAttribute("checked", isChecked);
	}

}

function updateCheckAllCheckBox(list){
	var caption = list.parentNode.querySelector(".check_all");
	if (caption.hidden)
		return;
	setTimeout(function() {
		var checkAll = caption;
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

		return DestinationManager.getExternalDestinationList()
			.filter(function (recipient) {
				var domain = AddressUtil.extractDomainFromAddress(recipient);
				return ExceptionManager.isExceptionalDomain(domain);
			})
			.map(address => address.address || address);
	},

	getExceptionalSuffixAttachments: function () {
		if (!this.getPref(CA_CONST.EXCEPTIONAL_SUFFIXES_CONFIRM) ||
			!AttachmentManager.hasAttachments())
			return [];

		return AttachmentManager.getAttachmentList()
			.filter(function (attachment) {
				const suffix = FilenameUtil.extractSuffix(attachment);
				return ExceptionManager.isExceptionalSuffix(suffix);
			});
	},

	getExceptionalTermAttachments: function () {
		if (!this.getPref(CA_CONST.EXCEPTIONAL_TERMS_CONFIRM) ||
			!AttachmentManager.hasAttachments())
			return [];

		return AttachmentManager.getAttachmentList()
			.filter(function (attachment) {
				return ExceptionManager.fileHasExceptionalTerm(attachment);
			});
	},

	reconfirmForExceptionalOtherDomains: function () {
		const confirmationMode = this.getPref(CA_CONST.EXCEPTIONAL_DOMAINS_CONFIRM);
		return confirmationMode == 1 ||
				(confirmationMode == 2 && AttachmentManager.hasAttachments());
	},

	highlightExceptionalOtherDomains: function () {
		const highlightMode = this.getPref(CA_CONST.EXCEPTIONAL_DOMAINS_HIGHLIGHT);
		return highlightMode == 1 ||
				(highlightMode == 2 && AttachmentManager.hasAttachments());
	},

	requireCheckSubject: function () {
		return this.getPref(CA_CONST.REQUIRE_CHECK_SUBJECT);
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

	emphasizeTopMessage: function() {
		return this.getPref(CA_CONST.EMPHASIZE_TOP_MESSAGE);
	},

	emphasizeRecipientType: function() {
		return this.getPref(CA_CONST.EMPHASIZE_RECIPIENT_TYPE);
	},

	confirmExceptionalDomains: function (exceptions) {
		return this.confirm("exceptionalDomain", exceptions);
	},

	confirmExceptionalSuffixes: function (exceptions) {
		return this.confirm("exceptionalSuffix", exceptions);
	},

	confirmExceptionalTerms: function (exceptions) {
		return this.confirm("exceptionalTerm", exceptions);
	},

	confirmMultipleRecipientDomains: function () {
		const shouldConfirm = this.getPref(CA_CONST.CONFIRM_MULTIPLE_RECIPIENT_DOMAINS);
		if (!shouldConfirm)
			return true;
		let domains = DestinationManager.getMultipleRecipientDomains();
		if (domains.length <= 1)
			return true;
		if (domains.length > 11)
			domains = [...domains.slice(0, 5), '...', ...domains.slice(-5)];
		return this.confirm("confirmMultipleRecipientDomains", domains.join('\n'));
	},

	confirm: function (messageType, params) {
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

		let  message = this.prefs.getLocalizedPref("net.nyail.tanabec.confirm-mail." + messageType + ".message");
		if (typeof params != 'undefined')
			message = message.replace(/\%s/i, params);

		return promptService.confirmEx(window,
			this.prefs.getLocalizedPref("net.nyail.tanabec.confirm-mail." + messageType + ".title"),
			message,
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
	if (!ConfirmMailDialog.confirmMultipleRecipientDomains()) {
		return false;
	}

	let recipients = ConfirmMailDialog.getExceptionalRecipients();
	if (recipients.length > 0) {
		if (!ConfirmMailDialog.confirmExceptionalDomains(recipients.join('\n'))) {
			return false;
		}
	}

	let attachments = ConfirmMailDialog.getExceptionalSuffixAttachments();
	if (attachments.length > 0) {
		if (!ConfirmMailDialog.confirmExceptionalSuffixes(attachments.join('\n'))) {
			return false;
		}
	}

	attachments = ConfirmMailDialog.getExceptionalTermAttachments();
	if (attachments.length > 0) {
		if (!ConfirmMailDialog.confirmExceptionalTerms(attachments.join('\n'))) {
			return false;
		}
	}

	var extraChecker = window.arguments[6];
	if (typeof extraChecker === 'function' &&
		!extraChecker(window))
		return true;

	const onConfirmed = window.arguments[0];
	onConfirmed();
	return true;
}

function doCancel(){
	return true;
}

document.documentElement.addEventListener("dialogaccept", doOK);
document.documentElement.addEventListener("dialogcancel", doCancel);


// Workaround for an odd bug: Thunderbird fails to load splitter.css on the initial loading, so we need to load it manually with delay.
window.addEventListener('load', () => {
	window.setTimeout(() => {
		const pi = document.createProcessingInstruction('xml-stylesheet', 'href="chrome://global/skin/splitter.css" type="text/css"');
		document.insertBefore(pi, document.firstChild);
	}, 100);
}, { once: true });
