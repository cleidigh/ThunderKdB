/******************************************************/
/* Initiliazation sequence */
/******************************************************/
// Retrieve buttons
let gCalButton = document.getElementById("gcal");
let modeSwitcher = document.getElementById("switchMode");
let accountAttacher = document.getElementById("addAccount");
let accountSwitcher = document.getElementById("switchAccount");
let signOutButton = document.getElementById("signout");

// Initialize the switch button per local storage value
let gettingItem = browser.storage.local.get("darkModeGCalTab");
gettingItem.then(onGot, onError);

// Initialize id of active Google Calendar tab
let tabsId = null;

// Add click listeners to page
gCalButton.addEventListener("click", openGoogleCalendar);
modeSwitcher.addEventListener("click", switchMode);
accountAttacher.addEventListener("click", addAccount);
accountSwitcher.addEventListener("click", switchAccount);
signOutButton.addEventListener("click", disconnect);

keepTabUnique();

/******************************************************/
/* Function definitions */
/******************************************************/

/** Function that opens a Thunderbird tab.
 * */
function openOrUpdateTab(url) {
    tabProperties = {
        active: true,
        url: url,
    };

    if (tabsId === null) {
        console.log(tabsId);
        browser.tabs.create(tabProperties);
        keepTabUnique();
    } else {
        console.log(tabsId);
        browser.tabs.update(tabsId, tabProperties);
        keepTabUnique();
    }
}

/** Wraps openOrUpdateTab for opening the tab */
function openGoogleCalendar() {
    openOrUpdateTab("https://www.google.com/calendar");
}

/** Wraps openOrUpdateTab for connecting to a new
 * account
 * */
function addAccount() {
    openOrUpdateTab("https://accounts.google.com/AddSession?sacu=1&continue=https%3A%2F%2Fwww.google.com%2Fcalendar");
}

/** Wraps openOrUpdateTab for switching to another
 * account
 * */
function switchAccount() {
    openOrUpdateTab("https://accounts.google.com/AccountChooser?continue=https%3A%2F%2Fwww.google.com%2Fcalendar");
}

/** Wraps openOrUpdateTab for disconnecting from the
 * account(s)
 * */
function disconnect() {
    openOrUpdateTab("https://accounts.google.com/Logout?continue=https://calendar.google.com/");
}

/** Function that looks for an open Google Calendar
 * tab in Thunderbird
 * */
function keepTabUnique() {
    const urlGCalTab = ["https://calendar.google.com/*", "https://accounts.google.com/*", "https://google.com/calendar*"];

    let querying = browser.tabs.query({ url: urlGCalTab, currentWindow: true });
    querying.then(retrieveGCalTab, onError);
}

/** Function executed after a Google Calendar tab is
 * sought. If there is one, it returns the corresponding
 * tab id. If there is none, it returns null.
 * */
function retrieveGCalTab(tabs) {
    if (tabs.length >= 1) {
        for (let tab of tabs) {
            tabsId = tab.id;
        }
    } else {
        return (tabsId = null);
    }
}

/** Function that synchronizes the switch button with
 * the dark mode value in local storage.
 * Called if local storage value retrieve succeeded.
 * */
function onGot(item) {
    for (let key in item) {
        if (key === "darkModeGCalTab") {
            let darkMode = item[key];
            modeSwitcher.checked = darkMode;
            if (darkMode) {
                setDarkMode();
            }
            if (!darkMode) {
                setLightMode();
            }
        }
    }
}

/** Function that log error in console.
 * Called if local storage value retrieve or if tab
 * scanning to find a Google Calndar tab in Thunderbird
 * failed.
 * */
function onError(error) {
    console.log(`Error GCT: ${error}`);
}

/** Function triggered when "Dark" button is switched on/off
 * */
function switchMode() {
    let buttonValue = document.getElementById("switchMode").checked ? true : false;
    browser.storage.local.set({
        darkModeGCalTab: buttonValue,
    });
    if (buttonValue) {
        setDarkMode();
    }
    if (!buttonValue) {
        setLightMode();
    }
}

/** Function that sets the popup to its light mode
 * */
function setLightMode() {
    document.body.style.setProperty("color", "#323232");
    document.body.style.setProperty("background-color", "#dcdcdc");
}

/** Function that sets the popup to its dark mode
 * */
function setDarkMode() {
    document.body.style.setProperty("color", "#dcdcdc");
    document.body.style.setProperty("background-color", "#323232");
}
