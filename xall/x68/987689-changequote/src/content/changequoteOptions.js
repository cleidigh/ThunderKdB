 function CQprefsIn()  {
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	var headerstype = prefs.getIntPref("changequote.headers.type");
	var replyformattype= prefs.getIntPref("changequote.replyformat.format");
	if (replyformattype > 2) replyformattype = 0;
	if (headerstype == 1)
		document.getElementById("headersGroup").selectedItem = document.getElementById("CQradio2");
	else if (headerstype == 2)
		document.getElementById("headersGroup").selectedItem = document.getElementById("CQradio3");
	else 
		document.getElementById("headersGroup").selectedItem = document.getElementById("CQradio1");
	document.getElementById("CQradio1checkbox").checked = prefs.getBoolPref("changequote.headers.withcc"); 
	document.getElementById("CQradio1checkbox").disabled = ! (document.getElementById("CQradio1").selected);
	document.getElementById("CQradio1checkbox2").checked = prefs.getBoolPref("changequote.headers.english"); 
	document.getElementById("CQradio1checkbox2").disabled = ! (document.getElementById("CQradio1").selected);
	document.getElementById("CQradio1checkbox3").checked = prefs.getBoolPref("changequote.headers.date_long"); 
	document.getElementById("CQradio1checkbox3").disabled = ! (document.getElementById("CQradio1").selected);
	document.getElementById("CQnewsCheckbox").checked = prefs.getBoolPref("changequote.set.headers.news"); 
	document.getElementById("CQoption2").checked = prefs.getBoolPref("changequote.replyformat.enable");
	if (String.trim) 
		document.getElementById("CQoption3").collapsed = true;
	else
		document.getElementById("CQoption3").checked = prefs.getBoolPref("changequote.reply.without_inline_images");
	document.getElementById("CQoption4").checked = prefs.getBoolPref("changequote.window.close_after_reply");
	document.getElementById("CQoption5").checked = prefs.getBoolPref("changequote.message.markread_after_reply");
	document.getElementById("dateLongRadioGroup").selectedIndex = prefs.getIntPref("changequote.headers.date_long_format");
	
	document.getElementById("AlternativePref").selectedIndex = replyformattype;

	document.getElementById("CQnewsCheckbox").checked = prefs.getBoolPref("changequote.set.headers.news");

	var head = prefs.getStringPref("changequote.headers.customized");
	head = head.replace(/\[\[/g, "<");
	head = head.replace(/\]\]/g, ">");
	document.getElementById("CHbox").value = head;

	head = prefs.getStringPref("changequote.headers.news.customized");
	head = head.replace(/\[\[/g, "<");
	head = head.replace(/\]\]/g, ">");	
	document.getElementById("CHbox-news").value = head;

	document.getElementById("dateCustomBox").value = prefs.getCharPref("changequote.headers.date_custom_format");
	document.getElementById("dateCustomBoxUTC").value = prefs.getCharPref("changequote.headers.dateSender_custom_format");
	document.getElementById("CQadd_newline").checked = prefs.getBoolPref("changequote.headers.add_newline");	
	document.getElementById("CQcapitalize_date").checked = prefs.getBoolPref("changequote.headers.capitalize_date");
	document.getElementById("CQhtml_support").checked = prefs.getBoolPref("changequote.headers.custom_html_enabled");
	document.getElementById("CQradio1BOLD").checked = prefs.getBoolPref("changequote.headers.label_bold");
	document.getElementById("CQhtml_news_support").checked =  prefs.getBoolPref("changequote.headers.custom_news_html_enabled");

	InitCheckBox();
	checkboxcheck3();
}

document.addEventListener("dialogaccept", CQprefsOut );
  
function CQprefsOut()  {
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
	if (document.getElementById("CQradio1").selected) 
		prefs.setIntPref("changequote.headers.type", 0);
	else if (document.getElementById("CQradio2").selected) {
		prefs.setIntPref("changequote.headers.type", 1);
		standardHeader(null);
	}
	else if (document.getElementById("CQradio3").selected) {
		if (prefs.getIntPref("changequote.headers.type") != 2) 
			standardHeader(null);
		prefs.setIntPref("changequote.headers.type", 2);
	}
	prefs.setBoolPref("changequote.headers.withcc", document.getElementById("CQradio1checkbox").checked);
	prefs.setBoolPref("changequote.headers.english", document.getElementById("CQradio1checkbox2").checked);
	prefs.setBoolPref("changequote.headers.date_long", document.getElementById("CQradio1checkbox3").checked);
	prefs.setBoolPref("changequote.set.headers.news", document.getElementById("CQnewsCheckbox").checked);
 	prefs.setBoolPref("changequote.replyformat.enable", document.getElementById("CQoption2").checked);
	prefs.setBoolPref("changequote.reply.without_inline_images", document.getElementById("CQoption3").checked);
	prefs.setBoolPref("changequote.window.close_after_reply", document.getElementById("CQoption4").checked);
	prefs.setBoolPref("changequote.message.markread_after_reply", document.getElementById("CQoption5").checked);
	prefs.setIntPref("changequote.replyformat.format", document.getElementById("AlternativePref").selectedIndex);
	prefs.setIntPref("changequote.headers.date_long_format", document.getElementById("dateLongRadioGroup").selectedIndex);
	
	prefs.setBoolPref("changequote.set.headers.news", document.getElementById("CQnewsCheckbox").checked);


	var str = Components.classes["@mozilla.org/supports-string;1"].createInstance(Components.interfaces.nsISupportsString);
	var head = document.getElementById("CHbox").value;
	if (document.getElementById("CQhtml_support").checked) 
		head = head.replace(/<([^>]+)>/g, "[[$1]]");
	str.data  = head;
	prefs.setStringPref("changequote.headers.customized", str);
	
	head = document.getElementById("CHbox-news").value;
	if (document.getElementById("CQhtml_news_support").checked) 
		head = head.replace(/<([^>]+)>/g, "[[$1]]");
	str.data  = head;
	prefs.setStringPref("changequote.headers.news.customized", str);

	prefs.setCharPref("changequote.headers.date_custom_format", document.getElementById("dateCustomBox").value);
	prefs.setCharPref("changequote.headers.dateSender_custom_format", document.getElementById("dateCustomBoxUTC").value);
	prefs.setBoolPref("changequote.headers.add_newline", document.getElementById("CQadd_newline").checked);
	prefs.setBoolPref("changequote.headers.capitalize_date", document.getElementById("CQcapitalize_date").checked);
	prefs.setBoolPref("changequote.headers.custom_html_enabled", document.getElementById("CQhtml_support").checked);
	prefs.setBoolPref("changequote.headers.custom_news_html_enabled", document.getElementById("CQhtml_news_support").checked);
	prefs.setBoolPref("changequote.headers.label_bold", document.getElementById("CQradio1BOLD").checked);
} 

function toggleCustomizedBox() {
	document.getElementById("CQradio1checkbox3").removeAttribute("disabled");
	toggleLongDate();
	document.getElementById("CHbox").removeAttribute("disabled");
	document.getElementById("CQadd_newline").removeAttribute("disabled");
	document.getElementById("CQradio1checkbox").setAttribute("disabled", "true");
	document.getElementById("CQradio1checkbox2").setAttribute("disabled", "true");
	document.getElementById("CQradio1BOLD").setAttribute("disabled", "true");
	document.getElementById("CQhtml_support").removeAttribute("disabled");
}

function toggleStandard() {
	document.getElementById("CHbox").setAttribute("disabled", "true");
	document.getElementById("CQradio1checkbox3").setAttribute("disabled", "true");
	document.getElementById("CQdatelongINT").setAttribute("disabled", "true");
	document.getElementById("CQdatelocalized").setAttribute("disabled", "true");
	document.getElementById("CQdateorig").setAttribute("disabled", "true");
	document.getElementById("CQdatecustom").setAttribute("disabled", "true");
	document.getElementById("CQcapitalize_date").setAttribute("disabled", "true");
	document.getElementById("CQradio1checkbox").setAttribute("disabled", "true");
	document.getElementById("CQradio1checkbox2").setAttribute("disabled", "true");
	document.getElementById("CQadd_newline").setAttribute("disabled", "true");
	document.getElementById("CQradio1BOLD").setAttribute("disabled", "true");
	document.getElementById("CQhtml_support").setAttribute("disabled", "true");
}

function toggleLongDate() {
	if (document.getElementById("CQradio1checkbox3").checked) {
		document.getElementById("CQdatelongINT").removeAttribute("disabled");
		document.getElementById("CQdatelocalized").removeAttribute("disabled");
		document.getElementById("CQdateorig").removeAttribute("disabled");
		document.getElementById("CQdatecustom").removeAttribute("disabled");
		document.getElementById("CQcapitalize_date").removeAttribute("disabled");
	}
	else {
		document.getElementById("CQdatelongINT").setAttribute("disabled", "true");
		document.getElementById("CQdatelocalized").setAttribute("disabled", "true");
		document.getElementById("CQdateorig").setAttribute("disabled", "true");
		document.getElementById("CQdatecustom").setAttribute("disabled", "true");
		document.getElementById("CQcapitalize_date").setAttribute("disabled", "true");
	}
}
	

function toggleExt() {
	document.getElementById("CHbox").setAttribute("disabled", "true");
	document.getElementById("CQadd_newline").setAttribute("disabled", "true");
	document.getElementById("CQradio1checkbox3").removeAttribute("disabled");
	document.getElementById("CQradio1checkbox").removeAttribute("disabled");
	document.getElementById("CQradio1checkbox2").removeAttribute("disabled");
	document.getElementById("CQradio1BOLD").removeAttribute("disabled");
	document.getElementById("CQhtml_support").setAttribute("disabled", "true");
	toggleLongDate();
}

function InitCheckBox() {
	if (document.getElementById("CQradio2").selected)
		toggleStandard();
	else if (document.getElementById("CQradio3").selected)
		toggleCustomizedBox();
	else
		toggleExt();
			
	if (document.getElementById("CQnewsCheckbox").checked)
		document.getElementById("CHbox-news").removeAttribute("disabled");
	else	
		document.getElementById("CHbox-news").setAttribute("disabled", "true");	
}

function checkboxcheck3() {
	if (document.getElementById("CQoption2").checked) {
		document.getElementById("CQradio2default").removeAttribute("disabled");
		document.getElementById("CQradio2html").removeAttribute("disabled");
		document.getElementById("CQradio2plain").removeAttribute("disabled");
	}
	else {
		document.getElementById("CQradio2default").setAttribute("disabled", "true");
		document.getElementById("CQradio2html").setAttribute("disabled", "true");
		document.getElementById("CQradio2plain").setAttribute("disabled", "true");
	}
}

function checkboxcheck4() {
	if (document.getElementById("CQnewsCheckbox").checked)
		document.getElementById("CHbox-news").removeAttribute("disabled");
	else	
		document.getElementById("CHbox-news").setAttribute("disabled", "true");
}
