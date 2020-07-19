browser.runtime.onMessage.addListener(function(message, sender, sendResponse) {
console.log("Message from white: " + message.execute);
sendResponse({response: "Response from background"});
browser.myapi.code();
});