import { useState, useRef, useEffect } from 'react'
import './Step2.css'

function Step2({ 
  regressionData,
  imageUrl: propImageUrl,
  image: propImage,
  radius: propRadius,
  onImageUrlChange,
  onImageChange,
  onRadiusChange
}) {
  const [image, setImage] = useState(propImage || null)
  const [imageUrl, setImageUrl] = useState(propImageUrl || null)
  const [radius, setRadius] = useState(propRadius !== undefined ? propRadius : 10)
  const [pickedColor, setPickedColor] = useState(null)
  const [concentration, setConcentration] = useState(null)
  const [cursorPos, setCursorPos] = useState(null)
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const containerRef = useRef(null)
  const [imageError, setImageError] = useState(null)
  
  // Image panning state
  const [imageOffset, setImageOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  
  // Radius drag state
  const [isDraggingRadius, setIsDraggingRadius] = useState(false)
  const [radiusDragStart, setRadiusDragStart] = useState({ y: 0, initialRadius: 0 })
  const radiusInputRef = useRef(null)
  
  // Pinch gesture state
  const [pinchStartDistance, setPinchStartDistance] = useState(null)
  const [pinchStartRadius, setPinchStartRadius] = useState(null)
  const lastTouchRef = useRef({ touches: [] })

  // Sync local state with props when they change from parent
  useEffect(() => {
    if (propImageUrl !== imageUrl) {
      if (propImageUrl === null && imageUrl) {
        // Clean up old object URL
        URL.revokeObjectURL(imageUrl)
      }
      setImageUrl(propImageUrl)
    }
    if (propImage !== image) setImage(propImage)
    if (propRadius !== undefined && propRadius !== radius) setRadius(propRadius)
  }, [propImageUrl, propImage, propRadius])


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
        // Reset offset when new image loads
        setImageOffset({ x: 0, y: 0 })
      }
      img.onerror = () => {
        setImageError('Failed to load image')
      }
      img.src = imageUrl
    }
  }, [imageUrl])

  // Helper to calculate distance between two touches
  const getTouchDistance = (touch1, touch2) => {
    const dx = touch2.clientX - touch1.clientX
    const dy = touch2.clientY - touch1.clientY
    return Math.sqrt(dx * dx + dy * dy)
  }


  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file && file.type.startsWith('image/')) {
      // Clean up old object URL if exists
      if (imageUrl) {
        URL.revokeObjectURL(imageUrl)
      }
      const url = URL.createObjectURL(file)
      setImageUrl(url)
      setImage(file)
      setImageError(null)
      setPickedColor(null)
      setConcentration(null)
      // Update parent immediately
      if (onImageUrlChange) onImageUrlChange(url)
      if (onImageChange) onImageChange(file)
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
    
    // Account for image offset when panning
    const offsetX = imageOffset.x || 0
    const offsetY = imageOffset.y || 0
    
    const x = (e.clientX - rect.left - offsetX) * scaleX
    const y = (e.clientY - rect.top - offsetY) * scaleY

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

  // Radius input drag handlers
  const handleRadiusDragStart = (e) => {
    if (e.touches && e.touches.length === 1) {
      e.preventDefault()
      setIsDraggingRadius(true)
      setRadiusDragStart({
        y: e.touches[0].clientY,
        initialRadius: radius
      })
    } else if (e.type === 'mousedown' && e.button === 0) {
      setIsDraggingRadius(true)
      setRadiusDragStart({
        y: e.clientY,
        initialRadius: radius
      })
    }
  }

  const handleRadiusDrag = (e) => {
    if (!isDraggingRadius) return
    
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    const deltaY = radiusDragStart.y - clientY // Inverted: drag up increases
    const sensitivity = 0.5 // Adjust sensitivity
    const newRadius = Math.max(0, Math.round(radiusDragStart.initialRadius + deltaY * sensitivity))
    
    setRadius(newRadius)
    if (onRadiusChange) onRadiusChange(newRadius)
  }

  const handleRadiusDragEnd = () => {
    setIsDraggingRadius(false)
  }

  // Image panning handlers
  const handlePanStart = (e) => {
    if (!canvasRef.current || !imageRef.current) return
    
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    
    // Check if displayed image is larger than container (needs panning)
    const container = containerRef.current
    if (!container) return
    
    const needsPanning = rect.width > container.clientWidth || rect.height > container.clientHeight
    if (!needsPanning) return
    
    if (e.touches && e.touches.length === 1) {
      e.preventDefault()
      setIsPanning(true)
      setPanStart({
        x: e.touches[0].clientX - imageOffset.x,
        y: e.touches[0].clientY - imageOffset.y
      })
    } else if (e.type === 'mousedown' && e.button === 0) {
      setIsPanning(true)
      setPanStart({
        x: e.clientX - imageOffset.x,
        y: e.clientY - imageOffset.y
      })
    }
  }

  const handlePan = (e) => {
    if (!isPanning || !containerRef.current) return
    
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!canvas) return
    
    const rect = canvas.getBoundingClientRect()
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    
    let newX = clientX - panStart.x
    let newY = clientY - panStart.y
    
    // Constrain panning within bounds (based on displayed size)
    const maxX = Math.max(0, rect.width - container.clientWidth)
    const maxY = Math.max(0, rect.height - container.clientHeight)
    
    newX = Math.max(-maxX, Math.min(0, newX))
    newY = Math.max(-maxY, Math.min(0, newY))
    
    setImageOffset({ x: newX, y: newY })
  }

  const handlePanEnd = () => {
    setIsPanning(false)
  }

  // Pinch gesture handler for radius
  const handlePinchStart = (e) => {
    if (e.touches && e.touches.length === 2) {
      e.preventDefault()
      const distance = getTouchDistance(e.touches[0], e.touches[1])
      setPinchStartDistance(distance)
      setPinchStartRadius(radius)
      lastTouchRef.current = { touches: Array.from(e.touches) }
    }
  }

  const handlePinch = (e) => {
    if (!pinchStartDistance || !e.touches || e.touches.length !== 2) return
    
    e.preventDefault()
    const distance = getTouchDistance(e.touches[0], e.touches[1])
    const scale = distance / pinchStartDistance
    
    const newRadius = Math.max(0, Math.round(pinchStartRadius * scale))
    setRadius(newRadius)
    if (onRadiusChange) onRadiusChange(newRadius)
    
    lastTouchRef.current = { touches: Array.from(e.touches) }
  }

  const handlePinchEnd = () => {
    setPinchStartDistance(null)
    setPinchStartRadius(null)
  }

  // Combined touch handler for canvas
  const handleCanvasTouchStart = (e) => {
    if (!canvasRef.current || !imageRef.current) return
    
    if (e.touches.length === 2) {
      // Two fingers = pinch for radius
      handlePinchStart(e)
    } else if (e.touches.length === 1) {
      // Single finger = check if panning or picking color
      const container = containerRef.current
      const canvas = canvasRef.current
      if (canvas && container) {
        const rect = canvas.getBoundingClientRect()
        if (rect.width > container.clientWidth || rect.height > container.clientHeight) {
          // Displayed image is larger, allow panning
          handlePanStart(e)
          return
        }
      }
      // Normal color pick (requires regressionData)
      if (regressionData) {
        e.preventDefault()
        const touch = e.touches[0]
        const syntheticEvent = {
          clientX: touch.clientX,
          clientY: touch.clientY
        }
        handleCanvasClick(syntheticEvent)
      }
    }
  }

  const handleCanvasTouchMove = (e) => {
    if (!canvasRef.current || !imageRef.current) return
    
    if (e.touches.length === 2) {
      handlePinch(e)
    } else if (e.touches.length === 1) {
      if (isPanning) {
        handlePan(e)
      } else {
        const touch = e.touches[0]
        const syntheticEvent = {
          clientX: touch.clientX,
          clientY: touch.clientY
        }
        handleCanvasMove(syntheticEvent)
      }
    }
  }

  const handleCanvasTouchEnd = (e) => {
    handlePanEnd()
    handlePinchEnd()
    
    // If there's still one touch, update cursor position
    if (e.touches && e.touches.length === 1) {
      const touch = e.touches[0]
      const syntheticEvent = {
        clientX: touch.clientX,
        clientY: touch.clientY
      }
      handleCanvasMove(syntheticEvent)
    } else if (e.touches.length === 0) {
      setCursorPos(null)
    }
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

  // Apply image offset for panning
  const getCanvasTransform = () => {
    if (imageOffset.x === 0 && imageOffset.y === 0) return {}
    return {
      transform: `translate(${imageOffset.x}px, ${imageOffset.y}px)`
    }
  }

  // Global event listeners for drag operations
  useEffect(() => {
    const handleGlobalMove = (e) => {
      if (isDraggingRadius) {
        handleRadiusDrag(e)
      }
      if (isPanning) {
        handlePan(e)
      }
    }

    const handleGlobalEnd = () => {
      if (isDraggingRadius) {
        handleRadiusDragEnd()
      }
      if (isPanning) {
        handlePanEnd()
      }
    }

    if (isDraggingRadius || isPanning) {
      window.addEventListener('touchmove', handleGlobalMove, { passive: false })
      window.addEventListener('touchend', handleGlobalEnd)
      window.addEventListener('mousemove', handleGlobalMove)
      window.addEventListener('mouseup', handleGlobalEnd)
    }

    return () => {
      window.removeEventListener('touchmove', handleGlobalMove)
      window.removeEventListener('touchend', handleGlobalEnd)
      window.removeEventListener('mousemove', handleGlobalMove)
      window.removeEventListener('mouseup', handleGlobalEnd)
    }
  }, [isDraggingRadius, isPanning])

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
                  ref={radiusInputRef}
                  type="number"
                  value={radius}
                  onChange={(e) => {
                    const newRadius = Math.max(0, Number(e.target.value))
                    setRadius(newRadius)
                    if (onRadiusChange) onRadiusChange(newRadius)
                  }}
                  onTouchStart={handleRadiusDragStart}
                  onMouseDown={handleRadiusDragStart}
                  min="0"
                  step="1"
                  className="radius-input-draggable"
                />
                {radius === 0 && <span className="hint"> (Point picker)</span>}
                <span className="hint"> (Hold and drag up/down to adjust)</span>
              </label>
            </div>
          </div>

          <div className="step2-section">
            <div className="image-container" ref={containerRef}>
              <div className="canvas-wrapper" style={{ position: 'relative', display: 'inline-block', overflow: 'hidden' }}>
                <canvas
                  ref={canvasRef}
                  onClick={(e) => {
                    if (!isPanning) handleCanvasClick(e)
                  }}
                  onMouseMove={handleCanvasMove}
                  onMouseDown={handlePanStart}
                  onTouchStart={handleCanvasTouchStart}
                  onTouchMove={handleCanvasTouchMove}
                  onTouchEnd={handleCanvasTouchEnd}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    cursor: isPanning ? 'grabbing' : 'crosshair',
                    display: 'block',
                    touchAction: 'none',
                    userSelect: 'none',
                    ...getCanvasTransform()
                  }}
                />
                {cursorPos && !isPanning && (
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

