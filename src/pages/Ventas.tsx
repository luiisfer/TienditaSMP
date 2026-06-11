import React, { useState, useEffect } from 'react';
import {
  Box, Typography, Grid, Card, CardActionArea, TextField,
  Button, IconButton, Divider, CircularProgress, Snackbar, Alert,
  ToggleButton, ToggleButtonGroup, Paper
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import { getProductos, updateProducto } from '../services/productos';
import type { Producto } from '../services/productos';
import { createVenta } from '../services/ventas';
import type { VentaItem } from '../services/ventas';

const Ventas: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  // Sale State
  const [cliente, setCliente] = useState('');
  const [cart, setCart] = useState<VentaItem[]>([]);
  const [metodoPago, setMetodoPago] = useState<string>('Efectivo');
  const [montoEfectivo, setMontoEfectivo] = useState<number | ''>('');
  const [montoTransferencia, setMontoTransferencia] = useState<number | ''>('');
  const [estado, setEstado] = useState<string>('Completado');
  const [observaciones, setObservaciones] = useState('');

  // UI State
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    const fetchProd = async () => {
      try {
        const data = await getProductos();
        setProductos(data);
      } catch (e) {
        setErrorMsg('Error al cargar productos');
      }
      setLoading(false);
    };
    fetchProd();
  }, []);

  const addToCart = (prod: Producto) => {
    setCart(prev => {
      const existing = prev.find(item => item.productoId === prod.$id);
      if (existing) {
        return prev.map(item =>
          item.productoId === prod.$id
            ? { ...item, cantidad: item.cantidad + 1 }
            : item
        );
      }
      return [...prev, { productoId: prod.$id, nombre: prod.nombre, precio: prod.precio, cantidad: 1 }];
    });
  };

  const removeFromCart = (productoId: string) => {
    setCart(prev => prev.filter(item => item.productoId !== productoId));
  };

  const totalVenta = cart.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);

  const handleSaveVenta = async (): Promise<boolean> => {
    if (cart.length === 0) {
      setErrorMsg('El carrito está vacío');
      return false;
    }
    let finalEfectivo = 0;
    let finalTransferencia = 0;

    if (metodoPago === 'Mixto') {
      finalEfectivo = Number(montoEfectivo);
      finalTransferencia = Number(montoTransferencia);

      if (Math.abs((finalEfectivo + finalTransferencia) - totalVenta) > 0.01) {
        setErrorMsg('La suma de Efectivo y Transferencia debe ser igual al Total');
        return false;
      }
    } else if (metodoPago === 'Efectivo') {
      finalEfectivo = totalVenta;
    } else if (metodoPago === 'Transferencia') {
      finalTransferencia = totalVenta;
    }

    setSaving(true);
    try {
      await createVenta(cliente || 'Cliente General', cart, totalVenta, metodoPago, estado, observaciones, finalEfectivo, finalTransferencia);

      if (estado === 'Completado') {
        // 1. Agrupar reducciones de stock por ID de producto para evitar llamadas redundantes
        const reduccionesStock: Record<string, number> = {};

        for (const item of cart) {
          const prod = productos.find(p => p.$id === item.productoId);
          if (prod) {
            if (prod.isCombo) {
              const comboItems = prod.productosCombo || [];
              for (const comboItemStr of comboItems) {
                try {
                  const comboItem = JSON.parse(comboItemStr);
                  const subProductoId = comboItem.productoId;
                  const cantidadReducir = item.cantidad * comboItem.cantidad;
                  reduccionesStock[subProductoId] = (reduccionesStock[subProductoId] || 0) + cantidadReducir;
                } catch (e) {
                  console.error('Error al analizar combo item en Ventas', e);
                }
              }
            } else {
              reduccionesStock[item.productoId] = (reduccionesStock[item.productoId] || 0) + item.cantidad;
            }
          }
        }

        // 2. Crear las promesas de actualización en paralelo y construir el listado local de productos actualizado
        const updatePromises: Promise<any>[] = [];
        const updatedProductosLocal = productos.map(prod => {
          const reduccion = reduccionesStock[prod.$id];
          if (reduccion && reduccion > 0) {
            const newStock = Math.max(0, (prod.stock || 0) - reduccion);

            // Agregar la promesa de actualización a la base de datos
            updatePromises.push(
              updateProducto(prod.$id, prod.nombre, prod.precio, newStock, prod.isCombo, prod.productosCombo)
            );

            // Retornar el producto con su stock decrementado localmente
            return {
              ...prod,
              stock: newStock
            };
          }
          return prod;
        });

        // 3. Ejecutar las actualizaciones de stock en segundo plano (no bloqueante)
        if (updatePromises.length > 0) {
          Promise.all(updatePromises).catch(err => {
            console.error('Error al actualizar el stock en segundo plano:', err);
            setErrorMsg('Advertencia: El stock no se pudo sincronizar en el servidor.');
          });
        }

        // 4. Actualizar el estado de React localmente con los stocks calculados de forma inmediata
        setProductos(updatedProductosLocal);
      }

      setSuccessMsg('Venta guardada correctamente');
      // Reset form
      setCliente('');
      setCart([]);
      setMetodoPago('Efectivo');
      setMontoEfectivo('');
      setMontoTransferencia('');
      setEstado('Completado');
      setObservaciones('');
      return true;
    } catch (e: any) {
      setErrorMsg('Error al guardar la venta: ' + e.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

   return (
    <Box sx={{ 
      display: 'flex', 
      flexDirection: { xs: 'column', md: 'row' }, 
      gap: 2, 
      height: { xs: 'auto', md: '100%' }, 
      overflow: { xs: 'visible', md: 'hidden' },
      pb: { xs: 5, md: 10 }
    }}>
      {/* Left side: Products catalog */}
      <Box sx={{ 
        flex: { xs: 'none', md: 2 }, 
        display: 'flex', 
        flexDirection: 'column',
        height: { xs: 'auto', md: '100%' },
        overflowY: { xs: 'visible', md: 'scroll' },
        WebkitOverflowScrolling: 'touch',
        touchAction: { xs: 'auto', md: 'pan-y' },
        pr: { xs: 0, md: 1 }
      }}>
        <Typography variant="h6" gutterBottom fontWeight="bold">Productos</Typography>
        {loading ? (
          <CircularProgress sx={{ display: 'block', m: 'auto' }} />
        ) : (
          <Grid container spacing={2} sx={{ touchAction: 'pan-y' }}>
            {productos.map(prod => (
              <Grid size={{ xs: 6, sm: 4, md: 3 }} key={prod.$id} sx={{ touchAction: 'pan-y' }}>
                <Card 
                  elevation={2} 
                  sx={{ 
                    height: '100%', 
                    borderRadius: 3, 
                    transition: 'transform 0.1s', 
                    '&:active': { transform: 'scale(0.95)' },
                    touchAction: 'pan-y'
                  }}
                >
                  <CardActionArea 
                    onClick={() => addToCart(prod)} 
                    sx={{ 
                      height: '100%', 
                      p: 2, 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'flex-start', 
                      justifyContent: 'space-between',
                      touchAction: 'pan-y'
                    }}
                  >
                    <Typography variant="subtitle1" fontWeight="bold" lineHeight={1.2} mb={1}>
                      {prod.nombre}
                    </Typography>
                    <Typography variant="body1" color="primary.main" fontWeight="bold">
                      Q{prod.precio.toFixed(2)}
                    </Typography>
                  </CardActionArea>
                </Card>
              </Grid>
            ))}
            {productos.length === 0 && (
              <Typography sx={{ mt: 4, width: '100%', textAlign: 'center' }} color="text.secondary">
                No hay productos. Agrega desde el módulo Productos.
              </Typography>
            )}
          </Grid>
        )}
      </Box>

      {/* Right side: Current Sale / Cart / Checkout */}
      <Box sx={{ 
        flex: { xs: 'none', md: 1 }, 
        display: 'flex', 
        flexDirection: 'column',
        height: { xs: 'auto', md: '100%' },
        overflow: { xs: 'visible', md: 'hidden' }
      }}>
        <Paper elevation={3} sx={{ p: 2, borderRadius: 4, display: 'flex', flexDirection: 'column', height: { xs: 'auto', md: '100%' }, overflow: { xs: 'visible', md: 'hidden' } }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1.5 }}>
            <ShoppingCartIcon color="primary" sx={{ mr: 1 }} />
            <Typography variant="h6" fontWeight="bold">Nueva Venta</Typography>
          </Box>
          
          {/* Totals and Save Button */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5, gap: 2 }}>
            <Box>
              <Typography variant="caption" color="text.secondary">Total</Typography>
              <Typography variant="h5" color="primary.main" fontWeight="bold">Q{totalVenta.toFixed(2)}</Typography>
            </Box>
            <Button 
              variant="contained" 
              color="primary" 
              size="medium" 
              onClick={handleSaveVenta}
              disabled={saving || cart.length === 0}
              sx={{ flexGrow: 1, py: 1, fontWeight: 'bold' }}
            >
              {saving ? <CircularProgress size={24} color="inherit" /> : 'Guardar Venta'}
            </Button>
          </Box>

          {/* Client & Comments responsive Grid */}
          <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
            <Grid size={6}>
              <TextField 
                fullWidth 
                size="small" 
                label="Cliente (Opcional)" 
                variant="outlined" 
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
              />
            </Grid>
            <Grid size={6}>
              <TextField 
                fullWidth 
                size="small" 
                label="Observaciones" 
                variant="outlined" 
                value={observaciones}
                onChange={(e) => setObservaciones(e.target.value)}
              />
            </Grid>
          </Grid>

          {/* Payment Method and State stacked vertically */}
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: 1.5 }}>
            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom>Método de Pago</Typography>
              <ToggleButtonGroup
                color="primary"
                value={metodoPago}
                exclusive
                onChange={(_, val) => val && setMetodoPago(val)}
                fullWidth
                size="small"
              >
                <ToggleButton value="Efectivo" sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Efectivo</ToggleButton>
                <ToggleButton value="Transferencia" sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Transferencia</ToggleButton>
                <ToggleButton value="Mixto" sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Mixto</ToggleButton>
              </ToggleButtonGroup>
            </Box>

            <Box>
              <Typography variant="caption" color="text.secondary" gutterBottom>Estado</Typography>
              <ToggleButtonGroup
                color="primary"
                value={estado}
                exclusive
                onChange={(_, val) => val && setEstado(val)}
                fullWidth
                size="small"
              >
                <ToggleButton value="Completado" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Completado</ToggleButton>
                <ToggleButton value="Pendiente" sx={{ fontSize: { xs: '0.75rem', sm: '0.875rem' } }}>Pendiente</ToggleButton>
              </ToggleButtonGroup>
            </Box>
          </Box>

          {metodoPago === 'Mixto' && (
            <Box sx={{ display: 'flex', gap: 2, mb: 1.5 }}>
              <TextField 
                label="Efectivo (Q)" 
                type="number" 
                size="small" 
                fullWidth 
                value={montoEfectivo} 
                onChange={e => setMontoEfectivo(e.target.value ? Number(e.target.value) : '')} 
              />
              <TextField 
                label="Transferencia (Q)" 
                type="number" 
                size="small" 
                fullWidth 
                value={montoTransferencia} 
                onChange={e => setMontoTransferencia(e.target.value ? Number(e.target.value) : '')} 
              />
            </Box>
          )}

          <Divider sx={{ mb: 1 }} />

          {/* Cart Items List */}
          <Typography variant="caption" color="text.secondary" gutterBottom>Productos Agregados</Typography>
          <Box sx={{ 
            flexGrow: { xs: 0, md: 1 }, 
            overflowY: { xs: 'visible', md: 'scroll' }, 
            minHeight: { xs: 'auto', md: 60 },
            WebkitOverflowScrolling: 'touch',
            touchAction: { xs: 'auto', md: 'pan-y' }
          }}>
            {cart.map(item => (
              <Box key={item.productoId} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
                <Box>
                  <Typography variant="body2" fontWeight="bold" lineHeight={1.2}>{item.cantidad}x {item.nombre}</Typography>
                  <Typography variant="caption" color="text.secondary">Q{item.precio.toFixed(2)} c/u</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" fontWeight="bold" sx={{ mr: 1 }}>
                    Q{(item.precio * item.cantidad).toFixed(2)}
                  </Typography>
                  <IconButton size="small" color="error" onClick={() => removeFromCart(item.productoId)} sx={{ p: 0.5 }}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}
            {cart.length === 0 && (
              <Typography variant="body2" color="text.secondary" align="center" sx={{ mt: 2 }}>
                Toca los productos para agregarlos
              </Typography>
            )}
          </Box>

        </Paper>
      </Box>

      <Snackbar open={!!successMsg} autoHideDuration={3000} onClose={() => setSuccessMsg('')}>
        <Alert onClose={() => setSuccessMsg('')} severity="success" sx={{ width: '100%' }}>
          {successMsg}
        </Alert>
      </Snackbar>
      <Snackbar open={!!errorMsg} autoHideDuration={4000} onClose={() => setErrorMsg('')}>
        <Alert onClose={() => setErrorMsg('')} severity="error" sx={{ width: '100%' }}>
          {errorMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Ventas;
