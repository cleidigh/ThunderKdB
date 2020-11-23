async function main() {
    console.log("Init of subswitch - START");
    await messenger.WindowListener.registerDefaultPrefs("defaults/preferences/subjects_prefix_switch.js");
//FIXME: maybe someday. handle different skins
    await messenger.WindowListener.registerChromeUrl([
            ["content",  "subjects_prefix_switch",           "chrome/content/"],
            ["resource", "subjects_prefix_switch",           "chrome/"],
            ["resource", "subjects_prefix_switch",           "chrome/skin/classic/"],
            ["locale",   "subjects_prefix_switch", "en-US", "chrome/locale/en-US/"],
            ["locale",   "subjects_prefix_switch", "de-DE", "chrome/locale/de-DE/"],
            ["locale",   "subjects_prefix_switch", "pl-PL", "chrome/locale/pl-PL/"],
            ["locale",   "subjects_prefix_switch", "es-ES", "chrome/locale/es-ES/"],
            ["locale",   "subjects_prefix_switch", "sv-SE", "chrome/locale/sv-SE/"],
            ["locale",   "subjects_prefix_switch", "fr-FR", "chrome/locale/fr-FR/"],
            ["locale",   "subjects_prefix_switch", "zh-TW", "chrome/locale/zh-TW/"]
        ]
    );

    await messenger.WindowListener.registerOptionsPage("chrome://subjects_prefix_switch/content/addonoptions.xhtml")
    //await messenger.WindowListener.registerStartupScript("chrome://quicktext/content/scripts/startup.js");

    await messenger.WindowListener.registerWindow(
        "chrome://messenger/content/messenger.xhtml",
        "chrome://subjects_prefix_switch/content/messenger.js");

    await messenger.WindowListener.registerWindow(
        "chrome://messenger/content/messengercompose/messengercompose.xhtml",
        "chrome://subjects_prefix_switch/content/messengercompose.js");

    await messenger.WindowListener.registerWindow(
        "chrome://messenger/content/customizeToolbar.xhtml",
        "chrome://subjects_prefix_switch/content/customizetoolbar.js");

    await messenger.WindowListener.startListening();

    console.log("Init of subswitch - END");
}

main();