var Nict_TexTra = Nict_TexTra || {};
Nict_TexTra.api = Nict_TexTra.api || {};

Nict_TexTra.api.ENC_KEY = null;

Nict_TexTra.api.get_enc_key = function () {
    var created_key = Nict_TexTra.api.ENC_KEY;
    if (created_key) return created_key;

    var key = Nict_TexTra.browser_params.getCharPref("textra_id");
    if (!key) {
        key = Nict_TexTra.utils.get_random_string(100);
        key = Nict_TexTra.utils.get_random_string2(key);
        Nict_TexTra.browser_params.setCharPref("textra_id", key);
    }
    key = Nict_TexTra.utils.get_random_string3(key);
    Nict_TexTra.api.ENC_KEY = key;
    return key;
};

Nict_TexTra.api.encrypt = function (str) {
    if (!str) return "";
    var key = Nict_TexTra.api.get_enc_key();
    var encrypted = CryptoJS.AES.encrypt(str, key);
    return encrypted.toString();
};

Nict_TexTra.api.decrypt = function (str) {
    if (!str) return "";
    var key = Nict_TexTra.api.get_enc_key();
    var decrypted = CryptoJS.AES.decrypt(str, key);
    decrypted = decrypted.toString(CryptoJS.enc.Utf8);
    return decrypted;
};

// APIメソッドを呼ぶ前にこのメソッドを経由する。
// Chrome Strageに保存されている設定を取得する。
Nict_TexTra.api.call_api = function (func_api, func_success, func_fail, infos) {

    if (!infos) infos = {};
    infos["LOGIN_INFO"] = {
        user_name: Nict_TexTra.browser_params.getCharPref("user_name"),
        api_key: Nict_TexTra.browser_params.getCharPref("api_key"),
        api_secret: Nict_TexTra.api.decrypt(Nict_TexTra.browser_params.getCharPref("api_secret")),
        api_prot: Nict_TexTra.browser_params.getCharPref("api_prot"),
        server_url: Nict_TexTra.browser_params.getCharPref("server_url"),
        selected_lang_org: Nict_TexTra.browser_params.getCharPref("selected_lang_org"),
        selected_lang_trans: Nict_TexTra.browser_params.getCharPref("selected_lang_trans")
    };

    func_api(func_success, func_fail, infos);
};

Nict_TexTra.api.get_api_url = function (api_id, infos) {
    var login_info = infos["LOGIN_INFO"];
    return login_info.api_prot + "://" + login_info.server_url + "/api/" + api_id + "/";
};

// 言語判定
Nict_TexTra.api.judge_lang = function (func_success, func_fail, infos) {

    var url = Nict_TexTra.api.get_api_url("langdetect", infos);

    if (!infos) infos = {};
    infos["REQ_PARAMS"] = [
        ["text", infos["text"]]
    ];
    Nict_TexTra.api.call_api2(url, func_success, func_fail, infos);

};

// 翻訳APIのURLを取得する
Nict_TexTra.api.get_url_MT_API = function (lang_org, lang_trans, infos) {

    var urls = JSON.parse(Nict_TexTra.browser_params.getCharPref("mt_api_urls"));
    var url = urls[lang_org + "_" + lang_trans];
    if (!url) {
        url = Nict_TexTra.api.get_api_url("mt/generalN_[lang1]_[lang2]", infos);
        url = url.replace("[lang1]", lang_org);
        url = url.replace("[lang2]", lang_trans);
    }

    return url;

};

// 翻訳
Nict_TexTra.api.trans_text = function (func_success, func_fail, infos) {

    var login_info = infos["LOGIN_INFO"];

    var lang_org = infos["lang_org"];
    var lang_trans = infos["lang_trans"];
    if (!lang_org) lang_org = infos["LOGIN_INFO"]["selected_lang_org"];
    if (!lang_trans) lang_trans = infos["LOGIN_INFO"]["selected_lang_trans"];
    var url = Nict_TexTra.api.get_url_MT_API(lang_org, lang_trans, infos);

    infos["REQ_PARAMS"] = [
        ["text", infos["text_org"]],
        ["split", "1"]
    ];
    Nict_TexTra.api.call_api2(url, func_success, func_fail, infos);

};

// 類似文→翻訳（文章区切り）
Nict_TexTra.api.trans_text_split = function (func_success, func_fail, infos) {

    var lang_org = infos["lang_org"];
    var lang_trans = infos["lang_trans"];
    if (!lang_org) { lang_org = infos["LOGIN_INFO"]["selected_lang_org"]; infos["lang_org"] = lang_org; }
    if (!lang_trans) { lang_trans = infos["LOGIN_INFO"]["selected_lang_trans"]; infos["lang_trans"] = lang_trans; }

    // ② 翻訳対象の原文を文分割
    var func_split_sentence = function (infos) {

        // ④-1 ①で取得した類似文用の対訳辞書
        var dic_cds = null;
        {
            var login_info = login_info;
            var list_taiyaku_dic = infos["resultset"]["result"]["list"];

            var list_dic_cd = [];
            $.each(list_taiyaku_dic, function (ind, taiyaku_dic) {
                list_dic_cd.push(taiyaku_dic["id"]);
            });
            dic_cds = list_dic_cd.join(",");
        }

        // ③ 分割された文の類似文取得、翻訳取得
        var func_ruiji_and_trans = function (infos) {

            var texts_org = infos["resultset"]["result"]["text"];
            var login_info = infos["LOGIN_INFO"];

            var texts_org_temp = [];
            $.each(texts_org, function (ind, text_org) {
                if (text_org && text_org.trim() !== "") texts_org_temp.push(text_org);
            });
            texts_org = texts_org_temp;
            var len_split = texts_org.length;
            infos["resultset"]["result"]["text"] = texts_org;

            $.each(texts_org, function (ind, text_org) {

                // ⑤ 翻訳
                var func_trans = function (infos) {
                    var infos_text = {};
                    infos_text["LOGIN_INFO"] = login_info;
                    infos_text["text_org"] = text_org;
                    infos_text["lang_org"] = lang_org;
                    infos_text["lang_trans"] = lang_trans;
                    infos_text["ind_split"] = ind;
                    infos_text["len_split"] = len_split;

                    var func_success_trans = function (infos) {
                        infos["text_org"] = infos["resultset"]["request"]["text"];
                        infos["text_trans"] = infos["resultset"]["result"]["text"];
                        infos["src"] = "trans";
                        return func_success(infos);
                    };

                    Nict_TexTra.api.trans_text(func_success_trans, func_fail, infos_text);
                };

                if (!dic_cds) { func_trans(infos); return true; }

                // ④-2 API 類似文
                var func_success_search_ruiji = function (infos) {
                    var list_ruiji = infos["resultset"]["result"]["sim"];
                    if (list_ruiji.length > 0) {
                        infos["text_org"] = infos["resultset"]["request"]["text"];
                        infos["text_trans"] = list_ruiji[0]["target"];
                        infos["src"] = "ruiji";

                        return func_success(infos);
                    } else {
                        func_trans(infos);
                    }
                };

                var infos_ruiji = {};
                infos_ruiji["text"] = text_org;
                infos_ruiji["score"] = "0.9";

                infos_ruiji["lang_org"] = lang_org;
                infos_ruiji["lang_trans"] = lang_trans;
                infos_ruiji["LOGIN_INFO"] = login_info;
                infos_ruiji["ruiji_dic_cds"] = dic_cds;
                infos_ruiji["ind_split"] = ind;
                infos_ruiji["len_split"] = len_split;
                Nict_TexTra.api.search_ruijibun(func_success_search_ruiji, func_fail, infos_ruiji);

            });
        };

        // ② 翻訳対象の原文を文分割
        Nict_TexTra.api.split_sentence(func_ruiji_and_trans, func_fail, infos);

    };

    // ① 類似文用の辞書を取得
    Nict_TexTra.api.search_taiyaku_dic(func_split_sentence, func_fail, infos);

};

// 類似文検索
Nict_TexTra.api.search_ruijibun = function (func_success, func_fail, infos) {

    var url = Nict_TexTra.api.get_api_url("sim", infos);

    infos["REQ_PARAMS"] = [
        ["pid", infos["ruiji_dic_cds"]],
        ["text", infos["text"]],
        ["score", infos["score"]]
    ];

    Nict_TexTra.api.call_api2(url, func_success, func_fail, infos);

};

Nict_TexTra.api._TABLE_DIC_FOR_LANG = {
    "ja-en": "ld.ja-en", "en-ja": "ld.en-ja",
    "ja-zh-CN": "er.ja-zh-CN", "zh-CN-ja": "er.zh-CN-ja",
    "ja-ko": "kj.ja-ko", "ko-ja": "kj.ko-ja"
};

// 辞書引き
Nict_TexTra.api.refer_dic = function (func_success, func_fail, infos) {

    var url = Nict_TexTra.api.get_api_url("lookup", infos);

    var lang_org = infos["lang_org"];
    var lang_trans = infos["lang_trans"];
    if (!lang_org) lang_org = infos["LOGIN_INFO"]["selected_lang_org"];
    if (!lang_trans) lang_trans = infos["LOGIN_INFO"]["selected_lang_trans"];

    var func_refer_dic = function (infos) {

        var list_dic_info = infos["resultset"]["result"]["list"];
        var list_id = [];
        $.each(list_dic_info, function (ind, dic_info) { list_id.push(dic_info["id"]); });

        var id_big_dic = Nict_TexTra.api._TABLE_DIC_FOR_LANG[lang_org + "-" + lang_trans];
        var table_locale = document.getElementById('table_locale');
        if (id_big_dic) list_id.push(id_big_dic);
        if (list_id.length == 0) { alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes10_001")); return; } // 用語集がありません。

        infos["REQ_PARAMS"] = [
            ["text", infos["text_org"]],
            ["pid", list_id.join(",")],
            ["lang_s", lang_org]
        ];
        Nict_TexTra.api.call_api2(url, func_success, func_fail, infos);
    };

    infos["lang_org"] = lang_org;
    infos["lang_trans"] = lang_trans;
    infos["ignore_error_cd"] = ["532"];
    Nict_TexTra.api.search_term_dic(func_refer_dic, func_fail, infos);

};

// 対訳集 一覧取得
Nict_TexTra.api.search_taiyaku_dic = function (func_success, func_fail, infos) {

    var url = Nict_TexTra.api.get_api_url("list/bilingual", infos);

    var lang_org = infos["lang_org"];
    var lang_trans = infos["lang_trans"];
    if (!lang_org) lang_org = infos["LOGIN_INFO"]["selected_lang_org"];
    if (!lang_trans) lang_trans = infos["LOGIN_INFO"]["selected_lang_trans"];

    infos["REQ_PARAMS"] = [
        ["lang_s", lang_org],
        ["lang_t", lang_trans]
    ];
    infos["ignore_error_cd"] = ["532"];
    Nict_TexTra.api.call_api2(url, func_success, func_fail, infos);

};

// 対訳登録
Nict_TexTra.api.regist_taiyaku = function (func_success, func_fail, infos) {

    var url = Nict_TexTra.api.get_api_url("register/bilingual", infos);

    infos["REQ_PARAMS"] = [
        ["pid", infos["id"]],
        ["text_s", infos["text_org"]],
        ["text_t", infos["text_trans"]]
    ];
    Nict_TexTra.api.call_api2(url, func_success, func_fail, infos);

};

// 文章区切り
Nict_TexTra.api.split_sentence = function (func_success, func_fail, infos) {

    var url = Nict_TexTra.api.get_api_url("split", infos);

    var lang_org = infos["lang_org"];
    if (!lang_org) lang_org = infos["LOGIN_INFO"]["selected_lang_org"];

    infos["REQ_PARAMS"] = [
        ["lang", lang_org],
        ["text", infos["text_org"]]
    ];
    Nict_TexTra.api.call_api2(url, func_success, func_fail, infos);

};

// 用語集 検索
Nict_TexTra.api.search_term_dic = function (func_success, func_fail, infos) {

    var url = Nict_TexTra.api.get_api_url("list/term", infos);

    infos["REQ_PARAMS"] = [
        ["lang_s", infos["lang_org"]],
        ["lang_t", infos["lang_trans"]]
    ];

    infos["ignore_error_cd"] = ["532"];
    Nict_TexTra.api.call_api2(url, func_success, func_fail, infos);

};

// 用語 登録
Nict_TexTra.api.regist_term_dic = function (func_success, func_fail, infos) {

    var url = Nict_TexTra.api.get_api_url("register/term", infos);

    infos["REQ_PARAMS"] = [
        ["pid", infos["id"]],
        ["text_s", infos["term_org"]],
        ["text_t", infos["term_trans"]]
    ];
    Nict_TexTra.api.call_api2(url, func_success, func_fail, infos);

};

Nict_TexTra.api._que_req = null;
Nict_TexTra.api._executing_req = false;
Nict_TexTra.api._executing_req_last_time = new Date().getTime();

// APIを呼び出す
Nict_TexTra.api.call_api2 = function (url, func_success, func_fail, infos) {

    if (!func_fail) func_fail = Nict_TexTra.api.func_fail_api_default;
    var login_info = infos["LOGIN_INFO"];
    var params = [
        ["name", login_info["user_name"]],
        ["key", login_info["api_key"]],
        ["type", "json"]
    ];
    params = params.concat(infos["REQ_PARAMS"]);
    Nict_TexTra.utils.console_log("api url ae >> " + url + "\n" +
        "request parameters >> \n" + JSON.stringify(params));
    infos["resultset"] = null;

    var accessor = {
        consumerKey: login_info["api_key"],
        consumerSecret: login_info["api_secret"]
    };

    var message = { method: "POST", action: url, parameters: params };
    var requestBody = OAuth.formEncode(message.parameters);
    OAuth.completeRequest(message, accessor);

    var req = new XMLHttpRequest();
    req.timeout = 120 * 1000;
    req.addEventListener('loadend', function () {

        if (req.status == 200) {

            var flg_success = false;
            var obj_json = JSON.parse(this.response);
            Nict_TexTra.utils.console_log(JSON.stringify(obj_json));
            var code_res = obj_json["resultset"]["code"];
            var list_ignore = infos["ignore_error_cd"];
            if (code_res == "0" ||
                (list_ignore && $.inArray(code_res + '', list_ignore) >= 0)) {
                infos["resultset"] = obj_json["resultset"];
                func_success(infos);
                flg_success = true;
            }

            if (!flg_success) {
                infos["api_response"] = JSON.parse(this.response);
                infos["url_err"] = url;
                Nict_TexTra.api.func_fail_api(func_fail, infos, this.response);
                Nict_TexTra.utils.console_log("failed :: " + url);
                Nict_TexTra.utils.console_log(this.response);
            }

            Nict_TexTra.api._executing_req = false;

        }

    });
    req.addEventListener('error', function () {
        infos["url_err"] = url;
        Nict_TexTra.api.func_fail_api(func_fail, infos, this.response);
        Nict_TexTra.utils.console_log("api error :: " + url);
        Nict_TexTra.utils.console_log(this.response);
    });

    req.ontimeout = function (e) {
        infos["url_err"] = url;
        Nict_TexTra.api.func_fail_api(func_fail, infos, this.response);
        Nict_TexTra.utils.console_log("api timeout :: " + url);
        Nict_TexTra.utils.console_log(this.response);
    };

    req.open(message.method, message.action, true);
    req.setRequestHeader("Access-Control-Allow-Origin", "*");

    var realm = "";
    req.setRequestHeader("Authorization", OAuth.getAuthorizationHeader(realm, message.parameters));
    req.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");

    if (!Nict_TexTra.api._que_req) {
        Nict_TexTra.api._que_req = [];
        setInterval(function () { Nict_TexTra.api.func_execute_request(); }, 1000);
    }

    Nict_TexTra.api._que_req.push(
        function () { req.send(requestBody); }
    );
};

// APIを呼び出しを連続させないための処理
Nict_TexTra.api.func_execute_request = function () {

    if (new Date().getTime() - Nict_TexTra.api._executing_req_last_time < 30 * 1000) {
        Nict_TexTra.api._executing_req = false;
    }

    if (Nict_TexTra.api._executing_req) { return; }

    var func = Nict_TexTra.api._que_req.shift();
    if (func) {
        Nict_TexTra.api._executing_req = true;
        Nict_TexTra.api._executing_req_last_time = new Date().getTime();
        func();
    }

};

Nict_TexTra.api.func_fail_login = function () {
    var table_locale = document.getElementById('table_locale');
    // ログインに失敗しました。\nログイン情報の設定を行ってください。\n\n
    // またはサーバメンテナンス中の可能性があります。\n
    // みんなの自動翻訳サイトをご確認ください。\n\n
    // TexTraフォーム＞メニュー＞その他＞みんなの自動翻訳
    alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes10_002"));
};

Nict_TexTra.api.func_fail_api_default = function (infos) {

    var resp = infos["api_response"];
    var result = resp ? resp["resultset"] : null;
    var cd = result ? result["code"] : null;
    var url = infos["url_err"];

    if (cd == "500" || cd == "501" ||
        cd == "522" || cd == "523") {
        Nict_TexTra.api.func_fail_login();
    } else {
        var table_locale = document.getElementById('table_locale');
        // API処理に失敗しました。\n
        // API設定をご確認ください。\n\n
        // 原因が分からない場合は\n
        // このメッセージの画像、エラー発生時の状態を\n
        // 開発者までお知らせください。
        alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes10_003") + "\n\n" +
            "URL：" + url + "\n" +
            Nict_TexTra.utils.bundle.GetStringFromName("Mes10_004") + "：" + JSON.stringify(infos));
    }

};

Nict_TexTra.api.func_fail_api = function (func_fail_default, infos, response) {
    var table_locale = document.getElementById('table_locale');
    if (response.indexOf("503 Service Unavailable") !== -1) {
        alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes10_005")); // みんなの自動翻訳サーバが働いていません。\nしばらく、お待ち下さい。
    } else {
        func_fail_default(infos);
    }
};