form1.addEventListener('click', notifyBackgroundPage);

function handleResponse(message) {console.log(`Message from background: ${message.response}`)};

function notifyBackgroundPage(e) {var sending = browser.runtime.sendMessage({execute: "Executing from form"});
                                                 sending.then(handleResponse);}