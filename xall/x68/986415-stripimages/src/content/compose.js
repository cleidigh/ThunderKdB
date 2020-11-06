browser.composeAction.onClicked.addListener(async (tab) => {
    // Get the existing message.
    let details = await browser.compose.getComposeDetails(tab.id);
    //console.log(details);

    if (details.isPlainText) {
        // No images in plain text messages

    } else {
        // The message is being composed in HTML mode. Parse the message into an HTML document.
        let document = new DOMParser().parseFromString(details.body, "text/html");

        //console.log(document.querySelectorAll("img").length + " images found");
        document.querySelectorAll("img").forEach(node => node.remove());

        // Serialize the document back to HTML, and send it back to the editor.
        let html = new XMLSerializer().serializeToString(document);
        browser.compose.setComposeDetails(tab.id, { body: html });
    }
});
