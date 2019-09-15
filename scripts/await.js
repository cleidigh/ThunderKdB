
async function getCamoJson() {
    var options = {
        url: 'https://api.github.com/repos/scottwrobinson/camo',
        headers: {
            'User-Agent': 'cleidigh@gmail.com'
        }
    };
    return await request.get(options);
}

async function t() {
	var body = await getCamoJson();
	console.debug('Body '+body);
	
}

async function t2() {
	await t();
}
