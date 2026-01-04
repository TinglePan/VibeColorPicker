import { useState, useEffect } from 'react'
import Step1 from './components/Step1'
import Step2 from './components/Step2'
import Step3 from './components/Step3'
import './App.css'

function App() {
  const [step, setStep] = useState(1)
  
  // Step 1 state
  const [step1Data, setStep1Data] = useState(null)
  const [step1M, setStep1M] = useState(0)
  const [step1N, setStep1N] = useState(0)
  const [step1XLabel, setStep1XLabel] = useState('Concentration(μM)')
  const [step1YLabel, setStep1YLabel] = useState('B/R ratio')
  
  // Step 2 state
  const [step2ImageUrl, setStep2ImageUrl] = useState(null)
  const [step2Image, setStep2Image] = useState(null)
  const [step2Radius, setStep2Radius] = useState(10)

  // Load cached data on mount
  useEffect(() => {
    loadCachedData()
  }, [])

  // Save Step 1 data to localStorage whenever it changes
  useEffect(() => {
    if (step1Data && step1Data.length > 0) {
      const calibrationData = {
        data: step1Data,
        m: step1M,
        n: step1N,
        xLabel: step1XLabel,
        yLabel: step1YLabel,
        timestamp: Date.now()
      }
      localStorage.setItem('vibeColorPickerCalibration', JSON.stringify(calibrationData))
      
      // Create a hash/ID for this calibration to track if it changes
      const calibrationId = generateCalibrationId(step1Data)
      localStorage.setItem('vibeColorPickerCalibrationId', calibrationId)
    }
  }, [step1Data, step1M, step1N, step1XLabel, step1YLabel])

  const loadCachedData = () => {
    try {
      // Load calibration data
      const cachedCalibration = localStorage.getItem('vibeColorPickerCalibration')
      if (cachedCalibration) {
        const calibrationData = JSON.parse(cachedCalibration)
        setStep1Data(calibrationData.data)
        setStep1M(calibrationData.m)
        setStep1N(calibrationData.n)
        setStep1XLabel(calibrationData.xLabel || 'Concentration(μM)')
        setStep1YLabel(calibrationData.yLabel || 'B/R ratio')
      }

      // Load Step 2 preferences
      const cachedRadius = localStorage.getItem('vibeColorPickerRadius')
      if (cachedRadius) {
        setStep2Radius(Number(cachedRadius))
      }
    } catch (e) {
      console.error('Error loading cached data:', e)
    }
  }

  // Generate a unique ID for calibration data based on its content
  const generateCalibrationId = (data) => {
    // Simple hash based on data length and first/last entries
    if (!data || data.length === 0) return ''
    const str = JSON.stringify(data)
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // Convert to 32bit integer
    }
    return hash.toString()
  }

  // Handle Step 1 data change - check if calibration changed
  const handleStep1DataChange = (newData) => {
    const oldId = localStorage.getItem('vibeColorPickerCalibrationId')
    const newId = generateCalibrationId(newData)
    
    // If calibration changed, optionally clear saved data
    if (oldId && newId !== oldId) {
      const shouldClear = window.confirm(
        'You are loading new calibration data. This will clear your previously saved measurements. Do you want to continue?'
      )
      if (shouldClear) {
        localStorage.removeItem('vibeColorPickerData')
        setStep1Data(newData)
      } else {
        // User cancelled, don't update
        return
      }
    } else {
      setStep1Data(newData)
    }
  }

  // Save radius to localStorage
  const handleRadiusChange = (newRadius) => {
    setStep2Radius(newRadius)
    localStorage.setItem('vibeColorPickerRadius', newRadius.toString())
  }

  // Compute regression data from Step 1 state
  const regressionData = step1Data ? {
    m: step1M,
    n: step1N,
    xLabel: step1XLabel,
    yLabel: step1YLabel,
    dataPoints: step1Data
  } : null

  return (
    <div className="app">
      <header className="app-header">
        <h1>Vibe Color Picker</h1>
        <div className="step-indicator">
          <button
            className={`step-btn ${step === 1 ? 'active' : ''}`}
            onClick={() => setStep(1)}
          >
            Step 1: Calibration
          </button>
          <button
            className={`step-btn ${step === 2 ? 'active' : ''}`}
            onClick={() => setStep(2)}
          >
            Step 2: Color Picker
          </button>
          <button
            className={`step-btn ${step === 3 ? 'active' : ''}`}
            onClick={() => setStep(3)}
          >
            Step 3: Export Data
          </button>
        </div>
      </header>
      
      <main className="app-main">
        {step === 1 ? (
          <Step1
            data={step1Data}
            m={step1M}
            n={step1N}
            xLabel={step1XLabel}
            yLabel={step1YLabel}
            onDataChange={handleStep1DataChange}
            onMChange={setStep1M}
            onNChange={setStep1N}
            onXLabelChange={setStep1XLabel}
            onYLabelChange={setStep1YLabel}
          />
        ) : step === 2 ? (
          <Step2
            regressionData={regressionData}
            imageUrl={step2ImageUrl}
            image={step2Image}
            radius={step2Radius}
            onImageUrlChange={setStep2ImageUrl}
            onImageChange={setStep2Image}
            onRadiusChange={handleRadiusChange}
          />
        ) : (
          <Step3 />
        )}
      </main>
    </div>
  )
}

export default App

