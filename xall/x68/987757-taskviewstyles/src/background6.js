browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form6: " + message.execute6);
console.log(executing6());
sendResponse({response6: "Response from background6"});
function executing6() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute6 == "Executing from form6") {
browser.tabs.executeScript({code: `(function() {
var colorDescription = document.getElementById('calendar-task-details-description');
colorDescription.style.color = 'black';
})();`});
};
});
};
});


