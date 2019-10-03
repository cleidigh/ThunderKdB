if (!apiraino)  var apiraino = {};
if (!apiraino.dict_search)  apiraino.dict_search = {};

var base_url = "https://dict.leo.org/italienisch-deutsch/";

apiraino.dict_search.BrowserInit = function()
{
    var contentAreaContextMenu = document.getElementById('mailContext');
    if (contentAreaContextMenu)
        contentAreaContextMenu.addEventListener('popupshowing', apiraino.dict_search.BrowserContext, false);
};

/* Every time a new browser window is made, BrowserInit will be called */
window.addEventListener('load', apiraino.dict_search.BrowserInit, false);

/* Callback upon context-menu trigger */
apiraino.dict_search.BrowserContext = function()
{
    if (!gContextMenu)
    {
        console.debug("gContextmenu is undefined - we're fucked");
    }
    else
    {
        // gContextMenu.isTextSelected has been removed by Thunderbird
        // see: https://bugzilla.mozilla.org/show_bug.cgi?id=463003
        if (gContextMenu.isContentSelected)
        {
            var textSelection = document.commandDispatcher.focusedWindow.getSelection().toString();
            // this monkey-patching smells really bad :-)
            gContextMenu.textSelected = textSelection.trim().replace(/(\n|\r|\t)+/g, '');
        }
    }
};

/* Callback from XUL */
apiraino.dict_search.BrowserOpenLink = function(event)
{
    var lnk = '';
    if (gContextMenu.textSelected !== "")
    {
        lnk = base_url + gContextMenu.textSelected;
        console.debug('Text to be search: ' + gContextMenu.textSelected);
    }
    else
    {
        console.debug('Could not find any text selected.');
        return;
    }

    // ref: https://developer.mozilla.org/en-US/docs/Archive/Mozilla/XULRunner/Opening_a_Link_in_the_Default_Browser
    var ioservice = Components.classes["@mozilla.org/network/io-service;1"]
        .getService(Components.interfaces.nsIIOService);
    var uriToOpen = ioservice.newURI(lnk, null, null);
    var extps = Components.classes["@mozilla.org/uriloader/external-protocol-service;1"]
        .getService(Components.interfaces.nsIExternalProtocolService);
    extps.loadURI(uriToOpen, null);
};
