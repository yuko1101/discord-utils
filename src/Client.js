module.exports = class Client {
    constructor(client, prefixes, debug = false) {
        this.client = client
        this.prefixes = prefixes
        this.debug = debug
    }

    /**
     *  @param {command} DiscordUtils.Command
    */
    async onCommand(command) {
        this.client.on("message", async msg => {
            if (msg.author.bot) return
            const args = msg.content.split(/ +/)
            const cmd = args.shift()
            if (command.name && cmd.toLowerCase() !== command.name.toLowerCase()) return
            return command.run(msg, args, this.client)
        })
    }
}