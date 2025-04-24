import React from 'react';
import { Card } from 'react-bootstrap';
import { Mic } from 'react-bootstrap-icons';

const AnnouncementsPage = () => {
	return (
		<div className='mx-auto flex flex-col w-[30rem]'>
			<h1 className='text-4xl mx-auto mt-8 mb-16 font-semibold text-slate-500'>
				Объявления
			</h1>

			<Card className='flex flex-col w-80 mx-auto min-h-[25rem] items-center p-3 gap-3 bg-orange-50'>
				<span className='text-2xl mx-auto font-medium text-slate-600 mb-3'>
					Объявление в эфире
				</span>
				<button className='bg-slate-500 hover:bg-red-500 text-gray-200 p-4 rounded-full'>
					<Mic size={'50'} />
				</button>
				<span className='text-base font-semibold text-slate-500'>
					Начать эфир
				</span>
			</Card>
		</div>
	);
};

export default AnnouncementsPage;
