browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form12: " + message.execute12);
console.log(executing12());
sendResponse({response12: "Response from background12"});
function executing12() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute12 == "Executing from form12") {
browser.tabs.executeScript({code: `(function() {
var styleDescription = document.getElementById('calendar-task-details-description');
styleDescription.style.fontFamily = 'sans-serif';
})();`});
};
});
};
});


