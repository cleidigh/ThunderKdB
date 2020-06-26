browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form22: " + message.execute22);
console.log(executing22());
sendResponse({response22: "Response from background22"});
function executing22() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute22 == "Executing from form22") {
browser.tabs.executeScript({code: `(function() {
window.document.getElementById('calendar-task-details-description').style.textAlign = 'center';
window.document.getElementById('calendar-task-details-description').style.textAlignLast = 'center';
})();`});
};
});
};
});


