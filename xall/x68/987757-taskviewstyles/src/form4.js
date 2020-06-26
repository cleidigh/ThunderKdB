const form4 = window.document.getElementById('form4');
form4.addEventListener('click', notifyBackgroundPage4);

function handleResponse4(message) {console.log(`Message from background4: ${message.response4}`)};

function notifyBackgroundPage4(e) {var sending4 = browser.runtime.sendMessage({execute4: "Executing from form4"});
                                                 sending4.then(handleResponse4);}