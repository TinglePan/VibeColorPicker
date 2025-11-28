import { useState, useCallback } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart, ComposedChart, Legend } from 'recharts'
import './Step1.css'

function Step1({ onComplete }) {
  const [data, setData] = useState(null)
  const [m, setM] = useState(0)
  const [n, setN] = useState(0)
  const [xLabel, setXLabel] = useState('Concentration(μM)')
  const [yLabel, setYLabel] = useState('B/R ratio')
  const [fileError, setFileError] = useState(null)

  const parseJSONFile = useCallback((file) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json = JSON.parse(e.target.result)
        processData(json)
        setFileError(null)
      } catch (error) {
        setFileError('Invalid JSON file: ' + error.message)
      }
    }
    reader.readAsText(file)
  }, [])

  const processData = (jsonData) => {
    // Expecting array of [COLOR, Concentration] entries
    // COLOR is [R, G, B] array
    const tuples = []
    
    if (!Array.isArray(jsonData)) {
      setFileError('JSON must be an array of entries')
      return
    }

    jsonData.forEach((entry, index) => {
      if (!Array.isArray(entry) || entry.length !== 2) {
        setFileError(`Entry ${index} is not in format [COLOR, Concentration]`)
        return
      }

      const [color, concentration] = entry
      
      if (!Array.isArray(color) || color.length !== 3) {
        setFileError(`Entry ${index}: COLOR must be [R, G, B] array`)
        return
      }

      const [r, g, b] = color.map(Number)
      
      if (isNaN(r) || isNaN(g) || isNaN(b) || 
          r < 0 || r > 255 || g < 0 || g > 255 || b < 0 || b > 255) {
        setFileError(`Entry ${index}: RGB values must be between 0 and 255`)
        return
      }

      const concentrationNum = Number(concentration)
      if (isNaN(concentrationNum) || concentrationNum < 0) {
        setFileError(`Entry ${index}: Concentration must be a non-negative number`)
        return
      }

      // Calculate B/R ratio
      const brRatio = b > 0 ? b / r : 0
      tuples.push({ concentration: concentrationNum, brRatio, originalEntry: entry })
    })

    if (tuples.length === 0) {
      setFileError('No valid data entries found')
      return
    }

    setData(tuples)
    performRegression(tuples)
  }

  const performRegression = (tuples) => {
    // Linear regression: y = mx + n
    // x = B/R ratio, y = Concentration
    const n = tuples.length
    let sumX = 0
    let sumY = 0
    let sumXY = 0
    let sumXX = 0

    tuples.forEach(({ brRatio, concentration }) => {
      sumX += brRatio
      sumY += concentration
      sumXY += brRatio * concentration
      sumXX += brRatio * brRatio
    })

    const meanX = sumX / n
    const meanY = sumY / n

    // Calculate slope (m) and intercept (n)
    const denominator = sumXX - n * meanX * meanX
    const calculatedM = denominator !== 0 ? (sumXY - n * meanX * meanY) / denominator : 0
    const calculatedN = meanY - calculatedM * meanX

    setM(calculatedM)
    setN(calculatedN)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type === 'application/json') {
      parseJSONFile(file)
    } else {
      setFileError('Please select a valid JSON file')
    }
  }

  const handleContinue = () => {
    if (data && m !== null && n !== null) {
      onComplete({
        m,
        n,
        xLabel,
        yLabel,
        dataPoints: data
      })
    }
  }

  // Generate points for the regression line
  const getRegressionLine = () => {
    if (!data || data.length === 0) return []
    
    const minBr = Math.min(...data.map(d => d.brRatio))
    const maxBr = Math.max(...data.map(d => d.brRatio))
    const padding = (maxBr - minBr) * 0.1 || 0.1
    
    const x1 = Math.max(0, minBr - padding)
    const x2 = maxBr + padding
    
    return [
      { concentration: m * x1 + n, brRatio: x1 },
      { concentration: m * x2 + n, brRatio: x2 }
    ]
  }

  const chartData = data ? data.map(d => ({
    x: d.brRatio,
    y: d.concentration,
    brRatio: d.brRatio,
    concentration: d.concentration
  })) : []

  const regressionLine = getRegressionLine()

  return (
    <div className="step1-container">
      <div className="step1-section">
        <h2>Step 1: Upload Calibration Data</h2>
        <div className="file-upload-area">
          <input
            type="file"
            accept="application/json"
            onChange={handleFileChange}
            id="json-upload"
            className="file-input"
          />
          <label htmlFor="json-upload" className="file-label">
            Choose JSON File
          </label>
        </div>
        {fileError && <div className="error-message">{fileError}</div>}
      </div>

      {data && data.length > 0 && (
        <>
          <div className="step1-section">
            <h3>Regression Parameters</h3>
            <div className="input-group">
              <label>
                Slope (m):
                <input
                  type="number"
                  value={m}
                  onChange={(e) => setM(Number(e.target.value))}
                  step="any"
                />
              </label>
              <label>
                Intercept (n):
                <input
                  type="number"
                  value={n}
                  onChange={(e) => setN(Number(e.target.value))}
                  step="any"
                />
              </label>
            </div>
            <div className="function-display">
              <strong>y = {m.toFixed(4)}x + {n.toFixed(4)}</strong>
            </div>
          </div>

          <div className="step1-section">
            <h3>Plot</h3>
            <div className="plot-title">
              <strong>y = {m.toFixed(4)}x + {n.toFixed(4)}</strong>
            </div>
            <div className="label-inputs">
              <label>
                X-axis label:
                <input
                  type="text"
                  value={xLabel}
                  onChange={(e) => setXLabel(e.target.value)}
                />
              </label>
              <label>
                Y-axis label:
                <input
                  type="text"
                  value={yLabel}
                  onChange={(e) => setYLabel(e.target.value)}
                />
              </label>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart margin={{ top: 60, right: 20, bottom: 40, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="brRatio"
                    name="B/R ratio"
                    domain={['auto', 'auto']}
                    label={{ value: xLabel, position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="concentration"
                    name="Concentration"
                    domain={['auto', 'auto']}
                    label={{ value: yLabel, angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    formatter={(value, name) => {
                      if (name === 'brRatio') return [value.toFixed(4), 'B/R ratio']
                      if (name === 'concentration') return [value.toFixed(2), 'Concentration']
                      return [value, name]
                    }}
                  />
                  <Scatter
                    name="Data Points"
                    data={chartData}
                    fill="#8884d8"
                  />
                  <Line
                    type="monotone"
                    dataKey="concentration"
                    stroke="#ff7300"
                    strokeWidth={2}
                    dot={false}
                    name="Regression Line"
                    data={regressionLine}
                    isAnimationActive={false}
                  />
                  <Legend />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="step1-section">
            <button onClick={handleContinue} className="continue-btn">
              Continue to Step 2
            </button>
          </div>
        </>
      )}
    </div>
  )
}

export default Step1

