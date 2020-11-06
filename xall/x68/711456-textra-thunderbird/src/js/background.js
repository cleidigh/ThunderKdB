messenger.menus.create({
    id: "textra_translation",
    title: I18Nmes("mes_0003"), // 翻訳
    contexts: ["selection"],
    onclick: translate
});

function translate(params) {
    var txt = params["selectionText"];
    browser.storage.local.set({ trans_target: txt, flg_start_trans: true });
    browser.browserAction.setPopup({ popup: "popup/Translation.html" });
    browser.browserAction.openPopup();
    browser.browserAction.setPopup({ popup: "popup/Home.html" }); // Home画面を戻す
}

