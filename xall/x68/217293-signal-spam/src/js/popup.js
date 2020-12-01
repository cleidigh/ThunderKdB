void 0;
let href = window.document.location.href;
let loadedStatus=false;

function loaded() {
    if (loadedStatus) {
        void 0;
        return;
    }
    loadedStatus=true;
    let bgP = browser.runtime.getBackgroundPage();
    bgP.then((backgroundPage)=>{
        void 0;
        let instance = backgroundPage.verifrom.actionButton.onLoad(href,window);
        window.addEventListener("unload",instance.unloaded.bind(instance));
        window.addEventListener("close",instance.closed.bind(instance));
        void 0;
    }).catch(reason=>{
        void 0;
        loadedStatus=false;
        setTimeout(loaded,500);
    });
}

function loading() {
    void 0;
    if (document.readyState === "complete")
        loaded();
}

if (document.readyState === "complete")
    loaded();
else document.addEventListener("readystatechange",loading);

let tries=1;
let popupLoadingIntervalID=setTimeout(function checkLoaded () {
    if (loadedStatus)
        clearInterval(popupLoadingIntervalID);
    else if (tries>5) {
        loaded();
    } else {
        void 0
        setTimeout(checkLoaded,tries*300);
    }
    tries++;
},tries*300);

document.body.addEventListener("localized",()=> {
    void 0;
    let links = document.querySelectorAll(".externallink");
    if (links && links.length > 0) {
        for (let link of links) {
            link.onclick = (event) => {
                try {
                    if (event && event.cancelable)
                        event.preventDefault();
                    else if (!event || !event.target)
                        event = {target: link};
                    let url = event.target.getAttribute("href") || event.target.parentElement.getAttribute("href") ;
                    void 0;
                    if (typeof url === "string") {
                        browser.tabs.query({mailTab: true}, (tabsArray) => {
                            void 0;
                            if (tabsArray && tabsArray.length > 0) {
                                let tab = tabsArray[0];
                                browser.tabs.create({url: url, active: true});
                            }
                        });
                    }
                } catch(e) {
                }
            };
            void 0;
        }
    }
},true);
