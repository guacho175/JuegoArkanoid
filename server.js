import express from 'express';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
// Usa la variable de entorno PORT proporcionada por Cloud Run, o 8080 por defecto
const port = process.env.PORT || 8080;

app.use(express.static(join(__dirname, 'dist')));

// Manejar rutas con cliente react/vite
app.get('*', (req, res) => {
  res.sendFile(join(__dirname, 'dist', 'index.html'));
});

// Asegurarse de escuchar en 0.0.0.0
app.listen(port, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${port}`);
});
