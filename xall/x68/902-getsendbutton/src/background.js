messenger.WindowListener.registerDefaultPrefs("defaults/preferences/getsendbutton.js");

messenger.WindowListener.registerChromeUrl([ 
  ["content",   "getsendbutton",          "chrome/content/"],
  ["resource",  "getsendbutton",          "chrome/"],
  ["locale",    "getsendbutton", "en",    "chrome/locale/en/"],
  ["locale",    "getsendbutton", "be",    "chrome/locale/be/"],
  ["locale",    "getsendbutton", "ca",    "chrome/locale/ca/"],
  ["locale",    "getsendbutton", "cs",    "chrome/locale/cs/"],
  ["locale",    "getsendbutton", "de",    "chrome/locale/de/"],
  ["locale",    "getsendbutton", "es",    "chrome/locale/es/"],
  ["locale",    "getsendbutton", "fi",    "chrome/locale/fi/"],
  ["locale",    "getsendbutton", "fr",    "chrome/locale/fr/"],
  ["locale",    "getsendbutton", "fy",    "chrome/locale/fy-NL/"],
  ["locale",    "getsendbutton", "he",    "chrome/locale/he/"],
  ["locale",    "getsendbutton", "hr",    "chrome/locale/hr/"],
  ["locale",    "getsendbutton", "hu",    "chrome/locale/hu/"],
  ["locale",    "getsendbutton", "it",    "chrome/locale/it/"],
  ["locale",    "getsendbutton", "ja",    "chrome/locale/ja/"],
  ["locale",    "getsendbutton", "nl",    "chrome/locale/nl/"],
  ["locale",    "getsendbutton", "pl",    "chrome/locale/pl/"],
  ["locale",    "getsendbutton", "pt",    "chrome/locale/pt/"],
  ["locale",    "getsendbutton", "pt-BR", "chrome/locale/pt-BR/"],
  ["locale",    "getsendbutton", "ru",    "chrome/locale/ru/"],
  ["locale",    "getsendbutton", "sk",    "chrome/locale/sk/"],
  ["locale",    "getsendbutton", "sr",    "chrome/locale/sr/"],
  ["locale",    "getsendbutton", "sv",    "chrome/locale/sv/"],
  ["locale",    "getsendbutton", "uk",    "chrome/locale/uk/"],
  ["locale",    "getsendbutton", "zh",    "chrome/locale/zh/"],
  ["locale",    "getsendbutton", "zh-TW", "chrome/locale/zh-TW/"],
]);

messenger.WindowListener.registerOptionsPage("chrome://getsendbutton/content/options/getsendbutton_options.xhtml");

messenger.WindowListener.registerWindow(
  "chrome://messenger/content/customizeToolbar.xhtml", 
  "chrome://getsendbutton/content/getsendbutton_overlay_customizeToolbar.js");

messenger.WindowListener.registerWindow(
  "chrome://messenger/content/messageWindow.xhtml", 
  "chrome://getsendbutton/content/getsendbutton_overlay.js");

messenger.WindowListener.registerWindow(
  "chrome://messenger/content/messenger.xhtml", 
  "chrome://getsendbutton/content/getsendbutton_overlay.js");

// messenger.WindowListener.registerShutdownScript("chrome://getsendbutton/content/shutdown.js")

messenger.WindowListener.startListening();
