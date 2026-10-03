import test from 'node:test';
import assert from 'node:assert/strict';
import { isStandaloneBrowser, shouldUseRedirectFlow } from './authFlow.js';

test('iOS home-screen app uses popup, even with an in-app user agent', () => {
  const environment = { navigator: { standalone: true, userAgent: 'iPhone FBAV' } };
  assert.equal(isStandaloneBrowser(environment), true);
  assert.equal(shouldUseRedirectFlow(environment), false);
});

test('display-mode standalone uses popup', () => {
  const environment = {
    navigator: { userAgent: 'Android' },
    window: { matchMedia: (query) => ({ matches: query === '(display-mode: standalone)' }) },
  };
  assert.equal(isStandaloneBrowser(environment), true);
  assert.equal(shouldUseRedirectFlow(environment), false);
});

test('ordinary Safari and desktop browsers use popup', () => {
  for (const userAgent of ['iPhone Version/18.0 Mobile Safari', 'Chrome', 'Firefox']) {
    const environment = { navigator: { userAgent } };
    assert.equal(isStandaloneBrowser(environment), false);
    assert.equal(shouldUseRedirectFlow(environment), false);
  }
});

test('embedded browsers retain redirect outside standalone mode', () => {
  for (const userAgent of ['FBAN', 'FBAV', 'Instagram', 'Line', 'MicroMessenger']) {
    assert.equal(shouldUseRedirectFlow({ navigator: { userAgent } }), true);
  }
});

test('missing browser APIs do not select redirect or standalone mode', () => {
  assert.equal(isStandaloneBrowser({}), false);
  assert.equal(shouldUseRedirectFlow({}), false);
});