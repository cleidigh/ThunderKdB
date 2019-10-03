// Feedly Synchronizer AddOn for Mozilla Thunderbird
// Developed by Antonio Miras Aróstegui
// Published under Mozilla Public License, version 2.0 (https://www.mozilla.org/MPL/2.0/)

Components.utils.import("resource://gre/modules/Services.jsm");

const PREF_BRANCH = "extensions.FeedlySync.";
const PREFS = {
	baseUrl : "http://www.feedly.com",
	baseSslUrl : "https://www.feedly.com",

	"log.active" : false,
	"log.toFile" : false,

	"toolbar" : "",
	"toolbar.before" : "",

	"auth.getCodeOp" : "/v3/auth/auth",
	"auth.getTokenOp" : "/v3/auth/token",

	"auth.resTypePar" : "response_type",
	"auth.resTypeVal" : "code",
	"auth.cliIdPar" : "client_id",
	"auth.cliIdVal" : "synchronizer",
	"auth.cliSecPar" : "client_secret",
	"auth.cliSecVal" : "FE01WKCQJDMUIH99SX6Q3P6IQIGC",
	"auth.redirPar" : "redirect_uri",
	"auth.redirVal" : "http://localhost:8080",
	"auth.scopePar" : "scope",
	"auth.scopeVal" : "https://cloud.feedly.com/subscriptions",
	"auth.statePar" : "state",
	"auth.codePar" : "code",
	"auth.grantTypePar" : "grant_type",
	"auth.grantTypeVal" : "authorization_code",
	"auth.refreshTokenPar" : "refresh_token",

	"auth.tokenRefresh" : "",
	"auth.userId" : "",
	"auth.expiringMargin" : 80,

	"synch.tokenParam" : "Authorization",
	"synch.subsOp" : "/v3/subscriptions",
	"synch.categoryOp" : "/v3/categories",
	"synch.account" : "",
	"synch.direction" : 0,						// 0: Synchronization, 1: Upward, 2: Downward
	"synch.timeout" : 10,

	"debug.active" :  false,
	"debug.baseUrl" : "http://sandbox7.feedly.com",
	"debug.baseSslUrl" : "https://sandbox7.feedly.com",
	"debug.auth.cliSecVal" : "e4RK9ybUMPAa5PgV",
	"debug.auth.cliIdVal" : "sandbox"
};
