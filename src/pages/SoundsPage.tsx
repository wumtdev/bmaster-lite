// @ts-nocheck
import React, { useState } from 'react';
import { Button, Spinner, Modal } from 'react-bootstrap';
import * as sounds from '@/api/sounds';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
	ExclamationTriangle,
	Laptop,
	MusicNote,
	Plus,
	Speaker,
	Trash
} from 'react-bootstrap-icons';
import { formatDurationMSS, humanFileSize } from '@/utils';
import AudioPlayer from '@/components/AudioPlayer';
import { HTTP_BASE_URL } from '@/api';
import { playSound } from '@/api/queries';
import FileUploadButton from '@/components/FileUploadButton';
import { useSounds } from '@/sounds';

const SoundsPage = () => {
	const { soundsQuery } = useSounds();
	const [selectedSoundName, setSelectedSoundName] = useState<
		string | undefined
	>(undefined);
	const [showDeleteModal, setShowDeleteModal] = useState(false);
	const [soundToDelete, setSoundToDelete] = useState<string | null>(null);
	const queryClient = useQueryClient();

	const playSoundMut = useMutation({
		mutationFn: (sound_name: string) =>
			playSound({ icom_id: 'main', force: false, priority: 2, sound_name }),
		onSuccess: () => queryClient.invalidateQueries('icoms')
	});

	const uploadSoundMut = useMutation({
		mutationFn: (file: File) => sounds.uploadSound(file),
		onSuccess: () => queryClient.invalidateQueries('sounds')
	});

	const deleteSoundMut = useMutation({
		mutationFn: (sound_name: string) => sounds.deleteSound(sound_name),
		onSuccess: () => queryClient.invalidateQueries('sounds')
	});

	const handleDeleteClick = (soundName: string) => {
		setSoundToDelete(soundName);
		setShowDeleteModal(true);
	};

	const confirmDelete = () => {
		if (soundToDelete) {
			deleteSoundMut.mutate(soundToDelete);
			setShowDeleteModal(false);
			setSoundToDelete(null);

			// Если удаляем выбранный звук - сбрасываем выделение
			if (selectedSoundName === soundToDelete) {
				setSelectedSoundName(undefined);
			}
		}
	};

	const soundList = soundsQuery.data || [];
	const soundMap = Object.fromEntries(soundList.map((s) => [s.name, s]));
	const selectedSound = selectedSoundName
		? soundMap[selectedSoundName]
		: undefined;

	console.log(soundList);

	return (
		<div className='max-w-7xl mx-auto p-6'>
			<h1 className='text-3xl font-semibold text-gray-700 mb-6'>
				Библиотека звуков
			</h1>
			{/* Левая панель — список звуков */}
			<div className='grid grid-cols-3 gap-6'>
				<div className='col-span-2 bg-white rounded-xl shadow p-4 flex flex-col'>
					{soundsQuery.isLoading ? (
						<div className='flex justify-center items-center flex-1'>
							<Spinner />{' '}
							<span className='ml-2 text-gray-500'>Загрузка...</span>
						</div>
					) : (
						<div className='grid gap-3 overflow-y-auto pr-2'>
							{soundList.length === 0 ? (
								<div className='text-gray-500 text-center py-6'>
									Нет доступных звуков. Загрузите новые файлы.
								</div>
							) : (
								soundList.map((soundInfo) => (
									<div
										key={soundInfo.name}
										onClick={() => setSelectedSoundName(soundInfo.name)}
										className={`flex items-center p-3 rounded-lg border transition hover:shadow-sm cursor-pointer ${
											selectedSoundName === soundInfo.name
												? 'bg-blue-50 border-blue-300'
												: 'bg-white border-gray-200 hover:bg-gray-50'
										}`}
									>
										{soundInfo.sound_specs ? (
											<MusicNote size={24} className='text-blue-500 mr-3' />
										) : (
											<ExclamationTriangle
												size={24}
												className='text-orange-500 mr-3'
											/>
										)}
										<div className='flex flex-col'>
											<span className='font-medium'>{soundInfo.name}</span>
											<span className='text-sm text-gray-500 flex items-center gap-1'>
												{soundInfo.sound_specs &&
													formatDurationMSS(soundInfo.sound_specs.duration)}
												{soundInfo.sound_specs && <span>•</span>}
												{humanFileSize(soundInfo.size)}
											</span>
										</div>
										<button
											className='ml-auto p-2 text-gray-400 hover:text-red-500'
											onClick={(e) => {
												e.stopPropagation();
												handleDeleteClick(soundInfo.name);
											}}
										>
											<Trash size={18} />
										</button>
									</div>
								))
							)}
						</div>
					)}

					<div className='mt-4'>
						<FileUploadButton
							className='flex items-center justify-center gap-2 w-full bg-blue-500 hover:bg-blue-600 text-white py-2 rounded-lg transition'
							handleFile={(file) => uploadSoundMut.mutate(file)}
						>
							<Plus size={20} /> Загрузить звук
						</FileUploadButton>
					</div>
				</div>

				{/* Правая панель — предпросмотр и управление звуком */}
				<div className='bg-white rounded-xl shadow p-4 flex flex-col'>
					{selectedSound ? (
						<>
							<h2 className='text-lg font-semibold text-gray-700 mb-4'>
								{selectedSound.name}
							</h2>
							<div className='bg-gray-50 p-3 rounded-lg border mb-3'>
								<span className='flex items-center gap-2 mb-2 text-gray-700 font-medium'>
									<Laptop size={16} /> Ваше устройство
								</span>
								<AudioPlayer
									className='w-full'
									src={`${HTTP_BASE_URL}/api/sounds/file/${selectedSound.name}`}
								/>
							</div>

							<div className='bg-gray-50 p-3 rounded-lg border flex flex-col gap-3'>
								<span className='flex items-center gap-2 text-gray-700 font-medium'>
									<Speaker size={16} /> Динамики школы
								</span>
								{selectedSound.sound_specs ? (
									<Button
										className='w-full'
										disabled={playSoundMut.isPending}
										onClick={() => playSoundMut.mutate(selectedSoundName)}
										variant='success'
									>
										▶ Воспроизвести
									</Button>
								) : (
									<span className='text-orange-600 text-sm flex items-center gap-1'>
										<ExclamationTriangle size={14} /> Неизвестный формат
									</span>
								)}
							</div>
						</>
					) : (
						<div className='flex flex-col items-center justify-center text-gray-400 flex-1'>
							<Speaker size={28} className='mb-2' />
							<span>Выберите звук для предпросмотра</span>
						</div>
					)}
				</div>
			</div>

			<Modal show={showDeleteModal} onHide={() => setShowDeleteModal(false)}>
				<Modal.Header closeButton>
					<Modal.Title>Подтверждение удаления</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<div className='flex items-start'>
						<ExclamationTriangle
							className='text-yellow-500 mr-3 mt-1'
							size={24}
						/>
						<div>
							<p className='font-medium mb-1'>
								Вы уверены, что хотите удалить звук?
							</p>
							<p className='bg-gray-100 p-2 rounded-md font-mono text-sm'>
								{soundToDelete}
							</p>
							<p className='mt-2 text-red-600 text-sm'>
								Это действие невозможно отменить.
							</p>
						</div>
					</div>
				</Modal.Body>
				<Modal.Footer>
					<Button
						variant='secondary'
						onClick={() => setShowDeleteModal(false)}
						disabled={deleteSoundMut.isPending}
					>
						Отмена
					</Button>
					<Button
						variant='danger'
						onClick={confirmDelete}
						disabled={deleteSoundMut.isPending}
					>
						{deleteSoundMut.isPending ? (
							<>
								<Spinner
									as='span'
									animation='border'
									size='sm'
									role='status'
									aria-hidden='true'
								/>
								<span className='ml-2'>Удаление...</span>
							</>
						) : (
							'Удалить'
						)}
					</Button>
				</Modal.Footer>
			</Modal>
		</div>
	);
};

export default SoundsPage;
