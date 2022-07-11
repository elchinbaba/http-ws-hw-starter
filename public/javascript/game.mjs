import { showInputModal } from "./views/modal.mjs";
import { appendRoomElement, removeRoomElement } from "./views/room.mjs";
import { addClass, removeClass } from "./helpers/domHelper.mjs";
import { appendUserElement, removeUserElement, changeReadyStatus } from "./views/user.mjs";

const addRoomBtn = document.getElementById('add-room-btn');
const gamePage = document.getElementById('game-page');
const roomsPage = document.getElementById('rooms-page');
const quitRoomBtn = document.getElementById('quit-room-btn');
const roomNameH1 = document.getElementById('room-name');
const readyBtn = document.getElementById('ready-btn');

const username = sessionStorage.getItem('username');

if (!username) {
	window.location.replace('/login');
}

const socket = io('', { query: { username } });

let previousRooms = null;

socket.emit('join');

socket.on('join', (rooms) => {
	// console.log('join', rooms);
	if (previousRooms) {
		previousRooms.forEach(room => {
			removeRoomElement(room.name);	
		});
	}
	rooms.forEach(room => {
		appendRoomElement({ name: room.name, numberOfUsers: room.players.length, onJoin: () => onJoin(room) });
	});
	previousRooms = rooms;
});

let roomName = "";
let previousRoom = null;

const onJoin = (room) => {
	// console.log(room);
	socket.emit('join_room', room.name);
};

socket.on('join_room', (room) => {
	addClass(roomsPage, 'display-none');
	removeClass(gamePage, 'display-none');
	roomNameH1.textContent = room.name;
	if (previousRoom) {
		previousRoom.players.forEach(player => {
			removeUserElement(player.name);
		})
	}
	// console.log(room);
	for (let i = 0; i < room.players.length - 1; i++) {
		appendUserElement({ username: room.players[i].name, ready: room.players[i].isReady, isCurrentUser: false });
	}
	appendUserElement({ username, ready: false, isCurrentUser: true });
	previousRoom = room;
	// console.log(previousRoom);
});

const addRoom = () => {
	socket.emit("create-room", roomName);
};

socket.on('create-room', (room) => {
	appendRoomElement({ name: room.name, numberOfUsers: 0, onJoin: () => onJoin(room) });
	addClass(roomsPage, 'display-none');
	removeClass(gamePage, 'display-none');
	roomNameH1.innerText = room.name;
	previousRooms.forEach(room => {
		removeRoomElement(room.name);
	})
	appendUserElement({ username, ready: false, isCurrentUser: true });
	previousRoom = room;
	if (previousRooms) {
		previousRooms = [...previousRooms, room];
	}
	else {
		previousRooms = [room];
	}
	socket.emit('join');
	// console.log(previousRooms);
});

const onClickAddRoomBtn = () => {
    showInputModal({ title: 'Add Room', onChange: (inputValue) => roomName = inputValue, onSubmit: addRoom });
};

addRoomBtn.addEventListener('click', onClickAddRoomBtn);

const onClickQuitRoomBtn = () => {
	const roomName = previousRoom.name;
	socket.emit('quit', roomName);
	socket.emit('join');
};

socket.on('quit', (data) => {
	// console.log(data.room);
	data.room.players.forEach(player => {
		// console.log(player);
		removeUserElement(player.name);
	});
	removeUserElement(data.username);
	removeClass(roomsPage, 'display-none');
	addClass(gamePage, 'display-none');
})

quitRoomBtn.addEventListener('click', onClickQuitRoomBtn);

socket.on('add_player_to_room', (user) => {
	// console.log('user', user);
	appendUserElement({ username: user, ready: false, isCurrentUser: false });
});

socket.on('remove_user_from_room', (user) => {
	removeUserElement(user);
});

const onClickReadyBtn = (event) => {
	socket.emit('click-ready', previousRoom.name);
	if (event.target.innerText === 'READY') {
		event.target.innerText = 'NOT READY';
	}
	else if (event.target.innerText === 'NOT READY') {
		event.target.innerText = 'READY';
	}
};

socket.on('click-ready', data => {
	changeReadyStatus(data);
});

readyBtn.addEventListener('click', onClickReadyBtn);

socket.on('disconnection', (username) => {
	removeUserElement(username);
});