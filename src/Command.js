module.exports = class Command {
    constructor(command) {
        this.raw = command
        this.name = command.name
        this.args = Object.prototype.toString.call(command.args) === '[object Array]' ? command.args : []
        this.options = command.options
        this.run = typeof command.run === "function" ? command.run : (msg, args, client) => {
            console.error(`[DiscordUtils] Command ${this.name}.run is not a function!`)
        }
        this.runAfter = command.runAfter ? (
            typeof command.runAfter === "function" ? command.runAfter : (msg, args, client) => {
                console.error(`[DiscordUtils] Command ${this.name}.runAfter is not a function!`)
            }
        ) : undefined

    }

    getCommandName(guild_id) {
        if (guild_id) return this.name + "-debug"; else return this.name
    }

}