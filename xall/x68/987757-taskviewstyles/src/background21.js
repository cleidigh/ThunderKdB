browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form21: " + message.execute21);
console.log(executing21());
sendResponse({response21: "Response from background21"});
function executing21() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute21 == "Executing from form21") {
browser.tabs.executeScript({code: `(function() {
window.document.getElementById('calendar-task-details-description').style.textAlign = 'justify';
window.document.getElementById('calendar-task-details-description').style.textAlignLast = 'justify';
window.document.getElementById('calendar-task-details-description').style.whiteSpace = 'pre-line';
window.document.getElementById('calendar-task-details-description').style.textAlignLast = 'left';
window.document.getElementById('calendar-task-details-description').style.textJustfy = 'inter-character';
})();`});
};
});
};
});


