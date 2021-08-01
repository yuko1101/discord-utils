module.exports = {
    getSimpleCommandName: (name) => {
        return name.replace(/-debug$/, "")
    }
}