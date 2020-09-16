var c=0;
function loaded(args) {
	document.title=args?args[0]:'A title';
	let b=document.getElementsByTagName('button');
	b[0].textContent=args?args[1]:'button';
}
