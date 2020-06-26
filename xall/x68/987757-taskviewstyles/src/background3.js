browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form3: " + message.execute3);
console.log(executing3());
sendResponse({response3: "Response from background3"});
function executing3() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute3 == "Executing from form3") {
browser.tabs.executeScript({code: `(function() {
var colorDescription = document.getElementById('calendar-task-details-description');
colorDescription.style.backgroundColor = '#F1F1F1';
})();`});
};
});
};
});


