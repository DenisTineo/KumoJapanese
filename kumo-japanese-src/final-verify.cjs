const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const vm = require('node:vm');
const asar = require('@electron/asar');

const root = __dirname;
const archive = path.join(root, 'release', 'win-unpacked', 'resources', 'app.asar');
const setup = path.join(root, 'release', 'Kumo Japanese Setup 2.7.0.exe');
const blockmap = `${setup}.blockmap`;
const configPath = path.join(root, 'release', 'builder-effective-config.yaml');
const readPacked = (file) => asar.extractFile(archive, file).toString('utf8');
const hashBuffer = (buffer) => crypto.createHash('sha256').update(buffer).digest('hex');
const sourcePairs = [
  ['main.cjs', 'main.cjs'],
  ['preload.cjs', 'preload.cjs'],
  ['src/app.js', 'src/app.js'],
  ['src/index.html', 'src/index.html'],
  ['src/styles.css', 'src/styles.css']
];
const packedSourceMatches = Object.fromEntries(sourcePairs.map(([source, packed]) => [source, hashBuffer(fs.readFileSync(path.join(root, source))) === hashBuffer(asar.extractFile(archive, packed))]));
const packedSourcesMatch = Object.values(packedSourceMatches).every(Boolean);
const packageJson = JSON.parse(readPacked('package.json'));
const main = readPacked('main.cjs');
const preload = readPacked('preload.cjs');
const renderer = readPacked('src/app.js');
const html = readPacked('src/index.html');
const css = readPacked('src/styles.css');
const config = fs.readFileSync(configPath, 'utf8');
const entries = asar.listPackage(archive);
const audioEntries = entries.filter((entry) => /assets[\\/]audio[\\/].+\.mp3$/i.test(entry)).length;
const physicalAudio = fs.readdirSync(path.join(root, 'release', 'win-unpacked', 'resources', 'app.asar.unpacked', 'assets', 'audio')).filter((file) => file.endsWith('.mp3')).length;

const functionSource = (name) => {
  const start = renderer.indexOf(`  function ${name}`);
  const end = renderer.indexOf('\n  function ', start + 12);
  if (start < 0 || end < 0) throw new Error(`Could not extract ${name}`);
  return renderer.slice(start, end);
};
const sandbox = { Intl, Set, Map, Math, TextEncoder };
vm.createContext(sandbox);
vm.runInContext(`${functionSource('escapeHtml')}\n${functionSource('shuffle')}\n${functionSource('tokenizeJapaneseSentence')}\n${functionSource('createOrderingQuestion')}\nthis.tokenize = tokenizeJapaneseSentence; this.createQuestion = createOrderingQuestion;`, sandbox);
const tokenCases = ['彼は「行く」と言った。', 'AI, modelを使います。', 'AI (model)を使います。', '彼は "AI model" と言った。'];
const tokenDetails = tokenCases.map((text) => ({ text, tokens: sandbox.tokenize(text), rebuilt: sandbox.tokenize(text).join('') }));
const tokenizationPreservesText = tokenDetails.every((entry) => entry.rebuilt === entry.text);
const openingPunctuationGroupedForward = sandbox.tokenize('彼は「行く」と言った。').some((token) => token.startsWith('「'));
let visibleShuffleAlwaysChanges = true;
for (let index = 0; index < 100; index += 1) {
  const question = sandbox.createQuestion('It rains here.', 'ここでは雨、雨が降ります。', 'MyMemory');
  const byId = new Map(question.tokens.map((token) => [token.id, token.text]));
  const shuffledText = question.shuffledTokenIds.map((id) => byId.get(id).trim()).join('\u0000');
  const orderedText = question.tokens.map((token) => token.text.trim()).join('\u0000');
  if (shuffledText === orderedText) visibleShuffleAlwaysChanges = false;
}

const setupBuffer = fs.readFileSync(setup);
const checks = {
  versionIs270: packageJson.version === '2.7.0',
  packedSourcesMatch,
  translationBridgePacked: main.includes("ipcMain.handle('translation:to-japanese'") && preload.includes('translateToJapanese'),
  strictIpcOriginPacked: main.includes('event.senderFrame === event.sender.mainFrame') && main.includes('event.senderFrame?.url === RENDERER_URL'),
  safeProgressLifecyclePacked: main.includes('requestSingleInstanceLock') && main.includes('progressWriteQueue') && main.includes("const temporaryPath = `${filePath}.tmp`") && renderer.includes('if (!stateHydrated) return;'),
  sentenceViewPacked: renderer.includes("'sentence-builder': renderSentenceBuilder") && html.includes('data-view="sentence-builder"'),
  exactOrderingScorePacked: renderer.includes("question.kind === 'ordering'\n      ? practiceSession.selected === question.answer"),
  modalAccessibilityPacked: renderer.includes('aria-modal="true"') && renderer.includes("$('#appShell').inert = true") && renderer.includes("event.key === 'Tab'"),
  tokenizationPreservesText,
  openingPunctuationGroupedForward,
  visibleShuffleAlwaysChanges,
  allAudioPacked: audioEntries === 9612 && physicalAudio === 9612,
  upgradeGuidMatches: config.includes('guid: cc26c2f4-b390-5edc-81f9-c8b93d5536e7') && config.includes('perMachine: false'),
  installerAndBlockmapExist: setupBuffer.length > 0 && fs.statSync(blockmap).size > 0
};
const result = {
  checks,
  setupBytes: setupBuffer.length,
  setupSha256: hashBuffer(setupBuffer),
  setupModified: fs.statSync(setup).mtime.toISOString(),
  packedSourceMatches,
  tokenDetails,
  audioEntries,
  physicalAudio
};
console.log(JSON.stringify(result, null, 2));
if (Object.values(checks).some((value) => !value)) process.exitCode = 1;
