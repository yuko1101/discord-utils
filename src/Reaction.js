const registered = []
var client

module.exports = class Reaction {
    constructor(msg, type = "CUSTOM") {
        this.msg = msg?.id ? msg.id : msg
        this.type = type
    }
    register() {
        registered.push({
            message_id: this.msg,
            message_type: this.type
        })
        console.log("registered", registered)
    }


    //do not run this twice (once in Client.js)
    setup(utilsClient) {
        client = utilsClient.client
        client.on("messageReactionAdd", (reaction, user) => {
            if (user.bot) return
            const msg = reaction.message
            const founds = registered.filter(m => m.message_id === msg.id)
            if (!founds[0]) return
            founds.forEach(m => utilsClient.emit("reactionAdd", m.message_type, reaction, user))
        })
        client.on("messageReactionRemove", (reaction, user) => {
            if (user.bot) return
            const msg = reaction.message
            const founds = registered.filter(m => m.message_id === msg.id)
            if (!founds[0]) return
            founds.forEach(m => utilsClient.emit("reactionRemove", m.message_type, reaction, user))
        })
    }
}