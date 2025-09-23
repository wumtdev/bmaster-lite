// @ts-nocheck
import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Form, Spinner } from 'react-bootstrap';
import Panel from '@/components/Panel';
import Field from '@/components/Field';
import { H1, Name, Value, Note } from '@/components/text';
import Button from '@/components/Button';
import { getLocalUser /*, createUser */ } from '@/api/auth';

// !!! CHATGPT МОМЕНТ !!!
// !!! CHATGPT МОМЕНТ !!!
// !!! CHATGPT МОМЕНТ !!!

// Если в вашем проекте ещё нет createUser в api/auth, ниже — пример реализации.
// Поместите в '@/api/auth' (или адаптируйте под свой модуль):
/*
export async function createUser(payload) {
	const res = await fetch('/api/admin/users', {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify(payload)
	});
	if (!res.ok) throw new Error((await res.json()).message || 'Ошибка при создании пользователя');
	return res.json();
}
*/

const CreateUserPage = () => {
	// проверяем кто пользователь — только root имеет доступ
	const { data: localUser, isLoading: isLocalUserLoading } = useQuery({
		queryKey: ['localUser_for_create_user'],
		queryFn: () => getLocalUser(),
		retry: (f) => f < 2
	});

	const [login, setLogin] = useState('');
	const [password, setPassword] = useState('');
	const [confirm, setConfirm] = useState('');

	const [message, setMessage] = useState(null);

	// Подключите реальную функцию createUser из вашего api/auth
	const createUserFn = async (payload) => {
		// если у вас есть createUser импортируйте и используйте её.
		const res = await fetch('/api/accounts', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify(payload)
		});
		if (!res.ok) throw new Error((await res.json()).message || 'Ошибка');
		return res.json();
	};

	const createMut = useMutation({
		mutationFn: createUserFn,
		onSuccess: (data) => {
			setMessage({ type: 'success', text: 'Пользователь успешно создан' });
			setLogin('');
			setPassword('');
			setConfirm('');
		},
		onError: (err) => {
			setMessage({ type: 'error', text: err.message || 'Ошибка создания' });
		}
	});

	if (isLocalUserLoading) {
		return (
			<Panel>
				<Panel.Header>Создание пользователя</Panel.Header>
				<Panel.Body className='p-5'>
					<div className='flex justify-center'>
						<Spinner />
					</div>
				</Panel.Body>
			</Panel>
		);
	}

	if (!localUser || localUser.type !== 'root') {
		return (
			<Panel>
				<Panel.Header>Доступ запрещён</Panel.Header>
				<Panel.Body className='p-5'>
					<Note>Создавать пользователей может только администратор.</Note>
				</Panel.Body>
			</Panel>
		);
	}

	const valid =
		login.trim().length > 0 && password.length >= 6 && password === confirm;

	return (
		<div className='mx-auto flex flex-col w-full max-w-md p-4'>
			<H1>Создать пользователя</H1>
			<Panel>
				<Panel.Body className='p-5'>
					<div className='flex flex-col gap-6'>
						{message && (
							<div
								className={`p-3 rounded ${
									message.type === 'success'
										? 'bg-emerald-100 text-emerald-800'
										: 'bg-rose-100 text-rose-800'
								}`}
							>
								{message.text}
							</div>
						)}

						<Field>
							<Name>Логин</Name>
							<Value>
								<Form.Control
									type='text'
									value={login}
									onChange={(e) => setLogin(e.target.value)}
									placeholder='Логин'
								/>
							</Value>
						</Field>

						<Field>
							<Name>Пароль</Name>
							<Value>
								<Form.Control
									type='password'
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									placeholder='Пароль (мин. 6 символов)'
								/>
							</Value>
							<Note>Пароль должен быть минимум 6 символов</Note>
						</Field>

						<Field>
							<Name>Подтверждение пароля</Name>
							<Value>
								<Form.Control
									type='password'
									value={confirm}
									onChange={(e) => setConfirm(e.target.value)}
									placeholder='Повторите пароль'
								/>
							</Value>
						</Field>

						<div className='mt-4'>
							<Button
								disabled={!valid || createMut.isLoading}
								onClick={() =>
									createMut.mutate({
										name: login.trim(),
										password,
										role_ids: [1000]
									})
								}
								className='w-full py-2 text-lg'
								variant='primary'
							>
								{createMut.isLoading ? 'Создание...' : 'Создать пользователя'}
							</Button>
						</div>
					</div>
				</Panel.Body>
			</Panel>
		</div>
	);
};

export default CreateUserPage;
