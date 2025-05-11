import React from "react";
import Link from "next/link";
import { motion } from "framer-motion";

const Header = () => {
  return (
    <motion.header 
      className="w-full border-b border-black/10 py-6 px-6 sticky top-0 z-50 bg-white/80 backdrop-blur-md"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="container mx-auto flex text-center justify-center items-center">
        <Link href="/" className="text-2xl font-bold tracking-tight">
          <motion.span 
            className="text-black"
            whileHover={{ scale: 1.05 }}
            transition={{ type: "spring", stiffness: 500 }}
          >
            VAULT
          </motion.span>
        </Link>
      </div>
    </motion.header>
  );
};

export default Header;