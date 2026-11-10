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
  ['src/styles.css', 'src/styles.css'],
  ['src/mock-exam-bank.js', 'src/mock-exam-bank.js']
];
const packedSourceMatches = Object.fromEntries(sourcePairs.map(([source, packed]) => [source, hashBuffer(fs.readFileSync(path.join(root, source))) === hashBuffer(asar.extractFile(archive, packed))]));
const packedSourcesMatch = Object.values(packedSourceMatches).every(Boolean);
const packageJson = JSON.parse(readPacked('package.json'));
const main = readPacked('main.cjs');
const preload = readPacked('preload.cjs');
const renderer = readPacked('src/app.js');
const html = readPacked('src/index.html');
const css = readPacked('src/styles.css');
const corpus = readPacked('src/corpus.js');
const particles = readPacked('src/particles.js');
const data = readPacked('src/data.js');
const audioManifest = readPacked('src/audio-manifest.js');
const mockExamBank = readPacked('src/mock-exam-bank.js');
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

const bankSandbox = { Intl };
bankSandbox.window = bankSandbox;
vm.createContext(bankSandbox);
[corpus, particles, data, audioManifest, mockExamBank].forEach((source) => vm.runInContext(source, bankSandbox));
const mockBankReport = bankSandbox.KUMO_MOCK_EXAMS.validate();
const mockBankBehaviorPacked = mockBankReport.ok && ['N5', 'N4', 'N3', 'N2', 'N1'].every((level) =>
  ['full', 'mini'].every((mode) => {
    const questions = bankSandbox.KUMO_MOCK_EXAMS.createExam(level, mode);
    const expected = mode === 'full' ? [20, 12, 4, 4] : [10, 6, 2, 2];
    const sectionCounts = ['Language knowledge', 'Reading', 'Listening'].map((section) => questions.filter((question) => question.section === section).length);
    return questions.length === expected[0]
      && sectionCounts.every((count, index) => count === expected[index + 1])
      && new Set(questions.map((question) => question.id)).size === questions.length;
  })
);

const historySandbox = {
  DATA: { levelOrder: ['N5', 'N4', 'N3', 'N2', 'N1'] },
  EXAM_SECTION_NAMES: ['Language knowledge', 'Reading', 'Listening']
};
vm.createContext(historySandbox);
vm.runInContext(`${functionSource('clamp')}\n${functionSource('safeRecordText')}\n${functionSource('normalizeMockResult')}\nthis.normalizeMockResult = normalizeMockResult;`, historySandbox);
const normalizedImportedMock = historySandbox.normalizeMockResult({
  id: '\"><img data-injected src=x>',
  date: '2026-01-01T00:00:00.000Z',
  level: 'N3',
  mode: 'full',
  total: 1,
  correct: 20,
  percent: 100,
  sections: {
    'Language knowledge': { correct: 0, total: 12 },
    Reading: { correct: 0, total: 4 },
    Listening: { correct: 0, total: 4 }
  }
});
const rejectedImportedMock = historySandbox.normalizeMockResult({
  date: '2026-01-01T00:00:00.000Z',
  level: 'N3',
  mode: 'full',
  sections: {
    'Language knowledge': { correct: 0, total: 1 },
    Reading: { correct: 0, total: 1 },
    Listening: { correct: 0, total: 1 }
  }
});
const normalizedSkippedMock = historySandbox.normalizeMockResult({
  date: '2026-02-01T00:00:00.000Z',
  level: 'N4',
  mode: 'full',
  sections: {
    'Language knowledge': { correct: 10, total: 12, skipped: 0 },
    Reading: { correct: 4, total: 4, skipped: 0 },
    Listening: { correct: 0, total: 4, skipped: 4 }
  }
});
const rejectedNonAudioSkip = historySandbox.normalizeMockResult({
  date: '2026-02-01T00:00:00.000Z',
  level: 'N4',
  mode: 'full',
  sections: {
    'Language knowledge': { correct: 10, total: 12, skipped: 1 },
    Reading: { correct: 4, total: 4, skipped: 0 },
    Listening: { correct: 0, total: 4, skipped: 0 }
  }
});
const rejectedOverfullSkip = historySandbox.normalizeMockResult({
  date: '2026-02-01T00:00:00.000Z',
  level: 'N4',
  mode: 'full',
  sections: {
    'Language knowledge': { correct: 10, total: 12, skipped: 0 },
    Reading: { correct: 4, total: 4, skipped: 0 },
    Listening: { correct: 1, total: 4, skipped: 4 }
  }
});
const rejectedSkippedMiss = historySandbox.normalizeMockResult({
  date: '2026-02-01T00:00:00.000Z',
  level: 'N4',
  mode: 'full',
  sections: {
    'Language knowledge': { correct: 10, total: 12, skipped: 0 },
    Reading: { correct: 4, total: 4, skipped: 0 },
    Listening: { correct: 0, total: 4, skipped: 4 }
  },
  missed: [{ section: 'Listening', prompt: 'Contradictory miss', answer: 'A', given: 'B' }]
});
const mockHistoryNormalizationPacked = normalizedImportedMock?.total === 20
  && normalizedImportedMock.correct === 0
  && normalizedImportedMock.skipped === 0
  && normalizedImportedMock.attempted === 20
  && normalizedImportedMock.percent === 0
  && normalizedSkippedMock?.total === 20
  && normalizedSkippedMock.skipped === 4
  && normalizedSkippedMock.attempted === 16
  && normalizedSkippedMock.correct === 14
  && normalizedSkippedMock.percent === 88
  && rejectedImportedMock === null
  && rejectedNonAudioSkip === null
  && rejectedOverfullSkip === null
  && rejectedSkippedMiss === null;

const skipSandbox = {};
vm.createContext(skipSandbox);
vm.runInContext(`${functionSource('normalizeAnswer')}\n${functionSource('advancePracticeState')}\n${functionSource('skipPracticeAudioState')}\n${functionSource('setExamAnswerState')}\n${functionSource('toggleExamAudioSkipState')}\n${functionSource('scoreExamSession')}\nthis.advancePracticeState = advancePracticeState; this.skipPracticeAudioState = skipPracticeAudioState; this.setExamAnswerState = setExamAnswerState; this.toggleExamAudioSkipState = toggleExamAudioSkipState; this.scoreExamSession = scoreExamSession;`, skipSandbox);
const practiceFixture = { questions: [{ kind: 'listening' }, { kind: 'choice' }], index: 0, skipped: 0, checked: false, selected: 'old', orderedTokenIds: ['old'], answerCorrect: false, finished: false };
const practiceSkipChanged = skipSandbox.skipPracticeAudioState(practiceFixture);
const allSkippedPractice = { questions: [{ kind: 'listening' }], index: 0, skipped: 0, checked: false, finished: false };
const allPracticeSkipChanged = skipSandbox.skipPracticeAudioState(allSkippedPractice);
const examFixture = { questions: [{ kind: 'listening' }, { kind: 'listening' }], answers: ['old'], skipped: [], index: 0, result: null };
const firstExamSkip = skipSandbox.toggleExamAudioSkipState(examFixture);
const lastExamSkip = skipSandbox.toggleExamAudioSkipState(examFixture);
const twoSkipState = { index: examFixture.index, skipped: [...examFixture.skipped], firstAnswer: examFixture.answers[0] };
const answerUnskips = skipSandbox.setExamAnswerState(examFixture, 'chosen');
const undoFixture = { questions: [{ kind: 'listening' }], answers: [], skipped: [0], index: 0, result: null };
const undoSkip = skipSandbox.toggleExamAudioSkipState(undoFixture);
const scoredFixture = skipSandbox.scoreExamSession({
  questions: [
    { kind: 'choice', section: 'Language knowledge', prompt: 'Known', answer: 'A' },
    { kind: 'listening', section: 'Listening', prompt: 'Skipped', answer: 'B' },
    { kind: 'listening', section: 'Listening', prompt: 'Wrong', answer: 'C' }
  ],
  answers: ['A', null, null],
  skipped: [1]
});
const skipStateBehaviorPacked = practiceSkipChanged
  && practiceFixture.index === 1 && practiceFixture.skipped === 1 && !practiceFixture.checked && practiceFixture.selected === null
  && allPracticeSkipChanged && allSkippedPractice.finished && allSkippedPractice.skipped === 1
  && firstExamSkip.changed && firstExamSkip.skipped && twoSkipState.index === 1 && twoSkipState.firstAnswer == null
  && lastExamSkip.changed && lastExamSkip.skipped && twoSkipState.skipped.length === 2
  && answerUnskips && examFixture.answers[1] === 'chosen' && examFixture.skipped.length === 1 && examFixture.skipped[0] === 0
  && undoSkip.changed && !undoSkip.skipped && undoFixture.skipped.length === 0 && undoFixture.index === 0
  && scoredFixture.attempted === 2 && scoredFixture.skipped === 1 && scoredFixture.correct === 1 && scoredFixture.percent === 50
  && scoredFixture.sections.Listening.total === 2 && scoredFixture.sections.Listening.skipped === 1
  && scoredFixture.missed.length === 1 && scoredFixture.missed[0].prompt === 'Wrong';
const renderExamQuestionSource = functionSource('renderExamQuestion');
const liveExamProvenanceOpaque = !renderExamQuestionSource.includes('question.source?.recordId')
  && !renderExamQuestionSource.includes('question.source?.detail')
  && !renderExamQuestionSource.includes('sourceReference');

const setupBuffer = fs.readFileSync(setup);
const checks = {
  versionIs270: packageJson.version === '2.7.0',
  packedSourcesMatch,
  translationBridgePacked: main.includes("ipcMain.handle('translation:to-japanese'") && preload.includes('translateToJapanese'),
  strictIpcOriginPacked: main.includes('event.senderFrame === event.sender.mainFrame') && main.includes('event.senderFrame?.url === RENDERER_URL'),
  safeProgressLifecyclePacked: main.includes('requestSingleInstanceLock') && main.includes('progressWriteQueue') && main.includes("const temporaryPath = `${filePath}.tmp`") && renderer.includes('if (!stateHydrated) return;'),
  sentenceViewPacked: renderer.includes("'sentence-builder': renderSentenceBuilder") && html.includes('data-view="sentence-builder"'),
  kanjiDirectoryPacked: html.includes('core-skill-copy') && renderer.includes('function renderKanjiDetailPage') && renderer.includes('data-action="open-kanji"') && renderer.includes("case 'kanji-index'") && css.includes('.kanji-list-row') && css.includes('.kanji-entry-hero'),
  neutralAudioSkippingPacked: renderer.includes('function skipPracticeAudioQuestion') && renderer.includes('data-action="skip-practice-audio"') && renderer.includes("case 'exam-skip-audio'") && renderer.includes('score?.skipped ?? 0') && renderer.includes('const attempted = session.questions.length - skipped') && css.includes('.exam-dot.skipped') && css.includes('.exam-modal:not(.exam-result) .exam-workspace'),
  skipStateBehaviorPacked,
  openMockBankPacked: html.includes('src="mock-exam-bank.js"') && renderer.includes('MOCK_EXAMS.createExam(level, mode)') && mockExamBank.includes('Kumo Open JLPT-Aligned Mock Bank') && mockExamBank.includes('No JLPT examination or Jisho.org question content is copied.'),
  mockBankBehaviorPacked,
  mockHistoryNormalizationPacked,
  liveExamProvenanceOpaque,
  exactOrderingScorePacked: /question\.kind === 'ordering'\r?\n\s+\? practiceSession\.selected === question\.answer/.test(renderer),
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
  mockBankReport,
  tokenDetails,
  audioEntries,
  physicalAudio
};
console.log(JSON.stringify(result, null, 2));
if (Object.values(checks).some((value) => !value)) process.exitCode = 1;
