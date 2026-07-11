# Ejecutar Brújula en local

Desde esta carpeta:

```powershell
.\start_local.ps1
```

O doble clic / terminal clásica:

```bat
start_local.bat
```

Opciones útiles:

```powershell
.\start_local.ps1 -Port 3001
.\start_local.ps1 -SkipOllama
.\start_local.ps1 -NoInstall
```

El script:

- verifica Python y npm;
- levanta Ollama si no está activo;
- comprueba el modelo `llama3.2:1b`;
- instala dependencias del frontend si falta `node_modules`;
- inicia Next en `http://localhost:3000`.

Si Ollama falla, Brújula sigue funcionando en modo resiliente con fallback local.
