Components.utils.import("resource://redthunderminebird/common.js");

load("resource://redthunderminebird/preference.js", this);
load("resource://redthunderminebird/redmine.js", this);
load("resource://redthunderminebird/utility.js", this);

var message = window.arguments[0];

function onLoad() {
	//選択可能なステータス一覧
	var issueStatuses = redmine.issueStatuses();
	var node = document.getElementById('status_id').childNodes[0];
	for (var i = 0; i < issueStatuses.length; i++)
	{
		utility.appendMenuitem(node, issueStatuses[i].id, issueStatuses[i].name);
	}

	//添付ファイル一覧
	var files = message.getAttachments();
	for (var i = 0; i < files.length; i++)
	{
		var row = document.createElement('row');
		var checkbox = document.createElement('checkbox');
		var label = document.createElement('label');

		checkbox.setAttribute('label', files[i].name);
		checkbox.setAttribute('class', 'attachment_data');
		if (preference.getBool('default_upload_attachments'))
			checkbox.setAttribute('checked', true);

		label.setAttribute('value', utility.formatSize(files[i].size));

		row.appendChild(checkbox);
		row.appendChild(label);

		document.getElementById('ticket_files').appendChild(row);
	}

	//初期データ設定
	var defdata = message.toObject();
	if (defdata.id == 0)
		defdata.id = '';
	var ticket = redmine.tryTicket(defdata.id);

	//タイトル設定
	if (Object.keys(ticket).length !== 0)
	{
		document.getElementById('ticket_title').value = utility.formatTicketSubject(ticket);
	}

	//フォーム設定
	defdata.assigned_to_id = ticket.assigned_to ? ticket.assigned_to.id : "";
	defdata.fixed_version_id = ticket.fixed_version ? ticket.fixed_version.id : "";
	defdata.description = ticket.description;
	defdata.status_id = ticket.status ? ticket.status.id : "";
	defdata.start_date = ticket.start_date;
	defdata.due_date = ticket.due_date;
	var elements = document.getElementsByClassName('ticket_data');
	utility.jsontoform(defdata, elements);

	onProject();
}

function onPeriod(sender, target) {
	document.getElementById(target).disabled = !sender.checked;
};

function onToggleDescription(target) {
	var node = document.getElementById(target);
	if (node.style.display === 'none')
	{
		node.style.display = '';
	}
	else
	{
		node.style.display = 'none';
	}
	window.sizeToContent();
}

function onProject() {
	//デフォルト設定用
	var user = redmine.myself();
	var project_id = message.getProjectId();

	//プロジェクト存在確認
	try
	{
		redmine.project(project_id);
	}
	catch (e)
	{
		logger.error(e);
		close();
		return window.opener.alert(bundle.getLocalString("message.notfoundproject"));
	}

	//担当者再構築
	var node = document.getElementById('assigned_to_id').childNodes[0];
	var current = document.getElementById('assigned_to_id').value;
	utility.removeChildren(node);
	utility.appendMenuitem(node, "", "");
	utility.appendMenuitem(node, user.id, bundle.getLocalString("value.myselfname"));
	var members = redmine.members(project_id);
	for (var i = 0; i < members.length; i++)
	{
		let member_user = members[i].user || {};
		if (user.id == member_user.id)
			continue;
		utility.appendMenuitem(node, member_user.id, member_user.name);
	}
	document.getElementById('assigned_to_id').value = current;

	//対象バージョン再構築
	var node = document.getElementById('fixed_version_id').childNodes[0];
	var current = document.getElementById('fixed_version_id').value;
	utility.removeChildren(node);
	utility.appendMenuitem(node, "", "");
	var versions = redmine.versions(project_id);
	for (var i = 0; i < versions.length; i++)
	{
		utility.appendMenuitem(node, versions[i].id, versions[i].name);
	}
	document.getElementById('fixed_version_id').value = current;

	window.sizeToContent();
}

function onTicket(ticket) {
	var id = document.getElementById('id').value;
	if (!ticket)
		ticket = redmine.tryTicket(id);
	var ticket_title = ticket.id ? utility.formatTicketSubject(ticket) : bundle.getLocalString("message.notfoundissue", id);

	document.getElementById('ticket_title').value = ticket_title;
	document.getElementById('description').value = ticket.description ? ticket.description : "";
	document.getElementById('status_id').value = ticket.status ? ticket.status.id : "";
	document.getElementById('assigned_to_id').value = ticket.assigned_to ? ticket.assigned_to.id : "";
	document.getElementById('fixed_version_id').value = ticket.fixed_version ? ticket.fixed_version.id : "";
}

function onRefer() {
	window.openDialog("chrome://redthunderminebird/content/refer.xul", "referDialog", "chrome,centerscreen,modal", message, function(ticket) {

		document.getElementById('id').value = ticket.id;
		// ↑でonchageは呼ばれない
		onTicket(ticket);
		return true;
	});
}

function onUpdate() {
	var id = document.getElementById('id').value;
	if (id == '')
	{
		alert(bundle.getLocalString("message.notselectissue"));
		return;
	}
	if (Object.keys(redmine.tryTicket(id)).length === 0)
	{
		alert(bundle.getLocalString("message.notfoundissue", id));
		return;
	}

	var elements = document.getElementsByClassName('ticket_data');
	var data = utility.formtojson(elements);

	data.files = [];
	var attachments = message.getAttachments();
	var fileelems = document.getElementsByClassName('attachment_data');
	for (var i = 0; i < fileelems.length; i++)
	{
		if (fileelems[i].checked)
		{
			data.files.push(attachments[i]);
		}
	}

	//コールバック呼び出し(チケット更新できたらtrue)
	if (window.arguments[1](data))
	{
		close();
	}
}
