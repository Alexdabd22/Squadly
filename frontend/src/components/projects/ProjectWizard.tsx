import { useState, useEffect } from 'react'
import { X, ArrowLeft, ArrowRight, Check } from 'lucide-react'
import type {
  Project,
  CreateProjectRequest,
  ProjectCategory,
  ProjectColor,
  ProjectPriority,
} from '../../types'
import { CATEGORIES, COLORS, PRIORITY_LABEL } from '../../constants/project'

interface Props {
  open: boolean
  mode: 'create' | 'edit'
  initial?: Project | null
  loading?: boolean
  error?: string
  onClose: () => void
  onSubmit: (data: CreateProjectRequest) => void
}

const EMPTY: CreateProjectRequest = {
  title: '',
  description: '',
  category: 'Other',
  priority: 'Medium',
  color: 'indigo',
  startDate: null,
  deadline: null,
  goal: '',
  tags: [],
}

const toDateInput = (iso?: string | null) => (iso ? iso.substring(0, 10) : '')
const fromDateInput = (val: string): string | null => (val ? val : null)

export default function ProjectWizard({
  open,
  mode,
  initial,
  loading,
  error,
  onClose,
  onSubmit,
}: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [form, setForm] = useState<CreateProjectRequest>(EMPTY)
  const [tagInput, setTagInput] = useState('')
  const [localError, setLocalError] = useState('')

  useEffect(() => {
    if (!open) return
    setStep(1)
    setLocalError('')
    setTagInput('')
    if (mode === 'edit' && initial) {
      setForm({
        title: initial.title,
        description: initial.description ?? '',
        category: initial.category,
        priority: initial.priority,
        color: initial.color,
        startDate: initial.startDate ?? null,
        deadline: initial.deadline ?? null,
        goal: initial.goal ?? '',
        tags: initial.tags ?? [],
      })
    } else {
      setForm(EMPTY)
    }
  }, [open, mode, initial])

  if (!open) return null

  const canNextFromStep1 = form.title.trim().length >= 3

  const validateStep2 = (): string => {
    if (form.startDate && form.deadline && form.startDate > form.deadline) {
      return 'Дата старту не може бути пізніше дедлайну'
    }
    return ''
  }

  const handleNext = () => {
    if (step === 1) {
      if (!canNextFromStep1) {
        setLocalError('Назва має бути не менше 3 символів')
        return
      }
      setLocalError('')
      setStep(2)
      return
    }
    if (step === 2) {
      const err = validateStep2()
      if (err) {
        setLocalError(err)
        return
      }
      setLocalError('')
      setStep(3)
    }
  }

  const handleBack = () => {
    setLocalError('')
    if (step === 2) setStep(1)
    if (step === 3) setStep(2)
  }

  const addTag = () => {
    const t = tagInput.trim()
    if (!t) return
    if (form.tags.includes(t)) {
      setTagInput('')
      return
    }
    if (form.tags.length >= 10) {
      setLocalError('Максимум 10 тегів')
      return
    }
    if (t.length > 30) {
      setLocalError('Тег не може бути довшим за 30 символів')
      return
    }
    setLocalError('')
    setForm({ ...form, tags: [...form.tags, t] })
    setTagInput('')
  }

  const removeTag = (t: string) => {
    setForm({ ...form, tags: form.tags.filter((x) => x !== t) })
  }

  const handleFinish = () => {
    if (!canNextFromStep1) {
      setStep(1)
      setLocalError('Назва має бути не менше 3 символів')
      return
    }
    const e = validateStep2()
    if (e) {
      setStep(2)
      setLocalError(e)
      return
    }
    onSubmit({
      ...form,
      title: form.title.trim(),
      description: form.description?.trim() || undefined,
      goal: form.goal?.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full max-h-[90vh] flex flex-col">
        {/* header + stepper */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              {mode === 'create' ? 'Створення проєкту' : 'Редагування проєкту'}
            </h2>
            <div className="mt-3 flex items-center gap-2 text-xs">
              <StepDot active={step >= 1} done={step > 1} num={1} label="Основне" />
              <div className="w-6 h-px bg-slate-200" />
              <StepDot active={step >= 2} done={step > 2} num={2} label="Терміни" />
              <div className="w-6 h-px bg-slate-200" />
              <StepDot active={step >= 3} done={false} num={3} label="Підсумок" />
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-700">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {(error || localError) && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-3 py-2 mb-4 text-sm">
              {error || localError}
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <Field label="Назва проєкту *">
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Напр. Інтернет-магазин"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  autoFocus
                />
              </Field>

              <Field label="Опис">
                <textarea
                  value={form.description ?? ''}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  rows={3}
                  placeholder="Коротко: що це за проєкт"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </Field>

              <Field label="Категорія">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CATEGORIES.map((c) => {
                    const Icon = c.icon
                    const active = form.category === c.value
                    return (
                      <button
                        key={c.value}
                        type="button"
                        onClick={() => setForm({ ...form, category: c.value as ProjectCategory })}
                        className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition ${
                          active
                            ? 'border-primary-500 bg-primary-50 text-primary-700'
                            : 'border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {c.label}
                      </button>
                    )
                  })}
                </div>
              </Field>

              <Field label="Колір картки">
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.value}
                      type="button"
                      onClick={() => setForm({ ...form, color: c.value as ProjectColor })}
                      title={c.label}
                      className={`w-9 h-9 rounded-full ${c.bar} ${
                        form.color === c.value ? `ring-2 ring-offset-2 ${c.ring}` : ''
                      }`}
                    />
                  ))}
                </div>
              </Field>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Дата старту">
                  <input
                    type="date"
                    value={toDateInput(form.startDate)}
                    onChange={(e) => setForm({ ...form, startDate: fromDateInput(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </Field>
                <Field label="Дедлайн">
                  <input
                    type="date"
                    value={toDateInput(form.deadline)}
                    onChange={(e) => setForm({ ...form, deadline: fromDateInput(e.target.value) })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </Field>
              </div>

              <Field label="Пріоритет">
                <div className="grid grid-cols-3 gap-2">
                  {(['Low', 'Medium', 'High'] as ProjectPriority[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm({ ...form, priority: p })}
                      className={`px-3 py-2 rounded-lg border text-sm transition ${
                        form.priority === p
                          ? 'border-primary-500 bg-primary-50 text-primary-700'
                          : 'border-slate-200 hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      {PRIORITY_LABEL[p]}
                    </button>
                  ))}
                </div>
              </Field>

              <Field label="Мета проєкту">
                <textarea
                  value={form.goal ?? ''}
                  onChange={(e) => setForm({ ...form, goal: e.target.value })}
                  rows={3}
                  maxLength={1000}
                  placeholder="Що команда має зробити до кінця проєкту"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
                <p className="text-xs text-slate-400 mt-1">{(form.goal ?? '').length}/1000</p>
              </Field>

              <Field label="Теги (максимум 10)">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag()
                      }
                    }}
                    placeholder="напр. frontend"
                    className="flex-1 px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                  <button
                    type="button"
                    onClick={addTag}
                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-sm font-medium"
                  >
                    Додати
                  </button>
                </div>
                {form.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {form.tags.map((t) => (
                      <span key={t} className="inline-flex items-center gap-1 text-xs bg-slate-100 text-slate-700 px-2 py-1 rounded">
                        #{t}
                        <button onClick={() => removeTag(t)} className="text-slate-400 hover:text-slate-700">
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </Field>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <Row k="Назва" v={form.title} />
                {form.description && <Row k="Опис" v={form.description} />}
                <Row k="Категорія" v={CATEGORIES.find((c) => c.value === form.category)?.label ?? form.category} />
                <Row k="Пріоритет" v={PRIORITY_LABEL[form.priority]} />
                <Row k="Колір" v={COLORS.find((c) => c.value === form.color)?.label ?? form.color} />
                {form.startDate && <Row k="Старт" v={form.startDate} />}
                {form.deadline && <Row k="Дедлайн" v={form.deadline} />}
                {form.goal && <Row k="Мета" v={form.goal} />}
                {form.tags.length > 0 && <Row k="Теги" v={form.tags.map((t) => '#' + t).join(' ')} />}
              </div>
              <p className="text-xs text-slate-500">
                Перевір дані. {mode === 'create' ? 'Після створення ти автоматично станеш організатором.' : 'Зміни будуть застосовані одразу.'}
              </p>
            </div>
          )}
        </div>

        {/* footer */}
        <div className="px-6 py-4 border-t border-slate-200 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={handleBack}
              disabled={loading}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              <ArrowLeft className="w-4 h-4" />
              Назад
            </button>
          ) : (
            <button
              onClick={onClose}
              disabled={loading}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-slate-100 hover:bg-slate-200 text-slate-700"
            >
              Скасувати
            </button>
          )}

          {step < 3 ? (
            <button
              onClick={handleNext}
              disabled={loading}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white"
            >
              Далі
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              disabled={loading}
              className="inline-flex items-center gap-1 px-4 py-2 rounded-lg text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white disabled:opacity-50"
            >
              <Check className="w-4 h-4" />
              {loading ? 'Збереження…' : mode === 'create' ? 'Створити' : 'Зберегти'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1">{label}</label>
      {children}
    </div>
  )
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-3">
      <span className="text-slate-500 w-20 shrink-0">{k}:</span>
      <span className="text-slate-900 break-words">{v}</span>
    </div>
  )
}

function StepDot({ active, done, num, label }: { active: boolean; done: boolean; num: number; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span
        className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold ${
          done
            ? 'bg-primary-600 text-white'
            : active
            ? 'bg-primary-100 text-primary-700 ring-2 ring-primary-500'
            : 'bg-slate-100 text-slate-400'
        }`}
      >
        {done ? <Check className="w-3.5 h-3.5" /> : num}
      </span>
      <span className={`text-xs ${active ? 'text-slate-700' : 'text-slate-400'}`}>{label}</span>
    </div>
  )
}