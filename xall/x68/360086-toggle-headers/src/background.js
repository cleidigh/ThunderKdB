browser.commands.onCommand.addListener(function (command) {
  if (command === "toggle-headers") {
	  browser.toggleHeadersApi.toggleHeaders();
  }
});