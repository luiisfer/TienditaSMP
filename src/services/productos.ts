import { databases, appwriteConfig, ID } from '../lib/appwrite';
import type { Models } from 'appwrite';

export interface Producto extends Models.Document {
    nombre: string;
    precio: number;
    stock: number;
    isCombo?: boolean;
    productosCombo?: string[];
}

let cachedProductos: Producto[] | null = null;

export const getProductos = async (forceRefresh = false) => {
    if (cachedProductos && !forceRefresh) {
        return cachedProductos;
    }
    try {
        const response = await databases.listDocuments(
            appwriteConfig.databaseId,
            appwriteConfig.productosCollectionId
        );
        cachedProductos = response.documents as unknown as Producto[];
        return cachedProductos;
    } catch (error) {
        console.error('Error getting productos', error);
        throw error;
    }
};

export const createProducto = async (nombre: string, precio: number, stock: number, isCombo: boolean = false, productosCombo: string[] = []) => {
    try {
        const response = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.productosCollectionId,
            ID.unique(),
            {
                nombre,
                precio,
                stock,
                isCombo,
                productosCombo
            }
        );
        const newProd = response as unknown as Producto;
        if (cachedProductos) {
            cachedProductos.push(newProd);
        }
        return newProd;
    } catch (error) {
        console.error('Error creating producto', error);
        throw error;
    }
};

export const updateProducto = async (documentId: string, nombre: string, precio: number, stock: number, isCombo: boolean = false, productosCombo: string[] = []) => {
    try {
        const response = await databases.updateDocument(
            appwriteConfig.databaseId,
            appwriteConfig.productosCollectionId,
            documentId,
            {
                nombre,
                precio,
                stock,
                isCombo,
                productosCombo
            }
        );
        const updated = response as unknown as Producto;
        if (cachedProductos) {
            cachedProductos = cachedProductos.map(p => p.$id === documentId ? updated : p);
        }
        return updated;
    } catch (error) {
        console.error('Error updating producto', error);
        throw error;
    }
};

export const deleteProducto = async (documentId: string) => {
    try {
        await databases.deleteDocument(
            appwriteConfig.databaseId,
            appwriteConfig.productosCollectionId,
            documentId
        );
        if (cachedProductos) {
            cachedProductos = cachedProductos.filter(p => p.$id !== documentId);
        }
        return true;
    } catch (error) {
        console.error('Error deleting producto', error);
        throw error;
    }
};
