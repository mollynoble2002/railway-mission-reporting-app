import { BrowserRouter, Route, Routes, Outlet, Link } from 'react-router-dom';
import { BottomNav, NetworkStatus, PrototypeBanner } from '../ui/components';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ReportEditorScreen } from '../screens/ReportEditorScreen';
import { UnsentScreen } from '../screens/UnsentScreen';
import { SubmittedScreen } from '../screens/SubmittedScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import {
  ComingSoonScreen,
  NewReportRedirect,
  NotFoundScreen,
  UrgentHelpScreen,
  VisitChooserScreen,
} from '../screens/UtilityScreens';
import { RuntimeProvider, useSyncSnapshot } from './RuntimeContext';

/**
 * Shell: prototype banner, header with the network indicator and a persistent Urgent help link,
 * the screen, and bottom navigation. Rendered only after the runtime has started.
 */
function Shell() {
  const snapshot = useSyncSnapshot();
  return (
    <div className="shell">
      <PrototypeBanner />
      <header className="app-header">
        <Link to="/" className="app-header__title">
          Reporting prototype
        </Link>
        <Link to="/help/urgent" className="btn btn--urgent btn--compact">
          Urgent help
        </Link>
      </header>
      <div className="app-status">
        <NetworkStatus snapshot={snapshot} />
      </div>
      <main className="app-main" id="main">
        <Outlet />
      </main>
      <BottomNav />
    </div>
  );
}

function AppRoutes() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<DashboardScreen />} />
        <Route path="incident/coming-soon" element={<ComingSoonScreen title="Report an incident" />} />
        <Route path="visits/new" element={<VisitChooserScreen />} />
        <Route path="new/:kind" element={<NewReportRedirect />} />
        <Route path="reports/:id" element={<ReportEditorScreen />} />
        <Route path="unsent" element={<UnsentScreen />} />
        <Route path="submitted" element={<SubmittedScreen />} />
        <Route path="settings" element={<SettingsScreen />} />
        <Route path="help/urgent" element={<UrgentHelpScreen />} />
        <Route path="*" element={<NotFoundScreen />} />
      </Route>
    </Routes>
  );
}

export function App() {
  return (
    <BrowserRouter>
      <RuntimeProvider>
        <AppRoutes />
      </RuntimeProvider>
    </BrowserRouter>
  );
}
