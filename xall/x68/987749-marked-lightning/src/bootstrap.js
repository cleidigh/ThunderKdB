Components.utils.import("resource://gre/modules/Services.jsm");
var { require } = Components.utils.import("resource://devtools/shared/Loader.jsm", {});
function startup(data,reason) {
    forEachOpenWindow(loadIntoWindow);
    Services.obs.addObserver(lightningObserver, "lightning-startup-done", false);
}
function shutdown(data,reason) {
    if (reason == APP_SHUTDOWN)
        return;

    forEachOpenWindow(unloadFromWindow);
    Services.obs.removeObserver(lightningObserver, "lightning-startup-done");

    // HACK WARNING: The Addon Manager does not properly clear all addon related caches on update;
    //               in order to fully update images and locales, their caches need clearing here
    //Services.obs.notifyObservers(null, "chrome-flush-caches", null);
}
function install(data,reason) { }
function uninstall(data,reason) { }

function updateMarkdown(document) {
    var d = document.getElementById("calendar-task-details-description-marked");
    if (d != null) {
        const marked = require("chrome://marked-lightning/content/lib/marked.min.js");
        var item = document.getElementById("calendar-task-tree").currentTask;
        if(item != null) {
            var description = item.hasProperty("DESCRIPTION") ? item.getProperty("DESCRIPTION") : null;
            d.children[0].contentDocument.getElementById("marked-generated").innerHTML = description != null ? marked(description) : '';
            d.children[0].contentWindow.appendJSFunctions();
        }
    }
}
function loadIntoWindow(window) {
    /* call/move your UI construction function here */
    var document = window.document; 

    var d = document.getElementById("calendar-task-details-description-marked");
    if (d != null)
        return;
    
    var i = document.createElement("iframe");
    i.setAttribute("src", "chrome://marked-lightning/content/iframe.html");
    i.setAttribute("style", "width: 100%;height: 100%;");

    var d = document.createElement("div");
    d.setAttribute("id", "calendar-task-details-description-marked");
    d.setAttribute("style", "-moz-appearance: textarea;width: 100%;");
    d.append(i);
    
    var p = document.getElementById("calendar-task-details-description-wrapper");
    if (p == null) {
        Services.obs.addObserver(lightningObserver, "lightning-startup-done", false);
        return;
    }
    p.append(d);
    
    // wait until div is appended and iframe loaded
    window.setTimeout(function() {
        updateMarkdown(document);
    }, 500);

    var lightningFunction = window.taskDetailsView.onSelect;
    window.taskDetailsView.onSelect = function(event) {
        lightningFunction.apply(event);
        updateMarkdown(document);
    };

    var old = document.getElementById("calendar-task-details-description");
    old.style.display = 'none';
}
function unloadFromWindow(window) {
        /* call/move your UI tear down function here */
        var document = window.document;
        var d = document.getElementById("calendar-task-details-description-marked");
        if (d != null)
                d.remove();

        var old = document.getElementById("calendar-task-details-description");
        old.style.display = null;
}
function forEachOpenWindow(todo)  // Apply a function to all open thunderbird windows
{
    var windows = Services.wm.getEnumerator("mail:3pane");
    while (windows.hasMoreElements())
        todo(windows.getNext().QueryInterface(Components.interfaces.nsIDOMWindow));
}

var lightningObserver = {
    observe: function(subject, topic, data) {
        loadIntoWindow(subject);
    }
}
