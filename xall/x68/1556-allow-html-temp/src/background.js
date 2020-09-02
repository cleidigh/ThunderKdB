messenger.WindowListener.registerDefaultPrefs("defaults/preferences/allowhtmltemp.js");

messenger.WindowListener.registerChromeUrl([ 
  ["content",   "allowhtmltemp",          "chrome/content/"],
  ["resource",  "allowhtmltemp",          "chrome/"],
  ["locale",    "allowhtmltemp", "en",    "chrome/locale/en/"],
  ["locale",    "allowhtmltemp", "ar",    "chrome/locale/ar-AS/"],
  ["locale",    "allowhtmltemp", "cs",    "chrome/locale/cs-CZ/"],
  ["locale",    "allowhtmltemp", "da",    "chrome/locale/da-DK/"],
  ["locale",    "allowhtmltemp", "de",    "chrome/locale/de-DE/"],
  ["locale",    "allowhtmltemp", "el",    "chrome/locale/el-GR/"],
  ["locale",    "allowhtmltemp", "es",    "chrome/locale/es-ES/"],
  ["locale",    "allowhtmltemp", "fr",    "chrome/locale/fr-FR/"],
  ["locale",    "allowhtmltemp", "he",    "chrome/locale/he-IL/"],
  ["locale",    "allowhtmltemp", "hr",    "chrome/locale/hr-HR/"],
  ["locale",    "allowhtmltemp", "it",    "chrome/locale/it_IT/"],
  ["locale",    "allowhtmltemp", "ja",    "chrome/locale/ja_JP/"],
  ["locale",    "allowhtmltemp", "ms-MY", "chrome/locale/ms-MY/"],
  ["locale",    "allowhtmltemp", "nl",    "chrome/locale/nl-NL/"],
  ["locale",    "allowhtmltemp", "pl",    "chrome/locale/pl-PL/"],
  ["locale",    "allowhtmltemp", "pt-BR", "chrome/locale/pt-BR/"],
  ["locale",    "allowhtmltemp", "ru",    "chrome/locale/ru-RU/"],
  ["locale",    "allowhtmltemp", "sk",    "chrome/locale/sk-SK/"],
  ["locale",    "allowhtmltemp", "sr",    "chrome/locale/sr-SP/"],
  ["locale",    "allowhtmltemp", "sv",    "chrome/locale/sv-SE/"],
  ["locale",    "allowhtmltemp", "tr",    "chrome/locale/tr-TR/"],
  ["locale",    "allowhtmltemp", "uk",    "chrome/locale/uk-UA/"],
  ["locale",    "allowhtmltemp", "zh-CN", "chrome/locale/zh-CN/"],
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
