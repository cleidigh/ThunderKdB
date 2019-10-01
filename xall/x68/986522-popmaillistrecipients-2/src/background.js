//ChromeUtils.import("resource://gre/modules/Services.jsm");
function onInit() {
browser.composeAction.setTitle({title: "Expand it"});
browser.composeAction.setIcon({path:"icons/icon.png" });
browser.composeAction.onClicked.addListener(TestButton);
}
function TestButton() {
  browser.myapi.myExpandRecipients("name");
}
document.addEventListener("DOMContentLoaded", onInit);
