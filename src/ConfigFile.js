const fs = require("fs")
const path = require("path")
const { hasPath, createPath } = require("./utils/helper")

module.exports = class ConfigFile {
    constructor(file_path, compact = false) {
        this.file_path = file_path
        this.isReady = false
        this.resolevedPath = path.resolve(require.main.path, file_path)
        this.raw = null
        this.compact = compact
        fs.readFile(this.resolevedPath, { encoding: "utf8" }, (err, file) => {
            if (err) {
                throw new Error(err)
            } else {
                try {
                    console.log(file)
                    this.raw = JSON.parse(file)
                    this.isReady = true
                } catch (e) {
                    throw new Error(e)
                }
                if (typeof this.raw !== "object") throw new Error("You can save only JSON Object in ConfigFile")
            }
        })
    }

    async reload() {
        if (!this.isReady) throw new Error("ConfigFile is not ready")
        try {
            this.raw = JSON.parse(fs.readFileSync(this.resolevedPath))

        } catch (e) {
            throw new Error(e)
        }
        if (typeof this.raw !== "object") throw new Error("You can save only JSON Object in ConfigFile")
        return this.raw
    }

    /**
     * @param {Object} data
     */
    set json(data) {
        console.log(typeof data)
        if (typeof data !== "object") throw new Error("You can save only JSON Object in ConfigFile")
        this.updateFile()
        this.raw = data
    }

    get json() {
        return this.raw
    }

    /**
     * @param {String} key 
     * @param {*} value
     */
    set(key, value) {
        if (!this.isReady) throw new Error("ConfigFile is not ready")
        if (typeof this.json !== "object") throw new Error("You can save only JSON Object in ConfigFile")
        const keys = key.split(".")
        if (!hasPath(this.json, ...keys)) createPath(this.json, ...keys)
        var data = this.json
        for (var i = 0; i < keys.length; i++) {
            if (i !== keys.length - 1) {
                data = data[keys[i]]
            } else {
                data[keys[i]] = value
            }

        }

        this.updateFile()
    }

    /**
     * @param {String} key 
     * @param {*} default_value
     */
    get(key, default_value) {
        if (!this.isReady) throw new Error("ConfigFile is not ready")
        if (typeof this.json !== "object") throw new Error("You can save only JSON Object in ConfigFile")
        const keys = key.split(".")
        if (!hasPath(this.json, ...keys)) return default_value
        var data = this.json
        for (var i = 0; i < keys.length; i++) {
            if (i !== keys.length - 1) {
                data = data[keys[i]]
            } else {
                return data[keys[i]]
            }

        }
    }

    async updateFile() {
        try {
            fs.writeFileSync(this.resolevedPath, this.compact ? JSON.stringify(this.raw) : JSON.stringify(this.raw, null, "\t"))
        } catch (e) {
            throw new Error(e)
        }
        return;
    }
}