// @ts-nocheck
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Card } from 'react-bootstrap';
import { Mic, StopCircle, Loader2 } from 'lucide-react';

// Replace these with your runtime env values
const WS_BASE_URL =
	typeof window !== 'undefined'
		? window.location.protocol === 'https:'
			? 'wss://' + window.location.host
			: 'ws://' + 'localhost:8000'
		: '';
const RATE = 8000;
const CHANNELS = 1;

type ConnectionRef = {
	ws?: WebSocket;
	audioContext?: AudioContext;
	workletNode?: AudioWorkletNode | null;
	processorNode?: ScriptProcessorNode | null;
	stream?: MediaStream | null;
};

export default function AnnouncementsPage(): JSX.Element {
	const connRef = useRef<ConnectionRef>({});
	const [status, setStatus] = useState<
		'idle' | 'connecting' | 'waiting' | 'started' | 'error'
	>('idle');
	const [blocked, setBlocked] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [sampleRate, setSampleRate] = useState<number>(RATE);

	const safeCloseWs = useCallback((ws?: WebSocket) => {
		if (!ws) return;
		if (
			ws.readyState !== WebSocket.CLOSED &&
			ws.readyState !== WebSocket.CLOSING
		) {
			try {
				ws.close();
			} catch (e) {}
		}
	}, []);

	const cleanupConnection = useCallback(async () => {
		const c = connRef.current;
		try {
			if (c?.workletNode) {
				try {
					c.workletNode.port.onmessage = null;
					c.workletNode.disconnect();
				} catch (e) {}
				c.workletNode = null;
			}
			if (c?.processorNode) {
				try {
					c.processorNode.removeEventListener('audioprocess' as any, () => {});
					c.processorNode.disconnect();
				} catch (e) {}
				c.processorNode = null;
			}
			if (c?.audioContext) {
				try {
					await c.audioContext.close();
				} catch (e) {
					console.warn('audioContext.close failed', e);
				}
				c.audioContext = undefined;
			}
			if (c?.stream) {
				try {
					c.stream.getTracks().forEach((t) => t.stop());
				} catch (e) {}
				c.stream = null;
			}
			safeCloseWs(c?.ws);
			connRef.current = {};
		} catch (e) {
			console.error('cleanup error', e);
		} finally {
			setStatus('idle');
			setBlocked(false);
		}
	}, [safeCloseWs]);

	const start = useCallback(async () => {
		setError(null);
		setBlocked(true);
		setStatus('connecting');

		const ws = new WebSocket(`${WS_BASE_URL}/api/queries/stream`);
		ws.binaryType = 'arraybuffer';
		connRef.current.ws = ws;

		try {
			const stream = await navigator.mediaDevices.getUserMedia({
				audio: { channelCount: CHANNELS },
				video: false
			});
			connRef.current.stream = stream;

			const trackSettings = stream.getAudioTracks()[0].getSettings();
			const actualSampleRate = (trackSettings.sampleRate as number) || RATE;
			setSampleRate(actualSampleRate);

			const AudioCtx = (window.AudioContext ||
				(window as any).webkitAudioContext) as typeof AudioContext;
			const audioContext = new AudioCtx({ sampleRate: actualSampleRate });
			connRef.current.audioContext = audioContext;

			if (ws.readyState === WebSocket.OPEN) {
				ws.send(
					JSON.stringify({
						icom: 'main',
						rate: actualSampleRate,
						channels: CHANNELS,
						priority: 4,
						force: true
					})
				);
			} else {
				const onOpenOnce = () => {
					try {
						ws.send(
							JSON.stringify({
								icom: 'main',
								rate: actualSampleRate,
								channels: CHANNELS,
								priority: 4,
								force: true
							})
						);
					} catch (e) {}
					ws.removeEventListener('open', onOpenOnce);
				};
				ws.addEventListener('open', onOpenOnce);
			}
		} catch (e: any) {
			console.error('start failed', e);
			setError(e?.message || 'Не удалось получить доступ к микрофону');
			setStatus('error');
			setBlocked(false);
			safeCloseWs(connRef.current.ws);
		}
	}, [safeCloseWs]);

	const stop = useCallback(async () => {
		await cleanupConnection();
	}, [cleanupConnection]);

	const handleClick = useCallback(() => {
		if (status === 'idle' || status === 'error') {
			start();
		} else {
			stop();
		}
	}, [start, stop, status]);

	useEffect(() => {
		const onKey = (e: KeyboardEvent) => {
			if (e.code === 'Space') {
				e.preventDefault();
				if (!blocked) handleClick();
			}
		};
		window.addEventListener('keydown', onKey);
		return () => window.removeEventListener('keydown', onKey);
	}, [blocked, handleClick]);

	useEffect(() => {
		const c = connRef.current;
		const ws = c.ws;
		if (!ws) return;

		const onOpen = () => {
			try {
				ws.send(
					JSON.stringify({
						icom: 'main',
						rate: sampleRate || RATE,
						channels: CHANNELS,
						priority: 4,
						force: true
					})
				);
			} catch (e) {}
		};

		const onError = (ev: Event) => {
			console.error('ws error', ev);
			setError('WebSocket error');
			setStatus('error');
		};

		const onMessage = (ev: MessageEvent) => {
			try {
				const msg = typeof ev.data === 'string' ? JSON.parse(ev.data) : null;
				if (msg?.type === 'started') setStatus('started');
				if (msg?.type === 'stopped') setStatus('waiting');
			} catch (e) {
				console.debug('ws message (binary/unknown)', ev.data);
			}
		};

		const onClose = () => {
			cleanupConnection();
		};

		ws.addEventListener('open', onOpen);
		ws.addEventListener('error', onError);
		ws.addEventListener('message', onMessage);
		ws.addEventListener('close', onClose);

		return () => {
			try {
				ws.removeEventListener('open', onOpen);
				ws.removeEventListener('error', onError);
				ws.removeEventListener('message', onMessage);
				ws.removeEventListener('close', onClose);
			} catch (e) {}
		};
	}, [status, sampleRate, cleanupConnection]);

	useEffect(() => {
		const node = connRef.current.workletNode || connRef.current.processorNode;
		if (!node) return;

		const onMessage = (ev: MessageEvent) => {
			if (status !== 'started') return;
			const ws = connRef.current.ws;
			if (!ws || ws.readyState !== WebSocket.OPEN) return;
			const payload = ev.data;
			if (payload instanceof Float32Array) ws.send(payload.buffer);
			else if (payload && payload.buffer) ws.send(payload.buffer);
		};

		if (connRef.current.workletNode) {
			connRef.current.workletNode.port.onmessage = (e) =>
				onMessage({ data: e.data } as MessageEvent);
			return () => {
				if (connRef.current.workletNode)
					connRef.current.workletNode.port.onmessage = null;
			};
		} else if (connRef.current.processorNode) {
			const proc = connRef.current.processorNode;
			const audioprocess = (e: any) => {
				if (status !== 'started') return;
				const channel = e.inputBuffer.getChannelData(0);
				onMessage({
					data: new Float32Array(channel)
				} as unknown as MessageEvent);
			};
			proc.addEventListener('audioprocess' as any, audioprocess as any);
			return () =>
				proc.removeEventListener('audioprocess' as any, audioprocess as any);
		}

		return;
	}, [status]);

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
			<h1 className='text-3xl font-semibold text-slate-600 mb-6'>Объявления</h1>

			<Card className='shadow-lg rounded-2xl overflow-hidden'>
				<div className='p-8 bg-white'>
					<div className='flex flex-col items-center gap-6'>
						<div className='text-center'>
							<div className='text-lg font-medium text-slate-700'>
								Вещание в эфир
							</div>
							<div className='text-sm text-slate-500 mt-1'>
								Нажмите большую кнопку ниже или используйте&nbsp;
								<kbd className='px-2 py-1 bg-black text-white rounded'>
									Space
								</kbd>
							</div>
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
										: 'opacity-8 bg-blue-600'
								}`}
							/>

							<div className='relative z-10 flex items-center justify-center'>
								{status === 'connecting' && (
									<Loader2 className='animate-spin' size={44} />
								)}
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
									<div className='font-medium text-slate-700'>
										{sampleRate} Hz
									</div>
								</div>
								<div className='text-xs text-slate-400 mb-2'>
									Логи и ошибки выводятся в консоль.
								</div>
							</div>
						</div>
					</div>
				</div>
			</Card>

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
