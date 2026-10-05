// app/event/page.tsx (or wherever this page lives)

import { client } from "@/sanity/lib/client";
import EventDetails from "../components/EventDetails";

// --- Fetch Event from Sanity (server side) ---
async function getEvent() {
  const query = `*[_type == "eventTicket"][0]{
  _id,
  title,
  date,
  description,
  location,
  "bannerImageUrl": bannerImage.asset->url,
  tickets[] {
    name,
    price,
    checkoutUrl
  }
}`;
  return await client.fetch(query);
}

// --- Server Component ---
export default async function EventPage() {
  const event = await getEvent();

  if (!event || !event.tickets || event.tickets.length === 0) {
    return (
      <p className="text-center py-4 text-gray-500">No events now</p>
    );
  }

  return <EventDetails event={event} />;
}
