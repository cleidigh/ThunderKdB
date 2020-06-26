browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form9: " + message.execute9);
console.log(executing9());
sendResponse({response9: "Response from background9"});
function executing9() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute9 == "Executing from form9") {
browser.tabs.executeScript({code: `(function() {
var colorDescription = document.getElementById('calendar-task-details-description');
colorDescription.style.color = 'red';
})();`});
};
});
};
});


