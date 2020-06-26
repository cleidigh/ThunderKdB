browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form13: " + message.execute13);
console.log(executing13());
sendResponse({response13: "Response from background13"});
function executing13() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute13 == "Executing from form13") {
browser.tabs.executeScript({code: `(function() {
var styleDescription = document.getElementById('calendar-task-details-description');
styleDescription.style.fontWeight = 'bold';
})();`});
};
});
};
});


