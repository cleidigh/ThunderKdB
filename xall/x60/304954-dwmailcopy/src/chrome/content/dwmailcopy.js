
//Uniコード文字列作成
function convUnichar( val ) {
    var str = Components.classes["@mozilla.org/pref-localizedstring;1"].createInstance(Components.interfaces.nsIPrefLocalizedString);
    str.data = val;
    return str;
}

//NameSpace
if(!dwmailcopy) var dwmailcopy={};

dwmailcopy.module = function() {
  var pub = {};

//MailCopyボタン押下イベント発生
pub.godwmailcopy = function()
{
	//メッセージ編集オブジェクト
        var msgCompFields = gMsgCompose.compFields;
        Recipients2CompFields(msgCompFields);

	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
	prefs = prefs.getBranch("extensions.dwmailcopy.");

	prefs.setComplexValue("dwmailsender", Components.interfaces.nsIPrefLocalizedString, convUnichar(document.getElementById('msgIdentity').value));
        prefs.setComplexValue("dwmailsubject", Components.interfaces.nsIPrefLocalizedString, convUnichar(document.getElementById('msgSubject').value));
        prefs.setComplexValue("dwmailto", Components.interfaces.nsIPrefLocalizedString, convUnichar(msgCompFields.to));
        prefs.setComplexValue("dwmailcc", Components.interfaces.nsIPrefLocalizedString, convUnichar(msgCompFields.cc));
        prefs.setComplexValue("dwmailbcc", Components.interfaces.nsIPrefLocalizedString, convUnichar(msgCompFields.bcc));
        prefs.setComplexValue("dwmailreplyTo", Components.interfaces.nsIPrefLocalizedString, convUnichar(msgCompFields.replyTo));
        prefs.setComplexValue("dwmailmsg", Components.interfaces.nsIPrefLocalizedString, convUnichar(GetCurrentEditor().outputToString("text/plain", 0)));
        prefs.setComplexValue("dwmailmsghtml", Components.interfaces.nsIPrefLocalizedString, convUnichar(GetCurrentEditor().outputToString("text/html", 0)));
        prefs.setComplexValue("dwmailmsgtype", Components.interfaces.nsIPrefLocalizedString, convUnichar(GetCurrentEditorType()));

	//MailCopyボタン押下の記し
	prefs.setBoolPref("dwmailmode", true);

	//新規メール作成
	goOpenNewMessage();
}

//新規メール作成イベント発生
var dwstateListener = {
    NotifyComposeFieldsReady: function() {},
    NotifyComposeBodyReady: function()
    {
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
	prefs = prefs.getBranch("extensions.dwmailcopy.");

    	if( prefs.getBoolPref("dwmailmode") )
    	{
		var   editor = GetCurrentEditor();

		//タイトル分割子反転
		var reversedividesubject = prefs.getBoolPref("reverse");

		//メッセージ編集オブジェクト
		var subject = prefs.getComplexValue("dwmailsubject", Components.interfaces.nsIPrefLocalizedString).data;

		//タイトルに分割用の記しがある場合、分割子を加算する。
		    //(n/t)を探す
		    var pF1 = subject.search(/\([0-9]+\/[0-9]+\)/);
		    if( pF1 >= 0 )
		    {
			if( reversedividesubject == false )
			{
			    	//抜き出し
			    	var sCutF = subject.substr( pF1, subject.length-pF1 );
			    	var pSlash = sCutF.search(/\/[0-9]+\)/);
			    	sCutF = sCutF.substr( 1, pSlash-1 );
			    	
			    	//加算
			    	sCutF++;
			    
			    	//最後の仕上げ
			    	subject = subject.substr(0,pF1+1) +sCutF+ subject.substr( pF1+pSlash, subject.length-pF1-pSlash );
			}
			else
			{
			    	//抜き出し
			    	var sCutF = subject.substr( pF1, subject.length-pF1 );
			    	var pSlash = sCutF.search(/\/[0-9]+\)/);
				var pEndScope = sCutF.search(/\)/);
			    	sCutF = sCutF.substr( pSlash+1, pEndScope-pSlash-1 );
			    	
			    	//加算
			    	sCutF++;
			    
			    	//最後の仕上げ
			    	subject = subject.substr(0,pF1+pSlash+1) +sCutF + subject.substr( pF1+pSlash+String(sCutF).length+1, subject.length );
			}
		    }
		    else
		    //[n/t]を探す
		    var pF2 = subject.search(/[[0-9]+\/[0-9]+]/);
		    if( pF2 >= 0 )
		    {
			if( reversedividesubject == false )
			{
			    	//抜き出し
			    	var sCutF = subject.substr( pF2, subject.length-pF2 );
			    	var pSlash = sCutF.search(/\/[0-9]+]/);
			    	sCutF = sCutF.substr( 1, pSlash-1 );
			    	
			    	//加算
			    	sCutF++;
			    
			    	//最後の仕上げ
			    	subject = subject.substr(0,pF2+1) +sCutF+ subject.substr( pF2+pSlash, subject.length-pF2-pSlash );
			}
			else
			{
			    	//抜き出し
			    	var sCutF = subject.substr( pF1, subject.length-pF1 );
			    	var pSlash = sCutF.search(/\/[0-9]+\)/);
				var pEndScope = sCutF.search(/\]/);
			    	sCutF = sCutF.substr( pSlash+1, pEndScope-pSlash-1 );
			    	
			    	//加算
			    	sCutF++;
			    
			    	//最後の仕上げ
			    	subject = subject.substr(0,pF1+pSlash+1) +sCutF + subject.substr( pF1+pSlash+String(sCutF).length+1, subject.length );
			}
		    }
		    else
		    //{n/t}を探す
		    var pF3 = subject.search(/{[0-9]+\/[0-9]+}/);
		    if( pF3 >= 0 )
		    {
			if( reversedividesubject == false )
			{
			    	//抜き出し
			    	var sCutF = subject.substr( pF3, subject.length-pF3 );
			    	var pSlash = sCutF.search(/\/[0-9]+}/);
			    	sCutF = sCutF.substr( 1, pSlash-1 );
			    	
			    	//加算
			    	sCutF++;
			    
			    	//最後の仕上げ
			    	subject = subject.substr(0,pF3+1) +sCutF+ subject.substr( pF3+pSlash, subject.length-pF3-pSlash );
			}
			else
			{
			    	//抜き出し
			    	var sCutF = subject.substr( pF1, subject.length-pF1 );
			    	var pSlash = sCutF.search(/\/[0-9]+\)/);
				var pEndScope = sCutF.search(/\}/);
			    	sCutF = sCutF.substr( pSlash+1, pEndScope-pSlash-1 );
			    	
			    	//加算
			    	sCutF++;
			    
			    	//最後の仕上げ
			    	subject = subject.substr(0,pF1+pSlash+1) +sCutF + subject.substr( pF1+pSlash+String(sCutF).length+1, subject.length );
			}
		    }


		//コピー元情報をセット
		//差出人
		if( prefs.getBoolPref("sendercopy") == true )
	                document.getElementById('msgIdentity').value = prefs.getComplexValue("dwmailsender", Components.interfaces.nsIPrefLocalizedString).data;

		//タイトル
		if( prefs.getBoolPref("subjectcopy") == true )
		{
	                document.getElementById('msgSubject').value = subject;
	                gMsgCompose.compFields.subject = subject;
		}

		var msgCompFields = gMsgCompose.compFields;
		Recipients2CompFields(msgCompFields);
		
		if( prefs.getBoolPref("tocopy") == true )
			msgCompFields.to = prefs.getComplexValue("dwmailto", Components.interfaces.nsIPrefLocalizedString).data;
		if( prefs.getBoolPref("cccopy") == true )
			msgCompFields.cc = prefs.getComplexValue("dwmailcc", Components.interfaces.nsIPrefLocalizedString).data;
		if( prefs.getBoolPref("bcccopy") == true )
			msgCompFields.bcc = prefs.getComplexValue("dwmailbcc", Components.interfaces.nsIPrefLocalizedString).data;
		if( prefs.getBoolPref("replytocopy") == true )
			msgCompFields.replyTo = prefs.getComplexValue("dwmailreplyTo", Components.interfaces.nsIPrefLocalizedString).data;
		
		{
		        var wholeDocRange = editor.document.createRange();
		        var rootNode = editor.rootElement.QueryInterface(Components.interfaces.nsIDOMNode);
		        wholeDocRange.selectNodeContents(rootNode);
		        editor.selection.addRange(wholeDocRange);
		        try {
		            editor.selection.deleteFromDocument();
		        } catch(e) {
		            // The selection did not exist yet. Everything should be fine
		        }

			if( prefs.getBoolPref("messagecopy") == true )
			{
				var editortype = prefs.getComplexValue("dwmailmsgtype", Components.interfaces.nsIPrefLocalizedString).data;
				if( editortype == "htmlmail" || editortype == "html" )
				{
					//HTMLは、引用による貼付けとなる。 他に方法を探るべし
			        	editor.QueryInterface(Components.interfaces.nsIEditorMailSupport).insertAsCitedQuotation( prefs.getComplexValue("dwmailmsghtml", Components.interfaces.nsIPrefLocalizedString).data, "", true );
				}
				else
				{
			        	editor.QueryInterface(Components.interfaces.nsIEditorMailSupport).insertTextWithQuotations( prefs.getComplexValue("dwmailmsg", Components.interfaces.nsIPrefLocalizedString).data );
				}
			}
		}
		
		CompFields2Recipients(msgCompFields);
		
		prefs.setBoolPref("dwmailmode", false);
	}
    },
    ComposeProcessDone: function(aResult) {},
    SaveInFolderDone: function(folderURI) {}
};

//メッセージコンポーザイベント登録
var initListner = function()
{
	var prefs = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefService);
	prefs = prefs.getBranch("extensions.dwmailcopy.");

	gMsgCompose.RegisterStateListener( dwstateListener );
	
	try {        prefs.getBoolPref("dwmailmode");
	} catch(e) { prefs.setBoolPref("dwmailmode", false); }
}

  pub.init = function () {
    //ハンドラー設定
    if( document.getElementById("msgcomposeWindow") != null )
       document.getElementById("msgcomposeWindow").addEventListener("compose-window-init", initListner, false);
  }
  
  return pub;
}();

dwmailcopy.module.init();
