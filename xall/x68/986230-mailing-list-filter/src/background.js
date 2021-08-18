async function main() {
  messenger.WindowListener.registerChromeUrl([
    ["content", "mailing-list-filter", "content/" ],
    ["locale", "mailing-list-filter", "cs-CZ", "_locales/cs/"],
    ["locale", "mailing-list-filter", "en-US", "_locales/en/"],
  ]);

  // overlay  chrome://messenger/content/messenger.xul chrome://mailing-list-filter/content/messengerOverlay.xul
  messenger.WindowListener.registerWindow("chrome://messenger/content/messenger.xhtml", "content/messengerOverlay.js");

  // overlay  chrome://messenger/content/FilterEditor.xul chrome://mailing-list-filter/content/filterEditorOverlay.xul
  messenger.WindowListener.registerWindow("chrome://messenger/content/FilterEditor.xhtml", "content/filter.js");

  // overlay  chrome://messenger/content/SearchDialog.xul chrome://mailing-list-filter/content/filterEditorOverlay.xul
  messenger.WindowListener.registerWindow("chrome://messenger/content/SearchDialog.xhtml", "content/filter.js");

  messenger.WindowListener.startListening();
}

main()
