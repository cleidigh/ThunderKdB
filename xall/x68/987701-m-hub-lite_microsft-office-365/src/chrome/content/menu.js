//Microsoft SERVICES
function load_mhublite_microsoftCalendarURL(){
	var link = "https://outlook.live.com/calendar/";
	
	openInNewTab(link);
}


function load_mhublite_microsoftPeopleURL(){
	var link = "https://outlook.live.com/people/";
	
	openInNewTab(link);
}

function load_mhublite_microsoftWordURL(){
	var link = "https://www.office.com/launch/word";
	
	openInNewTab(link);
}


function load_mhublite_microsoftOneDriveURL(){
	var link = "https://onedrive.live.com";
	
	openInNewTab(link);
}

function load_mhublite_microsoftBingURL(){
	var link = "https://www.bing.com/?";
	
	openInNewTab(link);
}

function load_mhublite_microsoftExcelURL(){
	var link = "https://www.office.com/launch/excel";
	
	openInNewTab(link);
}

function load_mhublite_microsoftPowerPointURL(){
	var link = "https://www.office.com/launch/powerpoint";
	
	openInNewTab(link);
}






//SETTINGS
function load_mhublite_launcherURL(){
	var link = "m-hub_lite_launcher.html";
	
	openInNewTab(link);
}

function load_mhublite_microsoftAddAccountURL(){
	var link = "https://login.microsoftonline.com";
	
	openInNewTab(link);
}

function load_mhublite_microsoftLogoutURL(){
	var link = "https://login.microsoftonline.com/common/oauth2/logout";
	
	openInNewTab(link);
}

function load_mhublite_optionsURL(){
	openInNewTab("options_lite.html");
}

function openInNewTab(url) {
  var win = window.open(url, '_blank');
  win.focus();
}


document.querySelector("#microsoft_calendar_link").addEventListener("click", load_mhublite_microsoftCalendarURL);
document.querySelector("#microsoft_people_link").addEventListener("click", load_mhublite_microsoftPeopleURL);
document.querySelector("#microsoft_word_link").addEventListener("click", load_mhublite_microsoftWordURL);
document.querySelector("#microsoft_onedrive_link").addEventListener("click", load_mhublite_microsoftOneDriveURL);
document.querySelector("#microsoft_bing_link").addEventListener("click", load_mhublite_microsoftBingURL);
document.querySelector("#microsoft_excel_link").addEventListener("click", load_mhublite_microsoftExcelURL);
document.querySelector("#microsoft_powerpoint_link").addEventListener("click", load_mhublite_microsoftPowerPointURL);

document.querySelector("#mhublite_launcherURL").addEventListener("click", load_mhublite_launcherURL);
document.querySelector("#mhublite_microsoftAddAccountURL").addEventListener("click", load_mhublite_microsoftAddAccountURL);
document.querySelector("#mhublite_microsoftLogoutURL").addEventListener("click", load_mhublite_microsoftLogoutURL);
document.querySelector("#mhublite_optionsURL").addEventListener("click", load_mhublite_optionsURL);