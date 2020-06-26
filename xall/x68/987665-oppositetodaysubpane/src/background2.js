browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form2: " + message.execute2);
console.log(executing2());
sendResponse({response2: "Response from background2"});
function executing2() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, windowId: browser.windows.WINDOW_ID_CURRENT, title: "Index", title: "Calendar", title: "Tasks"}).then(() => {
if (message.execute2 == "Executing from form2") {
browser.tabs.executeScript({code: `(function() {
var todayBox = window.document.getElementById('mini-day-box');
var todayContent = window.document.getElementById('calendarContent');
todayContent.allowEvents = true;
var todaySidebar = window.document.getElementById('ltnSidebar'); 
var todayPane = window.document.getElementById('minimonth-pane');
todaySidebar.allowEvents = true;
todayPane.allowEvents = true;
var todayClone3 = todayBox.cloneNode(3); 
todaySidebar.removeChild(todaySidebar.firstChild);
var todayBox = window.document.getElementById('mini-day-box');
var todayMBox = window.document.getElementById('messengerBox');
todayMBox.allowEvents = true;
var todayFBox = window.document.getElementById('folderPaneBox');
todayFBox.allowEvents = true;
var todayToolbar = window.document.getElementById('folderPane-toolbar');
var todayTree = window.document.getElementById('folderTree');
var todayClone4 = todayBox.cloneNode(4);
todayFBox.removeChild(todayFBox.childNodes[1]);})();`});
};
});
};
});