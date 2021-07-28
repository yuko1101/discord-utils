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
                const argsObject = argsToObject(args, command.args)
                if (command.name && cmd.toLowerCase() !== command.name.toLowerCase()) return
                return await command.run(msg, argsObject, this.client)
            }

        })
    }
}

function argsToObject(args, msgArgsOption) {
    const argObj = {}
    if (args.length <= msgArgsOption.length) {
        args.forEach((arg, i, array) => argObj[msgArgsOption[i]] = arg)
        return argObj
    } else if (args.length > msgArgsOption.length) {
        for (var i = 0; i < msgArgsOption.length; i++) {
            if (i === msgArgsOption.length - 1) {
                argObj[msgArgsOption[i]] = args.join(" ")
                break
            }
            argObj[msgArgsOption[i]] = args.shift()
        }
        return argObj
    }
    return argObj
}