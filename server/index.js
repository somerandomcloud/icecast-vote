/* eslint-disable no-case-declarations */
const express = require('express');
// const axios = require('axios');
const Josh = require('@joshdb/core');
const provider = require('@joshdb/sqlite');
const rateLimit = require('express-rate-limit');
const app = express();
const port = 8880;
const ytRegex = /(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch|v|embed)(?:\.php)?(?:\?.*v=|\/))([a-zA-Z0-9_-]+)/;
// const youtube = require('youtube-api');
const config = require('./config.json');
const { default: mpdApi } = require('mpd-api');

const db = new Josh({
	name: 'db',
	provider,
});

const mpdController = mpdApi.connect(config.mpd);

const limiter = rateLimit({
	// eslint-disable-next-line no-inline-comments
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: 12,
	standardHeaders: true,
	legacyHeaders: false,
});

app.use(limiter);

app.set('trust proxy', true);

app.post('/submit', async (req, res) => {
	res.set('Access-Control-Allow-Origin', '*');

	// const latestReq = await db.get(`user`)

	const ytUrl = req.query.url.match(ytRegex);

	if (!ytUrl) {
		return res.send({ 'error': 'URL_INVALID' });
	}


	const playlistTXT = await getPlaylist('txt');

	console.log(ytUrl);

	if (playlistTXT.match(extractYtId(ytUrl[0]))) {
		return res.send({ 'error': 'URL_ALREADY_ADDED' });
	}

	console.log(req.query);
	res.send({ 'poob': 'poob' });
});

app.post('/admin/controller', async (req, res) => {
	res.set('Access-Control-Allow-Origin', '*');

	const query = req.query;

	if (!query) return res.send({ 'error': 'NO_OBJECT' });

	switch (query.control) {
	default: res.send({ 'error': 'NO_CONTROL_SENT' }); break;
	case 'status':
		const status = await (await mpdController).api.status.get();
		const nowPlaying = await (await mpdController).api.status.currentsong();

		res.send(Object.assign(status, nowPlaying));
		break;
	case 'playback':
		if (!query.option) return res.send({ 'error': 'NO_OBJECT' });

		console.log(query.option);

		const mpdRes = await (await mpdController).api.playback[query.option]?.();

		if (mpdRes === undefined) return res.send({ 'error': 'INVALID_OPTION' });

		res.send({ 'status': 201 });
		break;
	}
});

async function getPlaylist(type) {
	if (type == 'txt') {
		const txt = await db.get('playlist_txt');

		if (!txt) {
			db.set('playlist_txt', '');
			return '';
		}

		return txt;
	}
	else {
		const playlist = await db.get('playlist_json');

		if (!playlist) {
			db.set('playlist_txt', []);
			return [];
		}

		return playlist;
	}
}

function extractYtId(ytUrl) {
	const idRegex = /(?<=(?:https?:\/\/)?(?:youtu\.be\/|(?:www\.|m\.)?youtube\.com\/(?:watch|v|embed)(?:\.php)?(?:\?.*v=|\/)))([a-zA-Z0-9_-]+)/;

	const videoId = ytUrl.match(idRegex);

	return videoId;
}

app.listen(port, () => {
	console.log(`Icecast controller listening on port ${port}`);
});