async function main() {
  messenger.WindowListener.registerChromeUrl([
    ["content", "lightninginvitationnotifier", "content/"],
    ["locale", "lightninginvitationnotifier", "de-DE", "locale/de-DE/"],
    ["locale", "lightninginvitationnotifier", "en-US", "locale/en-US/"]
  ]);
  messenger.WindowListener.registerWindow("chrome://messenger/content/messenger.xhtml", "chrome://lightninginvitationnotifier/content/listener.js");

  messenger.WindowListener.startListening();
}

main();