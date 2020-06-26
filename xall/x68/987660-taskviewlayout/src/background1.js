browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from form1: " + message.execute1);
console.log(executing1());
sendResponse({response1: "Response from background1"});
function executing1() {browser.tabs.query({active: true, currentWindow: true, lastFocusedWindow: true, mailTab: true, title: "Tasks", windowId: browser.windows.WINDOW_ID_CURRENT}).then(function (message, callback) {
if (message.execute1 == "Executing from form1") {
browser.tabs.executeScript({code: `(function() {
document.getElementById('calendarDisplayDeck').style.width = '50%';
document.getElementById('calendarContent').appendChild(document.getElementById('calendar-task-details-container'));
document.getElementById('calendar-task-box').style.display = 'flex';
document.getElementById('calendar-task-tree').childNodes[0].style.height = '3%';
document.getElementById('calendar-task-tree').childNodes[1].style.flex = '1';
document.getElementById('calendar-task-box').style.flexWrap = 'none';
document.getElementById('task-addition-box').style.width = '100%';
document.getElementById('task-addition-box').style.height = '5%';
document.getElementById('calendar-task-details-container').style.height = '35%';
document.getElementById('calendar-task-tree').style.height = '55%';
document.getElementById('calendar-task-tree').style.flex = '1';
document.getElementById('calendar-task-details-container').style.flex = '1';
document.getElementById('calendar-task-box').appendChild(document.getElementById('calendar-task-details-container'));
document.getElementById('calendar-task-tree').style.resize = 'vertical';
document.getElementById('calendar-task-tree').style.overflow = 'auto'; 
document.getElementById('calendar-task-box').style.flexDirection = 'column';
window.document.getElementById('calendar-task-box').insertBefore(document.getElementById('calendar-task-details-container'), document.getElementById('task-addition-box'));
document.getElementById('calendar-task-tree').refresh();})();`});
};
});
};
});

