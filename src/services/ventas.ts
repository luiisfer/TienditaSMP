import { databases, appwriteConfig, ID } from '../lib/appwrite';
import type { Models } from 'appwrite';

export interface VentaItem {
  productoId: string;
  nombre: string;
  precio: number;
  cantidad: number;
}

export interface Venta extends Models.Document {
    nombreCliente: string;
    productos: string[]; // JSON stringified VentaItem[]
    totalVenta: number;
    metodoPago: string;
    estado: string;
    observaciones: string;
    fechaHora: string;
    montoEfectivo?: number;
    montoTransferencia?: number;
}

export const createVenta = async (
    nombreCliente: string,
    productosItems: VentaItem[],
    totalVenta: number,
    metodoPago: string,
    estado: string,
    observaciones: string,
    montoEfectivo?: number,
    montoTransferencia?: number
) => {
    try {
        const productosStr = productosItems.map(item => JSON.stringify(item));
        const response = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.ventasCollectionId,
            ID.unique(),
            {
                nombreCliente,
                productos: productosStr,
                totalVenta,
                metodoPago,
                estado,
                observaciones,
                montoEfectivo,
                montoTransferencia,
                fechaHora: new Date().toISOString()
            }
        );
        return response as unknown as Venta;
    } catch (error) {
        console.error('Error creating venta', error);
        throw error;
    }
};

export const getVentas = async () => {
    try {
        const response = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.ventasCollectionId
        );
        return response.documents as unknown as Venta[];
    } catch (error) {
        console.error('Error getting ventas', error);
        throw error;
    }
};

export const updateVentaCompleta = async (
    documentId: string, 
    nuevoEstado: string, 
    nuevasObservaciones: string, 
    nuevosProductos: string[],
    nuevoTotal: number,
    nuevoMontoEfectivo?: number,
    nuevoMontoTransferencia?: number
) => {
    try {
        const response = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.ventasCollectionId,
            documentId,
            {
                estado: nuevoEstado,
                observaciones: nuevasObservaciones,
                productos: nuevosProductos,
                totalVenta: nuevoTotal,
                montoEfectivo: nuevoMontoEfectivo,
                montoTransferencia: nuevoMontoTransferencia
            }
        );
        return response as unknown as Venta;
    } catch (error) {
        console.error('Error updating venta', error);
        throw error;
    }
};

export const deleteVenta = async (documentId: string) => {
    try {
        await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.ventasCollectionId,
            documentId
        );
        return true;
    } catch (error) {
        console.error('Error deleting venta', error);
        throw error;
    }
};
