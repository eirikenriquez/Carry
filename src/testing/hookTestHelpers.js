const React = require('react');
const { create } = require('react-test-renderer');

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

/**
 * Mount a renderless hook probe inside React's asynchronous act.
 */
async function mountProbe(Probe) {
  let renderer;
  await React.act(async () => {
    renderer = create(React.createElement(Probe));
  });
  return renderer;
}

/**
 * Unmount an existing probe inside act so effect cleanup finishes before the next test.
 */
async function unmountProbe(renderer) {
  if (renderer !== undefined) {
    await React.act(async () => {
      renderer.unmount();
    });
  }
}

module.exports = { mountProbe, unmountProbe };
