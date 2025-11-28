import { useState } from 'react'
import Step1 from './components/Step1'
import Step2 from './components/Step2'
import './App.css'

function App() {
  const [step, setStep] = useState(1)
  const [regressionData, setRegressionData] = useState(null)

  const handleStep1Complete = (data) => {
    setRegressionData(data)
    setStep(2)
  }

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
            disabled={!regressionData}
          >
            Step 2: Color Picker
          </button>
        </div>
      </header>
      
      <main className="app-main">
        {step === 1 ? (
          <Step1 onComplete={handleStep1Complete} />
        ) : (
          <Step2 regressionData={regressionData} />
        )}
      </main>
    </div>
  )
}

export default App

