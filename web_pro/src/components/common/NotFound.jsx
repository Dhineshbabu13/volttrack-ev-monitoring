import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertOctagon, ArrowLeft, Zap } from 'lucide-react';
import { ChargeButton } from './ChargeButton';

export const NotFound = () => {
  return (
    <div className="relative min-h-[calc(100vh-80px)] flex flex-col items-center justify-center px-4 py-12 text-center">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md p-8 rounded-3xl glass-panel border border-rose-500/30 text-white shadow-2xl"
      >
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto mb-6 shadow-[0_0_25px_rgba(244,63,94,0.3)]">
          <AlertOctagon className="w-8 h-8" />
        </div>

        <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
          Error 404 • Signal Lost
        </span>

        <h2 className="text-3xl font-black text-white mt-2 mb-3">Waypoint Out of Range</h2>
        <p className="text-xs text-slate-300 mb-6 leading-relaxed">
          The requested CAN-bus telemetry node could not be located on the VoltTrack network grid.
        </p>

        <Link to="/">
          <ChargeButton variant="green" icon={ArrowLeft}>
            Return to Telemetry Portals
          </ChargeButton>
        </Link>
      </motion.div>
    </div>
  );
};
