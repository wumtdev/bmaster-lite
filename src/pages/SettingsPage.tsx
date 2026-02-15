// @ts-nocheck
import { useEffect, useRef, useState } from 'react';
import { Modal, Spinner } from 'react-bootstrap';
import {
	ArrowClockwise,
	Download,
	ExclamationTriangle,
	Power,
	Upload
} from 'react-bootstrap-icons';
import { useMutation } from '@tanstack/react-query';
import Button from '@/components/Button';
import { Name, Note, Value } from '@/components/text';
import Panel from '@/components/Panel';
import Field from '@/components/Field';
import FileUploadButton from '@/components/FileUploadButton';
import Toast from '@/components/Toast';
import PageLayout from '@/components/PageLayout';
import {
	checkSchoolUpdates,
	exportSchoolSettingsFile,
	getSettingsVolume,
	importSchoolSettingsFile,
	rebootSchoolDevice,
	saveNetworkSettings,
	setSchoolVolume
} from '@/api/school/settings';

const SettingsPage = () => {
	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState('');
	const [toastVariant, setToastVariant] = useState<'success' | 'warning'>(
		'success'
	);
	const [showRebootConfirm, setShowRebootConfirm] = useState(false);

	const [isUpdatingVolume, setIsUpdatingVolume] = useState(false);
	const volumeRequestIdRef = useRef(0);

	const [schoolSettings, setSchoolSettings] = useState({
		schedules: true,
		assignments: true,
		overrides: true
	});

	const [networkSettings, setNetworkSettings] = useState({
		ip: '192.168.1.10',
		mask: '255.255.255.0',
		gateway: '192.168.1.1',
		dns: '8.8.8.8'
	});
	const [deviceVolume, setDeviceVolume] = useState(65);

	const showPageToast = (
		message: string,
		variant: 'success' | 'warning' = 'success'
	) => {
		setToastMessage(message);
		setToastVariant(variant);
		setShowToast(true);
	};

	useEffect(() => {
		let isActive = true;

		const initVolume = async () => {
			try {
				const response = await getSettingsVolume();
				const volumeValue =
					typeof response?.volume === 'number'
						? response.volume
						: Number(response?.volume);
				setDeviceVolume(volumeValue);
			} catch {
				if (isActive) {
					showPageToast('Не удалось получить текущую громкость', 'warning');
				}
			}
		};

		initVolume();

		return () => {
			isActive = false;
		};
	}, []);

	const settingsImportMutation = useMutation({
		mutationKey: ['settings.settings.import'],
		mutationFn: (file: File) => importSchoolSettingsFile(file),
		onSuccess: () => showPageToast('Импорт настроек выполнен'),
		onError: () =>
			showPageToast('Не удалось импортировать настройки школы', 'warning')
	});

	const settingsExportMutation = useMutation({
		mutationKey: ['settings.settings.export'],
		mutationFn: () => exportSchoolSettingsFile(schoolSettings),
		onSuccess: (fileBlob) => {
			const datePart = new Date().toISOString().slice(0, 10);
			const downloadUrl = URL.createObjectURL(fileBlob);
			const link = document.createElement('a');
			link.href = downloadUrl;
			link.download = `school-settings-${datePart}.json`;
			document.body.appendChild(link);
			link.click();
			link.remove();
			URL.revokeObjectURL(downloadUrl);

			showPageToast('Экспорт настроек выполнен');
		},
		onError: () =>
			showPageToast('Не удалось экспортировать настройки школы', 'warning')
	});

	const volumeMutation = useMutation({
		mutationKey: ['settings.volume.update'],
		mutationFn: (volume: number) => setSchoolVolume(volume),
		onError: () =>
			showPageToast('Не удалось отправить значение громкости', 'warning')
	});

	const netSettingsMutation = useMutation({
		mutationKey: ['settings.net_settings.save'],
		mutationFn: () => saveNetworkSettings(networkSettings),
		onSuccess: () => showPageToast('Сетевые параметры сохранены'),
		onError: () => showPageToast('Не удалось сохранить сетевые параметры', 'warning')
	});

	const checkUpdatesMutation = useMutation({
		mutationKey: ['settings.check_updates'],
		mutationFn: () => checkSchoolUpdates(),
		onSuccess: () => showPageToast('Проверка обновлений запущена'),
		onError: () => showPageToast('Не удалось запустить проверку обновлений', 'warning')
	});

	const rebootMutation = useMutation({
		mutationKey: ['settings.reboot'],
		mutationFn: () => rebootSchoolDevice(),
		onSuccess: () => {
			setShowRebootConfirm(false);
			showPageToast('Команда перезагрузки отправлена');
		},
		onError: () => showPageToast('Не удалось отправить команду перезагрузки', 'warning')
	});

	const handleVolumeChange = (value: number) => {
		setDeviceVolume(value);
		const requestId = ++volumeRequestIdRef.current;
		setIsUpdatingVolume(true);
		volumeMutation.mutate(value, {
			onSettled: () => {
				if (requestId === volumeRequestIdRef.current) {
					setIsUpdatingVolume(false);
				}
			}
		});
	};

	const updateNetworkField = (field: string, value: string) =>
		setNetworkSettings((prev) => ({ ...prev, [field]: value }));

	return (
		<PageLayout pageTitle='Настройки' className='max-w-[61.5rem]'>
			<Toast
				show={showToast}
				setShow={setShowToast}
				message={toastMessage}
				variant={toastVariant}
				delay={4500}
			/>

			<div className='grid grid-cols-1 lg:grid-cols-[36rem_24rem] lg:justify-center gap-6 items-start'>
				<Panel className='w-full lg:w-[36rem]'>
					<Panel.Header>Настройки школы</Panel.Header>
					<Panel.Body className='p-5 flex flex-col gap-4'>
						<Field>
							<Name>Конфигурация</Name>
							<Value className='flex flex-col gap-3'>
								<div className='flex flex-col gap-2'>
									<label className='flex items-center gap-2 text-sm'>
										<input
											type='checkbox'
											checked={schoolSettings.schedules}
											onChange={(e) =>
												setSchoolSettings((prev) => ({
													...prev,
													schedules: e.target.checked
												}))
											}
										/>
										Расписания
									</label>
									<label className='flex items-center gap-2 text-sm'>
										<input
											type='checkbox'
											checked={schoolSettings.assignments}
											onChange={(e) =>
												setSchoolSettings((prev) => ({
													...prev,
													assignments: e.target.checked
												}))
											}
										/>
										Назначения
									</label>
									<label className='flex items-center gap-2 text-sm'>
										<input
											type='checkbox'
											checked={schoolSettings.overrides}
											onChange={(e) =>
												setSchoolSettings((prev) => ({
													...prev,
													overrides: e.target.checked
												}))
											}
										/>
										Переопределения
									</label>
								</div>

								<div className='flex items-start gap-3'>
									<FileUploadButton
										className='w-full py-2 h-9 flex items-center justify-center gap-2'
										variant='success'
										handleFile={(file) => settingsImportMutation.mutate(file)}
										disabled={
											settingsImportMutation.isPending || settingsExportMutation.isPending
										}
										input={{ accept: '.json,application/json' }}
									>
										{settingsImportMutation.isPending ? (
											<Spinner animation='border' size='sm' />
										) : (
											<Download className='w-4 h-4 shrink-0' />
										)}
										{settingsImportMutation.isPending ? 'Импорт...' : 'Импорт'}
									</FileUploadButton>

									<Button
										className='w-full py-2 h-9 flex items-center justify-center gap-2'
										variant='primary'
										onClick={() => settingsExportMutation.mutate()}
										disabled={
											settingsExportMutation.isPending || settingsImportMutation.isPending
										}
									>
										{settingsExportMutation.isPending ? (
											<Spinner animation='border' size='sm' />
										) : (
											<Upload className='w-4 h-4' />
										)}
										{settingsExportMutation.isPending ? 'Экспорт...' : 'Экспорт'}
									</Button>
								</div>
							</Value>
						</Field>
						<div className='pt-3 border-t space-y-3'>
							<Field>
								<Name>Громкость устройства</Name>
								<Value className='space-y-2'>
									<input
										type='range'
										min={0}
										max={100}
										step={1}
										value={deviceVolume}
										onChange={(e) => handleVolumeChange(Number(e.target.value))}
										className='w-full'
									/>
									<Note>
										{deviceVolume}%{isUpdatingVolume ? ' (сохранение...)' : ''}
									</Note>
								</Value>
							</Field>

							<div className='grid grid-cols-1 gap-2'>
								<Button
									variant='primary'
									className='w-full'
									onClick={() => checkUpdatesMutation.mutate()}
									disabled={checkUpdatesMutation.isPending}
								>
									{checkUpdatesMutation.isPending ? (
										<Spinner animation='border' size='sm' />
									) : (
										<ArrowClockwise />
									)}
									Проверить обновления
								</Button>
								<Button
									variant='danger'
									className='w-full'
									onClick={() => setShowRebootConfirm(true)}
									disabled={rebootMutation.isPending}
								>
									<Power />
									Перезагрузить сервер
								</Button>
							</div>
						</div>
					</Panel.Body>
				</Panel>

				<Panel>
					<Panel.Header>Сетевые настройки</Panel.Header>
					<Panel.Body className='p-4 space-y-5'>
						<Field>
							<Name>IP адрес</Name>
							<Value>
								<input
									type='text'
									className='w-full p-2 border rounded-md'
									value={networkSettings.ip}
									onChange={(e) => updateNetworkField('ip', e.target.value)}
									placeholder='192.168.1.10'
								/>
							</Value>
						</Field>

						<Field>
							<Name>Маска</Name>
							<Value>
								<input
									type='text'
									className='w-full p-2 border rounded-md'
									value={networkSettings.mask}
									onChange={(e) => updateNetworkField('mask', e.target.value)}
									placeholder='255.255.255.0'
								/>
							</Value>
						</Field>

						<Field>
							<Name>Шлюз</Name>
							<Value>
								<input
									type='text'
									className='w-full p-2 border rounded-md'
									value={networkSettings.gateway}
									onChange={(e) => updateNetworkField('gateway', e.target.value)}
									placeholder='192.168.1.1'
								/>
							</Value>
						</Field>

						<Field>
							<Name>DNS</Name>
							<Value>
								<input
									type='text'
									className='w-full p-2 border rounded-md'
									value={networkSettings.dns}
									onChange={(e) => updateNetworkField('dns', e.target.value)}
									placeholder='8.8.8.8'
								/>
							</Value>
						</Field>

						<Button
							className='w-full'
							onClick={() => netSettingsMutation.mutate()}
							disabled={netSettingsMutation.isPending}
						>
							{netSettingsMutation.isPending ? (
								<Spinner animation='border' size='sm' />
							) : (
								'Сохранить'
							)}
						</Button>
					</Panel.Body>
				</Panel>
			</div>

			<Modal show={showRebootConfirm} onHide={() => setShowRebootConfirm(false)}>
				<Modal.Header closeButton className='border-none'>
					<Modal.Title>Подтверждение перезагрузки</Modal.Title>
				</Modal.Header>
				<Modal.Body>
					<div className='flex items-start gap-3'>
						<ExclamationTriangle className='text-yellow-500 mt-1' size={22} />
						<div className='space-y-2'>
							<p className='font-medium'>
								Вы действительно хотите перезагрузить сервер?
							</p>
							<p className='text-red-600 text-sm'>
								Во время перезагрузки воспроизведение и управление будут временно
								недоступны.
							</p>
						</div>
					</div>
				</Modal.Body>
				<Modal.Footer className='border-none'>
					<Button
						variant='secondary'
						onClick={() => setShowRebootConfirm(false)}
						disabled={rebootMutation.isPending}
					>
						Отмена
					</Button>
					<Button
						variant='danger'
						onClick={() => rebootMutation.mutate()}
						disabled={rebootMutation.isPending}
					>
						{rebootMutation.isPending ? (
							<>
								<Spinner animation='border' size='sm' />
								<span className='ml-2'>Отправка...</span>
							</>
						) : (
							'Подтвердить перезагрузку'
						)}
					</Button>
				</Modal.Footer>
			</Modal>
		</PageLayout>
	);
};

export default SettingsPage;
