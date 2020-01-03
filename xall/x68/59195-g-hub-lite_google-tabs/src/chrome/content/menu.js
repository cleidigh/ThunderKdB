//GOOGLE SERVICES
function load_ghublite_googleCalendarURL(){
	var link = "https://www.google.com/calendar/render";
	
	openInNewTab(link);
}


function load_ghublite_googleContactsURL(){
	var link = "https://www.google.com/contacts/?";
	
	openInNewTab(link);
}

function load_ghublite_googleDocumentsURL(){
	var link = "https://docs.google.com/document/";
	
	openInNewTab(link);
}


function load_ghublite_googleDriveURL(){
	var link = "https://drive.google.com/?";
	
	openInNewTab(link);
}

function load_ghublite_googleMapsURL(){
	var link = "https://maps.google.com/";
	
	openInNewTab(link);
}

function load_ghublite_googleSearchURL(){
	var link = "https://www.google.com/?";
	
	openInNewTab(link);
}

function load_ghublite_googleSpreadsheetsURL(){
	var link = "https://docs.google.com/spreadsheets/";
	
	openInNewTab(link);
}

function load_ghublite_googlePresentationsURL(){
	var link = "https://docs.google.com/presentation/";
	
	openInNewTab(link);
}

function load_ghublite_googleVoiceURL(){
	var link = "https://www.google.com/voice/?";
	
	openInNewTab(link);
}





//SETTINGS
function load_ghublite_launcherURL(){
	var link = "G-Hub_Lite_Launcher.html";
	
	openInNewTab(link);
}

function load_ghublite_googleAddAccountURL(){
	var link = "https://accounts.google.com/AddSession";
	
	openInNewTab(link);
}

function load_ghublite_googleLogoutURL(){
	var link = "http://www.google.com/accounts/logout";
	
	openInNewTab(link);
}

function load_ghublite_optionsURL(){
	openInNewTab("options_lite.html");
}

function openInNewTab(url) {
  var win = window.open(url, '_blank');
  win.focus();
}


document.querySelector("#google_calendar_link").addEventListener("click", load_ghublite_googleCalendarURL);
document.querySelector("#google_contacts_link").addEventListener("click", load_ghublite_googleContactsURL);
document.querySelector("#google_docs_link").addEventListener("click", load_ghublite_googleDocumentsURL);
document.querySelector("#google_drive_link").addEventListener("click", load_ghublite_googleDriveURL);
document.querySelector("#google_maps_link").addEventListener("click", load_ghublite_googleMapsURL);
document.querySelector("#google_search_link").addEventListener("click", load_ghublite_googleSearchURL);
document.querySelector("#google_sheets_link").addEventListener("click", load_ghublite_googleSpreadsheetsURL);
document.querySelector("#google_slides_link").addEventListener("click", load_ghublite_googlePresentationsURL);
document.querySelector("#google_voice_link").addEventListener("click", load_ghublite_googleVoiceURL);

document.querySelector("#ghublite_launcherURL").addEventListener("click", load_ghublite_launcherURL);
document.querySelector("#ghublite_googleAddAccountURL").addEventListener("click", load_ghublite_googleAddAccountURL);
document.querySelector("#ghublite_googleLogoutURL").addEventListener("click", load_ghublite_googleLogoutURL);
document.querySelector("#ghublite_optionsURL").addEventListener("click", load_ghublite_optionsURL);