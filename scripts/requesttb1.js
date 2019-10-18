var request = require('requestretry');
// var request = require('request-promise-native');
const fs = require('fs-extra');
const download = require('download');
const url = require('url');
const path = require('path');
var GitHub = require('github-api');
var JSZip = require("jszip");
const _7z = require('7zip-min');
var extract = require('extract-zip')
const xml_util = require('./xml-util.js');

const {
	parse,
	stringify,
	assign
} = require('comment-json')

const repoRootDir = "https://github.com/cleidigh/ThunderKdB/tree/master";
const rootDir = "C:/Dev/Thunderbird/ThunderKdB";
const extGroupAllDir = 'xall';
const extGroupTB68Dir = 'x68';
const extGroupTB60Dir = 'x60';
const extGroupTBOtherDir = 'xOther';

const ext68CompDir = '..\\extensions-all\\exts-tb68-comp';
const ext68CompDirU = '/extensions-all/exts-tb68-comp';


const extsAllJsonFileName = `${rootDir}/xall/xall.json`;

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

function requestATN_URL2(addon_id, query_type, options) {
	let extRequestOptions = {
		url: `https://addons.thunderbird.net/api/v4/addons/addon/${addon_id}`,
		json: true,
		maxAttempts: 5,   // (default) try 5 times
		retryDelay: 5000,  // (default) wait for 5s before trying again
		retryStrategy: request.RetryStrategies.HTTPOrNetworkError, // (default) retry on 5xx or network errors
		headers: {
			'User-Agent': 'request'
		}
	};

	if (query_type === 'search') {
		extRequestOptions.url = "https://addons.thunderbird.net/api/v4/addons/search/";
		extRequestOptions.qs = options;
	}

	// let promise = new Promise( ( resolve, reject ) => {
	return new Promise((resolve, reject) => {

		try {
			request.get(extRequestOptions)
				.then(response => {
					console.debug('Valid');
					// console.debug(response.body);
					// console.debug(response.next);
					resolve(response.body);

				})
				.catch(err => {
					console.debug('RequestError: ' + err);
					reject(err);
				});

		} catch (error) {
			reject(0);
		}


	});
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
		fullResponse: false,
		// maxAttempts: 5,   // (default) try 5 times
		// retryDelay: 5000,  // (default) wait for 5s before trying again
		// retryStrategy: request.RetryStrategies.HTTPOrNetworkError, // (default) retry on 5xx or network errors
		headers: {
			'User-Agent': 'request'
		}
	};

	if (query_type === 'versions') {
		extRequestOptions.url = `https://addons.thunderbird.net/api/v4/addons/addon/${addon_id}/versions/`;
		extRequestOptions.qs = options;
	}

	if (query_type === 'search') {
		extRequestOptions.url = "https://addons.thunderbird.net/api/v4/addons/search/";
		// extRequestOptions.qs = { page: page, app: "thunderbird", type: "extension", sort: "created" };
		extRequestOptions.qs = options;

	}

	for (reqCnt = 0; reqCnt < 3; reqCnt++) {
		try {
			console.log('StartRequest: ' + reqCnt + '  ' + addon_id);
			let response = await request.get(extRequestOptions);

			// let response = request.get(extRequestOptions)
			// 						.then( response => {
			// 							console.debug('Valid');
			// 							// return response;
			// 							resolve(response);
			// 						})
			// 						.catch( err => {
			// 							console.debug('RequestError: '+err);

			// 							// return 0;
			// 						})
			// 						return;

			if (response.err) {
				console.log('Request error' + response.err);
				response = await request.get(extRequestOptions);
				console.debug('retry');
				return response;
			}
			else {
				console.log(' Done response: ' + response.err);
				// console.debug(response);
				return response;
			}
		}
		catch (err) {
			console.debug('Request Error ' + extRequestOptions.url + '  ' + err);
			return response;
			if (reqCnt < 3) {
				console.debug('Continue');
				continue;
			}
		}
		return { err: 404 };

	}
}

function genExtensionSummaryMD(addon_identifier, extJson, extGroupDir, overwrite) {
	const extRootName = `${addon_identifier}-${extJson.slug}`;
	const extSummaryFileName = `${rootDir}/${extGroupAllDir}/${extGroupDir}/${extRootName}/${extRootName}-details.html`;

	if (fs.existsSync(extSummaryFileName) && !overwrite) {
		console.debug('MarkDown Exists ');
		return 0;
	}

	console.debug('Generate... ' + extSummaryFileName);
	let extSummaryFile = fs.readFileSync('extension-details-templ.html', 'utf8');

	const default_locale = extJson.default_locale;
	const name = extJson.name[default_locale];
	const summary = extJson.summary[default_locale];


	// const srcLink = `[Src](${rootDir}/${extGroupAllDir}/${extGroupDir}/${extJson.id}-${extJson.slug}/src)`;
	const srcLink = `${repoRootDir}/${extGroupAllDir}/${extGroupDir}/${extJson.id}-${extJson.slug}/src`;
	const xpiLink = `${repoRootDir}/${extGroupAllDir}/${extGroupDir}/${extJson.id}-${extJson.slug}/xpi`;
	// const iconPath = `${ext68CompDir}\\${extJson.id}-${extJson.slug}\\src\\${extJson.icon_url}`;
	const iconPath = `${extJson.icon_url}`;
	const minv = extJson.current_version.compatibility.thunderbird.min;
	const maxv = extJson.current_version.compatibility.thunderbird.max;
	const id = extJson.id;

	console.debug('summary name ' + name);
	extSummaryFile = extSummaryFile.replace(/__ext-name__/g, name);
	extSummaryFile = extSummaryFile.replace(/__date__/g, (new Date().toISOString().split('T')[0]));
	extSummaryFile = extSummaryFile.replace('__ext-id__', extJson.id);
	extSummaryFile = extSummaryFile.replace('__ext-current-version__', extJson.current_version.version);
	extSummaryFile = extSummaryFile.replace('__ext-current-version-date__', extJson.current_version.files[0].created.split('T')[0]);
	extSummaryFile = extSummaryFile.replace('__ext-slug__', extJson.slug);
	extSummaryFile = extSummaryFile.replace('__ext-minv__', minv);
	extSummaryFile = extSummaryFile.replace('__ext-maxv__', maxv);
	extSummaryFile = extSummaryFile.replace('__ext-icon64px-path__', iconPath);

	extSummaryFile = extSummaryFile.replace('__ext-src-path__', srcLink);
	extSummaryFile = extSummaryFile.replace('__ext-xpi-path__', xpiLink);
	extSummaryFile = extSummaryFile.replace('__ext-description__', (summary + "\n"));

	let ext_authors = extJson.authors.map(author => {
		return author.name;
	}).join(', ');

	extSummaryFile = extSummaryFile.replace('__ext-authors__', ext_authors);
	extSummaryFile = extSummaryFile.replace('__ext-users__', extJson.average_daily_users);

	try {
		extSummaryFile = extSummaryFile.replace('__ext-license__', extJson.current_version.license.name["en-US"]);
	} catch (error) {
		extSummaryFile = extSummaryFile.replace('__ext-license__', 'None');
	}

	fs.writeFileSync(`${extSummaryFileName}`, extSummaryFile);
	console.debug('summary done');
}


function isCompatible(checkVersion, minv, maxv) {
	// unambiguous compatibility

}


function compatibilityCheck(extJson, options) {

	console.debug(`CompatibilityCheck: ${extJson.slug} `);
	let compSet = {};
	let v_min = `${extJson.current_version.compatibility.thunderbird.min}`;
	let v_max = `${extJson.current_version.compatibility.thunderbird.max}`;
	let mext = extJson.current_version.files[0].is_webextension;

	const p = /[\d\.]+/;
	let v_max_num = 0;

	if (v_max === "*") {
		v_max_num = -1;
		compSet.compNoMax = true;
	} else {
		v_max_num = p.exec(v_max);
	}
	let v_min_num = p.exec(v_min);

	// console.debug(`${extJson.slug} : vMin: ${v_min} vMax: ${v_max} vMax_nun: ${v_max_num}  ME: ${mext}`);

	compSet.mext = mext;

	// if both numbers - unambiguous
	if (v_max_num > 0 && !isNaN(v_min_num)) {
		// console.debug('unambiguous versions');
		// check compatibilities
		if (v_min_num <= 68 && v_max_num >= 68) {
			compSet.comp68 = true;

		}
		if (v_max_num >= 69) {
			compSet.comp69plus = true;
		}

		if (v_min_num <= 60 && v_max_num >= 60) {
			compSet.comp60 = true;
		}
		if (v_max_num >= 61) {
			compSet.comp61plus = true;
		}

		if (v_max_num < 60) {
			compSet.compOther = true;
		}

	} else {
		console.debug('ambiguous');
		if (v_min_num >= 68 && v_min_num <= 69 && mext) {
			compSet.comp68 = true;
		} else if (v_min_num >= 60 && mext) {
			compSet.comp68 = true;
		}

		if (v_min_num >= 60 && v_min_num < 61) {
			compSet.comp60 = true;
			console.debug('ambiguous c60');
		}

		if (v_min_num < 60) {
			compSet.compOther = true;
		}


	}

	console.debug('CurrentVersionComp: ' + JSON.stringify(compSet));
	if (!options.currentVersionOnly && !(compSet.comp60 && compSet.comp68)) {
		let pv_compSet = {};

		for (let index = 1; index < options.ext_versions.length; index++) {
			const ext_ver = options.ext_versions[index];
			if (typeof ext_ver.compatibility.thunderbird !== 'object') {
				console.debug('no Thunderbird compatibility');
				continue;
			}
			let v_min = `${ext_ver.compatibility.thunderbird.min}`;
			let v_max = `${ext_ver.compatibility.thunderbird.max}`;

			let mext = ext_ver.files[0].is_webextension;
			let ver_date = ext_ver.files[0].created;
			if ((new Date(ver_date)) < (new Date("2017-01-01"))) {
				break;
			}

			if (extJson.slug === 'shrunked-image-resizer') {
				console.debug(`${extJson.slug} : vMin: ${v_min} vMax: ${v_max} ${index}`);
			}

			const p = /[\d\.]+/;
			let v_max_num = 0;

			if (v_max === "*") {
				v_max_num = -1;
				compSet.compNoMax = true;
			} else {
				v_max_num = p.exec(v_max);
			}
			let v_min_num = p.exec(v_min);

			if (!compSet.comp68 && !pv_compSet.comp68) {
				if (v_min_num >= 68 && v_min_num <= 69 && mext) {
					pv_compSet.comp68pv = true;
					pv_compSet.comp68pv_date = ver_date;
				}
				if (v_min_num <= 68 && (v_max_num >= 68 || v_max_num === -1) && mext) {
					pv_compSet.comp68pv = true;
					pv_compSet.comp68pv_date = ver_date;
				}

			}
			if (!compSet.comp60 && !pv_compSet.comp60) {
				if (v_min_num >= 60 && v_min_num <= 61) {
					pv_compSet.comp60pv = true;
					pv_compSet.comp60pv_date = ver_date;
				}
				if (v_min_num <= 60 && v_max_num >= 60) {
					pv_compSet.comp60pv = true;
					pv_compSet.comp60pv_date = ver_date;
				}
			}

		}
		console.debug(pv_compSet);
		console.debug(compSet);
		let compSet2 = Object.assign(compSet, pv_compSet);
		console.debug(compSet2);
	}

	console.debug(`CompatibilityDone: ${extJson.slug} comp: ` + JSON.stringify(compSet));

	return compSet;
}

console.log("Starting...");

async function getExtensionFiles(addon_identifier, index) {
	// p = new Promise((resolve, reject) => {
	try {
		console.log('Get Files: ' + addon_identifier);
		// let ext = getExtensionJSON(90003);
		let ext = await requestATN_URL(addon_identifier, 'details')


		let qs = { page_size: 50 };

		let ext_versions_raw = await requestATN_URL(addon_identifier, 'versions', qs);
		// console.debug(ext_versions_raw);
		// console.debug('links ' + ext_versions_raw.results);
		let ext_versions = ext_versions_raw.results;
		// console.debug(ext_versions);
		console.debug(ext_versions.length);
		if (ext_versions_raw.page_count > 1) {
			console.debug('PageError');
		}
		let ext_comp = compatibilityCheck(ext, { currentVersionOnly: false, ext_versions: ext_versions });
		ext.xpilib = {};
		ext.xpilib.ext_comp = ext_comp;

		extsJson[index].xpilib = {};
		extsJson[index].xpilib.ext_comp = ext_comp;

		let targetGroupDir = "";

		if (ext_comp.comp68) {
			targetGroupDir = extGroupTB68Dir;
		} else if (ext_comp.comp60) {
			targetGroupDir = extGroupTB60Dir;
		} else {
			targetGroupDir = extGroupTBOtherDir;
		}

		const extRootName = `${addon_identifier}-${ext.slug}`;
		const extRootDir = `${rootDir}/${extGroupAllDir}/${targetGroupDir}/${extRootName}`;

		console.debug(`TargetGroup: ${extRootName} : ${targetGroupDir}`);

		console.debug(`Save versions, ${extRootDir}`);
		jfile = `${extRootDir}/${extRootName}-versions.json`;
		await writePrettyJSONFile(jfile, ext_versions);
		console.debug(`downloaded versions: ${extRootName} : ${ext_versions.length}`);

		// return 1;

		// if (!ext_comp.comp68) {
		// 	return 1;
		// }

		console.debug('CheckingFolder: ' + extRootDir);


		if (!fs.existsSync(extRootDir)) {
			// 	fs.removeSync(extRootDir);
			// 	console.debug('Removing: ' + `${extRootDir}`);
			console.debug('Missing: ' + `${extRootDir}`);
		}
		// console.debug('  Done');

		jfile = `${extRootDir}/${extRootName}.json`
		writePrettyJSONFile(jfile, ext)
		console.debug(ext.slug);


		const xpiFileURL = ext.current_version.files[0].url;
		const xpiFileName = path.posix.basename(url.parse(xpiFileURL).pathname);

		await downloadURL(xpiFileURL, `${extRootDir}/xpi`);
		console.debug('Downloaded filename ' + xpiFileName);
		fs.ensureDirSync(`${extRootDir}/xpi`);

		// if (fs.existsSync(`${extRootDir}/xpi`)) {
		// 	fs.removeSync(`${extRootDir}/xpi`);
		// 	console.debug('Removing: ' + `${extRootName}`);
		// }


		// if (fs.existsSync(`${extRootDir}/src`)) {
		// 	fs.removeSync(`${extRootDir}/src`);
		// 	console.debug('Removing: ' + `${extRootName}`);
		// }
		console.debug(`TargetGroup: ${extRootName} : ${targetGroupDir}`);

		console.debug('check versions: ' + extRootDir);
		if (ext_comp.mext && fs.existsSync(`${extRootDir}/src/manifest.json`)) {
			// fs.removeSync(`${extRootDir}/src`);
			console.debug('Read: manifest ');
			let manifestJson = parse(fs.readFileSync(`${extRootDir}/src/manifest.json`).toString())

			// let manifestJson = fs.readJSONSync(`${extRootDir}/src/manifest.json`, { throws: false });
			if (manifestJson === null) {
				console.debug(`Missing manifest file: ${extRootDir}/src/manifest.json`);
				return 1;
			}
			console.debug('check legacy');
			if (manifestJson.legacy !== undefined) {
				console.debug('set legacy');
				let legacy = JSON.stringify(manifestJson.legacy);
				console.debug(legacy);
				ext_comp.legacy = true;
				ext_comp.legacy_type = (typeof manifestJson.legacy.type === 'string') ? manifestJson.legacy.type : 'xul';
				console.debug('ReadingManifest: ' + `${extRootName} : ${ext_comp.legacy_type}`);

			} else {
				console.debug('Manifest NoLegacy');
			}
		} else if (fs.existsSync(`${extRootDir}/src/install.rdf`)) {
			console.debug('CheckingInstall:');
			const installRDFExtType = xml_util.rdfGetValue(`${extRootDir}/src/install.rdf`, 'Description[\"em:type\"]');
			console.debug('Addon type ' + installRDFExtType);
			const installRDFExtBootstrap = xml_util.rdfGetValue(`${extRootDir}/src/install.rdf`, 'Description[\"em:bootstrap\"]');
			console.debug('bootstrap: ' + installRDFExtBootstrap);
			if (installRDFExtType === 2 && installRDFExtBootstrap) {
				ext_comp.legacy = true;
				ext_comp.legacy_type = 'bootstrap';
			} else {
				ext_comp.legacy = true;
				ext_comp.legacy_type = 'xul';
				console.debug('xul type');
			}
			console.debug(ext_comp);
			console.debug('ReadingInstall: ' + `${extRootName} : ${ext_comp.legacy.legacy_type}`);
		}

		// _7zCommand = ['x', `${extRootDir}/xpi/${xpiFileName}`, `-o${extRootDir}/src`];
		// console.debug('Starting unzip: ' + xpiFileName);
		// fileUnzip(`${extRootDir}/xpi/${xpiFileName}`, { dir: `${extRootDir}/src` });
		// console.debug('unpacked source');


		console.debug('generate markDown	' + extRootName + '  ' + targetGroupDir);
		let overwrite = true;
		genExtensionSummaryMD(addon_identifier, ext, targetGroupDir, overwrite);

		console.debug('Finished: ' + addon_identifier);

		return 1;
		// resolve();
	} catch (e) {
		// reject(0);
		console.debug('Error Files ' + '  ' + e);
		// throw e;
		return 0;
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


async function getExtensions() {
	let qs = { page: 0, app: "thunderbird", type: "extension", sort: "users" };
	qs.page = 1;

	const stopPage = 54;
	promises = [];
	pages = [];

	for (let index = 1; index < stopPage + 1; index++) {
		console.debug('StartRequest: Page: ' + index);
		qs.page = index;

		let p = requestATN_URL2(null, 'search', qs)
			.then(r => {
				// console.debug('after request ' + r.next);
				// console.debug('after request ' + r.previous);
				// console.debug('after  '+JSON.stringify(r));
				var page;
				if (r.next !== null) {
					var parsedUrl = new URL(r.next);
					page = parsedUrl.searchParams.get("page") - 1;

				} else {
					var parsedUrl = new URL(r.previous);
					page = parsedUrl.searchParams.get("page") + 1;
				}
					console.log('Page: ' + page);
					pages[page ] = r.results;

			});

			promises.push(p);

	}

	await Promise.all(promises);
	console.debug('AfterPromises');

	console.debug('NumberedPages ' + pages.length);
	pages.map(p => { extsJson = extsJson.concat(p); });

	// console.debug(JSON.stringify(extsJson));
	extsJson.map((ext, index) => {
		console.debug(`${index}: ${ext.slug} : ${ext.average_daily_users}`);
	})
	return;

}

async function getAllExtensionDetails(pageStart, pageEnd) {
	let qs = { page: 0, app: "thunderbird", type: "extension", sort: "users" };

	let ap = [];
	for (let i = pageStart; i < pageEnd + 1; i++) {
		qs.page = i;
		// json_resp = await requestATN_URL(null, 'search', qs);
		let resp = await requestATN_URL(null, 'search', qs)
		if (i === 1) {
			// console.debug('page:\n'+ JSON.stringify( resp.results));

		}
		// console.debug(`page: ${i} ${resp.results[0].id} ${resp.results.length} \n\n\n\n`);
		ap += resp;
		extsJson = extsJson.concat(resp.results);
		// resp.results.map( ext => console.debug('Response Extension: '+ext.id));

		// console.debug('page:\n' + JSON.stringify( extsJson));


	}

	// console.debug('Await All'); 
	let ap2 = Promise.all(ap);
	console.debug('All Promises ' + ap.length + " " + extsJson.length);

	return ap2;
}


async function getAll(extArray, options) {
	// let p = [];

	// for (let index = 0; index < extArray.length; index++) {
	// 	const element = extArray[index];
	// 	const pc = await getExtensionFiles( element);
	// 	p.push(pc);
	// }
	exts = extArray.slice(options.start, options.end + 1);
	console.debug(`StartingGet: ${options.start} - ${options.end} : ${exts.length}`);

	const p = exts.map(async (extObj, index) => {
		console.debug('map start ' + index);

		// if (extObj === undefined) {
		// 	console.debug('Nul for itself');
		// 	return 0;
		// }

		let pc = {};
		if (typeof extObj === 'number') {
			pc = await getExtensionFiles(extObj, options.start + index);
			// console.debug('after get ' + pc);
			// console.debug('after get ' + pc);
		} else {
			pc = await getExtensionFiles(extObj.id, options.start + index);
		}
		// const pc = await getExtensionFiles(extId);
		// console.debug('after get return ' + pc);

		return pc;
	});

	console.debug('Await All');
	let ap = Promise.all(p);
	console.debug('All Promises ' + ap.length + " " + ap);

	return ap;
}

// ghSearch();
// console.debug(getDirectories('.'));
async function g1() {
	let startTime = new Date();
	console.debug('' + startTime);

	// extsJson = fs.readJSONSync(extsAllJsonFileName);
	// await getAllExtensionDetails(1, 54);
	await g2();
	console.debug('extension lines ' + extsJson.length);

	writePrettyJSONFile(extsAllJsonFileName, extsJson);
	console.debug('Finished Extension Details:');

	console.debug(new Date() - startTime);
	// return;
	console.debug('TotalExtensions: ' + extsJson.length);
	// extsJson = extArray;
	// try {
	let p = [];
	for (let index = 0; index < 67; index++) {
		console.debug('GetIndex ' + index);
		p.push(await getAll(extsJson, { start: (0 + index * 20), end: (19 + index * 20) }));
		// p.push(await getAll(extsJson, { start: 82 , end: 84 }));

	}

	let ap = Promise.all(p);
	// } catch (error) {
	// 	console.debug('outside  error ' + error);
	// }

	console.debug('after get all ' + extsJson.length);
	console.debug( (new Date() - startTime)/1000);
	console.debug(new Date());

	console.debug('rewriting masterfile');
	writePrettyJSONFile(extsAllJsonFileName, extsJson);

	extsJson.map(ext => {
		if (ext.xpilib === undefined || ext.xpilib === null) {
			console.debug(`Ext: ${ext.slug} : No xpilib`);
		}
	})
	// extArray = extsJson;
	// await getAll();

}

async function g2() {
	await getExtensions();
	console.debug('Totally Done');

}

g1();

// g2();