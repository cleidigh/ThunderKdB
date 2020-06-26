const form10 = window.document.getElementById('form10');
form10.addEventListener('click', notifyBackgroundPage10);

function handleResponse10(message) {console.log(`Message from background10: ${message.response10}`)};

function notifyBackgroundPage10(e) {var sending10 = browser.runtime.sendMessage({execute10: "Executing from form10"});
                                                 sending10.then(handleResponse10);}