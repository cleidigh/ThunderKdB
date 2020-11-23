messenger.WindowListener.registerDefaultPrefs("defaults/preferences/prefs.js")

messenger.WindowListener.registerChromeUrl([ 
  ["content",  "confirmbeforedelete",           "chrome/content/"],
  ["resource", "confirmbeforedelete",           "chrome/skin/"],
  ["locale",   "confirmbeforedelete", "en-US",  "chrome/locale/en-US/confirmbeforedelete/"],
  ["locale",   "confirmbeforedelete", "it-IT",  "chrome/locale/it-IT/confirmbeforedelete/"],
  ["locale",   "confirmbeforedelete", "de-DE",  "chrome/locale/de-DE/confirmbeforedelete/"],
  ["locale",   "confirmbeforedelete", "fr-FR",  "chrome/locale/fr-FR/confirmbeforedelete/"]
]);

messenger.WindowListener.registerOptionsPage("chrome://confirmbeforedelete/content/confirmbeforedelete/CBD-options.xhtml")
 
messenger.WindowListener.registerWindow(
	"chrome://messenger/content/messenger.xhtml",
	"chrome://confirmbeforedelete/content/confirmbeforedelete/messenger.js");

messenger.WindowListener.registerWindow(
	"chrome://messenger/content/SearchDialog.xhtml",
	"chrome://confirmbeforedelete/content/confirmbeforedelete/searchWindowOverlay.js");
    
messenger.WindowListener.registerWindow(
	"chrome://messenger/content/addressbook/addressbook.xhtml",
	"chrome://confirmbeforedelete/content/confirmbeforedelete/addressbook.js");
    
messenger.WindowListener.registerWindow(
	"chrome://messenger/content/messageWindow.xhtml",
	"chrome://confirmbeforedelete/content/confirmbeforedelete/newwindow.js");
    
messenger.WindowListener.startListening();
