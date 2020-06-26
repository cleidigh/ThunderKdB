browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form1: " + message.execute1);
console.log(executing1());
sendResponse({response1: "Response from background1"});
function executing1() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute1 == "Executing from form1") {
browser.tabs.executeScript({code: `(function() {
var colorDescription = document.getElementById('calendar-task-details-description');
colorDescription.style.backgroundColor = '#303030';
})();`});
};
});
};
});


