import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";
import { readFileSync } from "fs";
import { resolve } from "path";
import { v4 as uuidv4 } from 'uuid';
const app = express();
const server = createServer(app);
let usernmbr = 0;
let rooms = [];
const clientRooms = new Map();
const roomNicknames = new Map();
const clientPrompts = new Map();
const clientGifsAndPrompts = new Map();
const roomVotingData = new Map();


const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins, or specify a list of allowed origins
    methods: ["GET", "POST"],
  },
});
const prompts = readFileSync(resolve("public", "prompts.txt"), "utf-8")
  .split("\n")
  .filter((line) => line.trim() !== "");

function getUniqueClientIds(room) {
  const clients = io.sockets.adapter.rooms.get(room);
  const uniqueClientIds = new Set();

  for (const clientId of clients) {
    const socket = io.sockets.sockets.get(clientId);
    if (socket && socket.userId) {
      uniqueClientIds.add(socket.userId);
    }
  }

  return uniqueClientIds;
}


function getRoomStatus(room) {
  return clientRooms.get(room)?.gameStarted;
}

io.on("connection", (socket) => {
  socket.on("sendPrompt", (receivedPrompt, nickname) => {
    console.log(`Received prompt "${receivedPrompt}" from client ${nickname}`);

    if (!clientPrompts.has(socket.userId)) {
      clientPrompts.set(socket.userId, []);
    }
    clientPrompts.get(socket.userId).push({ prompt: receivedPrompt, author: nickname });

    const room = Array.from(clientRooms.get(socket.id))[0];

    const uniqueClientIds = getUniqueClientIds(room);

    let allClientsSentPrompt = true;
    for (const clientId of uniqueClientIds) {
      if (!clientPrompts.has(clientId) || clientPrompts.get(clientId).length === 0) {
        allClientsSentPrompt = false;
        break;
      }
    }

    if (allClientsSentPrompt) {
      console.log("All clients have sent prompts.");
      let promptArray = [];
  
      const gameState = 1;
  
      for (const clientId of uniqueClientIds) {
        const clientPromptsArray = clientPrompts.get(clientId);
        let randomPrompt;
        let randomPromptAuthor;
  
        let usedPrompts = new Set();
  
        let attempts = 0;
        let maxAttempts = uniqueClientIds.size * clientPromptsArray.length;
  
        do {
          attempts++;
          const randomClient = Array.from(uniqueClientIds)[Math.floor(Math.random() * uniqueClientIds.size)];
  
          // Skip if the clientId is the same as the current client
          if (randomClient === clientId) continue;
  
          const randomPromptObject = clientPrompts.get(randomClient)[Math.floor(Math.random() * clientPrompts.get(randomClient).length)];
          randomPrompt = randomPromptObject.prompt;
          randomPromptAuthor = randomPromptObject.author;
        } while (usedPrompts.size < clientPromptsArray.length && (clientPromptsArray.some(promptObject => promptObject.prompt === randomPrompt) || promptArray.includes(randomPrompt)) && attempts < maxAttempts);
  
        if (attempts < maxAttempts) {
          usedPrompts.add(randomPrompt);
          promptArray.push(randomPrompt);
          console.log(`Sending prompt "${randomPrompt}" to client ${clientId}`);
          io.to(clientId).emit("updateGameState", gameState, randomPrompt, randomPromptAuthor);
        } else {
          console.log(`Could not find a suitable prompt for client ${clientId}`);
        }
      }
      for (const clientId of uniqueClientIds) { clientPrompts.set(clientId, []); }
    }
  });


  socket.on("sendGif", (selectedImageUrl, otherPrompt, otherPromptAuthor, nickname) => {
    console.log(`Received gif "${selectedImageUrl}" and prompt "${otherPrompt}" from client ${socket.userId}`);

    const room = Array.from(clientRooms.get(socket.id))[0];
    const uniqueClientIds = getUniqueClientIds(room);


    const gifAndPromptId = uuidv4();
    clientGifsAndPrompts.set(gifAndPromptId, { clientId: socket.userId, selectedImageUrl, otherPrompt, otherPromptAuthor, nickname: nickname });


    let allClientsSentGifAndPrompt = true;
    for (const clientId of uniqueClientIds) {
      const hasClientSentGifAndPrompt = Array.from(clientGifsAndPrompts.values()).some((entry) => entry.clientId === clientId);
      if (!hasClientSentGifAndPrompt) {
        allClientsSentGifAndPrompt = false;
        break;
      }
    }


    if (allClientsSentGifAndPrompt) {
      console.log("All clients have sent gifs and prompts.");

      const gameState = 2;
      const gifAndPromptList = Array.from(clientGifsAndPrompts.values());
      for (const clientId of uniqueClientIds) {
        console.log(`Sending gif and prompt list to client ${clientId}`);
        io.to(clientId).emit("updateGameState2", gameState, gifAndPromptList);
      }


      clientGifsAndPrompts.clear();
    }
  });

  socket.on("vote", (votedNM, votedPNM, voter) => {
    const room = Array.from(clientRooms.get(socket.id))[0];
    const uniqueClientIds = getUniqueClientIds(room);

    // Initialize roomVotingData for the room if it doesn't exist
    if (!roomVotingData.has(room)) {
      const votedNamesAndPoints = new Map();
      roomVotingData.set(room, { votedNamesAndPoints, hasClientVoted: new Map() });
    }

    const votingData = roomVotingData.get(room);
    const { votedNamesAndPoints, hasClientVoted } = votingData;

    // Add points to the respective names
    function addPoints(name, points) {
      if (!votedNamesAndPoints.has(name)) {
        votedNamesAndPoints.set(name, 0);
      }
      votedNamesAndPoints.set(name, votedNamesAndPoints.get(name) + points);
    }

    addPoints(votedNM, 100);
    if (votedPNM != voter) {

      addPoints(votedPNM, 50);
    }


    // Check if all clients have voted
    if (hasClientVoted.size === 0) {
      uniqueClientIds.forEach((clientId) => {
        hasClientVoted.set(clientId, false);
      });
    }

    hasClientVoted.set(socket.userId, true);

    if (Array.from(hasClientVoted.values()).every((voted) => voted)) {
      const gameState = 3;
      const nicknamePointsList = Array.from(votedNamesAndPoints.entries()).map(([name, points]) => ({
        nickname: name,
        points: points,
      }));

      for (const clientId of uniqueClientIds) {
        console.log(`Sending nickname points list to client ${clientId}`);
        io.to(clientId).emit("updateGameState3", gameState, nicknamePointsList);
      }

      // Reset the hasClientVoted Map for the current room
      hasClientVoted.clear();
    }
  });

  socket.on("restartGame", () => {
    const room = Array.from(clientRooms.get(socket.id))[0];
    const uniqueClientIds = getUniqueClientIds(room);
    const gameState = 0;

    let availablePrompts = [...prompts];

    for (const clientId of uniqueClientIds) {
      const randomIndex = Math.floor(Math.random() * availablePrompts.length);
      const randomPrompt = availablePrompts[randomIndex];
      console.log(`Sending prompt "${randomPrompt}" to client ${clientId}`);
      io.to(clientId).emit("receivePrompt", randomPrompt);
      io.to(clientId).emit("updateGameState", gameState);


      availablePrompts.splice(randomIndex, 1);


      if (availablePrompts.length === 0) {
        availablePrompts = [...prompts];
      }
    }
  });




  socket.on("socketcarousel", () => {
    const room = Array.from(clientRooms.get(socket.id))[0];
    const uniqueClientIds = getUniqueClientIds(room);


    for (const clientId of uniqueClientIds) {


      io.to(clientId).emit("carousel",);

    }
  });


  socket.on("client connected", (clientId) => {
    console.log(`Client ${clientId} connected with socket ID ${socket.id}`);
    socket.userId = clientId;


    clientRooms.set(socket.id, new Set());
  });
  const clientIpAddress = socket.request.connection.remoteAddress;

  socket.on("room host", async (clientid, nickname) => {
    socket.nickname = nickname;
    let room = Math.floor(Math.random() * 10000).toString();
    if (!clientRooms.has(socket.id)) {
      clientRooms.set(socket.id, new Set());
    }
    socket.join(socket.userId);
    socket.join(room);
    clientRooms.get(socket.id).add(room);
    io.to(socket.userId).emit("room number", room);
    const uniqueClientIds = getUniqueClientIds(room);
    const numberOfClients = uniqueClientIds.size;

    if (!roomNicknames.has(room)) {
      roomNicknames.set(room, new Set());
    }
    roomNicknames.get(room).add(nickname);
    io.to(room).emit("clientsInRoom", numberOfClients);
    io.to(room).emit("playerJoined", Array.from(roomNicknames.get(room)));

    console.log(`Client ID: ${socket.userId} with nickname: ${nickname} hosted room: ${room}`);
  });

  socket.on("room join", async (room, clientid, nickname) => {
    socket.nickname = nickname;
    if (io.sockets.adapter.rooms.has(room)) {
      const uniqueClientIds = getUniqueClientIds(room);

      // Check for existing nickname in the room
      const existingNicknames = roomNicknames.get(room) || new Set();
      if (existingNicknames.has(nickname)) {
        const feedback = "A user with that nickname already exists in the room";
        io.to(socket.id).emit("join failed", feedback);
        return;
      }

      if (!uniqueClientIds.has(socket.userId)) {
        if (!clientRooms.has(socket.id)) {
          clientRooms.set(socket.id, new Set());
        }
        socket.join(room);
        clientRooms.get(socket.id).add(room);
        socket.join(socket.userId);
        io.to(socket.userId).emit("room number", room);

        const updatedUniqueClientIds = getUniqueClientIds(room);
        const numberOfClients = updatedUniqueClientIds.size;

        const roomInstance = io.sockets.adapter.rooms.get(room);
        if (roomInstance) {
          if (!roomNicknames.has(room)) {
            roomNicknames.set(room, new Set());
          }
          roomNicknames.get(room).add(nickname);
          io.to(room).emit("playerJoined", Array.from(roomNicknames.get(room)));
          io.to(room).emit("clientsInRoom", numberOfClients);
        }
        io.to(socket.userId).emit("join successful");
        if (getRoomStatus(room)) {
          io.to(socket.userId).emit("startGame", true);
        }
        console.log(`Client ID: ${socket.userId} with nickname: ${nickname} joined room: ${room}`);
      } else {
        const feedback = "You are already in this room";
        io.to(socket.id).emit("join failed", feedback);
      }
    } else {
      const feedback = "No room with that name";
      io.to(socket.id).emit("join failed", feedback);
    }
  });


  socket.on("disconnect", () => {
    console.log(`User at IP ${clientIpAddress} disconnected`);


    if (clientRooms.has(socket.id)) {

      for (const room of clientRooms.get(socket.id)) {

        const roomInstance = io.sockets.adapter.rooms.get(room);


        if (roomInstance) {
          roomNicknames.get(room).delete(socket.nickname);

          const updatedUniqueClientIds = getUniqueClientIds(room);
          const numberOfClients = updatedUniqueClientIds.size;
          io.to(room).emit("clientsInRoom", numberOfClients);


          io.to(room).emit("playerDisconnected", Array.from(roomNicknames.get(room)));
          if (numberOfClients === 0) {
            clientRooms.delete(room);
            roomNicknames.delete(room);
          }
        }
      }
    }


    clientRooms.delete(socket.id);


  });

  socket.on('start game', () => {
    for (const room of clientRooms.get(socket.id)) {
      io.to(room).emit("startGame", true);

      const roomInstance = clientRooms.get(room);
      if (roomInstance) {
        roomInstance.gameStarted = true;
      }

      const uniqueClientIds = getUniqueClientIds(room);
      console.log("Unique client IDs in room:", uniqueClientIds);

      let availablePrompts = [...prompts];

      for (const clientId of uniqueClientIds) {
        const randomIndex = Math.floor(Math.random() * availablePrompts.length);
        const randomPrompt = availablePrompts[randomIndex];
        console.log(`Sending prompt "${randomPrompt}" to client ${clientId}`);
        io.to(clientId).emit("receivePrompt", randomPrompt);


        availablePrompts.splice(randomIndex, 1);


        if (availablePrompts.length === 0) {
          availablePrompts = [...prompts];
        }
      }
    }
  });

});

const port = process.env.PORT || 3002;
server.listen(port, "0.0.0.0", () => {
  // Add '0.0.0.0' to listen on all network interfaces
  console.log(`Server listening at http://localhost:${port}`);
});
