<script lang="ts">
  import { onMount } from "svelte";
  import { io } from "socket.io-client";
  import { each } from "svelte/internal";
  import Game from "./lib/Game.svelte";
  import Cube from "./lib/Cube.svelte";
  
  import { prompt, nickname, host } from "./stores.js";
  import socket from "./socket.js";
  import TenorGifs from "./lib/TenorGifs.svelte";
  import './app.postcss';
  import './theme.postcss';
  import '@skeletonlabs/skeleton/styles/all.css';
  let playing: boolean = false;
  
  let roomNumber;
  let clientsInRoom;
  let roomCode;
  let clientId;

  let players = [];
  let FeedbackText = "";
  let InGame: boolean = false;

  onMount(async () => {
    $host = false;
    if (localStorage.getItem("clientId")) {
      clientId = localStorage.getItem("clientId");
    } else {
      const colors = await readRandomLine("/colors.txt");
      const adjective = await readRandomLine("/adjectives.txt");
      const animal = await readRandomLine("/animals.txt");

      clientId = `${colors} ${adjective} ${animal}`;
      localStorage.setItem("clientId", clientId);
    }
    socket.emit("client connected", clientId);

    socket.on("room number", (room) => {
      roomNumber = room;
    });

    socket.on("clientsInRoom", (numClients) => {
      clientsInRoom = numClients;
    });

    socket.on("playerJoined", (playerlist) => {
      players = playerlist;
    });

    socket.on("playerDisconnected", (playerlist) => {
      players = playerlist;
    });

    socket.on("join failed", (feedback) => {
      FeedbackText = feedback;
    });
    socket.on("startGame", (asd) => {
      InGame = true;
    });
    socket.on("receivePrompt", (randomPrompt) => {
      prompt.set(randomPrompt);
    });
  });

  function setFeedbackText(text) {
    FeedbackText = text + "";
  }

  async function readRandomLine(file) {
    const response = await fetch(file);
    const text = await response.text();
    const lines = text.split("\n");
    return lines[Math.floor(Math.random() * lines.length)].toLowerCase();
  }

  async function connectAsHost() {
    if ($nickname.trim() === "") {
      setFeedbackText("Nickname cannot be empty!");
      return;
    }
    socket.emit("room host", clientId, $nickname);

    playing = true;
    $host = true;
  }
  $: {
    if ($nickname && $nickname.trim() === "") {
      FeedbackText = "Nickname cannot be empty!";
    } else {
      FeedbackText = "";
    }
  }

  async function startGame() {
    socket.emit("start game");
  }

  async function connectAsClient(room) {
    if ($nickname.trim() === "") {
      setFeedbackText("Nickname cannot be empty!");
      return;
    }
    socket.emit("room join", room, clientId, $nickname);

    // Listen for 'join successful' event
    socket.on("join successful", () => {
      playing = true;
    });

    // Listen for 'join failed' event
    socket.on("join failed", () => {
      console.error("Failed to join the room");
      // Handle the error, e.g., show an error message to the user
    });
  }

  function onFormSubmit(event) {
    event.preventDefault();
    connectAsClient(roomCode);
  }
</script>
<body class="text-secondary-50">
<main >
  <div class="backgrounddiv variant-ghost-surface">
    {#if playing === false}
      <div class="logo-container">
        <img style="padding:0px;margin:0px" src="https://fav.farm/🤯" width="50px" />
        <h1 style="padding:0px;margin:0px">Mikbox</h1>
        
      </div>
      <div class="form-container">
        <div class="">
          <label class="label"><span>Name: <input class="input text-secondary-900" type="text"placeholder="Nickname" bind:value={$nickname} /></span>
          </label>
        </div>
        <form on:submit={onFormSubmit}>
          <span>Room code: <input class="input text-secondary-900" type="text" placeholder="Room code" bind:value={roomCode} /></span>
          
          <button style="margin-top:4px"class="btn variant-glass" type="submit">Join</button>
        </form>
        <button class="btn variant-glass" style="width:fit-content" on:click={connectAsHost}
          >Connect as Host</button
        >

        
      </div>
    {:else if playing === true}
      <button class="btn variant-glass" style="margin-bottom:20px;"
        on:click={() => {
          playing = false;
          location.reload();
        }}>Back</button
      >
      {#if !InGame}
        <h1>Room code: {roomNumber}</h1>
        <h1>Number of players: {clientsInRoom}</h1>
        <p style="font-weight:bold">Players:</p>
        {#each players as players}
          <p>{players}</p>
        {/each}
        {#if $host === true && players.length > 1}
          <button class="btn variant-glass" on:click={startGame}>Start</button>
        {/if}
      {/if}
    {/if}

    {#if InGame}
      <Game />

    {/if}
    
    <p style="color:red">{FeedbackText}</p>
  </div>
</main></body>

<style>
  @import url("https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600&display=swap");
  :root {
    font-family: "Heebo", sans-serif;
    color: white;
  }
  body{
    background-color:rgb(20, 0, 75);
background-image:
radial-gradient(at 56% 89%, hsla(251,50%,35%,1) 0px, transparent 50%),
radial-gradient(at 60% 89%, hsla(323,50%,35%,1) 0px, transparent 50%),
radial-gradient(at 58% 3%, hsla(245,50%,35%,1) 0px, transparent 50%),
radial-gradient(at 15% 56%, hsla(267,50%,35%,1) 0px, transparent 50%),
radial-gradient(at 6% 37%, hsla(116,50%,35%,1) 0px, transparent 50%),
radial-gradient(at 18% 21%, hsla(345,50%,35%,1) 0px, transparent 50%),
radial-gradient(at 64% 45%, hsla(16,50%,35%,1) 0px, transparent 50%);  }
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    width: 100%;
  }
  .backgrounddiv {
    
    padding: 15px;
    border-radius: 3px;
    max-width: 600px;
    min-width:300px;
    
  }
  .form-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 300px;
  }

  .name-input {
    display: flex;
    gap: 10px;
    align-items: center;
  }

  .name-input p {
    margin: 0;
  }

  
  .logo-container {
  display: flex;
  align-items: center;
  gap: 10px;
  padding:0px;
  
  margin-bottom: 30px;
}
@media (max-width: 767px){
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    min-height: 100vh;
    width: 100%;
    padding-top: 4px;
  }
}
</style>
