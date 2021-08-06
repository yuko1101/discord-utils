module.exports = class CustomEmoji {
    constructor(client, guild_id, emoji_id) {
        this.emoji = client.guilds.cache.find(g => g.id === guild_id)?.emojis?.cache?.find(e => e.id = emoji_id)?.toString()
    }
}