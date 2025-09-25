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

	// СКРИПТ МОМЕНТ
	let firstDayAssignment: ScheduleAssignmentInfo | null = null;
	if (startDay !== null) {
		const dayForTime = startDay;
		firstDayAssignment =
			assignmentsByDay && assignmentsByDay[dayForTime]
				? assignmentsByDay[dayForTime]
				: activeAssignment;
	}
	console.log(firstDayAssignment);
	return (
		<div className='mx-auto max-w-[1000rem] w-fit p-6'>
			<H1>Календарь</H1>
			<div className='flex gap-4'>
				<div className='flex flex-col w-[22rem] items-center'>
					{/* Calendar */}
					<Panel>
						<Panel.Header className='flex px-4 py-2'>
							<H2 className='m-auto flex items-center gap-3'>
								<button
									className='ring-[0.15rem] ring-transparent rounded-sm hover:ring-slate-500'
									onClick={() => switchPrevMonth()}
								>
									<CaretLeftFill />
								</button>
								<button className='min-w-36 underline-offset-4 hover:underline'>
									{monthNames[monthIndex]} {year}
								</button>
								<button
									className='ring-[0.15rem] ring-transparent rounded-sm hover:ring-slate-500'
									onClick={() => switchNextMonth()}
								>
									<CaretRightFill />
								</button>
							</H2>
						</Panel.Header>

						<Panel.Body className='p-3 flex flex-col gap-1'>
							<div className='m-auto'>
								<div className='grid grid-cols-7 text-center font-bold'>
									{weekdayNames.map((day) => (
										<div key={day}>{day}</div>
									))}
								</div>

								<div className='grid grid-cols-7 select-none text-center gap-[0.2rem]'>
									{[...Array(weekdayNormalMap[monthStart.getDay()])].map(
										(_, i) => (
											<div />
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
													'w-10 relative h-10 flex rounded-xl cursor-pointer items-center text-lg',
													isSelected
														? ' bg-blue-100 text-blue-900 shadow-md' +
																(endDay === null
																	? 'ring-4 ring-blue-300'
																	: day === startDay
																	? ' rounded-l-xl ring-l-4 ring-blue-300'
																	: day === endDay
																	? ' rounded-r-xl ring-r-4 ring-blue-300'
																	: 'bg-blue-100')
														: ' hover:bg-gray-100'
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
														'm-auto',
														monthIndex === today.getMonth() &&
															day === today.getDate() &&
															'text-blue-600 font-bold'
													)}
												>
													{day}
												</span>
												<div className='absolute flex right-1 bottom-[0.25rem] text-[0.6rem]'>
													{overrides && (
														<BellSlashFill
															className={
																overrides.mute_all_lessons
																	? 'text-red-600'
																	: 'text-gray-600'
															}
														/>
													)}
													{assignment && (
														<ClockFill className='text-sky-500 ' />
													)}
												</div>
											</div>
										);
									})}
								</div>
							</div>
						</Panel.Body>
						<div className='p-3 border-t-2'>
							<Note className='flex flex-col gap-2'>
								<div>
									<p>Выберите день или диапазон для внесения изменений.</p>
									<p>• Клик — выбрать день</p>
									<p>• Удерживать — выбрать диапазон</p>
								</div>
								<hr />
								<div>
									<p className='font-semibold mb-2'>Легенда:</p>
									<p>
										• <ClockFill className='inline text-blue-400' /> — новое
										расписание
									</p>
									<p>
										• <BellSlashFill className='inline text-red-400' /> —
										выключены все звонки
									</p>
									<p>
										• <BellSlashFill className='inline text-gray-600' /> —
										выключен отдельный звонок
									</p>
								</div>
							</Note>
						</div>
					</Panel>
				</div>
				{/* Right panel */}
				<div className='flex flex-col gap-3'>
					<Panel>
						<Panel.Header className='p-2'>
							<H2 className='flex'>
								<Form.Check
									type='switch'
									disabled={overridesByDay === null}
									className='my-auto'
									onChange={(e) =>
										overridesMutation.mutate({
											muteAllLessons: !e.target.checked,
											muteLessons: Array.from(muteLessons)
										})
									}
									checked={!muteAllLessons}
								/>
								{muteAllLessons ? 'Звонки' : 'Звонки'}
							</H2>
						</Panel.Header>
						<Panel.Body className='p-3 flex flex-col gap-1'>
							<p className='font-medium text-gray-700 mb-1'>Отдельные уроки:</p>
							{/* <hr className='my-2 px-1' /> */}
							{[0, 1, 2, 3, 4].map((lessonNum, idx) => (
								<div key={idx} className='flex items-center gap-2'>
									<span className='text-base'>{idx + 1}</span>
									<Form.Check
										type='switch'
										disabled={overridesByDay === null}
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
						</Panel.Body>

						{/* <div className='border-t p-3'>
							<p className='text-sm'>8:30 - 12:00 (Время мута)</p>
						</div> */}
						{startDay === null && (
							<div className='absolute flex p-4 w-full h-full top-0 left-0 bg-black/10'>
								<span className='m-auto text-center text-slate-500 bg-white rounded p-1'>
									Выберите день или диапазон
								</span>
							</div>
						)}
					</Panel>

					<Panel className=''>
						<Panel.Header className='p-2'>
							<H2 className='flex'>
								<Form.Check
									type='switch'
									disabled={assignmentsQuery.isFetching}
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
								Новое расписание
							</H2>
						</Panel.Header>
						<Panel.Body className='p-3 flex flex-col gap-1'>
							{weekdayNames.map((day, i) => {
								const weekdayName = weekdayApiNames[i];
								const scheduleId = displayAssignment
									? displayAssignment[weekdayApiNames[i]]
									: null;
								const schedule =
									scheduleId && schedulesById
										? schedulesById[scheduleId] || null
										: null;
								return (
									<div key={i} className='flex items-center'>
										<span>{day}</span>
										<Typeahead
											className='w-40 h-8 ml-auto'
											emptyLabel='не найдено'
											positionFixed
											disabled={currentAssignment === null}
											selected={schedule ? [schedule] : []}
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
						</Panel.Body>
						{(startDay !== null && endDay === null) || (
							<div className='absolute flex p-4 w-full h-full top-0 left-0 bg-black/10'>
								<span className='m-auto text-slate-500 bg-white rounded p-1'>
									Выберите один день
								</span>
							</div>
						)}
					</Panel>
				</div>
			</div>
		</div>
	);
};

export default CalendarPage;
