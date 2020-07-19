Nict_TexTra.utils.get_browser_params();

function window_onload() {

    var api_sec = Nict_TexTra.browser_params.getCharPref("api_secret");
    api_sec = Nict_TexTra.api.decrypt(api_sec);

    document.getElementById("tb_user_name").value = Nict_TexTra.browser_params.getCharPref("user_name");
    document.getElementById("tb_api_key").value = Nict_TexTra.browser_params.getCharPref("api_key");
    document.getElementById("tb_api_secret").value = api_sec;
    document.getElementById("cb_api_prot").value = Nict_TexTra.browser_params.getCharPref("api_prot");
    document.getElementById("tb_server_url").value = Nict_TexTra.browser_params.getCharPref("server_url");

}

function btn_save() {

    document.getElementById("btn_save").disabled  = true;

    var api_sec = document.getElementById("tb_api_secret").value;
    api_sec = Nict_TexTra.api.encrypt(api_sec);

    Nict_TexTra.browser_params.setCharPref("user_name", document.getElementById("tb_user_name").value);
    Nict_TexTra.browser_params.setCharPref("api_key", document.getElementById("tb_api_key").value);
    Nict_TexTra.browser_params.setCharPref("api_secret", api_sec);
    Nict_TexTra.browser_params.setCharPref("api_prot", document.getElementById("cb_api_prot").value);
    Nict_TexTra.browser_params.setCharPref("server_url", document.getElementById("tb_server_url").value);

    var table_locale = document.getElementById('table_locale');
    Nict_TexTra.utils.check_login(function () {
        window.close();
    }, function () {
        alert(Nict_TexTra.utils.bundle.GetStringFromName("Mes03_001")); // API設定が正しくありません。
        document.getElementById("btn_save").disabled = false;
    });
    return false;
}

function init_server() {
    document.getElementById("cb_api_prot").value = "https";
    document.getElementById("tb_server_url").value = "mt-auto-minhon-mlt.ucri.jgn-x.jp";
}
