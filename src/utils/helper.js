function getKey(key) {
    return key //disabled
}

module.exports = {
    hasPath: (obj, ...keys) => {
        if (obj == null)
            return false;

        let loc = obj;

        for (let i = 0; i < keys.length; i++) {
            loc = loc[getKey(keys[i])];

            if (loc === undefined)
                return false;
        }

        return true;
    },

    getPath: (obj, ...keys) => {
        if (obj == null)
            return undefined;

        let loc = obj;

        for (let i = 0; i < keys.length; i++) {
            loc = loc[getKey(keys[i])];

            if (loc === undefined)
                return undefined;
        }

        return loc;
    },

    createPath: (obj, ...keys) => {
        if (obj == null)
            return undefined

        let loc = obj;

        for (let i = 0; i < keys.length; i++) {
            loc[getKey(keys[i])] = {};

            loc = loc[getKey(keys[i])]
        }
    }
}