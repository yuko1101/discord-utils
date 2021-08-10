const Discord = require("discord.js")
const fs = require("fs")
const Command = require("./Command")
const path = require("path")
const Reaction = require("./Reaction")
const Handler = require("./handlers/Handler")
const Pages = require("./Pages")

const eventHandler = new Map()

module.exports = class Client {
    constructor(client, prefixes, debugGuild = undefined) {
        this.client = client
        this.prefixes = prefixes
        this.application_id = client.isReady ? client.application?.id : undefined
        client.once("ready", () => { this.application_id = client.application.id })
        this.debugGuild = debugGuild
        this.registeredCommands = []
        this.commandApplied = false

        this.client.commands = new Discord.Collection()
        this.client.aliases = new Discord.Collection()

        new Reaction().setup(this)
        Handler.slashCommand(this)
        Handler.messageCommand(this)
        new Pages().setup(this)
    }

    /**
     *  @param {String} dir
    */
    async registerCommandsFromDir(dir) {
        const files = fs.readdirSync(`./${dir}`)
        for (const file of files) {
            const loadedFile = fs.lstatSync(`./${dir}/${file}`)
            if (loadedFile.isDirectory()) this.registerCommandsFromDir(`${dir}/${file}`)
            else this.registerCommand(new Command(require(path.resolve(require.main.path, dir, file))))
        }
    }

    /**
     * @param {Command} command 
     */
    async registerCommand(command) {
        if (!this.debugGuild && command.testing) {
            console.log(`[Discord Utils] skipped loading ${command.name} command (Testing Command)`)
            return
        }
        this.client.commands.set(command.name, command)
        if (command.aliases && command.aliases[0]) command.aliases.forEach(alias => this.client.aliases.set(alias, command.name))



        this.registeredCommands.push(command)

    }
    async applyCommands() {
        if (this.client.isReady && this.application_id == undefined) this.application_id = this.client.application.id
        if (this.commandApplied) return console.warn("[Discord Utils] Commands have already applied!")
        this.commandApplied = true
        if (this.client.isReady) {
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
     * @param {String} event
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

    const legacy = (await getApplications(client, debugGuild).commands.get()).filter(c => (debugGuild && c.name.endsWith("-debug")) || (!debugGuild && !c.name.endsWith("-debug")))

    //no legacy commands
    if (!legacy[0]) {
        for (const cmd of commands) {
            await getApplications(client, debugGuild).commands.post({
                data: {
                    name: cmd.getCommandName(debugGuild),
                    description: cmd.getDescription(),
                    options: [...(cmd.options)]
                }
            })
        }
        console.log(`Created ${commands.length} commands`)
        return
    }

    //delete all
    if (!commands) {
        for (const c of legacy) {
            await getApplications(client, debugGuild).commands(c.id).delete()
        }
        console.log(`Deleted ${legacy.length} commands`)
        return
    }

    const newCommands = commands.filter(cmd => !legacy.map(c => c.name).includes(cmd.getCommandName(debugGuild)))
    const mergeNewCommands = commands.filter(cmd => legacy.map(c => c.name).includes(cmd.getCommandName(debugGuild)))
    const mergeLegacyCommands = legacy.filter(c => commands.map(cmd => cmd.getCommandName(debugGuild)).includes(c.name))
    const deleteCommands = legacy.filter(c => !commands.map(cmd => cmd.getCommandName(debugGuild)).includes(c.name))

    console.log(newCommands, mergeNewCommands, mergeLegacyCommands, deleteCommands)
    if (newCommands[0]) {
        for (const cmd of newCommands) {
            await getApplications(client, debugGuild).commands.post({
                data: {
                    name: cmd.getCommandName(debugGuild),
                    description: cmd.getDescription(),
                    options: [...(cmd.options)]
                }
            })
        }
        console.log(`Created ${newCommands.length} commands`)
        return
    }

    if (deleteCommands[0]) {
        for (const c of deleteCommands) {
            await getApplications(client, debugGuild).commands(c.id).delete()
        }
        console.log(`Deleted ${deleteCommands.length} commands`)
    }

    if (mergeNewCommands[0]) {
        var nochanges = 0
        var haschanges = 0
        for (const cmd of mergeNewCommands) {
            const legacyCmd = mergeLegacyCommands.find(c => c.name === cmd.getCommandName(debugGuild))

            if (objectEquals(
                { /*name: cmd.getCommandName(debugGuild),*/ description: cmd.getDescription(), options: sortOptions(cmd.options || []) },
                { /*name: legacy.name,*/ description: legacyCmd.description, options: legacyCmd.options || [] }
            )) {
                nochanges++
            } else {
                await getApplications(client, debugGuild).commands(legacyCmd.id).delete()
                await getApplications(client, debugGuild).commands.post({
                    data: {
                        name: cmd.getCommandName(debugGuild),
                        description: cmd.getDescription(),
                        options: [...(cmd.options)]
                    }
                })
                haschanges++
            }
        }
        console.log(`Updated ${haschanges} commands, ${nochanges} commands have no changes`)
    }

    // if (legacy[0]) {
    //     console.log("legacy", legacy)
    //     const deletes = legacy.filter(c => !commands.map(cmd => cmd.name).includes(c.name.replace(/-debug$/, "")))
    //     for (const deleteCommand of deletes) {
    //         getApplications(client, debugGuild).commands(deleteCommand.id).delete()

    //     }
    //     const availables = legacy.filter(c => commands.map(cmd => cmd.name).includes(c.name.replace(/-debug$/, "")))
    //     const updates = commands.filter(cmd => !objectEquals({ description: cmd.description, options: cmd.options }, { description: availables.find(c => c.name.replace(/-debug$/, "") === cmd.name)?.description, options: availables.find(c => c.name.replace(/-debug$/, "") === cmd.name)?.options }))
    //     for (const updateCommand of updates) {
    //         if (availables.find(c => c.name.replace(/-debug$/, "") === updateCommand.name)?.id) await getApplications(client, debugGuild).commands(availables.find(c => c.name.replace(/-debug$/, "") === updateCommand.name)?.id).delete()
    //         getApplications(client, debugGuild).commands.post({
    //             data: {
    //                 name: updateCommand.name + (debugGuild ? "-debug" : ""),
    //                 description: updateCommand.description ? updateCommand.description : "No Description",
    //                 options: [...(updateCommand.options)]
    //             }
    //         })
    //     }
    //     debug("updates", updates)
    //     const news = commands.filter(cmd => !legacy.map(c => c.name.replace(/-debug$/, "")).includes(cmd.name))
    //     for (const newCommand of news) {
    //         getApplications(client, debugGuild).commands.post({
    //             data: {
    //                 name: newCommand.name + (debugGuild ? "-debug" : ""),
    //                 description: newCommand.description ? newCommand.description : "No Description",
    //                 options: [...(newCommand.options)]
    //             }
    //         })
    //     }

    // } else if (commands[0]) {
    //     for (const cmd of commands) {
    //         getApplications(client, debugGuild).commands.post({
    //             data: {
    //                 name: cmd.name + (debugGuild ? "-debug" : ""),
    //                 description: cmd.description ? cmd.description : "No Description",
    //                 options: [...(cmd.options)]
    //             }
    //         })
    //     }
    // }

}

function getApplications(client, debugGuild) {
    return debugGuild ? client.api.applications(client.user.id).guilds(debugGuild) : client.api.applications(client.user.id)
}


function sortOptions(options) {
    return options.map(option => {
        const returnOption = { type: option.type, name: option.name, description: option.description }
        if (option.required) returnOption.required = true
        if (option.choices) returnOption.choices = sortChoices(option.choices)
        return returnOption
    })
}

function sortChoices(choices) {
    return choices.map(choice => { return { name: choice.name, value: choice.value } })
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

