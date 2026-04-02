import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'swiper/css'
import 'swiper/css/pagination'
import 'react-grid-layout/css/styles.css'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
