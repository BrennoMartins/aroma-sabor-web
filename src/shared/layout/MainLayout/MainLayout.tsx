import { Outlet } from 'react-router-dom'
import { Sidebar } from '../Sidebar/Sidebar'
import { Topbar } from '../Topbar/Topbar'

export function MainLayout() {
  return (
    <div className="app-frame">
      <Sidebar />

      <div className="app-main">
        <Topbar />

        <main className="app-main__content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}