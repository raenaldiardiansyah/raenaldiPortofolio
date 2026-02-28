import React from "react";
import { cn } from "../lib/utils";
import { Button } from "../components/ui/AGV-projek/button";

export default function Portfolio() {
  return (
    <div className="min-h-screen bg-[#0D0D0D] text-white font-sans selection:bg-white selection:text-black">
      <main className="flex flex-col">
        <div className="w-full aspect-video md:aspect-[21/9] overflow-hidden border-b border-white/10 bg-[#1A1A1A] relative group">
          <img 
            src= "/images/AGV Line.png" 
            alt = "AGV Line"
            className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity duration-700"
          />
          <div className="absolute inset-0 bottom-0 h-5/ bg-gradient-to-t from-[#0D0D0D] to transparans" />
          <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end">
             <div className="space-y-2">
                <span className="px-2 py-1 bg-white text-black text-[10px] font-bold uppercase tracking-tighter">Featured Project</span>
                <h2 className="text-4xl md:text-6xl font-bold tracking-tighter uppercase">IoT Line-Following AGV </h2>
             </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto w-full p-8 md:p-16 grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-4 space-y-8">
            <div>
              <h3 className="text-[10px] text-white/40 uppercase tracking-[0.3em] mb-4">Project Details</h3>
              <div className="space-y-4">
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-xs text-white/60">Role</span>
                  <span className="text-xs font-medium">Project Lead</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-xs text-white/60">Tools</span>
                </div>
                <div className="text-right border-b border-white/5 pb-2">
                  <span className="text-xs font-medium">KiCad, Autodesk CAD Tools, Arduino IDE, Custom IoT Web Platform</span>
                </div>
                <div className="flex justify-between border-b border-white/5 pb-2">
                  <span className="text-xs text-white/60">Timeline</span>
                  <span className="text-xs font-medium">2025 — 2026</span>
                </div>
              </div>
            </div>

            <div className="pt-8">
              <Button 
                asChild
                variant="outline" 
                className="w-full rounded-none border-white/20 hover:bg-white hover:text-black transition-all group"
              >
                <a 
                  href="https://agv-iot-dashboard.vercel.app/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <span className="uppercase text-[10px] tracking-widest">
                    Visit Website
                  </span>
                </a>
              </Button>
            </div>
          </div>

          <div className="md:col-span-8 space-y-12">
            <div className="space-y-6">
              <h3 className="text-[10px] text-white/40 uppercase tracking-[0.3em]">Overview</h3>
              <p className="text-xl md:text-2xl font-light leading-relaxed text-white/80">
                This project involves the development of a compact Automated Guided Vehicle (AGV) designed to transport payloads of up to 5 kg, with an emphasis on mechanical stability, space efficiency, and reliable operation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-8 border-t border-white/10">
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-white">Visual Systems</h4>
                <p className="text-sm text-white/60 leading-relaxed">
                  The IoT monitoring dashboard presents real-time operational and sensor data—such as battery level, system status, and load conditions—using clear visual grouping to support quick interpretation during operation.
                </p>
              </div>
              <div className="space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-widest text-white">Interaction Logic</h4>
                <p className="text-sm text-white/60 leading-relaxed">
                  System operation is largely automated, with user interaction focused on monitoring system health and operational status. Manual input is intentionally minimized to reduce unnecessary complexity.
                </p>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="p-8 border-t border-white/10 flex justify-between items-center text-[10px] text-white/20 uppercase tracking-[0.4em]">
        <span>AGV Line Follower</span>
      </footer>
    </div>
  );
}
