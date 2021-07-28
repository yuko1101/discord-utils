module.exports = class Command {
    constructor(command) {
        this.raw = command
        this.name = command.name
        this.args = Object.prototype.toString.call(command.args) === '[object Array]' ? command.args : []
        this.run = typeof command.run === "function" ? command.run : (msg, args, client) => {
            console.error(`[DiscordUtils] Command ${this.name}.run is not a function!`)
        }

    }

}