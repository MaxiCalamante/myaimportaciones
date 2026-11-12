import React from 'react';
import {createRoot} from 'react-dom/client';
import {CurrencyProvider,DualPrice,ExchangeTicker} from '../../src/components/commerce/currency-provider';
import {usdToArs} from '../../src/lib/money';
const args=new URLSearchParams(location.search),rate=args.get('rate')??'1660.55',stale=args.has('stale');
const stamp=new Date().toISOString();
createRoot(document.getElementById('root')!).render(<CurrencyProvider snapshot={{id:`qa-${rate}`,kind:'usdt',rate,rawRate:rate,sourceAt:stamp,fetchedAt:stamp,expiresAt:stale?'2020-01-01T00:00:00Z':'2099-01-01T00:00:00Z',status:stale?'stale':'valid',source:'usdt',adjustment:'0',roundArs:'1'}}>
 <header className="bg-zinc-950 p-4"><ExchangeTicker/></header>
 <main className="mx-auto max-w-5xl space-y-6 p-4"><h1 className="text-2xl font-bold">Cotización comercial USDT</h1><article className="rounded-2xl border p-5"><h2 className="mb-3 font-semibold">Producto de prueba · precio base USD</h2><div className="text-2xl font-bold"><DualPrice usd="40" ars={usdToArs('40',rate,'1')} context/></div></article></main>
</CurrencyProvider>);
