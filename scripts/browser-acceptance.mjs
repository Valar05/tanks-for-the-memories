import {createServer} from 'node:http';
import {existsSync, readFileSync, statSync} from 'node:fs';
import path from 'node:path';
import {chromium} from 'playwright-core';

const root = process.cwd();
const dist = path.join(root, 'dist');
const executablePath = process.env.CHROMIUM_PATH || '/data/data/com.termux/files/usr/bin/chromium-browser';

if (!existsSync(path.join(dist, 'index.html'))) {
  throw new Error('dist/index.html is missing. Run npm run build first.');
}

const server = createServer((request, response) => {
  const url = new URL(request.url || '/', 'http://127.0.0.1');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname.startsWith('/tanks-for-the-memories/')) pathname = pathname.slice('/tanks-for-the-memories'.length);
  if (pathname === '/') pathname = '/index.html';
  const file = path.join(dist, pathname);
  if (!file.startsWith(dist) || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404);
    response.end('not found');
    return;
  }
  const type = file.endsWith('.html') ? 'text/html' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : file.endsWith('.wav') ? 'audio/wav' : 'application/octet-stream';
  response.writeHead(200, {'content-type': type});
  response.end(readFileSync(file));
});

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const address = server.address();
const port = typeof address === 'object' && address ? address.port : 0;

const browser = await chromium.launch({headless: true, executablePath, args: ['--no-sandbox', '--disable-gpu']});
try {
  const page = await browser.newPage({viewport: {width: 390, height: 844}});
  await page.goto(`http://127.0.0.1:${port}/tanks-for-the-memories/`, {waitUntil: 'networkidle'});
  await page.getByRole('heading', {name: 'The road remains'}).waitFor();
  await page.getByText('You are an engineer with no hands except other people.').waitFor();
  await page.getByText('What reaches you').waitFor();

  async function transcriptCount() {
    return page.locator('.transcript li').count();
  }

  async function send(command) {
    await page.getByLabel('Command').fill(command);
    await page.getByRole('button', {name: 'Send'}).click();
  }

  const beforeInvalid = await transcriptCount();
  await send('do the thing');
  await page.waitForTimeout(100);
  const afterInvalid = await transcriptCount();
  if (afterInvalid !== beforeInvalid) throw new Error('Invalid command produced transcript output');

  for (const command of [
    'report',
    'driver advance',
    'square us to the wall',
    'infantry hold',
    'gunner fire petard at the seam',
    'sappers inspect the breach',
    'engineers mark the lane',
  ]) await send(command);

  await page.getByText('Lane marked. Infantry can pass through the tape.').waitFor();
  await page.getByText('After-action memory: the road remains').waitFor();
  await page.getByText('moving through marked lane').waitFor();

  const hasSpeechRecognition = await page.evaluate(() => 'SpeechRecognition' in window || 'webkitSpeechRecognition' in window);
  console.log(JSON.stringify({ok: true, transcriptEntries: await transcriptCount(), hasSpeechRecognition, viewport: '390x844'}));
} finally {
  await browser.close();
  server.close();
}
