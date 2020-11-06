var Nict_TexTra = Nict_TexTra || {};
Nict_TexTra.utils = Nict_TexTra.utils || {};
var I18Nmes = chrome.i18n.getMessage;

// 辞書履歴 追加
Nict_TexTra.utils.add_history_refer_dic = function (txt_org, lang_org, lang_trans, func_success) {

    chrome.storage.local.get(
        { "history_refer_dic": "" },
        function (items) {

            var dt = new Date();
            var str_time = dt.getFullYear() + "/" + (dt.getMonth() + 1) + "/" + dt.getDate() + " " +
                dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();

            var str_hist = items["history_refer_dic"];
            var list_his = str_hist ? str_hist.split("\t--\n") : [];
            var list_his2 = [];
            var ref_data = [txt_org, lang_org, lang_trans, str_time].join("\t--\t");

            $.each(list_his, function (ind, his) {
                if (his != ref_data) list_his2.push(his);
            });

            list_his2.unshift(ref_data);
            if (list_his2.length >= 100) list_his2.length = 100;

            var infos = {
                "history_refer_dic": list_his2.join("\t--\n")
            };

            chrome.storage.local.set(infos, func_success);
        }
    );

};

// 辞書履歴 取得
Nict_TexTra.utils.get_history_refer_dic = function (func_success) {
    chrome.storage.local.get(
        { "history_refer_dic": "" },
        function (items) {

            var str_hist = items["history_refer_dic"];
            var list_his = str_hist.split("\t--\n");
            var list_his2 = [];

            if (str_hist) {
                $.each(list_his, function (ind, his) {
                    var datas = his.split("\t--\t");
                    list_his2.push({
                        "text_org": datas[0],
                        "lang_org": datas[1],
                        "lang_trans": datas[2],
                        "time": datas[3]
                    });
                });
            }

            var infos = { "history_refer_dic": list_his2 };
            func_success(infos);
        }
    );
};

// 辞書履歴 クリア
Nict_TexTra.utils.clear_history_refer_dic = function (txt_org, lang_org, lang_trans) {
    chrome.storage.local.set({ "history_refer_dic": "" }, function () { });
};


// 翻訳履歴 追加
Nict_TexTra.utils.add_history_translate = function (txt_org, txt_trans, lang_org, lang_trans) {

    chrome.storage.local.get(
        { "history_translate": "" },
        function (items) {

            var dt = new Date();
            var str_time = dt.getFullYear() + "/" + (dt.getMonth() + 1) + "/" + dt.getDate() + " " +
                dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();

            var str_hist = items["history_translate"];
            var list_his = str_hist ? str_hist.split("\t--\n") : [];
            var list_his2 = [];
            var ref_data = [txt_org, txt_trans, lang_org, lang_trans, str_time].join("\t--\t");

            $.each(list_his, function (ind, his) {
                if (his != ref_data) list_his2.push(his);
            });

            list_his2.unshift(ref_data);
            if (list_his2.length >= 100) list_his2.length = 100;

            var infos = {
                "history_translate": list_his2.join("\t--\n")
            };
            chrome.storage.local.set(infos, function () { });

        }
    );

};

// 翻訳履歴 取得
Nict_TexTra.utils.get_history_translate = function (func_success) {
    chrome.storage.local.get(
        { "history_translate": "" },
        function (items) {

            var str_hist = items["history_translate"];
            var list_his = str_hist.split("\t--\n");
            var list_his2 = [];

            if (str_hist) {
                $.each(list_his, function (ind, his) {
                    var datas = his.split("\t--\t");
                    list_his2.push({
                        "text_org": datas[0],
                        "text_trans": datas[1],
                        "lang_org": datas[2],
                        "lang_trans": datas[3],
                        "time": datas[4]
                    });
                });
            }

            var infos = { "history_translate": list_his2 };
            func_success(infos);
        }
    );
};

// 翻訳履歴 クリア
Nict_TexTra.utils.clear_history_translate = function (txt_org, lang_org, lang_trans) {
    chrome.storage.local.set({ "history_translate": "" }, function () { });
};

// 言語コード→言語名を表す１文字
Nict_TexTra.utils.get_lang_name_1char = function (lang) {
    switch (lang) {
        case "ja": return I18Nmes('mes_1020'); // 日
        case "en": return I18Nmes('mes_1021'); // 英
        case "zh-CN": return I18Nmes('mes_1022'); // 中
        case "ko": return I18Nmes('mes_1023'); // 韓
        case 'de': return I18Nmes('mes_1024'); // 独
        case 'fr': return I18Nmes('mes_1025'); // 仏
        case 'id': return I18Nmes('mes_1026'); // 稲
        case 'tr': return I18Nmes('mes_1027'); // 比
        case 'es': return I18Nmes('mes_1028'); // 西
        case 'vi': return I18Nmes('mes_1029'); // 越
        case 'my': return I18Nmes('mes_1030'); // 緬
        case 'th': return I18Nmes('mes_1031'); // 泰
        case 'pt': return I18Nmes('mes_1032'); // 葡
        case 'pt-BR': return I18Nmes('mes_1033'); // 葡ブ
        default: return "？";
    }
};

// 言語を２つ指定して「日英」のような文字列を返す
Nict_TexTra.utils.get_2lang_name = function (lang_org, lang_trans) {
    return Nict_TexTra.utils.get_lang_name_1char(lang_org) + Nict_TexTra.utils.get_lang_name_1char(lang_trans);
};

// ログインチェック
Nict_TexTra.utils.check_login = function (func_login_success, func_login_fail) {
    Nict_TexTra.api.call_api(Nict_TexTra.api.judge_lang, func_login_success, func_login_fail, { "text": "a" });
};

// ブラウザに保存した情報を読みだす
Nict_TexTra.utils.get_browser_params = function () {
    var ff_sets = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
    Nict_TexTra.browser_params = Nict_TexTra.browser_params || ff_sets.getBranch("extensions.TexTra.");
};

//対象のタグの子要素を全削除
Nict_TexTra.utils.remove_element_children = function (elm) {
    while (elm.firstChild) elm.removeChild(elm.firstChild);
};

Nict_TexTra.utils.show_alert = function (message) {
    message = message.replace(/\n/g, '\\n');
    browser.tabs.executeScript({ code: "alert('" + message + "')" });
};

// 言語を返す
Nict_TexTra.utils.get_lang_set = function () {
    return lang_items;
};

// 言語コンボに値をセットする
Nict_TexTra.utils.set_lang_list = function (doc, combo) {
    var list_lang = Nict_TexTra.utils.get_lang_set();
    list_lang.forEach(function (value) {
        var option = doc.createElement("option");
        option.value = value[0];
        option.innerText = value[1];
        combo.appendChild(option);
    });
};

Nict_TexTra.utils.get_lang_name = function (lang) {
    var len_items = lang_items.length;
    for (ind = 0; ind < len_items; ind++) {
        if (lang_items[ind][0] == lang) return lang_items[ind][1];
    }
    return "？";
};

// ２つの言語の組み合わせを表す文字
Nict_TexTra.utils.get_2lang_name = function (lang_org, lang_trans) {
    return Nict_TexTra.utils.get_lang_name_1char(lang_org) + Nict_TexTra.utils.get_lang_name_1char(lang_trans);
};

//対象のタグの子要素を全削除
Nict_TexTra.utils.remove_element_children = function (elm) {
    while (elm.firstChild) elm.removeChild(elm.firstChild);
};

Nict_TexTra.utils.get_url_minhon = function (func_next) {
    chrome.storage.local.get({ api_prot: "", api_url: "" },
        function (infos) {
            var url = "https://mt-auto-minhon-mlt.ucri.jgn-x.jp/";
            if (infos.api_prot) {
                url = infos.api_prot + "://" + infos.api_url + "/";
            }
            func_next(url);
        }
    );
};

Nict_TexTra.utils.alert = function (message) {
    alert("TexTra:\n" + message);
};

Nict_TexTra.utils.alert_by_id = function (id_message) {
    Nict_TexTra.utils.alert(I18Nmes(id_message));
};

Nict_TexTra.utils.is_empty_string = function (txt) {
    if (!txt) return true;
    for (ind = 0; ind < txt.length; ind++) {
        if (txt[ind].match(/\p{blank}/)) return true;
    }
    return false;
};

Nict_TexTra.utils.show_help = function () {
    var lang = Nict_TexTra.utils.get_browser_lang();
    var lang_help = 'ja';
    if (lang == 'en') lang_help = 'en';
    var url_help = "../manual/" + lang_help + "/main.html";
    browser.tabs.create({ url: url_help});
};

Nict_TexTra.utils.remove_all_children = function (elm) {
    while (elm.firstChild) elm.removeChild(elm.firstChild);
};

// ２つの言語コンボ間で同じ値が設定された場合の挙動
Nict_TexTra.utils.change_different_lang = function (lang_select1, lang_select2) {
    if (lang_select1.value == lang_select2.value) {
        lang_select2.value = (lang_select1.value != "en" ? "en" : "ja");
    }
};

// ２つの言語コンボ間での値の入れ替えボタンの挙動
Nict_TexTra.utils.replace_lang_combo = function (lang_select1, lang_select2) {
    var temp_lang = lang_select1.value;
    lang_select1.value = lang_select2.value;
    lang_select2.value = temp_lang;
};

const lang_items = [
    ['ja', I18Nmes('mes_1000')], // 日本語
    ['en', I18Nmes('mes_1001')], // 英語
    ['zh-CN', I18Nmes('mes_1002')], // 中国語
    ['ko', I18Nmes('mes_1003')], // 韓国語
    ['de', I18Nmes('mes_1004')], // ドイツ語
    ['fr', I18Nmes('mes_1005')], // フランス語
    ['id', I18Nmes('mes_1006')], // インドネシア語
    ['tr', I18Nmes('mes_1007')], // フィリピン語
    ['es', I18Nmes('mes_1008')], // スペイン語
    ['vi', I18Nmes('mes_1009')], // ベトナム語
    ['my', I18Nmes('mes_1010')], // ミャンマー語
    ['th', I18Nmes('mes_1011')], // タイ語
    ['pt', I18Nmes('mes_1012')], // ポルトガル語
    ['pt-BR', I18Nmes('mes_1013')] // ポルトガル語(ブラジル)
];


Nict_TexTra.utils.add_lang_to_select_box = function (select_box, value) {

    let len = lang_items.length;
    let doc = window.document;
    for (let ind = 0; ind < len; ind++) {
        let op = doc.createElement('option');
        let lang_item = lang_items[ind];
        op.value = lang_item[0];
        op.text = lang_item[1];
        select_box.appendChild(op);
    }
    select_box.value = value;
};

// 文字列を指定バイトで切り取る
Nict_TexTra.utils.cut_str = function (str, length) {
    var chars = str.split('');
    var len_chars = chars.length;
    var sum_size = 0;
    var ind = 0;
    for (; ind < len_chars; ind++) {
        sum_size += (new Blob([chars[ind]])).size;
        if (length < sum_size) break;
    }
    return str.substr(0, ind);
};

Nict_TexTra.utils.get_browser_lang = function () {
    var lang = chrome.i18n.getUILanguage() ||
        (window.navigator.languages && window.navigator.languages[0]) ||
        window.navigator.language ||
        window.navigator.userLanguage ||
        window.navigator.browserLanguage;
    return lang.substr(0, 2);
};

Nict_TexTra.utils.set_link = function (doc, elm_name, url) {
    doc.getElementById(elm_name).onclick = function () { window.location.href = url; };
};
