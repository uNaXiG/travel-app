export function isStandaloneBrowser(environment = globalThis) {
  return environment.navigator?.standalone === true ||
    environment.window?.matchMedia?.('(display-mode: standalone)')?.matches === true;
}

export function shouldUseRedirectFlow(environment = globalThis) {
  if (isStandaloneBrowser(environment)) return false;
  const userAgent = environment.navigator?.userAgent || '';
  return /FBAN|FBAV|Instagram|Line|MicroMessenger/i.test(userAgent);
}