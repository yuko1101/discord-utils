const Discord = require("discord.js")
const Handler = require("./handlers/Handler")

const types = [
    "CHANNEL",
    "MESSAGE",
    "INTERACTION"
]

var utilsClient

const registeredPages = {}

module.exports = class Pages {
    constructor(...pages) {
        this.pages = pages
        this.currentPage = 0
        this.prePage = 0
    }

    addPages(...pages) {
        this.pages.push(...pages)
    }
    /**
     * 
     * @param {Discord.Channel | Discord.Message} to interaction can be the arg
     * @param { types } [type]
     * @param {Function} user_filter (Discord.User) => Boolean (can be promise function)
     */
    async send(to, type = "CHANNEL", user_filter = undefined) {
        if (!utilsClient) throw new Error("Pages is not ready")
        if (!types.includes(type)) throw new Error(`Types Array [${types.join(", ")}] does not include "${type}"`)
        if (!this.pages[0]) throw new Error("You need 1 page to send message at least")
        var sent
        if (type === "CHANNEL") {
            sent = await to.send(this.pages[0])
        } else if (type === "MESSAGE") {
            const channel = to.channel || await utilsClient.client.channels.fetch(to.channelId)
            sent = await channel.send(this.pages[0])
        } else if (type === "INTERACTION") {
            to.reply(this.pages[0]);
            sent = await Handler.getInteractionMessage(to, utilsClient.application_id)
        }

        if (!sent) throw new Error("An unknown error occurred while sending the pages message")

        await this.register(sent, user_filter)

        return sent
    }

    async edit(message, user_filter = undefined) {
        if (!message) throw new Error("An unknown error occurred while sending the pages message")
        await message.edit(this.pages[0])
        await this.register(message, user_filter)
        return message
    }

    setup(utilsClient_) {
        utilsClient = utilsClient_
        utilsClient.client.on("messageReactionAdd", async (reaction, user) => {
            if (!registeredPages[reaction.message.id]) return
            if (user.bot) return

            const registered = registeredPages[reaction.message.id][0]
            const user_filter = registeredPages[reaction.message.id][1]["user_filter"]
            if (user_filter && !(await user_filter(user))) return

            if (reaction.emoji.name === "▶") {
                registered.currentPage++
            } else if (reaction.emoji.name === "◀") {
                registered.currentPage--
            }
            if (registered.currentPage < 0 || registered.currentPage > registered.pages.length - 1) registered.currentPage = registered.prePage
            if (registered.currentPage !== registered.prePage) {
                reaction.message.edit(registered.pages[registered.currentPage])
                registered.prePage = registered.currentPage
            }
            reaction.users.remove(user)
        })
    }

    async register(sent, user_filter = undefined) {
        await sent.react("◀")
        await sent.react("▶")
        registeredPages[sent.id] = [this, { user_filter: user_filter }]
    }
}