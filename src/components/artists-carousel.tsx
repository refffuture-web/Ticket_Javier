"use client";

import Link from "next/link";
import { useRef } from "react";

export type ArtistCard = {
  id: string;
  name: string;
  photoSrc: string | null;
  eventSlug: string;
  eventTitle: string;
};

/** Carrusel de artistas de la grilla de todos los eventos. */
export function ArtistsCarousel({ artists }: { artists: ArtistCard[] }) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  if (artists.length === 0) return null;

  function scrollBy(dir: -1 | 1) {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * Math.min(280, el.clientWidth * 0.7), behavior: "smooth" });
  }

  return (
    <section className="flex flex-col gap-5">
      <div className="flex items-end justify-between gap-4">
        <div>
          <p className="text-xs font-semibold tracking-[0.2em] text-green-800 uppercase">
            En cartelera
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight text-black sm:text-3xl">
            Artistas
          </h2>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            aria-label="Anterior"
            onClick={() => scrollBy(-1)}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-black/15 bg-white text-lg text-black transition-colors duration-200 hover:border-green-700 hover:text-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Siguiente"
            onClick={() => scrollBy(1)}
            className="flex size-9 cursor-pointer items-center justify-center rounded-full border border-black/15 bg-white text-lg text-black transition-colors duration-200 hover:border-green-700 hover:text-green-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700"
          >
            ›
          </button>
        </div>
      </div>

      <div className="relative">
        <div
          ref={scrollerRef}
          className="flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {artists.map((artist) => (
            <Link
              key={artist.id}
              href={`/eventos/${artist.eventSlug}`}
              className="group relative h-52 w-[42%] shrink-0 cursor-pointer snap-start overflow-hidden rounded-2xl ring-1 ring-black/10 transition-shadow duration-200 hover:ring-green-600 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-green-700 sm:h-60 sm:w-[30%] lg:w-[22%]"
            >
              {artist.photoSrc ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={artist.photoSrc}
                  alt=""
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 h-full w-full object-cover object-center transition duration-300 group-hover:scale-105"
                />
              ) : (
                <div className="absolute inset-0 bg-zinc-700" />
              )}
              <div
                className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"
                aria-hidden
              />
              <span className="absolute inset-x-0 bottom-0 p-3 text-base font-bold text-white sm:p-4 sm:text-lg">
                {artist.name}
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
