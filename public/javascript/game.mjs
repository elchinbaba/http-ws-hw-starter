import { showInputModal } from "../views/modal.mjs";
import { appendRoomElement } from "../views/room.mjs";

const username = sessionStorage.getItem('username');

if (!username) {
	window.location.replace('/login');
}

const addRoomBtn = document.getElementById('add-room-btn');

const socket = io('', { query: { username } });

const addRoom = () => {
	// socket.emit("create-room");
    appendRoomElement({ name: "default", numberOfUsers: 0 });
};

const onClickAddRoomBtn = () => {
    showInputModal({ title: 'Add Room', onSubmit: addRoom });
};

addRoomBtn.addEventListener('click', onClickAddRoomBtn);

