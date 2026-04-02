import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
import { DesktopBackground } from './components/desktop/DesktopBackground'
import {
  DesktopBackgroundProvider,
  useDesktopBackground,
} from './components/desktop/DesktopBackgroundProvider'
import { I18nProvider } from './i18n/provider'
import { PrototypeThemeProvider } from './theme/provider'
import { DesktopRoute } from './routes/DesktopRoute'

const router = createBrowserRouter([
  {
    path: '/',
    element: <DesktopRoute />,
  },
  {
    path: '*',
    element: <Navigate to="/" replace />,
  },
])

function AppShell() {
  const { background } = useDesktopBackground()

  return (
    <>
      <DesktopBackground
        wallpaper={background.wallpaper}
        pageCount={background.pageCount}
        viewportProgress={background.viewportProgress}
      />
      <RouterProvider router={router} />
    </>
  )
}

function App() {
  return (
    <PrototypeThemeProvider>
      <I18nProvider>
        <DesktopBackgroundProvider>
          <AppShell />
        </DesktopBackgroundProvider>
      </I18nProvider>
    </PrototypeThemeProvider>
  )
}

export default App
