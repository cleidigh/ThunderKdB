browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form10: " + message.execute10);
console.log(executing10());
sendResponse({response10: "Response from background10"});
function executing10() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute10 == "Executing from form10") {
browser.tabs.executeScript({code: `(function() {
var colorDescription = document.getElementById('calendar-task-details-description');
colorDescription.style.color = 'white';
})();`});
};
});
};
});


