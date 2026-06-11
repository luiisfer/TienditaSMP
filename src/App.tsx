import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import Ventas from './pages/Ventas';
import Productos from './pages/Productos';
import Calculos from './pages/Calculos';
import HistorialVentas from './pages/HistorialVentas';

const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<Ventas />} />
          <Route path="productos" element={<Productos />} />
          <Route path="calculos" element={<Calculos />} />
          <Route path="historial" element={<HistorialVentas />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
