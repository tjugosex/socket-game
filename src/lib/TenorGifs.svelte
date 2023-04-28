<script lang="ts">
  import { onMount } from "svelte";
  import { selectedImageUrl } from "../stores.js";
  import '../app.postcss';
  import '../theme.postcss';
  import '@skeletonlabs/skeleton/styles/all.css';
  let top_10_gifs = [];
  let search_term: string = "";

  onMount(() => {
    grabData();
  });

  async function httpGetAsync(theUrl) {
    const response = await fetch(theUrl);
    if (response.status === 200) {
      return response.text();
    }
    throw new Error("Failed to fetch data");
  }

  async function tenorCallback_search(responsetext) {
    const response_objects = JSON.parse(responsetext);
    top_10_gifs = response_objects["results"];
  }

  async function grabData() {
    const apikey = "LIVDSRZULELA";
    const lmt = 8;

    const search_url = `https://g.tenor.com/v1/search?q=${search_term}&key=${apikey}&limit=${lmt}`;

    try {
      const responseText = await httpGetAsync(search_url);
      await tenorCallback_search(responseText);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }

  function selectGif(gif) {
    selectedImageUrl.set(gif["media"][0]["tinygif"]["url"]);
  }
</script>


<div
  class="gifbackground variant-ghost-tertiary"
  style="
    padding: 3px;
    position: relative;
    display: inline-block;
    text-align: center;
  "
>
  <input
    class="input text-secondary-900"
    type="text"
    bind:value="{search_term}"
    placeholder="Search"
    on:input="{grabData}"
  />

  <div class="gif-container">
    {#each top_10_gifs as gif}
      <img
        class="gifimage"
        src="{gif.media[0].nanogif.url}"
        alt=""
        on:click={() => selectGif(gif)}
      />
    {/each}
  </div>
</div>
{#if $selectedImageUrl}{/if}

<style>
  .gifbackground{
    border-radius: 4px;
  }

  .gifimage{
    margin: 1px;
    padding: 0;
    border: solid #281C2D 1px;
    border-radius: 5px;
    width: 100%;
    height: auto;
    object-fit: cover;
  }
  .gifimage:hover{
    border: solid #dc9af8 1px;
  }

  .gif-container {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 1px;
    width: 100%;
  }
  @media (max-width: 500px) {
    .gif-container {
      
    }
  }
</style>