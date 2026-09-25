import { Navigate, Route, Routes } from "react-router-dom";

import AuthPage from "./pages/AuthPage";
import Dashboard from "./pages/Dashboard";
import Resume from "./pages/Resume";
import InterviewSetup from "./pages/InterviewSetup";
import Interview from "./pages/Interview";
import Results from "./pages/Results";
import History from "./pages/History";
import Analytics from "./pages/Analytics";
import ApiSettings from "./pages/ApiSettings";

import AppShell from "./components/layout/AppShell";
import ProtectedRoute from "./routes/ProtectedRoute";
import GettingStartedModal from "./components/common/GettingStartedModal";

export default function App() {
  return (
    <>
    <GettingStartedModal />
    <Routes>
      <Route path="/auth" element={<AuthPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route
            path="/dashboard"
            element={<Dashboard />}
          />

          <Route
            path="/resume"
            element={<Resume />}
          />

          <Route
            path="/interview/setup"
            element={<InterviewSetup />}
          />

          <Route
            path="/history"
            element={<History />}
          />

          <Route
            path="/analytics"
            element={<Analytics />}
          />
          <Route path="/settings/api" element={<ApiSettings />} />
          <Route path="/results" element={<Results />} />
        </Route>

        <Route
          path="/interview"
          element={<Interview />}
        />

      </Route>

      <Route
        path="/"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />

      <Route
        path="*"
        element={
          <Navigate
            to="/dashboard"
            replace
          />
        }
      />
    </Routes>
    </>
  );
}
