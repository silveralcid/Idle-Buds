import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import '@fontsource-variable/archivo/wght.css'
import '@fontsource/dela-gothic-one/latin-400.css'
import './styles.css'

const root = document.getElementById('root')

if (!root) {
  throw new Error('The application root is missing.')
}

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
