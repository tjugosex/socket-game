<script lang="ts">
  import { onMount } from "svelte";
  import { io } from "socket.io-client";
  import { each } from "svelte/internal";
  import { prompt, selectedImageUrl, nickname } from "../stores.js";
  import socket from "../socket.js";
  import TenorGifs from "./TenorGifs.svelte";
  let gameState = 0;
  let Sendprompt = "";
  let waiting: boolean = false;
  let otherPrompt = "";
  let gifAndPromptList = [];
  onMount(async () => {
    socket.on("updateGameState", (gamestate, randomPrompt) => {
      waiting = false;
      gameState = gamestate;
      otherPrompt = randomPrompt;
    });

    socket.on("updateGameState2", (gamestate, receivedList) => {
      waiting = false;
      gameState = gamestate;

      gifAndPromptList = receivedList;
    });
  });

  function OnPromptSubmit() {
    const result = $prompt.replace("...", Sendprompt);
    socket.emit("sendPrompt", result);
    Sendprompt = "";
    waiting = true;
  }

  function OnGifSubmit() {
    socket.emit("sendGif", $selectedImageUrl, otherPrompt, $nickname);
    waiting = true;
  }

  function restartGame() {
    gameState = 0;
  }
</script>

{#if gameState === 0}
  {#if waiting === false}
    <h1>{$prompt}</h1>
    <form on:submit|preventDefault={OnPromptSubmit}>
      <input type="text" placeholder="" bind:value={Sendprompt} />
      <button type="submit">Send</button>
    </form>{:else}
    <h1>Waiting...</h1>
  {/if}
{/if}
{#if gameState === 1}
  {#if waiting === false}
    <h1>{otherPrompt}</h1>

    <TenorGifs />
    {#if $selectedImageUrl}
    <div class="image-prompt-container">
        <p class="prompt">{otherPrompt}</p>
        <div class="image-container">
          <img
            src={$selectedImageUrl}
            alt=""
            style="width: 498px; aspect-ratio: 1 / 1; max-width:90%;margin:0px;padding:0px;"
          />
        </div>
      </div>
    {/if}
    <button on:click={OnGifSubmit}>Send</button>
  {:else}
    <h1>Waiting...</h1>
  {/if}
{/if}
{#if gameState === 2}
  <h1>Results</h1>
  <ul style="list-style-type: none;margin:0px;padding:0px;">
    {#each gifAndPromptList as { selectedImageUrl, otherPrompt, nickname }}
      <li style="margin:0px;padding:0px;">
        <h1 style="margin-bottom:0px;padding:0px;">{nickname}:</h1>
        <div class="image-container" >
          <p class="prompt">{otherPrompt}</p>
          <img
            src={selectedImageUrl}
            alt=""
            style="width: 498px; aspect-ratio: 1 / 1; max-width:90%;margin:0px;padding:0px;"
          />
        </div>
      </li>
    {/each}
  </ul>
  <button on:click={restartGame}>Restart</button>
{/if}

<style>
  .image-prompt-container {
    display: inline-flex;
    flex-direction: column;
    align-items: center;margin:0px;padding:0px;
  }

  .image-container {
    position: relative;
    display: inline-block;
    margin:0px;padding:0px;
  }

  .prompt {
    margin-bottom: 1px;
    max-width: 90%;

    background-color: rgba(255, 255, 255, 0.8);
    color: rgb(0, 0, 0);
    font-size: 1.5rem;
    text-align: center;
  }
  input {
    padding: 5px;
    border: 1px solid #ccc;
    border-radius: 3px;
  }
</style>
