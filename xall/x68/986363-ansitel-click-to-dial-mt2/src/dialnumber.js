function dialnumber(info, tab) {
  if (check_emptyfields() == true) {
    //window.console.log("no empty fields");

    var searchstring = info.selectionText;
    searchstring = searchstring.replace("+", "00");
    //sonderzeichen wegnehmen
    searchstring = searchstring.replace(/\D/g, "");
    if (empty(searchstring)) {
      //var mess = browser.i18n.getMessage("nodigits");
      //var alertWindow = 'alert(mess)';
      //window.console.log(browser.i18n.getMessage("nodigits"));
      //windows.executeScript({code : alertWindow});
      chrome.windows.create({
        url: "no_digits.html",
        width: 600,
        height: 200,
        type: "popup"
      });
    } else {
      const label = "Click to dial";
      let protocol = "http://";

      if (localStorage.is_https == "true") {
        protocol = "https://";
      }
      //window.console.log(searchstring+"\n"+base64_encode(searchstring));
      //window.console.log(localStorage.peer+"|"+localStorage.token+"|"+searchstring+"|"+localStorage.prefix+"\n");

      encoded_str = base64_encode(
        localStorage.peer +
          "|" +
          localStorage.token +
          "|" +
          searchstring +
          "|" +
          localStorage.prefix +
          "|" +
          label +
          "|" +
          localStorage.dialplan_nr
      );
      //window.console.log(encoded_str);
      //var bgWindow = chrome.window.open("https://"+localStorage.server_ip+"/awi/clicktodial/dial/"+encoded_str);
      chrome.windows.create({
        url:
          protocol +
          localStorage.server_ip +
          "/awi/clicktodial/dial/" +
          encoded_str,
        width: 600,
        height: 600,
        type: "popup"
      });

      //var bgWindow = window.open("https://"+localStorage.server_ip+"/awi/clicktodial/dial/"+localStorage.peer+"/"+searchstring);
      //bgWindow.close();
    }
  }
}

browser.menus.create({
  id: "call",
  title: chrome.i18n.getMessage("dial_number"),
  contexts: ["selection"],
  onclick: dialnumber
});

function check_emptyfields() {
  if (empty(localStorage.server_ip)) {
    //alert(chrome.i18n.getMessage("no_serverip"));
    chrome.windows.create({
      url: "no_server.html",
      width: 600,
      height: 200,
      type: "popup"
    });

    return false;
  } else if (empty(localStorage.token)) {
    //alert(chrome.i18n.getMessage("no_token"));

    chrome.windows.create({
      url: "no_token.html",
      width: 600,
      height: 200,
      type: "popup"
    });

    return false;
  } else if (empty(localStorage.peer) && empty(localStorage.dialplan_nr)) {
    //alert(chrome.i18n.getMessage("no_peer"));
    chrome.windows.create({
      url: "no_peer.html",
      width: 600,
      height: 200,
      type: "popup"
    });
    return false;
  } else {
    return true;
  }
}

function base64_encode(data) {
  var b64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";
  var o1,
    o2,
    o3,
    h1,
    h2,
    h3,
    h4,
    bits,
    i = 0,
    ac = 0,
    enc = "",
    tmp_arr = [];

  if (!data) {
    return data;
  }

  do {
    // pack three octets into four hexets
    o1 = data.charCodeAt(i++);
    o2 = data.charCodeAt(i++);
    o3 = data.charCodeAt(i++);

    bits = (o1 << 16) | (o2 << 8) | o3;

    h1 = (bits >> 18) & 0x3f;
    h2 = (bits >> 12) & 0x3f;
    h3 = (bits >> 6) & 0x3f;
    h4 = bits & 0x3f;

    // use hexets to index into b64, and append result to encoded string
    tmp_arr[ac++] =
      b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
  } while (i < data.length);

  enc = tmp_arr.join("");

  var r = data.length % 3;

  return (r ? enc.slice(0, r - 3) : enc) + "===".slice(r || 3);
}

function empty(mixed_var) {
  var undef, key, i, len;
  var emptyValues = [undef, null, false, 0, "", "0"];

  for (i = 0, len = emptyValues.length; i < len; i++) {
    if (mixed_var === emptyValues[i]) {
      return true;
    }
  }

  if (typeof mixed_var === "object") {
    for (key in mixed_var) {
      // TODO: should we check for own properties only?
      //if (mixed_var.hasOwnProperty(key)) {
      return false;
      //}
    }
    return true;
  }

  return false;
}
