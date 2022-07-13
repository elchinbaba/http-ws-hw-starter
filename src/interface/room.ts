import { IPlayer } from "./player";

interface IRoom {
    name: string,
    players: Array<IPlayer>,
    hasGameStarted: boolean
};

export { IRoom };