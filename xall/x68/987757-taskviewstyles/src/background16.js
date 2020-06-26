browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form16: " + message.execute16);
console.log(executing16());
sendResponse({response16: "Response from background16"});
function executing16() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute16 == "Executing from form16") {
browser.tabs.executeScript({code: `(function() {
var styleDescription = document.getElementById('calendar-task-details-description');
styleDescription.style.fontStyle = 'normal';
})();`});
};
});
};
});


