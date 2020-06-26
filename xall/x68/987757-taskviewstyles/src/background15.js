browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form15: " + message.execute15);
console.log(executing15());
sendResponse({response15: "Response from background15"});
function executing15() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute15 == "Executing from form15") {
browser.tabs.executeScript({code: `(function() {
var styleDescription = document.getElementById('calendar-task-details-description');
styleDescription.style.fontStyle = 'italic';
})();`});
};
});
};
});


