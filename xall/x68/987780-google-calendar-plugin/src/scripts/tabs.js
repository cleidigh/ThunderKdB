chrome.browserAction.onClicked.addListener(function(activeTab) {
  var newURL = 'https://calendar.google.com/calendar/r';
  chrome.tabs.create({ url: newURL });
});
