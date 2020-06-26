browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form19: " + message.execute19);
console.log(executing19());
sendResponse({response19: "Response from background19"});
function executing19() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute19 == "Executing from form19") {
browser.tabs.executeScript({code: `(function() {
var styleDescription = document.getElementById('calendar-task-details-description');
styleDescription.style.fontSize ='large';
})();`});
};
});
};
});


