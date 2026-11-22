import { plural, type PluralForms } from './plural';
import type { Messages } from './types';

const POINTS: PluralForms = { one: 'бал', few: 'балы', many: 'балаў', other: 'бала' };
const ANSWERS: PluralForms = { one: 'адказ', few: 'адказы', many: 'адказаў', other: 'адказу' };
const PARTICIPANTS: PluralForms = { one: 'удзельнік', few: 'удзельнікі', many: 'удзельнікаў', other: 'удзельніка' };

/** A score string with a decimal separator ("5,0") is fractional even when its value is whole. */
const forNumber = (count: string, forms: PluralForms) =>
  /[.,]/.test(count) ? forms.other : plural('be', count, forms);

export const be = {
  app: {
    title: 'NAWAmeter',
  },
  start: {
    kicker: 'Трэкер NAWA 2026',
    kickerNote: 'неафіцыйны',
    title: 'Дзе вы сярод кандыдатаў NAWA?',
    subtitle: 'Даведайцеся свой працэнтыль, сваё становішча адносна медыяны і тое, як змяняецца ваша група.',
    cta: 'Паказаць мой вынік',
    howItWorks: 'Як вылічваецца вынік?',
    whatYouSee: 'Што вы ўбачыце пасля запаўнення',
    whatYouSeeBody:
      'Ваш бал, працэнтыль у групе, пазіцыю адносна медыяны і тое, як змяняецца статыстыка, калі з’яўляюцца новыя адказы.',
    howScoreTitle: 'Арыентыровачны бал',
    howScoreBody:
      'Арыентыровачны бал лічыцца па правілах праграмы NAWA: паводле сярэдняга бала атэстата і — калі гэта вас датычыць — бонусных балаў за заканчэнне польскай школы або школы польскай дыяспары.',
    howScoreFormula:
      'сярэдні бал × 90 / максімум шкалы\n+ 0, 5 або 10 бонусных балаў',
    howScoreDisclaimer: 'Гэта не афіцыйнае рашэнне NAWA і не прагноз атрымання стыпендыі.',
    howPercentileTitle: 'Што азначае працэнтыль?',
    howPercentileBody:
      'Працэнтыль паказвае, якая частка вынікаў удзельнікаў трэкера ніжэй за ваш.',
    howPercentileExample:
      'Напрыклад, працэнтыль 70–80 азначае, што ваш вынік вышэйшы за прыкладна 70–80% вынікаў у выбранай групе.',
    previewBadge: 'Прыклад выніку',
    previewScoreUnit: 'бала',
    previewAboveMedianBy: (delta: string) => `На ${delta} бала вышэй за медыяну`,
    previewBelowMedianBy: (delta: string) => `На ${delta} бала ніжэй за медыяну`,
    previewTapeHint: 'Перацягніце лінейку, каб убачыць, як змяняецца ваша пазіцыя',
    previewPercentileLabel: 'працэнтыль',
    responseCount: (count: number, year: number) => `${count} ${plural('be', count, ANSWERS)} у наборы ${year}`,
    timePromise: 'Зойме каля 1 хвіліны',
    resumeTitle: 'У вас ёсць захаваныя адказы',
    resumeBody: 'Працягніце з таго месца, дзе спыніліся, або пачніце анкету спачатку.',
    resumeContinue: 'Працягнуць',
    resumeStartOver: 'Пачаць спачатку',
  },
  wizard: {
    next: 'Далей',
    sections: {
      education: 'Адукацыя',
      grades: 'Адзнакі',
    },
    educationTitle: 'Адукацыя',
    educationDescription: 'Мы параўноўваем вас з кандыдатамі з падобнай групы.',
    gradesTitle: 'Адзнакі',
    gradesDescription:
      'Увядзіце сярэдні бал атэстата. Максімальная адзнака шкалы вызначаецца паводле краіны, дзе вы скончылі сярэднюю школу.',
    rankingCountryHint: 'Вызначае вашу групу параўнання — вас параўноўваюць з кандыдатамі з гэтай краіны.',
    schoolCountryHint: 'Ад гэтага залежыць шкала адзнак (напрыклад, 12-бальная ва Украіне або 5-бальная ў Казахстане).',
    maximumGradeLockedHint: 'Шкала задана паводле краіны заканчэння сярэдняй школы.',
    averageAboveMaximum: 'Ого, сярэдні бал вышэйшы за максімум шкалы! Падобна на памылку — праверце значэнне.',
    belarusPoloniaBonusNotice:
      'Паводле документа Ogłoszenie nr 13/2026, pkt 2.7 (kryterium 2), бонус за польскую школу не датычыцца грамадзян Беларусі.',
    summaryTitle: 'Падсумаванне',
    summaryDescription: 'Праверце, з кім вас будуць параўноўваць і што будзе захавана.',
    cohortTitle: 'Вас будуць параўноўваць з кандыдатамі:',
    dataTitle: 'Вашы даныя',
    editSection: 'Змяніць',
    gradeBasisHint: 'NAWA лічыць сярэдні бал па выніковым атэстаце або па паўгадавых адзнаках, калі вы заканчваеце школу пасля 1 ліпеня.',
    studentInPolandNote: 'Студэнтам у Польшчы са сярэднім балам не ніжэй за 4,75 прысвойваецца максімум — 100 балаў.',
    validation: {
      studentAverageRequired: 'Студэнты ў Польшчы могуць удзельнічаць са сярэднім балам не ніжэй за 4,75 па шкале 2–5.',
      rankingCountryRequired: 'Абярыце краіну грамадзянства.',
      schoolCountryRequired: 'Абярыце краіну, дзе вы скончылі сярэднюю школу.',
      educationRequired: 'Запоўніце даныя пра адукацыю, каб працягнуць.',
      gradesRequired: 'Увядзіце сярэдні бал і пераканайцеся, што ён адпавядае шкале.',
      averageGradeRequired: 'Увядзіце сярэдні бал, каб працягнуць.',
    },
  },
  form: {
    submitCreate: 'Захаваць анкету',
    submitUpdate: 'Абнавіць анкету',
    saved: 'Захавана',
    saveError: 'Не атрымалася захаваць',
    saveErrorDraft: 'Вашы адказы засталіся на гэтай прыладзе. Паспрабуйце яшчэ раз.',
    editLimitToday: (time: string) =>
      `Бал можна змяняць не больш за тры разы за суткі. Наступная змена — пасля ${time}.`,
    editLimitDate: (when: string) =>
      `Бал можна змяняць не больш за тры разы за суткі. Наступная змена — пасля ${when}.`,
    cohortChangeTitle: 'Група параўнання зменіцца',
    cohortChangeBody:
      'Змена гэтых даных перанясе вас у іншую групу параўнання. Папярэдняя статыстыка больш не будзе паказвацца.',
    cohortChangeConfirm: 'Захаваць і змяніць групу',
    cohortChangeCancel: 'Скасаваць',
    deleteZoneTitle: 'Выдаленне анкеты',
    deleteZoneHint:
      'Выдаленне анкеты незваротнае. Усе захаваныя даныя і ваша месца ў статыстыцы будуць страчаны назаўсёды.',
    deleteConfirmPermanent: 'Так, выдаліць назаўсёды',
  },
  labels: {
    rankingCountry: 'Краіна грамадзянства',
    schoolCountry: 'У якой краіне вы скончылі сярэднюю школу?',
    scholarshipTrack: 'Тып стыпендыі',
    averageGrade: 'Сярэдні бал',
    maximumGrade: 'Максімальная адзнака ў вашай шкале',
    polishSchoolLevel: 'Ці скончылі вы польскую школу?',
    gradeBasis: 'Па якіх адзнаках вы паказалі сярэдні бал?',
    applicantKind: 'Хто вы як заяўнік?',
    averageGradePlaceholder: 'напр. 4,82',
    maximumGradePlaceholder: 'напр. 5,00',
  },
  choices: {
    scholarshipTrack: {
      nawa_director: 'Стыпендыя Дырэктара NAWA',
      health_minister: 'Стыпендыя Міністра аховы здароўя',
      culture_minister: 'Стыпендыя Міністра культуры і нацыянальнай спадчыны',
    },
    gradeBasis: {
      final_certificate: 'Выніковы атэстат (аб сярэдняй адукацыі)',
      half_year: 'Адзнакі за першае паўгоддзе 2025/26 (даведка са школы)',
    },
    applicantKind: {
      school_leaver: 'Выпускнік(-ца) сярэдняй школы (заканчваю або скончыў(-ла) за мяжой)',
      student_in_poland: 'Студэнт(ка) дзённай формы навучання ў Польшчы са сярэднім балам не ніжэй за 4,75 (шкала 2–5)',
    },
    polishSchoolLevel: {
      none: 'Не',
      primary: 'Так, пачатковую школу',
      secondary: 'Так, сярэднюю школу',
    },
  },
  countries: {
    placeholder: 'Абярыце краіну',
    searchPlaceholder: 'Пошук краіны…',
    popular: 'Папулярныя',
  },
  nawaScore: {
    preview: (score: string) => `Арыентыровачны бал: ${score}`,
    previewNote:
      'Арыентыровачны бал па формуле з документа Ogłoszenie nr 13/2026, pkt 2.7 (kryterium 2): адзнакі 0–90 балаў + бонус за польскую школу 0/5/10. Гэта не афіцыйны вынік NAWA.',
  },
  stats: {
    heroLabel: 'Ваш вынік',
    cohortTitle: 'Ваша група параўнання',
    loadingAriaLabel: 'Загрузка статыстыкі',
    errorAriaLabel: 'Памылка статыстыкі',
    groupResponseCount: 'Адказаў у групе',
    densityTitle: 'Размеркаванне балаў',
    densityCaption: 'Доля адказаў у кожным дыяпазоне балаў',
    chartYouLabel: 'Вы',
    chartMedianLabel: 'Медыяна групы',
    chartYou: (score: string) => `Ваш бал: ${score}`,
    chartMedian: (score: string) => `Медыяна групы: ${score}`,
    loading: 'Загрузка статыстыкі…',
    error: 'Не атрымалася загрузіць статыстыку. Праверце злучэнне і паспрабуйце яшчэ раз.',
    unavailable: 'Статыстыка з’явіцца пасля захавання анкеты.',
  },
  delta: {
    updatedQuiet: (when: string) => `Абноўлена ${when}`,
    updatedToday: (time: string) => `Абноўлена сёння ў ${time}`,
    updatedYesterday: (time: string) => `Абноўлена ўчора ў ${time}`,
  },
  privacyNotice: {
    title: 'Якія даныя захоўваюцца?',
    body:
      'Ніхто не бачыць вашых індывідуальных адказаў, толькі колькасці і дыяпазоны па групах. Ваш акаўнт захоўваецца як код, вылічаны з Telegram ID, а не як сам ID.',
    points: [
      'Адна анкета на адзін набор для кожнага акаўнта Telegram.',
      'Адказы анкеты захоўваюцца на серверы і выкарыстоўваюцца для групавой статыстыкі.',
      'Мы не захоўваем імя, e-mail, нумара тэлефона і username у Telegram.',
      'Невялікія краіны аб’ядноўваюцца ў групы, а балы стыпендыятаў паказваюцца інтэрваламі па 5 балаў.',
      'Вы можаце ў любы момант выдаліць усё ў наладах.',
      'Пасля выдалення анкеты каля сутак захоўваюцца толькі код акаўнта і час апошніх змен бала — каб абмежаванне на змены нельга было абысці.',
      'Калі вы ўключыце напаміны ў боце, ваш Telegram ID захоўваецца асобна ад анкеты, пакуль вы не выключыце напаміны. Выдаленне анкеты выдаляе і гэты запіс.',
      'Гэта псеўданімныя даныя, а не ананімныя: аўтар тэхнічна мог бы звязаць анкету з акаўнтам.',
    ],
    close: 'Закрыць',
  },
  settings: {
    title: 'Налады',
    open: 'Налады',
    back: 'Назад',
    viewData: 'Паглядзець захаваныя даныя',
    editProfile: 'Змяніць анкету',
    deleteData: 'Выдаліць маю анкету',
    privacyPolicy: 'Палітыка прыватнасці',
    appearance: 'Афармленне',
    language: 'Мова',
    help: 'Дапамога',
    reminders: 'Напаміны ў боце',
    invite: 'Запрасіць людзей з маёй краіны',
    inviteText: (country: string) =>
      `${country}: кандыдаты Anders NAWA! Даведайцеся ў NAWAmeter, дзе вы сярод іншых кандыдатаў.`,
    deleteConfirmTitle: 'Выдаліць анкету?',
    deleteConfirmBody: 'Гэта дзеянне нельга скасаваць. Усе захаваныя даныя будуць выдалены.',
    deleteCancel: 'Скасаваць',
    deleteError: 'Не атрымалася выдаліць анкету. Паспрабуйце яшчэ раз.',
    close: 'Закрыць',
  },
  support: {
    general: 'Падтрымка',
    calculationError: 'Памылка разліку',
    reportBug: 'Паведаміць пра памылку',
    hint: 'Адкрывае чат у Telegram з базавым кантэкстам. Дадатковыя асабістыя даныя не адпраўляюцца.',
  },
  about: {
    title: 'Пра NAWAmeter',
    intro: 'NAWAmeter — неафіцыйны трэкер для кандыдатаў Anders NAWA.',
    capabilitiesTitle: 'Што робіць сэрвіс',
    capabilitiesBody:
      'Паказвае ваш бал і ваша месца сярод балаў, якія ўказалі іншыя карыстальнікі з вашай краіны або групы краін.',
    dataTitle: 'Адкуль даныя',
    dataBody:
      'Статыстыка лічыцца па анкетах NAWAmeter, якія запаўняюць самі карыстальнікі, калі не ўказана іншае.',
    officialTitle: 'Што лічыцца афіцыйным',
    officialBody:
      'Афіцыйнымі лічацца толькі рашэнні NAWA і апублікаваныя правілы праграмы. Ацэнкі NAWAmeter і месцы ў выбарцы — не афіцыйны вынік конкурсу.',
    privacyTitle: 'Як абаронены вашы даныя',
    privacyBody:
      'Іншыя карыстальнікі не бачаць вашай анкеты. Невялікія краіны аб’ядноўваюцца ў групы, таму вылучыць асобную анкету немагчыма. Акаўнт захоўваецца як код, вылічаны з Telegram ID; паведамленні ў падтрымку выкарыстоўваюць кароткі ідэнтыфікатар.',
    metricsTitle: 'Як лічацца паказчыкі',
    metricsBody:
      'Ваша пазіцыя і працэнтыль лічацца спачатку па вашай краіне, потым па групе краін, потым па ўсіх краінах — у залежнасці ад колькасці адказаў.',
    authorTitle: 'Пра аўтара',
    authorBody: 'Незалежны праект, створаны, каб дапамагчы кандыдатам зразумець кантэкст конкурсу.',
    version: (version: string) => `Версія праграмы: ${version}`,
  },
  telegram: {
    gateTitle: 'Адкрыйце ў Telegram',
    gateBody:
      'Telegram патрэбны для бяспечнага ўваходу і каб на адзін акаўнт можна было запоўніць толькі адну анкету.',
    openInTelegram: 'Адкрыць у Telegram',
    copyBot: 'Скапіяваць імя бота',
    copied: 'Скапіявана',
    qrAlt: 'QR-код, каб адкрыць бота ў Telegram',
    missingInitData: 'Няма даных аўтэнтыфікацыі Telegram. Адкрыйце праграму з Telegram яшчэ раз.',
  },
  api: {
    invalidResponse: 'Сервер вярнуў некарэктны адказ.',
  },
  home: {
    loading: 'Загрузка анкеты…',
    loadError: 'Не атрымалася загрузіць вашу анкету',
    loadErrorHint: 'Захаваныя даныя не страчаны. Праверце злучэнне і паспрабуйце яшчэ раз.',
    retry: 'Паспрабаваць яшчэ раз',
    actionError: 'Не атрымалася выканаць гэта дзеянне.',
    offline: 'Няма злучэння з інтэрнэтам. Праверце сетку і паспрабуйце яшчэ раз.',
  },
  language: {
    label: 'Мова',
    pl: 'Polski',
    en: 'English',
    ru: 'Русский',
    uk: 'Українська',
    be: 'Беларуская',
  },
  theme: {
    light: 'Светлая',
    dark: 'Цёмная',
    switchToDark: 'Пераключыць на цёмную тэму',
    switchToLight: 'Пераключыць на светлую тэму',
  },
  scoreScreen: {
    seasonClosed: (year: string) => `Набор ${year} завершаны`,
    seasonOpen: (date: string) => `Заяўкі прымаюцца да ${date}`,
    whatIfLabel: 'А калі б: іншы сярэдні бал',
    scaleMax: '/ 100',
    aboveThreshold: (delta: string, threshold: string) => `На ${delta} ${forNumber(delta, POINTS)} вышэй за парог ${threshold}`,
    belowThreshold: (delta: string, threshold: string) => `На ${delta} ${forNumber(delta, POINTS)} ніжэй за парог ${threshold}`,
    atThreshold: (threshold: string) => `Роўна на парозе ${threshold}`,
    thresholdFlag: (threshold: string) => `парог ${threshold}`,
    tapeAriaLabel: (score: string, threshold: string) =>
      `Лінейка ад 0 да 100: бал ${score}, парог ${threshold}`,
    tapeHint: (step: string) => `Перацягніце лінейку: сярэдні бал змяніцца на ${step}`,
    whatIfNote: 'Значэнні «а калі б» не захоўваюцца. Каб змяніць адказы, выберыце «Змяніць анкету».',
    averageInputLabel: 'Сярэдні бал для спробы',
    decrease: 'Паменшыць сярэдні бал',
    increase: 'Павялічыць сярэдні бал',
    reset: 'Вярнуць захаваны',
    savedScore: (score: string) => `Захаваны бал: ${score}`,
    percentileBand: (from: number, to: number) => `≈ вышэй, чым у ${from}–${to}% групы`,
    belowAxis: 'Ніжэй за парог 60 — па-за размеркаваннем групы',
    invalidAverage: (max: string) => `Увядзіце лік ад 0 да ${max}`,
    rows: {
      citizenship: 'Грамадзянства',
      average: 'Сярэдні бал атэстата',
      scale: 'Шкала адзнак',
      polish: 'Польская школа',
    },
    scaleValue: (max: string) => `да ${max}`,
    polishValue: {
      none: 'Не, +0',
      primary: 'Пачатковая, +5',
      secondary: 'Сярэдняя, +10',
    },
    formulaDisclaimer: 'Пераадоленне парога не гарантуе стыпендыі: месцы размяркоўваюцца па квотах краін.',
  },
  cohort: {
    trackWide: 'усе краіны',
    groups: {
      BY: 'Беларусь',
      UA: 'Украіна',
      LT: 'Літва',
      east: 'Усходняя Еўропа і Цэнтральная Азія',
      'europe-other': 'Астатняя Еўропа',
      'world-other': 'Астатні свет',
    },
    groupNote: (label: string) =>
      `Адказаў з вашай краіны замала, таму параўноўваем вас у групе: ${label}.`,
    trackNote: 'Адказаў з вашай краіны і рэгіёна замала, таму параўноўваем вас з усімі краінамі.',
  },
  dashboard: {
    position: {
      title: 'Пазіцыя ў групе',
      rankLine: (rank: string, total: string, country: string) =>
        country ? `${rank} з ${total} · ${country}` : `${rank} з ${total}`,
      percentileLine: (percentage: string) => `Вышэй, чым у ${percentage}% групы`,
    },
    hero: {
      title: 'Ваш вынік',
      densityHint: 'Размеркаванне балаў у вашай групе',
      aboveMedianBy: (delta: string) => `На ${delta} ${forNumber(delta, POINTS)} вышэй за медыяну`,
      belowMedianBy: (delta: string) => `На ${delta} ${forNumber(delta, POINTS)} ніжэй за медыяну`,
      aroundMedian: 'Блізка да медыяны групы',
      cohortMeta: (count: string, median: string) => `${count} у выбарцы · медыяна ${median}`,
      cohortSizeOnly: (count: string) => `${count} у выбарцы`,
      expandDistribution: 'Паказаць поўнае размеркаванне балаў',
      collapseDistribution: 'Схаваць поўнае размеркаванне балаў',
      unofficialCountrySample: 'Неафіцыйна · выбарка NAWAmeter па краіне',
      unofficialSample: 'Неафіцыйна · выбарка NAWAmeter',
    },
    competitionNeighbourhood: {
      title: 'Побач з вашым вынікам',
      distanceHigher: (delta: string) => `Адлегласць да бліжэйшага вышэйшага бала: ${delta}`,
      distanceLower: (delta: string) => `Адлегласць да бліжэйшага ніжэйшага бала: ${delta}`,
      withinOnePoint: (count: string) => `У межах ±1 бала: ${count} ${forNumber(count, PARTICIPANTS)}`,
      tied: (count: string) => `Аднолькавых балаў: ${count}`,
      dense: 'Вы ў шчыльнай частцы групы.',
      moderate: 'Вы ў умерана шчыльнай частцы групы.',
      sparse: 'Вы ў менш шчыльнай частцы групы.',
    },
    smallCountry: {
      title: 'Невялікая група ў вашай краіне',
      participants: (country: string, count: string) =>
        `Зараз удзельнікаў з краіны ${country}: ${count}.`,
      remaining: (count: string) => `Для рэйтынгу краіны трэба яшчэ ${count} ${forNumber(count, ANSWERS)}.`,
      benchmarkTitle: 'Параўнанне з усімі кандыдатамі',
      aboveTrackMedian: 'Ваш бал вышэйшы за медыяну сярод усіх кандыдатаў на стыпендыю Дырэктара NAWA.',
      aroundTrackMedian: 'Ваш бал блізкі да медыяны сярод усіх кандыдатаў на стыпендыю Дырэктара NAWA.',
      belowTrackMedian: 'Ваш бал ніжэйшы за медыяну сярод усіх кандыдатаў на стыпендыю Дырэктара NAWA.',
      benchmarkMedian: (median: string) => `Медыяна сярод усіх кандыдатаў: ${median}`,
    },
  },
} satisfies Messages;
