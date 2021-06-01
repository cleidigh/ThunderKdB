class utils {
    /**
     * Encode everything that might need encoding in pathnames, including those
     * chars encodeURIComponent leaves as is
     * @param {string} aStr 
     * @returns {string} Encoded path
     */
    static encodepath(aStr) {
        return aStr.
            split("/").
            map(c => encodeURIComponent(c).replace(/[~*']/g, m => "%" + m.charCodeAt(0).toString(16))).
            join("/");
    }

    /**
     * Create a Promise that resolves after a given timeout
     * @param {number} ms The timeout in milliseconds
     */
    static promisedTimeout(ms) {
        return new Promise(resolve => {
            setTimeout(resolve, ms);
        });
    }
}

/* exported utils */