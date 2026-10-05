"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Typography, Button, Paper } from "@mui/material";
import { motion } from "framer-motion";
import { Html5Qrcode } from "html5-qrcode";
import {
  AiOutlineScan,
  AiOutlineCheckCircle,
  AiOutlineCloseCircle,
  AiOutlineWarning,
} from "react-icons/ai";

export default function ScannerPage() {
  const scannerRef = useRef(null);

  const [scannerReady, setScannerReady] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState(null);

  // =========================================================
  // Initialize scanner
  // =========================================================

  useEffect(() => {
    let mounted = true;

    async function initializeScanner() {
      try {
        const scanner = new Html5Qrcode("qr-reader");

        scannerRef.current = scanner;

        if (mounted) {
          setScannerReady(true);
        }
      } catch (error) {
        console.error(
          "Failed to initialize QR scanner:",
          error
        );

        setResult({
          type: "error",
          message: "Unable to initialize scanner.",
        });
      }
    }

    initializeScanner();

    return () => {
      mounted = false;

      const scanner = scannerRef.current;

      if (scanner) {
        scanner
          .stop()
          .catch(() => {});
      }
    };
  }, []);

  // =========================================================
  // Start scanner
  // =========================================================

  async function startScanner() {
    const scanner = scannerRef.current;

    if (!scanner) {
      console.error("Scanner is not initialized");
      return;
    }

    try {
      setResult(null);
      setScanning(true);

      await scanner.start(
        {
          facingMode: "environment",
        },
        {
          fps: 10,
          qrbox: {
            width: 250,
            height: 250,
          },
        },
        async (decodedText) => {
          console.log(
            "QR scanned:",
            decodedText
          );

          try {
            await scanner.stop();
          } catch (error) {
            console.log(
              "Scanner stop error:",
              error
            );
          }

          setScanning(false);

          await validateTicket(decodedText);
        },
        () => {}
      );
    } catch (error) {
      console.error(
        "Failed to start scanner:",
        error
      );

      setScanning(false);

      setResult({
        type: "error",
        message:
          "Unable to access the camera. Please allow camera permission.",
      });
    }
  }

  // =========================================================
  // Validate ticket
  // =========================================================

  async function validateTicket(ticketCode) {
    try {
      const cleanTicketCode =
        ticketCode.trim();

      console.log(
        "Validating:",
        cleanTicketCode
      );

      const response = await fetch(
        "/api/tickets/validate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            ticketCode: cleanTicketCode,
          }),
        }
      );

      const data = await response.json();

      console.log(
        "Validation response:",
        data
      );

      if (data.status === "valid") {
        setResult({
          type: "success",
          message: "Ticket Valid",
          ticket: data.ticket,
        });

        return;
      }

      if (data.status === "used") {
        setResult({
          type: "used",
          message: "Ticket Already Used",
          ticket: data.ticket,
        });

        return;
      }

      setResult({
        type: "invalid",
        message: "Invalid Ticket",
      });
    } catch (error) {
      console.error(
        "Ticket validation error:",
        error
      );

      setResult({
        type: "error",
        message:
          "Something went wrong while validating the ticket.",
      });
    }
  }

  // =========================================================
  // Scan another ticket
  // =========================================================

  async function scanAgain() {
    setResult(null);

    await startScanner();
  }

  // =========================================================
  // Result icon
  // =========================================================

  const renderResultIcon = () => {
    if (result?.type === "success") {
      return (
        <AiOutlineCheckCircle className="text-green-600 text-6xl" />
      );
    }

    if (result?.type === "used") {
      return (
        <AiOutlineWarning className="text-orange-500 text-6xl" />
      );
    }

    if (result?.type === "invalid") {
      return (
        <AiOutlineCloseCircle className="text-red-600 text-6xl" />
      );
    }

    return (
      <AiOutlineWarning className="text-gray-700 text-6xl" />
    );
  };

  return (
    <Box className="min-h-[70vh] flex justify-center items-center px-4 py-10">
      <motion.div
        initial={{
          y: 40,
          opacity: 0,
        }}
        animate={{
          y: 0,
          opacity: 1,
        }}
        transition={{
          duration: 0.5,
        }}
        className="w-full max-w-md"
      >
        <Paper
          elevation={3}
          className="p-6 md:p-8 rounded-2xl text-center"
        >
          {/* ================================================= */}
          {/* Header */}
          {/* ================================================= */}

          {!result && (
            <>
              <Box className="flex justify-center mb-4">
                <div className="w-16 h-16 rounded-full bg-gray-100 flex items-center justify-center">
                  <AiOutlineScan className="text-4xl text-black" />
                </div>
              </Box>

              <Typography
                variant="h5"
                fontWeight="bold"
                className="!mb-2 !text-xl md:!text-2xl"
              >
                Ticket Scanner
              </Typography>

              <Typography className="!text-sm md:!text-base text-gray-600 !mb-6">
                Scan the QR code on the
                customer&apos;s ticket to
                validate their entry.
              </Typography>
            </>
          )}

          {/* ================================================= */}
          {/* Scanner */}
          {/* ================================================= */}

          {!result && (
            <>
              <div
                id="qr-reader"
                className={`w-full overflow-hidden rounded-xl ${
                  scanning
                    ? "mb-6"
                    : "hidden"
                }`}
              />

              {!scanning &&
                scannerReady && (
                  <Button
                    variant="contained"
                    onClick={startScanner}
                    className="
                      !bg-black
                      hover:!bg-gray-800
                      !text-white
                      !px-8
                      !py-3
                      !rounded-xl
                      !capitalize
                      !font-medium
                      !transition
                      !duration-300
                      hover:!scale-105
                    "
                  >
                    Start Scanner
                  </Button>
                )}
            </>
          )}

          {/* ================================================= */}
          {/* Result */}
          {/* ================================================= */}

          {result && (
            <motion.div
              initial={{
                y: 20,
                opacity: 0,
              }}
              animate={{
                y: 0,
                opacity: 1,
              }}
              transition={{
                duration: 0.4,
              }}
            >
              <Box className="flex justify-center mb-4">
                {renderResultIcon()}
              </Box>

              <Typography
                variant="h5"
                fontWeight="bold"
                className="!mb-2 !text-xl md:!text-2xl"
              >
                {result.message}
              </Typography>

              {result.type ===
                "success" &&
                result.ticket && (
                  <Typography className="!text-sm text-gray-600 !mb-6">
                    This ticket has been
                    successfully validated
                    and the customer can
                    enter the event.
                  </Typography>
                )}

              {result.type ===
                "used" &&
                result.ticket && (
                  <Typography className="!text-sm text-gray-600 !mb-6">
                    This ticket has already
                    been scanned and cannot
                    be used again.
                  </Typography>
                )}

              {result.type ===
                "invalid" && (
                <Typography className="!text-sm text-gray-600 !mb-6">
                  This ticket could not be
                  found in the system.
                </Typography>
              )}

              {result.type ===
                "error" && (
                <Typography className="!text-sm text-gray-600 !mb-6">
                  Please try again.
                </Typography>
              )}

              {/* Ticket Information */}

              {result.ticket && (
                <Box
                  className="
                    text-left
                    bg-gray-50
                    rounded-xl
                    p-5
                    mb-6
                  "
                >
                  <div className="mb-3">
                    <Typography
                      variant="caption"
                      className="!text-gray-500"
                    >
                      Event
                    </Typography>

                    <Typography
                      fontWeight="600"
                      className="!text-sm"
                    >
                      {result.ticket.eventTitle}
                    </Typography>
                  </div>

                  <div className="mb-3">
                    <Typography
                      variant="caption"
                      className="!text-gray-500"
                    >
                      Ticket Type
                    </Typography>

                    <Typography
                      fontWeight="600"
                      className="!text-sm"
                    >
                      {result.ticket.ticketType}
                    </Typography>
                  </div>

                  <div className="mb-3">
                    <Typography
                      variant="caption"
                      className="!text-gray-500"
                    >
                      Customer
                    </Typography>

                    <Typography
                      fontWeight="600"
                      className="!text-sm"
                    >
                      {result.ticket.customerName}
                    </Typography>
                  </div>

                  <div>
                    <Typography
                      variant="caption"
                      className="!text-gray-500"
                    >
                      Ticket Code
                    </Typography>

                    <Typography
                      fontWeight="600"
                      className="!text-sm break-all"
                    >
                      {result.ticket.ticketCode}
                    </Typography>
                  </div>

                  {result.ticket.scannedAt && (
                    <div className="mt-3">
                      <Typography
                        variant="caption"
                        className="!text-gray-500"
                      >
                        Scanned At
                      </Typography>

                      <Typography
                        fontWeight="600"
                        className="!text-sm"
                      >
                        {new Date(
                          result.ticket.scannedAt
                        ).toLocaleString()}
                      </Typography>
                    </div>
                  )}
                </Box>
              )}

              {/* Scan Again */}

              <Button
                variant="contained"
                onClick={scanAgain}
                className="
                  !bg-black
                  hover:!bg-gray-800
                  !text-white
                  !px-8
                  !py-3
                  !rounded-xl
                  !capitalize
                  !font-medium
                  !transition
                  !duration-300
                  hover:!scale-105
                "
              >
                Scan Another Ticket
              </Button>
            </motion.div>
          )}
        </Paper>
      </motion.div>
    </Box>
  );
}