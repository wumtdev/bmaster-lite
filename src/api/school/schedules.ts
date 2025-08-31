import api from '@/api';

export type ScheduleLesson = {
	start_at: string;
	start_sound: string;
	end_at: string;
	end_sound: string;
};

export type ScheduleInfo = {
	id: number;
	name: string;
	lessons: ScheduleLesson[];
};

export const getSchedules = async (): Promise<ScheduleInfo[]> =>
	(await api.get<ScheduleInfo[]>('school/schedules')).data;
