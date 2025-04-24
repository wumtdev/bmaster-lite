import React, { useState } from 'react';
import { Button, Card, Spinner } from 'react-bootstrap';
import * as sounds from '@/api/sounds';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	ExclamationTriangle,
	Laptop,
	MusicNote,
	PlusCircle,
	Speaker
} from 'react-bootstrap-icons';
import { humanFileSize } from '@/utils';
import AudioPlayer from '@/components/AudioPlayer';
import { BASE_URL } from '@/api';
import { playSound } from '@/api/queries';

const SoundsPage = () => {
	const soundsQuery = useQuery({
		queryFn: () => sounds.getSoundInfo(),
		queryKey: ['sounds']
	});
	const [selectedSoundName, setSelectedSoundName] = useState<
		string | undefined
	>(undefined);

	const queryClient = useQueryClient();

	const sendSound = useMutation({
		mutationFn: (sound_name: string) =>
			playSound({
				icom_id: 'main',
				force: false,
				priority: 2,
				sound_name: sound_name
			}),
		onSuccess: () => queryClient.invalidateQueries('icoms')
	});

	const soundList = soundsQuery.data;
	let selected;

	return (
		<div className='mx-auto flex flex-col'>
			<h1 className='text-4xl ml-8 font-semibold text-slate-500 mb-6'>Звуки</h1>
			<Card className='flex flex-row h-[50rem]'>
				<div className='flex flex-col w-2/3 border-r p-4'>
					<div className='grid grid-cols-2 gap-4'>
						{soundList ? (
							soundList.map((soundInfo) => (
								<div
									key={soundInfo.name}
									className={`flex h-20 items-center p-2 rounded-lg cursor-pointer ${
										selectedSoundName === soundInfo.name
											? 'bg-blue-50'
											: 'hover:bg-gray-50'
									}`}
									onClick={() => setSelectedSoundName(soundInfo.name)}
								>
									<MusicNote className='text-blue-500 mr-3' />

									<div className='flex flex-col'>
										<div className='font-medium text-gray-800'>
											{soundInfo.name}
										</div>
										<div className='text-sm text-gray-500 flex items-center gap-2'>
											<span>0:00</span>
											<span>•</span>
											<span>{humanFileSize(soundInfo.size)}</span>
										</div>
									</div>

									<button className='ml-2 p-2 hover:bg-gray-200 rounded-full opacity-0 group-hover:opacity-100 transition-opacity'>
										<PlusCircle className='text-green-500' size={20} />
									</button>
								</div>
							))
						) : (
							<div>
								<Spinner /> Загрузка
							</div>
						)}
					</div>
				</div>
				<div className='flex flex-col gap-2 w-1/3 p-4'>
					{selectedSoundName ? (
						<>
							<h1 className='text-xl font-medium text-slate-600 mb-4'>
								{selectedSoundName}
							</h1>
							<div className='mt-auto flex flex-col border bg-orange-50 p-2.5'>
								<span className='flex flex-row items-center gap-3 justify-start ml-1 mb-3 font-medium'>
									<Laptop size='1.2rem' /> Ваше устройство
								</span>
								<AudioPlayer
									className='w-full'
									src={`${BASE_URL}/api/sounds/file/${selectedSoundName}`}
								/>
							</div>
							<div className='flex flex-col border bg-orange-50 p-2.5'>
								<span className='flex flex-row items-center gap-3 justify-start ml-1 mb-3 font-medium'>
									<Speaker size='1.2rem' /> Динамики школы
								</span>
								<Button
									disabled={sendSound.isPending}
									onClick={() => sendSound.mutate(selectedSoundName)}
									variant='outline-success'
								>
									Воспроизвести
								</Button>
							</div>
						</>
					) : (
						// <div className='flex items-center gap-3'>
						// 	<button className='p-2 bg-blue-500 text-white rounded-full'>
						// 		<PlayFill size={20} />
						// 	</button>

						// 	<div className='flex-1 bg-gray-200 rounded-full h-2'>
						// 		<div className='bg-blue-500 w-1/3 h-2 rounded-full'></div>
						// 	</div>

						// 	<span className='text-sm text-gray-500'>0:15 / 0:45</span>
						// </div>
						<div className='flex flex-row items-center justify-center gap-3 text-orange-700'>
							<ExclamationTriangle size={21} /> Выберите звук
						</div>
					)}
				</div>
			</Card>
		</div>
	);
};

export default SoundsPage;
