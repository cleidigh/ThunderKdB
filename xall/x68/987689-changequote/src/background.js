messenger.WindowListener.registerDefaultPrefs("defaults/preferences/prefs.js")

messenger.WindowListener.registerChromeUrl([ 
  ["content",  "changequote",           "chrome/content/"],
  ["resource", "changequote",           "chrome/icon/"],
  ["locale",   "changequote", "en-US",  "chrome/locale/en-US/changequote/"],
  ["locale",   "changequote", "it",     "chrome/locale/it/changequote/"],
  ["locale",   "changequote", "fi",     "chrome/locale/fi/changequote/"],
  ["locale",   "changequote", "fr",     "chrome/locale/fr/changequote/"],
  ["locale",   "changequote", "de",     "chrome/locale/de/changequote/"],
  ["locale",   "changequote", "pt-BR",  "chrome/locale/pt-BR/changequote/"],
  ["locale",   "changequote", "ru",     "chrome/locale/ru/changequote/"],
  ["locale",   "changequote", "nl",     "chrome/locale/nl/changequote/"],
  ["locale",   "changequote", "ja",     "chrome/locale/ja/changequote/"],
  ["locale",   "changequote", "sr",     "chrome/locale/sr/changequote/"],
  ["locale",   "changequote", "sv-SE",  "chrome/locale/sv-SE/changequote/"],
  ["locale",   "changequote", "zh-CN",  "chrome/locale/zh-CN/changequote/"],
  ["locale",   "changequote", "sk-SK",  "chrome/locale/sk-SK/changequote/"]
]);

messenger.WindowListener.registerOptionsPage("chrome://changequote/content/changequote/changequoteOptions.xhtml")
 
messenger.WindowListener.registerWindow(
	"chrome://messenger/content/messenger.xhtml",
    "chrome://changequote/content/changequote/messenger.js");

messenger.WindowListener.registerWindow(
    "chrome://messenger/content/messengercompose/messengercompose.xhtml",
    "chrome://changequote/content/changequote/messengercompose.js");
    
   
messenger.WindowListener.registerWindow(
	"chrome://messenger/content/messageWindow.xhtml",
	"chrome://changequote/content/changequote/messenger.js");
    
messenger.WindowListener.startListening();
