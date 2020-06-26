const form3 = window.document.getElementById('form3');
form3.addEventListener('click', notifyBackgroundPage3);

function handleResponse3(message) {console.log(`Message from background3: ${message.response3}`)};

function notifyBackgroundPage3(e) {var sending3 = browser.runtime.sendMessage({execute3: "Executing from form3"});
                                                 sending3.then(handleResponse3);}