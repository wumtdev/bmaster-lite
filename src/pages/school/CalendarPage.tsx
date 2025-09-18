// @ts-nocheck
import { useEffect, useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'tailwindcss/tailwind.css';
import { H1, H2, Note } from '@/components/text';
import {
	Card,
	Form,
	Spinner,
	OverlayTrigger,
	Tooltip,
	Button
} from 'react-bootstrap';
import Panel from '@/components/Panel';
import { Typeahead } from 'react-bootstrap-typeahead';
import {
	CaretLeftFill,
	CaretLeftSquare,
	CaretRightFill,
	CaretRightSquare
} from 'react-bootstrap-icons';
import { getMonthDayCount, cn, fromDateFormat } from '@/utils';
import { useQuery } from '@tanstack/react-query';
import {
	getAssignmentsByDateRange,
	ScheduleAssignmentInfo
} from '@/api/school/assignments';
import {
	getOverridesByDateRange,
	ScheduleOverrideInfo
} from '@/api/school/overrides';

const CalendarPage = () => {
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

	const toggleRing = (index: number) => {
		const newStates = [...ringStates];
		newStates[index] = !newStates[index];
		setRingStates(newStates);
	};

	const weekdayNames = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
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

	let assignmentsByDay: Record<number, ScheduleAssignmentInfo> | null = null;
	if (assignmentsQuery.isFetched && assignmentsQuery.data) {
		assignmentsByDay = {};
		assignmentsQuery.data.forEach((assignment: ScheduleAssignmentInfo) => {
			assignmentsByDay[fromDateFormat(assignment.start_date).getDate()] =
				assignment;
		});
	}

	const currentAssignment =
		assignmentsByDay !== null ? assignmentsByDay[dayA] || null : null;

	const overridesQuery = useQuery({
		queryKey: ['school.overrides.month', year, monthIndex],
		queryFn: () => getOverridesByDateRange(monthStart, monthEnd)
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
		() =>
			console.log(
				assignmentsByDay,
				overridesByDay,
				schedulesById,
				schedulesQuery.data
			),
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

	return (
		<div className='mx-auto max-w-7xl w-fit p-6'>
			<H1>Календарь</H1>
			<div className='flex gap-4'>
				{/* Calendar */}
				<Panel className='mb-auto'>
					{/* <div className='flex justify-between items-center mb-2'>
						<span className='fw-bold'>Сентябрь 2025</span>
					</div> */}
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
						<div className='grid grid-cols-7 text-center font-bold'>
							{weekdayNames.map((day) => (
								<div key={day}>{day}</div>
							))}
						</div>

						<div className='grid grid-cols-7 select-none text-center gap-[0.2rem]'>
							{[...Array(monthDayCount)].map((_, i) => {
								const day = i + 1;
								const isSelected =
									startDay === day ||
									(endDay !== null ? day >= startDay && day <= endDay : false);
								return (
									<div
										key={day}
										className={
											'w-10 h-10 flex cursor-pointer' +
											(isSelected
												? ' bg-red-200' +
												  (endDay === null
														? ' rounded-lg'
														: day === startDay
														? ' rounded-l-lg'
														: day === endDay
														? ' rounded-r-lg'
														: '')
												: ' hover:bg-gray-200 rounded-lg')
										}
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
										<span className='m-auto'>{day}</span>
									</div>
								);
							})}
						</div>
					</Panel.Body>
				</Panel>

				{/* Right panel */}
				<div className='flex flex-col gap-3'>
					<Panel>
						<Panel.Header className='p-2 bg-gray-50'>
							<H2 className='flex'>
								<Form.Check
									type='switch'
									disabled={false}
									className='my-auto'
									// onChange={(e) => switchEnabled.mutate(e.target.checked)}
									// checked={false}
								/>
								Звонки
							</H2>
						</Panel.Header>
						<Panel.Body className='bg-white p-3 flex flex-col gap-1'>
							<div className='flex items-center text-lg'>
								<Form.Check
									type='switch'
									disabled={false}
									className='my-auto'
									// onChange={(e) => switchEnabled.mutate(e.target.checked)}
									// checked={false}
								/>
								<span>Все</span>
							</div>
							<hr className='my-2 px-1' />
							{[0, 1, 2, 3].map((ring, idx) => (
								<div key={idx} className='flex gap-1'>
									<Form.Check
										type='switch'
										disabled={false}
										// onChange={(e) => switchEnabled.mutate(e.target.checked)}
										checked={false}
									/>
									<span className='mr-3'>{idx + 1}</span>
									<span>
										{idx === 0
											? '8:30 - 9:15'
											: idx === 1
											? '--'
											: idx === 2
											? '--'
											: '--'}
									</span>
								</div>
							))}
						</Panel.Body>

						<div className='border-t p-3 bg-gray-50'>
							<p className='text-sm'>8:30 - 12:00 (Время мута)</p>
						</div>
					</Panel>

					<Panel className=''>
						<Panel.Header className='p-2'>
							<H2 className='flex gap-1'>
								<Form.Check
									type='switch'
									disabled={false}
									// onChange={(e) => switchEnabled.mutate(e.target.checked)}
									checked={currentAssignment !== null}
								/>
								Новое расписание
							</H2>
							{/* <button className='btn btn-warning w-100'>
								Новое расписание
							</button> */}
						</Panel.Header>
						<Panel.Body className='p-3 flex flex-col gap-1'>
							{weekdayNames.map((day, i) => (
								<div key={i} className='flex items-center'>
									<span>{day}</span>
									<Typeahead
										className='w-40 h-8 ml-auto'
										emptyLabel='не найдено'
										disabled={currentAssignment === null}
										selected={
											schedulesById &&
											currentAssignment &&
											currentAssignment[weekdayApiNames[i]]
												? [
														schedulesById[currentAssignment[weekdayApiNames[i]]]
															.name
												  ]
												: []
										}
										onChange={(selected) => {
											const val = selected[0] as string | undefined;
											// const updated = (editingLessons || []).map((l, idx) =>
											// 	idx === lesson_id ? { ...l, start_sound: val } : l
											// );
										}}
										options={
											schedulesQuery.data &&
											schedulesQuery.data.map((s) => s.name)
										}
										placeholder='отсутствует'
									/>
									{/* <Button className='ml-auto' variant='outline-secondary'>
										Шаблон
									</Button> */}
								</div>
							))}
						</Panel.Body>
						{(startDay !== null && endDay === null) || (
							<div className='absolute flex w-full h-full top-0 left-0 bg-black/10'>
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
