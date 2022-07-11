import { IPlayer } from "./player";

interface IRoom {
    name: string,
    players: Array<IPlayer>
};

export { IRoom };