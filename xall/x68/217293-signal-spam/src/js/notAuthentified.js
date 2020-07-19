var reportButton=document.getElementById("notauthentified");
reportButton.onclick=function(event) {
    event.preventDefault();
    event.cancelBubble=true;
    browser.runtime.getBackgroundPage().then((backgroundPage)=>{
        backgroundPage.openOptionsMsgHandler();
    });
};