function openGoogleCalendar() {
  browser.tabs.create({
    url: "https://calendar.google.com/calendar/r"
  });
}

browser.browserAction.onClicked.addListener(openGoogleCalendar);

