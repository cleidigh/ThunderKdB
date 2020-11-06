window.onload = function () {

    var doc = window.document;

    Nict_TexTra.utils.add_lang_to_select_box(doc.getElementById('lang1'), 'ja');
    Nict_TexTra.utils.add_lang_to_select_box(doc.getElementById('lang2'), 'en');
    load_func();

    $("#bt_lang_replace").click(function () {
        Nict_TexTra.utils.replace_lang_combo($("#lang1")[0], $("#lang2")[0]);
    });
    doc.getElementById("link_minna").onclick = function () {
        Nict_TexTra.utils.get_url_minhon(function (url) {
            browser.tabs.create({ url: url });
        });
    };
    doc.getElementById("link_help").onclick = function () {
        Nict_TexTra.utils.get_url_minhon(function (url) {
            browser.tabs.create({ url: url + "content/help/detail.html?q_pid=TOOL_TEXTRATHUNDERBIRD"});
        });
    };

    Nict_TexTra.utils.set_link(doc, "link_trans", "./Translation.html");
    Nict_TexTra.utils.set_link(doc, "link_lookup", "./Lookup_terms.html");
    Nict_TexTra.utils.set_link(doc, "link_ログイン", "./API_Settings.html");
    Nict_TexTra.utils.set_link(doc, "link_機械翻訳API", "./MT_API_settings.html");

    adapt_multi_locale();

};

function save_api_info() {
    var doc = window.document;
    var lang1 = doc.getElementById("lang1").value;
    var lang2 = doc.getElementById("lang2").value;

    var infos = {
        "selected_lang_org": lang1,
        "selected_lang_trans": lang2
    };
    chrome.storage.local.set(infos, function () { });
}

function load_func() {

    chrome.storage.local.get(
        { selected_lang_org: "ja", selected_lang_trans: "en", if_text_selected: "trans" },
        function (infos) {
            var doc = window.document;
            doc.getElementById("lang1").value = infos.selected_lang_org;
            doc.getElementById("lang2").value = infos.selected_lang_trans;
        }
    );

};

window.onblur = save_api_info;
window.onbeforeunload = save_api_info;

function adapt_multi_locale() {
    document.getElementById("span_lang1").innerText = I18Nmes('mes_0001'); // 元言語
    document.getElementById("span_lang2").innerText = I18Nmes('mes_0002'); // 訳言語
    document.getElementById("link_lookup").innerText = I18Nmes('mes_0004'); // 辞書引き
    document.getElementById("link_trans").innerText = I18Nmes('mes_0003'); // 翻訳
    document.getElementById("link_ログイン").innerText = I18Nmes('mes_0007'); // ログイン設定
    document.getElementById("link_機械翻訳API").innerText = I18Nmes('mes_0008'); // 機械翻訳API設定
    document.getElementById("link_help").innerText = I18Nmes('mes_0009'); // ヘルプ
    document.getElementById("link_minna").innerText = I18Nmes('mes_0010'); // みんなの自動翻訳
    //document.getElementById("").innerText = I18Nmes('mes_000'); // 
}