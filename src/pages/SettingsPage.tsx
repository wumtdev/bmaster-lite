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
import { Card, Form, Spinner } from 'react-bootstrap';
import { Typeahead } from 'react-bootstrap-typeahead';
import Button from '@/components/Button';
import { H1, Name, Value, Note } from '@/components/text';
import Panel from '@/components/Panel';
import Field from '@/components/Field';

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
			<H1>Настройки</H1>
			<Panel>
				<Panel.Body className='p-5'>
					<div className='flex flex-col gap-8'>
						<Field>
							<Name>Звук перед объявлением</Name>
							<Value>
								<Typeahead
									className=''
									emptyLabel='не найдено'
									selected={ringsound ? [ringsound] : []}
									onChange={(selected) => {
										setRingsound(selected[0]);
									}}
									size='sm'
									options={soundNameList}
									placeholder='отсутствует'
								/>
							</Value>
						</Field>

						<Field>
							{/* <Name className='font-medium text-slate-700'> */}
							<Name>Учебные дни</Name>
							<div className='grid grid-cols-4 gap-2'>
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
							{/* <Form.Text className='text-slate-500 text-sm'> */}
							<Note>
								Дни недели, по которым работают звонки
							</Note>
						</Field>

						{/* Сохранить */}
						<div className='mt-4'>
							{/* <Button
								disabled={saveMut.isPending}
								onClick={() => saveMut.mutate()}
								className='w-full py-2 text-lg rounded-xl shadow-md'
								variant='primary'
							>
								Сохранить изменения
							</Button> */}
							<Button
								disabled={saveMut.isPending}
								onClick={() => saveMut.mutate()}
								className='w-full py-2 text-lg'
								variant='primary'
							>
								Сохранить изменения
							</Button>
						</div>
					</div>
				</Panel.Body>
			</Panel>
		</div>
	);
};

export default SettingsPage;
