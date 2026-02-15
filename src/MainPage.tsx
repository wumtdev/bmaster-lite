// @ts-nocheck
import { Link, Routes, Route } from 'react-router-dom';
import { Container, Navbar, Nav, Card, Spinner } from 'react-bootstrap';
import {
	DoorOpen,
	Person,
	Gear,
	BellFill,
	Bell,
	CalendarDate,
	Mic,
	List,
	MusicNoteList,
	PlayFill,
	PersonCircle,
	Wrench
} from 'react-bootstrap-icons';
import { useQuery } from '@tanstack/react-query';
import { AccountLocalInfo, getLocalUser } from '@/api/auth';
import ForegroundNotification from '@/components/ForegroundNotification';
import Clock from './components/Clock';
import { LocalUserProvider } from '@/contexts/LocalUserContext';

import BellsPage from '@/pages/BellsPage';
import AnnouncementsPage from '@/pages/AnnouncementsPage';
import SoundsPage from '@/pages/SoundsPage';
import CalendarPage from '@/pages/school/CalendarPage';
import SchedulesPage from '@/pages/school/SchedulesPage';

import TodayPage from '@/pages/school/TodayPage';
import DraggableCard from '@/components/DraggableCard';
import * as icoms from '@/api/icoms';
import { IcomQuery } from '@/pages/icoms/queries';
import SettingsPage from './pages/SettingsPage';
import { H2, Note } from './components/text';
import Button from './components/Button';
import Foreground from './components/Foreground';
import Panel from './components/Panel';

import { useState, useEffect } from 'react';
import AccountsPage from './pages/access/AccountsPage';

export default function MainPage() {
	const {
		data: localUser,
		isLoading,
		isError
	} = useQuery({
		queryFn: () => getLocalUser(),
		queryKey: ['localUser'],
		retry: (failureCount) => failureCount < 2
	});

	const mainIcomQuery = useQuery({
		queryFn: () => icoms.getIcom('main'),
		queryKey: ['icoms'],
		refetchInterval: 2000
	});

	const handleLogout = () => {
		localStorage.removeItem('bmaster.auth.token');
		window.location.href = '/';
	};

	if (isLoading)
		return (
			<>
				<Foreground>
					<Panel>
						<Panel.Header>Авторизация</Panel.Header>
						<Panel.Body className='space-y-4'>
							<Note className='text-slate-600'>Входим в систему…</Note>
						</Panel.Body>
					</Panel>
				</Foreground>
			</>
		);
	else if (isError || !localUser)
		return (
			<>
				<Foreground>
					<Panel>
						<Panel.Header>
							<H2>Ошибка авторизации</H2>
						</Panel.Header>
						<Panel.Body className='space-y-4'>
							<Note className='text-slate-600'>
								Произошла ошибка авторизации. Пожалуйста, выйдите с помощью
								кнопки ниже и войдите снова.
							</Note>
							<Button variant='primary' onClick={handleLogout}>
								Выйти
							</Button>
						</Panel.Body>
					</Panel>
				</Foreground>
			</>
		);

	const mainIcom = mainIcomQuery.data;

	let profile;
	switch (localUser.type) {
		case 'account':
			const account = localUser as AccountLocalInfo;
			profile = (
				<>
					<PersonCircle size='1.2rem' />
					<span>{account.name}</span>
				</>
			);
			break;
		case 'root':
			profile = (
				<>
					<Wrench size='1.2rem' />
					<span>Администратор</span>
				</>
			);
			break;
	}

	console.log('H1', localUser);

	return (
		<LocalUserProvider localUser={localUser}>
			<div className='flex flex-col relative w-screen h-screen'>
				<div className='flex gap-4 px-[4rem] py-[0.4rem] items-center justify-center bg-[#F1F5F9] shadow-md'>
					<div className='flex items-center gap-3'>
						<Link
							to='/'
							className='flex gap-2 items-center font-semibold text-3xl text-slate-700'
						>
							<BellFill className='origin-top hover:animate-ring' />
							<span className=''>BMaster</span>
						</Link>
						<Clock />
					</div>

					<div className='text-xl flex flex-wrap gap-1 space-x-4 overflow-x-auto'>
						<Link to='/school/today' className='flex items-center gap-2'>
							<Bell /> Сегодня
						</Link>
						<Link to='/school/schedules' className='flex items-center gap-2'>
							<List /> Расписания
						</Link>
						<Link to='/school/calendar' className='flex items-center gap-2'>
							<CalendarDate /> Календарь
						</Link>
						<Link to='/announcements' className='flex items-center gap-2'>
							<Mic /> Объявления
						</Link>
						<Link to='/sounds' className='flex items-center gap-2'>
							<MusicNoteList /> Звуки
						</Link>
						<Link to='/settings' className='flex items-center gap-2'>
							<Gear /> Настройки
						</Link>
						<Link to='/accounts' className='flex items-center gap-2'>
							<Person /> Пользователи
						</Link>
					</div>
					{localUser && (
						<div className='flex flex-col gap-1 text-sm text-gray-700 mt-4 mb-4'>
							<div className='flex gap-1'>{profile}</div>
							<button className='flex gap-1' onClick={handleLogout}>
								<DoorOpen size='1.2rem' />
								<span>Выйти</span>
							</button>
						</div>
					)}
				</div>

				{/* Main Content */}
				<main className='flex-1 py-4 overflow-y-auto'>
					{/* <Container fluid='xl'> */}
					<Routes>
						<Route path='/' element={<TodayPage />} />
						<Route path='/school/today' element={<TodayPage />} />
						<Route path='/school/schedules' element={<SchedulesPage />} />
						<Route path='/school/calendar' element={<CalendarPage />} />
						<Route path='/announcements' element={<AnnouncementsPage />} />
						<Route path='/sounds' element={<SoundsPage />} />
						<Route path='/settings' element={<SettingsPage />} />
						<Route path='/accounts' element={<AccountsPage />} />
					</Routes>
				</main>

				<footer className='bg-slate-400 flex p-10 font-bold'>BMaster</footer>
			</div>
			{/* Очередь воспроизведения */}
			<DraggableCard
				fixedX
				className='
					fixed sm:absolute
					bottom-4 top-auto
					left-2 right-2
					sm:left-auto
					sm:right-10
					sm:top-10
					w-auto
					sm:w-80
					max-w-full
					z-50
				'
				header={
					<span className='flex items-center gap-1 text-slate-700 font-medium truncate'>
						<span className='mr-2 truncate'>Воспроизведение</span>
						{mainIcom?.playing && <PlayFill size='1rem' />}
					</span>
				}
			>
				<Card.Body className='overflow-y-clip truncate min-h-0 max-h-[60vh]'>
					{mainIcom ? (
						<div className='flex flex-col gap-2'>
							{mainIcom.playing && <IcomQuery queryInfo={mainIcom.playing} />}
							{mainIcom.queue.map((q) => (
								<IcomQuery key={q.id} queryInfo={q} />
							))}
							{!mainIcom.playing && mainIcom.queue.length === 0 && (
								<Note>Очередь воспроизведения пуста</Note>
							)}
						</div>
					) : (
						<div className='flex items-center gap-2'>
							<Spinner /> Загрузка...
						</div>
					)}
				</Card.Body>
			</DraggableCard>
		</LocalUserProvider>
	);
}
