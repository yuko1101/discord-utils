module.exports = class Command {
    constructor(command) {
        this.raw = command
        this.name = command.name
        this.aliases = command.aliases
        this.description = command.description
        this.args = Object.prototype.toString.call(command.args) === '[object Array]' ? command.args : []
        this.options = command.options
        this.run = typeof command.run === "function" ? command.run : (msg, args, client) => {
            console.error(`[DiscordUtils] Command ${this.name}.run is not a function!`)
        }
        this.runAfter = command.runAfter ? (
            typeof command.runAfter === "function" ? command.runAfter : (msg, args, client) => {
                console.error(`[DiscordUtils] Command ${this.name}.runAfter is not a function!`)
            }
        ) : undefined,
            this.testing = !!command.testing

    }

    getCommandName(debugMode = undefined) {
        return debugMode ? this.name + "-debug" : this.name
    }
    getDescription() {
        return this.description || "No Description"
    }

}