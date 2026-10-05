export default {
  name: "ticket",
  title: "Ticket",
  type: "document",

  fields: [
    {
      name: "ticketCode",
      title: "Ticket Code",
      type: "string",
      validation: (Rule) => Rule.required().unique(),
    },

    {
      name: "customerName",
      title: "Customer Name",
      type: "string",
      validation: (Rule) => Rule.required(),
    },

    {
      name: "customerEmail",
      title: "Customer Email",
      type: "string",
      validation: (Rule) => Rule.required(),
    },

    {
      name: "customerPhone",
      title: "Customer Phone",
      type: "string",
    },

    {
      name: "event",
      title: "Event",
      type: "reference",
      to: [{ type: "eventTicket" }],
    },

    {
      name: "eventTitle",
      title: "Event Title",
      type: "string",
      validation: (Rule) => Rule.required(),
    },

    {
      name: "ticketType",
      title: "Ticket Type",
      type: "string",
      validation: (Rule) => Rule.required(),
    },

    {
      name: "paymentReference",
      title: "Payment Reference",
      type: "string",
      validation: (Rule) => Rule.required().unique(),
    },

    {
      name: "qrCode",
      title: "QR Code",
      type: "string",
    },

    {
      name: "status",
      title: "Status",
      type: "string",
      options: {
        list: [
          { title: "Valid", value: "valid" },
          { title: "Used", value: "used" },
        ],
      },
      initialValue: "valid",
    },

    {
      name: "scannedAt",
      title: "Scanned At",
      type: "datetime",
    },
  ],
};