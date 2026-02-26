import { useState, useMemo } from 'react'
import './App.css'
import { allJubeatSongs } from './data/songs'

function App() {
  const [minLevelInput, setMinLevelInput] = useState('10.0')
  const [maxLevelInput, setMaxLevelInput] = useState('10.9')
  const [countInput, setCountInput] = useState('10')
  const [selectedSongs, setSelectedSongs] = useState([])
  const [error, setError] = useState('')

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

  // Filter songs based on level range
  const availableSongs = useMemo(() => {
    return allJubeatSongs.filter(
      song => song.level >= minLevel && song.level <= maxLevel
    )
  }, [minLevel, maxLevel])

  // Pick random songs
  const pickSongs = () => {
    setError('')
    
    if (availableSongs.length === 0) {
      setError('指定难度范围内没有歌曲')
      setSelectedSongs([])
      return
    }

    if (count > availableSongs.length) {
      setError(`指定范围内只有${availableSongs.length}首歌曲，请调整数量。`)
      setSelectedSongs([])
      return
    }

    // Fisher-Yates shuffle algorithm
    const shuffled = [...availableSongs]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }

    // Take first 'count' songs
    const picked = shuffled.slice(0, count)
    
    // Sort by level descending
    picked.sort((a, b) => b.level - a.level)
    
    setSelectedSongs(picked)
  }

  // Get difficulty class for coloring
  const getDifficultyClass = (difficulty) => {
    return `difficulty-${difficulty.toLowerCase()}`
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
                  key={`${song.title}-${song.difficulty}-${index}`} 
                  className="song-card"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="song-info">
                    <span className="song-number">{index + 1}</span>
                    <div className="song-details">
                      <span className="song-title">{song.title}</span>
                      <span className="song-artist">{song.artist}</span>
                    </div>
                  </div>
                  <div className="song-right">
                    <span className={`song-difficulty ${getDifficultyClass(song.difficulty)}`}>
                      {song.difficulty}
                    </span>
                    <span className="song-level">Lv.{song.level % 1 === 0 ? song.level : song.level.toFixed(1)}</span>
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
