async function main() {
	messenger.menus.create({
		contexts : ["folder_pane"],
		id: "logoutFromServer",
		onclick : logout_onclick,
		title: "Logout"
	});
}

function logout_onclick(item) {
	account_promise=messenger.accounts.get(item.selectedFolder.accountId);
	account_promise.then(logout,logout_failure);
}

function logout_failure(result) {
	console.log("logout_failure");
	console.log(result);
}

function logout(result) {
	//console.log(result);
	if( result != null && result.identities != null ) {
		messenger.exp_logout.exp_logout(result.identities);
	}
}

main();
