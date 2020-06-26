const form12 = window.document.getElementById('form12');
form12.addEventListener('click', notifyBackgroundPage12);

function handleResponse12(message) {console.log(`Message from background12: ${message.response12}`)};

function notifyBackgroundPage12(e) {var sending12 = browser.runtime.sendMessage({execute12: "Executing from form12"});
                                                 sending12.then(handleResponse12);}