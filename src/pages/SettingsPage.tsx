// @ts-nocheck
import {
	getAnnouncementsSettings,
	patchAnnouncementsSettings
} from '@/api/lite/announcements';
import {
	getBellsSettings,
	LessonWeekdays,
	patchBellsSettings
} from '@/api/lite/bells';
import { useSounds } from '@/sounds';
import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { Button, Card, Form, Spinner } from 'react-bootstrap';
import { Typeahead } from 'react-bootstrap-typeahead';

const SettingsPage = () => {
	const bellsSettingsQuery = useQuery({
		queryFn: () => getBellsSettings(),
		queryKey: ['bells']
	});

	const announcementsSettingsQuery = useQuery({
		queryFn: () => getAnnouncementsSettings(),
		queryKey: ['announcements']
	});

	const [seed, setSeed] = useState({});
	const update = () => setSeed({});

	const [bellsWeekdays, setBellsWeekdays] = useState<
		LessonWeekdays | undefined
	>(undefined);
	const [ringsound, setRingsound] = useState<string | undefined>(undefined);

	const { soundNameList } = useSounds();

	useEffect(() => {
		getBellsSettings().then((s) => setBellsWeekdays(s.weekdays));
		getAnnouncementsSettings().then((s) => setRingsound(s.ring_sound));
	}, []);

	const saveMut = useMutation({
		mutationFn: async () => {
			await patchBellsSettings({ weekdays: bellsWeekdays });
			await patchAnnouncementsSettings({ ring_sound: ringsound });
		}
	});

	const switchWeekday = (name: string, value: boolean) => {
		bellsWeekdays[name] = value;
		update();
	};

	return (
		<div className='mx-auto flex flex-col w-full max-w-md p-4'>
			<h1 className='text-3xl font-semibold text-slate-600 mb-6'>Настройки</h1>
			<Card className='bg-slate-50 border-0 shadow-lg rounded-2xl'>
				<Card.Body className='p-5'>
					<Form className='flex flex-col gap-5'>
						<Form.Group>
							<Form.Label className='font-medium text-slate-700'>
								Звук перед объявлением
							</Form.Label>
							<Typeahead
								className='mt-2'
								emptyLabel='не найдено'
								selected={ringsound ? [ringsound] : []}
								onChange={(selected) => {
									setRingsound(selected[0]);
								}}
								size='sm'
								options={soundNameList}
								placeholder='отсутствует'
							/>
						</Form.Group>

						<Form.Group>
							<Form.Label className='font-medium text-slate-700'>
								Учебные дни
							</Form.Label>
							<div className='grid grid-cols-4 gap-2 mt-2'>
								{bellsWeekdays ? (
									Object.entries({
										ПН: 'monday',
										ВТ: 'tuesday',
										СР: 'wednesday',
										ЧТ: 'thursday',
										ПТ: 'friday',
										СБ: 'saturday',
										ВС: 'sunday'
									}).map(([label, key]) => (
										<label
											key={key}
											className={`flex items-center justify-center rounded-lg py-2 text-sm font-medium cursor-pointer select-none transition-colors ${
												bellsWeekdays[key]
													? 'bg-emerald-100 text-emerald-800'
													: 'bg-slate-100 text-slate-500'
											}`}
										>
											<input
												type='checkbox'
												className='hidden'
												checked={bellsWeekdays[key]}
												onChange={(e) => switchWeekday(key, e.target.checked)}
											/>
											{label}
										</label>
									))
								) : (
									<div className='col-span-4 flex justify-center'>
										<Spinner />
									</div>
								)}
							</div>
							<Form.Text className='text-slate-500 text-sm'>
								Дни недели, по которым работают звонки
							</Form.Text>
						</Form.Group>

						{/* Сохранить */}
						<div className='mt-4'>
							<Button
								disabled={saveMut.isPending}
								onClick={() => saveMut.mutate()}
								className='w-full py-2 text-lg rounded-xl shadow-md'
								variant='primary'
							>
								Сохранить изменения
							</Button>
						</div>
					</Form>
				</Card.Body>
			</Card>
		</div>
	);
};

export default SettingsPage;
