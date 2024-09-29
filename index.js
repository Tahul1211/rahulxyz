const {
    default: hisokaConnect,
    useMultiFileAuthState,
    DisconnectReason,
    jidNormalizedUser,
    delay,
    makeInMemoryStore, 
} = require("@whiskeysockets/baileys")
const qrcode = require("qrcode-terminal")
const fs = require("fs")
const pino = require("pino")
const chalk = require("chalk")
const { Boom } = require("@hapi/boom")

    setTimeout(() => {    
const store = makeInMemoryStore({ logger: pino().child({ level: 'silent', stream: 'store' }) })

async function qr() {
    const { state, saveCreds } = await useMultiFileAuthState(`./session`)
    const hisoka = hisokaConnect({
        logger: pino({ level: 'silent' }),
        printQRInTerminal: true,
        browser: ['LoRD','Safari','1.0.0'],
        auth: state,
        getMessage: async (key) => {
            let jid = jidNormalizedUser(key.remoteJid)
            let msg = await store.loadMessage(jid, key.id)
   
            return msg?.message || ""
         }
    })
    store.bind(hisoka.ev)
    hisoka.serializeM = (m) => smsg(hisoka, m, store)

    hisoka.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        try{	    
        if (connection === 'close') {
        let reason = new Boom(lastDisconnect?.error)?.output.statusCode
            if (reason === DisconnectReason.badSession) { console.log(`Bad Session File, Please Delete Session and Scan Again`); hisoka.logout(); }
            else if (reason === DisconnectReason.connectionClosed) { console.log("Connection closed, reconnecting...."); qr(); }
            else if (reason === DisconnectReason.connectionLost) { console.log("Connection Lost from Server, reconnecting..."); qr(); }
            else if (reason === DisconnectReason.connectionReplaced) { console.log("Connection Replaced, Another New Session Opened, Please Close Current Session First"); hisoka.logout(); }
            else if (reason === DisconnectReason.loggedOut) { console.log(`Device Logged Out, Please Scan Again And Run.`); hisoka.logout(); }
            else if (reason === DisconnectReason.restartRequired) { console.log("Restart Required, Restarting..."); qr(); }
            else if (reason === DisconnectReason.timedOut) { console.log("Connection TimedOut, Reconnecting..."); qr(); }
            else hisoka.end(`Unknown DisconnectReason: ${reason}|${connection}`)
        }
        if (update.connection == "connecting" || update.receivedPendingNotifications == "false") {
			console.log(`\n🐦Connecting please wait...`)
		}
		if (update.connection == "open" || update.receivedPendingNotifications == "true") {
			await hisoka.sendMessage(hisoka.user.id, { text: `*Connected*` })
            let sessionf = fs.readFileSync('./session/creds.json');
            const lordd = await  hisoka.sendMessage(hisoka.user.id, { document: sessionf, mimetype: `application/json`, fileName: `creds.json` })
            console.log(`🐦Connected to => ` + JSON.stringify(hisoka.user, null, 2))
			await delay(1999)
            console.log(chalk.yellow(`\n\n               ${chalk.bold.blue(`[ LoRD-MD ]`)}\n\n`))
            console.log(`< ================================================== >`)
            console.log(`  GITHUB: Lord-official`)
		}
    } catch (err) {
        console.log('Error in Connection.update '+err)
        qr();
      }
    })
    hisoka.ev.on('creds.update', await saveCreds)
    return hisoka
}
qr()
}, 5000);
