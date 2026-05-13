import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { Toaster } from 'sonner'
import './index.css'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <>
      <App />
      <Toaster
        richColors
        theme="dark"
        position="top-center"
        closeButton
        toastOptions={{
          classNames: {
            toast: 'border border-zinc-700 bg-zinc-900 text-zinc-100 shadow-xl',
          },
        }}
      />
    </>
  </StrictMode>,
)
