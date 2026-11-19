/**
 * Fields of study, from ISCED-F 2013 as used in POL-on (the source of the studia.gov.pl catalogue).
 * Three levels: broad group (2 digits), narrow group (3 digits), detailed field (4 digits). Applicants pick a
 * detailed field; aggregates fall back detailed -> narrow -> broad -> all (see docs/adr/0007).
 *
 * Left out on purpose: programmes the NAWA Director scholarship cannot fund (general programmes, vocational skills,
 * crafts) and medicine, dentistry and traditional medicine, which belong to the Health track (docs/adr/0005).
 * Polish names follow the official POL-on edition; the other languages are drafts that need a native read.
 */
export type FieldLocale = 'pl' | 'en' | 'ru' | 'uk' | 'be';
export type LocalizedName = Readonly<Record<FieldLocale, string>>;

export const OTHER_STUDY_FIELD = 'other';

export type StudyField = {
  /** ISCED-F detailed code, e.g. "0613". */
  code: string;
  name: LocalizedName;
  /** Extra Polish search terms: the words people actually type. */
  keywords?: readonly string[];
};

const n = (pl: string, en: string, ru: string, uk: string, be: string): LocalizedName => ({ pl, en, ru, uk, be });

export const broadGroups: Readonly<Record<string, LocalizedName>> = {
  '01': n('Pedagogika', 'Education', 'Педагогика', 'Педагогіка', 'Педагогіка'),
  '02': n('Nauki humanistyczne i sztuka', 'Arts and humanities', 'Гуманитарные науки и искусство', 'Гуманітарні науки та мистецтво', 'Гуманітарныя навукі і мастацтва'),
  '03': n('Nauki społeczne, dziennikarstwo i informacja', 'Social sciences, journalism and information', 'Социальные науки, журналистика и информация', 'Соціальні науки, журналістика та інформація', 'Грамадскія навукі, журналістыка і інфармацыя'),
  '04': n('Biznes, administracja i prawo', 'Business, administration and law', 'Бизнес, управление и право', 'Бізнес, адміністрування та право', 'Бізнес, адміністраванне і права'),
  '05': n('Nauki przyrodnicze, matematyka i statystyka', 'Natural sciences, mathematics and statistics', 'Естественные науки, математика и статистика', 'Природничі науки, математика та статистика', 'Прыродазнаўчыя навукі, матэматыка і статыстыка'),
  '06': n('Technologie teleinformacyjne', 'Information and communication technologies', 'Информационно-коммуникационные технологии', 'Інформаційно-комунікаційні технології', 'Інфармацыйна-камунікацыйныя тэхналогіі'),
  '07': n('Technika, przemysł i budownictwo', 'Engineering, manufacturing and construction', 'Инженерия, производство и строительство', 'Інженерія, виробництво та будівництво', 'Інжынерыя, вытворчасць і будаўніцтва'),
  '08': n('Rolnictwo, leśnictwo, rybactwo i weterynaria', 'Agriculture, forestry, fisheries and veterinary', 'Сельское, лесное, рыбное хозяйство и ветеринария', 'Сільське господарство, лісівництво, рибальство та ветеринарія', 'Сельская, лясная, рыбная гаспадарка і ветэрынарыя'),
  '09': n('Zdrowie i opieka społeczna', 'Health and welfare', 'Здоровье и социальное обеспечение', 'Здоров’я та соціальне забезпечення', 'Здароўе і сацыяльнае забеспячэнне'),
  '10': n('Usługi', 'Services', 'Услуги', 'Послуги', 'Паслугі'),
};

export const narrowGroups: Readonly<Record<string, LocalizedName>> = {
  '011': n('Pedagogika i kształcenie nauczycieli', 'Education', 'Педагогика и подготовка учителей', 'Педагогіка та підготовка вчителів', 'Педагогіка і падрыхтоўка настаўнікаў'),
  '021': n('Sztuka', 'Arts', 'Искусство', 'Мистецтво', 'Мастацтва'),
  '022': n('Nauki humanistyczne (bez języków)', 'Humanities (except languages)', 'Гуманитарные науки (кроме языков)', 'Гуманітарні науки (крім мов)', 'Гуманітарныя навукі (акрамя моў)'),
  '023': n('Języki', 'Languages', 'Языки', 'Мови', 'Мовы'),
  '031': n('Nauki społeczne i behawioralne', 'Social and behavioural sciences', 'Социальные и поведенческие науки', 'Соціальні та поведінкові науки', 'Грамадскія і паводніцкія навукі'),
  '032': n('Dziennikarstwo i informacja', 'Journalism and information', 'Журналистика и информация', 'Журналістика та інформація', 'Журналістыка і інфармацыя'),
  '041': n('Biznes i administracja', 'Business and administration', 'Бизнес и управление', 'Бізнес та адміністрування', 'Бізнес і адміністраванне'),
  '042': n('Prawo', 'Law', 'Право', 'Право', 'Права'),
  '051': n('Nauki biologiczne', 'Biological and related sciences', 'Биологические науки', 'Біологічні науки', 'Біялагічныя навукі'),
  '052': n('Środowisko', 'Environment', 'Окружающая среда', 'Довкілля', 'Навакольнае асяроддзе'),
  '053': n('Nauki fizyczne', 'Physical sciences', 'Физические науки', 'Фізичні науки', 'Фізічныя навукі'),
  '054': n('Matematyka i statystyka', 'Mathematics and statistics', 'Математика и статистика', 'Математика та статистика', 'Матэматыка і статыстыка'),
  '061': n('Technologie teleinformacyjne', 'Information and communication technologies', 'Информационно-коммуникационные технологии', 'Інформаційно-комунікаційні технології', 'Інфармацыйна-камунікацыйныя тэхналогіі'),
  '071': n('Inżynieria i technika', 'Engineering and engineering trades', 'Инженерия и техника', 'Інженерія та техніка', 'Інжынерыя і тэхніка'),
  '072': n('Produkcja i przetwórstwo', 'Manufacturing and processing', 'Производство и переработка', 'Виробництво та переробка', 'Вытворчасць і перапрацоўка'),
  '073': n('Architektura i budownictwo', 'Architecture and construction', 'Архитектура и строительство', 'Архітектура та будівництво', 'Архітэктура і будаўніцтва'),
  '081': n('Rolnictwo', 'Agriculture', 'Сельское хозяйство', 'Сільське господарство', 'Сельская гаспадарка'),
  '082': n('Leśnictwo', 'Forestry', 'Лесное хозяйство', 'Лісівництво', 'Лясная гаспадарка'),
  '083': n('Rybactwo', 'Fisheries', 'Рыбное хозяйство', 'Рибальство', 'Рыбная гаспадарка'),
  '084': n('Weterynaria', 'Veterinary', 'Ветеринария', 'Ветеринарія', 'Ветэрынарыя'),
  '091': n('Zdrowie', 'Health', 'Здравоохранение', 'Охорона здоров’я', 'Ахова здароўя'),
  '092': n('Opieka społeczna', 'Welfare', 'Социальная помощь и опека', 'Соціальна допомога та опіка', 'Сацыяльная дапамога і апека'),
  '101': n('Usługi osobiste, sport i turystyka', 'Personal services, sport and tourism', 'Личные услуги, спорт и туризм', 'Особисті послуги, спорт і туризм', 'Асабістыя паслугі, спорт і турызм'),
  '102': n('Higiena i bezpieczeństwo pracy', 'Hygiene and occupational health services', 'Гигиена и охрана труда', 'Гігієна та охорона праці', 'Гігіена і ахова працы'),
  '103': n('Usługi ochrony', 'Security services', 'Охранные услуги', 'Охоронні послуги', 'Ахоўныя паслугі'),
  '104': n('Usługi transportowe', 'Transport services', 'Транспортные услуги', 'Транспортні послуги', 'Транспартныя паслугі'),
};

export const studyFields: readonly StudyField[] = [
  { code: '0111', name: n('Pedagogika i nauki o kształceniu', 'Education science', 'Педагогика и науки об образовании', 'Педагогіка та науки про освіту', 'Педагогіка і навукі пра адукацыю'), keywords: ['pedagogika'] },
  { code: '0112', name: n('Kształcenie nauczycieli przedszkolnych', 'Training for pre-school teachers', 'Подготовка воспитателей дошкольных учреждений', 'Підготовка вихователів закладів дошкільної освіти', 'Падрыхтоўка выхавальнікаў устаноў дашкольнай адукацыі'), keywords: ['pedagogika wczesnoszkolna', 'przedszkole'] },
  { code: '0113', name: n('Kształcenie nauczycieli bez specjalizacji przedmiotowej', 'Teacher training without subject specialisation', 'Подготовка учителей без предметной специализации', 'Підготовка вчителів без предметної спеціалізації', 'Падрыхтоўка настаўнікаў без прадметнай спецыялізацыі'), keywords: ['pedagogika', 'nauczyciel'] },
  { code: '0114', name: n('Kształcenie nauczycieli ze specjalizacją przedmiotową', 'Teacher training with subject specialisation', 'Подготовка учителей с предметной специализацией', 'Підготовка вчителів із предметною спеціалізацією', 'Падрыхтоўка настаўнікаў з прадметнай спецыялізацыяй'), keywords: ['nauczyciel'] },
  { code: '0211', name: n('Techniki audiowizualne i produkcja mediów', 'Audio-visual techniques and media production', 'Аудиовизуальные средства и медиапроизводство', 'Аудіовізуальні засоби та медіавиробництво', 'Аўдыявізуальныя сродкі і медыявытворчасць'), keywords: ['grafika', 'film', 'fotografia', 'multimedia'] },
  { code: '0212', name: n('Moda, wystrój wnętrz i projektowanie przemysłowe', 'Fashion, interior and industrial design', 'Мода, дизайн интерьера и промышленный дизайн', 'Мода, дизайн інтер’єру та промисловий дизайн', 'Мода, дызайн інтэр’еру і прамысловы дызайн'), keywords: ['wzornictwo', 'projektowanie', 'design'] },
  { code: '0213', name: n('Sztuki plastyczne', 'Fine arts', 'Изобразительное искусство', 'Образотворче мистецтво', 'Выяўленчае мастацтва'), keywords: ['malarstwo', 'rzeźba', 'grafika'] },
  { code: '0215', name: n('Muzyka i sztuki sceniczne', 'Music and performing arts', 'Музыка и сценическое искусство', 'Музика та сценічне мистецтво', 'Музыка і сцэнічнае мастацтва'), keywords: ['muzyka', 'teatr', 'taniec'] },
  { code: '0221', name: n('Religia i teologia', 'Religion and theology', 'Религия и теология', 'Релігія та теологія', 'Рэлігія і тэалогія'), keywords: ['teologia'] },
  { code: '0222', name: n('Historia i archeologia', 'History and archaeology', 'История и археология', 'Історія та археологія', 'Гісторыя і археалогія'), keywords: ['historia', 'archeologia'] },
  { code: '0223', name: n('Filozofia i etyka', 'Philosophy and ethics', 'Философия и этика', 'Філософія та етика', 'Філасофія і этыка'), keywords: ['filozofia'] },
  { code: '0231', name: n('Nauka języków', 'Language acquisition', 'Изучение языков', 'Вивчення мов', 'Вывучэнне моў'), keywords: ['lektorat', 'filologia stosowana', 'lingwistyka stosowana', 'filologia polska jako obca'] },
  { code: '0232', name: n('Literatura i językoznawstwo (filologie)', 'Literature and linguistics', 'Литература и языкознание (филологии)', 'Література та мовознавство (філології)', 'Літаратура і мовазнаўства (філалогіі)'), keywords: ['filologia', 'filologia polska', 'lingwistyka'] },
  { code: '0311', name: n('Ekonomia', 'Economics', 'Экономика', 'Економіка', 'Эканоміка'), keywords: ['ekonomia'] },
  { code: '0312', name: n('Politologia i wiedza o społeczeństwie', 'Political sciences and civics', 'Политология и обществоведение', 'Політологія та суспільствознавство', 'Паліталогія і грамадазнаўства'), keywords: ['politologia', 'stosunki międzynarodowe', 'europeistyka'] },
  { code: '0313', name: n('Psychologia', 'Psychology', 'Психология', 'Психологія', 'Псіхалогія'), keywords: ['psychologia'] },
  { code: '0314', name: n('Socjologia i kulturoznawstwo', 'Sociology and cultural studies', 'Социология и культурология', 'Соціологія та культурологія', 'Сацыялогія і культуралогія'), keywords: ['socjologia', 'kulturoznawstwo', 'antropologia'] },
  { code: '0321', name: n('Dziennikarstwo', 'Journalism and reporting', 'Журналистика', 'Журналістика', 'Журналістыка'), keywords: ['dziennikarstwo', 'media'] },
  { code: '0322', name: n('Bibliotekoznawstwo, informacja naukowa i archiwistyka', 'Library, information and archival studies', 'Библиотечное дело, научная информация и архивоведение', 'Бібліотечна справа, наукова інформація та архівознавство', 'Бібліятэчная справа, навуковая інфармацыя і архівазнаўства'), keywords: ['bibliotekoznawstwo', 'informacja naukowa'] },
  { code: '0411', name: n('Rachunkowość i podatki', 'Accounting and taxation', 'Бухгалтерский учёт и налогообложение', 'Облік і оподаткування', 'Бухгалтарскі ўлік і падаткі'), keywords: ['rachunkowość', 'księgowość'] },
  { code: '0412', name: n('Finanse, bankowość i ubezpieczenia', 'Finance, banking and insurance', 'Финансы, банковское дело и страхование', 'Фінанси, банківська справа та страхування', 'Фінансы, банкаўская справа і страхаванне'), keywords: ['finanse', 'bankowość'] },
  { code: '0413', name: n('Zarządzanie i administracja', 'Management and administration', 'Менеджмент и администрирование', 'Менеджмент та адміністрування', 'Менеджмент і адміністраванне'), keywords: ['zarządzanie', 'administracja', 'logistyka'] },
  { code: '0414', name: n('Marketing i reklama', 'Marketing and advertising', 'Маркетинг и реклама', 'Маркетинг і реклама', 'Маркетынг і рэклама'), keywords: ['marketing'] },
  { code: '0421', name: n('Prawo', 'Law', 'Право', 'Право', 'Права'), keywords: ['prawo'] },
  { code: '0511', name: n('Biologia', 'Biology', 'Биология', 'Біологія', 'Біялогія'), keywords: ['biologia'] },
  { code: '0512', name: n('Biochemia (biotechnologia)', 'Biochemistry (biotechnology)', 'Биохимия (биотехнологии)', 'Біохімія (біотехнології)', 'Біяхімія (біятэхналогіі)'), keywords: ['biotechnologia', 'biochemia'] },
  { code: '0521', name: n('Ekologia i ochrona środowiska', 'Environmental sciences', 'Экология и охрана окружающей среды', 'Екологія та охорона довкілля', 'Экалогія і ахова навакольнага асяроддзя'), keywords: ['ochrona środowiska', 'ekologia'] },
  { code: '0522', name: n('Środowisko naturalne i przyroda', 'Natural environments and wildlife', 'Природная среда и дикая природа', 'Природне середовище та дика природа', 'Прыроднае асяроддзе і дзікая прырода'), keywords: ['przyroda'] },
  { code: '0531', name: n('Chemia', 'Chemistry', 'Химия', 'Хімія', 'Хімія'), keywords: ['chemia'] },
  { code: '0532', name: n('Nauki o Ziemi (geografia, geologia)', 'Earth sciences', 'Науки о Земле (география, геология)', 'Науки про Землю (географія, геологія)', 'Навукі пра Зямлю (геаграфія, геалогія)'), keywords: ['geografia', 'geologia', 'geodezja', 'meteorologia'] },
  { code: '0533', name: n('Fizyka', 'Physics', 'Физика', 'Фізика', 'Фізіка'), keywords: ['fizyka', 'astronomia'] },
  { code: '0541', name: n('Matematyka', 'Mathematics', 'Математика', 'Математика', 'Матэматыка'), keywords: ['matematyka'] },
  { code: '0542', name: n('Statystyka', 'Statistics', 'Статистика', 'Статистика', 'Статыстыка'), keywords: ['statystyka'] },
  { code: '0611', name: n('Obsługa i użytkowanie komputerów', 'Computer use', 'Использование и обслуживание компьютеров', 'Використання та обслуговування комп’ютерів', 'Выкарыстанне і абслугоўванне камп’ютараў'), keywords: ['informatyka stosowana'] },
  { code: '0612', name: n('Projektowanie i administrowanie bazami danych i sieciami', 'Database and network design and administration', 'Проектирование и администрирование баз данных и сетей', 'Проєктування та адміністрування баз даних і мереж', 'Праектаванне і адміністраванне баз даных і сетак'), keywords: ['informatyka', 'sieci', 'cyberbezpieczeństwo'] },
  { code: '0613', name: n('Tworzenie i analiza oprogramowania (informatyka)', 'Software and applications development and analysis', 'Разработка и анализ программного обеспечения (информатика)', 'Розроблення та аналіз програмного забезпечення (інформатика)', 'Распрацоўка і аналіз праграмнага забеспячэння (інфарматыка)'), keywords: ['informatyka', 'programowanie', 'sztuczna inteligencja'] },
  { code: '0711', name: n('Inżynieria chemiczna i procesowa', 'Chemical engineering and processes', 'Химическая и процессная инженерия', 'Хімічна та процесна інженерія', 'Хімічная і працэсная інжынерыя'), keywords: ['technologia chemiczna'] },
  { code: '0712', name: n('Technologie ochrony środowiska', 'Environmental protection technology', 'Технологии охраны окружающей среды', 'Технології охорони довкілля', 'Тэхналогіі аховы навакольнага асяроддзя'), keywords: ['inżynieria środowiska'] },
  { code: '0713', name: n('Elektryczność i energia', 'Electricity and energy', 'Электротехника и энергетика', 'Електротехніка та енергетика', 'Электратэхніка і энергетыка'), keywords: ['elektrotechnika', 'energetyka'] },
  { code: '0714', name: n('Elektronika i automatyka', 'Electronics and automation', 'Электроника и автоматизация', 'Електроніка та автоматизація', 'Электроніка і аўтаматызацыя'), keywords: ['automatyka', 'robotyka', 'elektronika', 'telekomunikacja'] },
  { code: '0715', name: n('Mechanika i metalurgia', 'Mechanics and metal trades', 'Механика и металлургия', 'Механіка та металургія', 'Механіка і металургія'), keywords: ['mechanika', 'mechatronika', 'budowa maszyn', 'inżynieria materiałowa'] },
  { code: '0716', name: n('Pojazdy samochodowe, statki i samoloty', 'Motor vehicles, ships and aircraft', 'Автомобили, суда и самолёты', 'Автомобілі, судна та літаки', 'Аўтамабілі, караблі і самалёты'), keywords: ['lotnictwo', 'automotive'] },
  { code: '0721', name: n('Przetwórstwo żywności', 'Food processing', 'Переработка пищевых продуктов', 'Переробка харчових продуктів', 'Перапрацоўка харчовых прадуктаў'), keywords: ['technologia żywności'] },
  { code: '0722', name: n('Surowce (szkło, papier, tworzywa sztuczne i drewno)', 'Materials (glass, paper, plastic and wood)', 'Материалы (стекло, бумага, пластик и древесина)', 'Матеріали (скло, папір, пластик і деревина)', 'Матэрыялы (шкло, папера, пластык і драўніна)'), keywords: ['technologia drewna'] },
  { code: '0723', name: n('Tekstylia (odzież, obuwie i wyroby skórzane)', 'Textiles (clothes, footwear and leather)', 'Текстиль (одежда, обувь и кожа)', 'Текстиль (одяг, взуття та шкіра)', 'Тэкстыль (адзенне, абутак і скура)'), keywords: ['włókiennictwo'] },
  { code: '0724', name: n('Górnictwo i wydobycie', 'Mining and extraction', 'Горное дело и добыча', 'Гірництво та видобування', 'Горная справа і здабыча'), keywords: ['górnictwo', 'geologia'] },
  { code: '0731', name: n('Architektura i planowanie przestrzenne', 'Architecture and town planning', 'Архитектура и градостроительство', 'Архітектура та містобудування', 'Архітэктура і горадабудаўніцтва'), keywords: ['architektura', 'urbanistyka'] },
  { code: '0732', name: n('Budownictwo i inżynieria lądowa i wodna', 'Building and civil engineering', 'Строительство, гражданская и гидротехническая инженерия', 'Будівництво, цивільна та гідротехнічна інженерія', 'Будаўніцтва, грамадзянская і гідратэхнічная інжынерыя'), keywords: ['budownictwo', 'geodezja'] },
  { code: '0811', name: n('Produkcja roślinna i zwierzęca', 'Crop and livestock production', 'Растениеводство и животноводство', 'Рослинництво та тваринництво', 'Раслінаводства і жывёлагадоўля'), keywords: ['rolnictwo', 'zootechnika'] },
  { code: '0812', name: n('Ogrodnictwo', 'Horticulture', 'Садоводство', 'Садівництво', 'Садаводства'), keywords: ['ogrodnictwo'] },
  { code: '0821', name: n('Leśnictwo', 'Forestry', 'Лесное хозяйство', 'Лісівництво', 'Лясная гаспадарка'), keywords: ['leśnictwo'] },
  { code: '0831', name: n('Rybactwo', 'Fisheries', 'Рыбное хозяйство', 'Рибальство', 'Рыбная гаспадарка'), keywords: ['rybactwo'] },
  { code: '0841', name: n('Weterynaria', 'Veterinary', 'Ветеринария', 'Ветеринарія', 'Ветэрынарыя'), keywords: ['weterynaria'] },
  { code: '0913', name: n('Pielęgniarstwo i położnictwo', 'Nursing and midwifery', 'Сестринское дело и акушерство', 'Медсестринство та акушерство', 'Сястрынская справа і акушэрства'), keywords: ['pielęgniarstwo', 'położnictwo'] },
  { code: '0914', name: n('Technologie związane z diagnostyką i leczeniem', 'Medical diagnostic and treatment technology', 'Технологии медицинской диагностики и лечения', 'Технології медичної діагностики та лікування', 'Тэхналогіі медыцынскай дыягностыкі і лячэння'), keywords: ['analityka medyczna', 'ratownictwo'] },
  { code: '0915', name: n('Terapia i rehabilitacja', 'Therapy and rehabilitation', 'Терапия и реабилитация', 'Терапія та реабілітація', 'Тэрапія і рэабілітацыя'), keywords: ['fizjoterapia', 'rehabilitacja'] },
  { code: '0916', name: n('Farmacja', 'Pharmacy', 'Фармация', 'Фармація', 'Фармацыя'), keywords: ['farmacja'] },
  { code: '0921', name: n('Opieka nad osobami starszymi i niepełnosprawnymi', 'Care of the elderly and of disabled adults', 'Уход за пожилыми и взрослыми людьми с инвалидностью', 'Догляд за літніми та дорослими з інвалідністю', 'Догляд за пажылымі і дарослымі з інваліднасцю'), keywords: ['opieka', 'gerontologia'] },
  { code: '0922', name: n('Opieka nad dziećmi i młodzieżą', 'Child care and youth services', 'Работа с детьми и молодёжью', 'Робота з дітьми та молоддю', 'Работа з дзецьмі і моладзю'), keywords: ['pedagogika opiekuńcza'] },
  { code: '0923', name: n('Praca socjalna i doradztwo', 'Social work and counselling', 'Социальная работа и консультирование', 'Соціальна робота та консультування', 'Сацыяльная работа і кансультаванне'), keywords: ['praca socjalna'] },
  { code: '1013', name: n('Hotelarstwo, gastronomia i catering', 'Hotel, restaurants and catering', 'Гостиничное дело, ресторанный бизнес и кейтеринг', 'Готельна справа, ресторанний бізнес і кейтеринг', 'Гасцінічная справа, рэстаранная справа і кейтэрынг'), keywords: ['hotelarstwo', 'gastronomia'] },
  { code: '1014', name: n('Sport', 'Sports', 'Спорт', 'Спорт', 'Спорт'), keywords: ['wychowanie fizyczne', 'sport', 'trener'] },
  { code: '1015', name: n('Turystyka i wypoczynek', 'Travel, tourism and leisure', 'Туризм и досуг', 'Туризм і дозвілля', 'Турызм і адпачынак'), keywords: ['turystyka', 'rekreacja'] },
  { code: '1021', name: n('Higiena publiczna', 'Community sanitation', 'Общественная гигиена', 'Громадська гігієна', 'Грамадская гігіена'), keywords: ['zdrowie publiczne'] },
  { code: '1022', name: n('Bezpieczeństwo i higiena pracy', 'Occupational health and safety', 'Охрана труда и безопасность', 'Охорона праці та безпека', 'Ахова працы і бяспека'), keywords: ['bhp'] },
  { code: '1031', name: n('Wojsko i obronność', 'Military and defence', 'Военное дело и оборона', 'Військова справа та оборона', 'Ваенная справа і абарона'), keywords: ['bezpieczeństwo narodowe', 'obronność'] },
  { code: '1032', name: n('Ochrona osób i mienia (bezpieczeństwo wewnętrzne)', 'Protection of persons and property', 'Охрана людей и имущества (внутренняя безопасность)', 'Охорона осіб і майна (внутрішня безпека)', 'Ахова асоб і маёмасці (унутраная бяспека)'), keywords: ['bezpieczeństwo wewnętrzne'] },
  { code: '1041', name: n('Transport', 'Transport services', 'Транспорт', 'Транспорт', 'Транспарт'), keywords: ['transport', 'logistyka'] },
];

const byCode = new Map(studyFields.map((field) => [field.code, field]));

export function getStudyField(code: string): StudyField | undefined {
  return byCode.get(code);
}

export function isStudyFieldCode(value: string): boolean {
  return value === OTHER_STUDY_FIELD || byCode.has(value);
}

export const narrowGroupOf = (code: string): string => code.slice(0, 3);
export const broadGroupOf = (code: string): string => code.slice(0, 2);

/** Philology and language-teaching fields: NAWA funds Polish philology only, and ISCED cannot tell them apart. */
export const PHILOLOGY_FIELD_CODES: readonly string[] = ['0231', '0232'];

export function requiresPhilologyNote(code: string): boolean {
  return PHILOLOGY_FIELD_CODES.includes(code);
}

export type FieldLevel = 'detailed' | 'narrow' | 'broad' | 'all';

/** Name of the group a code belongs to at the given level, in the requested language. */
export function fieldLevelName(code: string, level: FieldLevel, locale: FieldLocale): string | null {
  if (level === 'detailed') return getStudyField(code)?.name[locale] ?? null;
  if (level === 'narrow') return narrowGroups[narrowGroupOf(code)]?.[locale] ?? null;
  if (level === 'broad') return broadGroups[broadGroupOf(code)]?.[locale] ?? null;
  return null;
}
