browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form5: " + message.execute5);
console.log(executing5());
sendResponse({response5: "Response from background5"});
function executing5() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute5 == "Executing from form5") {
browser.tabs.executeScript({code: `(function() {
var colorDescription = document.getElementById('calendar-task-details-description');
colorDescription.style.backgroundColor = '#FFFFFF';
})();`});
};
});
};
});


