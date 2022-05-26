const test = require('osu-renderer-wrapper');

const client = new test();

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
	});
console.log("Uploading beatmap... (10s timeout)");
setTimeout(async () => {
    await client.upload('./test.osr', 'azur_lane_laffey');
	console.log(client.rateLimitReset - (Date.now() / 1000));
    console.log('Upload (Cooldown 5m)');
}, 10000);