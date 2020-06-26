browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form1: " + message.execute1);
console.log(executing1());
sendResponse({response1: "Response from background1"});
function executing1() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, windowId: browser.windows.WINDOW_ID_CURRENT, title: "Index", title: "Calendar", title: "Tasks"}).then(() => {
if (message.execute1 == "Executing from form1") {
browser.tabs.executeScript({code: `(function() {
var todayBox = window.document.getElementById('mini-day-box');
var todayContent = window.document.getElementById('calendarContent');
window.document.getElementById('calendarContent').allowEvents = true;
var todaySidebar = window.document.getElementById('ltnSidebar'); 
var todayPane = window.document.getElementById('minimonth-pane');
window.document.getElementById('ltnSidebar').allowEvents = true;
window.document.getElementById('minimonth-pane').allowEvents = true;
var todayClone3 = window.document.getElementById('mini-day-box').cloneNode(3); 
window.document.getElementById('mini-day-box').cloneNode(3).width = '200'; 
window.document.getElementById('mini-day-box').cloneNode(3).height = '50';
window.document.getElementById('ltnSidebar').insertBefore(todayClone3, todayPane).persist = 'true';
window.document.getElementById('mini-day-box').cloneNode(3).style.setProperty('background-color', 'inherit', 'important'); 
window.document.getElementById('mini-day-box').cloneNode(3).style.setProperty('color', 'inherit', 'important'); 
window.document.getElementById('mini-day-box').cloneNode(3).style.setProperty('border', 'solid', 'important'); 
window.document.getElementById('mini-day-box').cloneNode(3).style.setProperty('border-width', '1px', 'important'); 
window.document.getElementById('mini-day-box').cloneNode(3).style.setProperty('border-color', 'currentcolor', 'important');
var todayBox = window.document.getElementById('mini-day-box');
var todayMBox = window.document.getElementById('messengerBox');
window.document.getElementById('messengerBox').allowEvents = true;
var todayFBox = window.document.getElementById('folderPaneBox');
window.document.getElementById('folderPaneBox').allowEvents = true;
var todayToolbar = window.document.getElementById('folderPane-toolbar');
var todayHead = window.document.getElementById('folderPaneHeader');
var todayTree = window.document.getElementById('folderTree');
var todayClone4 = todayBox.cloneNode(4);
window.document.getElementById('mini-day-box').cloneNode(4).width = '200'; 
window.document.getElementById('mini-day-box').cloneNode(4).height = '50';
window.document.getElementById('folderPaneBox').insertBefore(todayClone4, todayTree).persist = true;
window.document.getElementById('mini-day-box').cloneNode(4).style.setProperty('background-color', 'inherit', 'important'); 
window.document.getElementById('mini-day-box').cloneNode(4).style.setProperty('color', 'inherit', 'important'); 
window.document.getElementById('mini-day-box').cloneNode(4).style.setProperty('border', 'solid', 'important'); 
window.document.getElementById('mini-day-box').cloneNode(4).style.setProperty('border-width', '1px', 'important'); 
window.document.getElementById('mini-day-box').cloneNode(4).style.setProperty('border-color', 'currentcolor', 'important');
})();`});
};
});
};
});