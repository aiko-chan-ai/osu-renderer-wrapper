const MyLib = require('./dist/index.js');

const client = new MyLib.OsuRenderClient({
	skipAllEventFromOtherClient: true,
	fetchAllSkinsBeforeReady: false,
	ordrApiKey: '',
});

client.on('ready', () => {
    console.log('Client Ready');
    client.requestRender(
		'https://cdn.discordapp.com/attachments/878276279105884210/1105483096364683384/test.osr',
        // or './test.osr'
        {
            username: 'aiko',
            resolution: 480,
            skin: 'minato_aqua',
        }
	);
});

client.on('renderAdded', (render, isPartial) => {
    console.log('added', render, isPartial);
});

client.on('renderProgress', (render, isPartial) => {
    console.log('progress', render, isPartial);
});

client.on('renderDone', (render, isPartial) => {
    console.log('done', render, isPartial);
});