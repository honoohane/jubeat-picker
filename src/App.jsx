import { useState, useMemo } from 'react'
import './App.css'
import { allSongs } from './data/songs'

function App() {
  const [minLevel, setMinLevel] = useState(9.0)
  const [maxLevel, setMaxLevel] = useState(10.9)
  const [count, setCount] = useState(10)
  const [selectedSongs, setSelectedSongs] = useState([])
  const [error, setError] = useState('')

  // Filter songs based on level range
  const availableSongs = useMemo(() => {
    return allSongs.filter(
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

  // Get level class for coloring
  const getLevelClass = (level) => {
    const levelNum = Math.floor(level * 10) / 10
    return `level-${levelNum.toFixed(1).replace('.', '-')}`
  }

  return (
    <div className="app-container">
      <h1>🎮 Jubeat Song Picker</h1>
      <p className="subtitle">Lv9-10 随机选曲工具</p>

      <div className="control-panel">
        <div className="input-group">
          <div className="input-item">
            <label htmlFor="minLevel">下限 (Min Level)</label>
            <input
              type="number"
              id="minLevel"
              value={minLevel}
              onChange={(e) => setMinLevel(parseFloat(e.target.value) || 9.0)}
              min="9.0"
              max="10.9"
              step="0.1"
            />
          </div>
          <div className="input-item">
            <label htmlFor="maxLevel">上限 (Max Level)</label>
            <input
              type="number"
              id="maxLevel"
              value={maxLevel}
              onChange={(e) => setMaxLevel(parseFloat(e.target.value) || 10.9)}
              min="9.0"
              max="10.9"
              step="0.1"
            />
          </div>
          <div className="input-item">
            <label htmlFor="count">数量 (Count)</label>
            <input
              type="number"
              id="count"
              value={count}
              onChange={(e) => setCount(parseInt(e.target.value) || 1)}
              min="1"
              max="100"
            />
          </div>
        </div>

        <button className="goge-button" onClick={pickSongs}>
          🎲 GOGE!
        </button>

        <div className="stats">
          可选曲数: {availableSongs.length} / {allSongs.length} 首
        </div>

        {error && <div className="error-message">{error}</div>}
      </div>

      <div className="song-list">
        {selectedSongs.length > 0 ? (
          <>
            <h2>🎵 选曲结果 ({selectedSongs.length}首)</h2>
            <div className="songs-container">
              {selectedSongs.map((song, index) => (
                <div 
                  key={`${song.title}-${index}`} 
                  className="song-card"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <div className="song-info">
                    <span className="song-number">{index + 1}</span>
                    <span className="song-title">{song.title}</span>
                  </div>
                  <span className={`song-level ${getLevelClass(song.level)}`}>
                    Lv.{song.level.toFixed(1)}
                  </span>
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
