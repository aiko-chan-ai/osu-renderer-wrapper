import { Readable, Stream } from 'node:stream';
import { stat, createReadStream } from 'node:fs';
import axios from 'axios';
import path from 'node:path';

export interface WebSocketCodeData {
	error: boolean;
	message: string;
}

export const WebSocketCode: {
	[key: number]: WebSocketCodeData;
} = {
	0: {
		error: false,
		message: 'Success',
	},
	1: {
		error: true,
		message: 'Emergency Stop',
	},
	2: {
		error: true,
		message: 'Replay Download Error (Bad upload from the sender)',
	},
	3: {
		error: true,
		message: 'Replay Download Error (Bad download from the server)',
	},
	4: {
		error: true,
		message: 'All beatmap mirrors are unavailable',
	},
	15: {
		error: true,
		message: 'Beatmap not found on all the beatmap mirrors',
	},
	18: {
		error: true,
		message: 'Unknown error from the renderer',
	},
	19: {
		error: true,
		message: 'The renderer cannot download the map',
	},
	20: {
		error: true,
		message: 'Beatmap version on the mirror is not the same as the replay',
	},
	21: {
		error: true,
		message: 'The replay is corrupted',
	},
	22: {
		error: true,
		message: 'Server-side problem while finalizing the generated video',
	},
	27: {
		error: true,
		message: 'Rate limit exceeded (multiple renders at the same time)',
	},
	28: {
		error: true,
		message: 'The renderer cannot download the replay',
	},
};

export const HTTPErrorCodes: {
	[key: string]: string;
} = {
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
	'32': 'the beatmapset is blacklisted',
	'33': 'the replay has already errored less than an hour ago',
};

export const WebSocketEndpoint = 'https://ordr-ws.issou.best';

export const RestEndpoint = 'https://apis.issou.best/ordr';

export const RestEndpoints = {
	skin: {
		type: 'GET',
		endpoint: '/skins',
	},
	renderList: {
		type: 'GET',
		endpoint: '/renders',
	},
	sendRender: {
		type: 'POST',
		endpoint: '/renders',
	},
	customSkin: {
		type: 'GET',
		endpoint: '/skins/custom',
	},
};

export enum WebSocketEventName {
	render_done_json = 'renderDone',
	render_progress_json = 'renderProgress',
	render_added_json = 'renderAdded',
	render_failed_json = 'renderFailed',
}

export type BufferResolvable = Buffer | string | URL;

export type FileLike = BufferResolvable | Stream;

export async function resolveFile(
	resource: BufferResolvable | Stream,
	handleFileURL = false,
): Promise<Stream | string> {
	if (Buffer.isBuffer(resource) || resource instanceof Readable)
		return Readable.from(resource);

	if (resource instanceof URL) {
		if (handleFileURL == true) {
			const res = await axios.get(resource.href, {
				responseType: 'stream',
			});
			return res.data;
		} else {
			return resource.href;
		}
	}

	if (typeof resource === 'string') {
		if (/^https?:\/\//.test(resource)) {
			if (handleFileURL == true) {
				const res = await axios.get(resource, {
					responseType: 'stream',
				});
				return res.data;
			} else {
				return resource;
			}
		}
		return new Promise((resolve, reject) => {
			const file = path.resolve(resource);
			stat(file, (err, stats) => {
				if (err) return reject(err);
				if (!stats.isFile())
					return reject(
						new TypeError(
							`[FILE_NOT_FOUND] File could not be found: ${file}`,
						),
					);
				return resolve(createReadStream(file));
			});
		});
	}

	throw new TypeError('REQ_RESOURCE_TYPE');
}

export type Awaitable<T> = T | PromiseLike<T>;
