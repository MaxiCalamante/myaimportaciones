import Link from 'next/link';
import { ArrowRight,HeartHandshake,MessageCircle } from 'lucide-react';
import { siteConfig } from '@/lib/site';
import styles from './giveaway.module.css';

export function GiveawayStoreBridge() {
  const contact=siteConfig.whatsappNumberAgustina||siteConfig.whatsappNumber;
  const message='Hola Agustina! Vi el sorteo de MYA y quisiera consultar por el Travel Kit de SKIN1004 y productos de cosmética coreana.';
  return <section className={`${styles.publicRoot} ${styles.storeBridge}`} aria-label="Productos del sorteo en la tienda">
    <div className={styles.storeBridgeCopy}>
      <p className={styles.eyebrow}>DESCUBRÍ MÁS EN MYA</p>
      <h2>Un momento de cuidado,<br/><em>también para vos.</em></h2>
      <p>Conocé el Travel Kit SKIN1004 Madagascar Centella y nuestra selección de cosmética coreana. Consultanos por disponibilidad, entregas y una rutina pensada para vos.</p>
      <span className={styles.personalAdvice}><HeartHandshake size={17}/>Asesoramiento personal con Agustina · Desde Tandil</span>
    </div>
    <div className={styles.storeBridgeActions}>
      <Link className={styles.roseButton} href="/catalogo?q=SKIN1004">Descubrir SKIN1004<ArrowRight size={17}/></Link>
      <Link className={styles.outlineButton} href="/catalogo?category=cosmetica-coreana">Ver cosmética coreana<ArrowRight size={17}/></Link>
      <a className={styles.smallButton} href={`https://wa.me/${contact}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer"><MessageCircle size={16}/>Consultar a Agustina</a>
    </div>
  </section>;
}
