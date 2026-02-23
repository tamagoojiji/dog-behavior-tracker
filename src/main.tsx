import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './styles/global.css'
import App from './App.tsx'
import { migrateData } from './store/localStorage'
import { retrySyncQueue } from './store/syncService'

migrateData()

// 起動時にキュー再送（バックグラウンド）
retrySyncQueue().catch(() => {})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
