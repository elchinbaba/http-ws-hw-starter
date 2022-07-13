import { showMessageModal } from "./views/modal.mjs";

const username = sessionStorage.getItem('username');

if (username) {
	window.location.replace('/game');
}

const submitButton = document.getElementById('submit-button');
const input = document.getElementById('username-input');

const socket = io('');

const getInputValue = () => input.value;

const onClickSubmitButton = () => {
	const inputValue = getInputValue();
	if (!inputValue) {
		return;
	}
	socket.emit('login check', inputValue);
	submitButton.disabled = true;
};

socket.on('show error modal', (message) => {
	showMessageModal({ message, onClose: () => { submitButton.disabled = false; } });
});

socket.on('login check', (canPass, inputValue) => {
	if (!canPass) {
		return;
	}
	sessionStorage.setItem('username', inputValue);
	window.location.replace('/game');
})

const onKeyUp = ev => {
	const enterKeyCode = 13;
	if (ev.keyCode === enterKeyCode) {
		submitButton.click();
	}
};

submitButton.addEventListener('click', onClickSubmitButton);
window.addEventListener('keyup', onKeyUp);
