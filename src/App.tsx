import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom';
import { Layout } from '@/components/Layout';
import { ModuleGate } from '@/components/ModuleGate';
import Home from '@/pages/Home';
import Explore from '@/pages/Explore';
import PropertyDetail from '@/pages/PropertyDetail';
import Book from '@/pages/Book';
import Packages from '@/pages/Packages';
import OutboundTravel from '@/pages/OutboundTravel';
import TravelServices from '@/pages/TravelServices';
import TravelGuide from '@/pages/TravelGuide';
import About from '@/pages/About';
import Contact from '@/pages/Contact';
import Admin from '@/pages/Admin';
import { AdminGate } from '@/components/admin/admin-gate';
import NotFound from '@/pages/NotFound';

function ResortRedirect() {
  const { slug } = useParams();
  return <Navigate to={`/property/${slug}`} replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="/explore" element={<Explore />} />
          <Route path="/explore-maldives" element={<Navigate to="/explore" replace />} />
          <Route path="/property/:slug" element={<PropertyDetail />} />
          <Route path="/resorts/:slug" element={<ResortRedirect />} />
          <Route path="/book" element={<Book />} />
          <Route path="/packages" element={<Packages />} />
          <Route path="/outbound-travel" element={<ModuleGate id="outbound"><OutboundTravel /></ModuleGate>} />
          <Route path="/travel-services" element={<TravelServices />} />
          <Route path="/travel-guide" element={<TravelGuide />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/admin" element={<AdminGate><Admin /></AdminGate>} />
          <Route path="*" element={<NotFound />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}