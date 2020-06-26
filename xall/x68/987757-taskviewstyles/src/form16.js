const form16 = window.document.getElementById('form16');
form16.addEventListener('click', notifyBackgroundPage16);

function handleResponse16(message) {console.log(`Message from background16: ${message.response16}`)};

function notifyBackgroundPage16(e) {var sending16 = browser.runtime.sendMessage({execute16: "Executing from form16"});
                                                 sending16.then(handleResponse16);}