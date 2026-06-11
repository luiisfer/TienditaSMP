import { Client, Databases, ID } from 'appwrite';

const client = new Client();

const endpoint = import.meta.env.VITE_APPWRITE_ENDPOINT;
const projectId = import.meta.env.VITE_APPWRITE_PROJECT_ID;
const databaseId = import.meta.env.VITE_APPWRITE_DATABASE_ID;
const productosCollectionId = import.meta.env.VITE_APPWRITE_COLLECTION_PRODUCTOS_ID;
const ventasCollectionId = import.meta.env.VITE_APPWRITE_COLLECTION_VENTAS_ID;

const isConfigured = !!(endpoint && projectId && databaseId && productosCollectionId && ventasCollectionId);

if (endpoint && projectId) {
    try {
        client.setEndpoint(endpoint).setProject(projectId);
    } catch (e) {
        console.error('Error configuring Appwrite Client:', e);
    }
} else {
    console.error('Appwrite VITE_APPWRITE_ENDPOINT or VITE_APPWRITE_PROJECT_ID is missing.');
}

export const databases = new Databases(client);

export const appwriteConfig = {
    databaseId,
    productosCollectionId,
    ventasCollectionId,
    isConfigured,
};

export { ID };

