// Runs before the app mounts so the page never flashes the wrong theme. Kept as a file (not inline)
// so the Content-Security-Policy can stay script-src 'self'.
(function () {
  var stored = null
  try { stored = localStorage.getItem('theme') } catch (e) {}
  document.documentElement.setAttribute('data-theme', stored === 'dark' ? 'dark' : 'light')
})()
