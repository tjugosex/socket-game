<script lang="ts">
  import { onMount } from "svelte";
  import { io } from "socket.io-client";
  import { each } from "svelte/internal";
  import { prompt, selectedImageUrl, nickname, host } from "../stores.js";
  import socket from "../socket.js";
  import TenorGifs from "./TenorGifs.svelte";
  let gameState = 0;
  let Sendprompt = "";
  let waiting: boolean = false;
  let otherPrompt = "";
  let promptAuthor = "";
  let gifAndPromptList = [];
  let nicknamePointsList = [];
  let currentNickname;
  let currentIndex = 0;

  const onNext = () => {
    currentIndex++;
  };

  const onPrev = () => {
    if (currentIndex > 0) {
      currentIndex--;
    }
  };
  $: currentNickname = $nickname;

  onMount(async () => {
    socket.on(
      "updateGameState",
      (gamestate, randomPrompt, randomPromptAuthor) => {
        waiting = false;
        gameState = gamestate;
        otherPrompt = randomPrompt;
        promptAuthor = randomPromptAuthor;
      }
    );

    socket.on("updateGameState2", (gamestate, receivedList) => {
      console.log("Received data from updateGameState2:", receivedList);
      waiting = false;
      gameState = gamestate;

      gifAndPromptList = receivedList;
    });

    socket.on("updateGameState3", (gamestate, receivedList) => {
      waiting = false;
      gameState = gamestate;
      receivedList.sort((a, b) => b.points - a.points);

      nicknamePointsList = receivedList;
    });
  });

  function OnPromptSubmit() {
    const result = $prompt.replace("...", Sendprompt);
    socket.emit("sendPrompt", result, $nickname);
    Sendprompt = "";
    waiting = true;
  }

  function OnGifSubmit() {
    socket.emit(
      "sendGif",
      $selectedImageUrl,
      otherPrompt,
      promptAuthor,
      $nickname
    );
    waiting = true;
  }

  function restartGame() {
    socket.emit("restartGame");
  }

  function OnVoting(VotedNM, VotedPNM) {
    socket.emit("vote", VotedNM, VotedPNM);
    waiting = true;
  }
</script>

{#if gameState === 0}
  {#if waiting === false}
    <h1>{$prompt}</h1>
    <form on:submit|preventDefault={OnPromptSubmit}>
      <input type="text" placeholder="" bind:value={Sendprompt} />
      {#if Sendprompt != ""}
        <button type="submit">Send</button>
      {:else}
        <button type="submit" disabled style="filter: grayscale(100%);"
          >Send</button
        >
      {/if}
    </form>
  {:else}
    <h1>Waiting...</h1>
  {/if}
{/if}

{#if gameState === 1}
  {#if waiting === false}
    <h1>{otherPrompt}</h1>

    <TenorGifs />
    {#if $selectedImageUrl}
      <br />
      <div class="image-prompt-container">
        <div class="image-container">
          <p class="prompt">{otherPrompt}</p>
          <img src={$selectedImageUrl} alt="" style="margin:0px;padding:0px;" />
        </div>
        <button on:click={OnGifSubmit}>Send</button>
      </div>
    {/if}
  {:else}
    <h1>Waiting...</h1>
  {/if}
{/if}
{#if gameState === 2}
  {#if waiting === false}
    <ul style="list-style-type: none;margin:0px;padding:0px;">
      {#if currentIndex < gifAndPromptList.length}
        {#each gifAndPromptList as { selectedImageUrl, otherPrompt, otherPromptAuthor, nickname }, index}
          {#if index === currentIndex}
            <li style="margin:0px;padding:0px;">
              <div class="image-container">
                <p class="prompt">{otherPrompt}</p>
                <img
                  src={selectedImageUrl}
                  alt=""
                  style="margin:0px;padding:0px;"
                />

                <div>
                  <button on:click={onNext}>Next</button>
                </div>
              </div>
            </li>
          {/if}
        {/each}
      {:else}
        {#each gifAndPromptList as { selectedImageUrl, otherPrompt, otherPromptAuthor, nickname }}
          {#if currentNickname != nickname}
            <li style="margin:0px;padding:0px;">
              <div class="image-container">
                <p class="prompt">{otherPrompt}</p>
                <img
                  src={selectedImageUrl}
                  alt=""
                  style="margin:0px;padding:0px;"
                />

                <br />
                <button on:click={() => OnVoting(nickname, otherPromptAuthor)}
                  >Vote</button
                >
              </div>
            </li>{/if}
        {/each}{/if}
    </ul>
  {:else}
    <h1>Waiting...</h1>
  {/if}
{/if}
{#if gameState === 3}
  <h1>Points</h1>
  <ol class="points-list">
    {#each nicknamePointsList as { nickname, points }}
      <li class="points-list-item">
        <span>{nickname}: {points} points</span>
      </li>
    {/each}
  </ol>
  {#if $host === true}
    <button on:click={restartGame}>Continue</button>{/if}
{/if}

<style>
  .image-prompt-container {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    margin: 0px;
    padding: 0px;
  }

  .image-container {
    position: relative;
    display: inline-block;
    margin: 0px;
    padding: 0px;
  }

  .prompt {
    margin-bottom: 1px;
    width: 498px;
    background-color: rgba(255, 255, 255, 0.8);
    color: rgb(0, 0, 0);
    font-size: 1.5rem;
    text-align: center;
  }

  img {
    width: 498px;
    height: 375px;
    margin: 0px;
    padding: 0px;
  }

  input {
    padding: 5px;
    border: 1px solid #ccc;
    border-radius: 3px;
  }
  .points-list {
    list-style-type: decimal;
    margin: 30px;
    padding: 0;
  }

  .points-list-item {
    margin: 8px 0;
    padding: 0;
    font-size: 1.2rem;
  }

  /* Media query for mobile devices */
  @media (max-width: 767px) {
    .prompt {
      width: 90vw;
      font-size: 1.2rem;
    }

    img {
      width: 90vw;
      height: auto;
    }
  }
</style>
