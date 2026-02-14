"use client"

import { ArrowRight, ChevronDown, Database } from 'lucide-react';
import Link from 'next/link';
import React, { useRef, useState } from 'react';

const questions = [
  {
    id: '01',
    q: "Managed vs External Tables?",
    a: "Managed tables store data in the location managed by Databricks (usually DBFS or Unity Catalog managed storage). Dropping the table deletes the data. External tables reference data stored in your own cloud storage paths (S3/ADLS). Dropping the table only removes metadata."
  },
  {
    id: '02',
    q: "Delta Lake ACID Transactions?",
    a: "Delta Lake uses a transaction log (Delta Log) to record every change made to the table. This enables atomicity (all or nothing), consistency, isolation (via optimistic concurrency control), and durability."
  },
  {
    id: '03',
    q: "Z-Ordering Protocol?",
    a: "Z-Ordering is a data skipping technique that co-locates related information in the same set of files. It is most effective for columns that are frequently used in query predicates (WHERE clauses) and have high cardinality."
  },
  {
    id: '04',
    q: "Photon Engine Specs?",
    a: "Photon is a native vectorized query engine written in C++ to improve query performance. It is designed to accelerate SQL workloads and DataFrame API calls by taking advantage of modern hardware instruction sets."
  },
  {
    id: '05',
    q: "Unity Catalog Governance?",
    a: "Unity Catalog is the unified governance solution for Data & AI on the Lakehouse. It provides a central place to manage permissions, audit logs, and data lineage across multiple Databricks workspaces."
  }
];

export const FAQ: React.FC = () => {
  const [openIndex, setOpenIndex] = useState<number | null>(0);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const handleToggle = (idx: number) => {
    const isOpening = openIndex !== idx;
    setOpenIndex(isOpening ? idx : null);

    if (isOpening) {
      setTimeout(() => {
        const element = itemRefs.current[idx];
        if (element) {
          const headerOffset = 100; // Account for fixed navbar (~80px) + breathing room
          const elementPosition = element.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.scrollY - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
          });
        }
      }, 300); // Wait for animation to settle slightly before scrolling
    }
  };

  return (
    <section id="interview-prep" className="py-24 bg-anime-900/50 border-t border-white/5 relative">
      <div className="container mx-auto px-4 max-w-4xl relative z-10">
        
        <div className="flex justify-between items-end mb-12">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-anime-accent/10 border border-anime-accent flex items-center justify-center text-anime-accent">
                <Database className="w-6 h-6" />
             </div>
             <div>
                <h2 className="text-3xl font-black italic text-white uppercase tracking-tighter">
                   Intel
                </h2>
                <p className="text-gray-500 font-mono text-xs uppercase tracking-widest">
                   Decrypted Knowledge Base
                </p>
             </div>
           </div>

           <Link
              href="/intel"
              className="hidden sm:flex items-center gap-2 text-white font-bold uppercase text-xs tracking-widest hover:text-anime-accent transition-colors group"
           >
              Access All Intel{" "}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
           </Link>
        </div>

        <div className="space-y-4">
          {questions.map((item, idx) => (
            <div 
              key={idx} 
              ref={(el) => { itemRefs.current[idx] = el; }}
              className={`border transition-all duration-300 ${
                openIndex === idx ? 'border-anime-cyan bg-anime-950 shadow-neon-cyan' : 'border-white/10 bg-black/20 hover:border-white/30'
              }`}
            >
              <button 
                onClick={() => handleToggle(idx)}
                className="w-full text-left px-6 py-5 flex items-center justify-between gap-4 group"
              >
                <div className="flex items-center gap-4">
                   <span className={`font-mono text-xs ${openIndex === idx ? 'text-anime-cyan' : 'text-gray-600'}`}>
                     {item.id}
                   </span>
                   <span className={`font-bold uppercase tracking-wide text-sm ${openIndex === idx ? 'text-white' : 'text-gray-300 group-hover:text-white'}`}>
                     {item.q}
                   </span>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-300 ${openIndex === idx ? 'rotate-180 text-anime-cyan' : ''}`} />
              </button>
              
              <div 
                className={`transition-all duration-500 ease-[cubic-bezier(0.4,0,0.2,1)] overflow-hidden ${
                  openIndex === idx ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <div className={`px-6 pb-6 pt-2 pl-14 transform transition-all duration-500 delay-75 ease-out ${
                   openIndex === idx ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0'
                }`}>
                  <div className="text-gray-400 text-sm leading-relaxed border-l border-anime-cyan/30 pl-4 font-mono">
                    <span className="text-anime-cyan text-[10px] uppercase block mb-2">&gt; Reading Entry...</span>
                    {item.a}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};