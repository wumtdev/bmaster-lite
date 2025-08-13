import React, { useState } from 'react';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'tailwindcss/tailwind.css';

const CalendarUI: React.FC = () => {
	const [selectedDay, setSelectedDay] = useState<number | null>(null);
	const [ringStates, setRingStates] = useState([true, false, false, false]);

	const toggleRing = (index: number) => {
		const newStates = [...ringStates];
		newStates[index] = !newStates[index];
		setRingStates(newStates);
	};

	const daysOfWeek = ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'];

	return (
		<div className='bg-white text-black p-4 rounded shadow-md w-full max-w-4xl mx-auto border'>
			<h1 className='text-2xl font-bold mb-4'>Календарь</h1>
			<div className='grid grid-cols-[2fr_1fr] gap-4'>
				{/* Calendar */}
				<div>
					<div className='flex justify-between items-center mb-2'>
						<span className='fw-bold'>Сентябрь 2025</span>
						<button className='btn btn-outline-secondary btn-sm'>
							&#x21bb;
						</button>
					</div>

					<div className='grid grid-cols-7 text-center font-bold'>
						{daysOfWeek.map((day) => (
							<div key={day}>{day}</div>
						))}
					</div>

					<div className='grid grid-cols-7 text-center gap-1 mt-1'>
						{[...Array(30)].map((_, i) => {
							const day = i + 1;
							const isSelected = selectedDay === day;
							return (
								<div
									key={day}
									className={`p-2 cursor-pointer rounded ${
										isSelected ? 'bg-red-200' : 'hover:bg-gray-200'
									}`}
									onClick={() => setSelectedDay(day)}
								>
									{day}
								</div>
							);
						})}
					</div>
				</div>

				{/* Right panel */}
				<div>
					<h5 className='mb-2'>Звонки</h5>
					{[0, 1, 2, 3].map((ring, idx) => (
						<div key={idx} className='flex items-center gap-2 mb-1'>
							<input
								type='checkbox'
								checked={ringStates[idx]}
								onChange={() => toggleRing(idx)}
							/>
							<span>
								{idx === 0
									? '8:30 - 9:15'
									: idx === 1
									? '--'
									: idx === 2
									? '--'
									: '--'}
							</span>
						</div>
					))}

					<div className='border-t my-2'></div>
					<p className='text-sm'>8:30 - 12:00 (Время мута)</p>

					<div className='mt-4'>
						<button className='btn btn-warning w-100 mb-2'>
							Новое расписание
						</button>
						{daysOfWeek.map((day) => (
							<div key={day} className='flex justify-between items-center mb-1'>
								<span>{day}</span>
								<button className='btn btn-outline-secondary btn-sm'>
									Шаблон
								</button>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
};

export default CalendarUI;
