'use strict';
/* This module attempts to improve the readability of command related bots and make them easier to maintain. */

const Discord = require('discord.js');

/**
 * Default error handler, it's advised to replace it with a custom one based on the error type.
 * @param {Discord.Message} message - The message that raised the error.
 * @param {Error} error - The error thrown during the command execution.
 */
function defaultErrorHandler(message, error) {
    throw error;
}

class Command {
    /**
     * Creates a Command object storing other useful stuff.
     * @param {Function} commandFunction - The function that will be called after all the checks are deemed successful.
     * @param {string} [name = commandFunction's name] - The name the Command will be called from, can't have " " inside it.
     * @param {string} [usage = commandFunction's signature] - Replaces the argument names in the help command.
     * @param {Function[]} [checks = []] - List of the checks that will be performed before the command is executed.
     * @constructor
     */
    constructor(commandFunction, name = undefined, usage = undefined, checks = undefined){
        if (!commandFunction) {
            throw new TypeError("A function must be given to the command");
        }
        if (!name || name.includes(" ")){
            name = commandFunction.name;
        }
        if (!usage){
            usage = this._parseArgs(commandFunction)
        }
        this.name = name;
        this.usage = usage;
        this.checks = checks || [];
        this.commandFunction = commandFunction;
    }

    /**
     * Adds one or many checks to the Command after its initialization.
     * @param {...Function} chk - Check to be run before the Command is executed.
     */
    addCheck(chk) {
        for (let check of arguments) {
            this.checks.push(check);
        }
    }

    /**
     * Performs all the checks included in the Command.
     * @param {Discord.Message} message - Message object used by the different checks.
     * @returns {boolean} - If all the checks are passed successfully or not.
     */
    performChecks(message) {
        for (let check of this.checks) {
            if (!check(message)) return false;
        }
        return true;
    }

    /**
     * Gets the signature of a function.
     * @param {Function} funct - Function that will be analyzed.
     * @returns {string} signature - Signature of the given function.
     * @private
     */
    _parseArgs(funct) {
        let string = funct.toString();
        let start = 0, stop = 0;
        for (let charIndex in string) {
            if (!start && string[charIndex] === '(') {
                start = Number(charIndex);
            }
            if (start && string[charIndex] === ')') {
                stop = Number(charIndex);
                break
            }
        }
        let args = string.slice(start + 1, stop)
                              .replace(/ /g, "")
                              .replace(/,/g, " ");
        return args.slice(1);
    }
}

/**
 * Extension of the Discord.js Client to incorporate all the command methods and properties.
 * @extends {Discord.Client}
 */
class Bot extends Discord.Client {
    /**
     * @param {Object} [options] Options for the bot (errorHandler, commmands, checks, prefix) + the discord ones
     * @constructor
     */
    constructor(options = {}) {
        super(options);

        this.errorHandler = this.options.errorHandler || defaultErrorHandler;
        this.commands = this.options.commands || [];
        this.checks = this.options.checks || [];
        if (!this.options.prefix || this.options.prefix.includes(" ")) {
            throw new TypeError('The bot prefix can\'t contain a space and must be defined')
        }
        this.prefix = this.options.prefix;
    }

    /* WIP Needs to be worked on;
    context(message) {
        let ctx = {};
        ctx.message = message;
        ctx.client = this;
        ctx.prefix = this.prefix;
        ctx.guild = message.guild;
        ctx.author = message.member || message.author;
        ctx.channel = message.channel;
        ctx.send = ctx.channel.send;
        return ctx;
    }*/

    /**
     * Adds one or many global checks to the Bot after its initialization.
     * @param {...Function} chk - Check to be run before any Command is executed.
     */
    addCheck(chk) {
        for (let check of arguments) {
            this.checks.push(check);
        }
    }

    /**
     * Adds one or many Commands to the Command after its initialization.
     * @param {...Command} cmd - Command that will be added to the bot.
     */
    addCommand(cmd) {
        for (let command of arguments) {
            this.commands.push(command);
        }
    }

    /**
     * Default implementation of a message handler, modify it to support anything other than commands.
     * @param {Discord.Message} message - Message that will be analyzed.
     * @returns {Promise<void>}
     */
    async on_message(message) {
        if (!message.author.bot && message.content.startsWith(this.prefix)){
            await this._commandHandler(message);
        }
    }

    /**
     * Chooses what Command to call based on the Message and the names of the Commands.
     * @param {Discord.Message} message - Message that will be analyzed.
     * @returns {Promise<void>}
     * @private
     */
    async _commandHandler(message) {
        let name = message.content.split(" ")[0].replace(this.prefix, "");
        let args = this._parseArgs(message.content);

        for (let check of this.checks) {
            if (!check(message)) return;
        }

        for (let command of this.commands) {
            if (command.name === name && command.performChecks(message)) {
                try {
                    await command.commandFunction(message, ...args);
                }
                catch (error) {
                    await this.errorHandler(message, error);
                }
            }
        }
    }

    /**
     * Transforms the Message content into an Array of arguments for the Command.
     * @param {String} str - Message content.
     * @returns {String[]} args - Arguments parsed.
     * @private
     */
    _parseArgs(str) {
        let argStr = str.split(" ").slice(1).join(" ");
        let argArr = [];
        let buffer = "";
        let inQuote = false;
        let escaped = false;
        let ready = false;
        for (let char of  argStr) {
            if (escaped) {
                buffer += char;
                escaped = false;
            }
            else if (char === '"') {
                if (inQuote) {
                    ready = true;
                    inQuote = false;
                }
                else {
                    inQuote = true;
                }
            }
            else if (char === ' ' && !inQuote) {
                ready = true;
            }
            else if (char === "\\") {
                escaped = true;
            }
            else {
                buffer += char;
            }
            if (ready && buffer) {
                argArr.push(buffer);
            }
            if (ready) {
                ready = false;
                buffer = "";
            }
        }
        if (buffer) {
            argArr.push(buffer);
        }
        return argArr;
    }
}

module.exports = {
    Bot: Bot,
    Command: Command,
};