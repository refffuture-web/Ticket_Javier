/**
 * Copia eventos (+ tipos, grilla, galería) de Postgres local → Supabase.
 * No pisa órdenes/tickets de venta ni usuarios (salvo que falte el admin).
 *
 * Uso: pnpm exec tsx scripts/migrate-local-events-to-supabase.ts
 */
import pg from "pg";

const LOCAL =
  process.env.LOCAL_DATABASE_URL ??
  "postgresql://boleteria:boleteria@localhost:5432/boleteria";

const REMOTE = process.env.DATABASE_URL;

async function main() {
  if (!REMOTE) throw new Error("Falta DATABASE_URL (Postgres de Supabase)");

  const local = new pg.Client({ connectionString: LOCAL });
  const remote = new pg.Client({ connectionString: REMOTE });
  await local.connect();
  await remote.connect();
  console.log("Conectado local + Supabase");

  const events = (
    await local.query(`SELECT * FROM "Event" ORDER BY "createdAt" ASC`)
  ).rows;
  console.log(`Eventos locales: ${events.length}`);

  if (events.length === 0) {
    console.log("Nada que migrar.");
    await local.end();
    await remote.end();
    return;
  }

  const eventIds = events.map((e) => e.id);

  const ticketTypes = (
    await local.query(`SELECT * FROM "TicketType" WHERE "eventId" = ANY($1::text[])`, [
      eventIds,
    ])
  ).rows;
  const lineup = (
    await local.query(
      `SELECT * FROM "LineupArtist" WHERE "eventId" = ANY($1::text[])`,
      [eventIds],
    )
  ).rows;
  const gallery = (
    await local.query(
      `SELECT * FROM "EventGalleryImage" WHERE "eventId" = ANY($1::text[])`,
      [eventIds],
    )
  ).rows;

  console.log({
    ticketTypes: ticketTypes.length,
    lineup: lineup.length,
    gallery: gallery.length,
  });

  await remote.query("BEGIN");
  try {
    for (const e of events) {
      await remote.query(
        `INSERT INTO "Event" (
          id, slug, title, description, "startsAt", venue, "coverImageKey",
          status, "createdAt", "updatedAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
        ON CONFLICT (id) DO UPDATE SET
          slug = EXCLUDED.slug,
          title = EXCLUDED.title,
          description = EXCLUDED.description,
          "startsAt" = EXCLUDED."startsAt",
          venue = EXCLUDED.venue,
          "coverImageKey" = EXCLUDED."coverImageKey",
          status = EXCLUDED.status,
          "updatedAt" = EXCLUDED."updatedAt"`,
        [
          e.id,
          e.slug,
          e.title,
          e.description,
          e.startsAt,
          e.venue,
          e.coverImageKey,
          e.status,
          e.createdAt,
          e.updatedAt,
        ],
      );
      console.log(`  Event: ${e.title} (${e.status})`);
    }

    for (const t of ticketTypes) {
      await remote.query(
        `INSERT INTO "TicketType" (
          id, "eventId", name, "priceCents", capacity, "soldCount", "reservedCount",
          "maxPerOrder", "saleStartsAt", "saleEndsAt", active, "createdAt", "updatedAt"
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          "priceCents" = EXCLUDED."priceCents",
          capacity = EXCLUDED.capacity,
          "soldCount" = EXCLUDED."soldCount",
          "reservedCount" = EXCLUDED."reservedCount",
          "maxPerOrder" = EXCLUDED."maxPerOrder",
          "saleStartsAt" = EXCLUDED."saleStartsAt",
          "saleEndsAt" = EXCLUDED."saleEndsAt",
          active = EXCLUDED.active,
          "updatedAt" = EXCLUDED."updatedAt"`,
        [
          t.id,
          t.eventId,
          t.name,
          t.priceCents,
          t.capacity,
          t.soldCount,
          t.reservedCount,
          t.maxPerOrder,
          t.saleStartsAt,
          t.saleEndsAt,
          t.active,
          t.createdAt,
          t.updatedAt,
        ],
      );
    }

    for (const a of lineup) {
      await remote.query(
        `INSERT INTO "LineupArtist" (
          id, "eventId", name, "photoKey", "sortOrder", "startsAt", links
        ) VALUES ($1,$2,$3,$4,$5,$6,$7)
        ON CONFLICT (id) DO UPDATE SET
          name = EXCLUDED.name,
          "photoKey" = EXCLUDED."photoKey",
          "sortOrder" = EXCLUDED."sortOrder",
          "startsAt" = EXCLUDED."startsAt",
          links = EXCLUDED.links`,
        [a.id, a.eventId, a.name, a.photoKey, a.sortOrder, a.startsAt, a.links],
      );
    }

    for (const g of gallery) {
      await remote.query(
        `INSERT INTO "EventGalleryImage" (
          id, "eventId", "imageKey", "sortOrder", "createdAt"
        ) VALUES ($1,$2,$3,$4,$5)
        ON CONFLICT (id) DO UPDATE SET
          "imageKey" = EXCLUDED."imageKey",
          "sortOrder" = EXCLUDED."sortOrder"`,
        [g.id, g.eventId, g.imageKey, g.sortOrder, g.createdAt],
      );
    }

    await remote.query("COMMIT");
    console.log("Migración OK.");
  } catch (error) {
    await remote.query("ROLLBACK");
    throw error;
  }

  const check = await remote.query(
    `SELECT title, status, "coverImageKey" IS NOT NULL AS has_cover FROM "Event"`,
  );
  console.log("En Supabase ahora:", check.rows);

  await local.end();
  await remote.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
