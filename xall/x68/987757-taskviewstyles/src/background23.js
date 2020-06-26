browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form23: " + message.execute23);
console.log(executing23());
sendResponse({response23: "Response from background23"});
function executing23() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute23 == "Executing from form23") {
browser.tabs.executeScript({code: `(function() {
window.document.getElementById('calendar-task-details-description').style.textAlign = 'left';
window.document.getElementById('calendar-task-details-description').style.textAlignLast = 'left';
})();`});
};
});
};
});


