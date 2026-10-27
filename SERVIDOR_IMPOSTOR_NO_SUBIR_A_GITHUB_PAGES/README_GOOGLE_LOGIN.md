# Login obligatorio con Google (Chromebooks)

## 1) Crear el Client ID (Web) en Google Cloud
1. En Google Cloud Console crea/selecciona un proyecto.
2. Ve a **APIs & Services → Credentials**.
3. Crea **OAuth client ID** (tipo **Web application**).
4. En **Authorized JavaScript origins** añade tu dominio de Render, por ejemplo:
   - `https://classroom-impostor.onrender.com`
5. Copia el **Client ID**.

(Guía oficial sobre verificación del ID token y uso del botón: ver documentación de Google Identity Services.)

## 2) Configurar Render
En Render → tu servicio → **Environment** → **Add Environment Variable**:
- Key: `GOOGLE_CLIENT_ID`
- Value: `<tu client id>`

Render hará un redeploy al guardar.

## 3) Uso en la app
- Los alumnos deben pulsar **“Sign in with Google”**.
- El correo detectado aparece automáticamente y se usa para el histórico.