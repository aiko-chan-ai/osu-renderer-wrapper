import {
    WebSocketCode,
} from './Constants';

export interface RawSkinData {
    skin: string;
    presentationName: string;
    url: string;
    highResPreview: string;
    lowResPreview: string;
    gridPreview: string;
    id: number;
    hasCursorMiddle: boolean;
    author: string;
    modified: boolean;
    version: string;
    alphabeticalId: number;
    timesUsed: number;
}

export interface RawSkinDataResponse {
    message: string;
    skins: RawSkinData[];
    maxSkins: number;
}

export interface RawRenderData {
	date: string;
	renderID: number;
	username: string;
	userId: number;
	userHasAvatar: boolean;
	progress: string;
	errorCode: number;
	removed: boolean;
	renderer: string;
	description: string;
	title: string;
	videoUrl: string;
	mapLink: string;
	mapTitle: string;
	mapLength: number;
	drainTime: number;
	replayDifficulty: string;
	replayUsername: string;
	replayMods: string;
	mapID: number;
	needToRedownload: boolean;
	resolution: string;
	globalVolume: number;
	musicVolume: number;
	hitsoundVolume: number;
	useSkinHitsounds: boolean;
	playNightcoreSamples: boolean;
	showHitErrorMeter: boolean;
	showUnstableRate: boolean;
	showScore: boolean;
	showHPBar: boolean;
	showComboCounter: boolean;
	showPPCounter: boolean;
	showKeyOverlay: boolean;
	showScoreboard: boolean;
	showAvatarsOnScoreboard: boolean;
	showBorders: boolean;
	showMods: boolean;
	showResultScreen: boolean;
	showHitCounter: boolean;
	showAimErrorMeter: boolean;
	customSkin: boolean;
	skin: string;
	hasCursorMiddle: boolean;
	useSkinCursor: boolean;
	useSkinColors: boolean;
	useBeatmapColors: boolean;
	cursorScaleToCS: boolean;
	cursorRainbow: boolean;
	cursorTrailGlow: boolean;
	cursorSize: number;
	cursorTrail: boolean;
	drawFollowPoints: boolean;
	drawComboNumbers: boolean;
	scaleToTheBeat: boolean;
	sliderMerge: boolean;
	objectsRainbow: boolean;
	objectsFlashToTheBeat: boolean;
	useHitCircleColor: boolean;
	seizureWarning: boolean;
	loadStoryboard: boolean;
	loadVideo: boolean;
	introBGDim: number;
	inGameBGDim: number;
	breakBGDim: number;
	BGParallax: boolean;
	showDanserLogo: boolean;
	motionBlur960fps: boolean;
	motionBlurForce: number;
	skip: boolean;
	cursorRipples: boolean;
	sliderSnakingIn: boolean;
	sliderSnakingOut: boolean;
	isVerified: boolean;
	isBot: boolean;
	renderStartTime: number;
	renderEndTime: number;
	renderTotalTime: number;
	uploadEndTime: number;
	uploadTotalTime: number;
}

export interface RawRenderDataResponse {
    renders: RawRenderData[];
    maxRenders: number;
}

export interface RawRenderSendDataResponse {
    renderID?: number;
    reason?: string;
    errorCode: number;
    message: string;
}

export interface RawCustomSkinData {
    skinName?: string;
    skinAuthor?: string;
    downloadLink?: string;
    found: boolean;
    removed: boolean;
    message: string;
}

export interface RawRenderAdded {
    renderID: number;
}

export interface RawRenderProgress {
    renderID: number;
    progress: string;
    username: string;
    renderer: string;
    description: string;
}

export interface RawRenderDone {
    renderID: number;
    videoUrl: string;
}

export interface RawRenderFailed {
    renderID: number;
    errorCode: keyof typeof WebSocketCode;
    errorMessage: string;
}