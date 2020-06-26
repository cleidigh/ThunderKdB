window.addEventListener('click', notifyBackgroundPage5);

function handleResponse5(message) {console.log(`Message from background5: ${message.response5}`)};

function notifyBackgroundPage5(e) {var sending5 = browser.runtime.sendMessage({execute5: "Executing from refresh5"});
                                                 sending5.then(handleResponse5);}