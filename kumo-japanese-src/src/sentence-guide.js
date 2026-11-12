(() => {
  'use strict';

  // Builds the "Sentence guide" shown after each practice answer. Every guide has the same
  // shape so the renderer stays simple:
  //   focus: { label, title, detail }        what the question was about, in this sentence
  //   role:  { label, title, detail }        reading, word class, particle role, or formation
  //   note:  { label, paragraphs, chips, pointsLabel, points: [{ jp, reading, text, tag }], tip }
  // All values are plain text; the renderer escapes them.

  const DATA = window.KUMO_DATA || { vocabulary: [], kanji: [], grammar: [] };
  const JAPANESE = window.KUMO_JAPANESE || {};
  const CONJUGATOR = window.KUMO_CONJUGATOR;
  const HAN = /\p{Script=Han}/u;
  const HIRAGANA = /^[\p{Script=Hiragana}ー]+$/u;

  const toHiragana = JAPANESE.toHiragana || ((value) => Array.from(String(value || ''), (character) => {
    const code = character.codePointAt(0);
    return code >= 0x30a1 && code <= 0x30f6 ? String.fromCodePoint(code - 0x60) : character;
  }).join(''));
  const unique = (items) => [...new Set(items.filter(Boolean))];
  const symbols = (value) => Array.from(String(value || ''));
  const symbolIndex = (text, offset) => symbols(String(text).slice(0, offset)).length;

  /* ------------------------------------------------------------------ lookups */

  const kanjiByCharacter = new Map((DATA.kanji || []).map((entry) => [entry.char, entry]));
  let vocabularyFormIndex = null;
  let vocabularyCharacterIndex = null;

  function vocabularyByForm() {
    if (vocabularyFormIndex) return vocabularyFormIndex;
    vocabularyFormIndex = new Map();
    for (const word of DATA.vocabulary || []) {
      for (const form of unique([word.word, ...(word.otherForms || [])])) {
        if (!vocabularyFormIndex.has(form)) vocabularyFormIndex.set(form, []);
        vocabularyFormIndex.get(form).push(word);
      }
    }
    return vocabularyFormIndex;
  }

  function vocabularyByCharacter() {
    if (vocabularyCharacterIndex) return vocabularyCharacterIndex;
    vocabularyCharacterIndex = new Map();
    for (const word of DATA.vocabulary || []) {
      for (const character of new Set(symbols(word.word).filter((symbol) => HAN.test(symbol)))) {
        if (!vocabularyCharacterIndex.has(character)) vocabularyCharacterIndex.set(character, []);
        vocabularyCharacterIndex.get(character).push(word);
      }
    }
    return vocabularyCharacterIndex;
  }

  function annotationAt(text, furigana, position) {
    if (!furigana || position < 0) return null;
    const ranges = JAPANESE.annotationRanges ? JAPANESE.annotationRanges(text, furigana) : [];
    return ranges.find((range) => range.start <= position && position < range.end) || null;
  }

  function precedingWord(text, start) {
    if (!JAPANESE.wordBoundaries || start <= 0) return '';
    const edges = [...JAPANESE.wordBoundaries(text)].sort((left, right) => left - right);
    const previous = edges.filter((edge) => edge < start).at(-1);
    return previous == null || !edges.includes(start) ? '' : text.slice(previous, start);
  }

  /* ---------------------------------------------------------- reading aligner */

  // Sound changes that happen when kanji join into compounds.
  const VOICED = { か: ['が'], き: ['ぎ'], く: ['ぐ'], け: ['げ'], こ: ['ご'], さ: ['ざ'], し: ['じ'], す: ['ず'], せ: ['ぜ'], そ: ['ぞ'], た: ['だ'], ち: ['ぢ', 'じ'], つ: ['づ', 'ず'], て: ['で'], と: ['ど'], は: ['ば'], ひ: ['び'], ふ: ['ぶ'], へ: ['べ'], ほ: ['ぼ'] };
  const P_SOUND = { は: 'ぱ', ひ: 'ぴ', ふ: 'ぷ', へ: 'ぺ', ほ: 'ぽ' };
  const GEMINATING = new Set(['つ', 'ち', 'く', 'き']);
  const I_ROW = { う: 'い', く: 'き', ぐ: 'ぎ', す: 'し', つ: 'ち', ぬ: 'に', ぶ: 'び', む: 'み', る: 'り' };

  function soundVariants(reading) {
    const variants = [{ reading, change: '' }];
    const first = reading[0];
    const rest = reading.slice(1);
    for (const voiced of VOICED[first] || []) variants.push({ reading: voiced + rest, change: 'voiced' });
    if (P_SOUND[first]) variants.push({ reading: P_SOUND[first] + rest, change: 'p-sound' });
    if (reading.length >= 2 && GEMINATING.has(reading.at(-1))) {
      const short = `${reading.slice(0, -1)}っ`;
      variants.push({ reading: short, change: 'small-tsu' });
      for (const voiced of VOICED[first] || []) variants.push({ reading: voiced + short.slice(1), change: 'voiced+small-tsu' });
      if (P_SOUND[first]) variants.push({ reading: P_SOUND[first] + short.slice(1), change: 'p-sound+small-tsu' });
    }
    return variants;
  }

  const candidateCache = new Map();

  function readingCandidates(character) {
    if (candidateCache.has(character)) return candidateCache.get(character);
    const entry = kanjiByCharacter.get(character);
    const list = [];
    const add = (reading, kind, base, plain, okurigana = false, okuri = '') => {
      if (!reading) return;
      for (const variant of soundVariants(reading)) list.push({ reading: variant.reading, change: variant.change, kind, base, plain, okurigana, okuri });
    };
    for (const raw of entry?.kunyomi || []) {
      if (!raw || raw === '—') continue;
      const clean = raw.replace(/-/g, '');
      const [stemRaw, okuriRaw = ''] = clean.split('.');
      const stem = toHiragana(stemRaw);
      const okuri = toHiragana(okuriRaw);
      add(stem, 'kun', raw, stem, false, okuri);
      if (okuri) {
        // In nouns and compounds the okurigana are often absorbed: 話す → 話（はなし）, 受ける → 受付.
        add(stem + okuri, 'kun', raw, stem, true);
        if (okuri.length > 1) add(stem + okuri.slice(0, -1), 'kun', raw, stem, true);
        const iRow = I_ROW[okuri.at(-1)];
        if (iRow) add(stem + okuri.slice(0, -1) + iRow, 'kun', raw, stem, true);
        if (['る', 'つ', 'う', 'く'].includes(okuri.at(-1))) list.push({ reading: `${stem}${okuri.slice(0, -1)}っ`, change: 'small-tsu', kind: 'kun', base: raw, plain: stem + okuri, okurigana: true });
      }
    }
    for (const raw of entry?.onyomi || []) {
      if (!raw || raw === '—') continue;
      const clean = toHiragana(raw.replace(/-/g, ''));
      add(clean, 'on', raw.replace(/-/g, ''), clean);
    }
    // Some entries list the same sound as both on and kun (気: キ / き). Treat it as the on’yomi,
    // which is how dictionaries teach it.
    const onReadings = new Set(list.filter((item) => item.kind === 'on' && !item.change).map((item) => item.reading));
    const seen = new Set();
    const deduped = list.filter((item) => {
      if (item.kind === 'kun' && !item.change && !item.okurigana && !item.okuri && onReadings.has(item.reading)) return false;
      const key = `${item.reading}|${item.kind}|${item.base}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    candidateCache.set(character, deduped);
    return deduped;
  }

  function orderedCandidates(character, preferOn) {
    const kindRank = (kind) => (kind === (preferOn ? 'on' : 'kun') ? 0 : 1);
    return [...readingCandidates(character)].sort((left, right) =>
      (left.change ? 1 : 0) - (right.change ? 1 : 0)
      || (left.okurigana ? 1 : 0) - (right.okurigana ? 1 : 0)
      || kindRank(left.kind) - kindRank(right.kind)
      || right.reading.length - left.reading.length);
  }

  // Splits a word's reading across its characters, e.g. 夕方/ゆうがた → 夕=ゆう, 方=がた (voiced かた).
  // Returns null for whole-word readings such as 今日（きょう） or 大人（おとな）.
  function align(word, reading) {
    const characters = symbols(word);
    const target = toHiragana(reading);
    if (!characters.length || !target) return null;
    const preferOn = characters.filter((character) => HAN.test(character)).length > 1 && characters.every((character) => HAN.test(character) || character === '々');
    const memo = new Map();
    const walk = (index, cursor) => {
      const key = `${index}:${cursor}`;
      if (memo.has(key)) return memo.get(key);
      let result = null;
      if (index === characters.length) {
        result = cursor === target.length ? [] : null;
      } else {
        const character = characters[index];
        const source = character === '々' && index > 0 ? characters[index - 1] : character;
        if (!HAN.test(source)) {
          const kana = toHiragana(character);
          if (target.startsWith(kana, cursor)) {
            const rest = walk(index + 1, cursor + kana.length);
            if (rest) result = [{ char: character, reading: kana, kind: 'kana' }, ...rest];
          }
        } else {
          // When okurigana follow the kanji (一つ, 話す), prefer the reading whose okurigana match.
          let following = '';
          for (let next = index + 1; next < characters.length && !HAN.test(characters[next]) && characters[next] !== '々'; next += 1) following += toHiragana(characters[next]);
          const ordered = orderedCandidates(source, preferOn);
          const candidates = following
            ? [...ordered.filter((candidate) => candidate.okuri && following.startsWith(candidate.okuri)), ...ordered.filter((candidate) => !(candidate.okuri && following.startsWith(candidate.okuri)))]
            : ordered;
          for (const candidate of candidates) {
            if (!target.startsWith(candidate.reading, cursor)) continue;
            const rest = walk(index + 1, cursor + candidate.reading.length);
            if (rest) {
              result = [{ char: character, ...candidate }, ...rest];
              break;
            }
          }
        }
      }
      memo.set(key, result);
      return result;
    };
    return walk(0, 0);
  }

  function pieceFor(word, reading, character, occurrence = 0) {
    const characters = symbols(word);
    const index = characters.indexOf(character, occurrence);
    if (index < 0 || !reading) return null;
    const pieces = align(word, reading);
    if (!pieces) return { whole: true, word, wordReading: reading };
    return pieces[index];
  }

  /* ---------------------------------------------------------- reading wording */

  function kunDisplay(raw) {
    const clean = String(raw || '');
    const core = (value) => {
      const [stem, okuri] = value.split('.');
      return okuri ? `${stem}(${okuri})` : stem;
    };
    if (clean.startsWith('-')) return `〜${core(clean.slice(1))}`;
    if (clean.endsWith('-')) return `${core(clean.slice(0, -1))}〜`;
    return core(clean);
  }

  function readingTag(piece) {
    if (!piece) return '';
    if (piece.whole) return 'whole-word reading';
    if (piece.kind === 'on') return `on’yomi ${piece.base}${piece.change ? ` → ${piece.reading}` : ''}`;
    if (piece.kind === 'kun') {
      const base = kunDisplay(piece.base);
      return `kun’yomi ${base}${piece.change && !piece.okurigana ? ` → ${piece.reading}` : ''}`;
    }
    return '';
  }

  function soundChangeText(piece) {
    if (!piece?.change) return '';
    const plain = piece.plain || '';
    if (piece.change === 'voiced') return `${plain} is voiced to ${piece.reading} after the first part of the word (rendaku)`;
    if (piece.change === 'p-sound') return `${plain} becomes ${piece.reading} after っ or ん`;
    if (piece.change === 'small-tsu') return `${plain} shortens to ${piece.reading} before the next sound`;
    return `${plain} changes to ${piece.reading} where it joins the rest of the word`;
  }

  function readingGroups(entry) {
    const on = unique((entry.onyomi || []).map((reading) => reading.replace(/-/g, '')).filter((reading) => reading !== '—'));
    const onAsHiragana = new Set(on.map(toHiragana));
    const plain = [];
    const suffix = [];
    const prefix = [];
    for (const raw of entry.kunyomi || []) {
      if (!raw || raw === '—' || onAsHiragana.has(raw)) continue;
      if (raw.startsWith('-')) suffix.push(kunDisplay(raw));
      else if (raw.endsWith('-')) prefix.push(kunDisplay(raw));
      else plain.push(kunDisplay(raw));
    }
    return { on, kun: unique(plain), suffix: unique(suffix), prefix: unique(prefix) };
  }

  function readingChips(entry) {
    const groups = readingGroups(entry);
    const list = (items, limit = 6) => `${items.slice(0, limit).join('・')}${items.length > limit ? ` +${items.length - limit} more` : ''}`;
    return [
      groups.on.length ? `On’yomi ${list(groups.on)}` : '',
      groups.kun.length ? `Kun’yomi ${list(groups.kun)}` : '',
      groups.suffix.length ? `As a suffix ${list(groups.suffix, 4)}` : '',
      groups.prefix.length ? `As a prefix ${list(groups.prefix, 4)}` : ''
    ].filter(Boolean);
  }

  function cleanMeanings(entry) {
    return unique((entry.meanings?.length ? entry.meanings : String(entry.meaning || '').split(';')).map((meaning) => String(meaning).trim()));
  }

  const STOP_WORDS = new Set(['the', 'and', 'for', 'with', 'one', 'one\'s', 'someone', 'something', 'thing', 'things', 'that', 'this', 'from', 'into', 'onto', 'being', 'etc', 'used', 'esp', 'make', 'have', 'get', 'very']);

  function senseTokens(sense) {
    return String(sense || '').toLowerCase().replace(/[^a-z\s'-]/g, ' ').split(/\s+/)
      .map((token) => token.replace(/^'+|'+$/g, ''))
      .filter((token) => token.length >= 3 && !STOP_WORDS.has(token));
  }

  // Chooses the gloss that the English translation actually uses (円 → "yen" in a price
  // sentence, not "circle"). Falls back to the first gloss when nothing matches.
  function pickSense(senses, translation) {
    const list = unique(senses.map((sense) => String(sense).trim()));
    if (!list.length) return { sense: '', score: 0 };
    const words = String(translation || '').toLowerCase().replace(/[^a-z\s'-]/g, ' ').split(/\s+/).filter(Boolean);
    const matches = (token) => words.some((word) => word === token || (token.length >= 4 && word.length >= 4 && (word.startsWith(token.slice(0, -1)) || token.startsWith(word.slice(0, -1)))));
    let best = list[0];
    let bestScore = 0;
    for (const sense of list) {
      const score = senseTokens(sense).filter(matches).length;
      if (score > bestScore) {
        best = sense;
        bestScore = score;
      }
    }
    return { sense: best, score: bestScore };
  }

  function strokeCount(value) {
    const count = Array.isArray(value) ? value[0] : value;
    return Number.isFinite(Number(count)) && Number(count) > 0 ? Number(count) : null;
  }

  /* ------------------------------------------------------------- kanji guide */

  function exampleContains(example, character) {
    return Boolean(example?.ja && example.ja.includes(character));
  }

  // Picks an example sentence that really contains the kanji, preferring the kanji's own
  // example words and sentences whose furigana covers it, so the guide can name the reading.
  function kanjiExample(entry) {
    const character = entry.char;
    let fallback = null;
    const consider = (word, example, form) => {
      if (!exampleContains(example, character)) return null;
      const usableForm = form && example.ja.includes(form) ? form : '';
      const candidate = { word, example, form: usableForm };
      if (!fallback) fallback = candidate;
      const position = usableForm ? example.ja.indexOf(usableForm) + usableForm.indexOf(character) : example.ja.indexOf(character);
      return annotationAt(example.ja, example.furigana, position) ? candidate : null;
    };
    for (const [form] of entry.words || []) {
      for (const word of vocabularyByForm().get(form) || []) {
        for (const example of word.examples || []) {
          if (!example?.ja?.includes(form)) continue;
          const found = consider(word, example, form);
          if (found) return found;
        }
      }
    }
    const containing = vocabularyByCharacter().get(character) || [];
    for (const word of containing) {
      for (const example of word.examples || []) {
        if (!example?.ja?.includes(word.word)) continue;
        const found = consider(word, example, word.word);
        if (found) return found;
      }
    }
    for (const word of containing) {
      for (const example of word.examples || []) {
        const found = consider(word, example, '');
        if (found) return found;
      }
    }
    return fallback;
  }

  function kanjiWordCandidates(entry) {
    const character = entry.char;
    const fromKanji = (entry.words || []).filter((item) => item?.[0]).map(([form, reading, meaning], order) => ({ form, reading: reading || '', meaning: meaning || '', senses: meaning ? [meaning] : [], source: 'kanji', order }));
    const fromVocabulary = (vocabularyByCharacter().get(character) || []).flatMap((word) =>
      unique([word.word, ...(word.otherForms || [])]).filter((form) => form.includes(character)).map((form) => ({
        form,
        reading: word.reading || '',
        meaning: cleanMeanings(word)[0] || '',
        senses: cleanMeanings(word),
        source: 'vocabulary',
        order: 100
      })));
    return [...fromKanji, ...fromVocabulary];
  }

  function kanjiUsage(entry, sentence, furigana, preferredForm, translation = '') {
    const character = entry.char;
    let position = -1;
    if (preferredForm && sentence.includes(preferredForm)) position = sentence.indexOf(preferredForm) + preferredForm.indexOf(character);
    if (position < 0) position = sentence.indexOf(character);
    if (position < 0) return null;

    // The furigana shown above the sentence is the source of truth for the reading used here.
    const annotation = annotationAt(sentence, furigana, position);
    let annotated = null;
    if (annotation) {
      const text = sentence.slice(annotation.start, annotation.end);
      const pieces = align(text, annotation.reading);
      annotated = pieces
        ? { ...pieces[symbolIndex(text, position - annotation.start)], annotationText: text }
        : { whole: true, word: text, wordReading: annotation.reading, annotationText: text };
    }

    let best = null;
    for (const candidate of kanjiWordCandidates(entry)) {
      let offset = candidate.form.indexOf(character);
      while (offset >= 0) {
        const start = position - offset;
        if (start >= 0 && sentence.startsWith(candidate.form, start)) {
          const piece = pieceFor(candidate.form, candidate.reading, character, symbolIndex(candidate.form, offset));
          let score = candidate.form.length * 4 + (candidate.source === 'kanji' ? 2 : 0) - candidate.order / 1000;
          if (annotated) {
            const consistent = annotated.whole
              ? toHiragana(annotated.wordReading) === toHiragana(candidate.reading) && candidate.form.includes(annotated.word)
              : piece && !piece.whole && piece.kind === annotated.kind && piece.base === annotated.base;
            score += consistent ? 100 : -100;
          }
          if (!best || score > best.score) best = { ...candidate, start, piece, score };
        }
        offset = candidate.form.indexOf(character, offset + 1);
      }
    }
    if (best && best.score < 0) best = null;
    if (best) {
      // Collect every gloss for this exact word and reading, then let the translation decide.
      const senses = kanjiWordCandidates(entry)
        .filter((candidate) => candidate.form === best.form && toHiragana(candidate.reading) === toHiragana(best.reading))
        .flatMap((candidate) => candidate.senses);
      let picked = pickSense([best.meaning, ...senses], translation);
      // A one-kanji word can also carry the kanji's own glosses (円 → "yen" in a price sentence).
      if (!picked.score && best.form === character) {
        const fromKanji = pickSense(cleanMeanings(entry), translation);
        if (fromKanji.score) picked = fromKanji;
      }
      best = { ...best, meaning: picked.sense || best.meaning };
    }

    const piece = annotated || best?.piece || null;
    const word = best?.form || annotated?.annotationText || character;
    const wordReading = best?.reading || (annotated?.whole ? annotated.wordReading : '');
    const start = best ? best.start : annotation ? annotation.start : position;
    const before = precedingWord(sentence, start);
    return {
      word,
      wordReading,
      meaning: best?.meaning || '',
      reading: piece && !piece.whole ? piece.reading : '',
      piece,
      prefix: before === 'お' || before === 'ご' ? before : ''
    };
  }

  function compareWords(entry, usage) {
    const character = entry.char;
    const items = (entry.words || [])
      .filter((item) => item?.[0] && item[0] !== usage?.word)
      .map(([form, reading, meaning]) => ({ form, reading: reading || '', meaning: meaning || '', piece: pieceFor(form, reading, character) }));
    const picked = [];
    const take = (predicate) => {
      const found = items.find((item) => !picked.includes(item) && predicate(item));
      if (found && picked.length < 3) picked.push(found);
    };
    const usageKind = usage?.piece && !usage.piece.whole ? usage.piece.kind : '';
    take((item) => item.piece && !item.piece.whole && usageKind && item.piece.kind !== usageKind);
    take((item) => item.piece?.change);
    take((item) => item.piece && !item.piece.whole && item.piece.base !== usage?.piece?.base);
    while (picked.length < 3 && items.some((item) => !picked.includes(item))) take(() => true);
    return picked.map((item) => ({ jp: item.form, reading: item.reading, text: item.meaning, tag: readingTag(item.piece) }));
  }

  function kanji(entry, context = {}) {
    const character = entry.char;
    const sentence = String(context.sentence || '');
    const meanings = cleanMeanings(entry);
    const coreText = meanings.slice(0, 3).join(', ');
    const usage = sentence ? kanjiUsage(entry, sentence, context.furigana || '', context.form || '', context.translation || '') : null;
    const piece = usage?.piece || null;
    const standalone = Boolean(usage && usage.word === character);
    const prefixedWord = usage ? `${usage.prefix}${usage.word}` : character;
    const wordReading = usage ? usage.wordReading || usage.reading : '';
    const wordLabel = usage && !standalone && wordReading ? `${prefixedWord}（${wordReading}）` : prefixedWord;
    // "Here 口 is a word on its own" vs "In 上京（じょうきょう）" vs "In お方".
    const where = standalone && !usage.prefix ? `Here ${character} is a word on its own and` : `In ${wordLabel}, ${character}`;

    const coreIsUsage = meanings.length === 1 && meanings[0].toLowerCase() === String(usage?.meaning || '').toLowerCase();
    const coreSuffix = coreIsUsage ? '' : ` Core meanings: ${coreText}.`;
    let focusDetail = `Core meanings: ${coreText}.`;
    if (usage?.meaning) {
      focusDetail = standalone
        ? `“${usage.meaning}” in this sentence.${coreSuffix}`
        : `Part of ${wordLabel}: “${usage.meaning}”.${coreSuffix}`;
    } else if (usage && !standalone) {
      focusDetail = `Part of ${wordLabel} in this sentence. Core meanings: ${coreText}.`;
    }
    const focus = { label: 'FOCUS', title: usage?.reading ? `${character}（${usage.reading}）` : character, detail: focusDetail };

    const groups = readingGroups(entry);
    let role;
    let lead;
    if (piece?.whole) {
      role = { label: 'READING HERE', title: 'Whole-word reading', detail: `${piece.word}（${piece.wordReading}）is read as one unit, so ${character} has no separate reading here.` };
      lead = `${piece.word} is read ${piece.wordReading} as a whole word: the reading doesn’t split into one part per kanji, so learn it as vocabulary. In other words, ${character} uses the readings listed below.`;
    } else if (piece?.kind === 'kun') {
      const [stem, okuri] = String(piece.base).replace(/-/g, '').split('.');
      const change = piece.okurigana ? '' : soundChangeText(piece);
      const okuriganaNote = okuri ? ` The kana that follow the kanji (okurigana) spell out the ending, as in ${character}${okuri}（${toHiragana(stem)}${okuri}）.` : '';
      role = {
        label: 'READING HERE',
        title: `Kun’yomi · ${piece.reading}`,
        detail: change
          ? `Native Japanese reading ${kunDisplay(piece.base)}; here ${change}.`
          : `Native Japanese reading${okuri ? ` ${kunDisplay(piece.base)}` : ''}, typical when a kanji stands alone or carries okurigana.`
      };
      lead = change
        ? `${where} is read ${piece.reading}: its kun’yomi ${kunDisplay(piece.base)}, where ${change}.`
        : `${where} is read ${piece.reading}, its kun’yomi: the native Japanese reading. Kun’yomi are typical when a kanji stands alone or is followed by okurigana.${okuriganaNote}`;
    } else if (piece?.kind === 'on') {
      const change = soundChangeText(piece);
      role = {
        label: 'READING HERE',
        title: `On’yomi · ${piece.reading}`,
        detail: change
          ? `Chinese-derived reading ${piece.base}; here ${change}.`
          : `Chinese-derived reading ${piece.base}${standalone ? '. Single-kanji words often use the kun’yomi, but this one uses the on’yomi.' : ', typical in compounds of two or more kanji.'}`
      };
      lead = change
        ? `${where} is read ${piece.reading}: its on’yomi ${piece.base}, where ${change}.`
        : `${where} is read ${piece.reading}, its on’yomi: the reading borrowed from Chinese.${standalone ? '' : ' On’yomi are typical in compounds of two or more kanji.'}`;
    } else {
      const summary = [groups.on.length ? `On ${groups.on.slice(0, 3).join('・')}` : '', groups.kun.length ? `Kun ${groups.kun.slice(0, 3).join('・')}` : ''].filter(Boolean).join(' · ');
      role = { label: 'READINGS', title: summary || 'Read in context', detail: 'The word the kanji belongs to decides which reading is used.' };
      lead = `${character} changes its reading with the word it belongs to, so learn it inside vocabulary rather than on its own.`;
    }

    const paragraphs = [lead];
    if (usage?.prefix && usage.meaning) paragraphs.push(`The ${usage.prefix} in front is a polite prefix, so ${prefixedWord} is a respectful way to say “${usage.meaning}”.`);

    const strokes = strokeCount(entry.strokes);
    const tipParts = [
      strokes ? `${strokes} ${strokes === 1 ? 'stroke' : 'strokes'}` : '',
      entry.radical ? `radical ${entry.radical}${entry.radicalNumber ? ` (#${entry.radicalNumber})` : ''}${entry.radical === character ? ', which is the kanji itself' : ''}` : '',
      entry.kokuji ? 'a kokuji, created in Japan rather than borrowed from Chinese' : ''
    ].filter(Boolean);
    const points = compareWords(entry, usage);

    return {
      focus,
      role,
      note: {
        label: 'HOW TO READ IT',
        paragraphs,
        chips: readingChips(entry),
        pointsLabel: points.length ? `${character} in other words` : '',
        points,
        tip: tipParts.length ? `Writing: ${tipParts.join(' · ')}.` : ''
      }
    };
  }

  /* -------------------------------------------------------- vocabulary guide */

  const PARTICLE_AFTER_NOUN = [
    ['から', 'から marks the starting point: “from”'],
    ['まで', 'まで marks the end point: “until / as far as”'],
    ['より', 'より marks what it is compared with: “than”'],
    ['は', 'は marks it as the topic: what the sentence is about'],
    ['が', 'が marks it as the subject: who or what does the action or has the quality'],
    ['を', 'を marks it as the direct object: the thing the verb acts on'],
    ['に', 'に marks a target, destination, point in time, or place where something exists'],
    ['で', 'で marks where an action happens, or the means used'],
    ['へ', 'へ marks the direction of movement'],
    ['と', 'と means “with” or “and,” or closes a quotation'],
    ['も', 'も adds “also / too”'],
    ['の', 'の links it to the next noun: “of / ’s”'],
    ['や', 'や lists it as one example among several']
  ];

  // [name, explanation]: the name is reused when a form is stacked on another (passive + polite past).
  const FORM_NOTES = Object.freeze({
    dictionary: ['the dictionary form', 'it is the plain present, used in casual speech and before nouns'],
    politeNonPast: ['the polite form (〜ます)', 'it states the present or future politely'],
    politePast: ['the polite past (〜ました)', ''],
    politeNegative: ['the polite negative (〜ません)', ''],
    plainPast: ['the plain past (〜た)', ''],
    plainNegative: ['the plain negative (〜ない)', ''],
    teForm: ['the て-form', 'it links the verb to what follows: “and then,” a request, or a helper verb'],
    plainNegativePast: ['the plain negative past (〜なかった)', ''],
    politeNegativePast: ['the polite negative past (〜ませんでした)', ''],
    potential: ['the potential form', 'it means “can do”'],
    volitional: ['the volitional form', 'it means “let’s” or “I’ll”'],
    taraConditional: ['the たら conditional', 'it means “if” or “when”'],
    desire: ['the たい form', 'it means “want to”'],
    progressive: ['the 〜ている form', 'it describes an ongoing action or a resulting state'],
    passive: ['the passive form (〜れる/〜られる)', 'it means “is done (to),” and it can also make an action sound respectful'],
    causative: ['the causative form', 'it means “make or let someone do”'],
    imperative: ['the plain imperative', 'it gives a blunt command'],
    baConditional: ['the ば conditional', 'it means “if”'],
    causativePassive: ['the causative-passive form', 'it means “be made to do”']
  });

  const SHORT_FORM = Object.freeze({
    politeNonPast: 'polite form (〜ます)', politePast: 'polite past (〜ました)', politeNegative: 'polite negative (〜ません)',
    plainPast: 'plain past (〜た)', plainNegative: 'plain negative (〜ない)', teForm: 'て-form', progressive: '〜ている form',
    plainNegativePast: 'plain negative past (〜なかった)', politeNegativePast: 'polite negative past (〜ませんでした)',
    taraConditional: 'たら conditional', baConditional: 'ば conditional'
  });

  function hasPos(word, ...codes) {
    return (word.pos || []).some((code) => codes.some((prefix) => code === prefix || (prefix.endsWith('*') && code.startsWith(prefix.slice(0, -1)))));
  }

  function wordClass(word) {
    const conjugation = CONJUGATOR?.conjugate?.(word);
    const forms = conjugation?.forms || {};
    const examples = ['politeNonPast', 'plainNegative', 'teForm'].map((key) => forms[key]?.value).filter(Boolean).join(' · ');
    const sample = (lead) => (examples ? `${lead}: ${examples}.` : `${lead}.`);
    const transitivity = hasPos(word, 'vt') && !hasPos(word, 'vi') ? ' · transitive' : hasPos(word, 'vi') && !hasPos(word, 'vt') ? ' · intransitive' : '';
    const transitivityNote = transitivity === ' · transitive' ? ' Transitive: it acts on an object marked with を.' : transitivity === ' · intransitive' ? ' Intransitive: it takes no を object.' : '';
    if (hasPos(word, 'vk')) return { title: `Irregular verb (来る)${transitivity}`, detail: `${sample('One of the two irregular verbs')}${transitivityNote}` };
    if (hasPos(word, 'v1', 'v1-s')) return { title: `Ichidan verb (る-verb)${transitivity}`, detail: `${sample('Drop the final る and add the ending')}${transitivityNote}` };
    if (hasPos(word, 'v5*')) return { title: `Godan verb (う-verb)${transitivity}`, detail: `${sample('The final sound shifts to build each form')}${transitivityNote}` };
    if (hasPos(word, 'vz')) return { title: `〜ずる verb${transitivity}`, detail: `${sample('A literary verb that conjugates like 〜じる')}${transitivityNote}` };
    if (hasPos(word, 'vs-i', 'vs-s')) return { title: `する verb${transitivity}`, detail: `${sample('Conjugates like する')}${transitivityNote}` };
    if (hasPos(word, 'n') && hasPos(word, 'adv') && !hasPos(word, 'vs')) return { title: 'Noun · also used as an adverb', detail: 'Words like this can stand alone without a particle to say when or how much, or take particles like any noun.' };
    if (hasPos(word, 'vs') && hasPos(word, 'n')) return { title: 'Noun · also a する verb', detail: `Use it as a noun, or add する to make it a verb: ${word.word}する · ${word.word}します.` };
    if (hasPos(word, 'adj-ix')) return { title: 'い-adjective (いい/よい type)', detail: 'Its other forms are built from よい: よくない (not good), よかった (was good).' };
    if (hasPos(word, 'adj-i')) {
      const stem = word.word.endsWith('い') ? word.word.slice(0, -1) : word.word;
      return { title: 'い-adjective', detail: `It conjugates by itself: ${stem}くない (not), ${stem}かった (was), ${stem}く (adverb).` };
    }
    if (hasPos(word, 'adj-na')) return { title: 'な-adjective', detail: `Add な before a noun (${word.word}な〜) and です or だ at the end of a sentence.` };
    if (hasPos(word, 'adj-pn')) return { title: 'Pre-noun adjectival', detail: 'Comes directly before a noun and never changes form.' };
    if (hasPos(word, 'adj-t', 'adv-to')) return { title: 'Adverb (with と)', detail: 'Often followed by と when it describes how something is done.' };
    if (hasPos(word, 'adv')) return { title: 'Adverb', detail: 'Describes how, how much, or when. It usually comes before the verb or adjective it modifies and needs no particle.' };
    if (hasPos(word, 'pn')) return { title: 'Pronoun', detail: 'Stands in for a person or thing and takes particles just like a noun.' };
    if (hasPos(word, 'ctr')) return { title: 'Counter', detail: 'Attaches to a number to count a particular kind of thing.' };
    if (hasPos(word, 'n-suf', 'suf')) return { title: 'Suffix', detail: 'Attaches to the end of another word.' };
    if (hasPos(word, 'pref', 'n-pref')) return { title: 'Prefix', detail: 'Attaches to the front of another word.' };
    if (hasPos(word, 'exp')) return { title: 'Expression', detail: 'A set phrase: learn it as one unit.' };
    if (hasPos(word, 'int')) return { title: 'Interjection', detail: 'Stands on its own as a reaction, greeting, or exclamation.' };
    if (hasPos(word, 'conj')) return { title: 'Conjunction', detail: 'Connects sentences or clauses: and, but, so, or.' };
    if (hasPos(word, 'prt')) return { title: 'Particle', detail: 'A small function word that marks how the phrase before it relates to the rest.' };
    if (hasPos(word, 'aux', 'aux-v', 'aux-adj')) return { title: 'Auxiliary', detail: 'Attaches to a verb or adjective to add tense, mood, or politeness.' };
    if (hasPos(word, 'num')) return { title: 'Number', detail: 'Usually combines with a counter when counting things.' };
    if (hasPos(word, 'adj-no')) return { title: 'Noun (can take の)', detail: `Can describe another noun with の: ${word.word}の〜.` };
    return { title: 'Noun', detail: 'Names a person, thing, or idea. The particle after it shows its role in the sentence.' };
  }

  function verbFormsInSentence(word, sentence) {
    const conjugation = CONJUGATOR?.conjugate?.(word);
    if (!conjugation) return null;
    const list = [{ key: 'dictionary', value: conjugation.dictionary, reading: conjugation.reading }];
    for (const [key, form] of Object.entries(conjugation.forms || {})) list.push({ key, value: form.value, reading: form.reading });
    // Second-level forms such as 会われました (passive + polite past) or 食べています.
    for (const key of ['passive', 'potential', 'causative', 'causativePassive', 'progressive']) {
      const base = conjugation.forms?.[key];
      if (!base?.value?.endsWith('る') || !base.reading?.endsWith('る')) continue;
      const derived = CONJUGATOR.conjugate({ word: base.value, reading: base.reading, pos: ['v1'] });
      for (const [subKey, form] of Object.entries(derived?.forms || {})) {
        if (SHORT_FORM[subKey]) list.push({ key, subKey, value: form.value, reading: form.reading });
      }
    }
    if (conjugation.forms?.desire?.value) {
      const stem = conjugation.forms.desire.value.slice(0, -1);
      const readingStem = conjugation.forms.desire.reading.slice(0, -1);
      for (const [suffix, subLabel] of [['かった', 'past (〜たかった, “wanted to”)'], ['くない', 'negative (〜たくない, “don’t want to”)'], ['くて', 'て-form (〜たくて)']]) list.push({ key: 'desire', subLabel, value: stem + suffix, reading: readingStem + suffix });
    }
    const sorted = list.filter((item) => item.value).sort((left, right) => right.value.length - left.value.length);
    for (const item of sorted) {
      if (sentence.includes(item.value)) return { ...item, surface: item.value };
      if (item.reading && item.reading !== item.value && sentence.includes(item.reading)) return { ...item, surface: item.reading, kana: true };
    }
    return null;
  }

  function describeForm(found) {
    const [name, explanation] = FORM_NOTES[found.key] || ['a conjugated form', ''];
    const sub = found.subLabel || SHORT_FORM[found.subKey] || '';
    const head = sub ? `${name}, here in the ${sub}` : name;
    return explanation ? `${head}. ${capitalize(explanation)}` : head;
  }

  function adjectiveUsage(word, sentence) {
    const text = word.word;
    if (hasPos(word, 'adj-i', 'adj-ix') && text.endsWith('い')) {
      const stems = unique([text.slice(0, -1), hasPos(word, 'adj-ix') ? (text === 'いい' ? 'よ' : text.slice(0, -1)) : '']);
      const forms = [];
      for (const stem of stems) {
        forms.push([`${stem}くなかった`, 'the negative past (“was not …”)'], [`${stem}くありません`, 'the polite negative (“is not …”)'], [`${stem}くない`, 'the negative (“is not …”)'], [`${stem}かった`, 'the past (“was …”)'], [`${stem}ければ`, 'the conditional (“if it is …”)'], [`${stem}くて`, 'the て-form (“… and” or “because …”)'], [`${stem}そう`, 'the そう form (“looks …”)'], [`${stem}く`, 'the く-form, used as an adverb or before なる']);
      }
      forms.push([text, 'the plain form, used before a noun or to end a sentence']);
      const found = forms.find(([form]) => form && sentence.includes(form));
      return found ? `Here it appears as ${found[0]}, ${found[1]}.` : '';
    }
    if (hasPos(word, 'adj-na')) {
      const index = sentence.indexOf(text);
      if (index < 0) return '';
      const after = sentence.slice(index + text.length);
      const uses = [['な', `${text}な describes the noun that follows`], ['に', `${text}に works as an adverb and describes how something is done`], ['でした', `${text}でした is the polite past (“was …”)`], ['です', `${text}です ends the sentence politely (“is …”)`], ['だった', `${text}だった is the plain past (“was …”)`], ['だ', `${text}だ ends the sentence plainly (“is …”)`], ['じゃ', `${text}じゃ starts a negative (“is not …”)`], ['では', `${text}では starts a negative (“is not …”)`], ['で', `${text}で links to what follows (“… and”)`], ['なら', `${text}なら means “if it is …”`]];
      const found = uses.find(([ending]) => after.startsWith(ending));
      return found ? `Here ${found[1]}.` : '';
    }
    return '';
  }

  function nounUsage(word, sentence) {
    const forms = unique([word.word, ...(word.otherForms || []), word.reading]);
    for (const form of forms) {
      const index = sentence.indexOf(form);
      if (index < 0) continue;
      const before = symbols(sentence.slice(0, index)).at(-1) || '';
      const after = sentence.slice(index + form.length);
      if (HAN.test(before) || HAN.test(symbols(after)[0] || '')) {
        let start = index;
        while (start > 0 && HAN.test(sentence[start - 1])) start -= 1;
        let end = index + form.length;
        while (end < sentence.length && HAN.test(sentence[end])) end += 1;
        return `Here it is part of the longer word ${sentence.slice(start, end)}.`;
      }
      const written = form === word.reading && form !== word.word ? ` (written in kana as ${form})` : '';
      const copula = after.match(/^(です|でした|だった|だ|でしょう|だろう)/)?.[0];
      if (copula) return `Here ${form}${written} is followed by ${copula}, so it is the predicate that ends the sentence (“… is …”).`;
      const particle = PARTICLE_AFTER_NOUN.find(([mark]) => after.startsWith(mark));
      if (particle) return `Here ${form}${written} is followed by ${particle[0]}. ${capitalize(particle[1])}.`;
      return written ? `Here it is written in kana as ${form}.` : '';
    }
    return '';
  }

  function capitalize(text) {
    return text ? text[0].toUpperCase() + text.slice(1) : '';
  }

  function firstMeaning(word) {
    return cleanMeanings(word)[0] || word.meaning || '';
  }

  function readingBreakdown(form, reading) {
    if (!HAN.test(form) || !reading) return [];
    const pieces = align(form, reading);
    if (!pieces) return [{ jp: form, reading, text: 'read as a whole word', tag: 'whole-word reading' }];
    return pieces.filter((piece) => HAN.test(piece.char) || piece.char === '々').map((piece) => ({
      jp: piece.char,
      reading: piece.reading,
      text: piece.change ? soundChangeText(piece) : '',
      tag: readingTag(piece)
    }));
  }

  function vocabulary(word, context = {}) {
    const sentence = String(context.sentence || '');
    const meanings = cleanMeanings(word);
    const sense = pickSense(meanings.slice(0, 4), context.translation || '').sense || meanings[0] || '';
    const category = wordClass(word);
    const isVerb = hasPos(word, 'v1', 'v1-s', 'v5*', 'vk', 'vz', 'vs-i', 'vs-s') || (hasPos(word, 'vs') && !hasPos(word, 'n'));
    let usage = '';
    if (sentence) {
      const verbForm = (isVerb || hasPos(word, 'vs')) ? verbFormsInSentence(word, sentence) : null;
      if (verbForm) usage = `Here it appears as ${verbForm.surface}${verbForm.kana ? ' (written in kana)' : ''}, ${describeForm(verbForm)}.`;
      else if (hasPos(word, 'adj-i', 'adj-ix', 'adj-na')) usage = adjectiveUsage(word, sentence);
      if (!usage && !isVerb) usage = nounUsage(word, sentence);
      if (!usage && !sentence.includes(word.word) && word.reading && sentence.includes(word.reading)) usage = `Here it is written in kana as ${word.reading}.`;
    }
    const paragraphs = [];
    if (usage) paragraphs.push(usage);
    paragraphs.push(sentence && sense ? `In this sentence it carries the meaning “${sense}”.` : `It means “${meanings.slice(0, 3).join('; ')}”.`);
    const breakdown = readingBreakdown(word.word, word.reading);
    const otherMeanings = meanings.filter((meaning) => meaning !== sense).slice(0, 3);
    return {
      focus: {
        label: 'FOCUS',
        title: word.word !== word.reading && word.reading ? `${word.word}（${word.reading}）` : word.word,
        detail: `${meanings.slice(0, 3).join('; ')}${word.level ? ` · JLPT ${word.level}` : ''}`
      },
      role: { label: 'WORD TYPE', title: category.title, detail: category.detail },
      note: {
        label: 'IN THIS SENTENCE',
        paragraphs,
        pointsLabel: breakdown.length ? 'How the reading splits' : '',
        points: breakdown,
        tip: otherMeanings.length ? `Other meanings: ${otherMeanings.join('; ')}.` : (context.tip || '')
      }
    };
  }

  /* ---------------------------------------------------------- particle guide */

  const GROUP_NOTES = Object.freeze({
    格助詞: ['case particle', 'Case particles show how a noun relates to the verb: subject, object, place, time, direction, or partner.'],
    係助詞: ['binding particle', 'Binding particles such as は, も, and こそ add topic, contrast, or emphasis to a phrase.'],
    副助詞: ['adverbial particle', 'Adverbial particles add degree or limitation: only, even, about, until.'],
    接続助詞: ['conjunctive particle', 'Conjunctive particles join clauses: “and then,” “because,” “but,” “if.”'],
    終助詞: ['sentence-ending particle', 'Sentence-ending particles add the speaker’s attitude: a question, emphasis, or a request for agreement.'],
    連体化: ['noun-linking particle', 'This particle links one noun to the next.'],
    並立助詞: ['coordinating particle', 'Coordinating particles list items: A と B, A や B.'],
    副詞化: ['adverb-forming particle', 'Adverb-forming particles turn the word before them into an adverb.'],
    特殊: ['contracted particle', 'A casual contraction of a longer particle combination.'],
    '副助詞／並立助詞／終助詞': ['multi-purpose particle', 'か can end a question, join choices (“or”), or follow a question word (“some-”).']
  });

  // [role, explanation, tip] keyed by "particle|group", with "particle" as a fallback.
  const PARTICLES = Object.freeze({
    'は|係助詞': ['topic marker', 'は (pronounced “wa”) marks the topic: what the sentence is about. Everything after it comments on that topic, and it can also set up a contrast (“as for X …”).', 'は vs が: は presents the topic, often known information; が points out the subject, often new or emphasized information.'],
    'も|係助詞': ['“also / too”', 'も means “also” or “too” and takes the place of は, が, or を. With a number it stresses how many; with a negative it means “not even.”', 'It can follow other particles: にも (to … too), でも (at … too / even).'],
    'さえ': ['“even”', 'さえ means “even,” marking an extreme example. In 〜さえ〜ば it means “if only.”', ''],
    'こそ': ['emphasis', 'こそ singles out the word before it: “X, and nothing else.”', ''],
    'しか': ['“only” (with a negative)', 'しか means “only” and always pairs with a negative verb: 一つしかない (there is only one).', 'だけ also means “only,” but it works with positive verbs.'],
    'を|格助詞': ['direct object', 'を (pronounced “o”) marks the direct object: the thing the verb acts on. With movement verbs it can also mark the space you move through or leave (公園を歩く, 家を出る).', 'Look for を right before verbs such as 食べる, 見る, 読む, or 買う.'],
    'に|格助詞': ['target · time · location', 'に marks where something goes or is directed (a destination, recipient, or target), a specific point in time, or the place where something exists with いる/ある. In passive sentences it marks who does the action.', 'に vs で: に marks where something exists or arrives; で marks where an action takes place.'],
    'で|格助詞': ['place of action · means', 'で marks where an action happens, or the means, tool, material, or cause: バスで行く (go by bus), 日本語で話す (speak in Japanese).', 'Compare 図書館にいる (be in the library) with 図書館で読む (read in the library).'],
    'が|格助詞': ['subject marker', 'が marks the subject: who or what does the action or has the quality. It highlights new or specific information, and it marks the object of 好き, ほしい, できる, and わかる.', 'Question words such as だれ, 何, and どこ take が, not は, when they are the subject.'],
    'が|接続助詞': ['“but” (joins clauses)', 'After a full clause, が means “but,” or simply connects two statements politely: 高いですが、おいしいです.', 'In casual speech けど is more common.'],
    'と|格助詞': ['“with” · quotation', 'と means “with” (doing something together), or closes a quotation before verbs such as 言う and 思う: 「はい」と言った.', 'When と follows a quote or thought, look for 言う, 思う, or 聞く right after it.'],
    'と|並立助詞': ['“and” (complete list)', 'Between nouns, と means “and” and gives a complete list: りんごとみかん (apples and oranges).', 'や gives an incomplete list (“… and so on”).'],
    'と|接続助詞': ['“when / whenever”', 'After a plain-form verb, と means “when” or “whenever” and introduces a natural or automatic result: 春になると暖かくなる.', 'The result after this と cannot be a request or an intention.'],
    'と|副詞化': ['manner', 'と after a sound or manner word turns it into an adverb: ゆっくりと, はっきりと.', ''],
    'や|並立助詞': ['“and” (examples)', 'や lists examples without being complete: 本やノート (books, notebooks, and so on).', 'The list often ends with など.'],
    'の|連体化': ['links nouns', 'の connects two nouns: A の B means “B of A” or “A’s B.” It can show possession, origin, type, or position: 私の本, 日本の車, 机の上.', 'Read A の B from right to left in English: 机の上 is “the top of the desk.”'],
    'の|格助詞': ['subject inside a description', 'Inside a clause that describes a noun, の can replace が to mark the subject: 背の高い人 (a person who is tall).', ''],
    'の|終助詞': ['explanation · soft question', 'At the end of a sentence, の asks for or gives an explanation in a soft, casual way: どうしたの？ (What happened?)', ''],
    'へ|格助詞': ['direction', 'へ (pronounced “e”) marks the direction of movement, toward a place. It often appears with 行く, 来る, and 帰る.', 'に can also mark a destination; へ puts the stress on the direction.'],
    'から|格助詞': ['“from” (starting point)', 'から marks a starting point in place or time: 駅から (from the station), 9時から (from 9 o’clock).', 'Pair it with まで for a range: 9時から5時まで.'],
    'から|接続助詞': ['“because”', 'After a clause, から gives a reason: 雨だから、行きません (It’s raining, so I won’t go).', 'ので also means “because” but sounds softer and more objective.'],
    'まで': ['“until / as far as”', 'まで marks an end point in time, place, or degree: “until,” “as far as,” or “even.”', 'までに means “by” a deadline: 5時までに.'],
    'より|格助詞': ['“than” (comparison)', 'より marks the standard of comparison: 東京は大阪より大きい (Tokyo is bigger than Osaka). In formal writing it can also mean “from.”', 'Pattern: A は B より … means “A is more … than B.”'],
    'よ|終助詞': ['tells something new', 'よ tells the listener something new or stresses your point, like “you know” or “I tell you.”', 'ね seeks agreement; よ informs. よね does both.'],
    'ね|終助詞': ['seeks agreement', 'ね asks the listener to agree or confirm, like “isn’t it?” or “right?”', ''],
    'な|終助詞': ['prohibition or feeling', 'At the end of a sentence な has two common uses: after a dictionary-form verb it is a blunt prohibition (しゃべるな, don’t talk); after other words it expresses the speaker’s feeling (いいな, how nice).', ''],
    'なあ': ['exclamation', 'なあ expresses feeling or longing: いいなあ (how nice / I wish).', ''],
    'なぁ': ['exclamation', 'なぁ expresses feeling or longing: いいなぁ (how nice / I wish).', ''],
    'わ': ['soft emphasis', 'わ adds emotion or soft emphasis. In standard Japanese it sounds feminine; in western dialects everyone uses it.', ''],
    'ぞ': ['strong emphasis', 'ぞ adds strong, casual emphasis, mostly in masculine speech: 行くぞ！ (Let’s go!)', ''],
    'ぜ': ['casual emphasis', 'ぜ is a rough, friendly emphasis similar to ぞ: 行こうぜ.', ''],
    'かしら': ['“I wonder”', 'かしら means “I wonder” and sounds soft and traditionally feminine.', ''],
    'かい': ['casual question', 'かい is a friendly, casual question ending: 元気かい？', ''],
    'け': ['recalling', 'っけ checks something you half-remember: 何だっけ？ (What was it again?)', ''],
    'かぁ': ['musing', 'かぁ is a drawn-out か that shows realization or musing: そうかぁ.', ''],
    'ねー': ['emphatic ね', 'ねー is an emphatic ね that seeks agreement with feeling.', ''],
    'ねえ': ['emphatic ね', 'ねえ is an emphatic ね that seeks agreement with feeling.', ''],
    'て|接続助詞': ['て-form link', 'て connects a verb or adjective to what follows: actions in sequence (“and then”), a reason, or a helper verb such as 〜ている, 〜てください, or 〜てみる.', 'The shape before て shows the verb group: 書いて, 読んで, 食べて.'],
    'で|接続助詞': ['voiced て-form', 'This で is the て-form ending after verbs such as 読む, 遊ぶ, 死ぬ, and 泳ぐ (読んで, 遊んで). It links the action to what follows.', ''],
    'ば|接続助詞': ['“if” (conditional)', 'ば makes a conditional: 安ければ買う (If it’s cheap, I’ll buy it).', ''],
    'のに|接続助詞': ['“even though”', 'のに means “even though,” often with surprise or regret: 勉強したのに、落ちた (I studied, yet I failed).', ''],
    'ので|接続助詞': ['“because” (softer)', 'ので gives a reason in a soft, explanatory way: 雨なので、行きません.', 'から is more direct; ので sounds more polite and objective.'],
    'けど': ['“but / although”', 'けど means “but” or “although.” Left at the end of a sentence it softens what you just said.', ''],
    'けれど': ['“but / although”', 'けれど (also けれども) means “but” or “although.”', ''],
    'つつ': ['“while” (formal)', 'つつ after a ます-stem means “while doing,” or with も, “even though”: 悪いと知りつつ (while knowing it’s wrong).', ''],
    'ちゃ': ['contraction of ては', 'ちゃ is a casual contraction of ては: 食べちゃいけない = 食べてはいけない (you must not eat it).', ''],
    'んで': ['casual contraction', 'んで is a casual contraction, usually of ので (“because”) or of the て-form ending で.', ''],
    'なり': ['“as soon as” / “or”', 'なり after a verb means “as soon as”; between options it means “or.”', ''],
    'ほど': ['extent · “not as … as”', 'ほど marks extent (“to the degree that”). With a negative it compares: 去年ほど寒くない (not as cold as last year).', ''],
    'でも': ['“even” / “or something”', 'でも means “even” (子どもでもわかる, even a child understands) or offers a casual example (お茶でも, tea or something).', ''],
    'なんて': ['“things like”', 'なんて adds surprise or dismissiveness: “things like …” or “such a …”.', ''],
    'なんか': ['“things like” (casual)', 'なんか is a casual “things like” or “or something,” often downplaying.', ''],
    'など': ['“and so on”', 'など means “and so on” or “things like,” closing a list of examples.', ''],
    'だけ': ['“only / just”', 'だけ means “only” or “just” and works with positive and negative verbs: 一つだけ (just one).', 'しか + a negative verb is a stronger “only.”'],
    'かも': ['“maybe”', 'かも, short for かもしれない, means “maybe” or “might.”', ''],
    'くらい': ['“about / at least”', 'くらい means “about” with numbers, or “to the extent that / at least.”', ''],
    'ぐらい': ['“about / at least”', 'ぐらい means “about” with numbers, or “to the extent that / at least.”', ''],
    'ばかり': ['“nothing but” / “just did”', 'ばかり means “nothing but” (遊んでばかり), or after a past verb, “just did” (食べたばかり).', ''],
    'じゃ': ['contraction of では', 'じゃ is the casual form of では: 学生じゃない = 学生ではない.', ''],
    'ずつ': ['“each / at a time”', 'ずつ after a quantity means “each” or “at a time”: 一つずつ.', ''],
    'とも': ['“both / all”', 'とも after a number means “both” or “all”: 二人とも (both of them).', ''],
    'だって': ['“even” (casual)', 'だって is a casual “even” (子どもだって), or at the start of a reply, “but” or “because.”', ''],
    'によって': ['“by” · “depending on”', 'によって marks who does the action in a passive sentence (“by”), a means, or variation: 人によって違う (it differs from person to person).', ''],
    'について': ['“about”', 'について means “about” or “concerning”: 日本について話す.', ''],
    'として': ['“as”', 'として means “as” or “in the role of”: 先生として働く (work as a teacher).', ''],
    'にとって': ['“for” (viewpoint)', 'にとって means “for” or “from the standpoint of”: 私にとって大切だ (it is important to me).', ''],
    'に対して': ['“toward” · contrast', 'に対して marks the target of an attitude or action (“toward”), or sets up a contrast.', ''],
    'に関して': ['“regarding”', 'に関して is a formal “regarding” or “concerning.”', ''],
    'における': ['“in / at” (formal)', 'における is a formal “in” or “at” that comes before a noun: 日本における教育.', ''],
    'という': ['“called” / “that says”', 'という means “called” or “named,” or links content to a noun: 田中という人 (a person called Tanaka).', ''],
    'って': ['casual quote or topic', 'って is a casual quotation marker (like と) or topic marker (like は).', ''],
    'につき': ['“per” · “due to”', 'につき means “per” (一人につき, per person) or, formally, “due to.”', ''],
    'とともに': ['“together with”', 'とともに means “together with,” or “along with” a change.', ''],
    'につれて': ['“as …” (gradual change)', 'につれて links two gradual changes: 年をとるにつれて (as one grows older).', ''],
    'にわたる': ['“over / spanning”', 'にわたる means “spanning” or “over” a period or range: 三日にわたる会議 (a three-day meeting).', ''],
    'にゃ': ['contraction', 'にゃ is a casual contraction of には.', ''],
    'に|副詞化': ['makes an adverb', 'This に turns the word before it into an adverb: 静かに (quietly), 本当に (really).', ''],
    'たり': ['listing actions', '〜たり〜たりする lists a few representative actions: 本を読んだり音楽を聞いたりする (do things like reading and listening to music).', ''],
    'ながら': ['“while”', 'ながら after a ます-stem means “while doing”: two actions by the same person at the same time.', 'The main action comes after ながら.'],
    'し': ['“and also” (reasons)', 'し lists reasons or points one after another: 安いし、おいしい (it’s cheap, and it’s tasty too).', ''],
    'とか': ['“things like”', 'とか lists examples casually: 本とか雑誌 (books, magazines, and so on).', ''],
    'のみ': ['“only” (formal)', 'のみ is a formal, written “only.”', ''],
    'ねぇ': ['emphatic ね', 'ねぇ is an emphatic ね that seeks agreement with feeling.', ''],
    'に関する': ['“about” (before a noun)', 'に関する is the form of に関して used before a noun: 環境に関する問題 (problems concerning the environment).', ''],
    'に対する': ['“toward” (before a noun)', 'に対する is the form of に対して used before a noun: 親に対する感謝 (gratitude toward one’s parents).', ''],
    'において': ['“in / at” (formal)', 'において is a formal “in” or “at” for a place, time, or field.', ''],
    'により': ['“by / due to” (formal)', 'により is a formal によって: “by,” “because of,” or “depending on.”', ''],
    'に従って': ['“as / in accordance with”', 'に従って means “in accordance with,” or “as …” for a linked change.', ''],
    'にかけて': ['“through / over” (a span)', 'から〜にかけて marks a rough span of time or space: 夜から朝にかけて (from night into the morning).', '']
  });

  const QUESTION_WORDS = ['何', 'なに', 'なん', '誰', 'だれ', 'どこ', 'いつ', 'どう', 'どれ', 'どの', 'なぜ', 'どちら', 'いくら', 'いくつ'];

  function particleDetails(answer, group, before, after) {
    if (answer === 'か') {
      const atEnd = !after || /^[。？！?!」』、\s]/u.test(after);
      if (QUESTION_WORDS.some((word) => before.endsWith(word))) return ['makes a question word indefinite', 'After a question word, か makes it indefinite: 何か (something), だれか (someone), どこか (somewhere).', ''];
      if (atEnd) return ['question marker', 'At the end of a sentence, か turns it into a question. It works like a spoken question mark.', 'In casual speech the question is often shown by rising intonation instead.'];
      return ['“or” / embedded question', 'Inside a sentence, か means “or” between choices (紅茶かコーヒー), or wraps a question inside a larger sentence: どこにあるか知らない (I don’t know where it is).', ''];
    }
    return PARTICLES[`${answer}|${group}`] || PARTICLES[answer] || null;
  }

  function attachmentText(answer, group, previous, after) {
    const word = previous || 'the word before it';
    const atEnd = !after || /^[。？！?!」』\s]/u.test(after);
    if (group === '終助詞' || (answer === 'か' && atEnd)) return `${answer} follows ${word} at the end of the sentence and sets the tone of the whole statement.`;
    if (group === '接続助詞') return `${answer} follows ${word} and joins this clause to what comes next.`;
    if (group === '連体化') return `${answer} links ${word} to the noun that follows it.`;
    if (group === '並立助詞') return `${answer} joins ${word} to the next item in the list.`;
    if (group === '副詞化') return `${answer} turns ${word} into an adverb.`;
    return `${answer} comes right after ${word} and marks its role in the sentence.`;
  }

  function particle(entry) {
    const sentence = String(entry.sentence || '');
    const answer = String(entry.answer || '');
    const blankIndex = String(entry.blank || '').indexOf('＿＿');
    const valid = blankIndex >= 0 && sentence.slice(blankIndex, blankIndex + answer.length) === answer;
    const before = valid ? sentence.slice(0, blankIndex) : '';
    const after = valid ? sentence.slice(blankIndex + answer.length) : '';
    const [groupName, groupNote] = GROUP_NOTES[entry.group] || [entry.groupLabel || 'particle', ''];
    const details = particleDetails(answer, entry.group, before, after);
    let previous = valid ? precedingWord(sentence, blankIndex) : '';
    if (/^(さん|さま|様|くん|君|ちゃん|たち|達|ら)$/u.test(previous)) previous = `${precedingWord(sentence, blankIndex - previous.length)}${previous}`;
    const said = { は: 'said “wa”', へ: 'said “e”', を: 'said “o”' }[answer];
    const pronunciation = said && ['係助詞', '格助詞'].includes(entry.group) ? ` · ${said}` : '';
    return {
      focus: {
        label: 'FOCUS',
        title: answer,
        detail: `${capitalize(details?.[0] || groupName)} · ${entry.group ? `${entry.group}, ` : ''}${groupName}${pronunciation}`
      },
      role: {
        label: 'IN THIS SENTENCE',
        title: previous ? `${previous} ＋ ${answer}` : answer,
        detail: attachmentText(answer, entry.group, previous, after)
      },
      note: {
        label: 'WHAT IT DOES',
        paragraphs: [details?.[1] || `${answer} works here as a ${groupName}. ${groupNote}`.trim()],
        tip: details?.[2] || (details ? groupNote : '')
      }
    };
  }

  /* ----------------------------------------------- grammar, listening, order */

  function grammar(rule, example = {}, pattern = '') {
    const sentence = String(example.ja || '');
    const forms = String(pattern || rule.pattern || '').split('/').map((part) => part.replace(/[〜～\s]/g, '')).filter(Boolean);
    let snippet = '';
    for (const form of forms) {
      const index = sentence.indexOf(form);
      if (index < 0) continue;
      snippet = `${precedingWord(sentence, index)}${form}`;
      break;
    }
    const others = (rule.examples || []).filter((item) => item?.ja && item.ja !== sentence).slice(0, 2);
    return {
      focus: { label: 'FOCUS', title: pattern || rule.pattern, detail: rule.meaning ? `${capitalize(rule.meaning)}.` : '' },
      role: { label: 'FORMATION', title: rule.form || 'See the example', detail: snippet ? `In this sentence: ${snippet}` : (rule.level ? `A JLPT ${rule.level} pattern.` : '') },
      note: {
        label: 'USAGE NOTE',
        paragraphs: [rule.explanation || `${pattern || rule.pattern} expresses “${rule.meaning}”.`],
        pointsLabel: others.length ? 'More examples' : '',
        points: others.map((item) => ({ jp: item.ja, text: item.en || '' })),
        tip: (rule.tags || []).length ? `Topics: ${rule.tags.join(', ')}.` : ''
      }
    };
  }

  function listening({ prompt = '', answer = '', pattern = '', meaning = '', hasQuestion = false } = {}) {
    return {
      focus: hasQuestion
        ? { label: 'FOCUS', title: answer, detail: `Answers the question: “${prompt}”` }
        : { label: 'FOCUS', title: pattern || 'Overall meaning', detail: meaning ? `Grammar heard in this clip: ${meaning}. Catch what the whole sentence says, not single words.` : 'Catch what the whole sentence says, not single words.' },
      role: { label: 'LISTEN FOR', title: 'Predicate · particles · time words', detail: 'The verb or です at the end says what happens; particles tell you who, what, and where.' },
      note: {
        label: 'LISTENING TIP',
        paragraphs: [hasQuestion
          ? `The answer is “${answer}”. Read the Japanese line above and find the words that give that detail, then replay the audio and listen for them.`
          : 'Listen once for the situation. Then replay and follow the Japanese line: find the predicate at the end and the words joined to it by particles.'],
        tip: 'Replay as often as you like. Shadowing the sentence aloud helps you remember its rhythm.'
      }
    };
  }

  function ordering({ provider = 'MyMemory', tokens = 0 } = {}) {
    return {
      focus: { label: 'FOCUS', title: 'Natural Japanese word order', detail: `${tokens ? `${tokens} tiles · ` : ''}translation by ${provider}` },
      role: { label: 'WORD ORDER', title: 'Topic → details → verb', detail: 'Japanese is verb-final: the main verb, adjective, or です comes last.' },
      note: {
        label: 'WHY THIS ORDER',
        paragraphs: ['Particles such as は, が, を, and に mark the role of each phrase, so phrases before the verb can move around. The verb at the end carries tense and politeness.'],
        tip: 'Check that each particle stays attached to the word in front of it.'
      }
    };
  }

  window.KUMO_GUIDE = Object.freeze({
    align,
    grammar,
    kanji,
    kanjiExample,
    listening,
    ordering,
    particle,
    pieceFor,
    readingTag,
    vocabulary,
    wordClass
  });
})();
