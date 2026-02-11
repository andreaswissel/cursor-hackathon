import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import "./index.css";
import { AuthProvider } from "./contexts/auth-context";
import { ProtectedRoute } from "./components/protected-route";
import { HomePage } from "./pages/home";
import { SessionPage } from "./pages/session";
import { LoginPage } from "./pages/login";
import { AuthCallbackPage } from "./pages/auth-callback";
import { SettingsPage } from "./pages/settings";
import { PrivacyPage } from "./pages/privacy";
import { DiscoverPage } from "./pages/discover";
import { ImaginePage } from "./pages/imagine";
import { DocumentPage } from "./pages/document";
import { RestrictedDataPage } from "./pages/restricted-data";
import { ChangelogPage } from "./pages/changelog";
import { OnboardingPage } from "./pages/onboarding";
import { TeamSettingsPage } from "./pages/team-settings";
import { InvitePage } from "./pages/invite";
import { ProjectKnowledgePage } from "./pages/project-knowledge";
import { FlowPage } from "./pages/flow";
import { RoadmapPage } from "./pages/roadmap";
import { ToolsPage } from "./pages/tools";
import { ToolsGuidedToursPage } from "./pages/tools-guided-tours";
import { ToolsFeedbackFormsPage } from "./pages/tools-feedback-forms";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/auth/callback" element={<AuthCallbackPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/restricted-data" element={<RestrictedDataPage />} />
          <Route path="/changelog" element={<ChangelogPage />} />
          <Route path="/invite/:token" element={<InvitePage />} />
          <Route
            path="/onboarding"
            element={
              <ProtectedRoute>
                <OnboardingPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <HomePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/session/:sessionId"
            element={
              <ProtectedRoute>
                <SessionPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/imagine"
            element={
              <ProtectedRoute>
                <ImaginePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/flow"
            element={
              <ProtectedRoute>
                <FlowPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/roadmap"
            element={<Navigate to="/tools/roadmap" replace />}
          />
          <Route
            path="/document"
            element={<Navigate to="/tools/documents" replace />}
          />
          <Route
            path="/tools"
            element={
              <ProtectedRoute>
                <ToolsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/roadmap"
            element={
              <ProtectedRoute>
                <RoadmapPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/documents"
            element={
              <ProtectedRoute>
                <DocumentPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/guided-tours"
            element={
              <ProtectedRoute>
                <ToolsGuidedToursPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/tools/feedback-forms"
            element={
              <ProtectedRoute>
                <ToolsFeedbackFormsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/discover"
            element={
              <ProtectedRoute>
                <DiscoverPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <SettingsPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/project/:projectId/knowledge"
            element={
              <ProtectedRoute>
                <ProjectKnowledgePage />
              </ProtectedRoute>
            }
          />
          <Route
            path="/team/:teamId/settings"
            element={
              <ProtectedRoute>
                <TeamSettingsPage />
              </ProtectedRoute>
            }
          />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  </React.StrictMode>
);
