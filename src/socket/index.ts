import { Server } from 'socket.io';
import * as config from './config';
import { texts } from '../data';

import { IRooms, IRoom, IPlayer } from '../interface/rooms';

let rooms: Array<IRoom>;

const roomsMap: Map<string, IRoom> = new Map();
const usersMap: Map<string, string | string[] | undefined> = new Map();

export default (io: Server) => {
	io.on('connection', socket => {
		const username = socket.handshake.query.username;
		// console.log('username', username);
		usersMap.set(socket.id, username);

		socket.on('login check', (inputValue) => {
			let canPass = true;
			for (let [id, user] of usersMap) {
				if (user === inputValue) {
					canPass = false;
					break;
				}
			}
			socket.emit('login check', canPass, inputValue);
			if (!canPass) socket.emit('show error modal', 'there is already user with this name');
		})

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
			// console.log(room.players);
			if (room.players) {
				for (let i in room.players) {
					if (room.players[i].name === usersMap.get(socket.id))
					{
						room.players.splice(i, 1);
						break;
					}
				}
			}
			
			// console.log(room.players);
			
			// console.log(room);
			io.to(socket.id).emit('quit', { username: usersMap.get(socket.id), room });
			if (room.players.length === 0) {
				roomsMap.delete(roomName);
				io.sockets.emit('remove room', roomName);
			}

			if (room.players.length !== 0) {
				roomsMap.set(roomName, room);
				room = roomsMap.get(roomName);
				socket.broadcast.to(room.name).emit('remove_user_from_room', usersMap.get(socket.id));
				let check: boolean = true;
				for (let i = 0; i < room.players.length; i++) {
					if (room.players[i].isReady === false) {
						check = false;
						break;
					}
				}
				if (check) {
					room = roomsMap.get(roomName);
					room.hasGameStarted = true;
					roomsMap.set(roomName, room);
					io.to(roomName).emit('start-game', roomsMap.get(roomName), config.SECONDS_TIMER_BEFORE_START_GAME);
				}
				// console.log('after quitting room', room);
			}
		});

		socket.on('create-room', (roomName: string) => {
			if (roomsMap.has(roomName)) {
				socket.emit('create-room', null);
				socket.emit('show error modal', 'there is already a room with this name');
			}
			else {
				socket.join(roomName);
				const player: IPlayer = {
					name: usersMap.get(socket.id),
					isReady: false,
					progress: 0
				};
				const room: IRoom = {
					name: roomName,
					players: [player],
					hasGameStarted: false
				}
				roomsMap.set(roomName, room);
				io.to(socket.id).emit('create-room', room);
				// console.log('create', roomsMap);
			}
		});

		socket.on('join_room', (roomName) => {
			// console.log(roomName);
			if (!roomsMap.get(roomName)?.hasGameStarted) {
				socket.join(roomName);
				let room: any = roomsMap.get(roomName);
				// console.log('rooms', io.of('/').adapter.rooms);
				// console.log('roomName', roomName);
				// console.log(room);
				room.players.push({ name: usersMap.get(socket.id), isReady: false, progress: 0 });
				// console.log(room);
				roomsMap.set(roomName, room);
				room = roomsMap.get(roomName);
				io.to(socket.id).emit('join_room', room);
				socket.broadcast.to(room.name).emit('add_player_to_room', usersMap.get(socket.id));
				io.sockets.emit('update number of players', room);
				// console.log('after joining room', room);
			}
		});

		socket.on('click-ready', (roomName) => {
			let room: any = roomsMap.get(roomName);
			let user: any = null;
			room.players.forEach(player => {
				if (player.name === usersMap.get(socket.id)) {
					player.isReady = !player.isReady;
					user = player;
				}
			});
			roomsMap.set(roomName, room);
			io.to(roomName).emit('click-ready', { username: user.name, ready: user.isReady });

			let check: boolean = true;
			for (let i = 0; i < room.players.length; i++) {
				if (room.players[i].isReady === false) {
					check = false;
					break;
				}
			}
			if (check) {
				room = roomsMap.get(roomName);
				room.hasGameStarted = true;
				roomsMap.set(roomName, room);
				io.to(roomName).emit('start-game', roomsMap.get(roomName), config.SECONDS_TIMER_BEFORE_START_GAME);
			}
		});

		socket.on('play', (roomName, text) => {
			const room = roomsMap.get(roomName);
			io.to(socket.id).emit('game', room, config.SECONDS_FOR_GAME, text);
			io.to(roomName).emit('play', room, config.SECONDS_FOR_GAME, text);
		});

		socket.on('set progress', (roomName, progress) => {
			let room: any = roomsMap.get(roomName);
			room.players.forEach(player => {
				if (player.name === usersMap.get(socket.id)) {
					player.progress = progress;
				}
			});
			roomsMap.set(roomName, room);
			io.to(roomName).emit('set progress', { username: usersMap.get(socket.id), progress });
			if (progress === 100) {
				setTimeout(() => {
					io.to(roomName).emit('game finish', room);
					room.hasGameStarted = false;
					room.players.forEach(player => {
						player.isReady = false;
						player.progress = 0;
					});
					roomsMap.set(roomName, room);
				}, 1000);
			}
		});

		socket.on('game finish', (roomName) => {
			const room = roomsMap.get(roomName);
			if (room?.hasGameStarted) {
				setTimeout(() => {
					io.to(roomName).emit('game finish', room);
					room.hasGameStarted = false;
					room.players.forEach(player => {
						player.isReady = false;
						player.progress = 0;
					});
					roomsMap.set(roomName, room);
				}, 1000);
				
				// io.to(roomName).emit('deactivate readiness', room);
			}
		});

		socket.on('disconnect', () => {
			const username: any = usersMap.get(socket.id);
			let check: boolean;
			let text: string;
			for (let [id, room] of roomsMap) {
				for (let i = 0; i < room.players.length; i++) {
					if (room.players[i].name === username) {
						socket.leave(room.name);
						room.players.splice(i, 1);
						io.to(room.name).emit('disconnection', usersMap.get(socket.id));
						if (room.players.length === 0) {
							roomsMap.delete(room.name);
							io.sockets.emit('remove room', room.name);
						}
						if (room.players.length !== 0) {
							io.sockets.emit('reduce number of players', room);
							check = true;
							for (let j = 0; j < room.players.length; j++) {
								if (room.players[j].isReady === false) {
									check = false;
									break;
								}
							}
							if (check) {
								room.hasGameStarted = true;
								roomsMap.set(room.name, room);
								io.to(room.name).emit('start-game', roomsMap.get(room.name), config.SECONDS_TIMER_BEFORE_START_GAME);
							}
							roomsMap.set(id, room);
						}
						break;
					}
				}
			}
			usersMap.delete(socket.id);			
		});
	});
};
