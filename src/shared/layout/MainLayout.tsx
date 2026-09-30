import { useEffect, useState } from 'react'
import { Outlet } from 'react-router-dom'
import { Sidebar } from './Sidebar/Sidebar'
import shellStyles from './Sidebar/Sidebar.module.css'
import { Topbar } from './Topbar/Topbar'

const DESKTOP_BREAKPOINT = '(min-width: 1024px)'

export function MainLayout() {
  const [isDesktop, setIsDesktop] = useState(() => {
    if (typeof window === 'undefined') {
      return true
    }

    return window.matchMedia(DESKTOP_BREAKPOINT).matches
  })
  const [isSidebarOpen, setIsSidebarOpen] = useState(() => {
    if (typeof window === 'undefined') {
      return true
    }

    return window.matchMedia(DESKTOP_BREAKPOINT).matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(DESKTOP_BREAKPOINT)

    const handleChange = (event: MediaQueryListEvent) => {
      setIsDesktop(event.matches)
      setIsSidebarOpen(event.matches)
    }

    mediaQuery.addEventListener('change', handleChange)

    return () => {
      mediaQuery.removeEventListener('change', handleChange)
    }
  }, [])

  const handleSidebarToggle = () => {
    setIsSidebarOpen((currentValue) => !currentValue)
  }

  const handleSidebarClose = () => {
    if (!isDesktop) {
      setIsSidebarOpen(false)
    }
  }

  return (
    <div className={shellStyles.shell}>
      <Sidebar isOpen={isSidebarOpen} isDesktop={isDesktop} onClose={handleSidebarClose} />

      {!isDesktop && isSidebarOpen ? (
        <button
          type="button"
          className={shellStyles.backdrop}
          aria-label="Fechar menu lateral"
          onClick={handleSidebarClose}
        />
      ) : null}

      <div className={shellStyles.mainArea}>
        <Topbar isSidebarOpen={isSidebarOpen} onSidebarToggle={handleSidebarToggle} />

        <main id="main-content" className={shellStyles.content} tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}