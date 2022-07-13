import { showInputModal, showMessageModal, showResultsModal } from "./views/modal.mjs";
import { appendRoomElement, removeRoomElement, updateNumberOfUsersInRoom } from "./views/room.mjs";
import { addClass, removeClass } from "./helpers/domHelper.mjs";
import { appendUserElement, removeUserElement, changeReadyStatus, setProgress } from "./views/user.mjs";

const addRoomBtn = document.getElementById('add-room-btn');
const gamePage = document.getElementById('game-page');
const roomsPage = document.getElementById('rooms-page');
const quitRoomBtn = document.getElementById('quit-room-btn');
const roomNameH1 = document.getElementById('room-name');
const readyBtn = document.getElementById('ready-btn');
const timer = document.getElementById('timer');
const textContainer = document.getElementById('text-container');
const gameTimer = document.getElementById('game-timer');
const gameTimerSeconds = document.getElementById('game-timer-seconds');

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

socket.on('update number of players', (room) => {
	updateNumberOfUsersInRoom({ name: room.name, numberOfUsers: room.players.length })
}) 

const addRoom = () => {
	addRoomBtn.disabled = false;
	if (roomName) socket.emit("create-room", roomName);
	else showMessageModal({ message: 'name cannot be empty' })
};

socket.on('create-room', (room) => {
	if (room) {
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
	}
});

socket.on('show error modal', (message) => {
	showMessageModal({ message });
});

const onClickAddRoomBtn = () => {
	addRoomBtn.disabled = true;
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
	console.log(previousRoom);
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

socket.on('reduce number of players', (room) => {
	updateNumberOfUsersInRoom({ name: room.name, numberOfUsers: room.players.length });
});

const callApi = async () => {
	const id = Math.floor(7*Math.random());
	const text = await fetch(`http://localhost:3002/game/texts/${id}`).then(res => res.json()).catch(err => console.log(err));
	return text;
};

socket.on('start-game', async (room, SECONDS_TIMER_BEFORE_START_GAME) => {
	const text = await callApi();
	let seconds = SECONDS_TIMER_BEFORE_START_GAME;
	addClass(readyBtn, 'display-none');
	timer.innerHTML = seconds;
	removeClass(timer, 'display-none');
	addClass(quitRoomBtn, 'display-none');
	
	let intervalFunc = () => {
		seconds -= 1;
		timer.innerHTML = seconds;
	};
	const myInterval = setInterval(intervalFunc, 1000);
	setTimeout(() => {
		clearInterval(myInterval);
		socket.emit('play', room.name, text);
	}, 1000*SECONDS_TIMER_BEFORE_START_GAME);
});

socket.on('play', (room, SECONDS_FOR_GAME, text) => {
	let seconds = SECONDS_FOR_GAME;
	addClass(timer, 'display-none');
	gameTimerSeconds.innerHTML = seconds;
	removeClass(gameTimer, 'display-none');
	textContainer.innerHTML = text;
	removeClass(textContainer, 'display-none');
});

let game0;
let interval;
let timeout;

socket.on('game', (room, SECONDS_FOR_GAME, text) => {
	let seconds = SECONDS_FOR_GAME;
	let position = 1;
	let letter;
	let textHTML = "";

	const game = (event) => {
		letter = text[position - 1];
		// console.log(event.key);

		if (event.key === letter) {
			textHTML += `<span style="background-color: green;">${letter}</span>`;
			textContainer.innerHTML = textHTML + text.substring(position, text.length);
			socket.emit('set progress', room.name, Math.floor(100*position/text.length));
			position++;
		}
	};

	game0 = game;

	window.addEventListener('keyup', game);
	
	let intervalFunc = () => {
		// console.log(seconds);
		seconds -= 1;
		gameTimerSeconds.innerHTML = seconds;
	};
	interval = setInterval(intervalFunc, 1000);
	timeout = setTimeout(() => {
		clearInterval(interval);
		socket.emit('game finish', room.name);
	}, 1000*seconds);
});

socket.on('set progress', (data) => {
	setProgress(data);
});

const onCloseResultsModal = () => {
	removeClass(readyBtn, 'display-none');
	removeClass(quitRoomBtn, 'display-none');
};

socket.on('game finish', (room) => {
	clearInterval(interval);
	clearTimeout(timeout);
	window.removeEventListener('keyup', game0);
	room.players.sort((a, b) => b.progress - a.progress);
	const usernames = room.players.map(player => player.name);
	showResultsModal({ usersSortedArray: usernames, onClose: onCloseResultsModal });
	addClass(gameTimer, 'display-none');
	addClass(textContainer, 'display-none');
	setTimeout(() => {
		room.players.forEach(player => {
			changeReadyStatus({ username: player.name, ready: false });
			setProgress({ username: player.name, progress: 0 });
		});
	}, 1000);
	
	readyBtn.innerHTML = 'READY';
});

socket.on('remove room', (roomName) => {
	removeRoomElement(roomName);
});