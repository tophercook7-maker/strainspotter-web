import { Routes, Route, Navigate } from 'react-router-dom';
import Header from './components/Header';
import ImageUploadPage from './pages/ImageUploadPage';
import ResultPage from './pages/ResultPage';
import UserGalleryPage from './pages/UserGalleryPage';
import StrainDetails from './pages/StrainDetails';
import DevTools from './pages/DevTools';
import LoginPage from './pages/LoginPage';
import AuthCallback from './pages/AuthCallback';

export default function Router() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/" element={<Navigate to="/upload" replace />} />
        <Route path="/upload" element={<ImageUploadPage />} />
        <Route path="/result" element={<ResultPage />} />
        <Route path="/gallery" element={<UserGalleryPage />} />
        <Route path="/strain/:slug" element={<StrainDetails />} />
        <Route path="/dev" element={<DevTools />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
        {/* Legacy routes for compatibility */}
        <Route path="/scanner" element={<Navigate to="/upload" replace />} />
        <Route path="/scan/:id" element={<Navigate to="/result" replace />} />
      </Routes>
    </>
  );
}

