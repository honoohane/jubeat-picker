import { useState, useMemo, useRef, useEffect } from 'react'
import './App.css'
import { allJubeatSongs } from './data/songs'
import { titleToId, titleToVersion } from './data/jacketMapping'

// 版本列表（显示顺序）
const ALL_VERSIONS = [
  'jubeat',
  'jubeat ripples',
  'jubeat ripples APPEND',
  'jubeat knit',
  'jubeat knit APPEND',
  'jubeat copious',
  'jubeat copious APPEND',
  'jubeat saucer',
  'jubeat saucer fulfill',
  'jubeat prop',
  'jubeat Qubell',
  'jubeat clan',
  'jubeat festo',
  'jubeat Ave.',
  'jubeat beyond the Ave.',
]

// 版本显示名称
const getVersionDisplay = (version) => {
  if (version === 'jubeat') return '無印'
  return version.replace(/^jubeat /, '')
}

// Normalize title for matching: handle full-width/half-width, accents, spaces, case
const normalizeTitle = (str) => {
  return str
    .replace(/\[2\]$/, '')           // Remove [2] suffix
    .trim()                           // Remove leading/trailing whitespace
    // Full-width to half-width conversion
    .replace(/？/g, '?')
    .replace(/！/g, '!')
    .replace(/＠/g, '@')
    .replace(/＃/g, '#')
    .replace(/＄/g, '$')
    .replace(/％/g, '%')
    .replace(/＆/g, '&')
    .replace(/（/g, '(')
    .replace(/）/g, ')')
    .replace(/［/g, '[')
    .replace(/］/g, ']')
    .replace(/｛/g, '{')
    .replace(/｝/g, '}')
    .replace(/：/g, ':')
    .replace(/；/g, ';')
    .replace(/＂/g, '"')
    .replace(/＇/g, "'")
    .replace(/，/g, ',')
    .replace(/．/g, '.')
    .replace(/／/g, '/')
    .replace(/～/g, '~')
    .replace(/－/g, '-')
    .replace(/＋/g, '+')
    .replace(/＝/g, '=')
    .replace(/＿/g, '_')
    .replace(/｜/g, '|')
    .replace(/＜/g, '<')
    .replace(/＞/g, '>')
    // Curly quotes to straight quotes
    .replace(/[""„‟]/g, '"')
    .replace(/[''‚‛]/g, "'")
    // Remove accents (é→e, etc.)
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    // Normalize spaces around symbols
    .replace(/\s*《/g, '《')
    .replace(/》\s*/g, '》')
    .replace(/\s*-\s*/g, '-')         // Normalize hyphens
    .replace(/\s+/g, ' ')             // Multiple spaces to single
    .toLowerCase()                     // Case insensitive
}

// Build normalized lookup table (both exact and prefix keys)
const normalizedMapping = {}
const prefixMapping = []
Object.entries(titleToId).forEach(([title, id]) => {
  const normalized = normalizeTitle(title)
  normalizedMapping[normalized] = id
  // Store prefix for partial matching (for incomplete xlsx data)
  if (normalized.length >= 4) {
    prefixMapping.push({ prefix: normalized, id })
  }
})

// Helper to find jacket ID with normalized matching
const findJacketId = (title) => {
  const normalized = normalizeTitle(title)
  // Exact match first
  if (normalizedMapping[normalized]) {
    return normalizedMapping[normalized]
  }
  // Partial match: if song title starts with a mapping key (xlsx data incomplete)
  for (const { prefix, id } of prefixMapping) {
    if (normalized.startsWith(prefix) && prefix.length >= 4) {
      return id
    }
  }
  return null
}

// Helper to get song version
const getSongVersion = (title) => {
  // 直接用完整标题查找（含[2]），因为版本映射已按完整标题生成
  return titleToVersion[title] || 'jubeat beyond the Ave.'
}

function App() {
  const [minLevelInput, setMinLevelInput] = useState('10.0')
  const [maxLevelInput, setMaxLevelInput] = useState('10.9')
  const [countInput, setCountInput] = useState('10')
  const [selectedSongs, setSelectedSongs] = useState([])
  const [error, setError] = useState('')
  const [selectedDifficulties, setSelectedDifficulties] = useState(['BSC', 'ADV', 'EXT'])
  const [selectedCharts, setSelectedCharts] = useState([1, 2])
  const [selectedVersions, setSelectedVersions] = useState([...ALL_VERSIONS])
  const [versionDropdownOpen, setVersionDropdownOpen] = useState(false)
  const versionDropdownRef = useRef(null)

  // 点击外部关闭下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (versionDropdownRef.current && !versionDropdownRef.current.contains(event.target)) {
        setVersionDropdownOpen(false)
      }
    }
    if (versionDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [versionDropdownOpen])

  // Toggle difficulty selection
  const toggleDifficulty = (diff) => {
    setSelectedDifficulties(prev => {
      if (prev.includes(diff)) {
        // Don't allow deselecting all
        if (prev.length === 1) return prev
        return prev.filter(d => d !== diff)
      } else {
        return [...prev, diff]
      }
    })
  }

  // Toggle chart selection
  const toggleChart = (chart) => {
    setSelectedCharts(prev => {
      if (prev.includes(chart)) {
        // Don't allow deselecting all
        if (prev.length === 1) return prev
        return prev.filter(c => c !== chart)
      } else {
        return [...prev, chart]
      }
    })
  }

  // Toggle version selection
  const toggleVersion = (version) => {
    setSelectedVersions(prev => {
      if (prev.includes(version)) {
        // 允许全部取消选择
        return prev.filter(v => v !== version)
      } else {
        return [...prev, version]
      }
    })
  }

  // Select/Deselect all versions
  const toggleAllVersions = () => {
    if (selectedVersions.length === ALL_VERSIONS.length) {
      // 真正的全取消
      setSelectedVersions([])
    } else {
      setSelectedVersions([...ALL_VERSIONS])
    }
  }

  // Format level: always show decimal for 9+, integer for 1-8
  const formatLevel = (num) => {
    if (num >= 9) {
      return num.toFixed(1)
    }
    return Math.floor(num).toString()
  }

  // Smart step: 9+ uses 0.1, 1-8 uses 1
  const stepUp = (current) => {
    const num = parseFloat(current)
    if (isNaN(num)) return '10.0'
    if (num >= 10.9) return '10.9'
    if (num >= 9) {
      // 9+ range: step 0.1
      const next = Math.round((num + 0.1) * 10) / 10
      return next > 10.9 ? '10.9' : formatLevel(next)
    } else if (num >= 8) {
      // At 8, jump to 9.0
      return '9.0'
    } else {
      // 1-7: step 1
      return formatLevel(Math.min(num + 1, 8))
    }
  }

  const stepDown = (current) => {
    const num = parseFloat(current)
    if (isNaN(num)) return '10.0'
    if (num <= 1) return '1'
    if (num > 9) {
      // 9.1-10.9: step 0.1
      const next = Math.round((num - 0.1) * 10) / 10
      return formatLevel(next)
    } else if (num >= 9) {
      // At 9.0, jump to 8
      return '8'
    } else {
      // 2-8: step 1
      return formatLevel(Math.max(num - 1, 1))
    }
  }

  // Handle keyboard arrows for level inputs
  const handleLevelKeyDown = (e, currentValue, setter) => {
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setter(stepUp(currentValue))
    } else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setter(stepDown(currentValue))
    }
  }

  // Handle direct input
  const handleLevelInput = (e, setter) => {
    const value = e.target.value
    setter(value)
  }

  // Validate level for filtering
  const parseLevel = (value) => {
    const num = parseFloat(value)
    if (isNaN(num)) return null
    if (num < 1 || num > 10.9) return null
    // 1-8 must be integers
    if (num < 9 && num % 1 !== 0) return null
    return num
  }

  // Parse input values
  const minLevel = parseLevel(minLevelInput) || 10
  const maxLevel = parseLevel(maxLevelInput) || 10.9
  const count = parseInt(countInput) || 10

  // Check for input errors
  const getInputError = () => {
    const minNum = parseFloat(minLevelInput)
    const maxNum = parseFloat(maxLevelInput)
    if (minLevelInput && minNum < 9 && minNum % 1 !== 0) {
      return '1-8级只能输入整数'
    }
    if (maxLevelInput && maxNum < 9 && maxNum % 1 !== 0) {
      return '1-8级只能输入整数'
    }
    return ''
  }
  const inputError = getInputError()

  // Filter songs based on level range, difficulty, chart version, and game version
  const availableSongs = useMemo(() => {
    return allJubeatSongs.filter(
      song => song.level >= minLevel && 
              song.level <= maxLevel && 
              selectedDifficulties.includes(song.difficulty) && 
              selectedCharts.includes(song.chart) &&
              selectedVersions.includes(getSongVersion(song.title))
    )
  }, [minLevel, maxLevel, selectedDifficulties, selectedCharts, selectedVersions])

  // Pick random songs
  const pickSongs = () => {
    setError('')
    
    if (availableSongs.length === 0) {
      setError('指定难度范围内没有歌曲')
      setSelectedSongs([])
      return
    }

    // Fisher-Yates shuffle algorithm
    const shuffled = [...availableSongs]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Take first 'count' songs (or all if count > available)
    const actualCount = Math.min(count, availableSongs.length)
    const picked = shuffled.slice(0, actualCount)
    
    // Sort by level descending
    picked.sort((a, b) => b.level - a.level)
    
    setSelectedSongs(picked)
  }

  // Get difficulty class for coloring
  const getDifficultyClass = (difficulty) => {
    return `difficulty-${difficulty.toLowerCase()}`
  }

  // Get level class for coloring
  const getLevelClass = (level) => {
    if (level < 9) {
      return 'level-easy'
    }
    const levelNum = Math.floor(level * 10) / 10
    return `level-${levelNum.toFixed(1).replace('.', '-')}`
  }

  return (
    <div className="app-container">
      <h1>🎮 Jubeat Song Picker</h1>
      <p className="subtitle">全曲随机选曲工具</p>

      <div className="control-panel">
        <div className="input-group">
          <div className="input-item">
            <label htmlFor="minLevel">下限 (Min Level)</label>
            <div className="level-input-wrapper">
              <button 
                type="button" 
                className="step-btn" 
                onClick={() => setMinLevelInput(stepDown(minLevelInput))}
              >−</button>
              <input
                type="text"
                id="minLevel"
                value={minLevelInput}
                onChange={(e) => handleLevelInput(e, setMinLevelInput)}
                onKeyDown={(e) => handleLevelKeyDown(e, minLevelInput, setMinLevelInput)}
              />
              <button 
                type="button" 
                className="step-btn" 
                onClick={() => setMinLevelInput(stepUp(minLevelInput))}
              >+</button>
            </div>
          </div>
          <div className="input-item">
            <label htmlFor="maxLevel">上限 (Max Level)</label>
            <div className="level-input-wrapper">
              <button 
                type="button" 
                className="step-btn" 
                onClick={() => setMaxLevelInput(stepDown(maxLevelInput))}
              >−</button>
              <input
                type="text"
                id="maxLevel"
                value={maxLevelInput}
                onChange={(e) => handleLevelInput(e, setMaxLevelInput)}
                onKeyDown={(e) => handleLevelKeyDown(e, maxLevelInput, setMaxLevelInput)}
              />
              <button 
                type="button" 
                className="step-btn" 
                onClick={() => setMaxLevelInput(stepUp(maxLevelInput))}
              >+</button>
            </div>
          </div>
          <div className="input-item">
            <label htmlFor="count">数量 (Count)</label>
            <input
              type="number"
              id="count"
              value={countInput}
              onChange={(e) => setCountInput(e.target.value)}
              min="1"
              max="100"
            />
          </div>
        </div>

        <div className="filter-row">
          <div className="difficulty-selector">
            <label className={`difficulty-checkbox ${selectedDifficulties.includes('BSC') ? 'checked' : ''}`}>
              <input
                type="checkbox"
                checked={selectedDifficulties.includes('BSC')}
                onChange={() => toggleDifficulty('BSC')}
              />
              <span className="custom-checkbox checkbox-bsc"></span>
              <span className="difficulty-tag difficulty-bsc">BASIC</span>
            </label>
            <label className={`difficulty-checkbox ${selectedDifficulties.includes('ADV') ? 'checked' : ''}`}>
              <input
                type="checkbox"
                checked={selectedDifficulties.includes('ADV')}
                onChange={() => toggleDifficulty('ADV')}
              />
              <span className="custom-checkbox checkbox-adv"></span>
              <span className="difficulty-tag difficulty-adv">ADVANCED</span>
            </label>
            <label className={`difficulty-checkbox ${selectedDifficulties.includes('EXT') ? 'checked' : ''}`}>
              <input
                type="checkbox"
                checked={selectedDifficulties.includes('EXT')}
                onChange={() => toggleDifficulty('EXT')}
              />
              <span className="custom-checkbox checkbox-ext"></span>
              <span className="difficulty-tag difficulty-ext">EXTREME</span>
            </label>
          </div>

          <div className="chart-selector">
            <label className={`difficulty-checkbox ${selectedCharts.includes(1) ? 'checked' : ''}`}>
              <input
                type="checkbox"
                checked={selectedCharts.includes(1)}
                onChange={() => toggleChart(1)}
              />
              <span className="custom-checkbox checkbox-chart1"></span>
              <span className="chart-tag chart-1">[1]譜面</span>
            </label>
            <label className={`difficulty-checkbox ${selectedCharts.includes(2) ? 'checked' : ''}`}>
              <input
                type="checkbox"
                checked={selectedCharts.includes(2)}
                onChange={() => toggleChart(2)}
              />
              <span className="custom-checkbox checkbox-chart2"></span>
              <span className="chart-tag chart-2">[2]譜面</span>
            </label>
          </div>

          <div className="version-selector" ref={versionDropdownRef}>
            <div 
              className="version-dropdown-trigger"
              onClick={() => setVersionDropdownOpen(!versionDropdownOpen)}
            >
              <span>版本 ({selectedVersions.length}/{ALL_VERSIONS.length})</span>
              <span className="dropdown-arrow">{versionDropdownOpen ? '▲' : '▼'}</span>
            </div>
            {versionDropdownOpen && (
              <div className="version-dropdown">
                <div className="version-option version-all" onClick={toggleAllVersions}>
                  <input
                    type="checkbox"
                    checked={selectedVersions.length === ALL_VERSIONS.length}
                    readOnly
                  />
                  <span>{selectedVersions.length === ALL_VERSIONS.length ? '取消全选' : '全选'}</span>
                </div>
                {ALL_VERSIONS.map(version => (
                  <div key={version} className="version-option" onClick={() => toggleVersion(version)}>
                    <input
                      type="checkbox"
                      checked={selectedVersions.includes(version)}
                      readOnly
                    />
                    <span>{getVersionDisplay(version)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button className="goge-button" onClick={pickSongs}>
          🎲 GOGE!
        </button>

        <div className="stats">
          可选曲数: {availableSongs.length} / {allJubeatSongs.length} 首
        </div>

        {inputError && <div className="error-message">{inputError}</div>}
        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="song-list">
        {selectedSongs.length > 0 ? (
          <>
            <h2>🎵 选曲结果 ({selectedSongs.length}首)</h2>
            <div className="songs-container">
              {selectedSongs.map((song, index) => (
                <div 
                  key={`${song.title}-${song.difficulty}-${song.chart}-${index}`} 
                  className="song-card"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="song-info">
                    <span className="song-number">{index + 1}</span>
                    <img 
                      src={findJacketId(song.title) 
                        ? `/jackets/${findJacketId(song.title)}.webp` 
                        : '/jackets/unknown.webp'}
                      alt="jacket"
                      className="song-jacket"
                      onError={(e) => { e.target.src = '/jackets/unknown.webp' }}
                    />
                    <div className="song-details">
                      <span className="song-title">{song.title}</span>
                      <span className="song-artist">{song.artist}</span>
                    </div>
                  </div>
                  <div className="song-right">
                    <span className={`song-difficulty ${getDifficultyClass(song.difficulty)}`}>
                      {song.difficulty}
                    </span>
                    <span className={`song-level ${getLevelClass(song.level)}`}>Lv.{song.level >= 9 ? song.level.toFixed(1) : song.level}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="empty-state">
            <div className="icon">🎵</div>
            <p>按下GOGE按钮开始选曲！</p>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
