const EDiscord = require('./enhanced_discord');
const Command = EDiscord.Command;

// Errors
class PermissionError extends TypeError {
    constructor(message) {
        super(message);
        this.name = "PermissionError";
    }
}

async function customErrorHandler(message, error) {
    if (error instanceof PermissionError) {
        let reply;
        if (error.message()) reply = error.message();
        else reply = "Default Error Message";
        await message.channel.send(reply);
    }
}

// Initializing the bot with custom options
let bot = new EDiscord.Bot({prefix: "$", errorHandler: customErrorHandler});

// Checks
function isGuildOwner(msg) {
    if (msg.guild && msg.author.id === msg.guild.ownerID) {
        return true;
    }
    else throw new PermissionError();
}

// Commands
async function hello (msg) {
    await msg.channel.send('Hii');
}
let hello_command = new Command(hello);

async function hidden(msg, arg1){
	if (!arg1) arg1 = 'Nothing';
    await msg.channel.send(`The owner : ${arg1}`);
}
let hidden_command = new Command(hidden, "specialCommand", "", []);
hidden_command.addCheck(isGuildOwner);

bot.addCommand(hello_command, hidden_command);

bot.on('message', bot.on_message);
bot.login('token');

module.exports = bot;

/* on discord:
	USER  > $hello
	BOT   > Hii
	USER  > $hidden
	BOT   > Default Error Message
	OWNER > $hidden
	BOT   > The owner : Nothing
*/
