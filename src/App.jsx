import { useState } from 'react'
import Step1 from './components/Step1'
import Step2 from './components/Step2'
import './App.css'

function App() {
  const [step, setStep] = useState(1)
  
  // Step 1 state
  const [step1Data, setStep1Data] = useState(null)
  const [step1M, setStep1M] = useState(0)
  const [step1N, setStep1N] = useState(0)
  const [step1XLabel, setStep1XLabel] = useState('B/R ratio')
  const [step1YLabel, setStep1YLabel] = useState('Concentration(μM)')
  
  // Step 2 state
  const [step2ImageUrl, setStep2ImageUrl] = useState(null)
  const [step2Image, setStep2Image] = useState(null)
  const [step2Radius, setStep2Radius] = useState(10)

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
            onDataChange={setStep1Data}
            onMChange={setStep1M}
            onNChange={setStep1N}
            onXLabelChange={setStep1XLabel}
            onYLabelChange={setStep1YLabel}
          />
        ) : (
          <Step2
            regressionData={regressionData}
            imageUrl={step2ImageUrl}
            image={step2Image}
            radius={step2Radius}
            onImageUrlChange={setStep2ImageUrl}
            onImageChange={setStep2Image}
            onRadiusChange={setStep2Radius}
          />
        )}
      </main>
    </div>
  )
}

export default App

