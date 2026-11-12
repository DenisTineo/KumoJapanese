(() => {
  'use strict';

  const DATA = window.KUMO_DATA || { vocabulary: [], kanji: [] };
  const CONJUGATOR = window.KUMO_CONJUGATOR;
  const HAN = /\p{Script=Han}/u;
  const KANA = /[\p{Script=Hiragana}\p{Script=Katakana}ー]/u;
  const VALID_READING = /^[\p{Script=Hiragana}\p{Script=Katakana}ー・･\s]+$/u;
  const WRITING_TEXT = /^[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}々ヶー]+$/u;
  const ANNOTATION = /\{([^|{}]+)\|([^{}]*)\}/gu;
  const LEVEL_RANK = { N5: 1, N4: 2, N3: 3, N2: 4, N1: 5 };
  const SUPPLEMENTAL_READINGS = Object.freeze({
    鵞鳥: 'がちょう',
    襷: 'たすき',
    家々: 'いえいえ',
    人々: 'ひとびと',
    物々: 'ぶつぶつ',
    騒々し: 'そうぞうし',
    逢瀬: 'おうせ',
    琥珀: 'こはく',
    蓼: 'たで',
    篇: 'へん',
    灌漑: 'かんがい',
    小笠原: 'おがさわら',
    芭蕉: 'ばしょう',
    凧: 'たこ',
    閃き: 'ひらめき',
    姑: 'しゅうとめ',
    信憑性: 'しんぴょうせい',
    棟梁: 'とうりょう',
    黴: 'かび',
    羹: 'あつもの',
    膾: 'なます',
    倅: 'せがれ',
    侃々諤々: 'かんかんがくがく',
    梱包: 'こんぽう',
    一目惚れ: 'ひとめぼれ',
    砦: 'とりで',
    鉾: 'ほこ'
  });

  const escapeHtml = (value) => String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

  const symbolAt = (text, index) => String.fromCodePoint(text.codePointAt(index));
  const nextIndex = (text, index) => index + symbolAt(text, index).length;
  const hasKanji = (value) => HAN.test(String(value || ''));
  const isKana = (value) => KANA.test(String(value || ''));
  const isValidReading = (value) => Boolean(value && VALID_READING.test(String(value)));

  function toHiragana(value) {
    return Array.from(String(value || ''), (character) => {
      const code = character.codePointAt(0);
      return code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : character;
    }).join('');
  }

  function plainText(annotation) {
    return String(annotation || '').replace(ANNOTATION, '$1').replace(/[{}]/g, '');
  }

  function cleanGrammarPattern(pattern) {
    return String(pattern || '')
      .replace(/[（(][^（）()]*[A-Za-z][^（）()]*[）)]/gu, '')
      .replace(/\s{2,}/g, ' ')
      .trim();
  }

  function writingGlyphs(value) {
    const text = String(value || '').trim();
    if (!text || !WRITING_TEXT.test(text)) return [];
    return Array.from(text);
  }

  const kanjiByCharacter = new Map((DATA.kanji || []).map((entry) => [entry.char, entry]));
  const derivedReadings = new Map();
  let indexes = null;
  let buildingIndexes = false;

  function rememberDerivedReading(form, reading) {
    if (!hasKanji(form) || !isValidReading(reading)) return;
    const baseCharacters = Array.from(form);
    const readingCharacters = Array.from(reading);
    let prefix = 0;
    while (prefix < baseCharacters.length && prefix < readingCharacters.length && isKana(baseCharacters[prefix]) && toHiragana(baseCharacters[prefix]) === toHiragana(readingCharacters[prefix])) prefix += 1;
    let suffix = 0;
    while (suffix < baseCharacters.length - prefix && suffix < readingCharacters.length - prefix && isKana(baseCharacters[baseCharacters.length - 1 - suffix]) && toHiragana(baseCharacters[baseCharacters.length - 1 - suffix]) === toHiragana(readingCharacters[readingCharacters.length - 1 - suffix])) suffix += 1;
    const baseEnd = suffix ? baseCharacters.length - suffix : baseCharacters.length;
    const readingEnd = suffix ? readingCharacters.length - suffix : readingCharacters.length;
    const middleBase = baseCharacters.slice(prefix, baseEnd);
    const middleReading = readingCharacters.slice(prefix, readingEnd).join('');
    if (middleBase.length !== 1 || !hasKanji(middleBase[0]) || !isValidReading(middleReading)) return;
    if (!derivedReadings.has(middleBase[0])) derivedReadings.set(middleBase[0], new Map());
    const counts = derivedReadings.get(middleBase[0]);
    counts.set(middleReading, (counts.get(middleReading) || 0) + 1);
  }

  function bestDerivedReading(character) {
    const counts = derivedReadings.get(character);
    if (!counts) return '';
    return [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].length - right[0].length)[0]?.[0] || '';
  }

  function firstSymbol(value) {
    return Array.from(String(value || ''))[0] || '';
  }

  function addIndexed(map, candidate) {
    if (!candidate.form || !candidate.reading || !hasKanji(candidate.form) || !isValidReading(candidate.reading)) return;
    const key = firstSymbol(candidate.form);
    if (!map.has(key)) map.set(key, []);
    const bucket = map.get(key);
    const duplicate = bucket.some((item) => item.form === candidate.form && item.reading === candidate.reading && item.entry?.id === candidate.entry?.id);
    if (!duplicate) bucket.push(candidate);
  }

  function buildIndexes() {
    if (indexes) return indexes;
    buildingIndexes = true;
    const reading = new Map();
    const dictionary = new Map();

    for (const entry of DATA.vocabulary || []) {
      const forms = [entry.word, ...(entry.otherForms || [])].filter(Boolean);
      forms.forEach((form) => {
        const candidate = { form, reading: entry.reading, entry, rank: 3 };
        addIndexed(reading, candidate);
        rememberDerivedReading(form, entry.reading);
        const key = firstSymbol(form);
        if (!dictionary.has(key)) dictionary.set(key, []);
        if (!dictionary.get(key).some((item) => item.form === form && item.entry.id === entry.id)) dictionary.get(key).push(candidate);
      });

      const conjugation = CONJUGATOR?.conjugate?.(entry);
      if (conjugation?.forms) {
        Object.values(conjugation.forms).forEach((form) => {
          const candidate = { form: form.value, reading: form.reading, entry, rank: 4 };
          addIndexed(reading, candidate);
          rememberDerivedReading(form.value, form.reading);
          const key = firstSymbol(form.value);
          if (!dictionary.has(key)) dictionary.set(key, []);
          if (!dictionary.get(key).some((item) => item.form === form.value && item.entry.id === entry.id)) dictionary.get(key).push(candidate);
        });
      }
    }

    for (const kanji of DATA.kanji || []) {
      for (const [form, readingValue] of kanji.words || []) {
        addIndexed(reading, { form, reading: readingValue, entry: null, rank: 2 });
        rememberDerivedReading(form, readingValue);
      }
    }

    for (const [form, readingValue] of Object.entries(SUPPLEMENTAL_READINGS)) {
      addIndexed(reading, { form, reading: readingValue, entry: null, rank: 6 });
      rememberDerivedReading(form, readingValue);
    }

    const annotatedSources = [
      ...(DATA.vocabulary || []).flatMap((entry) => (entry.examples || []).map((example) => example.furigana)),
      ...(DATA.grammar || []).flatMap((entry) => (entry.examples || []).map((example) => example.furigana)),
      ...(DATA.particleExercises || []).map((entry) => entry.furigana)
    ].filter(Boolean);
    for (const source of annotatedSources) {
      for (const match of source.matchAll(/\{([^|{}]+)\|([^{}]*)\}/gu)) {
        if (!isValidReading(match[2])) continue;
        addIndexed(reading, { form: match[1], reading: match[2], entry: null, rank: 5 });
        rememberDerivedReading(match[1], match[2]);
      }
    }

    const sorter = (left, right) => {
      const lengthDifference = Array.from(right.form).length - Array.from(left.form).length;
      if (lengthDifference) return lengthDifference;
      const rankDifference = (right.rank || 0) - (left.rank || 0);
      if (rankDifference) return rankDifference;
      return (LEVEL_RANK[left.entry?.level] || 99) - (LEVEL_RANK[right.entry?.level] || 99);
    };
    reading.forEach((bucket) => bucket.sort(sorter));
    dictionary.forEach((bucket) => bucket.sort(sorter));
    indexes = { reading, dictionary };
    buildingIndexes = false;
    return indexes;
  }

  function parseAnnotations(text, annotation) {
    const source = String(annotation || '');
    if (!source) return [];
    const ranges = [];
    let reconstructed = '';
    let sourceCursor = 0;
    let textCursor = 0;
    for (const match of source.matchAll(ANNOTATION)) {
      const before = source.slice(sourceCursor, match.index);
      reconstructed += before;
      textCursor += before.length;
      const base = match[1];
      reconstructed += base;
      if (hasKanji(base) && isValidReading(match[2])) {
        ranges.push({ start: textCursor, end: textCursor + base.length, reading: match[2] });
      }
      textCursor += base.length;
      sourceCursor = match.index + match[0].length;
    }
    reconstructed += source.slice(sourceCursor);
    return reconstructed === text ? ranges : [];
  }

  function fallbackReading(character) {
    if (!indexes && !buildingIndexes) buildIndexes();
    const entry = kanjiByCharacter.get(character);
    const derived = bestDerivedReading(character);
    if (!entry) return derived || 'よみ';
    const exactWord = (entry.words || []).find(([word]) => word === character)?.[1];
    if (isValidReading(exactWord)) return exactWord;
    if (derived) return derived;
    const kun = (entry.kunyomi || []).find((reading) => reading && reading !== '—');
    if (kun) {
      const cleaned = kun.replaceAll('-', '').split('.')[0];
      if (isValidReading(cleaned)) return toHiragana(cleaned);
    }
    const on = (entry.onyomi || []).find(Boolean);
    if (on && isValidReading(on)) return toHiragana(on);
    return 'よみ';
  }

  function rubyHtml(base, reading) {
    const baseCharacters = Array.from(base);
    const readingCharacters = Array.from(reading);
    let prefix = 0;
    while (
      prefix < baseCharacters.length
      && prefix < readingCharacters.length
      && isKana(baseCharacters[prefix])
      && toHiragana(baseCharacters[prefix]) === toHiragana(readingCharacters[prefix])
    ) prefix += 1;

    let suffix = 0;
    while (
      suffix < baseCharacters.length - prefix
      && suffix < readingCharacters.length - prefix
      && isKana(baseCharacters[baseCharacters.length - 1 - suffix])
      && toHiragana(baseCharacters[baseCharacters.length - 1 - suffix]) === toHiragana(readingCharacters[readingCharacters.length - 1 - suffix])
    ) suffix += 1;

    const leading = baseCharacters.slice(0, prefix).join('');
    const baseEnd = suffix ? baseCharacters.length - suffix : baseCharacters.length;
    const readingEnd = suffix ? readingCharacters.length - suffix : readingCharacters.length;
    const rubyBase = baseCharacters.slice(prefix, baseEnd).join('');
    const rubyReading = readingCharacters.slice(prefix, readingEnd).join('');
    const trailing = suffix ? baseCharacters.slice(baseEnd).join('') : '';
    if (!hasKanji(rubyBase) || !isValidReading(rubyReading)) {
      return Array.from(base, (character) => hasKanji(character)
        ? `<ruby>${escapeHtml(character)}<rt>${escapeHtml(fallbackReading(character))}</rt></ruby>`
        : escapeHtml(character)).join('');
    }
    return `${escapeHtml(leading)}<ruby>${escapeHtml(rubyBase)}<rt>${escapeHtml(rubyReading)}</rt></ruby>${escapeHtml(trailing)}`;
  }

  function readingCandidate(text, index, limit) {
    const bucket = buildIndexes().reading.get(symbolAt(text, index)) || [];
    return bucket.find((candidate) => index + candidate.form.length <= limit && text.startsWith(candidate.form, index)) || null;
  }

  function renderFuriganaRange(text, start, end, annotations) {
    let output = '';
    let cursor = start;
    while (cursor < end) {
      const annotation = annotations.find((range) => range.start === cursor && range.end <= end);
      if (annotation) {
        output += rubyHtml(text.slice(annotation.start, annotation.end), annotation.reading);
        cursor = annotation.end;
        continue;
      }

      const character = symbolAt(text, cursor);
      if (!hasKanji(character)) {
        output += escapeHtml(character);
        cursor = nextIndex(text, cursor);
        continue;
      }

      const nextAnnotation = annotations.find((range) => range.start > cursor && range.start < end);
      const limit = nextAnnotation?.start || end;
      const candidate = readingCandidate(text, cursor, limit);
      if (candidate) {
        output += rubyHtml(candidate.form, candidate.reading);
        cursor += candidate.form.length;
        continue;
      }

      output += `<ruby>${escapeHtml(character)}<rt>${escapeHtml(fallbackReading(character))}</rt></ruby>`;
      cursor = nextIndex(text, cursor);
    }
    return output;
  }

  const WORD_SEGMENTER = typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function'
    ? new Intl.Segmenter('ja', { granularity: 'word' })
    : null;

  function wordBoundaries(text) {
    if (!WORD_SEGMENTER) return null;
    const edges = new Set([0, text.length]);
    for (const part of WORD_SEGMENTER.segment(text)) {
      edges.add(part.index);
      edges.add(part.index + part.segment.length);
    }
    return edges;
  }

  // Chooses dictionary words for the whole phrase at once instead of greedily taking the
  // longest match at each position. Greedy matching let short words swallow the start of
  // the next word (こちら[はあ]なた instead of こちらは[あなた]). Each word earns one point
  // per character, and each edge that cuts through an Intl.Segmenter word costs one point.
  // The segmenter is only a hint (it often splits て-forms oddly), so it breaks near-ties
  // rather than overriding clear dictionary coverage.
  function dictionaryRanges(text, blockedWordIds, blockedForms) {
    const blocked = new Set(blockedWordIds || []);
    const blockedSurfaceForms = new Set(blockedForms || []);
    const edges = wordBoundaries(text);
    const edgePenalty = (start, end) => (edges ? (edges.has(start) ? 0 : 1) + (edges.has(end) ? 0 : 1) : 0);
    const starts = [];
    for (let cursor = 0; cursor < text.length; cursor = nextIndex(text, cursor)) starts.push(cursor);
    const best = new Map([[text.length, { score: 0, count: 0, range: null, next: text.length }]]);
    const better = (left, right) => left.score !== right.score ? left.score > right.score : left.count < right.count;
    for (let index = starts.length - 1; index >= 0; index -= 1) {
      const cursor = starts[index];
      const next = nextIndex(text, cursor);
      const skipped = best.get(next);
      let choice = { score: skipped.score, count: skipped.count, range: null, next };
      for (const item of buildIndexes().dictionary.get(symbolAt(text, cursor)) || []) {
        if (blocked.has(item.entry.id) || blockedSurfaceForms.has(item.form) || !text.startsWith(item.form, cursor)) continue;
        if (Array.from(item.form).length <= 1 && item.form !== text) continue;
        const end = cursor + item.form.length;
        const tail = best.get(end);
        const option = { score: tail.score + item.form.length - edgePenalty(cursor, end), count: tail.count + 1, range: { start: cursor, end, ...item }, next: end };
        // On a full tie the earlier word wins, matching how the phrase is read left to right.
        if (better(option, choice) || (!choice.range && !better(choice, option))) choice = option;
      }
      best.set(cursor, choice);
    }
    const ranges = [];
    for (let cursor = 0; cursor < text.length;) {
      const step = best.get(cursor);
      if (step.range) ranges.push(step.range);
      cursor = step.next;
    }
    return ranges;
  }

  function tooltipHtml(candidate, surfaceHtml) {
    const entry = candidate.entry;
    const meanings = (entry.meanings || [entry.meaning]).filter(Boolean).slice(0, 3);
    const reading = candidate.reading || entry.reading || '';
    const label = `${candidate.form}${reading ? `, ${reading}` : ''}: ${meanings.join('; ')}`;
    return `<span class="dictionary-word" tabindex="0" aria-label="${escapeHtml(label)}"><span class="dictionary-surface">${surfaceHtml}</span><span class="dictionary-tooltip" role="tooltip"><span class="dictionary-heading"><b class="jp">${escapeHtml(candidate.form)}</b>${reading ? `<em class="jp">${escapeHtml(reading)}</em>` : ''}</span><span>${meanings.map(escapeHtml).join(' · ')}</span><small>${escapeHtml((entry.posDescriptions || [entry.partOfSpeech || entry.category]).filter(Boolean).slice(0, 2).join(' · '))}</small></span></span>`;
  }

  function phraseHtml(value, annotation = '', options = {}) {
    const text = String(value || '');
    if (!text) return '';
    const annotations = parseAnnotations(text, annotation);
    const ranges = options.dictionary === false ? [] : dictionaryRanges(text, options.blockedWordIds, options.blockedForms);
    let output = '';
    let cursor = 0;
    for (const range of ranges) {
      if (range.start < cursor) continue;
      output += renderFuriganaRange(text, cursor, range.start, annotations);
      const surface = renderFuriganaRange(text, range.start, range.end, annotations);
      output += tooltipHtml(range, surface);
      cursor = range.end;
    }
    output += renderFuriganaRange(text, cursor, text.length, annotations);
    return output;
  }

  function readingQuestionIsUseful(written, reading) {
    const source = String(written || '').trim();
    const answer = String(reading || '').trim();
    return hasKanji(source) && source !== answer;
  }

  window.KUMO_JAPANESE = Object.freeze({
    annotationRanges: parseAnnotations,
    cleanGrammarPattern,
    hasKanji,
    isValidReading,
    phraseHtml,
    plainText,
    readingQuestionIsUseful,
    toHiragana,
    wordBoundaries,
    writingGlyphs
  });
})();
