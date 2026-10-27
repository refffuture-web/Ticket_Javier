-- resto-kds usa la clave pública de Supabase para leer la cola de impresión
-- (Ticket con fisico=true) y marcarla como impresa. La clave pública solo ve
-- esa cola, las columnas que imprime y nada más.
ALTER TABLE "Ticket" ADD COLUMN "printedAt" TIMESTAMP(3);

CREATE FUNCTION ticket_set_printed_at() RETURNS trigger
LANGUAGE plpgsql SET search_path = '' AS $$
BEGIN
  IF OLD.fisico AND NOT NEW.fisico THEN
    NEW."printedAt" := now();
  END IF;
  RETURN NEW;
END
$$;

CREATE TRIGGER ticket_printed_at BEFORE UPDATE OF fisico ON "Ticket"
FOR EACH ROW EXECUTE FUNCTION ticket_set_printed_at();

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon, authenticated;

GRANT SELECT (id, "shortCode", status, fisico, "printCount", "createdAt", "orderId", "eventId", "ticketTypeId") ON "Ticket" TO anon;
GRANT UPDATE (fisico, "printCount") ON "Ticket" TO anon;
GRANT SELECT (id, "buyerName", "buyerEmail", "buyerPhone", "paymentMethod", origin) ON "Order" TO anon;
GRANT SELECT (id, title, "startsAt", venue) ON "Event" TO anon;
GRANT SELECT (id, name, "priceCents") ON "TicketType" TO anon;

-- Marcar impresa devuelve la fila (UPDATE ... RETURNING): por eso sigue visible
-- un minuto después de salir de la cola.
CREATE POLICY print_queue_select ON "Ticket" FOR SELECT TO anon
  USING (status = 'VALIDO' AND (fisico OR "printedAt" > now() - interval '1 minute'));
CREATE POLICY print_queue_ack ON "Ticket" FOR UPDATE TO anon
  USING (fisico AND status = 'VALIDO')
  WITH CHECK (NOT fisico AND status = 'VALIDO');
CREATE POLICY print_queue_order ON "Order" FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM "Ticket" t WHERE t."orderId" = "Order".id));
CREATE POLICY print_queue_event ON "Event" FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM "Ticket" t WHERE t."eventId" = "Event".id));
CREATE POLICY print_queue_type ON "TicketType" FOR SELECT TO anon
  USING (EXISTS (SELECT 1 FROM "Ticket" t WHERE t."ticketTypeId" = "TicketType".id));
