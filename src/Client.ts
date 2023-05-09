import EventEmitter from 'node:events';
import { io, Socket } from 'socket.io-client';
import { Readable } from 'node:stream';
import axios from 'axios';
import FormData from 'form-data';
import {
	WebSocketEndpoint,
	WebSocketEventName,
	Awaitable,
	WebSocketCode,
	RestEndpoint,
	RestEndpoints,
	FileLike,
	resolveFile,
} from './Constants';
import {
	RawSkinData,
	RawRenderData,
	RawRenderDone,
	RawRenderProgress,
	RawRenderAdded,
	RawRenderFailed,
	RawSkinDataResponse,
	RawRenderDataResponse,
	RawCustomSkinData,
} from './RawData';

export interface OsuRenderClientOptions {
	ordrApiKey?: string;
	fetchAllSkinsBeforeReady?: boolean;
	skipAllEventFromOtherClient?: boolean;
}

function Wrapper<T extends object>(): new (init: T) => T {
	return class {
		constructor(init: T) {
			Object.assign(this, init);
		}
	} as any;
}

export class Render extends Wrapper<Partial<RawRenderData>>() {
	client!: OsuRenderClient;
	constructor(client: OsuRenderClient, data: Partial<RawRenderData>) {
		super(data);
		Object.defineProperty(this, 'client', { value: client });
		this._patch(data);
	}
	_patch(data: Partial<RawRenderData>) {
		Object.entries(data).forEach(([key, value]) => {
			this[key as keyof this] = value as any;
		});
	}
}

export class RenderFailed extends Error {
	renderID: number;
	errorCode: number;
	errorMessage: string;
	client!: OsuRenderClient;
	constructor(client: OsuRenderClient, data: RawRenderFailed) {
		super(WebSocketCode[`${data.errorCode}`].message || data.errorMessage);
		Object.defineProperty(this, 'client', { value: client });
		this.renderID = data.renderID;
		this.errorCode = data.errorCode;
		this.errorMessage = data.errorMessage;
	}
	get renderData() {
		return this.client.cache.get(this.renderID);
	}
}

export interface OsuRenderClientEvents {
	ready: [client: OsuRenderClient];
	renderDone: [render: Render, isPartial: boolean];
	renderProgress: [render: Render, isPartial: boolean];
	renderAdded: [render: Render, isPartial: boolean];
	renderFailed: [error: RenderFailed, isPartial: boolean];
}

declare interface OsuRenderClient {
	on<K extends keyof OsuRenderClientEvents>(
		event: K,
		listener: (...args: OsuRenderClientEvents[K]) => Awaitable<void>,
	): this;
	on<S extends string | symbol>(
		event: Exclude<S, keyof OsuRenderClientEvents>,
		listener: (...args: any[]) => Awaitable<void>,
	): this;
	once<K extends keyof OsuRenderClientEvents>(
		event: K,
		listener: (...args: OsuRenderClientEvents[K]) => Awaitable<void>,
	): this;
	once<S extends string | symbol>(
		event: Exclude<S, keyof OsuRenderClientEvents>,
		listener: (...args: any[]) => Awaitable<void>,
	): this;
	emit<K extends keyof OsuRenderClientEvents>(
		event: K,
		...args: OsuRenderClientEvents[K]
	): boolean;
	emit<S extends string | symbol>(
		event: Exclude<S, keyof OsuRenderClientEvents>,
		...args: unknown[]
	): boolean;
	off<K extends keyof OsuRenderClientEvents>(
		event: K,
		listener: (...args: OsuRenderClientEvents[K]) => Awaitable<void>,
	): this;
	off<S extends string | symbol>(
		event: Exclude<S, keyof OsuRenderClientEvents>,
		listener: (...args: any[]) => Awaitable<void>,
	): this;
	removeAllListeners<K extends keyof OsuRenderClientEvents>(event?: K): this;
	removeAllListeners<S extends string | symbol>(
		event?: Exclude<S, keyof OsuRenderClientEvents>,
	): this;
}

class OsuRenderClient extends EventEmitter {
	socket: Socket = io(WebSocketEndpoint);
	key?: string;
	avaliableSkin: Map<string, RawSkinData> = new Map();
	cache: Map<number, Render> = new Map();
	fetchAllSkinsBeforeReady = true;
	skipAllEventFromOtherClient = false;
	#_isReady = false;
	#_rateLimitData: number = 0;
	constructor(options?: OsuRenderClientOptions) {
		super();
		this._validateOptions(options);
		this.__loadEvent(this.socket);
	}
	get rateLimitInfo() {
		if (this.#_rateLimitData === 0) return new Date(0);
		return new Date(this.#_rateLimitData * 1000);
	}
	get isReady() {
		return this.#_isReady;
	}
	private _validateOptions(options: OsuRenderClientOptions = {}) {
		if ('ordrApiKey' in options && typeof options.ordrApiKey === 'string') {
			this.key = options.ordrApiKey;
		}
		if (
			'fetchAllSkinsBeforeReady' in options &&
			typeof options.fetchAllSkinsBeforeReady === 'boolean'
		) {
			this.fetchAllSkinsBeforeReady = options.fetchAllSkinsBeforeReady;
		}
		if (
			'skipAllEventFromOtherClient' in options &&
			typeof options.skipAllEventFromOtherClient === 'boolean'
		) {
			this.skipAllEventFromOtherClient = options.skipAllEventFromOtherClient;
		}
	}
	private __loadEvent(ioClient: Socket) {
		ioClient.on('render_done_json', (data) => {
			if (!this.isReady) return;
			this.__updateData('render_done_json', data);
		});

		ioClient.on('render_progress_json', (data) => {
			if (!this.isReady) return;
			this.__updateData('render_progress_json', data);
		});

		ioClient.on('render_added_json', (data) => {
			if (!this.isReady) return;
			this.__updateData('render_added_json', data);
		});

		ioClient.on('render_failed_json', (data) => {
			if (!this.isReady) return;
			this.__updateData('render_failed_json', data);
		});

		ioClient.on('connect', () => {
			const callback = () => {
				this.#_isReady = true;
				this.emit('ready', this);
			};
			if (this.fetchAllSkinsBeforeReady) {
				this.fetchSkins().then((data) => {
					const maxPage = data.maxSkins;
					if (maxPage > 100) {
						const count =
							maxPage % 100 == 0
								? maxPage / 100
								: Math.floor(maxPage / 100) + 1;
						Promise.all(
							new Array(count - 1).fill('skin').map((n, v) =>
								this.fetchSkins({
									page: v + 2,
								}),
							),
						).then(callback);
					}
				});
			} else {
				callback();
			}
		});
	}
	private __updateData(
		eventName:
			| 'render_done_json'
			| 'render_progress_json'
			| 'render_added_json'
			| 'render_failed_json',
		data:
			| RawRenderDone
			| RawRenderProgress
			| RawRenderAdded
			| RawRenderFailed,
	) {
		const render = this.cache.get(data.renderID);
		if (!render && this.skipAllEventFromOtherClient === true) return;
		render?._patch(data);
		render ? this.cache.set(data.renderID, render) : null;
		if (eventName == 'render_failed_json') {
			return this.emit(
				WebSocketEventName[eventName],
				new RenderFailed(this, data as RawRenderFailed),
				!this.cache.has(data.renderID),
			);
		}
		return this.emit(
			WebSocketEventName[eventName],
			render ? render : new Render(this, data),
			!this.cache.has(data.renderID),
		);
	}
	public fetchSkins({
		limit = 100,
		query,
		page = 1,
	}: FetchSkinsOptions = {}) {
		return new Promise<RawSkinDataResponse>((resolve, reject) => {
			axios({
				url: `${RestEndpoint}${RestEndpoints.skin.endpoint}`,
				method: RestEndpoints.skin.type,
				params: {
					pageSize: limit,
					search: query,
					page,
				},
			})
				.then((res) => {
					for (const skin of res.data.skins) {
						this.avaliableSkin.set(skin.alphabeticalId, skin);
					}
					resolve(res.data);
				})
				.catch(reject);
		});
	}
	public renderLists({
		limit = 50,
		page = 1,
		ordrUsername,
		replayUsername,
		renderID,
		nobots,
		link,
		beatmapsetid,
	}: FetchRenderListsOptions = {}) {
		return new Promise<RawRenderDataResponse>((resolve, reject) => {
			axios({
				url: `${RestEndpoint}${RestEndpoints.renderList.endpoint}`,
				method: RestEndpoints.renderList.type,
				params: {
					pageSize: limit,
					page,
					ordrUsername,
					replayUsername,
					renderID,
					nobots,
					link,
					beatmapsetid,
				},
			})
				.then((res) => {
					resolve(res.data);
				})
				.catch(reject);
		});
	}
	public fetchCustomSkin(options: FetchCustomSkinOptions) {
		return new Promise<RawCustomSkinData>((resolve, reject) => {
			axios({
				url: `${RestEndpoint}${RestEndpoints.customSkin.endpoint}`,
				method: RestEndpoints.customSkin.type,
				params: {
					id: options.id,
				},
			})
				.then((res) => {
					resolve(res.data);
				})
				.catch(reject);
		});
	}
	public async requestRender(file: FileLike, options: RequestRenderOptions): Promise<boolean> {
		if (!this.isReady) throw new Error('Client is not ready yet!');
		if (this.rateLimitInfo.getTime() > Date.now()) {
			throw new Error(
				`[RATE_LIMIT] Please wait until ${this.rateLimitInfo.toTimeString()}`,
			);
		}
		// Validate options
		if (!options.username || options.username === '')
			throw new Error('Username is required!');
		if (
			!options.resolution ||
			![480, 540, 720].includes(options.resolution)
		)
			throw new Error('Invalid resolution!');
		if (!options.skin || options.skin === '')
			throw new Error('Skin is required!');
		// End
		const bodyForm = new FormData();
		bodyForm.append('username', options.username);
		switch (options.resolution) {
			case 720: {
				bodyForm.append('resolution', '1280x720');
				break;
			}
			case 540: {
				bodyForm.append('resolution', '960x540');
				break;
			}
			case 480: {
				bodyForm.append('resolution', '720x480');
				break;
			}
		}
		bodyForm.append(
			'skin',
			typeof options.skin == 'string' ? options.skin : options.skin.id,
		);
		Object.entries(options).forEach(([key, value]) => {
			// Skip some options
			if (['username', 'resolution', 'skin'].includes(key)) return;
			// Skip undefined value
			if (value === undefined) return;
			// Append to form
			bodyForm.append(key, value);
		});
		const file_ = await resolveFile(file, options.handleFileURL);
		if (this.key && this.key !== '')
			bodyForm.append('verificationKey', this.key);
		if (file_ instanceof Readable) bodyForm.append('replayFile', file_);
		else bodyForm.append('replayURL', file_);
		return new Promise((resolve, reject) => {
			axios({
				method: RestEndpoints.sendRender.type,
				url: `${RestEndpoint}${RestEndpoints.sendRender.endpoint}`,
				data: bodyForm,
				headers: { 'Content-Type': 'multipart/form-data' },
			})
				.then((response) => {
					this.#_rateLimitData = Number(
						response.headers['x-ratelimit-reset'] ?? 0,
					);
					this.cache.set(
						response.data.renderID,
						new Render(this, response.data),
					);
					resolve(true);
				})
				.catch(reject);
		});
	}
}

export interface RequestRenderOptions {
	handleFileURL?: boolean;
	username: string;
	resolution: 480 | 540 | 720;
	skin: RawSkinData | string;
	globalVolume?: number;
	musicVolume?: number;
	hitsoundVolume?: number;
	showHitErrorMeter?: boolean;
	showUnstableRate?: boolean;
	showScore?: boolean;
	showHPBar?: boolean;
	showComboCounter?: boolean;
	showPPCounter?: boolean;
	showScoreboard?: boolean;
	showBorders?: boolean;
	showMods?: boolean;
	showResultScreen?: boolean;
	useSkinCursor?: boolean;
	useSkinColors?: boolean;
	useSkinHitsounds?: boolean;
	useBeatmapColors?: boolean;
	cursorScaleToCS?: boolean;
	cursorRainbow?: boolean;
	cursorTrailGlow?: boolean;
	drawFollowPoints?: boolean;
	scaleToTheBeat?: boolean;
	sliderMerge?: boolean;
	objectsRainbow?: boolean;
	objectsFlashToTheBeat?: boolean;
	useHitCircleColor?: boolean;
	seizureWarning?: boolean;
	loadStoryboard?: boolean;
	loadVideo?: boolean;
	introBGDim?: number;
	inGameBGDim?: number;
	breakBGDim?: number;
	BGParallax?: boolean;
	showDanserLogo?: boolean;
	skip?: boolean;
	cursorRipples?: boolean;
	cursorSize?: number;
	cursorTrail?: boolean;
	drawComboNumbers?: boolean;
	sliderSnakingIn?: boolean;
	sliderSnakingOut?: boolean;
	showHitCounter?: boolean;
	showKeyOverlay?: boolean;
	showAvatarsOnScoreboard?: boolean;
	showAimErrorMeter?: boolean;
	playNightcoreSamples?: boolean;
	customSkin?: boolean;
}

export interface FetchSkinsOptions {
	limit?: number;
	query?: string;
	page?: number;
}

export interface FetchRenderListsOptions {
	limit?: number;
	page?: number;
	ordrUsername?: string;
	replayUsername?: string;
	renderID?: number;
	nobots?: boolean;
	link?: string;
	beatmapsetid?: number;
}

export interface FetchCustomSkinOptions {
	id: string;
}

export { OsuRenderClient };
