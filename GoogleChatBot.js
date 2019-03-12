/**
 * Classe per l'invio di messaggi a Google Hangout Chat
 * Utilizzo:
 * Configurare un webhook nella stanza di chat dove si vogliono ricevere i messaggi (https://developers.google.com/hangouts/chat/how-tos/webhooks)
 * Istanziare un oggetto GoogleChat passando l'url del webhook come parametro:
 * var chatbot = new GoogleChatBot(url);
 * L'url può essere modificato anche in seguito come proprietà diretta dell'oggetto.
 * Per ulteriori informazioni sulla gestione di Bot per Hangouts Chat visita https://developers.google.com/hangouts/chat/
 */

class GoogleChatBot {
    /**
     * Creates an instance of GoogleChatBot.
     * @param {String} url Url del webhook configurato in Google Hangout Chat
     */
    constructor(url) {
        this.CHAT_COLORS = {};
        this.CHAT_COLORS.RED = '#d81111';
        this.CHAT_COLORS.GREEN = '#1b9a19';
        this.CHAT_COLORS.MAGENTA = '#e23aa7';
        this.CHAT_COLORS.YELLOW = '#ffef1b';
        this.CHAT_COLORS.BLUE = '#19239e';
        this.CHAT_COLORS.CYAN = '#1ba9ff';
        this.CHAT_COLORS.GREY = '#a5a5a5';

        this.proxy = false;
        this.url = url;
    }

    /**
     * Ritorna un di univoco tipo GUID
     * 
     * @static
     * @returns {String}
     */
    static uuidv4() {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
        });
    }

    /**
     * Imposta il proxy, se necessario
     * 
     * @param {Object} config
     *  Oggetto di configurazione contenente:
     *  {
     *      proxy: "url principale del proxy",
     *      port: "porta",
     *      user: "nome utente",
     *      password: "password"
     *  }
     */
    setProxy({proxy, port, user, password}) {
        this.proxy = 'http://' + user + ':' + password + '@' + proxy + ':' + port
    }

    _replaceColors(text) {
        let match = text.match(/\$\{([^\{\}]*)\}/g);
        if (match) {
            for (var i = 0; i < match.length; i++) {
                let prop = match[i].replace(/\$\{([^\{\}]*)\}/g, '$1');
                if (this.CHAT_COLORS.hasOwnProperty(prop)) {
                    text = text.replace("${" + prop + "}", this.CHAT_COLORS[prop]);
                }
            }
        }
        return text;
    }

    /**
     * Invia un semplice messaggio di testo
     * 
     * @param {String} text Il testo da inviare
     * @param {String} thread L'id della discussione in cui verrà inviato il messaggio. Se non passato viene generato un nuovo id univoco (quasi)
     * @returns {Promise}
     */
    sendText(text, thread) {
        return this.sendMsg({
                    "text": text
                }, thread);
    }

    /**
     * Invia una card di solo testo dove è possibile inserire alcune formattazioni
     * 
     * @param {String} text Il testo da inviare. È possibile specificare alcuni colori predefiniti inserendoli nel testo come ${COLORE}
     * @param {String} thread L'id della discussione in cui verrà inviato il messaggio. Se non passato viene generato un nuovo id univoco (quasi)
     * @returns {Promise}
     */
    sendTextCard(text, thread) {
        text = this._replaceColors(text);

        return this.sendMsg({
                    "cards": [{
                        "sections": [{
                            "widgets": [{
                                "textParagraph": {
                                    "text": text
                                }
                            }]
                        }]
                    }]
                }, thread);
    }

    /**
     * Invia un messaggio generico
     * 
     * @param {json} data L'oggetto che specifica il messaggio da inserire (vd. https://developers.google.com/hangouts/chat/reference/message-formats/cards)
     * @param {String} thread L'id della discussione in cui verrà inviato il messaggio. Se non passato viene generato un nuovo id univoco (quasi)
     * @returns {Promise}
     */
    sendMsg(data, thread) {
        return new Promise((resolve, reject) => {
            var request = require('request');

            request({
                    proxy: this.proxy,
                    url: this.url,
                    qs: {
                        "threadKey": thread || GoogleChatBot.uuidv4()
                    },
                    method: 'POST',
                    json: true,
                    body: data
                },
                function (error, response, body) {
                    if (!error && response.statusCode == 200) {
                        resolve(body)
                    } else {
                        reject(error || response);
                    }
                }
            );
        });
    }
}

class GoogleChatBotManager {
    constructor({ bots, proxy }) {
        this.baseProxy = proxy || false;
        
        this.bots = new Map();
        (bots || []).forEach((b) => {
            this.registerBot(b.name, b);
        });
    }

    registerBot(name, config) {
        let newbot = new GoogleChatBot(config.url),
            proxy = config.proxy || this.baseProxy;
        
        if (proxy) {
            newbot.setProxy(proxy);
        }
        this.bots.set(name, newbot);
    }

    getBot(name) {
        return this.bots.get(name);
    }

    forEachBot(fn){
        this.bots.forEach(fn);
    }

    botsList(){
        return Array.from( this.bots.keys() );
    }
}

module.exports = {
    GoogleChatBot,
    GoogleChatBotManager
}