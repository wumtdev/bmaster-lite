// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { Spinner } from 'react-bootstrap';
import { Mic, StopCircle } from 'react-bootstrap-icons';
import { WS_BASE_URL } from '@/api';
import { H1, H2, Note } from '@/components/text';
import Panel from '@/components/Panel';
import Kbd from '@/components/Kbd';

// Replace these with your runtime env values
const RATE = 48000;
const CHANNELS = 1;

interface Connection {
	ws: WebSocket;
	audioContext: AudioContext;
	processorNode: ScriptProcessorNode;
	stream: MediaStream;
	streamNode: MediaStreamAudioSourceNode;
}

type BroadcastStatus = 'idle' | 'connecting' | 'waiting' | 'started' | 'error';

export default function AnnouncementsPage(): JSX.Element {
	const [connection, setConnection] = useState<Connection | null>(null);
	const [status, setStatus] = useState<BroadcastStatus>('idle');
	const [error, setError] = useState<string | null>(null);
	const connectionRef = useRef<Connection | null>(null);

	const blocked = status === 'connecting';

	useEffect(() => {
		connectionRef.current = connection;
	}, [connection]);

	const stop = async (
		options: { closeSocket?: boolean; nextStatus?: BroadcastStatus } = {}
	) => {
		const { closeSocket = true, nextStatus = 'idle' } = options;
		const conn = connectionRef.current;
		connectionRef.current = null;
		setConnection(null);
		setStatus(nextStatus);

		if (!conn) return;

		try {
			conn.streamNode.disconnect();
		} catch {}
		try {
			conn.processorNode.disconnect();
		} catch {}
		try {
			await conn.audioContext.close();
		} catch {}
		try {
			conn.stream.getTracks().forEach((track) => track.stop());
		} catch {}
		if (
			closeSocket &&
			(conn.ws.readyState === WebSocket.OPEN ||
				conn.ws.readyState === WebSocket.CONNECTING)
		) {
			try {
				conn.ws.close();
			} catch {}
		}
	};

	useEffect(() => {
		if (!connection) return;

		const { ws } = connection;

		const wsOpen = () => {
			console.log('[WS] Opened');
			ws.send(
				JSON.stringify({
					icom: 'main',
					rate: RATE,
					channels: CHANNELS,
					priority: 4,
					force: true
				})
			);
		};

		const wsError = (e) => {
			console.error('[WS] Error:', e);
			setError('Ошибка WebSocket-соединения');
			stop({ closeSocket: false, nextStatus: 'error' });
		};

		const wsMessage = (e) => {
			const data = e.data;
			console.log('[WS] Message:', data);
			let msg: any = null;
			try {
				msg = JSON.parse(data);
			} catch {
				return;
			}

			switch (msg.type) {
				case 'error':
					setError(msg.error || 'Ошибка эфира');
					stop({ closeSocket: false, nextStatus: 'error' });
					break;
				case 'started':
					setStatus('started');
					break;
				case 'stopped':
					setStatus('waiting');
					break;
				case 'waiting':
					setStatus('waiting');
					break;
			}
		};

		const wsClose = () => {
			console.log('[WS] Closed');
			if (connectionRef.current) stop({ closeSocket: false, nextStatus: 'idle' });
		};

		if (ws.readyState === WebSocket.OPEN) {
			wsOpen();
		} else ws.addEventListener('open', wsOpen);

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
		const { processorNode } = connection;

		const processAudio = (e) => {
			if (status !== 'started') return;
			const data = new Float32Array(e.inputBuffer.getChannelData(0));
			const { ws } = connection;
			if (ws.readyState !== WebSocket.OPEN) return;
			ws.send(data.buffer);
		};

		processorNode.addEventListener('audioprocess', processAudio);
		return () => {
			processorNode.removeEventListener('audioprocess', processAudio);
		};
	}, [connection, status]);

	const start = async () => {
		setError(null);
		const token = localStorage.getItem('bmaster.auth.token');
		if (!token) {
			setError('Требуется авторизация');
			setStatus('error');
			return;
		}

		let ws: WebSocket | null = null;
		let stream: MediaStream | null = null;
		let audioContext: AudioContext | null = null;
		let streamNode: MediaStreamAudioSourceNode | null = null;
		let processorNode: ScriptProcessorNode | null = null;

		try {
			setStatus('connecting');
			const wsUrl = `${WS_BASE_URL}/api/queries/stream?token=${encodeURIComponent(token)}`;
			ws = new WebSocket(wsUrl);
			ws.binaryType = 'arraybuffer';

			stream = await navigator.mediaDevices.getUserMedia({
				audio: {
					sampleRate: RATE,
					channelCount: CHANNELS
				},
				video: false
			});

			// @ts-ignore
			audioContext = new (window.AudioContext || window.webkitAudioContext)({
				sampleRate: RATE
			});
			streamNode = audioContext.createMediaStreamSource(stream);
			processorNode = audioContext.createScriptProcessor(16384, 1, 1);
			streamNode.connect(processorNode);
			processorNode.connect(audioContext.destination);

			setConnection({
				audioContext,
				processorNode,
				stream,
				streamNode,
				ws
			});
		} catch (e: any) {
			console.error('[Broadcast] Failed to start:', e);
			setError(e?.message || 'Не удалось начать эфир');
			setStatus('error');

			try {
				streamNode?.disconnect();
			} catch {}
			try {
				processorNode?.disconnect();
			} catch {}
			try {
				await audioContext?.close();
			} catch {}
			try {
				stream?.getTracks().forEach((track) => track.stop());
			} catch {}
			if (
				ws &&
				(ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)
			) {
				try {
					ws.close();
				} catch {}
			}
		}
	};

	const handleClick = () => {
		if (status === 'idle' || status === 'error') {
			start();
		} else {
			stop();
		}
	};

	const statusLabel =
		status === 'idle'
			? 'Готов'
			: status === 'connecting'
			? 'Подключение...'
			: status === 'waiting'
			? 'Ожидание'
			: status === 'started'
			? 'Говорите'
			: 'Ошибка';

	const statusBadgeClass = () => {
		switch (status) {
			case 'started':
				return 'bg-emerald-50 text-emerald-700';
			case 'connecting':
				return 'bg-amber-50 text-amber-700';
			case 'waiting':
				return 'bg-sky-50 text-sky-700';
			case 'error':
				return 'bg-red-50 text-red-700';
			default:
				return 'bg-slate-50 text-slate-700';
		}
	};

	return (
		<div className='mx-auto max-w-2xl p-6'>
			<H1>Объявления</H1>

			<Panel>
				<div className='p-8 bg-white'>
					<div className='flex flex-col items-center gap-6'>
						<div className='text-center'>
							<H2>Вещание в эфир</H2>
							<Note>
								Нажмите большую кнопку ниже или используйте&nbsp;
								<Kbd code='Space' />
							</Note>
						</div>

						{/* BIG CENTER BUTTON */}
						<button
							aria-pressed={status === 'started'}
							aria-label={status === 'idle' ? 'Начать эфир' : 'Остановить эфир'}
							disabled={blocked}
							onClick={handleClick}
							className={`relative flex items-center justify-center rounded-full transform transition-transform active:scale-95 focus:outline-none ring-0 shadow-md
                ${
									status === 'started'
										? 'bg-rose-600 hover:bg-rose-700 pulse-announce'
										: 'bg-blue-600 hover:bg-blue-600'
								}
                text-white`}
							style={{ width: 140, height: 140 }}
						>
							{/* subtle inner circle */}
							<span
								className={`absolute rounded-full inset-0 ${
									status === 'started'
										? 'opacity-10 bg-rose-600'
										: 'bg-blue-500 hover:bg-blue-400'
								}`}
							/>

							<div className='relative z-10 flex items-center justify-center'>
								{status === 'connecting' && <Spinner size={44} />}
								{status === 'idle' && <Mic size={44} />}
								{status === 'started' && <StopCircle size={44} />}
								{status === 'waiting' && <Mic size={44} />}
								{status === 'error' && <StopCircle size={44} />}
							</div>
						</button>

						<div className='flex flex-col sm:flex-row items-center gap-3'>
							<div
								className={`px-3 py-1 rounded-full text-sm font-medium ${statusBadgeClass()}`}
							>
								{statusLabel}
							</div>
							{error && <div className='text-sm text-red-600'>{error}</div>}
						</div>

						{/* bottom info + small instruction */}
						<div className='w-full mt-2 text-center'>
							<div className='inline-grid grid-cols-2 gap-4 text-sm text-slate-500 bg-slate-50 px-4 py-2 rounded-md'>
								<div className='flex flex-col items-start'>
									<div className='text-xs text-slate-400'>Кодек</div>
									<div className='font-medium text-slate-700'>Opus</div>
								</div>
								<div className='flex flex-col items-end'>
									<div className='text-xs text-slate-400'>Частота</div>
									<div className='font-medium text-slate-700'>{RATE} Hz</div>
								</div>
								<Note className='col-span-2 text-center text-xs mb-2'>
									Логи и ошибки выводятся в консоль.
								</Note>
							</div>
						</div>
					</div>
				</div>
			</Panel>

			<style>{`
        /* pulse animation for active broadcast */
        @keyframes pulseAnnounce {
          0% { box-shadow: 0 0 0 0 rgba(0,0,0,0.0); transform: scale(1); }
          50% { box-shadow: 0 0 0 14px rgba(0,0,0,0.03); transform: scale(1.02); }
          100% { box-shadow: 0 0 0 0 rgba(0,0,0,0.0); transform: scale(1); }
        }
        .pulse-announce {
          animation: pulseAnnounce 1.8s infinite ease-in-out;
        }
        /* accessible focus ring */
        button:focus { box-shadow: 0 0 0 6px rgba(37,99,235,0.12); }
        /* kbd style (ensure visible on white bg) */
        kbd { font-weight: 600; }
        @media (prefers-reduced-motion: reduce) {
          .pulse-announce, .animate-spin { animation: none !important; }
        }
      `}</style>
		</div>
	);
}
