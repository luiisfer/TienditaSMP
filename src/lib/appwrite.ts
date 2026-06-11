import { Client, Databases, ID } from 'appwrite';

const client = new Client();

client
    .setEndpoint(import.meta.env.VITE_APPWRITE_ENDPOINT)
    .setProject(import.meta.env.VITE_APPWRITE_PROJECT_ID);

export const databases = new Databases(client);

export const appwriteConfig = {
    databaseId: import.meta.env.VITE_APPWRITE_DATABASE_ID,
    productosCollectionId: import.meta.env.VITE_APPWRITE_COLLECTION_PRODUCTOS_ID,
    ventasCollectionId: import.meta.env.VITE_APPWRITE_COLLECTION_VENTAS_ID,
};

export { ID };
