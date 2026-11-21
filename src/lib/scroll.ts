// The home page swaps between its phone and desktop layouts when the window crosses 768px; only the
// first one to mount decides where the page starts, so turning a phone sideways does not jump to the top.
let landed = false;

/**
 * Where the home page starts. A link back from a project page (/#work) lands on that section; a reload
 * or a fresh visit starts at the top, even if the address still carries a hash from an earlier click.
 */
export function landHome() {
  if (landed) return;
  landed = true;
  history.scrollRestoration = "manual";
  const nav = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
  const fromThisSite = document.referrer.startsWith(location.origin);
  const target = location.hash && document.getElementById(location.hash.slice(1));
  if (target && nav?.type === "navigate" && fromThisSite) {
    target.scrollIntoView();
    return;
  }
  if (location.hash) history.replaceState(history.state, "", location.pathname + location.search);
  window.scrollTo(0, 0);
}
