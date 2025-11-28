import React, { useState, useEffect } from 'react';
import { Power, Shield, Cpu, Wifi } from 'lucide-react';

const IntroSequence = ({ onComplete }) => {
  const [step, setStep] = useState('entry'); // 'entry' or 'booting'
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState([]);

  const bootLogs = [
    "LOADING_KERNEL... OK",
    "MOUNTING_FILESYSTEM... READ_ONLY",
    "INIT_GRAPHICS_DRIVER... V3.0_PRO",
    "CONNECTING_NEURAL_LINK... ESTABLISHED",
    "DECRYPTING_DATA_STREAMS... SUCCESS",
    "CALIBRATING_SENSORS... DONE",
    "SYSTEM_INTEGRITY_CHECK... PASS"
  ];

  const handleInitialize = () => {
    setStep('booting');
  };

  useEffect(() => {
    if (step === 'booting') {
      let currentLog = 0;
      
      // Log sequence
      const logInterval = setInterval(() => {
        if (currentLog < bootLogs.length) {
          setLogs(prev => [...prev, {
            text: bootLogs[currentLog],
            time: new Date().toLocaleTimeString('en-GB')
          }]);
          currentLog++;
        }
      }, 400);

      // Progress bar sequence
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            clearInterval(logInterval);
            setTimeout(onComplete, 500); // Small delay after 100%
            return 100;
          }
          // Random increment for realistic feel
          return prev + Math.random() * 5; 
        });
      }, 150);

      return () => {
        clearInterval(logInterval);
        clearInterval(progressInterval);
      };
    }
  }, [step, onComplete]);

  if (step === 'entry') {
    return (
      <div className="fixed inset-0 z-50 bg-void flex flex-col items-center justify-center text-primary font-mono selection:bg-primary selection:text-void">
        {/* Background Grid */}
        <div className="absolute inset-0 z-0 opacity-10 bg-[size:40px_40px] bg-grid-pattern pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col items-center gap-12 w-full max-w-lg px-4">
          {/* Logo Box */}
          <div className="border-4 border-primary p-8 w-full text-center relative group">
             <h1 className="font-display text-6xl font-bold tracking-tighter mb-2">
               TREND
             </h1>
             <div className="bg-primary text-void font-bold px-2 py-1 tracking-widest text-sm inline-block w-full">
               3_PRO_EDITION
             </div>
             
             {/* Corner Accents */}
             <div className="absolute -top-1 -left-1 w-4 h-4 border-t-4 border-l-4 border-primary"></div>
             <div className="absolute -bottom-1 -right-1 w-4 h-4 border-b-4 border-r-4 border-primary"></div>
          </div>

          <p className="text-dim text-xs tracking-[0.2em] uppercase animate-pulse">
            Secure Terminal Access Required
          </p>

          {/* Initialize Button */}
          <button 
            onClick={handleInitialize}
            className="group relative w-full max-w-md overflow-hidden"
          >
            <div className="absolute inset-0 bg-primary translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out"></div>
            <div className="relative border-2 border-primary bg-void/50 group-hover:bg-transparent p-6 flex items-center justify-center gap-4 transition-colors duration-300">
              <Power className="group-hover:text-void transition-colors duration-300" />
              <span className="font-bold tracking-widest group-hover:text-void transition-colors duration-300">
                [ INITIALIZE_SYSTEM ]
              </span>
              
              {/* Reticle Effect Removed */}
            </div>
          </button>

          {/* Footer Status Icons */}
          <div className="flex justify-center gap-12 text-dim text-[10px] uppercase tracking-wider">
            <div className="flex flex-col items-center gap-2">
              <Shield size={16} />
              <span>Encrypted</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Cpu size={16} />
              <span>Neural_Net</span>
            </div>
            <div className="flex flex-col items-center gap-2">
              <Wifi size={16} />
              <span>Online</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Boot Sequence View
  return (
    <div className="fixed inset-0 z-50 bg-void flex items-center justify-center font-mono p-4">
      <div className="absolute inset-0 z-0 opacity-5 bg-[size:40px_40px] bg-grid-pattern pointer-events-none"></div>
      
      <div className="w-full max-w-2xl relative z-10">
        <div className="border border-primary p-1 mb-2 flex justify-between text-xs text-primary uppercase">
          <span>&gt;_ BOOT_SEQUENCE.EXE</span>
          <span>PROCESSING...</span>
        </div>
        
        {/* Terminal Output */}
        <div className="h-64 border-l-2 border-primary/30 bg-surface/20 p-6 font-mono text-sm mb-8 overflow-hidden relative">
           {logs.map((log, i) => (
             <div key={i} className="mb-2 text-bone/80">
               <span className="text-dim">[{log.time}]</span> &gt; {log.text}
             </div>
           ))}
           <div className="animate-pulse text-primary">_</div>
        </div>

        {/* Progress Bar */}
        <div className="relative">
           <div className="flex justify-between text-xs text-primary mb-2 font-bold">
             <span>SYSTEM INTEGRITY</span>
             <span>{Math.min(100, Math.round(progress))}%</span>
           </div>
           <div className="h-2 bg-surface w-full overflow-hidden">
             <div 
               className="h-full bg-primary transition-all duration-100 ease-out"
               style={{ width: `${Math.min(100, progress)}%` }}
             ></div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default IntroSequence;
