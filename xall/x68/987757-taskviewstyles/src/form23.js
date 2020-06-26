const form23 = window.document.getElementById('form23');
form23.addEventListener('click', notifyBackgroundPage23);

function handleResponse23(message) {console.log(`Message from background23: ${message.response23}`)};

function notifyBackgroundPage23(e) {var sending23 = browser.runtime.sendMessage({execute23: "Executing from form23"});
                                                 sending23.then(handleResponse23);}