if (/Firefox/.test(navigator.userAgent)===true) {
    var stopPhishingLocales = null;

    var phishingURL;
    var phishingId = location.search.replace('?', '');
    if (/-[0-9]*$/.test(phishingId))
        phishingId = phishingId.replace(/(^[^-]*).*/, '$1');
    var mouseTimeout;
    var PARAM = JSON.parse(localStorage.getItem(extensionConfig.appInfo.extensionName + 'PARAMS'));
    var tabId;
    void 0;

    chrome.tabs.getCurrent(function (currentTab) {
        tabId = currentTab.id;
        phishingURL = JSON.parse(localStorage.getItem(phishingId + '-' + tabId)).url;
        document.getElementById('url').innerText = phishingURL.length > 124 ? phishingURL.substring(0, 124) + '...' : phishingURL;
        document.getElementById('href').href = phishingURL;
    });

    document.getElementById('bouton').addEventListener('click', function (e) {
        localStorage.setItem(phishingId + '-' + tabId, JSON.stringify({
            mutex: true,
            DBtimeout: Date.now() + parseInt(PARAM.PHISHING_ALERT_TIMEOUT) * 1000
        }));
        window.location.href = phishingURL;
    });

    document.getElementById('url').addEventListener('click', function (e) {
        e.preventDefault();
        return false;
    });

    document.getElementById('href').addEventListener('mouseover', function (e) {
        mouseTimeout = setTimeout(function () {
            document.getElementById('url').innerText = phishingURL;
        }, 500);
    });

    document.getElementById('href').addEventListener('mouseout', function (e) {
        if (mouseTimeout)
            clearTimeout(mouseTimeout);
        mouseTimeout = undefined;
        document.getElementById('url').innerText = phishingURL.length > 124 ? phishingURL.substring(0, 124) + '...' : phishingURL;
    });

    document.getElementById('retour').addEventListener('click', function (e) {
        setTimeout(function () {
            try {
                localStorage.removeItem(phishingId + '-' + tabId);
            } catch (e) {
            }
            ;
            window.close();
        }, 1000);
        window.history.go(-1);
    });

    document.getElementById('negative').addEventListener('click', function (e) {
        var http = new XMLHttpRequest();
        var url = PARAM.URL_FALSE_POSITIVE;
        try {
            localStorage.setItem(phishingId + '-falsePositive', JSON.stringify({
                mutex: true,
                DBtimeout: Date.now() + parseInt(PARAM.FALSEPOSITIVE_ALERT_TIMEOUT) * 1000
            }));
        } catch (e) {
        }
        ;
        http.open("POST", url, true);
        http.setRequestHeader("Content-type", "application/json");
        http.send(JSON.stringify({"url": phishingURL}));
        document.getElementById('faussealerte').innerText = stopPhishingLocales.phishingAlert.falsePositiveOK;
        setTimeout(function () {
            window.location.href = phishingURL;
        }, 1000);
    });
} else {
    var stopPhishingLocales=null;
    var phishingURL;
    var phishingId=location.search.replace('?','');
    var mouseTimeout;
    var PARAM=JSON.parse(localStorage.getItem(extensionConfig.appInfo.extensionName+'PARAMS'));
    var tabId;
    void 0;


    verifrom.message.addListener({'channel':'phishingalert'},function(msg,sender){
        phishingURL=msg.url;
        document.getElementById('url').innerText=phishingURL.length>124 ? phishingURL.substring(0,124)+'...' : phishingURL;
        document.getElementById('href').href=phishingURL;

        document.getElementById('bouton').addEventListener('click', function(e) {
            window.onbeforeunload=undefined;
            verifrom.message.toBackground({action:'store',phishingId:phishingId, data:{url:phishingURL,mutex:true, DBtimeout:Date.now()+parseInt(PARAM.PHISHING_ALERT_TIMEOUT)*1000}},{channel:'phishingalert'});
            setTimeout(function() {
                window.location.href=phishingURL;
            }, 100);
        });

        document.getElementById('url').addEventListener('click', function(e) {
            e.preventDefault();
            return false;
        });

        document.getElementById('href').addEventListener('mouseover', function(e) {
            mouseTimeout=setTimeout(function() {
                document.getElementById('url').innerText=phishingURL;
            }, 500);
        });

        document.getElementById('href').addEventListener('mouseout', function(e) {
            if (mouseTimeout)
                clearTimeout(mouseTimeout);
            mouseTimeout=undefined;
            document.getElementById('url').textContent=phishingURL.length>124 ? phishingURL.substring(0,124)+'...' : phishingURL;
        });


        document.getElementById('retour').addEventListener('click', function(e) {
            verifrom.message.toBackground({action:'remove',phishingId:phishingId},{channel:'phishingalert'});
            setTimeout(function() {
                window.close();
            },1000);
            window.history.go(-1);
        });

        document.getElementById('negative').addEventListener('click', function(e) {
            var http = new XMLHttpRequest();
            var url = PARAM.URL_FALSE_POSITIVE;
            verifrom.message.toBackground({phishingPageAlert:true,url:phishingURL,phishingHashes:[phishingId.replace(/([^-]*)-.*/,'$1')]},{'channel':'FalsePositive'});
            document.getElementById('faussealerte').innerText=stopPhishingLocales.phishingAlert.falsePositiveOK;
            setTimeout(function() {
                window.location.href=phishingURL;
            }, 500);
        });
    });
    verifrom.message.toBackground({action:'getUrl',phishingId:phishingId},{channel:'phishingalert'});
}