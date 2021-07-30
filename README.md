# discord-utils
JavaScript module for a discord bot

# This module includes
 - Advanced Command Handler (Supporting Slash Commands)

# Setup (index.js)
Run `npm install yuko1101/discord-utils` in terminal

``` js
const Discord = require("discord.js");
const client = new Discord.Client();

const utils = require("discord-utils");
const UtilsClient = new utils.Client(client, ["!", "?"], "your_application_id") // (bot_client, prefixes, application_id)

UtilsClient.registerCommandsFromDir("commands") //load commands in "commands" folder

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`);
  UtilsClient.applyCommands() // apply the commands which you registered
});

client.login("token"); // Your bot token goes here
```
# Adding Commands (commands/reply_command.js)

``` js
module.exports = {
    name: "reply", //command name
    args: ["reply_text"], //arg names
    description: "replies to you!",
    options: [ //options for slash commands
        {
            name: "reply_text", //this should be arg names
            description: "reply text that you want to be replied", 
            type: 3 //string
        }
    ],
    run: async (msg, args, client) => {
        return "replying..." //send message to the channel
    },
    runAfter: async (msg, sent, args, client) => {
        setTimeout(() => {
            sent.edit(args["reply_text"]) //edit to reply_text
        }, 2000); //edit the message (that you sent in run function) in 2sec
    }
}
```
