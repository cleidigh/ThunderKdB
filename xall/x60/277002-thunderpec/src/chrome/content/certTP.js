"use strict";

if(!tpec_org) var tpec_org = {};
if(!tpec_org.xtc) tpec_org.xtc = {};
if(!tpec_org.xtc.tp) tpec_org.xtc.tp = {};
if(!tpec_org.xtc.tp.cert) tpec_org.xtc.tp.cert = {};


tpec_org.xtc.tp.cert = function(){
  function pub(){};

  var htmlDoc = "";


  pub.init = function(){
    var certstring;
    var tmpDir;
    if("arguments" in window && window.arguments.length > 0) {
      certstring = window.arguments[0].cert;
      tmpDir = window.arguments[0].dir;
    }

    certstring = certstring.replace(new RegExp("<","ig"),"&lt;");
    certstring = certstring.replace(new RegExp(">","ig"),"&gt;");
    certstring = certstring.replace(new RegExp("\n","ig"),"<br/>");

    htmlDoc = "";
    htmlDoc += "<html>\n";
    htmlDoc += "<head>\n";
    //htmlDoc += "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=utf-8\" />\n";
    htmlDoc += "<meta http-equiv=\"Content-Type\" content=\"text/html; charset=ISO-8859-1\" />\n";
    htmlDoc += "<style type=\"text/css\">\n";
    htmlDoc += "<!--\n";
    htmlDoc += ".desc {font-size:14px;font-weight:bold;}\n";
    htmlDoc += ".value {font-size:14px;font-weight:normal;}\n";
    htmlDoc += ".valuec {font-size:14px;font-weight:normal;text-transform:capitalize;}\n";
    htmlDoc += ".redline {height:2px;background:#E52B50;padding:0px;}\n";
    htmlDoc += ".blueline {height:2px;background:#6495ED;padding:0px;}\n";
    htmlDoc += ".maintable {background:#fff;margin-left:auto;margin-right:auto;border-color:#000000;border-style:solid;border-width:2px 2px;padding:5px;}\n";
    htmlDoc += "-->\n";
    htmlDoc += "</style>\n";
    htmlDoc += "</head>\n";
    htmlDoc += "<table class=\"maintable\" width=\"100%\">\n";
    htmlDoc += "<tr><td class=\"value\">"+certstring+"</td></tr>\n";
    htmlDoc += "</table>";
    htmlDoc += "</body>\n";
    htmlDoc += "</html>\n";
    
    var filename = "cert.html";
    var xmlfile = Components.classes["@mozilla.org/file/local;1"]
      .createInstance(Components.interfaces.nsIFile);
    xmlfile.initWithPath(tmpDir);
    xmlfile.append(filename);
    var foStream = Components.classes["@mozilla.org/network/file-output-stream;1"].
                             createInstance(Components.interfaces.nsIFileOutputStream);
    //foStream.init(xmlfile, 0x02 | 0x08 | 0x20, 0600, 0); 
    foStream.init(xmlfile, 0x02 | 0x08 | 0x20, parseInt("0600", 8), 0);      //ver 1.5.2
    foStream.write(htmlDoc, htmlDoc.length);
    foStream.close();
    var ios = Components.classes["@mozilla.org/network/io-service;1"].
                getService(Components.interfaces.nsIIOService);
    var url = ios.newFileURI(xmlfile);
    
    document.getElementById("tpecCertViewer").setAttribute('src', url.spec);
  }

  pub.ok = function(){
    window.close();
  }

  pub.print = function(){
    var cert = document.getElementById("tpecCertViewer");
    cert.contentWindow.print();
  }

  return pub;
}();
