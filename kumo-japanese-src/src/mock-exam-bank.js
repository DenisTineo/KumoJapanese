// Curated original JLPT-aligned practice forms validated against Kumo's open data.
// This file contains no questions copied from JLPT examinations or Jisho.org.
(() => {
  'use strict';

  const DATA = window.KUMO_DATA;
  if (!DATA) throw new Error('Kumo exam bank requires KUMO_DATA.');

  const LEVELS = Object.freeze(['N5', 'N4', 'N3', 'N2', 'N1']);
  const SECTIONS = Object.freeze({
    language: 'Language knowledge',
    reading: 'Reading',
    listening: 'Listening'
  });

  const sources = Object.freeze([
    Object.freeze({
      id: 'jmdict',
      name: 'JMdict',
      role: 'Word identities, spellings, readings, and parts of speech',
      route: 'OpenJLPT 0.3.0',
      license: 'EDRDG data distributed by OpenJLPT under CC BY-SA 4.0',
      url: 'https://www.edrdg.org/jmdict/j_jmdict.html'
    }),
    Object.freeze({
      id: 'kanjidic2',
      name: 'KANJIDIC2',
      role: 'Kanji readings, meanings, stroke counts, and example compounds',
      route: 'OpenJLPT 0.3.0',
      license: 'EDRDG data distributed by OpenJLPT under CC BY-SA 4.0',
      url: 'https://www.edrdg.org/wiki/index.php/KANJIDIC_Project'
    }),
    Object.freeze({
      id: 'tatoeba',
      name: 'Tatoeba',
      role: 'Example sentences used across Kumo’s broader reference and practice library',
      route: 'OpenJLPT 0.3.0',
      license: 'CC BY 2.0 FR; transformed bank distributed under CC BY-SA 4.0',
      url: 'https://tatoeba.org/'
    }),
    Object.freeze({
      id: 'openjlpt',
      name: 'OpenJLPT',
      role: 'Normalized corpus, grammar records, and source cross-references',
      route: 'Bundled revision 0d1d3410bec9',
      license: 'CC BY-SA 4.0',
      url: 'https://github.com/evanclan/OpenJLPT'
    }),
    Object.freeze({
      id: 'waller',
      name: 'Jonathan Waller’s JLPT resources',
      role: 'Community JLPT level assignments and English vocabulary glosses',
      route: 'OpenJLPT 0.3.0',
      license: 'CC BY through the OpenJLPT distribution',
      url: 'https://www.tanos.co.uk/jlpt/'
    }),
    Object.freeze({
      id: 'kumo',
      name: 'Kumo original',
      role: 'Authored Japanese reading passages, listening scripts, and comprehension questions',
      route: 'Kumo Open JLPT-Aligned Mock Bank 2.0.0',
      license: 'CC BY-SA 4.0 as part of the Kumo open mock bank',
      url: 'https://github.com/DenisTineo/KumoJapanese'
    }),
    Object.freeze({
      id: 'kanjivg',
      name: 'KanjiVG',
      role: 'Stroke-order vectors used elsewhere in Kumo’s writing practice',
      route: 'Bundled revision 70a0b7ae0c18',
      license: 'CC BY-SA 3.0',
      url: 'https://github.com/KanjiVG/kanjivg'
    })
  ]);

  const sourceById = Object.fromEntries(sources.map((source) => [source.id, source]));
  const grammarById = new Map(DATA.grammar.map((rule) => [rule.id, rule]));

  const passageQuestions = Object.freeze({
    'read-n5-1': [
      ['話している人は、学校へどうやって行きますか。', ['電車で行きます。', 'バスで行きます。', '歩いて行きます。', '自転車で行きます。'], '電車で行きます。'],
      ['日本語のクラスは何時からですか。', ['七時からです。', '八時からです。', '九時からです。', '十時からです。'], '九時からです。'],
      ['家を出る前に、何をしますか。', ['水を飲んで、パンを食べます。', '電車に乗って、学校へ行きます。', '日本語を勉強して、寝ます。', '友達に会って、話します。'], '水を飲んで、パンを食べます。']
    ],
    'read-n5-2': [
      ['青い傘は、だれの傘ですか。', ['話している人の傘です。', '田中さんの傘です。', '先生の傘です。', '友達の傘です。'], '田中さんの傘です。'],
      ['話している人の傘は何色ですか。', ['青いです。', '黒いです。', '白いです。', '赤いです。'], '黒いです。'],
      ['話している人は、青い傘を見つけた後で何をしましたか。', ['駅を出ました。', '傘を買いました。', '田中さんに電話しました。', '先生に渡しました。'], '田中さんに電話しました。']
    ],
    'read-n4-1': [
      ['図書館は、なぜ月曜日に休みますか。', ['祝日だからです。', '工事をするからです。', '天気が悪いからです。', '職員が勉強するからです。'], '工事をするからです。'],
      ['本を返す人は、どこに本を入れますか。', ['受付の机の上です。', '駅の外の箱です。', '入口の隣の箱です。', '工事をしている部屋です。'], '入口の隣の箱です。'],
      ['火曜日、図書館は何時に開きますか。', ['朝八時です。', '朝九時です。', '朝十時です。', '昼十二時です。'], '朝九時です。']
    ],
    'read-n4-2': [
      ['初めは、土曜日にどこへ行く予定でしたか。', ['山です。', '博物館です。', '映画館です。', '駅です。'], '山です。'],
      ['予定を変えたのは、なぜですか。', ['駅が遠いからです。', '博物館が休みだからです。', '雨が降りそうだからです。', '昼ご飯を食べたいからです。'], '雨が降りそうだからです。'],
      ['二人は、どこで何時に会いますか。', ['駅で十時です。', '山で九時です。', '博物館で十時です。', '店で十二時です。'], '駅で十時です。']
    ],
    'read-n3-1': [
      ['在宅勤務のよい点として、何が挙げられていますか。', ['通勤時間を省けることです。', '仕事が必ず早く終わることです。', '同僚と話しやすいことです。', '休みが長くなることです。'], '通勤時間を省けることです。'],
      ['筆者は、在宅勤務にはどんな問題があると考えていますか。', ['外へ出られないことです。', '仕事と休みを分けにくいことです。', '散歩する時間がないことです。', '通勤に時間がかかることです。'], '仕事と休みを分けにくいことです。'],
      ['筆者は、気持ちを切り替えるために何をしていますか。', ['仕事の前に散歩し、仕事の後にも外へ出ています。', '仕事中に音楽を聞いています。', '毎日違う部屋で働いています。', '同僚に電話しています。'], '仕事の前に散歩し、仕事の後にも外へ出ています。']
    ],
    'read-n3-2': [
      ['外国語を話すとき、黙ってしまう人がいるのはなぜですか。', ['話す内容がないからです。', '間違いを恐れているからです。', '勉強が好きではないからです。', '相手の声が聞こえないからです。'], '間違いを恐れているからです。'],
      ['筆者によると、実際に外国語を使うと何が分かりますか。', ['自分に足りないことです。', '試験の結果です。', '相手の年齢です。', '正しい勉強時間です。'], '自分に足りないことです。'],
      ['筆者は、間違いをどのように考えていますか。', ['才能がない証拠だと考えています。', '避けなければならない失敗だと考えています。', '次に学ぶことを示す情報だと考えています。', '勉強をやめる理由だと考えています。'], '次に学ぶことを示す情報だと考えています。']
    ],
    'read-n2-1': [
      ['都市の利便性が高まると、どのような傾向が見られますか。', ['静かな場所が減ります。', '通勤時間が長くなります。', '緑地が自然に増えます。', '住民が町を離れます。'], '静かな場所が減ります。'],
      ['効率だけを優先した街づくりには、どんなおそれがありますか。', ['交通が不便になります。', '住民の心身の健康を損ないます。', '工事の費用が下がります。', '静かな場所が増えます。'], '住民の心身の健康を損ないます。'],
      ['筆者は、どのような施策が必要だと述べていますか。', ['道路を広くする施策です。', '営業時間を延ばす施策です。', '小さくても緑地を確保する施策です。', '公共交通を減らす施策です。'], '小さくても緑地を確保する施策です。']
    ],
    'read-n2-2': [
      ['情報が多ければ、判断は必ず簡単になると筆者は考えていますか。', ['はい、必ず簡単になると考えています。', 'いいえ、必ずしも簡単にはならないと考えています。', '情報の量は判断と関係ないと考えています。', '少ない情報では判断できないと考えています。'], 'いいえ、必ずしも簡単にはならないと考えています。'],
      ['出典を確認せずに情報を共有すると、どうなる可能性がありますか。', ['誤解が広がる可能性があります。', '情報が短くなる可能性があります。', '判断が自動化される可能性があります。', '出典が信頼される可能性があります。'], '誤解が広がる可能性があります。'],
      ['内容そのもののほかに、何を考える必要がありますか。', ['文章の長さと画像の数です。', '発信した人とその目的です。', '使われている色と文字です。', '共有された回数と時間です。'], '発信した人とその目的です。']
    ],
    'read-n1-1': [
      ['選択肢の多さは、一般に何の象徴として歓迎されがちですか。', ['効率の象徴です。', '自由の象徴です。', '責任の象徴です。', '不安の象徴です。'], '自由の象徴です。'],
      ['選ぶ基準が曖昧なまま選択肢が増えると、どうなりかねませんか。', ['可能性が自然に狭まります。', '決断をためらうようになります。', '価値観が明確になります。', 'すぐに正解を選べます。'], '決断をためらうようになります。'],
      ['筆者が最も重要だと考えていることは何ですか。', ['可能性を限りなく増やすことです。', '人気のある選択に従うことです。', '自分が何を重視するか見極めることです。', 'できるだけ早く決めることです。'], '自分が何を重視するか見極めることです。']
    ],
    'read-n1-2': [
      ['伝統を踏襲することについて、どのような考え方が紹介されていますか。', ['過去の形式をそのまま保存することだという考えです。', '社会との接点をすべて断つことだという考えです。', '新しい表現だけを採用することだという考えです。', '核となる価値を捨てることだという考えです。'], '過去の形式をそのまま保存することだという考えです。'],
      ['社会との接点を失った伝統は、どうなると述べられていますか。', ['より広く受け入れられます。', '形骸化を余儀なくされます。', '自然に価値が高まります。', '保存しやすくなります。'], '形骸化を余儀なくされます。'],
      ['伝統の継承に欠かせないものは何ですか。', ['形式を一切変えない厳格さです。', '時代に応じて表現を変える柔軟さです。', '現代社会を拒む姿勢です。', '過去を解釈しない態度です。'], '時代に応じて表現を変える柔軟さです。']
    ]
  });

  const listeningQuestions = Object.freeze({
    'listen-n5-1': [
      ['お客さんは何を注文しましたか。', ['コーヒーを一つ注文しました。', '水を一つ注文しました。', 'コーヒーを二つ注文しました。', '砂糖を一つ注文しました。'], 'コーヒーを一つ注文しました。'],
      ['お客さんがいらないものは何ですか。', ['コーヒーです。', '水です。', '砂糖です。', '牛乳です。'], '砂糖です。'],
      ['お客さんは何をしていますか。', ['飲み物を注文しています。', '駅を探しています。', '友達を待っています。', '本を返しています。'], '飲み物を注文しています。']
    ],
    'listen-n5-2': [
      ['二人は何時に会いますか。', ['八時半です。', '九時です。', '九時半です。', '十時半です。'], '九時半です。'],
      ['二人はどこで会いますか。', ['学校です。', '駅です。', '家です。', '喫茶店です。'], '駅です。'],
      ['二人はいつ会いますか。', ['今日です。', '明日です。', '来週です。', '日曜日です。'], '明日です。']
    ],
    'listen-n4-1': [
      ['この電車はどこへ行きませんか。', ['新宿です。', '東京です。', '次の駅です。', '終点です。'], '新宿です。'],
      ['乗客はどこで電車を乗り換えますか。', ['新宿です。', '次の駅です。', '今の駅です。', '終点です。'], '次の駅です。'],
      ['乗客は何に乗り換えますか。', ['バスです。', '普通電車です。', '急行です。', '最終電車です。'], '急行です。']
    ],
    'listen-n4-2': [
      ['土曜日の天気はどうですか。', ['晴れです。', '雨です。', '雪です。', '曇りです。'], '晴れです。'],
      ['雨はいつから降るそうですか。', ['土曜日の朝です。', '土曜日の夜です。', '日曜日の午後です。', '月曜日です。'], '日曜日の午後です。'],
      ['これは何についての話ですか。', ['週末の天気です。', '電車の時間です。', '店の予定です。', '旅行の費用です。'], '週末の天気です。']
    ],
    'listen-n3-1': [
      ['新しい資料を送ったのはなぜですか。', ['数字に間違いがあったからです。', '会議が延期されたからです。', 'デザインを変えたからです。', 'ページが足りなかったからです。'], '数字に間違いがあったからです。'],
      ['前のファイルはどうしますか。', ['印刷します。', '使いません。', '転送します。', '手で直します。'], '使いません。'],
      ['修正版はどのように送られましたか。', ['郵便です。', 'メールです。', '手渡しです。', 'ファックスです。'], 'メールです。']
    ],
    'listen-n3-2': [
      ['予約は初め何時からでしたか。', ['六時半です。', '七時です。', '七時半です。', '八時です。'], '七時です。'],
      ['新しい予約時間は何時ですか。', ['六時半です。', '七時です。', '七時半です。', '八時です。'], '七時半です。'],
      ['予約を遅らせたのはなぜですか。', ['道が混んでいるからです。', '店が閉まっているからです。', '電車が止まったからです。', '体調が悪いからです。'], '道が混んでいるからです。']
    ],
    'listen-n2-1': [
      ['まだ残っている課題は何ですか。', ['費用です。', '日程です。', '人数です。', '許可です。'], '費用です。'],
      ['計画について、何が決まりましたか。', ['中止することです。', '延期することです。', '予定どおり進めることです。', '規模を小さくすることです。'], '予定どおり進めることです。'],
      ['その決定では、何が考慮されましたか。', ['短期的な費用だけです。', '長期的な効果です。', '担当者の人数です。', '会議の日程です。'], '長期的な効果です。']
    ],
    'listen-n2-2': [
      ['入場が制限されているのはなぜですか。', ['展示室が混雑しているからです。', '展示品が壊れたからです。', '閉館時間になったからです。', '係員がいないからです。'], '展示室が混雑しているからです。'],
      ['入場の制限はどのようなものですか。', ['永久的なものです。', '一時的なものです。', '子どもだけが対象です。', '予約者だけが対象です。'], '一時的なものです。'],
      ['待っている客はどうすればいいですか。', ['明日また来ます。', '別の入口を使います。', '係員の案内に従います。', '新しい切符を買います。'], '係員の案内に従います。']
    ],
    'listen-n1-1': [
      ['話し手は、提案の趣旨についてどう考えていますか。', ['賛同しています。', '完全に反対しています。', '理解できないと考えています。', '関心がないと考えています。'], '賛同しています。'],
      ['話し手が懸念していることは何ですか。', ['予算が直ちに削減されることです。', '現場の負担によって混乱が生じることです。', '提案への支持が多すぎることです。', '導入が遅すぎることです。'], '現場の負担によって混乱が生じることです。'],
      ['話し手の立場として最も近いものはどれですか。', ['趣旨には賛成だが、導入方法には慎重です。', '提案をすぐに導入すべきだと考えています。', '提案そのものを全面的に否定しています。', '現場の負担は問題にならないと考えています。'], '趣旨には賛成だが、導入方法には慎重です。']
    ],
    'listen-n1-2': [
      ['今回の結果は、仮説を直接証明していますか。', ['はい、完全に証明しています。', 'いいえ、直接は証明していません。', '仮説とは関係ありません。', '証明できないと断定しています。'], 'いいえ、直接は証明していません。'],
      ['結果は何の必要性を示唆していますか。', ['研究を中止する必要性です。', '従来の説明を見直す必要性です。', '仮説を削除する必要性です。', '資料を公開しない必要性です。'], '従来の説明を見直す必要性です。'],
      ['話し手の表現のしかたには、どんな特徴がありますか。', ['結果を断定的に評価しています。', '慎重に可能性を述べています。', '研究の価値を完全に否定しています。', '結論を出すことを拒んでいます。'], '慎重に可能性を述べています。']
    ]
  });

  const languageQuestions = Object.freeze({
    N5: [
      ['vocabulary-context', '小学生なので、毎日＿＿＿へ行って授業を受けます。', ['学校', '駅', '病院', '会社'], '学校', '学校', 'がっこう'],
      ['vocabulary-context', '田中さんとは子どものころからの＿＿＿です。', ['友達', '学生', '先生', '医者'], '友達', '友達', 'ともだち'],
      ['vocabulary-context', 'のどが渇いたので、＿＿＿を飲みました。', ['水', '本', '電車', '学校'], '水', '水', 'みず'],
      ['vocabulary-reading', '今日はいい天気です。', ['きょう', 'こんや', 'きのう', 'あした'], 'きょう', '今日', 'きょう'],
      ['vocabulary-reading', 'あの建物はとても大きいです。', ['おおきい', 'ちいさい', 'ひろい', 'たかい'], 'おおきい', '大きい', 'おおきい'],
      ['vocabulary-reading', '毎朝、パンを食べる。', ['たべる', 'のべる', 'くらべる', 'しらべる'], 'たべる', '食べる', 'たべる'],
      ['kanji-reading', '授業の時間を確認します。', ['じかん', 'じけん', 'じだい', 'じぶん'], 'じかん', '時間', 'じかん'],
      ['kanji-reading', '駅の近くに銀行があります。', ['ぎんこう', 'りょこう', 'こうこう', 'くうこう'], 'ぎんこう', '銀行', 'ぎんこう'],
      ['kanji-reading', '夏休みに家族で旅行します。', ['りょこう', 'ぎんこう', 'ひこう', 'りゅうこう'], 'りょこう', '旅行', 'りょこう']
    ],
    N4: [
      ['vocabulary-context', 'この仕事には日本語の知識が＿＿＿です。', ['必要', '残念', '普通', '自由'], '必要', '必要', 'ひつよう'],
      ['vocabulary-context', '友達との＿＿＿を守って、十時に駅へ行きました。', ['約束', '連絡', '運転', '習慣'], '約束', '約束', 'やくそく'],
      ['vocabulary-context', '父は毎日、会社まで車を＿＿＿します。', ['運転', '連絡', '約束', '説明'], '運転', '運転', 'うんてん'],
      ['vocabulary-reading', '早起きは健康によい習慣です。', ['しゅうかん', 'しゅかん', 'しゅうけん', 'しょうかん'], 'しゅうかん', '習慣', 'しゅうかん'],
      ['vocabulary-reading', '着いたら家族に連絡してください。', ['れんらく', 'れんぞく', 'れんしゅう', 'れんけい'], 'れんらく', '連絡', 'れんらく'],
      ['vocabulary-reading', '試合が中止になって残念です。', ['ざんねん', 'さんねん', 'ざんしん', 'さんせい'], 'ざんねん', '残念', 'ざんねん'],
      ['kanji-reading', '午後から会議があります。', ['かいぎ', 'かいわ', 'かいじょう', 'きょうぎ'], 'かいぎ', '会議', 'かいぎ'],
      ['kanji-reading', '電車は八時に出発します。', ['しゅっぱつ', 'しゅっせき', 'しゅっしん', 'はっしゃ'], 'しゅっぱつ', '出発', 'しゅっぱつ'],
      ['kanji-reading', '昨日、大きな地震がありました。', ['じしん', 'ちしん', 'じじょう', 'ちり'], 'じしん', '地震', 'じしん']
    ],
    N3: [
      ['vocabulary-context', '事故が起きた直後の現場の＿＿＿を詳しく説明してください。', ['状況', '影響', '関心', '実際'], '状況', '状況', 'じょうきょう'],
      ['vocabulary-context', '予約した電車の出発時間が正しいか、もう一度＿＿＿してください。', ['確認', '解決', '状況', '選択'], '確認', '確認', 'かくにん'],
      ['vocabulary-context', '原因を調べ、みんなで話し合って問題を＿＿＿しました。', ['解決', '確認', '影響', '関心'], '解決', '解決', 'かいけつ'],
      ['vocabulary-reading', '天気が試合に影響しました。', ['えいきょう', 'えんきょう', 'えいぎょう', 'えんぎょう'], 'えいきょう', '影響', 'えいきょう'],
      ['vocabulary-reading', '環境問題に関心があります。', ['かんしん', 'かくしん', 'かんじょう', 'かんけい'], 'かんしん', '関心', 'かんしん'],
      ['vocabulary-reading', '実際に使ってみると便利です。', ['じっさい', 'じつざい', 'じっせい', 'じつさい'], 'じっさい', '実際', 'じっさい'],
      ['kanji-reading', '政府が新しい方針を発表しました。', ['せいふ', 'せいぶ', 'しょうふ', 'せいほ'], 'せいふ', '政府', 'せいふ'],
      ['kanji-reading', 'その問題について議論しました。', ['ぎろん', 'ぎけつ', 'ぎいん', 'きろん'], 'ぎろん', '議論', 'ぎろん'],
      ['kanji-reading', '多くの選択の中から一つ選びます。', ['せんたく', 'せんとう', 'せんしゅ', 'せいたく'], 'せんたく', '選択', 'せんたく']
    ],
    N2: [
      ['vocabulary-context', '十分な根拠があり、論理にも矛盾がないので、この判断は＿＿＿です。', ['妥当', '安易', '怪しい', '有難い'], '妥当', '妥当', 'だとう'],
      ['vocabulary-context', '状況が変わったため、計画を根本から＿＿＿必要があります。', ['見直す', '味わう', '預かる', '扇ぐ'], '見直す', '見直す', 'みなおす'],
      ['vocabulary-context', '合否を判断するための＿＿＿を全員に説明しました。', ['基準', '構造', '意義', '一応'], '基準', '基準', 'きじゅん'],
      ['vocabulary-reading', '日程を改めてお知らせします。', ['あらためて', 'あきらめて', 'あたためて', 'あらわして'], 'あらためて', '改めて', 'あらためて'],
      ['vocabulary-reading', '書類は一応確認しました。', ['いちおう', 'いっそう', 'いちよう', 'いちど'], 'いちおう', '一応', 'いちおう'],
      ['vocabulary-reading', '建物の構造を詳しく調べます。', ['こうぞう', 'こうそう', 'こうじょう', 'こぞう'], 'こうぞう', '構造', 'こうぞう'],
      ['kanji-reading', '駅の改札で友達を待っています。', ['かいさつ', 'かいせつ', 'あらためふだ', 'かいさく'], 'かいさつ', '改札', 'かいさつ'],
      ['kanji-reading', '法律が今年改正されました。', ['かいせい', 'かいしょう', 'あらためただす', 'かいぜい'], 'かいせい', '改正', 'かいせい'],
      ['kanji-reading', '事故を防止する対策が必要です。', ['ぼうし', 'ほうし', 'ぼうじ', 'ほうじ'], 'ぼうし', '防止', 'ぼうし']
    ],
    N1: [
      ['vocabulary-context', '一つの方法にこだわらず、状況の変化に＿＿＿に対応する必要があります。', ['柔軟', '一律', '極端', '鮮やか'], '柔軟', '柔軟', 'じゅうなん'],
      ['vocabulary-context', '新しい証拠が、これまでの定説を＿＿＿可能性があります。', ['覆す', '志す', '欺く', '操る'], '覆す', '覆す', 'くつがえす'],
      ['vocabulary-context', '説明を始める前に、提案の＿＿＿を確認してください。', ['趣旨', '権限', '規範', '介入'], '趣旨', '趣旨', 'しゅし'],
      ['vocabulary-reading', '信頼を損なう行為は避けるべきです。', ['そこなう', 'おぎなう', 'ともなう', 'うしなう'], 'そこなう', '損なう', 'そこなう'],
      ['vocabulary-reading', '若いころから研究者を志す。', ['こころざす', 'めざす', 'したがう', 'たくす'], 'こころざす', '志す', 'こころざす'],
      ['vocabulary-reading', '景気が急速に悪化しました。', ['あっか', 'あくか', 'わるか', 'あっけ'], 'あっか', '悪化', 'あっか'],
      ['kanji-reading', '必要な予算を確保しました。', ['かくほ', 'かくほう', 'かくぼ', 'かくぽ'], 'かくほ', '確保', 'かくほ'],
      ['kanji-reading', '政府が新しい政策を発表しました。', ['せいさく', 'せいさつ', 'しょうさく', 'せさく'], 'せいさく', '政策', 'せいさく'],
      ['kanji-reading', 'その主張には十分な証拠があります。', ['しょうこ', 'しょうご', 'せいこ', 'しょうきょ'], 'しょうこ', '証拠', 'しょうこ']
    ]
  });

  const grammarQuestions = Object.freeze({
    N5: [
      ['毎朝7時＿＿起きます。', ['に', 'の', 'が', 'を'], 'に', 'oj-g-ni-time'],
      ['これは私＿＿かさです。', ['の', 'に', 'が', 'を'], 'の', 'oj-g-no'],
      ['もう昼ですが、けさは朝ご飯を食べ＿＿。', ['ませんでした', 'に', 'が', 'から'], 'ませんでした', 'oj-g-masen-deshita'],
      ['外では雨＿＿降っています。', ['が', 'を', 'に', 'の'], 'が', 'oj-g-ga-subject'],
      ['毎朝パン＿＿食べます。', ['を', 'が', 'に', 'の'], 'を', 'oj-g-o'],
      ['今日は寒い＿＿、コートを着ます。', ['から', 'に', 'が', 'を'], 'から', 'oj-g-kara-reason']
    ],
    N4: [
      ['頭が痛い＿＿、今日は早く帰ります。', ['ので', 'ができます', 'にしました', 'もらいました'], 'ので', 'oj-g-node'],
      ['この図書館では、本を二週間借りること＿＿。', ['ができます', 'ので', 'のに', 'もらいました'], 'ができます', 'oj-g-koto-ga-dekiru'],
      ['健康のために、自分で毎朝歩くこと＿＿。', ['にしました', 'ので', 'のに', 'もらいました'], 'にしました', 'oj-g-koto-ni-suru'],
      ['昨日、先輩にレポートを見て＿＿。', ['もらいました', 'ができます', 'にしました', 'があります'], 'もらいました', 'oj-g-te-morau'],
      ['一生懸命勉強した＿＿、試験に落ちてしまいました。', ['のに', 'ができます', 'にしました', 'もらいました'], 'のに', 'oj-g-noni-although'],
      ['忙しいときは、朝ご飯を食べないこと＿＿。', ['があります', 'ので', 'のに', 'もらいました'], 'があります', 'oj-g-koto-ga-aru']
    ],
    N3: [
      ['こんなに練習したのだから、試合に負ける＿＿と断言できます。', ['わけがない', 'そうにない', 'ずに', 'たびに'], 'わけがない', 'oj-g-wake-ga-nai'],
      ['健康のために、週に三回はジムに通う＿＿。', ['ことにしている', '一方で', 'たびに', 'ずに'], 'ことにしている', 'oj-g-koto-ni-shite-iru'],
      ['空を見ると、この雨は夕方までやみ＿＿。', ['そうにない', 'わけがない', '一方で', 'たびに'], 'そうにない', 'oj-g-sou-ni-nai-sou-mo-nai'],
      ['インターネットは便利な＿＿、危険な面もあります。', ['一方で', 'そうにない', 'ずに', 'たびに'], '一方で', 'oj-g-ippou-de'],
      ['この写真を見る＿＿、大学時代を思い出します。', ['たびに', 'ずに', 'そうにない', 'わけがない'], 'たびに', 'grammar-14'],
      ['けさは朝ご飯を食べ＿＿家を出ました。', ['ずに', 'そうにない', '一方で', 'たびに'], 'ずに', 'oj-g-zu-ni']
    ],
    N2: [
      ['悪天候＿＿、大勢の観客が会場に集まりました。', ['にもかかわらず', 'をもとに', '以上は', 'どころか'], 'にもかかわらず', 'oj-g-ni-mo-kakawarazu'],
      ['薬を飲みましたが、熱は下がる＿＿、ますます高くなりました。', ['どころか', '以上は', 'をもとに', 'に伴って'], 'どころか', 'oj-g-dokoro-ka'],
      ['仕事を引き受けた＿＿、最後まで責任を持ってやります。', ['以上は', 'どころか', 'をもとに', 'に伴って'], '以上は', 'oj-g-ijou-wa'],
      ['たとえ冗談＿＿、そんなことを言うべきではありません。', ['にしろ', 'をもとに', 'に伴って', 'どころか'], 'にしろ', 'oj-g-ni-shiro-ni-seyo'],
      ['この小説は実話ではなく、作者の体験＿＿創作されています。', ['をもとに', 'にしろ', '以上は', 'どころか'], 'をもとに', 'oj-g-o-moto-ni'],
      ['高齢化の進行＿＿生じる医療費の増加が課題です。', ['に伴って', 'にしろ', '以上は', 'どころか'], 'に伴って', 'grammar-16']
    ],
    N1: [
      ['地域住民の理解＿＿、この計画の成功はあり得ません。', ['なくして', 'いかんで', 'であれ', 'あっての'], 'なくして', 'oj-g-nakushite-wa'],
      ['来季の契約は、今シーズンの成績＿＿決まります。', ['いかんで', 'であれ', 'あっての', 'をものともせず'], 'いかんで', 'oj-g-ikan-de-ikan-ni-yorazu'],
      ['理由が何＿＿、暴力は決して許されません。', ['であれ', 'いかんで', 'あっての', 'なしに'], 'であれ', 'oj-g-de-are-de-are-de-are'],
      ['お客様＿＿商売です。', ['あっての', 'いかんで', 'であれ', 'なしに'], 'あっての', 'oj-g-atte-no'],
      ['選手たちは激しい雨＿＿、最後まで戦い抜きました。', ['をものともせず', 'いかんで', 'であれ', 'あっての'], 'をものともせず', 'oj-g-o-mono-tomo-sezu'],
      ['基礎を固めること＿＿、応用力は身につきません。', ['なしに', 'いかんで', 'であれ', 'あっての'], 'なしに', 'oj-g-koto-nashi-ni']
    ]
  });

  function normalize(value) {
    return String(value ?? '').normalize('NFKC').trim().toLocaleLowerCase().replace(/[\s。、！？!?.,，・:：;；「」『』（）()]/gu, '');
  }

  function shuffled(items) {
    const result = [...items];
    for (let index = result.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
    }
    return result;
  }

  function validChoices(choices, answer) {
    if (!Array.isArray(choices) || choices.length !== 4) return false;
    const normalized = choices.map(normalize);
    return new Set(normalized).size === choices.length && normalized.filter((choice) => choice === normalize(answer)).length === 1;
  }

  function provenance(sourceId, recordId, detail = '') {
    const source = sourceById[sourceId];
    return Object.freeze({
      id: sourceId,
      name: source?.name || 'Kumo original',
      recordId: String(recordId || ''),
      detail: String(detail || ''),
      license: source?.license || 'Kumo application license',
      url: source?.url || ''
    });
  }

  function item(candidate) {
    if (!candidate?.id || !candidate?.prompt || !candidate?.answer || !validChoices(candidate.choices, candidate.answer)) return null;
    return Object.freeze({ ...candidate, choices: Object.freeze([...candidate.choices]) });
  }

  function grammarClozeItems(level, rules) {
    const rulesById = new Map(rules.map((rule) => [rule.id, rule]));
    return (grammarQuestions[level] || []).map((question, index) => {
      const [stimulus, choices, answer, sourceRuleId] = question;
      const sourceRule = rulesById.get(sourceRuleId);
      if (!sourceRule) return null;
      const sourceRecordId = sourceRule.sourceId || sourceRule.id;
      return item({
        id: `${level}-grammar-authored-${index + 1}`,
        level,
        resolvedLevel: sourceRule.level,
        sourceRuleId,
        sourceRecordId,
        section: SECTIONS.language,
        kind: 'choice',
        format: 'grammar-cloze',
        formatLabel: '文法 · 文の文法',
        prompt: '＿＿＿に入れるのに最もよい文法を選んでください。',
        stimulus,
        target: '',
        choices: [...choices],
        answer,
        explanation: `${sourceRule.pattern} expresses “${sourceRule.meaning}.”`,
        memoryPrompt: stimulus,
        source: provenance('openjlpt', sourceRecordId, `Original Kumo cloze item based on same-level OpenJLPT record ${sourceRule.id}`)
      });
    }).filter(Boolean);
  }

  function authoredQuestionItem(level, section, sourceRecord, question, index, kind) {
    const [prompt, choices, answer] = question;
    const isReading = section === SECTIONS.reading;
    return item({
      id: `${level}-${kind}-${sourceRecord.id}-${index}`,
      level,
      section,
      kind: isReading ? 'reading' : 'listening',
      format: kind,
      formatLabel: isReading ? '読解 · 内容理解' : '聴解 · 内容理解',
      prompt,
      passage: isReading ? sourceRecord.text : undefined,
      passageTitle: isReading ? sourceRecord.japaneseTitle : undefined,
      speech: isReading ? undefined : sourceRecord.text,
      choices: [...choices],
      answer,
      explanation: `${sourceRecord.text} — ${sourceRecord.translation}`,
      memoryPrompt: `${isReading ? '読' : '🎧'} ${sourceRecord.id}: ${prompt}`,
      source: provenance('kumo', sourceRecord.id, `Original Kumo ${isReading ? 'graded passage' : 'listening script and question'}`)
    });
  }

  function passageReadingItems(level) {
    return DATA.readings.filter((reading) => reading.level === level).flatMap((reading) =>
      (passageQuestions[reading.id] || []).map((question, index) => authoredQuestionItem(level, SECTIONS.reading, reading, question, index, 'passage-comprehension'))
    ).filter(Boolean);
  }

  function authoredListeningItems(level) {
    return DATA.listening.filter((clip) => clip.level === level && window.KUMO_AUDIO?.[clip.text]).flatMap((clip) =>
      (listeningQuestions[clip.id] || []).map((question, index) => authoredQuestionItem(level, SECTIONS.listening, clip, question, index, 'listening-comprehension'))
    ).filter(Boolean);
  }

  function curatedLanguageItems(level) {
    return (languageQuestions[level] || []).map((question, index) => {
      const [format, stimulus, choices, answer, written, reading] = question;
      const word = DATA.vocabulary.find((entry) => entry.level === level && entry.word === written && normalize(entry.reading) === normalize(reading));
      if (!word) return null;
      const isContext = format === 'vocabulary-context';
      const isCompound = format === 'kanji-reading';
      const target = isContext ? '' : written;
      if (!isContext && !stimulus.includes(target)) return null;
      const kanjiSource = isCompound
        ? DATA.kanji.find((entry) => entry.level === level && (entry.words || []).some((candidate) => candidate?.[0] === written && normalize(candidate?.[1]) === normalize(reading)))
        : null;
      if (isCompound && !kanjiSource) return null;
      return item({
        id: `${level}-${format}-curated-${index + 1}`,
        level,
        resolvedLevel: word.level,
        sourceWordId: word.id,
        section: SECTIONS.language,
        kind: 'choice',
        format,
        formatLabel: isContext ? '文字・語彙 · 文脈規定' : '文字・語彙 · 漢字読み',
        prompt: isContext ? '＿＿＿に入れるのに最もよいものを選んでください。' : '下線のことばの読み方として最もよいものを選んでください。',
        stimulus,
        target,
        contextFree: false,
        choices: [...choices],
        answer,
        explanation: `${written} is read ${reading} and means “${word.meaning}.”`,
        memoryPrompt: stimulus,
        source: isCompound
          ? provenance('kanjidic2', kanjiSource.char, `Original Kumo item; word validated against JMdict ${word.jmdictId || word.id}`)
          : provenance('jmdict', word.jmdictId || word.sourceId || word.id, 'Original Kumo item; level and gloss via OpenJLPT / Waller')
      });
    }).filter(Boolean);
  }

  function buildLevel(level) {
    const rules = DATA.grammar.filter((rule) => rule.level === level);
    const language = curatedLanguageItems(level);
    return Object.freeze({
      language: Object.freeze({
        context: Object.freeze(language.filter((question) => question.format === 'vocabulary-context')),
        wordReading: Object.freeze(language.filter((question) => question.format === 'vocabulary-reading')),
        kanjiReading: Object.freeze(language.filter((question) => question.format === 'kanji-reading')),
        grammar: Object.freeze(grammarClozeItems(level, rules))
      }),
      reading: Object.freeze({ passage: Object.freeze(passageReadingItems(level)) }),
      listening: Object.freeze({ comprehension: Object.freeze(authoredListeningItems(level)) })
    });
  }

  const levelCache = new Map();
  const statsCache = new Map();

  function getLevel(level) {
    if (!LEVELS.includes(level)) throw new Error(`Unknown JLPT level: ${level}`);
    if (!levelCache.has(level)) levelCache.set(level, buildLevel(level));
    return levelCache.get(level);
  }

  function getStats(level) {
    if (statsCache.has(level)) return statsCache.get(level);
    const bank = getLevel(level);
    const language = Object.values(bank.language).reduce((sum, group) => sum + group.length, 0);
    const reading = Object.values(bank.reading).reduce((sum, group) => sum + group.length, 0);
    const listening = Object.values(bank.listening).reduce((sum, group) => sum + group.length, 0);
    const stats = Object.freeze({ language, reading, listening, total: language + reading + listening });
    statsCache.set(level, stats);
    return stats;
  }

  function semanticQuestionKey(question) {
    const stimulus = question.stimulus || question.passage || question.speech || '';
    return `${question.section}\u0000${normalize(stimulus)}\u0000${normalize(question.answer)}`;
  }

  function balancedSample(groups, quotas, total, section) {
    const selected = [];
    const selectedIds = new Set();
    const selectedSemantics = new Set();
    groups.forEach((group, index) => {
      shuffled(group).slice(0, quotas[index] || 0).forEach((question) => {
        const semanticKey = semanticQuestionKey(question);
        if (!selectedIds.has(question.id) && !selectedSemantics.has(semanticKey)) {
          selected.push(question);
          selectedIds.add(question.id);
          selectedSemantics.add(semanticKey);
        }
      });
    });
    if (selected.length < total) {
      const fallback = shuffled(groups.flat()).filter((question) => !selectedIds.has(question.id) && !selectedSemantics.has(semanticQuestionKey(question)));
      while (selected.length < total && fallback.length) {
        const question = fallback.shift();
        selected.push(question);
        selectedIds.add(question.id);
        selectedSemantics.add(semanticQuestionKey(question));
      }
    }
    if (selected.length !== total) throw new Error(`${section} has ${selected.length} valid questions; ${total} are required.`);
    return shuffled(selected).map((question) => ({ ...question, choices: shuffled(question.choices), source: { ...question.source } }));
  }

  function createExam(level, mode = 'full') {
    const full = mode === 'full';
    const bank = getLevel(level);
    const language = balancedSample(
      [bank.language.context, bank.language.wordReading, bank.language.kanjiReading, bank.language.grammar],
      full ? [3, 3, 3, 3] : [2, 2, 1, 1],
      full ? 12 : 6,
      `${level} language knowledge`
    );
    const reading = balancedSample([bank.reading.passage], [full ? 4 : 2], full ? 4 : 2, `${level} reading`);
    const listening = balancedSample([bank.listening.comprehension], [full ? 4 : 2], full ? 4 : 2, `${level} listening`);
    return [...language, ...reading, ...listening];
  }

  function validate() {
    const errors = [];
    const seenIds = new Set();
    const semanticOwners = new Map();
    const comprehensionLevels = new Map();
    const levelStats = {};
    const requiredGroups = {
      context: 3,
      wordReading: 3,
      kanjiReading: 3,
      grammar: 6,
      passage: 6,
      comprehension: 6
    };

    LEVELS.forEach((level) => {
      const bank = getLevel(level);
      levelStats[level] = getStats(level);
      const namedGroups = [
        ...Object.entries(bank.language),
        ...Object.entries(bank.reading),
        ...Object.entries(bank.listening)
      ];
      namedGroups.forEach(([name, questions]) => {
        if (questions.length !== requiredGroups[name]) errors.push(`${level} ${name} has ${questions.length} items; exactly ${requiredGroups[name]} required.`);
        questions.forEach((question) => {
          if (seenIds.has(question.id)) errors.push(`Duplicate question ID: ${question.id}`);
          seenIds.add(question.id);
          const semanticKey = semanticQuestionKey(question);
          const semanticOwner = semanticOwners.get(semanticKey);
          if (semanticOwner && semanticOwner !== question.id) errors.push(`Duplicate question content: ${semanticOwner} and ${question.id}`);
          semanticOwners.set(semanticKey, question.id);
          if (!validChoices(question.choices, question.answer)) errors.push(`Invalid choices: ${question.id}`);
          if (!/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u.test(question.prompt)) errors.push(`Non-Japanese prompt: ${question.id}`);
          if (['vocabulary-context', 'grammar-cloze'].includes(question.format) && question.stimulus.includes(question.answer)) errors.push(`Answer remains visible: ${question.id}`);
          if (['vocabulary-reading', 'kanji-reading'].includes(question.format) && (!question.target || !question.stimulus.includes(question.target))) errors.push(`Reading target is missing: ${question.id}`);
          if (['vocabulary-context', 'vocabulary-reading', 'kanji-reading'].includes(question.format)) {
            const sourceWord = DATA.vocabulary.find((word) => word.id === question.sourceWordId);
            if (!sourceWord || sourceWord.level !== level || question.resolvedLevel !== level) errors.push(`Vocabulary source mismatch: ${question.id}`);
            if (question.format === 'vocabulary-context') {
              question.choices.forEach((choice) => {
                if (!DATA.vocabulary.some((word) => word.level === level && word.word === choice)) errors.push(`Context distractor is outside ${level}: ${question.id} → ${choice}`);
              });
            }
          }
          if (question.format === 'kanji-reading' && question.resolvedLevel !== level) errors.push(`Compound level mismatch: ${question.id}`);
          if (question.format === 'grammar-cloze') {
            const sourceRule = grammarById.get(question.sourceRuleId);
            const levelGrammarChoices = new Set((grammarQuestions[level] || []).map((entry) => normalize(entry[2])));
            if (!sourceRule || sourceRule.level !== level || question.resolvedLevel !== level || question.sourceRecordId !== (sourceRule.sourceId || sourceRule.id) || question.source.recordId !== question.sourceRecordId) errors.push(`Grammar source mismatch: ${question.id}`);
            if (question.choices.some((choice) => /[〜～/／()（）]/u.test(choice))) errors.push(`Malformed grammar choice: ${question.id}`);
            question.choices.forEach((choice) => {
              if (!levelGrammarChoices.has(normalize(choice))) errors.push(`Grammar distractor is outside ${level}: ${question.id} → ${choice}`);
            });
          }
          if (!sourceById[question.source?.id] || question.source.name !== sourceById[question.source.id].name || !/^https:\/\//i.test(question.source.url)) errors.push(`Source metadata mismatch: ${question.id}`);
          if (question.kind === 'listening' && !window.KUMO_AUDIO?.[question.speech]) errors.push(`Listening audio is missing: ${question.id}`);
          if (question.kind === 'reading' || question.kind === 'listening') {
            const contentKey = `${question.kind}\u0000${question.kind === 'reading' ? question.passage : question.speech}`;
            if (!comprehensionLevels.has(contentKey)) comprehensionLevels.set(contentKey, new Set());
            comprehensionLevels.get(contentKey).add(level);
          }
        });
      });
    });

    comprehensionLevels.forEach((levels, key) => {
      if (levels.size > 1) errors.push(`Comprehension content crosses levels: ${key.slice(0, 80)}`);
    });
    return Object.freeze({ ok: errors.length === 0, errors: Object.freeze(errors), itemCount: seenIds.size, levels: Object.freeze(levelStats) });
  }

  const meta = Object.freeze({
    name: 'Kumo Open JLPT-Aligned Mock Bank',
    version: '2.0.0',
    type: 'original-unofficial',
    notice: 'Original Kumo questions built from open-licensed Japanese data. No JLPT examination or Jisho.org question content is copied.',
    attribution: 'Bank items are validated against JMdict, KANJIDIC2, OpenJLPT, and Jonathan Waller’s community JLPT mappings. Tatoeba and KanjiVG support Kumo’s broader study library.',
    sourceAlignmentLabel: 'Upstream source alignment informed by Jisho.org’s public source list',
    sourceAlignmentUrl: 'https://jisho.org/about',
    sources
  });

  window.KUMO_MOCK_EXAMS = Object.freeze({ meta, getStats, createExam, validate });
})();
