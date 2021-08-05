const Discord = require("discord.js")
const Handler = require("./handlers/Handler")

const types = [
    "CHANNEL",
    "MESSAGE",
    "INTERACTION"
]

var utilsClient

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
            sent = await to.channel.send(this.pages[0])
        } else if (type === "INTERACTION") {
            await utilsClient.client.api.interactions(to.id, to.token).callback.post({
                data: {
                    type: 4,
                    data: this.pages[0]
                }
            })
            sent = await Handler.getInteractionMessage(utilsClient.client, to, utilsClient.application_id)
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

    }

    async register(sent, user_filter = undefined) {
        await sent.react("◀")
        await sent.react("▶")

        utilsClient.client.on("messageReactionAdd", async (reaction, user) => {
            if (reaction.message.id !== sent.id) return
            if (user.bot) return
            if (user_filter && !(await user_filter(user))) return
            if (reaction.emoji.name === "▶") {
                this.currentPage++
            } else if (reaction.emoji.name === "◀") {
                this.currentPage--
            }
            if (this.currentPage < 0 || this.currentPage > this.pages.length - 1) this.currentPage = this.prePage
            if (this.currentPage !== this.prePage) {
                reaction.message.edit(this.pages[this.currentPage])
                this.prePage = this.currentPage
            }
            reaction.users.remove(user)
        })
    }
}