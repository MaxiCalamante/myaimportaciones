export function Instagram({size=24,className,strokeWidth=1.6}:{size?:number;className?:string;strokeWidth?:number}){
  return <svg width={size} height={size} className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} aria-hidden="true"><rect width="19" height="19" x="2.5" y="2.5" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.7" cy="6.4" r=".9" fill="currentColor" stroke="none"/></svg>;
}
