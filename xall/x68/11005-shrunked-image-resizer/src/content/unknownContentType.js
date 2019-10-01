addEventListener('load', function() {
	let location = document.getElementById('location');
	let source = document.getElementById('source');
	if (source.value.startsWith('data:')) {
		let url = location.value;
		let header = url.split(',', 1)[0];
		for (let part of header.split(';')) {
			if (part.startsWith('filename=')) {
				let displayName = decodeURIComponent(part.substring(9));
				location.value = displayName;
				location.setAttribute('realname', displayName);
				location.setAttribute('tooltiptext', displayName);
				document.title = document.getElementById('strings').getFormattedString('title', [displayName]);
				return;
			}
		}
	}
});
