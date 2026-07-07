const DEBUG = true; // change to false for release builds if desired

export const log = {
    debug: (...args: unknown[]) => {
        if (DEBUG) {
            console.debug(...args);
        }
    },
    info: (...args: unknown[]) => console.info(...args),
    warn: (...args: unknown[]) => console.warn(...args),
    error: (...args: unknown[]) => console.error(...args),
};

// export const log = {
//     debug: (...args: unknown[]) => config.debug && console.debug(...args),
//     info: (...args: unknown[]) => console.info(...args),
//     warn: (...args: unknown[]) => console.warn(...args),
//     error: (...args: unknown[]) => console.error(...args),
// };
