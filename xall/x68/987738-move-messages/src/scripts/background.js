/**
 * Fired when a registered command is activated using a keyboard shortcut.
 *
 */

browser.commands.onCommand.addListener((command) => {
    //console.log( command);
    if (command === "move-msg") {
        moveMessage = 0; // display chosen folder
    } else {
        moveMessage = 1; // move message(s) to folder
    }
    browser.browserAction.setTitle( { title: command} );
    browser.browserAction.openPopup();
});     


