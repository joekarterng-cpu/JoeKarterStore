import { NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";

export async function POST(request) {
  try {
    const body = await request.json();

    const { ticketCode } = body;

    // =========================================================
    // 1. Validate input
    // =========================================================

    if (!ticketCode) {
      return NextResponse.json(
        {
          success: false,
          status: "invalid",
          message: "Ticket code is required",
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 2. Find ticket
    // =========================================================

    const ticket = await client.fetch(
      `*[
        _type == "ticket" &&
        ticketCode == $ticketCode
      ][0]{
        _id,
        ticketCode,
        customerName,
        customerEmail,
        customerPhone,
        eventTitle,
        ticketType,
        paymentReference,
        status,
        scannedAt
      }`,
      {
        ticketCode,
      }
    );

    // =========================================================
    // 3. Ticket doesn't exist
    // =========================================================

    if (!ticket) {
      return NextResponse.json(
        {
          success: false,
          status: "invalid",
          message: "Invalid ticket",
        },
        { status: 404 }
      );
    }

    // =========================================================
    // 4. Ticket has already been used
    // =========================================================

    if (ticket.status === "used") {
      return NextResponse.json(
        {
          success: false,
          status: "used",
          message: "Ticket has already been used",
          ticket: {
            ticketCode: ticket.ticketCode,
            customerName: ticket.customerName,
            eventTitle: ticket.eventTitle,
            ticketType: ticket.ticketType,
            scannedAt: ticket.scannedAt,
          },
        },
        { status: 409 }
      );
    }

    // =========================================================
    // 5. Mark ticket as used
    // =========================================================

    const scannedAt = new Date().toISOString();

    const updatedTicket = await client
      .patch(ticket._id)
      .set({
        status: "used",
        scannedAt,
      })
      .commit();

    // =========================================================
    // 6. Successful validation
    // =========================================================

    return NextResponse.json({
      success: true,
      status: "valid",
      message: "Ticket validated successfully",
      ticket: {
        ticketCode: updatedTicket.ticketCode,
        customerName: updatedTicket.customerName,
        customerEmail: updatedTicket.customerEmail,
        customerPhone: updatedTicket.customerPhone,
        eventTitle: updatedTicket.eventTitle,
        ticketType: updatedTicket.ticketType,
        scannedAt: updatedTicket.scannedAt,
      },
    });

  } catch (error) {
    console.error("Ticket validation error:", error);

    return NextResponse.json(
      {
        success: false,
        status: "error",
        message: "Failed to validate ticket",
      },
      { status: 500 }
    );
  }
}