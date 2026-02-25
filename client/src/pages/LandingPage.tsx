import { motion } from "framer-motion";
import { Link } from "wouter";
import { UtensilsCrossed, Users, ArrowRight, ChefHat } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-orange-50 via-white to-rose-50 p-6 relative overflow-hidden">
      {/* Background decorative blobs */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-rose-100 opacity-30 blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[400px] h-[400px] rounded-full bg-orange-100 opacity-40 blur-3xl pointer-events-none" />

      {/* Header */}
      <motion.div
        className="flex flex-col items-center mb-12 z-10"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-rose-400 to-orange-400 flex items-center justify-center mb-5 shadow-xl shadow-rose-200">
          <UtensilsCrossed className="w-10 h-10 text-white" />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-gray-900">MyDine</h1>
        <p className="text-gray-500 mt-2 text-base">Welcome — choose how you'd like to sign in</p>
      </motion.div>

      {/* Cards */}
      <div className="flex flex-col sm:flex-row gap-5 z-10 w-full max-w-lg">
        {/* Customer Portal */}
        <motion.div
          className="flex-1"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.15 }}
        >
          <Link href="/customer/login">
            <a className="group flex flex-col items-center justify-center gap-4 bg-white border-2 border-transparent hover:border-rose-300 rounded-2xl p-8 shadow-lg hover:shadow-rose-100 hover:shadow-xl transition-all duration-300 cursor-pointer text-center h-full">
              <div className="w-16 h-16 rounded-full bg-rose-50 group-hover:bg-rose-100 flex items-center justify-center transition-colors">
                <Users className="w-8 h-8 text-rose-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Customer Portal</h2>
                <p className="text-gray-500 text-sm mt-1">Browse the menu & place orders</p>
              </div>
              <div className="flex items-center text-rose-500 font-medium text-sm gap-1 group-hover:gap-2 transition-all">
                Enter <ArrowRight className="w-4 h-4" />
              </div>
            </a>
          </Link>
        </motion.div>

        {/* Staff Portal */}
        <motion.div
          className="flex-1"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, delay: 0.25 }}
        >
          <Link href="/staff/login">
            <a className="group flex flex-col items-center justify-center gap-4 bg-white border-2 border-transparent hover:border-orange-300 rounded-2xl p-8 shadow-lg hover:shadow-orange-100 hover:shadow-xl transition-all duration-300 cursor-pointer text-center h-full">
              <div className="w-16 h-16 rounded-full bg-orange-50 group-hover:bg-orange-100 flex items-center justify-center transition-colors">
                <ChefHat className="w-8 h-8 text-orange-500" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">Staff Portal</h2>
                <p className="text-gray-500 text-sm mt-1">Manage orders, kitchen & restaurant</p>
              </div>
              <div className="flex items-center text-orange-500 font-medium text-sm gap-1 group-hover:gap-2 transition-all">
                Enter <ArrowRight className="w-4 h-4" />
              </div>
            </a>
          </Link>
        </motion.div>
      </div>

      <motion.p
        className="mt-10 text-xs text-gray-400 z-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        © {new Date().getFullYear()} MyDine · Smart Menu Platform
      </motion.p>
    </div>
  );
}
