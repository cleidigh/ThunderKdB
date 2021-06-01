browser.WindowListener.registerChromeUrl([
  ["content",  "folderflags",          "chrome/content/"],
  ["locale",   "folderflags", "bg-BG", "chrome/locale/bg-BG/"],
  ["locale",   "folderflags", "cs-CZ", "chrome/locale/cz-CZ/"],
  ["locale",   "folderflags", "de",    "chrome/locale/de/"],
  ["locale",   "folderflags", "en-US", "chrome/locale/en/"],
  ["locale",   "folderflags", "es-ES", "chrome/locale/es-ES/"],
  ["locale",   "folderflags", "it",    "chrome/locale/it/"],
  ["locale",   "folderflags", "ja-JP", "chrome/locale/ja-JP/"],
  ["locale",   "folderflags", "pt-BR", "chrome/locale/pt-BR/"],
  ["locale",   "folderflags", "pt-PT", "chrome/locale/pt-PT/"],
  ["locale",   "folderflags", "sk-SK", "chrome/locale/sk-SK/"],
  ["locale",   "folderflags", "sr",    "chrome/locale/sr/"],
  ["locale",   "folderflags", "sv-SE", "chrome/locale/sv-SE/"],
  ["locale",   "folderflags", "zh-CN", "chrome/locale/zh-CN/"],
]);

// For Thunderbird 78.0 and later
browser.WindowListener.registerWindow(
  "chrome://messenger/content/folderProps.xhtml",
  "chrome://folderflags/content/folderProps.js");

// For Thunderbird 68
browser.WindowListener.registerWindow(
  "chrome://messenger/content/folderProps.xul",
  "chrome://folderflags/content/folderProps.js");

browser.WindowListener.startListening();
