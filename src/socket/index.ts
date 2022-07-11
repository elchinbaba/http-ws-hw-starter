import { Server } from 'socket.io';
import * as config from './config';

import { IRooms, IRoom, IPlayer } from '../interface/rooms';

let rooms: Array<IRoom>;

const roomsMap: Map<string, IRoom> = new Map();
const usersMap: Map<string, string | string[] | undefined> = new Map();

export default (io: Server) => {
	io.on('connection', socket => {
		const username = socket.handshake.query.username;
		// console.log('username', username);
		usersMap.set(socket.id, username);

		socket.on('join', () => {
			rooms = [];
			for (let [id, room] of roomsMap) {
				rooms.push(room);
			}
			// console.log('join', rooms);
			io.sockets.emit('join', rooms);
		});

		socket.on('quit', (roomName) => {
			socket.leave(roomName);
			let room: any = roomsMap.get(roomName);
			// console.log(room);
			if (room) {
				// console.log(room.players);
				for (let i in room.players) {
					if (room.players[i].name === usersMap.get(socket.id))
					{
						room.players.splice(i, 1);
						break;
					}
				}
				// console.log(room.players);
				roomsMap.set(roomName, room);
			}
			room = roomsMap.get(roomName);
			// console.log(room);
			io.to(socket.id).emit('quit', { username: usersMap.get(socket.id), room });
			socket.broadcast.to(room.name).emit('remove_user_from_room', usersMap.get(socket.id));
			// console.log('after quitting room', room);
		});

		socket.on('create-room', (roomName: string) => {
			socket.join(roomName);
			const player: IPlayer = {
				name: usersMap.get(socket.id),
				isReady: false
			};
			const room: IRoom = {
				name: roomName,
				players: [player]
			}
			// if (!roomsMap.has(roomName)) {
				roomsMap.set(roomName, room);
			// }
			io.to(socket.id).emit('create-room', room);
			// console.log('create', roomsMap);
		});

		socket.on('join_room', (roomName) => {
			// console.log(roomName);
			socket.join(roomName);
			let room: any = roomsMap.get(roomName);
			// console.log('rooms', io.of('/').adapter.rooms);
			// console.log('roomName', roomName);
			// console.log(room);
			room.players.push({ name: usersMap.get(socket.id), isReady: false });
			// console.log(room);
			roomsMap.set(roomName, room);
			room = roomsMap.get(roomName);
			io.to(socket.id).emit('join_room', room);
			socket.broadcast.to(room.name).emit('add_player_to_room', usersMap.get(socket.id));
			// console.log('after joining room', room);
		});

		socket.on('click-ready', (roomName) => {
			const room: any = roomsMap.get(roomName);
			let user: any = null;
			room?.players.forEach(player => {
				if (player.name === usersMap.get(socket.id)) {
					player.isReady = !player.isReady;
					user = player;
				}
			});
			roomsMap.set(roomName, room);
			io.to(roomName).emit('click-ready', { username: user.name, ready: user.isReady });
		});

		socket.on('disconnect', () => {
			const username: any = usersMap.get(socket.id);
			for (let [id, room] of roomsMap) {
				socket.leave(room.name);
				for (let i = 0; i < room.players.length; i++) {
					if (room.players[i].name === username) {
						room.players.splice(i, 1);
					}
				}
				roomsMap.set(id, room);
			}
			io.sockets.emit('disconnection', usersMap.get(socket.id));
		});
	});
};
