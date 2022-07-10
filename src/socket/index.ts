import { Server } from 'socket.io';
import * as config from './config';

export default (io: Server) => {
	io.on('connection', socket => {
		const username = socket.handshake.query.username;

		// io.of("/").adapter.on("create-room", (room: string) => {
		// 	console.log(`room ${room} was created`);
		// });
	});
};
