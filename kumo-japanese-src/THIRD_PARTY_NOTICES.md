# Third-Party Data Notices

## OpenJLPT 0.3.0

Kumo Japanese contains a transformed copy of [OpenJLPT](https://github.com/evanclan/OpenJLPT) revision `0d1d3410bec90bd4098a7c72de820543cb4f707c`, licensed under [CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/).

The transformed datasets are stored in `src/corpus.js` and `src/particles.js`. Kumo renames corpus fields for its renderer, joins glosses for compact display, resolves kanji example words against vocabulary entries, maps parts of speech into study categories, preserves legacy Kumo IDs where entries match, and uses kuromoji 0.1.2 at build time to identify one grammatical particle in each selected example sentence. The transformed datasets remain available under CC BY-SA 4.0.

OpenJLPT incorporates:

- Jonathan Waller's JLPT Resources for community-standard N5–N1 level assignments and vocabulary glosses, licensed CC BY.
- JMdict and KANJIDIC2 from the Electronic Dictionary Research and Development Group (EDRDG), licensed CC BY-SA 4.0.
- Tatoeba Japanese and English example sentences, licensed CC BY 2.0 FR; individual examples retain their Tatoeba sentence IDs.
- Original OpenJLPT grammar explanations, examples, notes, and corrections, licensed CC BY-SA 4.0.

The full OpenJLPT license is included at `licenses/OpenJLPT-CC-BY-SA-4.0.txt`.

## JLPT level status

The Japan Foundation and JEES have not published fixed vocabulary, kanji, or grammar lists for the current five-level JLPT since its 2010 revision. Kumo therefore describes this data as comprehensive JLPT-aligned community coverage rather than an official syllabus.

## KanjiVG

Kumo Japanese contains a transformed subset of [KanjiVG](https://github.com/KanjiVG/kanjivg) revision `70a0b7ae0c18ceb5cb358274b029cce0234a43bc`, copyright Ulrich Apel and KanjiVG contributors, licensed under [CC BY-SA 3.0](https://creativecommons.org/licenses/by-sa/3.0/).

The transformed stroke dataset is stored in `src/strokes.js`. Kumo extracts ordered SVG path geometry and stroke-number coordinates for the 2,383 kanji in its OpenJLPT corpus, converts the per-character SVG files into a single JavaScript lookup, and adds runtime presentation styles for stepping and animation. The transformed stroke-path data remains available under CC BY-SA 3.0.

The complete KanjiVG license is included at `licenses/KanjiVG-CC-BY-SA-3.0.txt`.
