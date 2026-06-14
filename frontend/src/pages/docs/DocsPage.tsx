import { useState } from 'react'
import {
  BookOpen, Users, CheckSquare, GraduationCap, BarChart3,
  Bell, Shield, ChevronDown, ChevronRight, FileText, Calendar,
  Send, Eye, ArrowRight,
} from 'lucide-react'

interface Section {
  id: string
  icon: typeof BookOpen
  title: string
  color: string
  items: { q: string; a: string }[]
}

const SECTIONS: Section[] = [
  {
    id: 'roles',
    icon: Shield,
    title: 'Ролі в системі',
    color: 'text-purple-600 bg-purple-50',
    items: [
      {
        q: 'Адміністратор (Admin)',
        a: 'Глобальна роль. Має доступ до адмін-панелі: може переглядати всіх користувачів, змінювати їм глобальну роль (User / Organizer / Admin). Не є автоматично учасником проєктів.',
      },
      {
        q: 'Організатор (Organizer)',
        a: 'Глобальна роль. Може створювати нові проєкти. Всередині свого проєкту — повне управління: додавання учасників, зміна ролей, редагування та видалення задач, перегляд аналітики та генерація звітів.',
      },
      {
        q: 'Учасник (Participant)',
        a: 'Роль всередині проєкту. Виконує задачі: переводить їх ToDo → InProgress через drag-and-drop, здає на перевірку через кнопку «Здати». Бачить лише задачі свого проєкту.',
      },
      {
        q: 'Ментор (Mentor)',
        a: 'Роль всередині проєкту. Перевіряє здані задачі (InReview): може прийняти (→ Done) або повернути на доопрацювання (→ NeedsRevision). Веде приватні нотатки про підопічних.',
      },
    ],
  },
  {
    id: 'tasks',
    icon: CheckSquare,
    title: 'Життєвий цикл задачі',
    color: 'text-blue-600 bg-blue-50',
    items: [
      {
        q: 'Схема переходів',
        a: 'ToDo → InProgress (drag або взяти в роботу) → InReview (кнопка «Здати») → Done (ментор приймає) або NeedsRevision (ментор повертає). З NeedsRevision → знову «Здати» після доопрацювання.',
      },
      {
        q: 'Чому не можна перетягнути в «Виконано»?',
        a: 'Задача вважається виконаною тільки після перевірки ментором або організатором. Це гарантує контроль якості — автоматичне завершення без перевірки неможливе.',
      },
      {
        q: 'Що таке «Claim» (взяти на перевірку)?',
        a: 'Коли задача в InReview, ментор натискає «Перевірити» — задача блокується за ним. Інші ментори бачать хто її перевіряє. Це запобігає подвійній перевірці одної задачі.',
      },
      {
        q: 'Бали за виконання',
        a: 'Після прийняття задачі ментором система автоматично нараховує бали виконавцю: Low = 1, Medium = 3, High = 5. Бали відображаються в рейтингу.',
      },
    ],
  },
  {
    id: 'projects',
    icon: BookOpen,
    title: 'Робота з проєктами',
    color: 'text-indigo-600 bg-indigo-50',
    items: [
      {
        q: 'Хто може створити проєкт?',
        a: 'Тільки користувачі з глобальною роллю «Organizer» або «Admin». Звичайний користувач може тільки бути запрошений до проєкту.',
      },
      {
        q: 'Вкладки проєкту',
        a: 'Задачі (Kanban або список), Учасники (управління складом), Чат (командне спілкування в реальному часі через SignalR), Аналітика (графіки прогресу), Звіт (PDF/Excel для цього проєкту).',
      },
      {
        q: 'Перемикач Kanban / Список',
        a: 'У вкладці «Задачі» є кнопки в правому куті: «Kanban» (дошка по стовпцях) і «Список» (таблиця з групуванням по статусу, клікабельна). Вибір зберігається до перезавантаження.',
      },
    ],
  },
  {
    id: 'mentor',
    icon: GraduationCap,
    title: 'Менторство',
    color: 'text-green-600 bg-green-50',
    items: [
      {
        q: 'Як стати ментором?',
        a: 'Організатор проєкту відкриває розділ «Учасники» → знаходить потрібного користувача → змінює роль на «Mentor». Ментор отримує доступ до функцій перевірки задач.',
      },
      {
        q: 'Що бачить ментор на своїй сторінці?',
        a: 'Список проєктів де він ментор → підопічні з прогресом → вкладки «Задачі» (усі задачі підопічного, клікабельні) і «Нотатки» (приватні записи, видимі тільки ментору).',
      },
      {
        q: 'Процес перевірки задачі',
        a: '1. Учасник здає задачу (кнопка «Здати» → заповнює форму: що зроблено, посилання, години). 2. Задача переходить в InReview. 3. Ментор натискає «Перевірити» → «Рішення» → обирає Прийняти або Повернути з коментарем.',
      },
    ],
  },
  {
    id: 'notifications',
    icon: Bell,
    title: 'Сповіщення',
    color: 'text-amber-600 bg-amber-50',
    items: [
      {
        q: 'Коли приходять сповіщення?',
        a: 'При: здачі задачі на перевірку (ментору), прийнятті або поверненні задачі (виконавцю), додаванні до проєкту, призначенні задачі.',
      },
      {
        q: 'Реальний час',
        a: 'Лічильник непрочитаних на дзвоні оновлюється миттєво через SignalR — без перезавантаження сторінки. Якщо з\'єднання розірвалось, система автоматично перепідключається.',
      },
    ],
  },
  {
    id: 'reports',
    icon: FileText,
    title: 'Звіти та аналітика',
    color: 'text-red-600 bg-red-50',
    items: [
      {
        q: 'Особистий звіт (PDF)',
        a: 'Містить: виконані задачі з розбивкою по пріоритету, нараховані бали, рейтингову позицію, активність (коментарі, здачі). Генерується в реальному часі, актуальний на момент завантаження.',
      },
      {
        q: 'Звіт по проєкту (PDF / Excel)',
        a: 'PDF — для презентацій: список задач по статусу, учасники, прогрес. Excel — для аналізу: таблиця з усіма задачами, фільтрація та сортування в Excel.',
      },
      {
        q: 'Аналітика проєкту',
        a: 'Вкладка «Аналітика» всередині проєкту: кругова діаграма розподілу задач, графік активності, статистика по учасниках. Оновлюється в реальному часі.',
      },
    ],
  },
  {
    id: 'calendar',
    icon: Calendar,
    title: 'Календар задач',
    color: 'text-teal-600 bg-teal-50',
    items: [
      {
        q: 'Що відображається в календарі?',
        a: 'Усі ваші задачі (з усіх проєктів) показуються на днях відповідно до дедлайну. Колір відповідає статусу; прострочені задачі виділяються червоним.',
      },
      {
        q: 'Навігація',
        a: 'Кнопки ← → переключають місяці. «Сьогодні» повертає до поточного місяця. Клік на задачу відкриває детальну картку з усією інформацією.',
      },
    ],
  },
]

export default function DocsPage() {
  const [open, setOpen] = useState<Record<string, boolean>>({})
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({ roles: true })

  const toggleSection = (id: string) =>
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }))

  const toggleItem = (key: string) =>
    setOpen((prev) => ({ ...prev, [key]: !prev[key] }))

  return (
    <div className="max-w-4xl mx-auto p-6">

      {/* Шапка */}
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-primary-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Документація</h1>
          <p className="text-sm text-slate-500">Довідник по роботі із системою Squadly</p>
        </div>
      </div>

      {/* Швидкий огляд */}
      <div className="bg-gradient-to-r from-primary-50 to-white rounded-2xl border border-primary-100 p-5 mb-6 mt-4">
        <h2 className="font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <ArrowRight className="w-4 h-4 text-primary-600" />
          Швидкий старт
        </h2>
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">1</span>
            <span className="text-slate-700">Організатор створює проєкт та запрошує учасників</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">2</span>
            <span className="text-slate-700">Організатор призначає ментора та розподіляє задачі</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">3</span>
            <span className="text-slate-700">Учасники беруть задачі в роботу та здають через кнопку «Здати»</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="w-5 h-5 rounded-full bg-primary-600 text-white text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">4</span>
            <span className="text-slate-700">Ментор перевіряє здані задачі та нараховує бали</span>
          </div>
        </div>

        {/* Схема lifecycle */}
        <div className="mt-4 pt-4 border-t border-primary-100 flex items-center gap-1 flex-wrap text-xs">
          {[
            { label: 'ToDo', cls: 'bg-slate-100 text-slate-700' },
            { label: '→', cls: 'text-slate-400' },
            { label: 'InProgress', cls: 'bg-blue-100 text-blue-700' },
            { label: '→', cls: 'text-slate-400' },
            { icon: Send, label: 'Здати', cls: 'bg-primary-100 text-primary-700' },
            { label: '→', cls: 'text-slate-400' },
            { label: 'InReview', cls: 'bg-purple-100 text-purple-700' },
            { icon: Eye, label: 'Рішення', cls: 'bg-purple-50 text-purple-600 border border-purple-200' },
            { label: '→', cls: 'text-slate-400' },
            { label: 'Done ✓', cls: 'bg-green-100 text-green-700' },
          ].map((item, i) =>
            item.label === '→' ? (
              <span key={i} className="text-slate-400 font-bold">→</span>
            ) : (
              <span key={i} className={`px-2 py-0.5 rounded font-medium inline-flex items-center gap-1 ${item.cls}`}>
                {item.icon && <item.icon className="w-3 h-3" />}
                {item.label}
              </span>
            )
          )}
        </div>
      </div>

      {/* Секції документації */}
      <div className="space-y-3">
        {SECTIONS.map((section) => {
          const SectionIcon = section.icon
          const isExpanded = expandedSections[section.id]

          return (
            <div key={section.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
              <button
                onClick={() => toggleSection(section.id)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${section.color}`}>
                    <SectionIcon className="w-4 h-4" />
                  </div>
                  <span className="font-semibold text-slate-900">{section.title}</span>
                  <span className="text-xs text-slate-400 font-normal">{section.items.length} розділи</span>
                </div>
                {isExpanded
                  ? <ChevronDown className="w-4 h-4 text-slate-400" />
                  : <ChevronRight className="w-4 h-4 text-slate-400" />}
              </button>

              {isExpanded && (
                <div className="border-t border-slate-100 divide-y divide-slate-100">
                  {section.items.map((item, idx) => {
                    const key = `${section.id}-${idx}`
                    const isOpen = open[key]
                    return (
                      <div key={key}>
                        <button
                          onClick={() => toggleItem(key)}
                          className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-slate-50 transition"
                        >
                          <span className="text-sm font-medium text-slate-800">{item.q}</span>
                          {isOpen
                            ? <ChevronDown className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />
                            : <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 ml-2" />}
                        </button>
                        {isOpen && (
                          <div className="px-5 pb-4">
                            <p className="text-sm text-slate-600 leading-relaxed bg-slate-50 rounded-xl p-3">
                              {item.a}
                            </p>
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Підвал */}
      <div className="mt-6 bg-slate-50 rounded-2xl border border-slate-200 p-5 text-center">
        <Users className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        <p className="text-sm text-slate-600 font-medium">Squadly — система управління командними проєктами</p>
        <p className="text-xs text-slate-400 mt-1">
          Дипломна робота · Розроблено з використанням ASP.NET Core 8 + React + SignalR
        </p>
      </div>
    </div>
  )
}
