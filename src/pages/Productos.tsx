import React, { useState, useEffect } from 'react';
import {
  Typography,
  Box,
  Button,
  TextField,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Fab,
  Card,
  CardContent,
  IconButton,
  Grid,
  CircularProgress,
  Snackbar,
  Alert,
  FormControlLabel,
  Switch,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { getProductos, createProducto, updateProducto, deleteProducto } from '../services/productos';
import type { Producto } from '../services/productos';

const Productos: React.FC = () => {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [currentProducto, setCurrentProducto] = useState<Partial<Producto>>({});
  const [errorMsg, setErrorMsg] = useState('');
  const [comboItemProductoId, setComboItemProductoId] = useState<string>('');
  const [comboItemCantidad, setComboItemCantidad] = useState<number>(1);

  const fetchProductos = async () => {
    setLoading(true);
    try {
      const data = await getProductos();
      setProductos(data);
    } catch (e: any) {
      console.error(e);
      setErrorMsg('Error al cargar productos: ' + (e.message || ''));
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchProductos();
  }, []);

  const handleOpenDialog = (producto?: Producto) => {
    if (producto) {
      setCurrentProducto(producto);
    } else {
      setCurrentProducto({ nombre: '', precio: 0, stock: 0, isCombo: false, productosCombo: [] });
    }
    setComboItemProductoId('');
    setComboItemCantidad(1);
    setOpenDialog(true);
  };

  const handleCloseDialog = () => {
    setOpenDialog(false);
    setCurrentProducto({});
  };

  const handleSave = async () => {
    if (!currentProducto.nombre || currentProducto.precio === undefined) {
      setErrorMsg('El nombre y el precio son obligatorios');
      return;
    }
    const finalStock = currentProducto.isCombo ? 0 : (currentProducto.stock || 0);
    try {
      if (currentProducto.$id) {
        await updateProducto(currentProducto.$id, currentProducto.nombre, currentProducto.precio, finalStock, currentProducto.isCombo, currentProducto.productosCombo);
      } else {
        await createProducto(currentProducto.nombre, currentProducto.precio, finalStock, currentProducto.isCombo, currentProducto.productosCombo);
      }
      handleCloseDialog();
      fetchProductos();
    } catch (e: any) {
       console.error(e);
       setErrorMsg('Error al guardar el producto: ' + (e.message || 'Error desconocido'));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('¿Estás seguro de eliminar este producto?')) {
      try {
        await deleteProducto(id);
        fetchProductos();
      } catch (e: any) {
         console.error(e);
         setErrorMsg('Error al eliminar: ' + (e.message || ''));
      }
    }
  };

  return (
    <Box sx={{ pb: 10 }}>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <Grid container spacing={2}>
          {productos.map((prod) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={prod.$id}>
              <Card elevation={2}>
                <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, '&:last-child': { pb: 2 } }}>
                  <Box>
                    <Typography variant="h6" sx={{ fontWeight: 'bold' }}>{prod.nombre}</Typography>
                    <Typography variant="body1" color="text.secondary">
                      Precio: Q{prod.precio.toFixed(2)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {prod.isCombo ? <Chip label="Combo" size="small" color="secondary" /> : `Stock: ${prod.stock}`}
                    </Typography>
                  </Box>
                  <Box>
                    <IconButton color="primary" onClick={() => handleOpenDialog(prod)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(prod.$id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
          {productos.length === 0 && (
             <Typography sx={{ mt: 4, width: '100%', textAlign: 'center' }} color="text.secondary">
               No hay productos registrados.
             </Typography>
          )}
        </Grid>
      )}

      <Fab 
        color="primary" 
        aria-label="add" 
        sx={{ position: 'fixed', bottom: 16, right: 16 }}
        onClick={() => handleOpenDialog()}
      >
        <AddIcon />
      </Fab>

      <Dialog open={openDialog} onClose={handleCloseDialog} fullWidth maxWidth="sm">
        <DialogTitle>{currentProducto.$id ? 'Editar Producto' : 'Nuevo Producto'}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Nombre del Producto"
            type="text"
            fullWidth
            variant="outlined"
            value={currentProducto.nombre || ''}
            onChange={(e) => setCurrentProducto({ ...currentProducto, nombre: e.target.value })}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            margin="dense"
            label="Precio"
            type="number"
            fullWidth
            variant="outlined"
            inputProps={{ step: "0.01" }}
            value={currentProducto.precio === 0 && !currentProducto.$id ? '' : currentProducto.precio}
            onChange={(e) => setCurrentProducto({ ...currentProducto, precio: parseFloat(e.target.value) })}
            sx={{ mb: 2 }}
          />
          <FormControlLabel
            control={
              <Switch
                checked={currentProducto.isCombo || false}
                onChange={(e) => setCurrentProducto({ ...currentProducto, isCombo: e.target.checked, stock: 0, productosCombo: currentProducto.productosCombo || [] })}
              />
            }
            label="Es un Combo"
            sx={{ mb: 1, display: 'block' }}
          />
          {!currentProducto.isCombo ? (
              <TextField
                margin="dense"
                label="Cantidad en Stock"
                type="number"
                fullWidth
                variant="outlined"
                value={currentProducto.stock === 0 && !currentProducto.$id ? '' : currentProducto.stock}
                onChange={(e) => setCurrentProducto({ ...currentProducto, stock: parseInt(e.target.value) || 0 })}
              />
          ) : (
            <Box sx={{ mt: 2, p: 2, border: '1px solid #ddd', borderRadius: 2 }}>
              <Typography variant="subtitle2" gutterBottom>Productos del Combo</Typography>
              <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Producto</InputLabel>
                  <Select
                    value={comboItemProductoId}
                    label="Producto"
                    onChange={(e) => setComboItemProductoId(e.target.value)}
                  >
                    {productos.filter(p => !p.isCombo && p.$id !== currentProducto.$id).map(p => (
                      <MenuItem key={p.$id} value={p.$id}>{p.nombre}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <TextField
                  label="Cant."
                  type="number"
                  size="small"
                  sx={{ width: 80 }}
                  value={comboItemCantidad}
                  onChange={(e) => setComboItemCantidad(parseInt(e.target.value) || 1)}
                  inputProps={{ min: 1 }}
                />
                <Button 
                  variant="contained" 
                  onClick={() => {
                    if (!comboItemProductoId || comboItemCantidad < 1) return;
                    const newItem = JSON.stringify({ productoId: comboItemProductoId, cantidad: comboItemCantidad });
                    const currentList = currentProducto.productosCombo || [];
                    setCurrentProducto({ ...currentProducto, productosCombo: [...currentList, newItem] });
                    setComboItemProductoId('');
                    setComboItemCantidad(1);
                  }}
                >
                  Agregar
                </Button>
              </Box>
              <List dense disablePadding>
                {(currentProducto.productosCombo || []).map((itemStr, index) => {
                  try {
                    const item = JSON.parse(itemStr);
                    const prodName = productos.find(p => p.$id === item.productoId)?.nombre || 'Producto Desconocido';
                    return (
                      <ListItem key={index} disableGutters>
                        <ListItemText primary={`${item.cantidad}x ${prodName}`} />
                        <ListItemSecondaryAction>
                          <IconButton edge="end" aria-label="delete" onClick={() => {
                            const currentList = [...(currentProducto.productosCombo || [])];
                            currentList.splice(index, 1);
                            setCurrentProducto({ ...currentProducto, productosCombo: currentList });
                          }}>
                            <DeleteIcon />
                          </IconButton>
                        </ListItemSecondaryAction>
                      </ListItem>
                    );
                  } catch (e) {
                    return null;
                  }
                })}
                {!(currentProducto.productosCombo || []).length && (
                  <Typography variant="body2" color="text.secondary">No hay productos en este combo.</Typography>
                )}
              </List>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleCloseDialog} color="inherit">Cancelar</Button>
          <Button onClick={handleSave} variant="contained" color="primary">Guardar</Button>
        </DialogActions>
      </Dialog>

      <Snackbar open={!!errorMsg} autoHideDuration={6000} onClose={() => setErrorMsg('')}>
        <Alert onClose={() => setErrorMsg('')} severity="error" sx={{ width: '100%' }}>
          {errorMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default Productos;
