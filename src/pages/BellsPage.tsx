// @ts-nocheck
import React, { createContext, useContext, useState } from 'react';
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
import { Card, Form, Spinner, OverlayTrigger, Tooltip } from 'react-bootstrap';
import {
	Floppy,
	FloppyFill,
	PencilFill,
	PencilSquare,
	Plus,
	Trash,
	X,
	XCircle,
	XCircleFill,
	XLg,
	XOctagon
} from 'react-bootstrap-icons';
import { Typeahead } from 'react-bootstrap-typeahead';
import { Panel } from '@/components/Panel';
import { H1, H2, Name, Note, Value } from '@/components/text';
import { Button } from '@/components/Button';
import Field from '@/components/Field';

/* ---------------- Context ---------------- */
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

/* ---------------- LessonCard ---------------- */
const LessonCard = ({
	lesson_id,
	lesson,
	...attrs
}: {
	lesson_id: number;
	lesson: Lesson;
} & React.HTMLAttributes<HTMLDivElement>) => {
	const queryClient = useQueryClient();

	const switchEnabled = useMutation({
		mutationFn: (enabled: boolean) => patchLesson(lesson_id, { enabled }),
		mutationKey: ['bells.lessons.switchEnabled', lesson_id],
		onSuccess: () => queryClient.invalidateQueries(['bells'])
	});

	const { soundNameList } = useSounds();

	const { editingLessons, bellsSettings, setEditingLessons } =
		useBellsContext();

	let disabledReason = undefined;
	if (!editingLessons) {
		if (!lesson.enabled) disabledReason = 'звонки урока выключены';
		else if (!bellsSettings.enabled) disabledReason = 'все звонки выключены';
	}

	const overlap =
		lesson.start_at &&
		lesson.end_at &&
		countMinutes(lesson.end_at) - countMinutes(lesson.start_at) <= 0;

	const onDelete = () => {
		if (!editingLessons) return;
		setEditingLessons(editingLessons.filter((_, i) => i !== lesson_id));
	};

	return (
		<Panel className='flex flex-col rounded-lg' {...attrs}>
			<Panel.Header className='flex items-center gap-3 p-3'>
				{!editingLessons && (
					<Form.Check
						type='switch'
						disabled={switchEnabled.isPending}
						onChange={(e) => switchEnabled.mutate(e.target.checked)}
						checked={lesson.enabled}
					/>
				)}

				<div className='flex items-baseline gap-2'>
					<Value>{lesson_id + 1}</Value>
					<Name>урок</Name>
				</div>

				{disabledReason && <Note>Выключен: {disabledReason}</Note>}

				<div className='ml-auto flex items-center gap-2'>
					{editingLessons && overlap && (
						<div className='text-red-600 text-sm'>
							неправильный порядок времени
						</div>
					)}
					{editingLessons && (
						<OverlayTrigger
							placement='top'
							overlay={<Tooltip>Удалить урок</Tooltip>}
						>
							<Button variant='outline-danger' size='sm' onClick={onDelete}>
								<Trash size='1rem' />
							</Button>
						</OverlayTrigger>
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
									const updated = (editingLessons || []).map((l, idx) =>
										idx === lesson_id ? { ...l, start_at: e.target.value } : l
									);
									setEditingLessons(updated);
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
									const updated = (editingLessons || []).map((l, idx) =>
										idx === lesson_id ? { ...l, start_sound: val } : l
									);
									setEditingLessons(updated);
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
									const updated = (editingLessons || []).map((l, idx) =>
										idx === lesson_id ? { ...l, end_at: e.target.value } : l
									);
									setEditingLessons(updated);
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
									const updated = (editingLessons || []).map((l, idx) =>
										idx === lesson_id ? { ...l, end_sound: val } : l
									);
									setEditingLessons(updated);
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

const BellsPage = () => {
	const bellsSettingsQuery = useQuery({
		queryFn: () => getBellsSettings(),
		queryKey: ['bells']
	});

	const queryClient = useQueryClient();

	const [editingLessons, setEditingLessons] = useState<Lesson[] | undefined>(
		undefined
	);

	const updateEditingLessons = () =>
		setEditingLessons((prev) => (prev ? Array.from(prev) : undefined));

	const saveEditing = useMutation({
		mutationFn: () => patchBellsSettings({ lessons: editingLessons }),
		mutationKey: ['bells', 'lessons', 'save'],
		onSuccess: () => {
			setEditingLessons(undefined);
			queryClient.invalidateQueries(['bells']);
		}
	});

	const switchBells = useMutation({
		mutationFn: (enabled: boolean) => patchBellsSettings({ enabled }),
		mutationKey: ['bells.enabled'],
		onSuccess: () => queryClient.invalidateQueries(['bells'])
	});

	if (bellsSettingsQuery.isLoading)
		return <ForegroundNotification>Загрузка...</ForegroundNotification>;
	if (!bellsSettingsQuery.data)
		return <ForegroundNotification>Ошибка</ForegroundNotification>;

	const bellsSettings = bellsSettingsQuery.data;
	const lessonList = bellsSettings.lessons || [];

	const startEditing = () =>
		setEditingLessons(lessonList.map((l) => ({ ...l })));
	const cancelEditing = () => {
		setEditingLessons(undefined);
		queryClient.invalidateQueries(['bells']);
	};
	const addLesson = () => {
		setEditingLessons((prev) => [
			...(prev || lessonList.map((l) => ({ ...l }))),
			{
				enabled: true,
				start_at: '',
				start_sound: null,
				end_at: '',
				end_sound: null
			}
		]);
	};

	const displayLessons = editingLessons || lessonList;

	// вычисляем рабочее время из существующих данных (начало первого enabled и конец последнего enabled)
	const enabledLessons = (lessonList || []).filter((l) => l.enabled);
	let workTime: { start: string; end: string } | null = null;
	if (enabledLessons.length > 0) {
		const toMinutes = (t: string) => {
			const [h, m] = t.split(':').map(Number);
			return h * 60 + m;
		};
		const sortedByStart = [...enabledLessons].sort(
			(a, b) => toMinutes(a.start_at) - toMinutes(b.start_at)
		);
		const sortedByEnd = [...enabledLessons].sort(
			(a, b) => toMinutes(a.end_at) - toMinutes(b.end_at)
		);
		workTime = {
			start: sortedByStart[0].start_at,
			end: sortedByEnd[sortedByEnd.length - 1].end_at
		};
	}

	const isOutsideWorkTime = (time: string) => {
		if (!workTime) return false;
		const toMinutes = (t: string) => {
			const [h, m] = t.split(':').map(Number);
			return h * 60 + m;
		};
		const t = toMinutes(time);
		return t < toMinutes(workTime.start) || t > toMinutes(workTime.end);
	};

	// Валидация: пустые/перекрывающиеся времена
	let hasInvalids = false;
	const displayBreaks: (number | null)[] = displayLessons.map(
		(lesson, lesson_id) => {
			if (!lesson.start_at || !lesson.end_at) {
				hasInvalids = true;
				return null;
			}
			if (countMinutes(lesson.end_at) - countMinutes(lesson.start_at) <= 0) {
				hasInvalids = true;
			}
			if (lesson_id === 0) return null;
			const res =
				countMinutes(lesson.start_at) -
				countMinutes(displayLessons[lesson_id - 1].end_at);
			if (res <= 0) hasInvalids = true;
			return res;
		}
	);
	console.log(lessonList);

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
			<div className='mx-auto max-w-7xl p-6'>
				<H1>Расписание звонков</H1>

				<div className='grid grid-cols-1 lg:grid-cols-3 gap-6'>
					{/* Левая часть — список уроков */}
					<div className='lg:col-span-2'>
						<Panel>
							<Panel.Header className='flex items-center justify-between'>
								<div className='flex items-center gap-3'>
									{editingLessons ? (
										<div className='text-lg font-medium text-slate-600'>
											Режим редактирования
										</div>
									) : (
										<div className='flex items-center gap-3 text-slate-600'>
											<Form.Check
												disabled={switchBells.isPending}
												checked={bellsSettings.enabled}
												onChange={(e) => switchBells.mutate(e.target.checked)}
												type='switch'
											/>
											<H2>
												Звонки{' '}
												{bellsSettings.enabled ? 'включены' : 'выключены'}
											</H2>
										</div>
									)}
								</div>

								<div className='flex items-center gap-2'>
									{editingLessons ? (
										<>
											<Button
												variant='danger'
												onClick={cancelEditing}
												className='d-flex align-items-center gap-2'
											>
												<XCircleFill size={15} /> Отменить
											</Button>
											<Button
												variant='primary'
												onClick={() => saveEditing.mutate()}
												disabled={saveEditing.isPending || hasInvalids}
												className='d-flex align-items-center gap-2'
											>
												{saveEditing.isPending ? (
													<Spinner size='sm' />
												) : (
													<FloppyFill size={14} />
												)}{' '}
												Сохранить
											</Button>
										</>
									) : (
										<Button
											variant='primary'
											onClick={startEditing}
											className='d-flex align-items-center gap-2'
										>
											<PencilFill size={14} /> Изменить
										</Button>
									)}
								</div>
							</Panel.Header>

							<Panel.Body className='space-y-4 max-h-[60vh] overflow-y-auto'>
								{displayLessons.length === 0 ? (
									<div className='text-gray-500 text-center py-8'>
										<div className='flex items-center justify-center space-x-2'>
											<span>
												В расписании пока нет уроков. Добавьте их, войдя в режим
												редактирования.
											</span>
											<span className='ml-auto text-xl'>↑</span>
										</div>
									</div>
								) : (
									displayLessons.map((lesson, lesson_id) => {
										const lessonBreak = displayBreaks[lesson_id];
										const outside =
											isOutsideWorkTime(lesson.start_at) &&
											isOutsideWorkTime(lesson.end_at);
										const overlap =
											lessonBreak !== null &&
											editingLessons &&
											lessonBreak <= 0;
										return (
											<div key={lesson_id}>
												{lesson_id !== 0 && (
													<div className='flex items-center gap-3 py-2 px-4 text-gray-500'>
														<Name>Перемена</Name>
														<Value
															className={`${
																overlap ? 'text-red-500' : 'text-slate-600'
															}`}
														>
															{lessonBreak !== null
																? `${lessonBreak} мин`
																: '—'}
														</Value>
														{overlap && (
															<div className='text-red-500 text-sm'>
																пересечение времени
															</div>
														)}
													</div>
												)}
												<div className={`${outside ? 'opacity-70' : ''}`}>
													<LessonCard lesson={lesson} lesson_id={lesson_id} />
												</div>
											</div>
										);
									})
								)}
							</Panel.Body>

							{editingLessons && (
								<div className='p-4 border-t bg-white flex justify-end'>
									<Button
										variant='secondary'
										onClick={addLesson}
										className='d-flex items-center gap-2'
									>
										<Plus size={20} /> Добавить урок
									</Button>
								</div>
							)}
						</Panel>
					</div>

					{/* Правая панель — всякая инфа */}
					<div>
						<Panel>
							<Panel.Header>
								<H2>Детали</H2>
								<Note>Управление шаблонами и быстрыми действиями</Note>
							</Panel.Header>

							<Panel.Body className='space-y-5'>
								<Field>
									<Name>Рабочее время</Name>
									<Value>
										{workTime ? `${workTime.start} — ${workTime.end}` : '—'}
									</Value>
									<Note>С начала 1-го урока и до конца последнего</Note>
								</Field>
								<hr />
								<Field>
									<Name>Состояние расписания</Name>
									<div className='flex items-center gap-2'>
										<div
											className={`px-2 py-1 rounded text-sm font-medium ${
												bellsSettings.enabled
													? 'bg-green-50 text-green-700'
													: 'bg-red-50 text-red-700'
											}`}
										>
											{bellsSettings.enabled ? 'Включено' : 'Выключено'}
										</div>
										<Note>({enabledLessons.length} уроков)</Note>
									</div>
								</Field>
							</Panel.Body>
						</Panel>
					</div>
				</div>

				<style>{`
          input[type=range] {
            -webkit-appearance: none;
            width: 100%;
            height: 10px;
            background: transparent;
          }
          input[type=range]::-webkit-slider-runnable-track {
            height: 10px;
            background: #e5e7eb;
            border-radius: 999px;
          }
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            margin-top: -6px;
            width: 22px;
            height: 22px;
            background: #2563eb;
            border-radius: 999px;
            box-shadow: 0 2px 6px rgba(37,99,235,0.35);
            border: 3px solid white;
          }
          input[type=range]::-moz-range-track {
            height: 10px;
            background: #e5e7eb;
            border-radius: 999px;
          }
          input[type=range]::-moz-range-thumb {
            width: 22px;
            height: 22px;
            background: #2563eb;
            border-radius: 999px;
            border: 3px solid white;
          }

          /* адаптив: на мобильных - колонки складываются и карточки становятся компактнее */
          @media (max-width: 1024px) {
            .max-w-7xl { padding-left: 1rem; padding-right: 1rem; }
          }
        `}</style>
			</div>
		</BellsContext.Provider>
	);
};

export default BellsPage;
