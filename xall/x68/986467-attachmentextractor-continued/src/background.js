messenger.WindowListener.registerDefaultPrefs("defaults/preferences/aec_defaultprefs.js");

messenger.WindowListener.registerChromeUrl([ 
  ["content",   "attachmentextractor_cont",          "chrome/content/"],
  ["resource",  "attachmentextractor_cont",          "chrome/"],
  ["locale",    "attachmentextractor_cont", "en",    "chrome/locale/en/"],
  ["locale",    "attachmentextractor_cont", "bg",    "chrome/locale/bg/"],
  ["locale",    "attachmentextractor_cont", "cs",    "chrome/locale/cs/"],
  ["locale",    "attachmentextractor_cont", "da",    "chrome/locale/da/"],
  ["locale",    "attachmentextractor_cont", "de",    "chrome/locale/de/"],
  ["locale",    "attachmentextractor_cont", "es",    "chrome/locale/es/"],
  ["locale",    "attachmentextractor_cont", "fi",    "chrome/locale/fi/"],
  ["locale",    "attachmentextractor_cont", "fr",    "chrome/locale/fr/"],
  ["locale",    "attachmentextractor_cont", "it",    "chrome/locale/it/"],
  ["locale",    "attachmentextractor_cont", "ko",    "chrome/locale/ko/"],
  ["locale",    "attachmentextractor_cont", "nl",    "chrome/locale/nl/"],
  ["locale",    "attachmentextractor_cont", "pt",    "chrome/locale/pt/"],
  ["locale",    "attachmentextractor_cont", "pt-BR", "chrome/locale/pt-BR/"],
  ["locale",    "attachmentextractor_cont", "ru",    "chrome/locale/ru/"],
  ["locale",    "attachmentextractor_cont", "sk",    "chrome/locale/sk/"]
]);

messenger.WindowListener.registerOptionsPage("chrome://attachmentextractor_cont/content/settings/aec_options.xhtml");

messenger.WindowListener.registerWindow(
  "chrome://messenger/content/customizeToolbar.xhtml", 
  "chrome://attachmentextractor_cont/content/aec_overlay_customizeToolbar.js");

messenger.WindowListener.registerWindow(
  "chrome://messenger/content/messenger.xhtml",
  "chrome://attachmentextractor_cont/content/aec_overlay_messenger.js"
  );

messenger.WindowListener.registerWindow(
  "chrome://messenger/content/messageWindow.xhtml",
  "chrome://attachmentextractor_cont/content/aec_overlay_messenger.js"
  );

messenger.WindowListener.startListening();
