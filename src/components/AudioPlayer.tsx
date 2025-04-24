import { AudioHTMLAttributes, HTMLAttributes } from "react";


export default function AudioPlayer(attrs: AudioHTMLAttributes<HTMLAudioElement>) {
	return (
		<audio controls {...attrs} />
	)
}
