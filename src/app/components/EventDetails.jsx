"use client";

import { useState } from "react";
import Image from "next/image";
import { TextField, MenuItem, IconButton } from "@mui/material";
import { motion } from "framer-motion";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { addToCart } from "@/redux/slices/cartSlice";
import { toast } from "react-hot-toast"; 

export default function EventDetails({ event }) {
  const [selectedTicket, setSelectedTicket] = useState(event.tickets?.[0]);
  const router = useRouter();
  const dispatch = useDispatch();

  const handleBuy = () => {
    if (!selectedTicket) return;

    console.log(selectedTicket);
    

    // 🟢 Check if selected ticket is VIP
    if (selectedTicket.name?.toLowerCase() === "vip tickets ") {
      toast.error("VIP Tickets are sold out.");
      return;
    }

    dispatch(
      addToCart({
        _id: `${event.title}-${selectedTicket.name}`,
        slug: event.title.replace(/\s+/g, "-").toLowerCase(),
        title: `${event.title} - ${selectedTicket.name}`,
        price: selectedTicket.price,
        image: event.bannerImageUrl,
        quantity: 1,
        size: null,
        color: null,
    
        // Ticket information
        isTicket: true,
        eventTitle: event.title,
        eventId: event._id,
        ticketType: selectedTicket.name,
      })
    );

    router.push("/cart");
  };

  return (
    <div className="flex flex-col gap-4 items-start justify-center mx-auto w-[90%] py-4">
      {/* Back Button */}
      <IconButton onClick={() => router.back()} aria-label="go back">
        <ArrowBackIcon />
      </IconButton>

      <p className="text-2xl md:text-3xl mb-6 font-bold">
        NBD athleisure presents: The Playground
      </p>

      <div className="event-landing gap-16 flex flex-col md:flex-row items-start">
        {/* Event Image */}
        <motion.div
          className="flex-shrink-0"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          {event.bannerImageUrl && (
            <Image
              src={event.bannerImageUrl}
              alt={event.title}
              width={450}
              height={450}
              className="rounded-2xl shadow-lg border border-gray-200"
            />
          )}
        </motion.div>

        {/* Event Details */}
        <motion.div
          className="w-full"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-xl md:text-2xl font-bold mb-4">{event.title}</h1>

          <div className="space-y-3 text-lg">
            <p className="text-sm md:text-base leading-7">
              <span className="font-bold">Date & Time: </span>
              {new Date(event.date).toLocaleString()}
            </p>
            <p className="text-sm md:text-base leading-7">
              <span className="font-bold">Location: </span>
              {event.location}
            </p>
            <p className="text-sm md:text-base leading-7">
              <span className="font-bold">Description: </span>
              {event.description}
            </p>
          </div>

          {/* Ticket Selector */}
          {event.tickets?.length > 0 && (
            <div className="mt-8">
              <label className="block mb-2 font-bold text-base">
                Select Ticket:
              </label>

              <TextField
                select
                variant="outlined"
                value={selectedTicket?.name || ""}
                onChange={(e) =>
                  setSelectedTicket(
                    event.tickets.find((t) => t.name === e.target.value)
                  )
                }
                sx={{
                  minWidth: 250,
                  backgroundColor: "#fff",
                  borderRadius: "8px",
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                  },
                  "& .MuiSelect-select": {
                    padding: "10px 14px",
                  },
                }}
              >
                {event.tickets.map((ticket) => (
                  <MenuItem
                    key={ticket.name}
                    value={ticket.name}
                    disabled={ticket.name?.toLowerCase() === "vip tickets (sold out)"} // 🟢 Optionally disable in dropdown
                  >
                    {ticket.name} — ₦{ticket.price.toLocaleString()}
                  </MenuItem>
                ))}
              </TextField>
            </div>
          )}

          {/* Selected Ticket Price & Buy Button */}
          {selectedTicket && (
            <div className="flex flex-col md:items-end">
              <h2 className="text-lg font-bold mt-8">
                Price: ₦{selectedTicket.price}
              </h2>

              <button
                onClick={handleBuy}
                className={`mt-4 px-8 py-3 text-sm md:text-base rounded-lg transition-all shadow-md ${
                  selectedTicket.name?.toLowerCase() === "vip"
                    ? "bg-gray-400 text-white cursor-not-allowed"
                    : "bg-black text-white hover:bg-gray-800"
                }`}
              >
                {selectedTicket.name?.toLowerCase() === "vip"
                  ? "Sold Out"
                  : `Buy ${selectedTicket.name}`}
              </button>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
