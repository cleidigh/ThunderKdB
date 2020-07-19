browser.runtime.onMessage.addListener(async message => {
  browser.compose.getComposeDetails(message.tabId).then(details => {
    if (details.isPlainText || message.message.indexOf('-----BEGIN PGP MESSAGE-----') != -1) {
      let body = message.message;
      browser.compose.setComposeDetails(message.tabId, { plainTextBody: body, isPlainText: true });
    } else {
      let document = new DOMParser().parseFromString(message.message, "text/html");
      let html = new XMLSerializer().serializeToString(document);
      browser.compose.setComposeDetails(message.tabId, { body: html });
    }
  });
});