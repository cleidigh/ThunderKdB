"use strict";

/* globals browser */

var init = async () => {
    browser.userChromeJS.addWindowListener("dummy");
};

init();
