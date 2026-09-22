"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { createBrowserSupabaseClient } from "@/lib/supabase/browser";
import { hasSupabaseConfig } from "@/lib/supabase/env";
import { parseFavoriteIds } from "@/lib/browser-commerce";

const guestKey = "mm-favorites";
const read = (key: string) => { try { return parseFavoriteIds(localStorage.getItem(key)); } catch { return []; } };
const write = (key: string, ids: string[]) => { try { localStorage.setItem(key, JSON.stringify(ids)); } catch {} };
export function useFavorites() {
  const [favoriteIds, setIds] = useState<string[]>([]);
  const [favoriteError, setError] = useState("");
  const current = useRef<string[]>([]);
  const owner = useRef<string | null>(null);
  const ready = useRef(false);
  const revision = useRef(0);
  const queue = useRef(Promise.resolve());
  const operations = useRef<Record<string, number>>({});
  useEffect(() => {
    let active = true;
    const db = hasSupabaseConfig() ? createBrowserSupabaseClient() : null;
    async function load(userId: string | null) {
      const version = ++revision.current; ready.current = false; owner.current = userId;
      let ids = read(userId ? `mm-favorites:${userId}` : guestKey);
      current.current = ids; setIds(ids); setError("");
      if (userId && db) {
        const { data, error } = await db.from("favorites").select("product_id").eq("profile_id", userId).limit(500);
        if (!active || version !== revision.current) return;
        if (error) { setError("No pudimos sincronizar favoritos. RecargÃ¡ para reintentar."); }
        else {
          const guest = read(guestKey);
          ids = [...new Set([...data.map(row => row.product_id as string), ...guest])].slice(0, 500);
          if (guest.length) {
            const { error: mergeError } = await db.from("favorites").upsert(guest.map(product_id => ({ profile_id: userId, product_id })), { onConflict: "profile_id,product_id" });
            if (mergeError) setError("Tus favoritos locales estÃ¡n guardados; no pudimos sincronizarlos con la cuenta.");
            else write(guestKey, []);
          }
        }
      }
      if (!active || version !== revision.current) return;
      current.current = ids; setIds(ids); write(userId ? `mm-favorites:${userId}` : guestKey, ids); ready.current = true;
    }
    if (!db) { void load(null); return () => { active = false; }; }
    let last: string | null | undefined;
    const { data: { subscription } } = db.auth.onAuthStateChange((_event, session) => {
      const id = session?.user.id ?? null;
      if (last === id) return;
      last = id;
      // Defer database work outside the auth event callback to avoid lock contention.
      setTimeout(() => { if (active) void load(id); }, 0);
    });
    return () => { active = false; subscription.unsubscribe(); };
  }, []);
  const toggleFavorite = useCallback((id: string) => {
    if (!ready.current || !parseFavoriteIds(JSON.stringify([id])).length) return;
    const userId = owner.current, version = revision.current;
    const operation = operations.current[id] = (operations.current[id] ?? 0) + 1;
    const adding = !current.current.includes(id);
    if (adding && current.current.length >= 500) { setError("PodÃ©s guardar hasta 500 favoritos."); return; }
    const next = adding ? [...current.current, id] : current.current.filter(x => x !== id);
    current.current = next; setIds(next); setError(""); write(userId ? `mm-favorites:${userId}` : guestKey, next);
    if (!userId) return;
    const rollback = () => {
      if (owner.current !== userId || revision.current !== version || operations.current[id] !== operation) return;
      const restored = adding ? current.current.filter(x => x !== id) : [...new Set([...current.current, id])];
      current.current = restored; setIds(restored); write(`mm-favorites:${userId}`, restored);
      setError("No pudimos guardar el cambio. Revisá tu conexión y volvé a intentarlo.");
    };
    queue.current = queue.current.then(async () => {
      if (owner.current !== userId || revision.current !== version) return;
      const db = createBrowserSupabaseClient();
      const { error } = adding ? await db.from("favorites").upsert({ profile_id: userId, product_id: id }, { onConflict: "profile_id,product_id" }) : await db.from("favorites").delete().eq("profile_id", userId).eq("product_id", id);
      if (error) rollback();
    }).catch(rollback);
  }, []);
  return { favoriteIds, toggleFavorite, favoriteError };
}
