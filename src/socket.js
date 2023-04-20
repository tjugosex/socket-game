import { io } from "socket.io-client";

const socket = io("https://mikbox.mikael.software", { path: "/socket.io" });

export default socket;
