import { useState, useRef, useEffect } from 'react'
import './Step2.css'

// Format number to have at least 3 significant digits and at least 3 decimal places
const formatWithSigFigsAndDecimals = (num) => {
  if (num === 0) return '0.000'
  if (!isFinite(num)) return String(num)
  
  const absNum = Math.abs(num)
  const sign = num < 0 ? '-' : ''
  
  // Format to 3 significant digits
  const precisionStr = absNum.toPrecision(3)
  
  // Handle scientific notation (for very small or very large numbers)
  if (precisionStr.includes('e')) {
    // Parse scientific notation: e.g., "1.23e-4" -> mantissa is "1.23", exponent is -4
    const match = precisionStr.match(/^([\d.]+)e([+-]?\d+)$/)
    if (match) {
      const mantissa = match[1]
      const exponent = parseInt(match[2], 10)
      
      // Calculate decimal places needed to show 3 sig figs
      // For negative exponent, need more decimal places: -exponent + (digits after decimal in mantissa)
      const mantissaParts = mantissa.split('.')
      const digitsAfterDecimal = mantissaParts.length > 1 ? mantissaParts[1].length : 0
      const decimalPlaces = Math.max(3, -exponent + digitsAfterDecimal)
      
      // Convert to regular number and format
      const precisionNum = parseFloat(precisionStr)
      return sign + precisionNum.toFixed(decimalPlaces)
    }
  }
  
  // For non-scientific notation, count decimal places in the precision string
  const parts = precisionStr.split('.')
  let decimalPlaces = 0
  
  if (parts.length > 1) {
    // Has decimal point, count digits after it
    decimalPlaces = parts[1].length
  } else {
    // No decimal point, check if we need decimals for 3 sig figs
    const intPart = parts[0]
    if (intPart.length < 3) {
      // Need some decimal places to show 3 sig figs
      decimalPlaces = 3 - intPart.length
    }
  }
  
  // Ensure at least 3 decimal places
  decimalPlaces = Math.max(decimalPlaces, 3)
  
  const precisionNum = parseFloat(precisionStr)
  return sign + precisionNum.toFixed(decimalPlaces)
}

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
  const canvasCtxRef = useRef(null)
  const imageRef = useRef(null)
  const containerRef = useRef(null)
  const canvasWrapperRef = useRef(null)
  const [imageError, setImageError] = useState(null)
  
  // Radius drag state
  const [isDraggingRadius, setIsDraggingRadius] = useState(false)
  const [radiusDragStart, setRadiusDragStart] = useState({ y: 0, initialRadius: 0 })
  const radiusInputRef = useRef(null)
  
  // Image zoom and pan state
  const [zoom, setZoom] = useState(1)
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 })
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  
  // Touch gesture state
  const [touchStart, setTouchStart] = useState(null)
  const [pinchStart, setPinchStart] = useState(null)
  
  // Save state
  const [saveMessage, setSaveMessage] = useState(null)

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
        const ctx = canvas.getContext('2d', {
          colorSpace: 'srgb',
          willReadFrequently: true
        })
        // Disable image smoothing to get accurate pixel data
        ctx.imageSmoothingEnabled = false
        canvas.width = img.width
        canvas.height = img.height
        ctx.drawImage(img, 0, 0)
        // Store the context for reuse
        canvasCtxRef.current = ctx
        imageRef.current = img
        // Reset zoom and pan when new image loads
        setZoom(1)
        setPanOffset({ x: 0, y: 0 })
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

  // Helper to get midpoint of two touches
  const getTouchMidpoint = (touch1, touch2) => {
    return {
      x: (touch1.clientX + touch2.clientX) / 2,
      y: (touch1.clientY + touch2.clientY) / 2
    }
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
    // Ensure we're using integer coordinates for accurate pixel reading
    const intX = Math.floor(x)
    const intY = Math.floor(y)
    
    if (radius === 0) {
      // Point picker - read exact pixel
      const imageData = ctx.getImageData(intX, intY, 1, 1)
      // ImageData.data is [R, G, B, A] for the pixel
      const r = imageData.data[0]
      const g = imageData.data[1]
      const b = imageData.data[2]
      const a = imageData.data[3]
      return { r, g, b, a }
    }

    // Circular region picker
    let r = 0, g = 0, b = 0, count = 0
    const radiusSquared = radius * radius

    for (let dy = -radius; dy <= radius; dy++) {
      for (let dx = -radius; dx <= radius; dx++) {
        const distanceSquared = dx * dx + dy * dy
        if (distanceSquared <= radiusSquared) {
          const px = intX + dx
          const py = intY + dy
          
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

  // Convert screen coordinates to canvas coordinates accounting for zoom and pan
  const screenToCanvas = (clientX, clientY) => {
    if (!canvasRef.current) return { x: 0, y: 0 }
    const canvas = canvasRef.current
    const canvasRect = canvas.getBoundingClientRect()
    
    // Get position relative to the canvas element (which already accounts for CSS transform)
    const relativeX = clientX - canvasRect.left
    const relativeY = clientY - canvasRect.top
    
    // Calculate the scale factor between displayed size and natural canvas size
    // The canvas might be scaled down to fit the container (maxWidth: 100%)
    const scaleX = canvas.width / canvasRect.width
    const scaleY = canvas.height / canvasRect.height
    
    // Convert to natural canvas coordinates
    // Since the CSS transform (scale and translate) is already applied to the bounding rect,
    // we just need to account for the size difference
    const canvasX = relativeX * scaleX
    const canvasY = relativeY * scaleY
    
    return { x: canvasX, y: canvasY }
  }

  // Helper to update cursor position relative to canvas-wrapper
  const updateCursorPos = (clientX, clientY) => {
    if (!canvasWrapperRef.current) return
    const wrapperRect = canvasWrapperRef.current.getBoundingClientRect()
    
    // Get position relative to canvas-wrapper (where the circle will be positioned)
    setCursorPos({ 
      x: clientX - wrapperRect.left, 
      y: clientY - wrapperRect.top 
    })
  }

  const handleCanvasClick = (e) => {
    if (!canvasRef.current || !imageRef.current || !regressionData || !canvasCtxRef.current) return

    const canvas = canvasRef.current
    const { x, y } = screenToCanvas(e.clientX, e.clientY)

    // Clamp coordinates to canvas bounds and use floor for exact pixel reading
    const clampedX = Math.max(0, Math.min(canvas.width - 1, Math.floor(x)))
    const clampedY = Math.max(0, Math.min(canvas.height - 1, Math.floor(y)))

    // Use the stored context instead of creating a new one
    const ctx = canvasCtxRef.current
    const color = getAverageColor(ctx, clampedX, clampedY, radius)
    
    setPickedColor(color)

    // Calculate B/R ratio
    const brRatio = color.r > 0 ? color.b / color.r : 0

    // Apply linear function: brRatio = m * concentration + n
    // Solve for concentration: concentration = (brRatio - n) / m
    const { m, n } = regressionData
    const calculatedConcentration = m !== 0 ? (brRatio - n) / m : 0

    setConcentration(calculatedConcentration)
    
    // Update cursor position relative to container
    updateCursorPos(e.clientX, e.clientY)
  }

  const handleCanvasMove = (e) => {
    if (!canvasRef.current || !imageRef.current) return
    updateCursorPos(e.clientX, e.clientY)
  }

  // Radius drag handlers
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
    const sensitivity = 0.5
    const newRadius = Math.max(0, Math.round(radiusDragStart.initialRadius + deltaY * sensitivity))
    
    setRadius(newRadius)
    if (onRadiusChange) onRadiusChange(newRadius)
  }

  const handleRadiusDragEnd = () => {
    setIsDraggingRadius(false)
  }

  // Image pan handlers
  const handlePanStart = (e) => {
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    
    // Only allow panning if zoomed image is larger than container
    const containerRect = container.getBoundingClientRect()
    const scaledWidth = canvas.width * zoom
    const scaledHeight = canvas.height * zoom
    const canPan = scaledWidth > containerRect.width || scaledHeight > containerRect.height
    
    if (!canPan) return
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    
    e.preventDefault()
    setIsPanning(true)
    const containerRect2 = container.getBoundingClientRect()
    setPanStart({
      x: clientX - containerRect2.left - panOffset.x,
      y: clientY - containerRect2.top - panOffset.y
    })
  }

  const handlePan = (e) => {
    if (!isPanning) return
    
    const container = containerRef.current
    const canvas = canvasRef.current
    if (!container || !canvas) return
    
    const clientX = e.touches ? e.touches[0].clientX : e.clientX
    const clientY = e.touches ? e.touches[0].clientY : e.clientY
    
    const containerRect = container.getBoundingClientRect()
    const newOffsetX = clientX - containerRect.left - panStart.x
    const newOffsetY = clientY - containerRect.top - panStart.y
    
    // Constrain panning to keep image within bounds
    const scaledWidth = canvas.width * zoom
    const scaledHeight = canvas.height * zoom
    const maxOffsetX = Math.max(0, (scaledWidth - containerRect.width) / 2)
    const maxOffsetY = Math.max(0, (scaledHeight - containerRect.height) / 2)
    
    const constrainedX = Math.max(-maxOffsetX, Math.min(maxOffsetX, newOffsetX))
    const constrainedY = Math.max(-maxOffsetY, Math.min(maxOffsetY, newOffsetY))
    
    setPanOffset({ x: constrainedX, y: constrainedY })
  }

  const handlePanEnd = () => {
    setIsPanning(false)
  }

  // Pinch zoom handlers
  const handlePinchStart = (e) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const distance = getTouchDistance(e.touches[0], e.touches[1])
      const midpoint = getTouchMidpoint(e.touches[0], e.touches[1])
      setPinchStart({
        distance,
        midpoint,
        zoom,
        panOffset
      })
    }
  }

  const handlePinch = (e) => {
    if (!pinchStart || e.touches.length !== 2) return
    
    e.preventDefault()
    const distance = getTouchDistance(e.touches[0], e.touches[1])
    const scale = distance / pinchStart.distance
    const newZoom = Math.max(1, Math.min(5, pinchStart.zoom * scale)) // Limit zoom between 1x and 5x
    
    // Adjust pan to zoom towards pinch midpoint
    const currentMidpoint = getTouchMidpoint(e.touches[0], e.touches[1])
    const container = containerRef.current
    if (container) {
      const containerRect = container.getBoundingClientRect()
      const midpointRelativeX = currentMidpoint.x - containerRect.left
      const midpointRelativeY = currentMidpoint.y - containerRect.top
      
      // Calculate new pan offset to keep midpoint in same screen position
      const zoomRatio = newZoom / pinchStart.zoom
      const newOffsetX = midpointRelativeX - (midpointRelativeX - pinchStart.panOffset.x) * zoomRatio
      const newOffsetY = midpointRelativeY - (midpointRelativeY - pinchStart.panOffset.y) * zoomRatio
      
      setZoom(newZoom)
      setPanOffset({ x: newOffsetX, y: newOffsetY })
    } else {
      setZoom(newZoom)
    }
  }

  const handlePinchEnd = () => {
    setPinchStart(null)
  }

  // Save picked color and concentration to localStorage
  const handleSaveData = () => {
    if (!pickedColor || concentration === null) {
      setSaveMessage('No data to save. Please pick a color first.')
      setTimeout(() => setSaveMessage(null), 3000)
      return
    }

    // Format: [[R, G, B], Concentration]
    const newEntry = [[pickedColor.r, pickedColor.g, pickedColor.b], concentration]
    
    // Get existing data from localStorage
    const existingDataJson = localStorage.getItem('vibeColorPickerData')
    let existingData = []
    
    if (existingDataJson) {
      try {
        existingData = JSON.parse(existingDataJson)
        if (!Array.isArray(existingData)) {
          existingData = []
        }
      } catch (e) {
        console.error('Error parsing existing data:', e)
        existingData = []
      }
    }
    
    // Add new entry
    existingData.push(newEntry)
    
    // Save back to localStorage
    try {
      localStorage.setItem('vibeColorPickerData', JSON.stringify(existingData))
      setSaveMessage(`Saved! Total entries: ${existingData.length}`)
      setTimeout(() => setSaveMessage(null), 3000)
    } catch (e) {
      console.error('Error saving data:', e)
      setSaveMessage('Error saving data. Please try again.')
      setTimeout(() => setSaveMessage(null), 3000)
    }
  }

  // Touch handlers that differentiate tap, drag, and pinch
  const handleCanvasTouchStart = (e) => {
    if (!canvasRef.current || !imageRef.current) return
    
    if (e.touches.length === 2) {
      // Two fingers = pinch zoom
      handlePinchStart(e)
      setTouchStart(null) // Cancel any tap/drag
      setCursorPos(null) // Hide cursor during pinch
    } else if (e.touches.length === 1) {
      // Single finger = tap or drag
      const touch = e.touches[0]
      setTouchStart({
        x: touch.clientX,
        y: touch.clientY,
        time: Date.now()
      })
      // Update cursor position immediately
      updateCursorPos(touch.clientX, touch.clientY)
    }
  }

  const handleCanvasTouchMove = (e) => {
    if (!canvasRef.current || !imageRef.current) return
    
    if (e.touches.length === 2) {
      // Pinch zoom
      handlePinch(e)
      setTouchStart(null) // Cancel tap/drag
    } else if (e.touches.length === 1 && touchStart) {
      // Check if this is a drag (movement threshold)
      const touch = e.touches[0]
      const deltaX = Math.abs(touch.clientX - touchStart.x)
      const deltaY = Math.abs(touch.clientY - touchStart.y)
      const threshold = 10 // pixels
      
      if (deltaX > threshold || deltaY > threshold) {
        // It's a drag - start panning
        e.preventDefault()
        if (!isPanning) {
          // Start panning
          handlePanStart(e)
        }
        handlePan(e)
        setTouchStart(null) // Cancel tap
      } else {
        // Still within threshold - update cursor position
        updateCursorPos(touch.clientX, touch.clientY)
      }
    } else if (e.touches.length === 1) {
      // Update cursor position even when not dragging
      updateCursorPos(e.touches[0].clientX, e.touches[0].clientY)
    }
  }

  const handleCanvasTouchEnd = (e) => {
    // Check if it was a tap (not a drag or pinch)
    if (touchStart && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0]
      const deltaX = Math.abs(touch.clientX - touchStart.x)
      const deltaY = Math.abs(touch.clientY - touchStart.y)
      const deltaTime = Date.now() - touchStart.time
      const threshold = 10 // pixels
      const timeThreshold = 300 // ms
      
      if (deltaX < threshold && deltaY < threshold && deltaTime < timeThreshold) {
        // It's a tap - pick color
        e.preventDefault()
        const syntheticEvent = {
          clientX: touch.clientX,
          clientY: touch.clientY
        }
        handleCanvasClick(syntheticEvent)
        return // Don't clear cursor pos after tap
      }
    }
    
    handlePanEnd()
    handlePinchEnd()
    setTouchStart(null)
    
    // Update cursor position if there's still a touch
    if (e.touches && e.touches.length === 1) {
      const touch = e.touches[0]
      updateCursorPos(touch.clientX, touch.clientY)
    } else if (e.touches.length === 0) {
      // Keep cursor pos visible after tap
      // Only clear if explicitly needed
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
  }, [isDraggingRadius, isPanning, radiusDragStart, panStart, radius, panOffset, zoom])

  const getDisplayRadius = () => {
    if (!canvasRef.current || !imageRef.current) return radius
    const canvas = canvasRef.current
    const rect = canvas.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0 || canvas.width === 0 || canvas.height === 0) {
      return radius
    }
    // Calculate the scale factor: displayed width / natural width
    // The canvas is scaled by zoom via CSS transform, so we need to account for that
    const naturalWidth = canvas.width
    const displayedWidth = rect.width
    const scale = displayedWidth / naturalWidth
    
    // The radius in canvas pixels needs to be scaled to display pixels
    return radius * scale
  }

  const displayRadius = getDisplayRadius()

  // Get canvas transform for zoom and pan
  const getCanvasTransform = () => {
    if (zoom === 1 && panOffset.x === 0 && panOffset.y === 0) return {}
    return {
      transform: `translate(${panOffset.x}px, ${panOffset.y}px) scale(${zoom})`,
      transformOrigin: 'top left'
    }
  }

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
              <div ref={canvasWrapperRef} className="canvas-wrapper" style={{ position: 'relative', display: 'inline-block', overflow: 'hidden' }}>
                <canvas
                  ref={canvasRef}
                  onClick={handleCanvasClick}
                  onMouseMove={handleCanvasMove}
                  onMouseDown={(e) => {
                    handlePanStart(e)
                  }}
                  onTouchStart={handleCanvasTouchStart}
                  onTouchMove={handleCanvasTouchMove}
                  onTouchEnd={handleCanvasTouchEnd}
                  style={{
                    maxWidth: '100%',
                    height: 'auto',
                    cursor: isPanning ? 'grabbing' : (zoom > 1 ? 'grab' : 'crosshair'),
                    display: 'block',
                    touchAction: 'none',
                    userSelect: 'none',
                    ...getCanvasTransform()
                  }}
                />
                {cursorPos && !isPanning && !isDraggingRadius && (
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
                      boxSizing: 'border-box',
                      zIndex: 10
                    }}
                  />
                )}
              </div>
            </div>
            <p className="instruction">
              {zoom > 1 
                ? 'Drag to pan • Pinch to zoom • Tap to pick color'
                : 'Click or tap on the image to pick a color • Drag image if too large • Pinch to zoom'}
            </p>
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
              <div className="save-section">
                <button onClick={handleSaveData} className="save-btn">
                  Save Data Point
                </button>
                {saveMessage && <div className="save-message">{saveMessage}</div>}
              </div>
            </div>
          )}

          {regressionData && (
            <div className="step2-section info-box">
              <h3>Calibration Function</h3>
              <p>y = {formatWithSigFigsAndDecimals(regressionData.m)}x + {formatWithSigFigsAndDecimals(regressionData.n)}</p>
              <p>where x = Concentration, y = B/R ratio</p>
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

