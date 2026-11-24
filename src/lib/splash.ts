// The splash in index.html holds until the page is ready to show, then bursts open onto it.
export const splashReady = () => (window as { __splashReady?: () => void }).__splashReady?.();
