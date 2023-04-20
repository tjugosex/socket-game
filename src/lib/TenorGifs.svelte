<script lang="ts">
    import { onMount } from "svelte";
    import { selectedImageUrl } from '../stores.js';
  
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
  
  <input bind:value={search_term} placeholder="Search" on:input={grabData} />
  <h2>Search results:</h2>
  <div>
    {#each top_10_gifs as gif}
      <img
        src="{gif.media[0].nanogif.url}"
        alt=""
        style="width: 220px; height: 164px; cursor: pointer;"
        on:click={() => selectGif(gif)}
      />
    {/each}
  </div>
  {#if $selectedImageUrl}
    
  {/if}
  