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
import { Download, Upload } from 'react-bootstrap-icons';
import Button from '@/components/Button';
import { H1, Name, Value, Note } from '@/components/text';
import Panel from '@/components/Panel';
import Field from '@/components/Field';
import FileUploadButton from '@/components/FileUploadButton';
import Toast from '@/components/Toast';

const SettingsPage = () => {
	const { soundNameList } = useSounds();

	const [showToast, setShowToast] = useState(false);
	const [toastMessage, setToastMessage] = useState('');
	const [toastVariant, setToastVariant] = useState('success');

	const settingsImportMutation = useMutation({
		mutationKey: ['school.settings.import'],
		mutationFn: async (file: File) => {
			const form = new FormData();
			form.append('file', file);
			return (await api.post('school/settings', form)).data;
		},
		onSuccess: () => {
			setToastMessage('Настройки успешно импортированы!');
			setToastVariant('success');
			setShowToast(true);
		},
		onError: (error) => {
			setToastMessage(`Ошибка при импорте: ${error.message}`);
			setToastVariant('danger');
			setShowToast(true);
		}
	});

	return (
		<div className='mx-auto flex flex-col w-full max-w-md p-4'>
			<H1>Настройки</H1>
			<Toast
				show={showToast}
				setShow={setShowToast}
				message={toastMessage}
				variant={toastVariant}
				delay={5000}
			/>

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
						<Value className='flex flex-col gap-2 mt-1'>
							<div className='flex items-start gap-3'>
								<FileUploadButton
									className='w-full py-2 h-9 flex items-center justify-center gap-2 '
									variant='success'
									handleFile={(file) => settingsImportMutation.mutate(file)}
									disabled={settingsImportMutation.isPending}
								>
									{settingsImportMutation.isPending ? (
										<Spinner animation='border' size='sm' />
									) : (
										<Download className='w-4 h-4 shrink-0' />
									)}
									{settingsImportMutation.isPending ? 'Импорт...' : 'Импорт'}
								</FileUploadButton>

								<a
									href={`${HTTP_BASE_URL}/api/school/settings?schedules=true&assignments=true&overrides=true`}
									className='flex-1'
								>
									<Button
										className='w-full py-2 h-9 flex items-center justify-center gap-2'
										variant='primary'
									>
										<Upload className='w-4 h-4' />
										Экспорт
									</Button>
								</a>
							</div>

							<Note>Загрузить или выгрузить настройки школы (формат JSON)</Note>
						</Value>
					</Field>

					{/* Сохранить */}
					<div className='mt-4'>
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
