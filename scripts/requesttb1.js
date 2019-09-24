var request = require('request-promise-native');
const fs = require('fs-extra');
const download = require('download');
const url = require('url');
const path = require('path');
var GitHub = require('github-api');
var JSZip = require("jszip");
const _7z = require('7zip-min');
var extract = require('extract-zip')

const rootDir = "C:/Dev/Thunderbird/ThunderKdB";
const ext68CompDir = '..\\extensions-all\\exts-tb68-comp';
const ext68CompDirU = '/extensions-all/exts-tb68-comp';


const extsAllJsonFileName = `${rootDir}/exall/exall.json`;

// unauthenticated client
const gh = new GitHub({
	// username: 'cleidigh@gmail.com',
	// password: 'Crete1997'
});


// let addon_identifier = 90003;
// let addon_identifier = "lightning";
// let addon_identifier = "2313";

// let extArray = [
// 	90003,
// 	640,
// 	634298,
// 	986686
// ];

let extArray = [
	711780,
	54035,
	773590,

	// 2313,
	324492,
	4631,
	15102,
	71,
	711780,
	640,
	13564,
	8451,
	4654,
	195275,
	// 611,
	// 47144,
	// 634298,
	// 550,
	// 2533,
	// 330424,
	// 881,
	// 5582,
	// 4394,
	// 986288

];


var options = {
	url: "https://addons.thunderbird.net/api/v4/addons/search/",
	qs: { page: 59, app: "thunderbird", type: "extension", sort: "created" },
	// url: 'https://api.github.com/repos/request/request',
	json: true,
	headers: {
		'User-Agent': 'request'
	}
};


async function writeJSONFile(f, json) {
	try {
		await fs.outputJson(f, json);
		const data = await fs.readJson(f)
		console.log(data.name) // => JP
	} catch (err) {
		console.error(err)
	}
}

async function writePrettyJSONFile(f, json) {
	try {
		return await fs.outputFile(f, JSON.stringify(json, null, 4));
	} catch (err) {
		console.error(err);
		throw err;
	}
}


function callback(error, response, body) {
	if (!error && response.statusCode == 200) {
		// var info = JSON.parse(body);
		console.log(response.statusCode);
		console.log(' ' + JSON.stringify(body));
		// console.log(info);
		return { status: 200, data: body }
	} else {
		console.log('error: ' + response.statusCode);
		return { status: 404, data: {} }
	}
}

function getExtensionJSON(addon_identifier, query_type) {

	let extRequestOptions = {
		url: `https://addons.thunderbird.net/api/v4/addons/addon/${addon_identifier}`,
		// qs: {page: 59, app: "thunderbird", type: "extension", sort:"created"},
		// url: 'https://api.github.com/repos/request/request',
		json: true,
		headers: {
			'User-Agent': 'request'
		}
	};

	request(extRequestOptions, callback);
	// var result = await request(extRequestOptions);
	// console.debug('result ' + body);

}

async function requestATN_URL(addon_id, query_type, options) {
	// console.debug('request ' + addon_id + " Type: " + query_type);
	// let response = await request.get('https://addons.thunderbird.net/api/v4/addons/addon/90003');
	let extRequestOptions = {
		url: `https://addons.thunderbird.net/api/v4/addons/addon/${addon_id}`,
		// "url": "https://addons.thunderbird.net/thunderbird/downloads/file/1015140/localfolders-2.0.2-tb.xpi?src=",
		// qs: {page: 59, app: "thunderbird", type: "extension", sort:"created"},
		// url: 'https://api.github.com/repos/request/request',
		json: true,
		headers: {
			'User-Agent': 'request'
		}
	};

	if (query_type === 'versions') {
		extRequestOptions.url = `https://addons.thunderbird.net/api/v4/addons/addon/${addon_id}/versions/`;
	}

	if (query_type === 'search') {
		extRequestOptions.url = "https://addons.thunderbird.net/api/v4/addons/search/";
		// extRequestOptions.qs = { page: page, app: "thunderbird", type: "extension", sort: "created" };
		extRequestOptions.qs = options;

	}

	try {
		let response = await request.get(extRequestOptions);
		if (response.err) { console.log('error'); }
		else {
			// console.log(' Done response: ' + addon_id);
			// console.debug(response);
			return response;
		}
	}
	catch (err) {
		console.debug('Error ' + err);
		return { err: 404 };
	}
}

function genExtensionSummaryMD(addon_identifier, extJson) {
	const extRootName = `${addon_identifier}-${extJson.slug}`;
	const extSummaryFileName = `${ext68CompDir}\\${extRootName}\\${extRootName}-summary.md`;

	let extSummaryFile = fs.readFileSync('extension-summary-templ.md', 'utf8');

	const default_locale = extJson.default_locale;
	const name = extJson.name[default_locale];
	const summary = extJson.summary[default_locale];
	const srcLink = `[Src](${ext68CompDir}\\${extJson.id}-${extJson.slug}\\src)`;
	const xpiLink = `[XPI](${ext68CompDir}\\${extJson.id}-${extJson.slug}\\xpi)`;
	// const iconPath = `${ext68CompDir}\\${extJson.id}-${extJson.slug}\\src\\${extJson.icon_url}`;
	const iconPath = `${extJson.icon_url}`;
	const minv = extJson.current_version.compatibility.thunderbird.min;
	const maxv = extJson.current_version.compatibility.thunderbird.max;
	const id = extJson.id;

	console.debug('summary name ' + name);
	extSummaryFile = extSummaryFile.replace(/__ext-name__/g, name);
	extSummaryFile = extSummaryFile.replace('__ext-id__', extJson.id);
	extSummaryFile = extSummaryFile.replace('__ext-slug__', extJson.slug);
	extSummaryFile = extSummaryFile.replace('__ext-minv__', minv);
	extSummaryFile = extSummaryFile.replace('__ext-maxv__', maxv);
	extSummaryFile = extSummaryFile.replace('__ext-icon64px-path__', iconPath);
	extSummaryFile = extSummaryFile.replace('__ext-src-path__', srcLink);
	extSummaryFile = extSummaryFile.replace('__ext-xpi-path__', xpiLink);
	extSummaryFile = extSummaryFile.replace('__ext-description__', (summary + "\n"));


	fs.writeFileSync(`${extSummaryFileName}`, extSummaryFile);
	console.debug('summary done');
}


console.log("Starting...");

async function getExtensionFiles(addon_identifier) {
	// p = new Promise((resolve, reject) => {
	try {
		console.log('Get Files: ' + addon_identifier);
		// let ext = getExtensionJSON(90003);
		let ext = await requestATN_URL(addon_identifier, 'details')
		const extRootName = `${addon_identifier}-${ext.slug}`;
		const extRootDir = `${ext68CompDir}\\${extRootName}`;
		console.debug('CheckingFolder: ' + extRootDir);

		if (fs.existsSync(extRootDir)) {
			fs.removeSync(extRootDir);
			console.debug('Removing: ' + `${extRootDir}`);
		}
		console.debug('  Done');
		let jfile = `${ext68CompDir}\\${extRootName}\\${extRootName}.json`
		writePrettyJSONFile(jfile, ext)
		console.debug(ext.slug);


		const xpiFileURL = ext.current_version.files[0].url;
		const xpiFileName = path.posix.basename(url.parse(xpiFileURL).pathname);
		await downloadURL(xpiFileURL, `${ext68CompDir}\\${extRootName}\\xpi`);
		console.debug('Downloaded filename ' + xpiFileName);
		fs.ensureDirSync(`${ext68CompDir}\\${extRootName}\\xpi`);


		_7zCommand = ['x', `${ext68CompDirU}/${extRootName}/xpi/${xpiFileName}`, `-o${ext68CompDirU}/${extRootName}/src`];
		console.debug('Starting unzip: ' + xpiFileName);
		fileUnzip(`${rootDir}/${ext68CompDirU}/${extRootName}/xpi/${xpiFileName}`, { dir: `${rootDir}/${ext68CompDirU}/${extRootName}/src` });

		// await _7CmdSync(_7zCommand);
		console.debug('unpacked source');

		let ext_versions = await requestATN_URL(addon_identifier, 'versions');
		console.debug('downloaded versions');

		jfile = `.\\${ext68CompDir}\\${extRootName}\\${extRootName}-versions.json`
		await writePrettyJSONFile(jfile, ext_versions);

		console.debug('generate markDown	');
		genExtensionSummaryMD(addon_identifier, ext);
		console.debug('Finished: ' + addon_identifier);
		return 1;
		// resolve();
	} catch (e) {
		// reject(0);
		console.debug('error ' + e);
		throw e;
	}
	// });
	// await p;
}

async function _7CmdSync(_7zCommand) {
	return new Promise((resolve, reject) => {

		console.error(_7zCommand);
		_7z.cmd(_7zCommand, err => {
			if (err) {
				console.debug('Error ' + err);
				reject(err);
			}
			else resolve();
		});

	});
}

function fileUnzip(source, options) {
	extract(source, options, function (err) {
		// extraction is complete. make sure to handle the err
		console.debug('extract done: ' + err);
	});
}

async function test() {
	let ext = await requestATN_URL(addon_identifier)
	console.debug(ext);
}

async function downloadURL(url, destFile) {
	await download(url, `${destFile}`);
	// console.log('done!');
}

async function ghSearch() {
	// let ss = new String("q=Thunderbird");
	let ss = { q: 'addClass in:file language:js repo:jquery/jquery' };
	let so = gh.search(ss);
	// "ChromeUtils"
	let options;
	// let sresults = await so.forCode(options);
	return so.forCode(options)
		.then(function ({ data }) {
			console.debug('data ' + data);
			console.debug(JSON.stringify(data[0]));
		})

	console.debug(so);
	// console.debug('results\n'+ sresults[0]);
	// console.debug('results\n'+ JSON.stringify(sresults[0]));
	// sresults.forEach(element => {
	// });

}


const getDirectories = source =>
	fs.readdirSync(source, { withFileTypes: true })
		.filter(dirent => dirent.isDirectory())
		.map(dirent => dirent.name)

// console.debug('Finished');


async function fetchAllCounts(users) {
	const promises = users.map(async username => {
		const count = await fetchPublicReposCount(username);
		return count;
	});
	return Promise.all(promises);
}

var extsJson = [];

async function getAllExtensionDetails(pageStart, pageEnd) {
	let qs = { page: 0, app: "thunderbird", type: "extension", sort: "users" };

	let ap = [];
	for (let i = pageStart; i < pageEnd + 1; i++) {
		qs.page = i;
		// json_resp = await requestATN_URL(null, 'search', qs);
		let resp = await requestATN_URL(null, 'search', qs)
		// console.debug('page:\n'+ JSON.stringify( resp.results));
		// console.debug(`page: ${i} ${resp.results[0].id} ${resp.results.length} \n\n\n\n`);
		ap += resp;
		extsJson = extsJson.concat(resp.results);
		// console.debug('page:\n' + JSON.stringify( extsJson));

	
	}

	// console.debug('Await All'); 
	let ap2 = Promise.all(ap);
	// console.debug('All Promises ' + ap.length + " " + ap);

	return ap2;
}


async function getAll() {
	// let p = [];

	const p = extArray.map(async extId => {
		const pc = await getExtensionFiles(extId);
		return pc;
	});
	// extArray.forEach(element => {
	console.debug('Await All');
	let ap = Promise.all(p);
	console.debug('All Promises ' + ap.length + " " + ap);
	// });
	return ap;
}

// ghSearch();
// console.debug(getDirectories('.'));
async function g1() {
	// await getAll();
	let startTime = new Date();
	console.debug('' + startTime);
	await getAllExtensionDetails(1, 3);

	console.debug('after get all '+ extsJson.length);
	console.debug(new Date() - startTime);
	console.debug(new Date());

	// extsJson.map( ext => {
	// 	console.debug(`${ext.id}  ${ext.slug} ${ext.average_daily_users}`);
	// });

	writePrettyJSONFile(extsAllJsonFileName, extsJson);
}
g1();



console.debug('Totally Done');