import { Link, Routes, Route } from 'react-router-dom';
import { Container, Navbar, Nav, Card, Spinner } from 'react-bootstrap';
import {
	DoorOpen,
	Person,
	Gear,
	BellFill,
	Bell,
	Mic,
	MusicNoteList,
	PlayFill
} from 'react-bootstrap-icons';
import { useQuery } from '@tanstack/react-query';
import { getLocalUser } from '@/api/auth';
import ForegroundNotification from '@/components/ForegroundNotification';
import { LocalUserProvider } from '@/contexts/LocalUserContext';
import BellsPage from '@/pages/BellsPage';
import AnnouncementsPage from '@/pages/AnnouncementsPage';
import SoundsPage from '@/pages/SoundsPage';
import DraggableCard from '@/components/DraggableCard';
import * as icoms from '@/api/icoms';
import { IcomQuery } from '@/pages/icoms/queries';

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

	return (
		<LocalUserProvider localUser={localUser}>
			<div className='flex flex-col relative w-screen h-screen overflow-y-auto'>
				<Navbar expand='lg' className='px-3 bg-slate-300'>
					<Container>
						{/* Brand Section */}
						<Navbar.Brand className='mr-14'>
							<Link
								to='/'
								className='flex flex-col items-center font-semibold text-slate-700'
							>
								<BellFill size='70' />
								BMaster
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
									to='/settings'
									className='d-flex flex-row items-center m-2 gap-2'
								>
									<Gear /> Настройки
								</Link>
							</Nav>

							{/* User Info Section */}

							{localUser && (
								<div className='d-flex flex-col text-sm mt-4 mb-4'>
									<div className='d-flex flex-row mb-1'>
										<Person size={20} className='mr-2' />
										<span>{localUser?.name || 'Сервис'}</span>
									</div>
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
						</Routes>
					</Container>
				</main>

				<footer className='bg-slate-500 flex flex-row p-10 font-bold'>
					{/* <img src='/logo.gif' alt='' className='w-20 animate-ping' /> */}
					BMaster
				</footer>
			</div>
			<DraggableCard
				fixedX
				className='right-10 w-80'
				header={
					<span className='flex flex-row items-center gap-1 text-slate-700 font-medium'>
						<span className='mr-3'>Воспроизведение</span> {mainIcom && mainIcom.playing && <PlayFill className='' size={'1.2rem'}/>}
					</span>
				}
			>
				<Card.Body className='overflow-y-auto'>
					{mainIcom ? (
						<div className='flex flex-col gap-2'>
							{mainIcom.playing && <IcomQuery queryInfo={mainIcom.playing} />}
							{mainIcom.queue.map((q) => (
								<IcomQuery queryInfo={q} />
							))}
							{!mainIcom.playing && mainIcom.queue.length === 0 && (
								<>Очередь воспроизведения пуста</>
							)}
						</div>
					) : (
						<>
							<Spinner /> Загрузка...
						</>
					)}
				</Card.Body>
			</DraggableCard>
		</LocalUserProvider>
	);
}
