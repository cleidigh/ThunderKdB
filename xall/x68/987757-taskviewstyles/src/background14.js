browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form14: " + message.execute14);
console.log(executing14());
sendResponse({response14: "Response from background14"});
function executing14() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute14 == "Executing from form14") {
browser.tabs.executeScript({code: `(function() {
var styleDescription = document.getElementById('calendar-task-details-description');
styleDescription.style.fontWeight = 'normal';
})();`});
};
});
};
});


