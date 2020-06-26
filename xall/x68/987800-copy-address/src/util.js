export async function retry(num, sec, callback) {
    let b = callback();
    for (let i = 0; !b && i < num; i++) {
        console.log(`retry! [${i + 1}/${num}]`);
        b = await timer(sec, callback);
    }
    if (!b) {
        throw new Error('retry failure');
    }
    return b;
}
export async function timer(sec, callback) {
    return new Promise((resolve) => {
        setTimeout(() => {
            const r = callback();
            resolve(r);
        }, sec * 1000);
    });
}
