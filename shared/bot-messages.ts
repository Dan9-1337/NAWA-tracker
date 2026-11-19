import type { ReminderKind } from './reminders';

export const botLocales = ['pl', 'en', 'ru', 'uk', 'be'] as const;
export type BotLocale = (typeof botLocales)[number];

export type BotMessages = {
  welcome: string;
  welcomeCountry: (country: string) => string;
  openApp: string;
  subscribed: string;
  alreadySubscribed: string;
  unsubscribed: string;
  help: string;
  reminders: Record<ReminderKind, (year: string) => string>;
};

export const botMessages: Record<BotLocale, BotMessages> = {
  pl: {
    welcome:
      'NAWAmeter to nieoficjalny tracker kandydatów Anders NAWA. Otwórz aplikację, aby zobaczyć swój wynik. /subscribe włącza przypomnienia, /stop je wyłącza.',
    welcomeCountry: (country) =>
      `NAWAmeter to nieoficjalny tracker kandydatów Anders NAWA. Kraj ${country} jest już wybrany: otwórz aplikację i podaj swój wynik. /subscribe włącza przypomnienia, /stop je wyłącza.`,
    openApp: 'Otwórz NAWAmeter',
    subscribed:
      'Przypomnienia włączone. Zapisujemy Twój identyfikator Telegram osobno od odpowiedzi, dopóki ich nie wyłączysz (/stop).',
    alreadySubscribed: 'Przypomnienia są już włączone. Wyłączysz je poleceniem /stop.',
    unsubscribed: 'Przypomnienia wyłączone, a Twój identyfikator Telegram został usunięty z listy.',
    help: '/start — otwórz aplikację\n/subscribe — włącz przypomnienia\n/stop — wyłącz przypomnienia',
    reminders: {
      results_soon: (year) => `Wyniki naboru ${year} mają się pojawić w ciągu kilku dni. Gdy je poznasz, dodaj swój wynik w NAWAmeter.`,
      results_out: (year) => `Wyniki naboru ${year} są już znane. Dodaj swój wynik w NAWAmeter, aby pomóc kandydatom z Twojego kraju.`,
      intake_open: (year) => `Ruszył nabór ${year}. Policz swój wynik w NAWAmeter.`,
    },
  },
  en: {
    welcome:
      'NAWAmeter is an unofficial tracker for Anders NAWA candidates. Open the app to see your score. /subscribe turns reminders on, /stop turns them off.',
    welcomeCountry: (country) =>
      `NAWAmeter is an unofficial tracker for Anders NAWA candidates. ${country} is already selected: open the app and add your score. /subscribe turns reminders on, /stop turns them off.`,
    openApp: 'Open NAWAmeter',
    subscribed:
      'Reminders are on. Your Telegram id is stored separately from your answers until you turn them off (/stop).',
    alreadySubscribed: 'Reminders are already on. Turn them off with /stop.',
    unsubscribed: 'Reminders are off, and your Telegram id has been removed from the list.',
    help: '/start — open the app\n/subscribe — turn reminders on\n/stop — turn reminders off',
    reminders: {
      results_soon: (year) => `The ${year} results are due within days. When you know yours, add the outcome in NAWAmeter.`,
      results_out: (year) => `The ${year} results are out. Add your outcome in NAWAmeter to help candidates from your country.`,
      intake_open: (year) => `The ${year} intake is open. Work out your score in NAWAmeter.`,
    },
  },
  ru: {
    welcome:
      'NAWAmeter — неофициальный трекер кандидатов Anders NAWA. Откройте приложение, чтобы увидеть свой балл. /subscribe включает напоминания, /stop выключает.',
    welcomeCountry: (country) =>
      `NAWAmeter — неофициальный трекер кандидатов Anders NAWA. Страна ${country} уже выбрана: откройте приложение и укажите свой балл. /subscribe включает напоминания, /stop выключает.`,
    openApp: 'Открыть NAWAmeter',
    subscribed:
      'Напоминания включены. Ваш Telegram id хранится отдельно от ответов, пока вы их не выключите (/stop).',
    alreadySubscribed: 'Напоминания уже включены. Выключить можно командой /stop.',
    unsubscribed: 'Напоминания выключены, а ваш Telegram id удалён из списка.',
    help: '/start — открыть приложение\n/subscribe — включить напоминания\n/stop — выключить напоминания',
    reminders: {
      results_soon: (year) => `Результаты набора ${year} ожидаются в ближайшие дни. Когда узнаете свой, добавьте итог в NAWAmeter.`,
      results_out: (year) => `Результаты набора ${year} уже известны. Добавьте свой итог в NAWAmeter, чтобы помочь кандидатам из вашей страны.`,
      intake_open: (year) => `Начался набор ${year}. Посчитайте свой балл в NAWAmeter.`,
    },
  },
  uk: {
    welcome:
      'NAWAmeter — неофіційний трекер кандидатів Anders NAWA. Відкрийте застосунок, щоб побачити свій бал. /subscribe вмикає нагадування, /stop вимикає.',
    welcomeCountry: (country) =>
      `NAWAmeter — неофіційний трекер кандидатів Anders NAWA. Країну вже обрано — ${country}: відкрийте застосунок і вкажіть свій бал. /subscribe вмикає нагадування, /stop вимикає.`,
    openApp: 'Відкрити NAWAmeter',
    subscribed:
      'Нагадування ввімкнено. Ваш Telegram id зберігається окремо від відповідей, доки ви їх не вимкнете (/stop).',
    alreadySubscribed: 'Нагадування вже ввімкнено. Вимкнути можна командою /stop.',
    unsubscribed: 'Нагадування вимкнено, а ваш Telegram id видалено зі списку.',
    help: '/start — відкрити застосунок\n/subscribe — увімкнути нагадування\n/stop — вимкнути нагадування',
    reminders: {
      results_soon: (year) => `Результати набору ${year} очікуються найближчими днями. Коли дізнаєтеся свій, додайте підсумок у NAWAmeter.`,
      results_out: (year) => `Результати набору ${year} уже відомі. Додайте свій підсумок у NAWAmeter, щоб допомогти кандидатам із вашої країни.`,
      intake_open: (year) => `Розпочався набір ${year}. Порахуйте свій бал у NAWAmeter.`,
    },
  },
  be: {
    welcome:
      'NAWAmeter — неафіцыйны трэкер кандыдатаў Anders NAWA. Адкрыйце праграму, каб убачыць свой бал. /subscribe уключае напаміны, /stop выключае.',
    welcomeCountry: (country) =>
      `NAWAmeter — неафіцыйны трэкер кандыдатаў Anders NAWA. Краіна ${country} ужо абрана: адкрыйце праграму і пакажыце свой бал. /subscribe уключае напаміны, /stop выключае.`,
    openApp: 'Адкрыць NAWAmeter',
    subscribed:
      'Напаміны ўключаны. Ваш Telegram id захоўваецца асобна ад адказаў, пакуль вы іх не выключыце (/stop).',
    alreadySubscribed: 'Напаміны ўжо ўключаны. Выключыць можна камандай /stop.',
    unsubscribed: 'Напаміны выключаны, а ваш Telegram id выдалены са спісу.',
    help: '/start — адкрыць праграму\n/subscribe — уключыць напаміны\n/stop — выключыць напаміны',
    reminders: {
      results_soon: (year) => `Вынікі набору ${year} чакаюцца ў бліжэйшыя дні. Калі даведаецеся свой, дадайце вынік у NAWAmeter.`,
      results_out: (year) => `Вынікі набору ${year} ужо вядомыя. Дадайце свой вынік у NAWAmeter, каб дапамагчы кандыдатам з вашай краіны.`,
      intake_open: (year) => `Пачаўся набор ${year}. Палічыце свой бал у NAWAmeter.`,
    },
  },
};

/** Maps a Telegram `language_code` ("uk", "be-BY", ...) to a bot locale; unknown languages get Polish, like the app. */
export function resolveBotLocale(languageCode: string | null | undefined): BotLocale {
  const prefix = languageCode?.toLowerCase().split(/[-_]/)[0];
  return (botLocales as readonly string[]).includes(prefix ?? '') ? (prefix as BotLocale) : 'pl';
}
