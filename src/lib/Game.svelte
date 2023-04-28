<script lang="ts">
  import { onMount } from "svelte";
  import { io } from "socket.io-client";
  import { each } from "svelte/internal";
  import { prompt, selectedImageUrl, nickname, host } from "../stores.js";
  import socket from "../socket.js";
  import TenorGifs from "./TenorGifs.svelte";
  import { fly } from "svelte/transition";
  import { backOut } from "svelte/easing";
  import Cube from "./Cube.svelte";
  import confetti from "canvas-confetti";
  import '../app.postcss';
  import '../theme.postcss';
  import '@skeletonlabs/skeleton/styles/all.css';
  let gameState = 0;
  let Sendprompt = "";
  let waiting: boolean = false;
  let otherPrompt = "";
  let promptAuthor = "";
  let gifAndPromptList = [];
  let nicknamePointsList = [];
  let currentNickname;
  let currentIndex = 0;
  let prevIndex = -1;
  let round = 0;

  function onNext() {
    socket.emit("socketcarousel");
    prevIndex = currentIndex;
  }

  const onPrev = () => {
    if (currentIndex > 0) {
      currentIndex--;
    }
  };
  $: currentNickname = $nickname;
  $: applyAnimation = (index) => index === currentIndex && index !== prevIndex;
  $: if (gameState === 3 && round >= 4) {
    showConfetti();
  }
  onMount(async () => {
    socket.on(
      "updateGameState",
      (gamestate, randomPrompt, randomPromptAuthor) => {
        waiting = false;
        gameState = gamestate;
        otherPrompt = randomPrompt;
        promptAuthor = randomPromptAuthor;
        round++;
        $selectedImageUrl = "";
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

    socket.on("carousel", () => {
      currentIndex++;
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

  function finishGame() {
    socket.emit("finishGame");
  }

  function OnVoting(VotedNM, VotedPNM) {
    socket.emit("vote", VotedNM, VotedPNM, $nickname);
    waiting = true;
    currentIndex = 0;
  }

  function showConfetti() {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: {
        x: 0.5,
        y: 0.5,
      },
    });
  }
</script>

{#if gameState === 0}
  {#if waiting === false}
    <h1 style="margin:10px">{$prompt}</h1>
    <div
      style="width: 100%; height: 100%; display: flex; justify-content: center; align-items: center;"
    >
      <form on:submit|preventDefault={OnPromptSubmit}>
        <input style="margin-top: 20px; margin-bottom:4px"class="input input text-secondary-900"type="text" placeholder="" bind:value={Sendprompt} />
        {#if Sendprompt != ""}
          <button class="btn variant-glass" type="submit">Send</button>
        {:else}
          <button class="btn variant-glass" type="submit" disabled style="filter: grayscale(100%);"
            >Send</button
          >
        {/if}
      </form>
    </div>
  {:else}
    <h1 style="margin:10px">Waiting...</h1>
  {/if}
  <div
    style="width: 100%; height: 100%; margin-top: 50px; display: flex; justify-content: center; align-items: center;"
  >
    <Cube />
  </div>
{/if}

{#if gameState === 1}
  {#if waiting === false}
    <h1 style="margin:10px">{otherPrompt}</h1>

    <TenorGifs />
    {#if $selectedImageUrl}
      <br />
      <div class="image-prompt-container">
        <div class="image-container">
          <p class="prompt">{otherPrompt}</p>
          <img src={$selectedImageUrl} alt="" width=350 style="margin:0px;padding:0px;width:350px" />
        </div>
        <button class="btn variant-glass" on:click={OnGifSubmit}>Send</button>
      </div>
    {/if}
  {:else}
    <h1>Waiting...</h1>
    <div
      style="width: 100%; height: 100%; margin-top: 50px; display: flex; justify-content: center; align-items: center;"
    >
      <Cube />
    </div>
  {/if}
{/if}
{#if gameState === 2}
  {#if waiting === false}
    <ul style="list-style-type: none;margin:0px;padding:0px;">
      {#if currentIndex < gifAndPromptList.length}
        {#each gifAndPromptList as { selectedImageUrl, otherPrompt, otherPromptAuthor, nickname }, index}
          {#if index === currentIndex}
            <li style="margin:0px;padding:0px;">
              <div
                class="image-containerc"
                in:fly={applyAnimation(index)
                  ? { y: 100, easing: backOut }
                  : null}
              >
                <p class="prompt">{otherPrompt}</p>
                <img
                width=350px
                  src={selectedImageUrl}
                  alt=""
                  style="margin:0px;padding:0px;"
                />

                <div>
                  {#if $host === true}
                    <button class="btn variant-glass" on:click={onNext}>Next</button>
                  {/if}
                </div>
              </div>
            </li>
          {/if}
        {/each}
      {:else}
        <div class="votingblock">
          {#each gifAndPromptList as { selectedImageUrl, otherPrompt, otherPromptAuthor, nickname }}
            {#if currentNickname != nickname}
              <div class="image-containeri">
                <p class="prompti">{otherPrompt}</p>
                <img
                  width="100"
                  src={selectedImageUrl}
                  alt=""
                  style="margin:0px;padding:0px; width:150px; height:150px"
                />

                <br />
                <button class="btn variant-glass" on:click={() => OnVoting(nickname, otherPromptAuthor)}
                  >Vote</button
                >
              </div>
            {/if}
          {/each}
        </div>{/if}
    </ul>
  {:else}
    <h1>Waiting...</h1>
    <div
      style="width: 100%; height: 100%; margin-top: 50px; display: flex; justify-content: center; align-items: center;"
    >
      <Cube />
    </div>
  {/if}
{/if}
{#if gameState === 3 && round < 4}
  <h1>Points</h1>
  <ol class="points-list">
    {#each nicknamePointsList as { nickname, points }}
      <li class="points-list-item">
        <span>{nickname}: {points} points</span>
      </li>
    {/each}
  </ol>
  {#if $host === true}
    <button class="btn variant-glass" on:click={restartGame}>Continue</button>{/if}
{/if}
{#if gameState === 3 && round >= 4}
  {#if nicknamePointsList.length > 0}
    <h1>WINNER: {nicknamePointsList[0].nickname}</h1>
  {/if}
  <ol class="points-list">
    {#each nicknamePointsList as { nickname, points }}
      <li class="points-list-item">
        <span>{nickname}: {points} points</span>
      </li>
    {/each}
  </ol>
{/if}

<style>
  .divblock {
    display: inline-flex;
    flex-direction: column;
  }
  .image-prompt-container {
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    margin-top: 10px;
    padding: 0px;
  }

  .image-container {
    position: relative;
    display: inline-block;
    margin: 0px;
    padding: 0px;
  }
  .image-containeri {
    width: 150px;
    position: relative;
    display: inline-block;
    margin: 3px;
    padding: 0px;
  }

  .image-containerc {
    position: relative;
    display: inline-block;
    margin: 5px;
    padding: 0px;
    animation: carousel;
    width: 350px;
  }
  .prompt {
    margin-bottom: 1px;
    width: 350px;
    background-color: rgba(255, 255, 255, 0.8);
    color: rgb(0, 0, 0);
    font-size: 1.5rem;
    text-align: center;
  }
  
  .prompti {
    margin-bottom: 1px;
    width: 150px;
    background-color: rgba(255, 255, 255, 0.8);
    color: rgb(0, 0, 0);
    font-size: 0.5rem;
    text-align: center;
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
  @media (max-width: 400px) {
    
    .image-container {
    width:75vw;
  }
  .image-containerc {
    width:75vw;
  }
  .prompt {
    width:75vw;
  }
  
    
    .image-containeri {
      width: 150px;
      position: relative;
      display: inline-block;
      margin: 0px;
      padding: 0px;
    }
  }
</style>
