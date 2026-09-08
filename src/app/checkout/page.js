"use client";

import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";
import { paystackTestKey } from "@/sanity/env";
import {
  TextField,
  Button,
  Checkbox,
  FormControlLabel,
  FormControl,
  FormLabel,
  RadioGroup,
  Radio,
  Typography,
  Box,
  Chip,
  Divider,
  CircularProgress,
  InputAdornment,
  Paper,
} from "@mui/material";
import {
  AiFillMail,
  AiOutlineUser,
  AiFillPhone,
  AiFillHome,
  AiFillMoneyCollect,
} from "react-icons/ai";
import { FaArrowRight } from "react-icons/fa";
import { motion } from "framer-motion";
import Link from "next/link";
import { IconButton } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";

export default function CheckoutPage() {
  const [isPaystackReady, setPaystackReady] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [isCartLoading, setIsCartLoading] = useState(true);
  const [agreed, setAgreed] = useState(false);
  const [promoTried, setPromoTried] = useState(false);

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    state: "",
    promo: "",
    deliveryLocation: "",
  });

  const [appliedDiscount, setAppliedDiscount] = useState(0);
  const [couponApplied, setCouponApplied] = useState(false);

  const cart = useSelector((state) => state.cart.productData);

  const router = useRouter();

  const deliveryFees = {
    mainland: 4000,
    island: 6000,
    ikorodu: 6000,
    Ajah: 7000,
    none: 0,
  };

  const deliveryFee = deliveryFees[form.deliveryLocation] || 0;

  const cartTotal = cart.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const total = cartTotal + deliveryFee - appliedDiscount;

  useEffect(() => {
    const script = document.createElement("script");
    script.src = "https://js.paystack.co/v1/inline.js";
    script.async = true;
    script.onload = () => setPaystackReady(true);
    document.body.appendChild(script);
  }, []);

  useEffect(() => {
    if (cart !== undefined) {
      setIsCartLoading(false);
    }
  }, [cart]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleApplyCoupon = async () => {
    const code = form.promo.trim().toUpperCase();
    setPromoTried(true);
    if (!code) {
      toast.error("Please enter a promo code");
      setCouponApplied(false);
      setAppliedDiscount(0);
      return;
    }

    try {
      setIsApplying(true);
      const res = await fetch("/api/promo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
      });

      const data = await res.json();

      if (!data.success) {
        setCouponApplied(false);
        setAppliedDiscount(0);
        toast.error(data.message || "Invalid promo code");
      } else {
        setCouponApplied(true);
        setAppliedDiscount(data.discount);
        toast.success(`Promo applied: ₦${data.discount} off`);
      }
    } catch (err) {
      toast.error("Something went wrong validating the promo");
      setCouponApplied(false);
      setAppliedDiscount(0);
    } finally {
      setIsApplying(false);
    }
  };

  const isValidEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const isValidPhone = (phone) => {
    const phoneRegex = /^(?:\+234|0)[789][01]\d{8}$/;
    return phoneRegex.test(phone);
  };

  const handlePayment = async (e) => {
    if (e) e.preventDefault();

    if (!isPaystackReady || !window.PaystackPop) {
      toast.error("Payment system not ready. Please wait...");
      return;
    }

    const requiredFields = [
      "firstName",
      "lastName",
      "email",
      "phone",
      "address",
      "city",
      "state",
    ];

    for (const field of requiredFields) {
      if (!form[field]) {
        toast.error("Please complete your delivery information");
        return;
      }

      if (!isValidEmail(form.email)) {
        toast.error("Please enter a valid email address.");
        return;
      }

      if (!isValidPhone(form.phone)) {
        toast.error("Please enter a valid phone number.");
        return;
      }
    }

    if (!agreed) {
      toast.error("Please agree to the terms and conditions.");
      return;
    }

    setIsProcessing(true);

    try {
      const response = await fetch("/api/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          form,
          cart,
          total,
          discount: appliedDiscount,
          promoCode: form.promo.trim().toUpperCase(),
        }),
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error);
    } catch (err) {
      toast.error("Failed to send order details via email");
      setIsProcessing(false);
      return;
    }

    const handler = window.PaystackPop.setup({
      // key: paystackTestKey,
      key: process.env.NEXT_PUBLIC_PAYSTACK_LIVE_KEY,
      email: form.email,
      amount: total * 100,
      currency: "NGN",
      metadata: {
        custom_fields: [
          {
            display_name: "Customer Name",
            variable_name: "customer_name",
            value: `${form.firstName} ${form.lastName}`,
          },
          {
            display_name: "Mobile Number",
            variable_name: "mobile_number",
            value: form.phone,
          },
        ],
      },
      callback: function (response) {
        (async () => {
          try {
            const res = await fetch("/api/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ reference: response?.reference }),
            });

            const data = await res.json();

            if (data.success) {
              toast.success("Payment verified ✅");
              router.push("/success");
            } else {
              toast.error("Payment could not be verified ❌");
            }
          } catch (error) {
            toast.error("Verification failed, please try again.");
          } finally {
            setIsProcessing(false);
          }
        })();
      },

      onClose: function () {
        toast("Transaction cancelled");
        setIsProcessing(false);
      },
    });

    handler.openIframe();
  };

  if (isCartLoading) {
    return (
      <Box className="flex justify-center items-center min-h-[60vh]">
        <CircularProgress size={25} sx={{ color: "#000" }} />
      </Box>
    );
  }

  if (cart.length === 0) {
    return (
      <Box className="max-w-3xl mx-auto py-20 px-6 text-center">
        <Typography variant="h5" fontWeight="bold">
          Your cart is empty.
        </Typography>
      </Box>
    );
  }

  return (
    <div className="flex flex-col md:w-[95%] mx-auto py-8 px-3 md:px-6 md:flex-row gap-36">
      {/* Shipping Info */}

      <motion.div
        initial={{ x: -80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="w-full md:w-[50%]"
      >
        <IconButton
          onClick={() => router.back()}
          aria-label="go back"
          className="!mb-5"
        >
          <ArrowBackIcon />
        </IconButton>
        <Paper className="md:!p-8 !p-4 !rounded-xl">
          <Typography
            variant="h6"
            fontWeight="bold"
            className="!mb-6 !text-base md:!text-xl"
          >
            Shipping Information
          </Typography>
          <Box display="flex" flexDirection="column" gap={3}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField
                fullWidth
                required
                label="First Name"
                name="firstName"
                value={form.firstName}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AiOutlineUser />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                required
                label="Last Name"
                name="lastName"
                value={form.lastName}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AiOutlineUser />
                    </InputAdornment>
                  ),
                }}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField
                fullWidth
                required
                label="Email"
                name="email"
                value={form.email}
                onChange={handleChange}
                type="email"
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AiFillMail />
                    </InputAdornment>
                  ),
                }}
              />
              <TextField
                fullWidth
                required
                label="Phone Number"
                name="phone"
                value={form.phone}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AiFillPhone />
                    </InputAdornment>
                  ),
                }}
              />
            </div>
            <Box display="flex" flexDirection="column" gap={3}>
              {/* Previous fields */}

              {/* Delivery Area Selection */}
              <FormControl component="fieldset">
                <FormLabel
                  component="legend"
                  className="!text-sm !mb-4 !font-bold md:!text-base !text-black"
                >
                  Select your delivery location (Select if you're shopping
                  products only and not tickets.)
                </FormLabel>
                <RadioGroup
                  name="deliveryLocation"
                  value={form.deliveryLocation}
                  onChange={handleChange}
                  className="!grid !grid-cols-1 md:!grid-cols-2 !text-black"
                >
                  <FormControlLabel
                    value="mainland"
                    control={<Radio size="small" className="!text-black" />}
                    label="Lagos Mainland Axis (₦4000)"
                    sx={{
                      "& .MuiFormControlLabel-label": { fontSize: "0.8rem" },
                    }}
                  />
                  <FormControlLabel
                    value="island"
                    control={<Radio size="small" className="!text-black" />}
                    label="Island Axis (₦6000)"
                    sx={{
                      "& .MuiFormControlLabel-label": { fontSize: "0.8rem" },
                    }}
                  />
                  <FormControlLabel
                    value="ikorodu"
                    control={<Radio size="small" className="!text-black" />}
                    label="Ikorodu & Axis (₦6000)"
                    sx={{
                      "& .MuiFormControlLabel-label": { fontSize: "0.8rem" },
                    }}
                  />

                  <FormControlLabel
                    value="ajah"
                    control={<Radio size="small" className="!text-black" />}
                    label="Ajah(₦7000)"
                    sx={{
                      "& .MuiFormControlLabel-label": { fontSize: "0.8rem" },
                    }}
                  />

                  <FormControlLabel
                    value="none"
                    control={<Radio size="small" className="!text-black" />}
                    label="None"
                    sx={{
                      "& .MuiFormControlLabel-label": { fontSize: "0.8rem" },
                    }}
                  />
                </RadioGroup>
              </FormControl>

              <TextField
                fullWidth
                required
                label="Address"
                name="address"
                value={form.address}
                onChange={handleChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <AiFillHome />
                    </InputAdornment>
                  ),
                }}
              />
              {/* Other fields... */}
            </Box>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <TextField
                fullWidth
                required
                label="City"
                name="city"
                value={form.city}
                onChange={handleChange}
                InputLabelProps={{
                  sx: {
                    fontSize: {
                      xs: "0.75rem", // ~12px on extra-small screens
                      sm: "0.85rem", // ~13.6px on small and above
                    },
                  },
                }}
              />

              <TextField
                fullWidth
                required
                label="State"
                name="state"
                value={form.state}
                onChange={handleChange}
                InputLabelProps={{
                  sx: {
                    fontSize: {
                      xs: "0.75rem",
                      sm: "0.85rem",
                    },
                  },
                }}
              />
            </div>

            <Link
              href="/terms"
              className="inline-block group hover:text-[#00008b] hover:underline"
            >
              <div className="flex gap-2 items-center ">
                <Typography className="!text-xs md:!text-base !font-bold !underline ">
                  Terms and Conditions
                </Typography>
                <FaArrowRight className="!text-sm md:!text-base group-hover:translate-x-2 transition-transform duration-300 " />
              </div>
            </Link>

            <FormControlLabel
              className="p-0"
              control={
                <Checkbox
                  className="!text-xs !text-black"
                  checked={agreed}
                  onChange={(e) => setAgreed(e.target.checked)}
                />
              }
              label={
                <span className="text-xs sm:text-sm">
                  I agree to the Terms and Conditions
                </span>
              }
            />
          </Box>
        </Paper>
      </motion.div>

      {/* Order Summary */}
      <motion.div
        initial={{ x: 80, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="flex-1"
      >
        <Paper elevation={2} className="md:!p-8 !p-6 !rounded-xl">
          <Typography
            variant="h6"
            fontWeight="bold"
            className="!mb-6 !text-base md:!text-xl"
          >
            Order Summary
          </Typography>
          <Box className="space-y-8">
            {cart.map((item) => (
              <Box
                key={item._id}
                className="flex justify-between text-sm text-gray-700"
              >
                <span>
                  {item.title} × {item.quantity}
                </span>
                <span className="font-bold">
                  ₦{(item.price * item.quantity).toLocaleString()}
                </span>
              </Box>
            ))}

            <Divider className="!my-4" />

            <Box className="flex justify-between text-sm">
              <span>Subtotal</span>
              <span>₦{cartTotal.toLocaleString()}</span>
            </Box>
            <Box className="flex justify-between text-sm">
              <span>Delivery Fee</span>
              <span>₦{deliveryFee.toLocaleString()}</span>
            </Box>

            <Box className="space-y-2">
              <Typography className="!mb-4 !text-sm ">Coupon code</Typography>
              <Box className="flex gap-2 items-center">
                <TextField
                  fullWidth
                  name="promo"
                  value={form.promo}
                  onChange={handleChange}
                  size="small"
                  placeholder="Enter coupon code"
                  inputProps={{ style: { fontSize: "1rem" } }}
                />
                <Button
                  variant="contained"
                  onClick={handleApplyCoupon}
                  disabled={isApplying}
                  className="!bg-black !text-white hover:!scale-105 !capitalize !transition !ease-in-out duration-300"
                >
                  {isApplying ? "Checking..." : "Apply"}
                </Button>
              </Box>
              {promoTried && !isApplying && (
                <Chip
                  label={
                    couponApplied
                      ? `Promo Applied: ₦${appliedDiscount.toLocaleString()} off`
                      : "Invalid Promo Code"
                  }
                  color={couponApplied ? "success" : "error"}
                  variant="outlined"
                />
              )}
            </Box>

            <Box className="flex justify-between text-sm">
              <span>Discount</span>
              <span>-₦{appliedDiscount.toLocaleString()}</span>
            </Box>
            <Divider className="!my-4" />
            <Box className="flex justify-between font-bold text-base">
              <span>Total</span>
              <span>₦{total.toLocaleString()}</span>
            </Box>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handlePayment();
              }}
            >
              <Button
                type="submit"
                variant="contained"
                disabled={!isPaystackReady || isProcessing}
                className="!bg-black !text-white w-full hover:!scale-105 !py-3 !transition capitalize !ease-in-out duration-300 !mt-6"
              >
                {isProcessing ? (
                  <CircularProgress
                    className="!text-white"
                    size={25}
                    sx={{ color: "#fff" }}
                  />
                ) : (
                  <Typography className="!text-xs !text-white !font-bold  md:!text-base capitalize">
                    Pay with Paystack
                  </Typography>
                )}
              </Button>
            </form>
          </Box>
        </Paper>
      </motion.div>
      <Toaster />
    </div>
  );
}
