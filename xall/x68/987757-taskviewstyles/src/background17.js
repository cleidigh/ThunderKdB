browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form17: " + message.execute17);
console.log(executing17());
sendResponse({response17: "Response from background17"});
function executing17() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute17 == "Executing from form17") {
browser.tabs.executeScript({code: `(function() {
var styleDescription = document.getElementById('calendar-task-details-description');
styleDescription.style.fontSize = 'small';
})();`});
};
});
};
});


