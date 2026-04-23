import { useState, useMemo, useEffect, useRef } from 'react'
import { Phone, Mail, ExternalLink, ChevronUp, ChevronDown, ChevronsUpDown, MapPin } from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const CITIES = ['ALL', 'PLANTATION', 'DAVIE', 'SUNRISE', 'PEMBROKE']

const SEV = {
  1: { label: '[***]', tag: 'CRITICAL', color: '#F8F8FF' },
  2: { label: '[** ]', tag: 'ELEVATED', color: '#a1a1aa' },
  3: { label: '[*  ]', tag: 'GUARDED',  color: '#71717a' },
  4: { label: '[   ]', tag: 'LOW',      color: '#3f3f46' },
}

const BCPA_STATUS_LABEL = {
  found:            null,
  not_found:        'NO_BCPA',
  multiple_results: 'MULTI_MATCH',
  error:            'LOOKUP_ERR',
  '':               null,
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
function useClock() {
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return now
}

function fmtClock(d) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

function fmtPhone(raw) {
  if (!raw) return null
  const d = raw.replace(/\D/g, '').slice(-10)
  return d.length === 10 ? `(${d.slice(0,3)}) ${d.slice(3,6)}-${d.slice(6)}` : raw
}

function mailingLine(owner) {
  const { mailing_street, mailing_city, mailing_state, mailing_zip } = owner
  if (!mailing_street) return null
  const cityLine = [mailing_city, mailing_state].filter(Boolean).join(', ')
  return [mailing_street, cityLine, mailing_zip].filter(Boolean).join(' ')
}

// ─────────────────────────────────────────────────────────────────────────────
// SUB-COMPONENTS
// ─────────────────────────────────────────────────────────────────────────────
function HRule({ dim = false }) {
  return <div className={`w-full border-t ${dim ? 'border-zinc-900' : 'border-white/10'}`} />
}

function KpiBlock({ label, value }) {
  return (
    <span className="whitespace-nowrap text-xs" style={{ fontFamily: 'inherit' }}>
      <span className="text-zinc-500">[ </span>
      <span className="text-zinc-500">{label}: </span>
      <span style={{ color: '#F8F8FF' }} className="font-semibold">{value}</span>
      <span className="text-zinc-500"> ]</span>
    </span>
  )
}

function SortIcon({ col, sortCol, dir }) {
  if (sortCol !== col)
    return <ChevronsUpDown size={9} strokeWidth={1} className="inline ml-1 text-zinc-700" />
  return dir === 'asc'
    ? <ChevronUp   size={9} strokeWidth={1} className="inline ml-1 text-[#F8F8FF]" />
    : <ChevronDown size={9} strokeWidth={1} className="inline ml-1 text-[#F8F8FF]" />
}

function Th({ col, label, sortCol, dir, onSort, className = '' }) {
  return (
    <th
      onClick={() => onSort(col)}
      className={`text-left py-2 px-3 text-[10px] text-zinc-500 tracking-widest cursor-pointer select-none hover:text-[#F8F8FF] transition-colors whitespace-nowrap ${className}`}
    >
      {label}<SortIcon col={col} sortCol={sortCol} dir={dir} />
    </th>
  )
}

function GhlButton({ id, synced, onSync }) {
  const done = synced.has(id)
  return (
    <button
      onClick={e => { e.stopPropagation(); if (!done) onSync(id) }}
      className={`
        text-[9px] tracking-widest border px-2 py-1.5 transition-all duration-300 whitespace-nowrap w-full sm:w-auto
        ${done
          ? 'border-zinc-800 text-zinc-600 cursor-default bg-transparent'
          : 'border-white/30 text-[#F8F8FF] hover:border-[#F8F8FF] hover:bg-white/5 active:scale-95 cursor-pointer'}
      `}
      style={{ fontFamily: 'inherit' }}
    >
      {done ? '[ SYNCED ]' : '[ PUSH_TO_GHL ]'}
    </button>
  )
}

function LoadingState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <span className="text-zinc-600 text-xs tracking-widest animate-pulse">LOADING_INTEL...</span>
    </div>
  )
}

function ErrorState({ message }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-2">
      <span className="text-zinc-600 text-xs tracking-widest">FEED_OFFLINE</span>
      <span className="text-zinc-700 text-[10px]">{message}</span>
    </div>
  )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN APP
// ─────────────────────────────────────────────────────────────────────────────
export default function App() {
  const now      = useClock()
  const inputRef = useRef(null)

  const [leads,       setLeads]       = useState([])
  const [loadState,   setLoadState]   = useState('loading')
  const [loadError,   setLoadError]   = useState('')
  const [generatedAt, setGeneratedAt] = useState('')

  const [city,    setCity]    = useState('ALL')
  const [query,   setQuery]   = useState('')
  const [sortCol, setSortCol] = useState('severity')
  const [sortDir, setSortDir] = useState('asc')
  const [synced,  setSynced]  = useState(new Set())
  const [history, setHistory] = useState([])
  const [histIdx, setHistIdx] = useState(-1)

  // ── Load leads.json ────────────────────────────────────────────────────────
  useEffect(() => {
    fetch('./leads.json')
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then(data => {
        setLeads(data.leads ?? [])
        setGeneratedAt(data.generated_at ?? '')
        setLoadState('ok')
      })
      .catch(err => {
        setLoadError(err.message)
        setLoadState('error')
      })
  }, [])

  // ── KPIs ──────────────────────────────────────────────────────────────────
  const totalIntel  = leads.length
  const activeSites = new Set(leads.filter(l => l.status !== 'RESOLVED').map(l => l.city)).size
  const criticalCt  = leads.filter(l => l.severity === 1).length
  const syncedCt    = synced.size

  // ── Filter + sort pipeline ────────────────────────────────────────────────
  const visible = useMemo(() => {
    const q = query.toLowerCase().trim()
    return leads
      .filter(l => city === 'ALL' || l.city === city)
      .filter(l => {
        if (!q) return true
        return (
          l.address.toLowerCase().includes(q)             ||
          l.owner.name.toLowerCase().includes(q)          ||
          (l.owner.email || '').toLowerCase().includes(q) ||
          l.type.toLowerCase().includes(q)                ||
          l.city.toLowerCase().includes(q)                ||
          l.id.toLowerCase().includes(q)                  ||
          l.case_number.toLowerCase().includes(q)         ||
          (l.parcel_id || '').toLowerCase().includes(q)
        )
      })
      .sort((a, b) => {
        let va, vb
        switch (sortCol) {
          case 'id':       va = a.id;         vb = b.id;         break
          case 'address':  va = a.address;    vb = b.address;    break
          case 'owner':    va = a.owner.name; vb = b.owner.name; break
          case 'type':     va = a.type;       vb = b.type;       break
          case 'severity': va = a.severity;   vb = b.severity;   break
          default:         va = a.severity;   vb = b.severity;
        }
        if (va < vb) return sortDir === 'asc' ? -1 : 1
        if (va > vb) return sortDir === 'asc' ?  1 : -1
        return 0
      })
  }, [leads, city, query, sortCol, sortDir])

  function handleSort(col) {
    if (sortCol === col) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortCol(col); setSortDir('asc') }
  }

  function handleSync(id) {
    setSynced(prev => new Set([...prev, id]))
  }

  function handleKeyDown(e) {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      const next = Math.min(histIdx + 1, history.length - 1)
      setHistIdx(next)
      if (history[next] != null) setQuery(history[next])
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      const next = Math.max(histIdx - 1, -1)
      setHistIdx(next)
      setQuery(next === -1 ? '' : history[next])
    } else if (e.key === 'Enter' && query.trim()) {
      setHistory(h => [query.trim(), ...h.slice(0, 49)])
      setHistIdx(-1)
    } else if (e.key === 'Escape') {
      setQuery(''); setHistIdx(-1)
    }
  }

  // ── RENDER ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-screen flex flex-col bg-black"
      style={{ fontFamily: '"IBM Plex Mono","JetBrains Mono",ui-monospace,monospace', color: '#F8F8FF' }}
      onClick={() => inputRef.current?.focus()}
    >

      {/* HEADER */}
      <header className="flex items-start justify-between px-4 sm:px-6 py-4 gap-4 flex-wrap">
        <div>
          <span className="text-sm font-semibold tracking-widest">NAZCA CONSTRUCTIONS</span>
          <span className="text-zinc-500 text-sm mx-2">//</span>
          <span className="text-sm tracking-widest">OP_COMMAND</span>
        </div>
        <div className="text-right shrink-0">
          <div className="text-zinc-500 text-[10px] tracking-[0.3em]">POWERED BY THE LINAN GROUP</div>
          <div className="text-zinc-600 text-[10px] mt-0.5 tabular-nums">{fmtClock(now)}</div>
          {generatedAt && (
            <div className="text-zinc-700 text-[9px] mt-0.5 tabular-nums">
              FEED: {generatedAt.replace('T', ' ').replace('Z', ' UTC')}
            </div>
          )}
        </div>
      </header>

      <HRule />

      {/* KPI BAR */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 px-4 sm:px-6 py-3">
        <KpiBlock label="TOTAL_INTEL"      value={String(totalIntel).padStart(3,'0')} />
        <span className="text-zinc-700 text-xs hidden sm:inline">|</span>
        <KpiBlock label="ACTIVE_SITES"     value={String(activeSites).padStart(2,'0')} />
        <span className="text-zinc-700 text-xs hidden sm:inline">|</span>
        <KpiBlock label="CRITICAL_THREATS" value={String(criticalCt).padStart(2,'0')} />
        <span className="text-zinc-700 text-xs hidden sm:inline">|</span>
        <KpiBlock label="GHL_SYNCED"       value={String(syncedCt).padStart(2,'0')} />
        <span className="text-zinc-700 text-xs hidden sm:inline">|</span>
        <KpiBlock label="SYSTEM_STATUS"    value={loadState === 'ok' ? 'ONLINE' : loadState === 'loading' ? 'SYNCING' : 'OFFLINE'} />
      </div>

      <HRule />

      {/* SECTOR FILTER BAR */}
      <div className="flex items-center gap-0 px-4 sm:px-6 py-3 overflow-x-auto scrollbar-none">
        {CITIES.map((c, i) => (
          <button
            key={c}
            onClick={e => { e.stopPropagation(); setCity(c) }}
            className={`
              text-[10px] tracking-widest px-3 sm:px-4 py-1.5 border transition-all duration-150 whitespace-nowrap shrink-0
              ${i > 0 ? '-ml-px' : ''}
              ${city === c
                ? 'bg-[#F8F8FF] text-black border-[#F8F8FF] z-10 relative'
                : 'bg-black text-zinc-500 border-zinc-700 hover:border-zinc-400 hover:text-[#F8F8FF]'}
            `}
            style={{ fontFamily: 'inherit' }}
          >
            [ {c} ]
          </button>
        ))}
        <span className="ml-auto pl-6 text-[10px] text-zinc-600 whitespace-nowrap shrink-0">
          {visible.length} / {leads.length} RECORDS
        </span>
      </div>

      <HRule dim />

      {/* CONTENT */}
      {loadState === 'loading' && <LoadingState />}
      {loadState === 'error'   && <ErrorState message={loadError} />}

      {loadState === 'ok' && (
        <div className="flex-1 overflow-auto">
          <table className="w-full border-collapse" style={{ minWidth: '900px' }}>
            <thead>
              <tr className="border-b border-zinc-800 sticky top-0 bg-black z-10">
                <Th col="id"       label="OP_ID"         sortCol={sortCol} dir={sortDir} onSort={handleSort} className="w-[100px]" />
                <Th col="address"  label="ADDRESS"        sortCol={sortCol} dir={sortDir} onSort={handleSort} className="w-[220px]" />
                <Th col="owner"    label="OWNER_INTEL"    sortCol={sortCol} dir={sortDir} onSort={handleSort} className="w-[210px]" />
                <Th col="type"     label="VIOLATION_TYPE" sortCol={sortCol} dir={sortDir} onSort={handleSort} />
                <Th col="severity" label="SEVERITY"       sortCol={sortCol} dir={sortDir} onSort={handleSort} className="w-[110px]" />
                <th className="text-left py-2 px-3 text-[10px] text-zinc-500 tracking-widest w-[130px]">ACTION</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-zinc-600 text-xs tracking-widest">
                    NO_RECORDS_MATCHED // ADJUST_FILTER_PARAMETERS
                  </td>
                </tr>
              ) : (
                visible.map((lead, i) => {
                  const sev      = SEV[lead.severity] ?? SEV[4]
                  const even     = i % 2 === 0
                  const phone    = fmtPhone(lead.owner.phone)
                  const mailing  = mailingLine(lead.owner)
                  const bcpaBadge = BCPA_STATUS_LABEL[lead.bcpa_lookup_status ?? '']

                  return (
                    <tr
                      key={lead.id}
                      className={`border-b border-zinc-900 transition-colors duration-100 ${even ? 'bg-black' : 'bg-[#080808]'} hover:bg-zinc-900/50`}
                    >
                      {/* OP_ID */}
                      <td className="py-3 px-3 align-top">
                        <div className="text-xs font-semibold text-[#F8F8FF] whitespace-nowrap">{lead.id}</div>
                        {lead.case_url ? (
                          <a
                            href={lead.case_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1 text-[9px] text-zinc-600 hover:text-zinc-400 mt-1 transition-colors"
                          >
                            <ExternalLink size={8} strokeWidth={1.5} />
                            <span>PORTAL</span>
                          </a>
                        ) : (
                          <div className="text-[9px] text-zinc-800 mt-1">{lead.case_number}</div>
                        )}
                      </td>

                      {/* ADDRESS */}
                      <td className="py-3 px-3 align-top">
                        <div className="text-[11px] text-zinc-300 leading-snug">{lead.address}</div>
                        <div className="text-[9px] text-zinc-600 tracking-widest mt-0.5">{lead.city}</div>
                        {lead.parcel_id && (
                          <div className="text-[9px] text-zinc-700 mt-0.5">PCL: {lead.parcel_id}</div>
                        )}
                        {bcpaBadge && (
                          <div className="text-[8px] text-amber-700 tracking-widest mt-1">[{bcpaBadge}]</div>
                        )}
                      </td>

                      {/* OWNER_INTEL */}
                      <td className="py-3 px-3 align-top">
                        <div className="text-[11px] font-medium text-[#F8F8FF] mb-2 leading-snug">
                          {lead.owner.name}
                        </div>
                        {phone && (
                          <a
                            href={`tel:${lead.owner.phone}`}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-[#F8F8FF] transition-colors mb-1.5"
                          >
                            <Phone size={10} strokeWidth={1.5} className="shrink-0" />
                            <span className="tracking-wide">{phone}</span>
                          </a>
                        )}
                        {lead.owner.email && (
                          <a
                            href={`mailto:${lead.owner.email}`}
                            onClick={e => e.stopPropagation()}
                            className="flex items-center gap-1.5 text-[10px] text-zinc-400 hover:text-[#F8F8FF] transition-colors mb-1.5"
                          >
                            <Mail size={10} strokeWidth={1.5} className="shrink-0" />
                            <span className="tracking-wide truncate" style={{ maxWidth: '150px' }}>{lead.owner.email}</span>
                          </a>
                        )}
                        {mailing && (
                          <div className="flex items-start gap-1.5 text-[9px] text-zinc-600 mt-1">
                            <MapPin size={9} strokeWidth={1.5} className="shrink-0 mt-px" />
                            <span className="leading-snug">{mailing}</span>
                          </div>
                        )}
                        {!phone && !lead.owner.email && !mailing && (
                          <div className="text-[9px] text-zinc-700 tracking-widest">NO_CONTACT_DATA</div>
                        )}
                      </td>

                      {/* VIOLATION TYPE */}
                      <td className="py-3 px-3 align-top">
                        <div className="text-[10px] text-zinc-400 whitespace-nowrap tracking-wide">{lead.type}</div>
                        {lead.description && lead.description !== lead.type && (
                          <div className="text-[9px] text-zinc-700 mt-1 leading-snug max-w-[180px]">{lead.description}</div>
                        )}
                        <div className="text-[9px] text-zinc-700 mt-1">{lead.timestamp}</div>
                      </td>

                      {/* SEVERITY */}
                      <td className="py-3 px-3 align-top whitespace-nowrap">
                        <div className="text-[11px] font-mono tracking-wider" style={{ color: sev.color }}>
                          {sev.label}
                        </div>
                        <div className="text-[9px] tracking-widest mt-0.5" style={{ color: sev.color, opacity: 0.65 }}>
                          {sev.tag}
                        </div>
                        <div className="text-[9px] text-zinc-700 mt-1 tracking-widest">{lead.status}</div>
                      </td>

                      {/* ACTION */}
                      <td className="py-3 px-3 align-top">
                        <GhlButton id={lead.id} synced={synced} onSync={handleSync} />
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      <HRule />

      {/* TERMINAL SEARCH */}
      <div
        className="flex items-center gap-2 px-4 sm:px-6 py-3"
        onClick={e => { e.stopPropagation(); inputRef.current?.focus() }}
      >
        <span className="text-zinc-500 text-[11px] whitespace-nowrap shrink-0">USER@LINAN_GP:~$</span>
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={e => { setQuery(e.target.value); setHistIdx(-1) }}
          onKeyDown={handleKeyDown}
          placeholder="Search by address, owner, case number, parcel ID, or violation type..."
          className="flex-1 bg-transparent border-none outline-none text-[11px] placeholder-zinc-700 caret-[#F8F8FF]"
          style={{ fontFamily: 'inherit', color: '#F8F8FF' }}
          autoFocus
          spellCheck={false}
          autoComplete="off"
        />
        <span
          className="text-[#F8F8FF] text-xs select-none"
          style={{ animation: 'blink 1.2s step-end infinite' }}
        >_</span>
        {query && (
          <button
            onClick={e => { e.stopPropagation(); setQuery(''); setHistIdx(-1); inputRef.current?.focus() }}
            className="text-zinc-600 hover:text-[#F8F8FF] text-[10px] transition-colors shrink-0 ml-1"
            style={{ fontFamily: 'inherit' }}
          >
            [CLR]
          </button>
        )}
      </div>

      {/* FOOTER */}
      <div className="px-4 sm:px-6 py-2 flex items-center justify-between border-t border-zinc-900">
        <span className="text-zinc-700 text-[10px] tracking-widest">CLASSIFICATION: PROPRIETARY // NAZCA_OPS</span>
        <span className="text-zinc-700 text-[10px]">v3.0.0 / 2026</span>
      </div>
    </div>
  )
}
