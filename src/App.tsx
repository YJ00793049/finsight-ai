import { useState, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import './App.css'

const ANTHROPIC_API_KEY = import.meta.env.VITE_ANTHROPIC_API_KEY

async function extractTextFromFile(file: File): Promise<string> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = async (e) => {
      const text = e.target?.result as string
      resolve(text.slice(0, 15000))
    }
    reader.readAsText(file)
  })
}

async function analyzeWithClaude(text: string): Promise<string> {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `You are a senior equity research analyst at Goldman Sachs. Analyze this financial document and provide a structured investment report.

Extract and analyze:
1. COMPANY OVERVIEW - What company, what period, what type of document
2. KEY METRICS - Revenue, Net Income, EPS, Gross Margin, Operating Margin, Debt-to-Equity
3. GROWTH TRENDS - YoY changes, trajectory
4. RED FLAGS - Any risks, concerning trends, or warnings
5. INVESTMENT MEMO - 3-4 sentence plain English summary a non-finance person could understand
6. VERDICT - Buy / Hold / Sell with confidence level (High/Medium/Low) and one sentence reason

Format your response with clear headers using ## for each section. Be specific with numbers. If a metric isn't available, say N/A. Do not use ** for bold, just write plainly.

Document text:
${text}`
      }]
    })
  })

  const data = await response.json()
  return data.content[0].text
}

function formatAnalysis(text: string) {
  const sections = text.split('##').filter(s => s.trim())
  return sections.map((section, i) => {
    const lines = section.trim().split('\n')
    const title = lines[0].trim()
    const content = lines.slice(1).join('\n').trim()
    return { title, content, id: i }
  })
}

function getVerdictColor(analysis: string) {
  const lower = analysis.toLowerCase()
  if (lower.includes('verdict') && lower.includes('buy')) return '#00C853'
  if (lower.includes('verdict') && lower.includes('sell')) return '#FF1744'
  return '#FFB300'
}

export default function App() {
  const [analysis, setAnalysis] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>('')
  const [fileName, setFileName] = useState<string>('')
  const [dragActive, setDragActive] = useState(false)

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0]
    if (!file) return

    setFileName(file.name)
    setLoading(true)
    setError('')
    setAnalysis('')

    try {
      const text = await extractTextFromFile(file)
      if (!text || text.trim().length < 100) {
        setError('Could not extract text from this file. Make sure you are uploading an HTML or TXT file, not a scanned PDF.')
        setLoading(false)
        return
      }
      const result = await analyzeWithClaude(text)
      setAnalysis(result)
    } catch (err) {
      setError('Analysis failed. Check your API key and try again.')
      console.error(err)
    }
    setLoading(false)
  }, [])

  const { getRootProps, getInputProps } = useDropzone({
    onDrop,
    accept: { 
      'application/pdf': ['.pdf'], 
      'text/plain': ['.txt'],
      'text/html': ['.html', '.htm']
    },
    onDragEnter: () => setDragActive(true),
    onDragLeave: () => setDragActive(false),
    maxFiles: 1
  })

  const sections = analysis ? formatAnalysis(analysis) : []
  const verdictColor = analysis ? getVerdictColor(analysis) : '#FFB300'

  return (
    <div className="app">
      <header className="header">
        <div className="header-inner">
          <div className="logo">
            <span className="logo-icon">◈</span>
            <span className="logo-text">FinSight <span className="logo-sub">AI</span></span>
          </div>
          <div className="header-tag">Powered by Artificio AI · Built by Yuvraj Jindal</div>
        </div>
      </header>

      <main className="main">
        <div className="hero">
          <h1 className="hero-title">Financial Statement<br /><span className="hero-accent">Intelligence</span></h1>
          <p className="hero-sub">Upload any 10-K, earnings report, or balance sheet. Get an institutional-grade investment analysis in seconds.</p>
        </div>

        <div
          {...getRootProps()}
          className={`dropzone ${dragActive ? 'drag-active' : ''} ${loading ? 'loading' : ''}`}
        >
          <input {...getInputProps()} />
          {loading ? (
            <div className="loading-state">
              <div className="spinner" />
              <p className="loading-text">Analyzing {fileName}...</p>
              <p className="loading-sub">Running institutional-grade analysis</p>
            </div>
          ) : (
            <div className="drop-content">
              <div className="drop-icon">⬆</div>
              <p className="drop-title">{fileName || 'Drop your financial document here'}</p>
              <p className="drop-sub">Supports PDF · TXT · HTML</p>
              <button className="drop-btn">Choose File</button>
            </div>
          )}
        </div>

        <div className="instructions">
          <div className="instructions-title">📋 How to get the best results</div>
          <div className="instructions-steps">
            <div className="step"><span className="step-num">1</span>Go to <strong>sec.gov</strong> and search for any public company</div>
            <div className="step"><span className="step-num">2</span>Click on their most recent <strong>10-K</strong> annual report filing</div>
            <div className="step"><span className="step-num">3</span>Open the <strong>.htm file</strong> and save it (Command+S) as "Web Page, HTML Only"</div>
            <div className="step"><span className="step-num">4</span>Upload that file here for a full institutional-grade analysis</div>
          </div>
        </div>

        {error && <div className="error-box">{error}</div>}

        {sections.length > 0 && (
          <div className="results">
            <div className="results-header">
              <h2 className="results-title">Analysis Complete</h2>
              <div className="verdict-badge" style={{ backgroundColor: verdictColor + '22', borderColor: verdictColor, color: verdictColor }}>
                {analysis.toLowerCase().includes('buy') ? '↑ BUY' : analysis.toLowerCase().includes('sell') ? '↓ SELL' : '→ HOLD'}
              </div>
            </div>

            <div className="sections-grid">
              {sections.map((section) => (
                <div key={section.id} className={`section-card ${section.title.toLowerCase().includes('verdict') ? 'verdict-card' : ''} ${section.title.toLowerCase().includes('red flag') ? 'risk-card' : ''}`}>
                  <h3 className="section-title">{section.title}</h3>
                  <div className="section-content">
                    {section.content.split('\n').map((line, i) => (
                      <p key={i} className={line.startsWith('-') ? 'bullet-line' : 'content-line'}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <div className="disclaimer">
              Built by Yuvraj Jindal · Artificio AI Internship · For educational purposes only
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
