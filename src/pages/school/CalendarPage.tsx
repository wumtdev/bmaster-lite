import { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'tailwindcss/tailwind.css';
import { H1, H2, Note } from '@/components/text';
import { Form } from 'react-bootstrap';
import Panel from '@/components/Panel';
import { Typeahead } from 'react-bootstrap-typeahead';
import {
	BellSlashFill,
	CaretLeftFill,
	CaretRightFill,
	ClockFill
} from 'react-bootstrap-icons';
import { cn, fromDateFormat, formatDate } from '@/utils';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
	updateAssignment,
	createAssignment,
	deleteAssignment,
	getAssignmentsByDateRange,
	ScheduleAssignmentInfo,
	getActiveAssignment,
	ScheduleWeekdays
} from '@/api/school/assignments';
import {
	createOverride,
	getOverridesByDateRange,
	ScheduleOverrideInfo
} from '@/api/school/overrides';
import { getSchedules, ScheduleInfo } from '@/api/school/schedules';

const CalendarPage = () => {
	const queryClient = useQueryClient();

	const today = new Date();

	const [dayA, setDayA] = useState<number | null>(today.getDate());
	const [dayB, setDayB] = useState<number | null>(null);

	let startDay: number | null = null;
	let endDay: number | null = null;
	if (dayA !== null) {
		if (dayB !== null) {
			if (dayB > dayA) {
				startDay = dayA;
				endDay = dayB;
			} else {
				startDay = dayB;
				endDay = dayA;
			}
		} else startDay = dayA;
	}

	const [monthIndex, setMonthIndex] = useState<number>(today.getMonth());
	const [year, setYear] = useState<number>(today.getFullYear());
	const [ringStates, setRingStates] = useState([true, false, false, false]);
	const [brushing, setBrushing] = useState<boolean>(false);

	const startDate: Date | null =
		startDay !== null ? new Date(year, monthIndex, startDay) : null;
	const endDate: Date | null =
		endDay !== null ? new Date(year, monthIndex, endDay) : null;

	const toggleRing = (index: number) => {
		const newStates = [...ringStates];
		newStates[index] = !newStates[index];
		setRingStates(newStates);
	};

	const weekdayNames = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
	const weekdayNormalMap = {
		0: 6,
		1: 0,
		2: 1,
		3: 2,
		4: 3,
		5: 4,
		6: 5
	};
	const weekdayApiNames = [
		'monday',
		'tuesday',
		'wednesday',
		'thursday',
		'friday',
		'saturday',
		'sunday'
	];
	const monthNames = [
		'Январь',
		'Февраль',
		'Март',
		'Апрель',
		'Май',
		'Июнь',
		'Июль',
		'Август',
		'Сентябрь',
		'Октябрь',
		'Ноябрь',
		'Декабрь'
	];

	const monthStart = new Date(year, monthIndex, 1);
	const monthEnd = new Date(year, monthIndex + 1, 0);
	const monthDayCount = monthEnd.getDate();

	const schedulesQuery = useQuery({
		queryFn: () => getSchedules(),
		queryKey: ['school.schedules']
	});

	let schedulesById: Record<string, any> | null = null;
	if (schedulesQuery.isFetched && schedulesQuery.data) {
		schedulesById = {};
		schedulesQuery.data.forEach((schedule: any) => {
			schedulesById[schedule.id] = schedule;
		});
	}

	const assignmentsQuery = useQuery({
		queryKey: ['school.assignments.month', year, monthIndex],
		queryFn: () => getAssignmentsByDateRange(monthStart, monthEnd)
	});

	const prevAssignment = useQuery({
		queryKey: ['school.assignments.prev', year, monthIndex],
		queryFn: () => getActiveAssignment(formatDate(monthStart))
	});

	let assignmentsByDay: Record<number, ScheduleAssignmentInfo> | null = null;
	let activeAssignment = prevAssignment.data;
	if (assignmentsQuery.isFetched && assignmentsQuery.data) {
		assignmentsByDay = {};
		assignmentsQuery.data.forEach((assignment: ScheduleAssignmentInfo) => {
			const day = fromDateFormat(assignment.start_date).getDate();
			assignmentsByDay[day] = assignment;
			if (day <= dayA) activeAssignment = assignment;
		});
	}

	const currentAssignment =
		assignmentsByDay !== null ? assignmentsByDay[dayA] || null : null;

	const assignmentsMutation = useMutation({
		mutationKey: ['school.assignments.month', year, monthIndex],
		mutationFn: (weekdays: ScheduleWeekdays) => {
			if (weekdays !== null)
				if (currentAssignment !== null)
					return updateAssignment(currentAssignment.id, weekdays);
				else
					return createAssignment({
						start_date: formatDate(startDate),
						...weekdays
					});
			else return deleteAssignment(currentAssignment.id);
		},
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: ['school.assignments.month', year, monthIndex]
			})
	});

	const overridesQuery = useQuery({
		queryKey: ['school.overrides.month', year, monthIndex],
		queryFn: () => getOverridesByDateRange(monthStart, monthEnd)
	});

	const overridesMutation = useMutation({
		mutationKey: ['school.overrides.month', year, monthIndex],
		mutationFn: ({
			muteAllLessons,
			muteLessons
		}: {
			muteAllLessons: boolean;
			muteLessons: number[];
		}) =>
			createOverride(
				{
					at: formatDate(startDate),
					mute_all_lessons: muteAllLessons,
					mute_lessons: muteLessons
				},
				endDate !== null ? formatDate(endDate) : undefined
			),
		onSuccess: () =>
			queryClient.invalidateQueries({
				queryKey: ['school.overrides.month', year, monthIndex]
			})
	});

	let overridesByDay: Record<number, ScheduleOverrideInfo> | null = null;
	if (overridesQuery.isFetched && overridesQuery.data) {
		overridesByDay = {};
		overridesQuery.data.forEach((override: any) => {
			overridesByDay[fromDateFormat(override.at).getDate()] = override;
		});
	}

	const switchNextMonth = () => {
		if (monthIndex >= 11) {
			setMonthIndex(0);
			setYear(year + 1);
		} else setMonthIndex(monthIndex + 1);
	};

	const switchPrevMonth = () => {
		if (monthIndex <= 0) {
			setMonthIndex(11);
			setYear(year - 1);
		} else setMonthIndex(monthIndex - 1);
	};

	// Reset day selection after month change
	useEffect(() => {
		setDayA(
			monthIndex === today.getMonth() && year === today.getFullYear()
				? today.getDate()
				: null
		);
		setDayB(null);
	}, [monthIndex, year]);

	useEffect(() => {
		const listener = () => setBrushing(false);
		if (brushing) window.addEventListener('mouseup', listener);
		return () => window.removeEventListener('mouseup', listener);
	}, [brushing]);

	useEffect(
		() => console.log(activeAssignment),
		[assignmentsByDay, overridesByDay, schedulesById, schedulesQuery.data]
	);

	// const moveMonth = (offset: number) => {
	// 	const newMonth = month + offset;
	// 	if (newMonth > 12) {
	// 		setYear(year + 1);
	// 		setMonth(newMonth % 12);
	// 	} else if (newMonth < 0) {
	// 		setYear(year - 1);
	// 		setMonth(newMonth + 12)
	// 	}
	// }

	let muteAllLessons = false;
	let muteLessons = new Set<number>();
	if (overridesByDay) {
		Object.entries(overridesByDay).forEach(
			// @ts-ignore TODO: convert number
			([day, override]: [number, ScheduleOverrideInfo]) => {
				if (
					day == startDay ||
					(endDay !== null && day >= startDay && day <= endDay)
				) {
					if (override.mute_all_lessons) muteAllLessons = true;
					for (const mutedLesson of override.mute_lessons) {
						muteLessons.add(mutedLesson);
					}
				}
			}
		);
	}

	const displayAssignment = currentAssignment || activeAssignment;

	return (
		<div className='container mx-auto p-6 scale-90 origin-top'>
			<H1 className='text-left'>Календарь</H1>
			<div className='flex gap-6 justify-center items-start'>
				{/* Left panel */}
				<div className='flex flex-col items-center max-w-2xl'>
					{/* Calendar */}
					<div className='w-full rounded-xl p-6'>
						<Panel className='w-full'>
							<Panel.Header className='px-6 py-4 border-b'>
								<H2 className='flex items-center justify-center gap-4'>
									<button
										className='p-2 rounded-lg hover:bg-gray-100 transition-colors'
										onClick={() => switchPrevMonth()}
									>
										<CaretLeftFill size={20} />
									</button>
									<button className='text-2xl font-semibold min-w-48 hover:text-blue-600 transition-colors'>
										{monthNames[monthIndex]} {year}
									</button>
									<button
										className='p-2 rounded-lg hover:bg-gray-100 transition-colors'
										onClick={() => switchNextMonth()}
									>
										<CaretRightFill size={20} />
									</button>
								</H2>
							</Panel.Header>

							<Panel.Body className='p-6'>
								<div className='grid grid-cols-7 text-center font-bold mb-4 text-lg'>
									{weekdayNames.map((day) => (
										<div key={day} className='py-2 font-bold'>
											{day}
										</div>
									))}
								</div>

								<div className='grid grid-cols-7 select-none text-center gap-3'>
									{[...Array(weekdayNormalMap[monthStart.getDay()])].map(
										(_, i) => (
											<div key={`empty-${i}`} />
										)
									)}
									{[...Array(monthDayCount)].map((_, i) => {
										const day = i + 1;
										const isSelected =
											startDay === day ||
											(endDay !== null
												? day >= startDay && day <= endDay
												: false);
										const overrides =
											overridesByDay !== null ? overridesByDay[day] : null;
										const assignment =
											assignmentsByDay !== null ? assignmentsByDay[day] : null;
										return (
											<div
												key={day}
												className={cn(
													'relative flex cursor-pointer aspect-square',
													'items-center justify-center rounded-xl transition-all duration-200',
													'min-h-[60px] text-lg font-medium',
													isSelected
														? 'bg-blue-100 text-blue-900 shadow-md' +
																(endDay === null
																	? ' ring-4 ring-blue-300'
																	: day === startDay
																	? ' rounded-l-xl ring-l-4 ring-blue-300'
																	: day === endDay
																	? ' rounded-r-xl ring-r-4 ring-blue-300'
																	: 'bg-blue-100')
														: ' hover:bg-gray-100 hover:scale-105 transform'
												)}
												onMouseDown={(e) => {
													if (e.shiftKey) {
														if (day !== dayA) setDayB(day);
													} else {
														setDayA(day);
														setDayB(null);
														setBrushing(true);
													}
												}}
												onMouseMove={() => {
													if (brushing && day !== dayA && day !== dayB)
														setDayB(day);
												}}
											>
												<span
													className={cn(
														'flex items-center justify-center w-12 h-12',
														monthIndex === today.getMonth() &&
															day === today.getDate()
															? 'text-blue-600 font-bold'
															: ''
													)}
												>
													{day}
												</span>

												<div className='absolute flex right-2 bottom-2 gap-1'>
													{overrides && (
														<BellSlashFill
															size={16}
															className={
																overrides.mute_all_lessons
																	? 'text-red-500'
																	: 'text-gray-500'
															}
														/>
													)}
													{assignment && (
														<ClockFill size={16} className='text-blue-500' />
													)}
												</div>
											</div>
										);
									})}
								</div>
							</Panel.Body>
						</Panel>
					</div>

					<Note className='w-full mt-4 p-4 text-base bg-gray-50 rounded-l shadow-sm'>
						<div className='space-y-2'>
							<p>Выберите день или диапазон для внесения изменений.</p>
							<p>• Клик — выбрать день</p>
							<p>• Удерживать Shift — выбрать диапазон</p>
							<div className='mt-3 pt-3 border-t'>
								<p className='font-semibold mb-2'>Легенда:</p>
								<p>• 📅 — новое расписание</p>
								<p>• 🔕 — выключены все звонки</p>
								<p>• ⏰ — выключен отдельный звонок</p>
							</div>
						</div>
					</Note>
				</div>

				{/* Right panel */}
				<div className='flex flex-col gap-4 w-96'>
					<Panel className='w-full bg-white rounded-xl shadow-lg'>
						<Panel.Header className='py-4 px-6 border-b'>
							<H2 className='flex items-center gap-4 text-xl'>
								<Form.Check
									type='switch'
									disabled={overridesByDay === null}
									className='scale-125'
									onChange={(e) =>
										overridesMutation.mutate({
											muteAllLessons: !e.target.checked,
											muteLessons: Array.from(muteLessons)
										})
									}
									checked={!muteAllLessons}
								/>
								<span>Все звонки</span>
							</H2>
						</Panel.Header>
						<Panel.Body className='p-6 space-y-2'>
							<div className='space-y-2'>
								<p className='font-medium text-gray-700'>Отдельные уроки:</p>
								{[0, 1, 2, 3, 4, 5, 6].map((lessonNum, idx) => (
									<div key={idx} className='flex items-center gap-4 py-2'>
										<span className='text-base'>{idx + 1}</span>
										<Form.Check
											type='switch'
											disabled={overridesByDay === null}
											className='scale-110'
											onChange={(e) => {
												const newMuteLessons = new Set(muteLessons);

												if (!e.target.checked) newMuteLessons.add(lessonNum);
												else newMuteLessons.delete(lessonNum);

												overridesMutation.mutate({
													muteAllLessons,
													muteLessons: Array.from(newMuteLessons)
												});
											}}
											checked={!muteLessons.has(lessonNum)}
										/>
										<span className='text-lg'>8:30 - 9:15</span>
									</div>
								))}
							</div>

							{startDay === null && (
								<div className='absolute inset-4 bg-white/90 flex items-center justify-center rounded-lg backdrop-blur-sm'>
									<span className='text-center text-gray-600 bg-white rounded-lg p-4 shadow-lg border'>
										Выберите день или диапазон
									</span>
								</div>
							)}
						</Panel.Body>
					</Panel>

					<Panel className='w-full bg-white rounded-xl shadow-lg'>
						<Panel.Header className='py-4 px-6 border-b'>
							<H2 className='flex items-center gap-4 text-xl'>
								<Form.Check
									type='switch'
									disabled={assignmentsQuery.isFetching}
									className='scale-125'
									onChange={(e) => {
										if (e.target.checked)
											assignmentsMutation.mutate({
												monday: activeAssignment?.monday,
												tuesday: activeAssignment?.tuesday,
												wednesday: activeAssignment?.wednesday,
												thursday: activeAssignment?.thursday,
												friday: activeAssignment?.friday,
												saturday: activeAssignment?.saturday,
												sunday: activeAssignment?.sunday
											});
										else assignmentsMutation.mutate(null);
									}}
									checked={currentAssignment !== null}
								/>
								<span>Расписание уроков</span>
							</H2>
						</Panel.Header>
						<Panel.Body className='p-6 space-y-4'>
							<div className='space-y-3'>
								{weekdayNames.map((day, i) => {
									const weekdayName = weekdayApiNames[i];
									return (
										<div key={i} className='flex items-center py-0.5'>
											<span className='text-base font-medium w-24 flex-shrink-0'>
												{day}
											</span>
											<Typeahead
												className='flex-1'
												emptyLabel='Расписание не найдено'
												positionFixed
												disabled={currentAssignment === null}
												selected={
													(displayAssignment &&
														schedulesById &&
														displayAssignment[weekdayApiNames[i]] && [
															schedulesById[
																displayAssignment[weekdayApiNames[i]]
															]
														]) ||
													[]
												}
												onChange={(selected) => {
													console.log(selected);
													// @ts-ignore
													const val: ScheduleInfo | undefined = selected[0];
													console.log(val);
													const weekdays = {
														monday: currentAssignment?.monday,
														tuesday: currentAssignment?.tuesday,
														wednesday: currentAssignment?.wednesday,
														thursday: currentAssignment?.thursday,
														friday: currentAssignment?.friday,
														saturday: currentAssignment?.saturday,
														sunday: currentAssignment?.sunday
													};
													weekdays[weekdayName] = val ? val.id : null;
													assignmentsMutation.mutate(weekdays);
												}}
												options={schedulesQuery.data || []}
												labelKey='name'
												placeholder='Без расписания'
											/>
										</div>
									);
								})}
							</div>

							{(startDay !== null && endDay === null) || (
								<div className='absolute inset-4 bg-white/90 flex items-center justify-center rounded-lg backdrop-blur-sm'>
									<span className='text-center text-gray-600 bg-white rounded-lg p-4 shadow-lg border'>
										Выберите один день
									</span>
								</div>
							)}
						</Panel.Body>
					</Panel>
				</div>
			</div>
		</div>
	);
};

export default CalendarPage;
