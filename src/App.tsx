import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/MainLayout';
import Ventas from './pages/Ventas';
import Productos from './pages/Productos';
import Calculos from './pages/Calculos';
import HistorialVentas from './pages/HistorialVentas';
import { appwriteConfig } from './lib/appwrite';
import { Container, Box, Paper, Typography, Button, Alert, List, ListItem, ListItemIcon, ListItemText } from '@mui/material';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const App: React.FC = () => {
  // Fallback UI if Appwrite is not configured
  if (!appwriteConfig.isConfigured) {
    const vars = [
      { key: 'VITE_APPWRITE_ENDPOINT', val: import.meta.env.VITE_APPWRITE_ENDPOINT, desc: 'URL del servidor de Appwrite (ej: https://cloud.appwrite.io/v1)' },
      { key: 'VITE_APPWRITE_PROJECT_ID', val: import.meta.env.VITE_APPWRITE_PROJECT_ID, desc: 'ID de tu proyecto de Appwrite' },
      { key: 'VITE_APPWRITE_DATABASE_ID', val: import.meta.env.VITE_APPWRITE_DATABASE_ID, desc: 'ID de la base de datos' },
      { key: 'VITE_APPWRITE_COLLECTION_PRODUCTOS_ID', val: import.meta.env.VITE_APPWRITE_COLLECTION_PRODUCTOS_ID, desc: 'ID de la colección de productos' },
      { key: 'VITE_APPWRITE_COLLECTION_VENTAS_ID', val: import.meta.env.VITE_APPWRITE_COLLECTION_VENTAS_ID, desc: 'ID de la colección de ventas' },
    ];

    return (
      <Container maxWidth="md">
        <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', py: 4 }}>
          <Paper elevation={4} sx={{ p: 4, borderRadius: 4, width: '100%' }}>
            <Box sx={{ textAlign: 'center', mb: 3 }}>
              <ErrorOutlineIcon color="warning" sx={{ fontSize: 64, mb: 1 }} />
              <Typography variant="h4" gutterBottom fontWeight="bold">
                Falta Configuración de Appwrite
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Tu aplicación se cargó pero no tiene acceso a las credenciales del servidor. Si estás desplegando en Appwrite Hosting u otra plataforma, debes configurar las siguientes variables de entorno.
              </Typography>
            </Box>

            <Alert severity="warning" sx={{ mb: 3 }}>
              Crea un archivo <strong>.env</strong> en la raíz del proyecto para desarrollo local, o agrega estas variables en el panel de control de tu plataforma de despliegue.
            </Alert>

            <Typography variant="h6" gutterBottom fontWeight="bold">
              Estado de las Variables:
            </Typography>
            <List sx={{ bgcolor: 'background.default', borderRadius: 2, p: 2, mb: 3 }}>
              {vars.map((v) => (
                <ListItem key={v.key} sx={{ py: 1 }}>
                  <ListItemIcon>
                    {v.val ? (
                      <CheckCircleOutlineIcon color="success" />
                    ) : (
                      <ErrorOutlineIcon color="error" />
                    )}
                  </ListItemIcon>
                  <ListItemText
                    primary={<strong>{v.key}</strong>}
                    secondary={`${v.desc} — ${v.val ? '✅ Configurado' : '❌ Falta configurar'}`}
                  />
                </ListItem>
              ))}
            </List>

            <Box sx={{ display: 'flex', justifyContent: 'center' }}>
              <Button 
                variant="contained" 
                color="primary" 
                size="large" 
                href="https://github.com/luiisfer/TienditaSMP#-configuraci%C3%B3n-del-backend-en-appwrite"
                target="_blank"
                rel="noopener noreferrer"
              >
                Ver Instrucciones en el README
              </Button>
            </Box>
          </Paper>
        </Box>
      </Container>
    );
  }

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

