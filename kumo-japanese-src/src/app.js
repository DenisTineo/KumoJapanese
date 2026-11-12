(() => {
  'use strict';

  const DATA = window.KUMO_DATA;
  const CONJUGATOR = window.KUMO_CONJUGATOR;
  const JAPANESE = window.KUMO_JAPANESE;
  const GUIDE = window.KUMO_GUIDE;
  const MOCK_EXAMS = window.KUMO_MOCK_EXAMS;
  const desktop = window.kumoDesktop;
  const levelColors = Object.fromEntries(DATA.levelOrder.map((level) => [level, DATA.levels[level].color]));
  const exerciseCache = new Map();
  const validViews = ['learn', 'review', 'sentence-builder', 'kana', 'vocabulary', 'grammar', 'kanji', 'exam', 'immersion', 'writing', 'progress', 'guide'];
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  const DEFAULT_STATE = {
    schemaVersion: 8,
    onboarded: false,
    selectedLevel: 'N5',
    activeView: 'learn',
    defaultPracticeLength: 25,
    daily: { date: '', seconds: 0, questions: 0, sessions: 0, lessons: 0, words: 0, readings: 0 },
    studyTotals: { seconds: 0, questions: 0, sessions: 0, readings: 0 },
    studyActivity: {},
    completedLessons: [],
    completedReadings: [],
    knownWords: [],
    favoriteWords: [],
    masteredKana: [],
    practicedWriting: [],
    practicedWords: [],
    speakingPracticed: [],
    readingSentencesPracticed: [],
    particleSentencesPracticed: [],
    conjugationsPracticed: [],
    mistakes: [],
    mockResults: [],
    settings: { speechRate: 0.82, reduceMotion: false }
  };

  let state = structuredClone(DEFAULT_STATE);
  let stateHydrated = false;
  let saveTimer = null;
  let appVersion = '2.7.0';
  let practiceSession = null;
  let examSession = null;
  let examTimer = null;
  let strokeTimer = null;
  let openReaderState = null;
  let recognition = null;
  let speechCapture = null;
  let canvasController = null;
  let activeAudio = null;
  let activeUtterance = null;
  let modalReturnFocus = null;

  const ui = {
    kanaScript: 'hiragana',
    kanaSet: 'basic',
    selectedKana: 'a',
    vocabSearch: '',
    vocabLevel: 'N5',
    vocabCategory: 'All',
    vocabPage: 1,
    grammarLevel: 'N5',
    grammarSearch: '',
    grammarTag: 'All',
    grammarPage: 1,
    openGrammar: null,
    selectedKanji: null,
    kanjiSearch: '',
    kanjiPage: 1,
    immersionTab: 'listening',
    readingLength: 10,
    speakingSearch: '',
    speakingPage: 1,
    speakingExerciseId: null,
    writingMode: 'kanji',
    writingChar: '日',
    writingWordId: null,
    writingSearch: '',
    writingPage: 1,
    strokeStep: 1,
    strokeNumbers: true,
    inkColor: '#20212a',
    practiceFocus: 'mixed',
    practiceLength: 25,
    sentenceText: '',
    sentenceLanguage: 'en',
    sentenceBusy: false,
    sentenceError: '',
    sentenceRequestId: 0
  };

  function dateKey(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }

  function sentenceSourceValue() {
    return ui.sentenceText.trim();
  }

  function sentenceSourceBytes() {
    return new TextEncoder().encode(sentenceSourceValue()).length;
  }

  function icon(name) {
    return `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function shuffle(items) {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i -= 1) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  function unique(items) {
    return [...new Set(items)];
  }

  function formatNumber(value) {
    return Number(value || 0).toLocaleString('en-US');
  }

  function paginationMarkup(scope, page, totalPages, totalItems) {
    if (totalPages <= 1) return `<div class="collection-summary">${formatNumber(totalItems)} items</div>`;
    const start = Math.max(1, page - 2);
    const end = Math.min(totalPages, start + 4);
    const pages = [];
    for (let number = Math.max(1, end - 4); number <= end; number += 1) pages.push(number);
    return `<nav class="collection-pager" aria-label="Collection pages"><button class="btn btn-small btn-ghost" data-action="${scope}-page" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}>← Previous</button><div>${pages.map((number) => `<button class="page-number ${number === page ? 'active' : ''}" data-action="${scope}-page" data-page="${number}">${number}</button>`).join('')}</div><span>Page ${page} of ${formatNumber(totalPages)} · ${formatNumber(totalItems)} items</span><button class="btn btn-small btn-ghost" data-action="${scope}-page" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}>Next →</button></nav>`;
  }

  function japanesePhraseHtml(text, furigana = '', options = {}) {
    if (JAPANESE?.phraseHtml) return JAPANESE.phraseHtml(text, furigana, options);
    return escapeHtml(text);
  }

  function furiganaHtml(source, options = {}) {
    const text = JAPANESE?.plainText ? JAPANESE.plainText(source) : String(source || '').replace(/\{([^|{}]+)\|[^{}]*\}/g, '$1');
    return japanesePhraseHtml(text, source, options);
  }

  function furiganaReadingText(source) {
    return String(source || '').replace(/\{([^|{}]+)\|([^{}]+)\}/g, (_, base, reading) => JAPANESE?.isValidReading?.(reading) ? reading : base).replace(/[{}]/g, '');
  }

  function grammarQuestionPattern(pattern) {
    return JAPANESE?.cleanGrammarPattern?.(pattern) || String(pattern || '').replace(/[（(][^（）()]*[A-Za-z][^（）()]*[）)]/gu, '').trim();
  }

  const EXAM_SECTION_NAMES = ['Language knowledge', 'Reading', 'Listening'];

  function safeRecordText(value, limit = 500) {
    return String(value ?? '').slice(0, limit);
  }

  function normalizeMockResult(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const level = DATA.levelOrder.includes(value.level) ? value.level : null;
    const mode = value.mode === 'full' || value.mode === 'mini' ? value.mode : null;
    const timestamp = Date.parse(value.date);
    if (!level || !mode || !Number.isFinite(timestamp) || !value.sections || typeof value.sections !== 'object') return null;
    const expectedTotals = mode === 'full'
      ? { 'Language knowledge': 12, Reading: 4, Listening: 4 }
      : { 'Language knowledge': 6, Reading: 2, Listening: 2 };
    const sections = {};
    let total = 0;
    let correct = 0;
    let skipped = 0;
    for (const name of EXAM_SECTION_NAMES) {
      const score = value.sections[name];
      const sectionTotal = Number(score?.total);
      const sectionCorrect = Number(score?.correct);
      const sectionSkipped = Number(score?.skipped ?? 0);
      if (!Number.isInteger(sectionTotal) || sectionTotal !== expectedTotals[name]
        || !Number.isInteger(sectionCorrect) || sectionCorrect < 0 || sectionCorrect > sectionTotal
        || !Number.isInteger(sectionSkipped) || sectionSkipped < 0 || sectionSkipped > sectionTotal
        || (name !== 'Listening' && sectionSkipped !== 0)
        || sectionCorrect + sectionSkipped > sectionTotal) return null;
      sections[name] = { correct: sectionCorrect, total: sectionTotal, skipped: sectionSkipped };
      total += sectionTotal;
      correct += sectionCorrect;
      skipped += sectionSkipped;
    }
    const missed = (Array.isArray(value.missed) ? value.missed : []).slice(0, 200).map((entry) => {
      if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
      const section = EXAM_SECTION_NAMES.includes(entry.section) ? entry.section : 'Language knowledge';
      const sourceUrl = /^https:\/\/[^\s]+$/i.test(String(entry.sourceUrl || '')) ? String(entry.sourceUrl) : '';
      return {
        prompt: safeRecordText(entry.prompt),
        answer: safeRecordText(entry.answer),
        given: safeRecordText(entry.given),
        section,
        sourceName: safeRecordText(entry.sourceName, 120),
        sourceRef: safeRecordText(entry.sourceRef, 160),
        sourceUrl
      };
    }).filter(Boolean);
    if (EXAM_SECTION_NAMES.some((name) => missed.filter((entry) => entry.section === name).length > sections[name].total - sections[name].skipped - sections[name].correct)) return null;
    return {
      id: safeRecordText(value.id || `mock-${timestamp}`, 120),
      date: new Date(timestamp).toISOString(),
      level,
      mode,
      total,
      attempted: total - skipped,
      skipped,
      correct,
      percent: total > skipped ? Math.round((correct / (total - skipped)) * 100) : null,
      sections,
      timeUsed: clamp(Math.trunc(Number(value.timeUsed) || 0), 0, 86400),
      timedOut: Boolean(value.timedOut),
      missed
    };
  }

  function normalizeState(saved) {
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return structuredClone(DEFAULT_STATE);
    const merged = {
      ...structuredClone(DEFAULT_STATE),
      ...saved,
      settings: { ...DEFAULT_STATE.settings, ...(saved.settings || {}) },
      daily: { ...DEFAULT_STATE.daily, ...(saved.daily || {}) },
      studyTotals: { ...DEFAULT_STATE.studyTotals, ...(saved.studyTotals || {}) },
      studyActivity: saved.studyActivity && typeof saved.studyActivity === 'object' ? saved.studyActivity : {}
    };

    if (!DATA.levelOrder.includes(merged.selectedLevel)) merged.selectedLevel = 'N5';
    if (!validViews.includes(merged.activeView)) merged.activeView = 'learn';
    ['completedLessons', 'completedReadings', 'knownWords', 'favoriteWords', 'masteredKana', 'practicedWriting', 'practicedWords', 'speakingPracticed', 'readingSentencesPracticed', 'particleSentencesPracticed', 'conjugationsPracticed', 'mistakes', 'mockResults'].forEach((key) => {
      if (!Array.isArray(merged[key])) merged[key] = [];
    });
    merged.mockResults = merged.mockResults.map(normalizeMockResult).filter(Boolean).slice(0, 25);
    const vocabularyAliases = DATA.legacyAliases?.vocabulary || {};
    merged.knownWords = unique(merged.knownWords.map((id) => vocabularyAliases[id] || id));
    merged.favoriteWords = unique(merged.favoriteWords.map((id) => vocabularyAliases[id] || id));
    merged.defaultPracticeLength = [10, 25, 50, 100].includes(Number(merged.defaultPracticeLength)) ? Number(merged.defaultPracticeLength) : 25;
    merged.studyTotals.seconds = Math.max(0, Number(merged.studyTotals.seconds) || 0);
    merged.studyTotals.questions = Math.max(0, Number(merged.studyTotals.questions) || 0);
    merged.studyTotals.sessions = Math.max(0, Number(merged.studyTotals.sessions) || 0);
    merged.studyTotals.readings = Math.max(0, Number(merged.studyTotals.readings) || 0);
    merged.settings.speechRate = clamp(Number(merged.settings.speechRate) || 0.82, 0.55, 1.15);
    delete merged.xp;
    delete merged.hearts;
    delete merged.streak;
    delete merged.lastStudyDate;
    delete merged.dailyGoal;
    delete merged.activity;
    delete merged.daily.xp;
    delete merged.daily.reviews;
    merged.schemaVersion = 8;
    ensureDaily(merged);
    return merged;
  }

  function ensureDaily(target = state) {
    const today = dateKey();
    if (!target.daily || target.daily.date !== today || typeof target.daily.questions !== 'number') {
      target.daily = { date: today, seconds: 0, questions: 0, sessions: 0, lessons: 0, words: 0, readings: 0 };
    }
    return target.daily;
  }

  function ensureActivityDay() {
    const today = dateKey();
    if (!state.studyActivity[today] || typeof state.studyActivity[today] !== 'object') {
      state.studyActivity[today] = { seconds: 0, questions: 0, sessions: 0 };
    }
    return state.studyActivity[today];
  }

  function queueSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(async () => {
      try {
        await desktop?.saveProgress(state);
      } catch (error) {
        console.error('Could not save progress:', error);
        showToast('Progress could not be saved.', 'error');
      }
    }, 250);
  }

  function applyPreferences() {
    document.body.classList.toggle('reduce-motion', Boolean(state.settings.reduceMotion));
  }

  function recordQuestions(count = 1) {
    if (count <= 0) return;
    ensureDaily();
    const activity = ensureActivityDay();
    state.daily.questions += count;
    state.studyTotals.questions += count;
    activity.questions += count;
    queueSave();
  }

  function recordSession({ seconds = 0, questions = 0, lesson = false, reading = false } = {}) {
    ensureDaily();
    const activity = ensureActivityDay();
    const measuredSeconds = Math.max(0, Math.round(seconds));
    if (questions > 0) {
      state.daily.questions += questions;
      state.studyTotals.questions += questions;
      activity.questions += questions;
    }
    state.daily.sessions += 1;
    state.studyTotals.sessions += 1;
    state.daily.seconds += measuredSeconds;
    state.studyTotals.seconds += measuredSeconds;
    activity.sessions += 1;
    activity.seconds += measuredSeconds;
    if (lesson) state.daily.lessons += 1;
    if (reading) {
      state.daily.readings += 1;
      state.studyTotals.readings += 1;
    }
    queueSave();
  }

  function formatStudyTime(seconds) {
    const totalMinutes = Math.round((Number(seconds) || 0) / 60);
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes ? `${hours} h ${minutes} min` : `${hours} h`;
  }

  function allLessons(level = state.selectedLevel) {
    return DATA.levels[level].units.flatMap((entry) => entry.lessons);
  }

  function lessonCompletion(level = state.selectedLevel) {
    const lessons = allLessons(level);
    const complete = lessons.filter((lesson) => state.completedLessons.includes(lesson.id)).length;
    return { complete, total: lessons.length, percent: Math.round((complete / lessons.length) * 100) || 0 };
  }

  function fullCompletion() {
    const lessons = DATA.levelOrder.flatMap((level) => allLessons(level));
    const complete = lessons.filter((lesson) => state.completedLessons.includes(lesson.id)).length;
    return { complete, total: lessons.length, percent: Math.round((complete / lessons.length) * 100) || 0 };
  }

  function currentLesson(level = state.selectedLevel) {
    return allLessons(level).find((lesson) => !state.completedLessons.includes(lesson.id)) || allLessons(level).at(-1);
  }

  function pageHeader(eyebrow, title, description, actions = '') {
    return `
      <div class="page-head">
        <div class="page-head-copy">
          <div class="eyebrow">${escapeHtml(eyebrow)}</div>
          <h1>${title}</h1>
          <p>${description}</p>
        </div>
        ${actions}
      </div>`;
  }

  function levelStyle(level = state.selectedLevel) {
    return `style="--level-color:${levelColors[level]}"`;
  }

  function updateHeaderContext() {
    const context = $('#headerContext');
    if (!context) return;
    if (state.activeView === 'sentence-builder') {
      context.innerHTML = '<span class="online-status"><i></i>Online translation</span><span>Sentence ordering practice</span>';
      return;
    }
    const counts = DATA.corpusMeta?.counts;
    context.innerHTML = `<span class="offline-status"><i></i>Offline library</span><span>${formatNumber(counts?.vocab?.[state.selectedLevel] || 0)} words · ${formatNumber(counts?.kanji?.[state.selectedLevel] || 0)} kanji</span>`;
  }

  function renderChrome() {
    $('#headerLevels').innerHTML = DATA.levelOrder.map((level) => `
      <button class="level-button ${state.selectedLevel === level ? 'active' : ''}" data-level="${level}" style="--level-color:${levelColors[level]}">${level}</button>
    `).join('');

    updateHeaderContext();
    $('#reviewBadge').textContent = String(Math.min(99, state.mistakes.length));
    $$('.nav-item[data-view], .mobile-nav [data-view]').forEach((button) => {
      const active = button.dataset.view === state.activeView;
      button.classList.toggle('active', active);
      if (active) button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
  }

  function renderRightRail() {
    ensureDaily();
    const days = [];
    const labels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    for (let offset = 6; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = dateKey(date);
      const activity = state.studyActivity[key] || { questions: 0, sessions: 0, seconds: 0 };
      days.push({ key, label: labels[date.getDay()], day: date.getDate(), active: activity.questions > 0 || activity.sessions > 0, questions: activity.questions || 0, today: offset === 0 });
    }
    const levelProgress = lessonCompletion();
    const levelWords = DATA.vocabulary.filter((word) => word.level === state.selectedLevel);
    const levelWordIds = new Set(levelWords.map((word) => word.id));
    const knownAtLevel = state.knownWords.filter((id) => levelWordIds.has(id)).length;
    const wordPercent = Math.round((knownAtLevel / levelWords.length) * 100) || 0;
    const tips = [
      'Read Japanese aloud—even when studying grammar. Sound and structure should grow together.',
      'Recall before revealing. The small struggle to retrieve an answer strengthens memory.',
      'Shadow one sentence several times: listen, pause, imitate, then speak along with it.',
      'Learn kanji inside words. Readings become easier when tied to useful vocabulary.',
      'Alternate intensive study with easy input that you can mostly understand.',
      'Write one tiny diary entry today. Three honest sentences are enough.',
      'Review mistakes by asking why the wrong answer felt plausible.'
    ];

    $('#rightRail').innerHTML = `
      <div class="right-rail-inner">
        <section class="rail-card">
          <div class="rail-card-head"><h3>Study today</h3><span>${new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</span></div>
          <div class="study-summary-grid"><div><strong>${state.daily.questions}</strong><small>Questions</small></div><div><strong>${state.daily.sessions}</strong><small>Sessions</small></div><div><strong>${formatStudyTime(state.daily.seconds)}</strong><small>Focused time</small></div></div>
        </section>
        <section class="rail-card">
          <div class="rail-card-head"><h3>${state.selectedLevel} coverage</h3><span>Learning record</span></div>
          <div class="coverage-list"><div><p><strong>Guided lessons</strong><span>${levelProgress.complete}/${levelProgress.total}</span></p><div class="bar-track"><i style="--width:${levelProgress.percent}%;--bar-color:var(--level-color, #9b7cff)"></i></div></div><div><p><strong>Known vocabulary</strong><span>${knownAtLevel}/${formatNumber(levelWords.length)}</span></p><div class="bar-track"><i style="--width:${wordPercent}%;--bar-color:#38cfa2"></i></div></div><div><p><strong>Review queue</strong><span>${state.mistakes.length} items</span></p></div></div>
        </section>
        <section class="rail-card">
          <div class="rail-card-head"><h3>Recent activity</h3><span>Last 7 days</span></div>
          <div class="week-strip">${days.map((day) => `<div class="day-dot ${day.active ? 'studied' : ''} ${day.today ? 'today' : ''}" title="${day.key}: ${day.questions} questions"><span>${day.day}</span><small>${day.label}</small></div>`).join('')}</div>
        </section>
        <section class="tip-card"><small>今日のコツ · STUDY NOTE</small><p>${tips[new Date().getDay()]}</p></section>
      </div>`;
  }

  const viewRenderers = {
    learn: renderLearn,
    review: renderReview,
    'sentence-builder': renderSentenceBuilder,
    kana: renderKana,
    vocabulary: renderVocabulary,
    grammar: renderGrammar,
    kanji: renderKanji,
    exam: renderExam,
    immersion: renderImmersion,
    writing: renderWriting,
    progress: renderProgress,
    guide: renderGuide
  };

  function renderAll({ preserveScroll = false } = {}) {
    ensureDaily();
    renderChrome();
    renderRightRail();
    const main = $('#mainContent');
    const previousScroll = main.scrollTop;
    main.innerHTML = viewRenderers[state.activeView]();
    if (preserveScroll) main.scrollTop = previousScroll;
    else main.scrollTop = 0;
    if (state.activeView === 'writing') requestAnimationFrame(setupWritingCanvas);
  }

  function renderLearn() {
    const level = DATA.levels[state.selectedLevel];
    const progress = lessonCompletion();
    const corpusCounts = DATA.corpusMeta?.counts;
    const nextLesson = currentLesson();
    const flatLessons = allLessons();
    const firstIncompleteIndex = flatLessons.findIndex((lesson) => !state.completedLessons.includes(lesson.id));
    const currentIndex = firstIncompleteIndex === -1 ? flatLessons.length - 1 : firstIncompleteIndex;

    return `
      <div class="page" ${levelStyle()}>
        ${pageHeader(`${state.selectedLevel} · ${level.name}`, `Your path to <span style="color:var(--level-color)">${state.selectedLevel}</span>`, level.summary)}
        <section class="hero-card">
          <div class="hero-copy">
            <div class="hero-kicker">${icon('book')} ${progress.percent}% level complete</div>
            <h2>${progress.percent === 100 ? `${state.selectedLevel} path mastered` : `Continue: ${escapeHtml(nextLesson.title)}`}</h2>
            <p>${progress.percent === 100 ? 'Use smart review to keep this level strong, or move upward when you are ready.' : level.target}</p>
            <button class="btn btn-primary" data-action="start-lesson" data-lesson="${nextLesson.id}">${icon('play')} ${progress.percent === 100 ? 'Practice this level' : 'Start next lesson'}</button>
          </div>
          <div class="hero-art"><div class="orbit"><div class="hero-kanji">${level.japanese.slice(0, 1)}</div></div></div>
        </section>
        <div class="level-summary-row">
          <div class="mini-metric"><small>Lessons</small><strong>${progress.complete} / ${progress.total}</strong></div>
          <div class="mini-metric"><small>Corpus kanji</small><strong>${formatNumber(corpusCounts?.kanji?.[state.selectedLevel] || level.guide.kanji)}</strong></div>
          <div class="mini-metric"><small>Corpus words</small><strong>${formatNumber(corpusCounts?.vocab?.[state.selectedLevel] || level.guide.words)}</strong></div>
          <div class="mini-metric"><small>Typical study</small><strong>${level.guide.study}</strong></div>
        </div>
        <div class="section-title"><div><h2>${state.selectedLevel} learning path</h2><p>Complete each skill to open the next one.</p></div><button class="link-button" data-view="guide">View level guide</button></div>
        <div class="course-path">
          ${level.units.map((courseUnit, unitIndex) => {
            const nodes = courseUnit.lessons.map((lesson) => {
              const index = flatLessons.findIndex((candidate) => candidate.id === lesson.id);
              const complete = state.completedLessons.includes(lesson.id);
              const current = index === currentIndex;
              const locked = index > currentIndex && !complete;
              const status = complete ? 'complete' : current ? 'current' : locked ? 'locked' : '';
              const nodeIcon = complete ? 'check' : locked ? 'lock' : lesson.type === 'immersion' ? 'headphones' : lesson.type === 'checkpoint' ? 'grid' : lesson.type === 'vocabulary' ? 'book' : 'star';
              return `<button class="lesson-node ${status}" data-action="${locked ? 'locked-lesson' : 'start-lesson'}" data-lesson="${lesson.id}" title="${escapeHtml(lesson.title)}">
                <span class="node-bubble">${icon(nodeIcon)}</span><span class="node-title">${escapeHtml(lesson.title)}</span><span class="node-meta">~${lesson.minutes || 10} min</span>
              </button>`;
            }).join('');
            return `<section class="unit-block">
              <div class="unit-banner"><span class="unit-number">${String(unitIndex + 1).padStart(2, '0')}</span><div><h3>${escapeHtml(courseUnit.title)}</h3><p>${escapeHtml(courseUnit.description)}</p></div><span class="unit-jp">${escapeHtml(courseUnit.japanese)}</span></div>
              <div class="path-nodes">${nodes}</div>
            </section>`;
          }).join('')}
        </div>
      </div>`;
  }

  function renderSentenceBuilder() {
    const languages = [
      ['en', 'English'],
      ['es', 'Spanish'],
      ['pt', 'Portuguese'],
      ['fr', 'French'],
      ['de', 'German'],
      ['it', 'Italian']
    ];
    const examples = [
      'I drink coffee every morning.',
      'My friend is studying Japanese at the library.',
      'Tomorrow we will go to the station by bus.'
    ];
    const sourceValue = sentenceSourceValue();
    const byteLength = sentenceSourceBytes();

    return `
      <div class="page sentence-builder-page" style="--level-color:#9b7cff">
        ${pageHeader('Translate · Shuffle · Rebuild', 'Japanese sentence builder', 'Type a sentence, translate it into Japanese, then put the shuffled Japanese word tiles back into their natural order.')}
        <div class="sentence-builder-layout">
          <section class="card sentence-compose-card" aria-busy="${ui.sentenceBusy}">
            <div class="sentence-card-heading"><span class="sentence-step">1</span><div><small>CREATE AN EXERCISE</small><h2>What would you like to say?</h2><p>Use a complete sentence with several words for the best ordering exercise.</p></div></div>
            <label class="sentence-field-label" for="sentenceLanguage">Sentence language</label>
            <select class="sentence-language" id="sentenceLanguage" ${ui.sentenceBusy ? 'disabled' : ''}>${languages.map(([code, label]) => `<option value="${code}" ${ui.sentenceLanguage === code ? 'selected' : ''}>${label}</option>`).join('')}</select>
            <div class="sentence-textarea-label"><label class="sentence-field-label" for="sentenceText">Your sentence</label><span class="${byteLength > 500 ? 'over-limit' : ''}">${byteLength}/500 bytes</span></div>
            <textarea id="sentenceText" class="sentence-textarea" rows="5" placeholder="Example: I read a book on the train every morning." ${ui.sentenceBusy ? 'disabled' : ''}>${escapeHtml(ui.sentenceText)}</textarea>
            ${ui.sentenceError ? `<div class="sentence-error" role="alert"><b>!</b><span>${escapeHtml(ui.sentenceError)}</span></div>` : ''}
            <div class="sentence-submit-row"><p>Only this sentence and the selected language are sent for translation.</p><button class="btn btn-purple sentence-submit" data-action="build-sentence" ${ui.sentenceBusy || !sourceValue || byteLength > 500 ? 'disabled' : ''}>${ui.sentenceBusy ? '<span class="button-spinner"></span> Translating…' : `${icon('play')} Translate & shuffle`}</button></div>
          </section>
          <aside class="sentence-side-stack">
            <section class="card sentence-how-card"><div class="sentence-card-heading compact"><span class="sentence-step">2</span><div><small>ORDER THE TILES</small><h3>Build the Japanese sentence</h3></div></div><ol><li>Tap Japanese tiles in order.</li><li>Tap a placed tile to return it.</li><li>Check your answer and review the correction.</li></ol></section>
            <section class="card sentence-examples"><small>TRY AN EXAMPLE</small>${examples.map((example) => `<button data-action="sentence-example" data-sentence="${escapeHtml(example)}">${escapeHtml(example)}</button>`).join('')}</section>
            <section class="sentence-online-note"><span>翻</span><div><strong>Online translation</strong><p>This activity needs internet access and uses the <a href="https://mymemory.translated.net/doc/spec.php" target="_blank" rel="noreferrer">MyMemory API</a>. The rest of your Kumo library remains offline.</p></div></section>
          </aside>
        </div>
      </div>`;
  }

  function renderReview() {
    const focusOptions = [
      { id: 'mixed', icon: '総', title: 'Mixed review', description: 'Interleave every skill', color: '#c7b9ff' },
      { id: 'kanji', icon: '漢', title: 'Kanji only', description: 'Meaning and readings', color: '#ffb84a' },
      { id: 'vocabulary', icon: '語', title: 'All vocabulary', description: 'Words in context', color: '#9b7cff' },
      { id: 'verbs', icon: '動', title: 'Verbs only', description: 'Meanings and readings', color: '#38cfa2' },
      { id: 'conjugation', icon: '活', title: 'Verb conjugation', description: `${formatNumber(conjugationBank(state.selectedLevel).length)} verbs · level-aware forms`, color: '#ffb84a' },
      { id: 'nouns', icon: '名', title: 'Nouns only', description: 'People, things, and ideas', color: '#5cc8ff' },
      { id: 'adjectives', icon: '形', title: 'Adjectives only', description: 'Qualities and states', color: '#ff6f91' },
      { id: 'grammar', icon: '文', title: 'Grammar only', description: 'Forms and functions', color: '#38cfa2' },
      { id: 'particles', icon: '助', title: 'Particles in sentences', description: `${formatNumber(DATA.particleMeta?.counts?.[state.selectedLevel] || 0)} contextual blanks`, color: '#ffb84a' },
      { id: 'reading', icon: '読', title: 'Sentence reading', description: `${formatNumber(readingSentenceBank(state.selectedLevel).length)} comprehension items`, color: '#5cc8ff' },
      { id: 'listening', icon: '聴', title: 'Listening only', description: 'Audio comprehension', color: '#5cc8ff' },
      { id: 'kana', icon: 'あ', title: 'Kana only', description: 'Script-speed recall', color: '#ff6f91' }
    ];
    const activeFocus = focusOptions.find((option) => option.id === ui.practiceFocus) || focusOptions[0];
    const conjugationForms = (CONJUGATOR.LEVEL_FORMS[state.selectedLevel] || []).map((key) => CONJUGATOR.FORM_DEFINITIONS[key].label);
    const estimate = Math.max(4, Math.round(ui.practiceLength * .42));

    return `
      <div class="page" ${levelStyle()}>
        ${pageHeader('Practice center', 'Build the session you need', 'Choose one precise topic or mix skills together, then set a session length that fits your study time.')}
        <div class="practice-center-layout">
          <section class="card session-builder">
            <div class="builder-heading"><div><div class="eyebrow">CUSTOM SESSION</div><h2>Session builder</h2><p>Questions stay at your selected JLPT level and chosen focus.</p></div><span class="builder-count">${ui.practiceLength}<small>questions</small></span></div>
            <div class="builder-section"><div class="builder-label"><strong>1 · JLPT level</strong><span>Content difficulty</span></div><div class="builder-levels">${DATA.levelOrder.map((level) => `<button class="builder-pill ${state.selectedLevel === level ? 'active' : ''}" style="--pill-color:${levelColors[level]}" data-action="practice-level" data-level="${level}">${level}</button>`).join('')}</div></div>
            <div class="builder-section"><div class="builder-label"><strong>2 · Focus topic</strong><span>Keep every question on one skill</span></div><div class="focus-picker">${focusOptions.map((focus) => `<button class="focus-option ${ui.practiceFocus === focus.id ? 'active' : ''}" style="--focus-color:${focus.color}" data-action="practice-focus" data-focus="${focus.id}"><span class="focus-glyph">${focus.icon}</span><span><b>${focus.title}</b><small>${focus.description}</small></span><i>✓</i></button>`).join('')}</div>${ui.practiceFocus === 'conjugation' ? `<div class="conjugation-scope"><strong>${state.selectedLevel} forms in this session</strong><div>${conjugationForms.map((label) => `<span>${escapeHtml(label)}</span>`).join('')}</div></div>` : ''}</div>
            <div class="builder-section"><div class="builder-label"><strong>3 · Session length</strong><span>Long sessions repeat the pool in a new order</span></div><div class="length-picker">${[10, 25, 50, 100].map((length) => `<button class="length-option ${ui.practiceLength === length ? 'active' : ''}" data-action="practice-length" data-length="${length}"><b>${length}</b><small>${Math.max(4, Math.round(length * .42))} min</small></button>`).join('')}</div></div>
            <div class="builder-launch"><div><span class="focus-glyph" style="--focus-color:${activeFocus.color}">${activeFocus.icon}</span><p><strong>${state.selectedLevel} · ${activeFocus.title}</strong><small>${ui.practiceLength} questions · about ${estimate} minutes · instant corrections</small></p></div><button class="btn btn-primary" data-action="start-custom-session">${icon('play')} Start session</button></div>
          </section>
          <aside class="practice-presets">
            <section class="practice-preset smart"><span class="preset-icon">${icon('review')}</span><div><small>QUICK START</small><h3>Smart review</h3><p>Seven mixed questions with immediate feedback.</p><button class="btn btn-small btn-purple" data-action="start-review" data-focus="mixed">Start 7 questions</button></div></section>
            <section class="practice-preset exam"><span class="preset-icon">${icon('grid')}</span><div><small>EXAM CONDITIONS</small><h3>JLPT mock test</h3><p>Timed sections, flags, no hints, and a full score report.</p><button class="btn btn-small btn-ghost" data-view="exam">Open test center</button></div></section>
            <section class="practice-stats card"><div><strong>${state.mistakes.length}</strong><small>Review items</small></div><div><strong>${state.daily.sessions}</strong><small>Sessions today</small></div><div><strong>${state.knownWords.length}</strong><small>Words known</small></div></section>
          </aside>
        </div>
        <div class="section-title"><div><h2>Recent mistakes</h2><p>Errors are saved locally so you can retry their corrections.</p></div></div>
        ${state.mistakes.length ? `<div class="mistake-list">${state.mistakes.slice(0, 8).map((mistake, index) => `
          <div class="mistake-row"><strong class="mistake-jp">${escapeHtml(mistake.prompt)}</strong><span>Correct: ${escapeHtml(mistake.answer)}</span><button data-action="retry-mistake" data-index="${index}">Retry</button></div>
        `).join('')}</div>` : `<div class="empty-state"><div class="empty-icon">✓</div><h3>No saved mistakes yet</h3><p>Missed answers will appear here with their corrections.</p></div>`}
      </div>`;
  }

  function currentKanaItems() {
    return ui.kanaSet === 'combos' ? DATA.kanaCombos : DATA.kana;
  }

  function renderKana() {
    const items = currentKanaItems();
    const selected = items.find((item) => item.romaji === ui.selectedKana) || items[0];
    ui.selectedKana = selected.romaji;
    const scriptLabel = ui.kanaScript === 'hiragana' ? 'Hiragana' : 'Katakana';
    const mastered = items.filter((item) => state.masteredKana.includes(`${ui.kanaScript}:${item.romaji}`)).length;

    return `
      <div class="page" style="--level-color:#9b7cff">
        ${pageHeader('Sound & script', 'Kana laboratory', 'Tap any character to hear it, mark it learned, or start a speed-recognition drill.', `<button class="btn btn-primary" data-action="start-kana-drill">${icon('play')} Start kana drill</button>`)}
        <div class="toolbar">
          <div class="segmented"><button class="${ui.kanaScript === 'hiragana' ? 'active' : ''}" data-action="kana-script" data-script="hiragana">あ Hiragana</button><button class="${ui.kanaScript === 'katakana' ? 'active' : ''}" data-action="kana-script" data-script="katakana">ア Katakana</button></div>
          <div class="segmented"><button class="${ui.kanaSet === 'basic' ? 'active' : ''}" data-action="kana-set" data-set="basic">Basic 46</button><button class="${ui.kanaSet === 'combos' ? 'active' : ''}" data-action="kana-set" data-set="combos">Combinations</button></div>
          <span class="result-count">${mastered}/${items.length} mastered</span>
        </div>
        <div class="kana-layout">
          <section class="card kana-board"><div class="kana-grid">
            ${items.map((item) => {
              const key = `${ui.kanaScript}:${item.romaji}`;
              return `<button class="kana-cell ${item.romaji === selected.romaji ? 'active' : ''} ${state.masteredKana.includes(key) ? 'mastered' : ''}" data-action="select-kana" data-romaji="${item.romaji}"><b>${item[ui.kanaScript]}</b><small>${item.romaji}</small></button>`;
            }).join('')}
          </div></section>
          <aside class="card kana-detail">
            <div class="kana-detail-char">${selected[ui.kanaScript]}</div>
            <h3>${selected.romaji}</h3><p>${scriptLabel} · one mora</p>
            <div class="kana-actions">
              <button class="btn btn-ghost" data-action="speak" data-speech="${selected[ui.kanaScript]}">${icon('volume')} Hear</button>
              <button class="btn ${state.masteredKana.includes(`${ui.kanaScript}:${selected.romaji}`) ? 'btn-primary' : 'btn-ghost'}" data-action="master-kana" data-romaji="${selected.romaji}">${icon('check')} ${state.masteredKana.includes(`${ui.kanaScript}:${selected.romaji}`) ? 'Learned' : 'Mark'}</button>
            </div>
            <div class="kana-note"><strong>Pronunciation cue:</strong> Say “${selected.romaji}” cleanly in one beat. Japanese rhythm counts morae, so aim for equal timing rather than English stress.</div>
          </aside>
        </div>
      </div>`;
  }

  function filteredVocabulary() {
    const search = ui.vocabSearch.trim().toLocaleLowerCase();
    return DATA.vocabulary.filter((word) => {
      const levelMatch = ui.vocabLevel === 'All' || word.level === ui.vocabLevel;
      const categoryMatch = ui.vocabCategory === 'All' || word.category === ui.vocabCategory;
      const searchable = `${word.word} ${word.reading} ${word.romaji || ''} ${word.meaning} ${word.example || ''} ${(word.otherForms || []).join(' ')}`.toLocaleLowerCase();
      return levelMatch && categoryMatch && (!search || searchable.includes(search));
    });
  }

  function vocabularyListMarkup(words) {
    if (!words.length) return `<div class="empty-state"><div class="empty-icon">語</div><h3>No words found</h3><p>Try a different search, word class, or JLPT level.</p></div>`;
    return words.map((word) => `<article class="word-row">
      <div class="word-main"><strong>${escapeHtml(word.word)}</strong><small>${escapeHtml(word.reading)}</small><em>${word.level}</em></div>
      <div class="word-meaning"><strong>${escapeHtml(word.meaning)}</strong><span>${word.example ? `${escapeHtml(word.example)} · ${escapeHtml(word.translation)}` : escapeHtml((word.posDescriptions || []).join(' · '))}</span></div>
      <div class="word-actions">
        <button class="word-action" data-action="speak" data-speech="${escapeHtml(word.word)}" title="Hear pronunciation">${icon('volume')}</button>
        <button class="word-action ${state.favoriteWords.includes(word.id) ? 'active' : ''}" data-action="favorite-word" data-word="${word.id}" title="Favorite">${icon('star')}</button>
        <button class="word-action known ${state.knownWords.includes(word.id) ? 'active' : ''}" data-action="know-word" data-word="${word.id}" title="Mark known">${icon('check')}</button>
        <button class="word-action" data-action="word-detail" data-word="${word.id}" title="Open full entry">${icon('chevron')}</button>
      </div>
    </article>`).join('');
  }

  function vocabularyCollectionMarkup(words) {
    const pageSize = 50;
    const totalPages = Math.max(1, Math.ceil(words.length / pageSize));
    ui.vocabPage = clamp(ui.vocabPage, 1, totalPages);
    const pageWords = words.slice((ui.vocabPage - 1) * pageSize, ui.vocabPage * pageSize);
    return `<div class="word-list" id="wordList">${vocabularyListMarkup(pageWords)}</div>${paginationMarkup('vocab', ui.vocabPage, totalPages, words.length)}`;
  }

  function renderVocabulary() {
    const categories = ['All', ...unique(DATA.vocabulary.map((word) => word.category)).sort()];
    const words = filteredVocabulary();
    return `
      <div class="page" ${levelStyle(ui.vocabLevel === 'All' ? state.selectedLevel : ui.vocabLevel)}>
        ${pageHeader('Complete word corpus', 'Vocabulary library', `Search all ${formatNumber(DATA.vocabulary.length)} JLPT-aligned words by kanji, kana, rōmaji, English, level, or word class.`, `<button class="btn btn-primary" data-action="start-review" data-focus="vocabulary">${icon('play')} Practice words</button>`)}
        <div class="corpus-banner"><span>OPENJLPT ${escapeHtml(DATA.corpusMeta?.version || '')}</span><strong>${formatNumber(DATA.vocabulary.length)} words</strong><p>${formatNumber(DATA.corpusMeta?.vocabWithExamples || 0)} include contextual examples · stable IDs preserve progress</p></div>
        <div class="toolbar">
          <label class="search-box">${icon('search')}<input id="vocabSearch" value="${escapeHtml(ui.vocabSearch)}" placeholder="Search word, reading, rōmaji, or meaning…" autocomplete="off"></label>
          <select class="filter-select" id="vocabLevel" aria-label="JLPT level"><option ${ui.vocabLevel === 'All' ? 'selected' : ''}>All</option>${DATA.levelOrder.map((level) => `<option ${ui.vocabLevel === level ? 'selected' : ''}>${level}</option>`).join('')}</select>
          <select class="filter-select" id="vocabCategory" aria-label="Word class">${categories.map((category) => `<option ${ui.vocabCategory === category ? 'selected' : ''}>${category}</option>`).join('')}</select>
          <span class="result-count" id="vocabResultCount">${formatNumber(words.length)} results</span>
        </div>
        <div id="vocabCollection">${vocabularyCollectionMarkup(words)}</div>
      </div>`;
  }

  function refreshVocabularyList() {
    const words = filteredVocabulary();
    const collection = $('#vocabCollection');
    const count = $('#vocabResultCount');
    if (collection) collection.innerHTML = vocabularyCollectionMarkup(words);
    if (count) count.textContent = `${formatNumber(words.length)} results`;
  }

  function renderWordDetail(wordId) {
    const word = DATA.vocabulary.find((entry) => entry.id === wordId);
    if (!word) return;
    const layer = $('#modalLayer');
    layer.classList.remove('hidden');
    layer.innerHTML = `<section class="modal-card reference-modal" ${levelStyle(word.level)}><div class="modal-top"><div><span class="reference-level">${word.level} · ${escapeHtml(word.category)}</span><h2>Vocabulary entry</h2></div><button class="modal-close" data-action="close-modal">${icon('close')}</button></div><div class="reference-body"><div class="word-detail-hero"><div><h1 class="jp">${escapeHtml(word.word)}</h1><p class="jp">${escapeHtml(word.reading)} <span>${escapeHtml(word.romaji || '')}</span></p></div><button class="audio-question compact-audio" data-action="speak" data-speech="${escapeHtml(word.word)}">${icon('volume')}</button></div><section class="reference-section"><small>MEANINGS</small><div class="meaning-chips">${(word.meanings || [word.meaning]).map((meaning) => `<span>${escapeHtml(meaning)}</span>`).join('')}</div></section><section class="reference-section"><small>WORD CLASS</small><p>${escapeHtml((word.posDescriptions || [word.category]).join(' · '))}</p></section>${word.otherForms?.length || word.otherReadings?.length ? `<section class="reference-section"><small>ALTERNATIVE FORMS</small><p class="jp">${escapeHtml([...(word.otherForms || []), ...(word.otherReadings || [])].join(' · '))}</p></section>` : ''}<section class="reference-section"><small>EXAMPLES</small><div class="reference-examples">${word.examples?.length ? word.examples.map((example) => `<article><p class="jp">${japanesePhraseHtml(example.ja, example.furigana)}</p><span>${escapeHtml(example.en)}</span>${example.tatoebaId ? `<em>Tatoeba #${example.tatoebaId}</em>` : ''}</article>`).join('') : '<p>No example sentence is available for this entry.</p>'}</div></section><footer class="reference-source">OpenJLPT · JMdict${word.jmdictId ? ` #${word.jmdictId}` : ''} · CC BY-SA 4.0</footer></div></section>`;
  }

  function filteredGrammar() {
    const search = ui.grammarSearch.trim().toLocaleLowerCase();
    return DATA.grammar.filter((rule) => {
      const levelMatch = rule.level === ui.grammarLevel;
      const tagMatch = ui.grammarTag === 'All' || rule.tags?.includes(ui.grammarTag);
      const searchable = `${rule.pattern} ${rule.reading || ''} ${rule.romaji || ''} ${rule.meaning} ${rule.form} ${rule.explanation} ${(rule.tags || []).join(' ')}`.toLocaleLowerCase();
      return levelMatch && tagMatch && (!search || searchable.includes(search));
    });
  }

  function grammarCollectionMarkup(rules) {
    const pageSize = 30;
    const totalPages = Math.max(1, Math.ceil(rules.length / pageSize));
    ui.grammarPage = clamp(ui.grammarPage, 1, totalPages);
    const pageRules = rules.slice((ui.grammarPage - 1) * pageSize, ui.grammarPage * pageSize);
    const list = pageRules.length ? pageRules.map((rule) => `<article class="grammar-card ${ui.openGrammar === rule.id ? 'open' : ''}">
      <button class="grammar-trigger" data-action="toggle-grammar" data-grammar="${rule.id}"><span class="grammar-pattern">${escapeHtml(rule.pattern)}</span><span class="grammar-meaning">${escapeHtml(rule.meaning)}</span>${icon('chevron')}</button>
      <div class="grammar-body"><div><small class="eyebrow">FORMATION</small><div class="grammar-form">${escapeHtml(rule.form)}</div><div class="grammar-tags">${(rule.tags || []).map((tag) => `<span>${escapeHtml(tag)}</span>`).join('')}</div></div><div class="grammar-explanation"><p>${escapeHtml(rule.explanation)}</p><div class="grammar-example-list">${(rule.examples || [{ ja: rule.example, en: rule.translation }]).map((example) => `<div class="example-box"><strong>${japanesePhraseHtml(example.ja, example.furigana)}</strong><small>${escapeHtml(example.en)}</small><button class="word-action" data-action="speak" data-speech="${escapeHtml(example.ja)}" title="Hear example">${icon('volume')}</button></div>`).join('')}</div></div></div>
    </article>`).join('') : `<div class="empty-state"><div class="empty-icon">文</div><h3>No grammar points found</h3><p>Try another search term or topic tag.</p></div>`;
    return `<div class="grammar-list">${list}</div>${paginationMarkup('grammar', ui.grammarPage, totalPages, rules.length)}`;
  }

  function renderGrammar() {
    const rules = filteredGrammar();
    const tags = ['All', ...unique(DATA.grammar.filter((rule) => rule.level === ui.grammarLevel).flatMap((rule) => rule.tags || [])).sort()];
    return `
      <div class="page" ${levelStyle(ui.grammarLevel)}>
        ${pageHeader('Complete pattern corpus', 'Grammar library', `Explore all ${formatNumber(DATA.grammar.length)} JLPT-aligned patterns with formation rules, nuance notes, tags, and examples.`, `<button class="btn btn-primary" data-action="start-review" data-focus="grammar">${icon('play')} Grammar drill</button>`)}
        <div class="corpus-banner"><span>SEARCHABLE REFERENCE</span><strong>${formatNumber(DATA.corpusMeta?.counts?.grammar?.[ui.grammarLevel] || rules.length)} ${ui.grammarLevel} patterns</strong><p>${formatNumber(DATA.grammar.length)} across the full N5–N1 corpus</p></div>
        <div class="toolbar"><div class="segmented">${DATA.levelOrder.map((level) => `<button class="${ui.grammarLevel === level ? 'active' : ''}" data-action="grammar-level" data-level="${level}">${level}</button>`).join('')}</div><label class="search-box">${icon('search')}<input id="grammarSearch" value="${escapeHtml(ui.grammarSearch)}" placeholder="Search pattern, meaning, or formation…" autocomplete="off"></label><select class="filter-select" id="grammarTag" aria-label="Grammar topic">${tags.map((tag) => `<option ${ui.grammarTag === tag ? 'selected' : ''}>${tag}</option>`).join('')}</select><span class="result-count" id="grammarResultCount">${formatNumber(rules.length)} results</span></div>
        <div id="grammarCollection">${grammarCollectionMarkup(rules)}</div>
      </div>`;
  }

  function refreshGrammarList() {
    const rules = filteredGrammar();
    const collection = $('#grammarCollection');
    const count = $('#grammarResultCount');
    if (collection) collection.innerHTML = grammarCollectionMarkup(rules);
    if (count) count.textContent = `${formatNumber(rules.length)} results`;
  }

  function filteredKanji() {
    const search = ui.kanjiSearch.trim().toLocaleLowerCase();
    return DATA.kanji.filter((entry) => {
      if (entry.level !== state.selectedLevel) return false;
      if (!search) return true;
      return `${entry.char} ${entry.meaning} ${entry.on} ${entry.kun} ${entry.radical || ''} ${entry.words.map((word) => word.join(' ')).join(' ')}`.toLocaleLowerCase().includes(search);
    });
  }

  function kanjiNumericLabel(value, prefix = '') {
    if (value == null || String(value).trim() === '') return '—';
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? `${prefix}${Math.trunc(number)}` : '—';
  }

  function kanjiCollectionMarkup(characters) {
    const pageSize = 50;
    const totalPages = Math.max(1, Math.ceil(characters.length / pageSize));
    ui.kanjiPage = clamp(ui.kanjiPage, 1, totalPages);
    const start = (ui.kanjiPage - 1) * pageSize;
    const pageCharacters = characters.slice(start, start + pageSize);
    if (!pageCharacters.length) return `<div class="empty-state"><div class="empty-icon">漢</div><h3>No kanji found</h3><p>Try a character, reading, radical, or English meaning.</p></div>`;
    const rows = pageCharacters.map((entry, index) => {
      const meaning = (entry.meanings?.length ? entry.meanings : String(entry.meaning || '').split(';')).slice(0, 4).join(', ');
      const readings = [entry.on && entry.on !== '—' ? `On: ${entry.on}` : '', entry.kun && entry.kun !== '—' ? `Kun: ${entry.kun}` : ''].filter(Boolean).join(' · ');
      const wordPreview = (entry.words || []).slice(0, 2).map(([word, reading]) => `${word} ${reading ? `(${reading})` : ''}`.trim()).join(' · ');
      const strokeCount = kanjiNumericLabel(entry.strokes);
      return `<button class="kanji-list-row" data-action="open-kanji" data-kanji="${escapeHtml(entry.id)}" aria-label="Open ${escapeHtml(entry.char)}: ${escapeHtml(meaning)}">
        <span class="kanji-list-index">${String(start + index + 1).padStart(3, '0')}</span>
        <span class="kanji-list-glyph">${escapeHtml(entry.char)}</span>
        <span class="kanji-list-copy"><strong>${escapeHtml(meaning || 'Meaning unavailable')}</strong><small class="jp">${escapeHtml(readings || 'Reading unavailable')}</small>${wordPreview ? `<span class="jp">${escapeHtml(wordPreview)}</span>` : ''}</span>
        <span class="kanji-list-meta"><b>${escapeHtml(strokeCount)}</b><small>strokes</small></span>
        <span class="kanji-list-open">View ${icon('chevron')}</span>
      </button>`;
    }).join('');
    return `<div class="kanji-list">${rows}</div>${paginationMarkup('kanji', ui.kanjiPage, totalPages, characters.length)}`;
  }

  function renderKanjiDetailPage(selected) {
    const levelCharacters = DATA.kanji.filter((entry) => entry.level === state.selectedLevel);
    const currentIndex = levelCharacters.findIndex((entry) => entry.id === selected.id);
    const previous = currentIndex > 0 ? levelCharacters[currentIndex - 1] : null;
    const next = currentIndex >= 0 && currentIndex < levelCharacters.length - 1 ? levelCharacters[currentIndex + 1] : null;
    const meanings = (selected.meanings?.length ? selected.meanings : String(selected.meaning || '').split(';')).filter(Boolean);
    const primaryWord = selected.words?.[0];
    const strokeCount = kanjiNumericLabel(selected.strokes);
    const grade = kanjiNumericLabel(selected.grade);
    const frequency = kanjiNumericLabel(selected.frequency, '#');
    const unicode = selected.char?.codePointAt(0)?.toString(16).toUpperCase().padStart(4, '0') || '—';
    const words = selected.words?.length ? selected.words.map(([word, reading, meaning]) => `<article class="kanji-vocabulary-row"><strong class="jp">${escapeHtml(word)}</strong><span class="jp">${escapeHtml(reading || '—')}</span><p>${escapeHtml(meaning || 'Meaning unavailable')}</p><button class="word-action" data-action="speak" data-speech="${escapeHtml(word)}" title="Hear ${escapeHtml(word)}">${icon('volume')}</button></article>`).join('') : `<div class="empty-state compact-empty"><p>No example compounds are available for this character.</p></div>`;

    return `<div class="page kanji-entry-page" ${levelStyle()}>
      <nav class="kanji-breadcrumb" aria-label="Kanji navigation"><button data-action="kanji-index">← ${state.selectedLevel} kanji</button><span>/</span><strong class="jp">${escapeHtml(selected.char)}</strong></nav>
      <section class="kanji-entry-hero">
        <div class="kanji-entry-glyph">${escapeHtml(selected.char)}</div>
        <div class="kanji-entry-summary"><div class="eyebrow">${state.selectedLevel} · KANJIDIC2 ENTRY</div><h1 id="kanjiEntryHeading" tabindex="-1">${escapeHtml(meanings.join(', ') || 'Kanji details')}</h1><p class="jp">${escapeHtml([selected.on, selected.kun].filter((reading) => reading && reading !== '—').join(' · ') || 'No readings available')}</p><div class="meaning-chips">${meanings.map((meaning) => `<span>${escapeHtml(meaning)}</span>`).join('')}</div></div>
        <div class="kanji-entry-actions">${primaryWord ? `<button class="btn btn-ghost" data-action="speak" data-speech="${escapeHtml(primaryWord[0])}">${icon('volume')} Hear ${escapeHtml(primaryWord[0])}</button>` : ''}<button class="btn btn-primary" data-action="write-kanji" data-char="${escapeHtml(selected.char)}">${icon('pen')} Practice writing</button></div>
      </section>
      <div class="kanji-entry-grid">
        <section class="card kanji-entry-section"><div class="entry-section-head"><span>字</span><div><small>CHARACTER PROFILE</small><h2>At a glance</h2></div></div><div class="kanji-stat-grid"><article><small>STROKES</small><strong>${escapeHtml(strokeCount)}</strong><span>writing movements</span></article><article><small>RADICAL</small><strong class="jp">${escapeHtml(selected.radical || '—')}</strong><span>lookup component</span></article><article><small>SCHOOL GRADE</small><strong>${escapeHtml(grade)}</strong><span>Japanese curriculum</span></article><article><small>FREQUENCY</small><strong>${escapeHtml(frequency)}</strong><span>newspaper rank</span></article><article><small>JLPT</small><strong>${escapeHtml(selected.level)}</strong><span>community alignment</span></article><article><small>UNICODE</small><strong>U+${unicode}</strong><span>character code</span></article></div></section>
        <section class="card kanji-entry-section"><div class="entry-section-head"><span>読</span><div><small>PRONUNCIATION</small><h2>Readings</h2></div></div><div class="kanji-reading-list"><article><small>音読み · ON</small><strong class="jp">${escapeHtml(selected.on || '—')}</strong><p>Common in compounds and Sino-Japanese vocabulary.</p></article><article><small>訓読み · KUN</small><strong class="jp">${escapeHtml(selected.kun || '—')}</strong><p>Native Japanese readings, often used with okurigana.</p></article>${selected.nanori?.length ? `<article><small>名乗り · NAMES</small><strong class="jp">${escapeHtml(selected.nanori.join('・'))}</strong><p>Readings commonly found in names.</p></article>` : ''}</div></section>
      </div>
      <section class="card kanji-entry-section kanji-vocabulary-section"><div class="entry-section-head"><span>語</span><div><small>WORDS IN CONTEXT</small><h2>Example vocabulary</h2><p>See how the character behaves inside complete words.</p></div></div><div class="kanji-vocabulary-list">${words}</div></section>
      <footer class="kanji-entry-footer"><span>KANJIDIC2 via OpenJLPT · CC BY-SA 4.0</span><button class="btn btn-small btn-ghost" data-action="start-review" data-focus="kanji">Practice ${state.selectedLevel} kanji</button></footer>
      <nav class="kanji-entry-pager" aria-label="Adjacent kanji"><button class="btn btn-ghost" data-action="open-kanji" data-kanji="${escapeHtml(previous?.id || '')}" ${previous ? '' : 'disabled'}>← ${previous ? escapeHtml(previous.char) : 'Previous'}</button><span>${currentIndex + 1} / ${levelCharacters.length}</span><button class="btn btn-ghost" data-action="open-kanji" data-kanji="${escapeHtml(next?.id || '')}" ${next ? '' : 'disabled'}>${next ? escapeHtml(next.char) : 'Next'} →</button></nav>
    </div>`;
  }

  function renderKanji() {
    const selected = ui.selectedKanji ? DATA.kanji.find((entry) => entry.id === ui.selectedKanji && entry.level === state.selectedLevel) : null;
    if (selected) return renderKanjiDetailPage(selected);
    if (ui.selectedKanji) ui.selectedKanji = null;
    const characters = filteredKanji();
    const levelCount = DATA.corpusMeta?.counts?.kanji?.[state.selectedLevel] || characters.length;
    return `
      <div class="page kanji-index-page" ${levelStyle()}>
        ${pageHeader('Kanji lesson index', `${state.selectedLevel} kanji`, `Browse one character per line, then open its dedicated page for meanings, readings, metadata, vocabulary, audio, and writing practice.`, `<button class="btn btn-primary" data-action="start-review" data-focus="kanji">${icon('play')} Kanji drill</button>`)}
        <div class="corpus-banner"><span>KANJIDIC2 ENRICHED</span><strong>${formatNumber(levelCount)} ${state.selectedLevel} kanji</strong><p>${formatNumber(DATA.kanji.length)} characters across N5–N1 · select a row to study the full entry</p></div>
        <div class="toolbar"><label class="search-box">${icon('search')}<input id="kanjiSearch" value="${escapeHtml(ui.kanjiSearch)}" placeholder="Search character, meaning, reading, radical, or word…" autocomplete="off"></label><span class="result-count" id="kanjiResultCount">${formatNumber(characters.length)} results</span></div>
        <div id="kanjiCollection">${kanjiCollectionMarkup(characters)}</div>
      </div>`;
  }

  function refreshKanjiList() {
    const characters = filteredKanji();
    const collection = $('#kanjiCollection');
    const count = $('#kanjiResultCount');
    if (collection) collection.innerHTML = kanjiCollectionMarkup(characters);
    if (count) count.textContent = `${formatNumber(characters.length)} results`;
  }

  function renderExam() {
    const durations = { N5: 35, N4: 40, N3: 45, N2: 50, N1: 55 };
    const results = state.mockResults.filter((result) => result?.level === state.selectedLevel).slice(0, 5);
    const scoredResults = results.filter((result) => Number.isFinite(result.percent));
    const best = scoredResults.length ? Math.max(...scoredResults.map((result) => result.percent)) : null;
    const bankMeta = MOCK_EXAMS?.meta || {};
    const bankStats = MOCK_EXAMS?.getStats?.(state.selectedLevel) || { total: 0, language: 0, reading: 0, listening: 0 };
    const examSources = (bankMeta.sources || []).filter((source) => ['jmdict', 'kanjidic2', 'tatoeba', 'openjlpt', 'waller', 'kumo'].includes(source.id));
    const openJlpt = examSources.find((source) => source.id === 'openjlpt');
    return `
      <div class="page" ${levelStyle()}>
        ${pageHeader('Open-data test center', `${state.selectedLevel} original JLPT-aligned mock`, 'Practice language knowledge, reading, and listening in a test-like flow with original Japanese-only items built from open data.')}
        <section class="exam-hero">
          <div class="exam-hero-copy"><div class="hero-kicker">${icon('grid')} ORIGINAL QUESTION BANK</div><h2>Timed full mock</h2><p>Twenty original questions in three ordered sections, with a visible timer, question navigator, flags, source provenance, and a detailed result report.</p><div class="exam-facts"><span><b>20</b> questions</span><span><b>${durations[state.selectedLevel]}</b> minutes</span><span><b>3</b> sections</span><span><b>${formatNumber(bankStats.total)}</b> curated items</span><span><b>${best == null ? '—' : `${best}%`}</b> best</span></div><button class="btn btn-primary" data-action="start-exam" data-mode="full">${icon('play')} Begin timed mock</button></div>
          <div class="exam-seal"><span>${state.selectedLevel}</span><small>模擬試験</small></div>
        </section>
        <div class="exam-dashboard">
          <section class="card exam-structure"><div class="section-title compact"><div><h2>Test structure</h2><p>Each attempt balances JLPT skill groups and familiar item styles.</p></div></div><div class="exam-sections"><div class="exam-section-row"><span class="section-number">01</span><span class="section-symbol">語</span><div><strong>Language knowledge</strong><small>Context · readings · kanji · grammar</small></div><b>12 Q</b></div><div class="exam-section-row"><span class="section-number">02</span><span class="section-symbol">読</span><div><strong>Reading</strong><small>Passages · detail · main idea</small></div><b>4 Q</b></div><div class="exam-section-row"><span class="section-number">03</span><span class="section-symbol">聴</span><div><strong>Listening</strong><small>Task · detail · overall meaning</small></div><b>4 Q</b></div></div></section>
          <aside class="card mini-exam-card"><span class="mini-exam-icon">時</span><small>SHORT ON TIME?</small><h3>10-question mini mock</h3><p>A 15-minute balanced sample across all three sections. It uses the same no-feedback exam interface.</p><button class="btn btn-ghost btn-wide" data-action="start-exam" data-mode="mini">Start mini mock</button></aside>
        </div>
        <section class="card exam-bank-source">
          <div class="exam-bank-source-copy"><span class="source-mark">開</span><div><small>OPEN DATA FOUNDATIONS · BANK ${escapeHtml(bankMeta.version || '')}</small><h3>${escapeHtml(bankMeta.name || 'Kumo open mock bank')}</h3><p>${escapeHtml(bankMeta.notice || '')}</p></div></div>
          <div class="exam-source-pills">${examSources.map((source) => `<a href="${escapeHtml(source.url)}" target="_blank" rel="noreferrer" title="${escapeHtml(`${source.role} · ${source.license}`)}">${escapeHtml(source.name)}</a>`).join('')}</div>
          <div class="exam-bank-links">${openJlpt ? `<a class="btn btn-small btn-ghost" href="${escapeHtml(openJlpt.url)}" target="_blank" rel="noreferrer">OpenJLPT source</a>` : ''}<a class="btn btn-small btn-ghost" href="${escapeHtml(bankMeta.sourceAlignmentUrl || 'https://jisho.org/about')}" target="_blank" rel="noreferrer">Compare Jisho source list</a></div>
        </section>
        <div class="section-title"><div><h2>Recent ${state.selectedLevel} attempts</h2><p>Your five latest results are stored locally.</p></div></div>
        ${results.length ? `<div class="exam-history">${results.map((result) => `<article class="exam-history-row"><span class="history-score ${Number.isFinite(result.percent) && result.percent >= 70 ? 'strong' : ''}">${Number.isFinite(result.percent) ? `${formatNumber(result.percent)}%` : 'N/A'}</span><div><strong>${result.mode === 'full' ? 'Timed full mock' : 'Mini mock'}</strong><small>${escapeHtml(new Date(result.date).toLocaleDateString())} · ${formatNumber(result.correct)}/${formatNumber(result.attempted ?? (result.total - (result.skipped || 0)))} scored${result.skipped ? ` · ${formatNumber(result.skipped)} skipped` : ''}</small></div><div class="history-sections">${Object.entries(result.sections || {}).map(([name, score]) => `<span>${escapeHtml(name.split(' ')[0])} <b>${formatNumber(score.correct)}/${formatNumber(score.total - (score.skipped || 0))}</b>${score.skipped ? ` · ${formatNumber(score.skipped)} skip` : ''}</span>`).join('')}</div><button class="btn btn-small btn-ghost" data-action="start-exam" data-mode="${escapeHtml(result.mode)}">Retry</button></article>`).join('')}</div>` : `<div class="empty-state"><div class="empty-icon">試</div><h3>No mock attempts yet</h3><p>Your section scores and best result will appear here after submission.</p></div>`}
        <div class="pronunciation-tip" style="margin-top:14px"><b>Unofficial by design</b><span>Every question is an original Kumo transformation of open-licensed data—not a copied JLPT examination or Jisho entry. Percentages are practice benchmarks, not official scaled scores or pass predictions.</span></div>
      </div>`;
  }

  function renderImmersion() {
    let body = '';
    if (ui.immersionTab === 'listening') body = renderListeningTab();
    if (ui.immersionTab === 'reading') body = renderReadingTab();
    if (ui.immersionTab === 'speaking') body = renderSpeakingTab();
    return `
      <div class="page" ${levelStyle()}>
        ${pageHeader('Japanese in motion', 'Immersion room', 'Train comprehension and production with natural-speed audio, graded reading, and guided speaking.')}
        <div class="immersion-tabs">
          <button class="immersion-tab ${ui.immersionTab === 'listening' ? 'active' : ''}" data-action="immersion-tab" data-tab="listening">${icon('headphones')} Listening</button>
          <button class="immersion-tab ${ui.immersionTab === 'reading' ? 'active' : ''}" data-action="immersion-tab" data-tab="reading">${icon('book')} Reading</button>
          <button class="immersion-tab ${ui.immersionTab === 'speaking' ? 'active' : ''}" data-action="immersion-tab" data-tab="speaking">${icon('volume')} Speaking</button>
        </div>
        ${body}
      </div>`;
  }

  function waveform() {
    const heights = [10, 19, 13, 24, 17, 8, 21, 14, 23, 11, 17, 8];
    return `<div class="waveform">${heights.map((height, index) => `<i style="--h:${height}px;--delay:${index * -.07}s"></i>`).join('')}</div>`;
  }

  function renderListeningTab() {
    const clips = listeningExerciseBank(state.selectedLevel);
    const featured = clips.slice(0, 10);
    return `<section class="immersion-bank-hero listening-bank"><div><div class="eyebrow">AUDIO COMPREHENSION BANK</div><h2>${formatNumber(clips.length)} ${state.selectedLevel} listening exercises</h2><p>Every session draws from different audio-backed Japanese sentences. Listen without text first, then study the transcript and complete furigana after answering.</p><div class="bank-actions"><button class="btn btn-primary" data-action="start-listening-drill" data-length="10">Start 10 different exercises</button><button class="btn btn-ghost" data-action="start-listening-drill" data-length="25">25-question session</button></div></div><div class="bank-stat"><strong>${featured.length}</strong><span>featured recordings</span><small>${formatNumber(clips.length)} unique prompts available</small></div></section>
      <div class="section-title"><div><h2>Featured listening · ${state.selectedLevel}</h2><p>Play or practice each of these ten different recordings individually.</p></div></div>
      <div class="listening-exercise-list">${featured.map((clip, index) => `<article class="listen-card" id="${escapeHtml(clip.id)}"><button class="play-orb" data-action="play-listening" data-listening="${escapeHtml(clip.id)}" aria-label="Play ${escapeHtml(clip.title)}">${icon('play')}</button><div><span class="exercise-number">EXERCISE ${index + 1}</span><h3>${escapeHtml(clip.title)}</h3><p>${escapeHtml(clip.questions?.[0]?.prompt || 'Listen and choose the matching English meaning.')}</p></div><div class="listen-controls">${waveform()}<button class="btn btn-small btn-ghost" data-action="start-listening-item" data-listening="${escapeHtml(clip.id)}">Practice</button></div></article>`).join('')}</div>
      <div class="pronunciation-tip" style="margin-top:14px"><b>Method</b><span>1. Listen once for the situation. 2. Listen for key content words. 3. Answer. 4. Replay while reading the transcript in the correction.</span></div>`;
  }

  function renderReadingTab() {
    const passages = DATA.readings.filter((reading) => reading.level === state.selectedLevel);
    const sentenceBank = readingSentenceBank(state.selectedLevel);
    const featured = sentenceBank.slice(0, 10);
    const bankIds = new Set(sentenceBank.map((entry) => entry.id));
    const practiced = state.readingSentencesPracticed.filter((id) => bankIds.has(id)).length;
    return `<section class="immersion-bank-hero reading-bank"><div><div class="eyebrow">SENTENCE COMPREHENSION BANK</div><h2>${formatNumber(sentenceBank.length)} ${state.selectedLevel} reading exercises</h2><p>Read authentic example sentences with complete furigana, choose the best translation, then study the sentence structure and focus vocabulary.</p><div class="bank-actions">${[10, 25, 50, 100].map((length) => `<button class="btn ${length === 10 ? 'btn-primary' : 'btn-ghost'}" data-action="start-reading-drill" data-length="${length}">${length} different questions</button>`).join('')}</div></div><div class="bank-stat"><strong>${formatNumber(practiced)}</strong><span>unique sentences practiced</span><small>of ${formatNumber(sentenceBank.length)} available</small></div></section>
      <div class="section-title"><div><h2>Featured reading exercises · 10</h2><p>Open any sentence individually, or start a no-repeat session above.</p></div></div>
      <div class="reading-sample-strip reading-exercise-grid">${featured.map((entry, index) => `<article><span>EXERCISE ${index + 1}</span><p class="jp">${japanesePhraseHtml(entry.sentence, entry.furigana)}</p><small class="jp">Focus: ${escapeHtml(entry.word.word)}（${escapeHtml(entry.word.reading)}）</small><button class="btn btn-small btn-ghost" data-action="start-reading-item" data-reading="${escapeHtml(entry.id)}">Practice this sentence</button></article>`).join('')}</div>
      <div class="section-title"><div><h2>Graded passages · ${state.selectedLevel}</h2><p>Longer texts with comprehension checks and optional translation.</p></div></div>
      <div class="content-cards">${passages.map((reading) => `<article class="content-card" data-mark="読"><div class="content-card-top"><span class="content-type">${reading.level} · graded text</span><span class="content-time">${icon('clock')} ${reading.minutes} min</span></div><h3>${escapeHtml(reading.title)} ${state.completedReadings.includes(reading.id) ? '✓' : ''}</h3><span class="japanese-title">${escapeHtml(reading.japaneseTitle)}</span><p>${escapeHtml(reading.text)}</p><div class="content-card-actions"><button class="btn btn-small btn-primary" data-action="open-reader" data-reading="${reading.id}">${icon('book')} Read story</button><button class="btn btn-small btn-ghost" data-action="speak" data-speech="${escapeHtml(reading.text)}">${icon('volume')} Listen</button></div></article>`).join('')}</div>`;
  }

  function filteredSpeakingExercises() {
    const search = ui.speakingSearch.trim().toLocaleLowerCase();
    return speakingExerciseBank(state.selectedLevel).filter((exercise) => !search || `${exercise.japanese} ${exercise.translation} ${exercise.pattern} ${exercise.meaning}`.toLocaleLowerCase().includes(search));
  }

  function speakingLibraryMarkup(exercises) {
    const pageSize = 8;
    const totalPages = Math.max(1, Math.ceil(exercises.length / pageSize));
    ui.speakingPage = clamp(ui.speakingPage, 1, totalPages);
    const pageExercises = exercises.slice((ui.speakingPage - 1) * pageSize, ui.speakingPage * pageSize);
    if (!pageExercises.length) return `<div class="compact-empty">No speaking prompts match this search.</div>`;
    return `<div class="speaking-prompt-list">${pageExercises.map((exercise) => `<button class="speaking-prompt-row ${ui.speakingExerciseId === exercise.id ? 'active' : ''} ${state.speakingPracticed.includes(exercise.id) ? 'practiced' : ''}" data-action="select-speaking" data-exercise="${exercise.id}"><span class="jp">${escapeHtml(exercise.japanese)}</span><small>${escapeHtml(exercise.pattern)} · ${escapeHtml(exercise.translation)}</small></button>`).join('')}</div><div class="writing-compact-pager"><button data-action="speaking-page" data-page="${ui.speakingPage - 1}" ${ui.speakingPage <= 1 ? 'disabled' : ''}>←</button><span>${ui.speakingPage} / ${totalPages}</span><button data-action="speaking-page" data-page="${ui.speakingPage + 1}" ${ui.speakingPage >= totalPages ? 'disabled' : ''}>→</button></div>`;
  }

  function refreshSpeakingLibrary() {
    const exercises = filteredSpeakingExercises();
    const container = $('#speakingLibraryResults');
    const count = $('#speakingResultCount');
    if (container) container.innerHTML = speakingLibraryMarkup(exercises);
    if (count) count.textContent = `${formatNumber(exercises.length)} results`;
  }

  function markSpeakingExercise(exerciseId) {
    if (!exerciseId || state.speakingPracticed.includes(exerciseId)) return false;
    state.speakingPracticed.push(exerciseId);
    queueSave();
    return true;
  }

  function renderSpeakingTab() {
    const allExercises = speakingExerciseBank(state.selectedLevel);
    let prompt = allExercises.find((entry) => entry.id === ui.speakingExerciseId) || allExercises[0];
    ui.speakingExerciseId = prompt.id;
    const filtered = filteredSpeakingExercises();
    const index = allExercises.findIndex((entry) => entry.id === prompt.id);
    const practiced = allExercises.filter((entry) => state.speakingPracticed.includes(entry.id)).length;
    return `<div class="speaking-bank-summary"><div><div class="eyebrow">AUDIO-BACKED SHADOWING BANK</div><h2>${formatNumber(allExercises.length)} ${state.selectedLevel} speaking exercises</h2><p>Every prompt comes from a grammar example and includes native Japanese audio, translation, formation, and usage guidance.</p></div><div><strong>${formatNumber(practiced)}</strong><span>prompts practiced</span></div></div><div class="speaking-workspace"><section class="card speaking-feature"><div class="speaking-feature-head"><span>Prompt ${index + 1} of ${allExercises.length}</span><div><button class="btn btn-small btn-ghost" data-action="speaking-previous" ${index <= 0 ? 'disabled' : ''}>← Previous</button><button class="btn btn-small btn-ghost" data-action="speaking-random">Random</button><button class="btn btn-small btn-ghost" data-action="speaking-next" ${index >= allExercises.length - 1 ? 'disabled' : ''}>Next →</button></div></div><div class="speaking-prompt"><div class="jp-line">${japanesePhraseHtml(prompt.japanese, prompt.furigana)}</div><div class="romaji">${escapeHtml(prompt.pattern)} · ${escapeHtml(prompt.meaning)}</div><div class="meaning">${escapeHtml(prompt.translation)}</div></div><div class="content-card-actions"><button class="btn btn-primary" data-action="speak" data-speech="${escapeHtml(prompt.japanese)}">${icon('volume')} Hear model</button><button class="btn btn-ghost" data-action="speak-slow" data-speech="${escapeHtml(prompt.japanese)}">Slow playback</button><button class="btn btn-ghost ${state.speakingPracticed.includes(prompt.id) ? 'recorded' : ''}" data-action="mark-speaking" data-exercise="${prompt.id}">${icon('check')} ${state.speakingPracticed.includes(prompt.id) ? 'Practiced' : 'Mark practiced'}</button></div><div class="speaking-guide-grid"><div><small>FORMATION</small><strong>${escapeHtml(prompt.formation)}</strong></div><div><small>USAGE</small><p>${escapeHtml(prompt.note)}</p></div></div><aside class="mic-panel speaking-mic" id="micPanel"><button class="mic-button" data-action="record-speech" data-target="${escapeHtml(prompt.japanese)}" data-reading="${escapeHtml(furiganaReadingText(prompt.furigana))}" data-exercise="${prompt.id}"><span class="jp">話</span></button><div><strong>Record your voice</strong><p>Kumo will connect to your microphone, show the live input level, and record your attempt. Automatic text matching is added when the desktop recognizer is available.</p></div></aside></section><aside class="card speaking-library"><div class="picker-heading"><div><h3>Prompt library</h3><p>Search by sentence, pattern, or meaning.</p></div><span id="speakingResultCount">${formatNumber(filtered.length)} results</span></div><label class="search-box writing-search">${icon('search')}<input id="speakingSearch" value="${escapeHtml(ui.speakingSearch)}" placeholder="Search speaking prompts…" autocomplete="off"></label><div id="speakingLibraryResults">${speakingLibraryMarkup(filtered)}</div></aside></div>`;
  }

  function filteredWritingKanji() {
    const search = ui.writingSearch.trim().toLocaleLowerCase();
    return DATA.kanji.filter((entry) => {
      if (entry.level !== state.selectedLevel) return false;
      if (!search) return true;
      return `${entry.char} ${entry.meaning} ${entry.on} ${entry.kun} ${entry.radical || ''}`.toLocaleLowerCase().includes(search);
    });
  }

  function writingWordsForLevel(level = state.selectedLevel) {
    const cacheKey = `writing-words:${level}`;
    if (exerciseCache.has(cacheKey)) return exerciseCache.get(cacheKey);
    const seen = new Set();
    const words = DATA.vocabulary.filter((entry) => {
      if (entry.level !== level || seen.has(entry.word)) return false;
      const glyphs = JAPANESE?.writingGlyphs?.(entry.word) || [];
      if (glyphs.length < 2 || glyphs.length > 6 || glyphs.join('') !== entry.word) return false;
      seen.add(entry.word);
      return true;
    });
    exerciseCache.set(cacheKey, words);
    return words;
  }

  function filteredWritingWords() {
    const search = ui.writingSearch.trim().toLocaleLowerCase();
    return writingWordsForLevel().filter((entry) => {
      if (!search) return true;
      return `${entry.word} ${entry.reading} ${entry.romaji || ''} ${entry.meaning} ${(entry.posDescriptions || []).join(' ')}`.toLocaleLowerCase().includes(search);
    });
  }

  function filteredWritingTargets() {
    return ui.writingMode === 'words' ? filteredWritingWords() : filteredWritingKanji();
  }

  function currentWritingTarget() {
    if (ui.writingMode === 'words') {
      const words = writingWordsForLevel();
      const entry = words.find((word) => word.id === ui.writingWordId) || words[0];
      if (!entry) return null;
      ui.writingWordId = entry.id;
      return {
        mode: 'words',
        key: entry.id,
        text: entry.word,
        reading: entry.reading,
        meaning: entry.meanings?.[0] || entry.meaning,
        detail: (entry.posDescriptions || [entry.partOfSpeech]).filter(Boolean).slice(0, 2).join(' · '),
        glyphs: JAPANESE.writingGlyphs(entry.word),
        entry
      };
    }
    const characters = DATA.kanji.filter((entry) => entry.level === state.selectedLevel);
    const entry = characters.find((kanji) => kanji.char === ui.writingChar) || characters[0];
    if (!entry) return null;
    ui.writingChar = entry.char;
    return {
      mode: 'kanji',
      key: entry.char,
      text: entry.char,
      reading: `On: ${entry.on}　 Kun: ${entry.kun}`,
      meaning: entry.meaning,
      detail: `On: ${entry.on}　 Kun: ${entry.kun}`,
      glyphs: [entry.char],
      entry
    };
  }

  function writingStrokeData(target = currentWritingTarget()) {
    if (!target) return { characters: [], sequence: [], total: 0, complete: false };
    const characters = target.glyphs.map((character, glyphIndex) => {
      const data = window.KUMO_STROKES?.[character] || null;
      return { character, glyphIndex, data };
    });
    const sequence = characters.flatMap(({ character, glyphIndex, data }) => (data?.paths || []).map((path, localIndex) => ({ character, glyphIndex, localIndex, path })));
    return { characters, sequence, total: sequence.length, complete: characters.every(({ data }) => Boolean(data?.paths?.length)) };
  }

  function writingPickerMarkup(items) {
    const pageSize = ui.writingMode === 'words' ? 24 : 45;
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
    ui.writingPage = clamp(ui.writingPage, 1, totalPages);
    const pageItems = items.slice((ui.writingPage - 1) * pageSize, ui.writingPage * pageSize);
    if (!pageItems.length) return `<div class="compact-empty">No ${ui.writingMode === 'words' ? 'words' : 'kanji'} match this search.</div>`;
    const choices = ui.writingMode === 'words'
      ? `<div class="write-word-list">${pageItems.map((entry) => `<button class="write-word ${ui.writingWordId === entry.id ? 'active' : ''} ${state.practicedWords.includes(entry.id) ? 'practiced' : ''}" data-action="writing-word" data-word="${escapeHtml(entry.id)}" title="${escapeHtml(entry.meaning)}"><span><b class="jp">${escapeHtml(entry.word)}</b><em class="jp">${escapeHtml(entry.reading)}</em></span><small>${escapeHtml(entry.meanings?.[0] || entry.meaning.split(';')[0])}</small></button>`).join('')}</div>`
      : `<div class="write-char-grid">${pageItems.map((entry) => `<button class="write-char ${ui.writingChar === entry.char ? 'active' : ''} ${state.practicedWriting.includes(entry.char) ? 'practiced' : ''}" data-action="writing-char" data-char="${entry.char}" title="${escapeHtml(entry.meaning)}"><b>${entry.char}</b><small>${escapeHtml(entry.meanings?.[0] || entry.meaning.split(';')[0])}</small></button>`).join('')}</div>`;
    return `${choices}<div class="writing-compact-pager"><button data-action="writing-page" data-page="${ui.writingPage - 1}" ${ui.writingPage <= 1 ? 'disabled' : ''}>←</button><span>${ui.writingPage} / ${totalPages}</span><button data-action="writing-page" data-page="${ui.writingPage + 1}" ${ui.writingPage >= totalPages ? 'disabled' : ''}>→</button></div>`;
  }

  function refreshWritingPicker() {
    const items = filteredWritingTargets();
    const picker = $('#writingPickerResults');
    const count = $('#writingResultCount');
    if (picker) picker.innerHTML = writingPickerMarkup(items);
    if (count) count.textContent = `${formatNumber(items.length)} results`;
  }

  function strokeOrderSvg(target = currentWritingTarget()) {
    if (!target) return `<div class="stroke-unavailable">No writing target is available.</div>`;
    const strokeInfo = writingStrokeData(target);
    const viewWidth = 109 * target.glyphs.length;
    const step = clamp(ui.strokeStep, 0, strokeInfo.total);
    let globalOffset = 0;
    const groups = strokeInfo.characters.map(({ character, glyphIndex, data }) => {
      const translate = `translate(${glyphIndex * 109} 0)`;
      const cell = `<rect class="stroke-cell" x=".75" y=".75" width="107.5" height="107.5" rx="4"/>`;
      if (!data?.paths?.length) {
        return `<g transform="${translate}">${cell}<text class="stroke-fallback" x="54.5" y="72">${escapeHtml(character)}</text></g>`;
      }
      const guidePaths = data.paths.map((stroke) => `<path d="${escapeHtml(stroke.d)}"/>`).join('');
      const activePaths = data.paths.map((stroke, localIndex) => {
        const globalIndex = globalOffset + localIndex;
        if (globalIndex >= step) return '';
        return `<path class="${globalIndex === step - 1 ? 'current-stroke' : 'completed-stroke'}" pathLength="1" d="${escapeHtml(stroke.d)}"/>`;
      }).join('');
      const numbers = ui.strokeNumbers ? data.numbers.map(([x, y], localIndex) => {
        const globalIndex = globalOffset + localIndex;
        return `<g class="stroke-number ${globalIndex === step - 1 ? 'current' : ''}"><circle cx="${x}" cy="${y - 3}" r="5.2"/><text x="${x}" y="${y - .6}">${globalIndex + 1}</text></g>`;
      }).join('') : '';
      globalOffset += data.paths.length;
      return `<g transform="${translate}">${cell}<g class="stroke-guide-paths">${guidePaths}</g><g class="stroke-progress-paths">${activePaths}</g><g class="stroke-number-labels">${numbers}</g></g>`;
    }).join('');
    return `<svg viewBox="0 0 ${viewWidth} 109" role="img" aria-label="Writing guide for ${escapeHtml(target.text)}">${groups}</svg>`;
  }

  function updateStrokeOrderDisplay() {
    const target = currentWritingTarget();
    if (!target) return;
    const strokeInfo = writingStrokeData(target);
    ui.strokeStep = clamp(ui.strokeStep, 0, strokeInfo.total);
    const overlay = $('#strokeOrderOverlay');
    if (overlay) overlay.innerHTML = strokeOrderSvg(target);
    const currentStroke = ui.strokeStep ? strokeInfo.sequence[ui.strokeStep - 1] : null;
    const label = $('#strokeStepLabel');
    if (label) label.textContent = strokeInfo.total
      ? (ui.strokeStep === 0 ? `Ready · ${strokeInfo.total} vector strokes` : `Stroke ${ui.strokeStep} of ${strokeInfo.total}${target.glyphs.length > 1 ? ` · ${currentStroke?.character || ''}` : ''}`)
      : 'Trace the complete word';
    const type = $('#strokeTypeLabel');
    if (type) type.textContent = currentStroke
      ? `Stroke form: ${currentStroke.path.type || 'standard'}`
      : (strokeInfo.complete ? 'Start the sequence or animate the full order' : 'Kana and unavailable characters use a pale font guide');
    const previous = $('#strokePrevious');
    const next = $('#strokeNext');
    if (previous) previous.disabled = !strokeInfo.total || ui.strokeStep <= 1;
    if (next) next.disabled = !strokeInfo.total || ui.strokeStep >= strokeInfo.total;
    const numberButton = $('#strokeNumbersButton');
    if (numberButton) {
      numberButton.disabled = !strokeInfo.total;
      numberButton.textContent = ui.strokeNumbers ? 'Hide numbers' : 'Show numbers';
    }
    const animateButton = $('#strokeAnimateButton');
    if (animateButton) {
      animateButton.disabled = !strokeInfo.total;
      animateButton.textContent = strokeTimer ? 'Stop animation' : 'Animate order';
    }
  }

  function setStrokeStep(step) {
    clearInterval(strokeTimer);
    strokeTimer = null;
    ui.strokeStep = step;
    updateStrokeOrderDisplay();
  }

  function animateStrokeOrder() {
    const target = currentWritingTarget();
    const strokeInfo = writingStrokeData(target);
    if (!strokeInfo.total) return;
    if (strokeTimer) {
      clearInterval(strokeTimer);
      strokeTimer = null;
      updateStrokeOrderDisplay();
      return;
    }
    ui.strokeStep = 0;
    updateStrokeOrderDisplay();
    strokeTimer = setInterval(() => {
      ui.strokeStep += 1;
      if (ui.strokeStep >= strokeInfo.total) {
        ui.strokeStep = strokeInfo.total;
        clearInterval(strokeTimer);
        strokeTimer = null;
      }
      updateStrokeOrderDisplay();
    }, 650);
    const button = $('#strokeAnimateButton');
    if (button) button.textContent = 'Stop animation';
  }

  function renderWriting() {
    const target = currentWritingTarget();
    if (!target) return `<div class="page"><div class="empty-state"><div class="empty-icon">書</div><h3>No writing material is available</h3><p>Choose another JLPT level.</p></div></div>`;
    const strokeInfo = writingStrokeData(target);
    ui.strokeStep = strokeInfo.total ? clamp(ui.strokeStep || 1, 1, strokeInfo.total) : 0;
    const items = filteredWritingTargets();
    const totalItems = ui.writingMode === 'words' ? writingWordsForLevel().length : DATA.kanji.filter((entry) => entry.level === state.selectedLevel).length;
    const practicedAtLevel = ui.writingMode === 'words'
      ? writingWordsForLevel().filter((entry) => state.practicedWords.includes(entry.id)).length
      : DATA.kanji.filter((entry) => entry.level === state.selectedLevel && state.practicedWriting.includes(entry.char)).length;
    const currentStroke = ui.strokeStep ? strokeInfo.sequence[ui.strokeStep - 1] : null;
    const isWord = target.mode === 'words';
    const exampleWord = !isWord ? target.entry.words?.[0] : null;
    const guideLabel = strokeInfo.total ? `${strokeInfo.total}${strokeInfo.complete ? '' : '+'}` : '—';
    const hint = isWord
      ? `<strong>Whole-word practice</strong><br>Write each character from left to right across its guide cell. Kana uses a pale font model when vector stroke data is unavailable.<br><br><strong>Reading</strong><br><span class="jp">${escapeHtml(target.reading)}</span><br><strong>Meaning</strong><br>${escapeHtml(target.meaning)}`
      : `<strong>General stroke-order principles</strong><br>Top before bottom · left before right · horizontal before a crossing vertical · outside before inside.<br><br><strong>Example word</strong><br><span class="jp">${escapeHtml(exampleWord?.[0] || target.text)}（${escapeHtml(exampleWord?.[1] || '')}）</span> · ${escapeHtml(exampleWord?.[2] || target.meaning)}`;
    const speechTarget = isWord ? target.text : (exampleWord?.[0] || target.text);
    return `
      <div class="page" ${levelStyle()}>
        ${pageHeader('Japanese handwriting practice', `${state.selectedLevel} character & word writing`, `Switch between individual kanji and complete vocabulary words, then trace the guide with a mouse, pen, or touch input.`)}
        <div class="writing-mode-toggle" role="group" aria-label="Writing practice mode"><button class="${ui.writingMode === 'kanji' ? 'active' : ''}" data-action="writing-mode" data-mode="kanji">Single kanji</button><button class="${ui.writingMode === 'words' ? 'active' : ''}" data-action="writing-mode" data-mode="words">Whole words</button></div>
        <div class="handwriting-overview"><div><strong>${formatNumber(totalItems)}</strong><span>${isWord ? 'Words' : 'Kanji'} available</span></div><div><strong>${formatNumber(practicedAtLevel)}</strong><span>Practiced at ${state.selectedLevel}</span></div><div><strong>${guideLabel}</strong><span>${strokeInfo.complete ? 'Vector strokes' : 'Vector strokes + font guides'}</span></div></div>
        <div class="writing-layout">
          <section class="card canvas-card">
            <div class="handwriting-reference ${isWord ? 'word-reference' : ''}"><span>${escapeHtml(target.text)}</span><div><h2>${escapeHtml(target.meaning)}</h2><p class="jp">${escapeHtml(target.reading)}${target.detail && target.detail !== target.reading ? ` · ${escapeHtml(target.detail)}` : ''}</p></div></div>
            <div class="canvas-instruction">Hold the left mouse button or use a pen, then follow the pale model${isWord ? ' from left to right' : ''}. Lift between strokes.</div>
            <div class="canvas-wrap ${isWord ? 'word-canvas' : ''}" style="--writing-glyphs:${target.glyphs.length}"><div class="stroke-order-overlay" id="strokeOrderOverlay">${strokeOrderSvg(target)}</div><canvas id="writingCanvas" aria-label="Handwriting canvas for ${escapeHtml(target.text)}"></canvas></div>
            <div class="stroke-order-panel"><div class="stroke-step-copy"><strong id="strokeStepLabel">${strokeInfo.total ? `Stroke ${ui.strokeStep} of ${strokeInfo.total}${target.glyphs.length > 1 ? ` · ${currentStroke?.character || ''}` : ''}` : 'Trace the complete word'}</strong><small id="strokeTypeLabel">${currentStroke ? `Stroke form: ${escapeHtml(currentStroke.path.type || 'standard')}` : 'Kana and unavailable characters use a pale font guide'}</small></div><div class="stroke-order-actions"><button class="btn btn-small btn-ghost" id="strokePrevious" data-action="stroke-previous" ${!strokeInfo.total || ui.strokeStep <= 1 ? 'disabled' : ''}>← Previous</button><button class="btn btn-small btn-ghost" id="strokeNext" data-action="stroke-next" ${!strokeInfo.total || ui.strokeStep >= strokeInfo.total ? 'disabled' : ''}>Next stroke →</button><button class="btn btn-small btn-primary" id="strokeAnimateButton" data-action="stroke-animate" ${!strokeInfo.total ? 'disabled' : ''}>Animate order</button><button class="btn btn-small btn-ghost" id="strokeNumbersButton" data-action="stroke-numbers" ${!strokeInfo.total ? 'disabled' : ''}>${ui.strokeNumbers ? 'Hide numbers' : 'Show numbers'}</button></div></div>
            <div class="canvas-toolbar"><div class="ink-options"><button class="ink-dot ${ui.inkColor === '#20212a' ? 'active' : ''}" style="--ink:#20212a" data-action="ink-color" data-color="#20212a" aria-label="Black ink"></button><button class="ink-dot ${ui.inkColor === '#7857e8' ? 'active' : ''}" style="--ink:#7857e8" data-action="ink-color" data-color="#7857e8" aria-label="Purple ink"></button><button class="ink-dot ${ui.inkColor === '#d65470' ? 'active' : ''}" style="--ink:#d65470" data-action="ink-color" data-color="#d65470" aria-label="Red ink"></button></div><div class="content-card-actions"><button class="btn btn-ghost" data-action="clear-canvas">Clear canvas</button><button class="btn btn-primary" data-action="check-writing">${icon('check')} Review placement</button></div></div>
          </section>
          <aside class="card character-picker"><div class="picker-heading"><div><h3>${isWord ? 'Word library' : 'Kanji library'}</h3><p>Search and select ${isWord ? 'a complete word' : 'a character'} to practice.</p></div><span id="writingResultCount">${formatNumber(items.length)} results</span></div><label class="search-box writing-search">${icon('search')}<input id="writingSearch" value="${escapeHtml(ui.writingSearch)}" placeholder="${isWord ? 'Word, reading, or meaning…' : 'Kanji, meaning, or reading…'}" autocomplete="off"></label><div id="writingPickerResults">${writingPickerMarkup(items)}</div><div class="stroke-hint">${hint}</div><button class="btn btn-ghost btn-wide" style="margin-top:10px" data-action="speak" data-speech="${escapeHtml(speechTarget)}">${icon('volume')} Hear ${isWord ? 'word' : 'example word'}</button><div class="stroke-source">Kanji stroke paths from KanjiVG · CC BY-SA 3.0</div></aside>
        </div>
      </div>`;
  }

  function renderProgress() {
    const total = fullCompletion();
    const heatDates = [];
    for (let offset = 55; offset >= 0; offset -= 1) {
      const date = new Date();
      date.setDate(date.getDate() - offset);
      const key = dateKey(date);
      const activity = state.studyActivity[key] || { questions: 0, sessions: 0, seconds: 0 };
      const questions = Number(activity.questions) || 0;
      const level = questions === 0 ? 0 : questions < 10 ? 1 : questions < 25 ? 2 : questions < 50 ? 3 : 4;
      heatDates.push({ key, questions, seconds: activity.seconds || 0, level });
    }
    const knownPercent = Math.round((state.knownWords.length / DATA.vocabulary.length) * 100) || 0;
    const kanaPercent = Math.round((state.masteredKana.length / (DATA.kana.length * 2)) * 100) || 0;
    const readingPercent = Math.round((state.completedReadings.length / DATA.readings.length) * 100) || 0;
    const records = [
      { label: 'Known vocabulary', value: formatNumber(state.knownWords.length), detail: `of ${formatNumber(DATA.vocabulary.length)} corpus entries`, mark: '語' },
      { label: 'Kana marked learned', value: formatNumber(state.masteredKana.length), detail: 'hiragana and katakana records', mark: 'あ' },
      { label: 'Readings completed', value: formatNumber(state.completedReadings.length), detail: `${state.studyTotals.readings} reading sessions recorded`, mark: '読' },
      { label: 'Sentence reading', value: formatNumber(state.readingSentencesPracticed.length), detail: 'unique comprehension sentences practiced', mark: '解' },
      { label: 'Speaking prompts', value: formatNumber(state.speakingPracticed.length), detail: 'audio-backed shadowing prompts practiced', mark: '話' },
      { label: 'Particle sentences', value: formatNumber(state.particleSentencesPracticed.length), detail: 'contextual particle exercises practiced', mark: '助' },
      { label: 'Conjugation forms', value: formatNumber(state.conjugationsPracticed.length), detail: 'unique verb-and-form combinations practiced', mark: '活' },
      { label: 'Characters written', value: formatNumber(state.practicedWriting.length), detail: 'unique kanji handwriting records', mark: '書' },
      { label: 'Words written', value: formatNumber(state.practicedWords.length), detail: 'complete vocabulary words practiced', mark: '語' },
      { label: 'Mock tests', value: formatNumber(state.mockResults.length), detail: 'full and mini attempts', mark: '試' },
      { label: 'Review queue', value: formatNumber(state.mistakes.length), detail: 'items available for focused review', mark: '復' }
    ];

    return `
      <div class="page" style="--level-color:#9b7cff">
        ${pageHeader('Your study record', 'Progress & insights', 'A neutral record of what you have studied, how much time you have spent, and which material you have covered.')}
        <section class="card progress-hero">
          <div class="big-progress-ring" style="--progress:${total.percent * 3.6}deg"><div class="ring-copy"><strong>${total.percent}%</strong><small>guided path</small></div></div>
          <div class="progress-copy"><div class="eyebrow">N5 → N1 CURRICULUM</div><h2>${total.complete} of ${total.total} guided lessons complete</h2><p>Questions, completed sessions, study time, and curriculum coverage are recorded as neutral learning data.</p><div class="progress-stat-row"><div class="progress-stat"><strong>${formatNumber(state.studyTotals.questions)}</strong><small>Questions answered</small></div><div class="progress-stat"><strong>${formatNumber(state.studyTotals.sessions)}</strong><small>Sessions completed</small></div><div class="progress-stat"><strong>${formatStudyTime(state.studyTotals.seconds)}</strong><small>Focused study time</small></div></div></div>
        </section>
        <div class="progress-panels">
          <section class="card progress-panel"><h3>Guided curriculum</h3><div class="level-progress-list">${DATA.levelOrder.map((level) => { const progress = lessonCompletion(level); return `<div class="bar-row"><strong style="color:${levelColors[level]}">${level}</strong><div class="bar-track"><i style="--width:${progress.percent}%;--bar-color:${levelColors[level]}"></i></div><small>${progress.percent}%</small></div>`; }).join('')}</div></section>
          <section class="card progress-panel"><h3>Reference coverage</h3><div class="skill-progress-list"><div class="bar-row"><strong>Words</strong><div class="bar-track"><i style="--width:${knownPercent}%;--bar-color:#38cfa2"></i></div><small>${knownPercent}%</small></div><div class="bar-row"><strong>Kana</strong><div class="bar-track"><i style="--width:${kanaPercent}%;--bar-color:#ff6f91"></i></div><small>${kanaPercent}%</small></div><div class="bar-row"><strong>Reading</strong><div class="bar-track"><i style="--width:${readingPercent}%;--bar-color:#5cc8ff"></i></div><small>${readingPercent}%</small></div><div class="bar-row"><strong>Writing</strong><div class="bar-track"><i style="--width:${clamp((state.practicedWriting.length + state.practicedWords.length) * 3, 0, 100)}%;--bar-color:#ffb84a"></i></div><small>${state.practicedWriting.length + state.practicedWords.length}</small></div></div></section>
        </div>
        <section class="card activity-card"><div class="activity-head"><h3>Study activity · last 8 weeks</h3><span>${formatNumber(state.studyTotals.questions)} questions recorded</span></div><div class="heatmap">${heatDates.map((day) => `<span class="heat-cell" data-level="${day.level}" title="${day.key}: ${day.questions} questions · ${formatStudyTime(day.seconds)}"></span>`).join('')}</div></section>
        <div class="section-title"><div><h2>Learning record</h2><p>Counts reflect your actual interaction with the material.</p></div></div>
        <div class="learning-record-grid">${records.map((record) => `<article class="learning-record"><span>${record.mark}</span><div><strong>${record.value}</strong><h3>${record.label}</h3><p>${record.detail}</p></div></article>`).join('')}</div>
        <section class="card data-card"><div><h3>Your data, in your hands</h3><p>Back up or transfer your learning record with a human-readable JSON file.</p></div><div class="data-actions"><button class="btn btn-small btn-ghost" data-action="import-progress">${icon('upload')} Import</button><button class="btn btn-small btn-ghost" data-action="export-progress">${icon('download')} Export</button><button class="btn btn-small btn-danger" data-action="reset-progress">Reset</button></div></section>
      </div>`;
  }

  function renderGuide() {
    const cards = [
      { icon: '耳', title: 'Listening', body: 'Train situation recognition, key-word extraction, natural speed, reductions, intonation, and the ability to infer a speaker’s intention.' },
      { icon: '読', title: 'Reading', body: 'Move from sentence decoding to paragraph structure, reference tracking, author stance, logical relations, and timed information search.' },
      { icon: '話', title: 'Speaking', body: 'Build mora timing, pitch awareness, automatic chunks, interaction strategies, register control, and increasingly precise self-expression.' },
      { icon: '書', title: 'Writing', body: 'Learn stroke logic, kana fluency, kanji components, sentence cohesion, messages, formal correspondence, summaries, and argument.' },
      { icon: '語', title: 'Vocabulary', body: 'Study meaning, reading, collocation, register, word families, near-synonyms, productive recall, and context-sensitive usage.' },
      { icon: '文', title: 'Grammar', body: 'Connect form to communicative purpose, contrast similar patterns, notice constraints, and process patterns at conversational speed.' }
    ];
    const plan = [
      ['Sound & recall', 'Kana speed, pronunciation, spaced vocabulary review', '10 min'],
      ['Focused lesson', 'One path lesson with grammar and contextual examples', '15 min'],
      ['Comprehensible input', 'Graded listening or reading just above comfort', '15 min'],
      ['Production', 'Shadow, speak, or write a tiny response', '10 min'],
      ['Error loop', 'Review mistakes and explain the correction aloud', '5 min']
    ];
    return `
      <div class="page" style="--level-color:#9b7cff">
        ${pageHeader('Map the mountain', 'JLPT N5 → N1 guide', 'The JLPT measures language knowledge, reading, and listening. Kumo also trains speaking and writing so your Japanese works beyond the test.')}
        <div class="guide-levels">${DATA.levelOrder.map((level) => { const info = DATA.levels[level]; return `<button class="guide-level" data-level="${level}" data-action="guide-level" style="--card-color:${info.color}"><b>${level}</b><strong>${info.name}</strong><small>${formatNumber(DATA.corpusMeta?.counts?.kanji?.[level] || 0)} kanji · ${formatNumber(DATA.corpusMeta?.counts?.vocab?.[level] || 0)} words · ${formatNumber(DATA.corpusMeta?.counts?.grammar?.[level] || 0)} grammar</small></button>`; }).join('')}</div>
        <div class="section-title"><div><h2>A complete language system</h2><p>Test preparation sits inside broader communicative ability.</p></div></div>
        <div class="guide-sections">${cards.map((card) => `<article class="card guide-card"><div class="guide-card-icon jp">${card.icon}</div><h3>${card.title}</h3><p>${card.body}</p></article>`).join('')}</div>
        <div class="section-title"><div><h2>A balanced 55-minute session</h2><p>Shorten each block on busy days; keep the sequence.</p></div></div>
        <section class="card study-plan">${plan.map((step, index) => `<div class="plan-step"><span class="plan-number">${String(index + 1).padStart(2, '0')}</span><div><strong>${step[0]}</strong><p>${step[1]}</p></div><small>${step[2]}</small></div>`).join('')}</section>
        <div class="pronunciation-tip" style="margin-top:14px"><b>Important</b><span>The JLPT has not published fixed vocabulary, kanji, or grammar lists since 2010. These levels are comprehensive community-aligned study coverage, not an official disclosed syllabus.</span></div>
        <section class="corpus-source-card"><div><span class="source-mark">開</span><div><small>DATA SOURCE & LICENSE</small><h3>OpenJLPT ${escapeHtml(DATA.corpusMeta?.version || '')}</h3><p>${escapeHtml(DATA.corpusMeta?.attribution || '')}</p></div></div><a class="btn btn-small btn-ghost" href="${escapeHtml(DATA.corpusMeta?.homepage || 'https://github.com/evanclan/OpenJLPT')}" target="_blank" rel="noreferrer">View source</a></section>
      </div>`;
  }

  function choiceSet(answer, alternatives, count = 4) {
    const choices = [answer];
    const seen = new Set(choices);
    let attempts = 0;
    while (choices.length < count && attempts < alternatives.length * 3) {
      const candidate = alternatives[Math.floor(Math.random() * alternatives.length)];
      if (candidate != null && candidate !== '' && !seen.has(candidate)) {
        choices.push(candidate);
        seen.add(candidate);
      }
      attempts += 1;
    }
    if (choices.length < count) {
      for (const candidate of alternatives) {
        if (candidate != null && candidate !== '' && !seen.has(candidate)) {
          choices.push(candidate);
          seen.add(candidate);
          if (choices.length === count) break;
        }
      }
    }
    return shuffle(choices);
  }

  function sampleItems(items, limit) {
    if (!limit || items.length <= limit) return [...items];
    return shuffle(items).slice(0, limit);
  }

  function readingSentenceBank(level) {
    const key = `reading:${level}`;
    if (exerciseCache.has(key)) return exerciseCache.get(key);
    const candidates = DATA.vocabulary.filter((word) => word.level === level).flatMap((word) =>
      (word.examples || []).map((example, index) => ({
        id: `reading-${word.id}-${index}`,
        level,
        word,
        sentence: example.ja,
        furigana: example.furigana || '',
        translation: example.en
      }))
    );
    const bank = [...new Map(candidates.map((entry) => [entry.sentence, entry])).values()];
    exerciseCache.set(key, bank);
    return bank;
  }

  function readingSentenceQuestion(entry, translations) {
    return {
      kind: 'choice',
      label: 'Reading · sentence comprehension',
      prompt: 'Choose the translation that best matches this sentence.',
      display: `<span class="reading-question-sentence">${japanesePhraseHtml(entry.sentence, entry.furigana)}</span>`,
      choices: choiceSet(entry.translation, translations),
      answer: entry.translation,
      explanation: `${entry.sentence} — ${entry.translation}`,
      sentence: entry.sentence,
      furigana: entry.furigana,
      translation: entry.translation,
      focusLabel: `${entry.word.word}（${entry.word.reading}）— ${entry.word.meanings?.[0] || entry.word.meaning}`,
      formation: (entry.word.posDescriptions || [entry.word.partOfSpeech]).slice(0, 3).join(' · '),
      teachingNote: 'Read from the grammatical structure first: identify the main predicate, then use particles to connect each noun or clause to it. Confirm unknown vocabulary only after forming an overall interpretation.',
      guide: GUIDE?.vocabulary?.(entry.word, { sentence: entry.sentence, furigana: entry.furigana, translation: entry.translation, tip: 'Reading strategy: find the predicate at the end of the sentence first, then attach each phrase to it through its particle.' }),
      memoryPrompt: entry.sentence,
      trackingCollection: 'readingSentencesPracticed',
      trackingKey: entry.id
    };
  }

  function readingSentenceQuestions(level, itemLimit = 10, entryId = null) {
    const bank = readingSentenceBank(level);
    const selectedEntry = entryId ? bank.find((entry) => entry.id === entryId) : null;
    const exercises = selectedEntry ? [selectedEntry] : sampleItems(bank, itemLimit);
    const translations = bank.map((entry) => entry.translation);
    return exercises.map((entry) => readingSentenceQuestion(entry, translations));
  }

  function speakingExerciseBank(level) {
    const key = `speaking:${level}`;
    if (exerciseCache.has(key)) return exerciseCache.get(key);
    const bank = DATA.grammar.filter((rule) => rule.level === level).flatMap((rule) =>
      rule.examples.map((example, index) => ({
        id: `speaking-${rule.id}-${index}`,
        level,
        japanese: example.ja,
        furigana: example.furigana || '',
        translation: example.en,
        pattern: rule.pattern,
        meaning: rule.meaning,
        formation: rule.form,
        note: rule.explanation
      }))
    );
    exerciseCache.set(key, bank);
    return bank;
  }

  function listeningExerciseBank(level) {
    const key = `listening-bank:${level}`;
    if (exerciseCache.has(key)) return exerciseCache.get(key);
    const staticClips = DATA.listening.filter((clip) => clip.level === level);
    const generatedClips = speakingExerciseBank(level)
      .filter((exercise) => exercise.japanese && exercise.translation && window.KUMO_AUDIO?.[exercise.japanese])
      .map((exercise, index) => ({
        id: `listen-${exercise.id}`,
        level,
        title: `Context ${index + 1} · ${grammarQuestionPattern(exercise.pattern)}`,
        text: exercise.japanese,
        translation: exercise.translation,
        furigana: exercise.furigana,
        pattern: exercise.pattern,
        questions: []
      }));
    const bank = [...new Map([...staticClips, ...generatedClips].map((clip) => [clip.text, clip])).values()];
    exerciseCache.set(key, bank);
    return bank;
  }

  function particleQuestions(level, itemLimit = 10) {
    const allExercises = DATA.particleExercises.filter((entry) => entry.level === level);
    const exercises = sampleItems(allExercises, itemLimit);
    const allAnswers = unique(allExercises.map((entry) => entry.answer));
    return exercises.map((entry) => {
      const sameGroup = unique(allExercises.filter((candidate) => candidate.group === entry.group).map((candidate) => candidate.answer));
      const alternatives = unique([...sameGroup, ...allAnswers]);
      return {
        kind: 'choice',
        label: `Particles · ${entry.groupLabel}`,
        prompt: 'Choose the particle that completes this sentence.',
        display: `<span class="particle-question-sentence">${japanesePhraseHtml(entry.blank).replace('＿＿', '<b>＿＿</b>')}</span>`,
        choices: choiceSet(entry.answer, alternatives),
        answer: entry.answer,
        explanation: `${entry.sentence} — ${entry.translation}`,
        sentence: entry.sentence,
        furigana: entry.furigana || '',
        translation: entry.translation,
        focusLabel: `${entry.answer} — ${entry.groupLabel}`,
        formation: `Particle placed at the marked position · focus word: ${entry.focusWord}（${entry.focusReading}）`,
        teachingNote: entry.explanation,
        guide: GUIDE?.particle?.(entry),
        memoryPrompt: entry.blank,
        trackingCollection: 'particleSentencesPracticed',
        trackingKey: entry.id
      };
    });
  }

  function conjugationBank(level) {
    const key = `conjugation:${level}`;
    if (exerciseCache.has(key)) return exerciseCache.get(key);
    const entries = DATA.vocabulary
      .filter((word) => word.level === level)
      .map((word) => CONJUGATOR.conjugate(word))
      .filter(Boolean);
    const bank = [...new Map(entries.map((entry) => [`${entry.dictionary}\u0000${entry.reading}\u0000${entry.classCode}`, entry])).values()];
    exerciseCache.set(key, bank);
    return bank;
  }

  function conjugationQuestions(level, itemLimit = 10) {
    const bank = conjugationBank(level);
    const verbs = sampleItems(bank, Math.max(5, Math.ceil(itemLimit / 2)));
    const questions = [];
    for (const verb of verbs) {
      const forms = CONJUGATOR.availableForms(level, verb);
      if (!forms.length) continue;
      const target = forms[Math.floor(Math.random() * forms.length)];
      const valueAlternatives = forms.map((entry) => entry.value);
      const common = {
        explanation: `${verb.dictionary} → ${target.value}（${target.reading}）`,
        focusLabel: `${verb.dictionary} → ${target.value}`,
        formation: `${verb.classLabel} · ${target.label}`,
        teachingNote: `${target.rule} The result is ${target.value}（${target.reading}）.`,
        memoryPrompt: `${verb.dictionary}: ${target.prompt}`,
        trackingCollection: 'conjugationsPracticed',
        trackingKey: `${verb.id}:${target.key}`
      };
      questions.push({
        ...common,
        kind: 'choice',
        label: `Verb conjugation · ${verb.classLabel}`,
        prompt: `How do you express the ${target.prompt} of ${verb.dictionary}?`,
        display: `<span class="conjugation-dictionary">${escapeHtml(verb.dictionary)}</span><span class="conjugation-reading">${escapeHtml(verb.reading)} · ${escapeHtml(verb.meaning)}</span>`,
        choices: choiceSet(target.value, valueAlternatives),
        answer: target.value
      });

      const uniqueForms = forms.filter((entry) => forms.filter((candidate) => candidate.value === entry.value).length === 1);
      if (uniqueForms.length >= 4) {
        const recognized = uniqueForms[Math.floor(Math.random() * uniqueForms.length)];
        questions.push({
          kind: 'choice',
          label: `Verb conjugation · recognition`,
          prompt: `Which conjugation is ${recognized.value}?`,
          display: `<span class="conjugation-dictionary">${escapeHtml(recognized.value)}</span><span class="conjugation-reading">dictionary form: ${escapeHtml(verb.dictionary)}（${escapeHtml(verb.reading)}）</span>`,
          choices: choiceSet(recognized.label, uniqueForms.map((entry) => entry.label)),
          answer: recognized.label,
          explanation: `${recognized.value} is the ${recognized.label} of ${verb.dictionary}.`,
          focusLabel: `${verb.dictionary} → ${recognized.value}`,
          formation: `${verb.classLabel} · ${recognized.label}`,
          teachingNote: `${recognized.rule} The reading is ${recognized.reading}.`,
          memoryPrompt: `${recognized.value}: identify the form`,
          trackingCollection: 'conjugationsPracticed',
          trackingKey: `${verb.id}:${recognized.key}`
        });
      }
    }
    return extendQuestionPool(questions, itemLimit);
  }

  function vocabularyQuestions(level, partOfSpeech = null, itemLimit = null) {
    const levelWords = DATA.vocabulary.filter((word) => word.level === level);
    const matchingWords = partOfSpeech ? levelWords.filter((word) => word.partOfSpeech === partOfSpeech) : levelWords;
    const words = sampleItems(matchingWords, itemLimit);
    const meaningAlternatives = levelWords.map((entry) => entry.meaning);
    const readingAlternatives = levelWords.map((entry) => entry.reading);
    return words.flatMap((word) => {
      const example = word.examples?.[0];
      const firstMeaning = word.meanings?.[0] || word.meaning;
      const roleNote = word.partOfSpeech === 'Verbs'
        ? 'Notice the verb ending and the particles that identify its participants or setting.'
        : word.partOfSpeech === 'Adjectives'
          ? 'Notice what this adjective describes and whether it connects directly or through a copula.'
          : word.partOfSpeech === 'Nouns'
            ? 'The particle beside this noun indicates its role in the sentence.'
            : 'Read this expression as a complete unit and observe where it sits in the sentence.';
      const guide = {
        sentence: example?.ja || '',
        furigana: example?.furigana || '',
        translation: example?.en || '',
        focusLabel: `${word.word}（${word.reading}）— ${firstMeaning}`,
        formation: (word.posDescriptions || [word.partOfSpeech]).slice(0, 3).join(' · '),
        teachingNote: `${roleNote} In this context, ${word.word} carries the meaning “${firstMeaning}.”`,
        guide: GUIDE?.vocabulary?.(word, { sentence: example?.ja || '', furigana: example?.furigana || '', translation: example?.en || '' })
      };
      const questions = [{
        ...guide,
        kind: 'choice',
        label: `Vocabulary · ${partOfSpeech || 'meaning'}`,
        prompt: 'What does this word mean?',
        display: `${japanesePhraseHtml(word.word, '', { dictionary: false })}　<span class="subtle jp">${escapeHtml(word.reading)}</span>`,
        choices: choiceSet(word.meaning, meaningAlternatives),
        answer: word.meaning,
        explanation: example ? `${example.ja} — ${example.en}` : `${word.word}（${word.reading}）`,
        speech: word.word,
        memoryPrompt: word.word
      }];
      if (JAPANESE?.readingQuestionIsUseful?.(word.word, word.reading) ?? (/\p{Script=Han}/u.test(word.word) && word.word !== word.reading)) {
        questions.push({
          ...guide,
          kind: 'choice',
          label: `Vocabulary · ${partOfSpeech || 'reading'}`,
          prompt: 'Choose the correct reading.',
          display: escapeHtml(word.word),
          choices: choiceSet(word.reading, readingAlternatives),
          answer: word.reading,
          explanation: `${word.word} means “${word.meaning}.”`,
          speech: word.word,
          memoryPrompt: word.word
        });
      }
      return questions;
    });
  }

  function grammarQuestions(level, itemLimit = null) {
    const allRules = DATA.grammar.filter((rule) => rule.level === level);
    const rules = sampleItems(allRules, itemLimit);
    const alternatives = allRules.map((entry) => entry.meaning);
    return rules.map((rule) => {
      const example = rule.examples?.[0] || { ja: rule.example, en: rule.translation };
      const testPattern = grammarQuestionPattern(rule.pattern);
      const blockedPatternForms = testPattern.split('/').map((part) => part.replace(/[〜～\s]/g, '')).filter(Boolean);
      return {
        kind: 'choice',
        label: 'Grammar · function',
        prompt: 'What function does this pattern express in the sentence?',
        display: `<span class="grammar-question-pattern">${japanesePhraseHtml(testPattern, '', { dictionary: false })}</span>${example.ja ? `<span class="grammar-question-context jp">${japanesePhraseHtml(example.ja, example.furigana, { blockedForms: blockedPatternForms })}</span>` : ''}`,
        choices: choiceSet(rule.meaning, alternatives),
        answer: rule.meaning,
        explanation: `${example.ja} — ${example.en}`,
        speech: example.ja,
        memoryPrompt: testPattern,
        sentence: example.ja,
        furigana: example.furigana || '',
        translation: example.en,
        focusLabel: `${rule.pattern} — ${rule.meaning}`,
        formation: rule.form,
        teachingNote: rule.explanation,
        guide: GUIDE?.grammar?.(rule, example, testPattern)
      };
    });
  }

  // "Core meaning" choices use the first three glosses so long KANJIDIC lists stay readable.
  function kanjiCoreMeaning(entry) {
    const meanings = entry.meanings?.length ? entry.meanings : String(entry.meaning || '').split(';');
    return meanings.map((meaning) => String(meaning).trim()).filter(Boolean).slice(0, 3).join('; ');
  }

  function kanjiQuestions(level, itemLimit = null) {
    const allEntries = DATA.kanji.filter((entry) => entry.level === level);
    const entries = sampleItems(allEntries, itemLimit);
    const meaningAlternatives = allEntries.map(kanjiCoreMeaning);
    const readingAlternatives = allEntries.map((item) => item.words[0]?.[1]).filter(Boolean);
    return entries.flatMap((entry) => {
      const picked = GUIDE?.kanjiExample?.(entry);
      const fallbackWord = picked ? null : DATA.vocabulary.find((word) => word.word === entry.words[0]?.[0] && word.examples?.length)
        || DATA.vocabulary.find((word) => word.word.includes(entry.char) && word.examples?.length);
      const example = picked?.example || fallbackWord?.examples?.[0];
      const coreMeaning = kanjiCoreMeaning(entry);
      const guide = {
        sentence: example?.ja || '',
        furigana: example?.furigana || '',
        translation: example?.en || '',
        focusLabel: `${entry.char} — ${entry.meanings?.[0] || entry.meaning}`,
        formation: `On: ${entry.on} · Kun: ${entry.kun}`,
        teachingNote: `${entry.words[0][0]} is read ${entry.words[0][1] || 'according to context'} and means “${entry.words[0][2] || entry.meanings?.[0]}.” The surrounding word determines which kanji reading is used.`,
        guide: GUIDE?.kanji?.(entry, { sentence: example?.ja || '', furigana: example?.furigana || '', translation: example?.en || '', form: picked?.form || '' })
      };
      const questions = [{
        ...guide, kind: 'choice', label: 'Kanji · meaning', prompt: 'Choose the core meaning.', display: entry.char,
        choices: choiceSet(coreMeaning, meaningAlternatives), answer: coreMeaning,
        explanation: `${entry.words[0][0]}（${entry.words[0][1]}）— ${entry.words[0][2]}`, speech: entry.words[0][0], memoryPrompt: entry.char
      }];
      if (entry.words[0]?.[1]) questions.push({
        ...guide, kind: 'choice', label: 'Kanji · word reading', prompt: `How do you read ${entry.words[0][0]}?`, display: entry.words[0][0],
        choices: choiceSet(entry.words[0][1], readingAlternatives), answer: entry.words[0][1],
        explanation: `${entry.words[0][0]} means “${entry.words[0][2]}.”`, speech: entry.words[0][0], memoryPrompt: entry.words[0][0]
      });
      return questions;
    });
  }

  function listeningQuestion(clip, translations) {
    const sourceQuestions = (clip.questions || []).filter(Boolean);
    const sourceQuestion = sourceQuestions.length ? sourceQuestions[Math.floor(Math.random() * sourceQuestions.length)] : null;
    const prompt = sourceQuestion?.prompt || 'Which English meaning best matches what you hear?';
    const answer = sourceQuestion?.answer || clip.translation;
    const choices = sourceQuestion?.choices || choiceSet(answer, translations);
    return {
      kind: 'listening',
      label: 'Listening · comprehension',
      prompt,
      display: '',
      choices,
      answer,
      explanation: `${clip.text} — ${clip.translation}`,
      speech: clip.text,
      memoryPrompt: `🎧 ${clip.id}`,
      sentence: clip.text,
      furigana: clip.furigana || '',
      translation: clip.translation,
      focusLabel: sourceQuestion ? `Key detail: ${answer}` : grammarQuestionPattern(clip.pattern || 'Spoken meaning'),
      formation: 'Natural spoken Japanese · listen for particles, time expressions, and sentence endings',
      teachingNote: sourceQuestion
        ? `The question asks: “${prompt}” The answer is “${answer}.” Locate the phrase that supplies that detail, then replay the audio while following the Japanese text.`
        : 'Listen once for the overall situation, then replay for the predicate and the words connected to it by particles.',
      guide: GUIDE?.listening?.({
        prompt,
        answer,
        pattern: clip.pattern ? grammarQuestionPattern(clip.pattern) : '',
        meaning: clip.pattern ? DATA.grammar.find((rule) => rule.pattern === clip.pattern)?.meaning || '' : '',
        hasQuestion: Boolean(sourceQuestion)
      })
    };
  }

  function listeningQuestions(level, itemLimit = null, clipId = null) {
    const bank = listeningExerciseBank(level);
    const requestedClip = clipId ? bank.find((clip) => clip.id === clipId) : null;
    const selectedClips = requestedClip ? [requestedClip] : sampleItems(bank, itemLimit || bank.length);
    const translations = unique(bank.map((clip) => clip.translation).filter(Boolean));
    return selectedClips.map((clip) => listeningQuestion(clip, translations));
  }

  function kanaQuestions() {
    const items = currentKanaItems();
    return items.flatMap((item) => {
      const char = item[ui.kanaScript];
      return [
        { kind: 'choice', label: `${ui.kanaScript} · recognition`, prompt: 'Choose the matching sound.', display: char, choices: choiceSet(item.romaji, items.map((entry) => entry.romaji)), answer: item.romaji, explanation: `${char} is read “${item.romaji}.”`, speech: char, memoryPrompt: char },
        { kind: 'choice', label: `${ui.kanaScript} · recall`, prompt: `Which character represents “${item.romaji}”?`, display: item.romaji, choices: choiceSet(char, items.map((entry) => entry[ui.kanaScript])), answer: char, explanation: `${char} is one Japanese mora.`, speech: char, memoryPrompt: item.romaji }
      ];
    });
  }

  function extendQuestionPool(pool, count) {
    if (!pool.length || count <= 0) return [];
    const result = [];
    while (result.length < count) {
      const cycle = shuffle(pool).map((question) => ({
        ...question,
        choices: question.choices ? shuffle(question.choices) : question.choices
      }));
      if (result.length && cycle.length > 1 && result.at(-1).memoryPrompt === cycle[0].memoryPrompt) cycle.push(cycle.shift());
      result.push(...cycle);
    }
    return result.slice(0, count);
  }

  function buildQuestions(level, focus = 'mixed', count = null) {
    const defaultCount = focus === 'mixed' ? 7 : focus === 'listening' ? 10 : 6;
    const desiredCount = count || defaultCount;
    const wordLimit = Math.max(8, Math.ceil(desiredCount / 2));
    let selectedPool;
    if (focus === 'mixed') {
      selectedPool = [
        ...vocabularyQuestions(level, null, Math.max(8, Math.ceil(desiredCount * .25))),
        ...conjugationQuestions(level, Math.max(4, Math.ceil(desiredCount * .14))),
        ...grammarQuestions(level, Math.max(5, Math.ceil(desiredCount * .16))),
        ...particleQuestions(level, Math.max(5, Math.ceil(desiredCount * .18))),
        ...readingSentenceQuestions(level, Math.max(5, Math.ceil(desiredCount * .18))),
        ...kanjiQuestions(level, Math.max(6, Math.ceil(desiredCount * .22))),
        ...listeningQuestions(level, Math.max(4, Math.ceil(desiredCount * .18))),
        ...sampleItems(kanaQuestions(), Math.max(8, Math.ceil(desiredCount * .2)))
      ];
    } else {
      const factories = {
        vocabulary: () => vocabularyQuestions(level, null, wordLimit),
        verbs: () => vocabularyQuestions(level, 'Verbs', wordLimit),
        conjugation: () => conjugationQuestions(level, desiredCount),
        nouns: () => vocabularyQuestions(level, 'Nouns', wordLimit),
        adjectives: () => vocabularyQuestions(level, 'Adjectives', wordLimit),
        adverbs: () => vocabularyQuestions(level, 'Adverbs & expressions', wordLimit),
        grammar: () => grammarQuestions(level, desiredCount),
        particles: () => particleQuestions(level, desiredCount),
        reading: () => readingSentenceQuestions(level, desiredCount),
        kanji: () => kanjiQuestions(level, wordLimit),
        listening: () => listeningQuestions(level, desiredCount),
        kana: () => sampleItems(kanaQuestions(), desiredCount)
      };
      selectedPool = (factories[focus] || factories.vocabulary)();
    }
    return extendQuestionPool(selectedPool, desiredCount);
  }

  function readingExamQuestions(level) {
    const passageQuestions = DATA.readings.filter((reading) => reading.level === level).flatMap((reading) =>
      reading.questions.map((question) => ({
        kind: 'reading', label: 'Reading · comprehension', prompt: question.question, display: '', passage: reading.text,
        passageTitle: reading.japaneseTitle, choices: question.choices, answer: question.answer,
        explanation: `${reading.title} — ${reading.translation}`, memoryPrompt: `読 ${reading.id}:${question.question}`
      }))
    );
    const sentenceBank = readingSentenceBank(level);
    const translations = sentenceBank.map((entry) => entry.translation);
    const sentenceQuestions = sentenceBank.slice(0, 20).map((entry) => ({
      kind: 'reading',
      label: 'Reading · sentence comprehension',
      prompt: 'Which translation best matches this sentence?',
      display: '',
      passage: entry.sentence,
      passageTitle: `${entry.word.word}（${entry.word.reading}）`,
      choices: choiceSet(entry.translation, translations),
      answer: entry.translation,
      explanation: `${entry.sentence} — ${entry.translation}`,
      memoryPrompt: `読 ${entry.id}`
    }));
    return [...passageQuestions, ...sentenceQuestions];
  }

  function examStimulusMarkup(question) {
    const stimulus = String(question.stimulus || '');
    const target = String(question.target || '');
    if (!target) return `<span class="exam-bank-stimulus jp">${escapeHtml(stimulus)}</span>`;
    const targetIndex = stimulus.indexOf(target);
    if (targetIndex < 0) return `<span class="exam-bank-stimulus jp">${escapeHtml(stimulus)}</span>`;
    return `<span class="exam-bank-stimulus jp">${escapeHtml(stimulus.slice(0, targetIndex))}<mark class="exam-target">${escapeHtml(target)}</mark>${escapeHtml(stimulus.slice(targetIndex + target.length))}</span>`;
  }

  function buildExamQuestions(level, mode) {
    if (!MOCK_EXAMS?.createExam) throw new Error('The open JLPT-aligned question bank is unavailable.');
    return MOCK_EXAMS.createExam(level, mode).map((question) => ({
      ...question,
      label: question.formatLabel,
      display: question.kind === 'choice' ? examStimulusMarkup(question) : '',
      sentence: question.kind === 'listening' ? question.speech : question.passage || question.stimulus || '',
      translation: '',
      focusLabel: question.formatLabel,
      formation: `Original ${question.formatLabel} item`,
      teachingNote: question.explanation
    }));
  }

  function formatExamTime(totalSeconds) {
    const seconds = Math.max(0, totalSeconds);
    return `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}`;
  }

  function startExam(mode = 'full') {
    const examMode = mode === 'full' ? 'full' : 'mini';
    const fullMinutes = { N5: 35, N4: 40, N3: 45, N2: 50, N1: 55 };
    const duration = (examMode === 'full' ? fullMinutes[state.selectedLevel] : 15) * 60;
    let questions;
    try {
      questions = buildExamQuestions(state.selectedLevel, examMode);
    } catch (error) {
      console.error('Unable to create mock exam:', error);
      showToast(error?.message || 'The mock question bank could not be loaded.', 'error');
      return;
    }
    clearInterval(examTimer);
    stopAudio();
    examSession = {
      mode: examMode,
      level: state.selectedLevel,
      questions,
      answers: [],
      skipped: [],
      flagged: [],
      index: 0,
      duration,
      remaining: duration,
      startedAt: Date.now(),
      result: null,
      submitted: false
    };
    renderExamModal();
    examTimer = setInterval(() => {
      if (!examSession || examSession.result) return;
      examSession.remaining -= 1;
      const timer = $('#examTimer');
      if (timer) {
        timer.textContent = formatExamTime(examSession.remaining);
        timer.classList.toggle('urgent', examSession.remaining <= 60);
      }
      if (examSession.remaining <= 0) submitExam(true);
    }, 1000);
  }

  function renderExamModal() {
    if (!examSession) return;
    const layer = $('#modalLayer');
    layer.classList.remove('hidden');
    layer.innerHTML = examSession.result ? renderExamResult() : renderExamQuestion();
  }

  function renderExamQuestion() {
    const session = examSession;
    const question = session.questions[session.index];
    const selected = session.answers[session.index];
    const isSkipped = session.skipped.includes(session.index);
    const answered = session.answers.filter((answer) => answer != null).length;
    const skippedCount = session.skipped.length;
    const sectionQuestionNumber = session.questions.slice(0, session.index + 1).filter((item) => item.section === question.section).length;
    const sectionTotal = session.questions.filter((item) => item.section === question.section).length;
    let stimulus = '';
    if (question.kind === 'listening') {
      stimulus = `<div class="exam-audio-block"><button class="audio-question" data-action="exam-audio" aria-label="Play listening item">${icon('volume')}</button><p>音声を聞いて、最もよい答えを選んでください。</p></div>`;
    } else if (question.kind === 'reading') {
      stimulus = `<div class="exam-passage"><small>${escapeHtml(question.passageTitle)}</small><p>${escapeHtml(question.passage)}</p></div>`;
    } else {
      stimulus = `<div class="question-japanese exam-stimulus">${question.display}</div>`;
    }
    const navigator = session.questions.map((item, index) => `<button class="exam-dot ${index === session.index ? 'current' : ''} ${session.answers[index] != null ? 'answered' : ''} ${session.skipped.includes(index) ? 'skipped' : ''} ${session.flagged.includes(index) ? 'flagged' : ''}" data-action="exam-jump" data-index="${index}" title="Question ${index + 1} · ${item.section}${session.skipped.includes(index) ? ' · skipped' : ''}">${index + 1}</button>`).join('');
    const sourceLabel = question.source?.name || 'Kumo original';
    const sourceDetails = question.source?.license || '';

    return `<section class="modal-card exam-modal" ${levelStyle(session.level)}>
      <header class="exam-topbar"><button class="modal-close" data-action="close-modal" aria-label="Exit mock test">${icon('close')}</button><div class="exam-title"><strong>${session.level} ${session.mode === 'full' ? 'timed mock' : 'mini mock'}</strong><small>${answered}/${session.questions.length} answered${skippedCount ? ` · ${skippedCount} skipped` : ''}</small></div><div class="exam-timer" id="examTimer">${formatExamTime(session.remaining)}</div><button class="btn btn-small btn-ghost" data-action="submit-exam">Submit test</button></header>
      <div class="exam-workspace"><aside class="exam-navigator"><div class="navigator-head"><strong>Questions</strong><small>Skipped audio is not scored</small></div><div class="exam-dot-grid">${navigator}</div><div class="navigator-legend"><span><i class="answered"></i>Answered</span><span><i class="skipped"></i>Skipped</span><span><i class="flagged"></i>Flagged</span></div></aside>
      <main class="exam-question"><div class="question-label"><span>${escapeHtml(question.section)} · ${sectionQuestionNumber}/${sectionTotal}</span><small>${escapeHtml(question.formatLabel || '')}</small></div><h2>${escapeHtml(question.prompt)}</h2>${stimulus}<div class="answer-grid exam-answers">${question.choices.map((choice, index) => `<button class="answer-option ${selected === choice ? 'selected' : ''}" data-action="exam-answer" data-answer="${escapeHtml(choice)}"><span class="answer-key">${index + 1}</span>${escapeHtml(choice)}</button>`).join('')}</div><div class="exam-item-source" title="${escapeHtml(sourceDetails)}"><span>Original item</span>Built from ${escapeHtml(sourceLabel)}</div></main></div>
      <footer class="exam-footer"><button class="btn btn-ghost" data-action="exam-previous" ${session.index === 0 ? 'disabled' : ''}>← Previous</button>${question.kind === 'listening' ? `<button class="btn btn-ghost exam-skip ${isSkipped ? 'active' : ''}" data-action="exam-skip-audio">${isSkipped ? '↩ Include audio' : 'Skip audio'}</button>` : ''}<button class="flag-button ${session.flagged.includes(session.index) ? 'active' : ''}" data-action="exam-flag">${session.flagged.includes(session.index) ? '● Flagged' : '○ Flag for review'}</button><button class="btn btn-primary" data-action="${session.index === session.questions.length - 1 ? 'submit-exam' : 'exam-next'}">${session.index === session.questions.length - 1 ? 'Submit test' : 'Next →'}</button></footer>
    </section>`;
  }

  function setExamAnswerState(session, answer) {
    if (!session || session.result || answer == null) return false;
    session.answers[session.index] = answer;
    session.skipped = session.skipped.filter((index) => index !== session.index);
    return true;
  }

  function toggleExamAudioSkipState(session) {
    if (!session || session.result || session.questions[session.index]?.kind !== 'listening') return { changed: false, skipped: false };
    const index = session.index;
    if (session.skipped.includes(index)) {
      session.skipped = session.skipped.filter((item) => item !== index);
      return { changed: true, skipped: false };
    }
    session.answers[index] = null;
    session.skipped.push(index);
    if (index < session.questions.length - 1) session.index += 1;
    return { changed: true, skipped: true };
  }

  function scoreExamSession(session) {
    const sections = {};
    const skippedIndexes = new Set(session.skipped);
    let correct = 0;
    const missed = [];
    session.questions.forEach((question, index) => {
      if (!sections[question.section]) sections[question.section] = { correct: 0, total: 0, skipped: 0 };
      sections[question.section].total += 1;
      if (skippedIndexes.has(index)) {
        sections[question.section].skipped += 1;
        return;
      }
      const isCorrect = normalizeAnswer(session.answers[index] ?? '') === normalizeAnswer(question.answer);
      if (isCorrect) {
        correct += 1;
        sections[question.section].correct += 1;
      } else {
        missed.push({
          prompt: question.memoryPrompt || question.prompt,
          answer: question.answer,
          given: session.answers[index] || 'No answer',
          section: question.section,
          sourceName: question.source?.name || 'Kumo original',
          sourceRef: question.source?.recordId || '',
          sourceUrl: question.source?.url || ''
        });
      }
    });
    const skipped = skippedIndexes.size;
    const attempted = session.questions.length - skipped;
    return { sections, correct, missed, attempted, skipped, percent: attempted ? Math.round((correct / attempted) * 100) : null };
  }

  function submitExam(automatic = false) {
    if (!examSession || examSession.submitted) return;
    const unanswered = examSession.questions.filter((_, index) => examSession.answers[index] == null && !examSession.skipped.includes(index)).length;
    if (!automatic && unanswered > 0 && !window.confirm(`${unanswered} questions are unanswered. Submit anyway?`)) return;
    examSession.submitted = true;
    clearInterval(examTimer);
    const score = scoreExamSession(examSession);
    const result = {
      id: `mock-${Date.now()}`,
      date: new Date().toISOString(),
      level: examSession.level,
      mode: examSession.mode,
      total: examSession.questions.length,
      attempted: score.attempted,
      skipped: score.skipped,
      correct: score.correct,
      percent: score.percent,
      sections: score.sections,
      timeUsed: examSession.duration - examSession.remaining,
      timedOut: automatic,
      missed: score.missed
    };
    examSession.result = result;
    state.mockResults.unshift(result);
    state.mockResults = state.mockResults.slice(0, 25);
    recordSession({
      seconds: result.timeUsed,
      questions: examSession.answers.filter((answer) => answer != null).length
    });
    queueSave();
    renderExamModal();
  }

  function renderExamResult() {
    const result = examSession.result;
    const skipped = result.skipped || 0;
    const attempted = result.attempted ?? Math.max(0, result.total - skipped);
    const percentText = Number.isFinite(result.percent) ? `${result.percent}%` : 'N/A';
    const verdict = !Number.isFinite(result.percent) ? 'No scored questions' : result.percent >= 80 ? 'Strong performance' : result.percent >= 70 ? 'Practice benchmark met' : result.percent >= 50 ? 'Foundation is forming' : 'Review and retry';
    const sectionScores = Object.entries(result.sections).map(([name, score]) => {
      const sectionSkipped = score.skipped || 0;
      const sectionAttempted = Math.max(0, score.total - sectionSkipped);
      const sectionPercent = sectionAttempted ? `${Math.round((score.correct / sectionAttempted) * 100)}%` : '—';
      return `<article><span>${name === 'Language knowledge' ? '語' : name === 'Reading' ? '読' : '聴'}</span><div><strong>${escapeHtml(name)}</strong><small>${score.correct}/${sectionAttempted} scored${sectionSkipped ? ` · ${sectionSkipped} skipped` : ''}</small></div><b>${sectionPercent}</b></article>`;
    }).join('');
    const reviewTitle = result.missed.length ? 'Answer review' : skipped ? 'No incorrect answers' : 'Perfect score';
    const reviewDescription = result.missed.length ? 'Study these items before your next attempt.' : skipped ? `${skipped} audio ${skipped === 1 ? 'question was' : 'questions were'} skipped and excluded from scoring.` : 'Every scored answer was correct.';
    const reviewBody = result.missed.length
      ? `<div class="result-mistakes">${result.missed.map((item) => `<div><span>${escapeHtml(item.section)}</span><strong>${escapeHtml(item.prompt)}</strong><p>Your answer: ${escapeHtml(item.given)} · <b>Correct: ${escapeHtml(item.answer)}</b></p>${item.sourceName ? `<small class="result-item-source">Source: ${escapeHtml(item.sourceName)}${item.sourceRef ? ` · ${escapeHtml(item.sourceRef)}` : ''}</small>` : ''}</div>`).join('')}</div>`
      : `<div class="empty-state"><div class="empty-icon">✓</div><h3>${reviewTitle}</h3><p>${reviewDescription}</p></div>`;
    return `<section class="modal-card exam-modal exam-result" ${levelStyle(result.level)}><div class="result-hero"><div class="result-seal"><strong>${percentText}</strong><small>${result.level} MOCK</small></div><div><div class="eyebrow">TEST COMPLETE</div><h2>${verdict}</h2><p>${result.correct}/${attempted} scored${skipped ? ` · ${skipped} skipped` : ''} · ${formatExamTime(result.timeUsed)} used${result.timedOut ? ' · time expired' : ''}</p></div></div><div class="section-score-grid">${sectionScores}</div><div class="result-review"><div class="section-title compact"><div><h2>${reviewTitle}</h2><p>${reviewDescription}</p></div></div>${reviewBody}</div><footer class="result-actions"><button class="btn btn-ghost" data-action="finish-exam">Back to test center</button><button class="btn btn-primary" data-action="retry-exam" data-mode="${result.mode}">${icon('review')} Try another ${result.mode === 'full' ? 'full' : 'mini'} mock</button></footer></section>`;
  }

  function findLesson(lessonId) {
    for (const level of DATA.levelOrder) {
      for (const courseUnit of DATA.levels[level].units) {
        const lesson = courseUnit.lessons.find((entry) => entry.id === lessonId);
        if (lesson) return { ...lesson, level, unit: courseUnit };
      }
    }
    return null;
  }

  function tokenizeJapaneseSentence(sentence) {
    const segments = [...new Intl.Segmenter('ja', { granularity: 'word' }).segment(sentence)];
    const tokens = [];
    let pendingPrefix = '';
    const openingPunctuation = new Set(['「', '『', '（', '［', '｛', '〈', '《', '【', '〔', '〘', '〚', '“', '‘', '«', '‹', '(', '[', '{']);
    const symmetricQuotes = new Set(['"', "'", '＂', '＇']);
    const openQuotes = new Set();
    const punctuation = /^\p{P}+$/u;

    segments.forEach((entry) => {
      const segment = entry.segment;
      if (/^\s+$/u.test(segment)) {
        if (tokens.length) tokens[tokens.length - 1] += segment;
        else pendingPrefix += segment;
        return;
      }
      if (punctuation.test(segment)) {
        [...segment].forEach((character) => {
          let isOpening = openingPunctuation.has(character);
          if (symmetricQuotes.has(character)) {
            isOpening = !openQuotes.has(character);
            if (isOpening) openQuotes.add(character);
            else openQuotes.delete(character);
          }
          if (isOpening) pendingPrefix += character;
          else if (tokens.length) tokens[tokens.length - 1] += character;
          else pendingPrefix += character;
        });
        return;
      }
      tokens.push(`${pendingPrefix}${segment}`);
      pendingPrefix = '';
    });

    if (pendingPrefix && tokens.length) tokens[tokens.length - 1] += pendingPrefix;
    return tokens;
  }

  function createOrderingQuestion(source, translation, provider) {
    const tokenTexts = tokenizeJapaneseSentence(translation);
    if (tokenTexts.length < 2 || new Set(tokenTexts.map((text) => text.trim())).size < 2) {
      throw new Error('The Japanese result is too short to shuffle clearly. Try a longer sentence with several ideas.');
    }

    const tokens = tokenTexts.map((text, index) => ({ id: `sentence-token-${index}`, text }));
    const visualOrder = (items) => items.map((token) => token.text.trim()).join('\u0000');
    const originalVisualOrder = visualOrder(tokens);
    let shuffled = tokens;
    for (let attempt = 0; attempt < 10; attempt += 1) {
      const candidate = shuffle(tokens);
      if (visualOrder(candidate) !== originalVisualOrder) {
        shuffled = candidate;
        break;
      }
    }
    if (shuffled === tokens) {
      const splitAt = tokens.findIndex((token) => token.text.trim() !== tokens[0].text.trim());
      shuffled = [...tokens.slice(splitAt), ...tokens.slice(0, splitAt)];
    }

    return {
      kind: 'ordering',
      label: 'Sentence builder',
      prompt: 'Put the Japanese sentence in order.',
      display: `<div class="ordering-source">${escapeHtml(source)}</div>`,
      answer: tokenTexts.join(''),
      sentence: translation,
      translation: source,
      provider: provider || 'MyMemory',
      tokens,
      shuffledTokenIds: shuffled.map((token) => token.id),
      explanation: 'Compare the particle and verb positions with the corrected sentence.',
      focusLabel: 'Natural Japanese word order',
      formation: `Translation by ${provider || 'MyMemory'}`,
      teachingNote: 'Japanese usually places the main verb at the end. Particles show how each phrase relates to that verb.',
      // globalThis keeps this function runnable in final-verify.cjs's bare sandbox.
      guide: globalThis.KUMO_GUIDE?.ordering?.({ provider: provider || 'MyMemory', tokens: tokens.length }),
      memoryPrompt: source
    };
  }

  function orderingAnswer(question, tokenIds) {
    const tokenById = new Map(question.tokens.map((token) => [token.id, token.text]));
    return tokenIds.map((id) => tokenById.get(id) || '').join('');
  }

  async function buildSentenceExercise() {
    const source = sentenceSourceValue();
    if (!source) {
      ui.sentenceError = 'Type a sentence before translating it.';
      renderAll({ preserveScroll: true });
      return;
    }
    if (sentenceSourceBytes() > 500) {
      ui.sentenceError = 'The sentence is too long. Keep it at 500 bytes or fewer.';
      renderAll({ preserveScroll: true });
      return;
    }
    if (!desktop?.translateToJapanese) {
      ui.sentenceError = 'Translation is unavailable in this build of Kumo.';
      renderAll({ preserveScroll: true });
      return;
    }

    const requestId = ++ui.sentenceRequestId;
    ui.sentenceBusy = true;
    ui.sentenceError = '';
    renderAll({ preserveScroll: true });

    try {
      const result = await desktop.translateToJapanese(source, ui.sentenceLanguage);
      if (requestId !== ui.sentenceRequestId || state.activeView !== 'sentence-builder') return;
      if (!result?.ok) throw new Error(result?.error || 'Translation failed. Please try again.');
      const question = createOrderingQuestion(source, result.translation, result.provider);
      ui.sentenceBusy = false;
      renderAll({ preserveScroll: true });
      startPractice({ title: 'Japanese sentence builder', questions: [question] });
    } catch (error) {
      if (requestId !== ui.sentenceRequestId || state.activeView !== 'sentence-builder') return;
      ui.sentenceBusy = false;
      ui.sentenceError = error?.message || 'Translation failed. Please try again.';
      renderAll({ preserveScroll: true });
    }
  }

  function startPractice({ title, level = state.selectedLevel, focus = 'mixed', length = null, lessonId = null, questions = null }) {
    const built = questions || buildQuestions(level, focus, length);
    if (!built.length) {
      showToast('No practice prompts are available for that selection.', 'error');
      return;
    }
    if (!modalReturnFocus) modalReturnFocus = document.activeElement;
    practiceSession = { title, level, focus, lessonId, questions: built, index: 0, correct: 0, skipped: 0, selected: null, orderedTokenIds: [], answerCorrect: null, checked: false, finished: false, finalized: false, audioPlayedIndex: -1, startedAt: Date.now() };
    renderPracticeModal();
  }

  function renderPracticeModal({ focusTokenId = null } = {}) {
    if (!practiceSession) return;
    const layer = $('#modalLayer');
    $('#appShell').inert = true;
    $('.mobile-nav').inert = true;
    layer.classList.remove('hidden');
    layer.innerHTML = practiceSession.finished ? renderPracticeComplete() : renderPracticeQuestion();
    const tokenToFocus = focusTokenId ? $$('[data-token-id]', layer).find((button) => button.dataset.tokenId === focusTokenId && !button.disabled) : null;
    const defaultFocus = tokenToFocus
      || $('#typeAnswer:not(:disabled)', layer)
      || $('[data-action="next-question"]', layer)
      || $('[data-action="order-token-add"]:not(:disabled)', layer)
      || $('.answer-option:not(:disabled)', layer)
      || $('[data-action="practice-audio"]', layer)
      || $('[data-action="check-answer"]', layer)
      || $('.modal-close', layer);
    if (defaultFocus) setTimeout(() => defaultFocus.focus(), focusTokenId ? 0 : 50);
    if (!practiceSession.finished && practiceSession.questions[practiceSession.index].kind === 'listening' && practiceSession.audioPlayedIndex !== practiceSession.index) {
      const audioSession = practiceSession;
      const audioIndex = audioSession.index;
      audioSession.audioPlayedIndex = audioIndex;
      setTimeout(() => {
        if (practiceSession === audioSession && !audioSession.finished && audioSession.index === audioIndex && audioSession.audioPlayedIndex === audioIndex) {
          speakText(audioSession.questions[audioIndex].speech);
        }
      }, 350);
    }
  }

  // Japanese-only strings get lang="ja" so screen readers and font fallback treat them correctly.
  function guideText(value, tag, className = '') {
    const text = String(value ?? '');
    const japanese = !/[A-Za-z]/.test(text) && /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(text);
    return `<${tag}${className ? ` class="${className}"` : ''}${japanese ? ' lang="ja"' : ''}>${escapeHtml(text)}</${tag}>`;
  }

  // Questions without a generated guide (conjugation, kana, exams) keep their original content.
  function legacyGuide(question) {
    const showCards = Boolean(question.sentence || question.formation);
    return {
      heading: question.focusLabel || question.answer,
      focus: showCards ? { label: 'FOCUS', title: question.focusLabel || question.answer } : null,
      role: showCards ? { label: question.sentence ? 'FORM / ROLE' : 'FORM / RULE', title: question.formation || 'Read in context' } : null,
      note: { paragraphs: [question.teachingNote || question.explanation] }
    };
  }

  function guideCardMarkup(card, modifier) {
    if (!card?.title && !card?.detail) return '';
    return `<div class="${modifier}"><small>${escapeHtml(card.label || '')}</small>${card.title ? guideText(card.title, 'strong') : ''}${card.detail ? guideText(card.detail, 'p') : ''}</div>`;
  }

  function guideNoteMarkup(note = {}) {
    const paragraphs = (note.paragraphs || []).filter(Boolean).map((text) => guideText(text, 'p')).join('');
    const chips = (note.chips || []).length ? `<div class="guide-chips">${note.chips.map((chip) => guideText(chip, 'span')).join('')}</div>` : '';
    const points = (note.points || []).map((point) => `<li>${point.jp ? `<b lang="ja">${escapeHtml(point.jp)}</b>` : ''}${point.reading ? `<span class="guide-reading" lang="ja">${escapeHtml(point.reading)}</span>` : ''}${point.text ? guideText(point.text, 'span', 'guide-point-text') : ''}${point.tag ? guideText(point.tag, 'em') : ''}</li>`).join('');
    const pointList = points ? `${note.pointsLabel ? `<h4>${escapeHtml(note.pointsLabel)}</h4>` : ''}<ul class="guide-points">${points}</ul>` : '';
    const tip = note.tip ? guideText(note.tip, 'p', 'guide-tip') : '';
    return `<div class="teaching-note">${note.label ? `<small>${escapeHtml(note.label)}</small>` : ''}${paragraphs}${chips}${pointList}${tip}</div>`;
  }

  function guideBodyMarkup(guide) {
    const cards = guideCardMarkup(guide.focus, 'guide-focus') + guideCardMarkup(guide.role, 'guide-role');
    return `${cards ? `<div class="explanation-grid">${cards}</div>` : ''}${guideNoteMarkup(guide.note)}`;
  }

  function lessonExplanationMarkup(question) {
    const guide = question.guide || legacyGuide(question);
    if (!question.sentence) {
      return `<section class="lesson-explanation compact"><div class="explanation-title">${icon('book')}<div><small>ANSWER EXPLANATION</small>${guideText(guide.heading || guide.focus?.title || question.focusLabel || question.answer, 'h3')}</div></div>${guideBodyMarkup(guide)}</section>`;
    }
    const sentence = japanesePhraseHtml(question.sentence, question.furigana);
    return `<section class="lesson-explanation"><div class="explanation-title">${icon('book')}<div><small>SENTENCE GUIDE</small><h3>Understand the sentence, not only the answer</h3></div></div><div class="explained-sentence"><div><p class="jp" lang="ja">${sentence}</p><span>${escapeHtml(question.translation || 'Translation not available.')}</span></div>${window.KUMO_AUDIO?.[question.sentence] ? `<button class="word-action" data-action="speak" data-speech="${escapeHtml(question.sentence)}" title="Hear sentence">${icon('volume')}</button>` : ''}</div>${guideBodyMarkup(guide)}</section>`;
  }

  function renderPracticeQuestion() {
    const session = practiceSession;
    const question = session.questions[session.index];
    const progress = Math.round((session.index / session.questions.length) * 100);
    let promptBody = '';
    if (question.kind === 'listening') {
      promptBody = `<button class="audio-question" data-action="practice-audio" aria-label="Play audio">${icon('volume')}</button>`;
    } else {
      promptBody = `<div class="question-japanese">${question.display}</div>`;
    }

    let answers = '';
    if (question.kind === 'typing') {
      answers = `<input class="type-answer" id="typeAnswer" placeholder="Type your answer…" value="${escapeHtml(session.selected || '')}" ${session.checked ? 'disabled' : ''}>`;
    } else if (question.kind === 'ordering') {
      const tokenById = new Map(question.tokens.map((token) => [token.id, token]));
      const placedTokens = session.orderedTokenIds.map((id) => tokenById.get(id)).filter(Boolean);
      const placedIds = new Set(session.orderedTokenIds);
      const availableTokens = question.shuffledTokenIds.map((id) => tokenById.get(id)).filter((token) => token && !placedIds.has(token.id));
      const resultClass = session.checked ? (session.answerCorrect ? 'correct' : 'wrong') : '';
      answers = `<div class="ordering-exercise ${resultClass}">
        <div class="ordering-zone assembled" aria-live="polite"><div class="ordering-zone-head"><strong>Your sentence</strong><button data-action="order-clear" ${session.checked || !placedTokens.length ? 'disabled' : ''}>Clear</button></div><div class="ordering-tiles placed">${placedTokens.length ? placedTokens.map((token, index) => `<button class="ordering-tile placed-tile" data-action="order-token-remove" data-token-id="${token.id}" ${session.checked ? 'disabled' : ''}><span>${index + 1}</span>${escapeHtml(token.text)}</button>`).join('') : '<p>Choose tiles below to build the sentence.</p>'}</div></div>
        <div class="ordering-zone bank"><div class="ordering-zone-head"><strong>Shuffled words</strong><span>${availableTokens.length} remaining</span></div><div class="ordering-tiles">${availableTokens.length ? availableTokens.map((token) => `<button class="ordering-tile" data-action="order-token-add" data-token-id="${token.id}" ${session.checked ? 'disabled' : ''}>${escapeHtml(token.text)}</button>`).join('') : '<p>All tiles have been placed.</p>'}</div></div>
      </div>`;
    } else {
      answers = `<div class="answer-grid">${question.choices.map((choice, index) => {
        let resultClass = '';
        if (session.checked && choice === question.answer) resultClass = 'correct';
        else if (session.checked && choice === session.selected && choice !== question.answer) resultClass = 'wrong';
        return `<button class="answer-option ${session.selected === choice ? 'selected' : ''} ${resultClass}" data-action="select-answer" data-answer="${escapeHtml(choice)}" ${session.checked ? 'disabled' : ''}><span class="answer-key">${index + 1}</span>${escapeHtml(choice)}</button>`;
      }).join('')}</div>`;
    }

    const explanation = session.checked ? lessonExplanationMarkup(question) : '';
    const feedback = session.checked ? `<div class="feedback ${session.answerCorrect ? 'correct' : 'wrong'}"><span class="feedback-icon">${session.answerCorrect ? '✓' : '×'}</span><div><strong>${session.answerCorrect ? 'Correct' : `Correct answer: ${escapeHtml(question.answer)}`}</strong><p>${question.sentence ? 'Review the sentence guide before continuing.' : escapeHtml(question.explanation)}</p></div></div>` : '';
    const questionHint = question.kind === 'listening'
      ? 'Listen as many times as needed, or skip this audio without affecting your accuracy.'
      : question.kind === 'ordering'
        ? 'Tap a shuffled tile to add it. Tap a placed tile to return it.'
        : 'Choose the best answer. Keyboard shortcuts 1–4 and Enter work too.';
    const dictionaryHint = question.display?.includes('dictionary-word')
      ? ' Hover or keyboard-focus a dotted word for its dictionary entry.'
      : '';

    return `<section class="modal-card practice-modal" role="dialog" aria-modal="true" aria-label="Japanese practice" ${levelStyle(session.level)}>
      <div class="practice-top"><button class="modal-close" data-action="close-modal" aria-label="Exit lesson">${icon('close')}</button><div class="practice-progress"><i style="--width:${progress}%"></i></div><span class="practice-count">${session.index + 1} / ${session.questions.length}</span></div>
      <div class="question-area"><div class="question-label">${escapeHtml(question.label)} · ${session.index + 1}/${session.questions.length}</div><h2>${escapeHtml(question.prompt)}</h2><p class="question-sub">${questionHint}${dictionaryHint}</p>${promptBody}${answers}${explanation}</div>
      <footer class="practice-footer">${feedback}${question.kind === 'listening' && !session.checked ? `<button class="btn btn-ghost practice-skip" data-action="skip-practice-audio">Skip audio</button>` : ''}<button class="btn ${session.checked ? 'btn-primary' : 'btn-purple'}" data-action="${session.checked ? 'next-question' : 'check-answer'}">${session.checked ? (session.index === session.questions.length - 1 ? 'See results' : 'Continue') : 'Check answer'}</button></footer>
    </section>`;
  }

  function finalizePractice() {
    if (practiceSession.finalized) return;
    practiceSession.finalized = true;
    const wasNewLesson = practiceSession.lessonId && !state.completedLessons.includes(practiceSession.lessonId);
    if (wasNewLesson) state.completedLessons.push(practiceSession.lessonId);
    const elapsedSeconds = Math.max(60, Math.round((Date.now() - practiceSession.startedAt) / 1000));
    practiceSession.elapsedSeconds = elapsedSeconds;
    recordSession({ seconds: elapsedSeconds, lesson: Boolean(practiceSession.lessonId) });
    queueSave();
  }

  function renderPracticeComplete() {
    finalizePractice();
    const session = practiceSession;
    const skipped = session.skipped || 0;
    const attempted = Math.max(0, session.questions.length - skipped);
    const percent = attempted ? Math.round((session.correct / attempted) * 100) : null;
    return `<section class="modal-card practice-modal" role="dialog" aria-modal="true" aria-label="Japanese practice" ${levelStyle(session.level)}><div class="session-complete"><div class="complete-badge">✓</div><h2>Session complete</h2><p>${escapeHtml(session.title)} · this activity has been added to your study record.${skipped ? ` ${skipped} audio ${skipped === 1 ? 'question was' : 'questions were'} excluded from accuracy.` : ''}</p><div class="result-stats"><div class="result-stat"><strong>${session.correct}/${attempted}</strong><small>Scored</small></div><div class="result-stat"><strong>${percent == null ? 'N/A' : `${percent}%`}</strong><small>Accuracy</small></div><div class="result-stat"><strong>${skipped}</strong><small>Skipped</small></div><div class="result-stat"><strong>${formatStudyTime(session.elapsedSeconds)}</strong><small>Study time</small></div></div><button class="btn btn-primary" data-action="finish-practice">Return to study</button></div></section>`;
  }

  function checkPracticeAnswer() {
    if (!practiceSession || practiceSession.checked) return;
    const question = practiceSession.questions[practiceSession.index];
    if (question.kind === 'typing') practiceSession.selected = $('#typeAnswer')?.value.trim() || '';
    if (question.kind === 'ordering') {
      if (practiceSession.orderedTokenIds.length !== question.tokens.length) {
        showToast('Place every Japanese tile before checking your answer.', 'info');
        return;
      }
      practiceSession.selected = orderingAnswer(question, practiceSession.orderedTokenIds);
    }
    if (practiceSession.selected == null || practiceSession.selected === '') {
      showToast('Choose or type an answer first.', 'info');
      return;
    }
    practiceSession.checked = true;
    const correct = question.kind === 'ordering'
      ? practiceSession.selected === question.answer
      : normalizeAnswer(practiceSession.selected) === normalizeAnswer(question.answer);
    practiceSession.answerCorrect = correct;
    if (correct) {
      practiceSession.correct += 1;
    } else {
      const mistake = { prompt: question.memoryPrompt || question.prompt, answer: question.answer, given: practiceSession.selected, level: practiceSession.level, kind: question.kind, at: Date.now() };
      if (question.kind === 'ordering') {
        mistake.sentence = question.sentence;
        mistake.translation = question.translation;
        mistake.provider = question.provider;
      }
      state.mistakes.unshift(mistake);
      state.mistakes = state.mistakes.slice(0, 30);
    }
    if (question.trackingCollection && question.trackingKey && Array.isArray(state[question.trackingCollection]) && !state[question.trackingCollection].includes(question.trackingKey)) {
      state[question.trackingCollection].push(question.trackingKey);
    }
    recordQuestions(1);
    queueSave();
    renderPracticeModal();
  }

  function normalizeAnswer(value) {
    return String(value).trim().toLocaleLowerCase().replaceAll(/[\s。、！？!?]/g, '');
  }

  function advancePracticeState(session) {
    if (!session) return false;
    if (session.index >= session.questions.length - 1) {
      session.finished = true;
    } else {
      session.index += 1;
      session.selected = null;
      session.orderedTokenIds = [];
      session.answerCorrect = null;
      session.checked = false;
    }
    return true;
  }

  function skipPracticeAudioState(session) {
    if (!session || session.checked || session.questions[session.index]?.kind !== 'listening') return false;
    session.skipped = (session.skipped || 0) + 1;
    return advancePracticeState(session);
  }

  function advancePracticeQuestion() {
    if (!advancePracticeState(practiceSession)) return;
    renderPracticeModal();
  }

  function skipPracticeAudioQuestion() {
    if (!skipPracticeAudioState(practiceSession)) return;
    stopAudio();
    renderPracticeModal();
  }

  function nextPracticeQuestion() {
    if (!practiceSession?.checked) return;
    advancePracticeQuestion();
  }

  function closeModal({ force = false } = {}) {
    const layer = $('#modalLayer');
    if (!force && !state.onboarded && $('.onboarding', layer)) return;
    if (!force && examSession && !examSession.result && !window.confirm('Leave this mock test? Your current answers will not be saved.')) return;
    const returnFocus = modalReturnFocus;
    modalReturnFocus = null;
    stopAudio();
    cancelSpeechCapture();
    clearInterval(examTimer);
    practiceSession = null;
    examSession = null;
    openReaderState = null;
    layer.classList.add('hidden');
    layer.innerHTML = '';
    $('#appShell').inert = false;
    $('.mobile-nav').inert = false;
    if (returnFocus?.isConnected) setTimeout(() => returnFocus.focus(), 0);
  }

  function renderReader() {
    if (!openReaderState) return;
    const reading = DATA.readings.find((entry) => entry.id === openReaderState.id);
    const layer = $('#modalLayer');
    layer.classList.remove('hidden');
    layer.innerHTML = `<section class="modal-card reader-modal" ${levelStyle(reading.level)}>
      <div class="modal-top"><h2>Graded reader</h2><button class="modal-close" data-action="close-modal">${icon('close')}</button></div>
      <div class="reader-body"><div class="reader-meta"><span>${reading.level}</span><span>${reading.minutes} MIN</span><span>${state.completedReadings.includes(reading.id) ? 'COMPLETED' : 'NEW'}</span></div><h2>${escapeHtml(reading.title)}</h2><div class="reader-jp-title">${escapeHtml(reading.japaneseTitle)}</div><div class="reader-passage jp">${japanesePhraseHtml(reading.text)}</div><div class="content-card-actions" style="margin-top:11px"><button class="btn btn-small btn-ghost" data-action="speak" data-speech="${escapeHtml(reading.text)}">${icon('volume')} Listen</button><button class="btn btn-small btn-ghost" data-action="toggle-translation">${openReaderState.translation ? 'Hide' : 'Show'} translation</button></div>${openReaderState.translation ? `<div class="translation-box">${escapeHtml(reading.translation)}</div>` : ''}<div class="reader-question"><h3>${escapeHtml(reading.question)}</h3><div class="reader-options">${reading.choices.map((choice) => { let className = ''; if (openReaderState.answer && choice === reading.answer) className = 'correct'; else if (openReaderState.answer === choice) className = 'wrong'; return `<button class="reader-answer ${className}" data-action="reader-answer" data-answer="${escapeHtml(choice)}">${escapeHtml(choice)}</button>`; }).join('')}</div></div></div>
    </section>`;
  }

  function renderOnboarding() {
    const layer = $('#modalLayer');
    layer.classList.remove('hidden');
    layer.innerHTML = `<section class="modal-card onboarding">
      <div class="onboarding-art"><div><div class="onboard-logo">雲</div><h2>Your Japanese<br>has a path.</h2><p>Small steps from first sounds<br>to advanced nuance.</p></div></div>
      <div class="onboarding-body"><div class="onboarding-step"><small>WELCOME TO KUMO</small><h1>Where should we begin?</h1><p>Pick your current level. Every level remains available, so you can change this at any time.</p></div><span class="onboard-label">My starting point</span><div class="onboard-levels">${DATA.levelOrder.map((level) => `<button class="onboard-level ${state.selectedLevel === level ? 'active' : ''}" style="--choice-color:${levelColors[level]}" data-action="onboard-level" data-level="${level}"><b>${level}</b><small>${DATA.levels[level].name}</small></button>`).join('')}</div><span class="onboard-label">Default practice session</span><div class="goal-options">${[[10, 'Short', 'Focused review'], [25, 'Standard', 'Balanced study'], [50, 'Extended', 'Long practice']].map(([length, label, detail]) => `<button class="goal-option ${state.defaultPracticeLength === length ? 'active' : ''}" data-action="onboard-length" data-length="${length}"><b>${label} · ${length} questions</b><small>${detail}</small></button>`).join('')}</div><div class="onboard-footer"><span>Private, local, and usable offline.</span><button class="btn btn-purple" data-action="finish-onboarding">Begin studying ${icon('chevron')}</button></div></div>
    </section>`;
  }

  function renderSettings() {
    const layer = $('#modalLayer');
    layer.classList.remove('hidden');
    layer.innerHTML = `<section class="modal-card" style="width:min(540px,100%)"><div class="modal-top"><h2>Learning settings</h2><button class="modal-close" data-action="close-modal">${icon('close')}</button></div><div class="settings-body"><div class="setting-row"><div class="setting-copy"><strong>Default practice length</strong><small>Preselect a session size in the Practice Center.</small></div><div class="setting-control"><select id="settingPracticeLength"><option value="10" ${state.defaultPracticeLength === 10 ? 'selected' : ''}>Short · 10 questions</option><option value="25" ${state.defaultPracticeLength === 25 ? 'selected' : ''}>Standard · 25 questions</option><option value="50" ${state.defaultPracticeLength === 50 ? 'selected' : ''}>Extended · 50 questions</option><option value="100" ${state.defaultPracticeLength === 100 ? 'selected' : ''}>Deep study · 100 questions</option></select></div></div><div class="setting-row"><div class="setting-copy"><strong>Japanese speech speed</strong><small>Adjust model audio from careful to natural.</small></div><div class="setting-control"><input id="speechRate" type="range" min="0.55" max="1.15" step="0.05" value="${state.settings.speechRate}"></div></div><div class="setting-row"><div class="setting-copy"><strong>Reduce motion</strong><small>Minimize interface transitions and playback animation.</small></div><button class="toggle ${state.settings.reduceMotion ? 'on' : ''}" data-action="toggle-motion" aria-label="Reduce motion"></button></div><div class="about-line">Kumo Japanese ${escapeHtml(appVersion)} · Your learning record is stored locally.</div></div></section>`;
  }

  function showToast(message, type = 'success') {
    const colors = { success: '#38cfa2', error: '#ff637d', info: '#5cc8ff' };
    const symbols = { success: '✓', error: '!', info: 'i' };
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.style.setProperty('--toast-color', colors[type] || colors.success);
    toast.innerHTML = `<span class="toast-icon">${symbols[type] || '✓'}</span><span>${escapeHtml(message)}</span>`;
    $('#toastRegion').append(toast);
    setTimeout(() => toast.remove(), 3600);
  }

  function stopAudio() {
    if (activeAudio) {
      activeAudio.pause();
      activeAudio.currentTime = 0;
      activeAudio = null;
    }
    if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    activeUtterance = null;
    $$('.playing').forEach((element) => element.classList.remove('playing'));
  }

  function speakText(text, slow = false) {
    stopAudio();
    const source = window.KUMO_AUDIO?.[text];
    if (source) {
      const audio = new Audio(source);
      audio.preload = 'auto';
      audio.playbackRate = slow ? 0.76 : clamp(state.settings.speechRate / 0.82, 0.8, 1.25);
      audio.preservesPitch = true;
      activeAudio = audio;
      audio.addEventListener('ended', () => {
        if (activeAudio === audio) activeAudio = null;
        $$('.playing').forEach((element) => element.classList.remove('playing'));
      }, { once: true });
      let fallbackStarted = false;
      const useFallback = () => {
        if (fallbackStarted) return;
        fallbackStarted = true;
        if (activeAudio === audio) activeAudio = null;
        playSystemSpeechFallback(text, slow);
      };
      audio.addEventListener('error', useFallback, { once: true });
      audio.play().catch(useFallback);
      return audio;
    }
    return playSystemSpeechFallback(text, slow);
  }

  function playSystemSpeechFallback(text, slow = false) {
    if (!('speechSynthesis' in window)) {
      showToast('This audio clip could not be played.', 'error');
      return null;
    }
    const voices = window.speechSynthesis.getVoices();
    const japaneseVoice = voices.find((voice) => voice.lang.toLocaleLowerCase().startsWith('ja'));
    if (!japaneseVoice) {
      showToast('This audio clip is unavailable and no Japanese system voice is installed.', 'error');
      return null;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ja-JP';
    utterance.voice = japaneseVoice;
    utterance.rate = slow ? 0.58 : state.settings.speechRate;
    utterance.pitch = 1;
    utterance.onend = () => { if (activeUtterance === utterance) activeUtterance = null; };
    utterance.onerror = () => showToast('Windows could not play this Japanese phrase.', 'error');
    activeUtterance = utterance;
    window.speechSynthesis.speak(utterance);
    return utterance;
  }

  function playListening(id) {
    const clip = listeningExerciseBank(state.selectedLevel).find((entry) => entry.id === id);
    if (!clip) return;
    const card = document.getElementById(id);
    const playback = speakText(clip.text);
    card?.classList.add('playing');
    if (playback instanceof HTMLAudioElement) {
      playback.addEventListener('ended', () => card?.classList.remove('playing'), { once: true });
      playback.addEventListener('error', () => card?.classList.remove('playing'), { once: true });
    } else {
      setTimeout(() => card?.classList.remove('playing'), Math.max(2200, clip.text.length * 125));
    }
  }

  function microphoneErrorDetails(error) {
    const code = String(error?.error || error?.name || error || '').toLocaleLowerCase();
    if (code.includes('notallowed') || code === 'not-allowed' || code === 'service-not-allowed' || code.includes('security')) {
      return { title: 'Microphone access is blocked', message: 'Allow microphone access for desktop apps in Windows Settings, then try again.', settings: true };
    }
    if (code.includes('notfound') || code === 'audio-capture') {
      return { title: 'No microphone was found', message: 'Connect or enable an input device, then try again.', settings: true };
    }
    if (code.includes('notreadable') || code.includes('trackstarterror')) {
      return { title: 'The microphone is busy', message: 'Close other apps using the microphone and try again.', settings: false };
    }
    if (code === 'no-speech') return { title: 'No speech was detected', message: 'Move closer to the microphone and speak after the input meter begins moving.', settings: false };
    if (code === 'network' || code === 'unavailable') {
      return { title: 'Automatic transcription is unavailable', message: 'Your recording still works locally. Replay it and compare it with the model audio.', settings: false };
    }
    if (code === 'unsupported') return { title: 'Microphone recording is unavailable', message: 'This desktop runtime does not provide the required media capture API.', settings: false };
    return { title: 'Microphone capture failed', message: 'Check the selected Windows input device and try again.', settings: false };
  }

  function speechRetryButton(target, targetReading, exerciseId) {
    return `<button class="btn btn-small btn-ghost" data-action="record-speech" data-target="${escapeHtml(target)}" data-reading="${escapeHtml(targetReading || '')}" ${exerciseId ? `data-exercise="${escapeHtml(exerciseId)}"` : ''}>Record again</button>`;
  }

  function renderMicrophoneError(panel, target, targetReading, exerciseId, error) {
    const details = microphoneErrorDetails(error);
    if (!panel) return;
    panel.innerHTML = `<div class="speech-capture-copy"><div class="eyebrow">MICROPHONE</div><strong>${escapeHtml(details.title)}</strong><p>${escapeHtml(details.message)}</p><div class="speech-result-actions">${speechRetryButton(target, targetReading, exerciseId)}${details.settings ? '<button class="btn btn-small btn-ghost" data-action="open-microphone-settings">Open Windows microphone settings</button>' : ''}</div></div>`;
  }

  function releaseSpeechHardware(capture) {
    if (!capture) return;
    clearTimeout(capture.stopTimer);
    clearInterval(capture.countdownTimer);
    if (capture.meterFrame) cancelAnimationFrame(capture.meterFrame);
    capture.stream?.getTracks?.().forEach((track) => track.stop());
    const closeResult = capture.audioContext?.close?.();
    closeResult?.catch?.(() => {});
  }

  function cancelSpeechCapture() {
    const capture = speechCapture;
    if (!capture) {
      try { recognition?.abort?.(); } catch {}
      recognition = null;
      return;
    }
    capture.discarded = true;
    try { recognition?.abort?.(); } catch {}
    try { if (capture.recorder?.state === 'recording') capture.recorder.stop(); } catch {}
    releaseSpeechHardware(capture);
    if (capture.objectUrl) URL.revokeObjectURL(capture.objectUrl);
    speechCapture = null;
    recognition = null;
  }

  function renderSpeechCaptureResult(capture) {
    if (!capture || capture.discarded || speechCapture !== capture) return;
    const panel = $('#micPanel');
    if (!panel) return;
    const duration = Math.max(0, Date.now() - capture.startedAt);
    const blob = capture.chunks.length ? new Blob(capture.chunks, { type: capture.recorder?.mimeType || 'audio/webm' }) : null;
    const hasVoice = duration >= 500 && (capture.peakLevel >= 0.012 || (!capture.audioContext && (blob?.size || 0) > 2500));
    if (!capture.objectUrl && blob?.size) capture.objectUrl = URL.createObjectURL(blob);
    if (hasVoice && capture.exerciseId) markSpeakingExercise(capture.exerciseId);

    let title;
    let detail;
    let transcript = '';
    if (capture.transcript) {
      title = capture.score >= 72 ? 'Clear text match' : capture.score >= 45 ? 'Good attempt' : 'Try once more';
      detail = `${capture.score}% text match · this estimates intelligibility, not pitch accent.`;
      transcript = `<div class="speech-transcript"><small>RECOGNIZED</small><div class="jp">${escapeHtml(capture.transcript)}</div></div>`;
    } else if (!hasVoice) {
      title = 'No clear voice signal detected';
      detail = 'The microphone connected, but the input was too quiet. Check the input level and try again.';
    } else {
      const recognitionDetails = microphoneErrorDetails(capture.recognitionError || 'unavailable');
      title = 'Recording captured';
      detail = `${recognitionDetails.message} Kumo received audio from your microphone.`;
    }

    panel.innerHTML = `<div class="speech-capture-result"><div class="eyebrow">${capture.transcript ? 'SPEECH CHECK' : 'VOICE RECORDING'}</div><strong>${escapeHtml(title)}</strong><p>${escapeHtml(detail)}</p>${transcript}${capture.objectUrl ? `<audio class="speech-playback" controls src="${escapeHtml(capture.objectUrl)}">Your system cannot play this recording.</audio>` : ''}<div class="speech-result-actions">${speechRetryButton(capture.target, capture.targetReading, capture.exerciseId)}</div></div>`;
  }

  function finishSpeechCapture() {
    const capture = speechCapture;
    if (!capture || capture.finishing || capture.discarded) return;
    capture.finishing = true;
    clearTimeout(capture.stopTimer);
    clearInterval(capture.countdownTimer);
    try { recognition?.stop?.(); } catch {}
    try {
      if (capture.recorder?.state === 'recording') capture.recorder.stop();
      else {
        releaseSpeechHardware(capture);
        setTimeout(() => renderSpeechCaptureResult(capture), 250);
      }
    } catch {
      releaseSpeechHardware(capture);
      setTimeout(() => renderSpeechCaptureResult(capture), 250);
    }
  }

  async function startSpeechRecognition(target, exerciseId = null, targetReading = '') {
    cancelSpeechCapture();
    const panel = $('#micPanel');
    const request = { target, targetReading, exerciseId, chunks: [], peakLevel: 0, startedAt: Date.now(), pending: true };
    speechCapture = request;
    if (panel) panel.innerHTML = `<button class="mic-button recording" disabled aria-label="Requesting microphone"><span class="jp">…</span></button><div class="speech-capture-copy"><strong>Connecting to microphone…</strong><p>Windows may ask you to allow microphone access.</p></div>`;

    if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
      speechCapture = null;
      renderMicrophoneError(panel, target, targetReading, exerciseId, 'unsupported');
      return;
    }

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true, channelCount: 1 },
        video: false
      });
    } catch (error) {
      if (speechCapture === request) speechCapture = null;
      renderMicrophoneError(panel, target, targetReading, exerciseId, error);
      return;
    }

    if (speechCapture !== request) {
      stream.getTracks().forEach((track) => track.stop());
      return;
    }

    const audioTrack = stream.getAudioTracks()[0];
    if (!audioTrack) {
      stream.getTracks().forEach((track) => track.stop());
      speechCapture = null;
      renderMicrophoneError(panel, target, targetReading, exerciseId, 'audio-capture');
      return;
    }

    request.pending = false;
    request.stream = stream;
    request.startedAt = Date.now();
    const mimeType = ['audio/webm;codecs=opus', 'audio/webm'].find((type) => MediaRecorder.isTypeSupported?.(type));
    try {
      request.recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
    } catch (error) {
      releaseSpeechHardware(request);
      speechCapture = null;
      renderMicrophoneError(panel, target, targetReading, exerciseId, error);
      return;
    }

    request.recorder.addEventListener('dataavailable', (event) => {
      if (event.data?.size) request.chunks.push(event.data);
    });
    request.recorder.addEventListener('error', (event) => {
      request.recognitionError = event.error?.name || 'capture-error';
      finishSpeechCapture();
    });
    request.recorder.addEventListener('stop', () => {
      releaseSpeechHardware(request);
      if (!request.discarded) setTimeout(() => renderSpeechCaptureResult(request), 300);
    }, { once: true });

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      try {
        request.audioContext = new AudioContextClass();
        await request.audioContext.resume();
        const source = request.audioContext.createMediaStreamSource(stream);
        const analyser = request.audioContext.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const levels = new Uint8Array(analyser.fftSize);
        const updateMeter = () => {
          if (speechCapture !== request || request.finishing || request.discarded) return;
          analyser.getByteTimeDomainData(levels);
          const rms = Math.sqrt(levels.reduce((sum, value) => sum + ((value - 128) / 128) ** 2, 0) / levels.length);
          request.peakLevel = Math.max(request.peakLevel, rms);
          const meter = $('#micLevel');
          if (meter) meter.style.width = `${Math.min(100, Math.round(rms * 650))}%`;
          request.meterFrame = requestAnimationFrame(updateMeter);
        };
        request.meterFrame = requestAnimationFrame(updateMeter);
      } catch {
        request.audioContext = null;
      }
    }

    if (speechCapture !== request || request.discarded) {
      releaseSpeechHardware(request);
      return;
    }
    const livePanel = $('#micPanel');
    if (livePanel) livePanel.innerHTML = `<button class="mic-button recording" data-action="stop-speech" aria-label="Stop recording"><span aria-hidden="true">■</span></button><div class="speech-capture-copy"><strong>Listening…</strong><p><span id="speechRecognitionStatus">Microphone connected. Speak the sentence naturally.</span> <b id="speechCountdown">10s</b></p><div class="mic-level" aria-label="Live microphone input level"><i id="micLevel"></i></div></div>`;

    try {
      request.recorder.start(250);
    } catch (error) {
      releaseSpeechHardware(request);
      speechCapture = null;
      renderMicrophoneError(livePanel, target, targetReading, exerciseId, error);
      return;
    }
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (Recognition) {
      try {
        const recognizer = new Recognition();
        recognition = recognizer;
        recognizer.lang = 'ja-JP';
        recognizer.interimResults = false;
        recognizer.maxAlternatives = 3;
        recognizer.onresult = (event) => {
          const result = event.results[event.results.length - 1];
          const alternatives = Array.from(result || []).map((alternative) => {
            const writtenScore = phraseSimilarity(target, alternative.transcript);
            const readingScore = targetReading ? phraseSimilarity(targetReading, alternative.transcript) : 0;
            return { transcript: alternative.transcript, score: Math.max(writtenScore, readingScore) };
          }).sort((left, right) => right.score - left.score);
          if (alternatives[0]) {
            request.transcript = alternatives[0].transcript;
            request.score = alternatives[0].score;
            setTimeout(() => { if (speechCapture === request) finishSpeechCapture(); }, 150);
          }
        };
        recognizer.onerror = (event) => {
          if (event.error === 'aborted' && (request.finishing || request.discarded)) return;
          request.recognitionError = event.error || 'unavailable';
          const status = $('#speechRecognitionStatus');
          if (status) status.textContent = `${microphoneErrorDetails(request.recognitionError).title}. Your local recording is still running.`;
        };
        recognizer.onend = () => { if (recognition === recognizer) recognition = null; };
        recognizer.start();
      } catch (error) {
        request.recognitionError = error?.name || 'unavailable';
      }
    } else {
      request.recognitionError = 'unavailable';
      const status = $('#speechRecognitionStatus');
      if (status) status.textContent = 'Microphone connected. Automatic transcription is unavailable, but your voice will be recorded for replay.';
    }

    request.stopTimer = setTimeout(finishSpeechCapture, 10000);
    request.countdownTimer = setInterval(() => {
      const remaining = Math.max(0, 10 - Math.floor((Date.now() - request.startedAt) / 1000));
      const countdown = $('#speechCountdown');
      if (countdown) countdown.textContent = `${remaining}s`;
    }, 250);
  }

  function normalizedSpeechText(value) {
    const normalized = String(value || '').normalize('NFKC').toLocaleLowerCase().replace(/[\s。、！？!?「」『』（）()，,.・:：;；〜～ー]/g, '');
    return JAPANESE?.toHiragana?.(normalized) || normalized;
  }

  function phraseSimilarity(target, actual) {
    const a = normalizedSpeechText(target);
    const b = normalizedSpeechText(actual);
    if (!a.length && !b.length) return 100;
    const rows = Array.from({ length: a.length + 1 }, (_, index) => [index]);
    rows[0] = Array.from({ length: b.length + 1 }, (_, index) => index);
    for (let i = 1; i <= a.length; i += 1) {
      for (let j = 1; j <= b.length; j += 1) {
        rows[i][j] = Math.min(rows[i - 1][j] + 1, rows[i][j - 1] + 1, rows[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
      }
    }
    return Math.round((1 - rows[a.length][b.length] / Math.max(a.length, b.length, 1)) * 100);
  }

  function setupWritingCanvas() {
    const canvas = $('#writingCanvas');
    const target = currentWritingTarget();
    if (!canvas || !target) return;
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.max(1, Math.round(rect.width * ratio));
    canvas.height = Math.max(1, Math.round(rect.height * ratio));
    const context = canvas.getContext('2d');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, rect.width, rect.height);
    context.strokeStyle = 'rgba(55, 48, 55, .16)';
    context.lineWidth = 1;
    context.setLineDash([7, 7]);
    const cellWidth = rect.width / target.glyphs.length;
    target.glyphs.forEach((_, index) => {
      const left = cellWidth * index;
      context.beginPath();
      context.moveTo(left + cellWidth / 2, 0); context.lineTo(left + cellWidth / 2, rect.height);
      context.moveTo(left, rect.height / 2); context.lineTo(left + cellWidth, rect.height / 2);
      context.stroke();
      if (index > 0) {
        context.setLineDash([]);
        context.beginPath();
        context.moveTo(left, 0); context.lineTo(left, rect.height);
        context.stroke();
        context.setLineDash([7, 7]);
      }
    });
    context.setLineDash([]);

    const metrics = { points: 0, strokes: 0, minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    let drawing = false;
    let previous = null;
    const point = (event) => {
      const box = canvas.getBoundingClientRect();
      return { x: event.clientX - box.left, y: event.clientY - box.top };
    };
    const start = (event) => {
      event.preventDefault();
      drawing = true;
      metrics.strokes += 1;
      previous = point(event);
      metrics.minX = Math.min(metrics.minX, previous.x);
      metrics.minY = Math.min(metrics.minY, previous.y);
      metrics.maxX = Math.max(metrics.maxX, previous.x);
      metrics.maxY = Math.max(metrics.maxY, previous.y);
      canvas.setPointerCapture(event.pointerId);
    };
    const move = (event) => {
      if (!drawing) return;
      event.preventDefault();
      const next = point(event);
      context.strokeStyle = ui.inkColor;
      context.lineWidth = Math.max(6, Math.min(cellWidth, rect.height) * .027);
      context.lineCap = 'round';
      context.lineJoin = 'round';
      context.beginPath();
      context.moveTo(previous.x, previous.y);
      context.lineTo(next.x, next.y);
      context.stroke();
      metrics.points += 1;
      metrics.minX = Math.min(metrics.minX, next.x);
      metrics.minY = Math.min(metrics.minY, next.y);
      metrics.maxX = Math.max(metrics.maxX, next.x);
      metrics.maxY = Math.max(metrics.maxY, next.y);
      previous = next;
    };
    const end = () => { drawing = false; previous = null; };
    canvas.addEventListener('pointerdown', start);
    canvas.addEventListener('pointermove', move);
    canvas.addEventListener('pointerup', end);
    canvas.addEventListener('pointercancel', end);
    canvasController = { canvas, metrics, clear: setupWritingCanvas, startedAt: Date.now(), recorded: false, targetKey: target.key, targetMode: target.mode };
  }

  function checkWriting() {
    const target = currentWritingTarget();
    if (!target || !canvasController || canvasController.targetKey !== target.key || canvasController.targetMode !== target.mode || canvasController.metrics.points < 12) {
      showToast('Add a few complete strokes before checking.', 'info');
      return;
    }
    const { metrics, canvas } = canvasController;
    const rect = canvas.getBoundingClientRect();
    const width = metrics.maxX - metrics.minX;
    const height = metrics.maxY - metrics.minY;
    const coverage = (width * height) / (rect.width * rect.height);
    const centered = Math.abs((metrics.minX + metrics.maxX) / 2 - rect.width / 2) < rect.width * .22;
    const strokeInfo = writingStrokeData(target);
    const expectedStrokes = strokeInfo.complete ? strokeInfo.total : 0;
    const strokeDifference = Math.abs(metrics.strokes - expectedStrokes);
    const targetLabel = target.mode === 'words' ? `the word ${target.text}` : target.text;
    let message = `Good start—use more of the guide area and keep ${targetLabel} centered.`;
    if (expectedStrokes && strokeDifference > Math.max(1, Math.floor(expectedStrokes * .2))) message = `You used ${metrics.strokes} pen-down strokes; ${targetLabel} uses ${expectedStrokes}. Follow the numbered guide and lift between strokes.`;
    else if (coverage > .2 && coverage < .9 && centered && metrics.points > 35) message = `Balanced placement across ${target.glyphs.length} guide ${target.glyphs.length === 1 ? 'cell' : 'cells'}. Compare each movement with the model once more.`;
    else if (coverage >= .9) message = 'Your writing reaches the edges. Try a little more breathing room.';
    else if (!centered) message = `Nice effort. Center ${target.mode === 'words' ? 'the complete word' : 'the character'} on the guide.`;
    const collection = target.mode === 'words' ? state.practicedWords : state.practicedWriting;
    if (!collection.includes(target.key)) collection.push(target.key);
    if (!canvasController.recorded) {
      canvasController.recorded = true;
      recordSession({ seconds: Math.max(30, Math.round((Date.now() - canvasController.startedAt) / 1000)) });
    }
    queueSave();
    showToast(message, 'success');
  }

  async function exportProgress() {
    try {
      const result = await desktop.exportProgress(state);
      if (!result.canceled) showToast('Progress backup exported.', 'success');
    } catch (error) {
      console.error(error);
      showToast('The progress backup could not be exported.', 'error');
    }
  }

  async function importProgress() {
    try {
      const result = await desktop.importProgress();
      if (result.canceled) return;
      if (result.error) {
        showToast(result.error, 'error');
        return;
      }
      state = normalizeState(result.value);
      ui.vocabLevel = state.selectedLevel;
      ui.grammarLevel = state.selectedLevel;
      ui.practiceLength = state.defaultPracticeLength;
      applyPreferences();
      closeModal({ force: true });
      renderAll();
      showToast('Progress imported successfully.', 'success');
    } catch (error) {
      console.error(error);
      showToast('The progress file could not be imported.', 'error');
    }
  }

  function changeView(view) {
    if (!validViews.includes(view)) return;
    cancelSpeechCapture();
    if (view !== 'sentence-builder' && ui.sentenceBusy) {
      ui.sentenceRequestId += 1;
      ui.sentenceBusy = false;
    }
    if (view !== 'writing') {
      clearInterval(strokeTimer);
      strokeTimer = null;
    }
    state.activeView = view;
    $('.sidebar')?.classList.remove('open');
    queueSave();
    renderAll();
    $('#mainContent')?.focus({ preventScroll: true });
  }

  function handleClick(event) {
    const target = event.target.closest('button, [data-action], [data-view], [data-level]');
    if (!target) return;
    const { action } = target.dataset;

    if (target.dataset.view && !action) {
      changeView(target.dataset.view);
      return;
    }
    if (target.dataset.level && !action) {
      cancelSpeechCapture();
      clearInterval(strokeTimer);
      strokeTimer = null;
      state.selectedLevel = target.dataset.level;
      ui.vocabLevel = state.selectedLevel;
      ui.grammarLevel = state.selectedLevel;
      ui.vocabPage = 1;
      ui.grammarPage = 1;
      ui.kanjiPage = 1;
      ui.writingPage = 1;
      ui.strokeStep = 1;
      ui.writingChar = DATA.kanji.find((entry) => entry.level === state.selectedLevel)?.char || '日';
      ui.writingWordId = null;
      ui.speakingExerciseId = null;
      ui.speakingPage = 1;
      ui.selectedKanji = null;
      queueSave();
      renderAll({ preserveScroll: state.activeView === 'learn' ? false : true });
      return;
    }

    switch (action) {
      case 'toggle-sidebar': $('.sidebar')?.classList.toggle('open'); break;
      case 'settings': cancelSpeechCapture(); renderSettings(); break;
      case 'build-sentence': buildSentenceExercise(); break;
      case 'sentence-example':
        if (!ui.sentenceBusy) {
          ui.sentenceText = target.dataset.sentence || '';
          ui.sentenceError = '';
          renderAll({ preserveScroll: true });
          setTimeout(() => $('#sentenceText')?.focus(), 0);
        }
        break;
      case 'close-modal': closeModal(); break;
      case 'start-lesson': {
        const lesson = findLesson(target.dataset.lesson);
        if (!lesson) break;
        const focus = lesson.type === 'vocabulary' ? 'vocabulary' : lesson.type === 'grammar' ? 'grammar' : lesson.type === 'immersion' ? 'listening' : 'mixed';
        startPractice({ title: lesson.title, level: lesson.level, focus, lessonId: lesson.id });
        break;
      }
      case 'locked-lesson': showToast('Complete the previous skill to unlock this lesson.', 'info'); break;
      case 'practice-level':
        cancelSpeechCapture();
        state.selectedLevel = target.dataset.level;
        ui.vocabLevel = state.selectedLevel;
        ui.grammarLevel = state.selectedLevel;
        ui.vocabPage = 1;
        ui.grammarPage = 1;
        ui.kanjiPage = 1;
        ui.writingPage = 1;
        ui.writingChar = DATA.kanji.find((entry) => entry.level === state.selectedLevel)?.char || '日';
        ui.writingWordId = null;
        ui.speakingExerciseId = null;
        ui.speakingPage = 1;
        queueSave();
        renderAll({ preserveScroll: true });
        break;
      case 'practice-focus': ui.practiceFocus = target.dataset.focus; renderAll({ preserveScroll: true }); break;
      case 'practice-length': ui.practiceLength = Number(target.dataset.length); renderAll({ preserveScroll: true }); break;
      case 'start-custom-session': {
        const labels = { mixed: 'mixed review', kanji: 'kanji', vocabulary: 'vocabulary', verbs: 'verbs', conjugation: 'verb conjugation', nouns: 'nouns', adjectives: 'adjectives', grammar: 'grammar', particles: 'particles in sentences', reading: 'sentence reading', listening: 'listening', kana: 'kana' };
        startPractice({ title: `${state.selectedLevel} ${labels[ui.practiceFocus]} · ${ui.practiceLength} questions`, focus: ui.practiceFocus, length: ui.practiceLength });
        break;
      }
      case 'start-review': startPractice({ title: `${state.selectedLevel} ${target.dataset.focus === 'mixed' ? 'smart review' : target.dataset.focus}`, focus: target.dataset.focus || 'mixed' }); break;
      case 'start-exam': startExam(target.dataset.mode || 'full'); break;
      case 'retry-mistake': {
        const mistake = state.mistakes[Number(target.dataset.index)];
        if (!mistake) break;
        if (mistake.kind === 'ordering') {
          try {
            const question = createOrderingQuestion(mistake.translation || mistake.prompt, mistake.sentence || mistake.answer, mistake.provider || 'MyMemory');
            startPractice({ title: 'Sentence order retry', level: mistake.level, questions: [question] });
          } catch (error) {
            showToast(error?.message || 'That sentence could not be rebuilt.', 'error');
          }
          break;
        }
        const alternatives = DATA.vocabulary.filter((entry) => entry.level === mistake.level).map((entry) => entry.meaning);
        startPractice({ title: 'Mistake retry', level: mistake.level, questions: [{ kind: 'choice', label: 'Mistake review', prompt: 'Choose the correct answer.', display: escapeHtml(mistake.prompt), choices: choiceSet(mistake.answer, alternatives), answer: mistake.answer, explanation: 'Recall the correction, then explain why it fits.', memoryPrompt: mistake.prompt }] });
        break;
      }
      case 'kana-script': ui.kanaScript = target.dataset.script; renderAll({ preserveScroll: true }); break;
      case 'kana-set': ui.kanaSet = target.dataset.set; ui.selectedKana = currentKanaItems()[0].romaji; renderAll({ preserveScroll: true }); break;
      case 'select-kana': ui.selectedKana = target.dataset.romaji; renderAll({ preserveScroll: true }); break;
      case 'master-kana': {
        const key = `${ui.kanaScript}:${target.dataset.romaji}`;
        if (state.masteredKana.includes(key)) state.masteredKana = state.masteredKana.filter((item) => item !== key);
        else state.masteredKana.push(key);
        queueSave(); renderAll({ preserveScroll: true }); break;
      }
      case 'start-kana-drill': startPractice({ title: `${ui.kanaScript} speed drill`, focus: 'kana' }); break;
      case 'speak': speakText(target.dataset.speech); break;
      case 'speak-slow': speakText(target.dataset.speech, true); break;
      case 'word-detail': renderWordDetail(target.dataset.word); break;
      case 'vocab-page':
        ui.vocabPage = Number(target.dataset.page);
        refreshVocabularyList();
        $('#mainContent').scrollTo({ top: 250, behavior: 'smooth' });
        break;
      case 'favorite-word': {
        const id = target.dataset.word;
        state.favoriteWords = state.favoriteWords.includes(id) ? state.favoriteWords.filter((item) => item !== id) : [...state.favoriteWords, id];
        queueSave(); refreshVocabularyList(); break;
      }
      case 'know-word': {
        const id = target.dataset.word;
        if (state.knownWords.includes(id)) state.knownWords = state.knownWords.filter((item) => item !== id);
        else { state.knownWords.push(id); ensureDaily(); state.daily.words += 1; }
        queueSave(); refreshVocabularyList(); renderRightRail(); break;
      }
      case 'grammar-level': ui.grammarLevel = target.dataset.level; ui.grammarTag = 'All'; ui.grammarPage = 1; ui.openGrammar = null; renderAll({ preserveScroll: true }); break;
      case 'toggle-grammar': ui.openGrammar = ui.openGrammar === target.dataset.grammar ? null : target.dataset.grammar; refreshGrammarList(); break;
      case 'grammar-page': ui.grammarPage = Number(target.dataset.page); ui.openGrammar = null; refreshGrammarList(); $('#mainContent').scrollTo({ top: 250, behavior: 'smooth' }); break;
      case 'select-kanji':
      case 'open-kanji': {
        const entry = DATA.kanji.find((candidate) => candidate.id === target.dataset.kanji && candidate.level === state.selectedLevel);
        if (!entry) break;
        const pager = target.closest('.kanji-entry-pager');
        const pagerDirection = pager ? (target === pager.querySelector('.btn:last-child') ? 'next' : 'previous') : '';
        ui.selectedKanji = entry.id;
        renderAll();
        setTimeout(() => {
          const pagerButton = pagerDirection === 'next'
            ? $('.kanji-entry-pager .btn:last-child:not(:disabled)')
            : pagerDirection === 'previous'
              ? $('.kanji-entry-pager .btn:first-child:not(:disabled)')
              : null;
          (pagerButton || $('#kanjiEntryHeading'))?.focus();
        }, 0);
        break;
      }
      case 'kanji-index':
        ui.selectedKanji = null;
        renderAll();
        setTimeout(() => $('#kanjiSearch')?.focus(), 0);
        break;
      case 'kanji-page': ui.kanjiPage = Number(target.dataset.page); ui.selectedKanji = null; refreshKanjiList(); $('#mainContent').scrollTo({ top: 250, behavior: 'smooth' }); break;
      case 'write-kanji': ui.writingMode = 'kanji'; ui.writingChar = target.dataset.char; ui.strokeStep = 1; changeView('writing'); break;
      case 'immersion-tab':
        cancelSpeechCapture();
        ui.immersionTab = target.dataset.tab;
        renderAll({ preserveScroll: true });
        break;
      case 'start-listening-drill': {
        const length = Math.max(10, Number(target.dataset.length) || 10);
        startPractice({ title: `${state.selectedLevel} listening · ${length} different exercises`, level: state.selectedLevel, questions: listeningQuestions(state.selectedLevel, length) });
        break;
      }
      case 'start-listening-item': {
        const questions = listeningQuestions(state.selectedLevel, 1, target.dataset.listening);
        startPractice({ title: `${state.selectedLevel} listening exercise`, level: state.selectedLevel, questions });
        break;
      }
      case 'start-reading-drill': {
        const length = Number(target.dataset.length) || 10;
        startPractice({ title: `${state.selectedLevel} sentence reading · ${length} questions`, level: state.selectedLevel, questions: readingSentenceQuestions(state.selectedLevel, length) });
        break;
      }
      case 'start-reading-item': {
        const questions = readingSentenceQuestions(state.selectedLevel, 1, target.dataset.reading);
        startPractice({ title: `${state.selectedLevel} sentence reading`, level: state.selectedLevel, questions });
        break;
      }
      case 'select-speaking': cancelSpeechCapture(); ui.speakingExerciseId = target.dataset.exercise; renderAll({ preserveScroll: true }); break;
      case 'speaking-page': ui.speakingPage = Number(target.dataset.page); refreshSpeakingLibrary(); break;
      case 'speaking-previous': {
        const bank = speakingExerciseBank(state.selectedLevel);
        const index = bank.findIndex((entry) => entry.id === ui.speakingExerciseId);
        if (index > 0) { cancelSpeechCapture(); ui.speakingExerciseId = bank[index - 1].id; renderAll({ preserveScroll: true }); }
        break;
      }
      case 'speaking-next': {
        const bank = speakingExerciseBank(state.selectedLevel);
        const index = bank.findIndex((entry) => entry.id === ui.speakingExerciseId);
        if (index >= 0 && index < bank.length - 1) { cancelSpeechCapture(); ui.speakingExerciseId = bank[index + 1].id; renderAll({ preserveScroll: true }); }
        break;
      }
      case 'speaking-random': {
        cancelSpeechCapture();
        const bank = speakingExerciseBank(state.selectedLevel);
        ui.speakingExerciseId = bank[Math.floor(Math.random() * bank.length)].id;
        renderAll({ preserveScroll: true });
        break;
      }
      case 'mark-speaking': cancelSpeechCapture(); markSpeakingExercise(target.dataset.exercise); renderAll({ preserveScroll: true }); break;
      case 'play-listening': playListening(target.dataset.listening); break;
      case 'open-reader': openReaderState = { id: target.dataset.reading, translation: false, answer: null, recorded: false }; renderReader(); break;
      case 'toggle-translation': openReaderState.translation = !openReaderState.translation; renderReader(); break;
      case 'reader-answer': {
        const reading = DATA.readings.find((entry) => entry.id === openReaderState.id);
        openReaderState.answer = target.dataset.answer;
        if (target.dataset.answer === reading.answer && !openReaderState.recorded) {
          if (!state.completedReadings.includes(reading.id)) state.completedReadings.push(reading.id);
          openReaderState.recorded = true;
          recordSession({ seconds: reading.minutes * 60, reading: true });
          queueSave();
          showToast('Reading added to your study record.', 'success');
        }
        renderReader(); break;
      }
      case 'record-speech': startSpeechRecognition(target.dataset.target, target.dataset.exercise, target.dataset.reading || ''); break;
      case 'stop-speech': finishSpeechCapture(); break;
      case 'open-microphone-settings': desktop?.openMicrophoneSettings?.(); break;
      case 'writing-mode':
        if (!['kanji', 'words'].includes(target.dataset.mode)) break;
        clearInterval(strokeTimer);
        strokeTimer = null;
        ui.writingMode = target.dataset.mode;
        ui.writingSearch = '';
        ui.writingPage = 1;
        ui.strokeStep = 1;
        renderAll({ preserveScroll: true });
        break;
      case 'writing-char':
        clearInterval(strokeTimer);
        strokeTimer = null;
        ui.writingMode = 'kanji';
        ui.writingChar = target.dataset.char;
        ui.strokeStep = 1;
        renderAll({ preserveScroll: true });
        break;
      case 'writing-word':
        clearInterval(strokeTimer);
        strokeTimer = null;
        ui.writingMode = 'words';
        ui.writingWordId = target.dataset.word;
        ui.strokeStep = 1;
        renderAll({ preserveScroll: true });
        break;
      case 'writing-page': ui.writingPage = Number(target.dataset.page); refreshWritingPicker(); break;
      case 'stroke-previous': setStrokeStep(ui.strokeStep - 1); break;
      case 'stroke-next': setStrokeStep(ui.strokeStep + 1); break;
      case 'stroke-animate': animateStrokeOrder(); break;
      case 'stroke-numbers': ui.strokeNumbers = !ui.strokeNumbers; updateStrokeOrderDisplay(); break;
      case 'ink-color': ui.inkColor = target.dataset.color; $$('.ink-dot').forEach((button) => button.classList.toggle('active', button.dataset.color === ui.inkColor)); break;
      case 'clear-canvas': setupWritingCanvas(); break;
      case 'check-writing': checkWriting(); break;
      case 'guide-level': state.selectedLevel = target.dataset.level; ui.vocabLevel = state.selectedLevel; ui.grammarLevel = state.selectedLevel; changeView('learn'); break;
      case 'exam-answer':
        if (setExamAnswerState(examSession, target.dataset.answer)) renderExamModal();
        break;
      case 'exam-jump': if (examSession) { examSession.index = Number(target.dataset.index); renderExamModal(); } break;
      case 'exam-previous': if (examSession && examSession.index > 0) { examSession.index -= 1; renderExamModal(); } break;
      case 'exam-next': if (examSession && examSession.index < examSession.questions.length - 1) { examSession.index += 1; renderExamModal(); } break;
      case 'exam-flag':
        if (examSession) {
          examSession.flagged = examSession.flagged.includes(examSession.index) ? examSession.flagged.filter((index) => index !== examSession.index) : [...examSession.flagged, examSession.index];
          renderExamModal();
        }
        break;
      case 'exam-audio': if (examSession) speakText(examSession.questions[examSession.index].speech); break;
      case 'exam-skip-audio': {
        const change = toggleExamAudioSkipState(examSession);
        if (change.changed) {
          if (change.skipped) stopAudio();
          renderExamModal();
        }
        break;
      }
      case 'submit-exam': submitExam(false); break;
      case 'finish-exam': closeModal({ force: true }); renderAll(); break;
      case 'retry-exam': startExam(target.dataset.mode || 'full'); break;
      case 'order-token-add': {
        if (!practiceSession || practiceSession.checked) break;
        const question = practiceSession.questions[practiceSession.index];
        const tokenId = target.dataset.tokenId;
        if (question.kind !== 'ordering' || !question.tokens.some((token) => token.id === tokenId) || practiceSession.orderedTokenIds.includes(tokenId)) break;
        practiceSession.orderedTokenIds.push(tokenId);
        practiceSession.selected = orderingAnswer(question, practiceSession.orderedTokenIds);
        renderPracticeModal({ focusTokenId: tokenId });
        break;
      }
      case 'order-token-remove': {
        if (!practiceSession || practiceSession.checked) break;
        const question = practiceSession.questions[practiceSession.index];
        if (question.kind !== 'ordering') break;
        practiceSession.orderedTokenIds = practiceSession.orderedTokenIds.filter((id) => id !== target.dataset.tokenId);
        practiceSession.selected = orderingAnswer(question, practiceSession.orderedTokenIds);
        renderPracticeModal({ focusTokenId: target.dataset.tokenId });
        break;
      }
      case 'order-clear':
        if (practiceSession && !practiceSession.checked) {
          const question = practiceSession.questions[practiceSession.index];
          practiceSession.orderedTokenIds = [];
          practiceSession.selected = '';
          renderPracticeModal({ focusTokenId: question.shuffledTokenIds?.[0] || null });
        }
        break;
      case 'select-answer': if (practiceSession && !practiceSession.checked) { practiceSession.selected = target.dataset.answer; renderPracticeModal(); } break;
      case 'practice-audio': speakText(practiceSession.questions[practiceSession.index].speech); break;
      case 'skip-practice-audio': skipPracticeAudioQuestion(); break;
      case 'check-answer': checkPracticeAnswer(); break;
      case 'next-question': nextPracticeQuestion(); break;
      case 'finish-practice': closeModal({ force: true }); renderAll(); break;
      case 'onboard-level': state.selectedLevel = target.dataset.level; ui.vocabLevel = state.selectedLevel; ui.grammarLevel = state.selectedLevel; renderOnboarding(); break;
      case 'onboard-length': state.defaultPracticeLength = Number(target.dataset.length); ui.practiceLength = state.defaultPracticeLength; renderOnboarding(); break;
      case 'finish-onboarding': state.onboarded = true; queueSave(); closeModal({ force: true }); renderAll(); showToast('Your study library is ready.', 'success'); break;
      case 'toggle-motion': state.settings.reduceMotion = !state.settings.reduceMotion; applyPreferences(); queueSave(); renderSettings(); break;
      case 'export-progress': exportProgress(); break;
      case 'import-progress': importProgress(); break;
      case 'reset-progress': {
        if (window.confirm('Reset all lesson progress, study records, collections, and test results? This cannot be undone unless you exported a backup.')) {
          const selectedLevel = state.selectedLevel;
          state = structuredClone(DEFAULT_STATE);
          state.onboarded = true;
          state.selectedLevel = selectedLevel;
          ensureDaily();
          applyPreferences();
          queueSave();
          renderAll();
          showToast('Learning progress reset.', 'info');
        }
        break;
      }
      default: break;
    }
  }

  function handleInput(event) {
    if (event.target.id === 'sentenceText') {
      ui.sentenceText = event.target.value;
      ui.sentenceError = '';
      const byteLength = sentenceSourceBytes();
      const counter = $('.sentence-textarea-label span');
      if (counter) {
        counter.textContent = `${byteLength}/500 bytes`;
        counter.classList.toggle('over-limit', byteLength > 500);
      }
      const submit = $('.sentence-submit');
      if (submit) submit.disabled = !sentenceSourceValue() || byteLength > 500;
      $('.sentence-error')?.remove();
    }
    if (event.target.id === 'vocabSearch') {
      ui.vocabSearch = event.target.value;
      ui.vocabPage = 1;
      refreshVocabularyList();
    }
    if (event.target.id === 'grammarSearch') {
      ui.grammarSearch = event.target.value;
      ui.grammarPage = 1;
      refreshGrammarList();
    }
    if (event.target.id === 'kanjiSearch') {
      ui.kanjiSearch = event.target.value;
      ui.kanjiPage = 1;
      ui.selectedKanji = null;
      refreshKanjiList();
    }
    if (event.target.id === 'speakingSearch') {
      ui.speakingSearch = event.target.value;
      ui.speakingPage = 1;
      refreshSpeakingLibrary();
    }
    if (event.target.id === 'writingSearch') {
      ui.writingSearch = event.target.value;
      ui.writingPage = 1;
      refreshWritingPicker();
    }
    if (event.target.id === 'speechRate') {
      state.settings.speechRate = Number(event.target.value);
      queueSave();
    }
  }

  function handleChange(event) {
    if (event.target.id === 'sentenceLanguage') { ui.sentenceLanguage = event.target.value; ui.sentenceError = ''; $('.sentence-error')?.remove(); }
    if (event.target.id === 'vocabLevel') { ui.vocabLevel = event.target.value; ui.vocabPage = 1; refreshVocabularyList(); }
    if (event.target.id === 'vocabCategory') { ui.vocabCategory = event.target.value; ui.vocabPage = 1; refreshVocabularyList(); }
    if (event.target.id === 'grammarTag') { ui.grammarTag = event.target.value; ui.grammarPage = 1; ui.openGrammar = null; refreshGrammarList(); }
    if (event.target.id === 'settingPracticeLength') { state.defaultPracticeLength = Number(event.target.value); ui.practiceLength = state.defaultPracticeLength; queueSave(); }
  }

  function handleKeydown(event) {
    if (event.target.id === 'sentenceText' && event.ctrlKey && event.key === 'Enter') {
      event.preventDefault();
      if (!ui.sentenceBusy) buildSentenceExercise();
      return;
    }
    const modalLayer = $('#modalLayer');
    if (event.key === 'Tab' && !modalLayer.classList.contains('hidden')) {
      const focusable = $$('button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex="0"]', modalLayer);
      if (focusable.length) {
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!modalLayer.contains(document.activeElement) || (!event.shiftKey && document.activeElement === last)) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        }
      }
    }
    if (event.key === 'Escape' && !modalLayer.classList.contains('hidden')) {
      closeModal();
      return;
    }
    if (examSession && !examSession.result) {
      const question = examSession.questions[examSession.index];
      if (/^[1-4]$/.test(event.key)) {
        const answer = question.choices[Number(event.key) - 1];
        if (setExamAnswerState(examSession, answer)) renderExamModal();
      } else if (event.key === 'ArrowRight' && examSession.index < examSession.questions.length - 1) {
        examSession.index += 1;
        renderExamModal();
      } else if (event.key === 'ArrowLeft' && examSession.index > 0) {
        examSession.index -= 1;
        renderExamModal();
      }
      return;
    }
    if (!practiceSession || practiceSession.finished) return;
    const question = practiceSession.questions[practiceSession.index];
    if (event.target.closest?.('button, select, textarea, a, .dictionary-word') || event.target.matches?.('input:not(#typeAnswer)')) return;
    if (!practiceSession.checked && /^[1-4]$/.test(event.key) && question.choices) {
      const answer = question.choices[Number(event.key) - 1];
      if (answer != null) { practiceSession.selected = answer; renderPracticeModal(); }
    }
    if (event.key === 'Enter') {
      if (practiceSession.checked) nextPracticeQuestion();
      else checkPracticeAnswer();
    }
  }

  async function init() {
    try {
      const [saved, version] = await Promise.all([desktop?.loadProgress?.(), desktop?.getVersion?.()]);
      state = normalizeState(saved);
      if (version) appVersion = version;
    } catch (error) {
      console.error('Startup data could not be loaded:', error);
      state = normalizeState(null);
    }

    stateHydrated = true;
    ui.vocabLevel = state.selectedLevel;
    ui.grammarLevel = state.selectedLevel;
    ui.practiceLength = state.defaultPracticeLength;
    applyPreferences();
    renderAll();
    $('#appShell').classList.remove('is-loading');
    if (!state.onboarded) setTimeout(renderOnboarding, 180);
  }

  document.addEventListener('click', handleClick);
  document.addEventListener('input', handleInput);
  document.addEventListener('change', handleChange);
  document.addEventListener('keydown', handleKeydown);
  desktop?.onBeforeClose?.(async () => {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!stateHydrated) return;
    await desktop.saveProgress(state);
  });
  window.addEventListener('beforeunload', () => {
    cancelSpeechCapture();
    clearTimeout(saveTimer);
    saveTimer = null;
  });
  window.addEventListener('resize', () => {
    if (state.activeView === 'writing') setupWritingCanvas();
  });

  init();
})();
