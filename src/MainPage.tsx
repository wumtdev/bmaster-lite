import { Link, Routes, Route } from 'react-router-dom';
import { Container, Navbar, Nav, Card, Spinner } from 'react-bootstrap';
import {
	DoorOpen,
	Person,
	Gear,
	BellFill,
	Bell,
	Calendar,
	Mic,
	MusicNoteList,
	PlayFill,
	PersonCircle,
	Wrench
} from 'react-bootstrap-icons';
import { useQuery } from '@tanstack/react-query';
import { AccountLocalInfo, getLocalUser } from '@/api/auth';
import ForegroundNotification from '@/components/ForegroundNotification';
import { LocalUserProvider } from '@/contexts/LocalUserContext';
import BellsPage from '@/pages/BellsPage';
import AnnouncementsPage from '@/pages/AnnouncementsPage';
import SoundsPage from '@/pages/SoundsPage';
import CalendarUI from '@/pages/CalendarUI';
import DraggableCard from '@/components/DraggableCard';
import * as icoms from '@/api/icoms';
import { IcomQuery } from '@/pages/icoms/queries';
import SettingsPage from './pages/SettingsPage';

export default function MainPage() {
	const {
		data: localUser,
		isLoading,
		isError
	} = useQuery({
		queryFn: () => getLocalUser(),
		queryKey: ['localUser']
	});

	const mainIcomQuery = useQuery({
		queryFn: () => icoms.getIcom('main'),
		queryKey: ['icoms'],
		refetchInterval: 2000
	});

	if (isLoading)
		return <ForegroundNotification>Авторизация...</ForegroundNotification>;
	else if (isError || !localUser)
		return <ForegroundNotification>Ошибка авторизации</ForegroundNotification>;

	const handleLogout = () => {
		localStorage.removeItem('bmaster.auth.token');
		window.location.href = '/';
	};

	const mainIcom = mainIcomQuery.data;

	let profile;
	switch (localUser.type) {
		case 'account':
			const account = localUser as AccountLocalInfo;
			profile = (
				<>
					<PersonCircle size='20' className='mr-2' />
					<span>{account.name}</span>
				</>
			);
			break;
		case 'root':
			profile = (
				<>
					<Wrench size='20' className='mr-2' />
					<span>Администратор</span>
				</>
			);
			break;
	}

	console.log('H1', localUser);

	return (
		<LocalUserProvider localUser={localUser}>
			<div className='flex flex-col relative w-screen h-screen overflow-y-auto'>
				{/* Шапка */}
				<Navbar expand='lg' className='px-3 bg-[#F1F5F9] shadow-md'>
					<Container>
						{/* Brand Section */}
						<Navbar.Brand className='mr-14'>
							<Link
								to='/'
								className='flex flex-col items-center font-semibold text-slate-700'
							>
								<BellFill size={70} className="text-[#2563EB] hover:animate-ring origin-top" />
    							<span className="text-[#0F172A]">BMaster</span>
							</Link>
						</Navbar.Brand>

						<Navbar.Toggle aria-controls='main-navbar' />

						<Navbar.Collapse id='main-navbar'>
							{/* Navigation Links */}
							<Nav className='me-auto text-xl flex gap-3'>
								<Link to='/' className='d-flex flex-row items-center m-2 gap-2'>
									<Bell /> Звонки
								</Link>
								<Link
									to='/announcements'
									className='d-flex flex-row items-center m-2 gap-2'
								>
									<Mic /> Объявления
								</Link>
								<Link
									to='/sounds'
									className='d-flex flex-row items-center m-2 gap-2'
								>
									<MusicNoteList /> Звуки
								</Link>
								<Link
									to='/calendar'
									className='d-flex flex-row items-center m-2 gap-2'
								>
									<Calendar /> Календарь
								</Link>
								<Link
									to='/settings'
									className='d-flex flex-row items-center m-2 gap-2'
								>
									<Gear /> Настройки
								</Link>
							</Nav>

							{/* User Info Section */}

							{localUser && (
								<div className='d-flex flex-col text-sm text-gray-700 mt-4 mb-4'>
									<div className='d-flex flex-row mb-1'>{profile}</div>
									<div
										className='d-flex flex-row mb-1 cursor-pointer'
										onClick={handleLogout}
									>
										<DoorOpen size={20} className='mr-2' />
										<span>Выйти</span>
									</div>
								</div>
							)}
						</Navbar.Collapse>
					</Container>
				</Navbar>

				{/* Main Content */}
				<main className='flex-grow-1 py-4'>
					<Container fluid='xl'>
						<Routes>
							<Route path='/' element={<BellsPage />} />
							<Route path='/bells' element={<BellsPage />} />
							<Route path='/announcements' element={<AnnouncementsPage />} />
							<Route path='/sounds' element={<SoundsPage />} />
							<Route path='/calendar' element={<CalendarUI />} />
							<Route path='/settings' element={<SettingsPage />} />
						</Routes>
					</Container>
				</main>
				{/* Подвал */}
				<footer className='bg-slate-400 flex flex-row p-10 font-bold'>
					BMaster
				</footer>
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
				<Card.Body className='overflow-y-auto max-h-[60vh]'>
					{mainIcom ? (
						<div className='flex flex-col gap-2'>
							{mainIcom.playing && <IcomQuery queryInfo={mainIcom.playing} />}
							{mainIcom.queue.map((q) => (
								<IcomQuery key={q.id} queryInfo={q} />
							))}
							{!mainIcom.playing && mainIcom.queue.length === 0 && (
								<>Очередь воспроизведения пуста</>
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
