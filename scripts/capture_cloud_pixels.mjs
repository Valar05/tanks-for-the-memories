#!/usr/bin/env node
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { chromium } from 'playwright';

const DEFAULT_URL = 'https://pose-lab-visual-truth--tftm-boxmodel-v1-13-ncn1csrf.web.app/hybrid-hull-treads.html?cacheBust=hull-material-v1-20260707';
const DEFAULT_VARIANTS = ['final', 'edge', 'normal', 'roughness'];
const VIEWPORTS = [
  { name: 'phone-portrait', width: 390, height: 844, isMobile: true },
  { name: 'phone-landscape', width: 844, height: 390, isMobile: true },
  { name: 'desktop', width: 1280, height: 720, isMobile: false }
];

function parseArgs(argv) {
  const args = {
    url: DEFAULT_URL,
    label: 'hybrid-hull-treads',
    variants: DEFAULT_VARIANTS,
    waitMs: 6000,
    out: 'cloud-pixel-artifacts'
  };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    const value = arg.includes('=') ? arg.slice(arg.indexOf('=') + 1) : argv[index + 1];
    const key = arg.includes('=') ? arg.slice(0, arg.indexOf('=')) : arg;
    if (!arg.startsWith('--')) throw new Error('unknown positional argument: ' + arg);
    if (!arg.includes('=') && argv[index + 1] && !argv[index + 1].startsWith('--')) index += 1;
    if (key === '--url') args.url = value;
    else if (key === '--label') args.label = value;
    else if (key === '--variants') args.variants = String(value || '').split(',').map((part) => part.trim()).filter(Boolean);
    else if (key === '--wait-ms') args.waitMs = Number(value);
    else if (key === '--out') args.out = value;
    else if (key === '--help' || key === '-h') {
      printHelp();
      process.exit(0);
    } else {
      throw new Error('unknown argument: ' + key);
    }
  }
  if (!args.url || !/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(args.url)) throw new Error('--url must be an absolute http(s) URL');
  if (!args.label || !/^[a-zA-Z0-9._-]+$/.test(args.label)) throw new Error('--label must use only letters, numbers, dot, underscore, or dash');
  if (!args.variants.length) throw new Error('--variants must contain at least one variant');
  if (!Number.isFinite(args.waitMs) || args.waitMs < 0 || args.waitMs > 60000) throw new Error('--wait-ms must be 0..60000');
  return args;
}

function printHelp() {
  console.log([
    'usage: node scripts/capture_cloud_pixels.mjs --url URL [options]',
    '',
    'Options:',
    '  --label=hybrid-hull-treads       filename/artifact prefix',
    '  --variants=final,edge,normal     comma-separated materialDebug variants',
    '  --wait-ms=6000                   delay after load before screenshot',
    '  --out=cloud-pixel-artifacts      output directory'
  ].join('\\n'));
}

function urlForVariant(baseUrl, variant) {
  const url = new URL(baseUrl);
  if (variant !== 'final') url.searchParams.set('materialDebug', variant);
  return url.toString();
}

function safeName(value) {
  return String(value).replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'capture';
}

async function captureOne(browser, args, variant, viewport) {
  const targetUrl = urlForVariant(args.url, variant);
  const page = await browser.newPage({
    viewport: { width: viewport.width, height: viewport.height },
    isMobile: viewport.isMobile,
    deviceScaleFactor: 1
  });
  const consoleMessages = [];
  const pageErrors = [];
  const failedRequests = [];
  page.on('console', (message) => {
    consoleMessages.push({ type: message.type(), text: message.text(), location: message.location() });
  });
  page.on('pageerror', (error) => {
    pageErrors.push({ name: error.name, message: error.message, stack: error.stack || '' });
  });
  page.on('requestfailed', (request) => {
    failedRequests.push({ url: request.url(), method: request.method(), failure: request.failure()?.errorText || 'unknown' });
  });

  const startedAt = new Date().toISOString();
  let responseStatus = null;
  let responseOk = false;
  let title = '';
  let canvasCount = 0;
  const fileBase = safeName(args.label + '-' + variant + '-' + viewport.name);
  const screenshotPath = resolve(args.out, fileBase + '.png');
  try {
    const response = await page.goto(targetUrl, { waitUntil: 'domcontentloaded', timeout: 60000 });
    responseStatus = response ? response.status() : null;
    responseOk = response ? response.ok() : false;
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    if (args.waitMs > 0) await page.waitForTimeout(args.waitMs);
    title = await page.title().catch(() => '');
    canvasCount = await page.locator('canvas').count().catch(() => 0);
    await page.screenshot({ path: screenshotPath, fullPage: false });
  } finally {
    await page.close().catch(() => {});
  }

  const missingScreenshot = !existsSync(screenshotPath);
  return {
    variant,
    viewport: viewport.name,
    width: viewport.width,
    height: viewport.height,
    requestedUrl: targetUrl,
    startedAt,
    finishedAt: new Date().toISOString(),
    responseStatus,
    responseOk,
    title,
    canvasCount,
    screenshotPath,
    missingScreenshot,
    consoleMessages,
    pageErrors,
    failedRequests,
    ok: responseOk && !missingScreenshot
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  args.out = resolve(args.out);
  mkdirSync(args.out, { recursive: true });
  const report = {
    tool: 'tftm-cloud-pixel-capture',
    generatedAt: new Date().toISOString(),
    input: { url: args.url, label: args.label, variants: args.variants, waitMs: args.waitMs, out: args.out },
    note: 'Real Chromium pixels captured in cloud/CI. This is evidence for review, not automatic visual acceptance.',
    captures: []
  };

  const browser = await chromium.launch({ args: ['--no-sandbox'] });
  try {
    for (const variant of args.variants) {
      for (const viewport of VIEWPORTS) {
        const capture = await captureOne(browser, args, variant, viewport);
        report.captures.push(capture);
        console.log((capture.ok ? 'captured ' : 'capture failed ') + capture.variant + ' ' + capture.viewport + ' -> ' + capture.screenshotPath);
      }
    }
  } finally {
    await browser.close().catch(() => {});
  }

  report.ok = report.captures.every((capture) => capture.ok);
  report.failures = report.captures.filter((capture) => !capture.ok).map((capture) => ({
    variant: capture.variant,
    viewport: capture.viewport,
    responseStatus: capture.responseStatus,
    missingScreenshot: capture.missingScreenshot,
    requestedUrl: capture.requestedUrl
  }));
  const reportPath = join(args.out, 'cloud_pixel_report.json');
  writeFileSync(reportPath, JSON.stringify(report, null, 2) + '\\n');
  console.log('report: ' + reportPath);
  if (!report.ok) {
    console.error('one or more cloud pixel captures failed');
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
