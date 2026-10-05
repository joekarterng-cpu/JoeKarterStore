import crypto from "crypto";
import QRCode from "qrcode";
import nodemailer from "nodemailer";
import { NextResponse } from "next/server";
import { client } from "@/sanity/lib/client";

export async function POST(request) {
  try {
    // =========================================================
    // 1. Get the raw webhook body
    // =========================================================
    const body = await request.text();

    // =========================================================
    // 2. Get Paystack signature
    // =========================================================
    const signature = request.headers.get("x-paystack-signature");

    console.log("Paystack Signature:", signature);

    if (!signature) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing signature",
        },
        { status: 401 }
      );
    }

    // =========================================================
    // 3. Generate our own signature
    // =========================================================
    const expectedSignature = crypto
      .createHmac(
        "sha512",
        process.env.PAYSTACK_LIVE_SECRET_KEY
      )
      .update(body)
      .digest("hex");

    // =========================================================
    // 4. Compare signatures
    // =========================================================
    if (signature !== expectedSignature) {
      console.error("Invalid Paystack signature");

      return NextResponse.json(
        {
          success: false,
          error: "Invalid signature",
        },
        { status: 401 }
      );
    }

    // =========================================================
    // 5. Parse webhook body
    // =========================================================
    const event = JSON.parse(body);

    const transaction = event.data;

    console.log("========== PAYSTACK WEBHOOK ==========");
    console.log("Event:", event.event);
    console.log("Reference:", transaction?.reference);
    console.log("Status:", transaction?.status);
    console.log("Amount:", transaction?.amount);
    console.log("Customer:", transaction?.customer);
    console.log("Metadata:", transaction?.metadata);
    console.log("======================================");

    // =========================================================
    // 6. Only process successful payments
    // =========================================================
    if (event.event !== "charge.success") {
      return NextResponse.json({
        success: true,
        message: "Event received but not processed",
      });
    }

    // =========================================================
    // 7. Get payment reference
    // =========================================================
    const reference = transaction?.reference;

    if (!reference) {
      return NextResponse.json(
        {
          success: false,
          error: "Missing transaction reference",
        },
        { status: 400 }
      );
    }

    // =========================================================
    // 8. Extract Paystack custom fields
    // =========================================================
    const customFields =
      transaction?.metadata?.custom_fields || [];

    const getCustomField = (variableName) => {
      return customFields.find(
        (field) => field.variable_name === variableName
      )?.value;
    };

    const customerName =
      getCustomField("customer_name");

    const mobileNumber =
      getCustomField("mobile_number");

    const orderItemsRaw =
      getCustomField("order_items");

    console.log("Customer Name:", customerName);
    console.log("Mobile Number:", mobileNumber);
    console.log("Order Items Raw:", orderItemsRaw);

    // =========================================================
    // 9. Parse order items
    // =========================================================
    let orderItems = [];

    try {
      orderItems = JSON.parse(orderItemsRaw || "[]");
    } catch (error) {
      console.error(
        "Failed to parse order_items:",
        error
      );

      return NextResponse.json(
        {
          success: false,
          error: "Invalid order_items metadata",
        },
        { status: 400 }
      );
    }

    console.log("Order Items:", orderItems);

    // =========================================================
    // 10. Find ticket items
    // =========================================================
    const ticketItems = orderItems.filter(
      (item) => item.isTicket === true
    );

    console.log("Ticket Items:", ticketItems);

    // =========================================================
    // 11. Nothing to do if this wasn't a ticket purchase
    // =========================================================
    if (ticketItems.length === 0) {
      return NextResponse.json({
        success: true,
        message:
          "Payment received. No ticket items to process.",
      });
    }

    // =========================================================
    // 12. Create tickets
    // =========================================================
    const createdTickets = [];

    for (
      let itemIndex = 0;
      itemIndex < ticketItems.length;
      itemIndex++
    ) {
      const item = ticketItems[itemIndex];

      const quantity = Number(item.quantity) || 1;

      console.log(
        `Processing ${quantity} ticket(s) for ${item.ticketType}`
      );

      for (
        let ticketIndex = 0;
        ticketIndex < quantity;
        ticketIndex++
      ) {
        // -------------------------------------------------------
        // Deterministic Sanity document ID
        // -------------------------------------------------------
        const ticketId =
          `ticket-${reference}-${itemIndex}-${ticketIndex}`;

        // -------------------------------------------------------
        // Generate unique ticket code
        // -------------------------------------------------------
        const ticketCode =
          `TKT-${crypto
            .randomBytes(6)
            .toString("hex")
            .toUpperCase()}`;

        // -------------------------------------------------------
        // Build ticket document
        // -------------------------------------------------------
        const ticket = {
          _id: ticketId,
          _type: "ticket",

          ticketCode,

          customerName:
            customerName ||
            `${transaction.customer?.first_name || ""} ${
              transaction.customer?.last_name || ""
            }`.trim(),

          customerEmail:
            transaction.customer?.email || "",

          customerPhone:
            mobileNumber ||
            transaction.customer?.phone ||
            "",

          event: {
            _type: "reference",
            _ref: item.eventId,
          },

          eventTitle: item.eventTitle,

          ticketType: item.ticketType,

          paymentReference: reference,

          status: "valid",
        };

        // -------------------------------------------------------
        // Create only if this ticket doesn't already exist
        // -------------------------------------------------------
        const result =
          await client.createIfNotExists(ticket);

        createdTickets.push(result);

        console.log(
          `Ticket processed: ${result.ticketCode}`
        );
      }
    }

    // =========================================================
    // 13. Generate QR codes
    // =========================================================
    console.log(
      `Generating QR codes for ${createdTickets.length} ticket(s)...`
    );

    const ticketEmailItems = [];

    for (const ticket of createdTickets) {
      // -------------------------------------------------------
      // IMPORTANT:
      // The QR code contains ONLY the ticket code.
      // -------------------------------------------------------
      const qrDataUrl = await QRCode.toDataURL(
        ticket.ticketCode,
        {
          width: 300,
          margin: 2,
        }
      );

      ticketEmailItems.push({
        ticket,
        qrDataUrl,
      });

      console.log(
        `QR generated for ${ticket.ticketCode}`
      );
    }

    // =========================================================
    // 14. Get customer email
    // =========================================================
    const customerEmail =
      transaction.customer?.email;

    if (!customerEmail) {
      console.error(
        "Customer email is missing. Tickets were created but email was not sent."
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Tickets created but customer email is missing",
        },
        { status: 500 }
      );
    }

    // =========================================================
    // 15. Build ticket sections
    // =========================================================
    const ticketSections = ticketEmailItems
      .map(({ ticket }, index) => {
        return `
          <div style="
            border: 1px solid #e5e5e5;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 24px;
            text-align: center;
            background: #ffffff;
          ">

            <h2 style="
              margin: 0 0 12px 0;
              font-size: 22px;
            ">
              ${ticket.eventTitle}
            </h2>

            <p style="
              margin: 8px 0;
              color: #555;
            ">
              <strong>Ticket Type:</strong>
              ${ticket.ticketType}
            </p>

            <p style="
              margin: 8px 0;
              color: #555;
            ">
              <strong>Ticket Code:</strong>
              ${ticket.ticketCode}
            </p>

            <div style="margin: 24px 0;">
              <img
                src="cid:ticket-qr-${index}"
                alt="Ticket QR Code"
                width="300"
                height="300"
                style="
                  display: block;
                  margin: 0 auto;
                  max-width: 100%;
                "
              />
            </div>

            <p style="
              color: #666;
              font-size: 14px;
              margin: 0;
            ">
              Present this QR code at the event entrance.
            </p>

          </div>
        `;
      })
      .join("");

    // =========================================================
    // 16. Build complete email
    // =========================================================
    const ticketEmailHtml = `
      <!DOCTYPE html>
      <html>
        <body style="
          margin: 0;
          padding: 0;
          background: #f5f5f5;
          font-family: Arial, Helvetica, sans-serif;
        ">

          <div style="
            max-width: 600px;
            margin: 40px auto;
            background: #ffffff;
            padding: 32px;
            border-radius: 12px;
          ">

            <h1 style="
              margin-top: 0;
              font-size: 28px;
            ">
              🎟️ Your Event Ticket${createdTickets.length > 1 ? "s" : ""}
            </h1>

            <p>
              Hi ${customerName || "there"},
            </p>

            <p>
              Your payment was successful and
              ${createdTickets.length > 1
                ? "your tickets are"
                : "your ticket is"}
              ready.
            </p>

            <p>
              <strong>Payment Reference:</strong>
              ${reference}
            </p>

            <hr style="
              border: none;
              border-top: 1px solid #eeeeee;
              margin: 24px 0;
            " />

            ${ticketSections}

            <p style="
              color: #666;
              font-size: 13px;
              line-height: 1.5;
            ">
              Please keep this email safe and present
              your QR code when you arrive at the event.
            </p>

            <p style="
              margin-top: 24px;
            ">
              — Joe Karter Store
            </p>

          </div>

        </body>
      </html>
    `;

    // =========================================================
    // 17. Create QR attachments
    // =========================================================
    const qrAttachments = ticketEmailItems.map(
      ({ qrDataUrl }, index) => ({
        filename: `ticket-${index + 1}-qr.png`,

        content: Buffer.from(
          qrDataUrl.replace(
            /^data:image\/png;base64,/,
            ""
          ),
          "base64"
        ),

        cid: `ticket-qr-${index}`,
      })
    );

    // =========================================================
    // 18. Configure Nodemailer
    // =========================================================
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // =========================================================
    // 19. Send ONE email containing all tickets
    // =========================================================
    await transporter.sendMail({
      from: `"Joe Karter Store" <${process.env.EMAIL_USER}>`,

      to: customerEmail,

      subject:
        `🎟️ Your ${ticketItems[0].eventTitle} Ticket${
          createdTickets.length > 1 ? "s" : ""
        }`,

      html: ticketEmailHtml,

      attachments: qrAttachments,
    });

    console.log(
      `Ticket email sent successfully to ${customerEmail}`
    );

    // =========================================================
    // 20. Log final result
    // =========================================================
    console.log(
      `Processed ${createdTickets.length} ticket(s) for payment ${reference}`
    );

    // =========================================================
    // 21. Respond to Paystack
    // =========================================================
    return NextResponse.json({
      success: true,
      message:
        "Tickets processed and emailed successfully",
      reference,
      ticketCount: createdTickets.length,
    });

  } catch (error) {
    console.error("Webhook error:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Webhook processing failed",
      },
      { status: 500 }
    );
  }
}