<script lang="ts">
  import { onMount } from "svelte";
  import { selectedImageUrl } from "../stores.js";

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
  class="gifbackground"
  style="padding:3px; max-width: 400px; position: relative;
display: inline-block;
text-align: center;"
>
  <input
    
    bind:value={search_term}
    placeholder="Search"
    on:input={grabData}
  />

  <div style="margin:0px;padding:0px; background-color:white; gap:0px">
    {#each top_10_gifs as gif}
      <img
        class="gifimage"
        src={gif.media[0].nanogif.url}
        alt=""
        style="width: 150px; height: 150px;cursor: pointer;"
        on:click={() => selectGif(gif)}
      />
    {/each}
  </div>
</div>
{#if $selectedImageUrl}{/if}

<style>
  .gifbackground{
    background-color: #8155BA;
    box-shadow: rgba(99, 99, 99, 0.2) 0px 2px 8px 0px;
    border-radius: 4px;
  }

  input {
    padding: 5px;
    border: 1px solid #ccc;
    border-radius: 3px;
    margin:5px;
  }
  .gifimage{
    margin: 3px;
    padding: 0;
    border: solid #281C2D 4px;
    border-radius: 5px;
  }
  .gifimage:hover{
    
    border: solid #dc9af8 4px;
    
  }
</style>
