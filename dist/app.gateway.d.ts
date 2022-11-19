import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Socket, Server } from "socket.io";
interface UserInput {
    input: string;
    userId: string;
}
interface GameId {
    id: string;
}
export declare class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
    private server;
    private logger;
    private games;
    private playerToGameIndex;
    afterInit(server: Server): void;
    handleConnection(client: Socket, ...args: any[]): void;
    handleDisconnect(client: Socket): void;
    spectJoinRoom(socket: Socket, payload: GameId): void;
    joinRoom(socket: Socket): void;
    handlePlayerInput(client: Socket, payload: UserInput): void;
}
export {};
