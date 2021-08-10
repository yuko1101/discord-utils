const { getSimpleCommandName } = require("../Utils");
const fetch = require("node-fetch")
const Discord = require("discord.js")


module.exports = {
    slashCommand: (utilsClient) => {
        utilsClient.client.ws.on('INTERACTION_CREATE', async interaction => {
            if (interaction.type === 2) {
                if (utilsClient.debugGuild && !interaction.data.name.endsWith("-debug")) return
                utilsClient.debug(interaction)
                const cmd = utilsClient.debugGuild ? getSimpleCommandName(interaction.data.name).toLowerCase() : interaction.data.name.toLowerCase();

                const args = {}
                if (interaction.data.options) interaction.data.options.forEach(arg => args[arg.name] = arg.value);

                var command = utilsClient.client.commands.get(cmd)
                if (!command) command = utilsClient.client.commands.get(utilsClient.client.aliases.get(cmd))
                if (!command) return

                const msg = interaction
                msg.slashCommand = true
                msg.author = interaction.member.user
                msg.guild = await utilsClient.client.guilds.fetch(interaction.guild_id)
                msg.channel = await utilsClient.client.channels.fetch(interaction.channel_id)

                const callback = await command.run(msg, args, utilsClient.client)
                utilsClient.debug(callback)
                //if you return null or undefined in Command run function, runAfter won't be triggered
                if (callback === null) return
                if (callback === undefined) {
                    await utilsClient.client.api.interactions(interaction.id, interaction.token).callback.post({
                        data: {
                            type: 5
                        }
                    })
                    return
                }
                var data = {
                    content: callback
                }
                if (typeof callback === "object") {
                    data = callback
                }
                await utilsClient.client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: data
                    }
                })
                if (command.runAfter) command.runAfter(msg, await getInteractionMessage(utilsClient.client, interaction, utilsClient.application_id), args, utilsClient.client)

            }

        })
    },
    messageCommand: (utilsClient) => {
        utilsClient.client.on("messageCreate", async msg => {
            if (msg.author.bot) return
            for (const prefix of utilsClient.prefixes) {
                if (!msg.content.startsWith(prefix.toLowerCase())) continue
                const args = msg.content.toLowerCase().replace(prefix.toLowerCase(), "").trim().split(/ +/)
                if (utilsClient.debugGuild && !args[0].endsWith("-debug")) return
                if (!utilsClient.debugGuild && args[0].endsWith("-debug")) return
                const cmd = getSimpleCommandName(args.shift())

                var command = utilsClient.client.commands.get(cmd)
                if (!command) command = utilsClient.client.commands.get(utilsClient.client.aliases.get(cmd))
                if (!command) return

                const msgObject = msg
                msgObject.slashCommand = false

                const argsObject = argsToObject(args, command.args)
                const callback = await command.run(msgObject, argsObject, utilsClient.client)
                if (callback) {
                    const sent = await msg.channel.send(callback)
                    if (command.runAfter) command.runAfter(msgObject, sent, argsObject, utilsClient.client)
                }
                return
            }
        })
    },
    getInteractionMessage: getInteractionMessage
}

async function getInteractionMessage(client, interaction, application_id) {
    const channel = await client.channels.resolve(interaction.channel_id);
    return await fetch(`https://discord.com/api/v8/webhooks/${application_id}/${interaction.token}/messages/@original`).then(res => res.json()).then(async res => {
        console.log(res)
        return await channel.messages.fetch(res.id)
    })
};

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