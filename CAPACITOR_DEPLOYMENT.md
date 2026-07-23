# 📱 Guía de Despliegue y Publicación con Capacitor — Monify

Esta guía detalla los pasos necesarios para empaquetar, compilar, firmar y publicar **Monify** en las tiendas oficiales de **Google Play Store** (Android) e **iOS App Store** (Apple) utilizando **Capacitor v6**.

---

## 🔍 1. Estado de Preparación del Proyecto

El proyecto Monify ya cuenta con una arquitectura diseñada para ser compatible con plataformas móviles nativas de manera inmediata:

1. **Detección de Plataforma (`usePlatform.ts`):** Centraliza la lógica de entorno mediante las APIs oficiales de `@capacitor/core` para discriminar entre `ios`, `android` y `web`.
2. **Persistencia de Sesión Híbrida (`src/lib/supabase.ts`):** Utiliza un adaptador de almacenamiento híbrido que cambia de forma inteligente entre `@capacitor/preferences` (almacenamiento nativo persistente en dispositivos móviles) y `localStorage` (en la web), asegurando que los usuarios mantengan iniciada su sesión al cerrar y abrir la aplicación nativa.
3. **Adaptabilidad del Diseño (Notch y Safe Area):**
   - El archivo `index.html` incluye `viewport-fit=cover` para extender la interfaz a pantalla completa.
   - La hoja de estilos global `src/assets/styles/main.css` respeta las áreas seguras de la pantalla (`padding-top: env(safe-area-inset-top)` y `padding-bottom: env(safe-area-inset-bottom)`) evitando que elementos críticos de la UI o barras de navegación queden ocultos bajo el notch, cámaras frontales o barras de navegación del dispositivo.
4. **Configuración de Capacitor (`capacitor.config.ts`):** Ya está configurado con el App ID (`com.monify.app`), nombre de la aplicación (`Monify`), directorio web de producción (`dist`) y configuración de esquemas seguros HTTPS para Android.

---

## 🛠️ 2. Requisitos Previos del Sistema

Antes de iniciar la compilación nativa, asegúrate de cumplir con los siguientes requisitos en tu máquina de desarrollo:

### Para Android
- **Node.js:** Versión `>= 20.11.0` (así como el gestor `pnpm`).
- **Android Studio:** Instalado con las últimas herramientas de compilación de Android.
- **Java Development Kit (JDK):** JDK 17 (versión recomendada y requerida por Capacitor v6 y Gradle de Android Studio).
- **Android SDK:** Configura las variables de entorno en tu shell (por ejemplo, en `.bashrc`, `.zshrc` o variables del sistema en Windows):
  ```bash
  export ANDROID_HOME=$HOME/Library/Android/sdk # (Ruta de ejemplo en macOS)
  export PATH=$PATH:$ANDROID_HOME/platform-tools
  export PATH=$PATH:$ANDROID_HOME/tools
  ```

### Para iOS
- **macOS:** Requisito de hardware obligatorio para compilar con Xcode.
- **Xcode:** Instalado desde la Mac App Store con las Command Line Tools habilitadas.
- **CocoaPods:** Gestor de dependencias de iOS (`sudo gem install cocoapods` o mediante `brew install cocoapods`).
- **Cuenta de Apple Developer:** Requerida para firmar el código nativo e instalar en dispositivos físicos, así como para publicar en la App Store ($99 USD/año).

---

## 🚀 3. Inicialización y Sincronización de Plataformas

Sigue estos pasos en la consola para inicializar los proyectos nativos:

### Paso 3.1: Compilar el Frontend de Producción
Capacitor requiere que los archivos HTML, JS y CSS existan en la carpeta `dist/` antes de sincronizar. Ejecuta:
```bash
pnpm build
```

### Paso 3.2: Agregar Plataformas Nativas
Añade las carpetas de proyectos nativos (esto se hace solo la primera vez):
```bash
# Agregar Android
npx cap add android

# Agregar iOS
npx cap add ios
```
*Esto generará los directorios `./android` y `./ios` en la raíz del proyecto.*

### Paso 3.3: Sincronizar el Código Web con el Nativo
Cada vez que realices cambios en el código Vue/Vite y ejecutes `pnpm build`, debes sincronizar esos archivos y las dependencias de plugins con los proyectos nativos utilizando:
```bash
npx cap sync
```

---

## 🎨 4. Generación Automática de Recursos (Iconos y Splash Screen)

Para evitar crear manualmente docenas de imágenes en distintos tamaños para iOS y Android, se recomienda utilizar la herramienta oficial de Capacitor para generar automáticamente el icono y la pantalla de carga (Splash Screen).

### Paso 4.1: Instalar Capacitor Assets
Instala el paquete oficial en el entorno de desarrollo:
```bash
pnpm add -D @capacitor/assets
```

### Paso 4.2: Preparar la Carpeta de Assets de Origen
Crea una carpeta llamada `assets/` en la raíz del proyecto con la siguiente estructura y archivos de alta resolución (preferiblemente PNG sin comprimir):
```
assets/
├── icon-only.png         # Icono base sin fondo (mínimo 1024x1024 px)
├── icon-foreground.png   # Primer plano para iconos adaptativos de Android (mínimo 512x512 px)
├── icon-background.png   # Color de fondo o patrón para iconos adaptativos de Android (mínimo 512x512 px)
└── splash.png            # Pantalla de carga universal (mínimo 2732x2732 px)
```

### Paso 4.3: Generar Recursos
Ejecuta el siguiente comando para compilar y distribuir todos los tamaños requeridos en los directorios de Android e iOS:
```bash
npx capacitor-assets generate
```

---

## ⚙️ 5. Configuraciones Específicas por Plataforma

Antes de compilar la versión final de producción, debes realizar ciertos ajustes específicos del sistema operativo.

### 🤖 Ajustes para Android

Abre el proyecto de Android en Android Studio:
```bash
npx cap open android
```

1. **Versión de la App y Código de Compilación (`android/app/build.gradle`):**
   Busca dentro del bloque `android { defaultConfig { ... } }` y actualiza:
   - `versionCode`: Un número entero que se incrementa en cada subida (ej. `1`, `2`, `3`).
   - `versionName`: La versión comercial de la app (ej. `"1.0.0"`).
2. **Nombre del Paquete (Application ID):**
   Asegúrate de que coincide con el ID registrado en Google Play Console (actualmente `com.monify.app` en `capacitor.config.ts`).
3. **Permiso de Reconocimiento de Voz y Grabación:**
   Monify incluye un asistente de voz incorporado. En Android, el WebView de sistema suele gestionar internamente la solicitud de permisos al usar la Web Speech API nativa. No obstante, si se detectan problemas de hardware, se puede añadir de manera explícita el permiso de grabación de audio dentro del archivo `android/app/src/main/AndroidManifest.xml` en la etiqueta `<manifest>`:
   ```xml
   <uses-permission android:name="android.permission.RECORD_AUDIO" />
   ```

### 🍎 Ajustes para iOS

Abre el proyecto de iOS en Xcode:
```bash
npx cap open ios
```

1. **Configuración de Firma (Signing & Capabilities):**
   - En el navegador de proyectos izquierdo de Xcode, selecciona el nodo raíz **App**.
   - Haz clic en la pestaña **Signing & Capabilities**.
   - Marca la casilla **Automatically manage signing**.
   - Selecciona tu **Team** (equipo de desarrollador de Apple).
   - Asegúrate de que el **Bundle Identifier** esté configurado como `com.monify.app`.
2. **Permisos Críticos en `Info.plist` (Reconocimiento de Voz y Micrófono):**
   Como Monify utiliza comandos de voz para crear transacciones rápidamente, **iOS requiere obligatoriamente** declarar en el archivo `Info.plist` las razones por las cuales se accede al micrófono y al motor de reconocimiento de voz de Apple. Si no se configuran, la aplicación se cerrará inesperadamente (crash) cuando el usuario intente usar la función de voz.

   En Xcode, abre el archivo `Info.plist` (generalmente bajo el directorio `App/App`) y añade las siguientes claves con sus respectivas descripciones en español:

   - **Privacy - Microphone Usage Description (`NSMicrophoneUsageDescription`):**
     *Valor (Texto):* `"Monify requiere acceso al micrófono para que puedas registrar gastos e ingresos dictando transacciones de voz."`
   - **Privacy - Speech Recognition Usage Description (`NSSpeechRecognitionUsageDescription`):**
     *Valor (Texto):* `"Monify utiliza el reconocimiento de voz para convertir tus dictados en transacciones detalladas de manera automática."`

   *O de forma directa en formato XML de código:*
   ```xml
   <key>NSMicrophoneUsageDescription</key>
   <string>Monify requiere acceso al micrófono para que puedas registrar gastos e ingresos dictando transacciones de voz.</string>
   <key>NSSpeechRecognitionUsageDescription</key>
   <string>Monify utiliza el reconocimiento de voz para convertir tus dictados en transacciones detalladas de manera automática.</string>
   ```

---

## 📦 6. Compilación de Producción y Firma

### 🤖 Distribución en Android (Archivo `.aab`)
Google Play Store requiere que las aplicaciones se suban en el formato **Android App Bundle (.aab)** y firmadas digitalmente.

1. Abre el proyecto en Android Studio (`npx cap open android`).
2. En el menú superior, ve a **Build** > **Generate Signed Bundle / APK...**
3. Selecciona **Android App Bundle** y presiona *Next*.
4. **Key store path:** Si no tienes uno, haz clic en *Create new...* y completa el formulario. Guarda este archivo `.jks` en un lugar seguro (y haz una copia de seguridad), ya que es obligatorio para firmar todas las actualizaciones futuras de la app.
5. Introduce la contraseña del keystore y de la clave, selecciona el alias y pulsa *Next*.
6. Elige el tipo de build **release** y haz clic en *Create*.
7. Al terminar el proceso, encontrarás el archivo compilado listo para subir en:
   `android/app/release/app-release.aab`

### 🍎 Distribución en iOS (Archivo `.ipa`)
Xcode se encarga de empaquetar y subir de manera directa tu aplicación a App Store Connect.

1. Abre el proyecto en Xcode (`npx cap open ios`).
2. Selecciona el dispositivo de destino general de la barra superior: **Any iOS Device (arm64)**.
3. En el menú superior, selecciona **Product** > **Archive**.
4. Xcode compilará el proyecto completo. Al terminar, se abrirá el gestor de archivos **Organizer**.
5. Haz clic en el botón **Distribute App** (a la derecha).
6. Selecciona el método de distribución **App Store Connect** y presiona *Next*.
7. Selecciona **Upload** para enviar la compilación directamente a los servidores de Apple para su procesamiento.
8. Sigue las pantallas de confirmación para que Xcode firme automáticamente la compilación usando tus certificados de desarrollador.

---

## 🏪 7. Proceso de Publicación Paso a Paso en Tiendas

Una vez generadas tus compilaciones, debes configurar las fichas de tu app en las respectivas consolas de publicación.

### 🤖 Publicación en Google Play Store

1. **Cuenta de Desarrollador:** Regístrate en [Google Play Console](https://play.google.com/console) (pago único de $25 USD).
2. **Crear Aplicación:**
   - Haz clic en **Crear aplicación**.
   - Elige el idioma predeterminado (Español) e indica si es una App o un Juego, y si es gratuita o de pago.
3. **Configuración Inicial de la Ficha:**
   - Completa las secciones obligatorias: Clasificación de contenido, Política de privacidad, Público objetivo, etc.
   - Declara que la app es para control financiero y no recopila datos bancarios directos de terceros (monitorea la entrada manual de información).
4. **Cargar Compilación en Canal de Pruebas o Producción:**
   - Te recomendamos iniciar con un canal de **Prueba interna** o **Prueba cerrada (Closed Testing)** para validar el comportamiento en dispositivos reales antes de ir a Producción.
   - Ve a **Producción** (o el canal de pruebas seleccionado) > **Crear nueva versión**.
   - Sube el archivo `.aab` generado anteriormente.
   - Describe las novedades de la versión (ej: *"¡Lanzamiento inicial de Monify!"*).
5. **Preparar la Ficha de Play Store:**
   - Sube el icono oficial (512x512 px, PNG).
   - Sube el gráfico de funciones (1024x500 px, JPG/PNG).
   - Añade un mínimo de 2 a 4 capturas de pantalla de la aplicación corriendo en un teléfono móvil.
6. **Enviar para Revisión:**
   - Haz clic en **Revisar y lanzar versión**. Una vez aprobado por el equipo de Google (este proceso suele tardar de 1 a 5 días laborables), tu app estará disponible públicamente.

---

## 🍎 Publicación en Apple App Store

1. **Cuenta de Desarrollador:** Únete al [Apple Developer Program](https://developer.apple.com/) ($99 USD anuales).
2. **Crear App en App Store Connect:**
   - Inicia sesión en [App Store Connect](https://appstoreconnect.apple.com/).
   - Dirígete a **Mis Apps** y haz clic en el botón **(+)** > **Nueva app**.
   - Elige la plataforma **iOS**, escribe el nombre `"Monify"`, selecciona el idioma principal e indica el **Bundle ID** (`com.monify.app`). El SKU puede ser cualquier identificador interno único (ej: `monify-app-sku`).
3. **Ficha de Información de la App:**
   - Completa la categoría principal (*Finanzas*) y añade la URL de soporte técnico y de política de privacidad.
4. **Subir Capturas de Pantalla:**
   - Apple requiere de forma estricta capturas de pantalla en tamaños específicos (especialmente para pantallas de iPhone de 6.5 pulgadas y 5.5 pulgadas).
5. **Vincular Compilación:**
   - Una vez que la compilación enviada por Xcode termine de procesarse internamente (recibirás un correo electrónico de confirmación), aparecerá disponible en la sección de **Compilación** de la versión de la app. Selecciónala y guárdala.
6. **TestFlight (Pruebas Opcionales pero Recomendadas):**
   - Puedes usar TestFlight para invitar a miembros de la familia a probar la app enviando invitaciones por correo electrónico. Al subir una compilación, esta queda disponible para pruebas de inmediato.
7. **Información de Inicio de Sesión para Revisión (App Review):**
   - El revisor de Apple necesita ingresar a la app para comprobar su correcto funcionamiento. En la sección **Información de inicio de sesión**, proporciona credenciales de prueba válidas (un email y contraseña pre-creados en tu base de datos de Supabase).
8. **Enviar para Revisión:**
   - Haz clic en **Enviar para revisión de la App Store**. El proceso de revisión de Apple suele ser ágil y tarda de 24 a 48 horas en promedio.

---

## 🔧 8. Depuración en Dispositivos Reales (Modo de Desarrollo)

Si deseas probar el funcionamiento y visualizar los logs de consola de la app nativa en tiempo real mientras usas tu dispositivo físico:

### Depuración en Android
1. Conecta tu teléfono Android por USB a tu ordenador.
2. Activa las **Opciones de desarrollador** y habilita la **Depuración USB** en los ajustes del teléfono.
3. Ejecuta el comando para compilar en modo directo:
   ```bash
   npx cap run android
   ```
4. Abre el navegador Google Chrome en tu ordenador y ve a la dirección `chrome://inspect`.
5. Busca tu dispositivo y haz clic en **Inspect** para abrir las herramientas de desarrollo (Consola, Red, Elementos).

### Depuración en iOS
1. Conecta tu iPhone por USB a tu ordenador Mac.
2. Abre el proyecto en Xcode y selecciona tu dispositivo físico en la barra de destino superior.
3. Ejecuta la app presionando el botón **Play (Run)** en Xcode o mediante la terminal:
   ```bash
   npx cap run ios
   ```
4. Abre el navegador Safari en tu Mac, dirígete a **Desarrollo (Develop)** > **[Nombre de tu iPhone]** > **localhost** para inspeccionar la interfaz móvil y depurar errores.
