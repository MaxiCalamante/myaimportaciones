import re, unicodedata

def normalized(text):
 return ''.join(c for c in unicodedata.normalize('NFD',text.upper()) if unicodedata.category(c)!='Mn')

# Preserve existing slugs so bookmarked categories continue to resolve.
NAMES={
 'cosmetica-coreana':'Cosmética facial y corporal','herramientas-equipamiento':'Herramientas y equipamiento','cuidado-capilar':'Cuidado del cabello',
 'serums-ampollas':'Sérums y ampollas faciales','cremas-mascarillas':'Cremas y mascarillas faciales','limpieza-exfoliantes':'Limpieza facial y exfoliantes','kits-de-viaje-k-beauty':'Kits de cuidado facial',
 'tonicos-pads':'Tónicos y discos faciales','lociones-corporales-fragancias':'Cremas corporales y fragancias','tratamientos-mascarillas-capilares':'Mascarillas y tratamientos capilares','shampoos-acondicionadores':'Shampoos y acondicionadores','aceites-leave-in':'Aceites y cremas sin enjuague',
 'taladros-rotomartillos':'Taladros y rotomartillos','atornilladores-llaves-impacto':'Atornilladores y llaves de impacto','amoladoras-pulidoras':'Amoladoras y pulidoras','sierras-circulares-caladoras':'Sierras eléctricas',
 'herramientas-manuales':'Herramientas manuales','lijadoras-mezcladoras':'Lijadoras y mezcladoras','pistolas-pintura-calor':'Pistolas de pintura y calor','compresores-neumatica':'Compresores y herramientas neumáticas',
 'bombas-agua-presurizadoras':'Bombas de agua','maquinas-industriales-construccion':'Máquinas para construcción','morsas-banco':'Morsas y prensas','cortadoras-piso-ceramica':'Cortadoras de cerámica y piso',
 'baterias-cargadores-litio':'Baterías y cargadores','guinches-aparejos-balanzas':'Guinches, aparejos y balanzas','escaleras-aluminio':'Escaleras','cajas-fuertes-cofres':'Cajas fuertes','herramientas-automotrices':'Herramientas para automotor',
 'seguridad-industrial-epi':'Protección personal','kits-cajas-herramientas':'Cajas, bolsos y organización',
}
NEW={
 'alicates-pinzas':'Alicates y pinzas','llaves-tubos-criques':'Llaves, tubos y criques','destornilladores-puntas':'Destornilladores y puntas','martillos-cinceles':'Martillos y cinceles','corte-manual':'Cúteres, tijeras y corte manual','accesorios-consumibles':'Accesorios y consumibles','plomeria':'Plomería y conexiones','electricidad-iluminacion':'Electricidad e iluminación','albanileria-pintura':'Albañilería y pintura','kits-herramientas':'Kits de herramientas','cepillos-fresadoras':'Cepillos, fresadoras y multiherramientas','limpieza-ventilacion':'Aspiradoras, sopladores y ventilación','transporte-sujecion':'Carretillas y sujeción de cargas','contorno-ojos':'Contorno de ojos','kits-capilares':'Kits de cuidado capilar'}

def classify(title, oldslug):
 t=normalized(title)
 if re.search(r'\b(MEDICUBE|SKIN1004|ALTHEA|CELIMAX|ANUA|KARSEELL|VICTORIA|DEAR BODY|NUMBUZIN|LILYEVE|VT COSMETICS)\b',t):
  hair=any(x in t for x in ['KARSEELL','HAIR','CAPILAR','LILYEVE'])
  if hair:
   if re.search(r'\b(KIT|SET)\b',t):return 'kits-capilares'
   if re.search('SHAMPOO|CONDITIONER|ACONDICIONADOR',t) and not re.search('LEAVE|BNC',t):return 'shampoos-acondicionadores'
   if re.search('OIL|ACEITE|LEAVE|CURL|BNC',t):return 'aceites-leave-in'
   return 'tratamientos-mascarillas-capilares'
  if re.search('VICTORIA|DEAR BODY|BODY PEEL',t):return 'lociones-corporales-fragancias'
  if re.search('OLHOS|EYE|CONTORNO',t):return 'contorno-ojos'
  if re.search('TRAVEL|\bKIT\b',t):return 'kits-de-viaje-k-beauty'
  if re.search('PAD|TONER|TONICO|SPRAY|SRPAY',t):return 'tonicos-pads'
  if re.search('CLEANS|LIMPI|FOAM|PEEL 40',t):return 'limpieza-exfoliantes'
  if re.search('SERUM|AMPOULE|SHOT|BOOSTER',t) and 'GEL' not in t:return 'serums-ampollas'
  return 'cremas-mascarillas'
 if not re.search('TOTAL|WADFOW',t):return oldslug
 # Specific accessories first: a blade is not a powered saw, a case is not a kit.
 rules=[
 ('accesorios-consumibles',r'\b(BROCAS?|MECHAS?|FRESAS?|GRAPAS?|PEGAMENTO|FILTRO|ESPADA PARA|LAMINA PARA)\b|JUEGO DE CEPILLOS|JUEGOS DE CEPILLOS'),
 ('destornilladores-puntas',r'\bBITS\b'),
 ('llaves-tubos-criques',r'TORQUIMETRO|VASOS DE IMPACTO|BARRA DE EXTENSION'),
 ('corte-manual',r'\bHACHA|MACHETE|ESTILETE|TESOURA'),
 ('soldadoras-inverter',r'MAQUINA DE SOLD|SOLDADOR ELECTRICO|PISTOLA DE SOLDAR'),
 ('maquinas-industriales-construccion',r'COMPACTADORA|VIBRADOR.*HORMIGON|REGLA VIBRATORIA|MAQUINA VIBRA'),
 ('seguridad-industrial-epi',r'CHAQUETA|PANTALON|MACACON|TRAJE DE LLUVIA|AURICULAR PROTECTOR|CONO TRAFICO|BALIZA'),
 ('transporte-sujecion',r'CARRETILLA|CARRITO DE CARGA|CARRITO CARGA|CARRITO DE MANO|ESLINGA|MOSQUETON|CUERDA|CATRACA.*CINTA|CATRACA.*[234]T'),
 ('agro-jardineria',r'CORTACESPED|CORTA CESPED|CORTE DE CESPED|CORTASETOS|CORTA CERCO|MOTOSIERRA|DESMALEZADORA|FUMIGADORA|RASTRILLO|MANGUERA DE AGUA|PORTA MANGUERA'),
 ('limpieza-ventilacion',r'ASPIRADOR|SOPLADOR|VENTILADOR|BARREDORA|LIMPADOR A VAPOR'),
 ('cepillos-fresadoras',r'CEPILLADORA|CEPILLO ELECTRICO|MULTI.HERRAMIENTA|JUNTADORA|FRESADORA'),
 ('niveles-laser-medicion',r'MEDIDOR|MULTIMETRO|MULTIPROBADOR|TERMOMETRO|ANEMOMETRO|NIVEL|LASER DE LINEA|CINTA METRICA|ESCUADR|REGLA TMT'),
 ('kits-cajas-herramientas',r'CAJAS? DE HERRAM|CAJA DE HARRAM|CAJA DE PLASTICO|ESTANTES|PORTAHERRAMIENTAS'),
 ('plomeria',r'MONOCOMANDO|LIMPIADOR DE CANERIA'),
 ('compresores-neumatica',r'NEUMATICA|PISTOLA DE AIRE|INFLADOR|INYECTOR AIRE'),
 ('herramientas-automotrices',r'LUBRICADOR|GATO DE PISO|SILLA.*MECANICO|RASTRADOR.*COCHE|CARRO.*REPARACION|PALANCA DE NEUMATIC|PLATAFORMA.*LLANTA|PRUEBA DE COMPRESION|PROBADOR DE BATERIA|RAMPA PARA MECANICO|CABLE DE ARRANQUE|VENTOSA'),
 ('bombas-agua-presurizadoras',r'BOMBA.*AGUA|CONTROL BOMBA'),
 ('guinches-aparejos-balanzas',r'CABRESTANTE|GINCHO'),
 ('martillos-cinceles',r'BARRA DE DEMOLICION'),
 ('sierras-corte',r'INGLET'),

 ('seguridad-industrial-epi',r'BOTAS?|ZAPATO|CALZADO|GUANTES?|ANTIPARR|GAFAS|CASCO|ARNES|CHALECO|CAPA DE|RODILLERA|PROTECTOR AUDIT|MASCARA|RESPIRADOR'),
 ('kits-cajas-herramientas',r'BOLSA|BOLSO|MOCHILA|CAJA DE HERRAM|CARRO DE HERRAM|CARRITO DE HERRAM|ORGANIZADOR|CINTURON PORTA'),
 ('baterias-cargadores-litio',r'^(TOTAL|WADFOW) (BATERIA|CARGADOR|KIT DE BATERIA)'),
 ('accesorios-consumibles',r'^(TOTAL|WADFOW) (DISCO|BROCA|FRESA|HOJA|CADENA PARA|CARBON|PORTABROCA|ADAPTADOR|CEPILLO DE ALAMBRE|HILO DE|LIJA|MANDRIL|ACCESORIO|REPUESTO)'),
 ('plomeria',r'GRIFO|VALVULA|CANILLA|DUCHA|LLAVE DE PASO|CONEXION|ACOPLE|CONECTOR|PISTOLA PARA RIEGO'),
 ('electricidad-iluminacion',r'LAMPARA|LINTERNA|REFLECTOR|FOCO|ENCHUFE|EXTENSION ELECTRICA|CABLE ELECTRICO|TOMACORRIENTE'),
 ('kits-herramientas',r'COMBO|KIT HERRAMIENTA|KIT DE HERRAMIENTA|SET DE HERRAMIENTA|JUEGO DE HERRAMIENTA|KIT LLAVE.*ATORNILLADOR|KIT DE LLAVE.*ATORNILLADOR'),
 ('morsas-banco',r'MORSA|PRENSA|SARGENTO|TORNILLO DE BANCO'),
 ('escaleras-aluminio',r'ESCALERA'),('cajas-fuertes-cofres',r'CAJA FUERTE|COFRE'),
 ('guinches-aparejos-balanzas',r'TECLE|GUINCHE|APAREJO|BALANZA|POLIPASTO'),
 ('herramientas-automotrices',r'GATO HIDRAULICO|GATO MECANICO|ARRANCADOR|EXTRACTOR|ENGRASADOR|LLAVE FILTRO|LLAVE PARA FILTRO'),
 ('bombas-agua-presurizadoras',r'BOMBA DE AGUA|BOMBA SUMERG|ELECTROBOMBA|PRESURIZ'),
 ('cortadoras-piso-ceramica',r'CORTADORA.*(PISO|CERAMIC)|CORTADOR.*(AZULEJO|CERAMIC)'),
 ('taladros-rotomartillos',r'TALADRO|ROTOMARTILLO|MARTILLO ROTATIVO|MARTILLO PERFORADOR|DEMOLEDOR'),
 ('atornilladores-llaves-impacto',r'ATORNILLADOR|LLAVE.*IMPACTO'),
 ('amoladoras-pulidoras',r'AMOLADORA|PULIDORA|RECTIFICADORA|ESMERIL'),
 ('lijadoras-mezcladoras',r'LIJADORA|MEZCLADOR'),('pistolas-pintura-calor',r'PISTOLA.*(PINTURA|CALOR)'),
 ('alicates-pinzas',r'ALICATE|PINZA|PELACABLE|TENAZA'),
 ('llaves-tubos-criques',r'LLAVE|SOCKET|DADO|TUBOS? HEXAGONAL|TRINQUETE|CRIQUET'),
 ('destornilladores-puntas',r'DESTORNILLADOR|PUNTAS? DE|KIT DE PUNTAS|JUEGO DE PUNTAS'),
 ('martillos-cinceles',r'MARTILLO|MAZA|CINCEL|PUNZON|CORTAFIERRO'),
 ('corte-manual',r'CUTTER|CUTER|TIJERA|SERRUCHO|CORTADOR|CUCHILLA|CUCHILLO'),
 ('albanileria-pintura',r'ESPATULA|LLANA|FRATACHO|RODILLO|PINCEL|BROCHA|PALETA|PISTOLA.*SILICON|PISTOLA.*SELLADOR'),
 ]
 for slug,pattern in rules:
  if re.search(pattern,t):return slug
 return oldslug
