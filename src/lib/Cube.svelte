<script>
</script>

<div id="cube" style="width: 4em; height: 8em;">
    <div style="transform: translate3d(0em, 0em, 2em)"><div>🤯</div></div>
  <div style="transform: translate3d(4em, 0em, 2em)"><div>🤯</div></div>
  <div style="transform: translate3d(0em, 4em, 2em)"><div>🤯</div></div>
  <div style="transform: translate3d(4em, 4em, 2em)"><div>🤯</div></div>
  <div style="transform: translate3d(0em, 0em, -2em)"><div>🤯</div></div>
  <div style="transform: translate3d(4em, 0em, -2em)"><div>🤯</div></div>
  <div style="transform: translate3d(0em, 4em, -2em)"><div>🤯</div></div>
  <div style="transform: translate3d(4em, 4em, -2em)"><div>🤯</div></div>
</div>

<style>
  #cube {
    position: relative;
    transform-style: preserve-3d;
    animation: spin 10s linear infinite;
  }

  #cube > div {
    position: absolute;
    transform-style: preserve-3d;
  }

  @keyframes spin {
    from {
      transform: rotateX(-0.1turn) rotateY(0turn);
    }
    to {
      transform: rotateX(-0.1turn) rotateY(1turn);
    }
  }
  #cube > div > div {
    animation: un-spin 10s linear infinite;
  }

  @keyframes un-spin {
    from {
      transform: rotateY(0turn);
    }
    to {
      transform: rotateY(-1turn);
    }
  }
</style>
