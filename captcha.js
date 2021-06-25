/* This client was created by MistakingManx#5555, if you have any questions please send me a message via Discord! */
console.clear();
var Discord = require('discord.js');
var client = new Discord.Client();
var fetch = require('node-fetch');
var fs = require('fs');

var config = getConfig();
var data = getSaveData();

if (config.token == "INSERT_TOKEN") {
	console.warn("A configuration file (config.json) has been generated, please set it up.\n\n[Alert] Closing in 5 seconds.");
	TIME_LEFT = 5;
	setInterval(() => {
		--TIME_LEFT;
		console.warn("[Alert]", "Closing in " + TIME_LEFT + ` second${(TIME_LEFT > 1) ? "s" : ""}.`);
		if (TIME_LEFT < 1) return process.exit(0);
	}, 1000);
}

var captcha = {
	create: async () => {
		return (await fetch(`https://captcha.manx7.net/insecure/new`,{headers:captcha.opt}).then(d => d.json()).catch(e => { console.error(e); return; }));
	},
	opt: { "captcha-length": config.captcha.length },
	limit: 3
};

var messages = {
	captchaTitle: "{GUILD_NAME} - Verification",
	captchaEmbed: "Hello, <@{USER_ID}>, we're sorry to trouble you, but to ensure the safety of our community we require you to solve this simple captcha.",
	captchaFooter: "Captcha Verification Level: " + gCD()
};

client.on('ready', () => {
	console.log(`Captcha client connected as ${client.user.tag}! (Ready for business)`);
	check();
	setInterval(autoSave, 30000)
	messages.captchaTitle = messages.captchaTitle.replace(/\{GUILD\_NAME\}/gi, client.guilds.cache.get(config.guild).name);
	messages.captchaFooter = messages.captchaFooter.replace(/\{GUILD\_NAME\}/gi, client.guilds.cache.get(config.guild).name);
}).on('message', async (message) => {
	if (message.author.bot) return;
	switch(message.channel.type) {
		case "text":
			if (message.guild.id !== config.guild) return;
			if (!message.content.startsWith(config.prefix)) return;
			var args = message.content.slice(config.prefix.length).split(" ");
			switch(args[0]) {
				case "verify":
				case "recaptcha":
				case "captcha":
				case "iamhuman":
					if (message.member.roles.cache.map(r => { return r.id; }).includes(config.role)) {
						message.channel.send({embed: {
							color: 0xc97070, description: `You're already verified, <@!${message.author.id}>!`
						}}).catch(console.warn);
					} else {
						if (data[message.author.id]) {
							return message.channel.send({embed: {
								color: 0xc97070, description: `You have an open session already, <@!${message.author.id}>, check your DMs!`
							}}).catch(console.error);
						}
						captcha.create().then(res => {
							if (res.error) return console.error(res.error);
							res = res.response;
							message.author.send({embed:{
								color: 0xc5c970,
								title: messages.captchaTitle,
								description: messages.captchaEmbed.replace(/\{USER\_ID\}/gi, message.author.id),
								image: {url:res.image},
								footer: { text:messages.captchaFooter }
							}}).then(() => {
								data[message.author.id] = { code: res.code, attempt: 0 };
								message.channel.send("Check your DMs, <@!"+message.author.id+">!").then(n => { setTimeout(() => { n.delete().catch(() => {}); }, 2250); });
							}).catch(e => {
								message.channel.send({embed: {
									color: 0xc97070, description: `I can't send you messages, <@!${message.author.id}>, make sure your Direct Messages are open!`
								}}).catch(console.error);
							});
						}).catch(console.error);
					}
				break;
			}
		break;
		case "dm":
			if (!data[message.author.id]) {
				return message.channel.send({embed: {
					color: 0xc97070, description: `No session found, please create one by running \`${config.prefix}verify\` in ${client.guilds.cache.get(config.guild).name}!`
				}}).catch(() => {});
			} else {
				if (data[message.author.id].code == message.content) {
					client.guilds.cache.get(config.guild).members.fetch(message.author.id).then(member => {
						delete data[message.author.id];
						member.roles.add(config.role).then(() => {
							message.channel.send({embed: {
								color: 0x70c975, description: `Congratulations, you've been verified on ${client.guilds.cache.get(config.guild).name}!`
							}}).catch(() => {});
						}).catch(e => {
							message.channel.send("Sorry, I was unable to grant you the verification role.").catch(() => {});
							console.error('Captcha Role Error:',e);
						});
					}).catch(() => {
						message.channel.send({embed: {
							color: 0xc97070, description: `You don't appear to be in the ${client.guilds.cache.get(config.guild).name} server.`
						}}).catch(() => {});
					});
				} else {
					++data[message.author.id].attempt;
					message.channel.send({embed: {
						color: 0xc97070, description: `The code \`${message.content}\` is incorrect, you have \`${captcha.limit - data[message.author.id].attempt}\` attempts left.`
					}}).catch(() => {});
					if (((captcha.limit > 0 ? captcha.limit : 3) - data[message.author.id].attempt) < 1) {
						delete data[message.author.id];
						message.channel.send({embed: {
							color: 0xc97070, description: `You are out of attempts, please create a new session by running \`${config.prefix}iamhuman\` in ${client.guilds.cache.get(config.guild).name}!`
						}}).catch(() => {});
					}
				}
			}
		break;
	}

});

if (config.token !== "INSERT_TOKEN") { client.login(config.token); }

function getConfig() { 
	if (fs.existsSync('./config.json')) { return JSON.parse(fs.readFileSync('./config.json', 'utf8'));  } else {
		var NC = { token: "INSERT_TOKEN", prefix: "!", guild: "GUILD_ID", captcha: { length: "LENGTH_OF_CAPTCHA" }, role: "VERIFIED_ROLE_ID" };
		fs.writeFileSync("./config.json", JSON.stringify(NC,null,4)); return NC;
	}
}
function getSaveData() { if (fs.existsSync('./data.json')) { return JSON.parse(fs.readFileSync('./data.json', 'utf8')); } else { return {}; } }
function autoSave() { fs.writeFile('./data.json', JSON.stringify(data), (e) => {(e ? console.error("Autosave Error:",e) : "")}) }
function check() {
	if (((typeof(config.prefix) == 'string') ? config.prefix : '').length < 1) { console.error(`Prefix must be a string with at least one character.`); process.exit(1); }
	if (!client.guilds.cache.get(config.guild)) { console.error(`Guild not found: ${config.guild}`); process.exit(1); }
	if (isNaN(config.captcha.length)) { console.warn(`Captcha length is not a number, defaulting to ${config.captcha.length = "7"}`); }
	if (!client.guilds.cache.get(config.guild).roles.cache.get(config.role)) { console.warn(`Role ID ${config.role} was not found on ${client.guilds.cache.get(config.guild).name}, make sure it's up-to-date!`); }
}
function gCD() {
	var level = "Easy";
	if ((config.captcha.length > 80) || (config.captcha.length < 0)) { config.captcha.length = "7"; }
	if (config.captcha.length > 6) { level = "Normal"; }
	if (config.captcha.length > 9) { level = "Hard"; }
	if (config.captcha.length > 14) { level = "Impossible"; }
	if (config.captcha.length > 19) { level = "Literally Impossible"; }
	return level;
}