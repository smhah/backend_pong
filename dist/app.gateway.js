"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppGateway = void 0;
const common_1 = require("@nestjs/common");
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const min = (a, b) => {
    return a < b ? a : b;
};
const max = (a, b) => {
    return a > b ? a : b;
};
class Game {
    constructor(server) {
        this.server = server;
        this.width = 800;
        this.height = 700;
        this.initBallX = this.width / 2;
        this.initBallY = this.height / 2;
        this.ballRadius = 50;
        this.ballSpeed = 10;
        this.paddleWidth = 30;
        this.paddleHeight = 150;
        this.paddleSpeed = 10;
        this.ballX = this.initBallX;
        this.ballY = this.initBallY;
        this.ballDirX = 1;
        this.ballDirY = 1;
        this.paddleOneX = 0;
        this.paddleOneY = 0;
        this.paddleTwoX = this.width - this.paddleWidth;
        this.paddleTwoY = 0;
        this.state = 0;
        this.players = [];
        this.room = "";
    }
    cleanup() {
        clearInterval(this.loop);
    }
    getPlayers() { return this.players; }
    addPlayer(id) {
        if (this.players.length < 2)
            this.players.push(id);
        if (this.players.length === 2) {
            this.run();
            this.toggleGameState();
        }
    }
    setRoomName(name) { this.room = name; }
    toggleGameState() {
        this.state = (this.state === 0 ? 1 : 2);
        if (this.state === 2)
            this.cleanup();
    }
    async run() {
        let fps = 60;
        this.loop = setInterval(() => {
            this.updateBall();
            this.handlePaddleOneBounce();
            this.handlePaddleTwoBounce();
            this.server.to(this.room).emit("gameState", this.getGameState());
        }, 1000 / fps);
    }
    updateBall() {
        this.ballX += this.ballSpeed * this.ballDirX;
        this.ballY += this.ballSpeed * this.ballDirY;
        if (this.ballX + this.ballRadius / 2 >= this.width || this.ballX - this.ballRadius / 2 <= 0)
            this.ballDirX *= -1;
        if (this.ballY + this.ballRadius / 2 >= this.height || this.ballY - this.ballRadius / 2 <= 0)
            this.ballDirY *= -1;
    }
    handlePaddleOneBounce() {
        if (this.ballDirX === -1
            && this.ballY > this.paddleOneY
            && this.ballY < this.paddleOneY + this.paddleHeight) {
            if (this.ballX - this.ballRadius / 2 - this.paddleWidth <= 0)
                this.ballDirX *= -1;
        }
    }
    handlePaddleTwoBounce() {
        if (this.ballDirX === 1
            && this.ballY > this.paddleTwoY
            && this.ballY < this.paddleTwoY + this.paddleHeight) {
            if (this.ballX + this.ballRadius / 2 + this.paddleWidth >= this.width)
                this.ballDirX *= -1;
        }
    }
    updatePaddleOne(input) {
        if (input === "DOWN") {
            this.paddleOneY += this.paddleSpeed;
            this.paddleOneY = min(this.paddleOneY, this.height - this.paddleHeight);
        }
        else {
            this.paddleOneY -= this.paddleSpeed;
            this.paddleOneY = max(this.paddleOneY, 0);
        }
    }
    updatePaddleTwo(input) {
        if (input === "DOWN") {
            this.paddleTwoY += this.paddleSpeed;
            this.paddleTwoY = min(this.paddleTwoY, this.height - this.paddleHeight);
        }
        else {
            this.paddleTwoY -= this.paddleSpeed;
            this.paddleTwoY = max(this.paddleTwoY, 0);
        }
    }
    handleInput(payload) {
        if (payload.userId === this.players[0])
            this.updatePaddleOne(payload.input);
        else
            this.updatePaddleTwo(payload.input);
    }
    getGameState() {
        return {
            ballX: this.ballX,
            ballY: this.ballY,
            ballDirX: this.ballDirX,
            ballDirY: this.ballDirY,
            paddleOneX: this.paddleOneX,
            paddleOneY: this.paddleOneY,
            paddleTwoX: this.paddleTwoX,
            paddleTwoY: this.paddleTwoY,
            state: this.state,
            players: this.players
        };
    }
}
let AppGateway = class AppGateway {
    constructor() {
        this.logger = new common_1.Logger("AppGateway");
        this.games = Array();
        this.playerToGameIndex = new Map();
    }
    afterInit(server) {
        this.server = server;
        this.logger.log("INITIALIZED");
    }
    handleConnection(client, ...args) {
        this.logger.log(`A player is connected ${client.id}`);
    }
    handleDisconnect(client) {
        this.logger.log(`A player is disconnected ${client.id}`);
    }
    joinRoom(socket) {
        const roomName = socket.id;
        console.log(roomName);
        if (this.playerToGameIndex.has(socket.id)) {
            console.log(this.games[this.playerToGameIndex[socket.id]].getPlayers());
            if (this.games[this.playerToGameIndex[socket.id]].getPlayers().length == 2)
                this.games[this.playerToGameIndex[socket.id]].toggleGameState();
            return;
        }
        if (this.games.length) {
            if (this.games[this.games.length - 1].getPlayers().length < 2) {
                this.games[this.games.length - 1].addPlayer(socket.id);
                socket.join(this.games[this.games.length - 1].room);
                console.log("Joined game Index=" + (this.games.length - 1), roomName);
            }
            else {
                this.games.push(new Game(this.server));
                this.games[this.games.length - 1].addPlayer(socket.id);
                this.games[this.games.length - 1].setRoomName(roomName);
                socket.join(roomName);
                console.log("Created game Index=" + (this.games.length - 1), roomName);
            }
        }
        else {
            this.games.push(new Game(this.server));
            this.games[0].addPlayer(socket.id);
            this.games[0].setRoomName(roomName);
            socket.join(roomName);
            console.log("created game Index=" + 0, roomName);
        }
        this.playerToGameIndex.set(socket.id, this.games.length - 1);
    }
    handlePlayerInput(client, payload) {
        this.games[this.playerToGameIndex.get(client.id)].handleInput(Object.assign(Object.assign({}, payload), { userId: client.id }));
    }
};
__decorate([
    (0, websockets_1.SubscribeMessage)('playerJoined'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "joinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('playerInput'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", void 0)
], AppGateway.prototype, "handlePlayerInput", null);
AppGateway = __decorate([
    (0, websockets_1.WebSocketGateway)(6001, {
        cors: {
            origin: '*',
        }
    })
], AppGateway);
exports.AppGateway = AppGateway;
//# sourceMappingURL=app.gateway.js.map