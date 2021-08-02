const Discord = require("discord.js")
const fs = require("fs")
const Command = require("./Command")
const path = require("path")
const Reaction = require("./Reaction")
const Handler = require("./handlers/Handler")

const eventHandler = new Map()

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

        new Reaction().setup(client, this)
        Handler.slashCommand(this)
        Handler.messageCommand(this)
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



        this.registeredCommands.push(command)

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

    /**
     * 
     * @param {string} event
     * @param {*} callback 
     */

    on(event, callback) {
        if (eventHandler.get(event)) {
            eventHandler.get(event).push(callback)
        } else {
            eventHandler.set(event, [callback])
        }
    }
    emit(event, ...args) {
        eventHandler.get(event).forEach(fn => fn(...args))
    }
}



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
        const updates = commands.filter(cmd => !objectEquals({ description: cmd.description, options: cmd.options }, { description: availables.find(c => c.name.replace(/-debug$/, "") === cmd.name)?.description, options: availables.find(c => c.name.replace(/-debug$/, "") === cmd.name)?.options }))
        for (const updateCommand of updates) {
            if (availables.find(c => c.name.replace(/-debug$/, "") === updateCommand.name)?.id) await getApplications(client, debugGuild).commands(availables.find(c => c.name.replace(/-debug$/, "") === updateCommand.name)?.id).delete()
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

