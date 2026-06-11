import React, { useState, useEffect } from 'react';
import {
  Typography, Box, Card, CardContent, Grid, CircularProgress, 
  IconButton, Chip, Dialog, DialogTitle, DialogContent, DialogActions, 
  Button, MenuItem, Select, FormControl, InputLabel, Snackbar, Alert, TextField, Divider
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getVentas, updateVentaCompleta, deleteVenta } from '../services/ventas';
import type { Venta, VentaItem } from '../services/ventas';
import { getProductos, updateProducto } from '../services/productos';

const HistorialVentas: React.FC = () => {
  const [ventas, setVentas] = useState<Venta[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedVenta, setSelectedVenta] = useState<Venta | null>(null);
  const [nuevoEstado, setNuevoEstado] = useState('');
  const [nuevoMetodoPago, setNuevoMetodoPago] = useState('');
  const [nuevoMontoEfectivo, setNuevoMontoEfectivo] = useState<number | ''>('');
  const [nuevoMontoTransferencia, setNuevoMontoTransferencia] = useState<number | ''>('');
  const [nuevasObservaciones, setNuevasObservaciones] = useState('');
  const [editarCarrito, setEditarCarrito] = useState<VentaItem[]>([]);
  
  const [msg, setMsg] = useState({ type: '', text: '' });

  const fetchVentasData = async () => {
    setLoading(true);
    try {
      // Obtenemos las ventas (recomendado ordenarlas por fecha en el futuro usando queries de Appwrite)
      const data = await getVentas();
      // Ordenamiento básico local (las más nuevas primero)
      const sortedData = data.sort((a, b) => new Date(b.fechaHora).getTime() - new Date(a.fechaHora).getTime());
      setVentas(sortedData);
    } catch (e: any) {
      setMsg({ type: 'error', text: 'Error al cargar ventas: ' + (e.message || '') });
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchVentasData();
  }, []);

  const handleOpenEdit = (venta: Venta) => {
    setSelectedVenta(venta);
    setNuevoEstado(venta.estado);
    setNuevoMetodoPago(venta.metodoPago);
    setNuevoMontoEfectivo(venta.montoEfectivo !== undefined ? venta.montoEfectivo : '');
    setNuevoMontoTransferencia(venta.montoTransferencia !== undefined ? venta.montoTransferencia : '');
    setNuevasObservaciones(venta.observaciones || '');
    
    const parsedCarrito = venta.productos.map(p => {
       try { return JSON.parse(p); } catch { return null; }
    }).filter(Boolean);
    
    setEditarCarrito(parsedCarrito);
    setOpenDialog(true);
  };

  const handleCloseEdit = () => {
    setOpenDialog(false);
    setSelectedVenta(null);
  };

  const updateCantidad = (index: number, delta: number) => {
    setEditarCarrito(prev => {
      const newArr = [...prev];
      const newCantidad = Math.max(1, newArr[index].cantidad + delta);
      newArr[index] = { ...newArr[index], cantidad: newCantidad };
      return newArr;
    });
  };

  const removeProductFromEdit = (index: number) => {
    setEditarCarrito(prev => prev.filter((_, i) => i !== index));
  };

  const handleSaveEdit = async () => {
    if (!selectedVenta) return;
    try {
      if (editarCarrito.length === 0) {
        setMsg({ type: 'error', text: 'La venta no puede quedar sin productos.' });
        return;
      }

      const totalCalculado = editarCarrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0);
      const strProductos = editarCarrito.map(item => JSON.stringify(item));

      let finalEfectivo = 0;
      let finalTransferencia = 0;

      if (nuevoMetodoPago === 'Mixto') {
        finalEfectivo = Number(nuevoMontoEfectivo);
        finalTransferencia = Number(nuevoMontoTransferencia);
        if (Math.abs((finalEfectivo + finalTransferencia) - totalCalculado) > 0.01) {
          setMsg({ type: 'error', text: 'La suma de Efectivo y Transferencia debe ser igual al Total Calculado' });
          return;
        }
      } else if (nuevoMetodoPago === 'Efectivo') {
        finalEfectivo = totalCalculado;
      } else if (nuevoMetodoPago === 'Transferencia') {
        finalTransferencia = totalCalculado;
      }

      await updateVentaCompleta(selectedVenta.$id, nuevoEstado, nuevasObservaciones, strProductos, totalCalculado, finalEfectivo, finalTransferencia);
      
      setMsg({ type: 'success', text: 'Venta actualizada correctamente' });
      handleCloseEdit();
      fetchVentasData();
    } catch (e: any) {
      setMsg({ type: 'error', text: 'Error al actualizar: ' + (e.message || '') });
    }
  };

  const handleDelete = async (venta: Venta) => {
    if (confirm('¿Estás seguro de eliminar esta venta del historial? Se restaurará el stock de los productos vendidos.')) {
      try {
        if (venta.estado === 'Completado') {
          // getProductos resolverá de forma instantánea gracias a la caché en memoria
          const productosInv = await getProductos();
          
          // Agrupar incrementos de stock por ID de producto para evitar escrituras duplicadas
          const incrementosStock: Record<string, number> = {};
          
          for (const prodStr of venta.productos) {
            try {
              const item = JSON.parse(prodStr);
              const prod = productosInv.find(p => p.$id === item.productoId);
              if (prod) {
                if (prod.isCombo) {
                  // Si es un combo, se restaura el stock de sus subproductos (que fue el que se descontó al vender)
                  const comboItems = prod.productosCombo || [];
                  for (const comboItemStr of comboItems) {
                    try {
                      const comboItem = JSON.parse(comboItemStr);
                      const subProductoId = comboItem.productoId;
                      const cantidadRestaurar = item.cantidad * comboItem.cantidad;
                      incrementosStock[subProductoId] = (incrementosStock[subProductoId] || 0) + cantidadRestaurar;
                    } catch (e) {
                      console.error('Error al analizar combo item en HistorialVentas', e);
                    }
                  }
                } else {
                  // Si es producto normal, se restaura su propio stock
                  incrementosStock[item.productoId] = (incrementosStock[item.productoId] || 0) + item.cantidad;
                }
              }
            } catch(e) {}
          }
          
          // Lanzar todas las actualizaciones a la base de datos en paralelo
          const updatePromises: Promise<any>[] = [];
          for (const [productoId, incremento] of Object.entries(incrementosStock)) {
            const prod = productosInv.find(p => p.$id === productoId);
            if (prod) {
              const newStock = (prod.stock || 0) + incremento;
              updatePromises.push(
                updateProducto(prod.$id, prod.nombre, prod.precio, newStock, prod.isCombo, prod.productosCombo)
              );
            }
          }
          
          if (updatePromises.length > 0) {
            await Promise.all(updatePromises);
          }
        }
        await deleteVenta(venta.$id);
        setMsg({ type: 'success', text: 'Venta eliminada y stock restaurado' });
        fetchVentasData();
      } catch (e: any) {
         setMsg({ type: 'error', text: 'Error al eliminar: ' + (e.message || '') });
      }
    }
  };

  return (
    <Box sx={{ pb: 10 }}>
      <Typography variant="h5" fontWeight="bold" gutterBottom>
        Historial de Ventas
      </Typography>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}><CircularProgress /></Box>
      ) : (
        <Grid container spacing={2}>
          {ventas.map((venta) => (
            <Grid size={{ xs: 12, md: 6 }} key={venta.$id}>
              <Card elevation={2} sx={{ borderRadius: 3 }}>
                <CardContent sx={{ display: 'flex', flexDirection: 'column' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Typography variant="subtitle1" fontWeight="bold">
                        {venta.nombreCliente || 'Cliente General'}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {new Date(venta.fechaHora).toLocaleString()}
                      </Typography>
                    </Box>
                    <Box>
                      <Chip 
                        label={venta.estado} 
                        color={venta.estado === 'Completado' ? 'success' : 'warning'} 
                        size="small" 
                        sx={{ fontWeight: 'bold' }}
                      />
                    </Box>
                  </Box>

                  <Typography variant="h5" color="primary.main" fontWeight="bold" sx={{ my: 1 }}>
                    Q{venta.totalVenta.toFixed(2)}
                  </Typography>

                  <Typography variant="body2" sx={{ mb: 1 }}>
                    <strong>Método:</strong> {venta.metodoPago} 
                    {venta.metodoPago === 'Mixto' && (
                        <span style={{ display: 'block', fontSize: '0.85em', color: '#666' }}>
                          (Efec: Q{venta.montoEfectivo?.toFixed(2) || '0.00'} / Transf: Q{venta.montoTransferencia?.toFixed(2) || '0.00'})
                        </span>
                    )}
                    <br/>
                    <strong>Artículos:</strong> {venta.productos.length} items
                  </Typography>

                  <Box sx={{ mb: 2, p: 1, bgcolor: 'background.default', borderRadius: 2 }}>
                    {venta.productos.map((prodStr, idx) => {
                       try {
                         const item = JSON.parse(prodStr);
                         return (
                           <Typography key={idx} variant="caption" display="block">
                              {item.cantidad}x {item.nombre} (Q{item.precio.toFixed(2)} c/u)
                           </Typography>
                         );
                       } catch(e) { return null; }
                    })}
                  </Box>

                  {venta.observaciones && (
                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic', mb: 2 }}>
                      " {venta.observaciones} "
                    </Typography>
                  )}

                  <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 'auto' }}>
                    <IconButton color="primary" onClick={() => handleOpenEdit(venta)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(venta)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>

                </CardContent>
              </Card>
            </Grid>
          ))}
          {ventas.length === 0 && (
             <Typography sx={{ mt: 4, width: '100%', textAlign: 'center' }} color="text.secondary">
               No hay ventas registradas.
             </Typography>
          )}
        </Grid>
      )}

      {/* Edit State Dialog */}
      <Dialog open={openDialog} onClose={handleCloseEdit} fullWidth maxWidth="sm">
        <DialogTitle>Editar Estado de Venta</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Estado de la Venta</InputLabel>
            <Select
              value={nuevoEstado}
              label="Estado de la Venta"
              onChange={(e) => setNuevoEstado(e.target.value)}
            >
              <MenuItem value="Completado">Completado</MenuItem>
              <MenuItem value="Pendiente">Pendiente</MenuItem>
              <MenuItem value="Cancelado">Cancelado</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mt: 2 }}>
            <InputLabel>Método de Pago</InputLabel>
            <Select
              value={nuevoMetodoPago}
              label="Método de Pago"
              onChange={(e) => setNuevoMetodoPago(e.target.value)}
            >
              <MenuItem value="Efectivo">Efectivo</MenuItem>
              <MenuItem value="Transferencia">Transferencia</MenuItem>
              <MenuItem value="Mixto">Mixto</MenuItem>
            </Select>
          </FormControl>

          {nuevoMetodoPago === 'Mixto' && (
            <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
              <TextField 
                label="Efectivo (Q)" 
                type="number" 
                size="small" 
                fullWidth 
                value={nuevoMontoEfectivo} 
                onChange={e => setNuevoMontoEfectivo(e.target.value ? Number(e.target.value) : '')} 
              />
              <TextField 
                label="Transferencia (Q)" 
                type="number" 
                size="small" 
                fullWidth 
                value={nuevoMontoTransferencia} 
                onChange={e => setNuevoMontoTransferencia(e.target.value ? Number(e.target.value) : '')} 
              />
            </Box>
          )}

          <TextField 
            fullWidth 
            margin="normal"
            label="Observaciones" 
            variant="outlined" 
            value={nuevasObservaciones}
            onChange={(e) => setNuevasObservaciones(e.target.value)}
          />

          <Divider sx={{ my: 2 }} />
          <Typography variant="subtitle2" gutterBottom fontWeight="bold">Productos de la Venta</Typography>
          
          <Box sx={{ flexGrow: 1, overflowY: 'auto', maxHeight: 300, bgcolor: 'background.default', p: 1, borderRadius: 2 }}>
            {editarCarrito.map((item, idx) => (
              <Box key={idx} sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1, p: 1, bgcolor: 'background.paper', borderRadius: 1 }}>
                <Box>
                  <Typography variant="body2" fontWeight="bold">{item.nombre}</Typography>
                  <Typography variant="caption" color="text.secondary">Q{item.precio.toFixed(2)} c/u</Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Button size="small" variant="outlined" onClick={() => updateCantidad(idx, -1)} sx={{ minWidth: 30, p: 0 }}>-</Button>
                  <Typography variant="body2" fontWeight="bold">{item.cantidad}</Typography>
                  <Button size="small" variant="outlined" onClick={() => updateCantidad(idx, 1)} sx={{ minWidth: 30, p: 0 }}>+</Button>
                  <IconButton size="small" color="error" onClick={() => removeProductFromEdit(idx)}>
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </Box>
              </Box>
            ))}
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
             <Typography fontWeight="bold">Nuevo Total Calculado:</Typography>
             <Typography fontWeight="bold" color="primary.main">
               Q{editarCarrito.reduce((acc, item) => acc + (item.precio * item.cantidad), 0).toFixed(2)}
             </Typography>
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseEdit} color="inherit">Cancelar</Button>
          <Button onClick={handleSaveEdit} variant="contained" color="primary">Guardar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!msg.text} autoHideDuration={4000} onClose={() => setMsg({ ...msg, text: '' })}>
        <Alert onClose={() => setMsg({ ...msg, text: '' })} severity={msg.type as any} sx={{ width: '100%' }}>
          {msg.text}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default HistorialVentas;
