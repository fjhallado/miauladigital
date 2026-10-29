window.TIC_LECCIONES = [
  {
    "id": 1,
    "title": "Configuración inicial HTML",
    "summary": "Estructura y configuración de un documento HTML: DOCTYPE, html, head, meta, title, body y enlace CSS.",
    "example": "<!DOCTYPE html>\n<html lang=\"es\">\n<head>\n  <meta charset=\"UTF-8\">\n  <meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">\n  <title>Mi primera web</title>\n  <link rel=\"stylesheet\" href=\"estilos.css\">\n</head>\n<body>\n  <h1>Mi primera página</h1>\n  <p>Bienvenidos a TIC II.</p>\n</body>\n</html>",
    "css": "body { font-family: Arial, sans-serif; margin: 25px; color: #173452; } h1 { color: #175fa7; }",
    "activity": "Prepara la estructura de una página web y cambia su título. Explica la diferencia entre head y body.",
    "explain": "DOCTYPE indica HTML5. html delimita el documento. head contiene metadatos que no forman parte del contenido visible; title nombra la pestaña. body contiene lo visible. meta charset permite escribir tildes y ñ; viewport adapta la visualización al dispositivo. link conecta el fichero estilos.css (atención: CSS, no CCS)."
  },
  {
    "id": 2,
    "title": "Encabezados, párrafos y listas",
    "summary": "Organización de contenidos con títulos, párrafos, énfasis, saltos y listas ordenadas o no ordenadas.",
    "example": "<h1>Mi proyecto digital</h1>\n<h2>Quiénes somos</h2>\n<p>Diseñamos <strong>soluciones digitales</strong>.</p>\n<h3>Servicios</h3>\n<ul>\n  <li>Diseño web</li>\n  <li>Fotografía</li>\n</ul>\n<ol>\n  <li>Planificar</li>\n  <li>Crear</li>\n</ol>",
    "css": "body{font-family:Arial,sans-serif; padding:22px;color:#203954} h1{color:#245a9c} li{margin:7px 0}",
    "activity": "Crea una página con un h1, dos h2, tres párrafos y dos listas de distintos tipos.",
    "explain": "Los encabezados h1 a h6 organizan la información jerárquicamente, no solo cambian el tamaño. p crea párrafos; strong señala importancia; em indica énfasis. ul es una lista no ordenada, ol es ordenada y li representa cada elemento."
  },
  {
    "id": 3,
    "title": "Enlaces y navegación",
    "summary": "Enlaces entre páginas y secciones mediante a, href, id y nav.",
    "example": "<nav>\n  <a href=\"#inicio\">Inicio</a>\n  <a href=\"#contacto\">Contacto</a>\n  <a href=\"https://example.org\">Web externa</a>\n</nav>\n<section id=\"inicio\"><h2>Inicio</h2><p>Bienvenidos.</p></section>\n<section id=\"contacto\"><h2>Contacto</h2><p>Escríbenos.</p></section>",
    "css": "body{font-family:Arial,sans-serif;padding:22px} nav{background:#143a63;padding:14px} nav a{color:white;margin-right:20px} section{padding:12px}",
    "activity": "Crea un menú con tres enlaces internos y añade un enlace a otra página HTML.",
    "explain": "a crea un enlace y href indica el destino. href=\"#contacto\" conduce a un elemento cuyo atributo es id=\"contacto\" (sin # en el id). nav agrupa los enlaces principales. Para enlazar otra página usa href=\"contacto.html\"."
  },
  {
    "id": 4,
    "title": "Imágenes y rutas de archivos",
    "summary": "Inserción de fotografías con img, src, alt y dimensiones; organización de carpetas.",
    "example": "<h1>Galería</h1>\n<img src=\"https://placehold.co/400x220/234567/ffffff?text=Imagen\"\n     alt=\"Imagen de ejemplo\" width=\"400\">\n<p>Las imágenes se enlazan mediante una ruta.</p>",
    "css": "body{font-family:Arial,sans-serif;padding:22px} img{max-width:100%;height:auto;border-radius:12px;display:block}",
    "activity": "Crea una carpeta imagenes y muestra dos archivos locales utilizando alt descriptivo.",
    "explain": "img no tiene etiqueta de cierre. src apunta a una ruta local (por ejemplo imagenes/portatil.jpg) o a una URL; alt describe la imagen si no carga y ayuda a la accesibilidad. Con CSS max-width:100% y height:auto se mantienen las proporciones. En este simulador las rutas a archivos que no se hayan subido no se verán."
  },
  {
    "id": 5,
    "title": "Tablas HTML",
    "summary": "Filas, celdas, encabezados, caption y agrupaciones thead y tbody.",
    "example": "<h1>Catálogo de productos</h1>\n<table>\n <caption>Productos disponibles</caption>\n <thead><tr><th>Producto</th><th>Precio</th><th>Stock</th></tr></thead>\n <tbody>\n  <tr><td>Portátil</td><td>650 €</td><td>12</td></tr>\n  <tr><td>Ratón</td><td>25 €</td><td>30</td></tr>\n  <tr><td>Teclado</td><td>45 €</td><td>18</td></tr>\n </tbody>\n</table>",
    "css": "body{font-family:Arial,sans-serif;padding:22px} table{width:90%;border-collapse:collapse;margin:20px auto} th{background:#234567;color:white;padding:12px} td{border:1px solid gray;padding:10px;text-align:center} tr:nth-child(even){background:#eeeeee}",
    "activity": "Crea una tabla con al menos 4 columnas y 5 filas de datos. Incluye caption y dale estilos CSS.",
    "explain": "Las tablas representan datos relacionados por filas y columnas; no se utilizan para distribuir toda una página. table define la tabla; tr una fila; th un encabezado; td una celda de datos; caption el título. thead y tbody agrupan las partes de la tabla."
  },
  {
    "id": 6,
    "title": "Formularios HTML",
    "summary": "Recogida de información con form, label, input, textarea, select y button.",
    "example": "<h1>Contacto</h1>\n<form>\n <label for=\"nombre\">Nombre</label>\n <input type=\"text\" id=\"nombre\" name=\"nombre\" required>\n <label for=\"correo\">Correo electrónico</label>\n <input type=\"email\" id=\"correo\" name=\"correo\">\n <label for=\"consulta\">Consulta</label>\n <textarea id=\"consulta\" name=\"consulta\"></textarea>\n <label for=\"curso\">Curso</label>\n <select id=\"curso\" name=\"curso\"><option>1.º Bachillerato</option><option>2.º Bachillerato</option></select>\n <button type=\"submit\">Enviar</button>\n</form>",
    "css": "body{font-family:Arial,sans-serif;padding:20px}form{max-width:420px;display:grid;gap:10px}label{font-weight:bold}input,textarea,select{padding:9px;border:1px solid #aaa;border-radius:5px}button{padding:10px;background:#245a9c;color:white;border:0}",
    "activity": "Construye un formulario con dos campos obligatorios, correo, selector y área de texto.",
    "explain": "form agrupa controles; label identifica cada campo y su atributo for debe coincidir con el id del control; name identifica el dato. input admite tipos text, email, number, checkbox y otros; textarea es para texto largo y select para opciones. Un formulario visual no envía datos a ningún destino sin servidor o servicio de procesamiento."
  },
  {
    "id": 7,
    "title": "HTML semántico",
    "summary": "Estructura de páginas mediante header, nav, main, section, article, aside y footer.",
    "example": "<header><h1>Noticias de TIC II</h1><nav><a href=\"#noticias\">Noticias</a></nav></header>\n<main id=\"noticias\">\n <article><h2>Nueva actividad</h2><p>Aprendemos HTML.</p></article>\n <aside>Más información del curso.</aside>\n</main>\n<footer>Mi Aula Digital</footer>",
    "css": "body{font-family:Arial,sans-serif;padding:18px}header,footer{background:#163a60;color:white;padding:16px}nav a{color:#dff}article,aside{padding:14px;border:1px solid #bbb;margin:12px}",
    "activity": "Diseña una página de noticias con header, nav, main, dos article y footer. Añade un aside.",
    "explain": "Los elementos semánticos describen la función del contenido y hacen el código más comprensible: header es la cabecera; nav la navegación; main el contenido principal; article una pieza independiente; aside contenido complementario; footer el pie."
  },
  {
    "id": 8,
    "title": "CSS: estilos y diseño",
    "summary": "Conectar estilos, selectores, color, tipografía, fondos, márgenes, padding y cajas.",
    "example": "<header><h1>Mi sitio web</h1></header>\n<main><section class=\"tarjeta\"><h2>Hola, CSS</h2><p>Probamos estilos.</p><button>Explorar</button></section></main>",
    "css": "body{font-family:Arial,sans-serif;background:#edf4ff;margin:0;color:#173453}header{background:#17365e;color:white;padding:22px}main{padding:24px}.tarjeta{background:white;border:1px solid #c6d5ef;border-radius:16px;padding:24px;max-width:420px;box-shadow:0 9px 20px #112b4522}button{background:#225da3;color:white;border:0;padding:10px 20px;border-radius:8px}",
    "activity": "Personaliza la tarjeta con colores, fuentes, padding y borde. Prueba un diseño con flexbox o grid.",
    "explain": "CSS modifica la presentación del HTML. Los selectores por etiqueta (h1), clase (.tarjeta) e id (#inicio) aplican propiedades como color, background, font-size, margin, padding y border. El modelo de cajas se compone de contenido, relleno, borde y margen. Flexbox organiza elementos en una dirección y Grid permite maquetación bidimensional."
  }
];