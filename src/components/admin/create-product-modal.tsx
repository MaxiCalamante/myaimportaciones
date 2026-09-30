"use client";
import { ProductEditor } from "./product-editor";
import type { Category } from "@/lib/types";
export function CreateProductModal({ categories, isOpen, onClose, onProductCreated }: { categories: Category[]; isOpen: boolean; onClose: () => void; onProductCreated?: () => void }) {
  return isOpen ? <ProductEditor categories={categories} onClose={onClose} onSaved={() => { onProductCreated?.(); onClose(); }} /> : null;
}
