/* "The contents of this file are subject to the Mozilla Public Licenske
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

var CA_CONST = {
	INTERNAL_DOMAINS : "net.nyail.tanabec.confirm-mail.domain-list",
	ENABLE_CONFIRMATION : "net.nyail.tanabec.confirm-mail.confirmation.mode",
	ALLOW_SKIP_CONFIRMATION : "net.nyail.tanabec.confirm-mail.not-display",
	ENABLE_COUNTDOWN : "net.nyail.tanabec.confirm-mail.is-countdown",
	COUNT_DOWN_TIME : "net.nyail.tanabec.confirm-mail.countdown.time",
	COUNT_DOWN_TIME_OLD : "net.nyail.tanabec.confirm-mail.cd-time",
	MIN_RECIPIENTS_COUNT : "net.nyail.tanabec.confirm-mail.min-recipients-count",
	COUNT_DOWN_ALLOW_SKIP : "net.nyail.tanabec.confirm-mail.countdown.allowSkip",
	COUNT_DOWN_ALLOW_SKIP_ALWAYS : "net.nyail.tanabec.confirm-mail.countdown.allowSkip.always",
	CONFIRM_MULTIPLE_RECIPIENT_DOMAINS: "net.nyail.tanabec.confirm-mail.confirmMultipleRecipientDomains",
	CONFIRM_MULTIPLE_RECIPIENT_DOMAINS_ALWAYS: "net.nyail.tanabec.confirm-mail.confirmMultipleRecipientDomains.always",
	ALWAYS_LARGE_DIALOG : "net.nyail.tanabec.confirm-mail.alwaysLargeDialog",
	ALWAYS_LARGE_DIALOG_MIN_WIDTH : "net.nyail.tanabec.confirm-mail.alwaysLargeDialog.minWidth",
	ALWAYS_LARGE_DIALOG_ALWAYS : "net.nyail.tanabec.confirm-mail.alwaysLargeDialog.always",
	HIGHLIGHT_UNMATCHED_DOMAINS : "net.nyail.tanabec.confirm-mail.highlightUnmatchedDomains",
	HIGHLIGHT_UNMATCHED_DOMAINS_ALWAYS : "net.nyail.tanabec.confirm-mail.highlightUnmatchedDomains.always",
	LARGE_FONT_SIZE_FOR_ADDRESSES : "net.nyail.tanabec.confirm-mail.largeFontSizeForAddresses",
	LARGE_FONT_SIZE_FOR_ADDRESSES_ALWAYS : "net.nyail.tanabec.confirm-mail.largeFontSizeForAddresses.always",
	EMPHASIZE_TOP_MESSAGE: "net.nyail.tanabec.confirm-mail.emphasizeTopMessage",
	EMPHASIZE_TOP_MESSAGE_ALWAYS : "net.nyail.tanabec.confirm-mail.emphasizeTopMessage.always",
	TOP_MESSAGE : "net.nyail.tanabec.confirm-mail.topMessage",
	EMPHASIZE_RECIPIENT_TYPE: "net.nyail.tanabec.confirm-mail.emphasizeRecipientType",
	EMPHASIZE_RECIPIENT_TYPE_ALWAYS : "net.nyail.tanabec.confirm-mail.emphasizeRecipientType.always",
	EXCEPTIONAL_DOMAINS_HIGHLIGHT : "net.nyail.tanabec.confirm-mail.exceptional-domains.highlight.mode",
	EXCEPTIONAL_DOMAINS_CONFIRM : "net.nyail.tanabec.confirm-mail.exceptional-domains.confirmation.mode",
	EXCEPTIONAL_DOMAINS : "net.nyail.tanabec.confirm-mail.exceptional-domains",
	EXCEPTIONAL_DOMAINS_SOURCE : "net.nyail.tanabec.confirm-mail.exceptional-domains.source",
	EXCEPTIONAL_DOMAINS_FILE : "net.nyail.tanabec.confirm-mail.exceptional-domains.file",
	EXCEPTIONAL_SUFFIXES_CONFIRM : "net.nyail.tanabec.confirm-mail.exceptional-suffixes.confirm",
	EXCEPTIONAL_SUFFIXES : "net.nyail.tanabec.confirm-mail.exceptional-suffixes",
	EXCEPTIONAL_SUFFIXES_SOURCE : "net.nyail.tanabec.confirm-mail.exceptional-suffixes.source",
	EXCEPTIONAL_SUFFIXES_FILE : "net.nyail.tanabec.confirm-mail.exceptional-suffixes.file",
	EXCEPTIONAL_TERMS_CONFIRM : "net.nyail.tanabec.confirm-mail.exceptional-terms.confirm",
	EXCEPTIONAL_TERMS : "net.nyail.tanabec.confirm-mail.exceptional-terms",
	EXCEPTIONAL_TERMS_SOURCE : "net.nyail.tanabec.confirm-mail.exceptional-terms.source",
	EXCEPTIONAL_TERMS_FILE : "net.nyail.tanabec.confirm-mail.exceptional-terms.file",
	REQUIRE_CHECK_SUBJECT : "net.nyail.tanabec.confirm-mail.requireCheckSubject",
	REQUIRE_CHECK_SUBJECT_ALWAYS : "net.nyail.tanabec.confirm-mail.requireCheckSubject.always",
	REQUIRE_CHECK_BODY : "net.nyail.tanabec.confirm-mail.requireCheckBody",
	REQUIRE_CHECK_BODY_ALWAYS : "net.nyail.tanabec.confirm-mail.requireCheckBody.always",
	REQUIRE_REINPUT_ATTACHMENT_NAMES : "net.nyail.tanabec.confirm-mail.requireReinputAttachmentNames",
	ALLOW_CHECK_ALL_INTERNALS : "net.nyail.tanabec.confirm-mail.allowCheckAll.yourDomains",
	ALLOW_CHECK_ALL_INTERNALS_ALWAYS : "net.nyail.tanabec.confirm-mail.allowCheckAll.yourDomains.always",
	ALLOW_CHECK_ALL_EXTERNALS : "net.nyail.tanabec.confirm-mail.allowCheckAll.otherDomains",
	ALLOW_CHECK_ALL_EXTERNALS_ALWAYS : "net.nyail.tanabec.confirm-mail.allowCheckAll.otherDomains.always",
	ALLOW_CHECK_ALL_ATTACHMENTS : "net.nyail.tanabec.confirm-mail.allowCheckAll.fileNames",
	ALLOW_CHECK_ALL_ATTACHMENTS_ALWAYS : "net.nyail.tanabec.confirm-mail.allowCheckAll.fileNames.always",
	OVERRIDE_DELAY : "net.nyail.tanabec.confirm-mail.overrideDelay",
	OVERRIDE_DELAY_TIMES : "net.nyail.tanabec.confirm-mail.overrideDelayTimes"
};
