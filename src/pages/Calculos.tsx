import React, { useState, useEffect } from 'react';
import { Box, Typography, Grid, Paper, CircularProgress, Alert } from '@mui/material';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import PaymentsIcon from '@mui/icons-material/Payments';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import { getVentas } from '../services/ventas';
import type { Venta } from '../services/ventas';

const Calculos: React.FC = () => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchVentasData = async () => {
      try {
        const data = await getVentas();
        setVentas(data);
      } catch (e) {
        setErrorMsg('Error al cargar ventas');
      }
      setLoading(false);
    };
    fetchVentasData();
  }, []);

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>;
  if (errorMsg) return <Alert severity="error">{errorMsg}</Alert>;

  // Calculations
  const totalGenerado = ventas.reduce((acc, v) => acc + (v.estado === 'Completado' ? v.totalVenta : 0), 0);
  
  const ventasEfectivo = ventas.reduce((acc, v) => {
      if (v.estado !== 'Completado') return acc;
      if (v.montoEfectivo !== undefined && v.montoEfectivo !== null) return acc + v.montoEfectivo;
      return acc + (v.metodoPago === 'Efectivo' ? v.totalVenta : 0);
  }, 0);
  
  const ventasTransferencia = ventas.reduce((acc, v) => {
      if (v.estado !== 'Completado') return acc;
      if (v.montoTransferencia !== undefined && v.montoTransferencia !== null) return acc + v.montoTransferencia;
      return acc + (v.metodoPago === 'Transferencia' ? v.totalVenta : 0);
  }, 0);
  
  let totalProductosVendidos = 0;
  const productCountMap: Record<string, number> = {};

  ventas.forEach(v => {
      if (v.estado === 'Completado') {
          v.productos.forEach(prodStr => {
              try {
                  const item = JSON.parse(prodStr);
                  totalProductosVendidos += item.cantidad;
                  
                  if (productCountMap[item.nombre]) {
                      productCountMap[item.nombre] += item.cantidad;
                  } else {
                      productCountMap[item.nombre] = item.cantidad;
                  }
              } catch(e) {}
          });
      }
  });

  const topProductos = Object.entries(productCountMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

  const StatCard = ({ title, value, icon, color }: any) => (
      <Paper elevation={2} sx={{ p: 3, display: 'flex', alignItems: 'center', borderRadius: 4, height: '100%' }}>
          <Box sx={{ p: 2, mr: 2, borderRadius: 3, bgcolor: `${color}.light`, color: `${color}.main`, display: 'flex' }}>
              {icon}
          </Box>
          <Box>
              <Typography variant="body2" color="text.secondary" fontWeight="bold">{title}</Typography>
              <Typography variant="h5" fontWeight="bold">{value}</Typography>
          </Box>
      </Paper>
  );

  return (
    <Box sx={{ pb: 10 }}>
      {/* Top Stats */}
      <Grid container spacing={3} mb={4}>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard 
                  title="Total Vendido" 
                  value={`Q${totalGenerado.toFixed(2)}`} 
                  icon={<AttachMoneyIcon fontSize="large" />} 
                  color="success" 
              />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard 
                  title="Pagos Efectivo" 
                  value={`Q${ventasEfectivo.toFixed(2)}`} 
                  icon={<PaymentsIcon fontSize="large" />} 
                  color="primary" 
              />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard 
                  title="Pagos Transferencia" 
                  value={`Q${ventasTransferencia.toFixed(2)}`} 
                  icon={<AccountBalanceIcon fontSize="large" />} 
                  color="secondary" 
              />
          </Grid>
          <Grid size={{ xs: 12, sm: 6, md: 3 }}>
              <StatCard 
                  title="Productos Vendidos" 
                  value={totalProductosVendidos} 
                  icon={<ShoppingBagIcon fontSize="large" />} 
                  color="warning" 
              />
          </Grid>
      </Grid>

      {/* Detail Stats */}
      <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 6 }}>
              <Paper elevation={2} sx={{ p: 3, borderRadius: 4, height: '100%' }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>
                      Productos Más Vendidos
                  </Typography>
                  {topProductos.length > 0 ? (
                      topProductos.map(([nombre, cantidad], idx) => (
                          <Box key={nombre} sx={{ display: 'flex', justifyContent: 'space-between', p: 1, borderBottom: idx !== topProductos.length - 1 ? '1px solid #eee' : 'none' }}>
                               <Typography variant="body1">{nombre}</Typography>
                               <Typography variant="body1" fontWeight="bold">{cantidad} unds.</Typography>
                          </Box>
                      ))
                  ) : (
                      <Typography variant="body2" color="text.secondary">No hay datos suficientes.</Typography>
                  )}
              </Paper>
          </Grid>
      </Grid>
    </Box>
  );
};

export default Calculos;
