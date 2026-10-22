"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Crop, ZoomIn, ZoomOut, RotateCw, Check, X, Maximize2 } from "lucide-react";
import { MAX_UPLOAD_BYTES } from "@/lib/admin-product";

export type AspectRatioType = "1:1" | "4:5" | "free";

export interface ImageCropperModalProps {
  isOpen: boolean;
  imageUrl: string;
  fileName?: string;
  onClose: () => void;
  onCropComplete: (croppedFile: File, previewUrl: string) => void;
}

export function ImageCropperModal({
  isOpen,
  imageUrl,
  fileName = "foto-producto.webp",
  onClose,
  onCropComplete,
}: ImageCropperModalProps) {
  const [aspectRatio, setAspectRatio] = useState<AspectRatioType>("1:1");
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0); // 0, 90, 180, 270
  const [offset, setOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null);

  const imgRef = useRef<HTMLImageElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Reset state when opening a new image
  useEffect(() => {
    if (isOpen) {
      setZoom(1);
      setRotation(0);
      setOffset({ x: 0, y: 0 });
      setIsProcessing(false);
    }
  }, [isOpen, imageUrl]);

  // Load image dimensions
  useEffect(() => {
    if (!isOpen || !imageUrl) return;
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = imageUrl;
    img.onload = () => {
      setImageSize({ width: img.naturalWidth, height: img.naturalHeight });
      imgRef.current = img;
    };
  }, [isOpen, imageUrl]);

  // Mouse & Touch Pan Handlers
  const handlePointerDown = (e: React.PointerEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - offset.x, y: e.clientY - offset.y });
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDragging) return;
    setOffset({
      x: e.clientX - dragStart.x,
      y: e.clientY - dragStart.y,
    });
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    setIsDragging(false);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {}
  };

  const handleRotate = () => {
    setRotation((prev) => (prev + 90) % 360);
  };

  const handleReset = () => {
    setZoom(1);
    setRotation(0);
    setOffset({ x: 0, y: 0 });
  };

  // Perform crop on canvas and compress to WebP
  const handleApplyCrop = async () => {
    if (!imgRef.current || isProcessing) return;
    setIsProcessing(true);

    try {
      const img = imgRef.current;
      const naturalW = img.naturalWidth;
      const naturalH = img.naturalHeight;

      // Determine output target dimensions based on aspect ratio
      let targetW = 1200;
      let targetH = 1200;
      if (aspectRatio === "4:5") {
        targetW = 1200;
        targetH = 1500;
      } else if (aspectRatio === "free") {
        if (rotation % 180 === 0) {
          targetW = Math.min(1600, naturalW);
          targetH = Math.round((targetW / naturalW) * naturalH);
        } else {
          targetW = Math.min(1600, naturalH);
          targetH = Math.round((targetW / naturalH) * naturalW);
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = targetW;
      canvas.height = targetH;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("No se pudo iniciar el canvas.");

      // Background fill white (for transparent PNGs)
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, targetW, targetH);

      ctx.save();
      // Center canvas origin
      ctx.translate(targetW / 2, targetH / 2);
      ctx.rotate((rotation * Math.PI) / 180);

      // Base fitted scale
      const isRotated = rotation % 180 !== 0;
      const effectiveImgW = isRotated ? naturalH : naturalW;
      const effectiveImgH = isRotated ? naturalW : naturalH;

      const baseFitScale = Math.max(targetW / effectiveImgW, targetH / effectiveImgH);
      const finalScale = baseFitScale * zoom;

      // Pan translation adjusted by scale
      ctx.scale(finalScale, finalScale);
      // Adjust offset according to rotation
      let renderOffsetX = offset.x;
      let renderOffsetY = offset.y;
      if (rotation === 90) {
        renderOffsetX = offset.y;
        renderOffsetY = -offset.x;
      } else if (rotation === 180) {
        renderOffsetX = -offset.x;
        renderOffsetY = -offset.y;
      } else if (rotation === 270) {
        renderOffsetX = -offset.y;
        renderOffsetY = offset.x;
      }

      ctx.translate(renderOffsetX / finalScale, renderOffsetY / finalScale);

      // Draw original image centered
      ctx.drawImage(img, -naturalW / 2, -naturalH / 2, naturalW, naturalH);
      ctx.restore();

      // Compress to WebP / fallback JPEG
      const baseName = fileName.replace(/\.[^.]+$/, "");
      let finalBlob: Blob | null = null;
      let finalExt = "webp";
      let finalMime = "image/webp";

      for (const q of [0.85, 0.75, 0.60, 0.45]) {
        const b = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/webp", q));
        if (b && b.size <= MAX_UPLOAD_BYTES) {
          finalBlob = b;
          break;
        }
      }

      if (!finalBlob) {
        for (const q of [0.85, 0.70, 0.50, 0.35]) {
          const b = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", q));
          if (b && b.size <= MAX_UPLOAD_BYTES) {
            finalBlob = b;
            finalExt = "jpg";
            finalMime = "image/jpeg";
            break;
          }
        }
      }

      if (!finalBlob) {
        // Fallback to highest quality available if still slightly above
        finalBlob = await new Promise<Blob | null>((res) => canvas.toBlob(res, "image/jpeg", 0.30));
        finalExt = "jpg";
        finalMime = "image/jpeg";
      }

      if (!finalBlob) throw new Error("No se pudo procesar la imagen.");

      const file = new File([finalBlob], `${baseName}-recorte.${finalExt}`, { type: finalMime });
      const previewUrl = URL.createObjectURL(file);

      onCropComplete(file, previewUrl);
      onClose();
    } catch (err: unknown) {
      console.error("[ImageCropperModal] Error cropping:", err);
      alert(err instanceof Error ? err.message : "Error al recortar la imagen.");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen) return null;

  // Viewport crop box styling
  const aspectClass =
    aspectRatio === "1:1"
      ? "aspect-square max-w-[320px] sm:max-w-[420px]"
      : aspectRatio === "4:5"
      ? "aspect-[4/5] max-w-[280px] sm:max-w-[360px]"
      : "aspect-auto max-w-full max-h-[420px]";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="w-full max-w-xl rounded-3xl bg-zinc-900 border border-zinc-800 shadow-2xl flex flex-col overflow-hidden text-white">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <div className="size-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center">
              <Crop className="size-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base text-zinc-100">Encuadre y Recorte de Foto</h3>
              <p className="text-[11px] text-zinc-400">Ajustá la foto para catálogo y optimizá a WebP</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-zinc-400 hover:text-white hover:bg-zinc-800 transition cursor-pointer"
          >
            <X className="size-5" />
          </button>
        </div>

        {/* Aspect Ratio Selector */}
        <div className="flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-950/60 border-b border-zinc-800 text-xs font-semibold">
          <button
            type="button"
            onClick={() => {
              setAspectRatio("1:1");
              handleReset();
            }}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              aspectRatio === "1:1" ? "bg-sky-600 text-white shadow-sm" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            1:1 Cuadrado (E-commerce)
          </button>
          <button
            type="button"
            onClick={() => {
              setAspectRatio("4:5");
              handleReset();
            }}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              aspectRatio === "4:5" ? "bg-sky-600 text-white shadow-sm" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            4:5 Vertical (Catálogo)
          </button>
          <button
            type="button"
            onClick={() => {
              setAspectRatio("free");
              handleReset();
            }}
            className={`px-3 py-1.5 rounded-xl transition cursor-pointer ${
              aspectRatio === "free" ? "bg-sky-600 text-white shadow-sm" : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            Libre
          </button>
        </div>

        {/* Interactive Cropper Area */}
        <div
          ref={containerRef}
          className="relative flex items-center justify-center p-4 bg-zinc-950 overflow-hidden min-h-[340px] select-none"
        >
          {/* Crop Viewport frame */}
          <div
            className={`relative w-full ${aspectClass} border-2 border-sky-400/80 rounded-2xl overflow-hidden shadow-2xl bg-zinc-900 cursor-grab active:cursor-grabbing`}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
          >
            {/* Rule of thirds grid lines */}
            <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 z-20">
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-r border-b border-white/20" />
              <div className="border-b border-white/20" />
              <div className="border-r border-white/20" />
              <div className="border-r border-white/20" />
              <div />
            </div>

            {/* Image being manipulated */}
            <div
              className="absolute inset-0 flex items-center justify-center pointer-events-none transition-transform duration-75"
              style={{
                transform: `translate(${offset.x}px, ${offset.y}px) rotate(${rotation}deg) scale(${zoom})`,
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={imageUrl}
                alt="Ajuste de encuadre"
                className="max-w-none max-h-none select-none pointer-events-none"
                style={{
                  width: imageSize ? `${imageSize.width}px` : "auto",
                  height: imageSize ? `${imageSize.height}px` : "auto",
                }}
              />
            </div>
          </div>
        </div>

        {/* Controls Footer */}
        <div className="px-5 py-4 bg-zinc-900 border-t border-zinc-800 space-y-3">
          {/* Zoom and Rotate toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <ZoomOut className="size-4 text-zinc-400 shrink-0" />
              <input
                type="range"
                min="0.5"
                max="3"
                step="0.05"
                value={zoom}
                onChange={(e) => setZoom(parseFloat(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer h-1.5 bg-zinc-700 rounded-lg"
              />
              <ZoomIn className="size-4 text-zinc-400 shrink-0" />
              <span className="font-mono text-zinc-400 text-[11px] w-10 text-right">{Math.round(zoom * 100)}%</span>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={handleRotate}
                className="inline-flex items-center gap-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-zinc-200 transition cursor-pointer"
                title="Girar 90 grados a la derecha"
              >
                <RotateCw className="size-3.5" />
                <span>Girar 90°</span>
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="inline-flex items-center gap-1 rounded-xl bg-zinc-800 hover:bg-zinc-700 px-3 py-1.5 text-zinc-200 transition cursor-pointer"
                title="Restablecer encuadre y zoom"
              >
                <Maximize2 className="size-3.5" />
                <span>Centrar</span>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-800/80">
            <button
              type="button"
              onClick={onClose}
              disabled={isProcessing}
              className="px-4 py-2 rounded-xl border border-zinc-700 text-zinc-300 hover:bg-zinc-800 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleApplyCrop}
              disabled={isProcessing}
              className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/50 transition cursor-pointer disabled:opacity-50"
            >
              {isProcessing ? (
                <>
                  <span className="size-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Optimizando WebP...</span>
                </>
              ) : (
                <>
                  <Check className="size-4" />
                  <span>Aplicar recorte</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
