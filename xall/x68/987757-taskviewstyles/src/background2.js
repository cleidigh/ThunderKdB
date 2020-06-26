browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form2: " + message.execute2);
console.log(executing2());
sendResponse({response2: "Response from background2"});
function executing2() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute2 == "Executing from form2") {
browser.tabs.executeScript({code: `(function() {
var colorDescription = document.getElementById('calendar-task-details-description');
colorDescription.style.backgroundColor = '#808080';
})();`});
};
});
};
});


