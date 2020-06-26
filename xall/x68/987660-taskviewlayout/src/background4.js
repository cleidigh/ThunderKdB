browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form4: " + message.execute4);
console.log(executing4());
sendResponse({response4: "Response from background4"});
function executing4() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function (message, callback) {
if (message.execute4 == "Executing from form4") {
browser.tabs.executeScript({code: `(function() {
document.getElementById('calendar-task-tree').refresh();})();`});
};
});
};
});
