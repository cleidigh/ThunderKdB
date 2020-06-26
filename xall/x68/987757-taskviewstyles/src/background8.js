browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form8: " + message.execute8);
console.log(executing8());
sendResponse({response8: "Response from background8"});
function executing8() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function () {
if (message.execute8 == "Executing from form8") {
browser.tabs.executeScript({code: `(function() {
var colorDescription = document.getElementById('calendar-task-details-description');
colorDescription.style.color = 'green';
})();`});
};
});
};
});


