import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  const token = sessionStorage.getItem('token')

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="text-center">
        <p className="text-6xl font-bold text-primary-600 mb-4">404</p>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Сторінку не знайдено</h1>
        <p className="text-sm text-slate-500 mb-6">
          Схоже, такої сторінки не існує або вона була переміщена.
        </p>
        <Link
          to={token ? '/dashboard' : '/login'}
          className="bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-lg font-medium text-sm"
        >
          {token ? 'На головну' : 'Увійти'}
        </Link>
      </div>
    </div>
  )
}
