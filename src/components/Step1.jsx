import { useState, useCallback, useEffect } from 'react'
import { ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, LineChart, ComposedChart, Legend } from 'recharts'
import './Step1.css'

// Custom Tooltip Content for accurate regression line values
const CustomTooltip = ({ active, payload, label, m, n, xLabel, yLabel }) => {
  if (!active) return null
  
  // Get x coordinate (concentration/uM) - label should be the x value
  const concentration = label !== null && label !== undefined && typeof label === 'number' ? label : null
  
  // Find scatter data point if hovering over one
  const scatterPayload = payload?.find(p => p.name === 'Data Points')
  
  // Always calculate regression line value if we have x coordinate
  // Since concentration = m * brRatio + n, we have brRatio = (concentration - n) / m
  const regressionValue = concentration !== null && m !== 0 ? (concentration - n) / m : null
  
  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.95)',
      border: '1px solid #ccc',
      borderRadius: '4px',
      padding: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
    }}>
      {concentration !== null && (
        <p style={{ margin: '0 0 4px 0', fontWeight: 'bold' }}>
          {xLabel}: {concentration.toFixed(2)}
        </p>
      )}
      {scatterPayload && scatterPayload.payload && (
        <p style={{ margin: '4px 0', color: '#8884d8' }}>
          Data Point: {scatterPayload.payload.brRatio?.toFixed(4) || 'N/A'}
        </p>
      )}
      {regressionValue !== null && (
        <p style={{ margin: '4px 0', color: '#ff7300' }}>
          Regression Line: {regressionValue.toFixed(4)}
        </p>
      )}
    </div>
  )
}

function Step1({ 
  data: propData, 
  m: propM, 
  n: propN, 
  xLabel: propXLabel, 
  yLabel: propYLabel,
  onDataChange,
  onMChange,
  onNChange,
  onXLabelChange,
  onYLabelChange
}) {
  const [data, setData] = useState(propData || null)
  const [m, setM] = useState(propM || 0)
  const [n, setN] = useState(propN || 0)
  const [xLabel, setXLabel] = useState(propXLabel || 'Concentration(μM)')
  const [yLabel, setYLabel] = useState(propYLabel || 'B/R ratio')
  const [fileError, setFileError] = useState(null)

  // Sync local state with props when they change from parent
  useEffect(() => {
    if (propData !== null && propData !== data) setData(propData)
    if (propM !== m) setM(propM)
    if (propN !== n) setN(propN)
    if (propXLabel !== xLabel) setXLabel(propXLabel)
    if (propYLabel !== yLabel) setYLabel(propYLabel)
  }, [propData, propM, propN, propXLabel, propYLabel])

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
    if (onDataChange) onDataChange(tuples)
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
    // Update parent immediately after regression
    if (onMChange) onMChange(calculatedM)
    if (onNChange) onNChange(calculatedN)
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type === 'application/json') {
      parseJSONFile(file)
    } else {
      setFileError('Please select a valid JSON file')
    }
  }

  // Generate points for the regression line
  const getRegressionLine = () => {
    if (!data || data.length === 0) return []
    
    const minConc = Math.min(...data.map(d => d.concentration))
    const maxConc = Math.max(...data.map(d => d.concentration))
    const padding = (maxConc - minConc) * 0.1 || 0.1
    
    const xStart = Math.max(0, minConc - padding)
    const xEnd = maxConc + padding
    
    // Generate multiple points along the regression line for accurate tooltips
    // Using 100 points for smooth interpolation
    // Since concentration = m * brRatio + n, we have brRatio = (concentration - n) / m
    const numPoints = 100
    const points = []
    
    for (let i = 0; i <= numPoints; i++) {
      const concentration = xStart + (xEnd - xStart) * (i / numPoints)
      const brRatio = m !== 0 ? (concentration - n) / m : 0
      points.push({ concentration, brRatio })
    }
    
    return points
  }

  const chartData = data ? data.map(d => ({
    x: d.concentration,
    y: d.brRatio,
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
                  onChange={(e) => {
                    const newM = Number(e.target.value)
                    setM(newM)
                    if (onMChange) onMChange(newM)
                  }}
                  step="any"
                />
              </label>
              <label>
                Intercept (n):
                <input
                  type="number"
                  value={n}
                  onChange={(e) => {
                    const newN = Number(e.target.value)
                    setN(newN)
                    if (onNChange) onNChange(newN)
                  }}
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
                  onChange={(e) => {
                    const newLabel = e.target.value
                    setXLabel(newLabel)
                    if (onXLabelChange) onXLabelChange(newLabel)
                  }}
                />
              </label>
              <label>
                Y-axis label:
                <input
                  type="text"
                  value={yLabel}
                  onChange={(e) => {
                    const newLabel = e.target.value
                    setYLabel(newLabel)
                    if (onYLabelChange) onYLabelChange(newLabel)
                  }}
                />
              </label>
            </div>
            <div className="chart-container">
              <ResponsiveContainer width="100%" height={400}>
                <ComposedChart margin={{ top: 60, right: 20, bottom: 40, left: 40 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="concentration"
                    name="Concentration"
                    domain={['auto', 'auto']}
                    label={{ value: xLabel, position: 'insideBottom', offset: -5 }}
                  />
                  <YAxis
                    type="number"
                    dataKey="brRatio"
                    name="B/R ratio"
                    domain={['auto', 'auto']}
                    label={{ value: yLabel, angle: -90, position: 'insideLeft' }}
                  />
                  <Tooltip
                    cursor={{ strokeDasharray: '3 3' }}
                    content={<CustomTooltip m={m} n={n} xLabel={xLabel} yLabel={yLabel} />}
                  />
                  <Scatter
                    name="Data Points"
                    data={chartData}
                    fill="#8884d8"
                  />
                  <Line
                    type="linear"
                    dataKey="brRatio"
                    stroke="#ff7300"
                    strokeWidth={2}
                    dot={false}
                    activeDot={false}
                    name="Regression Line"
                    data={regressionLine}
                    isAnimationActive={false}
                    connectNulls
                  />
                  <Legend />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default Step1

