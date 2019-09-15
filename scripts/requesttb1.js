var request = require('request-promise-native');
const fs = require('fs-extra');
const download = require('download');
const url = require('url');
const path = require('path');
var GitHub = require('github-api');
 
// unauthenticated client
const gh = new GitHub({
	// username: 'cleidigh@gmail.com',
	// password: 'Crete1997'
});


// let addon_identifier = 90003;
// let addon_identifier = "lightning";
let addon_identifier = "2313";

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

function getExtensionJSON(addon_identifier) {

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

async function requestURL(req, res) {
	console.debug('request ' + req);
	// let response = await request.get('https://addons.thunderbird.net/api/v4/addons/addon/90003');
	let extRequestOptions = {
		url: `https://addons.thunderbird.net/api/v4/addons/addon/${addon_identifier}`,
		// "url": "https://addons.thunderbird.net/thunderbird/downloads/file/1015140/localfolders-2.0.2-tb.xpi?src=",
		// qs: {page: 59, app: "thunderbird", type: "extension", sort:"created"},
		// url: 'https://api.github.com/repos/request/request',
		json: true,
		headers: {
			'User-Agent': 'request'
		}
	};

	try {
		let response = await request.get(extRequestOptions);
		if (response.err) { console.log('error'); }
		else {
			console.log('fetched response');
			console.debug(response.id);
			return response;
		}
	}
	catch (err) {
		console.debug('Error ' + err);
		return { err: 404 };
	}
}



console.log("Starting...");

async function getExtensionFiles() {
	console.log('Get Files');
	// let ext = getExtensionJSON(90003);
	let ext = await requestURL(addon_identifier)

	// console.debug(requestURL(90003000, 0));
	// console.debug('ExtensionData:\n' + ext);

	console.debug(ext.authors);
	console.debug(ext.slug);
	const extRootName = `.\\${addon_identifier}-${ext.slug}`;
	let jfile = `.\\${extRootName}\\${extRootName}.json`
	writePrettyJSONFile(jfile, ext)
	const xpiFileURL = ext.current_version.files[0].url;
	const xpiFileName = path.posix.basename(url.parse(xpiFileURL).pathname);
	await downloadURL(xpiFileURL, `.\\${extRootName}\\src`);
	console.debug('filename '+xpiFileName);
	fs.ensureDirSync(`.\\${extRootName}\\xpi`);
	fs.copySync(`.\\${extRootName}\\src`, `.\\${extRootName}\\xpi`);
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
// test();

// console.debug('Finished');

// getExtensionFiles();
// ghSearch();
console.debug(getDirectories('.'));
