import { formatDate } from '@/utils';
import api from '@/api';

export type ScheduleAssignmentInfo = {
	start_date: string;
	monday: number | null;
	tuesday: number | null;
	wednesday: number | null;
	thursday: number | null;
	friday: number | null;
	saturday: number | null;
	sunday: number | null;
};

export const getAssignmentsByDateRange = async (
	start: Date | string,
	end: Date | string
) => {
	start = typeof start === 'string' ? start : formatDate(start);
	end = typeof end === 'string' ? end : formatDate(end);
	return (
		await api.get<ScheduleAssignmentInfo[]>(
			`school/assignments/query?start_date=${encodeURIComponent(
				start
			)}&end_date=${encodeURIComponent(end)}`
		)
	).data;
};
