var request = require('request-promise-native');
const fs = require('fs-extra');
const download = require('download');
const url = require('url');
const path = require('path');
var GitHub = require('github-api');
var JSZip = require("jszip");
const _7z = require('7zip-min');

const ext68CompDir = '..\\extensions-all\\exts-tb68-comp';
const ext68CompDirU = '../extensions-all/exts-tb68-comp';

// unauthenticated client
const gh = new GitHub({
	// username: 'cleidigh@gmail.com',
	// password: 'Crete1997'
});


// let addon_identifier = 90003;
// let addon_identifier = "lightning";
// let addon_identifier = "2313";

let extArray = [
	90003,
	640,
	634298,
	986686



];

let extSearchRequest = "app=thunderbird&type=extension&sort=created"

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
		return;
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
	console.debug('result ' + body);

}

async function requestURL(addon_id, query_type) {
	console.debug('request ' + addon_id + " Type: "+query_type);
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

	try {
		let response = await request.get(extRequestOptions);
		if (response.err) { console.log('error'); }
		else {
			console.log('fetched response');
			console.debug(response);
			return response;
		}
	}
	catch (err) {
		console.debug('Error ' + err);
		return { err: 404 };
	}
}

function genExtensionSummaryMD (addon_identifier, extJson) {
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

	console.debug('summary name '+name);
	extSummaryFile = extSummaryFile.replace(/__ext-name__/g, name);
	extSummaryFile = extSummaryFile.replace('__ext-id__', extJson.id);
	extSummaryFile = extSummaryFile.replace('__ext-slug__', extJson.slug);
	extSummaryFile = extSummaryFile.replace('__ext-minv__', minv);
	extSummaryFile = extSummaryFile.replace('__ext-maxv__', maxv);
	extSummaryFile = extSummaryFile.replace('__ext-icon64px-path__', iconPath);
	extSummaryFile = extSummaryFile.replace('__ext-src-path__', srcLink);
	extSummaryFile = extSummaryFile.replace('__ext-xpi-path__', xpiLink);
	extSummaryFile = extSummaryFile.replace('__ext-description__', (summary+"\n"));


	fs.writeFileSync(`${extSummaryFileName}`, extSummaryFile);

}


console.log("Starting...");

async function getExtensionFiles(addon_identifier) {
	console.log('Get Files');
	// let ext = getExtensionJSON(90003);
	let ext = await requestURL(addon_identifier, 'details')
	const extRootName = `${addon_identifier}-${ext.slug}`;
	let jfile = `${ext68CompDir}\\${extRootName}\\${extRootName}.json`
	writePrettyJSONFile(jfile, ext)
	console.debug(ext.slug);

	
	const xpiFileURL = ext.current_version.files[0].url;
	const xpiFileName = path.posix.basename(url.parse(xpiFileURL).pathname);
	await downloadURL(xpiFileURL, `${ext68CompDir}\\${extRootName}\\xpi`);
	console.debug('filename '+xpiFileName);
	fs.ensureDirSync(`${ext68CompDir}\\${extRootName}\\xpi`);

	_7zCommand = ['x', `${ext68CompDirU}/${extRootName}/xpi/${xpiFileName}`, `-o${ext68CompDirU}/${extRootName}/src`];
	// _7zCommand = ['x', `./${extRootName}/src/${xpiFileName}`];
	await _7CmdSync(_7zCommand);

	console.debug('unpacked source');
	let ext_versions = await requestURL(addon_identifier, 'versions');
	console.debug('downloaded versions');

	jfile = `.\\${ext68CompDir}\\${extRootName}\\${extRootName}-versions.json`
	writePrettyJSONFile(jfile, ext_versions);

	console.debug('generate mark	');
	genExtensionSummaryMD(addon_identifier, ext)
}

async function _7CmdSync(_7zCommand) {
	return new Promise((resolve, reject) => {

		console.error(_7zCommand);
		_7z.cmd(_7zCommand, err => {
			if (err) {
				console.debug('Error '+err);
				reject(err);
			}
			else resolve();
		});

	});
}


async function test() {
let ext = await requestURL(addon_identifier)
console.debug(ext);
}

async function downloadURL(url, destFile) {
	await download(url, `${destFile}`);
    // console.log('done!');
}

async function ghSearch() {
	// let ss = new String("q=Thunderbird");
	let ss = { q: 'addClass in:file language:js repo:jquery/jquery'};
	let so = gh.search(ss);
	// "ChromeUtils"
	let options;
	// let sresults = await so.forCode(options);
	return so.forCode(options)
		.then(function({data}) {
			console.debug('data '+data);
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

extArray.map( extId => {
getExtensionFiles(extId);
});

// ghSearch();
// console.debug(getDirectories('.'));
