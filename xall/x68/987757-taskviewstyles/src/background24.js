browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form24: " + message.execute24);
console.log(executing24());
sendResponse({response24: "Response from background24"});
function executing24() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute24 == "Executing from form24") {
browser.tabs.executeScript({code: `(function() {
window.document.getElementById('calendar-task-details-description').style.textAlign = 'right';
window.document.getElementById('calendar-task-details-description').style.textAlignLast = 'right';
})();`});
};
});
};
});


