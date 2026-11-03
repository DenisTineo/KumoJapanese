(() => {
  'use strict';

  const FORM_DEFINITIONS = Object.freeze({
    politeNonPast: { label: 'polite non-past (〜ます)', prompt: 'polite non-past form' },
    politePast: { label: 'polite past (〜ました)', prompt: 'polite past tense' },
    politeNegative: { label: 'polite negative (〜ません)', prompt: 'polite negative form' },
    plainPast: { label: 'plain past (〜た)', prompt: 'plain past tense' },
    plainNegative: { label: 'plain negative (〜ない)', prompt: 'plain negative form' },
    teForm: { label: 'て-form', prompt: 'て-form' },
    plainNegativePast: { label: 'plain negative past (〜なかった)', prompt: 'plain negative past tense' },
    politeNegativePast: { label: 'polite negative past (〜ませんでした)', prompt: 'polite negative past tense' },
    potential: { label: 'potential form', prompt: 'potential form (“can do”)' },
    volitional: { label: 'volitional form', prompt: 'volitional form (“let’s / intend to”)' },
    taraConditional: { label: 'たら conditional', prompt: 'たら conditional form' },
    desire: { label: 'desire form (〜たい)', prompt: 'desire form (“want to do”)' },
    progressive: { label: 'progressive (〜ている)', prompt: 'progressive form (“is doing”)' },
    passive: { label: 'passive form', prompt: 'passive form' },
    causative: { label: 'causative form', prompt: 'causative form (“make / let do”)' },
    imperative: { label: 'plain imperative', prompt: 'plain imperative form' },
    baConditional: { label: 'ば conditional', prompt: 'ば conditional form' },
    causativePassive: { label: 'causative-passive form', prompt: 'causative-passive form (“be made to do”)' }
  });

  const LEVEL_FORMS = Object.freeze({
    N5: ['politeNonPast', 'politePast', 'politeNegative', 'plainPast', 'plainNegative', 'teForm'],
    N4: ['politeNonPast', 'politePast', 'politeNegative', 'plainPast', 'plainNegative', 'teForm', 'plainNegativePast', 'politeNegativePast', 'potential', 'volitional', 'taraConditional', 'desire', 'progressive'],
    N3: ['politeNonPast', 'politePast', 'politeNegative', 'plainPast', 'plainNegative', 'teForm', 'plainNegativePast', 'politeNegativePast', 'potential', 'volitional', 'taraConditional', 'desire', 'progressive', 'passive', 'causative', 'imperative', 'baConditional'],
    N2: Object.keys(FORM_DEFINITIONS),
    N1: Object.keys(FORM_DEFINITIONS)
  });

  const GODAN = Object.freeze({
    'う': { i: 'い', a: 'わ', e: 'え', o: 'お', te: 'って', past: 'った' },
    'く': { i: 'き', a: 'か', e: 'け', o: 'こ', te: 'いて', past: 'いた' },
    'ぐ': { i: 'ぎ', a: 'が', e: 'げ', o: 'ご', te: 'いで', past: 'いだ' },
    'す': { i: 'し', a: 'さ', e: 'せ', o: 'そ', te: 'して', past: 'した' },
    'つ': { i: 'ち', a: 'た', e: 'て', o: 'と', te: 'って', past: 'った' },
    'ぬ': { i: 'に', a: 'な', e: 'ね', o: 'の', te: 'んで', past: 'んだ' },
    'ぶ': { i: 'び', a: 'ば', e: 'べ', o: 'ぼ', te: 'んで', past: 'んだ' },
    'む': { i: 'み', a: 'ま', e: 'め', o: 'も', te: 'んで', past: 'んだ' },
    'る': { i: 'り', a: 'ら', e: 'れ', o: 'ろ', te: 'って', past: 'った' }
  });

  function form(value, reading, rule) {
    return { value, reading, rule };
  }

  function classCode(entry) {
    const pos = entry.pos || [];
    if (pos.includes('vk')) return 'vk';
    if (pos.includes('v1-s')) return 'v1-s';
    if (pos.includes('v1')) return 'v1';
    const godan = pos.find((code) => /^v5/.test(code));
    if (godan) return godan;
    if (pos.includes('vz')) return 'vz';
    if (pos.includes('vs-s')) return 'vs-s';
    if (pos.includes('vs-i')) return 'vs-i';
    if (pos.includes('vs')) return 'vs';
    return null;
  }

  function conjugateIchidan(dictionary, reading, code) {
    if (!dictionary.endsWith('る') || !reading.endsWith('る')) return null;
    const base = dictionary.slice(0, -1);
    const readBase = reading.slice(0, -1);
    const add = (suffix) => [base + suffix, readBase + suffix];
    const forms = {};
    let pair = add('ます'); forms.politeNonPast = form(...pair, 'Remove the final る and add ます.');
    pair = add('ました'); forms.politePast = form(...pair, 'Remove the final る and add ました.');
    pair = add('ません'); forms.politeNegative = form(...pair, 'Remove the final る and add ません.');
    pair = add('た'); forms.plainPast = form(...pair, 'Remove the final る and add た.');
    pair = add('ない'); forms.plainNegative = form(...pair, 'Remove the final る and add ない.');
    pair = add('て'); forms.teForm = form(...pair, 'Remove the final る and add て.');
    pair = add('なかった'); forms.plainNegativePast = form(...pair, 'Build the ない-form, then change ない to なかった.');
    pair = add('ませんでした'); forms.politeNegativePast = form(...pair, 'Remove the final る and add ませんでした.');
    pair = add('られる'); forms.potential = form(...pair, 'Remove the final る and add られる.');
    pair = add('よう'); forms.volitional = form(...pair, 'Remove the final る and add よう.');
    pair = add('たら'); forms.taraConditional = form(...pair, 'Build the plain past form and add ら.');
    pair = add('たい'); forms.desire = form(...pair, 'Use the ます-stem and add たい.');
    pair = add('ている'); forms.progressive = form(...pair, 'Use the て-form followed by いる.');
    pair = add('られる'); forms.passive = form(...pair, 'Remove the final る and add られる. The surface form matches the potential form for ichidan verbs.');
    pair = add('させる'); forms.causative = form(...pair, 'Remove the final る and add させる.');
    pair = add('ろ'); forms.imperative = form(...pair, 'Remove the final る and add ろ.');
    pair = add('れば'); forms.baConditional = form(...pair, 'Remove the final る and add れば.');
    pair = add('させられる'); forms.causativePassive = form(...pair, 'Remove the final る and add させられる.');
    return { dictionary, reading, classCode: code, classLabel: code === 'v1-s' ? 'ichidan verb (くれる special class)' : 'ichidan verb', forms };
  }

  function conjugateGodan(dictionary, reading, code) {
    const ending = dictionary.at(-1);
    const readEnding = reading.at(-1);
    const table = GODAN[ending];
    const readTable = GODAN[readEnding];
    if (!table || !readTable) return null;
    const base = dictionary.slice(0, -1);
    const readBase = reading.slice(0, -1);
    const pair = (writtenSuffix, readingSuffix = writtenSuffix) => [base + writtenSuffix, readBase + readingSuffix];
    let te = table.te;
    let past = table.past;
    let readTe = readTable.te;
    let readPast = readTable.past;
    if (code === 'v5k-s') { te = 'って'; past = 'った'; readTe = 'って'; readPast = 'った'; }
    if (code === 'v5u-s') { te = 'うて'; past = 'うた'; readTe = 'うて'; readPast = 'うた'; }
    const negative = code === 'v5r-i' && dictionary === 'ある' ? ['ない', 'ない'] : pair(table.a + 'ない', readTable.a + 'ない');
    const negativePast = code === 'v5r-i' && dictionary === 'ある' ? ['なかった', 'なかった'] : pair(table.a + 'なかった', readTable.a + 'なかった');
    const forms = {};
    let value = pair(table.i + 'ます', readTable.i + 'ます'); forms.politeNonPast = form(...value, `Change final ${ending} to the い-row (${table.i}) and add ます.`);
    value = pair(table.i + 'ました', readTable.i + 'ました'); forms.politePast = form(...value, `Change final ${ending} to ${table.i} and add ました.`);
    value = pair(table.i + 'ません', readTable.i + 'ません'); forms.politeNegative = form(...value, `Change final ${ending} to ${table.i} and add ません.`);
    value = pair(past, readPast); forms.plainPast = form(...value, code === 'v5k-s' ? '行く is exceptional: change く to った.' : code === 'v5u-s' ? `This special う-verb changes final ${ending} to うた.` : `Change final ${ending} to ${past}.`);
    forms.plainNegative = form(...negative, code === 'v5r-i' && dictionary === 'ある' ? 'ある has the irregular negative ない.' : `Change final ${ending} to the あ-row (${table.a}) and add ない.`);
    value = pair(te, readTe); forms.teForm = form(...value, code === 'v5k-s' ? '行く is exceptional: change く to って.' : code === 'v5u-s' ? `This special う-verb changes final ${ending} to うて.` : `Change final ${ending} to ${te}.`);
    forms.plainNegativePast = form(...negativePast, code === 'v5r-i' && dictionary === 'ある' ? 'The negative past of ある is なかった.' : 'Build the ない-form, then change ない to なかった.');
    value = pair(table.i + 'ませんでした', readTable.i + 'ませんでした'); forms.politeNegativePast = form(...value, `Change final ${ending} to ${table.i} and add ませんでした.`);
    value = pair(table.e + 'る', readTable.e + 'る'); forms.potential = form(...value, `Change final ${ending} to the え-row (${table.e}) and add る.`);
    value = pair(table.o + 'う', readTable.o + 'う'); forms.volitional = form(...value, `Change final ${ending} to the お-row (${table.o}) and add う.`);
    value = pair(past + 'ら', readPast + 'ら'); forms.taraConditional = form(...value, 'Build the plain past form and add ら.');
    value = pair(table.i + 'たい', readTable.i + 'たい'); forms.desire = form(...value, 'Use the ます-stem and add たい.');
    value = pair(te + 'いる', readTe + 'いる'); forms.progressive = form(...value, 'Use the て-form followed by いる.');
    value = pair(table.a + 'れる', readTable.a + 'れる'); forms.passive = form(...value, `Change final ${ending} to ${table.a} and add れる.`);
    value = pair(table.a + 'せる', readTable.a + 'せる'); forms.causative = form(...value, `Change final ${ending} to ${table.a} and add せる.`);
    value = pair(table.e, readTable.e); forms.imperative = form(...value, `Change final ${ending} to the え-row (${table.e}).`);
    value = pair(table.e + 'ば', readTable.e + 'ば'); forms.baConditional = form(...value, `Change final ${ending} to ${table.e} and add ば.`);
    value = pair(table.a + 'せられる', readTable.a + 'せられる'); forms.causativePassive = form(...value, `Change final ${ending} to ${table.a} and add せられる.`);
    if (code === 'v5r-i' && dictionary === 'ある') {
      delete forms.potential; delete forms.passive; delete forms.causative; delete forms.causativePassive;
    }
    return { dictionary, reading, classCode: code, classLabel: code === 'v5aru' ? 'honorific godan -aru verb' : `godan verb ending in ${ending}`, forms };
  }

  function conjugateAruHonorific(dictionary, reading) {
    if (!dictionary.endsWith('る') || !reading.endsWith('る')) return null;
    const base = dictionary.slice(0, -1);
    const readBase = reading.slice(0, -1);
    const pair = (suffix) => [base + suffix, readBase + suffix];
    const forms = {};
    let value = pair('います'); forms.politeNonPast = form(...value, 'Honorific 〜る verbs use the irregular polite ending 〜います.');
    value = pair('いました'); forms.politePast = form(...value, 'Use the honorific polite stem 〜い and add ました.');
    value = pair('いません'); forms.politeNegative = form(...value, 'Use the honorific polite stem 〜い and add ません.');
    value = pair('った'); forms.plainPast = form(...value, 'The plain past follows the godan る pattern: る becomes った.');
    value = pair('らない'); forms.plainNegative = form(...value, 'Change final る to ら and add ない.');
    value = pair('って'); forms.teForm = form(...value, 'Change final る to って.');
    value = pair('らなかった'); forms.plainNegativePast = form(...value, 'Build the ない-form, then change ない to なかった.');
    value = pair('いませんでした'); forms.politeNegativePast = form(...value, 'Use the honorific polite stem 〜い and add ませんでした.');
    value = pair('ろう'); forms.volitional = form(...value, 'Change final る to ろう.');
    value = pair('ったら'); forms.taraConditional = form(...value, 'Build the plain past form and add ら.');
    value = pair('っている'); forms.progressive = form(...value, 'Use the て-form followed by いる.');
    value = pair('れば'); forms.baConditional = form(...value, 'Change final る to れば.');
    return { dictionary, reading, classCode: 'v5aru', classLabel: 'honorific godan -aru verb', forms };
  }

  function conjugateSuru(entry, code) {
    const alreadySuru = entry.word.endsWith('する');
    const dictionary = alreadySuru ? entry.word : `${entry.word}する`;
    const reading = entry.reading.endsWith('する') ? entry.reading : `${entry.reading}する`;
    const base = dictionary.slice(0, -2);
    const readBase = reading.slice(0, -2);
    const pair = (suffix) => [base + suffix, readBase + suffix];
    const forms = {};
    let value = pair('します'); forms.politeNonPast = form(...value, 'Replace する with します.');
    value = pair('しました'); forms.politePast = form(...value, 'Replace する with しました.');
    value = pair('しません'); forms.politeNegative = form(...value, 'Replace する with しません.');
    value = pair('した'); forms.plainPast = form(...value, 'Replace する with した.');
    value = pair('しない'); forms.plainNegative = form(...value, 'Replace する with しない.');
    value = pair('して'); forms.teForm = form(...value, 'Replace する with して.');
    value = pair('しなかった'); forms.plainNegativePast = form(...value, 'Build the しない-form, then change ない to なかった.');
    value = pair('しませんでした'); forms.politeNegativePast = form(...value, 'Replace する with しませんでした.');
    if (code === 'vs-s') value = pair('せる');
    else value = base ? pair('できる') : ['できる', 'できる'];
    forms.potential = form(...value, code === 'vs-s' ? 'For this special する verb, replace する with せる.' : 'The potential of する is できる; in compounds, replace する with できる.');
    if (code === 'vs-i' && base) delete forms.potential;
    value = pair('しよう'); forms.volitional = form(...value, 'Replace する with しよう.');
    value = pair('したら'); forms.taraConditional = form(...value, 'Build the plain past した and add ら.');
    value = pair('したい'); forms.desire = form(...value, 'Use the ます-stem し and add たい.');
    value = pair('している'); forms.progressive = form(...value, 'Use the て-form して followed by いる.');
    value = pair('される'); forms.passive = form(...value, 'Replace する with される.');
    value = pair('させる'); forms.causative = form(...value, 'Replace する with させる.');
    value = pair('しろ'); forms.imperative = form(...value, 'Replace する with しろ.');
    value = pair('すれば'); forms.baConditional = form(...value, 'Replace する with すれば.');
    value = pair('させられる'); forms.causativePassive = form(...value, 'Replace する with させられる.');
    return { dictionary, reading, classCode: code, classLabel: 'する irregular verb', forms };
  }

  function conjugateKuru() {
    return {
      dictionary: '来る', reading: 'くる', classCode: 'vk', classLabel: '来る irregular verb',
      forms: {
        politeNonPast: form('来ます', 'きます', '来る changes to the き-stem before ます.'),
        politePast: form('来ました', 'きました', '来る changes to the き-stem before ました.'),
        politeNegative: form('来ません', 'きません', '来る changes to the き-stem before ません.'),
        plainPast: form('来た', 'きた', 'The irregular plain past of 来る is 来た（きた）.'),
        plainNegative: form('来ない', 'こない', 'The irregular negative of 来る is 来ない（こない）.'),
        teForm: form('来て', 'きて', 'The irregular て-form of 来る is 来て（きて）.'),
        plainNegativePast: form('来なかった', 'こなかった', 'Build 来ない（こない）, then change ない to なかった.'),
        politeNegativePast: form('来ませんでした', 'きませんでした', 'Use the き-stem followed by ませんでした.'),
        potential: form('来られる', 'こられる', 'The potential form is 来られる（こられる）.'),
        volitional: form('来よう', 'こよう', 'The volitional form is 来よう（こよう）.'),
        taraConditional: form('来たら', 'きたら', 'Build 来た（きた）and add ら.'),
        desire: form('来たい', 'きたい', 'Use the き-stem and add たい.'),
        progressive: form('来ている', 'きている', 'Use 来て（きて）followed by いる.'),
        passive: form('来られる', 'こられる', 'The passive form is 来られる（こられる）, identical in form to the potential.'),
        causative: form('来させる', 'こさせる', 'The causative form is 来させる（こさせる）.'),
        imperative: form('来い', 'こい', 'The plain imperative is 来い（こい）.'),
        baConditional: form('来れば', 'くれば', 'The ば conditional is 来れば（くれば）.'),
        causativePassive: form('来させられる', 'こさせられる', 'The causative-passive is 来させられる（こさせられる）.')
      }
    };
  }

  function conjugateZuru(dictionary, reading) {
    if (!dictionary.endsWith('ずる') || !reading.endsWith('ずる')) return null;
    const base = dictionary.slice(0, -2);
    const readBase = reading.slice(0, -2);
    const pair = (suffix) => [base + suffix, readBase + suffix];
    const forms = {};
    let value = pair('じます'); forms.politeNonPast = form(...value, 'Replace ずる with じます.');
    value = pair('じました'); forms.politePast = form(...value, 'Replace ずる with じました.');
    value = pair('じません'); forms.politeNegative = form(...value, 'Replace ずる with じません.');
    value = pair('じた'); forms.plainPast = form(...value, 'Replace ずる with じた.');
    value = pair('じない'); forms.plainNegative = form(...value, 'Replace ずる with じない.');
    value = pair('じて'); forms.teForm = form(...value, 'Replace ずる with じて.');
    value = pair('じなかった'); forms.plainNegativePast = form(...value, 'Build the じない-form, then change ない to なかった.');
    value = pair('じませんでした'); forms.politeNegativePast = form(...value, 'Replace ずる with じませんでした.');
    value = pair('じられる'); forms.potential = form(...value, 'Replace ずる with じられる.');
    value = pair('じよう'); forms.volitional = form(...value, 'Replace ずる with じよう.');
    value = pair('じたら'); forms.taraConditional = form(...value, 'Build the plain past form and add ら.');
    value = pair('じたい'); forms.desire = form(...value, 'Use the じ-stem and add たい.');
    value = pair('じている'); forms.progressive = form(...value, 'Use the て-form followed by いる.');
    value = pair('じられる'); forms.passive = form(...value, 'Replace ずる with じられる.');
    value = pair('じさせる'); forms.causative = form(...value, 'Replace ずる with じさせる.');
    value = pair('じろ'); forms.imperative = form(...value, 'Replace ずる with じろ.');
    value = pair('ずれば'); forms.baConditional = form(...value, 'Replace ずる with ずれば.');
    value = pair('じさせられる'); forms.causativePassive = form(...value, 'Replace ずる with じさせられる.');
    return { dictionary, reading, classCode: 'vz', classLabel: '〜ずる verb', forms };
  }

  function conjugate(entry) {
    const code = classCode(entry);
    if (!code) return null;
    let result;
    if (code === 'vk') result = conjugateKuru();
    else if (code === 'v1' || code === 'v1-s') result = conjugateIchidan(entry.word, entry.reading, code);
    else if (code === 'v5aru') result = conjugateAruHonorific(entry.word, entry.reading);
    else if (code.startsWith('v5')) result = conjugateGodan(entry.word, entry.reading, code);
    else if (code === 'vz') result = conjugateZuru(entry.word, entry.reading);
    else result = conjugateSuru(entry, code);
    return result ? { id: entry.id, level: entry.level, meaning: entry.meanings?.[0] || entry.meaning, sourceWord: entry.word, ...result } : null;
  }

  function availableForms(level, conjugation) {
    return (LEVEL_FORMS[level] || LEVEL_FORMS.N5).filter((key) => conjugation.forms[key]).map((key) => ({ key, ...FORM_DEFINITIONS[key], ...conjugation.forms[key] }));
  }

  window.KUMO_CONJUGATOR = Object.freeze({ FORM_DEFINITIONS, LEVEL_FORMS, conjugate, availableForms, classCode });
})();
