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
import UpdateSoftwareModal, {
	type UpdatePhase
} from '@/components/settings/UpdateSoftwareModal';
import {
	checkSchoolUpdates,
	exportSchoolSettingsFile,
	getSchoolHealth,
	getSettingsVolume,
	importSchoolSettingsFile,
	rebootSchoolDevice,
	saveNetworkSettings,
	setSchoolVolume,
	updateSchoolSoftware
} from '@/api/school/settings';

const HEALTH_POLL_INTERVAL_MS = 2000;
const HEALTH_TIMEOUT_MS = 180000;
const HEALTH_REQUEST_TIMEOUT_MS = 1500;
const UPDATE_DEBUG_NAMESPACE = '[settings/update-flow]';
const SETTINGS_DEBUG_NAMESPACE = '[settings/page]';

const SettingsPage = () => {
	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState('');
	const [toastVariant, setToastVariant] = useState<'success' | 'warning'>(
		'success'
	);
	const [showRebootConfirm, setShowRebootConfirm] = useState(false);
	const [showUpdateModal, setShowUpdateModal] = useState(false);
	const [updatePhase, setUpdatePhase] = useState<UpdatePhase>('confirm');
	const [updateErrorMessage, setUpdateErrorMessage] = useState('');

	const [isUpdatingVolume, setIsUpdatingVolume] = useState(false);
	const volumeRequestIdRef = useRef(0);
	const updateFlowRunIdRef = useRef(0);
	const updateFlowRunningRef = useRef(false);
	const isMountedRef = useRef(true);

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

	const logSettings = (event: string, payload?: unknown) => {
		if (payload === undefined) {
			console.log(SETTINGS_DEBUG_NAMESPACE, event);
			return;
		}
		console.log(SETTINGS_DEBUG_NAMESPACE, event, payload);
	};

	const logUpdateFlow = (event: string, payload?: unknown) => {
		if (payload === undefined) {
			console.log(UPDATE_DEBUG_NAMESPACE, event);
			return;
		}
		console.log(UPDATE_DEBUG_NAMESPACE, event, payload);
	};

	const showPageToast = (
		message: string,
		variant: 'success' | 'warning' = 'success'
	) => {
		logSettings('toast', { message, variant });
		setToastMessage(message);
		setToastVariant(variant);
		setShowToast(true);
	};

	const resetUpdateFlowState = () => {
		logUpdateFlow('reset_update_flow_state');
		setUpdatePhase('confirm');
		setUpdateErrorMessage('');
	};

	const closeUpdateModal = () => {
		if (updatePhase === 'running' || updateFlowRunningRef.current) {
			logUpdateFlow('close_update_modal_blocked', {
				updatePhase,
				updateFlowRunning: updateFlowRunningRef.current
			});
			return;
		}
		logUpdateFlow('close_update_modal');
		setShowUpdateModal(false);
		resetUpdateFlowState();
	};

	const openRebootConfirmFromUpdate = () => {
		if (
			updatePhase === 'running' ||
			updateFlowRunningRef.current ||
			updatePhase !== 'success'
		) {
			logUpdateFlow('open_reboot_confirm_from_update_blocked', {
				updatePhase,
				updateFlowRunning: updateFlowRunningRef.current
			});
			return;
		}
		logUpdateFlow('open_reboot_confirm_from_update');
		setShowUpdateModal(false);
		resetUpdateFlowState();
		setShowRebootConfirm(true);
	};

	useEffect(() => {
		let isActive = true;
		logSettings('init_volume_start');

		const initVolume = async () => {
			try {
				const response = await getSettingsVolume();
				const volumeValue =
					typeof response?.volume === 'number'
						? response.volume
						: Number(response?.volume);
				logSettings('init_volume_success', {
					response,
					normalizedVolume: volumeValue
				});
				setDeviceVolume(volumeValue);
			} catch (error) {
				logSettings('init_volume_error', error);
				if (isActive) {
					showPageToast('Не удалось получить текущую громкость', 'warning');
				}
			}
		};

		initVolume();

		return () => {
			logSettings('init_volume_cleanup');
			isActive = false;
		};
	}, []);

	useEffect(() => {
		isMountedRef.current = true;
		logUpdateFlow('mounted');
		return () => {
			logUpdateFlow('unmounted_cleanup_start', {
				updateFlowRunId: updateFlowRunIdRef.current
			});
			isMountedRef.current = false;
			updateFlowRunIdRef.current += 1;
			updateFlowRunningRef.current = false;
			logUpdateFlow('unmounted_cleanup_done', {
				updateFlowRunId: updateFlowRunIdRef.current
			});
		};
	}, []);

	useEffect(() => {
		logUpdateFlow('phase_changed', {
			phase: updatePhase,
			errorMessage: updateErrorMessage
		});
	}, [updatePhase, updateErrorMessage]);

	const settingsImportMutation = useMutation({
		mutationKey: ['settings.settings.import'],
		mutationFn: (file: File) => importSchoolSettingsFile(file),
		onMutate: () => logSettings('settings_import_start'),
		onSuccess: () => {
			logSettings('settings_import_success');
			showPageToast('Импорт настроек выполнен');
		},
		onError: (error) => {
			logSettings('settings_import_error', error);
			showPageToast('Не удалось импортировать настройки школы', 'warning');
		}
	});

	const settingsExportMutation = useMutation({
		mutationKey: ['settings.settings.export'],
		mutationFn: () => exportSchoolSettingsFile(schoolSettings),
		onMutate: () => logSettings('settings_export_start', { schoolSettings }),
		onSuccess: (fileBlob) => {
			logSettings('settings_export_success', {
				blobSize: fileBlob?.size
			});
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
		onError: (error) => {
			logSettings('settings_export_error', error);
			showPageToast('Не удалось экспортировать настройки школы', 'warning');
		}
	});

	const volumeMutation = useMutation({
		mutationKey: ['settings.volume.update'],
		mutationFn: (volume: number) => setSchoolVolume(volume),
		onMutate: (volume) => logSettings('volume_update_start', { volume }),
		onSuccess: (response, volume) =>
			logSettings('volume_update_success', { volume, response }),
		onError: (error, volume) => {
			logSettings('volume_update_error', { volume, error });
			showPageToast('Не удалось отправить значение громкости', 'warning');
		}
	});

	const netSettingsMutation = useMutation({
		mutationKey: ['settings.net_settings.save'],
		mutationFn: () => saveNetworkSettings(networkSettings),
		onMutate: () => logSettings('network_settings_save_start', { networkSettings }),
		onSuccess: (response) => {
			logSettings('network_settings_save_success', { response });
			showPageToast('Сетевые параметры сохранены');
		},
		onError: (error) => {
			logSettings('network_settings_save_error', error);
			showPageToast('Не удалось сохранить сетевые параметры', 'warning');
		}
	});

	const updateSoftwareMutation = useMutation({
		mutationKey: ['settings.update'],
		mutationFn: () => updateSchoolSoftware(),
		onMutate: () => logUpdateFlow('settings_update_request_start'),
		onSuccess: (response) =>
			logUpdateFlow('settings_update_request_success', { response }),
		onError: (error) => logUpdateFlow('settings_update_request_error', error)
	});

	const checkUpdatesMutation = useMutation({
		mutationKey: ['settings.check_updates'],
		mutationFn: () => checkSchoolUpdates(),
		onMutate: () => logUpdateFlow('check_updates_start'),
		onSuccess: (data) => {
			const status = String(data?.status ?? '').toLowerCase();
			const hasUpdates =
				data?.has_updates === true ||
				data?.backend_has_updates === true ||
				data?.frontend_has_updates === true;
			logUpdateFlow('check_updates_success', {
				rawData: data,
				normalizedStatus: status,
				hasUpdates
			});

			if (status === 'up_to_date') {
				logUpdateFlow('check_updates_result_up_to_date');
				showPageToast('У вас последняя версия');
				return;
			}

			if (status === 'updates_available' || hasUpdates) {
				logUpdateFlow('check_updates_result_updates_available');
				showPageToast('Доступны обновления', 'warning');
				resetUpdateFlowState();
				setShowUpdateModal(true);
				return;
			}

			logUpdateFlow('check_updates_result_unknown_status', { status, data });
			showPageToast('Не удалось определить статус обновлений', 'warning');
		},
		onError: (error) => {
			logUpdateFlow('check_updates_error', error);
			showPageToast('Не удалось запустить проверку обновлений', 'warning');
		}
	});

	const isCurrentUpdateRun = (runId: number) =>
		isMountedRef.current && runId === updateFlowRunIdRef.current;

	const sleep = (delayMs: number) =>
		new Promise((resolve) => window.setTimeout(resolve, delayMs));

	const waitForHealthReady = async (
		runId: number,
		timeoutMs = HEALTH_TIMEOUT_MS,
		intervalMs = HEALTH_POLL_INTERVAL_MS
	) => {
		const deadline = Date.now() + timeoutMs;
		let attemptsCount = 0;
		logUpdateFlow('health_polling_start', {
			runId,
			timeoutMs,
			intervalMs,
			deadline
		});

		while (Date.now() < deadline) {
			if (!isCurrentUpdateRun(runId)) {
				logUpdateFlow('health_polling_cancelled_stale_run', {
					runId,
					currentRunId: updateFlowRunIdRef.current
				});
				return false;
			}

			try {
				attemptsCount += 1;
				const perRequestTimeoutMs = Math.min(
					HEALTH_REQUEST_TIMEOUT_MS,
					Math.max(250, deadline - Date.now())
				);
				logUpdateFlow('health_polling_attempt_start', {
					runId,
					attempt: attemptsCount,
					perRequestTimeoutMs,
					remainingMs: deadline - Date.now()
				});
				await getSchoolHealth({ timeoutMs: perRequestTimeoutMs });
				logUpdateFlow('health_polling_attempt_success', {
					runId,
					attempt: attemptsCount
				});
				return true;
			} catch (error) {
				logUpdateFlow('health_polling_attempt_error', {
					runId,
					attempt: attemptsCount,
					error
				});
				// Во время перезапуска сервис может быть временно недоступен.
			}

			const remainingMs = deadline - Date.now();
			if (remainingMs <= 0) {
				logUpdateFlow('health_polling_deadline_reached', { runId, attemptsCount });
				break;
			}
			logUpdateFlow('health_polling_sleep', {
				runId,
				attemptsCount,
				sleepMs: Math.min(intervalMs, remainingMs),
				remainingMs
			});
			await sleep(Math.min(intervalMs, remainingMs));
		}

		logUpdateFlow('health_polling_timeout', { runId, attemptsCount });
		return false;
	};

	const normalizeUpdateResponse = (response: unknown) => {
		let normalizedResponse = response;

		if (typeof normalizedResponse === 'string') {
			try {
				normalizedResponse = JSON.parse(normalizedResponse);
				logUpdateFlow('normalize_update_response_from_string_success');
			} catch (error) {
				logUpdateFlow('normalize_update_response_from_string_error', error);
			}
		}

		if (
			normalizedResponse &&
			typeof normalizedResponse === 'object' &&
			'data' in normalizedResponse
		) {
			logUpdateFlow('normalize_update_response_unwrap_data_field');
			return normalizedResponse.data;
		}

		return normalizedResponse;
	};

	const getExplicitUpdateError = (response: any) => {
		const status = String(response?.status ?? '').toLowerCase();
		const hasFailedStatus =
			status === 'error' || status === 'failed' || status === 'failure';
		const hasFailedFlag =
			response?.ok === false || String(response?.ok).toLowerCase() === 'false';

		if (!hasFailedStatus && !hasFailedFlag) {
			logUpdateFlow('explicit_update_error_not_detected', {
				status,
				ok: response?.ok
			});
			return '';
		}

		const detailMessage =
			typeof response?.detail === 'string' ? response.detail.trim() : '';

		const fallbackMessage =
			detailMessage || 'Обновление не было применено. Попробуйте еще раз.';
		logUpdateFlow('explicit_update_error_detected', {
			status,
			ok: response?.ok,
			detailMessage,
			fallbackMessage
		});
		return fallbackMessage;
	};

	const startUpdateFlow = async () => {
		logUpdateFlow('start_update_flow_requested', {
			updatePhase,
			updateFlowRunning: updateFlowRunningRef.current
		});
		if (updateFlowRunningRef.current) {
			logUpdateFlow('start_update_flow_ignored_already_running');
			return;
		}
		updateFlowRunningRef.current = true;

		const runId = updateFlowRunIdRef.current + 1;
		updateFlowRunIdRef.current = runId;
		logUpdateFlow('start_update_flow_run_created', { runId });

		setUpdateErrorMessage('');
		setUpdatePhase('running');

		try {
			const updateResponse = await updateSoftwareMutation.mutateAsync();
			logUpdateFlow('start_update_flow_update_response_raw', {
				runId,
				updateResponse
			});

			if (!isCurrentUpdateRun(runId)) {
				logUpdateFlow('start_update_flow_stale_after_update_response', {
					runId,
					currentRunId: updateFlowRunIdRef.current
				});
				return;
			}

			const normalizedResponse = normalizeUpdateResponse(updateResponse);
			logUpdateFlow('start_update_flow_update_response_normalized', {
				runId,
				normalizedResponse
			});
			const explicitError = getExplicitUpdateError(normalizedResponse);
			if (explicitError) {
				logUpdateFlow('start_update_flow_explicit_update_error', {
					runId,
					explicitError
				});
				setUpdateErrorMessage(explicitError);
				setUpdatePhase('error');
				return;
			}

			const isHealthReady = await waitForHealthReady(runId);
			logUpdateFlow('start_update_flow_health_polling_result', {
				runId,
				isHealthReady
			});
			if (!isCurrentUpdateRun(runId)) {
				logUpdateFlow('start_update_flow_stale_after_health_polling', {
					runId,
					currentRunId: updateFlowRunIdRef.current
				});
				return;
			}

			if (!isHealthReady) {
				logUpdateFlow('start_update_flow_failed_health_timeout', { runId });
				setUpdateErrorMessage(
					'Система еще запускается, попробуйте проверить позже.'
				);
				setUpdatePhase('error');
				return;
			}

			logUpdateFlow('start_update_flow_success', { runId });
			setUpdatePhase('success');
		} catch (error) {
			logUpdateFlow('start_update_flow_exception', { runId, error });
			if (!isCurrentUpdateRun(runId)) {
				logUpdateFlow('start_update_flow_exception_for_stale_run', {
					runId,
					currentRunId: updateFlowRunIdRef.current
				});
				return;
			}
			setUpdateErrorMessage(
				'Не удалось установить обновление. Проверьте соединение и попробуйте снова.'
			);
			setUpdatePhase('error');
		} finally {
			if (isCurrentUpdateRun(runId)) {
				updateFlowRunningRef.current = false;
				logUpdateFlow('start_update_flow_finalized', {
					runId,
					updateFlowRunning: updateFlowRunningRef.current
				});
			} else {
				logUpdateFlow('start_update_flow_finalized_stale_run', {
					runId,
					currentRunId: updateFlowRunIdRef.current
				});
			}
		}
	};

	const rebootMutation = useMutation({
		mutationKey: ['settings.reboot'],
		mutationFn: () => rebootSchoolDevice(),
		onMutate: () => logSettings('reboot_request_start'),
		onSuccess: () => {
			logSettings('reboot_request_success');
			setShowRebootConfirm(false);
			showPageToast('Команда перезагрузки отправлена. Сервер может быть недоступен в течение нескольких минут.', 'warning');
		},
		onError: (error) => {
			logSettings('reboot_request_error', error);
			showPageToast('Не удалось отправить команду перезагрузки', 'warning');
		}
	});

	const handleVolumeChange = (value: number) => {
		logSettings('volume_slider_change', { value });
		setDeviceVolume(value);
		const requestId = ++volumeRequestIdRef.current;
		setIsUpdatingVolume(true);
		volumeMutation.mutate(value, {
			onSettled: () => {
				logSettings('volume_slider_settled', {
					value,
					requestId,
					currentRequestId: volumeRequestIdRef.current
				});
				if (requestId === volumeRequestIdRef.current) {
					setIsUpdatingVolume(false);
				}
			}
		});
	};

	const updateNetworkField = (field: string, value: string) =>
		setNetworkSettings((prev) => ({ ...prev, [field]: value }));

	const handleCheckUpdatesClick = () => {
		logUpdateFlow('ui_click_check_updates', {
			isPending: checkUpdatesMutation.isPending
		});
		checkUpdatesMutation.mutate();
	};

	const handleOpenRebootConfirm = () => {
		logSettings('ui_open_reboot_confirm');
		setShowRebootConfirm(true);
	};

	const handleCloseRebootConfirm = () => {
		logSettings('ui_close_reboot_confirm');
		setShowRebootConfirm(false);
	};

	const handleConfirmReboot = () => {
		logSettings('ui_confirm_reboot_click', {
			isPending: rebootMutation.isPending
		});
		rebootMutation.mutate();
	};

	const handleSaveNetworkSettings = () => {
		logSettings('ui_save_network_settings_click', { networkSettings });
		netSettingsMutation.mutate();
	};

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
										onClick={handleCheckUpdatesClick}
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
										onClick={handleOpenRebootConfirm}
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
								onClick={handleSaveNetworkSettings}
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

				<Modal show={showRebootConfirm} onHide={handleCloseRebootConfirm}>
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
							onClick={handleCloseRebootConfirm}
							disabled={rebootMutation.isPending}
						>
						Отмена
					</Button>
						<Button
							variant='danger'
							onClick={handleConfirmReboot}
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
			<UpdateSoftwareModal
				show={showUpdateModal}
				phase={updatePhase}
				errorMessage={updateErrorMessage}
				onClose={closeUpdateModal}
				onConfirm={startUpdateFlow}
				onRetry={startUpdateFlow}
				onRequestReboot={openRebootConfirmFromUpdate}
			/>
		</PageLayout>
	);
};

export default SettingsPage;
