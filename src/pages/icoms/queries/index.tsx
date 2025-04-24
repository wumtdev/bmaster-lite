import { Card, Spinner } from 'react-bootstrap';

import * as icoms from '@/api/icoms';
import {
	Trash,
	MusicNote,
	PlayFill,
	ExclamationCircleFill,
	Gear,
	Wrench,
	PersonCircle,
	GearFill} from 'react-bootstrap-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';


const authorTypeIcons = {
	'service': <GearFill />,
	'root': <Wrench />,
	'account': <PersonCircle />
}

export function IcomQuery({
	queryInfo,
	onCancel
}: {
	queryInfo: icoms.QueryInfo;
	onCancel?: () => unknown;
}) {
	const queryClient = useQueryClient();
	const cancelQuery = useMutation({
		mutationFn: () => icoms.cancelQuery(queryInfo.id),
		onSuccess: () => {
			queryClient.invalidateQueries('icoms');
		}
	});

	

	switch (queryInfo.type) {
		case 'sounds.sound':
			let query = queryInfo as icoms.SoundQueryInfo;
			return (
				<div
					key={query.id}
					className={`flex rounded-lg items-center border ${
						query.status == icoms.QueryStatus.Playing &&
						'border-green-500 bg-green-50'
					}`}
				>
					{/* Основной контент */}
					<div className='flex-1 p-3'>
						<div className='flex items-center mb-1'>
							{query.status == icoms.QueryStatus.Playing && (
								<PlayFill className='text-green-500 mr-2' />
							)}
							<span className='font-medium flex items-center gap-1'>
								<MusicNote className='text-blue-500' />
								<span className='text-gray-700'>Звук</span>
							</span>

							{query.duration && (
								<span className='ml-3 text-sm text-gray-500'>
									{query.duration}
								</span>
							)}

							{/* Приоритет */}
							<div className='ml-auto flex items-center gap-1 text-orange-500'>
								<span className='text-sm font-medium'>
									{query.priority}
								</span>
								{query.force && (
									<ExclamationCircleFill className='text-sm' />
								)}
							</div>
						</div>

						<div className='flex items-center text-sm'>
							<span className='text-gray-600 truncate'>
								{query.sound_name}
							</span>
						</div>

						{
							query.author
							&& <div className='flex flex-row items-center mt-2 gap-2 text-gray-500'>
								{authorTypeIcons[query.author.type]}
								{query.author.name}
								<span className='text-gray-400 text-xs'>
									{query.author.label}
								</span>
							</div>
						}
					</div>

					{/* Кнопка удаления */}
					<button
						onClick={() => cancelQuery.mutate()}
						disabled={cancelQuery.isPending}
						className='w-6 h-28 bg-red-600 text-white flex items-center justify-center rounded-r-lg hover:bg-red-700'
					>
						{
							cancelQuery.isPending 
							? <Spinner className='w-4 h-4' />
							: <Trash size={18} />
						}
					</button>
				</div>
			);
	}
	return <Card>Запрос</Card>;
}
