declare const io: any;
declare const axios: any;
declare const fs: any;
declare const EventEmitter: any;
declare const Collection: any;
declare const parseReplay: any;
declare const FormData: any;
declare const socketUrl = "https://ordr-ws.issou.best";
declare const apiUrl = "https://apis.issou.best/ordr/";
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
declare const WebSocketCode: {
    '0': {
        error: boolean;
        message: string;
    };
    '1': {
        error: boolean;
        message: string;
    };
    '2': {
        error: boolean;
        message: string;
    };
    '3': {
        error: boolean;
        message: string;
    };
    '4': {
        error: boolean;
        message: string;
    };
    '15': {
        error: boolean;
        message: string;
    };
    '18': {
        error: boolean;
        message: string;
    };
    '19': {
        error: boolean;
        message: string;
    };
    '20': {
        error: boolean;
        message: string;
    };
    '21': {
        error: boolean;
        message: string;
    };
    '22': {
        error: boolean;
        message: string;
    };
    '27': {
        error: boolean;
        message: string;
    };
    '28': {
        error: boolean;
        message: string;
    };
};
declare const HTTPError: {
    '2': string;
    '5': string;
    '6': string;
    '7': string;
    '8': string;
    '9': string;
    '10': string;
    '11': string;
    '12': string;
    '13': string;
    '14': string;
    '16': string;
    '17': string;
    '23': string;
    '24': string;
    '25': string;
    '26': string;
    '29': string;
    '30': string;
    '31': string;
};
declare class RenderAdded {
    constructor(data: any);
    renderID: number;
}
declare class RenderProgress {
    constructor(data: any);
    renderID: number;
    progress: string;
    username: string;
    renderer: string;
    description: string;
}
declare class RenderDone {
    constructor(data: any);
    renderID: number;
    videoURL: string;
}
declare class RenderFailed extends Error {
    constructor(data: any);
    renderID: number;
    errorCode: number;
    errorMessage: string;
}
declare class UploadFailed extends Error {
    constructor(data: any);
    errorCode: number;
    errorMessage: string;
    reason: string;
}
declare class ReplayData {
	constructor(path: any);
	gameMode: number;
	gameVersion: string;
	beatmapMD5: string;
	playerName: string;
	replayMD5: string;
	counting: Counting;
	score: number;
	timestamp: number;
    byteLength: number;
    renderID: number;
    videoURL: string | null;
    progress: string;
    description: string;
}
declare type Counting = {
	number_300s: number;
	number_100s: number;
	number_50s: number;
	number_gekis: number;
	number_katus: number;
	number_misses: number;
	max_combo: number;
	perfect_combo: number;
	mods: number;
};
declare class OsuRenderer extends EventEmitter {
	constructor();
	cache: Collection<number, ReplayData>;
	avaliableSkin: Collection<SkinID, Skin>;
	rateLimitReset: number;
	upload(path: string, skin: string): Promise<unknown>;
	public on<K extends keyof ClientEvents>(
		event: K,
		listener: (...args: ClientEvents[K]) => Awaitable<void>,
	): this;
	public on<S extends string | symbol>(
		event: Exclude<S, keyof ClientEvents>,
		listener: (...args: any[]) => Awaitable<void>,
	): this;

	public once<K extends keyof ClientEvents>(
		event: K,
		listener: (...args: ClientEvents[K]) => Awaitable<void>,
	): this;
	public once<S extends string | symbol>(
		event: Exclude<S, keyof ClientEvents>,
		listener: (...args: any[]) => Awaitable<void>,
	): this;

	public emit<K extends keyof ClientEvents>(
		event: K,
		...args: ClientEvents[K]
	): boolean;
	public emit<S extends string | symbol>(
		event: Exclude<S, keyof ClientEvents>,
		...args: unknown[]
	): boolean;

	public off<K extends keyof ClientEvents>(
		event: K,
		listener: (...args: ClientEvents[K]) => Awaitable<void>,
	): this;
	public off<S extends string | symbol>(
		event: Exclude<S, keyof ClientEvents>,
		listener: (...args: any[]) => Awaitable<void>,
	): this;
}
export interface ClientEvents {
	added: [renderId: number, beatmap: ReplayData];
	progress: [renderId: number, beatmap: ReplayData];
	done: [renderId: number, beatmap: ReplayData];
	error: [renderId: number, error: RenderFailed];
}
declare var OsuRenderer: OsuRenderer;
export = OsuRenderer;