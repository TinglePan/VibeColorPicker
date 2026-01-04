import { useState, useEffect } from 'react'
import './Step3.css'

function Step3() {
  const [savedData, setSavedData] = useState([])
  const [message, setMessage] = useState(null)
  const [currentPage, setCurrentPage] = useState(1)
  const entriesPerPage = 10

  // Load data from localStorage on mount
  useEffect(() => {
    loadData()
  }, [])

  const loadData = () => {
    const dataJson = localStorage.getItem('vibeColorPickerData')
    if (dataJson) {
      try {
        const data = JSON.parse(dataJson)
        if (Array.isArray(data)) {
          setSavedData(data)
          setCurrentPage(1) // Reset to first page when data loads
        } else {
          setSavedData([])
        }
      } catch (e) {
        console.error('Error loading data:', e)
        setSavedData([])
      }
    } else {
      setSavedData([])
    }
  }

  const handleExport = () => {
    if (savedData.length === 0) {
      setMessage('No data to export. Please save some data points in Step 2 first.')
      setTimeout(() => setMessage(null), 3000)
      return
    }

    try {
      // Create JSON blob
      const jsonString = JSON.stringify(savedData, null, 2)
      const blob = new Blob([jsonString], { type: 'application/json' })
      
      // Create download link
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `vibe-color-picker-data-${new Date().toISOString().split('T')[0]}.json`
      
      // Trigger download
      document.body.appendChild(link)
      link.click()
      
      // Cleanup
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      setMessage('Data exported successfully!')
      setTimeout(() => setMessage(null), 3000)
    } catch (e) {
      console.error('Error exporting data:', e)
      setMessage('Error exporting data. Please try again.')
      setTimeout(() => setMessage(null), 3000)
    }
  }

  const handleClearData = () => {
    if (window.confirm('Are you sure you want to clear all saved data? This action cannot be undone.')) {
      try {
        localStorage.removeItem('vibeColorPickerData')
        setSavedData([])
        setMessage('All data cleared successfully.')
        setTimeout(() => setMessage(null), 3000)
      } catch (e) {
        console.error('Error clearing data:', e)
        setMessage('Error clearing data. Please try again.')
        setTimeout(() => setMessage(null), 3000)
      }
    }
  }

  const handleRefresh = () => {
    loadData()
    setMessage('Data refreshed!')
    setTimeout(() => setMessage(null), 2000)
  }

  const handleDeleteEntry = (index) => {
    if (window.confirm(`Are you sure you want to delete entry #${index + 1}?`)) {
      try {
        const newData = savedData.filter((_, i) => i !== index)
        localStorage.setItem('vibeColorPickerData', JSON.stringify(newData))
        setSavedData(newData)
        
        // Adjust current page if needed
        const totalPages = Math.ceil(newData.length / entriesPerPage)
        if (currentPage > totalPages && totalPages > 0) {
          setCurrentPage(totalPages)
        }
        
        setMessage('Entry deleted successfully.')
        setTimeout(() => setMessage(null), 3000)
      } catch (e) {
        console.error('Error deleting entry:', e)
        setMessage('Error deleting entry. Please try again.')
        setTimeout(() => setMessage(null), 3000)
      }
    }
  }

  // Calculate pagination
  const totalPages = Math.ceil(savedData.length / entriesPerPage)
  const startIndex = (currentPage - 1) * entriesPerPage
  const endIndex = startIndex + entriesPerPage
  const currentEntries = savedData.slice(startIndex, endIndex)

  const goToPage = (page) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)))
  }

  return (
    <div className="step3-container">
      <div className="step3-section">
        <h2>Step 3: Export Saved Data</h2>
        <p className="description">
          Export your saved color measurements to a JSON file. The exported data will be in the same format as the calibration input in Step 1.
        </p>
      </div>

      <div className="step3-section">
        <h3>Saved Data Points</h3>
        {savedData.length > 0 ? (
          <>
            <div className="data-summary">
              <p><strong>Total entries:</strong> {savedData.length}</p>
              {totalPages > 1 && (
                <p><strong>Page:</strong> {currentPage} of {totalPages}</p>
              )}
            </div>
            
            <div className="data-entries">
              {currentEntries.map((entry, index) => {
                const actualIndex = startIndex + index
                const [color, concentration] = entry
                const [r, g, b] = color
                const brRatio = r > 0 ? (b / r).toFixed(4) : '0.0000'
                
                return (
                  <div key={actualIndex} className="data-entry-card">
                    <div className="entry-header">
                      <span className="entry-number">Entry #{actualIndex + 1}</span>
                      <button 
                        onClick={() => handleDeleteEntry(actualIndex)}
                        className="delete-entry-btn"
                        title="Delete this entry"
                      >
                        ×
                      </button>
                    </div>
                    <div className="entry-content">
                      <div className="entry-item">
                        <label>Color:</label>
                        <div className="color-info">
                          <div 
                            className="color-swatch-small"
                            style={{ backgroundColor: `rgb(${r}, ${g}, ${b})` }}
                          />
                          <span className="rgb-values">RGB({r}, {g}, {b})</span>
                        </div>
                      </div>
                      <div className="entry-item">
                        <label>B/R Ratio:</label>
                        <span className="entry-value">{brRatio}</span>
                      </div>
                      <div className="entry-item">
                        <label>Concentration:</label>
                        <span className="entry-value highlight">{concentration.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            {totalPages > 1 && (
              <div className="pagination">
                <button 
                  onClick={() => goToPage(1)}
                  disabled={currentPage === 1}
                  className="page-btn"
                >
                  « First
                </button>
                <button 
                  onClick={() => goToPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="page-btn"
                >
                  ‹ Prev
                </button>
                <span className="page-info">
                  Page {currentPage} of {totalPages}
                </span>
                <button 
                  onClick={() => goToPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="page-btn"
                >
                  Next ›
                </button>
                <button 
                  onClick={() => goToPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="page-btn"
                >
                  Last »
                </button>
              </div>
            )}

            <div className="button-group">
              <button onClick={handleExport} className="export-btn">
                Export to JSON File
              </button>
              <button onClick={handleRefresh} className="refresh-btn">
                Refresh
              </button>
              <button onClick={handleClearData} className="clear-btn">
                Clear All Data
              </button>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <p>No saved data points yet.</p>
            <p className="hint">Go to Step 2 and save some color measurements to export them here.</p>
            <button onClick={handleRefresh} className="refresh-btn">
              Refresh
            </button>
          </div>
        )}
        {message && <div className="message">{message}</div>}
      </div>

      <div className="step3-section info-box">
        <h3>Data Format</h3>
        <p>The exported JSON file will have the following format:</p>
        <pre className="format-example">
{`[
  [[R, G, B], Concentration],
  [[R, G, B], Concentration],
  ...
]`}
        </pre>
        <p className="hint">
          This format is compatible with Step 1's calibration data input, allowing you to use your measurements for future calibrations.
        </p>
      </div>
    </div>
  )
}

export default Step3

