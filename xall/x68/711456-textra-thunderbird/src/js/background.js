messenger.menus.create({
    id: "textra_translation",
    title: I18Nmes("mes_0003"), // 翻訳
    contexts: ["selection"],
    onclick: translate
});

function translate(params) {
    var txt = params["selectionText"];
    browser.storage.local.set({ txt_cont_menu: txt });
    browser.browserAction.openPopup();
}

