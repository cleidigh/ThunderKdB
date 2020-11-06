window.onload = function () {

    var doc = window.document;

    doc.getElementById("btn_save").onclick = test_api;
    doc.getElementById("btn_server_url").onclick = initialize_api_url;

    chrome.storage.local.get(
        { user_name: "", api_key: "", api_secret: "", api_prot: "https", api_url: "mt-auto-minhon-mlt.ucri.jgn-x.jp" },
        function (items) {
            var api_sec = Nict_TexTra.api.decrypt(items.api_secret);

            doc.getElementById("tb_name").value = items.user_name;
            doc.getElementById("tb_key").value = items.api_key;
            doc.getElementById("tb_secret").value = api_sec;
            doc.getElementById("cmb_api_prot").value = items.api_prot;
            doc.getElementById("tb_server_url").value = items.api_url;
            infos_init = {
                user_name: items.user_name,
                api_key: items.api_key,
                api_secret: items.api_secret,
                api_prot: items.api_prot,
                api_url: items.api_url
            };
        }
    );
    doc.getElementById("create_user").onclick = function () {
        save_api_info();
        Nict_TexTra.utils.get_url_minhon(function (url) { browser.tabs.create({ url: url }); });
    };

    Nict_TexTra.utils.set_link(doc, "link_top", "./Home.html");

    adapt_multi_locale();

};

window.onblur = save_api_info;
window.onbeforeunload = save_api_info;

function save_api_info() {
    var doc = window.document;

    var user_name = doc.getElementById("tb_name").value;
    var api_key = doc.getElementById("tb_key").value;
    var api_sec = doc.getElementById("tb_secret").value;
    var prot = doc.getElementById("cmb_api_prot").value;
    var server_url = doc.getElementById("tb_server_url").value;

    var encrypted = Nict_TexTra.api.encrypt(api_sec);
    var api_secret_enc = encrypted.toString();
    browser.storage.local.set({
        user_name: user_name, api_key: api_key, api_secret: api_secret_enc,
        api_prot: prot, api_url: server_url
    });
}

function test_api() {

    save_api_info();
    var doc = window.document;

    doc.getElementById("btn_save").disabled = true;
    doc.body.style.cursor = 'wait';

    Nict_TexTra.api.call_api(Nict_TexTra.api.judge_lang,
        test_api_succeeded,
        test_api_failed, { "text": "a" });
}

function test_api_succeeded() {
    Nict_TexTra.utils.alert(I18Nmes('mes_0205')); // ログインに成功しました。
    var doc = window.document;
    doc.getElementById("btn_save").disabled = false;
    doc.body.style.cursor = 'auto';
}

function test_api_failed() {
    Nict_TexTra.utils.alert(I18Nmes('mes_0206')); // ログインに失敗しました。
    var doc = window.document;
    doc.getElementById("btn_save").disabled = false;
    doc.body.style.cursor = 'auto';
}

function initialize_api_url() {
    var doc = window.document;
    doc.getElementById("cmb_api_prot").value = "https";
    doc.getElementById("tb_server_url").value = "mt-auto-minhon-mlt.ucri.jgn-x.jp";
}

function adapt_multi_locale() {
    document.getElementById("span_title").innerText = I18Nmes('mes_0007'); // ログイン設定
    document.getElementById("span_user_name").innerText = I18Nmes('mes_0200'); // ユーザ名
    document.getElementById("span_server_settings").innerText = I18Nmes('mes_0201'); // サーバ設定
    document.getElementById("btn_server_url").value = I18Nmes('mes_0202'); // 初期化
    document.getElementById("btn_save").value = I18Nmes('mes_0203'); // 保存
    document.getElementById("link_top").innerText = I18Nmes('mes_0013'); // トップ
    document.getElementById("span_create_user").innerText = I18Nmes('mes_0204'); // ユーザ作成
    document.getElementById("span_need_not").innerText = I18Nmes('mes_0207'); // （個人情報の入力不要）
    //document.getElementById("").innerText = I18Nmes('mes_020'); //
}