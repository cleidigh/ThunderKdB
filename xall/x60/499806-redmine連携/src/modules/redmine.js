var EXPORTED_SYMBOLS = [ 'redmine' ];

Components.utils.import("resource://redthunderminebird/common.js");
Components.utils.importGlobalProperties(["XMLHttpRequest"]);

load("resource://redthunderminebird/preference.js", this);
load("resource://redthunderminebird/utility.js", this);
load("resource://redthunderminebird/cacher.js", this);

var Redmine = function() {
	logger.debug('Redmine constractor');

	var self = this;

	this.request = function(method, path, data, type) {
		logger.debug('request:', method, path);

		//設定値と引数からURL生成
		var hostname = preference.getString("redmine");
		var apikey = preference.getString("apikey");
		var delimiter = path.indexOf('?') < 0 ? '?' : '&';
		var url = hostname + '/' + path + delimiter + 'key=' + apikey;

		//コンテントタイプはデフォルトでjson
		if (type === undefined)
			type = 'application/json';

		//GETはクエリ化する
		if (method == 'GET' && data !== undefined)
		{
			url += utility.jsontoquery(data);
		}

		//リクエストボディ生成
		var body = "";
		if (method != 'GET' && data !== undefined)
		{
			switch (type)
			{
				case 'application/json':
					body = JSON.stringify(data);
					break;
				case 'application/octet-stream':
					body = data;
					break;
				default:
					throw 'undefined content-type';
			}
		}

		//リクエストを投げる
		var request = new XMLHttpRequest(Ci.nsIXMLHttpRequest);
        try
		{
			logger.debug('request request:', url);

			request.open(method, url, false);
			request.setRequestHeader("Content-Type", type);
			request.send(body);

			logger.debug('request status:', request.status);
			logger.debug('request response:', request.responseText);

			if (request.status >= 300 && request.status != 422)
				throw request;
		}
		catch (e)
		{
			throw request;
		}

		//文字列なら(多分JSON文字列なので)オブジェクトにして返却
		var result = request.responseText;
		if (result != 0)
			result = JSON.parse(result);

		return result;
	};

	this.getTicketUrl = function(id, withApiKey) {
		var url = preference.getString("redmine") + '/issues/' + id;
		if (withApiKey)
		{
			url += '?key=' + preference.getString("apikey");
		}
		return url;
	};

	this.getProjectUrl = function(id, withApiKey) {
		var url = preference.getString("redmine") + '/projects/' + id;
		if (withApiKey)
		{
			url += '?key=' + preference.getString("apikey");
		}
		return url;
	};

	this.getCreationUrl = function(message) {
		var url = preference.getString("redmine");
		var project_id = message.getProjectId();
		if (project_id !== '')
		{
			url += '/projects/' + project_id;
		}
		url += '/issues/new';
		var object = message.toObject();
		logger.debug('getCreationUrl:', object);
		url += '?issue[subject]=' + encodeURIComponent(object.subject);
		url += '&issue[description]=' + encodeURIComponent(object.description);
		logger.debug('getCreationUrl:', url);
		return url;
	};

	this.ping = function(redmine, apikey) {
		//退避
		var _redmine = preference.getString("redmine");
		var _apikey = preference.getString("apikey");

		//上書き
		if (redmine !== undefined)
			preference.setString("redmine", redmine);
		if (apikey !== undefined)
			preference.setString("apikey", apikey);

		//確認
		var result = true;
		try
		{
			//REST APIの対応可否やバージョンチェックをした方がいい
			this.request('GET', '/users/current.json');
		}
		catch (e)
		{
			result = false;
		}

		//復元
		preference.setString("redmine", _redmine);
		preference.setString("apikey", _apikey);

		return result;
	};

	this.upload = function(file) {
		logger.debug('upload:', file.name, file.data.byteLength);

		var result = this.request('POST', 'uploads.json', file.data, 'application/octet-stream');
		var upload = {
			token : result.upload.token,
			filename : file.name,
			content_type : file.contentType,
			description : '',
		};
		return upload;
	};

	this.create = function(ticket) {
		logger.debug('create:', ticket);

		try
		{
			//ファイルを登録してtokenを取得
			ticket.uploads = [];
			var files = ticket.files;
			delete ticket.files;
			for (var i = 0; i < files.length; i++)
			{
				ticket.uploads.push(this.upload(files[i]));
			}

			return this.request('POST', 'issues.json', {
				issue : ticket,
			});
		}
		catch (e)
		{
			return {};
		}
	};

	this.update = function(ticket) {
		logger.debug('update:', ticket);

		try
		{
			//ファイルを登録してtokenを取得
			ticket.uploads = [];
			var files = ticket.files || [];
			delete ticket.files;
			for (var i = 0; i < files.length; i++)
			{
				ticket.uploads.push(this.upload(files[i]));
			}

			var result = this.request('PUT', 'issues/' + ticket.id + '.json', {
				issue : ticket,
			});

			//更新したらキャッシュも消す
			cacher.remove('redmine:ticket:' + ticket.id);

			return result;
		}
		catch (e)
		{
			throw e;
		}
	};

	this.tryTicket = function(id) {
		try
		{
			return this.ticket(id);
		}
		catch (e)
		{
			return {};
		}
	};

	this.ticket = function(id) {
		logger.debug('ticket:', id);

		var response = cacher.getorset('redmine:ticket:' + id, function() {
			return self.request('GET', 'issues/' + id + '.json');
		});
		return response.issue;
	};

	this.tickets = function(project_id, offset, limit) {
		logger.debug('tickets:', project_id, offset, limit);

		var response = cacher.getorset('redmine:tickets:' + project_id + ':' + (offset + '-' + limit), function() {
			return self.request('GET', 'projects/' + project_id + '/issues.json', {
				offset : offset,
				limit : limit,
			});
		});
		return response.issues;
	};

	this.myself = function() {
		logger.debug('myself');

		var response = cacher.getorset('redmine:myself', function() {
			return self.request('GET', 'users/current.json');
		});
		return response.user;
	};

	this.project = function(project_id) {
		logger.debug('project:', project_id);

		var response = cacher.getorset('redmine:project:' + project_id, function() {
			return self.request('GET', 'projects/' + project_id + '.json?include=trackers');
		});
		return response.project;
	};

	this.projects = function() {
		logger.debug('projects');

		var projects = cacher.getorset('redmine:projects', function() {
			var projects = [];
			var offset = 0;
			var response;
			do {
				response = self.request('GET', 'projects.json?offset=' + offset);
				projects = projects.concat(response.projects);
				offset += (response.limit || 25);
			} while (response.offset + response.limit <= response.total_count && response.projects.length > 0);

			//識別子でフィルタ
			var target = utility.explode(preference.getString("target_project"), ',');
			var filter = utility.explode(preference.getString("filter_project"), ',');
			projects = projects.filter(function(project, i) {
				var project_id = '' + project.id;

				if (target.length > 0 && target.indexOf(project_id) == -1 && target.indexOf(project.identifier) == -1)
					return false;
				return filter.indexOf(project_id) == -1 && filter.indexOf(project.identifier) == -1;
			});

			//fullnameプロパティを定義
			for (var i = 0; i < projects.length; i++)
			{
				var project = projects[i];
				projects[i].fullname = (project.parent !== undefined ? project.parent.name + '/' : '') + project.name;
			}

			//fullnameでソート
			projects.sort(function(a, b) {
				return (a.fullname > b.fullname) ? 1 : -1;
			});

			return projects;
		});
		return projects;
	};

	this.members = function(project_id) {
		logger.debug('members:', project_id);

		//取得(権限の関係で例外が飛びやすい)
		try
		{
			var response = cacher.getorset('redmine:members:' + project_id, function() {
				return self.request('GET', 'projects/' + project_id + '/memberships.json');
			});
			return response.memberships;
		}
		catch (e)
		{
			//気休めに自分自身を返す
			var myself = this.myself();
			myself.name = myself.lastname;
			return [ {
				user : myself
			} ];
		}
	};

	this.versions = function(project_id) {
		logger.debug('versions:', project_id);

		var response = cacher.getorset('redmine:version:' + project_id, function() {
			var response = self.request('GET', 'projects/' + project_id + '/versions.json');
			var versions = response.versions;

			// ステータスでフィルタ
			versions = versions.filter(function(version, i) {
				return version.status === 'open';
			});

			return versions;
		});
		return response;
	};

	this.trackers = function(project_id) {
		if (project_id)
		{
			logger.debug('trackers (project=' + project_id + ')');
			return this.project(project_id).trackers;
		}
		else
		{
			logger.debug('trackers ');
			const response = cacher.getorset('redmine:trackers', function() {
				return self.request('GET', 'trackers.json');
			});
			return response.trackers;
		}
	};

	this.issueStatuses = function() {
		logger.debug('issueStatuses');

		var response = cacher.getorset('redmine:issueStatuses', function() {
			return self.request('GET', 'issue_statuses.json');
		});
		return response.issue_statuses;
	};

	this.recache = function() {
		logger.debug('recache');

		cacher.removes(/^redmine:/);
	};
};

var redmine = new Redmine();
