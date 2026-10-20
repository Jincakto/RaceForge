import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { installEnglishUi } from './englishUi'

installEnglishUi()

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
