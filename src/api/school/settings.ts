import api, { HTTP_BASE_URL } from '@/api';

const SETTINGS_API_DEBUG_NAMESPACE = '[settings/api]';

const logSettingsApi = (event: string, payload?: unknown) => {
	if (payload === undefined) {
		console.log(SETTINGS_API_DEBUG_NAMESPACE, event);
		return;
	}
	console.log(SETTINGS_API_DEBUG_NAMESPACE, event, payload);
};

export type SchoolSettingsExportOptions = {
	schedules: boolean;
	assignments: boolean;
	overrides: boolean;
};

export type NetworkSettingsPayload = {
	ip: string;
	mask: string;
	gateway: string;
	dns: string;
};

const toBooleanParam = (value: boolean) => (value ? 'true' : 'false');

export const getSchoolSettingsExportUrl = (
	options: SchoolSettingsExportOptions
) => {
	const params = new URLSearchParams({
		schedules: toBooleanParam(options.schedules),
		assignments: toBooleanParam(options.assignments),
		overrides: toBooleanParam(options.overrides)
	});

	return `${HTTP_BASE_URL}/api/settings/settings?${params.toString()}`;
};

export const importSchoolSettingsFile = async (file: File) => {
	const form = new FormData();
	form.append('file', file);
	return (await api.post('settings/settings', form)).data;
};

export const exportSchoolSettingsFile = async (
	options: SchoolSettingsExportOptions
) =>
	(
		await api.get('settings/settings', {
			params: {
				schedules: options.schedules,
				assignments: options.assignments,
				overrides: options.overrides
			},
			responseType: 'blob'
		})
	).data as Blob;

export const setSchoolVolume = async (volume: number) =>
	(await api.put('settings/volume', { volume })).data;

export type SettingsVolumeResponse = {
	ok: boolean;
	volume: number;
};

export const getSettingsVolume = async () =>
	(await api.get('settings/volume')).data;

export const saveNetworkSettings = async (payload: NetworkSettingsPayload) => {
	const form = new FormData();
	form.append('ip', payload.ip);
	form.append('mask', payload.mask);
	form.append('gateway', payload.gateway);
	form.append('dns', payload.dns);
	return (await api.post('settings/net_settings', form)).data;
};

export const checkSchoolUpdates = async () => {
	logSettingsApi('check_updates_start');
	try {
		const response = (
			await api.get<CheckSchoolUpdatesResponse>('settings/check_updates')
		).data;
		logSettingsApi('check_updates_success', response);
		return response;
	} catch (error) {
		logSettingsApi('check_updates_error', error);
		throw error;
	}
};

export type CheckSchoolUpdatesResponse = {
	status?: string;
	has_updates?: boolean;
	backend_has_updates?: boolean;
	frontend_has_updates?: boolean;
};

export type UpdateSchoolSoftwareResponse = {
	ok?: boolean;
	status?: string;
	detail?: string;
};

export const updateSchoolSoftware = async () => {
	logSettingsApi('update_start');
	try {
		const response = (await api.post<UpdateSchoolSoftwareResponse>('settings/update'))
			.data;
		logSettingsApi('update_success', response);
		return response;
	} catch (error) {
		logSettingsApi('update_error', error);
		throw error;
	}
};

export type SchoolHealthResponse = {
	ok?: boolean;
};

export type SchoolHealthOptions = {
	timeoutMs?: number;
};

export const getSchoolHealth = async (options?: SchoolHealthOptions) => {
	logSettingsApi('health_start', options);
	try {
		const response = (
			await api.get<SchoolHealthResponse>('health', {
				timeout: options?.timeoutMs
			})
		).data;
		logSettingsApi('health_success', response);
		return response;
	} catch (error) {
		logSettingsApi('health_error', {
			options,
			error
		});
		throw error;
	}
};

export const rebootSchoolDevice = async () => {
	logSettingsApi('reboot_start');
	try {
		const response = (await api.post('settings/reboot')).data;
		logSettingsApi('reboot_success', response);
		return response;
	} catch (error) {
		logSettingsApi('reboot_error', error);
		throw error;
	}
};
