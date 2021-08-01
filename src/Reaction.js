const registered = []
var client;

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
    }


    //do not run this twice (once in Client.js)
    setup(client_) {
        client = client_
        client.on("messageReactionAdd", (reaction, user) => {
            const msg = reaction.message

        })
    }
}