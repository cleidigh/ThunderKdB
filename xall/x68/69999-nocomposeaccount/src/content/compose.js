window.addEventListener("load", function(e) { noComposeAccount.onLoad(); }, false);
//window.addEventListener("focus", function(e) { noComposeAccount.onFocus(); }, false); // set the from address to "" when the window gets focus
//window.addEventListener("unload", function(e) { noComposeAccount.onClose(); }, false); // "reset" the method when compose window closes
//window.addEventListener("compose-window-close", function(e) { noComposeAccount.onClose(); }, true);
//window.addEventListener("compose-window-reopen", function(e) { noComposeAccount.onFocus(); }, true);
window.addEventListener("compose-window-init", function(e) { noComposeAccount.onComposeInit(); }, true);
//compose-from-changed