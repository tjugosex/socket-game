<script lang="ts">
  import { onMount } from "svelte";
  import { io } from "socket.io-client";
  import { each } from "svelte/internal";
  const socket = io("http://localhost:3002"); // Change the URL to your server's address
  let playing: boolean = false;
  let host: boolean = false;
  let roomNumber;
  let clientsInRoom;
  let roomCode;
  let clientId;
  let nickname: string = "";
  let players = [];
  let FeedbackText = "";
  onMount(async () => {
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
    if (nickname.trim() === "") {
      setFeedbackText("Nickname cannot be empty!");
      return;
    }
    socket.emit("room host", clientId, nickname);

    playing = true;
    host = true;
  }
  $: {
    if (nickname && nickname.trim() === "") {
      FeedbackText = "Nickname cannot be empty!";
    } else {
      FeedbackText = "";
    }
  }

  async function connectAsClient(room) {
    if (nickname.trim() === "") {
      setFeedbackText("Nickname cannot be empty!");
      return;
    }
    socket.emit("room join", room, clientId, nickname);

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
  <p>{clientId}</p>
  {#if playing === false}
    <p>Name:</p>
    <input bind:value={nickname} />
    <button on:click={connectAsHost}>Connect as Host</button>

    <form on:submit={onFormSubmit}>
      <input type="text" placeholder="Room code" bind:value={roomCode} />
      <button type="submit">Join</button>
    </form>
  {:else if playing === true}
    <button
      on:click={() => {
        playing = false;
        location.reload();
      }}>Back</button
    >

    <h1>Number of players: {clientsInRoom}</h1>
    <h1>Room code: {roomNumber}</h1>
    {#if host === true}
      <button>Start</button>
    {/if}
  {/if}
  {#each players as players}
    <p>{players}</p>
  {/each}
  <p style="color:red">{FeedbackText}</p>
</main>

<style>
</style>
