import { BASE_URL, ORIGIN } from '@/api';
import React, { useEffect, useState } from 'react';
import { Card } from 'react-bootstrap';
import { Mic, StopFill } from 'react-bootstrap-icons';


interface Connection {
	ws: WebSocket;
	audioContext: AudioContext;
	processorNode: ScriptProcessorNode;
	stream: MediaStream;
	streamNode: MediaStreamAudioSourceNode;
}

const RATE = 24000;
const CHANNELS = 1;

const AnnouncementsPage = () => {
	const [connection, setConnection] = useState<Connection | undefined>(undefined);
	const [status, setStatus] = useState<'idle' | 'connecting' | 'waiting' | 'started'>('idle');
	const [blocked, setBlocked] = useState<boolean>(false);

	const updateConnection = () =>
		setConnection(Object.assign({}, connection));

	const stop = async () => {
		connection.streamNode.disconnect();
		connection.processorNode.disconnect();
		await connection.audioContext.close();
		connection.stream.getTracks().forEach(track => track.stop());
		if (connection.ws.readyState !== WebSocket.CLOSED && connection.ws.readyState !== WebSocket.CLOSED)
			connection.ws.close();
		setConnection(undefined);
		setStatus('idle');
		setBlocked(false);
	}

	

	useEffect(() => {
		if (!connection) return;

		const { ws } = connection;

		const wsOpen = () => {
			console.log('WS Opened');
			ws.send(JSON.stringify({
				icom: 'main',
				rate: RATE,
				channels: CHANNELS,
				priority: 4,
				force: true
			}));
		};

		const wsError = (e) => {
			console.error('WS Error:', e);
			stop();
		};

		const wsMessage = (e) => {
			const data = e.data;
			console.log('WS Message:', data);
			const msg = JSON.parse(data);
			switch (msg.type) {
				case 'started':
					setStatus('started');
					break;
				case 'stopped':
					setStatus('waiting');
					break;
			}
		};

		const wsClose = () => {
			console.log('WS Closed');
			stop();
		};

		ws.addEventListener('open', wsOpen);
		ws.addEventListener('error', wsError);
		ws.addEventListener('message', wsMessage);
		ws.addEventListener('close', wsClose);

		return () => {
			ws.removeEventListener('open', wsOpen);
			ws.removeEventListener('error', wsError);
			ws.removeEventListener('message', wsMessage);
			ws.removeEventListener('close', wsClose);
		};
	}, [connection]);

	useEffect(() => {
		if (!connection) return;
		const {processorNode} = connection;

		const processAudio = (e) => {
			if (status !== 'started') return;
			const data = new Float32Array(e.inputBuffer.getChannelData(0));
			const {ws} = connection;
			ws.send(data.buffer);
		}

		processorNode.addEventListener('audioprocess', processAudio);
		return () => {
			processorNode.removeEventListener('audioprocess', processAudio);
		};
	}, [connection, status]);

	const start = async () => {
		const ws = new WebSocket(`ws://${ORIGIN}/api/queries/stream`);
		ws.binaryType = 'arraybuffer';

		const stream = await navigator.mediaDevices.getUserMedia({
			audio: {
				sampleRate: RATE,
				channelCount: CHANNELS
			},
			video: false
		});

		// @ts-ignore
		const audioContext: AudioContext = new (window.AudioContext || window.webkitAudioContext)({
			sampleRate: RATE
		});

		const streamNode = audioContext.createMediaStreamSource(stream);

		const processorNode: ScriptProcessorNode = audioContext.createScriptProcessor(8192, 1, 1);

		streamNode.connect(processorNode);
		processorNode.connect(audioContext.destination);

		setStatus('connecting');
		setConnection({
			audioContext, processorNode, stream, streamNode, ws
		});
		setBlocked(false);
	};

	const handleClick = () => {
		setBlocked(true);
		if (status === 'idle') {
			start();
		} else {
			stop();
		}
	};

	let statusDisplay;
	switch (status) {
		case 'idle':
			statusDisplay = <>Начать эфир</>;
			break;
		case 'connecting':
			statusDisplay = <>Подключение</>
			break;
		case 'waiting':
			statusDisplay = <>Ожидание</>
			break;
		case 'started':
			statusDisplay = <>Говорите</>
			break;
	}

	return (
		<div className='mx-auto flex flex-col w-[30rem]'>
			<h1 className='text-4xl mx-auto mt-8 mb-16 font-semibold text-slate-500'>
				Объявления
			</h1>

			<Card className='flex flex-col w-80 mx-auto min-h-[25rem] items-center p-3 gap-3 bg-orange-50'>
				<span className='text-2xl mx-auto font-medium text-slate-600 mb-3'>
					Объявление в эфире
				</span>
				<button disabled={blocked} onClick={handleClick} className='bg-slate-500 hover:bg-red-500 text-gray-200 p-4 rounded-full'>
					{
						status === 'idle'
						? <Mic size='5rem' />
						: <StopFill size='5rem' />
					}
				</button>
				<span className='text-lg font-semibold text-slate-500'>
					{statusDisplay}
				</span>
			</Card>
		</div>
	);
};

export default AnnouncementsPage;
