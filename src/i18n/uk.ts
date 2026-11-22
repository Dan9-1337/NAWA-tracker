import { plural } from './plural';
import type { Messages } from './types';

/** "бал" after a count: decimals ("6,0", "82,4") always take the fractional form "бала". */
const pointsWord = (value: string): string =>
  /[.,]/.test(value) ? 'бала' : plural('uk', value, { one: 'бал', few: 'бали', many: 'балів', other: 'бала' });

const participantsWord = (count: string): string =>
  plural('uk', count, { one: 'учасник', few: 'учасники', many: 'учасників', other: 'учасника' });

export const uk = {
  app: {
    title: 'NAWAmeter',
  },
  start: {
    kicker: 'Трекер NAWA 2026',
    kickerNote: 'неофіційний',
    title: 'Де ви серед кандидатів NAWA?',
    subtitle: 'Дізнайтеся свій процентиль, становище відносно медіани та те, як змінюється ваша група.',
    cta: 'Показати мій результат',
    howItWorks: 'Як обчислюється результат?',
    whatYouSee: 'Що ви побачите після заповнення',
    whatYouSeeBody:
      'Ваш бал, процентиль у групі, становище відносно медіани та те, як змінюється статистика, коли з’являються нові відповіді.',
    howScoreTitle: 'Орієнтовний бал',
    howScoreBody:
      'Орієнтовний бал обчислюється за правилами програми NAWA на основі середнього бала атестата та, якщо це стосується вас, бонусних балів за закінчення польської школи або школи польської діаспори.',
    howScoreFormula:
      'середній бал × 90 / максимум шкали\n+ 0, 5 або 10 бонусних балів',
    howScoreDisclaimer: 'Це не офіційне рішення NAWA і не прогноз отримання стипендії.',
    howPercentileTitle: 'Що означає процентиль?',
    howPercentileBody:
      'Процентиль показує, яка частка результатів учасників трекера нижча за ваш.',
    howPercentileExample:
      'Наприклад, процентиль 70–80 означає, що ваш результат вищий приблизно за 70–80% результатів у вибраній групі.',
    previewBadge: 'Приклад результату',
    previewScoreUnit: 'бала',
    previewAboveMedianBy: (delta: string) => `На ${delta} бала вище за медіану`,
    previewBelowMedianBy: (delta: string) => `На ${delta} бала нижче за медіану`,
    previewTapeHint: 'Потягніть лінійку, щоб побачити, як змінюється ваша позиція',
    previewPercentileLabel: 'процентиль',
    responseCount: (count: number, year: number) =>
      `${count} ${plural('uk', count, { one: 'відповідь', few: 'відповіді', many: 'відповідей', other: 'відповіді' })} у наборі ${year}`,
    timePromise: 'Займе близько 1 хвилини',
    resumeTitle: 'У вас є збережений прогрес',
    resumeBody: 'Продовжте з місця, де зупинилися, або почніть анкету спочатку.',
    resumeContinue: 'Продовжити',
    resumeStartOver: 'Почати спочатку',
  },
  wizard: {
    next: 'Далі',
    sections: {
      education: 'Освіта',
      grades: 'Оцінки',
    },
    educationTitle: 'Освіта',
    educationDescription: 'Ми порівнюємо вас із кандидатами зі схожої групи.',
    gradesTitle: 'Оцінки',
    gradesDescription:
      'Введіть середній бал атестата. Максимальна оцінка за шкалою залежить від країни, де ви закінчили середню школу.',
    rankingCountryHint: 'Визначає вашу групу порівняння — вас порівнюватимуть із кандидатами з цієї країни.',
    schoolCountryHint: 'Від цього залежить шкала оцінок (наприклад, 12-бальна в Україні або 5-бальна в Казахстані).',
    maximumGradeLockedHint: 'Шкалу визначено за країною закінчення середньої школи.',
    averageAboveMaximum: 'Ого, середній бал вищий за максимум шкали! Схоже на помилку — перевірте значення.',
    belarusPoloniaBonusNotice:
      'Згідно з документом Ogłoszenie nr 13/2026, пункт 2.7 (критерій 2), бонус за закінчення польської школи не стосується громадян Білорусі.',
    summaryTitle: 'Підсумок',
    summaryDescription: 'Перевірте, з ким вас порівнюватимуть і що буде збережено.',
    cohortTitle: 'Вас порівнюватимуть із кандидатами:',
    dataTitle: 'Ваші дані',
    editSection: 'Змінити',
    gradeBasisHint: 'NAWA обчислює середній бал за підсумковим атестатом або за оцінками за півріччя, якщо ви закінчуєте школу після 1 липня.',
    studentInPolandNote: 'Студенти в Польщі із середнім балом щонайменше 4,75 отримують максимум — 100 балів.',
    validation: {
      studentAverageRequired: 'Студенти в Польщі відповідають вимогам із середнім балом не нижче 4,75 за шкалою 2–5.',
      rankingCountryRequired: 'Оберіть країну громадянства.',
      schoolCountryRequired: 'Оберіть країну, де ви закінчили середню школу.',
      educationRequired: 'Заповніть поля про освіту, щоб продовжити.',
      gradesRequired: 'Введіть середній бал і переконайтеся, що він не виходить за межі шкали.',
      averageGradeRequired: 'Вкажіть середній бал, щоб продовжити.',
    },
  },
  form: {
    submitCreate: 'Зберегти анкету',
    submitUpdate: 'Оновити анкету',
    saved: 'Збережено',
    saveError: 'Не вдалося зберегти',
    saveErrorDraft: 'Ваші відповіді залишилися на цьому пристрої. Спробуйте ще раз.',
    cohortChangeTitle: 'Група порівняння зміниться',
    cohortChangeBody:
      'Зміна цих даних перенесе вас до іншої групи порівняння. Попередню статистику більше не буде показано.',
    cohortChangeConfirm: 'Зберегти й змінити групу',
    cohortChangeCancel: 'Скасувати',
    deleteZoneTitle: 'Видалення анкети',
    deleteZoneHint:
      'Видалення анкети незворотне. Усі збережені дані та ваше місце в статистиці буде втрачено назавжди.',
    deleteConfirmPermanent: 'Так, видалити назавжди',
  },
  labels: {
    rankingCountry: 'Країна громадянства',
    schoolCountry: 'У якій країні ви закінчили середню школу?',
    scholarshipTrack: 'Тип стипендії',
    averageGrade: 'Середній бал',
    maximumGrade: 'Максимальна оцінка у вашій шкалі',
    polishSchoolLevel: 'Чи закінчували ви польську школу?',
    gradeBasis: 'За якими оцінками ви вказали середній бал?',
    applicantKind: 'Хто ви як заявник?',
    averageGradePlaceholder: 'напр. 4,82',
    maximumGradePlaceholder: 'напр. 5,00',
  },
  choices: {
    scholarshipTrack: {
      nawa_director: 'Стипендія Директора NAWA',
      health_minister: 'Стипендія Міністра охорони здоров’я',
      culture_minister: 'Стипендія Міністра культури та національної спадщини',
    },
    gradeBasis: {
      final_certificate: 'Підсумковий атестат (про середню освіту)',
      half_year: 'Оцінки за перше півріччя 2025/26 (довідка зі школи)',
    },
    applicantKind: {
      school_leaver: 'Випускник(ця) середньої школи (закінчую або закінчив(ла) школу за кордоном)',
      student_in_poland: 'Студент(ка) денної форми навчання в Польщі із середнім балом не нижче 4,75 (шкала 2–5)',
    },
    polishSchoolLevel: {
      none: 'Ні',
      primary: 'Так, початкову школу',
      secondary: 'Так, середню школу',
    },
  },
  countries: {
    placeholder: 'Оберіть країну',
    searchPlaceholder: 'Пошук країни…',
    popular: 'Популярні',
  },
  nawaScore: {
    preview: (score: string) => `Орієнтовний бал: ${score}`,
    previewNote:
      'Орієнтовний бал за формулою з документа Ogłoszenie nr 13/2026, пункт 2.7 (критерій 2): оцінки — 0–90 балів + бонус за польську школу 0/5/10. Це не офіційний результат NAWA.',
  },
  stats: {
    heroLabel: 'Ваш результат',
    cohortTitle: 'Ваша група порівняння',
    loadingAriaLabel: 'Завантаження статистики',
    errorAriaLabel: 'Помилка статистики',
    groupResponseCount: 'Кількість відповідей у групі',
    densityTitle: 'Розподіл балів',
    densityCaption: 'Частка відповідей у кожному діапазоні балів',
    chartYouLabel: 'Ви',
    chartMedianLabel: 'Медіана групи',
    chartYou: (score: string) => `Ваш бал: ${score}`,
    chartMedian: (score: string) => `Медіана групи: ${score}`,
    loading: 'Завантаження статистики…',
    error: 'Не вдалося завантажити статистику. Перевірте з’єднання й спробуйте ще раз.',
    unavailable: 'Статистика з’явиться після збереження анкети.',
  },
  delta: {
    updatedQuiet: (when: string) => `Оновлено ${when}`,
    updatedToday: (time: string) => `Оновлено сьогодні о ${time}`,
    updatedYesterday: (time: string) => `Оновлено вчора о ${time}`,
  },
  privacyNotice: {
    title: 'Які дані зберігаються?',
    body:
      'Ніхто не бачить ваших окремих відповідей — лише кількість і діапазони для груп. Ваш акаунт зберігається як код, обчислений з Telegram ID, а не як сам ID.',
    points: [
      'Одна анкета на один набір для кожного акаунта Telegram.',
      'Відповіді з анкети зберігаються на сервері та використовуються для статистики по групах.',
      'Ми не зберігаємо ім’я, e-mail, номер телефону й username у Telegram.',
      'Невеликі країни ми об’єднуємо в групи, а бали стипендіатів показуємо в інтервалах по 5 балів.',
      'Ви можете будь-коли видалити всі дані в налаштуваннях.',
      'Якщо ви ввімкнете нагадування в боті, ваш Telegram ID зберігається окремо від анкети, доки ви не вимкнете нагадування. Разом з анкетою видаляється й цей запис.',
      'Це псевдонімізовані, а не анонімні дані: автор технічно міг би пов’язати анкету з акаунтом.',
    ],
    close: 'Закрити',
  },
  settings: {
    title: 'Налаштування',
    open: 'Налаштування',
    back: 'Назад',
    viewData: 'Переглянути збережені дані',
    editProfile: 'Змінити анкету',
    deleteData: 'Видалити мою анкету',
    privacyPolicy: 'Політика приватності',
    appearance: 'Оформлення',
    language: 'Мова',
    help: 'Допомога',
    reminders: 'Нагадування в боті',
    invite: 'Запросити людей з моєї країни',
    inviteText: (country: string) =>
      `${country}: кандидати Anders NAWA! Дізнайтеся в NAWAmeter, де ви серед інших кандидатів.`,
    deleteConfirmTitle: 'Видалити анкету?',
    deleteConfirmBody: 'Цю дію не можна скасувати. Усі збережені дані буде видалено.',
    deleteCancel: 'Скасувати',
    deleteError: 'Не вдалося видалити анкету. Спробуйте ще раз.',
    close: 'Закрити',
  },
  support: {
    general: 'Підтримка',
    calculationError: 'Помилка в розрахунку',
    reportBug: 'Повідомити про помилку',
    hint: 'Відкриває чат у Telegram із базовим контекстом. Додаткові персональні дані не надсилаються.',
  },
  about: {
    title: 'Про NAWAmeter',
    intro: 'NAWAmeter — неофіційний трекер для кандидатів Anders NAWA.',
    capabilitiesTitle: 'Що робить сервіс',
    capabilitiesBody:
      'Показує ваш бал і ваше місце серед балів, які вказали інші користувачі з вашої країни або групи країн.',
    dataTitle: 'Звідки дані',
    dataBody:
      'Статистику ми обчислюємо за анкетами NAWAmeter, які заповнюють самі користувачі, якщо не зазначено інше.',
    officialTitle: 'Що вважається офіційним',
    officialBody:
      'Офіційними є лише рішення NAWA та опубліковані правила програми. Орієнтовні розрахунки NAWAmeter і місця у вибірці не є офіційним результатом конкурсу.',
    privacyTitle: 'Як захищено ваші дані',
    privacyBody:
      'Інші користувачі не бачать вашої анкети. Невеликі країни ми об’єднуємо в групи, тож виокремити окрему анкету неможливо. Акаунт зберігається як код, обчислений з Telegram ID; повідомлення до підтримки містять короткий ідентифікатор.',
    metricsTitle: 'Як рахуються показники',
    metricsBody:
      'Вашу позицію та процентиль ми обчислюємо спершу в межах вашої країни, потім у групі країн, а потім серед усіх країн — залежно від кількості відповідей.',
    authorTitle: 'Про автора',
    authorBody: 'Незалежний проєкт, створений, щоб допомогти кандидатам краще зорієнтуватися в конкурсі.',
    version: (version: string) => `Версія застосунку: ${version}`,
  },
  telegram: {
    gateTitle: 'Відкрийте в Telegram',
    gateBody:
      'Telegram потрібен для безпечного входу та щоб на один акаунт припадала лише одна анкета.',
    openInTelegram: 'Відкрити в Telegram',
    copyBot: 'Скопіювати ім’я бота',
    copied: 'Скопійовано',
    qrAlt: 'QR-код, щоб відкрити бота в Telegram',
    missingInitData: 'Немає даних автентифікації Telegram. Відкрийте застосунок із Telegram ще раз.',
  },
  api: {
    invalidResponse: 'Сервер повернув некоректну відповідь.',
  },
  home: {
    loading: 'Завантаження анкети…',
    loadError: 'Не вдалося завантажити вашу анкету',
    loadErrorHint: 'Збережені дані не втрачено. Перевірте з’єднання й спробуйте ще раз.',
    retry: 'Спробувати ще раз',
    actionError: 'Не вдалося виконати цю дію.',
    offline: 'Немає інтернет-з’єднання. Перевірте мережу й спробуйте ще раз.',
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
    light: 'Світла',
    dark: 'Темна',
    switchToDark: 'Увімкнути темну тему',
    switchToLight: 'Увімкнути світлу тему',
  },
  scoreScreen: {
    seasonClosed: (year: string) => `Набір ${year} завершено`,
    seasonOpen: (date: string) => `Прийом заявок до ${date}`,
    whatIfLabel: 'А що, якщо: інший середній бал',
    scaleMax: '/ 100',
    aboveThreshold: (delta: string, threshold: string) => `На ${delta} ${pointsWord(delta)} вище за поріг ${threshold}`,
    belowThreshold: (delta: string, threshold: string) => `На ${delta} ${pointsWord(delta)} нижче за поріг ${threshold}`,
    atThreshold: (threshold: string) => `Рівно на порозі ${threshold}`,
    thresholdFlag: (threshold: string) => `поріг ${threshold}`,
    tapeAriaLabel: (score: string, threshold: string) =>
      `Лінійка від 0 до 100: бал ${score}, поріг ${threshold}`,
    tapeHint: (step: string) => `Перетягніть лінійку: середній бал зміниться на ${step}`,
    whatIfNote: 'Значення «а що, якщо» не зберігаються. Щоб змінити відповіді, виберіть «Змінити анкету».',
    averageInputLabel: 'Середній бал для симуляції',
    decrease: 'Зменшити середній бал',
    increase: 'Збільшити середній бал',
    reset: 'Повернути збережений',
    savedScore: (score: string) => `Збережений бал: ${score}`,
    percentileBand: (from: number, to: number) => `≈ вище, ніж у ${from}–${to}% групи`,
    belowAxis: 'Нижче порогу 60 — поза розподілом групи',
    invalidAverage: (max: string) => `Введіть число від 0 до ${max}`,
    rows: {
      citizenship: 'Громадянство',
      average: 'Середній бал атестата',
      scale: 'Шкала оцінок',
      polish: 'Польська школа',
    },
    scaleValue: (max: string) => `до ${max}`,
    polishValue: {
      none: 'Ні, +0',
      primary: 'Початкова, +5',
      secondary: 'Середня, +10',
    },
    formulaDisclaimer: 'Подолання порога не гарантує стипендії: місця розподіляються за квотами для країн.',
  },
  cohort: {
    trackWide: 'усі країни',
    groups: {
      BY: 'Білорусь',
      UA: 'Україна',
      LT: 'Литва',
      east: 'Східна Європа та Центральна Азія',
      'europe-other': 'Решта Європи',
      'world-other': 'Решта світу',
    },
    groupNote: (label: string) =>
      `Відповідей із вашої країни замало, тому порівнюємо вас у групі: ${label}.`,
    trackNote: 'Відповідей із вашої країни та регіону замало, тому порівнюємо вас з усіма країнами.',
  },
  dashboard: {
    position: {
      title: 'Місце в групі',
      rankLine: (rank: string, total: string, country: string) =>
        country ? `${rank} із ${total} · ${country}` : `${rank} із ${total}`,
      percentileLine: (percentage: string) => `Вище, ніж у ${percentage}% групи`,
    },
    hero: {
      title: 'Ваш результат',
      densityHint: 'Розподіл балів у вашій групі',
      aboveMedianBy: (delta: string) => `На ${delta} ${pointsWord(delta)} вище за медіану`,
      belowMedianBy: (delta: string) => `На ${delta} ${pointsWord(delta)} нижче за медіану`,
      aroundMedian: 'Близько до медіани групи',
      cohortMeta: (count: string, median: string) => `${count} у вибірці · медіана ${median}`,
      cohortSizeOnly: (count: string) => `${count} у вибірці`,
      expandDistribution: 'Показати повний розподіл балів',
      collapseDistribution: 'Сховати повний розподіл балів',
      unofficialCountrySample: 'Неофіційно · вибірка NAWAmeter за країною',
      unofficialSample: 'Неофіційно · вибірка NAWAmeter',
    },
    competitionNeighbourhood: {
      title: 'Поруч із вашим результатом',
      distanceHigher: (delta: string) => `Відстань до найближчого вищого бала: ${delta}`,
      distanceLower: (delta: string) => `Відстань до найближчого нижчого бала: ${delta}`,
      withinOnePoint: (count: string) => `У межах ±1 бала: ${count} ${participantsWord(count)}`,
      tied: (count: string) => `Учасників із таким самим балом: ${count}`,
      dense: 'Ви в щільній частині групи.',
      moderate: 'Ви в помірно щільній частині групи.',
      sparse: 'Ви в менш щільній частині групи.',
    },
    smallCountry: {
      title: 'Невелика група у вашій країні',
      participants: (country: string, count: string) =>
        `У групі «${country}» зараз ${count} ${participantsWord(count)}.`,
      remaining: (count: string) =>
        plural('uk', count, {
          one: `Потрібна ще ${count} відповідь для рейтингу країни.`,
          few: `Потрібні ще ${count} відповіді для рейтингу країни.`,
          many: `Потрібно ще ${count} відповідей для рейтингу країни.`,
          other: `Потрібно ще ${count} відповіді для рейтингу країни.`,
        }),
      benchmarkTitle: 'Порівняння з усіма кандидатами',
      aboveTrackMedian: 'Ваш бал вищий за медіану серед усіх кандидатів на стипендію Директора NAWA.',
      aroundTrackMedian: 'Ваш бал близький до медіани серед усіх кандидатів на стипендію Директора NAWA.',
      belowTrackMedian: 'Ваш бал нижчий за медіану серед усіх кандидатів на стипендію Директора NAWA.',
      benchmarkMedian: (median: string) => `Медіана серед усіх кандидатів: ${median}`,
    },
  },
} satisfies Messages;
