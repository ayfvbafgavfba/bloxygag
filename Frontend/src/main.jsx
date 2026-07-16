import ReactDOM from 'react-dom/client'
import React from 'react'
import App from './App'
import numeral from 'numeral'
import './global.css'

if (typeof window !== 'undefined') {
  window.numeral = numeral
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App></App>
  </React.StrictMode>
)