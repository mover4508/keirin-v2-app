const SHELL = "keirin-v2.4.12.1";
const INBOX = "keirin-v2-share-inbox";
const MAX_RACE_BYTES = 1024 * 1024;
const base = self.registration.scope;
const urlFor = path => new URL(path, base).href;
const index = urlFor("./index.html");
const assets = ["./manifest.webmanifest", "./icon-192.png", "./icon-512.png"].map(urlFor);
const modules = ["./src/parameter-guard.mjs", "./src/safety-gates.mjs", "./src/ticket-diagnostics.mjs", "./src/meta-loop.mjs"].map(urlFor);
const sharePath = urlFor("./receive-share");

async function installShell() {
  const requests = [index, ...assets, ...modules].map(url => new Request(url, {cache:"reload", credentials:"same-origin"}));
  const responses = await Promise.all(requests.map(request => fetch(request)));
  const expectedPath = (response, i) => i === 0
    ? [index, base].includes(response.url)
    : !response.redirected && response.url === requests[i].url;
  if (responses.some((response, i) => !response.ok || !expectedPath(response, i))) {
    throw Error("アプリの構成ファイルを取得できません。");
  }
  const html = await responses[0].clone().text();
  if (!html.includes('<meta name="application-name" content="競輪予想">') ||
      !html.includes('const RELEASE="2.4.12"')) throw Error("アプリの版を確認できません。");
  const manifest = await responses[1].clone().json();
  if (urlFor(manifest.start_url) !== index || urlFor(manifest.share_target?.action) !== sharePath) {
    throw Error("アプリの起動先と共有先を確認できません。");
  }
  for (const response of responses.slice(2, 4)) { // Only PNG icons; subsequent entries are JavaScript modules.
    const icon = new Uint8Array(await response.clone().arrayBuffer());
    if (![137,80,78,71,13,10,26,10].every((byte, i) => icon[i] === byte)) throw Error("アプリのアイコンを取得できません。");
  }
  const cache = await caches.open(SHELL);
  try {
    await Promise.all(requests.map((request, i) => cache.put(request, responses[i])));
  } catch (error) {
    await caches.delete(SHELL);
    throw error;
  }
}
self.addEventListener("install", event => event.waitUntil(installShell()));
self.addEventListener("activate", event => event.waitUntil((async () => {
  for (const key of await caches.keys()) {
    if (/^keirin-v\d+(?:\.\d+)+$/.test(key) && key !== SHELL) await caches.delete(key);
  }
  await self.clients.claim();
})()));

async function openApp(request) {
  try { return await fetch(request); }
  catch {
    const cached = await (await caches.open(SHELL)).match(index);
    return cached || Response.error();
  }
}
async function receiveShare(request) {
  const open = tag => Response.redirect(index + "#" + tag, 303);
  let form;
  try { form = await request.formData(); } catch { return open("share-format"); }
  const files = form.getAll("race_file");
  if (files.length > 1) return open("share-one");
  const file = files[0];
  let raw;
  if (file) {
    if (typeof file.text !== "function" || !/\.(json|txt)$/i.test(file.name) && !["application/json","text/plain"].includes(file.type)) return open("share-format");
    if (file.size > MAX_RACE_BYTES) return open("share-large");
    try { raw = await file.text(); } catch { return open("share-format"); }
  } else raw = form.get("text") ?? "";
  if (typeof raw !== "string" || !raw.trim() || /^https?:\/\/\S+$/i.test(raw.trim())) return open("share-text");
  if (new Blob([raw]).size > MAX_RACE_BYTES) return open("share-large");
  try {
    const inbox = await caches.open(INBOX);
    const key = urlFor("./received/" + Date.now() + "-" + crypto.randomUUID());
    await inbox.put(key, new Response(raw, {headers:{"Content-Type":"text/plain; charset=utf-8"}}));
  } catch { return open("share-storage"); }
  return open("shared-race");
}
self.addEventListener("fetch", event => {
  const request = event.request, url = new URL(request.url);
  if (request.method === "POST" && url.href === sharePath) {
    event.respondWith(receiveShare(request));
    return;
  }
  if (request.method !== "GET") return;
  const path = url.origin + url.pathname;
  if (request.mode === "navigate" && (path === base || path === index)) {
    event.respondWith(openApp(request));
  } else if (assets.includes(url.href) || modules.includes(url.href)) {
    event.respondWith(caches.open(SHELL).then(async cache => (await cache.match(request)) || fetch(request)));
  }
});
