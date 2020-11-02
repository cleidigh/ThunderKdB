function startup(data,reason) {
    Services.scriptloader.loadSubScript("chrome://marked-lightning/content/lib/marked.min.js", this, "utf-8");
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

function updateMarkdown(window, iframe) {
    var item = window.document.getElementById("calendar-task-tree").currentTask;
    if (iframe != null  && item != null) {
        var description = item.hasProperty("DESCRIPTION") ? item.getProperty("DESCRIPTION") : null;
        //srcdoc seems not to be supported by TB 68
        iframe.src = description != null ?
            'data:text/html;charset=utf-8,' + encodeURIComponent(
                '<link rel="stylesheet" href="resource://marked-lightning/skin/iframe.css">' +
                '<div>' + this.marked(description) + '</div>'
            ) : '';
        //wait for content to be loaded into iframe (onload never called!)
        window.setTimeout(function() {
            replaceLinks(iframe.contentDocument, window);
        }, 500);
    }
}
function replaceLinks(doc, window){
    var links = doc.getElementsByTagName('A');
    for (let link of links) {
        if (link.hasAttribute("href") && !link.getAttribute("href").includes("mailto") && !link.getAttribute("href").includes("thunderlink")) {
            link.addEventListener("click", (e) => {
                e.stopPropagation();
                e.preventDefault();
                window.launchBrowser(e.target.getAttribute('href'), e);
            }, true);
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
    i.setAttribute("id", "calendar-task-details-description-iframe");
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

    updateMarkdown(window, i);

    this.lightningFunction = window.taskDetailsView.onSelect;
    window.taskDetailsView.onSelect = (event) => {
        this.lightningFunction.apply(event);
        updateMarkdown(window, i);
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

    window.taskDetailsView.onSelect = this.lightningFunction;

    var old = document.getElementById("calendar-task-details-description");
    old.style.display = null;
}
function forEachOpenWindow(todo) { // Apply a function to all open thunderbird windows
    var windows = Services.wm.getEnumerator("mail:3pane");
    while (windows.hasMoreElements())
        todo(windows.getNext());
}

var lightningObserver = {
    observe: function(subject, topic, data) {
        loadIntoWindow(subject);
    }
}
