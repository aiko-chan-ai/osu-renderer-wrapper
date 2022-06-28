// Import Module
const io = require('socket.io-client');
const axios = require('axios');
const fs = require('fs');
const EventEmitter = require('events');
const { Collection } = require('@discordjs/collection');
const { parseReplay } = require('osureplayparser');
const FormData = require('form-data');
const HttpsProxyAgent = require("https-proxy-agent");
// Define data
const socketUrl = 'https://ordr-ws.issou.best';
const apiUrl = 'https://apis.issou.best/ordr/';
/**
 * API Path:
 * - GET /skins: Get all skins @see https://ordr.issou.best/docs/#operation/1
 * - GET /renders: List renders queue @see https://ordr.issou.best/docs/#operation/2
 * - POST /renders: Upload render @see https://ordr.issou.best/docs/#operation/3
 */
/**
 * Error Code:
 * @see https://ordr.issou.best/docs/#section/Error-codes
 */
const WebSocketCode = {
	'0': {
		error: false,
		message: 'Success',
	},
	'1': {
		error: true,
		message: 'Emergency Stop',
	},
	'2': {
		error: true,
		message: 'Replay Download Error (Bad upload from the sender)',
	},
	'3': {
		error: true,
		message: 'Replay Download Error (Bad download from the server)',
	},
	'4': {
		error: true,
		message: 'All beatmap mirrors are unavailable',
	},
	'15': {
		error: true,
		message: 'Beatmap not found on all the beatmap mirrors',
	},
	'18': {
		error: true,
		message: 'Unknown error from the renderer',
	},
	'19': {
		error: true,
		message: 'The renderer cannot download the map',
	},
	'20': {
		error: true,
		message: 'Beatmap version on the mirror is not the same as the replay',
	},
	'21': {
		error: true,
		message: 'The replay is corrupted',
	},
	'22': {
		error: true,
		message: 'Server-side problem while finalizing the generated video',
	},
	'27': {
		error: true,
		message: 'Rate limit exceeded (multiple renders at the same time)',
	},
	'28': {
		error: true,
		message: 'The renderer cannot download the replay',
	},
};

const HTTPError = {
	'2': 'Replay parsing error (bad upload from the sender)',
	'5': 'Replay file corrupted',
	'6': 'Invalid osu! gamemode (Only osu!standard is supported)',
	'7': 'The replay has no input data',
	'8': 'Beatmap does not exist on osu! (probably because of custom difficulty or non-submitted map)',
	'9': 'Audio for the map is unavailable (because of copyright claim)',
	'10': 'Cannot connect to osu! api',
	'11': 'The replay has the autoplay mod',
	'12': 'The replay username has invalid characters',
	'13': 'The beatmap is longer than 15 minutes',
	'14': 'This player is banned from o!rdr',
	'16': 'This IP is banned from o!rdr',
	'17': 'This username is banned from o!rdr',
	'23': 'Server-side problem while preparing the render',
	'24': 'The beatmap has no name',
	'25': 'The replay is missing input data',
	'26': 'The replay has incompatible mods',
	'29': 'The replay is already rendering or in queue',
	'30': 'The star rating is greater than 20',
	'31': 'The mapper is blacklisted',
};

class RenderAdded {
	constructor(data) {
		this.renderID = data.renderID;
	}
}

class RenderProgress {
	constructor(data) {
		this.renderID = data.renderID;
		this.progress = data.progress;
		this.username = data.username;
		this.renderer = data.renderer;
		this.description = data.description;
	}
}

class RenderDone {
	constructor(data) {
		this.renderID = data.renderID;
		this.videoURL = data.videoUrl;
	}
}

class RenderFailed extends Error {
	constructor(data) {
		super(WebSocketCode[`${data.errorCode}`].message || data.errorMessage);
		this.renderID = data.renderID;
		this.errorCode = data.errorCode;
		this.errorMessage = data.errorMessage;
	}
}

class UploadFailed extends Error {
    constructor(data) {
        super(typeof data.response?.data == 'object' ? `${HTTPError[`${data.response?.data.errorCode}`] || ''} ${data.response?.data.message || ''}` : data.response?.data || data.message);
        this.errorCode = typeof data.response?.data == 'object' ? data.response?.data?.errorCode : data.errorCode;
        this.errorMessage = typeof data.response?.data == 'object' ?  data.response?.data?.message : data.message;
        this.reason = typeof data.response?.data == 'object' ?  data.response?.data?.reason : undefined;
		this.response = data.response;
    }
}

class ReplayData {
	constructor(path) {
		this.rawData = parseReplay(path);
		this.gameMode = this.rawData.gameMode;
		// Throw Error before send to Server
		if (this.gameMode !== 0) {
			throw new Error('Only osu!standard is supported');
		}
		this.gameVersion = this.rawData.gameVersion;
		this.beatmapMD5 = this.rawData.beatmapMD5;
		this.playerName = this.rawData.playerName;
		this.replayMD5 = this.rawData.replayMD5;
		this.counting = {
			number_300s: this.rawData.number_300s,
			number_100s: this.rawData.number_100s,
			number_50s: this.rawData.number_50s,
			number_gekis: this.rawData.gekis,
			number_katus: this.rawData.katus,
			number_misses: this.rawData.misses,
			max_combo: this.rawData.max_combo,
			perfect_combo: this.rawData.perfect_combo,
			mods: this.rawData.mods,
		};
		this.score = this.rawData.score;
		this.timestamp = Date.parse(this.rawData.timestamp);
		this.byteLength = this.rawData.replay_length;
		this.renderID = null;
		this.videoURL = null;
		this.progress = '';
		this.description = '';
        this.fix();
	}
    fix() {
        delete this.rawData;
    }
}

class OsuRenderer extends EventEmitter {
	constructor(APIKey) {
        super();
		this.socket = io.connect(socketUrl);
		this.__loadEvent(this.socket);
		this.cache = new Collection(); // Collection<RenderID, ReplayData>
		this.avaliableSkin = new Collection(); // Collection<SkinID, SkinData>
		this.rateLimitReset = 0;
		this.proxyCache = new Collection();
		this.key = APIKey;
		this._clearProxy();
		this.__getSkin().then(() => this.emit('ready'));
	}
	/**
	 * @private
	 */
	_clearProxy() {
		setInterval(() => {
			this.proxyCache = new Collection();
		}, 60_000);
	}
    /**
     * @private
     * @returns {Promise<Collection<SkinID, SkinData>>}
     */
	__getSkin() {
		return new Promise((resolve, reject) => {
			axios
				.get(`${apiUrl}skins`)
				.then(({ data }) => {
					data.skins.forEach((skin) => {
						this.avaliableSkin.set(skin.id, skin);
					});
					resolve(true);
				})
				.catch((e) => reject(e));
		});
	}
    /**
     * @private
     * @param {Object} data 
     * @returns {EventEmitter}
     */
	__updateData(data) {
		if (data instanceof RenderAdded) {
			const replayData = this.cache.get(data.renderID);
			if (!replayData) return;
			replayData.renderID = data.renderID;
			this.cache.set(data.renderID, replayData);
		} else if (data instanceof RenderProgress) {
			const replayData = this.cache.get(data.renderID);
			if (!replayData) return;
			replayData.progress = data.progress;
			replayData.description = data.description;
			this.cache.set(data.renderID, replayData);
            this.emit("progress", data.renderID, replayData);
		} else if (data instanceof RenderDone) {
			const replayData = this.cache.get(data.renderID);
			if (!replayData) return;
			replayData.videoURL = data.videoURL;
			this.cache.set(data.renderID, replayData);
            this.emit("done", data.renderID, replayData);
		} else if (data instanceof RenderFailed) {
            const replayData = this.cache.get(data.renderID);
			if (!replayData) return;
			this.cache.delete(data.renderID);
            this.emit("error", data.renderID, data);
		}
	}
    /**
     * @private
     */
	__loadEvent(ioClient) {
		ioClient.on('render_done_json', (data) => {
			// console.log(data);
			this.__updateData(new RenderDone(data));
		});

		ioClient.on('render_progress_json', (data) => {
			// console.log(data);
			this.__updateData(new RenderProgress(data));
		});

		ioClient.on('render_added_json', (data) => {
			// console.log(data);
			this.__updateData(new RenderAdded(data));
		});

		ioClient.on('render_failed_json', (data) => {
			// console.log(data);
			this.__updateData(new RenderFailed(data));
		});
	}
	async freeProxy() {
		if (this.proxyCache.size == 0) {
			const res = await axios.get('https://api.proxyscrape.com/v2/?request=displayproxies&protocol=http&timeout=10000&country=all&ssl=all&anonymity=elite,anonymous').catch(() => {});
			if (res) {
				res.data.replace(RegExp('\r\n', 'ig'), '\n').split('\n').filter(r_ => r_.includes(':')).map((v , i) => {
					this.proxyCache.set(i, new Object({host: v.split(':')[0], port: v.split(':')[1] }));
				});
			}
		}
		if (this.proxyCache.size !== 0) return this.proxyCache.random();
		else return undefined;
		// API by Proxyscrape
	}
	async upload(path, skin, proxy, username) {
		if (skin == 'random') skin = this.avaliableSkin.random().skin;
		if (
			!this.avaliableSkin.get(skin) &&
			!this.avaliableSkin.find((s) => s.skin == skin)?.skin
		)
			throw new Error('Skin not found');
		if (proxy == true) {
			const proxyObject = await this.freeProxy();
			if (proxyObject) {
				proxy = new HttpsProxyAgent({ host: proxyObject.host , port: proxyObject.port });
			}
		}
		const axios_ = typeof proxy == 'object' ? axios.create({ httpsAgent: proxy }) : axios;
		// check
		const replayData = new ReplayData(path);
		// send
		const bodyForm = new FormData();
		bodyForm.append('replayFile', fs.createReadStream(path));
		bodyForm.append(
			'username',
			username || 'Bot',
		);
		bodyForm.append('resolution', '1280x720');
		bodyForm.append('globalVolume', 100);
		bodyForm.append('musicVolume', 100);
		bodyForm.append('hitsoundVolume', 100);
		if (this.key) bodyForm.append('verificationKey', this.key);
		bodyForm.append('skin', skin);
		return new Promise((resolve, reject) => {
			axios_({
				method: 'post',
				url: apiUrl + 'renders',
				data: bodyForm,
				headers: { 'Content-Type': 'multipart/form-data' },
			}).then(response => {
                replayData.renderID = response.data.renderID;
                if (!proxy) this.rateLimitReset = response.headers['x-ratelimit-reset'];
                this.cache.set(replayData.renderID, replayData);
                this.emit('added', replayData.renderID, replayData);
                resolve(replayData);
            }).catch(e => {
                reject(new UploadFailed(e));
            });
		});
	}
}
module.exports = OsuRenderer;