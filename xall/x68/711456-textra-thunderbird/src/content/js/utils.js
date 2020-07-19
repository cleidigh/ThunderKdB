var Nict_TexTra = Nict_TexTra || {};
Nict_TexTra.utils = Nict_TexTra.utils || {};
Nict_TexTra.utils.string_to_check_update = "update check code > " + "abcdef";

var { Services } = ChromeUtils.import("resource://gre/modules/Services.jsm");
Nict_TexTra.utils.bundle = Nict_TexTra.utils.bundle ||
    Services.strings.createBundle("chrome://TexTra/locale/locale_js.properties");

// ２つの言語コンボ間で同じ値が設定された場合の挙動
Nict_TexTra.utils.change_different_lang = function (lang_select1, lang_select2) {
    if (lang_select1.value === lang_select2.value) {
        lang_select2.value = lang_select1.value !== "en" ? "en" : "ja";
    }
};

// ２つの言語コンボ間での値の入れ替えボタンの挙動
Nict_TexTra.utils.replace_lang_combo = function (lang_select1, lang_select2) {
    var temp_lang = lang_select1.value;
    lang_select1.value = lang_select2.value;
    lang_select2.value = temp_lang;
};

// 辞書履歴 追加
Nict_TexTra.utils.add_history_refer_dic = function (txt_org, lang_org, lang_trans) {

    var dt = new Date();
    var str_time = dt.getFullYear() + "/" + (dt.getMonth() + 1) + "/" + dt.getDate() + " " +
        dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();

    var str_hist = Nict_TexTra.browser_params.getCharPref("history_ref_dic");
    var list_history = str_hist.split("\t--\n");
    var datas = [unescape(encodeURIComponent(txt_org)),
        lang_org, lang_trans, str_time].join("\t--\t");

    list_history.unshift(datas);
    if (list_history.length >= 100) list_history.length = 100;
    str_hist = list_history.join("\t--\n");

    Nict_TexTra.browser_params.setCharPref("history_ref_dic", str_hist);

};

// 辞書履歴 取得
Nict_TexTra.utils.get_history_refer_dic = function () {

    var str_hist = Nict_TexTra.browser_params.getCharPref("history_ref_dic");

    var list_history = [];
    if (str_hist) {
        var list_lines = str_hist.split("\t--\n");
        $.each(list_lines, function (ind, line) {
            if (line) {
                var datas = line.split("\t--\t");
                list_history.push({
                    "text_org": decodeURIComponent(escape(datas[0])),
                    "lang_org": datas[1],
                    "lang_trans": datas[2],
                    "time": datas[3]
                });
            }
        });
    }
    return list_history;

};

// 辞書履歴 クリア
Nict_TexTra.utils.clear_history_refer_dic = function () {
    Nict_TexTra.browser_params.setCharPref("history_ref_dic", "");
};

// 翻訳履歴 追加
Nict_TexTra.utils.add_history_translate = function (txt_org, txt_trans, lang_org, lang_trans) {

    var dt = new Date();
    var str_time = dt.getFullYear() + "/" + (dt.getMonth() + 1) + "/" + dt.getDate() + " " +
        dt.getHours() + ":" + dt.getMinutes() + ":" + dt.getSeconds();

    var str_hist = Nict_TexTra.browser_params.getCharPref("history_translate");
    var list_history = str_hist.split("\t--\n");
    var datas = [unescape(encodeURIComponent(txt_org)),
    unescape(encodeURIComponent(txt_trans)),
        lang_org, lang_trans, str_time].join("\t--\t");

    list_history.unshift(datas);
    if (list_history.length >= 100) list_history.length = 100;
    str_hist = list_history.join("\t--\n");

    Nict_TexTra.browser_params.setCharPref("history_translate", str_hist);

};

// 翻訳履歴 取得
Nict_TexTra.utils.get_history_translate = function () {
    var str_hist = Nict_TexTra.browser_params.getCharPref("history_translate");

    var list_history = [];
    if (str_hist) {
        var list_lines = str_hist.split("\t--\n");
        $.each(list_lines, function (ind, line) {
            if (line) {
                var datas = line.split("\t--\t");
                list_history.push({
                    "text_org": decodeURIComponent(escape(datas[0])),
                    "text_trans": decodeURIComponent(escape(datas[1])),
                    "lang_org": datas[2],
                    "lang_trans": datas[3],
                    "time": datas[4]
                });
            }
        });
    }
    return list_history;
};

// 翻訳履歴 クリア
Nict_TexTra.utils.clear_history_translate = function () {
    Nict_TexTra.browser_params.setCharPref("history_translate", "");
};

//言語名を返す
Nict_TexTra.utils.get_lang_name = function (lang) {
    var table_locale = document.getElementById('table_locale');
    var lang_name = Nict_TexTra.utils.bundle.GetStringFromName("Lang_" + lang);
    return lang_name ? lang_name : "？";
};

//言語を表す１文字を返す
Nict_TexTra.utils.get_lang_name_1char = function (lang) {
    var table_locale = document.getElementById('table_locale');
    var char_1 = Nict_TexTra.utils.bundle.GetStringFromName("Lang_1_char_" + lang);
    return char_1 ? char_1 : "？";
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

// コンソールにログを出力
Nict_TexTra.utils.console_log = function (msg) {
    var logger = Components.classes["@mozilla.org/consoleservice;1"].getService(Components.interfaces.nsIConsoleService);
    logger.logStringMessage(msg);
};

Nict_TexTra.utils.show_other_site = function (url) {

    var tabmail = document.getElementById("tabmail");
    if (!tabmail) {
        var mail3PaneWindow = mail3PaneWindow = Components.classes["@mozilla.org/appshell/window-mediator;1"]
            .getService(Components.interfaces.nsIWindowMediator)
            .getMostRecentWindow("mail:3pane");
        if (mail3PaneWindow) {
            tabmail = mail3PaneWindow.document.getElementById("tabmail");
            mail3PaneWindow.focus();
        }
    }
    if (tabmail) {
        tabmail.openTab("contentTab", { contentPage: url });
    }
};

Nict_TexTra.utils.get_url_minhon = function (url_tail) {
    if (!url_tail) url_tail = "";

    var api_prot = Nict_TexTra.browser_params.getCharPref("api_prot");
    var server_url = Nict_TexTra.browser_params.getCharPref("server_url");

    var url = "https://mt-auto-minhon-mlt.ucri.jgn-x.jp/" + url_tail;
    if (api_prot && server_url) {
        url = api_prot + "://" + server_url + "/" + url_tail;
        Nict_TexTra.utils.console_log(url);
    }

    return url;
};

const lang_codes = [
    'ja',
    'en',
    'zh-CN',
    'ko',
    'de',
    'fr',
    'id',
    'tr',
    'es',
    'vi',
    'my',
    'th',
    'pt',
    'pt-BR'
];

Nict_TexTra.utils.add_lang_to_select_box = function (select_box, value) {

    let len = lang_codes.length;
    for (let ind = 0; ind < len; ind++) {
        let lang = lang_codes[ind];
        select_box.appendItem(Nict_TexTra.utils.get_lang_name(lang), lang);
    }
    select_box.value = value;

};

Nict_TexTra.utils.chars_for_random = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

Nict_TexTra.utils.get_random_string = function (len) {
    var chrs = Nict_TexTra.utils.chars_for_random;
    var clen = chrs.length;
    var r = "";
    for (var i = 0; i < len; i++) {
        r += chrs[Math.floor(Math.random() * clen)];
    }
    return r;
};

Nict_TexTra.utils.get_random_string2 = function (str) {
    var r = "";
    var len = str.length;
    var chrs = Nict_TexTra.utils.chars_for_random;
    var chrs_len = chrs.length;
    for (var i = 0; i < len; i++) {
        var ii = (chrs.indexOf(str[i]) + i + 1) % chrs_len;
        r += chrs[ii];
    }
    return r;
};

Nict_TexTra.utils.get_random_string3 = function (str) {
    var r = "";
    var len = str.length;
    var chrs = Nict_TexTra.utils.chars_for_random;
    var chrs_len = chrs.length;
    for (var i = 0; i < len; i++) {
        var ii = (chrs.indexOf(str[i]) - (i + 1) + chrs_len) % chrs_len;
        r += chrs[ii];
    }
    return r;
};
