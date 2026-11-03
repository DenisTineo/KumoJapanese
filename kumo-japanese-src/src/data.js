(() => {
  'use strict';

  const lessonTypes = ['lesson', 'vocabulary', 'grammar', 'immersion', 'checkpoint'];
  const lessonMinutes = [8, 10, 12, 12, 18];

  function unit(id, title, japanese, description, topics) {
    return {
      id,
      title,
      japanese,
      description,
      lessons: topics.map((topic, index) => ({
        id: `${id}-l${index + 1}`,
        title: topic,
        type: lessonTypes[index],
        minutes: lessonMinutes[index]
      }))
    };
  }

  const levels = {
    N5: {
      name: 'Foundation',
      japanese: '基礎',
      color: '#9b7cff',
      softColor: '#c7b9ff',
      summary: 'Build your sound, script, and sentence foundations for everyday Japanese.',
      target: 'Understand familiar phrases and very simple conversations.',
      guide: { kanji: '≈100', words: '≈800', study: '250–450 h', pace: '3–5 months' },
      units: [
        unit('n5-u1', 'Meet Japanese', 'はじめまして', 'Master the sound system and make your first introduction.', ['Hiragana beginnings', 'Greetings & names', 'The です sentence', 'Listen: first meetings', 'Foundations checkpoint']),
        unit('n5-u2', 'People & things', 'これは何ですか', 'Identify objects, people, places, and possession.', ['Katakana essentials', 'People & objects', 'Particles は・の・も', 'Read: my classroom', 'People checkpoint']),
        unit('n5-u3', 'Daily rhythm', '毎日の生活', 'Talk about time, routines, food, and preferences.', ['Numbers & time', 'Everyday actions', 'を・に・で particles', 'Listen: a daily routine', 'Routine checkpoint']),
        unit('n5-u4', 'Town & travel', '町へ行きましょう', 'Navigate town, shop, and make simple requests.', ['Places & directions', 'Transport & shopping', 'て-form requests', 'Read: station signs', 'Travel checkpoint']),
        unit('n5-u5', 'N5 summit', 'できる！', 'Combine core grammar, vocabulary, kanji, and exam skills.', ['Essential kanji', 'Adjectives & comparison', 'Past and negative forms', 'N5 listening sprint', 'N5 mastery test'])
      ]
    },
    N4: {
      name: 'Elementary',
      japanese: '初級',
      color: '#38cfa2',
      softColor: '#97eed3',
      summary: 'Connect ideas, tell stories, and handle daily life with confidence.',
      target: 'Follow everyday passages and conversations spoken at a modest pace.',
      guide: { kanji: '≈300', words: '≈1,500', study: '550–800 h', pace: '5–8 months' },
      units: [
        unit('n4-u1', 'Tell your story', '私の物語', 'Describe experiences, sequences, and changing states.', ['Experience with ことがある', 'Life events', 'て-form connections', 'Listen: weekend story', 'Story checkpoint']),
        unit('n4-u2', 'Plans & permission', '予定とルール', 'Discuss intentions, obligations, permission, and advice.', ['Plans and intentions', 'Rules & permission', 'なければならない', 'Read: house rules', 'Plans checkpoint']),
        unit('n4-u3', 'Connected speech', 'もっと自然に', 'Build longer, smoother sentences with useful connectors.', ['While doing ながら', 'Reasons & contrasts', 'Giving and receiving', 'Listen: asking a favor', 'Connection checkpoint']),
        unit('n4-u4', 'Life in Japan', '日本での生活', 'Handle health, work, study, and practical problems.', ['Health & symptoms', 'School and work', 'Potential form', 'Read: a clinic notice', 'Daily-life checkpoint']),
        unit('n4-u5', 'N4 summit', '次のステップ', 'Strengthen speed, recall, and integrated comprehension.', ['N4 kanji families', 'Transitive pairs', 'Reported speech そうだ', 'N4 listening sprint', 'N4 mastery test'])
      ]
    },
    N3: {
      name: 'Intermediate',
      japanese: '中級',
      color: '#ffb84a',
      softColor: '#ffd48f',
      summary: 'Move from textbook Japanese into natural conversation and real media.',
      target: 'Understand everyday Japanese and grasp headlines and coherent narratives.',
      guide: { kanji: '≈650', words: '≈3,700', study: '900–1,325 h', pace: '8–12 months' },
      units: [
        unit('n3-u1', 'Natural conversation', '自然な会話', 'Use contractions, reactions, and context-sensitive phrasing.', ['Casual contractions', 'Reactions & fillers', 'Expectation わけ', 'Listen: friends deciding', 'Conversation checkpoint']),
        unit('n3-u2', 'Thoughts & nuance', '考えとニュアンス', 'Express inference, uncertainty, purpose, and perspective.', ['Inference らしい・ようだ', 'Opinions & feelings', 'Purpose and outcome', 'Read: advice column', 'Nuance checkpoint']),
        unit('n3-u3', 'Work & society', '仕事と社会', 'Discuss systems, responsibilities, trends, and change.', ['Workplace language', 'Cause and effect', 'Passive & causative', 'Listen: office update', 'Society checkpoint']),
        unit('n3-u4', 'Real-world media', 'リアルな日本語', 'Decode notices, articles, announcements, and narratives.', ['Headlines & notices', 'Media vocabulary', 'Relative clauses', 'Read: local news', 'Media checkpoint']),
        unit('n3-u5', 'N3 summit', '中級突破', 'Build the timing and inference skills needed for N3.', ['N3 kanji networks', 'Grammar contrast lab', 'Timed reading', 'N3 listening sprint', 'N3 mastery test'])
      ]
    },
    N2: {
      name: 'Upper intermediate',
      japanese: '中上級',
      color: '#ff6f91',
      softColor: '#ffb0c2',
      summary: 'Read, listen, and respond precisely in formal and professional settings.',
      target: 'Follow articles, commentary, news, and conversations in broad contexts.',
      guide: { kanji: '≈1,000', words: '≈6,000', study: '1,500–2,200 h', pace: '10–16 months' },
      units: [
        unit('n2-u1', 'Precision & register', '正確さと敬語', 'Choose precise language and shift register appropriately.', ['Formal equivalents', 'Keigo foundations', 'ものの・にすぎない', 'Listen: client call', 'Register checkpoint']),
        unit('n2-u2', 'Complex relations', '複雑な関係', 'Express conditions, concessions, consequences, and scope.', ['Advanced conditions', 'Concession patterns', 'に伴って・につれて', 'Read: policy change', 'Relations checkpoint']),
        unit('n2-u3', 'News & argument', 'ニュースと論説', 'Track claims, evidence, stance, and implication.', ['News vocabulary', 'Argument structure', 'Risk with かねない', 'Listen: news analysis', 'Argument checkpoint']),
        unit('n2-u4', 'Professional Japanese', 'ビジネス日本語', 'Navigate meetings, reports, email, and workplace nuance.', ['Business correspondence', 'Meetings & proposals', 'ざるを得ない', 'Read: internal memo', 'Professional checkpoint']),
        unit('n2-u5', 'N2 summit', '上級への扉', 'Develop rapid comprehension across dense test materials.', ['N2 kanji compounds', 'Paraphrase training', 'Timed long-form reading', 'N2 listening sprint', 'N2 mastery test'])
      ]
    },
    N1: {
      name: 'Advanced',
      japanese: '上級',
      color: '#5cc8ff',
      softColor: '#a9e3ff',
      summary: 'Command subtle, abstract, literary, and highly specialized Japanese.',
      target: 'Comprehend nuanced language, logical complexity, and natural-speed discourse.',
      guide: { kanji: '≈2,000', words: '≈10,000+', study: '3,000–4,800 h', pace: '12–24 months' },
      units: [
        unit('n1-u1', 'Command of nuance', '微妙なニュアンス', 'Distinguish near-synonyms, stance, implication, and tone.', ['Near-synonym precision', 'Stance & implication', 'Advanced modality', 'Listen: subtle disagreement', 'Nuance checkpoint']),
        unit('n1-u2', 'Abstract thought', '抽象的な思考', 'Follow dense reasoning across academic and social themes.', ['Abstract vocabulary', 'Logical development', 'を皮切りに・をもって', 'Read: social commentary', 'Thought checkpoint']),
        unit('n1-u3', 'Literature & rhetoric', '文学と修辞', 'Interpret style, metaphor, voice, and rhetorical structure.', ['Literary expressions', 'Rhetorical devices', 'Classical remnants', 'Read: reflective essay', 'Literature checkpoint']),
        unit('n1-u4', 'Expert comprehension', '高度な理解', 'Process lectures, debates, editorials, and technical prose.', ['Academic discourse', 'Dense nominal phrases', 'Evaluation & critique', 'Listen: expert lecture', 'Expert checkpoint']),
        unit('n1-u5', 'N1 summit', '日本語を極める', 'Integrate precision, speed, memory, and exam strategy.', ['N1 kanji depth', 'Ultra-fast paraphrase', 'Timed editorial reading', 'N1 listening sprint', 'N1 mastery test'])
      ]
    }
  };

  const kanaRows = [
    ['a', 'あ', 'ア'], ['i', 'い', 'イ'], ['u', 'う', 'ウ'], ['e', 'え', 'エ'], ['o', 'お', 'オ'],
    ['ka', 'か', 'カ'], ['ki', 'き', 'キ'], ['ku', 'く', 'ク'], ['ke', 'け', 'ケ'], ['ko', 'こ', 'コ'],
    ['sa', 'さ', 'サ'], ['shi', 'し', 'シ'], ['su', 'す', 'ス'], ['se', 'せ', 'セ'], ['so', 'そ', 'ソ'],
    ['ta', 'た', 'タ'], ['chi', 'ち', 'チ'], ['tsu', 'つ', 'ツ'], ['te', 'て', 'テ'], ['to', 'と', 'ト'],
    ['na', 'な', 'ナ'], ['ni', 'に', 'ニ'], ['nu', 'ぬ', 'ヌ'], ['ne', 'ね', 'ネ'], ['no', 'の', 'ノ'],
    ['ha', 'は', 'ハ'], ['hi', 'ひ', 'ヒ'], ['fu', 'ふ', 'フ'], ['he', 'へ', 'ヘ'], ['ho', 'ほ', 'ホ'],
    ['ma', 'ま', 'マ'], ['mi', 'み', 'ミ'], ['mu', 'む', 'ム'], ['me', 'め', 'メ'], ['mo', 'も', 'モ'],
    ['ya', 'や', 'ヤ'], ['yu', 'ゆ', 'ユ'], ['yo', 'よ', 'ヨ'],
    ['ra', 'ら', 'ラ'], ['ri', 'り', 'リ'], ['ru', 'る', 'ル'], ['re', 'れ', 'レ'], ['ro', 'ろ', 'ロ'],
    ['wa', 'わ', 'ワ'], ['wo', 'を', 'ヲ'], ['n', 'ん', 'ン']
  ];
  const kana = kanaRows.map(([romaji, hiragana, katakana]) => ({ romaji, hiragana, katakana }));
  const kanaCombos = [
    ['kya', 'きゃ', 'キャ'], ['kyu', 'きゅ', 'キュ'], ['kyo', 'きょ', 'キョ'],
    ['sha', 'しゃ', 'シャ'], ['shu', 'しゅ', 'シュ'], ['sho', 'しょ', 'ショ'],
    ['cha', 'ちゃ', 'チャ'], ['chu', 'ちゅ', 'チュ'], ['cho', 'ちょ', 'チョ'],
    ['nya', 'にゃ', 'ニャ'], ['nyu', 'にゅ', 'ニュ'], ['nyo', 'にょ', 'ニョ'],
    ['hya', 'ひゃ', 'ヒャ'], ['hyu', 'ひゅ', 'ヒュ'], ['hyo', 'ひょ', 'ヒョ'],
    ['mya', 'みゃ', 'ミャ'], ['myu', 'みゅ', 'ミュ'], ['myo', 'みょ', 'ミョ'],
    ['rya', 'りゃ', 'リャ'], ['ryu', 'りゅ', 'リュ'], ['ryo', 'りょ', 'リョ']
  ].map(([romaji, hiragana, katakana]) => ({ romaji, hiragana, katakana }));

  const vocabulary = [
    { level: 'N5', word: '私', reading: 'わたし', meaning: 'I; me', category: 'People', example: '私は日本語の学生です。', translation: 'I am a student of Japanese.' },
    { level: 'N5', word: '学生', reading: 'がくせい', meaning: 'student', category: 'People', example: 'あの人は大学生です。', translation: 'That person is a university student.' },
    { level: 'N5', word: '食べる', reading: 'たべる', meaning: 'to eat', category: 'Actions', example: '朝ご飯を食べます。', translation: 'I eat breakfast.' },
    { level: 'N5', word: '水', reading: 'みず', meaning: 'water', category: 'Food', example: '水をください。', translation: 'Water, please.' },
    { level: 'N5', word: '今日', reading: 'きょう', meaning: 'today', category: 'Time', example: '今日はいい天気です。', translation: 'The weather is nice today.' },
    { level: 'N5', word: '行く', reading: 'いく', meaning: 'to go', category: 'Actions', example: '学校へ行きます。', translation: 'I go to school.' },
    { level: 'N5', word: '大きい', reading: 'おおきい', meaning: 'big', category: 'Description', example: '大きい犬がいます。', translation: 'There is a big dog.' },
    { level: 'N5', word: '友達', reading: 'ともだち', meaning: 'friend', category: 'People', example: '友達と映画を見ます。', translation: 'I watch a movie with a friend.' },

    { level: 'N4', word: '必要', reading: 'ひつよう', meaning: 'necessary; needed', category: 'Ideas', example: '予約が必要です。', translation: 'A reservation is necessary.' },
    { level: 'N4', word: '習慣', reading: 'しゅうかん', meaning: 'habit; custom', category: 'Life', example: '毎朝歩く習慣があります。', translation: 'I have a habit of walking every morning.' },
    { level: 'N4', word: '連絡', reading: 'れんらく', meaning: 'contact; communication', category: 'Communication', example: '着いたら連絡してください。', translation: 'Please contact me when you arrive.' },
    { level: 'N4', word: '間に合う', reading: 'まにあう', meaning: 'to be in time', category: 'Time', example: '電車に間に合いました。', translation: 'I made it in time for the train.' },
    { level: 'N4', word: '続ける', reading: 'つづける', meaning: 'to continue', category: 'Actions', example: '勉強を続けたいです。', translation: 'I want to continue studying.' },
    { level: 'N4', word: '約束', reading: 'やくそく', meaning: 'promise; appointment', category: 'Life', example: '友達と約束があります。', translation: 'I have plans with a friend.' },
    { level: 'N4', word: '残念', reading: 'ざんねん', meaning: 'regrettable; unfortunate', category: 'Feelings', example: '会えなくて残念です。', translation: "It's unfortunate that we cannot meet." },
    { level: 'N4', word: '運転', reading: 'うんてん', meaning: 'driving; operation', category: 'Travel', example: '父は車を運転しています。', translation: 'My father is driving a car.' },

    { level: 'N3', word: '影響', reading: 'えいきょう', meaning: 'influence; effect', category: 'Society', example: '天気が試合に影響した。', translation: 'The weather affected the match.' },
    { level: 'N3', word: '状況', reading: 'じょうきょう', meaning: 'situation; circumstances', category: 'Ideas', example: '状況を詳しく説明してください。', translation: 'Please explain the situation in detail.' },
    { level: 'N3', word: '確認', reading: 'かくにん', meaning: 'confirmation; checking', category: 'Work', example: '予定をもう一度確認します。', translation: 'I will check the schedule once more.' },
    { level: 'N3', word: '省く', reading: 'はぶく', meaning: 'to omit; eliminate', category: 'Actions', example: '無駄な作業を省きましょう。', translation: "Let's eliminate unnecessary work." },
    { level: 'N3', word: '慣れる', reading: 'なれる', meaning: 'to get used to', category: 'Life', example: '新しい生活に慣れてきた。', translation: 'I have begun to get used to my new life.' },
    { level: 'N3', word: '関心', reading: 'かんしん', meaning: 'interest; concern', category: 'Ideas', example: '環境問題に関心があります。', translation: 'I am interested in environmental issues.' },
    { level: 'N3', word: '実際', reading: 'じっさい', meaning: 'actually; in reality', category: 'Ideas', example: '実際に使ってみると便利だ。', translation: 'It is convenient when you actually try using it.' },
    { level: 'N3', word: '解決', reading: 'かいけつ', meaning: 'solution; resolution', category: 'Work', example: 'みんなで問題を解決した。', translation: 'We solved the problem together.' },

    { level: 'N2', word: '傾向', reading: 'けいこう', meaning: 'tendency; trend', category: 'Analysis', example: '若者の読書量は減る傾向にある。', translation: 'The amount young people read tends to decrease.' },
    { level: 'N2', word: '促進', reading: 'そくしん', meaning: 'promotion; acceleration', category: 'Society', example: '地域の交流を促進する。', translation: 'Promote interaction in the community.' },
    { level: 'N2', word: '遂げる', reading: 'とげる', meaning: 'to accomplish; achieve', category: 'Actions', example: '著しい成長を遂げた。', translation: 'It achieved remarkable growth.' },
    { level: 'N2', word: '踏まえる', reading: 'ふまえる', meaning: 'to take into account', category: 'Analysis', example: '結果を踏まえて計画を直す。', translation: 'Revise the plan based on the results.' },
    { level: 'N2', word: '妥当', reading: 'だとう', meaning: 'valid; appropriate', category: 'Evaluation', example: 'その判断は妥当だと思う。', translation: 'I think that judgment is reasonable.' },
    { level: 'N2', word: '懸念', reading: 'けねん', meaning: 'concern; apprehension', category: 'Formal', example: '安全性への懸念が残る。', translation: 'Concerns about safety remain.' },
    { level: 'N2', word: '著しい', reading: 'いちじるしい', meaning: 'remarkable; striking', category: 'Description', example: '技術が著しく進歩した。', translation: 'Technology advanced remarkably.' },
    { level: 'N2', word: '施策', reading: 'しさく', meaning: 'measure; policy', category: 'Society', example: '新たな施策が発表された。', translation: 'New policy measures were announced.' },

    { level: 'N1', word: '顕著', reading: 'けんちょ', meaning: 'remarkable; conspicuous', category: 'Formal', example: '効果は都市部で顕著に現れた。', translation: 'The effect appeared markedly in urban areas.' },
    { level: 'N1', word: '踏襲', reading: 'とうしゅう', meaning: 'following; adherence to precedent', category: 'Formal', example: '従来の方針を踏襲する。', translation: 'Follow the conventional policy.' },
    { level: 'N1', word: '脆弱', reading: 'ぜいじゃく', meaning: 'fragile; vulnerable', category: 'Analysis', example: '脆弱な基盤を強化する必要がある。', translation: 'It is necessary to reinforce the vulnerable foundation.' },
    { level: 'N1', word: '示唆', reading: 'しさ', meaning: 'suggestion; implication', category: 'Academic', example: '研究結果は重要な可能性を示唆している。', translation: 'The findings suggest an important possibility.' },
    { level: 'N1', word: '概して', reading: 'がいして', meaning: 'generally; as a rule', category: 'Formal', example: '参加者は概して好意的だった。', translation: 'The participants were generally favorable.' },
    { level: 'N1', word: '鑑みる', reading: 'かんがみる', meaning: 'to take into consideration', category: 'Formal', example: '現状に鑑みて計画を見直す。', translation: 'Review the plan in light of the current situation.' },
    { level: 'N1', word: '余儀なくされる', reading: 'よぎなくされる', meaning: 'to be forced to', category: 'Formal', example: '悪天候で中止を余儀なくされた。', translation: 'Bad weather forced the cancellation.' },
    { level: 'N1', word: '払拭', reading: 'ふっしょく', meaning: 'dispel; wipe away', category: 'Formal', example: '不安を払拭するには説明が必要だ。', translation: 'An explanation is needed to dispel anxiety.' },

    { level: 'N5', word: '見る', reading: 'みる', meaning: 'to see; watch', category: 'Actions', example: '夜にテレビを見ます。', translation: 'I watch television at night.' },
    { level: 'N5', word: '話す', reading: 'はなす', meaning: 'to speak; talk', category: 'Actions', example: '先生と日本語で話します。', translation: 'I speak in Japanese with my teacher.' },
    { level: 'N5', word: '買う', reading: 'かう', meaning: 'to buy', category: 'Actions', example: '店で本を買います。', translation: 'I buy a book at the shop.' },
    { level: 'N5', word: '読む', reading: 'よむ', meaning: 'to read', category: 'Actions', example: '毎晩、本を読みます。', translation: 'I read a book every evening.' },
    { level: 'N4', word: '決める', reading: 'きめる', meaning: 'to decide', category: 'Actions', example: '旅行の日を決めました。', translation: 'We decided the date of the trip.' },
    { level: 'N4', word: '届ける', reading: 'とどける', meaning: 'to deliver', category: 'Actions', example: '忘れ物を受付に届けました。', translation: 'I delivered the lost item to reception.' },
    { level: 'N4', word: '調べる', reading: 'しらべる', meaning: 'to investigate; look up', category: 'Actions', example: '分からない言葉を辞書で調べます。', translation: 'I look up unknown words in a dictionary.' },
    { level: 'N4', word: '直す', reading: 'なおす', meaning: 'to fix; correct', category: 'Actions', example: '作文の間違いを直しました。', translation: 'I corrected the mistakes in my composition.' },
    { level: 'N3', word: '認める', reading: 'みとめる', meaning: 'to recognize; admit', category: 'Actions', example: '自分の間違いを認めることが大切だ。', translation: 'It is important to admit your own mistakes.' },
    { level: 'N3', word: '避ける', reading: 'さける', meaning: 'to avoid', category: 'Actions', example: '混雑する時間を避けて出発した。', translation: 'I departed while avoiding the crowded period.' },
    { level: 'N3', word: '任せる', reading: 'まかせる', meaning: 'to entrust; leave to', category: 'Work', example: 'この仕事は彼に任せよう。', translation: 'Let us leave this job to him.' },
    { level: 'N3', word: '取り組む', reading: 'とりくむ', meaning: 'to tackle; work on', category: 'Work', example: '新しい課題に取り組んでいる。', translation: 'I am working on a new challenge.' },
    { level: 'N3', word: '複雑', reading: 'ふくざつ', meaning: 'complex; complicated', category: 'Description', example: 'この仕組みは少し複雑だ。', translation: 'This system is a little complicated.' },
    { level: 'N3', word: '確実', reading: 'かくじつ', meaning: 'certain; reliable', category: 'Description', example: '確実な方法を選びたい。', translation: 'I want to choose a reliable method.' },
    { level: 'N2', word: '応じる', reading: 'おうじる', meaning: 'to respond; comply', category: 'Actions', example: '状況に応じて方法を変える。', translation: 'Change the method according to the situation.' },
    { level: 'N2', word: '伴う', reading: 'ともなう', meaning: 'to accompany; entail', category: 'Analysis', example: '改革には痛みが伴うこともある。', translation: 'Reform may sometimes entail pain.' },
    { level: 'N2', word: '見直す', reading: 'みなおす', meaning: 'to review; reconsider', category: 'Actions', example: '計画を根本から見直す必要がある。', translation: 'The plan needs to be reconsidered fundamentally.' },
    { level: 'N2', word: '引き起こす', reading: 'ひきおこす', meaning: 'to cause; trigger', category: 'Analysis', example: '小さな誤解が大きな問題を引き起こした。', translation: 'A small misunderstanding caused a major problem.' },
    { level: 'N1', word: '覆す', reading: 'くつがえす', meaning: 'to overturn; reverse', category: 'Formal', example: '定説を覆す証拠が見つかった。', translation: 'Evidence overturning the accepted theory was found.' },
    { level: 'N1', word: '損なう', reading: 'そこなう', meaning: 'to impair; damage', category: 'Formal', example: '信頼を損なう行為は避けるべきだ。', translation: 'Conduct that damages trust should be avoided.' },
    { level: 'N1', word: '見極める', reading: 'みきわめる', meaning: 'to ascertain; discern', category: 'Analysis', example: '情報の真偽を見極めなければならない。', translation: 'We must ascertain whether the information is true.' },
    { level: 'N1', word: '志す', reading: 'こころざす', meaning: 'to aspire to', category: 'Formal', example: '若い頃から研究者を志していた。', translation: 'I had aspired to become a researcher since youth.' },
    { level: 'N1', word: '見解', reading: 'けんかい', meaning: 'view; opinion', category: 'Formal', example: '専門家の見解が分かれた。', translation: 'The experts were divided in their views.' },
    { level: 'N1', word: '趣旨', reading: 'しゅし', meaning: 'purpose; gist', category: 'Formal', example: '提案の趣旨を簡潔に説明する。', translation: 'Explain the purpose of the proposal concisely.' }
  ].map((item, index) => ({
    ...item,
    id: `word-${index + 1}`,
    partOfSpeech: [
      '食べる', '行く', '連絡', '間に合う', '続ける', '運転', '影響', '確認', '省く', '慣れる', '解決',
      '促進', '遂げる', '踏まえる', '踏襲', '示唆', '鑑みる', '余儀なくされる', '払拭',
      '見る', '話す', '買う', '読む', '決める', '届ける', '調べる', '直す', '認める', '避ける', '任せる',
      '取り組む', '応じる', '伴う', '見直す', '引き起こす', '覆す', '損なう', '見極める', '志す'
    ].includes(item.word) ? 'Verbs' : [
      '大きい', '必要', '残念', '妥当', '著しい', '顕著', '脆弱', '複雑', '確実'
    ].includes(item.word) ? 'Adjectives' : [
      '今日', '実際', '概して'
    ].includes(item.word) ? 'Adverbs & expressions' : 'Nouns'
  }));

  const grammar = [
    { level: 'N5', pattern: 'は vs が', meaning: 'topic vs subject', form: 'N は… / N が…', explanation: 'は frames what the sentence is about or contrasts it. が identifies or newly introduces the grammatical subject.', example: '私は学生です。だれが先生ですか。田中さんが先生です。', translation: 'I am a student. Who is the teacher? Tanaka is the teacher.' },
    { level: 'N5', pattern: '〜ている', meaning: 'ongoing action or resulting state', form: 'Vて + いる', explanation: 'Use the て-form plus いる for an action in progress, a repeated activity, or a state resulting from a change.', example: '今、日本語を勉強しています。', translation: 'I am studying Japanese now.' },
    { level: 'N5', pattern: '〜たい', meaning: 'want to do', form: 'Vます stem + たい', explanation: 'Attach たい to the verb stem to express the speaker’s desire. It behaves like an い-adjective.', example: '京都へ行きたいです。', translation: 'I want to go to Kyoto.' },
    { level: 'N5', pattern: '〜から', meaning: 'because; since', form: 'Reason + から', explanation: 'Place から after a reason. The result can come before or after it in casual speech.', example: '寒いですから、窓を閉めます。', translation: 'Because it is cold, I will close the window.' },
    { level: 'N5', pattern: '〜たり〜たりする', meaning: 'do things such as', form: 'Vた + り、Vた + りする', explanation: 'List representative activities without implying that the list is complete.', example: '日曜日は本を読んだり、音楽を聞いたりします。', translation: 'On Sundays I do things like read books and listen to music.' },

    { level: 'N4', pattern: '〜ながら', meaning: 'while doing', form: 'Vます stem + ながら', explanation: 'Two simultaneous actions by the same subject; the second action is the main one.', example: '音楽を聞きながら勉強します。', translation: 'I study while listening to music.' },
    { level: 'N4', pattern: '〜そうだ', meaning: 'looks like; appears', form: 'Vます stem / A stem + そうだ', explanation: 'Express an appearance-based judgment. Be careful: いい becomes よさそう and ない becomes なさそう.', example: 'このケーキはおいしそうです。', translation: 'This cake looks delicious.' },
    { level: 'N4', pattern: '〜なければならない', meaning: 'must; have to', form: 'Vない → なければならない', explanation: 'Express an obligation by combining the conditional negative with ならない.', example: '明日までに返さなければなりません。', translation: 'I must return it by tomorrow.' },
    { level: 'N4', pattern: '〜てしまう', meaning: 'finish completely; unfortunately do', form: 'Vて + しまう', explanation: 'Marks completion or the speaker’s regret. In speech it often contracts to ちゃう or じゃう.', example: '財布を忘れてしまいました。', translation: 'Unfortunately, I forgot my wallet.' },
    { level: 'N4', pattern: '〜ようになる', meaning: 'come to be able to; change into habit', form: 'V dictionary / potential + ようになる', explanation: 'Describe a gradual change in ability or habitual behavior.', example: '漢字が読めるようになりました。', translation: 'I have become able to read kanji.' },

    { level: 'N3', pattern: '〜ことになっている', meaning: 'it is arranged or established that', form: 'V dictionary + ことになっている', explanation: 'Describe a rule, schedule, or arrangement determined by circumstances rather than the speaker.', example: 'この図書館では飲食しないことになっています。', translation: 'Eating and drinking are not allowed in this library.' },
    { level: 'N3', pattern: '〜わけではない', meaning: 'it does not mean that', form: 'Plain form + わけではない', explanation: 'Partially deny an assumption or expected conclusion without denying everything.', example: '甘い物が嫌いなわけではない。', translation: "It isn't that I dislike sweet things." },
    { level: 'N3', pattern: '〜に違いない', meaning: 'must surely be', form: 'Plain form + に違いない', explanation: 'State a strong logical conviction based on available evidence.', example: '電気がついているから、だれかいるに違いない。', translation: 'The lights are on, so someone must be there.' },
    { level: 'N3', pattern: '〜たびに', meaning: 'whenever; every time', form: 'V dictionary / Nの + たびに', explanation: 'Indicate that one thing regularly occurs whenever another happens.', example: 'この写真を見るたびに、旅行を思い出す。', translation: 'Whenever I see this photo, I remember the trip.' },
    { level: 'N3', pattern: '〜おかげで / 〜せいで', meaning: 'thanks to / because of', form: 'Plain form / Nの + おかげで・せいで', explanation: 'おかげで credits a favorable cause; せいで blames an unfavorable cause.', example: '先生のおかげで合格できました。', translation: 'Thanks to my teacher, I was able to pass.' },

    { level: 'N2', pattern: '〜に伴って', meaning: 'along with; as a result of', form: 'N / V dictionary + に伴って', explanation: 'Formal pattern for two related changes occurring together, often on a broad social scale.', example: '人口の増加に伴って、住宅が不足している。', translation: 'Along with population growth, housing has become scarce.' },
    { level: 'N2', pattern: '〜ざるを得ない', meaning: 'cannot help but; have no choice', form: 'Vない stem + ざるを得ない', explanation: 'Formal expression of being compelled by circumstances. する becomes せざるを得ない.', example: '計画を変更せざるを得ない。', translation: 'We have no choice but to change the plan.' },
    { level: 'N2', pattern: '〜ものの', meaning: 'although; even though', form: 'Plain form + ものの', explanation: 'Introduce a fact that contrasts with an unexpected or insufficient result; common in writing.', example: '資格は取ったものの、実務経験がない。', translation: 'Although I obtained the qualification, I have no practical experience.' },
    { level: 'N2', pattern: '〜にすぎない', meaning: 'nothing more than; merely', form: 'N / plain form + にすぎない', explanation: 'Limit the importance, quantity, or scope of something.', example: 'これは一つの例にすぎない。', translation: 'This is merely one example.' },
    { level: 'N2', pattern: '〜かねない', meaning: 'might; risk doing', form: 'Vます stem + かねない', explanation: 'Warn that an undesirable outcome is possible.', example: '誤解を招きかねない表現だ。', translation: 'It is an expression that might invite misunderstanding.' },

    { level: 'N1', pattern: '〜を皮切りに', meaning: 'starting with; beginning with', form: 'N + を皮切りに（して）', explanation: 'Mark the first event in a sequence of similar developments, often large-scale.', example: '東京公演を皮切りに、全国を回る。', translation: 'Starting with the Tokyo performance, they will tour the country.' },
    { level: 'N1', pattern: '〜までもない', meaning: 'it is not necessary to', form: 'V dictionary + までもない', explanation: 'State that something is too obvious or minor to warrant an action.', example: '言うまでもなく、安全が最優先だ。', translation: 'Needless to say, safety is the top priority.' },
    { level: 'N1', pattern: '〜に堪えない', meaning: 'cannot bear; deeply feel', form: 'V dictionary / N + に堪えない', explanation: 'Depending on the noun, express either unbearable discomfort or an overwhelming feeling such as gratitude.', example: '見るに堪えない光景だった。', translation: 'It was a sight too painful to watch.' },
    { level: 'N1', pattern: '〜を余儀なくされる', meaning: 'be forced to', form: 'N + を余儀なくされる', explanation: 'Formal passive expression meaning circumstances leave someone no alternative.', example: '住民は避難を余儀なくされた。', translation: 'The residents were forced to evacuate.' },
    { level: 'N1', pattern: '〜たるもの', meaning: 'one who is; in the capacity of', form: 'N + たるもの', explanation: 'State the expected conduct or essential standard of someone holding a role; formal and emphatic.', example: '指導者たるもの、責任を避けてはならない。', translation: 'A leader must not avoid responsibility.' }
  ].map((item, index) => ({ ...item, id: `grammar-${index + 1}` }));

  const kanji = [
    { level: 'N5', char: '日', meaning: 'sun; day', on: 'ニチ・ジツ', kun: 'ひ・か', strokes: 4, words: [['日本', 'にほん', 'Japan'], ['毎日', 'まいにち', 'every day']] },
    { level: 'N5', char: '月', meaning: 'moon; month', on: 'ゲツ・ガツ', kun: 'つき', strokes: 4, words: [['月曜日', 'げつようび', 'Monday'], ['一月', 'いちがつ', 'January']] },
    { level: 'N5', char: '人', meaning: 'person', on: 'ジン・ニン', kun: 'ひと', strokes: 2, words: [['日本人', 'にほんじん', 'Japanese person'], ['一人', 'ひとり', 'one person']] },
    { level: 'N5', char: '学', meaning: 'study; learning', on: 'ガク', kun: 'まなぶ', strokes: 8, words: [['学生', 'がくせい', 'student'], ['学校', 'がっこう', 'school']] },
    { level: 'N5', char: '食', meaning: 'eat; food', on: 'ショク', kun: 'たべる', strokes: 9, words: [['食事', 'しょくじ', 'meal'], ['食べ物', 'たべもの', 'food']] },
    { level: 'N5', char: '行', meaning: 'go; conduct', on: 'コウ・ギョウ', kun: 'いく・おこなう', strokes: 6, words: [['旅行', 'りょこう', 'travel'], ['銀行', 'ぎんこう', 'bank']] },

    { level: 'N4', char: '会', meaning: 'meet; association', on: 'カイ', kun: 'あう', strokes: 6, words: [['会社', 'かいしゃ', 'company'], ['会話', 'かいわ', 'conversation']] },
    { level: 'N4', char: '社', meaning: 'company; shrine', on: 'シャ', kun: 'やしろ', strokes: 7, words: [['社会', 'しゃかい', 'society'], ['神社', 'じんじゃ', 'shrine']] },
    { level: 'N4', char: '料', meaning: 'fee; material', on: 'リョウ', kun: '—', strokes: 10, words: [['料理', 'りょうり', 'cooking'], ['料金', 'りょうきん', 'fee']] },
    { level: 'N4', char: '理', meaning: 'reason; logic', on: 'リ', kun: 'ことわり', strokes: 11, words: [['理由', 'りゆう', 'reason'], ['無理', 'むり', 'impossible']] },
    { level: 'N4', char: '運', meaning: 'carry; luck', on: 'ウン', kun: 'はこぶ', strokes: 12, words: [['運転', 'うんてん', 'driving'], ['運動', 'うんどう', 'exercise']] },
    { level: 'N4', char: '転', meaning: 'turn; roll', on: 'テン', kun: 'ころぶ', strokes: 11, words: [['自転車', 'じてんしゃ', 'bicycle'], ['転ぶ', 'ころぶ', 'to fall']] },

    { level: 'N3', char: '状', meaning: 'condition; form', on: 'ジョウ', kun: '—', strokes: 7, words: [['状況', 'じょうきょう', 'situation'], ['状態', 'じょうたい', 'condition']] },
    { level: 'N3', char: '況', meaning: 'condition', on: 'キョウ', kun: '—', strokes: 8, words: [['近況', 'きんきょう', 'recent situation'], ['不況', 'ふきょう', 'recession']] },
    { level: 'N3', char: '影', meaning: 'shadow; influence', on: 'エイ', kun: 'かげ', strokes: 15, words: [['影響', 'えいきょう', 'influence'], ['映画', 'えいが', 'movie']] },
    { level: 'N3', char: '響', meaning: 'echo; resonate', on: 'キョウ', kun: 'ひびく', strokes: 20, words: [['影響', 'えいきょう', 'effect'], ['響く', 'ひびく', 'to resonate']] },
    { level: 'N3', char: '解', meaning: 'solve; untie', on: 'カイ・ゲ', kun: 'とく', strokes: 13, words: [['理解', 'りかい', 'understanding'], ['解決', 'かいけつ', 'solution']] },
    { level: 'N3', char: '決', meaning: 'decide', on: 'ケツ', kun: 'きめる', strokes: 7, words: [['決定', 'けってい', 'decision'], ['解決', 'かいけつ', 'resolution']] },

    { level: 'N2', char: '傾', meaning: 'incline; lean', on: 'ケイ', kun: 'かたむく', strokes: 13, words: [['傾向', 'けいこう', 'tendency'], ['傾く', 'かたむく', 'to lean']] },
    { level: 'N2', char: '施', meaning: 'carry out; bestow', on: 'シ・セ', kun: 'ほどこす', strokes: 9, words: [['施設', 'しせつ', 'facility'], ['実施', 'じっし', 'implementation']] },
    { level: 'N2', char: '策', meaning: 'plan; policy', on: 'サク', kun: '—', strokes: 12, words: [['対策', 'たいさく', 'countermeasure'], ['政策', 'せいさく', 'policy']] },
    { level: 'N2', char: '遂', meaning: 'accomplish', on: 'スイ', kun: 'とげる', strokes: 12, words: [['遂行', 'すいこう', 'execution'], ['遂げる', 'とげる', 'to accomplish']] },
    { level: 'N2', char: '懸', meaning: 'suspend; concern', on: 'ケン・ケ', kun: 'かける', strokes: 20, words: [['懸念', 'けねん', 'concern'], ['一生懸命', 'いっしょうけんめい', 'with all one’s might']] },
    { level: 'N2', char: '念', meaning: 'thought; concern', on: 'ネン', kun: '—', strokes: 8, words: [['残念', 'ざんねん', 'regrettable'], ['記念', 'きねん', 'commemoration']] },

    { level: 'N1', char: '顕', meaning: 'appear; manifest', on: 'ケン', kun: 'あきらか', strokes: 18, words: [['顕著', 'けんちょ', 'remarkable'], ['顕在', 'けんざい', 'manifest']] },
    { level: 'N1', char: '著', meaning: 'notable; write', on: 'チョ', kun: 'いちじるしい・あらわす', strokes: 11, words: [['著者', 'ちょしゃ', 'author'], ['著しい', 'いちじるしい', 'remarkable']] },
    { level: 'N1', char: '脆', meaning: 'brittle; fragile', on: 'ゼイ', kun: 'もろい', strokes: 10, words: [['脆弱', 'ぜいじゃく', 'vulnerable'], ['脆い', 'もろい', 'fragile']] },
    { level: 'N1', char: '弱', meaning: 'weak', on: 'ジャク', kun: 'よわい', strokes: 10, words: [['弱点', 'じゃくてん', 'weak point'], ['弱まる', 'よわまる', 'to weaken']] },
    { level: 'N1', char: '襲', meaning: 'attack; inherit', on: 'シュウ', kun: 'おそう', strokes: 22, words: [['踏襲', 'とうしゅう', 'following precedent'], ['襲撃', 'しゅうげき', 'attack']] },
    { level: 'N1', char: '唆', meaning: 'instigate; suggest', on: 'サ', kun: 'そそのかす', strokes: 10, words: [['示唆', 'しさ', 'suggestion'], ['教唆', 'きょうさ', 'instigation']] }
  ].map((item, index) => ({ ...item, id: `kanji-${index + 1}` }));

  const readings = [
    {
      id: 'read-n5-1', level: 'N5', title: 'A new morning', japaneseTitle: '新しい朝', minutes: 2,
      text: '毎朝、七時に起きます。水を飲んで、パンを食べます。八時に家を出ます。学校まで電車で行きます。日本語のクラスは九時からです。',
      translation: 'Every morning, I wake up at seven. I drink water and eat bread. I leave home at eight. I go to school by train. Japanese class starts at nine.',
      question: 'How does the speaker go to school?', choices: ['By train', 'By bus', 'On foot', 'By bicycle'], answer: 'By train'
    },
    {
      id: 'read-n5-2', level: 'N5', title: 'The blue umbrella', japaneseTitle: '青い傘', minutes: 2,
      text: '今日は雨です。駅に青い傘がありました。でも、私の傘は黒いです。その青い傘は田中さんのです。田中さんに電話をしました。',
      translation: 'It is raining today. There was a blue umbrella at the station. But my umbrella is black. That blue umbrella belongs to Tanaka. I called Tanaka.',
      question: 'Whose umbrella is blue?', choices: ["Tanaka's", "The speaker's", "The teacher's", "A friend's"], answer: "Tanaka's"
    },
    {
      id: 'read-n4-1', level: 'N4', title: 'Library notice', japaneseTitle: '図書館からのお知らせ', minutes: 3,
      text: '来週の月曜日は、館内の工事のため図書館を休みます。本を返す人は、入口の隣にある箱に入れてください。火曜日は朝九時から開きます。',
      translation: 'Next Monday the library will be closed because of construction. If you are returning books, put them in the box beside the entrance. On Tuesday it opens from 9 a.m.',
      question: 'Why will the library close?', choices: ['Construction', 'A holiday', 'Staff training', 'Bad weather'], answer: 'Construction'
    },
    {
      id: 'read-n4-2', level: 'N4', title: 'A changed plan', japaneseTitle: '変わった予定', minutes: 3,
      text: '土曜日に山へ行く予定でしたが、雨が降りそうなので、博物館へ行くことにしました。駅で十時に会ってから、一緒に昼ご飯も食べるつもりです。',
      translation: 'We planned to go to the mountains Saturday, but because it looks likely to rain, we decided to visit a museum. We will meet at the station at ten and plan to eat lunch together too.',
      question: 'What will they do instead of hiking?', choices: ['Visit a museum', 'Watch a movie', 'Stay home', 'Go shopping'], answer: 'Visit a museum'
    },
    {
      id: 'read-n3-1', level: 'N3', title: 'Working from home', japaneseTitle: '在宅勤務の工夫', minutes: 4,
      text: '在宅勤務は通勤時間を省ける一方で、仕事と休みの区別がつきにくい。そこで私は、仕事を始める前に短い散歩をし、終わった後にも外へ出ることにしている。この習慣のおかげで、気持ちを切り替えやすくなった。',
      translation: 'While remote work removes commuting time, it can make work and rest difficult to distinguish. So I take a short walk before beginning and go outside again after finishing. Thanks to this habit, switching mental modes has become easier.',
      question: 'What helps the writer switch mental modes?', choices: ['Taking walks', 'Changing rooms', 'Calling coworkers', 'Listening to music'], answer: 'Taking walks'
    },
    {
      id: 'read-n3-2', level: 'N3', title: 'The value of mistakes', japaneseTitle: '間違いの価値', minutes: 4,
      text: '外国語を話すとき、間違いを恐れて黙ってしまう人がいる。しかし、実際に使わなければ、自分に何が足りないか分からない。間違いは失敗というより、次に学ぶべきことを教える情報なのだ。',
      translation: 'Some people fall silent from fear of mistakes when speaking a foreign language. But without actually using it, you cannot know what you lack. Rather than failures, mistakes are information showing what to learn next.',
      question: 'How does the writer view mistakes?', choices: ['As useful information', 'As proof of failure', 'As something avoidable', 'As a lack of talent'], answer: 'As useful information'
    },
    {
      id: 'read-n2-1', level: 'N2', title: 'Cities and quiet spaces', japaneseTitle: '都市と静かな空間', minutes: 5,
      text: '都市の利便性が高まるに伴って、人々が静かに過ごせる場所は減少する傾向にある。しかし、効率だけを優先した街づくりは、住民の心身の健康を損ないかねない。小さくても緑地を確保する施策が求められている。',
      translation: 'As cities become more convenient, places where people can spend quiet time tend to decrease. Yet urban planning that prioritizes only efficiency may damage residents’ well-being. Measures securing green spaces, even small ones, are needed.',
      question: 'What measure does the writer support?', choices: ['Securing green spaces', 'Building wider roads', 'Extending business hours', 'Reducing public transit'], answer: 'Securing green spaces'
    },
    {
      id: 'read-n2-2', level: 'N2', title: 'Evaluating information', japaneseTitle: '情報を見極める', minutes: 5,
      text: '情報が多いことは、必ずしも判断が容易になることを意味しない。出典を確認せずに共有すれば、誤解を広げかねない。内容そのものに加え、誰が、どのような目的で発信したのかを踏まえる必要がある。',
      translation: 'An abundance of information does not necessarily make judgment easier. Sharing without checking sources can spread misunderstandings. Beyond the content itself, we must consider who published it and for what purpose.',
      question: 'What should be considered besides content?', choices: ['The source and purpose', 'The text length', 'The number of images', 'The publication color'], answer: 'The source and purpose'
    },
    {
      id: 'read-n1-1', level: 'N1', title: 'The paradox of choice', japaneseTitle: '選択肢の逆説', minutes: 7,
      text: '選択肢の多さは自由の象徴として歓迎されがちだ。ところが、選ぶための基準が曖昧なまま選択肢だけが増えれば、かえって決断をためらわせることになりかねない。重要なのは、可能性を際限なく広げることではなく、自らが何を重視するかを見極めることである。',
      translation: 'An abundance of options tends to be welcomed as a symbol of freedom. Yet if only the options increase while selection criteria remain unclear, decision-making may become harder. What matters is not expanding possibilities without limit, but discerning what one values.',
      question: 'What does the writer say matters most?', choices: ["Knowing one's priorities", 'Maximizing every option', 'Deciding immediately', 'Following popular choices'], answer: "Knowing one's priorities"
    },
    {
      id: 'read-n1-2', level: 'N1', title: 'Preserving tradition', japaneseTitle: '伝統を受け継ぐということ', minutes: 7,
      text: '伝統を踏襲するとは、過去の形式をそのまま保存することにほかならない、と考える向きもある。しかし、社会との接点を失った伝統は形骸化を余儀なくされる。核となる価値を見失わず、時代に応じて表現を変える柔軟さこそ、継承には欠かせない。',
      translation: 'Some regard following tradition as nothing other than preserving past forms unchanged. But tradition that loses touch with society is forced into empty formalism. Flexibility to alter expression with the times without losing core values is indispensable to succession.',
      question: 'What is essential to preserving tradition?', choices: ['Flexible expression with core values intact', 'Keeping every form unchanged', 'Rejecting modern society', 'Avoiding reinterpretation'], answer: 'Flexible expression with core values intact'
    }
  ];

  const listening = [
    { id: 'listen-n5-1', level: 'N5', title: 'At the café', text: 'すみません、コーヒーを一つください。砂糖はいりません。', prompt: 'What does the customer not need?', choices: ['Sugar', 'Coffee', 'Water', 'Milk'], answer: 'Sugar' },
    { id: 'listen-n5-2', level: 'N5', title: 'Meeting time', text: '明日は駅で九時半に会いましょう。', prompt: 'What time will they meet?', choices: ['9:30', '9:00', '8:30', '10:30'], answer: '9:30' },
    { id: 'listen-n4-1', level: 'N4', title: 'Train change', text: 'この電車は新宿へ行きません。次の駅で急行に乗り換えてください。', prompt: 'What should the passenger do?', choices: ['Change to an express train', 'Get off at Shinjuku', 'Take a bus', 'Wait for the last train'], answer: 'Change to an express train' },
    { id: 'listen-n4-2', level: 'N4', title: 'Weekend forecast', text: '土曜日は晴れますが、日曜日の午後から雨が降るそうです。', prompt: 'When is rain expected?', choices: ['Sunday afternoon', 'Saturday morning', 'Saturday evening', 'Monday'], answer: 'Sunday afternoon' },
    { id: 'listen-n3-1', level: 'N3', title: 'Office update', text: '会議の資料ですが、数字に間違いがあったので、修正版をメールで送りました。前のファイルは使わないでください。', prompt: 'Why was a new file sent?', choices: ['There was a numerical error', 'The meeting moved', 'The design changed', 'A page was missing'], answer: 'There was a numerical error' },
    { id: 'listen-n3-2', level: 'N3', title: 'Changed reservation', text: '予約は七時からでしたが、道が混んでいて間に合いそうにないので、店に三十分遅らせてもらいました。', prompt: 'What is the new reservation time?', choices: ['7:30', '6:30', '7:00', '8:00'], answer: '7:30' },
    { id: 'listen-n2-1', level: 'N2', title: 'Project decision', text: '費用の面では課題が残るものの、長期的な効果を踏まえ、予定どおり計画を進めることになりました。', prompt: 'What was decided?', choices: ['Proceed as planned', 'Cancel the plan', 'Reduce the team', 'Delay indefinitely'], answer: 'Proceed as planned' },
    { id: 'listen-n2-2', level: 'N2', title: 'Museum announcement', text: '展示室の混雑に伴い、現在、入場を一時的に制限しております。お待ちのお客様は、係員の案内に従ってください。', prompt: 'Why is admission restricted?', choices: ['The gallery is crowded', 'An exhibit is broken', 'The museum is closing', 'Staff are unavailable'], answer: 'The gallery is crowded' },
    { id: 'listen-n1-1', level: 'N1', title: 'A nuanced proposal', text: '提案の趣旨には賛同しますが、現場の負担を考慮せずに導入すれば、かえって混乱を招くのではないでしょうか。', prompt: "What is the speaker's position?", choices: ['Supports the idea but warns about implementation', 'Completely opposes the proposal', 'Wants immediate implementation', 'Has no opinion'], answer: 'Supports the idea but warns about implementation' },
    { id: 'listen-n1-2', level: 'N1', title: 'Research interpretation', text: '今回の結果は仮説を直接証明するものではありませんが、少なくとも従来の説明を見直す必要性を示唆していると言えるでしょう。', prompt: 'What do the results suggest?', choices: ['The conventional explanation needs review', 'The hypothesis is fully proven', 'The research should stop', 'No interpretation is possible'], answer: 'The conventional explanation needs review' }
  ];

  const listeningTranslations = {
    'listen-n5-1': 'Excuse me, one coffee please. I do not need sugar.',
    'listen-n5-2': 'Let us meet at the station tomorrow at nine thirty.',
    'listen-n4-1': 'This train does not go to Shinjuku. Please change to an express train at the next station.',
    'listen-n4-2': 'Saturday will be sunny, but it is said that rain will begin Sunday afternoon.',
    'listen-n3-1': 'Regarding the meeting materials, there was an error in the figures, so I sent a corrected version by email. Please do not use the previous file.',
    'listen-n3-2': 'The reservation was for seven, but because the roads are congested and I probably will not make it, I had the restaurant move it thirty minutes later.',
    'listen-n2-1': 'Although cost-related issues remain, taking the long-term effects into account, it was decided to proceed with the plan as scheduled.',
    'listen-n2-2': 'Due to congestion in the exhibition rooms, admission is currently being temporarily restricted. Customers waiting should follow staff instructions.',
    'listen-n1-1': 'I agree with the purpose of the proposal, but if it is introduced without considering the burden on frontline staff, might it not instead cause confusion?',
    'listen-n1-2': 'These results do not directly prove the hypothesis, but one could say they at least suggest the need to reconsider the conventional explanation.'
  };
  listening.forEach((clip) => { clip.translation = listeningTranslations[clip.id]; });

  const readingFollowups = {
    'read-n5-1': { question: 'What time does Japanese class begin?', choices: ['9:00', '7:00', '8:00', '10:00'], answer: '9:00' },
    'read-n5-2': { question: "What color is the speaker's umbrella?", choices: ['Black', 'Blue', 'White', 'Red'], answer: 'Black' },
    'read-n4-1': { question: 'Where should returned books be placed?', choices: ['In the box by the entrance', 'At the front desk', 'Outside the station', 'In the construction area'], answer: 'In the box by the entrance' },
    'read-n4-2': { question: 'Where will the group meet?', choices: ['At the station', 'At the museum', 'At the mountain', 'At a restaurant'], answer: 'At the station' },
    'read-n3-1': { question: 'When does the writer take walks?', choices: ['Before and after work', 'Only at lunchtime', 'During online meetings', 'Only on weekends'], answer: 'Before and after work' },
    'read-n3-2': { question: 'Why does the writer recommend using the language?', choices: ['It reveals what you still need to learn', 'It prevents every mistake', 'It replaces formal study', 'It proves natural talent'], answer: 'It reveals what you still need to learn' },
    'read-n2-1': { question: 'What risk comes from prioritizing efficiency alone?', choices: ["Harming residents' well-being", 'Increasing green space', 'Reducing convenience', 'Improving public health'], answer: "Harming residents' well-being" },
    'read-n2-2': { question: 'What can happen when information is shared without checking sources?', choices: ['Misunderstandings may spread', 'Decisions become automatic', 'Sources become more reliable', 'The content becomes shorter'], answer: 'Misunderstandings may spread' },
    'read-n1-1': { question: 'When can more choices make decisions harder?', choices: ['When selection criteria are unclear', 'When priorities are already clear', 'When there is only one option', 'When choices are carefully limited'], answer: 'When selection criteria are unclear' },
    'read-n1-2': { question: 'What happens when tradition loses contact with society?', choices: ['It risks becoming empty formalism', 'Its core values grow stronger', 'It becomes easier to preserve', 'It naturally reaches more people'], answer: 'It risks becoming empty formalism' }
  };

  const listeningFollowups = {
    'listen-n5-1': { prompt: 'How many coffees does the customer order?', choices: ['One', 'Two', 'Three', 'None'], answer: 'One' },
    'listen-n5-2': { prompt: 'Where will they meet?', choices: ['At the station', 'At school', 'At a café', 'At home'], answer: 'At the station' },
    'listen-n4-1': { prompt: 'Where should the passenger change trains?', choices: ['At the next station', 'At Shinjuku', 'At the final station', 'Before boarding'], answer: 'At the next station' },
    'listen-n4-2': { prompt: 'What weather is expected on Saturday?', choices: ['Sunny', 'Rainy', 'Snowy', 'Windy'], answer: 'Sunny' },
    'listen-n3-1': { prompt: 'What should happen to the previous file?', choices: ['It should not be used', 'It should be printed', 'It should be forwarded', 'It should be corrected by hand'], answer: 'It should not be used' },
    'listen-n3-2': { prompt: 'Why was the reservation delayed?', choices: ['Traffic was heavy', 'The shop was closed', 'The train stopped', 'The guest was ill'], answer: 'Traffic was heavy' },
    'listen-n2-1': { prompt: 'What concern still remains?', choices: ['The cost', 'The schedule', 'The team size', 'The legal approval'], answer: 'The cost' },
    'listen-n2-2': { prompt: 'What should waiting visitors do?', choices: ["Follow the staff's guidance", 'Return tomorrow', 'Use another entrance', 'Buy another ticket'], answer: "Follow the staff's guidance" },
    'listen-n1-1': { prompt: 'What outcome does the speaker fear?', choices: ['Confusion caused by frontline burden', 'A lack of general support', 'An immediate budget cut', 'The proposal being too slow'], answer: 'Confusion caused by frontline burden' },
    'listen-n1-2': { prompt: 'What do the results NOT do?', choices: ['Directly prove the hypothesis', 'Suggest a need for review', 'Challenge a conventional account', 'Offer material for interpretation'], answer: 'Directly prove the hypothesis' }
  };

  readings.forEach((reading) => {
    reading.questions = [
      { question: reading.question, choices: reading.choices, answer: reading.answer },
      readingFollowups[reading.id]
    ];
  });

  listening.forEach((clip) => {
    clip.questions = [
      { prompt: clip.prompt, choices: clip.choices, answer: clip.answer },
      listeningFollowups[clip.id]
    ];
  });

  const speaking = [
    { level: 'N5', japanese: 'はじめまして。アレックスです。よろしくお願いします。', reading: 'Hajimemashite. Arekkusu desu. Yoroshiku onegaishimasu.', meaning: 'Nice to meet you. I’m Alex. I look forward to knowing you.', tip: 'Keep each mora even; do not strongly stress one syllable.' },
    { level: 'N4', japanese: '日本語がもっと自然に話せるようになりたいです。', reading: 'Nihongo ga motto shizen ni hanaseru yō ni naritai desu.', meaning: 'I want to become able to speak Japanese more naturally.', tip: 'Hold the long ō sound in よう for two beats.' },
    { level: 'N3', japanese: '必ずしも高いものがいいというわけではありません。', reading: 'Kanarazushimo takai mono ga ii to iu wake dewa arimasen.', meaning: 'It does not necessarily mean expensive things are good.', tip: 'Let では compress naturally toward “dewa,” but keep it intelligible.' },
    { level: 'N2', japanese: '状況を踏まえたうえで、改めて検討させていただきます。', reading: 'Jōkyō o fumaeta ue de, aratamete kentō sasete itadakimasu.', meaning: 'Taking the situation into account, we will reconsider it.', tip: 'Use a calm falling contour at the end for professional confidence.' },
    { level: 'N1', japanese: '短期的な成果のみを追求すれば、本来の目的を見失いかねません。', reading: 'Tankiteki na seika nomi o tsuikyū sureba, honrai no mokuteki o miushinai kanemasen.', meaning: 'If we pursue only short-term results, we may lose sight of the original purpose.', tip: 'Chunk the sentence at the comma and keep compound nouns rhythmically grouped.' }
  ];

  const culture = [
    { icon: '🍵', title: 'Politeness is relational', tag: 'Communication', body: 'Japanese register reflects distance, role, setting, and the social direction of an action—not simply “formal versus casual.”' },
    { icon: '🎵', title: 'Pitch accent matters', tag: 'Pronunciation', body: 'Japanese uses high and low pitch patterns rather than English-style stress. Start by hearing mora timing, then notice where pitch falls.' },
    { icon: '🚉', title: 'Reading the environment', tag: 'Daily life', body: 'Station signs, floor markings, pictograms, and set announcements form a practical literacy system worth studying alongside textbooks.' },
    { icon: '🙇', title: 'Aizuchi keeps rhythm', tag: 'Conversation', body: 'Short responses such as はい, そうですね, and なるほど signal active listening. They do not always mean complete agreement.' },
    { icon: '✉️', title: 'Messages follow shapes', tag: 'Writing', body: 'Japanese emails often open with acknowledgment, provide context before the request, and close with a considerate formula.' },
    { icon: '🍱', title: 'Counters categorize', tag: 'Language', body: 'Objects are counted according to shape or category: 本 for long items, 枚 for flat items, 人 for people, and many more.' }
  ];

  const corpus = window.KUMO_CORPUS;
  window.KUMO_DATA = Object.freeze({
    levels,
    levelOrder: ['N5', 'N4', 'N3', 'N2', 'N1'],
    kana,
    kanaCombos,
    vocabulary: corpus?.vocabulary || vocabulary,
    grammar: corpus?.grammar || grammar,
    kanji: corpus?.kanji || kanji,
    corpusMeta: corpus?.meta || null,
    posLabels: corpus?.posLabels || {},
    legacyAliases: corpus?.aliases || { vocabulary: {} },
    particleExercises: window.KUMO_PARTICLES?.exercises || [],
    particleMeta: window.KUMO_PARTICLES?.meta || null,
    readings,
    listening,
    speaking,
    culture
  });
})();
