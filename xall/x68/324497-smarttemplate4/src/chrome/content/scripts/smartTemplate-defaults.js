/* specify locale descriptions for addon-manager */
pref("extensions.smarttemplate4@thunderbird.extension.description", "chrome://smartTemplate4/locale/settings.properties");

/* global settings */
pref("extensions.smartTemplate4.firstRun", true);
pref("extensions.smartTemplate4.version", "?");
pref("extensions.smartTemplate4.breaksAtTop", 0);
pref("extensions.smartTemplate4.forceParagraph", true);
pref("extensions.smartTemplate4.showStatusIcon", true);
pref("extensions.smartTemplate4.statusIconLabelMode", 2); // 0 - no label; 1 - autohide; 2 - always show 
pref("extensions.smartTemplate4.font.size", 9); /* 8pt .templateBox font size */
pref("extensions.smartTemplate4.parseSignature", false);
pref("extensions.smartTemplate4.firstLastSwap", true);
pref("extensions.smartTemplate4.defaultCharset", "ISO-8859-1");
pref("extensions.smartTemplate4.signature.encoding", "UTF-8");
pref("extensions.smartTemplate4.signature.insertDashes.plaintext", false);
pref("extensions.smartTemplate4.signature.insertDashes.html", false);
pref("extensions.smartTemplate4.signature.removeBlockQuotedSig.onFail", false); // we might have removeBlockQuotedSig.always later as a feature!#
pref("extensions.smartTemplate4.signature.replaceLF.plaintext.br", true);
pref("extensions.smartTemplate4.cursor.insertSpace", true);
pref("extensions.smartTemplate4.mime.resolveAB", true);
pref("extensions.smartTemplate4.mime.resolveAB.removeEmail", true);
pref("extensions.smartTemplate4.mime.resolveAB.preferNick", false);
pref("extensions.smartTemplate4.mime.resolveAB.displayName", false);
pref("extensions.smartTemplate4.mime.defaultFormat","name,bracketMail(angle)");
pref("extensions.smartTemplate4.names.delimiter", ",");
pref("extensions.smartTemplate4.names.capitalize", true);
pref("extensions.smartTemplate4.names.quoteIfComma", false);
pref("extensions.smartTemplate4.names.guessFromMail", true); // [Bug 26595] do not guess Name from email address part
pref("extensions.smartTemplate4.names.extractNameFromParentheses", false); // [Bug 26596] Make extracting Name from (parentheses) optional
pref("extensions.smartTemplate4.mail.suppressLink", false);
pref("extensions.smartTemplate4.plainText.preserveTextNodes", false);
pref("extensions.smartTemplate4.forwardInlineImg.delay", 200); // [BUG 26434] delay for inline image replacement when forwarding 
pref("extensions.smartTemplate4.xtodaylegacy", false); // old way of processing which temporarily inserted  %X:=today% on _EVERY_ new line 
pref("extensions.smartTemplate4.cleanDeferredButton.installer", false);
pref("extensions.smartTemplate4.files.path", ""); // location of last saved / loaded json template  
// pref("extensions.smartTemplate4.fileTemplates", false);  Test; will be removed and set to true
pref("extensions.smartTemplate4.vars.file.fileTemplateMethod", false); // use the template loader for %file% variables
pref("extensions.smartTemplate4.fileTemplates.path", ""); // location of external html templates "Stationery" for next menu config action 
pref("extensions.smartTemplate4.fileTemplates.instantPath", "") // location for path used for adhoc html template selection 
pref("extensions.smartTemplate4.dateformat.hour", "numeric"); // change to "2-digit" for forcing 2digit hours in datelocal / dateshort
pref("extensions.smartTemplate4.dateformat.day", "numeric"); // change to "2-digit" for forcing 2digit day in datelocal / dateshort
pref("extensions.smartTemplate4.dateformat.month", "numeric"); // change to "2-digit" for forcing 2digit month in dateshort
pref("extensions.smartTemplate4.dateformat.year", "numeric"); // change to "2-digit" for forcing 2digit dateshort only


/* this is a convenience function - if I change from after or during composing, delete sig */
pref("extensions.smartTemplate4.removeSigOnIdChangeAfterEdits", false);
/* header replacement rules */
pref("extensions.smartTemplate4.headers.unescape.quotes", true);
pref("extensions.smartTemplate4.expandSettings", false);

/* add change template button automatically when installing for first time */
pref("extensions.smartTemplate4.changeTemplate.button.install", true);

pref("extensions.smartTemplate4.stationery.forceReplaceQuoteHeader", true);

/* debug settings */
pref("extensions.smartTemplate4.debug", false);
pref("extensions.smartTemplate4.debug.default", true); // to disable standard log messages 
pref("extensions.smartTemplate4.hideExamples", false);
pref("extensions.smartTemplate4.debug.events", false);
pref("extensions.smartTemplate4.debug.functions", false);
pref("extensions.smartTemplate4.debug.functions.delReplyHeader", false);
pref("extensions.smartTemplate4.debug.functions.delForwardHeader", false);
pref("extensions.smartTemplate4.debug.functions.insertTemplate", false);
pref("extensions.smartTemplate4.debug.functions.extractSignature", false);
pref("extensions.smartTemplate4.debug.functions.getProcessedText", false);
pref("extensions.smartTemplate4.debug.replaceReservedWords", false);
pref("extensions.smartTemplate4.debug.deleteNodes", false);
pref("extensions.smartTemplate4.debug.composer", false);
pref("extensions.smartTemplate4.debug.images", false);
pref("extensions.smartTemplate4.debug.settings", false);
pref("extensions.smartTemplate4.debug.settings.prefs", false);
pref("extensions.smartTemplate4.debug.signatures", false);
pref("extensions.smartTemplate4.debug.regularize", false);
pref("extensions.smartTemplate4.debug.tokens", false);
pref("extensions.smartTemplate4.debug.tokens.deferred", false);
pref("extensions.smartTemplate4.debug.mime", false);
pref("extensions.smartTemplate4.debug.mime.split", false);
pref("extensions.smartTemplate4.debug.msg",false);
pref("extensions.smartTemplate4.debug.parseModifier", false);
pref("extensions.smartTemplate4.debug.fileTemplates",false);
pref("extensions.smartTemplate4.debug.fileTemplates.menus",false);
pref("extensions.smartTemplate4.debug.firstRun", false);
pref("extensions.smartTemplate4.debug.test.update", false);
pref("extensions.smartTemplate4.debug.identities", false);
pref("extensions.smartTemplate4.debug.css.styleSheets", false);
pref("extensions.smartTemplate4.debug.css.detailed", false);
pref("extensions.smartTemplate4.debug.css.AddRule", false);
pref("extensions.smartTemplate4.debug.timeZones", false);
pref("extensions.smartTemplate4.debug.timeStrings", false);
pref("extensions.smartTemplate4.debug.headers", false);
pref("extensions.smartTemplate4.debug.sandbox", false);
pref("extensions.smartTemplate4.debug.premium.licenser", false);
pref("extensions.smartTemplate4.debug.premium.rsa", false);
pref("extensions.smartTemplate4.debug.premium.testNotification", false);

// SmartTemplate License specific:
pref("extensions.smartTemplate4.licenser.forceSecondaryIdentity",false);
pref("extensions.smartTemplate4.licenseType", 0); // private license, 1-domain
pref("extensions.smartTemplate4.LicenseKey", "");
pref("extensions.smartTemplate4.silentUpdate", false);