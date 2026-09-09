"use client";

import { Box, Typography, Button, Paper } from "@mui/material";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { AiOutlineCheckCircle } from "react-icons/ai";

export default function SuccessPage() {
  const router = useRouter();

  return (
    <Box className="min-h-[70vh] flex justify-center items-center px-4">
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        <Paper elevation={3} className="p-8 rounded-2xl text-center">
          <Box className="flex justify-center !mb-4  text-green-600 text-5xl">
            <AiOutlineCheckCircle />
          </Box>

          <Typography
            variant="h5"
            fontWeight="bold"
            className="!mb-4 !text-xl md:!text-2xl"
          >
            Payment Successful!
          </Typography>

          <Typography className="!text-sm md:!text-base text-gray-600 !mb-6">
            Thank you for your purchase!. We’ve received your order and will begin processing it shortly!.
          </Typography>

          <Button
            variant="contained"
            onClick={() => router.push("/")}
            className="!bg-black hover:!scale-105 !transition !duration-300 !rounded-xl !capitalize"
          >
            Continue Shopping
          </Button>
        </Paper>
      </motion.div>
    </Box>
  );
}
