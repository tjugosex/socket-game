<script lang="ts">
  import { onMount } from "svelte";
  import { io } from "socket.io-client";
  import { each } from "svelte/internal";
  import Game from "./lib/Game.svelte";
  import { prompt, nickname, host } from "./stores.js";
  import socket from "./socket.js";
  import TenorGifs from "./lib/TenorGifs.svelte";
  import style from "./app.css";
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

<main>
  <div class="backgrounddiv">
    {#if playing === false}
      <div class="logo-container">
        <img style="padding:0px;margin:0px" src="https://fav.farm/🤯" width="50px" />
        <h1 style="padding:0px;margin:0px">Mikbox</h1>
      </div>
      <div class="form-container">
        <div class="name-input">
          
          <input placeholder="Nickname" bind:value={$nickname} />
        </div>
        <form on:submit={onFormSubmit}>
          <input type="text" placeholder="Room code" bind:value={roomCode} />
          <button type="submit">Join</button>
        </form>
        <button style="width:fit-content" on:click={connectAsHost}
          >Connect as Host</button
        >

        
      </div>
    {:else if playing === true}
      <button
        on:click={() => {
          playing = false;
          location.reload();
        }}>Back</button
      >
      {#if !InGame}
        <h1>Room code: {roomNumber}</h1>
        <h1>Number of players: {clientsInRoom}</h1>
        {#each players as players}
          <p>{players}</p>
        {/each}
        {#if $host === true && players.length > 1}
          <button on:click={startGame}>Start</button>
        {/if}
      {/if}
    {/if}

    {#if InGame}
      <Game />
    {/if}
    <p style="color:red">{FeedbackText}</p>
  </div>
</main>

<style>
  @import url("https://fonts.googleapis.com/css2?family=Heebo:wght@400;500;600&display=swap");
  :root {
    font-family: "Heebo", sans-serif;
    background-color: #281C2D;
    color: #281C2D;
  }
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
    width: 100%;
  }
  .backgrounddiv {
    background-color: #BEAFC2;
    padding: 15px;
    border-radius: 3px;
    max-width: 95vw;
    min-width:300px;
    box-shadow: #118ab2 0px 1px 4px, #118ab2 0px 0px 0px 3px;
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

  input {
    padding: 5px;
    border: 1px solid #ccc;
    border-radius: 3px;
  }
  .logo-container {
  display: flex;
  align-items: center;
  gap: 10px;
  padding:0px;
  
  margin-bottom: 30px;
}

</style>
