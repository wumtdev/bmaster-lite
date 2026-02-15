// @ts-nocheck
import {
	createSchedule,
	updateSchedule,
	getSchedules,
	ScheduleInfo,
	ScheduleLesson,
	ScheduleUpdateRequest,
	deleteSchedule,
	dupeSchedule
} from '@/api/school/schedules';
import { cn } from '@/utils';
import React, {
	createContext,
	useContext,
	useEffect,
	useRef,
	useState
} from 'react';
import {
	BellsSettings,
	getBellsSettings,
	Lesson,
	patchBellsSettings,
	patchLesson
} from '@/api/lite/bells';
import ForegroundNotification from '@/components/ForegroundNotification';
import { useSounds } from '@/sounds';
import { countMinutes } from '@/utils';
import {
	useMutation,
	useQuery,
	useQueryClient,
	UseQueryResult
} from '@tanstack/react-query';
import {
	Card,
	Form,
	Spinner,
	OverlayTrigger,
	Tooltip,
	Overlay,
	Popover
} from 'react-bootstrap';
import {
	Floppy,
	Floppy2Fill,
	FloppyFill,
	PencilFill,
	PencilSquare,
	Plus,
	ThreeDotsVertical,
	Trash,
	X,
	XCircle,
	XCircleFill,
	XLg,
	XOctagon,
	XSquareFill
} from 'react-bootstrap-icons';
import { Typeahead } from 'react-bootstrap-typeahead';
import { Panel } from '@/components/Panel';
import { H1, H2, Name, Note, Value } from '@/components/text';
import { Button } from '@/components/Button';
import Field from '@/components/Field';
import TextProperty from '@/components/TextProperty';

/* ---------------- Context ---------------- */
export type SchedulesContextData = {
	editingLessons: ScheduleLesson[];
	updateEditingLessons: () => void;
	setEditingLessons: (x: ScheduleLesson[]) => void;
	touch: () => void;
};

// const ScheduleContext = createContext<ScheduleContextData | null>(null);

// export const useScheduleContext = (): ScheduleContextData => {
// 	const data = useContext(ScheduleContext);
// 	if (!data) throw Error('Not in bells context');
// 	return data;
// };

/* ---------------- LessonCard ---------------- */
const LessonCard = ({
	lesson_num,
	lesson,
	ctx,
	...attrs
}: {
	lesson_num: number;
	lesson: Lesson;
	ctx: SchedulesContextData;
} & React.HTMLAttributes<HTMLDivElement>) => {
	const queryClient = useQueryClient();

	const { soundNameList } = useSounds();

	const { editingLessons, setEditingLessons, updateEditingLessons } = ctx;

	const overlap =
		lesson.start_at &&
		lesson.end_at &&
		countMinutes(lesson.end_at) - countMinutes(lesson.start_at) <= 0;

	const onDelete = () => {
		if (!editingLessons) return;
		// setEditingLessons(editingLessons.filter((_, i) => i !== lesson_num));
		editingLessons.splice(lesson_num, 1);
		updateEditingLessons();
	};

	return (
		<Panel className='flex flex-col rounded-lg' {...attrs}>
			<Panel.Header className='flex items-center gap-3 p-3'>
				<div className='flex items-baseline gap-2'>
					<Value>{lesson_num + 1}</Value>
					<Name>урок</Name>
				</div>

				<div className='ml-auto flex items-center gap-2'>
					{editingLessons && overlap && (
						<div className='text-red-600 text-sm'>
							неправильный порядок времени
						</div>
					)}
					{editingLessons && (
						<button
							className='ml-auto p-2 border-1 rounded-md border-gray-300 text-gray-300 hover:text-red-500 hover:border-red-500'
							onClick={onDelete}
						>
							<Trash size='1rem' />
						</button>
					)}
				</div>
			</Panel.Header>

			<div className='flex flex-col sm:flex-row gap-4 p-3 bg-blue-50'>
				<Field>
					<Name>Начало</Name>
					<Value>
						{editingLessons ? (
							<input
								type='time'
								value={lesson.start_at}
								onChange={(e) => {
									lesson.start_at = e.target.value;

									editingLessons.sort((a, b) => {
										if (a.start_at === b.start_at) return 0;
										if (a.start_at === '') return 1;
										if (b.start_at === '') return -1;
										return countMinutes(a.start_at) - countMinutes(b.start_at);
									});

									updateEditingLessons();
								}}
								className={`px-2 py-1 border rounded ${
									!lesson.start_at || overlap
										? 'ring-2 ring-red-300'
										: 'border-gray-200'
								}`}
							/>
						) : (
							lesson.start_at
						)}
					</Value>
				</Field>

				<Field>
					<Name>Звук (начало)</Name>
					<Value>
						{editingLessons ? (
							<Typeahead
								className='border-none'
								disabled={!editingLessons}
								emptyLabel='не найдено'
								selected={lesson.start_sound ? [lesson.start_sound] : []}
								onChange={(selected) => {
									const val = selected[0] as string | undefined;
									lesson.start_sound = val;
									updateEditingLessons();
								}}
								options={soundNameList}
								placeholder='отсутствует'
							/>
						) : (
							lesson.start_sound || (
								<label className='text-gray-500'>отсутствует</label>
							)
						)}
					</Value>
				</Field>
			</div>

			<div className='flex flex-col sm:flex-row gap-4 p-3 bg-green-50'>
				<Field>
					<Name>Конец</Name>
					<Value>
						{editingLessons ? (
							<input
								type='time'
								value={lesson.end_at}
								onChange={(e) => {
									lesson.end_at = e.target.value;
									updateEditingLessons();
								}}
								className={`px-2 py-1 border rounded ${
									!lesson.end_at || overlap
										? 'ring-2 ring-red-300'
										: 'border-gray-200'
								}`}
							/>
						) : (
							lesson.end_at
						)}
					</Value>
				</Field>

				<Field>
					<Name>Звук (конец)</Name>
					<Value>
						{editingLessons ? (
							<Typeahead
								className='border-none'
								disabled={!editingLessons}
								emptyLabel='не найдено'
								selected={lesson.end_sound ? [lesson.end_sound] : []}
								onChange={(selected) => {
									const val = selected[0] as string | undefined;
									lesson.end_sound = val;
									updateEditingLessons();
								}}
								options={soundNameList}
								placeholder='отсутствует'
							/>
						) : (
							lesson.end_sound || (
								<label className='text-gray-500'>отсутствует</label>
							)
						)}
					</Value>
				</Field>
			</div>
		</Panel>
	);
};

const SchedulesPage = () => {
	const schedulesQuery = useQuery({
		queryFn: () => getSchedules(),
		queryKey: ['school.schedules']
	});

	const schedules = schedulesQuery.data;

	const queryClient = useQueryClient();

	// id of schedule selected by user
	const [selectedScheduleId, setSelectedScheduleId] = useState<number | null>(
		null
	);

	// selected schedule extracted from query by `selectedScheduleId`
	const selectedSchedule: ScheduleInfo | null =
		selectedScheduleId && schedulesQuery.data
			? schedulesQuery.data.find((s) => s.id === selectedScheduleId) || null
			: null;

	// draft copy of original schedule's lessons
	// all changes made by user are applied to this list
	// when user clicks save button, this list is applied to original schedule
	const [editingLessons, setEditingLessons] = useState<ScheduleLesson[] | null>(
		null
	);
	const isEditing = editingLessons !== null;

	const [menuScheduleId, setMenuScheduleId] = useState<number | null>(null);

	const [renaming, setRenaming] = useState<boolean>(false);

	// mutation of schedule was not saved
	// makes user able to save changes
	const [unsaved, setUnsaved] = useState<boolean>(false);

	const touch = () => {
		if (!unsaved) setUnsaved(true);
	};

	// call after any changes
	// it sorts lessons and rerenders list
	const updateEditingLessons = () => {
		setEditingLessons((prev) => Array.from(prev));
		touch();
	};

	const cancelEditing = () => {
		if (selectedSchedule !== null) {
			setEditingLessons(
				selectedSchedule.lessons.map((l) => Object.assign({}, l))
			);
			setUnsaved(false);
		}
	};

	useEffect(() => console.log(editingLessons), [editingLessons]);

	const addLesson = () => {
		editingLessons.push({
			start_at: '',
			start_sound: '',
			end_at: '',
			end_sound: ''
		});
		updateEditingLessons();
	};

	const [creatingSchedule, setCreatingSchedule] = useState<boolean>(false);

	const createScheduleMutation = useMutation({
		mutationKey: ['school.schedules.create'],
		mutationFn: (name: string) => createSchedule({ name, lessons: [] }),
		onSuccess: () => {
			setCreatingSchedule(false);
			queryClient.invalidateQueries(['school.schedules']);
		}
	});

	const saveScheduleLessonsMutation = useMutation({
		mutationKey: ['school.schedules.save'],
		mutationFn: () =>
			updateSchedule(selectedScheduleId, { lessons: editingLessons }),
		onSuccess: () => {
			setUnsaved(false);
			queryClient.invalidateQueries(['school.schedules']);
		}
	});

	const renameScheduleMutation = useMutation({
		mutationKey: ['school.schedules.rename'],
		mutationFn: (newName: string) =>
			updateSchedule(selectedScheduleId, { name: newName }),
		onSuccess: () => {
			setRenaming(false);
			queryClient.invalidateQueries(['school.schedules']);
		}
	});

	const deleteScheduleMutation = useMutation({
		mutationKey: ['school.schedules.delete'],
		mutationFn: () => deleteSchedule(menuScheduleId),
		onSuccess: () => {
			queryClient.invalidateQueries(['school.schedules']);
		}
	});

	const dupeScheduleMutation = useMutation({
		mutationKey: ['school.schedules.dupe'],
		mutationFn: () => dupeSchedule(menuScheduleId),
		onSuccess: (schedule) => {
			setMenuScheduleId(null);
			queryClient.invalidateQueries(['school.schedules']);
			setSelectedScheduleId(schedule.id);
		}
	});

	// call when user selects other schedule
	useEffect(() => {
		setUnsaved(false);
		if (selectedScheduleId === null) {
			setEditingLessons(null);
		} else {
			if (selectedSchedule !== null) {
				// deep copy of the original schedule lessons
				setEditingLessons(
					selectedSchedule.lessons.map((l) => Object.assign({}, l))
				);
			}
			// ignore if original schedule was lost
		}
	}, [selectedScheduleId]);

	useEffect(() => {
		const listener = (e) => {
			if (menuScheduleId !== null) setMenuScheduleId(null);
			if (renaming) setRenaming(false);
			if (creatingSchedule) setCreatingSchedule(false);
		};
		window.addEventListener('mousedown', listener);
		return () => window.removeEventListener('mousedown', listener);
	}, [menuScheduleId, renaming, creatingSchedule]);

	const ctx: SchedulesContextData = {
		editingLessons,
		setEditingLessons,
		updateEditingLessons,
		touch
	};

	return (
		<div className='mx-auto max-w-7xl w-fit p-6'>
			<H1>Расписания</H1>
			<div className='flex gap-6 min-h-[40rem]'>
				<Panel className='min-w-[18rem] mb-auto'>
					<Panel.Header>
						<H2>Список</H2>
					</Panel.Header>
					<Panel.Body className='flex flex-col gap-1 pt-3 pb-3 pl-3 pr-0'>
						{schedules
							? schedules.map((schedule) => (
									<div
										className={cn(
											'flex items-center hover:bg-slate-200 rounded-[0.3rem] p-2',
											schedule.id == selectedScheduleId &&
												'bg-blue-500 hover:bg-blue-400 text-white'
										)}
										onClick={() => setSelectedScheduleId(schedule.id)}
										onContextMenu={(e) => {
											setMenuScheduleId(schedule.id);
											e.stopPropagation();
											e.preventDefault();
										}}
										key={schedule.id}
									>
										{schedule.id == selectedScheduleId && renaming ? (
											<TextProperty
												defaultValue={schedule.name}
												edit
												disabled={renameScheduleMutation.isPending}
												className='h-full w-[11rem] text-black'
												parent={{ onMouseDown: (e) => e.stopPropagation() }}
												onSubmit={(v) => {
													renameScheduleMutation.mutate(v);
												}}
											/>
										) : (
											<Value>{schedule.name}</Value>
										)}

										{/* Троеточие справа */}
										<div className='ml-auto relative'>
											<button
												onClick={(e) => {
													e.stopPropagation();
													setMenuScheduleId(
														menuScheduleId === schedule.id ? null : schedule.id
													);
												}}
												className='rounded-[0.2rem] p-1 hover:bg-black/15'
											>
												<ThreeDotsVertical size={18} />
											</button>

											{menuScheduleId === schedule.id && (
												<Panel
													className='absolute right-0 z-10 flex flex-col rounded'
													onMouseDown={(e) => {
														e.stopPropagation();
													}}
												>
													<button
														className='p-2 text-left hover:bg-gray-100'
														onClick={() => {
															setSelectedScheduleId(schedule.id);
															setRenaming(true);
															setMenuScheduleId(null);
														}}
													>
														Переименовать
													</button>
													<button
														className='p-2 text-left hover:bg-gray-100'
														onClick={() => dupeScheduleMutation.mutate()}
														disabled={dupeScheduleMutation.isPending}
													>
														Дублировать
													</button>
													<button
														className='p-2 text-left text-red-600 hover:bg-gray-100'
														disabled={deleteScheduleMutation.isPending}
														onClick={() => deleteScheduleMutation.mutate()}
													>
														Удалить
													</button>
												</Panel>
											)}
										</div>
									</div>
							  ))
							: 'Загрузка...'}

						<div className='mt-20'>
							{creatingSchedule ? (
								<TextProperty
									edit
									autoFocus
									disabled={createScheduleMutation.isPending}
									className='h-10 w-[13rem] text-black'
									parent={{ onMouseDown: (e) => e.stopPropagation() }}
									onSubmit={(v) => {
										if (v) createScheduleMutation.mutate(v);
									}}
								/>
							) : (
								<Button
									onClick={() => setCreatingSchedule(true)}
									className='ml-auto px-[2rem]'
								>
									<Plus size={24} /> Создать
								</Button>
							)}
						</div>
					</Panel.Body>
				</Panel>
				<Panel className='min-w-[32rem]'>
					<Panel.Header>
						<H2>
							{selectedScheduleId ? (
								selectedSchedule ? (
									selectedSchedule.name
								) : (
									<span className='text-red-700'>#{selectedScheduleId}</span>
								)
							) : (
								'Выберите расписание'
							)}
						</H2>
					</Panel.Header>
					<Panel.Body>
						{editingLessons ? (
							editingLessons.map((lesson, lesson_num) => {
								let breakDisplay = null;
								if (lesson_num !== 0) {
									const prevLesson = editingLessons[lesson_num - 1];
									const breakDuration =
										lesson.start_at && prevLesson.end_at
											? countMinutes(lesson.start_at) -
											  countMinutes(prevLesson.end_at)
											: null;
									breakDisplay = (
										<div
											className={cn(
												'flex items-center gap-3 py-2 px-4 text-gray-500',
												breakDuration !== null &&
													breakDuration > 0 &&
													'text-red-500'
											)}
										>
											<Name>Перемена</Name>
											<Value>
												{breakDuration !== null
													? `${breakDuration} мин`
													: '-- мин'}
											</Value>
											{/* {breakDuration < 1 && (
												<div className='text-red-500 text-sm'>
													пересечение времени
												</div>
											)} */}
										</div>
									);
								}

								return (
									<div key={lesson_num}>
										{breakDisplay}
										<LessonCard
											ctx={ctx}
											lesson={lesson}
											lesson_num={lesson_num}
										/>
									</div>
								);
							})
						) : (
							<Note>Выберите расписание для редактирования</Note>
						)}
					</Panel.Body>
					{editingLessons && (
						<div className='border-t p-3 flex justify-end gap-2'>
							{unsaved && (
								<div className='flex gap-[0.15rem]'>
									<Button
										className='rounded-r-none px-3'
										variant='danger'
										onClick={() => cancelEditing()}
										disabled={saveScheduleLessonsMutation.isPending}
									>
										<XCircleFill size={24} />
									</Button>
									<Button
										className='text-white rounded-l-none px-3 gap-[1rem]'
										onClick={() => saveScheduleLessonsMutation.mutate()}
									>
										{saveScheduleLessonsMutation.isPending ? (
											<Spinner />
										) : (
											<FloppyFill size={24} />
										)}
										Сохранить
									</Button>
								</div>
							)}
							<Button
								onClick={() => addLesson()}
								variant='secondary'
								className='px-[2rem]'
							>
								<Plus size={24} /> Добавить урок
							</Button>
						</div>
					)}
				</Panel>
			</div>
		</div>
	);
};

export default SchedulesPage;
