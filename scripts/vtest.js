

	const v = "69.1a1";
	const p = /[\d\.]+/;
	let v_max_num = p.exec(v);

	console.debug('versions '+ Number(v) + " n: "+v_max_num);