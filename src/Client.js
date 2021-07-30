const Discord = require("discord.js")
const fs = require("fs")
const Command = require("./Command")
const path = require("path")
const Reaction = require("./Reaction")
const fetch = require("node-fetch")

module.exports = class Client {
    constructor(client, prefixes, application_id, debugGuild = undefined) {
        this.client = client
        this.prefixes = prefixes
        this.application_id = application_id
        this.debugGuild = debugGuild
        this.registeredCommands = []
        this.commandApplied = false

        this.client.commands = new Discord.Collection()
        this.client.aliases = new Discord.Collection()

        new Reaction().setup(client)
    }

    /**
     *  @param {command} DiscordUtils.Command
    */
    async registerCommandsFromDir(dir) {
        const files = fs.readdirSync(`./${dir}`)
        for (const file of files) {
            const loadedFile = fs.lstatSync(`./${dir}/${file}`)
            if (loadedFile.isDirectory()) loadCommands(`${dir}/${file}`)
            else this.registerCommand(new Command(require(path.resolve(require.main.path, dir, file))))
        }
    }

    async registerCommand(command) {
        this.client.commands.set(command.name, command)
        if (command.aliases && command.aliases[0]) command.aliases.forEach(alias => this.client.aliases.set(alias, command))

        this.client.on("message", async msg => {
            if (msg.author.bot) return
            for (const prefix of this.prefixes) {
                if (!msg.content.startsWith(prefix.toLowerCase())) continue
                const args = msg.content.toLowerCase().replace(prefix.toLowerCase(), "").split(/ +/)
                if (this.debugMode && !args[0].endsWith("-debug")) return
                const cmd = args.shift().replace(/-debug$/, "")
                const argsObject = argsToObject(args, command.args)
                if (command.name && cmd.toLowerCase() !== command.name.toLowerCase()) return
                const callback = await command.run({ ...msg, slashCommand: false }, argsObject, this.client)
                if (callback) {
                    const sent = await msg.channel.send(callback)
                    if (command.runAfter) command.runAfter({ ...msg, slashCommand: false }, sent, argsObject, this.client)
                }
                return
            }
        })
        this.client.ws.on('INTERACTION_CREATE', async interaction => {
            if (interaction.type === 2) {
                if (this.debugGuild && !interaction.data.name.endsWith("-debug")) return
                this.debug(interaction)
                const cmd = this.debugGuild ? interaction.data.name.replace(/-debug$/, "").toLowerCase() : interaction.data.name.toLowerCase();
                const args = {}
                if (interaction.data.options) interaction.data.options.forEach(arg => args[arg.name] = arg.value);
                const channel = this.client.channels.cache.find(c => c.id === interaction.channel_id)
                if (!channel) return
                var command = this.client.commands.get(cmd)
                if (!command) command = this.client.commands.get(this.client.aliases.get(cmd))
                if (!command) return
                const callback = await command.run({ ...interaction, channel: channel, slashCommand: true }, args, this.client)
                if (callback == null) {
                    await this.client.api.interactions(interaction.id, interaction.token).callback.post({
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
                    data = await createAPIMessage(interaction, callback)
                }
                await this.client.api.interactions(interaction.id, interaction.token).callback.post({
                    data: {
                        type: 4,
                        data: data
                    }
                })
                if (command.runAfter) command.runAfter({ ...interaction, channel: channel, slashCommand: true }, await getInteractionMessage(this.client, interaction, this.application_id), args, this.client)

            }

        })
        if (command.options) this.registeredCommands.push(command)

    }
    async applyCommands() {
        if (this.commandApplied) return console.warn("[Discord Utils] Commands have already applied!")
        this.commandApplied = true
        if (this.client.readyTimestamp && this.client.readyTimestamp <= Date.now()) {
            registerSlashCommands(this.client, this.registeredCommands, this.debugGuild ? this.debugGuild : undefined)
        } else {
            this.client.on("ready", () => {
                registerSlashCommands(this.client, this.registeredCommands, this.debugGuild ? this.debugGuild : undefined)
            })
        }
    }
    debug(...args) {
        if (this.debugGuild) console.log(...args)
    }
}

const getInteractionMessage = async (client, interaction, application_id) => {
    const channel = await client.channels.resolve(interaction.channel_id);
    return await fetch(`https://discord.com/api/v8/webhooks/${application_id}/${interaction.token}/messages/@original`).then(res => res.json()).then(async res => {
        console.log(res)
        return await channel.messages.fetch(res.id)
    })
};

async function registerSlashCommands(client, commands, debugGuild = undefined) {
    function debug(...args) {
        if (debugGuild) console.log(...args)
    }

    const legacy = (await getApplications(client, debugGuild).commands.get()).filter(c => (debugGuild && c.name.endsWith("-debug")) || (!debugGuild && !c.name.endsWith("-debug")))
    if (legacy[0]) {
        console.log("legacy", legacy)
        const deletes = legacy.filter(c => !commands.map(cmd => cmd.name).includes(c.name.replace(/-debug$/, "")))
        for (const deleteCommand of deletes) {
            getApplications(client, debugGuild).commands(deleteCommand.id).delete()

        }
        const availables = legacy.filter(c => commands.map(cmd => cmd.name).includes(c.name.replace(/-debug$/, "")))
        const updates = commands.filter(cmd => !objectEquals({ description: cmd.description, options: cmd.options }, { description: availables.find(c => c.name.replace(/-debug$/, "") === cmd.name).description, options: availables.find(c => c.name.replace(/-debug$/, "") === cmd.name).options }))
        for (const updateCommand of updates) {
            await getApplications(client, debugGuild).commands(availables.find(c => c.name.replace(/-debug$/, "") === updateCommand.name).id).delete()
            getApplications(client, debugGuild).commands.post({
                data: {
                    name: updateCommand.name + (debugGuild ? "-debug" : ""),
                    description: updateCommand.description ? updateCommand.description : "No Description",
                    options: [...(updateCommand.options)]
                }
            })
        }
        debug("updates", updates)
        const news = commands.filter(cmd => !legacy.map(c => c.name.replace(/-debug$/, "")).includes(cmd.name))
        for (const newCommand of news) {
            getApplications(client, debugGuild).commands.post({
                data: {
                    name: newCommand.name + (debugGuild ? "-debug" : ""),
                    description: newCommand.description ? newCommand.description : "No Description",
                    options: [...(newCommand.options)]
                }
            })
        }

    } else if (commands[0]) {
        for (const cmd of commands) {
            getApplications(client, debugGuild).commands.post({
                data: {
                    name: cmd.name + (debugGuild ? "-debug" : ""),
                    description: cmd.description ? cmd.description : "No Description",
                    options: [...(cmd.options)]
                }
            })
        }
    }

}

function getApplications(client, debugGuild) {
    return debugGuild ? client.api.applications(client.user.id).guilds(debugGuild) : client.api.applications(client.user.id)
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

async function createAPIMessage(interaction, content) {
    const { data, files } = await Discord.APIMessage.create(
        client.channels.resolve(interaction.channel_id),
        content
    ).resolveData().resolveFiles()

    return { ...data, ...files }
}

function objectEquals(obj1, obj2) {
    function objectSort(obj) {

        // ソートする
        const sorted = Object.entries(obj).sort();

        // valueを調べ、objectならsorted entriesに変換する
        for (let i in sorted) {
            const val = sorted[i][1];
            if (typeof val === "object") {
                sorted[i][1] = objectSort(val);
            }
        }

        return sorted;
    }

    const json1 = JSON.stringify(objectSort(obj1));
    const json2 = JSON.stringify(objectSort(obj2));

    return json1 === json2
}

