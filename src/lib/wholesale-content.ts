import {pageMetadata,publicUrl} from "./seo";
export interface WholesaleCategory {
 slug:string;categorySlug:string;brand?:string;name:string;title:string;description:string;introduction:string;audience:string;brands:string[];
 buyingGuide:{title:string;text:string}[];checklist:string[];faq:{question:string;answer:string}[];
}
const entries:[string,string,string,string,string,string[]][]=[
 ['cosmetica-coreana','cosmetica-coreana','Cosmética coreana','Cosmética coreana y skincare por mayor en Argentina','Tiendas de skincare, perfumerías y comercios de belleza',['SKIN1004','Medicube','Anua','Celimax','Dr. Althea']],
 ['perfumeria','perfumeria','Perfumería y fragancias','Perfumes árabes y fragancias por mayor en Argentina','Perfumerías, tiendas de regalos y revendedores',['Lattafa',"Victoria's Secret",'Maison Alhambra']],
 ['cuidado-capilar','cuidado-capilar','Cuidado capilar','Productos capilares por mayor para peluquerías y comercios','Peluquerías, perfumerías y tiendas de cuidado personal',['Karseell','Shiseido','Kérastase']],
 ['herramientas','herramientas-equipamiento','Herramientas y ferretería','Herramientas TOTAL y WADFOW por mayor para ferreterías','Ferreterías, electricistas, instaladores y talleres',['Total','Wadfow']],
 ['electronica','electronica','Electrónica y accesorios','Electrónica y accesorios por mayor en Argentina','Comercios de tecnología, tiendas online y revendedores',['Apple','Samsung','JBL']],
 ['medicube','cosmetica-coreana','Medicube','Medicube por mayor: catálogo de skincare en Argentina','Comercios de skincare, perfumerías y revendedores',['Medicube']],
];
export const WHOLESALE_CATEGORIES:WholesaleCategory[]=entries.map(([slug,categorySlug,name,title,audience,brands])=>({
 slug,categorySlug,name,title,audience,brands,...(slug==='medicube'?{brand:'Medicube'}:{}),
 description:`${name} por mayor para revender. Desde 5 productos o $100.000 combinables. Catálogo público con presentaciones exactas, precios confirmados y pedidos combinables. Envíos a toda Argentina.`,
 introduction:`Explorá ${name.toLocaleLowerCase('es')} para tu negocio. Compará marcas y presentaciones, revisá los precios confirmados y combiná productos en un mismo pedido. Cada importe o disponibilidad pendiente se identifica antes de habilitar un pago.`,
 buyingGuide:categorySlug==='herramientas-equipamiento'?[
  {title:'Compará el código exacto',text:'Revisá modelo, voltaje, potencia, torque o medidas según la herramienta. Un código de fabricante parecido puede identificar otro equipo. La ficha informa las especificaciones disponibles sin reemplazar la verificación del producto exacto.'},
  {title:'Diferenciá cuerpo y kit',text:'Revisá si incluye batería, cargador, maletín y accesorios. No se consideran incluidos si la ficha de esa presentación no los informa. La compatibilidad debe corresponder al modelo concreto.'},
 ]:categorySlug==='perfumeria'?[
  {title:'Elegí versión, concentración y volumen',text:'Revisá el nombre completo y si corresponde a EDP, EDT, extrait o body mist. Identificá los mililitros, la presentación y la condición. Un tester, un set y una miniatura son artículos distintos.'},
  {title:'Armá un surtido por presentación',text:'Podés combinar aromas y marcas. Verificá la foto y el contenido de cada presentación; los cambios por otra variante requieren tu confirmación. No se promete una duración general para todas las fragancias.'},
 ]:[
  {title:'Identificá la presentación exacta',text:'Compará marca, línea, modelo y tamaño o capacidad. La ficha indica los datos disponibles para esa presentación. No se reemplaza un producto por otro de nombre parecido ni se agregan prestaciones que el fabricante no informa.'},
  {title:'Combiná tu selección',text:'Elegí las unidades por producto y reuní distintos rubros en el carrito. Revisá allí el mínimo vigente y las condiciones de tu selección. Los datos pendientes se confirman antes de comprar y el envío se informa por separado.'},
 ],
 checklist:['Marca y nombre completo','Modelo, tamaño o capacidad exactos','Condición y contenido de la presentación','Unidades y destino de entrega'],
 faq:[
  {question:`¿Puedo ver precios de ${name.toLocaleLowerCase('es')} sin una cuenta aprobada?`,answer:'Sí. El catálogo mayorista es público. Los precios confirmados se muestran en pesos por unidad; las presentaciones pendientes se identifican y pueden solicitarse para confirmación antes del pago.'},
  {question:'¿Puedo combinar productos de distintos rubros?',answer:'Sí. El mínimo se aplica al conjunto del pedido mayorista y se informa en el carrito. Basta alcanzar la cantidad de unidades o el importe configurados; no se exigen esas unidades de cada producto.'},
 ],
}));
export const WHOLESALE_PATHS=['/mayorista',...WHOLESALE_CATEGORIES.map(c=>`/mayorista/${c.slug}`)];
export const findWholesaleCategory=(slug:string)=>WHOLESALE_CATEGORIES.find(c=>c.slug===slug);
export function wholesaleMetadata(category?:WholesaleCategory){
 return pageMetadata({title:category?.title||'Catálogo mayorista público: cosmética, perfumes y herramientas',description:category?.description||'Explorá productos importados, precios mayoristas confirmados y presentaciones exactas. Combiná marcas y rubros, armá tu pedido y recibí en toda Argentina.',path:category?`/mayorista/${category.slug}`:'/mayorista',image:`/compartir?${new URLSearchParams({tipo:'categoria',cat:category?`${category.name} por mayor`:'Catálogo mayorista MYA',desc:'Precios confirmados visibles, pedidos combinables y Envíos a toda Argentina.'})}`});
}
export function wholesaleServiceData(category?:WholesaleCategory){return{'@context':'https://schema.org','@type':'Service',name:category?.title||'Catálogo mayorista público de MYA',serviceType:'Venta mayorista con catálogo público',description:category?.description||'Productos por mayor, precios confirmados visibles y pedidos combinables. Envíos a toda Argentina.',url:publicUrl(category?`/mayorista/${category.slug}`:'/mayorista'),provider:{'@id':publicUrl('/#organization')},areaServed:{'@type':'Country',name:'Argentina'}};}
