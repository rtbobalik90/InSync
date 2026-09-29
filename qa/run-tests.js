#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CONFIG_PATH = path.join(__dirname, 'baseline.json');
const verbose = process.argv.includes('--verbose');

function fail(message) {
  console.error(`RELEASE GATE ERROR: ${message}`);
  process.exitCode = 1;
}

function loadConfig() {
  try {
    return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  } catch (error) {
    fail(`cannot read ${path.relative(ROOT, CONFIG_PATH)}: ${error.message}`);
    return null;
  }
}

function walkFiles(directory) {
  const files = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name, 'en'))) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(absolute));
    else files.push(absolute);
  }
  return files;
}

function sourceSnapshot() {
  const rootFiles = fs.readdirSync(ROOT, { withFileTypes: true })
    .filter(entry => entry.isFile() && /\.(?:js|css|html|webmanifest)$/.test(entry.name))
    .map(entry => path.join(ROOT, entry.name));
  const tracked = [
    ...rootFiles,
    ...walkFiles(path.join(ROOT, 'tests')),
    ...walkFiles(path.join(ROOT, 'assets')).filter(file => path.basename(file) !== '.gitkeep')
  ].sort((a, b) => path.relative(ROOT, a).localeCompare(path.relative(ROOT, b), 'en'));
  const hash = crypto.createHash('sha256');
  for (const file of tracked) {
    hash.update(path.relative(ROOT, file));
    hash.update('\0');
    hash.update(fs.readFileSync(file));
    hash.update('\0');
  }
  return hash.digest('hex');
}

function mediaInventory(config) {
  const mediaRoot = path.join(ROOT, 'assets');
  const mediaFiles = walkFiles(mediaRoot).filter(file => path.basename(file) !== '.gitkeep');
  const hashes = mediaFiles.map(file => ({
    file,
    hash: crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex')
  }));
  const placeholders = hashes.filter(entry => entry.hash === config.placeholderSha256).map(entry => entry.file);
  const reservedFingerprints = new Set(Array.isArray(config.reservedSlotSha256) ? config.reservedSlotSha256 : [config.reservedSlotSha256]);
  const reservedSlots = hashes.filter(entry => reservedFingerprints.has(entry.hash)).map(entry => entry.file);
  const areas = {};

  for (const file of placeholders) {
    const relative = path.relative(mediaRoot, file).split(path.sep);
    const area = relative.length > 1 ? relative[0] : 'root';
    areas[area] = (areas[area] || 0) + 1;
  }

  return {
    totalFiles: mediaFiles.length,
    placeholderFiles: placeholders.length,
    reservedSlotFiles: reservedSlots.length,
    substantiveFiles: mediaFiles.length - placeholders.length - reservedSlots.length,
    placeholderByArea: areas
  };
}

function mediaMismatches(actual, expected) {
  const mismatches = [];
  for (const key of ['totalFiles', 'placeholderFiles', 'reservedSlotFiles', 'substantiveFiles']) {
    if (actual[key] !== expected[key]) mismatches.push(`${key}: expected ${expected[key]}, got ${actual[key]}`);
  }
  const areas = new Set([...Object.keys(actual.placeholderByArea), ...Object.keys(expected.placeholderByArea)]);
  for (const area of [...areas].sort()) {
    const got = actual.placeholderByArea[area] || 0;
    const wanted = expected.placeholderByArea[area] || 0;
    if (got !== wanted) mismatches.push(`placeholderByArea.${area}: expected ${wanted}, got ${got}`);
  }
  return mismatches;
}

function expectedRules(config, profile) {
  return config.expectedFailures.filter(rule => (rule.profiles || []).includes(profile.id)).map((rule, index) => ({
    ...rule,
    index,
    regex: new RegExp(rule.pattern),
    actual: 0,
    messages: []
  }));
}

function run() {
  const config = loadConfig();
  if (!config) return;
  const startingSnapshot = sourceSnapshot();

  const tests = fs.readdirSync(path.join(ROOT, 'tests'))
    .filter(name => name.endsWith('-tests.js'))
    .sort()
    .map(name => `tests/${name}`);

  if (tests.length !== config.testFileCount) {
    fail(`test inventory drift: expected ${config.testFileCount} files, found ${tests.length}`);
  }

  const inventory = mediaInventory(config);
  const matchingProfiles = config.mediaProfiles.filter(profile => mediaMismatches(inventory, profile).length === 0);
  const profile = matchingProfiles.length === 1 ? matchingProfiles[0] : null;
  console.log(`InSync ${config.release} deterministic release gate`);
  console.log(`Runtime: ${process.version}; TZ=${config.timezone}; tests=${tests.length}`);
  console.log('');

  if (!profile) {
    console.error('MEDIA BASELINE: UNREVIEWED STATE');
    console.error(
      `  actual: ${inventory.placeholderFiles}/${inventory.totalFiles} placeholders; ` +
      `${inventory.reservedSlotFiles} reserved slots; ${inventory.substantiveFiles} substantive files`
    );
    for (const candidate of config.mediaProfiles) {
      console.error(`  ${candidate.id}: ${mediaMismatches(inventory, candidate).join('; ') || 'duplicate match'}`);
    }
    process.exitCode = 1;
  } else if (profile.id === 'transport-slim') {
    console.log(
      `MEDIA BASELINE: EXPECTED TRANSPORT GAP [${profile.id}] | ${inventory.placeholderFiles}/${inventory.totalFiles} placeholders ` +
      `(art ${inventory.placeholderByArea.art || 0}, badges ${inventory.placeholderByArea.badges || 0}, exercises ${inventory.placeholderByArea.exercises || 0}); ` +
      `${inventory.reservedSlotFiles} reserved slots; ${inventory.substantiveFiles} substantive files`
    );
  } else {
    console.log(
      `MEDIA BASELINE: PRODUCTION CURRENT [${profile.id}] | ${inventory.substantiveFiles} substantive files; ` +
      `${inventory.reservedSlotFiles} intentional future-route slots; no transport placeholders`
    );
  }
  console.log('');

  const rules = profile ? expectedRules(config, profile) : [];
  let passAssertions = 0;
  let expectedFailures = 0;
  let unexpectedFailures = 0;
  let cleanSuites = 0;
  let gapSuites = 0;
  let retiredSuites = 0;

  for (const test of tests) {
    const result = spawnSync(process.execPath, [path.join(ROOT, test)], {
      cwd: ROOT,
      encoding: 'utf8',
      timeout: config.timeoutMs,
      maxBuffer: 64 * 1024 * 1024,
      env: {
        ...process.env,
        TZ: config.timezone,
        LC_ALL: 'C',
        LANG: 'C'
      }
    });

    const output = `${result.stdout || ''}${result.stderr || ''}`;
    const lines = output.split(/\r?\n/);
    const explicitPasses = lines.filter(line => line.startsWith('PASS:')).length;
    const summary = [...lines].reverse().find(line => /\b\d+\b.*\bpassed,\s*\d+\s+failed\b/i.test(line));
    const summaryMatch = summary && summary.match(/\b(\d+)\b.*\bpassed,\s*(\d+)\s+failed\b/i);
    const passes = explicitPasses || (summaryMatch ? Number(summaryMatch[1]) : 0);
    const failures = lines
      .filter(line => /^FAIL(?::|\s)/.test(line))
      .map(line => line.replace(/^FAIL:?\s*/, '').trim());
    const unclassified = [];
    let expectedInSuite = 0;

    for (const message of failures) {
      const matches = rules.filter(rule => rule.test === test && rule.regex.test(message));
      if (matches.length === 1) {
        matches[0].actual += 1;
        matches[0].messages.push(message);
        expectedInSuite += 1;
      } else {
        unclassified.push(message);
      }
    }

    passAssertions += passes;
    expectedFailures += expectedInSuite;
    unexpectedFailures += unclassified.length;

    const abnormalExit = result.error || result.signal || (result.status !== 0 && failures.length === 0);
    const unexpectedExit = result.status !== 0 && expectedInSuite === 0;
    const hasUnexpected = unclassified.length > 0 || abnormalExit || unexpectedExit;

    if (verbose || hasUnexpected) {
      console.log(`\n--- ${test} raw output ---`);
      process.stdout.write(output.endsWith('\n') ? output : `${output}\n`);
      console.log(`--- end ${test} ---\n`);
    }

    if (expectedInSuite) gapSuites += 1;

    if (hasUnexpected) {
      console.error(`FUNCTIONAL FAIL | ${test} | ${passes} pass, ${unclassified.length} unexpected fail, exit ${result.status}`);
      if (result.error) console.error(`  runner error: ${result.error.message}`);
      if (result.signal) console.error(`  signal: ${result.signal}`);
      for (const message of unclassified) console.error(`  FAIL: ${message}`);
      process.exitCode = 1;
    } else if (expectedInSuite) {
      console.log(`KNOWN MEDIA GAP | ${test} | ${passes} functional pass, ${expectedInSuite} expected transport-media fail`);
    } else if (passes === 0) {
      retiredSuites += 1;
      console.log(`RETIRED/SKIP    | ${test} | no active assertions`);
    } else {
      cleanSuites += 1;
      console.log(`PASS            | ${test} | ${passes} assertions`);
    }
  }

  const drift = rules.filter(rule => rule.actual !== rule.count);
  if (drift.length) {
    console.error('\nEXPECTED-FAILURE BASELINE: CHANGED');
    for (const rule of drift) {
      console.error(`  ${rule.test} / ${rule.pattern}: expected ${rule.count}, got ${rule.actual}`);
    }
    process.exitCode = 1;
  }

  const endingSnapshot = sourceSnapshot();
  if (endingSnapshot !== startingSnapshot) {
    fail('application, test, or media content changed while the gate was running; rerun against a stable tree');
  }

  console.log('');
  console.log('Release gate summary');
  console.log(`  Functional assertions: ${passAssertions} passed, ${unexpectedFailures} failed`);
  console.log(`  Expected transport-media assertions: ${expectedFailures} failed as baselined`);
  console.log(`  Suites: ${cleanSuites} clean, ${gapSuites} with known media gaps, ${retiredSuites} retired/skipped`);
  console.log(`  Media: ${inventory.substantiveFiles} substantive, ${inventory.reservedSlotFiles} reserved route slots, ${inventory.placeholderFiles} transport placeholders`);
  console.log(`  Result: ${process.exitCode ? 'FAIL' : (profile && profile.id === 'transport-slim' ? 'PASS WITH KNOWN TRANSPORT-MEDIA GAPS' : 'PASS')}`);
}

run();
