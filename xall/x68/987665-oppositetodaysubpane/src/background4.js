browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form4: " + message.execute4);
console.log(executing4());
sendResponse({response4: "Response from background4"});
function executing4() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, windowId: browser.windows.WINDOW_ID_CURRENT, title: "Index", title: "Calendar", title: "Tasks"}).then(() => {
if (message.execute4 == "Executing from form4") {
browser.tabs.executeScript({code: `(function() {
var todayBox = window.document.getElementById('mini-day-box');
var todaySidebar = window.document.getElementById('ltnSidebar');
var todayFBox = window.document.getElementById('folderPaneBox');
var todayClone1 = todayBox.cloneNode(1);
var todayClone2 = todayBox.cloneNode(2);
todaySidebar.removeChild(todaySidebar.lastChild);
todayFBox.removeChild(todayFBox.lastChild);})();`});
};
});
};
});