import { useState, useRef, useEffect } from 'react'
import './Step2.css'

function Step2({ regressionData }) {
  const [image, setImage] = useState(null)
  const [imageUrl, setImageUrl] = useState(null)
  const [radius, setRadius] = useState(10)
  const [pickedColor, setPickedColor] = useState(null)
  const [concentration, setConcentration] = useState(null)
  const [cursorPos, setCursorPos] = useState(null)
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const containerRef = useRef(null)
  const [imageError, setImageError] = useState(null)

  useEffect(() => {
    if (imageUrl && canvasRef.current) {
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        const canvas = canvasRef.current
        const ctx = canvas.getContext('2d')
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        imageRef.current = img
      }
      img.onerror = () => {
        setImageError('Failed to load image')
      }
      img.src = imageUrl
    }
  }, [imageUrl])


  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      const url = URL.createObjectURL(file)
      setImageUrl(url)
      setImage(file)
      setImageError(null)
      setPickedColor(null)
      setConcentration(null)
    } else {
      setImageError('Please select a valid image file')
    }
  }

  const getAverageColor = (ctx, x, y, radius) => {
    if (radius === 0) {
      // Point picker
      const imageData = ctx.getImageData(x, y, 1, 1)
      const [r, g, b] = imageData.data
      return { r, g, b, a: imageData.data[3] }
    }

    // Circular region picker
    let r = 0, g = 0, b = 0, count = 0
    const radiusSquared = radius * radius

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const distanceSquared = dx * dx + dy * dy
        if (distanceSquared <= radiusSquared) {
          const px = Math.round(x + dx)
          const py = Math.round(y + dy)
          
          if (px >= 0 && px < ctx.canvas.width && py >= 0 && py < ctx.canvas.height) {
            const imageData = ctx.getImageData(px, py, 1, 1)
            r += imageData.data[0]
            g += imageData.data[1]
            b += imageData.data[2]
            count++
          }
        }
      }
    }

    if (count === 0) return { r: 0, g: 0, b: 0, a: 255 }

    return {
      r: Math.round(r / count),
      g: Math.round(g / count),
      b: Math.round(b / count),
      a: 255
    }
  }

  const handleCanvasClick = (e) => {
    if (!canvasRef.current || !imageRef.current || !regressionData) return

    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    
    // Calculate the scale factor based on actual displayed size vs natural size
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    
    const x = (e.clientX - rect.left) * scaleX
    const y = (e.clientY - rect.top) * scaleY

    // Clamp coordinates to canvas bounds
    const clampedX = Math.max(0, Math.min(canvas.width - 1, Math.round(x)))
    const clampedY = Math.max(0, Math.min(canvas.height - 1, Math.round(y)))

    const ctx = canvas.getContext('2d')
    const color = getAverageColor(ctx, clampedX, clampedY, radius)
    
    setPickedColor(color)

    // Calculate B/R ratio
    const brRatio = color.r > 0 ? color.b / color.r : 0

    // Apply linear function: y = mx + n
    const { m, n } = regressionData
    const calculatedConcentration = m * brRatio + n

    setConcentration(calculatedConcentration)
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const handleCanvasMove = (e) => {
    if (!canvasRef.current || !imageRef.current) return
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    setCursorPos({ x: e.clientX - rect.left, y: e.clientY - rect.top })
  }

  const getDisplayRadius = () => {
    if (!canvasRef.current || !imageRef.current) return radius
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0 || canvas.width === 0 || canvas.height === 0) {
      return radius
    }
    const scaleX = rect.width / canvas.width
    const scaleY = rect.height / canvas.height
    const avgScale = (scaleX + scaleY) / 2
    return radius * avgScale
  }

  const displayRadius = getDisplayRadius()

  return (
    <div className="step2-container">
      <div className="step2-section">
        <h2>Step 2: Pick Colors from Image</h2>
        <div className="file-upload-area">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            id="image-upload"
            className="file-input"
          />
          <label htmlFor="image-upload" className="file-label">
            Choose Image File
          </label>
        </div>
        {imageError && <div className="error-message">{imageError}</div>}
      </div>

      {imageUrl && (
        <>
          <div className="step2-section">
            <div className="controls">
              <label>
                Picker Radius:
                <input
                  type="number"
                  value={radius}
                  onChange={(e) => setRadius(Math.max(0, Number(e.target.value)))}
                  min="0"
                  step="1"
                />
                {radius === 0 && <span className="hint"> (Point picker)</span>}
              </label>
            </div>
          </div>

          <div className="step2-section">
            <div className="image-container" ref={containerRef}>
              <div className="canvas-wrapper" style={{ position: 'relative', display: 'inline-block' }}>
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMove}
                  onTouchStart={(e) => {
                    e.preventDefault()
                    const touch = e.touches[0]
                    const syntheticEvent = {
                      clientX: touch.clientX,
                      clientY: touch.clientY
                    }
                    handleCanvasClick(syntheticEvent)
                  }}
                  onTouchMove={(e) => {
                    e.preventDefault()
                    const touch = e.touches[0]
                    const syntheticEvent = {
                      clientX: touch.clientX,
                      clientY: touch.clientY
                    }
                    handleCanvasMove(syntheticEvent)
                  }}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    cursor: 'crosshair',
                    display: 'block',
                    touchAction: 'none'
                  }}
                />
                {cursorPos && (
                  <div
                    className="picker-circle"
                    style={{
                      left: cursorPos.x - displayRadius,
                      top: cursorPos.y - displayRadius,
                      width: displayRadius * 2,
                      height: displayRadius * 2,
                      borderRadius: '50%',
                      border: '2px solid #4CAF50',
                      pointerEvents: 'none',
                      position: 'absolute',
                      boxSizing: 'border-box'
                    }}
                  />
                )}
              </div>
            </div>
            <p className="instruction">Click or tap on the image to pick a color</p>
          </div>

          {pickedColor && (
            <div className="step2-section">
              <h3>Results</h3>
              <div className="results-grid">
                <div className="result-item">
                  <label>Picked Color (RGB):</label>
                  <div className="color-display">
                    <div
                      className="color-swatch"
                      style={{
                        backgroundColor: `rgb(${pickedColor.r}, ${pickedColor.g}, ${pickedColor.b})`
                      }}
                    />
                    <span>
                      ({pickedColor.r}, {pickedColor.g}, {pickedColor.b})
                    </span>
                  </div>
                </div>
                <div className="result-item">
                  <label>B/R Ratio:</label>
                  <div className="value-display">
                    {(pickedColor.r > 0 ? (pickedColor.b / pickedColor.r).toFixed(4) : '0.0000')}
                  </div>
                </div>
                <div className="result-item">
                  <label>Concentration ({regressionData.xLabel || 'Concentration(μM)'}):</label>
                  <div className="value-display highlight">
                    {concentration !== null ? concentration.toFixed(2) : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {regressionData && (
            <div className="step2-section info-box">
              <h3>Calibration Function</h3>
              <p>y = {regressionData.m.toFixed(4)}x + {regressionData.n.toFixed(4)}</p>
              <p>where x = B/R ratio, y = Concentration</p>
            </div>
          )}
        </>
      )}

      {!regressionData && (
        <div className="step2-section error-message">
          Please complete Step 1 first to set up the calibration data.
        </div>
      )}
    </div>
  )
}

export default Step2

