browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form3: " + message.execute3);
console.log(executing3());
sendResponse({response3: "Response from background3"});
function executing3() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function (message, callback) {
if (message.execute3 == "Executing from form3") {
browser.tabs.executeScript({code: `(function() {
document.getElementById('calendarDisplayDeck').style.width = '50%';
document.getElementById('calendarContent').appendChild(document.getElementById('calendar-task-details-container'));
document.getElementById('calendar-task-box').style.display = 'flex';
document.getElementById('calendar-task-tree').childNodes[0].style.height = '3%';
document.getElementById('calendar-task-tree').style.display = 'internal';
document.getElementById('calendar-task-tree').childNodes[0].display = 'table-column';
document.getElementById('calendar-task-box').style.flexDirection = 'row';
document.getElementById('calendar-task-box').style.flexWrap = 'wrap';
document.getElementById('task-addition-box').style.width = '100%';
document.getElementById('calendar-task-box').appendChild(document.getElementById('calendar-task-details-container'));
document.getElementById('task-addition-box').style.height = '5%';
document.getElementById('calendar-task-details-container').style.height = '95%';
document.getElementById('calendar-task-tree').style.height = '95%';
document.getElementById('calendar-task-tree').style.flex = '1';
document.getElementById('calendar-task-details-container').style.flex = '1';
document.getElementById('calendar-task-tree').style.resize = 'horizontal';
document.getElementById('calendar-task-tree').style.overflow = 'auto';
document.getElementById('calendar-task-tree').attributeChangedCallback();
document.getElementById('calendar-task-tree').refresh();})();`});
};
});
};
});
