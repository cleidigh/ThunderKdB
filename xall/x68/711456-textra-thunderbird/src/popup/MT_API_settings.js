
window.onload = function () {

    var doc = window.document;
    doc.getElementById("lang1").value = "ja";
    doc.getElementById("lang2").value = "en";

    $("#lang1").change(function () {
        Nict_TexTra.utils.change_different_lang($("#lang1")[0], $("#lang2")[0]);
        set_api_url();
    });
    $("#lang2").change(function () {
        Nict_TexTra.utils.change_different_lang($("#lang2")[0], $("#lang1")[0]);
        set_api_url();
    });
    $("#bt_lang_replace").click(function () {
        Nict_TexTra.utils.replace_lang_combo($("#lang1")[0], $("#lang2")[0]);
        set_api_url();
    });

    $("#btn_save").click(function () { save_settings(); });
    $("#btn_default").click(function () { init_settings(); });

    Nict_TexTra.utils.add_lang_to_select_box(doc.getElementById('lang1'), 'ja');
    Nict_TexTra.utils.add_lang_to_select_box(doc.getElementById('lang2'), 'en');
    chrome.storage.local.get(
        { selected_lang_org: "ja", selected_lang_trans: "en" },
        function (infos) {
            var lang1 = infos.selected_lang_org;
            var lang2 = infos.selected_lang_trans;

            doc.getElementById("lang1").value = lang1;
            doc.getElementById("lang2").value = lang2;

            set_api_url();
        }
    );

    doc.getElementById("link_MT_list").onclick = function () {
        Nict_TexTra.utils.get_url_minhon(function (url) {
            browser.tabs.create({ url: url + 'content/mt/'});
        });
    };

    Nict_TexTra.utils.set_link(doc, "link_top", "./Home.html");

    adapt_multi_locale();

};

function save_settings() {

    var doc = window.document;
    var url_lang = doc.getElementById("txt_API_URL").value;
    var lang1 = doc.getElementById("lang1").value;
    var lang2 = doc.getElementById("lang2").value;

    if (Nict_TexTra.utils.is_empty_string(url_lang)) { alert("API URLを入力してください。"); return; }

    doc.getElementById("btn_save").disabled = true;
    doc.getElementById("btn_default").disabled = true;
    doc.body.style.cursor = 'wait';

    browser.storage.local.get("MT_API_urls").then(function (datas) {

        var urls = datas.MT_API_urls; if (!urls) urls = {};
        var key = lang1 + "_" + lang2;
        var urls_old = JSON.parse(JSON.stringify(urls));
        urls[key] = url_lang;

        browser.storage.local.set({ MT_API_urls: urls }, function () {
            Nict_TexTra.api.call_api(Nict_TexTra.api.trans_text,
                func_save, func_fail,
                { "text_org": "this is api test.", "lang_org": lang1, "lang_trans": lang2, "urls_old": urls_old });
        });

    });

}

function func_save() {
    alert("保存しました。");

    var doc = window.document;
    doc.getElementById("btn_save").disabled = false;
    doc.getElementById("btn_default").disabled = false;
    doc.body.style.cursor = 'auto';
}

function func_fail(infos) {
    browser.storage.local.set({ MT_API_urls: infos["urls_old"] });
    alert("指定されたURLでは\nAPIを呼び出すことができませんでした。");

    var doc = window.document;
    doc.getElementById("btn_save").disabled = false;
    doc.getElementById("btn_default").disabled = false;
    doc.body.style.cursor = 'auto';
}

function init_settings() {

    var doc = window.document;
    var elm_txt_url = doc.getElementById("txt_API_URL");
    elm_txt_url.value = "";

    var lang1 = doc.getElementById("lang1").value;
    var lang2 = doc.getElementById("lang2").value;

    var st1 = browser.storage.local.get("MT_API_urls");
    st1.then(function (datas) {

        var urls = datas.MT_API_urls; if (!urls) urls = {};

        var key = lang1 + "_" + lang2;
        delete urls[key];
        browser.storage.local.set({ MT_API_urls: urls });

        set_api_url();
        alert("デフォルトに設定しました。");

    });

}

function set_api_url() {

    var doc = window.document;
    var lang1 = doc.getElementById("lang1").value;
    var lang2 = doc.getElementById("lang2").value;

    Nict_TexTra.api.call_api(function (func_success, func_fail, infos) {
        Nict_TexTra.api.get_url_MT_API(lang1, lang2, infos, function (url) {
            doc.getElementById("txt_API_URL").value = url;
        }, function () {
            doc.getElementById("txt_API_URL").value = "";
        });
    });

}

function adapt_multi_locale() {
    document.getElementById("span_title").innerText = chrome.i18n.getMessage('mes_0307'); // 機械翻訳API設定
    document.getElementById("span_lang1").innerText = chrome.i18n.getMessage('mes_0001'); // 元言語
    document.getElementById("span_lang2").innerText = chrome.i18n.getMessage('mes_0002'); // 訳言語
    document.getElementById("btn_save").value = chrome.i18n.getMessage('mes_0301'); // 保存
    document.getElementById("btn_default").value = chrome.i18n.getMessage('mes_0302'); // デフォルト
    document.getElementById("link_MT_list").innerText = chrome.i18n.getMessage('mes_0303'); // 翻訳API一覧を開く
    document.getElementById("link_top").innerText = chrome.i18n.getMessage('mes_0013'); // トップ
    //document.getElementById("").innerText = chrome.i18n.getMessage('mes_000'); //
}
