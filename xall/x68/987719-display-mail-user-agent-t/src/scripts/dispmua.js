const iId = "dispMUAicon";

browser.messageDisplayAction.onClicked.addListener((tabId) => {
  if (dispMUA.Info["ICON"] != "empty.png") {
   //promiseを返すけどthenで処理すると2回に1回エラーになるので普通に
   browser.messageDisplayAction.setPopup({popup: "content/feedback.xhtml"});
   browser.messageDisplayAction.openPopup();
  };
});

browser.messageDisplay.onMessageDisplayed.addListener((tabId, message) => {
  //console.log(`Message displayed in tab ${tabId}: ${message.subject}`);
  if (!dispMUA.loaded) {
    dispMUA.loadJSON("dispmua-database.json");
    dispMUA.loaded = true;
  }
  if (Object.keys(dispMUA.arDispMUAOverlay).length == 0) {
    const skey = "overlay";
    browser.storage.local.get(skey).then( s => {
      if (s[skey]) {
        if (s[skey].length > 0) {
          dispMUA.getOverlay();
          dispMUA.olLoaded = true;
        }
      }
    });
  }
  browser.storage.local.get("overlayChanged").then( s => {
  //browser.storage.local.get().then( s => {
    if (s["overlayChanged"]) {
      //console.log("overlay data:", s["overlay"]);
      dispMUA.getOverlay();
      browser.storage.local.set({overlayChanged: false});
    }
  });

  browser.accounts.get(message.folder.accountId).then((MailAccount) => {
    dispMUA.identityId = MailAccount.identities[0].id;
  });

  browser.messages.getFull(message.id).then((messagePart) => {
    browser.messageDisplayAction.setPopup({popup: ''});
    dispMUA.headers = messagePart.headers;
    dispMUA.Info["messageId"] = message.id;
    //dispMUA.headerdata = this.content; // all headers strings
    //Correspondence to the problem that Subject and List-ID in messagePart.headers are decoded and stored
    const mheader = "=?UTF-8?B?";
    const ascii = /^[ -~]+$/;
    Object.keys(dispMUA.headers).forEach(function (key) {
      for (let i = 0; i < dispMUA.headers[key].length; i++) {
        if (dispMUA.headers[key][i].length > 0 && !ascii.test(dispMUA.headers[key][i])) {
          dispMUA.headers[key][i] = mheader + btoa(unescape(encodeURIComponent(decodeURIComponent(escape(dispMUA.headers[key][i]))))) + "?=";
        }
      }
    });
    if (dispMUA.headers["x-mozilla-keys"] !== undefined) {
      //意味なし。空白文字は削除されるっぽく、ヘッダのみだと改行がされない。compose側のバグか？
      if (dispMUA.headers["x-mozilla-keys"][0].length == 0) dispMUA.headers["x-mozilla-keys"][0] = '\r\n'; //' '.repeat(40);
    }
    dispMUA.searchIcon("");
    const len = 10;
    let pos = dispMUA.Info["STRING"].indexOf("\n");
    let str = dispMUA.Info["STRING"];
    if (pos != -1) { str = str.substr(0, pos); }
    if (dispMUA.Info["PATH"] == "") { // overlay
      if (dispMUA.Info["ICON"].startsWith("file:///")) {
        //There is no way to read local file icons here
        browser.messageDisplayAction.setIcon({path: "empty.png"});
        browser.messageDisplayAction.setTitle({title: "!?"});
      } else {
        browser.messageDisplayAction.setIcon({path: dispMUA.Info["ICON"]});
      }
    } else {
      browser.messageDisplayAction.setIcon({path: dispMUA.Info["PATH"]+dispMUA.Info["ICON"]});
    }
    browser.messageDisplayAction.setTitle({title: str.length > len ? str.substr(0, len) + '...' : str});
    browser.storage.local.get().then((s) => {
      if (s.showIcon) {
        browser.messageDisplayAction.setTitle({title: " "});
        let target = s.iconPosition ? "expandedHeaders2" : "otherActionsBox";
        //browser.dispmuaApi.remove(id);
        if (dispMUA.Info["PATH"] == "") { // overlay
          if (dispMUA.Info["ICON"].startsWith("file:///")) {
            browser.messageDisplayAction.setTitle({title: "!?"});
          }
          browser.dispmuaApi.insertBefore("", dispMUA.Info["ICON"], dispMUA.Info["STRING"], iId, target);
        } else {
          browser.dispmuaApi.insertBefore(browser.extension.getURL(""), dispMUA.Info["PATH"]+dispMUA.Info["ICON"], dispMUA.Info["STRING"], iId, target);
        }
        browser.dispmuaApi.move(iId, target);
      }
      else browser.dispmuaApi.remove(iId);
    });
  });
});

browser.windows.onCreated.addListener((window) => {
  if (window.type == "messageDisplay") {
    //browser.dispmuaApi.create(iId, "otherActionsBox");
    //browser.dispmuaApi.insertBefore(browser.extension.getURL(""), dispMUA.Info["PATH"]+dispMUA.Info["ICON"], dispMUA.Info["STRING"], iId, "otherActionsBox");
    console.log("new messageDisplay created.")
  }
});

var port;
function connected(p) {
  port = p;
  port.onMessage.addListener(function(m) {
    //console.log("In background script, received message from content script")
    //console.log(m.greeting);
    switch (m.command) {
      case 'request MUA info':
        port.postMessage({
          "cmd": m.command,
          "mid": dispMUA.Info["messageId"],
          "eid": browser.extension.getURL(""),
          "iid": dispMUA.identityId,
          "path": dispMUA.Info["PATH"],
          "icon": dispMUA.Info["ICON"],
          "url": dispMUA.Info["URL"],
          "str": dispMUA.Info["STRING"],
          "headers" : joinObj(dispMUA.headers, ": ", "\r\n"),
          "found" : dispMUA.Info["FOUND"]
        });
        break;
      /*case 'request getOverlay':
        dispMUA.getOverlay();
        break;*/
    }
  });
}
browser.runtime.onConnect.addListener(connected);

var joinObj = function(obj, fDelimiter, sDelimiter) {
  let tmpArr = [];
  if (typeof obj === 'undefined') return '';
  if (typeof fDelimiter === 'undefined') fDelimiter = '';
  if (typeof sDelimiter === 'undefined') sDelimiter = '';
  Object.keys(obj).forEach(function (key) {
    for (let i = 0; i < obj[key].length; i++) {
      tmpArr.push(key + fDelimiter + obj[key][i]);
    }
  });
  return tmpArr.join(sDelimiter);
};

/*function disconnected(p) {
  //browser.dispmuaApi.remove("dispMUAicon");
  browser.dispmuaApi.remove(iId);
}*/
// onDisconnect not implemented...
//browser.runtime.onDisconnect.addListener(disconnected);
