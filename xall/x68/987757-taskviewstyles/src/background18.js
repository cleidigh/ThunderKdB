browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form18: " + message.execute18);
console.log(executing18());
sendResponse({response18: "Response from background18"});
function executing18() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute18 == "Executing from form18") {
browser.tabs.executeScript({code: `(function() {
var styleDescription = document.getElementById('calendar-task-details-description');
styleDescription.style.fontSize ='medium';
})();`});
};
});
};
});


