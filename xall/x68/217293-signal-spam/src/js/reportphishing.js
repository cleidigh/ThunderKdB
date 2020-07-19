
var query = { active: true, currentWindow: true };
var currentURL;

verifrom.tabs.query(query,function(tabs){
    if (tabs && tabs.length>0 && tabs[0].url) {
        currentURL=tabs[0].url;
        if (!verifrom.appInfo.safari && /^(about|chrome|safari-extension):/i.test(tabs[0].url)) {
            verifrom.console.log(4,`tabs query - url ${tabs[0].url} is about or chrome or safari extension protocol`,tabs);
            if (verifrom.appInfo.edge!=true)
                window.close();
        }
    } else {
        if (!verifrom.appInfo.safari) {
            verifrom.console.log(4,'tabs query - no tab or no url opened ??',tabs);
            if (verifrom.appInfo.edge!=true)
                window.close();
        }
    }
});

if (verifrom.appInfo.safari)
{
    safari.application.addEventListener("popover", function(event) {
        verifrom.console.log(4,'Popup opened : '+event.target.identifier);
        if (event.target.identifier !== 'ReportPhishing')
            return;
        $('#spinner').fadeOut("fast");
        $('#signaler').fadeIn("fast");
    }, true);
}

var reportButton = document.getElementById("signaler");
reportButton.onclick = function (event) {
    verifrom.message.toBackground({action: "reportURL",url:currentURL}, {channel: "reportURL"});
    $('#signaler').fadeOut("fast", function () {
        $('#spinner').fadeIn("fast");
        setTimeout(function () {
            if (verifrom.appInfo.safari)
                safari.extension.toolbarItems[0].popover.hide();
            else window.close();
        }, 1500);
    });
};

var optionsButton = document.getElementById("gears");
optionsButton.onclick = function (event) {
    verifrom.message.toBackground({action: "openOptions"}, {channel: "openOptions"});
    setTimeout(function () {
        if (verifrom.appInfo.safari)
            safari.extension.toolbarItems[0].popover.hide();
        else window.close();
    }, 600);
};