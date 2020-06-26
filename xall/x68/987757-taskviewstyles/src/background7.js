browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form7: " + message.execute7);
console.log(executing7());
sendResponse({response7: "Response from background7"});
function executing7() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute7 == "Executing from form7") {
browser.tabs.executeScript({code: `(function() {
var colorDescription = document.getElementById('calendar-task-details-description');
colorDescription.style.color = 'blue';
})();`});
};
});
};
});


