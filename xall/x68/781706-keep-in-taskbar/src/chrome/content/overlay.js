window.addEventListener("close", function(event) {
    if(window.windowState.valueOf() != 2) {
        window.minimize();
        event.preventDefault(window.windowState.valueOf());
    }
}, false);

window.addEventListener("click", function(event) {
    if(event.target.id == "titlebar-close") {
        if(window.windowState.valueOf() != 2) {
            window.minimize();
            event.preventDefault(window.windowState.valueOf());
        }
    }
}, false);