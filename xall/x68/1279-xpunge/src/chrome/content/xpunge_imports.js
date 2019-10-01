var xpunge_imports_Scope = ChromeUtils.import("resource:///modules/MailUtils.jsm");

function xpunge_GetMsgFolderFromUri(uri, checkFolderAttributes) {
	return xpunge_imports_Scope.MailUtils.getExistingFolder(uri, checkFolderAttributes);
}
