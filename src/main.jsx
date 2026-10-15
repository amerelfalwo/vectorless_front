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
        theme="light"
        position="top-right"
        closeButton
        toastOptions={{
          classNames: {
            toast: 'border border-[#E4E5DE] bg-white text-[#262B27] shadow-lg rounded-xl font-sans',
            description: 'text-[#777D76]',
            actionButton: 'bg-[#285943] text-white',
            cancelButton: 'bg-[#F7F6F1] text-[#262B27]',
          },
        }}
      />
    </>
  </StrictMode>,
)
