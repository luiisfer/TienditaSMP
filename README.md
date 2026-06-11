# 🏪 Tiendita - Sistema de Punto de Venta (POS) e Inventario

Este es un sistema moderno e intuitivo de Punto de Venta (POS), control de inventario y registro de ventas diseñado para pequeños comercios ("Tienditas"). Está construido como una Single Page Application (SPA) responsiva y rápida.

---

## 🚀 Tecnologías Principales

*   **Frontend Core:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
*   **Herramienta de Construcción:** [Vite 7](https://vite.dev/)
*   **Diseño y Componentes:** [Material UI (MUI) v7](https://mui.com/) con iconos nativos y estilos personalizados.
*   **Enrutamiento:** [React Router v7](https://reactrouter.com/)
*   **Base de Datos y Backend-as-a-Service:** [Appwrite Cloud](https://appwrite.io/) (para base de datos en tiempo real y persistencia).

---

## 🛠️ Requisitos Previos

Antes de comenzar, asegúrate de tener instalado:
*   [Node.js](https://nodejs.org/) (versión 18.0.0 o superior recomendada)
*   [npm](https://www.npmjs.com/) (generalmente viene con Node.js)
*   Una cuenta activa en [Appwrite](https://appwrite.io/) (gratuita)

---

## 📋 Guía de Instalación y Configuración Paso a Paso

Sigue estos pasos para poner en marcha el proyecto en tu máquina local:

### 1. Descargar el Proyecto e Instalar Dependencias
Abre tu terminal en la carpeta raíz del proyecto y ejecuta:
```bash
npm install
```

### 2. Configurar Variables de Entorno
Copia el archivo de plantilla `.env.example` y renombralo como `.env`:
```bash
cp .env.example .env
```
Abre el archivo `.env` recién creado y completa las claves con las credenciales de tu proyecto en Appwrite (ver el siguiente paso).

---

## ⚙️ Configuración del Backend en Appwrite

Para conectar el sistema, necesitas crear una estructura en tu consola de Appwrite.

### Paso A: Crear Proyecto y Base de Datos
1. Inicia sesión en [Appwrite Console](https://cloud.appwrite.io/).
2. Crea un **Nuevo Proyecto** y asígnale un nombre (ej. `Tiendita`). Copia el **Project ID** y pégalo en tu `.env` como `VITE_APPWRITE_PROJECT_ID`.
3. Ve a la sección **Databases** y haz clic en **Create Database** (ej. `tiendita-db`). Copia el **Database ID** y pégalo en `.env` como `VITE_APPWRITE_DATABASE_ID`.

### Paso B: Colección de Productos
Crea una colección llamada `productos` (ID de colección recomendado: `productos`). En la pestaña **Settings** -> **Permissions**, añade un rol `Any` con permisos de **Create, Read, Update, Delete**.

En la pestaña **Attributes**, crea exactamente los siguientes campos:
| Clave del Atributo (Key) | Tipo | Requerido | Detalles |
| :--- | :--- | :--- | :--- |
| `nombre` | String | Sí | Nombre del producto |
| `precio` | Float / Double | Sí | Precio unitario de venta |
| `stock` | Integer | Sí | Cantidad disponible en inventario |
| `isCombo` | Boolean | No | Marca si es un paquete/combo (Default: `false`) |
| `productosCombo` | Array of Strings | No | IDs de productos individuales que integran el combo |

### Paso C: Colección de Ventas
Crea una colección llamada `ventas` (ID de colección recomendado: `ventas`). Al igual que con productos, configura los permisos de la colección agregando el rol `Any` con permisos de **Create, Read, Update, Delete**.

En la pestaña **Attributes**, crea exactamente los siguientes campos:
| Clave del Atributo (Key) | Tipo | Requerido | Detalles |
| :--- | :--- | :--- | :--- |
| `nombreCliente` | String | Sí | Nombre del cliente |
| `productos` | Array of Strings | Sí | Contiene ítems de venta en formato JSON stringificado |
| `totalVenta` | Float / Double | Sí | Total cobrado en la transacción |
| `metodoPago` | String | Sí | Método de pago utilizado (Efectivo, Transferencia, Mixto, etc.) |
| `estado` | String | Sí | Estado del pedido (ej. Entregado, Pendiente, Cancelado) |
| `observaciones` | String | No | Notas o detalles adicionales de la venta |
| `fechaHora` | String | Sí | Fecha y hora de la transacción (ISO 8601 string) |
| `montoEfectivo` | Float / Double | No | Monto pagado en efectivo (para pagos mixtos) |
| `montoTransferencia` | Float / Double | No | Monto pagado por transferencia (para pagos mixtos) |

---

## 💻 Ejecución del Proyecto

Una vez que configuraste tu archivo `.env` con las IDs correctas de tu proyecto de Appwrite:

### Iniciar Servidor de Desarrollo
Para correr la aplicación en modo desarrollo local:
```bash
npm run dev
```
La consola te dará una URL local (normalmente `http://localhost:5173`). Ábrela en tu navegador para ver la aplicación.

### Compilar para Producción
Para generar los archivos optimizados listos para desplegar:
```bash
npm run build
```
Esto creará una carpeta llamada `dist/` en la raíz del proyecto.

### Empaquetar Compilación (Opcional)
Si necesitas crear un archivo comprimido de la compilación para distribución rápida:
```bash
npm run build:zip
```
Esto creará un archivo `tiendita-build.tar.gz` en la raíz con todo el contenido de `dist/`.

---

## 📁 Estructura del Código

Aquí tienes un mapa rápido de cómo están organizados los archivos:

*   [`src/lib/appwrite.ts`](file:///c:/Repositorio/Tiendita/src/lib/appwrite.ts): Inicialización y exportación del cliente SDK de Appwrite.
*   [`src/services/`](file:///c:/Repositorio/Tiendita/src/services/): Lógica de comunicación directa con Appwrite.
    *   [`productos.ts`](file:///c:/Repositorio/Tiendita/src/services/productos.ts): Funciones CRUD para gestionar inventario, stock y combos.
    *   [`ventas.ts`](file:///c:/Repositorio/Tiendita/src/services/ventas.ts): Funciones para guardar, consultar y editar registros de ventas.
*   [`src/pages/`](file:///c:/Repositorio/Tiendita/src/pages/): Vistas principales del sistema.
    *   `Ventas.tsx`: Terminal de punto de venta (POS) para cobrar productos y combos.
    *   `Productos.tsx`: Panel administrativo de inventario y configuración de combos.
    *   `HistorialVentas.tsx`: Lista detallada de ventas anteriores con estados y filtros.
    *   `Calculos.tsx`: Reportes financieros y cuadres de caja diarios/mensuales.
*   [`src/components/MainLayout.tsx`](file:///c:/Repositorio/Tiendita/src/components/MainLayout.tsx): Barra de navegación lateral/superior y contenedor general de la UI.
