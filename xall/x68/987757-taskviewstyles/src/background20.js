browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form20: " + message.execute20);
console.log(executing20());
sendResponse({response20: "Response from background20"});
function executing20() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute20 == "Executing from form20") {
browser.tabs.executeScript({code: `(function() {
window.document.getElementById('calendar-task-details-description').style.textAlign = 'inherit';
window.document.getElementById('calendar-task-details-description').style.textAlignLast = 'inherit';
})();`});
};
});
};
});


