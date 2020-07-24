// JavaScript

"use strict";


async function hashthis (value, algorithm = 'SHA-256') {
    let msgBuffer = new TextEncoder('utf-8').encode(value);
    let hashBuffer = await crypto.subtle.digest(algorithm, msgBuffer);
    let hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => ('00' + b.toString(16)).slice(-2)).join('');
}

/*
var x = hashthis("uewuiwuwuiwiw");
x.then((res) => {console.log(res)});
*/
