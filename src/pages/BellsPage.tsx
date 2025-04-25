// @ts-nocheck
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
import React, {
	createContext,
	HTMLAttributes,
	useContext,
	useState
} from 'react';
import { Button, Card, Form, Spinner } from 'react-bootstrap';
import {
	Floppy,
	PencilSquare,
	Plus,
	Trash,
	XOctagon
} from 'react-bootstrap-icons';
import { Typeahead } from 'react-bootstrap-typeahead';

export interface BellsContextData {
	bellsSettingsQuery: UseQueryResult<BellsSettings>;
	bellsSettings: BellsSettings;
	editingLessons: Lesson[] | undefined;
	setEditingLessons: (lessons: Lesson[] | undefined) => void;
	updateEditingLessons: () => void;
}

const BellsContext = createContext<BellsContextData | undefined>(undefined);

export function useBellsContext(): BellsContextData {
	const data = useContext(BellsContext);
	if (!data) throw Error('Not in bells context');
	return data;
}

const LessonCard = ({
	lesson_id,
	lesson,
	...attrs
}: { lesson_id: number; lesson: Lesson } & HTMLAttributes<HTMLDivElement>) => {
	const queryClient = useQueryClient();

	const switchEnabled = useMutation({
		mutationFn: (enabled: boolean) => patchLesson(lesson_id, { enabled }),
		mutationKey: ['bells.lessons.switchEnabled'],
		onSuccess: () => queryClient.invalidateQueries('bells')
	});
	
	const {soundNameList} = useSounds();

	const {
		editingLessons,
		bellsSettings,
		setEditingLessons,
		updateEditingLessons
	} = useBellsContext();

	let disabledReason = undefined;
	if (!editingLessons) {
		if (!lesson.enabled) disabledReason = 'звонки урока выключены';
		else if (!bellsSettings.enabled) disabledReason = 'все звонки выключены';
		// TODO: Add weekday reason
	}

	const overlap = lesson.start_at && lesson.end_at && countMinutes(lesson.end_at) - countMinutes(lesson.start_at) <= 0;

	return (
		<Card className='flex flex-col' {...attrs}>
			<Card.Header className='flex flex-row gap-2.5 items-center text-2xl text-slate-500 p-0 px-4 h-12'>
				{!editingLessons && (
					<Form.Check
						type='switch'
						disabled={switchEnabled.isPending}
						onChange={(e) => switchEnabled.mutate(e.target.checked)}
						checked={lesson.enabled}
					/>
				)}
				<div>
					<span className='font-medium'>{lesson_id + 1}</span> урок
				</div>
				{disabledReason && (
					<i className='ml-4 text-lg text-slate-400'>
						Выключен: {disabledReason}
					</i>
				)}
				{editingLessons && (
					<>
						{overlap && <i className='text-red-500 text-lg'>неправильный порядок начала и конца урока</i>}
						<Button
							variant='danger'
							className='ml-auto'
							onClick={() => {
								editingLessons.splice(lesson_id, 1);
								updateEditingLessons();
							}}
						>
							<Trash className='inline' size='1.4rem' />
						</Button>
					</>
				)}
			</Card.Header>
			<div className='flex flex-row py-2 px-9 bg-orange-50 gap-10'>
				<div className='flex flex-col w-20 text-lg text-left gap-2'>
					<span className='text-xl text-slate-400'>Начало</span>
					{editingLessons ? (
						<input
							className={`border h-9 ${(overlap || !lesson.start_at) && 'ring-2 ring-red-400'}`}
							value={lesson.start_at}
							onChange={(e) => {
								lesson.start_at = e.target.value;
								updateEditingLessons();
							}}
							disabled={!editingLessons}
							type='time'
						/>
					) : (
						lesson.start_at
					)}
				</div>
				<div className='flex flex-col text-lg text-left gap-2'>
					<span className='text-xl text-slate-400'>Звук</span>
					{editingLessons ? (
						<Typeahead
							className='border-none text-xs'
							disabled={!editingLessons}
							emptyLabel='не найдено'
							selected={lesson.start_sound ? [lesson.start_sound] : []}
							onChange={(selected) => {
								// @ts-ignore
								lesson.start_sound = selected[0];
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
				</div>
			</div>
			<div className='flex flex-row py-2 px-9 bg-blue-50 gap-10'>
				<div className='flex flex-col w-20 text-lg text-left gap-2'>
					<span className='text-xl text-slate-400'>Конец</span>
					{editingLessons ? (
						<input
							className={`border h-9 ${(overlap || !lesson.end_at) && 'ring-2 ring-red-400'}`}
							value={lesson.end_at}
							disabled={!editingLessons}
							onChange={(e) => {
								lesson.end_at = e.target.value;
								updateEditingLessons();
							}}
							type='time'
						/>
					) : (
						lesson.end_at
					)}
				</div>
				<div className='flex flex-col text-lg text-left gap-2'>
					<span className='text-xl text-slate-400'>Звук</span>
					{editingLessons ? (
						<Typeahead
							className='border-none text-xs'
							disabled={!editingLessons}
							emptyLabel='не найдено'
							selected={lesson.end_sound ? [lesson.end_sound] : []}
							onChange={(selected) => {
								// @ts-ignore
								lesson.end_sound = selected[0];
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
				</div>
			</div>
		</Card>
	);
};

const BellsPage = () => {
	// const weekdays = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];
	const bellsSettingsQuery = useQuery({
		queryFn: () => getBellsSettings(),
		queryKey: ['bells']
	});

	const queryClient = useQueryClient();

	const [editingLessons, setEditingLessons] = useState<Lesson[] | undefined>(
		undefined
	);

	const updateEditingLessons = () =>
		setEditingLessons(Array.from(editingLessons));

	const saveEditing = useMutation({
		mutationFn: () =>
			patchBellsSettings({
				lessons: editingLessons
			}),
		mutationKey: ['bells', 'lessons', 'save'],
		onSuccess: () => {
			setEditingLessons(undefined);
			queryClient.invalidateQueries('bells');
		}
	});

	const switchBells = useMutation({
		mutationFn: (enabled: boolean) => patchBellsSettings({ enabled }),
		mutationKey: ['bells.enabled'],
		onSuccess: () => queryClient.invalidateQueries('bells')
	});

	if (bellsSettingsQuery.isLoading)
		return <ForegroundNotification>Загрузка...</ForegroundNotification>;

	if (!bellsSettingsQuery.data)
		return <ForegroundNotification>Ошибка</ForegroundNotification>;

	const bellsSettings = bellsSettingsQuery.data;
	const lessonList = bellsSettings.lessons;
	const startEditing = () => setEditingLessons(lessonList);
	const cancelEditing = () => {
		setEditingLessons(undefined);
		queryClient.invalidateQueries('bells');
	};
	const addLesson = () => {
		editingLessons.push({
			enabled: true,
			start_at: '',
			end_at: ''
		});
		updateEditingLessons();
	};

	const displayLessons = editingLessons || lessonList;

	let hasInvalids = false;
	const displayBreaks: number[] = displayLessons.map((lesson, lesson_id) => {
		if (!lesson.start_at || !lesson.end_at) {
			hasInvalids = true;
			return null;
		}

		if (countMinutes(lesson.end_at) - countMinutes(lesson.start_at) <= 0)
			hasInvalids = true;
		
		if (lesson_id === 0) return null;

		const res =
			countMinutes(lesson.start_at) -
			countMinutes(displayLessons[lesson_id - 1].end_at);
		if (res <= 0) hasInvalids = true;
		return res;
	});

	return (
		<BellsContext.Provider
			value={{
				bellsSettingsQuery,
				bellsSettings,
				editingLessons,
				setEditingLessons,
				updateEditingLessons
			}}
		>
			<div className='mx-auto flex flex-col w-[50rem]'>
				<h1 className='text-4xl ml-8 font-semibold text-slate-500 mb-6'>
					Расписание звонков
				</h1>
				<div className='flex flex-row mb-3 p-3'>
					<div className='flex flex-row items-center text-2xl gap-2 font-medium text-slate-600'>
						{editingLessons ? (
							<>Режим редактирования</>
						) : (
							<>
								<Form.Check
									disabled={switchBells.isPending}
									checked={bellsSettings.enabled}
									onChange={(e) => switchBells.mutate(e.target.checked)}
									type='switch'
								/>
								Звонки {bellsSettings.enabled ? 'включены' : 'выключены'}
							</>
						)}
					</div>
					<div className='ml-auto flex flex-row items-center gap-2'>
						{editingLessons ? (
							<>
								<Button
									onClick={cancelEditing}
									variant='danger'
									className='flex flex-row items-center gap-2'
								>
									<XOctagon size='1.2rem' /> Отменить
								</Button>
								<Button
									onClick={() => saveEditing.mutate()}
									variant='primary'
									className='flex flex-row items-center gap-2'
									disabled={saveEditing.isPending || hasInvalids}
								>
									{saveEditing.isPending ? (
										<Spinner size='sm' />
									) : (
										<Floppy size='1.2rem' />
									)}{' '}
									Сохранить
								</Button>
							</>
						) : (
							<Button
								onClick={startEditing}
								variant='primary'
								className='flex flex-row items-center gap-2'
							>
								<PencilSquare size='1.2rem' /> Изменить
							</Button>
						)}
					</div>
				</div>
				<div className='flex flex-col gap-1 pr-2 overflow-y-auto h-full'>
					{displayLessons.map((lesson, lesson_id) => {
						const lessonBreak = displayBreaks[lesson_id];
						const overlap =
							lessonBreak !== null && editingLessons && lessonBreak <= 0;
						return (
							<div key={lesson_id}>
								{lesson_id !== 0 && (
									<div className='flex flex-row gap-3 py-1 mb-1 px-8 text-gray-400 border-b-4 border-dotted text-lg'>
										Перемена
										<span
											className={`text-slate-500 font-medium ${
												overlap && 'text-red-500'
											}`}
										>
											{lessonBreak !== null && <>{lessonBreak} мин</>}
										</span>
										{overlap && (
											<i className='text-red-500'>пересечение времени уроков</i>
										)}
									</div>
								)}
								<LessonCard lesson={lesson} lesson_id={lesson_id} />
							</div>
						);
					})}
				</div>
				{editingLessons && (
					<div className='flex flex-row mb-3 p-3'>
						<Button
							onClick={addLesson}
							variant='primary'
							className='ml-auto flex flex-row items-center gap-2'
						>
							<Plus size='1.5rem' /> Добавить урок
						</Button>
					</div>
				)}
			</div>
		</BellsContext.Provider>

		// <div className='flex flex-col gap-9'>
		// 	<div className='flex justify-between gap-4 flex-row'>
		// 		{weekdays.map((day) => (
		// 			<div className='flex flex-col'>
		// 				<div className='p-1 px-2 flex items-end justify-between min-h-8 rounded-t-md border-x-2 border-t-2 border-slate-400 text-xl bg-slate-200 text-slate-500 font-semibold'>
		// 					<span>{day}</span>
		// 					<span className='text-sm'>07.09</span>
		// 				</div>
		// 				<div className='p-1 rounded-b-md bg-slate-200 border-x-2 border-b-2 border-slate-400'>
		// 					<Typeahead
		// 						id='sound-selector'
		// 						className='border-none w-28 text-xs'
		// 						emptyLabel='не найдено'
		// 						onChange={(selected) => console.log(selected)}
		// 						options={['Будние']}
		// 						placeholder='Шаблон'
		// 						size='sm'
		// 					/>
		// 				</div>
		// 			</div>
		// 		))}
		// 	</div>
		// 	<div className='flex flex-col'>
		// 		<div className='flex ml-2 flex-row'>
		// 			<div
		// 				className={`rounded-t-md cursor-pointer text-xl px-2 text-slate-600 ${
		// 					true ? 'border-t border-x bg-blue-50' : 'hover:bg-gray-200'
		// 				}`}
		// 			>
		// 				Сегодня
		// 			</div>
		// 			<div
		// 				className={`rounded-t-md cursor-pointer text-xl px-2 text-slate-600 ${
		// 					false ? 'bg-blue-50' : 'hover:bg-gray-200'
		// 				}`}
		// 			>
		// 				Шаблоны
		// 			</div>
		// 		</div>
		// 		<Card className='h-[40rem]'></Card>
		// 	</div>
		// </div>
	);
};

export default BellsPage;
