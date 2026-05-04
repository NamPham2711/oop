import { useCallback, useEffect, useState } from 'react'
import { apiFetch } from '../api/client.js'

export default function Dashboard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadStats = useCallback(async () => {
    setLoading(true)
    try {
      const now = new Date()
      const year = now.getFullYear()
      const month = now.getMonth() + 1
      const res = await apiFetch(`/api/admin/dashboard-stats?year=${year}&month=${month}`)
      if (res.ok) {
        setStats(await res.json())
      }
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadStats()
  }, [loadStats])

  const dailyRevenue = Array.isArray(stats?.dailyRevenue) ? stats.dailyRevenue : []
  const salesByCategory = Array.isArray(stats?.salesByCategory) ? stats.salesByCategory : []

  const maxDailyRevenue = dailyRevenue.reduce((max, p) => Math.max(max, Number(p?.revenue || 0)), 0) || 1
  const monthTitle = formatMonthTitle(dailyRevenue)

  if (loading) {
    return (
      <section className="dashboard-page">
        <div className="page-title">
          <h1>Dashboard</h1>
        </div>
        <p className="muted">Đang tải...</p>
      </section>
    )
  }

  return (
    <section className="dashboard-page">
      <div className="page-title">
        <h1>Dashboard</h1>
      </div>

      <div className="stats-grid">
        <StatCard label="Revenue" value={toCurrency(stats?.totalRevenue || 0)} />
        <StatCard label="Products" value={stats?.totalProducts || 0} />
        <StatCard label="Items in Stock" value={stats?.itemsInStock || 0} />
        <StatCard label="Items Sold" value={stats?.itemsSold || 0} />
      </div>

      <div className="charts-grid">
        <article className="card chart-card">
          <h3>Revenue Overview</h3>
          {monthTitle ? <p className="muted" style={{ marginTop: 6 }}>{monthTitle}</p> : null}
          <div className="line-chart">
            {dailyRevenue.map((point, idx) => (
              <div key={point.day || idx} className="line-item">
                <div
                  className="line-bar"
                  style={{ height: `${(Number(point?.revenue || 0) / maxDailyRevenue) * 180}px` }}
                  title={`${formatDayLabel(point?.day)}: ${toCurrency(point?.revenue || 0)}`}
                />
                <span>{formatDayOnly(point?.day)}</span>
                {idx < dailyRevenue.length - 1 ? <i className="line-dot" /> : null}
              </div>
            ))}
          </div>
        </article>

        <article className="card chart-card">
          <h3>Sales by Category</h3>
          <div className="bar-chart">
            {salesByCategory.map((item, idx) => (
              <div key={`${item?.category || 'cat'}-${idx}`} className="bar-row">
                <span>{item?.category || 'Khác'}</span>
                <div className="bar-track">
                  <div className="bar-fill" style={{ width: `${Number(item?.percent || 0)}%` }} />
                </div>
                <strong>{formatPercent(item?.percent)}</strong>
              </div>
            ))}
          </div>
        </article>
      </div>
    </section>
  )
}

function StatCard({ label, value, trend }) {
  return (
    <article className="stat-card">
      <p>{label}</p>
      <h3>{value}</h3>
      {trend ? <span>{trend}</span> : null}
    </article>
  )
}

function toCurrency(value) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(
    value,
  )
}

function formatDayLabel(isoDay) {
  if (!isoDay) return ''
  const parts = String(isoDay).split('-')
  if (parts.length !== 3) return String(isoDay)
  return `${parts[2]}/${parts[1]}`
}

function formatDayOnly(isoDay) {
  if (!isoDay) return ''
  const parts = String(isoDay).split('-')
  if (parts.length !== 3) return String(isoDay)
  return String(Number(parts[2]))
}

function formatMonthTitle(dailyRevenue) {
  if (!Array.isArray(dailyRevenue) || dailyRevenue.length === 0) return ''
  const first = dailyRevenue[0]?.day
  const parts = String(first || '').split('-')
  if (parts.length !== 3) return ''
  const year = parts[0]
  const month = String(Number(parts[1]))
  return `Tháng ${month} ${year}`
}

function formatPercent(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return '0%'
  return `${n.toFixed(0)}%`
}
