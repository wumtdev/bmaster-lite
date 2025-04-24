import { getAnnouncementsSettings, patchAnnouncementsSettings } from '@/api/lite/announcements';
import { getBellsSettings, LessonWeekdays, patchBellsSettings } from '@/api/lite/bells';
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

	const [seed, setSeed] = useState<object>({});
	const update = () => setSeed({});

	const [bellsWeekdays, setBellsWeekdays] = useState<
		LessonWeekdays | undefined
	>(undefined);
	const [ringsound, setRingsound] = useState<string | undefined>(undefined);

	const {soundNameList} = useSounds();

	useEffect(() => {
		getBellsSettings().then((s) => setBellsWeekdays(s.weekdays));
		getAnnouncementsSettings().then((s) => setRingsound(s.ring_sound));
	}, []);

	const saveMut = useMutation({
		mutationFn: async () => {
			await patchBellsSettings({
				weekdays: bellsWeekdays
			});
			await patchAnnouncementsSettings({
				ring_sound: ringsound
			});
		}
	});

	const switchWeekday = (name: string, value: boolean) => {
		bellsWeekdays[name] = value;
		update();
	}

	return (
		<div className='mx-auto flex flex-col w-[30rem]'>
			<h1 className='text-4xl ml-8 font-semibold text-slate-500 mb-6'>
				Настройки
			</h1>
			<Card className='h-[25rem] bg-orange-50'>
				<Card.Body>
					<Form className='flex flex-col h-full'>
						<Form.Group className='font-medium mb-4'>
							<Form.Label>Звук перед объявлением</Form.Label>
							<Typeahead
								className='border-none text-xs'
								emptyLabel='не найдено'
								selected={ringsound ? [ringsound] : []}
								onChange={(selected) => {
									// @ts-ignore
									setRingsound(selected[0]);
								}}
								size='sm'
								options={soundNameList}
								placeholder='отсутствует'
							/>
						</Form.Group>
						<Form.Group>
							<Form.Label className='font-medium'>Учебные дни</Form.Label>
							<div className='flex flex-row justify-between'>
								{bellsWeekdays ? (
									<>
										<Form.Check label='ПН' onChange={(e) => switchWeekday('monday', e.target.checked)} checked={bellsWeekdays.monday} />
										<Form.Check label='ВТ' onChange={(e) => switchWeekday('tuesday', e.target.checked)} checked={bellsWeekdays.tuesday} />
										<Form.Check label='СР' onChange={(e) => switchWeekday('wednesday', e.target.checked)} checked={bellsWeekdays.wednesday} />
										<Form.Check label='ЧТ' onChange={(e) => switchWeekday('thursday', e.target.checked)} checked={bellsWeekdays.thursday} />
										<Form.Check label='ПТ' onChange={(e) => switchWeekday('friday', e.target.checked)} checked={bellsWeekdays.friday} />
										<Form.Check label='СБ' onChange={(e) => switchWeekday('saturday', e.target.checked)} checked={bellsWeekdays.saturday} />
										<Form.Check label='ВС' onChange={(e) => switchWeekday('sunday', e.target.checked)} checked={bellsWeekdays.sunday} />
									</>
								) : (
									<Spinner />
								)}
							</div>
							<Form.Text>Дни недели, по которым работают звонки</Form.Text>
						</Form.Group>
						<div className='mt-auto flex flex-row'>
							<Button disabled={saveMut.isPending} onClick={() => saveMut.mutate()} className='mt-4 ml-auto' variant='primary'>
								Сохранить
							</Button>
						</div>
					</Form>
				</Card.Body>
			</Card>
		</div>
	);
};

export default SettingsPage;
