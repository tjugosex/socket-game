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
  socket.on("sendPrompt", (receivedPrompt) => {
    console.log(`Received prompt "${receivedPrompt}" from client ${socket.userId}`);
  
    if (!clientPrompts.has(socket.userId)) {
      clientPrompts.set(socket.userId, []);
    }
    clientPrompts.get(socket.userId).push(receivedPrompt);
  
    const room = Array.from(clientRooms.get(socket.id))[0];
  
    // Get the unique client ids in the room
    const uniqueClientIds = getUniqueClientIds(room);
  
    // Check if all clients have sent a prompt
    let allClientsSentPrompt = true;
    for (const clientId of uniqueClientIds) {
      if (!clientPrompts.has(clientId) || clientPrompts.get(clientId).length === 0) {
        allClientsSentPrompt = false;
        break;
      }
    }
  
    // Check if all clients have sent a prompt
    if (allClientsSentPrompt) {
      console.log("All clients have sent prompts.");
      let promptarray = [];
      // Set gameState to 1
      const gameState = 1;
  
      // Iterate through the unique client ids and send the game state and a random prompt
      for (const clientId of uniqueClientIds) {
        const clientPromptsArray = clientPrompts.get(clientId);
        let randomPrompt;
  
        do {
          const randomClient = Array.from(uniqueClientIds)[Math.floor(Math.random() * uniqueClientIds.size)];
          randomPrompt = clientPrompts.get(randomClient)[Math.floor(Math.random() * clientPrompts.get(randomClient).length)];
        } while (clientPromptsArray.includes(randomPrompt) || promptarray.includes(randomPrompt));
        promptarray.push(randomPrompt);
        console.log(`Sending prompt "${randomPrompt}" to client ${clientId}`);
        io.to(clientId).emit("updateGameState", gameState, randomPrompt);
      }
      for (const clientId of uniqueClientIds) { clientPrompts.set(clientId, []); }
    }
  });
  
  socket.on("sendGif", (selectedImageUrl, otherPrompt, nickname) => {
    console.log(`Received gif "${selectedImageUrl}" and prompt "${otherPrompt}" from client ${socket.userId}`);
  
    const room = Array.from(clientRooms.get(socket.id))[0];
    const uniqueClientIds = getUniqueClientIds(room);
  
    // Store the selectedImageUrl, otherPrompt, and nickname for the client
    const gifAndPromptId = uuidv4();
    clientGifsAndPrompts.set(gifAndPromptId, { clientId: socket.userId, selectedImageUrl, otherPrompt, nickname: nickname });
  
    // Check if all clients have sent a gif and prompt
    let allClientsSentGifAndPrompt = true;
    for (const clientId of uniqueClientIds) {
      const hasClientSentGifAndPrompt = Array.from(clientGifsAndPrompts.values()).some((entry) => entry.clientId === clientId);
      if (!hasClientSentGifAndPrompt) {
        allClientsSentGifAndPrompt = false;
        break;
      }
    }
  
    // If all clients have sent a gif and prompt, emit the list to all clients with gameState = 2
    if (allClientsSentGifAndPrompt) {
      console.log("All clients have sent gifs and prompts.");
  
      const gameState = 2;
      const gifAndPromptList = Array.from(clientGifsAndPrompts.values());
      for (const clientId of uniqueClientIds) {
        console.log(`Sending gif and prompt list to client ${clientId}`);
        io.to(clientId).emit("updateGameState2", gameState, gifAndPromptList);
      }
  
      // Clear the clientGifsAndPrompts Map
      clientGifsAndPrompts.clear();
    }
  });
  
  socket.on("client connected", (clientId) => {
    console.log(`Client ${clientId} connected with socket ID ${socket.id}`);
    socket.userId = clientId;

    // Initialize the Set for the client
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

      // Check if the client's userId is already in the room
      if (!uniqueClientIds.has(socket.userId)) {
        if (!clientRooms.has(socket.id)) {
          clientRooms.set(socket.id, new Set());
        }
        socket.join(room);
        clientRooms.get(socket.id).add(room);
        socket.join(socket.userId);
        io.to(socket.userId).emit("room number", room);

        // Update the number of clients in the room after joining
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
        // Emit 'join failed' event to the client because they're already in the room
        const feedback = "You are already in this room";
        io.to(socket.id).emit("join failed", feedback);
      }
    } else {
      // Emit 'join failed' event to the client because the room doesn't exist
      const feedback = "No room with that name";
      io.to(socket.id).emit("join failed", feedback);
    }
  });

  socket.on("disconnect", () => {
    console.log(`User at IP ${clientIpAddress} disconnected`);

    // Check if the socket.id exists in clientRooms before iterating over the rooms
    if (clientRooms.has(socket.id)) {
      // Iterate over the rooms the client was part of
      for (const room of clientRooms.get(socket.id)) {
        // Get the room instance
        const roomInstance = io.sockets.adapter.rooms.get(room);

        // Check if the roomInstance exists before accessing its size
        if (roomInstance) {
          roomNicknames.get(room).delete(socket.nickname);

          // Update the number of clients in the room after removing the disconnected client
          const updatedUniqueClientIds = getUniqueClientIds(room);
          const numberOfClients = updatedUniqueClientIds.size;
          io.to(room).emit("clientsInRoom", numberOfClients);

          // Emit the updated list of nicknames after deleting the disconnected client's nickname
          io.to(room).emit("playerDisconnected", Array.from(roomNicknames.get(room)));
          if (numberOfClients === 0) {
            clientRooms.delete(room);
            roomNicknames.delete(room);
          }
        }
      }
    }

    // Remove the client's Set from the Map
    clientRooms.delete(socket.id);


  });

  socket.on('start game', () => {
    for (const room of clientRooms.get(socket.id)) {
      io.to(room).emit("startGame", true);

      // Update the room status to indicate that the game has started
      const roomInstance = clientRooms.get(room);
      if (roomInstance) {
        roomInstance.gameStarted = true;
      }

      // Send a random prompt to each player in the room
      const uniqueClientIds = getUniqueClientIds(room);
      console.log("Unique client IDs in room:", uniqueClientIds);
      for (const clientId of uniqueClientIds) {
        const randomPrompt = prompts[Math.floor(Math.random() * prompts.length)];
        console.log(`Sending prompt "${randomPrompt}" to client ${clientId}`);
        io.to(clientId).emit("receivePrompt", randomPrompt);
      }
    }
  });

});

const port = process.env.PORT || 3002;
server.listen(port, "0.0.0.0", () => {
  // Add '0.0.0.0' to listen on all network interfaces
  console.log(`Server listening at http://localhost:${port}`);
});
