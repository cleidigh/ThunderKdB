async function main() {
    console.log("Init of alertswitch - START");
    await messenger.WindowListener.registerDefaultPrefs("defaults/preferences/alert_switch.js");

    await messenger.WindowListener.registerChromeUrl([
        ["content",  "alert_switch",           "jar:chrome/alert_switch.jar!/content/"],
        ["resource", "alert_switch",           "jar:chrome/alert_switch.jar!/"],
        ["resource", "alert_switch",           "jar:chrome/alert_switch.jar!/skin/classic/"],
        ["locale",   "alert_switch", "en-US",  "jar:chrome/alert_switch.jar!/locale/en-US/"],
        ["locale",   "alert_switch", "pl-PL",  "jar:chrome/alert_switch.jar!/locale/pl-PL/"],
        ["locale",   "alert_switch", "es-ES",  "jar:chrome/alert_switch.jar!/locale/es-ES/"]
        ]
    );

    await messenger.WindowListener.registerWindow(
        "chrome://messenger/content/messenger.xhtml",
        "chrome://alert_switch/content/messenger.js");

    await messenger.WindowListener.startListening();

    console.log("Init of alertswitch - END");

}

main();