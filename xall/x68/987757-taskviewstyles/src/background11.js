browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form11: " + message.execute11);
console.log(executing11());
sendResponse({response11: "Response from background11"});
function executing11() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute11 == "Executing from form11") {
browser.tabs.executeScript({code: `(function() {
var styleDescription = document.getElementById('calendar-task-details-description');
styleDescription.style.fontFamily = 'serif';
})();`});
};
});
};
});


