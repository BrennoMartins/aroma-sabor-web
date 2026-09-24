import { useEffect } from 'react'
import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './router'

function App() {
  useEffect(() => {
    document.title = 'Aroma Sabor OS'
  }, [])

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  )
}

export default App