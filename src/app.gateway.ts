import { Logger } from '@nestjs/common';
import { SubscribeMessage, WebSocketGateway, OnGatewayInit,  OnGatewayConnection, OnGatewayDisconnect, MessageBody, WebSocketServer } from '@nestjs/websockets';
import {Socket, Server} from "socket.io"
import { WsResponse } from '@nestjs/websockets';
import { SocketAddress } from 'net';

const min = (a: number, b: number) => {
  return a < b ? a : b;
}
const max = (a: number, b: number) => {
  return a > b ? a : b;
}

interface UserInput {
  input: string;
  userId: string;
}

interface Game {
  server: Server;

  //Constants
  width: number;
  height: number;

  initBallX: number;
  initBallY: number;
  ballRadius: number;
  ballSpeed: number;

  paddleWidth: number;
  paddleHeight: number;
  paddleSpeed: number;

  // Game variables
  ballX: number;
  ballY: number;
  ballDirX: number;
  ballDirY: number;

  paddleOneX: number;
  paddleOneY: number;

  paddleTwoX: number;
  paddleTwoY: number;

  loop: NodeJS.Timer;

  state: 0 | 1 | 2;
  players: Array<string>;
  room: string;
}

interface GameState {
  // Game variables
  ballX: number;
  ballY: number;
  ballDirX: number;
  ballDirY: number;

  paddleOneX: number;
  paddleOneY: number;

  paddleTwoX: number;
  paddleTwoY: number;

  state: 0 | 1 | 2;
  players : Array<string>;
}

class Game {
  constructor(server: Server) {
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

    // Game variables
    this.ballX = this.initBallX;
    this.ballY = this.initBallY;
    this.ballDirX = 1;
    this.ballDirY = 1;

    this.paddleOneX = 0;
    this.paddleOneY = 0;

    this.paddleTwoX = this.width - this.paddleWidth;
    this.paddleTwoY = 0;

    this.state = 0

    this.players = [];
    this.room = "";
  }
  cleanup(): void {
    clearInterval(this.loop);
  }

  getPlayers(): Array<string> { return this.players }
  
  addPlayer(id: string): void {
    if (this.players.length < 2)
      this.players.push(id)
    if (this.players.length === 2) {
      this.run();
      this.toggleGameState();
    }
  }
  setRoomName(name: string): void { this.room = name; }
  toggleGameState(): void {
    this.state = (this.state === 0 ? 1 : 2)
    if (this.state === 2) this.cleanup();
  }
  
  async run() {
    let fps: number = 60;
    this.loop = setInterval(() => {
      this.updateBall();
      this.handlePaddleOneBounce();
      this.handlePaddleTwoBounce();
      this.updateScore();
      this.server.to(this.room).emit("gameState", this.getGameState());

    }, 1000 / fps);
  }

  updateScore(){
    
  }

  updateBall() {
    //update
    this.ballX += this.ballSpeed * this.ballDirX;
    this.ballY += this.ballSpeed * this.ballDirY;

    //no overlap ?
    // if (this.ballDirX > 0)
    //   this.ballX = min(this.ballX, this.width - this.ballRadius / 2);
    // else
    //   this.ballX = max(this.ballX, this.ballRadius / 2);
    // if (this.ballDirY > 0)
    //   this.ballY = min(this.ballY, this.height - this.ballRadius / 2);
    // else
    //   this.ballY = max(this.ballY, this.ballRadius / 2);

    //collision
    if (this.ballX + this.ballRadius / 2 >= this.width || this.ballX - this.ballRadius / 2 <= 0)
      this.ballDirX *= -1;
    if (this.ballY + this.ballRadius / 2 >= this.height || this.ballY - this.ballRadius / 2 <= 0)
      this.ballDirY *= -1;
  }
  handlePaddleOneBounce() {

    if (
      this.ballDirX === -1
      && this.ballY > this.paddleOneY
      && this.ballY < this.paddleOneY + this.paddleHeight // ball in front of paddle and going toward paddle
    ) {
      // console.log("in paddle one range")
      //this.ballX = max(this.ballX, this.ballRadius / 2 + this.paddleWidth);
      if (this.ballX - this.ballRadius / 2 - this.paddleWidth <= 0)
        this.ballDirX *= -1;
    }
  }
  handlePaddleTwoBounce() {

    if (
      this.ballDirX === 1
      && this.ballY > this.paddleTwoY
      && this.ballY < this.paddleTwoY + this.paddleHeight // ball in front of paddle and going toward paddle
    ) {
      // console.log("in paddle two range")

      //this.ballX = min(this.ballX, this.width - this.ballRadius / 2 - this.paddleWidth);

      if (this.ballX + this.ballRadius / 2 + this.paddleWidth >= this.width)
        this.ballDirX *= -1;
    }
  }

  updatePaddleOne(input: string) {

    if (input === "DOWN") {
      this.paddleOneY += this.paddleSpeed;
      this.paddleOneY = min(this.paddleOneY, this.height - this.paddleHeight);
    }
    else {
      this.paddleOneY -= this.paddleSpeed;
      this.paddleOneY = max(this.paddleOneY, 0);
    }
  }
  updatePaddleTwo(input: string) {

    if (input === "DOWN") {
      this.paddleTwoY += this.paddleSpeed;
      this.paddleTwoY = min(this.paddleTwoY, this.height - this.paddleHeight);
    }
    else {
      this.paddleTwoY -= this.paddleSpeed;
      this.paddleTwoY = max(this.paddleTwoY, 0);
    }
  }

  handleInput(payload: UserInput) {
    if (payload.userId === this.players[0])
      this.updatePaddleOne(payload.input);
    else
      this.updatePaddleTwo(payload.input);
  }

  getGameState(): GameState {
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
      players : this.players
    }
  }
}
  //
@WebSocketGateway(6001, { 
  cors: {
  origin: '*',
  }
})
export class AppGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect{

  private  server: Server;
  private logger: Logger = new Logger("AppGateway");
  //game object
  private games: Array<Game> = Array<Game>();
  private playerToGameIndex: Map<string, number> = new Map<string, number>();

  afterInit(server: Server) {
    this.server = server;
    this.logger.log("INITIALIZED")
  }

  handleConnection(client: Socket, ...args: any[]) : void{
    this.logger.log(`A player is connected ${client.id}`);
  }

  handleDisconnect(client: Socket) : void{
    this.logger.log(`A player is disconnected ${client.id}`);
  }

  @SubscribeMessage('playerJoined')
  joinRoom(socket: Socket): void {
    const roomName: string = socket.id;
    console.log(roomName)
    if (this.playerToGameIndex.has(socket.id)) {
      console.log(this.games[this.playerToGameIndex[socket.id]].getPlayers())
      if (this.games[this.playerToGameIndex[socket.id]].getPlayers().length == 2)
        this.games[this.playerToGameIndex[socket.id]].toggleGameState()
      return;
    }

    if (this.games.length) {
      if (this.games[this.games.length - 1].getPlayers().length < 2) {
        this.games[this.games.length - 1].addPlayer(socket.id);
        socket.join(this.games[this.games.length - 1].room);
        console.log("Joined game Index=" + (this.games.length - 1), roomName); // not this room
      }
      else {
        this.games.push(new Game(this.server));
        this.games[this.games.length - 1].addPlayer(socket.id);
        this.games[this.games.length - 1].setRoomName(roomName);
        socket.join(roomName);
        console.log("Created game Index=" + (this.games.length - 1), roomName)
      }
    }
    else {
      this.games.push(new Game(this.server));
      this.games[0].addPlayer(socket.id);
      this.games[0].setRoomName(roomName);
      socket.join(roomName);
      console.log("created game Index=" + 0, roomName)
    }

    this.playerToGameIndex.set(socket.id, this.games.length - 1);
  }

  @SubscribeMessage('playerInput')
  handlePlayerInput(client: Socket, payload: UserInput): void {
    this.games[this.playerToGameIndex.get(client.id)].handleInput({ ...payload, userId: client.id })
  }
}