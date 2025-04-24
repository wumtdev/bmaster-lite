import api from "@/api";

export interface SoundInfo {
	name: string;
	size: number;
}

export async function getSoundInfo(): Promise<SoundInfo[]> {
	return (await api.get<SoundInfo[]>('sounds/info')).data;
}
