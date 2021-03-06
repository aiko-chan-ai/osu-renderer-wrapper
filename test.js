const test = require('./index');
const HttpsProxyAgent = require("https-proxy-agent");
// HTTP / HTTPS Proxy
const httpsAgent = new HttpsProxyAgent({host: "proxyhost", port: "proxyport", auth: "username:password"});
const apikey = 'blablablablabla'; // using without ratelimit, max resolution
const client = new test(apikey);
client
	.on('added', (id, beatmap) => {
		console.log('Added', id, beatmap);
	})
	.on('progress', (id, beatmap) => {
		console.log('Progress', id, beatmap);
	})
	.on('done', (id, beatmap) => {
		console.log('Success', id, beatmap);
	})
	.on('error', (id, beatmap) => {
		console.log('Error', id, beatmap);
	})
	.on('ready', async () => {
		console.log("Uploading beatmap... (1s timeout)");
		setTimeout(async () => {
			// All skin
			console.log(client.avaliableSkin);
			// without proxy (Rate limit)
			await client.upload('./test.osr', 'random', false, {
				username: 'Sagiri',
				resolution: 1080, // max with api, else 720 | 540 | 480
			}).catch((e) => {
				console.log(e);
			});
			// with proxy (No ratelimit)
			/*
			// Custom proxy
			await client.upload('./test.osr', 'azur_lane_laffey', httpsAgent);
			// Random proxy (half working)
			await client.upload('./test.osr', 'random', true);
			*/
			console.log(client.rateLimitReset - (Date.now() / 1000));
			console.log('Upload (Cooldown 5m)');
		}, 1_000);
	});
