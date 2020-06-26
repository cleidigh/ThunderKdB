const form13 = window.document.getElementById('form13');
form13.addEventListener('click', notifyBackgroundPage13);

function handleResponse13(message) {console.log(`Message from background13: ${message.response13}`)};

function notifyBackgroundPage13(e) {var sending13 = browser.runtime.sendMessage({execute13: "Executing from form13"});
                                                 sending13.then(handleResponse13);}