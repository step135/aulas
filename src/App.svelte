<script>
  import Database from "./lib/Database.svelte";
  let section = "";
  function ch_section(e) {
    section = e.target.innerHTML;
  }
</script>

<main>
  <div>
  </div>
  <div id="menu">
    <span
      on:click={ch_section}
      on:keydown={ch_section}
      class:selected={section === "exercícios"}>exercícios</span
    >
    <span
      on:click={ch_section}
      on:keydown={ch_section}
      class:selected={section === "dicionário"}>dicionário</span
    >
  </div>
  <div class="card">
    <Database bind:section />
  </div>


</main>

<style>
  main{
    max-width:100%;
    position: relative;
  }
  .selected {
    font-weight: bold;
    color:rgb(124, 229, 129);
  }
  #menu{
    border-bottom: 1px solid rgb(67, 67, 67);
    padding-bottom: 10px;
    padding-top:10px;
  }
  #menu > * {
    cursor: pointer;
    display: inline-block;
    margin: 0 30px;
  }
  .logo {
    height: 6em;
    padding: 1.5em;
    will-change: filter;
    transition: filter 300ms;
  }
  .logo:hover {
    filter: drop-shadow(0 0 2em #646cffaa);
  }
  .logo.svelte:hover {
    filter: drop-shadow(0 0 2em #ff3e00aa);
  }
</style>
