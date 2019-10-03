Components.utils.import("resource://redthunderminebird/common.js");

load("resource://redthunderminebird/preference.js", this);
load("resource://redthunderminebird/redmine.js", this);
load("resource://redthunderminebird/utility.js", this);

var PAGE_UNIT = 10;
var currentpage = 0;
var message = window.arguments[0];

function onLoad() {
	//初期設定
	document.getElementById('ids').setAttribute('rows', PAGE_UNIT - 1);

	//初期データ取得
	var defdata = onMore();

	//初期データ投入
	var elements = document.getElementsByClassName('ticket_data');
	utility.jsontoform(defdata, elements);
}

function onMore() {
	try
	{
		//チケットループ
		var defdata = message.toObject();
		var cid = defdata.id;
		var node = document.getElementById('ids');
		var offset = currentpage++ * PAGE_UNIT;
		var tickets = redmine.tickets(defdata.project_id, offset, PAGE_UNIT);
		if (tickets.length === 0)
		{
			window.opener.alert(bundle.getLocalString("message.nomoreissue"));
			return defdata;
		}

		var exp = preference.getString('default_subject');
		var regexp = new RegExp(exp, 'gi');
		for (var i = 0; i < tickets.length; i++)
		{
			//名前が似ているなら初期選択とする
			if (defdata.id == 0 && cid == 0)
			{
				var as = tickets[i].subject;
				var bs = defdata.subject;
				if (exp)
				{
					as = tickets[i].subject.replace(regexp, '');
					bs = defdata.subject.replace(regexp, '');
				}
				if (as.indexOf(bs) != -1 || bs.indexOf(as) != -1)
				{
					cid = tickets[i].id;
				}
			}
			utility.appendListitem(node, tickets[i].id, utility.formatTicketSubject(tickets[i]));
		}
		defdata.id = cid;
		return defdata;
	}
	catch (e)
	{
		logger.error(e);
		close();
		return window.opener.alert(bundle.getLocalString("message.notfoundproject"));
	}
}

function onTicket() {
	var id = document.getElementById('ids').value;
	var description = redmine.tryTicket(id).description;
	if (description === undefined)
		bundle.getLocalString("message.notfoundissue", id);

	document.getElementById('id').value = id;
	document.getElementById('description').value = description;
}

function onRefer() {
	var newid = document.getElementById('id').value;
	if (newid == 0)
	{
		alert(bundle.getLocalString("message.notselectissue"));
		return;
	}

	var ticket = redmine.tryTicket(newid);
	if (Object.keys(ticket).length === 0)
	{
		alert(bundle.getLocalString("message.notfoundissue", newid));
		return;
	}

	if (window.arguments[1](ticket))
	{
		close();
	}
}

function onOpen() {
	var newid = document.getElementById('id').value;
	if (newid == 0)
	{
		alert(bundle.getLocalString("message.notselectissue"));
		return;
	}
	utility.openBrowser(redmine.getTicketUrl(newid, true));
}
