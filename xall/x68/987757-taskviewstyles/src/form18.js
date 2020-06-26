const form18 = window.document.getElementById('form18');
form18.addEventListener('click', notifyBackgroundPage18);

function handleResponse18(message) {console.log(`Message from background18: ${message.response18}`)};

function notifyBackgroundPage18(e) {var sending18 = browser.runtime.sendMessage({execute18: "Executing from form18"});
                                                 sending18.then(handleResponse18);}