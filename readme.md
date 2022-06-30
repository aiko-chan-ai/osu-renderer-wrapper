# osu-renderer-wrapper
- A wrapper that allows you to interact with the API ordr.issou.best

## Installation
```sh
$ npm install osu-renderer-wrapper
```

## Example
- Test file [here](https://github.com/aiko-chan-ai/osu-renderer-wrapper/blob/main/test.js)

### Typedefs

- renderID

```js
renderID: Number
```

- ReplayData

```js
// Example ('done' event)
ReplayData {
  gameMode: 0,
  gameVersion: 20220424,
  beatmapMD5: 'a9d1cb13f7fb543af96e2a43fcf855ca',
  playerName: 'TheClumsyOne46',
  replayMD5: '625818578889081d25b5149ffe044c92',
  counting: {
    number_300s: 126,
    number_100s: 18,
    number_50s: 0,
    number_gekis: 28,
    number_katus: 8,
    number_misses: 1,
    max_combo: 216,
    perfect_combo: 0,
    mods: 0
  },
  score: 690574,
  timestamp: 1653561747000,
  byteLength: 17187,
  renderID: 446031,
  videoURL: 'https://link.issou.best/EX066',
  progress: 'Finalizing...',
  description: 'Player: TheClumsyOne46, Map: MIMI feat. Hatsune Miku - Mizuoto to Curtain [Hyper] by Log Off Now, song length is 0:54 (4.03 ⭐)  | Accuracy: 91.03%'
}
```

### Propertites

- cache: DiscordJS.Collection<RenderID, ReplayData>

- avaliableSkin: DiscordJS.Collection<SkinID, SkinData>

- rateLimitReset: Number (Ratelimit reset time)


### Events

- added (Upload file success)
  - id: renderID
  - beatmap: ReplayData

- progress (Waiting for client... | Rendering... (x%) | Finalizing...)
  - id: renderID
  - beatmap: ReplayData

- done (videoURL)
  - id: renderID
  - beatmap: ReplayData

- error
  - id: renderID
  - error: RenderFailed extends Error
  
### Methods

- upload
  - path: string (fs.path)
  - skin: string (Skin name) | 'random'
  - proxy: (Optional) HttpsProxyAgent | true (random proxy) | undefined
  - option: (Optional) Object https://ordr.issou.best/docs/#operation/3
  
* option: 
 - username: bot name (default: Bot)
 - resolution: 
  - 1080: 1080p, 60fps
  - 720: 720p, 30fps (default)
  - 540: 540p, 30fps
  - 480: 480p, 30fps
 - Other: See https://ordr.issou.best/docs/#operation/3

## There is also a lot of other data, you can see the source :))

# Thank a lot of o!rdr, MasterIO#4588 (Owner API)