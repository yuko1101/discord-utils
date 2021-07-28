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
            for (const prefix of this.prefixes) {
                if (!msg.content.startsWith(prefix.toLowerCase())) continue
                const args = msg.content.toLowerCase().replace(prefix.toLowerCase(), "").split(/ +/)
                const cmd = args.shift()
                if (command.name && cmd.toLowerCase() !== command.name.toLowerCase()) return
                return await command.run(msg, args, this.client)
            }

        })
    }
}