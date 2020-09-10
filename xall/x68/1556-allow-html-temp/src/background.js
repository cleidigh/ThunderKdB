messenger.WindowListener.registerDefaultPrefs("defaults/preferences/allowhtmltemp.js");

messenger.WindowListener.registerChromeUrl([ 
  ["content",   "allowhtmltemp",          "chrome/content/"],
  ["resource",  "allowhtmltemp",          "chrome/"],
  ["locale",    "allowhtmltemp", "en",    "chrome/locale/en/"],
  ["locale",    "allowhtmltemp", "ar",    "chrome/locale/ar/"],
  ["locale",    "allowhtmltemp", "cs",    "chrome/locale/cs/"],
  ["locale",    "allowhtmltemp", "da",    "chrome/locale/da/"],
  ["locale",    "allowhtmltemp", "de",    "chrome/locale/de/"],
  ["locale",    "allowhtmltemp", "el",    "chrome/locale/el/"],
  ["locale",    "allowhtmltemp", "es",    "chrome/locale/es/"],
  ["locale",    "allowhtmltemp", "fr",    "chrome/locale/fr/"],
  ["locale",    "allowhtmltemp", "he",    "chrome/locale/he/"],
  ["locale",    "allowhtmltemp", "hr",    "chrome/locale/hr/"],
  ["locale",    "allowhtmltemp", "it",    "chrome/locale/it/"],
  ["locale",    "allowhtmltemp", "ja",    "chrome/locale/ja/"],
  ["locale",    "allowhtmltemp", "ms",    "chrome/locale/ms/"],
  ["locale",    "allowhtmltemp", "nl",    "chrome/locale/nl/"],
  ["locale",    "allowhtmltemp", "pl",    "chrome/locale/pl/"],
  ["locale",    "allowhtmltemp", "pt-BR", "chrome/locale/pt-BR/"],
  ["locale",    "allowhtmltemp", "ru",    "chrome/locale/ru/"],
  ["locale",    "allowhtmltemp", "sk",    "chrome/locale/sk/"],
  ["locale",    "allowhtmltemp", "sr",    "chrome/locale/sr/"],
  ["locale",    "allowhtmltemp", "sv",    "chrome/locale/sv/"],
  ["locale",    "allowhtmltemp", "tr",    "chrome/locale/tr/"],
  ["locale",    "allowhtmltemp", "uk",    "chrome/locale/uk/"],
  ["locale",    "allowhtmltemp", "zh",    "chrome/locale/zh/"],
  ["locale",    "allowhtmltemp", "zh-TW", "chrome/locale/zh-TW/"]
]);

messenger.WindowListener.registerOptionsPage("chrome://allowhtmltemp/content/options/aht_options.xhtml");

messenger.WindowListener.registerWindow(
  "chrome://messenger/content/customizeToolbar.xhtml", 
  "chrome://allowhtmltemp/content/aht_overlay_customizeToolbar.js");

messenger.WindowListener.registerWindow(
  "chrome://messenger/content/messageWindow.xhtml", 
  "chrome://allowhtmltemp/content/aht_overlay.js");

messenger.WindowListener.registerWindow(
  "chrome://messenger/content/messenger.xhtml", 
  "chrome://allowhtmltemp/content/aht_overlay.js");

// messenger.WindowListener.registerShutdownScript("chrome://allowhtmltemp/content/shutdown.js")

messenger.WindowListener.startListening();
