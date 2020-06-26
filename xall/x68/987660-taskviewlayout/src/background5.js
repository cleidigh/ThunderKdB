browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from refresh5: " + message.execute5);
console.log(executing5());
sendResponse({response5: "Response from background5"});
function executing5() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function (message, callback) {
if (message.execute5 == "Executing from refresh5") {
browser.tabs.executeScript({code: `(function() {
document.getElementById('calendar-edit-button').addEventListener('click', function() {document.getElementById('calendar-task-tree').refresh();
document.getElementById('calendar-newtask-button').addEventListener('click', function() {document.getElementById('calendar-task-tree').refresh();
document.getElementById('task-edit-button').addEventListener('click', function() {document.getElementById('calendar-task-tree').refresh();
document.getElementById('task-newtask-button').addEventListener('click', function() {document.getElementById('calendar-task-tree').refresh();
document.getElementById('calendar-add-task-button').addEventListener('click', function() {document.getElementById('calendar-task-tree').refresh();})();`});
};
});
};
});