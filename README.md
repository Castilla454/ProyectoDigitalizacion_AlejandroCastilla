# Game Developer Portfolio (Angular + Node.js)

Este proyecto es un portfolio profesional Full Stack.
- **Backend**: Node.js + Express (API y servidor de archivos).
- **Frontend**: Angular 17+ (Componentes, Señales, Standalone).

## Prerequisitos
Asegúrate de tener Node.js instalado (v18+).

## Instalación
Si no se han instalado las dependencias automáticamente:

1. **Backend**:
   ```bash
   npm install
   ```
2. **Frontend**:
   ```bash
   cd frontend
   npm install
   ```

## Cómo Ejecutar (Modo Producción)
Para ver la web funcionando completamente (Frontend servido por Node):

1. **Construir el Frontend**:
   ```bash
   npm run build:frontend
   ```
2. **Iniciar el Servidor**:
   ```bash
   npm start
   ```
3. Abrir **http://localhost:3000** en el navegador.

## Cómo Ejecutar (Modo Desarrollo)
Si quieres editar el código y ver cambios en tiempo real:

1. **Iniciar Backend**:
   ```bash
   node server.js
   ```
2. **Iniciar Frontend (en otra terminal)**:
   ```bash
   cd frontend
   ng serve
   ```
   (El frontend estará en http://localhost:4200 y el backend en http://localhost:3000).
   *Nota: Es posible que necesites configurar CORS o proxy si usas puertos distintos en dev.*

## Estructura
- `server.js`: Punto de entrada del servidor.
- `data/projects.json`: Datos de los proyectos.
- `frontend/src`: Código fuente de Angular.
  - `components/project-list`: Grid de proyectos.
  - `components/chatbot`: Widget de chat.
  - `services/`: Lógica de conexión con API.
