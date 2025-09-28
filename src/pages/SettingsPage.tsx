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
import api, { HTTP_BASE_URL } from '@/api';
import { useSounds } from '@/sounds';
import { useMutation, useQuery } from '@tanstack/react-query';
import React, { useEffect, useState } from 'react';
import { Card, Form, Spinner } from 'react-bootstrap';
import { Typeahead } from 'react-bootstrap-typeahead';
import Button from '@/components/Button';
import { H1, Name, Value, Note } from '@/components/text';
import Panel from '@/components/Panel';
import Field from '@/components/Field';
import FileUploadButton from '@/components/FileUploadButton';

const SettingsPage = () => {
	const { soundNameList } = useSounds();

	const settingsImportMutation = useMutation({
		mutationKey: ['school.settings.import'],
		mutationFn: async (file: File) => {
			const form = new FormData();
			form.append('file', file);
			return (await api.post('school/settings', form)).data;
		}
	});

	return (
		<div className='mx-auto flex flex-col w-full max-w-md p-4'>
			<H1>Настройки</H1>
			<Panel>
				<Panel.Body className='p-5 flex flex-col gap-8'>
					<Field>
						<Name>Звук перед объявлением</Name>
						<Value>
							<Typeahead
								className=''
								emptyLabel='не найдено'
								selected={[]}
								onChange={(selected) => {
									// setRingsound(selected[0]);
								}}
								size='sm'
								options={soundNameList}
								placeholder='отсутствует'
							/>
						</Value>
					</Field>

					<Field>
						<Name>Настройки школы</Name>
						<Value className='flex gap-2 mt-1'>
							<div className='flex flex-col gap-1'>
								<a
									href={`${HTTP_BASE_URL}/api/school/settings?schedules=true&assignments=true&overrides=true`}
								>
									<Button className='w-full py-2 h-8' variant='secondary'>
										Экспорт
									</Button>
								</a>
								<FileUploadButton
									className='w-full py-2 h-8'
									variant='secondary'
									handleFile={(file) => settingsImportMutation.mutate(file)}
								>
									Импорт
								</FileUploadButton>
							</div>
						</Value>
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
						<Button className='w-full py-2 text-lg' variant='primary'>
							Сохранить изменения
						</Button>
					</div>
				</Panel.Body>
			</Panel>
		</div>
	);
};

export default SettingsPage;
