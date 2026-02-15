import api, { HTTP_BASE_URL } from '@/api';

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

export const checkSchoolUpdates = async () =>
	(await api.post('settings/check_updates')).data;

export const rebootSchoolDevice = async () =>
	(await api.post('settings/reboot')).data;
