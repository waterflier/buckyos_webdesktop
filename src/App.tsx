import { Navigate, RouterProvider, createBrowserRouter } from 'react-router-dom'
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

function App() {
  return (
    <PrototypeThemeProvider>
      <I18nProvider>
        <RouterProvider router={router} />
      </I18nProvider>
    </PrototypeThemeProvider>
  )
}

export default App
