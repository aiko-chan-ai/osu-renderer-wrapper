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

setTimeout(() => {
    client.upload('./test.osr', 'azur_lane_laffey');
    console.log('upload');
}, 10000);