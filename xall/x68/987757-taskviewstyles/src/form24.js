const form24 = window.document.getElementById('form24');
form24.addEventListener('click', notifyBackgroundPage24);

function handleResponse24(message) {console.log(`Message from background24: ${message.response24}`)};

function notifyBackgroundPage24(e) {var sending24 = browser.runtime.sendMessage({execute24: "Executing from form24"});
                                                 sending24.then(handleResponse24);}