import { useState, useMemo, useEffect, useRef } from 'react'
import { Search, ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react'

// ─── Seed Data ────────────────────────────────────────────────────────────────

const SEED_RECORDS = [
  { id: 'NZ-001', location: 'PLANTATION_HQ',      severity: 1, status: 'CRITICAL',    timestamp: '2026-04-22 08:14', city: 'PLANTATION',       description: 'CONSTRUCTION_WITHOUT_PERMIT' },
  { id: 'NZ-002', location: 'BRICKELL_TOWER',     severity: 1, status: 'IN_PROGRESS', timestamp: '2026-04-22 09:31', city: 'PLANTATION',       description: 'EXPIRED_PERMIT_STRUCT' },
  { id: 'NZ-003', location: 'PEMBROKE_SECTOR_7',  severity: 2, status: 'IN_PROGRESS', timestamp: '2026-04-21 17:05', city: 'PEMBROKE_PINES',   description: 'WORK_WITHOUT_PERMIT' },
  { id: 'NZ-004', location: 'SUNRISE_GRID_4',     severity: 3, status: 'ON_HOLD',     timestamp: '2026-04-21 14:22', city: 'SUNRISE',          description: 'EXPIRED_PERMIT_ELEC' },
  { id: 'NZ-005', location: 'DAVIE_RANCH_EST',    severity: 2, status: 'IN_PROGRESS', timestamp: '2026-04-21 11:48', city: 'DAVIE',            description: 'EXPIRED_PERMIT_RESIDENTIAL' },
  { id: 'NZ-006', location: 'PEMBROKE_OAK_PLAZA', severity: 4, status: 'RESOLVED',    timestamp: '2026-04-20 16:33', city: 'PEMBROKE_PINES',   description: 'PERMIT_LAPSED_POOL' },
  { id: 'NZ-007', location: 'PLANTATION_DIST_3',  severity: 1, status: 'CRITICAL',    timestamp: '2026-04-20 09:12', city: 'PLANTATION',       description: 'UNPERMITTED_ADDITION' },
  { id: 'NZ-008', location: 'SUNRISE_WEST_COMM',  severity: 3, status: 'IN_PROGRESS', timestamp: '2026-04-19 14:55', city: 'SUNRISE',          description: 'CONSTRUCTION_WITHOUT_PERMIT' },
  { id: 'NZ-009', location: 'DAVIE_SECTOR_2A',    severity: 2, status: 'ON_HOLD',     timestamp: '2026-04-19 10:07', city: 'DAVIE',            description: 'EXPIRED_PERMIT_MECH' },
  { id: 'NZ-010', location: 'PLANTATION_PINE_CT', severity: 4, status: 'RESOLVED',    timestamp: '2026-04-18 17:44', city: 'PLANTATION',       description: 'PERMIT_LAPSED_FENCE' },
  { id: 'NZ-011', location: 'PEMBROKE_MAIN_BLVD', severity: 3, status: 'IN_PROGRESS', timestamp: '2026-04-18 12:29', city: 'PEMBROKE_PINES',   description: 'WORK_WITHOUT_PERMIT' },
  { id: 'NZ-012', location: 'DAVIE_OAK_GROVE',    severity: 1, status: 'CRITICAL',    timestamp: '2026-04-18 08:55', city: 'DAVIE',            description: 'CONSTRUCTION_WITHOUT_PERMIT' },
  { id: 'NZ-013', location: 'SUNRISE_CORP_PARK',  severity: 2, status: 'RESOLVED',    timestamp: '2026-04-17 16:11', city: 'SUNRISE',          description: 'EXPIRED_PERMIT_STRUCT' },
  { id: 'NZ-014', location: 'PLANTATION_LAKE_DR', severity: 4, status: 'ON_HOLD',     timestamp: '2026-04-17 13:02', city: 'PLANTATION',       description: 'PERMIT_LAPSED_ROOF' },
  { id: 'NZ-015', location: 'PEMBROKE_HALLANDALE', severity: 3, status: 'IN_PROGRESS', timestamp: '2026-04-17 09:38', city: 'PEMBROKE_PINES',  description: 'EXPIRED_PERMIT_PLUMB' },
  { id: 'NZ-016', location: 'DAVIE_STIRLING_RD',  severity: 2, status: 'IN_PROGRESS', timestamp: '2026-04-16 15:47', city: 'DAVIE',            description: 'WORK_WITHOUT_PERMIT' },
  { id: 'NZ-017', location: 'SUNRISE_NW_136_AVE', severity: 4, status: 'RESOLVED',    timestamp: '2026-04-16 11:23', city: 'SUNRISE',          description: 'PERMIT_LAPSED_AC' },
  { id: 'NZ-018', location: 'PLANTATION_CLEARY',  severity: 1, status: 'CRITICAL',    timestamp: '2026-04-15 08:04', city: 'PLANTATION',       description: 'UNPERMITTED_STRUCT' },
  { id: 'NZ-019', location: 'PEMBROKE_SHERIDAN',  severity: 3, status: 'IN_PROGRESS', timestamp: '2026-04-15 14:19', city: 'PEMBROKE_PINES',   description: 'CONSTRUCTION_WITHOUT_PERMIT' },
  { id: 'NZ-020', location: 'DAVIE_PINE_ISLAND',  severity: 2, status: 'ON_HOLD',     timestamp: '2026-04-14 10:56', city: 'DAVIE',            description: 'EXPIRED_PERMIT_GARAGE' },
]

// ─── Severity Rendering ───────────────────────────────────────────────────────

const SEVERITY_MAP = {
  1: { label: '[***] CRITICAL', class: 'text-white' },
  2: { label: '[** ] ELEVATED', class: 'text-white' },
  3: { label: '[*  ] GUARDED',  class: 'text-muted' },
  4: { label: '[   ] LOW',      class: 'text-zinc-600' },
}

const STATUS_CLASS = {
  CRITICAL:    'text-white',
  IN_PROGRESS: 'text-white',
  ON_HOLD:     'text-zinc-400',
  RESOLVED:    'text-zinc-600 line-through',
}

// ─── Utility ─────────────────────────────────────────────────────────────────

function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function fmtClock(d) {
  const pad = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
}

// ─── Sub-Components ───────────────────────────────────────────────────────────

function HRule() {
  return <div className="w-full border-t border-white" />
}

function KpiBlock({ label, value }) {
  return (
    <div className="flex items-center gap-0 whitespace-nowrap">
      <span className="text-muted text-xs tracking-widest">[ </span>
      <span className="text-muted text-xs tracking-widest">{label}: </span>
      <span className="text-white text-xs tracking-widest font-medium">{value}</span>
      <span className="text-muted text-xs tracking-widest"> ]</span>
    </div>
  )
}

function SortIcon({ col, sortCol, sortDir }) {
  if (sortCol !== col) return <ChevronsUpDown size={10} strokeWidth={1} className="text-zinc-600 ml-1 inline" />
  return sortDir === 'asc'
    ? <ChevronUp size={10} strokeWidth={1} className="text-white ml-1 inline" />
    : <ChevronDown size={10} strokeWidth={1} className="text-white ml-1 inline" />
}

function Th({ col, label, sortCol, sortDir, onSort }) {
  return (
    <th
      className="text-left py-2 px-3 text-xs text-muted tracking-widest cursor-pointer select-none hover:text-white transition-colors whitespace-nowrap"
      onClick={() => onSort(col)}
    >
      {label}
      <SortIcon col={col} sortCol={sortCol} sortDir={sortDir} />
    </th>
  )
}

// ─── Main App ─────────────────────────────────────────────────────────────────

export default function App() {
  const now = useClock()
  const [query, setQuery] = useState('')
  const [sortCol, setSortCol] = useState('severity')
  const [sortDir, setSortDir] = useState('asc')
  const [cmdHistory, setCmdHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)
  const inputRef = useRef(null)

  // Derived KPIs
  const totalIntel  = SEED_RECORDS.length
  const activeSites = new Set(SEED_RECORDS.filter(r => r.status !== 'RESOLVED').map(r => r.city)).size
  const criticalCt  = SEED_RECORDS.filter(r => r.severity === 1).length

  // Filter
  const filtered = useMemo(() => {
    const q = query.toLowerCase().trim()
    if (!q) return SEED_RECORDS
    return SEED_RECORDS.filter(r =>
      r.id.toLowerCase().includes(q) ||
      r.location.toLowerCase().includes(q) ||
      r.city.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.status.toLowerCase().includes(q) ||
      SEVERITY_MAP[r.severity].label.toLowerCase().includes(q)
    )
  }, [query])

  // Sort
  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      let va, vb
      switch (sortCol) {
        case 'id':        va = a.id; vb = b.id; break
        case 'location':  va = a.location; vb = b.location; break
        case 'severity':  va = a.severity; vb = b.severity; break
        case 'status':    va = a.status; vb = b.status; break
        case 'timestamp': va = a.timestamp; vb = b.timestamp; break
        default:          va = a.severity; vb = b.severity
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })
  }, [filtered, sortCol, sortDir])

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(histIdx + 1, cmdHistory.length - 1)
      setHistIdx(next)
      if (cmdHistory[next] !== undefined) setQuery(cmdHistory[next])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.max(histIdx - 1, -1)
      setHistIdx(next)
      setQuery(next === -1 ? '' : cmdHistory[next])
    } else if (e.key === 'Enter') {
      if (query.trim()) {
        setCmdHistory(h => [query.trim(), ...h.slice(0, 49)])
        setHistIdx(-1)
      }
    } else if (e.key === 'Escape') {
      setQuery('')
      setHistIdx(-1)
    }
  }

  return (
    <div
      className="min-h-screen bg-black text-white flex flex-col"
      style={{ fontFamily: '"IBM Plex Mono", "JetBrains Mono", ui-monospace, monospace' }}
      onClick={() => inputRef.current?.focus()}
    >
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-6 py-4">
        <div>
          <span className="text-white text-sm font-semibold tracking-widest">
            NAZCA CONSTRUCTIONS
          </span>
          <span className="text-muted text-sm mx-2">//</span>
          <span className="text-white text-sm font-medium tracking-widest">
            OP_COMMAND
          </span>
        </div>
        <div className="text-right">
          <div className="text-muted text-xs tracking-ultra">
            POWERED BY THE LINAN GROUP
          </div>
          <div className="text-zinc-600 text-xs mt-0.5">
            {fmtClock(now)}
          </div>
        </div>
      </header>

      <HRule />

      {/* ── KPI Bar ────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-6 px-6 py-3 flex-wrap">
        <KpiBlock label="TOTAL_INTEL"      value={String(totalIntel).padStart(3, '0')} />
        <span className="text-zinc-700 text-xs">|</span>
        <KpiBlock label="ACTIVE_SITES"     value={String(activeSites).padStart(2, '0')} />
        <span className="text-zinc-700 text-xs">|</span>
        <KpiBlock label="CRITICAL_THREATS" value={String(criticalCt).padStart(2, '0')} />
        <span className="text-zinc-700 text-xs">|</span>
        <KpiBlock label="SYSTEM_STATUS"    value="SECURE" />
      </div>

      <HRule />

      {/* ── Filter info line ───────────────────────────────────────────────── */}
      {query && (
        <div className="px-6 py-1.5 text-xs text-muted">
          FILTER_ACTIVE &gt; {sorted.length} RECORD{sorted.length !== 1 ? 'S' : ''} MATCHED
        </div>
      )}

      {/* ── Record Ledger ──────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-auto px-0">
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b border-zinc-800">
              <Th col="id"        label="OP_ID"      sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <Th col="location"  label="LOCATION"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <Th col="severity"  label="SEVERITY"   sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <Th col="status"    label="STATUS"     sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <Th col="timestamp" label="TIMESTAMP"  sortCol={sortCol} sortDir={sortDir} onSort={handleSort} />
              <th className="text-left py-2 px-3 text-xs text-muted tracking-widest whitespace-nowrap">
                DESCRIPTION
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-3 py-8 text-center text-muted text-xs tracking-widest">
                  NO_RECORDS_MATCHED // ADJUST_FILTER_PARAMETERS
                </td>
              </tr>
            ) : (
              sorted.map((rec, i) => {
                const sev = SEVERITY_MAP[rec.severity]
                const isEven = i % 2 === 0
                return (
                  <tr
                    key={rec.id}
                    className={`
                      border-b border-zinc-900
                      ${isEven ? 'bg-black' : 'bg-zinc-950'}
                      hover:bg-zinc-900 transition-colors duration-100 cursor-default
                    `}
                  >
                    <td className="py-2.5 px-3 text-xs font-medium text-white whitespace-nowrap">
                      {rec.id}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-white whitespace-nowrap">
                      {rec.location}
                    </td>
                    <td className={`py-2.5 px-3 text-xs whitespace-nowrap font-mono ${sev.class}`}>
                      {sev.label}
                    </td>
                    <td className={`py-2.5 px-3 text-xs whitespace-nowrap ${STATUS_CLASS[rec.status] || 'text-white'}`}>
                      {rec.status}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-muted whitespace-nowrap">
                      {rec.timestamp}
                    </td>
                    <td className="py-2.5 px-3 text-xs text-zinc-400 whitespace-nowrap">
                      {rec.description}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <HRule />

      {/* ── Terminal Input ─────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 px-6 py-3">
        <span className="text-muted text-xs whitespace-nowrap tracking-wide select-none">
          USER@LINAN_GP:~$
        </span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setHistIdx(-1) }}
          onKeyDown={handleKeyDown}
          placeholder="Search records..."
          className="
            flex-1 bg-transparent text-white text-xs
            border-none outline-none
            placeholder-zinc-600
            caret-white
          "
          style={{ fontFamily: 'inherit' }}
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
        <span className="cursor-blink text-white text-xs select-none">_</span>
        {query && (
          <button
            onClick={e => { e.stopPropagation(); setQuery(''); setHistIdx(-1); inputRef.current?.focus() }}
            className="text-zinc-600 hover:text-white text-xs transition-colors ml-2"
          >
            [CLR]
          </button>
        )}
      </div>

      {/* ── Footer ─────────────────────────────────────────────────────────── */}
      <div className="px-6 py-2 flex items-center justify-between border-t border-zinc-900">
        <span className="text-zinc-700 text-xs tracking-widest">
          CLASSIFICATION: PROPRIETARY // NAZCA_OPS
        </span>
        <span className="text-zinc-700 text-xs">
          v1.0.0 / 2026
        </span>
      </div>
    </div>
  )
}
