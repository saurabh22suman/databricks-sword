"use client"

import { Cpu, Globe, Shield, Target, Zap } from 'lucide-react';
import React from 'react';

const projects = [
  {
    icon: Shield,
    title: 'FinTech Fraud Defense',
    subtitle: 'SECURITY LAYER',
    description: 'Intercept fraudulent transactions in real-time using Structured Streaming and MLflow countermeasures.',
    difficulty: 'S-RANK',
    color: 'text-anime-accent',
    border: 'hover:border-anime-accent/50',
    bg: 'hover:bg-anime-accent/5'
  },
  {
    icon: Cpu,
    title: 'IoT Sensor Grid',
    subtitle: 'HARDWARE LINK',
    description: 'Establish telemetry uplink with 10k+ sensor units using Auto Loader ingestion protocols.',
    difficulty: 'A-RANK',
    color: 'text-anime-cyan',
    border: 'hover:border-anime-cyan/50',
    bg: 'hover:bg-anime-cyan/5'
  },
  {
    icon: Zap,
    title: 'E-Comm Neural Net',
    subtitle: 'AI MATRIX',
    description: 'Deploy predictive algorithms for user behavior analysis using Spark MLlib collaborative filtering.',
    difficulty: 'B-RANK',
    color: 'text-anime-purple',
    border: 'hover:border-anime-purple/50',
    bg: 'hover:bg-anime-purple/5'
  },
  {
    icon: Globe,
    title: 'Genomics Sequence',
    subtitle: 'BIO-DATA',
    description: 'Process massive DNA sequences at scale using specialized Databricks runtime environments.',
    difficulty: 'S-RANK',
    color: 'text-anime-yellow',
    border: 'hover:border-anime-yellow/50',
    bg: 'hover:bg-anime-yellow/5'
  }
];

export const UseCases: React.FC = () => {
  return (
    <section id="projects" className="py-32 relative">
      <div className="container mx-auto px-4">
        
        <div className="flex flex-col md:flex-row justify-between items-end mb-16 gap-6 relative z-10">
          <div>
            <div className="text-anime-cyan font-mono text-xs uppercase tracking-[0.3em] mb-2 flex items-center gap-2">
              <span className="w-2 h-2 bg-anime-cyan"></span>
              Mission Select
            </div>
            <h2 className="text-4xl md:text-5xl font-black italic text-white tracking-tighter">
              ACTIVE <span className="text-gray-600">CAMPAIGNS</span>
            </h2>
            <p className="mt-4 text-gray-400 max-w-lg border-l-2 border-gray-700 pl-4 text-sm font-mono">
              Select a simulation to begin. Completion of S-Rank missions grants certification vouchers.
            </p>
          </div>
          <div className="flex items-center gap-2 text-anime-accent font-bold uppercase tracking-widest text-xs border border-anime-accent px-4 py-2 hover:bg-anime-accent hover:text-white transition-colors cursor-pointer clip-path-slant">
            View All Logs <Target className="w-4 h-4" />
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 relative z-10">
          {projects.map((item, idx) => (
            <div key={idx} className={`group relative bg-anime-900 border border-white/10 p-1 transition-all duration-300 ${item.border}`}>
              
              {/* Corner Accents */}
              <div className="absolute top-0 left-0 w-2 h-2 bg-white/20 group-hover:bg-white transition-colors"></div>
              <div className="absolute top-0 right-0 w-2 h-2 bg-white/20 group-hover:bg-white transition-colors"></div>
              <div className="absolute bottom-0 left-0 w-2 h-2 bg-white/20 group-hover:bg-white transition-colors"></div>
              <div className="absolute bottom-0 right-0 w-2 h-2 bg-white/20 group-hover:bg-white transition-colors"></div>

              <div className={`h-full bg-anime-950 p-8 relative overflow-hidden ${item.bg} transition-colors`}>
                
                {/* Background Tech Lines */}
                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity text-white">
                  <item.icon className="w-24 h-24 stroke-1" />
                </div>

                <div className="flex justify-between items-start mb-6">
                  <div className={`p-3 bg-white/5 border border-white/10 ${item.color}`}>
                    <item.icon className="w-6 h-6" />
                  </div>
                  <span className={`text-[10px] font-black italic uppercase tracking-widest px-2 py-1 border ${item.color} border-current`}>
                    {item.difficulty}
                  </span>
                </div>
                
                <div className="mb-4">
                   <div className={`text-[10px] font-mono uppercase tracking-widest mb-1 ${item.color} opacity-80`}>{item.subtitle}</div>
                   <h3 className="text-2xl font-bold italic text-white group-hover:translate-x-2 transition-transform duration-300">{item.title}</h3>
                </div>
                
                <p className="text-gray-400 text-sm leading-relaxed mb-6 font-mono border-t border-white/5 pt-4">
                  {item.description}
                </p>
                
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-white group-hover:text-anime-cyan transition-colors">
                  <div className="w-4 h-px bg-current"></div>
                  Initialize
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};