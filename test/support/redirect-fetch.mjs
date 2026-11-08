const map = [
  ['http://localhost:8585', process.env.STUB_LOCAL],
  ['https://discovery.palexplorer.com', process.env.STUB_DISCOVERY],
];
const realFetch = globalThis.fetch;
globalThis.fetch = (url, init) => {
  let target = String(url);
  for (const [from, to] of map) if (to && target.startsWith(from)) target = to + target.slice(from.length);
  return realFetch(target, init);
};
