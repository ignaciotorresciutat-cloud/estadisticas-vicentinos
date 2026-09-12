"use client";

import { useEffect, useState } from "react";
import Image from "next/image";

export type ShareData = {
  kicker: string;
  title: string;
  sub: string;
  stats: { label: string; value: string | number }[];
};

function ShareIcon() {
  return (
    <svg width="17" height="17" viewBox="0 0 17 17" fill="none" aria-hidden>
      <path d="M8.5 11.5V1.8M5 5.1l3.5-3.4 3.5 3.4" stroke="#f89c38" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M3 8.6v5.9a1.2 1.2 0 001.2 1.2h8.6a1.2 1.2 0 001.2-1.2V8.6" stroke="#fff" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 17 17" fill="none">
      <path d="M2 2l13 13M15 2L2 15" stroke="#46658a" strokeWidth="2" strokeLinecap="round" />
    </svg>
  );
}

// se recalcula al abrir (no en el server) porque depende del dominio real
// donde termine viviendo el sitio.
function urlActual(): string {
  if (typeof window === "undefined") return "";
  return window.location.href;
}

export function ShareButton({ data }: { data: ShareData }) {
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [nativeOk, setNativeOk] = useState(false);

  useEffect(() => {
    setNativeOk(typeof navigator !== "undefined" && "share" in navigator);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  async function copiarLink() {
    const url = urlActual();
    try {
      await navigator.clipboard.writeText(url);
      setToast("Link copiado.");
    } catch {
      setToast(url);
    }
  }

  const targets = [
    {
      mark: "WA",
      label: "WhatsApp",
      meta: "Manda el link al grupo del club",
      go: () => {
        const texto = `${data.title} ${urlActual()}`;
        window.open(`https://wa.me/?text=${encodeURIComponent(texto)}`, "_blank", "noopener,noreferrer");
      },
    },
    {
      mark: "IG",
      label: "Instagram",
      meta: "Copiá el link y pegalo en un mensaje o historia",
      go: async () => {
        await copiarLink();
        setToast("Link copiado. Pegalo en el mensaje o la historia.");
      },
    },
    {
      mark: "FB",
      label: "Facebook",
      meta: "Publicar en el muro",
      go: () => {
        window.open(
          `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(urlActual())}`,
          "_blank",
          "noopener,noreferrer"
        );
      },
    },
    ...(nativeOk
      ? [
          {
            mark: "↗",
            label: "Más opciones",
            meta: "Hoja para compartir del teléfono",
            go: async () => {
              try {
                await navigator.share({ title: data.title, text: data.sub, url: urlActual() });
              } catch {
                // el usuario canceló la hoja nativa: no es un error a mostrar
              }
            },
          },
        ]
      : []),
    { mark: "⧉", label: "Copiar link", meta: "", go: copiarLink },
  ];

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setToast("");
          setOpen(true);
        }}
        aria-label="Compartir"
        className="flex h-11 w-11 flex-none items-center justify-center lg:hidden"
      >
        <ShareIcon />
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end lg:hidden">
          <div className="absolute inset-0" style={{ background: "rgba(0,33,64,.55)" }} onClick={() => setOpen(false)} />
          <div className="relative rounded-t-[18px] bg-white pt-3 pb-8">
            <div className="mx-auto h-1 w-[38px] rounded-full" style={{ background: "rgba(0,56,104,.2)" }} />
            <div className="flex items-center justify-between gap-3 px-5 pt-3.5">
              <span className="font-mono text-[10px] font-semibold tracking-[.14em] text-ink uppercase">Compartir</span>
              <button type="button" onClick={() => setOpen(false)} aria-label="Cerrar" className="flex h-11 w-11 items-center justify-end">
                <CloseIcon />
              </button>
            </div>

            <div className="mx-5 mt-1.5 rounded-2xl bg-navy px-[17px] py-4">
              <div className="flex items-center gap-[9px]">
                <div className="flex h-[26px] w-[26px] flex-none items-center justify-center rounded-[7px] bg-white">
                  <Image src="/escudo-vicentinos.jpg" alt="" width={19} height={19} className="h-[19px] w-[19px] object-contain" />
                </div>
                <div className="font-mono text-[9px] font-semibold tracking-[.13em] text-orange uppercase">{data.kicker}</div>
              </div>
              <div className="mt-3 text-[21px] leading-[1.15] font-extrabold tracking-[-.025em] text-white">{data.title}</div>
              <div className="mt-[5px] text-[12.5px] text-white/75">{data.sub}</div>
              <div className="mt-3.5 flex gap-px overflow-hidden rounded-[9px]" style={{ background: "rgba(255,255,255,.16)" }}>
                {data.stats.map((s) => (
                  <div key={s.label} className="flex-1 bg-navy px-[11px] py-2.5">
                    <div className="text-[17px] leading-none font-extrabold text-white tabular-nums">{s.value}</div>
                    <div className="mt-[5px] font-mono text-[8px] tracking-[.09em] text-white/55 uppercase">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
            <p className="px-5 pt-2.5 text-[11.5px] leading-[1.5] text-ink">
              Así se ve el link cuando lo pegás en WhatsApp, Instagram o Facebook.
            </p>

            <div className="mt-3.5 flex flex-col">
              {targets.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  onClick={() => void t.go()}
                  className="flex min-h-[52px] items-center gap-[13px] border-t px-5 text-left"
                  style={{ borderColor: "rgba(0,56,104,.09)" }}
                >
                  <div
                    className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-lg font-mono text-[11px] font-semibold text-navy"
                    style={{ background: "#e6edf3" }}
                  >
                    {t.mark}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[14.5px] font-semibold text-navy">{t.label}</div>
                    {t.meta && <div className="mt-0.5 text-[11px] text-ink">{t.meta}</div>}
                  </div>
                  <svg width="7" height="12" viewBox="0 0 7 12" fill="none" className="flex-none">
                    <path d="M1 1l5 5-5 5" stroke="rgba(0,56,104,.35)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              ))}
            </div>

            {toast && (
              <div className="mx-5 mt-3.5 rounded-[10px] px-3.5 py-[11px] text-[12.5px] text-navy" style={{ background: "#e6edf3" }}>
                {toast}
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
