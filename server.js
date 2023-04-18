import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import cors from "cors";

const app = express();
const server = createServer(app);
let usernmbr = 0;
let rooms = [];
const clientRooms = new Map();
const roomNicknames = new Map();
const io = new Server(server, {
  cors: {
    origin: "*", // Allow all origins, or specify a list of allowed origins
    methods: ["GET", "POST"],
  },
});

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

io.on("connection", (socket) => {
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
        console.log(`Client ID: ${socket.userId} with nickname: ${nickname} joined room: ${room}`);
      } else {
        // Emit 'join failed' event to the client because they're already in the room
        const feedback = "You are already in this room";
        io.to(socket.id).emit("join failed",feedback);
      }
    } else {
      // Emit 'join failed' event to the client because the room doesn't exist
      const feedback = "No room with that name";
      io.to(socket.id).emit("join failed",feedback);
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
        }
      }
    }
  
    // Remove the client's Set from the Map
    clientRooms.delete(socket.id);
  
    console.log("Number of users: ", usernmbr);
  });


});

const port = process.env.PORT || 3002;
server.listen(port, "0.0.0.0", () => {
  // Add '0.0.0.0' to listen on all network interfaces
  console.log(`Server listening at http://localhost:${port}`);
});
